// 落ちた時計が割れて散らばる計算（画面には描かない）。
// 座標はページ座標（x＝ページの左端から右へ、y＝ページの上から下へ。単位 px）。角度は時計回りが正（rad）。
// 同じ入力なら同じ結果になる（乱数は種から作り、刻みは一定）。読み込み直したときに、同じ積もり方を作り直せる。
import { site } from "@/data/site";

/** 1刻みの長さ（秒） */
export const DT = 1 / 120;
/** 重力（px/秒²） */
const G = 2200;
/** これより長くは計算しない（秒）。過ぎたら全部その場で止める */
const MAX_T = 7;
/** フッターの揺れが収まるまでは止めない（秒） */
const SETTLE_AFTER = 1.5;
/** これを過ぎたら、止まったとみなす幅を少しずつ広げ、残った動きを弱める（細かく震え続ける破片で rAF を長引かせない） */
const LATE_T = 2.6;
/** 丸い部品（歯車・ゼンマイ・軸の飾り）と小さなガラス：床の上でその場で回り続けないよう、回転を強めに弱める */
const ROLL_DAMP: Partial<Record<Kind, number>> = { gear: 6, spring: 6, cap: 6, glass: 5, rim: 5 };

export type Kind = "shard" | "glass" | "gear" | "spring" | "hand" | "cap" | "rim";

export type Body = {
  kind: Kind;
  /** 形：重心を原点にした頂点の並び（x0, y0, x1, y1, …） */
  pts: number[];
  /** 重心からいちばん遠い頂点までの距離 */
  br: number;
  /** ほかの破片とぶつかるときの丸の半径 */
  rc: number;
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  /** 重さの逆数・回りにくさの逆数 */
  im: number;
  ii: number;
  /** 跳ね返り・摩擦 */
  e: number;
  mu: number;
  /** 止まりかけの判定：この位置・角度からほとんど動かずにいる（anchor）。at＝その時刻 */
  calm: { x: number; y: number; a: number; at: number };
  sleep: boolean;
  /** 床・壁に触れている／ほかの破片と触れ合っている（その刻み） */
  touch: boolean;
  sup: boolean;
  /** 最後に何かに触れていた時刻（離れては触れる細かい跳ねを「触れている」とみなす） */
  lt: number;
  /** ガラス：初めて縁に強く当たった時刻（-1＝まだ） */
  glint: number;
  /**
   * 絵の手がかり。shard＝文字盤の上の重心（絵の左上から）／hand＝何番目の針（0 時・1 分・2 秒）と長さ・太さ／gear・spring＝半径と歯の数／
   * glass＝何番目の絵か（g）／rim＝外周の半径（r）と、弧の中心から見た重心（fx, fy）
   */
  ref: { fx?: number; fy?: number; hand?: number; len?: number; wid?: number; r?: number; teeth?: number; small?: boolean; g?: number };
};

export type World = {
  bodies: Body[];
  /** 左右の壁（0 と W） */
  W: number;
  /** フッターの縁の高さ（ページ座標・揺れる前） */
  floor: number;
  /** 当たった所の x */
  hitX: number;
  t: number;
  steps: number;
  done: boolean;
};

export type BreakIn = {
  seed: number;
  W: number;
  floor: number;
  /** 時計の絵の幅・高さ（px） */
  S: number;
  Hc: number;
  /** 文字盤の中心（絵の左上から px） */
  dcx: number;
  dcy: number;
  /** 時計の外周の半径（px） */
  R: number;
  /** 当たった瞬間の文字盤の中心（ページ座標）・傾き・速さ */
  X: number;
  Y: number;
  A: number;
  vx: number;
  vy: number;
  /** 針の角度（rad。真上が 0、時計回り）・長さ・太さ（時・分・秒） */
  hands: number[];
  handLen: number[];
  handW: number[];
  /** 文字盤の破片の数・ガラスの破片の数 */
  shards: number;
  glass: number;
};

