import { site } from "@/data/site";

export default function Info() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-6">
        <ul className="space-y-3 text-lg">
          <li><strong>日程：</strong>{site.date}</li>
          <li><strong>場所：</strong>{site.place}</li>
          <li><strong>チケット：</strong>{site.price}</li>
        </ul>
        <a
          href={site.ctaUrl}
          className="mt-8 inline-block rounded-full border px-6 py-3 text-sm"
        >
          今すぐ申し込む
        </a>
      </div>
    </section>
  );
}
