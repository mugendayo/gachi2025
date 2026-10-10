"use client";
// 窓の下に立てかけてあるスマホ。押すと縦の動画（playground.phoneMv）が流れる。
// 1回目に押す＝画面が点いて流れる（音はふつうの音量）。次に押す＝画面は点いたまま止まる。その次＝また流れる（交互）。
// 押す場所はスマホ全体（画面とふち）。埋め込み（YouTube の iframe）は操作を受けず、押されたらこちらから API で流す・止める。
// YouTube の扱いはテレビ（BackTv・tvPlayer）と同じ：youtube-nocookie／IFrame Player API は押したときに初めて読む／
//   埋め込みの上に物を重ねない（照りや汚れは画面の外のふちだけ。画面の上の指紋は、埋め込みを見せる前だけ）／
//   流れ始めるまで埋め込みは見せない（暗い画面のまま）／音ありが端末に止められたら消音で流し、次に押したとき音を戻す。
// 画面から外れたら一時停止（戻っても勝手に流さない）。テレビとは同時に鳴らさない（あとから押した方が流れ、もう片方は止まる）。
// src（自前の縦動画）があれば YouTube を使わず <video> で流す。静止画は近づいてから読む（最初の画面では読まない）。
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { playground, type PhoneMv as PhoneSource } from "@/data/playground";
import { ARRIVE_EVENT } from "@/lib/now";
import { debugAllowed } from "@/lib/worldClock";
import "./phoneMv.css";

/**
 * off＝消えた画面（近づいたら暗い静止画）／wake＝押した〜流れ始める前（暗い画面・埋め込みは見せない）／
 * play＝流れている／pause＝止まった画面（埋め込みは残して見せたまま）
 */
type Phase = "off" | "wake" | "play" | "pause";

const ART = playground.phoneArt;
const ART_STYLE = ART ? ({ "--art": `url(${ART})` } as CSSProperties) : undefined;

/** 動画を流し始めたことを、ほかの再生する物（テレビ）に知らせる。detail.who＝流し始めた物 */
export const MEDIA_PLAY_EVENT = "kb:media-play";

/** YouTube の再生状態（API の数値） */
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
/** API が来ないまま待ち続けない（広告ブロッカーなどで止められたとき） */
const API_TIMEOUT = 12000;
/** 押してから流れ始めないまま、これより待ったら消えた画面に戻す */
const WAKE_LIMIT = 20000;
const API_SRC = "https://www.youtube.com/iframe_api";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};
type YTEvent = { target: YTPlayer; data?: number };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: Record<string, (e: YTEvent) => void>;
    },
  ) => YTPlayer;
};
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YTNamespace> | null = null;

/** IFrame Player API の読み込み（tvPlayer の写し。テレビが先に読み始めていたら、同じ読み込みの終わりを待つ） */
function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const had = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    const s = had ?? document.createElement("script");
    let timer = 0;
    const fail = () => {
      window.clearTimeout(timer);
      apiPromise = null; // 次に押したときにやり直す
      if (!had) s.remove();
      reject(new Error("YT"));
    };
    timer = window.setTimeout(fail, API_TIMEOUT);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      if (w.YT?.Player) resolve(w.YT);
      else fail();
    };
    if (had) return;
    s.src = API_SRC;
    s.async = true;
    s.onerror = fail;
    document.head.appendChild(s);
  });
  return apiPromise;
}

const thumbOf = (id: string) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "");

/** 教室の後ろのテレビが流れていたら止める（テレビ側は「外から止められた」と受け取って静止画に戻る） */
function pauseTv() {
  const tv = document.querySelector<HTMLElement>(".kb-tv");
  const m = tv?.getAttribute("data-tv");
  if (!tv || (m !== "play" && m !== "live")) return;
  tv.querySelectorAll<HTMLVideoElement>(".kb-tv-yt video").forEach((v) => v.pause());
  tv.querySelectorAll<HTMLIFrameElement>(".kb-tv-yt iframe").forEach((f) => {
    try {
      f.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        new URL(f.src).origin,
      );
    } catch {}
  });
}

