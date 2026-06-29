import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  groups,
  groupMembers,
  groupItems,
  groupActivityLogs,
  users,
  type InsertGroup,
  type InsertGroupMember,
  type InsertGroupItem,
  type InsertGroupActivityLog,
} from "../drizzle/schema";

// ─── ヘルパー ───

/** ランダムな招待コードを生成する（8文字の英数字） */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── グループ CRUD ───

/** グループを作成し、作成者をownerとして追加する */
export async function createGroup(
  name: string,
  description: string | null,
  userId: number,
  displayName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inviteCode = generateInviteCode();

  const result = await db.insert(groups).values({
    name,
    description,
    inviteCode,
    createdBy: userId,
  });

  const groupId = Number(result[0].insertId);

  // 作成者をownerとして追加
  await db.insert(groupMembers).values({
    groupId,
    userId,
    role: "owner",
    displayName,
  });

  // 活動ログに記録
  await db.insert(groupActivityLogs).values({
    groupId,
    userId,
    userName: displayName,
    action: "member_joined",
    description: `${displayName}がグループを作成しました`,
  });

  return { groupId, inviteCode };
}

/** ユーザーが所属するグループ一覧を取得する */
export async function getUserGroups(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const memberships = await db
    .select({
      groupId: groupMembers.groupId,
      memberRole: groupMembers.role,
      displayName: groupMembers.displayName,
      groupName: groups.name,
      groupDescription: groups.description,
      inviteCode: groups.inviteCode,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  // 各グループのメンバー数を取得
  const result = await Promise.all(
    memberships.map(async (m) => {
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, m.groupId));
      return {
        ...m,
        memberCount: Number(countResult[0]?.count ?? 0),
      };
    })
  );

  return result;
}

/** グループ詳細を取得する（メンバーのみアクセス可能） */
export async function getGroupDetail(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return null; // 非メンバーにはnullを返す（秘匿性保護）

  const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (group.length === 0) return null;

  return { ...group[0], memberRole: membership[0].role };
}

/** グループのメンバー一覧を取得する（メンバーのみアクセス可能） */
export async function getGroupMembers(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return null; // 非メンバーにはnullを返す

  const members = await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      role: groupMembers.role,
      displayName: groupMembers.displayName,
      joinedAt: groupMembers.joinedAt,
      userName: users.name,
    })
    .from(groupMembers)
    .leftJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  return members;
}

// ─── 招待・参加 ───

/** 招待コードでグループに参加する */
export async function joinGroupByInviteCode(
  inviteCode: string,
  userId: number,
  displayName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 招待コードでグループを検索
  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);

  if (group.length === 0) return { error: "invalid_code" as const };

  const groupId = group[0].id;

  // 既にメンバーかチェック
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) return { error: "already_member" as const };

  // メンバーとして追加
  await db.insert(groupMembers).values({
    groupId,
    userId,
    role: "member",
    displayName,
  });

  // 活動ログに記録
  await db.insert(groupActivityLogs).values({
    groupId,
    userId,
    userName: displayName,
    action: "member_joined",
    description: `${displayName}がグループに参加しました`,
  });

  return { groupId, groupName: group[0].name };
}

/** グループから退出する */
export async function leaveGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return { error: "not_member" as const };

  const displayName = membership[0].displayName ?? "不明なユーザー";

  // ownerは退出不可（グループ削除で対応）
  if (membership[0].role === "owner") return { error: "owner_cannot_leave" as const };

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  // 活動ログに記録
  await db.insert(groupActivityLogs).values({
    groupId,
    userId,
    userName: displayName,
    action: "member_left",
    description: `${displayName}がグループから退出しました`,
  });

  return { success: true };
}

/** グループを削除する（ownerのみ） */
export async function deleteGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (group.length === 0) return { error: "not_found" as const };
  if (group[0].createdBy !== userId) return { error: "not_owner" as const };

  // 関連データをすべて削除（秘匿性保護：データを残さない）
  await db.delete(groupActivityLogs).where(eq(groupActivityLogs.groupId, groupId));
  await db.delete(groupItems).where(eq(groupItems.groupId, groupId));
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));

  return { success: true };
}

// ─── グループ在庫アイテム ───

/** グループの在庫アイテム一覧を取得する（メンバーのみ） */
export async function getGroupItems(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return null; // 非メンバーにはnullを返す

  const items = await db
    .select()
    .from(groupItems)
    .where(eq(groupItems.groupId, groupId));

  return items;
}

