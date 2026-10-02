"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { site } from "@/data/site";

/* 描画ごとに変わらない揺らぎ（SSR とクライアントで一致させる） */
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/* ========= 手書き見出し ========= */
function ChalkHeading({ text }: { text: string }) {
  return (
    <h3 className="font-chalk leading-relaxed mb-2 text-left text-[clamp(28px,5.2vw,100px)]">
      {text.split("").map((char, i) => {
        const r = (rnd(i + text.length * 7, 1) - 0.5) * 8;
        const x = (rnd(i + text.length * 7, 2) - 0.5) * 6;
        const y = (rnd(i + text.length * 7, 3) - 0.5) * 6;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translate(${x}px, ${y}px) rotate(${r}deg)`,
              marginRight: char === " " ? "0.6em" : "0.1em",
              textShadow: "0 0 8px rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.35)",
            }}
          >
            {char}
          </span>
        );
      })}
    </h3>
  );
}

/* ========= 手書き本文（サイズUP済み） ========= */
function ChalkText({ text }: { text: string }) {
  return (
    <p className="text-white font-chalk leading-relaxed text-left text-[clamp(18px,2vw,36px)] font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
      {text.split("").map((char, i) => {
        const r = (rnd(i + text.length * 7, 4) - 0.5) * 6;
        const y = (rnd(i + text.length * 7, 5) - 0.5) * 4;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `rotate(${r}deg) translateY(${y}px)`,
              marginRight: char === " " ? "0.5em" : "0.05em",
              textShadow: "0 0 6px rgba(0,0,0,.3), 0 1px 6px rgba(0,0,0,.3)",
            }}
          >
            {char}
          </span>
        );
      })}
    </p>
  );
}

/* ========= スワイプ誘導：チョークで描かれる矢印＋テキスト ========= */
function ChalkArrowHint() {
  return (
    <div
      className="pointer-events-none absolute top-1/2 right-2 md:right-6 -translate-y-1/2 z-40"
      aria-hidden
    >
      {/* ★ 追加：チョーク文字の案内 */}
      <div className="absolute -top-8 right-[6px] md:right-[10px] translate-y-[-100%] text-right">
        <div
          className={[
            "font-chalk text-white/95 drop-shadow-[0_0_6px_rgba(0,0,0,.35)]",
            "text-[clamp(14px,2.4vw,22px)] leading-tight tracking-[.04em]",
            "chalk-write chalk-wiggle inline-block px-2 py-1 rounded-sm",
          ].join(" ")}
          style={{
            textShadow:
              "0 0 6px rgba(0,0,0,.35), 0 1px 6px rgba(0,0,0,.30), 0 0 18px rgba(255,255,255,.18)",
          }}
        >
          <span className="block">スワイプで</span>
          <span className="block">次の日</span>
        </div>
      </div>

      {/* 既存：チョーク矢印 */}
      <svg
        width="clamp(90px,10vw,160px)"
        height="clamp(110px,20vw,260px)"
        viewBox="0 0 160 260"
        fill="none"
        className="opacity-95"
      >
        <path
          d="M150 20 L40 20 L40 5 L10 30 L40 55 L40 40 L150 40
             M150 110 L40 110 L40 95 L10 120 L40 145 L40 130 L150 130
             M150 200 L40 200 L40 185 L10 210 L40 235 L40 220 L150 220"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "blur(1px)" }}
        />
        <path
          d="M150 20 L40 20 L40 5 L10 30 L40 55 L40 40 L150 40
             M150 110 L40 110 L40 95 L10 120 L40 145 L40 130 L150 130
             M150 200 L40 200 L40 185 L10 210 L40 235 L40 220 L150 220"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chalk-draw"
        />
      </svg>

      <style jsx>{`
        /* 既存：矢印の描画アニメ */
        @keyframes chalk-draw {
          0% { stroke-dashoffset: 1200; opacity: .85; }
          60% { stroke-dashoffset: 0; opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: .85; }
        }
        .chalk-draw {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: chalk-draw 2.8s ease-in-out infinite;
          filter: drop-shadow(0 0 6px rgba(255,255,255,.35));
        }

        /* ★追加：チョーク文字が左→右に書かれていく */
        @keyframes chalk-write-kf {
          0%   { clip-path: inset(0 100% 0 0); opacity: .8; }
          65%  { clip-path: inset(0 0% 0 0); opacity: 1; }
          100% { clip-path: inset(0 0% 0 0); opacity: .95; }
        }
        .chalk-write {
          clip-path: inset(0 100% 0 0);
          animation: chalk-write-kf 1.8s cubic-bezier(0.16,1,0.3,1) .2s both;
          background: transparent;
        }

        /* ★追加：ほんのりプルプル（手書き感） */
        @keyframes chalk-wiggle-kf {
          0%   { transform: rotate(-0.4deg) translateY(0px); }
          50%  { transform: rotate(0.5deg) translateY(-0.6px); }
          100% { transform: rotate(-0.4deg) translateY(0px); }
        }
        .chalk-wiggle {
          animation: chalk-wiggle-kf 2.6s ease-in-out 2.2s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .chalk-draw { animation: none; stroke-dashoffset: 0; }
          .chalk-write, .chalk-wiggle { animation: none; clip-path: none; }
        }
      `}</style>
    </div>
  );
}


/* ========= ロック演出タイル（左上鍵＋ホバー暗転・クリック不可） ========= */
/* ========= スケジュールデータ ========= */
const EASE = [0.16, 1, 0.3, 1] as const;

const schedules = site.days.map((d) => ({
  key: d.key,
  heading: `${d.date} ${d.countdown}`,
  items: d.items as readonly { time: string; label: string; smudged?: boolean }[],
  youtubeId: d.youtubeId,
  anomaly: "anomaly" in d && d.anomaly,
}));
/* ========= 異変：かすれて読めない予定・青い手形 ========= */
function SmudgedLine({ time }: { time: string }) {
  return (
    <p className="font-chalk text-left text-[clamp(18px,2vw,36px)] font-semibold text-white/90">
      {time}　<span className="inline-block align-middle h-[0.9em] w-[7em] rounded-sm bg-white/25 blur-[3px]" aria-label="（かすれて読めない）" />
    </p>
  );
}
function BlueHand() {
  return (
    <svg aria-hidden viewBox="0 0 100 120" className="pointer-events-none absolute right-[6%] top-[38%] w-[90px] md:w-[130px] rotate-[14deg] opacity-80" fill="#1d3fbf">
      <ellipse cx="50" cy="72" rx="26" ry="28" />
      <rect x="22" y="22" width="11" height="44" rx="5.5" transform="rotate(-12 27 44)" />
      <rect x="36" y="10" width="11" height="52" rx="5.5" transform="rotate(-4 41 36)" />
      <rect x="51" y="8" width="11" height="54" rx="5.5" transform="rotate(4 56 35)" />
      <rect x="65" y="16" width="11" height="48" rx="5.5" transform="rotate(12 70 40)" />
      <rect x="74" y="58" width="11" height="34" rx="5.5" transform="rotate(48 79 75)" />
      <rect x="44" y="96" width="5" height="22" rx="2.5" />
      <rect x="58" y="94" width="4" height="16" rx="2" />
    </svg>
  );
}

/* ========= 本体 ========= */
export default function TimeScheduleSection({ bg = "/chalkboard.png" }: { bg?: string }) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = (newDir: number) => {
    setDirection(newDir);
    setIdx((prev) => (prev + newDir + schedules.length) % schedules.length);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, transition: { duration: 0.4, ease: EASE } }),
  };

  const day = schedules[idx];

  return (
    <section id="schedule" className="relative text-white overflow-hidden">
      {/* 背景は常に cover */}
      <div
        className="relative w-screen left-1/2 -translate-x-1/2 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-10 md:py-14">
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.div
              key={day.key}
              className="relative"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100) paginate(1);
                else if (info.offset.x > 100) paginate(-1);
              }}
            >
              <ChalkHeading text={day.heading} />
              {/* sub は出さない（必要なら day.sub をここに） */}
              <div className="my-4 md:my-6 h-[2px] w-2/3 bg-white/60 blur-[0.5px]" />

              {/* 🕒 タイムスケジュール一覧 */}
              <motion.ul
                className="space-y-2 md:space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
              >
                {day.items.map((it, i) => (
                  <li key={i}>
                    {it.smudged ? <SmudgedLine time={it.time} /> : <ChalkText text={it.time ? `${it.time}　${it.label}` : it.label} />}
                  </li>
                ))}
              </motion.ul>

              {/* 🎬 YouTube：中央下（ボタンより上）にスライドイン */}
              <motion.div
                key={day.youtubeId}
                initial={{ opacity: 0, y: 80, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: 0.3, duration: 0.6, ease: EASE },
                }}
                exit={{ opacity: 0, y: 60, scale: 0.9, transition: { duration: 0.4 } }}
                className="relative mx-auto mt-8 mb-8 w-full max-w-[320px] md:max-w-[480px] rounded-xl overflow-hidden ring-1 ring-white/20 shadow-[0_8px_20px_rgba(0,0,0,.4)] bg-black/30"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${day.youtubeId}?rel=0&modestbranding=1`}
                  title="YouTube video"
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </motion.div>
              {day.anomaly && <BlueHand />}
            </motion.div>
          </AnimatePresence>

          {/* 🎨 チョーク矢印を右側に固定表示 */}
          <ChalkArrowHint />
        </div>
      </div>

      {/* 下マージン */}
      <div className="h-10 md:h-16" />
    </section>
  );
}