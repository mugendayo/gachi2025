// サイト全体で共有する「いま」。?t= の上書き（検分用）と、配信元の時刻での補正を1か所で持つ。
// 黒板・カウントダウン・入口の魔法陣は、すべてここの now() を読む（部品ごとに時計がずれないように）。
import { overrideOffset } from "@/lib/worldClock";

let offset: number | null = null;
let overridden = false;

const init = () => {
  if (offset !== null) return;
  if (typeof window === "undefined") {
    offset = 0;
    return;
  }
  const o = overrideOffset(window.location.search, Date.now());
  overridden = o !== null;
  offset = o ?? 0;
};

/** いまの時刻（ms）。?t= があればその時刻から進む */
export const now = () => {
  init();
  return Date.now() + (offset as number);
};

/** ?t= で時刻を上書きしているか */
export const isOverridden = () => {
  init();
  return overridden;
};

export const CLOCK_EVENT = "kb:clock";

/** 配信元の時刻で端末の時計を補正する（?t= のときはしない）。補正したら CLOCK_EVENT を送る */
export function syncWithServer() {
  init();
  if (overridden || typeof window === "undefined") return;
  fetch(window.location.pathname, { method: "HEAD", cache: "no-store" })
    .then((res) => {
      const d = Date.parse(res.headers.get("date") || "");
      if (Number.isFinite(d) && Math.abs(d - Date.now()) > 60000) {
        offset = d - Date.now();
        window.dispatchEvent(new Event(CLOCK_EVENT));
      }
    })
    .catch(() => {});
}

/** 入口のタイムスリップが終わって教室に着いたとき、入口から送るイベント */
export const ARRIVE_EVENT = "kb:arrive";
