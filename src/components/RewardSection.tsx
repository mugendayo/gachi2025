// もちものが3つ揃ったあと（揃った瞬間の演出と、そのあとの状態）は clockfall/ClockFall が受け持つ。
// ここは、読み込み時にすでに揃っていたら、絵が出る前に教室の壁の時計を外しておく一行だけ（保存の名前は lib/items と同じ）。
import { site } from "@/data/site";
import ClockFall from "./clockfall/ClockFall";

const ids = JSON.stringify(site.items.map((it) => it.id));
// 確認用（localhost と Preview だけ）：?items=0〜3 で、持ち物をその数だけ持った状態から始める（時計が割れた記録も消す）。?items=2 なら最後の1つを拾うと時計が落ちる
const debugItems = `if(/^(localhost|127\.0\.0\.1)$|-mugendayos-projects\.vercel\.app$/.test(location.hostname)){var dm=location.search.match(/[?&]items=([0-3])(&|$)/);if(dm){localStorage.setItem("gbf_${site.year}_items",JSON.stringify(${ids}.slice(0,+dm[1])));localStorage.removeItem("gbf_${site.year}_clockfall")}}`;
const boot = `try{${debugItems}var o=JSON.parse(localStorage.getItem("gbf_${site.year}_items")||"[]");if(${ids}.every(function(i){return o.indexOf(i)>=0})){var w=document.getElementById("kb-world");if(w)w.setAttribute("data-cf","gone")}}catch(e){}`;

export default function RewardSection() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <ClockFall />
    </>
  );
}
