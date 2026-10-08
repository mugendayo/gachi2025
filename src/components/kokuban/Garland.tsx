"use client";
// 教室の後ろの輪飾り（殻）。天井から垂れる紙の鎖の canvas と、床の短冊の束だけを置く。
// 鎖の計算と描画（garlandSim）は、ページを動かして教室の後ろに近づいてから読み込む（最初の画面の重さに入れない）。
// 文字は置かない。数も出さない。
import { useEffect, useRef } from "react";
import "./garland.css";

export default function Garland() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stripsRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const strips = stripsRef.current;
    const section = canvas?.closest<HTMLElement>(".kb-back");
    if (!canvas || !strips || !section) return;
    const reduce = !new URLSearchParams(location.search).has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stop: (() => void) | null = null;
    let gone = false;
    let near = false;
    // 教室の真下にあるので、開いた直後から「近い」ことがある。一度でもページを動かすまでは読み込まない
    let scrolled = window.scrollY > 0;
    let loading = false;
    const load = () => {
      if (loading || !near || !scrolled) return;
      loading = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      import(/* webpackChunkName: "garlandSim" */ "./garlandSim")
        .then((m) => {
          if (!gone) stop = m.start(section, canvas, strips, { reduce });
        })
        .catch(() => {});
    };
    const onScroll = () => {
      scrolled = true;
      load();
    };
    const io = new IntersectionObserver(
      (entries) => {
        near = entries.some((e) => e.isIntersecting);
        load();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      gone = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      stop?.();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="kb-garland" aria-hidden />
      <button ref={stripsRef} type="button" className="kb-strips" aria-hidden="true" tabIndex={-1} />
    </>
  );
}
