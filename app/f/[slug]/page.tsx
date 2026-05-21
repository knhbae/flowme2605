import { PublicFlow } from '@/components/flow/AppClient';

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicFlow slug={decodeSlug(slug)} />;
}
