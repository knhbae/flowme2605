'use client';

import Link from 'next/link';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
} from 'react';

import type {
  MyFlowLibraryFilter,
  MyFlowLibrarySort,
} from '@/lib/flow/my-flow-local-ia';

import { MyFlowDataManager } from '../MyFlowDataManager';
import { MyFlowSortMenu } from './MyFlowSortMenu';
import {
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENTED_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from '../flow-ui';

export type MyFlowRouteViewId = 'flow';

export type MyFlowRouteEntry<TFlow> = {
  key: string;
  slug: string;
  title: string;
  progressLabel: string;
  value: TFlow;
};

export type MyFlowRouteCopyOption = {
  groupId: string;
  originSlug: string;
  role: string;
  itemCount: number;
  title: string;
  savedDate: string;
};

export type MyFlowRouteViewTab = {
  id: MyFlowRouteViewId;
  label: string;
};

export type MyFlowRouteFilterOption = {
  id: MyFlowLibraryFilter;
  label: string;
};

export type MyFlowRouteModel<TFlow> = {
  copy: {
    q3Enabled: boolean;
    pageTitle: string;
    listTitle: string;
    sectionTitle: string;
    searchPlaceholder: string;
    searchAccessibleName: string;
  };
  header: {
    focused: boolean;
    focusedTitle?: string;
    subtitle: string;
    demoLabel?: string;
    studioHref?: string;
  };
  reconciliation: {
    visible: boolean;
    options: readonly MyFlowRouteCopyOption[];
    notice?: string;
  };
  navigation: {
    visible: boolean;
    activeView: MyFlowRouteViewId;
    gridClass: string;
    tabs: readonly MyFlowRouteViewTab[];
  };
  saveUndoStatus?: string;
  empty: {
    visible: boolean;
    title: string;
    description: string;
    archivedCount: number;
  };
  workspace: {
    visible: boolean;
    showPostSavePanel: boolean;
    showWorkspace: boolean;
    workspaceRef: Ref<HTMLDivElement>;
    showSidebar: boolean;
    showWorkspaceControls: boolean;
    showScopeControl: boolean;
    selectedSlug: string;
    allEntries: readonly MyFlowRouteEntry<TFlow>[];
    panel: {
      showLegacyTodo: boolean;
      showFlowLibrary: boolean;
      focused: boolean;
      savedPlanLibraryEnabled: boolean;
      ariaLabel?: string;
      flowCount: number;
      showMapUpdates: boolean;
    };
    library: {
      isMobile: boolean;
      showArchivedInventory: boolean;
      controls: {
        search: boolean;
        filters: boolean;
        mode: 'compact' | 'searchable';
      };
      query: string;
      filter: MyFlowLibraryFilter;
      sort: MyFlowLibrarySort;
      sortPlanCount: number;
      filterOptions: readonly MyFlowRouteFilterOption[];
      visibleEntries: readonly MyFlowRouteEntry<TFlow>[];
      selectedEntry?: MyFlowRouteEntry<TFlow>;
      mobileEntries: readonly MyFlowRouteEntry<TFlow>[];
      mobileWorkspaceEntries: readonly MyFlowRouteEntry<TFlow>[];
      hiddenMobileCount: number;
      mobileInventoryExpanded: boolean;
      railRef: Ref<HTMLDivElement>;
      controlsRef: Ref<HTMLElement>;
    };
  };
};

export type MyFlowRouteActions = {
  onChooseCopy: (groupId: string, originSlug: string) => void;
  onSelectView: (id: MyFlowRouteViewId) => void;
  onViewKeyDown: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    id: MyFlowRouteViewId,
  ) => void;
  onShowArchived: () => void;
  onSelectFlow: (slug: string) => void;
  onReturnToLibrary: () => void;
  onQueryChange: (
    query: string,
    source: 'rail' | 'mobile',
    focusTarget: HTMLElement,
  ) => void;
  onFilterChange: (
    filter: MyFlowLibraryFilter,
    source: 'rail' | 'mobile',
    focusTarget: HTMLElement,
  ) => void;
  onSortChange: (sort: MyFlowLibrarySort, focusTarget: HTMLElement) => void;
  onExpandMobileInventory: () => void;
};

