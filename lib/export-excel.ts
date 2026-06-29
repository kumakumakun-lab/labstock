import * as FileSystem from "expo-file-system/legacy";
import { Platform, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import type { InventoryItem } from "./types";
import { DEFAULT_TAGS } from "./types";
import * as XLSX from "xlsx";

/**
 * タグIDからラベルを取得
 */
function getTagLabel(tagId: string): string {
  const tag = DEFAULT_TAGS.find((t) => t.id === tagId);
  return tag?.label ?? tagId;
}

/**
 * タグID配列からラベルをカンマ区切りで取得
 */
function getTagLabels(tags: string[]): string {
  if (!tags || tags.length === 0) return "その他";
  return tags.map(getTagLabel).join(", ");
}

/**
 * 日付をフォーマットする
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 在庫データを.xlsx形式のバイナリとして生成する
 */
export function generateExcelXlsx(items: InventoryItem[]): ArrayBuffer {
  // ヘッダー行
  const headers = [
    "物品名", "企業名", "型番", "カテゴリ", "在庫数",
    "アラート閾値", "保管場所", "備考", "登録者",
    "登録日時", "最終更新", "ステータス",
  ];

  // データ行
  const data = items.map((item) => {
    const status =
      item.quantity <= 0
        ? "在庫切れ"
        : item.quantity <= item.alertThreshold
        ? "在庫少量"
        : "正常";

    return [
      item.name,
      item.company,
      item.modelNumber,
      getTagLabels(item.tags),
      item.quantity,
      item.alertThreshold,
      item.location,
      item.notes,
      item.createdBy ?? "不明",
      formatDate(item.createdAt),
      formatDate(item.updatedAt),
      status,
    ];
  });

  // ワークシートを作成
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 列幅を設定
  ws["!cols"] = [
    { wch: 24 }, // 物品名
    { wch: 16 }, // 企業名
    { wch: 16 }, // 型番
    { wch: 16 }, // カテゴリ
    { wch: 8 },  // 在庫数
    { wch: 12 }, // アラート閾値
    { wch: 16 }, // 保管場所
    { wch: 20 }, // 備考
    { wch: 12 }, // 登録者
    { wch: 18 }, // 登録日時
    { wch: 18 }, // 最終更新
    { wch: 10 }, // ステータス
  ];

  // ワークブックを作成
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "在庫一覧");

  // .xlsx形式でバイナリを生成
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return wbout;
}

/**
 * ArrayBufferをBase64文字列に変換する
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // 1バイトずつ連結すると大量データで極端に遅くなるため、チャンク単位で変換する
  const CHUNK_SIZE = 0x8000; // 32KB
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  // React Native環境ではglobal.btoaが利用可能
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }
  // Node.js環境のフォールバック
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(binary, "binary").toString("base64");
  }
  throw new Error("Base64 encoding not available");
}

/**
 * Excelファイルをエクスポートしてシェアする
 */
export async function exportToExcel(items: InventoryItem[]): Promise<void> {
  try {
    const xlsxData = generateExcelXlsx(items);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
    const fileName = `LabStock_在庫一覧_${dateStr}.xlsx`;

    if (Platform.OS === "web") {
      // Web: Blobでダウンロード
      const blob = new Blob([xlsxData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Native: Base64に変換してファイルに保存、シェア
    const base64Data = arrayBufferToBase64(xlsxData);
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "在庫データをエクスポート",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } else {
      Alert.alert("エクスポート完了", `ファイルが保存されました: ${fileName}`);
    }
  } catch (error) {
    console.error("[ExportExcel] Error:", error);
    Alert.alert("エクスポートエラー", "Excelファイルの生成に失敗しました。");
  }
}
