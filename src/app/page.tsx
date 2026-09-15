import Hero from "@/components/Hero";
import CharacterIntro from "@/components/CharacterIntro";
import StageIntroSection from "@/components/StageIntroSection";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro
import TimeScheduleSection from "@/components/TimeScheduleSection";
import FinalProductSection from "@/components/FinalProductSection";


export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <SchoolIntro />
      <StageIntroSection />
      <CharacterIntro />
      <TimeScheduleSection />
      <FinalProductSection/>
    </main>
  );
}
