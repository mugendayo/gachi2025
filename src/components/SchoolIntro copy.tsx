"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import Image from "next/image";

type GalleryItem = { src: string; caption?: string };

type Person = {
  role: "principal" | "vice";
  name: string;
  title: string;
  bio: string;
  thumb: string;       // カードのサムネ（横 or 正方形）
  gallery: GalleryItem[]; // 縦長 9:16 推奨を10枚まで
};

// ---- ダミーデータ（差し替えてOK） ----
const PRINCIPAL: Person = {
  role: "principal",
  name: "校長 〇〇 〇〇",
  title: "ガチ文高等学校 校長",
  bio: "“魂の熱量がすべてを変える” を合言葉に、生徒一人ひとりの挑戦を支える。前職は〇〇。趣味は〇〇。",
  thumb: "/principal/thumb.jpg",
  gallery: Array.from({ length: 10 }).map((_, i) => ({
    src: `/principal/v/${String(i + 1).padStart(2, "0")}.jpg`,
    caption: `校長ギャラリー ${i + 1}/10`,
  })),
};

const VICE: Person = {
  role: "vice",
  name: "教頭 △△ △△",
  title: "ガチ文高等学校 教頭",
  bio: "現場主義で“仕組みと熱量の両立”を推進。校内の運営や安全面を統括。前職は〇〇。",
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
  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
  if (!open) return;
  if (info.offset.x < -swipeThreshold) {
    setGidx((i) => Math.min(i + 1, open.gallery.length - 1));
  } else if (info.offset.x > swipeThreshold) {
    setGidx((i) => Math.max(i - 1, 0));
  }
};

  return (
    <section id="about-gachibun" className="relative overflow-hidden text-white">
        {/* ▼ 縦長背景（全画面カバー） */}
      <div className="absolute inset-0 -z-0">
       <img
            src="/school/bg-vert.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            draggable={false}
        />
        {/* 縦長の背景画像 */}

        {/* ほんのり暗くして前景を読みやすく */}
        <div className="absolute inset-0 bg-black/15" />
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
          ガチ文高等学校はどんな学校？
        </motion.h2>

        {/* メインの3点レイアウト */}
        <div className="relative">
          {/* 中央：学校の様子（横長画像） → 下層 z-10 */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Image
            src="/school/campus-hero.jpg"
            alt="ガチ文高等学校の様子"
            width={1280}
            height={720}
            className="w-full h-auto object-cover aspect-[16/9]"
            priority
            />
          </motion.div>

          {/* ★ スロー文字：校舎画像の上／ボタンの下 → 中層 z-20 */}
          <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute -left-[50vw] top-1/3 whitespace-nowrap text-[8vw] font-extrabold tracking-widest animate-marquee text-white/40">
          魂の熱量がすべてを変える！　タイムマシーンをつくってます　目に見えない大切なもの
        </div>
        <div className="absolute -left-[40vw] top-[60%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-slow text-white/30">
          SASUKEを作りたい　ガチ文化祭=人生　自己実現のMVPを作り続ける
          </div>
          <div className="absolute -left-[50vw] top-[75%] whitespace-nowrap text-[7vw] font-extrabold tracking-widest animate-marquee-slow text-white/40">
          超悔しい　嫉妬してた　諦められない　めちゃくちゃ泣いた
          </div>
        </div>

          {/* 左下：校長カード → 最上層 z-30 */}
          <motion.button
            onClick={() => openModal(PRINCIPAL)}
            className="group absolute left-0 bottom-0 translate-y-1/2 md:translate-y-1/3 bg-white/10 backdrop-blur rounded-2xl ring-1 ring-white/15 overflow-hidden hover:bg-white/15 transition z-30"
            initial={{ opacity: 0, x: -12, y: 12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex items-center gap-3 p-3 pr-4">
              <img src={PRINCIPAL.thumb} alt={PRINCIPAL.name} className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/15" />
              <div className="text-left">
                <div className="text-sm text-white/70">{PRINCIPAL.title}</div>
                <div className="text-base md:text-lg font-semibold">{PRINCIPAL.name}</div>
                <div className="text-xs text-white/60 mt-1">クリックでプロフィールを見る</div>
              </div>
            </div>
          </motion.button>

          {/* 右上：教頭カード → 最上層 z-30 */}
          <motion.button
            onClick={() => openModal(VICE)}
            className="group absolute right-0 -top-6 md:-top-10 bg-white/10 backdrop-blur rounded-2xl ring-1 ring-white/15 overflow-hidden hover:bg-white/15 transition z-30"
            initial={{ opacity: 0, x: 12, y: -12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex items-center gap-3 p-3 pr-4">
              <img src={VICE.thumb} alt={VICE.name} className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/15" />
              <div className="text-left">
                <div className="text-sm text-white/70">{VICE.title}</div>
                <div className="text-base md:text-lg font-semibold">{VICE.name}</div>
                <div className="text-xs text-white/60 mt-1">クリックでプロフィールを見る</div>
              </div>
            </div>
          </motion.button>
        </div>


        {/* 真ん中の大ボタン：アドミッション・ポリシーへ */}
        {/* 真ん中の大ボタン：アドミッション・ポリシーへ（常時アニメ & 画像ボタン） */}
<motion.div
  className="mt-20 flex justify-center"
  initial={{ opacity: 0, scale: 0.94, y: 12 }}
  whileInView={{ opacity: 1, scale: 1, y: 0 }}
  viewport={{ once: true, amount: 0.5 }}
  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
>
  <motion.a
    href="/admission"
    aria-label="アドミッション・ポリシーを見る"
    className="relative inline-block focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30 rounded-[20px]"
    // 常時アニメーション：ゆるい鼓動 + わずかな浮遊
    animate={{
      scale: [1, 1.04, 1],
      y: [0, -3, 0],
      boxShadow: [
        "0 10px 30px rgba(255,255,255,0.06)",
        "0 18px 40px rgba(255,255,255,0.12)",
        "0 10px 30px rgba(255,255,255,0.06)",
      ],
    }}
    transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
  >
    {/* 画像ボタン本体：サイズをひと回りUP（clampでレスポンシブ） */}
    <img
      src="/school/test.jpg"  // ← 指定画像パスに変更
      alt=""
      className="block select-none pointer-events-none"
      style={{
        width: "clamp(280px, 40vw, 560px)",   // ← ひと回り大きめ
        height: "auto",
        borderRadius: "20px",
      }}
      draggable={false}
      onError={(e) => {
        // 画像が未配置の時はテキスト型ボタンにフォールバック
        const p = (e.currentTarget.parentElement as HTMLElement);
        if (!p) return;
        p.innerHTML = `
          <span style="
            display:inline-flex;align-items:center;gap:.6rem;
            background:#fff;color:#000;font-weight:700;
            padding:1rem 1.5rem;border-radius:9999px;
            box-shadow:0 10px 30px rgba(255,255,255,.08);
          ">
            アドミッション・ポリシーを見る
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
        `;
      }}
    />
  </motion.a>
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
