// 定番規格：公式バー。毎年同じ色・太さ・並び。中身（日付・連絡）だけ site.ts から差し替わる。
// サーバーコンポーネント＝事実が最初の HTML に必ず入る（ゲートを通らなくても読める）。
import Link from "next/link";
import { site } from "@/data/site";
import { JoinButton } from "./JoinGate";

export const BAR_HEIGHT = 84; // 上段56 + 連絡行28（Hero の固定UIがこの下に来るように使う）

export default function OfficialBar() {
  return (
    <header className="sticky top-0 z-[90] text-[#f4f4f2]" style={{ background: "#111" }}>
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4">
        <Link href="/" className="whitespace-nowrap text-[19px] font-black tracking-wide">ガチ文化祭</Link>
        <p className="min-w-0 flex-1 truncate text-[12.5px] text-[#a9a9a4] tabular-nums">
          <b className="text-[#f4f4f2]">{site.year}</b>　{site.dateShort}　{site.finalDayLabel}　{site.placeShort}
        </p>
        <JoinButton className="whitespace-nowrap rounded-[3px] bg-[#ff6a1a] px-4 py-2 text-sm font-bold text-[#111]">参加する</JoinButton>
      </div>
      <div className="border-t border-[#2a2a2a]" style={{ borderBottom: "3px solid #ff6a1a" }}>
        <Link href={site.notice.slug} className="mx-auto flex h-7 max-w-[1200px] items-center gap-2 px-4 text-[12px] text-[#d8d8d2] hover:text-white">
          <span className="rounded-sm bg-[#b3261e] px-1.5 text-[11px] font-bold text-white">{site.notice.tags[0]}</span>
          <span className="truncate">{site.notice.title}</span>
          <span className="ml-auto hidden text-[#8a8a85] sm:inline">{site.notice.from}</span>
        </Link>
      </div>
    </header>
  );
}
