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
  Platform,
  Share,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import * as GroupStorage from "@/lib/group-storage";
import type { LocalGroup } from "@/lib/group-storage";

export default function GroupsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { userName } = useUser();

  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const myGroups = await GroupStorage.getMyGroups();
      setGroups(myGroups);
    } catch {
      // エラー時は空配列のまま
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGroups();
  }, [loadGroups]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) return;
    setIsCreating(true);
    try {
      await GroupStorage.createGroup(
        groupName.trim(),
        groupDescription.trim(),
        userName ?? "メンバー"
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setGroupName("");
      setGroupDescription("");
      await loadGroups();
    } catch (err: any) {
      Alert.alert("エラー", err.message || "グループの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  }, [groupName, groupDescription, userName, loadGroups]);

  const handleJoin = useCallback(async () => {
    if (!inviteCodeInput.trim()) return;
    setIsJoining(true);
    try {
      const result = await GroupStorage.joinGroupByInviteCode(
        inviteCodeInput.trim(),
        userName ?? "メンバー"
      );
      if (!result.success) {
        Alert.alert("エラー", result.error || "グループへの参加に失敗しました");
        return;
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoinModal(false);
      setInviteCodeInput("");
      await loadGroups();
    } catch (err: any) {
      Alert.alert("エラー", err.message || "グループへの参加に失敗しました");
    } finally {
      setIsJoining(false);
    }
  }, [inviteCodeInput, userName, loadGroups]);

  const handleShareInvite = useCallback(async (inviteCode: string, groupName: string) => {
    try {
      await Share.share({
        message: `「${groupName}」グループに参加しませんか？\n招待コード: ${inviteCode}\n\nLabStockアプリで招待コードを入力して参加できます。`,
      });
    } catch {}
  }, []);

  const handleCopyInviteCode = useCallback(async (inviteCode: string) => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("コピー完了", `招待コード「${inviteCode}」をコピーしました`);
    } catch {}
  }, []);

  // ローディング中
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>読み込み中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>グループ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowJoinModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="link" size={16} color={colors.primary} />
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>参加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={16} color={colors.background} />
            <Text style={[styles.headerButtonText, { color: colors.background }]}>作成</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* グループ一覧 */}
      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>グループがありません</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            グループを作成するか、招待コードを入力して参加しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/group/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.groupCardContent}>
                <View style={styles.groupInfo}>
                  <View style={styles.groupNameRow}>
                    <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.isOwner && (
                      <View style={[styles.ownerBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.ownerBadgeText, { color: colors.primary }]}>オーナー</Text>
                      </View>
                    )}
                  </View>
                  {item.description ? (
                    <Text style={[styles.groupDescription, { color: colors.muted }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.groupMeta}>
                    <Text style={[styles.groupMetaText, { color: colors.muted }]}>
                      メンバー {item.memberCount}人
                    </Text>
                    <Text style={[styles.inviteCodeLabel, { color: colors.muted }]}>
                      コード: {item.inviteCode}
                    </Text>
                  </View>
                </View>
                <View style={styles.groupActions}>
                  <TouchableOpacity
                    onPress={() => handleCopyInviteCode(item.inviteCode)}
                    activeOpacity={0.6}
                    style={styles.actionIcon}
                  >
                    <IconSymbol name="doc.text.fill" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareInvite(item.inviteCode, item.name)}
                    activeOpacity={0.6}
                    style={styles.actionIcon}
                  >
                    <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* グループ作成モーダル */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>グループを作成</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>グループ名</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="例: 田中研究室"
              placeholderTextColor={colors.muted}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={200}
              returnKeyType="next"
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>説明（任意）</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="例: 研究室の試薬・消耗品管理"
              placeholderTextColor={colors.muted}
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={500}
              returnKeyType="done"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowCreateModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: colors.foreground }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary, opacity: (!groupName.trim() || isCreating) ? 0.5 : 1 }]}
                onPress={handleCreate}
                disabled={isCreating || !groupName.trim()}
                activeOpacity={0.8}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>作成</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* グループ参加モーダル */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>グループに参加</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>招待コード</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="招待コードを入力"
              placeholderTextColor={colors.muted}
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />

            <Text style={[styles.hintText, { color: colors.muted }]}>
              グループのメンバーから共有された招待コードを入力してください
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowJoinModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: colors.foreground }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary, opacity: (!inviteCodeInput.trim() || isJoining) ? 0.5 : 1 }]}
                onPress={handleJoin}
                disabled={isJoining || !inviteCodeInput.trim()}
                activeOpacity={0.8}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>参加</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerButtonText: { fontSize: 14, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  groupCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  groupInfo: { flex: 1, marginRight: 12 },
  groupNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  groupName: { fontSize: 17, fontWeight: "600", flexShrink: 1 },
  ownerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ownerBadgeText: { fontSize: 11, fontWeight: "600" },
  groupDescription: { fontSize: 13, marginBottom: 6, lineHeight: 18 },
  groupMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupMetaText: { fontSize: 12 },
  inviteCodeLabel: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  groupActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  hintText: { fontSize: 12, marginBottom: 16, lineHeight: 17 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: { fontSize: 16, fontWeight: "600" },
});
