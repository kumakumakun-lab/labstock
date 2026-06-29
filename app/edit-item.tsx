import { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useInventory } from "@/lib/inventory-context";
import { useUser } from "@/lib/user-context";
import { getItemById } from "@/lib/storage";
import { TagSelector } from "@/components/tag-selector";
import { sanitizeInventoryInput } from "@/lib/validation";

export default function EditItemScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { editItem } = useInventory();
  const { userName } = useUser();
  const currentUser = userName ?? "不明";

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState("5");
  const [tags, setTags] = useState<string[]>(["other"]);

  const handleTagToggle = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== tagId);
      }
      return [...prev, tagId];
    });
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      if (!id) return;
      const item = await getItemById(id);
      if (item) {
        setName(item.name);
        setCompany(item.company);
        setModelNumber(item.modelNumber);
        setQuantity(item.quantity.toString());
        setLocation(item.location);
        setNotes(item.notes);
        setImageUri(item.imageUri);
        setAlertThreshold(item.alertThreshold.toString());
        setTags(item.tags && item.tags.length > 0 ? item.tags : (item as any).tag ? [(item as any).tag] : ["other"]);
      }
      setIsLoadingItem(false);
    };
    loadItem();
  }, [id]);

  const pickImage = async (useCamera: boolean) => {
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
  };

  const showImagePicker = () => {
    if (Platform.OS === "web") {
      pickImage(false);
      return;
    }
    Alert.alert("画像を選択", "画像の取得方法を選択してください", [
      { text: "カメラで撮影", onPress: () => pickImage(true) },
      { text: "ライブラリから選択", onPress: () => pickImage(false) },
      { text: "キャンセル", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!id) return;
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
    });

    if (!valid) {
      Alert.alert("入力エラー", errors.join("\n"));
      return;
    }

    setIsSaving(true);
    try {
      await editItem(id, sanitized, currentUser);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch {
      Alert.alert("エラー", "保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingItem) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>物品を編集</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 画像 */}
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
                  タップして画像を変更
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={0.6}>
              <Text style={[styles.removeImageText, { color: colors.error }]}>画像を削除</Text>
            </TouchableOpacity>
          )}

          {/* フォーム */}
          <View style={styles.formSection}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                物品名 <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
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
                value={company}
                onChangeText={setCompany}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>型番</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
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
                value={location}
                onChangeText={setLocation}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>備考</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
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
            <Text style={styles.saveButtonText}>{isSaving ? "保存中..." : "変更を保存"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
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
  formSection: { gap: 16, marginTop: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
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
