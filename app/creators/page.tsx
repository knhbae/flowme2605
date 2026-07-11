import { CreatorDirectory } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: '제작자 채널 검토 | FlowMe',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <CreatorDirectory />;
}
