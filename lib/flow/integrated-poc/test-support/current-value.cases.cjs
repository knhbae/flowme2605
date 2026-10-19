'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { load } = require('./consumer-source.cjs');
const LIB = 'lib/flow/integrated-poc/';
const { createProgramData, validateProgramData } = load(LIB + 'program-data.ts');
const { textWorkspaceModel: M } = load(LIB + 'text-workspace.ts');
const { inspectProgramPrivateOutput, makeProgramPrivateOutput } = load(LIB + 'private-output.ts');
const { readProgramFolderCopyPreview, copyProgramFolderOccurrence, programFolderCopyAccessProblem } = load(LIB + 'folder-copy.ts');

test('current-value export uses numeric RAW 80 while preserving dated history 20 and every original byte', () => {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  assert(data.actors.every(actor => actor.simulated));
  space.text = M.addDocument(space.text, { title: 'Synthetic current export' });
  const docId = space.text.documents.at(-1).id;
  space.text = M.editText(space.text, docId, '- [0%] Synthetic numeric task');
  const id = M.tasks(space.text)[0].id;
  space.text = M.recordProgress(space.text, id, '2026-01-01', 80);
  space.text = M.correctProgressRecord(space.text, id, '2026-01-01', 20, '2026-01-02');
  assert(validateProgramData(data));
  assert.equal(M.currentProgress(space.text, id), 80);
  assert.equal(M.latestProgress(space.text, id).percent, 20);
  const before = JSON.stringify(data);
  const inspection = inspectProgramPrivateOutput(data, { actorId, documentId: docId });
  assert(inspection.ok); assert.equal(inspection.rows.find(row => row.id === id).progress, 80);
  const output = makeProgramPrivateOutput(data, { actorId, documentId: docId, mode: 'tasks',
    format: 'txt', selectedItemIds: [id] }, '2026-01-02T00:00:00.000Z');
  assert(output.ok); assert(output.payload.includes('80%'));
  assert.equal(JSON.stringify(data), before);
});

