import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// One device, no remote change: the reply of save A is lost (the server applied it), the user types
// another line, the editor's automatic save is refused at once because a result is still pending, and
// "다시 확인" then proves A exactly (T0 -> A). The refused retry used to replace the draft's only record of
// what was sent, so the receipt was refused and the shell showed the external-change warning. The draft
// now keeps every attempt that may have reached the server; a retry the host refused before sending never
// enters that list, so any number of them cannot push the lost request out (Codex N1 F1).
function workspace() {
  const empty = { version: 11, documents: [], folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], flows: [],
    bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  let t = M.addDocument(empty, { title: '문서 A' });
  const A = t.documents[0].id;
  t = M.editText(t, A, '첫 줄');
  return { T0: t, A };
}
const raw = (t: TextWorkspaceState, id: string) => M.raw(M.getDocument(t, id));

/** The host: the first save is sent and its reply lost; while that result is pending every later save is
 * refused before sending (onNotSent), unless `signal` is off (a host that cannot say so). */
async function lostReply(refusedRetries: number, signal = true) {
  const { T0, A } = workspace();
  const sent: { before: TextWorkspaceState; next: TextWorkspaceState }[] = [], calls: TextWorkspaceState[] = [];
  let pending = false, host: (() => boolean) | null = null;
  const draft = createProgramTextDraft(T0, A, async (next, _label, options) => {
    calls.push(next);
    if (host) { sent.push({ before: options!.expectedWorkspace!, next }); return host(); }
    if (pending) { if (signal) options?.onNotSent?.(); return false; }
    sent.push({ before: options!.expectedWorkspace!, next }); pending = true; return false;
  }, () => {});
  assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄'), true);
  assert.equal(await draft.save(), false);                    // applied on the server, reply lost
  const applied = sent[0].next;
  for (let i = 0; i < refusedRetries; i++) {
    assert.equal(draft.updateRaw(`첫 줄\n이어 쓴 줄\n새 줄${'!'.repeat(i)}`), true);
    assert.equal(await draft.save(), false);                  // refused before sending: a result is pending
  }
  if (!refusedRetries) assert.equal(draft.updateRaw('첫 줄\n이어 쓴 줄\n새 줄'), true);
  return { draft, T0, A, applied, sent, calls, sendNext: () => { pending = false; host = () => true; } };
}

test('control: the exact receipt is accepted when no retry happened in between', async () => {
  const { draft, T0, A, applied } = await lostReply(0);
  assert.equal(draft.acceptConfirmedSave(T0, applied), true);
  const state = draft.getState();
  assert.equal(raw(state.committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(state.dirty, true);
});

test('a refused automatic retry does not hide the request that actually reached the server', async () => {
  const { draft, T0, A, applied, sent, calls, sendNext } = await lostReply(1);
  assert.equal(calls.length, 2, 'the retry reached the host'); assert.equal(sent.length, 1, 'only the first was sent');
  assert.equal(draft.acceptConfirmedSave(T0, applied), true, 'the exact receipt of the first request is accepted');
  const state = draft.getState();
  assert.equal(raw(state.committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(state.working, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(state.dirty, true);
  assert.equal(state.error, '', 'the refused retry no longer holds back the next save');
  sendNext();
  assert.equal(await draft.save(), true, 'the new line is saved next, on the confirmed text');
  assert.equal(sent.length, 2, 'one more save');
  assert.equal(raw(sent.at(-1)!.before, A), '첫 줄\n이어 쓴 줄');
  assert.equal(raw(draft.getState().committed, A), '첫 줄\n이어 쓴 줄\n새 줄'); assert.equal(draft.getState().dirty, false);
});

test('eleven or thirty refused retries never push out the request that was sent (Codex F1)', async () => {
  for (const retries of [11, 30]) {
    const { draft, T0, A, applied, sent, sendNext } = await lostReply(retries);
    const latest = M.getDocument(draft.getState().working, A)!.lines.map(line => line.id);
    assert.equal(sent.length, 1, `${retries}: only the first request was sent`);
    assert.equal(draft.acceptConfirmedSave(T0, applied), true, `${retries}: the lost request is still proved`);
    assert.equal(raw(draft.getState().committed, A), '첫 줄\n이어 쓴 줄');
    assert.deepEqual(M.getDocument(draft.getState().working, A)!.lines.map(line => line.id), latest, 'the latest input keeps its lines');
    assert.equal(draft.getState().error, '');
    sendNext();
    assert.equal(await draft.save(), true);
    assert.equal(sent.length, 2, `${retries}: the newer input is saved once`);
    assert.equal(raw(sent[1].before, A), '첫 줄\n이어 쓴 줄', 'on the confirmed text');
    assert.equal(raw(draft.getState().committed, A), `첫 줄\n이어 쓴 줄\n새 줄${'!'.repeat(retries - 1)}`);
  }
});

test('a host that cannot say "not sent" keeps every attempt as possibly sent; a receipt nobody sent is refused', async () => {
  const quiet = await lostReply(11, false);
  assert.equal(quiet.draft.acceptConfirmedSave(quiet.T0, quiet.applied), true, 'nothing is pushed out either');
  const { draft, T0, A, applied } = await lostReply(3);
  const never = M.editText(T0, A, '첫 줄\n보낸 적 없는 줄');
  assert.equal(draft.acceptConfirmedSave(T0, never), false);
  assert.equal(draft.acceptConfirmedSave(T0, applied), true);
  assert.equal(raw(draft.getState().committed, A), '첫 줄\n이어 쓴 줄');
  assert.equal(draft.acceptConfirmedSave(T0, applied), false, 'one receipt is taken once; the base has moved');
});

test('the host says which refusals were never sent, and the editor saves the input left after a receipt', () => {
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert.match(space, /if \(!result\.ok && \(result\.reason === 'unresolved' \|\| result\.reason === 'busy'\)\) options\?\.onNotSent\?\.\(\);/);
  const controller = readFileSync(new URL('./alpha-sync/controller.ts', import.meta.url), 'utf8');
  assert.match(controller, /if \(busy\) return rejected\('busy'\);\r?\n *if \(current\.pending \|\| /, 'both refusals come before anything is sent');
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const accepted = controller\.acceptConfirmedSave\(before, next, ack\);\r?\n.*\r?\n *if \(accepted && !ack && controller\.getState\(\)\.dirty && !controller\.getState\(\)\.saving\) scheduleSave\(\);/);
});
