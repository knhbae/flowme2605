import path from 'node:path';
import type { NextConfig } from 'next';

// This is a separate, non-deployable test application. Product configuration is untouched.
const root = path.resolve(__dirname, '../../..');
const config: NextConfig = {
  distDir: '.next-history',
  outputFileTracingRoot: root,
  experimental: { externalDir: true },
  async redirects() {
    // Match the product's existing browser-icon fallback in this isolated app.
    return [{ source: '/favicon.ico', destination: '/icon.svg', permanent: false }];
  },
  webpack(config) {
    config.resolve.alias['@'] = root;
    config.resolve.alias['../integrated-poc/ProgramApp$'] = path.join(__dirname, 'LegacySurfaceAdapter.tsx');
    return config;
  },
};
export default config;
