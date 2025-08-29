// src/components/StageIntroSection.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

/* ========= Breakpoints ========= */
type BP = "sm" | "md" | "lg";
function useBp(): BP {
  const [bp, setBp] = useState<BP>("sm");
  useEffect(() => {
    const mqMd = window.matchMedia("(min-width: 768px)");
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const update = () => setBp(mqLg.matches ? "lg" : mqMd.matches ? "md" : "sm");
    update();
    mqMd.addEventListener?.("change", update);
    mqLg.addEventListener?.("change", update);
    return () => {
      mqMd.removeEventListener?.("change", update);
      mqLg.removeEventListener?.("change", update);
    };
  }, []);
  return bp;
}

/* ========= Types ========= */
type DropItem = {
  src: string;
  // 基本(スマホ)の着地点：校章中心からの相対
  dx: number;
  dy: number;
  // md / lg の着地点（未指定は前者を流用）
  dxMd?: number;
  dyMd?: number;
  dxLg?: number;
  dyLg?: number;
  // 演出
  delay: number;
  rotate?: number;
  z?: number;
  // 幅（sp / md / lg）
  w?: string;
  wMd?: string;
  wLg?: string;
};

type BurstTextPos = {
  text: string;
  dx: number;
  dy: number;
  dxMd?: number;
  dyMd?: number;
  dxLg?: number;
  dyLg?: number;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/* =============== 手書きっぽい縦書きタイトル（サイズ微調整版） =============== */
function VerticalTitle({
  small,
  big,
  align = "left",
  bigOffset = 0,
}: {
  small: string;
  big: string;
  align?: "left" | "right";
  bigOffset?: number;
}) {
  const col = align === "left" ? "grid-cols-[auto_1fr]" : "grid-cols-[1fr_auto] justify-items-end";
  const bigBase = "font-chalk text-white writing-vertical text-[17vw] md:text-[12vw] lg:text-[9vw] leading-[1.02]";
  const smallBase = "font-chalk text-white writing-vertical text-[7.2vw] md:text-[5.4vw] lg:text-[4.2vw]";
  return (
    <div className={`relative grid ${col} gap-4 md:gap-8`}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
        viewport={{ once: true, amount: 0.6 }}
        className={[smallBase, align === "left" ? "justify-self-start" : "justify-self-end"].join(" ")}
      >
        {small.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${i % 2 ? -2 : 2}px) rotate(${i % 2 ? 3 : -3}deg)`,
              marginBottom: "0.06em",
            }}
          >
            {ch}
          </span>
        ))}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 46 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1.0, ease: EASE }}
        viewport={{ once: true, amount: 0.6 }}
        className={[bigBase, align === "left" ? "justify-self-start -ml-3 md:-ml-6" : "justify-self-end", "relative z-30"].join(" ")}
      >
        <span style={{ display: "inline-block", marginTop: bigOffset }}>
          {big.split("").map((ch, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${i % 3 ? -3 : 3}px) rotate(${i % 2 ? 2.5 : -2.5}deg)`,
                marginBottom: "0.06em",
              }}
            >
              {ch}
            </span>
          ))}
        </span>
      </motion.h3>

      <style jsx global>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
    </div>
  );
}

