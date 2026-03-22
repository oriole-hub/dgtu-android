import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppScreenBackground } from '@/components/app-screen-background';
import { GlassBackButton } from '@/components/glass-back-button';
import { GlassButton } from '@/components/glass-button';
import { GlassPinKeypad } from '@/components/glass-pin-keypad';
import { PinDots } from '@/components/pin-dots';
import { RostelecomHeader } from '@/components/rostelecom-header';
import { webTextFont } from '@/constants/web-text-font';
import {
  clearSessionTokenOnly,
  clearStoredToken,
  fetchMeCached,
  getHomePathForRole,
  getStoredToken,
  loginWithPassword,
  storeToken,
} from '@/utils/auth';
import {
  authenticateWithBiometrics,
  getBiometricHardwareInfo,
  getBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from '@/utils/biometric-unlock';
import { forgotPassword } from '@/utils/api';
import { timeOfDayGreetingExclaimed } from '@/utils/greeting';
import { pinBelongsToUser, savePinForUser, verifyPin } from '@/utils/local-pin';

const PIN_LEN = 4;

/** После приветствия по времени суток — по кругу эти фразы */
const WELCOME_ROTATING = ['Приветствуем!', 'Привет!', 'Добро пожаловать!'] as const;

type Step = 'welcome' | 'account' | 'forgotPassword' | 'pinUnlock' | 'pinCreate' | 'pinConfirm';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accountLogin, setAccountLogin] = useState('');
  const [pinBuffer, setPinBuffer] = useState('');
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [biometricUnlockLabel, setBiometricUnlockLabel] = useState('');
  const biometricAutoPromptedRef = useRef(false);
  const [welcomeGreeting, setWelcomeGreeting] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    if (step !== 'welcome') {
      setWelcomeGreeting('');
      return;
    }
    if (isCheckingSession) {
      return;
    }

    let cancelled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => resolve(), ms);
        timeoutIds.push(id);
      });

    const run = async () => {
      setWelcomeGreeting('');
      const timeGreeting = timeOfDayGreetingExclaimed();
      for (let i = 1; i <= timeGreeting.length; i += 1) {
        if (cancelled) return;
        setWelcomeGreeting(timeGreeting.slice(0, i));
        await delay(88);
      }
      if (cancelled) return;
      await delay(720);
      for (let i = timeGreeting.length; i >= 0; i -= 1) {
        if (cancelled) return;
        setWelcomeGreeting(timeGreeting.slice(0, i));
        await delay(42);
      }
      if (cancelled) return;
      await delay(260);

      let phraseIndex = Math.floor(Math.random() * WELCOME_ROTATING.length);
      while (!cancelled) {
        const finalPhrase = WELCOME_ROTATING[phraseIndex % WELCOME_ROTATING.length];
        phraseIndex += 1;
        for (let i = 1; i <= finalPhrase.length; i += 1) {
          if (cancelled) return;
          setWelcomeGreeting(finalPhrase.slice(0, i));
          await delay(88);
        }
        if (cancelled) return;
        await delay(1100);
        for (let i = finalPhrase.length; i >= 0; i -= 1) {
          if (cancelled) return;
          setWelcomeGreeting(finalPhrase.slice(0, i));
          await delay(42);
        }
        if (cancelled) return;
        await delay(320);
      }
    };

    void run();

    return () => {
      cancelled = true;
      for (const id of timeoutIds) clearTimeout(id);
    };
  }, [step, isCheckingSession]);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const token = await getStoredToken();
        if (token && isMounted) {
          try {
            const me = await fetchMeCached(token);
            const needsPinUnlock = await pinBelongsToUser(me.login);
            if (!isMounted) return;
            if (needsPinUnlock) {
              setAccountLogin(me.login);
              setPinBuffer('');
              setPinFirst('');
              setPinError('');
              setStep('pinUnlock');
            } else {
              router.replace(getHomePathForRole(me.role));
            }
          } catch {
            await clearStoredToken();
          }
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const goHomeWithToken = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) return;
    const me = await fetchMeCached(token);
    router.replace(getHomePathForRole(me.role));
  }, [router]);

  const tryBiometricUnlock = useCallback(async () => {
    setPinError('');
    const ok = await authenticateWithBiometrics('Подтвердите личность для входа');
    if (!ok) return;
    try {
      await goHomeWithToken();
    } catch {
      await clearStoredToken();
      setStep('welcome');
    }
  }, [goHomeWithToken]);

  const handleForgotSubmit = async () => {
    const email = forgotEmail.trim();
    if (!email) {
      setForgotError('Введите email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotError('Некорректный email.');
      return;
    }
    setForgotBusy(true);
    setForgotError('');
    try {
      await forgotPassword({ email });
      Alert.alert(
        'Готово',
        'Если такой email есть в системе, на него отправлен новый пароль. Проверьте почту.',
        [{ text: 'OK', onPress: () => setStep('account') }]
      );
    } catch {
      setForgotError('Не удалось отправить запрос. Попробуйте позже.');
    } finally {
      setForgotBusy(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setErrorText('Введите логин и пароль.');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    try {
      const token = await loginWithPassword(login.trim(), password);
      await storeToken(token);
      try {
        await fetchMeCached(token);
      } catch {
        await clearStoredToken();
        setErrorText('Вход выполнен, но профиль не загрузился. Попробуйте снова.');
        return;
      }

      const u = login.trim();
      setAccountLogin(u);
      setPinBuffer('');
      setPinFirst('');
      setPinError('');

      const needUnlock = await pinBelongsToUser(u);
      setStep(needUnlock ? 'pinUnlock' : 'pinCreate');
    } catch {
      setErrorText('Не удалось войти. Проверьте логин/пароль.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appendDigit = (d: string) => {
    setPinError('');
    setPinBuffer((p) => (p.length >= PIN_LEN ? p : p + d));
  };

  const deleteDigit = () => {
    setPinError('');
    setPinBuffer((p) => p.slice(0, -1));
  };

  useEffect(() => {
    if (pinBuffer.length !== PIN_LEN) return;

    const run = async () => {
      if (step === 'pinCreate') {
        const first = pinBuffer;
        setPinFirst(first);
        setPinBuffer('');
        setStep('pinConfirm');
        return;
      }

      if (step === 'pinConfirm') {
        if (pinBuffer !== pinFirst) {
          setPinError('Пин не совпадает. Попробуйте снова.');
          setPinBuffer('');
          return;
        }
        try {
          await savePinForUser(pinBuffer, accountLogin);
          setPinBuffer('');
          const hw = await getBiometricHardwareInfo();
          if (Platform.OS !== 'web' && hw.available) {
            Alert.alert(
              'Быстрый вход',
              `Разрешить вход с помощью ${hw.label} вместо ввода пин-кода при следующем запуске?`,
              [
                {
                  text: 'Только пин',
                  style: 'cancel',
                  onPress: () => {
                    void goHomeWithToken();
                  },
                },
                {
                  text: 'Включить',
                  onPress: () => {
                    void (async () => {
                      await setBiometricUnlockEnabled(true);
                      await goHomeWithToken();
                    })();
                  },
                },
              ],
            );
          } else {
            await goHomeWithToken();
          }
        } catch {
          setPinError('Не удалось сохранить пин.');
          setPinBuffer('');
        }
        return;
      }

      if (step === 'pinUnlock') {
        const ok = await verifyPin(pinBuffer);
        setPinBuffer('');
        if (!ok) {
          setPinError('Неверный пин');
          return;
        }
        try {
          await goHomeWithToken();
        } catch {
          await clearStoredToken();
          setStep('welcome');
        }
      }
    };

    void run();
  }, [pinBuffer, step, pinFirst, accountLogin, goHomeWithToken]);

  useEffect(() => {
    if (step !== 'pinUnlock') {
      setBiometricUnlockLabel('');
      biometricAutoPromptedRef.current = false;
      return;
    }

    let alive = true;
    void (async () => {
      const enabled = await getBiometricUnlockEnabled();
      const hw = await getBiometricHardwareInfo();
      if (!alive) return;
      if (enabled && hw.available) {
        setBiometricUnlockLabel(hw.label);
      } else {
        setBiometricUnlockLabel('');
      }
    })();

    return () => {
      alive = false;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'pinUnlock') return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const enabled = await getBiometricUnlockEnabled();
        const hw = await getBiometricHardwareInfo();
        if (cancelled || !enabled || !hw.available || biometricAutoPromptedRef.current) return;
        biometricAutoPromptedRef.current = true;
        const ok = await authenticateWithBiometrics('Подтвердите личность для входа');
        if (cancelled || !ok) return;
        try {
          await goHomeWithToken();
        } catch {
          await clearStoredToken();
          if (!cancelled) setStep('welcome');
        }
      })();
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, goHomeWithToken]);

  const exitToWelcome = async () => {
    await clearStoredToken();
    setPassword('');
    setPasswordVisible(false);
    setPinBuffer('');
    setPinFirst('');
    setPinError('');
    setErrorText('');
    setStep('welcome');
  };

  const backFromPinToAccount = async () => {
    await clearSessionTokenOnly();
    setPinBuffer('');
    setPinFirst('');
    setPinError('');
    setStep('account');
  };

  if (isCheckingSession) {
    return (
      <AppScreenBackground>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color="#101828" size="large" />
        </View>
      </AppScreenBackground>
    );
  }

  const pinTitle =
    step === 'pinCreate'
      ? 'Придумайте пин'
      : step === 'pinConfirm'
        ? 'Повторите пин'
        : 'Введите пин';

  return (
    <AppScreenBackground>
      <SafeAreaView style={styles.safe}>
        {step === 'welcome' ? (
          <View style={styles.welcomeRoot}>
            <View style={styles.logoBlock}>
              <Text style={styles.logoMark}>Точка Входа</Text>
            </View>

            <View style={styles.centerBlock}>
              <Text
                style={styles.hello}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                accessibilityLiveRegion="polite">
                {welcomeGreeting}
              </Text>
            </View>

            <View style={styles.bottomBlock}>
              <GlassButton title="Вход" variant="large" onPress={() => setStep('account')} />
            </View>
          </View>
        ) : null}

        {step === 'account' ? (
          <View style={styles.accountRoot}>
            <View style={styles.accountTopBar}>
              <RostelecomHeader />
            </View>
            <View style={styles.accountCenter}>
              <Text style={styles.accountTitle}>Вход в аккаунт</Text>
              <View style={styles.form}>
                <TextInput
                  autoCapitalize="none"
                  placeholder="Логин"
                  placeholderTextColor="rgba(16, 24, 40, 0.45)"
                  style={styles.input}
                  value={login}
                  onChangeText={setLogin}
                />
                <View style={styles.passwordFieldWrap}>
                  <TextInput
                    autoCapitalize="none"
                    placeholder="Пароль"
                    placeholderTextColor="rgba(16, 24, 40, 0.45)"
                    secureTextEntry={!passwordVisible}
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable
                    onPress={() => setPasswordVisible((v) => !v)}
                    style={styles.passwordToggleBtn}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}>
                    <Text style={styles.passwordToggleText}>
                      {passwordVisible ? 'Скрыть' : 'Показать'}
                    </Text>
                  </Pressable>
                </View>
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                <View style={styles.accountActionsRow}>
                  <Pressable
                    onPress={() => {
                      setForgotEmail('');
                      setForgotError('');
                      setStep('forgotPassword');
                    }}
                    style={styles.forgotPasswordBtn}
                    accessibilityRole="link"
                    accessibilityLabel="Забыли пароль"
                    accessibilityHint="Открывает восстановление пароля по email">
                    <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
                  </Pressable>
                  {isSubmitting ? (
                    <ActivityIndicator color="#101828" style={styles.accountLoginSpinner} />
                  ) : (
                    <GlassButton
                      title="Вход"
                      variant="medium"
                      onPress={handlePasswordLogin}
                      containerStyle={styles.accountLoginBtn}
                    />
                  )}
                </View>
              </View>
            </View>
            <View style={styles.bottomBackWrap}>
              <GlassBackButton
                onPress={() => {
                  setStep('welcome');
                  setErrorText('');
                  setPasswordVisible(false);
                }}
              />
            </View>
          </View>
        ) : null}

        {step === 'forgotPassword' ? (
          <View style={styles.accountRoot}>
            <View style={styles.accountTopBar}>
              <RostelecomHeader />
            </View>
            <View style={styles.accountCenter}>
              <Text style={styles.accountTitle}>Восстановление пароля</Text>
              <Text style={styles.forgotHint}>
                Укажите email аккаунта. Если он зарегистрирован, новый пароль будет отправлен на почту.
              </Text>
              <View style={styles.form}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="rgba(16, 24, 40, 0.45)"
                  style={styles.input}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                />
                {forgotError ? <Text style={styles.errorText}>{forgotError}</Text> : null}
                {forgotBusy ? (
                  <View style={styles.forgotSubmitWrap}>
                    <ActivityIndicator color="#101828" />
                  </View>
                ) : (
                  <GlassButton
                    title="Отправить"
                    variant="large"
                    onPress={() => void handleForgotSubmit()}
                    containerStyle={styles.forgotSubmitBtn}
                  />
                )}
              </View>
            </View>
            <View style={styles.bottomBackWrap}>
              <GlassBackButton
                onPress={() => {
                  setStep('account');
                  setForgotError('');
                }}
              />
            </View>
          </View>
        ) : null}

        {step === 'pinCreate' ? (
          <View style={styles.pinRoot}>
            <RostelecomHeader />
            <View style={styles.pinBody}>
              <Text style={styles.pinTitle}>{pinTitle}</Text>
              <PinDots length={pinBuffer.length} max={PIN_LEN} />
              <GlassPinKeypad onDigit={appendDigit} onDelete={deleteDigit} />
              {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            </View>
            <View style={styles.bottomBackWrap}>
              <GlassBackButton onPress={backFromPinToAccount} />
            </View>
          </View>
        ) : null}

        {step === 'pinConfirm' ? (
          <View style={styles.pinRoot}>
            <RostelecomHeader />
            <View style={styles.pinBody}>
              <Text style={styles.pinTitle}>{pinTitle}</Text>
              <PinDots length={pinBuffer.length} max={PIN_LEN} />
              <GlassPinKeypad onDigit={appendDigit} onDelete={deleteDigit} />
              {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            </View>
            <View style={styles.pinFooter}>
              <GlassBackButton
                onPress={() => {
                  setStep('pinCreate');
                  setPinBuffer('');
                  setPinError('');
                }}
              />
              <GlassButton title="Выйти" variant="medium" onPress={exitToWelcome} />
            </View>
          </View>
        ) : null}

        {step === 'pinUnlock' ? (
          <View style={styles.pinRoot}>
            <RostelecomHeader />
            <View style={styles.pinBody}>
              <Text style={styles.pinTitle}>{pinTitle}</Text>
              <PinDots length={pinBuffer.length} max={PIN_LEN} />
              <GlassPinKeypad onDigit={appendDigit} onDelete={deleteDigit} />
              {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
              {biometricUnlockLabel ? (
                <View style={styles.biometricRow}>
                  <Text style={styles.biometricOr}>или</Text>
                  <GlassButton
                    title={`Войти с ${biometricUnlockLabel}`}
                    variant="medium"
                    containerStyle={styles.biometricBtn}
                    onPress={() => void tryBiometricUnlock()}
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.bottomBackWrap}>
              <GlassBackButton onPress={backFromPinToAccount} />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </AppScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 30,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeRoot: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  logoBlock: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoMark: {
    ...webTextFont,
    fontSize: 34,
    color: '#101828',
    letterSpacing: -1.2,
  },
  logoSub: {
    ...webTextFont,
    fontSize: 17,
    color: 'rgba(16, 24, 40, 0.55)',
    marginTop: 6,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hello: {
    ...webTextFont,
    fontSize: 48,
    color: '#101828',
    letterSpacing: -1.44,
    lineHeight: 56,
    textAlign: 'center',
    maxWidth: '100%',
    minHeight: 120,
  },
  bottomBlock: {
    gap: 14,
    width: '100%',
    alignItems: 'stretch',
  },
  accountRoot: {
    flex: 1,
    paddingTop: 8,
  },
  accountTopBar: {
    alignItems: 'center',
  },
  accountCenter: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  accountTitle: {
    ...webTextFont,
    marginTop: 0,
    fontSize: 22,
    color: '#101828',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  form: {
    marginTop: 22,
    gap: 12,
  },
  accountActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  accountLoginBtn: {
    flexShrink: 0,
  },
  accountLoginSpinner: {
    marginRight: 8,
    minWidth: 42,
    minHeight: 42,
  },
  forgotHint: {
    ...webTextFont,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(16, 24, 40, 0.55)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  forgotSubmitWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotSubmitBtn: {
    marginTop: 20,
    width: '100%',
    alignSelf: 'stretch',
  },
  input: {
    ...webTextFont,
    height: 52,
    borderRadius: 20,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16, 24, 40, 0.12)',
    color: '#101828',
    fontSize: 16,
  },
  passwordFieldWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 96,
  },
  passwordToggleBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    ...webTextFont,
    fontSize: 14,
    color: 'rgba(16, 24, 40, 0.55)',
  },
  forgotPasswordBtn: {
    flexShrink: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  forgotPasswordText: {
    ...webTextFont,
    fontSize: 14,
    color: 'rgba(16, 24, 40, 0.55)',
    textDecorationLine: 'underline',
  },
  errorText: {
    ...webTextFont,
    color: '#D14343',
    fontSize: 14,
  },
  bottomBackWrap: {
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  pinRoot: {
    flex: 1,
    paddingTop: 4,
  },
  pinBody: {
    flex: 1,
    paddingTop: 12,
  },
  pinTitle: {
    ...webTextFont,
    fontSize: 22,
    color: '#101828',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  pinError: {
    ...webTextFont,
    color: '#D14343',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  pinFooter: {
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  biometricRow: {
    marginTop: 28,
    alignItems: 'center',
    gap: 14,
  },
  biometricOr: {
    ...webTextFont,
    fontSize: 14,
    color: 'rgba(16, 24, 40, 0.45)',
  },
  biometricBtn: {
    alignSelf: 'center',
  },
});
