import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import Info from "@/components/Info";
import CharacterIntro from "@/components/CharacterIntro";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro


export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Mission />
      <CharacterIntro /> {/* ←ここに追加 */}
      <SchoolIntro />   {/* ←ここ追加 */}
      <Info />
    </main>
  );
}

