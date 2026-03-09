# 恋爱记账本 - MVP目标与架构蓝图 v3.0

## 📋 文档信息
- 版本：v3.0
- 日期：2026-02-14
- 状态：已锁定（执行基线）
- 适用范围：MVP（Android only）

## 🎯 目标定义
- 交付目标：发布可用 MVP，不追求速度，优先正确性与完整性
- 核心功能（P0）：认证、心情、个人记账、情侣共同记账、留言、计划
- 成功标准：
  - 所有 P0 功能主流程闭环可用
  - 双账号场景可稳定运行
  - 离线可写，恢复网络后可同步
  - 关键数据无串号、无越权

## 🧱 技术栈
- 客户端：React Native + Expo + TypeScript
- 后端：Supabase
  - Auth：邮箱密码
  - Database：PostgreSQL + Row Level Security (RLS)
  - Realtime：仅留言、共同记账审批

## 🗂️ 核心数据域

### 1) 账户与关系
- `profiles`
  - `id` (uuid, pk, references auth.users.id)
  - `username` (text)
  - `created_at`, `updated_at`
- `couples`
  - `id` (uuid, pk)
  - `user1_id`, `user2_id` (uuid)
  - `status` (active/inactive)
  - `anniversary` (date, nullable)
  - `created_at`, `updated_at`

### 2) 心情
- `mood_entries`
  - `id` (uuid, pk)
  - `user_id` (uuid)
  - `entry_date` (date)
  - `mood` (text)
  - `intensity` (int)
  - `note` (text, nullable)
  - `updated_at`

### 3) 个人记账
- `personal_transactions`
  - `id` (uuid, pk)
  - `user_id` (uuid)
  - `date` (date)
  - `type` (income/expense)
  - `category` (text)
  - `amount` (numeric)
  - `description` (text, nullable)
  - `updated_at`

### 4) 共同记账
- `couple_accounts`
  - `id` (uuid, pk)
  - `couple_id` (uuid)
  - `balance` (numeric)
  - `is_active` (bool)
  - `updated_at`
- `couple_permissions`
  - `id` (uuid, pk)
  - `couple_account_id` (uuid)
  - `user_id` (uuid)
  - `mode` (always_approve/threshold/report_only)
  - `threshold` (numeric, nullable)
  - `updated_at`
- `couple_transactions`
  - `id` (uuid, pk)
  - `couple_account_id` (uuid)
  - `requester_id` (uuid)
  - `approver_id` (uuid, nullable)
  - `type` (deposit/withdraw/transfer)
  - `amount` (numeric)
  - `category` (text, nullable)
  - `description` (text)
  - `status` (pending/approved/rejected/completed)
  - `created_at`, `updated_at`

### 5) 留言与计划
- `messages`
  - `id` (uuid, pk)
  - `couple_id` (uuid)
  - `sender_id` (uuid)
  - `content` (text)
  - `entry_date` (date)
  - `created_at`
- `plans`
  - `id` (uuid, pk)
  - `couple_id` (uuid)
  - `created_by` (uuid)
  - `title` (text)
  - `description` (text, nullable)
  - `plan_date` (date)
  - `status` (planned/in_progress/completed/cancelled)
  - `updated_at`

## 🔐 RLS 规则（最低要求）
- 通用原则：
  - 所有表默认拒绝
  - 仅在策略中显式允许读写
  - 所有请求必须依赖 `auth.uid()`
- 个人表（`mood_entries`, `personal_transactions`）：
  - `user_id = auth.uid()` 才能 select/insert/update/delete
- 情侣共享表（`messages`, `plans`, `couple_accounts`, `couple_transactions`, `couple_permissions`）：
  - 仅当 `auth.uid()` 属于该 `couple_id` 对应情侣时允许访问
- 审批约束：
  - 申请人不得审批自己发起的交易

## 🔄 离线可写与同步设计

### 本地队列
- 本地新增 `sync_queue`（AsyncStorage）
- 每个操作统一结构：
  - `id`, `entity`, `action`, `payload`, `client_updated_at`, `retry_count`

### 同步触发
- App 启动
- 登录成功
- 网络恢复
- 用户手动触发“立即同步”

### 冲突处理
- 基线策略：Last Write Wins（按 `updated_at`）
- 例外策略：
  - 共同记账审批：服务端状态机优先，禁止客户端覆盖终态
  - 余额计算：仅由服务端事务变更，客户端只读结果

### 幂等性
- 客户端为每次写操作生成 `client_op_id`
- 服务端按 `client_op_id` 去重，避免断网重试导致重复入账

## ⚡ Realtime 使用边界
- 使用 Realtime：
  - `messages` 新消息推送
  - `couple_transactions` 状态变更推送（pending -> approved/rejected/completed）
- 不使用 Realtime：
  - 心情、个人记账、计划（由同步队列拉取/提交）

## 🧪 质量门禁（DoD）
- 每个模块必须满足：
  1. 主流程测试通过
  2. 至少 3 个异常场景通过（网络中断、重复提交、权限不足）
  3. 双账号互测通过（A/B）
  4. 离线写入 -> 恢复网络 -> 数据一致
  5. 文档更新完成

## 🚦实施顺序（锁定）
1. 认证接入 Supabase（替换本地 mock）
2. 数据层与 RLS 完成
3. 心情模块迁移
4. 个人记账迁移
5. 共同记账迁移（含审批闭环）
6. 留言迁移（Realtime）
7. 计划迁移
8. 回归测试与 Android 发布准备

## 📎 落地脚本
- Supabase 建表与 RLS 初版：`love-accounting/docs/supabase_mvp_schema_v3.sql`

## 📝 非目标（MVP 暂不做）
- iOS 首发
- 第三方登录
- 银行/微信/支付宝账单自动读取
- AI 记账助手
- 相册与流浪瓶
