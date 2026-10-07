// src/data/site.ts
// 年度で変わる値はここに集約する。各セクションはここを読むだけ（ER図の形）。
// 正本の設計図＝非公開 artifact「ガチ文化祭 骨組み設計図」。〔仮〕は肉付け前の仮置き。

export type ItemId = "badge" | "armwash" | "key";

export const site = {
  year: 2026,
  title: "ガチ文化祭2026",
  concept: "自分に冷笑しろ",
  /** ゲーム解禁（公開）日時。これより前は、魔法陣を押しても導入に進まずカウントダウンを見せる */
  unlockAt: "2026-10-10T23:59:00+09:00",
  unlockLabel: "10月10日（土）23:59",
  grade: "二年目",
  /** 教育方針（アドミッションポリシーと教室の掛け軸が読む） */
  motto: "臥薪嘗胆",
  /** 黒板の見出し。{n} に本番（11/3）までの実際の日数が入る（本番の日は days の最終日の countdown） */
  countdownTemplate: "文化祭まであと{n}日！",
  /** 黒板の最下段（本番の日） */
  boardFinale: "ガチ文化祭！",
  /**
   * 教室の壁の時計の絵（Codex で作って差し替える）。public/clock/ に置いてパスを書く。空なら CSS の仮の時計。
   * 4枚とも同じ大きさの正方形・透過PNG/WebP。face＝針なしの文字盤、hour/minute/second＝中心から真上（12時）を指す針だけ。
   */
  clock: { face: "", hour: "", minute: "", second: "" },
  /**
   * 帯ごとの〔本人〕の文言（空なら出さない）。board＝黒板の右下の一行（こすれる）。
   * 準備中の看板：front＝表の字（夜、黒板の下に立てかけてある面）・back＝裏のマジック書き（昼、教室の後ろで見える面）。
   */
  sceneCopy: {
    shinya: { board: "" },
    akegata: { board: "" },
    asa: { board: "" },
    choshinsei: { board: "" },
    hiru: { board: "" },
    yugata: { board: "" },
    junbi: { board: "" },
    shoto: { board: "" },
  } as Record<string, { board: string }>,
  signboard: { front: "", back: "" },

  /* ---------- 開催（DAY / VENUE） ---------- */
  /** 公式バー・Hero に出す会期 */
  dateLabel: "2026年10月31日（土）～11月3日（火・祝）",
  dateShort: "2026.10.31(土)–11.3(火・祝)",
  finalDayLabel: "本番 11.3",
  place: "奈良県　下市集学校（旧下市中学校）",
  placeShort: "下市集学校",
  /**
   * 世界時計（トップの「いま」）。日付も時刻も実時刻。黒板の「あと◯日」は本番（eventDates.d4）までの実際の日数。
   * 灯りの生活リズム（蛍光灯・消灯）は、会期前は rhythmDay の時間割、会期中はその日の時間割。afterAt（片付けの終わり）以降は消された黒板だけが残る。
   */
  world: {
    rhythmDay: "d1",
    eventDates: { d1: "2026-10-31", d2: "2026-11-01", d3: "2026-11-02", d4: "2026-11-03" },
    afterAt: "2026-11-03T22:00:00+09:00",
    /** 窓の光（太陽の高さ・向き）の計算に使う位置。下市町の中心付近〔要確認：旧下市中学校の座標〕 */
    geo: { lat: 34.364, lon: 135.792 },
    /**
     * 一日を8つの帯に分ける（時刻ごとに学校の中身が変わる）。境目は4種類だけ：
     * 太陽の高さ（上り）／rhythmDay の時間割の「時刻のある行」の始まり・終わり／消灯（その日の最後の時刻の行の終わり）／0時。
     * 時刻のない行に時刻は作らない。時間割が変われば帯も一緒に動く。
     */
    scenes: [
      { key: "shinya", from: { midnight: true } }, // 深夜：0時〜空が白むまで
      { key: "akegata", from: { sun: -6 } }, // 明け方
      { key: "asa", from: { sun: 8 } }, // 朝
      { key: "choshinsei", from: { row: "超新星祭", edge: "start" } }, // 超新星祭
      { key: "hiru", from: { row: "超新星祭", edge: "end" } }, // 昼
      { key: "yugata", from: { row: "風呂", edge: "start" } }, // 夕方（全員が温泉）
      { key: "junbi", from: { row: "文化祭準備", edge: "start" } }, // 文化祭準備（青い手形はここから）
      { key: "shoto", from: { lightsOut: true } }, // 消灯
    ],
  },
  /** 黒板の各日（2026-10-02 本人提供「文化祭準備シーズン特別時間割」より。時刻のない行は time 空） */
  days: [
    {
      key: "d1",
      date: "10月31日(土)",
      countdown: "文化祭まであと3日！",
      items: [
        { time: "", label: "開門・登校時間" },
        { time: "", label: "SHR" },
        { time: "9:00〜10:35", label: "超新星祭" },
        { time: "", label: "3限 普通授業" },
        { time: "", label: "4限 HR・クラス企画" },
        { time: "", label: "昼休憩" },
        { time: "", label: "掃除" },
        { time: "", label: "5限 ガチ文授業" },
        { time: "", label: "HR" },
        { time: "15:15〜17:30", label: "風呂（下市温泉）" },
        { time: "18:00〜21:30", label: "文化祭準備" },
        { time: "", label: "消灯" },
      ],
      youtubeId: "8G67_w_tFB0",
    },
    {
      key: "d2",
      date: "11月1日(日)",
      countdown: "文化祭まであと2日！",
      items: [
        { time: "", label: "寝室施錠" },
        { time: "", label: "SHR" },
        { time: "", label: "映像授業" },
        { time: "9:50〜12:00", label: "文化祭準備" },
        { time: "", label: "本部企画 1500m走" },
        { time: "13:00〜15:00", label: "文化祭準備" },
        { time: "15:15〜17:30", label: "風呂（下市温泉）" },
        { time: "18:00〜21:30", label: "文化祭準備" },
        // 異変：本物の予定は読めるまま、時刻不明のかすれた行を1本足す（ANOMALY）
        { time: "??:??", label: "", smudged: true },
        { time: "", label: "消灯" },
      ],
      youtubeId: "jsczTaACzdU",
      anomaly: true,
    },
    {
      key: "d3",
      date: "11月2日(月)",
      countdown: "文化祭まであと1日！",
      items: [
        { time: "", label: "寝室施錠" },
        { time: "", label: "SHR" },
        { time: "9:00〜21:30", label: "文化祭準備" },
        { time: "", label: "消灯" },
      ],
      youtubeId: "jsczTaACzdU",
    },
    {
      key: "d4",
      date: "11月3日(火・祝)",
      countdown: "ガチ文化祭の日！",
      items: [
        { time: "", label: "寝室施錠" },
        { time: "", label: "SHR" },
        { time: "", label: "準備" },
        { time: "", label: "開会式" },
        { time: "11:00〜17:00", label: "文化祭 本番（一般公開）" },
        { time: "", label: "SHR" },
        { time: "", label: "閉会式" },
        { time: "18:00〜20:00", label: "後夜祭" },
        { time: "20:00〜22:00", label: "片付け" },
        { time: "", label: "消灯" },
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
    { id: "badge", name: "超新星バッジ", img: "/stage/crest.webp" },
    // 全自動腕洗い：後夜祭最後の曲「ARMSONG」（KAZUNOLONELY）に登場する腕洗いになぞらえた概念アイテム。タイムマシンの絵で拾う
    { id: "armwash", name: "全自動腕洗い", img: "/effects/time-machine.webp" },
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
