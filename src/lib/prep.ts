// 輪飾りの長さと色（保存しない純関数）。
// 長さ：解禁の次の日から会期の前の日まで、毎晩の「文化祭準備」の時間だけ伸びる（時刻が同じなら全員同じ長さ）。
// 会期中は変えない。最終日の「片付け」の間に、まっすぐ短くなっていく。
// 色：色紙の袋（14色×20枚）から、好かれている色ほど先に取り出す。終盤は残った茶や灰が多くなる。
import { site } from "@/data/site";
import { clockConfig, clockCore, type Phase } from "@/lib/worldClock";

const JST = 9 * 3600000;
const DAY = 86400000;

/** "18:00〜21:30" → [1080, 1290] */
const range = (s: string): [number, number] | null => {
  const m = s.match(/^(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})$/);
  return m ? [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]] : null;
};

/** その日の、時刻のある行のうち label が条件に合うもの（分） */
const rowsOf = (dayKey: string, ok: (label: string) => boolean) => {
  const day = site.days.find((d) => d.key === dayKey);
  if (!day) return [] as [number, number][];
  return day.items.flatMap((row) => {
    const r = range(row.time);
    return r && ok(row.label) ? [r] : [];
  });
};

/** 毎晩、輪飾りが伸びる時間（会期前の時間割の「準備」の行） */
const PREP = rowsOf(clockConfig.rhythmDay, (l) => l.includes("準備") && !l.includes("片付け"));
/** 最終日の片付けの時間（ここで短くなっていく） */
const CLEAN = rowsOf("d4", (l) => l.includes("片付け"));

/** "YYYY-MM-DD"（JST）の 0時の ms */
const dayStart = (ymd: string) => Date.parse(ymd + "T00:00:00+09:00");
const ymdOf = (ms: number) => new Date(ms + JST).toISOString().slice(0, 10);

/** 伸びる日（解禁の日の次の日〜会期の前の日）の 0時の一覧と、伸びる時間の合計（分） */
const PREP_DAYS: number[] = (() => {
  const out: number[] = [];
  const first = dayStart(ymdOf(clockConfig.unlockTs)) + DAY;
  const end = dayStart(clockConfig.eventDates.d1);
  for (let t = first; t < end; t += DAY) out.push(t);
  return out;
})();
const PREP_TOTAL = PREP_DAYS.length * PREP.reduce((n, r) => n + (r[1] - r[0]), 0);

/** 準備の進み具合 0〜1（同じ時刻なら全員同じ） */
export function prepProgress(nowMs: number): number {
  const phase = clockCore(nowMs, clockConfig).phase;
  if (phase === "sealed" || phase === "after") return 0;
  if (phase === "live") {
    // 会期中は変えない。最終日の片付けの間だけ、まっすぐ減らす
    if (ymdOf(nowMs) !== clockConfig.eventDates.d4) return 1;
    const minute = (nowMs - dayStart(clockConfig.eventDates.d4)) / 60000;
    for (const [a, b] of CLEAN) {
      if (minute >= a && minute < b) return 1 - (minute - a) / (b - a);
    }
    const lastEnd = Math.max(0, ...CLEAN.map((r) => r[1]));
    return CLEAN.length && minute >= lastEnd ? 0 : 1;
  }
  // 会期前：これまでの夜の準備の時間を足す（準備の行の外では伸びない）
  if (!PREP_TOTAL) return 1;
  let done = 0;
  for (const d of PREP_DAYS) {
    if (d > nowMs) break;
    for (const [a, b] of PREP) {
      const s = Math.max(d + a * 60000, clockConfig.unlockTs);
      const e = Math.min(d + b * 60000, nowMs);
      if (e > s) done += (e - s) / 60000;
    }
  }
  return Math.min(1, done / PREP_TOTAL);
}

/** 共有の輪の数（最大240。解禁直後の昼は6個＝机の上の作りかけ） */
export const sharedCount = (p: number, phase: Phase) => (p <= 0 && phase !== "eve" ? 0 : 6 + Math.round(p * 234));

