// src/components/AdmissionCTA.tsx
"use client";
import { motion } from "framer-motion";
import CtaButton from "@/components/CtaButton";

export default function AdmissionCTA() {
  return (
   <motion.div
      initial={{ x: 40, opacity: 0, filter: "blur(2px)" }}
      whileInView={{ x: 0, opacity: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="flex justify-center px-4"
    >
      <CtaButton
        href="/admission"                  // ← ここだけ！
        label="詳しく見る"
        subLabel="✿ アドミッション・ポリシーはこちら ✿"
        variant="orange"
        fullWidth
        className="w-[min(92vw,740px)]"
        ariaLabel="ちゃんと知りたい！ガチ文高等学校について"
      />
    </motion.div>
  );
}
