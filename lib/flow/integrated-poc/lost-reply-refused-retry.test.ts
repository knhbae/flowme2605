import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// One device, no remote change: the reply of save A is lost (the server applied it), the user types
// another line, the editor's automatic save is refused at once because a result is still pending, and
// "다시 확인" then proves A exactly (T0 -> A). The refused retry used to replace the draft's only record of
// what was sent, so the receipt was refused and the shell showed the external-change warning. The draft
// now remembers every unconfirmed attempt from the same base.
function workspace() {
  const empty = { version: 11, documents: [], folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], flows: [],
    bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  let t = M.addDocument(empty, { title: '문서 A' });
  const A = t.documents[0].id;
  t = M.editText(t, A, '첫 줄');
  return { T0: t, A };
}
const raw = (t: TextWorkspaceState, id: string) => M.raw(M.getDocument(t, id));

async function lostReply(refusedRetries: number) {
  const { T0, A } = workspace();
  const sent: { before: TextWorkspaceState; next: TextWorkspaceState }[] = [];
  let host: (before: TextWorkspaceState, next: TextWorkspaceState) => boolean = () => false;
  const draft = createProgramTextDraft(T0, A, async (next, _label, options) => { sent.push({ before: options!.expectedWorkspace!, next }); return host(options!.expectedWorkspace!, next); }, () => {});
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄'), true);
  assert.equal(await draft.save(), false);                    // applied on the server, reply lost
  const applied = sent[0].next;
  for (let i = 0; i < refusedRetries; i++) {
    assert.equal(draft.updateRaw(`첫 줄\n이어 쓴 줄\n새 줄${'!'.repeat(i)}`), true);
    assert.equal(await draft.save(), false);                  // host refuses: a result is still pending
  }
  if (!refusedRetries) assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄\n새 줄'), true);
  return { draft, T0, A, applied, sent, setHost: (next: typeof host) => { host = next; } };
}

test('control: the exact receipt is accepted when no retry happened in between', async () => {
  const { draft, T0, A, applied } = await lostReply(0);
  assert.equal(draft.acceptConfirmedSave(T0, applied), true);
  const state = draft.getState();
  assert.equal(raw(state.committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(state.dirty, true);
});

test('a refused automatic retry does not hide the request that actually reached the server', async () => {
  const { draft, T0, A, applied, sent, setHost } = await lostReply(1);
  assert.equal(sent.length, 2, 'the refused retry went to the host');
  assert.equal(draft.acceptConfirmedSave(T0, applied), true, 'the exact receipt of the first request is accepted');
  const state = draft.getState();
  assert.equal(raw(state.committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(state.dirty, true);
  assert.equal(state.error, '', 'the refused retry no longer holds back the next save');
  setHost(() => true);
  assert.equal(await draft.save(), true, 'the new line is saved next, on the confirmed text');
  assert.equal(raw(sent.at(-1)!.before, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(draft.getState().committed, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(draft.getState().dirty, false);
});

test('several refused retries keep the first request; a receipt nobody sent is still refused', async () => {
  const { draft, T0, A, applied } = await lostReply(3);
  const never = M.editText(T0, A, '첫 줄\n보낸 적 없는 줄');
  assert.equal(draft.acceptConfirmedSave(T0, never), false);
  assert.equal(draft.acceptConfirmedSave(T0, applied), true);
  assert.equal(raw(draft.getState().committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(draft.acceptConfirmedSave(T0, applied), false, 'one receipt is taken once; the base has moved');
});

test('the editor saves the input left after a confirmed receipt instead of waiting for the next key', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const accepted = controller\.acceptConfirmedSave\(before, next, ack\);\r?\n.*\r?\n *if \(accepted && !ack && controller\.getState\(\)\.dirty && !controller\.getState\(\)\.saving\) scheduleSave\(\);/);
});
