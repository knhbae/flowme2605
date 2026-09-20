import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import { readProgramExecutionOccurrences } from '../../../lib/flow/integrated-poc/recurrence-state';
import { applyProgramRecurrencePlanTransition, prepareProgramRecurrencePlan, updateProgramPersonalOccurrence } from '../../../lib/flow/integrated-poc/program-recurrence-plan-state';
import { previewProgramRecurrencePlan, resolveProgramRecurrencePlanTarget } from '../../../lib/flow/integrated-poc/program-recurrence-plan';
import { validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type * as Component from './ProgramRecurrencePlanRecovery';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { createProgramDocument, importProgramPublicVersion, setProgramCopyInclusion } from '../../../lib/flow/integrated-poc/private-space';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import { programPublicCopyExecutionRef } from '../../../lib/flow/integrated-poc/public-copy-recurrence';

const file = new URL('./ProgramRecurrencePlanRecovery.tsx', import.meta.url), require = createRequire(file);
const loaded = { exports: {} as typeof Component };
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(id));
const { ProgramRecurrencePlanRecovery, programRecurrencePlanRecoveryRows } = loaded.exports;
const now = '2026-09-12T00:00:00.000Z', today = '2026-09-12';
function fixture() {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'recover-ui', documentId: 'recover-doc', revisionId: 'recover-v1', committedAt: now,
    rawText: '# 이전 반복\n- [ ] 회복할 기록\n  - 날짜: 2026-09-12\n  - 반복: 매일\n  - 반복 종료: 3회' }); assert(made.ok);
  let data = prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data;
  const input = { actorId: data.activeActorId, flowRef: made.flow.ref, localToday: today };
  const read = readProgramExecutionOccurrences(data, input); assert(read.ok); const first = read.rows[0];
  const seed = prepareProgramRecurrencePlan(data, { ...input, sourceIdentity: first.identity, ownerId: 'recovery-plan-ui', now }); assert(seed.ok);
  const target = resolveProgramRecurrencePlanTarget(seed.value.owner, { originalDate: first.originalDate }); assert(target.ok);
  const preview = previewProgramRecurrencePlan(seed.value.owner, { actorId: input.actorId, expected: seed.value.owner, currentSource: first.identity,
    operation: { scope: 'future_series', targetDate: '2026-09-19', target: target.value, sourceCutover: first.identity, at: now } }); assert(preview.ok);
  const applied = applyProgramRecurrencePlanTransition(data, { ...input, expectedSpace: seed.value.expectedSpace, expectedOwner: null, preview: preview.value }); assert(applied.ok); data = applied.data;
  const rows = readProgramExecutionOccurrences(data, input); assert(rows.ok); const personal = rows.rows.filter(row => row.personalPlan);
  assert.equal(personal.length, 3);
  for (const [index, row] of personal.entries()) {
    const owner = data.spaces[input.actorId].recurrencePlans!.owners['recovery-plan-ui'];
    const saved = updateProgramPersonalOccurrence(data, { ...input, ownerId: owner.ownerId, expectedOwner: owner, identity: row.personalPlan!.identity, at: now,
      changes: index === 0 ? { schedule: { mode: 'fixed_date', date: '2026-10-11' }, completion: { status: 'completed', completedAt: now } }
        : index === 1 ? { schedule: { mode: 'unscheduled', date: null }, participation: 'held' } : { completion: { status: 'open', completedAt: null }, participation: 'excluded' } }); assert(saved.ok); data = saved.data;
  }
  const space = data.spaces[input.actorId], documentId = space.savedBindings[0].documentId, lineId = space.savedBindings[0].itemLines[first.sourceItemRef];
  // A source can be unavailable without modifying its immutable retained personal owner.
  space.legacySnapshot = null;
  assert(validateProgramData(data)); return { data, documentId, lineId, actorId: input.actorId };
}
test('RPR01 unavailable source with no live metadata still renders exact personal dates/completion/participation without writing', () => {
  const f = fixture(), before = JSON.stringify(f.data);
  const html = renderToStaticMarkup(<ProgramRecurrencePlanRecovery data={f.data} today={today} onOpenSource={() => { throw Error('render must not navigate'); }} />);
  for (const value of ['보존한 반복 계획 1개', '회복할 기록', '이전 개인 회차 기록', '2026-10-11', '2026-09-19', '날짜 미정', '다시 열림', '제외', '보류', now]) assert(html.includes(value), value);
  assert(!html.includes('현재 원본에 연결')); assert.equal(JSON.stringify(f.data), before);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, documentId: f.documentId })[0].lineId, f.lineId);
});
test('RPR02 actual retained canonical line owns document/folder navigation, not the old saved binding location', () => {
  const f = fixture(), space = f.data.spaces[f.actorId]; space.text = M.addDocument(space.text, { title: '이전 내용 보관' });
  const retained = space.text.documents.at(-1)!, source = M.getDocument(space.text, f.documentId)!;
  retained.lines = source.lines; source.lines = []; space.archivedDocumentIds.push(retained.id); space.retentionDocuments = { ...space.retentionDocuments, [source.id]: retained.id };
  assert(validateProgramData(f.data)); const before = JSON.stringify(f.data);
  const rows = programRecurrencePlanRecoveryRows(f.data, { today, documentId: f.documentId }); assert.equal(rows[0].documentId, retained.id); assert.equal(rows[0].lineId, f.lineId);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, documentId: retained.id }).length, 1);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, folderId: 'missing-folder' }).length, 0);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, folderId: retained.folderId }).length, 1); assert.equal(JSON.stringify(f.data), before);
});
test('RPR03 other actors and unrelated documents cannot expose retained records', () => {
  const f = fixture(); assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, documentId: 'unrelated' }).length, 0);
  const other = Object.keys(f.data.spaces).find(id => id !== f.actorId)!; assert(other); f.data.activeActorId = other;
  assert.equal(renderToStaticMarkup(<ProgramRecurrencePlanRecovery data={f.data} today={today} onOpenSource={() => {}} />), '');
});
test('RPR04 missing binding/document is explicit; read-only UI neither guesses a different origin nor discards history', () => {
  const f = fixture(), space = f.data.spaces[f.actorId]; space.savedBindings = [];
  assert(validateProgramData(f.data)); const before = JSON.stringify(f.data);
  const html = renderToStaticMarkup(<ProgramRecurrencePlanRecovery data={f.data} today={today} onOpenSource={() => {}} />);
  assert(html.includes('연결된 문서를 찾을 수 없습니다')); assert(html.includes('2026-10-11')); assert(!html.includes('<button')); assert.equal(JSON.stringify(f.data), before);
});

