// src/components/Info.tsx
export default function Info() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-6">
        <ul className="space-y-2 text-lg">
          <li><strong>日程：</strong>2025/11/01-03 (土日祝)</li>
          <li><strong>場所：</strong>奈良県 下市集学校（旧下市中学校）</li>
          <li><strong>チケット：</strong>ガチ文高等学校の世界に3日間タイムスリップする 31,800円 / ガチ文化祭当日参加 無料</li>
        </ul>
        <a href="#" className="mt-6 inline-block rounded-full border px-6 py-2 text-sm">
          今すぐ申し込む
        </a>
      </div>
    </section>
  );
}

