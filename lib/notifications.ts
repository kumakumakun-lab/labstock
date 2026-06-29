import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { InventoryItem } from "./types";

/**
 * 通知ハンドラーの設定（フォアグラウンドでも通知を表示）
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * 通知権限をリクエストする
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("inventory-alerts", {
      name: "在庫アラート",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

/**
 * 在庫不足アラートのローカル通知を送信する
 */
export async function sendLowStockNotification(item: InventoryItem) {
  if (Platform.OS === "web") return;
  try {
    // 起動時ではなく、実際にアラートが発生したタイミングで権限を求める
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "在庫不足アラート",
        body: `「${item.name}」の在庫が${item.quantity}個になりました（閾値: ${item.alertThreshold}個）`,
        data: { itemId: item.id },
        ...(Platform.OS === "android" ? { channelId: "inventory-alerts" } : {}),
      },
      trigger: null, // 即座に通知
    });
  } catch {
    // 通知の送信失敗は無視（権限未許可・端末側の制限など）
  }
}

/**
 * 複数アイテムの在庫不足をまとめて通知する
 */
export async function sendBatchLowStockNotification(items: InventoryItem[]) {
  if (Platform.OS === "web" || items.length === 0) return;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    const body =
      items.length === 1
        ? `「${items[0].name}」の在庫が${items[0].quantity}個になりました`
        : `${items.length}件の物品が在庫不足です`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "在庫不足アラート",
        body,
        data: { itemIds: items.map((i) => i.id) },
        ...(Platform.OS === "android" ? { channelId: "inventory-alerts" } : {}),
      },
      trigger: null,
    });
  } catch {
    // 通知の送信失敗は無視
  }
}

/**
 * バッジ数を設定する
 */
export async function setBadgeCount(count: number) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // バッジ設定失敗は無視
  }
}
