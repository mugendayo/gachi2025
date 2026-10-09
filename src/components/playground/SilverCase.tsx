"use client";
// 銀のアタッシュケース：机の上に置かれた、角ばったアルミのケース（留め金2つ・持ち手・中央に3桁のダイヤル錠）。
// ダイヤルは各桁を上下にドラッグ（押すと1つ進む）して回す。3桁が合うと留め金が跳ね上がり、ふたが奥へ開く。
// 番号は黒板の「文化祭まであと◯日！」の日数を3桁にしたもの（0以下は 000）。番号は画面に出さない。
// 中身（silverCase.content）が sweets なら、紙ナプキンを敷いてドーナツ4つとシュークリーム1つがぞんざいに詰めてある（絵のときだけ）。
//   ドーナツを押すと机の上へ飛び出し、車輪のように転がって、ふらついてパタッと倒れる。机の上のドーナツを押すと、
//   ケースが開いていればケースの中の元の場所へ放り戻す（何度でも転がして遊べる）／閉じていればその場で跳ねる。
//   シュークリームを押すと上から押しつぶされ、クリームがはじけ飛んでケースの内側や机にぺちゃっと付く。つぶれたものを押すと新しいのが出てくる。
// 中身が coins なら、スポンジのくぼみに五円玉。押すと崩れて机の上へ転がり出る。机の上で動くものはどれも caseSim（canvas）が描く。
// ふたは押すと閉じる（ダイヤルはそのまま）。開けた状態は保存しない。端末に残すのは開けた回数だけ（乱数の種）。
// 動きを減らす設定でも、回す・開く・転がる・つぶれる・飛び散るはそのまま動かす（どれも机の上のケースだけの小さな動きなので止めない）。
// 形は CSS の 3D で描く（寸法は cqw＝ケースの幅に対する割合）。触れる所は上に重ねた見えない四角（.sc-hit-*）。
// 絵（art・artOpen）があれば絵を使う：閉じた絵の錠の窓に数字の輪を重ね、開いたら上から見た絵に替えて、中身を置く（位置は開いた絵の px）。
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { site } from "@/data/site";
import { silverCase } from "@/data/playgroundItems";
import { clockConfig, clockCore, debugAllowed } from "@/lib/worldClock";
import { now } from "@/lib/now";
import { createCaseSim, imageOf, seedOf, rng, type CaseSim, type CreamDrop } from "./caseSim";
import "./silverCase.css";

const KEY = `gbf_${site.year}_case_v1`;
/** ケースの寸法（cqw）：幅・奥行き・下の箱の高さ・ふたの高さ・壁の厚み */
const W = 82;
const D = 54;
const HB = 15;
const HL = 9;
const T = 2.2;
/** ふたの開く角度 */
const OPEN_DEG = 104;
/** 五円玉の山（床の中心からの位置 cqw と枚数） */
const STACKS = [
  { x: -24, z: -10, n: 4 },
  { x: -13.5, z: -5, n: 3 },
  { x: -3, z: -11, n: 1 },
];
const COIN = 8.4;
const COIN_TH = 0.75;
/** 絵のとき（開いた絵を上から見た）：五円玉の山はスポンジの四角いくぼみ（.sc-apit）の中。x・y はくぼみの幅・高さに対する %（中心）、枚数は STACKS と同じ */
const PIT_STACKS = [
  { x: 22.8, y: 45, n: 4 },
  { x: 57.1, y: 34, n: 3 },
  { x: 77.2, y: 73, n: 1 },
];
/** 開いた絵（case-open.webp）の大きさ（px） */
const ART_OPEN_W = 619;
/** 中身がシュークリームとドーナツのとき（絵のときだけ）：開いた絵の下の段に、紙ナプキンを敷いてドーナツ4つとシュークリーム1つを
 *  ぞんざいに詰める（きっちり並べず、少し重なって傾いている）。x・y＝中心・w＝幅（開いた絵の px）・rot＝傾き（度）・
 *  sy＝縦の縮み（隣に乗り上げて傾いている分）。後のものほど上に重なる。ドーナツの絵は sweets.donuts の同じ番目 */
type Spot = { x: number; y: number; w: number; rot: number; sy?: number };
const NAPKIN: Spot = { x: 296, y: 540, w: 350, rot: -13 };
const DONUT_SLOTS: Spot[] = [
  { x: 120, y: 476, w: 164, rot: 16 },
  { x: 254, y: 462, w: 150, rot: -8 },
  { x: 400, y: 458, w: 164, rot: 34, sy: 0.92 },
  { x: 214, y: 602, w: 160, rot: -24, sy: 0.88 },
];
const PUFF_SLOT: Spot = { x: 456, y: 592, w: 186, rot: 6 };
/** つぶれた絵は横に広がって背が低い（下の端をそろえる） */
const PUFF_SQUASHED: Spot = { x: 456, y: 598, w: 197, rot: 6 };
/** クリームが付く所（開いた絵の px。クリームの大きさの分、スポンジの端から内へ寄せる）：ふたの内側・下の段 */
const CREAM_LID = { x0: 74, y0: 68, x1: 545, y1: 294 };
const CREAM_LOW = { x0: 74, y0: 420, x1: 545, y1: 650 };
/** シュークリームを押してから、つぶれた絵に替わってクリームが飛ぶまで（ms。silverCase.css の sc-puff-squash と同じ長さ） */
const SQUASH_MS = 120;
/** ドラッグ：1目盛りあたりの px（ケースの幅に対する割合）・動いたとみなす距離・押しただけとみなす時間 */
const CELL_RATIO = 0.1;
const MOVE_TOUCH = 6;
const MOVE_MOUSE = 3;
const TAP_MAX_MS = 700;
const SNAP_MS = 170;
/** ホイールに見える数字の段（中央±2） */
const ROWS = [-2, -1, 0, 1, 2];

