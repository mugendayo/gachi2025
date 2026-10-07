"use client";
// 教室の後ろのブラウン管。近づいたときだけ動画を読み込む（第一画面の重さに入れない）。
// 帯で状態が変わる：点いていて去年の記録が流れる＝昼・文化祭準備・消灯（消し忘れ）／電源オフ＝朝・超新星祭・夕方／砂嵐＝深夜・明け方。
// 点いていない帯では動画を読み込まない。
import { useEffect, useRef } from "react";

export default function BackTv() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = !new URLSearchParams(location.search).has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // 動きを止めた人にはポスターだけ
    const world = document.getElementById("kb-world");
    const isOn = () => ["hiru", "junbi", "shoto"].includes(world?.dataset.scene ?? "hiru");
    let visible = false;
    const sync = () => {
      if (visible && isOn()) {
        if (!v.src) v.src = "/hero-wide.mp4";
        v.play().catch(() => {});
      } else if (v.src) v.pause();
    };
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    const mo = world ? new MutationObserver(sync) : null;
    if (world && mo) mo.observe(world, { attributes: true, attributeFilter: ["data-scene"] });
    return () => {
      io.disconnect();
      mo?.disconnect();
    };
  }, []);

  return (
    <div className="kb-tv" aria-hidden>
      <div className="kb-tv-body">
        <div className="kb-tv-screen">
          <video ref={ref} muted loop playsInline preload="none" poster="/hero-wide-poster.jpg" />
          <i className="kb-tv-snow" />
          <i className="kb-tv-off" />
          <i className="kb-tv-glass" />
        </div>
        <div className="kb-tv-panel">
          <i />
          <i />
          <b className="kb-tv-led" />
        </div>
      </div>
      <div className="kb-tv-stand" />
    </div>
  );
}
