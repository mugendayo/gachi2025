"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion"; 

type GalleryItem = { src: string; caption?: string };

type Person = {
  role: "principal" | "vice";
  name: string;
  title: string;
  bio: string;
  thumb: string;        // アイコン画像（正方形推奨）
  gallery: GalleryItem[]; // 縦長 9:16 推奨
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
  const onDragEnd = (
  _ev: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo
) => {
  if (!open) return;
  const dx = info.offset.x ?? 0;
  if (dx < -swipeThreshold) setGidx((i) => Math.min(i + 1, open.gallery.length - 1));
  else if (dx > swipeThreshold) setGidx((i) => Math.max(i - 1, 0));
};

  return (
    <section id="about-gachibun" className="relative isolate overflow-x-hidden bg-black text-white">
      {/* ▼ セクション背景（imgのまま・スタッキング安定） */}
      <div className="absolute inset-0 z-0">
        <img
          src="/school/bg-vert.jpg"   /* public/school/bg-vert.jpg */
          alt=""
          className="w-full h-full object-cover object-center block"
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* ▼ スロー文字（画像カードの上、ボタンの下） */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute -left-[50vw] top-1/3 whitespace-nowrap text-[8vw] font-extrabold tracking-widest animate-marquee opacity-[0.06]">
          魂の熱量がすべてを変える！　タイムマシーンをつくってます　目に見えない大切なもの
        </div>
        <div className="absolute -left-[40vw] top-[60%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-slow opacity-[0.06]">
          SASUKEを作りたい　ガチ文化祭=人生　自己実現のMVPを作り続ける
        </div>
      </div>

      {/* コンテンツ */}
      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24 pb-36 md:pb-44">
        {/* 見出し */}
        <motion.h2
          className="text-2xl md:text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          ガチ文高等学校はどんな学校？
        </motion.h2>

        {/* ================== 横長カード #1（教頭ボタン：右上） ================== */}
        <div className="relative mb-28 md:mb-36">
          {/* 画像（下層） */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <img
              src="/school/campus-hero-1.jpg"
              alt="ガチ文高等学校の様子 1"
              className="w-full h-auto object-cover aspect-[16/9] block"
              draggable={false}
            />
          </motion.div>
          {/* ▼ 1枚目と2枚目の “間・中央” CTA（重なり配置） */}
            <motion.a
              href="/admission"
              className="gb-cta group absolute left-1/2 bottom-0 z-40 -translate-x-1/2 translate-y-1/2"
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <span className="relative inline-flex items-center gap-3 rounded-full px-7 py-3 md:px-9 md:py-4 font-semibold text-black bg-white/95 hover:bg-white focus-visible:ring-4 focus-visible:ring-white/40 transition shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
                アドミッション・ポリシーを見る
                <svg width="22" height="22" viewBox="0 0 24 24" className="inline-block">
                  <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                {/* 左→右の“キラン” */}
                <span className="pointer-events-none absolute -inset-1 overflow-hidden rounded-full">
                  <span className="gb-shine absolute -left-1/2 top-0 h-full w-[55%]" />
                </span>
              </span>
            </motion.a>

          {/* 教頭ボタン（アイコン拡大・右に傾け・丸・高透過／文字は読める） */}
          <motion.button
            onClick={() => openModal(VICE)}
            className="group absolute right-0 -top-12 md:-top-20 z-30 rounded-2xl
                       ring-1 ring-white/30 bg-black/5 hover:bg-black/10 backdrop-blur-[2px] transition"
            initial={{ opacity: 0, x: 12, y: -12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            aria-label="教頭のプロフィールを開く"
          >
            <div className="flex items-center gap-6 p-6 pr-8">
              {/* アイコンだけ傾ける＆柔らか影 */}
              <div className="relative">
                <img
                  src={VICE.thumb}
                  alt={VICE.name}
                  className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover ring-2 ring-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] rotate-[10deg]                  "
                  draggable={false}
                />
                <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
              </div>

              {/* テキストは読みやすく（テキストシャドウ） */}
              <div className="text-left">
                <div className="text-lg md:text-xl text-white/85" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                  {VICE.title}
                </div>
                <div className="text-2xl md:text-3xl font-bold" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
                  {VICE.name}
                </div>
                <div className="text-base text-white/80 mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                  クリックでプロフィールを見る
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* ================== 横長カード #2（校長ボタン：左下） ================== */}
        <div className="relative mb-24 md:mb-32">
          {/* 画像（下層） */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <img
              src="/school/campus-hero-2.jpg"
              alt="ガチ文高等学校の様子 2"
              className="w-full h-auto object-cover aspect-[16/9] block"
              draggable={false}
            />
          </motion.div>
          

          {/* 校長ボタン（アイコン拡大・左に傾け・丸・高透過／文字は読める） */}
          <motion.button
            onClick={() => openModal(PRINCIPAL)}
            className="group absolute left-0 translate-y-1/2 md:translate-y-1/3 -bottom-12 md:-bottom-20 z-30 rounded-2xl
                       ring-1 ring-white/30 bg-black/5 hover:bg-black/10 backdrop-blur-[2px] transition"
            initial={{ opacity: 0, x: -12, y: 12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            aria-label="校長のプロフィールを開く"
          >
            <div className="flex items-center gap-6 p-6 pr-8">
              <div className="relative">
                <img
                  src={PRINCIPAL.thumb}
                  alt={PRINCIPAL.name}
                  className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover ring-2 ring-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] -rotate-[10deg]"
                  draggable={false}
                />
                <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
              </div>

              <div className="text-left">
                <div className="text-lg md:text-xl text-white/85" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                  {PRINCIPAL.title}
                </div>
                <div className="text-2xl md:text-3xl font-bold" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
                  {PRINCIPAL.name}
                </div>
                <div className="text-base text-white/80 mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                  クリックでプロフィールを見る
                </div>
              </div>
            </div>
          </motion.button>
        </div>
        </div> {/* コンテンツここまで */}

      {/* モーダル */}
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
                    <img src={open?.thumb} alt={open?.name ?? ""} className="h-16 w-16 rounded-xl object-cover" draggable={false} />
                    <div>
                      <div className="text-sm text-black/60">{open?.title}</div>
                      <div className="text-lg font-bold">{open?.name}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-black/80">{open?.bio}</p>
                  <button onClick={closeModal} className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border hover:bg-black/5">
                    × 閉じる
                  </button>
                  <div className="mt-4 text-xs text-black/50">←→ スワイプ／ドラッグで写真を切り替え</div>
                </div>

                {/* 右：縦長ギャラリー */}
                <div className="relative bg-black">
                  <motion.div
                    key={(open?.role ?? "p") + gidx}
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
                        src={open?.gallery[gidx]?.src}
                        alt={open?.gallery[gidx]?.caption ?? ""}
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </motion.div>

                  <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-between text-white text-sm">
                      <div className="opacity-90">{open?.gallery[gidx]?.caption}</div>
                      <div className="opacity-75">{gidx + 1} / {open?.gallery.length}</div>
                    </div>
                    <div className="mt-2 flex justify-between gap-2">
                      <button onClick={() => setGidx((i) => Math.max(i - 1, 0))} className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm">前へ</button>
                      <button onClick={() => setGidx((i) => Math.min(i + 1, open!.gallery.length - 1))} className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm">次へ</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* スロー背景テキストのアニメーションCSS */}
      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 28s linear infinite; }
        .animate-marquee-slow { animation: marquee 40s linear infinite; }
      `}</style>
    </section>
  );
}
