import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CoupleAccount,
  CoupleAccountStats,
  CoupleAccountingConfig,
  CoupleTransaction,
  CoupleTransactionType,
  PermissionCheckResult,
  PermissionMode,
  PermissionSettings,
  TransactionStatus,
} from '../types/CoupleAccounting';
import { authService } from './AuthService';
import { CoupleService } from './CoupleService';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { retryAsync } from '../utils/retry';

const STORAGE_KEYS = {
  COUPLE_ACCOUNTING_CONFIG: 'couple_accounting_config',
  ACCOUNTING_LAST_READ_TS: 'couple_accounting_last_read_ts',
  LEGACY_COUPLE_ACCOUNTS: 'couple_accounts',
  LEGACY_COUPLE_TRANSACTIONS: 'couple_transactions',
};

const DEFAULT_CONFIG: CoupleAccountingConfig = {
  maxPendingTransactions: 10,
  transactionExpireHours: 24,
  maxDailyWithdraw: 10000,
  minTransactionAmount: 0.01,
  maxTransactionAmount: 100000,
};

type CoupleAccountRow = {
  id: string;
  couple_id: string;
  balance: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PermissionRow = {
  id: string;
  couple_account_id: string;
  user_id: string;
  mode: PermissionMode;
  threshold: number | string | null;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  couple_account_id: string;
  requester_id: string;
  approver_id: string | null;
  type: CoupleTransactionType;
  amount: number | string;
  category: string | null;
  description: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
};

export class CoupleAccountingService {
  static async initialize(): Promise<void> {
    const config = await this.getConfig();
    if (!config) {
      await this.saveConfig(DEFAULT_CONFIG);
    }
  }

  static async getConfig(): Promise<CoupleAccountingConfig | null> {
    try {
      const configStr = await AsyncStorage.getItem(STORAGE_KEYS.COUPLE_ACCOUNTING_CONFIG);
      return configStr ? (JSON.parse(configStr) as CoupleAccountingConfig) : null;
    } catch (error) {
      console.error('get config failed:', error);
      return null;
    }
  }

  static async saveConfig(config: CoupleAccountingConfig): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.COUPLE_ACCOUNTING_CONFIG, JSON.stringify(config));
  }

  static generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  static async createCoupleAccount(coupleId: string): Promise<CoupleAccount> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase 未配置');
    }

    const existing = await this.getCoupleAccount(coupleId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('couple_accounts')
      .insert({
        couple_id: coupleId,
        balance: 0,
        is_active: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      // Unique(couple_id) race fallback.
      const fallback = await this.getCoupleAccount(coupleId);
      if (fallback) {
        return fallback;
      }
      throw new Error(error?.message || '创建共同账户失败');
    }

    await this.createDefaultPermissions(data.id);
    const account = this.mapAccountRow(data as CoupleAccountRow);
    await this.tryMigrateLegacyData(coupleId, account.id);
    return account;
  }

  static async getCoupleAccount(coupleId: string): Promise<CoupleAccount | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase
      .from('couple_accounts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const account = this.mapAccountRow(data as CoupleAccountRow);
    await this.tryMigrateLegacyData(coupleId, account.id);
    return account;
  }

  static async getCoupleAccountById(accountId: string): Promise<CoupleAccount | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase
      .from('couple_accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapAccountRow(data as CoupleAccountRow);
  }

  static async getAllCoupleAccounts(): Promise<CoupleAccount[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const coupleInfo = await CoupleService.getCoupleInfo();
    if (!coupleInfo?.isConnected) {
      return [];
    }

    const account = await this.getCoupleAccount(coupleInfo.id);
    return account ? [account] : [];
  }

  static async saveCoupleAccounts(_accounts: CoupleAccount[]): Promise<void> {
    // Supabase source of truth; no-op kept for compatibility.
  }

  static async getAllPermissionSettings(): Promise<PermissionSettings[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const coupleInfo = await CoupleService.getCoupleInfo();
    if (!coupleInfo?.isConnected) {
      return [];
    }

    const account = await this.getCoupleAccount(coupleInfo.id);
    if (!account) {
      return [];
    }

    const { data, error } = await supabase
      .from('couple_permissions')
      .select('*')
      .eq('couple_account_id', account.id);

    if (error) {
      console.error('get permissions failed:', error);
      return [];
    }

    return (data || []).map(row => this.mapPermissionRow(row as PermissionRow));
  }

  static async savePermissionSettings(_settings: PermissionSettings[]): Promise<void> {
    // Supabase source of truth; no-op kept for compatibility.
  }

  static async getUserPermissionSettings(accountId: string, userId: string): Promise<PermissionSettings | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase
      .from('couple_permissions')
      .select('*')
      .eq('couple_account_id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapPermissionRow(data as PermissionRow);
  }

  static async updatePermissionSettings(settings: PermissionSettings): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase 未配置');
    }

    const { error } = await supabase
      .from('couple_permissions')
      .update({
        mode: settings.mode,
        threshold: settings.threshold ?? null,
      })
      .eq('id', settings.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async createDefaultPermissions(accountId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const userIds = await this.getCoupleUserIds();
    if (userIds.length === 0) {
      return;
    }

    const rows = userIds.map(userId => ({
      couple_account_id: accountId,
      user_id: userId,
      mode: PermissionMode.ALWAYS_APPROVE,
      threshold: null,
    }));

    const { error } = await supabase.from('couple_permissions').upsert(rows, {
      onConflict: 'couple_account_id,user_id',
    });

    if (error) {
      console.error('create default permissions failed:', error);
    }
  }

  static async getCoupleUserIds(): Promise<string[]> {
    const currentUser = authService.getCurrentUser();
    const coupleInfo = await CoupleService.getCoupleInfo();

    if (!currentUser) {
      return [];
    }

    const ids = new Set<string>([currentUser.id]);
    if (coupleInfo?.partnerInfo?.id) {
      ids.add(coupleInfo.partnerInfo.id);
    }
    return Array.from(ids);
  }

  static async checkTransactionPermission(
    accountId: string,
    userId: string,
    amount: number,
    _type: CoupleTransactionType
  ): Promise<PermissionCheckResult> {
    const settings = await this.getUserPermissionSettings(accountId, userId);
    const config = (await this.getConfig()) || DEFAULT_CONFIG;

    if (amount < config.minTransactionAmount || amount > config.maxTransactionAmount) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `金额必须在 ${config.minTransactionAmount}-${config.maxTransactionAmount}`,
      };
    }

    if (!settings) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: '无权限配置，默认需要审批',
      };
    }

    if (settings.mode === PermissionMode.REPORT_ONLY) {
      return {
        allowed: true,
        requiresApproval: false,
      };
    }

    if (settings.mode === PermissionMode.THRESHOLD) {
      const threshold = settings.threshold ?? 0;
      return {
        allowed: true,
        requiresApproval: amount > threshold,
        threshold,
      };
    }

    return {
      allowed: true,
      requiresApproval: true,
      reason: '需要对方审批',
    };
  }

  static async createTransactionRequest(
    accountId: string,
    type: CoupleTransactionType,
    amount: number,
    description: string,
    category?: string
  ): Promise<CoupleTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase 未配置');
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const permission = await this.checkTransactionPermission(accountId, currentUser.id, amount, type);
    if (!permission.allowed) {
      throw new Error(permission.reason || '无权限');
    }

    const initialStatus = permission.requiresApproval ? TransactionStatus.PENDING : TransactionStatus.COMPLETED;

    const { data, error } = await supabase
      .from('couple_transactions')
      .insert({
        couple_account_id: accountId,
        requester_id: currentUser.id,
        type,
        amount,
        category: category || null,
        description,
        status: initialStatus,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || '创建交易失败');
    }

    const transaction = this.mapTransactionRow(data as TransactionRow, currentUser.username, undefined);

    if (!permission.requiresApproval) {
      await this.executeTransaction(transaction);
    }

    return transaction;
  }

  static async executeTransaction(transaction: CoupleTransaction): Promise<void> {
    const account = await this.getCoupleAccountById(transaction.coupleAccountId);
    if (!account) {
      throw new Error('账户不存在');
    }

    let nextBalance = account.balance;
    if (transaction.type === CoupleTransactionType.DEPOSIT) {
      nextBalance += transaction.amount;
    } else {
      if (nextBalance < transaction.amount) {
        throw new Error('余额不足');
      }
      nextBalance -= transaction.amount;
    }

    const { error } = await supabase
      .from('couple_accounts')
      .update({ balance: nextBalance })
      .eq('id', account.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async getAllCoupleTransactions(): Promise<CoupleTransaction[]> {
    const coupleInfo = await CoupleService.getCoupleInfo();
    if (!coupleInfo?.isConnected) {
      return [];
    }

    const account = await this.getCoupleAccount(coupleInfo.id);
    if (!account) {
      return [];
    }

    return this.getAccountTransactions(account.id);
  }

  static async saveCoupleTransactions(_transactions: CoupleTransaction[]): Promise<void> {
    // Supabase source of truth; no-op kept for compatibility.
  }

  static async approveTransaction(transactionId: string): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('couple_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || '交易不存在');
    }

    const row = data as TransactionRow;
    if (row.status !== TransactionStatus.PENDING) {
      throw new Error('交易状态不正确');
    }
    if (row.requester_id === currentUser.id) {
      throw new Error('不能审批自己的申请');
    }

    const { error: updateError } = await supabase
      .from('couple_transactions')
      .update({
        status: TransactionStatus.APPROVED,
        approver_id: currentUser.id,
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const transaction = this.mapTransactionRow(row, '', currentUser.username);
    await this.executeTransaction(transaction);
  }

  static async rejectTransaction(transactionId: string, reason?: string): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const { error } = await supabase
      .from('couple_transactions')
      .update({
        status: TransactionStatus.REJECTED,
        approver_id: currentUser.id,
        description: reason ? `【拒绝】${reason}` : undefined,
      })
      .eq('id', transactionId)
      .eq('status', TransactionStatus.PENDING);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async cancelTransactionRequest(transactionId: string): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('couple_transactions')
      .select('id,status,requester_id')
      .eq('id', transactionId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || '交易不存在');
    }

    const row = data as Pick<TransactionRow, 'id' | 'status' | 'requester_id'>;
    if (row.requester_id !== currentUser.id) {
      throw new Error('只能取消自己的申请');
    }
    if (row.status !== TransactionStatus.PENDING) {
      throw new Error('仅可取消待审批的申请');
    }

    const { error: updateError } = await supabase
      .from('couple_transactions')
      .update({
        status: TransactionStatus.REJECTED,
        approver_id: null,
      })
      .eq('id', transactionId)
      .eq('status', TransactionStatus.PENDING)
      .eq('requester_id', currentUser.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  static async getAccountTransactions(accountId: string): Promise<CoupleTransaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const currentUser = authService.getCurrentUser();
    const coupleInfo = await CoupleService.getCoupleInfo();
    const myName = coupleInfo?.myName || currentUser?.username || '我';
    const partnerName = coupleInfo?.partnerName || '伙伴';

    const { data, error } = await retryAsync(async () => {
      const response = await supabase
        .from('couple_transactions')
        .select('*')
        .eq('couple_account_id', accountId)
        .order('created_at', { ascending: false });
      if (response.error) {
        throw response.error;
      }
      return response;
    });

    if (error) {
      console.error('get account transactions failed:', error);
      return [];
    }

    return (data || []).map(row => {
      const tx = row as TransactionRow;
      const requesterName = tx.requester_id === currentUser?.id ? myName : partnerName;
      const approverName = tx.approver_id
        ? (tx.approver_id === currentUser?.id ? myName : partnerName)
        : undefined;
      return this.mapTransactionRow(tx, requesterName, approverName);
    });
  }

  static async getAccountStats(
    accountId: string,
    prefetchedAccount?: CoupleAccount | null,
    prefetchedTransactions?: CoupleTransaction[]
  ): Promise<CoupleAccountStats | null> {
    const account = prefetchedAccount ?? (await this.getCoupleAccountById(accountId));
    if (!account) {
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const transactions = prefetchedTransactions ?? (await this.getAccountTransactions(accountId));
    const finishedStatuses = [TransactionStatus.COMPLETED, TransactionStatus.APPROVED];
    const finished = transactions.filter(item => finishedStatuses.includes(item.status));

    const totalDeposit = finished
      .filter(item => item.type === CoupleTransactionType.DEPOSIT)
      .reduce((sum, item) => sum + item.amount, 0);

    const totalWithdraw = finished
      .filter(item => item.type === CoupleTransactionType.WITHDRAW || item.type === CoupleTransactionType.TRANSFER)
      .reduce((sum, item) => sum + item.amount, 0);

    const myContribution = finished
      .filter(item => item.requesterId === currentUser.id && item.type === CoupleTransactionType.DEPOSIT)
      .reduce((sum, item) => sum + item.amount, 0);

    const pendingApprovals = transactions.filter(
      item => item.status === TransactionStatus.PENDING
    ).length;

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const thisMonthFinished = finished.filter(item => item.requestedAt.startsWith(monthPrefix));

    const thisMonthDeposit = thisMonthFinished
      .filter(item => item.type === CoupleTransactionType.DEPOSIT)
      .reduce((sum, item) => sum + item.amount, 0);

    const thisMonthWithdraw = thisMonthFinished
      .filter(item => item.type === CoupleTransactionType.WITHDRAW || item.type === CoupleTransactionType.TRANSFER)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalBalance: account.balance,
      myContribution,
      partnerContribution: Math.max(totalDeposit - myContribution, 0),
      totalTransactions: finished.length,
      pendingApprovals,
      thisMonthDeposit,
      thisMonthWithdraw,
      lastTransactionDate: finished[0]?.completedAt,
    };
  }

  static async markAccountAsRead(accountId: string): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    const key = `${STORAGE_KEYS.ACCOUNTING_LAST_READ_TS}_${currentUser.id}_${accountId}`;
    await AsyncStorage.setItem(key, Date.now().toString());
  }

  static async getUnreadCount(accountId: string): Promise<number> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return 0;
      }

      const key = `${STORAGE_KEYS.ACCOUNTING_LAST_READ_TS}_${currentUser.id}_${accountId}`;
      const lastReadTsStr = await AsyncStorage.getItem(key);
      const lastReadTs = lastReadTsStr ? Number(lastReadTsStr) : 0;

      const partnerTransactions = (await this.getAccountTransactions(accountId)).filter(
        item => item.requesterId !== currentUser.id
      );

      if (!lastReadTsStr) {
        return partnerTransactions.length;
      }

      return partnerTransactions.filter(item => new Date(item.requestedAt).getTime() > lastReadTs).length;
    } catch (error) {
      console.error('get unread accounting count failed:', error);
      return 0;
    }
  }

  static async clearAllData(): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const coupleInfo = await CoupleService.getCoupleInfo();
    if (!coupleInfo?.isConnected) {
      return;
    }

    const account = await this.getCoupleAccount(coupleInfo.id);
    if (!account) {
      return;
    }

    await supabase.from('couple_transactions').delete().eq('couple_account_id', account.id);
    await supabase.from('couple_permissions').delete().eq('couple_account_id', account.id);
    await supabase.from('couple_accounts').delete().eq('id', account.id);
  }

  private static async tryMigrateLegacyData(coupleId: string, remoteAccountId: string): Promise<void> {
    try {
      const { count, error } = await supabase
        .from('couple_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('couple_account_id', remoteAccountId);
      if (!error && (count || 0) > 0) {
        return;
      }

      const legacyAccountsStr = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_COUPLE_ACCOUNTS);
      const legacyTransactionsStr = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_COUPLE_TRANSACTIONS);
      if (!legacyAccountsStr || !legacyTransactionsStr) {
        return;
      }

      const legacyAccounts = JSON.parse(legacyAccountsStr) as Array<{
        id: string;
        coupleId: string;
        balance: number;
        isActive: boolean;
      }>;
      const legacyTransactions = JSON.parse(legacyTransactionsStr) as Array<{
        coupleAccountId: string;
        requesterId: string;
        approverId?: string;
        type: CoupleTransactionType;
        amount: number;
        category?: string;
        description: string;
        status: TransactionStatus;
        requestedAt?: string;
      }>;

      const legacyAccount = legacyAccounts.find(item => item.coupleId === coupleId && item.isActive);
      if (!legacyAccount) {
        return;
      }

      const currentUser = authService.getCurrentUser();
      const coupleInfo = await CoupleService.getCoupleInfo();
      if (!currentUser || !coupleInfo) {
        return;
      }

      const knownUserIds = new Set<string>([currentUser.id]);
      if (coupleInfo.partnerInfo?.id && this.isUuid(coupleInfo.partnerInfo.id)) {
        knownUserIds.add(coupleInfo.partnerInfo.id);
      }

      const rows = legacyTransactions
        .filter(item => item.coupleAccountId === legacyAccount.id)
        .map(item => {
          const requesterId = knownUserIds.has(item.requesterId) ? item.requesterId : currentUser.id;
          const approverId = item.approverId && knownUserIds.has(item.approverId) ? item.approverId : null;
          return {
            couple_account_id: remoteAccountId,
            requester_id: requesterId,
            approver_id: approverId,
            type: item.type,
            amount: Number(item.amount || 0),
            category: item.category || null,
            description: item.description || '迁移交易',
            status: item.status || TransactionStatus.COMPLETED,
            created_at: item.requestedAt || new Date().toISOString(),
          };
        })
        .filter(item => item.amount > 0);

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('couple_transactions').insert(rows);
        if (insertError) {
          console.error('legacy transactions migrate failed:', insertError);
          return;
        }
      }

      await supabase
        .from('couple_accounts')
        .update({ balance: Number(legacyAccount.balance || 0) })
        .eq('id', remoteAccountId);
    } catch (error) {
      console.error('try migrate legacy accounting data failed:', error);
    }
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private static mapAccountRow(row: CoupleAccountRow): CoupleAccount {
    return {
      id: row.id,
      coupleId: row.couple_id,
      balance: Number(row.balance || 0),
      totalDeposit: 0,
      totalWithdraw: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    };
  }

  private static mapPermissionRow(row: PermissionRow): PermissionSettings {
    return {
      id: row.id,
      coupleAccountId: row.couple_account_id,
      userId: row.user_id,
      mode: row.mode,
      threshold: row.threshold === null ? undefined : Number(row.threshold),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapTransactionRow(
    row: TransactionRow,
    requesterName: string,
    approverName?: string
  ): CoupleTransaction {
    return {
      id: row.id,
      coupleAccountId: row.couple_account_id,
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      category: row.category || undefined,
      requesterId: row.requester_id,
      requesterName: requesterName || '伙伴',
      approverId: row.approver_id || undefined,
      approverName,
      status: row.status,
      requestedAt: row.created_at,
      approvedAt: row.status === TransactionStatus.APPROVED ? row.updated_at : undefined,
      completedAt: row.status === TransactionStatus.COMPLETED ? row.updated_at : undefined,
      rejectedAt: row.status === TransactionStatus.REJECTED ? row.updated_at : undefined,
    };
  }
}
