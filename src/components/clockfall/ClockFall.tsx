"use client";
// もちものが3つ揃った瞬間：画面が小さく揺れ、教室の壁の時計が外れて落ちる（ページは時計を追ってフッターまでスクロール）。
// 時計はフッターの縁に当たって割れ、破片と部品は縁と画面の左右で跳ねて縁の上に積もる。縁にはひびが入り、フッターは沈んで跳ねる。
// その押し出しで、フッターのさらに下から引き出しが飛び出す（押すと thanatosgames.jp）。
// 読み込み時にすでに揃っていた：時計は壁に無く、破片は積もった状態、ひびがあり、引き出しは出た状態で置くだけ。
// 動きを減らす設定でも、落ちる・割れる・散る・ひび・引き出しは全部動かす。止めるのは画面全体の揺れだけ。
// そのときページは時計を追って流さない。時計が画面の下へ抜けたら縁の見える所へ一度で移り、割れたあと引き出しが出たら、
// 引き出しの見える所へもう一度だけ一度で移る（どちらも要らなければ移らない）。フッターの跳ねは小さく。
// 破片の積もり方は保存した種から作り直す（同じ幅の画面なら同じ並び）。動きがあるのは落ちてから破片が止まるまでだけ。
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/data/site";
import { ITEM_EVENT, allCollected, useItems } from "@/lib/items";
import { now } from "@/lib/now";
import { debugAllowed } from "@/lib/worldClock";
import { DT, footOffset, footShake, hashStr, makeBreak, makeCrack, pileHeight, rng, settle, step, type BreakIn, type Crack, type World } from "./clockFallSim";
import { crackDepth, drawBodies, drawCrack, handAngles, handSpec, loadArt, makeSprite, makeWhole, type Art, type Sprite } from "./clockArt";
import FooterDrawer from "./FooterDrawer";
import "./clockfall.css";

type Phase = "idle" | "falling" | "breaking" | "settled";
type DrawerState = "none" | "pop" | "out";
/** 保存の形：種・当たった所（幅に対する割合）・傾き・速さ・針の角度 */
type Saved = { v: 1; seed: number; ix: number; A: number; vx: number; vy: number; hands: number[] };

const SAVE_KEY = `gbf_${site.year}_clockfall`;
/** もちものを拾ってからこの時間内に揃ったら「いま揃った」とみなす（ms） */
const FRESH_MS = 3000;
/** 落ちる時計の重力（px/秒²） */
const G_FALL = 2400;
/** 引き出しの入れ物の高さ（clockfall.css の .cf-slot と同じ。PC／スマホ） */
const SLOT_H = 58 + 120 + 30;
const SLOT_H_MOBILE = 50 + 106 + 30;

