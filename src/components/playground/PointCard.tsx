"use client";
// 生徒指導ポイントカード：机の上に少し斜めに置かれた白いカード。
// 押すと赤い判子が上から押され、次の空いた丸が埋まる。30個埋まったら、次に押すと新しいカードがその上に置かれる。
// 押した跡はその端末に残る。window の "kb:point" を受けても1つ押される。
// 判子の跡のずれ・傾き・かすれは、その端末の通しの回数と、押した分（1分刻み）の時刻から決める（同じなら同じ跡）。
// 動きは判子が上下する間だけ（Web Animations）。カードの上だけの小さな動きなので、動きを減らす設定でも判子を押す・新しいカードを置く動きは止めない。
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { pointCard } from "@/data/playgroundItems";
import { site } from "@/data/site";
import { now } from "@/lib/now";
import { debugAllowed } from "@/lib/worldClock";
import "./pointCard.css";

export const POINT_EVENT = "kb:point";

const SAVE_KEY = `gbf_${site.year}_pointcard_v1`;
/** 保存の形：cards＝埋め終えて下に重ねたカードの枚数／cur＝いまのカードの跡（種）／prev＝すぐ下のカードの跡 */
type Saved = { v: 1; cards: number; cur: number[]; prev: number[] };
const empty = (): Saved => ({ v: 1, cards: 0, cur: [], prev: [] });

const SLOTS = Math.max(1, Math.floor(pointCard.slots));
const COLS = 10;

/* ---------- カードの寸法（カードの幅を1とした割合。art の絵もこの位置に丸を置く） ---------- */
/** 名刺の縦横比（91mm × 55mm） */
const ASPECT = 55 / 91;
const COL_X0 = 0.075;
const COL_X1 = 0.925;
/** 丸の段の中心（カードの高さに対する割合） */
const ROW_Y = [0.555, 0.72, 0.885];
const DOT_R = 0.031;
const INK_R = 0.041;

const slotAt = (i: number) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const x = COL_X0 + ((COL_X1 - COL_X0) * c) / (COLS - 1);
  const y = (ROW_Y[r] ?? ROW_Y[ROW_Y.length - 1] + (r - ROW_Y.length + 1) * 0.165) * ASPECT;
  return { x, y };
};

/* ---------- card.webp（900×494）を当てたときの寸法：絵に描いてある丸の中心（px）を測った値 ---------- */
const ART_W = 900;
const ART_H = 494;
const ART_DOTS: [number, number][] = [
  [77, 234], [160, 234], [242.5, 233.5], [325.5, 233.5], [408, 233], [490.5, 233], [573.5, 233], [656, 233], [738.5, 233], [821.5, 233],
  [76.5, 321.5], [159.5, 321], [242, 321], [325, 321], [407.5, 320.5], [490.5, 320.5], [573.5, 320.5], [656, 320], [739.5, 320], [822.5, 320],
  [75, 410.5], [158, 410.5], [241, 410.5], [325, 410.5], [407.5, 410.5], [491, 410], [574.5, 409.5], [657, 409.5], [741, 409.5], [824, 409.5],
];

/** 跡の置き方：aspect＝高さ/幅・slot＝i 番目の丸の中心（幅を1とした値）・inkR＝跡の半径・jit/tilt＝ずれと傾きの幅・emblem＝校章の丸 */
type Geo = {
  aspect: number;
  ratio: string;
  slot: (i: number) => { x: number; y: number };
  inkR: number;
  inkRSmall: number;
  jit: number;
  tilt: number;
  emblem: { x: number; y: number; r: number } | null;
};
const BASE_GEO: Geo = { aspect: ASPECT, ratio: "91 / 55", slot: slotAt, inkR: INK_R, inkRSmall: INK_R, jit: 0.45, tilt: 0.5, emblem: null };
/** 絵の丸は外径 約75px・内径 約69px。跡は内側にほぼ収まる大きさ（小さく出るときは丸の外径の内側いっぱいまで） */
const ART_GEO: Geo = {
  aspect: ART_H / ART_W,
  ratio: `${ART_W} / ${ART_H}`,
  slot: (i) => {
    const d = ART_DOTS[i];
    return d ? { x: d[0] / ART_W, y: d[1] / ART_W } : slotAt(i);
  },
  inkR: 35 / ART_W,
  inkRSmall: 36 / ART_W,
  jit: 0.18,
  tilt: 0.3,
  emblem: { x: 103 / ART_W, y: 96.5 / ART_W, r: 54 / ART_W },
};
/** この幅（CSS px）より小さいカードでは、跡を丸いっぱいにしてかすれを付けない */
const SMALL_W = 170;

