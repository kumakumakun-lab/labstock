import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { InventoryItem, CreateInventoryItem, UpdateInventoryItem, ChangeLogEntry } from "./types";

const STORAGE_KEY = "labstock_inventory";

/**
 * UUID v4 生成（簡易版）
 */
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 変更ログエントリを作成する
 */
function createLogEntry(
  userName: string,
  action: ChangeLogEntry["action"],
  description: string,
  previousValue?: number,
  newValue?: number
): ChangeLogEntry {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userName,
    action,
    previousValue,
    newValue,
    description,
  };
}

/**
 * 画像をアプリのドキュメントディレクトリにコピーする
 */
async function copyImageToDocuments(uri: string): Promise<string> {
  if (!FileSystem.documentDirectory) return uri;
  const fileName = `labstock_img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const destUri = `${FileSystem.documentDirectory}${fileName}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  } catch {
    return uri;
  }
}

/**
 * 旧データ（tag: string）から新データ（tags: string[]）へのマイグレーション
 */
function migrateItem(item: any): InventoryItem {
  // tags配列が既にある場合はそのまま使用
  let tags: string[];
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    tags = item.tags;
  } else if (item.tag && typeof item.tag === "string") {
    // 旧tagフィールドからマイグレーション
    tags = [item.tag];
  } else {
    tags = ["other"];
  }

  return {
    ...item,
    tags,
    createdBy: item.createdBy ?? "不明",
    changeLogs: item.changeLogs ?? [],
  };
}

/**
 * 全在庫アイテムを取得する
 */
export async function getAllItems(): Promise<InventoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const items = JSON.parse(data) as any[];
    return items.map(migrateItem);
  } catch {
    return [];
  }
}

/**
 * IDで在庫アイテムを取得する
 */
export async function getItemById(id: string): Promise<InventoryItem | null> {
  const items = await getAllItems();
  return items.find((item) => item.id === id) ?? null;
}

/**
 * 新規在庫アイテムを作成する
 */
export async function createItem(input: CreateInventoryItem, userName: string): Promise<InventoryItem> {
  const items = await getAllItems();
  let imageUri = input.imageUri;
  if (imageUri) {
    imageUri = await copyImageToDocuments(imageUri);
  }
  const now = new Date().toISOString();
  const initialLog = createLogEntry(
    userName,
    "create",
    `「${input.name}」を登録（初期在庫: ${input.quantity}個）`
  );
  const newItem: InventoryItem = {
    ...input,
    id: generateId(),
    imageUri,
    createdBy: userName,
    createdAt: now,
    updatedAt: now,
    changeLogs: [initialLog],
  };
  items.push(newItem);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return newItem;
}

/**
 * 在庫アイテムを更新する
 */
export async function updateItem(
  id: string,
  updates: UpdateInventoryItem,
  userName: string
): Promise<InventoryItem | null> {
  const items = await getAllItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  let imageUri = updates.imageUri;
  if (imageUri !== undefined && imageUri !== null && imageUri !== items[index].imageUri) {
    imageUri = await copyImageToDocuments(imageUri);
  }

  const oldItem = items[index];
  const logEntry = createLogEntry(
    userName,
    "edit",
    `物品情報を編集しました`
  );

  const updatedItem: InventoryItem = {
    ...oldItem,
    ...updates,
    ...(imageUri !== undefined ? { imageUri } : {}),
    updatedAt: new Date().toISOString(),
    changeLogs: [...(oldItem.changeLogs ?? []), logEntry],
  };
  items[index] = updatedItem;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return updatedItem;
}

/**
 * 在庫アイテムを削除する
 */
export async function deleteItem(id: string): Promise<boolean> {
  const items = await getAllItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return false;

  // 画像ファイルも削除
  const item = items[index];
  if (item.imageUri && FileSystem.documentDirectory && item.imageUri.startsWith(FileSystem.documentDirectory)) {
    try {
      await FileSystem.deleteAsync(item.imageUri, { idempotent: true });
    } catch {
      // 画像削除失敗は無視
    }
  }

  items.splice(index, 1);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return true;
}

/**
 * 在庫数を更新する（+/- 操作用）
 */
export async function updateQuantity(
  id: string,
  delta: number,
  userName: string
): Promise<InventoryItem | null> {
  const items = await getAllItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const oldQuantity = items[index].quantity;
  const newQuantity = Math.max(0, oldQuantity + delta);

  const logEntry = createLogEntry(
    userName,
    "update_quantity",
    `在庫数を ${oldQuantity} → ${newQuantity} に変更（${delta >= 0 ? "+" : ""}${delta}）`,
    oldQuantity,
    newQuantity
  );

  items[index] = {
    ...items[index],
    quantity: newQuantity,
    updatedAt: new Date().toISOString(),
    changeLogs: [...(items[index].changeLogs ?? []), logEntry],
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items[index];
}

/**
 * 在庫数を直接設定する（数値入力用）
 */
export async function setQuantity(
  id: string,
  newQuantity: number,
  userName: string
): Promise<InventoryItem | null> {
  const items = await getAllItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const oldQuantity = items[index].quantity;
  const safeQuantity = Math.max(0, Math.floor(newQuantity));

  if (oldQuantity === safeQuantity) return items[index];

  const delta = safeQuantity - oldQuantity;
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
  const logEntry = createLogEntry(
    userName,
    "set_quantity",
    `在庫数を ${oldQuantity} → ${safeQuantity} に変更（${deltaStr}）`,
    oldQuantity,
    safeQuantity
  );

  items[index] = {
    ...items[index],
    quantity: safeQuantity,
    updatedAt: new Date().toISOString(),
    changeLogs: [...(items[index].changeLogs ?? []), logEntry],
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items[index];
}

/**
 * アラート対象のアイテムを取得する（閾値以下のもの）
 */
export async function getAlertItems(): Promise<InventoryItem[]> {
  const items = await getAllItems();
  return items.filter((item) => item.quantity <= item.alertThreshold);
}

/**
 * 指定タグを全アイテムの tags から除去する（カテゴリ削除時の孤児タグ対策）。
 * tags が空になったアイテムは ["other"] にする。
 */
export async function removeTagFromAllItems(tagId: string): Promise<void> {
  const items = await getAllItems();
  let changed = false;
  const updated = items.map((item) => {
    if (item.tags?.includes(tagId)) {
      changed = true;
      const newTags = item.tags.filter((t) => t !== tagId);
      return { ...item, tags: newTags.length > 0 ? newTags : ["other"] };
    }
    return item;
  });
  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}
