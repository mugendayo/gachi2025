// 定番規格：フッター。毎年同じ色・太さ・並び。ライブラリ（過去のソフト）を束ねる。
import Link from "next/link";
import { site } from "@/data/site";

export default function Footer() {
  return (
    <footer id="library" className="relative bg-[#111] px-4 py-8 text-sm text-white/80" style={{ borderTop: "3px solid #ff6a1a" }}>
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
        {/* ライブラリ */}
        <nav aria-label="ライブラリ（過去のガチ文化祭）">
          <p className="mb-2 text-xs tracking-widest text-white/50">LIBRARY</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {site.library.map((l) => (
              <li key={l.year} className={l.off ? "text-white/35 line-through" : ""}>
                <span className="tabular-nums">{l.year}</span>
                {l.label && " "}
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-white">{l.label}</a>
                ) : (
                  <span className="text-white/60">{l.label}</span>
                )}
              </li>
            ))}
            <li className="font-bold text-white">
              <span className="tabular-nums">{site.year}</span> {site.concept}
            </li>
          </ul>
        </nav>

        {/* 公式 */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-4 md:flex-row">
          <div className="text-xs text-white/60">主催 ThanatosGames　© {site.year} ThanatosGames All Rights Reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href={site.notice.slug} className="underline underline-offset-2 hover:text-white">校内連絡</Link>
            <Link href="/kokoroe" className="underline underline-offset-2 hover:text-white">生徒心得</Link>
            <Link href="/tokusho" className="underline underline-offset-2 hover:text-white">特定商取引法に基づく表記</Link>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white">プライバシー</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
