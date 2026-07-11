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
  return mergeSourceBackedMyFlowBundles(cloneSeedBundles()).find(
    (bundle) => bundle.flow.slug === decodeSlug(slug),
  );
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

  const policy = getPublicFlowIndexingPolicy(bundle);
  const publicTitle = toContentDisplayTitle(bundle.flow.title);
  return {
    title: policy.indexable ? `${publicTitle} | FlowMe` : `원문 확인 중 | FlowMe`,
    description: policy.indexable
      ? bundle.flow.description
      : '원문과 실행 순서를 확인 중인 Flow입니다.',
    robots: policy.indexable ? { index: true, follow: true } : NON_INDEXABLE_ROUTE_ROBOTS,
    alternates: policy.indexable ? { canonical: `/f/${bundle.flow.slug}` } : undefined,
  };
}

export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeSlug(slug);
  if (!findPublicFlow(decodedSlug)) notFound();
  return <PublicFlow slug={decodedSlug} />;
}
