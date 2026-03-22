import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const STORAGE_BIOMETRIC_UNLOCK = 'app_biometric_unlock_enabled';

export function isBiometricUnlockSupportedOnPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function clearBiometricUnlockPreference(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_BIOMETRIC_UNLOCK);
}

export async function getBiometricUnlockEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_BIOMETRIC_UNLOCK);
  return v === 'true';
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(STORAGE_BIOMETRIC_UNLOCK, 'true');
  } else {
    await AsyncStorage.removeItem(STORAGE_BIOMETRIC_UNLOCK);
  }
}

export type BiometricHardwareInfo = {
  available: boolean;
  /** Подпись для кнопок и алертов */
  label: string;
};

export async function getBiometricHardwareInfo(): Promise<BiometricHardwareInfo> {
  if (!isBiometricUnlockSupportedOnPlatform()) {
    return { available: false, label: '' };
  }

  try {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) {
      return { available: false, label: '' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let label = 'биометрией';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'по лицу';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = 'отпечатком пальца';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      label = 'радужкой';
    }

    return { available: true, label };
  } catch {
    return { available: false, label: '' };
  }
}

/**
 * Системный диалог биометрии (или PIN устройства как fallback ОС).
 * @returns true только при успешной аутентификации.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  if (!isBiometricUnlockSupportedOnPlatform()) {
    return false;
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Отмена',
      disableDeviceFallback: false,
    });
    return result.success === true;
  } catch {
    return false;
  }
}
