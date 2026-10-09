"use client";
// 教室の後ろのブラウン管。右の操作パネルのボタン（1・2・3）でチャンネル（site.tv）を変え、つまみで音量を変え、丸いボタンで電源を入れ切りする。
// テレビの見た目の追加・上書きは tv2.css（つまみの触れる範囲・目盛りの点）。
// 帯ごとの既定の見た目：点いている（選ばれたチャンネルの静止画）＝昼・文化祭準備・消灯／電源オフ＝朝・超新星祭・夕方／砂嵐＝深夜・明け方。
// ボタンを押したら帯に関係なく、押した人の操作のとおりに映す（電源も帯の既定より優先。保存しないので読み込み直すと既定に戻る）。
// チャンネルのボタン＝点けて再生。電源ボタン＝切る（止めて外し、画面が横一本の光に縮んで消える）／点ける（静止画。勝手に再生しない）。
// 動画も src も空のチャンネルは砂嵐（音なし）。src（自前の動画）があれば YouTube を使わない。
// YouTube の埋め込みは、流れている間だけ見せ、その上には何も重ねない（ガラス・走査線も外す）。止まったら外して静止画に戻す。
// 最初は動画を読み込まない：静止画は近づいてから、再生の仕組み（tvPlayer と YouTube の API）は押してから読む。
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { debugAllowed } from "@/lib/worldClock";
import type { TvPhase, TvPlayer, TvProbe, TvSource } from "./tvPlayer";
import "./tv2.css";

/**
 * idle＝帯の既定のまま／on＝電源を入れた（静止画）／off＝電源を切った／
 * play＝押した〜流れ始める前（砂嵐・埋め込みは見せない）／live＝流れている／snow＝空のチャンネル・読み込めない
 */
type Mode = "idle" | "on" | "off" | "play" | "live" | "snow";
const VOL_KEY = "kb-tv-vol";
const VOL_DEFAULT = 60;

/** テレビの絵（site.assets.tv）。空なら CSS で描いた仮の箱 */
const TV_ART: string = site.assets.tv;

const thumbOf = (id: string) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "");
const clampVol = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
/** つまみを押すだけ（動かさずに離す）のときの段階：今より一つ上へ、いちばん上の次は 0 */
const VOL_STEPS = [0, 30, 60, 100];
const nextStep = (v: number) => VOL_STEPS.find((s) => s > v) ?? 0;
/** つまみを押したまま動かした距離で音量を変える（120px で 0→100） */
const VOL_PER_PX = 100 / 120;
/** これより動いたら「回した」、動かずに離したら「押した」（指は少しぶれるので広め） */
const MOVE_TOUCH = 6;
const MOVE_MOUSE = 3;
/** 長く押したまま動かさずに離したときは、段階を変えない（迷って離しただけ） */
const TAP_MAX_MS = 700;
/** 目盛りの点：つまみの周りに、印の動く範囲（-135°〜135°）に合わせて並べる */
const DOTS = 5;
const DOT_POS = Array.from({ length: DOTS }, (_, i) => {
  const a = ((-135 + (270 / (DOTS - 1)) * i) * Math.PI) / 180;
  return { sx: Math.sin(a).toFixed(4), sy: (-Math.cos(a)).toFixed(4) };
});
/** 点る数：0 なら全部消える。少しでも鳴っていれば一つは点る */
const litOf = (v: number) => Math.ceil((v / 100) * DOTS);

let modPromise: Promise<typeof import("./tvPlayer")> | null = null;
const loadMod = () => (modPromise ??= import(/* webpackChunkName: "tvPlayer" */ "./tvPlayer"));

