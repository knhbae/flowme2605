import Link from 'next/link';

export type FlowDiscoveryCardView = {
  id: string;
  href: string;
  title: string;
  categoryLabel: string;
  sourceLabel?: string;
  sourceHref?: string;
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
  const previewItems = view.previewItems.filter(Boolean).slice(0, 2);
  const isPrimary = emphasis === 'primary';

  return (
    <article
      data-testid={testId}
      data-home-recommendation-card={homeRecommendation ? 'true' : undefined}
      data-map-id={mapId}
      data-source-kind={sourceKind}
      data-p31-marker="P31-DISCOVERY-CARD-COMPACT"
      className={[
        'group relative flex min-w-0 flex-col rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] transition',
        'hover:border-[var(--flowme-action)] hover:shadow-[0_8px_24px_rgba(23,24,19,0.06)]',
        isPrimary ? 'p-4 sm:p-5' : 'p-3.5 sm:p-4',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--flowme-text-secondary)]">
        <span className="min-w-0 truncate">{view.categoryLabel}</span>
        <span data-testid="flow-card-support-meta" className="shrink-0">
          할 일 {view.itemCount}개 · {view.resultLabel}
        </span>
      </div>

      <h2 className={`mt-2 break-keep font-semibold leading-snug tracking-[-0.015em] text-[var(--flowme-text)] ${isPrimary ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
        {view.title}
      </h2>

      {view.sourceLabel ? (
        view.sourceHref ? (
          <a
            data-testid="flow-card-source-link"
            className="relative z-10 mt-1 inline-flex min-h-11 max-w-full items-center self-start truncate rounded-[var(--flowme-radius-compact)] text-xs font-medium text-[var(--flowme-text-secondary)] underline decoration-[var(--flowme-border-strong)] underline-offset-2 hover:text-[var(--flowme-action)]"
            href={view.sourceHref}
            target="_blank"
            rel="noreferrer"
          >
            원문 · {view.sourceLabel}
          </a>
        ) : (
          <p className="mt-1.5 line-clamp-1 text-xs font-medium text-[var(--flowme-text-secondary)]">
            원문 · {view.sourceLabel}
          </p>
        )
      ) : null}

      {previewItems.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 border-y border-[var(--flowme-border)] py-2.5" aria-label="대표 할 일">
          {previewItems.map((item, index) => (
            <li key={`${view.id}-${index}`} className="grid min-w-0 grid-cols-[0.5rem_minmax(0,1fr)] items-baseline gap-2 text-sm leading-5 text-[var(--flowme-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--flowme-action)]" aria-hidden="true" />
              <span className="line-clamp-1 min-w-0 font-medium">{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <span
        data-testid={actionTestId}
        className="mt-auto inline-flex self-start items-center gap-1 pt-3 text-sm font-semibold text-[var(--flowme-action)] group-hover:text-[var(--flowme-action-hover)]"
      >
        <span data-testid="flow-card-primary-action">더보기</span>
        <span aria-hidden="true">→</span>
      </span>
      <Link
        aria-label={`${view.title} 더보기`}
        className="absolute inset-0 rounded-[var(--flowme-radius-card)]"
        href={view.href}
      >
        <span className="sr-only">{view.title} 더보기</span>
      </Link>
    </article>
  );
}
