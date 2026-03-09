import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { NotificationService, NotificationSettings as Settings } from '../../services/NotificationService';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const DAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  visible,
  onClose,
}) => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    time: '20:00',
    days: [1, 2, 3, 4, 5, 6, 0],
  });
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await NotificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('加载通知设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      const success = await NotificationService.saveSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        Alert.alert('设置已保存', '通知提醒已更新');
      } else {
        Alert.alert('保存失败', '请重试');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      Alert.alert('保存失败', '请重试');
    }
  };

  const handleEnabledChange = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    saveSettings(newSettings);
  };

  const handleTimeChange = (time: string) => {
    const newSettings = { ...settings, time };
    saveSettings(newSettings);
    setShowTimePicker(false);
  };

  const handleDayToggle = (day: number) => {
    const newDays = settings.days.includes(day)
      ? settings.days.filter(d => d !== day)
      : [...settings.days, day].sort();
    
    if (newDays.length === 0) {
      Alert.alert('提示', '至少选择一天');
      return;
    }

    const newSettings = { ...settings, days: newDays };
    saveSettings(newSettings);
  };

  const handleTestNotification = async () => {
    try {
      const success = await NotificationService.sendTestNotification();
      if (success) {
        Alert.alert('测试通知已发送', '请查看通知是否正常显示');
      } else {
        Alert.alert('发送失败', '请检查通知权限设置');
      }
    } catch (error) {
      Alert.alert('发送失败', '请重试');
    }
  };

  const getQuickDayOptions = () => [
    {
      label: '每天',
      days: [1, 2, 3, 4, 5, 6, 0],
      active: settings.days.length === 7,
    },
    {
      label: '工作日',
      days: [1, 2, 3, 4, 5],
      active: settings.days.length === 5 && !settings.days.includes(0) && !settings.days.includes(6),
    },
    {
      label: '周末',
      days: [6, 0],
      active: settings.days.length === 2 && settings.days.includes(0) && settings.days.includes(6),
    },
  ];

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 标题 */}
            <View style={styles.header}>
              <Text style={styles.title}>🔔 通知设置</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 开启/关闭通知 */}
            <Card style={styles.sectionCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>启用提醒</Text>
                  <Text style={styles.settingSubtitle}>每日心情记录提醒</Text>
                </View>
                <Switch
                  value={settings.enabled}
                  onValueChange={handleEnabledChange}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={settings.enabled ? Colors.primary : Colors.textSecondary}
                />
              </View>
            </Card>

            {settings.enabled && (
              <>
                {/* 提醒时间 */}
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>⏰ 提醒时间</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeButtonText}>
                      {NotificationService.formatTime(settings.time)}
                    </Text>
                    <Text style={styles.timeButtonArrow}>›</Text>
                  </TouchableOpacity>
                </Card>

                {/* 提醒日期 */}
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>📅 提醒日期</Text>
                  
                  {/* 快速选择 */}
                  <View style={styles.quickOptionsContainer}>
                    {getQuickDayOptions().map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.quickOption,
                          option.active && styles.activeQuickOption,
                        ]}
                        onPress={() => {
                          const newSettings = { ...settings, days: option.days };
                          saveSettings(newSettings);
                        }}
                      >
                        <Text style={[
                          styles.quickOptionText,
                          option.active && styles.activeQuickOptionText,
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 详细选择 */}
                  <View style={styles.dayOptionsContainer}>
                    {DAY_OPTIONS.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayOption,
                          settings.days.includes(day.value) && styles.activeDayOption,
                        ]}
                        onPress={() => handleDayToggle(day.value)}
                      >
                        <Text style={[
                          styles.dayOptionText,
                          settings.days.includes(day.value) && styles.activeDayOptionText,
                        ]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                {/* 测试通知 */}
                <Card style={styles.sectionCard}>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={handleTestNotification}
                  >
                    <Text style={styles.testButtonText}>📱 发送测试通知</Text>
                  </TouchableOpacity>
                </Card>
              </>
            )}

            {/* 当前设置摘要 */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📋 当前设置</Text>
              <Text style={styles.summaryText}>
                状态: {settings.enabled ? '已启用' : '已禁用'}
              </Text>
              {settings.enabled && (
                <>
                  <Text style={styles.summaryText}>
                    时间: {NotificationService.formatTime(settings.time)}
                  </Text>
                  <Text style={styles.summaryText}>
                    日期: {NotificationService.formatDays(settings.days)}
                  </Text>
                </>
              )}
            </Card>
          </ScrollView>

          {/* 时间选择器 */}
          <Modal
            visible={showTimePicker}
            transparent
            animationType="fade"
          >
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <Text style={styles.timePickerTitle}>选择提醒时间</Text>
                <ScrollView style={styles.timePickerScroll}>
                  {TIME_OPTIONS.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeOption,
                        time === settings.time && styles.activeTimeOption,
                      ]}
                      onPress={() => handleTimeChange(time)}
                    >
                      <Text style={[
                        styles.timeOptionText,
                        time === settings.time && styles.activeTimeOptionText,
                      ]}>
                        {NotificationService.formatTime(time)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.timePickerCancel}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.timePickerCancelText}>取消</Text>
                </TouchableOpacity>
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
  loadingText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    padding: Spacing.xl,
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
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  timeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  timeButtonArrow: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  quickOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  activeQuickOption: {
    backgroundColor: Colors.primary,
  },
  quickOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  activeQuickOptionText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  dayOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayOption: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  activeDayOption: {
    backgroundColor: Colors.primary,
  },
  dayOptionText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
  },
  activeDayOptionText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  testButton: {
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.background,
  },
  summaryTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '80%',
    maxHeight: '60%',
  },
  timePickerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  timePickerScroll: {
    maxHeight: 200,
  },
  timeOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  activeTimeOption: {
    backgroundColor: Colors.primary,
  },
  timeOptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  activeTimeOptionText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  timePickerCancel: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
});
