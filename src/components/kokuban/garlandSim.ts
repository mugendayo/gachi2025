// 輪飾りの鎖（遅延チャンク）。
// 共有の輪：教室の後ろの天井のフックに掛けて垂らす。準備の時間だけ伸びる（同じ時刻なら全員同じ長さ）。
//   長さが変わるのは、教室の後ろが画面の外にある間だけ（見ている前では伸び縮みしない）。天井の canvas に描く（テレビの裏を通る）。
// 自分の輪：共有の輪の続き。床の短冊の束を押すと1つ足される。数の上限はない。
//   まず共有の輪と同じ並べ方で天井のフックの間に渡していく（押すたびに天井の鎖が伸びる。渡している途中は先の数個が垂れる）。
//   右のフックの真下が手前の部品（テレビ）で隠れないスパンまで渡しきったら、その先はそのフックから尾として垂れる。
//   指で触る画面（幅 700px 未満か、指が主な端末）では、フックを端から離して並べ、いまのスパンを渡しきったらその右のフックから垂らす。
//   フックの真下に部品があるときは、天井の帯に収まらない長さになった所で、尾は部品の奥を通って下の端から出る（passAt）。
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
/** 天井の層の数（上の層ほど長く垂れる） */
const LAYERS = 40;
/** 天井へ渡している途中の鎖の、先の垂れている輪の数（ここが尾の先＝掴める） */
const LEAD = 5;
/** ページの左右の端からこの幅に入るとくっつく（マウス） */
const EDGE = 16;
/* 指で触る画面（幅 700px 未満か、指が主な端末）：画面の左右の端の約40px は端末の「戻る・進む」のスワイプが取る帯。
   掴む所（尾の先・天井のフック・くっついた点の当たり）はこの帯より内側に置く */
/** 天井のフックを端から離す幅（学校の幅に対する割合と、最小の px） */
const SAFE_RATIO = 0.13;
const SAFE_MIN = 48;
/** 指で引いたとき：端からこの幅まで持ってくればくっつく／くっついた点は端からこの幅に置く／
 *  掴んだ所が端に近いときは、一度この幅より内側へ出るまでくっつけない */
const EDGE_TOUCH = 40;
const PIN_TOUCH = 20;
const ARM_TOUCH = 44;
/** 尾の先・くっついた点の当たり判定の半径（指・マウス） */
const HIT_TOUCH = 36;
const HIT_MOUSE = 22;
/** 指で、尾の先からこの近さより外（HIT_TOUCH まで）を押したときは、最初の動きが縦ならページのスクロールに譲る
 *  （尾の先は親指でスクロールする辺りに垂れるので、広げた当たり判定で縦のスクロールを奪わない）。この近さの中は縦でも掴む */
const FIRM_TOUCH = 18;
/** 押せる部品の上に尾の先が描かれているとき、部品より尾の先を優先する近さ（指・マウス） */
const HIT_CORE_TOUCH = 14;
const HIT_CORE_MOUSE = 8;
/** 尾の先の最後の輪は、上の輪との継ぎ目を軸に少し傾いて下がる（rad）。ときどき小さく揺れる（間隔・長さ・振れ幅） */
const LOOSE = 0.42;
const WOB_EVERY = 7000;
const WOB_MS = 1800;
const WOB_AMP = 0.22;
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

