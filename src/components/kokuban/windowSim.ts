// 窓の本体（近づいてから読み込む）：曇り・指で拭く・寄せて息を吐く・鏡・外の月。
// 曇りの濃さは climateAt（外と教室の温度と湿り気）から出す。同じ時刻なら全員が同じ曇りを見る。
// 拭いた跡は指の脂として残り（この端末だけ・localStorage）、曇り直しても薄く、息を吐くと透明に浮かぶ。
// 夜に蛍光灯が点いていると窓は鏡になり、寄せる（長押し）と指の所だけ外が透ける。
// 文字は置かない。音は鳴らさない。rAF は動きがある間だけ回し、画面外と裏のタブでは止める。
import { clockConfig, clockCore, debugAllowed } from "@/lib/worldClock";
import { CLOCK_EVENT, now } from "@/lib/now";
import { moonState, skyLum } from "@/lib/sky";
import { climateAt } from "@/lib/climate";
import { SCENE_EVENT } from "./Signboard";

const GW = 64; // 曇りの格子（横）。CSS でぼかして引き伸ばす
const GH = 40;
const N = GW * GH;
const EDGE = 24; // 指は左右の端で始めない（戻るスワイプと取り合わない・黒板と同じ）
const WIPE_R = 3; // 拭く太さ（格子の数）
const PRESS_MS = 450; // 寄せる（長押し）までの時間
const PRESS_SLOP = 8; // これ以上動いたら長押しではない
const BREATH_MAX = 90; // 息の円の半径（px）
const BREATH_GROW = 2500;
const PATROL_MS = 15000;
const KEY = "gbf_2026_window_v1";
const MAX_STROKES = 20;
const MAX_POINTS = 2400;