/* ---------- 種と乱数 ---------- */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** 1つの跡のずれ方（種から。判子の落ちる位置と跡を同じにする） */
const jitter = (seed: number, g: Geo) => {
  const R = rng(seed);
  return {
    dx: (R() - 0.5) * g.jit * g.inkR,
    dy: (R() - 0.5) * g.jit * g.inkR,
    rot: (R() - 0.5) * g.tilt,
    scale: 0.95 + R() * 0.09,
    ink: 0.84 + R() * 0.14,
    weak: R() * Math.PI * 2,
    R,
  };
};

/* ---------- 保存（その端末だけ） ---------- */
const seeds = (a: unknown, max: number) =>
  Array.isArray(a) ? a.filter((n) => Number.isFinite(n)).map((n) => Math.floor(n) >>> 0).slice(0, max) : [];
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && raw.v === 1) {
      return {
        v: 1,
        cards: Number.isFinite(raw.cards) ? Math.max(0, Math.min(100000, Math.floor(raw.cards))) : 0,
        cur: seeds(raw.cur, SLOTS),
        prev: seeds(raw.prev, SLOTS),
      };
    }
  } catch {}
  return empty();
}
function save(s: Saved) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {}
}

/* ---------- 跡を描く ---------- */
const INK = "#b5172b";
let scratch: HTMLCanvasElement | null = null;

/** かすれ：押す力の弱い側ほど、朱肉の乗らない小さな抜けが多い */
function scuff(o: CanvasRenderingContext2D, n: number, r: number, j: ReturnType<typeof jitter>, count: number) {
  o.save();
  o.globalCompositeOperation = "destination-out";
  const R = j.R;
  for (let k = 0; k < count; k++) {
    const a = j.weak + (R() - 0.5) * (R() < 0.8 ? 1.3 : 6.28);
    const d = r * (0.45 + R() * 0.6);
    const s = r * (0.02 + R() * 0.06);
    o.globalAlpha = 0.5 + R() * 0.5;
    o.beginPath();
    o.ellipse(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, s * 1.6, s, a, 0, Math.PI * 2);
    o.fill();
  }
  o.restore();
}

/** 判子の絵（stamp）で押した跡。種ごとにわずかに傾き・ずれ・濃さが変わる */
function drawStamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, seed: number, g: Geo, img: HTMLImageElement, small: boolean) {
  const j = jitter(seed, g);
  const r = (small ? g.inkRSmall : g.inkR) * w * j.scale;
  const ih = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
  const n = Math.ceil(r * 2.4) + 2;
  if (!scratch) scratch = document.createElement("canvas");
  scratch.width = n;
  scratch.height = n;
  const o = scratch.getContext("2d");
  if (!o) return;
  o.clearRect(0, 0, n, n);
  o.save();
  o.translate(n / 2, n / 2);
  o.rotate(j.rot);
  o.drawImage(img, -r, -r * ih, r * 2, r * 2 * ih);
  o.restore();
  if (!small) scuff(o, n, r, j, 14);
  ctx.save();
  ctx.globalAlpha = small ? Math.max(0.94, j.ink) : j.ink;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(scratch, cx + j.dx * w - n / 2, cy + j.dy * w - n / 2);
  ctx.restore();
}

/** 校章の丸の中：判子と同じ模様を薄い灰色で */
function drawEmblem(ctx: CanvasRenderingContext2D, W: number, e: NonNullable<Geo["emblem"]>, img: HTMLImageElement) {
  const r = e.r * W;
  const ih = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
  const n = Math.ceil(r * 2) + 2;
  if (!scratch) scratch = document.createElement("canvas");
  scratch.width = n;
  scratch.height = n;
  const o = scratch.getContext("2d");
  if (!o) return;
  o.clearRect(0, 0, n, n);
  o.drawImage(img, n / 2 - r, n / 2 - r * ih, r * 2, r * 2 * ih);
  o.globalCompositeOperation = "source-in";
  o.fillStyle = "#6f747b";
  o.fillRect(0, 0, n, n);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(scratch, e.x * W - n / 2, e.y * W - n / 2);
  ctx.restore();
}

