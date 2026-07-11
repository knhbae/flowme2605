import Link from 'next/link';
import { getCreatorChannelSummaries } from '@/lib/flow/creator-channel-preview';
import { toContentDisplayTitle } from '@/lib/flow/display-title';
import { internalReviewBundles } from '@/lib/flow/internal-review-inventory';
import { getPublicFlowIndexingPolicy } from '@/lib/flow/route-indexing-policy';
import type { FlowBundle } from '@/lib/flow/types';
import { PlatformNav } from './PlatformNav';

function StatCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-semibold text-gray-950`}>{value}</p>
    </div>
  );
}

function getCreatorBundlePriority(bundle: FlowBundle): number {
  if (bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact') return 0;
  if (bundle.flow.source_status === 'real') return 1;
  if (bundle.flow.source_status === 'needs_review') return 2;
  return 3;
}

export function CreatorDirectory() {
  const summaries = getCreatorChannelSummaries(internalReviewBundles);
  const totalFlows = summaries.reduce((sum, item) => sum + item.flow_count, 0);
  const totalRealFlows = summaries.reduce((sum, item) => sum + item.real_flow_count, 0);
  const totalSampleCandidates = summaries.reduce((sum, item) => sum + item.sample_candidate_count, 0);
  const totalSourceReviewFlows = summaries.reduce((sum, item) => sum + item.source_review_count, 0);
  const categories = Array.from(new Set(summaries.flatMap((item) => item.specialty_tags))).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <PlatformNav />
      <header className="border-b border-gray-200 pb-6">
        <p className="text-sm font-semibold text-blue-700">내부 콘텐츠 검토</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">제작자 채널 재고</h1>
        <p className="mt-3 max-w-3xl leading-7 text-gray-600">
          공개 실행 콘텐츠와 원문 확인 전 샘플을 분리해 점검하는 내부 화면입니다. 샘플 후보는 정상 사용자 저장소와 공개 Flow에 포함되지 않습니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <StatCard label="채널" value={`${summaries.length}`} />
          <StatCard label="전체 검토 재고" value={`${totalFlows}`} />
          <StatCard label="실제 원본" value={`${totalRealFlows}`} />
          <StatCard label="내부 샘플" value={`${totalSampleCandidates}`} />
          <StatCard label="원본 검토" value={`${totalSourceReviewFlows}`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {category}
            </span>
          ))}
        </div>
      </header>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((channel) => {
          const publicRepresentativeFlows = internalReviewBundles
            .filter((bundle) => bundle.flow.owner_user_id === channel.id)
            .filter((bundle) => getPublicFlowIndexingPolicy(bundle).indexable)
            .sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b))
            .slice(0, 3);

          return (
            <article key={channel.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-700">{channel.channel_type}</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={`/u/${channel.slug}`}>
                      {channel.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{channel.role}</p>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                  {channel.real_flow_count} 원본 · {channel.sample_candidate_count} 내부 샘플
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{channel.bio}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <StatCard label="실제 원본" value={`${channel.real_flow_count}`} compact />
                <StatCard label="내부 샘플" value={`${channel.sample_candidate_count}`} compact />
                <StatCard label="원본 검토" value={`${channel.source_review_count}`} compact />
              </div>
              <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs font-medium leading-5 text-gray-600">
                {channel.next_content_action}
              </p>
              {publicRepresentativeFlows.length ? (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500">공개 승인 Flow</p>
                  <div className="mt-2 space-y-2">
                    {publicRepresentativeFlows.map((bundle) => (
                      <Link
                        key={bundle.flow.id}
                        className="block rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                        href={`/f/${bundle.flow.slug}`}
                      >
                        {toContentDisplayTitle(bundle.flow.title)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-500">공개 승인 Flow 없음</p>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
