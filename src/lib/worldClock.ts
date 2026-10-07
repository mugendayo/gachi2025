// 世界時計：日本時間の「いま」から、トップの教室の状態を計算する（保存しない純関数）。
// 日付は site.world.frozenDay に止まり、時刻・太陽・灯りだけが実時刻で進む。
// clockCore は自己完結（import も外の変数も使わない）。head 直後のインラインスクリプトにも
// toString() でそのまま埋め込み、描画前に同じ計算で光の状態を決める。
import { site } from "@/data/site";

export type Phase = "sealed" | "eve" | "live" | "after";

export type ClockConfig = {
  unlockTs: number;
  afterTs: number;
  frozenDay: string;
  /** 日の key → "YYYY-MM-DD"（JST） */
  eventDates: Record<string, string>;
  /** 日の key → 時刻のある行 [開始分, 終了分, 行番号, 教室に灯りがつく行か（準備・片付け）] */
  timed: Record<string, [number, number, number, boolean][]>;
  /** 日の key → 黒板に書く日付 */
  dateLabels: Record<string, string>;
  /** 日の key → 消灯の分（その日の時刻のある行の最後の終わり） */
  lightsOut: Record<string, number>;
  lat: number;
  lon: number;
};

export type ClockState = {
  phase: Phase;
  /** 黒板に出す日 */
  dayKey: string;
  /** 今日の実際の日付（例：10月7日(水)） */
  todayLabel: string;
  /** 黒板の日付と今日が違う＝書き換えが起きる */
  flips: boolean;
  /** 一日の中の分（0〜1439・JST） */
  minute: number;
  /** いま当てはまる、時刻のある行の番号（無ければ -1） */
  timedRow: number;
  sunAlt: number;
  sunAz: number;
  /** 窓からの光 0〜1 */
  sun: number;
  /** 夕日・朝日の色の強さ 0〜1 */
  warm: number;
  /** 蛍光灯 0/1（文化祭準備の行の間だけ点く） */
  lit: number;
  /** 消灯 0/1 */
  dark: number;
  /** 部屋の明るさ 0〜1 */
  amb: number;
  /** night＝消灯／evening＝日没後で灯りの時間／dawn・dusk＝朝夕／day */
  band: "night" | "evening" | "dawn" | "day" | "dusk";
};

export function clockCore(nowMs: number, c: ClockConfig): ClockState {
  const JST = 9 * 3600000;
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const j = new Date(nowMs + JST);
  const minute = j.getUTCHours() * 60 + j.getUTCMinutes();
  const sec = j.getUTCSeconds();
  const ymd =
    j.getUTCFullYear() + "-" + String(j.getUTCMonth() + 1).padStart(2, "0") + "-" + String(j.getUTCDate()).padStart(2, "0");
  const todayLabel = j.getUTCMonth() + 1 + "月" + j.getUTCDate() + "日(" + WD[j.getUTCDay()] + ")";

  let phase: Phase = "eve";
  let dayKey = c.frozenDay;
  const firstDay = c.eventDates[Object.keys(c.eventDates)[0]];
  if (nowMs < c.unlockTs) phase = "sealed";
  else if (nowMs >= c.afterTs) phase = "after";
  else if (ymd >= firstDay) {
    phase = "live";
    for (const k in c.eventDates) if (c.eventDates[k] === ymd) dayKey = k;
  }

  let timedRow = -1;
  let prep = false;
  const rows = c.timed[dayKey] || [];
  for (let i = 0; i < rows.length; i++) {
    if (minute >= rows[i][0] && minute < rows[i][1]) {
      timedRow = rows[i][2];
      prep = rows[i][3];
    }
  }

  // 太陽：黒板の日（止まった日付）の、いまの時刻の高さと向き（下市町）
  const dateForSun = phase === "live" ? ymd : c.eventDates[dayKey];
  const hh = String(j.getUTCHours()).padStart(2, "0");
  const mm = String(j.getUTCMinutes()).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  const t = Date.parse(dateForSun + "T" + hh + ":" + mm + ":" + ss + "+09:00");
  const rad = Math.PI / 180;
  const d = t / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const H = (gmst * 15 + c.lon) * rad - ra;
  const lat = c.lat * rad;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H));
  const sunAlt = alt / rad;
  const sunAz = ((az / rad) + 360) % 360;

  const clamp = function (v: number) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  };
  const sun = clamp((sunAlt + 4) / 24);
  const warm = sunAlt > -6 && sunAlt < 16 ? clamp(1 - Math.abs(sunAlt - 3) / 13) : 0;
  // 消灯：その日の最後の時刻の行が終わってから、朝に空が白むまで。解禁前は一日中消灯した教室
  const out = c.lightsOut[dayKey] || 21 * 60 + 30;
  const dark = phase === "sealed" || phase === "after" || minute >= out || (minute < 12 * 60 && sunAlt < -6) ? 1 : 0;
  const lit = !dark && prep ? 1 : 0;
  const amb = dark ? 0.08 : Math.max(0.22 + 0.78 * sun, lit ? 0.92 : 0);
  const band: ClockState["band"] = dark ? "night" : sunAlt < -6 ? "evening" : sunAlt < 8 ? (minute < 12 * 60 ? "dawn" : "dusk") : "day";

  return {
    phase: phase,
    dayKey: dayKey,
    todayLabel: todayLabel,
    flips: (phase === "eve" || phase === "sealed") && todayLabel !== c.dateLabels[dayKey],
    minute: minute,
    timedRow: timedRow,
    sunAlt: sunAlt,
    sunAz: sunAz,
    sun: sun,
    warm: warm,
    lit: lit,
    dark: dark,
    amb: amb,
    band: band,
  };
}