/** 判子の跡（校章風の丸い印・文字なし）。朱肉のにじみと、押す力の弱い側のかすれ。ずれは判子の落ちる位置と同じ g から */
function drawInk(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, seed: number, g: Geo) {
  const j = jitter(seed, g);
  const r = g.inkR * w * j.scale;
  const n = Math.ceil(r * 2.6);
  if (!scratch) scratch = document.createElement("canvas");
  scratch.width = n;
  scratch.height = n;
  const o = scratch.getContext("2d");
  if (!o) return;
  o.clearRect(0, 0, n, n);
  o.save();
  o.translate(n / 2, n / 2);
  o.rotate(j.rot);
  o.fillStyle = INK;
  o.strokeStyle = INK;
  o.shadowColor = "rgba(181,23,43,0.4)";
  o.shadowBlur = Math.max(0.6, r * 0.14);
  // 外の太い輪と内の細い輪
  o.lineWidth = r * 0.17;
  o.beginPath();
  o.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  o.stroke();
  o.lineWidth = Math.max(0.6, r * 0.06);
  o.beginPath();
  o.arc(0, 0, r * 0.67, 0, Math.PI * 2);
  o.stroke();
  // 五つの花びら（先に切れ込み）と真ん中の点
  for (let k = 0; k < 5; k++) {
    o.save();
    o.rotate((k * Math.PI * 2) / 5);
    o.beginPath();
    o.ellipse(0, -r * 0.33, r * 0.15, r * 0.24, 0, 0, Math.PI * 2);
    o.fill();
    o.restore();
  }
  o.shadowBlur = 0;
  o.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
    o.beginPath();
    o.arc(Math.cos(a) * r * 0.57, Math.sin(a) * r * 0.57, r * 0.06, 0, Math.PI * 2);
    o.fill();
  }
  o.beginPath();
  o.arc(0, 0, r * 0.1, 0, Math.PI * 2);
  o.fill();
  o.restore();
  scuff(o, n, r, j, 26);
  ctx.save();
  ctx.globalAlpha = j.ink;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(scratch, cx + j.dx * w - n / 2, cy + j.dy * w - n / 2);
  ctx.restore();
}

/** ink：判子の絵（読み込み済み）／null＝絵なしで描く／undefined＝絵を読み込み中（跡はまだ描かない） */
function drawFace(cv: HTMLCanvasElement, w: number, marks: number[], dots: boolean, g: Geo, ink: HTMLImageElement | null | undefined) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = Math.round(w * dpr);
  const H = Math.round(w * g.aspect * dpr);
  if (cv.width !== W || cv.height !== H) {
    cv.width = W;
    cv.height = H;
  }
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  if (dots) {
    ctx.fillStyle = "#cdcdc9";
    ctx.strokeStyle = "rgba(90,90,88,0.35)";
    ctx.lineWidth = Math.max(0.5, W * 0.0025);
    for (let i = 0; i < SLOTS; i++) {
      const p = g.slot(i);
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * W, DOT_R * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (ink === undefined) return;
  if (ink && g.emblem) drawEmblem(ctx, W, g.emblem, ink);
  const small = w < SMALL_W;
  marks.forEach((seed, i) => {
    const p = g.slot(i);
    if (ink) drawStamp(ctx, p.x * W, p.y * W, W, seed, g, ink, small);
    else drawInk(ctx, p.x * W, p.y * W, W, seed, g);
  });
}

/** 判子の絵を読む（同じ絵は1回だけ）。null＝絵なし・読めなかった／undefined＝読み込み中 */
const stampCache = new Map<string, HTMLImageElement | null>();
function useStampImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null | undefined>(src ? undefined : null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const c = stampCache.get(src);
    if (c !== undefined) {
      setImg(c);
      return;
    }
    setImg(undefined);
    let live = true;
    const im = new Image();
    im.decoding = "async";
    im.onload = () => {
      stampCache.set(src, im);
      if (live) setImg(im);
    };
    im.onerror = () => {
      stampCache.set(src, null);
      if (live) setImg(null);
    };
    im.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  return img;
}

/* ---------- カードの面 ---------- */
function Emblem() {
  return (
    <svg className="pc-emblem" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="45" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle r="35" fill="none" stroke="currentColor" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((k) => (
        <ellipse key={k} cx="0" cy="-15" rx="7" ry="11" fill="currentColor" transform={`rotate(${k * 72})`} />
      ))}
      <circle r="4" fill="#f3f0e8" />
    </svg>
  );
}

