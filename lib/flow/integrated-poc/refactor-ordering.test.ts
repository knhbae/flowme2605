import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramData, createProgramEnvelope } from './program-data';
import { programClone } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramTextDraft } from './program-text-draft';
import { programTextTransition } from './program-text-transition';
import { captureAlphaAccount } from './alpha-persistence/program-adapter';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { createAlphaLocalRecovery, createAlphaMemoryRecovery } from './alpha-persistence/local-recovery';
import { isAccountForOwner } from './alpha-auth/account-access';
import { createAlphaSyncController } from './alpha-sync/controller';
import type { AlphaRepository } from './alpha-persistence/contract';
import { createAlphaUiRecovery } from './alpha-ui-recovery';
import { alphaUiRecoveryDocumentDrafts, captureAlphaUiRecoveryDocuments, clearConfirmedAlphaUiRecoveryDocuments, createAlphaUiRecoveryDocuments, parkAlphaUiRecoveryDocuments } from './alpha-ui-recovery-document';
import { applyProgramTextCleanup, programCleanupArchive, programTextCleanupPlan, restoreProgramTextCleanup } from './text-cleanup';
import { programDateLineDefaults } from './date-property-migration';
import { createProgramDocumentInput } from './program-document-input';
import { createWritingCompute } from './writing-compute';
import { computeWriting } from './writing-compute.worker';
import { claimOwnedWritingAck } from './writing-ack';

const OWNER = '11111111-1111-4111-8111-111111111111';
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
function fixture(raw = '[2026-11-14]\n- [ ] 합성 입력\n  - 메모: 보존') {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  space.text = M.addDocument(M.addDocument(space.text, { title: '합성 A' }), { title: '합성 B' });
  const a = space.text.documents.find(doc => doc.title === '합성 A')!.id, b = space.text.documents.find(doc => doc.title === '합성 B')!.id;
  space.text = M.editText(M.editText(space.text, a, raw), b, '- [ ] 다른 문서 그대로');
  data.actors = [{ id: OWNER, name: '합성', simulated: true }]; data.spaces = { [OWNER]: space }; data.activeActorId = OWNER;
  const seed = captureAlphaAccount(createProgramEnvelope(data), OWNER, OWNER), server = createAlphaFakeServer([seed]);
  const port = server.connect(server.issueSession(OWNER));
  return { a, b, seed, port, account: () => server.exportForBackup(OWNER).account };
}
const rawOf = (text: Parameters<typeof M.getDocument>[0], id: string) => M.raw(M.getDocument(text, id));

