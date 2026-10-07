// 黒板の下に続く校舎（スクロール＝空間）。1画面に1か所。
// 教室の後ろ → 廊下 → 職員室 → 体育館の舞台 → 学校の外（ゲームの箱の裏）。
import { site } from "@/data/site";
import { teachers, thumbOf } from "@/data/teachers";
import FloorItem from "@/components/FloorItem";
import { JoinButton } from "@/components/JoinGate";
import BackTv from "./BackTv";

/* ---------- 教室の後ろ：去年の記録が流れるテレビと、乗ってきたタイムマシン ---------- */
export function BackOfRoom() {
  return (
    <section className="kb-place kb-back" aria-label="教室の後ろ">
      <div className="kb-lockers" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <BackTv />
      <div className="kb-back-floor">
        <FloorItem id="armwash" size={96} tilt={-10} />
      </div>
    </section>
  );
}

/* ---------- 廊下：掲示板の業務連絡（Discord と同じ文面） ---------- */
export function Corridor() {
  const n = site.notice;
  return (
    <section className="kb-place kb-corridor" aria-label="廊下">
      <div className="kb-cork">
        <article className="kb-paper">
          <i className="kb-pin kb-pin-l" aria-hidden />
          <i className="kb-pin kb-pin-r" aria-hidden />
          <p className="kb-paper-tags">{n.tags.map((t) => `【${t}】`).join("")}</p>
          <h2 className="kb-paper-title">{n.title}</h2>
          <p className="kb-paper-meta">
            {n.to}
            <span>{n.from}</span>
          </p>
          <p className="kb-paper-lead">{n.lead}</p>
          <h3>■ 経緯</h3>
          <p>校内で次の報告が複数件ありました。</p>
          <ul className="kb-paper-reports">
            {n.reports.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="kb-paper-small">{n.reportsNote}</p>
          <h3>■ 遵守事項</h3>
          <ol className="kb-paper-rules">
            {n.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <h3>■ 補足</h3>
          <ul className="kb-paper-notes">
            {n.notes.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="kb-paper-closing">{n.closing}</p>
          <p className="kb-paper-struck">{n.struck}</p>
          <i className="kb-paper-redact" aria-hidden />
          <p className="kb-paper-end">以上です。</p>
        </article>
      </div>
    </section>
  );
}

/* ---------- 職員室：座席表（teachers.ts の1行＝1席。画像の無い先生はまだ座らない） ---------- */
export function Staffroom() {
  const seated = teachers.filter((t) => t.image);
  return (
    <section className="kb-place kb-staff" aria-label="職員室">
      <div className="kb-staff-board">
        <p className="kb-staff-sign">職員室</p>
        <ul className="kb-desks">
          {seated.map((t) => (
            <li key={t.id} className="kb-desk">
              <img src={thumbOf(t)} alt="" loading="lazy" decoding="async" />
              <p className="kb-desk-title">{t.title}</p>
              <p className="kb-desk-name">{t.name}</p>
              {t.reading && <p className="kb-desk-reading">{t.reading}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 体育館の舞台：超新星バッジ ---------- */
export function Stage() {
  return (
    <section className="kb-place kb-stage" aria-label="体育館の舞台">
      <div className="kb-curtain" aria-hidden />
      <div className="kb-stage-floor">
        <FloorItem id="badge" size={76} tilt={14} />
      </div>
    </section>
  );
}

/* ---------- 学校の外：THG のゲームの箱の裏（公式の事実・活字・ゲームを通らずに読める） ---------- */
export function PackageBox() {
  const d4 = site.days[site.days.length - 1];
  const facts: [string, string][] = [
    ["会期", site.dateLabel],
    ["本番", `${d4.date}`],
    ["会場", site.place],
    ["参加費", site.price],
    ["支払い", site.paymentLabel],
    ["申込", "Discord（下の「参加する」から）"],
    ["発売日", site.releaseDateLabel],
    ["打ち上げ", `${site.afterPartyLabel}（非公開）`],
  ];
  return (
    <section className="kb-place kb-outside" aria-label="学校の外">
      <article className="kb-box" aria-labelledby="kb-box-title">
        <header className="kb-box-head">
          <p className="kb-box-maker">ThanatosGames</p>
          <h2 id="kb-box-title">{site.title}</h2>
          <p className="kb-box-concept">{site.concept}</p>
        </header>

        <div className="kb-box-shots" aria-hidden>
          <img src="/hero-wide-poster.jpg" alt="" loading="lazy" decoding="async" />
          <img src="/hero-poster.jpg" alt="" loading="lazy" decoding="async" />
        </div>

        <dl className="kb-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <section className="kb-box-schedule" aria-label="特別時間割">
          <h3>特別時間割</h3>
          <div className="kb-box-days">
            {site.days.map((day) => (
              <div key={day.key} className="kb-box-day">
                <p className="kb-box-day-date">{day.date}</p>
                <ul>
                  {day.items
                    .filter((row) => !("smudged" in row && row.smudged))
                    .map((row, i) => (
                      <li key={i}>
                        <span>{row.time}</span>
                        {row.label}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <JoinButton className="kb-box-join">参加する</JoinButton>

        <footer className="kb-box-foot">
          <span className="kb-barcode" aria-hidden />
          <span>© ThanatosGames</span>
        </footer>
      </article>
    </section>
  );
}
