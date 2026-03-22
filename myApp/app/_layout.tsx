import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { rostelecomFontAssets } from '@/constants/rostelecom-fonts';
import { AppThemeProvider } from '@/hooks/use-app-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState<'light' | 'dark' | null>(null);

  const [fontsLoaded, fontError] = useFonts(rostelecomFontAssets);

  const theme = themeOverride ?? systemColorScheme ?? 'light';
  const appThemeValue = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        setThemeOverride((current) => {
          const resolved = current ?? (systemColorScheme ?? 'light');
          return resolved === 'dark' ? 'light' : 'dark';
        });
      },
    }),
    [theme, systemColorScheme]
  );

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider value={appThemeValue}>
        <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: 'transparent' },
            }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