/** opt.reduce＝端末の「動きを減らす」設定。輪飾りの揺れ・物理は小さな動きなので、その設定でも止めない（今は使わない） */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function start(section: HTMLElement, canvas: HTMLCanvasElement, strips: HTMLButtonElement, opt: { reduce: boolean }) {
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
  /** 尾の最初の輪の通しの番号（共有の輪から数えて。それより前は天井に渡してある）。尾の付け根（canvas の中の x） */
  let tailFirst = 0;
  let freeX = 0;
  /** 尾の付け根のフックの真下に手前の部品（テレビ）があり、尾がその奥を通って下から出ているときの、
   *  フックから部品の上の端の奥までの真っすぐな鎖（教室の後ろの canvas に描く＝部品の裏に隠れる）。出ていないときは null */
  let drop: Chain | null = null;
  /** 自分の輪が天井に入れる数と、いま天井に入っている数 */
  let ceilCap = 0;
  let ceilMine = 0;
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
    // 指で触る画面では、床に寝かせた尾の先も端のスワイプの帯へ入れない
    const gap = edgeSafe() ? SAFE_MIN : P;
    const lo = bd.l + gap;
    const hi = Math.max(lo, bd.r - gap);
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

  /** 指で触る画面か（幅 700px 未満か、指が主な端末）。端のスワイプの帯を避ける並べ方・くっつけ方にする */
  const coarse = typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)") : null;
  const edgeSafe = () => W < 700 || !!coarse?.matches;
  /** 天井のフックの位置と、i 番目のスパン（層ごとに左から右へ。上の層ほど長く垂れる）の左右のフックと輪の数 */
  const plan = () => {
    P = Math.min(P_MAX, Math.max(P_MIN, W / P_RATIO));
    const nh = W < 700 ? 4 : 5;
    // 両端のフックは部屋の角（輪が半分に切れないよう、輪1つ分弱だけ内側）。
    // 指で触る画面では、端から幅の 13%（最小 48px）内側の壁に留める（尾の先や渡している途中の先が端の帯に入らない）
    const inset = edgeSafe() ? Math.max(SAFE_MIN, W * SAFE_RATIO) : P * 0.8;
    const S = (W - 2 * inset) / (nh - 1);
    const hx = Array.from({ length: nh }, (_, i) => inset + S * i);
    const span = (i: number) => {
      const layer = Math.floor(i / (nh - 1));
      const s = i % (nh - 1);
      return { a: hx[s], b: hx[s + 1], k: Math.max(2, Math.round((S * (1.15 + 0.38 * layer)) / P)) };
    };
    return { hx, span, spans: (nh - 1) * LAYERS };
  };
  /** いまの天井の並べ方（buildRoom で決め直す） */
  let roomPlan: ReturnType<typeof plan> | null = null;
  /** 共有の輪に続けて自分の輪を、スパン×層の順に天井のフックへ渡していく。
   *  自分の輪が天井に入るのは、共有の輪が止まっているスパンから、右のフックが手前の部品（テレビ）に隠れないスパンの終わりまで
   *  （そこまで渡しきったら、その先は見えるフックから尾として垂れ、ページ全体へ引っ張っていける）。
   *  くっついた点があるときは、その点を作ったときに天井にあった数のまま（それより後の輪はくっついた点の先へ続く） */
  const buildRoom = () => {
    drapes = [];
    roomPlan = plan();
    const { span, spans } = roomPlan;
    const hid = hiddenTest();
    // 自分の輪が天井に入れる数（共有の輪が止まっているスパンの終わり。右のフックが隠れているなら次のスパンへ延ばす）
    let from = 0;
    let i = 0;
    while (i < spans && from + span(i).k <= shown) from += span(i++).k;
    let end = from;
    // 指で触る画面では、いまのスパンの終わりまで（右のフックが部品に隠れていても、尾はその奥を通って下から出る＝passAt）
    const safe = edgeSafe();
    for (; i < spans; i++) {
      const sp = span(i);
      end += sp.k;
      if (safe || !hid(sp.b)) break;
    }
    ceilCap = W <= 0 ? 0 : Math.max(0, end - shown);
    ceilMine = wantMine();
    const r = lay(shown + ceilMine, true);
    tailFirst = r.used;
    freeX = r.x;
  };
  /** 通しで N 輪を天井に渡したときの、天井に渡した数（それより後は尾）と尾の付け根（canvas の中の x）。make のときは鎖も作る */
  const lay = (N: number, make: boolean) => {
    if (!roomPlan) return { used: 0, x: 0 };
    const { hx, span, spans } = roomPlan;
    let used = 0;
    let x = hx[0];
    let lead = false;
    for (let j = 0; j < spans && used < N && W > 0; j++) {
      const { a, b, k } = span(j);
      const left = N - used;
      if (left >= k) {
        if (make) drapes.push(drape(a, HOOK_Y, b, HOOK_Y, k, used, colorsSeq(used, k)));
        used += k;
        x = b;
        continue;
      }
      // 途中のスパン：天井に沿って左のフックから右へ渡していく途中。渡した所の先から、最後の数個が垂れている
      // （押すたびに渡した所が右へ伸びる。渡した部分は同じ層の渡しきった鎖と同じたるみの割合）
      const t = Math.min(LEAD, left, k - left);
      const on = left - t;
      x = a + ((b - a) * on) / k;
      if (make && on > 0) drapes.push(drape(a, HOOK_Y, x, HOOK_Y, on, used, colorsSeq(used, on)));
      used += on;
      lead = true;
      break;
    }
    // 垂れている数個は短いので天井の帯の中に収まる。長い尾を垂らすときだけ、手前の部品に隠れないフックへ替える
    // （指で触る画面では替えない：隠れないフックは端の帯の中にしかなく、尾は部品の奥を通って下から出す）
    if (!lead && !edgeSafe()) x = openHook(hx, x);
    return { used, x };
  };
  /** 自分の輪のうち天井に入れる数。くっついた点があれば、そこへ届くいちばん手前の点を作ったときの数を超えない
   *  （届かない点＝画面の大きさや前の版の並べ方で作った点は buildMine でも使わないので、天井を止めない） */
  const wantMine = () => {
    const base = Math.min(mine.n, ceilCap);
    if (!roomPlan || W <= 0 || !mine.hooks.length) return base;
    const cb = canvas.getBoundingClientRect();
    const list = places();
    const bd = bounds();
    for (const h of mine.hooks) {
      const m = Math.min(base, h.n);
      const r = lay(shown + m, false);
      // buildMine と同じ見方：その点までの輪が2つ以上あり、鎖の長さで届くか
      const k = shown + h.n - r.used;
      if (k < 2 || h.n > mine.n) continue;
      const p = hookPos(h, list, bd);
      if (!p) continue;
      const px = cb.left + window.scrollX + r.x;
      if (Math.hypot(p.x - px, p.y - (cb.top + window.scrollY + HOOK_Y)) <= k * P * 1.15) return m;
      // 部品の奥を通って下から出た尾で作った点
      const ps = passAt(r.x);
      if (ps && k - ps.c >= 2 && Math.hypot(p.x - px, p.y - (cb.top + window.scrollY + ps.bottom)) <= (k - ps.c) * P * 1.15) return m;
    }
    return base;
  };
  /** 指で触る画面で、尾の付け根のフック（canvas の中の x）の真下に手前の部品（テレビ）があるとき：
   *  c＝フックから部品の上の端の少し奥までの輪の数（ここまでは天井の帯で見えている）／bottom＝部品の下の端の少し奥（canvas の中の y）。
   *  尾が c より長くなったら、そこから先は部品の奥を通って下の端から出す（奥の輪は見えないので数えない）。当てはまらなければ null */
  const passAt = (x: number) => {
    if (!edgeSafe() || W <= 0) return null;
    const cb = canvas.getBoundingClientRect();
    if (!cb.width) return null;
    let top = Infinity;
    let bottom = 0;
    section.querySelectorAll<HTMLElement>("[data-occlude]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.bottom <= cb.top + HOOK_Y || cb.left + x <= r.left - P || cb.left + x >= r.right + P) return;
      if (r.top - cb.top >= top) return;
      top = r.top - cb.top;
      // 出口は部品の下の端より輪1つ分奥（部品の四角の中は描かないので、最初の輪は下の端から半分のぞく）
      let b = r.bottom - P;
      // 部品のすぐ下に続く台（テレビ台の前板など・四角を抜かない）があれば、その下の端のすぐ下（最初の輪の上の端が台の下の端に揃う）
      const next = el.nextElementSibling;
      const nr = next instanceof HTMLElement && next.getAttribute("aria-hidden") ? next.getBoundingClientRect() : null;
      if (nr && nr.height > 0 && nr.height < 80 && Math.abs(nr.top - r.bottom) <= 6 && cb.left + x > nr.left && cb.left + x < nr.right)
        b = nr.bottom + P * 0.4;
      bottom = b - cb.top;
    });
    // 部品の上の端が教室の後ろの canvas の外なら、奥へ入る所を描けないので使わない
    if (!Number.isFinite(top) || top + P * 1.5 > H) return null;
    const c = Math.max(2, Math.round((top + P * 1.5 - HOOK_Y) / P));
    return { c, bottom };
  };
  /** ページ座標の点 x（canvas の中の x）から真下へ垂らすと、手前の部品（テレビ）の奥に隠れるか */
  const hiddenTest = () => {
    const cb = canvas.getBoundingClientRect();
    if (!cb.width) return () => false;
    const rs = occluders(false, section);
    return (h: number) => rs.some((r) => r.bottom > cb.top + HOOK_Y && cb.left + h > r.left - P && cb.left + h < r.right + P);
  };
  /** 尾を垂らすフックが、教室の後ろの手前の部品（テレビ）の真上なら、真上でないいちばん近いフックに替える。
   *  そのままだと尾が部品の奥に隠れ、床の短冊で足した輪も見えず、尾の先も掴めない（両端のフックは部品の外） */
  const openHook = (hx: number[], x: number) => {
    const hidden = hiddenTest();
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
  /** 通しの q 番目の輪の色（共有の輪の続きに自分の輪） */
  const seqColor = (q: number) => (q < shown ? ringColor(q) : mineColor(q - shown));
  const colorsSeq = (from: number, k: number) => Array.from({ length: k }, (_, i) => seqColor(from + i));

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
    // 指で触る画面では、端に作った点（前の作り方）も端から PIN_TOUCH の所に置く
    const g = edgeSafe() ? PIN_TOUCH : P * 0.5;
    const x = Math.min(bd.r - g, Math.max(bd.l + g, bd.l + h.fx * bd.w));
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
    drop = null;
    if (W <= 0) return;
    // 床＝学校の部品の一番下（フッターや門の外の上に積もると掴めなくなる）
    const schools = [...document.querySelectorAll<HTMLElement>(".kb-school")].filter((el) => el.offsetParent !== null || el.getClientRects().length);
    const last = schools.length ? schools[schools.length - 1].getBoundingClientRect() : null;
    floorY = (last && last.height ? last.bottom + window.scrollY : document.documentElement.scrollHeight) - P * 0.6;
    const wb = bounds();
    wallL = wb.l + P * 0.5;
    wallR = Math.max(wallL, wb.r - P * 0.5);
    const cb = canvas.getBoundingClientRect();
    const topX = cb.left + window.scrollX + freeX;
    const topY = cb.top + window.scrollY + HOOK_Y;
    let ax = topX;
    let ay = topY;
    // 尾の輪：通しの番号 tailFirst から最後の自分の輪まで（q＝尾の中の番号）
    const R = shown + mine.n - tailFirst;
    const color = (q: number) => seqColor(tailFirst + q);
    const list = places();
    const bd = bounds();
    let from = 0;
    // 尾の付け根の真下に手前の部品があるとき（指で触る画面）：最初の c 輪はフックから部品の奥へ真っすぐ垂れ、その先は部品の下の端から出る
    const ps = passAt(freeX);
    const lowY = ps ? cb.top + window.scrollY + ps.bottom : 0;
    const under = () => {
      if (!ps) return;
      drop = drape(freeX, HOOK_Y, freeX, HOOK_Y + ps.c * P, ps.c, tailFirst, Array.from({ length: ps.c }, (_, q) => color(q)));
      ax = topX;
      ay = lowY;
      from = ps.c;
    };
    for (const h of mine.hooks) {
      const idx = shown + h.n - tailFirst;
      if (idx > R) continue;
      const p = hookPos(h, list, bd);
      // 最初の点が、部品の下の端から出た尾で作った点なら、そこから数える
      if (p && ps && !drop && !segs.length && idx - ps.c >= 2 && Math.hypot(p.x - topX, p.y - lowY) <= (idx - ps.c) * P * 1.15) under();
      const k = idx - from;
      if (k < 2) continue;
      // くっつけるときは鎖をぴんと張っているので、距離はちょうど鎖の長さになる。少しの伸びまでは許す。
      // それより遠い点（画面の大きさや共有の長さが変わって届かなくなった点）は、いまは使わない（保存は残す）
      if (!p || Math.hypot(p.x - ax, p.y - ay) > k * P * 1.15) continue;
      const d = drape(
        ax,
        ay,
        p.x,
        p.y,
        k,
        tailFirst + from,
        Array.from({ length: k }, (_, q) => color(from + q)),
      );
      d.pg = true;
      segs.push(d);
      active.push(h);
      ax = p.x;
      ay = p.y;
      from = idx;
    }
    // くっついた点が無く、尾が天井の帯に収まらない長さなら、部品の奥を通して下から出す
    if (ps && !drop && !segs.length && R > ps.c) under();
    segs.push(hang(ax, ay, R - from, tailFirst + from, Array.from({ length: R - from }, (_, q) => color(from + q))));
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
        /** 尾の先から少し離れた所を指で押した：最初の動きを見るまで仮に掴んでいる（縦ならスクロールに譲って離す） */
        soft: boolean;
        sx: number;
        sy: number;
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
      n.x += (grab.tx - n.x) * FOLLOW;
      n.y += (grab.ty - n.y) * FOLLOW;
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
  /** 作り直す前に、古い鎖の節点への掴みを離す。くっつけた・外した直後の「離すまで」の印（done）は節点を持たないので残す
   *  （残さないと、長押しで外して天井ごと作り直したとき、指を離したあとのクリックが下の部品へ届き、指のスクロールも止まらない） */
  const dropGrab = () => {
    if (grab?.kind !== "done") endGrab();
  };
  /** 作り直して、静止形まで解く */
  const rebuild = () => {
    // 古い鎖の節点を掴んだまま残さない
    dropGrab();
    buildRoom();
    buildMine();
    const list = all();
    solve(list, 120);
    freeze(list);
    moving = false;
    still = 0;
  };
  /** 自分の側だけ作り直す（天井に入る自分の輪の数が変わるときは、天井ごと作り直す） */
  const rebuildMine = () => {
    if (wantMine() !== ceilMine) return rebuild();
    dropGrab();
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
  /** 尾の先の最後の輪の、いまの揺れ（rad・揺れていないときは0） */
  let wob = 0;
  /** 鎖の輪を描く。ox・oy＝座標のずらし。view＝この縦の範囲に入る輪だけ描く（null＝全部）。
   *  loose＝この鎖の最後の輪（自由な尾の先）を、上の輪との継ぎ目を軸に少し傾けて描く */
  const paint = (
    c2: CanvasRenderingContext2D,
    d: number,
    list: Chain[],
    ox: number,
    oy: number,
    view: [number, number] | null,
    loose: Chain | null = null,
  ) => {
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
          let x = q.x - ox;
          let y = q.y - oy;
          let a = q.a;
          if (c === loose && r === k - 1 && k >= 2) {
            // 上の輪との継ぎ目（輪の上の端・鎖の向きに半輪ぶん手前）を軸に回す＝少しほどけかけて下がって見える
            const hh = P * 0.85;
            const jx = x - Math.cos(a) * hh;
            const jy = y - Math.sin(a) * hh;
            a += LOOSE + wob;
            x = jx + Math.cos(a) * hh;
            y = jy + Math.sin(a) * hh;
          }
          const col = tone(c.rings[r]);
          const art = useArt ? ringArt(col) : null;
          if (art) {
            // 絵の縦を鎖の向きに合わせて回す（回す角＝鎖の向き − 90°）
            const cos = Math.sin(a);
            const sin = -Math.cos(a);
            c2.setTransform(d * cos, d * sin, -d * sin, d * cos, d * x, d * y);
            if (odd) c2.drawImage(art[1], -fw.s / 2, -fh.s / 2, fw.s, fh.s);
            else c2.drawImage(art[0], -fw.f / 2, -fh.f / 2, fw.f, fh.f);
            drew = true;
          } else if (odd) {
            c2.fillStyle = col;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            c2.setTransform(d * cos, d * sin, -d * sin, d * cos, d * x, d * y);
            c2.fillRect(-P * 0.72, -P * 0.15, P * 1.44, P * 0.3);
            c2.setTransform(d, 0, 0, d, 0, 0);
          } else {
            c2.strokeStyle = col;
            c2.lineWidth = P * 0.26;
            c2.beginPath();
            c2.ellipse(x, y, rx, ry, a - Math.PI / 2, 0, Math.PI * 2);
            c2.stroke();
          }
        }
      }
    if (drew) c2.setTransform(d, 0, 0, d, 0, 0);
  };
  const drawRoom = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    paint(ctx, dpr, drop ? drapes.concat(drop) : drapes, 0, 0, null);
  };
  const pdpr = () => Math.min(2, window.devicePixelRatio || 1);
  let pd = 1;
  const drawPage = () => {
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    pctx.clearRect(0, 0, VW, VH);
    const sx = window.scrollX;
    const sy = window.scrollY;
    paint(pctx, pd, segs, sx, sy, [sy, sy + VH], tail() || null);
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
    if (grab?.kind === "tip") return true;
    if (grab?.kind === "room" && grab.on) return true;
    return moving;
  };
  const frame = (t: number) => {
    rafId = 0;
    if (document.hidden) return;
    const v = scrollSpeed();
    if (v) {
      window.scrollBy(0, v);
      aimTip();
    }
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
    draw();
    if (needFrame()) rafId = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (rafId || !needFrame()) return;
    stopWob();
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
    releasedAt = performance.now();
    moving = true;
    still = 0;
    kick();
  };
  /* 尾の先の最後の輪：WOB_EVERY ごとに、止まっていて画面に入っていれば WOB_MS だけ小さく揺れる（描き直すだけ。物理は回さない）。
     rAF はその間だけ */
  let wobRaf = 0;
  let wobFrom = 0;
  const stopWob = () => {
    if (wobRaf) cancelAnimationFrame(wobRaf);
    wobRaf = 0;
    wob = 0;
  };
  const wobTick = (t: number) => {
    wobRaf = 0;
    const e = (t - wobFrom) / WOB_MS;
    if (e >= 1 || grab || rafId || document.hidden) {
      wob = 0;
      if (!rafId) drawPage();
      return;
    }
    // ふくらんでしぼむ包みの中で、ゆっくり1往復半
    wob = WOB_AMP * Math.sin(Math.PI * e) * Math.sin(3 * Math.PI * e);
    drawPage();
    wobRaf = requestAnimationFrame(wobTick);
  };
  const wobble = (force = false) => {
    if (wobRaf || rafId || grab || document.hidden) return false;
    const c = tail();
    const tip = tipOf(c);
    if (!tip || tip.pin || !c || c.rings.length < 2) return false;
    const sx = window.scrollX;
    const sy = window.scrollY;
    if (!force && (tip.y < sy || tip.y > sy + VH || tip.x < sx || tip.x > sx + VW)) return false;
    wobFrom = performance.now();
    wobRaf = requestAnimationFrame(wobTick);
    return true;
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
    kick();
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

  /** ページの端でくっつく決まり：catchIn＝端からこの幅に入るとくっつく／pin＝くっついた点を端から置く幅／
   *  arm＝掴んだ所が端に近いときは、一度この幅より内側へ出るまでくっつけない。指は端のスワイプの帯を避ける */
  const edgeRule = (touch: boolean) =>
    touch
      ? { catchIn: EDGE_TOUCH, pin: PIN_TOUCH, arm: ARM_TOUCH }
      : // 指で触る画面の並べ方のときは、マウスでも点は端から PIN_TOUCH に置く（hookPos が読み込み直しで置き直す位置と揃える）
        { catchIn: EDGE, pin: edgeSafe() ? PIN_TOUCH : P * 0.5, arm: EDGE * 2.5 };
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
    const er = edgeRule(g.touch);
    if (x > bd.l + er.arm) g.armL = true;
    if (x < bd.r - er.arm) g.armR = true;
    if ((g.armL && x <= bd.l + er.catchIn) || (g.armR && x >= bd.r - er.catchIn)) attach(x <= bd.l + er.catchIn ? bd.l + er.pin : bd.r - er.pin, y);
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
    swing();
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
    // いちばん手前の点を外して、天井にまだ渡せる輪が出てきたときは、天井ごと作り直す（その先は垂れる）
    if (wantMine() !== ceilMine) {
      rebuild();
      draw();
      swing();
      return;
    }
    // くっついた点が無くなって尾が天井の帯に収まらない長さになったら、部品の奥を通して下から出し直す
    const ps = passAt(freeX);
    if (ps && !drop && !active.length && rings.length > ps.c) {
      rebuildMine();
      draw();
      swing();
      return;
    }
    swing();
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
  /** ページ座標の点が、手前の部品（[data-occlude]）の四角の中か（そこでは鎖は描かれていない） */
  const behindPart = (p: Pt) => {
    const cx = p.x - window.scrollX;
    const cy = p.y - window.scrollY;
    return occluders(false).some((r) => cx > r.left && cx < r.right && cy > r.top && cy < r.bottom);
  };
  /** 押した所で、指の縦の動きがページのスクロールになるか（touch-action が縦を許しているか。黒板など自分で指を扱う所は false） */
  const panY = (t: EventTarget | null) => {
    for (let el = t as Element | null; el && el !== document.documentElement; el = el.parentElement) {
      const ta = getComputedStyle(el).touchAction;
      if (ta !== "auto" && ta !== "manipulation" && !ta.includes("pan-y")) return false;
    }
    return true;
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
    if (!onPage(e.target)) return;
    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    const touch = e.pointerType === "touch";
    const lim = touch ? HIT_TOUCH : HIT_MOUSE;
    const tip = tipOf(tail());
    const dt = tip ? Math.hypot(tip.x - x, tip.y - y) : Infinity;
    const ctl = isControl(e.target);
    // 手前の部品（テレビ）の上を押した
    const onPart = !!(e.target as Element | null)?.closest?.("[data-occlude]");
    // テレビの操作（音量のつまみ・チャンネル・電源）は、尾の先より常に優先する
    if (ctl && onPart) return;
    // 尾の先が手前の部品の奥に隠れている（そこでは鎖は描かれていない）
    const hidden = !!tip && behindPart(tip);
    // 押せる部品（床のもちもの・短冊の箱など）の上では掴まない。ただし尾の先がその部品の上に描かれていて、
    // 尾の先の輪そのものを押したとき（指 HIT_CORE_TOUCH・マウス HIT_CORE_MOUSE 以内）だけは尾の先を掴む
    if (ctl && !(tip && dt <= (touch ? HIT_CORE_TOUCH : HIT_CORE_MOUSE) && !hidden)) return;
    const nh = ctl ? { hook: null, d: lim } : nearHook(x, y, lim);
    // 部品の上を押したときは、その奥に隠れた尾の先は掴まない（見えない鎖を引き出さない。部品の外に見えている所を押せば掴める）
    if (tip && dt <= lim && !(onPart && hidden) && (!nh.hook || dt <= nh.d)) {
      // 尾の先を掴んだ：この操作はほかの部品へ渡さない（黒板などが同時に反応しない）
      e.stopPropagation();
      if (!touch) e.preventDefault();
      // 埋め込みの動画などの上へ動かしても、動きと「離した」を受け取り続ける
      try {
        document.documentElement.setPointerCapture(e.pointerId);
      } catch {}
      const bd = bounds();
      const er = edgeRule(touch);
      stopWob();
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
        armL: tip.x > bd.l + er.arm,
        armR: tip.x < bd.r - er.arm,
        touch,
        soft: touch && dt > FIRM_TOUCH && panY(e.target),
        sx: e.clientX,
        sy: e.clientY,
      };
      moving = true;
      still = 0;
      releasedAt = 0;
      setCursor("grabbing");
      kick();
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
      // 仮に掴んでいる間は、向きが決まる（onTouch）まで尾の先を動かさない
      if (grab.soft) return;
      grab.cx = e.clientX;
      grab.cy = e.clientY;
      aimTip();
      if (grab?.kind !== "tip") return;
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
      kick();
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
  /** 離したあと：揺らして止める */
  const finish = (g: Grab | undefined) => {
    if (!g || g.kind === "hold" || g.kind === "done") return;
    if (g.kind === "room" && !g.on) return;
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
  // 仮に掴んでいるとき（尾の先から少し離れた所を押した）は、押した瞬間は止めず、最初の動きで決める：
  // 縦が勝てば離してスクロールに譲る／横か斜めなら掴んだままスクロールを止める
  const onTouch = (e: TouchEvent) => {
    if (grab?.kind === "tip" && grab.soft) {
      if (e.type !== "touchmove") return;
      const t = e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - grab.sx);
      const dy = Math.abs(t.clientY - grab.sy);
      if (dy > dx * 1.2) {
        endGrab();
        return;
      }
      grab.soft = false;
      grab.cx = t.clientX;
      grab.cy = t.clientY;
      aimTip();
      kick();
    }
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
    // onDocDown と同じ見方：テレビの操作の上と、テレビの奥に隠れた尾の先では手の形にしない
    const part = !!(e.target as Element | null)?.closest?.("[data-occlude]");
    if (part && isControl(e.target)) return setCursor("");
    const tipOn = !!tip && Math.hypot(tip.x - x, tip.y - y) <= HIT_MOUSE && !(part && behindPart(tip));
    const on = tipOn || nearHook(x, y, HIT_MOUSE).hook;
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
  /** count 輪足すと、尾が天井の帯に収まらなくなり、部品の奥を通って下から出る形に変わるか */
  const crossing = (c: Chain, count: number) => {
    if (drop || active.length) return false;
    const ps = passAt(freeX);
    return !!ps && c.rings.length <= ps.c && c.rings.length + count > ps.c;
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
    // 足したあとに天井に入る自分の輪の数が変わるか（天井に渡している途中か）
    const prev = mine.n;
    mine.n = Math.min(MINE_CAP, mine.n + count);
    const reroom = wantMine() !== ceilMine;
    mine.n = prev;
    if (reroom) {
      // 天井に渡している途中：天井ごと作り直す（渡した所が右へ伸びる。渡しきった分は尾へ）
      mine.n = Math.min(MINE_CAP, mine.n + count);
      save(mine);
      rebuild();
    } else if (count > 8 || crossing(c, count)) {
      // まとめて足すとき（検分用）と、尾が天井の帯からあふれて部品の奥へ入るときは、尾の先に寄せて差し込まず組み立て直す
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
    if (tip && !tip.pin) {
      // 足した先が少し揺れる（指で触る画面では、内側へ向けて小さく＝揺れても端の帯へ出ない）
      if (edgeSafe()) {
        const bd = bounds();
        tip.px = tip.x + (tip.x > (bd.l + bd.r) / 2 ? P : -P) * 0.3;
      } else tip.px = tip.x - P * 0.6;
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
  const wobTimer = window.setInterval(wobble, WOB_EVERY);
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
    /** 天井の鎖の輪の数（共有＋天井に入った自分の輪。渡している途中の先の垂れている数個も含む） */
    ceiling: number;
    /** 自分の輪が天井に入っている数と、入れる数 */
    ceilingMine: number;
    ceilingCap: number;
    hooks: { saved: Hook; x: number; y: number }[];
    savedHooks: Hook[];
    tip: { x: number; y: number } | null;
    raf: () => boolean;
    /** 並べ方：指で触る画面の並べ方か・天井のフックの x（画面の座標）・尾の付け根の x・尾が部品の奥を通って下から出ているか
     *  （出ているなら、フックから奥へ入る輪の数と、下から出る所の y）・当たり判定の半径（firm＝指でこの近さの中は縦に動かしても掴む）・端でくっつく決まり */
    layout: {
      edgeSafe: boolean;
      hooksX: number[];
      tailX: number;
      under: { rings: number; y: number } | null;
      hit: { touch: number; mouse: number; firm: number };
      edge: { touch: { catchIn: number; pin: number; arm: number }; mouse: { catchIn: number; pin: number; arm: number } };
    };
    /** 尾の先の最後の輪をいま1回揺らす（揺らせたら true） */
    wobble: () => boolean;
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
      get ceiling() {
        return shown + ceilMine;
      },
      get ceilingMine() {
        return ceilMine;
      },
      get ceilingCap() {
        return ceilCap;
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
      raf: () => rafId !== 0 || wobRaf !== 0,
      get layout() {
        const cb = canvas.getBoundingClientRect();
        return {
          edgeSafe: edgeSafe(),
          hooksX: (roomPlan?.hx || []).map((h) => Math.round(cb.left + h)),
          tailX: Math.round(cb.left + freeX),
          under: drop && segs[0] ? { rings: drop.rings.length, y: Math.round(segs[0].nodes[0].y) } : null,
          hit: { touch: HIT_TOUCH, mouse: HIT_MOUSE, firm: FIRM_TOUCH },
          edge: { touch: edgeRule(true), mouse: edgeRule(false) },
        };
      },
      wobble: () => wobble(true),
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
    window.clearInterval(wobTimer);
    stopWob();
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
