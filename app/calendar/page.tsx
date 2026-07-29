import { MyFlowCalendar } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: '캘린더',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <MyFlowCalendar />;
}