/** 動きを減らす設定で、画面全体の揺れ・ページの大きな流れを止めるか（?motion があれば止めない） */
const reduceBig = () => !new URLSearchParams(location.search).has("motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** 動きを減らす設定のときのフッターの跳ねの大きさ（ふだんを1とした割合） */
const FOOT_CALM = 0.4;
/** 動きを減らす設定で場面を移したあと、時計が画面の上から入り直すときの速さの上限（px/秒）。縁に当たるまでが見える速さ */
const CUT_VY = 1100;
const vw = () => document.documentElement.clientWidth || window.innerWidth;
/** 落ちる時計の幅（壁の時計より大きく見せる） */
const fallSize = (W: number) => Math.round(Math.min(180, Math.max(120, W * 0.3)));
/** 破片の数（スマホは少なめ） */
const counts = (W: number) => (W < 600 ? { shards: 24, glass: 7 } : { shards: 32, glass: 10 });
const footerEl = () => document.getElementById("library");
const floorDoc = () => {
  const f = footerEl();
  return f ? f.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight;
};
const readSaved = (): Saved | null => {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return v && v.v === 1 && Number.isFinite(v.seed) && Array.isArray(v.hands) ? v : null;
  } catch {
    return null;
  }
};
const writeSaved = (s: Saved | null) => {
  try {
    if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {}
};
const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** 種が保存されていないとき：その日（日本時間）から決める */
function fallbackSaved(): Saved {
  const day = new Date(now() + 9 * 3600000).toISOString().slice(0, 10);
  const seed = hashStr(`${site.year}:${day}`);
  const r = rng(seed);
  return { v: 1, seed, ix: 0.32 + 0.36 * r(), A: (r() - 0.5) * Math.PI * 2, vx: (r() - 0.5) * 80, vy: 1500, hands: handAngles(now()) };
}

/** 割れる計算の入力（縁の高さを 0 とした座標で回す＝ページのどこにあっても同じ結果） */
function breakParams(s: Saved, W: number, a: Art): BreakIn {
  const sp = handSpec(a.S);
  return {
    seed: s.seed,
    W,
    floor: 0,
    S: a.S,
    Hc: a.Hc,
    dcx: a.dcx,
    dcy: a.dcy,
    R: a.R,
    X: Math.min(W - a.R, Math.max(a.R, s.ix * W)),
    Y: -a.R,
    A: s.A,
    vx: s.vx,
    vy: s.vy,
    hands: s.hands,
    handLen: sp.len,
    handW: sp.wid,
    ...counts(W),
  };
}

type Hooks = { rest: () => HTMLCanvasElement | null; root: () => HTMLElement | null; setDrawer: (s: DrawerState) => void };
type Fall = { X: number; Y: number; vx: number; vy: number; A: number; w: number; sc: number; sc0: number; t: number; vMax: number; hands: number[] };

function createEngine(h: Hooks) {
  let phase: Phase = "idle";
  let token = 0;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let overlay: HTMLCanvasElement | null = null;
  let octx: CanvasRenderingContext2D | null = null;
  let art: Art | null = null;
  let whole: HTMLCanvasElement | null = null;
  let fall: Fall | null = null;
  let world: World | null = null;
  let sprites: Sprite[] = [];
  let crack: Crack | null = null;
  let seed = 0;
  /** 当たった瞬間の縁の高さ（ページ座標） */
  let floorBase = 0;
  let cam = 0;
  let follow = true;
  /** 動きを減らす設定で流しているか（揺れなし・ページは一度で移す・フッターの跳ねは小さく） */
  let calm = false;
  let baked: { W: number; pileH: number; depth: number } | null = null;
  let drawer: DrawerState = "none";
  const timers: number[] = [];

  const setDrawer = (s: DrawerState) => {
    drawer = s;
    h.setDrawer(s);
  };
  /** 壁の時計を外す印（#kb-world の data-cf）。時計の絵と針は隠れ、釘と跡が残る */
  const mark = (on: boolean) => {
    const w = document.getElementById("kb-world");
    if (!w) return;
    if (on) w.setAttribute("data-cf", "gone");
    else w.removeAttribute("data-cf");
  };
  /** 見ている人が自分でスクロールしたら、追いかけるのをやめる */
  const userScroll = () => {
    follow = false;
  };
  const listen = (on: boolean) => {
    for (const t of ["wheel", "touchstart", "keydown"]) {
      if (on) window.addEventListener(t, userScroll, { passive: true });
      else window.removeEventListener(t, userScroll);
    }
  };

  function sizeOverlay() {
    if (!overlay) return;
    const dpr = art?.dpr ?? 1;
    const W = vw();
    const H = window.innerHeight;
    overlay.width = Math.ceil(W * dpr);
    overlay.height = Math.ceil(H * dpr);
    overlay.style.width = `${W}px`;
    overlay.style.height = `${H}px`;
  }
  function makeOverlay() {
    overlay = document.createElement("canvas");
    overlay.className = "cf-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    octx = overlay.getContext("2d");
    sizeOverlay();
  }
  function dropOverlay() {
    overlay?.remove();
    overlay = null;
    octx = null;
  }
  /** フッターの沈み込みと横揺れ（px）。動きを減らす設定では小さく */
  function foot(t: number) {
    const k = calm ? FOOT_CALM : 1;
    return { o: footOffset(t) * k, s: footShake(t) * k };
  }
  function clearFooter() {
    const f = footerEl();
    if (f) f.style.transform = "";
  }
  function clearRest() {
    baked = null;
    const c = h.rest();
    if (c) delete c.dataset.on;
  }
  /** 動いているものを全部止める（焼き付けた破片は残す） */
  function halt() {
    token++;
    cancelAnimationFrame(raf);
    raf = 0;
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
    dropOverlay();
    clearFooter();
    listen(false);
    document.documentElement.classList.remove("gb-quake");
  }

  /** 止まった破片とひびを、フッターの縁に置いた canvas（ページと一緒にスクロールする）に焼き付ける */
  function bake() {
    const c = h.rest();
    if (!c || !world || !art || !crack) return false;
    const W = vw();
    const sx = W / world.W;
    const pileH = Math.ceil(pileHeight(world)) + 6;
    const depth = crackDepth(art, crack);
    const dpr = art.dpr;
    c.width = Math.ceil(W * dpr);
    c.height = Math.ceil((pileH + depth) * dpr);
    c.style.width = `${W}px`;
    c.style.height = `${pileH + depth}px`;
    const x = c.getContext("2d");
    if (!x) return false;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, pileH + depth);
    drawCrack(x, art, crack, world.hitX * sx, pileH);
    drawBodies(x, world.bodies, sprites, -pileH, sx);
    baked = { W, pileH, depth };
    c.dataset.on = "1";
    place();
    return true;
  }
  /** 焼き付けた canvas を、フッターの縁にぴったり合わせる */
  function place() {
    const c = h.rest();
    const root = h.root();
    const f = footerEl();
    if (!c || !root || !f || !baked || phase !== "settled") return;
    const fr = f.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    c.style.top = `${fr.top - rr.top - baked.pileH}px`;
    c.style.left = `${-rr.left}px`;
  }

  function render() {
    const x = octx;
    if (!x || !overlay || !art) return;
    const dpr = art.dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
    const sy = window.scrollY;
    if (phase === "falling" && fall && whole) {
      x.save();
      x.translate(fall.X, fall.Y - sy);
      x.rotate(fall.A);
      x.scale(fall.sc, fall.sc);
      x.drawImage(whole, -art.dcx, -art.dcy, art.S, art.Hc);
      x.restore();
    } else if (phase === "breaking" && world && crack) {
      const ft = foot(world.t);
      drawCrack(x, art, crack, world.hitX + ft.s, floorBase + ft.o - sy);
      // 破片の計算はふだんの跳ねのまま（積もり方を変えない）。跳ねを小さくした分だけずらして描き、縁の上の破片がフッターから浮かないように
      drawBodies(x, world.bodies, sprites, sy - floorBase + footOffset(world.t) - ft.o, 1, world.t);
    }
  }

  /**
   * 割れたあとの見せ方：縁から上は破片が飛び散る分の高さを空け、縁の下はフッターと引き出しが入るように。
   * 縁を画面の上から何 px に置くか（スマホはフッターが縦に長いので上寄り）
   */
  function floorView() {
    const vh = window.innerHeight;
    const fh = footerEl()?.offsetHeight ?? 0;
    const slot = vw() <= 480 ? SLOT_H_MOBILE : SLOT_H;
    return Math.min(vh * 0.45, Math.max(Math.min(170, vh * 0.3), vh - fh - slot - 20));
  }
  /**
   * 動きを減らす設定で落ちている間：ページを流して追わない。時計が画面の下へ抜けたら、縁の見える所（割れたあとの見せ方）へ一度で移り、
   * 時計は画面の上から入り直す（速さは、縁に当たるまでが見える程度に抑える）
   */
  function cut() {
    if (!fall || !art) return;
    const sy = window.scrollY;
    const vh = window.innerHeight;
    if (fall.Y - art.R * fall.sc < sy + vh) return;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    const top = Math.min(max, Math.max(sy, floorDoc() - floorView()));
    cam = top;
    window.scrollTo({ top, behavior: "instant" });
    fall.Y = top - art.Hc * 0.6;
    fall.vy = Math.min(fall.vy, CUT_VY);
  }
  function camera(dt: number) {
    if (!follow) return;
    if (calm && phase === "falling") return cut();
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    let target: number;
    // 落ちている間：時計を画面の上から 3 割の所に置いて追う。ただし、割れたあとの見せ方より先へは行かない（縁が見えてから当たる）
    if (phase === "falling" && fall) target = Math.min(Math.max(cam, fall.Y - vh * 0.32), floorDoc() - floorView());
    else if (phase === "breaking") {
      // 動きを減らす設定：引き出しの入れ物が出て、ページの長さが決まってから一度で移る（流さない・二度に分けて跳ばない）
      if (calm && !h.root()?.querySelector(".cf-slot")) return;
      target = floorBase - floorView();
    } else return;
    target = Math.min(max, Math.max(0, target));
    if (calm) cam = target;
    else cam += (target - cam) * (1 - Math.exp(-(phase === "falling" ? 14 : 5) * dt));
    if (Math.abs(cam - window.scrollY) > 0.5) window.scrollTo({ top: cam, behavior: "instant" });
  }

  function impact(floor: number) {
    if (!art || !fall) return;
    const W = vw();
    const s: Saved = { v: 1, seed, ix: fall.X / W, A: fall.A, vx: fall.vx, vy: fall.vy, hands: fall.hands };
    writeSaved(s);
    floorBase = floor;
    world = makeBreak(breakParams(s, W, art));
    crack = makeCrack(seed);
    const a = art;
    sprites = world.bodies.map((b) => makeSprite(b, a));
    fall = null;
    whole = null;
    acc = 0;
    phase = "breaking";
    timers.push(window.setTimeout(() => setDrawer("pop"), 110));
  }

  function fallStep(dt: number) {
    if (!fall || !art) return;
    const f = fall;
    f.t += dt;
    f.vy = Math.min(f.vy + G_FALL * dt, f.vMax);
    f.X += f.vx * dt;
    f.Y += f.vy * dt;
    f.A += f.w * dt;
    const k = Math.min(1, f.t / 0.45);
    f.sc = f.sc0 + (1 - f.sc0) * (1 - (1 - k) ** 3);
    const R = art.R * f.sc;
    const W = vw();
    if (f.X < R) {
      f.X = R;
      f.vx = Math.abs(f.vx);
    } else if (f.X > W - R) {
      f.X = W - R;
      f.vx = -Math.abs(f.vx);
    }
    const floor = floorDoc();
    if (f.Y + R >= floor) impact(floor);
  }

  function finishBreak() {
    clearFooter();
    listen(false);
    phase = "settled";
    bake();
    dropOverlay();
  }

  function loop(ts: number) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    if (phase === "falling") fallStep(dt);
    else if (phase === "breaking" && world) {
      acc += dt;
      while (acc >= DT && !world.done) {
        step(world);
        acc -= DT;
      }
      const f = footerEl();
      if (f) {
        const { o, s } = foot(world.t);
        f.style.transform = o || s ? `translate3d(${s.toFixed(2)}px, ${o.toFixed(2)}px, 0)` : "";
      }
    }
    camera(dt);
    render();
    if (phase === "breaking" && world?.done) {
      finishBreak();
      return;
    }
    if (phase === "falling" || phase === "breaking") raf = requestAnimationFrame(loop);
  }

  /** 揃った瞬間の演出 */
  async function play() {
    halt();
    const tk = token;
    calm = reduceBig();
    clearRest();
    setDrawer("none");
    world = null;
    fall = null;
    phase = "falling";
    // 壁の時計の場所は、揺れが始まる前に測っておく（揺れている最中に測ると数 px ずれる）。ページ座標で持つ
    const wallEl = document.querySelector<HTMLElement>("#kb-world .kb-clock");
    const wr = wallEl?.getBoundingClientRect();
    const wall = wr && wr.width > 0 && wr.bottom > 0 && wr.top < window.innerHeight ? { left: wr.left, top: wr.top + window.scrollY, w: wr.width, h: wr.height } : null;
    // 画面全体の揺れは、動きを減らす設定では止める（時計が外れて落ちる所からはそのまま動かす）
    if (!calm) {
      const root = document.documentElement;
      root.classList.add("gb-quake");
      timers.push(window.setTimeout(() => root.classList.remove("gb-quake"), 650));
    }
    const W = vw();
    const a = await loadArt(fallSize(W));
    if (tk !== token) return;
    art = a;
    await wait(260);
    if (tk !== token) return;
    seed = ((Math.random() * 4294967296) ^ Date.now()) >>> 0;
    const r = rng(seed);
    const hands = handAngles(now());
    whole = makeWhole(a, hands);
    // 壁の時計が画面に入っていれば（いまも入っていれば）、その場所・大きさから落ちはじめる。入っていなければ画面の上から
    const sy = window.scrollY;
    let X: number;
    let Y: number;
    let sc0 = 1;
    let vy = 0;
    if (wall && wall.top + wall.h > sy && wall.top < sy + window.innerHeight) {
      X = wall.left + (wall.w * site.clock.center[0]) / 100;
      Y = wall.top + (wall.h * site.clock.center[1]) / 100;
      sc0 = wall.w / a.S;
      vy = -160;
    } else {
      X = W * (0.38 + 0.24 * r());
      Y = sy - a.Hc * 0.6;
    }
    mark(true);
    const dist = floorDoc() - Y;
    fall = {
      X,
      Y,
      // 壁の時計は左寄りにあるので、落ちながら画面の中ほどへ寄せる（端で割れると破片の半分が壁に当たって見えにくい）
      vx: (W / 2 - X) * 0.3 + (r() - 0.5) * 60,
      vy,
      A: 0,
      w: (r() < 0.5 ? -1 : 1) * (2.2 + 1.2 * r()),
      sc: sc0,
      sc0,
      t: 0,
      vMax: Math.min(5200, Math.max(1700, dist / 1.6)),
      hands,
    };
    cam = window.scrollY;
    follow = true;
    listen(true);
    makeOverlay();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  /** 最後の状態を置くだけ（落下と飛び出しは省く） */
  async function final() {
    halt();
    const tk = token;
    phase = "settled";
    mark(true);
    setDrawer("out");
    const W = vw();
    const a = await loadArt(fallSize(W));
    if (tk !== token) return;
    art = a;
    let s = readSaved();
    if (!s) {
      s = fallbackSaved();
      writeSaved(s);
    }
    seed = s.seed;
    world = settle(makeBreak(breakParams(s, W, a)));
    crack = makeCrack(seed);
    sprites = world.bodies.map((b) => makeSprite(b, a));
    for (let i = 0; i < 30 && !h.rest(); i++) await nextFrame();
    if (tk !== token) return;
    bake();
  }

  function reset() {
    halt();
    phase = "idle";
    world = null;
    fall = null;
    sprites = [];
    crack = null;
    clearRest();
    setDrawer("none");
    mark(false);
    writeSaved(null);
  }

  const onResize = () => {
    sizeOverlay();
    if (phase !== "settled" || !baked) return;
    if (Math.abs(vw() - baked.W) > 1) bake();
    else place();
  };
  window.addEventListener("resize", onResize);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => place()) : null;
  const f = footerEl();
  if (ro) {
    if (f) ro.observe(f);
    ro.observe(document.body);
  }

  return {
    play,
    final,
    reset,
    /** もちものが揃っていない状態に戻ったとき */
    clear() {
      if (phase !== "idle") reset();
    },
    destroy() {
      halt();
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    },
    get state() {
      return {
        phase,
        pieces: world?.bodies.length ?? 0,
        asleep: world ? world.bodies.filter((b) => b.sleep).length : 0,
        stopped: raf === 0,
        t: world ? Math.round(world.t * 100) / 100 : 0,
        drawer,
        baked: !!baked,
        seed,
        calm,
      };
    },
  };
}

