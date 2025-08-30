// src/components/CtaButton.tsx
"use client";
import type { CSSProperties } from "react";

type Props = {
  label: string;
  subLabel?: string;
  /** href を渡すと <a>、onClick を渡すと <button> として描画 */
  href?: string;
  onClick?: () => void;
  variant?: "orange" | "black";
  className?: string;
  style?: CSSProperties;
  target?: "_self" | "_blank";
  rel?: string;
  fullWidth?: boolean;
  ariaLabel?: string;
};

export default function CtaButton({
  label,
  subLabel,
  href,
  onClick,
  variant = "orange",
  className = "",
  style,
  target = "_self",
  rel,
  fullWidth = true,
  ariaLabel,
}: Props) {
  const base = [
    "relative group block select-none",
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");

  // 黒ボタン（シンプル）
  if (variant === "black") {
    const Inner = (
      <span
        className="
          inline-flex items-center justify-center rounded-full
          bg-black text-white px-5 py-2 text-sm hover:opacity-90
          shadow-[0_8px_22px_rgba(0,0,0,.25)] ring-1 ring-black/5
        "
      >
        {label}
      </span>
    );
    return onClick ? (
      <button type="button" onClick={onClick} className={base} style={style} aria-label={ariaLabel ?? label}>
        {Inner}
      </button>
    ) : (
      <a href={href!} target={target} rel={rel} className={base} style={style} aria-label={ariaLabel ?? label}>
        {Inner}
      </a>
    );
  }

  // オレンジ横長CTA（AdmissionCTA と同じトーン）
  const Inner = (
    <span
      className="
        block mx-auto rounded-[18px] px-6 md:px-10 py-5 md:py-7 text-center
        shadow-[0_12px_28px_rgba(0,0,0,.18)] ring-1 ring-black/5
        transition hover:-translate-y-0.5 active:translate-y-0
      "
      style={{ background: "linear-gradient(180deg,#FFA91A 0%, #FF8A00 100%)" }}
    >
      {/* テクスチャ/ハイライト */}
      <span className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(120%_140%_at_0%_0%,rgba(255,255,255,.25),transparent_60%)] opacity-60 mix-blend-soft-light" />
      <span className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_1.5px_0_rgba(255,255,255,.65)]" />
      <span
        className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition"
        style={{ background: "linear-gradient(180deg,#FFBE3B00 0%, #FF9C1A66 100%)" }}
      />
      {/* 文字：2段 */}
      <span className="relative z-10 block">
        <span className="block text-white font-extrabold tracking-wide leading-none text-[28px] md:text-[40px] drop-shadow-[0_2px_0_rgba(0,0,0,.18)]">
          {label}
        </span>
        {subLabel && (
          <span className="mt-2 block text-white/95 font-semibold tracking-wide text-[14px] md:text-[18px]">
            {subLabel}
          </span>
        )}
      </span>
      {/* きらん */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/2 rotate-12 rounded-[18px]"
        style={{
          background:
            "linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.7)_50%,rgba(255,255,255,0)_100%)",
          filter: "blur(2px)",
        }}
      />
    </span>
  );

  // a / button を自動分岐
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={base}
      style={style}
      aria-label={ariaLabel ?? label}
    >
      {Inner}
      <style jsx>{`
        .group:hover > span { transform: scale(1.015); }
        .group:hover > span > span:nth-child(3) { opacity: 1; }
        .group:hover > span > span:last-child { animation: shine 1.2s ease-out both; }
        @keyframes shine {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          20% { opacity: .9; }
          100% { transform: translateX(220%) rotate(12deg); opacity: 0; }
        }
      `}</style>
    </button>
  ) : (
    <a
      href={href!}
      target={target}
      rel={rel}
      className={base}
      style={style}
      aria-label={ariaLabel ?? label}
    >
      {Inner}
      <style jsx>{`
        .group:hover > span { transform: scale(1.015); }
        .group:hover > span > span:nth-child(3) { opacity: 1; }
        .group:hover > span > span:last-child { animation: shine 1.2s ease-out both; }
        @keyframes shine {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          20% { opacity: .9; }
          100% { transform: translateX(220%) rotate(12deg); opacity: 0; }
        }
      `}</style>
    </a>
  );
}
