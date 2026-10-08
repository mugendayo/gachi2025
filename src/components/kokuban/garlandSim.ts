// 輪飾りの鎖（遅延チャンク）。教室の後ろの天井のフックに、紙の輪の鎖を掛けて垂らす。
// 長さ：準備の時間だけ伸びる共有の輪（同じ時刻なら全員同じ）＋その端末で足した自分の輪。
// 共有の長さが変わるのは、教室の後ろが画面の外にある間だけ（見ている前では伸び縮みしない）。
// 自分の輪は、床の短冊の束を押すとすぐ鎖の先に足される（自分の操作なので、見ている前で増えてよい）。
// 鎖は掴んで揺らせる。揺れている間だけ rAF を回し、止まったら止める。文字も数も出さない。
import { site } from "@/data/site";
import { CLOCK_EVENT, now } from "@/lib/now";
import { ringColor, sharedTarget } from "@/lib/prep";
import { debugAllowed } from "@/lib/worldClock";
import { SCENE_EVENT } from "./Signboard";

type Pt = { x: number; y: number; px: number; py: number; pin: boolean };
/** 1本の鎖：節点（輪4個に1つ）と、そこに並ぶ輪の色。first＝列の中の最初の輪の番号（輪の向きの交互を揃える） */
type Chain = { nodes: Pt[]; rest: number; rings: string[]; first: number };
type Mine = { at: number; c: string };

const KEY = `gbf_${site.year}_garland_v1`;
const MINE_MAX = 24;
const STEP_MS = 16;
const ITER = 6;
const DAMP = 0.985;
/** 重力（1刻みあたりの px） */
const GRAVITY = 0.35;
/** 指へ寄せるバネ */
const SPRING = 0.25;
/** 輪4個に1節点 */
const PER_NODE = 4;
/** 止まったとみなす速さ（節点1つあたりの、1刻みの移動の2乗） */
const STILL_E = 0.01;
const STILL_STEPS = 15;
/** 離してからこの時間が過ぎても揺れていたら、少しずつ強く減衰させて静かに止める */
const CALM_AFTER_MS = 3000;
const CALM_DAMP = 0.94;
const HOOK_Y = 8;

