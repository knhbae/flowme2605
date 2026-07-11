import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SourceBackedFlowMapPublicPage } from '@/components/flow/SourceBackedFlowMapPage';
import { toUserFacingMapTitle } from '@/lib/flow/display-title';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import {
  buildSourceBackedFlowMapPublishPackage,
  isPublicCatalogSourceBackedFlowMap,
  isUrlFirstLookupableSourceBackedFlowMap,
} from '@/lib/flow/source-backed-my-flow';

function decodeMapId(map: string) {
  try {
    return decodeURIComponent(map);
  } catch {
    return map;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ map: string }> }): Promise<Metadata> {
  const { map } = await params;
  const mapId = decodeMapId(map);
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage || !isUrlFirstLookupableSourceBackedFlowMap(publishPackage.map)) {
    return {
      title: '콘텐츠를 찾을 수 없습니다 | FlowMe',
      robots: NON_INDEXABLE_ROUTE_ROBOTS,
    };
  }

  const title = toUserFacingMapTitle(publishPackage.public.title);
  const indexable = isPublicCatalogSourceBackedFlowMap(publishPackage.map);
  return {
    title: `${title} | FlowMe`,
    description: publishPackage.public.summary,
    robots: indexable ? { index: true, follow: true } : NON_INDEXABLE_ROUTE_ROBOTS,
    alternates: indexable ? { canonical: `/flow-maps/${mapId}` } : undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ map: string }> }) {
  const { map } = await params;
  const mapId = decodeMapId(map);
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage || !isUrlFirstLookupableSourceBackedFlowMap(publishPackage.map)) {
    notFound();
  }
  return <SourceBackedFlowMapPublicPage mapId={mapId} />;
}
