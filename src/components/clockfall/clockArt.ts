// 落ちる時計と破片の絵（canvas）。計算は clockFallSim、ここは描くだけ。
// 時計の絵は site.clock（教室の壁の時計と同じ）。針は site.assets.clockParts の針の絵（軸の丸を中心に回す）、無ければ教室の CSS の針と同じ形を描く。
// 部品・ひびの絵は site.assets（clockParts・crack）。空なら canvas で簡単な形を描く。
import { site } from "@/data/site";
import type { Body, Crack } from "./clockFallSim";

type PartKey = "gear" | "gearSmall" | "spring" | "rim";

/** 針の絵（軸の丸の中心＝px・py。絵の左上から、絵の px で） */
type HandArt = { img: HTMLImageElement; px: number; py: number };

export type Art = {
  dpr: number;
  /** 時計の絵の幅・高さ（px） */
  S: number;
  Hc: number;
  /** 文字盤の中心（絵の左上から px）・外周の半径・文字盤の半径 */
  dcx: number;
  dcy: number;
  R: number;
  dialR: number;
  /** 文字盤だけ（針なし） */
  face: HTMLCanvasElement;
  /** 教室の時計の針の絵（時計の絵と同じ大きさ・site.clock） */
  hand: (HTMLImageElement | null)[];
  /** 部品の針の絵（時・分・秒・site.assets.clockParts） */
  handArt: (HandArt | null)[];
  parts: Partial<Record<PartKey, HTMLImageElement>>;
  /** ガラスの破片の絵（破片ごとに順に使う） */
  glass: HTMLImageElement[];
  crack: HTMLImageElement | null;
};

export type Sprite = { c: HTMLCanvasElement; h: number };

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    if (!src) return res(null);
    const im = new Image();
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

/** 針の長さ・太さ（教室の CSS と同じ割合） */
export const handSpec = (S: number) => {
  const dialR = (site.clock.dial / 100) * S;
  return { len: [0.58 * dialR, 0.8 * dialR, 0.86 * dialR], wid: [0.024 * S, 0.018 * S, 0.007 * S] };
};

/** 日本時間のいまの針の角度（rad。真上が 0） */
export const handAngles = (ms: number) => {
  const d = new Date(ms + 9 * 3600000);
  const h = d.getUTCHours() % 12;
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const rad = Math.PI / 180;
  return [(h + m / 60) * 30 * rad, (m + s / 60) * 6 * rad, s * 6 * rad];
};

/** 絵の不透明な所から、時計の外周の半径を測る（文字盤の中心から 36 方向の中央値） */
function measureR(img: HTMLImageElement, S: number, Hc: number, dcx: number, dcy: number) {
  try {
    const k = 160 / S;
    const c = canvas(160, Hc * k);
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return S * 0.48;
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const rs: number[] = [];
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      let best = 0;
      for (let rr = 0; rr < 100; rr++) {
        const px = Math.round(dcx * k + Math.cos(t) * rr);
        const py = Math.round(dcy * k + Math.sin(t) * rr);
        if (px < 0 || py < 0 || px >= c.width || py >= c.height) break;
        if (d[(py * c.width + px) * 4 + 3] > 128) best = rr;
      }
      rs.push(best);
    }
    rs.sort((a, b) => a - b);
    const med = rs[18] / k;
    return med > S * 0.2 ? Math.min(med, S * 0.5) : S * 0.48;
  } catch {
    return S * 0.48;
  }
}

/** 絵が無いときの仮の文字盤 */
function drawPlainFace(x: CanvasRenderingContext2D, S: number, cx: number, cy: number, R: number) {
  x.fillStyle = "#c9c4b6";
  x.beginPath();
  x.arc(cx, cy, R, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#fbfaf6";
  x.beginPath();
  x.arc(cx, cy, R * 0.88, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#2a2a2a";
  x.lineWidth = S * 0.012;
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx + Math.cos(t) * R * 0.72, cy + Math.sin(t) * R * 0.72);
    x.lineTo(cx + Math.cos(t) * R * 0.82, cy + Math.sin(t) * R * 0.82);
    x.stroke();
  }
}

