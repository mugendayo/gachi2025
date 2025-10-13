"use client";

import React from "react";
import Image from "next/image";

/* ============================
   共通：スワイプフック
============================ */
function useSwipe(onLeft: () => void, onRight: () => void) {
  const sx = React.useRef<number | null>(null);
  const sy = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    sx.current = t.clientX;
    sy.current = t.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (sx.current == null || sy.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx.current;
    const dy = t.clientY - sy.current;
    if (Math.abs(dx) > 40 && Math.abs(dy) < 60) {
      dx < 0 ? onLeft() : onRight();
    }
    sx.current = null;
    sy.current = null;
  };
  return { onTouchStart, onTouchEnd };
}

/* ============================
   スライド①：教育理念／求める生徒
============================ */
const SLIDES = [
  {
    id: "slide-a",
    title: "教育理念：魂の熱量は数値を超える",
    img: "/past/A.png",
    alt: "教育理念",
    body: (
      <>
        魂の熱量が異常に高い生徒たちは、論理や偏差値で測れない世界に生きている。彼らは常識の枠を超えて、自分の内なる衝動や物語に従って動き出します。評価軸を卒業した生徒。「やらずにはいられない衝動」で動く生徒。世界のバランスを揺るがす原動力を持つ生徒。カテゴライズできない生き方をしている、創造者・表現者・革命家。“次元を超えた存在”として、既存の評価システムからドロップアウトしながら世界を創り変えている。偏差値が高くても、魂の熱量が低ければ、ここでは力を発揮できません。右上（偏差値・熱量ともに高い）が理想ではありますが、右下（偏差値低め・魂MAX）こそ、未来の企画王たちです。私たちが求めるのは、学力以上に「物語を生きる力」を持った仲間たちです。
      </>
    ),
  },
  {
    id: "slide-b",
    title: "求める生徒",
    img: "/past/B.png",
    alt: "求める生徒",
    body: (
      <>
        本校では陽キャインフルエンサーを拒むことはありません。しかし本校の文化で大切にしているのはここでいう「空想初心者」が「引きこもりアーティスト」恥ずかしいことを真剣にできる生徒を求めています。
      </>
    ),
  },
] as const;

