// 世界時計：日本時間の「いま」から、トップの教室の状態を計算する（保存しない純関数）。
// 日付も時刻も実時刻。黒板の「文化祭まであと◯日」は本番（11/3）までの実際の日数。
// 灯りの生活リズム（蛍光灯・消灯）は、会期前は site.world.rhythmDay の時間割で、会期中はその日の時間割で決まる。
// clockCore は自己完結（import も外の変数も使わない）。head 直後のインラインスクリプトにも
// toString() でそのまま埋め込み、描画前に同じ計算で光の状態を決める。
import { site } from "@/data/site";

export type Phase = "sealed" | "eve" | "live" | "after";

export type ClockConfig = {
  unlockTs: number;
  afterTs: number;
  /** 会期前の灯りのリズムに使う日 */
  rhythmDay: string;
  /** 本番の日（"YYYY-MM-DD"・JST）＝カウントダウンの起点 */
  finalDate: string;
  /** 「文化祭まであと{n}日！」 */
  countTpl: string;
  /** 本番の日に黒板に書く言葉 */
  countToday: string;
  /** 本番の日の日付の表記（例：11月3日(火・祝)。右上の日付と最下段を揃える） */
  finalLabel: string;
  /** 日の key → "YYYY-MM-DD"（JST） */
  eventDates: Record<string, string>;
  /** 日の key → 時刻のある行 [開始分, 終了分, 行番号, 教室に灯りがつく行か（準備・片付け）] */
  timed: Record<string, [number, number, number, boolean][]>;
  /** 日の key → 消灯の分（その日の時刻のある行の最後の終わり） */
  lightsOut: Record<string, number>;
  /** 時刻で始まる帯 [key, 開始分]（rhythmDay の時間割から導く・昇順） */
  sceneStarts: [string, number][];
  /** 青い手形が出始める帯の開始分（文化祭準備の始まり） */
  handFrom: number;
  lat: number;
  lon: number;
};

export type ClockState = {
  phase: Phase;
  /** 灯りのリズムを決める日（会期中は実際のその日） */
  dayKey: string;
  /** 今日の実際の日付（例：10月7日(水)） */
  todayLabel: string;
  /** 本番まであと何日（当日0・過ぎたら負） */
  daysLeft: number;
  /** 黒板の見出し（例：文化祭まであと27日！／本番の日は「ガチ文化祭の日！」／過ぎたら空） */
  countLabel: string;
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
  /** 消灯 0〜1（消灯の時刻は一段で1、明け方は連続で0へ） */
  dark: number;
  /** 部屋の明るさ 0〜1 */
  amb: number;
  /** night＝消灯／evening＝日没後で灯りの時間／dawn・dusk＝朝夕／day */
  band: "night" | "evening" | "dawn" | "day" | "dusk";
  /** 8つの時間帯：shinya 深夜／akegata 明け方／asa 朝／choshinsei 超新星祭／hiru 昼／yugata 夕方／junbi 文化祭準備／shoto 消灯 */
  scene: string;
  /** 準備中の看板の青い手形の数（文化祭準備の始まりに1つ、毎正時に1つ増え、2時の9つで止まる。朝に看板が裏返されて0） */
  handCount: number;
  /** 手形の配置の種＝その夜の日付（0時〜朝は前の日） */
  handNight: string;
};

