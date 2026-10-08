// 輪飾りの鎖（遅延チャンク）。
// 共有の輪：教室の後ろの天井のフックに掛けて垂らす。準備の時間だけ伸びる（同じ時刻なら全員同じ長さ）。
//   長さが変わるのは、教室の後ろが画面の外にある間だけ（見ている前では伸び縮みしない）。天井の canvas に描く（テレビの裏を通る）。
// 自分の輪：共有の輪の尾の先につながる。床の短冊の束を押すと、尾の先に1つ足される。数の上限はない。
//   尾の先はページのどこへでも引っ張っていける。ページの左右の端まで持っていくとそこにくっつき、そこから新しい尾が続く。
//   くっついた点を長押しすると外れる。くっついた点は端末に残る。
//   尾とくっついた鎖は、ページ全体を覆う固定の canvas に、いま画面に入っている所だけ描く（節点はページ座標で持つ）。
//   [data-occlude] の付いた部品（テレビの箱など）の四角の中は描かない＝鎖はその部品の奥を通って見える。
// 物理は掴んでいる間と揺れている間だけ回す。文字も数も出さない。
import { CLOCK_EVENT, now } from "@/lib/now";
import { GARLAND_KEY, ringColor, sharedTarget, streamColor } from "@/lib/prep";
import { site } from "@/data/site";
import { debugAllowed } from "@/lib/worldClock";
import { SCENE_EVENT } from "./Signboard";

type Pt = { x: number; y: number; px: number; py: number; pin: boolean };
/** 1本の鎖：節点（輪4個に1つ）と、そこに並ぶ輪の色。first＝通しの輪の番号（輪の向きの交互を揃える） */
type Chain = { nodes: Pt[]; rest: number; rings: string[]; first: number; pg?: boolean };
/** くっついた点：n＝その点までに足した自分の輪の数／fx＝学校の幅に対する割合／key・i＝近い区画／fy＝その区画の高さに対する割合 */
type Hook = { n: number; fx: number; key: string; i: number; fy: number };
/** 保存の形：自分の輪は数だけ（色は番号から決まる）。pre＝前の版で足した輪の色（そのまま先頭に残す） */
type Saved = { v: 2; n: number; pre: string[]; hooks: Hook[] };

const OLD_KEY = `gbf_${site.year}_garland_v1`;
const STEP_MS = 16;
const ITER = 6;
const DAMP = 0.985;
/** 重力（1刻みあたりの px） */
const GRAVITY = 0.35;
/** 天井の鎖を指へ寄せるバネ */
const SPRING = 0.25;
/** 掴んだ尾の先を指へ寄せる割合 */
const FOLLOW = 0.5;
/** 輪4個に1節点 */
const PER_NODE = 4;
/** 止まったとみなす速さ（いちばん速い節点の、1刻みの移動の2乗） */
const STILL_E = 0.02;
const STILL_STEPS = 15;
/** 離してからこの時間が過ぎても揺れていたら、少しずつ強く減衰させて静かに止める */
const CALM_AFTER_MS = 3000;
const CALM_DAMP = 0.94;
const HOOK_Y = 8;
/** ページの左右の端からこの幅に入るとくっつく */
const EDGE = 16;
/** くっついた点を外す長押し */
const HOLD_MS = 600;
/** 引っ張っている間、画面の上下の端に近づくと自動でスクロールする（端からの幅・1コマの最大 px） */
const SCROLL_ZONE = 56;
const SCROLL_MAX = 18;
/** ページの床（いちばん下）に着いた節点の横の滑りを弱める割合 */
const FLOOR_FRICTION = 0.4;
/** 保存する自分の輪の数の上限（壊れた値を読まないための目安。実用上は無制限） */
const MINE_CAP = 100000;
/** 輪の大きさ（輪の間隔 P＝画面の幅の 1/72・5〜6.4px）。輪の縦の外径はおよそ 1.86P＝スマホ（390px）で約10px・PC で約12px */
const P_RATIO = 72;
const P_MIN = 5;
const P_MAX = 6.4;
/** 暗い部屋での色の沈め方：明るさの下限（--amb が0でもこれだけ残す）と、灰青へ寄せる量（--dark が1のとき） */
const TONE_FLOOR = 0.55;
const TONE_NIGHT = 0.2;
/** 輪の外径（P に対する割合）。正面の輪＝幅1.5P×縦1.86P（縦が鎖の向き）／横向きの輪＝幅0.3P×縦1.44P */
const FRONT_W = 1.5;
const FRONT_H = 1.86;
const SIDE_W = 0.3;
const SIDE_H = 1.44;
/** 色を掛けた輪の絵は、画面の画素の何倍の細かさで作っておくか（回して縮めて描くときのギザギザを抑える） */
const ART_SS = 2;
/** 正面の輪の紙の帯を太らせる量（P に対する割合・帯の内側と外側へ。外径は変えない）。
 *  絵の帯は外径の約8%（右側はさらに細い）しかなく、縦10px前後に縮めると片側が1px未満になって輪が「C」の字にかすれるため */
const FRONT_BOLD = 0.05;

const HEX = /^#[0-9a-f]{6}$/i;
const empty = (): Saved => ({ v: 2, n: 0, pre: [], hooks: [] });

/* ---------- 保存（その端末だけ） ---------- */
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(GARLAND_KEY) || "null");
    if (raw && raw.v === 2) {
      const pre = Array.isArray(raw.pre) ? raw.pre.filter((c: unknown) => typeof c === "string" && HEX.test(c)).slice(0, 64) : [];
      const n = Math.min(MINE_CAP, Math.max(pre.length, Number.isFinite(raw.n) ? Math.floor(raw.n) : 0));
      const hooks: Hook[] = (Array.isArray(raw.hooks) ? raw.hooks : [])
        .filter(
          (h: Hook) =>
            h &&
            Number.isFinite(h.n) &&
            Number.isFinite(h.fx) &&
            Number.isFinite(h.fy) &&
            Number.isFinite(h.i) &&
            typeof h.key === "string",
        )
        .map((h: Hook) => ({
          n: Math.min(n, Math.max(0, Math.floor(h.n))),
          fx: Math.min(1, Math.max(0, h.fx)),
          key: h.key.slice(0, 80),
          i: Math.max(0, Math.floor(h.i)),
          fy: Math.min(2, Math.max(-1, h.fy)),
        }))
        .sort((a: Hook, b: Hook) => a.n - b.n);
      return { v: 2, n, pre, hooks };
    }
    // 前の版（足した時刻の位置と色の一覧・最大24）からの引っ越し：色だけ先頭に残す
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || "[]");
    if (Array.isArray(old) && old.length) {
      const pre = old.filter((m) => m && typeof m.c === "string" && HEX.test(m.c)).map((m) => m.c as string).slice(-24);
      return { v: 2, n: pre.length, pre, hooks: [] };
    }
  } catch {}
  return empty();
}
function save(s: Saved) {
  try {
    localStorage.setItem(GARLAND_KEY, JSON.stringify(s));
    localStorage.removeItem(OLD_KEY);
  } catch {}
}