function SlidesBlock() {
  const [idx, setIdx] = React.useState(0);
  const next = () => setIdx((v) => (v + 1) % SLIDES.length);
  const prev = () => setIdx((v) => (v - 1 + SLIDES.length) % SLIDES.length);
  const { onTouchStart, onTouchEnd } = useSwipe(next, prev);
  const s = SLIDES[idx];

  return (
    <section className="py-10 md:py-14" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* 画像（左） */}
        <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm bg-slate-50">
          <img
            src={s.img}
            alt={s.alt}
            className="w-full h-auto object-contain max-h-[52vh]"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='100%25' height='100%25' fill='%23eef2ff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23103B73' font-size='18'%3E画像が見つかりません%3C/text%3E%3C/svg%3E";
            }}
          />
        </figure>

        {/* テキスト（右）— 3行グリッド + ナビ固定 */}
        <div className="grid grid-rows-[auto,1fr,auto] min-h-[360px]">
          <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">{s.title}</h3>
          <p className="mt-4 text-[15px] md:text-[16px] leading-relaxed">{s.body}</p>

          {/* ナビ（高さ固定 h-12 / ボタン固定幅 w-28 / ドット固定高さ） */}
          <div className="mt-6 flex items-center gap-3 h-12">
            <button
              type="button"
              onClick={prev}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-blue-50 w-28 shrink-0"
              aria-label="前のスライド"
            >
              ← 前へ
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-blue-50 w-28 shrink-0"
              aria-label="次のスライド"
            >
              次へ →
            </button>
            <div className="ml-2 flex items-center gap-2 h-4">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`スライド ${i + 1}`}
                  className={`h-3.5 w-3.5 rounded-full ${
                    idx === i ? "bg-blue-600" : "bg-blue-200 hover:bg-blue-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
   スライド②：二本柱と哲学（企画／クラス）
============================ */
const PHILO_SLIDES = [
  {
    id: "philo-plan",
    title: "企画：自己実現の Minimum Viable Product を可視化する",
    img: "/past/philo-plan.png",
    alt: "企画スライド",
    body: (
      <>
        ガチ文化祭の企画はいわゆる”インスタ映え”に散見する『コスプレとしてのアイデンティティの確立』ではなく、『過去と未来と今を昇華した自分自身への希望と迫力を表現』することに本当の楽しさがある。強いて言えば『インスタ映えを兼ね備えた自己理念の凄み』を自他ともに垣間みることに”開かれた思想感”があるのが良い。Minimum Viable Productとは、必要最低限の価値がある製品という、ビジネスにおけるスタートアップ哲学により説明が成された定義である。今すぐに自己実現をやり切る、などできなくとも、短期間で可視化する。余韻を感じる。切り取れる領域で価値提供を具現化する。それに挑戦する意義は大いにある。これらを、冒頭の文脈と共に実践可能にしたのがガチ文化祭における企画であり存在意義である。
      </>
    ),
  },
  {
    id: "philo-class",
    title: "クラス：公共精神を体得し、帰属・協力意識を深化する",
    img: "/past/philo-class.png",
    alt: "クラススライド",
    body: (
      <>
        ガチ文化祭のクラスは、ランダム性を孕んで知り合った実行委員と、青春という不確実な概念を推進する大義のもとに数日間コミュニケーションを取らざるを得ないことに価値を見出している。学校生活の入学・進級に見られる『すでに決められたクラス』では半強制的かつランダム性の高い振り分けがされ、共生を求められる、学校行事は何らかの達成を課され、全く認識していない他人から毎時自己開示をする身内まで網羅的に関わる必要がある。ガチ文化祭ではこれを再現し、クラス企画実現の過程で生じる、準備における意見の相違、モチベーションの差による問題に対し、衝突や助け合いを通して、国や社会の問題を自分自身の問題として捉え行動する精神や、グループ、集団に対する一体感、協力関係を結ぶことの重要性を示唆する機能を高めることに重きを置いている。
      </>
    ),
  },
] as const;

function PhilosophySlides() {
  const [idx, setIdx] = React.useState(0);
  const next = () => setIdx((v) => (v + 1) % PHILO_SLIDES.length);
  const prev = () => setIdx((v) => (v - 1 + PHILO_SLIDES.length) % PHILO_SLIDES.length);
  const { onTouchStart, onTouchEnd } = useSwipe(next, prev);
  const s = PHILO_SLIDES[idx];

  return (
    <section className="py-12 md:py-16" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">ガチ文化祭の二本柱と哲学</h3>
      <div className="mt-6 grid gap-6 md:grid-cols-2 items-start">
        {/* 画像（左） */}
        <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm bg-slate-50">
          <img
            src={s.img}
            alt={s.alt}
            className="w-full h-auto object-contain max-h-[52vh]"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='100%25' height='100%25' fill='%23eef2ff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23103B73' font-size='18'%3E画像が見つかりません%3C/text%3E%3C/svg%3E";
            }}
          />
        </figure>

        {/* テキスト（右）— 3行グリッド + ナビ固定 */}
        <div className="grid grid-rows-[auto,1fr,auto] min-h-[380px]">
          <h4 className="text-lg font-bold text-[#1E5AA8]">{s.title}</h4>
          <p className="mt-2 text-[15px] md:text-[16px] leading-relaxed">{s.body}</p>

          <div className="mt-6 flex items-center gap-3 h-12">
            <button
              type="button"
              onClick={prev}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-blue-50 w-28 shrink-0"
              aria-label="前のスライド"
            >
              ← 前へ
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-blue-50 w-28 shrink-0"
              aria-label="次のスライド"
            >
              次へ →
            </button>
            <div className="ml-2 flex items-center gap-2 h-4">
              {PHILO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`スライド ${i + 1}`}
                  className={`h-3.5 w-3.5 rounded-full ${
                    idx === i ? "bg-blue-600" : "bg-blue-200 hover:bg-blue-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
   ページ本体
============================ */
export default function AdmissionPage() {
  return (
    <main className="bg-white text-slate-800">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Image
          src="/headers/admission-hero.jpg"
          alt=""
          width={1920}
          height={800}
          className="w-full h-[28svh] md:h-[36vh] object-cover"
          draggable={false}
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.85)_0%,rgba(233,241,251,.85)_35%,rgba(233,241,251,.6)_100%)]" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="text-center font-extrabold tracking-wide text-[clamp(20px,4.8vw,40px)] text-[#103B73]">
            アドミッション・ポリシー
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 教育方針（枠なし） */}
        <section className="py-12 md:py-16">
          <p className="text-sm font-semibold tracking-widest text-[#1E5AA8]">教育方針</p>
          <h2 className="mt-2 text-[clamp(28px,6.2vw,48px)] font-extrabold text-[#103B73] leading-tight">
            臥薪嘗胆
          </h2>
          <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed">
            由来：苦難に耐え、志を胸に磨き続けること。困難を糧にして前へ進む姿勢を本校の基調とします。
          </p>
        </section>

        {/* スライド①：教育理念／求める生徒 */}
        <SlidesBlock />

{/* 3つのテーマ（円の中：英語＋直訳／円の下：説明） */}
<section className="py-12 md:py-16 border-y border-blue-100 bg-[#F8FBFF]">
  <h3 className="text-center text-[clamp(18px,4vw,28px)] font-bold text-[#103B73]">3つのテーマ</h3>

  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 place-items-center">
    {[
      { en: "Youth", jp: "青春", desc: "過去と未来と今の間" },
      { en: "Symbiosis", jp: "共生", desc: "協力関係を結ぶ重要性" },
      { en: "Soul Token", jp: "魂トークン", desc: "昔の自分から見て今の自分はカッコいいか？" },
    ].map((p, i) => (
      <div key={i} className="flex flex-col items-center text-center">
        {/* 円：中に英語＋直訳のみ */}
        <div
          className="
            relative rounded-full grid place-items-center
            bg-[radial-gradient(100%_100%_at_50%_0%,#3B82F6_0%,#1E5AA8_55%,#103B73_100%)]
            shadow-[0_16px_40px_rgba(16,59,115,.25)] ring-1 ring-blue-200
            w-[32vw] h-[32vw] min-w-[140px] min-h-[140px] max-w-[200px] max-h-[200px]
            text-white select-none
          "
        >
          <div className="leading-tight px-3">
            <div className="text-[15px] sm:text-[17px] font-extrabold tracking-wide">{p.en}</div>
            <div className="text-[12px] sm:text-[13px] opacity-95 mt-1">{p.jp}</div>
          </div>
        </div>

        {/* 説明：円の下に“少しカッコいい”カード風ラベル */}
        <div
          className="
            mt-4 px-4 py-2 rounded-xl bg-white/80 backdrop-blur
            ring-1 ring-blue-100 shadow-[0_8px_20px_rgba(16,59,115,.10)]
            text-slate-800
          "
        >
          <div className="text-[13px] sm:text-[14px] font-medium">
            {p.desc}
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

        {/* スライド②：二本柱と哲学（企画／クラス） */}
        <PhilosophySlides />

        <div className="h-16" />
      </div>
    </main>
  );
}
