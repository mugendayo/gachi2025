"use client";
// 教室の後ろのブラウン管。右の操作パネルのボタン（1・2・3）でチャンネル（site.tv）を変え、つまみで音量を変え、丸いボタンで電源を入れ切りする。
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

  const changeVolume = useCallback((v: number) => {
    const nv = clampVol(v);
    volRef.current = nv;
    setVolumeState(nv);
    ctrlRef.current?.setVolume(nv);
    try {
      localStorage.setItem(VOL_KEY, String(nv));
    } catch {}
  }, []);

  // 音量つまみ：マウスは押したまま動かす（右・上で大きく）。指は横に動かし始めたときだけ拾い、縦はページのスクロールに任せる
  const drag = useRef<{ id: number; x: number; y: number; v: number; mouse: boolean; on: boolean } | null>(null);
  const onKnobDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const mouse = e.pointerType === "mouse";
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, v: volRef.current, mouse, on: mouse };
    if (mouse) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onKnobMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag.current = null;
        return;
      }
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    changeVolume(d.v + (d.mouse ? dx - dy : dx) * 0.6);
  };
  const onKnobUp = () => {
    drag.current = null;
  };
  const onKnobKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 }[e.key];
    if (step !== undefined) changeVolume(volRef.current + step);
    else if (e.key === "Home") changeVolume(0);
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
          <div
            className="kb-tv-knob"
            role="slider"
            tabIndex={0}
            aria-label="音量"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            style={{ "--vol": volume } as React.CSSProperties}
            onPointerDown={onKnobDown}
            onPointerMove={onKnobMove}
            onPointerUp={onKnobUp}
            onPointerCancel={onKnobUp}
            onKeyDown={onKnobKey}
          >
            <i />
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
