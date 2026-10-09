// 銀のアタッシュケースの中身が机の上で動く所（canvas に描く）：五円玉・ドーナツ・飛び散ったクリーム。
// 物理は動いている間だけ回し、全部が止まったら rAF を止める。
// 動きを減らす設定でも止めない（どれもケースと机の上だけで完結する、触った手応えの小さな動き。2026-10-09 の方針）。
// 座標は「机の座標」：x＝机の左端からの px／y＝ケースの置かれた面（机の天板）からの px（下が正。ケースの中は負）。

type Coin = {
  x: number;
  y: number;
  r: number;
  /** 止まる面の高さ（机の天板からの奥行きの分だけずれる） */
  floor: number;
  vx: number;
  vy: number;
  vz: number;
  /** 0＝空中／1＝立って転がる／2＝倒れかけ／3＝止まった */
  phase: 0 | 1 | 2 | 3;
  /** 1＝立っている（正面の丸）〜0＝寝ている（つぶれた楕円） */
  tilt: number;
  spin: number;
  spinV: number;
  /** 崩れ始めるまでの刻み */
  wait: number;
};

/** ドーナツの形と向き：位置・半径（絵の幅の半分）・傾き・絵の回る角度・縦の縮み（ケースの中で隣に乗り上げている分） */
type Pose = { x: number; y: number; r: number; lean: number; spin: number; sq: number };

/** ドーナツ：ケースから飛び出し、机の上を車輪のように転がって、ふらついてパタッと倒れる */
type Donut = {
  id: number;
  img: HTMLImageElement;
  x: number;
  y: number;
  r: number;
  /** 寝たときの縦のつぶれ（前から見た楕円の高さの割合）と、寝たときに見える側面の厚み（半径に対する割合） */
  flat: number;
  thick: number;
  floor: number;
  vx: number;
  vy: number;
  vz: number;
  /** 0＝空中／1＝立って転がる／2＝ふらついて倒れかけ／3＝寝て止まった／4＝ケースへ戻る途中 */
  phase: 0 | 1 | 2 | 3 | 4;
  /** 傾き（0＝立っている＝正面の丸〜π/2＝寝ている）と、その速さ */
  lean: number;
  lv: number;
  /** 縦の縮み（ケースの中で乗り上げていた分。飛び出すと 1 に戻る） */
  sq: number;
  /** 絵の回る角度（転がった分）と、空中で回る速さ */
  spin: number;
  spinV: number;
  /** ふらつきの刻み */
  wob: number;
  /** 戻る途中：出発と行き先と進み（0〜1）・山の高さ */
  home: { from: Pose; to: Pose; t: number; arc: number } | null;
};

/** クリームのしずく：シュークリームから放物線を描いて飛び、ケースの内側か机の上にぺちゃっと付いて残る */
type Cream = {
  img: HTMLImageElement;
  /** case＝ケースの内側（閉じたら見えない。付いた所はケースの大きさに対する割合 u・v）／desk＝机の上（前から見るので縦につぶれる） */
  where: "case" | "desk";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 山の高さ（px）・飛ぶ刻みの数・進み（0〜1） */
  arc: number;
  dur: number;
  t: number;
  x: number;
  y: number;
  u: number;
  v: number;
  /** 幅（px） */
  w: number;
  rot: number;
  rotV: number;
  /** 付いてから「ぺちゃっ」の残りの刻み（-1＝まだ飛んでいる） */
  land: number;
  /** 1＝見えている／それより小さい＝古いので消えていく途中 */
  fade: number;
};

export type CoinStart = { x: number; y: number; r: number };
/** unit＝ケースの大きさの目安（五円玉の大きさや速さはこれに比例させる）。caseX・caseW・caseH＝ケースの左の端・幅・高さ（ケースの下の端が y＝0） */
export type DeskBox = {
  w: number;
  h: number;
  top: number;
  unit: number;
  minFloor: number;
  maxFloor: number;
  caseX: number;
  caseW: number;
  caseH: number;
};
/** ケースの中のドーナツ（img＝ケースの中に置いてある絵そのもの・angle＝傾き rad・squash＝縦の縮み・puffy＝ふっくら丸い＝寝ても平たくならない） */
export type DonutStart = {
  id: number;
  img: HTMLImageElement;
  x: number;
  y: number;
  r: number;
  angle: number;
  squash: number;
  puffy: boolean;
};
/** ケースの中の置き場所（戻る先） */
export type DonutSlot = { x: number; y: number; r: number; angle: number; squash: number };
/** クリームの行き先（x・y＝付く所。desk のときの y は机の上の奥行き＝floor）と幅 */
export type CreamDrop = { img: HTMLImageElement; x: number; y: number; w: number; where: "case" | "desk" };

