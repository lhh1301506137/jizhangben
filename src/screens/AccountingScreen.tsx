import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/Colors';
import { Card } from '../components/common/Card';
import { AccountingService, AccountRecord, AccountStats } from '../services/AccountingService';
import { AddRecordModal } from '../components/accounting/AddRecordModal';
import { RecordList } from '../components/accounting/RecordList';
import { AccountingHistoryScreen } from './AccountingHistoryScreen';
import { AccountingChartsScreen } from './AccountingChartsScreen';

export const AccountingScreen: React.FC = () => {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultRecordType, setDefaultRecordType] = useState<'income' | 'expense'>('expense');
  const [showHistoryScreen, setShowHistoryScreen] = useState(false);
  const [showChartsScreen, setShowChartsScreen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 选中的日期
  const [selectedDateStats, setSelectedDateStats] = useState<any>(null); // 选中日期的统计
  const scrollViewRef = useRef<ScrollView>(null); // ScrollView 引用

  // 获取显示日期（选中日期或当前日期）
  const getDisplayDate = (): string => {
    const targetDate = selectedDate ? new Date(selectedDate) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[targetDate.getDay()];

    return `${year}年${month}月${day}日 星期${weekDay}`;
  };

  useEffect(() => {
    initializeAccounting();
  }, []);

  // 监听选中日期变化，重新加载数据
  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [selectedDate]);

  // 当选中日期且有记录时，滚动到底部（最早的记录）
  useEffect(() => {
    if (selectedDate && records.length > 0) {
      console.log('准备滚动到底部，记录数量:', records.length);
      // 延迟滚动，确保内容已渲染
      setTimeout(() => {
        console.log('执行滚动到底部');
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [selectedDate, records]);

  const initializeAccounting = async () => {
    try {
      setLoading(true);
      
      // 初始化分类
      await AccountingService.initializeCategories();
      
      // 加载数据
      await loadData();
      
      // 创建示例数据（如果没有记录）
      const allRecords = await AccountingService.getAllRecords();
      console.log('当前记录数量:', allRecords.length);

      if (allRecords.length === 0) {
        console.log('创建初始示例数据');
        await AccountingService.createSampleData();
        await AccountingService.createExtendedTestData(); // 添加扩展测试数据
        await loadData();
      } else {
        // 检查是否已有足够的2025年6-8月的数据
        const testDataRecords = allRecords.filter(record =>
          record.date.startsWith('2025-06') ||
          record.date.startsWith('2025-07') ||
          record.date.startsWith('2025-08')
        );
        console.log('2025年6-8月记录数量:', testDataRecords.length);

        if (testDataRecords.length < 10) { // 如果少于10条记录，则添加测试数据
          console.log('添加2025年6-8月测试数据');
          await AccountingService.createExtendedTestData();
          await loadData();
        }
      }
    } catch (error) {
      console.error('初始化记账功能失败:', error);
      Alert.alert('错误', '初始化记账功能失败');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      if (selectedDate) {
        // 如果选中了特定日期，加载该日期的数据
        const [dayStats, allRecords] = await Promise.all([
          AccountingService.getDayStats(selectedDate),
          AccountingService.getAllRecords(),
        ]);

        // 过滤出选中日期的记录，并按时间排序（最早的在最后）
        const dayRecords = allRecords
          .filter(record => record.date === selectedDate)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setRecords(dayRecords);
        setSelectedDateStats(dayStats);
        setStats({
          totalIncome: dayStats.totalIncome,
          totalExpense: dayStats.totalExpense,
          balance: dayStats.netIncome,
          recordCount: dayStats.recordCount,
          categoryStats: {},
          monthlyStats: {},
        });
      } else {
        // 正常加载最近记录
        const [recentRecords, statsData] = await Promise.all([
          AccountingService.getRecentRecords(20),
          AccountingService.getStatistics(),
        ]);

        setRecords(recentRecords);
        setStats(statsData);
        setSelectedDateStats(null);
      }
    } catch (error) {
      console.error('加载记账数据失败:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddRecord = async (recordData: Omit<AccountRecord, 'id' | 'timestamp'>) => {
    try {
      await AccountingService.createRecord(recordData);
      await loadData();
      setShowAddModal(false);
      Alert.alert('成功', '记账记录已添加');
    } catch (error) {
      console.error('添加记录失败:', error);
      Alert.alert('错误', '添加记录失败');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await AccountingService.deleteRecord(recordId);
              await loadData();
              Alert.alert('成功', '记录已删除');
            } catch (error) {
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  // 处理从历史记录页面导航到指定日期
  const handleNavigateToDate = async (date: string) => {
    console.log('导航到日期:', date);
    setSelectedDate(date);
    setShowHistoryScreen(false);
    // 数据会在 useEffect 中重新加载，然后滚动到底部
  };

  // 返回到当前日期
  const handleBackToToday = () => {
    setSelectedDate(null);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 头部统计卡片 */}
        <Card style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.statsTitle}>
                {selectedDate ? '📅 日记录概览' : '💰 账户概览'}
              </Text>
              {selectedDate && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToToday}
                >
                  <Text style={styles.backButtonText}>返回今日</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.currentDate}>{getDisplayDate()}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总收入</Text>
              <Text style={[styles.statValue, styles.incomeText]}>
                ¥{formatAmount(stats?.totalIncome || 0)}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总支出</Text>
              <Text style={[styles.statValue, styles.expenseText]}>
                ¥{formatAmount(stats?.totalExpense || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>净余额</Text>
            <Text style={[
              styles.balanceValue,
              (stats?.balance || 0) >= 0 ? styles.incomeText : styles.expenseText
            ]}>
              ¥{formatAmount(stats?.balance || 0)}
            </Text>
          </View>
          
          <View style={styles.recordCountContainer}>
            <Text style={styles.recordCountText}>
              📊 共 {stats?.recordCount || 0} 条记录
            </Text>
          </View>
        </Card>

        {/* 快速操作按钮 */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.incomeButton]}
            onPress={() => {
              setDefaultRecordType('income');
              setShowAddModal(true);
            }}
          >
            <Text style={styles.quickActionText}>💰 记收入</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.expenseButton]}
            onPress={() => {
              setDefaultRecordType('expense');
              setShowAddModal(true);
            }}
          >
            <Text style={styles.quickActionText}>💸 记支出</Text>
          </TouchableOpacity>
        </View>

        {/* 记录列表 */}
        <Card style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>
              {selectedDate ? '📝 当日记录' : '📝 最近记录'}
            </Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => setShowHistoryScreen(true)}
              >
                <Text style={styles.historyButtonText}>📊 历史</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chartsButton}
                onPress={() => setShowChartsScreen(true)}
              >
                <Text style={styles.chartsButtonText}>📈 趋势</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <RecordList
            records={records}
            onDeleteRecord={handleDeleteRecord}
            showDate={true}
          />
          
          {records.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>还没有记录</Text>
              <Text style={styles.emptySubtitle}>点击上方按钮开始记账</Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* 添加记录浮动按钮 */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          setDefaultRecordType('expense');
          setShowAddModal(true);
        }}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* 添加记录模态框 */}
      <AddRecordModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddRecord}
        defaultType={defaultRecordType}
      />

      {/* 历史记录模态框 */}
      {showHistoryScreen && (
        <View style={styles.historyModalContainer}>
          <View style={styles.historyModalHeader}>
            <TouchableOpacity
              style={styles.historyCloseButton}
              onPress={() => setShowHistoryScreen(false)}
            >
              <Text style={styles.historyCloseText}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={styles.historyModalTitle}>历史记录</Text>
            <View style={styles.historyPlaceholder} />
          </View>
          <AccountingHistoryScreen onNavigateToDate={handleNavigateToDate} />
        </View>
      )}

      {/* 趋势分析模态框 */}
      {showChartsScreen && (
        <View style={styles.historyModalContainer}>
          <AccountingChartsScreen onBack={() => setShowChartsScreen(false)} />
        </View>
      )}
    </View>
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  backButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  statsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  currentDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  recordCountContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  recordCountText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  incomeButton: {
    backgroundColor: '#4CAF50',
  },
  expenseButton: {
    backgroundColor: '#F44336',
  },
  quickActionText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
  recordsCard: {
    marginBottom: Spacing.xl,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recordsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  historyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.surface,
  },
  chartsButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.success,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartsButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.surface,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
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
  floatingButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonText: {
    fontSize: FontSizes.xl,
    color: Colors.surface,
    fontWeight: '600',
  },
  historyModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 1000,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyCloseButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  historyCloseText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  historyModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  historyPlaceholder: {
    width: 60,
  },
});
