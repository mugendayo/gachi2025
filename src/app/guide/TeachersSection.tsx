// components/TeachersSection.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

/** 教員データ：画像は1枚のみ（PRIVATE廃止） */
type Teacher = {
  id: string;
  name: string;
  title?: string;      // 肩書きや担当の一言（サブタイトル）
  image: string;       // 各先生の1枚（/public 直下相対パス）
  hobby?: string;
  motto?: string;
  subjects?: string;   // 担当科目（複数OK／カンマ区切りでも可）
  thumb?: string;      // サムネ（未指定なら image を流用）
};

/** ここだけ差し替えればOK（画像パスは /public/images/teachers/ 配下） */
const TEACHERS: Teacher[] = [
  {
    id: "akatsuki",
    name: "斬島悪暁先生",
    title: "体育 / 競技理論",
    image: "/images/teachers/akatsuki.jpg",
    hobby: "早朝ラン・刀剣研磨",
    motto: "刃は心。心は折らぬ。",
    subjects: "体育, 競技理論",
  },
  {
    id: "shinai",
    name: "志導シナイ先生",
    title: "国語 / 演劇",
    image: "/images/teachers/shinai.jpg",
    hobby: "戯曲読み・一人語り稽古",
    motto: "声に出すと世界が動く。",
    subjects: "国語, 演劇",
  },
  {
    id: "mamoru",
    name: "志導マモル先生",
    title: "美術 / 写真",
    image: "/images/teachers/mamoru.jpg",
    hobby: "暗室作業・廃校ロケハン",
    motto: "光があれば影が生まれる。",
    subjects: "美術, 写真",
  },
  {
    id: "ganondorf",
    name: "横山ガノンドロフ先生",
    title: "情報 / サウンドデザイン",
    image: "/images/teachers/ganon.jpg",
    hobby: "シンセ収集・配線図づくり",
    motto: "雑音は編集で音楽になる。",
    subjects: "情報, サウンドデザイン",
  },
  {
    id: "monchin",
    name: "問珍仏破先生",
    title: "倫理 / 文化研究",
    image: "/images/teachers/monchin.jpg",
    hobby: "喫茶店巡礼・座談",
    motto: "笑いは最高の思考法。",
    subjects: "倫理, 文化研究",
  },
  {
    id: "zenshu",
    name: "然愁先生",
    title: "理科 / 環境科学",
    image: "/images/teachers/zenshu.jpg",
    hobby: "藻類観察・星空タイムラプス",
    motto: "自然は最強の教師。",
    subjects: "理科, 環境科学",
  },
  {
    id: "mugen",
    name: "夢幻泰介先生",
    title: "工学 / 企画開発",
    image: "/images/teachers/mugen.jpg",
    hobby: "プロトタイピング・ハッカソン",
    motto: "まず作る。話はそれからだ。",
    subjects: "工学, 企画開発",
  },
  {
    id: "dreamer",
    name: "ドリーマー宥太先生",
    title: "音楽 / キャリア",
    image: "/images/teachers/yuta.jpg",
    hobby: "深夜DTM・弾き語り",
    motto: "夢は締切で現実になる。",
    subjects: "音楽, キャリア",
  },
  {
    id: "hanhan",
    name: "令爆誕飯飯先生",
    title: "家庭科 / フードアート",
    image: "/images/teachers/hanhan.jpg",
    hobby: "試作まかない・燻製",
    motto: "おいしいは正義。",
    subjects: "家庭科, フードアート",
  },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/70 text-white px-2 py-1 text-[11px] tracking-wide">
      {children}
    </span>
  );
}

/** ヒーロー：枠・影・角丸なし。画像だけ“ドン”。縦横どちらでもOK。 */
function Hero({ t }: { t: Teacher }) {
  return (
    <div className="relative w-full">
      {/* 左上ラベル（背景に応じて自動反転：mix-blend-difference） */}
      <div className="absolute left-0 top-0 z-10 p-4 md:p-6 select-none">
        <div className="inline-flex items-baseline gap-2">
          <span
            className="
              rounded-full px-2.5 py-1 text-[11px] font-extrabold
              text-white mix-blend-difference
            "
          >
            {String(TEACHERS.findIndex(x => x.id === t.id) + 1).padStart(2, "0")}
          </span>
          <h3
            className="
              text-[clamp(22px,4.8vw,44px)] font-extrabold tracking-tight
              text-white mix-blend-difference
            "
          >
            {t.name}
          </h3>
        </div>
        {t.title && (
          <div
            className="
              mt-1 text-[12px] md:text-sm font-semibold
              text-white/90 mix-blend-difference
            "
          >
            {t.title}
          </div>
        )}
      </div>

      {/* 画像：object-contain で縦横対応／全幅表示・背景/枠なし */}
      <div className="relative w-full h-[clamp(300px,58vw,560px)]">
        <Image
          src={t.image}
          alt={t.name}
          fill
          sizes="100vw"
          className="object-contain select-none"
          priority={false}
        />
      </div>
    </div>
  );
}

export default function TeachersSection() {
  const [active, setActive] = useState(TEACHERS[0].id);
  const t = TEACHERS.find((x) => x.id === active)!;

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* セクション見出し（画像に“ギリ被る”ように下マイナスマージン） */}
        <header className="mb-[-6px] md:mb-[-10px]">
          <h2 className="text-[clamp(20px,4.2vw,32px)] font-extrabold tracking-tight">
            教員紹介
          </h2>
          <p className="mt-1 text-sm md:text-base text-slate-600">
            わからないことがあれば何でも先生に聞いてね！
          </p>
        </header>

        {/* メイン画像（枠なし） */}
        <Hero t={t} />

        {/* メタ情報 */}
        <div className="mt-4 md:mt-6 grid gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {t.hobby && <Badge>趣味</Badge>}
            {t.hobby && <span className="text-slate-800">{t.hobby}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {t.motto && <Badge>座右の銘</Badge>}
            {t.motto && <span className="text-slate-800">{t.motto}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {t.subjects && <Badge>担当科目</Badge>}
            {t.subjects && <span className="text-slate-800">{t.subjects}</span>}
          </div>
          <p className="mt-2 text-[13px] text-slate-600">
            参加方法・準備物・クラス企画の進め方まで、まずは担任の先生へ気軽に相談してください。
          </p>
        </div>

        {/* 先生セレクター（軽いピルUI。枠感なし） */}
        <div className="mt-6 md:mt-8">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {TEACHERS.map((x) => (
              <button
                key={x.id}
                onClick={() => setActive(x.id)}
                className={`
                  group relative flex items-center gap-3 rounded-2xl
                  bg-white hover:bg-pink-50/70
                  ring-1 ring-black/5 hover:ring-pink-200
                  px-3.5 py-3 text-left transition
                  shadow-[0_6px_16px_rgba(0,0,0,.04)]
                  ${active === x.id ? "outline outline-2 outline-pink-400/80" : ""}
                `}
                aria-pressed={active === x.id}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={x.thumb || x.image}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-bold leading-tight">{x.name}</div>
                  <div className="text-[12px] text-slate-600 leading-tight truncate">
                    {x.title || x.subjects}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="ml-auto pr-1 text-slate-400 group-hover:text-pink-500 transition"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