export function clockCore(nowMs: number, c: ClockConfig): ClockState {
  const JST = 9 * 3600000;
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const j = new Date(nowMs + JST);
  const minute = j.getUTCHours() * 60 + j.getUTCMinutes();
  const ymd =
    j.getUTCFullYear() + "-" + String(j.getUTCMonth() + 1).padStart(2, "0") + "-" + String(j.getUTCDate()).padStart(2, "0");
  const plainLabel = j.getUTCMonth() + 1 + "月" + j.getUTCDate() + "日(" + WD[j.getUTCDay()] + ")";

  let phase: Phase = "eve";
  let dayKey = c.rhythmDay;
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

  const todayLabel = ymd === c.finalDate ? c.finalLabel : plainLabel;
  // 本番までの日数（JST の日付どうしの差）
  const daysLeft = Math.round((Date.parse(c.finalDate + "T00:00:00Z") - Date.parse(ymd + "T00:00:00Z")) / 86400000);
  const countLabel = daysLeft > 0 ? c.countTpl.replace("{n}", String(daysLeft)) : daysLeft === 0 ? c.countToday : "";

  // 太陽：今日の、いまの時刻の高さと向き（下市町）
  const t = nowMs;
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
  // 朝日・夕日の色：太陽が地平線の少し下（-6°）から上（16°）までだけ。両端で0になり、一段で飛ばない
  const warm = sunAlt > -6 && sunAlt < 16 ? clamp(Math.min((sunAlt + 6) / 9, (16 - sunAlt) / 13)) : 0;
  // 消灯：その日の最後の時刻の行が終わってから（スイッチなので一段で切る）、朝に空が白むまで（明け方は連続で明るくなる）。
  // 解禁前も会期後も、光は時刻どおり。消灯中も月明かりで時間割は読める明るさを残す（暗さで読ませない）
  const out = c.lightsOut[dayKey] || 21 * 60 + 30;
  const dark = minute >= out ? 1 : minute < 12 * 60 ? clamp((-2 - sunAlt) / 4) : 0;
  const lit = dark < 0.5 && prep ? 1 : 0;
  // 明るさの下限：日暮れ後〜準備の前や夜明け前は、消灯（0.22）より明るい
  const dayAmb = Math.max(0.42, 0.3 + 0.7 * sun, lit ? 0.92 : 0);
  const amb = dark * 0.22 + (1 - dark) * dayAmb;
  const band: ClockState["band"] = dark >= 0.5 ? "night" : sunAlt < -6 ? "evening" : sunAlt < 8 ? (minute < 12 * 60 ? "dawn" : "dusk") : "day";

  // 8つの時間帯：朝までは太陽の高さ、そのあとは時間割の時刻のある行・消灯で区切る
  let scene = "asa";
  if (minute < 12 * 60 && sunAlt < -6) scene = "shinya";
  else if (minute < 12 * 60 && sunAlt < 8) scene = "akegata";
  else for (let i = 0; i < c.sceneStarts.length; i++) if (minute >= c.sceneStarts[i][1]) scene = c.sceneStarts[i][0];
  let handCount = 0;
  if (minute >= c.handFrom) handCount = 1 + Math.floor((minute - c.handFrom) / 60);
  else if (scene === "shinya" || scene === "akegata") handCount = Math.min(9, Math.floor((24 * 60 - c.handFrom) / 60) + 1 + Math.floor(minute / 60));
  handCount = Math.min(9, handCount);
  const nightMs = nowMs + JST - (minute < 12 * 60 ? 86400000 : 0);
  const nj = new Date(nightMs);
  const handNight =
    nj.getUTCFullYear() + "-" + String(nj.getUTCMonth() + 1).padStart(2, "0") + "-" + String(nj.getUTCDate()).padStart(2, "0");

  return {
    phase: phase,
    scene: scene,
    handCount: handCount,
    handNight: handNight,
    dayKey: dayKey,
    todayLabel: todayLabel,
    daysLeft: daysLeft,
    countLabel: countLabel,
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

/** site.world.scenes の「時刻で始まる帯」を、rhythmDay の時間割から分に直す（太陽と0時の帯は clockCore が決める） */
function sceneStarts(): [string, number][] {
  const day = site.days.find((d) => d.key === site.world.rhythmDay) ?? site.days[0];
  const ranges = day.items.map((row) => ({ label: row.label, r: parseRange(row.time) })).filter((x) => x.r);
  const out: [string, number][] = [];
  for (const sc of site.world.scenes) {
    const f = sc.from as { row?: string; edge?: "start" | "end"; lightsOut?: boolean };
    if (f.row) {
      const hit = ranges.find((x) => x.label.includes(f.row as string));
      if (hit && hit.r) out.push([sc.key, f.edge === "end" ? hit.r[1] : hit.r[0]]);
    } else if (f.lightsOut) {
      out.push([sc.key, Math.max(0, ...ranges.map((x) => (x.r as [number, number])[1]))]);
    }
  }
  return out.sort((a, b) => a[1] - b[1]);
}

/**
 * 検分用の上書き（?t= ・?return=・〔本人〕の枠の表示）を効かせてよい場所か。許可した所だけ（手元と Preview の URL）。
 * 本番（gachibunkasai.com・gachi2025.vercel.app）では効かせない＝時刻の秘密を守る
 */
export const DEBUG_HOST = /^(localhost|127\.0\.0\.1)$|-mugendayos-projects\.vercel\.app$/;
export const debugAllowed = () => typeof window === "undefined" || DEBUG_HOST.test(window.location.hostname);

export const clockConfig: ClockConfig = {
  unlockTs: Date.parse(site.unlockAt),
  afterTs: Date.parse(site.world.afterAt),
  rhythmDay: site.world.rhythmDay,
  finalDate: site.world.eventDates.d4,
  countTpl: site.countdownTemplate,
  countToday: site.days[site.days.length - 1].countdown,
  finalLabel: site.days[site.days.length - 1].date,
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
  lightsOut: Object.fromEntries(
    site.days.map((day) => [day.key, Math.max(0, ...day.items.map((row) => parseRange(row.time)?.[1] ?? 0))]),
  ),
  sceneStarts: sceneStarts(),
  handFrom: sceneStarts().find(([k]) => k === "junbi")?.[1] ?? 18 * 60,
  lat: site.world.geo.lat,
  lon: site.world.geo.lon,
};

/**
 * ?t= で任意の時刻を再現する（検分用）。"2026-10-15T22:30"・"22:30" の2形式。どちらも日本時間。
 * 戻り値は「実時刻からのずれ（ms）」。指定が無ければ null。
 */
export function overrideOffset(search: string, realNow: number): number | null {
  if (!debugAllowed()) return null;
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

/** main の開きタグの直後に走らせるスクリプト：描画前に光の状態を書き込む（今日の日付と残り日数は boardTextScript が黒板へ） */
export function bootScript(): string {
  const boot = function (cfg: ClockConfig, core: typeof clockCore) {
    try {
      const room = document.getElementById("kb-world");
      if (!room) return;
      let now = Date.now();
      const dbg = /^(localhost|127\.0\.0\.1)$|-mugendayos-projects\.vercel\.app$/.test(location.hostname);
      const m = dbg ? location.search.match(/[?&]t=([^&]+)/) : null;
      if (m) {
        const t = decodeURIComponent(m[1]);
        const j = new Date(now + 9 * 3600000);
        const target = /^\d{1,2}:\d{2}$/.test(t)
          ? Date.parse(j.toISOString().slice(0, 10) + "T" + t.padStart(5, "0") + ":00+09:00")
          : Date.parse(t.split("T")[0] + "T" + (t.split("T")[1] || "").padStart(5, "0") + ":00+09:00");
        if (target === target) now = target;
      }
      // 門は読み込むたびに閉じる（検分用に Preview と手元では ?gate=open で開けておける）
      if (dbg && /[?&]gate=open(&|$)/.test(location.search)) {
        room.dataset.gate = "open";
        (window as unknown as { __kbGateOpen: boolean }).__kbGateOpen = true;
      }
      if (/[?&]motion(=|&|$)/.test(location.search)) room.dataset.motionForced = "";
      // 検分用の表示（〔本人〕の枠など）は Preview と手元だけ
      if (dbg) room.dataset.debug = "1";
      const s = core(now, cfg);
      room.dataset.phase = s.phase;
      room.dataset.day = s.dayKey;
      room.dataset.band = s.band;
      room.dataset.scene = s.scene;
      room.dataset.hands = String(s.handCount);
      const st = room.style;
      st.setProperty("--sun", s.sun.toFixed(3));
      st.setProperty("--warm", s.warm.toFixed(3));
      st.setProperty("--lit", String(s.lit));
      st.setProperty("--dark", s.dark.toFixed(3));
      st.setProperty("--amb", s.amb.toFixed(3));
      st.setProperty("--sun-az", s.sunAz.toFixed(1));
      st.setProperty("--ch", ((s.minute / 60) % 12) * 30 + "deg");
      st.setProperty("--cm", (s.minute % 60) * 6 + "deg");
      const w = window as unknown as { __kbToday: string; __kbCount: string };
      w.__kbToday = s.todayLabel;
      w.__kbCount = s.countLabel;
    } catch (e) {}
  };
  return `(${boot.toString()})(${JSON.stringify(clockConfig)},${clockCore.toString()});`;
}

/** 黒板の見出しの直後に走らせる：今日の日付と本番までの残り日数を書き込む（描画前） */
export const boardTextScript = `try{var a=document.getElementById("kb-today"),b=document.getElementById("kb-count");if(a&&window.__kbToday)a.textContent=window.__kbToday;if(b&&window.__kbCount!==undefined){b.textContent=window.__kbCount;if(b.parentElement)b.parentElement.hidden=!window.__kbCount}}catch(e){}`;

/** ビルド時点の今日の日付と見出し（JS が動かないときの代わり。動けば描画前に正しい値へ書き換わる） */
export const buildTimeBoardText = () => {
  const s = clockCore(Date.now(), clockConfig);
  return { today: s.todayLabel, count: s.countLabel };
};
