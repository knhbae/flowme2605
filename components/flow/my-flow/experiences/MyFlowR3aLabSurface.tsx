'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { MyFlowLibraryFilter } from '@/lib/flow/my-flow-local-ia';
import type {
  MyFlowWorkspaceFlowV1,
  MyFlowWorkspaceSnapshotV1,
} from '@/lib/flow/my-flow-workspace-snapshot';

import type { MyFlowExperienceNavigationPort } from '../MyFlowExperienceContract';

export type MyFlowR3aLabSurfaceProps = Readonly<{
  snapshot: MyFlowWorkspaceSnapshotV1;
  intents: MyFlowExperienceNavigationPort;
  /**
   * Temporary R3A compatibility port. The candidate never receives the
   * private saved-flow runtime object; AppClient resolves the stable slug and
   * renders the established execution surface behind this function.
   */
  renderSelectedFlow: (savedFlowSlug: string) => ReactNode;
}>;

const FILTER_OPTIONS: ReadonlyArray<Readonly<{
  id: MyFlowLibraryFilter;
  label: string;
}>> = [
  { id: 'all', label: '전체' },
  { id: 'open', label: '진행 중' },
  { id: 'done', label: '완료' },
  { id: 'archived', label: '보관' },
];

function getVisibleFlows(
  snapshot: MyFlowWorkspaceSnapshotV1,
): MyFlowWorkspaceFlowV1[] {
  const flowBySlug = new Map(
    snapshot.flows.map((flow) => [flow.identity.savedFlowSlug, flow]),
  );
  const slugs = snapshot.library.viewport === 'mobile'
    ? snapshot.library.mobileFlowSlugs
    : snapshot.library.filteredFlowSlugs;
  return slugs.flatMap((slug) => {
    const flow = flowBySlug.get(slug);
    return flow ? [flow] : [];
  });
}

function getProgressLabel(flow: MyFlowWorkspaceFlowV1): string {
  return `${flow.progress.done}/${flow.progress.total} 완료`;
}

