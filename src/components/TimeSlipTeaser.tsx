"use client";
import { motion } from "framer-motion";

type Props = {
  imageSrc?: string;
  /** 粒子イラストのパス（例: "/effects/flake.svg"）。未指定なら内蔵SVGを使う */
  particleSrc?: string | null;
  /** 1文字ごとの遅延（大きいほどゆっくり） */
  stagger?: number;
  /** 文字アニメの開始のベース遅延 */
  baseDelay?: number;
};

export default function TimeSlipTeaser({
  imageSrc = "/effects/time-machine.png",
  particleSrc = null,
  stagger = 0.35,
  baseDelay = 0.45,
}: Props) {
  // 見出し：読点の後で自動改行（明示 \n があればそれを優先）
  const phrase = "もしも、過去に戻れたら";
  const normalized = phrase.replace(/\r\n?/g, "\n");
  const ensured = normalized.includes("\n")
    ? normalized
    : normalized.replace(/、/, (m) => m + "\n");
  const lines = ensured.split("\n");

  // 粒子の配置（画像ラッパの "相対座標%" で配置）
  // x/y は 0%〜100% が画像の範囲、負・100超で外側
  const flakes = [
    { x: -8,  y: -10, s: 56, d: 0.00, r: -12 },
    { x: 12,  y: -18, s: 38, d: 0.15, r: 8   },
    { x: 35,  y:  -8, s: 44, d: 0.30, r: -6  },
    { x: 80,  y:  -4, s: 60, d: 0.10, r: 12  },
    { x: 104, y:  12, s: 46, d: 0.25, r: -10 },
    { x: 88,  y:  36, s: 42, d: 0.05, r: 6   },
    { x: 12,  y:  28, s: 62, d: 0.20, r: -4  },
  ] as const;

  // 粒子フォールバックSVG（白い雪片の簡易形状）
  const fallbackSVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
        <g fill="white" opacity="0.9">
          <circle cx="20" cy="20" r="3"/>
          <path d="M20 4 l0 10 M20 26 l0 10 M4 20 l10 0 M26 20 l10 0
                   M8 8 l7 7 M32 32 l-7 -7 M8 32 l7 -7 M32 8 l-7 7"
                stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
        </g>
      </svg>`
    );

  return (
    <section id="timeslip" className="relative isolate overflow-visible py-20 md:py-28">
      {/* 見出し：画像より“上”に配置 */}
      <h2 className="mb-6 md:mb-8 text-center font-bold leading-[1.15] text-white drop-shadow text-[8.5vw] sm:text-5xl md:text-6xl">
        {lines.map((line, li) => (
          <span key={`ln-${li}`} className="block">
            {Array.from(line).map((ch, i) => (
              <motion.span
                key={`ch-${li}-${i}`}
                className="inline-block"
                initial={{ y: -28, opacity: 0, rotate: -6, filter: "blur(2px)" }}
                animate={{ y: 0, opacity: 1, rotate: 0, filter: "blur(0px)" }}
                transition={{
                  delay: baseDelay + li * 0.2 + i * stagger,
                  type: "spring",
                  stiffness: 250,
                  damping: 20,
                  mass: 0.7,
                }}
              >
                {/* ほんのり揺れ */}
                <motion.span
                  className="inline-block"
                  animate={{ y: [0, -2, 0] }}
                  transition={{
                    duration: 3.0,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (li * 8 + i) * 0.04,
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </motion.span>
              </motion.span>
            ))}
          </span>
        ))}
      </h2>

      {/* 画像＋粒子：画像を基準に絶対配置 */}
      <div className="relative mx-auto w-[58vw] max-w-[520px] min-w-[240px]">
        {/* タイムマシン */}
        <motion.img
          src={imageSrc}
          alt=""
          className="block w-full h-auto select-none drop-shadow-[0_12px_40px_rgba(0,200,255,.45)]"
          loading="lazy"
          draggable={false}
          initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(2px)" }}
          animate={{
            opacity: 1,
            y: [0, -8, 0, 6, 0],
            rotate: [-1.2, 0.6, -0.4, 0.4, -0.2],
            scale: 1,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 2.4,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
        />

        {/* 雪の粒子（7箇所） */}
        {flakes.map((f, idx) => (
          <motion.img
            key={idx}
            aria-hidden
            src={particleSrc ?? fallbackSVG}
            className="pointer-events-none absolute"
            style={{
              top: `${f.y}%`,
              left: `${f.x}%`,
              width: `clamp(10px, ${f.s / 2}vw, ${f.s}px)`,
              height: "auto",
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0 4px 10px rgba(255,255,255,.25))",
              opacity: 0.95,
            }}
            initial={{ opacity: 0, scale: 0.9, rotate: f.r }}
            animate={{
              opacity: [0.9, 1, 0.9],
              y: [0, -6, 0, 4, 0],
              x: [0, 2, 0, -2, 0],
              rotate: [f.r, f.r + 6, f.r - 4, f.r],
            }}
            transition={{
              delay: 0.4 + f.d,
              duration: 3.8 + (idx % 3) * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </section>
  );
}
