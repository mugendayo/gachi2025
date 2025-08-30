// components/TimeScheduleSection.tsx
"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

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

/* ========= 手書き本文 ========= */
function ChalkText({ text }: { text: string }) {
  return (
    <p className="text-white font-chalk leading-relaxed text-left text-[clamp(14px,1.4vw,26px)]">
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

/* ========= 縦書き「次へ」ボタン（発光） ========= */
function ChalkNextButton({
  label, onClick, className = "", style,
}: { label: string; onClick: () => void; className?: string; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "relative inline-block select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/80 rounded-md",
        className,
      ].join(" ")}
      style={style}
    >
      <span className="tg-breath relative inline-block">
        <span aria-hidden className="tg-aurora absolute -inset-4 rounded-[16px] blur-xl pointer-events-none" />
        <span
          className="tg-text relative z-10 text-white font-chalk leading-none block text-[clamp(36px,5.2vw,86px)]"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
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
                  marginBottom: ch === " " ? "0.6em" : "0.06em",
                }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      </span>

      <style jsx>{`
        .tg-breath { animation: tg-breath-kf 3.2s ease-in-out 0.4s infinite; }
        @keyframes tg-breath-kf { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        .tg-aurora{
          background:
            radial-gradient(60% 60% at 30% 40%, rgba(255,120,180,.45), transparent 70%),
            radial-gradient(50% 50% at 70% 60%, rgba(120,220,255,.35), transparent 70%);
          animation: tg-aurora-move 7.5s ease-in-out infinite alternate, tg-aurora-hue 9s linear infinite;
          opacity:.75;
        }
        @keyframes tg-aurora-move { 0%{transform:translate(-6%,-4%)} 100%{transform:translate(6%,4%)} }
        @keyframes tg-aurora-hue { 0%{filter:hue-rotate(0deg) saturate(110%)} 50%{filter:hue-rotate(18deg) saturate(130%)} 100%{filter:hue-rotate(0deg) saturate(110%)} }
        .tg-text{
          text-shadow:0 0 6px rgba(255,255,255,.55),0 0 18px rgba(255,120,180,.35),0 2px 10px rgba(0,0,0,.30);
          animation: tg-text-glow 4.2s ease-in-out infinite;
        }
        @keyframes tg-text-glow{
          0%,100%{color:#fff;text-shadow:0 0 6px rgba(255,255,255,.55),0 0 18px rgba(255,120,180,.35),0 2px 10px rgba(0,0,0,.30)}
          50%{color:#ffd6ea;text-shadow:0 0 8px rgba(255,170,210,.85),0 0 22px rgba(255,120,180,.55),0 2px 12px rgba(0,0,0,.35)}
        }
      `}</style>
    </button>
  );
}

/* ========= Variants / Data ========= */
const EASE = [0.16, 1, 0.3, 1] as const;
const listVariants: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.35, ease: EASE } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } };

type OneDay = {
  key: "day1" | "day2" | "final";
  heading: string;
  sub: string;
  items: { time: string; label: string }[];
  youtubeId: string;
};

const schedules: OneDay[] = [
  { key: "day1", heading: "1日目 - 集合＆導入", sub: "舞台に入場。はじまりのベル。", items: [
      { time: "13:00", label: "集合・オープニング／ホームルーム" },
      { time: "14:00", label: "校内探検ツアー" },
    ], youtubeId: "Ade3z8gsutw" },
  { key: "day2", heading: "2日目 - 準備＆体育祭", sub: "汗かいて笑って、文化祭の芯を作る。", items: [
      { time: "09:00", label: "朝礼・準備開始" },
      { time: "11:00", label: "体育祭（全体競技・クラス対抗）" },
    ], youtubeId: "pk7cy_tVsjs" },
  { key: "final", heading: "ガチ文化祭 当日！", sub: "全部を乗せて、幕が上がる。", items: [
      { time: "09:30", label: "開会式・来場者入場" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },
      { time: "11:00", label: "出し物一斉スタート" },

    ], youtubeId: "adO_ZaShq34" },
];

/* ========= 本体 ========= */
export default function TimeScheduleSection({ bg = "/chalkboard.png" }: { bg?: string }) {
  const [idx, setIdx] = useState(0);
  const day = schedules[idx];
  const nextLabel = useMemo(() => (idx === 0 ? "次へ ▶︎" : idx === 1 ? "当日へ ▶︎" : "最初に戻る"), [idx]);
  const handleNext = () => setIdx((p) => (p + 1) % schedules.length);

  return (
    <section id="schedule" className="relative text-white">
      {/* 背景は常に cover */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-10 md:py-14">
          {/* 見出し～時間割 */}
          <div className="relative">
            <ChalkHeading text={day.heading} />
            <div className="mt-1 text-[clamp(12px,1.2vw,22px)] text-white/85">{day.sub}</div>
            <div className="my-4 md:my-6 h-[2px] w-2/3 bg-white/60 blur-[0.5px]" />

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
        {/* ==== YouTube：この“内側”を relative にして、右上に1つだけ絶対配置 ==== */}
        <div className="mt-6 md:mt-8">
        <div className="relative mx-auto w-full max-w-[360px] md:max-w-[430px]">
            {/* 右上のCTA（transformで外側に寄せる／1個だけ） */}
            <div
            className="absolute z-30 top-0 right-0
                        translate-x-[10%] -translate-y-[60%]
                        md:translate-x-[12%] md:-translate-y-[64%]
                        lg:translate-x-[14%] lg:-translate-y-[70%]"
            >
            <div className="rotate-[6deg]" style={{ transformOrigin: "50% 50%" }}>
                <ChalkNextButton
                label={nextLabel}
                onClick={handleNext}
                className="scale-[0.84] sm:scale-[0.92] md:scale-100"
                />
            </div>
            </div>

            {/* 動画本体 */}
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

        {/* 画像ボタン 2つ（中央・横並び） */}
        <div className="mt-4 md:mt-5 w-full max-w-[720px] mx-auto grid grid-cols-2 place-items-center gap-4 md:gap-6">
            <a href="/seishun" className="group inline-block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            <img src="/schedule/btn-seishun.png" alt="青春の延命治療"
                className="block h-auto w-[clamp(120px,34vw,300px)] max-w-[300px] rounded-xl ring-1 ring-white/10 shadow-[0_8px_16px_rgba(0,0,0,.28)] transition-transform duration-200 group-hover:-translate-y-0.5" />
            </a>
            <a href="/archives" className="group inline-block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            <img src="/schedule/btn-archive.png" alt="過去企画一覧"
                className="block h-auto w-[clamp(120px,34vw,300px)] max-w-[300px] rounded-xl ring-1 ring-white/10 shadow-[0_8px_16px_rgba(0,0,0,.28)] transition-transform duration-200 group-hover:-translate-y-0.5" />
            </a>
        </div>
        </div>

          </div>
        </div>
      </div>

      {/* 下マージン */}
      <div className="h-10 md:h-16" />
    </section>
  );
}
