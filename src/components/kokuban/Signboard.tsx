// 手形の部品（看板は外した。形と置き方だけ残し、ほかの場所から使う）。
// 手形の数は #kb-world の data-hands（文化祭準備の始まりに1つ、毎正時に1つ増え、2時の9つで止まる。BoardFx が書く）。
// 置き場所はその夜の日付で決まり、同じ夜は誰が見ても同じ。

/** 帯が変わったときに BoardFx が送るイベント（detail: scene・handNight） */
export const SCENE_EVENT = "kb:scene";

/** その夜の日付から決まる手形の置き場所（置く面の中の %）。中央の横長の帯は空けておく */
export function handLayout(night: string) {
  let s = 0;
  for (let i = 0; i < night.length; i++) s = (Math.imul(s, 31) + night.charCodeAt(i)) >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: { x: number; y: number; rot: number; scale: number }[] = [];
  let guard = 0;
  while (out.length < 9 && guard++ < 400) {
    const x = 6 + r() * 82;
    const y = 4 + r() * 76;
    if (y > 34 && y < 58 && x > 18 && x < 78) continue; // 中央の横長の帯
    if (out.some((p) => Math.hypot(p.x - x, (p.y - y) * 0.55) < 11)) continue; // 重なりすぎない
    out.push({ x, y, rot: -40 + r() * 80, scale: 0.82 + r() * 0.3 });
  }
  return out;
}

/** 手形の形（旧版の時間割の手形を流用）。ページに1つだけ置き、use で使い回す */
export function HandSymbol() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <symbol id="kb-hand" viewBox="0 0 100 120">
        <ellipse cx="50" cy="72" rx="26" ry="28" />
        <rect x="22" y="22" width="11" height="44" rx="5.5" transform="rotate(-12 27 44)" />
        <rect x="36" y="10" width="11" height="52" rx="5.5" transform="rotate(-4 41 36)" />
        <rect x="51" y="8" width="11" height="54" rx="5.5" transform="rotate(4 56 35)" />
        <rect x="65" y="16" width="11" height="48" rx="5.5" transform="rotate(12 70 40)" />
        <rect x="74" y="58" width="11" height="34" rx="5.5" transform="rotate(48 79 75)" />
        <rect x="44" y="96" width="5" height="22" rx="2.5" />
        <rect x="58" y="94" width="4" height="16" rx="2" />
      </symbol>
    </svg>
  );
}
