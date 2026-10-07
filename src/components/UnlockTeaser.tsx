"use client";
// ゲーム解禁前の「お預け」。魔法陣を押しても生徒証の演出には進まず、解禁日時とカウントダウンだけを見せる。
// 解禁時刻（site.unlockAt）を過ぎると Hero 側でこのお預けは自動で外れる。
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { site } from "@/data/site";

const UNLOCK_TS = Date.parse(site.unlockAt);
/** 黒板の世界時計と同じ「いま」（?t= と配信元の時刻の補正を共有する） */
const nowMs = () => Date.now() + (typeof window !== "undefined" ? window.__kbOffset ?? 0 : 0);
export const isLockedNow = () => nowMs() < UNLOCK_TS;
export const msUntilUnlock = () => UNLOCK_TS - nowMs();

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

/** 魔法陣の下に出す小さな表示：「ゲーム解禁まで あと◯日」 */
export function UnlockCountdownBadge() {
  const c = useCountdown();
  if (!c) return null;
  return (
    <div className="pointer-events-none mt-4 text-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]">
      <p className="text-[13px] tracking-[.25em] opacity-80">ゲーム解禁まで</p>
      <p className="mt-1 text-[clamp(28px,7vw,44px)] font-black tabular-nums leading-none">
        あと{c.d}日 <span className="text-[0.55em] font-bold">{pad(c.h)}:{pad(c.m)}:{pad(c.s)}</span>
      </p>
    </div>
  );
}

/** 魔法陣を押したときに出る「この先は◯月◯日から」 */
export default function UnlockTeaser({ onClose }: { onClose: () => void }) {
  const c = useCountdown();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gb-unlock-title"
    >
      <motion.div
        className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/15 bg-[#07090c] px-6 py-8 text-center text-white shadow-[0_0_60px_rgba(0,200,255,.25)]"
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
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
            <p className="mt-1 text-[clamp(34px,9vw,48px)] font-black tabular-nums leading-none">
              あと{c.d}日
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums text-white/80">
              {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
            </p>
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-7 rounded-full border border-white/25 px-6 py-2 text-sm text-white/80 hover:bg-white/10">
          とじる
        </button>
      </motion.div>
    </motion.div>
  );
}
