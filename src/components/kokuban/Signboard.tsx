"use client";
// 準備中の看板（業務連絡「準備中の看板に、青い手形が増えている」と同じ物）。
// 夜（文化祭準備〜明け方）は黒板の下に表向きで立てかけてあり、青い手形が付いている。
// 手形は文化祭準備の始まりに1つ、毎正時に1つ増え、2時の9つで止まる（数は data-hands・CSS で出し分け。数字は出さない）。
// 配置はその夜の日付で決まり、同じ夜は誰が見ても同じ。増える瞬間は見せない（音も動きもなく増えている）。
// 朝になると看板は教室の後ろへ移され、表を壁に向けて立てかけてある（裏のベニヤだけが見える）。
import { useEffect, useState } from "react";
import { site } from "@/data/site";
import { clockConfig, clockCore } from "@/lib/worldClock";
import { CLOCK_EVENT, now } from "@/lib/now";

export const SCENE_EVENT = "kb:scene";

/** その夜の日付から決まる手形の置き場所（看板の中の %）。看板の字の帯（中央の横長）を避ける */
function handLayout(night: string) {
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
    if (y > 34 && y < 58 && x > 18 && x < 78) continue; // 看板の字の帯
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

/** 夜の看板（黒板の下に表向き） */
export function SignFront() {
  const [night, setNight] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setNight(clockCore(now(), clockConfig).handNight);
    sync();
    const onScene = (e: Event) => setNight((e as CustomEvent).detail?.handNight ?? clockCore(now(), clockConfig).handNight);
    window.addEventListener(SCENE_EVENT, onScene);
    window.addEventListener(CLOCK_EVENT, sync);
    return () => {
      window.removeEventListener(SCENE_EVENT, onScene);
      window.removeEventListener(CLOCK_EVENT, sync);
    };
  }, []);
  const hands = night ? handLayout(night) : [];
  return (
    <div className="kb-sign kb-sign-front" aria-hidden>
      <div className="kb-sign-board">
        <i className="kb-sign-paint kb-sign-paint-a" />
        <i className="kb-sign-paint kb-sign-paint-b" />
        <i className="kb-sign-sketch" />
        {site.signboard.front && <p className="kb-sign-text">{site.signboard.front}</p>}
        {hands.map((h, i) => (
          <svg
            key={i}
            className="kb-hp"
            viewBox="0 0 100 120"
            style={{ left: `${h.x}%`, top: `${h.y}%`, transform: `translate(-50%,-50%) rotate(${h.rot}deg) scale(${h.scale})` }}
          >
            <use href="#kb-hand" />
          </svg>
        ))}
      </div>
      <div className="kb-sign-paper" />
    </div>
  );
}

/** 昼の看板（教室の後ろで、表を壁に向けて立てかけてある＝裏のベニヤ） */
export function SignBack() {
  return (
    <div className="kb-sign kb-sign-back" aria-hidden>
      <div className="kb-sign-board">
        <i className="kb-sign-brace kb-sign-brace-a" />
        <i className="kb-sign-brace kb-sign-brace-b" />
        {site.signboard.back && <p className="kb-sign-text kb-sign-text-back">{site.signboard.back}</p>}
      </div>
    </div>
  );
}
