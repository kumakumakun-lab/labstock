import { describe, it, expect, vi, beforeEach } from "vitest";

// AsyncStorage のモック
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    }),
  },
}));

// expo-file-system のモック
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/mock/documents/",
  copyAsync: vi.fn(async () => {}),
  deleteAsync: vi.fn(async () => {}),
}));

import {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
  updateQuantity,
  setQuantity,
  getAlertItems,
} from "../storage";
import type { CreateInventoryItem } from "../types";

const testUser = "テストユーザー";

const sampleItem: CreateInventoryItem = {
  name: "エッペンドルフチューブ",
  company: "Eppendorf",
  modelNumber: "0030 120.086",
  quantity: 100,
  location: "冷蔵庫A-2段目",
  notes: "1.5mL",
  imageUri: null,
  alertThreshold: 10,
  tags: ["consumable"],
};

describe("Storage Service", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should return empty array when no items exist", async () => {
    const items = await getAllItems();
    expect(items).toEqual([]);
  });

  it("should create a new item with user name and change log", async () => {
    const created = await createItem(sampleItem, testUser);
    expect(created.id).toBeDefined();
    expect(created.name).toBe("エッペンドルフチューブ");
    expect(created.company).toBe("Eppendorf");
    expect(created.modelNumber).toBe("0030 120.086");
    expect(created.quantity).toBe(100);
    expect(created.alertThreshold).toBe(10);
    expect(created.createdBy).toBe(testUser);
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
    expect(created.changeLogs).toHaveLength(1);
    expect(created.changeLogs[0].action).toBe("create");
    expect(created.changeLogs[0].userName).toBe(testUser);
  });

  it("should retrieve all items after creation", async () => {
    await createItem(sampleItem, testUser);
    await createItem({ ...sampleItem, name: "ピペットチップ", quantity: 50 }, testUser);
    const items = await getAllItems();
    expect(items).toHaveLength(2);
  });

  it("should update an item with change log", async () => {
    const created = await createItem(sampleItem, testUser);
    const updated = await updateItem(created.id, { quantity: 80, notes: "更新済み" }, "別のユーザー");
    expect(updated).not.toBeNull();
    expect(updated!.quantity).toBe(80);
    expect(updated!.notes).toBe("更新済み");
    expect(updated!.name).toBe("エッペンドルフチューブ");
    expect(updated!.changeLogs).toHaveLength(2);
    expect(updated!.changeLogs[1].action).toBe("edit");
    expect(updated!.changeLogs[1].userName).toBe("別のユーザー");
  });

  it("should delete an item", async () => {
    const created = await createItem(sampleItem, testUser);
    const result = await deleteItem(created.id);
    expect(result).toBe(true);
    const items = await getAllItems();
    expect(items).toHaveLength(0);
  });

  it("should return false when deleting non-existent item", async () => {
    const result = await deleteItem("non-existent-id");
    expect(result).toBe(false);
  });

  it("should update quantity with delta and log change", async () => {
    const created = await createItem(sampleItem, testUser);
    const updated = await updateQuantity(created.id, -10, testUser);
    expect(updated).not.toBeNull();
    expect(updated!.quantity).toBe(90);
    expect(updated!.changeLogs).toHaveLength(2);
    expect(updated!.changeLogs[1].action).toBe("update_quantity");
    expect(updated!.changeLogs[1].previousValue).toBe(100);
    expect(updated!.changeLogs[1].newValue).toBe(90);
  });

  it("should not allow quantity below 0", async () => {
    const created = await createItem({ ...sampleItem, quantity: 3 }, testUser);
    const updated = await updateQuantity(created.id, -10, testUser);
    expect(updated).not.toBeNull();
    expect(updated!.quantity).toBe(0);
  });

  it("should set quantity directly and log change", async () => {
    const created = await createItem(sampleItem, testUser);
    const updated = await setQuantity(created.id, 42, "管理者");
    expect(updated).not.toBeNull();
    expect(updated!.quantity).toBe(42);
    expect(updated!.changeLogs).toHaveLength(2);
    expect(updated!.changeLogs[1].action).toBe("set_quantity");
    expect(updated!.changeLogs[1].previousValue).toBe(100);
    expect(updated!.changeLogs[1].newValue).toBe(42);
    expect(updated!.changeLogs[1].userName).toBe("管理者");
  });

  it("should return alert items when quantity is at or below threshold", async () => {
    await createItem({ ...sampleItem, name: "Item A", quantity: 5, alertThreshold: 10 }, testUser);
    await createItem({ ...sampleItem, name: "Item B", quantity: 20, alertThreshold: 10 }, testUser);
    await createItem({ ...sampleItem, name: "Item C", quantity: 10, alertThreshold: 10 }, testUser);
    const alertItems = await getAlertItems();
    expect(alertItems).toHaveLength(2);
    expect(alertItems.map((i) => i.name).sort()).toEqual(["Item A", "Item C"]);
  });
});
