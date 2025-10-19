// components/TeachersSection.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

type Teacher = {
  id: string;
  name: string;
  title?: string;
  image: string;
  hobby?: string;
  motto?: string;
  subjects?: string;
  thumb?: string;
};

const TEACHERS: Teacher[] = [
  {
    id: "akatsuki",
    name: "斬島先生",
    title: "教務主任/数学科",
    image: "/images/teachers/akatsuki.jpg",
    hobby: "検定・資格収集＆勝利",
    motto: "教育は⬛⬛である。",
    thumb: "/images/teachers/akatsuki.jpg",
    subjects: "数学科 代数学専攻",
  },
  {
    id: "shinai",
    name: "志導シナイ先生",
    title: "生徒指導部/保健体育科",
    image: "/images/teachers/shinai.jpg",
    hobby: "女性鑑賞＆混浴",
    motto: "おにぎりは丸い",
    subjects: "保健体育科 ",
  },
  {
    id: "mamoru",
    name: "志導マモル先生",
    title: "生徒指導部主任/体育科",
    image: "/images/teachers/mamoru.jpg",
    hobby: "犬の散歩＆娘と縄跳び",
    motto: "百聞は一見に如かず。",
    subjects: "体育科",
  },
  {
    id: "ganon",
    name: "横山ガノンドロフ先生",
    title: "1年1組担任/1学年主任/国語科",
    image: "/images/teachers/ganon.jpg",
    hobby: "ガノンドロフする＆下克上",
    motto: "熱があるうちに打て",
    subjects: "国語科 現代文専攻",
  },
  {
    id: "monchin",
    name: "問珍仏破先生",
    title: "3年2組担任/英語科",
    image: "/images/teachers/monchin.jpg",
    hobby: "シュークリームぶっぱバトル＆腕相撲",
    motto: "三度の飯よりぶっぱ",
    subjects: "英語科 コミュニケーション担当",
  },
  {
    id: "zenshu",
    name: "然愁先生",
    title: "2年1組担任/2学年主任/社会科",
    image: "/images/teachers/zenshu.jpg",
    hobby: "禅＆二郎系ラーメン",
    motto: "情熱と哀愁",
    subjects: "社会科 倫理専攻",
  },
  {
    id: "mugen",
    name: "夢幻泰介先生",
    title: "3年1組担任/3学年主任/家庭科",
    image: "/images/teachers/mugen.jpg",
    hobby: "二郎系ラーメン屋巡り＆カードゲーム",
    motto: "純度100%の自分を表現する",
    subjects: "家庭科 二郎専攻",
  },
  {
    id: "yuta",
    name: "ドリーマー宥太先生",
    title: "1年2組担任/保健体育科",
    image: "/images/teachers/yuta.jpg",
    hobby: "短眠",
    motto: "睡眠は身体に害",
    subjects: "保健体育科 短眠専攻",
  },
  {
    id: "hanhan",
    name: "令爆誕飯飯先生",
    title: "2年2組担任/進路指導部/英語科",
    image: "/images/teachers/hanhan.jpg",
    hobby: "学歴アキネーター＆学歴エンジェルフォール",
    motto: "天上天下唯我独尊",
    subjects: "英語科 東大英語専攻",
  },
];

// 先生ごとのテーマ色
const NAME_THEME: Record<
  string,
  { from: string; to: string; accent: string; ring: string }
> = {
  akatsuki: { from: "#ff7a18", to: "#ff3d77", accent: "#fff", ring: "#ffb199" },
  shinai:   { from: "#06b6d4", to: "#3b82f6", accent: "#fff", ring: "#93c5fd" },
  mamoru:   { from: "#22c55e", to: "#16a34a", accent: "#0b3b1f", ring: "#86efac" },
  ganon:    { from: "#a855f7", to: "#ec4899", accent: "#fff", ring: "#f0abfc" },
  monchin:  { from: "#fb923c", to: "#f97316", accent: "#3b1d00", ring: "#fed7aa" },
  zenshu:   { from: "#60a5fa", to: "#2563eb", accent: "#061634", ring: "#93c5fd" },
  mugen:    { from: "#f59e0b", to: "#ef4444", accent: "#2b0a02", ring: "#fde68a" },
  yuta:     { from: "#10b981", to: "#14b8a6", accent: "#06231c", ring: "#99f6e4" },
  hanhan:   { from: "#ef4444", to: "#dc2626", accent: "#fff", ring: "#fecaca" },
};

