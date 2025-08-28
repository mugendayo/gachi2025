// src/components/AdmissionCTA.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import AdmissionSlides, { type Slide } from "@/components/AdmissionSlides";

export default function AdmissionCTA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ====== オレンジCTAボタン ====== */}
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
          aria-label="ちゃんと知りたい！ガチ文高等学校について"
          className="group relative select-none cursor-pointer"
        >
          {/* 親のサイズでボタンサイズを管理 */}
          <div className="relative w-[min(92vw,740px)]">
            <div
              className="relative rounded-[18px] px-6 md:px-10 py-5 md:py-7 text-center w-full  shadow-[0_12px_28px_rgba(0,0,0,.18)]  ring-1 ring-black/5  transition  hover:translate-y-[-2px]  active:translate-y-[0px] "
              style={{
                background:
                  "linear-gradient(180deg,#FFA91A 0%, #FF8A00 100%)",
              }}
            >
              {/* テクスチャ/ハイライト */}
              <span className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(120%_140%_at_0%_0%,rgba(255,255,255,.25),transparent_60%)] opacity-60 mix-blend-soft-light" />
              <span className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_1.5px_0_rgba(255,255,255,.65)]" />
              {/* ホバー時カラー強調 */}
              <span
                className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition"
                style={{
                  background:
                    "linear-gradient(180deg,#FFBE3B00 0%, #FF9C1A66 100%)",
                }}
              />
              {/* 文字：2段 */}
              <div className="relative z-10">
                <div className="text-white font-extrabold tracking-wide leading-none text-[28px] md:text-[40px] drop-shadow-[0_2px_0_rgba(0,0,0,.18)]">
                  ガチ文高等学校を知りたい！
                </div>
                <div className="mt-2 text-white/95 font-semibold tracking-wide text-[14px] md:text-[18px]">
                  <span className="mx-1">✿</span>
                  アドミッション・ポリシーはこちら
                  <span className="mx-1">✿</span>
                </div>
              </div>
              {/* きらん */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/2 rotate-12 rounded-[18px]"
                style={{
                  background:
                    "linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.7)_50%,rgba(255,255,255,0)_100%)",
                  filter: "blur(2px)",
                }}
              />
            </div>

            {/* ホバー演出 */}
            <style jsx>{`
              .group:hover > div { transform: scale(1.015); }
              .group:hover > div > span:first-child { opacity: .75; }
              .group:hover > span { animation: shine 1.2s ease-out both; }
              @keyframes shine {
                0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
                20% { opacity: .9; }
                100% { transform: translateX(220%) rotate(12deg); opacity: 0; }
              }
            `}</style>
          </div>
        </button>
      </motion.div>

      {/* ====== モーダル（ポータル + スクロールロック） ====== */}
      <AnimatePresence>
        {open && <ModalPortal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ---------------- Modal ---------------- */
function ModalPortal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const scrollTopRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // 背景スクロールロック
  useEffect(() => {
    const body = document.body;
    scrollTopRef.current = window.scrollY || window.pageYOffset;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflowY: body.style.overflowY,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollTopRef.current}px`;
    body.style.width = "100%";
    body.style.overflowY = "scroll";
    return () => {
      body.style.position = prev.position;
      const topVal = body.style.top;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflowY = prev.overflowY;
      const y = topVal ? -parseInt(topVal, 10) : scrollTopRef.current;
      window.scrollTo(0, y);
    };
  }, []);

  // Escで閉じる + 初期フォーカス
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const slides: Slide[] = [
    {
      title: "教育理念：魂の熱量は数値を超える",
      imageSrc: "/past/A.jpg", // ← アップロードした画像を public ディレクトリに置く
      body:
        "魂の熱量が異常に高い生徒たちは、論理や偏差値で測れない世界に生きている。彼らは常識の枠を超えて、自分の内なる衝動や物語に従って動き出します。評価軸を卒業した生徒。「やらずにはいられない衝動」で動く生徒。世界のバランスを揺るがす原動力を持つ生徒。カテゴライズできない生き方をしている、創造者・表現者・革命家。“次元を超えた存在”として、既存の評価システムからドロップアウトしながら世界を創り変えている。偏差値が高くても、魂の熱量が低ければ、ここでは力を発揮できません。右上（偏差値・熱量ともに高い）が理想ではありますが、右下（偏差値低め・魂MAX）こそ、未来の企画王たちです。私たちが求めるのは、学力以上に「物語を生きる力」を持った仲間たちです。",
    },
    {
      title: "求める生徒",
      imageSrc: "/past/B.png",
      body: "本校では陽キャインフルエンサーを拒むことはありません。しかし本校の文化で大切にしているのはここでいう「空想初心者」が「引きこもりアーティスト」に育まれる風土です。恥ずかしいことを真剣にできる生徒を求めています。",
    },
    {
      title: "本校が歓迎する資質・人物項目",
      imageSrc: "/past/C.png",
      body:
        "これらの特性は「偏差値」では測れませんが、「魂の熱量」によって見えてまいります。あなたの情熱が私たちの基準です。",
    },
    {
      title: "詳細を読む",
      body: "時を巻き戻すのではなく、時を超える。青春は作るものだ。与えられるものではない。「意味があるか」よりも「面白いか」で動け。終了時、あの時間は人生だったと思えたこと。クラスメイトの誰か一人に「お前と出会えてよかった」と思えたこと。夜に空を見上げて「なんか、良かったな」とつぶやけたこと",
    },
  ];

  return createPortal(
    <>
      {/* 背景 */}
      <motion.div
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="pointer-events-auto relative w-[min(92vw,820px)] rounded-2xl bg-white shadow-2xl overflow-hidden outline-none overscroll-contain"
          initial={{ clipPath: "inset(0 0 100% 0 round 16px)", opacity: 0.6 }}
          animate={{ clipPath: "inset(0 0 0% 0 round 16px)", opacity: 1 }}
          exit={{ clipPath: "inset(0 0 100% 0 round 16px)", opacity: 0 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ヘッダー */}
          <div className="relative px-5 md:px-8 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="text-2xl md:text-xl font-bold text-gray-900">アドミッション・ポリシー 臥薪嘗胆</div>
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="absolute right-3 top-3 rounded-full border bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>

          {/* 本文：スマホ縦カードの横スワイプ */}
          <div className="px-0 md:px-0">
            <AdmissionSlides slides={slides} />
          </div>
        </motion.div>
      </motion.div>
    </>,
    document.body
  );
}
