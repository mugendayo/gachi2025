"use client";
// 黒板の上乗せ：世界時計の反映・壁の時計・こする・チョークで書く・懐中電灯・時間帯の仕掛け。
// DOM の文字が正本（読み上げ・JSなし）。ここでは同じ文字を canvas に写してチョークの質感を付け、
// こすると canvas だけが消える。消したあとの戻り方は2通り（?return=rewrite で切り替え・既定は焼き付き）。
// 粉受けのチョークを拾うと、黒板に好きな文字を書ける（落書きはその端末に残る）。
// 時間帯の仕掛け：蛍光灯がまたたいて点く／消灯で消える／0時に「あと◯日」と日付を黒板消しで消して書き直す／
// 入口のタイムスリップで着いたとき、日付と残り日数が書かれる。
// 初期化はインラインスクリプトに頼らない（ページ内移動で戻ったときはスクリプトが走らないため、ここでも同じ初期化をする）。
import { useEffect } from "react";
import { clockConfig, clockCore, debugAllowed, type ClockState } from "@/lib/worldClock";
import { SCENE_EVENT } from "./Signboard";
import { ARRIVE_EVENT, CLOCK_EVENT, now, syncWithServer } from "@/lib/now";
import { site } from "@/data/site";

type Item = {
  el: HTMLElement;
  kind: string;
  text: string;
  /** 外接矩形（回転していればその外接） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 回転前の大きさと角度（落書き） */
  uw: number;
  uh: number;
  rot: number;
  font: string;
  size: number;
  color: string;
  dirty: boolean;
};

type Stroke = { t: "c" | "e"; c?: string; p: number[] };

