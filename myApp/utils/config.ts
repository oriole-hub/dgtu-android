import { Platform } from 'react-native';

/**
 * Базовый URL API.
 *
 * - **Веб + development:** запросы идут на тот же origin, что и Metro (`/api/dstu/...`),
 *   см. `metro.config.js` — прокси на `https://dstu.devoriole.ru` (обход CORS в браузере).
 * - **Продакшен веб / нативка:** прямой URL бэкенда, либо `EXPO_PUBLIC_API_BASE_URL`.
 */
function normalizeApiBase(url: string): string {
  const u = url.trim().replace(/\/+$/, '');
  return `${u}/`;
}

export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return normalizeApiBase(fromEnv);
  }

  if (
    Platform.OS === 'web' &&
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    typeof window !== 'undefined' &&
    window.location
  ) {
    const { protocol, hostname, port } = window.location;
    const p = port ? `:${port}` : '';
    return normalizeApiBase(`${protocol}//${hostname}${p}/api/dstu`);
  }

  return normalizeApiBase('https://dstu.devoriole.ru');
}
