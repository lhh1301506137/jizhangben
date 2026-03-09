# 恋爱记账本 - API接口文档 v2.0

## 📋 文档信息
- **版本**: v2.0
- **更新日期**: 2025-07-01
- **状态**: 本地服务实现
- **接口类型**: TypeScript服务层接口

## 🏗️ 接口架构

本应用采用本地存储架构，所有数据操作通过TypeScript服务层实现，未来可扩展为RESTful API。

## 🔐 1. 认证服务 (AuthService)

### 1.1 用户注册
```typescript
interface RegisterRequest {
  username: string;
  password: string;
}

interface AuthUser {
  id: string;
  username: string;
  createdAt: string;
}

// 方法签名
static async register(username: string, password: string): Promise<AuthUser>
```

**功能**: 用户注册新账户  
**参数**: 用户名、密码  
**返回**: 用户信息对象  
**异常**: 用户名已存在、密码格式错误

### 1.2 用户登录
```typescript
// 方法签名
static async login(username: string, password: string): Promise<AuthUser>
```

**功能**: 用户登录验证  
**参数**: 用户名、密码  
**返回**: 用户信息对象  
**异常**: 用户不存在、密码错误

### 1.3 用户登出
```typescript
// 方法签名
static async logout(): Promise<void>
```

**功能**: 清除用户登录状态  
**参数**: 无  
**返回**: 无  

### 1.4 获取当前用户
```typescript
// 方法签名
static async getCurrentUser(): Promise<AuthUser | null>
```

**功能**: 获取当前登录用户信息  
**参数**: 无  
**返回**: 用户信息或null

## 💭 2. 心情存储服务 (MoodStorage)

### 2.1 保存心情记录
```typescript
interface MoodRecord {
  id: string;
  date: string;
  mood: 'happy' | 'sad' | 'neutral' | 'excited' | 'angry';
  emoji: string;
  note?: string;
  intensity?: number;
  timestamp: number;
  userId?: string;
}

// 方法签名
static async saveMoodRecord(record: Omit<MoodRecord, 'id' | 'timestamp'>): Promise<MoodRecord>
```

**功能**: 保存或更新心情记录  
**参数**: 心情记录数据（不含id和timestamp）  
**返回**: 完整的心情记录对象  
**特性**: 自动生成ID和时间戳，同日期记录会被更新

### 2.2 获取所有心情记录
```typescript
// 方法签名
static async getAllMoodRecords(): Promise<MoodRecord[]>
```

**功能**: 获取所有心情记录  
**返回**: 心情记录数组，按日期倒序排列

### 2.3 按日期获取心情记录
```typescript
// 方法签名
static async getMoodRecordByDate(date: string): Promise<MoodRecord | null>
```

**功能**: 获取指定日期的心情记录  
**参数**: 日期字符串 (YYYY-MM-DD)  
**返回**: 心情记录对象或null

### 2.4 按月份获取心情记录
```typescript
// 方法签名
static async getMoodRecordsByMonth(year: number, month: number): Promise<MoodRecord[]>
```

**功能**: 获取指定月份的心情记录  
**参数**: 年份、月份  
**返回**: 该月份的心情记录数组

### 2.5 获取心情统计
```typescript
interface MoodStats {
  total: number;
  byMood: Record<string, number>;
  byMonth: Record<string, number>;
  averageIntensity: number;
}

// 方法签名
static async getMoodStatistics(year?: number, month?: number): Promise<MoodStats>
```

**功能**: 获取心情统计数据  
**参数**: 可选的年份和月份筛选  
**返回**: 统计数据对象

## 💕 3. 情侣服务 (CoupleService)

### 3.1 创建情侣配对
```typescript
interface CoupleInfo {
  id: string;
  myName: string;
  partnerName: string;
  anniversary?: string;
  inviteCode: string;
  isConnected: boolean;
  connectedAt?: string;
}

// 方法签名
static async createCouple(myName: string): Promise<CoupleInfo>
```

**功能**: 创建新的情侣配对  
**参数**: 我的昵称  
**返回**: 情侣信息对象（包含邀请码）

### 3.2 加入情侣配对
```typescript
// 方法签名
static async joinCouple(myName: string, inviteCode: string): Promise<CoupleInfo>
```

**功能**: 通过邀请码加入情侣配对  
**参数**: 我的昵称、邀请码  
**返回**: 情侣信息对象  
**异常**: 邀请码无效

### 3.3 获取双方心情记录
```typescript
interface CombinedMoodData {
  myMood: MoodRecord | null;
  partnerMood: PartnerMoodRecord | null;
  compatibility: number;
  message: string;
}

// 方法签名
static async getCombinedMoodByDate(date: string): Promise<CombinedMoodData>
```

**功能**: 获取指定日期双方的心情记录  
**参数**: 日期字符串  
**返回**: 包含双方心情和匹配度的对象

### 3.4 解除配对
```typescript
type DataOption = 'keep_all' | 'keep_mine_only' | 'delete_all';

// 方法签名
static async disconnect(dataOption: DataOption): Promise<boolean>
```

**功能**: 解除情侣配对  
**参数**: 数据处理选项  
**返回**: 操作成功状态

## 💌 4. 留言服务 (MessageService)

### 4.1 发送留言
```typescript
interface Message {
  id: string;
  date: string;
  content: string;
  emoji?: string;
  timestamp: number;
  authorName: string;
  isFromMe: boolean;
  readAt?: number;
}

// 方法签名
static async sendMessage(date: string, content: string, emoji?: string): Promise<Message>
```

