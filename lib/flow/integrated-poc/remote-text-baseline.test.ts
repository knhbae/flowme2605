import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData } from './contract';
import { createProgramData } from './program-data';
import { programTextTransition } from './program-text-transition';
import { remoteTextSparesDocuments } from './remote-text-baseline';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const OWNER = 'local-user', TYPED = 'doc-typed', OTHER = 'doc-other';
// Synthetic account with two documents: this tab types into TYPED while another device saves.
function account(): ProgramData {
  const data = createProgramData();
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 중 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  text = M.editText(text, TYPED, '[2026-10-29]\n- [ ] 입력 중 할 일\n메모 줄');
  text = M.editText(text, OTHER, '[2026-10-29]\n- [ ] 다른 할 일');
  data.spaces[OWNER].text = text;
  return data;
}
const rawOf = (data: ProgramData, id: string) => M.raw(M.getDocument(data.spaces[OWNER].text, id));
const lineIds = (data: ProgramData, id: string) => M.getDocument(data.spaces[OWNER].text, id)!.lines.map(line => line.id);
function remoteEdit(data: ProgramData, id: string, raw: string) {
  const next = structuredClone(data);
  next.spaces[OWNER].text = M.editText(next.spaces[OWNER].text, id, raw);
  next.spaces[OWNER].position = { documentId: id, lineId: null, start: raw.length, end: raw.length, scrollTop: 0 };
  return next;
}

// Idle return: the first-activity read brought another device's save of a different document
// while this tab was typing. It used to switch to protection and the save stopped (execute 0).
test('a remote save of another document becomes the baseline and the typed save merges into it', () => {
  const shown = account(), remote = remoteEdit(shown, OTHER, rawOf(shown, OTHER) + ' 원격');
  const typed = M.editText(shown.spaces[OWNER].text, TYPED, rawOf(shown, TYPED) + ' 로컬');
  assert.equal(remoteTextSparesDocuments(shown, remote, OWNER, [TYPED]), true);
  const saved = programTextTransition(remote, { actorId: OWNER, documentId: TYPED, expected: shown.spaces[OWNER].text, next: typed });
  assert.ok(saved.ok);
  assert.equal(rawOf(saved.data, OTHER), rawOf(remote, OTHER), 'the other device change is kept');
  assert.equal(rawOf(saved.data, TYPED), rawOf(shown, TYPED) + ' 로컬', 'the typed input is saved');
  assert.deepEqual(lineIds(saved.data, TYPED), lineIds(shown, TYPED), 'the typed document keeps its line ids');
});

test('a change to the typed document, its rows, the folders or outside the text stays protected', () => {
  const shown = account(), spared = (next: ProgramData, ids = [TYPED]) => remoteTextSparesDocuments(shown, next, OWNER, ids);
  const sameRow = remoteEdit(shown, TYPED, rawOf(shown, TYPED) + ' 원격');
  assert.equal(spared(sameRow), false, 'same document, same row');
  const typed = M.editText(shown.spaces[OWNER].text, TYPED, rawOf(shown, TYPED) + ' 로컬');
  assert.equal(programTextTransition(sameRow, { actorId: OWNER, documentId: TYPED, expected: shown.spaces[OWNER].text, next: typed }).ok, false,
    'the save merge refuses it too');
  const progress = structuredClone(shown), task = M.tasks(progress.spaces[OWNER].text).find(row => row.docId === TYPED)!;
  progress.spaces[OWNER].text = M.recordProgress(progress.spaces[OWNER].text, task.id, '2026-10-29', 40);
  assert.equal(spared(progress), false, 'progress of a typed task');
  const archived = structuredClone(shown); archived.spaces[OWNER].archivedDocumentIds.push(TYPED);
  assert.equal(spared(archived), false, 'archived elsewhere');
  const folder = structuredClone(shown); folder.spaces[OWNER].text.folders[0].title = '바뀐 폴더';
  assert.equal(spared(folder), false, 'folders');
  const published = structuredClone(shown); published.public.posts.push({ id: 'post-x' } as never);
  assert.equal(spared(published), false, 'public data');
  const other = remoteEdit(shown, OTHER, rawOf(shown, OTHER) + ' 원격');
  assert.equal(spared(other, []), false, 'no typed document named');
  assert.equal(spared(other, [TYPED, OTHER]), false, 'one of the typed documents changed');
  assert.equal(remoteTextSparesDocuments(shown, other, 'creator-minji', [TYPED]), false, 'another owner');
});

// The browser-side guard: only the private text editor holds input, it does not block the
// snapshot itself, and every typed document is spared. Anything else keeps the old protection.
test('the host adopts a spared remote save only through these checks', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(host, /hasInput\(\) && !acceptedPrivateInput && !remoteSparesInput\(\)/);
  assert.match(host, /port\.blocksExternalSnapshot\(displayed, confirmed\) !== false/);
  assert.match(host, /other && other !== port && \(!other\.hasPendingInput \|\| other\.hasPendingInput\(\) !== false\)/);
  assert.match(host, /remoteTextSparesDocuments\(displayed, confirmed, session\.userId, port\.pendingDocumentIds\(\)\)/);
});
