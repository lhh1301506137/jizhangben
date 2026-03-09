import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { authService } from './AuthService';
import { MoodRecord } from './MoodStorage';

const STORAGE_KEYS = {
  COUPLE_INFO: '@couple_info',
  PARTNER_MOODS: '@partner_moods',
  SYNC_SETTINGS: '@sync_settings',
};

export interface PartnerInfo {
  id: string;
  name: string;
  email: string;
}

export interface CoupleInfo {
  id: string;
  myName: string;
  partnerName: string;
  partnerInfo?: PartnerInfo;
  anniversary?: string;
  inviteCode: string;
  isConnected: boolean;
  connectedAt?: string;
  acceptPairing?: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  shareLocation: boolean;
  sharePhotos: boolean;
  notifications: boolean;
}

export interface PartnerMoodRecord extends MoodRecord {
  partnerName: string;
  syncedAt: string;
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSync: true,
  shareLocation: false,
  sharePhotos: true,
  notifications: true,
};

type InviteRow = {
  id: string;
  inviter_id: string;
  inviter_name: string;
  invite_code: string;
  accept_pairing: boolean;
  is_active: boolean;
  created_at: string;
};

type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'active' | 'inactive';
  anniversary: string | null;
  created_at: string;
  updated_at: string;
};

export class CoupleService {
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async getPartnerNameByInviteCode(inviteCode: string): Promise<string | null> {
    if (!isSupabaseConfigured) {
      const local = await this.getLocalCoupleInfo();
      if (local?.inviteCode === inviteCode) {
        return local.myName;
      }
      return null;
    }

    const { data, error } = await supabase
      .from('couple_invites')
      .select('inviter_name')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data.inviter_name;
  }

  static async checkPartnerAcceptsPairing(inviteCode: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const local = await this.getLocalCoupleInfo();
      return local?.inviteCode === inviteCode ? local.acceptPairing !== false : false;
    }

