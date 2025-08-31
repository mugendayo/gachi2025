"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import AdmissionCTA from "@/components/AdmissionCTA";
import TimeSlipTeaser from "@/components/TimeSlipTeaser";
import AnimatedChars from "@/components/AnimatedChars";


type GalleryItem = { src: string; caption?: string };

type Person = {
  role: "principal" | "vice";
  name: string;
  title: string;
  bio: string;
  thumb: string;
 gallery: GalleryItem[];
  /** ★スマホ縦で見せたい2枚だけを指定（なければgallery先頭2枚を自動使用） */
  story?: GalleryItem[];
};

const PRINCIPAL: Person = {
  role: "principal",
  name: "つかね ひろき",
  title: "ガチ文高等学校 校長",
  bio: "“いつでも高校生に戻れる社会をつくる” を合言葉に、生徒一人ひとりに青い春と希望を与える。前職はマザーテレサ。趣味は世界平和。",
  thumb: "/principal/thumb.jpg",
 gallery: Array.from({ length: 10 }).map((_, i) => ({
    src: `/principal/v/${String(i + 1).padStart(2, "0")}.jpg`,
    caption: `校長ギャラリー ${i + 1}/10`,
  })),
  /** ★ここを2枚に */
  story: [
    { src: "/principal/1.png", caption: "校長 1/2" },
    { src: "/principal/2.png", caption: "校長 2/2" },
  ],
};

const VICE: Person = {
  role: "vice",
  name: "炎山（えんざん）",
  title: "ガチ文高等学校 教頭",
  bio: "現実主義で“仕組みで青春”を推進。高校時代の文化祭そして使われなくなった廃校に命を芽吹くことに命を賭ける。前職は宮代健太。趣味は多拠点生活。",
  thumb: "/vice/thumb.png",
 gallery: Array.from({ length: 10 }).map((_, i) => ({
    src: `/vice/v/${String(i + 1).padStart(2, "0")}.jpg`,
    caption: `教頭ギャラリー ${i + 1}/10`,
  })),
  /** ★ここを2枚に */
  story: [
    { src: "/vice/1.png", caption: "教頭 1/2" },
    { src: "/vice/2.", caption: "教頭 2/2" },
  ],
};

