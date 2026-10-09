// ガチャガチャの物の動き（机の上を転がるカプセル）と、中身の選び方・端末に残す痕跡。
// 座標は机の段の左上を原点にした px。y は机の面からの高さ（上が正）。1刻み＝16ms。
// 動きの大きさは機械の高さ h に比例させる（s＝h/160）。
import { site } from "@/data/site";

export type Body = {
  id: number;
  /** 0＝黄・1＝青 */
  c: 0 | 1;
  /** 中身（gachaPrizes の番号） */
  p: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 回った角度（rad） */
  a: number;
  r: number;
  open: boolean;
  /** 机の端から落ちていく */
  drop: boolean;
  rest: boolean;
};

export type World = {
  bodies: Body[];
  /** 机の左の端（x） */
  edge: number;
  /** 右の壁（取り出し口の位置。ここより右へは転がらない） */
  wall: number;
  s: number;
};

const GRAV = 0.5;
const BOUNCE = 0.38;
const ROLL = 0.97;
const SLIDE = 0.93;
const DRAG = 0.012;
const WALL_E = 0.3;
const HIT_E = 0.4;

export const STEP_MS = 16;

/** 床に触れているときの、開いた殻の幅（転がる玉より横に広い） */
export const halfW = (b: { open: boolean; r: number }) => (b.open ? b.r * 1.75 : b.r);

/** 1刻み進める。まだ動いている物があれば true */
export function step(w: World): boolean {
  const { s } = w;
  let moving = false;
  for (const b of w.bodies) {
    if (b.rest) continue;
    b.vy -= GRAV * s;
    b.x += b.vx;
    b.y += b.vy;
    const overDesk = !b.drop || b.x >= w.edge;
    if (overDesk && b.y <= 0) {
      b.y = 0;
      b.vy = b.vy < -1.4 * s ? -b.vy * BOUNCE : 0;
      if (b.vy === 0 && !b.drop) {
        const f = b.open ? SLIDE : ROLL;
        const sign = Math.sign(b.vx);
        b.vx = b.vx * f - sign * DRAG * s;
        if (Math.sign(b.vx) !== sign) b.vx = 0;
      }
    }
    if (!b.open) b.a += b.vx / b.r;
    else b.a += b.vx / b.r / 6;
    if (!b.drop && b.x - halfW(b) < w.edge) {
      b.x = w.edge + halfW(b);
      if (b.vx < 0) b.vx = -b.vx * WALL_E;
    }
    if (!b.drop && b.x + halfW(b) > w.wall) {
      b.x = w.wall - halfW(b);
      if (b.vx > 0) b.vx = -b.vx * WALL_E;
    }
  }
  // 机の上の物どうしは横にだけぶつかる
  const ground = w.bodies.filter((b) => !b.drop && b.y < b.r);
  for (let i = 0; i < ground.length; i++) {
    for (let j = i + 1; j < ground.length; j++) {
      const A = ground[i];
      const B = ground[j];
      const L = A.x <= B.x ? A : B;
      const R = L === A ? B : A;
      const min = halfW(L) + halfW(R);
      const d = R.x - L.x;
      if (d >= min - 0.01) continue;
      const push = (min - d) / 2;
      L.x -= push;
      R.x += push;
      if (L.x - halfW(L) < w.edge) {
        const k = w.edge + halfW(L) - L.x;
        L.x += k;
        R.x += k;
      }
      if (L.vx - R.vx > 0) {
        const vl = L.vx;
        const vr = R.vx;
        L.vx = ((1 - HIT_E) * vl + (1 + HIT_E) * vr) / 2;
        R.vx = ((1 + HIT_E) * vl + (1 - HIT_E) * vr) / 2;
      }
      if (R.x + halfW(R) > w.wall) {
        const k = R.x + halfW(R) - w.wall;
        R.x -= k;
        L.x = Math.max(w.edge + halfW(L), L.x - k);
      }
      L.rest = false;
      R.rest = false;
    }
  }
  for (const b of w.bodies) {
    if (b.rest) continue;
    if (b.drop) {
      moving = true;
      continue;
    }
    if (b.y === 0 && b.vy === 0 && Math.abs(b.vx) < 0.02 * s) {
      b.vx = 0;
      b.rest = true;
    } else moving = true;
  }
  return moving;
}

/** 机の端まで片付けるための一押し（止まるころに端に当たる強さ） */
export function shove(w: World, b: Body) {
  const dist = Math.max(0, b.x - (w.edge + halfW(b)));
  const k = 1 - (b.open ? SLIDE : ROLL);
  b.vx = -(dist * k * 1.3 + 1.2 * w.s);
  b.vy = b.open ? 0 : 0.6 * w.s;
  b.rest = false;
}

/** 机の端から落とす */
export function drop(w: World, b: Body) {
  b.drop = true;
  b.rest = false;
  b.vx = Math.min(b.vx, -1.5 * w.s);
}

/* ---------- 中身の選び方 ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** n 回目・その分（分単位の時刻）で決まる乱数 */
export const randFor = (n: number, nowMs: number) => mulberry32(hashStr(`${site.year}:gacha:${n}:${Math.floor(nowMs / 60000)}`));

/** 中身を選ぶ。直近に出たもの（recent）は避ける */
export function pick(count: number, recent: number[], rand: () => number): number {
  const k = Math.min(3, count - 1);
  const avoid = new Set(k > 0 ? recent.slice(-k) : []);
  const cand: number[] = [];
  for (let i = 0; i < count; i++) if (!avoid.has(i)) cand.push(i);
  const list = cand.length ? cand : Array.from({ length: count }, (_, i) => i);
  return list[Math.floor(rand() * list.length) % list.length];
}

/* ---------- 端末に残す痕跡 ---------- */

export const SAVE_KEY = `gbf_${site.year}_gacha_v1`;

/** 位置は機械の高さ h を1とした割合で残す */
export type SavedBody = { c: 0 | 1; p: number; x: number; a: number; open: boolean };
export type Saved = { v: 1; n: number; recent: number[]; cur: SavedBody | null; junk: SavedBody[] };

export function load(): Saved {
  const empty: Saved = { v: 1, n: 0, recent: [], cur: null, junk: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw || raw.v !== 1) return empty;
    const okBody = (b: unknown): b is SavedBody =>
      !!b && typeof b === "object" && Number.isFinite((b as SavedBody).x) && Number.isInteger((b as SavedBody).p);
    return {
      v: 1,
      n: Number.isInteger(raw.n) && raw.n >= 0 ? raw.n : 0,
      recent: Array.isArray(raw.recent) ? raw.recent.filter(Number.isInteger).slice(-4) : [],
      cur: okBody(raw.cur) ? raw.cur : null,
      junk: Array.isArray(raw.junk) ? raw.junk.filter(okBody).slice(-3) : [],
    };
  } catch {
    return empty;
  }
}

export function save(s: Saved) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {}
}

export function clearSaved() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
