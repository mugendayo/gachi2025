"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion"; 
import AdmissionCTA from "@/components/AdmissionCTA";



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
  name: "しまじろうとTシャツの塚根",
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
    <section id="about-gachibun" className="relative isolate overflow-hidden bg-black text-white pt-70 md:pt-96 ">
      {/* ▼ セクション背景（imgのまま・スタッキング安定） */}
      <div className="absolute inset-0 z-0">
        <img
          src="/school/bg-vert.png"   /* public/school/bg-vert.jpg */
          alt=""
          className="w-full h-full object-cover object-center block"
          draggable={false}
        />
        <div className="absolute inset-0" />
      </div>

      {/* ▼ スロー文字（画像カードの上、ボタンの下） */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        <div className="absolute -left-[-80vw] top-[27%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-fast opacity-[0.35]">
          魂の熱量がすべてを変える！タイムマシーンをつくってます！いつでもガチで生きよう！
        </div>
        <div className="absolute -left-[-25vw] top-[36%] whitespace-nowrap text-[5vw] font-extrabold tracking-widest animate-marquee-medium opacity-[0.35]">
          SASUKEを作りたい アーティストになりたい　夢見心地で生きていきたい 諦めたくない　死ぬまでやりたい
        </div>
        <div className="absolute -left-[-38vw] top-[40%] whitespace-nowrap text-[3vw] font-extrabold tracking-widest animate-marquee-medium opacity-[0.35]">
          自己実現のMVPを作り続ける それがガチ文化祭の使命
        </div>
        <div className="absolute -left-[-20vw] top-[54%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-medium opacity-[0.35]">
          目に見えない大切なもの　ガチ文化祭=人生　お前らみたいな大人がいるから涙を流せる感動が殺されていくんだ
        </div>
        <div className="absolute -left-[-40vw] top-[62%] whitespace-nowrap text-[4vw] font-extrabold tracking-widest animate-marquee-extra opacity-[0.35]">
          超悔しい　あのときああすれば
        </div>
        <div className="absolute -left-[-30vw] top-[50%] whitespace-nowrap text-[5vw] font-extrabold tracking-widest animate-marquee-slow opacity-[0.35]">
          もっとやればよかった
        </div>
      </div>


      {/* コンテンツ */}
      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24 pb-36 md:pb-44">
        {/* 見出し */}
        {/* 学校の説明（冒頭イントロ） */}
        <motion.div
          className="relative z-30 mb-10 md:mb-14 rounded-2xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-5 md:p-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h3 className="text-xl md:text-5xl font-bold mb-3">「文化祭の前夜」のような高揚を</h3>
          <p className="text-sm md:text-base leading-relaxed text-white/90">
            ガチ文高等学校とは、年に1回の文化祭に重きをおいた高校です。“青春の装置”を年中稼働させています。
          </p>
        </motion.div>

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
                  className="h-28 w-28 sm:h-36 sm:w-36 aspect-square rounded-full object-coverring-2 ring-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] rotate-[20deg]"
                />

                <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
              </div>

              {/* テキストは読みやすく（テキストシャドウ） */}
             <div className="text-left">
              <div className="text-sm sm:text-base text-white/85 leading-tight"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                {VICE.title /* or PRINCIPAL.title */}
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight break-keep"
                  style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
                {VICE.name /* or PRINCIPAL.name */}
              </div>
              <div className="text-xs sm:text-sm text-white/85 mt-1 sm:mt-2"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
                プロフィールを見る
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
            className="group absolute left-0 translate-y-1/2 md:translate-y-1/3 -bottom-12 md:-bottom-20 z-30 rounded-2xl ring-1 ring-white/30 bg-black/5 hover:bg-black/10 backdrop-blur-[2px] transition"
            initial={{ opacity: 0, x: -12, y: 12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            aria-label="校長のプロフィールを開く"
          >
            <div className="flex items-center gap-6 md:gap-8 p-6 md:p-7 pr-8">
              {/* ←ここを拡大 */}
              <div className="relative">
                <img
                  src={PRINCIPAL.thumb}
                  alt={PRINCIPAL.name}
                  className="h-40 w-40 md:h-56 md:w-56 rounded-full object-cover ring-2 ring-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.38)] -rotate-[10deg]"
                  draggable={false}
                />
                <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_8px_rgba(255,255,255,0.06)]" />
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
        </div>
         {/* （校長の紹介/挨拶の直後） */}
          <div className="mt-10 md:mt-14">
            <AdmissionCTA />
          </div>


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
        @keyframes marquee {
          0%   { transform: translateX(0); opacity: 0; }
          5%   { opacity: 1; }
          100% { transform: translateX(-100%); opacity: 1; }
        }

        /* 速度ごとにクラスを分ける */
        .animate-marquee-fast   { animation: marquee 11s linear infinite; }
        .animate-marquee-medium { animation: marquee 18s linear infinite; }
        .animate-marquee-slow   { animation: marquee 20s linear infinite; }
        .animate-marquee-extra  { animation: marquee 24s linear infinite; }
        /* 遅延バリエーション */
        .delay-1 { animation-delay: 0s; }
        .delay-2 { animation-delay: 4s; }
        .delay-3 { animation-delay: 8s; }
        .delay-4 { animation-delay: 12s; }

        .marquee-once {
          animation: marquee-once 18s linear forwards; /* forwardsで最後の位置を保持 */
        }
      `}</style>
     <div className="h-40 md:h-56" />
    </section>
  );
}

