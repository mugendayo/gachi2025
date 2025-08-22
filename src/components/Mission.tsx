// src/components/Mission.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Mission() {
  const [open, setOpen] = useState(false);
  return (
    <section className="py-12 text-center">
      <button onClick={() => setOpen(true)} className="border rounded-full px-6 py-2">
        クリックでミッション表示
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mt-6 text-2xl font-semibold"
            initial={{ rotate: -90, opacity: 0, scale: 0.9 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            ミッション：<span className="text-3xl">“ガチな文化祭を作れ！”</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
