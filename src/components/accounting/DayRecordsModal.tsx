import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { DailyStats, AccountRecord, AccountCategory, AccountingService } from '../../services/AccountingService';

interface DayRecordsModalProps {
  visible: boolean;
  dayStats: DailyStats | null;
  onClose: () => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const DayRecordsModal: React.FC<DayRecordsModalProps> = ({
  visible,
  dayStats,
  onClose,
  onDeleteRecord,
}) => {
  const [categories, setCategories] = React.useState<AccountCategory[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    loadCategories();
  }, []);

  // 当模态框显示且有记录时，滚动到底部（最早的记录）
  useEffect(() => {
    if (visible && dayStats && dayStats.records.length > 0) {
      console.log('准备滚动到底部，记录数量:', dayStats.records.length);
      // 延迟滚动，确保模态框动画和内容都已渲染
      setTimeout(() => {
        console.log('执行滚动到底部');
        // 尝试两种滚动方法
        scrollViewRef.current?.scrollToEnd({ animated: true });
        // 备用方法：滚动到一个很大的Y值
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 10000, animated: true });
        }, 100);
      }, 800); // 增加延迟时间
    }
  }, [visible, dayStats]);

  const loadCategories = async () => {
    try {
      const incomeCategories = await AccountingService.getCategories('income');
      const expenseCategories = await AccountingService.getCategories('expense');
      setCategories([...incomeCategories, ...expenseCategories]);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}年${month}月${day}日 星期${weekDay}`;
  };

  const getCategoryInfo = (categoryId: string): AccountCategory | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const handleDeleteRecord = (record: AccountRecord) => {
    Alert.alert(
      '确认删除',
      `确定要删除这条记录吗？\n\n${record.type === 'income' ? '收入' : '支出'}: ¥${formatAmount(record.amount)}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            if (onDeleteRecord) {
              onDeleteRecord(record.id);
            }
          },
        },
      ]
    );
  };

  const renderRecord = (record: AccountRecord, index: number) => {
    const categoryInfo = getCategoryInfo(record.category);
    const isIncome = record.type === 'income';

    return (
      <TouchableOpacity
        key={record.id}
        style={[
          styles.recordItem,
          index === dayStats!.records.length - 1 && styles.lastRecordItem,
        ]}
        onPress={() => handleDeleteRecord(record)}
      >
        <View style={styles.recordLeft}>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryEmoji}>
              {categoryInfo?.emoji || (isIncome ? '💰' : '💸')}
            </Text>
            <View style={styles.recordInfo}>
              <Text style={styles.categoryName}>
                {categoryInfo?.name || record.category}
              </Text>
              {record.description && (
                <Text style={styles.recordDescription} numberOfLines={1}>
                  {record.description}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.recordRight}>
          <Text style={[
            styles.recordAmount,
            isIncome ? styles.incomeAmount : styles.expenseAmount,
          ]}>
            {isIncome ? '+' : '-'}¥{formatAmount(record.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!dayStats) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
            <Text style={styles.title}>日记录详情</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* 日期和统计 */}
            <View style={styles.dayHeader}>
              <Text style={styles.dateText}>{formatDate(dayStats.date)}</Text>
              <View style={styles.dayStatsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>收入</Text>
                  <Text style={[styles.statValue, styles.incomeValue]}>
                    ¥{formatAmount(dayStats.totalIncome)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>支出</Text>
                  <Text style={[styles.statValue, styles.expenseValue]}>
                    ¥{formatAmount(dayStats.totalExpense)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>净收入</Text>
                  <Text style={[
                    styles.statValue,
                    dayStats.netIncome >= 0 ? styles.incomeValue : styles.expenseValue
                  ]}>
                    ¥{formatAmount(dayStats.netIncome)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 记录列表 */}
            <View style={styles.recordsContainer}>
              <Text style={styles.recordsTitle}>
                📝 记录明细 ({dayStats.recordCount}条)
              </Text>
              <View style={styles.recordsList}>
                {dayStats.records.map((record, index) => renderRecord(record, index))}
              </View>
            </View>

            {/* 提示信息 */}
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>💡 点击记录可以删除</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  dayHeader: {
    backgroundColor: Colors.background,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dateText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  dayStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  incomeValue: {
    color: '#4CAF50',
  },
  expenseValue: {
    color: '#F44336',
  },
  recordsContainer: {
    margin: Spacing.md,
    marginTop: 0,
  },
  recordsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  recordsList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastRecordItem: {
    borderBottomWidth: 0,
  },
  recordLeft: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  recordInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  recordDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordAmount: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
  hintContainer: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
