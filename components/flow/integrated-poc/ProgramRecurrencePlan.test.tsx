import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import { readProgramExecutionOccurrences } from '../../../lib/flow/integrated-poc/recurrence-state';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramRecurrencePlan as Component } from './ProgramRecurrencePlan';
import { programRecurrenceFocusId, resolveProgramRecurrencePlanFocus, type ProgramRecurrencePlanFocusRequest } from '../../../lib/flow/integrated-poc/recurrence-plan-focus';

// Actual component handlers and Program transitions. This is not a browser/IME test.
function harness() {
  const now = '2026-09-12T00:00:00.000Z', made = materializePersonalWorkspacePocAuthoring({
    handoffId: 'plan-ui', documentId: 'plan-ui-doc', revisionId: 'plan-ui-v1', committedAt: now,
    rawText: '# 반복\n- [ ] 주간 확인\n  - 날짜: 2026-09-12\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매일\n  - 반복 종료: 5회',
  });
  assert(made.ok); if (!made.ok) throw Error('fixture');
  let data = prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data;
  const read = readProgramExecutionOccurrences(data, { actorId: data.activeActorId, flowRef: made.flow.ref, localToday: '2026-09-12' });
  assert(read.ok); if (!read.ok) throw Error('fixture');
  const row = read.rows[0]; let cursor = 0, writes = 0, fail = false, pending = false, focusFailure = false, port: ProgramEditorFlush | null = null;
  const focusRequests: ProgramRecurrencePlanFocusRequest[] = [];
  const slots: any[] = [], cleanups: (() => void)[] = [];
  const hookReact = { ...React,
    useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: (fn: () => any) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; const cleanup = fn(); if (cleanup) cleanups.push(cleanup); } },
  };
  const file = new URL('./ProgramRecurrencePlan.tsx', import.meta.url), require = createRequire(file);
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} as { ProgramRecurrencePlan: typeof Component } };
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id === 'react' ? hookReact : id.endsWith('.css') ? { __esModule: true, default: {} } : require(id));
  function render() {
    cursor = 0;
    const tree = loaded.exports.ProgramRecurrencePlan({ data, row, today: '2026-09-12', onPendingChange: value => { pending = value; }, onRegisterEditors: value => { port = value; },
      onApplied: request => { if (focusFailure) throw Error('QA focus notification'); focusRequests.push(request); },
      mutate: async (_label, transition) => { if (fail) return { ok: false, reason: 'storage-unavailable' }; const result = transition(data); if (!result.ok) return result;
        if (result.changed) writes++; data = result.data; return { ok: true, result: result.result, changed: result.changed }; },
    });
    const nodes: any[] = [];
    function visit(node: any) { if (Array.isArray(node)) node.forEach(visit); else if (node && typeof node === 'object' && node.props) { nodes.push(node); visit(node.props.children); } }
    visit(tree);
    return { nodes, button: (name: string) => { const button = nodes.find(node => node.type === 'button' && node.props.children === name); assert(button, `button ${name}`); return button; },
      input: () => nodes.find(node => node.type === 'input' && node.props.type === 'date'), text: () => nodes.filter(node => node.type === 'p').map(node => node.props.children).flat().join(' ') };
  }
  return { render, get data() { return data; }, get row() { return row; }, get writes() { return writes; }, get pending() { return pending; }, get port() { return port!; },
    focusRequests, setFocusFailure: (value: boolean) => { focusFailure = value; },
    setFail: (value: boolean) => { fail = value; }, peerChange: () => { data = programClone(data); data.spaces[data.activeActorId].text.flows[0].title += ' 다른 변경'; },
    cleanup: () => cleanups.forEach(fn => fn()),
    open: () => { render().button('반복 계획 날짜 바꾸기').props.onClick(); return render(); },
  };
}

test('opening, same date, comparison, cancel and Escape never create a persisted plan', () => {
  const h = harness(), before = JSON.stringify(h.data); let view = h.open();
  assert(h.pending); assert(h.port.hasPendingInput?.()); assert.equal(h.writes, 0);
  view.button('계획 변경 비교').props.onClick(); assert(h.render().text().includes('같은 날짜'));
  view = h.render(); view.input().props.onChange({ target: { value: '2026-09-19' } }); view = h.render(); view.button('계획 변경 비교').props.onClick();
  view = h.render(); assert(view.text().includes('2026-09-19')); assert(view.text().includes('원문은 바꾸지 않습니다'));
  assert.equal(JSON.stringify(h.data), before); assert.equal(h.port.captureDrafts?.().length, 1);
  view.button('계획 변경 취소').props.onClick(); assert(!h.pending); assert(!h.port.hasPendingInput?.());
  view = h.open(); view.nodes[0].props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert(!h.pending); assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before); h.cleanup();
});

