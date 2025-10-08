import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // assetPrefix/basePath は使わない（独自ドメイン直下なので不要）
};

export default nextConfig;
