import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { EntryLoadingScreen } from '@/components/entry-loading-screen';
import {
  clearStoredToken,
  fetchMeCached,
  getHomePathForRole,
  getStoredToken,
} from '@/utils/auth';
import { pinBelongsToUser } from '@/utils/local-pin';
import { withTimeout } from '@/utils/promise-timeout';

/** Если API не отвечает, без таймаута экран загрузки зависает навсегда. */
const BOOTSTRAP_ME_TIMEOUT_MS = 12_000;
/** Гарантия, что стартовый экран не зависнет навсегда. */
const BOOTSTRAP_TOTAL_TIMEOUT_MS = 15_000;

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const failSafeId = setTimeout(() => {
      if (!cancelled) {
        router.replace('/login');
      }
    }, BOOTSTRAP_TOTAL_TIMEOUT_MS);

    (async () => {
      await SplashScreen.hideAsync().catch(() => {});

      const token = await getStoredToken();
      if (cancelled) return;

      if (!token) {
        if (!cancelled) router.replace('/login');
        return;
      }

      try {
        const user = await withTimeout(fetchMeCached(token), BOOTSTRAP_ME_TIMEOUT_MS);
        if (cancelled) return;
        const needPinUnlock = await pinBelongsToUser(user.login);
        if (cancelled) return;
        if (!cancelled) {
          router.replace(needPinUnlock ? '/login' : getHomePathForRole(user.role));
        }
      } catch {
        await clearStoredToken();
        if (cancelled) return;
        if (!cancelled) router.replace('/login');
      } finally {
        clearTimeout(failSafeId);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(failSafeId);
    };
  }, [router]);

  return <EntryLoadingScreen />;
}
