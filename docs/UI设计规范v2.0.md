# 恋爱记账本 - UI设计规范 v2.0

## 📋 文档信息
- **版本**: v2.0
- **更新日期**: 2025-07-01
- **设计风格**: 可爱粉色主题
- **目标用户**: 学生情侣群体

## 🎨 设计理念

### 核心理念
- **温馨可爱**: 营造温馨浪漫的使用氛围
- **简洁易用**: 界面简洁，操作直观
- **情感化设计**: 通过色彩和元素传达情感
- **年轻化**: 符合学生群体的审美偏好

### 设计原则
1. **一致性**: 保持整体设计风格统一
2. **可用性**: 优先考虑用户体验和易用性
3. **情感化**: 通过设计元素传达爱情主题
4. **响应式**: 适配不同屏幕尺寸

## 🌈 色彩系统

### 主色调
```typescript
export const Colors = {
  // 主要颜色
  primary: '#FF69B4',        // 热情粉 - 主要按钮、强调元素
  primaryLight: '#FFB6C1',   // 浅粉色 - 次要按钮、背景
  primaryDark: '#FF1493',    // 深粉色 - 悬停状态、激活状态
  
  // 辅助颜色
  secondary: '#FFC0CB',      // 粉红色 - 装饰元素
  accent: '#FFD700',         // 金黄色 - 特殊标记、徽章
  
  // 背景颜色
  background: '#FFF5F8',     // 浅粉背景 - 页面背景
  surface: '#FFFFFF',        // 纯白色 - 卡片背景
  overlay: 'rgba(0,0,0,0.5)', // 半透明黑 - 模态框遮罩
  
  // 文字颜色
  text: '#333333',           // 深灰色 - 主要文字
  textSecondary: '#666666',  // 中灰色 - 次要文字
  textLight: '#999999',      // 浅灰色 - 辅助文字
  textInverse: '#FFFFFF',    // 白色 - 反色文字
  
  // 边框和分割线
  border: '#E0E0E0',         // 浅灰色 - 边框
  divider: '#F0F0F0',        // 极浅灰 - 分割线
  
  // 状态颜色
  success: '#4CAF50',        // 绿色 - 成功状态
  warning: '#FF9800',        // 橙色 - 警告状态
  error: '#F44336',          // 红色 - 错误状态
  info: '#2196F3',           // 蓝色 - 信息状态
};
```

### 心情颜色
```typescript
mood: {
  happy: '#FFD700',          // 金黄色 - 开心
  excited: '#FF69B4',        // 热情粉 - 兴奋
  neutral: '#DDA0DD',        // 淡紫色 - 平淡
  sad: '#87CEEB',            // 天蓝色 - 难过
  angry: '#FF6347',          // 番茄红 - 生气
}
```

### 色彩使用规范
- **主色调**: 用于主要操作按钮、导航栏、重要信息
- **辅助色**: 用于次要按钮、装饰元素、状态指示
- **背景色**: 用于页面背景、卡片背景、输入框背景
- **文字色**: 根据重要性和层级选择不同深度的灰色

## 📝 字体系统

### 字体大小
```typescript
export const FontSizes = {
  xs: 12,    // 极小文字 - 标签、说明文字
  sm: 14,    // 小文字 - 次要信息、按钮文字
  md: 16,    // 中等文字 - 正文、输入框
  lg: 18,    // 大文字 - 标题、重要信息
  xl: 20,    // 特大文字 - 主标题
  xxl: 24,   // 超大文字 - 页面标题、数字展示
  xxxl: 32,  // 巨大文字 - 特殊展示、emoji
};
```

### 字体权重
```typescript
export const FontWeights = {
  normal: '400',    // 正常 - 正文内容
  medium: '500',    // 中等 - 次要标题
  semibold: '600',  // 半粗 - 重要信息
  bold: '700',      // 粗体 - 主要标题
};
```

### 行高规范
- **标题**: 1.2倍行高
- **正文**: 1.5倍行高
- **按钮**: 1.0倍行高
- **输入框**: 1.4倍行高

## 📏 间距系统

### 间距规范
```typescript
export const Spacing = {
  xs: 4,     // 极小间距 - 图标与文字间距
  sm: 8,     // 小间距 - 相关元素间距
  md: 16,    // 中等间距 - 组件间距
  lg: 24,    // 大间距 - 区块间距
  xl: 32,    // 特大间距 - 页面边距
  xxl: 48,   // 超大间距 - 特殊布局
};
```

### 间距使用原则
- **内边距**: 组件内部元素间距
- **外边距**: 组件之间的间距
- **页面边距**: 页面内容与屏幕边缘的间距
- **垂直间距**: 垂直方向元素间距

## 🔲 圆角系统

### 圆角规范
```typescript
export const BorderRadius = {
  none: 0,      // 无圆角 - 特殊需求
  xs: 2,        // 极小圆角 - 小按钮、标签
  sm: 4,        // 小圆角 - 输入框、小卡片
  md: 8,        // 中等圆角 - 按钮、卡片
  lg: 12,       // 大圆角 - 大卡片、模态框
  xl: 16,       // 特大圆角 - 特殊组件
  full: 9999,   // 完全圆角 - 圆形按钮、头像
};
```

## 🎯 组件设计规范

