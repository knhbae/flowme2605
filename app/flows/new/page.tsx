import { NewFlow } from '@/components/flow/AppClient';
import { TextAuthoringWorkspace } from '@/components/flow/text-authoring';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';

export const metadata = {
  title: 'Flow 만들기',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ legacy?: string; authoringQa?: string }>;
}) {
  const params = await searchParams;
  const authoringDisabled =
    process.env.FLOWME_TEXT_AUTHORING_ENABLED === '0' ||
    params.legacy === '1';

  return authoringDisabled
    ? <NewFlow />
    : <TextAuthoringWorkspace showQaCatalog={params.authoringQa === '1'} />;
}
