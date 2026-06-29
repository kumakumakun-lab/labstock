import { useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function BarcodeScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ type: string; data: string } | null>(null);
  // 同期フラグ: setScannedの反映前に複数フレームが発火して二重に戻るのを防ぐ
  const scannedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    ({ type, data }: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      setScanned(true);
      setLastScanned({ type, data });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // 先に結果を格納してから戻る（タイミング依存を排除し、受け取り側のフォーカス時に確実に読めるようにする）
      if (typeof global !== "undefined") {
        (global as Record<string, unknown>).__lastBarcodeScan = { type, data };
      }
      router.back();
    },
    [router]
  );

  const handleScanAgain = () => {
    scannedRef.current = false;
    setScanned(false);
    setLastScanned(null);
  };

  // 権限がまだ読み込まれていない場合
  if (!permission) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.messageText, { color: colors.foreground }]}>
            カメラの権限を確認中...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 権限が付与されていない場合
  if (!permission.granted) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <View style={[styles.permissionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="camera.fill" size={48} color={colors.primary} />
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
              カメラの使用許可が必要です
            </Text>
            <Text style={[styles.permissionDesc, { color: colors.muted }]}>
              バーコードやQRコードをスキャンするために、カメラへのアクセスを許可してください。
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>カメラを許可する</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Web環境ではカメラが制限される場合がある
  if (Platform.OS === "web") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <View style={[styles.permissionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="camera.fill" size={48} color={colors.warning} />
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
              Web版ではスキャン機能が制限されます
            </Text>
            <Text style={[styles.permissionDesc, { color: colors.muted }]}>
              バーコード/QRコードスキャンは、iOS/Androidアプリでご利用いただけます。
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "code93", "upc_a", "upc_e", "itf14", "datamatrix", "pdf417"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* オーバーレイ */}
      <View style={styles.overlay}>
        {/* ヘッダー */}
        <View style={styles.overlayHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.overlayTitle}>スキャン</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* スキャンフレーム */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* 四隅のコーナー */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* 下部の説明 */}
        <View style={styles.overlayFooter}>
          <Text style={styles.overlayHint}>
            バーコードまたはQRコードを枠内に合わせてください
          </Text>
          {scanned && lastScanned && (
            <View style={styles.scannedResult}>
              <Text style={styles.scannedType}>
                {lastScanned.type.toUpperCase()}
              </Text>
              <Text style={styles.scannedData} numberOfLines={2}>
                {lastScanned.data}
              </Text>
              <TouchableOpacity
                onPress={handleScanAgain}
                style={styles.scanAgainButton}
                activeOpacity={0.8}
              >
                <Text style={styles.scanAgainText}>もう一度スキャン</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: "#000000" },
  camera: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  messageText: { fontSize: 16, textAlign: "center" },
  permissionCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  permissionTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  permissionDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  permissionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cancelText: { fontSize: 15, fontWeight: "500", marginTop: 8 },
  // オーバーレイ
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scanFrameContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#FFFFFF",
    borderBottomRightRadius: 4,
  },
  overlayFooter: {
    alignItems: "center",
    paddingBottom: 80,
    paddingHorizontal: 20,
    gap: 16,
  },
  overlayHint: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  scannedResult: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  scannedType: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  scannedData: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  scanAgainButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 4,
  },
  scanAgainText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
