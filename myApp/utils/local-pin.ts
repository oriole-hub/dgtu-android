import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { clearBiometricUnlockPreference } from '@/utils/biometric-unlock';

const STORAGE_HASH_KEY = 'app_local_pin_sha256';
const STORAGE_OWNER_LOGIN_KEY = 'app_pin_owner_login';
const PEPPER = 'dgtu-local-pin-v1';

function webStorageAvailable(): boolean {
  return Platform.OS === 'web' && typeof globalThis !== 'undefined' && !!globalThis.localStorage;
}

async function getItem(key: string): Promise<string | null> {
  if (webStorageAvailable()) return globalThis.localStorage.getItem(key);
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (webStorageAvailable()) {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (webStorageAvailable()) {
    globalThis.localStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${PEPPER}:${pin}`);
}

export async function getStoredPinHash(): Promise<string | null> {
  return getItem(STORAGE_HASH_KEY);
}

/** PIN сохранён и привязан к этому логину (другой пользователь на устройстве — заново задаёт PIN). */
export async function pinBelongsToUser(login: string): Promise<boolean> {
  const hash = await getStoredPinHash();
  const owner = await getItem(STORAGE_OWNER_LOGIN_KEY);
  if (!hash || !owner) return false;
  return owner === login.trim().toLowerCase();
}

export async function savePinForUser(pin: string, login: string): Promise<void> {
  const h = await hashPin(pin);
  await setItem(STORAGE_HASH_KEY, h);
  await setItem(STORAGE_OWNER_LOGIN_KEY, login.trim().toLowerCase());
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getStoredPinHash();
  if (!stored) return false;
  const h = await hashPin(pin);
  return h === stored;
}

export async function clearPinHash(): Promise<void> {
  await removeItem(STORAGE_HASH_KEY);
  await removeItem(STORAGE_OWNER_LOGIN_KEY);
  await clearBiometricUnlockPreference();
}
