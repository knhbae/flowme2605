import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { prepareProgramInitialData } from './legacy-entry';
import { addProgramQuickTask, createProgramDocument, importProgramPublicVersion, updateProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ordinaryPublicationSourceFixture } from './publication-ordinary-source.fixture';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { hydrateProgramLegacy } from './legacy-projection';
import { readProgramTaskOrigin } from './task-origin-presentation';

let request = 0;
const NOW = '2026-10-06T00:00:00.000Z';
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `task-origin-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
function accept(result: ProgramTransition<string>) {
  assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result;
}
function copiedFixture() {
  let data = prepareProgramInitialData().data;
  const version = data.public.versions.find(row => row.flowId === 'catalog-chiangmai-solo-trip-packing')!;
  assert.equal(version.source.kind, 'repository-source');
  const item = version.items[0];
  const result = accept(importProgramPublicVersion(data, { ...base(data), versionId: version.id, itemIds: [item.id], anchor: '2026-11-05' }));
  data = result.data;
  const copy = data.spaces[data.activeActorId].copies.find(row => row.id === result.result)!;
  return { data, copy, version, item, taskId: copy.itemLines[item.id], documentId: copy.documentId };
}
const sourceTask = (f: ReturnType<typeof copiedFixture>) => ({ id: f.taskId, docId: f.documentId });
const unknown = { label: '문서 항목', sourceUrl: null };

test('an actual repository copy resolves its exact Item and remains a read-only presentation', () => {
  const f = copiedFixture(), before = JSON.stringify(f.data);
  assert.deepEqual(readProgramTaskOrigin(f.data, sourceTask(f)), { label: 'Flow에서 가져옴', sourceUrl: new URL(f.item.sourceUrl!).href });
  assert.equal(JSON.stringify(f.data), before);
});

test('same-title personal additions inside and outside a copy do not acquire its origin or URL', () => {
  const f = copiedFixture(); let data = f.data;
  const document = accept(createProgramDocument(data, { ...base(data), title: f.version.title })); data = document.data;
  for (const documentId of [f.documentId, document.result]) {
    const added = accept(addProgramQuickTask(data, { ...base(data), documentId, title: f.item.title, date: null })); data = added.data;
    assert.deepEqual(readProgramTaskOrigin(data, { id: added.result, docId: documentId }), { label: '직접 작성', sourceUrl: null });
  }
  assert.equal(readProgramTaskOrigin(data, sourceTask(f)).label, 'Flow에서 가져옴');
});

test('source URL follows the accepted field version, never the latest public version or private note', () => {
  const f = copiedFixture(), data = programClone(f.data);
  const version = { ...programClone(f.version), id: 'origin-accepted-v2', number: 2, parentVersionId: f.version.id };
  version.items.find(item => item.id === f.item.id)!.sourceUrl = 'https://example.org/accepted';
  data.public.versions.push(version);
  data.public.flows.find(flow => flow.id === f.copy.flowId)!.currentVersionId = version.id;
  const copy = data.spaces[data.activeActorId].copies[0];
  assert.equal(readProgramTaskOrigin(data, sourceTask(f)).sourceUrl, new URL(f.item.sourceUrl!).href);
  copy.appliedFields[f.item.id] = { sourceUrl: version.id };
  assert.equal(readProgramTaskOrigin(data, sourceTask(f)).sourceUrl, 'https://example.org/accepted');
  const updated = accept(updateProgramTask(data, { ...base(data), taskId: f.taskId, patch: { note: 'https://example.org/private-note' } })).data;
  assert.equal(readProgramTaskOrigin(updated, sourceTask(f)).sourceUrl, 'https://example.org/accepted');
  copy.appliedFields[f.item.id].sourceUrl = 'missing-version';
  assert.deepEqual(readProgramTaskOrigin(data, sourceTask(f)), unknown);
});

test('only HTTP and HTTPS Item source URLs become links; an accepted absence does not fall back', () => {
  const f = copiedFixture();
  for (const sourceUrl of [null, '', 'javascript:alert(1)', 'data:text/html,test', 'file:///C:/test', '/relative', 'not a URL']) {
    const data = programClone(f.data); data.public.versions.find(row => row.id === f.version.id)!.items.find(item => item.id === f.item.id)!.sourceUrl = sourceUrl;
    assert.deepEqual(readProgramTaskOrigin(data, sourceTask(f)), { label: 'Flow에서 가져옴', sourceUrl: null });
  }
  const data = programClone(f.data); data.public.versions.find(row => row.id === f.version.id)!.items.find(item => item.id === f.item.id)!.sourceUrl = 'http://example.org/source';
  assert.equal(readProgramTaskOrigin(data, sourceTask(f)).sourceUrl, 'http://example.org/source');
});

test('missing physical Item, wrong document, duplicate mapping or duplicate source version never chooses an origin', () => {
  const f = copiedFixture();
  assert.deepEqual(readProgramTaskOrigin(f.data, { id: f.taskId, docId: 'wrong-document' }), unknown);
  assert.deepEqual(readProgramTaskOrigin(f.data, { id: 'missing-item', docId: f.documentId }), unknown);
  const duplicate = programClone(f.data); duplicate.spaces[duplicate.activeActorId].copies[0].itemLines.other = f.taskId;
  assert.deepEqual(readProgramTaskOrigin(duplicate, sourceTask(f)), unknown);
  const versions = programClone(f.data); versions.public.versions.push(programClone(f.version));
  assert.deepEqual(readProgramTaskOrigin(versions, sourceTask(f)), unknown);
  const competing = programClone(f.data); competing.spaces[competing.activeActorId].savedBindings.push({ savedCopyId: 'other', flowId: 'other', flowRef: 'other',
    documentId: f.documentId, sourceRevision: 'other', itemLines: { other: f.taskId } });
  assert.deepEqual(readProgramTaskOrigin(competing, sourceTask(f)), unknown);
});

for (const kind of ['creator', 'native'] as const) test(`${kind} handoff reuses genuine Item provenance and does not match another same-title Item`, () => {
  const raw = '# 제작 예시\n- [ ] 같은 제목\n  - 출처: [확인 원문](https://example.org/item-source)\n- [ ] 같은 제목';
  const f = ordinaryPublicationSourceFixture(kind, raw), tasks = M.tasks(f.data.spaces[f.actorId].text);
  const before = JSON.stringify(f.data);
  assert.equal(tasks.length, 2);
  assert.deepEqual(readProgramTaskOrigin(f.data, tasks[0]), { label: '제작 문서에서 가져옴', sourceUrl: 'https://example.org/item-source' });
  assert.equal(readProgramTaskOrigin(f.data, tasks[1]).label, '제작 문서에서 가져옴');
  assert.equal(JSON.stringify(f.data), before);
});

test('legacy saved Item provenance is read from its exact retained source index, without source-text inference', () => {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'origin-legacy', documentId: 'origin-legacy-draft', revisionId: 'origin-legacy-v1',
    rawText: '# 가져온 예시\n- [ ] 원래 항목\n  - 출처: [원문](https://example.org/legacy)', committedAt: NOW });
  assert(made.ok);
  const projected = accept(hydrateProgramLegacy(createProgramData(), { version: 1, flows: [made.flow] }, createPersonalWorkspacePocState(NOW),
    { actorId: 'local-user', preserveUnsupported: true }));
  const task = M.tasks(projected.data.spaces['local-user'].text)[0];
  assert.deepEqual(readProgramTaskOrigin(projected.data, task), { label: '제작 문서에서 가져옴', sourceUrl: 'https://example.org/legacy' });
  const missing = programClone(projected.data); missing.spaces['local-user'].legacySnapshot = null;
  assert.deepEqual(readProgramTaskOrigin(missing, task), unknown);
});

test('unmapped imported documents and promoted source subchecks remain document Items instead of direct writing', () => {
  const f = ordinaryPublicationSourceFixture('native'); let data = f.data;
  const added = accept(addProgramQuickTask(data, { ...base(data), documentId: f.documentId, title: '확인되지 않은 문서 항목' })); data = added.data;
  assert.deepEqual(readProgramTaskOrigin(data, { id: added.result, docId: f.documentId }), unknown);
  const copy = copiedFixture(); const newTask = accept(addProgramQuickTask(copy.data, { ...base(copy.data), documentId: copy.documentId, title: '하위 원본' }));
  const space = newTask.data.spaces[newTask.data.activeActorId]; space.copies[0].subcheckLines[copy.item.id] = { child: newTask.result };
  assert.deepEqual(readProgramTaskOrigin(newTask.data, { id: newTask.result, docId: copy.documentId }), unknown);
});
