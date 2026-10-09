"use client";
// 「もどる」ボタン。
// 同じサイトの前のページから来ていれば、ブラウザの「戻る」と同じ動き（読んでいた位置もそのまま）。
// そうでなければ（直接開いた・外から来た）トップへ移る。JS が動かない環境でもトップへのリンクとして働く。
import Link from "next/link";
import type { MouseEvent } from "react";

/** 同じサイトの前のページへ戻れるか（押した瞬間に判定する） */
const canGoBackInSite = () => {
  // 履歴を直接見られるブラウザ（Navigation API）：ひとつ前が同じサイトのページなら戻る。
  // ここに並ぶのは同じサイトの続きの履歴だけなので、先頭でなければ前は同じサイト。
  const nav = (window as Window & { navigation?: { currentEntry?: { index: number } | null } }).navigation;
  const idx = nav?.currentEntry?.index;
  if (typeof idx === "number" && idx >= 0) return idx > 0;
  // 見られないブラウザ：手がかりから推し量る
  if (window.history.length < 2) return false;
  // サイト内の移動（ページを読み込み直さない移動）でここへ来た：最初に読み込んだページとアドレスが違う
  const first = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (first) {
    try {
      if (new URL(first.name).pathname !== location.pathname) return true;
    } catch {
      /* 判定できないときは次へ */
    }
  }
  // 読み込み直しを伴って同じサイトの別ページから来た
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      return ref.origin === location.origin && ref.pathname !== location.pathname;
    } catch {
      return false;
    }
  }
  return false;
};

export default function BackButton({ className = "" }: { className?: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 新しいタブで開く操作（Ctrl/⌘・中ボタンなど）はそのまま通す
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!canGoBackInSite()) return; // トップへ（Link のまま）
    e.preventDefault();
    window.history.back();
  };

  return (
    <Link
      href="/"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#c9ccd2] bg-[#f6f5f1] py-2 pl-3 pr-5 text-[15px] font-bold text-[#1b1d21] transition-colors hover:border-[#9da2aa] hover:bg-[#ecebe5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d21] active:bg-[#e2e1da] ${className}`}
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      もどる
    </Link>
  );
}
