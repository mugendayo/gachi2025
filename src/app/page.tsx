// トップ＝入口（動画・魔法陣）→ 教室の黒板。黒板の日付と「あと◯日」は実際の今日、光は日本時間の実時刻で変わる。
// 並び＝校舎の空間（教室 → 教室の後ろ → 廊下 → 職員室 → 舞台 → 学校の外の箱 → 最下部）。
// 公式バーとフッター（定番規格）は layout 側。ここはその内側だけ。
import { site } from "@/data/site";
import { bootScript } from "@/lib/worldClock";
import Entry from "@/components/entry/Entry";
import Classroom from "@/components/kokuban/Classroom";
import { BackOfRoom, Corridor, PackageBox, Staffroom, Stage } from "@/components/kokuban/Places";
import BottomZone from "@/components/BottomZone";
import RewardSection from "@/components/RewardSection";
import Inventory from "@/components/Inventory";
import "@/components/kokuban/kokuban.css";

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: site.title,
  description: `${site.dateLabel}　${site.place}`,
  image: [`${site.siteUrl}${site.ogImage}`],
  startDate: site.world.eventDates.d1,
  endDate: site.world.eventDates.d4,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: site.placeShort,
    address: { "@type": "PostalAddress", addressRegion: "奈良県", addressLocality: "吉野郡下市町", addressCountry: "JP" },
  },
  offers: {
    "@type": "Offer",
    price: "38700",
    priceCurrency: "JPY",
    url: site.siteUrl,
    availability: "https://schema.org/InStock",
    validFrom: "2026-10-01T00:00:00+09:00",
  },
  organizer: { "@type": "Organization", name: "ThanatosGames", url: "https://thanatosgames.jp/" },
  url: site.siteUrl,
};

export default function Page() {
  return (
    <main
      id="kb-world"
      className="kb-world"
      data-phase="eve"
      data-day={site.world.rhythmDay}
      data-band="day"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: bootScript() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />

      <Entry />
      <Classroom />
      <BackOfRoom />
      <Corridor />
      <Staffroom />
      <Stage />
      <PackageBox />
      <BottomZone />
      <RewardSection />
      <Inventory />
    </main>
  );
}
