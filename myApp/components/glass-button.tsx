import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { webTextFont } from '@/constants/web-text-font';

type Props = {
  title: string;
  onPress: () => void;
  /** Широкая кнопка как «Зарегистрироваться» */
  variant?: 'large' | 'medium';
  disabled?: boolean;
  children?: ReactNode;
  /** Доп. стили контейнера (отступы, выравнивание) */
  containerStyle?: ViewStyle;
};

/** Псевдо «liquid glass»: полупрозрачная подложка + тень (как в макете) */
export function GlassButton({
  title,
  onPress,
  variant = 'medium',
  disabled,
  children,
  containerStyle,
}: Props) {
  const sizeStyle: ViewStyle =
    variant === 'large'
      ? { minHeight: 59, paddingVertical: 14, paddingHorizontal: 24, width: '100%' }
      : { minHeight: 42, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        containerStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {children ?? (
        <Text
          style={[webTextFont, styles.text, variant === 'large' && styles.textLarge]}
          numberOfLines={2}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#101828',
    fontSize: 16,
    letterSpacing: -0.48,
  },
  textLarge: {
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.72,
    textAlign: 'center',
  },
});