    const { data, error } = await supabase
      .from('couple_invites')
      .select('accept_pairing')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }
    return data.accept_pairing;
  }

  static async createCouple(myName: string, acceptPairing: boolean = true): Promise<CoupleInfo> {
    if (!acceptPairing) {
      throw new Error('请先开启接受配对功能');
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    const inviteCode = this.generateInviteCode();
    const normalizedMyName = myName.trim() || currentUser.username;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('couple_invites').insert({
        inviter_id: currentUser.id,
        inviter_name: normalizedMyName,
        invite_code: inviteCode,
        accept_pairing: acceptPairing,
        is_active: true,
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    const coupleInfo: CoupleInfo = {
      id: '',
      myName: normalizedMyName,
      partnerName: '',
      inviteCode,
      isConnected: false,
      anniversary: undefined,
      acceptPairing,
    };

    await this.setLocalCoupleInfo(coupleInfo);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(DEFAULT_SYNC_SETTINGS));
    return coupleInfo;
  }

  static async joinCouple(myName: string, partnerName: string, inviteCode: string): Promise<CoupleInfo> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    if (inviteCode.length !== 6) {
      throw new Error('邀请码格式不正确');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase 未配置，无法加入云端配对');
    }

    const { data: inviteData, error: inviteError } = await supabase
      .from('couple_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .maybeSingle();

    if (inviteError || !inviteData) {
      throw new Error('邀请码无效');
    }

    const invite = inviteData as InviteRow;
    if (invite.inviter_id === currentUser.id) {
      throw new Error('不能使用自己的邀请码');
    }
    if (!invite.accept_pairing) {
      throw new Error('对方未开启接受配对功能');
    }
    if (invite.inviter_name !== partnerName) {
      throw new Error('配对名称与邀请码不匹配');
    }

    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .insert({
        user1_id: invite.inviter_id,
        user2_id: currentUser.id,
        status: 'active',
      })
      .select('*')
      .single();

    if (coupleError || !coupleData) {
      throw new Error(coupleError?.message || '创建配对关系失败');
    }

    await supabase.from('couple_invites').update({ is_active: false }).eq('id', invite.id);

    const couple = coupleData as CoupleRow;
    const coupleInfo: CoupleInfo = {
      id: couple.id,
      myName: myName.trim() || currentUser.username,
      partnerName: invite.inviter_name,
      partnerInfo: {
        id: invite.inviter_id,
        name: invite.inviter_name,
        email: '',
      },
      inviteCode,
      isConnected: true,
      connectedAt: couple.created_at,
      acceptPairing: true,
    };

    await this.setLocalCoupleInfo(coupleInfo);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(DEFAULT_SYNC_SETTINGS));
    return coupleInfo;
  }

  static async createTestCouple(): Promise<CoupleInfo> {
    if (isSupabaseConfigured) {
      throw new Error('云端模式已启用，请使用“创建配对/加入配对”完成双账号测试');
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    const coupleInfo: CoupleInfo = {
      id: 'local-test-couple',
      myName: currentUser.username,
      partnerName: '测试伙伴',
      partnerInfo: {
        id: 'local-partner',
        name: '测试伙伴',
        email: 'local@test',
      },
      inviteCode: this.generateInviteCode(),
      isConnected: true,
      connectedAt: new Date().toISOString(),
    };

    await this.setLocalCoupleInfo(coupleInfo);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(DEFAULT_SYNC_SETTINGS));
    return coupleInfo;
  }

  static async getCoupleInfo(): Promise<CoupleInfo | null> {
    const local = await this.getLocalCoupleInfo();

    if (!isSupabaseConfigured) {
      return local;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return local;
    }

    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // 云端模式下，旧本地测试配对（如 couple_1_2）会导致后续 UUID 字段写入失败，自动降级为未配对状态
      if (local?.isConnected && !this.isUuid(local.id)) {
        const normalized: CoupleInfo = {
          ...local,
          id: '',
          isConnected: false,
          partnerName: '',
          partnerInfo: undefined,
        };
        await this.setLocalCoupleInfo(normalized);
        return normalized;
      }
      return local;
    }

    const row = data as CoupleRow;
    const partnerId = row.user1_id === currentUser.id ? row.user2_id : row.user1_id;
    const partnerName = local?.partnerInfo?.id === partnerId ? local.partnerInfo.name : local?.partnerName || '伙伴';

    const merged: CoupleInfo = {
      id: row.id,
      myName: local?.myName || currentUser.username,
      partnerName,
      partnerInfo: {
        id: partnerId,
        name: partnerName,
        email: local?.partnerInfo?.email || '',
      },
      anniversary: row.anniversary || undefined,
      inviteCode: local?.inviteCode || '',
      isConnected: true,
      connectedAt: row.created_at,
      acceptPairing: local?.acceptPairing ?? true,
    };

    await this.setLocalCoupleInfo(merged);
    return merged;
  }

  static async updateCoupleInfo(updates: Partial<CoupleInfo>): Promise<boolean> {
    try {
      const current = await this.getLocalCoupleInfo();
      if (!current) return false;
      await this.setLocalCoupleInfo({ ...current, ...updates });
      return true;
    } catch (error) {
      console.error('更新情侣信息失败:', error);
      return false;
    }
  }

  static async disconnect(dataOption: 'keep_all' | 'keep_mine_only' | 'delete_all' = 'keep_mine_only'): Promise<boolean> {
    try {
      const coupleInfo = await this.getCoupleInfo();
      if (!coupleInfo) return true;

      if (isSupabaseConfigured && this.isUuid(coupleInfo.id)) {
        await supabase.from('couples').update({ status: 'inactive' }).eq('id', coupleInfo.id);
      }

      switch (dataOption) {
        case 'keep_all':
          await this.updateCoupleInfo({
            isConnected: false,
            partnerName: `前任-${coupleInfo.partnerName}`,
          });
          break;
        case 'keep_mine_only':
          await AsyncStorage.removeItem(STORAGE_KEYS.PARTNER_MOODS);
          await this.updateCoupleInfo({
            isConnected: false,
            partnerName: '',
            partnerInfo: undefined,
          });
          break;
        case 'delete_all':
          await AsyncStorage.removeItem(STORAGE_KEYS.COUPLE_INFO);
          await AsyncStorage.removeItem(STORAGE_KEYS.PARTNER_MOODS);
          await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_SETTINGS);
          break;
      }

      return true;
    } catch (error) {
      console.error('断开连接失败:', error);
      return false;
    }
  }

  static async exportCoupleData(): Promise<string> {
    const coupleInfo = await this.getCoupleInfo();
    const partnerMoods = await this.getPartnerMoods();

    const { MessageService } = await import('./MessageService');
    const myMessages = await MessageService.getMyMessages();
    const partnerMessages = await MessageService.getPartnerMessages();

    const { PlanService } = await import('./PlanService');
    const plans = await PlanService.getAllPlans();

    return JSON.stringify(
      {
        version: '2.0',
        exportDate: new Date().toISOString(),
        coupleInfo,
        partnerMoods,
        messages: { myMessages, partnerMessages },
        plans,
      },
      null,
      2
    );
  }

  static async getSyncSettings(): Promise<SyncSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
      return settings ? JSON.parse(settings) : DEFAULT_SYNC_SETTINGS;
    } catch {
      return DEFAULT_SYNC_SETTINGS;
    }
  }

  static async updateSyncSettings(settings: SyncSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  static async syncMoodToPartner(_moodRecord: MoodRecord): Promise<boolean> {
    const coupleInfo = await this.getCoupleInfo();
    const settings = await this.getSyncSettings();
    return !!coupleInfo?.isConnected && settings.autoSync;
  }

  static async getPartnerMoods(): Promise<PartnerMoodRecord[]> {
    try {
      const moods = await AsyncStorage.getItem(STORAGE_KEYS.PARTNER_MOODS);
      return moods ? JSON.parse(moods) : [];
    } catch {
      return [];
    }
  }

  static async addPartnerMood(moodRecord: Omit<MoodRecord, 'id' | 'timestamp'>, partnerName: string): Promise<boolean> {
    try {
      const existing = await this.getPartnerMoods();
      const partnerMood: PartnerMoodRecord = {
        ...moodRecord,
        id: `partner_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        partnerName,
        syncedAt: new Date().toISOString(),
      };
      const filtered = existing.filter(mood => mood.date !== moodRecord.date);
      await AsyncStorage.setItem(STORAGE_KEYS.PARTNER_MOODS, JSON.stringify([...filtered, partnerMood]));
      return true;
    } catch {
      return false;
    }
  }

  static async getPartnerMoodByDate(date: string): Promise<PartnerMoodRecord | null> {
    const moods = await this.getPartnerMoods();
    return moods.find(mood => mood.date === date) || null;
  }

  static async getMoodCompatibility(date: string, myMood: string): Promise<{ compatibility: number; message: string }> {
    const partnerMood = await this.getPartnerMoodByDate(date);
    if (!partnerMood) {
      return { compatibility: 0, message: '伙伴还没有记录这天的心情' };
    }

    const moodScores: Record<string, number> = { happy: 5, excited: 4, neutral: 3, sad: 2, angry: 1 };
    const myScore = moodScores[myMood] || 3;
    const partnerScore = moodScores[partnerMood.mood] || 3;
    const diff = Math.abs(myScore - partnerScore);
    const compatibility = Math.max(0, 100 - diff * 20);

    if (compatibility >= 80) return { compatibility, message: '你们的心情很同步！💕' };
    if (compatibility >= 60) return { compatibility, message: '心情还算匹配～😊' };
    if (compatibility >= 40) return { compatibility, message: '心情有些不同，多关心对方吧💝' };
    return { compatibility, message: '需要更多的沟通和理解❤️' };
  }

  static async getCombinedMoodByDate(date: string): Promise<{
    myMood: MoodRecord | null;
    partnerMood: PartnerMoodRecord | null;
    compatibility: number;
    message: string;
  }> {
    const { MoodStorage } = await import('./MoodStorage');
    const myMood = await MoodStorage.getMoodRecordByDate(date);
    const partnerMood = await this.getPartnerMoodByDate(date);

    if (myMood && partnerMood) {
      const c = await this.getMoodCompatibility(date, myMood.mood);
      return { myMood, partnerMood, compatibility: c.compatibility, message: c.message };
    }
    if (myMood && !partnerMood) return { myMood, partnerMood: null, compatibility: 0, message: '等待伙伴记录心情' };
    if (!myMood && partnerMood) return { myMood: null, partnerMood, compatibility: 0, message: '快来记录你的心情吧' };
    return { myMood: null, partnerMood: null, compatibility: 0, message: '你们都还没有记录心情' };
  }

  static async getCombinedMoodsByMonth(year: number, month: number): Promise<{
    [date: string]: { myMood: MoodRecord | null; partnerMood: PartnerMoodRecord | null; compatibility: number };
  }> {
    const { MoodStorage } = await import('./MoodStorage');
    const myMoods = await MoodStorage.getMoodRecordsByMonth(year, month);
    const partnerMoods = await this.getPartnerMoods();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const filteredPartner = partnerMoods.filter(m => m.date.startsWith(monthStr));

    const combined: { [date: string]: { myMood: MoodRecord | null; partnerMood: PartnerMoodRecord | null; compatibility: number } } = {};
    myMoods.forEach(mood => {
      combined[mood.date] = { myMood: mood, partnerMood: null, compatibility: 0 };
    });
    filteredPartner.forEach(mood => {
      if (!combined[mood.date]) combined[mood.date] = { myMood: null, partnerMood: mood, compatibility: 0 };
      else combined[mood.date].partnerMood = mood;
    });

    for (const date of Object.keys(combined)) {
      const { myMood, partnerMood } = combined[date];
      if (myMood && partnerMood) {
        const c = await this.getMoodCompatibility(date, myMood.mood);
        combined[date].compatibility = c.compatibility;
      }
    }

    return combined;
  }

  static async simulatePartnerData(): Promise<void> {
    const coupleInfo = await this.getCoupleInfo();
    if (!coupleInfo?.isConnected) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const mockPartnerMoods: Omit<MoodRecord, 'id' | 'timestamp'>[] = [
      { date: today, mood: 'happy', emoji: '😊', note: '今天工作很顺利！', intensity: 4 },
      { date: yesterdayStr, mood: 'excited', emoji: '🥳', note: '期待明天和你见面～', intensity: 5 },
    ];

    for (const mood of mockPartnerMoods) {
      await this.addPartnerMood(mood, coupleInfo.partnerName || '亲爱的');
    }
  }

  static async isConnected(): Promise<boolean> {
    const info = await this.getCoupleInfo();
    return info?.isConnected || false;
  }

  static async getConnectionSummary(): Promise<{
    isConnected: boolean;
    myName: string;
    partnerName: string;
    inviteCode: string;
    connectedDays: number;
  }> {
    const info = await this.getCoupleInfo();
    if (!info) {
      return { isConnected: false, myName: '', partnerName: '', inviteCode: '', connectedDays: 0 };
    }

    let connectedDays = 0;
    if (info.connectedAt) {
      const connectedDate = new Date(info.connectedAt);
      connectedDays = Math.floor((Date.now() - connectedDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      isConnected: info.isConnected,
      myName: info.myName,
      partnerName: info.partnerName,
      inviteCode: info.inviteCode,
      connectedDays,
    };
  }

  private static async getLocalCoupleInfo(): Promise<CoupleInfo | null> {
    try {
      const info = await AsyncStorage.getItem(STORAGE_KEYS.COUPLE_INFO);
      return info ? JSON.parse(info) : null;
    } catch {
      return null;
    }
  }

  private static async setLocalCoupleInfo(coupleInfo: CoupleInfo): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.COUPLE_INFO, JSON.stringify(coupleInfo));
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
