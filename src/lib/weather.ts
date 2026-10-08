// 下市町のいまの天気（気象庁の公開データ。アメダス五條の気温・湿度・降水と、奈良県南部の天気予報）。
// 窓の近くのタブレットに出し、窓の曇りの計算（climate.ts）にも同じ値を渡す。取れないときは平年値のまま。
// 同じ時刻なら全員が同じ値を見る（乱数を使わない）。
// 取りに行くのは3つだけ：最新の観測時刻（latest_time.txt）・五條の3時間ぶんの観測（point）・奈良県の予報（forecast）。
// 地点のファイルは3時間ごとに新しく作られ、できる前（0時すぎなど）は読めないので、そのときは1つ前の3時間のファイルを読む。
// 全国の観測ファイル（map・数百KB）は重いので使わない。

export type WeatherObs = {
  /** 観測の時刻（ms） */
  at: number;
  /** 気温（℃） */
  tempC: number;
  /** 湿度（%） */
  rh: number;
  /** 直近10分の降水（mm） */
  precip10m: number;
  /** 天気のおおまかな種類 */
  /** 天気のおおまかな種類（予報が取れず雨も降っていないときは null＝気温と湿度だけ出す） */
  kind: "hare" | "kumori" | "ame" | "yuki" | null;
};

/** 新しい観測が届いたときに投げる（窓の曇りを計算し直す合図） */
export const WEATHER_EVENT = "kb:weather";

let current: WeatherObs | null = null;

export const getObservation = () => current;

export const setObservation = (o: WeatherObs | null) => {
  current = o;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WEATHER_EVENT));
};

/* ---------------- 気象庁のデータを読む（純関数は検分のため export） ---------------- */