export async function loadArt(S: number): Promise<Art> {
  const P = site.assets.clockParts;
  const [[faceImg, h0, h1, h2, gear, gearSmall, spring, rim, crack, a0, a1, a2], glassImgs] = await Promise.all([
    Promise.all(
      [site.clock.face, site.clock.hour, site.clock.minute, site.clock.second, P.gear, P.gearSmall, P.spring, P.rim, site.assets.crack, P.hour, P.minute, P.second].map(loadImg),
    ),
    Promise.all(P.glass.map(loadImg)),
  ]);
  const handArt = [a0, a1, a2].map((img, k): HandArt | null => {
    if (!img) return null;
    const [ux, uy] = P.handPivot[k] ?? [50, 88];
    return { img, px: (img.naturalWidth * ux) / 100, py: (img.naturalHeight * uy) / 100 };
  });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const Hc = S / site.clock.ratio;
  const dcx = (S * site.clock.center[0]) / 100;
  const dcy = (Hc * site.clock.center[1]) / 100;
  const R = faceImg ? measureR(faceImg, S, Hc, dcx, dcy) : S * 0.48;
  const face = canvas(S * dpr, Hc * dpr);
  const x = face.getContext("2d");
  if (x) {
    x.scale(dpr, dpr);
    if (faceImg) x.drawImage(faceImg, 0, 0, S, Hc);
    else drawPlainFace(x, S, dcx, dcy, R);
  }
  const parts: Art["parts"] = {};
  if (gear) parts.gear = gear;
  if (gearSmall) parts.gearSmall = gearSmall;
  if (spring) parts.spring = spring;
  if (rim) parts.rim = rim;
  const glass = glassImgs.filter((g): g is HTMLImageElement => !!g);
  return { dpr, S, Hc, dcx, dcy, R, dialR: (site.clock.dial / 100) * S, face, hand: [h0, h1, h2], handArt, parts, glass, crack };
}

/* ---------- 針・軸 ---------- */

const HAND_SHAPE = [
  [0.5, 0, 1, 0.22, 0.78, 1, 0.22, 1, 0, 0.22],
  [0.5, 0, 1, 0.16, 0.75, 1, 0.25, 1, 0, 0.16],
];

