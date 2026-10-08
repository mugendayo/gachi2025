"use client";
// 昔の PC のロールプレイングゲームのようなメッセージ窓（汎用）。lines を1ページずつ、1字ずつ出す。
// タップ・クリック・Enter・Space・Esc で送る：書いている途中なら全文→次のページ→最後なら閉じて onClose。
// document.body に出し、開いている間は後ろの操作（触る・スクロール・キー）を止める。文言は渡されたものだけを出す。
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import "./gameDialog.css";

const CHAR_MS = 40; // 1字の間
const GUARD_MS = 250; // 開いた直後の指の離れ（開くきっかけになった操作）では送らない

export default function GameDialog({ lines, onClose }: { lines: readonly string[]; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(0); // 出した字数
  const rootRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const [reduce] = useState(
    () =>
      typeof window !== "undefined" &&
      !new URLSearchParams(location.search).has("motion") &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const text = lines[page] ?? "";
  const chars = Array.from(text); // 絵文字などを1字として数える
  const done = reduce || shown >= chars.length;

  // 1字ずつ出す（動きを減らす設定では全文をすぐ）
  useEffect(() => {
    if (reduce) return;
    const len = Array.from(lines[page] ?? "").length;
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      // 途中で全文にしたあとは、増やすだけ（戻さない）
      setShown((s) => Math.min(len, Math.max(s, n)));
      if (n >= len) window.clearInterval(id);
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [page, lines, reduce]);

  const advance = useCallback(() => {
    if (performance.now() - openedAt.current < GUARD_MS) return;
    if (!done) {
      setShown(chars.length);
      return;
    }
    if (page < lines.length - 1) {
      setShown(0);
      setPage(page + 1);
    } else onClose();
  }, [done, chars.length, page, lines.length, onClose]);

  // 開いている間：後ろを触れなくし、ここに注目を移す。閉じたら元の場所へ戻す
  useEffect(() => {
    openedAt.current = performance.now();
    const root = rootRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const blocked: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === root || el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      blocked.push(el);
    }
    root?.focus({ preventScroll: true });
    // 後ろのスクロールを止める（ホイール・指）
    const stopScroll = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    root?.addEventListener("wheel", stopScroll, { passive: false });
    root?.addEventListener("touchmove", stopScroll, { passive: false });
    return () => {
      for (const el of blocked) el.removeAttribute("inert");
      root?.removeEventListener("wheel", stopScroll);
      root?.removeEventListener("touchmove", stopScroll);
      try {
        prevFocus?.focus({ preventScroll: true });
      } catch {}
    };
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      advance();
    } else if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key)) e.preventDefault();
  };

  return createPortal(
    <div
      ref={rootRef}
      className="kb-gd"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-gd-text"
      tabIndex={-1}
      data-reduce={reduce ? "" : undefined}
      onClick={advance}
      onKeyDown={onKey}
    >
      <div className="kb-gd-win">
        {/* 読み上げにはページの全文を一度に渡す（1字ずつは読ませない） */}
        <p id="kb-gd-text" className="kb-gd-sr" aria-live="assertive">
          {text}
        </p>
        <p className="kb-gd-text" aria-hidden>
          {reduce ? text : chars.slice(0, shown).join("")}
        </p>
        <i className="kb-gd-next" data-on={done ? "" : undefined} aria-hidden />
      </div>
    </div>,
    document.body,
  );
}
