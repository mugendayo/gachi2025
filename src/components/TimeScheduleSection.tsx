// components/TimeScheduleSection.tsx
"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import type { CSSProperties } from "react";

/* ========== 手書き見出し ========== */
function ChalkHeading({ text }: { text: string }) {
  return (
    <h3 className="text-3xl md:text-5xl font-chalk leading-relaxed mb-2 text-left">
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
            }}
          >
            {char}
          </span>
        );
      })}
    </h3>
  );
}

/* ========== 手書き本文 ========== */
function ChalkText({ text }: { text: string }) {
  return (
    <p className="text-white text-[14px] md:text-lg font-chalk leading-relaxed text-left">
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
            }}
          >
            {char}
          </span>
        );
      })}
    </p>
  );
}

/* ========== 「次へ」ボタン（円なし・文字大きめ） ========== */
function ChalkNextButton({
  label,
  onClick,
  className = "",
  style,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "relative grid place-items-center select-none",
        "text-white font-chalk",
        "text-4xl md:text-2xl leading-none", // ← サイズ大きく
        className,
      ].join(" ")}
      style={style}
    >
      {label.split("").map((ch, i) => {
        const r = (Math.random() - 0.5) * 6;
        const y = (Math.random() - 0.5) * 4;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `rotate(${r}deg) translateY(${y}px)`,
              marginRight: ch === " " ? "0.4em" : "0.06em",
            }}
          >
            {ch}
          </span>
        );
      })}
    </button>
  );
}

/* ========== Variants ========== */
const EASE = [0.16, 1, 0.3, 1] as const;
const listVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.35, ease: EASE } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

/* ========== データ ========== */
type OneDay = {
  key: "day1" | "day2" | "final";
  heading: string;
  sub: string;
  items: { time: string; label: string }[];
  chekis: string[];
  youtubeId: string;   // ← 追加
};

const schedules: OneDay[] = [
  {
    key: "day1",
    heading: "1日目 - 集合＆導入",
    sub: "舞台に入場。はじまりのベル。",
    items: [
      { time: "13:00", label: "集合・オープニング／ホームルーム" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },
      { time: "14:00", label: "校内探検ツアー" },

    ],
    chekis: ["/day1-1.jpg", "/day1-2.webp", "/day1-3.jpg"],
     youtubeId: "Ade3z8gsutw",   // ← 追加
  },
  {
    key: "day2",
    heading: "2日目 - 準備＆体育祭",
    sub: "汗かいて笑って、文化祭の芯を作る。",
    items: [
      { time: "09:00", label: "朝礼・準備開始" },
      { time: "11:00", label: "体育祭（全体競技・クラス対抗）" },
    ],
    chekis: ["/day2-1.jpg", "/day2-2.webp", "/day2-3.jpg"],
     youtubeId: "pk7cy_tVsjs",   // ← 追加
  },
  {
    key: "final",
    heading: "ガチ文化祭 当日！",
    sub: "全部を乗せて、幕が上がる。",
    items: [
      { time: "09:30", label: "開会式・来場者入場" },
      { time: "11:00", label: "出し物一斉スタート" },
    ],
    chekis: ["/final-1.jpg", "/final-2.jpg", "/final-3.jpg"],
     youtubeId: "adO_ZaShq34",   // ← 追加
  },
];

/* ========== 本体 ========== */
export default function TimeScheduleSection({ bg = "/chalkboard.png" }: { bg?: string }) {
  const [idx, setIdx] = useState(0);
  const day = schedules[idx];

  const nextLabel = useMemo(() => {
    if (idx === 0) return "次へ ▶︎";
    if (idx === 1) return "当日へ ▶︎";
    return "最初に戻る";
  }, [idx]);

  const handleNext = () => setIdx((p) => (p + 1) % schedules.length);

  return (
    <section id="schedule" className="relative text-white">
      <div
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="relative aspect-[9/16] md:aspect-[16/9]">
          {/* 左：テキスト */}
          {/* ===== 左下：YouTube 埋め込み（各日で切替） ===== */}
<div
  className="absolute z-[35]"
  style={{
    left: "3%",
    bottom: "20%",                     // ← 低すぎる時は値を大きく
    width: "min(64vw, 520px)",         // ← 横幅上限
  }}
>
  <div className="relative w-full aspect-video rounded-xl overflow-hidden ring-1 ring-white/20 shadow-[0_12px_28px_rgba(0,0,0,.35)] bg-black/30">
    <iframe
      src={`https://www.youtube.com/embed/${day.youtubeId}?rel=0&modestbranding=1&cc_load_policy=0`}
      title="YouTube video"
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      loading="lazy"
    />
  </div>
</div>

          <div className="absolute top-[8%] left-[7%] w-[60%] md:w-[50%] z-[20]">
            <AnimatePresence mode="wait">
              <motion.div
                key={day.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: EASE } }}
                className="mb-3 md:mb-4 text-left"
              >
                <ChalkHeading text={day.heading} />
                <div className="mt-1 text-sm md:text-base text-white/85">{day.sub}</div>
              </motion.div>
            </AnimatePresence>

            <div className="mb-4 md:mb-6 h-[2px] w-2/3 bg-white/60 blur-[0.5px]" />

            <AnimatePresence mode="wait">
              <motion.ul
                key={day.key + "-list"}
                variants={listVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="space-y-2 md:space-y-3"
              >
                {day.items.map((it, i) => (
                  <motion.li key={i} variants={itemVariants}>
                    <ChalkText text={`${it.time}　${it.label}`} />
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>

          {/* 右：チェキ */}
          <div
            className="absolute z-[30]"
            style={{
              right: "8%",
              top: "5%",
              width: "clamp(160px, 38vw, 280px)",
              height: "clamp(220px, 46vw, 360px)",
            }}
          >
            <div className="relative w-full h-full">
              <div
                className="absolute w-[44%] md:w-[46%] aspect-[3/4] bg-white rounded-sm shadow-xl border border-gray-200 overflow-hidden"
                style={{ top: 0, right: "30%", transform: "rotate(-8deg)" }}
              >
                <img src={day.chekis[0]} alt="cheki-1" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full h-[14%] bg-white" />
              </div>
              <div
                className="absolute w-[46%] md:w-[48%] aspect-[3/4] bg-white rounded-sm shadow-xl border border-gray-200 overflow-hidden"
                style={{ top: "18%", right: "0%", transform: "rotate(6deg)" }}
              >
                <img src={day.chekis[1]} alt="cheki-2" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full h-[14%] bg-white" />
              </div>
              <div
                className="absolute w-[44%] md:w-[46%] aspect-[3/4] bg-white rounded-sm shadow-xl border border-gray-200 overflow-hidden"
                style={{ top: "50%", right: "15%", transform: "rotate(2deg)" }}
              >
                <img src={day.chekis[2]} alt="cheki-3" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full h-[14%] bg-white" />
              </div>
            </div>
          </div>

          {/* 右下：「次へ」テキストボタン */}
          <div className="absolute inset-0 z-[80] pointer-events-none">
            <ChalkNextButton
              label={nextLabel}
              onClick={handleNext}
              className="absolute pointer-events-auto left-1/2 top-1/2"
              style={{
                transform: "translate(calc(-50% + 24vw), calc(-50% + 16vh))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="h-10 md:h-16" />
    </section>
  );
}
