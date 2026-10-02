"use client";
// もちものが3つ揃うと現れるセクション（最下部の注意書きとフッターの LIBRARY のあいだ）。
// 揃った瞬間：画面が白く光って揺れ → 闇に一筋の裂け目が開き、向こうに ThanatosGames の世界が見える（チラリズム）。
// 裂け目に触れると大きく開く（大胆）。リンク＝made by ThanatosGames → thanatosgames.jp
import { useEffect, useRef, useState } from "react";
import { Cinzel } from "next/font/google";
import { site } from "@/data/site";
import { allCollected, useItems } from "@/lib/items";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["700", "900"], display: "swap" });

type Phase = "hidden" | "burst" | "open";

export default function RewardSection() {
  const owned = useItems();
  const done = allCollected(owned);
  const [phase, setPhase] = useState<Phase>("hidden");
  const prev = useRef<boolean | null>(null);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = done;
    if (!done) {
      setPhase("hidden");
      return;
    }
    // 読み込み時にすでに揃っていた → 開いた状態で置くだけ
    if (before === null || before === true) {
      setPhase("open");
      return;
    }
    // いま揃った → 演出
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("open");
      return;
    }
    setPhase("burst");
    document.documentElement.classList.add("gb-quake");
    const t1 = window.setTimeout(() => document.documentElement.classList.remove("gb-quake"), 650);
    const t2 = window.setTimeout(() => {
      setPhase("open");
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.documentElement.classList.remove("gb-quake");
    };
  }, [done]);

  if (phase === "hidden") return null;

  return (
    <>
      {phase === "burst" && <div aria-hidden className="gb-burst" />}
      <section ref={ref} aria-label="made by ThanatosGames" className={`gb-reward ${phase === "open" ? "is-open" : ""}`}>
        <a href={site.rewardUrl} target="_blank" rel="noopener" className="gb-rift" aria-label="made by ThanatosGames（thanatosgames.jp へ）">
          <span className="gb-rift-bg" aria-hidden />
          <span className="gb-rift-edge gb-rift-edge-top" aria-hidden />
          <span className="gb-rift-edge gb-rift-edge-bottom" aria-hidden />
        </a>
        <a href={site.rewardUrl} target="_blank" rel="noopener" className={`gb-credit ${cinzel.className}`}>
          <span className="gb-credit-made">made by</span>
          <span className="gb-credit-name">ThanatosGames</span>
          <span className="gb-credit-url">thanatosgames.jp ↗</span>
        </a>
      </section>

      <style jsx global>{`
        html.gb-quake body { animation: gb-quake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes gb-quake {
          10%, 90% { transform: translate3d(-2px, 1px, 0); }
          20%, 80% { transform: translate3d(4px, -2px, 0); }
          30%, 50%, 70% { transform: translate3d(-7px, 3px, 0); }
          40%, 60% { transform: translate3d(7px, -3px, 0); }
        }
        .gb-burst {
          position: fixed; inset: 0; z-index: 3000; pointer-events: none;
          background: radial-gradient(circle at 50% 70%, #fff 0%, rgba(255,255,255,.85) 35%, rgba(120,200,255,.25) 70%, transparent 100%);
          animation: gb-burst 0.7s ease-out forwards;
        }
        @keyframes gb-burst { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
      <style jsx>{`
        .gb-reward {
          position: relative;
          height: clamp(340px, 62vh, 560px);
          background: #05070b;
          overflow: hidden;
        }
        /* 裂け目：最初は閉じた一本の線 → 開くと帯（チラリズム）→ 触れると大きく開く（大胆） */
        .gb-rift {
          position: absolute; inset: 0; display: block;
          clip-path: inset(50% 0 50% 0);
          transition: clip-path 1.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gb-reward.is-open .gb-rift { clip-path: inset(36% 0 36% 0); }
        .gb-reward.is-open .gb-rift:hover,
        .gb-reward.is-open .gb-rift:focus-visible,
        .gb-reward.is-open:has(.gb-credit:hover) .gb-rift { clip-path: inset(4% 0 4% 0); }
        .gb-rift-bg {
          position: absolute; inset: -6%;
          background: url(/reward/worldmap.webp) center / cover no-repeat;
          animation: gb-pan 26s ease-in-out infinite alternate;
          filter: saturate(1.15) contrast(1.05);
        }
        @keyframes gb-pan {
          from { transform: scale(1.18) translate3d(-4%, 1%, 0); }
          to { transform: scale(1.18) translate3d(4%, -1%, 0); }
        }
        .gb-rift-edge {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #bfe9ff 20%, #fff 50%, #bfe9ff 80%, transparent);
          box-shadow: 0 0 18px 4px rgba(150, 220, 255, 0.7);
          opacity: 0.9;
        }
        .gb-rift-edge-top { top: 0; }
        .gb-rift-edge-bottom { bottom: 0; }
        .gb-credit {
          position: absolute; left: 50%; bottom: 7%;
          transform: translate(-50%, 16px);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          color: #f4ead2; text-decoration: none; text-align: center;
          opacity: 0;
          transition: opacity 0.8s ease 0.9s, transform 0.8s ease 0.9s;
        }
        .gb-reward.is-open .gb-credit { opacity: 1; transform: translate(-50%, 0); }
        .gb-credit-made { font-size: clamp(12px, 1.6vw, 15px); letter-spacing: 0.4em; color: #a9b3c2; text-transform: lowercase; }
        .gb-credit-name {
          font-size: clamp(30px, 6.4vw, 64px); font-weight: 900; letter-spacing: 0.04em; line-height: 1.05;
          background: linear-gradient(180deg, #fff6d6 0%, #f2c75c 45%, #b8862b 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.8));
        }
        .gb-credit-url { font-size: 12px; letter-spacing: 0.2em; color: #8fa0b5; margin-top: 4px; }
        .gb-credit:hover .gb-credit-url, .gb-credit:focus-visible .gb-credit-url { color: #fff; }
        .gb-credit:focus-visible, .gb-rift:focus-visible { outline: 2px solid #f2c75c; outline-offset: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .gb-rift { transition: none; }
          .gb-rift-bg { animation: none; transform: scale(1.1); }
          .gb-credit { transition: none; }
        }
      `}</style>
    </>
  );
}
