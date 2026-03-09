// 节日数据定义
export interface Holiday {
  date: string; // YYYY-MM-DD 格式
  name: string;
  type: 'traditional' | 'international' | 'love' | 'special';
  emoji: string;
  description?: string;
}

// 2025年节日数据
export const holidays2025: Holiday[] = [
  // 1月
  { date: '2025-01-01', name: '元旦', type: 'international', emoji: '🎊', description: '新年快乐！' },
  { date: '2025-01-14', name: '日记情人节', type: 'love', emoji: '📖', description: '记录爱情的美好时光' },
  { date: '2025-01-29', name: '春节', type: 'traditional', emoji: '🧧', description: '农历新年，阖家团圆' },
  
  // 2月
  { date: '2025-02-14', name: '情人节', type: 'love', emoji: '💕', description: '爱情的节日' },
  { date: '2025-02-19', name: '元宵节', type: 'traditional', emoji: '🏮', description: '正月十五闹元宵' },
  
  // 3月
  { date: '2025-03-08', name: '妇女节', type: 'international', emoji: '👩', description: '致敬所有女性' },
  { date: '2025-03-14', name: '白色情人节', type: 'love', emoji: '🤍', description: '回应爱意的日子' },
  
  // 4月
  { date: '2025-04-01', name: '愚人节', type: 'international', emoji: '😄', description: '开心愚人，快乐一天' },
  { date: '2025-04-05', name: '清明节', type: 'traditional', emoji: '🌸', description: '缅怀先人，踏青赏春' },
  
  // 5月
  { date: '2025-05-01', name: '劳动节', type: 'international', emoji: '💪', description: '向劳动者致敬' },
  { date: '2025-05-11', name: '母亲节', type: 'international', emoji: '👩‍👧‍👦', description: '感恩母亲的爱' },
  { date: '2025-05-20', name: '网络情人节', type: 'love', emoji: '💖', description: '我爱你(520)' },
  
  // 6月
  { date: '2025-06-01', name: '儿童节', type: 'international', emoji: '🧸', description: '童心未泯，快乐永远' },
  { date: '2025-06-15', name: '父亲节', type: 'international', emoji: '👨‍👧‍👦', description: '感恩父亲的爱' },
  
  // 7月
  { date: '2025-07-07', name: '七夕节', type: 'love', emoji: '💫', description: '中国传统情人节' },
  
  // 8月
  { date: '2025-08-15', name: '中秋节', type: 'traditional', emoji: '🌕', description: '月圆人团圆' },
  
  // 9月
  { date: '2025-09-10', name: '教师节', type: 'special', emoji: '👩‍🏫', description: '感恩老师的教导' },
  
  // 10月
  { date: '2025-10-01', name: '国庆节', type: 'special', emoji: '🇨🇳', description: '祖国生日快乐' },
  { date: '2025-10-31', name: '万圣节', type: 'international', emoji: '🎃', description: '不给糖就捣蛋' },
  
  // 11月
  { date: '2025-11-11', name: '光棍节', type: 'special', emoji: '🥢', description: '单身快乐或脱单成功' },
  
  // 12月
  { date: '2025-12-24', name: '平安夜', type: 'international', emoji: '🎄', description: '平安喜乐' },
  { date: '2025-12-25', name: '圣诞节', type: 'international', emoji: '🎅', description: '圣诞快乐' },
];

// 获取指定日期的节日信息
export const getHolidayByDate = (date: string): Holiday | undefined => {
  return holidays2025.find(holiday => holiday.date === date);
};

// 获取指定月份的所有节日
export const getHolidaysByMonth = (year: number, month: number): Holiday[] => {
  const monthStr = String(month).padStart(2, '0');
  return holidays2025.filter(holiday => 
    holiday.date.startsWith(`${year}-${monthStr}`)
  );
};

// 获取爱情相关的节日
export const getLoveHolidays = (): Holiday[] => {
  return holidays2025.filter(holiday => holiday.type === 'love');
};

// 检查是否是特殊日期
export const isSpecialDate = (date: string): boolean => {
  return holidays2025.some(holiday => holiday.date === date);
};
