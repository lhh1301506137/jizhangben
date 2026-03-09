import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { ChartData, ChartDataPoint } from '../../services/AccountingService';

interface SimpleChartProps {
  data: ChartData;
  type: 'line' | 'bar';
  title: string;
  height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  type,
  title,
  height = 200,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - Spacing.md * 4;
  const chartHeight = height;

  const formatAmount = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  };

  const renderBarChart = () => {
    if (data.points.length === 0) return null;

    const maxValue = Math.max(data.maxValue, 1);
    const barWidth = Math.max((chartWidth - Spacing.md * 2) / data.points.length - 8, 20);

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <View style={[styles.chartArea, { height: chartHeight, width: Math.max(chartWidth, data.points.length * (barWidth + 8)) }]}>
            {/* Y轴标签 */}
            <View style={styles.yAxisLabels}>
              {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
                <Text key={ratio} style={styles.yAxisLabel}>
                  {formatAmount(maxValue * ratio)}
                </Text>
              ))}
            </View>

            {/* 图表内容 */}
            <View style={styles.chartContent}>
              {/* 网格线 */}
              {[0.25, 0.5, 0.75, 1].map(ratio => (
                <View
                  key={ratio}
                  style={[
                    styles.gridLine,
                    { bottom: `${ratio * 100}%` }
                  ]}
                />
              ))}

              {/* 柱状图 */}
              <View style={styles.barsContainer}>
                {data.points.map((point, index) => {
                  const incomeHeight = (point.income / maxValue) * chartHeight;
                  const expenseHeight = (point.expense / maxValue) * chartHeight;

                  return (
                    <View key={index} style={[styles.barGroup, { width: barWidth }]}>
                      {/* 收入柱 */}
                      <View
                        style={[
                          styles.bar,
                          styles.incomeBar,
                          { height: incomeHeight, width: barWidth / 2 - 2 }
                        ]}
                      />
                      {/* 支出柱 */}
                      <View
                        style={[
                          styles.bar,
                          styles.expenseBar,
                          { height: expenseHeight, width: barWidth / 2 - 2 }
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* X轴标签 */}
          <View style={styles.xAxisLabels}>
            {data.points.map((point, index) => (
              <Text key={index} style={[styles.xAxisLabel, { width: barWidth }]}>
                {point.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderLineChart = () => {
    if (data.points.length === 0) return null;

    const maxValue = Math.max(data.maxValue, Math.abs(data.minValue), 1);
    const minValue = data.minValue < 0 ? -maxValue : 0;
    const range = maxValue - minValue;
    const pointWidth = Math.max((chartWidth - Spacing.md * 2) / (data.points.length - 1 || 1), 30);

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <View style={[styles.chartArea, { height: chartHeight, width: Math.max(chartWidth, data.points.length * pointWidth) }]}>
            {/* Y轴标签 */}
            <View style={styles.yAxisLabels}>
              {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
                <Text key={ratio} style={styles.yAxisLabel}>
                  {formatAmount(maxValue - ratio * range)}
                </Text>
              ))}
            </View>

            {/* 图表内容 */}
            <View style={styles.chartContent}>
              {/* 网格线 */}
              {[0.25, 0.5, 0.75, 1].map(ratio => (
                <View
                  key={ratio}
                  style={[
                    styles.gridLine,
                    { bottom: `${ratio * 100}%` }
                  ]}
                />
              ))}

              {/* 零线 */}
              {data.minValue < 0 && (
                <View
                  style={[
                    styles.zeroLine,
                    { bottom: `${(maxValue / range) * 100}%` }
                  ]}
                />
              )}

              {/* 折线图 */}
              <View style={styles.linesContainer}>
                {data.points.map((point, index) => {
                  const incomeY = ((maxValue - point.income) / range) * chartHeight;
                  const expenseY = ((maxValue - point.expense) / range) * chartHeight;
                  const netY = ((maxValue - point.net) / range) * chartHeight;
                  const x = index * pointWidth;

                  return (
                    <View key={index}>
                      {/* 收入点 */}
                      <View
                        style={[
                          styles.linePoint,
                          styles.incomePoint,
                          { left: x, top: incomeY }
                        ]}
                      />
                      {/* 支出点 */}
                      <View
                        style={[
                          styles.linePoint,
                          styles.expensePoint,
                          { left: x, top: expenseY }
                        ]}
                      />
                      {/* 净收入点 */}
                      <View
                        style={[
                          styles.linePoint,
                          styles.netPoint,
                          { left: x, top: netY }
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* X轴标签 */}
          <View style={styles.xAxisLabels}>
            {data.points.map((point, index) => (
              <Text key={index} style={[styles.xAxisLabel, { width: pointWidth }]}>
                {point.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {/* 图例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.incomeColor]} />
          <Text style={styles.legendText}>收入</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.expenseColor]} />
          <Text style={styles.legendText}>支出</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.netColor]} />
          <Text style={styles.legendText}>净收入</Text>
        </View>
      </View>

      {data.points.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      ) : (
        type === 'bar' ? renderBarChart() : renderLineChart()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.xs,
  },
  incomeColor: {
    backgroundColor: '#4CAF50',
  },
  expenseColor: {
    backgroundColor: '#F44336',
  },
  netColor: {
    backgroundColor: '#2196F3',
  },
  legendText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  chartContainer: {
    paddingHorizontal: Spacing.md,
  },
  chartArea: {
    flexDirection: 'row',
    position: 'relative',
  },
  yAxisLabels: {
    width: 50,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  yAxisLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    marginLeft: Spacing.sm,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.textSecondary,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 5,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 2,
  },
  bar: {
    marginHorizontal: 1,
    borderRadius: 2,
  },
  incomeBar: {
    backgroundColor: '#4CAF50',
  },
  expenseBar: {
    backgroundColor: '#F44336',
  },
  linesContainer: {
    position: 'relative',
    height: '100%',
  },
  linePoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
  },
  incomePoint: {
    backgroundColor: '#4CAF50',
  },
  expensePoint: {
    backgroundColor: '#F44336',
  },
  netPoint: {
    backgroundColor: '#2196F3',
  },
  xAxisLabels: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    marginLeft: 50 + Spacing.sm,
  },
  xAxisLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
