import { useCallback, useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import * as GroupStorage from "@/lib/group-storage";
import type { LocalGroup, LocalGroupItem, LocalGroupLog } from "@/lib/group-storage";

type TabType = "items" | "logs" | "alerts";

export default function GroupDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userName } = useUser();
  const groupId = id as string;

  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [group, setGroup] = useState<LocalGroup | null>(null);
  const [items, setItems] = useState<LocalGroupItem[]>([]);
  const [logs, setLogs] = useState<LocalGroupLog[]>([]);
  const [alerts, setAlerts] = useState<LocalGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // アイテム追加フォーム
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("0");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [newItemThreshold, setNewItemThreshold] = useState("0");
  const [isAdding, setIsAdding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const g = await GroupStorage.getGroupById(groupId);
      setGroup(g);
      const i = await GroupStorage.getGroupItems(groupId);
      setItems(i);
      const l = await GroupStorage.getGroupLogs(groupId);
      setLogs(l); // getGroupLogs は新しい順（created_at 降順）で返るのでそのまま表示
      const a = await GroupStorage.getGroupAlerts(groupId);
      setAlerts(a);
    } catch {
      // エラー時はそのまま
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
  }, [loadData]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim()) return;
    setIsAdding(true);
    try {
      await GroupStorage.addGroupItem(
        groupId,
        {
          name: newItemName.trim(),
          company: "",
          modelNumber: "",
          quantity: parseInt(newItemQuantity) || 0,
          location: newItemLocation.trim(),
          notes: "",
          alertThreshold: parseInt(newItemThreshold) || 0,
          tags: [],
          createdBy: userName || "メンバー",
        },
        userName || "メンバー"
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddItem(false);
      setNewItemName("");
      setNewItemQuantity("0");
      setNewItemLocation("");
      setNewItemThreshold("0");
      await loadData();
    } catch (err: any) {
      Alert.alert("エラー", err.message || "アイテムの追加に失敗しました");
    } finally {
      setIsAdding(false);
    }
  }, [newItemName, newItemQuantity, newItemLocation, newItemThreshold, groupId, userName, loadData]);

  const handleQuantityChange = useCallback(
    async (itemId: string, currentQuantity: number, delta: number) => {
      const newQuantity = Math.max(0, currentQuantity + delta);
      try {
        await GroupStorage.updateGroupItem(
          groupId,
          itemId,
          { quantity: newQuantity },
          userName || "メンバー"
        );
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
      } catch (err: any) {
        Alert.alert("エラー", err.message || "数量の更新に失敗しました");
      }
    },
    [groupId, userName, loadData]
  );

  const handleDeleteItem = useCallback(
    (itemId: string, itemName: string) => {
      Alert.alert("削除確認", `「${itemName}」を削除しますか？`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              await GroupStorage.deleteGroupItem(groupId, itemId, userName || "メンバー");
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadData();
            } catch (err: any) {
              Alert.alert("エラー", err.message || "削除に失敗しました");
            }
          },
        },
      ]);
    },
    [groupId, userName, loadData]
  );

  const handleLeaveGroup = useCallback(() => {
    Alert.alert("グループを退出", "このグループから退出しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          try {
            await GroupStorage.leaveGroup(groupId, userName || "メンバー");
            router.back();
          } catch (err: any) {
            Alert.alert("エラー", err.message || "退出に失敗しました");
          }
        },
      },
    ]);
  }, [groupId, userName, router]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert("グループを削除", "このグループを完全に削除しますか？この操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await GroupStorage.deleteGroup(groupId);
            router.back();
          } catch (err: any) {
            Alert.alert("エラー", err.message || "削除に失敗しました");
          }
        },
      },
    ]);
  }, [groupId, router]);

  const handleShareInvite = useCallback(async () => {
    if (!group) return;
    try {
      await Share.share({
        message: `「${group.name}」グループに参加しませんか？\n招待コード: ${group.inviteCode}\n\nLabStockアプリで招待コードを入力して参加できます。`,
      });
    } catch {}
  }, [group]);

  const handleCopyInviteCode = useCallback(async () => {
    if (!group) return;
    try {
      await Clipboard.setStringAsync(group.inviteCode);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("コピー完了", `招待コード「${group.inviteCode}」をコピーしました`);
    } catch {}
  }, [group]);

  if (isLoading) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!group) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={s.centerContainer}>
          <Text style={[s.emptyText, { color: colors.foreground }]}>グループが見つかりません</Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={{ color: colors.primary, fontWeight: "500" }}>戻る</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: "items", label: "在庫", icon: "list.bullet" as const },
    { key: "logs", label: "ログ", icon: "clock.fill" as const },
    { key: "alerts", label: "アラート", icon: "bell.fill" as const },
  ];

  const alertCount = alerts.length;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* ヘッダー */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backButton}>
            <IconSymbol name="chevron.right" size={20} color={colors.primary} style={{ transform: [{ rotate: "180deg" }] }} />
            <Text style={{ color: colors.primary, marginLeft: 4 }}>戻る</Text>
          </TouchableOpacity>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={handleCopyInviteCode} activeOpacity={0.7} style={s.headerIcon}>
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareInvite} activeOpacity={0.7} style={s.headerIcon}>
              <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
            </TouchableOpacity>
            {group.isOwner ? (
              <TouchableOpacity onPress={handleDeleteGroup} activeOpacity={0.7} style={s.headerIcon}>
                <IconSymbol name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLeaveGroup} activeOpacity={0.7} style={s.headerIcon}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[s.groupTitle, { color: colors.foreground }]}>{group.name}</Text>
        {group.description ? (
          <Text style={[s.groupDesc, { color: colors.muted }]}>{group.description}</Text>
        ) : null}
        <View style={s.metaRow}>
          <Text style={[s.metaText, { color: colors.muted }]}>
            招待コード: {group.inviteCode}
          </Text>
          <View style={[s.badge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[s.badgeText, { color: colors.primary }]}>
              {group.isOwner ? "オーナー" : "メンバー"}
            </Text>
          </View>
        </View>
      </View>

      {/* タブバー */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <View style={s.tabContent}>
              <IconSymbol
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  s.tabLabel,
                  { color: activeTab === tab.key ? colors.primary : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
              {tab.key === "alerts" && alertCount > 0 && (
                <View style={[s.alertBadge, { backgroundColor: colors.error }]}>
                  <Text style={s.alertBadgeText}>{alertCount}</Text>
                </View>
              )}
            </View>
            {activeTab === tab.key && (
              <View style={[s.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* タブコンテンツ */}
      <View style={s.tabContentContainer}>
        {activeTab === "items" && (
          <ItemsTab
            items={items}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onQuantityChange={handleQuantityChange}
            onDeleteItem={handleDeleteItem}
            onAddItem={() => setShowAddItem(true)}
            colors={colors}
          />
        )}
        {activeTab === "logs" && (
          <LogsTab
            logs={logs}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={colors}
          />
        )}
        {activeTab === "alerts" && (
          <AlertsTab alerts={alerts} colors={colors} />
        )}
      </View>

      {/* アイテム追加モーダル */}
      {showAddItem && (
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>アイテムを追加</Text>

            <Text style={[s.inputLabel, { color: colors.foreground }]}>名前</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="アイテム名"
              placeholderTextColor={colors.muted}
              value={newItemName}
              onChangeText={setNewItemName}
              maxLength={300}
              returnKeyType="next"
            />

            <View style={s.inputRow}>
              <View style={s.inputHalf}>
                <Text style={[s.inputLabel, { color: colors.foreground }]}>数量</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={s.inputHalf}>
                <Text style={[s.inputLabel, { color: colors.foreground }]}>アラート閾値</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  value={newItemThreshold}
                  onChangeText={setNewItemThreshold}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            <Text style={[s.inputLabel, { color: colors.foreground }]}>保管場所（任意）</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="例: 冷蔵庫A"
              placeholderTextColor={colors.muted}
              value={newItemLocation}
              onChangeText={setNewItemLocation}
              maxLength={300}
              returnKeyType="done"
            />

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowAddItem(false)}
                activeOpacity={0.7}
              >
                <Text style={[s.modalButtonText, { color: colors.foreground }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.primary, opacity: (!newItemName.trim() || isAdding) ? 0.5 : 1 }]}
                onPress={handleAddItem}
                disabled={isAdding || !newItemName.trim()}
                activeOpacity={0.8}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={[s.modalButtonText, { color: colors.background }]}>追加</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

// ─── サブコンポーネント ───

function ItemsTab({ items, isRefreshing, onRefresh, onQuantityChange, onDeleteItem, onAddItem, colors }: any) {
  return (
    <View style={s.tabContentContainer}>
      <FlatList
        data={items}
        keyExtractor={(item: LocalGroupItem) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={s.emptyList}>
            <Text style={{ color: colors.muted }}>アイテムがありません</Text>
          </View>
        }
        renderItem={({ item }: { item: LocalGroupItem }) => {
          const isAlert = item.alertThreshold > 0 && item.quantity <= item.alertThreshold;
          return (
            <View
              style={[
                s.itemCard,
                { backgroundColor: colors.surface, borderColor: isAlert ? colors.error : colors.border },
                isAlert && { borderWidth: 1.5 },
              ]}
            >
              <View style={s.itemHeader}>
                <View style={s.itemInfo}>
                  <Text style={[s.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.location ? (
                    <Text style={[s.itemLocation, { color: colors.muted }]}>{item.location}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => onDeleteItem(item.id, item.name)} activeOpacity={0.6}>
                  <IconSymbol name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={s.quantityRow}>
                <View style={s.quantityControls}>
                  <TouchableOpacity
                    onPress={() => onQuantityChange(item.id, item.quantity, -1)}
                    activeOpacity={0.7}
                    style={[s.quantityButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <IconSymbol name="minus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[s.quantityText, { color: colors.foreground }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => onQuantityChange(item.id, item.quantity, 1)}
                    activeOpacity={0.7}
                    style={[s.quantityButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <IconSymbol name="plus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                {isAlert && (
                  <View style={s.alertRow}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.error} />
                    <Text style={[s.alertText, { color: colors.error }]}>閾値: {item.alertThreshold}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={onAddItem}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={28} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

function LogsTab({ logs, isRefreshing, onRefresh, colors }: any) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "add_item": return "plus.circle.fill" as const;
      case "edit_item": return "pencil" as const;
      case "delete_item": return "trash" as const;
      case "update_quantity": return "arrow.up.arrow.down" as const;
      case "create": return "person.2.fill" as const;
      case "join": return "person.fill" as const;
      case "leave": return "rectangle.portrait.and.arrow.right" as const;
      default: return "info.circle.fill" as const;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "add_item": return colors.success;
      case "delete_item": return colors.error;
      case "update_quantity": return colors.primary;
      default: return colors.muted;
    }
  };

  return (
    <FlatList
      data={logs}
      keyExtractor={(item: LocalGroupLog) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={s.emptyList}>
          <Text style={{ color: colors.muted }}>活動ログがありません</Text>
        </View>
      }
      renderItem={({ item }: { item: LocalGroupLog }) => (
        <View style={[s.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.logIcon, { backgroundColor: getActionColor(item.action) + "20" }]}>
            <IconSymbol name={getActionIcon(item.action)} size={16} color={getActionColor(item.action)} />
          </View>
          <View style={s.logContent}>
            <Text style={[s.logUser, { color: colors.foreground }]}>{item.userName}</Text>
            <Text style={[s.logDesc, { color: colors.muted }]}>{item.description}</Text>
            <Text style={[s.logTime, { color: colors.muted }]}>
              {new Date(item.timestamp).toLocaleString("ja-JP")}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

function AlertsTab({ alerts, colors }: any) {
  if (alerts.length === 0) {
    return (
      <View style={s.centerContainer}>
        <IconSymbol name="checkmark" size={48} color={colors.success} />
        <Text style={[s.emptyTitle, { color: colors.foreground }]}>アラートなし</Text>
        <Text style={[s.emptySubtitle, { color: colors.muted }]}>すべてのアイテムが閾値以上です</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={alerts}
      keyExtractor={(item: LocalGroupItem) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }: { item: LocalGroupItem }) => (
        <View style={[s.alertCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
          <View style={s.alertCardHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.error} />
            <Text style={[s.alertCardName, { color: colors.foreground }]}>{item.name}</Text>
          </View>
          <View style={s.alertCardMeta}>
            <Text style={[s.alertCardValue, { color: colors.error }]}>
              現在: {item.quantity} / 閾値: {item.alertThreshold}
            </Text>
            {item.location ? (
              <Text style={[s.alertCardLocation, { color: colors.muted }]}>{item.location}</Text>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 18, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backButton: { flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 12 },
  headerIcon: { padding: 4 },
  groupTitle: { fontSize: 22, fontWeight: "700" },
  groupDesc: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  metaText: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 14, fontWeight: "500" },
  tabIndicator: { position: "absolute", bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1 },
  alertBadge: { borderRadius: 8, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  alertBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  tabContentContainer: { flex: 1 },
  emptyList: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  itemCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemLocation: { fontSize: 12, marginTop: 2 },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  quantityButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quantityText: { fontSize: 18, fontWeight: "700", minWidth: 40, textAlign: "center" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertText: { fontSize: 12, fontWeight: "500" },
  fab: { position: "absolute", bottom: 16, right: 16, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  logCard: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  logIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 2 },
  logContent: { flex: 1 },
  logUser: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  logDesc: { fontSize: 12, marginBottom: 4 },
  logTime: { fontSize: 11 },
  alertCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  alertCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  alertCardName: { fontSize: 16, fontWeight: "600" },
  alertCardMeta: { flexDirection: "row", alignItems: "center", gap: 16 },
  alertCardValue: { fontSize: 14, fontWeight: "500" },
  alertCardLocation: { fontSize: 12 },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 100 },
  modalContent: { width: "90%", maxWidth: 360, borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  inputRow: { flexDirection: "row", gap: 12 },
  inputHalf: { flex: 1 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontSize: 16, fontWeight: "600" },
});
