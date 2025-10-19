"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

/** スライド型（そのまま使えます） */
export type Slide = {
  src: string;
  caption?: string; // ← 例: "2019 後夜祭"（右上バッジに表示）
  alt?: string;
  href?: string;    // 付けたい場合だけ
};

/**
 * シンプルスライダー
 * - 画像のアスペクト比を統一（デフォ 16:9）
 * - キャプションは画像の右上「バッジ」として重ね表示
 * - 画像は object-cover でクロップ（サイズが違っても綺麗に揃う）
 */
export function SimpleSlider({
  slides,
  aspect = "16/9",          // "16/9" | "4/3" | "1/1" | "21/9" など
  rounded = "rounded-2xl",  // 角の丸みを変えたい場合
}: {
  slides: Slide[];
  aspect?: string;
  rounded?: string;
}) {
  const [index, setIndex] = useState(0);

  const to = useCallback(
    (n: number) => {
      if (!slides.length) return;
      const len = slides.length;
      setIndex(((n % len) + len) % len);
    },
    [slides.length]
  );

  const prev = () => to(index - 1);
  const next = () => to(index + 1);
  const go = (i: number) => () => to(i);

  // CSSの aspect-ratio に渡すため "16/9" → "16 / 9" に
  const aspectStyle = { aspectRatio: aspect.replace("/", " / ") };

  const slide = slides[index];

  return (
    <div className={`relative w-full ${rounded} overflow-hidden bg-white shadow-sm`}>
      {/* 表示枠：比率固定 */}
      <div
        className="relative w-full bg-slate-100"
        style={aspectStyle}
      >
        {/* 画像（比率は枠で固定／中身はcoverで切り抜き） */}
        {slide?.href ? (
          <a href={slide.href} target="_blank" rel="noreferrer" className="absolute inset-0">
            <Image
              src={slide.src}
              alt={slide.alt || slide.caption || ""}
              fill
              sizes="100vw"
              className="object-cover select-none"
              priority={false}
            />
          </a>
        ) : (
          <Image
            src={slide?.src || ""}
            alt={slide?.alt || slide?.caption || ""}
            fill
            sizes="100vw"
            className="object-cover select-none"
            priority={false}
          />
        )}

        {/* 右上のバッジ（キャプション） */}
        {slide?.caption && (
          <span
            className="
              absolute right-3 top-3 z-20
              inline-flex items-center
              rounded-full px-3 py-1.5
              text-xs md:text-sm font-extrabold text-white
              ring-2 ring-white/70
              bg-gradient-to-r from-sky-500 to-blue-600
              shadow-[0_12px_28px_rgba(0,0,0,.22)]
            "
          >
            {slide.caption}
          </span>
        )}

        {/* ナビボタン */}
        <button
          aria-label="前へ"
          onClick={prev}
          className="
            absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
            h-10 w-10 md:h-11 md:w-11 rounded-full
            bg-white/85 hover:bg-white shadow-lg
            ring-1 ring-black/10
            transition
          "
        >
          ‹
        </button>
        <button
          aria-label="次へ"
          onClick={next}
          className="
            absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
            h-10 w-10 md:h-11 md:w-11 rounded-full
            bg-white/85 hover:bg-white shadow-lg
            ring-1 ring-black/10
            transition
          "
        >
          ›
        </button>
      </div>

      {/* ドットインジケーター（下中央） */}
      <div className="flex items-center justify-center gap-2 py-3">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`スライド ${i + 1}`}
            onClick={go(i)}
            className={[
              "h-2.5 rounded-full transition-all",
              i === index ? "w-6 bg-blue-600" : "w-2.5 bg-slate-300 hover:bg-slate-400",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
