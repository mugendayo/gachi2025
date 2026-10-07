// 入口＝教室の黒板1枚。時間割・日付・学級目標はサーバー描画の本物の文字（JSなしでも読める）。
// 光・時計・日付の書き換え・こする動作は BoardFx が上から足す（文字は canvas に写して質感を付ける）。
import { site } from "@/data/site";
import { todayScript } from "@/lib/worldClock";
import { UnlockCountdownBadge } from "@/components/UnlockTeaser";
import BoardFx from "./BoardFx";

/** 去年の学級目標＝黒板の消し残し（2027年には2026年の concept が自動でここに来る） */
const prevGoal = site.library.find((l) => l.year === site.year - 1)?.label ?? "";

export default function Classroom() {
  return (
    <section id="kb-classroom" className="kb-room" aria-label="教室">
      <h1 className="sr-only">{site.title}</h1>
      {/* 窓から差す光・蛍光灯 */}
      <div className="kb-sunlight" aria-hidden />
      <div className="kb-fluor" aria-hidden />

      <div className="kb-wall">
        <div className="kb-clock" aria-hidden>
          <i className="kb-hand kb-hand-h" />
          <i className="kb-hand kb-hand-m" />
          <i className="kb-hand kb-hand-s" />
        </div>
        <figure className="kb-goal">
          <figcaption>学級目標</figcaption>
          <p>{site.concept}</p>
        </figure>
        <div className="kb-exit" aria-hidden>
          非常口
        </div>
      </div>

      <div className="kb-board" id="kb-board">
        <p className="kb-date">
          {/* 今日の実際の日付（直後のスクリプトが書き込む。React は中身を照合しない） */}
          <span id="kb-today" className="kb-today" data-chalk="today" dangerouslySetInnerHTML={{ __html: "" }} suppressHydrationWarning />
          <script dangerouslySetInnerHTML={{ __html: todayScript }} />
          {site.days.map((d) => (
            <span key={d.key} className={`kb-date-text kb-on-${d.key}`} data-chalk="date">
              {d.date}
            </span>
          ))}
        </p>

        {site.days.map((day) => (
          <div key={day.key} className={`kb-day kb-on-${day.key}`}>
            <h2 className="kb-count">
              <span data-chalk="count">{day.countdown}</span>
            </h2>
            <ol className="kb-rows" style={{ ["--half" as string]: Math.ceil(day.items.length / 2) }}>
              {day.items.map((row, i) => (
                <li key={i} data-row={i} className={"smudged" in row && row.smudged ? "is-smudged" : undefined}>
                  <span className="kb-t">{row.time && <span data-chalk={"smudged" in row && row.smudged ? "smudge" : "row"}>{row.time}</span>}</span>
                  <span className="kb-l">{row.label && <span data-chalk="row">{row.label}</span>}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        {prevGoal && (
          <p className="kb-remnant" aria-hidden>
            <span data-chalk="remnant">{prevGoal}</span>
          </p>
        )}

        <div className="kb-tray" aria-hidden>
          <i className="kb-chalk kb-chalk-w" />
          <i className="kb-chalk kb-chalk-y" />
          <i className="kb-chalk kb-chalk-r" />
        </div>
        <i className="kb-eraser" aria-hidden />
      </div>

      <div className="kb-night" aria-hidden />
      {/* 解禁前：黒板は今日の日付のまま。解禁の時刻に、開いている全員の黒板で日付が書き換わる（光は時刻どおり） */}
      <div className="kb-sealed">
        <p>
          {site.unlockLabel}より、
          <wbr />
          この先が見れます！
        </p>
        <UnlockCountdownBadge />
      </div>
      <BoardFx />
    </section>
  );
}
