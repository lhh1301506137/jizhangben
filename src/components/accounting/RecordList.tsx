import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { AccountRecord, AccountCategory, AccountingService } from '../../services/AccountingService';

interface RecordListProps {
  records: AccountRecord[];
  onDeleteRecord?: (recordId: string) => void;
  onEditRecord?: (record: AccountRecord) => void;
  showDate?: boolean;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  onDeleteRecord,
  onEditRecord,
  showDate = false,
}) => {
  const [categories, setCategories] = useState<AccountCategory[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoryList = await AccountingService.getCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const getCategoryInfo = (categoryId: string): AccountCategory | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    if (dateString === today.toISOString().split('T')[0]) {
      return '今日';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  const handleRecordPress = (record: AccountRecord) => {
    const categoryInfo = getCategoryInfo(record.category);
    const actions = [];

    if (onEditRecord) {
      actions.push({
        text: '编辑',
        onPress: () => onEditRecord(record),
      });
    }

    if (onDeleteRecord) {
      actions.push({
        text: '删除',
        style: 'destructive' as const,
        onPress: () => onDeleteRecord(record.id),
      });
    }

    actions.push({ text: '取消', style: 'cancel' as const });

    const detailText = `类型: ${record.type === 'income' ? '收入' : '支出'}\n` +
      `分类: ${categoryInfo?.name || record.category}\n` +
      `金额: ¥${formatAmount(record.amount)}\n` +
      (record.description ? `备注: ${record.description}\n` : '') +
      `日期: ${record.date}`;

    Alert.alert(
      '记录详情',
      detailText,
      actions
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
          index === records.length - 1 && styles.lastRecordItem,
        ]}
        onPress={() => handleRecordPress(record)}
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
              <View style={styles.recordMeta}>
                {showDate && (
                  <Text style={styles.recordDate}>
                    {formatDate(record.date)}
                  </Text>
                )}
              </View>
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

  if (records.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {records.map(renderRecord)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
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
    marginBottom: 2,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaSeparator: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  recordDate: {
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
});
