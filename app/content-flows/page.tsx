import { KoreanFlowContentStudio } from '@/components/flow/KoreanFlowContentStudio';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'Flow 콘텐츠 스튜디오',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default function Page() {
  return <KoreanFlowContentStudio />;
}
