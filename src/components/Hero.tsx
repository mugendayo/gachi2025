"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasSeenPopup, setHasSeenPopup] = useState(false); // 初回閲覧フラグ

  // 1秒後にCTA出現
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
    setHasSeenPopup(true); // ← ここで“見た”扱いにしてスクロール解禁
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

      {/* ヒーローテキスト（必要なら残す/消す） */}
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
              {/* 動画幅の約半分（端末に応じて可変） */}
              <img
                src="/tyb.gif"
                alt="クリックでミッションを表示"
                className="w-[50vw] md:w-[35vw] h-auto block drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ポップアップ（初期は表示しない。ボタンクリック時のみ） */}
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
    </section>
  );
}
