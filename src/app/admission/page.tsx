// app/admission/page.tsx
export const metadata = {
  title: "アドミッション・ポリシー | ガチ文高等学校",
  description: "ガチ文高等学校の教育方針・アドミッション/グラデュエーション・ポリシー",
};

type Pillar = { en: string; jp: string; desc: string };

const PILLARS: Pillar[] = [
  { en: "Youth", jp: "青春", desc: "過去と未来と今の間" },
  { en: "Symbiosis", jp: "共生", desc: "協力関係を結ぶ重要性" },
  { en: "Soul Token", jp: "魂トークン", desc: "昔の自分から見て今の自分はカッコいいか？" },
];

export default function AdmissionPage() {
  return (
    <main className="bg-white text-slate-800">
      {/* ===== Hero（白×ネイビー） ===== */}
      <section className="relative overflow-hidden">
        <img
          src="/headers/admission-hero.jpg"
          alt=""
          className="w-full h-[28svh] md:h-[36vh] object-cover"
          draggable={false}
        />
        {/* ブルー系の薄い被せ＋上部の白グラ */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.85)_0%,rgba(233,241,251,.85)_35%,rgba(233,241,251,.6)_100%)]" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="text-center font-extrabold tracking-wide text-[clamp(20px,4.8vw,40px)] text-[#103B73]">
            アドミッション・ポリシー
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* ===== 0 教育方針 ===== */}
        <section className="py-12 md:py-16">
          <div className="rounded-2xl border border-blue-100 bg-[#F5F9FF] p-6 md:p-8 shadow-[0_8px_22px_rgba(16,59,115,.06)]">
            <p className="text-sm font-semibold tracking-widest text-[#1E5AA8]">教育方針</p>
            <h2 className="mt-2 text-[clamp(28px,6.2vw,48px)] font-extrabold text-[#103B73] leading-tight">
              臥薪嘗胆
            </h2>
            <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed">
              由来：苦難に耐え、志を胸に磨き続けること。困難を糧にして前へ進む姿勢を本校の基調とします。
            </p>
          </div>
        </section>

        {/* ===== 1 教育理念 ===== */}
        <section className="py-10 md:py-14">
          <header className="mb-4">
            <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">
              教育理念：魂の熱量は数値を超える
            </h3>
          </header>
          <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm">
            <img
              src="/past/A.jpg"
              alt="教育理念"
              className="w-full h-auto object-cover"
              draggable={false}
            />
          </figure>
          <p className="mt-4 text-[15px] md:text-[16px] leading-relaxed">
            魂の熱量が異常に高い生徒たちは、論理や偏差値で測れない世界に生きている。彼らは常識の枠を超えて、自分の内なる衝動や物語に従って動き出します。評価軸を卒業した生徒。「やらずにはいられない衝動」で動く生徒。世界のバランスを揺るがす原動力を持つ生徒。カテゴライズできない生き方をしている、創造者・表現者・革命家。“次元を超えた存在”として、既存の評価システムからドロップアウトしながら世界を創り変えている。偏差値が高くても、魂の熱量が低ければ、ここでは力を発揮できません。右上（偏差値・熱量ともに高い）が理想ではありますが、右下（偏差値低め・魂MAX）こそ、未来の企画王たちです。私たちが求めるのは、学力以上に「物語を生きる力」を持った仲間たちです。
          </p>
        </section>

        {/* ===== 2 求める生徒 ===== */}
        <section className="py-10 md:py-14">
          <header className="mb-4">
            <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">求める生徒</h3>
          </header>
          <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm">
            <img
              src="/past/B.png"
              alt="求める生徒"
              className="w-full h-auto object-cover"
              draggable={false}
            />
          </figure>
          <p className="mt-4 text-[15px] md:text-[16px] leading-relaxed">
            本校では陽キャインフルエンサーを拒むことはありません。しかし本校の文化で大切にしているのはここでいう「空想初心者」が「引きこもりアーティスト」恥ずかしいことを真剣にできる生徒を求めています。
          </p>
        </section>

        {/* ===== 3 資質・人物項目 ===== */}
        <section className="py-10 md:py-14">
          <header className="mb-4">
            <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">
              本校が歓迎する資質・人物項目
            </h3>
          </header>
          <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm">
            <img
              src="/past/C.png"
              alt="歓迎する資質・人物項目"
              className="w-full h-auto object-cover"
              draggable={false}
            />
          </figure>
          <p className="mt-4 text-[15px] md:text-[16px] leading-relaxed">
            これらの特性は「偏差値」では測れませんが、「魂の熱量」によって見えてまいります。あなたの情熱が私たちの基準です。
          </p>
        </section>

