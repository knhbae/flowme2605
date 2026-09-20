import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { importProgramPublicVersion } from '../../../lib/flow/integrated-poc/private-space';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import { ProgramPublicationRecurrence } from './ProgramPublicationRecurrence';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramCopyProposalProps } from './ProgramCopyProposal';

// Real component handlers + domain transitions, not browser/IME evidence.
function harness(checks: { id: string; title: string }[] = []) {
  let data = createProgramData(); const now = '2026-09-14T00:00:00.000Z';
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  data.public.flows.push({ id: 'ui-flow', ownerId: 'creator-minji', currentVersionId: 'ui-v1', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'ui-v1', flowId: 'ui-flow', number: 1, parentVersionId: null, title: '예시', summary: '',
    items: ['first', 'second'].map(id => ({ id, title: '가상 운동', description: '원문 설명', completionCriteria: '', sourceUrl: null, schedule: programClone(schedule), subchecks: programClone(checks) })),
    source: { kind: 'simulated-example', label: '가상 자료', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: now });
  const imported = importProgramPublicVersion(data, { actorId: 'local-user', requestId: 'ui-import', expectedSpace: data.spaces['local-user'], versionId: 'ui-v1', itemIds: ['first'], anchor: null }); assert(imported.ok); const copyId = imported.result; data = imported.data;
  let cursor = 0, port: ProgramEditorFlush | null = null, fail = false, pending = false, mutations = 0, writes = 0;
  const slots: any[] = [], cleanups: (() => void)[] = [];
  const react = { ...React, useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: (fn: () => any) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; const cleanup = fn(); if (cleanup) cleanups.push(cleanup); } } };
  const url = new URL('./ProgramCopyProposal.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} as { ProgramCopyProposal: (props: ProgramCopyProposalProps) => React.ReactNode } };
  vm.runInThisContext(`(function(module,exports,require){${code.outputText}\n})`)(loaded, loaded.exports, (id: string) => id === 'react' ? react
    : id.endsWith('.css') ? { __esModule: true, default: {} } : require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id));
  let versionId = 'ui-v1';
  function render() {
    cursor = 0; const tree = loaded.exports.ProgramCopyProposal({ data, copyId, version: data.public.versions.find(v => v.id === versionId)!, disabled: false,
      onRegisterEditors: p => { port = p; }, onPendingChange: value => { pending = value; }, mutate: async (_label, build) => {
        mutations++; if (fail) return { ok: false, reason: 'quota' }; const result = build(data);
        if (!result.ok) return { ok: false, reason: result.reason }; if (result.changed) writes++; data = result.data; return { ok: true, changed: result.changed, result: result.result };
      } });
    const nodes: any[] = [], visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { nodes.push(node); visit(node.props.children); } }; visit(tree);
    const control = (label: string) => { const node = nodes.find(n => n.type === 'label' && Array.isArray(n.props.children) && n.props.children[0] === label); assert(node, label); return node.props.children[1]; };
    return { nodes, tree, control, recurrence: () => nodes.find(n => n.type === ProgramPublicationRecurrence), form: () => nodes.find(n => n.type === 'form'),
      button: (name: string) => nodes.find(n => n.type === 'button' && n.props.children === name) };
  }
  const open = (field = 'schedule') => { render().control('원문 항목').props.onChange({ target: { value: 'first' } }); render().control('제안할 필드').props.onChange({ target: { value: field } }); return render(); };
  return { render, open, get port() { return port!; }, get pending() { return pending; }, get data() { return data; }, get writes() { return writes; }, get mutations() { return mutations; }, setFail(value: boolean) { fail = value; },
    newVersion() { const v = programClone(data.public.versions[0]); v.id = 'ui-v2'; v.number = 2; v.parentVersionId = 'ui-v1'; data.public.versions.push(v); data.public.flows[0].currentVersionId = v.id; },
    selectVersion(value: string) { versionId = value; }, cleanup() { cleanups.forEach(fn => fn()); } };
}
test('CPU01 existing recurrence initializes every source field; proposal-only copy never claims private draft persistence', () => {
  const h = harness(), view = h.open(), input: import('../../../lib/flow/integrated-poc/public-recurrence-contract').ProgramPublicationRecurrenceDraft = view.recurrence().props.value;
  assert.deepEqual(input, { version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' });
  const html = renderToStaticMarkup(<ProgramPublicationRecurrence value={{ ...input, raw: '알 수 없는 반복' }} disabled={false} styles={{}} onChange={() => {}} purpose="proposal" />);
  assert.match(html, /제안할 반복 일정/); assert.match(html, /아직 제안을 보내지 않았습니다/); assert.doesNotMatch(html, /비공개 초안에 보관합니다/); assert.equal(h.writes, 0); h.cleanup();
});
test('CPU02 edited recurring inputs lock target selection, join navigation barrier, and retain exact context in recovery', async () => {
  const h = harness(); let v = h.open(); v.recurrence().props.onChange({ ...v.recurrence().props.value, raw: '매주 수, 금' }); v = h.render();
  assert(h.pending); assert(h.port.hasPendingInput?.()); assert.equal(await h.port.flushAll(), false); assert(h.port.blocksExternalSnapshot?.(h.data, h.data));
  assert(v.control('원문 항목').props.disabled); v.control('원문 항목').props.onChange({ target: { value: 'second' } });
  assert.equal(h.render().control('원문 항목').props.value, 'first'); const recovery = JSON.parse(h.port.captureDrafts!()[0].raw);
  assert.equal(recovery.context.baseVersionId, 'ui-v1'); assert.equal(recovery.context.item.id, 'first'); assert.equal(recovery.recurrence.raw, '매주 수, 금'); assert.equal(h.writes, 0); h.cleanup();
});
test('CPU03 cancel and Escape discard only unsent input with no mutate calls', () => {
  const h = harness(); let v = h.open(); v.control('제안 이유').props.onChange({ target: { value: '취소할 입력' } }); h.render().button('제안 입력 취소').props.onClick();
  assert.equal(h.pending, false); assert.equal(h.port.captureDrafts!().length, 0);
  v = h.open(); v.control('제안 이유').props.onChange({ target: { value: 'Escape 취소' } }); h.render().form().props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault() {}, stopPropagation() {} });
  assert.equal(h.pending, false); assert.equal(h.mutations, 0); h.cleanup();
});
test('CPU04 invalid or unchanged recurrence never reaches writer and preserves input', async () => {
  const h = harness(); let v = h.open(); v.control('제안 이유').props.onChange({ target: { value: '같은 내용' } });
  v = h.render(); assert(v.button('개선 제안 보내기').props.disabled); await v.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.mutations, 0);
  v = h.render(); v.recurrence().props.onChange({ ...v.recurrence().props.value, raw: '잘못된 규칙' }); v = h.render();
  assert(v.button('개선 제안 보내기').props.disabled); await v.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.mutations, 0); assert(h.port.captureDrafts!()[0].raw.includes('잘못된 규칙')); h.cleanup();
});
test('CPU05 quota failure retains request and input; retry writes once then clears pending input', async () => {
  const h = harness(); let v = h.open(); v.recurrence().props.onChange({ ...v.recurrence().props.value, raw: '매주 수, 금' }); h.render().control('제안 이유').props.onChange({ target: { value: '실제 보완 이유' } });
  const captured = h.port.captureDrafts!()[0].raw; h.setFail(true); await h.render().form().props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes, 0); assert.equal(h.port.captureDrafts!()[0].raw, captured); h.setFail(false);
  await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 1); assert.equal(h.pending, false); assert.equal(h.data.public.proposals.length, 1);
  assert.equal(h.data.public.proposals[0].baseVersionId, 'ui-v1'); assert.equal(h.data.public.proposals[0].itemId, 'first');
  await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 1); h.cleanup();
});
test('CPU06 newer version preserves pinned proposal, unexpected selection switch blocks submit rather than rebinding', async () => {
  const h = harness(); let v = h.open(); v.recurrence().props.onChange({ ...v.recurrence().props.value, raw: '매일' }); h.render().control('제안 이유').props.onChange({ target: { value: 'old source' } });
  h.newVersion(); v = h.render(); assert.equal(v.button('개선 제안 보내기').props.disabled, false);
  h.selectVersion('ui-v2'); v = h.render(); assert(v.button('개선 제안 보내기').props.disabled); await v.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.mutations, 0);
  assert.equal(JSON.parse(h.port.captureDrafts!()[0].raw).context.baseVersionId, 'ui-v1'); h.cleanup();
});
test('CPU07 input locks and composition preserve unfinished text and block submit or Escape cancellation', async () => {
  const h = harness(); let v = h.open(); v.form().props.onCompositionStart();
  const release = h.port.lockInput(); v = h.render(); v.control('제안 이유').props.onChange({ target: { value: '조합중' } });
  v = h.render(); await v.form().props.onSubmit({ preventDefault() {} }); v.form().props.onKeyDown({ key: 'Escape', nativeEvent: { isComposing: true }, preventDefault() {}, stopPropagation() {} });
  assert.equal(h.mutations, 0); assert(h.port.captureDrafts!()[0].raw.includes('조합중')); v.form().props.onCompositionEnd(); release(); h.render().button('제안 입력 취소').props.onClick(); assert.equal(h.pending, false); h.cleanup();
});
test('CPU08 ordinary metadata still submits without changing recurring source or private records', async () => {
  const h = harness(), before = JSON.stringify(h.data.spaces), versions = JSON.stringify(h.data.public.versions);
  h.render().control('원문 항목').props.onChange({ target: { value: 'first' } }); h.render().control('제안 내용').props.onChange({ target: { value: '보완한 설명' } });
  h.render().control('제안 이유').props.onChange({ target: { value: '설명 개선' } }); await h.render().form().props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes, 1); assert.deepEqual(h.data.public.proposals[0].patch, { description: '보완한 설명' }); assert.equal(JSON.stringify(h.data.spaces), before); assert.equal(JSON.stringify(h.data.public.versions), versions); h.cleanup();
});
test('CPU09 per-row check editing, reorder, removal and explicit restore preserve IDs and pending recovery', () => {
  const h = harness([{ id: 'a', title: '동명' }, { id: 'b', title: '동명' }]); let v = h.open('subchecks');
  v.control('체크 문구 · 1').props.onChange({ target: { value: '개선 문구' } });
  h.render().nodes.find(n => n.props['aria-label'] === '체크 1 아래로').props.onClick();
  assert.deepEqual(JSON.parse(h.port.captureDrafts!()[0].raw).subchecks.map((c: any) => c.id), ['b', 'a']);
  h.render().nodes.find(n => n.props['aria-label'] === '체크 1 제안에서 제외').props.onClick();
  h.render().control('이전 체크 복원').props.onChange({ target: { value: 'b' } });
  const restored = JSON.parse(h.port.captureDrafts!()[0].raw).subchecks;
  assert.deepEqual(restored, [{ id: 'a', title: '개선 문구' }, { id: 'b', title: '동명' }]);
  assert(h.pending); assert.equal(h.writes, 0); h.render().button('제안 입력 취소').props.onClick(); assert.equal(h.pending, false); h.cleanup();
});
test('CPU10 new check has a new ID, blank submit is blocked, failure retains same request and retry submits once', async () => {
  const h = harness(); h.open('subchecks'); h.render().button('체크 추가').props.onClick();
  h.render().control('제안 이유').props.onChange({ target: { value: '빠진 확인을 보완' } });
  await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.mutations, 0);
  h.render().control('체크 문구 · 1').props.onChange({ target: { value: '추가한 확인' } });
  const captured = h.port.captureDrafts!()[0].raw, id = JSON.parse(captured).subchecks[0].id; assert(id.startsWith('proposal-check-'));
  h.setFail(true); await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 0); assert.equal(h.port.captureDrafts!()[0].raw, captured);
  h.setFail(false); await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 1);
  assert.deepEqual(h.data.public.proposals[0].patch, { subchecks: [{ id, title: '추가한 확인' }] }); assert.equal(h.pending, false); h.cleanup();
});
test('CPU11 removing all checks is an explicit empty-list proposal; lock and Escape never send it', async () => {
  const h = harness([{ id: 'a', title: '기존 확인' }]); h.open('subchecks');
  h.render().nodes.find(n => n.props['aria-label'] === '체크 1 제안에서 제외').props.onClick();
  h.render().control('제안 이유').props.onChange({ target: { value: '제외 이유' } });
  const release = h.port.lockInput(); await h.render().form().props.onSubmit({ preventDefault() {} }); assert.equal(h.mutations, 0); release();
  h.render().form().props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault() {}, stopPropagation() {} });
  assert.equal(h.mutations, 0); assert.equal(h.pending, false); h.cleanup();
});