/** グループに在庫アイテムを追加する */
export async function addGroupItem(
  groupId: number,
  userId: number,
  userName: string,
  item: Omit<InsertGroupItem, "groupId" | "createdBy">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member");

  const result = await db.insert(groupItems).values({
    ...item,
    groupId,
    createdBy: userId,
  });

  const itemId = Number(result[0].insertId);

  // 活動ログに記録
  await db.insert(groupActivityLogs).values({
    groupId,
    itemId,
    userId,
    userName,
    action: "item_created",
    description: `${userName}が「${item.name}」を追加しました`,
  });

  return { itemId };
}

/** グループの在庫アイテムを更新する */
export async function updateGroupItem(
  groupId: number,
  itemId: number,
  userId: number,
  userName: string,
  updates: Partial<Omit<InsertGroupItem, "id" | "groupId" | "createdBy">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member");

  // 現在のアイテムを取得（変更ログ用）
  const currentItem = await db
    .select()
    .from(groupItems)
    .where(and(eq(groupItems.id, itemId), eq(groupItems.groupId, groupId)))
    .limit(1);

  if (currentItem.length === 0) throw new Error("Item not found");

  await db
    .update(groupItems)
    .set(updates)
    .where(and(eq(groupItems.id, itemId), eq(groupItems.groupId, groupId)));

  // 数量変更の場合はログに記録
  if (updates.quantity !== undefined && updates.quantity !== currentItem[0].quantity) {
    await db.insert(groupActivityLogs).values({
      groupId,
      itemId,
      userId,
      userName,
      action: "quantity_changed",
      previousValue: currentItem[0].quantity,
      newValue: updates.quantity,
      description: `${userName}が「${currentItem[0].name}」の数量を${currentItem[0].quantity}→${updates.quantity}に変更しました`,
    });

    // アラート閾値チェック
    if (
      updates.quantity <= currentItem[0].alertThreshold &&
      currentItem[0].quantity > currentItem[0].alertThreshold
    ) {
      await db.insert(groupActivityLogs).values({
        groupId,
        itemId,
        userId,
        userName,
        action: "alert_triggered",
        newValue: updates.quantity,
        description: `「${currentItem[0].name}」の在庫が閾値（${currentItem[0].alertThreshold}）以下になりました（現在: ${updates.quantity}）`,
      });
    }
  } else {
    // 数量以外の変更
    await db.insert(groupActivityLogs).values({
      groupId,
      itemId,
      userId,
      userName,
      action: "item_updated",
      description: `${userName}が「${currentItem[0].name}」の情報を更新しました`,
    });
  }

  return { success: true };
}

/** グループの在庫アイテムを削除する */
export async function deleteGroupItem(
  groupId: number,
  itemId: number,
  userId: number,
  userName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member");

  const item = await db
    .select()
    .from(groupItems)
    .where(and(eq(groupItems.id, itemId), eq(groupItems.groupId, groupId)))
    .limit(1);

  if (item.length === 0) throw new Error("Item not found");

  // 関連ログのitemIdをnullに（ログは保持）
  await db
    .update(groupActivityLogs)
    .set({ itemId: null })
    .where(and(eq(groupActivityLogs.groupId, groupId), eq(groupActivityLogs.itemId, itemId)));

  await db
    .delete(groupItems)
    .where(and(eq(groupItems.id, itemId), eq(groupItems.groupId, groupId)));

  // 活動ログに記録
  await db.insert(groupActivityLogs).values({
    groupId,
    userId,
    userName,
    action: "item_deleted",
    description: `${userName}が「${item[0].name}」を削除しました`,
  });

  return { success: true };
}

// ─── 活動ログ ───

/** グループの活動ログを取得する（メンバーのみ） */
export async function getGroupActivityLogs(
  groupId: number,
  userId: number,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return null; // 非メンバーにはnullを返す

  const logs = await db
    .select()
    .from(groupActivityLogs)
    .where(eq(groupActivityLogs.groupId, groupId))
    .orderBy(desc(groupActivityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs;
}

/** グループのアラート（閾値以下のアイテム）を取得する（メンバーのみ） */
export async function getGroupAlerts(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // メンバーシップ確認
  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return null;

  const alertItems = await db
    .select()
    .from(groupItems)
    .where(
      and(
        eq(groupItems.groupId, groupId),
        sql`${groupItems.quantity} <= ${groupItems.alertThreshold}`,
        sql`${groupItems.alertThreshold} > 0`
      )
    );

  return alertItems;
}
