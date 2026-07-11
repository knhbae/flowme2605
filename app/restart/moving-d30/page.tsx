import { MovingD30Restart } from '@/components/flow/MovingD30Restart';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: '이사 준비 미리보기 | FlowMe',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function MovingD30RestartPage() {
  return <MovingD30Restart />;
}
