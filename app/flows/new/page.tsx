import { NewFlow } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'Flow 만들기',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <NewFlow />;
}
