"use client";
// 教室の後ろのブラウン管。右の操作パネルのボタン（1・2・3）でチャンネル（site.tv）を変え、つまみで音量を変える。
// 帯ごとの既定の見た目：点いている（選ばれたチャンネルの静止画）＝昼・文化祭準備・消灯／電源オフ＝朝・超新星祭・夕方／砂嵐＝深夜・明け方。
// ボタンを押したら帯に関係なく点けて再生する（押した人の操作が優先）。動画のIDが空のチャンネルは砂嵐（音なし）。
// 最初は動画を読み込まない：静止画は近づいてから、再生の仕組み（tvPlayer と YouTube の API）は押してから読む。
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { debugAllowed } from "@/lib/worldClock";
import type { TvPlayer, TvProbe } from "./tvPlayer";

type Mode = "idle" | "play" | "snow";
const VOL_KEY = "kb-tv-vol";
const VOL_DEFAULT = 60;

const thumbOf = (id: string) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "");
const clampVol = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

let modPromise: Promise<typeof import("./tvPlayer")> | null = null;
const loadMod = () => (modPromise ??= import(/* webpackChunkName: "tvPlayer" */ "./tvPlayer"));

export default function BackTv() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ytRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<TvPlayer | null>(null);
  const visibleRef = useRef(false);
  const pressSeq = useRef(0);
  const [channel, setChannel] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [volume, setVolumeState] = useState(VOL_DEFAULT);
  const volRef = useRef(VOL_DEFAULT);
  const [near, setNear] = useState(false);
  const stateRef = useRef({ channel, mode, near });
  stateRef.current = { channel, mode, near };

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

  const ensureCtrl = useCallback(async () => {
    if (ctrlRef.current) return ctrlRef.current;
    const m = await loadMod();
    if (!ctrlRef.current && ytRef.current) {
      ctrlRef.current = m.createTvPlayer(ytRef.current, { volume: volRef.current, onFail: () => setMode("snow") });
      ctrlRef.current.setVisible(visibleRef.current);
    }
    return ctrlRef.current;
  }, []);

  /** チャンネルのボタン */
  const press = useCallback(
    (i: number) => {
      const ch = site.tv[i];
      if (!ch) return;
      const seq = ++pressSeq.current;
      setChannel(i);
      if (!ch.youtubeId) {
        setMode("snow");
        ctrlRef.current?.stop();
        return;
      }
      setMode("play");
      ensureCtrl()
        .then((c) => {
          // 読み込みを待つ間に別のボタン（砂嵐など）が押されていたら、古い方は流さない
          if (seq === pressSeq.current) c?.play(ch.youtubeId);
        })
        .catch(() => {
          if (seq === pressSeq.current) setMode("snow");
        });
    },
    [ensureCtrl],
  );

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

  // 検分用（手元と Preview だけ）：window.__kbTv.state() で今の状態、press(n)（1〜3）・volume(v) で操作
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbTv?: unknown };
    w.__kbTv = {
      state: () => {
        const s = stateRef.current;
        const ch = site.tv[s.channel];
        const p: Partial<TvProbe> = ctrlRef.current?.probe() ?? {};
        return {
          channel: s.channel + 1,
          key: ch?.key,
          youtubeId: ch?.youtubeId,
          mode: s.mode,
          near: s.near,
          knob: volRef.current,
          apiLoaded: !!document.querySelector('script[src="https://www.youtube.com/iframe_api"]'),
          ...p,
        };
      },
      press: (n: number) => press(n - 1),
      volume: (v: number) => changeVolume(v),
    };
    return () => {
      delete w.__kbTv;
    };
  }, [press, changeVolume]);

  const id = site.tv[channel]?.youtubeId ?? "";
  const thumb = near ? thumbOf(id) : "";

  return (
    <div ref={rootRef} className="kb-tv" data-tv={mode}>
      <div className="kb-tv-body">
        <div className="kb-tv-screen" aria-hidden>
          {thumb && (
            <>
              <img key={thumb} className="kb-tv-thumb" src={thumb} alt="" decoding="async" referrerPolicy="no-referrer" />
              <img key={`${thumb}-g`} className="kb-tv-thumb kb-tv-ghost" src={thumb} alt="" decoding="async" referrerPolicy="no-referrer" />
            </>
          )}
          <div ref={ytRef} className="kb-tv-yt" />
          <i className="kb-tv-snow" />
          <i className="kb-tv-off" />
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
                aria-pressed={mode !== "idle" && channel === i}
                onClick={() => press(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <b className="kb-tv-led" aria-hidden />
        </div>
      </div>
      <div className="kb-tv-stand" aria-hidden />
    </div>
  );
}
