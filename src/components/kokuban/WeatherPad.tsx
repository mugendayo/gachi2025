"use client";
// 窓の近くのタブレット：下市町のいまの気温・天気・湿度（気象庁の公開データ）。
// 窓台に置いた端末。取りに行くのは窓に近づいてから（初回の読み込みでは取らない）。取れるまで・取れないときは画面が消えたまま。
// 取れた観測は窓の曇りの計算にも渡す（setObservation）。sessionStorage に10分ためて、見えている間は10分ごとに取り直す。
// 操作（タップ）は受けない。動きは無い（rAF を使わない）。
import { useEffect, useState } from "react";
import type { WeatherObs } from "@/lib/weather";
import { ARRIVE_EVENT, now } from "@/lib/now";
import { clockConfig, clockCore, debugAllowed } from "@/lib/worldClock";
import "./weatherPad.css";

const WORD: Record<WeatherObs["kind"], string> = { hare: "晴れ", kumori: "くもり", ame: "雨", yuki: "雪" };

/** 雲の形（雨・雪のときは上へずらして下に粒を描く） */
const CLOUD = "M6.5 17h11a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 7.3 8.6 4.25 4.25 0 0 0 6.5 17z";

function Icon({ kind, night }: { kind: WeatherObs["kind"]; night: boolean }) {
  if (kind === "hare" && night)
    return (
      <svg className="kb-ticon" viewBox="0 0 24 24" aria-hidden>
        <path d="M14.5 3.2a8.8 8.8 0 1 0 6.3 14.6A7.2 7.2 0 0 1 14.5 3.2z" fill="#f1efdc" />
      </svg>
    );
  if (kind === "hare")
    return (
      <svg className="kb-ticon" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4.6" fill="#ffe27a" />
        <g stroke="#ffe27a" strokeWidth="1.7" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="3" x2="12" y2="5.2" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      </svg>
    );
  return (
    <svg className="kb-ticon" viewBox="0 0 24 24" aria-hidden>
      <path d={CLOUD} fill="#e9eef3" transform={kind === "kumori" ? undefined : "translate(0 -3)"} />
      {kind === "ame" && (
        <g stroke="#9cc6ff" strokeWidth="1.5" strokeLinecap="round">
          <line x1="8.5" y1="17" x2="7.5" y2="20.5" />
          <line x1="12.5" y1="17" x2="11.5" y2="20.5" />
          <line x1="16.5" y1="17" x2="15.5" y2="20.5" />
        </g>
      )}
      {kind === "yuki" && (
        <g fill="#ffffff">
          <circle cx="8" cy="19" r="1.2" />
          <circle cx="12" cy="20.5" r="1.2" />
          <circle cx="16" cy="19" r="1.2" />
        </g>
      )}
    </svg>
  );
}

type Probe = {
  obs: () => WeatherObs | null;
  set: (o: Partial<WeatherObs>) => void;
  clear: () => void;
  refresh: () => void;
  climate: () => Promise<unknown>;
};

export default function WeatherPad() {
  const [obs, setObs] = useState<WeatherObs | null>(null);

  useEffect(() => {
    const sec = document.querySelector<HTMLElement>(".kb-window");
    if (!sec) return;
    let disposed = false;
    let mod: typeof import("@/lib/weather") | null = null;
    let lastFetch = -Infinity; // 最後に取りに行った時刻（Date.now）。失敗しても10分は取り直さない
    let busy = false;
    let inView = false;
    let timer = 0;
    let begun = false;

    const apply = (o: WeatherObs | null) => {
      if (disposed || !mod) return;
      mod.setObservation(o);
      setObs(o);
    };
    const refresh = () => {
      if (!mod || busy) return;
      busy = true;
      lastFetch = Date.now();
      mod
        .fetchWeather()
        .then((o) => {
          // 失敗したら前の値のまま
          if (o && mod) {
            mod.writeCache(o);
            apply(o);
          }
        })
        .finally(() => {
          busy = false;
        });
    };
    /** 見えていて、前に取ってから10分たっていれば取り直す */
    const check = () => {
      if (mod && inView && !document.hidden && Date.now() - lastFetch >= mod.REFRESH_MS) refresh();
    };

    const begin = () => {
      // 一度だけ（検分窓口の refresh から先に呼ばれても、見回りのタイマーを二重に作らない）
      if (begun) return;
      begun = true;
      import("@/lib/weather").then((m) => {
        if (disposed) return;
        mod = m;
        const c = m.readCache();
        if (c && Date.now() >= c.t) {
          // 10分以内に取った値はそのまま使う。それより古くても、3時間以内の観測なら取り直すまでの「前の値」として出す
          if (Date.now() - c.t < m.REFRESH_MS) lastFetch = c.t;
          if (Date.now() - c.o.at < 3 * 3600000) apply(c.o);
        }
        check();
        timer = window.setInterval(check, 60000);
      });
    };

    // 近づいたら読み込む（窓の殻 WindowFx と同じ見張り方）
    const near = new IntersectionObserver(
      (en) => {
        // 素早く出入りすると1回に複数届くので、いちばん新しいものを見る
        if (!en[en.length - 1].isIntersecting) return;
        near.disconnect();
        begin();
      },
      { rootMargin: "600px 0px" },
    );
    // 見えている間だけ取り直す
    const seen = new IntersectionObserver((en) => {
      inView = en[en.length - 1].isIntersecting;
      check();
    });
    seen.observe(sec);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);

    // 読み込んだ直後の最初の画面では取らない。窓が見えているか、一度スクロールしたか、門をくぐって教室に着いたあとから見張る
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      near.observe(sec);
    };
    const r = sec.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight) arm();
    else {
      window.addEventListener("scroll", arm, { passive: true });
      window.addEventListener(ARRIVE_EVENT, arm);
    }

    // 検分用（開発の時だけ）：window.__kbWeather
    const w = window as unknown as { __kbWeather?: Probe };
    if (debugAllowed())
      w.__kbWeather = {
        obs: () => mod?.getObservation() ?? null,
        set: (o) =>
          import("@/lib/weather").then((m) => {
            mod = m;
            apply({ at: now(), tempC: 15, rh: 60, precip10m: 0, kind: "hare", ...o });
          }),
        clear: () => apply(null),
        refresh: () => {
          lastFetch = -Infinity;
          if (mod) refresh();
          else begin();
        },
        climate: () =>
          import("@/lib/climate").then((c) => {
            const t = now();
            return c.climateAt(t, clockCore(t, clockConfig), clockConfig);
          }),
      };

    return () => {
      disposed = true;
      near.disconnect();
      seen.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      if (w.__kbWeather) delete w.__kbWeather;
    };
  }, []);

  // 夜かどうかは観測の時刻の太陽の高さで決める（?t= で時刻を動かしても、観測は本物の今のもの）
  const night = obs ? clockCore(obs.at, clockConfig).sunAlt < 0 : false;

  return (
    <div className="kb-wpad">
      <div className="kb-tab" data-kind={obs?.kind} data-night={night ? "" : undefined}>
        <div className="kb-tscreen">
          {obs && (
            <>
              <div className="kb-trow">
                <span className="kb-tplace">下市町</span>
                <span className="kb-tsrc">気象庁（五條）</span>
              </div>
              <div className="kb-tmain">
                <span className="kb-ttemp">{obs.tempC.toFixed(1)}°</span>
                <Icon kind={obs.kind} night={night} />
              </div>
              <div className="kb-tsub">
                <span>{WORD[obs.kind]}</span>
                <span>
                  湿度 <span className="kb-tnum">{Math.round(obs.rh)}%</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