type Engine = ReturnType<typeof createEngine>;

export default function ClockFall() {
  const owned = useItems();
  const done = allCollected(owned);
  const [mounted, setMounted] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>("none");
  const restRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const engRef = useRef<Engine | null>(null);
  const acquiredAt = useRef(-Infinity);

  useEffect(() => {
    setMounted(true);
    const eng = createEngine({ rest: () => restRef.current, root: () => rootRef.current, setDrawer });
    engRef.current = eng;
    const onItem = (e: Event) => {
      if ((e as CustomEvent).detail?.id) acquiredAt.current = performance.now();
    };
    window.addEventListener(ITEM_EVENT, onItem);
    // 検分窓口：trigger()＝揃った瞬間の演出をいま流す／final()＝最後の状態を置く／reset()＝壁に時計を戻す／state（calm＝動きを減らす設定で流した）
    const w = window as unknown as { __kbReward?: unknown };
    if (debugAllowed())
      w.__kbReward = {
        trigger: () => void eng.play(),
        final: () => void eng.final(),
        reset: () => eng.reset(),
        get state() {
          return eng.state;
        },
      };
    return () => {
      window.removeEventListener(ITEM_EVENT, onItem);
      eng.destroy();
      engRef.current = null;
      delete w.__kbReward;
    };
  }, []);

  useEffect(() => {
    const eng = engRef.current;
    if (!eng) return;
    if (!done) {
      eng.clear();
      return;
    }
    if (performance.now() - acquiredAt.current < FRESH_MS) void eng.play();
    else void eng.final();
  }, [done]);

  if (!mounted) return null;
  // body の最後（フッターの後ろ）に置く：引き出しはフッターのさらに下に出る
  return createPortal(
    <div className="cf-root" ref={rootRef}>
      <canvas className="cf-rest" ref={restRef} aria-hidden />
      {drawer !== "none" && <FooterDrawer state={drawer} />}
    </div>,
    document.body,
  );
}
