// 窓の曇り：外の気温・教室の気温と湿り気・ガラスの温度から、窓が曇るかどうかを出す（保存しない純関数）。
// 曇る時刻は決めていない。人が集まって息で湿った空気が、外で冷えたガラスに触れたときにだけ曇る＝物理の結果に任せる。
// 同じ時刻なら全員が同じ曇りを見る（乱数を使わない）。
import { clockCore, type ClockConfig, type ClockState } from "@/lib/worldClock";
import { isOverridden } from "@/lib/now";
import { getObservation } from "@/lib/weather";

/**
 * 平年の最低・最高気温（℃）を2点。[日付, 最低, 最高]。間の日は線形に結ぶ。
 * 出典：気象庁「過去の気象データ検索」平年値（日ごとの値）アメダス五條（奈良県・block_no 0635）。
 * 統計期間 2005〜2020。10/10＝最低13.1・最高23.4、11/3＝最低7.6・最高18.8（2026-10-08 に確認）。
 * https://www.data.jma.go.jp/stats/etrn/view/nml_amd_d.php?prec_no=64&block_no=0635&month=10
 * 確かめられない値を置くときは null にする（窓は曇らず、鏡・息・指の跡だけになる）。
 */
export const CLIMATE: { from: [string, number, number]; to: [string, number, number]; src: string } | null = {
  from: ["2026-10-10", 13.1, 23.4],
  to: ["2026-11-03", 7.6, 18.8],
  src: "気象庁 平年値（日ごとの値）アメダス五條（奈良県）2005〜2020",
};

export type Climate = {
  /** 外の気温 */
  tOut: number;
  /** 教室の気温 */
  tIn: number;
  /** 教室の露点（この温度より冷たい面に水滴がつく） */
  tdIn: number;
  /** 窓ガラスの内側の温度 */
  tGlass: number;
  /** 曇りの濃さ 0〜1 */
  fog: number;
};

const JST = 9 * 3600000;
const DAY = 86400000;
const MAX_HOUR = 14.5; // 一日でいちばん暖かい時刻（14:30）
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 日本時間のその日の0時（ms） */
const dayStartOf = (ms: number) => Math.floor((ms + JST) / DAY) * DAY - JST;

/** その日の平年の最低・最高（2点の間を線形に結ぶ。外側は端の値のまま） */
function normals(dayStart: number): [number, number] {
  const c = CLIMATE as NonNullable<typeof CLIMATE>;
  const a = Date.parse(c.from[0] + "T00:00:00+09:00");
  const b = Date.parse(c.to[0] + "T00:00:00+09:00");
  const f = clamp((dayStart - a) / (b - a));
  return [c.from[1] + (c.to[1] - c.from[1]) * f, c.from[2] + (c.to[2] - c.from[2]) * f];
}

/** 日の出（太陽が地平線を下から上へ横切る時刻）。6:00 の前後2時間を10分刻みで探す。日付ごとに覚えておく */
const sunriseMemo = new Map<number, number>();
function sunrise(dayStart: number, cfg: ClockConfig): number {
  const hit = sunriseMemo.get(dayStart);
  if (hit !== undefined) return hit;
  let out = dayStart + 6 * 3600000;
  let prevT = dayStart + 4 * 3600000;
  let prevAlt = clockCore(prevT, cfg).sunAlt;
  for (let m = 4 * 60 + 10; m <= 8 * 60; m += 10) {
    const t = dayStart + m * 60000;
    const alt = clockCore(t, cfg).sunAlt;
    if (prevAlt < 0 && alt >= 0) {
      out = prevT + ((t - prevT) * -prevAlt) / (alt - prevAlt);
      break;
    }
    prevT = t;
    prevAlt = alt;
  }
  sunriseMemo.set(dayStart, out);
  return out;
}

/** 外の気温：日の出に最低、14:30 に最高。その間を余弦で結ぶ */
function outsideTemp(ms: number, cfg: ClockConfig): number {
  const d0 = dayStartOf(ms);
  const rise = sunrise(d0, cfg);
  const peak = d0 + MAX_HOUR * 3600000;
  const [min0, max0] = normals(d0);
  if (ms >= rise && ms <= peak) {
    // 朝から昼へ上がる
    const f = (ms - rise) / (peak - rise);
    return min0 + ((max0 - min0) * (1 - Math.cos(Math.PI * f))) / 2;
  }
  // 昼から次の日の出へ下がる（日の出前なら、前の日の 14:30 から今日の日の出まで）
  const from = ms > peak ? peak : peak - DAY;
  const fromMax = ms > peak ? max0 : normals(d0 - DAY)[1];
  const to = ms > peak ? sunrise(d0 + DAY, cfg) : rise;
  const toMin = ms > peak ? normals(d0 + DAY)[0] : min0;
  const f = (ms - from) / (to - from);
  return toMin + ((fromMax - toMin) * (1 + Math.cos(Math.PI * f))) / 2;
}

