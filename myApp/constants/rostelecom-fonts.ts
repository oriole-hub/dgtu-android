/**
 * Rostelecom Basis — файлы в assets/rostelecom-basis-font/
 * Ключи совпадают с fontFamily в стилях.
 */
export const ROSTELECOM_FONT = {
  light: 'RostelecomBasis-Light',
  regular: 'RostelecomBasis-Regular',
  medium: 'RostelecomBasis-Medium',
  bold: 'RostelecomBasis-Bold',
} as const;

export const rostelecomFontAssets = {
  [ROSTELECOM_FONT.light]: require('@/assets/rostelecom-basis-font/RostelecomBasis-Light.otf'),
  [ROSTELECOM_FONT.regular]: require('@/assets/rostelecom-basis-font/RostelecomBasis-Regular.otf'),
  [ROSTELECOM_FONT.medium]: require('@/assets/rostelecom-basis-font/RostelecomBasis-Medium.otf'),
  [ROSTELECOM_FONT.bold]: require('@/assets/rostelecom-basis-font/RostelecomBasis-Bold.otf'),
} as const;
