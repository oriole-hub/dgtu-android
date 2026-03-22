import AsyncStorage from '@react-native-async-storage/async-storage';

import { getApiBaseUrl } from '@/utils/config';
import { clearPinHash } from '@/utils/local-pin';
import { normalizeUserOut, type UserOut, type UserRole } from '@/utils/api';

export type { UserOut, UserRole } from '@/utils/api';

const AUTH_TOKEN_KEY = 'auth_access_token';

const LOG_PREFIX = '[API]';

function logRequest(method: string, url: string, body?: unknown) {
  console.log(`${LOG_PREFIX} → ${method} ${url}`, body !== undefined ? body : '');
}

function logResponse(url: string, status: number, body: unknown) {
  console.log(`${LOG_PREFIX} ← ${url} status=${status}`, body);
}

type LoginResponse = {
  access_token: string;
  token_type?: string;
};

let meCacheUser: UserOut | null = null;
let meCacheToken: string | null = null;

/** Сброс кэша профиля (выход, смена токена). */
export function invalidateMeCache() {
  meCacheUser = null;
  meCacheToken = null;
}

/**
 * `GET {apiBase}auth/me` — профиль и поля статистики (`late_minutes_today`, `last_in_at`, …).
 * Всегда ходит в сеть. В экранах чаще {@link fetchMeCached}.
 */
export async function fetchMe(token: string): Promise<UserOut> {
  const url = `${getApiBaseUrl().replace(/\/$/, '')}/auth/me`;
  logRequest('GET', url, { Authorization: 'Bearer ***' });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let responseBody: unknown;
  try {
    const text = await response.clone().text();
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = await response.text();
  }

  logResponse(url, response.status, responseBody);

  if (!response.ok) {
    throw new Error('Me request failed');
  }

  const user = normalizeUserOut(responseBody);
  meCacheUser = user;
  meCacheToken = token;
  return user;
}

/**
 * Тот же ответ, что GET /auth/me, но один раз на пару «токен + сессия»:
 * повторные вызовы с тем же токеном берутся из памяти (без спама в API).
 */
export async function fetchMeCached(token: string): Promise<UserOut> {
  if (meCacheUser !== null && meCacheToken === token) {
    return meCacheUser;
  }
  return fetchMe(token);
}

/** После входа открывается главный экран приложения. */
export function getHomePathForRole(_role: UserRole): '/dashboard' {
  return '/dashboard';
}

export async function getStoredToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function storeToken(token: string) {
  invalidateMeCache();
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Только токен (PIN на устройстве сохраняется — для «Назад» с ввода пина к форме логина). */
export async function clearSessionTokenOnly() {
  invalidateMeCache();
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Выход: токен + локальный PIN. */
export async function clearStoredToken() {
  invalidateMeCache();
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await clearPinHash();
}

export async function loginWithPassword(login: string, pwd: string) {
  const url = `${getApiBaseUrl().replace(/\/$/, '')}/auth/login`;
  logRequest('POST', url, { login, pwd: '***' });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ login, pwd }),
  });

  let responseBody: unknown;
  try {
    const text = await response.clone().text();
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = await response.text();
  }

  logResponse(url, response.status, responseBody);

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = responseBody as LoginResponse;
  if (!data.access_token) {
    throw new Error('No access token returned');
  }

  return data.access_token;
}

export async function logoutWithToken(token: string) {
  const url = `${getApiBaseUrl().replace(/\/$/, '')}/auth/logout`;
  logRequest('POST', url, { Authorization: 'Bearer ***' });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let responseBody: unknown;
  try {
    const text = await response.clone().text();
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = await response.text();
  }

  logResponse(url, response.status, responseBody);

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}
