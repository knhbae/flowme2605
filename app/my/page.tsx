import { MyFlows } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'My Flow',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <MyFlows />;
}
