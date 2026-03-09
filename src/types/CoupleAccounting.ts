// 情侣共同记账相关类型定义

// 权限模式枚举
export enum PermissionMode {
  ALWAYS_APPROVE = 'always_approve',    // 总是需要批准
  THRESHOLD = 'threshold',              // 自定义金额阈值
  REPORT_ONLY = 'report_only'           // 仅报告模式
}

// 交易状态枚举
export enum TransactionStatus {
  PENDING = 'pending',      // 待审批
  APPROVED = 'approved',    // 已批准
  REJECTED = 'rejected',    // 已拒绝
  COMPLETED = 'completed'   // 已完成（仅报告模式）
}

// 交易类型枚举
export enum CoupleTransactionType {
  DEPOSIT = 'deposit',      // 存入
  WITHDRAW = 'withdraw',    // 取出
  TRANSFER = 'transfer'     // 转账
}

// 共同账户接口
export interface CoupleAccount {
  id: string;                    // 账户ID
  coupleId: string;             // 情侣配对ID
  balance: number;              // 当前余额
  totalDeposit: number;         // 总存入金额
  totalWithdraw: number;        // 总取出金额
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
  isActive: boolean;            // 是否激活
}

// 权限设置接口
export interface PermissionSettings {
  id: string;                   // 设置ID
  coupleAccountId: string;      // 关联的共同账户ID
  userId: string;               // 用户ID
  mode: PermissionMode;         // 权限模式
  threshold?: number;           // 金额阈值（仅threshold模式使用）
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
}

// 共同记账交易记录接口
export interface CoupleTransaction {
  id: string;                   // 交易ID
  coupleAccountId: string;      // 关联的共同账户ID
  type: CoupleTransactionType;  // 交易类型
  amount: number;               // 交易金额
  description: string;          // 交易描述
  category?: string;            // 交易分类（可选）
  requesterId: string;          // 申请人ID
  requesterName: string;        // 申请人姓名
  approverId?: string;          // 审批人ID
  approverName?: string;        // 审批人姓名
  status: TransactionStatus;    // 交易状态
  requestedAt: string;          // 申请时间
  approvedAt?: string;          // 审批时间
  completedAt?: string;         // 完成时间
  rejectedAt?: string;          // 拒绝时间
  rejectReason?: string;        // 拒绝原因
  attachments?: string[];       // 附件（图片等）
}

// 申请审批卡片数据接口
export interface ApprovalCard {
  transaction: CoupleTransaction;
  timeAgo: string;              // 相对时间显示
  canApprove: boolean;          // 当前用户是否可以审批
  isExpired: boolean;           // 是否已过期
}

// 共同记账统计接口
export interface CoupleAccountStats {
  totalBalance: number;         // 总余额
  myContribution: number;       // 我的贡献
  partnerContribution: number;  // 伙伴的贡献
  totalTransactions: number;    // 总交易数
  pendingApprovals: number;     // 待审批数量
  thisMonthDeposit: number;     // 本月存入
  thisMonthWithdraw: number;    // 本月取出
  lastTransactionDate?: string; // 最后交易日期
}

// 权限检查结果接口
export interface PermissionCheckResult {
  allowed: boolean;             // 是否允许
  requiresApproval: boolean;    // 是否需要审批
  reason?: string;              // 原因说明
  threshold?: number;           // 相关阈值
}

// 共同记账服务配置接口
export interface CoupleAccountingConfig {
  maxPendingTransactions: number;    // 最大待审批交易数
  transactionExpireHours: number;    // 交易过期时间（小时）
  maxDailyWithdraw: number;          // 每日最大取出金额
  minTransactionAmount: number;      // 最小交易金额
  maxTransactionAmount: number;      // 最大交易金额
}

// 通知消息接口
export interface CoupleAccountingNotification {
  id: string;                   // 通知ID
  type: 'approval_request' | 'approval_result' | 'balance_low' | 'transaction_completed';
  title: string;                // 通知标题
  message: string;              // 通知内容
  transactionId?: string;       // 关联交易ID
  recipientId: string;          // 接收人ID
  isRead: boolean;              // 是否已读
  createdAt: string;            // 创建时间
}

// 共同记账历史查询参数接口
export interface CoupleTransactionQuery {
  coupleAccountId: string;      // 账户ID
  status?: TransactionStatus;   // 状态筛选
  type?: CoupleTransactionType; // 类型筛选
  startDate?: string;           // 开始日期
  endDate?: string;             // 结束日期
  requesterId?: string;         // 申请人筛选
  limit?: number;               // 限制数量
  offset?: number;              // 偏移量
}

// 批量操作结果接口
export interface BatchOperationResult {
  success: boolean;             // 是否成功
  successCount: number;         // 成功数量
  failureCount: number;         // 失败数量
  errors: string[];             // 错误信息列表
}
