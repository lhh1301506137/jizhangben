import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Plan, PlanService, PLAN_TYPES, PlanType } from '../../services/PlanService';
import { CoupleService } from '../../services/CoupleService';
import { authService } from '../../services/AuthService';
import { getCommunicationOfflineMessage, isLikelyNetworkError } from '../../utils/errorMessages';

interface PlanManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface CreatePlanForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: PlanType;
  emoji: string;
}

const createDefaultForm = (): CreatePlanForm => ({
  title: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  location: '',
  type: 'date',
  emoji: '',
});

export const PlanManager: React.FC<PlanManagerProps> = ({ visible, onClose }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [upcomingPlans, setUpcomingPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreatePlanForm>(createDefaultForm());
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    if (visible) {
      loadPlans();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setInterval(() => {
      loadPlans();
    }, 5000);

    return () => clearInterval(timer);
  }, [visible]);

  const displayPlans = useMemo(() => {
    return viewMode === 'upcoming' ? upcomingPlans : plans;
  }, [viewMode, upcomingPlans, plans]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      setCurrentUserId(currentUser?.id || '');
      const [allPlans, upcoming] = await Promise.all([
        PlanService.getAllPlans(),
        PlanService.getUpcomingPlans(),
      ]);
      setPlans(allPlans);
      setUpcomingPlans(upcoming);
      await PlanService.markPlansAsRead();
    } catch (error) {
      console.error('load plans failed:', error);
      Alert.alert('错误', '加载计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanPress = (plan: Plan) => {
    const actions: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [
      { text: '返回', style: 'cancel' },
    ];

    if (plan.status !== 'completed' && plan.status !== 'cancelled') {
      actions.push({
        text: '标记完成',
        onPress: () => handleCompletePlan(plan.id),
      });
    }

    if (plan.createdBy === currentUserId && plan.status !== 'cancelled' && plan.status !== 'completed') {
      actions.push({
        text: '取消计划',
        style: 'destructive',
        onPress: () => handleCancelPlan(plan.id),
      });
    }

    Alert.alert(
      plan.title,
      `${plan.description || ''}\n\n📅 ${formatDate(plan.date)}${plan.time ? ` ${plan.time}` : ''}\n📍 ${plan.location || '未设置地点'}`,
      actions
    );
  };

  const handleCompletePlan = async (planId: string) => {
    try {
      const ok = await PlanService.completePlan(planId);
      if (!ok) {
        throw new Error(getCommunicationOfflineMessage('操作'));
      }
      await loadPlans();
      Alert.alert('成功', '计划已标记为完成');
    } catch (error) {
      console.error('complete plan failed:', error);
      Alert.alert(
        '错误',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('操作') : '操作失败'
      );
    }
  };

  const handleCancelPlan = async (planId: string) => {
    try {
      const ok = await PlanService.cancelPlan(planId);
      if (!ok) {
        throw new Error('取消计划失败');
      }
      await loadPlans();
      Alert.alert('成功', '计划已取消');
    } catch (error) {
      console.error('cancel plan failed:', error);
      Alert.alert(
        '错误',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('取消') : '取消计划失败'
      );
    }
  };

  const handleCreatePlan = () => {
    setForm(createDefaultForm());
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async () => {
    const title = form.title.trim();
    const date = form.date.trim();

    if (!title) {
      Alert.alert('提示', '请填写计划标题');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
      Alert.alert('提示', '日期格式应为 YYYY-MM-DD');
      return;
    }

    try {
      setSaving(true);
      const coupleInfo = await CoupleService.getCoupleInfo();
      if (!coupleInfo?.isConnected) {
        throw new Error('请先完成情侣配对');
      }

      await PlanService.createPlan({
        title,
        description: form.description.trim() || undefined,
        type: form.type,
        date,
        time: form.time.trim() || undefined,
        location: form.location.trim() || undefined,
        status: 'planned',
        createdBy: coupleInfo.myName,
        reminders: [],
        isShared: true,
        participants: [coupleInfo.myName, coupleInfo.partnerName].filter(Boolean),
        notes: undefined,
        budget: undefined,
        emoji: form.emoji.trim() || undefined,
      });

      setShowCreateModal(false);
      setForm(createDefaultForm());
      await loadPlans();
      Alert.alert('成功', '计划已创建');
    } catch (error) {
      console.error('create plan failed:', error);
      Alert.alert(
        '创建失败',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('创建') : '请重试'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return '今天';
    }
    if (dateString === tomorrow.toISOString().split('T')[0]) {
      return '明天';
    }
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getStatusColor = (status: Plan['status']) => {
    switch (status) {
      case 'planned':
        return Colors.primary;
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: Plan['status']) => {
    switch (status) {
      case 'planned':
        return '计划中';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '未知';
    }
  };

  const renderPlan = (plan: Plan) => (
    <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => handlePlanPress(plan)}>
      <View style={styles.planHeader}>
        <View style={styles.planTypeContainer}>
          <Text style={styles.planTypeEmoji}>{plan.emoji || PLAN_TYPES[plan.type].emoji}</Text>
          <Text style={styles.planTypeText}>{PLAN_TYPES[plan.type].label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plan.status) }]}>
          <Text style={styles.statusText}>{getStatusText(plan.status)}</Text>
        </View>
      </View>

      <Text style={styles.planTitle}>{plan.title}</Text>

      {plan.description && (
        <Text style={styles.planDescription} numberOfLines={2}>
          {plan.description}
        </Text>
      )}

      <View style={styles.planDetails}>
        <Text style={styles.planDate}>
          📅 {formatDate(plan.date)}
          {plan.time ? ` ${plan.time}` : ''}
        </Text>
        {plan.location && <Text style={styles.planLocation}>📍 {plan.location}</Text>}
      </View>

      {plan.participants.length > 0 && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsText}>👥 {plan.participants.join(', ')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>‹返回</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📅 共同计划</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleCreatePlan}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={[styles.switchButton, viewMode === 'upcoming' && styles.activeSwitchButton]}
              onPress={() => setViewMode('upcoming')}
            >
              <Text style={[styles.switchText, viewMode === 'upcoming' && styles.activeSwitchText]}>
                即将到来 ({upcomingPlans.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchButton, viewMode === 'all' && styles.activeSwitchButton]}
              onPress={() => setViewMode('all')}
            >
              <Text style={[styles.switchText, viewMode === 'all' && styles.activeSwitchText]}>
                全部计划 ({plans.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.plansList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.plansContent}>
            {loading ? (
              <Text style={styles.loadingText}>加载中...</Text>
            ) : displayPlans.length > 0 ? (
              displayPlans.map(renderPlan)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📑</Text>
                <Text style={styles.emptyTitle}>{viewMode === 'upcoming' ? '暂无即将到来的计划' : '还没有计划'}</Text>
                <Text style={styles.emptySubtitle}>点击右上角 + 创建你们的第一个计划</Text>
                <TouchableOpacity style={styles.createFirstPlanButton} onPress={handleCreatePlan}>
                  <Text style={styles.createFirstPlanText}>创建计划</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
            <View style={styles.createModalOverlay}>
              <View style={styles.createModalCard}>
                <Text style={styles.createModalTitle}>创建共同计划</Text>

                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={text => setForm(prev => ({ ...prev, title: text }))}
                  placeholder="标题（必填）"
                  placeholderTextColor={Colors.textSecondary}
                />

                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={form.description}
                  onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
                  placeholder="描述（可选）"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />

                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    value={form.date}
                    onChangeText={text => setForm(prev => ({ ...prev, date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    value={form.time}
                    onChangeText={text => setForm(prev => ({ ...prev, time: text }))}
                    placeholder="时间 18:30"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={text => setForm(prev => ({ ...prev, location: text }))}
                  placeholder="地点（可选）"
                  placeholderTextColor={Colors.textSecondary}
                />

                <TextInput
                  style={styles.input}
                  value={form.emoji}
                  onChangeText={text => setForm(prev => ({ ...prev, emoji: text }))}
                  placeholder="emoji（可选）"
                  placeholderTextColor={Colors.textSecondary}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                  {(Object.keys(PLAN_TYPES) as PlanType[]).map(type => {
                    const isActive = form.type === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeChip, isActive && styles.typeChipActive]}
                        onPress={() => setForm(prev => ({ ...prev, type }))}
                      >
                        <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                          {PLAN_TYPES[type].emoji} {PLAN_TYPES[type].label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setShowCreateModal(false)}>
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.submitButton, saving && styles.submitButtonDisabled]}
                    onPress={handleSubmitCreate}
                    disabled={saving}
                  >
                    <Text style={styles.submitButtonText}>{saving ? '创建中...' : '创建'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: 50,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.surface,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    margin: Spacing.md,
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
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  activeSwitchText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  plansList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  plansContent: {
    paddingBottom: Spacing.lg,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
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
    marginBottom: Spacing.lg,
  },
  createFirstPlanButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createFirstPlanText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTypeEmoji: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  planTypeText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  planDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  planDetails: {
    marginBottom: Spacing.sm,
  },
  planDate: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  planLocation: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  participantsContainer: {
    marginTop: Spacing.xs,
  },
  participantsText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  createModalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  createModalTitle: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rowInput: {
    flex: 1,
  },
  typeRow: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    minWidth: 88,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
  },
  submitButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
});
