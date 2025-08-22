"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasSeenPopup, setHasSeenPopup] = useState(false); // 初回閲覧フラグ

  // 初期：以前に見たことがあれば復元
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

  // ポップアップを見る前はスクロールロック
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

  const handleOpen = () => {
    setOpen(true);
    if (!hasSeenPopup) {
      setHasSeenPopup(true); // ← ここで“見た”扱いにしてスクロール解禁
      try {
        localStorage.setItem("gbf_seen_popup", "1");
      } catch {}
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <section className="relative h-[100svh] md:h-screen overflow-hidden bg-black">
      {/* 背景動画：全面フィット */}
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
        <h1 className="text-4xl md:text-6xl font-bold drop-shadow">ガチ文化祭 2025</h1>
        <p className="mt-3 text-lg md:text-xl drop-shadow">一生、文化祭前夜。</p>
      </div>

      {/* 台風GIF CTA（中央・大きめ） */}
      <AnimatePresence>
        {showCTA && !open && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <motion.button
              type="button"
              aria-label="ミッションを表示"
              onClick={handleOpen}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              {/* 画面幅の約半分（端末に応じて可変） */}
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

      {/* ポップアップ（クリック時のみ表示） */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            <motion.div
              className="fixed inset-0 z-[1001] grid place-items-center p-6"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <div className="max-w-xl w-full rounded-2xl bg-white p-8 text-center shadow-xl">
                <h2 className="text-2xl font-bold mb-3">ミッション</h2>
                <p className="text-lg leading-relaxed">
                  <span className="text-3xl font-semibold">“ガチな文化祭を作れ！”</span>
                  <br />
                  本気の仲間と、本気の一日を。あなたの一歩が会場の熱量を変える。
                </p>
                <div className="mt-8 flex justify-center gap-3">
                  <button
                    onClick={handleClose}
                    className="rounded-full border px-5 py-2 text-sm hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ▼ 右下：チケット購入ボタン（ポップアップを“見た”後だけ表示） */}
      <AnimatePresence>
        {hasSeenPopup && (
          <motion.div
            key="ticket-btn"
            className="fixed z-[60]"
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
              href="https://gachibun.studio.site/ticket" // 実URLに差し替え可
              aria-label="チケットを購入する"
              className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              rel="noopener"
            >
              <div className="rounded-full p-1 tg-glow-wrap">
                {/* 透明背景の購入ボタンGIF（例：/ticket-btn.gif） */}
                <img
                  src="/ticket-btn.png"
                  alt="TICKET"
                  width={112}
                  height={112}
                  className="block select-none pointer-events-none rounded-full tg-glow-img"
                  draggable={false}
                />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 発光アニメ＆低モーション対応（コンポーネント内に同梱） */}
      <style jsx global>{`
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
      `}</style>
    </section>
  );
}
