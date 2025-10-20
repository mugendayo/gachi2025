// components/TeachersSection.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

/* =========================
   データ型＆テーマ
   ========================= */
const THEME = {
  akatsuki: { from: "#ff7a18", to: "#ff3d77", accent: "#fff", ring: "#ffb199" },
  shinai:   { from: "#06b6d4", to: "#3b82f6", accent: "#fff", ring: "#93c5fd" },
  mamoru:   { from: "#22c55e", to: "#16a34a", accent: "#0b3b1f", ring: "#86efac" },
  ganon:    { from: "#a855f7", to: "#ec4899", accent: "#fff", ring: "#f0abfc" },
  monchin:  { from: "#fb923c", to: "#f97316", accent: "#3b1d00", ring: "#fed7aa" },
  zenshu:   { from: "#60a5fa", to: "#2563eb", accent: "#061634", ring: "#93c5fd" },
  mugen:    { from: "#f59e0b", to: "#ef4444", accent: "#2b0a02", ring: "#fde68a" },
  yuta:     { from: "#10b981", to: "#14b8a6", accent: "#06231c", ring: "#99f6e4" },
  hanhan:   { from: "#ef4444", to: "#dc2626", accent: "#fff", ring: "#fecaca" },
} as const;

type ThemeKey = keyof typeof THEME;

type Teacher = {
  id: ThemeKey;
  name: string;
  title?: string;
  image: string;   // 縦長画像（3:4 推奨）
  hobby?: string;
  motto?: string;
  subjects?: string;
  thumb?: string;  // サムネ（なければ image を流用）
};

/* =========================
   マスターデータ
   ========================= */
const TEACHERS: Teacher[] = [
  { id: "akatsuki", name: "斬島", title: "教務主任/数学科", image: "/images/teachers/1.png", hobby: "検定・資格収集＆勝利", motto: "教育は⬛⬛である。", thumb: "/images/teachers/akatsuki.jpg", subjects: "数学科 代数学専攻" },
  { id: "shinai",   name: "志導シナイ", title: "生徒指導部/保健体育科", image: "/images/teachers/7.png",  hobby: "女性鑑賞＆混浴", motto: "おにぎりは丸い", subjects: "保健体育科 " },
  { id: "mamoru",   name: "志導マモル", title: "生徒指導部主任/体育科", image: "/images/teachers/4.png",  hobby: "犬の散歩＆娘と縄跳び", motto: "百聞は一見に如かず。", subjects: "体育科" },
  { id: "ganon",    name: "横山ガノンドロフ", title: "1年1組担任/1学年主任/国語科", image: "/images/teachers/2.png", hobby: "ガノンドロフする＆下克上", motto: "熱があるうちに打て", subjects: "国語科 現代文専攻" },
  { id: "monchin",  name: "問珍仏破", title: "3年2組担任/英語科", image: "/images/teachers/5.png", hobby: "シュークリームぶっぱバトル＆腕相撲", motto: "三度の飯よりぶっぱ", subjects: "英語科 コミュニケーション担当" },
  { id: "zenshu",   name: "然愁", title: "2年1組担任/2学年主任/社会科", image: "/images/teachers/8.png", hobby: "禅＆二郎系ラーメン", motto: "情熱と哀愁", subjects: "社会科 倫理専攻" },
  { id: "mugen",    name: "夢幻泰介", title: "3年1組担任/3学年主任/家庭科", image: "/images/teachers/6.png", hobby: "二郎系ラーメン屋巡り＆カードゲーム", motto: "純度100%の自分を表現する", subjects: "家庭科 二郎専攻" },
  { id: "yuta",     name: "ドリーマー宥太", title: "1年2組担任/保健体育科", image: "/images/teachers/9.png", hobby: "短眠", motto: "睡眠は身体に害", subjects: "保健体育科 短眠専攻" },
  { id: "hanhan",   name: "令爆誕飯飯", title: "2年2組担任/進路指導部/英語科", image: "/images/teachers/3.png", hobby: "学歴アキネーター＆学歴エンジェルフォール", motto: "天上天下唯我独尊", subjects: "英語科 東大英語専攻" },
];

/* =========================
   UI パーツ
   ========================= */

/** 矢印リボン（オーバーレイ削除版＝軽量＆安定） */
function Ribbon({
  text,
  from,
  to,
  className = "",
}: {
  text: string;
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative inline-flex items-center px-4 md:px-5 py-1.5 md:py-2",
        "font-extrabold text-white tracking-widest",
        "drop-shadow-[0_6px_14px_rgba(0,0,0,.25)] select-none will-change-transform",
        className,
      ].join(" ")}
      style={{
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        clipPath:
          "polygon(12px 0, 100% 0, 100% 70%, calc(100% + 18px) 50%, 100% 30%, 100% 100%, 12px 100%, 0 80%, 0 20%)",
      }}
    >
      {/* 内側の白ハイライト線のみ残す */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[14px]"
        style={{
          clipPath:
            "polygon(12px 0, 100% 0, 100% 70%, calc(100% + 18px) 50%, 100% 30%, 100% 100%, 12px 100%, 0 80%, 0 20%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)",
        }}
      />
      <span className="relative z-10">{text}</span>
    </div>
  );
}

