import { describe, it, expect, vi } from "vitest";

// expo-file-system と expo-sharing のモック
vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "/mock/cache/",
  writeAsStringAsync: vi.fn(async () => {}),
  EncodingType: { UTF8: "utf8", Base64: "base64" },
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => false),
  shareAsync: vi.fn(async () => {}),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: { alert: vi.fn() },
}));

import { generateExcelXlsx } from "../export-excel";
import * as XLSX from "xlsx";

interface TestItem {
  id: string;
  name: string;
  company: string;
  modelNumber: string;
  quantity: number;
  location: string;
  notes: string;
  imageUri: string | null;
  alertThreshold: number;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  changeLogs: unknown[];
}

const sampleItems: TestItem[] = [
  {
    id: "test-1",
    name: "エッペンドルフチューブ",
    company: "Eppendorf",
    modelNumber: "0030 120.086",
    quantity: 100,
    location: "冷蔵庫A-2段目",
    notes: "1.5mL",
    imageUri: null,
    alertThreshold: 10,
    tags: ["consumable"],
    createdBy: "テストユーザー",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    changeLogs: [],
  },
  {
    id: "test-2",
    name: "塩酸 <特級>",
    company: "和光純薬 & Co.",
    modelNumber: "083-01115",
    quantity: 3,
    location: "薬品庫B",
    notes: "取扱注意",
    imageUri: null,
    alertThreshold: 5,
    tags: ["chemical"],
    createdBy: "管理者",
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-02-15T00:00:00.000Z",
    changeLogs: [],
  },
  {
    id: "test-3",
    name: "電子天秤",
    company: "島津製作所",
    modelNumber: "ATX224",
    quantity: 0,
    location: "実験台C",
    notes: "",
    imageUri: null,
    alertThreshold: 1,
    tags: ["instrument"],
    createdBy: "テストユーザー",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    changeLogs: [],
  },
];

describe("Excel Export (.xlsx)", () => {
  it("should generate a valid xlsx ArrayBuffer", () => {
    const buffer = generateExcelXlsx(sampleItems as any);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("should contain a worksheet named '在庫一覧'", () => {
    const buffer = generateExcelXlsx(sampleItems as any);
    const wb = XLSX.read(buffer, { type: "array" });
    expect(wb.SheetNames).toContain("在庫一覧");
  });

  it("should include all header columns", () => {
    const buffer = generateExcelXlsx(sampleItems as any);
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets["在庫一覧"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const headers = data[0];
    expect(headers).toContain("物品名");
    expect(headers).toContain("企業名");
    expect(headers).toContain("型番");
    expect(headers).toContain("カテゴリ");
    expect(headers).toContain("在庫数");
    expect(headers).toContain("アラート閾値");
    expect(headers).toContain("保管場所");
    expect(headers).toContain("備考");
    expect(headers).toContain("登録者");
    expect(headers).toContain("登録日時");
    expect(headers).toContain("最終更新");
    expect(headers).toContain("ステータス");
  });

  it("should include item data with correct values", () => {
    const buffer = generateExcelXlsx(sampleItems as any);
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets["在庫一覧"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    // data[0] = headers, data[1] = first item, etc.
    expect(data.length).toBe(4); // 1 header + 3 items
    // First item name
    expect(data[1][0]).toBe("エッペンドルフチューブ");
    expect(data[1][1]).toBe("Eppendorf");
    // Second item with special characters
    expect(data[2][0]).toBe("塩酸 <特級>");
    expect(data[2][1]).toBe("和光純薬 & Co.");
    // Third item
    expect(data[3][0]).toBe("電子天秤");
    expect(data[3][1]).toBe("島津製作所");
  });

  it("should correctly determine status", () => {
    const buffer = generateExcelXlsx(sampleItems as any);
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets["在庫一覧"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    // Status is the last column (index 11)
    expect(data[1][11]).toBe("正常");      // quantity 100, threshold 10
    expect(data[2][11]).toBe("在庫少量");  // quantity 3, threshold 5
    expect(data[3][11]).toBe("在庫切れ");  // quantity 0
  });

  it("should handle empty items array", () => {
    const buffer = generateExcelXlsx([]);
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets["在庫一覧"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(data.length).toBe(1); // Only headers
    expect(data[0]).toContain("物品名");
  });
});
