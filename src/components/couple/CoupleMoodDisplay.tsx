import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { Card } from '../common/Card';
import { CoupleService } from '../../services/CoupleService';
import { MoodRecord } from '../../services/MoodStorage';

interface CoupleMoodDisplayProps {
  date: string;
  onMoodPress?: (date: string, isMyMood: boolean) => void;
}

interface CombinedMoodData {
  myMood: MoodRecord | null;
  partnerMood: any | null;
  compatibility: number;
  message: string;
}

const moodColors = {
  happy: '#FFD700',
  excited: '#FF69B4',
  neutral: '#DDA0DD',
  sad: '#87CEEB',
  angry: '#FF6347',
};

const moodLabels = {
  happy: '开心',
  excited: '兴奋',
  neutral: '平淡',
  sad: '难过',
  angry: '生气',
};

export const CoupleMoodDisplay: React.FC<CoupleMoodDisplayProps> = ({
  date,
  onMoodPress,
}) => {
  const [moodData, setMoodData] = useState<CombinedMoodData>({
    myMood: null,
    partnerMood: null,
    compatibility: 0,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const [coupleConnected, setCoupleConnected] = useState(false);

  useEffect(() => {
    loadMoodData();
    checkCoupleConnection();
  }, [date]);

  const checkCoupleConnection = async () => {
    const connected = await CoupleService.isConnected();
    setCoupleConnected(connected);
  };

  const loadMoodData = async () => {
    try {
      setLoading(true);
      const data = await CoupleService.getCombinedMoodByDate(date);
      setMoodData(data);
    } catch (error) {
      console.error('加载心情数据失败:', error);
    } finally {
      setLoading(false);
    }
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

  const getCompatibilityColor = (compatibility: number) => {
    if (compatibility >= 80) return '#4CAF50';
    if (compatibility >= 60) return '#FF9800';
    if (compatibility >= 40) return '#FFC107';
    return '#F44336';
  };

  const getCompatibilityEmoji = (compatibility: number) => {
    if (compatibility >= 80) return '💕';
    if (compatibility >= 60) return '😊';
    if (compatibility >= 40) return '😐';
    return '😔';
  };

  if (!coupleConnected) {
    return null; // 未配对时不显示
  }

  if (loading) {
    return (
      <Card style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text style={styles.dateTitle}>{formatDate(date)} 的心情</Text>
      
      <View style={styles.moodContainer}>
        {/* 我的心情 */}
        <TouchableOpacity
          style={[
            styles.moodCard,
            styles.myMoodCard,
            moodData.myMood && { backgroundColor: moodColors[moodData.myMood.mood as keyof typeof moodColors] },
          ]}
          onPress={() => onMoodPress?.(date, true)}
        >
          <Text style={styles.moodCardTitle}>我</Text>
          {moodData.myMood ? (
            <>
              <Text style={styles.moodEmoji}>{moodData.myMood.emoji}</Text>
              <Text style={styles.moodLabel}>
                {moodLabels[moodData.myMood.mood as keyof typeof moodLabels]}
              </Text>
              {moodData.myMood.intensity && (
                <View style={styles.intensityContainer}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.intensityStar,
                        i < moodData.myMood!.intensity! && styles.intensityStarActive,
                      ]}
                    >
                      ⭐
                    </Text>
                  ))}
                </View>
              )}
              {moodData.myMood.note && (
                <Text style={styles.moodNote} numberOfLines={2}>
                  {moodData.myMood.note}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyMood}>
              <Text style={styles.emptyMoodEmoji}>❓</Text>
              <Text style={styles.emptyMoodText}>点击记录</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 心情匹配度 */}
        {moodData.myMood && moodData.partnerMood && (
          <View style={styles.compatibilityContainer}>
            <Text style={styles.compatibilityEmoji}>
              {getCompatibilityEmoji(moodData.compatibility)}
            </Text>
            <Text
              style={[
                styles.compatibilityText,
                { color: getCompatibilityColor(moodData.compatibility) },
              ]}
            >
              {moodData.compatibility}%
            </Text>
          </View>
        )}

        {/* 伙伴的心情 */}
        <TouchableOpacity
          style={[
            styles.moodCard,
            styles.partnerMoodCard,
            moodData.partnerMood && { backgroundColor: moodColors[moodData.partnerMood.mood as keyof typeof moodColors] },
          ]}
          onPress={() => onMoodPress?.(date, false)}
        >
          <Text style={styles.moodCardTitle}>TA</Text>
          {moodData.partnerMood ? (
            <>
              <Text style={styles.moodEmoji}>{moodData.partnerMood.emoji}</Text>
              <Text style={styles.moodLabel}>
                {moodLabels[moodData.partnerMood.mood as keyof typeof moodLabels]}
              </Text>
              {moodData.partnerMood.intensity && (
                <View style={styles.intensityContainer}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.intensityStar,
                        i < moodData.partnerMood!.intensity! && styles.intensityStarActive,
                      ]}
                    >
                      ⭐
                    </Text>
                  ))}
                </View>
              )}
              {moodData.partnerMood.note && (
                <Text style={styles.moodNote} numberOfLines={2}>
                  {moodData.partnerMood.note}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyMood}>
              <Text style={styles.emptyMoodEmoji}>⏳</Text>
              <Text style={styles.emptyMoodText}>等待中</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 心情消息 */}
      <Text style={styles.messageText}>{moodData.message}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    padding: Spacing.lg,
  },
  dateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  moodCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  myMoodCard: {
    marginRight: Spacing.sm,
  },
  partnerMoodCard: {
    marginLeft: Spacing.sm,
  },
  moodCardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  moodLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  intensityContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  intensityStar: {
    fontSize: 8,
    color: Colors.surface,
    opacity: 0.3,
  },
  intensityStarActive: {
    opacity: 1,
  },
  moodNote: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    textAlign: 'center',
    opacity: 0.9,
  },
  emptyMood: {
    alignItems: 'center',
  },
  emptyMoodEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
    opacity: 0.5,
  },
  emptyMoodText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  compatibilityContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  compatibilityEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  compatibilityText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  messageText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
