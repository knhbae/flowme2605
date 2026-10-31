import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicVersion } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { importProgramPublicVersion, applyProgramCopyVersion } from './private-space';
import { programCopyHeader } from './program-copy-header';
function fixture() {
  let data = createProgramData();
  const version = (number: number): ProgramPublicVersion => ({ id: 'fc-v' + number, flowId: 'fc-flow', number, parentVersionId: number === 1 ? null : 'fc-v1',
    title: '합성 Flow', summary: '', items: [{ id: 'fc-item', title: '준비하기', description: number === 1 ? '' : '새 설명', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }],
    source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-11-01T00:00:00.000Z' });
  data.public.flows.push({ id: 'fc-flow', ownerId: 'creator-minji', currentVersionId: 'fc-v2', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push(version(1), version(2));
  const result = importProgramPublicVersion(data, { actorId: 'local-user', requestId: 'import-fc', expectedSpace: data.spaces['local-user'], versionId: 'fc-v1', itemIds: ['fc-item'], anchor: null });
  assert(result.ok); data = result.data;
  return { data, copy: data.spaces['local-user'].copies.find(row => row.flowId === 'fc-flow')! };
}
test('copy header reads the explicit owner, detects an unapplied field and never changes data', () => {
  const { data, copy } = fixture(), before = JSON.stringify(data);
  assert.equal(programCopyHeader(data, 'local-user', copy.documentId)?.kind, 'changed');
  assert.equal(programCopyHeader(data, 'creator-minji', copy.documentId), null);
  assert.equal(JSON.stringify(data), before);
  const applied = applyProgramCopyVersion(data, { actorId: 'local-user', requestId: 'apply-fc', expectedSpace: data.spaces['local-user'],
    copyId: copy.id, versionId: 'fc-v2', expectedBaseVersionId: 'fc-v1', itemIds: ['fc-item'], fields: ['description'] });
  assert(applied.ok);
  assert.equal(programCopyHeader(applied.data, 'local-user', copy.documentId)?.kind, 'current', 'a differing version ID alone is not an update');
});
test('withdrawal and unverified priority do not remove or rewrite the private copy', () => {
  const { data, copy } = fixture(), space = JSON.stringify(data.spaces['local-user']);
  data.public.flows.find(row => row.id === 'fc-flow')!.archived = true;
  assert.equal(programCopyHeader(data, 'local-user', copy.documentId)?.kind, 'withdrawn');
  assert.equal(JSON.stringify(data.spaces['local-user']), space);
  const unverified: ProgramData = structuredClone(data);
  unverified.spaces['local-user'].copies.find(row => row.id === copy.id)!.flowId = 'catalog-fc';
  unverified.public.flows.find(row => row.id === 'fc-flow')!.id = 'catalog-fc';
  unverified.public.versions.filter(row => row.flowId === 'fc-flow').forEach(row => { row.flowId = 'catalog-fc'; });
  assert(validateProgramData(unverified));
  assert.equal(programCopyHeader(unverified, 'local-user', copy.documentId)?.kind, 'unverified');
});
