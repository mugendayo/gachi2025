// app/(mkt)/guide/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

/* ----------------- Meta ----------------- */
export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description:
    "はじめての方向けの参加ガイド。“◯◯の知識”カードをタップして、当日まで・1〜3日目・Q&Aをさっと確認。",
};

/* ----------------- 小物（UI） ----------------- */
function SectionChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-slate-700 ring-1 ring-black/5 shadow-sm">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
      {children}
    </span>
  );
}

function SectionShell({
  id,
  tone = "sky",
  title,
  lead,
  children,
}: {
  id: string;
  tone?: "sky" | "emerald" | "amber" | "violet";
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    sky: "from-sky-100/80 to-sky-50/60",
    emerald: "from-emerald-100/80 to-emerald-50/60",
    amber: "from-amber-100/80 to-amber-50/60",
    violet: "from-violet-100/80 to-violet-50/60",
  };
  return (
    <section id={id} className="scroll-mt-24">
      <div
        className={`relative rounded-[28px] p-6 md:p-8 ring-1 ring-black/5 shadow-[0_18px_50px_rgba(0,0,0,.08)] overflow-hidden bg-gradient-to-b ${tones[tone]}`}
      >
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/50 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/40 blur-3xl" />

        <header className="relative z-10">
          <SectionChip>◯◯の知識</SectionChip>
          <h2 className="mt-3 text-xl md:text-2xl font-extrabold text-slate-900">
            {title}
          </h2>
          {lead && (
            <p className="mt-1 text-[15px] md:text-[16px] text-slate-700">{lead}</p>
          )}
        </header>

        <div className="relative z-10 mt-5">{children}</div>
      </div>
    </section>
  );
}

/* クリックで開閉できる“知識カード” */
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
      className="group rounded-2xl bg-white/90 backdrop-blur ring-1 ring-black/5 shadow-[0_8px_24px_rgba(0,0,0,.06)] open:shadow-[0_12px_28px_rgba(0,0,0,.10)] transition-shadow"
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
              クリックして開く
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

/* ----------------- コンテンツ ----------------- */
const before = [
  {
    icon: "🎓",
    title: "生徒になる知識",
    body:
      "定期テスト提出や制服の投稿で学籍番号を付与。学籍がついた生徒から、実行委員限定Discordへ入れます。準備の裏側や企画の進捗が見られて、当日がもっと楽しみに。",
  },
  {
    icon: "🗺️",
    title: "企画えらびの知識",
    body:
      "食べ物・体験・展示など多彩。チケット購入後に一覧を事前チェック。「ここは行く」「ここで写真撮る」など当日の導線を軽く決めておくとラク。",
  },
  {
    icon: "🧥",
    title: "制服の知識",
    body:
      "“自分にとっての青春”を表す服装が正装。実際の制服でも憧れのコーデでもOK。事前の放課後から着て出かけるのも大歓迎。",
  },
  {
    icon: "💬",
    title: "オンラインHRの知識",
    body:
      "Discordでオンラインホームルームを実施。先生や友達と事前に話して仲良くなるチャンス。知らない誰かが、気づけば一緒に企画を進める仲間に。",
  },
];

const mustItems = ["体操服", "制服", "運動靴"];

const day1 = [
  {
    icon: "🏫",
    title: "登校の知識",
    body: (
      <>
        登校は<strong>朝8:00まで</strong>。会場は奈良県「下市集学校」。近鉄吉野線「下市口駅」から徒歩29分。
        ひとり参加が不安なら大阪・阿倍野HOOP前からの集団登校へ。到着したら
        <strong>クラスを確認して教室へ</strong>。
      </>
    ),
  },
  {
    icon: "📘",
    title: "授業の知識",
    body:
      "文化祭直前でも通常授業＋特別授業があります。学ぶ楽しさをもう一度。ここから文化祭モードにスイッチ。",
  },
  {
    icon: "🧩",
    title: "クラス企画の知識",
    body:
      "各クラスでひとつの出し物をつくります。担任と話し合い、役割を決めて準備スタート。形にする最初の一歩。",
  },
  {
    icon: "🏅",
    title: "体育祭の知識",
    body:
      "走って笑って、距離が縮む。普段話さない人とも自然に仲良くなれるチャンス。体を動かして空気に馴染もう。",
  },
];

const day2 = [
  {
    icon: "🏃",
    title: "1500mの知識",
    body:
      "有志の「ガチ1500m走大会」。隣の友達や過去の自分と勝負。全力で走ること自体が“青春の証”。",
  },
  {
    icon: "🎨",
    title: "仕上げの知識",
    body:
      "装飾・買い出しなどラストスパート。仲間とひとつを作る喜びを堪能。過程そのものが文化祭の価値。",
  },
  {
    icon: "🌙",
    title: "前夜の知識",
    body:
      "ちょっと特別な夜。試作品を味見したり語り合ったり。照明を落とした教室の時間は、きっと記憶に残る。",
  },
];

const day3 = [
  {
    icon: "🎪",
    title: "当日の知識",
    body:
      "手作りハンバーガー、ガチ二郎、プリキュア展、謎解き、エジプトカフェ…毎年サプライズだらけ。気になる企画を巡って、自分だけの文化祭を満喫しよう。",
  },
  {
    icon: "🎤",
    title: "後夜祭の知識",
    body:
      "野外ステージで歌・ダンス・隠し芸・即興など。観るのも出るのも自由。「やってみたい」が最高のきっかけ。",
  },
];

