"use client";
// 教室の後ろのブラウン管。近づいたときだけ動画を読み込む（第一画面の重さに入れない）。
import { useEffect, useRef } from "react";

export default function BackTv() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = !new URLSearchParams(location.search).has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // 動きを止めた人にはポスターだけ
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) {
          if (!v.src) v.src = "/hero-wide.mp4";
          v.play().catch(() => {});
        } else if (v.src) v.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="kb-tv" aria-hidden>
      <div className="kb-tv-body">
        <div className="kb-tv-screen">
          <video ref={ref} muted loop playsInline preload="none" poster="/hero-wide-poster.jpg" />
          <i className="kb-tv-glass" />
        </div>
        <div className="kb-tv-panel">
          <i />
          <i />
        </div>
      </div>
      <div className="kb-tv-stand" />
    </div>
  );
}
