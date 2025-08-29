"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import SummonCTA from "../components/SummonCTA";

const vLine = {
  hidden: { opacity: 0, y: 8, filter: "blur(2px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.42, ease: "easeOut" } },
} satisfies Variants;

const step2Lines = [
  "生徒証を手に入れたのね！ガチ文高等学校へようこそ！",
  "きみは「生徒」としてタイムスリップしてきたのよ！さあ、文化祭の準備をしなくっちゃ！",
];

export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [popupStep, setPopupStep] = useState<0 | 1 | 2>(0);
  const [hasSeenPopup, setHasSeenPopup] = useState(false);
  const step1VideoRef = useRef<HTMLVideoElement | null>(null);

  // ★ 校章の取得フラグ（インベントリ表示用）
  const [crestAcquired, setCrestAcquired] = useState(false);

  // ===== タイプライター =====
  const lines = step2Lines;
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typeSpeed = 34;

  const startTyping = (text: string) => {
    setTyped(""); setIsTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      i++; setTyped(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setIsTyping(false); }
    }, typeSpeed);
  };
  const revealAll = () => { if (isTyping) { setTyped(lines[lineIdx]); setIsTyping(false); } };
  const nextLine = () => {
    if (lineIdx < lines.length - 1) {
      const next = lineIdx + 1; setLineIdx(next); startTyping(lines[next]);
    }
  };

  // ===== 初期化・状態復元 =====
  useEffect(() => {
    try {
      const seen = typeof window !== "undefined" && localStorage.getItem("gbf_seen_popup") === "1";
      setHasSeenPopup(seen); setPopupStep(0); setShowCTA(!seen);

      // 取得済み校章
      setCrestAcquired(localStorage.getItem("gbf_crest_acquired") === "1");

      // デバッグ用: リセット関数
      // @ts-ignore
      window.__resetCrest = () => localStorage.removeItem("gbf_crest_acquired");
    } catch { setHasSeenPopup(false); setPopupStep(0); setShowCTA(true); }
  }, []);

  // StageIntro が取得完了時に投げるカスタムイベントで同一タブ更新
  useEffect(() => {
    const onAcq = () => {
      setCrestAcquired(true);
      try { localStorage.setItem("gbf_crest_acquired", "1"); } catch {}
    };
    window.addEventListener("crest:acquired", onAcq);
    return () => window.removeEventListener("crest:acquired", onAcq);
  }, []);

  // 別タブ同期（同一タブには発火しないが一応）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "gbf_crest_acquired") setCrestAcquired(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => { if (popupStep === 2) { setLineIdx(0); startTyping(lines[0]); } }, [popupStep]); // eslint-disable-line

  useEffect(() => {
    if (hasSeenPopup) { setShowCTA(false); return; }
    const t = setTimeout(() => setShowCTA(true), 1000);
    return () => clearTimeout(t);
  }, [hasSeenPopup]);

  useEffect(() => {
    const lock = popupStep !== 0;
    const html = document.documentElement, body = document.body;
    if (lock) {
      html.style.overflow = "hidden"; body.style.overscrollBehavior = "none";
      const prevent = (e: TouchEvent) => e.preventDefault();
      body.addEventListener("touchmove", prevent, { passive: false });
      return () => { body.removeEventListener("touchmove", prevent); html.style.overflow = ""; body.style.overscrollBehavior = ""; };
    } else { html.style.overflow = ""; body.style.overscrollBehavior = ""; }
  }, [popupStep]);

  useEffect(() => {
    const lock = !hasSeenPopup;
    const html = document.documentElement, body = document.body;
    if (lock) {
      html.style.overflow = "hidden"; body.style.overscrollBehavior = "none";
      const prevent = (e: TouchEvent) => e.preventDefault();
      body.addEventListener("touchmove", prevent, { passive: false });
      return () => { body.removeEventListener("touchmove", prevent); html.style.overflow = ""; body.style.overscrollBehavior = ""; };
    } else { html.style.overflow = ""; body.style.overscrollBehavior = ""; }
  }, [hasSeenPopup]);

  const openStep1 = () => setPopupStep(1);
  const goStep2   = () => setPopupStep(2);

  const finishPopup = () => {
    setPopupStep(0);
    if (!hasSeenPopup) {
      setHasSeenPopup(true); setShowCTA(false);
      try { localStorage.setItem("gbf_seen_popup", "1"); } catch {}
    }
  };

  useEffect(() => {
    if (popupStep === 1 && step1VideoRef.current) {
      const v = step1VideoRef.current;
      const tryPlay = () => { const p = v.play?.(); if (p && typeof p.then === "function") p.catch(() => {}); };
      tryPlay(); const t = setTimeout(tryPlay, 250); return () => clearTimeout(t);
    }
  }, [popupStep]);

  const cardButtons = useMemo(() => ([
    { label: "わかばガイド",  href: "/link-1", color: "from-amber-400 to-orange-500 text-white" },
    { label: "去年の動画",    href: "/link-2", color: "from-sky-400 to-blue-600 text-white" },
    { label: "第1回目の動画", href: "/link-3", color: "from-emerald-400 to-teal-600 text-white" },
  ]), []);

  return (
    <section className="relative min-h-[100svh] md:min-h-screen mb-0">
      {/* 背景動画 */}
      <div className="sticky top-0 h-[100svh] z-0 relative pointer-events-none">
        <video className="w-full h-full object-cover" autoPlay muted playsInline loop preload="metadata" poster="/og.jpg">
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 中央CTA */}
      <AnimatePresence>
        {showCTA && popupStep === 0 && (
          <div className={hasSeenPopup ? "relative z-20 mt-14 flex justify-center" : "fixed inset-0 z-[1200] grid place-items-center"}>
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
            <motion.div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={finishPopup} aria-hidden="true" />
            <motion.div className="fixed inset-0 z-[1001] grid place-items-center p-6 pointer-events-none" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }} aria-modal="true" role="dialog" tabIndex={-1} onKeyDown={(e)=>{ if(e.key==="Escape") finishPopup(); }}>
              <motion.div key={`step-${popupStep}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }} className="pointer-events-auto" onClick={(e)=>e.stopPropagation()}>
                {popupStep === 1 ? (
                  // STEP1: 縦動画
                  <div className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-black" style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}>
                    <video ref={step1VideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline controls={false} loop={false} preload="metadata" poster="/goal-poster.jpg" onCanPlay={()=>{ try { step1VideoRef.current?.play?.(); } catch {} }}>
                      <source src="/goal.mp4" type="video/mp4" />
                    </video>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
                    <div className="absolute inset-x-0 bottom-5 flex justify-center">
                      <div className="flex flex-col items-center">
                        <motion.button onClick={goStep2} aria-label="次へ" className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group cursor-pointer" style={{ width: "clamp(160px, 40vw, 280px)" }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: [0.92, 1.06, 1.0] }} transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                          <img src="/btn-next.png" alt="" className="block w-full h-auto select-none pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,.45)] transition will-change-transform" draggable={false} />
                          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"><span className="btn-glint block absolute -inset-y-2 -left-1/3 w-1/2 rotate-12" /></span>
                          <span className="sr-only">次へ</span>
                        </motion.button>
                        <motion.div onClick={goStep2} role="button" tabIndex={0} className="rpg-chip cursor-pointer select-none -mt-14" initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.35, ease: "easeOut" }}>
                          <span className="rpg-chip-deco" aria-hidden>◆</span>生徒証を拾う<span className="rpg-chip-caret" aria-hidden>▸</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // STEP2: 妖精のセリフ
                  <div className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-gradient-to-b from-blue-50 to-white" style={{ width: "min(92vw, 480px)", aspectRatio: "9 / 16" }}>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="flex flex-col items-center -translate-y-4 w-full px-4">
                        <motion.img src="/fairy.png" alt="妖精" className="w-40 md:w-52 h-auto select-none pointer-events-none mb-5" draggable={false} animate={{ y: [0, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
                        <motion.button type="button" onClick={() => (isTyping ? revealAll() : nextLine())} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-[92%] md:w-[85%] bg-white/95 border-2 border-gray-300 rounded-xl shadow-lg p-4 md:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400" style={{ fontFamily: "DotGothic16, system-ui, sans-serif", minHeight: 120 }}>
                          <p className="text-[17px] md:text-[18px] leading-relaxed text-gray-800 break-words">{typed}{isTyping && <span className="tw-caret">▋</span>}</p>
                          <div className="mt-2 text-[11px] text-gray-500 select-none">{isTyping ? "タップで全文表示" : lineIdx < lines.length - 1 ? "タップで次のセリフ" : "下のボタンで閉じる"}</div>
                        </motion.button>
                        <div className="mt-9 flex justify-center w-full">
                          <button onClick={finishPopup} className="px-5 py-2 text-sm rounded-full bg-pink-500 text-white shadow hover:bg-pink-600 transition">閉じる</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      

      {/* ===== 前景：STEP2終了後のコンテンツ ===== */}
      {hasSeenPopup && (
        <div className="relative z-20 mx-auto max-w-5xl px-6 pt-16 pb-28 text-white">
          <div className="flex justify-center"></div>

          <h2 className="mt-10 text-2xl md:text-3xl font-bold">
            ガチ文化祭2025
          </h2>
          <p className="mt-4 opacity-90">
            2025年11月1日（土）～3日（祝）
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 place-items-center">
            {cardButtons.map((btn) => (
              <a
                key={btn.href}
                href={btn.href}
                className={[
                  // サイズ：画像の“半分くらい”想定（上限320px）
                  "w-[90%] max-w-[320px] sm:w-full",
                  "h-14 rounded-full px-6",
                      "flex items-center justify-center",
                      "bg-gradient-to-b " + btn.color,
                      "text-base font-semibold tracking-wide text-white",
                      "shadow-[0_8px_20px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                      "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)]",
                      "relative overflow-hidden",
                  // 色（カードごとに違う）＋グラデ
                  "bg-gradient-to-b " + btn.color,
                  // 文字
                  "text-center text-base font-semibold tracking-wide",
                  // 影と動き
                  "shadow-[0_8px_20px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                  "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)]",
                  "relative overflow-hidden",
                ].join(" ")}
              >
                {/* 上面ハイライト（任意） */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/10" />
                {/* 斜めの“キラン”（既存の .btn-glint を流用） */}
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span className="btn-glint block absolute -inset-y-2 -left-1/3 w-1/2 rotate-12" />
                </span>
                <span className="relative z-10">{btn.label}</span>
              </a>
            ))}
          </div>


        </div>
      )}

{/* ===== 左上：もちもの（常時DOMに存在・表示はフェード） ===== */}
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
    {/* 生徒証（既存） */}
    <button type="button" className="tg-inv-slot tg-inv-hasitem" onClick={() => setPopupStep(2)}>
      <img src="/btn-next.png" alt="" className="tg-inv-item tg-glow-img" />
    </button>

    {/* 校章の着地点（空でも常時存在） */}
    <div id="inv-crest-slot" className="tg-inv-slot tg-inv-empty" aria-hidden />

    {/* 予備スロット */}
    <div className="tg-inv-slot tg-inv-empty" aria-hidden />
  </div>
</div>

      {/* ===== 右下：魔法陣（上）＋チケット（下） ===== */}
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
            {/* ✨ 魔法陣（参考画像風） */}
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
              <svg
                viewBox="0 0 200 200"
                className="block w-full h-full"
                role="img"
                aria-hidden="true"
              >
                <defs>
                  {/* 中央グロー */}
                  <radialGradient id="mg-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="28%" stopColor="#c8f6ff" stopOpacity="0.85" />
                    <stop offset="60%" stopColor="#6be1ff" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00c2ff" stopOpacity="0" />
                  </radialGradient>
                  {/* 外周の淡いリング */}
                  <radialGradient id="mg-ring" cx="50%" cy="50%" r="50%">
                    <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="95%" stopColor="#bff3ff" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
                  </radialGradient>
                  {/* レンズフレア用の線形グラデ */}
                  <linearGradient id="mg-flare" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0.7" />
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  {/* ぼかしフィルタ */}
                  <filter id="mg-soft" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.2" />
                  </filter>
                  <filter id="mg-strong" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                </defs>

                {/* 背面ほのかなリング */}
                <circle cx="100" cy="100" r="94" fill="url(#mg-ring)" />

                {/* 外周線（ゆる回転する装飾） */}
                <g transform-origin="100 100">
                  <circle
                    cx="100"
                    cy="100"
                    r="82"
                    fill="none"
                    stroke="#e9fdff"
                    strokeOpacity="0.85"
                    strokeWidth="2"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="#d7fbff"
                    strokeOpacity="0.7"
                    strokeWidth="1.4"
                    strokeDasharray="6 6"
                  />
                  {/* ルーン点 */}
                  {Array.from({ length: 16 }).map((_, i) => {
                    const a = (i * 22.5 * Math.PI) / 180;
                    const x = 100 + Math.cos(a) * 58;
                    const y = 100 + Math.sin(a) * 58;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.4"
                        fill="#ffffff"
                        fillOpacity="0.9"
                      />
                    );
                  })}
                </g>

                {/* 中央コアの発光円盤（透明） */}
                <circle cx="100" cy="100" r="64" fill="url(#mg-core)" />

                {/* レンズフレア横線 */}
                <rect
                  x="18"
                  y="98.5"
                  width="164"
                  height="3"
                  fill="url(#mg-flare)"
                  filter="url(#mg-soft)"
                />

                {/* パーティクル（小さな光点） */}
                {Array.from({ length: 24 }).map((_, i) => {
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

                {/* 中心一番明るいグロー */}
                <circle
                  cx="100"
                  cy="100"
                  r="20"
                  fill="#ffffff"
                  opacity="0.95"
                  filter="url(#mg-strong)"
                />
              </svg>
            </motion.button>

            {/* 🎟 チケット（下） */}
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
                  className="block select-none pointer-events-none rounded-full tg-glow-img"
                  style={{
                    width: "clamp(90px, 18vw, 130px)",
                    height: "clamp(90px, 18vw, 130px)",
                  }}
                  draggable={false}
                />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== スタイル ===== */}
      <style jsx global>{`
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

        /* RPG風チップ */
        .rpg-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: clamp(12px, 2.6vw, 14px);
          line-height: 1;
          color: #fff;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.75) 100%),
            radial-gradient(120% 140% at 0% 0%, rgba(0, 180, 255, 0.25), transparent 60%);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 10px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08),
            0 8px 22px rgba(0, 0, 0, 0.35);
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

        /* もちもの */
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
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.04), 0 8px 20px rgba(0, 0, 0, 0.12);
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

        /* Nextボタンのキラン */
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
      `}</style>
    </section>
  );
}

