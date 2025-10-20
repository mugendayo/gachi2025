"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SummonCTA from "../components/SummonCTA";
import Link from "next/link";

/* =========================================================================
 * Constants
 * ========================================================================= */
const LS_SEEN_POPUP = "gbf_seen_popup";
const LS_CREST_ACQUIRED = "gbf_crest_acquired";

const STEP2_LINES = [
  "生徒証を手に入れたのね！ガチ文高等学校へようこそ！きみは「生徒」としてタイムスリップしてきたのよ！さあ、文化祭の準備をしなくっちゃ！",
];

const TYPE_SPEED = 34;

// YouTube（同じタブ遷移）
const YOUTUBE_LAST_YEAR = "https://www.youtube.com/watch?v=pk7cy_tVsjs";
const YOUTUBE_FIRST = "https://www.youtube.com/watch?v=8yE9pJWsJ-QY";

const ASSET = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ""; // 例: "", "/gachi2025" など

// サムネ
const THUMB_LAST_YEAR = `${ASSET}/thumbs/lastyear.jpg`;
const THUMB_FIRST = `${ASSET}/thumbs/1.jpg`;

// デバッグ用（校章の取得フラグをリセット）
declare global {
  interface Window {
    __resetCrest?: () => void;
  }
}

/* =========================================================================
 * Component
 * ========================================================================= */
