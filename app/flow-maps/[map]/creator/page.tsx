import { SourceBackedFlowMapCreatorPage } from '@/components/flow/SourceBackedFlowMapPage';

function decodeMapId(map: string) {
  try {
    return decodeURIComponent(map);
  } catch {
    return map;
  }
}

export default async function Page({ params }: { params: Promise<{ map: string }> }) {
  const { map } = await params;
  return <SourceBackedFlowMapCreatorPage mapId={decodeMapId(map)} />;
}