const STEP_MS = 16;
const GRAVITY = 0.42;
const BOUNCE = 0.36;
const ROLL_FRICTION = 0.976;
const ROLL_MIN = 0.45;
const FALL_RATE = 0.055;
const MAX_STEPS = 2400;
/** ドーナツ：跳ね返り・転がる減り方・ふらつき始める速さ・倒れる勢い（傾くほど強くなる分と、最初のひと押し）・戻る刻みの数 */
const D_BOUNCE = 0.3;
const D_ROLL_FRICTION = 0.983;
const D_ROLL_MIN = 0.6;
const D_FALL_G = 0.0042;
const D_FALL_PUSH = 0.0005;
const D_HOME_STEPS = 26;
const HALF_PI = Math.PI / 2;
/** クリーム：付いた後の「ぺちゃっ」の刻み・残しておく数（それより古いものから消える）・机の上に付いたものの縦のつぶれ */
const CREAM_LAND = 9;
const CREAM_MAX = 10;
const CREAM_DESK_FLAT = 0.5;
const PHASE_NAME = ["air", "roll", "wobble", "rest", "home"] as const;

/** 同じ種なら同じ並び（mulberry32） */
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

/** 種：その端末の回数と、その分の時刻 */
export const seedOf = (count: number, minute: number) => (Math.imul(count + 1, 2654435761) ^ Math.imul(minute, 40503)) >>> 0;

/** 読み終わって描ける絵か（読めなかった絵は描かずに、代わりの形で描く＝壊れた絵の印は出ない） */
const ready = (im: HTMLImageElement | null | undefined): im is HTMLImageElement =>
  !!im && im.complete && im.naturalWidth > 0;
const ratioOfImg = (im: HTMLImageElement, fallback: number) => (ready(im) ? im.naturalHeight / im.naturalWidth : fallback);

const images = new Map<string, HTMLImageElement>();
/** 絵を先に読んでおく（同じ src は1つだけ作って使い回す） */
export function imageOf(src: string) {
  let im = images.get(src);
  if (!im) {
    im = new Image();
    im.decoding = "async";
    im.src = src;
    images.set(src, im);
  }
  return im;
}

