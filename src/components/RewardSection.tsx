// もちものが3つ揃ったあと（揃った瞬間の演出と、そのあとの状態）は clockfall/ClockFall が受け持つ。
// ここは、読み込み時にすでに揃っていたら、絵が出る前に教室の壁の時計を外しておく一行だけ（保存の名前は lib/items と同じ）。
import { site } from "@/data/site";
import ClockFall from "./clockfall/ClockFall";

const ids = JSON.stringify(site.items.map((it) => it.id));
const boot = `try{var o=JSON.parse(localStorage.getItem("gbf_${site.year}_items")||"[]");if(${ids}.every(function(i){return o.indexOf(i)>=0})){var w=document.getElementById("kb-world");if(w)w.setAttribute("data-cf","gone")}}catch(e){}`;

export default function RewardSection() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <ClockFall />
    </>
  );
}
