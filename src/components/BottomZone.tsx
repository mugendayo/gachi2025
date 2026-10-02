"use client";
// 最下部：注意書き「落ちている鍵は拾わないこと」の横に、地下室の鍵が落ちている。
// もちものが3つ揃うと、ここに ThanatosGames（thanatosgames.jp）へのリンクが出る。
import { useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { allCollected, useItems } from "@/lib/items";
import FloorItem from "./FloorItem";

export default function BottomZone() {
  const owned = useItems();
  const done = allCollected(owned);
  const [flash, setFlash] = useState(false);
  const prev = useRef<boolean | null>(null);

  useEffect(() => {
    if (prev.current === false && done) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 900);
      return () => window.clearTimeout(t);
    }
    prev.current = done;
  }, [done]);

  return (
    <section aria-label="最下部" className="relative overflow-hidden bg-[#0d0f12] px-4 py-14 text-white">
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-8 md:flex-row md:items-end md:justify-center md:gap-14">
        {/* 注意書き（〔仮〕＝PRの注意書き画像の体裁を文字で） */}
        <div className="w-[min(300px,80vw)] rotate-[-1.5deg] rounded-sm bg-[#f1ece2] text-[#1b1b1b] shadow-[0_10px_30px_rgba(0,0,0,.5)]">
          <div className="bg-[#c62828] px-4 py-1.5 text-center text-xl font-black tracking-[.3em] text-white">注意</div>
          <p className="px-5 py-5 text-center text-[22px] font-black leading-snug">落ちている鍵は<br />拾わないこと</p>
          <p className="pb-3 pr-4 text-right text-xs">教務主任</p>
        </div>

        <div className="grid min-h-[120px] place-items-center">
          {done ? (
            <a href={site.rewardUrl} target="_blank" rel="noopener" aria-label="ThanatosGames へ" className="relative grid place-items-center">
              {flash && <span aria-hidden className="absolute inset-[-40px] animate-ping rounded-full bg-white/40" />}
              <img src="/icons/thg.png" alt="ThanatosGames" className="relative w-[min(56vw,220px)] drop-shadow-[0_10px_28px_rgba(0,0,0,.5)]" draggable={false} />
            </a>
          ) : (
            <FloorItem id="key" size={64} tilt={24} />
          )}
        </div>
      </div>
    </section>
  );
}
