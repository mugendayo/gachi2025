"use client";
// 入口：ページの一番最初。背景動画（縦＝スマホ／横＝PC）の全画面に魔法陣を置き、押すとタイムスリップして下の教室へ移る。
// 入口は門：魔法陣でタイムスリップした人だけが学校（教室〜舞台・最下部）に入れる（lib/gate）。
// 閉じるのは学校だけで、公式の事実は公式バー・ゲームの箱の裏（学校の外）・フッターで常に読める。
// 解禁前（UnlockTeaser の isLockedNow）は、押すとお預けのモーダルだけを出してタイムスリップしない。時刻は lib/now の now() を共有する。
// 動きを減らす設定（prefers-reduced-motion: reduce）では動画を流さずポスターだけ・演出なしで教室へ移る。
// URL に motion があれば reduce でも動かす（?motion=1・検分用・黒板と同じ規則）。
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import UnlockTeaser, { UnlockCountdownBadge, isLockedNow, msUntilUnlock } from "@/components/UnlockTeaser";
import { ARRIVE_EVENT, CLOCK_EVENT } from "@/lib/now";
import { applyGate, openGate } from "@/lib/gate";
import "./entry.css";

/** 公式バーの高さ（実寸が測れないときだけ使う） */
const FALLBACK_BAR = 84;
/** タイムスリップの段取り（ms）：溜め→真っ白で教室へ移る→白が引く。合計で約1.5秒 */
const T_WHITE = 1000;
const T_REVEAL = 440;
const SETTIMEOUT_MAX = 2_000_000_000; // setTimeout の上限（約24日）を超える先は再読み込みに任せる

const motionAllowed = () =>
  new URLSearchParams(window.location.search).has("motion") ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 公式バー（sticky）の下端。教室の上端をここに合わせる */
const barBottom = () => {
  const bar = document.querySelector("body > header");
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : FALLBACK_BAR;
};

/** 門を開けて、教室の上端が公式バーのすぐ下に来るよう瞬時に移る（html の scroll-behavior: smooth を上書き） */
const goToClassroom = () => {
  openGate();
  const room = document.getElementById("kb-classroom");
  if (!room) return;
  const top = room.getBoundingClientRect().top + window.scrollY - barBottom();
  window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
};

const arrive = () => window.dispatchEvent(new Event(ARRIVE_EVENT));

/* ---------- 魔法陣（Hero の「魔法陣（既存そのまま）」を移植。座標はサーバーと端末で揃うよう丸める） ---------- */
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const DOTS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 22.5 * Math.PI) / 180;
  return { x: r3(100 + Math.cos(a) * 58), y: r3(100 + Math.sin(a) * 58) };
});
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 15 * Math.PI) / 180;
  const rad = 78 + (i % 3) * 6;
  return {
    x: r3(100 + Math.cos(angle) * (rad / 2)),
    y: r3(100 + Math.sin(angle) * (rad / 2)),
    r: i % 5 === 0 ? 2.2 : 1.2,
    o: r3(0.85 - (i % 4) * 0.18),
  };
});

function Sigil() {
  return (
    <>
      {/* 外周の光の輪 */}
      <svg viewBox="0 0 200 200" className="en-layer" aria-hidden="true">
        <defs>
          <radialGradient id="en-mg-ring" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="95%" stopColor="#bff3ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#en-mg-ring)" />
      </svg>
      {/* 回る層：二重の輪と16の点（svg ごと回す＝ぼかしの層を毎フレーム描き直さない） */}
      <svg viewBox="0 0 200 200" className="en-layer en-spin" aria-hidden="true">
        <circle cx="100" cy="100" r="82" fill="none" stroke="#e9fdff" strokeOpacity="0.85" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#d7fbff" strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="6 6" />
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="2.4" fill="#ffffff" fillOpacity="0.9" />
        ))}
      </svg>
      {/* 芯・横の光・粒 */}
      <svg viewBox="0 0 200 200" className="en-layer en-core" aria-hidden="true">
        <defs>
          <radialGradient id="en-mg-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="28%" stopColor="#c8f6ff" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#6be1ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00c2ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="en-mg-flare" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="en-mg-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="en-mg-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle cx="100" cy="100" r="64" fill="url(#en-mg-core)" />
        <rect x="18" y="98.5" width="164" height="3" fill="url(#en-mg-flare)" filter="url(#en-mg-soft)" />
        {SPARKS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#ffffff" opacity={p.o} filter="url(#en-mg-soft)" />
        ))}
        <circle cx="100" cy="100" r="20" fill="#ffffff" opacity="0.95" filter="url(#en-mg-strong)" />
      </svg>
    </>
  );
}

