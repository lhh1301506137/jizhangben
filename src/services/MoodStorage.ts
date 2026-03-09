import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { authService } from './AuthService';

export interface MoodRecord {
  id: string;
  date: string;
  mood: 'happy' | 'sad' | 'neutral' | 'excited' | 'angry';
  emoji: string;
  note?: string;
  intensity?: number;
  timestamp: number;
  userId?: string;
}

type PendingMoodOperation =
  | {
      id: string;
      type: 'upsert';
      createdAt: number;
      payload: {
        date: string;
        mood: MoodRecord['mood'];
        emoji: string;
        note?: string;
        intensity?: number;
      };
    }
  | {
      id: string;
      type: 'delete';
      createdAt: number;
      payload: {
        id?: string;
        date?: string;
      };
    };

type MoodRow = {
  id: string;
  user_id: string;
  entry_date: string;
  mood: MoodRecord['mood'];
  intensity: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const STORAGE_KEYS = {
  MOOD_CACHE: '@mood_records',
  MOOD_PENDING: '@mood_records_pending',
};

const getUserStorageKey = (baseKey: string, userId?: string): string => {
  if (!userId) {
    return baseKey;
  }
  return `${baseKey}_${userId}`;
};

const toEmoji = (mood: MoodRecord['mood']): string => {
  switch (mood) {
    case 'happy':
      return '😊';
    case 'excited':
      return '🥳';
    case 'neutral':
      return '😐';
    case 'sad':
      return '😢';
    case 'angry':
      return '😠';
    default:
      return '😐';
  }
};

export class MoodStorage {
  static async saveMoodRecord(record: Omit<MoodRecord, 'id' | 'timestamp'>): Promise<MoodRecord> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const localRecords = await this.getLocalMoodCache(currentUser.id);
    const existingIndex = localRecords.findIndex(r => r.date === record.date);
    const nextRecord: MoodRecord = {
      id: existingIndex >= 0 ? localRecords[existingIndex].id : this.generateLocalId(),
      date: record.date,
      mood: record.mood,
      emoji: record.emoji || toEmoji(record.mood),
      note: record.note,
      intensity: record.intensity || 3,
      timestamp: Date.now(),
      userId: currentUser.id,
    };

    if (existingIndex >= 0) {
      localRecords[existingIndex] = nextRecord;
    } else {
      localRecords.push(nextRecord);
    }

    localRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await this.setLocalMoodCache(currentUser.id, localRecords);

    await this.enqueueOperation(currentUser.id, {
      id: this.generateOpId(),
      type: 'upsert',
      createdAt: Date.now(),
      payload: {
        date: record.date,
        mood: record.mood,
        emoji: record.emoji || toEmoji(record.mood),
        note: record.note,
        intensity: record.intensity || 3,
      },
    });

    await this.syncPendingOperations();
    return nextRecord;
  }

  static async getAllMoodRecords(): Promise<MoodRecord[]> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    await this.syncPendingOperations();

    if (!isSupabaseConfigured) {
      return this.getLocalMoodCache(currentUser.id);
    }

    try {
      const remote = await this.fetchRemoteMoodRecords(currentUser.id);
      await this.setLocalMoodCache(currentUser.id, remote);
      return remote;
    } catch (error) {
      console.error('读取远程心情记录失败，回退本地缓存:', error);
      return this.getLocalMoodCache(currentUser.id);
    }
  }

  static async getMoodRecordByDate(date: string): Promise<MoodRecord | null> {
    const records = await this.getAllMoodRecords();
    return records.find(record => record.date === date) || null;
  }

  static async getMoodRecordsByMonth(year: number, month: number): Promise<MoodRecord[]> {
    const records = await this.getAllMoodRecords();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return records.filter(record => record.date.startsWith(monthStr));
  }

  static async deleteMoodRecord(recordId: string): Promise<boolean> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const records = await this.getLocalMoodCache(currentUser.id);
    const deletingRecord = records.find(record => record.id === recordId);
    const filteredRecords = records.filter(record => record.id !== recordId);

    await this.setLocalMoodCache(currentUser.id, filteredRecords);
    await this.enqueueOperation(currentUser.id, {
      id: this.generateOpId(),
      type: 'delete',
      createdAt: Date.now(),
      payload: {
        id: deletingRecord?.id || recordId,
        date: deletingRecord?.date,
      },
    });

    await this.syncPendingOperations();
    return true;
  }

  static async clearAllMoodRecords(): Promise<boolean> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      await this.setLocalMoodCache(currentUser.id, []);
      await this.setPendingOperations(currentUser.id, []);

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('mood_entries').delete().eq('user_id', currentUser.id);
        if (error) {
          console.error('清空远程心情记录失败:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('清空心情记录失败:', error);
      return false;
    }
  }

  static async getMoodStatistics(
    year?: number,
    month?: number
  ): Promise<{
    total: number;
    byMood: Record<string, number>;
    byMonth: Record<string, number>;
    averageIntensity: number;
  }> {
    try {
      let records = await this.getAllMoodRecords();

      if (year && month) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        records = records.filter(record => record.date.startsWith(monthStr));
      } else if (year) {
        records = records.filter(record => record.date.startsWith(`${year}-`));
      }

      const total = records.length;
      const byMood: Record<string, number> = {};
      const byMonth: Record<string, number> = {};
      let totalIntensity = 0;

      records.forEach(record => {
        byMood[record.mood] = (byMood[record.mood] || 0) + 1;

        const monthKey = record.date.substring(0, 7);
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

        totalIntensity += record.intensity || 3;
      });

      return {
        total,
        byMood,
        byMonth,
        averageIntensity: total > 0 ? totalIntensity / total : 0,
      };
    } catch (error) {
      console.error('获取心情统计失败:', error);
      return {
        total: 0,
        byMood: {},
        byMonth: {},
        averageIntensity: 0,
      };
    }
  }

  static async exportData(): Promise<string> {
    const records = await this.getAllMoodRecords();
    return JSON.stringify(
      {
        version: '2.0',
        exportDate: new Date().toISOString(),
        records,
      },
      null,
      2
    );
  }

  static async importData(jsonData: string): Promise<boolean> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const data = JSON.parse(jsonData);
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('无效的数据格式');
      }

      const imported: MoodRecord[] = data.records.map((item: any) => ({
        id: item.id || this.generateLocalId(),
        date: item.date,
        mood: item.mood,
        emoji: item.emoji || toEmoji(item.mood),
        note: item.note,
        intensity: item.intensity || 3,
        timestamp: item.timestamp || Date.now(),
        userId: currentUser.id,
      }));

      await this.setLocalMoodCache(currentUser.id, imported);

      const operations: PendingMoodOperation[] = imported.map(record => ({
        id: this.generateOpId(),
        type: 'upsert',
        createdAt: Date.now(),
        payload: {
          date: record.date,
          mood: record.mood,
          emoji: record.emoji,
          note: record.note,
          intensity: record.intensity || 3,
        },
      }));
      await this.setPendingOperations(currentUser.id, operations);
      await this.syncPendingOperations();
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  static async createTestMoodData(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    const testMoods: Omit<MoodRecord, 'id' | 'timestamp'>[] = [];

    testMoods.push(
      { date: '2025-07-01', mood: 'happy', emoji: '😊', intensity: 4, note: '工作顺利', userId: currentUser.id },
      { date: '2025-07-05', mood: 'neutral', emoji: '😐', intensity: 3, note: '普通的一天', userId: currentUser.id },
      { date: '2025-07-10', mood: 'happy', emoji: '😄', intensity: 5, note: '买到喜欢的书', userId: currentUser.id },
      { date: '2025-07-15', mood: 'sad', emoji: '😢', intensity: 2, note: '有点累', userId: currentUser.id },
      { date: '2025-07-20', mood: 'excited', emoji: '🤩', intensity: 4, note: '周末计划', userId: currentUser.id }
    );

    for (const moodData of testMoods) {
      await this.saveMoodRecord(moodData);
    }
  }

  static async syncPendingOperations(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) {
      return;
    }

    const pending = await this.getPendingOperations(currentUser.id);
    if (pending.length === 0) {
      return;
    }

    const remaining: PendingMoodOperation[] = [];

    for (const op of pending) {
      try {
        if (op.type === 'upsert') {
          const { error } = await supabase.from('mood_entries').upsert(
            {
              user_id: currentUser.id,
              entry_date: op.payload.date,
              mood: op.payload.mood,
              intensity: op.payload.intensity || 3,
              note: op.payload.note || null,
            },
            { onConflict: 'user_id,entry_date' }
          );

          if (error) {
            throw error;
          }
        } else {
          if (op.payload.id && !op.payload.id.startsWith('local_')) {
            const { error } = await supabase
              .from('mood_entries')
              .delete()
              .eq('id', op.payload.id)
              .eq('user_id', currentUser.id);
            if (error) {
              throw error;
            }
          } else if (op.payload.date) {
            const { error } = await supabase
              .from('mood_entries')
              .delete()
              .eq('entry_date', op.payload.date)
              .eq('user_id', currentUser.id);
            if (error) {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('同步单条心情操作失败，保留重试:', op, error);
        remaining.push(op);
      }
    }

    await this.setPendingOperations(currentUser.id, remaining);

    if (remaining.length === 0) {
      try {
        const remote = await this.fetchRemoteMoodRecords(currentUser.id);
        await this.setLocalMoodCache(currentUser.id, remote);
      } catch (error) {
        console.error('同步后刷新远程心情失败:', error);
      }
    }
  }

  private static async fetchRemoteMoodRecords(userId: string): Promise<MoodRecord[]> {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('id,user_id,entry_date,mood,intensity,note,created_at,updated_at')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(row => this.mapRowToMoodRecord(row as MoodRow));
  }

  private static mapRowToMoodRecord(row: MoodRow): MoodRecord {
    return {
      id: row.id,
      date: row.entry_date,
      mood: row.mood,
      emoji: toEmoji(row.mood),
      note: row.note || undefined,
      intensity: row.intensity,
      timestamp: new Date(row.updated_at || row.created_at).getTime(),
      userId: row.user_id,
    };
  }

  private static async getLocalMoodCache(userId: string): Promise<MoodRecord[]> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.MOOD_CACHE, userId);
    const records = await AsyncStorage.getItem(storageKey);
    return records ? JSON.parse(records) : [];
  }

  private static async setLocalMoodCache(userId: string, records: MoodRecord[]): Promise<void> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.MOOD_CACHE, userId);
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await AsyncStorage.setItem(storageKey, JSON.stringify(sorted));
  }

  private static async enqueueOperation(userId: string, op: PendingMoodOperation): Promise<void> {
    const pending = await this.getPendingOperations(userId);

    if (op.type === 'upsert') {
      const filtered = pending.filter(
        item => !(item.type === 'upsert' && item.payload.date === op.payload.date)
      );
      filtered.push(op);
      await this.setPendingOperations(userId, filtered);
      return;
    }

    pending.push(op);
    await this.setPendingOperations(userId, pending);
  }

  private static async getPendingOperations(userId: string): Promise<PendingMoodOperation[]> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.MOOD_PENDING, userId);
    const pending = await AsyncStorage.getItem(storageKey);
    return pending ? JSON.parse(pending) : [];
  }

  private static async setPendingOperations(userId: string, operations: PendingMoodOperation[]): Promise<void> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.MOOD_PENDING, userId);
    const sorted = [...operations].sort((a, b) => a.createdAt - b.createdAt);
    await AsyncStorage.setItem(storageKey, JSON.stringify(sorted));
  }

  private static generateLocalId(): string {
    return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private static generateOpId(): string {
    return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
