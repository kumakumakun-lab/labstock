/**
 * 入力バリデーション・サニタイズユーティリティ
 * XSS防止、不正入力防止のためのセキュリティ層
 */

/** 最大文字数の定義 */
export const MAX_LENGTHS = {
  name: 100,
  company: 100,
  modelNumber: 100,
  location: 100,
  notes: 500,
  userName: 50,
  tagLabel: 30,
  barcode: 200,
} as const;

/** 数量の範囲 */
export const QUANTITY_RANGE = {
  min: 0,
  max: 999999,
} as const;

/** アラート閾値の範囲 */
export const ALERT_THRESHOLD_RANGE = {
  min: 0,
  max: 99999,
} as const;

/**
 * HTMLタグやスクリプトを除去するサニタイズ処理
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // HTMLタグを除去
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/javascript:/gi, "") // javascript: URLスキームを除去
    .replace(/on\w+\s*=/gi, "") // イベントハンドラ属性を除去
    .trim();
}

/**
 * 文字列を最大長に切り詰める
 */
export function truncateString(input: string, maxLength: number): string {
  const sanitized = sanitizeString(input);
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * 数値を安全な範囲に制限する
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

/**
 * 物品名のバリデーション
 */
export function validateItemName(name: string): { valid: boolean; error?: string; sanitized: string } {
  const sanitized = truncateString(name, MAX_LENGTHS.name);
  if (sanitized.length === 0) {
    return { valid: false, error: "物品名を入力してください", sanitized };
  }
  if (sanitized.length < 1) {
    return { valid: false, error: "物品名は1文字以上で入力してください", sanitized };
  }
  return { valid: true, sanitized };
}

/**
 * ユーザー名のバリデーション
 */
export function validateUserName(name: string): { valid: boolean; error?: string; sanitized: string } {
  const sanitized = truncateString(name, MAX_LENGTHS.userName);
  if (sanitized.length === 0) {
    return { valid: false, error: "ユーザー名を入力してください", sanitized };
  }
  if (sanitized.length < 1) {
    return { valid: false, error: "ユーザー名は1文字以上で入力してください", sanitized };
  }
  return { valid: true, sanitized };
}

/**
 * 数量のバリデーション
 */
export function validateQuantity(value: number): { valid: boolean; error?: string; sanitized: number } {
  const sanitized = clampNumber(value, QUANTITY_RANGE.min, QUANTITY_RANGE.max);
  if (Number.isNaN(value)) {
    return { valid: false, error: "有効な数値を入力してください", sanitized: 0 };
  }
  return { valid: true, sanitized };
}

/**
 * アラート閾値のバリデーション
 */
export function validateAlertThreshold(value: number): { valid: boolean; error?: string; sanitized: number } {
  const sanitized = clampNumber(value, ALERT_THRESHOLD_RANGE.min, ALERT_THRESHOLD_RANGE.max);
  if (Number.isNaN(value)) {
    return { valid: false, error: "有効な数値を入力してください", sanitized: 0 };
  }
  return { valid: true, sanitized };
}

/**
 * 汎用テキストフィールドのバリデーション
 */
export function validateTextField(
  value: string,
  fieldName: string,
  maxLength: number,
  required = false
): { valid: boolean; error?: string; sanitized: string } {
  const sanitized = truncateString(value, maxLength);
  if (required && sanitized.length === 0) {
    return { valid: false, error: `${fieldName}を入力してください`, sanitized };
  }
  return { valid: true, sanitized };
}

/**
 * 画像URIのバリデーション
 */
export function validateImageUri(uri: string | null): { valid: boolean; sanitized: string | null } {
  if (!uri) return { valid: true, sanitized: null };
  // file:// または content:// スキームのみ許可
  const allowedSchemes = ["file://", "content://", "ph://", "assets-library://"];
  const isValid = allowedSchemes.some((scheme) => uri.startsWith(scheme));
  if (!isValid) {
    return { valid: false, sanitized: null };
  }
  return { valid: true, sanitized: uri };
}

/**
 * CreateInventoryItemの全フィールドをバリデーション・サニタイズする
 */
export function sanitizeInventoryInput(input: {
  name: string;
  company: string;
  modelNumber: string;
  quantity: number;
  location: string;
  notes: string;
  imageUri: string | null;
  alertThreshold: number;
  tags: string[];
  barcode?: string;
}): {
  valid: boolean;
  errors: string[];
  sanitized: typeof input;
} {
  const errors: string[] = [];

  const nameResult = validateItemName(input.name);
  if (!nameResult.valid && nameResult.error) errors.push(nameResult.error);

  const companyResult = validateTextField(input.company, "企業名", MAX_LENGTHS.company);
  const modelResult = validateTextField(input.modelNumber, "型番", MAX_LENGTHS.modelNumber);
  const locationResult = validateTextField(input.location, "保管場所", MAX_LENGTHS.location);
  const notesResult = validateTextField(input.notes, "備考", MAX_LENGTHS.notes);
  const quantityResult = validateQuantity(input.quantity);
  const thresholdResult = validateAlertThreshold(input.alertThreshold);
  const imageResult = validateImageUri(input.imageUri);
  const barcodeResult = validateTextField(input.barcode ?? "", "バーコード", MAX_LENGTHS.barcode);

  // タグのサニタイズ
  const sanitizedTags = input.tags.map((t) => sanitizeString(t)).filter((t) => t.length > 0);
  // タグが空の場合はデフォルトを設定
  const finalTags = sanitizedTags.length > 0 ? sanitizedTags : ["other"];

  if (!quantityResult.valid && quantityResult.error) errors.push(quantityResult.error);
  if (!thresholdResult.valid && thresholdResult.error) errors.push(thresholdResult.error);

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      name: nameResult.sanitized,
      company: companyResult.sanitized,
      modelNumber: modelResult.sanitized,
      quantity: quantityResult.sanitized,
      location: locationResult.sanitized,
      notes: notesResult.sanitized,
      imageUri: imageResult.sanitized,
      alertThreshold: thresholdResult.sanitized,
      tags: finalTags,
      barcode: barcodeResult.sanitized || undefined,
    },
  };
}
