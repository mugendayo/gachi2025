"use client";
// フッターのさらに下の引き出し。前板に made by ThanatosGames、中に ThanatosGames の世界の絵。押すと thanatosgames.jp（新しいタブ）。
// state：pop＝いま飛び出す（バネの動き）／out＝出た状態で置くだけ。
// 前板の絵（site.assets.drawer）があるとき：木の板はその絵。名札入れと取っ手は同じ絵から切り出して少し大きく置き、名札の紙に名前を入れる。
import type { CSSProperties } from "react";
import { Cinzel } from "next/font/google";
import { site } from "@/data/site";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["700", "900"], display: "swap" });

export default function FooterDrawer({ state }: { state: "pop" | "out" }) {
  const art = site.assets.drawer;
  return (
    <div className={`cf-slot ${state === "pop" ? "is-pop" : "is-out"}`}>
      <a
        href={site.rewardUrl}
        target="_blank"
        rel="noopener"
        className={`cf-drawer ${cinzel.className}`}
        aria-label="made by ThanatosGames（thanatosgames.jp へ）"
      >
        <span className="cf-inside" aria-hidden>
          <span className="cf-inside-art" />
        </span>
        {art ? (
          <span className="cf-front has-art" style={{ "--cf-art": `url(${art})` } as CSSProperties}>
            <span className="cf-patch" aria-hidden />
            <span className="cf-hw">
              <span className="cf-credit-made">made by</span>
              <span className="cf-plate">
                <span className="cf-paper">
                  <span className="cf-credit-name">ThanatosGames</span>
                </span>
              </span>
              <span className="cf-credit-url">thanatosgames.jp ↗</span>
              <span className="cf-handle" aria-hidden />
            </span>
          </span>
        ) : (
          <span className="cf-front">
            <span className="cf-label">
              <span className="cf-credit-made">made by</span>
              <span className="cf-credit-name">ThanatosGames</span>
              <span className="cf-credit-url">thanatosgames.jp ↗</span>
            </span>
            <span className="cf-pull" aria-hidden />
          </span>
        )}
      </a>
    </div>
  );
}
