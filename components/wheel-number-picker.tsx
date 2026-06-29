import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5; // 奇数（中央が選択値）

interface WheelNumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * 純JS製のホイール（ドラム）型数値ピッカー。
 * ネイティブモジュール不要のため Expo Go でもそのまま動く。
 * 中央のバンドに来た数値が選択値。
 */
export function WheelNumberPicker({ value, onChange, min = 0, max = 999 }: WheelNumberPickerProps) {
  const colors = useColors();
  const listRef = useRef<FlatList<number>>(null);
  const lastIndex = useRef<number>(Math.min(Math.max(value - min, 0), max - min));

  const data = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );
  const clampedIndex = Math.min(Math.max(value - min, 0), data.length - 1);

  // 外部から value が変わったらスクロール位置を合わせる
  useEffect(() => {
    const idx = Math.min(Math.max(value - min, 0), data.length - 1);
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
    }
  }, [value, min, data.length]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const idx = Math.min(Math.max(Math.round(offsetY / ITEM_HEIGHT), 0), data.length - 1);
      if (idx !== lastIndex.current) {
        lastIndex.current = idx;
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onChange(min + idx);
      }
    },
    [data.length, min, onChange],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const pad = ITEM_HEIGHT * ((VISIBLE_ROWS - 1) / 2);

  return (
    <View style={[styles.container, { height: ITEM_HEIGHT * VISIBLE_ROWS }]}>
      {/* 中央の選択バンド */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionBand,
          { top: pad, height: ITEM_HEIGHT, borderColor: colors.border, backgroundColor: colors.primary + "12" },
        ]}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(n) => String(n)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        initialScrollIndex={clampedIndex}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: pad }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={[styles.itemText, { color: item === value ? colors.foreground : colors.muted, opacity: item === value ? 1 : 0.5 }]}>
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 110, position: "relative" },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  item: { height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
  itemText: { fontSize: 24, fontWeight: "800" },
});