export default function BackTv() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ytRef = useRef<HTMLDivElement | null>(null);
  const offRef = useRef<HTMLElement | null>(null);
  const ctrlRef = useRef<TvPlayer | null>(null);
  const visibleRef = useRef(false);
  const pressSeq = useRef(0);
  const [channel, setChannel] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [volume, setVolumeState] = useState(VOL_DEFAULT);
  const volRef = useRef(VOL_DEFAULT);
  const [near, setNear] = useState(false);
  // 検分用：チャンネルの src を差し替える（本人が動画ファイルを置く前に試す）
  const [srcOver, setSrcOver] = useState<Record<number, string>>({});
  const stateRef = useRef({ channel, mode, near, srcOver });
  stateRef.current = { channel, mode, near, srcOver };

  /** i 番のチャンネル（src は検分の差し替えを優先） */
  const chOf = useCallback((i: number): (TvSource & { key: string }) | null => {
    const c = site.tv[i];
    if (!c) return null;
    return { key: c.key, youtubeId: c.youtubeId, src: stateRef.current.srcOver[i] ?? c.src };
  }, []);

  // 音量は前に合わせた値を覚えておく（その人の端末だけ）
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(VOL_KEY));
      if (localStorage.getItem(VOL_KEY) !== null && Number.isFinite(v)) {
        volRef.current = clampVol(v);
        setVolumeState(volRef.current);
      }
    } catch {}
  }, []);

  // 近づいたら静止画と再生の仕組みの JS を用意する（YouTube の API はまだ読まない）／画面から外れたら一時停止
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ioNear = new IntersectionObserver(
      (en) => {
        if (!en.some((e) => e.isIntersecting)) return;
        setNear(true);
        loadMod().catch(() => {});
        ioNear.disconnect();
      },
      { rootMargin: "200px 0px" },
    );
    const ioSeen = new IntersectionObserver((en) => {
      visibleRef.current = en.some((e) => e.isIntersecting);
      ctrlRef.current?.setVisible(visibleRef.current);
    });
    ioNear.observe(el);
    ioSeen.observe(el);
    return () => {
      ioNear.disconnect();
      ioSeen.disconnect();
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
    };
  }, []);

  /** 再生側の知らせ：流れ始めたら見せる／止まったら静止画へ（電源を切ったあとなどは聞かない） */
  const onPhase = useCallback((p: TvPhase) => {
    const m = stateRef.current.mode;
    if (m !== "play" && m !== "live") return;
    setMode(p === "live" ? "live" : p === "loading" ? "play" : "on");
  }, []);

  const ensureCtrl = useCallback(async () => {
    if (ctrlRef.current) return ctrlRef.current;
    const m = await loadMod();
    if (!ctrlRef.current && ytRef.current) {
      ctrlRef.current = m.createTvPlayer(ytRef.current, {
        volume: volRef.current,
        onPhase,
        onFail: () => setMode("snow"),
      });
      ctrlRef.current.setVisible(visibleRef.current);
    }
    return ctrlRef.current;
  }, [onPhase]);

  /** チャンネルのボタン（点けて再生） */
  const press = useCallback(
    (i: number) => {
      const ch = chOf(i);
      if (!ch) return;
      const s = stateRef.current;
      // 流れているチャンネルをもう一度押しても、そのまま
      if (i === s.channel && s.mode === "live") return;
      const seq = ++pressSeq.current;
      setChannel(i);
      if (!ch.youtubeId && !ch.src) {
        setMode("snow");
        ctrlRef.current?.stop();
        return;
      }
      setMode("play");
      stateRef.current = { ...s, channel: i, mode: "play" };
      // 仕組みがもう用意できていれば、押した操作の中でそのまま流す（端末が「押して流した」と見なし、音ありで流れやすい）
      if (ctrlRef.current) {
        ctrlRef.current.play(ch);
        return;
      }
      ensureCtrl()
        .then((c) => {
          // 読み込みを待つ間に別のボタン（砂嵐・電源など）が押されていたら、古い方は流さない
          if (seq === pressSeq.current) c?.play(ch);
        })
        .catch(() => {
          if (seq === pressSeq.current) setMode("snow");
        });
    },
    [chOf, ensureCtrl],
  );

  /** 電源ボタン：点いていれば切る、切れていれば点ける（静止画まで。再生はチャンネルのボタンで） */
  const power = useCallback(() => {
    const s = stateRef.current;
    // 帯の既定のままなら、いま画面が「電源オフ」に見えているかで決める（帯の見分けは CSS だけが持つ）
    const isOn =
      s.mode === "idle" ? !offRef.current || getComputedStyle(offRef.current).display === "none" : s.mode !== "off";
    ++pressSeq.current;
    if (isOn) {
      ctrlRef.current?.stop();
      setMode("off");
      stateRef.current = { ...s, mode: "off" };
      return;
    }
    const ch = chOf(s.channel);
    const next: Mode = ch && (ch.youtubeId || ch.src) ? "on" : "snow";
    setMode(next);
    stateRef.current = { ...s, mode: next };
  }, [chOf]);

  const saveVolume = useCallback(() => {
    try {
      localStorage.setItem(VOL_KEY, String(volRef.current));
    } catch {}
  }, []);
  /** 音量を変える。回している途中は覚えず（save=false）、離したときにまとめて覚える */
  const changeVolume = useCallback(
    (v: number, save = true) => {
      const nv = clampVol(v);
      volRef.current = nv;
      setVolumeState(nv);
      ctrlRef.current?.setVolume(nv);
      if (save) saveVolume();
    },
    [saveVolume],
  );

  // 音量つまみ（指もマウスも同じ）：押したまま上か右へ動かすと大きく、下か左へ動かすと小さく。
  // 動かさずに離すと一段ずつ（0→30→60→100→0）。つまみの上ではページを縦にスクロールしない（tv2.css の touch-action）。
  // 動いた分は縦か横の一方だけを数える（斜めに動かしても倍にならず、向きが変わっても跳ばない）。
  // どちらで数えるかは、ここ数歩の動きの向き（ex・ey）で決める。指で真上に動かしても一歩ごとの横ぶれは小さく出るので、
  // 一歩だけで決めると横ぶれを拾って逆に回ることがある
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    lx: number;
    ly: number;
    ex: number;
    ey: number;
    v: number;
    t: number;
    moved: boolean;
  } | null>(null);
  const [turning, setTurning] = useState(false);
  const onKnobDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { clientX: x, clientY: y } = e;
    drag.current = { id: e.pointerId, x, y, lx: x, ly: y, ex: 0, ey: 0, v: volRef.current, t: e.timeStamp, moved: false };
  };
  const onKnobMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < (e.pointerType === "mouse" ? MOVE_MOUSE : MOVE_TOUCH)) return;
      d.moved = true;
      setTurning(true);
    }
    const mx = e.clientX - d.lx;
    const my = e.clientY - d.ly;
    d.lx = e.clientX;
    d.ly = e.clientY;
    // ここ数歩の向き（古い歩ほど薄く数える）。横が勝てば右＝大きく、縦が勝てば上＝大きく
    d.ex = d.ex * 0.6 + mx;
    d.ey = d.ey * 0.6 + my;
    const step = Math.abs(d.ex) >= Math.abs(d.ey) ? mx : -my;
    // 端で止めておく（行き過ぎた分を貯めないので、戻せばすぐ効く）
    d.v = Math.max(0, Math.min(100, d.v + step * VOL_PER_PX));
    changeVolume(d.v, false);
  };
  /** 離した（pointerup）・取り上げられた（pointercancel・lostpointercapture）。動かさずに離したときだけ一段変える。
   *  lostpointercapture も聞くのは、離した知らせが来ないまま掴みっぱなし（次から押しても効かない）にならないため */
  const onKnobUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setTurning(false);
    if (d.moved) saveVolume();
    else if (e.type === "pointerup" && e.timeStamp - d.t < TAP_MAX_MS) changeVolume(nextStep(volRef.current));
  };
  const onKnobKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 }[e.key];
    if (step !== undefined) changeVolume(volRef.current + step);
    else if (e.key === "Enter" || e.key === " ") {
      // 押しっぱなしの繰り返しでは回さない（一度押すと一段）
      if (!e.repeat) changeVolume(nextStep(volRef.current));
    } else if (e.key === "Home") changeVolume(0);
    else if (e.key === "End") changeVolume(100);
    else return;
    e.preventDefault();
  };

  // 検分用（手元と Preview だけ）：window.__kbTv.state() で今の状態、press(n)（1〜3）・volume(v)・power() で操作。
  // pause()＝外から一時停止されたときと同じ（埋め込みが外れて静止画に戻るか）。
  // useSrc(n, url)＝n 番のチャンネルに自前の動画を差し込む（"" で YouTube に戻す・null で site.tv のまま）
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbTv?: unknown };
    w.__kbTv = {
      state: () => {
        const s = stateRef.current;
        const ch = chOf(s.channel);
        const p: Partial<TvProbe> = ctrlRef.current?.probe() ?? {};
        return {
          channel: s.channel + 1,
          key: ch?.key,
          youtubeId: ch?.youtubeId,
          chSrc: ch?.src,
          mode: s.mode,
          near: s.near,
          knob: volRef.current,
          // つまみの周りの点がいくつ点っているか・触れる範囲の大きさ（px）
          knobDots: rootRef.current?.querySelectorAll(".kb-tv-dots .is-on").length ?? 0,
          knobHit: (() => {
            const r = rootRef.current?.querySelector(".kb-tv-vol-hit")?.getBoundingClientRect();
            return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
          })(),
          apiLoaded: !!document.querySelector('script[src="https://www.youtube.com/iframe_api"]'),
          glassShown: (() => {
            const g = rootRef.current?.querySelector<HTMLElement>(".kb-tv-glass");
            return !!g && getComputedStyle(g).display !== "none";
          })(),
          ...p,
        };
      },
      press: (n: number) => press(n - 1),
      volume: (v: number) => changeVolume(v),
      power: () => power(),
      pause: () => ctrlRef.current?.debugPause(),
      useSrc: (n: number, url: string | null) => {
        const i = n - 1;
        const s = stateRef.current;
        if (i === s.channel && (s.mode === "play" || s.mode === "live")) {
          ++pressSeq.current;
          ctrlRef.current?.stop();
          setMode("on");
        }
        setSrcOver((o) => {
          const next = { ...o };
          if (url === null) delete next[i];
          else next[i] = url;
          stateRef.current = { ...stateRef.current, srcOver: next };
          return next;
        });
      },
    };
    return () => {
      delete w.__kbTv;
    };
  }, [chOf, press, power, changeVolume]);

  const cur = site.tv[channel];
  const id = cur?.youtubeId ?? "";
  const src = srcOver[channel] ?? cur?.src ?? "";
  const thumb = near && !src ? thumbOf(id) : "";
  const lit = litOf(volume);

  return (
    <div ref={rootRef} className="kb-tv" data-tv={mode} data-tv-kind={src ? "video" : "yt"}>
      {/* data-occlude＝輪飾りの鎖はこの箱の中を描かない（テレビの裏を通る） */}
      {/* 絵があるときは箱の地が絵になり、画面とボタンは絵の画面・右の面に合わせて置く（kokuban.css の .kb-tv-body.has-art） */}
      <div
        className={`kb-tv-body${TV_ART ? " has-art" : ""}`}
        style={TV_ART ? ({ "--art": `url(${TV_ART})` } as React.CSSProperties) : undefined}
        data-occlude=""
      >
        <div className="kb-tv-screen" aria-hidden>
          {thumb && (
            <>
              <img key={thumb} className="kb-tv-thumb" src={thumb} alt="" decoding="async" referrerPolicy="no-referrer" />
              <img key={`${thumb}-g`} className="kb-tv-thumb kb-tv-ghost" src={thumb} alt="" decoding="async" referrerPolicy="no-referrer" />
            </>
          )}
          {/* 自前の動画の静止画は、その動画の始まりの1コマ（YouTube を使わない） */}
          {near && src && (
            <video key={src} className="kb-tv-thumb" src={`${src}#t=0.5`} preload="metadata" muted playsInline tabIndex={-1} />
          )}
          <div ref={ytRef} className="kb-tv-yt" />
          <i className="kb-tv-snow" />
          <i ref={offRef} className="kb-tv-off" />
          <i className="kb-tv-glass" />
        </div>
        <div className="kb-tv-panel">
          {/* 音量：回る絵のつまみと、その周りの目盛りの点。触れる範囲は見えない四角（.kb-tv-vol-hit）で見た目より広い */}
          <div
            className="kb-tv-vol"
            role="slider"
            tabIndex={0}
            aria-label="音量"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            data-turning={turning ? "" : undefined}
            style={{ "--vol": volume } as React.CSSProperties}
            onPointerDown={onKnobDown}
            onPointerMove={onKnobMove}
            onPointerUp={onKnobUp}
            onPointerCancel={onKnobUp}
            onLostPointerCapture={onKnobUp}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={onKnobKey}
          >
            <b className="kb-tv-vol-hit" aria-hidden />
            <span className="kb-tv-dots" aria-hidden>
              {DOT_POS.map((p, i) => (
                <i
                  key={i}
                  className={i < lit ? "is-on" : undefined}
                  style={{ "--sx": p.sx, "--sy": p.sy } as React.CSSProperties}
                />
              ))}
            </span>
            <span className="kb-tv-knob" aria-hidden>
              <i />
            </span>
          </div>
          <div className="kb-tv-ch">
            {site.tv.map((c, i) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={mode !== "idle" && mode !== "off" && channel === i}
                onClick={() => press(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {/* 電源：丸い押しボタンと、切れている間に灯る小さな赤いランプ */}
          <div className="kb-tv-pow">
            <b className="kb-tv-led" aria-hidden />
            <button type="button" aria-label="電源" onClick={power} />
          </div>
        </div>
      </div>
      <div className="kb-tv-stand" aria-hidden />
    </div>
  );
}
