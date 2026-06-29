import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * バナー広告コンポーネント
 *
 * ネイティブ環境では Google AdMob バナー広告を表示します。
 * Expo Go環境ではネイティブモジュールが利用できないため、
 * フォールバック表示を行います。
 * Web環境では非表示になります。
 */

// AdMob 本番バナー広告ユニットID
const BANNER_AD_UNIT_ID = "ca-app-pub-2915956047676828/8619362908";

// リトライ設定
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 30000; // 30秒

// AdMob SDKの読み込みを安全に試行（モジュールスコープで1回だけ）
let AdMobModule: any = null;
let adModuleAvailable = false;

if (Platform.OS !== "web") {
  try {
    // Expo Goではネイティブモジュールが存在しないためエラーになる
    AdMobModule = require("react-native-google-mobile-ads");
    // モジュールが存在しても、ネイティブ部分が登録されていない場合がある
    // BannerAdコンポーネントが存在するか確認
    if (AdMobModule?.BannerAd && AdMobModule?.BannerAdSize) {
      adModuleAvailable = true;
    }
  } catch (e) {
    console.log("[BannerAd] AdMob SDK not available (expected in Expo Go):", (e as Error)?.message);
    adModuleAvailable = false;
  }
}

interface BannerAdProps {
  /** 広告の表示位置 */
  position?: "top" | "bottom";
}

export default function BannerAdComponent({ position = "bottom" }: BannerAdProps) {
  const colors = useColors();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(!adModuleAvailable);
  const [retryCount, setRetryCount] = useState(0);
  const [adKey, setAdKey] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // リトライタイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleAdLoaded = () => {
    console.log("[BannerAd] Ad loaded successfully");
    setAdLoaded(true);
    setAdError(false);
    setRetryCount(0);
  };

  const handleAdFailed = (error: any) => {
    console.log("[BannerAd] Ad failed to load:", error?.message || error);
    setAdError(true);
    setAdLoaded(false);

    // リトライ
    if (retryCount < MAX_RETRIES) {
      console.log(`[BannerAd] Scheduling retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_INTERVAL_MS / 1000}s`);
      retryTimerRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setAdError(false);
        setAdKey((prev) => prev + 1);
      }, RETRY_INTERVAL_MS);
    }
  };

  // Web環境では非表示
  if (Platform.OS === "web") return null;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderBottomColor: colors.border,
      ...(position === "top" ? { borderBottomWidth: 0.5 } : { borderTopWidth: 0.5 }),
    },
  ];

  // AdMob SDK が利用可能で、エラーでない場合は広告を表示
  if (adModuleAvailable && !adError) {
    const { BannerAd, BannerAdSize, TestIds } = AdMobModule;
    return (
      <View style={containerStyle}>
        <BannerAd
          key={adKey}
          unitId={__DEV__ ? TestIds.ADAPTIVE_BANNER : BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailed}
        />
      </View>
    );
  }

  // 本番ビルドでは広告未取得（no-fill等）でも何も表示しない。
  // 「広告スペース」等のプレースホルダは未完成な印象を与え審査リスクになるため、
  // 開発(Expo Go)時のみスロット位置が分かるフォールバックを表示する。
  if (!__DEV__) return null;

  // Expo Go環境などでのフォールバック表示（開発時のみ）
  return (
    <View style={containerStyle}>
      <View style={[styles.adPlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.adLabel, { color: colors.muted }]}>広告</Text>
        {!adModuleAvailable ? (
          <Text style={[styles.adText, { color: colors.muted }]}>
            広告スペース
          </Text>
        ) : retryCount < MAX_RETRIES ? (
          <Text style={[styles.adText, { color: colors.muted }]}>
            読み込み中...
          </Text>
        ) : (
          <Text style={[styles.adText, { color: colors.muted }]}>
            広告を読み込めませんでした
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  adPlaceholder: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  adLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  adText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