export function start(section: HTMLElement, canvas: HTMLCanvasElement, strips: HTMLButtonElement, opt: { reduce: boolean }) {
  const reduce = opt.reduce;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const world = document.getElementById("kb-world");

  let W = 0;
  let H = 0;
  let dpr = 1;
  let P = 8;
  let chains: Chain[] = [];
  let target = sharedTarget(now());
  let shown = target;
  let mine = loadMine();
  let inView = false;
  let rafId = 0;
  let moving = false;
  let still = 0;
  let releasedAt = 0;
  let acc = 0;
  let last = 0;

  /* ---------- 自分の輪（その端末だけ） ---------- */
  function loadMine(): Mine[] {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((m) => m && Number.isFinite(m.at) && typeof m.c === "string" && /^#[0-9a-f]{6}$/i.test(m.c))
        .slice(-MINE_MAX)
        .map((m) => ({ at: Math.max(0, Math.floor(m.at)), c: m.c }));
    } catch {
      return [];
    }
  }
  const saveMine = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(mine));
    } catch {}
  };
  /** 次に束から取る紙の色 */
  const nextColor = () => ringColor(shown + mine.length);
  const paintStrip = () => strips.style.setProperty("--strip", nextColor());

  /** 鎖に並ぶ輪の色の列：共有の輪の間に、自分の輪を足した時の位置で差し込む（片付けで短くなった先の輪は外す） */
  const sequence = () => {
    const own = mine.filter((m) => m.at <= shown);
    const out: string[] = [];
    for (let j = 0; j <= shown; j++) {
      for (const m of own) if (m.at === j) out.push(m.c);
      if (j < shown) out.push(ringColor(j));
    }
    return out;
  };

  /* ---------- 部屋の明るさで色を暗くする ---------- */
  let amb = 1;
  let lit = 0;
  let dark = 0;
  let lightKey = "";
  const shade = new Map<string, string>();
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
    return true;
  };
  const tone = (hex: string) => {
    let c = shade.get(hex);
    if (c) return c;
    const n = parseInt(hex.slice(1), 16);
    const f = 0.35 + 0.65 * Math.min(1, Math.max(0, amb));
    let r = ((n >> 16) & 255) * f;
    let g = ((n >> 8) & 255) * f;
    let b = (n & 255) * f;
    if (lit >= 0.5) {
      // 蛍光灯の青白さ
      r += (0xdf - r) * 0.12;
      g += (0xe9 - g) * 0.12;
      b += (0xff - b) * 0.12;
    }
    const d = 0.5 * Math.min(1, Math.max(0, dark));
    r += (60 - r) * d;
    g += (70 - g) * d;
    b += (100 - b) * d;
    c = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    shade.set(hex, c);
    return c;
  };

  /* ---------- 鎖の組み立て ---------- */
  const pt = (x: number, y: number, pin = false): Pt => ({ x, y, px: x, py: y, pin });

  /** 2つのフックの間に、長さ L の鎖を放物線で垂らした初めの形（あとで物理で解いて静止形にする） */
  const drape = (x0: number, x1: number, k: number, first: number, rings: string[]): Chain => {
    const L = k * P;
    const m = Math.max(1, Math.ceil(k / PER_NODE));
    const S = x1 - x0;
    const SAMPLES = 64;
    const curve = (d: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        pts.push([x0 + S * t, HOOK_Y + 4 * d * t * (1 - t)]);
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
    const pts = curve(L > S ? lo : 0);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    const nodes: Pt[] = [];
    let j = 1;
    for (let i = 0; i <= m; i++) {
      const s = (total * i) / m;
      while (j < cum.length - 1 && cum[j] < s) j++;
      const f = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
      const x = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f;
      const y = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f;
      nodes.push(pt(x, y, i === 0 || i === m));
    }
    nodes[0].x = nodes[0].px = x0;
    nodes[m].x = nodes[m].px = x1;
    nodes[0].y = nodes[0].py = nodes[m].y = nodes[m].py = HOOK_Y;
    return { nodes, rest: L / m, rings, first };
  };

  /** フックから自由に垂れる尾（先端は掴める） */
  const hang = (x0: number, k: number, first: number, rings: string[]): Chain => {
    const m = Math.max(1, Math.ceil(k / PER_NODE));
    const rest = (k * P) / m;
    const nodes: Pt[] = [];
    for (let i = 0; i <= m; i++) nodes.push(pt(x0, HOOK_Y + rest * i, i === 0));
    return { nodes, rest, rings, first };
  };

  /** 輪の列を、スパン×層の順にフックへ掛けていく。最後の途中のスパンは尾にする */
  const build = () => {
    const seq = sequence();
    chains = [];
    P = Math.min(12, Math.max(6, W / 60));
    if (!seq.length || W <= 0) return;
    const nh = W < 700 ? 4 : 5;
    // 両端のフックは部屋の角（輪が半分に切れないよう、輪1つ分弱だけ内側）
    const inset = P * 0.8;
    const S = (W - 2 * inset) / (nh - 1);
    const hx = Array.from({ length: nh }, (_, i) => inset + S * i);
    let used = 0;
    for (let layer = 0; layer < 40 && used < seq.length; layer++) {
      const k = Math.max(2, Math.round((S * (1.15 + 0.38 * layer)) / P));
      for (let s = 0; s < nh - 1 && used < seq.length; s++) {
        const left = seq.length - used;
        if (left >= k) {
          chains.push(drape(hx[s], hx[s + 1], k, used, seq.slice(used, used + k)));
          used += k;
          continue;
        }
        // 途中のスパン＝左のフックから垂れる尾。
        // 尾が canvas の下に切れるほど長いときだけ、右のフックまで渡して残りを右から垂らす（伸びている先端を見えるところに置く）
        const drop = H - HOOK_Y - P * 1.2;
        const len = left * P;
        const span = Math.max(S * 1.05, len - drop);
        if (len > drop && span <= len - 2 * P) {
          const ka = Math.round(span / P);
          chains.push(drape(hx[s], hx[s + 1], ka, used, seq.slice(used, used + ka)));
          chains.push(hang(hx[s + 1], left - ka, used + ka, seq.slice(used + ka)));
        } else {
          chains.push(hang(hx[s], left, used, seq.slice(used)));
        }
        used = seq.length;
      }
    }
  };

  /* ---------- 物理（Verlet・16ms 固定刻み） ---------- */
  type Grab = { id: number; node: Pt; ox: number; oy: number; tx: number; ty: number; on: boolean; sx: number; sy: number; touch: boolean };
  let grab: Grab | null = null;

  const step = () => {
    let e = 0;
    let n = 0;
    const calm = !grab && releasedAt && performance.now() - releasedAt > CALM_AFTER_MS;
    const damp = calm ? CALM_DAMP : DAMP;
    for (const c of chains)
      for (const p of c.nodes) {
        if (p.pin) continue;
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + GRAVITY;
        e += vx * vx + vy * vy;
        n++;
      }
    if (grab?.on) {
      const g = grab;
      g.node.x += (g.tx + g.ox - g.node.x) * SPRING;
      g.node.y += (g.ty + g.oy - g.node.y) * SPRING;
    }
    for (let it = 0; it < ITER; it++)
      for (const c of chains) {
        const ns = c.nodes;
        for (let i = 1; i < ns.length; i++) {
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
    return n ? e / n : 0;
  };
  /** 速さを0にする（静止形のまま止める） */
  const freeze = () => {
    for (const c of chains)
      for (const p of c.nodes) {
        p.px = p.x;
        p.py = p.y;
      }
  };
  /** 同期で n 刻み解く（揺れ戻りは見せない） */
  const solve = (n: number) => {
    for (let i = 0; i < n; i++) step();
  };
  /** 作り直して、静止形まで解く */
  const rebuild = () => {
    // 古い鎖の節点を掴んだまま残さない
    grab = null;
    build();
    solve(120);
    freeze();
    moving = false;
    still = 0;
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
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const rx = P * 0.62;
    const ry = P * 0.8;
    // 横向きの輪（奇数番）を先に、正面の輪（偶数番）をその上に
    for (const odd of [1, 0])
      for (const c of chains) {
        const k = c.rings.length;
        const m = c.nodes.length - 1;
        for (let r = 0; r < k; r++) {
          if ((c.first + r) % 2 !== odd) continue;
          const q = at(c.nodes, ((r + 0.5) / k) * m);
          const col = tone(c.rings[r]);
          if (odd) {
            ctx.fillStyle = col;
            const cos = Math.cos(q.a);
            const sin = Math.sin(q.a);
            ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * q.x, dpr * q.y);
            ctx.fillRect(-P * 0.72, -P * 0.18, P * 1.44, P * 0.36);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          } else {
            ctx.strokeStyle = col;
            ctx.lineWidth = P * 0.32;
            ctx.beginPath();
            ctx.ellipse(q.x, q.y, rx, ry, q.a - Math.PI / 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
  };

  /* ---------- rAF は揺れている間だけ ---------- */
  const frame = (t: number) => {
    rafId = 0;
    if (!inView || document.hidden || reduce) return;
    acc += Math.min(64, Math.max(0, t - last));
    last = t;
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      const e = step();
      if (!grab?.on) {
        still = e < STILL_E ? still + 1 : 0;
        if (still >= STILL_STEPS) {
          moving = false;
          releasedAt = 0;
          freeze();
          break;
        }
      }
    }
    draw();
    if (grab?.on || moving) rafId = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (reduce || rafId || !inView || document.hidden || !(moving || grab?.on)) return;
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(frame);
  };

  /* ---------- 大きさ ---------- */
  const size = () => {
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

  /* ---------- 共有の長さの見回り ---------- */
  const apply = () => {
    shown = target;
    rebuild();
    draw();
    paintStrip();
  };
  const refresh = () => {
    target = sharedTarget(now());
    // 見ている前では伸び縮みさせない（画面の外にある間だけ合わせる）
    if (!inView && target !== shown) apply();
    else if (inView && readLight()) draw();
  };

  /* ---------- 掴む ---------- */
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  /** 指の近くの輪（見えている輪で判定）→ その鎖の、いちばん近い動ける節点 */
  const pick = (x: number, y: number, lim: number) => {
    let best: Pt | null = null;
    let bd = Infinity;
    for (const c of chains) {
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
  const begin = (e: PointerEvent) => {
    if (!grab) return;
    grab.on = true;
    try {
      section.setPointerCapture(e.pointerId);
    } catch {}
    moving = true;
    still = 0;
    releasedAt = 0;
    if (reduce) {
      solve(30);
      draw();
    } else kick();
  };
  const onDown = (e: PointerEvent) => {
    if (grab || !e.isPrimary || !chains.length) return;
    if ((e.target as Element | null)?.closest?.("button, a")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = local(e);
    const touch = e.pointerType === "touch";
    const node = pick(p.x, p.y, touch ? 28 : 22);
    if (!node) return;
    grab = { id: e.pointerId, node, ox: node.x - p.x, oy: node.y - p.y, tx: p.x, ty: p.y, on: false, sx: e.clientX, sy: e.clientY, touch };
    if (!touch) {
      e.preventDefault();
      begin(e);
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grab.id) return;
    const p = local(e);
    grab.tx = p.x;
    grab.ty = p.y;
    if (!grab.on) {
      // 指：横に動かしたときだけ掴む（縦はスクロールに任せる）
      const dx = Math.abs(e.clientX - grab.sx);
      const dy = Math.abs(e.clientY - grab.sy);
      if (Math.hypot(dx, dy) < 10) return;
      if (dx >= 2 * dy) begin(e);
      else grab = null;
      return;
    }
    if (reduce) {
      solve(30);
      draw();
    } else kick();
  };
  const onUp = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grab.id) return;
    const was = grab.on;
    grab = null;
    if (!was) return;
    if (reduce) {
      solve(120);
      freeze();
      moving = false;
      draw();
      return;
    }
    releasedAt = performance.now();
    moving = true;
    still = 0;
    kick();
  };

  /* ---------- 床の短冊の束：押すと自分の輪が1つ鎖の先に足される ---------- */
  let curlTimer = 0;
  const onStrips = () => {
    mine = loadMine();
    mine.push({ at: shown, c: nextColor() });
    while (mine.length > MINE_MAX) mine.shift();
    saveMine();
    rebuild();
    if (!reduce) {
      // 足した先が少し揺れる
      const tail = chains[chains.length - 1];
      const tip = tail?.nodes[tail.nodes.length - 1];
      if (tip && !tip.pin) {
        tip.px = tip.x - P * 0.6;
        // 離したときと同じく、しばらくしたら静かに止める
        releasedAt = performance.now();
        moving = true;
        kick();
      }
    }
    draw();
    paintStrip();
    strips.classList.remove("is-curl");
    void strips.offsetWidth;
    strips.classList.add("is-curl");
    window.clearTimeout(curlTimer);
    curlTimer = window.setTimeout(() => strips.classList.remove("is-curl"), 320);
  };

  /* ---------- 組み立て ---------- */
  size();
  readLight();
  rebuild();
  draw();
  paintStrip();

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
  const ro = new ResizeObserver(() => {
    if (!size()) return;
    rebuild();
    draw();
  });
  ro.observe(canvas);
  // 灯りの変化（--amb・--lit・--dark）を拾う。見えている間だけ描き直す
  const mo = world
    ? new MutationObserver(() => {
        if (inView && readLight()) draw();
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
  document.addEventListener("visibilitychange", onVisible);
  section.addEventListener("pointerdown", onDown);
  section.addEventListener("pointermove", onMove);
  section.addEventListener("pointerup", onUp);
  section.addEventListener("pointercancel", onUp);
  strips.addEventListener("click", onStrips);

  type Probe = { target: number; shown: number; mine: Mine[]; raf: () => boolean; colors: (n: number) => string[] };
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
        return mine.slice();
      },
      raf: () => rafId !== 0,
      colors: (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => ringColor(i)),
    };

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    window.clearInterval(patrol);
    window.clearTimeout(curlTimer);
    io.disconnect();
    ro.disconnect();
    mo?.disconnect();
    window.removeEventListener(SCENE_EVENT, refresh);
    window.removeEventListener(CLOCK_EVENT, refresh);
    document.removeEventListener("visibilitychange", onVisible);
    section.removeEventListener("pointerdown", onDown);
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerup", onUp);
    section.removeEventListener("pointercancel", onUp);
    strips.removeEventListener("click", onStrips);
    if (debugAllowed()) delete w.__kbGarland;
  };
}
