"use client";
// 黒板の上乗せ：世界時計の反映・壁の時計・こする・チョークで書く・懐中電灯・時間帯の仕掛け。
// DOM の文字が正本（読み上げ・JSなし）。ここでは同じ文字を canvas に写してチョークの質感を付け、
// こすると canvas だけが消える。消したあとの戻り方は2通り（?return=rewrite で切り替え・既定は焼き付き）。
// 粉受けのチョークを拾うと、黒板に好きな文字を書ける（落書きはその端末に残る）。
// 同じ所を何度もこする（10回ほど）と、そこはゼロまで消える。黒板消しはクリーナーに入れるときれいになる。
// 書きなおす札を押すと、見えない手が黒板を拭いて最初の板書を書き直す（自分の落書きも消える）。
// 時間帯の仕掛け：蛍光灯がまたたいて点く／消灯で消える／0時に「あと◯日」と日付を黒板消しで消して書き直す／
// 入口のタイムスリップで着いたとき、日付と残り日数が書かれる。
// 初期化はインラインスクリプトに頼らない（ページ内移動で戻ったときはスクリプトが走らないため、ここでも同じ初期化をする）。
import { useEffect } from "react";
import { clockConfig, clockCore, debugAllowed, type ClockState } from "@/lib/worldClock";
import { SCENE_EVENT } from "./Signboard";
import { ARRIVE_EVENT, CLOCK_EVENT, DEPART_EVENT, now, syncWithServer } from "@/lib/now";
import { moonState, MOON_GAIN } from "@/lib/sky";
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
// こすった回数：黒板を粗い格子に分けて、その場所を何回（片道）こすったかを数える（保存しない。書きなおす・読み込み直しで0）。
// こすった回数は片道で数える（本人「10回くらいこすったら、次第にゼロまで」）。WEAR_SOFT 回までは今の手ざわり（少しずつかすれる・にじむ・跡が残る）、そこから強まり、WEAR_GONE 回でその場所はゼロになる
const CELL = 24;
const WEAR_SOFT = 3;
const WEAR_GONE = 10;
// 動きを減らす設定の粉：その場でふわっと現れて、この時間で消える（動かない）
const STILL_MS = 400;
// 黒板消しの汚れ：こするほど粉を含んで白くなり、消えにくく・にじみやすくなる。クリーナーに入れると落ちる（その端末に残す）
const eraserKey = () => `gbf_${site.year}_eraser_v1`;
const LOAD_PER_PX = 0.0001; // こすった長さ 1px あたりの溜まり方（黒板をまるごと数回拭くと白くなる）〔Preview で本人が決める〕
const LOAD_KEEP_MAX = 0.75; // いちばん汚れたときの消え残り〔Preview で本人が決める〕
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
    const cleaner = board.querySelector<HTMLElement>(".kb-cleaner");
    const plate = board.querySelector<HTMLButtonElement>(".kb-reset");

    const params = new URLSearchParams(location.search);
    // ?motion=1：動きを減らす設定の端末でも演出を見る（検分用）
    const reduce = !params.has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (params.has("motion")) world.dataset.motionForced = "";
    let state: ClockState = clockCore(now(), clockConfig);
    // 戻り方：どの帯でも焼き付き（消したまま）。手を止めると見えない手が書き直す動きは、?return=rewrite（検分用・本番では効かない）のときだけ
    const mode: "rewrite" | "burn" = debugAllowed() && params.get("return") === "rewrite" ? "rewrite" : "burn";
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
      st.setProperty("--sun-az", s.sunAz.toFixed(1));
      // 月明かり：本物の月の高さ・向き・満ち欠けで、消灯後の暗さと窓から差す青白い帯を決める（窓のある側＝南寄りほど強い）。
      // 部屋を明るくする向きにしか効かない（昼は --dark が0なので --amb は世界時計のまま）
      const mo = moonState(now(), clockConfig.lat, clockConfig.lon);
      const side = mo.az > 90 && mo.az < 270 ? 1 : 0.3;
      const moon = mo.alt > 0 ? mo.k * Math.min(1, Math.sin((mo.alt * Math.PI) / 180) * 2.5) * side : 0;
      st.setProperty("--moon", moon.toFixed(3));
      st.setProperty("--moon-az", mo.az.toFixed(1));
      st.setProperty("--amb", (s.amb + s.dark * MOON_GAIN * moon).toFixed(3));
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
    // 何度もこすった所を消し切る面（ムラのない面。縁だけぼかして、四角い跡を残さない）
    const solid = document.createElement("canvas");
    solid.width = SW * 2;
    solid.height = SH * 2;
    {
      const g = solid.getContext("2d")!;
      for (let y = 0; y < SH * 2; y++) {
        const edge = Math.min(1, Math.min(y, SH * 2 - y) / 10);
        const grad = g.createLinearGradient(0, 0, SW * 2, 0);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.18, `rgba(0,0,0,${edge})`);
        grad.addColorStop(0.82, `rgba(0,0,0,${edge})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(0, y, SW * 2, 1);
      }
    }

    /* ---------------- こすった回数（格子ごと） ---------------- */
    let wear = new Float32Array(0);
    let wCols = 1;
    let wRows = 1;
    let wearMax = 0;
    const resetWear = () => {
      wCols = Math.max(1, Math.ceil(W / CELL));
      wRows = Math.max(1, Math.ceil(H / CELL));
      wear = new Float32Array(wCols * wRows);
      wearMax = 0;
    };
    /**
     * 黒板消しが (x,y) を中心に、向き (ux,uy) へ step だけ進む間に、面が格子の真ん中の上を通った長さを数える。
     * 面が真ん中を通り過ぎきると片道で 1。指の速さや点の間隔によらず同じになるよう、通った長さで足す。
     * 戻り値は (x,y) の格子の回数
     */
    const addWear = (x: number, y: number, ux: number, uy: number, step: number) => {
      const hs = step / 2;
      if (hs > 0 && (ux || uy)) {
        // 真ん中の線上の格子が、面の中にいる長さ（向きで変わる）
        const chord = Math.min(ux ? SW / Math.abs(ux) : Infinity, uy ? SH / Math.abs(uy) : Infinity);
        const c0 = Math.max(0, Math.floor((x - SW / 2 - hs) / CELL));
        const c1 = Math.min(wCols - 1, Math.floor((x + SW / 2 + hs) / CELL));
        const r0 = Math.max(0, Math.floor((y - SH / 2 - hs) / CELL));
        const r1 = Math.min(wRows - 1, Math.floor((y + SH / 2 + hs) / CELL));
        for (let r = r0; r <= r1; r++)
          for (let c = c0; c <= c1; c++) {
            let lo = -hs;
            let hi = hs;
            for (const [v, u, half] of [
              [(c + 0.5) * CELL - x, ux, SW / 2],
              [(r + 0.5) * CELL - y, uy, SH / 2],
            ]) {
              if (Math.abs(u) < 1e-6) {
                if (Math.abs(v) > half) hi = lo;
              } else {
                const a = (v - half) / u;
                const b = (v + half) / u;
                lo = Math.max(lo, Math.min(a, b));
                hi = Math.min(hi, Math.max(a, b));
              }
            }
            if (hi > lo) wear[r * wCols + c] += (hi - lo) / chord;
          }
      }
      const cc = Math.min(wCols - 1, Math.max(0, Math.floor(x / CELL)));
      const rr = Math.min(wRows - 1, Math.max(0, Math.floor(y / CELL)));
      const v = wear[rr * wCols + cc] || 0;
      if (v > wearMax) wearMax = v;
      return v;
    };

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
      buildMarks();
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

    const stampAt = (ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, strength = 1, face = stamp) => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = strength;
      ctx.drawImage(face, x - (SW * scale) / 2, y - (SH * scale) / 2, SW * scale, SH * scale);
      ctx.restore();
    };

    /* ---------------- 落書きの線（横線・矢印・丸）：字の位置から決めて、chalk の canvas に描く（こすれば消える） ---------------- */
    // 1本ずつ小さな canvas に描いて粒を抜いておき、黒板へは写すだけ（下の字に粒を二重にかけない）
    type Mark = { owner: string; cv: HTMLCanvasElement; x: number; y: number; w: number; h: number; on: boolean };
    type Pt = [number, number];
    let marks: Mark[] = [];
    const markGrain = makeGrain(17, 0.5);
    const centerOf = (it: Item): Pt => [it.x + it.w / 2, it.y + it.h / 2];
    /** 字の中の点（回す前・字の中心から）を、黒板の座標へ */
    const toBoard = (it: Item, lx: number, ly: number): Pt => {
      const a = (it.rot * Math.PI) / 180;
      const [cx, cy] = centerOf(it);
      return [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)];
    };
    /** 黒板の座標を、字の中（回す前・字の中心から）へ */
    const toLocal = (it: Item, x: number, y: number): Pt => {
      const a = (-it.rot * Math.PI) / 180;
      const [cx, cy] = centerOf(it);
      const dx = x - cx;
      const dy = y - cy;
      return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    };
    /** 字の枠（回った四角）の縁のうち、点 (tx,ty) の方を向いた所（gap だけ離す） */
    const boxEdge = (it: Item, tx: number, ty: number, gap: number): Pt => {
      const [dx, dy] = toLocal(it, tx, ty);
      const L = Math.hypot(dx, dy) || 1;
      const t = Math.min(dx ? it.uw / 2 / Math.abs(dx) : Infinity, dy ? it.uh / 2 / Math.abs(dy) : Infinity);
      return toBoard(it, dx * t + (dx / L) * gap, dy * t + (dy / L) * gap);
    };
    // 丸の大きさ（字の外側にゆとり）
    const ringAxes = (it: Item) => [it.uw / 2 + it.uh * 0.3 + 6, it.uh / 2 + it.uh * 0.22 + 5] as const;
    /** 丸の縁のうち、点 (tx,ty) の方を向いた所 */
    const ringEdge = (it: Item, tx: number, ty: number, gap: number): Pt => {
      const [a, b] = ringAxes(it);
      const [dx, dy] = toLocal(it, tx, ty);
      const L = Math.hypot(dx, dy) || 1;
      const t = 1 / Math.sqrt((dx / a) ** 2 + (dy / b) ** 2 || 1);
      return toBoard(it, dx * t + (dx / L) * gap, dy * t + (dy / L) * gap);
    };
    /** 手で引いた直線（少し揺れる） */
    const wobbly = (p: Pt, q: Pt, r: () => number): Pt[] => {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const nx = -(q[1] - p[1]) / L;
      const ny = (q[0] - p[0]) / L;
      const out: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const j = i === 0 || i === 8 ? 0 : (r() - 0.5) * 1.4;
        out.push([p[0] + (q[0] - p[0]) * u + nx * j, p[1] + (q[1] - p[1]) * u + ny * j]);
      }
      return out;
    };
    /** ゆるく曲がった線（bend＝曲がりの大きさ。長さに対する割合） */
    const curve = (p: Pt, q: Pt, bend: number): Pt[] => {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const cx = (p[0] + q[0]) / 2 - ((q[1] - p[1]) / L) * bend * L;
      const cy = (p[1] + q[1]) / 2 + ((q[0] - p[0]) / L) * bend * L;
      const out: Pt[] = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        out.push([(1 - u) ** 2 * p[0] + 2 * (1 - u) * u * cx + u * u * q[0], (1 - u) ** 2 * p[1] + 2 * (1 - u) * u * cy + u * u * q[1]]);
      }
      return out;
    };
    /** 矢印の先（「く」の字） */
    const arrowHead = (line: Pt[], len: number): Pt[] => {
      const [x1, y1] = line[line.length - 1];
      const [x0, y0] = line[Math.max(0, line.length - 4)];
      const a = Math.atan2(y1 - y0, x1 - x0);
      return [
        [x1 - len * Math.cos(a - 0.5), y1 - len * Math.sin(a - 0.5)],
        [x1, y1],
        [x1 - len * Math.cos(a + 0.42), y1 - len * Math.sin(a + 0.42)],
      ];
    };
    const makeMark = (owner: string, color: string, lw: number, lines: Pt[][], alpha = 0.9): Mark => {
      const all = lines.flat();
      const pad = lw * 2 + 3;
      const x = Math.floor(Math.min(...all.map((p) => p[0])) - pad);
      const y = Math.floor(Math.min(...all.map((p) => p[1])) - pad);
      const w = Math.ceil(Math.max(...all.map((p) => p[0])) + pad) - x;
      const h = Math.ceil(Math.max(...all.map((p) => p[1])) + pad) - y;
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, -x * dpr, -y * dpr);
      g.strokeStyle = color;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.globalAlpha = alpha;
      g.shadowColor = "rgba(255,255,255,.3)";
      g.shadowBlur = 1.5;
      for (const line of lines) {
        g.beginPath();
        line.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.stroke();
      }
      g.globalAlpha = 1;
      g.shadowBlur = 0;
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = g.createPattern(markGrain, "repeat")!;
      g.fillRect(x, y, w, h);
      return { owner, cv, x, y, w, h, on: true };
    };
    const lwOf = (it: Item) => Math.min(3.4, Math.max(2, it.size * 0.08));
    /** 既定の落書きの線：去年の落書きに横線と矢印（訂正した人の色）、今年のテーマを丸で囲んで矢印（補足した人の色） */
    const buildMarks = () => {
      marks = [];
      const find = (k: string) => items.find((i) => i.kind === k);
      const old = find("note-old");
      const fix = find("note-fix");
      const theme = find("doodle");
      const note = find("note-this");
      const r = rng(29);
      if (old && fix) {
        const lw = lwOf(fix);
        // 横線は消された字が読める細さと濃さで。1本目は字の真ん中を端まで、2本目は書き出しの所だけ短く引き返す
        // （小さいカタカナの上に線を2本重ねると読めなくなるため）
        const sw = Math.max(1.6, lwOf(old) * 0.8);
        const s1 = wobbly(toBoard(old, -old.uw / 2 - 6, old.uh * 0.04), toBoard(old, old.uw / 2 + 5, -old.uh * 0.05), r);
        const s2 = wobbly(toBoard(old, -old.uw / 2 - 3, old.uh * 0.17), toBoard(old, -old.uw / 2 + old.uw * 0.26, old.uh * 0.13), r);
        marks.push(makeMark("note-fix", fix.color, sw, [s1, s2], 0.78));
        const from = toBoard(old, old.uw * 0.14, old.uh / 2 + 4);
        const to = boxEdge(fix, from[0], from[1], 5);
        const line = curve(from, to, 0.18);
        marks.push(makeMark("note-fix", fix.color, lw, [line, arrowHead(line, Math.min(13, 6 + lw * 2))]));
      }
      if (theme && note) {
        const [a, b] = ringAxes(theme);
        const ring: Pt[] = [];
        for (let k = 0; k <= 72; k++) {
          const u = k / 72;
          const th = -2.5 + Math.PI * 2 * 1.08 * u;
          // 描き終わりは少し外へずれて、描き始めと重なる（手で描いた丸）
          const s = 0.97 + 0.07 * u + (r() - 0.5) * 0.015;
          ring.push(toBoard(theme, Math.cos(th) * a * s, Math.sin(th) * b * s));
        }
        const lw = lwOf(theme) * 0.85;
        marks.push(makeMark("note-this", note.color, lw, [ring]));
        const [tx, ty] = centerOf(theme);
        const from = boxEdge(note, tx, ty, 4);
        const to = ringEdge(theme, from[0], from[1], 5);
        const line = curve(from, to, -0.15);
        const lw2 = lwOf(note);
        marks.push(makeMark("note-this", note.color, lw2, [line, arrowHead(line, Math.min(13, 6 + lw2 * 2))]));
      }
    };
    const drawMark = (ctx: CanvasRenderingContext2D, m: Mark, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(m.cv, m.x, m.y, m.w, m.h);
      ctx.restore();
    };
    /** 字を書き直したとき、その字の範囲に掛かっている線も戻す（横線が字と一緒に消えたままにならない） */
    const restoreMarksIn = (it: Item) => {
      const rx = it.x - 4;
      const ry = it.y - 2;
      const rw = it.w + 8;
      const rh = it.h + 4;
      for (const m of marks) {
        if (!m.on || m.x > rx + rw || m.x + m.w < rx || m.y > ry + rh || m.y + m.h < ry) continue;
        chalk.save();
        chalk.beginPath();
        chalk.rect(rx, ry, rw, rh);
        chalk.clip();
        drawMark(chalk, m);
        chalk.restore();
      }
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
      // 板書をまるごと描き直す＝こすった回数も0から
      resetWear();
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
      for (const m of marks) {
        m.on = true;
        drawMark(chalk, m);
        if (mode === "burn") drawMark(ghost, m, 0.2);
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
    // fall＝舞った粉（少し舞い上がってから重力で加速して落ち、左右にわずかに揺れる。小さな粒ほどゆっくり）。
    // 粉受けの上面（PC＝黒板の下の縁／スマホ＝画面の下に貼り付いた粉受け。位置は毎コマ測る）に当たると止まり、
    // しばらく白く溜まってから薄れて消える／still＝動きを減らす設定の粉（動かずに、その場でふわっと現れて STILL_MS で消える）。
    // 光る粒は全体の1〜2割だけ（窓の光の筋・蛍光灯・懐中電灯の円の中で、ときどき一瞬きらめく）。ほかは灰白の不透明な点
    type P = {
      x: number;
      /** 粒の下の端（粉受けの上面より下へは行かない） */
      y: number;
      vx: number;
      vy: number;
      a: number;
      r: number;
      kind: "fall" | "still";
      born: number;
      /** 揺れときらめきの位相と速さ */
      ph: number;
      tw: number;
      glint: boolean;
      /** 粉受けに着いた時刻（0＝まだ落ちている）と、溜まっている長さ */
      landed: number;
      stay: number;
      /** 粉受けより下で生まれた（粉受けの陰を落ちていく。上に出たら、ほかの粒と同じく粉受けに着く） */
      under: boolean;
    };
    const DUST_MAX = 360; // 粒の数の上限（超えたら、溜まっている古い粒から入れ替える）
    const GLINT_SHARE = 0.15;
    const PILE_MS = 1700; // 粉受けに溜まっている長さ（粒ごとに 0.7〜1.3 倍）
    const PILE_FADE = 900;
    const parts: P[] = [];
    let raf = 0;
    let dustLast = 0;
    // 光る粒がきらめく所を測るための、教室の中の黒板の位置（粉受けを測るときに一緒に測る）
    let roomOff = { x: 0, y: 0, w: 1, h: 1 };
    let flashX = NaN;
    let flashY = NaN;
    // 粉受けの上面（黒板の座標）。スマホでは粉受けが画面の下に貼り付いて動くので、毎コマ測る
    const trayEl = board.querySelector<HTMLElement>(".kb-tray");
    let floorV = 0;
    let floorAt = -1;
    const floorNow = (force = false) => {
      const t = performance.now();
      if (!force && t - floorAt < 12) return floorV;
      floorAt = t;
      const b = board.getBoundingClientRect();
      const r = room.getBoundingClientRect();
      roomOff = { x: b.left - r.left, y: b.top - r.top, w: r.width || 1, h: r.height || 1 };
      const tr = trayEl?.getBoundingClientRect();
      // 粉受けの絵の上の1〜2px は透明
      floorV = tr && tr.height ? tr.top - b.top + Math.min(2, tr.height * 0.05) : H;
      return floorV;
    };
    // 光る粒がきらめく所（黒板の座標で 0〜1）：窓の光の筋の中・蛍光灯が点いている間・消灯中の懐中電灯の円の中
    const glowAt = (x: number, y: number) => {
      const rx = x + roomOff.x;
      const ry = y + roomOff.y;
      if (state.dark > 0.5) {
        // 懐中電灯をまだ動かしていなければ、CSS の既定（50% 45%）の位置
        const dx = rx - (Number.isFinite(flashX) ? flashX : roomOff.w * 0.5);
        const dy = ry - (Number.isFinite(flashY) ? flashY : roomOff.h * 0.45);
        return dx * dx + dy * dy < 8100 ? 1 : 0;
      }
      // .kb-sunlight の clip-path と同じ4点（上辺から下辺へ、左右の端を線形に寄せる）
      const u = ((state.sunAz - 110) / 150) * 0.6;
      const t = ry / roomOff.h;
      const left = (u - 0.1 - 0.2 * t) * roomOff.w;
      const right = (u + 0.34 - 0.2 * t) * roomOff.w;
      const beam = rx > left && rx < right ? state.sun * (1 - state.dark) * (1 - 0.3 * state.lit) : 0;
      return Math.min(1, Math.max(beam, state.lit ? 0.55 : 0));
    };
    const loop = () => {
      dust.clearRect(0, 0, W, H);
      const t = performance.now();
      const k = dustLast ? Math.min(3, (t - dustLast) / 16.7) : 1;
      dustLast = t;
      const floor = floorNow(true);
      // 懐中電灯の位置は1コマに1回だけ読む（粒ごとに style を読まない）
      if (state.dark > 0.5) {
        flashX = parseFloat(room.style.getPropertyValue("--fx"));
        flashY = parseFloat(room.style.getPropertyValue("--fy"));
      }
      let n = 0;
      for (const p of parts) {
        let a = p.a;
        let w = p.r;
        let h = p.r;
        if (p.kind === "still") {
          const age = t - p.born;
          if (age >= STILL_MS) continue;
          a *= age < 80 ? age / 80 : Math.max(0, 1 - (age - 80) / (STILL_MS - 80));
        } else if (p.landed) {
          // 粉受けの上に溜まっている（粉受けが動けば一緒に動く）
          const age = t - p.landed;
          if (age >= p.stay + PILE_FADE) continue;
          p.y = floor;
          if (age > p.stay) a *= 1 - (age - p.stay) / PILE_FADE;
          w = p.r * 1.5;
          h = Math.max(0.8, p.r * 0.7);
        } else {
          // 重力で加速し、粒の大きさで決まる速さで頭打ち（小さな粒ほどゆっくり）
          const vt = 1.6 + p.r * 1.3;
          p.vy = Math.min(vt, p.vy + (0.03 + 0.02 * p.r) * k);
          p.vx *= Math.pow(0.97, k);
          const sway = Math.sin(p.ph + (t - p.born) * 0.004) * (p.vy > 0 ? 0.2 : 0.05);
          p.x += (p.vx + sway) * k;
          p.y += p.vy * k;
          if (p.under && p.y < floor - 2) p.under = false;
          // 粉受けの上面を越えたら止める（スマホでスクロールして粉受けの方が粒の上へ来たときも、そこで粉受けに乗る）
          if (!p.under && p.y >= floor) {
            p.y = floor;
            p.landed = t;
            p.vx = p.vy = 0;
          }
          if (p.y - p.r > H || p.x < -8 || p.x > W + 8) continue;
        }
        parts[n++] = p;
        dust.fillStyle = `rgba(212,212,203,${a.toFixed(3)})`;
        dust.fillRect(p.x - w / 2, p.y - h, w, h);
        if (p.glint && p.kind === "fall") {
          // 光の中でだけ、ときどき一瞬きらめく
          const s = Math.sin(p.ph * 3 + (t - p.born) * p.tw);
          const g = s > 0.7 ? glowAt(p.x, p.y) * Math.pow(s, 16) * a : 0;
          if (g > 0.04) {
            dust.fillStyle = `rgba(255,255,250,${Math.min(1, g * 1.4).toFixed(3)})`;
            dust.fillRect(p.x - w / 2 - 0.5, p.y - h - 0.5, w + 1, h + 1);
            if (g > 0.4) {
              const cy = p.y - h / 2;
              const L = p.r * 1.6 + 1;
              dust.fillRect(p.x - L, cy - 0.35, L * 2, 0.7);
              dust.fillRect(p.x - 0.35, cy - L, 0.7, L * 2);
            }
          }
        }
      }
      parts.length = n;
      raf = n ? requestAnimationFrame(loop) : 0;
    };
    /** 粉を1粒（vy＜0 で少し舞い上がってから落ちる） */
    const spawn = (x: number, y: number, vx: number, vy: number, a: number, r: number) => {
      if (parts.length >= DUST_MAX) {
        const i = parts.findIndex((p) => p.landed > 0 || p.kind === "still");
        if (i < 0) return;
        parts.splice(i, 1);
      }
      parts.push({
        x,
        y,
        vx,
        vy,
        a,
        r,
        kind: reduce ? "still" : "fall",
        born: performance.now(),
        ph: Math.random() * 6.283,
        tw: 0.006 + Math.random() * 0.005,
        glint: Math.random() < GLINT_SHARE,
        landed: 0,
        stay: PILE_MS * (0.7 + Math.random() * 0.6),
        under: y >= floorNow(),
      });
    };
    const kick = () => {
      if (parts.length && !raf) {
        dustLast = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    const emit = (x: number, y: number, spread = SW, n = 2) => {
      const dy = Math.min(SH * 0.6, spread * 1.5);
      for (let i = 0; i < n; i++)
        spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.3) * dy, (Math.random() - 0.5) * 0.6, -0.2 - Math.random() * 0.6, 0.55 + Math.random() * 0.35, 1 + Math.random() * 1.6);
      kick();
    };
    /** こすった粉：黒板消しの下に隠れないよう、動いてきた側の縁と下の縁から出す（ux,uy＝動いた向き） */
    const emitRub = (x: number, y: number, ux: number, uy: number, n = 2) => {
      if (!ux && !uy) return emit(x, y + SH / 2, SW, n);
      const half = Math.abs(ux) * (SW / 2) + Math.abs(uy) * (SH / 2);
      const span = (Math.abs(ux) * SH + Math.abs(uy) * SW) * 0.9;
      for (let i = 0; i < n; i++) {
        if (Math.random() < 0.7) {
          const back = half + 2 + Math.random() * 7;
          const side = (Math.random() - 0.5) * span;
          spawn(x - ux * back - uy * side, y - uy * back + ux * side, -ux * 0.3 + (Math.random() - 0.5) * 0.5, -0.15 - Math.random() * 0.7, 0.6 + Math.random() * 0.35, 1.1 + Math.random() * 1.6);
        } else spawn(x + (Math.random() - 0.5) * SW, y + SH / 2 + 1 + Math.random() * 4, (Math.random() - 0.5) * 0.4, -0.1 - Math.random() * 0.4, 0.6 + Math.random() * 0.35, 1.1 + Math.random() * 1.6);
      }
      kick();
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
    /** 黒板消しの面が1点の上を通り過ぎる長さ（動く向きで変わる） */
    const reachOf = (dx: number, dy: number) => {
      const d = Math.hypot(dx, dy);
      return d > 0.5 ? (Math.abs(dx) / d) * SW + (Math.abs(dy) / d) * SH : SW;
    };
    const rubStrength = (dx: number, dy: number, step: number, keep = RUB_KEEP) =>
      // 面の濃さの平均（行ごとのムラと左右のぼかし）がおよそ 0.5
      Math.min(1, (1 - Math.pow(keep, Math.max(step, 0.5) / reachOf(dx, dy))) / 0.5);

    /* ---------------- 消す ---------------- */
    // 黒板消しの汚れ（0＝まっさら、1＝真っ白）。効き方はこすり始めの汚れで決め、ひと続きのこすりの途中では変えない
    // （まっさらな端末の最初のひとこすりは、汚れの仕組みが無いときと同じ消え方）
    // 保存は「汚れ|保存した時刻」。きれいになるのはクリーナーに入れたときだけ（置いておいても、押しても、持ち替えても汚れたまま。
    // 汚れているあいだはクリーナーのランプが点滅して、持っていけばいいと分かる）
    let load = 0;
    try {
      const v = parseFloat((localStorage.getItem(eraserKey()) || "0").split("|")[0]);
      if (Number.isFinite(v)) load = Math.min(1, Math.max(0, v));
      if (load < 0.02) load = 0;
    } catch {}
    let rubLoad = load;
    let savedLoad = load;
    let shownLoad = 0;
    const saveLoad = () => {
      if (load === savedLoad) return;
      savedLoad = load;
      try {
        localStorage.setItem(eraserKey(), `${load.toFixed(4)}|${Date.now()}`);
      } catch {}
    };
    // 見た目（粉で白くなった面）は、0.05 変わるごとに書く
    const showLoad = (force = false) => {
      // 汚れている（0.3 以上）あいだ、クリーナーの赤いランプがゆっくり点滅する
      cleaner?.classList.toggle("is-blinking", load >= 0.3);
      if (load === shownLoad || (!force && Math.abs(load - shownLoad) < 0.05)) return;
      shownLoad = load;
      eraser.style.setProperty("--load", load.toFixed(3));
    };
    showLoad(true);

    let eraseStroke: Stroke | null = null;
    const eraseSeg = (x0: number, y0: number, x1: number, y1: number, clip?: Item) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 4));
      const step = d / n;
      const reach = reachOf(x1 - x0, y1 - y0);
      const rub = rubStrength(x1 - x0, y1 - y0, step, rubLoad > 0 ? Math.min(LOAD_KEEP_MAX, RUB_KEEP + 0.3 * rubLoad) : RUB_KEEP);
      const smudge = rubLoad > 0 ? SMUDGE * (1 + 1.3 * rubLoad) : SMUDGE;
      const ux = d > 0.5 ? (x1 - x0) / d : 0;
      const uy = d > 0.5 ? (y1 - y0) / d : 0;
      if (!clip) {
        // 人がこすった分だけ汚れる（見えない手の黒板消しは汚れない）
        load = Math.min(1, load + d * LOAD_PER_PX);
        showLoad();
      }
      const run = () => {
        for (let i = 1; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const y = y0 + ((y1 - y0) * i) / n;
          let haze = 0.005; // 見えない手の書き直しのときは拭き跡をごく薄く（日付の地を白くしない）
          if (clip) stampAt(chalk, x, y);
          else {
            // こすった回数：面が1点の上を通り過ぎる間に、片道で 1
            const w = addWear(x, y, ux, uy, step);
            const s = Math.min(1, Math.max(0, (w - WEAR_SOFT) / (WEAR_GONE - WEAR_SOFT)));
            // 人がこする：粉がにじんで伸び、少しずつかすれる
            // すくった粉の一部だけを先へ置く（消す量より少なく＝こするほど減っていく）。何度もこすった所では置き直さない
            const sm = smudge * Math.min(1, Math.max(0, 1 - (w - WEAR_SOFT) / 3));
            if (i % 3 === 0 && d > 0.5 && sm > 0) {
              smudgeAt(chalkC, chalk, dpr, x, y, ux * 10, uy * 10, sm);
              smudgeAt(doodleC, doodle, dpr, x, y, ux * 10, uy * 10, sm);
            }
            stampAt(chalk, x, y, 1, rub);
            stampAt(doodle, x, y, 1, rub);
            if (s > 0) {
              // 4回目あたりから、ムラのない面で上乗せして消す。片道で残る割合が (1-s)^1.5 まで下がり、WEAR_GONE でゼロ
              // （汚れた黒板消しでも、焼き付き・拭き跡のもやも一緒に）
              const f = 1 - Math.pow(Math.pow(1 - s, 1.5), Math.max(step, 0.5) / reach);
              for (const c of [chalk, doodle, smear, ghost]) stampAt(c, x, y, 1, f, solid);
            }
            haze = 0.018 * (1 + rubLoad) * (1 - s);
          }
          if (haze > 0) hazeAt(x, y, haze);
          if (i % 3 === 0) emitRub(x, y, ux, uy);
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
    const selectTool = (next: Tool) => {
      if (tool.kind === "chalk" && tool.el !== next.el) {
        putBack(tool.el);
        tool.el.classList.remove("is-picked");
      }
      tool = next;
      board.classList.toggle("is-drawing", next.kind === "chalk");
      if (next.kind === "chalk") next.el.classList.add("is-picked");
    };
    /* ---------------- 黒板消しクリーナー（粉受けの右端の機械） ---------------- */
    // 黒板消しを持ったまま上まで来る／クリーナーを押す（黒板消しが飛んでいって入る）と、機械が震えて口から粉が舞い、汚れが0になる
    let cleaning = false;
    let cleanerBox: DOMRect | null = null;
    const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    /** クリーナーへ運んでいる間の黒板消しの形（見えない手が手放しても、こちらが持ち続ける） */
    const setEraser = (tf: string) => {
      eraser.classList.remove("is-moving");
      eraser.classList.add("is-held");
      eraser.style.transform = tf;
    };
    /** 黒板消しを、位置・角度・大きさを変えながら動かす（粉受けの置き場所からのずれで書く） */
    const moveEraser = (from: [number, number, number, number], to: [number, number, number, number], dur: number) =>
      new Promise<void>((done) => {
        const rest = restOf.get(eraser) || measureRest(eraser);
        const t0 = performance.now();
        const step = () => {
          if (disposed) return done();
          const p = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
          const e = ease(p);
          const [x, y, a, s] = from.map((v, i) => v + (to[i] - v) * e);
          setEraser(`translate(${x - rest.x}px, ${y - rest.y}px) rotate(${a}deg) scale(${s})`);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        step();
      });
    /** クリーナーの口から粉がぱっと舞い上がり、左右へ散って粉受けに落ちる（汚れていたほど多く） */
    const puff = (x: number, y: number, w: number, amount: number) => {
      for (let i = Math.round(14 + 36 * amount); i > 0; i--) {
        if (reduce) spawn(x + (Math.random() - 0.5) * w, y - Math.random() * 26, 0, 0, 0.55 + Math.random() * 0.4, 1 + Math.random() * 1.6);
        else spawn(x + (Math.random() - 0.5) * w * 0.8, y - Math.random() * 4, (Math.random() - 0.5) * 2.2, -1.2 - Math.random() * 1.9, 0.55 + Math.random() * 0.35, 1 + Math.random() * 1.6);
      }
      kick();
    };
    /** 粉受けの黒板消しを押した：黒板消しから粉がぱふっと少し出て落ちる（1回10〜20粒・汚れていたほど多く）。汚れは減らない */
    const tapEraser = () => {
      const b = board.getBoundingClientRect();
      const r = eraser.getBoundingClientRect();
      if (!r.width) return;
      const x0 = r.left - b.left;
      // 粉受けより上から出す（スマホの粉受けでは、黒板消しの下半分が粉受けの縁に重なっている）
      const y = Math.min(floorNow(true) - 2, r.top - b.top + r.height * 0.4);
      for (let i = 10 + Math.round(Math.random() * 4 + 6 * Math.min(1, load)); i > 0; i--) {
        if (reduce) spawn(x0 + Math.random() * r.width, y - Math.random() * 14, 0, 0, 0.55 + Math.random() * 0.35, 1 + Math.random() * 1.5);
        else spawn(x0 + r.width * (0.08 + Math.random() * 0.84), y - Math.random() * 3, (Math.random() - 0.5) * 1.6, -0.6 - Math.random() * 1.5, 0.55 + Math.random() * 0.35, 1 + Math.random() * 1.5);
      }
      kick();
    };
    /** from＝こすっていた手の位置（無ければ粉受けから飛んでいく） */
    const toCleaner = async (from: { x: number; y: number } | null) => {
      if (!cleaner || cleaning) return;
      cleaning = true;
      const before = load;
      try {
        const b = board.getBoundingClientRect();
        const cr = cleaner.getBoundingClientRect();
        const mx = cr.left - b.left + cr.width / 2;
        const my = cr.top - b.top + cr.height * 0.2;
        const ew = eraser.offsetWidth || 66;
        const eh = eraser.offsetHeight || 22;
        // 口の幅に収まる大きさで差し込む（スマホのクリーナーは黒板消しより小さい）
        const s = Math.min(1, (cr.width * 0.86) / ew);
        if (!reduce) {
          const start: [number, number, number, number] = from ? [from.x, from.y, 90, 1] : (() => {
            const r = measureRest(eraser);
            return [r.x, r.y, 0, 1] as [number, number, number, number];
          })();
          await moveEraser(start, [mx, my - (eh * s) / 2 - 8, 0, s], from ? 260 : 340);
          await moveEraser([mx, my - (eh * s) / 2 - 8, 0, s], [mx, my + 3 - (eh * s) / 2, 0, s], 110);
        }
        cleaner.classList.remove("is-running");
        void cleaner.offsetWidth;
        cleaner.classList.add("is-running");
        later(() => cleaner.classList.remove("is-running"), 850);
        puff(mx, my, cr.width, Math.max(before, 0.3));
        later(() => puff(mx, my, cr.width, Math.max(before, 0.3) * 0.5), reduce ? 380 : 420);
        load = 0;
        showLoad(true);
        saveLoad();
        if (!reduce) {
          // 機械と一緒に、差し込んだ黒板消しも小刻みに震える
          const rest = restOf.get(eraser) || measureRest(eraser);
          const t0 = performance.now();
          await new Promise<void>((done) => {
            const step = () => {
              if (disposed) return done();
              const t = performance.now() - t0;
              const j = t < 700 ? Math.sin(t * 0.35) * 0.8 : 0;
              setEraser(`translate(${mx - rest.x + j}px, ${my + 3 - (eh * s) / 2 - rest.y + Math.abs(j) * 0.4}px) scale(${s})`);
              if (t < 760) requestAnimationFrame(step);
              else done();
            };
            step();
          });
        }
      } finally {
        if (active !== "rub") putBack(eraser);
        cleaning = false;
      }
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
          restoreMarksIn(it);
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
          restoreMarksIn(it);
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

    /* ---------------- 書きなおす札：見えない手が黒板を全部拭いて、最初の板書を書き直す ---------------- */
    /** 黒板消しの面で、通ったところをきれいに拭く（文字・落書き・拭き跡・焼き付き） */
    const wipeClean = (x0: number, y0: number, x1: number, y1: number) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 6));
      const ux = d > 0.5 ? (x1 - x0) / d : 0;
      const uy = d > 0.5 ? (y1 - y0) / d : 0;
      for (let i = 1; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * i) / n;
        for (const c of [chalk, doodle, smear, ghost]) stampAt(c, x, y, 1, 1, solid);
        if (i % 3 === 0) emitRub(x, y, ux, uy, 1);
      }
    };
    /** 見えている所を、上から横に往復して拭く（見えていない所は、拭き終わりにまとめて消える） */
    const wipeBoard = async () => {
      const rest = measureRest(eraser);
      const b = board.getBoundingClientRect();
      const top = Math.max(0, -b.top);
      const bottom = Math.min(H, window.innerHeight - b.top);
      const [y0, y1] = bottom - top > 60 ? [top + 26, bottom - 20] : [26, H - 20];
      const pts: Pt[] = [[rest.x, rest.y]];
      let dir = 0;
      for (let y = y0; y < y1 + 28; y += 56) {
        const yy = Math.min(y, y1);
        pts.push(dir ? [W - 16, yy] : [16, yy], dir ? [16, yy] : [W - 16, yy]);
        dir ^= 1;
      }
      for (let i = 1; i < pts.length; i++) {
        if (skipWrite || disposed) break;
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const dur = i === 1 ? 380 : ay !== by ? 50 : 70 + W * 0.08;
        const t0 = performance.now();
        let px = ax;
        let py = ay;
        await new Promise<void>((done) => {
          const step = () => {
            if (disposed || skipWrite) return done();
            const p = Math.min(1, (performance.now() - t0) / dur);
            const e = ease(p);
            const x = ax + (bx - ax) * e;
            const y = ay + (by - ay) * e;
            hold(eraser, x, y, 90);
            if (i > 1) wipeClean(px, py, x, y);
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
    /** 線を左から右へ、細い帯ずつ書き足す（同じ所に二度描かない） */
    const revealMark = (m: Mark, dur: number) =>
      new Promise<void>((done) => {
        const t0 = performance.now();
        let px = m.x;
        const step = () => {
          if (disposed) return done();
          const p = dur && !skipWrite ? Math.min(1, (performance.now() - t0) / dur) : 1;
          const nx = p >= 1 ? m.x + m.w : Math.round((m.x + m.w * p) * dpr) / dpr;
          if (nx > px) {
            chalk.save();
            chalk.beginPath();
            chalk.rect(px, m.y, nx - px, m.h);
            chalk.clip();
            drawMark(chalk, m);
            chalk.restore();
            px = nx;
          }
          if (p < 1) requestAnimationFrame(step);
          else {
            m.on = true;
            if (mode === "burn") drawMark(ghost, m, 0.2);
            done();
          }
        };
        step();
      });
    /** 最初の板書を、見えない手が順に書く（見えている字だけ書く動きを見せ、ほかは一度に戻す） */
    const writeAll = async () => {
      chalk.clearRect(0, 0, W, H);
      smear.clearRect(0, 0, W, H);
      ghost.clearRect(0, 0, W, H);
      doodle.clearRect(0, 0, W, H);
      resetWear();
      for (const m of marks) m.on = false;
      const b = board.getBoundingClientRect();
      const vt = -b.top - 40;
      const vb = window.innerHeight - b.top + 40;
      const jobs: Promise<void>[] = [];
      for (const it of items) {
        const seen = it.y + it.h > vt && it.y < vb;
        jobs.push(
          (async () => {
            await writeItem(it, seen ? 110 + it.text.length * 32 : 0);
            if (it.kind === "smudge") wipeSeeded(it, 5, 6, 0.3, 0.01);
            if (mode === "burn") drawText(ghost, it, 0.2);
          })(),
        );
        if (seen && !skipWrite) await wait(50);
      }
      await Promise.all(jobs);
      // 字を書き終えてから、横線・矢印・丸を書き足す（あとから誰かが書き込んだように）
      for (const m of marks) {
        const seen = m.y + m.h > vt && m.y < vb;
        await revealMark(m, seen ? 220 : 0);
        if (seen && !skipWrite) await wait(60);
      }
    };
    const resetBoard = async () => {
      if (busy || cleaning || disposed) return;
      busy = true;
      skipWrite = false;
      // 書き直し・見えない手の落書きを止める
      rewriteToken++;
      window.clearTimeout(idleTimer);
      ghostToken++;
      ghostMarks = [];
      plate?.setAttribute("aria-busy", "true");
      // 自分の落書き（列の組み方の両方）と、こすった回数を消す
      strokes = [];
      savePending = false;
      window.clearTimeout(saveTimer);
      try {
        for (const k of ["wide", "narrow"]) localStorage.removeItem(`gbf_${site.year}_doodle_v2:${k}`);
      } catch {}
      try {
        const animate = !reduce && state.phase !== "after";
        if (animate) await wipeBoard();
        if (disposed) return;
        syncText();
        if (Math.abs(board.clientWidth - W) + Math.abs(board.clientHeight - H) > 2) sizeCanvases();
        collect();
        doodle.clearRect(0, 0, W, H);
        headPending = false;
        if (animate) await writeAll();
        else drawAll();
        placeNowMark();
      } finally {
        busy = false;
        skipWrite = false;
        plate?.removeAttribute("aria-busy");
        settleLayout();
      }
    };
    const onReset = () => {
      lastUser = performance.now();
      resetBoard();
    };
    plate?.addEventListener("click", onReset);

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
      // クリーナーの位置（こすっている間は動かない。スマホの粉受けは貼り付いて動くので、こすり始めに測る）
      cleanerBox = cleaner ? cleaner.getBoundingClientRect() : null;
      rubLoad = load;
      if (strokes.some((st) => st.t === "c")) eraseStroke = { t: "e", p: [norm(last.x, W), norm(last.y, W)] };
    };
    /** こすり終わり：汚れを保存し、消した跡を落書きの記録に足す */
    const finishRub = () => {
      scheduleReturn();
      showLoad(true);
      saveLoad();
      if (eraseStroke && eraseStroke.p.length > 2) {
        strokes.push(eraseStroke);
        saveDoodle();
      }
      eraseStroke = null;
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
        finishRub();
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
      lastUser = performance.now();
      ghostToken++;
      // 書きなおす札は押すだけ（click で受ける）。こすりも書きも始めない
      if ((e.target as HTMLElement).closest(".kb-reset")) return;
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
        else {
          // 黒板消しは押したら持つだけ（粉がぱふっと出る。消しも書き直しもしない）。クリーナーを押すと、黒板消しが飛んでいって入る（見えない手が黒板を使っている間はしない）
          selectTool({ kind: "eraser", el: eraser });
          if (toolEl.dataset.tool === "cleaner") {
            if (!busy) toCleaner(null);
          } else tapEraser();
        }
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // クリーナーに入れている間は、こすらない（黒板消しが機械の中にある）
      if (cleaning) return;
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
      // 黒板消しを持ったままクリーナーの上まで来た：こするのをやめて、クリーナーに入れる
      if (cleanerBox && e.clientX > cleanerBox.left - 6 && e.clientX < cleanerBox.right + 6 && e.clientY > cleanerBox.top - 6 && e.clientY < cleanerBox.bottom + 6) {
        finishRub();
        active = null;
        armed = false;
        cleanerBox = null;
        toCleaner(p);
        return;
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
    // 見えない手の気まぐれは、その分の時刻で決まる（同じ時刻に見ている人には同じ落書き）
    const minuteRng = (salt: number) => rng(Math.floor(now() / 60000) * 31 + salt);
    const freeSpot = (w: number, h: number, pick: number): { x: number; y: number } | null => {
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
      return pool[Math.floor(pick * pool.length)];
    };
    const ghostDraw = async (token: number) => {
      const defs = site.ghostDoodles;
      if (!defs.length) return;
      const r = minuteRng(1);
      const def = defs[Math.floor(r() * defs.length)];
      const w = 70 + r() * 50;
      const h = w / (def.aspect || 1);
      const spot = freeSpot(w, h, r());
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
                if (k % 4 === 0) emitRub(sx, sy, d > 0.5 ? (x - px) / d : 0, d > 0.5 ? (y - py) / d : 0);
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
      if (ghostBusy || busy || active || cleaning || reduce || document.hidden) return;
      if (state.phase === "after" || !QUIET_SCENES.has(state.scene) || world.dataset.gate !== "open") return;
      if (performance.now() - lastUser < GHOST_IDLE_MS || !boardInView()) return;
      ghostBusy = true;
      const token = ++ghostToken;
      try {
        if (ghostMarks.length >= 2 || (ghostMarks.length && minuteRng(2)() < 0.45)) await ghostErase(token);
        else await ghostDraw(token);
      } finally {
        ghostBusy = false;
        // 次の気配まで、8〜22秒あける（描いた落書きはしばらく残る）
        lastUser = performance.now() - GHOST_IDLE_MS + 8000 + minuteRng(3)() * 14000;
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

    /** 検分用：こすった回数・汚れ・書きなおす・クリーナー（Preview と手元だけ） */
    const kbWin = window as unknown as { __kbBoard?: unknown };
    if (debugAllowed()) {
      /** chalk の canvas の、その範囲（黒板の座標・px）のアルファの合計 */
      const alphaSum = (x = 0, y = 0, w = W, h = H) => {
        const sx = Math.max(0, Math.round(x * dpr));
        const sy = Math.max(0, Math.round(y * dpr));
        const sw = Math.min(chalkC.width - sx, Math.round(w * dpr));
        const sh = Math.min(chalkC.height - sy, Math.round(h * dpr));
        if (sw <= 0 || sh <= 0) return 0;
        const data = chalk.getImageData(sx, sy, sw, sh).data;
        let sum = 0;
        for (let i = 3; i < data.length; i += 4) sum += data[i];
        return sum;
      };
      kbWin.__kbBoard = {
        /** いちばんこすられた場所の往復の回数 */
        get wear() {
          return Math.round(wearMax * 100) / 100;
        },
        get load() {
          return Math.round(load * 1000) / 1000;
        },
        get dust() {
          return parts.length;
        },
        /** 粉の様子：数・粉受けに溜まっている数・光る粒の数・落ちている粒（粉受けより上で生まれたもの）の下の端の最大・粉受けの上面 */
        dustInfo: () => {
          const fall = parts.filter((p) => p.kind === "fall" && !p.under);
          return {
            n: parts.length,
            landed: parts.filter((p) => p.landed > 0).length,
            glint: parts.filter((p) => p.glint).length,
            maxY: fall.length ? Math.round(Math.max(...fall.map((p) => p.y)) * 10) / 10 : null,
            floor: Math.round(floorNow(true) * 10) / 10,
          };
        },
        /** 粉受けの黒板消しを押したときと同じ（粉がぱふっと出る） */
        tap: () => tapEraser(),
        get cleaning() {
          return cleaning;
        },
        alpha: alphaSum,
        /** その行を横に times 往復こする（x0〜x1・高さ y）。こすったあとのアルファの合計を返す */
        rub: (x0: number, x1: number, y: number, times = 1) => {
          rubLoad = load;
          for (let t = 0; t < times; t++)
            for (const [a, b] of [
              [x0, x1],
              [x1, x0],
            ]) {
              const n = Math.max(1, Math.ceil(Math.abs(b - a) / 8));
              for (let i = 0; i < n; i++) eraseSeg(a + ((b - a) * i) / n, y, a + ((b - a) * (i + 1)) / n, y);
            }
          scheduleReturn();
          saveLoad();
          return alphaSum(Math.min(x0, x1), y - SH / 2, Math.abs(x1 - x0), SH);
        },
        /** 字と線の位置（黒板の座標） */
        items: () => items.map((it) => ({ kind: it.kind, text: it.text, x: Math.round(it.x), y: Math.round(it.y), w: Math.round(it.w), h: Math.round(it.h) })),
        marks: () => marks.map((m) => ({ owner: m.owner, x: m.x, y: m.y, w: m.w, h: m.h, on: m.on })),
        reset: () => resetBoard(),
        clean: () => toCleaner(null),
      };
    }

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
    window.addEventListener("pagehide", saveLoad);
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
      saveLoad();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(moteRaf);
      ro.disconnect();
      wideMq.removeEventListener("change", onWide);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ARRIVE_EVENT, onArrive);
      window.removeEventListener(DEPART_EVENT, onDepart);
      window.removeEventListener("pagehide", flushDoodle);
      window.removeEventListener("pagehide", saveLoad);
      window.removeEventListener(CLOCK_EVENT, onClock);
      board.removeEventListener("pointerdown", onDown);
      room.removeEventListener("pointermove", onMove);
      board.removeEventListener("pointerup", endTouch);
      board.removeEventListener("pointercancel", endTouch);
      plate?.removeEventListener("click", onReset);
      plate?.removeAttribute("aria-busy");
      cleaner?.classList.remove("is-running");
      delete kbWin.__kbBoard;
      [dustC, doodleC, chalkC, smearC, ghostC, motesC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas", "is-drawing");
    };
  }, []);

  return null;
}
