import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';

export type MoodType = 'happy' | 'sad' | 'neutral' | 'excited' | 'angry';

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
}

interface MoodDetailModalProps {
  visible: boolean;
  date: string;
  existingMood?: {
    mood: MoodType;
    emoji: string;
    note?: string;
    intensity?: number;
  };
  onSave: (mood: MoodType, emoji: string, note: string, intensity: number) => void;
  onCancel: () => void;
}

const moodOptions: MoodOption[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: Colors.mood.happy },
  { type: 'excited', emoji: '🥳', label: '兴奋', color: Colors.mood.excited },
  { type: 'neutral', emoji: '😐', label: '平淡', color: Colors.mood.neutral },
  { type: 'sad', emoji: '😢', label: '难过', color: Colors.mood.sad },
  { type: 'angry', emoji: '😠', label: '生气', color: Colors.mood.angry },
];

const intensityLabels = ['很轻微', '轻微', '一般', '强烈', '非常强烈'];
const intensityEmojis = ['🌱', '🌿', '🌳', '🔥', '💥'];

export const MoodDetailModal: React.FC<MoodDetailModalProps> = ({
  visible,
  date,
  existingMood,
  onSave,
  onCancel,
}) => {
  const [selectedMood, setSelectedMood] = useState<MoodType>('happy');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😊');
  const [note, setNote] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);

  // 初始化表单数据
  useEffect(() => {
    if (existingMood) {
      setSelectedMood(existingMood.mood);
      setSelectedEmoji(existingMood.emoji);
      setNote(existingMood.note || '');
      setIntensity(existingMood.intensity || 3);
    } else {
      // 重置为默认值
      setSelectedMood('happy');
      setSelectedEmoji('😊');
      setNote('');
      setIntensity(3);
    }
  }, [existingMood, visible]);

  const handleMoodSelect = (mood: MoodType, emoji: string) => {
    setSelectedMood(mood);
    setSelectedEmoji(emoji);
  };

  const handleSave = () => {
    if (!selectedMood) {
      Alert.alert('提示', '请选择心情类型');
      return;
    }

    onSave(selectedMood, selectedEmoji, note.trim(), intensity);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return '今天';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 标题 */}
            <Text style={styles.modalTitle}>
              记录{formatDate(date)}的心情
            </Text>

            {/* 心情选择 */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💭 选择心情</Text>
              <View style={styles.moodOptionsContainer}>
                {moodOptions.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.moodOption,
                      { backgroundColor: option.color },
                      selectedMood === option.type && styles.selectedMoodOption,
                    ]}
                    onPress={() => handleMoodSelect(option.type, option.emoji)}
                  >
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    <Text style={styles.moodLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 心情强度 */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌟 心情强度</Text>
              <View style={styles.intensityContainer}>
                {intensityLabels.map((label, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.intensityOption,
                      intensity === index + 1 && styles.selectedIntensityOption,
                    ]}
                    onPress={() => setIntensity(index + 1)}
                  >
                    <Text style={styles.intensityEmoji}>{intensityEmojis[index]}</Text>
                    <Text style={[
                      styles.intensityLabel,
                      intensity === index + 1 && styles.selectedIntensityLabel,
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 心情备注 */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📝 心情备注</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="记录今天发生的事情或心情感受..."
                placeholderTextColor={Colors.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.noteCounter}>{note.length}/200</Text>
            </Card>

            {/* 按钮组 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {existingMood ? '更新' : '保存'}
                </Text>
              </TouchableOpacity>
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
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
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
  moodOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  selectedMoodOption: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  selectedIntensityOption: {
    backgroundColor: Colors.primary,
  },
  intensityEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  intensityLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedIntensityLabel: {
    color: Colors.surface,
    fontWeight: '600',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  noteCounter: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
});
