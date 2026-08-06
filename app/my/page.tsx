import { MyFlows } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import type { Metadata } from 'next';

type MyFlowPageSearchParams = Promise<{
  q3Copy?: string | string[];
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: MyFlowPageSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q3Copy = Array.isArray(params.q3Copy) ? params.q3Copy[0] : params.q3Copy;
  return {
    title: q3Copy === 'off' ? 'My Flow' : '내 계획',
    robots: NON_INDEXABLE_ROUTE_ROBOTS,
  };
}

export default function Page() {
  return <MyFlows />;
}
