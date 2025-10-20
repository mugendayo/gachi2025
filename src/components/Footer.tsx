"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#111] text-white/80 py-8 mt-20 text-center text-sm relative overflow-hidden">
      <div className="max-w-[1000px] mx-auto px-4 flex flex-col items-center gap-3">
        {/* 上段：著作権 + 各リンク */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-2 md:gap-4">
          <div className="text-xs text-white/60">
            © 2025 ThanatosGames All Rights Reserved.
          </div>

          {/* 1行目のリンク群 */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/kokoroe"
              className="hover:text-white transition-colors duration-150 underline underline-offset-2"
            >
              生徒心得
            </Link>
            <Link
              href="https://gachibun.studio.site/"
              className="hover:text-white transition-colors duration-150 underline underline-offset-2"
            >
              優先順位を飛び越えろ
            </Link>
            <Link
              href="https://mugendayo.com/project001/"
              className="hover:text-white transition-colors duration-150 underline underline-offset-2"
            >
              打上花火 -馬鹿にしてた記憶-
            </Link>
            
             <Link
              href="/tokusho"
              className="hover:text-white transition-colors duration-150 underline-offset-2"
            >
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>


      </div>
    </footer>
  );
}
