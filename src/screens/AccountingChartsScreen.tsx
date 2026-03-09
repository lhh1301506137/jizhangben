import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from '../components/common/Card';
import { CurveChart, CurveChartData } from '../components/charts/CurveChart';
import { AccountingService } from '../services/AccountingService';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/Colors';

interface AccountingChartsScreenProps {
  onBack?: () => void;
}

export const AccountingChartsScreen: React.FC<AccountingChartsScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'yearly' | 'multi_year'>('yearly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState<CurveChartData[]>([]);
  const [multiYearData, setMultiYearData] = useState<CurveChartData[]>([]);

  useEffect(() => {
    loadChartData();
  }, [selectedYear, viewMode]);

  const loadChartData = async () => {
    try {
      setLoading(true);

      if (viewMode === 'yearly') {
        const data = await AccountingService.getYearlyMonthlyStats(selectedYear);
        setYearlyData(data);
      } else {
        const data = await AccountingService.getMultiYearStats();
        setMultiYearData(data);
      }
    } catch (error) {
      console.error('加载图表数据失败:', error);
      Alert.alert('错误', '加载图表数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? selectedYear - 1 : selectedYear + 1;
    if (newYear >= 2020 && newYear <= 2030) {
      setSelectedYear(newYear);
    }
  };



  const getCurrentData = () => {
    return viewMode === 'yearly' ? yearlyData : multiYearData;
  };

  const getChartTitle = () => {
    if (viewMode === 'yearly') {
      return `${selectedYear}年各月收支趋势`;
    } else {
      return `近5年收支趋势`;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 收支趋势</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 视图模式切换 */}
      <Card style={styles.modeCard}>
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              viewMode === 'yearly' && styles.modeButtonActive
            ]}
            onPress={() => setViewMode('yearly')}
          >
            <Text style={[
              styles.modeButtonText,
              viewMode === 'yearly' && styles.modeButtonTextActive
            ]}>
              年度分析
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              viewMode === 'multi_year' && styles.modeButtonActive
            ]}
            onPress={() => setViewMode('multi_year')}
          >
            <Text style={[
              styles.modeButtonText,
              viewMode === 'multi_year' && styles.modeButtonTextActive
            ]}>
              近5年分析
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 时间导航（仅年度分析显示） */}
      {viewMode === 'yearly' && (
        <Card style={styles.navigationCard}>
          <View style={styles.navigationRow}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => handleYearChange('prev')}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}年</Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => handleYearChange('next')}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* 图表显示 */}
      {loading ? (
        <Card style={styles.loadingCard}>
          <Text style={styles.loadingText}>加载中...</Text>
        </Card>
      ) : (
        <CurveChart
          data={getCurrentData()}
          title={getChartTitle()}
          height={400}
          showLegend={true}
        />
      )}


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 60,
  },
  modeCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: Colors.surface,
    fontWeight: '600',
  },
  navigationCard: {
    margin: Spacing.md,
    marginTop: 0,
    marginBottom: Spacing.sm,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: FontSizes.xl,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },

  loadingCard: {
    margin: Spacing.md,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },

});
