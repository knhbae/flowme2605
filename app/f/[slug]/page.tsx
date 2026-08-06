import { PublicFlow } from '@/components/flow/AppClient';
import { toContentDisplayTitle } from '@/lib/flow/display-title';
import {
  getPublicFlowIndexingPolicy,
  NON_INDEXABLE_ROUTE_ROBOTS,
} from '@/lib/flow/route-indexing-policy';
import {
  getSourceBackedMyFlowMapForBundle,
  isSourceBackedFlowMapExecutable,
  mergeSourceBackedMyFlowBundles,
} from '@/lib/flow/source-backed-my-flow';
import { cloneSeedBundles } from '@/lib/flow/storage';
import { resolveCanonicalFlowAlias } from '@/lib/flow/canonical-flow-registry';
import { isP35Q3CopyEnabled } from '@/lib/flow/p35-round2-flags';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

type PublicFlowSearchParams = Record<string, string | string[] | undefined>;

function buildSearchString(searchParams: PublicFlowSearchParams): string {
  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  });
  return query.toString();
}

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
  if (!bundle || !getPublicFlowIndexingPolicy(bundle).indexable) return undefined;
  const sourceBackedMap = getSourceBackedMyFlowMapForBundle(bundle);
  return sourceBackedMap && !isSourceBackedFlowMapExecutable(sourceBackedMap) ? undefined : bundle;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<PublicFlowSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const q3CopyEnabled = isP35Q3CopyEnabled(buildSearchString(searchParams ? await searchParams : {}));
  const decodedSlug = decodeSlug(slug);
  const canonical = resolveCanonicalFlowAlias('public_slug', decodedSlug)?.entry;
  const bundle = findPublicFlow(canonical?.canonicalPublicSlug ?? decodedSlug);
  if (!bundle) {
    return {
      title: q3CopyEnabled ? '계획을 찾을 수 없습니다 | FlowMe' : 'Flow를 찾을 수 없습니다 | FlowMe',
      robots: NON_INDEXABLE_ROUTE_ROBOTS,
    };
  }

  const publicTitle = toContentDisplayTitle(bundle.flow.title);
  return {
    title: `${publicTitle} | FlowMe`,
    description: bundle.flow.description,
    robots: { index: true, follow: true },
    alternates: { canonical: canonical?.canonicalRoute ?? `/f/${bundle.flow.slug}` },
  };
}

export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeSlug(slug);
  const canonical = resolveCanonicalFlowAlias('public_slug', decodedSlug)?.entry;
  if (canonical && canonical.canonicalPublicSlug !== decodedSlug) redirect(canonical.canonicalRoute);
  if (!findPublicFlow(decodedSlug)) notFound();
  return <PublicFlow slug={decodedSlug} />;
}
