import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface UserSetupModalProps {
  visible: boolean;
  onComplete: (name: string) => void;
  /** 編集モードの場合、現在のユーザー名を渡す */
  currentName?: string;
  /** 編集モードかどうか */
  isEdit?: boolean;
  /** 編集モード時のキャンセル */
  onCancel?: () => void;
}

export default function UserSetupModal({
  visible,
  onComplete,
  currentName = "",
  isEdit = false,
  onCancel,
}: UserSetupModalProps) {
  const colors = useColors();
  const [name, setName] = useState(currentName);

  const handleSubmit = () => {
    if (name.trim().length === 0) return;
    onComplete(name.trim());
    if (!isEdit) setName("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isEdit ? onCancel : () => {}}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* アイコン */}
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="person.fill" size={36} color={colors.primary} />
          </View>

          {/* タイトル */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isEdit ? "ユーザー名を変更" : "ようこそ LabStock へ"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {isEdit
              ? "新しいユーザー名を入力してください"
              : "在庫管理を始めるために、ユーザー名を登録してください。変更ログに記録されます。"}
          </Text>

          {/* 入力フィールド */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="例: 田中太郎"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={30}
          />

          {/* ボタン */}
          <View style={styles.buttonRow}>
            {isEdit && onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.cancelButton, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.muted }]}>キャンセル</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={name.trim().length === 0}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.primary,
                  opacity: name.trim().length === 0 ? 0.5 : 1,
                  flex: isEdit ? 1 : undefined,
                  width: isEdit ? undefined : "100%",
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isEdit ? "変更する" : "はじめる"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
