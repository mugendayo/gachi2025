// src/components/Hero.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [showCTA, setShowCTA] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-[70vh] grid place-items-center text-center overflow-hidden bg-white">
      {/* 動画：透過なし & 前面（z-20） */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-20"
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        poster="/og.jpg"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* ヒーローテキスト：動画よりさらに上（z-30） */}
      <div className="relative z-30 p-6 text-black">
        <h1 className="text-4xl md:text-6xl font-bold"></h1>
        <p className="mt-4 text-lg md:text-xl"></p>

        {/* 1秒後に出るCTA：最前面UI（z-40） */}
        <AnimatePresence>
          {showCTA && !open && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => setOpen(true)}
              className="mt-6 inline-flex items-center justify-center
                         text-base md:text-lg font-semibold
                         px-8 md:px-10 py-4 md:py-5
                         rounded-full bg-white hover:bg-white/95
                         shadow-lg ring-1 ring-black/10
                         backdrop-blur z-40"
            >
              クリックでミッションを表示
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 全画面ポップアップ（最前面） */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
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
                    onClick={() => setOpen(false)}
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
