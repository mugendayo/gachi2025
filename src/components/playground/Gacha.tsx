"use client";
// ガチャガチャ：ハンドルを指で回す（円を描くように動かす・押すだけなら1回転）。12刻みで1回転、1回転でカプセルが1つ出る。
// カプセルは取り出し口から机の上へ転がり出て止まる。押すと上下に割れて、折った紙（年と題名）が広がる。紙の ▶ で
// window に "kb:tv-request"（detail.youtubeId）を出す。もう一度回すと前のカプセルは机の左の端へ片付く（3つまで残し、それより古いものは端から落ちる）。
// 中身は、その端末で回した回数とその分の時刻で決まる（直近に出たものは避ける）。機械の中の山は回すたびに減り、ある程度減ると元に戻る。
// 動きを減らす設定でも、回す・転がる・開く・片付くはそのまま動かす（どれも机の上のガチャの中だけの小さな動きなので止めない）。
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gachaPrizes } from "@/data/playgroundItems";
import { debugAllowed } from "@/lib/worldClock";
import { now } from "@/lib/now";
import {
  type Body,
  type Saved,
  type SavedBody,
  type World,
  STEP_MS,
  clearSaved,
  drop,
  halfW,
  load,
  pick,
  randFor,
  save,
  shove,
  step,
} from "./gachaSim";
import "./gacha.css";

/** 1回転の刻みの数 */
const TICKS = 12;
const TICK_DEG = 360 / TICKS;
/** 押すだけで回すときの1刻みの間（ms） */
const AUTO_TICK_MS = 55;
const TAP_MAX_MS = 700;
const MOVE_TOUCH = 6;
const MOVE_MOUSE = 3;
/** 机の端に残すカプセルの数（机が狭いと減らす） */
const JUNK_MAX = 3;
const junkRoom = (w: World, r: number) => Math.max(1, Math.min(JUNK_MAX, Math.floor((w.wall - w.edge) / (r * 2)) - 2));
/** 機械の中の山の数（満杯） */
const PILE = 14;
/** この回数ごとに山が元に戻る */
const PILE_CYCLE = 8;
/** カプセルの半径（機械の高さに対する割合。gacha.css の --cap と合わせる） */
const R_PER_H = 0.072;
/** 取り出し口の位置（機械の幅に対する割合）と、出てくる高さ（機械の高さに対する割合）。絵のときは絵の口に合わせる */
const CHUTE = { css: { x: 0.28, y: 0.08 }, art: { x: 0.496, y: 0.095 } };

/** 山の並び（機械の丸い窓の中の位置 % と傾き・色）。後ろほど上にある＝先に減る */
const PILE_SPOTS: { l: number; b: number; r: number; c: 0 | 1 }[] = [
  { l: 2, b: 0, r: 20, c: 0 },
  { l: 26, b: 1, r: -30, c: 1 },
  { l: 50, b: 0, r: 70, c: 0 },
  { l: 73, b: 2, r: 10, c: 1 },
  { l: 9, b: 22, r: -60, c: 1 },
  { l: 33, b: 21, r: 45, c: 0 },
  { l: 56, b: 23, r: -15, c: 1 },
  { l: 76, b: 25, r: 100, c: 0 },
  { l: 18, b: 43, r: 30, c: 0 },
  { l: 42, b: 42, r: -50, c: 1 },
  { l: 64, b: 45, r: 15, c: 0 },
  { l: 29, b: 62, r: -80, c: 1 },
  { l: 52, b: 63, r: 60, c: 0 },
  { l: 40, b: 80, r: -20, c: 1 },
];

type View = { id: number; c: 0 | 1; p: number; open: boolean; cur: boolean; drop: boolean };

