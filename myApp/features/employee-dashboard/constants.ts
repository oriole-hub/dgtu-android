export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/** Ключ для expo-screen-capture */
export const QR_SCREEN_CAPTURE_KEY = 'qr-pass-modal';

/** Срок жизни QR на клиенте, если с сервера нет валидной даты */
export const PASS_TTL_MS = 5 * 60 * 1000;
