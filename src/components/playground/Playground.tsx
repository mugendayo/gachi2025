// 窓際の机：窓の下に置いた机の上に、ぞんざいに置かれた物（ガチャガチャ・生徒指導ポイントカード・銀のアタッシュケース）。
// どれも触ると動く。文字は物に書いてあるものだけ。
import Gacha from "./Gacha";
import PointCard from "./PointCard";
import SilverCase, { type CaseSweets } from "./SilverCase";
import "./playground.css";

/** 銀のアタッシュケースの中身の絵（silverCase.content が sweets のとき）。透過 WebP・寸法は public/playground/sizes.json。
 *  ドーナツはケースの中の並びの順（SilverCase の DONUT_SLOTS）。puffy＝ふっくら丸い（寝ても平たくならない） */
const CASE_SWEETS: CaseSweets = {
  napkin: "/playground/napkin.webp",
  donuts: [
    { src: "/playground/donut-old.webp" },
    { src: "/playground/donut-powder.webp", puffy: true },
    { src: "/playground/donut-choco.webp" },
    { src: "/playground/donut-ring.webp" },
  ],
  puff: "/playground/puff.webp",
  puffSquash: "/playground/puff-squash.webp",
  creams: ["/playground/cream-1.webp", "/playground/cream-2.webp", "/playground/cream-3.webp", "/playground/cream-4.webp"],
};

export default function Playground() {
  return (
    <div className="pg-desk">
      <div className="pg-top">
        <div className="pg-slot pg-slot-gacha">
          <Gacha art={{ machine: "/playground/gacha.webp", capsule: "/playground/capsule.webp", capsuleOpen: "/playground/capsule-open.webp" }} />
        </div>
        <div className="pg-slot pg-slot-card">
          <PointCard art="/playground/card.webp" stamp="/playground/stamp.webp" />
        </div>
        <div className="pg-slot pg-slot-case">
          <SilverCase art="/playground/case.webp" artOpen="/playground/case-open.webp" sweets={CASE_SWEETS} />
        </div>
      </div>
    </div>
  );
}
