import React, { createContext, useContext, useCallback, useEffect, useReducer } from "react";
import type { InventoryItem, CreateInventoryItem, UpdateInventoryItem, SortOption, SortDirection } from "./types";
import * as Storage from "./storage";
import { sendLowStockNotification, setBadgeCount } from "./notifications";

interface InventoryState {
  items: InventoryItem[];
  alertItems: InventoryItem[];
  isLoading: boolean;
  searchQuery: string;
  sortOption: SortOption;
  sortDirection: SortDirection;
  selectedTag: string | null; // null = 全て表示
}

type InventoryAction =
  | { type: "SET_ITEMS"; items: InventoryItem[] }
  | { type: "SET_ALERT_ITEMS"; items: InventoryItem[] }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SORT"; option: SortOption; direction: SortDirection }
  | { type: "SET_TAG_FILTER"; tag: string | null };

const initialState: InventoryState = {
  items: [],
  alertItems: [],
  isLoading: true,
  searchQuery: "",
  sortOption: "createdAt",
  sortDirection: "desc",
  selectedTag: null,
};

function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.items };
    case "SET_ALERT_ITEMS":
      return { ...state, alertItems: action.items };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };
    case "SET_SORT":
      return { ...state, sortOption: action.option, sortDirection: action.direction };
    case "SET_TAG_FILTER":
      return { ...state, selectedTag: action.tag };
    default:
      return state;
  }
}

interface InventoryContextType extends InventoryState {
  loadItems: () => Promise<void>;
  addItem: (input: CreateInventoryItem, userName: string) => Promise<InventoryItem>;
  editItem: (id: string, updates: UpdateInventoryItem, userName: string) => Promise<InventoryItem | null>;
  removeItem: (id: string) => Promise<boolean>;
  changeQuantity: (id: string, delta: number, userName: string) => Promise<InventoryItem | null>;
  setDirectQuantity: (id: string, newQuantity: number, userName: string) => Promise<InventoryItem | null>;
  setSearchQuery: (query: string) => void;
  setSort: (option: SortOption, direction: SortDirection) => void;
  setTagFilter: (tag: string | null) => void;
  filteredItems: InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  const loadItems = useCallback(async () => {
    dispatch({ type: "SET_LOADING", isLoading: true });
    try {
      const [items, alertItems] = await Promise.all([Storage.getAllItems(), Storage.getAlertItems()]);
      dispatch({ type: "SET_ITEMS", items });
      dispatch({ type: "SET_ALERT_ITEMS", items: alertItems });
      // バッジ数を更新
      setBadgeCount(alertItems.length);
    } catch {
      // エラー時は空配列のまま
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, []);

  const addItem = useCallback(
    async (input: CreateInventoryItem, userName: string) => {
      const newItem = await Storage.createItem(input, userName);
      await loadItems();
      return newItem;
    },
    [loadItems]
  );

  const editItem = useCallback(
    async (id: string, updates: UpdateInventoryItem, userName: string) => {
      const updated = await Storage.updateItem(id, updates, userName);
      await loadItems();
      return updated;
    },
    [loadItems]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const result = await Storage.deleteItem(id);
      await loadItems();
      return result;
    },
    [loadItems]
  );

  const changeQuantity = useCallback(
    async (id: string, delta: number, userName: string) => {
      const updated = await Storage.updateQuantity(id, delta, userName);
      // 閾値以下になったら通知を送信
      if (updated && updated.quantity <= updated.alertThreshold) {
        sendLowStockNotification(updated);
      }
      await loadItems();
      return updated;
    },
    [loadItems]
  );

  const setDirectQuantity = useCallback(
    async (id: string, newQuantity: number, userName: string) => {
      const updated = await Storage.setQuantity(id, newQuantity, userName);
      if (updated && updated.quantity <= updated.alertThreshold) {
        sendLowStockNotification(updated);
      }
      await loadItems();
      return updated;
    },
    [loadItems]
  );

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", query });
  }, []);

  const setSort = useCallback((option: SortOption, direction: SortDirection) => {
    dispatch({ type: "SET_SORT", option, direction });
  }, []);

  const setTagFilter = useCallback((tag: string | null) => {
    dispatch({ type: "SET_TAG_FILTER", tag });
  }, []);

  // フィルタリング・ソート済みアイテムを計算
  const filteredItems = React.useMemo(() => {
    let result = [...state.items];

    // タグフィルタ（複数タグ対応：アイテムのtagsにselectedTagが含まれていればマッチ）
    if (state.selectedTag) {
      result = result.filter((item) => {
        const itemTags = item.tags && item.tags.length > 0 ? item.tags : ["other"];
        return itemTags.includes(state.selectedTag!);
      });
    }

    // 検索フィルタ
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.company.toLowerCase().includes(query) ||
          item.modelNumber.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
      );
    }

    // ソート
    result.sort((a, b) => {
      let comparison = 0;
      switch (state.sortOption) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return state.sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [state.items, state.searchQuery, state.sortOption, state.sortDirection, state.selectedTag]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const contextValue: InventoryContextType = {
    ...state,
    loadItems,
    addItem,
    editItem,
    removeItem,
    changeQuantity,
    setDirectQuantity,
    setSearchQuery,
    setSort,
    setTagFilter,
    filteredItems,
  };

  return <InventoryContext.Provider value={contextValue}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