/** 端末が動きを減らす設定か（検分の state で見るだけ。ガチャの動きはこれで変えない） */
const reducedMotion = () =>
  !new URLSearchParams(location.search).has("motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;

export type GachaArt = {
  /** 機械の絵（379×700・中の山も描いてある絵）。空なら CSS で描く。ハンドルの位置は gacha.css の .has-art、取り出し口の位置は CHUTE.art で合わせる */
  machine?: string;
  /** ハンドルの絵。空なら、機械の絵のつまみの丸を切り出して回す（機械の絵もなければ CSS で描く） */
  knob?: string;
  /** 閉じたカプセルの絵。capsuleOpen と両方あるとき使う。空なら CSS で描く */
  capsule?: string;
  /** 上下に割れて開いたカプセルの絵（上の殻と下の殻を切り分けて使う） */
  capsuleOpen?: string;
};

export default function Gacha({ art }: { art?: GachaArt }) {
  const chute = art?.machine ? CHUTE.art : CHUTE.css;
  const rootRef = useRef<HTMLDivElement>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const pileRef = useRef<HTMLSpanElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const world = useRef<World>({ bodies: [], edge: 0, wall: 0, s: 1 });
  const geo = useRef({ h: 0, spawn: 0 });
  const saved = useRef<Saved>({ v: 1, n: 0, recent: [], cur: null, junk: [] });
  const curId = useRef(0);
  const junkIds = useRef<number[]>([]);
  const nextId = useRef(1);
  const raf = useRef(0);
  const lastT = useRef(0);
  const accMs = useRef(0);
  /** 回した角度の貯め（0〜360°）と、通しの刻みの数（つまみの見た目） */
  const turnAcc = useRef(0);
  const ticks = useRef(0);
  const auto = useRef(0);

  const [views, setViews] = useState<View[]>([]);
  const [tick, setTick] = useState(0);
  const [turns, setTurns] = useState(0);
  /** want：広げたい位置（カプセルの少し左）。実際の位置は描いたあとに紙の幅を測って決める */
  const [paper, setPaper] = useState<{ id: number; want: number; folded: boolean } | null>(null);

  const syncViews = useCallback(() => {
    setViews(
      world.current.bodies.map((b) => ({ id: b.id, c: b.c, p: b.p, open: b.open, cur: b.id === curId.current, drop: b.drop })),
    );
  }, []);

  /** 各カプセルの位置を DOM に書く（React の描き直しなしで毎コマ） */
  const paint = useCallback(() => {
    const { h } = geo.current;
    for (const b of world.current.bodies) {
      const el = els.current.get(b.id);
      if (!el) continue;
      el.style.transform = `translate(${(b.x - b.r).toFixed(2)}px, ${(-b.y).toFixed(2)}px) rotate(${b.a.toFixed(3)}rad)`;
      el.style.opacity = b.drop && b.y < 0 ? String(Math.max(0, 1 + b.y / (h * 0.5))) : "";
      // 押す所は回さずに付いていく（上はカプセルの上端まで・下へ広げる＝ハンドルの触れる範囲と重ならない）
      if (b.id === curId.current && hitRef.current) {
        hitRef.current.style.transform = `translate(${b.x.toFixed(2)}px, ${(-b.y).toFixed(2)}px) translateX(-50%)`;
      }
    }
  }, []);

  /** いまの机の上を端末に残す（位置は機械の高さを1とした割合） */
  const persist = useCallback(() => {
    const { h } = geo.current;
    if (!h) return;
    const w = world.current;
    const toSaved = (b: Body): SavedBody => ({ c: b.c, p: b.p, x: +(b.x / h).toFixed(4), a: +b.a.toFixed(3), open: b.open });
    const cur = w.bodies.find((b) => b.id === curId.current);
    const junk = junkIds.current
      .map((id) => w.bodies.find((b) => b.id === id && !b.drop))
      .filter((b): b is Body => !!b);
    saved.current = { ...saved.current, cur: cur ? toSaved(cur) : null, junk: junk.map(toSaved) };
    save(saved.current);
  }, []);

  const frame = useCallback(
    (t: number) => {
      raf.current = 0;
      const w = world.current;
      accMs.current += Math.max(0, Math.min(64, t - lastT.current));
      lastT.current = t;
      while (accMs.current >= STEP_MS) {
        step(w);
        accMs.current -= STEP_MS;
      }
      const before = w.bodies.length;
      w.bodies = w.bodies.filter((b) => !(b.drop && b.y < -geo.current.h * 0.5));
      if (w.bodies.length !== before) syncViews();
      paint();
      if (w.bodies.some((b) => !b.rest)) raf.current = requestAnimationFrame(frame);
      else persist();
    },
    [paint, persist, syncViews],
  );

  const run = useCallback(() => {
    if (raf.current) return;
    lastT.current = performance.now();
    accMs.current = 0;
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  /** 机の大きさを測る（端・取り出し口・カプセルの大きさ）。大きさが変わったら置いてある物も同じ割合で動かす */
  const measure = useCallback(() => {
    const root = rootRef.current;
    const m = machineRef.current;
    if (!root || !m) return false;
    const h = root.clientHeight;
    if (!h) return false;
    const rr = root.getBoundingClientRect();
    const desk = root.closest(".pg-top")?.getBoundingClientRect();
    const old = geo.current.h;
    const w = world.current;
    const r = h * R_PER_H;
    const spawn = m.offsetLeft + m.offsetWidth * chute.x;
    geo.current = { h, spawn };
    w.s = h / 160;
    w.edge = desk ? desk.left - rr.left + 2 : 0;
    w.wall = spawn + r + 1;
    for (const b of w.bodies) {
      if (old && old !== h) {
        const k = h / old;
        b.x *= k;
        b.y *= k;
      }
      b.r = r;
      const hw = halfW(b);
      if (!b.drop) b.x = Math.min(w.wall - hw, Math.max(w.edge + hw, b.x));
    }
    return true;
  }, [chute]);

  /** 1回転したとき：カプセルを1つ出す */
  const dispense = useCallback(() => {
    const w = world.current;
    const { h, spawn } = geo.current;
    if (!h || !gachaPrizes.length) return;
    const n = saved.current.n + 1;
    const rand = randFor(n, now());
    const p = pick(gachaPrizes.length, saved.current.recent, rand);
    const c: 0 | 1 = rand() < 0.5 ? 0 : 1;
    const r = h * R_PER_H;

    // 前のカプセルは机の端へ
    const prev = w.bodies.find((b) => b.id === curId.current);
    if (prev) {
      junkIds.current.push(prev.id);
      shove(w, prev);
    }
    const junkMax = junkRoom(w, r);
    while (junkIds.current.length > junkMax) {
      const old = junkIds.current.shift();
      const b = w.bodies.find((x) => x.id === old);
      if (!b) continue;
      drop(w, b);
    }

    const id = nextId.current++;
    const body: Body = {
      id,
      c,
      p,
      x: spawn,
      y: h * chute.y,
      vx: -(1.3 + rand() * 0.6) * w.s,
      vy: 0.7 * w.s,
      a: rand() * Math.PI * 2,
      r,
      open: false,
      drop: false,
      rest: false,
    };
    w.bodies.push(body);
    curId.current = id;

    saved.current = { ...saved.current, n, recent: [...saved.current.recent, p].slice(-4) };
    setTurns(n);
    setPaper(null);
    syncViews();
    persist();
    run();
  }, [chute, persist, run, syncViews]);

  /** 刻みを1つ進めた見た目（つまみが回る・山が揺れる） */
  const click = useCallback(() => {
    ticks.current += 1;
    setTick(ticks.current);
    if (pileRef.current) {
      pileRef.current.animate(
        [{ transform: "translate(0.6px, -0.8px) rotate(-0.6deg)" }, { transform: "none" }],
        { duration: 90, easing: "ease-out" },
      );
    } else {
      // 山が絵のときは機械ごと小さく揺らす（傾きの transform には触らない）
      machineRef.current?.animate([{ translate: "0.5px -0.6px" }, { translate: "0px 0px" }], {
        duration: 90,
        easing: "ease-out",
      });
    }
  }, []);

  /** 回した角度（°）を足す。刻みをまたいだら1つ進め、1回転でカプセルを出す */
  const advance = useCallback(
    (deg: number) => {
      turnAcc.current += deg;
      while (turnAcc.current >= TICK_DEG * ((ticks.current % TICKS) + 1)) {
        click();
        if (ticks.current % TICKS === 0) {
          turnAcc.current -= 360;
          dispense();
        }
      }
    },
    [click, dispense],
  );

  /** 押すだけのとき：いまの回転の続きを1回転まで自動で回す */
  const autoTurn = useCallback(() => {
    if (auto.current) return;
    const go = () => {
      turnAcc.current = TICK_DEG * ((ticks.current % TICKS) + 1);
      advance(0);
      if (ticks.current % TICKS === 0) {
        auto.current = 0;
        return;
      }
      auto.current = window.setTimeout(go, AUTO_TICK_MS);
    };
    auto.current = window.setTimeout(go, 0);
  }, [advance]);

  /** 開ける（開いていれば紙を広げ直す） */
  const openCur = useCallback(() => {
    const w = world.current;
    const b = w.bodies.find((q) => q.id === curId.current);
    if (!b) return;
    if (!b.open) {
      b.open = true;
      b.a = 0;
      b.vx *= 0.3;
      b.rest = false;
      syncViews();
      persist();
      run();
    }
    paint();
    setPaper({ id: b.id, want: b.x - b.r * 2, folded: false });
  }, [paint, persist, run, syncViews]);

  const play = useCallback((p: number) => {
    const prize = gachaPrizes[p];
    if (!prize) return;
    window.dispatchEvent(new CustomEvent("kb:tv-request", { detail: { youtubeId: prize.youtubeId } }));
  }, []);

  /** 端末に残っていた机の上を戻す（机の大きさが測れてから） */
  const pending = useRef<Saved | null>(null);
  const restore = useCallback(() => {
    const sv = pending.current;
    if (!sv || !measure()) return;
    pending.current = null;
    const { h } = geo.current;
    const r = h * R_PER_H;
    const mk = (q: SavedBody): Body => ({
      id: nextId.current++,
      c: q.c === 1 ? 1 : 0,
      p: q.p >= 0 && q.p < gachaPrizes.length ? q.p : 0,
      x: q.x * h,
      y: 0,
      vx: 0,
      vy: 0,
      a: Number.isFinite(q.a) ? q.a : 0,
      r,
      open: !!q.open,
      drop: false,
      rest: true,
    });
    const junk = sv.junk.map(mk).slice(-junkRoom(world.current, r));
    junkIds.current = junk.map((b) => b.id);
    const cur = sv.cur ? mk(sv.cur) : null;
    world.current.bodies = cur ? [...junk, cur] : junk;
    curId.current = cur?.id ?? 0;
    measure();
    syncViews();
  }, [measure, syncViews]);

  useEffect(() => {
    const sv = load();
    saved.current = sv;
    pending.current = sv;
    setTurns(sv.n);
    restore();
  }, [restore]);

  // 毎回の描き直しのあとに位置を書く（新しく出たカプセルの要素にも）
  useLayoutEffect(() => {
    paint();
  }, [views, paint]);

  // 紙の位置：机の段の自分の枠（＋左の余白）に収まるなら収め、収まらなければ机の左の端から広げる
  useLayoutEffect(() => {
    const el = paperRef.current;
    const root = rootRef.current;
    if (!el || !root || !paper) return;
    const left = Math.max(world.current.edge, Math.min(paper.want, root.clientWidth + 4 - el.offsetWidth));
    el.style.left = `${left.toFixed(1)}px`;
  }, [paper]);

  // 大きさが変わったら測り直す
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (pending.current) restore();
      else if (measure()) paint();
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure, paint, restore]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      if (auto.current) clearTimeout(auto.current);
      raf.current = 0;
      auto.current = 0;
    },
    [],
  );

  // ハンドル：押したまま円を描くように回す（右回りだけ進む。逆には回らない）。動かさずに離すと1回転
  const drag = useRef<{ id: number; x: number; y: number; cx: number; cy: number; last: number; t: number; moved: boolean } | null>(
    null,
  );
  const onKnobDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || auto.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const k = (knobRef.current ?? e.currentTarget).getBoundingClientRect();
    const cx = k.left + k.width / 2;
    const cy = k.top + k.height / 2;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      cx,
      cy,
      // 中心のすぐそばで押したときは向きが定まらないので、離れてから数え始める
      last: Math.hypot(e.clientX - cx, e.clientY - cy) < 5 ? NaN : Math.atan2(e.clientY - cy, e.clientX - cx),
      t: e.timeStamp,
      moved: false,
    };
  };
  const onKnobMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < (e.pointerType === "mouse" ? MOVE_MOUSE : MOVE_TOUCH)) return;
      d.moved = true;
    }
    // 中心のすぐそばでは向きが定まらないので数えない
    if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 5) return;
    const ang = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
    if (Number.isNaN(d.last)) {
      d.last = ang;
      return;
    }
    let da = ang - d.last;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    d.last = ang;
    if (da > 0) advance((da * 180) / Math.PI);
  };
  const onKnobUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (e.type !== "pointerup") return;
    if (!d.moved && e.timeStamp - d.t < TAP_MAX_MS) autoTurn();
  };
  const onKnobKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!e.repeat) autoTurn();
  };

  // 検分用（手元と Preview だけ）：window.__kbGacha.turn()・open()・state・reset()
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbGacha?: unknown };
    w.__kbGacha = {
      turn: () => autoTurn(),
      open: () => openCur(),
      get state() {
        const cur = world.current.bodies.find((b) => b.id === curId.current);
        const prize = cur ? gachaPrizes[cur.p] : null;
        return {
          n: saved.current.n,
          recent: saved.current.recent.map((i) => gachaPrizes[i]?.youtubeId),
          pile: PILE - (saved.current.n % PILE_CYCLE),
          cur: cur ? { year: prize?.year, title: prize?.title, youtubeId: prize?.youtubeId, open: cur.open, x: Math.round(cur.x), rest: cur.rest, color: cur.c ? "blue" : "yellow" } : null,
          junk: junkIds.current.length,
          bodies: world.current.bodies.length,
          moving: !!raf.current,
          ticks: ticks.current,
          reduce: reducedMotion(),
          geo: { ...geo.current, edge: Math.round(world.current.edge), wall: Math.round(world.current.wall) },
          knobHit: (() => {
            const r = rootRef.current?.querySelector(".gc-knob-hit")?.getBoundingClientRect();
            return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
          })(),
        };
      },
      reset: () => {
        clearSaved();
        location.reload();
      },
    };
    return () => {
      delete w.__kbGacha;
    };
  }, [autoTurn, openCur]);

  const pile = PILE - (turns % PILE_CYCLE);
  /** 機械の絵があってハンドルの絵がないとき：機械の絵のつまみの丸を切り出して回す */
  const knobCut = !!art?.machine && !art?.knob;
  const capArt =
    art?.capsule && art?.capsuleOpen
      ? ({ "--cap-art": `url(${art.capsule})`, "--cap-open": `url(${art.capsuleOpen})` } as React.CSSProperties)
      : undefined;
  const curView = views.find((v) => v.cur);
  const paperPrize = paper && !paper.folded ? gachaPrizes[views.find((v) => v.id === paper.id)?.p ?? -1] : null;

  return (
    <div ref={rootRef} className={`gc${art?.machine ? " has-art" : ""}`}>
      <div ref={machineRef} className={`gc-machine${art?.machine ? " has-art" : ""}`}>
        {art?.machine ? <img className="gc-art" src={art.machine} alt="" draggable={false} /> : null}
        {art?.machine ? (
          // 山は絵に描いてある。減った分だけ窓の上から薄く陰らせる
          <span
            className="gc-dim"
            aria-hidden
            style={{ "--gone": ((PILE - pile) / PILE_CYCLE).toFixed(3) } as React.CSSProperties}
          />
        ) : (
          <>
            <span className="gc-lid" aria-hidden />
            <span className="gc-dome" aria-hidden>
              <span ref={pileRef} className="gc-pile">
                {PILE_SPOTS.slice(0, pile).map((s, i) => (
                  <span
                    key={i}
                    className={`gc-ball is-c${s.c}`}
                    style={{ left: `${s.l}%`, bottom: `${s.b}%`, transform: `rotate(${s.r}deg)` }}
                  />
                ))}
              </span>
            </span>
            <span className="gc-body" aria-hidden />
            <span className="gc-chute" aria-hidden>
              <span className="gc-flap" />
            </span>
          </>
        )}
        <div
          className="gc-knob-hit"
          role="button"
          tabIndex={0}
          aria-label="ハンドル"
          onPointerDown={onKnobDown}
          onPointerMove={onKnobMove}
          onPointerUp={onKnobUp}
          onPointerCancel={onKnobUp}
          onLostPointerCapture={onKnobUp}
          onKeyDown={onKnobKey}
        >
          <span
            ref={knobRef}
            className={`gc-knob${art?.knob ? " has-art" : ""}${knobCut ? " is-cut" : ""}`}
            style={
              {
                transform: `rotate(${tick * TICK_DEG}deg)`,
                ...(knobCut ? { "--art": `url(${art?.machine})` } : null),
              } as React.CSSProperties
            }
          >
            {art?.knob ? <img src={art.knob} alt="" draggable={false} /> : knobCut ? null : <i />}
          </span>
        </div>
      </div>

      <div className="gc-desk" aria-hidden={!curView}>
        {views.map((v) => (
          <div
            key={v.id}
            ref={(el) => {
              if (el) els.current.set(v.id, el);
              else els.current.delete(v.id);
            }}
            className={`gc-cap is-c${v.c}${v.open ? " is-open" : ""}${v.cur ? " is-cur" : ""}${capArt ? " has-art" : ""}`}
            style={capArt}
          >
            {capArt ? <span className="gc-cap-whole" /> : null}
            <span className="gc-cap-bot" />
            {v.open && !capArt ? <span className="gc-note" /> : null}
            <span className="gc-cap-top" />
          </div>
        ))}
        {curView ? (
          <button
            ref={hitRef}
            type="button"
            className={`gc-cap-hit${curView.open ? " is-open" : ""}`}
            aria-label="カプセル"
            onClick={openCur}
          />
        ) : null}
      </div>

      {paper && paperPrize ? (
        <div ref={paperRef} className="gc-paper">
          <button
            type="button"
            className="gc-paper-face"
            aria-expanded
            onClick={() => setPaper((q) => (q ? { ...q, folded: true } : q))}
          >
            <span className="gc-paper-year">{paperPrize.year}</span>
            <span className="gc-paper-title">{paperPrize.title}</span>
          </button>
          <button type="button" className="gc-play" aria-label={paperPrize.title} onClick={() => play(views.find((v) => v.id === paper.id)?.p ?? -1)}>
            {"▶︎"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
