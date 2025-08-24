import Hero from "@/components/Hero";
import Info from "@/components/Info";
import CharacterIntro from "@/components/CharacterIntro";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />

      {/* Heroの直後にセクションを追加 */}
      <section className="relative py-24 bg-white text-black">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">次のセクション</h2>
          <p className="mt-4 leading-relaxed">
            ここからは背景も通常スクロール。商品リンクやボタン等を置くゾーン。
          </p>
        </div>
      </section>

      <SchoolIntro />      {/* 追加 */}
      <CharacterIntro />   {/* 追加 */}
      <Info />
    </main>
  );
}