const BASE = "https://www.jma.go.jp/bosai";
/** アメダス五條（奈良県） */
const POINT = "64127";
/** 奈良県の予報 */
const PREF = "290000";
/** 奈良県南部（下市町を含む） */
const AREA = "290020";
const JST = 9 * 3600000;
const CACHE_KEY = "gbf_2026_weather_v1";
/** ためておく長さ・見えている間に取り直す間隔 */
export const REFRESH_MS = 10 * 60000;
/** 取れなかったときに取り直すまでの間（n 回続けて失敗したら 30秒・60秒・120秒…と倍にする。上限は REFRESH_MS） */
export const retryMs = (n: number) => Math.min(REFRESH_MS, 30000 * 2 ** Math.max(0, n - 1));

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 最新の観測時刻から、地点の3時間ぶんのファイル名（yyyymmdd_hh。hh は3時間で切り下げ・日本時間） */
export function pointFileName(latestMs: number): string {
  const d = new Date(latestMs + JST);
  const hh = Math.floor(d.getUTCHours() / 3) * 3;
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}_${pad2(hh)}`;
}

/** "yyyymmddhhmmss"（日本時間）を ms に */
const keyToMs = (k: string) =>
  Date.parse(`${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T${k.slice(8, 10)}:${k.slice(10, 12)}:${k.slice(12, 14)}+09:00`);

type PointRow = { temp?: [number | null, number | null]; humidity?: [number | null, number | null]; precipitation10m?: [number | null, number | null] };
const val = (v: [number | null, number | null] | undefined) => (v && typeof v[0] === "number" && Number.isFinite(v[0]) ? v[0] : null);

/** 地点ファイルから、気温と湿度がそろっている最新の行（latestMs 以前）。無ければ null */
export function parsePoint(json: Record<string, PointRow>, latestMs: number): { at: number; tempC: number; rh: number; precip10m: number } | null {
  const keys = Object.keys(json)
    .filter((k) => /^\d{14}$/.test(k))
    .sort()
    .reverse();
  for (const k of keys) {
    const at = keyToMs(k);
    if (!(at <= latestMs)) continue;
    const r = json[k];
    const tempC = val(r.temp);
    const rh = val(r.humidity);
    if (tempC === null || rh === null) continue;
    return { at, tempC, rh, precip10m: val(r.precipitation10m) ?? 0 };
  }
  return null;
}

/** 天気コードの百の位で丸める：1 晴れ／2 くもり／3 雨／4 雪 */
export function codeToKind(code: string | undefined): WeatherObs["kind"] | null {
  switch ((code || "")[0]) {
    case "1":
      return "hare";
    case "2":
      return "kumori";
    case "3":
      return "ame";
    case "4":
      return "yuki";
    default:
      return null;
  }
}

type Forecast = { timeSeries?: { timeDefines?: string[]; areas?: { area?: { code?: string }; weatherCodes?: string[] }[] }[] }[];

/** 予報の最初の時系列から、南部の天気コードを「いまの時刻の区間」で選ぶ（区間の始まりが atMs 以前で最後のもの。atMs が最初の区間より前なら最初） */
export function pickWeatherCode(json: Forecast, atMs: number): string | undefined {
  const ts = json?.[0]?.timeSeries?.[0];
  const area = ts?.areas?.find((a) => a.area?.code === AREA);
  const defs = ts?.timeDefines;
  if (!area?.weatherCodes || !defs) return undefined;
  let i = 0;
  for (let j = 0; j < defs.length; j++) if (Date.parse(defs[j]) <= atMs) i = j;
  return area.weatherCodes[i];
}

/** 観測と予報を合わせる：降水10分が 0 より多ければ雨（予報が雪なら雪のまま）。予報が取れず降ってもいなければ、天気の種類だけ null（気温と湿度は出す） */
export function combine(p: { at: number; tempC: number; rh: number; precip10m: number }, code: string | undefined): WeatherObs | null {
  let kind = codeToKind(code);
  if (p.precip10m > 0 && kind !== "yuki") kind = "ame";
  // 予報が取れなくても、気温と湿度は出す（天気の語だけ空欄）
  return { at: p.at, tempC: p.tempC, rh: Math.min(100, Math.max(0, p.rh)), precip10m: p.precip10m, kind: kind || null };
}

/** 検分用：わざと失敗させる（"all"＝全部の取得が失敗／"point"＝いまの3時間の地点ファイルだけ、まだ無いときと同じ失敗にする）。ふだんは "" */
export type FailMode = "" | "all" | "point";
let failMode: FailMode = "";
export const setFailMode = (m: FailMode) => {
  failMode = m;
};
/** 最後に読めた地点ファイルの名前（検分用） */
let lastFile = "";
export const getLastFile = () => lastFile;

const get = (url: string) => {
  if (failMode === "all") return Promise.reject(new TypeError("forced"));
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
};
const getJson = (url: string) => get(url).then((r) => r.json());

/** 地点の3時間ぶんのファイルを読む。まだ無い・中身がそろっていないときは1つ前の3時間のファイルを読む。どちらも無ければ null。
 *  まだ無いファイルの 404 には、許可の見出し（Access-Control-Allow-Origin）が付かないことがある（実際に確かめた）。
 *  そのときブラウザでは 404 ではなく通信の失敗に見えるので、いまのファイルは失敗の種類を問わず前のファイルへ回す */
async function readPoint(latest: number) {
  for (const back of [0, 1]) {
    const name = pointFileName(latest - back * 3 * 3600000);
    let json: Record<string, PointRow>;
    try {
      // 検分用の "point"：見出しの無い 404 と同じく、通信の失敗として返す
      if (failMode === "point" && back === 0) throw new TypeError("forced 404");
      json = await getJson(`${BASE}/amedas/data/point/${POINT}/${name}.json`);
    } catch (e) {
      if (back === 0) continue;
      throw e;
    }
    const p = parsePoint(json, latest);
    if (p) {
      lastFile = name;
      return p;
    }
  }
  return null;
}

/** 気象庁から取る（最新の観測時刻・地点・予報）。失敗したら null */
export async function fetchWeather(): Promise<WeatherObs | null> {
  try {
    const txt = await get(`${BASE}/amedas/data/latest_time.txt`).then((r) => r.text());
    const latest = Date.parse(txt.trim());
    if (!Number.isFinite(latest)) return null;
    const [p, fc] = await Promise.all([
      readPoint(latest),
      // 予報が取れなくても観測だけで出す
      getJson(`${BASE}/forecast/data/forecast/${PREF}.json`).catch(() => null),
    ]);
    if (!p) return null;
    return combine(p, fc ? pickWeatherCode(fc, p.at) : undefined);
  } catch {
    return null;
  }
}

/** sessionStorage にためた値（取った時刻 t と観測 o）。無ければ null */
export function readCache(): { t: number; o: WeatherObs } | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (c && typeof c.t === "number" && c.o && typeof c.o.tempC === "number") return c;
  } catch {}
  return null;
}

export function writeCache(o: WeatherObs) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), o }));
  } catch {}
}
