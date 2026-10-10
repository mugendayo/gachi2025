// src/data/teachers.ts
// ガチ文高等学校の先生一覧（guide の「先生」セクションはこの表を読むだけ）。
//
// ■ 書き換え方
//   ・1人＝1行（{ ... }）。並び順がそのまま表示順。
//   ・必須は id（英字で重ならない名前）と name だけ。他は空でも表示が崩れない。
//   ・image は public/ 以下の画像パス。未用意なら空 "" のままでよい（仮の画像が入る）。
//   ・color を省くと、順番に応じた色が自動で付く。
//   ・ここを保存して dev/2026 に push すれば Preview に出る。

export type TeacherTheme = { from: string; to: string; accent: string; ring: string };

export type Teacher = {
  id: string;
  name: string;
  reading?: string; // 読み
  title?: string; // 肩書き（担任・教科など）
  image?: string; // 縦長画像（3:4 推奨）
  thumb?: string; // 一覧の丸サムネ（なければ image）
  hobby?: string;
  motto?: string; // 座右の銘
  subjects?: string; // 担当
  color?: TeacherTheme;
};

/** 画像がまだ無い先生に入る仮の画像 */
export const TEACHER_PLACEHOLDER = "/og.png";

// 〔仮〕＝2025年版の素材・肩書きを流用している行。本人が上書きする
export const teachers: Teacher[] = [
  { id: "akatsuki", name: "斬島悪暁", reading: "きりしま あくあ", title: "教務主任/数学科　教員番号000", image: "/images/teachers/1.webp", thumb: "/images/teachers/akatsuki.webp", hobby: "検定・資格収集＆勝利", motto: "教育は⬛⬛である。", subjects: "数学科 代数学専攻" },
  { id: "ganon", name: "新山ガノンドロフ", reading: "", title: "1学年主任/国語科", image: "/images/teachers/2.webp", hobby: "ガノンドロフする＆下克上", motto: "熱があるうちに打て", subjects: "国語科 現代文専攻" },
  { id: "shinai", name: "霧島シナイ", reading: "", title: "生徒指導部/保健体育科", image: "/images/teachers/7.webp", hobby: "女性鑑賞＆混浴", motto: "おにぎりは丸い", subjects: "保健体育科" },
  { id: "zenshu", name: "然愁", reading: "ゼンシュウ", title: "2学年主任/社会科", image: "/images/teachers/8.webp", hobby: "禅＆二郎系ラーメン", motto: "情熱と哀愁", subjects: "社会科 倫理専攻" },
  { id: "hanhan", name: "令爆誕飯飯", reading: "リー・バース・イーハン", title: "進路指導部/英語科", image: "/images/teachers/3.webp", hobby: "学歴アキネーター＆学歴エンジェルフォール", motto: "天上天下唯我独尊", subjects: "英語科 東大英語専攻" },
  { id: "yamato", name: "皇 大和", reading: "すめらぎ やまと", title: "", image: "", hobby: "", motto: "", subjects: "" },
  { id: "monchin", name: "問珍仏破", reading: "といれあぶっぱ", title: "英語科", image: "/images/teachers/5.webp", hobby: "シュークリームぶっぱバトル＆腕相撲", motto: "三度の飯よりぶっぱ", subjects: "英語科 コミュニケーション担当" },
];

/* ---------- 校長と教頭（職員室の座席表の頭だけが読む） ----------
   teachers には入れない（guide の先生一覧は7名のまま）。
   値は2025年版（SchoolIntro の PRINCIPAL / VICE）の写し。name / reading は本人の字「炎山　塚根」と写真の表記に合わせた仮置き */
export type HeadShot = { src: string; alt: string };

export type Head = {
  id: "principal" | "vice";
  room?: string; // 座席表の枠に付いた札（校長室）
  role?: string; // 机に出す肩書き（教頭）
  name: string;
  reading: string;
  title: string; // 肩書き（フル）。カードの読み上げ用
  fullName: string; // 2025年版の名前。カードの読み上げ用
  bio: string; // カードの読み上げ用の説明
  thumb: string; // 座席の写真
  story: [HeadShot, HeadShot]; // カードの写真2枚（540×960）
};

export const heads: Head[] = [
  {
    id: "principal",
    room: "校長室",
    name: "塚根",
    reading: "つかね",
    title: "ガチ文高等学校 校長",
    fullName: "つかね ひろき",
    bio: "“いつでも高校生に戻れる社会をつくる” を合言葉に、生徒一人ひとりに青い春と希望を与える。前職はマザーテレサ。趣味は世界平和。",
    thumb: "/principal/thumb.webp",
    story: [
      { src: "/principal/1.webp", alt: "校長 1/2" },
      { src: "/principal/2.webp", alt: "校長 2/2" },
    ],
  },
  {
    id: "vice",
    role: "教頭",
    name: "炎山",
    reading: "えんざん",
    title: "ガチ文高等学校 教頭",
    fullName: "炎山（えんざん）",
    bio: "現実主義で“仕組みで青春”を推進。高校時代の文化祭そして使われなくなった廃校に命を芽吹くことに命を賭ける。前職は宮代健太。趣味は多拠点生活。",
    thumb: "/vice/thumb.webp",
    story: [
      { src: "/vice/1.webp", alt: "教頭 1/2" },
      { src: "/vice/2.webp", alt: "教頭 2/2" },
    ],
  },
];

/* ---------- 以下は表示側の補助（書き換え不要） ---------- */
const PALETTE: TeacherTheme[] = [
  { from: "#ff7a18", to: "#ff3d77", accent: "#fff", ring: "#ffb199" },
  { from: "#a855f7", to: "#ec4899", accent: "#fff", ring: "#f0abfc" },
  { from: "#06b6d4", to: "#3b82f6", accent: "#fff", ring: "#93c5fd" },
  { from: "#60a5fa", to: "#2563eb", accent: "#061634", ring: "#93c5fd" },
  { from: "#ef4444", to: "#dc2626", accent: "#fff", ring: "#fecaca" },
  { from: "#6366f1", to: "#1e3a8a", accent: "#fff", ring: "#c7d2fe" },
  { from: "#fb923c", to: "#f97316", accent: "#3b1d00", ring: "#fed7aa" },
  { from: "#22c55e", to: "#16a34a", accent: "#0b3b1f", ring: "#86efac" },
];

export const themeOf = (t: Teacher): TeacherTheme =>
  t.color ?? PALETTE[Math.max(0, teachers.findIndex((x) => x.id === t.id)) % PALETTE.length];

export const imageOf = (t: Teacher) => t.image || TEACHER_PLACEHOLDER;
export const thumbOf = (t: Teacher) => t.thumb || t.image || TEACHER_PLACEHOLDER;
