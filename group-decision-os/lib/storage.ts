import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Tiny key/value store that works on native (SecureStore) and web (localStorage).
 * SecureStore is unavailable in the browser, so we fall back there.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