const qa = [
  { q: "一人で参加しても楽しめますか？", a: "クラス配属・企画づくり・体育祭で自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。" },
  { q: "宿泊はどこでするのですか？", a: "男女別で、廃校の教室を寝室として用意。全員分の布団あり。安心して休めます。" },
  { q: "お風呂はどうなっていますか？", a: "基本的に全員入浴。クラス単位でバス移動し近隣温泉へ。入浴料500円、往復バス540円は各自負担。タオルや石けん等は持参してください。" },
  { q: "食事はどうすればいいですか？", a: "基本は校内の購買部で購入できます。" },
  { q: "何が必要ですか？", a: "まずは制服・体操服・運動できる靴。その他の宿泊用品は後日ご案内します。" },
  { q: "初日の8:00に間に合わないかも…", a: "遅刻や初日欠席もOK。登校できたら職員室へ寄ってください。" },
  { q: "下市集学校への行き方は？", a: "大阪阿倍野橋駅から近鉄で「下市口」。駅からバスで「下市集学校」へ。不安な場合は5:20に近鉄阿倍野橋駅西改札内に集合で集団登校（5分後の電車に乗車）。" },
  { q: "貴重品はどう管理すれば？", a: "寝室は施錠しますが、心配なら携帯or職員室で預かり可（常駐あり）。" },
];

/* ----------------- Page ----------------- */
export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#f6f9fc]">
      {/* ヒーロー */}
      <header className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 md:pt-14 pb-6">
          <div className="rounded-[28px] overflow-hidden ring-1 ring-black/5 bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_24px_64px_rgba(0,0,0,.18)]">
            <div className="px-6 md:px-10 py-8">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">わかばガイド</h1>
              <p className="mt-2 text-white/90">タップでひらく“◯◯の知識”カード。準備から当日、Q&Aまでスイスイ読めます。</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/buy" prefetch={false} className="inline-flex items-center justify-center rounded-[14px] bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/40 backdrop-blur hover:bg-white/20">購入する</Link>
                <Link href="/projects" prefetch={false} className="inline-flex items-center justify-center rounded-[14px] bg-white text-sky-700 px-4 py-2 text-sm font-bold ring-1 ring-sky-200 hover:bg-sky-50">過去企画を見る</Link>
              </div>
            </div>

            <nav className="bg-white/15 backdrop-blur px-4 md:px-10 py-3 border-t border-white/15" aria-label="わかばガイド内ナビ">
              <div className="flex flex-wrap gap-2">
                {[
                  { href: "#before", label: "当日まで" },
                  { href: "#day1", label: "1日目" },
                  { href: "#day2", label: "2日目" },
                  { href: "#day3", label: "3日目" },
                  { href: "#qa", label: "Q&A" },
                ].map((x) => (
                  <a key={x.href} href={x.href} className="inline-flex items-center rounded-full bg-white text-sky-700 px-3 py-1.5 text-sm font-bold ring-1 ring-sky-200 hover:bg-sky-50">
                    {x.label}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* 本文 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-14 md:pb-20 space-y-10 md:space-y-12">
        <SectionShell id="before" tone="emerald" title="当日までの知識" lead="“準備で8割決まる” をやさしくガイド。">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {before.map((b, i) => (
              <AccordionCard key={b.title} icon={b.icon} title={b.title} body={b.body} defaultOpen={i === 0} />
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white/90 backdrop-blur ring-1 ring-black/5 p-4">
            <p className="font-bold text-amber-900">先に準備してほしいもの</p>
            <ul className="mt-1 list-disc pl-5 text-[15px] text-amber-900/90">
              {mustItems.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="mt-1 text-[13px] text-amber-900/80">※ その他の宿泊用品は後日あらためてご連絡します。</p>
          </div>
        </SectionShell>

        <SectionShell id="day1" tone="sky" title="1日目の知識" lead="開校。空気に馴染む日。">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {day1.map((b) => (
              <AccordionCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
            ))}
          </div>
        </SectionShell>

        <SectionShell id="day2" tone="amber" title="2日目の知識" lead="仕上げと挑戦が交差する。">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {day2.map((b) => (
              <AccordionCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
            ))}
          </div>
        </SectionShell>

        <SectionShell id="day3" tone="violet" title="3日目の知識" lead="本番。そしてフィナーレへ。">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {day3.map((b) => (
              <AccordionCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
            ))}
          </div>
        </SectionShell>

        <SectionShell id="qa" tone="emerald" title="Q&Aの知識" lead="不安はここで解消。">
          <div className="space-y-3">
            {qa.map((item, i) => (
              <AccordionCard key={item.q} icon={i % 2 ? "❓" : "💡"} title={item.q} body={item.a} />
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-gradient-to-r from-sky-50 to-pink-50 p-5 ring-1 ring-black/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[15px] md:text-[16px] font-semibold text-slate-800">準備OKなら、今すぐチケットを購入しよう。</p>
              <div className="flex gap-3">
                <Link href="/buy" className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[15px] font-bold text-white bg-gradient-to-b from-[#FF6A9E] to-[#FF4F90] ring-1 ring-black/10 shadow-[0_10px_26px_rgba(0,0,0,.25)] transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(0,0,0,.32)] active:scale-[0.995]">購入する</Link>
                <Link href="/projects" className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[15px] font-bold text-sky-700 bg-white ring-1 ring-sky-200 hover:bg-sky-50 transition">過去企画を見る</Link>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>
    </main>
  );
}
