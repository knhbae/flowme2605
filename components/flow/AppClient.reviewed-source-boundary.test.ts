import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { publishedSourceEditions } from '../../lib/flow/public-source-edition-data';
import { getReviewedPublicSourceVersion, getSavedPublicSourceEdition, selectSavedPublicSourceBundle } from '../../lib/flow/public-source-editions';
import { getRoutineWeekdayLabels } from '../../lib/flow/recurrence';
import { buildEffectiveRoutineProjection } from '../../lib/flow/effective-routine-projection';
import { buildMyFlowStepIcs } from '../../lib/flow/my-flow-step-export';
import { seedBundles } from '../../lib/flow/seed-flows';
import { isPublicFlowSourceOnHold, PUBLIC_SOURCE_REVIEW_HOLD_SLUGS } from '../../lib/flow/public-source-review-policy';
import { getPublicFlowIndexingPolicy } from '../../lib/flow/route-indexing-policy';

// Execute the actual component's small writer/reader functions, without React,
// a browser, an account or a backend. Do not replace them with copied fixtures.
const source = fs.readFileSync('components/flow/AppClient.tsx', 'utf8');
const tree = ts.createSourceFile('AppClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function componentFunction(name: string, dependencies: Record<string, unknown>) {
  let text: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name && node.initializer) text = node.initializer.getText(tree);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) text = node.getText(tree);
    ts.forEachChild(node, visit);
  };
  visit(tree); assert(text, name);
  const declaration = text.startsWith('function ') ? `${text}; globalThis.subject=${name};` : `globalThis.subject=(${text});`;
  const context = vm.createContext({ ...dependencies });
  vm.runInContext(ts.transpileModule(declaration, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.subject as (...args: any[]) => any;
}
const editions = { getReviewedPublicSourceVersion, getSavedPublicSourceEdition };
function writer(bundle: any, previousRecord?: any) {
  let stored: any, error: string | undefined, touches = 0;
  const subject = componentFunction('commitPublicFlowLegacy', {
    ...editions, bundle, getSavedFlowRecord: () => previousRecord,
    isPublicFlowSourceOnHold, setPublicSaveError: (value: string) => { error = value; },
    focusPublicSaveFailure: () => {}, focusPublicDateInput: () => {},
    buildEffectiveFlowSnapshot: () => ({ savedFlowRecordInput: { selectedArtifactMode: 'checklist' }, committed: { rows: [], excludedRows: [] } }),
    publicEffectiveDisplayTitle: bundle.flow.title, publicDisplayTitle: bundle.flow.title,
    itemStates: {}, publicItemPersonalizations: {}, publicProjectionOrder: [], publicCompletedItemIds: [],
    comparisonState: {}, workbenchState: {}, reactionLogs: [], publicApprovedPlanExecutionEnabled: false,
    weekdaySelection: [], routineDefinition: { schemaVersion: 1, end: { mode: 'none' } },
    saveStoredAnchor: () => { touches++; }, saveFlowRecord: (_slug: string, input: any) => { touches++; stored = input; return input; },
    setSavedFlowAt: () => {}, setPublicAdjustmentOpen: () => {}, closePublicItemEditor: () => {}, setAnchor: () => {}, setAnchorMode: () => {},
  });
  subject({ canSave: true, persistedMode: 'undated' });
  return { stored, error, touches };
}

test('classic actual writer persists exact edition identity; a fresh reader selects all 14 exact bundles', () => {
  assert.equal(publishedSourceEditions.length, 14);
  for (const edition of publishedSourceEditions) {
    const { stored, error } = writer(edition.bundle); assert.equal(error, undefined);
    assert.equal(stored.sourceVersion, edition.version);
    assert.equal(stored.sourceFlowKey, edition.sourceFlowId);
    assert.equal(stored.sourceFlowSlug, edition.sourceSlug);
    const reconnected = JSON.parse(JSON.stringify(stored));
    assert.deepEqual(selectSavedPublicSourceBundle(edition.bundle, reconnected), edition.bundle);
    assert.equal(getSavedPublicSourceEdition(edition.bundle, reconnected)?.version, edition.version);
  }
});

test('classic actual writer refuses unknown/date/old/mismatched existing identity before any overlay write', () => {
  const edition = publishedSourceEditions[0];
  for (const previous of [{}, { sourceVersion: '2026-07-11' }, { sourceVersion: 'old' },
    { sourceVersion: edition.version, sourceFlowKey: 'other', sourceFlowSlug: edition.sourceSlug }]) {
    const before = JSON.stringify(previous), result = writer(edition.bundle, previous);
    assert.equal(result.touches, 0); assert.equal(result.stored, undefined);
    assert.match(result.error ?? '', /기존 계획.*이전 원문 판본/u);
    assert.equal(JSON.stringify(previous), before);
  }
});

test('classic exact re-save retains the same edition and identity', () => {
  const edition = publishedSourceEditions[0];
  const identity = { sourceVersion: edition.version, sourceFlowKey: edition.sourceFlowId, sourceFlowSlug: edition.sourceSlug };
  assert.equal(writer(edition.bundle, identity).stored.sourceVersion, edition.version);
});

test('reviewed initial/reader weekdays remain explicit; weekly starts on the personal date and matches export', () => {
  const edition = publishedSourceEditions.find(row => row.sourceSlug === 'morning-skincare-routine')!; assert(edition);
  const initial = componentFunction('getInitialWeekdaySelection', editions);
  assert.deepEqual(Array.from(initial(edition.bundle)), []);
  const record = { sourceVersion: edition.version, sourceFlowKey: edition.sourceFlowId, sourceFlowSlug: edition.sourceSlug };
  const subject = componentFunction('getMyFlowRoutineWeekdays', { ...editions,
    shouldShowWeekdaySelection: () => true, myFlowRoutineRuleDrafts: {}, getRoutineWeekdayLabels });
  const flow = { bundle: edition.bundle, savedRecord: record, progress: { slug: 'personal' } };
  assert.deepEqual(Array.from(subject(flow)), []);
  assert.deepEqual(Array.from(subject({ ...flow, progress: { slug: 'personal', weekdays: ['화'] } })), ['화']);
  const itemId = edition.bundle.items[0].id;
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, identityNamespace: 'personal',
    rows: [{ id: itemId, date: '2026-10-13' }], startDate: '2026-10-13', selectedWeekdays: subject(flow),
    range: { start: '2026-10-13', end: '2026-11-10' }, personalRepeatByItemId: { [itemId]: { repeatPreset: 'weekly', startDate: '2026-10-13' } } });
  assert.equal(projection.semanticOccurrenceCount, 5);
  const series = projection.seriesByItemId[itemId];
  const ics = buildMyFlowStepIcs({ flowTitle: '가상 계획', stepId: itemId, stepTitle: '가상 행동', date: '2026-10-13',
    personalRecurrence: series, personalRecurrenceIdentityNamespace: 'personal' });
  assert.match(ics, /RRULE:FREQ=WEEKLY/); assert.doesNotMatch(ics, /BYDAY=MO,WE,FR/);
  assert.deepEqual(Array.from(subject({ ...flow, savedRecord: undefined })), ['월', '수', '금']);
});

