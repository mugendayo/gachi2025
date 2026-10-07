"use client";
// 黒板の上乗せ：世界時計の反映・壁の時計・日付の書き換え・こする・懐中電灯。
// DOM の文字が正本（読み上げ・JSなし）。ここでは同じ文字を canvas に写してチョークの質感を付け、
// こすると canvas だけが消える。消したあとの戻り方は2通り（?return=rewrite で切り替え・既定は焼き付き）。
// 初期化はインラインスクリプトに頼らない（ページ内移動で戻ったときはスクリプトが走らないため、ここでも同じ初期化をする）。
import { useEffect } from "react";
import { clockConfig, clockCore, type ClockState } from "@/lib/worldClock";
import { CLOCK_EVENT, now, syncWithServer } from "@/lib/now";

type Item = {
  el: HTMLElement;
  kind: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  font: string;
  size: number;
  color: string;
  dirty: boolean;
};

const EDGE = 24; // 左右の端はこすらない（LINE などの戻るスワイプと取り合わない）
const IDLE_MS = 2400;
const MAX_TIMEOUT = 2147483647;

/** 同じ種からは同じ乱数（全員が同じ消し跡を見る） */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function BoardFx() {
  useEffect(() => {
    const world = document.getElementById("kb-world");
    const board = document.getElementById("kb-board");
    const room = board?.closest(".kb-room") as HTMLElement | null;
    const eraser = board?.querySelector(".kb-eraser") as HTMLElement | null;
    const todayEl = document.getElementById("kb-today");
    if (!world || !board || !room || !eraser || !todayEl) return;

    const params = new URLSearchParams(location.search);
    // ?motion=1：動きを減らす設定の端末でも演出を見る（検分用）
    const reduce = !params.has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mode = params.get("return") === "rewrite" ? "rewrite" : "burn";
    let state: ClockState = clockCore(now(), clockConfig);
    let disposed = false;
    const intervals: number[] = [];
    const timeouts = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
      return id;
    };

    /* ---------------- 世界時計 → 属性と CSS 変数 ---------------- */
    const SVGNS = "http://www.w3.org/2000/svg";
    const nowMark = document.createElement("div");
    nowMark.className = "kb-now";
    nowMark.setAttribute("aria-hidden", "true");
    const markSvg = document.createElementNS(SVGNS, "svg");
    const markPath = document.createElementNS(SVGNS, "path");
    markSvg.appendChild(markPath);
    nowMark.appendChild(markSvg);
    board.appendChild(nowMark);
    let markKey = "";

    // いまの印：文字の箱を外側から囲む、閉じた手描きの輪（実寸の px で描く）
    const placeNowMark = () => {
      const li =
        state.timedRow >= 0 && state.phase !== "sealed" && state.phase !== "after"
          ? (board.querySelector(`.kb-on-${state.dayKey} li[data-row="${state.timedRow}"]`) as HTMLElement | null)
          : null;
      const spans = li ? li.querySelectorAll("[data-chalk]") : null;
      if (!li || !spans || !spans.length) {
        nowMark.hidden = true;
        markKey = "";
        return;
      }
      const b = board.getBoundingClientRect();
      const r0 = (spans[0] as HTMLElement).getBoundingClientRect();
      const r1 = (spans[spans.length - 1] as HTMLElement).getBoundingClientRect();
      const PX = 16;
      const PY = 9;
      const w = Math.round(r1.right - r0.left + PX * 2);
      const h = Math.round(Math.max(r0.height, r1.height) + PY * 2);
      const key = `${state.dayKey}:${state.timedRow}:${w}x${h}`;
      nowMark.hidden = false;
      nowMark.style.left = `${r0.left - b.left - PX}px`;
      nowMark.style.top = `${Math.min(r0.top, r1.top) - b.top - PY}px`;
      nowMark.style.width = `${w}px`;
      nowMark.style.height = `${h}px`;
      if (key === markKey) return;
      markKey = key;
      const r = h / 2;
      markSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      markSvg.setAttribute("width", String(w));
      markSvg.setAttribute("height", String(h));
      markPath.setAttribute(
        "d",
        `M ${r * 0.7} 1.5 L ${w - r} -0.5 A ${r} ${r + 0.5} 0 0 1 ${w - r} ${h + 0.5} L ${r} ${h - 0.5} A ${r} ${r - 0.5} 0 0 1 ${r + 1} 1 L ${r + Math.min(60, w * 0.16)} -2.5`,
      );
      const L = markPath.getTotalLength();
      markPath.style.transition = "none";
      markPath.style.strokeDasharray = `${L}px`;
      markPath.style.strokeDashoffset = reduce ? "0px" : `${L}px`;
      if (!reduce)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            markPath.style.transition = "stroke-dashoffset 1.3s ease 0.3s";
            markPath.style.strokeDashoffset = "0px";
          }),
        );
    };

    const apply = (s: ClockState, prev?: ClockState) => {
      if (prev && prev.lit !== s.lit) {
        // 蛍光灯の点滅：壁・黒板・時計・学級目標を一斉に切り替える
        world.dataset.switching = "";
        later(() => delete world.dataset.switching, 400);
      }
      world.dataset.phase = s.phase;
      world.dataset.day = s.dayKey;
      world.dataset.band = s.band;
      const st = world.style;
      st.setProperty("--sun", s.sun.toFixed(3));
      st.setProperty("--warm", s.warm.toFixed(3));
      st.setProperty("--lit", String(s.lit));
      st.setProperty("--dark", s.dark.toFixed(3));
      st.setProperty("--amb", s.amb.toFixed(3));
      st.setProperty("--sun-az", s.sunAz.toFixed(1));
    };

    const tickHands = () => {
      const j = new Date(now() + 9 * 3600000);
      const sec = j.getUTCSeconds() + j.getUTCMilliseconds() / 1000;
      const min = j.getUTCMinutes() + sec / 60;
      const hr = (j.getUTCHours() % 12) + min / 60;
      world.style.setProperty("--ch", `${hr * 30}deg`);
      world.style.setProperty("--cm", `${min * 6}deg`);
      if (!reduce) world.style.setProperty("--cs", `${Math.floor(sec) * 6}deg`);
    };

    /* ---------------- canvas ---------------- */
    const mk = (cls: string) => {
      const c = document.createElement("canvas");
      c.className = `kb-cv ${cls}`;
      c.setAttribute("aria-hidden", "true");
      board.prepend(c);
      return c;
    };
    const dustC = mk("kb-cv-dust");
    const chalkC = mk("kb-cv-chalk");
    const smearC = mk("kb-cv-smear");
    const ghostC = mk("kb-cv-ghost");
    const chalk = chalkC.getContext("2d")!;
    const smear = smearC.getContext("2d")!;
    const ghost = ghostC.getContext("2d")!;
    const dust = dustC.getContext("2d")!;
    // 文字の canvas だけ高解像度。もや・跡・粉はぼやけていてよいので等倍（メモリを抑える）
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    let items: Item[] = [];

    // チョークの粒（描いた文字をまだらに抜く）
    const grain = document.createElement("canvas");
    grain.width = grain.height = 128;
    {
      const g = grain.getContext("2d")!;
      const r = rng(7);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.6})`;
        g.fillRect(r() * 128, r() * 128, 1 + r() * 1.4, 0.6 + r() * 0.9);
      }
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.25})`;
        g.fillRect(r() * 128, r() * 128, 6 + r() * 18, 0.7);
      }
    }
    const grainPat = chalk.createPattern(grain, "repeat")!;

    // 黒板消しの面（縦長のフェルト。行ごとに抜け方が違う＝拭き跡の筋が残る）
    const SW = 26;
    const SH = 66;
    const stamp = document.createElement("canvas");
    stamp.width = SW * 2;
    stamp.height = SH * 2;
    {
      const g = stamp.getContext("2d")!;
      const r = rng(11);
      for (let y = 0; y < SH * 2; y++) {
        const edge = Math.min(1, Math.min(y, SH * 2 - y) / 14);
        const a = (0.35 + r() * 0.6) * edge;
        const grad = g.createLinearGradient(0, 0, SW * 2, 0);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.25, `rgba(0,0,0,${a})`);
        grad.addColorStop(0.75, `rgba(0,0,0,${a})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(0, y, SW * 2, 1);
      }
    }

    const sizeCanvases = () => {
      W = board.clientWidth;
      H = board.clientHeight;
      for (const [c, ctx, k] of [
        [chalkC, chalk, dpr],
        [smearC, smear, 1],
        [ghostC, ghost, 1],
        [dustC, dust, 1],
      ] as const) {
        c.width = Math.round(W * k);
        c.height = Math.round(H * k);
        c.style.width = `${W}px`;
        c.style.height = `${H}px`;
        ctx.setTransform(k, 0, 0, k, 0, 0);
      }
    };

    const collect = () => {
      board.classList.remove("is-canvas");
      const b = board.getBoundingClientRect();
      items = [...board.querySelectorAll<HTMLElement>("[data-chalk]")]
        .filter((el) => el.getClientRects().length > 0 && el.textContent)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            el,
            kind: el.dataset.chalk || "row",
            text: el.textContent || "",
            x: r.left - b.left,
            y: r.top - b.top,
            w: r.width,
            h: r.height,
            font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
            size: parseFloat(cs.fontSize),
            color: cs.color,
            dirty: false,
          };
        });
      board.classList.add("is-canvas");
    };

    const drawText = (ctx: CanvasRenderingContext2D, it: Item, alpha = 1, clipW?: number) => {
      ctx.save();
      if (clipW !== undefined) {
        ctx.beginPath();
        ctx.rect(it.x - 6, it.y - 6, clipW + 6, it.h + 12);
        ctx.clip();
      }
      ctx.font = it.font;
      ctx.textBaseline = "middle";
      ctx.fillStyle = it.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,255,255,.35)";
      ctx.shadowBlur = it.size * 0.1;
      ctx.fillText(it.text, it.x, it.y + it.h / 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillText(it.text, it.x + 0.7, it.y + it.h / 2 + 0.5);
      ctx.restore();
      if (ctx === chalk) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = grainPat;
        ctx.fillRect(it.x - 6, it.y - 6, it.w + 12, it.h + 12);
        ctx.restore();
      }
    };

    const stampAt = (ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(stamp, x - (SW * scale) / 2, y - (SH * scale) / 2, SW * scale, SH * scale);
      ctx.restore();
    };

    const hazeAt = (x: number, y: number, a = 0.018) => {
      smear.save();
      const g = smear.createRadialGradient(x, y, 0, x, y, 42);
      g.addColorStop(0, `rgba(235,240,232,${a})`);
      g.addColorStop(1, "rgba(235,240,232,0)");
      smear.fillStyle = g;
      smear.fillRect(x - 42, y - 42, 84, 84);
      smear.restore();
    };

    /** 文字の範囲だけに処理を閉じ込める（隣の行を巻き込まない） */
    const clipTo = (it: Item, fn: () => void) => {
      chalk.save();
      chalk.beginPath();
      chalk.rect(it.x - 10, it.y - 6, it.w + 20, it.h + 12);
      chalk.clip();
      fn();
      chalk.restore();
    };

    // 消し残し・かすれは、種で決まった筋で消す（毎回同じ形・その文字の範囲だけ）
    const wipeSeeded = (it: Item, seed: number, passes: number, keep: number, haze = 0.008) =>
      clipTo(it, () => {
        const r = rng(seed);
        for (let p = 0; p < passes; p++) {
          const y = it.y + r() * it.h;
          let x = it.x - 20 + r() * it.w * 0.3;
          const end = it.x + it.w * (0.4 + r() * 0.7);
          while (x < end) {
            if (r() > keep) stampAt(chalk, x, y, 0.5 + r() * 0.5);
            hazeAt(x, y, haze);
            x += 5;
          }
        }
      });

    const isHidden = (it: Item) =>
      (it.kind === "date" && world.dataset.flip === "pending") || (it.kind === "today" && world.dataset.flip !== "pending");

    const drawAll = () => {
      chalk.clearRect(0, 0, W, H);
      smear.clearRect(0, 0, W, H);
      ghost.clearRect(0, 0, W, H);
      if (state.phase === "after") {
        // 片付けのあと：消された黒板だけが残る
        const r = rng(3);
        for (let i = 0; i < 260; i++) hazeAt(r() * W, r() * H, 0.05);
        return;
      }
      for (const it of items) {
        if (isHidden(it)) continue;
        if (it.kind === "remnant") {
          drawText(chalk, it, 0.6);
          wipeSeeded(it, 21, 6, 0.55, 0.008);
          continue;
        }
        drawText(chalk, it);
        if (it.kind === "smudge") wipeSeeded(it, 5, 6, 0.3, 0.01);
        if (mode === "burn" && it.kind !== "today") drawText(ghost, it, 0.2);
      }
    };

    /* ---------------- 粉 ---------------- */
    type P = { x: number; y: number; vx: number; vy: number; a: number; r: number };
    let parts: P[] = [];
    let raf = 0;
    const loop = () => {
      dust.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.a > 0.02 && p.y < H);
      for (const p of parts) {
        p.vy += 0.09;
        p.x += p.vx;
        p.y += p.vy;
        p.a *= 0.975;
        dust.fillStyle = `rgba(240,240,232,${p.a})`;
        dust.fillRect(p.x, p.y, p.r, p.r);
      }
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    };
    const emit = (x: number, y: number) => {
      if (reduce) return;
      for (let i = 0; i < 2; i++)
        parts.push({ x: x + (Math.random() - 0.5) * SW, y: y + (Math.random() - 0.3) * SH * 0.6, vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 0.6, a: 0.5 + Math.random() * 0.4, r: 1 + Math.random() * 1.6 });
      if (!raf) raf = requestAnimationFrame(loop);
    };

    /* ---------------- 消す ---------------- */
    const eraseSeg = (x0: number, y0: number, x1: number, y1: number, clip?: Item) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 4));
      const run = () => {
        for (let i = 1; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const y = y0 + ((y1 - y0) * i) / n;
          stampAt(chalk, x, y);
          // 書き換えのときは拭き跡をごく薄く（止まった日付の地を白くしない）
          hazeAt(x, y, clip ? 0.005 : 0.018);
          if (i % 3 === 0) emit(x, y);
          for (const it of items)
            if (!it.dirty && x > it.x - SW / 2 && x < it.x + it.w + SW / 2 && y > it.y - SH / 2 && y < it.y + it.h + SH / 2) it.dirty = true;
        }
      };
      if (clip) clipTo(clip, run);
      else run();
    };

    /* ---------------- 黒板消し（物） ---------------- */
    let rest = { x: 0, y: 0 };
    const measureRest = () => {
      eraser.style.transform = "";
      const b = board.getBoundingClientRect();
      const r = eraser.getBoundingClientRect();
      rest = { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
    };
    const holdEraser = (x: number, y: number) => {
      eraser.classList.remove("is-moving");
      eraser.classList.add("is-held");
      eraser.style.transform = `translate(${x - rest.x}px, ${y - rest.y}px) rotate(90deg)`;
    };
    const returnEraser = () => {
      eraser.classList.add("is-moving");
      eraser.classList.remove("is-held");
      eraser.style.transform = "";
    };

    /* ---------------- 書き直し（rewrite）／焼き付き（burn） ---------------- */
    let idleTimer = 0;
    let rewriteToken = 0;
    /** 書き終えたら true。途中で黒板に触れられたら false（その行は次の書き直しでやり直す） */
    const rewriteOne = (it: Item, token: number) =>
      new Promise<boolean>((done) => {
        const dur = reduce ? 0 : 160 + it.text.length * 70;
        const t0 = performance.now();
        const step = () => {
          if (token !== rewriteToken || disposed) return done(false);
          const p = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
          chalk.save();
          chalk.globalCompositeOperation = "destination-out";
          chalk.fillRect(it.x - 4, it.y - 2, it.w + 8, it.h + 4);
          chalk.restore();
          drawText(chalk, it, 1, it.w * p);
          if (p < 1) requestAnimationFrame(step);
          else done(true);
        };
        step();
      });
    const scheduleReturn = () => {
      window.clearTimeout(idleTimer);
      if (mode !== "rewrite") return;
      idleTimer = window.setTimeout(async () => {
        const token = ++rewriteToken;
        const queue = items
          .filter((it) => it.dirty && !isHidden(it) && it.kind !== "remnant" && it.kind !== "smudge")
          .sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of queue) {
          if (token !== rewriteToken || disposed) return;
          if (await rewriteOne(it, token)) it.dirty = false;
          await wait(reduce ? 0 : 120);
        }
      }, IDLE_MS);
    };

    /* ---------------- 日付の書き換え（タイムスリップ） ---------------- */
    let flipping = false;
    let pendingLayout = false;
    const settleLayout = () => {
      if (pendingLayout || Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) {
        pendingLayout = false;
        layout();
      }
    };
    const flip = async () => {
      if (flipping || world.dataset.flip !== "pending") return;
      const today = items.find((it) => it.kind === "today");
      const date = items.find((it) => it.kind === "date");
      if (!today || !date) {
        // 書き換えの材料が無い（文字が無い等）：止まった日付をそのまま出す
        world.dataset.flip = "done";
        layout();
        return;
      }
      flipping = true;
      if (reduce) {
        // 動きを止めた人：止まった日付の下に、今日の日付の消し跡が薄く残った静止画
        world.dataset.flip = "done";
        drawAll();
        drawText(smear, today, 0.14);
        flipping = false;
        settleLayout();
        return;
      }
      await wait(1100);
      if (disposed) return;
      measureRest();
      const cy = today.y + today.h / 2;
      const x0 = today.x - 8;
      const x1 = today.x + today.w + 8;
      const pts: [number, number][] = [
        [rest.x, rest.y],
        [x1, cy - 6],
        [x0, cy + 4],
        [x1, cy - 2],
        [x0 + today.w * 0.3, cy + 6],
        [x1, cy],
      ];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const dur = i === 1 ? 420 : 300;
        const t0 = performance.now();
        let px = ax;
        let py = ay;
        await new Promise<void>((done) => {
          const step = () => {
            if (disposed) return done();
            const p = Math.min(1, (performance.now() - t0) / dur);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const x = ax + (bx - ax) * e;
            const y = ay + (by - ay) * e;
            holdEraser(x, y);
            if (i > 1) eraseSeg(px, py, x, y, today);
            px = x;
            py = y;
            if (p < 1) requestAnimationFrame(step);
            else done();
          };
          step();
        });
      }
      returnEraser();
      for (const it of items) it.dirty = false;
      await wait(350);
      if (disposed) return;
      // 見えない手が、止まった日付を書く
      const dur = 1100;
      const t0 = performance.now();
      world.dataset.flip = "done";
      await new Promise<void>((done) => {
        const step = () => {
          if (disposed) return done();
          const p = Math.min(1, (performance.now() - t0) / dur);
          chalk.save();
          chalk.globalCompositeOperation = "destination-out";
          chalk.fillRect(date.x - 4, date.y - 2, date.w + 8, date.h + 4);
          chalk.restore();
          drawText(chalk, date, 1, date.w * p);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        step();
      });
      if (mode === "burn") drawText(ghost, date, 0.2);
      flipping = false;
      settleLayout();
    };

    /* ---------------- 触る（こする・照らす） ---------------- */
    let rubbing = false;
    let armed = false;
    let start = { x: 0, y: 0 };
    let last = { x: 0, y: 0 };
    let lightMoved = false;
    const local = (e: PointerEvent) => {
      const b = board.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const moveLight = (e: PointerEvent) => {
      const r = room.getBoundingClientRect();
      lightMoved = true;
      room.style.setProperty("--fx", `${e.clientX - r.left}px`);
      room.style.setProperty("--fy", `${e.clientY - r.top}px`);
    };
    const beginRub = (e: PointerEvent) => {
      rubbing = true;
      // 実際にこすり始めた時だけ、書き直しを止める（タップや縦スクロールでは止めない）
      rewriteToken++;
      window.clearTimeout(idleTimer);
      try {
        board.setPointerCapture(e.pointerId);
      } catch {}
      measureRest();
    };
    const cancelRub = () => {
      if (rubbing) {
        returnEraser();
        scheduleReturn();
      }
      armed = rubbing = false;
    };
    const onDown = (e: PointerEvent) => {
      // 2本目の指＝ピンチ。こすりを止めて拡大に任せる
      if (!e.isPrimary) return cancelRub();
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (flipping) return;
      const p = local(e);
      if (p.x < EDGE || p.x > W - EDGE) return;
      armed = true;
      start = last = p;
      if (e.pointerType === "mouse") {
        beginRub(e);
        holdEraser(p.x, p.y);
        eraseSeg(p.x, p.y, p.x, p.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      moveLight(e);
      if (!armed) return;
      const p = local(e);
      if (!rubbing) {
        // 指：横に動いたときだけこする（縦はスクロールに任せる）
        const dx = Math.abs(p.x - start.x);
        const dy = Math.abs(p.y - start.y);
        if (dx < 6 && dy < 6) return;
        if (dy >= dx) {
          armed = false;
          return;
        }
        beginRub(e);
      }
      holdEraser(p.x, p.y);
      eraseSeg(last.x, last.y, p.x, p.y);
      last = p;
    };
    board.addEventListener("pointerdown", onDown);
    room.addEventListener("pointermove", onMove);
    board.addEventListener("pointerup", cancelRub);
    board.addEventListener("pointercancel", cancelRub);

    // 消灯のとき、最初に光が少しだけ揺れて「触れる」ことを示す（説明文は置かない）
    const wobble = () => {
      if (reduce || lightMoved || state.dark < 0.5) return;
      const b = board.getBoundingClientRect();
      const r = room.getBoundingClientRect();
      const cx = b.left - r.left + b.width * 0.42;
      const cy = b.top - r.top + b.height * 0.4;
      const t0 = performance.now();
      const step = () => {
        if (lightMoved || disposed) return;
        const t = (performance.now() - t0) / 1000;
        const k = Math.max(0, 1 - t / 2.6);
        room.style.setProperty("--fx", `${cx + Math.sin(t * 5) * 46 * k}px`);
        room.style.setProperty("--fy", `${cy + Math.cos(t * 3.4) * 22 * k}px`);
        if (k > 0) requestAnimationFrame(step);
      };
      step();
    };

    /* ---------------- 組み立て ---------------- */
    const layout = () => {
      sizeCanvases();
      collect();
      drawAll();
      measureRest();
      placeNowMark();
    };

    /** 今日の日付と書き換えの状態を、いまの世界時計に合わせる（インラインスクリプトと同じ初期化） */
    const syncDate = () => {
      if (todayEl.textContent !== state.todayLabel) todayEl.textContent = state.todayLabel;
      if (state.flips) {
        if (world.dataset.flip !== "done") world.dataset.flip = "pending";
      } else delete world.dataset.flip;
    };

    const recompute = () => {
      if (disposed) return;
      const prev = state;
      const next = clockCore(now(), clockConfig);
      state = next;
      apply(next, prev);
      const dayTurned = next.todayLabel !== prev.todayLabel;
      const changed = next.phase !== prev.phase || next.dayKey !== prev.dayKey || dayTurned;
      if (changed) {
        // 解禁の時刻：開いている全員の黒板で、今日の日付が10月31日に書き換わる（光は時刻どおり）
        if (prev.phase === "sealed" && next.phase !== "sealed" && next.flips) world.dataset.flip = "pending";
        syncDate();
        if (flipping) pendingLayout = true;
        else layout();
        if (prev.phase === "sealed" && world.dataset.flip === "pending") later(flip, 1200);
      } else placeNowMark();
      scheduleBoundary();
    };

    // 相の境目（解禁・会期後・日付が変わる0時）ちょうどに計算し直す（15秒ごとの見回りとは別に）
    let boundaryId = 0;
    const scheduleBoundary = () => {
      window.clearTimeout(boundaryId);
      timeouts.delete(boundaryId);
      const t = now();
      const j = new Date(t + 9 * 3600000);
      const nextMidnight = Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate() + 1) - 9 * 3600000;
      const next = [clockConfig.unlockTs, clockConfig.afterTs, nextMidnight].filter((x) => x > t).sort((a, b) => a - b)[0];
      if (next === undefined) return;
      const ms = next - t + 50;
      if (ms < MAX_TIMEOUT) boundaryId = later(recompute, ms);
    };

    const boot = async () => {
      apply(state);
      tickHands();
      syncDate();
      scheduleBoundary();
      try {
        await Promise.race([document.fonts.load("32px ChalkHand"), wait(5000)]);
        await Promise.race([document.fonts.ready, wait(2000)]);
      } catch {}
      if (disposed) return;
      layout();
      wobble();
      if (world.dataset.flip === "pending" && state.phase !== "sealed") flip();
    };
    boot();

    // 端末の時計を、配信元の時刻で1回だけ補正する（?t= のときはしない・lib/now が共有）
    window.addEventListener(CLOCK_EVENT, recompute);
    syncWithServer();

    // 動きを止めた人には秒針を見せず、針の更新も間引く
    intervals.push(window.setInterval(tickHands, reduce ? 15000 : 1000));
    intervals.push(window.setInterval(recompute, 15000));

    let rto = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rto);
      rto = window.setTimeout(() => {
        if (flipping) pendingLayout = true;
        else if (Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) layout();
      }, 200);
    });
    ro.observe(board);

    return () => {
      disposed = true;
      intervals.forEach((t) => window.clearInterval(t));
      timeouts.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(idleTimer);
      window.clearTimeout(rto);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener(CLOCK_EVENT, recompute);
      board.removeEventListener("pointerdown", onDown);
      room.removeEventListener("pointermove", onMove);
      board.removeEventListener("pointerup", cancelRub);
      board.removeEventListener("pointercancel", cancelRub);
      [dustC, chalkC, smearC, ghostC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas");
    };
  }, []);

  return null;
}
