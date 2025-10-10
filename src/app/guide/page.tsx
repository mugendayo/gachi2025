// app/(mkt)/guide/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

/* ----------------- Meta ----------------- */
export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description:
    "はじめての方向けの参加ガイド。3日間の流れ・準備・体育祭・当日・後夜祭まで、写真×プルダウンで楽しくサッと読めます。",
};

/* ----------------- 基本UI ----------------- */
type Tone = "sky" | "blue" | "emerald" | "amber" | "violet" | "pink";
const TONE_BG: Record<Tone, string> = {
  sky: "from-sky-100/80 to-sky-50/60",
  blue: "from-blue-100/80 to-blue-50/60",
  emerald: "from-emerald-100/80 to-emerald-50/60",
  amber: "from-amber-100/80 to-amber-50/60",
  violet: "from-violet-100/80 to-violet-50/60",
  pink: "from-pink-100/80 to-pink-50/60",
};
const CARD_BEIGE =
  "bg-[#fff6ef] ring-1 ring-black/5 shadow-[0_8px_24px_rgba(0,0,0,.06)]";

/* クリックで開閉できる“知識カード”（プルダウン） */
function AccordionCard({
  icon,
  title,
  body,
  defaultOpen = false,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={`group rounded-2xl ${CARD_BEIGE} backdrop-blur open:shadow-[0_12px_28px_rgba(0,0,0,.10)] transition-shadow`}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="list-none cursor-pointer p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-slate-900 text-white text-lg shrink-0">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-slate-900 text-[15px] md:text-[16px] truncate">
                {title}
              </p>
              <span
                aria-hidden
                className="mt-1 inline-block text-slate-400 transition-transform duration-300 group-open:rotate-90"
              >
                ›
              </span>
            </div>
            <div className="mt-1 text-[13px] md:text-[14px] text-slate-600 line-clamp-1 group-open:line-clamp-none group-open:hidden">
              タップして開く
            </div>
          </div>
        </div>
      </summary>

      <div className="px-4 pb-4 md:px-5 md:pb-5 -mt-3">
        <div className="text-[14px] md:text-[15px] leading-relaxed text-slate-700 animate-[fadeIn_.24s_ease-out]">
          {body}
        </div>
      </div>
    </details>
  );
}

