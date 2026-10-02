import Hero from "@/components/Hero";
import CharacterIntro from "@/components/CharacterIntro";
import StageIntroSection from "@/components/StageIntroSection";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro
import TimeScheduleSection from "@/components/TimeScheduleSection";
import FinalProductSection from "@/components/FinalProductSection";
import BottomZone from "@/components/BottomZone";
import RewardSection from "@/components/RewardSection";


export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <SchoolIntro />
      <StageIntroSection />
      <CharacterIntro />
      <TimeScheduleSection />
      <FinalProductSection/>
      <BottomZone />
      <RewardSection />
    </main>
  );
}