type Saved = { v: 1; n: number };

const loadSaved = (): Saved => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.v === 1 && Number.isFinite(raw.n))
      return { v: 1, n: Math.max(0, Math.min(1e6, Math.floor(raw.n))) };
  } catch {}
  return { v: 1, n: 0 };
};
const save = (s: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};

/** 今日の番号（黒板の残り日数を3桁に。0以下・会期後は 000） */
export const caseCode = () => {
  const s = clockCore(now(), clockConfig);
  const n =
    s.phase === "after" || s.daysLeft <= 0 ? 0 : Math.min(999, s.daysLeft);
  return String(n).padStart(3, "0");
};

const mod10 = (v: number) => ((Math.round(v) % 10) + 10) % 10;
/** 回している途中も、目盛りの所で少し引っかかる（カチッとした手ざわり） */
const detent = (v: number) => {
  const b = Math.floor(v);
  const f = v - b;
  return b + (f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f));
};
const easeOutBack = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** 面：中心を原点に置いてから transform で組む（寸法は cqw） */
const face = (w: number, h: number, tf: string): React.CSSProperties => ({
  width: `${w}cqw`,
  height: `${h}cqw`,
  marginLeft: `${-w / 2}cqw`,
  marginTop: `${-h / 2}cqw`,
  transform: tf,
});
const t3 = (x: number, y: number, z: number) =>
  `translate3d(${x}cqw,${y}cqw,${z}cqw)`;

/** 開いた絵の px の位置と大きさ（silverCase.css の --x・--y・--w・--rot・--sy） */
const spotVars = (s: Spot) =>
  ({
    "--x": s.x,
    "--y": s.y,
    "--w": s.w,
    "--rot": `${s.rot}deg`,
    "--sy": s.sy ?? 1,
  }) as React.CSSProperties;
/** 読めなかった絵は隠す（壊れた絵の印を出さない） */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};
/** 読めた絵は出す（シュークリームは同じ img の src をつぶれた絵へ替えるので、前の絵が読めずに隠したままにならないように） */
const showLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "";
};
/** 端末が動きを減らす設定か（検分の state で見るだけ。ケースの動きはこれで変えない） */
const reducedMotion = () =>
  !new URLSearchParams(location.search).has("motion") &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 中身の絵（silverCase.content が sweets のとき）。透過 WebP・寸法は public/playground/sizes.json */
export type CaseSweets = {
  /** 下に敷く紙ナプキン */
  napkin: string;
  /** ドーナツ（ケースの中の並び＝DONUT_SLOTS の順）。puffy＝ふっくら丸い（寝ても平たくならない） */
  donuts: { src: string; puffy?: boolean }[];
  /** シュークリームまるごと */
  puff: string;
  /** 押しつぶされて、カスタードと生クリームがはみ出たシュークリーム */
  puffSquash: string;
  /** はじけ飛ぶクリームのしずく（1粒ずつ） */
  creams: string[];
};
type PuffState = { k: number; st: "whole" | "squash" | "squashed" };
/** 中身のどれか：ドーナツの番号か、シュークリーム */
type Sweet = number | "puff";

type Props = {
  /** 閉じたケースの絵（空なら CSS で描く）。絵のときは触れる所を --sc-* の変数で絵に合わせる */
  art?: string;
  /** 開いたケースの絵（無ければ閉じた絵のまま） */
  artOpen?: string;
  /** 中身の絵（silverCase.content が sweets のとき。開いた絵もあるときだけ使う） */
  sweets?: CaseSweets;
};

