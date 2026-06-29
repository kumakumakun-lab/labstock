import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useInventory } from "@/lib/inventory-context";
import { useUser } from "@/lib/user-context";
import type { InventoryItem, SortOption, SortDirection, ChangeLogEntry } from "@/lib/types";
import ItemDetailModal from "@/components/item-detail-modal";
import BannerAdComponent from "@/components/banner-ad";
import UserSetupModal from "@/components/user-setup-modal";
import { TagFilterBar, TagBadges } from "@/components/tag-selector";
import { exportToExcel } from "@/lib/export-excel";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import * as GroupStorage from "@/lib/group-storage";

/** 一覧表示用アイテム（個人在庫＋グループ在庫を統合）。_groupId があればグループ物品。 */
type DisplayItem = InventoryItem & { _groupId?: string; _groupName?: string };

/** グループ活動ログの action を 変更ログの action にマップする */
function mapGroupAction(a: string): ChangeLogEntry["action"] {
  switch (a) {
    case "add_item":
    case "create":
      return "create";
    case "update_quantity":
      return "update_quantity";
    default:
      return "edit";
  }
}

export default function InventoryListScreen() {
  const colors = useColors();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { userName, needsSetup, setUserName, isLoaded } = useUser();
  const {
    items,
    filteredItems,
    isLoading,
    searchQuery,
    sortOption,
    sortDirection,
    selectedTag,
    setSearchQuery,
    setSort,
    setTagFilter,
    loadItems,
    changeQuantity,
    setDirectQuantity,
    removeItem,
  } = useInventory();

  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [groupItems, setGroupItems] = useState<DisplayItem[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 参加しているグループの物品を読み込み、在庫一覧に統合する
  const loadGroupItems = useCallback(async () => {
    try {
      const groups = await GroupStorage.getMyGroups();
      const lists = await Promise.all(
        groups.map(async (g) => {
          const gis = await GroupStorage.getGroupItems(g.id);
          return gis.map(
            (gi): DisplayItem => ({
              id: gi.id,
              name: gi.name,
              company: gi.company,
              modelNumber: gi.modelNumber,
              quantity: gi.quantity,
              location: gi.location,
              notes: gi.notes,
              imageUri: null,
              alertThreshold: gi.alertThreshold,
              tags: gi.tags && gi.tags.length > 0 ? gi.tags : ["other"],
              createdBy: gi.createdBy,
              createdAt: gi.createdAt,
              updatedAt: gi.updatedAt,
              changeLogs: [],
              barcode: gi.barcode,
              _groupId: g.id,
              _groupName: g.name,
            }),
          );
        }),
      );
      setGroupItems(lists.flat());
    } catch {
      setGroupItems([]);
    }
  }, []);

  useEffect(() => {
    if (isFocused) loadGroupItems();
  }, [isFocused, loadGroupItems]);

  // グループ物品の変更ログ（その物品に関する活動ログ）を取得し、変更ログ形式に変換する
  const loadGroupItemLogs = useCallback(
    async (groupId: string, itemName: string): Promise<ChangeLogEntry[]> => {
      try {
        const logs = await GroupStorage.getGroupLogs(groupId);
        // getGroupLogs は新しい順。詳細モーダルは「古い→新しい順の配列」を内部でreverseして
        // 表示するため、ここで古い→新しい順に揃える（結果として最新が一番上に表示される）。
        return logs
          .filter((l) => l.description.includes(`「${itemName}」`))
          .map((l): ChangeLogEntry => ({
            id: l.id,
            timestamp: l.timestamp,
            userName: l.userName,
            action: mapGroupAction(l.action),
            description: l.description,
          }))
          .reverse();
      } catch {
        return [];
      }
    },
    [],
  );

  // 個人在庫＋グループ在庫をマージし、検索・タグ・並び替えを適用
  const displayItems = useMemo<DisplayItem[]>(() => {
    let result: DisplayItem[] = [...items, ...groupItems];
    if (selectedTag) {
      result = result.filter((it) => {
        const t = it.tags && it.tags.length > 0 ? it.tags : ["other"];
        return t.includes(selectedTag);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.company.toLowerCase().includes(q) ||
          it.modelNumber.toLowerCase().includes(q) ||
          it.location.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let c = 0;
      switch (sortOption) {
        case "name":
          c = a.name.localeCompare(b.name, "ja");
          break;
        case "quantity":
          c = a.quantity - b.quantity;
          break;
        case "createdAt":
          c = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? c : -c;
    });
    return result;
  }, [items, groupItems, selectedTag, searchQuery, sortOption, sortDirection]);

  // タグ別のアイテム数を計算（個人＋グループ）
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of [...items, ...groupItems]) {
      const itemTags = item.tags && item.tags.length > 0 ? item.tags : ["other"];
      for (const t of itemTags) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return counts;
  }, [items, groupItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadItems(), loadGroupItems()]);
    setRefreshing(false);
  }, [loadItems, loadGroupItems]);

  // 詳細モーダルからの操作: グループ物品は Supabase、個人は ローカル に振り分け
  const handleSetQuantity = useCallback(
    async (id: string, newQuantity: number, user: string) => {
      if (selectedItem?._groupId) {
        const updated = await GroupStorage.updateGroupItem(selectedItem._groupId, id, { quantity: newQuantity }, user);
        await loadGroupItems();
        if (!updated) return null;
        const freshLogs = await loadGroupItemLogs(selectedItem._groupId, selectedItem.name);
        const next: DisplayItem = { ...selectedItem, quantity: updated.quantity, updatedAt: updated.updatedAt, changeLogs: freshLogs };
        setSelectedItem(next);
        return next;
      }
      const updated = await setDirectQuantity(id, newQuantity, user);
      if (updated) setSelectedItem(updated);
      return updated;
    },
    [selectedItem, setDirectQuantity, loadGroupItems, loadGroupItemLogs],
  );

  const handleChangeQuantity = useCallback(
    async (id: string, delta: number, user: string) => {
      if (selectedItem?._groupId) {
        const newQ = Math.max(0, selectedItem.quantity + delta);
        const updated = await GroupStorage.updateGroupItem(selectedItem._groupId, id, { quantity: newQ }, user);
        await loadGroupItems();
        if (!updated) return null;
        const freshLogs = await loadGroupItemLogs(selectedItem._groupId, selectedItem.name);
        const next: DisplayItem = { ...selectedItem, quantity: updated.quantity, updatedAt: updated.updatedAt, changeLogs: freshLogs };
        setSelectedItem(next);
        return next;
      }
      const updated = await changeQuantity(id, delta, user);
      if (updated) setSelectedItem(updated);
      return updated;
    },
    [selectedItem, changeQuantity, loadGroupItems, loadGroupItemLogs],
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (selectedItem?._groupId) {
        const ok = await GroupStorage.deleteGroupItem(selectedItem._groupId, id, userName ?? "メンバー");
        await loadGroupItems();
        return ok;
      }
      return removeItem(id);
    },
    [selectedItem, removeItem, loadGroupItems, userName],
  );

  // 物品詳細を開く。グループ物品は変更ログをサーバから取得して添付する
  const openItemDetail = useCallback(
    async (item: DisplayItem) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (item._groupId) {
        const logs = await loadGroupItemLogs(item._groupId, item.name);
        setSelectedItem({ ...item, changeLogs: logs });
      } else {
        setSelectedItem(item);
      }
    },
    [loadGroupItemLogs],
  );

  const getQuantityColor = (item: InventoryItem) => {
    if (item.quantity <= 0) return colors.error;
    if (item.quantity <= item.alertThreshold) return colors.warning;
    return colors.success;
  };

  const handleSortSelect = (option: SortOption) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newDirection: SortDirection =
      sortOption === option && sortDirection === "asc" ? "desc" : "asc";
    setSort(option, newDirection);
    setShowSortModal(false);
  };

  const sortLabels: Record<SortOption, string> = {
    name: "名前順",
    quantity: "個数順",
    createdAt: "登録日順",
  };

  const handleUserSetup = async (name: string) => {
    await setUserName(name);
  };

  const handleExport = async () => {
    if (displayItems.length === 0) {
      Alert.alert("エクスポート", "エクスポートする在庫データがありません。");
      return;
    }
    setIsExporting(true);
    try {
      await exportToExcel(displayItems);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("エラー", "エクスポートに失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openItemDetail(item)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardContent}>
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol name="photo.fill" size={24} color={colors.muted} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.company ? (
              <Text style={[styles.itemSub, { color: colors.muted }]} numberOfLines={1}>
                {item.company}
              </Text>
            ) : null}
            {item.modelNumber ? (
              <Text style={[styles.itemSub, { color: colors.muted }]} numberOfLines={1}>
                型番: {item.modelNumber}
              </Text>
            ) : null}
            <View style={styles.itemMetaRow}>
              <TagBadges tagIds={item.tags && item.tags.length > 0 ? item.tags : ["other"]} />
              {item._groupName ? (
                <View style={[styles.groupChip, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="person.fill" size={10} color={colors.primary} />
                  <Text style={[styles.groupChipText, { color: colors.primary }]} numberOfLines={1}>
                    {item._groupName}
                  </Text>
                </View>
              ) : null}
              {item.location ? (
                <Text style={[styles.itemLocation, { color: colors.muted }]} numberOfLines={1}>
                  {item.location}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.quantityBadge, { backgroundColor: getQuantityColor(item) + "18" }]}>
            <Text style={[styles.quantityText, { color: getQuantityColor(item) }]}>
              {item.quantity}
            </Text>
            <Text style={[styles.quantityLabel, { color: getQuantityColor(item) }]}>個</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors, openItemDetail]
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="list.bullet" size={64} color={colors.muted} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {searchQuery || selectedTag ? "該当する物品がありません" : "在庫データがありません"}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          {searchQuery || selectedTag ? "検索条件を変更してください" : "「追加」タブから物品を登録してください"}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>LabStock</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                {displayItems.length > 0
                  ? `${displayItems.length}件の物品`
                  : "在庫管理"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {/* Excel出力ボタン */}
              <TouchableOpacity
                onPress={handleExport}
                disabled={isExporting}
                activeOpacity={0.7}
                style={[styles.exportButton, { backgroundColor: colors.success + "15" }]}
              >
                <IconSymbol name="arrow.up.arrow.down" size={16} color={colors.success} />
                <Text style={[styles.exportButtonText, { color: colors.success }]}>
                  {isExporting ? "..." : "Excel"}
                </Text>
              </TouchableOpacity>
              {userName ? (
                <View style={[styles.userBadge, { backgroundColor: colors.primary + "12" }]}>
                  <IconSymbol name="person.fill" size={14} color={colors.primary} />
                  <Text style={[styles.userBadgeText, { color: colors.primary }]} numberOfLines={1}>
                    {userName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* 検索バー */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="物品名・企業名・型番で検索..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.6}>
              <IconSymbol name="xmark" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* タグフィルターバー */}
        <View style={styles.tagFilterRow}>
          <TagFilterBar
            selectedTag={selectedTag}
            onSelect={setTagFilter}
            itemCounts={tagCounts}
          />
        </View>

        {/* ソートボタン */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSortModal(true)}
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <IconSymbol name="arrow.up.arrow.down" size={16} color={colors.primary} />
            <Text style={[styles.sortButtonText, { color: colors.primary }]}>
              {sortLabels[sortOption]} {sortDirection === "asc" ? "↑" : "↓"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 一覧 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          />
        )}
      </View>

      {/* ソートモーダル */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.sortModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sortModalTitle, { color: colors.foreground }]}>並び替え</Text>
            {(["name", "quantity", "createdAt"] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortModalOption,
                  sortOption === option && { backgroundColor: colors.primary + "15" },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSortSelect(option)}
              >
                <Text
                  style={[
                    styles.sortModalOptionText,
                    { color: sortOption === option ? colors.primary : colors.foreground },
                  ]}
                >
                  {sortLabels[option]}
                </Text>
                {sortOption === option && (
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>
                    {sortDirection === "asc" ? "昇順 ↑" : "降順 ↓"}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* バナー広告 */}
      <BannerAdComponent position="bottom" />

      {/* 詳細モーダル */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          visible={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onQuantityChange={handleChangeQuantity}
          onSetQuantity={handleSetQuantity}
          onDelete={handleDeleteItem}
          onRefresh={loadItems}
          groupLabel={selectedItem._groupName}
          onEditOverride={
            selectedItem._groupId
              ? () => router.push(`/group/${selectedItem._groupId}` as any)
              : undefined
          }
        />
      )}

      {/* ユーザーネーム初回設定モーダル */}
      {isLoaded && (
        <UserSetupModal
          visible={needsSetup}
          onComplete={handleUserSetup}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  exportButtonText: { fontSize: 12, fontWeight: "700" },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 120,
  },
  userBadgeText: { fontSize: 12, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  tagFilterRow: { marginTop: 12 },
  sortRow: { flexDirection: "row", paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 10 },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemSub: { fontSize: 13 },
  itemMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" },
  itemLocation: { fontSize: 11 },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 120,
  },
  groupChipText: { fontSize: 10, fontWeight: "700" },
  quantityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 52,
  },
  quantityText: { fontSize: 20, fontWeight: "700" },
  quantityLabel: { fontSize: 11, fontWeight: "500" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortModalContent: { width: 280, borderRadius: 16, padding: 20 },
  sortModalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  sortModalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sortModalOptionText: { fontSize: 16, fontWeight: "500" },
});
