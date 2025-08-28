// components/StageIntroSection.tsx
// 次セクション「ステージ紹介」
// そのまま <StageIntroSection /> を Hero の直後に配置してください。

export default function StageIntroSection() {
  return (
    <section id="stage" className="relative bg-gradient-to-b from-black/70 to-black text-white">
      {/* 背景テクスチャ（薄い斜線）※不要ならこのdivごと削除 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(135deg, #fff, #fff 6px, transparent 6px, transparent 14px)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* 見出し */}
        <div className="mb-8 md:mb-12">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold leading-none ring-1 ring-white/15">
            ステージ紹介
          </span>
          <h2 className="mt-4 text-2xl md:text-4xl font-bold tracking-tight">
            舞台は奈良の学校。<span className="opacity-90">下市集学校</span>。
          </h2>
          <p className="mt-3 text-sm md:text-base text-white/80">
            ミッションはただ一つ。ガチで最高な文化祭を作り上げること。
          </p>
        </div>

        {/* 2カラム */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* 左：要点リスト＋ボタン */}
          <div>
            <ul className="space-y-4">
              {[
                "舞台は奈良の学校",
                "ミッションはガチで最高な文化祭を作り上げること！",
                "授業や体育祭など、高校生に戻ったような気持ちになれる！",
              ].map((line, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-bold ring-1 ring-white/20">
                    {idx + 1}
                  </span>
                  <p className="text-sm md:text-base leading-relaxed">{line}</p>
                </li>
              ))}
            </ul>

            {/* 下市集学校 紹介ボタン */}
            <div className="mt-6 md:mt-8">
              <a
                href="https://gachibun.studio.site/"
                target="_blank"
                rel="noopener"
                className={[
                "inline-flex select-none items-center justify-center",
                "w-[88%] max-w-[340px] h-12 md:h-14 px-6 rounded-full",
                "bg-gradient-to-b from-amber-400 to-orange-500 text-white",
                "text-sm md:text-base font-semibold tracking-wide",
                "shadow-[0_10px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/10",
                "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(0,0,0,0.4)]",
                "relative overflow-hidden",
            ].join(" ")}
            >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                {/* ここを .btn-glint に差し替え（Heroの global スタイルを再利用） */}
                <span className="btn-glint block absolute -inset-y-2 -left-1/3 w-1/2 rotate-12" />
            </span>
            下市集学校の紹介を見る
            </a>
              <p className="mt-2 text-xs text-white/60">
                ※ 公式サイト（外部）へ移動します
              </p>
            </div>
          </div>

          {/* 右：ビジュアル（画像があれば差し替え） */}
          <div>
            <div
              className="aspect-[4/3] w-full overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] bg-center bg-cover"
              style={{
                backgroundImage:
                  "url('/stage-hero.jpg')", // 画像が無い場合は自動でグラデに
              }}
            >
              {/* 画像が無い時のフォールバック */}
              <div className="h-full w-full bg-gradient-to-br from-blue-500/30 via-indigo-600/25 to-emerald-500/30 backdrop-blur-[2px]" />
            </div>
            <p className="mt-3 text-xs text-white/60">
              撮影素材未設定の場合は色面で代替表示されます（/public/stage-hero.jpg を置くと表示）。
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
