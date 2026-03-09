import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'medium',
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[padding],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  
  // 变体样式
  default: {
    backgroundColor: Colors.surface,
  },
  primary: {
    backgroundColor: Colors.primaryLight,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  
  // 内边距样式
  none: {
    padding: 0,
  },
  small: {
    padding: Spacing.sm,
  },
  medium: {
    padding: Spacing.md,
  },
  large: {
    padding: Spacing.lg,
  },
});
