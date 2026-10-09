// 窓の本体（近づいてから読み込む）：曇り・指で拭く・顔を寄せて息を吐く・鏡・外の月・外側の青い手形。
// 曇りの濃さは climateAt（外と教室の温度と湿り気）から出す。同じ時刻なら全員が同じ曇りを見る。
// 拭いた跡は指の脂として残り（この端末だけ・localStorage）、曇っていなくても薄い筋として見え、息を吐くと透明に浮く。
// 曇っていた所を拭くと、線のふちに細かい水滴が残る。
// 夜に蛍光灯が点いていると窓は鏡になり、寄せる（長押し）と指の所だけ外が透ける。
// 消灯から夜明け前までは曇りが青い。青い曇りは拭けない（拭こうとすると onRefuse を呼ぶ）。
// 文字は置かない。音は鳴らさない。rAF は動きがある間だけ回し、画面外と裏のタブでは止める。
import { clockConfig, clockCore, debugAllowed } from "@/lib/worldClock";
import { CLOCK_EVENT, now } from "@/lib/now";
import { moonState, skyLum } from "@/lib/sky";
import { climateAt } from "@/lib/climate";
import { WEATHER_EVENT } from "@/lib/weather";
import { SCENE_EVENT } from "./Signboard";

const GW = 64; // 曇りの格子（横）。CSS でぼかして引き伸ばす
const GH = 40;
const N = GW * GH;
const EDGE = 24; // 指は左右の端で始めない（戻るスワイプと取り合わない・黒板と同じ）
const WIPE_R = 3; // 拭く太さ（格子の数）
const PRESS_MS = 450; // 寄せる（長押し）までの時間
const PRESS_SLOP = 8; // これ以上動いたら長押しではない
const BREATH_MAX = 96; // 息の曇りの半径のいちばん大きいところ（px・幅640pxのガラスで。狭い画面では縮める）
const EXHALE_MS = 1600; // 吐く
const INHALE_MS = 1200; // 吸う
const MOUTH_DY = 0.13; // 口は指の少し下（ガラスの高さに対する割合）
const BLUE_SCENES = ["shoto", "shinya"]; // 曇りが青くなる帯（消灯〜夜明け前）
const BLUE_BLOCK = 0.3; // これより濃い青い曇りは拭けない
const PATROL_MS = 15000;
const KEY = "gbf_2026_window_v1";
const MAX_STROKES = 20;
const MAX_POINTS = 2400;
const DROP_FADE_MS = 6 * 3600000; // 水滴はゆっくり乾く（6時間で消える）

/** 保存する拭いた線。p＝正規化した点の列 [x0,y0,x1,y1,…]、f＝各点で拭く前の曇り（0〜1・水滴の量）、t＝拭いた時刻 */
type Saved = { t: number; p: number[]; f?: number[] };
type Pt = { x: number; y: number; w: number; h: number };

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 決まった種から決まった数の並びを出す（同じ種なら誰が何度描いても同じ） */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (str: string) => {
  let s = 0;
  for (let i = 0; i < str.length; i++) s = (Math.imul(s, 31) + str.charCodeAt(i)) >>> 0;
  return s;
};

/**
 * その夜の日付から決まる、窓の外側の手形の置き場所（ガラスの中の %）。
 * 看板の handLayout と同じ型。中桟（縦）と横桟とクレセント錠を避け、重なりすぎない。
 * 避ける範囲は窓の絵（window.webp）の採寸をガラスの中の % に直したもの：
 * 合わせ目 x 48.0〜52.0（絵の 48.4〜51.8%）・横桟 y 51.7〜56.6（絵の 49.7〜53.6%）・クレセント錠 x 47〜52 y 48〜60。
 * 手形の大きさ（幅 7.5%・高さはおよそ 14%）の半分ほどの余白を足して避ける。CSS の仮の枠も同じ高さに横桟を置く。
 * 右下のガラスには置かない（窓台のタブレットが手前に立つので、狭い画面では手形が隠れて数が合わなくなる）。
 */
export function windowHandLayout(night: string) {
  const r = seeded(hashStr("window:" + night));
  const out: { x: number; y: number; rot: number; scale: number }[] = [];
  let guard = 0;
  while (out.length < 9 && guard++ < 2000) {
    const x = 8 + r() * 84;
    const y = 10 + r() * 78;
    if (x > 42.5 && x < 57.5) continue; // 中桟（合わせ目）とクレセント錠
    if (y > 43 && y < 65) continue; // 横桟
    if (x > 50 && y > 50) continue; // 右下のガラス（タブレットの陰）
    if (out.some((p) => Math.hypot(p.x - x, (p.y - y) * 0.62) < 12)) continue; // 重なりすぎない
    out.push({ x, y, rot: -32 + r() * 64, scale: 0.86 + r() * 0.3 });
  }
  return out;
}

