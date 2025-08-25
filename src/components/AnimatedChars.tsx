// AnimatedChars.tsx の差分（抜粋）
import { motion } from "framer-motion";
import type { JSX } from "react";

type Props = {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  initialDelay?: number;
  lineStep?: number;
  step?: number;
  bobDuration?: number;
  /** 改行ごとの上マージン。例: "0.35em" / "8px" / "0.5rem" */
  lineGap?: string;          // ★ 追加
};

export default function AnimatedChars({
  text,
  as = "h3",
  className = "",
  initialDelay = 0.18,
  lineStep = 0.08,
  step = 0.12,
  bobDuration = 3.2,
  lineGap,                   // ★ 追加
}: Props) {
  const Tag = as as React.ElementType;
  const lines = text.split("\n");

  return (
    <Tag className={className} aria-label={text.replace(/\n/g, " ")}>
      {lines.map((line, li) => (
        <span
          key={`line-${li}`}
          className="block"
          style={li > 0 && lineGap ? { marginTop: lineGap } : undefined} // ★ 行頭にだけ余白
        >
          {Array.from(line).map((ch, ci) => (
            <motion.span
              key={`ch-${li}-${ci}`}
              className="inline-block"
              initial={{ y: -28, opacity: 0, rotate: -6, filter: "blur(2px)" }}
              whileInView={{ y: 0, opacity: 1, rotate: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{
                delay: initialDelay + li * lineStep + ci * step,
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
                  duration: bobDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: ci * 0.04,
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </motion.span>
            </motion.span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
