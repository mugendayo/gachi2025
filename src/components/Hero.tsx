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
  "生徒証を拾ったのね！ようこそ！",
   "きみはガチ文高等学校に「生徒」としてタイムスリップしてきたんだよ！",
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
  // === STEP2（妖精のセリフ）タイプライター用 ===
  const lines = step2Lines;                 // 既存の文面配列を利用
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typeSpeed = 34;                     // 1文字の速度(ms) 調整可

  const startTyping = (text: string) => {
    setTyped("");
    setIsTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, typeSpeed);
  };

  const revealAll = () => {
    // 途中クリックで全文表示
    if (isTyping) {
      setTyped(lines[lineIdx]);
      setIsTyping(false);
    }
  };

  const nextLine = () => {
    if (lineIdx < lines.length - 1) {
      const next = lineIdx + 1;
      setLineIdx(next);
      startTyping(lines[next]);
    } else {
      // 最後の行まで読んだら閉じる or ボタンを押してもらう
      // ここでは閉じるボタンを設置しているので何もしない
    }
  };

  // STEP2 が開いたら毎回最初の行からタイプ開始
  useEffect(() => {
    if (popupStep === 2) {
      setLineIdx(0);
      startTyping(lines[0]);
    }
  }, [popupStep]); // eslint-disable-line


// 初回判定（マウント時）
useEffect(() => {
  try {
    const seen = typeof window !== "undefined" && localStorage.getItem("gbf_seen_popup") === "1";
    setHasSeenPopup(seen);
    setPopupStep(0);        // 起動時は何も開かない
    setShowCTA(!seen);      // 未読ならCTAを使う / 既読ならCTAも非表示
  } catch {
    setHasSeenPopup(false);
    setPopupStep(0);
    setShowCTA(true);
  }
}, []);

// CTAは未読のときだけ1秒後に出す（既読なら出さない）
useEffect(() => {
  if (hasSeenPopup) { setShowCTA(false); return; }
  const t = setTimeout(() => setShowCTA(true), 1000);
  return () => clearTimeout(t);
}, [hasSeenPopup]);

