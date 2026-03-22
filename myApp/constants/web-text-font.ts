import { Platform, type TextStyle } from 'react-native';

import { ROSTELECOM_FONT } from '@/constants/rostelecom-fonts';

/**
 * Rostelecom Basis (expo-font в _layout).
 * По умолчанию везде **Bold**; Regular / Medium / Light — при необходимости контраста.
 */
const WEB_FALLBACK =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const WEB_BOLD_FIRST = `'${ROSTELECOM_FONT.bold}', '${ROSTELECOM_FONT.regular}', ${WEB_FALLBACK}`;

export const webTextFont: TextStyle = {
  fontFamily: Platform.OS === 'web' ? WEB_BOLD_FIRST : ROSTELECOM_FONT.bold,
};

/** То же, что webTextFont — для явных мест «жирный из файла» */
export const webTextFontBold: TextStyle = {
  fontFamily: Platform.OS === 'web' ? WEB_BOLD_FIRST : ROSTELECOM_FONT.bold,
};

export const webTextFontRegular: TextStyle = {
  fontFamily: Platform.OS === 'web'
    ? `'${ROSTELECOM_FONT.regular}', ${WEB_BOLD_FIRST}`
    : ROSTELECOM_FONT.regular,
};

export const webTextFontMedium: TextStyle = {
  fontFamily: Platform.OS === 'web'
    ? `'${ROSTELECOM_FONT.medium}', ${WEB_BOLD_FIRST}`
    : ROSTELECOM_FONT.medium,
};

export const webTextFontLight: TextStyle = {
  fontFamily: Platform.OS === 'web'
    ? `'${ROSTELECOM_FONT.light}', ${WEB_BOLD_FIRST}`
    : ROSTELECOM_FONT.light,
};