const EDGE = 24; // 左右の端はこすらない（LINE などの戻るスワイプと取り合わない）
const IDLE_MS = 2400;
const MAX_TIMEOUT = 2147483647;
const DOODLE_KEY = `gbf_${site.year}_doodle`;
const DOODLE_MAX_POINTS = 12000;
const CHALK_IDLE_MS = 10000; // 指でチョークを持ったまま放っておくと、粉受けに戻す（スクロールできなくならないように）

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
    const countEl = document.getElementById("kb-count");
    if (!world || !board || !room || !eraser || !todayEl || !countEl) return;

    const params = new URLSearchParams(location.search);
    // ?motion=1：動きを減らす設定の端末でも演出を見る（検分用）
    const reduce = !params.has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let state: ClockState = clockCore(now(), clockConfig);
    // 戻り方：深夜だけ「誰もいないのに書き直される」、ほかの帯は焼き付き（?return=rewrite は検分用・本番では効かない）
    const forceRewrite = debugAllowed() && params.get("return") === "rewrite";
    const modeOf = (s: ClockState) => (forceRewrite || s.scene === "shinya" ? "rewrite" : "burn");
    let mode = modeOf(state);
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

    // いまの印（会期中だけ）：その日の時刻のある行を、外側から閉じた手描きの輪で囲む（実寸の px で描く）
    const placeNowMark = () => {
      let target: Element[] = [];
      if (state.phase === "live") {
        if (state.dayKey === "d4") {
          const f = board.querySelector(".kb-finale");
          if (f) target = [...f.querySelectorAll("[data-chalk]")];
        } else if (state.timedRow >= 0) {
          const li = board.querySelector(`.kb-dayblock[data-key="${state.dayKey}"] li[data-row="${state.timedRow}"]`);
          if (li) target = [...li.querySelectorAll("[data-chalk]")];
        }
      }
      if (!target.length) {
        nowMark.hidden = true;
        markKey = "";
        return;
      }
      const b = board.getBoundingClientRect();
      const rs = target.map((el) => el.getBoundingClientRect());
      const left = Math.min(...rs.map((r) => r.left));
      const right = Math.max(...rs.map((r) => r.right));
      const top = Math.min(...rs.map((r) => r.top));
      const bottom = Math.max(...rs.map((r) => r.bottom));
      const PX = 16;
      const PY = 9;
      const w = Math.round(right - left + PX * 2);
      const h = Math.round(bottom - top + PY * 2);
      const key = `${state.dayKey}:${state.timedRow}:${w}x${h}`;
      nowMark.hidden = false;
      nowMark.style.left = `${left - b.left - PX}px`;
      nowMark.style.top = `${top - b.top - PY}px`;
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
        // 蛍光灯：点くときはまたたいてから点き、消灯は一瞬またたいて消える
        world.dataset.switching = "";
        later(() => delete world.dataset.switching, 400);
        if (!reduce) {
          world.dataset.flicker = s.lit ? "on" : "off";
          later(() => delete world.dataset.flicker, 900);
        }
      }
      world.dataset.phase = s.phase;
      world.dataset.day = s.dayKey;
      world.dataset.band = s.band;
      world.dataset.scene = s.scene;
      world.dataset.hands = String(s.handCount);
      if (!prev || prev.scene !== s.scene || prev.handNight !== s.handNight)
        window.dispatchEvent(new CustomEvent(SCENE_EVENT, { detail: { scene: s.scene, handNight: s.handNight } }));
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

    /** 黒板の日付と見出しを、いまの世界時計に合わせる（インラインスクリプトと同じ。ページ内移動で戻ったときのため） */
    const syncText = () => {
      if (todayEl.textContent !== state.todayLabel) todayEl.textContent = state.todayLabel;
      if (countEl.textContent !== state.countLabel) countEl.textContent = state.countLabel;
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
    const doodleC = mk("kb-cv-doodle");
    const chalkC = mk("kb-cv-chalk");
    const smearC = mk("kb-cv-smear");
    const ghostC = mk("kb-cv-ghost");
    const chalk = chalkC.getContext("2d")!;
    const doodle = doodleC.getContext("2d")!;
    const smear = smearC.getContext("2d")!;
    const ghost = ghostC.getContext("2d")!;
    const dust = dustC.getContext("2d")!;
    // 文字と落書きの canvas だけ高解像度。もや・跡・粉はぼやけていてよいので等倍（メモリを抑える）
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    let items: Item[] = [];

    // チョークの粒（描いた文字をまだらに抜く）
    const makeGrain = (seed: number, strong: number) => {
      const grain = document.createElement("canvas");
      grain.width = grain.height = 128;
      const g = grain.getContext("2d")!;
      const r = rng(seed);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(0,0,0,${(0.15 + r() * 0.6) * strong})`;
        g.fillRect(r() * 128, r() * 128, 1 + r() * 1.4, 0.6 + r() * 0.9);
      }
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(0,0,0,${(0.12 + r() * 0.25) * strong})`;
        g.fillRect(r() * 128, r() * 128, 6 + r() * 18, 0.7);
      }
      return grain;
    };
    const grainPat = chalk.createPattern(makeGrain(7, 1), "repeat")!;
    const doodleGrain = doodle.createPattern(makeGrain(13, 0.55), "repeat")!;

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
        [doodleC, doodle, dpr],
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
            uw: el.offsetWidth,
            uh: el.offsetHeight,
            rot: parseFloat(el.dataset.rot || "0") || 0,
            font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
            size: parseFloat(cs.fontSize),
            color: cs.color,
            dirty: false,
          };
        });
      board.classList.add("is-canvas");
    };

    const drawText = (ctx: CanvasRenderingContext2D, it: Item, alpha = 1, clipFrac?: number) => {
      ctx.save();
      // 回転している文字（落書き）は、中心で回してから描く
      ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
      if (it.rot) ctx.rotate((it.rot * Math.PI) / 180);
      const left = -it.uw / 2;
      if (clipFrac !== undefined) {
        ctx.beginPath();
        ctx.rect(left - 6, -it.uh / 2 - 6, it.uw * clipFrac + 6, it.uh + 12);
        ctx.clip();
      }
      ctx.font = it.font;
      ctx.textBaseline = "middle";
      ctx.fillStyle = it.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,255,255,.35)";
      ctx.shadowBlur = it.size * 0.1;
      ctx.fillText(it.text, left, 0);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillText(it.text, left + 0.7, 0.5);
      ctx.restore();
      if (ctx === chalk) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = grainPat;
        ctx.fillRect(it.x - 6, it.y - 6, it.w + 12, it.h + 12);
        ctx.restore();
      }
    };

    const clearItem = (it: Item) => {
      chalk.save();
      chalk.globalCompositeOperation = "destination-out";
      chalk.fillRect(it.x - 4, it.y - 2, it.w + 8, it.h + 4);
      chalk.restore();
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

    // かすれた行は、種で決まった筋で消す（毎回同じ形・その文字の範囲だけ）
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
        drawText(chalk, it);
        if (it.kind === "smudge") wipeSeeded(it, 5, 6, 0.3, 0.01);
        if (mode === "burn") drawText(ghost, it, 0.2);
      }
    };

    /* ---------------- 落書き（チョークで書く・その端末に残す） ---------------- */
    let strokes: Stroke[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem(DOODLE_KEY) || "null");
      if (raw && Array.isArray(raw.s)) strokes = raw.s;
    } catch {}
    let saveTimer = 0;
    const saveDoodle = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        let total = strokes.reduce((n, s) => n + s.p.length / 2, 0);
        while (total > DOODLE_MAX_POINTS && strokes.length > 1) total -= strokes.shift()!.p.length / 2;
        try {
          localStorage.setItem(DOODLE_KEY, JSON.stringify({ s: strokes }));
        } catch {}
      }, 400);
    };
    const chalkLine = (x0: number, y0: number, x1: number, y1: number, color: string) => {
      doodle.save();
      doodle.strokeStyle = color;
      doodle.lineCap = "round";
      doodle.lineJoin = "round";
      doodle.lineWidth = 3.6;
      doodle.globalAlpha = 0.92;
      doodle.shadowColor = "rgba(255,255,255,.3)";
      doodle.shadowBlur = 1.5;
      doodle.beginPath();
      doodle.moveTo(x0, y0);
      doodle.lineTo(x1, y1);
      doodle.stroke();
      doodle.restore();
      doodle.save();
      doodle.globalCompositeOperation = "destination-out";
      doodle.fillStyle = doodleGrain;
      doodle.fillRect(Math.min(x0, x1) - 3, Math.min(y0, y1) - 3, Math.abs(x1 - x0) + 6, Math.abs(y1 - y0) + 6);
      doodle.restore();
    };
    const replayDoodle = () => {
      doodle.clearRect(0, 0, W, H);
      for (const s of strokes) {
        for (let i = 2; i < s.p.length; i += 2) {
          const x0 = s.p[i - 2] * W;
          const y0 = s.p[i - 1] * H;
          const x1 = s.p[i] * W;
          const y1 = s.p[i + 1] * H;
          if (s.t === "c") chalkLine(x0, y0, x1, y1, s.c || "#f2f0e6");
          else {
            const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
            for (let k = 1; k <= n; k++) stampAt(doodle, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
          }
        }
      }
    };
    const norm = (v: number, d: number) => Math.round((v / d) * 10000) / 10000;

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
    const emit = (x: number, y: number, spread = SW, n = 2) => {
      if (reduce) return;
      for (let i = 0; i < n; i++)
        parts.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.3) * SH * 0.6, vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 0.6, a: 0.5 + Math.random() * 0.4, r: 1 + Math.random() * 1.6 });
      if (!raf) raf = requestAnimationFrame(loop);
    };

    /* ---------------- 消す ---------------- */
    let eraseStroke: Stroke | null = null;
    const eraseSeg = (x0: number, y0: number, x1: number, y1: number, clip?: Item) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 4));
      const run = () => {
        for (let i = 1; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const y = y0 + ((y1 - y0) * i) / n;
          stampAt(chalk, x, y);
          if (!clip) stampAt(doodle, x, y);
          // 見えない手の書き直しのときは拭き跡をごく薄く（日付の地を白くしない）
          hazeAt(x, y, clip ? 0.005 : 0.018);
          if (i % 3 === 0) emit(x, y);
          for (const it of items)
            if (!it.dirty && x > it.x - SW / 2 && x < it.x + it.w + SW / 2 && y > it.y - SH / 2 && y < it.y + it.h + SH / 2) it.dirty = true;
        }
      };
      if (clip) clipTo(clip, run);
      else run();
      if (eraseStroke) eraseStroke.p.push(norm(x1, W), norm(y1, H));
    };

    /* ---------------- 道具（黒板消し・チョーク） ---------------- */
    type Tool = { kind: "eraser"; el: HTMLElement } | { kind: "chalk"; el: HTMLElement; color: string };
    let tool: Tool = { kind: "eraser", el: eraser };
    const restOf = new Map<HTMLElement, { x: number; y: number }>();
    const measureRest = (el: HTMLElement) => {
      el.style.transform = "";
      const b = board.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const rest = { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
      restOf.set(el, rest);
      return rest;
    };
    const hold = (el: HTMLElement, x: number, y: number, angle: number) => {
      const rest = restOf.get(el) || measureRest(el);
      el.classList.remove("is-moving");
      el.classList.add("is-held");
      el.style.transform = `translate(${x - rest.x}px, ${y - rest.y}px) rotate(${angle}deg)`;
    };
    const putBack = (el: HTMLElement) => {
      el.classList.add("is-moving");
      el.classList.remove("is-held");
      el.style.transform = "";
    };
    let chalkIdle = 0;
    let lastPointerType = "mouse";
    const selectTool = (next: Tool) => {
      if (tool.kind === "chalk") {
        putBack(tool.el);
        tool.el.classList.remove("is-picked");
        tool.el.setAttribute("aria-pressed", "false");
      }
      tool = next;
      eraser.setAttribute("aria-pressed", String(next.kind === "eraser"));
      board.classList.toggle("is-drawing", next.kind === "chalk");
      window.clearTimeout(chalkIdle);
      if (next.kind === "chalk") {
        next.el.classList.add("is-picked");
        next.el.setAttribute("aria-pressed", "true");
        armChalkIdle();
      }
    };
    const armChalkIdle = () => {
      window.clearTimeout(chalkIdle);
      if (tool.kind === "chalk" && lastPointerType !== "mouse")
        chalkIdle = window.setTimeout(() => selectTool({ kind: "eraser", el: eraser }), CHALK_IDLE_MS);
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
          clearItem(it);
          drawText(chalk, it, 1, p);
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
        const queue = items.filter((it) => it.dirty && it.kind !== "smudge").sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of queue) {
          if (token !== rewriteToken || disposed) return;
          if (await rewriteOne(it, token)) it.dirty = false;
          await wait(reduce ? 0 : 120);
        }
      }, IDLE_MS);
    };

    /* ---------------- 見えない手の板書（着いたとき・0時） ---------------- */
    let busy = false;
    let pendingLayout = false;
    const settleLayout = () => {
      if (pendingLayout || Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) {
        pendingLayout = false;
        layout();
      }
    };
    /** 黒板消しがその文字の上を往復して消す */
    const wipeItem = async (it: Item) => {
      const rest = measureRest(eraser);
      const cy = it.y + it.h / 2;
      const x0 = it.x - 8;
      const x1 = it.x + it.w + 8;
      const pts: [number, number][] = [
        [rest.x, rest.y],
        [x1, cy - 6],
        [x0, cy + 4],
        [x1, cy - 2],
        [x0 + it.w * 0.3, cy + 6],
        [x1, cy],
      ];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const dur = i === 1 ? 420 : 260;
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
            hold(eraser, x, y, 90);
            if (i > 1) eraseSeg(px, py, x, y, it);
            px = x;
            py = y;
            if (p < 1) requestAnimationFrame(step);
            else done();
          };
          step();
        });
      }
      putBack(eraser);
    };
    /** 見えない手が書く（左から右へ） */
    const writeItem = (it: Item, dur: number) =>
      new Promise<void>((done) => {
        const t0 = performance.now();
        const step = () => {
          if (disposed) return done();
          const p = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
          clearItem(it);
          drawText(chalk, it, 1, p);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        step();
      });
    const handWrite = async (kinds: string[], wipeFirst: boolean) => {
      if (busy || state.phase === "after") return;
      busy = true;
      if (!reduce && wipeFirst) {
        for (const it of items.filter((i) => kinds.includes(i.kind))) await wipeItem(it);
        await wait(250);
      }
      syncText();
      // 文字が変わると位置も変わるので、測り直してから書く
      sizeCanvases();
      collect();
      drawAll();
      replayDoodle();
      placeNowMark();
      const targets = items.filter((i) => kinds.includes(i.kind));
      if (!reduce) {
        targets.forEach(clearItem);
        for (const it of targets) {
          await writeItem(it, 300 + it.text.length * 90);
          if (mode === "burn") drawText(ghost, it, 0.2);
          await wait(160);
        }
      }
      busy = false;
      settleLayout();
    };

    /* ---------------- 触る（こする・書く・照らす） ---------------- */
    let active: "rub" | "draw" | null = null;
    let armed = false;
    let start = { x: 0, y: 0 };
    let last = { x: 0, y: 0 };
    let lightMoved = false;
    let drawStroke: Stroke | null = null;
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
    const capture = (e: PointerEvent) => {
      try {
        board.setPointerCapture(e.pointerId);
      } catch {}
    };
    const beginRub = (e: PointerEvent) => {
      active = "rub";
      // 実際にこすり始めた時だけ、書き直しを止める（タップや縦スクロールでは止めない）
      rewriteToken++;
      window.clearTimeout(idleTimer);
      capture(e);
      measureRest(eraser);
      if (strokes.length) eraseStroke = { t: "e", p: [norm(last.x, W), norm(last.y, H)] };
    };
    const endTouch = () => {
      if (active === "rub") {
        putBack(eraser);
        scheduleReturn();
        if (eraseStroke && eraseStroke.p.length > 2) {
          strokes.push(eraseStroke);
          saveDoodle();
        }
      }
      if (active === "draw" && drawStroke) {
        if (drawStroke.p.length > 2) {
          strokes.push(drawStroke);
          saveDoodle();
        }
        armChalkIdle();
      }
      eraseStroke = drawStroke = null;
      armed = false;
      active = null;
    };
    const onDown = (e: PointerEvent) => {
      lastPointerType = e.pointerType;
      // 2本目の指＝ピンチ。こすり・書きを止めて拡大に任せる
      if (!e.isPrimary) return endTouch();
      // 粉受けの道具を押した：持ち替える（持っているチョークをもう一度押すと粉受けに戻す）
      const toolEl = (e.target as HTMLElement).closest<HTMLElement>("[data-tool]");
      if (toolEl) {
        e.preventDefault();
        if (toolEl.dataset.tool === "chalk" && !(tool.kind === "chalk" && tool.el === toolEl))
          selectTool({ kind: "chalk", el: toolEl, color: toolEl.dataset.color || "#f2f0e6" });
        else selectTool({ kind: "eraser", el: eraser });
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (busy) return;
      const p = local(e);
      if (tool.kind === "chalk") {
        // チョーク：どの向きにも書ける（持っている間は黒板の上でスクロールしない）
        e.preventDefault();
        window.clearTimeout(chalkIdle);
        active = "draw";
        capture(e);
        start = last = p;
        drawStroke = { t: "c", c: tool.color, p: [norm(p.x, W), norm(p.y, H)] };
        chalkLine(p.x, p.y, p.x + 0.1, p.y + 0.1, tool.color);
        hold(tool.el, p.x, p.y, -35);
        return;
      }
      if (p.x < EDGE || p.x > W - EDGE) return;
      armed = true;
      start = last = p;
      if (e.pointerType === "mouse") {
        beginRub(e);
        hold(eraser, p.x, p.y, 90);
        eraseSeg(p.x, p.y, p.x, p.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      moveLight(e);
      const p = local(e);
      if (active === "draw" && tool.kind === "chalk" && drawStroke) {
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
        chalkLine(last.x, last.y, p.x, p.y, tool.color);
        if (Math.random() < 0.15) emit(p.x, p.y, 4, 1);
        drawStroke.p.push(norm(p.x, W), norm(p.y, H));
        hold(tool.el, p.x, p.y, -35);
        last = p;
        return;
      }
      if (!armed) return;
      if (active !== "rub") {
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
      hold(eraser, p.x, p.y, 90);
      eraseSeg(last.x, last.y, p.x, p.y);
      last = p;
    };
    board.addEventListener("pointerdown", onDown);
    room.addEventListener("pointermove", onMove);
    board.addEventListener("pointerup", endTouch);
    board.addEventListener("pointercancel", endTouch);

    // 消灯のとき、懐中電灯がひとりでに少し揺れて「触れる」ことを示す（説明文は置かない）。
    // 看板に手形があれば、いちばん近い手形を照らして止まる
    const wobble = () => {
      if (reduce || lightMoved || state.dark < 0.5) return;
      const b = board.getBoundingClientRect();
      const r = room.getBoundingClientRect();
      if (!b.width) return;
      let ex = b.left - r.left + b.width * 0.42;
      let ey = b.top - r.top + Math.min(b.height * 0.4, 360);
      const hands = [...room.querySelectorAll<SVGElement>(".kb-sign-front .kb-hp")].filter((h) => getComputedStyle(h).opacity !== "0");
      if (hands.length) {
        const vh = window.innerHeight;
        const near = hands
          .map((h) => h.getBoundingClientRect())
          .sort((p, q) => Math.abs(p.top - vh * 0.6) - Math.abs(q.top - vh * 0.6))[0];
        ex = near.left - r.left + near.width / 2;
        ey = near.top - r.top + near.height / 2;
      }
      const sx = ex - 120;
      const sy = ey - 80;
      const t0 = performance.now();
      const step = () => {
        if (lightMoved || disposed) return;
        const t = (performance.now() - t0) / 1000;
        const k = Math.max(0, 1 - t / 2.6);
        const e = 1 - k * k;
        room.style.setProperty("--fx", `${sx + (ex - sx) * e + Math.sin(t * 5) * 40 * k}px`);
        room.style.setProperty("--fy", `${sy + (ey - sy) * e + Math.cos(t * 3.4) * 20 * k}px`);
        if (k > 0) requestAnimationFrame(step);
      };
      step();
    };

    /* ---------------- 組み立て ---------------- */
    const layout = () => {
      sizeCanvases();
      collect();
      drawAll();
      replayDoodle();
      restOf.clear();
      placeNowMark();
    };

    const recompute = () => {
      if (disposed) return;
      const prev = state;
      const next = clockCore(now(), clockConfig);
      state = next;
      apply(next, prev);
      const nextMode = modeOf(next);
      if (nextMode !== mode) {
        // 深夜に入る・明ける：戻り方が変わるので、焼き付きの層を描き直す
        mode = nextMode;
        if (busy || active) pendingLayout = true;
        else later(layout, 0);
      }
      const dayTurned = next.todayLabel !== prev.todayLabel;
      if (dayTurned && next.phase !== "after") {
        // 0時：黒板消しで「あと◯日」と日付を消して、見えない手が書き直す
        handWrite(["date", "count"], true);
      } else if (next.phase !== prev.phase || next.dayKey !== prev.dayKey) {
        syncText();
        if (busy || active) pendingLayout = true;
        else layout();
      } else placeNowMark();
      scheduleBoundary();
    };

    // 境目（解禁・会期後・日付が変わる0時）ちょうどに計算し直す（15秒ごとの見回りとは別に）
    let boundaryId = 0;
    const scheduleBoundary = () => {
      window.clearTimeout(boundaryId);
      timeouts.delete(boundaryId);
      const t = now();
      const j = new Date(t + 9 * 3600000);
      const nextMidnight = Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate() + 1) - 9 * 3600000;
      // 時間割の時刻のある行の境目（帯の切り替わり）と、毎正時（手形が増える）
      const dayStart = nextMidnight - 86400000;
      const rows = clockConfig.sceneStarts.map(([, m]) => dayStart + m * 60000);
      const nextHour = Math.floor((t + 9 * 3600000) / 3600000) * 3600000 + 3600000 - 9 * 3600000;
      const next = [clockConfig.unlockTs, clockConfig.afterTs, nextMidnight, nextHour, ...rows]
        .filter((x) => x > t)
        .sort((a, b) => a - b)[0];
      if (next === undefined) return;
      const ms = next - t + 50;
      if (ms < MAX_TIMEOUT) boundaryId = later(recompute, ms);
    };

    const onArrive = () => {
      // 入口のタイムスリップで着いた：見えない手が今日の日付と残り日数を書く（門が開いた直後なので測り直してから）。
      // 消灯中なら、懐中電灯がひとりでに揺れて手形を照らす
      if (Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) layout();
      lightMoved = false;
      later(wobble, reduce ? 0 : 200);
      later(() => handWrite(["date", "count"], false), reduce ? 0 : 350);
    };

    const boot = async () => {
      apply(state);
      tickHands();
      syncText();
      scheduleBoundary();
      try {
        await Promise.race([document.fonts.load("32px ChalkHand"), wait(5000)]);
        await Promise.race([document.fonts.ready, wait(2000)]);
      } catch {}
      if (disposed) return;
      layout();
      if (world.dataset.gate === "open") wobble();
    };
    boot();

    window.addEventListener(ARRIVE_EVENT, onArrive);
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
        if (busy || active) pendingLayout = true;
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
      window.clearTimeout(chalkIdle);
      window.clearTimeout(saveTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener(ARRIVE_EVENT, onArrive);
      window.removeEventListener(CLOCK_EVENT, recompute);
      board.removeEventListener("pointerdown", onDown);
      room.removeEventListener("pointermove", onMove);
      board.removeEventListener("pointerup", endTouch);
      board.removeEventListener("pointercancel", endTouch);
      [dustC, doodleC, chalkC, smearC, ghostC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas", "is-drawing");
    };
  }, []);

  return null;
}
