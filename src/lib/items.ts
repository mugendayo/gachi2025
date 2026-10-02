"use client";
// もちもの（ITEM）の所持状態。年度ごとのキーで localStorage に持つ。
// どのセクションも DOM を直接いじらず、acquire() と useItems() だけを使う。
import { useEffect, useState } from "react";
import { site, type ItemId } from "@/data/site";

const KEY = `gbf_${site.year}_items`;
export const ITEM_EVENT = "gbf:item";

function read(): ItemId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function acquire(id: ItemId) {
  const cur = read();
  if (!cur.includes(id)) {
    cur.push(id);
    try {
      localStorage.setItem(KEY, JSON.stringify(cur));
    } catch {}
  }
  window.dispatchEvent(new CustomEvent(ITEM_EVENT, { detail: { id } }));
}

export function useItems() {
  const [owned, setOwned] = useState<ItemId[]>([]);
  useEffect(() => {
    const sync = () => setOwned(read());
    sync();
    window.addEventListener(ITEM_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ITEM_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return owned;
}

export const allCollected = (owned: ItemId[]) => site.items.every((it) => owned.includes(it.id));

/** デバッグ用：コンソールで window.__resetItems() */
if (typeof window !== "undefined") {
  (window as unknown as { __resetItems: () => void }).__resetItems = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent(ITEM_EVENT));
  };
}
