import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * グループテーブル
 * ユーザーがグループを作成し、招待リンクでメンバーを招待できる
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  /** グループ名 */
  name: varchar("name", { length: 200 }).notNull(),
  /** グループの説明 */
  description: text("description"),
  /** 招待コード（ユニーク、共有リンクに使用） */
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  /** グループ作成者のユーザーID */
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * グループメンバーテーブル
 * グループとユーザーの多対多リレーション
 */
export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  /** グループID */
  groupId: int("groupId").notNull(),
  /** ユーザーID */
  userId: int("userId").notNull(),
  /** メンバーロール（owner=作成者、member=一般メンバー） */
  role: mysqlEnum("memberRole", ["owner", "member"]).default("member").notNull(),
  /** 表示名（グループ内での名前） */
  displayName: varchar("displayName", { length: 100 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

/**
 * グループ在庫アイテムテーブル
 * グループ内で共有される在庫情報
 */
export const groupItems = mysqlTable("group_items", {
  id: int("id").autoincrement().primaryKey(),
  /** グループID */
  groupId: int("groupId").notNull(),
  /** 物品名 */
  name: varchar("name", { length: 300 }).notNull(),
  /** 企業名 */
  company: varchar("company", { length: 300 }),
  /** 型番 */
  modelNumber: varchar("modelNumber", { length: 200 }),
  /** 現在の在庫数 */
  quantity: int("quantity").notNull().default(0),
  /** 保管場所 */
  location: varchar("location", { length: 300 }),
  /** 備考 */
  notes: text("notes"),
  /** 画像URL（S3に保存） */
  imageUrl: text("imageUrl"),
  /** アラート閾値 */
  alertThreshold: int("alertThreshold").notNull().default(0),
  /** カテゴリタグ（JSON配列） */
  tags: json("tags").$type<string[]>(),
  /** バーコード */
  barcode: varchar("barcode", { length: 200 }),
  /** 登録者ユーザーID */
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupItem = typeof groupItems.$inferSelect;
export type InsertGroupItem = typeof groupItems.$inferInsert;

/**
 * グループ活動ログテーブル
 * 数量変更・アラート等のログをグループメンバーにのみ共有
 */
export const groupActivityLogs = mysqlTable("group_activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** グループID */
  groupId: int("groupId").notNull(),
  /** 対象アイテムID（null=グループ全体のイベント） */
  itemId: int("itemId"),
  /** 操作を行ったユーザーID */
  userId: int("userId").notNull(),
  /** 操作を行ったユーザーの表示名（ログ記録時点） */
  userName: varchar("userName", { length: 100 }).notNull(),
  /** アクション種別 */
  action: mysqlEnum("action", [
    "item_created",
    "item_updated",
    "item_deleted",
    "quantity_changed",
    "alert_triggered",
    "member_joined",
    "member_left",
  ]).notNull(),
  /** 変更前の値（数量変更時） */
  previousValue: int("previousValue"),
  /** 変更後の値（数量変更時） */
  newValue: int("newValue"),
  /** ログの説明文 */
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupActivityLog = typeof groupActivityLogs.$inferSelect;
export type InsertGroupActivityLog = typeof groupActivityLogs.$inferInsert;
