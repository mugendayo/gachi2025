// app/(mkt)/guide/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { SimpleSlider, type Slide } from "./ClientParts";
import TeachersSection from "./TeachersSection";

/* =========================
   Metadata
   ========================= */
export const metadata: Metadata = {
  title: "ガチ文のきほん | ガチ文化祭",
  description:
    "はじめての方向け。準備・流れ・不安つぶしQ&A・アクセスまで、これ1ページで完了。",
};

/* =========================
   Utility
   ========================= */
function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>;
}

/** Tips：画像付きボックス（タイトル帯＋16:9画像＋本文） */
function Tips({
  title = "豆知識",
  icon,
  children,
}: {
  title?: string;
  icon?: string; // 例: "/images/tips/run.jpg"
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* タイトル帯 */}
      <div className="bg-gradient-to-r from-blue-500 to-sky-400 px-4 py-2 text-white font-bold text-[14px] tracking-wide">
        {title}
      </div>

      {/* 16:9 画像（あれば） */}
      {icon && (
        <div className="relative w-full aspect-video bg-slate-100 border-b border-slate-200">
          <Image
            src={icon}
            alt={title}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 600px, 100vw"
          />
        </div>
      )}

      {/* テキスト */}
      <div className="px-4 py-3 text-[14px] leading-7 text-slate-800">{children}</div>
    </div>
  );
}

/* =========================
   Nintendo風パネル（巨大英字＋矢印リボン＋白枠）
   ========================= */
function Ribbon({
  text,
  from = "#ef4444",
  to = "#f97316",
  className = "",
}: {
  text: string;
  from?: string;
  to?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative inline-flex items-center px-4 md:px-6 py-2 md:py-2.5 font-extrabold text-white tracking-widest drop-shadow-[0_6px_14px_rgba(0,0,0,.25)] select-none",
        className,
      ].join(" ")}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        clipPath:
          "polygon(14px 0, 100% 0, 100% 70%, calc(100% + 22px) 50%, 100% 30%, 100% 100%, 14px 100%, 0 80%, 0 20%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 skew-x-12 opacity-30"
        style={{
          background:
            "repeating-linear-gradient(120deg, rgba(255,255,255,.35) 0 6px, transparent 6px 20px)",
        }}
      />
      <span className="relative z-10">{text}</span>
    </div>
  );
}

function BigEN({ children, color = "#3b82f6" }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="pointer-events-none select-none font-black tracking-[.08em]"
      style={{
        fontSize: "clamp(64px, 16vw, 160px)",
        lineHeight: 0.8,
        color,
        opacity: 0.12,
        textShadow: "0 4px 0 rgba(0,0,0,.06)",
      }}
    >
      {children}
    </div>
  );
}

function Panel({
  id,
  bigEN,
  jpRibbon,
  ribbonFrom,
  ribbonTo,
  bg,
  borderColor = "#3b82f6",
  children,
}: {
  id: string;
  bigEN: string;
  jpRibbon: string;
  ribbonFrom?: string;
  ribbonTo?: string;
  bg?: string;
  borderColor?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative py-12 md:py-16">
      {/* 背景（任意） */}
      {bg && (
        <div className="absolute inset-0 -z-10">
          <Image src={bg} alt="" fill className="object-cover opacity-40" />
        </div>
      )}

      <Container>
        {/* 見出し（巨大英字＋リボン） */}
        <div className="relative mb-4 md:mb-6">
          <BigEN>{bigEN}</BigEN>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Ribbon text={jpRibbon} from={ribbonFrom} to={ribbonTo} />
          </div>
        </div>

        {/* 白枠内容 */}
        <div
          className="rounded-[20px] bg-white p-4 md:p-6 shadow-[0_10px_26px_rgba(0,0,0,.12)]"
          style={{
            border: `6px solid ${borderColor}`,
            boxShadow: `inset 0 0 0 3px #fff`,
          }}
        >
          {children}
        </div>
      </Container>
    </section>
  );
}

/* =========================
   Main Page
   ========================= */
