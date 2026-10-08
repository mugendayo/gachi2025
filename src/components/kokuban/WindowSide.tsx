// 教室の窓（教室と教室の後ろの間）。JS が無くても枠と空は出る。
// 外の空は時刻の光（--sun・--warm）で色が変わる。夜に蛍光灯が点いていると窓は鏡になり、消灯すると外と本物の月が見える。
// ガラスの外側には、夜の準備の時刻から青い手形が付いている（数は data-hands・置き場所は windowSim がその夜の日付で決める）。
// 曇り・拭く・息は WindowFx が近づいてから読み込む（初回の重さに入れない）。文字は窓台のタブレット（天気）だけ。
import WindowFx from "./WindowFx";
import WeatherPad from "./WeatherPad";
import "./window.css";

const HANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function WindowSide() {
  return (
    <section className="kb-place kb-window" aria-label="窓">
      <div className="kb-glass" aria-hidden>
        <div className="kb-wsky">
          <i className="kb-ridge" />
          <canvas className="kb-moon-cv" width="48" height="48" />
        </div>
        <div className="kb-wmirror">
          <i className="kb-wbar" />
          <i className="kb-wbar" />
          <i className="kb-tvglint" />
        </div>
        {/* ガラスの外側の手形（形は教室に1つだけある #kb-hand を使い回す）。曇りはこの手前に差し込まれる */}
        <div className="kb-whands">
          {HANDS.map((i) => (
            <svg key={i} className="kb-whp" viewBox="0 0 100 120">
              <use href="#kb-hand" />
            </svg>
          ))}
        </div>
        <i className="kb-wframe" />
      </div>
      <WeatherPad />
      <WindowFx />
    </section>
  );
}
