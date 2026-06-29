import { supabase } from "./supabase";
import { getDeviceId } from "./device-id";

/**
 * グループ共有データ層。
 *
 * 以前は端末内 AsyncStorage のみで、招待コードが他端末で機能しなかった
 * （＝共有が成立しない）。本実装では Supabase の RPC 関数経由でサーバに保存し、
 * 招待コードで実際に複数端末から同じグループへ参加・共有できるようにした。
 * 公開している型・関数シグネチャは従来どおりのため、UI 側の変更は不要。
 */

// ─── 型定義（従来と互換） ───

export interface LocalGroup {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdBy: string; // ユーザー名
  createdAt: string;
  memberCount: number;
  isOwner: boolean;
}

export interface LocalGroupItem {
  id: string;
  groupId: string;
  name: string;
  company: string;
  modelNumber: string;
  quantity: number;
  location: string;
  notes: string;
  alertThreshold: number;
  tags: string[];
  barcode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGroupLog {
  id: string;
  groupId: string;
  userName: string;
  action: string;
  description: string;
  timestamp: string;
}

// ─── グループ CRUD ───

/** グループを作成する */
export async function createGroup(
  name: string,
  description: string,
  userName: string,
): Promise<LocalGroup> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description,
    p_device_id: deviceId,
    p_user_name: userName,
  });
  if (error) throw new Error(error.message || "グループの作成に失敗しました");
  return data as LocalGroup;
}

/** 自分が参加しているグループ一覧を取得する */
export async function getMyGroups(): Promise<LocalGroup[]> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("get_my_groups", { p_device_id: deviceId });
  if (error) {
    console.warn("[group-storage] getMyGroups failed:", error.message);
    return [];
  }
  return (data ?? []) as LocalGroup[];
}

/** グループ詳細を取得する（メンバーでなければ null） */
export async function getGroupById(groupId: string): Promise<LocalGroup | null> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("get_group_by_id", {
    p_group_id: groupId,
    p_device_id: deviceId,
  });
  if (error) {
    console.warn("[group-storage] getGroupById failed:", error.message);
    return null;
  }
  return (data as LocalGroup) ?? null;
}

/** 招待コードでグループに参加する */
export async function joinGroupByInviteCode(
  inviteCode: string,
  userName: string,
): Promise<{ success: boolean; group?: LocalGroup; error?: string }> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("join_group", {
    p_invite_code: inviteCode,
    p_device_id: deviceId,
    p_user_name: userName,
  });
  if (error) {
    console.warn("[group-storage] joinGroup failed:", error.message);
    return { success: false, error: "通信エラーが発生しました。電波の良い場所で再度お試しください。" };
  }
  return data as { success: boolean; group?: LocalGroup; error?: string };
}

/** グループから退出する */
export async function leaveGroup(groupId: string, userName: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("leave_group", {
    p_group_id: groupId,
    p_device_id: deviceId,
    p_user_name: userName,
  });
  if (error) {
    console.warn("[group-storage] leaveGroup failed:", error.message);
    return false;
  }
  return Boolean(data);
}

/** グループを削除する（オーナーのみ） */
export async function deleteGroup(groupId: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("delete_group", {
    p_group_id: groupId,
    p_device_id: deviceId,
  });
  if (error) {
    console.warn("[group-storage] deleteGroup failed:", error.message);
    return false;
  }
  return Boolean(data);
}

// ─── グループ在庫アイテム ───

/** グループの在庫アイテム一覧を取得する */
export async function getGroupItems(groupId: string): Promise<LocalGroupItem[]> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("get_group_items", {
    p_group_id: groupId,
    p_device_id: deviceId,
  });
  if (error) {
    console.warn("[group-storage] getGroupItems failed:", error.message);
    return [];
  }
  return (data ?? []) as LocalGroupItem[];
}

/** グループに在庫アイテムを追加する */
export async function addGroupItem(
  groupId: string,
  item: Omit<LocalGroupItem, "id" | "groupId" | "createdAt" | "updatedAt">,
  userName: string,
): Promise<LocalGroupItem> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("add_group_item", {
    p_group_id: groupId,
    p_device_id: deviceId,
    p_user_name: userName,
    p_item: item,
  });
  if (error) throw new Error(error.message || "アイテムの追加に失敗しました");
  return data as LocalGroupItem;
}

/** グループの在庫アイテムを更新する */
export async function updateGroupItem(
  groupId: string,
  itemId: string,
  updates: Partial<LocalGroupItem>,
  userName: string,
): Promise<LocalGroupItem | null> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("update_group_item", {
    p_group_id: groupId,
    p_item_id: itemId,
    p_device_id: deviceId,
    p_user_name: userName,
    p_updates: updates,
  });
  if (error) {
    console.warn("[group-storage] updateGroupItem failed:", error.message);
    return null;
  }
  return (data as LocalGroupItem) ?? null;
}

/** グループの在庫アイテムを削除する */
export async function deleteGroupItem(
  groupId: string,
  itemId: string,
  userName: string,
): Promise<boolean> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("delete_group_item", {
    p_group_id: groupId,
    p_item_id: itemId,
    p_device_id: deviceId,
    p_user_name: userName,
  });
  if (error) {
    console.warn("[group-storage] deleteGroupItem failed:", error.message);
    return false;
  }
  return Boolean(data);
}

/** グループのアラート対象アイテム（在庫が閾値以下）を取得する */
export async function getGroupAlerts(groupId: string): Promise<LocalGroupItem[]> {
  const items = await getGroupItems(groupId);
  return items.filter((item) => item.quantity <= item.alertThreshold);
}

// ─── 活動ログ ───

/** グループの活動ログ（最新100件）を取得する */
export async function getGroupLogs(groupId: string): Promise<LocalGroupLog[]> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("get_group_logs", {
    p_group_id: groupId,
    p_device_id: deviceId,
  });
  if (error) {
    console.warn("[group-storage] getGroupLogs failed:", error.message);
    return [];
  }
  return (data ?? []) as LocalGroupLog[];
}