test('explicit apply commits one Program plan; source raw and original recurrence entries stay unchanged', async () => {
  const h = harness(), space = h.data.spaces[h.data.activeActorId], raw = space.legacySnapshot!.raw, entries = JSON.stringify(space.recurrenceExecution ?? null);
  let view = h.open(); view.input().props.onChange({ target: { value: '2026-09-19' } }); view = h.render(); view.button('계획 변경 비교').props.onClick();
  view = h.render(); view.button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.writes, 1); assert(!h.pending); assert.equal(h.data.spaces[h.data.activeActorId].legacySnapshot!.raw, raw);
  assert.equal(JSON.stringify(h.data.spaces[h.data.activeActorId].recurrenceExecution ?? null), entries);
  assert.equal(Object.keys(h.data.spaces[h.data.activeActorId].recurrencePlans!.owners).length, 1); h.cleanup();
});

test('plan success hands off the exact committed personal occurrence, never a guessed source row', async () => {
  const h = harness(); let view = h.open();
  assert.equal(view.input().props.autoFocus, true);
  view.input().props.onChange({ target: { value: '2026-09-19' } }); view = h.render(); view.button('계획 변경 비교').props.onClick();
  assert.equal(h.focusRequests.length, 0); h.setFail(true); h.render().button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.focusRequests.length, 0); assert.equal(h.writes, 0);
  let retryFocus = 0; h.render().button('이 반복 계획 적용').props.ref({ disabled: false, focus: () => retryFocus++ }); assert.equal(retryFocus, 1);
  h.setFail(false); h.render().button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.writes, 1); assert.equal(h.focusRequests.length, 1);
  const request = h.focusRequests[0], resolved = resolveProgramRecurrencePlanFocus(h.data, request); assert(resolved);
  assert.equal(resolved.date, '2026-09-19'); assert(resolved.key.includes(request.ownerId)); assert(resolved.key.includes('program-personal-occurrence/1'));
  assert.notEqual(programRecurrenceFocusId(resolved.key), programRecurrenceFocusId(h.row.key));
  const before = JSON.stringify(h.data);
  for (const patch of [{ actorId: 'other' }, { ownerId: 'missing' }, { operationCount: request.operationCount + 1 }, { operationAt: 'stale' }, { date: 'invalid' }]) {
    assert.equal(resolveProgramRecurrencePlanFocus(h.data, { ...request, ...patch }), null);
  }
  assert.equal(JSON.stringify(h.data), before); h.cleanup();
});

test('cancel and Escape request focus on the existing trigger without creating a plan', () => {
  const h = harness(); let focused = 0;
  h.open().button('계획 변경 취소').props.onClick();
  h.render().button('반복 계획 날짜 바꾸기').props.ref({ disabled: false, focus: () => focused++ }); assert.equal(focused, 1);
  const view = h.open(); view.nodes[0].props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  h.render().button('반복 계획 날짜 바꾸기').props.ref({ disabled: false, focus: () => focused++ }); assert.equal(focused, 2);
  assert.equal(h.writes, 0); assert.equal(h.focusRequests.length, 0); h.cleanup();
});

test('focus notification failure cannot misreport a committed plan as a failed save', async () => {
  const h = harness(); h.setFocusFailure(true); let view = h.open();
  view.input().props.onChange({ target: { value: '2026-09-19' } }); view = h.render(); view.button('계획 변경 비교').props.onClick();
  h.render().button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.writes, 1); assert.equal(h.pending, false);
  assert(!h.render().nodes.some(node => node.props.role === 'alert')); h.cleanup();
});

test('quota, lock, composition and stale peer state preserve choices without a successful mutation', async () => {
  const h = harness(); let view = h.open(); view.input().props.onChange({ target: { value: '2026-09-19' } }); view = h.render();
  view.input().props.onCompositionStart(); view.button('계획 변경 비교').props.onClick(); assert(!h.render().nodes.some(node => node.props.children === '이 반복 계획 적용'));
  view.input().props.onCompositionEnd(); view.button('계획 변경 비교').props.onClick(); view = h.render();
  const release = h.port.lockInput(); view = h.render(); view.button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); assert.equal(h.writes, 0); release();
  h.setFail(true); h.render().button('이 반복 계획 적용').props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert(h.pending); assert.equal(h.render().input().props.value, '2026-09-19'); assert.equal(h.writes, 0);
  h.setFail(false); h.peerChange(); view = h.render(); assert(view.button('이 반복 계획 적용').props.disabled); view.button('이 반복 계획 적용').props.onClick(); await Promise.resolve();
  assert.equal(h.writes, 0); assert(h.pending); assert.equal(await h.port.flushAll(), false); h.cleanup();
});