/** ピル（先生名を目立たせたいので小さめデフォルト） */
function Pill({
  text,
  theme,
  size = "sm",
}: {
  text: string;
  theme: (typeof THEME)[ThemeKey];
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "sm"
      ? "px-2.5 md:px-3 py-0.5 md:py-1 text-[11px] md:text-[12px]"
      : "px-3 md:px-4 py-1 md:py-1.5 text-[12px] md:text-sm";
  return (
    <span
      className={`relative inline-flex items-center rounded-full text-white font-extrabold ring-2 shadow-[0_6px_14px_rgba(0,0,0,.25)] ${sizeCls}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        borderColor: theme.ring,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
      />
      {text}
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

/** 名前リボン + ピル群（重複タグは排除） */
function NameBand({ t }: { t: Teacher }) {
  const th = THEME[t.id] || THEME.ganon;
  const raw = [
    ...(t.title ? t.title.split(/[\/｜|]/).map((s) => s.trim()).filter(Boolean) : []),
    ...(t.subjects ? [t.subjects] : []),
  ];
  const tags = Array.from(new Set(raw)).slice(0, 8);

  return (
    <div className="relative z-10 mb-3 md:mb-4">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* 先生名は相対的に大きく */}
        <Ribbon text={t.name} from={th.from} to={th.to} className="text-base md:text-2xl" />
        {/* 科目ピルは小さく */}
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {tags.map((x, i) => (
            <Pill key={`${x}-${i}`} text={x} theme={th} size="sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 先生ボタン（視認性アップ版） */
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group relative grid place-items-center rounded-2xl px-2.5 py-2 transition",
        "bg-slate-50 hover:bg-slate-100",
        "ring-1 ring-slate-200 hover:ring-slate-300",
        "shadow-[0_6px_16px_rgba(0,0,0,.04)]",
        active ? "outline outline-2 outline-sky-400/80 bg-sky-50" : "",
      ].join(" ")}
    >
      <div className="relative h-10 w-10 md:h-10 md:w-10 overflow-hidden rounded-xl ring-1 ring-white/60">
        <Image src={t.thumb || t.image} alt={t.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="mt-1.5 w-full text-center">
        <div className="text-[11px] md:text-[12px] font-bold leading-tight line-clamp-2 text-slate-800">
          {t.name}
        </div>
        <div className="hidden md:block text-[11px] text-slate-500 leading-tight truncate">
          {t.title || t.subjects}
        </div>
      </div>
    </button>
  );
}

function TeacherSelector({
  teachers,
  active,
  setActive,
  className = "",
}: {
  teachers: Teacher[];
  active: ThemeKey;
  setActive: (id: ThemeKey) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-2">
        {teachers.map((x) => (
          <TeacherTile
            key={x.id}
            t={x}
            active={active === x.id}
            onClick={() => setActive(x.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** 右に縦長画像／左に情報＋（PCは）左下へボタンを絶対配置 */
function Hero({
  t,
  active,
  setActive,
}: {
  t: Teacher;
  active: ThemeKey;
  setActive: (id: ThemeKey) => void;
}) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-stretch">
      {/* 左列 */}
      <div className="order-2 md:order-1 md:col-span-5 relative min-h-full flex flex-col">
        <NameBand t={t} />

        <div className="grid gap-2 text-sm">
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

        {/* PCは左カラムの底に固定 */}
        <div className="hidden md:block absolute left-0 right-0 bottom-0">
          <TeacherSelector
            teachers={TEACHERS}
            active={active}
            setActive={setActive}
            className="pt-3"
          />
        </div>
      </div>

      {/* 右列：縦長画像 */}
      <div className="order-1 md:order-2 md:col-span-7">
        <div
          className="relative w-full rounded-[14px] overflow-hidden ring-1 ring-black/10 bg-slate-100"
          style={{ aspectRatio: "3/4" }}
        >
          <Image
            src={t.image}
            alt={t.name}
            fill
            sizes="(min-width:1024px) 620px, (min-width:768px) 560px, 92vw"
            className="object-cover object-center md:object-right select-none"
            priority
          />
        </div>
      </div>

      {/* モバイルは従来どおり下にボタン */}
      <TeacherSelector
        teachers={TEACHERS}
        active={active}
        setActive={setActive}
        className="mt-4 md:hidden order-3"
      />
    </div>
  );
}

/* =========================
   セクション本体
   ========================= */
export default function TeachersSection() {
  const [active, setActive] = useState<ThemeKey>(TEACHERS[0].id);
  const t = TEACHERS.find((x) => x.id === active) ?? TEACHERS[0];

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <header className="mb-3 md:mb-4">
          <div className="relative">
            <h2 className="text-[clamp(24px,8vw,64px)] font-extrabold tracking-widest text-slate-100/60 select-none">
              TEACHERS
            </h2>
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Ribbon text="教員紹介" from="#ef4444" to="#f97316" />
            </div>
          </div>
          <p className="mt-2 text-sm md:text-base text-slate-700">
            わからないことがあれば何でも先生に聞いてね！
          </p>
        </header>

        <Hero t={t} active={active} setActive={setActive} />
      </div>
    </section>
  );
}
