import type { Metadata } from 'next';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata: Metadata = {
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function FlowLabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
