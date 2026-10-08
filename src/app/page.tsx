// トップ＝入口（動画・魔法陣）→ 教室の黒板。黒板の日付と「あと◯日」は実際の今日、光は日本時間の実時刻で変わる。
// 並び＝校舎の空間（教室 → 教室の後ろ → 廊下 → 職員室 → 舞台 → 学校の外の箱 → 最下部）。
// 公式バーとフッター（定番規格）は layout 側。ここはその内側だけ。
import { site } from "@/data/site";
import { bootScript } from "@/lib/worldClock";
import Entry from "@/components/entry/Entry";
import Classroom from "@/components/kokuban/Classroom";
import WindowSide from "@/components/kokuban/WindowSide";
import { BackOfRoom, Corridor, Staffroom, Stage } from "@/components/kokuban/Places";
import Outside from "@/components/outside/Outside";
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
      data-gate="closed"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: bootScript() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />

      {/* JS が動かない環境では門を開けたまま（学校もそのまま読める） */}
      <noscript>
        <style>{`.kb-world[data-gate="closed"] .kb-school { display: block !important; }`}</style>
      </noscript>

      <Entry />
      {/* 門の内側＝ゲームの中の世界線：学校 */}
      <div className="kb-school" id="kb-school">
        <Classroom />
        <WindowSide />
        <BackOfRoom />
        <Corridor />
        <Staffroom />
        <Stage />
      </div>
      {/* 門の外＝現実の世界線：いつでも高校生に戻れる社会をつくるために、いろんな場所で文化祭をつくっている（理念・きっかけ・実績・今年の開催概要・参加する）。門をくぐると消える */}
      <div className="kb-real">
        <Outside />
      </div>
      <div className="kb-school">
        <BottomZone />
        <RewardSection />
      </div>
      <Inventory />
    </main>
  );
}
