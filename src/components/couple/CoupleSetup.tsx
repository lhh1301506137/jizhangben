import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { CoupleService, CoupleInfo } from '../../services/CoupleService';

interface CoupleSetupProps {
  visible: boolean;
  onComplete: (coupleInfo: CoupleInfo) => void;
  onCancel: () => void;
}

export const CoupleSetup: React.FC<CoupleSetupProps> = ({
  visible,
  onComplete,
  onCancel,
}) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptPairing, setAcceptPairing] = useState(true);

  const handleCreateCouple = async () => {
    if (!myName.trim()) {
      Alert.alert('提示', '请输入配对名称');
      return;
    }

    if (!acceptPairing) {
      Alert.alert('提示', '请先开启接受配对功能');
      return;
    }

    try {
      setLoading(true);
      const coupleInfo = await CoupleService.createCouple(myName.trim(), acceptPairing);

      Alert.alert(
        '配对创建成功！',
        `您的邀请码是：${coupleInfo.inviteCode}\n请分享给您的伙伴`,
        [
          {
            text: '我知道了',
            onPress: () => {
              console.log('邀请码已复制:', coupleInfo.inviteCode);
              onComplete(coupleInfo);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('创建失败', error instanceof Error ? error.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!partnerName.trim()) {
      Alert.alert('提示', '请输入对方的配对名称');
      return;
    }

    if (!inviteCode.trim()) {
      Alert.alert('提示', '请输入邀请码');
      return;
    }

    if (!acceptPairing) {
      Alert.alert('提示', '请先开启接受配对功能');
      return;
    }

    try {
      setLoading(true);
      // 加入配对时，自动生成自己的配对名称或使用默认名称
      const defaultMyName = '我的伙伴'; // 可以后续让用户修改
      const coupleInfo = await CoupleService.joinCouple(
        defaultMyName,
        partnerName.trim(),
        inviteCode.trim().toUpperCase()
      );

      Alert.alert(
        '配对成功！',
        '您已成功连接到伙伴',
        [
          {
            text: '开始使用',
            onPress: () => onComplete(coupleInfo),
          },
        ]
      );
    } catch (error) {
      Alert.alert('加入失败', error instanceof Error ? error.message : '请检查配对名称和邀请码是否正确');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMyName('');
    setPartnerName('');
    setInviteCode('');
    setMode('select');
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 标题 */}
            <View style={styles.header}>
              <Text style={styles.title}>💕 情侣配对</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {mode === 'select' && (
              <View style={styles.content}>
                <Text style={styles.subtitle}>
                  与您的伙伴连接，分享彼此的心情
                </Text>

                <Card style={styles.optionCard}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => setMode('create')}
                  >
                    <Text style={styles.optionEmoji}>🎯</Text>
                    <Text style={styles.optionTitle}>创建配对</Text>
                    <Text style={styles.optionSubtitle}>
                      生成邀请码，邀请伙伴加入
                    </Text>
                  </TouchableOpacity>
                </Card>

                <Card style={styles.optionCard}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => setMode('join')}
                  >
                    <Text style={styles.optionEmoji}>🔗</Text>
                    <Text style={styles.optionTitle}>加入配对</Text>
                    <Text style={styles.optionSubtitle}>
                      输入伙伴的邀请码加入
                    </Text>
                  </TouchableOpacity>
                </Card>

                <View style={styles.features}>
                  <Text style={styles.featuresTitle}>功能特色：</Text>
                  <Text style={styles.featureItem}>• 实时心情同步</Text>
                  <Text style={styles.featureItem}>• 心情匹配度分析</Text>
                  <Text style={styles.featureItem}>• 情侣专属统计</Text>
                  <Text style={styles.featureItem}>• 纪念日提醒</Text>
                </View>
              </View>
            )}

            {mode === 'create' && (
              <View style={styles.content}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setMode('select')}
                >
                  <Text style={styles.backButtonText}>‹ 返回</Text>
                </TouchableOpacity>

                <Text style={styles.subtitle}>创建情侣配对</Text>

                <Card style={styles.formCard}>
                  <Text style={styles.inputLabel}>配对名称</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="输入您的配对名称"
                    placeholderTextColor={Colors.textSecondary}
                    value={myName}
                    onChangeText={setMyName}
                    maxLength={20}
                  />
                </Card>

                {/* 接受配对开关 */}
                <Card style={styles.formCard}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLeft}>
                      <Text style={styles.switchTitle}>接受配对</Text>
                      <Text style={styles.switchSubtitle}>开启后才能接收配对请求</Text>
                    </View>
                    <Switch
                      value={acceptPairing}
                      onValueChange={setAcceptPairing}
                      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                      thumbColor={acceptPairing ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                </Card>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleCreateCouple}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? '创建中...' : '创建配对'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 创建后将生成6位邀请码，请分享给您的伙伴
                  </Text>
                </View>
              </View>
            )}

            {mode === 'join' && (
              <View style={styles.content}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setMode('select')}
                >
                  <Text style={styles.backButtonText}>‹ 返回</Text>
                </TouchableOpacity>

                <Text style={styles.subtitle}>加入情侣配对</Text>

                <Card style={styles.formCard}>
                  <Text style={styles.inputLabel}>对方配对名称</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="配对测试"
                    placeholderTextColor={Colors.textSecondary}
                    value={partnerName}
                    onChangeText={setPartnerName}
                    maxLength={20}
                  />
                </Card>

                <Card style={styles.formCard}>
                  <Text style={styles.inputLabel}>邀请码</Text>
                  <TextInput
                    style={[styles.textInput, styles.codeInput]}
                    placeholder="输入6位邀请码"
                    placeholderTextColor={Colors.textSecondary}
                    value={inviteCode}
                    onChangeText={(text) => setInviteCode(text.toUpperCase())}
                    maxLength={6}
                    autoCapitalize="characters"
                  />
                </Card>

                {/* 接受配对开关 */}
                <Card style={styles.formCard}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLeft}>
                      <Text style={styles.switchTitle}>接受配对</Text>
                      <Text style={styles.switchSubtitle}>开启后才能完成配对</Text>
                    </View>
                    <Switch
                      value={acceptPairing}
                      onValueChange={setAcceptPairing}
                      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                      thumbColor={acceptPairing ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                </Card>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleJoinCouple}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? '连接中...' : '加入配对'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 请输入对方的配对名称和6位邀请码即可加入
                  </Text>
                </View>
              </View>
            )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.md,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  optionCard: {
    marginBottom: Spacing.md,
  },
  optionButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  optionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  optionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  featuresTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  featureItem: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    letterSpacing: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  disabledButton: {
    backgroundColor: Colors.border,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
  },
  infoBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
