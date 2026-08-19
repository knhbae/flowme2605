import Link from 'next/link';

import { buildPostSaveHref } from '@/lib/flow/post-save-receipt';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';

export type PublicPlanShareShellProps = {
  savedAt?: string;
  planId: string;
  planKind?: 'flow' | 'map';
  showSavedLink?: boolean;
  q3CopyEnabled?: boolean;
};

export function PublicPlanShareShell({
  savedAt,
  planId,
  planKind = 'flow',
  showSavedLink = true,
  q3CopyEnabled = true,
}: PublicPlanShareShellProps) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  return (
    <nav
      aria-label="공유 콘텐츠"
      data-testid="flow-public-shell"
      data-public-plan-kind={planKind}
      className="mb-5 flex min-h-14 items-center justify-between gap-3 border-b border-[var(--flowme-border)] py-3 md:mb-7"
    >
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--flowme-radius-control)] text-lg font-semibold tracking-[-0.02em] text-[var(--flowme-text)]" href="/flows">
        <span>FLOW</span>
        <span className="text-xs font-semibold tracking-normal text-[var(--flowme-text-secondary)]">{copy.navigation.findPlans}</span>
      </Link>
      {savedAt && showSavedLink ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 text-sm font-semibold text-[var(--flowme-text-secondary)] transition hover:border-[var(--flowme-action)] hover:text-[var(--flowme-action)]"
          href={buildPostSaveHref({ kind: planKind, id: planId })}
        >
          {q3CopyEnabled ? '내 계획에서 보기' : '내 Flow에서 보기'}
        </Link>
      ) : (
        <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">공유 화면</span>
      )}
    </nav>
  );
}
