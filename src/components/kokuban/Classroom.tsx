// 教室の黒板。今日の日付・本番までの残り日数・全日程（10/31〜11/2）・最下段の「ガチ文化祭！」・落書きは、
// サーバー描画の本物の文字（JSなしでも読める）。光・時計・こする・チョークで書く・時間帯の仕掛けは BoardFx が上から足す。
import { site } from "@/data/site";
import { boardTextScript, buildTimeBoardText } from "@/lib/worldClock";
import BoardFx from "./BoardFx";
import { HandSymbol, SignFront } from "./Signboard";

/** チョーク（粉受けに置いてある色。拾うと黒板に書ける） */
const CHALKS = [
  { key: "w", color: "#f2f0e6", name: "白いチョーク" },
  { key: "y", color: "#f3df7a", name: "黄色いチョーク" },
  { key: "r", color: "#f2a7a0", name: "赤いチョーク" },
];

export default function Classroom() {
  const prepDays = site.days.slice(0, -1); // 10/31〜11/2（準備の3日）
  const finalDay = site.days[site.days.length - 1]; // 11/3（本番）
  const built = buildTimeBoardText();

  return (
    <section id="kb-classroom" className="kb-room" aria-label="教室">
      <h1 className="sr-only">{site.title}</h1>
      {/* 窓から差す光・蛍光灯 */}
      <div className="kb-sunlight" aria-hidden />
      <div className="kb-fluor" aria-hidden />

      <div className="kb-wall">
        {site.clock.face ? (
          // 時計の絵（site.clock に画像が入ったら、仮の時計と入れ替わる）
          <div className="kb-clock has-art" aria-hidden>
            <img className="kb-clock-art" src={site.clock.face} alt="" />
            {site.clock.hour && <img className="kb-clock-art kb-art-h" src={site.clock.hour} alt="" />}
            {site.clock.minute && <img className="kb-clock-art kb-art-m" src={site.clock.minute} alt="" />}
            {site.clock.second && <img className="kb-clock-art kb-art-s" src={site.clock.second} alt="" />}
          </div>
        ) : (
          <div className="kb-clock" aria-hidden>
            <i className="kb-hand kb-hand-h" />
            <i className="kb-hand kb-hand-m" />
            <i className="kb-hand kb-hand-s" />
          </div>
        )}
        {/* 掛け軸：教育方針（アドミッションポリシーと同じ四字熟語） */}
        <figure className="kb-scroll">
          <p>{site.motto}</p>
        </figure>
      </div>

      <div className="kb-board" id="kb-board">
        <div className="kb-head">
          {/* 本番までの実際の日数と今日の日付（直後のスクリプトが描画前に書き込む。React は中身を照合しない） */}
          <h2 className="kb-count">
            <span id="kb-count" data-chalk="count" dangerouslySetInnerHTML={{ __html: built.count }} suppressHydrationWarning />
          </h2>
          <p className="kb-date">
            <span id="kb-today" data-chalk="date" dangerouslySetInnerHTML={{ __html: built.today }} suppressHydrationWarning />
          </p>
          <script dangerouslySetInnerHTML={{ __html: boardTextScript }} />
        </div>

        <div className="kb-days">
          {prepDays.map((day) => (
            <section key={day.key} className="kb-dayblock" data-key={day.key} aria-label={day.date}>
              <h3 className="kb-dayhead">
                <span data-chalk="dayhead">{day.date}</span>
              </h3>
              <ol className="kb-rows">
                {day.items.map((row, i) => (
                  <li key={i} data-row={i} className={"smudged" in row && row.smudged ? "is-smudged" : undefined}>
                    <span className="kb-t">{row.time && <span data-chalk={"smudged" in row && row.smudged ? "smudge" : "row"}>{row.time}</span>}</span>
                    <span className="kb-l">{row.label && <span data-chalk="row">{row.label}</span>}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <p className="kb-finale" data-key={finalDay.key}>
          <span className="kb-finale-date" data-chalk="finale-date">
            {finalDay.date}
          </span>
          <span className="kb-finale-word" data-chalk="finale">
            {site.boardFinale}
          </span>
        </p>

        {/* 帯ごとの黒板の一行〔本人〕（空なら出さない。いまの帯の1本だけを CSS で見せる） */}
        {Object.entries(site.sceneCopy)
          .filter(([, c]) => c.board)
          .map(([k, c]) => (
            <p key={k} className={`kb-scene-line kb-scene-${k}`}>
              <span data-chalk="note">{c.board}</span>
            </p>
          ))}

        {/* 誰かの落書き（今年のコンセプト） */}
        <p className="kb-doodle">
          <span data-chalk="doodle" data-rot="-8">
            {site.concept}
          </span>
        </p>

        {/* 粉受け（チョークと黒板消し）。スマホでは黒板が画面にある間、画面の下に貼り付く。
            指・マウスで使う道具なので、キーボードと読み上げの対象からは外す（読み上げの正本は黒板の文字） */}
        <div className="kb-ledge">
          <div className="kb-tray">
            {CHALKS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`kb-chalk kb-chalk-${c.key}`}
                data-tool="chalk"
                data-color={c.color}
                aria-label={c.name}
                aria-hidden="true"
                tabIndex={-1}
              />
            ))}
          </div>
          <button type="button" className="kb-eraser" data-tool="eraser" aria-label="黒板消し" aria-hidden="true" tabIndex={-1} />
        </div>
      </div>

      {/* 準備中の看板（夜は黒板の下に表向き） */}
      <SignFront />
      <HandSymbol />

      <div className="kb-night" aria-hidden />
      <BoardFx />
    </section>
  );
}
