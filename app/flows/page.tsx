import { Suspense } from 'react';
import { FlowList } from '@/components/flow/AppClient';

const serverCatalogLinks = [
  {
    href: '/flow-maps/moving-d30',
    title: '원룸 이사 D-30',
    summary: '이사일을 기준으로 준비 일정을 확인합니다.',
  },
  {
    href: '/f/vehicle-inspection-prep',
    title: '차량 점검 준비',
    summary: '날짜 없이 시작하고 필요한 항목만 일정에 놓습니다.',
  },
  {
    href: '/f/washer-tub-clean-monthly',
    title: '세탁조 청소',
    summary: '조건을 확인한 뒤 실행할 일을 저장합니다.',
  },
] as const;

function FlowCatalogServerFallback() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-6 md:py-8" data-testid="flow-catalog-server-fallback">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex min-h-11 items-center justify-between border-b border-[#E7E4DD] pb-4" aria-label="FLOW 서비스 프레임">
          <a className="text-lg font-semibold text-[#1B1A17]" href="/">FLOW</a>
          <a className="text-sm font-semibold text-[#3654FF]" href="/my">내 계획</a>
        </nav>
        <section aria-labelledby="flow-catalog-server-title">
          <p className="text-sm font-semibold text-[#6E6B64]">계획 찾기</p>
          <h1 id="flow-catalog-server-title" className="mt-1 break-keep text-2xl font-semibold text-[#1B1A17] sm:text-3xl">
            URL이나 메모로 계획 찾기
          </h1>
          <p className="mt-2 max-w-2xl break-keep text-sm leading-6 text-[#6E6B64]">
            링크나 메모를 붙여 넣어 준비된 계획을 찾거나, 아래 계획부터 확인할 수 있습니다.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3" aria-label="바로 확인할 계획">
            {serverCatalogLinks.map((item) => (
              <a
                key={item.href}
                className="min-h-28 rounded-lg border border-[#E7E4DD] bg-white p-4 text-[#1B1A17] shadow-[0_1px_0_rgba(27,26,23,0.03)]"
                href={item.href}
              >
                <strong className="block text-base font-semibold">{item.title}</strong>
                <span className="mt-2 block text-sm leading-6 text-[#6E6B64]">{item.summary}</span>
              </a>
            ))}
          </div>
          <p className="mt-5 text-sm font-medium text-[#6E6B64]" role="status">
            입력 도구를 준비하고 있습니다.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<FlowCatalogServerFallback />}>
      <FlowList />
    </Suspense>
  );
}
