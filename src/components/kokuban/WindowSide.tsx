// 教室の窓（教室と教室の後ろの間）。JS が無くても枠と空は出る。
// 外の空は時刻の光（--sun・--warm）で色が変わる。夜に蛍光灯が点いていると窓は鏡になり、消灯すると外と本物の月が見える。
// 曇り・拭く・息は WindowFx が近づいてから読み込む（初回の重さに入れない）。文字は置かない。
import WindowFx from "./WindowFx";
import "./window.css";

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
        <i className="kb-wframe" />
      </div>
      <WindowFx />
    </section>
  );
}
