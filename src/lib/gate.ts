// 門：同じページに2つの世界線がある。
// 門の外＝現実の世界線（ThanatosGames が作っている「ガチ文化祭」というゲームの箱＝公式の事実・参加する）。
// 門の内＝ゲームの中の世界線（10/31 の学校：教室〜舞台・最下部）。入口の魔法陣でタイムスリップした人だけが入れる。
// 公式バーとフッターは両方の世界線に共通の枠（定番規格）なので、日程・会場・参加するはどちらでも読める。
// 一度くぐると、その訪問（タブを閉じるまで）は開いたまま。次に開き直したら、また門から入る。
import { site } from "@/data/site";

export const GATE_KEY = `gbf_${site.year}_gate`;
export const GATE_EVENT = "kb:gate";

export const isGateOpen = () => {
  try {
    return sessionStorage.getItem(GATE_KEY) === "open";
  } catch {
    return false;
  }
};

const world = () => document.getElementById("kb-world");

/** いまの訪問の状態を教室に反映する（ページ内移動で戻ったとき用。描画前に呼ぶ） */
export const applyGate = () => {
  const w = world();
  if (w) w.dataset.gate = isGateOpen() ? "open" : "closed";
};

/** 門を開ける（タイムスリップの真っ白の瞬間に呼ぶ） */
export const openGate = () => {
  try {
    sessionStorage.setItem(GATE_KEY, "open");
  } catch {}
  const w = world();
  if (w) w.dataset.gate = "open";
  window.dispatchEvent(new Event(GATE_EVENT));
};
