import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Colors, FontSizes, Spacing } from '../constants/Colors';
import { MoodAnalytics } from '../components/analytics/MoodAnalytics';

interface MoodAnalyticsScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export const MoodAnalyticsScreen: React.FC<MoodAnalyticsScreenProps> = ({ navigation, onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (onBack) {
              onBack();
            } else {
              navigation?.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>心情分析</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 分析内容 */}
      <MoodAnalytics currentDate={currentDate} />
    </SafeAreaView>
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
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
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
  placeholder: {
    width: 60, // 与返回按钮宽度相同，保持居中
  },
});
