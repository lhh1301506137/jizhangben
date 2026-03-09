import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

export interface SimpleLineChartData {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface SimpleLineChartProps {
  data: SimpleLineChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
}) => {
  const chartWidth = screenWidth - 40;
  const chartHeight = height - 120;

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>暂无数据</Text>
        </View>
      </View>
    );
  }

  // 计算数据范围
  const allValues = data.flatMap(d => [d.income, d.expense, Math.abs(d.net)]);
  const maxValue = Math.max(...allValues, 100);
  const minValue = Math.min(...data.map(d => d.net), 0);

  // 生成简单的柱状图表示
  const renderSimpleChart = () => {
    const barWidth = Math.max((chartWidth - 40) / data.length - 4, 20);
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {data.map((item, index) => {
            const incomeHeight = Math.max((item.income / maxValue) * chartHeight * 0.8, 2);
            const expenseHeight = Math.max((item.expense / maxValue) * chartHeight * 0.8, 2);
            const netHeight = Math.max((Math.abs(item.net) / maxValue) * chartHeight * 0.8, 2);
            
            return (
              <View key={index} style={styles.barGroup}>
                {/* 收入柱 */}
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: incomeHeight, 
                        backgroundColor: Colors.success,
                        width: barWidth / 3 - 1
                      }
                    ]} 
                  />
                  <Text style={styles.barValue}>
                    {item.income > 0 ? item.income.toFixed(0) : ''}
                  </Text>
                </View>
                
                {/* 支出柱 */}
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: expenseHeight, 
                        backgroundColor: Colors.error,
                        width: barWidth / 3 - 1
                      }
                    ]} 
                  />
                  <Text style={styles.barValue}>
                    {item.expense > 0 ? item.expense.toFixed(0) : ''}
                  </Text>
                </View>
                
                {/* 净收入柱 */}
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: netHeight, 
                        backgroundColor: item.net >= 0 ? Colors.primary : Colors.warning,
                        width: barWidth / 3 - 1
                      }
                    ]} 
                  />
                  <Text style={styles.barValue}>
                    {item.net !== 0 ? item.net.toFixed(0) : ''}
                  </Text>
                </View>
                
                {/* X轴标签 */}
                <Text style={styles.xAxisLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // 计算统计数据
  const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {renderSimpleChart()}

      {/* 图例 */}
      {showLegend && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>收入</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.error }]} />
            <Text style={styles.legendText}>支出</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>净收入</Text>
          </View>
        </View>
      )}

      {/* 统计摘要 */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>总收入</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            ¥{totalIncome.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>总支出</Text>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>
            ¥{totalExpense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>净收入</Text>
          <Text style={[styles.summaryValue, { color: totalNet >= 0 ? Colors.primary : Colors.warning }]}>
            ¥{totalNet.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 200,
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 80,
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 1,
  },
  bar: {
    minHeight: 2,
    borderRadius: 2,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 8,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  xAxisLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
    width: '100%',
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.xs,
  },
  legendText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
});
