import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  MyFlowRouteSurface,
  type MyFlowRouteActions,
  type MyFlowRouteModel,
  type MyFlowRouteRenderers,
} from './MyFlowRouteSurface';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type TestFlow = { id: string };

const entries = [
  { key: 'one', slug: 'one', title: '계획 1', progressLabel: '0/2', value: { id: 'one' } },
  { key: 'two', slug: 'two', title: '계획 2', progressLabel: '1/2', value: { id: 'two' } },
] as const;

function buildModel(isMobile: boolean): MyFlowRouteModel<TestFlow> {
  return {
    copy: {
      q3Enabled: true,
      pageTitle: '내 계획',
      listTitle: '내 계획',
      sectionTitle: '계획 목록',
      searchPlaceholder: '계획 검색',
      searchAccessibleName: '계획 검색',
    },
    header: { focused: true, subtitle: '' },
    reconciliation: { visible: false, options: [] },
    navigation: { visible: false, activeView: 'flow', gridClass: 'grid-cols-1', tabs: [] },
    empty: { visible: false, title: '', description: '', archivedCount: 0 },
    workspace: {
      visible: true,
      showPostSavePanel: false,
      showWorkspace: true,
      workspaceRef: null,
      showSidebar: false,
      showWorkspaceControls: false,
      showScopeControl: false,
      selectedSlug: isMobile ? 'all' : 'one',
      allEntries: entries,
      panel: {
        showLegacyTodo: false,
        showFlowLibrary: true,
        focused: false,
        savedPlanLibraryEnabled: true,
        flowCount: entries.length,
        showMapUpdates: false,
      },
      library: {
        isMobile,
        showArchivedInventory: false,
        controls: { search: false, filters: false, mode: 'compact' },
        query: '',
        filter: 'all',
        sort: 'next',
        sortPlanCount: entries.length,
        filterOptions: [],
        visibleEntries: entries,
        ...(!isMobile ? { selectedEntry: entries[0] } : {}),
        mobileEntries: entries,
        mobileWorkspaceEntries: entries,
        hiddenMobileCount: 0,
        mobileInventoryExpanded: false,
        railRef: null,
        controlsRef: null,
      },
    },
  };
}

const actions: MyFlowRouteActions = {
  onChooseCopy: () => undefined,
  onSelectView: () => undefined,
  onViewKeyDown: () => undefined,
  onShowArchived: () => undefined,
  onSelectFlow: () => undefined,
  onReturnToLibrary: () => undefined,
  onQueryChange: () => undefined,
  onFilterChange: () => undefined,
  onSortChange: () => undefined,
  onExpandMobileInventory: () => undefined,
};

const renderers: MyFlowRouteRenderers<TestFlow> = {
  renderPostSavePanel: () => null,
  renderLegacyCrossFlowTodo: () => null,
  renderCompactToday: () => null,
  renderSaveBanner: () => null,
  renderMapUpdateNotices: () => null,
  renderRailRow: (flow) => <div key={flow.id} data-rail-row={flow.id} />,
  renderSelectedFlow: () => (
    <section data-testid="selected-plan">
      <div data-workspace-layout="library-execution-inspector">
        <main data-testid="plan-canvas" />
        <aside data-testid="item-inspector" />
      </div>
    </section>
  ),
  renderMobileLibraryRow: (flow) => <div key={flow.id} data-mobile-row={flow.id} />,
  renderMobileWorkspace: (flow) => <div key={flow.id} data-mobile-workspace={flow.id} />,
};

test('wide surface encodes stacked, compact two-column, and full three-column boundaries', () => {
  const markup = renderToStaticMarkup(
    <MyFlowRouteSurface model={buildModel(false)} actions={actions} renderers={renderers} />,
  );

  assert.match(markup, /data-workspace-breakpoints="mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280\+"/u);
  assert.match(markup, /md:grid-cols-1/u);
  assert.match(markup, /lg:grid-cols-\[minmax\(16rem,28%\)_minmax\(0,1fr\)\]/u);
  assert.match(markup, /xl:grid-cols-\[minmax\(14rem,20%\)_minmax\(0,1fr\)\]/u);
  assert.match(markup, /data-compact-inspector-layout="stacked-in-main"/u);
  assert.match(markup, /data-full-inspector-layout="third-column"/u);
  assert.equal(
    markup.includes('lg:[&amp;_[data-workspace-layout=library-execution-inspector]]:!grid-cols-1'),
    true,
  );
  assert.equal(
    markup.includes('xl:[&amp;_[data-workspace-layout=library-execution-inspector]]:!grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]'),
    true,
  );
  assert.match(markup, /data-testid="my-plan-sort-rail"/u);
  assert.match(markup, /data-sort-menu-overlay="true"/u);
  assert.match(markup, /min-h-12/u);
  assert.match(markup, /min-w-12/u);
  assert.doesNotMatch(markup, /data-mobile-workspace=/u);
});

test('mobile keeps its drill-in DOM separate and uses the overlay sort trigger', () => {
  const markup = renderToStaticMarkup(
    <MyFlowRouteSurface model={buildModel(true)} actions={actions} renderers={renderers} />,
  );

  assert.match(markup, /data-workspace-composition="mobile-drill-in"/u);
  assert.match(markup, /data-testid="my-plan-sort-mobile"/u);
  assert.match(markup, /data-sort-menu-overlay="true"/u);
  assert.match(markup, /min-h-12/u);
  assert.match(markup, /min-w-12/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-library-workspace"/u);

  const selectedModel = buildModel(true);
  selectedModel.workspace.selectedSlug = 'one';
  const selectedMarkup = renderToStaticMarkup(
    <MyFlowRouteSurface model={selectedModel} actions={actions} renderers={renderers} />,
  );
  assert.match(selectedMarkup, /data-workspace-composition="mobile-drill-in"/u);
  assert.match(selectedMarkup, /data-mobile-workspace="one"/u);
  assert.doesNotMatch(selectedMarkup, /data-testid="my-flow-library-workspace"/u);
});

test('saved-plan flag off restores the legacy surface without approved sort or breakpoints', () => {
  const model = buildModel(false);
  model.workspace.panel.savedPlanLibraryEnabled = false;
  const markup = renderToStaticMarkup(
    <MyFlowRouteSurface model={model} actions={actions} renderers={renderers} />,
  );

  assert.doesNotMatch(markup, /data-testid="my-plan-sort-rail"/u);
  assert.doesNotMatch(markup, /data-workspace-breakpoints=/u);
  assert.doesNotMatch(markup, /data-workspace-composition="responsive-wide-surface"/u);
  assert.match(markup, /md:grid-cols-\[minmax\(22rem,36%\)_minmax\(0,1fr\)\]/u);
});

test('empty legacy surface keeps the visible archived-lens action', () => {
  const model = buildModel(false);
  model.workspace.visible = false;
  model.workspace.panel.savedPlanLibraryEnabled = false;
  model.empty = {
    visible: true,
    title: '저장한 계획이 없습니다',
    description: '보관한 계획은 다시 열 수 있습니다.',
    archivedCount: 1,
  };

  const markup = renderToStaticMarkup(
    <MyFlowRouteSurface model={model} actions={actions} renderers={renderers} />,
  );

  assert.match(markup, /data-testid="my-flow-open-archived"/u);
  assert.match(markup, />보관한 계획 1개 보기<\/button>/u);
});
