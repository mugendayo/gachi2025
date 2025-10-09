import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // 静的HTMLを生成
  images: { unoptimized: true }, // Image最適化を無効化
  trailingSlash: true,          // すべてのパスにスラッシュを追加
  basePath: "",                 // assetPrefixは使わない
};

export default nextConfig;
