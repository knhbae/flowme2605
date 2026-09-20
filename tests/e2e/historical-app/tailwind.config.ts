import path from 'node:path';
import type { Config } from 'tailwindcss';
export default {
  content: [path.resolve(__dirname, '../../../app/**/*.{ts,tsx}'), path.resolve(__dirname, '../../../components/**/*.{ts,tsx}')],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
