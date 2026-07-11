import { FourTabIaPoc } from '@/components/flow/IaComparisonPoc';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'FlowMe 4탭 IA PoC',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <FourTabIaPoc />;
}
