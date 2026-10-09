// 窓のあたりに置く、触って遊べる物の設定。
// phoneMv＝窓の下に立てかけたスマホで流す縦の動画。src（自前の縦動画のパス・例 "/kokuban/phone-mv.mp4"）を入れたら
//   YouTube を使わず <video> で流す（テレビの site.tv と同じ考え方）。src が空なら youtubeId の YouTube を流す。
// phoneArt＝スマホの絵（透過・正面・縦長）。空なら CSS で描いた仮の端末。絵の画面の位置は phoneMv.css の .kb-phone.has-art で合わせる。

export type PhoneMv = { youtubeId: string; src: string };

export const playground: { phoneMv: PhoneMv; phoneArt: string } = {
  phoneMv: { youtubeId: "Sb42gepEhrE", src: "" },
  phoneArt: "/playground/phone.webp",
};
