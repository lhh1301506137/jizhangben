import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

export interface LineChartData {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface LineChartProps {
  data: LineChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
  showGrid = true,
}) => {
  const chartWidth = screenWidth - 40; // 减去左右边距
  const chartHeight = height - 80; // 减去标题和图例空间
  const padding = 40;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

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
  const maxValue = Math.max(...allValues, 100); // 最小值100，避免图表太小
  const minValue = Math.min(...data.map(d => d.net), 0);
  const valueRange = maxValue - minValue;

  // 生成路径数据
  const generatePath = (values: number[], color: string) => {
    if (values.length === 0) return '';

    const points = values.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * plotWidth;
      const y = padding + ((maxValue - value) / valueRange) * plotHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // 生成网格线
  const generateGridLines = () => {
    const lines = [];
    const gridCount = 5;

    // 水平网格线
    for (let i = 0; i <= gridCount; i++) {
      const y = padding + (i / gridCount) * plotHeight;
      lines.push(
        <Line
          key={`h-${i}`}
          x1={padding}
          y1={y}
          x2={padding + plotWidth}
          y2={y}
          stroke={Colors.border}
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }

    // 垂直网格线
    const verticalCount = Math.min(data.length - 1, 6);
    for (let i = 0; i <= verticalCount; i++) {
      const x = padding + (i / verticalCount) * plotWidth;
      lines.push(
        <Line
          key={`v-${i}`}
          x1={x}
          y1={padding}
          x2={x}
          y2={padding + plotHeight}
          stroke={Colors.border}
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }

    return lines;
  };

  // 生成数据点
  const generateDataPoints = (values: number[], color: string) => {
    return values.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * plotWidth;
      const y = padding + ((maxValue - value) / valueRange) * plotHeight;
      return (
        <Circle
          key={`${color}-${index}`}
          cx={x}
          cy={y}
          r={3}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
        />
      );
    });
  };

  // 生成Y轴标签
  const generateYAxisLabels = () => {
    const labels = [];
    const labelCount = 5;

    for (let i = 0; i <= labelCount; i++) {
      const value = maxValue - (i / labelCount) * valueRange;
      const y = padding + (i / labelCount) * plotHeight;
      const displayValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);

      labels.push(
        <SvgText
          key={`y-${i}`}
          x={padding - 10}
          y={y + 4}
          fontSize={10}
          fill={Colors.textSecondary}
          textAnchor="end"
        >
          {displayValue}
        </SvgText>
      );
    }

    return labels;
  };

  // 生成X轴标签
  const generateXAxisLabels = () => {
    const labels: React.ReactNode[] = [];
    const maxLabels = 6;
    const step = Math.ceil(data.length / maxLabels);

    data.forEach((item, index) => {
      if (index % step === 0 || index === data.length - 1) {
        const x = padding + (index / (data.length - 1)) * plotWidth;
        labels.push(
          <SvgText
            key={`x-${index}`}
            x={x}
            y={padding + plotHeight + 20}
            fontSize={10}
            fill={Colors.textSecondary}
            textAnchor="middle"
          >
            {item.label}
          </SvgText>
        );
      }
    });

    return labels;
  };

  const incomeValues = data.map(d => d.income);
  const expenseValues = data.map(d => d.expense);
  const netValues = data.map(d => d.net);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* 网格线 */}
          {showGrid && generateGridLines()}
          
          {/* Y轴标签 */}
          {generateYAxisLabels()}
          
          {/* X轴标签 */}
          {generateXAxisLabels()}
          
          {/* 收入线 */}
          <Path
            d={generatePath(incomeValues, Colors.success)}
            stroke={Colors.success}
            strokeWidth={2}
            fill="none"
          />
          
          {/* 支出线 */}
          <Path
            d={generatePath(expenseValues, Colors.error)}
            stroke={Colors.error}
            strokeWidth={2}
            fill="none"
          />
          
          {/* 净收入线 */}
          <Path
            d={generatePath(netValues, Colors.primary)}
            stroke={Colors.primary}
            strokeWidth={2}
            fill="none"
          />
          
          {/* 数据点 */}
          {generateDataPoints(incomeValues, Colors.success)}
          {generateDataPoints(expenseValues, Colors.error)}
          {generateDataPoints(netValues, Colors.primary)}
        </Svg>
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
});
