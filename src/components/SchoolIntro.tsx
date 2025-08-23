"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GalleryItem = { src: string; caption?: string };

type Person = {
  role: "principal" | "vice";
  name: string;
  title: string;
  bio: string;
  thumb: string;       // カードのサムネ
  gallery: GalleryItem[]; // 縦長 9:16 推奨を10枚まで
};

// ---- ダミーデータ（必要に応じ差し替え） ----
const PRINCIPAL: Person = {
  role: "principal",
  name: "しまじろうとTシャツのつかね",
  title: "ガチ文高等学校 校長",
  bio: "“いつでも高校生に戻れる社会をつくる” を合言葉に、生徒一人ひとりに青い春と希望を与える。前職はマザーテレサ。趣味は世界平和。",
  thumb: "/principal/thumb.jpg",
   gallery: Array.from({ length: 10 }).map((_, i) => ({
    src: `/principal/v/${String(i + 1).padStart(2, "0")}.jpg`,
    caption: `校長ギャラリー ${i + 1}/10`,
  })),
};

const VICE: Person = {
  role: "vice",
  name: "エンザントモアキ",
  title: "ガチ文高等学校 教頭",
  bio: "現実主義で“仕組みで青春”を推進。高校時代の文化祭そして使われなくなった廃校に命を芽吹くことに命を賭ける。前職は宮代健太。趣味は多拠点生活。",
  thumb: "/vice/thumb.png",
  gallery: Array.from({ length: 10 }).map((_, i) => ({
    src: `/vice/v/${String(i + 1).padStart(2, "0")}.jpg`,
    caption: `教頭ギャラリー ${i + 1}/10`,
  })),
};
export default function SchoolIntro() {
  const [open, setOpen] = useState<null | Person>(null);
  const [gidx, setGidx] = useState(0);

  const openModal = (p: Person) => {
    setOpen(p);
    setGidx(0);
  };
  const closeModal = () => setOpen(null);

  // スワイプで次/前へ
  const swipeThreshold = 80;
  const onDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (!open) return;
    if (info.offset.x < -swipeThreshold) setGidx((i) => Math.min(i + 1, open.gallery.length - 1));
    else if (info.offset.x > swipeThreshold) setGidx((i) => Math.max(i - 1, 0));
  };

  return (
     <section
        id="about-gachibun"
        className="relative overflow-hidden text-white min-h-[60vh] bg-black bg-cover bg-center"
                style={{ backgroundImage: "url('/school/bg-vert.jpg')" }}
            >
            {/* うっすら暗幕 */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* 以降のコンテンツ */}
            <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24">
            </div>

      {/* ▼ スロー文字：校舎画像の「上」／ボタンの「下」レイヤ */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute -left-[50vw] top-1/3 whitespace-nowrap text-[8vw] font-extrabold tracking-widest animate-marquee opacity-[0.06]">
          魂の熱量がすべてを変える！　タイムマシーンをつくってます　目に見えない大切なもの
        </div>
        <div className="absolute -left-[40vw] top-[60%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-slow opacity-[0.06]">
          SASUKEを作りたい　ガチ文化祭=人生　自己実現のMVPを作り続ける
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24">
        {/* 見出し */}
        <motion.h2
          className="text-2xl md:text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          ガチ文高等学校ってなに？
        </motion.h2>

        {/* ================== 横長カード #1 ================== */}
        <div className="relative mb-10">
          {/* 画像（下層） */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <img
              src="/school/campus-hero-1.jpg"  /* ← 1枚目 */
              alt="ガチ文高等学校の様子 1"
              className="w-full h-auto object-cover aspect-[16/9]"
              draggable={false}
            />
          </motion.div>

          {/* 教頭カード（1枚目の右上・最上層） */}
         <motion.button
            onClick={() => openModal(VICE)}
            className="group absolute right-0 -top-12 md:-top-20 bg-white/10 backdrop-blur rounded-2xl ring-1 ring-white/15 overflow-hidden hover:bg-white/15 transition z-30 bg-black/0 hover:bg-black/10
             rounded-2xl ring-1 ring-white/25 overflow-hidden transition"
            initial={{ opacity: 0, x: 12, y: -12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            aria-label="教頭のプロフィールを開く"
            >
                <div className="flex items-center gap-6 p-6 pr-8">
                <img src={VICE.thumb} alt={VICE.name} className="h-32 w-32 rounded-2xl object-cover ring-2 ring-white/20" />
                <div className="text-left">
                <div className="text-lg md:text-xl text-white/85" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{VICE.title}</div>
                <div className="text-2xl md:text-3xl font-bold" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>{VICE.name}</div>
                <div className="text-base text-white/80 mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>クリックでプロフィールを見る</div>
                </div>
            </div>
            </motion.button>
        </div>

        {/* ================== 横長カード #2 ================== */}
        <div className="relative">
          {/* 画像（下層） */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <img
              src="/school/campus-hero-2.jpg"  /* ← 2枚目 */
              alt="ガチ文高等学校の様子 2"
              className="w-full h-auto object-cover aspect-[16/9]"
              draggable={false}
            />
          </motion.div>

          {/* 校長カード（2枚目の左下・最上層） */}
            <motion.button
                onClick={() => openModal(PRINCIPAL)}
                className="group absolute left-0 translate-y-1/2 md:translate-y-1/3 -bottom-12 md:-bottom-20 bg-white/10 backdrop-blur rounded-2xl ring-1 ring-white/15 overflow-hidden hover:bg-white/15 transition z-30 bg-black/0 hover:bg-black/10
             rounded-2xl ring-1 ring-white/25 overflow-hidden transition"
                initial={{ opacity: 0, x: -12, y: 12 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55 }}
                aria-label="校長のプロフィールを開く"
                >
                <div className="flex items-center gap-6 p-6 pr-8">
                <img src={PRINCIPAL.thumb} alt={PRINCIPAL.name} className="h-32 w-32 rounded-2xl object-cover ring-2 ring-white/20" />
                <div className="text-left">
                <div className="text-lg md:text-xl text-white/85" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{PRINCIPAL.title}</div>
                <div className="text-2xl md:text-3xl font-bold" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>{PRINCIPAL.name}</div>
                <div className="text-base text-white/80 mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>クリックでプロフィールを見る</div>
                </div>
            </div>
            </motion.button>
        </div>

        {/* アドミッション・ポリシー CTA */}
        <motion.div
          className="mt-24 md:mt-28 flex justify-center"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <a
            href="/admission"
            className="inline-flex items-center gap-3 rounded-full bg-white text-black px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold hover:bg-white/95 ring-4 ring-white/10 hover:ring-white/20 transition"
          >
            アドミッション・ポリシーを見る
            <svg width="22" height="22" viewBox="0 0 24 24" className="inline-block">
              <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </a>
        </motion.div>
      </div>

      {/* ===== モーダル（校長/教頭） ===== */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div
              className="fixed inset-0 z-[1001] grid place-items-center p-4 md:p-8"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              aria-modal="true"
              role="dialog"
            >
              <div className="relative w-[min(96vw,1100px)] max-h-[90vh] bg-white text-black rounded-2xl overflow-hidden shadow-2xl grid md:grid-cols-[380px_1fr]">
                {/* 左：プロフィール */}
                <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r">
                  <div className="flex items-center gap-3">
                    <img
                      src={open.thumb}
                      alt={open.name}
                      className="h-16 w-16 rounded-xl object-cover"
                      draggable={false}
                    />
                    <div>
                      <div className="text-sm text-black/60">{open.title}</div>
                      <div className="text-lg font-bold">{open.name}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-black/80">{open.bio}</p>
                  <button
                    onClick={closeModal}
                    className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border hover:bg-black/5"
                  >
                    × 閉じる
                  </button>
                  <div className="mt-4 text-xs text-black/50">
                    ←→ スワイプ／ドラッグで写真を切り替え
                  </div>
                </div>

                {/* 右：縦長ギャラリー（スワイプで切替） */}
                <div className="relative bg-black">
                  <motion.div
                    key={open.role + gidx}
                    className="h-full grid place-items-center p-3 md:p-6"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={onDragEnd}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative w-[min(88vw,420px)] aspect-[9/16] overflow-hidden rounded-xl ring-1 ring-white/20 shadow-xl">
                      <img
                        src={open.gallery[gidx]?.src}
                        alt={open.gallery[gidx]?.caption ?? ""}
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </motion.div>

                  {/* キャプション & ナビ */}
                  <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-between text-white text-sm">
                      <div className="opacity-90">{open.gallery[gidx]?.caption}</div>
                      <div className="opacity-75">
                        {gidx + 1} / {open.gallery.length}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between gap-2">
                      <button
                        onClick={() => setGidx((i) => Math.max(i - 1, 0))}
                        className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => setGidx((i) => Math.min(i + 1, open.gallery.length - 1))}
                        className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm"
                      >
                        次へ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* スクロール背景テキストのアニメーションCSS */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
        .animate-marquee-slow {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  );
}