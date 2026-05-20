import { CreatorProfile } from '@/components/flow/AppClient';

export default async function Page({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  return <CreatorProfile slug={creator} />;
}
