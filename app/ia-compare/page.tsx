import { IaComparisonReport } from '@/components/flow/IaComparisonPoc';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'FlowMe IA 비교',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <IaComparisonReport />;
}
