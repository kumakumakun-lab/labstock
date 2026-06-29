import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_NAME_KEY = "labstock_user_name";

/**
 * ユーザー名を取得する
 */
export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_NAME_KEY);
  } catch {
    return null;
  }
}

/**
 * ユーザー名を保存する
 */
export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
}

/**
 * ユーザー名が設定済みかどうかを確認する
 */
export async function hasUserName(): Promise<boolean> {
  const name = await getUserName();
  return name !== null && name.trim().length > 0;
}
