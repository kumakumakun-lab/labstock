import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TagItem } from "./types";
import { DEFAULT_TAGS } from "./types";

const CUSTOM_TAGS_KEY = "labstock_custom_tags";

/**
 * カスタムタグ一覧を取得する（デフォルト + ユーザー追加分）
 */
export async function getAllTags(): Promise<TagItem[]> {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_TAGS_KEY);
    if (!data) return [...DEFAULT_TAGS];
    const customTags = JSON.parse(data) as TagItem[];
    return customTags;
  } catch {
    return [...DEFAULT_TAGS];
  }
}

/**
 * タグ一覧を保存する
 */
export async function saveTags(tags: TagItem[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
}

/**
 * タグを追加する
 */
export async function addTag(tag: TagItem): Promise<TagItem[]> {
  const tags = await getAllTags();
  tags.push(tag);
  await saveTags(tags);
  return tags;
}

/**
 * タグを更新する
 */
export async function updateTag(id: string, updates: Partial<Omit<TagItem, "id">>): Promise<TagItem[]> {
  const tags = await getAllTags();
  const index = tags.findIndex((t) => t.id === id);
  if (index !== -1) {
    tags[index] = { ...tags[index], ...updates };
    await saveTags(tags);
  }
  return tags;
}

/**
 * タグを削除する（デフォルトタグは削除不可）
 */
export async function deleteTag(id: string): Promise<TagItem[]> {
  const isDefault = DEFAULT_TAGS.some((t) => t.id === id);
  if (isDefault) {
    // デフォルトタグは削除不可
    return await getAllTags();
  }
  const tags = await getAllTags();
  const filtered = tags.filter((t) => t.id !== id);
  await saveTags(filtered);
  return filtered;
}

/**
 * タグ一覧をデフォルトにリセットする
 */
export async function resetTags(): Promise<TagItem[]> {
  const defaultCopy = [...DEFAULT_TAGS];
  await saveTags(defaultCopy);
  return defaultCopy;
}
