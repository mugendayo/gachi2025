// components/SummonCTA.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 豪華版 SummonCTA
 * FF召喚風の円陣エフェクト＋ルーン＋粒子＋レンズフレア
 */
export default function SummonCTA({
  label = "今すぐエントリー",
  onClick = () => {},
  autoShowAfterMs = 1000,
}: {
  label?: string;
  onClick?: () => void;
  autoShowAfterMs?: number;
}) {
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    const t = setTimeout(() => setShow(true), autoShowAfterMs);
    return () => {
      clearTimeout(t);
      mq.removeEventListener?.("change", handler);
    };
  }, [autoShowAfterMs]);

  return (
    <div className="relative w-full flex items-center justify-center py-8 sm:py-12">
      <AnimatePresence>
        {show && (
           <motion.button
             initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
             animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
             exit={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
             transition={{ duration: 0.6, ease: "easeOut" }}
             onClick={onClick}
             aria-label={label}
            className="relative group select-none cursor-pointer"
          >
            <div className="relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[360px] md:h-[360px] lg:w-[420px] lg:h-[420px] xl:w-[480px] xl:h-[480px] filter transition duration-500 group-hover:saturate-0 group-hover:brightness-125 group-hover:contrast-110">
              {/* 外周オーラ */}
             <div className="absolute inset-[-28%] rounded-full bg-[radial-gradient(circle,rgba(80,255,180,0.40)_0%,rgba(0,200,150,0.25)_50%,transparent_80%)] blur-3xl pointer-events-none" />
              {/* 中央ブルーム */}
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,255,220,0.55)_0%,rgba(120,255,200,0.20)_40%,rgba(0,0,0,0)_65%)] transition duration-500 group-hover:scale-105 group-hover:opacity-95 opacity-80 mix-blend-screen" />
              {/* ホバー時：白寄りオーラで全体トーンを明るく */}
               <div className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.22)_45%,transparent_80%)] opacity-0 group-hover:opacity-80 transition duration-500 mix-blend-screen pointer-events-none" />

              {/* 召喚陣SVG */}
              <Sigil reduced={reduced} />
              {/* シャイン（左→右へ一閃） */}
              <div className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
                <div className="shine-mask absolute inset-[-12%] rounded-full">
                    <div className="shine-line absolute inset-0" />
                </div>
            　 </div>
              {/* 粒子エフェクト */}
              <Particles reduced={reduced} />
              {/* CTA文字 */}
               <div className="absolute inset-0 grid place-items-center">
                <span className="rounded-full text-white/95 tracking-widetext-base sm:text-lg md:text-2xl lg:text-3xl px-4 py-2 md:px-6 md:py-3 backdrop-blur-[2px] bg-white/10 ring-1 ring-white/30 shadow-[0_0_40px_rgba(255,255,255,0.35)] group-hover:shadow-[0_0_72px_rgba(255,255,255,0.5)] transition">
                  {label}
                </span>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* defsやkeyframesをグローバルで一括定義 */}
      <svg className="absolute w-0 h-0" aria-hidden>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ringGrad" r="80%">
            <stop offset="20%" stopColor="#b6ffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#7de1ff" stopOpacity="0.65" />
            <stop offset="95%" stopColor="#00c6ff" stopOpacity="0.0" />
          </radialGradient>
        </defs>
      </svg>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg) }
          to   { transform: rotate(360deg) }
        }
        @keyframes spin-rev {
          from { transform: rotate(0deg) }
          to   { transform: rotate(-360deg) }
        }
        @keyframes pulse-soft {
          0%,100% { transform: scale(1); opacity:.9 }
          50% { transform: scale(1.04); opacity: 1 }
        }
        @keyframes floaty {
          0% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
          100% { transform: translateY(0) }
        }
        @keyframes flare {
          0%   { transform: translate(-50%,-50%) rotate(25deg) translateX(-180%); opacity: 0 }
          35%  { opacity: .85 }
          100% { transform: translate(-50%,-50%) rotate(25deg) translateX(180%); opacity: 0 }
        }
        .animate-flare { animation: flare 1.25s ease-in-out both; }
        .sigil-spin { animation: spin-slow 18s linear infinite; }
        .sigil-rev  { animation: spin-rev  22s linear infinite; }
        .sigil-pulse { animation: pulse-soft 3.2s ease-in-out infinite; }
        .floaty { animation: floaty 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sigil-spin, .sigil-rev, .sigil-pulse, .floaty, .animate-flare {
            animation: none !important;
          }
        }
          /* シャイン一閃 */
        @keyframes shine-sweep {
        0%   { transform: translateX(-120%); opacity: 0 }
        10%  { opacity: .85 }
        100% { transform: translateX(120%); opacity: 0 }
        }

        /* シャイン要素の見た目（細いハイライト＋広がるグロー） */
        .shine-mask {
        /* 円外にも少しはみ出させて自然な抜けを作る */
        }

        .shine-line {
        background: linear-gradient(120deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.0) 40%,
            rgba(255,255,255,0.85) 50%,
            rgba(255,255,255,0.0) 60%,
            rgba(255,255,255,0) 100%);
        filter: blur(4px);
        width: 120%;
        height: 120%;
        left: -10%;
        top: -10%;
        transform: translateX(-120%);
        opacity: 0;
        }

        /* ホバー中だけ1回走る */
        .group:hover .shine-line {
        animation: shine-sweep 1.05s ease-out both;
        }

        /* さらに薄い外側グローを重ねたい場合（任意）
        .group:hover .shine-line::after { ... } */

        /* reduced motion では無効化 */
        @media (prefers-reduced-motion: reduce) {
        .group:hover .shine-line { animation: none !important; }
        }

      `}</style>
    </div>
  );
}

/** 召喚陣SVG部分 */
function Sigil({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0" role="img" aria-label="magic-sigil">
      <g filter="url(#glow)">
        <circle cx="50" cy="50" r="47" fill="url(#ringGrad)" opacity="0.35" />
      </g>
      <g className="sigil-rev" opacity={0.92}>
        <path id="runePath" d="M50,50 m-39,0 a39,39 0 1,1 78,0 a39,39 0 1,1 -78,0" fill="none" />
        <text fontSize="4.2" letterSpacing="2.4" fill="#eaffff">
          <textPath href="#runePath">
            GACHI·CULTURE·FES·2025·TIMESLIP·THANATOSGAMES·無限·
          </textPath>
        </text>
      </g>
      <g className="sigil-spin" opacity={0.75}>
        <circle cx="50" cy="50" r="31" fill="none" stroke="#e0ffff" strokeWidth="0.6" strokeOpacity="0.9" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="white" strokeWidth="0.6" strokeOpacity="0.8" strokeDasharray="0.5 0.9" />
      </g>
      <g className="sigil-pulse" opacity={0.9}>
        <polygon points="50,22 56,50 50,78 44,50" fill="#ffffff" opacity="0.08" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="#bff" strokeWidth="0.5" strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="8"  fill="white" opacity="0.08" />
      </g>
      <radialGradient id="core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="45%" stopColor="#cfffff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#8ae9ff" stopOpacity="0" />
      </radialGradient>
      <circle cx="50" cy="50" r="16" fill="url(#core)" className="floaty" />
    </svg>
  );
}

/** 粒子 */
function Particles({ reduced }: { reduced: boolean }) {
  const count = reduced ? 0 : 28;
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const delay = (i % 7) * 0.6;
        const size = 2 + (i % 3);
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        return (
          <span
            key={i}
            className="absolute bg-white/80 rounded-full blur-[0.6px]"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              animation: `floaty ${4 + (i % 5)}s ease-in-out ${delay}s infinite`,
              opacity: 0.8,
              boxShadow: "0 0 8px rgba(255,255,255,.75)",
            }}
          />
        );
      })}
    </div>
  );
}