/**
 * 教室に人がいる時間（文化祭準備の行）。会期中もその日の時間割では分けず、どの日も rhythmDay の準備の行だけを使う＝会期中は変えない。
 * 戻り値は、いまの直前に始まった準備の行の [始まり, 終わり]（ms）。無ければ null
 */
function lastPrep(ms: number, cfg: ClockConfig): [number, number] | null {
  // ClockConfig の行には名前が無いので、教室に灯りがつく行（準備・片付け）の印で拾う。rhythmDay（d1）には片付けの行が無い
  const rows = (cfg.timed[cfg.rhythmDay] || []).filter((r) => r[3]);
  const d0 = dayStartOf(ms);
  let best: [number, number] | null = null;
  for (const back of [0, 1]) {
    for (const r of rows) {
      const a = d0 - back * DAY + r[0] * 60000;
      const b = d0 - back * DAY + r[1] * 60000;
      if (a <= ms && (!best || a > best[0])) best = [a, b];
    }
  }
  return best;
}

const RISE_MIN = 60; // 在室中に湿り気が上がる速さ（分）
const HALF_LIFE_MIN = 360; // 人が帰ったあと湿り気が抜ける半減期（分）。窓を閉め切った夜の教室なので、ゆっくり抜ける
const SKY_COOL = 3; // 晴れた夜、ガラスの外側が空へ熱を逃がして気温より冷える分（℃）。日が昇ると無くなる
const TD_GAIN = 9; // 在室で上がる露点の上限（℃）
const OBS_FRESH_MS = 90 * 60000; // 観測をそのまま使ってよい古さ

/** 露点（Magnus 式）。気温 t（℃）と湿度 rh（%）から */
export function dewPoint(t: number, rh: number): number {
  const b = 17.62;
  const c = 243.12;
  const g = Math.log(Math.min(100, Math.max(1, rh)) / 100) + (b * t) / (c + t);
  return (c * g) / (b - g);
}

/** 外の気温と露点：新しい観測（いまとの差が90分以内）があって ?t= で時刻を上書きしていなければ観測から、それ以外は平年値から */
function outside(nowMs: number, cfg: ClockConfig, tMin: number): [number, number, number] {
  const o = getObservation();
  // 雲があると空へ熱が逃げにくい（くもり・雨・雪の夜はガラスがあまり冷えない）
  if (o && !isOverridden() && Math.abs(nowMs - o.at) <= OBS_FRESH_MS) return [o.tempC, dewPoint(o.tempC, o.rh), o.kind === "hare" ? 1 : o.kind === "kumori" ? 0.4 : 0.2];
  return [outsideTemp(nowMs, cfg), tMin - 1, 1];
}

/** いまの外・教室・ガラスの温度と、窓の曇りの濃さ */
export function climateAt(nowMs: number, s: ClockState, cfg: ClockConfig): Climate {
  if (!CLIMATE) return { tOut: NaN, tIn: NaN, tdIn: NaN, tGlass: NaN, fog: 0 };
  const [tMin, tMax] = normals(dayStartOf(nowMs));
  const [tOut, tdOut, clear] = outside(nowMs, cfg, tMin);

  // 湿り気：準備の行の間に上がり、終わったら半減期6時間で抜ける（直前の行の始まり・終わりから閉じた式で出す）
  const p = lastPrep(nowMs, cfg);
  let dTd = 0;
  let inRoom = false;
  if (p) {
    if (nowMs < p[1]) {
      inRoom = true;
      dTd = TD_GAIN * (1 - Math.exp(-(nowMs - p[0]) / 60000 / RISE_MIN));
    } else {
      const peak = TD_GAIN * (1 - Math.exp(-(p[1] - p[0]) / 60000 / RISE_MIN));
      dTd = peak * Math.pow(0.5, (nowMs - p[1]) / 60000 / HALF_LIFE_MIN);
    }
  }
  const tIn = (tMin + tMax) / 2 + 5 + (inRoom ? 2 : 0);
  // 露点は室温を超えない（外が雨で湿度100%の観測のときに起きうる。平年値では届かない）
  const tdIn = Math.min(tdOut + dTd, tIn - 0.5);
  // 一枚ガラスの内側の面：外の気温に近い。夜は空へ熱を逃がした分だけ外側が冷える（放射冷却）
  const night = clamp((10 - s.sunAlt) / 12);
  const tFace = tOut - SKY_COOL * night * clear;
  const tGlass = tFace + 0.25 * (tIn - tFace);

  // 日が窓に当たっているとガラスが温まって曇らない（窓は南向きの仮定・.kb-sunlight と同じ）
  let sunOn = 0;
  const off = s.sunAz - 180;
  if (s.sunAlt > 0 && Math.abs(off) < 90) sunOn = clamp(2.2 * Math.sin(s.sunAlt * (Math.PI / 180)) * Math.cos(off * (Math.PI / 180)));

  const fog = smoothstep(-0.5, 2.5, tdIn - tGlass) * (1 - sunOn);
  return { tOut, tIn, tdIn, tGlass, fog };
}