/** 種から作る乱数（0〜1） */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 文字列から種を作る */
export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** フッターの沈み込み（当たってからの秒 → 下向きの px）。沈んで、2回ほど跳ねて戻る */
export function footOffset(t: number) {
  if (t <= 0 || t > 1.6) return 0;
  const om = 2 * Math.PI * 3;
  return 10 * Math.exp(-0.2 * om * t) * Math.sin(om * t);
}

/** フッターの横揺れ（px） */
export function footShake(t: number) {
  if (t <= 0 || t > 0.6) return 0;
  return 2.2 * Math.exp(-7 * t) * Math.sin(2 * Math.PI * 9 * t);
}

/* ---------- 多角形 ---------- */

function signedArea(p: number[]) {
  let s = 0;
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length;
    s += p[i] * p[j + 1] - p[j] * p[i + 1];
  }
  return s / 2;
}

function centroidOf(p: number[]) {
  let cx = 0;
  let cy = 0;
  let s = 0;
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length;
    const c = p[i] * p[j + 1] - p[j] * p[i + 1];
    s += c;
    cx += (p[i] + p[j]) * c;
    cy += (p[i + 1] + p[j + 1]) * c;
  }
  if (Math.abs(s) < 1e-9) {
    // 潰れた形：頂点の平均
    let ax = 0;
    let ay = 0;
    for (let i = 0; i < p.length; i += 2) {
      ax += p[i];
      ay += p[i + 1];
    }
    return [ax / (p.length / 2), ay / (p.length / 2)];
  }
  return [cx / (3 * s), cy / (3 * s)];
}

/** 半平面で切る：(x-mx)*nx + (y-my)*ny <= 0 の側を残す */
function clipHalf(p: number[], mx: number, my: number, nx: number, ny: number) {
  const out: number[] = [];
  const n = p.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    const ax = p[i];
    const ay = p[i + 1];
    const bx = p[j];
    const by = p[j + 1];
    const da = (ax - mx) * nx + (ay - my) * ny;
    const db = (bx - mx) * nx + (by - my) * ny;
    if (da <= 0) out.push(ax, ay);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
  }
  return out;
}

function circlePoly(cx: number, cy: number, r: number, n: number, rot = 0) {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
  }
  return p;
}

/** 重心まわりの回りにくさ（重さ1あたり）。p は重心が原点 */
function inertiaPerMass(p: number[]) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length;
    const x0 = p[i];
    const y0 = p[i + 1];
    const x1 = p[j];
    const y1 = p[j + 1];
    const c = x0 * y1 - x1 * y0;
    num += c * (x0 * x0 + x0 * x1 + x1 * x1 + y0 * y0 + y0 * y1 + y1 * y1);
    den += c;
  }
  return Math.abs(den) < 1e-9 ? 1 : num / (6 * den);
}

const MAT: Record<Kind, { d: number; e: number; mu: number }> = {
  shard: { d: 1, e: 0.18, mu: 0.6 },
  glass: { d: 0.6, e: 0.3, mu: 0.25 },
  gear: { d: 2.2, e: 0.25, mu: 0.5 },
  spring: { d: 1.5, e: 0.35, mu: 0.4 },
  hand: { d: 2, e: 0.15, mu: 0.55 },
  cap: { d: 2, e: 0.3, mu: 0.5 },
  rim: { d: 2, e: 0.2, mu: 0.5 },
};

/** 針の絵の、軸の丸から下へ出ている長さ（軸から先までの長さに対する割合。時・分・秒）。絵が無ければ 0 */
const handTail = (k: number) => {
  const P = site.assets.clockParts;
  const src = [P.hour, P.minute, P.second][k];
  const py = P.handPivot[k]?.[1] ?? 100;
  return src && py > 0 ? (100 - py) / py : 0;
};

/** 時計の絵（site.clock.face）の金の枠の内側の半径（外周の半径に対する割合。絵から測った値 0.865 より少し内側） */
const BEZEL_IN = 0.86;

/**
 * 枠の折れた弧が、時計のどこから外れるか（文字盤の絵の上の角度。右が 0・時計回り）。
 * 弧の欠けた所を当たった所（真下）へ向けた向き。その範囲の文字盤の破片からは金の枠を除く（枠が二重にならない）
 */
