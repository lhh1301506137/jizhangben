import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { getHolidayByDate, getHolidaysByMonth, Holiday } from '../../data/holidays';
import { MoodStorage, MoodRecord as StoredMoodRecord } from '../../services/MoodStorage';
import { MoodDetailModal } from './MoodDetailModal';
import { CoupleMoodDisplay } from '../couple/CoupleMoodDisplay';
import { CoupleService } from '../../services/CoupleService';

// 心情类型定义
export type MoodType = 'happy' | 'sad' | 'neutral' | 'excited' | 'angry';

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
}

interface MoodRecord {
  date: string;
  mood: MoodType;
  emoji: string;
  note?: string;
  intensity?: number;
}

interface MoodCalendarProps {
  onMoodSelect?: (date: string, mood: MoodType) => void;
  onAnalyticsPress?: () => void;
}

const moodOptions: MoodOption[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: Colors.mood.happy },
  { type: 'excited', emoji: '🥳', label: '兴奋', color: Colors.mood.excited },
  { type: 'neutral', emoji: '😐', label: '平淡', color: Colors.mood.neutral },
  { type: 'sad', emoji: '😢', label: '难过', color: Colors.mood.sad },
  { type: 'angry', emoji: '😠', label: '生气', color: Colors.mood.angry },
];

