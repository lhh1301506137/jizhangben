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
import { AccountingService, YearlyStats, MonthlyStats } from '../../services/AccountingService';

interface YearlyOverviewProps {
  year: number;
  onMonthPress: (year: number, month: number) => void;
}

export const YearlyOverview: React.FC<YearlyOverviewProps> = ({
  year,
  onMonthPress,
}) => {
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadYearlyData();
  }, [year]);

  const loadYearlyData = async () => {
    try {
      setLoading(true);
      const stats = await AccountingService.getYearlyStats(year);
      setYearlyStats(stats);
    } catch (error) {
      console.error('加载年度数据失败:', error);
      Alert.alert('错误', '加载年度数据失败');
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

  const getMonthName = (month: number): string => {
    return `${month}月`;
  };

  const renderMonthGrid = () => {
    if (!yearlyStats) return null;

    return yearlyStats.monthlyStats.map((monthStats: MonthlyStats) => (
      <TouchableOpacity
        key={monthStats.month}
        style={[
          styles.monthCell,
          monthStats.recordCount > 0 && styles.monthWithRecords,
        ]}
        onPress={() => {
          if (monthStats.recordCount > 0) {
            onMonthPress(year, monthStats.month);
          }
        }}
      >
        <Text style={[
          styles.monthName,
          monthStats.recordCount > 0 && styles.monthNameWithRecords,
        ]}>
          {getMonthName(monthStats.month)}
        </Text>
        
        {monthStats.recordCount > 0 ? (
          <View style={styles.monthStatsContainer}>
            {monthStats.totalIncome > 0 && (
              <Text style={styles.incomeText}>
                收入 ¥{formatAmount(monthStats.totalIncome)}
              </Text>
            )}
            {monthStats.totalExpense > 0 && (
              <Text style={styles.expenseText}>
                支出 ¥{formatAmount(monthStats.totalExpense)}
              </Text>
            )}
            <Text style={[
              styles.netIncomeText,
              monthStats.netIncome >= 0 ? styles.positiveNet : styles.negativeNet
            ]}>
              净收入 ¥{formatAmount(monthStats.netIncome)}
            </Text>
            <Text style={styles.recordCount}>
              {monthStats.recordCount}条记录
            </Text>
          </View>
        ) : (
          <Text style={styles.noRecordsText}>暂无记录</Text>
        )}
      </TouchableOpacity>
    ));
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
      {/* 年度统计概览 */}
      <View style={styles.yearSummary}>
        <Text style={styles.yearTitle}>{year}年度总览</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总收入</Text>
            <Text style={[styles.summaryValue, styles.incomeValue]}>
              ¥{formatAmount(yearlyStats?.totalIncome || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总支出</Text>
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              ¥{formatAmount(yearlyStats?.totalExpense || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>净收入</Text>
            <Text style={[
              styles.summaryValue,
              (yearlyStats?.netIncome || 0) >= 0 ? styles.incomeValue : styles.expenseValue
            ]}>
              ¥{formatAmount(yearlyStats?.netIncome || 0)}
            </Text>
          </View>
        </View>
        <Text style={styles.totalRecords}>
          全年共 {yearlyStats?.recordCount || 0} 条记录
        </Text>
      </View>

      {/* 月份网格 */}
      <View style={styles.monthsContainer}>
        <Text style={styles.monthsTitle}>月度详情</Text>
        <View style={styles.monthGrid}>
          {renderMonthGrid()}
        </View>
      </View>

      {/* 提示信息 */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>💡 点击有记录的月份查看详细日历</Text>
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
  yearSummary: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  yearTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
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
  totalRecords: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  monthsContainer: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  monthsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '48%',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthWithRecords: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '40',
  },
  monthName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  monthNameWithRecords: {
    color: Colors.primary,
  },
  monthStatsContainer: {
    alignItems: 'center',
  },
  incomeText: {
    fontSize: FontSizes.sm,
    color: '#4CAF50',
    marginBottom: 2,
  },
  expenseText: {
    fontSize: FontSizes.sm,
    color: '#F44336',
    marginBottom: 2,
  },
  netIncomeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  positiveNet: {
    color: '#4CAF50',
  },
  negativeNet: {
    color: '#F44336',
  },
  recordCount: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  noRecordsText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
