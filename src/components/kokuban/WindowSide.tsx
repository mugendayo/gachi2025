// 教室の窓（教室と教室の後ろの間）。JS が無くても枠と空は出る。
// 外の空は時刻の光（--sun・--warm）で色が変わる。夜に蛍光灯が点いていると窓は鏡になり、消灯すると外と本物の月が見える。
// ガラスの外側には、夜の準備の時刻から青い手形が付いている（数は data-hands・置き場所は windowSim がその夜の日付で決める）。
// 曇り・拭く・息は WindowFx が近づいてから読み込む（初回の重さに入れない）。文字は窓台のタブレット（天気）だけ。
// 窓の絵（site.assets.windowFrame）があるとき：.kb-glass は絵のガラスの範囲（4枚の外接）にぴったり置き、
// 枠の絵とタブレットはガラスの子として上に重ねる（寄せる＝ガラスの拡大に、枠と窓台のタブレットも一緒についてくる）。
// 絵が無いときは、今までどおり CSS の枠と窓台。
import type { CSSProperties } from "react";
import { site } from "@/data/site";
import WindowFx from "./WindowFx";
import WeatherPad from "./WeatherPad";
import "./window.css";

const HANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const FRAME = site.assets.windowFrame;

export default function WindowSide() {
  // 空・鏡・手形（曇りと拭いた跡の canvas は windowSim が手形のすぐ後ろに差し込む）
  const layers = (
    <>
      <div className="kb-wsky" aria-hidden>
        <i className="kb-ridge" />
        <canvas className="kb-moon-cv" width="48" height="48" />
      </div>
      <div className="kb-wmirror" aria-hidden>
        <i className="kb-wbar" />
        <i className="kb-wbar" />
        <i className="kb-tvglint" />
      </div>
      {/* ガラスの外側の手形（形は教室に1つだけある #kb-hand を使い回す）。曇りはこの手前に差し込まれる */}
      <div className="kb-whands" aria-hidden>
        {HANDS.map((i) => (
          <svg key={i} className="kb-whp" viewBox="0 0 100 120">
            <use href="#kb-hand" />
          </svg>
        ))}
      </div>
    </>
  );

  if (FRAME)
    return (
      <section className="kb-place kb-window has-art" aria-label="窓">
        <div className="kb-wbox">
          <div className="kb-glass">
            {layers}
            <i className="kb-wframe has-art" style={{ "--art": `url(${FRAME})` } as CSSProperties} aria-hidden />
            <WeatherPad />
          </div>
        </div>
        <WindowFx />
      </section>
    );

  return (
    <section className="kb-place kb-window" aria-label="窓">
      <div className="kb-glass">
        {layers}
        <i className="kb-wframe" aria-hidden />
      </div>
      <WeatherPad />
      <WindowFx />
    </section>
  );
}
