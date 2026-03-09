import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { CoupleService } from '../../services/CoupleService';

interface DisconnectConfirmProps {
  visible: boolean;
  partnerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

type DataOption = 'keep_all' | 'keep_mine_only' | 'delete_all';

const DATA_OPTIONS = [
  {
    value: 'keep_all' as DataOption,
    title: '保留所有回忆',
    subtitle: '保存你们的所有聊天记录、心情和计划',
    emoji: '💕',
    description: '所有数据都会保留，包括伙伴的心情记录、留言和共同计划。你可以随时回顾这些美好的回忆。',
    pros: ['保留完整的回忆', '可以回顾美好时光', '数据完整性'],
    cons: ['可能触景生情', '占用存储空间'],
  },
  {
    value: 'keep_mine_only' as DataOption,
    title: '只保留我的记录',
    subtitle: '删除伙伴的数据，只保留自己的记录',
    emoji: '🤗',
    description: '只保留你自己的心情记录和留言，删除伙伴的所有数据和共同计划。这样可以避免睹物思人。',
    pros: ['避免触景生情', '保留个人成长记录', '减少存储占用'],
    cons: ['失去部分回忆', '无法恢复伙伴数据'],
  },
  {
    value: 'delete_all' as DataOption,
    title: '删除所有数据',
    subtitle: '彻底删除所有相关记录，重新开始',
    emoji: '🆕',
    description: '删除所有情侣相关的数据，包括心情记录、留言和计划。这是一个全新的开始。',
    pros: ['彻底的新开始', '释放存储空间', '避免任何触发'],
    cons: ['永久失去所有数据', '无法恢复', '失去成长记录'],
  },
];

export const DisconnectConfirm: React.FC<DisconnectConfirmProps> = ({
  visible,
  partnerName,
  onConfirm,
  onCancel,
}) => {
  const [selectedOption, setSelectedOption] = useState<DataOption>('keep_mine_only');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const selectedConfig = DATA_OPTIONS.find(option => option.value === selectedOption);
    
    Alert.alert(
      '确认解除配对',
      `你选择了"${selectedConfig?.title}"。\n\n这个操作无法撤销，确定要继续吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定解除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // 如果选择保留所有数据，先导出备份
              if (selectedOption === 'keep_all') {
                try {
                  const backupData = await CoupleService.exportCoupleData();
                  console.log('数据备份已创建');
                  // 实际应用中可以保存到文件或云端
                } catch (error) {
                  console.error('创建备份失败:', error);
                }
              }
              
              // 执行断开连接
              const success = await CoupleService.disconnect(selectedOption);
              
              if (success) {
                Alert.alert(
                  '解除成功',
                  `已与 ${partnerName} 解除配对。${selectedConfig?.title}已完成。`,
                  [{ text: '确定', onPress: onConfirm }]
                );
              } else {
                Alert.alert('解除失败', '请重试');
              }
            } catch (error) {
              console.error('解除配对失败:', error);
              Alert.alert('解除失败', '请重试');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderOption = (option: typeof DATA_OPTIONS[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.optionCard,
        selectedOption === option.value && styles.selectedOptionCard,
      ]}
      onPress={() => setSelectedOption(option.value)}
    >
      <View style={styles.optionHeader}>
        <Text style={styles.optionEmoji}>{option.emoji}</Text>
        <View style={styles.optionTitleContainer}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
        </View>
        <View
          style={[
            styles.radioButton,
            selectedOption === option.value && styles.radioButtonSelected,
          ]}
        >
          {selectedOption === option.value && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
      </View>
      
      <Text style={styles.optionDescription}>{option.description}</Text>
      
      <View style={styles.prosConsContainer}>
        <View style={styles.prosContainer}>
          <Text style={styles.prosTitle}>✅ 优点：</Text>
          {option.pros.map((pro, index) => (
            <Text key={index} style={styles.prosText}>• {pro}</Text>
          ))}
        </View>
        
        <View style={styles.consContainer}>
          <Text style={styles.consTitle}>⚠️ 注意：</Text>
          {option.cons.map((con, index) => (
            <Text key={index} style={styles.consText}>• {con}</Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  console.log('DisconnectConfirm render:', { visible, partnerName });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {/* 头部 */}
              <View style={styles.header}>
                <Text style={styles.title}>💔 解除配对</Text>
                <Text style={styles.subtitle}>
                  即将与 {partnerName} 解除配对，请选择数据处理方式
                </Text>
              </View>

              {/* 数据处理选项 */}
              <View style={styles.optionsContainer}>
                {DATA_OPTIONS.map(renderOption)}
              </View>

              {/* 重要提示 */}
              <Card style={styles.warningCard}>
                <Text style={styles.warningTitle}>⚠️ 重要提示</Text>
                <Text style={styles.warningText}>
                  • 解除配对后，你们将无法再同步心情和留言
                </Text>
                <Text style={styles.warningText}>
                  • 根据你的选择，部分或全部数据可能被删除
                </Text>
                <Text style={styles.warningText}>
                  • 此操作无法撤销，请谨慎选择
                </Text>
                <Text style={styles.warningText}>
                  • 如需重新配对，需要重新创建邀请码
                </Text>
              </Card>
            </ScrollView>

            {/* 固定在底部的按钮组 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? '处理中...' : '确认解除'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    margin: Spacing.md,
    width: '95%',
    maxHeight: '90%',
  },
  contentContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: Spacing.lg,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectedOptionCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  optionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionDescription: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  prosConsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prosContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  consContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  prosTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  consTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4,
  },
  prosText: {
    fontSize: FontSizes.xs,
    color: '#4CAF50',
    marginBottom: 2,
  },
  consText: {
    fontSize: FontSizes.xs,
    color: '#FF9800',
    marginBottom: 2,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  warningTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: Spacing.sm,
  },
  warningText: {
    fontSize: FontSizes.sm,
    color: '#E65100',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
});