/** 針を1本描く（原点＝文字盤の中心、上向き）。whole＝落ちている間の時計（教室の針の絵があればそれを優先） */
function drawHand(x: CanvasRenderingContext2D, art: Art, k: number, L: number, wd: number, whole = false) {
  const img = art.hand[k];
  const ha = art.handArt[k];
  if (img && (whole || !ha)) {
    x.drawImage(img, -art.dcx, -art.dcy, art.S, art.Hc);
    return;
  }
  if (ha) {
    // 軸の丸から先までが L になるように
    const z = L / Math.max(1, ha.py);
    x.drawImage(ha.img, -ha.px * z, -ha.py * z, ha.img.naturalWidth * z, ha.img.naturalHeight * z);
    return;
  }
  x.beginPath();
  if (k < 2) {
    const s = HAND_SHAPE[k];
    for (let i = 0; i < s.length; i += 2) {
      const px = (s[i] - 0.5) * wd;
      const py = -L + s[i + 1] * L;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.closePath();
    x.fillStyle = "#151515";
  } else {
    const r = wd / 2;
    x.moveTo(-r, 0);
    x.lineTo(-r, -L + r);
    x.arc(0, -L + r, r, Math.PI, 0);
    x.lineTo(r, 0);
    x.closePath();
    x.fillStyle = "#d81e1e";
  }
  x.fill();
}

function drawCap(x: CanvasRenderingContext2D, S: number) {
  const r = S * 0.017;
  const g = x.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  g.addColorStop(0, "#fff3b0");
  g.addColorStop(0.55, "#c99a2e");
  g.addColorStop(1, "#6d4f12");
  x.beginPath();
  x.arc(0, 0, r + S * 0.006, 0, Math.PI * 2);
  x.fillStyle = "#111";
  x.fill();
  x.beginPath();
  x.arc(0, 0, r, 0, Math.PI * 2);
  x.fillStyle = g;
  x.fill();
}

/** 落ちている間の時計（文字盤＋その時刻の針）。原点は絵の左上 */
export function makeWhole(art: Art, hands: number[]) {
  const c = canvas(art.S * art.dpr, art.Hc * art.dpr);
  const x = c.getContext("2d");
  if (!x) return c;
  x.scale(art.dpr, art.dpr);
  x.drawImage(art.face, 0, 0, art.S, art.Hc);
  const sp = handSpec(art.S);
  for (let k = 0; k < 3; k++) {
    x.save();
    x.translate(art.dcx, art.dcy);
    x.rotate(hands[k]);
    drawHand(x, art, k, sp.len[k], sp.wid[k], true);
    x.restore();
  }
  if (!art.hand[0]) {
    x.save();
    x.translate(art.dcx, art.dcy);
    drawCap(x, art.S);
    x.restore();
  }
  return c;
}

/* ---------- 部品 ---------- */

/** 絵を、(ox, oy) を中心に、長い辺が size になるように描く */
function drawFit(x: CanvasRenderingContext2D, img: HTMLImageElement, size: number, ox = 0, oy = 0) {
  const w = img.naturalWidth || 1;
  const h = img.naturalHeight || 1;
  const k = size / Math.max(w, h);
  x.drawImage(img, ox - (w * k) / 2, oy - (h * k) / 2, w * k, h * k);
}

/** 絵が無いときの枠の弧（原点＝弧の中心） */
function drawRimArc(x: CanvasRenderingContext2D, ro: number, ri: number, a0: number, a1: number) {
  x.beginPath();
  x.arc(0, 0, ro, a0, a1);
  x.arc(0, 0, ri, a1, a0, true);
  x.closePath();
  const g = x.createLinearGradient(-ro, -ro, ro, ro);
  g.addColorStop(0, "#f6dc8a");
  g.addColorStop(0.5, "#c99a2e");
  g.addColorStop(1, "#7a5814");
  x.fillStyle = g;
  x.fill();
}

function drawGear(x: CanvasRenderingContext2D, r: number, teeth: number) {
  x.beginPath();
  const n = teeth * 2;
  for (let i = 0; i <= n * 2; i++) {
    const t = (i / (n * 2)) * Math.PI * 2;
    const k = i % 4;
    const rr = k === 0 || k === 1 ? r : r * 0.8;
    if (i) x.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
    else x.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  x.closePath();
  x.moveTo(r * 0.22, 0);
  x.arc(0, 0, r * 0.22, 0, Math.PI * 2, true);
  const g = x.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#f0d27a");
  g.addColorStop(0.5, "#c3973a");
  g.addColorStop(1, "#7d5a1c");
  x.fillStyle = g;
  x.fill("evenodd");
  x.strokeStyle = "rgba(60, 40, 10, 0.7)";
  x.lineWidth = 0.7;
  x.stroke();
  // 輪の内側の線
  x.beginPath();
  x.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  x.strokeStyle = "rgba(90, 60, 15, 0.55)";
  x.lineWidth = Math.max(0.6, r * 0.08);
  x.stroke();
}

function drawSpring(x: CanvasRenderingContext2D, r: number) {
  x.beginPath();
  const turns = 3.5;
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * turns * Math.PI * 2;
    const rr = r * 0.12 + (r * 0.85 * i) / 120;
    if (i) x.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
    else x.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  x.lineCap = "round";
  x.strokeStyle = "rgba(20, 20, 24, 0.75)";
  x.lineWidth = Math.max(1.6, r * 0.16);
  x.stroke();
  x.strokeStyle = "#c9ccd2";
  x.lineWidth = Math.max(0.9, r * 0.09);
  x.stroke();
}

function polyPath(x: CanvasRenderingContext2D, p: number[]) {
  x.beginPath();
  for (let i = 0; i < p.length; i += 2) {
    if (i) x.lineTo(p[i], p[i + 1]);
    else x.moveTo(p[i], p[i + 1]);
  }
  x.closePath();
}

function bbox(p: number[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < p.length; i += 2) {
    x0 = Math.min(x0, p[i]);
    x1 = Math.max(x1, p[i]);
    y0 = Math.min(y0, p[i + 1]);
    y1 = Math.max(y1, p[i + 1]);
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** 破片1つの絵（重心が中央・回転なし） */
export function makeSprite(b: Body, art: Art): Sprite {
  // 枠の弧の絵は、折れた端が計算の形より少し外へ出る
  const h = Math.ceil(b.br * (b.kind === "rim" ? 1.08 : 1) + 3);
  const c = canvas(2 * h * art.dpr, 2 * h * art.dpr);
  const x = c.getContext("2d");
  if (!x) return { c, h };
  x.scale(art.dpr, art.dpr);
  x.translate(h, h);
  const ref = b.ref;
  if (b.kind === "shard") {
    x.save();
    polyPath(x, b.pts);
    x.clip();
    x.drawImage(art.face, -(ref.fx ?? 0), -(ref.fy ?? 0), art.S, art.Hc);
    x.restore();
    // 割れた辺だけ、細く明るい線（外周の弧は引かない）
    x.beginPath();
    const P = b.pts;
    for (let i = 0; i < P.length; i += 2) {
      const j = (i + 2) % P.length;
      const onRim = (k: number) => Math.abs(Math.hypot(P[k] + (ref.fx ?? 0) - art.dcx, P[k + 1] + (ref.fy ?? 0) - art.dcy) - art.R) < 0.8;
      if (onRim(i) && onRim(j)) continue;
      x.moveTo(P[i], P[i + 1]);
      x.lineTo(P[j], P[j + 1]);
    }
    x.strokeStyle = "rgba(255, 248, 230, 0.55)";
    x.lineWidth = 0.7;
    x.stroke();
  } else if (b.kind === "glass") {
    const img = art.glass.length ? art.glass[(ref.g ?? 0) % art.glass.length] : null;
    if (img) {
      // 破片の絵をそのまま（形で切らない）。長い辺を、計算の形の長い辺に合わせる
      const [bx, by, bw, bh] = bbox(b.pts);
      drawFit(x, img, Math.max(bw, bh), bx + bw / 2, by + bh / 2);
    } else {
      polyPath(x, b.pts);
      x.fillStyle = "rgba(220, 238, 255, 0.24)";
      x.fill();
      x.strokeStyle = "rgba(255, 255, 255, 0.75)";
      x.lineWidth = 0.8;
      x.stroke();
    }
  } else if (b.kind === "gear") {
    const r = ref.r ?? 8;
    const img = ref.small ? art.parts.gearSmall ?? art.parts.gear : art.parts.gear;
    if (img) drawFit(x, img, 2 * r);
    else drawGear(x, r, ref.teeth ?? 12);
  } else if (b.kind === "spring") {
    const r = ref.r ?? 8;
    if (art.parts.spring) drawFit(x, art.parts.spring, 2 * r);
    else drawSpring(x, r);
  } else if (b.kind === "rim") {
    // 原点を弧の中心へ（重心は弧の中心から fx, fy）
    const A = site.assets.clockParts.rimArc;
    const ro = ref.r ?? 40;
    x.translate(-(ref.fx ?? 0), -(ref.fy ?? 0));
    const img = art.parts.rim;
    if (img) {
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      const z = ro / ((w * A.r) / 100);
      x.drawImage(img, (-w * A.cx * z) / 100, (-h * A.cy * z) / 100, w * z, h * z);
    } else drawRimArc(x, ro, ro * (A.ri / A.r), (A.from * Math.PI) / 180, (A.to * Math.PI) / 180);
  } else if (b.kind === "hand") {
    const L = ref.len ?? 10;
    x.translate(0, L / 2);
    drawHand(x, art, ref.hand ?? 0, L, ref.wid ?? 2);
  } else if (b.kind === "cap") {
    drawCap(x, art.S);
  }
  return { c, h };
}

/** 破片を描く。oy＝ページ座標から canvas の座標へ引く値、sx＝横の伸び縮み（画面の幅が変わったとき）、t＝いまの時刻（ガラスのきらっ。-1 なら描かない） */
export function drawBodies(x: CanvasRenderingContext2D, bodies: Body[], sprites: Sprite[], oy: number, sx = 1, t = -1) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const sp = sprites[i];
    if (!sp) continue;
    x.save();
    x.translate(b.x * sx, b.y - oy);
    x.rotate(b.a);
    x.drawImage(sp.c, -sp.h, -sp.h, sp.h * 2, sp.h * 2);
    x.restore();
    if (t >= 0 && b.kind === "glass" && b.glint >= 0) {
      const age = t - b.glint;
      if (age >= 0 && age < 0.18) {
        const k = 1 - age / 0.18;
        const L = 3 + 8 * k;
        x.save();
        x.translate(b.x * sx, b.y - oy - 1);
        x.globalAlpha = k;
        x.strokeStyle = "#fff";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(-L, 0);
        x.lineTo(L, 0);
        x.moveTo(0, -L);
        x.lineTo(0, L);
        x.stroke();
        x.restore();
      }
    }
  }
}

/** 縁のひびを描く（x, y＝当たった所の縁の上） */
export function drawCrack(x: CanvasRenderingContext2D, art: Art, crack: Crack, cx: number, cy: number) {
  if (art.crack) {
    const w = Math.min(320, art.S * 2.2);
    const h = (w * art.crack.naturalHeight) / Math.max(1, art.crack.naturalWidth);
    x.drawImage(art.crack, cx - w / 2, cy, w, h);
    return;
  }
  x.save();
  x.translate(cx, cy);
  // 縁（オレンジの線）の欠け
  x.fillStyle = "#141414";
  for (const c of crack.chips) {
    polyPath(x, c);
    x.fill();
  }
  x.lineCap = "round";
  x.lineJoin = "round";
  for (const pass of [0, 1]) {
    for (const l of crack.lines) {
      x.beginPath();
      for (let i = 0; i < l.p.length; i += 2) {
        if (i) x.lineTo(l.p[i], l.p[i + 1] + (pass ? 0 : 0.7));
        else x.moveTo(l.p[i], l.p[i + 1] + (pass ? 0 : 0.7));
      }
      x.strokeStyle = pass ? "rgba(255, 238, 215, 0.4)" : "rgba(0, 0, 0, 0.6)";
      x.lineWidth = pass ? l.w * 0.6 : l.w + 0.8;
      x.stroke();
    }
  }
  x.restore();
}

/** ひびの深さ（縁から下へ px） */
export const crackDepth = (art: Art, crack: Crack) => {
  if (art.crack) {
    const w = Math.min(320, art.S * 2.2);
    return Math.ceil((w * art.crack.naturalHeight) / Math.max(1, art.crack.naturalWidth)) + 4;
  }
  let d = 8;
  for (const l of crack.lines) for (let i = 1; i < l.p.length; i += 2) d = Math.max(d, l.p[i]);
  return Math.ceil(d) + 4;
};
