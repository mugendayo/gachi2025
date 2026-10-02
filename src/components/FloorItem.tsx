"use client";
// ページに「落ちている」もちもの。タップ/クリックで拾う → 持ち物欄が光る（Hero の HUD 側で演出）。
import { useState } from "react";
import { site, type ItemId } from "@/data/site";
import { acquire, useItems } from "@/lib/items";

export default function FloorItem({ id, className = "", size = 56, tilt = -18 }: { id: ItemId; className?: string; size?: number; tilt?: number }) {
  const owned = useItems();
  const [picking, setPicking] = useState(false);
  const item = site.items.find((it) => it.id === id)!;
  if (owned.includes(id) && !picking) return null;

  const pick = () => {
    if (picking) return;
    setPicking(true);
    acquire(id);
    window.setTimeout(() => setPicking(false), 520);
  };

  return (
    <button
      type="button"
      onClick={pick}
      aria-label={`${item.name}を拾う`}
      className={`gb-floor-item ${picking ? "is-picking" : ""} ${className}`}
      style={{ width: size, height: size, ["--tilt" as string]: `${tilt}deg` }}
    >
      <img src={item.img} alt="" draggable={false} />
      <style jsx>{`
        .gb-floor-item {
          position: relative;
          display: inline-grid;
          place-items: center;
          background: none;
          border: 0;
          padding: 0;
          cursor: pointer;
          transform: rotate(var(--tilt));
          filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.45));
          transition: transform 0.2s ease;
        }
        .gb-floor-item:hover {
          transform: rotate(var(--tilt)) scale(1.08);
        }
        .gb-floor-item:focus-visible {
          outline: 2px solid #ffd54a;
          outline-offset: 4px;
          border-radius: 8px;
        }
        .gb-floor-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .gb-floor-item::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 240, 160, 0.35), transparent 65%);
          animation: gb-floor-twinkle 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .gb-floor-item.is-picking {
          animation: gb-floor-pick 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes gb-floor-twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.9; }
        }
        @keyframes gb-floor-pick {
          to { transform: rotate(0deg) translateY(-60px) scale(0.3); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gb-floor-item::after { animation: none; }
          .gb-floor-item.is-picking { animation: none; opacity: 0; }
        }
      `}</style>
    </button>
  );
}
