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
import { ARRIVE_EVENT, CLOCK_EVENT, DEPART_EVENT, now, syncWithServer } from "@/lib/now";
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
// 落書きの保存先：列の組み方（PC＝3列／スマホ＝縦）で文字の並びが変わるので分ける。座標は x も y も黒板の幅で割る（回転・幅の変化で伸び縮みしない）
const doodleKey = () => `gbf_${site.year}_doodle_v2:${window.matchMedia("(min-width: 900px)").matches ? "wide" : "narrow"}`;
const DOODLE_MAX_POINTS = 12000;
// こすったときの消え方：一度では消えず、少しずつかすれていく（1往復でおよそ半分残る。向きによらず同じ）
const RUB_KEEP = 0.5;
// にじみ：こすった向きへ、すくった粉を薄く置き直す濃さ
const SMUDGE = 0.22;
// 誰もいない教室（見えない手が落書きしたり消したりする帯）と、触られていない時間
const QUIET_SCENES = new Set(["akegata", "asa", "yugata", "shinya"]);
const GHOST_IDLE_MS = 12000;

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
    if (params.has("motion")) world.dataset.motionForced = "";
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
      if (countEl.parentElement) countEl.parentElement.hidden = !state.countLabel;
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

    const stampAt = (ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, strength = 1) => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = strength;
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
        if (headPending && (it.kind === "date" || it.kind === "count")) continue;
        drawText(chalk, it);
        if (it.kind === "smudge") wipeSeeded(it, 5, 6, 0.3, 0.01);
        if (mode === "burn") drawText(ghost, it, 0.2);
      }
    };

    /* ---------------- 落書き（チョークで書く・その端末に残す） ---------------- */
    let strokes: Stroke[] = [];
    let headPending = false;
    const loadDoodle = () => {
      strokes = [];
      try {
        const raw = JSON.parse(localStorage.getItem(doodleKey()) || "null");
        if (raw && Array.isArray(raw.s))
          strokes = raw.s.filter(
            (st: Stroke) => st && (st.t === "c" || st.t === "e") && Array.isArray(st.p) && st.p.length >= 2 && st.p.length % 2 === 0 && st.p.every(Number.isFinite),
          );
      } catch {}
    };
    loadDoodle();
    let saveTimer = 0;
    let savePending = false;
    const flushDoodle = () => {
      if (!savePending) return;
      savePending = false;
      window.clearTimeout(saveTimer);
      // 上限を超えたら、先に黒板消しの記録を古い順に捨て、チョークの線は最後に捨てる
      let total = strokes.reduce((n, st) => n + st.p.length / 2, 0);
      while (total > DOODLE_MAX_POINTS && strokes.length > 1) {
        const i = strokes.findIndex((st) => st.t === "e");
        total -= strokes.splice(i >= 0 ? i : 0, 1)[0].p.length / 2;
      }
      try {
        localStorage.setItem(doodleKey(), JSON.stringify({ s: strokes }));
      } catch {}
    };
    const saveDoodle = () => {
      savePending = true;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(flushDoodle, 400);
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
        if (s.t === "c" && s.p.length === 2) chalkLine(s.p[0] * W, s.p[1] * W, s.p[0] * W + 0.1, s.p[1] * W + 0.1, s.c || "#f2f0e6");
        for (let i = 2; i < s.p.length; i += 2) {
          const x0 = s.p[i - 2] * W;
          const y0 = s.p[i - 1] * W;
          const x1 = s.p[i] * W;
          const y1 = s.p[i + 1] * W;
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

    /* ---------------- にじみ：こすった方向へ、チョークの粉が伸びて広がる（どの文字・落書きにも効く） ---------------- */
    const PW = SW + 18;
    const PH = SH + 10;
    const patch = document.createElement("canvas");
    patch.width = Math.max(4, Math.ceil(PW * dpr * 0.34));
    patch.height = Math.max(4, Math.ceil(PH * dpr * 0.34));
    const pctx = patch.getContext("2d")!;
    // すくう範囲の縁をぼかす型（四角い写しの縁が線になって見えないように）
    const feather = document.createElement("canvas");
    feather.width = patch.width;
    feather.height = patch.height;
    {
      const g = feather.getContext("2d")!;
      g.translate(feather.width / 2, feather.height / 2);
      g.scale(feather.width / 2, feather.height / 2);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      rg.addColorStop(0, "rgba(0,0,0,1)");
      rg.addColorStop(0.5, "rgba(0,0,0,.75)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(-1, -1, 2, 2);
    }
    const smudgeAt = (src: HTMLCanvasElement, ctx: CanvasRenderingContext2D, k: number, x: number, y: number, mx: number, my: number, alpha: number) => {
      // 黒板消しの下の粉をすくって（縮めてぼかし）、動いた向きに少しずらして薄く置き直す
      const sx = Math.max(0, x - PW / 2);
      const sy = Math.max(0, y - PH / 2);
      const sw = Math.min(PW, W - sx);
      const sh = Math.min(PH, H - sy);
      if (sw <= 2 || sh <= 2) return;
      pctx.clearRect(0, 0, patch.width, patch.height);
      const pw = Math.ceil((patch.width * sw) / PW);
      const ph = Math.ceil((patch.height * sh) / PH);
      pctx.drawImage(src, sx * k, sy * k, sw * k, sh * k, 0, 0, pw, ph);
      pctx.globalCompositeOperation = "destination-in";
      pctx.drawImage(feather, (-(sx - (x - PW / 2)) * patch.width) / PW, (-(sy - (y - PH / 2)) * patch.height) / PH);
      pctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(patch, 0, 0, pw, ph, sx + mx, sy + my, sw, sh);
      ctx.restore();
    };

    /** 1回の押し当ての強さ：黒板消しの面が通り過ぎる間に重なる回数で割り、1往復で RUB_KEEP だけ残す */
    const rubStrength = (dx: number, dy: number, step: number, keep = RUB_KEEP) => {
      const d = Math.hypot(dx, dy);
      const reach = d > 0.5 ? (Math.abs(dx) / d) * SW + (Math.abs(dy) / d) * SH : SW;
      // 面の濃さの平均（行ごとのムラと左右のぼかし）がおよそ 0.5
      return Math.min(1, (1 - Math.pow(keep, Math.max(step, 0.5) / reach)) / 0.5);
    };

    /* ---------------- 消す ---------------- */
    let eraseStroke: Stroke | null = null;
    const eraseSeg = (x0: number, y0: number, x1: number, y1: number, clip?: Item) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 4));
      const rub = rubStrength(x1 - x0, y1 - y0, d / n);
      const run = () => {
        for (let i = 1; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const y = y0 + ((y1 - y0) * i) / n;
          if (clip) stampAt(chalk, x, y);
          else {
            // 人がこする：粉がにじんで伸び、少しずつかすれる
            // すくった粉の一部だけを先へ置く（消す量より少なく＝こするほど減っていく）
            if (i % 3 === 0 && d > 0.5) {
              const ux = (x1 - x0) / d;
              const uy = (y1 - y0) / d;
              smudgeAt(chalkC, chalk, dpr, x, y, ux * 10, uy * 10, SMUDGE);
              smudgeAt(doodleC, doodle, dpr, x, y, ux * 10, uy * 10, SMUDGE);
            }
            stampAt(chalk, x, y, 1, rub);
            stampAt(doodle, x, y, 1, rub);
          }
          // 見えない手の書き直しのときは拭き跡をごく薄く（日付の地を白くしない）
          hazeAt(x, y, clip ? 0.005 : 0.018);
          if (i % 3 === 0) emit(x, y);
          for (const it of items)
            if (!it.dirty && x > it.x - SW / 2 && x < it.x + it.w + SW / 2 && y > it.y - SH / 2 && y < it.y + it.h + SH / 2) it.dirty = true;
        }
      };
      if (clip) clipTo(clip, run);
      else run();
      if (eraseStroke) {
        const lx = eraseStroke.p[eraseStroke.p.length - 2] * W;
        const ly = eraseStroke.p[eraseStroke.p.length - 1] * W;
        if (Math.hypot(x1 - lx, y1 - ly) >= 4) eraseStroke.p.push(norm(x1, W), norm(y1, W));
      }
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
    let lastPointerType = "mouse";
    const selectTool = (next: Tool) => {
      if (tool.kind === "chalk" && tool.el !== next.el) {
        putBack(tool.el);
        tool.el.classList.remove("is-picked");
      }
      tool = next;
      board.classList.toggle("is-drawing", next.kind === "chalk");
      if (next.kind === "chalk") next.el.classList.add("is-picked");
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
    let skipWrite = false;
    const writeItem = (it: Item, dur: number) =>
      new Promise<void>((done) => {
        const t0 = performance.now();
        const step = () => {
          if (disposed) return done();
          const p = dur && !skipWrite ? Math.min(1, (performance.now() - t0) / dur) : 1;
          clearItem(it);
          drawText(chalk, it, 1, p);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        step();
      });
    const handWrite = async (kinds: string[], wipeFirst: boolean) => {
      if (busy || state.phase === "after") {
        if (headPending) {
          headPending = false;
          layout();
        }
        return;
      }
      busy = true;
      skipWrite = false;
      try {
        if (!reduce && wipeFirst) {
          for (const it of items.filter((i) => kinds.includes(i.kind))) await wipeItem(it);
          await wait(250);
        }
        syncText();
        // 文字が変わると位置も変わるので測り直す（大きさが同じなら落書きは描き直さない）
        const resized = Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2;
        if (resized) sizeCanvases();
        collect();
        drawAll();
        if (resized) replayDoodle();
        placeNowMark();
        headPending = false;
        const targets = items.filter((i) => kinds.includes(i.kind));
        if (!reduce) {
          targets.forEach(clearItem);
          for (const it of targets) {
            await writeItem(it, 300 + it.text.length * 90);
            if (mode === "burn") drawText(ghost, it, 0.2);
            if (!skipWrite) await wait(160);
          }
        } else {
          for (const it of targets) {
            drawText(chalk, it);
            if (mode === "burn") drawText(ghost, it, 0.2);
          }
        }
      } finally {
        busy = false;
        headPending = false;
        settleLayout();
      }
    };

    /* ---------------- 触る（こする・書く・照らす） ---------------- */
    let active: "rub" | "draw" | "pan" | null = null;
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
      if (strokes.some((st) => st.t === "c")) eraseStroke = { t: "e", p: [norm(last.x, W), norm(last.y, W)] };
    };
    const endTouch = (e?: PointerEvent) => {
      if (e && touchY.delete(e.pointerId) && active === "pan") {
        // 指が残っている間は、残った指でそのまま動かせる
        if (touchY.size) {
          panY = avgY();
          return;
        }
        active = null;
        return;
      }
      if (active === "rub") {
        putBack(eraser);
        scheduleReturn();
        if (eraseStroke && eraseStroke.p.length > 2) {
          strokes.push(eraseStroke);
          saveDoodle();
        }
      }
      if (active === "draw" && drawStroke && tool.kind === "chalk") {
        if (drawStroke.p.length >= 2) {
          strokes.push(drawStroke);
          saveDoodle();
        }
        // 書き終えたら手から離す（粉受けで少し浮いて光る＝まだ持っている。黒板消しを押すまで持ち続ける）
        putBack(tool.el);
      }
      // 黒板をただタップした：少しだけ粉が舞う（消しも書きもしない）
      if (armed && active === null) emit(start.x, start.y, 10, 6);
      eraseStroke = drawStroke = null;
      armed = false;
      active = null;
    };
    let lastUser = performance.now();
    // チョークを持っている間の2本指＝スクロール（黒板の上でも、持ち替えずにページを動かせる）
    const touchY = new Map<number, number>();
    let panY = 0;
    const avgY = () => [...touchY.values()].reduce((a, b) => a + b, 0) / Math.max(1, touchY.size);
    const onDown = (e: PointerEvent) => {
      lastPointerType = e.pointerType;
      lastUser = performance.now();
      ghostToken++;
      if (e.pointerType === "touch") {
        // 1本目の指＝新しい触り始め（取りこぼした指の記録を捨てる）
        if (e.isPrimary) touchY.clear();
        touchY.set(e.pointerId, e.clientY);
      }
      if (!e.isPrimary) {
        if (tool.kind === "chalk" && e.pointerType === "touch") {
          // 書きかけの線は捨てる（2本指は書くためではなく動かすため）
          if (active === "draw" && drawStroke) {
            drawStroke = null;
            replayDoodle();
            ghostMarks = [];
            putBack(tool.el);
          }
          active = "pan";
          armed = false;
          capture(e);
          panY = avgY();
          return;
        }
        // 黒板消しのときの2本目の指＝ピンチ。こすりを止めて拡大に任せる
        return endTouch();
      }
      // 粉受けの道具を押した：押したものを必ず持つ（チョークはチョーク、黒板消しは黒板消し）
      const toolEl = (e.target as HTMLElement).closest<HTMLElement>("[data-tool]");
      if (toolEl) {
        e.preventDefault();
        lastUser = performance.now();
        if (toolEl.dataset.tool === "chalk") selectTool({ kind: "chalk", el: toolEl, color: toolEl.dataset.color || "#f2f0e6" });
        else selectTool({ kind: "eraser", el: eraser });
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (busy) {
        // 見えない手が書いている途中に触った：残りを一気に書き切って、すぐ触れるようにする
        skipWrite = true;
        return;
      }
      const p = local(e);
      if (tool.kind === "chalk") {
        // チョーク：どの向きにも書ける（持っている間は黒板の上でスクロールしない）
        e.preventDefault();
        active = "draw";
        capture(e);
        start = last = p;
        drawStroke = { t: "c", c: tool.color, p: [norm(p.x, W), norm(p.y, W)] };
        chalkLine(p.x, p.y, p.x + 0.1, p.y + 0.1, tool.color);
        measureRest(tool.el);
        hold(tool.el, p.x, p.y, -35);
        return;
      }
      // 指は左右の端をこすらない（戻るスワイプと取り合わない）。マウスは端からでもこすれる
      if (e.pointerType !== "mouse" && (p.x < EDGE || p.x > W - EDGE)) return;
      armed = true;
      start = last = p;
      if (e.pointerType === "mouse") {
        beginRub(e);
        hold(eraser, p.x, p.y, 90);
        eraseSeg(p.x, p.y, p.x, p.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (touchY.has(e.pointerId)) touchY.set(e.pointerId, e.clientY);
      if (active === "pan") {
        const y = avgY();
        window.scrollBy(0, panY - y);
        panY = y;
        return;
      }
      if (!e.isPrimary) return;
      moveLight(e);
      if (active) lastUser = performance.now();
      const p = local(e);
      if (active === "draw" && tool.kind === "chalk" && drawStroke) {
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
        chalkLine(last.x, last.y, p.x, p.y, tool.color);
        if (Math.random() < 0.15) emit(p.x, p.y, 4, 1);
        drawStroke.p.push(norm(p.x, W), norm(p.y, W));
        hold(tool.el, p.x, p.y, -35);
        last = p;
        return;
      }
      if (!armed) return;
      if (active !== "rub") {
        // 指：横に動いたときだけこする（縦はスクロールに任せる）
        const dx = Math.abs(p.x - start.x);
        const dy = Math.abs(p.y - start.y);
        // はっきり横（水平から約27°以内）のときだけこする。斜めに始めたスクロールで日程を削らない
        if (Math.max(dx, dy) < 12) return;
        if (dx < dy * 2) {
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

    /* ---------------- 誰もいない教室：見えない手が落書きし、黒板消しがひとりでに消す ---------------- */
    let ghostToken = 0;
    let ghostBusy = false;
    type GhostMark = { x: number; y: number; w: number; h: number };
    let ghostMarks: GhostMark[] = [];
    const boardInView = () => {
      const r = board.getBoundingClientRect();
      return r.bottom > 120 && r.top < window.innerHeight - 120 && r.width > 0;
    };
    // 文字も落書きも無い所を探す（縮めた写しでインクの量を数える）
    const probe = document.createElement("canvas");
    const freeSpot = (w: number, h: number): { x: number; y: number } | null => {
      const k = 1 / 8;
      probe.width = Math.max(1, Math.round(W * k));
      probe.height = Math.max(1, Math.round(H * k));
      const g = probe.getContext("2d", { willReadFrequently: true })!;
      g.clearRect(0, 0, probe.width, probe.height);
      g.drawImage(chalkC, 0, 0, probe.width, probe.height);
      g.drawImage(doodleC, 0, 0, probe.width, probe.height);
      const data = g.getImageData(0, 0, probe.width, probe.height).data;
      const cw = Math.ceil(w * k) + 2;
      const ch = Math.ceil(h * k) + 2;
      const cands: { x: number; y: number }[] = [];
      for (let y = 3; y + ch < probe.height - 4; y += 2)
        for (let x = 3; x + cw < probe.width - 3; x += 2) {
          let ink = 0;
          for (let yy = y; yy < y + ch && ink < 3; yy++)
            for (let xx = x; xx < x + cw; xx++) if (data[(yy * probe.width + xx) * 4 + 3] > 30) ink++;
          if (ink < 3) cands.push({ x: (x + 1) / k, y: (y + 1) / k });
        }
      if (!cands.length) return null;
      // 黒板の中ほど（画面に見えている範囲）を優先
      const b = board.getBoundingClientRect();
      const vis = cands.filter((c) => b.top + c.y > 100 && b.top + c.y + h < window.innerHeight - 60);
      const pool = vis.length ? vis : cands;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    const ghostDraw = async (token: number) => {
      const defs = site.ghostDoodles;
      if (!defs.length) return;
      const def = defs[Math.floor(Math.random() * defs.length)];
      const w = 70 + Math.random() * 50;
      const h = w / (def.aspect || 1);
      const spot = freeSpot(w, h);
      if (!spot) return;
      const stick = board.querySelector<HTMLElement>('[data-tool="chalk"]');
      const color = stick?.dataset.color || "#f2f0e6";
      const mine = () => token === ghostToken && !disposed;
      // 粉受けからチョークが浮いて、描き始めの所まで運ばれる
      if (stick) {
        const rest = measureRest(stick);
        const sx = spot.x + def.strokes[0][0] * w;
        const sy = spot.y + def.strokes[0][1] * h;
        const t0 = performance.now();
        while (mine()) {
          const p = Math.min(1, (performance.now() - t0) / 700);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          hold(stick, rest.x + (sx - rest.x) * e, rest.y + (sy - rest.y) * e, -35);
          if (p >= 1) break;
          await new Promise((r) => requestAnimationFrame(r));
        }
      }
      try {
        for (const st of def.strokes) {
          for (let i = 2; i < st.length; i += 2) {
            if (!mine()) return;
            const x0 = spot.x + st[i - 2] * w;
            const y0 = spot.y + st[i - 1] * h;
            const x1 = spot.x + st[i] * w;
            const y1 = spot.y + st[i + 1] * h;
            chalkLine(x0, y0, x1, y1, color);
            if (stick) hold(stick, x1, y1, -35);
            if (Math.random() < 0.2) emit(x1, y1, 4, 1);
            await wait(18 + Math.hypot(x1 - x0, y1 - y0) * 6);
          }
          await wait(180);
        }
        ghostMarks.push({ x: spot.x, y: spot.y, w, h });
      } finally {
        // 人が同じチョークで書いている最中なら手を離さない
        if (stick && !(active === "draw" && tool.el === stick)) putBack(stick);
      }
    };
    const ghostErase = async (token: number) => {
      const m = ghostMarks.shift();
      if (!m) return;
      const rest = measureRest(eraser);
      const cy = m.y + m.h / 2;
      const pts: [number, number][] = [[rest.x, rest.y]];
      const passes = 6;
      for (let i = 0; i <= passes; i++) pts.push([i % 2 ? m.x - 10 : m.x + m.w + 10, m.y + (m.h * i) / passes]);
      pts.push([m.x + m.w / 2, cy]);
      // 見えない手は落書きを7往復で消し切る（人より少し強く）
      const ghostRub = rubStrength(1, 0, 5, 0.35);
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const dur = i === 1 ? 650 : 420;
        const t0 = performance.now();
        let px = ax;
        let py = ay;
        const ok = await new Promise<boolean>((done) => {
          const step = () => {
            if (token !== ghostToken || disposed) return done(false);
            const p = Math.min(1, (performance.now() - t0) / dur);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const x = ax + (bx - ax) * e;
            const y = ay + (by - ay) * e;
            hold(eraser, x, y, 90);
            if (i > 1) {
              const d = Math.hypot(x - px, y - py);
              const n = Math.max(1, Math.ceil(d / 5));
              for (let k = 1; k <= n; k++) {
                const sx = px + ((x - px) * k) / n;
                const sy = py + ((y - py) * k) / n;
                if (k % 3 === 0 && d > 0.5) smudgeAt(doodleC, doodle, dpr, sx, sy, ((x - px) / d) * 8, ((y - py) / d) * 8, SMUDGE);
                stampAt(doodle, sx, sy, 1, ghostRub);
                hazeAt(sx, sy, 0.012);
                if (k % 4 === 0) emit(sx, sy);
              }
            }
            px = x;
            py = y;
            if (p < 1) requestAnimationFrame(step);
            else done(true);
          };
          step();
        });
        if (!ok) break;
      }
      if (active !== "rub") putBack(eraser);
    };
    const ghostTick = async () => {
      if (ghostBusy || busy || active || reduce || document.hidden) return;
      if (state.phase === "after" || !QUIET_SCENES.has(state.scene) || world.dataset.gate !== "open") return;
      if (performance.now() - lastUser < GHOST_IDLE_MS || !boardInView()) return;
      ghostBusy = true;
      const token = ++ghostToken;
      try {
        if (ghostMarks.length >= 2 || (ghostMarks.length && Math.random() < 0.45)) await ghostErase(token);
        else await ghostDraw(token);
      } finally {
        ghostBusy = false;
        // 次の気配まで、8〜22秒あける（描いた落書きはしばらく残る）
        lastUser = performance.now() - GHOST_IDLE_MS + 8000 + Math.random() * 14000;
      }
    };
    intervals.push(window.setInterval(ghostTick, 3000));

    /* ---------------- 光の筋に漂う粉（朝・昼・放課後の静かな教室） ---------------- */
    const motesC = mk("kb-cv-motes");
    const motes = motesC.getContext("2d")!;
    type Mote = { x: number; y: number; vx: number; vy: number; r: number; ph: number };
    const moteList: Mote[] = [];
    let moteRaf = 0;
    let moteLast = 0;
    const motesOn = () =>
      !reduce && !document.hidden && ["akegata", "asa", "hiru", "yugata", "choshinsei"].includes(state.scene) && state.sun > 0.2 && boardInView();
    const moteLoop = (t: number) => {
      moteRaf = 0;
      if (!motesOn()) {
        motes.clearRect(0, 0, W, H);
        return;
      }
      if (t - moteLast > 33) {
        moteLast = t;
        if (moteList.length < 34) moteList.push({ x: Math.random() * W * 0.7, y: Math.random() * H, vx: 0.05 + Math.random() * 0.12, vy: -0.04 - Math.random() * 0.08, r: 0.6 + Math.random() * 1.3, ph: Math.random() * 6.28 });
        motes.clearRect(0, 0, W, H);
        for (const m of moteList) {
          m.x += m.vx;
          m.y += m.vy;
          m.ph += 0.03;
          if (m.y < -4 || m.x > W) {
            m.x = Math.random() * W * 0.6;
            m.y = H + 4;
          }
          const a = (0.18 + 0.22 * Math.sin(m.ph)) * Math.min(1, state.sun * 1.4);
          motes.fillStyle = `rgba(255,248,225,${a.toFixed(3)})`;
          motes.beginPath();
          motes.arc(m.x, m.y, m.r, 0, 6.283);
          motes.fill();
        }
      }
      moteRaf = requestAnimationFrame(moteLoop);
    };
    const kickMotes = () => {
      if (!moteRaf && motesOn()) moteRaf = requestAnimationFrame(moteLoop);
    };
    intervals.push(window.setInterval(kickMotes, 2000));

    /** 検分用：いま黒板にある自分の落書きを、見えない手の落書きの形（0〜1）で書き出す（Preview と手元だけ） */
    if (debugAllowed())
      (window as unknown as { __kbExportDoodle: () => string }).__kbExportDoodle = () => {
        const cs = strokes.filter((st) => st.t === "c");
        if (!cs.length) return "[]";
        const xs = cs.flatMap((st) => st.p.filter((_, i) => i % 2 === 0));
        const ys = cs.flatMap((st) => st.p.filter((_, i) => i % 2 === 1));
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const w = x1 - x0 || 1, h = y1 - y0 || 1;
        const out = { aspect: Math.round((w / h) * 100) / 100, strokes: cs.map((st) => st.p.map((v, i) => Math.round(((i % 2 === 0 ? v - x0 : v - y0) / (i % 2 === 0 ? w : h)) * 1000) / 1000)) };
        return JSON.stringify(out);
      };

    /* ---------------- 組み立て ---------------- */
    const layout = () => {
      sizeCanvases();
      motesC.width = Math.round(W);
      motesC.height = Math.round(H);
      motesC.style.width = `${W}px`;
      motesC.style.height = `${H}px`;
      collect();
      drawAll();
      replayDoodle();
      ghostMarks = [];
      restOf.clear();
      placeNowMark();
    };

    let lastTick = performance.now();
    const recompute = () => {
      if (disposed) return;
      // 裏に回っていたタブ（見回りが止まっていた）で日付をまたいだら、0時の黒板消しは流さず静かに合わせる
      const stale = document.hidden || performance.now() - lastTick > 60000;
      lastTick = performance.now();
      if (stale && clockCore(now(), clockConfig).todayLabel !== state.todayLabel) return onClock();
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
      const dayRows = (clockConfig.timed[state.dayKey] || []).flatMap(([a, b]) => [dayStart + a * 60000, dayStart + b * 60000]);
      const out = dayStart + (clockConfig.lightsOut[state.dayKey] || 0) * 60000;
      const next = [clockConfig.unlockTs, clockConfig.afterTs, nextMidnight, nextHour, out, ...rows, ...dayRows]
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
      later(() => handWrite(["date", "count"], false), reduce ? 0 : 150);
    };
    const onDepart = () => {
      // タイムスリップの真っ白の瞬間：門が開いた直後なので測り直し、見出し（日付・残り日数）だけ空にしておく
      if (Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) {
        sizeCanvases();
        collect();
        replayDoodle();
        restOf.clear();
      }
      headPending = true;
      drawAll();
      placeNowMark();
    };
    // 配信元の時刻での補正：演出なしで合わせる（読み込み直後に0時の黒板消しを走らせない）
    const onClock = () => {
      if (disposed) return;
      const prev = state;
      state = clockCore(now(), clockConfig);
      apply(state, prev);
      mode = modeOf(state);
      syncText();
      if (busy || active) pendingLayout = true;
      else layout();
      scheduleBoundary();
    };
    // 列の組み方が変わる幅をまたいだら、その組み方の落書きを読み直す
    const wideMq = window.matchMedia("(min-width: 900px)");
    const onWide = () => {
      flushDoodle();
      loadDoodle();
      later(layout, 250);
    };
    wideMq.addEventListener("change", onWide);

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

    // タブに戻ってきたら、演出なしでいまに合わせる
    const onVisible = () => {
      if (!document.hidden) {
        lastTick = performance.now();
        onClock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(ARRIVE_EVENT, onArrive);
    window.addEventListener(DEPART_EVENT, onDepart);
    window.addEventListener("pagehide", flushDoodle);
    // 端末の時計を、配信元の時刻で1回だけ補正する（?t= のときはしない・lib/now が共有）
    window.addEventListener(CLOCK_EVENT, onClock);
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
      flushDoodle();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(moteRaf);
      ro.disconnect();
      wideMq.removeEventListener("change", onWide);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ARRIVE_EVENT, onArrive);
      window.removeEventListener(DEPART_EVENT, onDepart);
      window.removeEventListener("pagehide", flushDoodle);
      window.removeEventListener(CLOCK_EVENT, onClock);
      board.removeEventListener("pointerdown", onDown);
      room.removeEventListener("pointermove", onMove);
      board.removeEventListener("pointerup", endTouch);
      board.removeEventListener("pointercancel", endTouch);
      [dustC, doodleC, chalkC, smearC, ghostC, motesC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas", "is-drawing");
    };
  }, []);

  return null;
}
