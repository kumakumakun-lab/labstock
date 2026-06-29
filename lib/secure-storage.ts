/**
 * セキュアストレージユーティリティ
 * iOS/Android: expo-secure-store（Keychain/Keystore暗号化）
 * Web: sessionStorage（フォールバック）
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * セキュアにデータを保存する
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // sessionStorage unavailable
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

/**
 * セキュアに保存されたデータを取得する
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

/**
 * セキュアに保存されたデータを削除する
 */
export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // sessionStorage unavailable
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
