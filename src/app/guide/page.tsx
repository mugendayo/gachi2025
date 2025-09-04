// app/(mkt)/guide/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description:
    "はじめての方向けの参加ガイド。当日までの準備、1〜3日目の流れ、宿泊や食事などのQ&Aをまとめました。",
};

export default function GuidePage() {
  // ---------------- Data (本文) ----------------
  const beforeItems = [
    {
      title: "文化祭実行委員になってみよう",
      body:
        "ガチ文高校では、文化祭への“ガチ度”がそのまま成績評価となります。多くの生徒たちは、文化祭実行委員としてイベントを支え、盛り上げています。やってみたいことがある方、誰かの挑戦を応援したい方、少しだけ気になる方——どんな理由でも構いません。この3日間、あなたも実行委員の一員として、文化祭を一緒に創り上げてみませんか？",
    },
    {
      title: "チケットを購入して追加情報を手に入れよう",
      body:
        "チケットを購入すると、参加者限定のDiscordチャンネルにアクセスできるようになります。そこでは、今年の文化祭実行委員たちのやりとりや、企画の裏側、準備の進捗などを見ることができます。参加者同士の空気感や関係性も事前に感じ取れるので、当日がより楽しみになるはずです。",
    },
    {
      title: "どんな企画があるのかを知って、回りたい企画を決めよう",
      body:
        "ガチ文文化祭では、食べ物・体験・展示など、さまざまな個性豊かな企画が出店されます。チケット購入後には、その一覧を事前に確認することができます。「これは絶対行きたい」「こんな写真撮れそう」など、気になる企画をいくつかピックアップしておくと、当日の動きがスムーズになります。",
    },
    {
      title: "制服を準備して、放課後を満喫しよう",
      body:
        "ガチ文高校の制服は、「自分にとっての青春」を表すものです。実際に高校で着ていた制服でも、憧れていたデザインでも、好きなキャラクターのコーディネートでも構いません。「これが私の制服です」と自信を持って言えるものであれば、それが正式な制服となります。当日だけでなく、事前の放課後などにも制服で遊びに出かけてみてください。",
    },
    {
      title: "この3日間だけのクラスのメンバーと仲良くなろう",
      body:
        "ガチ文化祭では、3日間限定でクラス分けが行われます。Discordでのやりとりや、当日の登校を通して、クラスメートと自然に仲良くなることができます。名前を知らなかった誰かが、気づけば一緒に企画を進める仲間になっている——そんな出会いが待っています。",
    },
  ];

  const day1 = [
    {
      title: "登校時間までに登校しよう",
      body:
        "登校は朝8時30分まで。場所は奈良県「下市集学校」です。初めてで不安な方や、ひとり参加の方は、大阪・阿倍野HOOP前での集団登校にぜひご参加ください。",
    },
    {
      title: "授業を受けよう",
      body:
        "ガチ文高校では、文化祭直前でも授業があります。普段の学校のような5教科に加えて、文化祭に向けた特別授業も体験できます。この場所で、学ぶことの楽しさをもう一度味わってみましょう。",
    },
    {
      title: "クラス企画の内容を決めよう",
      body:
        "個人企画とは別に、各クラスごとにひとつの「クラス企画」をつくります。担任の先生とクラスメートで話し合い、どんな出し物にするかを決めていきます。みんなで何かを形にしていく、その最初の一歩がここです。",
    },
    {
      title: "体育祭でクラスの団結を深めよう",
      body:
        "ガチ文高校の体育祭は、仲間と心を通わせる絶好のチャンスです。普段は話さない人とも、走ったり笑ったりするうちに、自然と距離が近くなります。この文化祭の空気を、まずは身体を動かすところから感じてみましょう。",
    },
  ];

  const day2 = [
    {
      title: "1500m走大会に挑戦してみよう",
      body:
        "有志による特別企画「ガチ1500m走大会」が開催されます。隣を走る友達、過去の自分、あるいは“今の自分”に勝つための挑戦。全力で走ること、それ自体が、青春の証になる時間です。",
    },
    {
      title: "クラス企画を完成させよう",
      body:
        "装飾を整えたり、買い出しに行ったりと、クラス企画はこの日が大詰めです。仲良くなったクラスメートと、ひとつのものをつくり上げる喜びを感じられる時間。この過程こそが、ガチ文化祭ならではの価値かもしれません。",
    },
    {
      title: "文化祭前夜をゆっくり楽しもう",
      body:
        "夜には、文化祭の前夜を味わう特別な時間が用意されています。お酒を飲んだり、試作品を味見したり、ちょっとだけ非日常を感じる時間。照明の落ちた教室で語る未来や過去も、きっと記憶に残ります。",
    },
  ];

  const day3 = [
    {
      title: "ガチ文化祭を思いきり楽しもう",
      body:
        "当日は、全校をあげた文化祭の本番です。過去には「手作りハンバーガー」「ガチ二郎ラーメン」「プリキュア展」「謎解き」「エジプトカフェ」などが登場しました。きっと今年も、思いもよらない出し物や空間に出会えるはずです。事前にチェックしておいた企画をめぐりながら、自分だけの文化祭を満喫してください。",
    },
    {
      title: "後夜祭で3日間のフィナーレを迎えよう",
      body:
        "夜には、野外でステージイベント形式の「後夜祭」が行われます。歌やダンス、隠し芸、即興パフォーマンスなど、参加するのも、観るのも自由。「ここで何かをやってみたい」と思ったなら、それが一番のきっかけです。3日間の集大成として、思いきりステージに飛び込んでみてください。",
    },
  ];

  // -------------- Render --------------
  return (
    <main className="min-h-screen bg-[#f7fafc]">
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
          <div className="rounded-2xl bg-white shadow-[0_14px_40px_rgba(0,0,0,.08)] ring-1 ring-black/5 overflow-hidden">
            <div className="bg-gradient-to-b from-sky-500 to-sky-600 text-white px-6 md:px-10 py-8">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow-sm">
                はじめてのガチ文化祭ガイド
              </h1>
              <p className="mt-2 text-white/90">
                このページでは、ガチ文化祭を初めて体験する方に向けて、参加までの流れや当日の過ごし方、文化祭の楽しみ方をわかりやすくご紹介します。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/buy"
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-[12px] bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/40 backdrop-blur hover:bg-white/20"
                >
                  購入する
                </Link>
                <Link
                  href="/projects"
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-[12px] bg-white text-sky-700 px-4 py-2 text-sm font-bold ring-1 ring-sky-200 hover:bg-sky-50"
                >
                  過去企画を見る
                </Link>
              </div>
            </div>

            {/* セクション内ナビ（アンカー） */}
            <nav
              className="bg-white px-4 md:px-8 py-4 border-b border-gray-100"
              aria-label="わかばガイド内ナビ"
            >
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
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  当日まで
                </h2>

                <ol className="mt-4 space-y-3">
                  {beforeItems.map((item, i) => (
                    <li
                      key={item.title}
                      className="rounded-xl border border-gray-100 bg-[#fbfdff] p-4 ring-1 ring-black/5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-[15px] md:text-[16px] font-semibold text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
                            {item.body}
                          </p>
                        </div>
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
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  1日目：ガチ文高校、開校日
                </h2>
                <ul className="mt-4 space-y-3">
                  {day1.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-[15px] md:text-[16px] font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 2日目 */}
              <section id="day2" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  2日目：準備と本気が混ざり合う日
                </h2>
                <ul className="mt-4 space-y-3">
                  {day2.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-[15px] md:text-[16px] font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 3日目 */}
              <section id="day3" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  3日目：いよいよ本番、文化祭当日
                </h2>
                <ul className="mt-4 space-y-3">
                  {day3.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-[15px] md:text-[16px] font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Q&A（そのまま） */}
              <section id="qa" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  Q＆A
                </h2>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      q: "宿泊に関して",
                      a: "宿泊は手配済みの会場を利用します。部屋割りや消灯時間などの詳細は後日ご案内します。",
                    },
                    {
                      q: "お風呂について",
                      a: "男女別の時間帯でご利用いただけます。備品は基本揃っていますが、愛用のものがあればご持参ください。",
                    },
                    {
                      q: "食事について",
                      a: "朝・昼・夜の食事を用意します。アレルギー等は事前アンケートで確認し、可能な範囲で対応します。",
                    },
                    {
                      q: "遅刻に関して",
                      a: "安全のため、必ずスタッフに連絡してください。合流地点をお伝えします。",
                    },
                    {
                      q: "ひとりで参加しても楽しめるか",
                      a: "クラス配属・班分け・企画づくりで自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。",
                    },
                    {
                      q: "持ち物について",
                      a: "必須は「体操服・制服・靴」。そのほかは後日、公式から詳細をアナウンスします。",
                    },
                    {
                      q: "集団登校に関して",
                      a: "主要駅からの集団登校ルートを用意予定です。集合場所・時間は事前にご案内します。",
                    },
                  ].map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm transition"
                    >
                      <summary className="cursor-pointer list-none font-semibold text-gray-900">
                        <span className="inline-block align-middle">{item.q}</span>
                        <span className="ml-2 text-gray-400 group-open:rotate-90 transition inline-block">
                          ›
                        </span>
                      </summary>
                      <div className="mt-2 text-[15px] text-gray-700 leading-relaxed">
                        {item.a}
                      </div>
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
            </div>
            {/* /本文 */}
          </div>
        </div>
      </section>
    </main>
  );
}
