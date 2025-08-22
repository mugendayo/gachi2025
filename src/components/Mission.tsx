// src/components/Mission.tsx
export default function Mission() {
  return (
    <section id="mission" className="py-16 text-center">
      {/* 旧ボタンは削除。ここは常に説明ブロックに */}
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-3xl font-bold mb-4">ミッション</h2>
        <p className="text-lg leading-relaxed">
          “ガチな文化祭を作れ！”
          <br />
          参加者全員がクリエイター。見るだけじゃなく、創る側へ。
        </p>
      </div>
    </section>
  );
}
