"use client";
import { motion } from "framer-motion";

type Props = {
  imageSrc?: string;
};

export default function TimeSlipTeaser({
  imageSrc = "/effects/time-machine.png",
}: Props) {
  const phrase = "もしも、過去に戻れたら";

  return (
    <section
      id="timeslip"
      className="relative isolate overflow-visible py-24 md:py-32"
    >
      {/* 背景の粒子っぽいノイズ（薄め） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(1200px 600px at 70% -10%, rgba(255,255,255,.12), transparent 60%)",
        }}
      />

      {/* 宙に浮かぶタイムマシン */}
      <motion.img
        src={imageSrc}
        alt=""
        className="mx-auto block w-[58vw] max-w-[520px] min-w-[240px] h-auto select-none drop-shadow-[0_12px_40px_rgba(0,200,255,.45)]"
        loading="lazy"
        draggable={false}
        initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(2px)" }}
        animate={{
          opacity: 1,
          y: [0, -8, 0, 6, 0],
          rotate: [-1.2, 0.6, -0.4, 0.4, -0.2],
          scale: 1,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 2.4,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      {/* キャッチコピー：ゆっくり一文字ずつ落ちてくる */}
      <h2 className="mt-6 text-center font-bold leading-[1.15] text-white drop-shadow text-[8.5vw] sm:text-5xl md:text-6xl">
        {phrase.split("").map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className="inline-block"
            initial={{ y: -28, opacity: 0, rotate: -6, filter: "blur(2px)" }}
            animate={{ y: 0, opacity: 1, rotate: 0, filter: "blur(0px)" }}
            transition={{
              delay: 0.18 + i * 0.18,
              type: "spring",
              stiffness: 250,
              damping: 20,
              mass: 0.7,
            }}
          >
            <motion.span
              className="inline-block"
              animate={{ y: [0, -2, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.04,
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          </motion.span>
        ))}
      </h2>
    </section>
  );
}