type Engine = {
  tap(): void;
  /** 流そうとしている（押してから流れ始めるまで・流れている間） */
  active(): boolean;
  /** 外から止める（画面から外れた・テレビが流れ始めた・検分） */
  pause(): void;
  setVisible(v: boolean): void;
  probe(): Record<string, unknown>;
  destroy(): void;
};

/** 再生の仕組み。host（React が持つ空の箱）の中に埋め込み・<video> を作る */
function createEngine(host: HTMLElement, getSource: () => PhoneSource, setPhase: (p: Phase) => void): Engine {
  let phase: Phase = "off";
  let kind: "" | "yt" | "video" = "";
  let gone = false;
  let want = false; // 押した人が流すことを望んでいる
  let shown = false; // 埋め込み・動画をいま見せている（流れ始めてから、終わる・外すまで）
  let visible = true;
  let mutedByPolicy = false;
  let unmuting = false; // 音を戻している途中（端末に止められても「止めた」と数えない）
  // 音を戻そうとして端末に断られた（iOS の埋め込みなど）。以後は押したら止める・流すの交互に戻す
  // （断られるたびに消音で流し直すと、押しても止められなくなるため）
  let unmuteRefused = false;
  let wakeTimer = 0;

  const go = (p: Phase) => {
    if (gone) return;
    phase = p;
    if (p === "wake") {
      window.clearTimeout(wakeTimer);
      wakeTimer = window.setTimeout(() => {
        if (phase === "wake") stopWanting();
      }, WAKE_LIMIT);
    }
    setPhase(p);
  };
  /** 流すのをやめた後の画面：見せていたなら止まった画面、まだなら消えた画面 */
  const stopWanting = () => {
    want = false;
    go(shown ? "pause" : "off");
  };

  /* ---------- YouTube ---------- */
  let player: YTPlayer | null = null;
  let ready = false;
  let creating = false;
  let gen = 0;
  let checkTimer = 0;
  let unmuteTimer = 0;

  /** 自動再生の制限で止められたら、消音で流し直す */
  const fallbackMuted = () => {
    if (!player || !ready || !want) return;
    mutedByPolicy = true;
    player.mute();
    player.playVideo();
  };
  /** 流すよう頼んでから少しあとに、本当に流れているかを確かめる（読み込み中なら少し待つ） */
  const check = () => {
    window.clearTimeout(checkTimer);
    let tries = 0;
    const step = () => {
      if (!player || !ready || !want || !visible) return;
      const st = player.getPlayerState();
      if (st === PLAYING) return;
      if ((st === BUFFERING && ++tries < 8) || (st === UNSTARTED && ++tries < 3)) {
        checkTimer = window.setTimeout(step, 500);
        return;
      }
      if (!player.isMuted()) fallbackMuted();
    };
    checkTimer = window.setTimeout(step, 700);
  };
  const ytPlay = () => {
    if (!player || !ready) return;
    if (!mutedByPolicy) player.unMute();
    player.playVideo();
    check();
  };
  /** 消音で流れているときに押された：音を戻す（端末に止められたら、また消音で流し続ける） */
  const ytUnmute = () => {
    if (!player || !ready) return;
    mutedByPolicy = false;
    unmuting = true;
    player.unMute();
    window.clearTimeout(unmuteTimer);
    unmuteTimer = window.setTimeout(() => {
      unmuting = false;
      if (!player || !ready || !want) return;
      if (player.getPlayerState() !== PLAYING) {
        unmuteRefused = true;
        fallbackMuted();
      }
    }, 800);
  };
  const dropYt = () => {
    gen++;
    window.clearTimeout(checkTimer);
    window.clearTimeout(unmuteTimer);
    try {
      player?.destroy();
    } catch {}
    player = null;
    ready = false;
    creating = false;
    host.replaceChildren();
  };
  const onYtState = (st: number) => {
    if (st === PLAYING) {
      if (!want) {
        // 流れ始める前に止められていた（画面外・テレビ）
        player?.pauseVideo();
        return;
      }
      shown = true;
      go("play");
    } else if (st === PAUSED) {
      // こちらが止めたとき（want は先に false）と、端末やほかの所から止められたとき
      if (unmuting && want) return;
      if (want && shown) stopWanting();
      else if (!want) go(shown ? "pause" : "off");
    } else if (st === ENDED) {
      // 終わったら画面を消す（終わりの画面は見せない）。次に押したら最初から
      want = false;
      shown = false;
      go("off");
    }
  };
  const fail = () => {
    want = false;
    shown = false;
    dropYt();
    dropVideo();
    kind = "";
    go("off");
  };
  const createYt = (id: string) => {
    if (creating) return;
    creating = true;
    const g = gen;
    loadApi()
      .then((YT) => {
        if (gone || g !== gen || kind !== "yt") return;
        const slot = document.createElement("div");
        host.appendChild(slot);
        player = new YT.Player(slot, {
          host: "https://www.youtube-nocookie.com",
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            origin: location.origin,
          },
          events: {
            onReady: () => {
              if (gone || g !== gen) return;
              ready = true;
              if (want && visible) ytPlay();
            },
            onStateChange: (e) => {
              if (!gone && g === gen) onYtState(e.data ?? UNSTARTED);
            },
            onAutoplayBlocked: () => {
              if (g === gen) fallbackMuted();
            },
            onError: () => {
              if (g === gen) fail();
            },
          },
        });
        try {
          const f = player.getIframe();
          f?.setAttribute("tabindex", "-1");
          f?.setAttribute("aria-hidden", "true");
        } catch {}
      })
      .catch(() => {
        if (g !== gen) return;
        creating = false;
        if (!gone) fail();
      });
  };

  /* ---------- 自前の動画（<video>） ---------- */
  let video: HTMLVideoElement | null = null;
  const dropVideo = () => {
    if (!video) return;
    const v = video;
    video = null;
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  };
  const ensureVideo = (src: string) => {
    if (video && video.dataset.src === src) return video;
    dropVideo();
    const v = document.createElement("video");
    v.dataset.src = src;
    v.src = src;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.disablePictureInPicture = true;
    v.setAttribute("tabindex", "-1");
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("playing", () => {
      if (video !== v) return;
      if (!want) {
        v.pause();
        return;
      }
      shown = true;
      go("play");
    });
    v.addEventListener("pause", () => {
      if (video !== v || v.ended) return;
      if (want && shown) stopWanting();
    });
    v.addEventListener("ended", () => {
      if (video !== v) return;
      want = false;
      shown = false;
      v.currentTime = 0;
      go("off");
    });
    v.addEventListener("error", () => {
      if (video === v) fail();
    });
    host.appendChild(v);
    video = v;
    return v;
  };
  const videoPlay = () => {
    const v = video;
    if (!v || !want || !visible) return;
    v.muted = mutedByPolicy;
    v.play().catch((err: unknown) => {
      if (video !== v || !want) return;
      if ((err as { name?: string })?.name !== "NotAllowedError") return;
      mutedByPolicy = true;
      v.muted = true;
      v.play().catch(() => {});
    });
  };

  /* ---------- 共通 ---------- */
  const pauseNow = () => {
    if (!want) return;
    want = false;
    window.clearTimeout(checkTimer);
    if (kind === "yt" && player && ready) player.pauseVideo();
    if (kind === "video" && video && !video.paused) video.pause();
    go(shown ? "pause" : "off");
  };

  const start = () => {
    const ch = getSource();
    const nextKind = ch.src ? "video" : ch.youtubeId ? "yt" : "";
    if (!nextKind) return;
    // 動画の出どころが変わった（検分で src を差し替えた）ら、前の埋め込みを外して作り直す
    if (kind && kind !== nextKind) {
      dropYt();
      dropVideo();
      shown = false;
    }
    kind = nextKind;
    want = true;
    window.dispatchEvent(new CustomEvent(MEDIA_PLAY_EVENT, { detail: { who: "phone" } }));
    pauseTv();
    if (!shown) go("wake");
    if (kind === "video") {
      ensureVideo(ch.src);
      videoPlay();
      return;
    }
    if (!player) createYt(ch.youtubeId);
    else if (ready) ytPlay();
  };

  return {
    tap() {
      if (gone) return;
      if (phase === "wake") return; // 流れ始めるのを待っている間は受けない（止まって見えるのを避ける）
      if (phase === "play") {
        // 消音で流れている（端末の制限）なら、止めずに音を戻す（一度断られたら、もう試さずに止める）
        if (mutedByPolicy && kind === "yt" && !unmuteRefused) ytUnmute();
        else if (mutedByPolicy && kind === "video" && video) {
          mutedByPolicy = false;
          video.muted = false;
        } else pauseNow();
        return;
      }
      start();
    },
    active() {
      return want;
    },
    pause() {
      pauseNow();
    },
    setVisible(v) {
      visible = v;
      // 画面から外れたら止める。戻っても勝手に流さない
      if (!v) pauseNow();
    },
    probe() {
      const f = host.querySelector("iframe");
      const yt = kind === "yt" && !!player && ready;
      return {
        phase,
        kind,
        want,
        shown,
        ready: kind === "video" ? !!video : ready,
        state: yt ? player!.getPlayerState() : kind === "video" && video ? (video.paused ? PAUSED : PLAYING) : -9,
        muted: yt ? player!.isMuted() : !!video?.muted,
        mutedByPolicy,
        unmuteRefused,
        hasIframe: !!f,
        iframeSrc: f?.src ?? "",
        hasVideo: !!host.querySelector("video"),
        /** 埋め込み・動画が見えているか（流れ始める前は見せない） */
        screenShown: getComputedStyle(host).opacity !== "0",
      };
    },
    destroy() {
      want = false;
      dropYt();
      dropVideo();
      window.clearTimeout(wakeTimer);
      gone = true;
    },
  };
}