function rimSector(A: number) {
  const R = site.assets.clockParts.rimArc;
  const a0 = (R.from * Math.PI) / 180;
  const a1 = (R.to * Math.PI) / 180;
  const gap = (a0 + a1) / 2 + Math.PI;
  /** 弧の絵の角度 → 文字盤の絵の上の角度（足す値）。当たった所は文字盤の絵の上で π/2 - A */
  const off = Math.PI / 2 - A - gap;
  return { a0, a1, off };
}

function mkBody(kind: Kind, pts: number[], x: number, y: number, a: number, ref: Body["ref"]): Body {
  const area = Math.max(1, Math.abs(signedArea(pts)));
  const m = MAT[kind];
  const mass = area * m.d;
  const k = Math.max(1, inertiaPerMass(pts));
  let br = 0;
  for (let i = 0; i < pts.length; i += 2) br = Math.max(br, Math.hypot(pts[i], pts[i + 1]));
  return {
    kind,
    pts,
    br,
    rc: Math.max(2, Math.sqrt(area / Math.PI) * 0.9),
    x,
    y,
    a,
    vx: 0,
    vy: 0,
    w: 0,
    im: 1 / mass,
    ii: 1 / (mass * k),
    e: m.e,
    mu: m.mu,
    calm: { x, y, a, at: 0 },
    sleep: false,
    touch: false,
    sup: false,
    lt: -1,
    glint: -1,
    ref,
  };
}

/** 重心を原点に移した形と重心 */
function centered(p: number[]) {
  const [cx, cy] = centroidOf(p);
  const q = p.slice();
  for (let i = 0; i < q.length; i += 2) {
    q[i] -= cx;
    q[i + 1] -= cy;
  }
  return { q, cx, cy };
}

/**
 * 当たった瞬間の時計を割る。文字盤は当たった所を中心に、不規則な多角形（ボロノイ）に割る（当たった所ほど細かい）。
 * 針・軸の飾り・歯車・ゼンマイ・ガラスの破片が加わる。
 */