/** "9:00〜10:35" → [540, 635] */
const parseRange = (s: string): [number, number] | null => {
  const m = s.match(/^(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]];
};

export const clockConfig: ClockConfig = {
  unlockTs: Date.parse(site.unlockAt),
  afterTs: Date.parse(site.world.afterAt),
  frozenDay: site.world.frozenDay,
  eventDates: site.world.eventDates,
  timed: Object.fromEntries(
    site.days.map((day) => [
      day.key,
      day.items.flatMap((row, i) => {
        const r = parseRange(row.time);
        return r ? [[r[0], r[1], i, /準備|片付け/.test(row.label)] as [number, number, number, boolean]] : [];
      }),
    ]),
  ),
  dateLabels: Object.fromEntries(site.days.map((day) => [day.key, day.date])),
  lightsOut: Object.fromEntries(
    site.days.map((day) => [day.key, Math.max(0, ...day.items.map((row) => parseRange(row.time)?.[1] ?? 0))]),
  ),
  lat: site.world.geo.lat,
  lon: site.world.geo.lon,
};

/**
 * ?t= で任意の時刻を再現する（検分用）。"2026-10-15T22:30"・"22:30" の2形式。どちらも日本時間。
 * 戻り値は「実時刻からのずれ（ms）」。指定が無ければ null。
 */
export function overrideOffset(search: string, realNow: number): number | null {
  const t = new URLSearchParams(search).get("t");
  if (!t) return null;
  let target = NaN;
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const j = new Date(realNow + 9 * 3600000);
    const ymd = j.toISOString().slice(0, 10);
    target = Date.parse(`${ymd}T${t.padStart(5, "0")}:00+09:00`);
  } else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(t)) {
    const [d, hm] = t.split("T");
    target = Date.parse(`${d}T${hm.padStart(5, "0")}:00+09:00`);
  }
  return Number.isFinite(target) ? target - realNow : null;
}

/** 教室の開きタグの直後に走らせるスクリプト：描画前に光の状態を教室へ書き込む（今日の日付は todayScript が日付欄へ） */
export function bootScript(): string {
  const boot = function (cfg: ClockConfig, core: typeof clockCore) {
    try {
      const room = document.getElementById("kb-world");
      if (!room) return;
      let now = Date.now();
      const m = location.search.match(/[?&]t=([^&]+)/);
      if (m) {
        const t = decodeURIComponent(m[1]);
        const j = new Date(now + 9 * 3600000);
        const target = /^\d{1,2}:\d{2}$/.test(t)
          ? Date.parse(j.toISOString().slice(0, 10) + "T" + t.padStart(5, "0") + ":00+09:00")
          : Date.parse(t.split("T")[0] + "T" + (t.split("T")[1] || "").padStart(5, "0") + ":00+09:00");
        if (target === target) now = target;
      }
      const s = core(now, cfg);
      room.dataset.phase = s.phase;
      room.dataset.day = s.dayKey;
      room.dataset.band = s.band;
      if (s.flips) room.dataset.flip = "pending";
      const st = room.style;
      st.setProperty("--sun", s.sun.toFixed(3));
      st.setProperty("--warm", s.warm.toFixed(3));
      st.setProperty("--lit", String(s.lit));
      st.setProperty("--dark", String(s.dark));
      st.setProperty("--amb", s.amb.toFixed(3));
      st.setProperty("--sun-az", s.sunAz.toFixed(1));
      st.setProperty("--ch", ((s.minute / 60) % 12) * 30 + "deg");
      st.setProperty("--cm", (s.minute % 60) * 6 + "deg");
      (window as unknown as { __kbToday: string }).__kbToday = s.todayLabel;
    } catch (e) {}
  };
  return `(${boot.toString()})(${JSON.stringify(clockConfig)},${clockCore.toString()});`;
}

/** 日付欄の直後に走らせる：今日の実際の日付を書き込む（書き換えの演出の起点） */
export const todayScript = `try{let e=document.getElementById("kb-today");if(e&&window.__kbToday)e.textContent=window.__kbToday}catch(e){}`;
