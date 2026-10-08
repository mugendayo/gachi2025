// 門：同じページに2つの世界線がある。
// 門の外＝現実の世界線（いつでも高校生に戻れる社会をつくるために、いろんな場所で文化祭をつくっている＝理念・実績・今年の開催概要・参加する）。
// 門の内＝ゲームの中の世界線（10/31 の学校：教室〜舞台・最下部）。入口の魔法陣でタイムスリップした人だけが入れる。
// 公式バーとフッターは両方の世界線に共通の枠（定番規格）なので、日程・会場・参加するはどちらでも読める。
// くぐった状態は、ページを開いている間だけ覚えておく（サイト内の移動で戻っても開いたまま／読み込み直すと閉じる＝毎回門から入る）。
// タブの保存領域（sessionStorage）には残さない：残すと読み込み直しても開いたままになり、タイムスリップ前に学校が見えてしまう。
declare global {
  interface Window {
    __kbGateOpen?: boolean;
  }
}

export const GATE_EVENT = "kb:gate";

export const isGateOpen = () => typeof window !== "undefined" && !!window.__kbGateOpen;

const world = () => document.getElementById("kb-world");

/** いまの状態を教室に反映する（サイト内の移動で戻ったとき用。描画前に呼ぶ） */
export const applyGate = () => {
  const w = world();
  if (w) w.dataset.gate = isGateOpen() ? "open" : "closed";
};

/** 門を開ける（タイムスリップの真っ白の瞬間に呼ぶ） */
export const openGate = () => {
  window.__kbGateOpen = true;
  const w = world();
  if (w) w.dataset.gate = "open";
  window.dispatchEvent(new Event(GATE_EVENT));
};
