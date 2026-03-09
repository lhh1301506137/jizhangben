import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { authService } from './AuthService';

const STORAGE_KEYS = {
  PLAN_SETTINGS: '@plan_settings',
  PLAN_LAST_READ_TS: '@plan_last_read_ts',
  PLAN_CACHE: '@plan_cache',
};

export type PlanType = 'anniversary' | 'travel' | 'date' | 'weekend' | 'special' | 'other';
export type PlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Plan {
  id: string;
  title: string;
  description?: string;
  type: PlanType;
  date: string;
  time?: string;
  location?: string;
  status: PlanStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  reminders: number[];
  isShared: boolean;
  participants: string[];
  notes?: string;
  budget?: number;
  emoji?: string;
}

export interface PlanSettings {
  enableReminders: boolean;
  defaultReminders: number[];
  autoShare: boolean;
  showInCalendar: boolean;
}

const DEFAULT_SETTINGS: PlanSettings = {
  enableReminders: true,
  defaultReminders: [1440, 60, 15],
  autoShare: true,
  showInCalendar: true,
};

export const PLAN_TYPES = {
  anniversary: { label: '纪念日', emoji: '💕', color: '#FF69B4' },
  travel: { label: '旅行', emoji: '✈️', color: '#4CAF50' },
  date: { label: '约会', emoji: '💑', color: '#FF9800' },
  weekend: { label: '周末', emoji: '🎈', color: '#9C27B0' },
  special: { label: '特别', emoji: '🎁', color: '#FFD700' },
  other: { label: '其他', emoji: '📝', color: '#607D8B' },
} as const;

type PlanRow = {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: PlanType;
  plan_date: string;
  plan_time: string | null;
  location: string | null;
  status: PlanStatus;
  reminders: number[] | null;
  is_shared: boolean | null;
  participants: string[] | null;
  notes: string | null;
  budget: number | null;
  emoji: string | null;
  created_at: string;
  updated_at: string;
};