export default function SchoolIntro() {
  const [open, setOpen] = useState<null | Person>(null);
  const [gidx, setGidx] = useState(0);

  const openModal = (p: Person) => {
    setOpen(p);
    setGidx(0);
  };
  const closeModal = () => setOpen(null);

  const swipeThreshold = 80;
  const onDragEnd = (
    _ev: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!open) return;
    const dx = info.offset.x ?? 0;

  // ★ storyがあれば2枚、なければgallery先頭2枚で固定
  const len = open.story?.length
    ? Math.min(open.story.length, 2)
    : Math.min(open.gallery.length, 2);

  if (dx < -swipeThreshold) setGidx((i) => Math.min(i + 1, len - 1));
  else if (dx > swipeThreshold) setGidx((i) => Math.max(i - 1, 0));
};

  return (
    <section
      id="about-gachibun"
      className="relative isolate overflow-hidden bg-black text-white pt-28 md:pt-40"
    >
      {/* ▼ 背景 */}
      <div className="absolute inset-0 z-0">
        <img
          src="/school/bg-vert.png"
          alt=""
          className="w-full h-full object-cover object-center block"
          draggable={false}
        />
        <div className="absolute inset-0" />
      </div>

      {/* ▼ コンテンツ */}
      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24 pb-36 md:pb-44">
        {/* 1) タイムスリップ演出（先頭） */}
        <div className="relative mb-10 md:mb-16">
          <TimeSlipTeaser />
        </div>

        {/* 2) 学校の説明（“文化祭の前夜”カード） */}
        <motion.div
          className="relative z-30 rounded-2xl ring-1 ring-white/10 backdrop-blur-sm p-5 md:p-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* 文字だけ中央寄せ（ラッパーのmin-hをやめる） */}
          <div className="text-center">
            <AnimatedChars
              text={"「文化祭の前夜」\nのような高揚を"}
              as="h3"
              /* フォントを文字だけ拡大（ラッパーは伸びない） */
              className="
                font-bold leading-[1.1] tracking-[0.06em]
                text-[clamp(24px,8vw,56px)]
                md:text-[clamp(50px,5vw,64px)]
              "
              initialDelay={0.10}
              lineStep={0.18}    // 行と行の間の“タメ”
              step={0.08}        // 1文字ずつ落ちるテンポを速めに
              bobDuration={4.0}  // ふわ揺れをゆっくり
              lineGap="0.40em"   // ← 追加（次の変更②で使えるように）
            />
          </div>

          <p className="mt-4 text-sm md:text-base leading-relaxed text-white/90 text-center">
            ガチ文高等学校とは、年に1回の文化祭に重きをおいた高校です。“青春の装置”として機能します。
          </p>
        </motion.div>


      </div>
{/* ================== 横長カード #1（教頭＋校長を角に置く→門寄せ＆対角配置） ================== */}
<div
  className={`
    relative mx-auto max-w-6xl px-4 sm:px-6 mt-16 mb-32 md:mb-40
    [--ov:clamp(10px,5.5vw,88px)]
    [--top-edge:clamp(8px,3vw,48px)]
    [--bottom-edge:clamp(8px,3vw,48px)]
    [--diag:clamp(0px,2vw,36px)]
    [--avatar:clamp(64px,10vw,144px)]
 `} 
>
  
  {/* 画像（基準面） */}
  <div className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
    <img
      src="/school/campus-hero-1.jpg"
      alt="ガチ文高等学校の様子 1"
      className="w-full h-auto object-cover aspect-[16/9] block"
      draggable={false}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  </div>

  {/* 教頭：右上。カードの右上角から：外側(--ov)＋対角(--diag)だけ離し、右端から(--top-edge)だけ内側へ寄せる */}
  <motion.button
    onClick={() => openModal(VICE)}
    className="group absolute z-40 rounded-2xl ring-1 ring-white/30 bg-black/5 hover:bg-black/10 backdrop-blur-[2px] transition"
    initial={{ opacity: 0, x: 12, y: -12 }}
    animate={{ opacity: 1, x: 0, y: -80 }}
    transition={{ duration: 0.55 }}
    aria-label="教頭のプロフィールを開く"
    style={
      {
        // アンカー（カード右上の“角”基準）
        top: 0,
        right: 'var(--top-edge)',
        // 外側へ + 対角線方向へ
        transform: 'translate(calc(var(--ov) + var(--diag)), calc(-1 * (var(--ov) + var(--diag))))',
      } as React.CSSProperties
    }
  >
    <div className="flex items-center gap-4 md:gap-6 p-3 md:p-6 md:pr-8">
      <div className="relative">
        <img
          src={VICE.thumb}
          alt={VICE.name}
          draggable={false}
          style={{ width: 'var(--avatar)', height: 'var(--avatar)' }}
          className="aspect-square rounded-full object-cover ring-2 ring-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:rotate-[20deg]"
        />
        <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
      </div>
      <div className="text-left">
        <div className="text-xs sm:text-sm md:text-base text-white/85 leading-tight" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
          {VICE.title}
        </div>
        <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight break-keep" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
          {VICE.name}
        </div>
        <div className="text-[10px] sm:text-xs md:text-sm text-white/85 mt-1 sm:mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
          プロフィールを見る
        </div>
      </div>
    </div>
  </motion.button>

  {/* 校長：左下。カードの左下角から：外側(--ov)＋対角(--diag)だけ離し、左端から(--bottom-edge)だけ内側へ寄せる */}
  <motion.button
    onClick={() => openModal(PRINCIPAL)}
    className="group absolute z-40 rounded-2xl ring-1 ring-white/30 bg-black/5 hover:bg-black/10 backdrop-blur-[2px] transition"
    initial={{ opacity: 0, x: -12, y: 12 }}
    animate={{ opacity: 1, x: 0, y: 80 }}
    transition={{ duration: 0.55 }}
    aria-label="校長のプロフィールを開く"
    style={
      {
        bottom: 0,
        left: 'var(--bottom-edge)',
        transform: 'translate(calc(-1 * (var(--ov) + var(--diag))), calc(var(--ov) + var(--diag)))',
      } as React.CSSProperties
    }
  >
    <div className="flex items-center gap-4 md:gap-6 p-3 md:p-6 md:pr-8">
      <div className="relative">
        <img
          src={PRINCIPAL.thumb}
          alt={PRINCIPAL.name}
          draggable={false}
          style={{ width: 'var(--avatar)', height: 'var(--avatar)' }}
          className="aspect-square rounded-full object-cover ring-2 ring-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:-rotate-[10deg]"
        />
        <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
      </div>
      <div className="text-left">
        <div className="text-xs sm:text-sm md:text-base text-white/85 leading-tight" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
          {PRINCIPAL.title}
        </div>
        <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight break-keep" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
          {PRINCIPAL.name}
        </div>
        <div className="text-[10px] sm:text-xs md:text-sm text-white/85 mt-1 sm:mt-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
          プロフィールを見る
        </div>
      </div>
    </div>
  </motion.button>
</div>


{/* ★★★ スロー文字（フルブリード版｜any不使用） ★★★ */}
<div className="my-16 md:my-24">
  {/* 中央レイアウトを一時解除して画面幅いっぱいに */}
  <div className="relative -mx-[calc(50vw-50%)] [--speed:1.6] cv-auto">
    <div className="relative w-screen h-[28vh] md:h-[36vh] overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        <div className="marquee-line top-[0%]  text-[7vw] font-extrabold tracking-widest opacity-[0.35] [--dur:28s]">
          魂の熱量がすべてを変える！タイムマシーンをつくってます！いつでもガチで生きよう！
        </div>
        <div className="marquee-line top-[15%] text-[5vw] font-extrabold tracking-widest opacity-[0.35] [--dur:34s] [--delay:-4s]">
          SASUKEを作りたい アーティストになりたい 夢見心地で生きていきたい 諦めたくない 死ぬまでやりたい
        </div>
        <div className="marquee-line top-[30%] text-[3vw] font-extrabold tracking-widest opacity-[0.35] [--dur:38s] [--delay:-8s]">
          自己実現のMVPを作り続ける それがガチ文化祭の使命
        </div>
        <div className="marquee-line top-[75%] text-[7vw] font-extrabold tracking-widest opacity-[0.35] [--dur:32s] [--delay:-2s]">
          目に見えない大切なもの ガチ文化祭=人生 お前らみたいな大人がいるから涙を流せる感動が殺されていくんだ
        </div>
        <div className="marquee-line top-[62%] text-[4vw] font-extrabold tracking-widest opacity-[0.35] [--dur:40s] [--delay:-6s]">
          超悔しい あのときああすれば
        </div>
        <div className="marquee-line top-[40%] text-[5vw] font-extrabold tracking-widest opacity-[0.35] [--dur:36s] [--delay:-10s]">
          もっとやればよかった
        </div>
      </div>
    </div>
  </div>
</div>
   
      <div className="relative mb-24 md:mb-32 mx-auto max-w-6xl px-4 sm:px-6">
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
        {/* ← 校長ボタンは #1 側に統合したのでここでは削除 */}
      </div>

      {/* （校長の紹介/挨拶の直後） */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-10 md:mt-14">
        <AdmissionCTA />
      </div>

{/* モーダル */}
<AnimatePresence>
  {open && (
    <>
      {/* 背面オーバーレイ（どこでも閉じる） */}
      <motion.div
        className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
      />

      {/* ★前面グリッド：ここも onClick=closeModal を付与 */}
      <motion.div
        className="fixed inset-0 z-[1001] grid place-items-center p-4 md:p-8"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        aria-modal="true"
        role="dialog"
        onClick={closeModal} // ★ここ
      >
        {(() => {
          const slides =
            (open?.story && open.story.length > 0
              ? open.story.slice(0, 2)
              : open?.gallery?.slice(0, 2)) ?? [];

          return (
            // ★画像ボックスはクリックを止める
            <motion.div
              key={(open?.role ?? "p") + gidx}
              className="relative w-[min(92vw,440px)] aspect-[9/16] overflow-hidden rounded-xl ring-1 ring-white/20 shadow-2xl bg-black"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()} // ★ここ
            >
              <img
                src={slides[gidx]?.src}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
                loading="eager"
                decoding="async"
              />
  {/* ❌ クローズ（魔法陣風の色合い） */}
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); closeModal(); }}
    aria-label="閉じる"
    className="xbtn absolute right-2 top-2 md:right-3 md:top-3"
  >
    <span aria-hidden>×</span>
  </button>

  {/* 矢印ヒント */}
  {gidx < (slides.length || 2) - 1 && <div className="swipe-hint-r" aria-hidden>›</div>}
  {gidx > 0 && <div className="swipe-hint-l" aria-hidden>‹</div>}
</motion.div>
          );
        })()}
      </motion.div>
    </>
  )}
