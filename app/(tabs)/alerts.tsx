import { useCallback, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useInventory } from "@/lib/inventory-context";
import type { InventoryItem } from "@/lib/types";
import ItemDetailModal from "@/components/item-detail-modal";
import { TagBadges } from "@/components/tag-selector";

export default function AlertsScreen() {
  const colors = useColors();
  const { alertItems, isLoading, loadItems, changeQuantity, setDirectQuantity, removeItem } = useInventory();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const renderAlertItem = useCallback(
    ({ item }: { item: InventoryItem }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setSelectedItem(item);
        }}
        style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.warning + "40" }]}
      >
        <View style={styles.alertCardContent}>
          <View style={[styles.alertIndicator, { backgroundColor: item.quantity <= 0 ? colors.error : colors.warning }]} />
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.thumbnail} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={item.quantity <= 0 ? colors.error : colors.warning} />
            </View>
          )}
          <View style={styles.alertInfo}>
            <Text style={[styles.alertName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.alertDetail, { color: colors.muted }]} numberOfLines={1}>
              {item.company ? `${item.company} ` : ""}
              {item.modelNumber ? `(${item.modelNumber})` : ""}
            </Text>
            <View style={styles.alertStatusRow}>
              <TagBadges tagIds={item.tags && item.tags.length > 0 ? item.tags : ["other"]} />
              <Text style={[styles.alertStatus, { color: item.quantity <= 0 ? colors.error : colors.warning }]}>
                {item.quantity <= 0 ? "在庫切れ" : "在庫少量"}
              </Text>
            </View>
          </View>
          <View style={[styles.alertQuantityBadge, { backgroundColor: (item.quantity <= 0 ? colors.error : colors.warning) + "18" }]}>
            <Text style={[styles.alertQuantityText, { color: item.quantity <= 0 ? colors.error : colors.warning }]}>
              {item.quantity}
            </Text>
            <Text style={[styles.alertQuantityUnit, { color: item.quantity <= 0 ? colors.error : colors.warning }]}>
              個
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="checkmark" size={64} color={colors.success} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        在庫不足の物品はありません
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        全ての物品が閾値を上回っています
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>アラート</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {alertItems.length > 0
              ? `${alertItems.length}件の物品が在庫不足です`
              : "在庫状況は良好です"}
          </Text>
        </View>

        {alertItems.length > 0 && (
          <View style={[styles.summaryBanner, { backgroundColor: colors.warning + "15" }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
            <Text style={[styles.summaryText, { color: colors.warning }]}>
              {alertItems.filter((i) => i.quantity <= 0).length > 0
                ? `${alertItems.filter((i) => i.quantity <= 0).length}件が在庫切れ、${alertItems.filter((i) => i.quantity > 0).length}件が在庫少量`
                : `${alertItems.length}件が在庫少量です`}
            </Text>
          </View>
        )}

        <FlatList
          data={alertItems}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      </View>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          visible={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onQuantityChange={changeQuantity}
          onSetQuantity={setDirectQuantity}
          onDelete={removeItem}
          onRefresh={loadItems}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  summaryText: { fontSize: 14, fontWeight: "600", flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  alertCardContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  alertIndicator: { width: 4, height: 40, borderRadius: 2 },
  thumbnail: { width: 48, height: 48, borderRadius: 10 },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  alertInfo: { flex: 1, gap: 2 },
  alertName: { fontSize: 15, fontWeight: "600" },
  alertDetail: { fontSize: 12 },
  alertStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  alertStatus: { fontSize: 12, fontWeight: "700" },
  alertThresholdText: { fontSize: 11 },
  alertQuantityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 44,
  },
  alertQuantityText: { fontSize: 18, fontWeight: "700" },
  alertQuantityUnit: { fontSize: 10, fontWeight: "500" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 120, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
