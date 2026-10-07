"use client";
// ゲーム解禁前の「お預け」。魔法陣を押しても先へは進まず、解禁日時とカウントダウンだけを見せる。
// 解禁時刻（site.unlockAt）を過ぎると入口側でこのお預けは自動で外れる。
// 動きは CSS の keyframes だけ（framer-motion を初回の JS に入れない）。
import { useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { now } from "@/lib/now";

const UNLOCK_TS = Date.parse(site.unlockAt);
/** 黒板の世界時計と同じ「いま」（?t= と配信元の時刻の補正を共有する＝lib/now） */
export const isLockedNow = () => now() < UNLOCK_TS;
export const msUntilUnlock = () => UNLOCK_TS - now();

function useCountdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(Math.max(0, msUntilUnlock()));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);
  if (ms === null) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 魔法陣の下に出す小さな表示：「ゲーム解禁まで あと◯日」。数字が出るまでも同じ大きさの枠を取っておく（読み込み後に魔法陣が跳ねない） */
export function UnlockCountdownBadge() {
  const c = useCountdown();
  const v = c ?? { d: 0, h: 0, m: 0, s: 0 };
  return (
    <div
      className="pointer-events-none mt-4 text-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]"
      style={{ visibility: c ? undefined : "hidden" }}
    >
      <p className="text-[13px] tracking-[.25em] opacity-80">ゲーム解禁まで</p>
      <p className="mt-1 text-[clamp(28px,7vw,44px)] font-black tabular-nums leading-none">
        あと{v.d}日 <span className="text-[0.55em] font-bold">{pad(v.h)}:{pad(v.m)}:{pad(v.s)}</span>
      </p>
    </div>
  );
}

/** 魔法陣を押したときに出る「この先は◯月◯日から」 */
export default function UnlockTeaser({ onClose }: { onClose: () => void }) {
  const c = useCountdown();
  const openedAt = useRef(0);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // 開いた直後の押し（魔法陣のダブルタップの2回目）では閉じない
  const guardedClose = () => {
    if (performance.now() - openedAt.current > 400) onClose();
  };

  useEffect(() => {
    openedAt.current = performance.now();
    closeRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden"; // 開いている間は裏のページをスクロールさせない
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") e.preventDefault(); // 押せるのは「とじる」だけ（裏へ抜けない）
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="gb-teaser fixed inset-0 z-[1300] grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={guardedClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gb-unlock-title"
    >
      <div
        className="gb-teaser-card relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/15 bg-[#07090c] px-6 py-8 text-center text-white shadow-[0_0_60px_rgba(0,200,255,.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <p className="text-xs tracking-[.35em] text-white/60">{site.title}</p>
        <h2 id="gb-unlock-title" className="mt-4 text-[clamp(20px,5vw,26px)] font-black leading-snug">
          {site.unlockLabel}より、
          <br />
          この先が見れます！
        </h2>
        {c && (
          <div className="mt-6">
            <p className="text-[12px] tracking-[.3em] text-cyan-200/80">ゲーム解禁まで</p>
            <p className="mt-1 text-[clamp(34px,9vw,48px)] font-black tabular-nums leading-none">あと{c.d}日</p>
            <p className="mt-2 text-lg font-bold tabular-nums text-white/80">
              {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
            </p>
          </div>
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={guardedClose}
          className="mt-7 rounded-full border border-white/25 px-6 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          とじる
        </button>
      </div>
      <style jsx>{`
        .gb-teaser {
          animation: gb-teaser-in 0.2s ease both;
        }
        .gb-teaser-card {
          animation: gb-teaser-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
        }
        @keyframes gb-teaser-in {
          from {
            opacity: 0;
          }
        }
        @keyframes gb-teaser-pop {
          from {
            transform: translateY(12px) scale(0.9);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .gb-teaser,
          .gb-teaser-card {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
