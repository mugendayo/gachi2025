"use client";
// 教室の後ろの輪飾り（殻）。天井から垂れる紙の鎖の canvas と、床の短冊の束だけを置く。
// 鎖の計算と描画（garlandSim）は、ページを動かして教室の後ろに近づいてから読み込む（最初の画面の重さに入れない）。
// ただし自分の輪がある端末では、ページのどこかに鎖が掛かっているので、一度でもページを動かしたら読み込む。
// 文字は置かない。数も出さない。
import { useEffect, useRef } from "react";
import { GARLAND_KEY } from "@/lib/prep";
import "./garland.css";

/** この端末で輪を足したことがあるか（保存の中身を軽く見るだけ） */
const hasMine = () => {
  try {
    const raw = localStorage.getItem(GARLAND_KEY) || localStorage.getItem(GARLAND_KEY.replace(/_v2$/, "_v1")) || "";
    return /"n":[1-9]|"c":"#/.test(raw);
  } catch {
    return false;
  }
};

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
    const mine = hasMine();
    const load = () => {
      if (loading || !(near || mine) || !scrolled) return;
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