export default function Hero() {
  /* -----------------------------
   * Refs
   * --------------------------- */
  const heroRef = useRef<HTMLElement | null>(null);
  const step1VideoRef = useRef<HTMLVideoElement | null>(null);

  /* -----------------------------
   * UI State
   * --------------------------- */
  const [showCTA, setShowCTA] = useState(false);
  const [popupStep, setPopupStep] = useState<0 | 1 | 2>(0);
  const [hasSeenPopup, setHasSeenPopup] = useState(false);
  const [crestAcquired, setCrestAcquired] = useState(false); // 取得フラグ（将来拡張用）
  const [bgActive, setBgActive] = useState(true);

  // ===== STEP2 専用：文章分割（「きみは」で2つに分けてタイプ） =====
  const STEP2_FULL = STEP2_LINES[0];
  const splitIdx = STEP2_FULL.indexOf("きみは");
  const STEP2_PART_A = splitIdx >= 0 ? STEP2_FULL.slice(0, splitIdx) : STEP2_FULL;
  const STEP2_PART_B = splitIdx >= 0 ? STEP2_FULL.slice(splitIdx) : "";

  const [typedA, setTypedA] = useState("");
  const [isTypingA, setIsTypingA] = useState(false);
  const [typedB, setTypedB] = useState("");
  const [isTypingB, setIsTypingB] = useState(false);
  const [showSecond, setShowSecond] = useState(false); // 後半の出現フラグ

  // 後半まで含めて全文表示する（途中タップ時）
  const revealAllStep2 = () => {
    if (isTypingA) {
      setTypedA(STEP2_PART_A);
      setIsTypingA(false);
    }
    setShowSecond(true);
    if (STEP2_PART_B) {
      setTypedB(STEP2_PART_B);
      setIsTypingB(false);
    }
  };

  // 前半タイプ開始 → 0.3s後に後半タイプ開始
  const startTypingA = (text: string) => {
    setTypedA("");
    setIsTypingA(true);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTypedA(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsTypingA(false);
        setTimeout(() => {
          setShowSecond(true);
          if (STEP2_PART_B) startTypingB(STEP2_PART_B);
        }, 300);
      }
    }, TYPE_SPEED);
  };

  const startTypingB = (text: string) => {
    setTypedB("");
    setIsTypingB(true);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTypedB(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsTypingB(false);
      }
    }, TYPE_SPEED);
  };

  // 既存タイプライタ（他箇所で使う可能性があるので残すが、STEP2では未使用）
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    }, TYPE_SPEED);
  };
  const revealAll = () => {
    if (isTyping) {
      setTyped(STEP2_LINES[lineIdx]);
      setIsTyping(false);
    }
  };
  const nextLine = () => {
    if (lineIdx < STEP2_LINES.length - 1) {
      const next = lineIdx + 1;
      setLineIdx(next);
      startTyping(STEP2_LINES[next]);
    }
  };

  /* -----------------------------
   * Bootstrap（状態復元）
   * --------------------------- */
  useEffect(() => {
    try {
      const seen =
        typeof window !== "undefined" &&
        localStorage.getItem(LS_SEEN_POPUP) === "1";
      setHasSeenPopup(seen);
      setPopupStep(0);
      setShowCTA(!seen);

      setCrestAcquired(localStorage.getItem(LS_CREST_ACQUIRED) === "1");

      // デバッグ：校章フラグを消す
      window.__resetCrest = () => localStorage.removeItem(LS_CREST_ACQUIRED);
    } catch {
      setHasSeenPopup(false);
      setPopupStep(0);
      setShowCTA(true);
    }
  }, []);

  /* -----------------------------
   * Crest 同期（同一タブ & 別タブ）
   * --------------------------- */
  useEffect(() => {
    const onAcq = () => {
      setCrestAcquired(true);
      try {
        localStorage.setItem(LS_CREST_ACQUIRED, "1");
      } catch {}
    };
    window.addEventListener("crest:acquired", onAcq);
    return () => window.removeEventListener("crest:acquired", onAcq);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_CREST_ACQUIRED) setCrestAcquired(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* -----------------------------
   * CTA 表示の遅延
   * --------------------------- */
  useEffect(() => {
    if (hasSeenPopup) {
      setShowCTA(false);
      return;
    }
    const t = setTimeout(() => setShowCTA(true), 1000);
    return () => clearTimeout(t);
  }, [hasSeenPopup]);

  /* -----------------------------
   * スクロールロック（初回/ポップアップ時）
   * --------------------------- */
  useEffect(() => {
    const lock = popupStep !== 0 || !hasSeenPopup;
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
  }, [popupStep, hasSeenPopup]);

  /* -----------------------------
   * ポップアップの typing 初期化（STEP2専用）
   * --------------------------- */
  useEffect(() => {
    if (popupStep === 2) {
      // リセット
      setTypedA("");
      setTypedB("");
      setIsTypingA(false);
      setIsTypingB(false);
      setShowSecond(false);
      // 先に前半をタイプ開始
      startTypingA(STEP2_PART_A);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupStep]);

  /* -----------------------------
   * 縦動画の自動再生リトライ
   * --------------------------- */
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

  /* -----------------------------
   * 背景動画の出し入れ（ヒーロー内にいる間だけ表示）
   * --------------------------- */
  useEffect(() => {
    if (!heroRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setBgActive(entry.isIntersecting),
      {
        threshold: 0.01,
      }
    );
    io.observe(heroRef.current);
    return () => io.disconnect();
  }, []);

  /* -----------------------------
   * Handlers
   * --------------------------- */
  const openStep1 = () => setPopupStep(1);
  const goStep2 = () => setPopupStep(2);

  const finishPopup = () => {
    setPopupStep(0);
    if (!hasSeenPopup) {
      setHasSeenPopup(true);
      setShowCTA(false);
      try {
        localStorage.setItem(LS_SEEN_POPUP, "1");
      } catch {}
    }
  };

  /* =========================================================================
   * Render
   * ========================================================================= */
  return (
    <section
      ref={heroRef}
      className="relative min-h-[100svh] md:min-h-screen mb-0 overflow-x-hidden"
    >
      {/* 背景動画（常に背面に固定） */}
      <div
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none transform-gpu"
        aria-hidden={true}
      >
        <video
          className="h-full w-full object-cover will-change-transform"
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
          poster="/og.jpg"
          style={{ opacity: bgActive ? 1 : 0, transition: "opacity .35s ease" }}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 以降のUIは前景（z-10） */}
      <div className="relative z-10">
        {/* 中央CTA */}
        <AnimatePresence>
          {showCTA && popupStep === 0 && (
            <div
              className={
                hasSeenPopup
                  ? "relative z-20 mt-14 flex justify-center"
                  : "fixed inset-0 z-[1200] grid place-items-center"
              }
            >
              <div className={hasSeenPopup ? "" : "pointer-events-auto"}>
                <SummonCTA label="Click" onClick={openStep1} autoShowAfterMs={0} />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ポップアップ */}
        <AnimatePresence>
          {popupStep !== 0 && (
            <>
              <motion.div
                className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={finishPopup}
                aria-hidden="true"
              />
              <motion.div
                className="fixed inset-0 z-[1001] grid place-items-center p-6 pointer-events-none"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                aria-modal="true"
                role="dialog"
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === "Escape") finishPopup();
                }}
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
                    // STEP1: 縦動画
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
                          try {
                            step1VideoRef.current?.play?.();
                          } catch {}
                        }}
                      >
                        <source src="/goal.mp4" type="video/mp4" />
                      </video>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
                      <div className="absolute inset-x-0 bottom-12 flex justify-center">
                        <div className="flex flex-col items-center">
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
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                            >
                              <span className="btn-glint block absolute -inset-y-2 -left-1/3 w-1/2 rotate-12" />
                            </span>
                            <span className="sr-only">次へ</span>
                          </motion.button>

                          <motion.div
                            onClick={goStep2}
                            role="button"
                            tabIndex={0}
                            className="rpg-chip cursor-pointer select-none -mt-18 "
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.85, duration: 0.35, ease: "easeOut" }}
                          >
                            <span className="rpg-chip-deco" aria-hidden>
                              ◆
                            </span>
                            生徒証を拾う
                            <span className="rpg-chip-caret" aria-hidden>
                              ▸
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // STEP2: 妖精のセリフ
                    <div
                      className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-gradient-to-b from-blue-50 to-white"
                      style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}
                    >
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="flex flex-col items-center -translate-y-4 w-full px-4">
                          <motion.img
                            src="/fairy.png"
                            alt="妖精"
                            className="w-40 md:w-52 h-auto select-none pointer-events-none mb-5"
                            draggable={false}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <motion.button
                            type="button"
                            onClick={() =>
                              isTypingA || isTypingB ? revealAllStep2() : finishPopup()
                            }
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28 }}
                            className="relative w-[92%] md:w-[85%] bg-white/95 border-2 border-gray-300 rounded-xl shadow-lg p-4 md:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                            style={{
                              fontFamily: "DotGothic16, system-ui, sans-serif",
                              minHeight: 120,
                            }}
                          >
                            <p className="text-[17px] md:text-[18px] leading-relaxed text-gray-800 break-words">
                              {typedA}
                              {isTypingA && <span className="tw-caret">▋</span>}

                              {showSecond && (
                                <>
                                  <br />
                                  <span>
                                    {typedB}
                                    {isTypingB && <span className="tw-caret">▋</span>}
                                  </span>
                                </>
                              )}
                            </p>

                            <div className="mt-2 text-[11px] text-gray-500 select-none">
                              {isTypingA || isTypingB
                                ? "タップで全文表示"
                                : "下のボタンで閉じる"}
                            </div>

                            {/* 閉じる（全文表示後のみ） */}
                            {!isTypingA && !isTypingB && showSecond && (
                              <motion.button
                                onClick={finishPopup}
                                className="absolute bottom-5 right-6 px-4 py-2 text-sm rounded-full bg-pink-500 text-white shadow hover:bg-pink-600 transition"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              >
                                閉じる
                              </motion.button>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 前景：STEP2終了後のコンテンツ（動画の上に流れる） */}
        {hasSeenPopup && (
          <div className="relative z-10">
            {/* 出現タイミング調整のスペーサー */}
            <div className="h-[92svh] md:h-[92vh]" aria-hidden />

            {/* ボタン群本体 */}
            <div className="mx-auto max-w-5xl px-6 pb-28 text-white">
              <h2 className="text-2xl md:text-3xl font-bold">ガチ文化祭2025</h2>
              <p className="mt-4 opacity-90">2025年11月1日（土）～3日（祝）</p>

              {/* ▼ 縦並びの3ボタン */}
              <div className="mt-10 w-full max-w-2xl mx-auto space-y-3">
{/* ① わかばガイド（透過＋やさしい配色＋常時アニメ） */}
<div className="relative">
  {/* 柔らかい発光（常時・クリック無効） */}
  <span aria-hidden className="gb-cta-glow pointer-events-none absolute inset-0 rounded-2xl" />

  <Link
    href="/guide"
    className={[
      "group relative flex w-full items-center gap-3",
      "rounded-2xl px-5 py-4",
      "bg-white/70 text-[#196b2b] backdrop-blur-sm",
      "ring-1 ring-[#cfeedd] hover:ring-[#bee7d1]",
      "shadow-[0_8px_20px_rgba(0,0,0,.08)] hover:shadow-[0_12px_28px_rgba(0,0,0,.12)]",
      "transition-all duration-200 hover:-translate-y-0.5",
      "backdrop-blur-[2px]",
      "overflow-hidden",
    ].join(" ")}
  >
    {/* 上半分のうっすらハイライト（透過感を強める） */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-2xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 100%)",
      }}
    />

    {/* 左のアイコン：薄緑ベースに淡黄の縁取り */}
    <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl ring-1"
      style={{
        background: "linear-gradient(180deg, rgba(233,248,237,.85), rgba(255,253,235,.85))",
        borderColor: "rgba(190, 231, 209, 0.9)",
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M3 21c8-1 14-7 15-15 2 3 3 6 3 9-2 4-7 6-11 6-3 0-5-0-7 0z" fill="#2ea44f" />
        <path d="M6 18c4-1 8-5 9-9" fill="none" stroke="#ffe26a" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>

    {/* テキスト */}
    <div className="flex-1">
      <div className="text-[12px] font-extrabold" style={{ color: "#6a5a28" }}>
        はじめて遊ぶ人へ
      </div>
      <div className="mt-0.5 text-[20px] md:text-[22px] font-extrabold tracking-wide">
        ガチ文のきほん
      </div>
    </div>

    {/* 矢印（色もやさしく） */}
    <span aria-hidden className="ml-2 shrink-0" style={{ color: "#2ea44f" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  </Link>
</div>


                {/* ② 去年の動画 */}
                <a
                  href={YOUTUBE_LAST_YEAR}
                  className={[
                    "group relative flex w-full items-center gap-3 md:gap-4",
                    "rounded-2xl px-3.5 md:px-4 py-3",
                    "bg-white/85 backdrop-blur text-[#14587a]",
                    "ring-1 ring-black/10 shadow-[0_8px_20px_rgba(0,0,0,.12)]",
                    "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,.18)]",
                    "overflow-hidden",
                  ].join(" ")}
                >
                  {/* サムネ */}
                  <div className="relative shrink-0 w-36 md:w-40 aspect-[16/9] overflow-hidden rounded-xl ring-1 ring-black/10">
                    <img
                      src={THUMB_LAST_YEAR}
                      alt="去年の動画"
                      className="absolute inset-0 h-full w-full object-cover bg-gray-100"
                      draggable={false}
                      loading="lazy"
                    />
                  </div>

                  {/* タイトル */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={[
                        "font-extrabold tracking-wide text-[#1675a3]",
                        "whitespace-nowrap overflow-hidden text-ellipsis",
                        "text-[16px] sm:text-[17px] md:text-[18px]",
                      ].join(" ")}
                    >
                      去年の動画
                    </div>
                  </div>

                  <span aria-hidden className="ml-2 shrink-0 text-[#1675a3]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </a>

                {/* ③ 第1回目の動画 */}
                <a
                  href={YOUTUBE_FIRST}
                  className={[
                    "group relative flex w-full items-center gap-3 md:gap-4",
                    "rounded-2xl px-3.5 md:px-4 py-3",
                    "bg-white/85 backdrop-blur text-[#0f6a5a]",
                    "ring-1 ring-black/10 shadow-[0_8px_20px_rgba(0,0,0,.12)]",
                    "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,.18)]",
                    "overflow-hidden",
                  ].join(" ")}
                >
                  {/* サムネ */}
                  <div className="relative shrink-0 w-36 md:w-40 aspect-[16/9] overflow-hidden rounded-xl ring-1 ring-black/10">
                    <img
                      src={THUMB_FIRST}
                      alt="第1回目の動画"
                      className="absolute inset-0 h-full w-full object-cover bg-gray-100"
                      draggable={false}
                      loading="lazy"
                    />
                  </div>

                  {/* タイトル */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={[
                        "font-extrabold tracking-wide text-[#118a76]",
                        "whitespace-nowrap overflow-hidden text-ellipsis",
                        "text-[16px] sm:text-[17px] md:text-[18px]",
                      ].join(" ")}
                    >
                      第1回目の動画
                    </div>
                  </div>

                  <span aria-hidden className="ml-2 shrink-0 text-[#118a76]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </a>
              </div>
              {/* ▲ ここまで縦並び3ボタン */}
            </div>
          </div>
        )}

        {/* 左上：もちもの */}
        <div
          className="fixed z-[61] tg-inventory"
          style={{
            left: "calc(16px + env(safe-area-inset-left))",
            top: "calc(16px + env(safe-area-inset-top))",
            opacity: hasSeenPopup && popupStep === 0 ? 1 : 0,
            pointerEvents: hasSeenPopup && popupStep === 0 ? "auto" : "none",
          }}
        >
          <button type="button" className="tg-inv-label" onClick={() => setPopupStep(2)}>
            もちもの
          </button>
          <div className="tg-inv-grid">
            {/* 生徒証 */}
            <button
              type="button"
              className="tg-inv-slot tg-inv-hasitem"
              onClick={() => setPopupStep(2)}
            >
              <img src="/btn-next.png" alt="" className="tg-inv-item" />
            </button>

            {/* 校章の着地点（空でも常時存在） */}
            <div id="inv-crest-slot" className="tg-inv-slot tg-inv-empty" aria-hidden />

            {/* 予備スロット */}
            <div className="tg-inv-slot tg-inv-empty" aria-hidden />
          </div>
        </div>

        {/* 右下：魔法陣（上）＋チケット（下） */}
        <AnimatePresence>
          {hasSeenPopup && popupStep === 0 && (
            <motion.div
              key="cta-right-bottom"
              className="fixed z-[60] flex flex-col items-center gap-2 md:gap-3"
              style={{
                right: "calc(12px + env(safe-area-inset-right))",
                bottom: "calc(12px + env(safe-area-inset-bottom))",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* 魔法陣（既存そのまま） */}
              <div className="translate-y-2 md:translate-y-3">
                <motion.button
                  onClick={() => setPopupStep(1)}
                  aria-label="ストーリーをもう一度見る"
                  className="pointer-events-auto grid place-items-center rounded-full"
                  style={{
                    width: "clamp(72px, 12vw, 112px)",
                    height: "clamp(72px, 12vw, 112px)",
                    background: "transparent",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg viewBox="0 0 200 200" className="block w-full h-full" role="img" aria-hidden="true">
                    <defs>
                      <radialGradient id="mg-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="28%" stopColor="#c8f6ff" stopOpacity="0.85" />
                        <stop offset="60%" stopColor="#6be1ff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00c2ff" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="mg-ring" cx="50%" cy="50%" r="50%">
                        <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="95%" stopColor="#bff3ff" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
                      </radialGradient>
                      <linearGradient id="mg-flare" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="0.7" />
                        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                      <filter id="mg-soft" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.2" />
                      </filter>
                      <filter id="mg-strong" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" />
                      </filter>
                    </defs>

                    <circle cx="100" cy="100" r="94" fill="url(#mg-ring)" />
                    <g transform-origin="100 100">
                      <circle cx="100" cy="100" r="82" fill="none" stroke="#e9fdff" strokeOpacity="0.85" strokeWidth="2" />
                      <circle cx="100" cy="100" r="70" fill="none" stroke="#d7fbff" strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="6 6" />
                      {Array.from({ length: 16 }).map((_, i) => {
                        const a = (i * 22.5 * Math.PI) / 180;
                        const x = 100 + Math.cos(a) * 58;
                        const y = 100 + Math.sin(a) * 58;
                        return <circle key={i} cx={x} cy={y} r="2.4" fill="#ffffff" fillOpacity="0.9" />;
                      })}
                    </g>

                    <circle cx="100" cy="100" r="64" fill="url(#mg-core)" />
                    <rect x="18" y="98.5" width="164" height="3" fill="url(#mg-flare)" filter="url(#mg-soft)" />
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * 15 * Math.PI) / 180;
                      const rad = 78 + (i % 3) * 6;
                      const x = 100 + Math.cos(angle) * (rad / 2);
                      const y = 100 + Math.sin(angle) * (rad / 2);
                      return (
                        <circle
                          key={`p-${i}`}
                          cx={x}
                          cy={y}
                          r={i % 5 === 0 ? 2.2 : 1.2}
                          fill="#ffffff"
                          opacity={0.85 - (i % 4) * 0.18}
                          filter="url(#mg-soft)"
                        />
                      );
                    })}
                    <circle cx="100" cy="100" r="20" fill="#ffffff" opacity="0.95" filter="url(#mg-strong)" />
                  </svg>
                </motion.button>
              </div>

              {/* 🎫 チケット（クリックは画像部のみ）＋小さなオーラ */}
              <div className="relative">
                {/* オーラ：ラッパー直下（Linkの外）でクリック無効 */}
                <div
                  className="absolute inset-0 -z-[1] pointer-events-none flex items-center justify-center"
                  style={{
                    transform: "scale(0.92)", // ほぼ同心・少しだけ小さく
                    filter: "blur(1.2px)",
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: "90%", // チケットより僅かに大きい
                      height: "90%",
                      boxShadow:
                        "0 0 6px rgba(255,255,255,0.22), 0 0 12px rgba(0,200,255,0.20)",
                      animation: "gb-ticket-pulse 3.6s ease-in-out infinite alternate",
                    }}
                  />
                </div>

                {/* クリック可能なのはこの Link（= チケット本体）の範囲だけ */}
                <a
                  href="https://t.livepocket.jp/e/gachi2025"
                  aria-label="チケットを購入する"
                  className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 relative z-10"
                  rel="noopener"
                >
                  <div
                    className="rounded-full overflow-hidden"
                    style={{
                      width: "clamp(110px, 20vw, 160px)",
                      height: "clamp(110px, 20vw, 160px)",
                      padding: 4,
                      background: "transparent",
                    }}
                  >
                    <img
                      src="/ticket-btn.png"
                      alt="ガチ文高等学校の生徒になる"
                      className="block select-none pointer-events-auto rounded-full"
                      draggable={false}
                    />
                  </div>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Global Styles（既存はそのまま／新規は接頭辞 gb- で衝突回避） ===== */}
      <style jsx global>{`
        html,
        body {
          overflow-x: hidden;
        }

        /* 右下ボタン（光り方） */
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
        @keyframes tg-glow-scale {
          from {
            transform: scale(0.992);
          }
          to {
            transform: scale(1.008);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          /* 既存アニメ無効化のみ */
        }

        /* タイプライターの点滅カーソル */
        .tw-caret {
          display: inline-block;
          margin-left: 2px;
          animation: tw-blink 1s steps(1, end) infinite;
        }
        @keyframes tw-blink {
          0%,
          50% {
            opacity: 1;
          }
          50.01%,
          100% {
            opacity: 0;
          }
        }

        /* RPG風チップ（既存） */
        .rpg-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: clamp(28px, 3.8vw, 22px);
          line-height: 1;
          color: #fff;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.75) 100%),
            radial-gradient(120% 140% at 0% 0%, rgba(0, 180, 255, 0.25), transparent 60%);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 10px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 22px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          letter-spacing: 0.02em;
          position: relative;
          user-select: none;
        }
        .rpg-chip::after {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          opacity: 0.55;
          pointer-events: none;
        }
        .rpg-chip-deco {
          color: #7fe3ff;
          text-shadow: 0 0 8px rgba(0, 180, 255, 0.75);
          transform: translateY(-1px);
          font-size: 1.05em;
        }
        .rpg-chip-caret {
          margin-left: 4px;
          opacity: 0.9;
          animation: rpg-caret-pulse 1.4s ease-in-out infinite;
        }
        @keyframes rpg-caret-pulse {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0.7;
          }
          50% {
            transform: translateX(2px);
            opacity: 1;
          }
        }

        /* もちもの（既存） */
        .tg-inventory {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .tg-inv-label {
          font-size: clamp(9px, 2vw, 12px);
          line-height: 1;
          padding: 6px 10px;
          border-radius: 9999px;
          color: #111;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .tg-inv-label:hover {
          transform: translateY(-1px);
          background: #fff;
        }
        .tg-inv-grid {
          --inv-size: clamp(40px, 9vw, 56px);
          display: grid;
          grid-auto-flow: row;
          grid-template-columns: 1fr;
          grid-auto-rows: var(--inv-size);
          gap: 6px;
        }
        .tg-inv-slot {
          width: var(--inv-size);
          height: var(--inv-size);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.55) 100%),
            radial-gradient(120% 120% at 0% 0%, rgba(0, 180, 255, 0.12), transparent 60%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.04),
            0 8px 20px rgba(0, 0, 0, 0.12);
          display: grid;
          place-items: center;
        }
        .tg-inv-slot::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }
        .tg-inv-empty {
          background: linear-gradient(180deg, rgba(240, 242, 247, 0.85) 0%, rgba(235, 238, 245, 0.85) 100%),
            repeating-linear-gradient(45deg, transparent 0 8px, rgba(0, 0, 0, 0.03) 8px 16px);
          border-style: dashed;
          border-color: rgba(0, 0, 0, 0.12);
        }
        .tg-inv-item {
          width: 86%;
          height: 86%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        /* Nextボタンのキラン（既存） */
        .btn-glint {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0) 10%,
            rgba(255, 255, 255, 0.35) 45%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0.35) 55%,
            rgba(255, 255, 255, 0) 90%,
            rgba(255, 255, 255, 0) 100%
          );
          filter: blur(0.5px);
          height: 140%;
          animation: btn-glint-move 2.6s ease-in-out 0.9s infinite;
        }
        @keyframes btn-glint-move {
          0% {
            transform: translateX(-120%) skewX(-12deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          35% {
            transform: translateX(180%) skewX(-12deg);
            opacity: 0.9;
          }
          45% {
            opacity: 0;
          }
          100% {
            transform: translateX(180%) skewX(-12deg);
            opacity: 0;
          }
        }

        /* 新規：チケット用の控えめパルス（接頭辞 gb- で衝突回避） */
        @keyframes gb-ticket-pulse {
          0% {
            transform: scale(0.90);
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.18),
              0 0 12px rgba(0, 200, 255, 0.14);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.28),
              0 0 16px rgba(0, 200, 255, 0.22);
          }
        }
      `}</style>
    </section>
  );
}
