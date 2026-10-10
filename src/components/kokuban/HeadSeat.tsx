"use client";
// 職員室の座席表の頭の席（校長・教頭）。押すと写真2枚のカードが開く（ブラウザ標準の <dialog>）。
// カードはいちばん上の層（top layer）に出るので、持ち物欄・公式バー・時計の落下より必ず上に来る。
// 閉じ方：×・写真の外（暗幕・まわりの余白）を押す・Esc・Android の戻る（どれも標準の動き。履歴は足さない＝BackButton の判定を狂わせない）。
// 閉じると押した席に注目が戻る（標準の動き）。開いている間の後ろのスクロール止めは staff.css。
// 画面に出す字は座席の札・名前・読みだけ。カードの見出しと説明（2025年版の肩書き・名前・紹介文）は読み上げ用。
import { useRef, type MouseEvent } from "react";
import type { Head } from "@/data/teachers";

/** 開いた直後のこの時間（ms）は、写真の外を押しても閉じない（席を2回続けて押した2回目で、開いたカードがすぐ閉じないように） */
const GUARD_MS = 400;

export default function HeadSeat({ head }: { head: Head }) {
  const dlgRef = useRef<HTMLDialogElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const openedAt = useRef(0);
  const hid = `kb-head-${head.id}`;

  const open = () => {
    const d = dlgRef.current;
    if (!d || d.open) return;
    d.showModal();
    openedAt.current = performance.now();
    // 前に2枚目までめくっていても、開くたびに1枚目から
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  };
  const close = () => dlgRef.current?.close();
  // 写真の外を押したら閉じる（押した場所がカードの地そのもの＝dialog か、写真の帯の余白＝.kb-head-track のときだけ）
  const onDlgClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (performance.now() - openedAt.current < GUARD_MS) return;
    if (e.target === e.currentTarget || e.target === trackRef.current) close();
  };

  return (
    <>
      <button type="button" className="kb-desk kb-headseat" data-id={head.id} aria-haspopup="dialog" onClick={open}>
        {head.room && <span className="kb-head-room">{head.room}</span>}
        <span className="kb-head-desk">
          {/* あとからセロテープで貼った写真 */}
          <span className="kb-head-photo">
            <img src={head.thumb} alt="" loading="lazy" decoding="async" draggable={false} />
          </span>
          {head.role && <span className="kb-desk-title">{head.role}</span>}
          <span className="kb-desk-name">{head.name}</span>
          <span className="kb-desk-reading">{head.reading}</span>
        </span>
      </button>
      <dialog
        ref={dlgRef}
        className="kb-head-dlg"
        aria-labelledby={`${hid}-h`}
        aria-describedby={`${hid}-d`}
        onClick={onDlgClick}
      >
        {/* × は先頭に置く（開いたときに最初に注目が当たる所） */}
        <button type="button" className="kb-head-x" aria-label="閉じる" onClick={close}>
          <span aria-hidden>×</span>
        </button>
        <div className="kb-head-body">
          <h2 id={`${hid}-h`} className="sr-only">
            {head.title}　{head.fullName}
          </h2>
          <p id={`${hid}-d`} className="sr-only">
            {head.bio}
          </p>
          {/* スマホは1枚ずつ横にめくる（CSS の scroll-snap だけ）。PC は2枚を横に並べる。閉じている間は写真を読まない（lazy） */}
          <div ref={trackRef} className="kb-head-track">
            {head.story.map((s) => (
              <img
                key={s.src}
                className="kb-head-shot"
                src={s.src}
                alt={s.alt}
                width={540}
                height={960}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