function publicFixture() {
  let data = createProgramData(); const actorId = data.activeActorId;
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '3회', startKind: 'fixed', startValue: today, time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  data.public.flows.push({ id: 'recovery-public', ownerId: 'creator-minji', currentVersionId: 'recovery-public-v1', category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'recovery-public-v1', flowId: 'recovery-public', number: 1, parentVersionId: null, title: '공개 반복 정본', summary: '',
    items: [{ id: 'recovery-series', title: '공개 계획의 지난 운동', description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] }],
    source: { kind: 'simulated-example', label: '검증 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: now });
  const doc = createProgramDocument(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'recovery-ref-doc', title: '내 참조 문서', raw: '개인 메모' }); assert(doc.ok); data = doc.data;
  const imported = importProgramPublicVersion(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'recovery-import', versionId: 'recovery-public-v1', itemIds: ['recovery-series'], anchor: null, targetDocumentId: doc.result }); assert(imported.ok); data = imported.data;
  const copy = data.spaces[actorId].copies.find(row => row.id === imported.result)!;
  const input = { actorId, flowRef: programPublicCopyExecutionRef(copy.id), localToday: today };
  const original = readProgramExecutionOccurrences(data, input); assert(original.ok); const identity = original.rows[0].identity;
  const seed = prepareProgramRecurrencePlan(data, { ...input, sourceIdentity: identity, ownerId: 'public-recovery-owner', now }); assert(seed.ok);
  const target = resolveProgramRecurrencePlanTarget(seed.value.owner, { originalDate: identity.originalDate }); assert(target.ok);
  const preview = previewProgramRecurrencePlan(seed.value.owner, { actorId, expected: seed.value.owner, currentSource: identity,
    operation: { scope: 'whole_series', targetDate: '2026-09-19', target: target.value, sourceCutover: identity, at: now } }); assert(preview.ok);
  const applied = applyProgramRecurrencePlanTransition(data, { ...input, expectedSpace: seed.value.expectedSpace, expectedOwner: null, preview: preview.value }); assert(applied.ok); data = applied.data;
  const read = readProgramExecutionOccurrences(data, input); assert(read.ok); const personal = read.rows.find(row => row.personalPlan)!; assert(personal);
  const owner = data.spaces[actorId].recurrencePlans!.owners['public-recovery-owner'];
  const recorded = updateProgramPersonalOccurrence(data, { ...input, ownerId: owner.ownerId, expectedOwner: owner, identity: personal.personalPlan!.identity, at: now,
    changes: { completion: { status: 'completed', completedAt: now }, schedule: { mode: 'fixed_date', date: '2026-10-11' } } }); assert(recorded.ok); data = recorded.data;
  const held = setProgramCopyInclusion(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'recovery-exclude', copyId: copy.id, itemId: 'recovery-series', included: false }); assert(held.ok); data = held.data;
  assert(validateProgramData(data));
  return { data, actorId, copyId: copy.id, documentId: copy.documentId, referenceId: doc.result, lineId: copy.itemLines['recovery-series'] };
}
test('RPR05 held public plan remains visible in its canonical and reference documents, with exact no-write return', () => {
  const f = publicFixture(), before = JSON.stringify(f.data);
  for (const documentId of [f.documentId, f.referenceId]) {
    const rows = programRecurrencePlanRecoveryRows(f.data, { today, documentId }); assert.equal(rows.length, 1);
    assert.equal(rows[0].documentId, f.documentId); assert.equal(rows[0].lineId, f.lineId);
    const html = renderToStaticMarkup(<ProgramRecurrencePlanRecovery data={f.data} today={today} documentId={documentId} onOpenSource={() => { throw Error('read only'); }} />);
    for (const text of ['공개 계획의 지난 운동', '2026-10-11', now, '연결된 문서의 원문 항목 보기']) assert(html.includes(text), text);
  }
  assert.equal(JSON.stringify(f.data), before);
});
test('RPR06 retained public location survives unavailable public repository and does not require a current schedule', () => {
  const f = publicFixture(); f.data.public.versions = f.data.public.versions.filter(row => row.id !== 'recovery-public-v1');
  const before = JSON.stringify(f.data), rows = programRecurrencePlanRecoveryRows(f.data, { today, documentId: f.documentId });
  assert.equal(rows.length, 1); assert.equal(rows[0].documentId, f.documentId); assert.equal(rows[0].lineId, f.lineId); assert.equal(JSON.stringify(f.data), before);
});
test('RPR07 public canonical retention follows the actual unique row and its folder, not the old copy document', () => {
  const f = publicFixture(), space = f.data.spaces[f.actorId]; space.text = M.addDocument(space.text, { title: '이전 공개 원문 보관' });
  const retained = space.text.documents.at(-1)!, original = M.getDocument(space.text, f.documentId)!;
  retained.lines = original.lines; original.lines = []; space.archivedDocumentIds.push(retained.id); space.retentionDocuments = { ...space.retentionDocuments, [original.id]: retained.id };
  const before = JSON.stringify(f.data);
  for (const documentId of [f.documentId, f.referenceId, retained.id]) {
    const rows = programRecurrencePlanRecoveryRows(f.data, { today, documentId }); assert.equal(rows.length, 1); assert.equal(rows[0].documentId, retained.id); assert.equal(rows[0].lineId, f.lineId);
  }
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, folderId: retained.folderId }).length, 1);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, folderId: 'missing-folder' }).length, 0); assert.equal(JSON.stringify(f.data), before);
});
test('RPR08 missing or ambiguous public identity never guesses a saved binding or duplicate canonical row', () => {
  for (const kind of ['missing-copy', 'foreign-flow', 'duplicate-copy', 'missing-line', 'duplicate-line'] as const) {
    const f = publicFixture(), space = f.data.spaces[f.actorId], copy = space.copies.find(row => row.id === f.copyId)!;
    if (kind === 'missing-copy') space.copies = [];
    if (kind === 'foreign-flow') copy.flowId = 'foreign-flow';
    if (kind === 'duplicate-copy') space.copies.push(programClone(copy));
    if (kind === 'missing-line') M.getDocument(space.text, f.documentId)!.lines = [];
    if (kind === 'duplicate-line') M.getDocument(space.text, f.referenceId)!.lines.push(programClone(M.getDocument(space.text, f.documentId)!.lines.find(row => row.id === f.lineId)!));
    const before = JSON.stringify(f.data), rows = programRecurrencePlanRecoveryRows(f.data, { today }); assert.equal(rows.length, 1, kind);
    assert.equal(rows[0].documentId, undefined, kind); assert.equal(rows[0].lineId, undefined, kind); assert.equal(JSON.stringify(f.data), before, kind);
  }
});
test('RPR09 foreign references and other actor spaces do not expose public plan recovery', () => {
  const f = publicFixture(), copy = f.data.spaces[f.actorId].copies.find(row => row.id === f.copyId)!;
  copy.recurrence!.references![0].itemId = 'another-item';
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, documentId: f.referenceId }).length, 0);
  assert.equal(programRecurrencePlanRecoveryRows(f.data, { today, documentId: 'unrelated' }).length, 0);
  f.data.activeActorId = 'creator-minji'; assert.equal(programRecurrencePlanRecoveryRows(f.data, { today }).length, 0);
});