/** 青い曇りのむら（0〜1）。時刻 T（分）から決まるゆっくりした模様＝同じ時刻なら全員同じ */
export function blueMottle(x: number, y: number, tMs: number) {
  const T = tMs / 120000;
  const v =
    0.5 * Math.sin(x * 0.21 + T * 0.7) * Math.cos(y * 0.33 - T * 0.4) +
    0.3 * Math.sin((x + y) * 0.13 + T * 1.1) +
    0.2 * Math.sin(x * 0.07 - y * 0.17 + T * 0.5);
  return clamp(0.5 + 0.5 * v);
}

/** 息の曇りのふち（まるくない）。角度 th での半径の倍率。ph は1回の吐く息ごとの形 */
export function breathEdge(th: number, ph: [number, number, number]) {
  return 1 + 0.12 * Math.sin(3 * th + ph[0]) + 0.07 * Math.sin(5 * th + ph[1]) + 0.09 * Math.sin(2 * th + ph[2]);
}

/** opt.reduce＝端末の「動きを減らす」設定。窓の動き（曇り直し・息・水滴・長押しで寄せる）は小さいので、その設定でも止めない（今は使わない） */
export function start(sec: HTMLElement, opt: { reduce: boolean; onRefuse?: () => void }): () => void {
  const glass = sec.querySelector<HTMLElement>(".kb-glass");
  const mirror = sec.querySelector<HTMLElement>(".kb-wmirror");
  const moonCv = sec.querySelector<HTMLCanvasElement>("canvas.kb-moon-cv");
  if (!glass || !mirror || !moonCv) return () => {};
  const handsBox = sec.querySelector<HTMLElement>(".kb-whands");
  const handEls = handsBox ? [...handsBox.querySelectorAll<SVGElement>(".kb-whp")] : [];

  /* ---------------- 曇りの格子 ---------------- */
  const fog = new Float32Array(N); // 曇り 0〜1
  const oil = new Float32Array(N); // 指の脂（拭いた跡）0〜1
  const breath = new Float32Array(N); // 息 0〜1
  const tint = new Float32Array(N); // 青い曇りのむら 0〜1
  const touched = new Uint8Array(N); // 1本の線で同じ所に脂を二度付けしない
  const fogC = document.createElement("canvas");
  fogC.className = "kb-fog";
  fogC.width = GW;
  fogC.height = GH;
  fogC.setAttribute("aria-hidden", "true");
  // 曇りはガラスの内側の面に付く＝部屋の映り込み（鏡）と外側の手形より手前。拭くと、その奥が見える
  (handsBox ?? mirror).after(fogC);
  const ctx = fogC.getContext("2d")!;
  const img = ctx.createImageData(GW, GH);
  // 拭いた跡（指の脂の筋と水滴）。曇りより手前に、ガラスの大きさで描く
  const traceC = document.createElement("canvas");
  traceC.className = "kb-wtrace";
  traceC.setAttribute("aria-hidden", "true");
  fogC.after(traceC);
  const tctx = traceC.getContext("2d")!;

  let target = 0;
  let amb = 1;
  let dark = 0;
  let blue = false;
  const tEff = (i: number) => target * (1 - 0.6 * oil[i]);

  /** 息の中では前に拭いた所（脂）が透けて浮く */
  const breathShow = (i: number) => breath[i] * (1 - 0.75 * smooth(0.15, 0.45, oil[i]));

  const draw = () => {
    const d = img.data;
    if (blue) {
      // 消灯〜夜明け前：深い青で、ぼんやり光って見える（むらは時刻から決まる）
      for (let i = 0, j = 0; i < N; i++, j += 4) {
        const b = breathShow(i);
        const v = fog[i] > b ? fog[i] : b;
        const m = tint[i];
        // 暗い夜に沈んだ紺から、むらの濃い所だけ少し明るい青へ。薄い所は外（手形）が透ける
        d[j] = 26 + 34 * m;
        d[j + 1] = 40 + 50 * m;
        d[j + 2] = 92 + 78 * m;
        d[j + 3] = v * (0.5 + 0.3 * m) * 255;
      }
    } else {
      const lift = 0.85 * (0.55 + 0.45 * amb);
      // 消灯中は白から灰青へ（月明かりの曇り）
      const m = clamp(dark);
      const r = 236 + (150 - 236) * m;
      const g = 240 + (160 - 240) * m;
      const bl = 244 + (180 - 244) * m;
      for (let i = 0, j = 0; i < N; i++, j += 4) {
        const b = breathShow(i);
        const v = fog[i] > b ? fog[i] : b;
        d[j] = r;
        d[j + 1] = g;
        d[j + 2] = bl;
        d[j + 3] = v * lift * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  /** 曇りを、いまの目標に即座に合わせる（戻ってきたとき。曇っていく途中は見せない） */
  const snapFog = () => {
    for (let i = 0; i < N; i++) fog[i] = tEff(i);
  };

  /** 格子の点 (gx, gy) のまわりを拭く。wipe＝曇りも消す（焼き直しのときは脂だけ） */
  const stamp = (gx: number, gy: number, wipe: boolean) => {
    const x0 = Math.max(0, Math.floor(gx - WIPE_R));
    const x1 = Math.min(GW - 1, Math.ceil(gx + WIPE_R));
    const y0 = Math.max(0, Math.floor(gy - WIPE_R));
    const y1 = Math.min(GH - 1, Math.ceil(gy + WIPE_R));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - gx;
        const dy = y + 0.5 - gy;
        if (dx * dx + dy * dy > WIPE_R * WIPE_R) continue;
        const i = y * GW + x;
        if (wipe) fog[i] = 0;
        if (!touched[i]) {
          touched[i] = 1;
          oil[i] = Math.min(1, oil[i] + 0.6);
        }
      }
  };
  /** 正規化した2点の間を拭く */
  const stampSeg = (ax: number, ay: number, bx: number, by: number, wipe: boolean) => {
    const gax = ax * GW;
    const gay = ay * GH;
    const gbx = bx * GW;
    const gby = by * GH;
    const steps = Math.max(1, Math.ceil(Math.hypot(gbx - gax, gby - gay) / 0.75));
    for (let k = 0; k <= steps; k++) stamp(gax + ((gbx - gax) * k) / steps, gay + ((gby - gay) * k) / steps, wipe);
  };
  const cell = (x: number, y: number) =>
    Math.min(GH - 1, Math.max(0, Math.floor(y * GH))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x * GW)));
  /** 正規化した点の曇り（拭く太さの中でいちばん濃い所） */
  const fogNear = (x: number, y: number) => {
    let m = 0;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const r = k === 0 ? 0 : (WIPE_R * 0.6) / GW;
      const v = fog[cell(x + Math.cos(a) * r, y + Math.sin(a) * r * (GW / GH))];
      if (v > m) m = v;
    }
    return m;
  };
  /** 2点の間に、拭けない青い曇りがあるか */
  const segBlocked = (ax: number, ay: number, bx: number, by: number) => {
    if (!blue) return false;
    const steps = Math.max(1, Math.ceil(Math.hypot((bx - ax) * GW, (by - ay) * GH) / 0.75));
    for (let k = 0; k <= steps; k++) if (fogNear(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps) > BLUE_BLOCK) return true;
    return false;
  };

  /* ---------------- 保存（拭いた線・この端末だけ） ---------------- */
  const loadSaved = (): Saved[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (s): s is Saved =>
          !!s &&
          typeof s.t === "number" &&
          Array.isArray(s.p) &&
          s.p.every((n: unknown) => typeof n === "number") &&
          (s.f === undefined || (Array.isArray(s.f) && s.f.every((n: unknown) => typeof n === "number"))),
      );
    } catch {
      return [];
    }
  };
  const trimList = (list: Saved[]) => {
    let total = list.reduce((a, s) => a + s.p.length / 2, 0);
    // 古い線から捨てる
    while (list.length > MAX_STROKES || (total > MAX_POINTS && list.length > 1)) {
      total -= (list.shift() as Saved).p.length / 2;
    }
  };
  const save = (s: Saved) => {
    try {
      const list = loadSaved();
      list.push(s);
      trimList(list);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  };
  // 起動時：前に拭いた線を、脂として焼き直す
  const strokes: Saved[] = loadSaved();
  for (const s of strokes) {
    touched.fill(0);
    const p = s.p;
    if (p.length === 2) stampSeg(p[0], p[1], p[0], p[1], false);
    for (let k = 2; k + 1 < p.length; k += 2) stampSeg(p[k - 2], p[k - 1], p[k], p[k + 1], false);
  }

  /* ---------------- 拭いた跡（脂の筋と水滴） ---------------- */
  // 1本の線は1本の道として一度に描く（区間ごとに重ね塗りすると、継ぎ目ごとに白が濃く溜まって帯になるため）。
  // 保存済みの線は裏の canvas（base）に描いておき、拭いている途中は「base を写す＋いまの線を描く」で出す。
  const baseC = document.createElement("canvas");
  const bctx = baseC.getContext("2d")!;
  let tw = 1; // 跡の canvas の大きさ（css px）
  let th = 1;
  let dpr = 1;
  const sizeTrace = () => {
    tw = Math.max(1, glass.offsetWidth);
    th = Math.max(1, glass.offsetHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    traceC.width = baseC.width = Math.round(tw * dpr);
    traceC.height = baseC.height = Math.round(th * dpr);
  };
  /** 1本の線を c に描く：指の幅のうすいにじみ・拭いた向きの細い筋・（曇っていた所だけ）ふちの水滴 */
  const drawStroke = (c: CanvasRenderingContext2D, s: Saved) => {
    const p = s.p;
    const n = p.length >> 1;
    if (n < 2) return;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = p[i * 2] * tw;
      ys[i] = p[i * 2 + 1] * th;
    }
    // 各点の法線（前後の区間の向きをならす）
    const nxs = new Float32Array(n);
    const nys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      const dx = xs[b] - xs[a];
      const dy = ys[b] - ys[a];
      const l = Math.hypot(dx, dy) || 1;
      nxs[i] = -dy / l;
      nys[i] = dx / l;
    }
    const rad = (WIPE_R / GW) * tw; // 拭いた幅の半分（px）
    const path = (o: number) => {
      c.beginPath();
      c.moveTo(xs[0] + nxs[0] * o, ys[0] + nys[0] * o);
      for (let i = 1; i < n; i++) c.lineTo(xs[i] + nxs[i] * o, ys[i] + nys[i] * o);
      c.stroke();
    };
    c.save();
    c.scale(dpr, dpr);
    c.lineCap = "round";
    c.lineJoin = "round";
    // 指の脂：指の幅のうすいにじみ
    c.strokeStyle = "rgba(222, 226, 230, 0.08)";
    c.lineWidth = rad * 1.7;
    path(0);
    // 拭いた向きの細い筋（指の腹の跡）。線ごとに決まった位置
    const rs = seeded(hashStr(String(s.t)) ^ 0x9e37);
    for (let j = 0; j < 7; j++) {
      const o = (rs() - 0.5) * rad * 1.5;
      c.strokeStyle = `rgba(232, 235, 238, ${(0.06 + rs() * 0.1).toFixed(3)})`;
      c.lineWidth = 0.6 + rs() * 0.9;
      path(o);
    }
    // 水滴：曇っていた所を拭いたときだけ、線のふちに白い粒が連なる（6時間かけて乾く）
    const dry = clamp(1 - (now() - s.t) / DROP_FADE_MS);
    if (s.f && dry > 0) {
      for (let k = 1; k < n; k++) {
        const dropA = Math.min(s.f[k - 1] ?? 0, s.f[k] ?? 0) * dry;
        const ax = xs[k - 1];
        const ay = ys[k - 1];
        const bx = xs[k];
        const by = ys[k];
        const len = Math.hypot(bx - ax, by - ay);
        if (dropA <= 0.12 || len < 0.01) continue;
        const nxv = -(by - ay) / len;
        const nyv = (bx - ax) / len;
        const rd = seeded(hashStr(`${s.t}:${k}`));
        const m = Math.max(1, Math.round(len / 2.6));
        for (let q = 0; q < m; q++) {
          for (const side of [-1, 1]) {
            if (rd() > 0.78) continue;
            const along = (q + rd()) / m;
            const off = side * rad * (0.86 + rd() * 0.3);
            const x = ax + (bx - ax) * along + nxv * off;
            const y = ay + (by - ay) * along + nyv * off;
            const r0 = 0.5 + rd() * rd() * 1.9;
            c.fillStyle = `rgba(250, 252, 255, ${(dropA * (0.35 + rd() * 0.45)).toFixed(3)})`;
            c.beginPath();
            c.arc(x, y, r0, 0, Math.PI * 2);
            c.fill();
            if (r0 > 1.2) {
              // 大きい粒は下側が少し暗い（丸みに見える）
              c.fillStyle = `rgba(40, 50, 60, ${(dropA * 0.18).toFixed(3)})`;
              c.beginPath();
              c.arc(x, y + r0 * 0.45, r0 * 0.55, 0, Math.PI);
              c.fill();
            }
          }
        }
      }
    }
    c.restore();
  };
  /** 保存済みの線を base に描き直す */
  const renderBase = () => {
    bctx.clearRect(0, 0, baseC.width, baseC.height);
    for (const s of strokes) drawStroke(bctx, s);
  };
  /** 見えている跡を出す：base を写し、拭いている途中の線を足す */
  const present = () => {
    tctx.clearRect(0, 0, traceC.width, traceC.height);
    tctx.drawImage(baseC, 0, 0);
    if (stroke) drawStroke(tctx, stroke);
  };
  const traceAll = () => {
    sizeTrace();
    renderBase();
    present();
  };

  /* ---------------- 外側の青い手形（その夜の日付で置き場所が決まる） ---------------- */
  let handNight = "";
  const placeHands = (night: string) => {
    if (!handEls.length || night === handNight) return;
    handNight = night;
    const lay = windowHandLayout(night);
    handEls.forEach((el, i) => {
      const h = lay[i];
      if (!h) return;
      el.style.left = `${h.x.toFixed(2)}%`;
      el.style.top = `${h.y.toFixed(2)}%`;
      // 外から押された手形を内側から見る＝左右が逆
      el.style.transform = `translate(-50%,-50%) rotate(${h.rot.toFixed(1)}deg) scale(${(-h.scale).toFixed(3)},${h.scale.toFixed(3)})`;
    });
    sec.dataset.hl = "";
  };

  /* ---------------- 月（外の空） ---------------- */
  const mctx = moonCv.getContext("2d")!;
  let moonKey = "";
  const drawMoon = (t: number, sky: number) => {
    const m = moonState(t, clockConfig.lat, clockConfig.lon);
    const up = m.alt > 0 && m.az > 100 && m.az < 260;
    const op = up ? clamp(1 - 1.4 * sky) : 0;
    moonCv.style.opacity = op.toFixed(3);
    // 夜空の明るさ（--moon）は世界（BoardFx）が同じ月から書く値を CSS でそのまま使う＝ここでは持たない
    if (!up) return;
    moonCv.style.left = `${((m.az - 100) / 160) * 100}%`;
    moonCv.style.top = `${Math.max(0.08, Math.min(1, 1 - m.alt / 60)) * 100}%`;
    // 欠け方は数%刻みで描き直す
    const key = `${Math.round(m.k * 40)}:${m.waxing ? 1 : 0}`;
    if (key === moonKey) return;
    moonKey = key;
    const W = moonCv.width;
    const c = W / 2;
    const r = W / 2 - 6;
    mctx.clearRect(0, 0, W, W);
    if (m.k < 0.02) return;
    mctx.save();
    // 欠けていく月は左側が光る
    if (!m.waxing) {
      mctx.translate(W, 0);
      mctx.scale(-1, 1);
    }
    const e = 1 - 2 * m.k; // 明暗の境（1＝新月・-1＝満月）
    mctx.beginPath();
    mctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, false);
    mctx.ellipse(c, c, Math.max(0.01, Math.abs(e) * r), r, 0, Math.PI / 2, -Math.PI / 2, e > 0);
    mctx.closePath();
    mctx.shadowColor = "rgba(230, 232, 220, 0.7)";
    mctx.shadowBlur = 5;
    mctx.fillStyle = "rgb(240, 238, 224)";
    mctx.fill();
    mctx.restore();
  };

  /* ---------------- 見回り ---------------- */
  let inView = true;
  let lastPatrol = 0;
  /** いまの時刻で空・鏡・月・曇りの目標・曇りの色・手形を計算し直す。snap＝曇りを即座に合わせる */
  const patrol = (snap: boolean) => {
    const t = now();
    const s = clockCore(t, clockConfig);
    const c = climateAt(t, s, clockConfig);
    const stale = performance.now() - lastPatrol > 60000;
    lastPatrol = performance.now();
    // 落ち着いている所は、目標の小さな移り変わりにそのまま合わせる（曇り直しの rAF を回さない）
    const settled = new Uint8Array(N);
    for (let i = 0; i < N; i++) settled[i] = Math.abs(fog[i] - tEff(i)) < 0.01 ? 1 : 0;
    target = c.fog;
    amb = s.amb;
    dark = s.dark;
    blue = BLUE_SCENES.includes(s.scene);
    if (blue) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) tint[y * GW + x] = blueMottle(x, y, t);
      sec.dataset.bluefog = "";
    } else delete sec.dataset.bluefog;
    placeHands(s.handNight);
    const sky = skyLum(s.sunAlt);
    sec.style.setProperty("--sky", sky.toFixed(3));
    sec.style.setProperty("--mirror", (s.lit * (1 - sky) * 0.85).toFixed(3));
    // 曇ったガラス越しの月は光がにじむ
    sec.style.setProperty("--wfog", target.toFixed(2));
    drawMoon(t, sky);
    if (snap || stale) snapFog();
    else for (let i = 0; i < N; i++) if (settled[i]) fog[i] = tEff(i);
    draw();
    wake();
  };
  /** 曇り直している所・息・触れている指があるときだけ rAF を回す（何も動かない見回りや、見えたときには回さない） */
  const wake = () => {
    if (pid !== -1 || breathPhase !== null || unsettled()) kick();
  };
  /** 目標からずれている（＝曇り直している途中の）所があるか */
  const unsettled = () => {
    for (let i = 0; i < N; i++) {
      const d = tEff(i) - fog[i];
      if (d > 0.004 || d < -0.004) return true;
    }
    return false;
  };
  const tick = () => {
    if (inView && !document.hidden) patrol(false);
  };

  /* ---------------- 息（寄せている間・吐く→吸うをくり返す） ---------------- */
  let raf = 0;
  let rafActive = false;
  let lastFrame = 0;
  let breathPhase: "out" | "in" | "off" | null = null;
  let breathT0 = 0;
  let breathR = 0; // いまの半径（px）
  let breathFrom = 0; // この段の始まりの半径
  let breathTo = 0; // この段の終わりの半径
  let breathN = 0; // 吐いた回数
  let breathPh: [number, number, number] = [0, 0, 0];
  let breathC = { x: 0, y: 0, w: 1, h: 1 }; // 口の位置（ガラスの px）
  let mouth = { x: 0, y: 0 }; // 口が向かう先（指が動くと少し遅れてついていく）

  /** 息の広がりの上限（ガラスの幅に合わせる。390px の画面で息がガラスの半分を覆わないように） */
  const breathMax = () => BREATH_MAX * Math.max(0.65, Math.min(1, breathC.w / 640));
  const mouthOf = (p: Pt) => ({ x: p.x, y: Math.min(p.h - 8, p.y + p.h * MOUTH_DY) });
  /** 息の曇りを1コマ分すすめる。mode＝吐く（足す）・吸う（少し引く）・離した（縁から引く） */
  const stepBreath = (dt: number, mode: "out" | "in" | "off") => {
    const { x: cx, y: cy, w, h } = breathC;
    const R = breathR;
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        const dx = (((x + 0.5) * w) / GW - cx) / 1.15; // 少し横に広い
        const dy = ((y + 0.5) * h) / GH - cy;
        const d = Math.hypot(dx, dy);
        const re = R * breathEdge(Math.atan2(dy, dx), breathPh);
        const inside = clamp((re - d) / 22);
        if (mode === "out") {
          // 吐くたびに足される（真ん中ほど濃い）
          const add = dt * 0.85 * inside * (1 - 0.35 * clamp(d / Math.max(1, re)));
          breath[i] = Math.min(0.95, breath[i] + add);
        } else if (mode === "in") {
          // 吸う間は少し引く。外側（縁の外）はよく引く
          breath[i] = Math.max(0, breath[i] - dt * (inside > 0 ? 0.16 : 0.7));
        } else {
          // 離した：縁から引く
          breath[i] = Math.min(breath[i], inside);
          breath[i] = Math.max(0, breath[i] - dt * 0.12);
        }
      }
  };
  const newBreathShape = () => {
    // 1回ごとのふちの形（この端末の揺らぎ。共有の見た目ではない）
    breathPh = [Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283];
  };
  const beginExhale = (ts: number) => {
    breathPhase = "out";
    breathT0 = ts;
    breathFrom = breathR;
    breathTo = breathMax() * Math.min(1, 0.55 + 0.17 * breathN);
    breathN++;
    newBreathShape();
  };
  const beginInhale = (ts: number) => {
    breathPhase = "in";
    breathT0 = ts;
    breathFrom = breathR;
    breathTo = breathR * 0.86;
  };

  /* ---------------- 動き（rAF・30fps 上限） ---------------- */
  const loop = (ts: number) => {
    raf = 0;
    if (!inView || document.hidden) {
      rafActive = false;
      return;
    }
    if (ts - lastFrame < 33) {
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.1, (ts - lastFrame) / 1000);
    lastFrame = ts;
    // 息
    if (breathPhase !== null) {
      // 口は指に少し遅れてついていく
      breathC.x += (mouth.x - breathC.x) * 0.12;
      breathC.y += (mouth.y - breathC.y) * 0.12;
      const el = ts - breathT0;
      if (breathPhase === "out") {
        const u = clamp(el / EXHALE_MS);
        breathR = breathFrom + (breathTo - breathFrom) * (1 - (1 - u) * (1 - u));
        stepBreath(dt, "out");
        if (u >= 1) beginInhale(ts);
      } else if (breathPhase === "in") {
        const u = clamp(el / INHALE_MS);
        breathR = breathFrom + (breathTo - breathFrom) * u;
        stepBreath(dt, "in");
        if (u >= 1) beginExhale(ts);
      } else {
        const u = clamp(el / breathTo);
        breathR = breathFrom * (1 - u);
        stepBreath(dt, "off");
        if (u >= 1) {
          breathR = 0;
          breath.fill(0);
          breathPhase = null;
        }
      }
    }
    // 拭いた所の曇り直し
    let moving = false;
    const k = Math.min(1, dt / (25 / Math.max(0.2, target)));
    for (let i = 0; i < N; i++) {
      const e = tEff(i);
      const diff = e - fog[i];
      if (diff > 0.004 || diff < -0.004) {
        fog[i] += diff * k;
        moving = true;
      } else fog[i] = e;
    }
    draw();
    if (pid !== -1 || breathPhase !== null || moving) raf = requestAnimationFrame(loop);
    else rafActive = false;
  };
  /** 動きがあれば rAF を回し始める */
  const kick = () => {
    if (raf || !inView || document.hidden) return;
    rafActive = true;
    lastFrame = performance.now() - 34;
    raf = requestAnimationFrame(loop);
  };
  const halt = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    rafActive = false;
  };

  /* ---------------- 触る（拭く・寄せる） ---------------- */
  let pid = -1;
  let armed = false;
  let wiping = false;
  let peeking = false;
  let pressTimer = 0;
  let startP: Pt = { x: 0, y: 0, w: 1, h: 1 };
  let lastP: Pt = startP;
  let stroke: Saved | null = null;
  let refusals = 0; // 拭けなかった回数（検分用）
  let holdTouch = false; // 拭けなかった指が離れるまで、その指でページを動かさない
  let leanOffAt = -Infinity; // 寄せを戻し始めた時刻（戻っている途中に寄せ直すとき、寄せる中心を飛ばさない）
  /** 指の位置をガラスの px で（寄せて拡大している間も、拡大前の大きさで数える） */
  const local = (e: PointerEvent): Pt => {
    const b = glass.getBoundingClientRect();
    const w = Math.max(1, glass.offsetWidth);
    const h = Math.max(1, glass.offsetHeight);
    return { x: ((e.clientX - b.left) / Math.max(1, b.width)) * w, y: ((e.clientY - b.top) / Math.max(1, b.height)) * h, w, h };
  };
  const capture = (e: PointerEvent) => {
    try {
      glass.setPointerCapture(e.pointerId);
    } catch {}
  };
  const release = () => {
    try {
      if (pid !== -1 && glass.hasPointerCapture(pid)) glass.releasePointerCapture(pid);
    } catch {}
  };
  const nx = (p: Pt) => Math.round((p.x / p.w) * 1000) / 1000;
  const ny = (p: Pt) => Math.round((p.y / p.h) * 1000) / 1000;
  const q1 = (v: number) => Math.round(clamp(v) * 10) / 10;
  /**
   * 拭けない青い曇りに当たった：拭かずに手を止める（ここまで拭いた分はそのまま残して保存）。
   * この指はここで終わりにする（メッセージ窓が上に出ると、指を離したことがガラスに届かず、
   * 「触れている指がある」扱いのまま rAF が回り続けるため）。指が離れるまで、その指でページも動かさない。
   */
  const refuse = () => {
    refusals++;
    release();
    finish();
    holdTouch = true;
    opt.onRefuse?.();
  };
  /** a→b を拭く。拭けなければ false */
  const wipeTo = (a: Pt, b: Pt) => {
    const ax = a.x / a.w;
    const ay = a.y / a.h;
    const bx = b.x / b.w;
    const by = b.y / b.h;
    if (segBlocked(ax, ay, bx, by)) {
      refuse();
      return false;
    }
    if (!stroke) {
      stroke = { t: Math.round(now()), p: [nx(a), ny(a)], f: [q1(fogNear(ax, ay))] };
    }
    const f = fogNear(bx, by);
    stampSeg(ax, ay, bx, by, true);
    const p = stroke.p;
    const n = p.length;
    // 線は間引いて残す（格子の半分ほど動いたら1点）
    if (Math.hypot(nx(b) - p[n - 2], ny(b) - p[n - 1]) > 0.008) {
      p.push(nx(b), ny(b));
      (stroke.f as number[]).push(q1(f));
      present();
    }
    kick();
    return true;
  };
  const beginWipe = (e: PointerEvent) => {
    wiping = true;
    touched.fill(0);
    capture(e);
  };
  const setHole = (p: Pt) => {
    sec.style.setProperty("--wx", `${p.x}px`);
    sec.style.setProperty("--wy", `${p.y}px`);
  };
  const beginPeek = () => {
    pressTimer = 0;
    peeking = true;
    wiping = false;
    sec.dataset.peek = "";
    setHole(lastP);
    const m = mouthOf(lastP);
    mouth = m;
    breathC = { x: m.x, y: m.y, w: lastP.w, h: lastP.h };
    // ガラスを指の所へ向かって寄せ、まわりを少し暗くする。
    // 前の寄せが戻りきる前（0.5秒）に寄せ直すときは、中心を動かさない（拡大中に中心を変えるとガラスが跳ぶ）
    if (performance.now() - leanOffAt > 550) {
      glass.style.setProperty("--wox", `${lastP.x}px`);
      glass.style.setProperty("--woy", `${lastP.y}px`);
      const b = sec.getBoundingClientRect();
      const gb = glass.getBoundingClientRect();
      sec.style.setProperty("--vx", `${gb.left - b.left + (lastP.x / lastP.w) * gb.width}px`);
      sec.style.setProperty("--vy", `${gb.top - b.top + (lastP.y / lastP.h) * gb.height}px`);
    }
    sec.dataset.lean = "";
    breathR = 0;
    breathN = 0;
    beginExhale(performance.now());
    kick();
  };
  const endPeek = () => {
    peeking = false;
    delete sec.dataset.peek;
    if (sec.dataset.lean !== undefined) leanOffAt = performance.now();
    delete sec.dataset.lean;
    // 離したら、息は縁から引く（曇りやすい夜ほどゆっくり）
    breathPhase = "off";
    breathFrom = breathR;
    breathTo = 1200 * (1 + target); // 引ききるまでの時間
    breathT0 = performance.now();
    kick();
  };
  /** いまの指を終わりにする：寄せを戻し、拭いた線があれば保存して跡の下地に入れる */
  const finish = () => {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
    if (peeking) endPeek();
    if (stroke && stroke.p.length >= 4) {
      save(stroke);
      strokes.push(stroke);
      trimList(strokes);
      stroke = null;
      renderBase();
      present();
    }
    stroke = null;
    armed = wiping = false;
    pid = -1;
  };
  const end = (e?: PointerEvent) => {
    if (e && e.pointerId !== pid) return;
    finish();
  };

  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // 2本目の指＝ピンチ。拭くのをやめて拡大に任せる
      if (pid !== -1) end();
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = local(e);
    if (e.pointerType !== "mouse" && (p.x < EDGE || p.x > p.w - EDGE)) return;
    pid = e.pointerId;
    holdTouch = false;
    armed = true;
    startP = lastP = p;
    stroke = null;
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(beginPeek, PRESS_MS);
    if (e.pointerType === "mouse") {
      // マウスはすぐ拭く（押したまま動かさなければ、拭かずに寄せる＝長押し）
      beginWipe(e);
    }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    const p = local(e);
    if (pressTimer && Math.hypot(p.x - startP.x, p.y - startP.y) >= PRESS_SLOP) {
      window.clearTimeout(pressTimer);
      pressTimer = 0;
    }
    if (peeking) {
      // 寄せている間は、指の所だけ外が透け、口もついていく
      lastP = p;
      setHole(p);
      mouth = mouthOf(p);
      return;
    }
    if (!armed) return;
    // マウス：押した瞬間から拭く構えだが、動かさない長押し（寄せる）と見分けがつくまで（8px）は拭かない＝息の真ん中に跡を残さない
    if (wiping && pressTimer) return;
    if (!wiping) {
      // 指：はっきり横に動いたときだけ拭く（縦はスクロールに任せる）
      const dx = Math.abs(p.x - startP.x);
      const dy = Math.abs(p.y - startP.y);
      if (Math.max(dx, dy) < 12) return;
      if (dx < dy * 2) {
        armed = false;
        return;
      }
      beginWipe(e);
      if (wipeTo(startP, p)) lastP = p;
      return;
    }
    if (wipeTo(lastP, p)) lastP = p;
  };
  const onCancel = (e: PointerEvent) => end(e);
  const onMenu = (e: Event) => e.preventDefault();
  // 寄せている・拭いている指でページが動かないようにする（縦は pan-y で本来スクロールになるため）。
  // 長押しが決まる前や、縦に動いて拭くのをやめた指は止めない＝縦スクロールは奪わない
  const onTouchMove = (e: TouchEvent) => {
    if ((peeking || wiping || holdTouch) && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) holdTouch = false;
  };
  glass.addEventListener("pointerdown", onDown);
  glass.addEventListener("pointermove", onMove);
  glass.addEventListener("pointerup", onCancel);
  glass.addEventListener("pointercancel", onCancel);
  glass.addEventListener("contextmenu", onMenu);
  glass.addEventListener("touchmove", onTouchMove, { passive: false });
  glass.addEventListener("touchend", onTouchEnd);
  glass.addEventListener("touchcancel", onTouchEnd);

  /* ---------------- 見える・戻る ---------------- */
  const io = new IntersectionObserver((en) => {
    const was = inView;
    inView = en[0].isIntersecting;
    if (inView && !was) {
      if (performance.now() - lastPatrol > 60000) patrol(true);
      else wake();
    } else if (!inView) halt();
  });
  io.observe(sec);
  // ガラスの大きさが変わったら跡を描き直す（拡大の transform では変わらない）
  let lastSize = "";
  const ro = new ResizeObserver(() => {
    const k = `${glass.offsetWidth}x${glass.offsetHeight}`;
    if (k === lastSize) return;
    lastSize = k;
    traceAll();
  });
  ro.observe(glass);
  const onVisible = () => {
    if (document.hidden) halt();
    else patrol(true);
  };
  const onClock = () => patrol(true);
  const onScene = () => patrol(false);
  const onWeather = () => patrol(false);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener(CLOCK_EVENT, onClock);
  window.addEventListener(SCENE_EVENT, onScene);
  window.addEventListener(WEATHER_EVENT, onWeather);
  const iv = window.setInterval(tick, PATROL_MS);

  traceAll();
  patrol(true);

  // 検分用（手元と Preview だけ）
  type Probe = {
    target: number;
    blue: boolean;
    fogAt: (x: number, y: number) => number;
    fogColor: () => string;
    breathAt: (x: number, y: number) => number;
    saved: () => number;
    refusals: () => number;
    raf: () => boolean;
    patrol: () => void;
  };
  const w = window as unknown as { __kbWindow?: Probe };
  if (debugAllowed()) {
    w.__kbWindow = {
      get target() {
        return target;
      },
      get blue() {
        return blue;
      },
      fogAt: (x: number, y: number) => fog[cell(x, y)],
      // 真ん中あたりの曇りの色（rgb）
      fogColor: () => {
        const j = cell(0.5, 0.4) * 4;
        const d = img.data;
        return `rgb(${Math.round(d[j])}, ${Math.round(d[j + 1])}, ${Math.round(d[j + 2])})`;
      },
      breathAt: (x: number, y: number) => breath[cell(x, y)],
      saved: () => loadSaved().length,
      refusals: () => refusals,
      raf: () => rafActive,
      patrol: () => patrol(false),
    };
  }

  return () => {
    halt();
    window.clearInterval(iv);
    window.clearTimeout(pressTimer);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener(CLOCK_EVENT, onClock);
    window.removeEventListener(SCENE_EVENT, onScene);
    window.removeEventListener(WEATHER_EVENT, onWeather);
    glass.removeEventListener("pointerdown", onDown);
    glass.removeEventListener("pointermove", onMove);
    glass.removeEventListener("pointerup", onCancel);
    glass.removeEventListener("pointercancel", onCancel);
    glass.removeEventListener("contextmenu", onMenu);
    glass.removeEventListener("touchmove", onTouchMove);
    glass.removeEventListener("touchend", onTouchEnd);
    glass.removeEventListener("touchcancel", onTouchEnd);
    delete sec.dataset.peek;
    delete sec.dataset.lean;
    delete sec.dataset.bluefog;
    delete sec.dataset.hl;
    fogC.remove();
    traceC.remove();
    if (w.__kbWindow) delete w.__kbWindow;
  };
}
