import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

export interface CurveChartData {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface CurveChartProps {
  data: CurveChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
}

export const CurveChart: React.FC<CurveChartProps> = ({
  data,
  title,
  height = 350,
  showLegend = true,
}) => {
  const chartWidth = screenWidth - 40;
  const chartHeight = height - 120;
  const plotWidth = chartWidth - 60;
  const plotHeight = chartHeight - 60;

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
  const valueRange = maxValue - minValue;

  // 生成曲线点
  const generateCurvePoints = (values: number[]) => {
    return values.map((value, index) => {
      const x = 30 + (index / (data.length - 1)) * plotWidth;
      const y = 30 + ((maxValue - value) / valueRange) * plotHeight;
      return { x, y, value };
    });
  };

  const incomePoints = generateCurvePoints(data.map(d => d.income));
  const expensePoints = generateCurvePoints(data.map(d => d.expense));
  const netPoints = generateCurvePoints(data.map(d => d.net));

  // 渲染曲线（使用连接的线段模拟）
  const renderCurve = (points: Array<{x: number, y: number, value: number}>, color: string) => {
    const lines = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      // 计算线段的角度和长度
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      lines.push(
        <View
          key={`line-${i}`}
          style={[
            styles.curveLine,
            {
              left: start.x,
              top: start.y,
              width: length,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            }
          ]}
        />
      );
    }
    
    // 添加数据点
    const dots = points.map((point, index) => (
      <View
        key={`dot-${index}`}
        style={[
          styles.curvePoint,
          {
            left: point.x - 3,
            top: point.y - 3,
            backgroundColor: color,
          }
        ]}
      />
    ));
    
    return [...lines, ...dots];
  };

  // 生成Y轴标签
  const renderYAxisLabels = () => {
    const labels = [];
    const labelCount = 5;
    
    for (let i = 0; i <= labelCount; i++) {
      const value = maxValue - (i / labelCount) * valueRange;
      const y = 30 + (i / labelCount) * plotHeight;
      const displayValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
      
      labels.push(
        <Text
          key={`y-${i}`}
          style={[
            styles.yAxisLabel,
            { top: y - 8 }
          ]}
        >
          {displayValue}
        </Text>
      );
    }
    
    return labels;
  };

  // 生成X轴标签
  const renderXAxisLabels = () => {
    const labels: React.ReactNode[] = [];
    const maxLabels = data.length <= 12 ? data.length : 6;
    const step = data.length <= 12 ? 1 : Math.ceil(data.length / maxLabels);
    
    data.forEach((item, index) => {
      if (index % step === 0 || index === data.length - 1) {
        const x = 30 + (index / (data.length - 1)) * plotWidth;
        labels.push(
          <Text
            key={`x-${index}`}
            style={[
              styles.xAxisLabel,
              { left: x - 20, top: plotHeight + 40 }
            ]}
          >
            {item.label}
          </Text>
        );
      }
    });
    
    return labels;
  };

  // 生成网格线
  const renderGridLines = () => {
    const lines = [];
    const gridCount = 5;
    
    // 水平网格线
    for (let i = 0; i <= gridCount; i++) {
      const y = 30 + (i / gridCount) * plotHeight;
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              left: 30,
              top: y,
              width: plotWidth,
              height: 1,
            }
          ]}
        />
      );
    }
    
    return lines;
  };

  // 计算统计数据
  const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={[styles.chartContainer, { height: chartHeight }]}>
        {/* 网格线 */}
        {renderGridLines()}
        
        {/* Y轴标签 */}
        {renderYAxisLabels()}
        
        {/* X轴标签 */}
        {renderXAxisLabels()}
        
        {/* 曲线 */}
        <View style={styles.curveContainer}>
          {renderCurve(incomePoints, Colors.success)}
          {renderCurve(expensePoints, Colors.error)}
          {renderCurve(netPoints, Colors.primary)}
        </View>
      </View>

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
    position: 'relative',
    marginBottom: Spacing.md,
  },
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  curveLine: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  curvePoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    width: 25,
    textAlign: 'right',
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    width: 40,
    textAlign: 'center',
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
