import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import Info from "@/components/Info";
import CharacterIntro from "@/components/CharacterIntro";

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Mission />
       <CharacterIntro /> {/* ←ここに追加 */}
      <Info />
    </main>
  );
}

