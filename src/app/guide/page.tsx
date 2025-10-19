// app/(mkt)/guide/page.tsx
// ❌ 「use client」は付けない（Server Component のまま）
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
  title: "わかばガイド | ガチ文化祭",
  description:
    "はじめての方向け。準備・流れ・不安つぶしQ&A・アクセスまで、これ1ページで完了。",
};

/* =========================
   小さめユーティリティ
   ========================= */
function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>;
}

/** ワンポイント小窓（あとからアイコン差し替えしやすい） */
function Tips({
  title = "ワンポイント",
  icon = "/icons/tip-placeholder.png",
  children,
}: {
  title?: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 grid grid-cols-[44px_1fr] gap-3 rounded-xl border bg-white p-3 shadow-sm">
      <div className="relative h-11 w-11 overflow-hidden rounded-lg ring-1 ring-gray-200 bg-gray-50">
        <Image src={icon} alt="" fill className="object-contain p-1.5" />
      </div>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="mt-1 text-[14px] leading-6 text-gray-700">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Nintendo風 共通パネル
   ========================= */
/**
 * ベンチマーク：
 *  - 後ろに巨大な英字（RUN/FIGHT…）
 *  - その手前に“矢印リボン”の日本語ラベル
 *  - 下に白枠のコンテンツパネル（枠は太め＋色縁取り）
 *  - セクションごとに背景（任意）
 */
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
        "relative inline-flex items-center px-4 md:px-6 py-2 md:py-2.5",
        "font-extrabold text-white tracking-widest",
        "drop-shadow-[0_6px_14px_rgba(0,0,0,.25)] select-none",
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

function BigEN({
  children,
  color = "#3b82f6",
}: {
  children: ReactNode;
  color?: string;
}) {
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
  bigEN: string; // RUN / FIGHT …
  jpRibbon: string; // 走る / 戦う …（左の矢印ラベル）
  ribbonFrom?: string;
  ribbonTo?: string;
  bg?: string; // セクション背景画像（任意）
  borderColor?: string; // コンテンツ枠の縁色
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative py-12 md:py-16">
      {/* 背景（任意画像） */}
      {bg && (
        <div className="absolute inset-0 -z-10">
          <Image src={bg} alt="" fill className="object-cover opacity-40" />
        </div>
      )}

      <Container>
        {/* ヘッダ帯（巨大英字＋日本語矢印） */}
        <div className="relative mb-4 md:mb-6">
          <BigEN>{bigEN}</BigEN>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Ribbon text={jpRibbon} from={ribbonFrom} to={ribbonTo} />
          </div>
        </div>

        {/* 白枠の“内容ボックス” */}
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
   Page
   ========================= */
export default function GuidePage() {
  // 後夜祭スライド（6枚）
  const kouyasaiSlides: Slide[] = [
    { src: "/images/kouyasai/2019.jpg", caption: "2019 後夜祭" },
    { src: "/images/kouyasai/2021.jpg", caption: "2021 後夜祭" },
    { src: "/images/kouyasai/2022.jpg", caption: "2022 後夜祭" },
    { src: "/images/kouyasai/2023.jpg", caption: "2023 後夜祭" },
    { src: "/images/kouyasai/2024.jpg", caption: "2024 後夜祭" },
    { src: "/images/kouyasai/yusei.jpg", caption: "担当：ゆうせい（クリエイティブ学科 首席合格）" },
  ];

  return (
    <main className="relative">
      {/* ===================== Hero ===================== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/guide/hero.jpg" alt="" fill priority className="object-cover" />
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
              <div className="mt-5 flex flex-wrap gap-3 items-center">
                <Link
                  href="/discord"
                  className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20"
                >
                  Discordに参加
                </Link>
                <Link
                  href="/tickets"
                  className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20"
                >
                  チケットを確認
                </Link>
                {/* Q&Aへ飛ぶ派手ボタン */}
                <a
                  href="#faq"
                  className="relative rounded-2xl px-4 py-2 text-sm font-extrabold tracking-wide ring-2 ring-yellow-300/80 bg-yellow-300 text-black shadow-[0_10px_26px_rgba(0,0,0,.25)] hover:bg-yellow-200 transition animate-bounce"
                >
                  ❓ 不安つぶしQ&Aへ
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===================== Teachers（そのまま） ===================== */}
      <TeachersSection />

      {/* ===================== ① 生徒になる（RUN） ===================== */}
      <Panel
        id="be-student"
        bigEN="RUN"
        jpRibbon="走る → 高校生へ"
        ribbonFrom="#3b82f6"
        ribbonTo="#60a5fa"
        bg="/images/patterns/run.jpg" // 任意の薄い背景（無ければ削除OK）
        borderColor="#3b82f6"
      >
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          ① ガチ文高校の生徒になってみよう
        </h2>
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>
            定期テストの提出や制服の投稿などで学籍番号を手に入れられます。学籍番号の付与順に、今年の実行委員限定Discordチャンネルへアクセス可能。準備の裏側や関係性を事前に感じ取れて、当日がもっと楽しみになります。
          </p>
          <Tips title="豆知識">学籍番号があるとDiscord内の限定情報・連絡が見やすくなります。</Tips>
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
          <Tips title="ワンポイント">行きたい企画を3つだけ決めておくと、当日の満足度がグンと上がります。</Tips>
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
          <p>
            「自分にとっての青春」を表すものが制服です。実際の制服、憧れのデザイン、推しのコーデでもOK。 「これが私の制服！」と言えるものであれば正装。事前の放課後も制服で遊びに出かけてみてください。
          </p>
          <Tips title="写真のコツ">背景をシンプルにして逆光を避けるだけで、SNS映えが安定します。</Tips>
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
          <p>
            DiscordでオンラインHRを開催。先生や友達と事前に話して仲良くなるチャンス。いつの間にか、一緒に企画を進める仲間ができます。
          </p>
          <div className="mt-3">
            <Link
              href="/discord"
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Discordに入る
            </Link>
          </div>
          <Tips title="入室の不安">マイクや顔出しは無理しなくてOK。聞くだけ参加から始めましょう。</Tips>
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
        <div className="mt-4 prose max-w-none text-[15px]">
          <h3 className="text-lg font-semibold">▼ 持ち物</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>体操服</li>
            <li>筆記用具</li>
            <li>運動靴</li>
            <li>お風呂セット</li>
            <li>ノート</li>
            <li>パジャマ</li>
            <li>雨具</li>
            <li>モバイルバッテリー</li>
            <li>
              <strong>証明写真 or プリクラ</strong>
            </li>
            <li>企画準備物</li>
          </ul>
        </div>
        <Tips title="忘れ物対策">チェックリスト化して、前日夜に鞄へ詰めてから寝よう！</Tips>
      </Panel>

      {/* ===================== 1日目（RUN DAY） ===================== */}
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
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>
            登校は朝8時まで。会場は奈良県「下市集学校」。基本的に<strong>全員、集団登校</strong>
            に参加します（大阪・阿倍野HOOP前 集合）。到着後はクラスを確認して教室へ。
          </p>
          <p className="mt-4">
            授業を受けよう。通常授業＋特別授業で「学ぶ楽しさ」を再起動。クラス企画はこの日がキックオフです。
          </p>
          <Tips title="迷子になったら">集合場所の写真をスマホに保存。時間と改札名もメモに控えておくと安心。</Tips>
        </div>
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
        <div className="mt-4 text-[15px] leading-7 text-gray-800">
          <p>
            有志の「ガチ1500m走大会」に挑戦してみよう。隣を走る友達、過去の自分、今の自分に勝つための挑戦。
          </p>
          <p className="mt-4">
            クラス企画は大詰め。装飾・買い出し・役割分担、衝突や助け合いを通じて「一体感」が育ちます。
          </p>
          <p className="mt-4">夜は「文化祭前夜」を味わう特別な時間。少し非日常な空気で、未来や過去を語ろう。</p>
          <Tips title="火力の回復">
            睡眠・ごはん・水分・同期（誰かと共有）の4点が満タンかを毎回チェック。
          </Tips>
        </div>
      </Panel>

<Panel
  id="day3"
  bigEN="FIGHT"
  jpRibbon="本番 → 文化祭"
  ribbonFrom="#ef4444"
  ribbonTo="#f97316"
  bg="/images/patterns/day3.jpg"
  borderColor="#ef4444"
>
  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
    3日目：いよいよ本番、文化祭当日
  </h2>
  <div className="mt-4 text-[15px] leading-7 text-gray-800">
    <p>
      「手作りハンバーガー」「ガチ二郎ラーメン」「プリキュア展」「謎解き」「エジプトカフェ」など、毎年サプライズだらけ。事前にチェックした企画を巡って、自分だけの文化祭を満喫しよう。
    </p>
  </div>
</Panel>

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
  <div className="mt-4 text-[15px] leading-7 text-gray-800">
    <p>
      校舎をステージとして、3日間文化祭を作り上げた学校に響き渡るみんなの熱量と音楽で最高の時間をともに過ごそう！
    </p>
    <div className="mt-4">
      <SimpleSlider slides={kouyasaiSlides} />
    </div>
  </div>
</Panel>


      {/* ===================== 不安つぶしQ&A（READ） ===================== */}
      <Panel
        id="faq"
        bigEN="READ"
        jpRibbon="不安つぶし Q&A"
        ribbonFrom="#0ea5e9"
        ribbonTo="#6366f1"
        bg="/images/patterns/faq.jpg"
        borderColor="#6366f1"
      >
        {/* Q&A はプルダウンのまま（読みやすさ優先） */}
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
            生徒は体力回復のため基本的に全員入浴します。クラス単位で指定バスに乗車し、近隣の温泉施設へ。 入浴料500円、往復バス代540円は各自用意。タオルや石けん等も各自持参してください。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">食事はどうすればいいですか？</summary>
          <div className="pt-2">
            基本は校内の購買部で購入できます。＜ラインナップ例＞軽食（パン・おにぎり）／温かい麺類／ドリンク各種 など。<br />
            <strong>アレルギー対応</strong>：パッケージ表示の確認・別ラインの用意等でできる限り配慮します。必要があれば事前に担任の先生へ必ずご相談ください。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">何が必要ですか？</summary>
          <div className="pt-2">
            まずは「持ち物」セクションをご確認ください（体操服・筆記用具・運動靴・お風呂セット・ノート・
            パジャマ・雨具・モバイルバッテリー・<strong>証明写真orプリクラ</strong>・企画準備物）。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">初日の8時までに間に合わないかもしれません…</summary>
          <div className="pt-2">
            遅刻・初日欠席も対応します。<strong>職員室まで来て、中にいる先生へお声がけください。</strong>
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">会場の下市集学校まではどうやって行けばいいですか？</summary>
          <div className="pt-2">大阪・阿倍野HOOP前 集合の「集団登校」を実施しています。</div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">大阪阿部野橋駅までの行き方</summary>
          <div className="pt-2">
            ・梅田→JR環状線「大阪」→「天王寺」下車<br />
            ・難波→JR「JR難波」→「天王寺」下車<br />
            天王寺駅から徒歩で阿部野橋駅へ乗り換え。全員、11/1 5:20に近鉄阿部野橋駅 西改札内へ集合（5分後の電車に乗ります）。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">貴重品はどうやって管理したらいいですか？</summary>
          <div className="pt-2">
            寝室は施錠していますが、気になる場合は持ち歩くか職員室に預けてください（常駐の先生がいます）。
          </div>
        </details>
      </Panel>

      {/* ===================== アクセス・CTA・フッターはそのまま ===================== */}
      <section id="access" className="py-12 md:py-16">
        <Container>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">アクセス・連絡</h2>
          <div className="mt-6 text-[15px] leading-7 text-gray-800">
            <p>
              会場：奈良県 下市集学校（詳細・地図はアクセスページへ）。最寄りからの送迎やバス案内はDiscordのお知らせをご確認ください。車での来場は指定エリアへ。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/access" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
                アクセス詳細へ
              </Link>
              <Link href="/discord" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
                Discordで質問する
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section id="cta" className="py-12 md:py-16">
        <Container>
          <div className="rounded-3xl border bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold">準備完了！当日を楽しもう</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/discord" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">
                Discordに入る
              </Link>
              <Link href="/tickets" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">
                参加チケットを見る
              </Link>
              <Link href="/" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">
                トップへ戻る
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <Container>© {new Date().getFullYear()} ガチ文化祭 / Gachi Bunkasai</Container>
      </footer>
    </main>
  );
}
