import { View, useWindowDimensions, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

// iPad などの広い画面でコンテンツが間延びしないよう、中央寄せして最大幅を制限する閾値。
// アプリは縦向き固定のため iPhone がこの幅に達することはない。
const WIDE_SCREEN_BREAKPOINT = 700;
const CONTENT_MAX_WIDTH = 700;

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  // iPad等の広い画面ではコンテンツを中央寄せして最大幅を制限（iPhoneは全幅のまま）
  const wideContentStyle =
    width >= WIDE_SCREEN_BREAKPOINT
      ? { maxWidth: CONTENT_MAX_WIDTH, width: "100%" as const, alignSelf: "center" as const }
      : undefined;
  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        <View className={cn("flex-1", className)} style={wideContentStyle}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
