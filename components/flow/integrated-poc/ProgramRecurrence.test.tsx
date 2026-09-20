import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import type { ProgramRecurrence as Component, programRecurrenceComparison as Compare } from './ProgramRecurrence';
import type { ProgramOccurrenceIdentity } from '../../../lib/flow/integrated-poc/recurrence-state-contract';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import type { ProgramSpace as SpaceComponent } from './ProgramSpace';
const url = new URL('./ProgramRecurrence.tsx', import.meta.url), source = readFileSync(url, 'utf8'), require = createRequire(url);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as { ProgramRecurrence: typeof Component; programRecurrenceComparison: typeof Compare } };
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id === './ProgramRecurrencePlan' ? { ProgramRecurrencePlan: () => null } : id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(id));
test('public recovery comparison renders the pinned version and explicit missing facts without an inferred personal date', () => {
  const identity = { publicOwner: {}, sourceRule: { startDate: '2026-12-03', recurrence: '매주 화, 목', recurrenceEnd: '8회' } } as ProgramOccurrenceIdentity;
  const result = loaded.exports.programRecurrenceComparison(identity, undefined, { publicVersion: { number: 1 }, item: { title: '원래 운동' }, context: { attributes: { date: '시작 미정', time: '07:00', timeZone: 'Asia/Seoul' } } });
  assert.equal(result.find(row => row.label === '일정 기준 공개 판본')?.value, 'v1');
  assert.equal(result.find(row => row.label === '제목')?.value, '원래 운동');
  assert.equal(result.find(row => row.label === '원문 날짜')?.value, '시작 미정');
  assert(loaded.exports.programRecurrenceComparison(identity, undefined, { unavailable: true }).every(row => row.value === '원본 확인 불가'));
});

test('public recovery uses exact current item facts independently of occurrence reconnection permission', () => {
  assert(source.includes('review?.currentSourceFacts'));
  assert(source.includes('programOccurrenceSourceFacts(review.stored, data.public)'));
  assert(source.includes('disabled={!review.canReconnect'));
  assert(source.includes('JSON.stringify(currentFacts, null, 2)'));
});

test('real recurrence SSR displays bounded occurrence identity, not an ordinary task or editor wrapper', () => {
  const now = '2026-09-12T00:00:00.000Z';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'ui-ssr-repeat', documentId: 'ui-ssr-doc', revisionId: 'ui-ssr-v1', committedAt: now, rawText: '# 반복\n- [ ] 반복할 일\n  - 날짜: 2026-09-12\n  - 반복: 매일\n  - 반복 종료: 60회' });
  assert(made.ok); if (!made.ok) return;
  const data = prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data; let mutations = 0;
  const html = renderToStaticMarkup(<loaded.exports.ProgramRecurrence data={data} mutate={async () => { mutations++; return { ok: false, reason: 'invalid' }; }} today="2026-09-12" period="documents" date="2026-09-12" documentId={data.spaces[data.activeActorId].text.flows[0].id} onOpenSource={() => {}} onUndo={async () => {}} onRedo={async () => {}} />);
  assert(html.includes('반복 규칙과 개별 회차')); assert(html.includes('반복할 일')); assert(html.includes('1회차')); assert(html.includes('다음 회차')); assert(html.includes('반복 종료가 아닙니다'));
  assert.equal(mutations, 0); assert(!html.includes('일반 할 일'));
});
test('occurrence UI writes only its dedicated CAS transition; Space merges both target kinds by effective date', () => {
  assert(source.includes('programOccurrenceWindowFor(row.identity)')); assert(source.includes('expected: row.stored')); assert(!source.includes('M.toggle')); assert(!source.includes('recordProgramTaskProgress'));
  const space = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
  assert(space.includes("entry.kind === 'occurrence'")); assert(space.includes('executionRows.map')); assert(space.includes('programPreservesSeriesMetadata(before, merged)'));
  const validation = /validateWorkspace=\{next => ([^\n]+?)\}/.exec(space)?.[1];
  assert(validation, 'the editor validates the proposed workspace before dispatch');
  for (const guard of ['programPreservesSeriesMetadata', 'programPreservesLegacyQualityHold', 'programPreservesLegacyPlanExcluded', 'programPreservesLockedDocumentContent']) {
    assert(validation.split(' && ').includes(`${guard}(space, next)`), `${guard} remains a required editor guard`);
    assert(space.includes(`${guard}(before, merged)`), `${guard} is rechecked against the fresh commit state`);
  }
});
test('Space explicit missing document is not an empty workspace or an automatic replacement', () => {
  const file = new URL('./ProgramSpace.tsx', import.meta.url), code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const module = { exports: {} as { ProgramSpace: typeof SpaceComponent } }, root = resolve(dirname(fileURLToPath(file)), '../../..');
  vm.runInThisContext(`(function(module,exports,require){${code.outputText}\n})`)(module, module.exports, (id: string) => {
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === './ProgramTextEditor') return { ProgramTextEditor: () => null };
    if (id === './ProgramDocumentProvenance') return { ProgramDocumentProvenance: () => null };
    if (id === './ProgramRecurrence') return loaded.exports;
    if (id === './ProgramOutputReturn') return { ProgramOutputReturn: () => null }; // Covered by its exact-target tests and browser return scenario.
    if (id === './ProgramTaskDocumentMove' || id === './ProgramDocumentTrash' || id === './ProgramRecurrencePlanRecovery') {
      const child = { exports: {} }, childCode = ts.transpileModule(readFileSync(new URL(`${id}.tsx`, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
      vm.runInThisContext(`(function(module,exports,require){${childCode.outputText}\n})`)(child, child.exports, (dependency: string) => dependency.endsWith('.css') ? { __esModule: true, default: {} } : require(dependency.startsWith('@/') ? resolve(root, dependency.slice(2)) : dependency));
      return child.exports;
    }
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  });
  const html = renderToStaticMarkup(<module.exports.ProgramSpace data={createProgramData()} mutate={async () => ({ ok: false, reason: 'invalid' })} navigate={() => {}} today="2026-09-12" selectedDocumentId="missing-doc" onUndo={async () => {}} onRedo={async () => {}} onPublishDocument={() => {}} onInspectCopy={() => {}} onRevisionHistory={() => {}} />);
  assert(html.includes('문서를 찾을 수 없습니다')); assert(html.includes('보관함 확인')); assert(!html.includes('필요한 내용을 먼저 적으세요'));
});
