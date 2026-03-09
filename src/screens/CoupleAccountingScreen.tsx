import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Card } from '../components/common/Card';
import { CoupleAccountingService } from '../services/CoupleAccountingService';
import { CoupleService } from '../services/CoupleService';
import { authService } from '../services/AuthService';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/Colors';
import {
  CoupleAccount,
  CoupleAccountStats,
  CoupleTransaction,
  CoupleTransactionType,
  TransactionStatus,
  PermissionSettings,
} from '../types/CoupleAccounting';
import { getCommunicationOfflineMessage, isLikelyNetworkError } from '../utils/errorMessages';

interface CoupleAccountingScreenProps {
  onBack?: () => void;
}

export const CoupleAccountingScreen: React.FC<CoupleAccountingScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<CoupleAccount | null>(null);
  const [stats, setStats] = useState<CoupleAccountStats | null>(null);
  const [transactions, setTransactions] = useState<CoupleTransaction[]>([]);
  const [permissions, setPermissions] = useState<PermissionSettings | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<CoupleTransactionType>(CoupleTransactionType.DEPOSIT);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const coupleInfo = await CoupleService.getCoupleInfo();
      if (!coupleInfo?.isConnected) {
        Alert.alert('提示', '请先完成情侣配对后再使用共同记账');
        onBack?.();
        return;
      }

      let coupleAccount = await CoupleAccountingService.getCoupleAccount(coupleInfo.id);
      if (!coupleAccount) {
        coupleAccount = await CoupleAccountingService.createCoupleAccount(coupleInfo.id);
      }
      setAccount(coupleAccount);

      const currentUser = authService.getCurrentUser();
      setCurrentUserId(currentUser?.id || '');
      const [accountTransactions, userPermissions] = await Promise.all([
        CoupleAccountingService.getAccountTransactions(coupleAccount.id),
        currentUser
          ? CoupleAccountingService.getUserPermissionSettings(coupleAccount.id, currentUser.id)
          : Promise.resolve(null),
      ]);

      setTransactions(accountTransactions.slice(0, 20));
      setPermissions(userPermissions);

      const accountStats = await CoupleAccountingService.getAccountStats(
        coupleAccount.id,
        coupleAccount,
        accountTransactions
      );
      setStats(accountStats);
    } catch (error) {
      console.error('load couple accounting data failed:', error);
      Alert.alert('错误', '加载共同记账数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!account || !amount || !description.trim()) {
      Alert.alert('提示', '请填写完整交易信息');
      return;
    }

    try {
      const amountNum = Number(amount);
      if (Number.isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('提示', '请输入有效金额');
        return;
      }

      await CoupleAccountingService.createTransactionRequest(
        account.id,
        transactionType,
        amountNum,
        description.trim()
      );

      Alert.alert('成功', '交易请求已提交');
      setShowAddTransaction(false);
      setAmount('');
      setDescription('');
      await loadData();
    } catch (error) {
      console.error('create transaction failed:', error);
      Alert.alert(
        '错误',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('提交') : '创建交易失败'
      );
    }
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      await CoupleAccountingService.approveTransaction(transactionId);
      Alert.alert('成功', '交易已批准');
      await loadData();
    } catch (error) {
      console.error('approve transaction failed:', error);
      Alert.alert(
        '错误',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('审批') : '批准交易失败'
      );
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      await CoupleAccountingService.rejectTransaction(transactionId, '用户拒绝');
      Alert.alert('成功', '交易已拒绝');
      await loadData();
    } catch (error) {
      console.error('reject transaction failed:', error);
      Alert.alert(
        '错误',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('审批') : '拒绝交易失败'
      );
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    Alert.alert('取消申请', '确认取消这条共同记账申请吗？', [
      { text: '返回', style: 'cancel' },
      {
        text: '确认取消',
        style: 'destructive',
        onPress: async () => {
          try {
            await CoupleAccountingService.cancelTransactionRequest(transactionId);
            Alert.alert('成功', '申请已取消');
            await loadData();
          } catch (error) {
            console.error('cancel transaction failed:', error);
            Alert.alert(
              '错误',
              isLikelyNetworkError(error) ? getCommunicationOfflineMessage('取消') : '取消申请失败'
            );
          }
        },
      },
    ]);
  };

  const getTransactionTypeText = (type: CoupleTransactionType) => {
    switch (type) {
      case CoupleTransactionType.DEPOSIT:
        return '存入';
      case CoupleTransactionType.WITHDRAW:
        return '取出';
      case CoupleTransactionType.TRANSFER:
        return '转账';
      default:
        return '未知';
    }
  };

  const getStatusText = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.PENDING:
        return '待审批';
      case TransactionStatus.APPROVED:
        return '已批准';
      case TransactionStatus.REJECTED:
        return '已拒绝';
      case TransactionStatus.COMPLETED:
        return '已完成';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.PENDING:
        return Colors.warning;
      case TransactionStatus.APPROVED:
      case TransactionStatus.COMPLETED:
        return Colors.success;
      case TransactionStatus.REJECTED:
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💕 共同记账</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  const pendingList = transactions.filter(item => item.status === TransactionStatus.PENDING);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💕 共同记账</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddTransaction(true)}>
          <Text style={styles.addButtonText}>+ 记录</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {stats && (
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>共同金库</Text>
            <Text style={styles.balanceAmount}>¥{stats.totalBalance.toLocaleString()}</Text>
            <View style={styles.contributionContainer}>
              <View style={styles.contributionItem}>
                <Text style={styles.contributionLabel}>我的贡献</Text>
                <Text style={styles.contributionAmount}>¥{stats.myContribution.toLocaleString()}</Text>
              </View>
              <View style={styles.contributionItem}>
                <Text style={styles.contributionLabel}>对方贡献</Text>
                <Text style={styles.contributionAmount}>¥{stats.partnerContribution.toLocaleString()}</Text>
              </View>
            </View>
          </Card>
        )}

        {pendingList.length > 0 && (
          <Card style={styles.pendingCard}>
            <Text style={styles.sectionTitle}>⏳ 待审批交易</Text>
            {pendingList.map(transaction => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDetails}>
                    {getTransactionTypeText(transaction.type)} ¥{transaction.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.transactionRequester}>申请人: {transaction.requesterName}</Text>
                </View>
                {transaction.requesterId !== currentUserId ? (
                  <View style={styles.transactionActions}>
                    <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveTransaction(transaction.id)}>
                      <Text style={styles.approveButtonText}>批准</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectTransaction(transaction.id)}>
                      <Text style={styles.rejectButtonText}>拒绝</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selfPendingActions}>
                    <Text style={styles.waitingText}>等待对方审批</Text>
                    <TouchableOpacity style={styles.cancelRequestButton} onPress={() => handleCancelTransaction(transaction.id)}>
                      <Text style={styles.cancelRequestButtonText}>取消申请</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.historyCard}>
          <Text style={styles.sectionTitle}>📝 最近记录</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>暂无交易记录</Text>
          ) : (
            transactions.map(transaction => (
              <View key={transaction.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDescription}>{transaction.description}</Text>
                  <Text style={styles.historyDetails}>
                    {getTransactionTypeText(transaction.type)} ¥{transaction.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.historyRequester}>
                    {transaction.requesterName} · {new Date(transaction.requestedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.historyStatus, { color: getStatusColor(transaction.status) }]}>
                  {getStatusText(transaction.status)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <Modal visible={showAddTransaction} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAddTransaction(false)}>
              <Text style={styles.modalCloseText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>添加交易</Text>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleAddTransaction}>
              <Text style={styles.modalSaveText}>提交</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[styles.typeButton, transactionType === CoupleTransactionType.DEPOSIT && styles.typeButtonActive]}
                onPress={() => setTransactionType(CoupleTransactionType.DEPOSIT)}
              >
                <Text style={[styles.typeButtonText, transactionType === CoupleTransactionType.DEPOSIT && styles.typeButtonTextActive]}>
                  存入
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, transactionType === CoupleTransactionType.WITHDRAW && styles.typeButtonActive]}
                onPress={() => setTransactionType(CoupleTransactionType.WITHDRAW)}
              >
                <Text style={[styles.typeButtonText, transactionType === CoupleTransactionType.WITHDRAW && styles.typeButtonTextActive]}>
                  取出
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>金额</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="请输入金额"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>描述</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="请输入交易描述"
                multiline
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  balanceCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  balanceAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  contributionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  contributionItem: {
    alignItems: 'center',
  },
  contributionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  contributionAmount: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  pendingCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  transactionDetails: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  transactionRequester: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  waitingText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  selfPendingActions: {
    alignItems: 'flex-end',
  },
  cancelRequestButton: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cancelRequestButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  approveButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  rejectButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  historyCard: {
    marginBottom: Spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyInfo: {
    flex: 1,
  },
  historyDescription: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  historyDetails: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  historyRequester: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  historyStatus: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  modalCloseText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  modalSaveButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  modalSaveText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: Colors.surface,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