function Face({ marks, art, geo, ink }: { marks: number[]; art?: string; geo: Geo; ink: HTMLImageElement | null | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (cv.current && w > 0) drawFace(cv.current, w, marks, !art, geo, ink);
  }, [w, marks, art, geo, ink]);
  const [school, title] = pointCard.title.split(/\s+/);
  return (
    <span ref={ref} className={`pc-face${art ? " has-art" : ""}`} style={art ? { backgroundImage: `url(${JSON.stringify(art)})` } : undefined}>
      <span className="pc-head">
        {!art && <Emblem />}
        <span className="pc-title">
          <span className="pc-school">{school}</span>
          <span className="pc-name">{title ?? ""}</span>
        </span>
      </span>
      <span className="pc-line">
        <span>組</span>
        <span className="pc-blank pc-blank-s" />
        <span>名前</span>
        <span className="pc-blank pc-blank-l" />
      </span>
      <canvas ref={cv} className="pc-ink" aria-hidden="true" />
    </span>
  );
}

/* ---------- 本体 ---------- */
/** art＝カードの絵（card.webp）・stamp＝判子の跡の絵（stamp.webp・art があるときだけ使う）。art がなければ CSS と canvas で描く */
export default function PointCard({ art, stamp }: { art?: string; stamp?: string }) {
  const geo = art ? ART_GEO : BASE_GEO;
  const ink = useStampImage(art ? stamp : undefined);
  const [saved, setSaved] = useState<Saved>(empty);
  /** いまのカードで見えている跡の数（判子が下りきった所で増える） */
  const [shown, setShown] = useState(0);
  /** 新しいカードを置いた直後（置く動きを付ける） */
  const [placed, setPlaced] = useState(false);
  const savedRef = useRef<Saved>(saved);
  const curRef = useRef<HTMLSpanElement>(null);
  const hankoRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const pending = useRef<{ timer: number; anims: Animation[]; show: number } | null>(null);

  useEffect(() => {
    const s = load();
    savedRef.current = s;
    setSaved(s);
    setShown(s.cur.length);
  }, []);

  const commit = useCallback((s: Saved) => {
    savedRef.current = s;
    save(s);
    setSaved(s);
  }, []);

  /** 前の判子の動きが残っていたら、跡だけ出して終わらせる */
  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    clearTimeout(p.timer);
    p.anims.forEach((a) => a.cancel());
    setShown(p.show);
  }, []);

  const press = useCallback((fromEvent = false) => {
    flush();
    let s = savedRef.current;
    let fresh = false;
    if (s.cur.length >= SLOTS) {
      // 埋まったカードを下へずらして、新しいカードを上に置く
      s = { v: 1, cards: s.cards + 1, cur: [], prev: s.cur };
      commit(s);
      setShown(0);
      setPlaced(true);
      if (!fromEvent) return;
      fresh = true;
    }
    const total = s.cards * SLOTS + s.cur.length;
    const seed = hash(`${total}:${Math.floor(now() / 60000)}`);
    const idx = s.cur.length;
    commit({ ...s, cur: [...s.cur, seed] });
    const target = idx + 1;
    const hanko = hankoRef.current;
    const shadow = shadowRef.current;
    const card = curRef.current;
    // 新しいカードを置いた同じ回は、判子を動かさずに跡だけ（判子の要素は置き換わる前のカードのもの）
    if (fresh || !hanko || !shadow || !card || typeof hanko.animate !== "function") {
      setShown(target);
      return;
    }
    const p = geo.slot(idx);
    const j = jitter(seed, geo);
    const left = `${(p.x + j.dx) * 100}%`;
    const top = `${((p.y + j.dy) / geo.aspect) * 100}%`;
    for (const el of [hanko, shadow]) {
      el.style.left = left;
      el.style.top = top;
    }
    const rot = `${(j.rot * 180) / Math.PI}deg`;
    // 判子はカードの面より手前（z が正）に置く（面と同じ深さだと面の奥に隠れる）
    const at = (z: number, sc = 1) => `translate(-50%, -50%) translateZ(${z}px) rotate(${rot}) scale(${sc})`;
    const DUR = 520;
    const HIT = 0.42;
    const anims = [
      hanko.animate(
        [
          { transform: at(70), opacity: 0, easing: "ease-out" },
          { transform: at(64), opacity: 1, offset: 0.12, easing: "cubic-bezier(.5,0,1,.6)" },
          { transform: at(2), opacity: 1, offset: HIT },
          { transform: at(1, 1.06), opacity: 1, offset: 0.5 },
          { transform: at(2), opacity: 1, offset: 0.6, easing: "cubic-bezier(.2,.6,.4,1)" },
          { transform: at(56), opacity: 0 },
        ],
        { duration: DUR },
      ),
      shadow.animate(
        [
          { transform: "translate(-50%, -50%) scale(2.2)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 0.5, offset: HIT },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 0.5, offset: 0.6 },
          { transform: "translate(-50%, -50%) scale(2)", opacity: 0 },
        ],
        { duration: DUR },
      ),
      card.animate(
        [
          { transform: "translateZ(0) scale(1)" },
          { transform: "translateZ(0) scale(1)", offset: HIT },
          { transform: "translateZ(-3px) scale(0.985)", offset: 0.5 },
          { transform: "translateZ(0) scale(1)", offset: 0.75 },
          { transform: "translateZ(0) scale(1)" },
        ],
        // 置かれる途中（CSS の動き）に押しても、置く動きを打ち消さずに重ねる
        { duration: DUR, composite: "add" },
      ),
    ];
    const timer = window.setTimeout(() => {
      if (pending.current?.timer === timer) {
        setShown(target);
        pending.current.show = target;
      }
    }, DUR * HIT);
    pending.current = { timer, anims, show: target };
    anims[0].finished.then(
      () => {
        if (pending.current?.timer === timer) pending.current = null;
      },
      () => {},
    );
  }, [commit, flush, geo]);

  // window の POINT_EVENT でも1つ押される
  useEffect(() => {
    const on = () => press(true);
    window.addEventListener(POINT_EVENT, on);
    return () => window.removeEventListener(POINT_EVENT, on);
  }, [press]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );

  // 検分用（手元と Preview だけ）：window.__kbCard.stamp()・count()（いまのカードの跡の数）・state()・reset()
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbCard?: unknown };
    w.__kbCard = {
      stamp: () => press(true),
      count: () => savedRef.current.cur.length,
      state: () => ({ ...savedRef.current, slots: SLOTS, key: SAVE_KEY }),
      fill: (n = SLOTS - 1) => {
        flush();
        const s = savedRef.current;
        const cur = [...s.cur];
        while (cur.length < Math.min(SLOTS, n)) cur.push(hash(`${s.cards * SLOTS + cur.length}:${Math.floor(now() / 60000)}`));
        commit({ ...s, cur });
        setShown(cur.length);
      },
      reset: () => {
        flush();
        commit(empty());
        setShown(0);
        setPlaced(false);
      },
    };
    return () => {
      delete w.__kbCard;
    };
  }, [press, commit, flush]);

  const cur = useMemo(() => saved.cur.slice(0, shown), [saved.cur, shown]);
  const under = Math.min(2, saved.cards);
  /** いちばん下のカード（埋め終えたもの）の跡：保存はしないので、枚数から決める */
  const oldMarks = useMemo(() => Array.from({ length: SLOTS }, (_, i) => hash(`old:${saved.cards}:${i}`)), [saved.cards]);
  return (
    <button
      type="button"
      className={`pc-root${art ? " has-art" : ""}`}
      aria-label={pointCard.title}
      style={art ? ({ "--pc-ratio": geo.ratio } as CSSProperties) : undefined}
      onClick={() => press(false)}
    >
      <span className="pc-plane">
        {under >= 2 && (
          <span className="pc-card pc-old" aria-hidden="true">
            {art && <Face marks={oldMarks} art={art} geo={geo} ink={ink} />}
          </span>
        )}
        {under >= 1 && (
          <span key={`p${saved.cards}`} className={`pc-card pc-prev${placed ? " is-shifted" : ""}`} aria-hidden="true">
            <Face marks={saved.prev} art={art} geo={geo} ink={ink} />
          </span>
        )}
        <span
          key={`c${saved.cards}`}
          ref={curRef}
          className={`pc-card pc-cur${placed ? " is-placed" : ""}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setPlaced(false);
          }}
        >
          <Face marks={cur} art={art} geo={geo} ink={ink} />
          <span ref={shadowRef} className="pc-hanko-shadow" aria-hidden="true" />
          <span ref={hankoRef} className="pc-hanko" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
