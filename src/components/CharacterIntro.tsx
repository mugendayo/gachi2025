// src/components/CharacterIntro.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionHeadingCard from "@/components/SectionHeadingCard";

/** 画像は /public/chars/*.png に入れてください（横長 16:9 推奨） */
type Line = { text: string };
type Character = {
  id: string;
  name: string;
  title?: string;
  image: string;      // ex) "/chars/01.png"
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
      { text: "教育実習の新山です。今年もやってきましたね。ガチ文化祭。誰よりも目立ってやりますよ！" },
    ],
  },
  {
    id: "b",
    name: "志道マモル",
    title: "指導教諭",
    image: "/chars/02.png",
    accent: "#f59e0b",
    lines: [
      { text: "本当の幸福とは、制約のなかの自由です。" },
    ],
  },
  {
    id: "c",
    name: "志道シナイ",
    title: "マージャン部の顧問",
    image: "/chars/03.png",
    accent: "#ef4444",
    lines: [
      { text: "んーテレビもねえ。ラジオもねえ。上着もズボンも履いてねえ。去年は脱衣でマージャン。今年は脱衣で格付け？！私がウワサの経費王、シナイでございますの。" },
      { text: "ベルファイヤ、インフルエンザ、いつまで経っても変わらない。そう俺だけ人と違うこと。信念でありエンタメでございますの。" }
    ],
  },
  {
    id: "d",
    name: "GACKT",
    title: "ヘルボール同好会",
    image: "/chars/04.png",
    accent: "#8b5cf6",
    lines: [
      { text: "『仕事が辛い。転職を考えている。』と相談されることがある。「変えたきゃ変えろよ」と答えると『いや、でも・・・』と別の言葉が出てくる。「だったら続けろよ」と言うと、『好きだったことが嫌いになるのが怖い』という。" },
      { text: "ボクがやっていることを実践してみてほしい。「どうやって面白さを見出せる自分になるか」を考えながら取り組む。「好き・楽しい」は楽な状態でしか感じられない。「面白い」はしんどい状況でも感じられる。長続きしないと思う自身がいるなら試してみてくれ。" },
      { text: "最後にはなるが、ボクたちが、このガチ文高等学校の神童。GACKT（学徒）だ。よろしく。" }
    ],
  },
  {
    id: "e",
    name: "斬島悪暁",
    title: "教務主任",
    image: "/chars/05.png",
    accent: "#10b981",
    lines: [
      { text: "..................教育者は『道具』である。" }
    ],
  },
  {
    id: "f",
    name: "片野ユニコーン様",
    title: "卒業写真部",
    image: "/chars/06.png",
    accent: "#eab308",
    lines: [
      { text: "卒業卒業ってよー、いったい何から卒業するんだろうな！？" },
    ],
  },
  {
    id: "g",
    name: "アマノジャキ",
    title: "最大火力",
    image: "/chars/07.png",
    accent: "#60a5fa",
    lines: [
      { text: "結局ガチ文化祭っつーのはさ、俺たちみたいな青春モンスターが、社会に悪あがきしてるだけなんだよね。" }
    ],
  },
];

// タイプライター：途中タップで全文表示→次へ
function useTypewriter(fullText: string, speed = 28) {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);

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
  const [idx, setIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  const current = CHARACTERS[idx];
  const activeLine = current.lines[lineIdx]?.text ?? "";
  const { text, isTyping, skip } = useTypewriter(activeLine);

  const handleAdvance = () => {
    if (isTyping) {
      skip(); // まず全文表示
      return;
    }
    // 次のセリフ or 次のキャラ
    if (lineIdx < (current.lines.length - 1)) {
      setLineIdx((v) => v + 1);
    } else {
      setIdx((v) => (v + 1) % CHARACTERS.length);
      setLineIdx(0);
    }
  };

  const selectChar = (i: number) => {
    if (i === idx) return;
    setIdx(i);
    setLineIdx(0);
  };

  const accent = current.accent ?? "#fff";

  return (
    <section id="characters" className="relative bg-black text-white pt-32 md:pt-40 isolate">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10">
        <img src="/section-bg/characters-bg.jpg" alt="" className="w-full h-full object-cover" draggable={false} />
      </div>

      <SectionHeadingCard label="ガチ文高等学校の人たち" title="高2病な人がたくさんいます" />

      {/* ====== カード：画像(16:9) + セリフ ====== */}
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black/40">
        {/* ★ どこをクリックしても「次へ」になる透明オーバーレイ */}
        <button
          type="button"
          onClick={handleAdvance}
          aria-label="次へ進む"
          title="タップ / クリックで次へ"
          className="absolute inset-0 z-20 cursor-pointer bg-transparent"
        />

        {/* 画像 */}
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

          {/* 左上：名前プレート */}
          <div className="absolute left-3 top-3 md:left-5 md:top-5 z-10">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] md:text-sm font-semibold backdrop-blur"
              style={{ background: "rgba(0,0,0,.45)", border: `1px solid ${accent}` }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: accent }} />
              <span>{current.name}</span>
              {current.title && <span className="text-white/70">— {current.title}</span>}
            </div>
          </div>
        </div>

        {/* セリフ（吹き出し）— 小さめに調整 */}
        <div className="relative w-full bg-white/95 rounded-xl ring-2 ring-black/20 shadow-[0_10px_28px_rgba(0,0,0,.25)]">
          {/* しっぽ */}
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white/95 rotate-45 border-l border-t border-black/20"
          />
          {/* 内側の薄い輪郭 */}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/10" />

          {/* ↓ ここで“セリフ枠のサイズ”を小さくしています */}
          <div className="relative px-3 md:px-4 py-2.5 md:py-3 flex items-center min-h-[100px] md:min-h-[120px]">
            <p className="leading-snug text-black text-[clamp(13px,2.6vw,16px)] md:text-[clamp(14px,1.2vw,17px)]">
              {text}
              <span
                className={`ml-1 inline-block w-[6px] h-[14px] align-middle ${isTyping ? "opacity-100 animate-pulse" : "opacity-0"}`}
                style={{ background: "#000" }}
              />
            </p>

            {/* 右下の常時点滅 ▼ インジケータ */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 bottom-2 md:right-3 md:bottom-2 text-sky-500 text-[22px] md:text-[18px] select-none animate-pulse"
            >
              ▼
            </span>
          </div>
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
                  style={{ boxShadow: `inset 0 0 0 3px ${c.accent ?? "#fff"}` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 下余白 */}
      <div className="h-24 md:h-32" />

      {/* 使い所がなければ削除OK：グローバル補助スタイルの例 */}
      {/* <style jsx global>{`
        .rpg-textbox-inner--mask {
          -webkit-mask-image: linear-gradient(180deg, #000 85%, rgba(0,0,0,0));
                  mask-image: linear-gradient(180deg, #000 85%, rgba(0,0,0,0));
        }
      `}</style> */}
    </section>
  );
}