export type MyFlowRouteRenderers<TFlow> = {
  renderPostSavePanel: () => ReactNode;
  renderLegacyCrossFlowTodo: () => ReactNode;
  renderCompactToday: () => ReactNode;
  renderSaveBanner: () => ReactNode;
  renderMapUpdateNotices: () => ReactNode;
  renderRailRow: (flow: TFlow) => ReactNode;
  renderSelectedFlow: (flow: TFlow) => ReactNode;
  renderMobileLibraryRow: (flow: TFlow) => ReactNode;
  renderMobileWorkspace: (flow: TFlow) => ReactNode;
};

export type MyFlowRouteSurfaceProps<TFlow> = {
  model: MyFlowRouteModel<TFlow>;
  actions: MyFlowRouteActions;
  renderers: MyFlowRouteRenderers<TFlow>;
};

export function MyFlowRouteSurface<TFlow>({
  model,
  actions,
  renderers,
}: MyFlowRouteSurfaceProps<TFlow>) {
  const { copy, header, reconciliation, navigation, empty, workspace } = model;
  const { library, panel } = workspace;

  return (
    <>
      {header.focused ? (
        <h1 className="sr-only">{header.focusedTitle ?? copy.pageTitle}</h1>
      ) : (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-sm font-medium text-[var(--flowme-text-secondary)]">내 실행 공간</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="mt-1 text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-[var(--flowme-text)] sm:text-3xl">{copy.pageTitle}</h1>
              {header.demoLabel ? (
                <span data-testid="my-flow-demo-badge" className="mt-1 rounded-[var(--flowme-radius-compact)] bg-[var(--flowme-warning-soft)] px-2 py-1 text-xs font-semibold text-[var(--flowme-warning-strong)]">
                  {header.demoLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--flowme-text-secondary)] sm:mt-2 sm:text-base">{header.subtitle}</p>
          </div>
          <details className="group relative" data-testid="my-flow-auxiliary-menu">
            <summary
              className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] text-lg font-semibold text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)] hover:text-[var(--flowme-text)]"
              aria-label={copy.q3Enabled ? '내 계획 보조 메뉴' : 'My Flow 보조 메뉴'}
              title="보조 메뉴"
            >
              <span aria-hidden="true">•••</span>
            </summary>
            <div className="absolute right-0 z-40 mt-2 grid min-w-44 gap-1 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-2 [box-shadow:var(--flowme-shadow-raised)]">
              {header.studioHref ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text)] hover:bg-[var(--flowme-surface-subtle)]"
                  data-testid="my-flow-studio-link"
                  href={header.studioHref}
                >
                  스튜디오
                </Link>
              ) : null}
              <MyFlowDataManager q3CopyEnabled={copy.q3Enabled} />
            </div>
          </details>
        </div>
      )}

      {reconciliation.visible && reconciliation.options.length > 0 ? (
        <section
          data-testid="canonical-saved-copy-reconciliation"
          data-p33-marker="P33-EXPLICIT-DUPLICATE-RECONCILIATION"
          className="mb-5 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-warning-soft)] p-4"
          aria-labelledby="canonical-saved-copy-reconciliation-title"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--flowme-warning-strong)]">
              {copy.q3Enabled ? '같은 원문에서 저장한 계획' : '같은 원문에서 저장한 Flow'}
            </p>
            <h2 id="canonical-saved-copy-reconciliation-title" className="mt-1 text-lg font-semibold text-[var(--flowme-text)]">
              계속 사용할 사본을 골라 주세요
            </h2>
            <p className="mt-1 max-w-2xl break-keep text-sm leading-6 text-[var(--flowme-text-secondary)]">
              완료 기록과 개인 메모가 다른 사본은 자동으로 합치지 않습니다. 선택하지 않은 사본은 보관되며 나중에 다시 복구할 수 있습니다.
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {reconciliation.options.map((option) => (
              <article
                key={`${option.groupId}-${option.originSlug}`}
                data-testid="canonical-saved-copy-option"
                data-copy-role={option.role}
                data-flow-slug={option.originSlug}
                className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--flowme-warning-strong)]">
                      {option.role === 'canonical' ? '전체판' : '기존 간단판'} · {option.itemCount}개
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-[var(--flowme-text)]">{option.title}</h3>
                    <p className="mt-1 text-xs text-[var(--flowme-text-secondary)]">{option.savedDate} 저장</p>
                  </div>
                  <button
                    type="button"
                    data-testid="canonical-saved-copy-select"
                    className="min-h-12 shrink-0 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 py-2 text-xs font-semibold text-[var(--flowme-warning-strong)] hover:border-[var(--flowme-warning)] hover:bg-[var(--flowme-warning-soft)]"
                    aria-label={`${option.title} ${option.itemCount}개 사본 계속 사용`}
                    onClick={() => actions.onChooseCopy(option.groupId, option.originSlug)}
                  >
                    이 사본 사용
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {reconciliation.notice ? (
        <p
          data-testid="canonical-saved-copy-reconciliation-notice"
          role="status"
          className="mb-4 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-positive-soft)] px-3 py-2 text-sm font-semibold text-[var(--flowme-positive-strong)]"
        >
          {reconciliation.notice}
        </p>
      ) : null}

      {navigation.visible ? (
        <nav className="mb-5 border-y border-[var(--flowme-border)] py-2" aria-label={copy.q3Enabled ? '내 계획 보기' : 'My Flow 보기'}>
          <div
            role="tablist"
            aria-label={copy.q3Enabled ? '내 계획 보기' : 'My Flow 보기'}
            className={`${navigation.gridClass} ${FLOW_UI_SEGMENTED_CLASS} grid w-full sm:inline-grid sm:w-auto`}
          >
            {navigation.tabs.map((tab) => (
              <button
                key={tab.id}
                id={`my-flow-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={navigation.activeView === tab.id}
                aria-controls={`my-flow-panel-${tab.id}`}
                tabIndex={navigation.activeView === tab.id ? 0 : -1}
                className={`min-h-12 rounded-[var(--flowme-radius-control)] px-3 py-2 text-sm font-semibold ${navigation.activeView === tab.id ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
                data-testid={`my-flow-view-${tab.id}`}
                onClick={() => actions.onSelectView(tab.id)}
                onKeyDown={(event) => actions.onViewKeyDown(event, tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {model.saveUndoStatus ? (
        <p
          data-testid="my-flow-save-undo-status"
          role="status"
          className="mb-4 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text)]"
        >
          {model.saveUndoStatus}
        </p>
      ) : null}

      {empty.visible ? (
        <section
          id={`my-flow-panel-${navigation.activeView}`}
          role="tabpanel"
          aria-labelledby={`my-flow-tab-${navigation.activeView}`}
          data-testid="my-flow-empty-state"
          className="rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 py-8 sm:px-6 sm:py-10"
        >
          <p className="text-sm font-semibold text-[var(--flowme-action)]">{copy.listTitle}</p>
          <h2 className="mt-2 break-keep text-2xl font-semibold text-[var(--flowme-text)]">{empty.title}</h2>
          <p className="mt-2 max-w-xl break-keep text-sm leading-6 text-[var(--flowme-text-secondary)]">{empty.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--flowme-action-hover)] sm:w-auto"
              href="/flows"
              data-testid="my-flow-empty-discovery"
              data-action-role="discover-public-flow"
            >
              콘텐츠 고르러 가기
            </Link>
            {empty.archivedCount > 0 ? (
              <button
                type="button"
                data-testid="my-flow-open-archived"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-4 py-2 text-sm font-semibold text-[var(--flowme-text)] hover:bg-[var(--flowme-surface-subtle)] sm:w-auto"
                onClick={actions.onShowArchived}
              >
                {copy.q3Enabled ? '보관한 계획' : '보관된 Flow'} {empty.archivedCount}개 보기
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {workspace.visible ? (
        <section className="mb-6">
          {workspace.showPostSavePanel ? renderers.renderPostSavePanel() : null}
          {workspace.showWorkspace ? (
            <div
              data-testid="my-flow-workspace"
              data-surface-role="task-first"
              ref={workspace.workspaceRef}
              tabIndex={-1}
              className={`mb-4 grid gap-4 ${workspace.showSidebar ? 'lg:grid-cols-[210px_minmax(0,1fr)]' : ''}`}
            >
              {workspace.showSidebar ? (
                <aside data-testid="my-flow-list" className="hidden max-h-[calc(100vh-2rem)] self-start overflow-y-auto rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-3 lg:sticky lg:top-4 lg:block">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--flowme-text-secondary)]">실행 목록</p>
                      <h3 className="text-base font-semibold text-[var(--flowme-text)]">{copy.listTitle}</h3>
                    </div>
                    <p className="rounded-[var(--flowme-radius-compact)] bg-[var(--flowme-surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">{workspace.allEntries.length}개</p>
                  </div>
                  <div className="grid gap-2">
                    <button
                      className={`min-h-12 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-left ${workspace.selectedSlug === 'all' ? 'border-[var(--flowme-text)] bg-[var(--flowme-text)] text-white' : 'border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text)] hover:border-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]'}`}
                      type="button"
                      aria-pressed={workspace.selectedSlug === 'all'}
                      data-testid="my-flow-filter-all"
                      onClick={() => actions.onSelectFlow('all')}
                    >
                      <span className="block text-sm font-semibold">{copy.q3Enabled ? '모든 계획' : '모든 Flow'}</span>
                      <span className={`mt-1 block text-xs font-semibold ${workspace.selectedSlug === 'all' ? 'text-white/80' : 'text-[var(--flowme-action)]'}`}>{workspace.allEntries.length}개 저장</span>
                    </button>
                    {workspace.allEntries.map((entry) => (
                      <button
                        key={entry.key}
                        className={`min-h-12 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-left ${workspace.selectedSlug === entry.slug ? 'border-[var(--flowme-text)] bg-[var(--flowme-text)] text-white' : 'border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text)] hover:border-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]'}`}
                        type="button"
                        aria-pressed={workspace.selectedSlug === entry.slug}
                        data-testid={`my-flow-filter-${entry.slug}`}
                        onClick={() => actions.onSelectFlow(entry.slug)}
                      >
                        <span className="block text-sm font-semibold">{entry.title}</span>
                        <span className={`mt-1 block text-xs font-semibold ${workspace.selectedSlug === entry.slug ? 'text-white/80' : 'text-[var(--flowme-action)]'}`}>{entry.progressLabel}</span>
                      </button>
                    ))}
                  </div>
                </aside>
              ) : null}
              <div className="min-w-0">
                {workspace.showWorkspaceControls ? (
                  <div className="mb-5 border-y border-[var(--flowme-border)] py-3 sm:flex sm:items-end sm:justify-between sm:gap-3">
                    {workspace.showScopeControl ? (
                      <div className={`min-w-0 sm:w-72 ${workspace.showSidebar ? 'lg:hidden' : ''}`}>
                        <label className="mb-1 block text-xs font-semibold text-[var(--flowme-text-secondary)]" htmlFor="my-flow-scope">
                          {copy.sectionTitle}
                        </label>
                        <select
                          id="my-flow-scope"
                          className="min-h-12 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text)]"
                          value={workspace.selectedSlug}
                          data-testid="my-flow-scope-select"
                          onChange={(event) => actions.onSelectFlow(event.target.value)}
                        >
                          <option value="all">{copy.q3Enabled ? '모든 계획' : '모든 Flow'}</option>
                          {workspace.allEntries.map((entry) => (
                            <option key={entry.key} value={entry.slug}>{entry.title}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {panel.showLegacyTodo ? renderers.renderLegacyCrossFlowTodo() : null}

                {panel.showFlowLibrary ? (
                  <div
                    id="my-flow-panel-flow"
                    role={panel.focused ? 'region' : 'tabpanel'}
                    aria-labelledby={panel.focused || panel.savedPlanLibraryEnabled
                      ? undefined
                      : 'my-flow-tab-flow'}
                    aria-label={panel.ariaLabel}
                    className="grid gap-4"
                  >
                    {renderers.renderCompactToday()}
                    {renderers.renderSaveBanner()}
                    {!panel.focused ? (
                      <header data-testid="my-flow-library-heading" tabIndex={-1} className="flex items-center justify-between gap-3 border-b border-[var(--flowme-border)] pb-3 md:hidden">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--flowme-text)]">{copy.sectionTitle}</h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span data-testid="my-flow-saved-count" className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                            {panel.flowCount}개
                          </span>
                          <MyFlowSortMenu
                            sort={library.sort}
                            planCount={library.sortPlanCount}
                            visible={panel.savedPlanLibraryEnabled && library.sortPlanCount >= 2}
                            placement="mobile"
                            onChange={actions.onSortChange}
                          />
                        </div>
                      </header>
                    ) : null}
                    {panel.showMapUpdates ? renderers.renderMapUpdateNotices() : null}
                    {!library.isMobile && (workspace.allEntries.length > 0 || library.showArchivedInventory) ? (
                      <div
                        data-testid="my-flow-library-workspace"
                        data-library-layout="rail-canvas-inspector"
                        data-p29-marker="P29-MY-FLOW-THREE-PANE"
                        data-p32-marker="P32-02-FOCUSED-MY-FLOW-WORKSPACE"
                        data-p35-marker="P35-MY-LIBRARY-ONLY"
                        data-p35-r11-marker="P35-R11-WIDE-EXECUTION-INSPECTOR"
                        data-workspace-composition={panel.savedPlanLibraryEnabled ? 'responsive-wide-surface' : undefined}
                        data-workspace-breakpoints={panel.savedPlanLibraryEnabled ? 'mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280+' : undefined}
                        data-compact-inspector-layout={panel.savedPlanLibraryEnabled ? 'stacked-in-main' : undefined}
                        data-full-inspector-layout={panel.savedPlanLibraryEnabled ? 'third-column' : undefined}
                        className={`hidden min-w-0 gap-0 overflow-hidden rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] md:grid ${panel.savedPlanLibraryEnabled
                          ? library.selectedEntry
                            ? 'md:grid-cols-1 lg:grid-cols-[minmax(16rem,28%)_minmax(0,1fr)] xl:grid-cols-[minmax(14rem,20%)_minmax(0,1fr)] lg:[&_[data-workspace-layout=library-execution-inspector]]:!grid-cols-1 xl:[&_[data-workspace-layout=library-execution-inspector]]:!grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]'
                            : 'md:grid-cols-1'
                          : library.selectedEntry
                            ? 'md:grid-cols-[minmax(22rem,36%)_minmax(0,1fr)]'
                            : 'md:grid-cols-1'}`}
                      >
                        <aside data-testid="my-flow-library-rail" className={`min-w-0 bg-[var(--flowme-surface-subtle)] ${library.selectedEntry
                          ? panel.savedPlanLibraryEnabled
                            ? 'border-b border-[var(--flowme-border)] lg:border-b-0 lg:border-r'
                            : 'border-r border-[var(--flowme-border)]'
                          : ''}`}>
                          <div className="border-b border-[var(--flowme-border)] p-3">
                            {panel.focused ? (
                              <button
                                type="button"
                                data-testid="my-flow-library-back"
                                className="mb-3 inline-flex min-h-12 items-center gap-1 rounded-[var(--flowme-radius-control)] px-2 text-xs font-semibold text-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]"
                                aria-label={copy.q3Enabled ? '전체 내 계획 보기로 돌아가기' : '전체 My Flow 보기로 돌아가기'}
                                onClick={actions.onReturnToLibrary}
                              >
                                <span aria-hidden="true">‹</span>
                                전체 보기
                              </button>
                            ) : null}
                            <div data-testid="my-flow-library-heading" tabIndex={-1} className="flex items-center justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-[var(--flowme-text)]">{copy.sectionTitle}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">{library.visibleEntries.length}개</span>
                                <MyFlowSortMenu
                                  sort={library.sort}
                                  planCount={library.sortPlanCount}
                                  visible={panel.savedPlanLibraryEnabled && library.sortPlanCount >= 2}
                                  placement="rail"
                                  onChange={actions.onSortChange}
                                />
                              </div>
                            </div>
                            {library.controls.search ? (
                              <input
                                className="mt-3 min-h-12 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 py-2 text-sm text-[var(--flowme-text)]"
                                type="search"
                                placeholder={copy.searchPlaceholder}
                                aria-label={copy.searchAccessibleName}
                                value={library.query}
                                data-testid="my-flow-library-rail-search"
                                onChange={(event) => actions.onQueryChange(
                                  event.target.value,
                                  'rail',
                                  event.currentTarget,
                                )}
                              />
                            ) : null}
                            {library.controls.filters ? (
                              <label className="mt-2 block text-xs font-semibold text-[var(--flowme-text-secondary)]">
                                상태
                                <select
                                  data-testid="my-flow-library-rail-filter"
                                  data-p35-r10-marker="P35-R10-LIBRARY-FILTER-ONE-AXIS"
                                  className="mt-1 min-h-12 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 text-sm font-semibold text-[var(--flowme-text)]"
                                  value={library.filter}
                                  onChange={(event) => actions.onFilterChange(
                                    event.target.value as MyFlowLibraryFilter,
                                    'rail',
                                    event.currentTarget,
                                  )}
                                >
                                  {library.filterOptions.map((option) => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                          </div>
                          <div
                            ref={library.railRef}
                            data-testid="my-flow-library-scroll-container"
                            className={`max-h-[calc(100dvh-18rem)] overflow-y-auto overscroll-contain ${library.selectedEntry ? '' : 'md:grid md:grid-cols-2 xl:grid-cols-3'}`}
                          >
                            {library.visibleEntries.map((entry) => renderers.renderRailRow(entry.value))}
                          </div>
                        </aside>
                        <main data-testid="my-flow-library-detail" className={library.selectedEntry ? 'min-w-0 p-4 xl:p-5' : 'hidden'}>
                          {library.selectedEntry
                            ? renderers.renderSelectedFlow(library.selectedEntry.value)
                            : library.visibleEntries.length > 0
                              ? (
                                  <p className="py-8 text-center text-sm font-semibold text-[var(--flowme-text-secondary)]">
                                    {copy.q3Enabled ? '계획을 열어 전체 내용 확인' : 'Flow를 열어 전체 계획 확인'}
                                  </p>
                                )
                              : (
                                  <p className="py-8 text-center text-sm text-[var(--flowme-text-secondary)]">
                                    {copy.q3Enabled ? '조건에 맞는 계획이 없습니다.' : '조건에 맞는 Flow가 없습니다.'}
                                  </p>
                                )}
                        </main>
                      </div>
                    ) : null}
                    {library.isMobile && workspace.selectedSlug === 'all' && (library.mobileWorkspaceEntries.length > 0 || library.showArchivedInventory) ? (
                      <div
                        data-testid="my-flow-mobile-flow-hub"
                        data-library-mode={library.controls.mode}
                        data-workspace-composition={panel.savedPlanLibraryEnabled ? 'mobile-drill-in' : undefined}
                        data-p35-marker="P35-MY-LIBRARY-ONLY"
                        className="grid gap-3"
                      >
                        {library.controls.search || library.controls.filters ? (
                          <section
                            ref={library.controlsRef}
                            data-testid="my-flow-library-controls"
                            className="grid gap-2 border-y border-[var(--flowme-border)] py-2"
                          >
                            {library.controls.search ? (
                              <input
                                className="min-h-12 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text)]"
                                type="search"
                                placeholder={copy.searchPlaceholder}
                                aria-label={copy.searchAccessibleName}
                                value={library.query}
                                data-testid="my-flow-search"
                                onChange={(event) => actions.onQueryChange(
                                  event.target.value,
                                  'mobile',
                                  event.currentTarget,
                                )}
                              />
                            ) : null}
                            {library.controls.filters ? (
                              <div
                                className="flex flex-wrap gap-2"
                                role="group"
                                aria-label={copy.q3Enabled ? '저장한 계획 상태 필터' : '저장한 Flow 상태 필터'}
                                data-p35-r10-marker="P35-R10-LIBRARY-FILTER-ONE-AXIS"
                              >
                                {library.filterOptions.map((option) => (
                                  <button
                                    key={option.id}
                                    className={`min-h-12 rounded-[var(--flowme-radius-control)] px-2.5 py-1.5 text-xs font-semibold ${library.filter === option.id ? 'bg-[var(--flowme-text)] text-white' : 'bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-action-soft)] hover:text-[var(--flowme-text)]'}`}
                                    type="button"
                                    aria-pressed={library.filter === option.id}
                                    data-testid={`my-flow-list-filter-${option.id}`}
                                    onClick={(event) => actions.onFilterChange(
                                      option.id,
                                      'mobile',
                                      event.currentTarget,
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </section>
                        ) : null}
                        {library.visibleEntries.length > 0 ? (
                          <div className="overflow-hidden rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)]" data-p29-marker="P29-MY-FLOW-ACTION-FIRST">
                            {library.mobileEntries.map((entry) => renderers.renderMobileLibraryRow(entry.value))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm text-[var(--flowme-text-secondary)]">
                            {copy.q3Enabled ? '조건에 맞는 계획이 없습니다.' : '조건에 맞는 Flow가 없습니다.'}
                          </p>
                        )}
                        {library.hiddenMobileCount > 0 ? (
                          <button
                            type="button"
                            data-testid="my-flow-mobile-inventory-open"
                            className="min-h-12 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--flowme-action)] hover:bg-[var(--flowme-surface-selected)]"
                            aria-expanded={library.mobileInventoryExpanded}
                            onClick={actions.onExpandMobileInventory}
                          >
                            {library.hiddenMobileCount}개 더 보기
                          </button>
                        ) : null}
                      </div>
                    ) : library.isMobile ? (
                      <div className="min-w-0" data-workspace-composition={panel.savedPlanLibraryEnabled ? 'mobile-drill-in' : undefined}>
                        {library.mobileWorkspaceEntries.map((entry) => renderers.renderMobileWorkspace(entry.value))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
