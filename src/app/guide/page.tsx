
// app/(mkt)/guide/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description: "はじめての方向けの参加ガイド。当日までの準備、1〜3日目の流れ、宿泊や食事などのQ&Aをまとめました。",
};

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#f7fafc]">
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
          <div className="rounded-2xl bg-white shadow-[0_14px_40px_rgba(0,0,0,.08)] ring-1 ring-black/5 overflow-hidden">
            <div className="bg-gradient-to-b from-sky-500 to-sky-600 text-white px-6 md:px-10 py-8">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow-sm">
                わかばガイド
              </h1>
              <p className="mt-2 text-white/90">
                初めてでもだいじょうぶ。3分で当日のイメージが掴めます。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/buy" prefetch={false} className="...">購入する</Link>
                <Link href="/projects" prefetch={false} className="...">過去企画を見る</Link>
              </div>
            </div>

            {/* セクション内ナビ（アンカー） */}
            <nav className="bg-white px-4 md:px-8 py-4 border-b border-gray-100" aria-label="わかばガイド内ナビ">
                <div className="flex flex-wrap gap-2">
                {[
                  { href: "#before", label: "当日まで" },
                  { href: "#day1", label: "1日目" },
                  { href: "#day2", label: "2日目" },
                  { href: "#day3", label: "3日目" },
                  { href: "#qa", label: "Q＆A" },
                ].map((x) => (
                  <a
                    key={x.href}
                    href={x.href}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {x.label}
                  </a>
                ))}
              </div>
            </nav>

            {/* 本文 */}
            <div className="bg-white px-5 md:px-10 py-8 space-y-10">
              {/* 当日まで */}
              <section id="before" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">当日まで</h2>
                <ol className="mt-4 space-y-3">
                  {[
                    "文化祭実行委員になろう",
                    "チケットを買って追加情報を手に入れよう",
                    "どんな企画があるのかを知って周りたい企画を決めよう",
                    "制服を準備して、放課後を満喫しよう",
                    "この3日間だけのクラスのメンバーと仲良くなろう",
                  ].map((t, i) => (
                    <li
                      key={t}
                      className="rounded-xl border border-gray-100 bg-[#fbfdff] p-4 ring-1 ring-black/5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">
                          {i + 1}
                        </span>
                        <p className="text-[15px] md:text-[16px] text-gray-800">{t}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* 必要な持ち物（先に明記） */}
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-bold text-amber-900">先に準備してほしいもの</h3>
                  <ul className="mt-2 list-disc pl-5 text-[15px] text-amber-900/90">
                    <li>体操服</li>
                    <li>制服</li>
                    <li>靴（体育用・移動用）</li>
                  </ul>
                  <p className="mt-2 text-[13px] text-amber-900/80">
                    ※ その他の詳細持ち物リストは後日あらためてご連絡します。
                  </p>
                </div>
              </section>

              {/* 1日目 */}
              <section id="day1" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">1日目</h2>
                <ul className="mt-4 space-y-3">
                  {[
                    "登校時間までに登校しよう",
                    "授業を受けよう",
                    "クラス企画ですることを決めよう",
                    "体育祭でクラスの団結を深めよう",
                  ].map((t) => (
                    <li
                      key={t}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-[15px] md:text-[16px] text-gray-800">{t}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 2日目 */}
              <section id="day2" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">2日目</h2>
                <ul className="mt-4 space-y-3">
                  {[
                    "1500m走大会をしよう",
                    "クラス企画も大詰め！みんなでひとつの企画をつくりきろう（買い出し、準備）",
                    "文化祭前夜を楽しもう",
                  ].map((t) => (
                    <li key={t} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-[15px] md:text-[16px] text-gray-800">{t}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 3日目 */}
              <section id="day3" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">3日目</h2>
                <ul className="mt-4 space-y-3">
                  {["ガチ文化祭を思いっきり楽しもう", "後夜祭まで楽しもう"].map((t) => (
                    <li key={t} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-[15px] md:text-[16px] text-gray-800">{t}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Q&A */}
              <section id="qa" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Q＆A</h2>
                <div className="mt-4 space-y-3">
                  {[
                    { q: "宿泊に関して", a: "宿泊は手配済みの会場を利用します。部屋割りや消灯時間などの詳細は後日ご案内します。" },
                    { q: "お風呂について", a: "男女別の時間帯でご利用いただけます。備品は基本揃っていますが、愛用のものがあればご持参ください。" },
                    { q: "食事について", a: "朝・昼・夜の食事を用意します。アレルギー等は事前アンケートで確認し、可能な範囲で対応します。" },
                    { q: "遅刻に関して", a: "安全のため、必ずスタッフに連絡してください。合流地点をお伝えします。" },
                    { q: "ひとりで参加しても楽しめるか", a: "クラス配属・班分け・企画づくりで自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。" },
                    { q: "持ち物について", a: "必須は「体操服・制服・靴」。そのほかは後日、公式から詳細をアナウンスします。" },
                    { q: "集団登校に関して", a: "主要駅からの集団登校ルートを用意予定です。集合場所・時間は事前にご案内します。" },
                  ].map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm transition"
                    >
                      <summary className="cursor-pointer list-none font-semibold text-gray-900">
                        <span className="inline-block align-middle">{item.q}</span>
                        <span className="ml-2 text-gray-400 group-open:rotate-90 transition inline-block">›</span>
                      </summary>
                      <div className="mt-2 text-[15px] text-gray-700 leading-relaxed">{item.a}</div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ページ末尾CTA */}
              <div className="pt-2">
                <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-pink-50 p-5 ring-1 ring-black/5">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[15px] md:text-[16px] font-semibold text-gray-800">
                      準備OKなら、今すぐチケットを購入しよう。
                    </p>
                    <div className="flex gap-3">
                      <Link
                        href="/buy"
                        className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[15px] font-bold text-white bg-gradient-to-b from-[#FF6A9E] to-[#FF4F90] ring-1 ring-black/10 shadow-[0_10px_26px_rgba(0,0,0,.25)] transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(0,0,0,.32)] active:scale-[0.995]"
                      >
                        購入する
                      </Link>
                      <Link
                        href="/projects"
                        className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[15px] font-bold text-sky-700 bg-white ring-1 ring-sky-200 hover:bg-sky-50 transition"
                      >
                        過去企画を見る
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>{/* /本文 */}
          </div>
        </div>
      </section>
    </main>
  );
}