type Saved = { t: number; p: number[] };
type Pt = { x: number; y: number; w: number; h: number };

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function start(sec: HTMLElement, opt: { reduce: boolean }): () => void {
  const glass = sec.querySelector<HTMLElement>(".kb-glass");
  const mirror = sec.querySelector<HTMLElement>(".kb-wmirror");
  const moonCv = sec.querySelector<HTMLCanvasElement>("canvas.kb-moon-cv");
  if (!glass || !mirror || !moonCv) return () => {};
  const reduce = opt.reduce;

  /* ---------------- 曇りの格子 ---------------- */
  const fog = new Float32Array(N); // 曇り 0〜1
  const oil = new Float32Array(N); // 指の脂（拭いた跡）0〜1
  const breath = new Float32Array(N); // 息 0〜1
  const touched = new Uint8Array(N); // 1本の線で同じ所に脂を二度付けしない
  const fogC = document.createElement("canvas");
  fogC.className = "kb-fog";
  fogC.width = GW;
  fogC.height = GH;
  fogC.setAttribute("aria-hidden", "true");
  // 曇りはガラスの内側の面に付く＝部屋の映り込み（鏡）より手前。拭くと、その奥の映り込みや外が見える
  mirror.after(fogC);
  const ctx = fogC.getContext("2d")!;
  const img = ctx.createImageData(GW, GH);

  let target = 0;
  let amb = 1;
  let dark = 0;
  const tEff = (i: number) => target * (1 - 0.6 * oil[i]);

  const draw = () => {
    const d = img.data;
    const lift = 0.85 * (0.55 + 0.45 * amb);
    // 消灯中は白から灰青へ（月明かりの曇り）
    const m = clamp(dark);
    const r = 236 + (150 - 236) * m;
    const g = 240 + (160 - 240) * m;
    const b = 244 + (180 - 244) * m;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const v = fog[i] > breath[i] ? fog[i] : breath[i];
      d[j] = r;
      d[j + 1] = g;
      d[j + 2] = b;
      d[j + 3] = v * lift * 255;
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

  /* ---------------- 保存（拭いた線・この端末だけ） ---------------- */
  const loadSaved = (): Saved[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (s): s is Saved => !!s && typeof s.t === "number" && Array.isArray(s.p) && s.p.every((n: unknown) => typeof n === "number"),
      );
    } catch {
      return [];
    }
  };
  const save = (p: number[]) => {
    try {
      const list = loadSaved();
      list.push({ t: Math.round(now()), p });
      let total = list.reduce((a, s) => a + s.p.length / 2, 0);
      // 古い線から捨てる
      while (list.length > MAX_STROKES || (total > MAX_POINTS && list.length > 1)) {
        total -= (list.shift() as Saved).p.length / 2;
      }
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  };
  // 起動時：前に拭いた線を、脂として焼き直す
  for (const s of loadSaved()) {
    touched.fill(0);
    const p = s.p;
    if (p.length === 2) stampSeg(p[0], p[1], p[0], p[1], false);
    for (let k = 2; k + 1 < p.length; k += 2) stampSeg(p[k - 2], p[k - 1], p[k], p[k + 1], false);
  }

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
  let lastWipe = -Infinity;
  /** いまの時刻で空・鏡・月・曇りの目標を計算し直す。snap＝曇りを即座に合わせる */
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
    const sky = skyLum(s.sunAlt);
    sec.style.setProperty("--sky", sky.toFixed(3));
    sec.style.setProperty("--mirror", (s.lit * (1 - sky) * 0.85).toFixed(3));
    // 曇ったガラス越しの月は光がにじむ
    sec.style.setProperty("--wfog", target.toFixed(2));
    drawMoon(t, sky);
    if (snap || stale) snapFog();
    else if (reduce) {
      // 動きを減らす設定：曇り直しは見せず、見回りで状態だけを反映（拭いた直後の見回りでは戻さない）
      if (performance.now() - lastWipe >= PATROL_MS) snapFog();
    } else for (let i = 0; i < N; i++) if (settled[i]) fog[i] = tEff(i);
    draw();
    wake();
  };
  /** 曇り直している所・息・触れている指があるときだけ rAF を回す（何も動かない見回りや、見えたときには回さない） */
  const wake = () => {
    if (pid !== -1 || breathPhase !== null || breathR > 0 || unsettled()) kick();
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

  /* ---------------- 動き（rAF・30fps 上限） ---------------- */
  let raf = 0;
  let rafActive = false;
  let lastFrame = 0;
  // 息の円
  let breathR = 0;
  let breathPhase: "grow" | "shrink" | null = null;
  let breathT0 = 0;
  let breathFrom = 0;
  let breathDur = 0;
  let breathC = { x: 0, y: 0, w: 1, h: 1 };
  let breathShown = false;

  /** 息の円の中を曇らせる。前に拭いた所（脂が多い所）は薄く＝跡が透明に浮く */
  const fillBreath = () => {
    const { x: cx, y: cy, w, h } = breathC;
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (breathR <= 0) {
          breath[i] = 0;
          continue;
        }
        const d = Math.hypot(((x + 0.5) * w) / GW - cx, ((y + 0.5) * h) / GH - cy);
        const v = oil[i] > 0.3 ? 0.25 : 1;
        breath[i] = v * clamp((breathR - d) / 20);
      }
  };

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
    if (breathPhase === "grow") breathR = Math.min(BREATH_MAX, (BREATH_MAX * (ts - breathT0)) / BREATH_GROW);
    else if (breathPhase === "shrink") {
      breathR = breathFrom * (1 - (ts - breathT0) / breathDur);
      if (breathR <= 0) {
        breathR = 0;
        breathPhase = null;
      }
    }
    const hadBreath = breathPhase !== null || breathR > 0;
    // 息が消えた次の1回だけは、残りを消すために描き直す
    if (hadBreath || breathShown) fillBreath();
    breathShown = hadBreath;
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
    if (pid !== -1 || hadBreath || moving) raf = requestAnimationFrame(loop);
    else rafActive = false;
  };
  /** 動きがあれば rAF を回し始める（動きを減らす設定では回さず、その場で描く） */
  const kick = () => {
    if (reduce) {
      draw();
      return;
    }
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
  let stroke: number[] = [];
  const local = (e: PointerEvent): Pt => {
    const b = glass.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top, w: Math.max(1, b.width), h: Math.max(1, b.height) };
  };
  const capture = (e: PointerEvent) => {
    try {
      glass.setPointerCapture(e.pointerId);
    } catch {}
  };
  const nx = (p: Pt) => Math.round((p.x / p.w) * 1000) / 1000;
  const ny = (p: Pt) => Math.round((p.y / p.h) * 1000) / 1000;
  const wipeTo = (a: Pt, b: Pt) => {
    stampSeg(a.x / a.w, a.y / a.h, b.x / b.w, b.y / b.h, true);
    const n = stroke.length;
    // 線は間引いて残す（格子の半分ほど動いたら1点）
    if (n < 2 || Math.hypot(nx(b) - stroke[n - 2], ny(b) - stroke[n - 1]) > 0.008) stroke.push(nx(b), ny(b));
    lastWipe = performance.now();
    kick();
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
    breathC = { ...lastP };
    if (reduce) {
      // 動きを減らす設定：息の円は一段で出す（前の跡が静止で見える）
      breathR = BREATH_MAX;
      breathPhase = null;
      fillBreath();
      draw();
      return;
    }
    breathPhase = "grow";
    breathT0 = performance.now();
    kick();
  };
  const endPeek = () => {
    peeking = false;
    delete sec.dataset.peek;
    if (reduce) {
      breathR = 0;
      fillBreath();
      draw();
      return;
    }
    // 離したら、息の円は縁から縮む（曇りやすい夜ほどゆっくり）
    breathPhase = "shrink";
    breathFrom = breathR;
    breathT0 = performance.now();
    breathDur = 1200 * (1 + target);
    kick();
  };
  const end = (e?: PointerEvent) => {
    if (e && e.pointerId !== pid) return;
    window.clearTimeout(pressTimer);
    pressTimer = 0;
    if (peeking) endPeek();
    if (stroke.length >= 2) save(stroke);
    stroke = [];
    armed = wiping = false;
    pid = -1;
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
    armed = true;
    startP = lastP = p;
    stroke = [];
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
      // 寄せている間は、指の所だけ外が透ける
      lastP = p;
      setHole(p);
      return;
    }
    if (!armed) return;
    // マウス：押した瞬間から拭く構えだが、動かさない長押し（寄せる）と見分けがつくまで（8px）は拭かない＝息の円の真ん中に跡を残さない
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
      stroke.push(nx(startP), ny(startP));
      wipeTo(startP, p);
      lastP = p;
      return;
    }
    if (!stroke.length) stroke.push(nx(lastP), ny(lastP));
    wipeTo(lastP, p);
    lastP = p;
  };
  const onCancel = (e: PointerEvent) => end(e);
  const onMenu = (e: Event) => e.preventDefault();
  // 寄せている・拭いている指でページが動かないようにする（縦は pan-y で本来スクロールになるため）。
  // 長押しが決まる前や、縦に動いて拭くのをやめた指は止めない＝縦スクロールは奪わない
  const onTouchMove = (e: TouchEvent) => {
    if ((peeking || wiping) && e.cancelable) e.preventDefault();
  };
  glass.addEventListener("pointerdown", onDown);
  glass.addEventListener("pointermove", onMove);
  glass.addEventListener("pointerup", onCancel);
  glass.addEventListener("pointercancel", onCancel);
  glass.addEventListener("contextmenu", onMenu);
  glass.addEventListener("touchmove", onTouchMove, { passive: false });

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
  const onVisible = () => {
    if (document.hidden) halt();
    else patrol(true);
  };
  const onClock = () => patrol(true);
  const onScene = () => patrol(false);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener(CLOCK_EVENT, onClock);
  window.addEventListener(SCENE_EVENT, onScene);
  const iv = window.setInterval(tick, PATROL_MS);

  patrol(true);

  // 検分用（手元と Preview だけ）
  type Probe = { target: number; fogAt: (x: number, y: number) => number; raf: () => boolean };
  const w = window as unknown as { __kbWindow?: Probe };
  if (debugAllowed()) {
    w.__kbWindow = {
      get target() {
        return target;
      },
      fogAt: (x: number, y: number) => {
        const gx = Math.min(GW - 1, Math.max(0, Math.floor(x * GW)));
        const gy = Math.min(GH - 1, Math.max(0, Math.floor(y * GH)));
        return fog[gy * GW + gx];
      },
      raf: () => rafActive,
    };
  }

  return () => {
    halt();
    window.clearInterval(iv);
    window.clearTimeout(pressTimer);
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener(CLOCK_EVENT, onClock);
    window.removeEventListener(SCENE_EVENT, onScene);
    glass.removeEventListener("pointerdown", onDown);
    glass.removeEventListener("pointermove", onMove);
    glass.removeEventListener("pointerup", onCancel);
    glass.removeEventListener("pointercancel", onCancel);
    glass.removeEventListener("contextmenu", onMenu);
    glass.removeEventListener("touchmove", onTouchMove);
    delete sec.dataset.peek;
    fogC.remove();
    if (w.__kbWindow) delete w.__kbWindow;
  };
}
