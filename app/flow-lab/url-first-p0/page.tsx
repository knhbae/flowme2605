import type { Metadata } from 'next';
import { UrlFirstP0Lab } from '@/components/flow/UrlFirstP0Lab';

export const metadata: Metadata = {
  title: 'URL-first P0 Lab | FlowMe',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <UrlFirstP0Lab />;
}