/* =============== 校章（ホバーで回転＋拡大） =============== */
function CrestCenter({
  crestSrc = "/stage/crest.png",
  invSelector = "#inv-crest-slot",
  onAcquire,
}: {
  crestSrc?: string;
  invSelector?: string;
  onAcquire?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: "0px 0px -35% 0px", once: true });

  const addToInventory = () => {
    const slot = document.querySelector(invSelector) as HTMLElement | null;
    if (slot) {
      let img = slot.querySelector("[data-auto='crest']") as HTMLImageElement | null;
      if (!img) {
        img = document.createElement("img");
        img.src = crestSrc;
        img.alt = "校章";
        img.setAttribute("data-auto", "crest");
        Object.assign(img.style, {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: "scale(0.6)",
          opacity: "0",
          animation: "crest-pop-in 420ms cubic-bezier(0.16,1,0.3,1) forwards",
        } as CSSStyleDeclaration);
        slot.appendChild(img);
      } else {
        img.style.animation = "none";
        void img.offsetWidth;
        img.style.animation = "crest-pop-in 420ms cubic-bezier(0.16,1,0.3,1) forwards";
      }
      slot.classList.remove("inv-bling");
      void slot.offsetWidth;
      slot.classList.add("inv-bling");
      setTimeout(() => slot.classList.remove("inv-bling"), 700);
    }
    onAcquire?.();
  };

  return (
    <div ref={ref} className="relative grid place-items-center h-full py-6">
      <motion.img
        src={crestSrc}
        alt="校章"
        className="relative z-10 w-[140px] md:w-[180px] -translate-y-8 cursor-pointer select-none"
        initial={{ opacity: 0, scale: 0.8, y: 20, rotate: 0 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0, rotate: 0 } : {}}
        transition={{ duration: 1.35, ease: EASE }}
        whileHover={{ scale: 1.18, rotate: 20, transition: { type: "spring", stiffness: 120, damping: 12 } }}
        whileTap={{ scale: 0.95 }}
        onClick={addToInventory}
      />

      <style jsx global>{`
        @keyframes crest-pop-in {
          0% {
            transform: scale(0.6);
            opacity: 0;
            filter: blur(2px);
          }
          60% {
            transform: scale(1.06);
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: blur(0px);
          }
        }
        @keyframes inv-bling-kf {
          0% {
            box-shadow: 0 0 0 rgba(255, 215, 0, 0);
            transform: scale(1);
          }
          55% {
            box-shadow: 0 0 28px rgba(255, 215, 0, 0.65);
            transform: scale(1.04);
          }
          100% {
            box-shadow: 0 0 0 rgba(255, 215, 0, 0);
            transform: scale(1);
          }
        }
        .inv-bling {
          animation: inv-bling-kf 680ms cubic-bezier(0.16, 1, 0.3, 1);
          outline: 2px solid rgba(255, 215, 0, 0.6);
          outline-offset: 2px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

/* =============== 4枚ドロップ（sp/md/lg で座標・幅・落下距離を切替） =============== */
function FallingFour({
  show,
  items,
  centerOffset = { x: 0, y: -32 }, // 校章の -translate-y-8 を補正
  fallDistance = { sm: 260, md: 340, lg: 380 }, // 上からの開始距離（bpで調整）
  duration = 2.0,
}: {
  show: boolean;
  items: DropItem[];
  centerOffset?: { x: number; y: number };
  fallDistance?: { sm: number; md: number; lg: number };
  duration?: number;
}) {
  const bp = useBp();
  const startOffsetY = bp === "lg" ? fallDistance.lg : bp === "md" ? fallDistance.md : fallDistance.sm;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {items.map((it, i) => {
        const tx = (bp === "lg" ? it.dxLg ?? it.dxMd ?? it.dx : bp === "md" ? it.dxMd ?? it.dx : it.dx) + centerOffset.x;
        const ty = (bp === "lg" ? it.dyLg ?? it.dyMd ?? it.dy : bp === "md" ? it.dyMd ?? it.dy : it.dy) + centerOffset.y;
        const startY = ty - startOffsetY;
        const wClass = bp === "lg" ? it.wLg ?? it.wMd ?? it.w ?? "w-[18%]" : bp === "md" ? it.wMd ?? it.w ?? "w-[20%]" : it.w ?? "w-[32%]";

        return (
          <motion.img
            key={i}
            src={it.src}
            alt={`drop-${i + 1}`}
            className={`absolute left-1/2 top-1/2 ${wClass} -translate-x-1/2 -translate-y-1/2 rounded-xl object-cover`}
            style={{ zIndex: it.z ?? 0, transformOrigin: "50% -20px" }}
            initial={false}
            animate={show ? { opacity: [0, 1], x: tx, y: [startY, ty], rotate: it.rotate ?? 0 } : { opacity: 0, x: tx, y: startY, rotate: it.rotate ?? 0 }}
            transition={{
              opacity: { duration: 0.35, delay: it.delay },
              y: { duration, delay: it.delay, ease: EASE },
              x: { duration, delay: it.delay, ease: EASE },
              rotate: { duration, delay: it.delay, ease: EASE },
            }}
          />
        );
      })}
    </div>
  );
}

/* =============== クリック同時に出る縦書きコピー（右上／右下）= glow & same motion =============== */
function DuoBurstText({
  show,
  delaySecond = 0.5,
  tr = { text: "高校生に", dx: 180, dy: -120, dxMd: 180, dyMd: -180, dxLg: 220, dyLg: -210 },
  br = { text: "タイムスリップ", dx: 110, dy: 100, dxMd: 210, dyMd: 160, dxLg: 260, dyLg: 200 },
}: {
  show: boolean;
  delaySecond?: number;
  tr?: BurstTextPos;
  br?: BurstTextPos;
}) {
  const bp = useBp();
  const pos = (o: BurstTextPos) => ({
    x: bp === "lg" ? o.dxLg ?? o.dxMd ?? o.dx : bp === "md" ? o.dxMd ?? o.dx : o.dx,
    y: bp === "lg" ? o.dyLg ?? o.dyMd ?? o.dy : bp === "md" ? o.dyMd ?? o.dy : o.dy,
  });

  const build = (o: BurstTextPos, baseDelay: number, key: string) => {
    const { x, y } = pos(o);
    return (
      <motion.div
        key={key}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
        initial={{ opacity: 0, y: 46 }}
        animate={show ? { opacity: 1, x, y } : { opacity: 0, x, y }}
        transition={{ delay: baseDelay, duration: 1.0, ease: EASE }}
      >
        <div
          className="
            font-chalk writing-vertical text-white leading-[1.02] tracking-tight glow-vert
            text-[16vw] md:text-[10vw] lg:text-[8.4vw]
          "
          style={{ display: "inline-block" }}
        >
          {o.text.split("").map((ch, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${i % 3 ? -3 : 3}px) rotate(${i % 2 ? 2.5 : -2.5}deg)`,
                marginBottom: "0.06em",
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {build(tr, 0, "tr")}
      {build(br, delaySecond, "br")}
      <style jsx global>{`
        .glow-vert {
          filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.45));
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.55), 0 0 18px rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </>
  );
}

/* =============== 本体 =============== */
export default function StageIntroSection({
  ctaHref = "/shimoichi",
  crestSrc = "/stage/crest.png",
}: {
  ctaHref?: string;
  crestSrc?: string;
}) {
  const [showDrops, setShowDrops] = useState(false);

  // 4枚：spは近め、mdはやや広く、lgはさらに広く
  const drops: DropItem[] = [
    { src: "/stage/drop-1.jpg", dx: 0, dy: -110, dxMd: 0, dyMd: -170, dxLg: 0, dyLg: -210, delay: 0.0, rotate: -6, z: 4, w: "w-[34%]", wMd: "w-[20%]", wLg: "w-[18%]" },
    { src: "/stage/drop-2.jpg", dx: -90, dy: -60, dxMd: -170, dyMd: -100, dxLg: -210, dyLg: -130, delay: 0.18, rotate: -4, z: 8, w: "w-[36%]", wMd: "w-[20%]", wLg: "w-[18%]" },
    { src: "/stage/drop-3.jpg", dx: 120, dy: 10, dxMd: 200, dyMd: 30, dxLg: 260, dyLg: 40, delay: 0.36, rotate: 6, z: 8, w: "w-[34%]", wMd: "w-[20%]", wLg: "w-[18%]" },
    { src: "/stage/drop-4.jpg", dx: -70, dy: 110, dxMd: -150, dyMd: 160, dxLg: -200, dyLg: 200, delay: 0.54, rotate: 8, z: 4, w: "w-[32%]", wMd: "w-[18%]", wLg: "w-[16%]" },
  ];

  return (
    <section
      id="stage"
      className="relative pt-20 md:pt-28 bg-cover bg-center"
      style={{ backgroundImage: "url('/stage/bg-vert.png')" }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-white/60" />

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        {/* タイトル＋右側画像（sp: タイトル上に重ねる / md+: 2カラム） */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-10 overflow-visible">
          <VerticalTitle small="舞台は" big="奈良の学校" align="left" />

          {/* nara-1：右に大胆にはみ出す（bpで強弱） */}
          <motion.img
            src="/stage/nara-1.png"
            alt="奈良の学校イメージ"
            className="
              md:justify-self-end
              rounded-2xl object-cover
              absolute top-2 right-[-12%] w-[78%] max-w-[520px]
              sm:top-3 sm:right-[-14%] sm:w-[82%] sm:max-w-[560px]
              md:static md:w-[125%] md:translate-x-[15%]
              lg:w-[140%] lg:translate-x-[20%]
              z-10
            "
            initial={{ opacity: 0, x: 120, rotate: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.1, ease: EASE }}
            viewport={{ once: true, amount: 0.35 }}
          />
        </div>

        {/* 校章＋落下＋コピー（固定高さ：bpで可変） */}
        <div className="relative h-[340px] sm:h-[360px] md:h-[520px] lg:h-[600px]">
          <CrestCenter crestSrc={crestSrc} onAcquire={() => setShowDrops(true)} />
          <FallingFour show={showDrops} items={drops} />
          <DuoBurstText show={showDrops} delaySecond={0.5} />
        </div>

        {/* CTA */}
        <div className="mt-10 md:mt-14 mb-16 flex justify-center">
          <a href={ctaHref} className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-black text-white/95 hover:bg-black/90 transition-colors">
            下市集学校の紹介を見る<span aria-hidden>▸</span>
          </a>
        </div>
      </div>
    </section>
  );
}
