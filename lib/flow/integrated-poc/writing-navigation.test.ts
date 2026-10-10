import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { programCheckpointForWritingTarget } from './writing-navigation';
import { readProgramNavigationCheckpoint } from './navigation';

function fixture() {
  const seed = createProgramData(), actorId = seed.activeActorId;
  const created = createProgramDocument(seed, { actorId, expectedSpace: seed.spaces[actorId], requestId: 'writing-navigation', title: '정확한 문서', raw: '개인 메모\n반복: 같은 항목\n세 번째 행' }); assert(created.ok);
  const data = created.data, doc = data.spaces[actorId].text.documents.find(row => row.id === created.result)!;
  return { data, doc, destination: { view: 'space' as const, id: doc.id } };
}
test('explicit writing navigation restores the actual row through the existing history contract, with no private text or mutation', () => {
  const f = fixture(), before = JSON.stringify(f.data), checkpoint = programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[1].id, null); assert(checkpoint);
  assert.equal(checkpoint.focus, `program-text-${encodeURIComponent(f.doc.id)}`); assert.deepEqual(checkpoint.writing?.[f.doc.id], { start: 6, end: 6, scrollTop: 0 });
  assert.deepEqual(readProgramNavigationCheckpoint(checkpoint, f.data.activeActorId, checkpoint.location), checkpoint);
  assert(!JSON.stringify(checkpoint).includes('개인 메모')); assert.equal(JSON.stringify(f.data), before);
});
test('explicit row wins over old writing focus and period without changing another document checkpoint', () => {
  const f = fixture(), first = programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[0].id, null)!;
  first.focus = 'program-main'; first.writing!.other = { start: 3, end: 4, scrollTop: 5 }; const before = JSON.stringify(first);
  const next = programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[1].id, first)!;
  assert.equal(next.writing![f.doc.id].start, 6); assert.deepEqual(next.writing!.other, first.writing!.other); assert.equal(JSON.stringify(first), before);
});
test('missing duplicated or foreign line ownership cannot create a writing destination', () => {
  const f = fixture();
  assert.equal(programCheckpointForWritingTarget(f.data, { view: 'activity' }, f.doc.lines[0].id, null), null);
  assert.equal(programCheckpointForWritingTarget(f.data, { ...f.destination, id: 'missing' }, f.doc.lines[0].id, null), null);
  assert.equal(programCheckpointForWritingTarget(f.data, f.destination, 'missing-line', null), null);
  const foreign = programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[0].id, null)!; foreign.actorId = 'creator-minji'; foreign.writing!.foreign = { start: 1, end: 1, scrollTop: 0 };
  assert(!programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[0].id, foreign)!.writing!.foreign);
  f.doc.lines.push({ ...f.doc.lines[0] }); assert.equal(programCheckpointForWritingTarget(f.data, f.destination, f.doc.lines[0].id, null), null);
});
test('Space delegates explicit row focus to App history and limits native restoration to the Alpha shell', () => {
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramApp.tsx', import.meta.url), 'utf8');
  const open = space.slice(space.indexOf('async function openDocument(id:'), space.indexOf('async function newDocument('));
  const alpha = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
  assert(open.includes('writingLineId: taskId'));
  const nativeRestore = open.slice(open.indexOf('if (targetPosition && !props.onRegisterNavigation)'));
  assert(nativeRestore.startsWith('if (targetPosition && !props.onRegisterNavigation)'));
  assert.equal(open.match(/requestAnimationFrame\(/g)?.length, 1);
  assert(nativeRestore.includes('requestAnimationFrame('));
  assert(nativeRestore.includes('sourceFocusPorts.current[id]'));
  assert(nativeRestore.includes('selectedRef.current !== id'));
  assert(nativeRestore.includes('!programSame(positions.current[id], requested)'));
  assert(app.includes('onRegisterNavigation={registered => { spaceNavigation.current = registered; }}'));
  assert(!alpha.includes('onRegisterNavigation='));
  assert(app.includes('programCheckpointForWritingTarget(data, next, options.writingLineId, checkpoint)'));
  assert(app.includes('document.getElementById(checkpoint.focus)?.focus'));
});
