import Hero from "@/components/Hero";
import Info from "@/components/Info";
import CharacterIntro from "@/components/CharacterIntro";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <SchoolIntro />      {/* 追加 */}
      <CharacterIntro />   {/* 追加 */}
      <Info />
    </main>
  );
}