useEffect(() => {
  const lock = popupStep !== 0;   // ← ここを hasSeenPopup ではなく popupStep にする
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
}, [popupStep]);

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
    setShowCTA(false); // 念のため同セッションでも出ないように
    try { localStorage.setItem("gbf_seen_popup", "1"); } catch {}
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
   <section className="relative min-h-[100svh] md:min-h-screen mb-0">
    
        {/* 固定（sticky）背景動画：セクション内では常に最背面（=前景より下、背景より上） */}
        <div className="sticky top-0 h-[100svh] z-0 relative pointer-events-none">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            loop
            preload="metadata"
            poster="/og.jpg"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        </div>


      {/* ヒーローテキスト */}
      <div className="absolute inset-x-0 top-10 z-20 text-center px-6 text-white">
        <h1 className="text-sm md:text-3xl font-bold drop-shadow">ガチ文化祭2025</h1>
        <p className="mt-1 text-sm md:text-l drop-shadow">- 青春の延命治療</p>
      </div>

    {/* 中央CTA：クリックでSTEP1を開く */}
      <AnimatePresence>
        {showCTA && popupStep === 0 && (
          <div
            className={
              hasSeenPopup
                ? "relative z-20 mt-14 flex justify-center"      // STEP2後＝フローに合流
                : "fixed inset-0 z-[1200] grid place-items-center" // 初回＝画面中央に固定
            }
          >
            {/* 初回はCTAだけクリック可にするため pointer-events を分離 */}
            <div className={hasSeenPopup ? "" : "pointer-events-auto"}>
              <SummonCTA
                label="Click"
                onClick={openStep1}
                autoShowAfterMs={0}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!hasSeenPopup && popupStep === 0 && showCTA && (
          <div className="fixed inset-0 z-[1200] grid place-items-center">
            <div className="pointer-events-auto">
              <SummonCTA label="Click" onClick={() => setPopupStep(1)} autoShowAfterMs={0} />
            </div>
          </div>
        )}
      </AnimatePresence>

{/* ポップアップ（STEP1: 縦長映像 / STEP2: キャラ紹介） */}
<AnimatePresence>
  {popupStep !== 0 && (
    <>
      {/* オーバーレイ（外側タップで閉じる） */}
      <motion.div
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={finishPopup}
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
          onClick={(e) => e.stopPropagation()}
        >
       {popupStep === 1 ? (
  // ===== STEP1: 縦長映像 + 次へ（画像ボタン・RPGテキスト） =====
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

    {/* 下部グラデ */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />

 {/* 画像ボタン＋RPG風テキスト */}
<div className="absolute inset-x-0 bottom-5 flex justify-center">
  <div className="flex flex-col items-center">
    {/* Nextボタン */}
   <motion.button
    onClick={goStep2}
    aria-label="次へ"
    className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group cursor-pointer"
    style={{ width: "clamp(160px, 40vw, 280px)" }}
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: [0.92, 1.06, 1.0] }}
    transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
    whileHover={{ scale: 1.03, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
      <img
        src="/btn-next.png"
        alt=""
        className="block w-full h-auto select-none pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,.45)] transition will-change-transform"
        draggable={false}
      />
      {/* キラン */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="btn-glint block absolute -inset-y-2 -left-1/3 w-1/2 rotate-12" />
      </span>
      <span className="sr-only">次へ</span>
    </motion.button>

    {/* RPG風テキスト：生徒証を拾う（Nextと半分重なる） */}
    <motion.div
      onClick={goStep2}
      role="button"
      tabIndex={0}
      className="rpg-chip cursor-pointer select-none -mt-14" 
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.35, ease: "easeOut" }}
    >
      <span className="rpg-chip-deco" aria-hidden>◆</span>
      生徒証を拾う
      <span className="rpg-chip-caret" aria-hidden>▸</span>
    </motion.div>
  </div>
</div>
  </div>
) : (
  // ===== STEP2: 妖精が喋る（タイプライター） =====
  <div
    className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-gradient-to-b from-blue-50 to-white"
    style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}
  >
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center -translate-y-6 w-full px-4">
        {/* 妖精（中央より少し上） */}
        <motion.img
          src="/fairy.png"
          alt="妖精"
          className="w-40 md:w-52 h-auto select-none pointer-events-none mb-5"
          draggable={false}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* セリフ（タイプライター） */}
        <motion.button
          type="button"
          onClick={() => (isTyping ? revealAll() : nextLine())}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="w-full bg-white/95 border-2 border-gray-300 rounded-xl shadow-lg p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          style={{ fontFamily: "DotGothic16, system-ui, sans-serif" }}
        >
          <p className="text-[15px] leading-relaxed text-gray-800 break-words">
            {typed}
            {isTyping && <span className="tw-caret">▋</span>}
          </p>
          <div className="mt-2 text-[11px] text-gray-500 select-none">
            {isTyping ? "タップで全文表示" : (lineIdx < lines.length - 1 ? "タップで次のセリフ" : "下のボタンで閉じる")}
          </div>
        </motion.button>
      </div>
    </div>

    {/* 閉じる */}
    <div className="absolute right-3 bottom-3">
      <button
        onClick={finishPopup}
        className="px-4 py-2 text-xs rounded-full bg-pink-500 text-white shadow hover:bg-pink-600 transition"
      >
        閉じる
      </button>
    </div>
  </div>
)}

        </motion.div>
      </motion.div>
    </>
  )}
</AnimatePresence>

