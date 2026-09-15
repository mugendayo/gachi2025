import type { NextConfig } from "next";

// 実効設定を明示する（通常ビルド・末尾スラッシュなし＝現行本番と同じURL形）。
// 以前の output:"export" / trailingSlash:true は末尾の module.exports に上書きされて効いていなかった。
// 静的 export に戻すなら、意図して output: "export" を足すこと（URLの形が /admission → /admission/ に変わる）。
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