export const MoodCalendar: React.FC<MoodCalendarProps> = ({ onMoodSelect, onAnalyticsPress }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showMoodDetailModal, setShowMoodDetailModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodRecords, setMoodRecords] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoodRecord, setSelectedMoodRecord] = useState<MoodRecord | undefined>();
  const [coupleConnected, setCoupleConnected] = useState(false);
  const [selectedDateForCouple, setSelectedDateForCouple] = useState<string>('');

  // 加载心情记录数据
  useEffect(() => {
    loadMoodRecords();
    checkCoupleConnection();
  }, [currentDate]);

  const checkCoupleConnection = async () => {
    const connected = await CoupleService.isConnected();
    setCoupleConnected(connected);

    // 如果已连接，模拟加载伙伴数据
    if (connected) {
      await CoupleService.simulatePartnerData();
    }
  };

  const loadMoodRecords = async () => {
    try {
      setLoading(true);
      const records = await MoodStorage.getMoodRecordsByMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      // 转换存储格式到组件格式
      const convertedRecords: MoodRecord[] = records.map(record => ({
        date: record.date,
        mood: record.mood,
        emoji: record.emoji,
        note: record.note,
        intensity: record.intensity,
      }));

      setMoodRecords(convertedRecords);
    } catch (error) {
      console.error('加载心情记录失败:', error);
      Alert.alert('错误', '加载心情记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (dateString: string) => {
    setSelectedDate(dateString);

    // 如果已配对，显示情侣心情展示
    if (coupleConnected) {
      setSelectedDateForCouple(dateString);
    }

    // 查找是否已有该日期的心情记录
    const existingRecord = moodRecords.find(record => record.date === dateString);
    setSelectedMoodRecord(existingRecord);

    setShowMoodDetailModal(true);
  };

  const handleMoodSave = async (mood: MoodType, emoji: string, note: string, intensity: number) => {
    if (!selectedDate) return;

    try {
      // 保存到本地存储
      await MoodStorage.saveMoodRecord({
        date: selectedDate,
        mood,
        emoji,
        note: note || undefined,
        intensity,
      });

      // 重新加载当前月份的数据
      await loadMoodRecords();

      setShowMoodDetailModal(false);
      onMoodSelect?.(selectedDate, mood);

      Alert.alert('心情记录成功', `${emoji} 已记录您的心情！`);
    } catch (error) {
      console.error('保存心情记录失败:', error);
      Alert.alert('错误', '保存心情记录失败，请重试');
    }
  };

  const handleMoodCancel = () => {
    setShowMoodDetailModal(false);
    setSelectedDate('');
    setSelectedMoodRecord(undefined);
  };

  const handleCoupleMoodPress = (date: string, isMyMood: boolean) => {
    if (isMyMood) {
      // 点击我的心情，打开编辑
      handleDayPress(date);
    } else {
      // 点击伙伴心情，显示详情
      setSelectedDateForCouple(date);
      Alert.alert('伙伴心情', '查看伙伴的心情详情');
    }
  };

  // 月份切换函数
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 年份切换函数
  const goToPreviousYear = () => {
    setCurrentDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  };

  const goToNextYear = () => {
    setCurrentDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 快速日期选择
  const handleDatePickerConfirm = (year: number, month: number) => {
    setCurrentDate(new Date(year, month, 1));
    setShowDatePicker(false);
  };

  // 生成当前月份的日期
  const generateCalendarDays = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // 添加空白天数（月初）
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // 添加月份中的天数
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        isToday: dateString === today.toISOString().split('T')[0],
      });
    }

    return days;
  };

  const getTodayMood = () => {
    const today = new Date().toISOString().split('T')[0];
    return moodRecords.find(record => record.date === today);
  };

  // 格式化月份显示
  const formatMonthYear = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return `${year}年${month}月`;
  };

  // 检查是否是当前月份
  const isCurrentMonth = () => {
    const today = new Date();
    return currentDate.getFullYear() === today.getFullYear() &&
           currentDate.getMonth() === today.getMonth();
  };

  // 获取当前月份的节日
  const currentMonthHolidays = getHolidaysByMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const todayMood = getTodayMood();
  const calendarDays = generateCalendarDays();

  return (
    <ScrollView style={styles.container}>

      {/* 简单日历组件 */}
      <Card style={styles.calendarCard}>
        {/* 日历头部 */}
        <View style={styles.calendarHeaderTop}>
          <Text style={styles.calendarMainTitle}>💕 心情日历</Text>
        </View>

        {/* 年份导航 */}
        <View style={styles.yearNavigationContainer}>
          <TouchableOpacity style={styles.navButton} onPress={goToPreviousYear}>
            <Text style={styles.navButtonText}>‹‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.yearTitle}>
              📅 {currentDate.getFullYear()}年
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={goToNextYear}>
            <Text style={styles.navButtonText}>››</Text>
          </TouchableOpacity>
        </View>

        {/* 月份导航 */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.monthYearContainer}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.calendarTitle}>🗓️ {currentDate.getMonth() + 1}月</Text>
            </TouchableOpacity>
            {!isCurrentMonth() && (
              <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
                <Text style={styles.todayButtonText}>回到今天</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 星期标题 */}
        <View style={styles.weekHeader}>
          {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
            <Text key={index} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        {/* 日历网格 */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return <View key={index} style={styles.emptyDay} />;
            }

            const moodRecord = moodRecords.find(record => record.date === dayData.dateString);
            const moodOption = moodRecord ? moodOptions.find(option => option.type === moodRecord.mood) : null;
            const holiday = getHolidayByDate(dayData.dateString);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  dayData.isToday && styles.todayDay,
                  selectedDate === dayData.dateString && styles.selectedDay,
                  moodOption && { backgroundColor: moodOption.color },
                  holiday && styles.holidayDay
                ]}
                onPress={() => handleDayPress(dayData.dateString)}
              >
                <Text style={[
                  styles.dayText,
                  dayData.isToday && styles.todayText,
                  selectedDate === dayData.dateString && styles.selectedText,
                  moodOption && styles.moodDayText
                ]}>
                  {dayData.day}
                </Text>
                {moodRecord && (
                  <Text style={styles.moodEmoji}>{moodRecord.emoji}</Text>
                )}
                {holiday && !moodRecord && (
                  <Text style={styles.holidayEmoji}>{holiday.emoji}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* 情侣心情展示 */}
      {coupleConnected && selectedDateForCouple && (
        <CoupleMoodDisplay
          date={selectedDateForCouple}
          onMoodPress={handleCoupleMoodPress}
        />
      )}

      {/* 心情详情模态框 */}
      <MoodDetailModal
        visible={showMoodDetailModal}
        date={selectedDate}
        existingMood={selectedMoodRecord}
        onSave={handleMoodSave}
        onCancel={handleMoodCancel}
      />

      {/* 本月节日 */}
      {currentMonthHolidays.length > 0 && (
        <Card style={styles.holidaysCard}>
          <Text style={styles.holidaysTitle}>🎉 本月节日</Text>
          <View style={styles.holidaysList}>
            {currentMonthHolidays.map((holiday, index) => (
              <View key={index} style={styles.holidayItem}>
                <Text style={styles.holidayEmoji}>{holiday.emoji}</Text>
                <View style={styles.holidayInfo}>
                  <Text style={styles.holidayName}>{holiday.name}</Text>
                  <Text style={styles.holidayDate}>
                    {holiday.date.split('-')[2]}日
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 心情统计 */}
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>📊 本月心情统计</Text>
          {onAnalyticsPress && (
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={onAnalyticsPress}
            >
              <Text style={styles.analyticsButtonText}>详细分析 ›</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statsContainer}>
          {moodOptions.map((option) => {
            const count = moodRecords.filter(record => record.mood === option.type).length;
            return (
              <View key={option.type} style={styles.statItem}>
                <Text style={styles.statEmoji}>{option.emoji}</Text>
                <Text style={styles.statCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 快速日期选择器 */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>选择年月</Text>

            <View style={styles.pickerRow}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>年份</Text>
                <ScrollView style={styles.yearPicker} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 10}, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.pickerItem,
                          year === currentDate.getFullYear() && styles.selectedPickerItem
                        ]}
                        onPress={() => handleDatePickerConfirm(year, currentDate.getMonth())}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          year === currentDate.getFullYear() && styles.selectedPickerItemText
                        ]}>
                          {year}年
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>月份</Text>
                <ScrollView style={styles.monthPicker} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 12}, (_, i) => {
                    const month = i;
                    return (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.pickerItem,
                          month === currentDate.getMonth() && styles.selectedPickerItem
                        ]}
                        onPress={() => handleDatePickerConfirm(currentDate.getFullYear(), month)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          month === currentDate.getMonth() && styles.selectedPickerItemText
                        ]}>
                          {month + 1}月
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // 日历头部样式
  calendarHeaderTop: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  calendarMainTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  calendarCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },

  navButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },

  calendarTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },

  todayButton: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },

  todayButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingVertical: Spacing.xs,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  emptyDay: {
    width: '14.28%',
    height: 40,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    marginVertical: 1,
    backgroundColor: Colors.surface,
  },
  todayDay: {
    backgroundColor: Colors.primaryLight,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  todayText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  selectedText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  moodDayText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  moodEmoji: {
    fontSize: 12,
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  holidayDay: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  holidayEmoji: {
    fontSize: 10,
    position: 'absolute',
    top: 2,
    right: 2,
  },



  holidaysCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  holidaysTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  holidaysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  holidayItem: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minWidth: '30%',
  },
  holidayInfo: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  holidayName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  holidayDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  statsCard: {
    margin: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  analyticsButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
  },
  analyticsButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statCount: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },

  // 年份导航样式
  yearNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  yearButton: {
    flex: 1,
    alignItems: 'center',
  },
  yearTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
  },
  monthButton: {
    alignItems: 'center',
  },

  // 日期选择器样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    width: '80%',
    maxHeight: '70%',
  },
  datePickerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  pickerContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  pickerLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  yearPicker: {
    maxHeight: 200,
  },
  monthPicker: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: 2,
  },
  selectedPickerItem: {
    backgroundColor: Colors.primary,
  },
  pickerItemText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedPickerItemText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  datePickerCancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
  },
  datePickerConfirmButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  datePickerCancelText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  datePickerConfirmText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
});