{/* ===== 前景：STEP2終了後に、背景動画の上を“流れる”ゾーン ===== */}
{hasSeenPopup && (
  <div className="relative z-20 mx-auto max-w-5xl px-6 pt-16 pb-28 text-white">
    {/* 必要ならここに魔法陣やタイトルも置く（背景と一緒に動かしたくない=前景に置く） */}
    <div className="flex justify-center">
    </div>

    <h2 className="mt-10 text-2xl md:text-3xl font-bold">ピクミン風コンテンツ群</h2>
    <p className="mt-4 opacity-90">
      スクロール解禁後、背景は固定のまま、これらが上に流れていきます。
    </p>

    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      <a href="/link-1" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード①
      </a>
      <a href="/link-2" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード②
      </a>
      <a href="/link-3" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード③
      </a>
      <a href="/link-1" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード①
      </a>
      <a href="/link-2" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード②
      </a>
      <a href="/link-3" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード③
      </a>
      <a href="/link-1" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード①
      </a>
      <a href="/link-2" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード②
      </a>
      <a href="/link-3" className="block rounded-xl border border-white/20 p-6 hover:bg-white/10 transition">
        カード③
      </a>
    </div>
  </div>
)}
{/* ===== 既読専用：右下 “ミニCTA（魔法陣）” 固定 ===== */}
<AnimatePresence>
  {hasSeenPopup && popupStep === 0 && (
    <motion.button
      key="mini-cta-illus"
      initial={{ opacity: 0, scale: 0.98, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={() => setPopupStep(1)}  // ← ポップアップ再表示
      aria-label="ストーリーをもう一度見る"
      className="fixed z-[62] tg-mini-cta-illus pointer-events-auto grid place-items-center rounded-full"
      style={{
        // 右端から同じベース値に、(チケット幅-ミニ幅)/2 を足す → 中心が一致
        right:
          "calc(16px + env(safe-area-inset-right) + (clamp(120px, 20vw, 340px) - clamp(72px, 10vw, 112px)) / 2)",
        // 下端からは“チケット高さ + 余白12px”を足す → ミニCTAがチケットの真上に
        bottom:
          "calc(16px + env(safe-area-inset-bottom) + clamp(120px, 20vw, 340px) + 12px)",
        // ミニCTA自体のサイズ（イラスト円）
        width: "clamp(72px, 10vw, 112px)",
        height: "clamp(72px, 10vw, 112px)",
      }}
    >
      {/* ここはあなたの魔法陣イラスト（前のSVGか画像）をそのまま入れてOK */}
      <svg
        className="tg-mini-cta-illus-svg"
        viewBox="0 0 100 100"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="70%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 発光の下地 */}
        <circle cx="50" cy="50" r="48" fill="url(#g)" />

        {/* 外周円（ゆる回転） */}
        <g className="tg-mini-cta-illus-rot">
          <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.5" />
          <circle
            cx="50" cy="50" r="36"
            fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* 簡易ルーン */}
          {[0,1,2,3,4,5,6,7].map(i => {
            const a = (i * 45 * Math.PI) / 180;
            const x = 50 + Math.cos(a) * 28;
            const y = 50 + Math.sin(a) * 28;
            return <circle key={i} cx={x} cy={y} r="1.6" fill="white" fillOpacity="0.9" />
          })}
        </g>

        {/* 中心の紋（わずかにスケール） */}
        <g className="tg-mini-cta-illus-pulse">
          <polygon points="50,35 58,50 50,65 42,50" fill="white" fillOpacity="0.8" />
          <circle cx="50" cy="50" r="2.4" fill="white" />
        </g>
      </svg>
    </motion.button>
  )}
</AnimatePresence>

{/* ===== 既読専用：左上 “インベントリ（あなたの持ち物）” 固定 ===== */}
<AnimatePresence>
  {hasSeenPopup && popupStep === 0 && (
    <motion.div
      key="inventory"
      className="fixed z-[61] tg-inventory"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        left: "calc(16px + env(safe-area-inset-left))",
        top:  "calc(16px + env(safe-area-inset-top))",
      }}
    >
      {/* ラベル（テキストボタン） */}
      <button
        type="button"
        className="tg-inv-label"
        onClick={() => setPopupStep(2)}   // ← クリックでストーリー再表示
      >
        もちもの
      </button>

      {/* アイテム枠：3スロット（1つ目に“生徒証”） */}
      <div className="tg-inv-grid">
        {/* 1: 生徒証（クリックでSTEP2を再表示） */}
        <button
          type="button"
          className="tg-inv-slot tg-inv-hasitem"
          onClick={() => setPopupStep(2)}
          aria-label="生徒証（ストーリーをもう一度）"
        >
          <img
            src="/btn-next.png"
            alt=""
            className="tg-inv-item tg-glow-img"
            draggable={false}
          />
        </button>

        {/* 2: 空きスロット */}
        <div className="tg-inv-slot tg-inv-empty" aria-hidden />

        {/* 3: 空きスロット */}
        <div className="tg-inv-slot tg-inv-empty" aria-hidden />
      </div>
    </motion.div>
  )}
