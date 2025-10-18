// ❌ 「use client」は付けない（Server Component のまま）
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { SimpleSlider, type Slide } from "./ClientParts";
import TeachersSection from "./TeachersSection";

// =====================================
// Metadata
// =====================================
export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description:
    "はじめての方向け。準備・流れ・不安つぶしQ&A・アクセスまで、これ1ページで完了。",
};

// =====================================
// 小さめユーティリティ
// =====================================
function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 md:py-16">
      <Container>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <div className="mt-6 md:mt-8 text-[15px] leading-7 text-gray-800">{children}</div>
      </Container>
    </section>
  );
}

/** ワンポイント小窓（あとからアイコン差し替えしやすい作り） */
function Tips({
  title = "ワンポイント",
  icon = "/icons/tip-placeholder.png", // 後からCanva出力に差し替えOK
  children,
}: {
  title?: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 grid grid-cols-[44px_1fr] gap-3 rounded-xl border bg-white p-3 shadow-sm">
      <div className="relative h-11 w-11 overflow-hidden rounded-lg ring-1 ring-gray-200 bg-gray-50">
        {/* 画像差し替え前でも崩れないように alt は空 */}
        <Image src={icon} alt="" fill className="object-contain p-1.5" />
      </div>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="mt-1 text-[14px] leading-6 text-gray-700">{children}</div>
      </div>
    </div>
  );
}

