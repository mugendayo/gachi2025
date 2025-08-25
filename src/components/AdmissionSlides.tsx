// src/components/AdmissionSlides.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export type Slide = {
  title: string;
  body?: string;
  points?: string[];
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;   // ← 追加
};

type Props = {
  slides: Slide[];
};

export default function AdmissionSlides({ slides }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  // スクロール位置から現在のインデックスを推定
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIdx(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (i: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: el.clientWidth * clamped, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-[86svh]">
      {/* ビューポート（横スクロール・スナップ） */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar select-none"
      >
        <div className="flex h-full w-full">
          {slides.map((s, i) => (
            <section
              key={i}
              className="snap-start shrink-0 w-full h-full px-4 md:px-8 py-5"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
            >
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="h-full rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 flex flex-col"
              >
                <h3 className="text-lg md:text-xl font-bold text-gray-900">{s.title}</h3>

                {s.body && (
                  <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-gray-800">
                    {s.body}
                  </p>
                )}

                {s.points && s.points.length > 0 && (
                  <ul className="mt-4 space-y-2 text-[15px] text-gray-800 list-disc pl-5">
                    {s.points.map((p, pi) => (
                      <li key={pi}>{p}</li>
                    ))}
                  </ul>
                )}

                {s.ctaText && s.ctaHref && (
                  <div className="mt-auto pt-5">
                    <a
                      href={s.ctaHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full bg-black text-white px-5 py-2 text-sm hover:opacity-90"
                    >
                      {s.ctaText}
                    </a>
                  </div>
                )}
                { s.imageSrc && (
                <div className="mt-4 flex justify-center">
                    <img
                    src={s.imageSrc}
                    alt={s.title}
                    className="max-h-[320px] w-auto object-contain rounded-lg shadow"
                    />
                </div>
                )}

              </motion.div>
            </section>
          ))}
        </div>
      </div>

      {/* コントロールバー（ドット＋左右） */}
      <div className="flex items-center justify-center gap-4 py-3">
        <button
          onClick={() => goTo(idx - 1)}
          className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
          aria-label="前のカードへ"
        >
          前へ
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`スライド ${i + 1}へ`}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === idx ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(idx + 1)}
          className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
          aria-label="次のカードへ"
        >
          次へ
        </button>
      </div>

      {/* スクロールバー非表示（Safari/Chrome/Firefox） */}
      <style jsx>{`
        .no-scrollbar {
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
