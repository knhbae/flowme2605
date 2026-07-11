import { Editor } from '@/components/flow/AppClient';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'Flow 수정',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Editor id={id} />;
}
