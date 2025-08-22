"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";

// これをファイル上部に置く（重複宣言しない）
const imgVariants: Variants = {
  initial: { opacity: 0, x: 24, scale: 0.98 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: -24,
    scale: 0.98,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};


/** 画像は /public/chars/*.jpg に入れてください（横長 16:9 推奨） */
type Line = { text: string };
type Character = {
  id: string;
  name: string;
  title?: string;
  image: string;      // ex) "/chars/01.jpg"
  accent?: string;    // ボーダー/ハイライト色
  lines: Line[];      // 複数可（次へで進む）
};

const CHARACTERS: Character[] = [
  {
    id: "a",
    name: "新山ガノンドロフ先生",
    title: "主人公界隈",
    image: "/chars/01.png",
    accent: "#22d3ee",
    lines: [
      { text: "この高校で体育祭を担当している。新山です。知っているだろうか。今年のガチ文化祭で一番注目されるのは、生徒ではない。" },
      { text: "ボクこそが、生徒の生きる希望だ。ハッハハハハ！！" },
    ],
  },
  {
    id: "b",
    name: "志道マモル",
    title: "指導教諭",
    image: "/chars/02.png",
    accent: "#f59e0b",
    lines: [{ text: "ガチ文高等学校では、いつでも高校生に戻れる社会の実現のため、一生ガチ文化祭をするために、たくさんの掟があります。あ、申し遅れました。私はガチ文高等学校で1500mの授業そして生徒指導を担当しております志道マモルと申します。" },
        { text: "掟を守り、歴史をつむぐ。そのために指導というものは存在するのです。指導とは校則であり、本当の幸福とは、制約のなかの自由なのです！" },
    ],
  
},
  {
    id: "c",
    name: "志道シナイ",
    title: "マージャン部の顧問",
    image: "/chars/03.png",
    accent: "#ef4444",
    lines: [{ text: "んーテレビもねえ。ラジオもねえ。上着もズボンも履いてねえ。グルメなら、いつだって、何を食っても当ててやれ。去年は脱衣でマージャン。今年は格付けマージャン？いや脱衣？私がウワサのガチ文経費王。志道シナイでございますの。" },
            { text: "ベルファイヤ、インフルエンザ、いつまで経っても変わらない。俺だけ人と違うこと。自分だけ変なこと。それが志道シナイとしての信念。ガチ文高等学校での最大火力ですのよ。覚えてらっしゃい！" }
    ],
  },
  {
    id: "d",
    name: "GACKT",
    title: "ヘルボール同好会",
    image: "/chars/04.png",
    accent: "#8b5cf6",
    lines: [{ text: "『仕事が辛い。転職を考えている。』と相談されることがある。「変えたきゃ変えろよ」と答えると『いや、でも・・・』と別の言葉が出てくる。「だったら続けろよ」と言うと、『好きだったことが嫌いになるのが怖い』という。こんなやりとりを今まで何十回してきただろう？" },
            { text: "ボクがやっていることを実践してみてほしい。「どうやって面白さを見出せる自分になるか」を考えながら取り組むだけだ。「好き・楽しい」はある程度、楽な状態でしか感じられない。「面白い」はしんどい状況でも感じられる。この２つの違うは大きい。「面白い」をどんなことにも見つけられるクセをつける。もし、長続きしないと思う自身がいるなら試してみてくれ。" },
            { text: "最後にはなるが、ボクたちが、このガチ文高等学校の神童。GACKT（学徒）だ。よろしく。" }
    ],
  },
  {
    id: "e",
    name: "斬島悪暁",
    title: "教務主任",
    image: "/chars/05.png",
    accent: "#10b981",
    lines: [{ text: "教育の母体は子どもである。教育者は、その成長を促進させるものであり、教育者はそこに自我は必要ない。教育者は道具である、という認識を持ったうえで、学校運営をするべきである。" }],
  },
  {
    id: "f",
    name: "片野ユニコーン様",
    title: "卒業写真部",
    image: "/chars/06.png",
    accent: "#eab308",
    lines: [{ text: "卒業卒業ってよー、いったい何から卒業するんだろうな！？" },
          { text: "青春を留年しような。それでもハッピーさ。" }
    ],
  },
  {
    id: "g",
    name: "アマノジャキ",
    title: "最大火力",
    image: "/chars/07.png",
    accent: "#60a5fa",
    lines: [{ text: "結局ガチ文化祭っつーのはさ、俺たちみたいな青春モンスターが、社会に悪あがきしてるだけなんだよね。" }],
  },
];

// タイプライター：途中タップで全文表示→次へ
function useTypewriter(fullText: string, speed = 28) {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);

  // 文字送り
  useEffect(() => {
    setText("");
    setIsTyping(true);
    indexRef.current = 0;

    const id = setInterval(() => {
      indexRef.current += 1;
      setText(fullText.slice(0, indexRef.current));
      if (indexRef.current >= fullText.length) {
        setIsTyping(false);
        clearInterval(id);
      }
    }, speed);

    return () => clearInterval(id);
  }, [fullText, speed]);

  const skip = () => {
    setText(fullText);
    setIsTyping(false);
    indexRef.current = fullText.length;
  };

  return { text, isTyping, skip };
}

