// 教室の後ろのテレビの再生（BackTv がボタンを押されたときに使う）。
// YouTube の IFrame Player API は、押したときに初めて読み込む（第一画面と通り過ぎに入れない）。
// 埋め込みは youtube-nocookie.com。音ありで再生し、端末の自動再生の制限で止められたらミュートで再生し直す
// （音量つまみを触ったら音を戻す）。

/** YouTube の再生状態（API の数値） */
const UNSTARTED = -1;
const PLAYING = 1;
const BUFFERING = 3;
/** API が来ないまま待ち続けない（広告ブロッカーなどで止められたとき） */
const API_TIMEOUT = 12000;

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  setVolume(v: number): void;
  getVolume(): number;
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

export type TvProbe = {
  videoId: string;
  ready: boolean;
  state: number;
  volume: number;
  muted: boolean;
  /** 自動再生の制限でミュートに落としたか（つまみを触るまで） */
  mutedByPolicy: boolean;
  iframeSrc: string;
};

export type TvPlayer = {
  /** この動画を再生する（同じ動画なら続きから） */
  play(id: string): void;
  /** 止める（砂嵐のチャンネルに変えたとき） */
  stop(): void;
  /** 画面から外れたら一時停止・戻ったら再開 */
  setVisible(v: boolean): void;
  setVolume(v: number): void;
  probe(): TvProbe;
  destroy(): void;
};

/**
 * host の中に埋め込みを作る（host 自体は React が持つ空の箱なので、中に子を足してそれを置き換えさせる）。
 * onFail＝読み込めない・再生できない動画のとき（呼ばれたら砂嵐に戻す）
 */
export function createTvPlayer(host: HTMLElement, opts: { volume: number; onFail: () => void }): TvPlayer {
  let player: YTPlayer | null = null;
  let ready = false;
  let gone = false;
  let creating = false;
  let current = ""; // 見たいチャンネルの動画
  let loaded = ""; // 埋め込みに読み込んである動画
  let want = false; // 押した人が再生を望んでいる（砂嵐・停止で false）
  let visible = true;
  let volume = opts.volume;
  let mutedByPolicy = false;
  let checkTimer = 0;
  let tries = 0;

  /**
   * つまみの値を埋め込みに渡す。0 はミュートにする（iOS は音量の数値を受け付けず、鳴る/鳴らないだけが効くため）。
   * 自動再生の制限でミュートにしたあとは、つまみを触るまで音を戻さない
   */
  const applyVolume = () => {
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

  /** 見たい動画を流す（読み込んである動画と違えば読み替える） */
  const start = () => {
    if (!player || !ready) return;
    if (current !== loaded) {
      loaded = current;
      player.loadVideoById(current);
    } else player.playVideo();
    check();
  };

  const create = (id: string) => {
    if (creating) return;
    creating = true;
    loaded = id;
    loadApi()
      .then((YT) => {
        if (gone) return;
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
              if (gone) return;
              ready = true;
              applyVolume();
              if (!want || !visible) return;
              // 読み込み中にチャンネルが変わっていたら、その動画へ
              start();
            },
            onAutoplayBlocked: () => fallbackMuted(),
            onError: () => {
              want = false;
              opts.onFail();
            },
          },
        });
        // API が作る iframe の allow には autoplay・encrypted-media が最初から入っている。操作は横のパネルだけにする
        try {
          const f = player.getIframe();
          f?.setAttribute("tabindex", "-1");
          f?.setAttribute("aria-hidden", "true");
        } catch {}
      })
      .catch(() => {
        creating = false;
        want = false;
        if (!gone) opts.onFail();
      });
  };

  return {
    play(id) {
      want = true;
      if (!player) {
        current = id;
        create(id);
        return;
      }
      current = id;
      if (ready && visible) start();
    },
    stop() {
      want = false;
      window.clearTimeout(checkTimer);
      if (player && ready) player.pauseVideo();
    },
    setVisible(v) {
      if (v === visible) return;
      visible = v;
      if (!player || !ready) return;
      if (!v) {
        window.clearTimeout(checkTimer);
        player.pauseVideo();
      } else if (want) start();
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(100, Math.round(v)));
      // つまみを触った＝音を戻してよい合図（0 のときはミュートのまま）
      mutedByPolicy = false;
      applyVolume();
    },
    probe() {
      let iframeSrc = "";
      try {
        iframeSrc = host.querySelector("iframe")?.src ?? "";
      } catch {}
      return {
        videoId: current,
        ready,
        state: player && ready ? player.getPlayerState() : -9,
        volume: player && ready ? player.getVolume() : volume,
        muted: player && ready ? player.isMuted() : false,
        mutedByPolicy,
        iframeSrc,
      };
    },
    destroy() {
      gone = true;
      want = false;
      window.clearTimeout(checkTimer);
      try {
        player?.destroy();
      } catch {}
      player = null;
      host.replaceChildren();
    },
  };
}