export function makeBreak(p: BreakIn): World {
  const r = rng(p.seed);
  const ca = Math.cos(p.A);
  const sa = Math.sin(p.A);
  /** 時計の絵の上の点 → ページ座標 */
  const toWorld = (lx: number, ly: number) => {
    const dx = lx - p.dcx;
    const dy = ly - p.dcy;
    return [p.X + dx * ca - dy * sa, p.Y + dx * sa + dy * ca];
  };
  const hitWX = p.X;
  const hitWY = p.Y + p.R;
  // 当たった所（いちばん下の点）を絵の上の座標で
  const ipx = p.dcx + p.R * sa;
  const ipy = p.dcy + p.R * ca;
  const energy = Math.min(1.25, Math.max(0.65, Math.abs(p.vy) / 1600));
  const bodies: Body[] = [];

  /** 飛び散る速さ：当たった所から外向き＋上向き。近いほど速い */
  const burst = (b: Body, k: number) => {
    const dx = b.x - hitWX;
    const dy = b.y - hitWY - p.R * 0.5;
    const d = Math.hypot(dx, dy) || 1;
    const near = 1.15 - 0.5 * Math.min(1, Math.hypot(b.x - hitWX, b.y - hitWY) / (2 * p.R));
    const sp = (300 + 420 * r()) * near * energy * k;
    b.vx = (dx / d) * sp + p.vx * 0.3;
    b.vy = (dy / d) * sp - 60 * r();
  };

  // 文字盤：種の点（6割は当たった所の近く、4割は文字盤全体）
  const rs = rimSector(p.A);
  const seeds: number[] = [];
  let guard = 0;
  while (seeds.length < p.shards * 2 && guard++ < p.shards * 60) {
    let sx: number;
    let sy: number;
    const t = r() * Math.PI * 2;
    if (seeds.length < p.shards * 1.2) {
      const rad = 2 * p.R * Math.pow(r(), 1.5);
      sx = ipx + Math.cos(t) * rad;
      sy = ipy + Math.sin(t) * rad;
    } else {
      const rad = p.R * Math.sqrt(r());
      sx = p.dcx + Math.cos(t) * rad;
      sy = p.dcy + Math.sin(t) * rad;
    }
    const sr2 = (sx - p.dcx) ** 2 + (sy - p.dcy) ** 2;
    if (sr2 > (p.R * 0.97) ** 2) continue;
    // 枠の弧が外れる範囲では、金の枠の内側だけ
    if (sr2 > (p.R * BEZEL_IN * 0.97) ** 2) {
      const d = (((Math.atan2(sy - p.dcy, sx - p.dcx) - rs.a0 - rs.off) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (d < rs.a1 - rs.a0) continue;
    }
    seeds.push(sx, sy);
  }
  // 割る前の形：外周の円。ただし枠の弧が外れる範囲は、金の枠の内側まで
  const base: number[] = [];
  {
    const s0 = rs.a0 + rs.off;
    const s1 = rs.a1 + rs.off;
    const ng = 24;
    const na = 32;
    for (let i = 0; i <= ng; i++) {
      const t = s1 + ((s0 + Math.PI * 2 - s1) * i) / ng;
      base.push(p.dcx + Math.cos(t) * p.R, p.dcy + Math.sin(t) * p.R);
    }
    const rIn = p.R * BEZEL_IN;
    for (let i = 0; i <= na; i++) {
      const t = s0 + ((s1 - s0) * i) / na;
      base.push(p.dcx + Math.cos(t) * rIn, p.dcy + Math.sin(t) * rIn);
    }
  }
  const maxArea = Math.PI * p.R * p.R;
  for (let i = 0; i < seeds.length; i += 2) {
    let cell = base;
    for (let j = 0; j < seeds.length && cell.length >= 6; j += 2) {
      if (i === j) continue;
      cell = clipHalf(cell, (seeds[i] + seeds[j]) / 2, (seeds[i + 1] + seeds[j + 1]) / 2, seeds[j] - seeds[i], seeds[j + 1] - seeds[i + 1]);
    }
    if (cell.length < 6) continue;
    const area = Math.abs(signedArea(cell));
    if (area < 10) continue;
    const { q, cx, cy } = centered(cell);
    const [wx, wy] = toWorld(cx, cy);
    const b = mkBody("shard", q, wx, wy, p.A, { fx: cx, fy: cy });
    burst(b, 1);
    b.w = (r() * 2 - 1) * (5 + 12 * (1 - Math.min(1, area / (0.08 * maxArea))));
    bodies.push(b);
  }

  // 針（時・分・秒）：文字盤の中心から、その時刻の向きに
  for (let k = 0; k < 3; k++) {
    const L = p.handLen[k];
    const wd = Math.max(2.4, p.handW[k]);
    const th = p.hands[k];
    // 軸の丸より下へ出ている所（絵の針の尾）も形に含める
    const tail = L * handTail(k);
    const pts = [-wd / 2, L / 2 + tail, wd / 2, L / 2 + tail, wd * 0.35, -L / 2 + wd, 0, -L / 2, -wd * 0.35, -L / 2 + wd];
    const [wx, wy] = toWorld(p.dcx + Math.sin(th) * (L / 2), p.dcy - Math.cos(th) * (L / 2));
    const b = mkBody("hand", pts, wx, wy, p.A + th, { hand: k, len: L, wid: p.handW[k] });
    burst(b, 1.1);
    b.vy -= 200 + 160 * r();
    b.w = (r() * 2 - 1) * 14;
    bodies.push(b);
  }
  // 軸の飾り
  {
    const cr = p.S * 0.017;
    const [wx, wy] = toWorld(p.dcx, p.dcy);
    const b = mkBody("cap", circlePoly(0, 0, cr, 10), wx, wy, 0, { r: cr });
    burst(b, 1.2);
    b.vy -= 260;
    b.w = (r() * 2 - 1) * 10;
    bodies.push(b);
  }
  // 歯車（中の機械から）
  [0.075, 0.058, 0.042].forEach((k, i) => {
    const gr = p.S * k;
    const teeth = 10 + Math.floor(r() * 5);
    const [wx, wy] = toWorld(p.dcx + (r() - 0.5) * p.R * 0.3, p.dcy + (r() - 0.5) * p.R * 0.3);
    const b = mkBody("gear", circlePoly(0, 0, gr * 0.92, 14), wx, wy, r() * Math.PI * 2, { r: gr, teeth, small: i > 0 });
    burst(b, 1.15);
    b.vy -= 300 + 300 * r();
    b.w = (r() * 2 - 1) * 16;
    bodies.push(b);
  });
  // 小さなゼンマイ
  {
    const sr = p.S * 0.05;
    const [wx, wy] = toWorld(p.dcx + (r() - 0.5) * p.R * 0.4, p.dcy + (r() - 0.5) * p.R * 0.4);
    const b = mkBody("spring", circlePoly(0, 0, sr * 0.95, 12), wx, wy, r() * Math.PI * 2, { r: sr });
    burst(b, 1.1);
    b.vy -= 240;
    b.w = (r() * 2 - 1) * 12;
    bodies.push(b);
  }
  // ガラスの破片（当たった所の近くに多い）
  for (let i = 0; i < p.glass; i++) {
    const s = p.S * (0.03 + 0.04 * r());
    const tri: number[] = [];
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + (r() - 0.5) * 1.4;
      const rad = s * (0.55 + 0.6 * r());
      tri.push(Math.cos(t) * rad, Math.sin(t) * rad);
    }
    const { q } = centered(tri);
    const t = r() * Math.PI * 2;
    const rad = p.R * 0.9 * Math.pow(r(), 0.8);
    const lx = ipx + (p.dcx - ipx) * 0.35 + Math.cos(t) * rad * 0.6;
    const ly = ipy + (p.dcy - ipy) * 0.35 + Math.sin(t) * rad * 0.6;
    const [wx, wy] = toWorld(lx, ly);
    const b = mkBody("glass", q, wx, Math.min(wy, p.floor - s), r() * Math.PI * 2, { g: i });
    burst(b, 1.35);
    b.w = (r() * 2 - 1) * 20;
    bodies.push(b);
  }
  // 枠の折れた弧：時計の外周そのままの大きさで、外れる前にあった所（欠けた所が当たった所＝真下）から
  {
    const A = site.assets.clockParts.rimArc;
    const ro = p.R;
    const ri = ro * (A.ri / A.r);
    const n = 16;
    const arc: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = rs.a0 + ((rs.a1 - rs.a0) * i) / n;
      arc.push(Math.cos(t) * ro, Math.sin(t) * ro);
    }
    for (let i = n; i >= 0; i--) {
      const t = rs.a0 + ((rs.a1 - rs.a0) * i) / n;
      arc.push(Math.cos(t) * ri, Math.sin(t) * ri);
    }
    const { q, cx, cy } = centered(arc);
    const ang = p.A + rs.off;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const b = mkBody("rim", q, p.X + cx * c - cy * s, p.Y + cx * s + cy * c, ang, { r: ro, fx: cx, fy: cy });
    // 弧の重心は輪の内側の空いた所にある。ほかの破片とは輪の太さ程度でしか当たらないように
    b.rc = Math.max(2, (ro - ri) * 0.25);
    burst(b, 0.8);
    b.vy -= 180 + 120 * r();
    b.w = (r() * 2 - 1) * 8;
    bodies.push(b);
  }

  return { bodies, W: p.W, floor: p.floor, hitX: hitWX, t: 0, steps: 0, done: false };
}

