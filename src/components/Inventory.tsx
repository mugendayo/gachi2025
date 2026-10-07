"use client";
// もちもの欄。1つ目を拾うまで出さない。持っているものだけを並べる（空き枠・「n/3」は出さない）。
// 拾った瞬間、その1つが光る。
import { useEffect, useState } from "react";
import { site } from "@/data/site";
import { ITEM_EVENT, useItems } from "@/lib/items";

export default function Inventory() {
  const owned = useItems();
  const [glow, setGlow] = useState<string | null>(null);

  useEffect(() => {
    const onItem = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as string | undefined;
      if (!id) return;
      setGlow(id);
      window.setTimeout(() => setGlow(null), 1000);
    };
    window.addEventListener(ITEM_EVENT, onItem);
    return () => window.removeEventListener(ITEM_EVENT, onItem);
  }, []);

  const have = site.items.filter((it) => owned.includes(it.id));
  if (!have.length) return null;

  return (
    <aside className="gb-inv" aria-label="もちもの">
      <p className="gb-inv-label">もちもの</p>
      <ul>
        {have.map((it) => (
          <li key={it.id} className={glow === it.id ? "is-glow" : undefined} title={it.name}>
            <img src={it.img} alt={it.name} />
          </li>
        ))}
      </ul>
      <style jsx>{`
        .gb-inv {
          position: fixed;
          z-index: 80;
          left: calc(12px + env(safe-area-inset-left));
          bottom: calc(12px + env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px 6px 10px;
          border-radius: 12px;
          background: rgba(17, 17, 17, 0.82);
          backdrop-filter: blur(6px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          color: #f4f4f2;
        }
        .gb-inv-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          opacity: 0.75;
          writing-mode: vertical-rl;
        }
        ul {
          display: flex;
          gap: 6px;
        }
        li {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.08);
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }
        li.is-glow {
          background: rgba(255, 230, 140, 0.3);
          box-shadow: 0 0 0 2px #ffd54a, 0 0 22px rgba(255, 213, 74, 0.9);
          animation: gb-inv-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        img {
          width: 84%;
          height: 84%;
          object-fit: contain;
        }
        @keyframes gb-inv-pop {
          from {
            transform: scale(0.4);
          }
          to {
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          li.is-glow {
            animation: none;
          }
        }
      `}</style>
    </aside>
  );
}
