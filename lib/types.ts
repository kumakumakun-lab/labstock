/**
 * グループタグ定義
 */
export const DEFAULT_TAGS = [
  { id: "equipment", label: "備品", color: "#3B82F6" },
  { id: "chemical", label: "薬品", color: "#EF4444" },
  { id: "consumable", label: "消耗品", color: "#F59E0B" },
  { id: "glassware", label: "ガラス器具", color: "#8B5CF6" },
  { id: "instrument", label: "計測機器", color: "#06B6D4" },
  { id: "other", label: "その他", color: "#6B7280" },
];

export type TagId = "equipment" | "chemical" | "consumable" | "glassware" | "instrument" | "other";

export interface TagItem {
  id: string;
  label: string;
  color: string;
}

/**
 * 変更ログエントリ
 */
export interface ChangeLogEntry {
  /** ログID */
  id: string;
  /** 変更日時（ISO文字列） */
  timestamp: string;
  /** 変更を行ったユーザー名 */
  userName: string;
  /** 変更種別 */
  action: "create" | "update_quantity" | "edit" | "set_quantity";
  /** 変更前の値（在庫数変更時） */
  previousValue?: number;
  /** 変更後の値（在庫数変更時） */
  newValue?: number;
  /** 変更の説明 */
  description: string;
}

/**
 * 在庫アイテムのデータモデル
 */
export interface InventoryItem {
  /** 一意のID（UUID形式） */
  id: string;
  /** 物品名（必須） */
  name: string;
  /** 企業名（製造・販売元） */
  company: string;
  /** 型番 */
  modelNumber: string;
  /** 現在の在庫数（必須） */
  quantity: number;
  /** 保管場所 */
  location: string;
  /** 備考 */
  notes: string;
  /** 画像URI（ローカルファイルパス） */
  imageUri: string | null;
  /** アラート閾値（この数以下でアラート発動） */
  alertThreshold: number;
  /** カテゴリタグID配列（複数選択可） */
  tags: string[];
  /** @deprecated 旧単一タグ（マイグレーション用） */
  tag?: string;
  /** 登録者ユーザー名 */
  createdBy: string;
  /** 登録日時（ISO文字列） */
  createdAt: string;
  /** 更新日時（ISO文字列） */
  updatedAt: string;
  /** 変更ログ */
  changeLogs: ChangeLogEntry[];
  /** バーコード/QRコードのデータ */
  barcode?: string;
}

/**
 * 新規アイテム作成時の入力型（idとタイムスタンプは自動生成）
 */
export type CreateInventoryItem = Omit<InventoryItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "changeLogs" | "tag">;

/**
 * アイテム更新時の入力型
 */
export type UpdateInventoryItem = Partial<CreateInventoryItem>;

/**
 * ソートオプション
 */
export type SortOption = "name" | "quantity" | "createdAt";

/**
 * ソート方向
 */
export type SortDirection = "asc" | "desc";
