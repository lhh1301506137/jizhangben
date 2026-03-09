import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
// import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { MoodStorage } from '../../services/MoodStorage';

const screenWidth = Dimensions.get('window').width;

interface MoodAnalyticsProps {
  currentDate: Date;
}

interface MoodStats {
  total: number;
  byMood: Record<string, number>;
  byMonth: Record<string, number>;
  averageIntensity: number;
}

const moodColors = {
  happy: '#FFD700',
  excited: '#FF69B4',
  neutral: '#DDA0DD',
  sad: '#87CEEB',
  angry: '#FF6347',
};

const moodLabels = {
  happy: '开心',
  excited: '兴奋',
  neutral: '平淡',
  sad: '难过',
  angry: '生气',
};

const moodEmojis = {
  happy: '😊',
  excited: '🥳',
  neutral: '😐',
  sad: '😢',
  angry: '😠',
};

export const MoodAnalytics: React.FC<MoodAnalyticsProps> = ({ currentDate }) => {
  const [monthlyStats, setMonthlyStats] = useState<MoodStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<MoodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [currentDate, viewMode]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'month') {
        const stats = await MoodStorage.getMoodStatistics(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );
        setMonthlyStats(stats);
      } else {
        const stats = await MoodStorage.getMoodStatistics(currentDate.getFullYear());
        setYearlyStats(stats);
      }
    } catch (error) {
      console.error('加载分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPieChartData = (stats: MoodStats) => {
    return Object.entries(stats.byMood).map(([mood, count]) => ({
      name: moodLabels[mood as keyof typeof moodLabels] || mood,
      population: count,
      color: moodColors[mood as keyof typeof moodColors] || '#999',
      legendFontColor: Colors.text,
      legendFontSize: 12,
    }));
  };

  const getLineChartData = (stats: MoodStats) => {
    const months = Object.keys(stats.byMonth).sort();
    const data = months.map(month => stats.byMonth[month]);
    
    return {
      labels: months.map(month => month.split('-')[1] + '月'),
      datasets: [{
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const getBarChartData = (stats: MoodStats) => {
    const moodTypes = Object.keys(stats.byMood);
    const data = moodTypes.map(mood => stats.byMood[mood]);
    
    return {
      labels: moodTypes.map(mood => moodEmojis[mood as keyof typeof moodEmojis] || mood),
      datasets: [{
        data: data.length > 0 ? data : [0],
      }],
    };
  };

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: BorderRadius.md,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  const currentStats = viewMode === 'month' ? monthlyStats : yearlyStats;

  if (loading || !currentStats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 视图切换 */}
      <Card style={styles.switchCard}>
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[styles.switchButton, viewMode === 'month' && styles.activeSwitchButton]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.switchText, viewMode === 'month' && styles.activeSwitchText]}>
              本月分析
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchButton, viewMode === 'year' && styles.activeSwitchButton]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[styles.switchText, viewMode === 'year' && styles.activeSwitchText]}>
              年度分析
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 总体统计 */}
      <Card style={styles.statsCard}>
        <Text style={styles.cardTitle}>📊 总体统计</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentStats.total}</Text>
            <Text style={styles.statLabel}>记录天数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentStats.averageIntensity.toFixed(1)}</Text>
            <Text style={styles.statLabel}>平均强度</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Object.keys(currentStats.byMood).length}
            </Text>
            <Text style={styles.statLabel}>心情类型</Text>
          </View>
        </View>
      </Card>

      {/* 图表功能暂时禁用，等待图表库修复 */}
      <Card style={styles.chartCard}>
        <Text style={styles.cardTitle}>📊 图表功能</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>📈</Text>
          <Text style={styles.chartPlaceholderTitle}>图表功能开发中</Text>
          <Text style={styles.chartPlaceholderSubtitle}>
            即将支持饼图、柱状图和趋势图
          </Text>
        </View>
      </Card>

      {/* 心情详细列表 */}
      <Card style={styles.detailCard}>
        <Text style={styles.cardTitle}>💝 心情详情</Text>
        {Object.entries(currentStats.byMood).map(([mood, count]) => (
          <View key={mood} style={styles.moodDetailItem}>
            <View style={styles.moodDetailLeft}>
              <Text style={styles.moodDetailEmoji}>
                {moodEmojis[mood as keyof typeof moodEmojis]}
              </Text>
              <Text style={styles.moodDetailLabel}>
                {moodLabels[mood as keyof typeof moodLabels]}
              </Text>
            </View>
            <View style={styles.moodDetailRight}>
              <Text style={styles.moodDetailCount}>{count}天</Text>
              <Text style={styles.moodDetailPercent}>
                {((count / currentStats.total) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {currentStats.total === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>📝</Text>
          <Text style={styles.emptyTitle}>暂无数据</Text>
          <Text style={styles.emptySubtitle}>
            开始记录您的心情，查看分析报告吧！
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  switchCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeSwitchButton: {
    backgroundColor: Colors.primary,
  },
  switchText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  activeSwitchText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  statsCard: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  chartCard: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  detailCard: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
  },
  moodDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  moodDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodDetailEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  moodDetailLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  moodDetailRight: {
    alignItems: 'flex-end',
  },
  moodDetailCount: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  moodDetailPercent: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyCard: {
    margin: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  chartPlaceholderText: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  chartPlaceholderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  chartPlaceholderSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
