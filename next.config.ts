import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用边缘运行时以获得更好的性能
  experimental: {
    serverActions: true,
  },
  // 配置输出为独立部署
  output: 'standalone',
};

export default nextConfig;
