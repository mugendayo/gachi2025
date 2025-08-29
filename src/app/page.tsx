import Hero from "@/components/Hero";
import Info from "@/components/Info";
import CharacterIntro from "@/components/CharacterIntro";
import StageIntroSection from "@/components/StageIntroSection";
import SchoolIntro from "@/components/SchoolIntro"; // or 相対パス ../components/SchoolIntro
import TimeScheduleSection from "@/components/TimeScheduleSection";
import ImageMarquee, { type MarqueeImage } from "@/components/ImageMarquee";


export default function Page() {

   // ガチ文化祭の写真データをここで定義
  const past: MarqueeImage[] = [
    { src: "/past/2023/01.jpg", alt: "文化祭ステージ" },
    { src: "/past/2023/02.jpeg", alt: "教室展示" },
    { src: "/past/2023/03.jpg", alt: "パフォーマンス" },
    { src: "/past/2023/04.jpg" },
    { src: "/past/2023/05.jpg" },
  ];
  return (
    <main className="min-h-screen">
      <Hero />
      <SchoolIntro />
        {/* ★ここに追加する！ School → Character の橋渡し帯 */}
      <StageIntroSection />
      <ImageMarquee
        images={past}
        duration={30}
        heightClass="h-24 md:h-28"
        gapClass="gap-2 md:gap-3"
        pauseOnHover
        edgeFade
        framed
        respectReducedMotion={false}   // ← これがポイント
      />      {/* 追加 */}
      <CharacterIntro />   {/* 追加 */}
      <TimeScheduleSection />
      <Info />
    </main>
  );
}
