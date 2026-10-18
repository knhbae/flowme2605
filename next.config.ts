import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
