// src/components/Mission.tsx
export default function Mission() {
  return (
    <section id="mission" className="py-16 text-center">
      {/* 旧ボタンは削除。ここは常に説明ブロックに */}
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-3xl font-bold mb-4">ミッション</h2>
        <p className="text-lg leading-relaxed">
          “全員で「ガチな文化祭」を作れ！”
        </p>
      </div>
    </section>
  );
}
