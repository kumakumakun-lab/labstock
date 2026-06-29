import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import { useInventory } from "@/lib/inventory-context";
import { useTags } from "@/lib/tag-context";
import { useThemeContext } from "@/lib/theme-provider";
import UserSetupModal from "@/components/user-setup-modal";
import CategoryManager from "@/components/category-manager";
import { exportToExcel } from "@/lib/export-excel";
import { deleteSecureItem } from "@/lib/secure-storage";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { userName, setUserName } = useUser();
  const { items, loadItems } = useInventory();
  const { tags } = useTags();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [showEditName, setShowEditName] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isDarkMode = colorScheme === "dark";

  const handleEditName = async (name: string) => {
    await setUserName(name);
    setShowEditName(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleToggleDarkMode = (value: boolean) => {
    setColorScheme(value ? "dark" : "light");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleExport = async () => {
    if (items.length === 0) {
      Alert.alert("エクスポート", "エクスポートする在庫データがありません。");
      return;
    }
    setIsExporting(true);
    try {
      await exportToExcel(items);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("エラー", "エクスポートに失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      "全データ削除",
      "すべての在庫データ、設定、変更ログが完全に削除されます。この操作は取り消せません。本当に削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "すべて削除",
          style: "destructive",
          onPress: async () => {
            try {
              // AsyncStorageの全データを削除
              const allKeys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(allKeys);
              // SecureStoreのデータも削除
              await deleteSecureItem("labstock_user_name");
              // 在庫リストをリロード
              await loadItems();
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert("完了", "すべてのデータが削除されました。");
            } catch {
              Alert.alert("エラー", "データの削除に失敗しました。");
            }
          },
        },
      ]
    );
  };

  const openLegalDocument = (type: "privacy" | "terms") => {
    router.push({ pathname: "/legal-document", params: { type } });
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>設定</Text>
        </View>

        {/* ユーザー情報セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ユーザー情報</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowEditName(true)}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="person.fill" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>ユーザー名</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>{userName ?? "未設定"}</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 表示設定セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>表示設定</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? "#6366F1" + "20" : "#F59E0B" + "20" }]}>
                <Text style={{ fontSize: 18 }}>{isDarkMode ? "🌙" : "☀️"}</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>ダークモード</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  {isDarkMode ? "オン" : "オフ"}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* カテゴリ管理セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>カテゴリ管理</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowCategoryManager(true)}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: "#9333EA" + "15" }]}>
                <IconSymbol name="tag.fill" size={20} color="#9333EA" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>カテゴリを編集</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  {tags.length}個のカテゴリ（追加・編集・削除）
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* データ管理セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>データ管理</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleExport}
              disabled={isExporting}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.success + "15" }]}>
                <IconSymbol name="arrow.up.arrow.down" size={20} color={colors.success} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  {isExporting ? "エクスポート中..." : "Excelエクスポート"}
                </Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  在庫データを.xlsxファイルとして出力
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={handleDeleteAllData}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.error + "15" }]}>
                <IconSymbol name="trash" size={20} color={colors.error} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.error }]}>全データ削除</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  すべての在庫データと設定を完全に削除
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 法的情報セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>法的情報</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => openLegalDocument("privacy")}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: "#0EA5E9" + "15" }]}>
                <IconSymbol name="info.circle.fill" size={20} color="#0EA5E9" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>プライバシーポリシー</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  個人情報の取り扱いについて
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={() => openLegalDocument("terms")}
              activeOpacity={0.7}
              style={styles.settingRow}
            >
              <View style={[styles.settingIcon, { backgroundColor: "#8B5CF6" + "15" }]}>
                <IconSymbol name="list.bullet" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>利用規約</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  サービスの利用条件について
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* アプリ情報セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>アプリ情報</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>バージョン</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>1.0.0</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.warning + "15" }]}>
                <IconSymbol name="list.bullet" size={20} color={colors.warning} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>登録物品数</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>{items.length}件</Text>
              </View>
            </View>
          </View>
        </View>

        {/* フッター */}
        <Text style={[styles.footerText, { color: colors.muted }]}>
          LabStock v1.0.0{"\n"}
          個人の在庫データは端末内に保存されます。{"\n"}
          グループ共有を利用した場合のみ、共有データはクラウドに保存されます。
        </Text>
      </ScrollView>

      {/* ユーザー名編集モーダル */}
      <UserSetupModal
        visible={showEditName}
        onComplete={handleEditName}
        currentName={userName ?? ""}
        isEdit
        onCancel={() => setShowEditName(false)}
      />

      {/* カテゴリ管理モーダル */}
      <CategoryManager
        visible={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  section: { marginTop: 16, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingContent: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 16, fontWeight: "500" },
  settingValue: { fontSize: 13 },
  divider: { height: 0.5, marginLeft: 64 },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: 32,
  },
});