export function MyFlowR3aLabSurface({
  snapshot,
  intents,
  renderSelectedFlow,
}: MyFlowR3aLabSurfaceProps) {
  const selectedFlowSlug = snapshot.selection.kind === 'flow'
    ? snapshot.selection.savedFlowSlug
    : undefined;
  const selectedFlow = selectedFlowSlug
    ? snapshot.flows.find((flow) => (
        flow.identity.savedFlowSlug === selectedFlowSlug
      ))
    : undefined;
  const visibleFlows = getVisibleFlows(snapshot);

  if (selectedFlow) {
    return (
      <section
        data-testid="my-flow-r3a-lab-surface"
        data-my-flow-experience="r3a-lab"
        data-my-flow-snapshot-version={snapshot.schemaVersion}
        data-my-flow-selection="flow"
        className="grid gap-4"
      >
        <div className="border-b border-[var(--flowme-border)] pb-3">
          <button
            type="button"
            data-testid="my-flow-r3a-lab-back"
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            aria-label="저장한 계획 목록으로 돌아가기"
            onClick={intents.returnToLibrary}
          >
            <span aria-hidden="true">←</span>
            <span className="ml-1">저장한 계획</span>
          </button>
        </div>
        <div data-testid="my-flow-r3a-lab-selected-flow">
          {renderSelectedFlow(selectedFlow.identity.savedFlowSlug)}
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="my-flow-r3a-lab-surface"
      data-my-flow-experience="r3a-lab"
      data-my-flow-snapshot-version={snapshot.schemaVersion}
      data-my-flow-selection="library"
      className="grid gap-4"
    >
      <header className="flex items-end justify-between gap-3 border-b border-[var(--flowme-border)] pb-3">
        <h1 className="text-2xl font-semibold text-[var(--flowme-text)]">저장한 계획</h1>
        <span
          data-testid="my-flow-r3a-lab-visible-count"
          className="shrink-0 text-sm font-semibold text-[var(--flowme-text-secondary)]"
        >
          {visibleFlows.length}개
        </span>
      </header>

      {snapshot.library.controls.search || snapshot.library.controls.filters ? (
        <section
          data-testid="my-flow-r3a-lab-controls"
          aria-label="저장한 계획 찾기"
          className="grid gap-2 border-b border-[var(--flowme-border)] pb-3"
        >
          {snapshot.library.controls.search ? (
            <input
              type="search"
              value={snapshot.library.query}
              placeholder="계획 이름 검색"
              aria-label="저장한 계획 검색"
              data-testid="my-flow-r3a-lab-search"
              className="min-h-11 w-full rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 py-2 text-sm text-[var(--flowme-text)] outline-none focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
              onChange={(event) => intents.replaceLibraryControls({
                query: event.currentTarget.value,
                filter: snapshot.library.filter,
              })}
            />
          ) : null}
          {snapshot.library.controls.filters ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="저장한 계획 상태">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={snapshot.library.filter === option.id}
                  data-testid={`my-flow-r3a-lab-filter-${option.id}`}
                  className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
                    snapshot.library.filter === option.id
                      ? 'bg-[var(--flowme-action)] text-white'
                      : 'bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-secondary)]'
                  }`}
                  onClick={() => {
                    if (option.id === 'archived') {
                      intents.showArchived();
                      return;
                    }
                    intents.replaceLibraryControls({
                      query: snapshot.library.query,
                      filter: option.id,
                    });
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {visibleFlows.length > 0 ? (
        <div
          data-testid="my-flow-r3a-lab-library"
          className="grid overflow-hidden rounded-md border-y border-[var(--flowme-border)] bg-white md:grid-cols-2 xl:grid-cols-3"
        >
          {visibleFlows.map((flow) => (
            <button
              key={flow.identity.savedFlowSlug}
              type="button"
              data-testid="my-flow-r3a-lab-row"
              data-flow-slug={flow.identity.savedFlowSlug}
              data-source-flow-slug={flow.identity.sourceFlowSlug}
              className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--flowme-border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--flowme-surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] md:border-r md:last:border-b"
              aria-label={`${flow.title} 열기, ${getProgressLabel(flow)}`}
              onClick={() => intents.openFlow(flow.identity.savedFlowSlug)}
            >
              <span className="min-w-0">
                <span className="block break-keep text-sm font-semibold text-[var(--flowme-text)]">
                  {flow.title}
                </span>
                <span className="mt-1 block text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  {getProgressLabel(flow)}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[var(--flowme-action)]">→</span>
            </button>
          ))}
        </div>
      ) : (
        <section
          data-testid="my-flow-r3a-lab-empty"
          className="border-y border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-4 py-8"
        >
          <h2 className="text-lg font-semibold text-[var(--flowme-text)]">
            {snapshot.library.filter === 'archived'
              ? '보관한 계획이 없어요'
              : snapshot.library.query
                ? '검색 결과가 없어요'
                : '저장한 계획이 없어요'}
          </h2>
          {!snapshot.library.query && snapshot.library.filter === 'all' ? (
            <Link
              href="/flows"
              data-testid="my-flow-r3a-lab-discovery"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--flowme-action)] px-4 py-2 text-sm font-semibold text-white"
            >
              플로우 찾기
            </Link>
          ) : null}
        </section>
      )}

      {snapshot.library.hiddenMobileCount > 0 ? (
        <button
          type="button"
          data-testid="my-flow-r3a-lab-expand"
          className="min-h-11 w-full rounded-md border border-[var(--flowme-border-strong)] bg-white px-4 py-3 text-left text-sm font-semibold text-[var(--flowme-action)]"
          aria-expanded={snapshot.library.mobileInventoryExpanded}
          onClick={intents.expandMobileInventory}
        >
          {snapshot.library.hiddenMobileCount}개 더 보기
        </button>
      ) : null}
    </section>
  );
}
