import { useState } from "react";
import {
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTags } from "@/lib/tag-context";
import { DEFAULT_TAGS, type TagItem } from "@/lib/types";
import * as Storage from "@/lib/storage";

const PRESET_COLORS = [
  "#2563EB", "#DC2626", "#16A34A", "#9333EA", "#EA580C",
  "#0891B2", "#D946EF", "#CA8A04", "#059669", "#E11D48",
  "#7C3AED", "#0284C7", "#65A30D", "#C026D3", "#F97316",
];

interface CategoryManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function CategoryManager({ visible, onClose }: CategoryManagerProps) {
  const colors = useColors();
  const { tags, addTag, updateTag, deleteTag, resetTags } = useTags();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const isDefaultTag = (id: string) => DEFAULT_TAGS.some((t) => t.id === id);

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      Alert.alert("入力エラー", "カテゴリ名を入力してください。");
      return;
    }
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await addTag({ id, label: newLabel.trim(), color: newColor });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setNewLabel("");
    setNewColor(PRESET_COLORS[0]);
    setIsAdding(false);
  };

  const handleEdit = async (id: string) => {
    if (!newLabel.trim()) {
      Alert.alert("入力エラー", "カテゴリ名を入力してください。");
      return;
    }
    await updateTag(id, { label: newLabel.trim(), color: newColor });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingId(null);
    setNewLabel("");
    setNewColor(PRESET_COLORS[0]);
  };

  const handleDelete = (tag: TagItem) => {
    if (isDefaultTag(tag.id)) {
      Alert.alert("削除不可", "デフォルトカテゴリは削除できません。");
      return;
    }
    const doDelete = async () => {
      await deleteTag(tag.id);
      // このカテゴリを使用中の個人在庫から該当タグを除去（空なら「その他」に）
      await Storage.removeTagFromAllItems(tag.id);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`「${tag.label}」を削除しますか？`)) doDelete();
    } else {
      Alert.alert("削除確認", `「${tag.label}」を削除しますか？\nこのカテゴリを使用中の物品は「その他」に変更されます。`, [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setNewLabel(tag.label);
    setNewColor(tag.color);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNewLabel("");
    setNewColor(PRESET_COLORS[0]);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewLabel("");
    setNewColor(PRESET_COLORS[0]);
  };

  const renderColorPicker = () => (
    <View style={styles.colorPicker}>
      {PRESET_COLORS.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => setNewColor(c)}
          activeOpacity={0.7}
          style={[
            styles.colorDot,
            { backgroundColor: c, borderColor: newColor === c ? colors.foreground : "transparent" },
          ]}
        >
          {newColor === c && (
            <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTagItem = ({ item }: { item: TagItem }) => {
    const isEditing = editingId === item.id;
    const isDefault = isDefaultTag(item.id);

    if (isEditing) {
      return (
        <View style={[styles.editRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.editInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.background }]}
            value={newLabel}
            onChangeText={setNewLabel}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleEdit(item.id)}
            placeholder="カテゴリ名"
            placeholderTextColor={colors.muted}
          />
          {renderColorPicker()}
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => handleEdit(item.id)}
              style={[styles.editActionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={styles.editActionText}>保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cancelEdit}
              style={[styles.editActionBtn, { backgroundColor: colors.muted + "30" }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.editActionText, { color: colors.muted }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.tagRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.tagColorIndicator, { backgroundColor: item.color }]} />
        <Text style={[styles.tagName, { color: colors.foreground }]}>{item.label}</Text>
        {isDefault && (
          <Text style={[styles.defaultBadge, { color: colors.muted }]}>デフォルト</Text>
        )}
        <View style={styles.tagActions}>
          <TouchableOpacity onPress={() => startEdit(item)} activeOpacity={0.6} style={styles.tagActionBtn}>
            <IconSymbol name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
          {!isDefault && (
            <TouchableOpacity onPress={() => handleDelete(item)} activeOpacity={0.6} style={styles.tagActionBtn}>
              <IconSymbol name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* ヘッダー */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>カテゴリ管理</Text>
            <TouchableOpacity onPress={startAdd} activeOpacity={0.6}>
              <IconSymbol name="plus" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 追加フォーム */}
          {isAdding && (
            <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.addFormTitle, { color: colors.foreground }]}>新しいカテゴリ</Text>
              <TextInput
                style={[styles.editInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.background }]}
                value={newLabel}
                onChangeText={setNewLabel}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                placeholder="カテゴリ名を入力"
                placeholderTextColor={colors.muted}
              />
              {renderColorPicker()}
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={[styles.editActionBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editActionText}>追加</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={[styles.editActionBtn, { backgroundColor: colors.muted + "30" }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.editActionText, { color: colors.muted }]}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* タグ一覧 */}
          <FlatList
            data={tags}
            keyExtractor={(item) => item.id}
            renderItem={renderTagItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* フッター */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              {tags.length}個のカテゴリ
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  addForm: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  addFormTitle: { fontSize: 15, fontWeight: "600" },
  listContent: { paddingBottom: 20 },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  tagColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  tagName: { fontSize: 16, fontWeight: "500", flex: 1 },
  defaultBadge: { fontSize: 11, fontWeight: "500" },
  tagActions: { flexDirection: "row", gap: 12 },
  tagActionBtn: { padding: 4 },
  editRow: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  editActions: { flexDirection: "row", gap: 8 },
  editActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  editActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    alignItems: "center",
  },
  footerText: { fontSize: 12 },
});