### 按钮组件
```typescript
// 主要按钮
primaryButton: {
  backgroundColor: Colors.primary,
  color: Colors.textInverse,
  borderRadius: BorderRadius.md,
  paddingVertical: Spacing.md,
  paddingHorizontal: Spacing.lg,
  fontSize: FontSizes.md,
  fontWeight: FontWeights.semibold,
}

// 次要按钮
secondaryButton: {
  backgroundColor: Colors.primaryLight,
  color: Colors.primary,
  borderRadius: BorderRadius.md,
  paddingVertical: Spacing.md,
  paddingHorizontal: Spacing.lg,
  fontSize: FontSizes.md,
  fontWeight: FontWeights.medium,
}

// 文字按钮
textButton: {
  backgroundColor: 'transparent',
  color: Colors.primary,
  fontSize: FontSizes.md,
  fontWeight: FontWeights.medium,
}
```

### 卡片组件
```typescript
card: {
  backgroundColor: Colors.surface,
  borderRadius: BorderRadius.lg,
  padding: Spacing.md,
  marginBottom: Spacing.md,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}
```

### 输入框组件
```typescript
textInput: {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: BorderRadius.md,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.md,
  fontSize: FontSizes.md,
  color: Colors.text,
  backgroundColor: Colors.surface,
}

// 聚焦状态
textInputFocused: {
  borderColor: Colors.primary,
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
}
```

## 📱 布局规范

### 页面布局
```typescript
// 页面容器
pageContainer: {
  flex: 1,
  backgroundColor: Colors.background,
}

// 内容容器
contentContainer: {
  flex: 1,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.md,
}

// 安全区域
safeArea: {
  flex: 1,
  backgroundColor: Colors.surface,
}
```

### 网格系统
- **12列网格**: 基于12列的响应式网格系统
- **断点**: 小屏幕(<768px)、大屏幕(≥768px)
- **间距**: 列间距为16px

### 响应式设计
```typescript
// 屏幕尺寸断点
const breakpoints = {
  small: 0,      // 手机竖屏
  medium: 768,   // 平板
  large: 1024,   // 平板横屏/小桌面
};
```

## 🎭 图标系统

### 图标规范
- **风格**: 线性图标为主，填充图标为辅
- **大小**: 16px、20px、24px、32px
- **颜色**: 继承文字颜色或使用主题色
- **间距**: 图标与文字间距4px

### 常用图标
```typescript
const Icons = {
  // 导航图标
  home: '🏠',
  calendar: '📅',
  heart: '💕',
  settings: '⚙️',
  
  // 心情图标
  happy: '😊',
  excited: '🥳',
  neutral: '😐',
  sad: '😢',
  angry: '😠',
  
  // 功能图标
  add: '+',
  edit: '✏️',
  delete: '🗑️',
  share: '📤',
  notification: '🔔',
  message: '💌',
  plan: '📋',
};
```

## 🌟 动画规范

### 动画时长
```typescript
const AnimationDuration = {
  fast: 150,     // 快速动画 - 按钮点击
  normal: 300,   // 正常动画 - 页面切换
  slow: 500,     // 慢速动画 - 复杂动画
};
```

### 缓动函数
```typescript
const Easing = {
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'spring',
};
```

### 常用动画
- **淡入淡出**: 模态框显示隐藏
- **滑动**: 页面切换、抽屉菜单
- **缩放**: 按钮点击反馈
- **弹性**: 成功操作反馈

## 📐 阴影系统

### 阴影层级
```typescript
const Shadows = {
  // 轻微阴影 - 悬浮按钮
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // 中等阴影 - 卡片
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // 重阴影 - 模态框
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
};
```

## 🎨 主题变体

### 浅色主题（默认）
- 背景：浅粉色系
- 文字：深色系
- 卡片：白色背景

### 深色主题（预留）
- 背景：深色系
- 文字：浅色系
- 卡片：深灰背景

## 📱 适配规范

### 屏幕适配
- **iPhone SE**: 320px宽度适配
- **iPhone 12**: 390px宽度适配
- **iPhone 12 Pro Max**: 428px宽度适配
- **iPad**: 768px宽度适配

### 安全区域
- **顶部**: 状态栏高度适配
- **底部**: Home指示器适配
- **刘海屏**: 异形屏适配

## 🔍 可访问性

### 对比度
- **正文文字**: 至少4.5:1对比度
- **大文字**: 至少3:1对比度
- **图标**: 至少3:1对比度

### 触摸目标
- **最小尺寸**: 44px × 44px
- **推荐尺寸**: 48px × 48px
- **间距**: 相邻目标间距至少8px

## 📋 设计检查清单

### 视觉检查
- [ ] 色彩使用符合规范
- [ ] 字体大小和权重正确
- [ ] 间距使用一致
- [ ] 圆角规范统一
- [ ] 阴影层级合理

### 交互检查
- [ ] 按钮状态完整
- [ ] 动画流畅自然
- [ ] 反馈及时明确
- [ ] 操作逻辑清晰

### 适配检查
- [ ] 不同屏幕尺寸适配
- [ ] 安全区域处理
- [ ] 横竖屏适配
- [ ] 可访问性支持

---

**设计负责人**: AI设计团队  
**文档维护**: 随设计迭代持续更新  
**设计工具**: Figma、Sketch
