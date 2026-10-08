// 空：下市町から見た、いまの月の高さ・向き・満ち欠けと、空の明るさ。
// 太陽の式は worldClock の clockCore と同じ（同じ時刻なら全員が同じ月を見る）。窓の外の月と、教室に差す月の光はここから出す。

const RAD = Math.PI / 180;

export type MoonState = {
  /** 高さ（度。0より上なら地平線の上） */
  alt: number;
  /** 向き（度。北0・東90・南180・西270） */
  az: number;
  /** 光っている面の割合（0＝新月、1＝満月） */
  k: number;
  /** 満ちていく途中か（右側が光る） */
  waxing: boolean;
};

const altAz = (ra: number, dec: number, d: number, lat: number, lon: number) => {
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const H = (gmst * 15 + lon) * RAD - ra;
  const la = lat * RAD;
  const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(H));
  return { alt: alt / RAD, az: ((az / RAD) + 360) % 360 };
};

/** 月（簡略式。位置は1度前後、満ち欠けは数%の精度で十分） */
export function moonState(ms: number, lat: number, lon: number): MoonState {
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  // 月の黄経・黄緯
  const L = 218.316 + 13.176396 * d;
  const M = (134.963 + 13.064993 * d) * RAD;
  const F = (93.272 + 13.22935 * d) * RAD;
  const lam = (L + 6.289 * Math.sin(M)) * RAD;
  const bet = 5.128 * Math.sin(F) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(e) - Math.tan(bet) * Math.sin(e), Math.cos(lam));
  const dec = Math.asin(Math.sin(bet) * Math.cos(e) + Math.cos(bet) * Math.sin(e) * Math.sin(lam));
  // 太陽の黄経（clockCore と同じ式）
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const lsun = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const el = (((lam - lsun) / RAD) % 360 + 360) % 360;
  const { alt, az } = altAz(ra, dec, d, lat, lon);
  return { alt, az, k: (1 - Math.cos(el * RAD)) / 2, waxing: el < 180 };
}

/** 空の明るさ（0＝夜、1＝昼）。太陽が地平線の下12度で0、上2度で1 */
export const skyLum = (sunAlt: number) => Math.min(1, Math.max(0, (sunAlt + 12) / 14));

/** 満月が高いとき、消灯後の部屋の明るさ（--amb）をどこまで持ち上げるか〔Preview で本人が決める〕 */
export const MOON_GAIN = 0.18;
