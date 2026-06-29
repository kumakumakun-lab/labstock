import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useInventory } from "@/lib/inventory-context";
import { useUser } from "@/lib/user-context";
import { TagSelector } from "@/components/tag-selector";
import { sanitizeInventoryInput } from "@/lib/validation";
import * as GroupStorage from "@/lib/group-storage";
import type { LocalGroup } from "@/lib/group-storage";

export default function AddItemScreen() {
  const colors = useColors();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { addItem } = useInventory();
  const { userName } = useUser();
  const currentUser = userName ?? "不明";

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState("5");
  const [tags, setTags] = useState<string[]>(["other"]);

  const handleTagToggle = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) {
        // 最低1つは選択必須
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== tagId);
      }
      return [...prev, tagId];
    });
  };
  const [barcode, setBarcode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // 登録先（null = 個人 / それ以外 = グループID）
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [myGroups, setMyGroups] = useState<LocalGroup[]>([]);

  // 自分が参加しているグループを読み込む（登録先の選択肢用）
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;
    GroupStorage.getMyGroups()
      .then((gs) => {
        if (!cancelled) setMyGroups(gs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  // バーコードスキャン結果を受け取る
  useEffect(() => {
    if (isFocused && typeof global !== "undefined") {
      const scanResult = (global as Record<string, unknown>).__lastBarcodeScan as { type: string; data: string } | undefined;
      if (scanResult) {
        setBarcode(scanResult.data);
        // QRコードの場合、URLやテキストを備考に入れる
        if (scanResult.type === "qr" || scanResult.type === "org.iso.QRCode") {
          setNotes((prev) => prev ? `${prev}\nQR: ${scanResult.data}` : `QR: ${scanResult.data}`);
        } else {
          // バーコードの場合、型番に設定
          if (!modelNumber) {
            setModelNumber(scanResult.data);
          }
        }
        (global as Record<string, unknown>).__lastBarcodeScan = undefined;
      }
    }
  }, [isFocused]);

  const openBarcodeScanner = () => {
    router.push("/barcode-scanner");
  };

  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("権限エラー", "カメラの使用を許可してください。");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("権限エラー", "写真ライブラリへのアクセスを許可してください。");
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("エラー", "画像の選択に失敗しました。");
    }
  }, []);

  const showImagePicker = useCallback(() => {
    if (Platform.OS === "web") {
      pickImage(false);
      return;
    }
    Alert.alert("画像を選択", "画像の取得方法を選択してください", [
      { text: "カメラで撮影", onPress: () => pickImage(true) },
      { text: "ライブラリから選択", onPress: () => pickImage(false) },
      { text: "キャンセル", style: "cancel" },
    ]);
  }, [pickImage]);

  const handleSave = async () => {
    const qty = parseInt(quantity, 10) || 0;
    const threshold = parseInt(alertThreshold, 10) || 0;

    const { valid, errors, sanitized } = sanitizeInventoryInput({
      name,
      company,
      modelNumber,
      quantity: qty,
      location,
      notes,
      imageUri,
      alertThreshold: threshold,
      tags,
      barcode: barcode || undefined,
    });

    if (!valid) {
      Alert.alert("入力エラー", errors.join("\n"));
      return;
    }

    setIsSaving(true);
    try {
      if (targetGroupId) {
        // グループの共有在庫に追加（Supabase。画像は対象外）
        await GroupStorage.addGroupItem(
          targetGroupId,
          {
            name: sanitized.name,
            company: sanitized.company,
            modelNumber: sanitized.modelNumber,
            quantity: sanitized.quantity,
            location: sanitized.location,
            notes: sanitized.notes,
            alertThreshold: sanitized.alertThreshold,
            tags: sanitized.tags,
            barcode: sanitized.barcode,
            createdBy: currentUser,
          },
          currentUser,
        );
      } else {
        await addItem(sanitized, currentUser);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // フォームリセット
      setName("");
      setCompany("");
      setModelNumber("");
      setQuantity("1");
      setLocation("");
      setNotes("");
      setImageUri(null);
      setAlertThreshold("5");
      setTags(["other"]);
      setBarcode("");
      // 一覧タブに遷移
      router.replace("/(tabs)");
    } catch {
      Alert.alert("エラー", "保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>物品を追加</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 画像添付 */}
          <TouchableOpacity
            onPress={showImagePicker}
            activeOpacity={0.7}
            style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.imagePickerContent}>
                <IconSymbol name="camera.fill" size={32} color={colors.muted} />
                <Text style={[styles.imagePickerText, { color: colors.muted }]}>
                  タップして画像を追加
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={0.6}>
              <Text style={[styles.removeImageText, { color: colors.error }]}>画像を削除</Text>
            </TouchableOpacity>
          )}

          {/* バーコードスキャンボタン */}
          <TouchableOpacity
            onPress={openBarcodeScanner}
            activeOpacity={0.7}
            style={[styles.scanButton, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "40" }]}
          >
            <IconSymbol name="camera.fill" size={20} color={colors.primary} />
            <Text style={[styles.scanButtonText, { color: colors.primary }]}>
              バーコード / QRコードをスキャン
            </Text>
          </TouchableOpacity>
          {barcode ? (
            <View style={[styles.barcodeResult, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}>
              <Text style={[styles.barcodeLabel, { color: colors.success }]}>スキャン済み</Text>
              <Text style={[styles.barcodeData, { color: colors.foreground }]} numberOfLines={1}>{barcode}</Text>
              <TouchableOpacity onPress={() => setBarcode("")} activeOpacity={0.6}>
                <IconSymbol name="xmark" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* フォーム */}
          <View style={styles.formSection}>
            {/* 登録先（個人 or グループ） */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>登録先</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destRow}>
                <TouchableOpacity
                  onPress={() => setTargetGroupId(null)}
                  activeOpacity={0.7}
                  style={[
                    styles.destChip,
                    {
                      borderColor: targetGroupId === null ? colors.primary : colors.border,
                      backgroundColor: targetGroupId === null ? colors.primary + "15" : colors.surface,
                    },
                  ]}
                >
                  <IconSymbol name="person.fill" size={14} color={targetGroupId === null ? colors.primary : colors.muted} />
                  <Text style={[styles.destChipText, { color: targetGroupId === null ? colors.primary : colors.foreground }]}>個人</Text>
                </TouchableOpacity>
                {myGroups.map((g) => {
                  const active = targetGroupId === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setTargetGroupId(g.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.destChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary + "15" : colors.surface,
                        },
                      ]}
                    >
                      <IconSymbol name="person.fill" size={14} color={active ? colors.primary : colors.muted} />
                      <Text style={[styles.destChipText, { color: active ? colors.primary : colors.foreground }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.destHint, { color: colors.muted }]}>
                {targetGroupId
                  ? "このグループの共有在庫に追加されます（画像は個人在庫のみ対応）"
                  : "あなたの端末内にのみ保存されます"}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                物品名 <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="例: エッペンドルフチューブ"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>カテゴリ</Text>
              <TagSelector selectedTags={tags} onToggle={handleTagToggle} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>企業名</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="例: Eppendorf"
                placeholderTextColor={colors.muted}
                value={company}
                onChangeText={setCompany}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>型番</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="例: 0030 120.086"
                placeholderTextColor={colors.muted}
                value={modelNumber}
                onChangeText={setModelNumber}
                returnKeyType="next"
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  個数 <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, textAlign: "center" }]}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>アラート閾値</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, textAlign: "center" }]}
                  placeholder="5"
                  placeholderTextColor={colors.muted}
                  value={alertThreshold}
                  onChangeText={setAlertThreshold}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>保管場所</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="例: 冷蔵庫A-2段目"
                placeholderTextColor={colors.muted}
                value={location}
                onChangeText={setLocation}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>備考</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="自由記述..."
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* 保存ボタン */}
        <View style={[styles.saveButtonContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !name.trim()}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: isSaving || !name.trim() ? 0.5 : 1 },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{isSaving ? "保存中..." : "保存する"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  imagePickerButton: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 8,
  },
  previewImage: { width: "100%", height: "100%" },
  imagePickerContent: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  imagePickerText: { fontSize: 14 },
  removeImageText: { fontSize: 14, textAlign: "center", marginBottom: 16, fontWeight: "500" },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  scanButtonText: { fontSize: 15, fontWeight: "600" },
  barcodeResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  barcodeLabel: { fontSize: 12, fontWeight: "700" },
  barcodeData: { flex: 1, fontSize: 14, fontWeight: "500" },
  formSection: { gap: 16, marginTop: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  destRow: { gap: 8, paddingVertical: 2 },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  destChipText: { fontSize: 14, fontWeight: "600" },
  destHint: { fontSize: 12, marginTop: 2 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  rowFields: { flexDirection: "row", gap: 12 },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
