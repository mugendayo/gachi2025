"use client";

import { Kosugi_Maru } from "next/font/google";
import Link from "next/link";

const kosugi = Kosugi_Maru({
  weight: "400",
  subsets: ["latin"], // preloadエラー防止
  display: "swap",
});

export default function PrivacyPolicyPage() {
  return (
    <main
      className={`${kosugi.className} bg-white text-gray-800 px-6 py-12 md:px-16 md:py-20`}
    >
      <div className="max-w-3xl mx-auto">
        {/* ===== 見出し ===== */}
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-black">
          プライバシーポリシー
        </h1>

        {/* ===== 内容 ===== */}
        <div className="space-y-6 leading-relaxed text-[15px] md:text-[16px]">
          <p>
            ThanatosGamesまたは東大福炎山友秋事務所（以下、「当団体」）は、イベント・オンラインサービス・
            コミュニティ運営等を通じて取得する個人情報の保護を重要な責務と考え、
            以下のとおりプライバシーポリシー（個人情報保護方針）を定めます。
          </p>

          <section>
            <h2 className="font-bold text-lg mb-2">第1条（個人情報の定義）</h2>
            <p>
              「個人情報」とは、氏名・住所・電話番号・メールアドレスなど、特定の個人を識別できる情報を指します。
              単体では識別できない情報であっても、他の情報と照合することで個人を特定できるものを含みます。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第2条（個人情報の取得方法）</h2>
            <p>
              当団体は、イベント申込フォーム、アンケート、チケット販売システム（LivePocket等）、
              SNSメッセージなどを通じて、利用者から必要最小限の個人情報を取得します。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第3条（個人情報の利用目的）</h2>
            <ul className="list-disc list-inside">
              <li>イベントの案内・運営・入場管理のため</li>
              <li>チケット販売・決済処理のため</li>
              <li>お問い合わせへの対応および本人確認のため</li>
              <li>新企画やキャンペーン等のご案内のため</li>
              <li>アンケート・統計資料作成のため</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第4条（個人情報の第三者提供）</h2>
            <p>
              当団体は、法令に基づく場合を除き、本人の同意を得ずに個人情報を第三者に提供しません。
              ただし、決済や運営に必要な範囲で委託先に提供することがあります。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第5条（個人情報の管理）</h2>
            <p>
              取得した個人情報を適切に管理し、漏洩・滅失・改ざんなどの防止に努めます。
              関係者以外がアクセスできないよう、物理的・電子的セキュリティ対策を行います。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第6条（個人情報の開示・訂正・削除）</h2>
            <p>
              ご本人から個人情報の開示・訂正・削除を求められた場合、本人確認のうえ速やかに対応します。
              ご連絡は下記メールアドレスまでお願いいたします。
              <br />
              メール：<a href="mailto:info@gachibunkasai.com" className="text-blue-600 underline">info@gachibunkasai.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第7条（Cookieおよびアクセス解析）</h2>
            <p>
              当サイトではサービス向上のためCookieを使用する場合があります。
              これにより匿名のトラフィックデータを収集しますが、個人を特定する情報は含みません。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">第8条（法令・規範の遵守と見直し）</h2>
            <p>
              当団体は、個人情報に関する法令およびその他の規範を遵守します。
              また、本ポリシーの内容を随時見直し、改善を行います。
            </p>
          </section>

          <p className="text-sm text-gray-600 mt-8">
            制定日：2025年10月1日<br />
            ThanatosGames（タナトスゲームズ）　東大福炎山友秋事務所代表 宮代健太
          </p>
        </div>

        {/* ===== 戻るリンク ===== */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block text-blue-600 underline hover:text-blue-800 transition"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
