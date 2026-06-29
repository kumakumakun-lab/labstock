import { useState, useRef } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useTags } from "@/lib/tag-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/** ランダムな色を生成する（カスタムタグ用） */
const TAG_COLORS = [
  "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#06B6D4",
  "#10B981", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
  "#84CC16", "#D946EF",
];

function getRandomColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

interface TagSelectorProps {
  /** 選択中のタグID配列 */
  selectedTags: string[];
  /** タグ選択/解除時のコールバック */
  onToggle: (tagId: string) => void;
}

/**
 * タグ選択コンポーネント（追加・編集画面用）
 * 複数選択対応 + 自由記述でカテゴリ追加可能
 */
export function TagSelector({ selectedTags, onToggle }: TagSelectorProps) {
  const { tags, addTag } = useTags();
  const [isAdding, setIsAdding] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const inputRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const colors = useColors();

  const handleAddTag = async () => {
    if (submittingRef.current) return; // onSubmitEditing と onBlur の二重発火を防ぐ
    submittingRef.current = true;
    try {
      const label = newTagLabel.trim();
      if (!label) {
        setIsAdding(false);
        setNewTagLabel("");
        return;
      }

      // 既存タグと重複チェック
      const duplicate = tags.find(
        (t) => t.label.toLowerCase() === label.toLowerCase()
      );
      if (duplicate) {
        // 既存タグを選択状態にする
        if (!selectedTags.includes(duplicate.id)) {
          onToggle(duplicate.id);
        }
        setIsAdding(false);
        setNewTagLabel("");
        return;
      }

      const newTag = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        label,
        color: getRandomColor(),
      };

      try {
        await addTag(newTag);
        // 追加後に自動選択
        onToggle(newTag.id);
      } catch {
        if (Platform.OS !== "web") {
          Alert.alert("エラー", "カテゴリの追加に失敗しました");
        }
      }

      setIsAdding(false);
      setNewTagLabel("");
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => onToggle(tag.id)}
              activeOpacity={0.7}
              style={[
                styles.tagChip,
                {
                  backgroundColor: isSelected ? tag.color : tag.color + "15",
                  borderColor: isSelected ? tag.color : tag.color + "40",
                },
              ]}
            >
              <View style={[styles.tagDot, { backgroundColor: isSelected ? "#FFFFFF" : tag.color }]} />
              <Text
                style={[
                  styles.tagLabel,
                  { color: isSelected ? "#FFFFFF" : tag.color },
                ]}
              >
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* 自由記述追加ボタン / 入力欄 */}
        {isAdding ? (
          <View style={[styles.addInputContainer, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}>
            <TextInput
              ref={inputRef}
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              placeholder="カテゴリ名"
              placeholderTextColor={colors.muted}
              style={[styles.addInput, { color: colors.foreground }]}
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
              onBlur={handleAddTag}
            />
            <TouchableOpacity onPress={handleAddTag} activeOpacity={0.7} style={styles.addConfirmButton}>
              <MaterialIcons name="check" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setIsAdding(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            activeOpacity={0.7}
            style={[
              styles.addTagChip,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <MaterialIcons name="add" size={16} color={colors.muted} />
            <Text style={[styles.addTagLabel, { color: colors.muted }]}>追加</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

interface TagFilterBarProps {
  selectedTag: string | null;
  onSelect: (tagId: string | null) => void;
  itemCounts?: Record<string, number>;
}

/**
 * タグフィルターバー（一覧画面用）
 * フィルターは引き続き単一選択（UX上、フィルターは1つずつ）
 */
export function TagFilterBar({ selectedTag, onSelect, itemCounts }: TagFilterBarProps) {
  const colors = useColors();
  const { tags } = useTags();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
        style={[
          styles.filterChip,
          {
            backgroundColor: selectedTag === null ? colors.primary : colors.surface,
            borderColor: selectedTag === null ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.filterLabel,
            { color: selectedTag === null ? "#FFFFFF" : colors.foreground },
          ]}
        >
          すべて
        </Text>
        {itemCounts && (
          <Text
            style={[
              styles.filterCount,
              { color: selectedTag === null ? "rgba(255,255,255,0.8)" : colors.muted },
            ]}
          >
            {Object.values(itemCounts).reduce((a, b) => a + b, 0)}
          </Text>
        )}
      </TouchableOpacity>
      {tags.map((tag) => {
        const isSelected = selectedTag === tag.id;
        const count = itemCounts?.[tag.id] ?? 0;
        return (
          <TouchableOpacity
            key={tag.id}
            onPress={() => onSelect(isSelected ? null : tag.id)}
            activeOpacity={0.7}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected ? tag.color : colors.surface,
                borderColor: isSelected ? tag.color : colors.border,
              },
            ]}
          >
            <View style={[styles.filterDot, { backgroundColor: isSelected ? "#FFFFFF" : tag.color }]} />
            <Text
              style={[
                styles.filterLabel,
                { color: isSelected ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {tag.label}
            </Text>
            {count > 0 && (
              <Text
                style={[
                  styles.filterCount,
                  { color: isSelected ? "rgba(255,255,255,0.8)" : colors.muted },
                ]}
              >
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * タグバッジ（カード上の小さなタグ表示）
 */
export function TagBadge({ tagId }: { tagId: string }) {
  const { getTagById } = useTags();
  const tag = getTagById(tagId);
  if (!tag) return null;

  return (
    <View style={[styles.badge, { backgroundColor: tag.color + "18" }]}>
      <View style={[styles.badgeDot, { backgroundColor: tag.color }]} />
      <Text style={[styles.badgeLabel, { color: tag.color }]}>{tag.label}</Text>
    </View>
  );
}

/**
 * 複数タグバッジ表示（カード上の複数タグ表示）
 */
export function TagBadges({ tagIds }: { tagIds: string[] }) {
  if (!tagIds || tagIds.length === 0) return null;
  return (
    <View style={styles.badgesContainer}>
      {tagIds.map((id) => (
        <TagBadge key={id} tagId={id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  scrollContent: { gap: 8, alignItems: "center" },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagLabel: { fontSize: 14, fontWeight: "600" },
  // 自由記述追加
  addTagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 4,
  },
  addTagLabel: { fontSize: 14, fontWeight: "500" },
  addInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
    minWidth: 120,
  },
  addInput: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    paddingVertical: 4,
    minWidth: 80,
  },
  addConfirmButton: {
    padding: 4,
  },
  // フィルターバー
  filterScrollContent: { paddingHorizontal: 20, gap: 8, paddingVertical: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterLabel: { fontSize: 13, fontWeight: "600" },
  filterCount: { fontSize: 11, fontWeight: "500" },
  // バッジ
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: "flex-start",
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeLabel: { fontSize: 11, fontWeight: "600" },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
});