/** 疾走感＋立体フォント演出（COURSE風） */
function NameLogo({ id, text }: { id: string; text: string }) {
  const theme = NAME_THEME[id] || { from: "#60a5fa", to: "#3b82f6", accent: "#fff", ring: "#93c5fd" };

  return (
    <div className="relative inline-block select-none">
      {/* 疾走線 */}
      <div
        aria-hidden
        className="absolute inset-0 skew-x-12"
        style={{
          background:
            "repeating-linear-gradient(120deg, rgba(255,255,255,.15) 0 5px, transparent 5px 18px)",
          WebkitMaskImage: "linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,.9))",
        }}
      />
      {/* 3Dレイヤー */}
      {[...Array(8)].map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute top-0 left-0"
          style={{
            transform: `translate(${i * 1.4}px, ${i * 1.2}px) skewX(-8deg)`,
            color: "rgba(0,0,0,0.15)",
            WebkitTextStroke: "1px rgba(0,0,0,0.05)",
            fontWeight: 900,
            fontSize: "clamp(28px,7vw,72px)",
          }}
        >
          {text}
        </span>
      ))}
      {/* メイン文字 */}
      <span
        className="relative font-extrabold uppercase leading-none tracking-[.04em]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
          WebkitBackgroundClip: "text",
          color: "transparent",
          textShadow: `
            -2px -2px 3px rgba(255,255,255,.25),
            4px 4px 6px rgba(0,0,0,.25)
          `,
          transform: "skewX(-8deg)",
          display: "inline-block",
          fontSize: "clamp(28px,7vw,72px)",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** 枠付きピル（学年/担当 表示用） */
function TagPill({
  label,
  theme,
}: {
  label: string;
  theme: { from: string; to: string; accent: string; ring: string };
}) {
  return (
    <span
      className="
        relative inline-flex items-center rounded-full px-3 py-1
        text-[11px] md:text-[12px] font-bold
        shadow-[0_6px_16px_rgba(0,0,0,.22)] ring-2 backdrop-blur-[2px]
      "
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        color: theme.accent,
        borderColor: theme.ring,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
      />
      {label}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/70 text-white px-2 py-1 text-[11px] tracking-wide">
      {children}
    </span>
  );
}

/** ヒーロー（16:9・名前ロゴ＋カラータグ） */
function Hero({ t }: { t: Teacher }) {
  const theme = NAME_THEME[t.id] || NAME_THEME.ganon;

  // タイトルを「/ |」で分割し、subjects も最後に足す
  const parts = [
    ...(t.title ? t.title.split(/[\/｜|]/).map((s) => s.trim()).filter(Boolean) : []),
    ...(t.subjects ? [t.subjects] : []),
  ];

  return (
    <div className="relative w-full">
      <div className="absolute left-0 top-0 z-10 p-4 md:p-6">
        <NameLogo id={t.id} text={t.name} />
        {parts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parts.map((p, i) => (
              <TagPill key={i} label={p} theme={theme} />
            ))}
          </div>
        )}
      </div>
      <div className="relative w-full aspect-[16/9]">
        <Image
          src={t.image}
          alt={t.name}
          fill
          sizes="100vw"
          className="object-cover select-none"
        />
      </div>
    </div>
  );
}

/** 先生タイル（スマホでも常時3列） */
function TeacherTile({
  t,
  active,
  onClick,
}: {
  t: Teacher;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group relative grid place-items-center rounded-2xl",
        "bg-white hover:bg-pink-50/70",
        "ring-1 ring-black/5 hover:ring-pink-200",
        "px-2.5 py-2 transition",
        "shadow-[0_6px_16px_rgba(0,0,0,.04)]",
        active ? "outline outline-2 outline-pink-400/80" : "",
      ].join(" ")}
    >
      <div className="relative h-10 w-10 md:h-11 md:w-11 overflow-hidden rounded-xl">
        <Image src={t.thumb || t.image} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="mt-1.5 w-full text-center">
        <div className="text-[11px] md:text-[12px] font-bold leading-tight line-clamp-2">
          {t.name}
        </div>
        <div className="hidden md:block text-[11px] text-slate-600 leading-tight truncate">
          {t.title || t.subjects}
        </div>
      </div>
    </button>
  );
}

export default function TeachersSection() {
  const [active, setActive] = useState(TEACHERS[0].id);
  const t = TEACHERS.find((x) => x.id === active)!;

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <header className="mb-2">
          <h2 className="text-[clamp(20px,4.2vw,32px)] font-extrabold tracking-tight">教員紹介</h2>
          <p className="mt-1 text-sm md:text-base text-slate-600">
            わからないことがあれば何でも先生に聞いてね！
          </p>
        </header>

        <Hero t={t} />

        {/* メタ情報（趣味/座右の銘/担当説明） */}
        <div className="mt-4 md:mt-6 grid gap-2 text-sm">
          {t.hobby && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge>趣味</Badge>
              <span className="text-slate-800">{t.hobby}</span>
            </div>
          )}
          {t.motto && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge>座右の銘</Badge>
              <span className="text-slate-800">{t.motto}</span>
            </div>
          )}
          {t.subjects && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge>担当科目</Badge>
              <span className="text-slate-800">{t.subjects}</span>
            </div>
          )}
          <p className="mt-2 text-[13px] text-slate-600">
            参加方法・準備物・クラス企画の進め方まで、まずは担任の先生へ気軽に相談してください。
          </p>
        </div>

        {/* 先生セレクター：スマホでも常に3列 */}
        <div className="mt-6 md:mt-8">
          <div className="grid grid-cols-3 gap-2.5 md:gap-3">
            {TEACHERS.map((x) => (
              <TeacherTile
                key={x.id}
                t={x}
                active={active === x.id}
                onClick={() => setActive(x.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
