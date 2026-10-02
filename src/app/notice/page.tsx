// 校内連絡（NOTICE）。Discordの業務連絡と同じ文面。ひろしくんの補足はDiscordのみ。
import type { Metadata } from "next";
import { site } from "@/data/site";

const n = site.notice;

export const metadata: Metadata = {
  title: `【${n.tags.join("】【")}】${n.title}`,
  description: n.lead,
  alternates: { canonical: n.slug },
};

export default function NoticePage() {
  return (
    <main className="min-h-[70vh] bg-[#eceae4] px-4 py-10 text-[#1b1d21]">
      <article className="mx-auto max-w-[640px] rounded-lg bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-[20px] font-bold leading-snug md:text-[22px]">
          {n.tags.map((t) => `【${t}】`).join("")}【{n.title}】
        </h1>
        <p className="mt-2 text-[13px] text-[#555]">発信：{n.from}　｜　対象：{n.to}</p>

        <p className="mt-6 leading-relaxed">{n.lead}</p>

        <h2 className="mt-8 font-bold">■ 経緯</h2>
        <p className="mt-2">校内で次の報告が複数件ありました。</p>
        <blockquote className="mt-2 border-l-4 border-[#b9bcc2] pl-3 leading-relaxed text-[#444]">
          {n.reports.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </blockquote>
        <p className="mt-3 text-[13px] text-[#666]">{n.reportsNote}</p>

        <h2 className="mt-8 font-bold">■ 遵守事項</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          {n.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>

        <h2 className="mt-8 font-bold">■ 補足</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          {n.notes.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <p className="mt-8">{n.closing}</p>
        <p className="text-[#888] line-through">{n.struck}</p>
        <div aria-hidden className="mt-4 h-5 w-full rounded bg-[#a9aeb6]" />

        <p className="mt-8">以上です。</p>
        <p className="text-[13px] text-[#555]">{n.from}</p>
      </article>
    </main>
  );
}
