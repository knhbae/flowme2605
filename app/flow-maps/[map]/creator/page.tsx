import { SourceBackedFlowMapCreatorEditor } from '@/components/flow/SourceBackedFlowMapCreatorEditor';
import { buildSourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import Link from 'next/link';

export const metadata = {
  title: 'Flow 제작 검토',
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

function decodeMapId(map: string) {
  try {
    return decodeURIComponent(map);
  } catch {
    return map;
  }
}

export default async function Page({ params }: { params: Promise<{ map: string }> }) {
  const { map } = await params;
  const publishPackage = buildSourceBackedFlowMapPublishPackage(decodeMapId(map));

  if (!publishPackage) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8">
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">콘텐츠를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-slate-600">다른 공개 Flow나 내 Flow를 확인해 주세요.</p>
          <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href="/my?demo=source-backed">
            내 Flow 보기
          </Link>
        </section>
      </main>
    );
  }

  return <SourceBackedFlowMapCreatorEditor publishPackage={publishPackage} />;
}
