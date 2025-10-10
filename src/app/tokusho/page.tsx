// src/app/tokushoho/page.tsx
"use client";

import { Kosugi_Maru } from "next/font/google";
import Link from "next/link";

const kosugi = Kosugi_Maru({
  weight: "400",
  subsets: ["latin"], // 🔧 preloadエラー防止
  display: "swap",
});

export default function TokushohoPage() {
  return (
    <main
      className={`${kosugi.className} bg-white text-gray-800 px-6 py-12 md:px-16 md:py-20`}
    >
      <div className="max-w-3xl mx-auto">
        {/* ===== 見出し ===== */}
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-black">
          特定商取引法に基づく表記
        </h1>

        {/* ===== 内容 ===== */}
        <div className="space-y-6 leading-relaxed text-[15px] md:text-[16px]">
          <section>
            <h2 className="font-bold text-lg mb-2">販売事業者名</h2>
            <p>ThanatosGames（タナトスゲームズ）<br />東大福炎山友秋事務所（ひがしだいふくえんざんともあきじむしょ）</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">運営統括責任者</h2>
            <p>宮代 健太（みやしろけんた）</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">所在地</h2>
            <p>大阪府大阪市西区九条1丁目</p>
            <p className="text-sm text-gray-600">
              ※詳細所在地はご請求があった場合、遅延なく開示いたします。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">お問い合わせ先</h2>
            <p>
              メールアドレス：
              <a
                href="mailto:info@gachibunkasai.com"
                className="text-blue-600 underline"
              >
                info@gachibunkasai.com
              </a>
            </p>
            <p>対応時間：平日10:00〜18:00（土日祝を除く）</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">販売URL</h2>
            <p>
              <a
                href="https://www.gachibunkasai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                https://www.gachibunkasai.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">販売価格</h2>
            <p>各イベントページ・販売ページに記載（税込価格で表示）。</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">販売数量</h2>
            <p>各イベントの定員数に応じて販売数を制限する場合があります。</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">お支払い方法</h2>
            <ul className="list-disc list-inside">
              <li>クレジットカード（VISA / MasterCard / AMEX など）</li>
              <li>コンビニ支払い</li>
              <li>PayPay・電子マネー（対象イベントのみ）</li>
              <li>当日現金払い可</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">お支払い時期</h2>
            <p>
              ご注文確定時にお支払いが発生します。コンビニ決済の場合は指定期限内にお支払いください。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">商品引渡し時期</h2>
            <p>購入完了後、即時メールまたはチケットページにてご案内いたします。</p>
            <p>11月1日(土)9時前後または遅刻の場合、会場到着時に入場確認を行います。</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">商品引渡し方法</h2>
            <p>電子チケットまたは当日受付にて入場確認。</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">返品・キャンセルについて</h2>
            <p>
              性質上、購入確定後のキャンセル・返金は原則お受けできません。
              ただし、主催者側都合による中止の場合は全額返金いたします。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">中止・延期について</h2>
            <p>
              天候・災害・会場トラブル等により開催を中止または延期する場合があります。
              対応については公式サイトおよびメールにてご案内します。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">動作環境・免責事項</h2>
            <p>
              オンラインサーバー参加時の通信環境・端末仕様により正常動作しない場合があります。
              通信費・機材費・交通費・食費などの生活費等はお客様のご負担となります。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">表現・再現性に関する注意</h2>
            <p>
              イベント内の演出・体験・映像表現は一部フィクションを含みます。
              効果・結果には個人差があり、再現性を保証するものではありません。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">個人情報の取り扱い</h2>
            <p>
            取得した個人情報は、イベント運営・連絡・販売管理以外の目的では使用いたしません。
            詳細は{" "}
            <Link
                href="/privacy"
                className="text-blue-600 underline hover:text-blue-800"
            >
                プライバシーポリシー
            </Link>
            をご確認ください。
            </p>

          </section>
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
