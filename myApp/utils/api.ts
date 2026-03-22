/**
 * Клиент API dgtu-back (все пути из OpenAPI).
 * Логи в консоль: [API] → / ←
 */

import { getApiBaseUrl } from '@/utils/config';

const LOG_PREFIX = '[API]';

function joinUrl(path: string): string {
  const b = getApiBaseUrl().replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${b}/${p}`;
}

function logRequest(method: string, url: string, body?: unknown) {
  console.log(`${LOG_PREFIX} → ${method} ${url}`, body !== undefined ? body : '');
}

function logResponse(url: string, status: number, body: unknown) {
  console.log(`${LOG_PREFIX} ← ${url} status=${status}`, body);
}

async function parseBody(response: Response): Promise<unknown> {
  try {
    const text = await response.clone().text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return await response.text();
  }
}

async function apiRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    skipJsonBody?: boolean;
  }
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = joinUrl(path);
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined && !options.skipJsonBody) {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = {
    method,
    headers,
    body:
      options.body !== undefined && !options.skipJsonBody
        ? JSON.stringify(options.body)
        : undefined,
  };

  const safeLogBody =
    options.body !== undefined && !options.skipJsonBody
      ? typeof options.body === 'object' && options.body !== null
        ? { ...options.body, pwd: '***' }
        : options.body
      : options.token
        ? { Authorization: 'Bearer ***' }
        : '';

  logRequest(method, url, safeLogBody);

  const response = await fetch(url, init);
  const data = await parseBody(response);
  logResponse(url, response.status, data);

  return { ok: response.ok, status: response.status, data };
}

function assertOk<T>(result: { ok: boolean; data: unknown }, label: string): T {
  if (!result.ok) {
    throw new Error(label);
  }
  return result.data as T;
}

// --- Типы (OpenAPI 3.1 dgtu-back) ---

/** OpenAPI: `UserRole` enum */
export type UserRole = 'office_head' | 'admin' | 'employee' | 'guest';

/** POST /auth/login */
export type LoginIn = {
  login: string;
  pwd: string;
};

/** Ответ логина */
export type TokenOut = {
  access_token: string;
  token_type?: string;
};

/** POST /auth/forgot-password */
export type ForgotPasswordIn = {
  email: string;
};

export type ForgotPasswordOut = {
  ok?: boolean;
};

export type RegisterIn = {
  full_name: string;
  email: string;
  login: string;
  pwd: string;
};

/** POST /auth/admins */
export type AdminCreateIn = RegisterIn & {
  office_id: number;
  role?: UserRole;
};

/** POST /auth/employees */
export type EmployeeCreateIn = RegisterIn & {
  office_id: number;
  job_title: string;
  account_expires_at?: string | null;
  pass_limit_total?: number | null;
};

/** POST /auth/guests */
export type GuestCreateIn = RegisterIn & {
  office_id: number;
  creation_purpose: string;
  account_expires_at?: string | null;
  pass_limit_total?: number | null;
};

/** POST /auth/bootstrap-office-head */
export type BootstrapOfficeHeadIn = RegisterIn & {
  office_name: string;
  office_address: string;
  office_city: string;
  office_is_active?: boolean;
};

export type UserUpdateIn = {
  full_name?: string | null;
  email?: string | null;
  role?: UserRole | null;
  office_id?: number | null;
  account_expires_at?: string | null;
  pass_limit_total?: number | null;
  referral_count?: number | null;
  job_title?: string | null;
  account_creation_purpose?: string | null;
};

/** Офис в ответе GET /auth/me */
export type OfficeOut = {
  id: number;
  name: string;
  address: string;
  city: string;
  /** WGS84, если бэкенд отдаёт — для карты «офис / вы» */
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  work_start_time: string;
  iana_timezone: string;
  created_by_user_id: number;
  created_at: string;
};

/**
 * Ответ `GET /auth/me` (OpenAPI: `UserOut`, operationId `me_route_auth_me_get`).
 * Блок «Статистика» в приложении читает только поля ниже — отдельного эндпоинта для них нет.
 */
export type UserOut = {
  id: number;
  full_name: string;
  email: string;
  login: string;
  role: UserRole;
  office_id?: number;
  account_expires_at?: string | null;
  pass_limit_total?: number | null;
  passes_created_count: number;
  referral_count: number;
  created_by_user_id?: number | null;
  created_at: string;
  job_title?: string | null;
  account_creation_purpose?: string | null;
  office?: OfficeOut | null;
  /** OpenAPI: readOnly, вычисляемое поле */
  position: string;
  /** Активен ли аккаунт (GET /auth/me) */
  is_active?: boolean;
  /** Статистика / события — всё с `GET /auth/me` */
  last_in_at?: string | null;
  last_out_at?: string | null;
  last_break_out_at?: string | null;
  last_break_in_at?: string | null;
  last_break_duration_seconds?: number | null;
  late_minutes_today?: number | null;
  overtime_minutes_today?: number | null;
};

function pickFirst(r: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(r, k)) return r[k];
  }
  return undefined;
}

function coerceNum(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return v as null | undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeOfficeOut(raw: unknown): OfficeOut | null | undefined {
  if (raw === null || raw === undefined) return raw as null | undefined;
  if (typeof raw !== 'object') return raw as OfficeOut;
  const o = { ...(raw as Record<string, unknown>) };
  const lat = coerceNum(pickFirst(o, ['latitude', 'lat']));
  const lng = coerceNum(pickFirst(o, ['longitude', 'lng', 'lon']));
  if (lat !== undefined) o.latitude = lat;
  if (lng !== undefined) o.longitude = lng;
  return o as OfficeOut;
}

/**
 * Приводит ответ бэка к ожидаемым типам там, где нужно (офис, referral_count, position).
 * Поля статистики (`late_minutes_today`, `last_in_at`, …) не трогаем — как пришли с API.
 */
export function normalizeUserOut(raw: unknown): UserOut {
  if (!raw || typeof raw !== 'object') return raw as UserOut;
  const r = { ...(raw as Record<string, unknown>) };
  const n = coerceNum;

  r.office = normalizeOfficeOut(r.office) ?? r.office;

  const ref = n(pickFirst(r, ['referral_count', 'referralCount']) ?? r.referral_count);
  r.referral_count = ref !== undefined && ref !== null ? ref : 0;

  const pos = pickFirst(r, ['position']);
  if (pos === undefined || pos === null) r.position = '';
  else r.position = String(pos);

  return r as UserOut;
}

/** PATCH /auth/me — тело для гостя (OpenAPI: GuestSelfUpdateIn) */
export type GuestSelfUpdateIn = {
  full_name: string;
  email: string;
  login: string;
  pwd?: string | null;
};

/**
 * POST /passes/generate — тело ответа.
 * Для QR-кода пропуска в UI используйте строку {@link PassOut.qr_token} (payload QR).
 */
export type PassOut = {
  qr_token: string;
  status: string;
  expires_at: string;
  office_id: number;
};

export type AccessEventOut = {
  id: number;
  user_id: number;
  user_full_name: string;
  office_id?: number;
  direction: string;
  scanned_by_user_id: number;
  created_at: string;
};

/** OpenAPI: AttendanceDayStatus */
export type AttendanceDayStatus = 'on_time' | 'late' | 'absent';

/** OpenAPI: AttendanceDayOut */
export type AttendanceDayRow = {
  date: string;
  status: AttendanceDayStatus | string;
  first_in_at?: string | null;
};

/**
 * GET /auth/me/attendance — календарь посещаемости (OpenAPI: AttendanceOut).
 */
export type AttendanceOut = {
  iana_timezone: string;
  work_start_time: string;
  punctual_days_total: number;
  days: AttendanceDayRow[];
  /** Устаревший формат: дата → статус */
  day_statuses?: Record<string, string>;
  days_without_late?: number;
};

/** Единая карта YYYY-MM-DD → статус из `days` или legacy `day_statuses`. */
export function attendanceStatusByDate(data: AttendanceOut | null | undefined): Record<string, string> {
  if (!data) return {};
  const legacy = data.day_statuses;
  if (legacy && Object.keys(legacy).length > 0) return legacy;
  const out: Record<string, string> = {};
  for (const row of data.days ?? []) {
    const d = row.date?.trim();
    if (d) out[d] = row.status;
  }
  return out;
}

/** Дни с фактическим приходом (first_in_at или статус on_time / late) */
export function countAttendanceVisits(data: AttendanceOut | null | undefined): number {
  if (!data?.days?.length) return 0;
  let n = 0;
  for (const row of data.days) {
    if (row.first_in_at) {
      n += 1;
      continue;
    }
    const s = (row.status ?? '').toLowerCase().trim().replace(/-/g, '_');
    if (s === 'on_time' || s === 'late') n += 1;
  }
  return n;
}

// --- Эндпоинты ---

/** POST /auth/forgot-password — без токена; ответ одинаков при неизвестном email */
export async function forgotPassword(body: ForgotPasswordIn): Promise<ForgotPasswordOut> {
  const r = await apiRequest('auth/forgot-password', { method: 'POST', body });
  return assertOk<ForgotPasswordOut>(r, 'Forgot password failed');
}

/** PATCH /auth/me — изменить профиль (гость) */
export async function patchMeGuest(token: string, body: GuestSelfUpdateIn): Promise<UserOut> {
  const r = await apiRequest('auth/me', { method: 'PATCH', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Patch me guest failed'));
}

/** DELETE /auth/me — удалить свой аккаунт (гость) */
export async function deleteMeGuest(token: string): Promise<unknown> {
  const r = await apiRequest('auth/me', { method: 'DELETE', token });
  assertOk(r, 'Delete me guest failed');
  return r.data;
}

/** GET /health */
export async function healthCheck(): Promise<unknown> {
  const r = await apiRequest('health', { method: 'GET' });
  assertOk(r, 'Health check failed');
  return r.data;
}

/** POST /auth/bootstrap-office-head */
export async function bootstrapOfficeHead(body: BootstrapOfficeHeadIn): Promise<UserOut> {
  const r = await apiRequest('auth/bootstrap-office-head', { method: 'POST', body });
  return normalizeUserOut(assertOk<unknown>(r, 'Bootstrap failed'));
}

/** POST /auth/admins */
export async function createAdmin(token: string, body: AdminCreateIn): Promise<UserOut> {
  const r = await apiRequest('auth/admins', { method: 'POST', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Create admin failed'));
}

/** POST /auth/employees */
export async function createEmployee(token: string, body: EmployeeCreateIn): Promise<UserOut> {
  const r = await apiRequest('auth/employees', { method: 'POST', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Create employee failed'));
}

/** POST /auth/guests */
export async function createGuest(token: string, body: GuestCreateIn): Promise<UserOut> {
  const r = await apiRequest('auth/guests', { method: 'POST', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Create guest failed'));
}

/** GET /auth/users */
export async function listUsers(token: string): Promise<UserOut[]> {
  const r = await apiRequest('auth/users', { method: 'GET', token });
  const data = assertOk<unknown>(r, 'List users failed');
  if (!Array.isArray(data)) throw new Error('List users failed');
  return data.map((row) => normalizeUserOut(row));
}

/** GET /auth/office-users — пользователи офиса текущего администратора */
export async function listOfficeUsers(token: string): Promise<UserOut[]> {
  const r = await apiRequest('auth/office-users', { method: 'GET', token });
  const data = assertOk<unknown>(r, 'List office users failed');
  if (!Array.isArray(data)) throw new Error('List office users failed');
  return data.map((row) => normalizeUserOut(row));
}

/** PATCH /auth/users/{userId} */
export async function officeHeadUpdateUser(
  token: string,
  userId: number,
  body: UserUpdateIn
): Promise<UserOut> {
  const r = await apiRequest(`auth/users/${userId}`, { method: 'PATCH', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Update user failed'));
}

/** DELETE /auth/users/{userId} */
export async function officeHeadDeleteUser(token: string, userId: number): Promise<unknown> {
  const r = await apiRequest(`auth/users/${userId}`, { method: 'DELETE', token });
  assertOk(r, 'Delete user failed');
  return r.data;
}

/** PATCH /auth/workers/{userId} (админ) */
export async function adminUpdateWorker(
  token: string,
  userId: number,
  body: UserUpdateIn
): Promise<UserOut> {
  const r = await apiRequest(`auth/workers/${userId}`, { method: 'PATCH', token, body });
  return normalizeUserOut(assertOk<unknown>(r, 'Update worker failed'));
}

/**
 * POST /passes/generate — `operationId: generate_pass_route_passes_generate_post`.
 * Тело запроса пустое; нужен только Bearer. QR строится из {@link PassOut.qr_token}.
 */
export async function generatePass(token: string): Promise<PassOut> {
  const r = await apiRequest('passes/generate', { method: 'POST', token });
  return assertOk<PassOut>(r, 'Generate pass failed');
}

/** POST /passes/revoke */
export async function revokePass(token: string): Promise<unknown> {
  const r = await apiRequest('passes/revoke', { method: 'POST', token });
  assertOk(r, 'Revoke pass failed');
  return r.data;
}

/** GET /scanner/events (роли со сканером: админ / глава офиса и т.д.) */
export async function scannerEvents(token: string): Promise<AccessEventOut[]> {
  const r = await apiRequest('scanner/events', { method: 'GET', token });
  return assertOk<AccessEventOut[]>(r, 'Scanner events failed');
}

/** GET /scanner/events/users/{userId} */
export async function scannerUserEvents(token: string, userId: number): Promise<AccessEventOut[]> {
  const r = await apiRequest(`scanner/events/users/${userId}`, { method: 'GET', token });
  return assertOk<AccessEventOut[]>(r, 'User scanner events failed');
}

/** GET /auth/me/attendance — календарь посещаемости (себя). from, to — даты YYYY-MM-DD */
export async function meAttendance(
  token: string,
  params: { from: string; to: string }
): Promise<AttendanceOut> {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  const r = await apiRequest(`auth/me/attendance?${q}`, { method: 'GET', token });
  return assertOk<AttendanceOut>(r, 'Attendance failed');
}

/** GET /auth/users/{user_id}/attendance — календарь посещаемости пользователя (глава / админ). */
export async function userAttendance(
  token: string,
  userId: number,
  params: { from: string; to: string }
): Promise<AttendanceOut> {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  const r = await apiRequest(`auth/users/${userId}/attendance?${q}`, { method: 'GET', token });
  return assertOk<AttendanceOut>(r, 'User attendance failed');
}
