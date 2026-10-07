"use client";
// 黒板の上乗せ：世界時計の反映・壁の時計・日付の書き換え・こする・懐中電灯。
// DOM の文字が正本（読み上げ・JSなし）。ここでは同じ文字を canvas に写してチョークの質感を付け、
// こすると canvas だけが消える。消したあとの戻り方は2通り（?return=rewrite で切り替え・既定は焼き付き）。
import { useEffect } from "react";
import { clockConfig, clockCore, overrideOffset, type ClockState } from "@/lib/worldClock";

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
    if (!world || !board || !room || !eraser) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mode = new URLSearchParams(location.search).get("return") === "rewrite" ? "rewrite" : "burn";
    const override = overrideOffset(location.search, Date.now());
    let offset = override ?? 0;
    const now = () => Date.now() + offset;
    let state: ClockState = clockCore(now(), clockConfig);
    let disposed = false;
    const timers: number[] = [];

    /* ---------------- 世界時計 → 属性と CSS 変数 ---------------- */
    const nowMark = document.createElement("div");
    nowMark.className = "kb-now";
    nowMark.setAttribute("aria-hidden", "true");
    nowMark.innerHTML =
      '<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M10,21 C9,8 38,3 60,4 C86,5 98,11 97,21 C96,33 74,38 50,38 C24,38 4,33 3,21 C3,13 13,7 30,5" /></svg>';
    board.appendChild(nowMark);

    const placeNowMark = () => {
      const li =
        state.timedRow >= 0 && state.phase !== "sealed" && state.phase !== "after"
          ? (board.querySelector(`.kb-on-${state.dayKey} li[data-row="${state.timedRow}"]`) as HTMLElement | null)
          : null;
      if (!li) {
        nowMark.hidden = true;
        return;
      }
      const b = board.getBoundingClientRect();
      const spans = li.querySelectorAll("[data-chalk]");
      const r0 = (spans[0] as HTMLElement).getBoundingClientRect();
      const r1 = (spans[spans.length - 1] as HTMLElement).getBoundingClientRect();
      nowMark.hidden = false;
      nowMark.style.left = `${r0.left - b.left - 20}px`;
      nowMark.style.top = `${r0.top - b.top - 11}px`;
      nowMark.style.width = `${r1.right - r0.left + 38}px`;
      nowMark.style.height = `${Math.max(r0.height, r1.height) + 22}px`;
    };

    const apply = (s: ClockState) => {
      world.dataset.phase = s.phase;
      world.dataset.day = s.dayKey;
      world.dataset.band = s.band;
      const st = world.style;
      st.setProperty("--sun", s.sun.toFixed(3));
      st.setProperty("--warm", s.warm.toFixed(3));
      st.setProperty("--lit", String(s.lit));
      st.setProperty("--dark", String(s.dark));
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
      world.style.setProperty("--cs", `${Math.floor(sec) * 6}deg`);
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
      for (const [c, ctx] of [
        [chalkC, chalk],
        [smearC, smear],
        [ghostC, ghost],
        [dustC, dust],
      ] as const) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
        c.style.width = `${W}px`;
        c.style.height = `${H}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    const hazeAt = (x: number, y: number, a = 0.06) => {
      smear.save();
      const g = smear.createRadialGradient(x, y, 0, x, y, 42);
      g.addColorStop(0, `rgba(235,240,232,${a})`);
      g.addColorStop(1, "rgba(235,240,232,0)");
      smear.fillStyle = g;
      smear.fillRect(x - 42, y - 42, 84, 84);
      smear.restore();
    };

    // 消し残し・かすれは、種で決まった筋で消す（毎回同じ形）
    const wipeSeeded = (it: Item, seed: number, passes: number, keep: number, haze = 0.02) => {
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
    };

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
      if (clip) {
        chalk.save();
        chalk.beginPath();
        chalk.rect(clip.x - 10, clip.y - 6, clip.w + 20, clip.h + 12);
        chalk.clip();
      }
      for (let i = 1; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * i) / n;
        stampAt(chalk, x, y);
        hazeAt(x, y, clip ? 0.03 : 0.06);
        if (i % 3 === 0) emit(x, y);
        for (const it of items)
          if (!it.dirty && x > it.x - SW / 2 && x < it.x + it.w + SW / 2 && y > it.y - SH / 2 && y < it.y + it.h + SH / 2) it.dirty = true;
      }
      if (clip) chalk.restore();
    };

    /* ---------------- 黒板消し（物） ---------------- */
    let rest = { x: 0, y: 0 };
    const measureRest = () => {
      eraser.style.transform = "";
      const b = board.getBoundingClientRect();
      const r = eraser.getBoundingClientRect();
      rest = { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
    };
    const holdEraser = (x: number, y: number, instant = true) => {
      eraser.classList.toggle("is-moving", !instant);
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
    const rewriteOne = async (it: Item, token: number) => {
      const dur = reduce ? 0 : 160 + it.text.length * 70;
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const step = () => {
          if (token !== rewriteToken) return done();
          const p = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
          chalk.save();
          chalk.globalCompositeOperation = "destination-out";
          chalk.fillRect(it.x - 4, it.y - 2, it.w + 8, it.h + 4);
          chalk.restore();
          drawText(chalk, it, 1, it.w * p);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        step();
      });
      it.dirty = false;
    };
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
          await rewriteOne(it, token);
          await wait(reduce ? 0 : 120);
        }
      }, IDLE_MS);
    };

    /* ---------------- 日付の書き換え（タイムスリップ） ---------------- */
    let flipping = false;
    const flip = async () => {
      const today = items.find((it) => it.kind === "today");
      const date = items.find((it) => it.kind === "date");
      if (!today || !date) return;
      flipping = true;
      if (reduce) {
        // 動きを止めた人：11月の日付の下に、今日の日付の消し跡が残った静止画
        world.dataset.flip = "done";
        drawText(smear, today, 0.14);
        drawText(chalk, date);
        if (mode === "burn") drawText(ghost, date, 0.2);
        flipping = false;
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
      // 見えない手が、止まった日付を書く
      const dur = 1100;
      const t0 = performance.now();
      world.dataset.flip = "done";
      await new Promise<void>((done) => {
        const step = () => {
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
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (flipping) return;
      const p = local(e);
      if (p.x < EDGE || p.x > W - EDGE) return;
      armed = true;
      rubbing = e.pointerType === "mouse";
      start = last = p;
      rewriteToken++;
      window.clearTimeout(idleTimer);
      if (rubbing) {
        board.setPointerCapture(e.pointerId);
        measureRest();
        holdEraser(p.x, p.y);
        eraseSeg(p.x, p.y, p.x, p.y);
      }
    };
    const onMove = (e: PointerEvent) => {
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
        rubbing = true;
        board.setPointerCapture(e.pointerId);
        measureRest();
      }
      holdEraser(p.x, p.y);
      eraseSeg(last.x, last.y, p.x, p.y);
      last = p;
    };
    const onUp = () => {
      if (rubbing) {
        returnEraser();
        scheduleReturn();
      }
      armed = rubbing = false;
    };
    board.addEventListener("pointerdown", onDown);
    room.addEventListener("pointermove", onMove);
    board.addEventListener("pointerup", onUp);
    board.addEventListener("pointercancel", onUp);

    // 消灯のとき、最初に光が少しだけ揺れて「触れる」ことを示す（説明文は置かない）
    const wobble = () => {
      if (reduce || lightMoved || state.dark !== 1) return;
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

    const boot = async () => {
      apply(state);
      tickHands();
      if (state.flips) world.dataset.flip = "pending";
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

    // 端末の時計を、配信元の時刻で1回だけ補正する（?t= のときはしない）
    if (override === null) {
      fetch(location.pathname, { method: "HEAD", cache: "no-store" })
        .then((res) => {
          const d = Date.parse(res.headers.get("date") || "");
          if (Number.isFinite(d) && Math.abs(d - Date.now()) > 60000) offset = d - Date.now();
        })
        .catch(() => {});
    }

    timers.push(window.setInterval(tickHands, 1000));
    timers.push(
      window.setInterval(() => {
        const next = clockCore(now(), clockConfig);
        const changed = next.phase !== state.phase || next.dayKey !== state.dayKey;
        const wasSealed = state.phase === "sealed";
        state = next;
        apply(state);
        if (changed) {
          if (state.flips && wasSealed) world.dataset.flip = "pending";
          layout();
          // 解禁の瞬間：開いている全員の教室に灯りがつき、日付が書き換わる
          if (wasSealed && world.dataset.flip === "pending") window.setTimeout(flip, 1200);
        } else placeNowMark();
      }, 15000),
    );

    let rto = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rto);
      rto = window.setTimeout(() => {
        if (!flipping && Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) layout();
      }, 200);
    });
    ro.observe(board);

    return () => {
      disposed = true;
      timers.forEach((t) => window.clearInterval(t));
      window.clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      board.removeEventListener("pointerdown", onDown);
      room.removeEventListener("pointermove", onMove);
      board.removeEventListener("pointerup", onUp);
      board.removeEventListener("pointercancel", onUp);
      [dustC, chalkC, smearC, ghostC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas");
    };
  }, []);

  return null;
}
