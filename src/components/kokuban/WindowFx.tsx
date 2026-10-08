"use client";
// 窓の殻：窓が近づいたときだけ、曇り・拭く・息の本体（windowSim）を読み込む。初回の JS にはこの殻しか入れない。
// 青い曇りを拭こうとしたときのメッセージ窓（GameDialog）も、本体と一緒に後から読む。
import { lazy, Suspense, useEffect, useState } from "react";
import { ARRIVE_EVENT } from "@/lib/now";
import { site } from "@/data/site";

const GameDialog = lazy(() => import("./GameDialog"));

export default function WindowFx() {
  const [said, setSaid] = useState(0); // 0＝閉じている。開くたびに数を変えて、毎回はじめのページから出す

  useEffect(() => {
    const sec = document.querySelector<HTMLElement>(".kb-window");
    if (!sec) return;
    // 動きを減らす設定（?motion があれば演出を見る＝BackTv と同じ）
    const reduce = !new URLSearchParams(location.search).has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let stop: (() => void) | null = null;
    const onRefuse = () => setSaid((n) => (n > 0 ? n : Date.now()));
    const io = new IntersectionObserver(
      (en) => {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        import("./windowSim").then((m) => {
          if (!disposed) stop = m.start(sec, { reduce, onRefuse });
        });
        // メッセージ窓も先に読んでおく（初めて出すときに待たせない）
        import("./GameDialog").catch(() => {});
      },
      { rootMargin: "600px 0px" },
    );
    // 読み込んだ直後の最初の画面では読まない（教室のすぐ下にあるため）。窓が実際に見えているか、
    // 一度スクロールしたか、門をくぐって教室に着いた（背の高い画面では、着いた時点で窓が見えていることがある）あとから見張る
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      io.observe(sec);
    };
    const r = sec.getBoundingClientRect();
    const onScreen = r.height > 0 && r.top < window.innerHeight;
    if (onScreen) arm();
    else {
      window.addEventListener("scroll", arm, { passive: true });
      window.addEventListener(ARRIVE_EVENT, arm);
    }
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("scroll", arm);
      window.removeEventListener(ARRIVE_EVENT, arm);
      stop?.();
    };
  }, []);

  if (!said || !site.windowNight.length) return null;
  return (
    <Suspense fallback={null}>
      <GameDialog key={said} lines={site.windowNight} onClose={() => setSaid(0)} />
    </Suspense>
  );
}
