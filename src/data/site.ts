// src/data/site.ts
// 年度で変わる値はここに集約する。2026年版への更新は、原則このファイルの値と画像の差し替えで行う。
// 本文の文言（guide / kokoroe / 出演者 / セリフ 等）は各ページ・コンポーネント側にある。
export const site = {
  year: 2025,
  title: "ガチ文化祭2025",
  /** Hero に出す会期の表示 */
  dateLabel: "2025年11月1日（土）～3日（祝）",
  /** 黒板タイムテーブルの見出し・特商法の引渡し日（1日目・2日目・本番日） */
  dayLabels: ["11月1日(土)", "11月2日(日)", "11月3日(祝日)"],
  /** 黒板タイムテーブル各日の紹介動画（YouTube ID） */
  dayYoutubeIds: ["8G67_w_tFB0", "jsczTaACzdU", "n3AKmUFhIuw"],
  /** パッケージ内訳の「打ち上げ」日 */
  afterPartyLabel: "11月4日",
  /** 黒板下の鍵付きタイルに出す解禁表示 */
  unlockLabel: "10月23日解禁!！",
  /** 会場（現状はコンポーネント側に直書きが残っており未参照。会場が変わる年に参照へ寄せる） */
  place: "奈良県　下市集学校（旧下市中学校）",
  /** パッケージの希望小売価格 */
  price: "33,450円（税込）",
  /** パッケージの発売日 */
  releaseDateLabel: "2025年10月15日",
  /** チケット購入（LivePocket） */
  ticketUrl: "https://t.livepocket.jp/e/gachi2025",
  /** 公開URL（metadataBase / og:url / 特商法の販売URL） */
  siteUrl: "https://www.gachibunkasai.com",
  ogImage: "/og.png",
} as const;

/** 半角数字を全角数字にする（パッケージ見出し「ガチ文化祭２０２５」の表記用） */
export const toFullWidthDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
