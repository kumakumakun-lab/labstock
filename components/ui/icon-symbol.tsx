// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "list.bullet": "view-list",
  "plus.circle.fill": "add-circle",
  "bell.fill": "notifications",
  "magnifyingglass": "search",
  "arrow.up.arrow.down": "sort",
  "pencil": "edit",
  "trash": "delete",
  "camera.fill": "camera-alt",
  "photo.fill": "photo-library",
  "xmark": "close",
  "checkmark": "check",
  "minus": "remove",
  "plus": "add",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "person.fill": "person",
  "person.circle.fill": "account-circle",
  "clock.fill": "schedule",
  "arrow.counterclockwise": "history",
  "gearshape.fill": "settings",
  "barcode.viewfinder": "qr-code-scanner",
  "tag.fill": "label",
  "shield.fill": "shield",
  "lock.fill": "lock",
  "doc.text.fill": "description",
  "person.2.fill": "group",
  "link": "link",
  "square.and.arrow.up": "share",
  "rectangle.portrait.and.arrow.right": "logout",
  "crown.fill": "star",
  "text.bubble.fill": "chat",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
