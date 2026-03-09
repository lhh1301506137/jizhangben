import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { authService } from './AuthService';

// 存储键名
const STORAGE_KEYS = {
  ACCOUNT_RECORDS: '@account_records',
  ACCOUNT_PENDING: '@account_records_pending',
  ACCOUNT_CATEGORIES: '@account_categories',
  ACCOUNT_SETTINGS: '@account_settings',
};

// 获取用户特定的存储键
const getUserStorageKey = (baseKey: string, userId?: string): string => {
  if (!userId) {
    return baseKey;
  }
  return `${baseKey}_${userId}`;
};

// 记账记录类型
export type AccountType = 'income' | 'expense';

// 记账记录接口
export interface AccountRecord {
  id: string;
  type: AccountType;
  amount: number;
  category: string;
  description: string;
  date: string;
  userId?: string;
  timestamp: number;
  isShared?: boolean; // 是否为共同记账（后续功能）
}

// 分类接口
export interface AccountCategory {
  id: string;
  name: string;
  type: AccountType;
  emoji: string;
  color: string;
}

// 统计数据接口
export interface AccountStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recordCount: number;
  categoryStats: Record<string, number>;
  monthlyStats: Record<string, { income: number; expense: number }>;
}

// 月度统计数据接口
export interface MonthlyStats {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  recordCount: number;
  dailyStats: DailyStats[];
}

// 日度统计数据接口
export interface DailyStats {
  date: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  recordCount: number;
  records: AccountRecord[];
}

// 年度统计数据接口
export interface YearlyStats {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  recordCount: number;
  monthlyStats: MonthlyStats[];
}

// 图表数据接口
export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface ChartData {
  points: ChartDataPoint[];
  maxValue: number;
  minValue: number;
}

type PendingAccountingOperation =
  | {
      id: string;
      type: 'upsert';
      createdAt: number;
      retryCount?: number;
      nextRetryAt?: number;
      lastError?: string;
      payload: Omit<AccountRecord, 'timestamp'>;
    }
  | {
      id: string;
      type: 'delete';
      createdAt: number;
      retryCount?: number;
      nextRetryAt?: number;
      lastError?: string;
      payload: {
        id: string;
        date?: string;
      };
    };

