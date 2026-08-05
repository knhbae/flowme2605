'use client';

import { getArtifactPlan } from '@/lib/flow/artifact-plan';
import type { FlowBundle } from '@/lib/flow/types';

export function ArtifactPreview({
  bundle,
  q3CopyEnabled = true,
}: {
  bundle: FlowBundle;
  q3CopyEnabled?: boolean;
}) {
  const plan = getArtifactPlan(bundle);

  return (
    <section
      className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4"
      aria-label={q3CopyEnabled ? '계획 결과 미리보기' : 'Flow artifact preview'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            {q3CopyEnabled ? '이 계획으로 만들 결과' : '이 Flow가 만들어주는 것'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-950">{plan.surfaces[0]?.title ?? '실행 리스트'}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          {plan.sourceHandling === 'catalog_review' ? '원본 보강 필요' : '실행 산출물'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {plan.surfaces.slice(0, 3).map((surface) => (
          <article key={surface.kind} className="rounded-lg border border-blue-100 bg-white p-3">
            <h3 className="text-sm font-semibold text-gray-950">{surface.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{surface.description}</p>
          </article>
        ))}
      </div>

      {plan.sourceHandling === 'catalog_review' ? (
        <p className="mt-3 text-xs leading-5 text-blue-800">{plan.sourceAction}</p>
      ) : null}
    </section>
  );
}
