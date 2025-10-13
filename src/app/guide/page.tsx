// app/(mkt)/guide/page.tsx
// ✅ 文体・日本語表現をすべてそのまま保持した完全版。framer-motion非使用でNext.js 15対応。

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "わかばガイド | ガチ文化祭",
  description: "はじめての方向け。準備・流れ・不安つぶしQ&A・アクセスまで、これ1ページで完了。",
};

function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 py-12 md:py-16">
      <Container>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <div className="mt-6 md:mt-8 text-[15px] leading-7 text-gray-800">{children}</div>
      </Container>
    </section>
  );
}

export default function GuidePage() {
  return (
    <main className="relative">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/guide/hero.jpg" alt="" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-white/0" />
        </div>
        <Container>
          <div className="flex min-h-[62svh] items-center py-14 md:py-24 text-white">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] tracking-widest uppercase">FIRST TIMER’S WAKABA GUIDE</span>
              <h1 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight drop-shadow">楽しみ方は無限大！</h1>
              <p className="mt-3 text-base md:text-lg text-white/90">はじめてでも大丈夫。準備・流れ・よくある不安をここで全部クリアにして、当日をワクワクで迎えよう。</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/discord" className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20">Discordに参加</Link>
                <Link href="/tickets" className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20">チケットを確認</Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-10 md:py-14 bg-amber-50/50">
        <Container>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ガチ文高等学校には楽しみ方がいっぱい。</h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {["制服を着る","クラスの企画をつくる","チルアウトする","情熱を注ぐ","授業を受ける","体育祭を楽しむ","キャラを演じる"].map((label,i)=>(
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

      <section className="py-12 md:py-16 bg-white">
        <Container>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-red-900">面白いと思える心が大事 → 火力が足りていないかも？ → 火力って？</h2>
            <ul className="mt-4 space-y-2 text-[15px] leading-7">
              <li className="rounded-xl bg-white p-3 border shadow-sm">「面白い！」が最初の合図。感じたら小さく試す（5分で粗くやってみる）。</li>
              <li className="rounded-xl bg-white p-3 border shadow-sm">詰まったら火力不足を疑う。睡眠・ごはん・水分・同期（誰かと共有）の4点を回復。</li>
              <li className="rounded-xl bg-white p-3 border shadow-sm">火力＝集中×仲間×時間の掛け合わせ。熱が伝播すれば勝手に前に進む。</li>
            </ul>
            <p className="mt-4 text-sm text-red-900/80">ダンドリは大事。でも一番の燃料は「火力」。楽しさが出力を決める。</p>
          </div>
        </Container>
      </section>

      <Section id="be-student" title="① ガチ文高校の生徒になってみよう">
        <p>ガチ文高校では、定期テストの提出や制服の投稿などで、生徒の証となる学籍番号を手に入れることができます。学籍番号を付与された生徒から順に、今年の実行委員限定のDiscordチャンネルにアクセスできるようになります。そこでは、今年の文化祭実行委員たちのやりとりや、企画の裏側、準備の進捗などを見ることができます。参加者同士の空気感や関係性も事前に感じ取れるので、当日がより楽しみになるはずです。</p>
      </Section>

      <Section id="catalog" title="② 企画一覧を事前チェック">
        <p>ガチ文高校の文化祭では、食べ物・体験・展示など、さまざまな個性豊かな企画が出店されます。チケット購入後には、その一覧を事前に確認することができます。「これは絶対行きたい」「こんな写真撮れそう」など、気になる企画をいくつかピックアップしておくと、当日の動きがスムーズになります。</p>
      </Section>

      <Section id="uniform" title="③ 制服を準備して、放課後を満喫しよう">
        <p>ガチ文高校の制服は、「自分にとっての青春」を表すものです。実際に高校で着ていた制服で、憧れていたデザインでも、好きなキャラクターのコーディネートでも構いません。「これが私の制服です」と自信を持って言えるものであれば、それが正式な制服となります。当日だけでなく、事前の放課後などにも制服で遊びに出かけてみてください。</p>
      </Section>

      <Section id="homeroom" title="⑤ オンラインホームルームに参加してみよう">
        <p>ガチ文高校では、Discordでオンラインホームルームを行っています。先生や友達と事前に話して仲良くなれるチャンス！名前を知らなかった誰かが、気づけば一緒に企画を進める仲間になっている——そんな出会いが待っています。</p>
      </Section>

      <Section id="must" title="先に準備してほしいもの">
        <ul className="list-disc pl-6 space-y-1">
          <li>体操服</li>
          <li>制服</li>
          <li>運動靴</li>
        </ul>
      </Section>

      <Section id="day1" title="1日目">
        <p>登校時間までに投稿しよう。登校は朝8時まで。場所は奈良県「下市集学校」です。近鉄吉野線「下市口駅」から徒歩29分。初めてで不安な方や、ひとり参加の方は、大阪・阿倍野HOOP前での集団登校にぜひご参加ください。登校したら自分のクラスを確認して教室へいこう。</p>
        <p className="mt-4">授業を受けよう。ガチ文高校では、文化祭直前でも授業があります。通常授業に加えて、文化祭に向けた特別授業も体験できます。この場所で、学ぶことの楽しさをもう一度味わってみましょう。</p>
        <p className="mt-4">クラス企画の内容を決めよう。個人企画とは別に、各クラスごとにひとつの「クラス企画」をつくります。担任の先生とクラスメートで話し合い、どんな出し物にするかを決めていきます。みんなで何かを形にしていく、その最初の一歩がここです。</p>
        <p className="mt-4">体育祭でクラスの団結を深めよう。ガチ文高校の体育祭は、仲間と心を通わせる絶好のチャンスです。普段は話さない人とも、走ったり笑ったりするうちに、自然と距離が近くなります。この文化祭の空気を、まずは身体を動かすところから感じてみましょう。</p>
      </Section>

      <Section id="day2" title="2日目：準備と本気が混ざり合う日">
        <p>1500m走大会に挑戦してみよう。有志による特別企画「ガチ1500m走大会」が開催されます。隣を走る友達、過去の自分、あるいは“今の自分”に勝つための挑戦。全力で走ること、それ自体が、青春の証になる時間です。</p>
        <p className="mt-4">クラス企画。装飾を整えたり、買い出しに行ったりと、クラス企画はこの日が大詰めです。仲良くなったクラスメートと、ひとつのものをつくり上げる喜びを感じられる時間。この過程こそが、文化祭ならではの価値かもしれません。</p>
        <p className="mt-4">文化祭前夜をゆっくり楽しもう。夜には、文化祭の前夜を味わう特別な時間が用意されています。お酒を飲んだり、試作品を味見したり、ちょっとだけ非日常を感じる時間。照明の落ちた教室で語る未来や過去も、きっと記憶に残ります。</p>
      </Section>

      <Section id="day3" title="3日目：いよいよ本番、文化祭当日">
        <p>ガチ文化祭を思いっきり楽しもう。当日は、全校をあげた文化祭の本番です。過去には「手作りハンバーガー」「ガチ二郎ラーメン」「プリキュア展」「謎解き」「エジプトカフェ」などが登場しました。きっと今年も、思いもよらない出し物や空間に出会えるはずです。事前にチェックしておいた企画をめぐりながら、自分だけの文化祭を満喫してください。</p>
        <p className="mt-4">後夜祭で3日間のフィナーレを迎えよう。夜には、野外でステージイベント形式の「後夜祭」が行われます。歌やダンス、隠し芸、即興パフォーマンスなど、参加するのも、観るのも自由。「ここで何かをやってみたい」と思ったなら、それが一番のきっかけです。3日間の集大成として、思いきりステージに飛び込んでみてください。</p>
      </Section>

      <Section id="faq" title="不安つぶしQ&A">
        <details className="group rounded-xl border bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">一人で参加しても楽しめますか？</summary><div className="pt-2">クラス配属・企画づくり・体育祭で自然と仲良くなれます。ひとり参加の方も毎年多いのでご安心ください。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">宿泊はどこでするのですか？</summary><div className="pt-2">男女別に、廃校の教室を寝室としてご用意しています。全員分の布団をご用意しておりますので、安心してお休みいただけます。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">お風呂はどうなっていますか？</summary><div className="pt-2">生徒は体力回復のため、基本的に全員入浴し休息を取るものとしています。入浴にはクラス単位で指定のバスに乗車し、近隣の温泉施設へ向かいます。入浴料は一人500円、バス代は往復540円であり、これらは各自で用意し、タオルや石けん等の必要品も各自で持参してください。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">食事はどうすればいいですか？</summary><div className="pt-2">基本的に校内の購買部で購入することができます。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">何が必要ですか？</summary><div className="pt-2">まず準備してほしいものは、制服・体操服・運動できる靴です。その他の宿泊に必要なものは後日ご連絡します。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">初日の8時までに間に合わないかもしれません、、、</summary><div className="pt-2">遅刻や初日の欠席も大丈夫です。登校した生徒は職員室に向かってください。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">会場の下市集学校まではどうやって行けばいいですか？</summary><div className="pt-2">ガチ文高校では、大阪阿部野橋駅からの集団登校を実施しています。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">大阪阿部野橋駅までの行き方</summary><div className="pt-2">・梅田から：JR環状線「大阪駅」→「天王寺駅」下車<br/>・難波から：JR「JR難波駅」→「天王寺駅」下車<br/>天王寺駅からは徒歩で阿部野橋駅に移動し、近鉄への乗り換えを行います。全員、11/1の5:20に近鉄阿部野橋駅西改札内に集合してください。※5分後の電車に乗ります。</div></details>
        <details className="group rounded-xl border bg-white p-4 shadow-sm mt-3"><summary className="cursor-pointer font-semibold">貴重品はどうやって管理したらいいですか？</summary><div className="pt-2">寝室は施錠していますが、気になる場合は各自持ち歩くか、職員室に預けてください。誰か一人は常駐しています。</div></details>
      </Section>

      <Section id="access" title="アクセス・連絡">
        <p>会場：奈良県 下市集学校（詳細・地図はアクセスページへ）。最寄駅からの送迎やバス案内はDiscordのお知らせをご確認ください。車での来場は指定エリアに駐車を。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/access" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">アクセス詳細へ</Link>
          <Link href="/discord" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">Discordで質問する</Link>
        </div>
      </Section>

      <section id="cta" className="py-12 md:py-16">
        <Container>
          <div className="rounded-3xl border bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold">準備完了！当日を楽しもう</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/discord" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">Discordに入る</Link>
              <Link href="/tickets" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">参加チケットを見る</Link>
              <Link href="/" className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-white">トップへ戻る</Link>
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