/** いまの時刻の、共有の輪の数 */
export const sharedTarget = (nowMs: number) => sharedCount(prepProgress(nowMs), clockCore(nowMs, clockConfig).phase);

/** 色紙の袋：色と好かれ度（重い色ほど先に出る）。橙は入れない */
export const PAPER: [string, number][] = [
  ["#d8423a", 9], // 赤
  ["#ef8fb0", 9], // 桃
  ["#f2d14a", 8], // 黄
  ["#7cc6e6", 8], // 水色
  ["#a9cf4a", 6], // 黄緑
  ["#3d6fc0", 6], // 青
  ["#8a5cb0", 5], // 紫
  ["#3f9a5a", 5], // 緑
  ["#f1efe8", 4], // 白
  ["#b9bcc0", 3], // 銀
  ["#8a5a3a", 2], // 茶
  ["#8d8f92", 2], // 灰
  ["#2a2a2c", 1], // 黒
  ["#283a6a", 2], // 紺
];
const PER_COLOR = 20;
const BAG = PAPER.length * PER_COLOR;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 袋を1つ空にするまで取り出した色の列（1枚ごとに好かれ度の重み。取り出すたびに残りで割り直す） */
const bags = new Map<number, string[]>();
function bag(n: number): string[] {
  let out = bags.get(n);
  if (out) return out;
  const r = mulberry32(site.year + n);
  const left = PAPER.map(() => PER_COLOR);
  out = [];
  for (let k = 0; k < BAG; k++) {
    let sum = 0;
    for (let c = 0; c < PAPER.length; c++) sum += PAPER[c][1] * left[c];
    let x = r() * sum;
    let pick = 0;
    for (let c = 0; c < PAPER.length; c++) {
      x -= PAPER[c][1] * left[c];
      if (left[c] > 0) pick = c;
      if (x < 0 && left[c] > 0) break;
    }
    left[pick]--;
    out.push(PAPER[pick][0]);
  }
  bags.set(n, out);
  return out;
}

/** i 番目の輪の色（袋が空になったら次の袋へ） */
export const ringColor = (i: number) => bag(Math.floor(i / BAG))[((i % BAG) + BAG) % BAG];

/** 自分の輪（その端末で足した輪）を保存する鍵 */
export const GARLAND_KEY = `gbf_${site.year}_garland_v2`;

/** 自分の輪の色の列：同じ色紙の袋から取り出し、残りが100枚を切ったら新しい袋（14色×20枚）を足して混ぜる。
 *  袋の終わりの茶や灰ばかりの所が続かない（どこを20個とっても色が偏らない）。番号が同じなら全員同じ色 */
const REFILL_BELOW = 100;
const stream: number[] = [];
let streamLeft: number[] = [];
let streamTotal = 0;
let streamRand: (() => number) | null = null;
export function streamColor(i: number): string {
  const n = Math.max(0, Math.floor(i));
  if (!streamRand) {
    streamRand = mulberry32(site.year * 7919 + 1);
    streamLeft = PAPER.map(() => PER_COLOR);
    streamTotal = BAG;
  }
  while (stream.length <= n) {
    if (streamTotal < REFILL_BELOW) {
      for (let c = 0; c < streamLeft.length; c++) streamLeft[c] += PER_COLOR;
      streamTotal += BAG;
    }
    let sum = 0;
    for (let c = 0; c < PAPER.length; c++) sum += PAPER[c][1] * streamLeft[c];
    let x = streamRand() * sum;
    let pick = 0;
    for (let c = 0; c < PAPER.length; c++) {
      x -= PAPER[c][1] * streamLeft[c];
      if (streamLeft[c] > 0) pick = c;
      if (x < 0 && streamLeft[c] > 0) break;
    }
    streamLeft[pick]--;
    streamTotal--;
    stream.push(pick);
  }
  return PAPER[stream[n]][0];
}
