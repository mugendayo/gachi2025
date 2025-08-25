"use client";

type Props = {
  label?: string;                 // 上のオレンジピル
  title: string;                  // 見出し本文
  className?: string;             // 余白など外側調整用
};

export default function SectionHeadingCard({
  label = "ガチ文高等学校の人たち",
  title = "ガチ文高等学校には、ユニークな人がたくさんいます。",
  className = "my-12",
}: Props) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className="
          relative w-[min(92vw,920px)] text-center
          rounded-[22px] p-6 md:p-8
          bg-[#FBF7ED]           /* 不透明の明るいベージュ */
          ring-2 ring-[#D7CCAF]  /* はっきりした枠 */
          shadow-[0_10px_40px_rgba(0,0,0,.28)] /* 強めの外側影 */
        "
        style={{
          // 細かい紙テクスチャっぽさ（控えめ）
          backgroundImage:
            "radial-gradient(circle at 25% 15%, rgba(255,255,255,.9), transparent 55%), repeating-linear-gradient(45deg, #fbf7ed, #fbf7ed 8px, #f6f0e2 8px, #f6f0e2 16px)",
        }}
      >
        {/* ラベル（オレンジのピル） */}
        <div className="flex justify-center">
          <div
            className="
              relative inline-flex items-center px-5 md:px-6 py-2 md:py-2.5
              rounded-full text-white font-bold tracking-wide text-sm md:text-base
              shadow-[0_6px_16px_rgba(255,140,0,.35)]
              ring-1 ring-black/10
            "
            style={{
              background: "linear-gradient(180deg,#FFA91A 0%, #FF8A00 100%)",
            }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1.5px_0_rgba(255,255,255,.75)]" />
            {label}
          </div>
        </div>

        {/* 見出し本文（濃ブラウン＋白フチ影） */}
        <h2
          className="
            mt-4 md:mt-5 font-extrabold
            text-[clamp(22px,5.6vw,44px)]
            leading-tight tracking-[0.02em]
            text-[#3F2E12]
          "
          style={{ textShadow: "0 1px 2px rgba(255,255,255,.9)" }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
