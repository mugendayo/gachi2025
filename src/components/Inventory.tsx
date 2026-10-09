"use client";
// もちもの欄。1つ目を拾うまで出さない。持っているものだけを並べる（空き枠・「n/3」は出さない）。
// 拾った瞬間、その1つが光る。
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/data/site";
import { ITEM_EVENT, useItems } from "@/lib/items";

export default function Inventory() {
  const owned = useItems();
  const [glow, setGlow] = useState<string | null>(null);

  useEffect(() => {
    // 続けて拾ったとき、前の1つの消える合図で次の光が早く消えないよう、合図は1つだけ持つ
    let timer = 0;
    const onItem = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as string | undefined;
      if (!id) return;
      setGlow(id);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setGlow(null), 1000);
    };
    window.addEventListener(ITEM_EVENT, onItem);
    return () => {
      window.removeEventListener(ITEM_EVENT, onItem);
      window.clearTimeout(timer);
    };
  }, []);

  const have = site.items.filter((it) => owned.includes(it.id));

  // もちもの欄がある間だけ、ページの最下部（フッターのリンク）が欄に隠れないよう余白を足す
  useEffect(() => {
    document.body.classList.toggle("has-inv", have.length > 0);
    return () => document.body.classList.remove("has-inv");
  }, [have.length]);

  if (!have.length) return null;

  // body の直下に出す（3つ揃った瞬間の揺れに巻き込まれて画面外へ飛ばないように）
  return createPortal(
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
        /* スマホ：欄の高さを PC の約 7 割に詰める（56px → 38px）。
           縦書きの「もちもの」は欄の高さを決めてしまうので横書きにして左に置く。
           枠は小さくなる分、細い縁を足して形が見えるようにする */
        @media (max-width: 699px) {
          .gb-inv {
            left: calc(8px + env(safe-area-inset-left));
            bottom: calc(8px + env(safe-area-inset-bottom));
            gap: 6px;
            padding: 4px 4px 4px 8px;
            border-radius: 9px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          }
          .gb-inv-label {
            font-size: 10px;
            letter-spacing: 0.1em;
            writing-mode: horizontal-tb;
            line-height: 1;
            white-space: nowrap; /* 日本語は1字ずつ折り返せるので、欄が縮んでも1行のまま */
          }
          ul {
            gap: 4px;
          }
          li {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
          }
          /* 細い縁（inset）を先頭に残したまま光を足す：並びがそろうので光が消えるときもなめらかに変わる */
          li.is-glow {
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 0 0 2px #ffd54a,
              0 0 16px rgba(255, 213, 74, 0.9);
          }
          img {
            width: 88%;
            height: 88%;
          }
        }
        /* 動きを減らす設定でも、拾った1つが小さく弾んで光る動きは止めない（欄の中の1枠だけの手応え） */
      `}</style>
      <style jsx global>{`
        body.has-inv {
          padding-bottom: calc(84px + env(safe-area-inset-bottom));
          background: #111; /* フッターと同じ色で余白をつなぐ */
        }
        /* スマホは欄が低い（下から 8px＋高さ 38px）ので、余白もそのぶん詰める */
        @media (max-width: 699px) {
          body.has-inv {
            padding-bottom: calc(62px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </aside>,
    document.body,
  );
}
