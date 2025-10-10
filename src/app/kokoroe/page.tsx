// app/kokoroe/page.tsx
"use client";

import { Kosugi_Maru } from "next/font/google";
import clsx from "clsx";
import Link from "next/link";

const kosugi = Kosugi_Maru({
  weight: "400",
  subsets: ["latin"], // ← これを追加！
  display: "swap",
});


export default function RulesPage() {
  return (
    <main className={clsx("min-h-screen bg-neutral-900 text-black", kosugi.className)}>
      {/* 背景のうっすらノイズ */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] mix-blend-overlay"
           style={{ backgroundImage: "url('/textures/paper-noise.png')", backgroundSize: "300px" }} />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* タイトル */}
        <header className="mb-6 md:mb-10 text-center">
          <h1 className="text-white tracking-[0.06em] text-[clamp(20px,3vw,24px)] opacity-80">School Rules</h1>
          <h2 className="mt-1 inline-block rounded-full bg-yellow-300/90 px-4 py-1 text-[clamp(26px,6vw,44px)] font-bold tracking-[0.08em] ring-2 ring-black shadow-[0_2px_0_#000]">
            生 徒 心 得
          </h2>
        </header>

        {/* 黄ポスター本体 */}
        <article
          className="relative mx-auto w-full rounded-[18px] bg-[#F6D33E] p-4 md:p-6 lg:p-8 shadow-[0_6px_0_#111,0_20px_40px_rgba(0,0,0,.45)] ring-2 ring-black"
          style={{
            // ほんの少しだけ“貼り紙感”
            transform: "rotate(-0.35deg)",
          }}
        >
          {/* ガムテ風テープ */}
          <span
            aria-hidden
            className="absolute left-8 -top-4 h-6 w-28 rotate-[-6deg] bg-[#d7c392] opacity-90 shadow-[0_2px_0_rgba(0,0,0,.35)] ring-1 ring-black/30"
          />
          <span
            aria-hidden
            className="absolute right-6 -bottom-4 h-6 w-32 rotate-[7deg] bg-[#d7c392] opacity-90 shadow-[0_2px_0_rgba(0,0,0,.35)] ring-1 ring-black/30"
          />

          {/* 紙の薄いグレイン */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[16px] mix-blend-multiply opacity-[0.12]"
            style={{ backgroundImage: "url('/textures/fiber.png')", backgroundSize: "400px" }}
          />

          {/* 見出し（社訓風） */}
          <div className="relative mb-4 md:mb-6">
            <h3 className="text-[clamp(22px,5.4vw,40px)] leading-tight font-extrabold tracking-[0.08em] drop-shadow-[0_2px_0_#000]">
              ガチ文高等学校　生徒心得
            </h3>
          </div>

          {/* 本文：極太ゴシック風に見せるため letter-spacing を詰め気味 */}
          <div className="relative space-y-5 text-[clamp(16px,3.5vw,22px)] leading-[1.9] tracking-[0.02em]">
            {/* 前文 */}
            <section>
              <h4 className="inline-block bg-[#e74a3b] text-white px-2 py-0.5 rounded-sm text-[0.9em] mr-2 align-middle">
                前文
              </h4>
              <p className="mt-2">
                本校生徒は、本校学校目標に則り、青春の向上とタイムマシーン開発を目指し、その理想実現のために自主的活動と理知的言動をもって実践に努め、栄誉ある日本社会の伝統を築くよう努力するものである。
              </p>
            </section>

            {/* 第1章 礼儀 */}
            <section>
              <h4 className="jiro-chap">第1章　礼儀</h4>
              <ol className="jiro-list">
                <li>生徒は来賓、父母、職員に対してはもちろん、学友同士においても礼儀を失わないよう心がけるものとする。</li>
                <li>男女の交際は生徒らしく律儀を守り、明朗健全なものとする。</li>
              </ol>
            </section>

            {/* 第2章 服装・容儀 */}
            <section>
              <h4 className="jiro-chap">第2章　服装・容儀</h4>
              <ol className="jiro-list">
                <li>服装は常に質素、清潔、端正に保ち、本校指定の服装とする。（詳細は別途記載）</li>
              </ol>
            </section>

            {/* 第3章 校内生活 */}
            <section>
              <h4 className="jiro-chap">第3章　校内生活</h4>
              <ol className="jiro-list">
                <li>校内は常に清潔かつ整頓し、エモさに適する環境を作り、学習時間を厳守するものとする。</li>
                <li>校内においては利害関係のある言動を慎み、常に静粛を保つよう心がけるものとする。</li>
                <li>校舎周辺の建物を撮影することを慎み、進入禁止と思われるエリアには踏み込まないものとする。必ず職員または実行委員会の許可を得ることとする。</li>
                <li>校舎、教具その他の公共物は大切に扱うこととし、破損した場合は直ちに職員または実行委員長へ届け出るものとする。</li>
                <li>携帯電話の使用は、文明繁栄に貢献するとみなし特別に許可する。ハッシュタグ「#ガチ文化祭2025」、メンション「@gachibunkasai」を付けたインスタでの発信活動は評価が高いものとする。YouTubeおよびBeRealは禁止とする。使用が発覚した場合は翌朝8時に中庭に集合し、生活指導の司令に従うものとする。</li>
                <li>遺失物、拾得物があった場合は直ちに職員または実行委員長に届け出るものとする。</li>
                <li>何事にも本気で取り組むこととする。中途半端よりも怒られても全力が良しとする。</li>
                <li>本気で取り組みたいことがある場合は、自ら責任をとれる範囲で自由に行動するものとする。</li>
                <li>ここはみんなが生活する場所である。自ら出したごみは自ら分類して捨てるものとする。</li>
              </ol>
            </section>

            {/* 第4章 校外生活 */}
            <section>
              <h4 className="jiro-chap">第4章　校外生活</h4>
              <ol className="jiro-list">
                <li>校外でこそなお一層、いつでも高校生に戻れる社会の共犯者として自覚を失わず行動するものとする。</li>
                <li>深夜帯の外出は職員または実行委員長いずれかに理由および行き先を明らかにするものとする。</li>
                <li>未成年者の喫煙および飲酒は禁止する。</li>
                <li>交通道徳を厳守し、事故等に遭わぬよう十分注意するものとする。また、公衆道徳を重んじ、自らの行動を規制するよう努めるものとする。</li>
              </ol>
            </section>

            {/* 第5章 その他一般 */}
            <section>
              <h4 className="jiro-chap">第5章　その他一般</h4>
              <ol className="jiro-list">
                <li>生徒は暴力行為、威圧行為、窃盗、不純異性交遊、セクシャルハラスメント、当企画に関係のない団体への勧誘活動、その他青春作りを欠く行為、品性の無い言動、社会的に許されざる行為を絶対に行ってはならない。</li>
                <li>生徒間の金銭および物品の貸借、交換は双方同意の上で行うものとする。</li>
                <li>トラブルが生じた場合、必ず当事者間で解決に努めるものとする。職員および実行委員長はこれに関して一切の責任を負わないものとする。</li>
                <li>廊下は危険なので走らないものとする。</li>
                <li>駐車場はグラウンドおよび中庭も利用可能とする。</li>
                <li>校舎内での準備作業は0時から24時までとする。深夜イベント（肝試し等）の終了時間は午前2時完全撤収とする。</li>
                <li>グラウンドや敷地内での話し声等により近隣住民や他生徒に支障がないよう、十分注意するものとする。</li>
                <li>音響やスピーカー等による大きな音出しは屋外は19時まで、屋内は21時までとする。</li>
                <li>本校には校舎内併設の学生寮がある。文化祭期間限定で帰宅せずに準備を進められるよう開放する。土足厳禁で使用すること。</li>
                <li>学生寮への自由立ち入り可能時間は22時から翌朝8時までとする。また、異性の部屋への立ち入りは禁止する。</li>
                <li>睡眠不足は事故につながる危険性がある。自己管理でセーブするものとする。ガチにはなるが無理は禁物である。</li>
                <li>仮想通貨等のキャッシュレス決済は一部店舗のみ取扱うものとする。「あとで払う」はトラブルになるため禁止する。</li>
                <li>準備をサボるところまでは再現不要とする。</li>
              </ol>
            </section>

            {/* 特記事項 */}
            <section>
              <h4 className="jiro-chap">特記事項</h4>
              <p className="mt-2">
                生徒は体力回復のため、基本的に全員入浴し休息を取るものとする。学生寮への立ち入りは、バス乗車前後に荷物を取りに行く時間のみ許可される。入浴にはクラス単位で指定のバスに乗車し、近隣の温泉施設へ向かうこととする。入浴料は一人500円、バス代は往復540円であり、これらは各自で用意すること。あわせて、タオルや石けん等の必要品も各自で持参すること。
              </p>
            </section>

            {/* 下部リンク（任意：トップへ） */}
            <div className="pt-2">
              <Link href="/" className="inline-block rounded-md bg-black text-yellow-300 px-3 py-1.5 text-[0.9em] ring-2 ring-black hover:opacity-90 transition">
                トップへ戻る
              </Link>
            </div>
          </div>
        </article>
      </div>

      {/* ポスター用の軽いCSS */}
      <style jsx global>{`
        .jiro-chap{
          display:inline-block;
          padding:2px 6px;
          border:2px solid #000;
          border-radius:6px;
          background:#000;
          color:#F6D33E;
          font-weight:800;
          letter-spacing:.08em;
        }
        .jiro-list{
          counter-reset: jiro;
          list-style: none;
          padding-left: 0;
          margin-top: 10px;
        }
        .jiro-list > li{
          position: relative;
          padding-left: 2.4em;
          margin: .35em 0;
        }
        .jiro-list > li::before{
          counter-increment: jiro;
          content: counter(jiro, cjk-ideographic) "、";
          position: absolute;
          left: 0; top: 0;
          font-weight: 900;
          text-shadow: 0 2px 0 #000;
        }
        @media print {
          body{ background:#fff !important; }
          main{ background:#fff !important; }
        }
      `}</style>
    </main>
  );
}