// These tests connect the real draft, sync controller, command adapter, in-memory server,
// receipt lookup, recovery codec and inverse. No network, database or replacement model.
for (const owned of [false, true]) for (const lost of [false, true]) test(`W-SAVE connected ACK overlaps newer input without cleaning it (owned=${owned}, lost=${lost})`, async () => {
  const s = fixture(), started = deferred(), release = deferred(), events: string[] = [];
  let writes = 0, requestIds: string[] = [];
  const repository: AlphaRepository = { ...s.port, references: () => s.seed.references,
    execute: async command => {
      writes++; requestIds.push(command.requestId); const reply = await s.port.execute(command); events.push('server-commit');
      if (writes === 1 && !lost) { started.resolve(); await release.promise; events.push('receipt-return'); }
      return writes === 1 && lost ? { ok: false, reason: 'unavailable' } : reply;
    }, lookup: async id => { events.push('lookup-start'); started.resolve(); await release.promise; events.push('lookup-return'); return s.port.lookup(id); } };
  const listeners: ((event: MessageEvent) => void)[] = [];
  const compute = owned ? createWritingCompute(() => ({
    postMessage(message: { identity: Parameters<typeof computeWriting>[0]; payload: Parameters<typeof computeWriting>[1] }) {
      const submitted = structuredClone(message); events.push(`worker-${submitted.payload.kind}-post`);
      queueMicrotask(() => { const reply = structuredClone(computeWriting(submitted.identity, submitted.payload));
        events.push(`worker-${submitted.payload.kind}-reply`); for (const listen of listeners) listen({ data: reply } as MessageEvent); });
    }, addEventListener(type: string, listen: (event: MessageEvent) => void) { if (type === 'message') listeners.push(listen); }, terminate() {},
  }) as unknown as Worker) : undefined;
  let serial = 0, claims = 0, accept: ((snapshot: ReturnType<ReturnType<typeof createAlphaSyncController>['snapshot']>) => void) | undefined;
  const local = new Map<string, string>();
  const recoveryStorage = { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => { local.set(key, value); },
    removeItem: (key: string) => { local.delete(key); } };
  const recovery = compute ? createAlphaLocalRecovery(recoveryStorage, isAccountForOwner, { compact: true, writingCompute: compute }) : createAlphaMemoryRecovery();
  const sync = createAlphaSyncController({ recovery, requestId: () => `connected-${++serial}`,
    writingCompute: compute, onChange: snapshot => accept?.(snapshot) });
  try {
    sync.bindSession(OWNER, repository); assert(await sync.refresh());
    const frame = sync.snapshot();
    const input = owned ? createProgramDocumentInput(frame.account!.space.text, s.a) : undefined;
    const initial = input?.initial ?? frame.account!.space.text, other = rawOf(initial, s.b);
    const reported: { raw: string; dirty: boolean; saving: boolean }[] = [];
    const draft = createProgramTextDraft(initial, s.a, async (next, label, options) => {
      const result = await sync.mutate(label, current => programTextTransition(current, {
        actorId: OWNER, documentId: s.a, expected: options!.expectedWorkspace!, next,
      }), owned ? { alphaWriting: { documentId: s.a, expected: options!.expectedWorkspace!, next,
        workingGeneration: options!.writingGeneration! } } : undefined); return result.ok;
    }, state => { reported.push({ raw: state.raw, dirty: state.dirty, saving: state.saving });
      if (!state.dirty && !state.saving) assert.equal(state.raw, rawOf(s.account().space.text, s.a)); }, () => true, input, owned);
    let previous = frame, displayed = frame.envelope!.data;
    accept = snapshot => {
      const proof = snapshot.ownWritingAck;
      if (owned && proof && snapshot.envelope && claimOwnedWritingAck(proof, OWNER, displayed, snapshot.envelope.data, previous.pending, snapshot.lastReceipt)) {
        claims++; events.push('owned-host-claim');
        assert(draft.acceptConfirmedSave(proof.input.expected, proof.input.next, proof));
      }
      if (!snapshot.pending && snapshot.envelope) displayed = snapshot.envelope.data;
      previous = snapshot;
    };
    const first = rawOf(initial, s.a) + ' 첫째', latest = first + ' 둘째';
    assert(draft.updateRaw(first)); const saving = draft.save(); await started.promise;
    assert.equal(draft.getState().saving, true); assert(draft.updateRaw(latest)); events.push('newer-input');
    assert.equal(rawOf(s.account().space.text, s.a), first); assert.equal(rawOf(s.account().space.text, s.b), other);
    assert.equal(writes, 1, 'the ambiguous first write is confirmed by lookup, never written twice');
    release.resolve(); assert(await saving); events.push('save-return');
    assert.equal(draft.getState().raw, latest);
    assert(reported.some(state => state.raw === latest && state.dirty && !state.saving), 'first ACK leaves newer input dirty before the same flush saves it');
    assert(events.indexOf('newer-input') < events.indexOf(lost ? 'lookup-return' : 'receipt-return'));
    assert(await draft.save()); assert.equal(writes, 2, 'one flush loops to the newer input; another save is a no-op'); assert.equal(new Set(requestIds).size, 2);
    assert.equal(rawOf(s.account().space.text, s.a), latest); assert.equal(draft.getState().dirty, false);
    if (owned) { assert(claims >= 1, 'a real immutable owned ACK is claimed and consumed by the draft'); assert(events.includes('worker-save-reply')); }
    assert((await sync.undo()).ok); assert.equal(rawOf(s.account().space.text, s.a), first);
    assert((await sync.redo()).ok); assert.equal(rawOf(s.account().space.text, s.a), latest);
    assert.equal(rawOf(s.account().space.text, s.b), other);
  } finally { accept = undefined; release.resolve(); sync.dispose(); compute?.dispose(); }
});

