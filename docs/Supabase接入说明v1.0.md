# Supabase接入说明 v1.0

## 1. 环境变量
1. 在项目根目录创建 `.env`
2. 参考 `.env.example` 填入：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. 数据库初始化
1. 打开 Supabase SQL Editor
2. 执行 `docs/supabase_mvp_schema_v3.sql`
3. 如果你之前已执行过旧版 SQL，也请重新执行一次同文件（内含 `alter table ... add column if not exists` 补丁）
4. 新增配对邀请码表：同一文件已包含 `couple_invites`，务必执行成功

## 3. Auth 设置
1. 打开 Authentication -> Providers
2. 启用 Email/Password
3. MVP阶段建议先关闭邮箱确认（便于联调）

## 4. 启动验证
1. `npm install`
2. `npm run start`
3. 注册新用户并登录
4. 重启 App 后验证自动登录与会话恢复

## 5. 当前范围
- 已接入：认证服务（Mock -> Supabase）
- 已接入：心情模块（离线可写 + 联网后自动同步 `mood_entries`）
- 已接入：个人记账模块（本地缓存 + 待同步队列 + `personal_transactions`）
- 已接入：留言模块（`messages` + 可选 Realtime 订阅接口）
- 已接入：计划模块（`plans` 扩展字段映射）
- 已提供：MVP schema + RLS 初版
- 待接入：情侣共同记账模块（`couple_accounts` / `couple_transactions` / `couple_permissions`）