type PersonalTransactionRow = {
  id: string;
  user_id: string;
  type: AccountType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

// 默认分类配置
export const DEFAULT_CATEGORIES: AccountCategory[] = [
  // 收入分类
  { id: 'salary', name: '工资', type: 'income', emoji: '💰', color: '#4CAF50' },
  { id: 'part_time', name: '兼职', type: 'income', emoji: '💼', color: '#8BC34A' },
  { id: 'bonus', name: '奖金', type: 'income', emoji: '🎁', color: '#CDDC39' },
  { id: 'red_packet', name: '红包', type: 'income', emoji: '🧧', color: '#FF5722' },
  { id: 'other_income', name: '其他收入', type: 'income', emoji: '💵', color: '#607D8B' },
  
  // 支出分类
  { id: 'food', name: '餐饮', type: 'expense', emoji: '🍽️', color: '#FF9800' },
  { id: 'transport', name: '交通', type: 'expense', emoji: '🚗', color: '#2196F3' },
  { id: 'entertainment', name: '娱乐', type: 'expense', emoji: '🎮', color: '#9C27B0' },
  { id: 'shopping', name: '购物', type: 'expense', emoji: '🛍️', color: '#E91E63' },
  { id: 'study', name: '学习', type: 'expense', emoji: '📚', color: '#3F51B5' },
  { id: 'medical', name: '医疗', type: 'expense', emoji: '🏥', color: '#009688' },
  { id: 'other_expense', name: '其他支出', type: 'expense', emoji: '💸', color: '#795548' },
];

export class AccountingService {
  // 初始化默认分类
  static async initializeCategories(): Promise<void> {
    try {
      const existingCategories = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_CATEGORIES);
      if (!existingCategories) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ACCOUNT_CATEGORIES,
          JSON.stringify(DEFAULT_CATEGORIES)
        );
        console.log('默认分类已初始化');
      }
    } catch (error) {
      console.error('初始化分类失败:', error);
    }
  }

  // 创建记账记录
  static async createRecord(recordData: Omit<AccountRecord, 'id' | 'timestamp'>): Promise<AccountRecord> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const record: AccountRecord = {
        ...recordData,
        id: this.generateLocalId(),
        timestamp: Date.now(),
        userId: currentUser.id,
      };

      const records = await this.getLocalRecords(currentUser.id);
      const updatedRecords = [...records, record];
      await this.setLocalRecords(currentUser.id, updatedRecords);

      await this.enqueueOperation(currentUser.id, {
        id: this.generateOperationId(),
        type: 'upsert',
        createdAt: Date.now(),
        payload: {
          id: record.id,
          type: record.type,
          amount: record.amount,
          category: record.category,
          description: record.description,
          date: record.date,
          userId: currentUser.id,
          isShared: record.isShared,
        },
      });

      await this.syncPendingOperations();

      console.log('记账记录已创建:', record);
      return record;
    } catch (error) {
      console.error('创建记账记录失败:', error);
      throw error;
    }
  }

  // 获取所有记账记录
  static async getAllRecords(): Promise<AccountRecord[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return [];
      }

      await this.syncPendingOperations();

      if (!isSupabaseConfigured) {
        return this.getLocalRecords(currentUser.id);
      }

      try {
        const remoteRecords = await this.fetchRemoteRecords(currentUser.id);
        await this.setLocalRecords(currentUser.id, remoteRecords);
        return remoteRecords;
      } catch (remoteError) {
        console.error('获取远程记账记录失败，回退本地缓存:', remoteError);
        return this.getLocalRecords(currentUser.id);
      }
    } catch (error) {
      console.error('获取记账记录失败:', error);
      return [];
    }
  }

  // 按日期获取记录
  static async getRecordsByDate(date: string): Promise<AccountRecord[]> {
    try {
      const records = await this.getAllRecords();
      return records.filter(record => record.date === date);
    } catch (error) {
      console.error('获取指定日期记录失败:', error);
      return [];
    }
  }

  // 按月份获取记录
  static async getRecordsByMonth(year: number, month: number): Promise<AccountRecord[]> {
    try {
      const records = await this.getAllRecords();
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      return records.filter(record => record.date.startsWith(monthStr));
    } catch (error) {
      console.error('获取月份记录失败:', error);
      return [];
    }
  }

  // 按类型获取记录
  static async getRecordsByType(type: AccountType): Promise<AccountRecord[]> {
    try {
      const records = await this.getAllRecords();
      return records.filter(record => record.type === type);
    } catch (error) {
      console.error('获取类型记录失败:', error);
      return [];
    }
  }

  // 更新记账记录
  static async updateRecord(recordId: string, updates: Partial<AccountRecord>): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const records = await this.getLocalRecords(currentUser.id);
      const recordIndex = records.findIndex(record => record.id === recordId);

      if (recordIndex === -1) {
        throw new Error('记录不存在');
      }

      records[recordIndex] = {
        ...records[recordIndex],
        ...updates,
        timestamp: Date.now(),
      };

      await this.setLocalRecords(currentUser.id, records);
      await this.enqueueOperation(currentUser.id, {
        id: this.generateOperationId(),
        type: 'upsert',
        createdAt: Date.now(),
        payload: {
          id: records[recordIndex].id,
          type: records[recordIndex].type,
          amount: records[recordIndex].amount,
          category: records[recordIndex].category,
          description: records[recordIndex].description,
          date: records[recordIndex].date,
          userId: currentUser.id,
          isShared: records[recordIndex].isShared,
        },
      });
      await this.syncPendingOperations();
      console.log('记账记录已更新:', recordId);
      return true;
    } catch (error) {
      console.error('更新记账记录失败:', error);
      return false;
    }
  }

  // 删除记账记录
  static async deleteRecord(recordId: string): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const records = await this.getLocalRecords(currentUser.id);
      const deletingRecord = records.find(record => record.id === recordId);
      const filteredRecords = records.filter(record => record.id !== recordId);

      await this.setLocalRecords(currentUser.id, filteredRecords);
      await this.enqueueOperation(currentUser.id, {
        id: this.generateOperationId(),
        type: 'delete',
        createdAt: Date.now(),
        payload: {
          id: deletingRecord?.id || recordId,
          date: deletingRecord?.date,
        },
      });
      await this.syncPendingOperations();
      console.log('记账记录已删除:', recordId);
      return true;
    } catch (error) {
      console.error('删除记账记录失败:', error);
      return false;
    }
  }

  // 获取分类列表
  static async getCategories(type?: AccountType): Promise<AccountCategory[]> {
    try {
      const categories = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_CATEGORIES);
      const allCategories = categories ? JSON.parse(categories) : DEFAULT_CATEGORIES;
      
      if (type) {
        return allCategories.filter((category: AccountCategory) => category.type === type);
      }
      
      return allCategories;
    } catch (error) {
      console.error('获取分类失败:', error);
      return type ? DEFAULT_CATEGORIES.filter(cat => cat.type === type) : DEFAULT_CATEGORIES;
    }
  }

  // 获取统计数据
  static async getStatistics(year?: number, month?: number): Promise<AccountStats> {
    try {
      let records = await this.getAllRecords();
      
      // 如果指定了年月，则筛选记录
      if (year && month) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        records = records.filter(record => record.date.startsWith(monthStr));
      }

      const stats: AccountStats = {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        recordCount: records.length,
        categoryStats: {},
        monthlyStats: {},
      };

      // 计算总收入和支出
      records.forEach(record => {
        if (record.type === 'income') {
          stats.totalIncome += record.amount;
        } else {
          stats.totalExpense += record.amount;
        }

        // 分类统计
        stats.categoryStats[record.category] = (stats.categoryStats[record.category] || 0) + record.amount;
      });

      stats.balance = stats.totalIncome - stats.totalExpense;

      // 月度统计
      const monthlyData: Record<string, { income: number; expense: number }> = {};
      records.forEach(record => {
        const monthKey = record.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        
        if (record.type === 'income') {
          monthlyData[monthKey].income += record.amount;
        } else {
          monthlyData[monthKey].expense += record.amount;
        }
      });
      
      stats.monthlyStats = monthlyData;

      return stats;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        recordCount: 0,
        categoryStats: {},
        monthlyStats: {},
      };
    }
  }

  // 搜索记录
  static async searchRecords(keyword: string): Promise<AccountRecord[]> {
    try {
      const records = await this.getAllRecords();
      const lowerKeyword = keyword.toLowerCase();
      
      return records.filter(record =>
        record.description.toLowerCase().includes(lowerKeyword) ||
        record.category.toLowerCase().includes(lowerKeyword)
      );
    } catch (error) {
      console.error('搜索记录失败:', error);
      return [];
    }
  }

  // 获取最近记录
  static async getRecentRecords(limit: number = 10): Promise<AccountRecord[]> {
    try {
      const records = await this.getAllRecords();
      return records
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('获取最近记录失败:', error);
      return [];
    }
  }

  // 清空所有记录
  static async clearAllRecords(): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return false;
      }

      await this.setLocalRecords(currentUser.id, []);
      await this.setPendingOperations(currentUser.id, []);
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('personal_transactions').delete().eq('user_id', currentUser.id);
        if (error) {
          console.error('清空远程记账记录失败:', error);
        }
      }
      console.log('所有记账记录已清空');
      return true;
    } catch (error) {
      console.error('清空记录失败:', error);
      return false;
    }
  }

  // 导出记账数据
  static async exportData(): Promise<string> {
    try {
      const records = await this.getAllRecords();
      const categories = await this.getCategories();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        records,
        categories,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('导出记账数据失败:', error);
      throw error;
    }
  }

  // 导入记账数据
  static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      if (data.records && Array.isArray(data.records)) {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          throw new Error('用户未登录');
        }

        const imported: AccountRecord[] = data.records.map((item: any) => ({
          id: item.id || this.generateLocalId(),
          type: item.type,
          amount: Number(item.amount),
          category: item.category,
          description: item.description || '',
          date: item.date,
          userId: currentUser.id,
          isShared: item.isShared,
          timestamp: item.timestamp || Date.now(),
        }));

        await this.setLocalRecords(currentUser.id, imported);
        const pending: PendingAccountingOperation[] = imported.map(record => ({
          id: this.generateOperationId(),
          type: 'upsert',
          createdAt: Date.now(),
          payload: {
            id: record.id,
            type: record.type,
            amount: record.amount,
            category: record.category,
            description: record.description,
            date: record.date,
            userId: currentUser.id,
            isShared: record.isShared,
          },
        }));
        await this.setPendingOperations(currentUser.id, pending);
        await this.syncPendingOperations();
        console.log('记账数据导入成功');
        return true;
      }
      throw new Error('无效的数据格式');
    } catch (error) {
      console.error('导入记账数据失败:', error);
      return false;
    }
  }

  // 创建示例数据
  static async createSampleData(): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        return;
      }

      const today = new Date();
      const sampleRecords: Omit<AccountRecord, 'id' | 'timestamp'>[] = [
        {
          type: 'income',
          amount: 3000,
          category: 'salary',
          description: '月工资',
          date: today.toISOString().split('T')[0],
          userId: currentUser.id,
        },
        {
          type: 'expense',
          amount: 25,
          category: 'food',
          description: '午餐',
          date: today.toISOString().split('T')[0],
          userId: currentUser.id,
        },
        {
          type: 'expense',
          amount: 15,
          category: 'transport',
          description: '地铁费',
          date: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
          userId: currentUser.id,
        },
      ];

      for (const recordData of sampleRecords) {
        await this.createRecord(recordData);
      }

      console.log('示例记账数据已创建');
    } catch (error) {
      console.error('创建示例数据失败:', error);
    }
  }

  // 创建扩展的测试数据（2025年6-8月）
  static async createExtendedTestData(): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        return;
      }

      const testRecords: Omit<AccountRecord, 'id' | 'timestamp'>[] = [];

      // 根据用户ID创建不同的数据
      if (currentUser.id === '1') {
        // 测试用户的数据
        const records: Omit<AccountRecord, 'id' | 'timestamp'>[] = [
          { type: 'income', amount: 5000, category: 'salary', description: '月工资', date: '2025-06-01', userId: currentUser.id },
          { type: 'expense', amount: 30, category: 'food', description: '早餐', date: '2025-06-01', userId: currentUser.id },
          { type: 'expense', amount: 200, category: 'shopping', description: '买衣服', date: '2025-06-15', userId: currentUser.id },
          { type: 'income', amount: 3000, category: 'salary', description: '月工资', date: '2025-07-01', userId: currentUser.id },
          { type: 'expense', amount: 100, category: 'study', description: '买书', date: '2025-07-05', userId: currentUser.id },
          { type: 'income', amount: 5200, category: 'salary', description: '月工资', date: '2025-08-01', userId: currentUser.id },
        ];
        testRecords.push(...records);

      } else if (currentUser.id === '2') {
        // 测试用户1的数据 - 完全不同的数据
        const records: Omit<AccountRecord, 'id' | 'timestamp'>[] = [
          { type: 'income', amount: 8000, category: 'salary', description: '设计师月薪', date: '2025-06-01', userId: currentUser.id },
          { type: 'expense', amount: 1200, category: 'shopping', description: '买名牌包', date: '2025-06-10', userId: currentUser.id },
          { type: 'expense', amount: 800, category: 'food', description: '米其林餐厅', date: '2025-07-01', userId: currentUser.id },
          { type: 'income', amount: 8500, category: 'salary', description: '设计师月薪', date: '2025-07-01', userId: currentUser.id },
          { type: 'expense', amount: 2000, category: 'entertainment', description: '旅游度假', date: '2025-07-15', userId: currentUser.id },
          { type: 'income', amount: 9000, category: 'salary', description: '设计师月薪', date: '2025-08-01', userId: currentUser.id },
        ];
        testRecords.push(...records);

      } else {
        // 其他用户使用默认数据
        const records: Omit<AccountRecord, 'id' | 'timestamp'>[] = [
          { type: 'income', amount: 5000, category: 'salary', description: '月工资', date: '2025-07-01', userId: currentUser.id },
          { type: 'expense', amount: 100, category: 'food', description: '餐饮', date: '2025-07-01', userId: currentUser.id },
        ];
        testRecords.push(...records);
      }

      // 创建记录
      for (const recordData of testRecords) {
        await this.createRecord(recordData as Omit<AccountRecord, 'id' | 'timestamp'>);
      }

      console.log(`扩展测试数据已创建，共 ${testRecords.length} 条记录`);
    } catch (error) {
      console.error('创建扩展测试数据失败:', error);
    }
  }

  // 获取指定日期的统计数据
  static async getDayStats(date: string): Promise<DailyStats> {
    try {
      const records = await this.getAllRecords();
      const dayRecords = records.filter(record => record.date === date);

      const dayStats: DailyStats = {
        date,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        recordCount: dayRecords.length,
        records: dayRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };

      dayRecords.forEach(record => {
        if (record.type === 'income') {
          dayStats.totalIncome += record.amount;
        } else {
          dayStats.totalExpense += record.amount;
        }
      });

      dayStats.netIncome = dayStats.totalIncome - dayStats.totalExpense;

      return dayStats;
    } catch (error) {
      console.error('获取日统计数据失败:', error);
      return {
        date,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        recordCount: 0,
        records: []
      };
    }
  }

  // 获取当月每日统计数据（用于图表）
  static async getMonthlyDailyStats(year: number, month: number): Promise<Array<{
    label: string;
    income: number;
    expense: number;
    net: number;
  }>> {
    try {
      const records = await this.getAllRecords();
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const monthRecords = records.filter(record => record.date.startsWith(monthStr));

      // 获取该月的天数
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyStats = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthStr}-${day.toString().padStart(2, '0')}`;
        const dayRecords = monthRecords.filter(record => record.date === dateStr);

        let income = 0;
        let expense = 0;

        dayRecords.forEach(record => {
          if (record.type === 'income') {
            income += record.amount;
          } else {
            expense += record.amount;
          }
        });

        dailyStats.push({
          label: `${day}日`,
          income,
          expense,
          net: income - expense,
        });
      }

      return dailyStats;
    } catch (error) {
      console.error('获取月度每日统计失败:', error);
      return [];
    }
  }

  // 获取年度各月统计数据（用于图表）
  static async getYearlyMonthlyStats(year: number): Promise<Array<{
    label: string;
    income: number;
    expense: number;
    net: number;
  }>> {
    try {
      const records = await this.getAllRecords();
      const yearStr = year.toString();
      const yearRecords = records.filter(record => record.date.startsWith(yearStr));

      const monthlyStats = [];

      for (let month = 1; month <= 12; month++) {
        const monthStr = `${yearStr}-${month.toString().padStart(2, '0')}`;
        const monthRecords = yearRecords.filter(record => record.date.startsWith(monthStr));

        let income = 0;
        let expense = 0;

        monthRecords.forEach(record => {
          if (record.type === 'income') {
            income += record.amount;
          } else {
            expense += record.amount;
          }
        });

        monthlyStats.push({
          label: `${month}月`,
          income,
          expense,
          net: income - expense,
        });
      }

      return monthlyStats;
    } catch (error) {
      console.error('获取年度月度统计失败:', error);
      return [];
    }
  }

  // 获取近5年统计数据（用于图表）
  static async getMultiYearStats(): Promise<Array<{
    label: string;
    income: number;
    expense: number;
    net: number;
  }>> {
    try {
      const records = await this.getAllRecords();
      const currentYear = new Date().getFullYear();
      const yearlyStats = [];

      // 获取近5年数据
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        const yearStr = year.toString();
        const yearRecords = records.filter(record => record.date.startsWith(yearStr));

        let income = 0;
        let expense = 0;

        yearRecords.forEach(record => {
          if (record.type === 'income') {
            income += record.amount;
          } else {
            expense += record.amount;
          }
        });

        yearlyStats.push({
          label: `${year}年`,
          income,
          expense,
          net: income - expense,
        });
      }

      return yearlyStats;
    } catch (error) {
      console.error('获取多年统计失败:', error);
      return [];
    }
  }

  // 清除所有记账数据（仅用于测试）
  static async clearAllData(): Promise<void> {
    try {
      await this.clearAllRecords();
      console.log('所有记账数据已清除');
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  }

  // 获取指定月份的统计数据
  static async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    try {
      const records = await this.getAllRecords();
      const monthRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month;
      });

      // 按日期分组
      const dailyStatsMap = new Map<string, DailyStats>();

      monthRecords.forEach(record => {
        const date = record.date;
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, {
            date,
            totalIncome: 0,
            totalExpense: 0,
            netIncome: 0,
            recordCount: 0,
            records: []
          });
        }

        const dayStats = dailyStatsMap.get(date)!;
        dayStats.records.push(record);
        dayStats.recordCount++;

        if (record.type === 'income') {
          dayStats.totalIncome += record.amount;
        } else {
          dayStats.totalExpense += record.amount;
        }
        dayStats.netIncome = dayStats.totalIncome - dayStats.totalExpense;
      });

      const dailyStats = Array.from(dailyStatsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const totalIncome = dailyStats.reduce((sum, day) => sum + day.totalIncome, 0);
      const totalExpense = dailyStats.reduce((sum, day) => sum + day.totalExpense, 0);

      return {
        year,
        month,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        recordCount: monthRecords.length,
        dailyStats
      };
    } catch (error) {
      console.error('获取月度统计失败:', error);
      throw error;
    }
  }

  // 获取指定年份的统计数据
  static async getYearlyStats(year: number): Promise<YearlyStats> {
    try {
      const monthlyStatsPromises = [];
      for (let month = 1; month <= 12; month++) {
        monthlyStatsPromises.push(this.getMonthlyStats(year, month));
      }

      const monthlyStats = await Promise.all(monthlyStatsPromises);

      const totalIncome = monthlyStats.reduce((sum, month) => sum + month.totalIncome, 0);
      const totalExpense = monthlyStats.reduce((sum, month) => sum + month.totalExpense, 0);
      const recordCount = monthlyStats.reduce((sum, month) => sum + month.recordCount, 0);

      return {
        year,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        recordCount,
        monthlyStats
      };
    } catch (error) {
      console.error('获取年度统计失败:', error);
      throw error;
    }
  }

  // 获取可用的年份列表（有记录的年份）
  static async getAvailableYears(): Promise<number[]> {
    try {
      const records = await this.getAllRecords();
      const years = new Set<number>();

      records.forEach(record => {
        const year = new Date(record.date).getFullYear();
        years.add(year);
      });

      return Array.from(years).sort((a, b) => b - a); // 降序排列
    } catch (error) {
      console.error('获取可用年份失败:', error);
      return [];
    }
  }

  // 获取指定年份的可用月份列表
  static async getAvailableMonths(year: number): Promise<number[]> {
    try {
      const records = await this.getAllRecords();
      const months = new Set<number>();

      records.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate.getFullYear() === year) {
          months.add(recordDate.getMonth() + 1);
        }
      });

      return Array.from(months).sort((a, b) => b - a); // 降序排列
    } catch (error) {
      console.error('获取可用月份失败:', error);
      return [];
    }
  }

  // 生成月度图表数据（按日）
  static async getMonthlyChartData(year: number, month: number): Promise<ChartData> {
    try {
      const monthlyStats = await this.getMonthlyStats(year, month);
      const points: ChartDataPoint[] = [];

      monthlyStats.dailyStats.forEach(dayStats => {
        const day = new Date(dayStats.date).getDate();
        points.push({
          label: `${day}日`,
          income: dayStats.totalIncome,
          expense: dayStats.totalExpense,
          net: dayStats.netIncome
        });
      });

      const allValues = points.flatMap(p => [p.income, p.expense, Math.abs(p.net)]);
      const maxValue = Math.max(...allValues, 0);
      const minValue = Math.min(...points.map(p => p.net), 0);

      return { points, maxValue, minValue };
    } catch (error) {
      console.error('生成月度图表数据失败:', error);
      throw error;
    }
  }

  // 生成年度图表数据（按月）
  static async getYearlyChartData(year: number): Promise<ChartData> {
    try {
      const yearlyStats = await this.getYearlyStats(year);
      const points: ChartDataPoint[] = [];

      yearlyStats.monthlyStats.forEach(monthStats => {
        points.push({
          label: `${monthStats.month}月`,
          income: monthStats.totalIncome,
          expense: monthStats.totalExpense,
          net: monthStats.netIncome
        });
      });

      const allValues = points.flatMap(p => [p.income, p.expense, Math.abs(p.net)]);
      const maxValue = Math.max(...allValues, 0);
      const minValue = Math.min(...points.map(p => p.net), 0);

      return { points, maxValue, minValue };
    } catch (error) {
      console.error('生成年度图表数据失败:', error);
      throw error;
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

    const remaining: PendingAccountingOperation[] = [];

    for (const op of pending) {
      try {
        if (op.type === 'upsert') {
          if (op.payload.id.startsWith('local_')) {
            const { error } = await supabase.from('personal_transactions').insert({
              user_id: currentUser.id,
              date: op.payload.date,
              type: op.payload.type,
              amount: op.payload.amount,
              category: op.payload.category,
              description: op.payload.description || null,
            });
            if (error) {
              throw error;
            }
          } else {
            const { error } = await supabase
              .from('personal_transactions')
              .update({
                date: op.payload.date,
                type: op.payload.type,
                amount: op.payload.amount,
                category: op.payload.category,
                description: op.payload.description || null,
              })
              .eq('id', op.payload.id)
              .eq('user_id', currentUser.id);
            if (error) {
              throw error;
            }
          }
        } else {
          if (op.payload.id && !op.payload.id.startsWith('local_')) {
            const { error } = await supabase
              .from('personal_transactions')
              .delete()
              .eq('id', op.payload.id)
              .eq('user_id', currentUser.id);
            if (error) {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('同步记账操作失败，保留重试:', op, error);
        remaining.push(op);
      }
    }

    await this.setPendingOperations(currentUser.id, remaining);

    if (remaining.length === 0) {
      try {
        const remoteRecords = await this.fetchRemoteRecords(currentUser.id);
        await this.setLocalRecords(currentUser.id, remoteRecords);
      } catch (error) {
        console.error('同步后刷新远程记账失败:', error);
      }
    }
  }

  private static async fetchRemoteRecords(userId: string): Promise<AccountRecord[]> {
    const { data, error } = await supabase
      .from('personal_transactions')
      .select('id,user_id,type,amount,category,description,date,created_at,updated_at')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(row => this.mapRowToAccountRecord(row as PersonalTransactionRow));
  }

  private static mapRowToAccountRecord(row: PersonalTransactionRow): AccountRecord {
    return {
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      category: row.category,
      description: row.description || '',
      date: row.date,
      userId: row.user_id,
      timestamp: new Date(row.updated_at || row.created_at).getTime(),
    };
  }

  private static async getLocalRecords(userId: string): Promise<AccountRecord[]> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.ACCOUNT_RECORDS, userId);
    const records = await AsyncStorage.getItem(storageKey);
    return records ? JSON.parse(records) : [];
  }

  private static async setLocalRecords(userId: string, records: AccountRecord[]): Promise<void> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.ACCOUNT_RECORDS, userId);
    const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
    await AsyncStorage.setItem(storageKey, JSON.stringify(sorted));
  }

  private static async enqueueOperation(userId: string, op: PendingAccountingOperation): Promise<void> {
    const pending = await this.getPendingOperations(userId);

    if (op.type === 'upsert') {
      const filtered = pending.filter(
        item => !(item.type === 'upsert' && item.payload.id === op.payload.id)
      );
      filtered.push(op);
      await this.setPendingOperations(userId, filtered);
      return;
    }

    pending.push(op);
    await this.setPendingOperations(userId, pending);
  }

  private static async getPendingOperations(userId: string): Promise<PendingAccountingOperation[]> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.ACCOUNT_PENDING, userId);
    const ops = await AsyncStorage.getItem(storageKey);
    return ops ? JSON.parse(ops) : [];
  }

  private static async setPendingOperations(userId: string, operations: PendingAccountingOperation[]): Promise<void> {
    const storageKey = getUserStorageKey(STORAGE_KEYS.ACCOUNT_PENDING, userId);
    const sorted = [...operations].sort((a, b) => a.createdAt - b.createdAt);
    await AsyncStorage.setItem(storageKey, JSON.stringify(sorted));
  }

  private static generateLocalId(): string {
    return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private static generateOperationId(): string {
    return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
