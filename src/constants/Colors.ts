// 可爱风格的颜色主题
export const Colors = {
  // 主色调（可爱粉色系）
  primary: '#FF69B4',      // 热粉色
  primaryLight: '#FFB6C1', // 浅粉色
  primaryDark: '#C71585',  // 深粉色
  
  // 辅助色
  secondary: '#87CEEB',    // 天蓝色
  accent: '#FFD700',       // 金黄色
  
  // 中性色
  background: '#FFFAF0',   // 花白色
  backgroundSecondary: '#FFF5F8', // 次级背景
  surface: '#FFFFFF',      // 纯白
  text: '#333333',         // 深灰
  textSecondary: '#666666', // 中灰
  border: '#E0E0E0',       // 浅灰
  
  // 状态色
  success: '#4CAF50',      // 绿色
  warning: '#FF9800',      // 橙色
  error: '#F44336',        // 红色
  
  // 心情颜色
  mood: {
    happy: '#FFD700',      // 开心 - 金黄色
    sad: '#87CEEB',        // 难过 - 天蓝色
    neutral: '#DDA0DD',    // 平淡 - 紫色
    excited: '#FF69B4',    // 兴奋 - 热粉色
    angry: '#FF6347',      // 生气 - 番茄红
  }
};

// 字体大小
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 间距
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// 圆角
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 50,
};

// 阴影
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};