{/* ===== 3つの丸（常に横3つ） ===== */}
<section className="py-12 md:py-16 border-y border-blue-100 bg-[#F8FBFF]">
  <h3 className="text-center text-[clamp(18px,4vw,28px)] font-bold text-[#103B73]">
    3つのテーマ
  </h3>

  {/* 👇 常に3列。ギャップは狭め、スマホで収まりやすく */}
  <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-6 place-items-center">
    {PILLARS.map((p, i) => (
      <div key={i} className="text-center">
        <div
          className="
            rounded-full grid place-items-center text-white
            shadow-[0_10px_30px_rgba(16,59,115,.18)] ring-1 ring-blue-200
            bg-[radial-gradient(100%_100%_at_50%_0%,#3B82F6_0%,#1E5AA8_55%,#103B73_100%)]
            /* 👇 可変サイズ（最小/最大を設定） */
            w-[28vw] h-[28vw] min-w-[84px] min-h-[84px] max-w-[160px] max-h-[160px]
          "
        >
          <div className="px-2">
            <div className="text-[13px] sm:text-[16px] font-semibold leading-tight">
              {p.en}
            </div>
            <div className="text-[10px] sm:text-xs opacity-80 mt-0.5 leading-none">
              {p.jp}
            </div>
            <div className="mt-1 text-[11px] sm:text-[14px] font-bold leading-snug">
              {p.desc}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>


        {/* ===== 4 グラデュエーション・ポリシー ===== */}
        <section className="py-10 md:py-14">
          <header className="mb-4">
            <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">
              グラデュエーション・ポリシー
            </h3>
          </header>
          <figure className="rounded-xl overflow-hidden ring-1 ring-blue-100 shadow-sm">
            <img
              src="/past/D.png"
              alt="グラデュエーション・ポリシー"
              className="w-full h-auto object-cover"
              draggable={false}
            />
          </figure>
          <p className="mt-4 text-[15px] md:text-[16px] leading-relaxed">
            時を巻き戻すのではなく、時を超える。青春は作るものだ。与えられるものではない。「意味があるか」よりも「面白いか」で動け。終了時、あの時間は人生だったと思えたこと。クラスメイトの誰か一人に「お前と出会えてよかった」と思えたこと。夜に空を見上げて「なんか、良かったな」とつぶやけたこと。
          </p>
        </section>

        {/* ===== フィロソフィー説明 ===== */}
        <section className="py-12 md:py-16">
          <h3 className="text-[clamp(20px,4.4vw,30px)] font-bold text-[#103B73]">
            ガチ文化祭の二本柱と哲学
          </h3>

          <div className="mt-6 space-y-8">
            <div className="rounded-xl border border-blue-100 bg-white p-6 md:p-7 shadow-sm">
              <h4 className="text-lg font-bold text-[#1E5AA8]">
                企画：自己実現の Minimum Viable Product を可視化する
              </h4>
              <p className="mt-2 text-[15px] md:text-[16px] leading-relaxed">
                ガチ文化祭の企画はいわゆる”インスタ映え”に散見する『コスプレとしてのアイデンティティの確立』ではなく、『過去と未来と今を昇華した自分自身への希望と迫力を表現』することに本当の楽しさがある。強いて言えば『インスタ映えを兼ね備えた自己理念の凄み』を自他ともに垣間みることに”開かれた思想感”があるのが良い。Minimum Viable Productとは、必要最低限の価値がある製品という、ビジネスにおけるスタートアップ哲学により説明が成された定義である。今すぐに自己実現をやり切る、などできなくとも、短期間で可視化する。余韻を感じる。切り取れる領域で価値提供を具現化する。それに挑戦する意義は大いにある。これらを、冒頭の文脈と共に実践可能にしたのがガチ文化祭における企画であり存在意義である。
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-6 md:p-7 shadow-sm">
              <h4 className="text-lg font-bold text-[#1E5AA8]">
                クラス：公共精神を体得し、帰属・協力意識を深化する
              </h4>
              <p className="mt-2 text-[15px] md:text-[16px] leading-relaxed">
                ガチ文化祭のクラスは、ランダム性を孕んで知り合った実行委員と、青春という不確実な概念を推進する大義のもとに数日間コミュニケーションを取らざるを得ないことに価値を見出している。学校生活の入学・進級に見られる『すでに決められたクラス』では半強制的かつランダム性の高い振り分けがされ、共生を求められる、学校行事は何らかの達成を課され、全く認識していない他人から毎時自己開示をする身内まで網羅的に関わる必要がある。ガチ文化祭ではこれを再現し、クラス企画実現の過程で生じる、準備における意見の相違、モチベーションの差による問題に対し、衝突や助け合いを通して、国や社会の問題を自分自身の問題として捉え行動する精神や、グループ、集団に対する一体感、協力関係を結ぶことの重要性を示唆する機能を高めることに重きを置いている。
              </p>
            </div>
          </div>
        </section>

        <div className="h-16" />
      </div>
    </main>
  );
}
