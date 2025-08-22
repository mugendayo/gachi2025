"use client";
import { site } from "@/data/site";

export default function Hero() {
  return (
    <section className="relative min-h-[70vh] grid place-items-center text-center">
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        autoPlay muted loop playsInline
        src="/hero.mp4"
      />
      <div className="relative z-10 p-6">
        <h1 className="text-4xl md:text-6xl font-bold">{site.title}</h1>
        <p className="mt-4 text-lg md:text-xl">一生、文化祭前夜。</p>
        <a
          href={site.ctaUrl}
          className="mt-8 inline-block rounded-full border px-6 py-3 text-sm"
        >
          申し込む
        </a>
      </div>
    </section>
  );
}