/** children＝スマホの右に一緒に立てかける物（窓の下の帯の最後の子。いまは「ガチ文のきほん」の冊子） */
export default function PhoneMv({ children }: { children?: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [phase, setPhase] = useState<Phase>("off");
  const [near, setNear] = useState(false);
  // 検分用：src を差し替える（本人が動画ファイルを置く前に試す）。null＝playground.ts のまま
  const [srcOver, setSrcOver] = useState<string | null>(null);
  const srcRef = useRef<string | null>(null);
  srcRef.current = srcOver;

  const getSource = useCallback(
    (): PhoneSource => ({ youtubeId: playground.phoneMv.youtubeId, src: srcRef.current ?? playground.phoneMv.src }),
    [],
  );
  const engine = useCallback(() => {
    if (!engineRef.current && hostRef.current) engineRef.current = createEngine(hostRef.current, getSource, setPhase);
    return engineRef.current;
  }, [getSource]);

  // 近づいたら静止画を読む（読み込んだ直後の最初の画面では読まない＝窓の WindowFx と同じ見張り方）／画面から外れたら止める
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ioNear = new IntersectionObserver(
      (en) => {
        if (!en[en.length - 1].isIntersecting) return;
        setNear(true);
        ioNear.disconnect();
      },
      { rootMargin: "200px 0px" },
    );
    const ioSeen = new IntersectionObserver((en) => {
      engineRef.current?.setVisible(en[en.length - 1].isIntersecting);
    });
    ioSeen.observe(el);
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      ioNear.observe(el);
    };
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight) arm();
    else {
      window.addEventListener("scroll", arm, { passive: true });
      window.addEventListener(ARRIVE_EVENT, arm);
    }
    return () => {
      ioNear.disconnect();
      ioSeen.disconnect();
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // テレビとは同時に鳴らさない：あとから押した方が流れる。
  // テレビのボタンが押された（data-tv が play になった）らスマホを止める。テレビが流れ始めた（live）とき、
  // スマホの方があとに押されていたらテレビを止め直す（テレビが読み込み中で一度目の「止めて」が届かなかったとき）
  const tappedAt = useRef(0);
  useEffect(() => {
    let tvPressedAt = 0;
    let mo: MutationObserver | null = null;
    let last = "";
    const watch = () => {
      if (mo) return true;
      const tv = document.querySelector<HTMLElement>(".kb-tv");
      if (!tv) return false;
      last = tv.getAttribute("data-tv") ?? "";
      mo = new MutationObserver(() => {
        const m = tv.getAttribute("data-tv") ?? "";
        if (m === last) return;
        last = m;
        if (m === "play") {
          // テレビが画面の外にあるときの play は、テレビが自分で一時停止して待っている印（押されたのではない）
          const r = tv.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= window.innerHeight) return;
          tvPressedAt = performance.now();
          engineRef.current?.pause();
        } else if (m === "live") {
          // スマホが流れようとしていて、しかもあとから押されていたらテレビを止め直す。
          // スマホが止まっているなら（画面から外れて止めた等）、戻ってきたテレビはそのまま流す
          const e = engineRef.current;
          if (e?.active() && tappedAt.current > tvPressedAt) pauseTv();
          else e?.pause();
        }
      });
      mo.observe(tv, { attributes: true, attributeFilter: ["data-tv"] });
      return true;
    };
    // テレビがまだ無ければ、どこかが押されたときにもう一度探す
    const retry = () => {
      if (watch()) window.removeEventListener("pointerdown", retry, true);
    };
    if (!watch()) window.addEventListener("pointerdown", retry, true);
    // ほかの再生する物が「流し始めた」と知らせてきたら止める（テレビが知らせるようになったとき用）
    const onOther = (e: Event) => {
      if ((e as CustomEvent<{ who?: string }>).detail?.who !== "phone") engineRef.current?.pause();
    };
    window.addEventListener(MEDIA_PLAY_EVENT, onOther);
    return () => {
      mo?.disconnect();
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener(MEDIA_PLAY_EVENT, onOther);
    };
  }, []);

  const tap = useCallback(() => {
    tappedAt.current = performance.now();
    engine()?.tap();
  }, [engine]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!e.repeat) tap();
  };

  // 検分用（手元と Preview だけ）：window.__kbPhone.state() で今の状態、tap() で押す、pause() で外から止める、
  // useSrc(url) で自前の動画に差し替え（null で playground.ts のまま）
  useEffect(() => {
    if (!debugAllowed()) return;
    const w = window as unknown as { __kbPhone?: unknown };
    w.__kbPhone = {
      state: () => ({
        near: rootRef.current?.dataset.near === "",
        apiLoaded: !!document.querySelector(`script[src="${API_SRC}"]`),
        tv: document.querySelector(".kb-tv")?.getAttribute("data-tv") ?? null,
        ...(engineRef.current?.probe() ?? { phase: "off", kind: "", hasIframe: false }),
      }),
      tap: () => tap(),
      pause: () => engineRef.current?.pause(),
      useSrc: (url: string | null) => {
        engineRef.current?.pause();
        srcRef.current = url;
        setSrcOver(url);
      },
    };
    return () => {
      delete w.__kbPhone;
    };
  }, [tap]);

  const src = srcOver ?? playground.phoneMv.src;
  const thumb = near && !src ? thumbOf(playground.phoneMv.youtubeId) : "";

  return (
    <div ref={rootRef} className="kb-pmv" data-near={near ? "" : undefined}>
      <div
        className={`kb-phone${ART ? " has-art" : ""}`}
        style={ART_STYLE}
        data-pmv={phase}
        data-pmv-kind={src ? "video" : "yt"}
        role="button"
        tabIndex={0}
        aria-label="スマホ"
        aria-pressed={phase === "play"}
        onClick={tap}
        onKeyDown={onKey}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="kb-phone-ear" aria-hidden />
        <span className="kb-phone-screen" aria-hidden>
          {thumb && <img className="kb-phone-thumb" src={thumb} alt="" decoding="async" referrerPolicy="no-referrer" />}
          {near && src && <video key={src} className="kb-phone-thumb" src={`${src}#t=0.5`} preload="metadata" muted playsInline tabIndex={-1} />}
          <span ref={hostRef} className="kb-phone-yt" />
          <i className="kb-phone-smudge" />
        </span>
        <span className="kb-phone-home" aria-hidden />
        {/* 下の差し込み口から床へ垂れた充電の線。先はどこにも挿さっていない（抜けたまま床に転がっている） */}
        <svg className="kb-phone-cable" viewBox="0 0 120 40" aria-hidden>
          <path d="M8 0 C 8 16, 22 27, 44 25 S 82 28, 96 28" />
          <rect className="kb-phone-plug" x="95" y="25.4" width="11" height="5.2" rx="1.3" />
          <rect className="kb-phone-plugtip" x="105.6" y="26.3" width="5.4" height="3.4" rx="0.4" />
        </svg>
      </div>
      {children}
    </div>
  );
}
