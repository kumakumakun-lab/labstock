import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PRIVACY_POLICY_JA } from "@/lib/legal/privacy-policy";
import { TERMS_OF_SERVICE_JA } from "@/lib/legal/terms-of-service";

/**
 * 法的文書表示画面
 * プライバシーポリシーと利用規約をアプリ内で閲覧可能にする
 */
export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const colors = useColors();

  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "プライバシーポリシー" : "利用規約";
  const content = isPrivacy ? PRIVACY_POLICY_JA : TERMS_OF_SERVICE_JA;

  // Markdownを簡易的にパースして表示する
  const renderContent = () => {
    const lines = content.trim().split("\n");
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 空行
      if (line.trim() === "") {
        elements.push(<View key={`space-${i}`} style={{ height: 8 }} />);
        continue;
      }

      // H1 タイトル（スキップ - ヘッダーで表示）
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        continue;
      }

      // H2 セクション見出し
      if (line.startsWith("## ")) {
        elements.push(
          <Text key={`h2-${i}`} style={[styles.h2, { color: colors.foreground }]}>
            {line.replace("## ", "")}
          </Text>
        );
        continue;
      }

      // H3 サブ見出し
      if (line.startsWith("### ")) {
        elements.push(
          <Text key={`h3-${i}`} style={[styles.h3, { color: colors.foreground }]}>
            {line.replace("### ", "")}
          </Text>
        );
        continue;
      }

      // テーブル行（簡易表示）
      if (line.startsWith("|")) {
        // ヘッダー区切り行はスキップ
        if (line.includes("---")) continue;
        const cells = line.split("|").filter((c) => c.trim());
        if (cells.length >= 2) {
          elements.push(
            <View key={`table-${i}`} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, styles.tableCellLeft, { color: colors.primary }]}>
                {cells[0].trim()}
              </Text>
              <Text style={[styles.tableCell, { color: colors.foreground }]}>
                {cells[1].trim()}
              </Text>
            </View>
          );
        }
        continue;
      }

      // リスト項目
      if (line.startsWith("- ")) {
        const text = line.replace("- ", "").replace(/\*\*(.*?)\*\*/g, "$1");
        elements.push(
          <View key={`li-${i}`} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.listText, { color: colors.foreground }]}>{text}</Text>
          </View>
        );
        continue;
      }

      // 通常テキスト（太字のMarkdownを処理）
      const text = line.replace(/\*\*(.*?)\*\*/g, "$1");
      elements.push(
        <Text key={`p-${i}`} style={[styles.paragraph, { color: colors.foreground }]}>
          {text}
        </Text>
      );
    }

    return elements;
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
        >
          <IconSymbol name="xmark" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  h3: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    marginRight: 8,
    fontWeight: "700",
  },
  listText: {
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tableCellLeft: {
    fontWeight: "600",
    flex: 0.4,
    marginRight: 8,
  },
});
