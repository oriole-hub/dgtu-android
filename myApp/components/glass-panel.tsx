import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** Лёгкий жёлтый оттенок как «История» в макете */
  variant?: 'default' | 'warm';
};

/** Карточка в стиле стекла (полупрозрачная, скругления, тень) */
export function GlassPanel({ children, style, variant = 'default' }: Props) {
  return (
    <View style={[styles.base, variant === 'warm' && styles.warm, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.87)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  warm: {
    backgroundColor: 'rgba(255, 245, 220, 0.82)',
    borderColor: 'rgba(255, 220, 160, 0.5)',
  },
});
