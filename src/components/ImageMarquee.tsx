"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

export type MarqueeImage = { src: string; alt?: string };

type Props = {
  images: MarqueeImage[];
  /** 1周にかける秒数（大きいほどゆっくり） */
  duration?: number;            // default 28
  /** サムネ高さ（Tailwindクラス） */
  heightClass?: string;         // default "h-28 md:h-32"
  /** 画像間のすき間（Tailwindクラス） */
  gapClass?: string;            // default "gap-2 md:gap-3"
  /** ホバーで一時停止 */
  pauseOnHover?: boolean;       // default true
  /** 左右のフェードマスクを表示 */
  edgeFade?: boolean;           // default true
  /** 角丸・枠の有無（Nintendo風） */
  framed?: boolean;             // default true
};

// ImageMarquee.tsx
export default function ImageMarquee({
  images,
  duration = 28,
  heightClass = "h-28 md:h-32",
  gapClass = "gap-2 md:gap-3",
  pauseOnHover = true,
  edgeFade = true,
  framed = true,
  respectReducedMotion = true,          // ← 追加: 既定は尊重する
}: Props & { respectReducedMotion?: boolean }) {
  const reducedByOS = useReducedMotion();
  const shouldReduce = respectReducedMotion ? reducedByOS : false; // ← ここで強制OFF可

  // 無限ループ化のために2回並べる
  const loop = useMemo(() => [...images, ...images], [images]);

  return (
    <div
      className={[
        "relative w-full overflow-hidden",
        "-mx-[calc(50vw-50%)]", // フルブリード
        "bg-transparent",       // セクションの背景をそのまま見せる
      ].join(" ")}
      aria-label="過去のガチ文化祭フォト・マルチ横スクロール"
    >
      {/* フレーム（任意） */}
      {framed && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/25" />
        </div>
      )}

      {/* マスク（端フェード） */}
      {edgeFade && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-24 md:w-36 z-10
                          bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-24 md:w-36 z-10
                          bg-gradient-to-l from-black/40 via-black/10 to-transparent" />
        </>
      )}

      {/* 実トラック：2倍並べて x を 0→-50% に */}
      <motion.div
        className={`flex ${gapClass} w-max will-change-transform`}
        animate={
          shouldReduce
            ? undefined
            : { translateX: ["0%", "-50%"] }
        }
        transition={
          shouldReduce
            ? undefined
            : { duration, ease: "linear", repeat: Infinity }
        }
        // ホバーで一時停止
        style={pauseOnHover ? { animationPlayState: "running" } : undefined}
        onMouseEnter={(e) => {
          if (!pauseOnHover || shouldReduce) return;
          (e.currentTarget as HTMLDivElement).style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          if (!pauseOnHover || shouldReduce) return;
          (e.currentTarget as HTMLDivElement).style.animationPlayState = "running";
        }}
      >
        {loop.map((img, i) => (
          <div
            key={`${i}-${img.src}`}
            className={[
              "relative overflow-hidden flex-shrink-0",
              heightClass,
              "aspect-[16/9]",        // サムネ比率（必要に応じて変更可）
              framed ? "rounded md:rounded-[10px]" : "",
              "ring-1 ring-white/10",
            ].join(" ")}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
