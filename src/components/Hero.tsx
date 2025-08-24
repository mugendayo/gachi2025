"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import SummonCTA from "../components/SummonCTA";



const vLine = {
  hidden: { opacity: 0, y: 8, filter: "blur(2px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: "easeOut" },
  },
} satisfies Variants;;

/* =========================
   STEP2: 行ごと演出の素材
   ========================= */
const step2Lines = [
  "君はガチ文高等学校に生徒としてタイムスリップしてきたんだよ。",
  "大変なことに2日後は街の人たちや他校の生徒も楽しみにしている文化祭なんだ。",
  "もちろん授業もあるし、体育祭もあるみたい⁉",
  "みんなは君のことを同い年のクラスメイトだと思っているから、",
  "君がタイムスリップしてきたことがバレないように、最高の文化祭を作ってくれ！",
  "もしあの頃やり残したことが胸の中にあるなら、全部できるんだ！",
  "じゃあ、ガチ文高等学校は生徒指導の先生が厳しいから遅刻には気をつけて！行ってらっしゃい！",
];

// 親→子にステップ表示
const vLinesContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren: 0.08, staggerChildren: 0.22 },
  },
};



export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [popupStep, setPopupStep] = useState<0 | 1 | 2>(0); // 0=なし, 1=動画, 2=ストーリー
  const [hasSeenPopup, setHasSeenPopup] = useState(false); // STEP2を閉じたらtrue
  const step1VideoRef = useRef<HTMLVideoElement | null>(null);

  /* 既に完了済みなら右下ボタンを即表示 */
  useEffect(() => {
    try {
      const seen = typeof window !== "undefined" && localStorage.getItem("gbf_seen_popup") === "1";
      if (seen) setHasSeenPopup(true);
    } catch {}
  }, []);

  /* 1秒後に中央CTA出現 */
  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 1000);
    return () => clearTimeout(t);
  }, []);

  /* ポップアップ完了までスクロールロック */
  useEffect(() => {
    const lock = !hasSeenPopup;
    const html = document.documentElement;
    const body = document.body;

    if (lock) {
      html.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      const prevent = (e: TouchEvent) => e.preventDefault();
      body.addEventListener("touchmove", prevent, { passive: false });
      return () => {
        body.removeEventListener("touchmove", prevent);
        html.style.overflow = "";
        body.style.overscrollBehavior = "";
      };
    } else {
      html.style.overflow = "";
      body.style.overscrollBehavior = "";
    }
  }, [hasSeenPopup]);

  const openStep1 = () => setPopupStep(1);
  const goStep2 = () => setPopupStep(2);

  /* STEP2のみ外側クリックで終了 */
  const finishPopup = () => {
    setPopupStep(0);
    if (!hasSeenPopup) {
      setHasSeenPopup(true);
      try {
        localStorage.setItem("gbf_seen_popup", "1");
      } catch {}
    }
  };

  /* STEP1: 縦動画 自動再生フォールバック */
  useEffect(() => {
    if (popupStep === 1 && step1VideoRef.current) {
      const v = step1VideoRef.current;
      const tryPlay = () => {
        const p = v.play?.();
        if (p && typeof p.then === "function") p.catch(() => {});
      };
      tryPlay();
      const t = setTimeout(tryPlay, 250);
      return () => clearTimeout(t);
    }
  }, [popupStep]);

  return (
    <section className="relative h-[100svh] md:h-screen overflow-hidden bg-black mb-0">
      {/* 背景動画（ヒーロー） */}
      <video
        className="absolute inset-0 z-10 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        poster="/og.jpg"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* ヒーローテキスト */}
      <div className="absolute inset-x-0 top-10 z-20 text-center px-6 text-white">
        <h1 className="text-sm md:text-3xl font-bold drop-shadow">ガチ文化祭2025</h1>
        <p className="mt-1 text-sm md:text-l drop-shadow">- 青春の延命治療</p>
      </div>

      {/* 中央CTA：クリックでSTEP1を開く */}
<AnimatePresence>
  {showCTA && popupStep === 0 && (
    <div className="absolute inset-0 z-[1200] grid place-items-center">
      <SummonCTA
        label="Click"
        onClick={openStep1}
        autoShowAfterMs={0}  // ← 既にHero側で1秒遅延しているので0に
      />
    </div>
  )}
</AnimatePresence>

      // ▼ ここから置き換え：ポップアップ（STEP1: 縦長映像 / STEP2: 物語）
    <AnimatePresence>
      {popupStep !== 0 && (
        <>
          {/* オーバーレイ（外側タップで閉じる） */}
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={finishPopup} /* 外側タップで閉じる */
            role="presentation"
            aria-hidden="true"
          />

          {/* ダイアログ本体 */}
          <motion.div
            className="fixed inset-0 z-[1001] grid place-items-center p-6 pointer-events-none"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            aria-modal="true"
            role="dialog"
            onKeyDown={(e) => { if (e.key === "Escape") finishPopup(); }}
            tabIndex={-1}
          >
            <motion.div
              key={`step-${popupStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto"
              onClick={(e) => e.stopPropagation()} /* カード内タップは閉じさせない */
            >
              {popupStep === 1 ? (
                /* STEP1: 縦長映像 + 次へ */
                <div
                  className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-black"
                  style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}
                >
                  <video
                    ref={step1VideoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    loop={false}
                    preload="metadata"
                    poster="/goal-poster.jpg"
                    onCanPlay={() => {
                      try { step1VideoRef.current?.play?.(); } catch {}
                    }}
                  >
                    <source src="/goal.mp4" type="video/mp4" />
                  </video>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <button
                      onClick={goStep2}
                      className="rounded-full bg-white/95 text-black px-6 py-2 text-sm font-medium hover:bg-white transition"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP2: 同規格(9:16)カード + テキスト行アニメ + 外側タップで閉じる対応 */
                <div
                  className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-white"
                  style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}
                >
                  {/* スクロール領域（本文だけスクロール） */}
                  <div className="absolute inset-0 p-6 overflow-y-auto overscroll-contain">
                    <motion.h2
                      className="text-2xl font-bold mb-4"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      ストーリー
                    </motion.h2>

                    <motion.div
                      variants={vLinesContainer}
                      initial="hidden"
                      animate="show"
                      className="text-[17px] leading-relaxed text-left space-y-3"
                      onAnimationComplete={() => {
                        const el = document.getElementById("gbf-close-btn");
                        if (el) el.classList.add("gbf-attn");
                      }}
                    >
                      {step2Lines.map((line, i) => {
                        const decorated = line
                          .replace("ガチ文高等学校", "<b>ガチ文高等学校</b>")
                          .replace("最高の文化祭", "<b>最高の文化祭</b>")
                          .replace("バレないように", "<b>バレないように</b>");
                        return (
                          <motion.p
                            key={i}
                            variants={vLine}
                            className="text-gray-900"
                            dangerouslySetInnerHTML={{ __html: decorated }}
                          />
                        );
                      })}
                    </motion.div>

                    {/* 下部ボタン */}
                    <div className="mt-8 flex justify-center pb-2">
                      <button
                        id="gbf-close-btn"
                        onClick={finishPopup}
                        className="rounded-full border px-6 py-2 text-sm hover:bg-gray-50 transition gbf-attn-base"
                      >
                        閉じる
                      </button>
                    </div>

                    {/* iOSセーフエリア確保 */}
                    <div style={{ height: "env(safe-area-inset-bottom)" }} />
                  </div>

                  {/* タイトル可読性UPの上部グラデ（任意） */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    // ▲ ここまで置き換え


      {/* 右下：チケット購入ボタン（STEP2終了後に出現） */}
      <AnimatePresence>
        {hasSeenPopup && (
          <motion.div
            key="ticket-btn"
            className="fixed z-[60] tg-ticket-wrap"
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            style={{
              right: "calc(16px + env(safe-area-inset-right))",
              bottom: "calc(16px + env(safe-area-inset-bottom))",
            }}
          >
            <a
              href="https://gachibun.studio.site/ticket"
              aria-label="チケットを購入する"
              className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              rel="noopener"
            >
              <div className="rounded-full p-1 tg-glow-wrap">
                <img
                  src="/ticket-btn.png"
                  alt="ガチ文高等学校の生徒になる"
                  className="block select-none pointer-events-none rounded-full tg-glow-img tg-ticket-img"
                  draggable={false}
                />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スタイル：発光、ボタンサイズ、STEP2ボタン強調 */}
      <style jsx global>{`
        /* 右下ボタンのサイズ（全体的に大きめ） */
        .tg-ticket-wrap {
          --btn-size: clamp(120px, 20vw, 340px);
        }
        .tg-ticket-img {
          width: var(--btn-size);
          height: var(--btn-size);
        }

        /* 出現フェード */
        @keyframes tg-fade-in {
          0% {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        /* 発光 */
        @keyframes tg-glow {
          0% {
            filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0))
              drop-shadow(0 0 0px rgba(0, 180, 255, 0));
          }
          100% {
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))
              drop-shadow(0 0 18px rgba(0, 180, 255, 0.6));
          }
        }
        .tg-glow-wrap {
          animation: tg-fade-in 0.8s ease-out 0.4s both;
          border-radius: 9999px;
        }
        .tg-glow-img {
          animation: tg-glow 2.2s ease-in-out 1.2s infinite alternate;
          border-radius: 9999px;
        }
        @media (prefers-reduced-motion: reduce) {
          .tg-glow-wrap,
          .tg-glow-img {
            animation: none !important;
          }
        }

        /* STEP2を読み切ったら“閉じる”が軽く呼吸発光 */
        .gbf-attn-base {
          box-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
        .gbf-attn {
          animation: gbfPulse 1.8s ease-in-out infinite;
          border-color: rgba(0, 0, 0, 0.12);
        }
        @keyframes gbfPulse {
          0% {
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
            transform: translateY(-1px);
          }
          100% {
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
