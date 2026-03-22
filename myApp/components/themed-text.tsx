import { StyleSheet, Text, type TextProps } from 'react-native';

import { webTextFont, webTextFontMedium } from '@/constants/web-text-font';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        webTextFont,
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? [webTextFontMedium, styles.defaultSemiBold] : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [webTextFontMedium, styles.link] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
  },
  /** Цвет текста — из темы (на светлой теме чёрный), не ссылочный синий */
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});
