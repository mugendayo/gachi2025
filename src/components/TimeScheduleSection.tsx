"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ========= 手書き見出し ========= */
function ChalkHeading({ text }: { text: string }) {
  return (
    <h3 className="font-chalk leading-relaxed mb-2 text-left text-[clamp(28px,5.2vw,100px)]">
      {text.split("").map((char, i) => {
        const r = (Math.random() - 0.5) * 8;
        const x = (Math.random() - 0.5) * 6;
        const y = (Math.random() - 0.5) * 6;
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
        const r = (Math.random() - 0.5) * 6;
        const y = (Math.random() - 0.5) * 4;
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
function LockedTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="button"
      aria-disabled="true"
      title="近日公開"
      className={[
        "relative inline-block rounded-xl overflow-hidden",
        "ring-1 ring-white/10 shadow-[0_8px_16px_rgba(0,0,0,.28)]",
        "cursor-not-allowed select-none group",
      ].join(" ")}
      style={{ width: "clamp(120px,34vw,300px)" }}
    >
      {/* 画像 */}
      <img
        src={src}
        alt={alt}
        className="block w-full h-auto transition duration-200 group-hover:grayscale group-hover:brightness-75"
        draggable={false}
      />

      {/* ホバー暗転 */}
      <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-200" />

      {/* 左上：鍵バッジ */}
      <span
        className={[
          "absolute top-1.5 left-1.5 z-10",
          "inline-flex items-center gap-1 px-2 py-1 rounded-full",
          "bg-black/60 backdrop-blur-[2px] text-white text-[14px] font-semibold",
          "ring-1 ring-white/20",
        ].join(" ")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
          <path
            d="M7 10V8a5 5 0 0110 0v2h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1zm2 0h6V8a3 3 0 10-6 0v2z"
            fill="currentColor"
          />
        </svg>
        10月23日解禁!！
      </span>
    </div>
  );
}
/* ========= スケジュールデータ ========= */
const EASE = [0.16, 1, 0.3, 1] as const;

const schedules = [
  {
    key: "day1",
    heading: "11月1日(土) 文化祭まであと2日！",
    sub: "舞台に入場。はじまりのベル。",
    items: [
      { time: "08:00", label: "遅刻厳禁！超新星ホームルーム" },
      { time: "09:00", label: "通常授業" },
      { time: "10:45", label: "ガチ文高等学校体育祭" },
      { time: "13:30", label: "激レア！秘密の授業" },
      { time: "14:30", label: "文化祭準備" },
    ],
    youtubeId: "8G67_w_tFB0",
  },
  {
    key: "day2",
    heading: "11月2日(日) 文化祭まであと1日！",
    sub: "汗かいて笑って、文化祭の芯を作る。",
    items: [
      { time: "08:30", label: "超新星ホームルーム" },
      { time: "09:00", label: "映像授業" },
      { time: "09:45", label: "文化祭準備" },
      { time: "12:20", label: "限界を越えろ！1500m走" },
    ],
    youtubeId: "jsczTaACzdU",
  },
  {
    key: "final",
    heading: "11月3日(祝日)　ガチ文化祭の日！",
    sub: "全部を乗せて、幕が上がる。",
    items: [
      { time: "08:30", label: "超新星ホームルーム！" },
      { time: "10:30", label: "開会式＆高校生バンド" },
      { time: "11:00", label: "ガチ文化祭！" },
      { time: "17:15", label: "閉会式" },
      { time: "18:00", label: "後夜祭　残響校舎" },
    ],
    youtubeId: "n3AKmUFhIuw",
  },
]
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
                    <ChalkText text={`${it.time}　${it.label}`} />
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

              {/* 🔗 下部（ロック中） */}
              <div className="mt-6 w-full max-w-[720px] mx-auto grid grid-cols-2 place-items-center gap-4 md:gap-6">
                <LockedTile src="/schedule/btn-seishun.png" alt="青春の延命治療（近日公開）" />
                <LockedTile src="/schedule/btn-archive.png" alt="過去企画一覧（近日公開）" />
              </div>
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