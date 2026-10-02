// src/data/site.ts
// 年度で変わる値はここに集約する。各セクションはここを読むだけ（ER図の形）。
// 正本の設計図＝非公開 artifact「ガチ文化祭 骨組み設計図」。〔仮〕は肉付け前の仮置き。

export type ItemId = "badge" | "sword" | "key";

export const site = {
  year: 2026,
  title: "ガチ文化祭2026",
  concept: "自分に冷笑しろ",
  grade: "二年目",

  /* ---------- 開催（DAY / VENUE） ---------- */
  /** 公式バー・Hero に出す会期 */
  dateLabel: "2026年10月31日（土）～11月3日（火・祝）",
  dateShort: "2026.10.31(土)–11.3(火・祝)",
  finalDayLabel: "本番 11.3",
  place: "奈良県　下市集学校（旧下市中学校）",
  placeShort: "下市集学校",
  /** 黒板の各日。items は〔仮〕＝2025の進行を流用（2026の時刻は未決） */
  days: [
    {
      key: "d1",
      date: "10月31日(土)",
      countdown: "文化祭まであと3日！",
      items: [
        { time: "08:00", label: "遅刻厳禁！超新星ホームルーム" },
        { time: "09:00", label: "通常授業" },
        { time: "10:45", label: "ガチ文高等学校体育祭" },
        { time: "14:30", label: "文化祭準備" },
      ],
      youtubeId: "8G67_w_tFB0",
    },
    {
      key: "d2",
      date: "11月1日(日)",
      countdown: "文化祭まであと2日！",
      items: [
        { time: "08:30", label: "超新星ホームルーム" },
        { time: "09:45", label: "文化祭準備" },
        { time: "12:20", label: "限界を越えろ！1500m走" },
        // 異変：夜の予定がかすれて読めない（ANOMALY）
        { time: "19:00", label: "", smudged: true },
      ],
      youtubeId: "jsczTaACzdU",
      anomaly: true,
    },
    {
      key: "d3",
      date: "11月2日(月)",
      countdown: "文化祭まであと1日！",
      items: [
        { time: "08:30", label: "超新星ホームルーム" },
        { time: "09:00", label: "映像授業" },
        { time: "09:45", label: "文化祭準備（追い込み）" },
      ],
      youtubeId: "jsczTaACzdU",
    },
    {
      key: "d4",
      date: "11月3日(火・祝)",
      countdown: "ガチ文化祭の日！",
      items: [
        { time: "08:30", label: "超新星ホームルーム！" },
        { time: "10:30", label: "開会式＆高校生バンド" },
        { time: "11:00", label: "ガチ文化祭！" },
        { time: "17:15", label: "閉会式" },
        { time: "18:00", label: "後夜祭" },
      ],
      youtubeId: "n3AKmUFhIuw",
    },
  ],
  /** パッケージ内訳の「打ち上げ」日（本番の翌日） */
  afterPartyLabel: "11月4日",

  /* ---------- 参加（ENTRY） ---------- */
  /** パッケージの希望小売価格 */
  price: "38,700円（税込）",
  /** パッケージの発売日（Discordで申込受付が始まる日） */
  releaseDateLabel: "2026年10月1日",
  paymentLabel: "当日決済（事前に払いたい人向けのリンクはDiscord内）",
  /** 申込の入口。公式サイトからはチェック付きポップアップを経由して開く */
  discordUrl: "https://discord.gg/MXCb23rm2s",

  /* ---------- もちもの（ITEM）：アーツとは別 ---------- */
  items: [
    { id: "badge", name: "超新星バッジ", img: "/stage/crest.png" },
    { id: "sword", name: "バスターソード", img: "/icons/arm.png" },
    { id: "key", name: "地下室の鍵", img: "/items/key.svg" },
  ] as { id: ItemId; name: string; img: string }[],
  /** 3つ揃うと最下部に出るリンク */
  rewardUrl: "https://thanatosgames.jp/",

  /* ---------- 校内連絡（NOTICE）：Discordの業務連絡と同文。ひろしくんの補足はDiscordのみ ---------- */
  notice: {
    slug: "/notice",
    tags: ["業務連絡", "重要・必読"],
    title: "準備期間中の校内移動について",
    from: "ガチ文高等学校 教務主任 斬島",
    to: "在校生各位",
    lead: "いつもお世話になっております。教務主任の斬島です。文化祭準備期間（10/31〜）における校内移動について、以下のとおり連絡します。",
    reports: [
      "夕方、外廊下の奥に大きくて青いものが立っていた",
      "無人の教室から、足音が近づいてきた",
      "準備中の看板に、青い手形が増えている",
      "教員の顔が一瞬、教員のものではなかった",
    ],
    reportsNote: "いずれも確認中です。",
    rules: [
      "外廊下は二名以上で移動すること",
      "遭遇した場合は、目を合わせず速やかに逃げること",
      "タンス・クローゼット等への退避は推奨しません",
      "教員の様子に違和感がある場合は、距離をとること",
      "落ちている鍵は拾わないこと",
    ],
    notes: ["本年度に限り、廊下の早歩きを許可します。"],
    closing: "準備は計画的に進めてください。",
    struck: "可能であれば。",
  },

  /* ---------- ライブラリ（過去のソフト） ---------- */
  library: [
    { year: 2018, label: "プレ開催" },
    { year: 2019, label: "打上花火", url: "https://mugendayo.com/project001/" },
    { year: 2020, label: "中止", off: true },
    { year: 2021, label: "" },
    { year: 2022, label: "" },
    { year: 2023, label: "" },
    { year: 2024, label: "優先順位を飛び越えろ", url: "https://gachibun.studio.site/" },
    { year: 2025, label: "ヨヤクナシでパビってんの？", url: "https://2025.gachibunkasai.com/" },
  ] as { year: number; label: string; url?: string; off?: boolean }[],

  /* ---------- 公開URL ---------- */
  /** metadataBase / og:url / 特商法の販売URL */
  siteUrl: "https://www.gachibunkasai.com",
  ogImage: "/og.png",
} as const;

/** 半角数字を全角数字にする（パッケージ見出し「ガチ文化祭２０２６」の表記用） */
export const toFullWidthDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
