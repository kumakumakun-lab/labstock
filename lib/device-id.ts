import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "labstock_device_id";

/** UUID v4（簡易版） */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

/**
 * 端末ごとに一意なID。初回に生成して端末に永続化する。
 * ログインの代わりに、グループ内でのメンバー識別子として使う。
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    cached = id;
    return id;
  } catch {
    // ストレージ障害時はメモリ内の一時IDで継続（再起動で変わる可能性あり）
    if (!cached) cached = uuidv4();
    return cached;
  }
}
