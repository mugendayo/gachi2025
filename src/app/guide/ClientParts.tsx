"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type Slide = { src: string; caption?: string; alt?: string };

export function SimpleSlider({ slides }: { slides: Slide[] }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const prev = () => setIdx((v) => (v - 1 + slides.length) % slides.length);
  const next = () => setIdx((v) => (v + 1) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) > 40 && Math.abs(dy) < 60) (dx < 0 ? next() : prev());
    startX.current = null;
    startY.current = null;
  };

  const s = slides[idx];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl ring-1 ring-gray-200 bg-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={s.src}
          alt={s.alt ?? s.caption ?? ""}
          fill
          className="object-contain bg-black/5"
          priority={false}
        />
      </div>

      {(s.caption || s.alt) && (
        <div className="px-3 py-2 text-center text-sm text-gray-700 bg-white/90">
          {s.caption || s.alt}
        </div>
      )}

      {/* arrows */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <button
          type="button"
          aria-label="前へ"
          onClick={prev}
          className="rounded-full bg-white/90 hover:bg-white px-2.5 py-1.5 text-gray-800 text-sm ring-1 ring-gray-300 shadow-sm"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="次へ"
          onClick={next}
          className="rounded-full bg-white/90 hover:bg-white px-2.5 py-1.5 text-gray-800 text-sm ring-1 ring-gray-300 shadow-sm"
        >
          →
        </button>
      </div>

      {/* dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`スライド ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full ${
              i === idx ? "bg-gray-800" : "bg-gray-300 hover:bg-gray-400"
            }`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}
