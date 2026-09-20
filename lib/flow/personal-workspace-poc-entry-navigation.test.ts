import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createPersonalWorkspacePocEntryNavigationMemory,
  PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_MAX_ENTRIES,
  type PersonalWorkspacePocEntryNavigationBinding,
  type PersonalWorkspacePocEntryNavigationPresentation,
} from './personal-workspace-poc-entry-navigation';

const id = (index = 1) => `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const binding = (): PersonalWorkspacePocEntryNavigationBinding => ({
  stateRaw: '{"revision":2}\r\n', sourceRaw: null, modelJson: '{"flows":[]}', draftRaw: '초안\r\n\t ', libraryRaw: null,
});
const presentation = (): PersonalWorkspacePocEntryNavigationPresentation => ({
  entryInput: '  내 검색어\r\n\t ', groupRef: 'flow-group:exact', flowRef: 'flow:copy%3A1:flow%3A1', panel: 'preview',
  preview: { owner: 'personal-copy', resultView: 'sheet', baseDate: '2026-09-06', selectedDate: '2026-09-07', openItemRef: 'item:copy%3A1:flow%3A1:same' },
  scroll: { documentY: 150.25, inputY: 0, resultY: 333.75 }, focus: 'workspace-link',
});

test('NAV01 capture and repeated restore preserve every exact string, date, fractional scroll and selection', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding(), p = presentation(), before = JSON.stringify({ b, p });
  assert.equal(memory.capture({ id: id(), binding: b, presentation: p }), true);
  assert.deepEqual(memory.restore(id(), b), p); assert.deepEqual(memory.restore(id(), b), p);
  assert.equal(JSON.stringify({ b, p }), before); assert.equal(Object.isFrozen(b), false); assert.equal(Object.isFrozen(p.preview), false);
});

test('NAV02 captured and restored clones are independent, deeply frozen and retain optional absence', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory();
  const b = binding(), p: PersonalWorkspacePocEntryNavigationPresentation = {
    entryInput: '', panel: 'list', preview: { owner: 'source', resultView: 'text' },
    scroll: { documentY: 0, inputY: 0, resultY: 0 }, focus: 'input',
  };
  assert.equal(memory.capture({ id: id(), binding: b, presentation: p }), true);
  const restored = memory.restore(id(), b)!; assert.deepEqual(restored, p);
  assert.notEqual(restored, p); assert.notEqual(restored.preview, p.preview);
  assert.equal(Object.isFrozen(restored), true); assert.equal(Object.isFrozen(restored.preview), true); assert.equal(Object.isFrozen(restored.scroll), true);
  assert.equal(Object.hasOwn(restored, 'groupRef'), false); assert.equal(Object.hasOwn(restored.preview, 'baseDate'), false);
  assert.equal(Reflect.set(restored, 'entryInput', '오염'), false); assert.equal(Reflect.set(restored.scroll, 'resultY', 99), false);
  assert.equal(Reflect.set(p, 'entryInput', '이후 입력'), true);
  assert.equal(memory.restore(id(), b)!.entryInput, '');
  const second = memory.restore(id(), b)!; assert.notEqual(second, restored); assert.notEqual(second.preview, restored.preview);
});

test('NAV03 each of the five binding strings matches byte-for-byte and a mismatch permanently discards that ticket', () => {
  for (const key of ['stateRaw', 'sourceRaw', 'modelJson', 'draftRaw', 'libraryRaw'] as const) {
    const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
    assert.equal(memory.capture({ id: id(), binding: b, presentation: presentation() }), true);
    assert.equal(memory.capture({ id: id(2), binding: b, presentation: presentation() }), true);
    const changed = { ...b, [key]: b[key] === null ? '' : `${b[key]} ` };
    assert.equal(memory.restore(id(), changed), undefined, key);
    assert.equal(memory.restore(id(), b), undefined, `${key}: old bytes cannot revive the ticket`);
    assert.ok(memory.restore(id(2), b), 'unrelated ticket survives');
  }
});

test('NAV04 observed A to B to A invalidation clears all tickets without guessing equality-based freshness', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  memory.capture({ id: id(), binding: b, presentation: presentation() });
  memory.capture({ id: id(2), binding: { ...b, sourceRaw: 'B' }, presentation: presentation() });
  memory.invalidate();
  assert.equal(memory.restore(id(), b), undefined); assert.equal(memory.restore(id(2), { ...b, sourceRaw: 'B' }), undefined);
  memory.invalidate(); assert.equal(memory.capture({ id: id(3), binding: b, presentation: presentation() }), true);
  assert.ok(memory.restore(id(3), b), 'only a new explicit capture may restore after invalidation');
});

test('NAV05 independent factories never share captured records and discard affects only one UUID', () => {
  const first = createPersonalWorkspacePocEntryNavigationMemory(), second = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  first.capture({ id: id(), binding: b, presentation: presentation() }); first.capture({ id: id(2), binding: b, presentation: presentation() });
  assert.equal(second.restore(id(), b), undefined); first.discard(id()); assert.equal(first.restore(id(), b), undefined);
  assert.ok(first.restore(id(2), b)); first.discard('not-a-uuid'); assert.ok(first.restore(id(2), b));
});

test('NAV06 the ninth capture evicts the oldest capture, not the most recently restored ticket', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_MAX_ENTRIES, 8);
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  for (let n = 1; n <= 8; n++) assert.equal(memory.capture({ id: id(n), binding: b, presentation: presentation() }), true);
  assert.ok(memory.restore(id(1), b)); memory.capture({ id: id(9), binding: b, presentation: presentation() });
  assert.equal(memory.restore(id(1), b), undefined); for (let n = 2; n <= 9; n++) assert.ok(memory.restore(id(n), b));
});

test('NAV07 valid same-ID recapture replaces values and becomes the newest capture without adding a ninth record', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  for (let n = 1; n <= 8; n++) memory.capture({ id: id(n), binding: b, presentation: presentation() });
  const changed = { ...presentation(), entryInput: '다시 찾기' };
  assert.equal(memory.capture({ id: id(1), binding: b, presentation: changed }), true);
  memory.capture({ id: id(9), binding: b, presentation: presentation() });
  assert.equal(memory.restore(id(2), b), undefined); assert.deepEqual(memory.restore(id(1), b), changed);
  for (let n = 3; n <= 9; n++) assert.ok(memory.restore(id(n), b));
});

test('NAV08 malformed UUIDs cannot capture or restore and UUID case remains exact identity', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  for (const wrong of ['', 'entry-1', id().replaceAll('-', ''), ` ${id()}`, `${id()}\n`, '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-9000-8000-000000000001', 'a0000000-0000-4000-1000-000000000001', 'g0000000-0000-4000-8000-000000000001']) {
    assert.equal(memory.capture({ id: wrong, binding: b, presentation: presentation() }), false, wrong); assert.equal(memory.restore(wrong, b), undefined);
  }
  const uppercase = id().toUpperCase(); assert.equal(memory.capture({ id: uppercase, binding: b, presentation: presentation() }), true);
  assert.ok(memory.restore(uppercase, b)); assert.equal(memory.restore(id(), b), undefined);
});

test('NAV09 strict binding rejects missing, extra, undefined and non-string fields and invalid restore discards only its ticket', () => {
  const variants: unknown[] = [null, [], { ...binding(), stateRaw: undefined }, { ...binding(), modelJson: null },
    { ...binding(), draftRaw: 0 }, { ...binding(), authority: true }];
  const missing = { ...binding() } as Record<string, unknown>; delete missing.libraryRaw; variants.push(missing);
  for (const candidate of variants) {
    const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
    assert.equal(memory.capture({ id: id(), binding: candidate as PersonalWorkspacePocEntryNavigationBinding, presentation: presentation() }), false);
    memory.capture({ id: id(), binding: b, presentation: presentation() });
    assert.equal(memory.restore(id(), candidate as PersonalWorkspacePocEntryNavigationBinding), undefined);
    assert.equal(memory.restore(id(), b), undefined);
  }
});

test('NAV10 group and Flow refs must coexist, and preview requires both without accepting blank or undefined refs', () => {
  const p = presentation(), bad: unknown[] = [{ ...p, groupRef: undefined }, { ...p, flowRef: undefined },
    { ...p, groupRef: '' }, { ...p, flowRef: ' \t ' }];
  const missingGroup = { ...p } as Record<string, unknown>; delete missingGroup.groupRef; bad.push(missingGroup);
  const missingPair = { ...p } as Record<string, unknown>; delete missingPair.groupRef; delete missingPair.flowRef; bad.push(missingPair);
  for (const candidate of bad) assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(),
    presentation: candidate as PersonalWorkspacePocEntryNavigationPresentation }), false);
  const list = { ...missingPair, panel: 'list' } as PersonalWorkspacePocEntryNavigationPresentation;
  assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(), presentation: list }), true);
});

test('NAV11 actual date validation preserves leap days but rejects impossible dates and explicit undefined optionals', () => {
  for (const bad of ['2026-02-29', '2026-09-31', '2026-9-6', '2026-09-06T00:00:00Z', '', undefined]) {
    for (const key of ['baseDate', 'selectedDate']) {
      const p = { ...presentation(), preview: { ...presentation().preview, [key]: bad } };
      assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(), presentation: p as PersonalWorkspacePocEntryNavigationPresentation }), false);
    }
  }
  const p = { ...presentation(), preview: { ...presentation().preview, baseDate: '2024-02-29', selectedDate: '2024-03-01' } };
  assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(), presentation: p }), true);
});

test('NAV12 finite nonnegative offsets, exact enums and data-only known fields are mandatory', () => {
  const p = presentation();
  for (const value of [-1, NaN, Infinity, -Infinity, '0', null]) for (const key of ['documentY', 'inputY', 'resultY']) {
    assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(),
      presentation: { ...p, scroll: { ...p.scroll, [key]: value } } as PersonalWorkspacePocEntryNavigationPresentation }), false);
  }
  for (const bad of [{ ...p, panel: 'editor' }, { ...p, focus: 'arbitrary' }, { ...p, extra: true },
    { ...p, preview: { ...p.preview, owner: 'shared-source' } }, { ...p, preview: { ...p.preview, resultView: 'txt' } },
    { ...p, preview: { ...p.preview, openItemRef: ' ' } }, { ...p, scroll: { ...p.scroll, horizontal: 2 } }]) {
    assert.equal(createPersonalWorkspacePocEntryNavigationMemory().capture({ id: id(), binding: binding(), presentation: bad as PersonalWorkspacePocEntryNavigationPresentation }), false);
  }
});

test('NAV13 accessors, hidden and symbol keys, prototype objects, cycles and revoked proxies fail closed without getter calls', () => {
  let reads = 0;
  const original = { id: id(), binding: binding(), presentation: presentation() };
  const accessor = { ...original, presentation: Object.defineProperty({ ...presentation() }, 'entryInput', { enumerable: true, get() { reads++; return 'bad'; } }) };
  const hidden = Object.defineProperty({ ...original }, 'secret', { enumerable: false, value: true });
  const symbol = { ...original, [Symbol('hidden')]: true };
  const inherited = Object.create(original);
  const cyclical = { ...original } as Record<string, unknown>; cyclical.self = cyclical;
  const toJson = { ...original, toJSON() { reads++; return original; } };
  const revoked = Proxy.revocable(original, {}); revoked.revoke();
  for (const bad of [accessor, hidden, symbol, inherited, cyclical, toJson, revoked.proxy]) {
    const memory = createPersonalWorkspacePocEntryNavigationMemory();
    assert.doesNotThrow(() => assert.equal(memory.capture(bad as typeof original), false));
  }
  const getterBinding = Object.defineProperty({ ...binding() }, 'stateRaw', { enumerable: true, get() { reads++; return 'bad'; } });
  const memory = createPersonalWorkspacePocEntryNavigationMemory(); memory.capture(original);
  assert.equal(memory.restore(id(), getterBinding), undefined); assert.equal(memory.restore(id(), binding()), undefined);
  assert.equal(reads, 0);
});

test('NAV14 a rejected recapture leaves previous successful bytes untouched and does not consume capacity', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding(), p = presentation();
  memory.capture({ id: id(), binding: b, presentation: p });
  assert.equal(memory.capture({ id: id(), binding: b, presentation: { ...p, focus: 'bad' } as unknown as PersonalWorkspacePocEntryNavigationPresentation }), false);
  assert.deepEqual(memory.restore(id(), b), p);
  for (let n = 2; n <= 8; n++) memory.capture({ id: id(n), binding: b, presentation: p });
  assert.ok(memory.restore(id(), b));
});

test('NAV15 all four view modes and both owners restore full presentation without granting membership authority', () => {
  for (const owner of ['source', 'personal-copy'] as const) for (const resultView of ['text', 'todo', 'calendar', 'sheet'] as const) {
    const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = { ...binding(), modelJson: 'opaque exact bytes, not a validator' };
    const p = { ...presentation(), flowRef: 'caller-validated-flow-ref', preview: { ...presentation().preview, owner, resultView } };
    assert.equal(memory.capture({ id: id(), binding: b, presentation: p }), true);
    const restored = memory.restore(id(), b)!; assert.deepEqual(restored, p);
    assert.deepEqual(Object.keys(restored).sort(), ['entryInput', 'flowRef', 'focus', 'groupRef', 'panel', 'preview', 'scroll']);
  }
});

test('NAV16 factory and operations use no storage, browser, network, random source or current clock', () => {
  const previousFetch = globalThis.fetch, previousNow = Date.now, previousRandom = Math.random;
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let io = 0;
  globalThis.fetch = (() => { io++; throw new Error('network'); }) as typeof fetch;
  Date.now = () => { io++; throw new Error('clock'); }; Math.random = () => { io++; throw new Error('random'); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { io++; throw new Error('storage'); } });
  try {
    const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
    assert.ok(memory.capture({ id: id(), binding: b, presentation: presentation() })); assert.ok(memory.restore(id(), b));
    memory.discard(id()); memory.invalidate(); assert.equal(io, 0);
  } finally {
    globalThis.fetch = previousFetch; Date.now = previousNow; Math.random = previousRandom;
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  const source = readFileSync(path.resolve('lib/flow/personal-workspace-poc-entry-navigation.ts'), 'utf8');
  assert.doesNotMatch(source, /\b(?:window|document|localStorage|sessionStorage|fetch)\s*[.(]/u);
  assert.doesNotMatch(source, /(?:Date\.now|Math\.random|crypto\.randomUUID|new Date\s*\(\s*\))/u);
});

test('NAV17 optional list-return scroll is distinct from preview scroll, cloned and frozen while absence remains absent', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding();
  const p = { ...presentation(), listReturn: { documentY: 700.75, inputY: 51.25 } };
  assert.equal(memory.capture({ id: id(), binding: b, presentation: p }), true);
  p.listReturn.documentY = 900;
  const restored = memory.restore(id(), b)!;
  assert.deepEqual(restored.listReturn, { documentY: 700.75, inputY: 51.25 });
  assert.deepEqual(restored.scroll, presentation().scroll, 'departure preview scroll is not overwritten by list-return values');
  assert.equal(Object.isFrozen(restored.listReturn), true);
  assert.equal(Reflect.set(restored.listReturn!, 'inputY', 99), false);
  assert.notEqual(memory.restore(id(), b)!.listReturn, restored.listReturn);
  assert.equal(memory.capture({ id: id(2), binding: b, presentation: presentation() }), true);
  assert.equal(Object.hasOwn(memory.restore(id(2), b)!, 'listReturn'), false);
});

test('NAV18 malformed list-return values cannot replace a valid capture or invoke getters', () => {
  const memory = createPersonalWorkspacePocEntryNavigationMemory(), b = binding(), p = presentation();
  assert.equal(memory.capture({ id: id(), binding: b, presentation: p }), true);
  let calls = 0;
  const accessor = Object.defineProperty({ inputY: 0 }, 'documentY', { enumerable: true, get() { calls++; return 0; } });
  for (const listReturn of [undefined, null, [], {}, { documentY: 0 }, { inputY: 0 }, { documentY: -1, inputY: 0 },
    { documentY: 0, inputY: NaN }, { documentY: Infinity, inputY: 0 }, { documentY: 0, inputY: '0' },
    { documentY: 0, inputY: 0, resultY: 2 }, accessor]) {
    const candidate = { ...p, listReturn } as unknown as PersonalWorkspacePocEntryNavigationPresentation;
    assert.equal(memory.capture({ id: id(), binding: b, presentation: candidate }), false);
    assert.deepEqual(memory.restore(id(), b), p);
  }
  assert.equal(calls, 0);
});