</AnimatePresence>

<style jsx global>{`
  .marquee-line{
    position:absolute;
    left:0;
    white-space:nowrap;
    will-change: transform;
    animation: marqueeX calc(var(--dur, 20s) * var(--speed, 1)) linear infinite;
    animation-delay: var(--delay, 0s);
    transform: translateZ(0);
  }
  @keyframes marqueeX {
    0%   { transform: translateX(100vw); }
    100% { transform: translateX(-100%); }
  }
/* スワイプ矢印の点滅 */
.swipe-hint-r, .swipe-hint-l{
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: clamp(24px, 6vw, 40px);
  line-height: 1;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 8px 20px rgba(0,0,0,.55);
  pointer-events: none;
  user-select: none;
}
.swipe-hint-r{ right: 10px; animation: nudgeR 1.1s ease-in-out infinite; }
.swipe-hint-l{ left: 10px;  animation: nudgeL 1.1s ease-in-out infinite; }

@keyframes nudgeR{
  0%,100%{ opacity:.25; transform: translateY(-50%) translateX(0); }
  50%    { opacity:1;   transform: translateY(-50%) translateX(6px); }
}
@keyframes nudgeL{
  0%,100%{ opacity:.25; transform: translateY(-50%) translateX(0); }
  50%    { opacity:1;   transform: translateY(-50%) translateX(-6px); }
}

`}</style>


      {/* 余白（下） */}
      <div className="h-40 md:h-56" />
    </section>
  );
}
