// src/components/FinalProductSection.tsx
"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type InfoRow = { iconSrc: string; label: string; href?: string };

export default function FinalProductSection({
  coverSrc = "/icons/cover.png",
  badgeText = "タイムスリップ版",
  msrp = "31,800円（税込）",
  infoTitle = "購入する",
  infoBody = "ダミー",
  rows = [
    { iconSrc: "/icons/ticket-red.png", label: "はじめての人向けページ", href: "/getting-started" },
    { iconSrc: "/icons/discord.jpg",    label: "高校のDiscordリンク（無料で入れます）", href: "https://discord.gg/BaCmFRfM" },
  ] as InfoRow[],
  thirdItemSrc = "/icons/arm.png",
  companyLogoSrc = "/icons/thg.png",
  ariaLabelThird = "不思議なアイテムを手に入れる",
  // ▼ 追加
  purchaseHref = "/buy",
  purchaseSubText = "マイニンテンドーストア",
}: {
  
  ariaLabelThird?: string;
  purchaseHref?: string;       // ← 追加
  purchaseSubText?: string;    // ← 追加

  coverSrc?: string;
  badgeText?: string;
  msrp?: string;
  infoTitle?: string;
  infoBody?: string;
  rows?: InfoRow[];
  thirdItemSrc?: string;
  companyLogoSrc?: string;
}) {
  /* ---------------- セッション内の所持状況（永続化しない） ---------------- */
  const [crestAcquired, setCrestAcquired] = useState(false); // 2つ目（校章）
  const [thirdAcquired, setThirdAcquired] = useState(false); // 3つ目（このセクション）
  // 追加
const [showThgSweep, setShowThgSweep] = useState(false);

  const hasAllItems = useMemo(() => crestAcquired && thirdAcquired, [crestAcquired, thirdAcquired]);

  // 変身演出
  const [isTransforming, setIsTransforming] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false); // 揃った直後のみ“ピカーン”
  const timersRef = useRef<number[]>([]);
  const mountedRef = useRef(false);
  const prevHasAllRef = useRef(false);

  // 初期化：リロード時は常に未所持（1個目のみ想定）/ セッション内のイベントで同期
  useEffect(() => {
    setCrestAcquired(false);
    setThirdAcquired(false);

    const onCrest = () => setCrestAcquired(true);           // 他セクションからの取得イベント
    const onThird = () => setThirdAcquired(true);            // 念のため（同一タブ内で使う）
    window.addEventListener("crest:acquired", onCrest);
    window.addEventListener("artifact3:acquired", onThird);
    return () => {
      window.removeEventListener("crest:acquired", onCrest);
      window.removeEventListener("artifact3:acquired", onThird);
    };
  }, []);

  // “揃った瞬間”だけフラッシュ（初回マウントでは発火しない）
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevHasAllRef.current = crestAcquired && thirdAcquired;
      return;
    }
    const prev = prevHasAllRef.current;
    const now = crestAcquired && thirdAcquired;
    if (!prev && now) {
    setJustCompleted(true);
    const t1 = window.setTimeout(() => setJustCompleted(false), 800);

    // ▼ 追加：裏モード演出（1秒）
    setShowThgSweep(true);
    const t2 = window.setTimeout(() => setShowThgSweep(false), 1000);

    timersRef.current.push(t1, t2);
    try { window.dispatchEvent(new Event("items:all-collected")); } catch {}
    }

    prevHasAllRef.current = now;
  }, [crestAcquired, thirdAcquired]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // 3つ目をインベントリに挿入（DOM差し込み）— 永続化しない
  const giveThirdItem = () => {
    try {
      const slots = document.querySelectorAll<HTMLElement>(".tg-inv-grid .tg-inv-slot");
      const slot = slots[2]; // 0: 生徒証, 1: 校章, 2: 3つ目
      if (slot) {
        let img = slot.querySelector("[data-auto='artifact3']") as HTMLImageElement | null;
        if (!img) {
          img = document.createElement("img");
          img.src = thirdItemSrc;
          img.alt = "3つ目のアイテム";
          img.setAttribute("data-auto", "artifact3");
          Object.assign(img.style, {
            width: "86%", height: "86%", objectFit: "contain",
            transform: "scale(0.6)", opacity: "0",
            animation: "artifact-pop-in 460ms cubic-bezier(0.16,1,0.3,1) forwards",
          } as CSSStyleDeclaration);
          slot.classList.remove("tg-inv-empty");
          slot.appendChild(img);
        } else {
          img.style.animation = "none"; void img.offsetWidth;
          img.style.animation = "artifact-pop-in 460ms cubic-bezier(0.16,1,0.3,1) forwards";
        }
      }
    } catch {}
    setThirdAcquired(true);
    try { window.dispatchEvent(new Event("artifact3:acquired")); } catch {}
  };

  // クリック：2つ目を持ってない間は取れない（ガード）。取れる時は変身→付与→ロゴへ
  const onClickThird = () => {
    if (thirdAcquired || isTransforming) return;
    if (!crestAcquired) return; // ★ ガード：校章未所持なら何もしない

    setIsTransforming(true);
    const tGrant = window.setTimeout(() => { giveThirdItem(); }, 400); // 中盤で取得
    const tEnd   = window.setTimeout(() => { setIsTransforming(false); }, 760); // 変身終了
    timersRef.current.push(tGrant, tEnd);
  };

  return (
    <section id="final" className="relative py-14 md:py-20">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        {/* 青いカード全体 */}
        <div className="rounded-[20px] bg-[#1975c5] text-white shadow-[0_18px_40px_rgba(0,0,0,.25)] ring-1 ring-black/10 overflow-hidden">
          {/* 上段：画像 + タイトル/価格 */}
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8 p-5 md:p-8">
            {/* 画像＋バッジ */}
            <div className="relative justify-self-center md:justify-self-start">
              <div className="rounded-xl overflow-hidden ring-2 ring-white/70 shadow-[0_10px_22px_rgba(0,0,0,.35)] bg-white">
                <Image src={coverSrc} alt="ゲームソフト画像" width={300} height={380} className="block h-auto w-[220px] sm:w-[260px] md:w-[280px] object-cover" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-md bg-white text-[#2e2e2e] px-2.5 py-1 text-[12px] font-semibold ring-1 ring-black/10 shadow-sm whitespace-nowrap">
                  {badgeText}
                </span>
              </div>
            </div>

            {/* タイトル/価格エリア */}
            <div className="flex flex-col justify-center">
              <h3 className="text-[clamp(20px,4.6vw,32px)] font-extrabold tracking-wide drop-shadow-[0_2px_0_rgba(0,0,0,.25)]">
                ガチ文化祭２０２５
              </h3>
              <div className="mt-3 text-sm/relaxed opacity-90">発売日：2025年11月1日（仮）</div>
              <div className="mt-4">
                <div className="text-[15px] md:text-[16px] opacity-90">希望小売価格</div>
                <div className="mt-1 inline-flex items-baseline gap-2 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/25">
                  <span className="text-[clamp(22px,5.4vw,32px)] font-extrabold tracking-wide">{msrp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 下段：白い枠 */}
          <div className="bg-white text-[#1b1b1b] p-5 md:p-7">
            <div className="rounded-2xl border border-[#e6e6e6] shadow-sm bg-white overflow-hidden">
           {/* 購入ボタン（Nintendo風） */}
<div className="px-4 md:px-6 pt-5">
  <a
    href={purchaseHref}
    aria-label={`${infoTitle}`}
    target={purchaseHref.startsWith("http") ? "_blank" : undefined}
    rel="noreferrer"
    className="group relative block w-full rounded-[14px] px-5 py-4 md:py-5 text-center text-white bg-gradient-to-b from-[#FF6A9E] to-[#FF4F90] ring-1 ring-black/10 shadow-[0_10px_26px_rgba(0,0,0,.25)] transition-transform duration-200 will-change-transform transform-gpu hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(0,0,0,.32)] active:scale-[0.995]"
  >
    <span className="flex items-center justify-center gap-3">
      {/* シンプルなカートアイコン（白） */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <path d="M7 6h14l-1.6 8.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-1.9-1.4L5 3H2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="21" r="1.6" fill="white"/>
        <circle cx="18" cy="21" r="1.6" fill="white"/>
      </svg>
      <span className="text-[18px] md:text-[20px] font-extrabold tracking-wide">
        {infoTitle || "購入する"}
      </span>
    </span>
    <span className="mt-1 block text-[11px] md:text-[12px] opacity-90">
      {purchaseSubText}
    </span>

    {/* 上面ハイライト */}
    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-[14px] bg-white/10" />
  </a>

  {/* ボタン直下の補足テキスト（細字） */}
  {infoBody && (
    <p className="mt-3 text-[13px] md:text-[14px] leading-relaxed text-[#374151]">
      {infoBody}
    </p>
  )}
</div>


              {/* 行カード */}
              <div className="px-4 md:px-6 pb-5 md:pb-6 space-y-3">
                {rows.map((r, i) => {
                  const content = (
                    <div className="w-full grid grid-cols-[56px_1fr] md:grid-cols-[64px_1fr] items-center gap-3 md:gap-4 rounded-xl border border-[#ececec] bg-white hover:bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,.05)] p-3 md:p-4 transition">
                      <div className="relative h-12 w-12 md:h-14 md:w-14">
                        <Image src={r.iconSrc} alt="" fill sizes="(max-width: 768px) 48px, 56px" className="object-contain" />
                      </div>
                      <div className="text-[15px] md:text-[16px] font-semibold text-[#1f2937]">{r.label}</div>
                    </div>
                  );
                  return r.href ? (
                    <a key={i} href={r.href} className="block" target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      {content}
                    </a>
                  ) : (
                    <div key={i}>{content}</div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* セクション下の余白 */}
        <div className="h-16 md:h-20" />
      </div>

      {/* ===== 下中央：第3アイテム／変身／ロゴ ===== */}
      <div className="absolute z-[70] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3" style={{ bottom: "clamp(12px,3.2vw,20px)" }} >
        {isTransforming ? (
          // 変身ステージ
          <div className="pointer-events-none relative grid place-items-center">
            <span className="morph-aura absolute inset-0" aria-hidden />
            <img
              src={thirdItemSrc}
              alt=""
              className="morph-item block select-none pointer-events-none"
              style={{ width: "clamp(72px,12vw,112px)", height: "clamp(72px,12vw,112px)" }}
              draggable={false}
            />
          </div>
        ) : (
          <>
            {/* 取得前（押せる）— 2つ目が無いと何もしない */}
            {!hasAllItems && !thirdAcquired && (
              <button
                type="button"
                onClick={onClickThird}
                aria-label={ariaLabelThird}
                className="pointer-events-auto group relative grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                style={{ width: "clamp(72px,12vw,112px)", height: "clamp(72px,12vw,112px)" }}
              >
                <span aria-hidden className="absolute inset-0 rounded-full glow-ring" />
                <img
                  src={thirdItemSrc}
                  alt=""
                  className="relative z-10 block h-[70%] w-[70%] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,.35)]"
                  draggable={false}
                />
              </button>
            )}

            {/* 3つ未満だが3つ目は取得済み → 小さめ表示 */}
            {!hasAllItems && thirdAcquired && (
              <div
                className="pointer-events-none relative grid place-items-center rounded-full opacity-85"
                style={{ width: "clamp(64px,10vw,96px)", height: "clamp(64px,10vw,96px)" }}
              >
                <img src={thirdItemSrc} alt="" className="relative z-10 block h-[64%] w-[64%] object-contain" />
              </div>
            )}

            {/* 揃ったらロゴ（直後だけピカーン） */}
            {hasAllItems && (
              <div className="pointer-events-none relative grid place-items-center -translate-y-3 md:-translate-y-4 ">
                {justCompleted && <div className="logo-flash absolute inset-0" aria-hidden />}
                <img
                  src={companyLogoSrc}
                  alt="ThanatosGames"
                  className="block h-auto w-[min(56vw,220px)] md:w-[220px] object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,.35)]"
                  draggable={false}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showThgSweep && (
  <div className="fixed inset-0 z-[1002] pointer-events-none">
    {/* フェード暗転 */}
    <div className="absolute inset-0 thg-mode-dim" />
    {/* 90度回転させたロゴを画面いっぱいでスライドイン */}
    <div className="thg-sweep-wrap">
      <img
        src={companyLogoSrc}
        alt=""
        className="thg-sweep-img"
        draggable={false}
      />
    </div>
  </div>
)}


      {/* ===== エフェクト用スタイル ===== */}
      <style jsx global>{`
        @keyframes artifact-pop-in {
          0%   { transform: scale(0.6); opacity: 0; filter: blur(2px); }
          60%  { transform: scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: scale(1);    opacity: 1; filter: blur(0); }
        }
        .glow-ring {
          background:
            radial-gradient(60% 60% at 50% 50%, rgba(135,230,255,.75), transparent 70%),
            radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.7), transparent 62%);
          box-shadow:
            0 0 14px rgba(140,230,255,.65),
            0 0 34px rgba(60,200,255,.45);
          animation: glow-pulse 2.2s ease-in-out infinite alternate;
          filter: blur(.5px);
        }
        @keyframes glow-pulse {
          0%   { opacity: .85; transform: scale(1); }
          100% { opacity: 1;    transform: scale(1.05); }
        }

        /* 変身アニメ */
        .morph-item { animation: morph-item-kf 760ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes morph-item-kf {
          0%   { transform: scale(1);    opacity: 1;   filter: blur(0);    }
          40%  { transform: scale(1.28); opacity: 1;   filter: blur(0.4px);}
          100% { transform: scale(0.25); opacity: 0;   filter: blur(1px);  }
        }
        .morph-aura {
          background:
            radial-gradient(closest-side, rgba(160,240,255,.85), rgba(160,240,255,0) 70%) center/130% 130% no-repeat;
          filter: blur(2px);
          animation: morph-aura-kf 760ms cubic-bezier(0.22,1,0.36,1) both;
          pointer-events: none;
        }
        @keyframes morph-aura-kf {
          0%   { opacity: 0;   transform: scale(0.9); }
          35%  { opacity: .9;  transform: scale(1.1); }
          100% { opacity: 0;   transform: scale(1.2); }
        }

        /* ロゴ出現の“ピカーン” */
        .logo-flash {
          background:
            radial-gradient(closest-side, rgba(255,255,255,.95), rgba(255,255,255,0) 70%) center/180% 180% no-repeat;
          filter: blur(2px);
          animation: logo-flash-kf 800ms cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
        }
        @keyframes logo-flash-kf {
          0%   { opacity: 0;  transform: scale(0.92); }
          30%  { opacity: 1;  transform: scale(1.14); }
          60%  { opacity: .7; transform: scale(1.00); }
          100% { opacity: 0;  transform: scale(1.00); }
        }
          /* 裏モード：フェード暗転（1秒） */
.thg-mode-dim {
  background: #000;
  animation: thg-dim-kf 1000ms ease-in-out both;
}
@keyframes thg-dim-kf {
  0%   { opacity: 0; }
  15%  { opacity: 0.75; }
  85%  { opacity: 0.75; }
  100% { opacity: 0; }
}

/* ロゴスイープ：90度回転＋画面いっぱいでスライド */
.thg-sweep-wrap {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%) rotate(90deg); /* 右に90度 */
  width: 140vh;           /* 回転しても画面を覆うように高さ基準で拡大 */
  max-width: none;
}
.thg-sweep-img {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0.95;
  filter: drop-shadow(0 8px 28px rgba(0,0,0,.45));
  transform: translateX(-120%);
  animation: thg-sweep-kf 1000ms cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes thg-sweep-kf {
  0%   { transform: translateX(-120%); }
  50%  { transform: translateX(0%); }
  100% { transform: translateX(120%); }
}

      `}</style>
    </section>
  );
}