/** 寝たドーナツの側面：絵を暗くした写し（絵ごとに1つ作って使い回す） */
const shades = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
const shadeOf = (im: HTMLImageElement) => {
  let c = shades.get(im);
  if (!c) {
    c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const g = c.getContext("2d");
    if (g) {
      g.drawImage(im, 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "rgba(64,34,12,0.5)";
      g.fillRect(0, 0, c.width, c.height);
    }
    shades.set(im, c);
  }
  return c;
};

/** ドーナツの寸法：転がる半径（絵は少し横長なので幅と高さの間）・前から見た縦の縮み・見える側面の厚み・接地点から中心までの高さ */
const rcOf = (d: Donut) => (d.r * (1 + ratioOfImg(d.img, 1))) / 2;
const ratioOf = (d: Donut) => (d.flat + (1 - d.flat) * Math.cos(d.lean)) * d.sq;
const thOf = (d: Donut) => d.thick * rcOf(d) * Math.sin(d.lean);
const dyOf = (d: Donut) => rcOf(d) * ratioOf(d) + thOf(d) / 2;
/** ふらつき：接地点を軸に左右へ揺れる角度（揺れ始めは小さく、倒れるほど小さく） */
const rockOf = (d: Donut) =>
  d.phase === 2 ? Math.sin(d.wob * 0.42) * 0.17 * Math.min(1, d.wob / 8) * Math.cos(d.lean) : 0;

export function createCaseSim(
  canvas: HTMLCanvasElement,
  opt: {
    seed: number;
    /** 描いたあと毎回（机の上のドーナツの触れる丸を付いていかせる） */
    onFrame?: () => void;
    /** ドーナツがケースの中へ戻り終わった（id） */
    onHome?: (id: number) => void;
  },
) {
  const ctx = canvas.getContext("2d");
  const coins: Coin[] = [];
  let donuts: Donut[] = [];
  let creams: Cream[] = [];
  const rand = rng(opt.seed);
  let desk: DeskBox = { w: 1, h: 1, top: 0, unit: 0, minFloor: 0, maxFloor: 0, caseX: 0, caseW: 1, caseH: 1 };
  /** ケースが開いているか（閉じていれば、ケースの内側に付いたクリームは見えない） */
  let caseOpen = false;
  let dpr = 1;
  let rafId = 0;
  let last = 0;
  let acc = 0;
  let steps = 0;
  /** 戻り終わったドーナツ（描いたあとに onHome で知らせる） */
  const homed: number[] = [];

  const ryOf = (c: Coin) => c.r * (0.4 + 0.6 * c.tilt);

  const stepCoin = (c: Coin) => {
    if (c.phase === 3) return false;
    if (c.wait > 0) {
      c.wait--;
      return true;
    }
    if (c.phase === 0) {
      c.vy += GRAVITY;
      c.x += c.vx;
      c.y += c.vy;
      c.spin += c.spinV;
      c.tilt = Math.abs(Math.cos(c.spin));
      const ry = ryOf(c);
      if (c.y + ry >= c.floor && c.vy > 0) {
        c.y = c.floor - ry;
        if (c.vy > 1.6) {
          c.vy = -c.vy * BOUNCE;
          c.vx *= 0.82;
          c.spinV *= 0.55;
        } else if (Math.abs(c.vx) > 0.9) {
          c.phase = 1;
          c.tilt = 1;
        } else {
          c.phase = 2;
        }
      }
    } else if (c.phase === 1) {
      c.x += c.vx;
      c.floor += c.vz;
      c.vx *= ROLL_FRICTION;
      c.vz *= 0.96;
      c.spin += c.vx / c.r;
      if (Math.abs(c.vx) < ROLL_MIN) c.phase = 2;
      c.y = c.floor - ryOf(c);
    } else if (c.phase === 2) {
      c.x += c.vx;
      c.vx *= 0.9;
      c.tilt = Math.max(0, c.tilt - FALL_RATE);
      c.spin += 0.5 / Math.max(0.15, c.tilt);
      c.y = c.floor - ryOf(c);
      if (c.tilt <= 0) {
        c.phase = 3;
        c.vx = 0;
      }
    }
    // 机の端：跳ね返る／奥行きは天板の帯の中
    if (c.x < c.r) {
      c.x = c.r;
      c.vx = Math.abs(c.vx) * 0.5;
    } else if (c.x > desk.w - c.r) {
      c.x = desk.w - c.r;
      c.vx = -Math.abs(c.vx) * 0.5;
    }
    if (c.phase !== 0) {
      if (c.floor < desk.minFloor) {
        c.floor = desk.minFloor;
        c.vz = Math.abs(c.vz) * 0.4;
      } else if (c.floor > desk.maxFloor) {
        c.floor = desk.maxFloor;
        c.vz = -Math.abs(c.vz) * 0.4;
      }
    }
    return true;
  };

  /** ドーナツを1刻み進める。戻り終わったら false（呼んだ側が外す） */
  const stepDonut = (d: Donut) => {
    if (d.phase === 4 && d.home) {
      const h = d.home;
      h.t = Math.min(1, h.t + 1 / D_HOME_STEPS);
      if (h.t > 0.9999) h.t = 1;
      const e = h.t * h.t * (3 - 2 * h.t);
      const mix = (a: number, b: number) => a + (b - a) * e;
      d.x = mix(h.from.x, h.to.x);
      d.y = mix(h.from.y, h.to.y) - h.arc * 4 * h.t * (1 - h.t);
      d.r = mix(h.from.r, h.to.r);
      d.lean = mix(h.from.lean, h.to.lean);
      d.spin = mix(h.from.spin, h.to.spin);
      d.sq = mix(h.from.sq, h.to.sq);
      return h.t < 1;
    }
    const rc = rcOf(d);
    if (d.phase === 0) {
      // 空中：回りながら正面を向く（寝ていたものは起き上がる）
      d.vy += GRAVITY;
      d.x += d.vx;
      d.y += d.vy;
      d.spin += d.spinV;
      d.lean *= 0.8;
      d.lv = 0;
      d.sq += (1 - d.sq) * 0.2;
      const dy = dyOf(d);
      if (d.y + dy >= d.floor && d.vy > 0) {
        d.y = d.floor - dy;
        if (d.vy > 2.2) {
          d.vy = -d.vy * D_BOUNCE;
          d.vx *= 0.9;
          d.spinV = d.vx / rc;
        } else {
          d.vy = 0;
          d.lean = 0;
          d.sq = 1;
          if (Math.abs(d.vx) > 0.9) d.phase = 1;
          else {
            d.phase = 2;
            d.lean = 0.05;
            d.wob = 0;
          }
        }
      }
    } else if (d.phase === 1) {
      // 立って転がる（車輪）
      d.x += d.vx;
      d.floor += d.vz;
      d.vx *= D_ROLL_FRICTION;
      d.vz *= 0.96;
      d.spin += d.vx / rc;
      if (Math.abs(d.vx) < D_ROLL_MIN) {
        d.phase = 2;
        d.lean = 0.04;
        d.lv = 0;
        d.wob = 0;
      }
      d.y = d.floor - dyOf(d);
    } else if (d.phase === 2) {
      // ふらつく → 傾くほど速く倒れる → 寝たところで一度だけ小さく跳ね返って（パタッ）止まる
      d.x += d.vx;
      d.vx *= 0.93;
      d.spin += d.vx / rc;
      d.wob++;
      d.lv += D_FALL_G * Math.sin(d.lean) + D_FALL_PUSH;
      d.lean += d.lv;
      if (d.lean >= HALF_PI) {
        d.lean = HALF_PI;
        if (d.lv > 0.035) d.lv = -d.lv * 0.3;
        else {
          d.lv = 0;
          d.vx = 0;
          d.phase = 3;
        }
      }
      d.y = d.floor - dyOf(d);
    }
    // 机の端：跳ね返る（机から落ちない）／奥行きは天板の帯の中
    if (d.x < rc) {
      d.x = rc;
      d.vx = Math.abs(d.vx) * 0.45;
      d.spinV = d.vx / rc;
    } else if (d.x > desk.w - rc) {
      d.x = desk.w - rc;
      d.vx = -Math.abs(d.vx) * 0.45;
      d.spinV = d.vx / rc;
    }
    if (d.phase !== 0) {
      if (d.floor < desk.minFloor) {
        d.floor = desk.minFloor;
        d.vz = Math.abs(d.vz) * 0.4;
      } else if (d.floor > desk.maxFloor) {
        d.floor = desk.maxFloor;
        d.vz = -Math.abs(d.vz) * 0.4;
      }
    }
    return true;
  };

  /** クリームを1刻み進める。動いている（飛ぶ・ぺちゃっ・消えていく）間は true */
  const stepCream = (c: Cream) => {
    if (c.land < 0) {
      c.t = Math.min(1, c.t + 1 / c.dur);
      if (c.t > 0.9999) c.t = 1;
      const t = c.t;
      c.x = c.x0 + (c.x1 - c.x0) * t;
      c.y = c.y0 + (c.y1 - c.y0) * t - c.arc * 4 * t * (1 - t);
      c.rot += c.rotV;
      if (t >= 1) {
        c.land = CREAM_LAND;
        if (c.where === "case") {
          c.u = (c.x - desk.caseX) / desk.caseW;
          c.v = c.y / desk.caseH + 1;
        }
      }
    } else if (c.land > 0) c.land--;
    if (c.fade < 1) c.fade -= 0.08;
    return c.land !== 0 || c.fade < 1;
  };

  const step = () => {
    let moving = false;
    for (const c of coins) if (stepCoin(c)) moving = true;
    for (const d of donuts) {
      if (d.phase === 3) continue;
      moving = true;
      if (!stepDonut(d)) homed.push(d.id);
    }
    if (homed.length) donuts = donuts.filter((d) => !homed.includes(d.id));
    for (const c of creams) if (stepCream(c)) moving = true;
    if (creams.some((c) => c.fade <= 0)) creams = creams.filter((c) => c.fade > 0);
    return moving;
  };

  const drawCoin = (g: CanvasRenderingContext2D, c: Coin) => {
    const rx = c.phase === 2 ? c.r * (0.9 + 0.1 * Math.cos(c.spin)) : c.r;
    const ry = ryOf(c);
    const cx = c.x;
    const cy = c.y + desk.top;
    const th = Math.max(1, c.r * 0.16) * (1 - c.tilt * 0.6);
    // 影（机の上にあるときだけ）
    if (c.phase !== 0 || c.floor - (c.y + ry) < 12) {
      g.fillStyle = "rgba(20,12,6,0.32)";
      g.beginPath();
      g.ellipse(cx + 1, c.floor + desk.top + 1, c.r * 1.05, c.r * 0.32, 0, 0, Math.PI * 2);
      g.fill();
    }
    // 縁（厚み）
    g.fillStyle = "#8a6c22";
    g.beginPath();
    g.ellipse(cx, cy + th, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // 面
    const grad = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    grad.addColorStop(0, "#e8d27a");
    grad.addColorStop(0.45, "#c9a83f");
    grad.addColorStop(1, "#9c7e2a");
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // 刻みの輪（五円玉の稲穂の代わりの細い輪）
    g.strokeStyle = "rgba(110,84,20,0.55)";
    g.lineWidth = Math.max(0.5, c.r * 0.06);
    g.beginPath();
    g.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
    g.stroke();
    // 転がっているときの光
    if (c.phase === 1) {
      g.strokeStyle = "rgba(255,246,200,0.55)";
      g.lineWidth = Math.max(0.6, c.r * 0.1);
      g.beginPath();
      g.ellipse(cx, cy, rx * 0.86, ry * 0.86, 0, c.spin, c.spin + 0.9);
      g.stroke();
    }
    // 穴
    g.fillStyle = "rgba(38,24,12,0.9)";
    g.beginPath();
    g.ellipse(cx, cy, rx * 0.24, ry * 0.24, 0, 0, Math.PI * 2);
    g.fill();
  };

  const drawDonut = (g: CanvasRenderingContext2D, d: Donut) => {
    const rc = rcOf(d);
    const ratio = ratioOf(d);
    const th = thOf(d);
    const rock = rockOf(d);
    const cx = d.x + Math.sin(rock) * rc * 0.6;
    const cy = d.y + desk.top;
    const ang = d.spin + rock;
    // 影（机の上にあるときだけ）：立っていると細く、寝ると広い
    if (d.phase !== 4 && (d.phase !== 0 || d.floor - (d.y + dyOf(d)) < 14)) {
      g.fillStyle = "rgba(20,12,6,0.3)";
      g.beginPath();
      g.ellipse(cx + 1, d.floor + desk.top + 1, rc * (0.5 + 0.55 * Math.sin(d.lean)), rc * 0.24, 0, 0, Math.PI * 2);
      g.fill();
    }
    const w = d.r * 2;
    const h = w * ratioOfImg(d.img, 1);
    // ケースの上を飛んでいる間は、ケースの中の絵と同じ落ち影（silverCase.css の .sc-sw の drop-shadow）を付ける＝入れ替わる所で影が消えない
    const overCase = d.phase === 4 || (d.phase === 0 && d.y + dyOf(d) < -2);
    const face = (im: CanvasImageSource, oy: number) => {
      g.save();
      if (overCase) {
        g.shadowColor = "rgba(0,0,0,0.5)";
        g.shadowOffsetY = desk.caseW * 0.005 * dpr;
        g.shadowBlur = desk.caseW * 0.0045 * dpr;
      }
      g.translate(cx, cy + oy);
      g.scale(1, ratio);
      g.rotate(ang);
      g.drawImage(im, -w / 2, -h / 2, w, h);
      g.restore();
    };
    if (ready(d.img)) {
      // 寝ているほど側面が見える：暗くした写しを下へ少しずつずらして重ね、その上に上の面
      if (th > 0.5) {
        const sh = shadeOf(d.img);
        const n = Math.min(4, Math.ceil(th));
        for (let k = n; k >= 1; k--) face(sh, -th / 2 + (th * k) / n);
      }
      face(d.img, -th / 2);
    } else {
      // 絵が読めないとき：輪の形
      g.save();
      g.translate(cx, cy - th / 2);
      g.scale(1, ratio);
      g.fillStyle = "#c98a45";
      g.beginPath();
      g.ellipse(0, 0, rc, rc, 0, 0, Math.PI * 2);
      g.moveTo(rc * 0.36, 0);
      g.ellipse(0, 0, rc * 0.36, rc * 0.36, 0, 0, Math.PI * 2);
      g.fill("evenodd");
      g.restore();
    }
  };

  const drawCream = (g: CanvasRenderingContext2D, c: Cream) => {
    const flying = c.land < 0;
    let sx = 1;
    let sy = 1;
    if (flying) {
      // 飛んでいる間はぷるぷる揺れる
      const wv = Math.sin(c.t * 18) * 0.1;
      sx = 1 + wv;
      sy = 1 - wv;
    } else {
      // ぺちゃっ：付いた瞬間に横へ広がって縦に縮み、少し戻る
      const k = c.land / CREAM_LAND;
      sx = 1 + 0.5 * k;
      sy = 1 - 0.45 * k;
      if (c.where === "desk") sy *= CREAM_DESK_FLAT;
    }
    const w = c.w;
    const h = w * ratioOfImg(c.img, 0.75);
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, c.fade));
    g.translate(c.x, c.y + desk.top);
    g.scale(sx, sy);
    g.rotate(c.rot);
    if (ready(c.img)) g.drawImage(c.img, -w / 2, -h / 2, w, h);
    else {
      g.fillStyle = "#f4ecd6";
      g.beginPath();
      g.ellipse(0, 0, w * 0.42, h * 0.36, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };

  const draw = () => {
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, desk.w, desk.h);
      // ケースの内側に付いたクリーム（閉じていれば見えない）
      if (caseOpen) for (const c of creams) if (c.where === "case" && c.land >= 0) drawCream(ctx, c);
      // 机の上：寝ている（止まった）ものから先に、手前（floor が大きい）ほど後に
      const list: { rest: number; floor: number; paint: () => void }[] = [];
      for (const c of creams)
        if (c.where === "desk" && c.land >= 0) list.push({ rest: 0, floor: c.y, paint: () => drawCream(ctx, c) });
      for (const c of coins) list.push({ rest: c.phase === 3 ? 0 : 1, floor: c.floor, paint: () => drawCoin(ctx, c) });
      for (const d of donuts)
        if (d.phase !== 4) list.push({ rest: d.phase === 3 ? 0 : 1, floor: d.floor, paint: () => drawDonut(ctx, d) });
      list.sort((a, b) => a.rest - b.rest || a.floor - b.floor);
      for (const it of list) it.paint();
      // 飛んでいるもの（クリーム・ケースへ戻るドーナツ）はいちばん上
      for (const c of creams) if (c.land < 0) drawCream(ctx, c);
      for (const d of donuts) if (d.phase === 4) drawDonut(ctx, d);
    }
    opt.onFrame?.();
  };

  /** 戻り終わったドーナツを知らせる（描いたあと＝同じコマでケースの中の絵に替わる） */
  const flushHomed = () => {
    if (!homed.length) return;
    const ids = homed.splice(0);
    for (const id of ids) opt.onHome?.(id);
  };

  const frame = (t: number) => {
    rafId = 0;
    if (document.hidden) return;
    acc += Math.min(64, Math.max(0, t - last));
    last = t;
    let moving = true;
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      moving = step();
      if (++steps > MAX_STEPS) {
        settleAll();
        moving = false;
      }
      if (!moving) break;
    }
    draw();
    flushHomed();
    if (moving) rafId = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (rafId) return;
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(frame);
  };

  /** 残りを一度に止める（長すぎたときの保険） */
  const settleAll = () => {
    for (let i = 0; i < MAX_STEPS && step(); i++);
    for (const c of coins) {
      c.phase = 3;
      c.tilt = 0;
      c.wait = 0;
      c.y = c.floor - ryOf(c);
    }
    for (const d of donuts) {
      d.phase = 3;
      d.lean = HALF_PI;
      d.lv = 0;
      d.sq = 1;
      d.y = d.floor - dyOf(d);
    }
    for (const c of creams) if (c.land < 0) c.t = 1;
  };

  const busy = () => coins.some((c) => c.phase !== 3) || donuts.some((d) => d.phase !== 3) || creams.some((c) => c.land !== 0 || c.fade < 1);
  const onVisible = () => {
    if (!document.hidden && busy()) kick();
  };
  document.addEventListener("visibilitychange", onVisible);

  /** 山の高さ：頂上が canvas の上の端を越えない（ケースの上で切れない）ように抑える */
  const arcFit = (arc: number, y0: number, y1: number) => Math.max(0, Math.min(arc, (y0 + y1) / 2 + desk.top - 4));

  return {
    /** 机の大きさが変わった：canvas を合わせ、今ある物を同じ割合の場所へ移す */
    layout(next: DeskBox) {
      const sx = desk.w > 1 ? next.w / desk.w : 1;
      const su = desk.unit > 0 ? next.unit / desk.unit : 1;
      const clampFloor = (f: number) => Math.min(next.maxFloor, Math.max(next.minFloor, f));
      for (const c of coins) {
        c.r *= su;
        c.x = Math.min(next.w - c.r, Math.max(c.r, c.x * sx));
        c.floor = clampFloor(c.floor * su);
        c.y = c.phase === 0 ? c.y * su : c.floor - ryOf(c);
      }
      for (const d of donuts) {
        d.r *= su;
        const rc = rcOf(d);
        d.x = Math.min(next.w - rc, Math.max(rc, d.x * sx));
        d.floor = clampFloor(d.floor * su);
        d.y = d.phase === 0 || d.phase === 4 ? d.y * su : d.floor - dyOf(d);
      }
      for (const c of creams) {
        c.w *= su;
        if (c.land < 0) continue;
        if (c.where === "case") {
          c.x = next.caseX + c.u * next.caseW;
          c.y = (c.v - 1) * next.caseH;
        } else {
          c.x = Math.min(next.w, Math.max(0, c.x * sx));
          c.y = clampFloor(c.y * su);
        }
      }
      desk = next;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(next.w * dpr));
      canvas.height = Math.max(1, Math.round(next.h * dpr));
      draw();
    },
    /** 五円玉をケースから出す（starts＝ケースの中の位置・机の座標） */
    spill(starts: CoinStart[], seed: number) {
      const rand = rng(seed);
      const s = Math.max(0.6, starts[0]?.r ? starts[0].r / 6 : 1);
      starts.forEach((p, i) => {
        const left = rand() < 0.85;
        const sp = 0.9 + rand() * 2;
        coins.push({
          x: p.x,
          y: p.y,
          r: p.r,
          floor: desk.minFloor + rand() * (desk.maxFloor - desk.minFloor),
          vx: (left ? -sp : sp * 0.35) * s,
          vy: -(1.4 + rand() * 2.4) * Math.sqrt(s),
          vz: (rand() - 0.5) * 0.25,
          phase: 0,
          tilt: 1,
          spin: rand() * Math.PI,
          spinV: 0.12 + rand() * 0.3,
          wait: Math.round(i * 2 + rand() * 5),
        });
      });
      steps = 0;
      kick();
    },
    /** ドーナツをケースから飛び出させる（ケースの中と同じ位置・向きから。たいていは机の広い左へ） */
    launch(p: DonutStart) {
      const s = desk.unit || 1;
      const dir = desk.w - p.x < p.r * 4 || rand() < 0.78 ? -1 : 1;
      const vx = dir * (1.7 + rand() * 1.5) * s;
      donuts = donuts.filter((d) => d.id !== p.id);
      donuts.push({
        id: p.id,
        img: p.img,
        x: p.x,
        y: p.y,
        r: p.r,
        flat: p.puffy ? 0.8 : 0.42,
        thick: p.puffy ? 0.12 : 0.3,
        floor: desk.minFloor + (0.25 + rand() * 0.7) * (desk.maxFloor - desk.minFloor),
        vx,
        vy: -(2.4 + rand() * 1.2) * Math.sqrt(s),
        vz: (rand() - 0.5) * 0.12,
        phase: 0,
        lean: 0,
        lv: 0,
        sq: p.squash,
        spin: p.angle,
        spinV: (vx / p.r) * 0.9,
        wob: 0,
        home: null,
      });
      steps = 0;
      draw();
      kick();
    },
    /** 机の上のドーナツを押した：slot があればケースの中のその場所へ放り戻す／なければ（ケースが閉じている）その場で跳ねる */
    tap(id: number, slot: DonutSlot | null) {
      const d = donuts.find((o) => o.id === id);
      if (!d || d.phase === 4) return false;
      const s = desk.unit || 1;
      if (slot) {
        // 戻る間に一回転（進む向きに）してから、ケースの中の向きに収まる
        const turn = Math.round((d.spin - slot.angle) / (Math.PI * 2)) * Math.PI * 2;
        const spin = slot.angle + turn + (slot.x > d.x ? 1 : -1) * Math.PI * 2;
        const rock = rockOf(d);
        const from = { x: d.x + Math.sin(rock) * rcOf(d) * 0.6, y: d.y, r: d.r, lean: d.lean, spin: d.spin + rock, sq: d.sq };
        d.home = {
          from,
          to: { x: slot.x, y: slot.y, r: slot.r, lean: 0, spin, sq: slot.squash },
          t: 0,
          arc: arcFit(Math.max(16 * s, Math.abs(slot.y - d.y) * 0.4) + 10 * s, d.y, slot.y),
        };
        d.phase = 4;
      } else {
        const dir = d.x < desk.w * 0.25 ? 1 : d.x > desk.w * 0.75 ? -1 : rand() < 0.5 ? -1 : 1;
        // その場で跳ねる：起き上がって少し浮き、横へはほんの少し（速いときだけ少し転がってから、また倒れる）
        d.phase = 0;
        d.vy = -(3 + rand() * 1.2) * Math.sqrt(s);
        d.vx = dir * (0.6 + rand() * 0.9) * s;
        d.spinV = d.vx / rcOf(d);
        d.lv = 0;
        d.wob = 0;
      }
      steps = 0;
      kick();
      return true;
    },
    /** クリームを from から drops の所へはじき飛ばす（残すのは CREAM_MAX まで。超えた分は古いものから消える） */
    burst(from: { x: number; y: number }, drops: CreamDrop[]) {
      const s = desk.unit || 1;
      const kept = creams.filter((c) => c.fade >= 1);
      const over = kept.length + drops.length - CREAM_MAX;
      for (let i = 0; i < over; i++) kept[i].fade = 0.999;
      for (const p of drops) {
        const dist = Math.hypot(p.x - from.x, p.y - from.y);
        creams.push({
          img: p.img,
          where: p.where,
          x0: from.x,
          y0: from.y,
          x1: p.x,
          y1: p.y,
          arc: arcFit((12 + rand() * 14) * s + dist * 0.25, from.y, p.y),
          dur: Math.round(18 + rand() * 6 + dist / (6 * s)),
          t: 0,
          x: from.x,
          y: from.y,
          u: 0,
          v: 0,
          w: p.w,
          rot: rand() * Math.PI * 2,
          rotV: (rand() - 0.5) * 0.5,
          land: -1,
          fade: 1,
        });
      }
      steps = 0;
      draw();
      kick();
    },
    /** ケースが開いた・閉じた（ケースの内側に付いたクリームの見え隠れ）。閉じたとき、ケースへ戻る途中のドーナツはその場で収める
     *  （開いた絵の中の行き先へ飛び続けて、閉じたケースの前の面で消えないように） */
    setOpen(open: boolean) {
      if (caseOpen === open) return;
      caseOpen = open;
      let homing = false;
      if (!open)
        for (const d of donuts)
          if (d.phase === 4 && d.home) {
            d.home.t = 1;
            homing = true;
          }
      draw();
      if (homing) kick();
    },
    /** 机の上のドーナツの今の位置（canvas の px・中心）と見えている大きさ。机の上に無ければ null */
    donutAt(id: number) {
      const d = donuts.find((o) => o.id === id);
      if (!d) return null;
      const rc = rcOf(d);
      return {
        x: d.x + Math.sin(rockOf(d)) * rc * 0.6,
        y: d.y + desk.top,
        w: rc * 2,
        h: rc * 2 * ratioOf(d) + thOf(d),
        phase: PHASE_NAME[d.phase],
      };
    },
    state: () => ({
      onDesk: coins.length,
      moving: coins.filter((c) => c.phase !== 3).length,
      running: !!rafId,
      coins: coins.map((c) => ({ x: Math.round(c.x), floor: Math.round(c.floor), phase: c.phase })),
      donuts: donuts.map((d) => ({
        id: d.id,
        phase: PHASE_NAME[d.phase],
        x: Math.round(d.x),
        floor: Math.round(d.floor),
        lean: +d.lean.toFixed(2),
      })),
      creams: {
        flying: creams.filter((c) => c.land < 0).length,
        onCase: creams.filter((c) => c.land >= 0 && c.where === "case").length,
        onDesk: creams.filter((c) => c.land >= 0 && c.where === "desk").length,
        fading: creams.filter((c) => c.fade < 1).length,
      },
      caseOpen,
    }),
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      document.removeEventListener("visibilitychange", onVisible);
    },
  };
}

export type CaseSim = ReturnType<typeof createCaseSim>;
