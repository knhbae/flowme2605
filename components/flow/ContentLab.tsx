import Link from 'next/link';
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from '@/lib/flow/content-lab';
import { seedBundles } from '@/lib/flow/seed-flows';

function targetLabel(value: string): string {
  const labels: Record<string, string> = {
    calendar: 'Calendar',
    todo: 'Todo',
    notion: 'Notion',
    sheet: 'Sheet',
  };
  return labels[value] ?? value;
}

function sourceKindLabel(value: string): string {
  const labels: Record<string, string> = {
    video: '영상',
    channel: '채널',
    article: '글',
    official: '공식',
    community: '커뮤니티',
  };
  return labels[value] ?? value;
}

function convertedPilotLinkLabel(slug: string, title: string): string {
  const labels: Record<string, string> = {
    'samsung-aircon-seasonal-check': '삼성전자서비스 에어컨 계절 전 점검 Flow',
    'vehicle-inspection-prep': '자동차검사 준비 Flow',
    'diet-meal-exercise-log': '다이어트 식단·운동 기록 Flow',
  };
  return labels[slug] ?? title;
}

export function ContentLab() {
  const summary = getContentLabSummary(seedBundles);
  const bundleBySlug = new Map(seedBundles.map((bundle) => [bundle.flow.slug, bundle]));
  const convertedPilotBundles = convertedPilotSlugs
    .map((slug) => bundleBySlug.get(slug))
    .filter(Boolean) as typeof seedBundles;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <Link className="text-lg font-semibold tracking-tight text-gray-950" href="/">
          FLOW
        </Link>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-white" href="/flows">
            공개 Flow
          </Link>
          <Link className="rounded-md bg-[#2563EB] px-3 py-2 font-semibold text-white" href="/flow-lab">
            Flow Lab
          </Link>
        </div>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Creator x Flow validation</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-950">
          실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-gray-600">
          공개 채널, 제작자 사이트, 공식 안내를 원천 소스로 두고 기존 작동 Flow와 확장 후보를 나눠 검증합니다.
          원문을 복사하지 않고 실행 구조, 날짜, 체크 기준, 외부 도구 연동 가능성만 Flow로 재구성합니다.
        </p>
      </header>

      <section className="mb-8 grid gap-3 md:grid-cols-5">
        {[
          ['파일럿 소스 그룹', summary.pilotCreatorCount],
          ['파일럿 Flow', summary.pilotFlowCount],
          ['확장 소스', summary.expansionCreatorCount],
          ['확장 후보', summary.expansionCandidateCount],
          ['평균 점수', summary.averageCandidateScore],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-500">Phase 1</p>
            <h2 className="text-2xl font-semibold text-gray-950">3 x 4 파일럿 검증</h2>
          </div>
          <p className="text-sm text-gray-500">
            실제 공개 Flow 연결: {summary.missingPilotFlowSlugs.length === 0 ? '정상' : '누락 있음'}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {pilotCreatorLabs.map((creator) => (
            <article key={creator.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-950">{creator.name}</h3>
                  <a
                    className="mt-1 inline-block text-sm font-medium text-blue-700 hover:text-blue-900"
                    href={creator.creatorUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    소스 검색 열기
                  </a>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  4 flows
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{creator.thesis}</p>
              <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-medium leading-6 text-blue-900">
                {creator.managementQuestion}
              </p>
              <div className="mt-4 space-y-2">
                {creator.flowSlugs.map((slug) => {
                  const bundle = bundleBySlug.get(slug);
                  const source = creator.sources.find((item) => item.flowSlug === slug);
                  return (
                    <div key={slug} className="rounded-md border border-gray-200 p-3 text-sm">
                      <Link
                        className="block hover:text-blue-700"
                        href={bundle ? `/f/${bundle.flow.slug}` : '/flows'}
                      >
                        <span className="block font-semibold text-gray-950">{bundle?.flow.title ?? slug}</span>
                        <span className="mt-1 block text-gray-500">
                          {bundle
                            ? `${bundle.flow.category} · ${bundle.flow.structure_type} · ${
                                bundle.items.length || bundle.mealSlots?.length || 0
                              } items`
                            : 'missing'}
                        </span>
                      </Link>
                      {source ? (
                        <a
                          className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:text-blue-900"
                          href={source.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {source.creatorName} · {sourceKindLabel(source.sourceKind)} · {source.sourceTitle}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-500">Phase B</p>
            <h2 className="text-2xl font-semibold text-gray-950">B 파일럿 실제 Flow 변환</h2>
            <p className="mt-2 text-sm text-gray-600">
              실제 공식/제작자 소스를 원문 복사가 아닌 실행 구조로 바꾼 10개 대표 Flow입니다.
            </p>
          </div>
          <span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {summary.convertedPilotFlowCount} converted
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {convertedPilotBundles.map((bundle) => (
            <Link
              key={bundle.flow.slug}
              aria-label={convertedPilotLinkLabel(bundle.flow.slug, bundle.flow.title)}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:text-blue-800"
              href={`/f/${bundle.flow.slug}`}
            >
              <span className="block text-xs font-semibold text-gray-500">{bundle.flow.category}</span>
              <span className="mt-1 block text-sm font-semibold text-gray-950">{bundle.flow.title}</span>
              <span className="mt-2 block text-xs text-gray-500">
                {bundle.flow.structure_type} · {bundle.flow.anchor_type} · {bundle.items.length} items
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-500">Phase 2</p>
          <h2 className="text-2xl font-semibold text-gray-950">10 x 20 확장 후보 검증</h2>
          <p className="mt-2 text-sm text-gray-600">
            후보는 아직 완성 Flow 본문이 아니라, 실제 소스에서 Flow화 우선순위를 정하기 위한 검증 단위입니다.
          </p>
        </div>
        <div className="space-y-4">
          {expansionCreatorLabs.map((creator) => {
            const average =
              Math.round(
                creator.candidates.reduce((sum, candidate) => sum + scoreCandidate(candidate), 0) /
                  creator.candidates.length,
              );
            return (
              <article key={creator.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">{creator.category}</p>
                    <h3 className="text-xl font-semibold text-gray-950">{creator.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{creator.thesis}</p>
                    <a
                      className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-900"
                      href={creator.creatorUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      제작자/공식 소스 열기
                    </a>
                  </div>
                  <span className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                    평균 {average}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {creator.candidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-5 text-gray-950">{candidate.title}</p>
                        <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {scoreCandidate(candidate)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {candidate.structure_type} · {candidate.anchor_type}
                      </p>
                      <a
                        className="mt-2 block text-xs font-medium text-blue-700 hover:text-blue-900"
                        href={candidate.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {candidate.sourceTitle}
                      </a>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.externalTargets.map((target) => (
                          <span
                            key={target}
                            className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                          >
                            {targetLabel(target)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
