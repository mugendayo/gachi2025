"use client";

export default function Footer() {
  return (
    <footer className="bg-[#111] text-white/80 py-6 mt-20 text-center text-sm">
      <div className="max-w-[1000px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
        <div className="text-xs text-white/60">
          © 2025 ThanatosGames  All Rights Reserved.
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/tokusho"
            className="hover:text-white transition-colors duration-150 underline underline-offset-2"
          >
            特定商取引法に基づく表記
          </a>
          <a
            href="/kokoroe"
            className="hover:text-white transition-colors duration-150 underline underline-offset-2"
          >
            生徒心得
          </a>
        </div>
      </div>
    </footer>
  );
}
