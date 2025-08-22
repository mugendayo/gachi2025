// src/components/Hero.tsx
export default function Hero() {
  return (
    <section className="relative min-h-[70vh] grid place-items-center text-center overflow-hidden bg-white">
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        poster="/og.jpg" // ← 無くてもOK。あれば黒ベタ回避に有効
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* テキストは必ず動画の上に載せる */}
      <div className="relative z-10 p-6 text-black">
        <h1 className="text-4xl md:text-6xl font-bold">ガチ文化祭2025</h1>
        <p className="mt-4 text-lg md:text-xl">ぼくらは一生、ナナメのポーズをしてた</p>
      </div>
    </section>
  );
}