</AnimatePresence>


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
         /* ===== ミニCTA（魔法陣イラスト） ===== */
.tg-mini-cta-illus {
  width: clamp(72px, 10vw, 112px);
  height: clamp(72px, 10vw, 112px);
  border-radius: 9999px;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.28),
    0 0 18px rgba(0, 180, 255, 0.35) inset;
  display: grid;
  place-items: center;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
  border: 1px solid rgba(255,255,255,0.12);
}

/* 画像版を使うなら */
.tg-mini-cta-illus-img {
  width: 88%;
  height: 88%;
  object-fit: contain;
  animation: tg-mini-rotate 9s linear infinite, tg-mini-glow 2s ease-in-out 1.2s infinite alternate;
}

/* SVG版（推奨） */
.tg-mini-cta-illus-svg {
  width: 88%;
  height: 88%;
  overflow: visible;
  filter: drop-shadow(0 0 10px rgba(0,180,255,.55));
  animation: tg-mini-glow 2s ease-in-out 1.2s infinite alternate;
}
.tg-mini-cta-illus-rot {
  transform-origin: 50% 50%;
  animation: tg-mini-rotate 9s linear infinite;
}
.tg-mini-cta-illus-pulse {
  transform-origin: 50% 50%;
  animation: tg-mini-pulse 1.8s ease-in-out infinite;
}

/* hover/focus */
.tg-mini-cta-illus:hover,
.tg-mini-cta-illus:focus-visible {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.10);
  box-shadow:
    0 10px 28px rgba(0,0,0,0.32),
    0 0 28px rgba(0, 180, 255, 0.55) inset;
  outline: none;
}

/* アニメーション */
@keyframes tg-mini-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes tg-mini-pulse {
  0%   { transform: scale(1.00); }
  50%  { transform: scale(1.04); }
  100% { transform: scale(1.00); }
}
@keyframes tg-mini-glow {
  0% {
    filter: drop-shadow(0 0 0px rgba(255,255,255,0))
            drop-shadow(0 0 0px rgba(0,180,255,0));
  }
  100% {
    filter: drop-shadow(0 0 10px rgba(255,255,255,0.85))
            drop-shadow(0 0 20px rgba(0,180,255,0.65));
  }
}

@media (prefers-reduced-motion: reduce) {
  .tg-mini-cta-illus,
  .tg-mini-cta-illus-img,
  .tg-mini-cta-illus-svg,
  .tg-mini-cta-illus-rot,
  .tg-mini-cta-illus-pulse {
    animation: none !important;
    transition: none !important;
  }
}

/* タイプライターの点滅カーソル */
.tw-caret {
  display: inline-block;
  margin-left: 2px;
  animation: tw-blink 1s steps(1, end) infinite;
}
@keyframes tw-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
/* ============ キラン（Nextボタンのハイライト） ============ */
.btn-glint {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.0) 10%,
    rgba(255,255,255,0.35) 45%,
    rgba(255,255,255,0.8) 50%,
    rgba(255,255,255,0.35) 55%,
    rgba(255,255,255,0.0) 90%,
    rgba(255,255,255,0) 100%
  );
  filter: blur(0.5px);
  height: 140%;
  animation: btn-glint-move 2.6s ease-in-out 0.9s infinite; /* 遅延して周期的にキラン */
  /* group-hover で速度アップしたい時は以下を使う:
     .group:hover .btn-glint { animation-duration: 1.6s; } */
}
@keyframes btn-glint-move {
  0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
  15%  { opacity: 1; }
  35%  { transform: translateX(180%) skewX(-12deg); opacity: 0.9; }
  45%  { opacity: 0; }
  100% { transform: translateX(180%) skewX(-12deg); opacity: 0; }
}

