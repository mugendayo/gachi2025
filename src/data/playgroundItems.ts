// 窓際の机の物の設定（ガチャガチャ・生徒指導ポイントカード・銀のアタッシュケース）。
// 文言は本人の文か事実（動画の題名は YouTube の原文どおり）だけ。
import { site } from "@/data/site";
import { portfolioCards } from "@/data/outside";

export type GachaPrize = { year: number; title: string; youtubeId: string };

/** ガチャガチャの中身：過去の動画（年と題名）。開けて押すと、教室の後ろのテレビで流れる */
export const gachaPrizes: GachaPrize[] = [
  ...portfolioCards.flatMap((c) => (c.videos || []).map((v) => ({ year: c.year, title: v.title, youtubeId: v.id }))),
  { year: 2019, title: "[official movie] ガチ文化祭! 2019", youtubeId: site.tv[0].youtubeId },
  { year: 2024, title: "ガチ文化祭2024 -優先順位を飛び越えろ-", youtubeId: site.tv[1].youtubeId },
].filter((p) => p.youtubeId);

/** 生徒指導ポイントカード（2025 の実物と同じ書き方） */
export const pointCard = {
  title: "ガチ文高等学校 生徒指導ポイント",
  slots: 30,
};

/** 銀のアタッシュケース：ダイヤル錠の番号は、黒板の「文化祭まであと◯日！」の日数（3桁）。中身はシュークリームとドーナツ */
export const silverCase = {
  /** 中身：sweets＝シュークリームとドーナツ（本人 2026-10-09。過去の企画の「ミスドバトル」「シュークリームぶっぱバトル」。
   *  絵は他の物と同じく Playground.tsx から渡す）／coins＝五円玉の山（中身が決まるまでの仮）／empty＝空 */
  content: "sweets" as "coins" | "sweets" | "empty",
  /** ケースに貼る手がかりの一言〔本人〕。空なら貼らない */
  hint: "",
};
