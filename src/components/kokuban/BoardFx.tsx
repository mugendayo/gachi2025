"use client";
// 黒板の上乗せ：世界時計の反映・壁の時計・こする・チョークで書く・懐中電灯・時間帯の仕掛け。
// DOM の文字が正本（読み上げ・JSなし）。ここでは同じ文字を canvas に写してチョークの質感を付け、
// こすると canvas だけが消える。消したあとの戻り方は2通り（?return=rewrite で切り替え・既定は焼き付き）。
// 粉受けのチョークを拾うと、黒板に好きな文字を書ける（落書きはその端末に残る）。
// 同じ所を何度もこする（10回ほど）と、そこはゼロまで消える。黒板消しはこするほど汚れ、汚れるほど消えにくく、
// やがて字が伸びて広がり、こすった所が白く濁る。クリーナーの上でこするときれいになる。
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
// 汚れ切った黒板消しのにじみの濃さ（こすり始め。同じ所をこするほど弱まる）
const SMUDGE_BAD = 0.3;
// 汚れた黒板消しのにじみで、すくった所から減らす粉の割合（にじみの濃さに対して）
const LIFT = 0.5;
// こすった回数：黒板を粗い格子に分けて、その場所を何回（片道）こすったかを数える（保存しない。書きなおす・読み込み直しで0）。
// こすった回数は片道で数える（本人「10回くらいこすったら、次第にゼロまで」）。WEAR_SOFT 回までは今の手ざわり（少しずつかすれる・にじむ・跡が残る）、そこから強まり、WEAR_GONE 回でその場所はゼロになる
const CELL = 24;
const WEAR_SOFT = 3;
const WEAR_GONE = 10;
// 動きを減らす設定の粉：その場でふわっと現れて、この時間で消える（動かない）
const STILL_MS = 400;
// 黒板消しの汚れ（0〜1）：こするほど粉を含んで白くなる。クリーナーでこすると落ちる（その端末に残す）
const eraserKey = () => `gbf_${site.year}_eraser_v1`;
// 溜まり方：LOAD_SPAN の長さ（黒板の幅。広い画面では LOAD_SPAN_MAX まで）を LOAD_PASSES 回こすると真っ白（1）
const LOAD_PASSES = 20;
const LOAD_SPAN_MAX = 600;
// 効き方は3段：LOAD_DULL 未満＝きれい（今までどおり）／LOAD_DULL〜LOAD_BAD＝だんだん消えにくい／LOAD_BAD 以上＝こするほど広がって白く濁る
const LOAD_DULL = 0.35;
const LOAD_BAD = 0.7;
// クリーナーの口の幅を、片道 CLEAN_PASSES 回こすると汚れが0（6往復）
const CLEAN_PASSES = 12;
// クリーナーの口（絵の中の上面の溝の位置。src/data/assetGeometry.json の cleaner.slot と同じ値・%）
const SLOT = { l: 12.58, t: 3.66, w: 71.84, h: 10.3 };
// 粉受けの溝に溜まった粉（0〜1）：こすった長さで増え、黒板消しを押すと舞って少し減る。最初から少しある
const TRAY_PASSES = 30;
const TRAY_START = 0.25;
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
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
    // 汚れた黒板消しの面が黒板に残す粉の筋：面を何本かの帯に分け、帯ごとに決まった濃さで、動いた向きに引く
    // （同じ帯は毎回同じ濃さ＝フェルトの筋）。拭き跡のもやの層に描くので、こすっても真っ白にはならない（上限は CSS）
    const LANES = (() => {
      const r = rng(41);
      return Array.from({ length: 11 }, (_, k) => ({ o: k / 10 - 0.5 + (r() - 0.5) * 0.05, a: 0.25 + r() * 0.75, w: 1 + r() * 2.6 }));
    })();
    const powderAt = (x0: number, y0: number, x1: number, y1: number, amount: number) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d < 0.3 || amount <= 0) return;
      const ux = (x1 - x0) / d;
      const uy = (y1 - y0) / d;
      // 面の、動く向きと直角の幅（横に動けば縦の長さ）
      const span = (Math.abs(ux) * SH + Math.abs(uy) * SW) * 0.92;
      smear.save();
      // 端は平ら（丸いと細かく区切った線の継ぎ目が重なって、ゆっくり動かすほど濃い点が並ぶ）
      smear.lineCap = "butt";
      smear.strokeStyle = "rgb(236,238,230)";
      for (const ln of LANES) {
        const ox = -uy * ln.o * span;
        const oy = ux * ln.o * span;
        smear.globalAlpha = Math.min(1, amount * ln.a);
        smear.lineWidth = ln.w;
        smear.beginPath();
        smear.moveTo(x0 + ox, y0 + oy);
        smear.lineTo(x1 + ox, y1 + oy);
        smear.stroke();
      }
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
    // 粒（P）：fall＝舞った粉（少し舞い上がってから重力で加速して落ち、左右にわずかに揺れる。小さな粒ほどゆっくり）。
    // 粉受けの上面（PC＝黒板の下の縁／スマホ＝画面の下に貼り付いた粉受け。位置は毎コマ測る）に当たると止まり、
    // しばらく白く溜まってから薄れて消える／still＝動きを減らす設定の粉（動かずに、その場でふわっと現れて STILL_MS で消える）。
    // 雲（Cloud）：粉受けの粉やクリーナーの口から舞い上がる、ぼやけた白いかたまり。横へ広がりながら少し上がり、ふくらんで薄れて消える。
    // 窓の光の筋（消灯中は懐中電灯の円）の中では少し明るく見える
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
      /** 揺れの位相 */
      ph: number;
      /** 粉受けに着いた時刻（0＝まだ落ちている）と、溜まっている長さ */
      landed: number;
      stay: number;
      /** 粉受けより下で生まれた（粉受けの陰を落ちていく。上に出たら、ほかの粒と同じく粉受けに着く） */
      under: boolean;
      /** 落ちる速さの倍率（1＝ふつう。小さいほど空中にただよってから、ゆっくり落ちる） */
      fl: number;
    };
    type Cloud = { x: number; y: number; vx: number; vy: number; r0: number; r1: number; a: number; born: number; life: number; still: boolean };
    const DUST_MAX = 360; // 粒の数の上限（超えたら、溜まっている古い粒から入れ替える）
    const CLOUD_MAX = 72;
    const PILE_MS = 1700; // 粉受けに溜まっている長さ（粒ごとに 0.7〜1.3 倍）
    const PILE_FADE = 900;
    const parts: P[] = [];
    const clouds: Cloud[] = [];
    let raf = 0;
    let dustLast = 0;
    // 雲が明るく見える所を測るための、教室の中の黒板の位置（粉受けを測るときに一緒に測る）
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
    // 光が当たっている所（黒板の座標で 0〜1）：窓の光の筋の中・消灯中の懐中電灯の円の中
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
      return rx > left && rx < right ? clamp01(state.sun * (1 - state.dark) * (1 - 0.3 * state.lit)) : 0;
    };
    // 雲の形（ぼやけた白いかたまり。いくつかの丸を重ねて、輪郭を少しいびつに）。明るい版は光の中で上に重ねる。
    // 中に細かなざらつき（粒の濃淡）を入れて、煙ではなく粉の塵に見せる
    const makePuff = (rgb: string) => {
      const c = document.createElement("canvas");
      c.width = c.height = 96;
      const g = c.getContext("2d")!;
      const r = rng(61);
      for (let i = 0; i < 8; i++) {
        const cx = 48 + (r() - 0.5) * 30;
        const cy = 48 + (r() - 0.5) * 18;
        const rad = 18 + r() * 18;
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        rg.addColorStop(0, `rgba(${rgb},0.36)`);
        rg.addColorStop(0.55, `rgba(${rgb},0.17)`);
        rg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = rg;
        g.fillRect(0, 0, 96, 96);
      }
      // ざらつき：薄い所を抜き、濃い粒を足す（真ん中ほど多い）
      const near = () => {
        const a = r() * 6.283;
        const d = Math.sqrt(r()) * 40;
        return [48 + Math.cos(a) * d, 48 + Math.sin(a) * d * 0.75, 1 - d / 40] as const;
      };
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 260; i++) {
        const [x, y, f] = near();
        g.fillStyle = `rgba(0,0,0,${(0.22 * (1 - f * 0.5)).toFixed(3)})`;
        g.fillRect(x, y, 1.5 + r() * 2.5, 1.5 + r() * 2.5);
      }
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 360; i++) {
        const [x, y, f] = near();
        g.fillStyle = `rgba(${rgb},${(0.1 + 0.32 * f * r()).toFixed(3)})`;
        g.fillRect(x, y, 1 + r() * 1.6, 1 + r() * 1.6);
      }
      return c;
    };
    const puffImg = makePuff("222,222,214");
    const puffLit = makePuff("255,252,242");
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
      // 雲
      let m = 0;
      for (const c of clouds) {
        const age = t - c.born;
        if (age >= c.life) continue;
        const u = age / c.life;
        let r: number;
        let a: number;
        if (c.still) {
          r = lerp(c.r0, c.r1, 0.6);
          a = c.a * (age < 120 ? age / 120 : Math.max(0, 1 - (age - 120) / (c.life - 120)));
        } else {
          // 広がりながら勢いが落ちる。大きさは初めに急にふくらみ、だんだんゆっくり
          c.x += c.vx * k;
          c.y += c.vy * k;
          c.vx *= Math.pow(0.962, k);
          c.vy *= Math.pow(0.972, k);
          r = lerp(c.r0, c.r1, 1 - Math.pow(1 - u, 2.6));
          a = c.a * (u < 0.08 ? u / 0.08 : Math.pow(1 - (u - 0.08) / 0.92, 1.1));
        }
        clouds[m++] = c;
        // 横に少し長い（横へ広がる粉塵）
        const rx = r * 1.45;
        const ry = r * 0.8;
        dust.globalAlpha = Math.min(1, a);
        dust.drawImage(puffImg, c.x - rx, c.y - ry, rx * 2, ry * 2);
        const lit = glowAt(c.x, c.y);
        if (lit > 0.05) {
          dust.globalAlpha = Math.min(1, a * lit * 0.55);
          dust.drawImage(puffLit, c.x - rx, c.y - ry, rx * 2, ry * 2);
        }
      }
      clouds.length = m;
      dust.globalAlpha = 1;
      // 粒
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
          const vt = (1.6 + p.r * 1.3) * p.fl;
          p.vy = Math.min(vt, p.vy + (0.03 + 0.02 * p.r) * p.fl * k);
          p.vx *= Math.pow(0.97, k);
          const sway = Math.sin(p.ph + (t - p.born) * 0.004) * (p.vy > 0 ? 0.2 / Math.sqrt(p.fl) : 0.05);
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
      }
      parts.length = n;
      raf = n || m ? requestAnimationFrame(loop) : 0;
    };
    /** 粉を1粒（vy＜0 で少し舞い上がってから落ちる。fl＝落ちる速さの倍率） */
    const spawn = (x: number, y: number, vx: number, vy: number, a: number, r: number, fl = 1) => {
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
        landed: 0,
        stay: PILE_MS * (0.7 + Math.random() * 0.6),
        under: y >= floorNow(),
        fl,
      });
    };
    /** 雲を1つ（vx・vy＝1コマあたりの初めの速さ。r0→r1 にふくらむ） */
    const cloudAt = (x: number, y: number, vx: number, vy: number, r0: number, r1: number, a: number, life: number) => {
      if (clouds.length >= CLOUD_MAX) clouds.shift();
      clouds.push({ x, y, vx: reduce ? 0 : vx, vy: reduce ? 0 : vy, r0, r1, a, born: performance.now(), life: reduce ? Math.min(life, 760) : life, still: reduce });
    };
    // 雲の大きさは黒板の幅で少し変える（スマホでは小さめ）
    const cloudScale = () => Math.min(1, Math.max(0.8, W / 900));
    const kick = () => {
      if ((parts.length || clouds.length) && !raf) {
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
    /** こすった粉：小さく薄い灰白の粒が、黒板消しの縁からこぼれて、ほとんど舞わずに重力で落ちる（ux,uy＝動いた向き） */
    const emitRub = (x: number, y: number, ux: number, uy: number, n = 1) => {
      for (let i = 0; i < n; i++) {
        let px: number;
        let py: number;
        if ((ux || uy) && Math.random() < 0.6) {
          // 動いてきた側の縁（黒板消しの下に隠れないように）
          const half = Math.abs(ux) * (SW / 2) + Math.abs(uy) * (SH / 2);
          const span = (Math.abs(ux) * SH + Math.abs(uy) * SW) * 0.9;
          const back = half + 2 + Math.random() * 5;
          const side = (Math.random() - 0.5) * span;
          px = x - ux * back - uy * side;
          py = y - uy * back + ux * side;
        } else {
          // 下の縁
          px = x + (Math.random() - 0.5) * SW;
          py = y + SH / 2 + 1 + Math.random() * 3;
        }
        // 数は少なく、1粒ずつは目で追える大きさ・濃さ（細かすぎると、落ちていくのが見えない）。ゆっくりめに落ちる
        spawn(px, py, (Math.random() - 0.5) * 0.25, -0.05 - Math.random() * 0.2, 0.4 + Math.random() * 0.2, 1.3 + Math.random() * 0.9, 0.8);
      }
      kick();
    };
    // こすった長さをためて、一定の長さごとに1粒だけ出す（点の間隔や速さによらず同じ量）
    let rubDustAcc = 0;
    const RUB_DUST_EVERY = 42;

    /* ---------------- 粉受けの溝に溜まった粉 ---------------- */
    let trayDust = TRAY_START;
    let trayShown = -1;
    const trayC = document.createElement("canvas");
    trayC.className = "kb-tray-dust";
    trayC.setAttribute("aria-hidden", "true");
    trayEl?.prepend(trayC);
    const trayG = trayC.getContext("2d")!;
    // 溝の中の粉のかたまり（毎回同じ並び）。th＝見え始める溜まり具合（小さいものから先に見える）
    const TRAY_BITS = (() => {
      const r = rng(53);
      const centers = Array.from({ length: 7 }, () => r());
      return Array.from({ length: 120 }, () => {
        const c = centers[Math.floor(r() * centers.length)];
        const x = Math.min(0.99, Math.max(0.01, c + (r() + r() + r() - 1.5) * 0.12));
        return { x, y: r(), w: 0.01 + r() * 0.05, h: 0.18 + r() * 0.3, a: 0.25 + r() * 0.5, th: Math.pow(r(), 1.4) * 0.95 };
      });
    })();
    const TRAY_UP = 6; // 粉受けの上の縁より上に描ける高さ（CSS の .kb-tray-dust と同じ）
    const drawTray = (force = false) => {
      if (!trayEl) return;
      if (!force && Math.abs(trayDust - trayShown) < 0.02) return;
      trayShown = trayDust;
      const w = trayEl.clientWidth;
      const h = trayEl.clientHeight;
      if (!w || !h) return;
      const k = dpr;
      const th = h + TRAY_UP;
      if (trayC.width !== Math.round(w * k) || trayC.height !== Math.round(th * k)) {
        trayC.width = Math.round(w * k);
        trayC.height = Math.round(th * k);
      }
      trayG.setTransform(k, 0, 0, k, 0, 0);
      trayG.clearRect(0, 0, w, th);
      if (trayDust < 0.01) return;
      const blob = (cx: number, cy: number, rx: number, ry: number, a: number) => {
        const g = trayG.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0, `rgba(238,237,230,${a.toFixed(3)})`);
        g.addColorStop(0.55, `rgba(232,231,224,${(a * 0.6).toFixed(3)})`);
        g.addColorStop(1, "rgba(232,231,224,0)");
        trayG.save();
        trayG.translate(cx, cy);
        trayG.scale(1, ry / rx);
        trayG.translate(-cx, -cy);
        trayG.fillStyle = g;
        trayG.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
        trayG.restore();
      };
      // 溝の底（粉受けの絵の高さ 35〜85%）：金属の光を覆う、つやのない白っぽい粉の帯
      const top = TRAY_UP + h * 0.35;
      const bh = h * 0.5;
      const film = trayG.createLinearGradient(0, top, 0, top + bh);
      film.addColorStop(0, "rgba(232,231,224,0)");
      film.addColorStop(0.55, `rgba(232,231,224,${(0.45 * trayDust).toFixed(3)})`);
      film.addColorStop(1, `rgba(232,231,224,${(0.2 * trayDust).toFixed(3)})`);
      trayG.fillStyle = film;
      trayG.fillRect(0, top, w, bh);
      for (const bit of TRAY_BITS) {
        if (trayDust <= bit.th) continue;
        const a = bit.a * Math.min(1, (trayDust - bit.th) / 0.2 + 0.3);
        const rx = (bit.w * w * (0.6 + trayDust * 0.9)) / 2;
        const cx = bit.x * w;
        // 溝の底のかたまり
        blob(cx, top + bh * (0.3 + bit.y * 0.5), rx, bit.h * bh, Math.min(0.85, a * 1.2));
        // 奥の縁に盛り上がった粉（黒板の前に少しだけ見える）。多く溜まるほど高い
        if (bit.y < 0.5) blob(cx + rx * 0.3, TRAY_UP + 0.5, rx * 0.8, (1.2 + 3.2 * trayDust) * (0.6 + bit.h), Math.min(0.8, a));
      }
    };
    const addTrayDust = (v: number) => {
      trayDust = clamp01(trayDust + v);
      drawTray();
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
    const smudgeAt = (src: HTMLCanvasElement, ctx: CanvasRenderingContext2D, k: number, x: number, y: number, mx: number, my: number, alpha: number, lift = 0, taps = 1) => {
      // 黒板消しの下の粉をすくって（縮めてぼかし）、動いた向きに少しずらして薄く置き直す。
      // lift＞0：すくった所の粉をその割合だけ減らす（粉を運ぶ＝足し続けて白く塗り固めない）
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
      if (lift > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = Math.min(1, lift);
        ctx.drawImage(feather, x - PW / 2, y - PH / 2, PW, PH);
        ctx.restore();
      }
      // taps＞1：ずらす途中にも置いて、跡が筋になって続く（字が二重に写ったように見せない）。重ねた濃さが alpha になるよう分ける
      const a = taps > 1 ? 1 - Math.pow(1 - alpha, 1 / taps) : alpha;
      ctx.save();
      ctx.globalAlpha = a;
      for (let t = 1; t <= taps; t++) ctx.drawImage(patch, 0, 0, pw, ph, sx + (mx * t) / taps, sy + (my * t) / taps, sw, sh);
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
    // 黒板消しの汚れ（0＝まっさら、1＝真っ白）。効き方は、その一筆を引いた時点の汚れで決まる。
    // 保存は「汚れ|保存した時刻」。きれいになるのはクリーナーでこすったときだけ（置いておいても、押しても、持ち替えても汚れたまま。
    // 汚れているあいだはクリーナーのランプが点滅して、持っていけばいいと分かる）
    let load = 0;
    try {
      const v = parseFloat((localStorage.getItem(eraserKey()) || "0").split("|")[0]);
      if (Number.isFinite(v)) load = Math.min(1, Math.max(0, v));
      if (load < 0.02) load = 0;
    } catch {}
    let savedLoad = load;
    let shownLoad = -1;
    const saveLoad = () => {
      if (load === savedLoad) return;
      savedLoad = load;
      try {
        localStorage.setItem(eraserKey(), `${load.toFixed(4)}|${Date.now()}`);
      } catch {}
    };
    // 見た目（粉で白くなった面）は、0.02 変わるごとに書く。--load＝粉の点々、--wash＝フェルトが白く覆われる濃さ（汚れの中ほどから強まる）
    const showLoad = (force = false) => {
      // 汚れている（0.3 以上）あいだ、クリーナーの赤いランプがゆっくり点滅する
      cleaner?.classList.toggle("is-blinking", load >= 0.3);
      if (load === shownLoad || (!force && Math.abs(load - shownLoad) < 0.02)) return;
      shownLoad = load;
      eraser.style.setProperty("--load", load.toFixed(3));
      eraser.style.setProperty("--wash", Math.pow(clamp01((load - 0.35) / 0.4), 1.3).toFixed(3));
    };
    showLoad(true);
    /** 汚れの溜まり方の基準の長さ（黒板の幅。広い画面では LOAD_SPAN_MAX まで） */
    const loadSpan = () => Math.max(240, Math.min(W - EDGE * 2, LOAD_SPAN_MAX));

    let eraseStroke: Stroke | null = null;
    let smudgeAcc = 0;
    let smudgeN = 0;
    const eraseSeg = (x0: number, y0: number, x1: number, y1: number, clip?: Item) => {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(d / 4));
      const step = d / n;
      const reach = reachOf(x1 - x0, y1 - y0);
      const ux = d > 0.5 ? (x1 - x0) / d : 0;
      const uy = d > 0.5 ? (y1 - y0) / d : 0;
      // 汚れの効き方（見えない手の黒板消しは汚れない＝いつもきれい）
      const L = clip ? 0 : load;
      // dull＝だんだん消えにくい（LOAD_DULL〜LOAD_BAD で 0→1）／bad＝逆効果（LOAD_BAD から強まり 0.85 で最大）
      const dull = clamp01((L - LOAD_DULL) / (LOAD_BAD - LOAD_DULL));
      const bad = clamp01((L - LOAD_BAD) / 0.15);
      // 1往復で残る割合：きれい 0.5 → 消えにくい 0.88 → 逆効果 0.99（ほとんど消えない）
      const keep = bad > 0 ? lerp(0.88, 0.99, bad) : lerp(RUB_KEEP, 0.88, dull);
      const rub = rubStrength(x1 - x0, y1 - y0, step, keep);
      // にじみ：汚れるほど濃く、遠くへ伸びる
      const smudge = SMUDGE * (1 + 0.8 * dull);
      const stretch = 10 + 6 * dull + 14 * bad;
      if (!clip) {
        // 人がこすった分だけ黒板消しが汚れ、粉受けの溝に粉が溜まる
        const span = loadSpan();
        load = Math.min(1, load + d / (span * LOAD_PASSES));
        addTrayDust(d / (span * TRAY_PASSES));
        showLoad();
      }
      const run = () => {
        let px = x0;
        let py = y0;
        for (let i = 1; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const y = y0 + ((y1 - y0) * i) / n;
          let haze = 0.005; // 見えない手の書き直しのときは拭き跡をごく薄く（日付の地を白くしない）
          if (clip) stampAt(chalk, x, y);
          else {
            // こすった回数：面が1点の上を通り過ぎる間に、片道で 1。
            // 何度もこすった所をゼロにする仕組みは、黒板消しが汚れるほど弱まり、LOAD_BAD で効かなくなる
            const w = addWear(x, y, ux, uy, step);
            const s = clamp01((w - WEAR_SOFT) / (WEAR_GONE - WEAR_SOFT)) * (1 - dull);
            // 人がこする：粉がにじんで伸び、少しずつかすれる
            // すくった粉の一部だけを先へ置く（きれいなうちは消す量より少なく＝こするほど減っていく）。
            // 何度もこすった所では置き直さない（汚れるほど、この止めも弱まる）
            const gate = clamp01(1 - (w - WEAR_SOFT) / 3);
            // 逆効果の伸びは、同じ所をこするほど少しずつ弱まる（伸び切った粉はそれ以上は広がらない＝真っ白にはならない）
            const spread = SMUDGE_BAD / (1 + Math.max(0, w - 1) * 0.4);
            const sm = lerp(smudge * lerp(gate, 1, dull), spread, bad);
            // にじみは、こすった長さ 12px ごとに置く（点の間隔や指の速さによらず同じ量）
            smudgeAcc += step;
            if (smudgeAcc >= 12 && d > 0.5 && sm > 0) {
              smudgeAcc %= 12;
              // 汚れるほど、粉を足すより運ぶ（伸びて広がるが、白く塗り固まらない）。
              // 逆効果の段では運ぶ量を減らす（字の芯が残ったまま、色が擦った向きへ伸びる＝消えない）
              const lift = sm * LIFT * dull * (1 - 0.65 * bad);
              const taps = bad > 0 ? 3 : 1;
              smudgeAt(chalkC, chalk, dpr, x, y, ux * stretch, uy * stretch, sm, lift, taps);
              smudgeAt(doodleC, doodle, dpr, x, y, ux * stretch, uy * stretch, sm, lift, taps);
              if (bad > 0) {
                // 逆効果：向きと直角にも少しずつ広がる（字がぼやけて太る）
                // （濃さも bad に比例させる＝0.7 を越えた瞬間に、にじみが急に倍にならない。落書きも同じようにぼやける）
                const side = 4 * bad * (++smudgeN % 2 ? 1 : -1);
                const sx2 = ux * stretch * 0.5 - uy * side;
                const sy2 = uy * stretch * 0.5 + ux * side;
                smudgeAt(chalkC, chalk, dpr, x, y, sx2, sy2, sm * 0.5 * bad, lift * 0.5 * bad);
                smudgeAt(doodleC, doodle, dpr, x, y, sx2, sy2, sm * 0.5 * bad, lift * 0.5 * bad);
              }
            }
            stampAt(chalk, x, y, 1, rub);
            stampAt(doodle, x, y, 1, rub);
            if (s > 0) {
              // 4回目あたりから、ムラのない面で上乗せして消す。片道で残る割合が (1-s)^1.5 まで下がり、WEAR_GONE でゼロ
              // （焼き付き・拭き跡のもやも一緒に）
              const f = 1 - Math.pow(Math.pow(1 - s, 1.5), Math.max(step, 0.5) / reach);
              for (const c of [chalk, doodle, smear, ghost]) stampAt(c, x, y, 1, f, solid);
            }
            haze = 0.018 * (1 + L) * (1 - s) + 0.01 * dull + 0.008 * bad;
            // 逆効果：黒板消しの粉が黒板に移って、こすった所が白く濁っていく
            if (bad > 0) powderAt(px, py, x, y, 0.14 * bad);
          }
          if (haze > 0) hazeAt(x, y, haze);
          // こすった粉は少しだけ（汚れた黒板消しほど少し多い）
          rubDustAcc += step * (1 + 0.8 * L);
          if (rubDustAcc >= RUB_DUST_EVERY) {
            rubDustAcc -= RUB_DUST_EVERY;
            emitRub(x, y, ux, uy);
          }
          for (const it of items)
            if (!it.dirty && x > it.x - SW / 2 && x < it.x + it.w + SW / 2 && y > it.y - SH / 2 && y < it.y + it.h + SH / 2) it.dirty = true;
          px = x;
          py = y;
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
    const hold = (el: HTMLElement, x: number, y: number, angle: number, scale = 1) => {
      const rest = restOf.get(el) || measureRest(el);
      el.classList.remove("is-moving");
      el.classList.add("is-held");
      el.style.transform = `translate(${x - rest.x}px, ${y - rest.y}px) rotate(${angle}deg)${scale !== 1 ? ` scale(${scale})` : ""}`;
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
    // 黒板消しを持ってこすっている手をクリーナーの上へ持っていくと、黒板消しが口（上面の溝）に乗り、
    // 左右に動かした長さだけ汚れが落ちる（そのあいだ機械が震え、口から粉が舞う。止めると震えも止まる）。
    // クリーナーを押すと、黒板消しが飛んでいって口の上で自動で往復し、きれいになって粉受けに戻る
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
    /**
     * クリーナーの口の位置（黒板の座標）：x0〜x0+w＝口の左右、mx＝真ん中、top＝口の上の縁、
     * ey＝口に乗せた黒板消しの中心の高さ（フェルトが溝に少し沈む）、s＝黒板消しの縮み（スマホのクリーナーは黒板消しより小さい）、ew＝縮めた幅
     */
    const slotOf = (cr: DOMRect) => {
      const b = board.getBoundingClientRect();
      const ew = eraser.offsetWidth || 66;
      const eh = eraser.offsetHeight || 22;
      const s = Math.min(1, (cr.width * 0.86) / ew);
      const x0 = cr.left - b.left + (cr.width * SLOT.l) / 100;
      const w = (cr.width * SLOT.w) / 100;
      const top = cr.top - b.top + (cr.height * SLOT.t) / 100;
      const cy = top + (cr.height * SLOT.h) / 200;
      return { x0, w, mx: x0 + w / 2, top, ey: cy - (eh * s) / 2 + 2, s, ew: ew * s };
    };
    type Slot = ReturnType<typeof slotOf>;
    /** クリーナーの口から粉が舞う（ex＝黒板消しの真ん中、dir＝動く向き、amount＝汚れ 0〜1） */
    const slotPuff = (g: Slot, ex: number, dir: number, amount: number) => {
      const sc = cloudScale();
      const x = ex + dir * (g.ew / 2) * (0.55 + Math.random() * 0.5);
      for (let i = amount > 0.5 ? 2 : 1; i > 0; i--)
        cloudAt(x + (Math.random() - 0.5) * 6, g.top - 2, dir * (0.5 + Math.random() * 1.2), -0.55 - Math.random() * 0.8, 5 * sc, (16 + Math.random() * 14) * sc, 0.08 + 0.36 * amount, 900 + Math.random() * 500);
      if (Math.random() < 0.3 + 0.5 * amount)
        spawn(x, g.top - 3, dir * (0.4 + Math.random() * 1.2), -0.6 - Math.random() * 1, 0.4 + Math.random() * 0.25, 0.8 + Math.random() * 0.8);
      // 軽い粒は口の上に漂ってから、ゆっくり落ちる
      if (Math.random() < 0.5 * amount)
        spawn(x, g.top - 4, dir * (0.3 + Math.random() * 0.9), -0.8 - Math.random() * 1, 0.3 + Math.random() * 0.2, 0.9 + Math.random() * 0.7, 0.22);
      kick();
    };
    // 手でこすってきれいにしている間（scrub＝口の位置。null＝黒板の上をこすっている）
    let scrub: Slot | null = null;
    let scrubX = 0;
    let scrubAcc = 0;
    let buzzTimer = 0;
    /** 動かしている間だけクリーナーが震える（止めると止まる） */
    const buzz = () => {
      cleaner?.classList.add("is-scrubbing");
      window.clearTimeout(buzzTimer);
      buzzTimer = window.setTimeout(() => cleaner?.classList.remove("is-scrubbing"), 170);
    };
    // 手の位置（口の左右の端から端）を、黒板消しの真ん中の動き（口の幅の ±SCRUB_AMP）に写す（黒板消しが口から落ちそうなほどはみ出さない）
    const SCRUB_AMP = 0.3;
    const scrubPos = (g: Slot, x: number) => g.mx + (Math.min(g.x0 + g.w, Math.max(g.x0, x)) - g.mx) * SCRUB_AMP * 2;
    const enterScrub = (p: { x: number; y: number }) => {
      if (!cleanerBox) return;
      const g = slotOf(cleanerBox);
      scrub = g;
      scrubX = Math.min(g.x0 + g.w, Math.max(g.x0, p.x));
      scrubAcc = 0;
      // 縦に持っていた黒板消しが、横向きになって口に吸い付く（短く動かす）
      eraser.classList.add("is-docking", "is-on-cleaner");
      later(() => eraser.classList.remove("is-docking"), 160);
      hold(eraser, scrubPos(g, p.x), g.ey, 0, g.s);
    };
    const moveScrub = (p: { x: number; y: number }) => {
      const g = scrub;
      if (!g) return;
      // 汚れの落ち方は手の動き（口の幅を片道 CLEAN_PASSES 回で0）で数える
      const nx = Math.min(g.x0 + g.w, Math.max(g.x0, p.x));
      const dx = nx - scrubX;
      if (Math.abs(dx) < 0.5) return;
      const before = load;
      load = Math.max(0, load - Math.abs(dx) / (g.w * CLEAN_PASSES));
      if (load < 0.02) load = 0;
      showLoad();
      buzz();
      const ex = scrubPos(g, nx);
      scrubAcc += Math.abs(dx);
      if (scrubAcc >= 16) {
        scrubAcc -= 16;
        if (before > 0.01) slotPuff(g, ex, Math.sign(dx), before);
      }
      scrubX = nx;
      hold(eraser, ex, g.ey + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, g.s);
    };
    const leaveScrub = () => {
      if (!scrub) return;
      scrub = null;
      eraser.classList.remove("is-on-cleaner", "is-docking");
      showLoad(true);
    };
    /** 粉受けの黒板消しを押した：黒板消しの下・まわりの溝の粉が、ぱふっと横へ舞う（溜まっている粉と黒板消しの汚れが多いほど大きい）。
     * 押すたびに溝の粉は少し減る。黒板消しの汚れは減らない */
    const tapEraser = () => {
      const b = board.getBoundingClientRect();
      const r = eraser.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left - b.left + r.width / 2;
      const ew = r.width;
      const y = floorNow(true) - 1;
      const amount = clamp01(trayDust * 0.85 + load * 0.45);
      const sc = cloudScale();
      // 雲：黒板消しの左右の端から、溝に沿って横へ噴き出す（左右交互）。小さめの雲をたくさん重ねて、
      // ひとつながりの粉塵の帯に見せる（速いものほど遠くへ行って薄まる。量が多いほど数が増え、大きく、遠くへ）
      for (let i = Math.max(2, Math.round(4 + 12 * amount)); i > 0; i--) {
        const dir = i % 2 ? 1 : -1;
        const sp = Math.random();
        cloudAt(
          cx + dir * ew * (0.3 + Math.random() * 0.25),
          y - 2 - Math.random() * 6,
          dir * (0.8 + sp * 3.6) * (0.6 + 0.5 * amount),
          -0.25 - Math.random() * 0.7,
          (6 + Math.random() * 5) * sc,
          (26 + Math.random() * 30) * (0.6 + 0.6 * amount) * sc,
          (0.18 + 0.38 * amount) * (1 - 0.35 * sp),
          1100 + Math.random() * 400,
        );
      }
      // 舞い上がって、しばらく教室に漂う薄いもや（溜まりが多いときだけ。ゆっくり上がりながら横へ流れる）
      if (amount > 0.3)
        for (let i = 0; i < 4; i++)
          cloudAt(cx + (i - 1.5) * ew * 0.5 + (Math.random() - 0.5) * 10, y - 6, (i - 1.5) * (0.4 + Math.random() * 0.5), -0.6 - Math.random() * 0.6, 14 * sc, (50 + Math.random() * 35) * amount * sc, 0.07 + 0.17 * amount, 1400 + Math.random() * 200);
      // 細かい粒：勢いよく飛ぶものは重力で溝へ落ち、軽いものは宙に漂ってからゆっくり落ちる
      for (let i = Math.round(3 + 9 * amount); i > 0; i--) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        spawn(cx + dir * ew * (0.2 + Math.random() * 0.4), y - 1 - Math.random() * 3, dir * (0.6 + Math.random() * 1.8), -0.7 - Math.random() * 1.2, 0.4 + Math.random() * 0.3, 0.9 + Math.random() * 1);
      }
      for (let i = Math.round(4 + 14 * amount); i > 0; i--) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        spawn(cx + dir * ew * (0.2 + Math.random() * 0.5), y - 2 - Math.random() * 6, dir * (0.4 + Math.random() * 2.2), -0.9 - Math.random() * 1.4, 0.3 + Math.random() * 0.25, 0.9 + Math.random() * 0.8, 0.22);
      }
      kick();
      trayDust = Math.max(0, trayDust * 0.86 - 0.02);
      drawTray(true);
      // 押した黒板消しが溝に少し沈む
      if (!reduce) {
        eraser.classList.remove("is-pafu");
        void eraser.offsetWidth;
        eraser.classList.add("is-pafu");
        later(() => eraser.classList.remove("is-pafu"), 320);
      }
    };
    /** クリーナーを押した：黒板消しが口の上へ飛んでいき、自動で往復してきれいになり、粉受けに戻る（汚れていなければ短く2往復） */
    const toCleaner = async () => {
      if (!cleaner || cleaning) return;
      cleaning = true;
      const before = load;
      const dirty = before >= 0.05;
      try {
        const g = slotOf(cleaner.getBoundingClientRect());
        if (reduce) {
          // 動きを減らす設定：黒板消しは動かさず、汚れが段々落ちて色が変わるだけ（口の上に粉がふわっと出て消える）
          cleaner.classList.add("is-scrubbing");
          const steps = dirty ? 6 : 2;
          for (let k = 1; k <= steps; k++) {
            await wait(200);
            if (disposed) return;
            load = before * (1 - k / steps);
            showLoad(true);
            if (k % 2 === 1) slotPuff(g, g.mx + (k % 4 === 1 ? -1 : 1) * g.w * 0.25, k % 4 === 1 ? -1 : 1, before * (1 - (k - 1) / steps));
          }
        } else {
          const r = measureRest(eraser);
          eraser.classList.add("is-on-cleaner");
          await moveEraser([r.x, r.y, 0, 1], [g.mx, g.ey - 14, 0, g.s], 340);
          await moveEraser([g.mx, g.ey - 14, 0, g.s], [g.mx, g.ey, 0, g.s], 100);
          if (disposed) return;
          cleaner.classList.add("is-scrubbing");
          const trips = dirty ? 6 : 2;
          const dur = dirty ? 1400 : 520;
          const amp = g.w * SCRUB_AMP;
          let x = g.mx;
          let acc = 0;
          await new Promise<void>((done) => {
            const t0 = performance.now();
            const step = () => {
              if (disposed) return done();
              const t = Math.min(1, (performance.now() - t0) / dur);
              const nx = g.mx + amp * Math.sin(t * trips * Math.PI * 2);
              const dx = nx - x;
              x = nx;
              // 汚れは往復に合わせて少しずつ0へ
              const now0 = load;
              load = before * (1 - t);
              showLoad();
              acc += Math.abs(dx);
              if (acc >= 24) {
                acc -= 24;
                slotPuff(g, x, Math.sign(dx) || 1, dirty ? now0 : 0);
              }
              setEraser(`translate(${x - r.x}px, ${g.ey + (Math.random() - 0.5) * 0.9 - r.y}px) rotate(${(Math.random() - 0.5) * 1.4}deg) scale(${g.s})`);
              if (t < 1) requestAnimationFrame(step);
              else done();
            };
            step();
          });
          cleaner.classList.remove("is-scrubbing");
          await moveEraser([x, g.ey, 0, g.s], [x, g.ey - 10, 0, g.s], 90);
        }
        load = 0;
        showLoad(true);
        saveLoad();
      } finally {
        cleaner.classList.remove("is-scrubbing");
        eraser.classList.remove("is-on-cleaner");
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
        if (i % 8 === 0) emitRub(x, y, ux, uy, 1);
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
        leaveScrub();
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
            if (!busy) toCleaner();
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
      // 黒板消しを持ったままクリーナーの上まで来た：黒板消しが口に乗り、左右に動かすとこすれてきれいになる。
      // クリーナーから離れたら（少しゆとりを持って）、また黒板をこする
      const cb = cleanerBox;
      if (scrub && cb) {
        if (e.clientX > cb.left - 34 && e.clientX < cb.right + 34 && e.clientY > cb.top - 44 && e.clientY < cb.bottom + 30) return moveScrub(p);
        leaveScrub();
        last = p;
        // 消した跡の記録は、クリーナーへ行く前と戻ったあとで分ける（つなぐと、こすっていない所まで記録の上では消える）
        if (eraseStroke) {
          if (eraseStroke.p.length > 2) {
            strokes.push(eraseStroke);
            saveDoodle();
          }
          eraseStroke = { t: "e", p: [norm(p.x, W), norm(p.y, W)] };
        }
      } else if (cb && e.clientX > cb.left - 6 && e.clientX < cb.right + 6 && e.clientY > cb.top - 6 && e.clientY < cb.bottom + 6) {
        return enterScrub(p);
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
    // 見えない手の字：板書と同じ手書きの書体で、小さく少し傾けて書く
    const ghostFont = () => {
      const ref = board.querySelector<HTMLElement>("[data-chalk]");
      return ref ? getComputedStyle(ref).fontFamily : "sans-serif";
    };
    /** チョークを粉受けから書き始めの所まで運ぶ */
    const carry = async (stick: HTMLElement | null, x: number, y: number, mine: () => boolean) => {
      if (!stick) return;
      const rest = measureRest(stick);
      const t0 = performance.now();
      while (mine()) {
        const p = Math.min(1, (performance.now() - t0) / 700);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        hold(stick, rest.x + (x - rest.x) * e, rest.y + (y - rest.y) * e, -35);
        if (p >= 1) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
    };
    /** 誰もいない教室で、見えない手が黒板に小さく書く（本人の言葉4つと、∞・魔法陣。どれを書くかはその分の時刻で決まる） */
    const ghostDraw = async (token: number) => {
      const notes = site.ghostNotes;
      const total = notes.phrases.length + notes.marks.length;
      if (!total) return;
      const r = minuteRng(1);
      const pick = Math.floor(r() * total);
      const sticks = [...board.querySelectorAll<HTMLElement>('[data-tool="chalk"]')];
      const stick = sticks.length ? sticks[Math.floor(r() * sticks.length)] : null;
      const color = stick?.dataset.color || "#f2f0e6";
      const mine = () => token === ghostToken && !disposed;
      try {
        if (pick < notes.phrases.length) {
          // 本人の言葉を、小さく書く
          const text = notes.phrases[pick];
          const size = Math.round(Math.min(19, Math.max(13, W * 0.019)));
          const font = `${size}px ${ghostFont()}`;
          doodle.save();
          doodle.font = font;
          const uw = Math.ceil(doodle.measureText(text).width) + 4;
          doodle.restore();
          const uh = Math.ceil(size * 1.4);
          const rot = ((r() - 0.5) * 10 * Math.PI) / 180;
          const w = Math.abs(uw * Math.cos(rot)) + Math.abs(uh * Math.sin(rot));
          const h = Math.abs(uw * Math.sin(rot)) + Math.abs(uh * Math.cos(rot));
          if (w > W - 24) return;
          // ほかの字にくっつかないよう、まわりに余白をとって空いた所を探す
          const spot = freeSpot(w + 28, h + 18, r());
          if (!spot) return;
          const cx = spot.x + 14 + w / 2;
          const cy = spot.y + 9 + h / 2;
          // 字は一度だけ裏で書いておき、左から少しずつ写す（重ね塗りで濃くならないように）
          const off = document.createElement("canvas");
          off.width = Math.ceil(uw * dpr);
          off.height = Math.ceil(uh * dpr);
          const o = off.getContext("2d")!;
          o.scale(dpr, dpr);
          o.font = font;
          o.textBaseline = "middle";
          o.fillStyle = color;
          o.shadowColor = "rgba(255,255,255,.35)";
          o.shadowBlur = size * 0.1;
          o.fillText(text, 2, uh / 2);
          o.shadowBlur = 0;
          o.globalAlpha = 0.4;
          o.fillText(text, 2.7, uh / 2 + 0.5);
          o.globalAlpha = 1;
          o.globalCompositeOperation = "destination-out";
          o.fillStyle = o.createPattern(makeGrain(13, 0.55), "repeat")!;
          o.fillRect(0, 0, uw, uh);
          const at = (fx: number) => ({ x: cx + (-uw / 2 + uw * fx) * Math.cos(rot), y: cy + (-uw / 2 + uw * fx) * Math.sin(rot) });
          const s0 = at(0);
          await carry(stick, s0.x, s0.y, mine);
          const dur = 300 + text.length * 120;
          const t0 = performance.now();
          let done = 0;
          while (mine()) {
            const p = Math.min(1, (performance.now() - t0) / dur);
            if (p > done) {
              const a = done * uw;
              const b = p * uw;
              doodle.save();
              doodle.translate(cx, cy);
              doodle.rotate(rot);
              doodle.drawImage(off, a * dpr, 0, Math.max(1, (b - a) * dpr), off.height, -uw / 2 + a, -uh / 2, Math.max(1 / dpr, b - a), uh);
              doodle.restore();
              done = p;
              const tip = at(p);
              if (stick) hold(stick, tip.x, tip.y + size * 0.2, -35);
              if (Math.random() < 0.08) emit(tip.x, tip.y + size * 0.3, 4, 1);
            }
            if (p >= 1) break;
            await new Promise((res) => requestAnimationFrame(res));
          }
          if (mine()) ghostMarks.push({ x: spot.x + 6, y: spot.y + 4, w: w + 16, h: h + 10 });
          return;
        }
        // ∞・魔法陣を、線で描く
        const def = notes.marks[pick - notes.phrases.length];
        const w = Math.min(W - 24, 56 + r() * 30);
        const h = w / (def.aspect || 1);
        const found = freeSpot(w + 20, h + 20, r());
        if (!found) return;
        const spot = { x: found.x + 10, y: found.y + 10 };
        await carry(stick, spot.x + def.strokes[0][0] * w, spot.y + def.strokes[0][1] * h, mine);
        for (const st of def.strokes) {
          for (let i = 2; i < st.length; i += 2) {
            if (!mine()) return;
            const x0 = spot.x + st[i - 2] * w;
            const y0 = spot.y + st[i - 1] * h;
            const x1 = spot.x + st[i] * w;
            const y1 = spot.y + st[i + 1] * h;
            chalkLine(x0, y0, x1, y1, color);
            if (stick) hold(stick, x1, y1, -35);
            if (Math.random() < 0.1) emit(x1, y1, 4, 1);
            await wait(14 + Math.hypot(x1 - x0, y1 - y0) * 5);
          }
          await wait(160);
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
                if (k % 10 === 0) emitRub(sx, sy, d > 0.5 ? (x - px) / d : 0, d > 0.5 ? (y - py) / d : 0);
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
      /** canvas の、その範囲（黒板の座標・px）のアルファの合計（既定は字の canvas。k＝その canvas の倍率） */
      const sumOf = (ctx: CanvasRenderingContext2D, k: number, x: number, y: number, w: number, h: number) => {
        const cv = ctx.canvas;
        const sx = Math.max(0, Math.round(x * k));
        const sy = Math.max(0, Math.round(y * k));
        const sw = Math.min(cv.width - sx, Math.round(w * k));
        const sh = Math.min(cv.height - sy, Math.round(h * k));
        if (sw <= 0 || sh <= 0) return 0;
        const data = ctx.getImageData(sx, sy, sw, sh).data;
        let sum = 0;
        for (let i = 3; i < data.length; i += 4) sum += data[i];
        return sum;
      };
      const alphaSum = (x = 0, y = 0, w = W, h = H) => sumOf(chalk, dpr, x, y, w, h);
      kbWin.__kbBoard = {
        /** いちばんこすられた場所の往復の回数 */
        get wear() {
          return Math.round(wearMax * 100) / 100;
        },
        /** 黒板消しの汚れ（0〜1）。代入すると、その汚れにする（見た目も変わる） */
        get load() {
          return Math.round(load * 1000) / 1000;
        },
        set load(v: number) {
          load = clamp01(Number(v) || 0);
          showLoad(true);
          saveLoad();
        },
        /** 粉受けの溝に溜まった粉（0〜1）。代入すると、その量にする */
        get trayDust() {
          return Math.round(trayDust * 1000) / 1000;
        },
        set trayDust(v: number) {
          trayDust = clamp01(Number(v) || 0);
          drawTray(true);
        },
        get dust() {
          return parts.length;
        },
        /**
         * 粉の様子：n＝粒の数／falling＝落ちている途中の粒／landed＝粉受けに乗った粒／still＝動きを減らす設定の粒／
         * clouds＝舞っている雲の数／trayDust＝溝の粉／maxY＝落ちている途中の粒（粉受けより上で生まれたもの）の下の端の最大／floor＝粉受けの上面
         */
        dustInfo: () => {
          const fall = parts.filter((p) => p.kind === "fall" && !p.under);
          return {
            n: parts.length,
            falling: parts.filter((p) => p.kind === "fall" && !p.landed).length,
            landed: parts.filter((p) => p.landed > 0).length,
            still: parts.filter((p) => p.kind === "still").length,
            clouds: clouds.length,
            trayDust: Math.round(trayDust * 1000) / 1000,
            maxY: fall.some((p) => !p.landed) ? Math.round(Math.max(...fall.filter((p) => !p.landed).map((p) => p.y)) * 10) / 10 : null,
            floor: Math.round(floorNow(true) * 10) / 10,
          };
        },
        /** 雲の位置と大きさ（黒板の座標） */
        clouds: () => clouds.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y), age: Math.round(performance.now() - c.born), life: Math.round(c.life) })),
        /** 粉受けの黒板消しを押したときと同じ（溝の粉がぱふっと舞う） */
        tap: () => tapEraser(),
        get cleaning() {
          return cleaning;
        },
        /** クリーナーの様子：手でこすっている最中か・震えているか・黒板消しとクリーナーの重なりの順・口の位置 */
        cleanerInfo: () => ({
          scrubbing: !!scrub,
          cleaning,
          buzzing: !!cleaner?.classList.contains("is-scrubbing"),
          blinking: !!cleaner?.classList.contains("is-blinking"),
          eraserZ: getComputedStyle(eraser).zIndex,
          cleanerZ: cleaner ? getComputedStyle(cleaner).zIndex : null,
          slot: cleaner ? slotOf(cleaner.getBoundingClientRect()) : null,
        }),
        alpha: alphaSum,
        /** 拭き跡のもや（smear の canvas）の、その範囲のアルファの合計 */
        haze: (x = 0, y = 0, w = W, h = H) => sumOf(smear, 1, x, y, w, h),
        /** その行を横に times 往復こする（x0〜x1・高さ y）。こすったあとのアルファの合計を返す */
        rub: (x0: number, x1: number, y: number, times = 1) => {
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
        clean: () => toCleaner(),
      };
    }

    /* ---------------- 組み立て ---------------- */
    const layout = () => {
      sizeCanvases();
      drawTray(true);
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
      window.clearTimeout(buzzTimer);
      cleaner?.classList.remove("is-scrubbing");
      eraser.classList.remove("is-on-cleaner", "is-docking", "is-pafu");
      trayC.remove();
      delete kbWin.__kbBoard;
      [dustC, doodleC, chalkC, smearC, ghostC, motesC, nowMark].forEach((el) => el.remove());
      board.classList.remove("is-canvas", "is-drawing");
    };
  }, []);

  return null;
}
