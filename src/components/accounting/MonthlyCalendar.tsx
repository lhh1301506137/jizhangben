import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { AccountingService, MonthlyStats, DailyStats } from '../../services/AccountingService';

interface MonthlyCalendarProps {
  year: number;
  month: number;
  onDayPress: (dayStats: DailyStats) => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  year,
  month,
  onDayPress,
}) => {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyData();
  }, [year, month]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const stats = await AccountingService.getMonthlyStats(year, month);
      setMonthlyStats(stats);
    } catch (error) {
      console.error('加载月度数据失败:', error);
      Alert.alert('错误', '加载月度数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number): number => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendarGrid = () => {
    if (!monthlyStats) return null;

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfWeek(year, month);
    const days = [];

    // 添加空白天数
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.emptyDay} />
      );
    }

    // 添加月份中的每一天
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayStats = monthlyStats.dailyStats.find(stats => stats.date === dateString);
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            dayStats && dayStats.recordCount > 0 && styles.dayWithRecords,
          ]}
          onPress={() => {
            if (dayStats && dayStats.recordCount > 0) {
              onDayPress(dayStats);
            }
          }}
        >
          <Text style={[
            styles.dayNumber,
            dayStats && dayStats.recordCount > 0 && styles.dayNumberWithRecords,
          ]}>
            {day}
          </Text>
          {dayStats && dayStats.recordCount > 0 && (
            <View style={styles.dayStatsContainer}>
              {dayStats.totalIncome > 0 && (
                <Text style={styles.incomeText}>+{formatAmount(dayStats.totalIncome)}</Text>
              )}
              {dayStats.totalExpense > 0 && (
                <Text style={styles.expenseText}>-{formatAmount(dayStats.totalExpense)}</Text>
              )}
              <Text style={styles.recordCount}>{dayStats.recordCount}条</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 月度统计概览 */}
      <View style={styles.monthSummary}>
        <Text style={styles.monthTitle}>{year}年{month}月</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>收入</Text>
            <Text style={[styles.summaryValue, styles.incomeValue]}>
              ¥{formatAmount(monthlyStats?.totalIncome || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>支出</Text>
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              ¥{formatAmount(monthlyStats?.totalExpense || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>净收入</Text>
            <Text style={[
              styles.summaryValue,
              (monthlyStats?.netIncome || 0) >= 0 ? styles.incomeValue : styles.expenseValue
            ]}>
              ¥{formatAmount(monthlyStats?.netIncome || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* 星期标题 */}
      <View style={styles.weekHeader}>
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      {/* 日历网格 */}
      <View style={styles.calendarGrid}>
        {renderCalendarGrid()}
      </View>

      {/* 提示信息 */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>💡 点击有记录的日期查看详情</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  monthSummary: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  monthTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  incomeValue: {
    color: '#4CAF50',
  },
  expenseValue: {
    color: '#F44336',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    margin: 1,
  },
  dayWithRecords: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayNumber: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNumberWithRecords: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dayStatsContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  incomeText: {
    fontSize: 8,
    color: '#4CAF50',
    fontWeight: '500',
  },
  expenseText: {
    fontSize: 8,
    color: '#F44336',
    fontWeight: '500',
  },
  recordCount: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  hintContainer: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