**功能**: 发送留言给伙伴  
**参数**: 日期、内容、可选表情  
**返回**: 留言对象

### 4.2 获取指定日期留言
```typescript
// 方法签名
static async getMessagesByDate(date: string): Promise<Message[]>
```

**功能**: 获取指定日期的所有留言  
**参数**: 日期字符串  
**返回**: 留言数组，按时间排序

### 4.3 获取最近留言
```typescript
// 方法签名
static async getRecentMessages(limit: number = 50): Promise<Message[]>
```

**功能**: 获取最近的留言记录  
**参数**: 限制数量  
**返回**: 留言数组，按时间倒序

### 4.4 获取未读留言数量
```typescript
// 方法签名
static async getUnreadCount(): Promise<number>
```

**功能**: 获取未读留言数量  
**返回**: 未读留言数量

## 📅 5. 计划服务 (PlanService)

### 5.1 创建计划
```typescript
interface Plan {
  id: string;
  title: string;
  description?: string;
  type: PlanType;
  date: string;
  time?: string;
  location?: string;
  status: PlanStatus;
  createdBy: string;
  participants: string[];
  reminders: number[];
}

type PlanType = 'anniversary' | 'travel' | 'date' | 'weekend' | 'special' | 'other';
type PlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

// 方法签名
static async createPlan(planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>
```

**功能**: 创建新的共同计划  
**参数**: 计划数据（不含ID和时间戳）  
**返回**: 完整的计划对象

### 5.2 获取即将到来的计划
```typescript
// 方法签名
static async getUpcomingPlans(limit: number = 10): Promise<Plan[]>
```

**功能**: 获取即将到来的计划  
**参数**: 限制数量  
**返回**: 计划数组，按日期排序

### 5.3 更新计划状态
```typescript
// 方法签名
static async updatePlan(planId: string, updates: Partial<Plan>): Promise<boolean>
static async completePlan(planId: string): Promise<boolean>
static async cancelPlan(planId: string): Promise<boolean>
```

**功能**: 更新计划信息或状态  
**参数**: 计划ID、更新数据  
**返回**: 操作成功状态

## 🔔 6. 通知服务 (NotificationService)

### 6.1 请求通知权限
```typescript
// 方法签名
static async requestPermissions(): Promise<boolean>
```

**功能**: 请求系统通知权限  
**返回**: 权限获取状态

### 6.2 安排通知
```typescript
interface NotificationSettings {
  enabled: boolean;
  time: string;
  days: number[];
  lastNotificationId?: string;
}

// 方法签名
static async scheduleNotifications(settings?: NotificationSettings): Promise<boolean>
```

**功能**: 根据设置安排定时通知  
**参数**: 可选的通知设置  
**返回**: 安排成功状态

### 6.3 发送测试通知
```typescript
// 方法签名
static async sendTestNotification(): Promise<boolean>
```

**功能**: 发送测试通知  
**返回**: 发送成功状态

## 📊 7. 数据统计接口

### 7.1 心情统计
```typescript
// 获取心情分布统计
const stats = await MoodStorage.getMoodStatistics(2025, 7);
// 返回: { total: 15, byMood: {...}, byMonth: {...}, averageIntensity: 3.2 }
```

### 7.2 留言统计
```typescript
// 获取留言统计
const messageStats = await MessageService.getMessageStats();
// 返回: { totalMessages: 50, myMessagesCount: 25, partnerMessagesCount: 25, ... }
```

### 7.3 计划统计
```typescript
// 获取计划统计
const planStats = await PlanService.getPlanStats();
// 返回: { total: 10, byType: {...}, byStatus: {...}, upcoming: 3, thisMonth: 5 }
```

## 🔄 8. 数据同步接口

### 8.1 模拟数据同步
```typescript
// 模拟伙伴心情数据
await CoupleService.simulatePartnerData();

// 模拟伙伴留言数据
await MessageService.simulatePartnerMessages();

// 创建示例计划数据
await PlanService.createSamplePlans();
```

## 📤 9. 数据导入导出

### 9.1 数据导出
```typescript
// 导出心情数据
const moodData = await MoodStorage.exportData();

// 导出情侣数据
const coupleData = await CoupleService.exportCoupleData();

// 导出计划数据
const planData = await PlanService.exportPlans();
```

### 9.2 数据导入
```typescript
// 导入数据
const success = await MoodStorage.importData(jsonData);
```

## ⚠️ 错误处理

### 错误类型
- **ValidationError**: 数据验证错误
- **NotFoundError**: 数据不存在错误
- **PermissionError**: 权限不足错误
- **StorageError**: 存储操作错误

### 错误响应格式
```typescript
try {
  const result = await someService.someMethod();
  return result;
} catch (error) {
  console.error('操作失败:', error);
  throw new Error('具体错误信息');
}
```

## 🚀 未来扩展

### RESTful API 规划
```
POST   /api/auth/register          # 用户注册
POST   /api/auth/login             # 用户登录
GET    /api/moods                  # 获取心情记录
POST   /api/moods                  # 创建心情记录
GET    /api/couple/info            # 获取情侣信息
POST   /api/couple/connect         # 情侣配对
GET    /api/messages               # 获取留言
POST   /api/messages               # 发送留言
GET    /api/plans                  # 获取计划
POST   /api/plans                  # 创建计划
```

---

**接口负责人**: AI开发团队  
**文档维护**: 随功能开发持续更新  
**版本管理**: 语义化版本控制