for (const quota of [false, true]) test(`W-SAVE recovery keeps newer whole RAW through an older confirmed ACK (quota=${quota})`, () => {
  const s = fixture(), old = rawOf(s.account().space.text, s.a), latest = old + '\n- [\n미저장 조합 가';
  const values = new Map<string, string>(); let fail = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (fail) throw Error('synthetic-quota'); values.set(key, value); },
    removeItem: (key: string) => { if (fail) throw Error('synthetic-quota'); values.delete(key); } };
  const port = createAlphaUiRecovery(storage, { ownerId: OWNER, slotId: 'connected-tab' }); assert(port.read().ok);
  let state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), [
    { documentId: s.a, title: '합성 A', raw: latest }, { documentId: s.b, title: '합성 B', raw: rawOf(s.account().space.text, s.b) },
  ]);
  assert(port.save(alphaUiRecoveryDocumentDrafts(state)).ok); state = parkAlphaUiRecoveryDocuments(state);
  const before = storage.getItem(port.key); fail = quota;
  const cleared = clearConfirmedAlphaUiRecoveryDocuments(port, state, id => rawOf(s.account().space.text, id));
  if (quota) { assert.equal(cleared.ok, false); assert.equal(storage.getItem(port.key), before); }
  else { assert(cleared.ok); const kept = port.read(); assert(kept.ok); assert.equal(kept.value!.drafts.length, 1); assert.equal(kept.value!.drafts[0].raw, latest); }
  fail = false; const reopened = createAlphaUiRecovery(storage, { ownerId: OWNER, slotId: 'connected-tab' }).read();
  assert(reopened.ok); assert(reopened.value!.drafts.some(entry => entry.documentId === s.a && entry.raw === latest));
});

test('W-TXT transition connects save, archived original, reopen, restore and guarded inverse', async () => {
  const s = fixture('[2026-11-14]\n- [ ] 합성 일정\n  - 날짜: 2026-11-16\n  - 메모: 그대로');
  const open = async () => { const c = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() }); c.bindSession(OWNER, { ...s.port, references: () => s.seed.references }); assert(await c.refresh()); return c; };
  const initial = s.account().space.text, initialRaw = rawOf(initial, s.a), initialOther = rawOf(initial, s.b);
  let sync = await open();
  try {
    const plan = programTextCleanupPlan(sync.snapshot().account!.space)!; assert(plan);
    const moved = await sync.mutate('합성 전환', current => applyProgramTextCleanup(current, {
      actorId: OWNER, requestId: 'connected-conversion', expectedSpace: current.spaces[OWNER], plan,
      choices: programDateLineDefaults(plan.dates), when: '2026-11-14 23:00',
    })); assert(moved.ok);
    const stamp = moved.result, archives = programCleanupArchive(s.account().space.text, stamp);
    assert.equal(archives.length, 1); assert.equal(archives[0].raw, initialRaw);
    const converted = s.account().space.text; assert.notEqual(rawOf(converted, s.a), initialRaw);
    assert((await sync.undo()).ok); assert(programSame(s.account().space.text, initial), 'one receipt-backed inverse restores RAW, IDs, records and scopes');
    assert((await sync.redo()).ok); sync.dispose(); sync = await open();
    const restored = await sync.mutate('보관 글로 복원', current => restoreProgramTextCleanup(current, {
      actorId: OWNER, requestId: 'connected-restore', expectedSpace: current.spaces[OWNER], stamp,
    })); assert(restored.ok); assert.equal(rawOf(s.account().space.text, s.a), initialRaw);
    assert.equal(rawOf(s.account().space.text, s.b), initialOther);
    assert((await sync.undo()).ok);
    const changed = await sync.mutate('후속 편집', current => { const next = programClone(current); next.spaces[OWNER].text = M.editText(next.spaces[OWNER].text, s.a, rawOf(next.spaces[OWNER].text, s.a) + '\n사용자 추가'); return { ok: true, changed: true, data: next, result: s.a }; });
    assert(changed.ok); const beforeRefusal = s.account();
    const rejected = await sync.mutate('늦은 보관 복원', current => restoreProgramTextCleanup(current, {
      actorId: OWNER, requestId: 'connected-stale-restore', expectedSpace: current.spaces[OWNER], stamp,
    })); assert.equal(rejected.ok, false); assert.deepEqual(s.account(), beforeRefusal);
  } finally { sync.dispose(); }
});

test('no folder notice: actual freshNoticeHolds returns before geometry and row parsing', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let expression = '';
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'freshNoticeHolds') expression = node.getText(tree); ts.forEachChild(node, visit); }; visit(tree); assert(expression);
  const code = ts.transpileModule(expression, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const operation of [null, { id: 'op', lineId: null }, { id: 'op', lineId: 'line' }]) {
    let geometry = 0, parses = 0;
    const run = new Function('draftRef', 'textArea', 'propsRef', 'folderNoticeRef', 'hostRef', 'textEditorRows', code + ';return freshNoticeHolds();');
    const result = run({ current: { folderOperation: () => operation } }, () => ({}), { current: {} }, { current: null },
      { current: { getClientRects: () => { geometry++; throw Error('unexpected-layout'); } } }, () => { parses++; throw Error('unexpected-parse'); });
    assert.equal(result, false); assert.equal(geometry, 0); assert.equal(parses, 0);
  }
});
