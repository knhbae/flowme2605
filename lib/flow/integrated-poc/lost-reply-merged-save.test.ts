import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { mergeProgramTextWorkspace } from './text-merge';
import { privateTextChangeIsolatedToDocument } from './writing-ack';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Codex review of fdaaa9e1 (P2): another device saved document B, this tab took that as its base (T1)
// while document A was still being typed against T0, A's save was merged onto T1 and applied once,
// and only the reply was lost. "다시 확인" then confirmed T2, but the editor refused the confirmation
// because it compared against T0 exactly, so the host showed the external-change warning.

function workspace() {
  const empty = { version: 11, documents: [], folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], flows: [],
    bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  let t = M.addDocument(M.addDocument(empty, { title: '문서 A' }), { title: '문서 B' });
  const A = t.documents.find(d => d.title === '문서 A')!.id, B = t.documents.find(d => d.title === '문서 B')!.id;
  t = M.editText(M.editText(t, A, '첫 줄'), B, '다른 문서');
  return { T0: t, A, B };
}
const raw = (t: TextWorkspaceState, id: string) => M.raw(M.getDocument(t, id));

async function lostReply() {
  const { T0, A, B } = workspace();
  const sent: { next: TextWorkspaceState; expected: TextWorkspaceState }[] = [];
  let reply = false; // the save is applied on the server, but its reply never arrives
  const draft = createProgramTextDraft(T0, A, async (next, _label, options) => { sent.push({ next, expected: options!.expectedWorkspace! }); return reply; }, () => {});
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄'), true);
  assert.equal(await draft.save(), false);
  const T1 = M.editText(T0, B, '다른 문서\n원격 줄');            // the other device's save, taken as the host base
  const T2 = mergeProgramTextWorkspace(T0, sent[0].next, T1)!;   // what the host submitted and the server applied
  return { draft, sent, T0, T1, T2, A, B, replyNext: (value: boolean) => { reply = value; } };
}

test('a lost reply confirmed on the newer base is accepted once: no protection, no second save', async () => {
  const { draft, sent, T1, T2, A, B } = await lostReply();
  assert(privateTextChangeIsolatedToDocument(T1, T2, A), 'the host sees only document A change from its base');
  assert.equal(draft.acceptConfirmedSave(T1, T2), true);
  const state = draft.getState();
  assert.equal(state.dirty, false); assert.equal(state.error, '');
  assert.equal(raw(state.committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(state.committed, B), '다른 문서\n원격 줄', 'the other device\'s document stays');
  assert.equal(await draft.save(), true); assert.equal(sent.length, 1, 'exactly one save request');
});

test('input typed while waiting for the check moves onto the confirmed text and keeps the remote change', async () => {
  const { draft, sent, T1, T2, A, B, replyNext } = await lostReply();
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄\n기다리며 쓴 줄'), true);
  assert.equal(draft.acceptConfirmedSave(T1, T2), true);
  let state = draft.getState();
  assert.equal(state.dirty, true); assert.equal(state.committed, T2);
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n기다리며 쓴 줄');
  assert.equal(raw(state.working, B), '다른 문서\n원격 줄');
  replyNext(true);
  assert.equal(await draft.save(), true);
  assert.equal(sent.length, 2); assert.equal(sent[1].expected, T2, 'the next save is based on the confirmed text');
  assert.equal(raw(sent[1].next, B), '다른 문서\n원격 줄', 'the newer save never reverts document B');
  state = draft.getState(); assert.equal(state.dirty, false);
});

test('a confirmation that is not exactly this merge stays refused', async () => {
  const { draft, T1, T2, A } = await lostReply();
  assert.equal(draft.acceptConfirmedSave(T1, M.editText(T2, A, '다른 기기가 바꾼 A')), false);
  assert.equal(draft.getState().dirty, true);
});

test('a remote change to the typed document itself still has no merge and stays protected', async () => {
  const { T0, A } = workspace();
  const sent: TextWorkspaceState[] = [];
  const draft = createProgramTextDraft(T0, A, async next => { sent.push(next); return false; }, () => {});
  draft.updateRaw('첫 줄\n이어 쓴 줄'); await draft.save();
  const T1 = M.editText(T0, A, '첫 줄 고침');
  assert.equal(mergeProgramTextWorkspace(T0, sent[0], T1), null);
  assert.equal(draft.acceptConfirmedSave(T1, sent[0]), false);
  assert.equal(draft.getState().dirty, true);
});

test('the exact confirmation without a newer base still works as before', async () => {
  const { T0, A } = workspace();
  const sent: TextWorkspaceState[] = [];
  const draft = createProgramTextDraft(T0, A, async next => { sent.push(next); return false; }, () => {});
  draft.updateRaw('첫 줄\n이어 쓴 줄'); await draft.save();
  assert.equal(draft.acceptConfirmedSave(T0, sent[0]), true);
  assert.equal(draft.getState().dirty, false);
});

test('a retry refused while waiting does not hide the merged request either', async () => {
  const { draft, sent, T1, T2, A, B, replyNext } = await lostReply();
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄\n기다리며 쓴 줄'), true);
  assert.equal(await draft.save(), false, 'the automatic retry is refused at once: a result is still pending');
  assert.equal(sent.length, 2);
  assert.equal(draft.acceptConfirmedSave(T1, T2), true, 'the first request, merged onto the newer base, is accepted');
  const state = draft.getState();
  assert.equal(state.committed, T2); assert.equal(state.dirty, true); assert.equal(state.error, '');
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n기다리며 쓴 줄');
  replyNext(true);
  assert.equal(await draft.save(), true);
  assert.equal(sent.length, 3); assert.equal(sent[2].expected, T2);
  assert.equal(raw(sent[2].next, B), '다른 문서\n원격 줄');
});

test('eleven retries refused before sending do not hide the merged request either (Codex N1 F1)', async () => {
  const { T0, A, B } = workspace();
  const sent: { next: TextWorkspaceState; expected: TextWorkspaceState }[] = [];
  let pending = false, open = false;
  const draft = createProgramTextDraft(T0, A, async (next, _label, options) => {
    if (open) { sent.push({ next, expected: options!.expectedWorkspace! }); return true; }
    if (pending) { options?.onNotSent?.(); return false; }
    sent.push({ next, expected: options!.expectedWorkspace! }); pending = true; return false;
  }, () => {});
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄'), true);
  assert.equal(await draft.save(), false);
  const T1 = M.editText(T0, B, '다른 문서\n원격 줄'), T2 = mergeProgramTextWorkspace(T0, sent[0].next, T1)!;
  for (let i = 0; i < 11; i++) {
    assert.equal(draft.updateRaw(`첫 줄\n이어 쓴 줄\n기다리며 쓴 줄${'!'.repeat(i)}`), true);
    assert.equal(await draft.save(), false);
  }
  assert.equal(sent.length, 1, 'only the first request was sent');
  assert.equal(draft.acceptConfirmedSave(T1, T2), true);
  assert.equal(draft.getState().committed, T2); assert.equal(draft.getState().error, '');
  open = true;
  assert.equal(await draft.save(), true);
  assert.equal(sent.length, 2); assert.equal(sent[1].expected, T2);
  assert.equal(raw(sent[1].next, B), '다른 문서\n원격 줄');
  assert.equal(raw(sent[1].next, A), '첫 줄\n이어 쓴 줄\n기다리며 쓴 줄!!!!!!!!!!');
});
