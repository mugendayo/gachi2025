'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';

type Props = {
  /** ポップアップを一度でも開いたら true */
  show: boolean;
  /** 遷移先（購入ページ） */
  href?: string;
  /** 画像パス */
  src?: string;
  /** サイズ（CSS長さ） */
  size?: number; // px
  /** 追加クラス */
  className?: string;
};

export default function TicketGlowButton({
  show,
  href = 'https://gachibun.studio.site/ticket', // 実URLに差し替え可
  src = '/ticket-btn.gif',
  size = 120,
  className = '',
}: Props) {
  const style = useMemo<React.CSSProperties>(() => ({
    // セーフエリア考慮（iOSなど）
    right: 'calc(16px + env(safe-area-inset-right))',
    bottom: 'calc(16px + env(safe-area-inset-bottom))',
    // フェード→常時発光ループ
    animation: show
      ? 'tg-fade-in 0.8s ease-out 0.4s both, tg-glow 2.2s ease-in-out 1.2s infinite alternate'
      : 'none',
  }), [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden={false}
      style={style}
      className={`fixed z-[60] tg-anim ${className}`}
    >
      <Link
        href={href}
        aria-label="チケットを購入する"
        prefetch={false}
        className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            // クリック判定を円形に近づける（微妙に内側）
            padding: 4,
          }}
        >
          {/* 画像はレティナ向けに優先度高め／ドラッグ無効 */}
          <Image
            src={src}
            alt="TICKET"
            width={size - 8}
            height={size - 8}
            draggable={false}
            priority
            className="select-none pointer-events-none"
          />
        </div>
      </Link>
    </div>
  );
}
