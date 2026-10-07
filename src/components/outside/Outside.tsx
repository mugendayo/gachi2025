// 門の外＝現実の世界線。「いつでも高校生に戻れる社会をつくる」ために、いろんな場所で文化祭をつくっている、という文脈。
// 並び（2019 の LP と生徒手帳の順を下敷き）：理念 → きっかけ → 一生文化祭 → タイムスリップできる場所 → 企画とクラス →
// 過去を作り続ける（ポートフォリオ） → いろんな場所で（年表） → 今年（開催概要・参加する） → 主催。
// 文章はすべて本人の原文（年と出典の小札つき）か事実のデータ（src/data/outside.ts）。〔本人〕の枠は本番では出さない。
import { site } from "@/data/site";
import { basho, organizer, outsideSections, portfolio, portfolioCards, timeline, type OutsideBlock } from "@/data/outside";
import { PackageBox } from "@/components/kokuban/Places";
import "./outside.css";

function Block({ b }: { b: OutsideBlock }) {
  if (b.slot) {
    return (
      <p className="ou-slot" aria-hidden>
        〔本人〕{b.text}
      </p>
    );
  }
  if (b.big) return <p className="ou-big">{b.text}</p>;
  const body = <p className="ou-text">{b.text}</p>;
  return (
    <figure className="ou-quote">
      {b.fold ? (
        <details className="ou-fold">
          <summary>
            <span className="ou-fold-head">{b.text.split("\n").slice(0, 2).join("\n")}</span>
            <span className="ou-fold-more">続きを読む</span>
          </summary>
          <p className="ou-text">{b.text.split("\n").slice(2).join("\n")}</p>
        </details>
      ) : (
        body
      )}
      {b.stamp && <figcaption className="ou-stamp">{b.stamp}</figcaption>}
    </figure>
  );
}

export default function Outside() {
  return (
    <div className="ou" aria-label="ガチ文化祭について">
      {outsideSections.map((s, i) => (
        <section key={s.id} id={`ou-${s.id}`} className={`ou-sec ou-sec-${s.id}`}>
          <p className="ou-num" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </p>
          <h2 className="ou-h">{s.heading}</h2>
          {s.blocks.map((b, k) => (
            <Block key={k} b={b} />
          ))}
        </section>
      ))}

      {/* 過去を作り続ける（遺物の棚） */}
      <section id="ou-portfolio" className="ou-sec ou-sec-portfolio">
        <p className="ou-num" aria-hidden>
          {String(outsideSections.length + 1).padStart(2, "0")}
        </p>
        <h2 className="ou-h">{portfolio.heading}</h2>
        <figure className="ou-quote ou-sub">
          <p className="ou-text">{portfolio.sub}</p>
          <figcaption className="ou-stamp">{portfolio.subStamp}</figcaption>
        </figure>
        <div className="ou-shelf">
          {portfolioCards.map((c) => (
            <article key={c.year} className="ou-card">
              <p className="ou-card-year">{c.year}</p>
              {c.artifact && <p className="ou-card-artifact">{c.artifact}</p>}
              {c.lists?.map((l) => (
                <div key={l.label} className="ou-card-list">
                  <p className="ou-card-label">{l.label}</p>
                  <ul>
                    {l.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {c.videos && (
                <div className="ou-card-list">
                  <p className="ou-card-label">動画</p>
                  <ul>
                    {c.videos.map((v) => (
                      <li key={v.id}>
                        <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener">
                          {v.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {c.pending && (
                <p className="ou-slot ou-slot-small" aria-hidden>
                  〔本人確認〕{c.pending}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* いろんな場所で（年表＝実績一覧）。最後の行が今年で、そのまま下の開催概要につながる */}
      <section id="ou-basho" className="ou-sec ou-sec-basho">
        <p className="ou-num" aria-hidden>
          {String(outsideSections.length + 2).padStart(2, "0")}
        </p>
        <h2 className="ou-h">{basho.heading}</h2>
        {basho.blocks.map((b, k) => (
          <Block key={k} b={b} />
        ))}
        <ol className="ou-timeline">
          {timeline.map((r) => (
            <li key={r.year} className={r.off ? "is-off" : undefined}>
              <span className="ou-tl-year">{r.year}</span>
              <span className="ou-tl-title">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener">
                    {r.label}
                  </a>
                ) : (
                  r.label
                )}
              </span>
              <span className="ou-tl-date">{r.date}</span>
              <span className="ou-tl-place">{r.place}</span>
              {r.pending && (
                <span className="ou-slot ou-slot-small" aria-hidden>
                  〔本人確認〕{r.pending}
                </span>
              )}
            </li>
          ))}
          <li className="is-now">
            <span className="ou-tl-year">{site.year}</span>
            <span className="ou-tl-title">
              <a href="#ou-kotoshi">{site.concept}</a>
            </span>
            <span className="ou-tl-date">2026年10月31日〜11月3日</span>
            <span className="ou-tl-place">奈良県吉野郡下市町（{site.placeShort}）</span>
          </li>
        </ol>
        <p className="ou-slot" aria-hidden>
          〔本人〕{basho.regionSlot}
        </p>
      </section>

      {/* 今年の開催概要（公式の事実・参加する） */}
      <div id="ou-kotoshi">
        <PackageBox />
      </div>

      {/* 主催（屋号と責任の所在だけ） */}
      <section className="ou-colophon" aria-label="主催">
        <figure className="ou-quote ou-quote-small">
          <p className="ou-text">{organizer.words}</p>
          <figcaption className="ou-stamp">{organizer.wordsStamp}</figcaption>
        </figure>
        <dl>
          <div>
            <dt>主催</dt>
            <dd>
              {organizer.name}　{organizer.office}
            </dd>
          </div>
        </dl>
        <p className="ou-colophon-links">
          <a href="/tokusho">特定商取引法に基づく表記</a>
          <a href="/privacy">プライバシーポリシー</a>
        </p>
      </section>
    </div>
  );
}