/* ---------- 1刻み ---------- */

const scratch: number[] = [];

/** 平らな面（床・壁）との当たり。面は p·n >= d の側が空いている */
function plane(b: Body, nx: number, ny: number, d: number, w: World, isFloor: boolean) {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  const P = b.pts;
  let maxPen = 0;
  let n = 0;
  for (let i = 0; i < P.length; i += 2) {
    const rx = P[i] * c - P[i + 1] * s;
    const ry = P[i] * s + P[i + 1] * c;
    const pen = d - ((b.x + rx) * nx + (b.y + ry) * ny);
    if (pen > 0) {
      scratch[n++] = rx;
      scratch[n++] = ry;
      if (pen > maxPen) maxPen = pen;
    }
  }
  if (!n) return;
  b.touch = true;
  const tx = -ny;
  const ty = nx;
  for (let it = 0; it < 2; it++) {
    for (let k = 0; k < n; k += 2) {
      const rx = scratch[k];
      const ry = scratch[k + 1];
      const vn = (b.vx - b.w * ry) * nx + (b.vy + b.w * rx) * ny;
      if (vn >= 0) continue;
      if (isFloor && b.kind === "glass" && b.glint < 0 && -vn > 240) b.glint = w.t;
      const rn = rx * ny - ry * nx;
      const e = it === 0 && -vn > 120 ? b.e : 0;
      const jn = (-(1 + e) * vn) / (b.im + rn * rn * b.ii);
      b.vx += jn * nx * b.im;
      b.vy += jn * ny * b.im;
      b.w += rn * jn * b.ii;
      // 摩擦
      const vt = (b.vx - b.w * ry) * tx + (b.vy + b.w * rx) * ty;
      const rt = rx * ty - ry * tx;
      let jt = -vt / (b.im + rt * rt * b.ii);
      const lim = b.mu * jn;
      if (jt > lim) jt = lim;
      else if (jt < -lim) jt = -lim;
      b.vx += jt * tx * b.im;
      b.vy += jt * ty * b.im;
      b.w += rt * jt * b.ii;
    }
  }
  b.x += nx * maxPen;
  b.y += ny * maxPen;
  b.w *= 1 - (isFloor ? ROLL_DAMP[b.kind] ?? 1.5 : 1.5) * DT;
}

