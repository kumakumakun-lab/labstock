import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import type { InventoryItem, ChangeLogEntry } from "@/lib/types";
import { TagBadges } from "@/components/tag-selector";
import { WheelNumberPicker } from "@/components/wheel-number-picker";

interface ItemDetailModalProps {
  item: InventoryItem;
  visible: boolean;
  onClose: () => void;
  onQuantityChange: (id: string, delta: number, userName: string) => Promise<InventoryItem | null>;
  onSetQuantity: (id: string, newQuantity: number, userName: string) => Promise<InventoryItem | null>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  /** グループ物品の場合のグループ名（共有バッジ表示用） */
  groupLabel?: string;
  /** 編集ボタンの遷移先を上書き（グループ物品はグループ画面へ） */
  onEditOverride?: () => void;
}

export default function ItemDetailModal({
  item,
  visible,
  onClose,
  onQuantityChange,
  onSetQuantity,
  onDelete,
  onRefresh,
  groupLabel,
  onEditOverride,
}: ItemDetailModalProps) {
  const colors = useColors();
  const router = useRouter();
  const { userName } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingQuantity, setPendingQuantity] = useState(item.quantity);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const currentUser = userName ?? "不明";

  // 別アイテムを開いた／保存で在庫数が変わったら、ピッカーの値を最新に同期する
  useEffect(() => {
    setPendingQuantity(item.quantity);
  }, [item.id, item.quantity]);

  const hasQuantityChange = pendingQuantity !== item.quantity;

  const getQuantityColor = (qty: number) => {
    if (qty <= 0) return colors.error;
    if (qty <= item.alertThreshold) return colors.warning;
    return colors.success;
  };

  const handleQuantityInput = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    const n = parseInt(digits, 10);
    setPendingQuantity(isNaN(n) ? 0 : Math.min(n, 999999));
  };

  const handleSaveQuantity = async () => {
    if (isUpdating || !hasQuantityChange) return;
    setIsUpdating(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await onSetQuantity(item.id, pendingQuantity, currentUser);
    setIsUpdating(false);
  };

  const handleDelete = () => {
    const doDelete = async () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      await onDelete(item.id);
      onClose();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`「${item.name}」を削除しますか？\nこの操作は取り消せません。`)) {
        doDelete();
      }
    } else {
      Alert.alert("削除確認", `「${item.name}」を削除しますか？\nこの操作は取り消せません。`, [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleEdit = () => {
    onClose();
    if (onEditOverride) {
      onEditOverride();
      return;
    }
    router.push({ pathname: "/edit-item" as any, params: { id: item.id } });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getActionLabel = (action: ChangeLogEntry["action"]) => {
    switch (action) {
      case "create": return "登録";
      case "update_quantity": return "変更";
      case "set_quantity": return "変更";
      case "edit": return "編集";
      default: return "変更";
    }
  };

  const getActionColor = (action: ChangeLogEntry["action"]) => {
    switch (action) {
      case "create": return colors.primary;
      case "update_quantity": return colors.warning;
      case "set_quantity": return colors.warning;
      case "edit": return colors.success;
      default: return colors.muted;
    }
  };

  const logs = item.changeLogs ?? [];
  const displayLogs = showAllLogs ? logs.slice().reverse() : logs.slice().reverse().slice(0, 5);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* ヘッダー */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.foreground }]}>物品詳細</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 画像 */}
            {item.imageUri ? (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.detailImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={[styles.detailImagePlaceholder, { backgroundColor: colors.surface }]}>
                <IconSymbol name="photo.fill" size={48} color={colors.muted} />
                <Text style={[styles.placeholderText, { color: colors.muted }]}>画像なし</Text>
              </View>
            )}

            {/* 物品名 */}
            <Text style={[styles.detailName, { color: colors.foreground }]}>{item.name}</Text>
            {groupLabel ? (
              <View style={[styles.groupBadge, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="person.fill" size={13} color={colors.primary} />
                <Text style={[styles.groupBadgeText, { color: colors.primary }]}>共有: {groupLabel}</Text>
              </View>
            ) : null}

            {/* 個数操作セクション */}
            <View style={[styles.quantitySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.quantitySectionLabel, { color: colors.muted }]}>在庫数</Text>
              <View style={styles.quantityControls}>
                {/* ホイールで選ぶ */}
                <WheelNumberPicker
                  value={Math.min(pendingQuantity, 999)}
                  onChange={setPendingQuantity}
                  min={0}
                  max={999}
                />
                {/* 直接入力（大きい数はこちら） */}
                <View style={styles.quantityInputArea}>
                  <Text style={[styles.quantityInputLabel, { color: colors.muted }]}>直接入力</Text>
                  <View style={styles.quantityInputRow}>
                    <TextInput
                      style={[
                        styles.quantityInput,
                        { color: getQuantityColor(pendingQuantity), borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                      value={String(pendingQuantity)}
                      onChangeText={handleQuantityInput}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      returnKeyType="done"
                      maxLength={6}
                    />
                    <Text style={[styles.quantityUnit, { color: colors.muted }]}>個</Text>
                  </View>
                  {hasQuantityChange && (
                    <Text style={[styles.pendingHint, { color: colors.primary }]}>
                      {item.quantity} → {pendingQuantity}（保存で確定）
                    </Text>
                  )}
                </View>
              </View>
              {item.quantity <= item.alertThreshold && (
                <View style={[styles.alertBanner, { backgroundColor: colors.warning + "15" }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
                  <Text style={[styles.alertBannerText, { color: colors.warning }]}>
                    閾値 {item.alertThreshold} 以下です
                  </Text>
                </View>
              )}
            </View>

            {/* 詳細情報 */}
            <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>カテゴリ</Text>
                <TagBadges tagIds={item.tags && item.tags.length > 0 ? item.tags : ["other"]} />
              </View>
              {item.company ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>企業名</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.company}</Text>
                </View>
              ) : null}
              {item.modelNumber ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>型番</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.modelNumber}</Text>
                </View>
              ) : null}
              {item.location ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>保管場所</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.location}</Text>
                </View>
              ) : null}
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>アラート閾値</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.alertThreshold} 個以下</Text>
              </View>
              {item.notes ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>備考</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.notes}</Text>
                </View>
              ) : null}
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>登録者</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.createdBy ?? "不明"}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>登録日</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>

            {/* 変更ログセクション */}
            <View style={[styles.logSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.logHeader}>
                <IconSymbol name="arrow.counterclockwise" size={16} color={colors.muted} />
                <Text style={[styles.logHeaderTitle, { color: colors.foreground }]}>変更ログ</Text>
                <Text style={[styles.logCount, { color: colors.muted }]}>{logs.length}件</Text>
              </View>
              {logs.length === 0 ? (
                <Text style={[styles.noLogsText, { color: colors.muted }]}>変更ログはありません</Text>
              ) : (
                <>
                  {displayLogs.map((log) => (
                    <View key={log.id} style={[styles.logEntry, { borderTopColor: colors.border }]}>
                      <View style={styles.logEntryHeader}>
                        <View style={[styles.logActionBadge, { backgroundColor: getActionColor(log.action) + "18" }]}>
                          <Text style={[styles.logActionText, { color: getActionColor(log.action) }]}>
                            {getActionLabel(log.action)}
                          </Text>
                        </View>
                        <Text style={[styles.logTimestamp, { color: colors.muted }]}>
                          {formatLogDate(log.timestamp)}
                        </Text>
                      </View>
                      <Text style={[styles.logDescription, { color: colors.foreground }]} numberOfLines={2}>
                        {log.description}
                      </Text>
                      <View style={styles.logUserRow}>
                        <IconSymbol name="person.fill" size={12} color={colors.muted} />
                        <Text style={[styles.logUserName, { color: colors.muted }]}>{log.userName}</Text>
                      </View>
                    </View>
                  ))}
                  {logs.length > 5 && (
                    <TouchableOpacity
                      onPress={() => setShowAllLogs(!showAllLogs)}
                      style={[styles.showMoreButton, { borderTopColor: colors.border }]}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.showMoreText, { color: colors.primary }]}>
                        {showAllLogs ? "折りたたむ" : `すべて表示（${logs.length}件）`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* アクションボタン */}
            <View style={styles.actionButtonsCol}>
              {/* 保存（在庫数の変更を確定） */}
              <TouchableOpacity
                onPress={handleSaveQuantity}
                disabled={!hasQuantityChange || isUpdating}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.success, opacity: !hasQuantityChange || isUpdating ? 0.4 : 1 },
                ]}
                activeOpacity={0.8}
              >
                <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>保存</Text>
              </TouchableOpacity>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleEdit}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="pencil" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>編集</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="trash" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  detailImage: { width: "100%", height: 220, borderRadius: 14 },
  detailImagePlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: { fontSize: 14 },
  detailName: { fontSize: 24, fontWeight: "700", marginTop: 16, marginBottom: 16 },
  groupBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: -8,
    marginBottom: 16,
  },
  groupBadgeText: { fontSize: 12, fontWeight: "700" },
  quantitySection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  quantitySectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 12, textTransform: "uppercase" },
  quantityControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityDisplay: { alignItems: "center" },
  quantityNumber: { fontSize: 40, fontWeight: "800" },
  quantityUnit: { fontSize: 14, marginTop: -4 },
  tapToEdit: { fontSize: 10, marginTop: 4 },
  quantityEditContainer: { alignItems: "center", gap: 8 },
  quantityInput: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
  },
  quantityEditButtons: { flexDirection: "row", gap: 8 },
  quantityEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  alertBannerText: { fontSize: 13, fontWeight: "600" },
  infoSection: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  infoLabel: { fontSize: 14, fontWeight: "500", width: 100 },
  infoValue: { fontSize: 14, flex: 1, textAlign: "right" },
  // 変更ログセクション
  logSection: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logHeaderTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  logCount: { fontSize: 12 },
  noLogsText: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 14 },
  logEntry: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  logEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  logActionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logActionText: { fontSize: 11, fontWeight: "700" },
  logTimestamp: { fontSize: 11 },
  logDescription: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  logUserRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  logUserName: { fontSize: 11 },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 0.5,
  },
  showMoreText: { fontSize: 13, fontWeight: "600" },
  actionButtonsCol: { gap: 12 },
  actionButtons: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  // 在庫数の直接入力エリア
  quantityInputArea: { alignItems: "center", gap: 6 },
  quantityInputLabel: { fontSize: 11, fontWeight: "600" },
  quantityInputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingHint: { fontSize: 12, fontWeight: "700", marginTop: 4, textAlign: "center" },
});
