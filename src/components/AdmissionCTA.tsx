// src/components/AdmissionCTA.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function AdmissionCTA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ボタン（スクロールインで右→左にスライド登場） */}
      <motion.div
        initial={{ x: 40, opacity: 0, filter: "blur(2px)" }}
        whileInView={{ x: 0, opacity: 1, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="flex justify-center px-4"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="もっと知りたい！ガチ文高等学校について"
          className="group relative select-none cursor-pointer"
        >
          {/* 親のサイズでボタンサイズを管理 */}
          <div className="relative w-[min(92vw,740px)]">
            <div
              className={`
                rounded-[18px] px-6 md:px-10 py-5 md:py-7
                text-center w-full
                shadow-[0_12px_28px_rgba(0,0,0,.18)]
                ring-1 ring-black/5
                transition
                hover:translate-y-[-2px]
                active:translate-y-[0px]

               `}
              style={{
                background: "linear-gradient(180deg,#FFA91A 0%, #FF8A00 100%)",
              }}
            >
              {/* テクスチャ/ハイライト */}
              <span className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(120%_140%_at_0%_0%,rgba(255,255,255,.25),transparent_60%)] opacity-60 mix-blend-soft-light" />
              <span className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_1.5px_0_rgba(255,255,255,.65)]" />

              {/* ホバー時カラー強調（上に薄いグラデを足す） */}
              <span className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition"
                style={{ background: "linear-gradient(180deg,#FFBE3B00 0%, #FF9C1A66 100%)" }}
              />

              {/* 文字：2段 */}
              <div className="relative z-10">
                <div className={`
                  text-white font-extrabold tracking-wide leading-none
                  text-[28px] md:text-[40px] drop-shadow-[0_2px_0_rgba(0,0,0,.18)]
                `}>

                  もっと知りたい！
                </div>
                <div className={`mt-2 text-white/95 font-semibold tracking-wide text-[14px] md:text-[18px]`}>

                  <span className="mx-1">✿</span>
                  ガチ文高等学校について
                  <span className="mx-1">✿</span>
                </div>
              </div>

              {/* きらん（周期） */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/2 rotate-12 rounded-[18px]"
                style={{
                  background:
                    "linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.7)_50%,rgba(255,255,255,0)_100%)",
                  filter: "blur(2px)",
                }}
              >
              </span>
            </div>

            {/* ホバーで微拡大＆色変化 */}
            <style jsx>{`
              .group:hover > div { transform: scale(1.015); }
              .group:hover > div > span:first-child { opacity: .75; }
              .group:hover > span { animation: shine 1.2s ease-out both; }
              @keyframes shine {
                0%   { transform: translateX(-120%) rotate(12deg); opacity: 0; }
                20%  { opacity: .9; }
                100% { transform: translateX(220%) rotate(12deg); opacity: 0; }
              }
            `}</style>
          </div>
        </button>
      </motion.div>

      {/* ===== ポップアップ（折りたたみ→開くアニメ） ===== */}
      <AnimatePresence>
        {open && (
          <>
            {/* 背景 */}
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* ダイアログ */}
            <motion.div
              className="fixed inset-0 z-[1001] grid place-items-center p-5 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto relative w-[min(92vw,820px)] rounded-2xl bg-white shadow-2xl overflow-hidden"
                initial={{
                  clipPath: "inset(0 0 100% 0 round 16px)",
                  opacity: 0.6,
                }}
                animate={{
                  clipPath: "inset(0 0 0% 0 round 16px)",
                  opacity: 1,
                }}
                exit={{
                  clipPath: "inset(0 0 100% 0 round 16px)",
                  opacity: 0,
                }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* ヘッダー */}
                <div className="relative px-5 md:px-8 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                  <div className="text-lg md:text-xl font-bold text-gray-900">
                    アドミッション・ポリシー
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="閉じる"
                    className="absolute right-3 top-3 rounded-full border bg-white px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                </div>

                {/* 本文（ここに好きな内容を入れてOK） */}
                <div className="max-h-[78vh] overflow-y-auto px-5 md:px-8 py-6">
                  <p className="text-[15px] md:text-[16px] leading-relaxed text-gray-800">
                    ガチ文高等学校は「自分の青春を自分で面白くする人」を歓迎します。
                    “つくる・魅せる・巻き込む” の3つを大切に、文化祭という時間を
                    本気で遊び倒す仲間を募集しています。
                  </p>

                  <ul className="mt-5 space-y-3 text-[15px] text-gray-800">
                    <li>・自分の表現を持ち寄り、他者の表現をリスペクトできる人</li>
                    <li>・準備段階の泥臭さも楽しめる人</li>
                    <li>・観客ではなく“共犯者”として関わる意志のある人</li>
                  </ul>

                  <div className="mt-6 rounded-xl bg-orange-50 border border-orange-200 p-4">
                    <div className="font-bold text-orange-900">求める姿勢</div>
                    <p className="mt-1 text-[14px] md:text-[15px] text-orange-900/90 leading-relaxed">
                      小さく試し、早く見せ、みんなで改善する。<br/>
                      失敗を恐れず、プロセスをオープンに。
                    </p>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <a
                      href="#admission-detail"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center rounded-full bg-black text-white px-5 py-2 text-sm hover:opacity-90"
                    >
                      参加方法を見にいく
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