export default function GuidePage() {
  // 後夜祭スライド
  const kouyasaiSlides: Slide[] = [
    { src: "/images/2019.jpeg", caption: "2019 後夜祭" },
    { src: "/images/2021.jpg", caption: "2021 後夜祭" },
    { src: "/images/2022.jpg", caption: "2022 後夜祭" },
    { src: "/images/2023.jpg", caption: "2023 後夜祭" },
    { src: "/images/2024.jpg", caption: "2024 後夜祭" },
    { src: "/images/yusei.jpeg", caption: "担当：ゆうせい（クリエイティブ学科 首席合格）" },
  ];

  return (
    <main className="relative">
      {/* ===================== Hero ===================== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/hero.jpg" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-white/0" />
        </div>
        <Container>
          <div className="flex min-h-[62svh] items-center py-14 md:py-24 text-white">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] tracking-widest uppercase">
                FIRST TIMER’S WAKABA GUIDE
              </span>
              <h1 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight drop-shadow">
                楽しみ方は無限大！
              </h1>
              <p className="mt-3 text-base md:text-lg text-white/90">
                はじめてでも大丈夫。準備・流れ・よくある不安をここで全部クリアにして、当日をワクワクで迎えよう。
              </p>

              {/* Q&A 直行ボタン（復活） */}
              <div className="mt-5 flex flex-wrap gap-3 items-center">
                <Link
                  href="#faq"
                  className="rounded-2xl px-4 py-2 text-sm font-extrabold tracking-wide ring-2 ring-yellow-300/80 bg-yellow-300 text-black shadow-[0_10px_26px_rgba(0,0,0,.25)] hover:bg-yellow-200 transition"
                >
                  ❓ 不安つぶしQ&Aへ
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

{/* ===================== 楽しみ方タイル（画像入り） ===================== */}
<section className="py-10 md:py-14 bg-amber-50/50">
  <Container>
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
      ガチ文高等学校には楽しみ方がいっぱい。
    </h2>

    {/* ここに表示したい丸＋画像を列挙（/public 配下のパス） */}
    {/*
      例では /public/images/guide/fun/ 以下に置いた想定です。
      任意のパスに変えてOK！
    */}
    {(() => {
      const funItems = [
        { label: "制服を着る",         src: "/images/uniform.jpg" },
        { label: "クラスの企画をつくる", src: "/images/make.jpg" },
        { label: "チルアウトする",     src: "/images/chill.jpg" },
        { label: "情熱を注ぐ",         src: "/images/passion.jpg" },
        { label: "授業を受ける",       src: "/images/class.jpg" },
        { label: "体育祭を楽しむ",     src: "/images/sports.jpg" },
        { label: "キャラを演じる",     src: "/images/role.jpg" },
      ];

      return (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {funItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div
                className="
                  relative h-36 w-36 md:h-44 md:w-44 rounded-full overflow-hidden
                  ring-2 ring-white shadow-sm bg-gray-100 group
                "
              >
                {/* 画像を丸くトリミングしてフィット */}
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  sizes="(min-width:1024px) 176px, 144px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
                {/* 斜めのハイライト・薄いグラデ */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "repeating-linear-gradient(120deg, rgba(255,255,255,.25) 0 6px, transparent 6px 22px)",
                    maskImage:
                      "linear-gradient(180deg, rgba(0,0,0,.7), rgba(0,0,0,0.1))",
                    WebkitMaskImage:
                      "linear-gradient(180deg, rgba(0,0,0,.7), rgba(0,0,0,0.1))",
                  }}
                />
              </div>
              <div className="mt-3 font-semibold text-green-700">{item.label}</div>
            </div>
          ))}
        </div>
      );
    })()}
  </Container>
