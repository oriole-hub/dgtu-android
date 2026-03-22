import type { PassOut } from '@/utils/api';

import { PASS_TTL_MS } from './constants';

export function getPassExpiresAtMs(pass: PassOut, issuedAtFallbackMs: number): number {
  const parsed = Date.parse(pass.expires_at);
  if (!Number.isNaN(parsed)) return parsed;
  return issuedAtFallbackMs + PASS_TTL_MS;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Время начала работы офиса (`office.work_start_time`): ISO или `HH:mm` / `HH:mm:ss` */
export function formatWorkStartTime(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  const s = String(value).trim();
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (timeOnly) {
    const h = timeOnly[1].padStart(2, '0');
    return `${h}:${timeOnly[2]}`;
  }
  return s;
}

/** Дата/время из GET /auth/me (ISO) для блока «Статистика» */
export function formatMeDateTime(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—';
  const d = Date.parse(String(iso));
  if (Number.isNaN(d)) return '—';
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Длительность перерыва в секундах */
export function formatBreakDurationSeconds(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec) || sec < 0) return '—';
  if (sec === 0) return '0 с';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} с`;
  if (m < 60) return s > 0 ? `${m} мин ${s} с` : `${m} мин`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h} ч ${mm} мин` : `${h} ч`;
}

function formatMinutesAsDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

/** Опоздание за сегодня: 0 / нет данных → фраза поощрения, иначе длительность */
export function formatLateToday(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes <= 0) {
    return 'Нету, так держать!';
  }
  return formatMinutesAsDuration(minutes);
}

/** Переработка: только если есть минуты, иначе прочерк */
export function formatOvertimeToday(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes <= 0) {
    return '—';
  }
  return formatMinutesAsDuration(minutes);
}

/** Email со звёздочками: первая буква локальной части и домена, зона (.ru и т.д.) видна */
export function maskEmail(email: string): string {
  const s = email.trim();
  if (!s) return '—';
  const at = s.indexOf('@');
  if (at <= 0) {
    return s.length <= 1 ? '***' : `${s[0]}${'*'.repeat(Math.max(3, s.length - 1))}`;
  }
  const local = s.slice(0, at);
  const host = s.slice(at + 1);
  if (!host) {
    return local.length <= 1
      ? '***@'
      : `${local[0]}${'*'.repeat(Math.max(3, local.length - 1))}@`;
  }
  const localMask =
    local.length <= 1
      ? '***'
      : `${local[0]}${'*'.repeat(Math.max(3, local.length - 1))}`;
  const lastDot = host.lastIndexOf('.');
  const tld = lastDot >= 0 ? host.slice(lastDot) : '';
  const domainMain = lastDot >= 0 ? host.slice(0, lastDot) : host;
  const domainMask =
    domainMain.length === 0
      ? '***'
      : domainMain.length === 1
        ? `${domainMain[0]}**`
        : `${domainMain[0]}${'*'.repeat(Math.max(3, domainMain.length - 1))}`;
  return `${localMask}@${domainMask}${tld}`;
}

export function greetingFirstName(fullName: string): string {
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return p[1];
  return p[0] || 'коллега';
}

export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function attendanceCellKey(y: number, m0: number, d: number): string {
  return `${y}-${m0}-${d}`;
}

export function parseAttendanceYmd(dateKey: string): { y: number; m0: number; d: number } | null {
  const head = dateKey.trim().split('T')[0]?.split(' ')[0] ?? '';
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(head);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m0: mo - 1, d };
}

function normalizeAttendanceStatus(raw: string): string {
  return raw.toLowerCase().trim().replace(/-/g, '_');
}

/** Только вовремя / опоздал; absent и «не был» — без цветной метки на календаре */
export function calendarDayKindFromStatus(raw: string): 'ontime' | 'late' | null {
  const s = normalizeAttendanceStatus(raw);
  if (!s) return null;
  if (s === 'on_time') return 'ontime';
  if (s === 'late') return 'late';
  if (s === 'absent') return null;
  if (s.includes('late') || s.includes('опозд')) return 'late';
  if (s.includes('absent') || s.includes('отсут') || s.includes('пропуск')) return null;
  if (
    s.includes('present') ||
    s.includes('присут') ||
    s === 'ok' ||
    s.includes('без опозд')
  ) {
    return 'ontime';
  }
  return 'ontime';
}