export class PlanService {
  static async markPlansAsRead(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;
    await AsyncStorage.setItem(`${STORAGE_KEYS.PLAN_LAST_READ_TS}_${currentUser.id}`, Date.now().toString());
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return 0;

      const plans = await this.getAllPlans();
      const key = `${STORAGE_KEYS.PLAN_LAST_READ_TS}_${currentUser.id}`;
      const lastReadTsStr = await AsyncStorage.getItem(key);
      const lastReadTs = lastReadTsStr ? Number(lastReadTsStr) : 0;

      const partnerPlans = plans.filter(plan => plan.createdBy !== currentUser.id);
      if (!lastReadTsStr) {
        return partnerPlans.length;
      }
      return partnerPlans.filter(plan => (plan.updatedAt || plan.createdAt) > lastReadTs).length;
    } catch (error) {
      console.error('获取计划未读数量失败:', error);
      return 0;
    }
  }

  static async createPlan(planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    const { coupleId, currentUserId } = await this.requireContext();

    if (!isSupabaseConfigured || !this.isUuid(coupleId)) {
      throw new Error('当前离线，仅可查看历史计划，创建需联网');
    }

    try {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          couple_id: coupleId,
          created_by: currentUserId,
          title: planData.title,
          description: planData.description || null,
          type: planData.type,
          plan_date: planData.date,
          plan_time: planData.time || null,
          location: planData.location || null,
          status: planData.status,
          reminders: planData.reminders || [],
          is_shared: planData.isShared ?? true,
          participants: planData.participants || [],
          notes: planData.notes || null,
          budget: planData.budget ?? null,
          emoji: planData.emoji || null,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw error || new Error('创建计划失败');
      }

      const created = this.mapRowToPlan(data as PlanRow);
      const local = await this.getLocalPlans(currentUserId, coupleId);
      local.push(created);
      await this.setLocalPlans(currentUserId, coupleId, local);
      return created;
    } catch {
      throw new Error('当前网络不可用，创建需联网');
    }
  }

  static async getAllPlans(): Promise<Plan[]> {
    const context = await this.tryGetContext();
    if (!context) return [];

    const local = await this.getLocalPlans(context.currentUserId, context.coupleId);

    if (!isSupabaseConfigured || !this.isUuid(context.coupleId)) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('couple_id', context.coupleId)
        .order('plan_date', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as PlanRow[];
      const remote = rows.map(row => this.mapRowToPlan(row));
      await this.setLocalPlans(context.currentUserId, context.coupleId, remote);
      return remote;
    } catch {
      return local;
    }
  }

  static async getPlansByDate(date: string): Promise<Plan[]> {
    const plans = await this.getAllPlans();
    return plans.filter(plan => plan.date === date);
  }

  static async getPlansByMonth(year: number, month: number): Promise<Plan[]> {
    const plans = await this.getAllPlans();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return plans.filter(plan => plan.date.startsWith(monthStr));
  }

  static async getUpcomingPlans(limit: number = 10): Promise<Plan[]> {
    const plans = await this.getAllPlans();
    const today = new Date().toISOString().split('T')[0];
    return plans
      .filter(plan => plan.date >= today && plan.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  static async updatePlan(planId: string, updates: Partial<Plan>): Promise<boolean> {
    try {
      const context = await this.tryGetContext();
      if (!context || !isSupabaseConfigured || !this.isUuid(context.coupleId)) {
        return false;
      }

      const updatePayload: Record<string, any> = {};
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.description !== undefined) updatePayload.description = updates.description || null;
      if (updates.type !== undefined) updatePayload.type = updates.type;
      if (updates.date !== undefined) updatePayload.plan_date = updates.date;
      if (updates.time !== undefined) updatePayload.plan_time = updates.time || null;
      if (updates.location !== undefined) updatePayload.location = updates.location || null;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.reminders !== undefined) updatePayload.reminders = updates.reminders;
      if (updates.isShared !== undefined) updatePayload.is_shared = updates.isShared;
      if (updates.participants !== undefined) updatePayload.participants = updates.participants;
      if (updates.notes !== undefined) updatePayload.notes = updates.notes || null;
      if (updates.budget !== undefined) updatePayload.budget = updates.budget ?? null;
      if (updates.emoji !== undefined) updatePayload.emoji = updates.emoji || null;

      const { error } = await supabase.from('plans').update(updatePayload).eq('id', planId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('更新计划失败:', error);
      return false;
    }
  }

  static async deletePlan(planId: string): Promise<boolean> {
    try {
      const context = await this.tryGetContext();
      if (!context || !isSupabaseConfigured || !this.isUuid(context.coupleId)) {
        return false;
      }
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('删除计划失败:', error);
      return false;
    }
  }

  static async completePlan(planId: string): Promise<boolean> {
    return this.updatePlan(planId, { status: 'completed' });
  }

  static async cancelPlan(planId: string): Promise<boolean> {
    return this.updatePlan(planId, { status: 'cancelled' });
  }

  static async getPlanStats(): Promise<{
    total: number;
    byType: Record<PlanType, number>;
    byStatus: Record<PlanStatus, number>;
    upcoming: number;
    thisMonth: number;
  }> {
    const plans = await this.getAllPlans();
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const stats = {
      total: plans.length,
      byType: {} as Record<PlanType, number>,
      byStatus: {} as Record<PlanStatus, number>,
      upcoming: 0,
      thisMonth: 0,
    };

    plans.forEach(plan => {
      stats.byType[plan.type] = (stats.byType[plan.type] || 0) + 1;
      stats.byStatus[plan.status] = (stats.byStatus[plan.status] || 0) + 1;
      if (plan.date >= today && plan.status !== 'cancelled') stats.upcoming++;
      if (plan.date.startsWith(thisMonth)) stats.thisMonth++;
    });

    return stats;
  }

  static async searchPlans(keyword: string): Promise<Plan[]> {
    const plans = await this.getAllPlans();
    const lowerKeyword = keyword.toLowerCase();

    return plans.filter(
      plan =>
        plan.title.toLowerCase().includes(lowerKeyword) ||
        plan.description?.toLowerCase().includes(lowerKeyword) ||
        plan.location?.toLowerCase().includes(lowerKeyword) ||
        plan.notes?.toLowerCase().includes(lowerKeyword)
    );
  }

  static async getSettings(): Promise<PlanSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.PLAN_SETTINGS);
      return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('获取计划设置失败:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async updateSettings(settings: PlanSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAN_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('更新计划设置失败:', error);
      return false;
    }
  }

  static async clearAllPlans(): Promise<boolean> {
    try {
      const context = await this.tryGetContext();
      if (!context) return true;

      await this.setLocalPlans(context.currentUserId, context.coupleId, []);

      if (!isSupabaseConfigured || !this.isUuid(context.coupleId)) {
        return true;
      }

      const { error } = await supabase.from('plans').delete().eq('couple_id', context.coupleId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('清空计划失败:', error);
      return false;
    }
  }

  static async exportPlans(): Promise<string> {
    const plans = await this.getAllPlans();
    return JSON.stringify(
      {
        version: '2.0',
        exportDate: new Date().toISOString(),
        plans,
      },
      null,
      2
    );
  }

  static async importPlans(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      if (!data.plans || !Array.isArray(data.plans)) {
        throw new Error('无效的数据格式');
      }

      for (const plan of data.plans as Plan[]) {
        await this.createPlan({
          title: plan.title,
          description: plan.description,
          type: plan.type,
          date: plan.date,
          time: plan.time,
          location: plan.location,
          status: plan.status,
          createdBy: plan.createdBy,
          reminders: plan.reminders || [],
          isShared: plan.isShared ?? true,
          participants: plan.participants || [],
          notes: plan.notes,
          budget: plan.budget,
          emoji: plan.emoji,
        });
      }
      return true;
    } catch (error) {
      console.error('导入计划失败:', error);
      return false;
    }
  }

  static async createSamplePlans(): Promise<void> {
    try {
      const { CoupleService } = await import('./CoupleService');
      const coupleInfo = await CoupleService.getCoupleInfo();
      if (!coupleInfo?.isConnected) return;

      const existing = await this.getAllPlans();
      if (existing.length > 0) return;

      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      const samplePlans: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          title: '周末约会',
          description: '去看电影，然后吃晚餐',
          type: 'date',
          date: nextWeek.toISOString().split('T')[0],
          time: '18:00',
          location: '市中心影院',
          status: 'planned',
          createdBy: coupleInfo.myName,
          reminders: [1440, 60],
          isShared: true,
          participants: [coupleInfo.myName, coupleInfo.partnerName],
          emoji: '💑',
        },
        {
          title: '恋爱纪念日',
          description: '我们在一起的第一个纪念日',
          type: 'anniversary',
          date: nextMonth.toISOString().split('T')[0],
          time: '19:00',
          location: '第一次约会的餐厅',
          status: 'planned',
          createdBy: coupleInfo.myName,
          reminders: [10080, 1440, 60],
          isShared: true,
          participants: [coupleInfo.myName, coupleInfo.partnerName],
          emoji: '💕',
        },
      ];

      for (const planData of samplePlans) {
        await this.createPlan(planData);
      }
    } catch (error) {
      console.error('创建示例计划失败:', error);
    }
  }

  private static mapRowToPlan(row: PlanRow): Plan {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      type: row.type,
      date: row.plan_date,
      time: row.plan_time || undefined,
      location: row.location || undefined,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      reminders: row.reminders || [],
      isShared: row.is_shared ?? true,
      participants: row.participants || [],
      notes: row.notes || undefined,
      budget: row.budget ?? undefined,
      emoji: row.emoji || undefined,
    };
  }

  private static async requireContext(): Promise<{ coupleId: string; currentUserId: string }> {
    const context = await this.tryGetContext();
    if (!context) {
      throw new Error('未连接到伙伴');
    }
    return context;
  }

  private static async tryGetContext(): Promise<{ coupleId: string; currentUserId: string } | null> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    let coupleInfo: any = null;
    try {
      const { CoupleService } = await import('./CoupleService');
      coupleInfo = await this.withTimeout(CoupleService.getCoupleInfo(), 1200);
    } catch {
      try {
        const raw = await AsyncStorage.getItem('@couple_info');
        coupleInfo = raw ? JSON.parse(raw) : null;
      } catch {
        coupleInfo = null;
      }
    }

    if (!coupleInfo?.isConnected) {
      return null;
    }

    return {
      coupleId: coupleInfo.id,
      currentUserId: currentUser.id,
    };
  }

  private static getLocalCacheKey(baseKey: string, userId: string, coupleId: string): string {
    return `${baseKey}_${userId}_${coupleId}`;
  }

  private static async getLocalPlans(userId: string, coupleId: string): Promise<Plan[]> {
    const key = this.getLocalCacheKey(STORAGE_KEYS.PLAN_CACHE, userId, coupleId);
    const value = await AsyncStorage.getItem(key);
    if (!value) return [];
    const plans = JSON.parse(value) as Plan[];
    return [...plans].sort((a, b) => a.date.localeCompare(b.date));
  }

  private static async setLocalPlans(userId: string, coupleId: string, plans: Plan[]): Promise<void> {
    const key = this.getLocalCacheKey(STORAGE_KEYS.PLAN_CACHE, userId, coupleId);
    const sorted = [...plans].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(key, JSON.stringify(sorted));
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