export function step(w: World) {
  w.t += DT;
  w.steps++;
  const floor = w.floor + footOffset(w.t);
  const B = w.bodies;
  for (const b of B) {
    b.touch = false;
    b.sup = false;
    if (b.sleep) continue;
    b.vy += G * DT;
    // 終わりぎわは空気の抵抗を強めて、残った揺れを早く収める
    const late = w.t > LATE_T ? 2.5 : 0;
    const damp = 1 - (0.12 + late) * DT;
    b.vx *= damp;
    b.vy *= damp;
    b.w *= 1 - (0.4 + late) * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.a += b.w * DT;
    plane(b, 0, -1, -floor, w, true);
    plane(b, 1, 0, 0, w, false);
    plane(b, -1, 0, -w.W, w, false);
  }
  // 破片どうし（丸で近似。止まった破片は動かない台として扱う）
  for (let i = 0; i < B.length; i++) {
    const a = B[i];
    for (let j = i + 1; j < B.length; j++) {
      const b = B[j];
      if (a.sleep && b.sleep) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.rc + b.rc;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 1e-6) continue;
      const ia = a.sleep ? 0 : a.im;
      const ib = b.sleep ? 0 : b.im;
      const sum = ia + ib;
      if (!sum) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const corr = ((rr - d) * 0.5) / sum;
      a.x -= nx * corr * ia;
      a.y -= ny * corr * ia;
      b.x += nx * corr * ib;
      b.y += ny * corr * ib;
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const jn = (-1.1 * vn) / sum;
        const tx = -ny;
        const ty = nx;
        let jt = (-(rvx * tx + rvy * ty) / sum) * 0.5;
        const lim = 0.4 * jn;
        if (jt > lim) jt = lim;
        else if (jt < -lim) jt = -lim;
        a.vx -= (jn * nx + jt * tx) * ia;
        a.vy -= (jn * ny + jt * ty) * ia;
        b.vx += (jn * nx + jt * tx) * ib;
        b.vy += (jn * ny + jt * ty) * ib;
      }
      // 丸どうしの当たりは回転を止めないので、触れている間は回転を弱める（乗ったまま回り続けない）
      a.w *= 0.94;
      b.w *= 0.94;
      // 触れ合っている（横から挟まれて止まっている破片もある）。止まったかどうかは、動きの小ささで別に見る
      a.sup = true;
      b.sup = true;
    }
  }
  // 止まったものから眠らせる：何かに乗ったまま 0.3 秒、ほとんど動かなければ止める（細かい震えは無視）。
  // 終わりぎわは「ほとんど動かない」の幅を少しずつ広げる
  const k = 1 + Math.max(0, w.t - LATE_T) * 2;
  let awake = 0;
  for (const b of B) {
    if (b.sleep) continue;
    if (b.touch || b.sup) b.lt = w.t;
    const c = b.calm;
    const still = Math.abs(b.x - c.x) < 1.5 * k && Math.abs(b.y - c.y) < 1.5 * k && Math.abs(b.a - c.a) < 0.04 * k;
    if (w.t > SETTLE_AFTER && b.lt >= 0 && w.t - b.lt < 0.15 && still) {
      if (w.t - c.at > 0.3) {
        b.sleep = true;
        b.vx = b.vy = b.w = 0;
        continue;
      }
    } else {
      c.x = b.x;
      c.y = b.y;
      c.a = b.a;
      c.at = w.t;
    }
    awake++;
  }
  if (!awake || w.t >= MAX_T) {
    for (const b of B) {
      b.sleep = true;
      b.vx = b.vy = b.w = 0;
    }
    w.done = true;
  }
}

