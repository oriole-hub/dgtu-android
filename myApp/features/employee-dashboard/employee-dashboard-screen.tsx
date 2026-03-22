import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppScreenBackground } from '@/components/app-screen-background';
import { GlassButton } from '@/components/glass-button';
import {
  attendanceStatusByDate,
  countAttendanceVisits,
  generatePass,
  meAttendance,
  type AttendanceOut,
  type PassOut,
  type UserOut,
} from '@/utils/api';
import {
  clearStoredToken,
  fetchMeCached,
  getStoredToken,
  invalidateMeCache,
  logoutWithToken,
} from '@/utils/auth';
import { timeOfDayGreetingPrefix } from '@/utils/greeting';

import { AttendanceCalendar, type CalendarMark } from './attendance-calendar';
import { QR_SCREEN_CAPTURE_KEY } from './constants';
import { OfficeUserMap } from './office-user-map';
import { QrPassModal } from './qr-pass-modal';
import { UserDataModal } from './user-data-modal';
import { UserStatsPanel } from './user-stats-panel';
import { styles } from './styles';
import {
  attendanceCellKey,
  calendarDayKindFromStatus,
  getPassExpiresAtMs,
  greetingFirstName,
  parseAttendanceYmd,
  toLocalYmd,
} from './utils';