test('unversioned classic reader retains original travel/meal/license text, while new exact intake uses the reviewed registry', () => {
  const travel = seedBundles.find(row => row.flow.slug === 'travel-packing-list')!;
  assert(travel.items.some(row => row.title.includes('예약 바우처·숙소 주소 오프라인')));
  assert(travel.items.some(row => row.title.includes('캐리어 짐 배치')));
  assert.deepEqual(selectSavedPublicSourceBundle(travel, {}), travel);
  const reviewed = publishedSourceEditions.find(row => row.sourceSlug === travel.flow.slug)!;
  assert(reviewed.bundle.items.some(row => row.title === '예약 바우처 인쇄 사본 준비하기'));
  assert(reviewed.bundle.items.some(row => row.title.includes('무게 확인')));
  const license = seedBundles.find(row => row.flow.slug === 'real-safe-driving-license-renewal')!;
  assert(license.itemDetails![0].how?.includes('면허증 정보를 보고'));
  assert.deepEqual(selectSavedPublicSourceBundle(license, { sourceVersion: '2026-07-11' }), license);
  const meal = seedBundles.find(row => row.flow.slug === 'weekly-meal-plan')!;
  assert(meal.items.some(row => row.title === '화요일 버섯샐러드 만들기'));
});

test('actual saved-workspace readiness keeps all held-source plans usable without changing their records', () => {
  const ready = componentFunction('getMyFlowContentReadiness', {
    isRetiredPersonalCopyBundle: (bundle: any) => bundle.flow.tags?.includes('retired-personal-copy'),
    isUrlFirstDraftSavedFlow: () => false, isPublicFlowSourceOnHold,
    getPublicFlowIndexingPolicy, serviceCatalogFlowSlugs: new Set(),
  });
  for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
    const bundle = seedBundles.find(row => row.flow.slug === slug)!; assert(bundle, slug);
    const flow = { bundle, progress: { slug, sourceSlug: slug },
      savedRecord: { slug, savedAt: '2026-09-20T00:00:00.000Z' },
      checks: { [bundle.items[0].id]: true }, memo: '가상 이전 개인 메모' };
    const before = JSON.stringify(flow);
    assert.equal(getPublicFlowIndexingPolicy(bundle).indexable, false, 'NEW discovery stays held');
    assert.equal(ready(flow).kind, 'ready', slug);
    const { savedRecord: _record, ...legacyCheckOnly } = flow;
    assert.equal(ready(legacyCheckOnly).kind, 'ready', 'pre-schema personal check records remain usable');
    assert.equal(JSON.stringify(flow), before, 'existing source, check and memo bytes stay unchanged');
    const retired = { ...flow, bundle: { ...bundle, flow: { ...bundle.flow, tags: ['retired-personal-copy'] } } };
    assert.equal(ready(retired).kind, 'retired', 'existing explicit retirement is not relaxed');
    const draft = { ...flow, bundle: { ...bundle, flow: { ...bundle.flow, status: 'draft', source_status: 'needs_review' } } };
    assert.equal(ready(draft).kind, 'review', 'a held draft is not promoted by the published-plan exception');
  }
  const unsupported = { bundle: { flow: { slug: 'unsupported-published-source', status: 'published' } },
    progress: { slug: 'unsupported-published-source' } };
  assert.equal(ready(unsupported).kind, 'review', 'unrelated unsupported published content stays held');
});

test('actual classic writer still refuses every held NEW start before any personal write', () => {
  for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
    const bundle = seedBundles.find(row => row.flow.slug === slug)!; assert(bundle, slug);
    const before = JSON.stringify(bundle), result = writer(bundle);
    assert.equal(result.touches, 0, slug);
    assert.equal(result.stored, undefined, slug);
    assert.match(result.error ?? '', /출처를 재검토.*새로 시작할 수 없습니다/u);
    assert.equal(JSON.stringify(bundle), before, 'NEW refusal does not rewrite source');
  }
});