/* ============ タイプライターの点滅カーソル（STEP2） ============ */
.tw-caret {
  display: inline-block;
  margin-left: 2px;
  animation: tw-blink 1s steps(1, end) infinite;
}
@keyframes tw-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
/* ===== RPG風チップ（コマンド） ===== */
.rpg-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: clamp(12px, 2.6vw, 14px);
  line-height: 1;
  color: #fff;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%),
    radial-gradient(120% 140% at 0% 0%, rgba(0,180,255,0.25), transparent 60%);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.08),
    0 8px 22px rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  letter-spacing: 0.02em;
  position: relative;
  user-select: none;
}

.rpg-chip::after { /* 上のハイライトライン */
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  opacity: .55;
  pointer-events: none;
}

.rpg-chip-deco {
  color: #7fe3ff;
  text-shadow: 0 0 8px rgba(0,180,255,0.75);
  transform: translateY(-1px);
  font-size: 1.05em;
}

.rpg-chip-caret {
  margin-left: 4px;
  opacity: .9;
  animation: rpg-caret-pulse 1.4s ease-in-out infinite;
}

@keyframes rpg-caret-pulse {
  0%, 100% { transform: translateX(0); opacity: .7; }
  50%      { transform: translateX(2px); opacity: 1; }
}

/* ===== 左上インベントリ（あなたの持ち物） ===== */
.tg-inventory{
  display:flex;
  flex-direction: column;     /* ← ラベルの下にボックスを縦配置 */
  align-items:flex-start;     /* ← 左寄せ */
  gap:6px;                   /* ← ラベルとボックス群の間隔 */
}

.tg-inv-label{
  font-size: clamp(9px, 2vw, 5px);
  line-height: 1;
  padding: 6px 10px;
  border-radius: 9999px;
  color:#111;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  transition: transform .15s ease, background .15s ease;
}
.tg-inv-label:hover{ transform: translateY(-1px); background:#fff; }

.tg-inv-grid{
  --inv-size: clamp(40px, 9vw, 56px); /* ← ボックスの一辺（下で解説） */
  display:grid;
  grid-auto-flow: row;                  /* ← 縦方向に自動配置 */
  grid-template-columns: 1fr;           /* ← 1列だけ */
  grid-auto-rows: var(--inv-size);      /* ← 行の高さをボックスサイズに揃える */
  gap: 6px;                             /* ← ボックス同士の縦の間隔 */
}

.tg-inv-slot{
  width: var(--inv-size);
  height: var(--inv-size);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.55) 100%),
    radial-gradient(120% 120% at 0% 0%, rgba(0,180,255,0.12), transparent 60%);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.9),
    inset 0 -1px 0 rgba(0,0,0,0.04),
    0 8px 20px rgba(0,0,0,0.12);
  display:grid;
  place-items:center;
}

.tg-inv-slot::after{ /* 外枠のうっすらハイライト */
  content:"";
  position:absolute; inset:0;
  border-radius:12px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
  pointer-events:none;
}

.tg-inv-empty{
  background:
    linear-gradient(180deg, rgba(240,242,247,0.85) 0%, rgba(235,238,245,0.85) 100%),
    repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,0.03) 8px 16px);
  border-style: dashed;
  border-color: rgba(0,0,0,0.12);
}

.tg-inv-item{
  width: 86%;
  height: 86%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  /* 発光は既存 .tg-glow-img のアニメがのる */
}

.tg-inv-hasitem{
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
}
.tg-inv-hasitem:hover{ transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.16); }



      `}</style>
    </section>
  );
}