/* セクションの共通シェル（背景＝水色、内側＝肌色、上に写真） */
function SectionBlock({
  id,
  tone = "sky",
  title,
  lead,
  imageSrc,
  children,
}: {
  id: string;
  tone?: Tone;
  title: string;
  lead?: string;
  imageSrc?: string; // /public 配下想定
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div
        className={`relative rounded-[28px] p-0 ring-1 ring-black/5 overflow-hidden bg-gradient-to-b ${TONE_BG[tone]}`}
      >
        {/* 上部写真（任天堂の見出しブロック風） */}
        {imageSrc && (
          <div className="relative">
            {/* 画像を /public/guide/... に入れてください */}
            <img
              src={imageSrc}
              alt=""
              className="block w-full h-auto object-cover"
              decoding="async"
            />
            {/* セクション見出し */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8">
              <h2 className="inline-block rounded-md px-3 py-1 text-white text-xl md:text-2xl font-extrabold bg-black/30 backdrop-blur">
                {title}
              </h2>
              {lead && (
                <p className="mt-3 max-w-3xl text-sm md:text-base text-white drop-shadow">
                  {lead}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 中身（肌色カードのグリッド） */}
        <div className="relative z-10 p-5 sm:p-6 md:p-8">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ----------------- コンテンツ（テキスト） ----------------- */
const mustItems = ["体操服", "制服", "運動靴"];

/* 1 最も意識すること（背景枠青） */
const mostImportant = [
  {
    icon: "💙",
    title: "“全員で作る”を楽しもう",
    body:
      "文化祭は参加者みんなの手で完成します。見る側も出す側も同じクラスメイト。『任せる』より『一緒にやる』が合言葉です。",
  },
  {
    icon: "📷",
    title: "写真より“体験”を優先",
    body:
      "映える瞬間はたくさんありますが、まずは体験を。手を動かす・声を出す・走る——身体でのめり込むほど面白くなります。",
  },
];

/* 2 準備（Discordや学籍） */
const prep = [
  {
    icon: "🎓",
    title: "生徒になる（学籍）",
    body:
      "定期テスト提出や制服の投稿で学籍番号を付与。学籍がついた生徒から実行委員限定Discordへ。準備の裏側や企画の進捗が見られて、当日がもっと楽しみに。",
  },
  {
    icon: "💬",
    title: "Discordってなに？",
    body: (
      <>
        企画連絡やオンラインHRに使う<strong>コミュニティアプリ</strong>です。招待リンクから参加し、クラスごとのチャンネルで交流します。
        <img
          src="/guide/discord-sample.png"
          alt="Discordの画面イメージ"
          className="mt-2 rounded-lg ring-1 ring-black/10 w-full h-auto"
          loading="lazy"
        />
      </>
    ),
  },
];

/* 3 持ち物 */
const belongings = [
  {
    icon: "🧳",
    title: "まずはこの3つ",
    body: (
      <>
        〈{mustItems.join("・")}〉は最優先。その他の持ち物リストは、参加確定後にメールとDiscordで順次ご案内（直前に最新版を再掲）。
      </>
    ),
  },
  {
    icon: "🧼",
    title: "風呂セット",
    body:
      "近隣温泉を利用します。タオル・石けん・シャンプーなどのアメニティは各自で。入浴料500円＋往復バス540円（予定）。",
  },
];

/* 4 購買部 */
const store = [
  {
    icon: "🛒",
    title: "購買部で買えるもの",
    body: (
      <>
        手作りバーガー／焼きそば／ドリンク／おやつなど。<br />
        <strong>1日目〜3日目の軽食はここでOK</strong>。一部は数量限定です。
      </>
    ),
  },
  {
    icon: "🍱",
    title: "無料＆お得メニュー",
    body:
      "購買部の食事は1日1食は無料、以降100円のメニューも用意（予定）。財布にやさしく、活動に集中できます。",
  },
];

/* 5 体育祭・1500m */
const athletics = [
  {
    icon: "🏅",
    title: "クラス対抗で本気の体育祭",
    body:
      "走る人も応援する人も主役。大きな声援と拍手で、距離が一気に縮まります。全力で応援しよう！",
  },
  {
    icon: "🏃",
    title: "ガチ1500m走",
    body:
      "有志レース。隣の友達や過去の自分と勝負。順位より“やり切った自分”がご褒美です。",
  },
];

/* 6 授業 */
const lessons = [
  {
    icon: "📘",
    title: "通常授業＋特別授業",
    body:
      "先生ごとに“こだわり”が違うのが醍醐味。学ぶ楽しさをもう一度。ここから文化祭モードにスイッチ。",
  },
];

/* 7 ログアウトパビリオン（新規） */
const logoutPavilion = [
  {
    icon: "📵",
    title: "“いまこの瞬間”にログイン",
    body:
      "スマホを置いて、アナログな遊びへ。紙・段ボール・ペンで、ゼロから企画を作るブース。デジタル断ちの心地よさを体験。",
  },
  {
    icon: "🧠",
    title: "集中と対話の場",
    body:
      "静かな作業机、アイデア付箋、ゆるいお題。ひとりでも、誰かとも。気づけば“没頭”が起きています。",
  },
];

/* 8 登校（集合/到着） */
const goToSchool = [
  {
    icon: "🚶",
    title: "集合（集団登校）",
    body: (
      <>
        <strong>大阪・あべのHoop前 → 近鉄阿倍野橋駅</strong>へ移動して乗車。集合は<strong>5:20</strong>（本当に来るの？→
        <strong>来ます。スタッフが立っています</strong>）。個別に現地合流でもOK。
      </>
    ),
  },
  {
    icon: "🏫",
    title: "到着〜朝の流れ",
    body: (
      <>
        会場には<strong>8:00まで</strong>に登校。到着したら<strong>クラス確認→教室へ</strong>。
      </>
    ),
  },
];

/* 9 遅刻 */
const late = [
  {
    icon: "⏰",
    title: "遅刻しても大丈夫？",
    body:
      "はい。<strong>事前申請があれば遅刻入場OK</strong>。着いたら職員室へ。合流手順をスタッフがサポートします。",
  },
];

/* 10 文化祭当日 */
const festivalDay = [
  {
    icon: "🎪",
    title: "企画を巡ろう",
    body:
      "手作りハンバーガー、ガチ二郎、プリキュア展、謎解き、エジプトカフェ…サプライズだらけ。気になる企画を巡りながら、友だちが頑張っている企画も全力で楽しもう。",
  },
];

/* 11 後夜祭 */
const afterParty = [
  {
    icon: "🎤",
    title: "フィナーレは“ガチ”の舞台",
    body:
      "野外ステージで歌・ダンス・隠し芸・即興。観客も出演者も本気。照明に照らされる鼓動、歓声、拍手——客席からも舞台袖からも、熱量が全身を駆け抜けます。",
  },
];

/* Q&A */
const qa = [
  { q: "一人で参加しても楽しめますか？", a: "クラス配属・企画づくり・体育祭で自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。" },
  { q: "宿泊はどこでするのですか？", a: "男女別で廃校の教室を寝室として用意。全員分の布団あり。安心して休めます。" },
  { q: "お風呂はどうなっていますか？", a: "基本的に全員入浴。クラス単位で近隣温泉へ。入浴料500円、往復バス540円（予定）。アメニティは各自持参。" },
  { q: "食事はどうすればいいですか？", a: "基本は校内の購買部で購入できます。1日1食無料、その後は100円のメニューも用意（予定）。" },
  { q: "何が必要ですか？", a: "まずは制服・体操服・運動できる靴。その他の宿泊用品は参加確定後に段階的にご案内します。" },
  { q: "初日の8:00に間に合わないかも…", a: "事前申請があれば遅刻入場OK。到着したら職員室へ寄ってください。" },
  { q: "集団登校は本当に5:20集合？", a: "はい。本当に5:20にスタッフがいます。大阪・あべのHoop前に集まって、近鉄阿倍野橋駅へ移動して乗車します。" },
  { q: "体育祭はどんな雰囲気？", a: "クラス対抗でガチ。出場しない競技でも全力で応援するのが文化。熱狂で一気に仲良くなれます。" },
];

/* ----------------- Page ----------------- */
export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#f0f7ff]">
      {/* 0) ヒーロー：任天堂の“白文字×背景画像”風 */}
      <header className="relative">
        {/* 画像を /public/guide/hero.jpg などに配置してください */}
        <div className="relative">
          <img
            src="/guide/hero.jpg"
            alt="楽しみ方は無限大！"
            className="block w-full h-auto object-cover"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <h1 className="text-white text-3xl md:text-5xl font-extrabold drop-shadow-[0_4px_16px_rgba(0,0,0,.45)]">
              楽しみ方は無限大！
            </h1>
            <p className="mt-3 max-w-3xl text-white/95 text-sm md:text-base leading-relaxed drop-shadow">
              ガチ文高等学校は、文化祭に特化した不思議な学校です。これまでタイムスリップに成功した生徒が実体験を元に、
              はじめて遊びに来る人向けに<strong>3日間でできること</strong>と<strong>基本</strong>をやさしく説明します。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/buy"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-[14px] bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/20"
              >
                チケットを購入
              </Link>
              <Link
                href="/projects"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-[14px] bg-white text-sky-700 px-4 py-2 text-sm font-bold ring-1 ring-sky-200 hover:bg-sky-50"
              >
                過去企画を見る
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 1) 最も意識すること（青） */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-12 space-y-10">
        <SectionBlock
          id="most"
          tone="blue"
          title="最も意識すること"
          lead="“全員で作る文化祭”。見るだけじゃなく、手と声を出して関わるほど面白くなる。"
          imageSrc="/guide/sec-most.jpg"
        >
          {mostImportant.map((x, i) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} defaultOpen={i === 0} />
          ))}
        </SectionBlock>

        {/* 2) 準備 */}
        <SectionBlock
          id="prep"
          tone="sky"
          title="準備"
          lead="学籍／Discordで準備からワクワクが始まる。"
          imageSrc="/guide/sec-prep.jpg"
        >
          {prep.map((x, i) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} defaultOpen={i === 0} />
          ))}
        </SectionBlock>

        {/* 3) 持ち物 */}
        <SectionBlock
          id="belongings"
          tone="amber"
          title="持ち物"
          lead="まずは3点セット＋温泉セット。その他は順次アナウンス。"
          imageSrc="/guide/sec-belongings.jpg"
        >
          {belongings.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 4) 購買部 */}
        <SectionBlock
          id="store"
          tone="emerald"
          title="購買部で買えるもの"
          lead="お腹も心も満たす、手作りの味。"
          imageSrc="/guide/sec-store.jpg"
        >
          {store.map((x, i) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} defaultOpen={i === 0} />
          ))}
        </SectionBlock>

        {/* 5) 体育祭・1500m走 */}
        <SectionBlock
          id="athletics"
          tone="violet"
          title="体育祭・1500m走"
          lead="クラスで燃える。応援も主役。"
          imageSrc="/guide/sec-athletics.jpg"
        >
          {athletics.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 6) 授業 */}
        <SectionBlock
          id="lessons"
          tone="pink"
          title="授業"
          lead="先生のこだわりが光る。学ぶ楽しさをもう一度。"
          imageSrc="/guide/sec-lesson.jpg"
        >
          {lessons.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 7) ログアウトパビリオン */}
        <SectionBlock
          id="logout"
          tone="sky"
          title="ログアウトパビリオン"
          lead="スマホを少し置いて、“いま”に集中。"
          imageSrc="/guide/sec-logout.jpg"
        >
          {logoutPavilion.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 8) 登校 */}
        <SectionBlock
          id="go"
          tone="emerald"
          title="登校"
          lead="あべのHoop前に集合→近鉄阿倍野橋駅から出発。"
          imageSrc="/guide/sec-go.jpg"
        >
          {goToSchool.map((x, i) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} defaultOpen={i === 0} />
          ))}
        </SectionBlock>

        {/* 9) 遅刻 */}
        <SectionBlock
          id="late"
          tone="amber"
          title="遅刻"
          lead="事前申請で遅刻入場OK。到着後は職員室へ。"
          imageSrc="/guide/sec-late.jpg"
        >
          {late.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 10) 文化祭当日 */}
        <SectionBlock
          id="festival"
          tone="violet"
          title="文化祭当日"
          lead="サプライズだらけ。友だちの企画も全力で楽しもう。"
          imageSrc="/guide/sec-fes.jpg"
        >
          {festivalDay.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* 11) 後夜祭 */}
        <SectionBlock
          id="after"
          tone="blue"
          title="後夜祭"
          lead="光と音のフィナーレへ。"
          imageSrc="/guide/sec-after.jpg"
        >
          {afterParty.map((x) => (
            <AccordionCard key={x.title} icon={x.icon} title={x.title} body={x.body} />
          ))}
        </SectionBlock>

        {/* Q&A */}
        <section id="qa" className="scroll-mt-24">
          <div
            className={`relative rounded-[28px] p-6 md:p-8 ring-1 ring-black/5 shadow-[0_18px_50px_rgba(0,0,0,.08)] overflow-hidden bg-gradient-to-b ${TONE_BG["sky"]}`}
          >
            <header className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-slate-700 ring-1 ring-black/5 shadow-sm">
                <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Q&A
              </span>
              <h2 className="mt-3 text-xl md:text-2xl font-extrabold text-slate-900">
                よくある質問
              </h2>
              <p className="mt-1 text-[15px] md:text-[16px] text-slate-700">
                不安はここで解消。
              </p>
            </header>

            <div className="relative z-10 mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
              {qa.map((item, i) => (
                <AccordionCard
                  key={item.q}
                  icon={i % 2 ? "❓" : "💡"}
                  title={item.q}
                  body={item.a}
                />
              ))}
            </div>

            <div className="relative z-10 mt-6 rounded-2xl bg-gradient-to-r from-sky-50 to-pink-50 p-5 ring-1 ring-black/5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[15px] md:text-[16px] font-semibold text-slate-800">
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
        </section>
      </div>
    </main>
  );
}