export default function EmployeeDashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [pass, setPass] = useState<PassOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPass, setLoadingPass] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [passIssuedAtMs, setPassIssuedAtMs] = useState<number | null>(null);
  const [countdownTick, setCountdownTick] = useState(0);
  const passIssuedAtRef = useRef<number | null>(null);
  const refreshOnExpireRef = useRef(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [attendance, setAttendance] = useState<AttendanceOut | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [userDataModalVisible, setUserDataModalVisible] = useState(false);

  const fetchAttendance = useCallback(
    async (token: string, year: number, month: number) => {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return meAttendance(token, { from: toLocalYmd(first), to: toLocalYmd(last) });
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getStoredToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        invalidateMeCache();
        const me = await fetchMeCached(token);
        if (!mounted) return;
        setUser(me);
      } catch {
        if (mounted) {
          await clearStoredToken();
          router.replace('/login');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const { monthTitle, gridDays, attendanceCalendarMarks, currentYear, currentMonth } = useMemo(() => {
    const base = new Date();
    const shown = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    const year = shown.getFullYear();
    const month = shown.getMonth();
    const monthLabel = shown.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekDay = (first.getDay() + 6) % 7;

    const cells: Array<number | null> = [];
    for (let i = 0; i < weekDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    const marks: Record<string, CalendarMark> = {};
    const statuses = attendanceStatusByDate(attendance);
    for (const [dateKey, status] of Object.entries(statuses)) {
      const parsed = parseAttendanceYmd(dateKey);
      if (!parsed) continue;
      if (parsed.y !== year || parsed.m0 !== month) continue;
      const kind = calendarDayKindFromStatus(String(status));
      if (kind) marks[attendanceCellKey(parsed.y, parsed.m0, parsed.d)] = kind;
    }

    return {
      monthTitle: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      gridDays: cells,
      attendanceCalendarMarks: marks,
      currentYear: year,
      currentMonth: month,
    };
  }, [monthOffset, attendance]);

  const visitsCount = useMemo(() => countAttendanceVisits(attendance), [attendance]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = await getStoredToken();
      if (!token || !user) return;
      const base = new Date();
      const shown = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
      const year = shown.getFullYear();
      const month = shown.getMonth();
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const data = await fetchAttendance(token, year, month);
        if (!mounted) return;
        setAttendance(data);
      } catch {
        if (!mounted) return;
        setAttendanceError('Календарь посещаемости недоступен.');
      } finally {
        if (mounted) setAttendanceLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, monthOffset, fetchAttendance]);

  const firstName = useMemo(
    () => (user ? greetingFirstName(user.full_name) : ''),
    [user]
  );

  const handleLogout = async () => {
    try {
      const token = await getStoredToken();
      if (token) await logoutWithToken(token);
    } finally {
      await clearStoredToken();
      router.replace('/login');
    }
  };

  const applyNewPass = useCallback((p: PassOut) => {
    const now = Date.now();
    passIssuedAtRef.current = now;
    setPassIssuedAtMs(now);
    setPass(p);
  }, []);

  const refreshPass = useCallback(async (): Promise<boolean> => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return false;
    }
    try {
      const p = await generatePass(token);
      applyNewPass(p);
      return true;
    } catch {
      return false;
    }
  }, [applyNewPass, router]);

  const handleShowQrPass = async () => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoadingPass(true);
    setStatusMsg('');
    try {
      const p = await generatePass(token);
      applyNewPass(p);
      setQrModalVisible(true);
    } catch {
      setStatusMsg('Не удалось получить пропуск');
    } finally {
      setLoadingPass(false);
    }
  };

  const qrValue = pass?.qr_token ?? '';

  const passExpiresAtMs = useMemo(() => {
    if (!pass) return null;
    const parsed = Date.parse(pass.expires_at);
    if (!Number.isNaN(parsed)) return parsed;
    const issued = passIssuedAtMs ?? passIssuedAtRef.current;
    if (issued == null) return null;
    return getPassExpiresAtMs(pass, issued);
  }, [pass, passIssuedAtMs]);

  const countdownRemainingMs = useMemo(() => {
    if (passExpiresAtMs == null) return 0;
    return passExpiresAtMs - Date.now();
  }, [passExpiresAtMs, countdownTick]);

  useEffect(() => {
    if (!qrModalVisible || !pass || passExpiresAtMs == null) return;
    const id = setInterval(() => setCountdownTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [qrModalVisible, pass, passExpiresAtMs]);

  useEffect(() => {
    if (!qrModalVisible || !pass || passExpiresAtMs == null) {
      refreshOnExpireRef.current = false;
      return;
    }
    if (countdownRemainingMs > 0) {
      refreshOnExpireRef.current = false;
      return;
    }
    if (refreshOnExpireRef.current) return;
    refreshOnExpireRef.current = true;
    let cancelled = false;
    void (async () => {
      const ok = await refreshPass();
      if (!cancelled && !ok) {
        setStatusMsg('Не удалось обновить пропуск');
        setQrModalVisible(false);
      }
      refreshOnExpireRef.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [qrModalVisible, pass, passExpiresAtMs, countdownRemainingMs, refreshPass]);

  useEffect(() => {
    if (!qrModalVisible) return;
    let cancelled = false;
    void (async () => {
      try {
        if (cancelled) return;
        const available = await ScreenCapture.isAvailableAsync();
        if (!available || cancelled) return;
        await ScreenCapture.preventScreenCaptureAsync(QR_SCREEN_CAPTURE_KEY);
      } catch {
        // Web
      }
    })();
    return () => {
      cancelled = true;
      void (async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync(QR_SCREEN_CAPTURE_KEY);
        } catch {
          // ignore
        }
      })();
    };
  }, [qrModalVisible]);

  if (loading || !user) {
    return (
      <AppScreenBackground>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#101828" size="large" />
        </View>
      </AppScreenBackground>
    );
  }

  return (
    <AppScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting} numberOfLines={1}>
              {timeOfDayGreetingPrefix()}, {firstName}!
            </Text>
            <GlassButton
              title="Выйти"
              variant="medium"
              onPress={handleLogout}
              containerStyle={styles.logoutBtn}
            />
          </View>

          <GlassButton
            title="Мои данные"
            variant="large"
            onPress={() => setUserDataModalVisible(true)}
            containerStyle={styles.userDataBtn}
          />

          <UserStatsPanel user={user} />

          <OfficeUserMap user={user} />

          <AttendanceCalendar
            monthTitle={monthTitle}
            gridDays={gridDays}
            attendanceCalendarMarks={attendanceCalendarMarks}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onMonthPrev={() => setMonthOffset((m) => m - 1)}
            onMonthNext={() => setMonthOffset((m) => m + 1)}
            attendanceLoading={attendanceLoading}
            attendanceError={attendanceError}
            visitsCount={visitsCount}
          />

          {statusMsg ? <Text style={styles.status}>{statusMsg}</Text> : null}

          <GlassButton
            title={loadingPass ? 'Подождите…' : 'Показать QR пропуска'}
            variant="large"
            disabled={loadingPass}
            onPress={handleShowQrPass}
            containerStyle={styles.generateBtn}
          />
        </ScrollView>

        <UserDataModal
          visible={userDataModalVisible}
          onClose={() => setUserDataModalVisible(false)}
          user={user}
        />

        <QrPassModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          qrValue={qrValue}
          passExpiresAtMs={passExpiresAtMs}
          countdownRemainingMs={countdownRemainingMs}
        />
      </SafeAreaView>
    </AppScreenBackground>
  );
}
