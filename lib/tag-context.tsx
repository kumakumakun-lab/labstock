import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import type { TagItem } from "./types";
import { DEFAULT_TAGS } from "./types";
import * as TagStore from "./tag-store";

interface TagContextType {
  tags: TagItem[];
  isLoaded: boolean;
  addTag: (tag: TagItem) => Promise<void>;
  updateTag: (id: string, updates: Partial<Omit<TagItem, "id">>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  resetTags: () => Promise<void>;
  getTagById: (id: string) => TagItem | undefined;
}

const TagContext = createContext<TagContextType | null>(null);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<TagItem[]>(DEFAULT_TAGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loaded = await TagStore.getAllTags();
      setTags(loaded);
      setIsLoaded(true);
    };
    load();
  }, []);

  const addTag = useCallback(async (tag: TagItem) => {
    const updated = await TagStore.addTag(tag);
    setTags(updated);
  }, []);

  const updateTag = useCallback(async (id: string, updates: Partial<Omit<TagItem, "id">>) => {
    const updated = await TagStore.updateTag(id, updates);
    setTags(updated);
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const updated = await TagStore.deleteTag(id);
    setTags(updated);
  }, []);

  const resetTags = useCallback(async () => {
    const updated = await TagStore.resetTags();
    setTags(updated);
  }, []);

  const getTagById = useCallback(
    (id: string) => tags.find((t) => t.id === id),
    [tags]
  );

  return (
    <TagContext.Provider value={{ tags, isLoaded, addTag, updateTag, deleteTag, resetTags, getTagById }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTags(): TagContextType {
  const context = useContext(TagContext);
  if (!context) {
    throw new Error("useTags must be used within a TagProvider");
  }
  return context;
}
