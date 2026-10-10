// 窓の下、スマホの右に立てかけた「ガチ文のきほん」の冊子（ホチキス留めの A5）。押すと /guide へ（普通のリンク＝ゲームを通らずに読める）。
// 必ず next/link（素の <a> だとページを読み込み直して門が閉じる）。もどるで門が開いたまま元の位置に帰る。
// 文言は Hero の /guide ボタンと同じ（小さく「はじめて遊ぶ人へ」・大きく「ガチ文のきほん」）。右上の若葉の印も Hero の葉をそのまま使う。
import Link from "next/link";
import "./booklet.css";

export default function Booklet() {
  return (
    <Link href="/guide" className="kb-booklet">
      <svg className="kb-booklet-leaf" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 21c8-1 14-7 15-15 2 3 3 6 3 9-2 4-7 6-11 6-3 0-5-0-7 0z" fill="#2ea44f" />
        <path d="M6 18c4-1 8-5 9-9" fill="none" stroke="#ffe26a" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="kb-booklet-sub">はじめて遊ぶ人へ</span>
      <span className="kb-booklet-title">
        <span>ガチ文の</span>
        <span>きほん</span>
      </span>
    </Link>
  );
}