</section>


      {/* ===================== Teachers ===================== */}
      <TeachersSection />

      {/* ===================== ① 生徒になる（RUN） ===================== */}
      <Panel
        id="be-student"
        bigEN="RUN"
        jpRibbon="走る → 高校生へ"
        ribbonFrom="#3b82f6"
        ribbonTo="#60a5fa"
        bg="/images/patterns/run.jpg"
        borderColor="#3b82f6"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          ① ガチ文高校の生徒になってみよう
        </h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>
            定期テストの提出や制服の投稿などで学籍番号を手に入れられます。学籍番号の付与順に、Discord限定チャンネルへアクセス可能。
          </p>
          <Tips title="豆知識" icon="/images/tips/run.jpg">
            学籍番号があるとDiscord内の限定情報・連絡が見やすくなります。
          </Tips>
        </div>
      </Panel>

      {/* ===================== ② 企画一覧（LOOK） ===================== */}
      <Panel
        id="catalog"
        bigEN="LOOK"
        jpRibbon="見る → 企画を探す"
        ribbonFrom="#14b8a6"
        ribbonTo="#22c55e"
        bg="/images/patterns/look.jpg"
        borderColor="#10b981"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">② 企画一覧を事前チェック</h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>
            食べ物・体験・展示など、多彩な企画が並びます。チケット購入後に一覧を確認できるので、「絶対行きたい」をいくつかピックしておくと当日動きやすいです。
          </p>
          <Tips title="ワンポイント" icon="/images/tips/catalog.png">
            行きたい企画を3つだけ決めておくと、当日の満足度がグンと上がります。
          </Tips>
        </div>
      </Panel>

      {/* ===================== ③ 制服（DRESS） ===================== */}
      <Panel
        id="uniform"
        bigEN="DRESS"
        jpRibbon="装う → 制服を準備"
        ribbonFrom="#f97316"
        ribbonTo="#ef4444"
        bg="/images/patterns/dress.jpg"
        borderColor="#f97316"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          ③ 制服を準備して、放課後を満喫しよう
        </h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>「自分にとっての青春」を表すものが制服です。実際の制服、憧れのデザイン、推しのコーデでもOK。</p>
          <Tips title="写真のコツ" icon="/images/tips/uniform.jpg">
            背景をシンプルにして逆光を避けるだけで、SNS映えが安定します。
          </Tips>
        </div>
      </Panel>

      {/* ===================== ④ HR（TALK） ===================== */}
      <Panel
        id="homeroom"
        bigEN="TALK"
        jpRibbon="話す → オンラインHR"
        ribbonFrom="#8b5cf6"
        ribbonTo="#ec4899"
        bg="/images/patterns/talk.jpg"
        borderColor="#a855f7"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          ④ オンラインホームルームに参加してみよう
        </h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>DiscordでオンラインHRを開催。先生や友達と事前に話して仲良くなるチャンス。</p>
          <Tips title="入室の不安" icon="/images/tips/homeroom.jpg">
            マイクや顔出しは無理しなくてOK。聞くだけ参加から始めましょう。
          </Tips>
        </div>
      </Panel>

      {/* ===================== 持ち物（PACK） ===================== */}
      <Panel
        id="packing"
        bigEN="PACK"
        jpRibbon="準備 → 持ち物"
        ribbonFrom="#06b6d4"
        ribbonTo="#3b82f6"
        bg="/images/patterns/pack.jpg"
        borderColor="#06b6d4"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">持ち物</h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <ul className="list-disc pl-6 space-y-1">
            <li>体操服</li>
            <li>筆記用具</li>
            <li>運動靴</li>
            <li>お風呂セット</li>
          </ul>
          <Tips title="忘れ物対策" icon="/images/tips/packing.jpg">
            チェックリスト化して、前日夜に鞄へ詰めてから寝よう！
          </Tips>
        </div>
      </Panel>

      {/* ===================== 1日目（DAY 1） ===================== */}
      <Panel
        id="day1"
        bigEN="DAY 1"
        jpRibbon="登校 → 授業・キックオフ"
        ribbonFrom="#2563eb"
        ribbonTo="#60a5fa"
        bg="/images/patterns/day1.jpg"
        borderColor="#2563eb"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          1日目：集団登校・授業・クラス企画の初動
        </h2>
        <Tips title="迷子になったら" icon="/images/tips/day1.jpg">
          集合場所の写真をスマホに保存。時間と改札名もメモに控えておくと安心。
        </Tips>
      </Panel>

      {/* ===================== 2日目（BOOST） ===================== */}
      <Panel
        id="day2"
        bigEN="BOOST"
        jpRibbon="仕上げる → 前夜"
        ribbonFrom="#f59e0b"
        ribbonTo="#ef4444"
        bg="/images/patterns/day2.jpg"
        borderColor="#f59e0b"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">2日目：準備と本気が混ざり合う日</h2>
        <Tips title="火力の回復" icon="/images/tips/day2.jpg">
          睡眠・ごはん・水分・同期（誰かと共有）の4点が満タンかを毎回チェック。
        </Tips>
      </Panel>

      {/* ===================== 3日目（FIGHT） ===================== */}
      <Panel
        id="day3"
        bigEN="FIGHT"
        jpRibbon="本番 → 文化祭"
        ribbonFrom="#ef4444"
        ribbonTo="#f97316"
        bg="/images/patterns/day3.jpg"
        borderColor="#ef4444"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">3日目：いよいよ本番、文化祭当日</h2>
        <Tips title="巡り方のコツ" icon="/images/tips/day3.jpg">
          企画を3つ体験・1つお手伝い・1つ写真に残す。それが“最高の文化祭”黄金比！
        </Tips>
      </Panel>

      {/* ===================== 後夜祭（NIGHT） ===================== */}
      <Panel
        id="koyasai"
        bigEN="NIGHT"
        jpRibbon="フィナーレ → 後夜祭"
        ribbonFrom="#38bdf8"
        ribbonTo="#0ea5e9"
        bg="/images/patterns/night.jpg"
        borderColor="#0ea5e9"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">後夜祭</h2>
        <Tips title="写真スポット" icon="/images/tips/koyasai.jpg">
          ステージのライト後方が最高の逆光ポイント。友達と記念撮影を忘れずに！
        </Tips>
        <SimpleSlider slides={kouyasaiSlides} />
      </Panel>

      {/* ===================== 不安つぶしQ&A（READ） ← ここが戻りました ===================== */}
      <Panel
        id="faq"
        bigEN="READ"
        jpRibbon="不安つぶし Q&A"
        ribbonFrom="#0ea5e9"
        ribbonTo="#6366f1"
        bg="/images/patterns/faq.jpg"
        borderColor="#6366f1"
      >
        <details className="group rounded-xl border bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">一人で参加しても楽しめますか？</summary>
          <div className="pt-2">
            クラス配属・企画づくり・体育祭で自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">宿泊はどこでするのですか？</summary>
          <div className="pt-2">男女別に廃校の教室を寝室としてご用意。全員分の布団を準備しています。</div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">お風呂はどうなっていますか？</summary>
          <div className="pt-2">
            クラス単位で指定バスに乗車し、近隣の温泉施設へ。 入浴料500円、往復バス代540円は各自用意。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">食事はどうすればいいですか？</summary>
          <div className="pt-2">
            基本は校内の購買部で購入できます。軽食（パン・おにぎり）／温かい麺類／ドリンク各種などを販売予定。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">持ち物は何が必要ですか？</summary>
          <div className="pt-2">
            「持ち物」セクションをご確認ください（体操服・筆記用具・運動靴・お風呂セット・ノート・
            パジャマ・雨具・モバイルバッテリー・証明写真orプリクラ・企画準備物）。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">初日の8時までに間に合わないかもしれません…</summary>
          <div className="pt-2">遅刻・初日欠席も対応します。職員室まで来て中の先生へお声がけください。</div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">会場まではどうやって行けばいいですか？</summary>
          <div className="pt-2">大阪・阿倍野HOOP前 集合の「集団登校」を実施しています。</div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">貴重品はどうやって管理したらいいですか？</summary>
          <div className="pt-2">
            寝室は施錠していますが、気になる場合は持ち歩くか職員室に預けてください（常駐の先生がいます）。
          </div>
        </details>
      </Panel>
    </main>
  );
}
