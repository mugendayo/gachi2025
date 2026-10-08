// 教室の後ろのテレビの再生（BackTv がボタンを押されたときに使う）。
// チャンネルに自前の動画（src）があれば <video> で流し、無ければ YouTube の埋め込みで流す。
// YouTube の IFrame Player API は、YouTube のチャンネルを押したときに初めて読み込む（第一画面と通り過ぎに入れない）。
// 埋め込みは youtube-nocookie.com。音ありで再生し、端末の自動再生の制限で止められたらミュートで再生し直す
// （音量つまみを触ったら音を戻す）。
// YouTube の規約で、埋め込みの上に物を重ねて隠すことはしない。代わりに、流れていない間は埋め込みを見せない：
//   押してから流れ始めるまでは見せない（BackTv は砂嵐）→ 流れ始めたら見せる（"live"）→
//   一時停止・終わり・電源オフ・別のチャンネルでは埋め込みごと外す（BackTv はテレビ側の静止画に戻す）。
//   画面から外れたときの一時停止だけは外さずに待ち、戻ったら続きから流す（その間も見せない）。

/** YouTube の再生状態（API の数値） */
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
/** API が来ないまま待ち続けない（広告ブロッカーなどで止められたとき） */
const API_TIMEOUT = 12000;

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string, startSeconds?: number): void;
  setVolume(v: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  getVideoUrl?(): string;
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

/** IFrame Player API の読み込み（1ページに1回）。失敗したら次に押したときにやり直す */
function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const s = document.createElement("script");
    let timer = 0;
    const fail = () => {
      window.clearTimeout(timer);
      apiPromise = null; // 次に押したときにやり直す
      s.remove();
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
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = fail;
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** 流すチャンネル（src があれば自前の動画、無ければ YouTube） */
export type TvSource = { youtubeId: string; src: string };

/** BackTv に知らせる画面の段階：loading＝押した〜流れ始める前（見せない）／live＝流れている（見せる）／stopped＝止まった（静止画へ） */
export type TvPhase = "loading" | "live" | "stopped";

export type TvProbe = {
  kind: "" | "yt" | "video";
  videoId: string;
  src: string;
  ready: boolean;
  live: boolean;
  state: number;
  volume: number;
  muted: boolean;
  /** 自動再生の制限でミュートに落としたか（つまみを触るまで） */
  mutedByPolicy: boolean;
  iframeSrc: string;
  hasIframe: boolean;
  hasVideo: boolean;
};

export type TvPlayer = {
  /** このチャンネルを流す（同じ動画なら続きから） */
  play(ch: TvSource): void;
  /** 止めて外す（砂嵐のチャンネル・電源オフ）。外したあとは何も知らせない */
  stop(): void;
  /** 画面から外れたら一時停止・戻ったら再開 */
  setVisible(v: boolean): void;
  setVolume(v: number): void;
  /** 検分用：外から一時停止されたときと同じことを起こす */
  debugPause(): void;
  probe(): TvProbe;
  destroy(): void;
};

/**
 * host の中に埋め込み・<video> を作る（host 自体は React が持つ空の箱なので、中に子を足してそれを外す）。
 * onPhase＝画面の段階が変わったとき／onFail＝読み込めない・再生できないとき（呼ばれたら砂嵐に戻す）
 */
export function createTvPlayer(
  host: HTMLElement,
  opts: { volume: number; onPhase: (p: TvPhase) => void; onFail: () => void },
): TvPlayer {
  let kind: "" | "yt" | "video" = "";
  let gone = false;
  let want = false; // 押した人が再生を望んでいる（砂嵐・停止・電源オフで false）
  let visible = true;
  let live = false; // いま流れていて、見せている
  let holding = false; // 画面から外れたので、こちらから一時停止している（外さずに待つ）
  let volume = opts.volume;
  let mutedByPolicy = false;
  /** 止めた所（動画ごと）。同じチャンネルをまた押したら続きから */
  const resumeAt = new Map<string, number>();

  const emit = (p: TvPhase) => {
    if (!gone) opts.onPhase(p);
  };

  /* ---------- YouTube ---------- */
  let player: YTPlayer | null = null;
  let slot: HTMLElement | null = null;
  let ready = false;
  let creating = false;
  let gen = 0; // 外すたびに進める（読み込み途中の古い埋め込みを作らない）
  let current = ""; // 見たいチャンネルの動画
  let loaded = ""; // 埋め込みに読み込んである動画
  let checkTimer = 0;
  let tries = 0;

  /**
   * つまみの値を埋め込みに渡す。0 はミュートにする（iOS は音量の数値を受け付けず、鳴る/鳴らないだけが効くため）。
   * 自動再生の制限でミュートにしたあとは、つまみを触るまで音を戻さない
   */
  const applyVolume = () => {
    if (kind === "video" && video) {
      video.volume = volume / 100;
      video.muted = volume === 0 || mutedByPolicy;
      return;
    }
    if (!player || !ready) return;
    player.setVolume(volume);
    if (volume === 0) player.mute();
    else if (!mutedByPolicy) player.unMute();
  };

  /** 自動再生の制限で止められたら、ミュートで再生し直す */
  const fallbackMuted = () => {
    if (!player || !ready || !want) return;
    mutedByPolicy = true;
    player.mute();
    player.playVideo();
  };

  /** 再生を頼んでから数百ms後に、本当に流れているかを確かめる（読み込み中なら少し待つ） */
  const check = () => {
    window.clearTimeout(checkTimer);
    tries = 0;
    const step = () => {
      if (!player || !ready || !want || !visible) return;
      const st = player.getPlayerState();
      if (st === PLAYING) return;
      // 読み込み中は少し待つ（始まる前の状態は短めに）
      if ((st === BUFFERING && ++tries < 8) || (st === UNSTARTED && ++tries < 3)) {
        checkTimer = window.setTimeout(step, 500);
        return;
      }
      if (!player.isMuted()) fallbackMuted();
    };
    checkTimer = window.setTimeout(step, 700);
  };

  /** 今の位置を覚える（外す前・別の動画へ移る前） */
  const rememberYt = () => {
    try {
      if (player && ready && loaded) resumeAt.set(loaded, player.getCurrentTime());
    } catch {}
  };

  /** 見たい動画を流す（読み込んである動画と違えば、覚えた所から読み替える） */
  const start = () => {
    if (!player || !ready) return;
    if (current !== loaded) {
      rememberYt();
      loaded = current;
      player.loadVideoById(current, Math.floor(resumeAt.get(current) ?? 0));
    } else player.playVideo();
    check();
  };

  /** YouTube の埋め込みを外す（iframe ごと消す） */
  const dropYt = () => {
    gen++;
    window.clearTimeout(checkTimer);
    rememberYt();
    try {
      player?.destroy();
    } catch {}
    player = null;
    ready = false;
    creating = false;
    loaded = "";
    slot?.remove();
    slot = null;
    host.querySelectorAll("iframe").forEach((f) => f.remove());
  };

  /** 外から止められた・終わった：埋め込みを外して、テレビ側の静止画に戻す */
  const ytStopped = (ended: boolean) => {
    want = false;
    live = false;
    holding = false;
    dropYt();
    // 終わった動画は、次に押したら最初から
    if (ended) resumeAt.delete(current);
    emit("stopped");
  };

  const onYtState = (st: number) => {
    if (st === PLAYING) {
      holding = false;
      if (!want) return;
      if (!live) {
        live = true;
        emit("live");
      }
      return;
    }
    // こちらが画面外で止めたとき以外の一時停止と、終わりは、埋め込みを外す（一時停止の画面や関連動画を見せない）
    if (st === ENDED && live) ytStopped(true);
    else if (st === PAUSED && live && !holding) ytStopped(false);
  };

  const create = (id: string) => {
    if (creating) return;
    creating = true;
    const g = gen;
    loaded = id;
    loadApi()
      .then((YT) => {
        if (gone || g !== gen || kind !== "yt") return;
        slot = document.createElement("div");
        host.appendChild(slot);
        const p = new YT.Player(slot, {
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
            start: Math.floor(resumeAt.get(id) ?? 0),
            origin: location.origin,
          },
          events: {
            onReady: () => {
              if (gone || g !== gen) return;
              ready = true;
              applyVolume();
              if (!want || !visible) return;
              // 読み込み中にチャンネルが変わっていたら、その動画へ
              start();
            },
            onStateChange: (e) => {
              if (!gone && g === gen) onYtState(e.data ?? UNSTARTED);
            },
            onAutoplayBlocked: () => {
              if (g === gen) fallbackMuted();
            },
            onError: () => {
              if (g !== gen) return;
              want = false;
              live = false;
              dropYt();
              opts.onFail();
            },
          },
        });
        player = p;
        // API が作る iframe の allow には autoplay・encrypted-media が最初から入っている。操作は横のパネルだけにする
        try {
          const f = p.getIframe();
          f?.setAttribute("tabindex", "-1");
          f?.setAttribute("aria-hidden", "true");
        } catch {}
      })
      .catch(() => {
        if (g !== gen) return;
        creating = false;
        want = false;
        if (!gone) opts.onFail();
      });
  };

  /* ---------- 自前の動画（<video>） ---------- */
  let video: HTMLVideoElement | null = null;
  let vsrc = "";

  const rememberVideo = () => {
    if (video && vsrc && !video.ended) resumeAt.set(vsrc, video.currentTime);
  };

  const dropVideo = () => {
    if (!video) return;
    rememberVideo();
    const v = video;
    video = null;
    vsrc = "";
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  };

  const ensureVideo = () => {
    if (video) return video;
    const v = document.createElement("video");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.disablePictureInPicture = true;
    v.setAttribute("tabindex", "-1");
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("playing", () => {
      if (video !== v) return;
      holding = false;
      if (want && !live) {
        live = true;
        emit("live");
      }
    });
    v.addEventListener("pause", () => {
      // 画面外でこちらが止めたとき・終わったとき（ended で扱う）以外は、外から止められた＝静止画へ
      if (video !== v || holding || v.ended || !live) return;
      want = false;
      live = false;
      rememberVideo();
      emit("stopped");
    });
    v.addEventListener("ended", () => {
      if (video !== v) return;
      resumeAt.delete(vsrc);
      want = false;
      live = false;
      emit("stopped");
    });
    v.addEventListener("error", () => {
      if (video !== v || !want) return;
      want = false;
      live = false;
      // 読めなかった <video> は外す（残すと、次に押しても同じ壊れた動画のまま砂嵐で止まる）
      dropVideo();
      kind = "";
      opts.onFail();
    });
    host.appendChild(v);
    video = v;
    return v;
  };

  /** 自前の動画を流す。音ありで弾かれたら、ミュートで流し直す */
  const startVideo = () => {
    const v = video;
    if (!v || !want || !visible) return;
    applyVolume();
    v.play().catch((err: unknown) => {
      if (video !== v || !want) return;
      if ((err as { name?: string })?.name !== "NotAllowedError") return;
      mutedByPolicy = true;
      v.muted = true;
      v.play().catch(() => {});
    });
  };

  /* ---------- 共通 ---------- */
  /** 止めて外す（何も知らせない） */
  const halt = () => {
    want = false;
    live = false;
    holding = false;
    dropYt();
    dropVideo();
    kind = "";
  };

  return {
    play(ch) {
      if (gone) return;
      if (ch.src) {
        if (kind === "yt") dropYt();
        kind = "video";
        // 同じ動画が流れているなら、そのまま見せ続ける
        if (video && vsrc === ch.src && !video.paused && live) {
          want = true;
          return;
        }
        want = true;
        live = false;
        emit("loading");
        const v = ensureVideo();
        if (vsrc !== ch.src) {
          rememberVideo();
          vsrc = ch.src;
          const t = Math.floor(resumeAt.get(ch.src) ?? 0);
          v.src = t > 0 ? `${ch.src}#t=${t}` : ch.src;
        }
        startVideo();
        return;
      }
      if (!ch.youtubeId) return;
      if (kind === "video") dropVideo();
      kind = "yt";
      if (player && ready && current === ch.youtubeId && live && player.getPlayerState() === PLAYING) {
        want = true;
        return;
      }
      want = true;
      live = false;
      current = ch.youtubeId;
      emit("loading");
      if (!player) {
        create(ch.youtubeId);
        return;
      }
      if (ready && visible) start();
    },
    stop() {
      halt();
    },
    setVisible(v) {
      if (v === visible) return;
      visible = v;
      if (kind === "video" && video) {
        if (!v) {
          if (!video.paused) {
            holding = true;
            video.pause();
          }
        } else if (want) startVideo();
        return;
      }
      if (!player || !ready) return;
      if (!v) {
        window.clearTimeout(checkTimer);
        if (want) {
          // 止めている間は見せない（戻って流れ始めたら、また見せる）
          holding = true;
          live = false;
          player.pauseVideo();
          emit("loading");
        }
      } else if (want) start();
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(100, Math.round(v)));
      // つまみを触った＝音を戻してよい合図（0 のときはミュートのまま）
      mutedByPolicy = false;
      applyVolume();
    },
    debugPause() {
      if (kind === "video") video?.pause();
      else if (player && ready) player.pauseVideo();
    },
    probe() {
      let iframeSrc = "";
      try {
        iframeSrc = host.querySelector("iframe")?.src ?? "";
      } catch {}
      const yt = kind === "yt" && !!player && ready;
      return {
        kind,
        videoId: kind === "yt" ? current : "",
        src: vsrc,
        ready: kind === "video" ? !!video : ready,
        live,
        state: yt ? player!.getPlayerState() : -9,
        volume: yt ? player!.getVolume() : volume,
        muted: yt ? player!.isMuted() : !!video?.muted,
        mutedByPolicy,
        iframeSrc,
        hasIframe: !!host.querySelector("iframe"),
        hasVideo: !!host.querySelector("video"),
      };
    },
    destroy() {
      halt();
      gone = true;
      host.replaceChildren();
    },
  };
}
