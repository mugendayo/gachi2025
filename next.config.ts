// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",           // 静的HTMLを生成
  images: { unoptimized: true }, // next/imageの最適化を無効化
  trailingSlash: true,        // 末尾スラッシュ
  basePath: "",               // ベースパス未使用
};

export default nextConfig;
module.exports = {
  images: { unoptimized: true },
  // basePath / assetPrefix を使っているなら、それに合わせて <Image src> も見直し
}