export default function SilverCase({ art = "", artOpen = "", sweets }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const coinRefs = useRef<(HTMLElement | null)[]>([]);
  const hitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artOpenRef = useRef<HTMLDivElement | null>(null);
  const donutRefs = useRef<(HTMLImageElement | null)[]>([]);
  const puffRef = useRef<HTMLImageElement | null>(null);
  const deskHitRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const simRef = useRef<CaseSim | null>(null);
  const savedRef = useRef<Saved>({ v: 1, n: 0 });
  /** canvas の左上（ケースに対する px）。机の上のドーナツの触れる丸を置くのに使う */
  const canvasOff = useRef({ left: 0, top: 0 });
  /** ダイヤルの値（連続値・整数で止まる）とアニメーション */
  const dial = useRef<number[]>([0, 0, 0]);
  const anim = useRef<({ from: number; to: number; t0: number } | null)[]>([
    null,
    null,
    null,
  ]);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  const puffTimer = useRef(0);
  const splashN = useRef(0);
  const [open, setOpen] = useState(false);
  const [latched, setLatched] = useState(true);
  const [rattle, setRattle] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(
    silverCase.content === "coins" ? STACKS.reduce((a, s) => a + s.n, 0) : 0,
  );
  const sweetsOn =
    silverCase.content === "sweets" &&
    !!art &&
    !!artOpen &&
    !!sweets &&
    sweets.donuts.length > 0;
  /** 中身の絵は手元で描いてから出す（読めなかったときに onError で確実に隠せるように） */
  const [sweetsReady, setSweetsReady] = useState(false);
  /** 机の上に出ているドーナツ（ケースの中の絵は隠す） */
  const [out, setOutState] = useState<boolean[]>(() =>
    DONUT_SLOTS.map(() => false),
  );
  const [puff, setPuffState] = useState<PuffState>({ k: 0, st: "whole" });
  /** 今の様子（描画を待たずに読む正本。描画のたびに上書きしない＝開く途中の 0.26 秒も open として扱う） */
  const stateRef = useRef({ open, latched, coinsLeft });
  /** 中身の今の様子（同じく描画を待たずに読む正本） */
  const sweetRef = useRef<{ out: boolean[]; puff: PuffState }>({
    out: DONUT_SLOTS.map(() => false),
    puff: { k: 0, st: "whole" },
  });
  /** 開いた絵が見えているか（stateRef.open と違い、開く途中の 0.26 秒は false） */
  const openShownRef = useRef(false);
  const drag = useRef<{
    i: number;
    id: number;
    y: number;
    x: number;
    v: number;
    t: number;
    moved: boolean;
    cell: number;
  } | null>(null);

  const later = (fn: () => void, ms: number) => {
    if (ms <= 0) return fn();
    timers.current.push(window.setTimeout(fn, ms));
  };
  /** 開く・閉じるの途中の予約を捨てる（閉じてすぐ開け直したとき、閉じた側の「留め金を戻す」が後から効かないように） */
  const clearTimers = () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.length = 0;
  };

  /** ホイールの数字を書き換える（React を通さない） */
  const paint = useCallback((i: number) => {
    const el = wheelRefs.current[i];
    const v = dial.current[i];
    const shown = anim.current[i] ? v : detent(v);
    if (el) {
      const base = Math.floor(shown);
      const frac = shown - base;
      const kids = el.children;
      for (let k = 0; k < ROWS.length; k++) {
        const row = ROWS[k];
        const a = ((row - frac) * 36 * Math.PI) / 180;
        const s = kids[k] as HTMLElement | undefined;
        if (!s) continue;
        s.textContent = String((((base + row) % 10) + 10) % 10);
        s.style.transform = `translateY(${(Math.sin(a) * 100).toFixed(1)}%) scaleY(${Math.max(0, Math.cos(a)).toFixed(3)})`;
        s.style.opacity = Math.max(0, Math.cos(a)).toFixed(3);
      }
    }
    const hit = hitRefs.current[i];
    if (hit) hit.setAttribute("aria-valuenow", String(mod10(v)));
  }, []);

  const current = () => dial.current.map(mod10).join("");
  const settled = () =>
    !drag.current &&
    anim.current.every((a) => !a) &&
    dial.current.every((v) => Math.abs(v - Math.round(v)) < 1e-6);

  /** 留め金を外してふたを開ける（開けた回数を1つ足す） */
  const openNow = useCallback(() => {
    clearTimers();
    setLatched(false);
    stateRef.current = { ...stateRef.current, latched: false, open: true };
    savedRef.current = { v: 1, n: savedRef.current.n + 1 };
    save(savedRef.current);
    later(() => setOpen(true), 260);
  }, []);

  /** 合っていれば開ける */
  const check = useCallback(() => {
    if (!settled() || stateRef.current.open) return;
    if (current() !== caseCode()) return;
    openNow();
  }, [openNow]);

  const tick = useCallback(
    (t: number) => {
      rafRef.current = 0;
      let busy = false;
      let done = false;
      for (let i = 0; i < 3; i++) {
        const a = anim.current[i];
        if (!a) continue;
        const p = Math.min(1, (t - a.t0) / SNAP_MS);
        dial.current[i] = a.from + (a.to - a.from) * easeOutBack(p);
        if (p >= 1) {
          dial.current[i] = ((a.to % 10) + 10) % 10;
          anim.current[i] = null;
          done = true;
        } else busy = true;
        paint(i);
      }
      if (busy) rafRef.current = requestAnimationFrame(tick);
      if (done) check();
    },
    [paint, check],
  );

  /** i 桁目を to へ回して止める（to は連続値のまま・止まったら 0〜9 に畳む） */
  const turnTo = useCallback(
    (i: number, to: number) => {
      anim.current[i] = {
        from: dial.current[i],
        to: Math.round(to),
        t0: performance.now(),
      };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  // はじめ：開けた回数を読む。ダイヤルの数字は、その端末の回数とその分の時刻を種にした乱数（今日の番号とは重ねない）
  useEffect(() => {
    savedRef.current = loadSaved();
    const rand = rng(
      seedOf(savedRef.current.n, Math.floor(now() / 60000)) ^ 0x5ca1ab1e,
    );
    const d = [0, 1, 2].map(() => Math.floor(rand() * 10));
    if (d.join("") === caseCode()) d[2] = (d[2] + 3) % 10;
    dial.current = d;
    for (let i = 0; i < 3; i++) paint(i);
    const ts = timers.current;
    return () => {
      ts.forEach((id) => clearTimeout(id));
      window.clearTimeout(puffTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [paint]);

  // 中身の絵は手元で描く（hydrate より先に読み込みが失敗しても onError を取りこぼさない。閉じている間は見えないので後から出してよい）。
  // つぶれた絵とクリームは先に読んでおく（押した瞬間に替わる・飛ぶ）
  useEffect(() => {
    if (!sweetsOn || !sweets) return;
    [sweets.puffSquash, ...sweets.creams].forEach(imageOf);
    setSweetsReady(true);
  }, [sweetsOn, sweets]);

  // 開いた絵が見えた・隠れた：ケースの内側に付いたクリームも一緒に見え隠れする
  useEffect(() => {
    openShownRef.current = open;
    simRef.current?.setOpen(open);
  }, [open]);

  // 机の大きさ（机の上の canvas）：机の天板＝このケースの下の端。机の幅は窓際の机（.pg-top）全体
  const deskBox = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return null;
    const rr = root.getBoundingClientRect();
    const desk =
      (
        root.closest(".pg-top") as HTMLElement | null
      )?.getBoundingClientRect() ?? rr;
    const left = desk.left - rr.left;
    const top = Math.min(desk.top, rr.top) - rr.top;
    const h = Math.max(desk.bottom, rr.bottom + 12) - rr.top - top;
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    canvas.style.width = `${desk.width}px`;
    canvas.style.height = `${h}px`;
    canvasOff.current = { left, top };
    const s = rr.width / 125;
    const deskTop = rr.bottom - rr.top - top;
    return {
      box: {
        w: desk.width,
        h,
        top: deskTop,
        unit: s,
        minFloor: 1 * s,
        maxFloor: Math.min(h - deskTop - 2, 9 * s),
        caseX: rr.left - desk.left,
        caseW: rr.width,
        caseH: rr.height,
      },
      ox: rr.left - desk.left,
      oy: rr.top - (rr.top + top) - deskTop,
    };
  }, []);

  /** 机の上のドーナツの触れる丸を、今の位置へ動かす（描くたびに・React を通さない）。見た目より大きく、指で押せる 44px 以上。
   *  宙にある間（飛び出した直後・戻る途中）は出さない＝ケースの中の物を続けて押したとき、上を飛んでいるドーナツが横取りしない */
  const placeDeskHits = useCallback(() => {
    const sim = simRef.current;
    deskHitRefs.current.forEach((el, i) => {
      if (!el) return;
      const p = sim?.donutAt(i);
      if (!p || p.phase === "home" || p.phase === "air") {
        el.style.visibility = "hidden";
        return;
      }
      const s = Math.max(44, p.w * 1.15, p.h * 1.3);
      el.style.visibility = "";
      el.style.width = `${s.toFixed(1)}px`;
      el.style.height = `${s.toFixed(1)}px`;
      el.style.transform = `translate(${(p.x + canvasOff.current.left - s / 2).toFixed(1)}px, ${(p.y + canvasOff.current.top - s / 2).toFixed(1)}px)`;
    });
  }, []);

  const setOut = useCallback((i: number, v: boolean) => {
    const next = sweetRef.current.out.slice();
    next[i] = v;
    sweetRef.current = { ...sweetRef.current, out: next };
    setOutState(next);
  }, []);
  const setPuff = useCallback((p: PuffState) => {
    sweetRef.current = { ...sweetRef.current, puff: p };
    setPuffState(p);
  }, []);

  /** ドーナツがケースの中へ戻り終わった：canvas から消えたのと同じコマで、ケースの中の絵を出す */
  const backHome = useCallback(
    (i: number) => {
      flushSync(() => setOut(i, false));
    },
    [setOut],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => {
      const b = simRef.current && deskBox();
      if (b && simRef.current) simRef.current.layout(b.box);
    });
    ro.observe(root);
    // PC ではケースの幅が上限で止まっても机の幅は変わるので、机も見る
    const desk = root.closest(".pg-top");
    if (desk) ro.observe(desk);
    return () => {
      ro.disconnect();
      simRef.current?.destroy();
      simRef.current = null;
    };
  }, [deskBox]);

  /** 机の上の canvas の動き（初めて使うときに作る）。机の大きさも今に合わせる */
  const ensureSim = useCallback(() => {
    const canvas = canvasRef.current;
    const b = deskBox();
    if (!canvas || !b) return null;
    if (!simRef.current) {
      simRef.current = createCaseSim(canvas, {
        seed: seedOf(savedRef.current.n, Math.floor(now() / 60000)) ^ 0x5eed,
        onFrame: placeDeskHits,
        onHome: backHome,
      });
      simRef.current.setOpen(openShownRef.current);
    }
    simRef.current.layout(b.box);
    return b;
  }, [deskBox, placeDeskHits, backHome]);

  /** ケースの中の置き場所（机の座標）：開いた絵の px から測る（ドーナツが机の上に出ていて絵が隠れていても測れる） */
  const slotPose = useCallback((s: Spot, ox: number) => {
    const root = rootRef.current;
    const art = artOpenRef.current;
    if (!root || !art) return null;
    const rr = root.getBoundingClientRect();
    const ar = art.getBoundingClientRect();
    const k = ar.width / ART_OPEN_W;
    if (!k) return null;
    return {
      x: ar.left + s.x * k - rr.left + ox,
      y: ar.top + s.y * k - rr.bottom,
      r: (s.w * k) / 2,
      angle: (s.rot * Math.PI) / 180,
      squash: s.sy ?? 1,
    };
  }, []);

  /** 五円玉を押した：崩れて机の上へ */
  const spill = useCallback(() => {
    const s = stateRef.current;
    if (!s.open || s.coinsLeft <= 0) return;
    const b = ensureSim();
    const sim = simRef.current;
    if (!b || !sim) return;
    const rr = rootRef.current!.getBoundingClientRect();
    const starts = coinRefs.current
      .filter((el): el is HTMLElement => !!el)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - rr.left + b.ox,
          y: r.top + r.height / 2 - rr.top + b.oy,
          r: r.width / 2,
        };
      })
      .filter((p) => p.r > 0)
      // 上に積まれたものから崩れる
      .sort((a, c) => a.y - c.y);
    const fallback = starts.length
      ? starts
      : [
          {
            x: b.ox + rr.width * 0.4,
            y: b.oy + rr.height * 0.55,
            r: rr.width * 0.04,
          },
        ];
    sim.spill(
      fallback,
      seedOf(savedRef.current.n, Math.floor(now() / 60000)),
    );
    stateRef.current = { ...stateRef.current, coinsLeft: 0 };
    setCoinsLeft(0);
  }, [ensureSim]);

  /** ケースの中のドーナツを押した：机の上へ飛び出して転がる */
  const rollDonut = useCallback(
    (i: number) => {
      if (!sweetsOn || !sweets || !stateRef.current.open) return false;
      if (i < 0 || i >= DONUT_SLOTS.length || sweetRef.current.out[i])
        return false;
      const el = donutRefs.current[i];
      const b = ensureSim();
      const sim = simRef.current;
      const pose = b && slotPose(DONUT_SLOTS[i], b.ox);
      if (!el || !sim || !pose) return false;
      sim.launch({
        id: i,
        img: el,
        ...pose,
        puffy: !!sweets.donuts[i % sweets.donuts.length].puffy,
      });
      setOut(i, true);
      return true;
    },
    [sweetsOn, sweets, ensureSim, slotPose, setOut],
  );

  /** 机の上のドーナツを押した：ケースが開いていれば元の場所へ放り戻す（何度でも転がせるように）／閉じていればその場で跳ねる */
  const tapDeskDonut = useCallback(
    (i: number) => {
      const sim = simRef.current;
      if (!sim || !sweetRef.current.out[i]) return false;
      const b = openShownRef.current ? deskBox() : null;
      return sim.tap(i, b ? slotPose(DONUT_SLOTS[i], b.ox) : null);
    },
    [deskBox, slotPose],
  );

  /** つぶれたシュークリームからクリームがはじけ飛ぶ（5粒：ケースの内側に3つ・机の上に2つ） */
  const splash = useCallback(() => {
    const root = rootRef.current;
    const pf = puffRef.current;
    const art = artOpenRef.current;
    if (!sweets || !sweets.creams.length || !root || !pf || !art) return;
    const b = ensureSim();
    const sim = simRef.current;
    if (!b || !sim) return;
    const rr = root.getBoundingClientRect();
    const pr = pf.getBoundingClientRect();
    const ar = art.getBoundingClientRect();
    const k = ar.width / ART_OPEN_W;
    const toX = (x: number) => x - rr.left + b.ox;
    const toY = (y: number) => y - rr.bottom;
    const from = {
      x: toX((pr.left + pr.right) / 2),
      y: toY(pr.top + pr.height * 0.45),
    };
    splashN.current++;
    const rand = rng(
      seedOf(savedRef.current.n, Math.floor(now() / 60000)) ^
        Math.imul(splashN.current, 0x9e3779b1),
    );
    // 4粒は絵を1つずつ（並びは毎回まぜる）、5粒目はどれかを小さく
    const srcs = sweets.creams.slice();
    for (let i = srcs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
    }
    const drops: CreamDrop[] = [];
    const onCase: { x: number; y: number }[] = [];
    for (let n = 0; n < 5; n++) {
      const src =
        n < 4 && n < srcs.length
          ? srcs[n]
          : srcs[Math.floor(rand() * srcs.length)];
      const w = rr.width * (0.085 + rand() * 0.045) * (n === 4 ? 0.7 : 1);
      if (n < 3) {
        // ケースの内側：1つ目はふたの内側（暗いスポンジで白いクリームも見える）・2つ目は下の段・3つ目はどちらか。
        // シュークリームのすぐそばと、先に付いたクリームの上には落ちない
        const area =
          n === 0 ? CREAM_LID : n === 1 || rand() < 0.5 ? CREAM_LOW : CREAM_LID;
        let px = 0;
        let py = 0;
        for (let t = 0; t < 12; t++) {
          px = area.x0 + rand() * (area.x1 - area.x0);
          py = area.y0 + rand() * (area.y1 - area.y0);
          if (
            Math.hypot(px - PUFF_SLOT.x, py - PUFF_SLOT.y) > 130 &&
            onCase.every((q) => Math.hypot(px - q.x, py - q.y) > 110)
          )
            break;
        }
        onCase.push({ x: px, y: py });
        drops.push({
          img: imageOf(src),
          x: toX(ar.left + px * k),
          y: toY(ar.top + py * k),
          w,
          where: "case",
        });
      } else {
        // 机の上（ケースの手前。たいていは机の広い左へ）
        const dir = n === 3 || rand() < 0.6 ? -1 : 1;
        const x = Math.min(
          b.box.w - w,
          Math.max(w, from.x + dir * rr.width * (0.25 + rand() * 0.6)),
        );
        drops.push({
          img: imageOf(src),
          x,
          y: b.box.minFloor + rand() * 0.75 * (b.box.maxFloor - b.box.minFloor),
          w,
          where: "desk",
        });
      }
    }
    sim.burst(from, drops);
  }, [sweets, ensureSim]);

  /** シュークリームを押した：まるごとなら上から押しつぶす（つぶれた絵に替わってクリームが飛ぶ）／つぶれていたら新しいのが ぽん と出る */
  const squashPuff = useCallback(() => {
    if (!sweetsOn || !stateRef.current.open) return false;
    const p = sweetRef.current.puff;
    if (p.st === "squash") return false;
    if (p.st === "squashed") {
      setPuff({ k: p.k + 1, st: "whole" });
      return true;
    }
    setPuff({ k: p.k, st: "squash" });
    window.clearTimeout(puffTimer.current);
    puffTimer.current = window.setTimeout(() => {
      setPuff({ k: p.k, st: "squashed" });
      if (stateRef.current.open) splash();
    }, SQUASH_MS);
    return true;
  }, [sweetsOn, setPuff, splash]);

  /** 押した点にいちばん近い中身（触れる丸は指より小さい絵どうしで重なり合うので、見えている絵の中心との近さで選ぶ） */
  const pickSweet = (x: number, y: number): Sweet | null => {
    let best: Sweet | null = null;
    let bd = Infinity;
    const cands: [Sweet, HTMLElement | null][] = [
      ...DONUT_SLOTS.map((_, i): [Sweet, HTMLElement | null] => [
        i,
        sweetRef.current.out[i] ? null : donutRefs.current[i],
      ]),
      ["puff", puffRef.current],
    ];
    for (const [k, el] of cands) {
      const r = el?.getBoundingClientRect();
      if (!r || !r.width) continue;
      const d =
        Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2) /
        (r.width / 2);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };
  /** 中身の触れる丸を押した（指・マウスは押した点にいちばん近い絵のもの／キーボードはその丸のもの） */
  const onSweet = (own: Sweet) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const k = e.detail === 0 ? own : (pickSweet(e.clientX, e.clientY) ?? own);
    if (k === "puff") squashPuff();
    else rollDonut(k);
  };

  /** ふた：開いていれば閉じる（留め金も戻す）。閉じていて、ダイヤルが今日の番号のままなら開く。違えばガタつくだけ */
  const pressLid = useCallback(() => {
    const s = stateRef.current;
    if (s.open) {
      clearTimers();
      setOpen(false);
      stateRef.current = { ...s, open: false, latched: true };
      later(() => setLatched(true), 520);
      return;
    }
    if (settled() && current() === caseCode()) return openNow();
    setRattle((n) => n + 1);
  }, [openNow]);

  // ダイヤルの操作（指もマウスも同じ）：上へ動かすと数が進み、下へ動かすと戻る。動かさずに離すと1つ進む。
  // 触れる所の上ではページを縦にスクロールしない（silverCase.css の touch-action）
  /** 触った所にいちばん近い桁。数字の輪は指より小さいので、触れる四角の割り振りではなく見えている輪の位置で選ぶ（輪の外は左右の端の桁） */
  const pickWheel = (x: number, fallback: number) => {
    let best = fallback;
    let bd = Infinity;
    wheelRefs.current.forEach((el, k) => {
      const r = el?.getBoundingClientRect();
      if (!r || !r.width) return;
      const d = Math.abs(x - (r.left + r.width / 2));
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    return best;
  };
  /** 回している桁の輪を少し明るくする */
  const setActive = (i: number | null) =>
    wheelRefs.current.forEach((el, k) =>
      el?.parentElement?.toggleAttribute("data-active", k === i),
    );
  const onDown = (hit: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = pickWheel(e.clientX, hit);
    setActive(i);
    anim.current[i] = null;
    const w = rootRef.current?.getBoundingClientRect().width || 125;
    drag.current = {
      i,
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      v: dial.current[i],
      t: e.timeStamp,
      moved: false,
      cell: Math.max(14, w * CELL_RATIO),
    };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (
        Math.hypot(e.clientX - d.x, e.clientY - d.y) <
        (e.pointerType === "mouse" ? MOVE_MOUSE : MOVE_TOUCH)
      )
        return;
      d.moved = true;
    }
    dial.current[d.i] = d.v + (d.y - e.clientY) / d.cell;
    paint(d.i);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setActive(null);
    if (d.moved) turnTo(d.i, Math.round(dial.current[d.i]));
    else if (e.type === "pointerup" && e.timeStamp - d.t < TAP_MAX_MS)
      turnTo(d.i, Math.round(dial.current[d.i]) + 1);
    else turnTo(d.i, Math.round(dial.current[d.i]));
  };
  const onKey = (i: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      Enter: 1,
      " ": 1,
    }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    if ((e.key === "Enter" || e.key === " ") && e.repeat) return;
    const base = anim.current[i]?.to ?? Math.round(dial.current[i]);
    turnTo(i, base + step);
  };

  // 検分用（手元と Preview だけ）：window.__kbCase.code()＝今日の番号／set("123")＝ダイヤルを回す／open()・close()＝ふた／
  // rollDonut(i)＝ケースの中のドーナツを転がす（i を省くと残っている最初のもの）／tapDonut(i)＝ドーナツを押す（机の上なら戻る・跳ねる）／
  // squashPuff()＝シュークリームを押す（つぶす・新しいのを出す）／state＝今の様子
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbCase?: unknown };
    w.__kbCase = {
      code: () => caseCode(),
      set: (abc: string | number) => {
        const s = String(abc).replace(/\D/g, "").padStart(3, "0").slice(-3);
        for (let i = 0; i < 3; i++) {
          const cur = Math.round(dial.current[i]);
          const want = Number(s[i]);
          const diff = (((want - mod10(cur)) % 10) + 10) % 10;
          turnTo(i, cur + diff);
        }
        return s;
      },
      open: () => {
        const s = stateRef.current;
        if (!s.open) {
          clearTimers();
          setLatched(false);
          setOpen(true);
          stateRef.current = { ...s, open: true, latched: false };
        }
      },
      close: () => stateRef.current.open && pressLid(),
      spill: () => spill(),
      rollDonut: (i?: number) =>
        rollDonut(i ?? sweetRef.current.out.findIndex((o) => !o)),
      tapDonut: (i: number) =>
        sweetRef.current.out[i] ? tapDeskDonut(i) : rollDonut(i),
      squashPuff: () => squashPuff(),
      get state() {
        const s = stateRef.current;
        const box = (el: Element | null) => {
          const r = el?.getBoundingClientRect();
          return r
            ? { w: Math.round(r.width), h: Math.round(r.height) }
            : null;
        };
        return {
          dial: current(),
          code: caseCode(),
          open: s.open,
          latched: s.latched,
          content: silverCase.content,
          coinsInCase: s.coinsLeft,
          sweets: sweetsOn
            ? {
                donutsOut: sweetRef.current.out.slice(),
                puff: sweetRef.current.puff.st,
                puffsMade: sweetRef.current.puff.k + 1,
              }
            : null,
          desk: simRef.current?.state() ?? null,
          opens: savedRef.current.n,
          reduce: reducedMotion(),
          hits: hitRefs.current.map(box),
          sweetHits: Array.from(
            rootRef.current?.querySelectorAll(".sc-hit-sw, .sc-hit-desk") ??
              [],
          ).map((el) => ({ label: el.getAttribute("aria-label"), ...box(el) })),
        };
      },
    };
    return () => {
      delete w.__kbCase;
    };
  }, [turnTo, pressLid, spill, rollDonut, tapDeskDonut, squashPuff, sweetsOn]);

  const showCoins = silverCase.content === "coins";
  const dialEl = (
    <span className="sc-dial" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="sc-wheel">
          <span
            className="sc-digits"
            ref={(el) => {
              wheelRefs.current[i] = el;
            }}
          >
            {ROWS.map((r) => (
              <i key={r} />
            ))}
          </span>
        </span>
      ))}
    </span>
  );

  let coinIdx = 0;
  const coins =
    showCoins && !art
      ? STACKS.flatMap((st, si) =>
          Array.from({ length: st.n }, (_, k) => {
            const idx = coinIdx++;
            const hidden = idx >= coinsLeft;
            return (
              <i
                key={`${si}-${k}`}
                className="sc-coin"
                hidden={hidden}
                ref={(el) => {
                  coinRefs.current[idx] = hidden ? null : el;
                }}
                style={face(
                  COIN,
                  COIN,
                  `${t3(st.x + (k % 2) * 0.5, st.z - (k % 3) * 0.3, 0.4 + k * COIN_TH)}`,
                )}
              />
            );
          }),
        )
      : null;

  // 絵のとき：上から見た五円玉（下の段から順に、少しずつずらして重ねる）
  let pitIdx = 0;
  const pitCoins =
    showCoins && art && artOpen
      ? PIT_STACKS.flatMap((st, si) =>
          Array.from({ length: st.n }, (_, k) => {
            const idx = pitIdx++;
            const hidden = idx >= coinsLeft;
            return (
              <i
                key={`${si}-${k}`}
                className="sc-coin sc-acoin"
                hidden={hidden}
                ref={(el) => {
                  coinRefs.current[idx] = hidden ? null : el;
                }}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  transform: `translate(calc(-50% + ${((k % 2) * 2 - 1) * 0.25}cqw), calc(-50% - ${k * 0.32}cqw))`,
                }}
              />
            );
          }),
        )
      : null;

  // 絵のとき：中身のシュークリームとドーナツ（紙ナプキンの上。机の上に出ているドーナツは隠す）
  const showSweets = sweetsOn && sweetsReady && !!sweets;
  const sweetEls =
    showSweets && sweets ? (
      <span className="sc-sweets">
        <span className="sc-napbox">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sc-sw sc-napkin"
            src={sweets.napkin}
            alt=""
            decoding="async"
            draggable={false}
            style={spotVars(NAPKIN)}
            onError={hideBroken}
          />
        </span>
        {DONUT_SLOTS.map((sl, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            ref={(el) => {
              donutRefs.current[i] = el;
            }}
            className="sc-sw"
            src={sweets.donuts[i % sweets.donuts.length].src}
            alt=""
            decoding="async"
            draggable={false}
            hidden={out[i]}
            style={spotVars(sl)}
            onError={hideBroken}
          />
        ))}
        {/* 新しいシュークリームは key を替えて出し直す（ぽん、の動きを始めから） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`puff-${puff.k}`}
          ref={puffRef}
          className="sc-sw sc-puff"
          src={puff.st === "squashed" ? sweets.puffSquash : sweets.puff}
          alt=""
          decoding="async"
          draggable={false}
          data-st={puff.st}
          data-pop={puff.k > 0 && puff.st === "whole" ? "" : undefined}
          style={spotVars(puff.st === "squashed" ? PUFF_SQUASHED : PUFF_SLOT)}
          onLoad={showLoaded}
          onError={hideBroken}
        />
      </span>
    ) : null;
  const rattleKey = rattle ? (rattle % 2 ? "a" : "b") : undefined;
  /** ケースの中に押せる物が無い（ふたの触れる四角を広げる）。sweets はシュークリームがいつもある */
  const empty = sweetsOn ? false : coinsLeft <= 0;

  return (
    <div
      ref={rootRef}
      className={`sc${art ? " has-art" : ""}${art && artOpen ? " has-art-open" : ""}`}
      data-open={open ? "" : undefined}
      data-latch={latched ? "" : undefined}
      data-empty={empty ? "" : undefined}
    >
      {art ? (
        <div
          className="sc-artbox"
          aria-hidden
          data-rattle={rattleKey}
          style={{ "--sc-art": `url("${art}")` } as React.CSSProperties}
        >
          {/* 閉じた絵（正面）。留め金の板は絵の同じ所を切り抜いて重ね、外れると手前へ跳ね上がる。
              ガタつきは数字の輪ごと揺らす（.sc-artbox に掛ける＝輪が錠の窓からずれない） */}
          <div className="sc-art-closed">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sc-art" src={art} alt="" decoding="async" />
            <span className="sc-alatch sc-alatch-l">
              <b />
            </span>
            <span className="sc-alatch sc-alatch-r">
              <b />
            </span>
          </div>
          {/* 開いた絵（上から見た）。先に読んでおき、開いたら差し替える */}
          {artOpen && (
            <div className="sc-art-open" ref={artOpenRef}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="sc-art" src={artOpen} alt="" decoding="async" />
              {showCoins && <span className="sc-apit">{pitCoins}</span>}
              {sweetEls}
            </div>
          )}
          {dialEl}
          {silverCase.hint && !open && (
            <span className="sc-hint">{silverCase.hint}</span>
          )}
        </div>
      ) : (
        <div className="sc-scene" aria-hidden>
          <i className="sc-shadow" />
          <div
            className="sc-obj"
            data-rattle={rattle ? (rattle % 2 ? "a" : "b") : undefined}
          >
            {/* 下の箱 */}
            <div
              className="sc-f sc-alu sc-b-back"
              style={face(W, HB, `${t3(0, -HB / 2, -D / 2)} rotateY(180deg)`)}
            />
            <div
              className="sc-f sc-alu sc-end"
              style={face(D, HB, `${t3(-W / 2, -HB / 2, 0)} rotateY(-90deg)`)}
            />
            <div
              className="sc-f sc-alu sc-end"
              style={face(D, HB, `${t3(W / 2, -HB / 2, 0)} rotateY(90deg)`)}
            />
            <div
              className="sc-f sc-foam sc-in-back"
              style={face(
                W - 2 * T,
                HB - 3,
                `${t3(0, -HB / 2 - 1.5, -D / 2 + T)}`,
              )}
            />
            <div
              className="sc-f sc-foam sc-in-side"
              style={face(
                D - 2 * T,
                HB - 3,
                `${t3(-W / 2 + T, -HB / 2 - 1.5, 0)} rotateY(90deg)`,
              )}
            />
            <div
              className="sc-f sc-foam sc-in-side"
              style={face(
                D - 2 * T,
                HB - 3,
                `${t3(W / 2 - T, -HB / 2 - 1.5, 0)} rotateY(-90deg)`,
              )}
            />
            <div
              className="sc-f sc-foam sc-floor"
              style={face(
                W - 2 * T,
                D - 2 * T,
                `${t3(0, -3, 0)} rotateX(90deg)`,
              )}
            >
              {showCoins && <i className="sc-pit" />}
              {coins}
            </div>
            <div
              className="sc-f sc-rim"
              style={face(W, D, `${t3(0, -HB, 0)} rotateX(90deg)`)}
            />
            <div
              className="sc-f sc-alu sc-b-front"
              style={face(W, HB, t3(0, -HB / 2, D / 2))}
            >
              <i className="sc-corner sc-cl" />
              <i className="sc-corner sc-cr" />
              <span className="sc-latch sc-ll">
                <b />
              </span>
              <span className="sc-latch sc-lr">
                <b />
              </span>
              {dialEl}
            </div>
            {/* ふた（奥の辺を軸に開く） */}
            <div
              className="sc-lid"
              style={{
                transform: `${t3(0, -HB, -D / 2)} rotateX(${open ? OPEN_DEG : 0}deg)`,
              }}
            >
              <div
                className="sc-f sc-alu sc-l-top"
                style={face(W, D, `${t3(0, -HL, D / 2)} rotateX(90deg)`)}
              >
                <i className="sc-scuff" />
                <i className="sc-label" />
                {silverCase.hint && (
                  <span className="sc-hint">{silverCase.hint}</span>
                )}
              </div>
              <div
                className="sc-f sc-alu sc-l-back"
                style={face(W, HL, `${t3(0, -HL / 2, 0)} rotateY(180deg)`)}
              />
              <div
                className="sc-f sc-alu sc-end"
                style={face(
                  D,
                  HL,
                  `${t3(-W / 2, -HL / 2, D / 2)} rotateY(-90deg)`,
                )}
              />
              <div
                className="sc-f sc-alu sc-end"
                style={face(
                  D,
                  HL,
                  `${t3(W / 2, -HL / 2, D / 2)} rotateY(90deg)`,
                )}
              />
              <div
                className="sc-f sc-foam sc-l-in"
                style={face(
                  W - 2 * T,
                  D - 2 * T,
                  `${t3(0, -0.4, D / 2)} rotateX(-90deg)`,
                )}
              />
              <div
                className="sc-f sc-alu sc-l-front"
                style={face(W, HL, t3(0, -HL / 2, D))}
              >
                <i className="sc-corner sc-cl sc-ct" />
                <i className="sc-corner sc-cr sc-ct" />
                <span className="sc-handle">
                  <b />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="sc-coins" aria-hidden />
      <div className="sc-hits">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            ref={(el) => {
              hitRefs.current[i] = el;
            }}
            className="sc-hit-dial"
            style={{ "--i": i } as React.CSSProperties}
            role="spinbutton"
            tabIndex={0}
            aria-label="ダイヤル"
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={0}
            onPointerDown={onDown(i)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={onKey(i)}
          />
        ))}
        <button
          type="button"
          className="sc-hit-lid"
          aria-label="ふた"
          onClick={pressLid}
        />
        {open && coinsLeft > 0 && (
          <button
            type="button"
            className="sc-hit-coins"
            aria-label="五円玉"
            onClick={spill}
          />
        )}
        {/* 中身（開いている間）：ケースの中のドーナツとシュークリーム */}
        {open &&
          showSweets &&
          DONUT_SLOTS.map((sl, i) =>
            out[i] ? null : (
              <button
                key={`sw-${i}`}
                type="button"
                className="sc-hit-sw"
                style={spotVars(sl)}
                aria-label="ドーナツ"
                onClick={onSweet(i)}
              />
            ),
          )}
        {open && showSweets && (
          <button
            type="button"
            className="sc-hit-sw"
            style={spotVars(PUFF_SLOT)}
            aria-label="シュークリーム"
            onClick={onSweet("puff")}
          />
        )}
        {/* 机の上に出ているドーナツ（位置は描くたびに placeDeskHits が書く） */}
        {sweetsOn &&
          DONUT_SLOTS.map((_, i) =>
            out[i] ? (
              <button
                key={`desk-${i}`}
                ref={(el) => {
                  deskHitRefs.current[i] = el;
                  if (el) placeDeskHits();
                }}
                type="button"
                className="sc-hit-desk"
                aria-label="ドーナツ"
                onClick={() => tapDeskDonut(i)}
              />
            ) : null,
          )}
      </div>
    </div>
  );
}
