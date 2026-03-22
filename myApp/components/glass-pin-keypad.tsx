import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { webTextFont } from '@/constants/web-text-font';

const KEY_SIZE = 78;

/** Веб: как в макете. Натив: тонкая мягкая обводка + continuous на iOS — без «ромбиков» у круга (артефакт жёсткого border). */
const KEY_EDGE: ViewStyle =
  Platform.OS === 'web'
    ? {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
      }
    : {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.42)',
        ...(Platform.OS === 'ios' ? ({ borderCurve: 'continuous' } as const) : {}),
      };

const ROWS: (string | 'del')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

type Props = {
  onDigit: (d: string) => void;
  onDelete: () => void;
};

/** Круглые стеклянные клавиши как в макете */
export function GlassPinKeypad({ onDigit, onDelete }: Props) {
  return (
    <View style={styles.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) => {
            if (key === '') {
              return <View key={`e-${ki}`} style={styles.cell} />;
            }
            if (key === 'del') {
              return (
                <Pressable
                  key="del"
                  accessibilityRole="button"
                  accessibilityLabel="Удалить"
                  onPress={onDelete}
                  style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
                  <MaterialCommunityIcons name="backspace-outline" size={24} color="#000000" />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => onDigit(key)}
                style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
                <Text style={styles.digit}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  cell: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    ...KEY_EDGE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: Platform.OS === 'web' ? 18 : 20,
    elevation: Platform.OS === 'android' ? 6 : 7,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.978 }],
  },
  digit: {
    ...webTextFont,
    fontSize: 30,
    color: '#000000',
    letterSpacing: -0.4,
  },
});
