"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [popupStep, setPopupStep] = useState<0 | 1 | 2>(0); // 0=なし, 1=動画, 2=ストーリー
  const [hasSeenPopup, setHasSeenPopup] = useState(false);  // 終了後にtrue

  // STEP1の縦長動画参照（自動再生フォールバック用）
  const step1VideoRef = useRef<HTMLVideoElement | null>(null);

  // 初回：過去に完了済みなら復元
  useEffect(() => {
    try {
      const seen = typeof window !== "undefined" && localStorage.getItem("gbf_seen_popup") === "1";
      if (seen) setHasSeenPopup(true);
    } catch {}
  }, []);

  // 1秒後に中央CTA出現
  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // ポップアップ未完了の間はスクロールロック
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
  const goStep2  = () => setPopupStep(2);

  // STEP2のみ外側クリックで閉じる
  const finishPopup = () => {
    setPopupStep(0);
    if (!hasSeenPopup) {
      setHasSeenPopup(true);
      try { localStorage.setItem("gbf_seen_popup", "1"); } catch {}
    }
  };

  // STEP1 の動画を開いたら自動再生フォールバック
  useEffect(() => {
    if (popupStep === 1 && step1VideoRef.current) {
      const v = step1VideoRef.current;
      // 一応、再生試行を2回ほど
      const tryPlay = () => {
        const p = v.play?.();
        if (p && typeof p.then === "function") p.catch(() => {});
      };
      tryPlay();
      const t = setTimeout(tryPlay, 250);
      return () => clearTimeout(t);
    }
  }, [popupStep]);

  // テキストのステップ表示用 variants
  const vContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const vItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };

  return (
    <section className="relative h-[100svh] md:h-screen overflow-hidden bg-black">
      {/* 背景動画 */}
      <video
        className="absolute inset-0 z-10 w-full h-full object-cover"
        autoPlay muted playsInline loop preload="metadata" poster="/og.jpg"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* ヒーローテキスト */}
      <div className="absolute inset-x-0 top-10 z-20 text-center px-6 text-white">
        <h1 className="text-4xl md:text-6xl font-bold drop-shadow">ガチ文化祭 2025</h1>
        <p className="mt-3 text-lg md:text-xl drop-shadow">一生、文化祭前夜。</p>
      </div>

      {/* 中央CTA：画像クリックで STEP1 を開く */}
      <AnimatePresence>
        {showCTA && popupStep === 0 && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <motion.button
              type="button"
              aria-label="ミッション動画を表示"
              onClick={openStep1}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              <img
                src="/tyb.gif"
                alt="クリックでミッションを表示"
                className="w-[50vw] md:w-[35vw] h-auto block drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ===== ポップアップ（STEP1: 縦長映像 / STEP2: テキスト） ===== */}
      <AnimatePresence>
        {popupStep !== 0 && (
          <>
            {/* 背景：STEP2のみクリックで閉じる */}
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={popupStep === 2 ? finishPopup : undefined}
              aria-hidden={popupStep !== 2}
            />

            {/* ラッパーはクリック透過、モーダル本体のみ操作可 */}
            <motion.div
              className="fixed inset-0 z-[1001] grid place-items-center p-6 pointer-events-none"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                key={`step-${popupStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-auto"
              >
                {popupStep === 1 ? (
                  /* --- STEP1: 縦長映像＋最上位“次へ”ボタン --- */
                  <div
                    className="relative mx-auto rounded-2xl overflow-hidden shadow-xl bg-black"
                    /* スマホでも大きく見せつつ、縦横比9:16を維持 */
                    style={{
                      width: "min(92vw, 480px)",
                      aspectRatio: "9 / 16",
                    }}
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
                      poster="/goal-poster.jpg" // 任意：用意がなければ削除OK
                      onCanPlay={() => {
                        // 念のためもう一度再生を試みる
                        try { step1VideoRef.current?.play?.(); } catch {}
                      }}
                    >
                      <source src="/goal.mp4" type="video/mp4" />
                    </video>

                    {/* 読ませるための下部グラデ（任意） */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* ★ 最上位レイヤーの“次へ”ボタン（下段中央） */}
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
                  /* --- STEP2: ストーリー（テキスト） --- */
                  <div className="max-w-xl w-[min(92vw,640px)] rounded-2xl bg-white p-8 text-center shadow-xl">
                    <motion.h2
                      className="text-2xl font-bold mb-3"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      ストーリー
                    </motion.h2>

                    <motion.div
                      variants={vContainer}
                      initial="hidden"
                      animate="show"
                      className="text-lg leading-relaxed text-left space-y-3"
                    >
                      <motion.p variants={vItem}>
                        やあこんにちは！君はいま、<b>ガチ文高等学校</b>に生徒としてタイムスリップしてきたんだよ。
                      </motion.p>
                      <motion.p variants={vItem}>
                        もちろん授業もあるし、体育祭もあるみたい。街のみんなも文化祭を楽しみにしている。
                      </motion.p>
                      <motion.p variants={vItem}>
                        君がタイムスリップしてきたことが<b>バレないように</b>、<b>最高の文化祭</b>を作ってくれ！
                      </motion.p>
                    </motion.div>

                    <div className="mt-8 flex justify-center gap-3">
                      <button
                        onClick={finishPopup}
                        className="rounded-full border px-5 py-2 text-sm hover:bg-gray-50"
                      >
                        閉じる
                      </button>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                      ※ この画面の外側をクリックしても閉じられます
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 右下：チケット購入ボタン（STEP2を閉じた後に出現） */}
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

      {/* スタイル：発光＆レスポンシブサイズ */}
      <style jsx global>{`
        .tg-ticket-wrap {
          --btn-size: clamp(120px, 20vw, 340px);
        }
        .tg-ticket-img { width: var(--btn-size); height: var(--btn-size); }

        @keyframes tg-fade-in {
          0% { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tg-glow {
          0% { filter: drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(0,180,255,0)); }
          100% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 18px rgba(0,180,255,0.6)); }
        }
        .tg-glow-wrap { animation: tg-fade-in 0.8s ease-out 0.4s both; border-radius: 9999px; }
        .tg-glow-img  { animation: tg-glow 2.2s ease-in-out 1.2s infinite alternate; border-radius: 9999px; }

        @media (prefers-reduced-motion: reduce) {
          .tg-glow-wrap, .tg-glow-img { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
