import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/Colors';
import { AccountRecord, AccountType, AccountCategory, AccountingService } from '../../services/AccountingService';

interface AddRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (record: Omit<AccountRecord, 'id' | 'timestamp'>) => void;
  defaultType?: AccountType;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<AccountType>(defaultType);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<AccountCategory[]>([]);

  useEffect(() => {
    if (visible) {
      setType(defaultType); // 设置默认类型
      loadCategories();
      resetForm();
    }
  }, [visible, defaultType]);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [type]);

  const loadCategories = async () => {
    try {
      const categoryList = await AccountingService.getCategories(type);
      setCategories(categoryList);
      
      // 设置默认分类
      if (categoryList.length > 0 && !selectedCategory) {
        setSelectedCategory(categoryList[0].id);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory('');
  };

  const handleSubmit = async () => {
    // 验证输入
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('错误', '请输入有效的金额');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('错误', '请选择分类');
      return;
    }

    // 备注是可选的，不需要验证

    try {
      const { AuthService } = await import('../../services/AuthService');

      // 检查 AuthService 是否正确初始化
      if (!AuthService || typeof AuthService.getCurrentUser !== 'function') {
        console.error('AuthService 未正确初始化');
        Alert.alert('错误', '用户服务未初始化，请重新登录');
        return;
      }

      const currentUser = await AuthService.getCurrentUser();

      if (!currentUser) {
        console.error('无法获取当前用户信息');
        Alert.alert('错误', '无法获取用户信息，请重新登录');
        return;
      }

      const record: Omit<AccountRecord, 'id' | 'timestamp'> = {
        type,
        amount: parseFloat(amount),
        category: selectedCategory,
        description: description.trim() || '', // 允许空备注
        date: new Date().toISOString().split('T')[0],
        userId: currentUser.id,
      };

      onSubmit(record);
    } catch (error) {
      console.error('提交记录失败:', error);
      Alert.alert('错误', '提交失败，请重试');
    }
  };

  const getCategoryInfo = (categoryId: string): AccountCategory | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>添加记录</Text>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 类型选择 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>记录类型</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    styles.incomeButton,
                    type === 'income' && styles.activeTypeButton,
                  ]}
                  onPress={() => setType('income')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'income' && styles.activeTypeButtonText,
                  ]}>
                    💰 收入
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    styles.expenseButton,
                    type === 'expense' && styles.activeTypeButton,
                  ]}
                  onPress={() => setType('expense')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'expense' && styles.activeTypeButtonText,
                  ]}>
                    💸 支出
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 金额输入 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>金额</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>¥</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            {/* 分类选择 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>分类</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategory === category.id && styles.activeCategoryItem,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={[
                      styles.categoryName,
                      selectedCategory === category.id && styles.activeCategoryName,
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 备注输入 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>备注 (可选)</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="请输入备注..."
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.textSecondary}
              />
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  submitButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  incomeButton: {
    backgroundColor: Colors.surface,
  },
  expenseButton: {
    backgroundColor: Colors.surface,
  },
  activeTypeButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  activeTypeButtonText: {
    color: Colors.primary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  currencySymbol: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  activeCategoryItem: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  categoryName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    textAlign: 'center',
  },
  activeCategoryName: {
    color: Colors.primary,
    fontWeight: '600',
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
    textAlignVertical: 'top',
  },
});
