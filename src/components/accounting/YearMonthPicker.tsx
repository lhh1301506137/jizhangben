import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';

interface YearMonthPickerProps {
  visible: boolean;
  currentYear: number;
  currentMonth: number;
  onClose: () => void;
  onConfirm: (year: number, month: number) => void;
}

export const YearMonthPicker: React.FC<YearMonthPickerProps> = ({
  visible,
  currentYear,
  currentMonth,
  onClose,
  onConfirm,
}) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // 生成年份列表（当前年份前后各5年）
  const generateYears = (): number[] => {
    const currentYearNow = new Date().getFullYear();
    const years = [];
    for (let i = currentYearNow - 5; i <= currentYearNow + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // 生成月份列表
  const generateMonths = (): number[] => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const years = generateYears();
  const months = generateMonths();

  const handleConfirm = () => {
    onConfirm(selectedYear, selectedMonth);
    onClose();
  };

  const renderYearItem = (year: number) => (
    <TouchableOpacity
      key={year}
      style={[
        styles.yearItem,
        selectedYear === year && styles.selectedYearItem,
      ]}
      onPress={() => setSelectedYear(year)}
    >
      <Text style={[
        styles.yearText,
        selectedYear === year && styles.selectedYearText,
      ]}>
        {year}年
      </Text>
    </TouchableOpacity>
  );

  const renderMonthItem = (month: number) => (
    <TouchableOpacity
      key={month}
      style={[
        styles.monthItem,
        selectedMonth === month && styles.selectedMonthItem,
      ]}
      onPress={() => setSelectedMonth(month)}
    >
      <Text style={[
        styles.monthText,
        selectedMonth === month && styles.selectedMonthText,
      ]}>
        {month}月
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>选择年月</Text>
          
          <View style={styles.pickerContainer}>
            {/* 年份选择 */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionTitle}>年份</Text>
              <ScrollView 
                style={styles.yearScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.yearScrollContent}
              >
                {years.map(renderYearItem)}
              </ScrollView>
            </View>

            {/* 月份选择 */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionTitle}>月份</Text>
              <ScrollView 
                style={styles.monthScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.monthScrollContent}
              >
                {months.map(renderMonthItem)}
              </ScrollView>
            </View>
          </View>

          {/* 按钮区域 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>确定</Text>
            </TouchableOpacity>
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
    padding: Spacing.lg,
    width: '80%',
    maxHeight: '70%',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 300,
  },
  pickerSection: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  yearScrollView: {
    flex: 1,
  },
  yearScrollContent: {
    paddingVertical: Spacing.sm,
  },
  monthScrollView: {
    flex: 1,
  },
  monthScrollContent: {
    paddingVertical: Spacing.sm,
  },
  yearItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  selectedYearItem: {
    backgroundColor: Colors.primary,
  },
  yearText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedYearText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  monthItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  selectedMonthItem: {
    backgroundColor: Colors.primary,
  },
  monthText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedMonthText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  confirmButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
    textAlign: 'center',
  },
});
