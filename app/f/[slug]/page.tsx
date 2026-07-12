import { PublicFlow } from '@/components/flow/AppClient';
import { toContentDisplayTitle } from '@/lib/flow/display-title';
import {
  getPublicFlowIndexingPolicy,
  NON_INDEXABLE_ROUTE_ROBOTS,
} from '@/lib/flow/route-indexing-policy';
import { mergeSourceBackedMyFlowBundles } from '@/lib/flow/source-backed-my-flow';
import { cloneSeedBundles } from '@/lib/flow/storage';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function findPublicFlow(slug: string) {
  const bundle = mergeSourceBackedMyFlowBundles(cloneSeedBundles()).find(
    (bundle) => bundle.flow.slug === decodeSlug(slug),
  );
  return bundle && getPublicFlowIndexingPolicy(bundle).indexable ? bundle : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = findPublicFlow(slug);
  if (!bundle) {
    return {
      title: 'Flow를 찾을 수 없습니다 | FlowMe',
      robots: NON_INDEXABLE_ROUTE_ROBOTS,
    };
  }

  const publicTitle = toContentDisplayTitle(bundle.flow.title);
  return {
    title: `${publicTitle} | FlowMe`,
    description: bundle.flow.description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/f/${bundle.flow.slug}` },
  };
}

export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeSlug(slug);
  if (!findPublicFlow(decodedSlug)) notFound();
  return <PublicFlow slug={decodedSlug} />;
}
