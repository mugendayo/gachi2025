"use client";
// Discord への入口：チェック付きの小さなポップアップを経て開く（「招待されてリンクを踏んだ」状態にしない）。
// どこからでも openJoinGate() で開ける。モーダル本体は layout に1つだけ置く。
import { useEffect, useRef, useState } from "react";
import { site } from "@/data/site";

const OPEN_EVENT = "gbf:join";
export const openJoinGate = () => window.dispatchEvent(new Event(OPEN_EVENT));

export function JoinButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={openJoinGate}>
      {children}
    </button>
  );
}

export default function JoinGate() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const boxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setChecked(false);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) boxRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const go = () => {
    if (!checked) return;
    window.open(site.discordUrl, "_blank", "noopener");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="gb-gate-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="w-full max-w-[380px] rounded-xl bg-white p-5 text-[#16181b] shadow-2xl">
        <h3 id="gb-gate-title" className="mb-1.5 text-base font-bold">ガチ文高等学校の Discord へ</h3>
        <p className="mb-3 text-[13px] leading-relaxed text-[#555]">
          参加の申込内容はここで読めます。参加費は{site.paymentLabel}です。
        </p>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[#ddd] px-3 py-2.5 text-sm leading-relaxed">
          <input ref={boxRef} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-[#ff6a1a]" />
          <span>誰かに誘われたからではなく、自分で決めて入ります。</span>{/* 文言は仮（本人確定待ち） */}
        </label>
        <div className="mt-3.5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded border border-[#ccc] px-3.5 py-2 text-sm font-bold text-[#555]">やめる</button>
          <button type="button" onClick={go} disabled={!checked} className="rounded bg-[#ff6a1a] px-3.5 py-2 text-sm font-bold text-[#111] disabled:cursor-not-allowed disabled:bg-[#e6e6e0] disabled:text-[#999]">入る</button>
        </div>
      </div>
    </div>
  );
}