export default function Entry() {
  const rootRef = useRef<HTMLElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

  // 背景動画：縦長の画面＝縦の動画（スマホ）、横長の画面＝横の動画（PC）。null＝まだ測っていない（最初の HTML はポスターだけ）
  const [wideBg, setWideBg] = useState<boolean | null>(null);
  const [motionOn, setMotionOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);

  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const anims = useRef<Animation[]>([]);

  // ページ内移動で戻ったとき（インラインスクリプトが走らない）も、描画前に門の状態をこの訪問に合わせる
  useLayoutEffect(() => {
    applyGate();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-aspect-ratio: 1/1)");
    const sync = () => setWideBg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOn(motionAllowed());
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 解禁前のお預け：解禁時刻を過ぎたら自動で外す（開いたまま待っていた人のモーダルも閉じる）。
  // 配信元の時刻で補正されたとき（CLOCK_EVENT）も測り直す
  useEffect(() => {
    let t = 0;
    const sync = () => {
      window.clearTimeout(t);
      const lockedNow = isLockedNow();
      setLocked(lockedNow);
      if (!lockedNow) {
        setShowTeaser(false);
        return;
      }
      const ms = msUntilUnlock();
      if (ms <= SETTIMEOUT_MAX) t = window.setTimeout(sync, Math.max(0, ms) + 500);
    };
    sync();
    window.addEventListener(CLOCK_EVENT, sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(CLOCK_EVENT, sync);
    };
  }, []);

  // 入口が画面の外にあるあいだは動画を止める（下の教室の描画に計算を譲る）
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // 公式バーの裏に隠れている部分は「見えていない」に数える（教室に着いた直後、入口の下端がバーの裏に接している）
    const io = new IntersectionObserver(
      ([e]) => {
        const v = videoRef.current;
        if (!v) return;
        if (e.isIntersecting) v.play()?.catch(() => {});
        else v.pause();
      },
      { rootMargin: `-${Math.ceil(barBottom()) + 2}px 0px 0px 0px` },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [motionOn, wideBg]);

  useEffect(() => {
    const ts = timers.current;
    const as = anims.current;
    return () => {
      ts.forEach((id) => window.clearTimeout(id));
      as.forEach((a) => a.cancel());
    };
  }, []);

  const closeTeaser = useCallback(() => setShowTeaser(false), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const setRate = (x: number) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.playbackRate = x;
    } catch {}
  };

  /** タイムスリップ（約1.5秒）。
   *  0–1000ms：魔法陣が拡大しながら加速して回り、光を強める／背景はぼけて白飛びし、動画は 2→4→8 倍速へ
   *  400–960ms：魔法陣の中心から白い光が広がる → 700–1000ms：画面全体が真っ白になる
   *  1000ms：真っ白のうちに教室の上端へ瞬時に移る（入口の演出はここで元に戻す）
   *  約1060–1500ms：白が引いて教室が現れる → 着いたら ARRIVE_EVENT を送る */
  const slip = () => {
    const body = bodyRef.current;
    const bg = bgRef.current;
    const flash = flashRef.current;
    const burst = burstRef.current;
    const fill = fillRef.current;
    if (!body || !bg || !flash || !burst || !fill) {
      goToClassroom();
      arrive();
      busy.current = false;
      return;
    }
    const track = (a: Animation) => {
      anims.current.push(a);
      return a;
    };

    // 光の出どころ＝魔法陣の中心。いちばん遠い画面の角まで届く大きさにする
    const r = body.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    const burstScale = (reach * 2.4) / burst.offsetWidth;
    burst.style.left = `${cx}px`;
    burst.style.top = `${cy}px`;
    flash.style.visibility = "visible";

    const charge = { duration: T_WHITE, fill: "forwards" as const };
    const sigilA = track(
      body.animate(
        [
          { transform: "rotate(0deg) scale(1)", filter: "brightness(1)" },
          { transform: "rotate(900deg) scale(2.8)", filter: "brightness(2.2)" },
        ],
        { ...charge, easing: "cubic-bezier(.55,0,.85,.25)" },
      ),
    );
    const bgA = track(
      bg.animate(
        [
          { transform: "scale(1)", filter: "blur(0px) brightness(1) saturate(1)" },
          { transform: "scale(1.2)", filter: "blur(14px) brightness(2.6) saturate(1.5)" },
        ],
        { ...charge, easing: "ease-in" },
      ),
    );
    setRate(2);
    later(() => setRate(4), 250);
    later(() => setRate(8), 550);

    const burstA = track(
      burst.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.02)", opacity: 0 },
          { transform: `translate(-50%, -50%) scale(${burstScale * 0.25})`, opacity: 1, offset: 0.3 },
          { transform: `translate(-50%, -50%) scale(${burstScale})`, opacity: 1 },
        ],
        { duration: 560, delay: 400, easing: "cubic-bezier(.6,0,.9,.6)", fill: "both" },
      ),
    );
    const fillIn = track(fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 700, easing: "ease-in", fill: "both" }));

    later(() => {
      // 真っ白：教室へ移り、入口の演出を元に戻す（もう画面の外なので見えない）
      goToClassroom();
      sigilA.cancel();
      bgA.cancel();
      burstA.cancel();
      setRate(1);
      requestAnimationFrame(() => {
        const out = track(
          fill.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T_REVEAL, delay: 60, easing: "ease-out", fill: "both" }),
        );
        out.finished
          .then(() => {
            fillIn.cancel();
            out.cancel();
            flash.style.visibility = "hidden";
            anims.current.length = 0;
            timers.current.length = 0;
            busy.current = false;
            arrive();
          })
          .catch(() => {});
      });
    }, T_WHITE);
  };

  const onPress = () => {
    if (busy.current) return; // 演出中の連打は無視
    if (isLockedNow()) {
      setLocked(true);
      setShowTeaser(true);
      return;
    }
    if (locked) setLocked(false);
    if (!motionAllowed()) {
      goToClassroom();
      arrive();
      return;
    }
    busy.current = true;
    slip();
  };

  return (
    <section ref={rootRef} className="en-root" data-motion={motionOn ? "on" : "off"}>
      <div ref={bgRef} className="en-bg" aria-hidden="true">
        <div className="en-poster" />
        {motionOn && wideBg !== null && (
          <video
            ref={videoRef}
            className="en-video"
            autoPlay
            muted
            playsInline
            loop
            preload="metadata"
            key={wideBg ? "wide" : "tall"}
            poster={wideBg ? "/hero-wide-poster.jpg" : "/hero-poster.jpg"}
          >
            <source src={wideBg ? "/hero-wide.mp4" : "/hero.mp4"} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="en-stage">
        <button type="button" className="en-sigil" aria-label="タイムスリップする" onClick={onPress}>
          <span ref={bodyRef} className="en-body" aria-hidden="true">
            <span className="en-aura" />
            <Sigil />
          </span>
        </button>
        {locked && <UnlockCountdownBadge />}
      </div>

      {/* タイムスリップの光（公式バーごと画面全体を覆う。ふだんは見えない） */}
      <div ref={flashRef} className="en-flash" aria-hidden="true">
        <div ref={burstRef} className="en-burst" />
        <div ref={fillRef} className="en-fill" />
      </div>

      <AnimatePresence>{showTeaser && <UnlockTeaser onClose={closeTeaser} />}</AnimatePresence>
    </section>
  );
}