export default function CharacterIntro() {
  // 選択キャラ＆そのキャラ内のセリフインデックス
  const [idx, setIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  const current = CHARACTERS[idx];
  const activeLine = current.lines[lineIdx]?.text ?? "";

  const { text, isTyping, skip } = useTypewriter(activeLine);

  // 画像切替アニメ
  const imgVariants = {
    initial: { opacity: 0, x: 24, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
    exit: { opacity: 0, x: -24, scale: 0.98, transition: { duration: 0.25, ease: "easeIn" } },
  };

  // セリフボックス押下：タイプ中→全文表示／完了後→次のセリフ or 次のキャラ
  const handleAdvance = () => {
    if (isTyping) {
      skip();
      return;
    }
    const hasMoreLines = lineIdx < current.lines.length - 1;
    if (hasMoreLines) {
      setLineIdx((v) => v + 1);
      return;
    }
    // 次のキャラへ（最後は先頭へループ）
    const next = (idx + 1) % CHARACTERS.length;
    setIdx(next);
    setLineIdx(0);
  };

  // サムネタップでキャラ変更
  const selectChar = (i: number) => {
    if (i === idx) return;
    setIdx(i);
    setLineIdx(0);
  };

  // アクセント色
  const accent = current.accent ?? "#fff";

  return (
    <section id="characters" className="relative bg-black/80 text-white">
      {/* コンテナ */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 md:py-16">

        {/* タイトル */}
        <h2 className="text-2xl md:text-3xl font-bold mb-6">登場人物</h2>

        {/* ステージ（横長画像＋名前） */}
        <div className="relative rounded-2xl overflow-hidden bg-black/40 ring-1 ring-white/10">
          <div className="relative aspect-[16/9] w-full">
            <AnimatePresence mode="popLayout">
             <motion.img
                key={current.id + "-" + lineIdx}
                src={current.image}
                alt={current.name}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } }}
                exit={{ opacity: 0, x: -24, scale: 0.98, transition: { duration: 0.25, ease: "easeIn" } }}
                draggable={false}
                />

            </AnimatePresence>

            {/* 名前プレート */}
            <div className="absolute left-4 top-4 md:left-6 md:top-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm md:text-base font-semibold backdrop-blur"
                style={{ background: "rgba(0,0,0,.45)", border: `1px solid ${accent}` }}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: accent }} />
                <span>{current.name}</span>
                {current.title && <span className="text-white/70">— {current.title}</span>}
              </div>
            </div>

            {/* セリフボックス（タップでスキップ/次へ） */}
            <button
              onClick={handleAdvance}
              className="group absolute inset-x-3 md:inset-x-6 bottom-3 md:bottom-6 rounded-2xl bg-black/70 ring-1 ring-white/15 p-4 md:p-5 text-left"
              style={{ backdropFilter: "blur(6px)" }}
            >
              <p className="text-[15px] md:text-base leading-relaxed">
                {text}
                {/* カーソル（タイプ中のみ点滅） */}
                <span
                  className={`ml-1 inline-block w-[7px] h-[18px] align-middle ${
                    isTyping ? "opacity-100 animate-pulse" : "opacity-0"
                  }`}
                  style={{ background: "#fff" }}
                />
              </p>
              <div className="mt-2 text-xs md:text-sm text-white/70">
                {isTyping ? "タップで全文表示" : "タップで次へ"}
              </div>
            </button>
          </div>
        </div>

        {/* サムネ行（横スクロール） */}
        <div className="mt-4 md:mt-6 overflow-x-auto">
          <div className="flex gap-3 md:gap-4">
            {CHARACTERS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => selectChar(i)}
                className={`relative rounded-xl overflow-hidden ring-2 transition ${
                  i === idx ? "ring-white" : "ring-white/20 hover:ring-white/40"
                }`}
                aria-label={`${c.name} を選択`}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="block h-20 w-36 md:h-24 md:w-44 object-cover"
                  draggable={false}
                />
                {i === idx && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 0 3px ${c.accent ?? "#fff"}`
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
