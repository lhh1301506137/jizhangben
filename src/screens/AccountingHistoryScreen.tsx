import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/Colors';
import { Card } from '../components/common/Card';
import { AccountingService, DailyStats } from '../services/AccountingService';
import { MonthlyCalendar } from '../components/accounting/MonthlyCalendar';
import { YearlyOverview } from '../components/accounting/YearlyOverview';
import { DayRecordsModal } from '../components/accounting/DayRecordsModal';
import { SimpleChart } from '../components/accounting/SimpleChart';
import { YearMonthPicker } from '../components/accounting/YearMonthPicker';

interface AccountingHistoryScreenProps {
  onNavigateToDate?: (date: string) => void;
}

type ViewMode = 'monthly' | 'yearly' | 'charts';
type ChartType = 'line' | 'bar';

export const AccountingHistoryScreen: React.FC<AccountingHistoryScreenProps> = ({ onNavigateToDate }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [isYearMonthPickerVisible, setIsYearMonthPickerVisible] = useState(false);



  useEffect(() => {
    if (viewMode === 'charts') {
      loadChartData();
    }
  }, [viewMode, chartType, currentYear, currentMonth]);



  const loadChartData = async () => {
    try {
      let data;
      if (viewMode === 'charts') {
        if (chartType === 'line') {
          // 年度数据用折线图
          data = await AccountingService.getYearlyChartData(currentYear);
        } else {
          // 月度数据用柱状图
          data = await AccountingService.getMonthlyChartData(currentYear, currentMonth);
        }
        setChartData(data);
      }
    } catch (error) {
      console.error('加载图表数据失败:', error);
    }
  };

  const handleDayPress = (dayStats: DailyStats) => {
    if (onNavigateToDate) {
      // 跳转到个人记账页面并显示指定日期
      onNavigateToDate(dayStats.date);
    } else {
      // 如果没有回调函数，则显示模态框（兼容性）
      setSelectedDayStats(dayStats);
      setShowDayModal(true);
    }
  };

  const handleMonthPress = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setViewMode('monthly');
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await AccountingService.deleteRecord(recordId);
      setShowDayModal(false);
      Alert.alert('成功', '记录已删除');

      // 重新加载数据
      if (viewMode === 'charts') {
        loadChartData();
      }
    } catch (error) {
      Alert.alert('错误', '删除失败');
    }
  };

  const handleYearMonthConfirm = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[styles.modeButton, viewMode === 'monthly' && styles.activeModeButton]}
        onPress={() => setViewMode('monthly')}
      >
        <Text style={[styles.modeButtonText, viewMode === 'monthly' && styles.activeModeButtonText]}>
          📅 月度日历
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, viewMode === 'yearly' && styles.activeModeButton]}
        onPress={() => setViewMode('yearly')}
      >
        <Text style={[styles.modeButtonText, viewMode === 'yearly' && styles.activeModeButtonText]}>
          📊 年度总览
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, viewMode === 'charts' && styles.activeModeButton]}
        onPress={() => setViewMode('charts')}
      >
        <Text style={[styles.modeButtonText, viewMode === 'charts' && styles.activeModeButtonText]}>
          📈 图形趋势
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderYearSelector = () => (
    <View style={styles.yearSelector}>
      <TouchableOpacity
        style={styles.yearButton}
        onPress={() => {
          setCurrentYear(prev => prev - 1);
        }}
      >
        <Text style={styles.yearButtonText}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsYearMonthPickerVisible(true)}>
        <Text style={styles.yearText}>{currentYear}年</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.yearButton}
        onPress={() => {
          setCurrentYear(prev => prev + 1);
        }}
      >
        <Text style={styles.yearButtonText}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMonthSelector = () => (
    <View style={styles.monthSelector}>
      <TouchableOpacity
        style={styles.monthButton}
        onPress={() => {
          if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(prev => prev - 1);
          } else {
            setCurrentMonth(prev => prev - 1);
          }
        }}
      >
        <Text style={styles.monthButtonText}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsYearMonthPickerVisible(true)}>
        <Text style={styles.monthText}>{currentMonth}月</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.monthButton}
        onPress={() => {
          if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(prev => prev + 1);
          } else {
            setCurrentMonth(prev => prev + 1);
          }
        }}
      >
        <Text style={styles.monthButtonText}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChartTypeSelector = () => (
    <View style={styles.chartTypeSelector}>
      <TouchableOpacity
        style={[styles.chartTypeButton, chartType === 'bar' && styles.activeChartTypeButton]}
        onPress={() => setChartType('bar')}
      >
        <Text style={[styles.chartTypeButtonText, chartType === 'bar' && styles.activeChartTypeButtonText]}>
          📊 柱状图
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, chartType === 'line' && styles.activeChartTypeButton]}
        onPress={() => setChartType('line')}
      >
        <Text style={[styles.chartTypeButtonText, chartType === 'line' && styles.activeChartTypeButtonText]}>
          📈 折线图
        </Text>
      </TouchableOpacity>
    </View>
  );



  return (
    <View style={styles.container}>
      {/* 模式选择器 */}
      <Card style={styles.selectorCard}>
        {renderModeSelector()}
        
        {/* 年份选择器 */}
        {renderYearSelector()}
        
        {/* 月份选择器（仅月度模式显示） */}
        {viewMode === 'monthly' && renderMonthSelector()}
        
        {/* 图表类型选择器（仅图表模式显示） */}
        {viewMode === 'charts' && renderChartTypeSelector()}
      </Card>

      {/* 内容区域 */}
      <View style={styles.contentContainer}>
        {viewMode === 'monthly' && (
          <MonthlyCalendar
            year={currentYear}
            month={currentMonth}
            onDayPress={handleDayPress}
          />
        )}
        
        {viewMode === 'yearly' && (
          <YearlyOverview
            year={currentYear}
            onMonthPress={handleMonthPress}
          />
        )}
        
        {viewMode === 'charts' && chartData && (
          <SimpleChart
            data={chartData}
            type={chartType}
            title={chartType === 'line' ? `${currentYear}年度趋势` : `${currentYear}年${currentMonth}月趋势`}
          />
        )}
      </View>

      {/* 日记录详情模态框 */}
      <DayRecordsModal
        visible={showDayModal}
        dayStats={selectedDayStats}
        onClose={() => setShowDayModal(false)}
        onDeleteRecord={handleDeleteRecord}
      />

      {/* 年月选择器 */}
      <YearMonthPicker
        visible={isYearMonthPickerVisible}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onClose={() => setIsYearMonthPickerVisible(false)}
        onConfirm={handleYearMonthConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  selectorCard: {
    margin: Spacing.md,
    padding: Spacing.md,
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginHorizontal: 2,
    backgroundColor: Colors.background,
  },
  activeModeButton: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeModeButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  yearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  yearButtonText: {
    fontSize: FontSizes.xl,
    color: Colors.primary,
    fontWeight: '600',
  },
  yearText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.lg,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  monthButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  monthButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  monthText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.lg,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginHorizontal: 2,
    backgroundColor: Colors.background,
  },
  activeChartTypeButton: {
    backgroundColor: Colors.primary,
  },
  chartTypeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeChartTypeButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
