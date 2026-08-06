import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SourceBackedFlowMapPublicPage } from '@/components/flow/SourceBackedFlowMapPage';
import { resolveCanonicalFlowAlias } from '@/lib/flow/canonical-flow-registry';
import { toUserFacingMapTitle } from '@/lib/flow/display-title';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import {
  isP35Q3CopyEnabled,
  isP35VisualSubtractionEnabled,
} from '@/lib/flow/p35-round2-flags';
import {
  buildSourceBackedFlowMapPublishPackage,
  isPublicCatalogSourceBackedFlowMap,
  isSourceBackedFlowMapDirectRouteAccessible,
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
  const canonical = resolveCanonicalFlowAlias('flow_map_id', mapId)?.entry;
  if (canonical) {
    return {
      title: `${canonical.title} | FlowMe`,
      description: '이사일을 기준으로 이사 준비 항목을 일정과 체크리스트로 정리합니다.',
      robots: { index: true, follow: true },
      alternates: { canonical: canonical.canonicalRoute },
    };
  }
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage || !isSourceBackedFlowMapDirectRouteAccessible(publishPackage.map)) {
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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ map: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { map } = await params;
  const query = await searchParams;
  const mapId = decodeMapId(map);
  const canonical = resolveCanonicalFlowAlias('flow_map_id', mapId)?.entry;
  if (canonical) redirect(canonical.canonicalRoute);
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage || !isSourceBackedFlowMapDirectRouteAccessible(publishPackage.map)) {
    notFound();
  }
  const visualSubtractionValue = Array.isArray(query.visualSubtraction)
    ? query.visualSubtraction[0]
    : query.visualSubtraction;
  const q3CopyValue = Array.isArray(query.q3Copy)
    ? query.q3Copy[0]
    : query.q3Copy;
  return (
    <SourceBackedFlowMapPublicPage
      mapId={mapId}
      q3CopyEnabled={isP35Q3CopyEnabled(
        q3CopyValue === undefined
          ? ''
          : `q3Copy=${q3CopyValue}`,
      )}
      visualSubtractionEnabled={isP35VisualSubtractionEnabled(
        visualSubtractionValue === undefined
          ? ''
          : `visualSubtraction=${visualSubtractionValue}`,
      )}
    />
  );
}