/** 画面に描かずに、止まるまで回す（読み込み直したとき） */
export function settle(w: World) {
  while (!w.done) step(w);
  return w;
}

/** 止まった破片のいちばん高い所（縁から上へ何 px か） */
export function pileHeight(w: World) {
  let top = w.floor;
  for (const b of w.bodies) {
    const c = Math.cos(b.a);
    const s = Math.sin(b.a);
    for (let i = 0; i < b.pts.length; i += 2) top = Math.min(top, b.y + b.pts[i] * s + b.pts[i + 1] * c);
  }
  return Math.max(0, w.floor - top);
}

/* ---------- ひび ---------- */

export type Crack = { lines: { p: number[]; w: number }[]; chips: number[][] };

/** ひびが縁から下へ入る深さの上限（px）。フッターの上の余白の中に収め、LIBRARY の字にはかからない */
export const CRACK_MAX_DEPTH = 22;

/** 縁のひび（当たった所を原点に、x＝右、y＝下＝フッターの中へ）。縁に沿って左右へ走り、下へは浅く */
export function makeCrack(seed: number): Crack {
  const r = rng((seed ^ 0x5bd1e995) >>> 0);
  const lines: Crack["lines"] = [];
  const grow = (x: number, y: number, ang: number, len: number, wd: number, depth: number) => {
    const pts = [x, y];
    while (len > 0) {
      const sl = 5 + r() * 6;
      ang += (r() - 0.5) * 0.6;
      // 縁より上・深すぎる所には出さない（はね返して縁に沿わせる）
      if ((y < 2 && Math.sin(ang) < 0) || (y > CRACK_MAX_DEPTH - 4 && Math.sin(ang) > 0)) ang = -ang;
      x += Math.cos(ang) * sl;
      y = Math.min(CRACK_MAX_DEPTH, Math.max(0, y + Math.sin(ang) * sl));
      pts.push(x, y);
      len -= sl;
      if (depth < 2 && r() < 0.18) grow(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.5), len * 0.45, wd * 0.6, depth + 1);
    }
    lines.push({ p: pts, w: wd });
  };
  // 左右へ長く2〜3本ずつ（ほぼ縁に沿う）、真下へ短く1〜2本
  for (const side of [1, -1]) {
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const tilt = 0.12 + 0.5 * r();
      grow((r() - 0.5) * 4, 0, side > 0 ? tilt : Math.PI - tilt, 40 + 70 * r(), 1.5 - i * 0.25, 0);
    }
  }
  const nd = 1 + Math.floor(r() * 2);
  for (let i = 0; i < nd; i++) grow((r() - 0.5) * 6, 0, Math.PI / 2 + (r() - 0.5) * 0.9, 12 + 10 * r(), 1.2, 1);
  const chips: number[][] = [];
  const nc = 2 + Math.floor(r() * 2);
  for (let i = 0; i < nc; i++) {
    const cx = (r() - 0.5) * 26;
    const hw = 2 + r() * 4;
    chips.push([cx - hw, 0, cx + hw, 0, cx + (r() - 0.5) * hw, 2 + r() * 2.5]);
  }
  return { lines, chips };
}
