import Link from 'next/link';

export type FlowDiscoveryCardView = {
  id: string;
  href: string;
  title: string;
  categoryLabel: string;
  sourceLabel?: string;
  previewItems: string[];
  inputLabel: string;
  resultLabel: string;
  itemCount: number;
};

type FlowDiscoveryCardProps = {
  view: FlowDiscoveryCardView;
  testId: string;
  actionTestId?: string;
  emphasis?: 'primary' | 'standard';
  homeRecommendation?: boolean;
  mapId?: string;
  sourceKind?: string;
};

export function FlowDiscoveryCard({
  view,
  testId,
  actionTestId,
  emphasis = 'standard',
  homeRecommendation = false,
  mapId,
  sourceKind,
}: FlowDiscoveryCardProps) {
  const previewItems = view.previewItems.filter(Boolean).slice(0, 3);
  const isPrimary = emphasis === 'primary';

  return (
    <Link
      data-testid={testId}
      data-home-recommendation-card={homeRecommendation ? 'true' : undefined}
      data-map-id={mapId}
      data-source-kind={sourceKind}
      aria-label={`${view.title} Flow 열기`}
      className={[
        'group flex min-w-0 flex-col rounded-lg border border-[#E1DED6] bg-white transition',
        'hover:border-[#3654FF]/45 hover:shadow-[0_10px_30px_rgba(27,26,23,0.07)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3654FF] focus-visible:ring-offset-2',
        isPrimary ? 'p-4 sm:p-5' : 'p-3.5 sm:p-4',
      ].join(' ')}
      href={view.href}
    >
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#777269]">
        <span className="min-w-0 truncate">{view.categoryLabel}</span>
        <span data-testid="flow-card-support-meta" className="shrink-0">
          할 일 {view.itemCount}개
        </span>
      </div>

      <h2 className={`mt-2 break-keep font-semibold leading-snug text-[#1B1A17] ${isPrimary ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
        {view.title}
      </h2>

      {view.sourceLabel ? (
        <p className="mt-1.5 line-clamp-1 text-xs font-medium text-[#6E6B64]">
          <span className="text-[#989288]">원문</span>
          <span aria-hidden="true"> · </span>
          {view.sourceLabel}
        </p>
      ) : null}

      {previewItems.length > 0 ? (
        <ol className="mt-3 grid gap-1.5 border-y border-[#ECE9E2] py-2.5" aria-label="대표 할 일">
          {previewItems.map((item, index) => (
            <li key={`${view.id}-${index}`} className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-1.5 text-sm leading-5 text-[#34312C]">
              <span className="text-[11px] font-semibold text-[#3654FF]" aria-hidden="true">{index + 1}</span>
              <span className="line-clamp-1 min-w-0 font-medium">{item}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[#5F5A52]">{view.inputLabel}</span>
        <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[#3654FF]">{view.resultLabel}</span>
      </div>

      <span
        data-testid={actionTestId}
        className="mt-auto inline-flex self-start items-center gap-1 pt-4 text-sm font-semibold text-[#3654FF] group-hover:text-[#2945E8]"
      >
        <span data-testid="flow-card-primary-action">Flow 열기</span>
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