export function start(section: HTMLElement, canvas: HTMLCanvasElement, strips: HTMLButtonElement, opt: { reduce: boolean }) {
  const reduce = opt.reduce;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const world = document.getElementById("kb-world");
  const school = section.closest<HTMLElement>(".kb-school") || document.body;

  // ページ全体を覆う固定の canvas（尾とくっついた鎖を描く）。押せない
  const page = document.createElement("canvas");
  page.className = "kb-garland-page";
  page.setAttribute("aria-hidden", "true");
  school.appendChild(page);
  const pctx = page.getContext("2d");
  if (!pctx) {
    page.remove();
    return () => {};
  }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let VW = 0;
  let VH = 0;
  let P = 8;
  /** 天井のフックの間に渡した共有の鎖（教室の後ろの canvas の中の座標） */
  let drapes: Chain[] = [];
  /** 自分の側の鎖（ページ座標）：くっついた点で区切った区間の並び。最後の1本が自由な尾 */
  let segs: Chain[] = [];
  /** segs[i] の終わりの点（くっついている点） */
  let active: Hook[] = [];
  /** 共有の輪のうち、天井に渡しきれずに尾へ回った数と、その最初の番号。尾の付け根（canvas の中の x） */
  let freeShared = 0;
  let freeFirst = 0;
  let freeX = 0;
  /** ページの床と左右の壁（ページ座標）。長い尾は床に積もり、ページの外へは出ない（先端を掴めなくならないように） */
  let floorY = Infinity;
  let wallL = -Infinity;
  let wallR = Infinity;
  let target = sharedTarget(now());
  let shown = target;
  let mine = load();
  let inView = false;
  let rafId = 0;
  let pageRaf = 0;
  let moving = false;
  let still = 0;
  let releasedAt = 0;
  let acc = 0;
  let last = 0;

  /** 自分の輪の j 番目の色 */
  const mineColor = (j: number) => (j < mine.pre.length ? mine.pre[j] : streamColor(j - mine.pre.length));
  const paintStrip = () => strips.style.setProperty("--strip", mineColor(mine.n));

  /* ---------- 部屋の明るさで色を暗くする ---------- */
  let amb = 1;
  let lit = 0;
  let dark = 0;
  let lightKey = "";
  const shade = new Map<string, string>();
  /** 色（tone の結果）ごとの、色を掛けた輪の絵 [正面, 横向き] */
  const tinted = new Map<string, [HTMLCanvasElement, HTMLCanvasElement]>();
  const readLight = () => {
    if (world) {
      const cs = getComputedStyle(world);
      const num = (n: string, d: number) => {
        const v = parseFloat(cs.getPropertyValue(n));
        return Number.isFinite(v) ? v : d;
      };
      amb = num("--amb", 1);
      lit = num("--lit", 0);
      dark = num("--dark", 0);
    }
    const key = `${amb.toFixed(3)}|${lit}|${dark.toFixed(3)}`;
    if (key === lightKey) return false;
    lightKey = key;
    shade.clear();
    // 色が変わったので、色を掛けた輪の絵も作り直す（古い色の絵を溜めない）
    tinted.clear();
    return true;
  };
  const tone = (hex: string) => {
    let c = shade.get(hex);
    if (c) return c;
    const n = parseInt(hex.slice(1), 16);
    const f = TONE_FLOOR + (1 - TONE_FLOOR) * Math.min(1, Math.max(0, amb));
    let r = ((n >> 16) & 255) * f;
    let g = ((n >> 8) & 255) * f;
    let b = (n & 255) * f;
    if (lit >= 0.5) {
      // 蛍光灯の青白さ
      r += (0xdf - r) * 0.12;
      g += (0xe9 - g) * 0.12;
      b += (0xff - b) * 0.12;
    }
    const d = TONE_NIGHT * Math.min(1, Math.max(0, dark));
    r += (60 - r) * d;
    g += (70 - g) * d;
    b += (100 - b) * d;
    c = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    shade.set(hex, c);
    return c;
  };

  /* ---------- 輪の絵（白い紙の輪に色を掛ける） ---------- */
  // site.assets の ringFront（正面の輪）・ringSide（横向きの輪）が両方読めたら絵で描く。空・読めないあいだは線と四角で描く。
  // 白い絵を今の輪の大きさに縮めた下絵を1回作り、色ごとに「下絵×色（陰影は残す）・形は下絵のまま」の絵を1回だけ作って覚える。
  // 毎コマの描画は drawImage だけ。
  let gone = false;
  const artSrc: [string, string] = [site.assets.ringFront, site.assets.ringSide];
  const artImg: (HTMLImageElement | null)[] = [null, null];
  let artReady = false;
  /** 下絵 [正面, 横向き] と、それを作ったときの大きさ（P と画素の細かさ） */
  let base: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
  let baseKey = "";
  if (artSrc[0] && artSrc[1]) {
    let left = 2;
    artSrc.forEach((src, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        artImg[i] = img;
        if (--left === 0 && !gone) {
          artReady = true;
          draw();
        }
      };
      img.src = src;
    });
  }
  const makeCanvas = (w: number, h: number) => {
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.ceil(w));
    cv.height = Math.max(1, Math.ceil(h));
    return cv;
  };
  /** 白い絵を、描く大きさ（の ART_SS 倍）に縮めた下絵。大きく縮めるときは半分ずつ縮めてにじみを残さない */
  const shrink = (img: HTMLImageElement, w: number, h: number) => {
    let src: CanvasImageSource = img;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    while (sw / 2 > w && sh / 2 > h) {
      const half = makeCanvas(sw / 2, sh / 2);
      const hc = half.getContext("2d");
      if (!hc) break;
      hc.imageSmoothingQuality = "high";
      hc.drawImage(src, 0, 0, half.width, half.height);
      src = half;
      sw = half.width;
      sh = half.height;
    }
    const out = makeCanvas(w, h);
    const oc = out.getContext("2d");
    if (oc) {
      oc.imageSmoothingQuality = "high";
      oc.drawImage(src, 0, 0, out.width, out.height);
    }
    return out;
  };
  /** 縮めた下絵を上下左右斜めに k だけずらして8回＋中央に重ね、紙の帯を k ずつ太らせる（外径は w×h のまま） */
  const bold = (img: HTMLImageElement, w: number, h: number, k: number) => {
    const inner = shrink(img, w - 2 * k, h - 2 * k);
    const out = makeCanvas(w, h);
    const oc = out.getContext("2d");
    if (!oc) return inner;
    for (const dx of [-k, 0, k]) for (const dy of [-k, 0, k]) oc.drawImage(inner, k + dx, k + dy);
    return out;
  };
  /** 下絵を、いまの輪の大きさに合わせて用意する（P か画素の細かさが変わったときだけ作り直す）。絵で描けるなら true。
   *  鎖を描くたびに1回だけ呼ぶ（輪ごとには呼ばない） */
  const artOn = () => {
    if (!artReady || !artImg[0] || !artImg[1]) return false;
    const s = Math.max(dpr, pd) * ART_SS;
    const key = `${P}|${s}`;
    if (!base || key !== baseKey) {
      baseKey = key;
      base = [
        bold(artImg[0], FRONT_W * P * s, FRONT_H * P * s, FRONT_BOLD * P * s),
        shrink(artImg[1], SIDE_W * P * s, SIDE_H * P * s),
      ];
      tinted.clear();
    }
    return true;
  };
  /** 色 col を掛けた輪の絵 [正面, 横向き]。artOn() が true のときだけ呼ぶ */
  const ringArt = (col: string) => {
    let t = tinted.get(col);
    if (t || !base) return t || null;
    const tint = (b: HTMLCanvasElement) => {
      const cv = makeCanvas(b.width, b.height);
      const c2 = cv.getContext("2d");
      if (!c2) return b;
      c2.drawImage(b, 0, 0);
      // 白い紙の陰影を残したまま色を乗せ、形（透けている所）は下絵に戻す
      c2.globalCompositeOperation = "multiply";
      c2.fillStyle = col;
      c2.fillRect(0, 0, cv.width, cv.height);
      c2.globalCompositeOperation = "destination-in";
      c2.drawImage(b, 0, 0);
      return cv;
    };
    t = [tint(base[0]), tint(base[1])];
    tinted.set(col, t);
    return t;
  };

  /* ---------- 鎖の組み立て ---------- */
  const pt = (x: number, y: number, pin = false): Pt => ({ x, y, px: x, py: y, pin });

  /** 2点の間に、長さ k 輪の鎖を放物線で垂らした初めの形（両端は留める。あとで物理で解いて静止形にする） */
  const drape = (ax: number, ay: number, bx: number, by: number, k: number, first: number, rings: string[]): Chain => {
    const L = k * P;
    const m = Math.max(1, Math.ceil(k / PER_NODE));
    const SAMPLES = 64;
    const curve = (d: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        pts.push([ax + (bx - ax) * t, ay + (by - ay) * t + 4 * d * t * (1 - t)]);
      }
      return pts;
    };
    const length = (pts: [number, number][]) => {
      let s = 0;
      for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return s;
    };
    let lo = 0;
    let hi = L;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (length(curve(mid)) < L) lo = mid;
      else hi = mid;
    }
    const pts = curve(L > Math.hypot(bx - ax, by - ay) ? lo : 0);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    const nodes: Pt[] = [];
    let j = 1;
    for (let i = 0; i <= m; i++) {
      const s = (total * i) / m;
      while (j < cum.length - 1 && cum[j] < s) j++;
      const f = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
      nodes.push(pt(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f, i === 0 || i === m));
    }
    Object.assign(nodes[0], { x: ax, px: ax, y: ay, py: ay });
    Object.assign(nodes[m], { x: bx, px: bx, y: by, py: by });
    return { nodes, rest: L / m, rings, first };
  };

  /** 1点から自由に垂れる尾（先端は掴める）。輪が無いときは付け根の1点だけ */
  const hang = (x: number, y: number, k: number, first: number, rings: string[]): Chain => {
    if (k <= 0) return { nodes: [pt(x, y, true)], rest: P, rings, first, pg: true };
    const m = Math.max(1, Math.ceil(k / PER_NODE));
    const rest = (k * P) / m;
    const nodes: Pt[] = [pt(x, y, true)];
    // まっすぐ下へ垂らす。床に着いたら床に沿って横へ寝かせ、ページの端で折り返す（静止形に近い初めの形）
    const bd = bounds();
    const lo = bd.l + P;
    const hi = Math.max(lo, bd.r - P);
    const floor = Math.max(y, floorY);
    let dir = x < (bd.l + bd.r) / 2 ? 1 : -1;
    let cx = x;
    let cy = y;
    for (let i = 1; i <= m; i++) {
      const ny = Math.min(floor, cy + rest);
      cx += dir * Math.sqrt(Math.max(0, rest * rest - (ny - cy) * (ny - cy)));
      cy = ny;
      if (cx > hi) {
        cx = Math.max(lo, 2 * hi - cx);
        dir = -1;
      } else if (cx < lo) {
        cx = Math.min(hi, 2 * lo - cx);
        dir = 1;
      }
      nodes.push(pt(cx, cy));
    }
    return { nodes, rest, rings, first, pg: true };
  };

  /** 共有の輪を、スパン×層の順に天井のフックへ掛けていく。渡しきれない残りは尾（自分の側）へ回す */
  const buildRoom = () => {
    drapes = [];
    P = Math.min(P_MAX, Math.max(P_MIN, W / P_RATIO));
    const nh = W < 700 ? 4 : 5;
    // 両端のフックは部屋の角（輪が半分に切れないよう、輪1つ分弱だけ内側）
    const inset = P * 0.8;
    const S = (W - 2 * inset) / (nh - 1);
    const hx = Array.from({ length: nh }, (_, i) => inset + S * i);
    const N = shown;
    let used = 0;
    freeX = hx[0];
    let done = W <= 0;
    for (let layer = 0; layer < 40 && used < N && !done; layer++) {
      const k = Math.max(2, Math.round((S * (1.15 + 0.38 * layer)) / P));
      for (let s = 0; s < nh - 1 && used < N; s++) {
        const left = N - used;
        if (left >= k) {
          drapes.push(drape(hx[s], HOOK_Y, hx[s + 1], HOOK_Y, k, used, colorsShared(used, k)));
          used += k;
          freeX = hx[s + 1];
          continue;
        }
        // 途中のスパン＝左のフックから垂れる尾。
        // 尾が天井の帯の下に出るほど長いときだけ、右のフックまで渡して残りを右から垂らす（伸びている先端を見えるところに置く）
        const drop = H - HOOK_Y - P * 1.2;
        const len = left * P;
        const span = Math.max(S * 1.05, len - drop);
        if (len > drop && span <= len - 2 * P) {
          const ka = Math.round(span / P);
          drapes.push(drape(hx[s], HOOK_Y, hx[s + 1], HOOK_Y, ka, used, colorsShared(used, ka)));
          used += ka;
          freeX = hx[s + 1];
        } else freeX = hx[s];
        done = true;
        break;
      }
    }
    freeShared = N - used;
    freeFirst = used;
    freeX = openHook(hx, freeX);
  };
  /** 尾を垂らすフックが、教室の後ろの手前の部品（テレビ）の真上なら、真上でないいちばん近いフックに替える。
   *  そのままだと尾が部品の奥に隠れ、床の短冊で足した輪も見えず、尾の先も掴めない（両端のフックは部品の外） */
  const openHook = (hx: number[], x: number) => {
    const cb = canvas.getBoundingClientRect();
    if (!cb.width) return x;
    const rs = occluders(false, section);
    const hidden = (h: number) => rs.some((r) => r.bottom > cb.top + HOOK_Y && cb.left + h > r.left - P && cb.left + h < r.right + P);
    if (!hidden(x)) return x;
    let best = x;
    let bd = Infinity;
    for (const h of hx) {
      if (!hidden(h) && Math.abs(h - x) < bd) {
        bd = Math.abs(h - x);
        best = h;
      }
    }
    return best;
  };
  const colorsShared = (from: number, k: number) => Array.from({ length: k }, (_, i) => ringColor(from + i));

  /* ---------- ページ座標の物差し ---------- */
  const bounds = () => {
    const b = school.getBoundingClientRect();
    const w = b.width || document.documentElement.clientWidth;
    const l = b.width ? b.left + window.scrollX : 0;
    return { l, r: l + w, w };
  };
  /** 学校の中の区画（教室・窓・教室の後ろ…）。くっついた点の高さはどれかの区画に対する割合で持つ */
  const places = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".kb-school > *")).filter(
      (el) => el !== page && el.tagName !== "STYLE" && el.tagName !== "SCRIPT" && el.offsetHeight > 0,
    );
  const keyOf = (el: HTMLElement) =>
    el.getAttribute("aria-label") || el.id || (typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") || el.tagName;
  const hookPos = (h: Hook, list: HTMLElement[], bd: { l: number; r: number; w: number }) => {
    const el = list.find((p) => keyOf(p) === h.key) || list[Math.min(h.i, list.length - 1)];
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const x = Math.min(bd.r - P * 0.5, Math.max(bd.l + P * 0.5, bd.l + h.fx * bd.w));
    return { x, y: b.top + window.scrollY + h.fy * b.height };
  };
  const hookFrom = (x: number, y: number, n: number): Hook => {
    const list = places();
    const bd = bounds();
    let best = 0;
    let bdist = Infinity;
    list.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const top = b.top + window.scrollY;
      const d = y < top ? top - y : y > top + b.height ? y - top - b.height : 0;
      if (d < bdist) {
        bdist = d;
        best = i;
      }
    });
    const el = list[best];
    const b = el?.getBoundingClientRect();
    const top = b ? b.top + window.scrollY : 0;
    return {
      n,
      fx: Math.min(1, Math.max(0, (x - bd.l) / bd.w)),
      key: el ? keyOf(el) : "",
      i: best,
      fy: b && b.height ? (y - top) / b.height : 0,
    };
  };

  /** 自分の側の鎖を組み立てる：尾の付け根 → くっついた点（届くものだけ）→ 自由な尾 */
  const buildMine = () => {
    segs = [];
    active = [];
    if (W <= 0) return;
    // 床＝学校の部品の一番下（フッターや門の外の上に積もると掴めなくなる）
    const schools = [...document.querySelectorAll<HTMLElement>(".kb-school")].filter((el) => el.offsetParent !== null || el.getClientRects().length);
    const last = schools.length ? schools[schools.length - 1].getBoundingClientRect() : null;
    floorY = (last && last.height ? last.bottom + window.scrollY : document.documentElement.scrollHeight) - P * 0.6;
    const wb = bounds();
    wallL = wb.l + P * 0.5;
    wallR = Math.max(wallL, wb.r - P * 0.5);
    const cb = canvas.getBoundingClientRect();
    let ax = cb.left + window.scrollX + freeX;
    let ay = cb.top + window.scrollY + HOOK_Y;
    const R = freeShared + mine.n;
    const color = (q: number) => (q < freeShared ? ringColor(freeFirst + q) : mineColor(q - freeShared));
    const list = places();
    const bd = bounds();
    let from = 0;
    for (const h of mine.hooks) {
      const idx = freeShared + h.n;
      const k = idx - from;
      if (k < 2 || idx > R) continue;
      const p = hookPos(h, list, bd);
      // くっつけるときは鎖をぴんと張っているので、距離はちょうど鎖の長さになる。少しの伸びまでは許す。
      // それより遠い点（画面の大きさや共有の長さが変わって届かなくなった点）は、いまは使わない（保存は残す）
      if (!p || Math.hypot(p.x - ax, p.y - ay) > k * P * 1.15) continue;
      const d = drape(
        ax,
        ay,
        p.x,
        p.y,
        k,
        freeFirst + from,
        Array.from({ length: k }, (_, q) => color(from + q)),
      );
      d.pg = true;
      segs.push(d);
      active.push(h);
      ax = p.x;
      ay = p.y;
      from = idx;
    }
    segs.push(hang(ax, ay, R - from, freeFirst + from, Array.from({ length: R - from }, (_, q) => color(from + q))));
  };
  const tail = (): Chain | undefined => segs[segs.length - 1];
  const tipOf = (c: Chain | undefined) => (c && c.rings.length && c.nodes.length > 1 ? c.nodes[c.nodes.length - 1] : null);

  /* ---------- 物理（Verlet・16ms 固定刻み） ---------- */
  type Grab =
    | { kind: "room"; id: number; node: Pt; ox: number; oy: number; tx: number; ty: number; on: boolean; sx: number; sy: number }
    | {
        kind: "tip";
        id: number;
        node: Pt;
        ox: number;
        oy: number;
        cx: number;
        cy: number;
        tx: number;
        ty: number;
        clamped: boolean;
        armL: boolean;
        armR: boolean;
        touch: boolean;
      }
    | { kind: "hold"; id: number; sx: number; sy: number; hook: Hook; timer: number }
    | { kind: "done"; id: number; touch: boolean };
  let grab: Grab | null = null;

  /** 1刻み進める。戻り値＝いちばん速い節点の速さの2乗 */
  const step = (list: Chain[]) => {
    let e = 0;
    const calm = !grab && releasedAt && performance.now() - releasedAt > CALM_AFTER_MS;
    const damp = calm ? CALM_DAMP : DAMP;
    for (const c of list)
      for (const p of c.nodes) {
        if (p.pin) continue;
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + GRAVITY;
        const v = vx * vx + vy * vy;
        if (v > e) e = v;
      }
    floor(list);
    if (grab?.kind === "room" && grab.on) {
      const g = grab;
      g.node.x += (g.tx + g.ox - g.node.x) * SPRING;
      g.node.y += (g.ty + g.oy - g.node.y) * SPRING;
    } else if (grab?.kind === "tip") {
      // 掴んだ尾の先は留めたまま指へ寄せる（離したときに勢いが残るよう、前の位置を px に残す）
      const n = grab.node;
      n.px = n.x;
      n.py = n.y;
      n.x += (grab.tx - n.x) * (reduce ? 1 : FOLLOW);
      n.y += (grab.ty - n.y) * (reduce ? 1 : FOLLOW);
    }
    for (let it = 0; it < ITER; it++)
      for (const c of list) {
        const ns = c.nodes;
        const last = ns.length - 1;
        if (last < 1) continue;
        // 両端が留まっている鎖は、向きを交互に解く（片側だけ伸びないように）
        const back = ns[0].pin && ns[last].pin && it % 2 === 1;
        for (let s = 1; s <= last; s++) {
          const i = back ? last + 1 - s : s;
          const a = ns[i - 1];
          const b = ns[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const diff = (d - c.rest) / d;
          const wa = a.pin ? 0 : 1;
          const wb = b.pin ? 0 : 1;
          const w = wa + wb;
          if (!w) continue;
          a.x += dx * diff * (wa / w);
          a.y += dy * diff * (wa / w);
          b.x -= dx * diff * (wb / w);
          b.y -= dy * diff * (wb / w);
        }
      }
    // 長い鎖は上の反復だけでは重さで伸びきる（輪の間が空き、いつまでも止まらない）。
    // 留めた端から鎖に沿って i 節ぶんより遠くへは行かせない（留めた端は動かないので、勢いを生まない）
    for (const c of list) {
      const ns = c.nodes;
      const last = ns.length - 1;
      if (last < 2) continue;
      if (ns[0].pin) for (let i = 2; i <= last; i++) leash(ns[0], ns[i], i * c.rest);
      if (ns[last].pin) for (let i = last - 2; i >= 0; i--) leash(ns[last], ns[i], (last - i) * c.rest);
    }
    floor(list);
    return e;
  };
  /** b を、留めた点 a から max より遠くへ行かせない */
  const leash = (a: Pt, b: Pt, max: number) => {
    if (b.pin) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= max * max) return;
    const f = max / Math.sqrt(d2);
    b.x = a.x + dx * f;
    b.y = a.y + dy * f;
  };
  /** ページの床より下・左右の端より外へは行かない（床に着いた節点は縦の勢いを失い、横にも滑りにくい） */
  const floor = (list: Chain[]) => {
    for (const c of list) {
      if (!c.pg) continue;
      for (const p of c.nodes) {
        if (p.pin) continue;
        if (p.x < wallL) p.x = p.px = wallL;
        else if (p.x > wallR) p.x = p.px = wallR;
        if (p.y < floorY) continue;
        p.y = floorY;
        p.py = floorY;
        p.px += (p.x - p.px) * FLOOR_FRICTION;
      }
    }
  };
  const all = () => drapes.concat(segs);
  /** 速さを0にする（静止形のまま止める） */
  const freeze = (list: Chain[]) => {
    for (const c of list)
      for (const p of c.nodes) {
        p.px = p.x;
        p.py = p.y;
      }
  };
  /** 同期で n 刻み解く（揺れ戻りは見せない） */
  const solve = (list: Chain[], n: number) => {
    for (let i = 0; i < n; i++) step(list);
  };
  /** 動きを減らす設定：解いたら勢いを残さない（次の操作まで形だけ変わる） */
  const settle = (list: Chain[], n: number) => {
    solve(list, n);
    freeze(list);
  };
  /** 作り直して、静止形まで解く */
  const rebuild = () => {
    // 古い鎖の節点を掴んだまま残さない
    endGrab();
    buildRoom();
    buildMine();
    const list = all();
    solve(list, 120);
    freeze(list);
    moving = false;
    still = 0;
  };
  const rebuildMine = () => {
    endGrab();
    buildMine();
    solve(segs, 120);
    freeze(segs);
  };

  /* ---------- 描画 ---------- */
  const at = (ns: Pt[], u: number) => {
    // 節点の間を Catmull-Rom でなめらかにつなぐ（位置と接線）
    const m = ns.length - 1;
    const i = Math.min(m - 1, Math.max(0, Math.floor(u)));
    const t = u - i;
    const p0 = ns[Math.max(0, i - 1)];
    const p1 = ns[i];
    const p2 = ns[i + 1];
    const p3 = ns[Math.min(m, i + 2)];
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const df = (a: number, b: number, c: number, d: number) =>
      0.5 * (-a + c + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t * t);
    return {
      x: f(p0.x, p1.x, p2.x, p3.x),
      y: f(p0.y, p1.y, p2.y, p3.y),
      a: Math.atan2(df(p0.y, p1.y, p2.y, p3.y), df(p0.x, p1.x, p2.x, p3.x)),
    };
  };
  /** 鎖の輪を描く。ox・oy＝座標のずらし。view＝この縦の範囲に入る輪だけ描く（null＝全部） */
  const paint = (c2: CanvasRenderingContext2D, d: number, list: Chain[], ox: number, oy: number, view: [number, number] | null) => {
    const rx = P * 0.62;
    const ry = P * 0.8;
    const pad = P * PER_NODE * 2;
    // 絵で描くときの大きさ（f＝正面の輪・s＝横向きの輪）
    const fw = { f: P * FRONT_W, s: P * SIDE_W };
    const fh = { f: P * FRONT_H, s: P * SIDE_H };
    const useArt = artOn();
    let drew = false;
    // 横向きの輪（奇数番）を先に、正面の輪（偶数番）をその上に
    for (const odd of [1, 0])
      for (const c of list) {
        const k = c.rings.length;
        const ns = c.nodes;
        const m = ns.length - 1;
        if (!k || m < 1) continue;
        if (view) {
          let lo = Infinity;
          let hi = -Infinity;
          for (const p of ns) {
            if (p.y < lo) lo = p.y;
            if (p.y > hi) hi = p.y;
          }
          if (hi < view[0] - pad || lo > view[1] + pad) continue;
        }
        for (let r = 0; r < k; r++) {
          if ((c.first + r) % 2 !== odd) continue;
          const u = ((r + 0.5) / k) * m;
          if (view) {
            const ny = ns[Math.min(m, Math.floor(u))].y;
            if (ny < view[0] - pad || ny > view[1] + pad) continue;
          }
          const q = at(ns, u);
          const x = q.x - ox;
          const y = q.y - oy;
          const col = tone(c.rings[r]);
          const art = useArt ? ringArt(col) : null;
          if (art) {
            // 絵の縦を鎖の向きに合わせて回す（回す角＝鎖の向き − 90°）
            const cos = Math.sin(q.a);
            const sin = -Math.cos(q.a);
            c2.setTransform(d * cos, d * sin, -d * sin, d * cos, d * x, d * y);
            if (odd) c2.drawImage(art[1], -fw.s / 2, -fh.s / 2, fw.s, fh.s);
            else c2.drawImage(art[0], -fw.f / 2, -fh.f / 2, fw.f, fh.f);
            drew = true;
          } else if (odd) {
            c2.fillStyle = col;
            const cos = Math.cos(q.a);
            const sin = Math.sin(q.a);
            c2.setTransform(d * cos, d * sin, -d * sin, d * cos, d * x, d * y);
            c2.fillRect(-P * 0.72, -P * 0.15, P * 1.44, P * 0.3);
            c2.setTransform(d, 0, 0, d, 0, 0);
          } else {
            c2.strokeStyle = col;
            c2.lineWidth = P * 0.26;
            c2.beginPath();
            c2.ellipse(x, y, rx, ry, q.a - Math.PI / 2, 0, Math.PI * 2);
            c2.stroke();
          }
        }
      }
    if (drew) c2.setTransform(d, 0, 0, d, 0, 0);
  };
  const drawRoom = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    paint(ctx, dpr, drapes, 0, 0, null);
  };
  const pdpr = () => Math.min(2, window.devicePixelRatio || 1);
  let pd = 1;
  const drawPage = () => {
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    pctx.clearRect(0, 0, VW, VH);
    const sx = window.scrollX;
    const sy = window.scrollY;
    paint(pctx, pd, segs, sx, sy, [sy, sy + VH]);
    // くっついた点：小さな画鋲
    for (let i = 0; i < active.length; i++) {
      const p = segs[i]?.nodes[segs[i].nodes.length - 1];
      if (!p || p.y < sy - 20 || p.y > sy + VH + 20) continue;
      const r = Math.max(2.5, P * 0.38);
      pctx.fillStyle = tone("#c9c4b6");
      pctx.beginPath();
      pctx.arc(p.x - sx, p.y - sy, r, 0, Math.PI * 2);
      pctx.fill();
      pctx.fillStyle = tone("#6f6a5f");
      pctx.beginPath();
      pctx.arc(p.x - sx - r * 0.25, p.y - sy - r * 0.25, r * 0.35, 0, Math.PI * 2);
      pctx.fill();
    }
    // 手前にある部品（[data-occlude]）の四角を抜く＝鎖はその奥を通る。四角は描くたびに1回だけ読む。
    // clip ではなく描いたあとに消す（四角どうしが重なっても抜けたままになる）。角丸は無視
    for (const r of occluders(true)) pctx.clearRect(r.left, r.top, r.width, r.height);
  };
  /** 手前の部品の四角（画面座標）。inView＝画面に入っているものだけ・root＝その中の部品だけ */
  const occluders = (inView: boolean, root: ParentNode = document) => {
    const out: DOMRect[] = [];
    root.querySelectorAll<HTMLElement>("[data-occlude]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (inView && !(r.bottom > 0 && r.top < VH && r.right > 0 && r.left < VW)) return;
      out.push(r);
    });
    return out;
  };
  const draw = () => {
    drawRoom();
    drawPage();
  };
  /** スクロールに合わせた描き直し（rAF でまとめる） */
  const schedulePage = () => {
    if (pageRaf || rafId) return;
    pageRaf = requestAnimationFrame(() => {
      pageRaf = 0;
      drawPage();
    });
  };

  /* ---------- rAF は動いている間だけ ---------- */
  const scrollSpeed = () => {
    if (grab?.kind !== "tip" || grab.clamped) return 0;
    const top = barH() + SCROLL_ZONE;
    const bot = VH - SCROLL_ZONE;
    if (grab.cy > bot) return Math.min(1, (grab.cy - bot) / SCROLL_ZONE) * SCROLL_MAX;
    if (grab.cy < top) return -Math.min(1, (top - grab.cy) / SCROLL_ZONE) * SCROLL_MAX;
    return 0;
  };
  const needFrame = () => {
    if (document.hidden) return false;
    if (grab?.kind === "tip") return !reduce || scrollSpeed() !== 0;
    if (grab?.kind === "room" && grab.on) return !reduce;
    return moving && !reduce;
  };
  const frame = (t: number) => {
    rafId = 0;
    if (document.hidden) return;
    const v = scrollSpeed();
    if (v) {
      window.scrollBy(0, v);
      aimTip();
    }
    if (reduce) {
      if (v) settle(segs, 20);
    } else {
      acc += Math.min(64, Math.max(0, t - last));
      last = t;
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        const e = step(all());
        if (!grab || grab.kind === "hold" || grab.kind === "done") {
          // 長い鎖は振り子の端で一瞬止まって見える。離してから静める時間が過ぎるまでは止めない（傾いたまま固まらないように）
          const calm = !releasedAt || performance.now() - releasedAt > CALM_AFTER_MS;
          still = calm && e < STILL_E ? still + 1 : 0;
          if (still >= STILL_STEPS) {
            moving = false;
            releasedAt = 0;
            freeze(all());
            break;
          }
        }
      }
    }
    draw();
    if (needFrame()) rafId = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (rafId || !needFrame()) return;
    if (pageRaf) {
      cancelAnimationFrame(pageRaf);
      pageRaf = 0;
    }
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(frame);
  };
  /** 離したあと・足したあとに揺らす */
  const swing = () => {
    if (reduce) return;
    releasedAt = performance.now();
    moving = true;
    still = 0;
    kick();
  };

  /* ---------- 大きさ ---------- */
  const sizeRoom = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === W && h === H) return false;
    W = w;
    H = h;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    return true;
  };
  const sizePage = () => {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    const d = pdpr();
    if (w === VW && h === VH && d === pd) return false;
    const wide = w !== VW;
    VW = w;
    VH = h;
    pd = d;
    page.width = Math.round(VW * pd);
    page.height = Math.round(VH * pd);
    page.style.width = `${VW}px`;
    page.style.height = `${VH}px`;
    return wide;
  };
  let barCache = -1;
  const barH = () => {
    if (barCache < 0) {
      const v = world ? parseFloat(getComputedStyle(world).getPropertyValue("--bar-h")) : NaN;
      barCache = Number.isFinite(v) ? v : 88;
    }
    return barCache;
  };

  /* ---------- 共有の長さの見回り ---------- */
  const apply = () => {
    shown = target;
    rebuild();
    draw();
    paintStrip();
  };
  const refresh = () => {
    target = sharedTarget(now());
    // 見ている前では伸び縮みさせない（画面の外にある間だけ合わせる）。掴んでいる間も待つ
    if (!inView && !grab && target !== shown) apply();
    else if (readLight()) draw();
  };

  /* ---------- 掴む：天井の鎖（教室の後ろの中で横に動かした指だけ） ---------- */
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  /** 指の近くの輪（見えている輪で判定）→ その鎖の、いちばん近い動ける節点 */
  const pickRoom = (x: number, y: number, lim: number) => {
    let best: Pt | null = null;
    let bd = Infinity;
    for (const c of drapes) {
      let near = false;
      const k = c.rings.length;
      const m = c.nodes.length - 1;
      for (let r = 0; r < k && !near; r++) {
        const q = at(c.nodes, ((r + 0.5) / k) * m);
        if (Math.hypot(q.x - x, q.y - y) <= lim) near = true;
      }
      for (const p of c.nodes) {
        if (p.pin) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if ((d <= lim || near) && d < bd) {
          bd = d;
          best = p;
        }
      }
    }
    return best;
  };
  const beginRoom = (e: PointerEvent) => {
    if (grab?.kind !== "room") return;
    grab.on = true;
    try {
      section.setPointerCapture(e.pointerId);
    } catch {}
    moving = true;
    still = 0;
    releasedAt = 0;
    if (reduce) {
      settle(drapes, 30);
      drawRoom();
    } else kick();
  };
  /** 押せる部品（ボタン・つまみ・埋め込みなど）の上では鎖を掴まない */
  const isControl = (t: EventTarget | null) =>
    !!(t as Element | null)?.closest?.("button, a, input, textarea, select, label, summary, iframe, [role='button'], [role='slider'], [contenteditable='true']");
  const onRoomDown = (e: PointerEvent) => {
    if (grab || !e.isPrimary || !drapes.length) return;
    if (isControl(e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = local(e);
    const touch = e.pointerType === "touch";
    const node = pickRoom(p.x, p.y, touch ? 28 : 22);
    if (!node) return;
    grab = { kind: "room", id: e.pointerId, node, ox: node.x - p.x, oy: node.y - p.y, tx: p.x, ty: p.y, on: false, sx: e.clientX, sy: e.clientY };
    if (!touch) {
      e.preventDefault();
      beginRoom(e);
    }
  };

  /** 指の位置から、尾の先の狙い（ページ座標）を決める。長さが足りない所までは引けない */
  /* ---------- 掴む：尾の先（ページのどこでも）・くっついた点の長押し ---------- */
  const aimTip = () => {
    if (grab?.kind !== "tip") return;
    const g = grab;
    const c = tail();
    if (!c) return;
    const a = c.nodes[0];
    let x = g.cx + window.scrollX + g.ox;
    let y = Math.min(floorY, g.cy + window.scrollY + g.oy);
    const L = c.rings.length * P * 0.995;
    const d = Math.hypot(x - a.x, y - a.y);
    g.clamped = d > L;
    if (g.clamped) {
      x = a.x + ((x - a.x) * L) / d;
      y = a.y + ((y - a.y) * L) / d;
    }
    g.tx = x;
    g.ty = y;
    // 掴んだ場所が端のそばだったときは、一度端から離れるまでくっつけない
    const bd = bounds();
    if (x > bd.l + EDGE * 2.5) g.armL = true;
    if (x < bd.r - EDGE * 2.5) g.armR = true;
    if ((g.armL && x <= bd.l + EDGE) || (g.armR && x >= bd.r - EDGE)) attach(x <= bd.l + EDGE ? bd.l + P * 0.5 : bd.r - P * 0.5, y);
  };
  /** 尾の先をページの端にくっつける：その区間を留め、くっついた点から空の尾を続ける */
  const attach = (x: number, y: number) => {
    if (grab?.kind !== "tip") return;
    const c = tail();
    if (!c || c.rings.length < 2) return;
    const touch = grab.touch;
    const id = grab.id;
    const tip = c.nodes[c.nodes.length - 1];
    tip.x = tip.px = x;
    tip.y = tip.py = y;
    tip.pin = true;
    const h = hookFrom(x, y, mine.n);
    mine = load();
    mine.hooks = mine.hooks.filter((o) => o.n !== h.n).concat(h);
    mine.hooks.sort((a, b) => a.n - b.n);
    save(mine);
    active.push(h);
    segs.push(hang(x, y, 0, c.first + c.rings.length, []));
    grab = { kind: "done", id, touch };
    setCursor("");
    if (reduce) {
      solve([c], 120);
      freeze([c]);
      draw();
    } else swing();
  };
  /** くっついた点を外す：前後の区間を1本につなぎ直し、その先は垂れる */
  const detach = (h: Hook) => {
    const i = active.indexOf(h);
    if (i < 0 || !segs[i + 1]) return;
    const a = segs[i];
    const b = segs[i + 1];
    const joint = a.nodes[a.nodes.length - 1];
    joint.pin = false;
    const nodes = b.nodes.length > 1 ? a.nodes.concat(b.nodes.slice(1)) : a.nodes;
    const rings = a.rings.concat(b.rings);
    const merged: Chain = { nodes, rings, first: a.first, rest: (rings.length * P) / Math.max(1, nodes.length - 1), pg: true };
    segs.splice(i, 2, merged);
    active.splice(i, 1);
    mine = load();
    mine.hooks = mine.hooks.filter((o) => !(o.n === h.n && o.key === h.key && Math.abs(o.fy - h.fy) < 1e-6 && Math.abs(o.fx - h.fx) < 1e-6));
    save(mine);
    if (reduce) {
      solve(segs, 120);
      freeze(segs);
      draw();
    } else swing();
  };
  /** 指の近くの、くっついた点 */
  const nearHook = (x: number, y: number, lim: number) => {
    let best: Hook | null = null;
    let bd = lim;
    for (let i = 0; i < active.length; i++) {
      const p = segs[i]?.nodes[segs[i].nodes.length - 1];
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= bd) {
        bd = d;
        best = active[i];
      }
    }
    return { hook: best, d: bd };
  };
  /** 学校のページの上の操作か（公式バー・持ち物・会話窓・門など、ページより上に重なる物の上では掴まない） */
  const onPage = (t: EventTarget | null) => {
    const el = t as Element | null;
    if (!el?.closest) return false;
    if (el.closest("[inert], [role='dialog'], dialog, [aria-modal='true']")) return false;
    return !!el.closest(".kb-school") || el === world;
  };
  const onDocDown = (e: PointerEvent) => {
    // 前の操作の「離した」が届かなかった（埋め込みの動画の上で離した等）ときは、ここで離したことにする
    if (grab && (grab.id === e.pointerId || e.pointerType === "mouse")) finish(endGrab());
    if (grab || !e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isControl(e.target) || !onPage(e.target)) return;
    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    const touch = e.pointerType === "touch";
    const lim = touch ? 28 : 22;
    const tip = tipOf(tail());
    const dt = tip ? Math.hypot(tip.x - x, tip.y - y) : Infinity;
    const nh = nearHook(x, y, lim);
    if (tip && dt <= lim && (!nh.hook || dt <= nh.d)) {
      // 尾の先を掴んだ：この操作はほかの部品へ渡さない（黒板などが同時に反応しない）
      e.stopPropagation();
      if (!touch) e.preventDefault();
      // 埋め込みの動画などの上へ動かしても、動きと「離した」を受け取り続ける
      try {
        document.documentElement.setPointerCapture(e.pointerId);
      } catch {}
      const bd = bounds();
      tip.pin = true;
      grab = {
        kind: "tip",
        id: e.pointerId,
        node: tip,
        ox: tip.x - x,
        oy: tip.y - y,
        cx: e.clientX,
        cy: e.clientY,
        tx: tip.x,
        ty: tip.y,
        clamped: false,
        armL: tip.x > bd.l + EDGE * 2.5,
        armR: tip.x < bd.r - EDGE * 2.5,
        touch,
      };
      moving = true;
      still = 0;
      releasedAt = 0;
      setCursor("grabbing");
      if (reduce) {
        settle(segs, 20);
        drawPage();
      } else kick();
      return;
    }
    if (nh.hook) {
      const hook = nh.hook;
      const id = e.pointerId;
      // 長押しの間、文字の選択や端末のメニューを出さない
      setCursor("grabbing");
      grab = {
        kind: "hold",
        id,
        sx: e.clientX,
        sy: e.clientY,
        hook,
        timer: window.setTimeout(() => {
          if (grab?.kind !== "hold" || grab.id !== id) return;
          grab = { kind: "done", id, touch };
          heldAt = performance.now();
          detach(hook);
        }, HOLD_MS),
      };
    }
  };
  let heldAt = 0;
  const onMove = (e: PointerEvent) => {
    if (!grab) {
      if (e.pointerType === "mouse") hover(e);
      return;
    }
    if (e.pointerId !== grab.id) return;
    // マウスのボタンがもう離れている（「離した」が届かなかった）
    if (e.pointerType === "mouse" && e.buttons === 0) {
      finish(endGrab());
      return;
    }
    if (grab.kind === "hold") {
      if (Math.hypot(e.clientX - grab.sx, e.clientY - grab.sy) > 10) endGrab();
      return;
    }
    if (grab.kind === "tip") {
      grab.cx = e.clientX;
      grab.cy = e.clientY;
      aimTip();
      if (grab?.kind !== "tip") return;
      if (reduce) {
        settle(segs, 20);
        drawPage();
      }
      kick();
      return;
    }
    if (grab.kind === "room") {
      const p = local(e);
      grab.tx = p.x;
      grab.ty = p.y;
      if (!grab.on) {
        // 指：横に動かしたときだけ掴む（縦はスクロールに任せる）
        const dx = Math.abs(e.clientX - grab.sx);
        const dy = Math.abs(e.clientY - grab.sy);
        if (Math.hypot(dx, dy) < 10) return;
        if (dx >= 2 * dy) beginRoom(e);
        else grab = null;
        return;
      }
      if (reduce) {
        settle(drapes, 30);
        drawRoom();
      } else kick();
    }
  };
  /** 掴んでいたものを離す（離したあとは揺れて止まる） */
  const endGrab = () => {
    const g = grab;
    grab = null;
    if (!g) return;
    if (g.kind === "hold") window.clearTimeout(g.timer);
    if (g.kind === "tip") g.node.pin = false;
    if (g.kind !== "room") setCursor("");
    return g;
  };
  /** 離したあと：揺らして止める（動きを減らす設定では静止形へ） */
  const finish = (g: Grab | undefined) => {
    if (!g || g.kind === "hold" || g.kind === "done") return;
    if (g.kind === "room" && !g.on) return;
    if (reduce) {
      const list = g.kind === "room" ? drapes : segs;
      solve(list, 120);
      freeze(list);
      moving = false;
      draw();
      return;
    }
    swing();
  };
  /** 尾の先を掴んで離したあと・長押しで外したあとの「クリック」は、下の部品へ渡さない */
  let swallowUntil = 0;
  const onUp = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grab.id) return;
    const g = endGrab();
    if (g && (g.kind === "tip" || g.kind === "done")) swallowUntil = performance.now() + 400;
    finish(g);
  };
  const onClickCap = (e: MouseEvent) => {
    if (performance.now() > swallowUntil) return;
    swallowUntil = 0;
    e.preventDefault();
    e.stopPropagation();
  };
  // 指で尾の先を掴んでいる間は、その指でページをスクロールさせない
  const onTouch = (e: TouchEvent) => {
    if (grab && (grab.kind === "tip" || (grab.kind === "done" && grab.touch)) && e.cancelable) e.preventDefault();
  };
  // 長押しで出る端末のメニューを、くっついた点の上では出さない
  const onMenu = (e: Event) => {
    if (grab?.kind === "hold" || performance.now() - heldAt < 800) e.preventDefault();
  };
  /** マウスを尾の先・くっついた点に重ねたら、掴める手の形にする */
  let cursor = "";
  const setCursor = (c: string) => {
    if (c === cursor) return;
    cursor = c;
    document.documentElement.classList.toggle("kb-garland-grab", c === "grab");
    document.documentElement.classList.toggle("kb-garland-grabbing", c === "grabbing");
  };
  const hover = (e: PointerEvent) => {
    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    const tip = tipOf(tail());
    const on = (tip && Math.hypot(tip.x - x, tip.y - y) <= 22) || nearHook(x, y, 22).hook;
    setCursor(on ? "grab" : "");
  };

  /* ---------- 床の短冊の束：押すと自分の輪が1つ、尾の先に足される ---------- */
  /** 尾の先に輪を1つ足す（作り直さない）。節点は輪4個に1つ、先端の1つ手前に差し込む（掴んだ先端はそのまま） */
  const grow = (c: Chain, col: string) => {
    c.rings.push(col);
    const k = c.rings.length;
    const ns = c.nodes;
    if (ns.length === 1) ns.push(pt(ns[0].x, ns[0].y + P));
    else if (Math.ceil(k / PER_NODE) > ns.length - 1) {
      const a = ns[ns.length - 2];
      const b = ns[ns.length - 1];
      ns.splice(ns.length - 1, 0, pt((a.x + b.x) / 2, (a.y + b.y) / 2));
    }
    c.rest = (k * P) / (ns.length - 1);
  };
  const add = (count: number) => {
    const fresh = load();
    // ほかのタブで足した・外した分があれば、組み立て直してから足す
    if (fresh.n !== mine.n || fresh.hooks.length !== mine.hooks.length) {
      mine = fresh;
      rebuildMine();
    }
    let c = tail();
    if (!c) return;
    if (count > 8) {
      // まとめて足すとき（検分用）は、尾の先に寄せて差し込まず組み立て直す
      mine.n = Math.min(MINE_CAP, mine.n + count);
      save(mine);
      rebuildMine();
    } else {
      for (let i = 0; i < count; i++) {
        grow(c, mineColor(mine.n));
        mine.n++;
      }
      save(mine);
    }
    c = tail();
    const tip = tipOf(c);
    if (reduce) {
      if (c) {
        solve([c], 60);
        freeze([c]);
      }
    } else if (tip && !tip.pin) {
      // 足した先が少し揺れる
      tip.px = tip.x - P * 0.6;
      swing();
    }
    draw();
    paintStrip();
  };
  let curlTimer = 0;
  // 押し続けると輪がどんどん足される（長く押すほど速く）。押し続けたあとの click では足さない
  let holdTimer = 0;
  let holdFrom = 0;
  let held = false;
  const stopHold = () => {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
  };
  const holdStep = () => {
    held = true;
    const sec = (performance.now() - holdFrom) / 1000;
    add(sec < 2 ? 1 : sec < 4 ? 2 : 4);
    holdTimer = window.setTimeout(holdStep, 90);
  };
  const onStripsDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    held = false;
    holdFrom = performance.now();
    stopHold();
    holdTimer = window.setTimeout(holdStep, 380);
  };
  const onStrips = () => {
    if (held) {
      held = false;
      return;
    }
    add(1);
    strips.classList.remove("is-curl");
    void strips.offsetWidth;
    strips.classList.add("is-curl");
    window.clearTimeout(curlTimer);
    curlTimer = window.setTimeout(() => strips.classList.remove("is-curl"), 320);
  };

  /* ---------- 組み立て ---------- */
  sizeRoom();
  sizePage();
  readLight();
  rebuild();
  draw();
  paintStrip();
  // 前の版から引っ越した分を新しい形で残す
  if (mine.n) save(mine);

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (!inView) {
      // 画面の外に出た：いまの長さを計算し直して合わせる
      refresh();
    } else {
      if (readLight()) draw();
      kick();
    }
  });
  io.observe(section);
  // 区画の高さや幅が変わったら、ページ座標の点を置き直す（まとめて1回）
  let relayTimer = 0;
  const relayout = () => {
    window.clearTimeout(relayTimer);
    relayTimer = window.setTimeout(() => {
      if (grab) return relayout();
      const room = sizeRoom();
      if (room) rebuild();
      else rebuildMine();
      draw();
    }, 120);
  };
  const ro = new ResizeObserver(relayout);
  ro.observe(canvas);
  document.querySelectorAll<HTMLElement>(".kb-school").forEach((el) => ro.observe(el));
  const onResize = () => {
    barCache = -1;
    if (sizePage()) relayout();
    drawPage();
  };
  const onScroll = () => schedulePage();
  // 灯りの変化（--amb・--lit・--dark）を拾う
  const mo = world
    ? new MutationObserver(() => {
        if (readLight()) draw();
      })
    : null;
  if (world && mo) mo.observe(world, { attributes: true, attributeFilter: ["style", "data-scene"] });
  const onVisible = () => {
    refresh();
    if (!document.hidden) kick();
  };
  const patrol = window.setInterval(refresh, 15000);
  window.addEventListener(SCENE_EVENT, refresh);
  window.addEventListener(CLOCK_EVENT, refresh);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pointerdown", onDocDown, true);
  window.addEventListener("click", onClickCap, true);
  document.addEventListener("touchstart", onTouch, { passive: false });
  document.addEventListener("touchmove", onTouch, { passive: false });
  document.addEventListener("contextmenu", onMenu);
  section.addEventListener("pointerdown", onRoomDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  strips.addEventListener("click", onStrips);
  strips.addEventListener("pointerdown", onStripsDown);
  strips.addEventListener("pointerup", stopHold);
  strips.addEventListener("pointercancel", stopHold);
  strips.addEventListener("pointerleave", stopHold);

  type Probe = {
    target: number;
    shown: number;
    mine: string[];
    mineCount: number;
    hooks: { saved: Hook; x: number; y: number }[];
    savedHooks: Hook[];
    tip: { x: number; y: number } | null;
    raf: () => boolean;
    colors: (n: number) => string[];
    add: (n?: number) => number;
    clear: () => void;
  };
  const w = window as unknown as { __kbGarland?: Probe };
  if (debugAllowed())
    w.__kbGarland = {
      get target() {
        return target;
      },
      get shown() {
        return shown;
      },
      get mine() {
        return Array.from({ length: mine.n }, (_, j) => mineColor(j));
      },
      get mineCount() {
        return mine.n;
      },
      get hooks() {
        return active.map((h, i) => {
          const p = segs[i].nodes[segs[i].nodes.length - 1];
          return { saved: { ...h }, x: Math.round(p.x), y: Math.round(p.y) };
        });
      },
      get savedHooks() {
        return mine.hooks.map((h) => ({ ...h }));
      },
      get tip() {
        const p = tipOf(tail());
        return p ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
      },
      raf: () => rafId !== 0,
      colors: (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => ringColor(i)),
      add: (n = 1) => {
        add(Math.max(1, Math.floor(n)));
        return mine.n;
      },
      clear: () => {
        mine = empty();
        save(mine);
        rebuildMine();
        draw();
        paintStrip();
      },
    };

  return () => {
    gone = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (pageRaf) cancelAnimationFrame(pageRaf);
    rafId = 0;
    pageRaf = 0;
    endGrab();
    setCursor("");
    window.clearInterval(patrol);
    window.clearTimeout(curlTimer);
    window.clearTimeout(relayTimer);
    io.disconnect();
    ro.disconnect();
    mo?.disconnect();
    window.removeEventListener(SCENE_EVENT, refresh);
    window.removeEventListener(CLOCK_EVENT, refresh);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("click", onClickCap, true);
    document.removeEventListener("touchstart", onTouch);
    document.removeEventListener("touchmove", onTouch);
    document.removeEventListener("contextmenu", onMenu);
    section.removeEventListener("pointerdown", onRoomDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    strips.removeEventListener("click", onStrips);
    strips.removeEventListener("pointerdown", onStripsDown);
    strips.removeEventListener("pointerup", stopHold);
    strips.removeEventListener("pointercancel", stopHold);
    strips.removeEventListener("pointerleave", stopHold);
    stopHold();
    page.remove();
    if (debugAllowed()) delete w.__kbGarland;
  };
}