const controls = [
  { name: 'checkbox parent and source subcheck both keep current20', tokens: [' ', ' '], current: [20, 20], history: [20, 20] },
  { name: 'checkbox partial values and literal replacement characters survive independently', tokens: [' ', ' '], current: [20, 45], history: [20, 45] },
  { name: 'checkbox zero and complete keep their RAW spelling', tokens: [' ', 'X'], current: [0, 100], history: [0, 100], preserveRaw: true },
  { name: 'numeric zero and complete ignore stale records', tokens: ['0%', '100%'], current: [0, 100], history: [40, 30], preserveRaw: true },
  { name: 'ratio numeric tokens retain their original spelling', tokens: ['0.2', '1.0'], current: [20, 100], history: [40, 30], preserveRaw: true },
  { name: 'integer and percent tokens retain their original spelling', tokens: ['20', '80%'], current: [20, 80], history: [40, 30], preserveRaw: true },
];
function setup(tokens) {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  let state = M.addDocument(space.text, { title: 'Synthetic source' });
  const docId = state.documents.at(-1).id;
  state = M.createFolderAt(state, docId, 0, 'Synthetic source folder');
  const lineId = M.getDocument(state, docId).lines[0].id;
  state = M.editText(state, docId, M.raw(M.getDocument(state, docId))
    + '\n  - [' + tokens[0] + '] Parent $& $1 [ ]  \n    - [' + tokens[1] + '] Child $& $1 [ ]  ');
  const parent = M.tasks(state).find(task => task.title.startsWith('Parent'));
  assert(parent && parent.subchecks.length === 1);
  const child = parent.subchecks[0];
  assert.equal(M.rowMeta(state, docId).find(row => row.id === child.id).kind, 'subcheck');
  assert(!M.tasks(state).some(task => task.id === child.id));
  return { data, actorId, space, state, docId, lineId, ids: [parent.id, child.id] };
}
for (const scenario of controls) test('current-value copy: ' + scenario.name, () => {
  const f = setup(scenario.tokens); let state = f.state;
  for (const [index, id] of f.ids.entries()) {
    state = M.recordProgress(state, id, '2026-01-01', scenario.current[index]);
    if (scenario.tokens[index].trim() !== '' && !/^[xX]$/.test(scenario.tokens[index]))
      state = M.correctProgressRecord(state, id, '2026-01-01', scenario.history[index], '2026-01-02');
  }
  assert(M.validate(state));
  assert.deepEqual(f.ids.map(id => M.currentProgress(state, id)), scenario.current);
  const original = JSON.stringify(state), doc = M.getDocument(state, f.docId);
  f.space.text = state;
  assert.equal(programFolderCopyAccessProblem(f.space, f.docId, doc.lines.map(row => row.id)), null);
  const preview = readProgramFolderCopyPreview(state, f.docId, f.lineId), previewBytes = JSON.stringify(preview);
  assert(preview);
  const result = copyProgramFolderOccurrence(state, preview, 'Synthetic copy');
  assert(result.ok, result.message);
  const next = result.workspace, copy = M.getDocument(next, result.documentId), ids = f.ids.map(id => result.lineIds[id]);
  assert(M.validate(next)); assert.notEqual(result.documentId, f.docId);
  assert.deepEqual(ids.map(id => M.currentProgress(next, id)), scenario.current);
  assert.deepEqual(next.progressRecords, state.progressRecords);
  for (const [index, id] of ids.entries()) {
    assert(!state.documents.some(d => d.lines.some(line => line.id === id)));
    assert.deepEqual(M.progressHistory(next, id), []);
    const sourceRaw = doc.lines.find(line => line.id === f.ids[index]).text;
    const copiedRaw = copy.lines.find(line => line.id === id).text;
    const expected = scenario.preserveRaw ? sourceRaw
      : sourceRaw.replace('[ ]', '[' + scenario.current[index] + '%]');
    assert.equal(copiedRaw, expected);
  }
  assert.equal(new Set(Object.values(result.lineIds)).size, Object.values(result.lineIds).length);
  for (const [id, copiedId] of Object.entries(result.folderIds)) assert.notEqual(id, copiedId);
  const parent = M.tasks(next).find(task => task.id === ids[0]);
  assert(parent && parent.subchecks.some(child => child.id === ids[1]));
  const docIds = new Set([...state.documents, ...state.flows].map(d => d.id));
  const folderIds = new Set(state.folders.map(folder => folder.id));
  const owners = (nextOwners, oldOwners) => Object.fromEntries(Object.entries(nextOwners).filter(([id]) => Object.hasOwn(oldOwners, id)));
  assert.deepEqual({ ...next, documents: next.documents.filter(d => docIds.has(d.id)),
    folders: next.folders.filter(folder => folderIds.has(folder.id)),
    bindings: next.bindings.filter(binding => docIds.has(binding.docId)),
    taskScopes: owners(next.taskScopes, state.taskScopes), itemScopes: owners(next.itemScopes, state.itemScopes) }, state);
  assert.equal(JSON.stringify(state), original); assert.equal(JSON.stringify(preview), previewBytes);
  const dataBefore = JSON.stringify(f.data), exported = inspectProgramPrivateOutput(f.data, { actorId: f.actorId, documentId: f.docId });
  assert(exported.ok); assert.equal(exported.rows.find(row => row.id === f.ids[0]).progress, scenario.current[0]);
  assert.equal(JSON.stringify(f.data), dataBefore);
});

for (const [token, percent] of [['x', 0], [' ', 100]]) test('current-value invalid checkbox/history contradiction fails closed: ' + percent, () => {
  const f = setup([token, token]);
  const state = { ...f.state, progressRecords: f.ids.map(taskId => ({ taskId, date: '2026-01-01', percent })) };
  const before = JSON.stringify(state);
  assert.equal(M.validate(state), false);
  assert.equal(readProgramFolderCopyPreview(state, f.docId, f.lineId), null);
  f.space.text = state;
  const dataBefore = JSON.stringify(f.data);
  assert.deepEqual(inspectProgramPrivateOutput(f.data, { actorId: f.actorId, documentId: f.docId }), { ok: false, reason: 'invalid-data' });
  assert.equal(JSON.stringify(state), before); assert.equal(JSON.stringify(f.data), dataBefore);
});