// =====================================
// Page
// =====================================
export default function GuidePage() {
  // 後夜祭スライド（6枚：2019, 2021, 2022, 2023, 2024, ゆうせい）
  const kouyasaiSlides: Slide[] = [
    { src: "/images/kouyasai/2019.jpg", caption: "2019 後夜祭" },
    { src: "/images/kouyasai/2021.jpg", caption: "2021 後夜祭" },
    { src: "/images/kouyasai/2022.jpg", caption: "2022 後夜祭" },
    { src: "/images/kouyasai/2023.jpg", caption: "2023 後夜祭" },
    { src: "/images/kouyasai/2024.jpg", caption: "2024 後夜祭" },
    {
      src: "/images/kouyasai/yusei.jpg",
      caption: "担当：ゆうせい（クリエイティブ学科 首席合格）",
    },
  ];

  return (
    <main className="relative">
      {/* ===================== Hero ===================== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/guide/hero.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center"
          />
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

                {/* Q&Aへ飛ぶ派手ボタン（上部に追加） */}
                <a
                  href="#faq"
                  className="relative rounded-2xl px-4 py-2 text-sm font-extrabold tracking-wide ring-2 ring-yellow-300/80 bg-yellow-300 text-black shadow-[0_10px_26px_rgba(0,0,0,.25)] hover:bg-yellow-200 transition animate-bounce"
                  aria-label="不安つぶしQ&Aにジャンプ"
                >
                  ❓ 不安つぶしQ&Aへ
                  <span className="absolute -inset-y-2 -left-1/3 w-1/2 rotate-12 rounded-2xl opacity-50 blur-sm pointer-events-none" />
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===================== 楽しみ方タイル ===================== */}
      <section className="py-10 md:py-14 bg-amber-50/50">
        <Container>
          <h2 className="text-2xl md:3xl font-bold tracking-tight">
            ガチ文高等学校には楽しみ方がいっぱい。
          </h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              "制服を着る",
              "クラスの企画をつくる",
              "チルアウトする",
              "情熱を注ぐ",
              "授業を受ける",
              "体育祭を楽しむ",
              "キャラを演じる",
            ].map((label, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative h-36 w-36 md:h-44 md:w-44 rounded-full overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 text-sm">{label}</span>
                </div>
                <div className="mt-3 font-semibold text-green-700">{label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

<TeachersSection />

      {/* ===================== 準備系：①②③（④は削除して繰り上げ） ===================== */}
      <Section id="be-student" title="① ガチ文高校の生徒になってみよう">
        <p>
          定期テストの提出や制服の投稿などで学籍番号を手に入れられます。学籍番号の付与順に、今年の実行委員限定Discordチャンネルへアクセス可能。準備の裏側や関係性を事前に感じ取れて、当日がもっと楽しみになります。
        </p>
        <Tips title="豆知識">
          学籍番号があるとDiscord内の限定情報・連絡が見やすくなります。
        </Tips>
      </Section>

      <Section id="catalog" title="② 企画一覧を事前チェック">
        <p>
          食べ物・体験・展示など、多彩な企画が並びます。チケット購入後に一覧を確認できるので、「絶対行きたい」をいくつかピックしておくと当日動きやすいです。
        </p>
        <Tips title="ワンポイント">
          行きたい企画を3つだけ決めておくと、当日の満足度がグンと上がります。
        </Tips>
      </Section>

      <Section id="uniform" title="③ 制服を準備して、放課後を満喫しよう">
        <p>
          「自分にとっての青春」を表すものが制服です。実際の制服、憧れのデザイン、推しのコーデでもOK。
          「これが私の制服！」と言えるものであれば正装。事前の放課後も制服で遊びに出かけてみてください。
        </p>
        <Tips title="写真のコツ">
          背景をシンプルにして逆光を避けるだけで、SNS映えが安定します。
        </Tips>
      </Section>

      <Section id="homeroom" title="④ オンラインホームルームに参加してみよう">
        <p>
          DiscordでオンラインHRを開催。先生や友達と事前に話して仲良くなるチャンス。いつの間にか、一緒に企画を進める仲間ができます。
        </p>
        <div className="mt-3">
          <Link href="/discord" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Discordに入る
          </Link>
        </div>
        <Tips title="入室の不安">
          マイクや顔出しは無理しなくてOK。聞くだけ参加から始めましょう。
        </Tips>
      </Section>

      {/* ===================== 持ち物（指定リストに置換） ===================== */}
      <Section id="packing" title="持ち物">
        <div className="prose max-w-none text-[15px]">
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
      </Section>

      {/* ===================== 1日目（全員集団登校の文脈に） ===================== */}
      <Section id="day1" title="1日目：集団登校・授業・クラス企画の初動">
        <p>
          登校は朝8時まで。会場は奈良県「下市集学校」。基本的に
          <strong>全員、集団登校</strong>
          に参加します（大阪・阿倍野HOOP前 集合）。到着後はクラスを確認して教室へ。
        </p>
        <p className="mt-4">
          授業を受けよう。通常授業＋特別授業で「学ぶ楽しさ」を再起動。クラス企画はこの日がキックオフです。
        </p>
        <Tips title="迷子になったら">
          集合場所の写真をスマホに保存。時間と改札名もメモに控えておくと安心。
        </Tips>
      </Section>

      {/* ===================== 2日目 ===================== */}
      <Section id="day2" title="2日目：準備と本気が混ざり合う日">
        <p>
          有志の「ガチ1500m走大会」に挑戦してみよう。隣を走る友達、過去の自分、今の自分に勝つための挑戦。
        </p>
        <p className="mt-4">
          クラス企画は大詰め。装飾・買い出し・役割分担、衝突や助け合いを通じて「一体感」が育ちます。
        </p>
        <p className="mt-4">
          夜は「文化祭前夜」を味わう特別な時間。少し非日常な空気で、未来や過去を語ろう。
        </p>
        <Tips title="火力の回復">
          睡眠・ごはん・水分・同期（誰かと共有）の4点が満タンかを毎回チェック。
        </Tips>
      </Section>

      {/* ===================== 3日目 + 後夜祭スライダー ===================== */}
      <Section id="day3" title="3日目：いよいよ本番、文化祭当日">
        <p>
          「手作りハンバーガー」「ガチ二郎ラーメン」「プリキュア展」「謎解き」「エジプトカフェ」など、毎年サプライズだらけ。
          事前にチェックした企画を巡って、自分だけの文化祭を満喫しよう。
        </p>

        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 md:p-6">
          <h3 className="text-xl md:text-2xl font-extrabold text-blue-900">後夜祭</h3>
          <p className="mt-2 text-[15px] leading-7 text-blue-900/90">
            校舎をステージとして、3日間文化祭を作り上げた学校に響き渡るみんなの熱量と音楽で最高の時間をともに過ごそう！
          </p>
          <div className="mt-4">
            <SimpleSlider slides={kouyasaiSlides} />
          </div>
        </div>
      </Section>

      {/* ===================== 不安つぶしQ&A（修正入り） ===================== */}
      <Section id="faq" title="不安つぶしQ&A">
        <details className="group rounded-xl border bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">一人で参加しても楽しめますか？</summary>
          <div className="pt-2">
            クラス配属・企画づくり・体育祭で自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">宿泊はどこでするのですか？</summary>
          <div className="pt-2">
            男女別に廃校の教室を寝室としてご用意。全員分の布団を準備しています。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">お風呂はどうなっていますか？</summary>
          <div className="pt-2">
            生徒は体力回復のため基本的に全員入浴します。クラス単位で指定バスに乗車し、近隣の温泉施設へ。
            入浴料500円、往復バス代540円は各自用意。タオルや石けん等も各自持参してください。
          </div>
        </details>

        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3">
          <summary className="cursor-pointer font-semibold">食事はどうすればいいですか？</summary>
          <div className="pt-2">
            基本は校内の購買部で購入できます。＜ラインナップ例＞軽食（パン・おにぎり）／
            温かい麺類／ドリンク各種 など。<br />
            <strong>アレルギー対応</strong>：パッケージ表示の確認・別ラインの用意等でできる限り配慮します。必要があれば
            事前に担任の先生へ必ずご相談ください。
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
          <summary className="cursor-pointer font-semibold">
            初日の8時までに間に合わないかもしれません…
          </summary>
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
      </Section>

      {/* ===================== アクセス・連絡 ===================== */}
      <Section id="access" title="アクセス・連絡">
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
      </Section>

      {/* ===================== CTA ===================== */}
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

      {/* ===================== Footer ===================== */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <Container>© {new Date().getFullYear()} ガチ文化祭 / Gachi Bunkasai</Container>
      </footer>
    </main>
  );
}
