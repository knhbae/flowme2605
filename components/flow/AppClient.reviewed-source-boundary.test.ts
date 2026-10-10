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
    isPublicFlowSourceOnHold: () => false, setPublicSaveError: (value: string) => { error = value; },
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
