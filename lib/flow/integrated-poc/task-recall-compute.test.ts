import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramPrivateSpace } from './program-data';
import { createProgramRecallComputer } from './task-recall-compute';

function fixture() {
  const listeners = new Map<string, ((event: { data: unknown }) => void)[]>(), posted: any[] = [];
  let stopped = 0;
  const worker = { postMessage: (value: unknown) => { posted.push(structuredClone(value)); }, terminate: () => { stopped++; },
    addEventListener: (event: string, listener: any) => { listeners.set(event, [...listeners.get(event) ?? [], listener]); } } as unknown as Worker;
  const computer = createProgramRecallComputer(() => worker);
  return { computer, posted, stopped: () => stopped, emit: (event: string, data: unknown) => { for (const listener of listeners.get(event) ?? []) listener({ data }); } };
}
const row = { documentId: 'synthetic-doc', lineId: 'synthetic-line', title: '합성 후보', parentTitle: null, key: '합성 후보', match: '합성 후보', done: false, percent: 20, day: '2026-11-12', due: null, folder: '', proof: 'source-proof' };
test('W-TXT-15·16: only saved snapshot is posted, late owner/generation is discarded, output frozen', async () => {
  const f = fixture(), first = f.computer.run({ ownerId: 'synthetic-a', space: createProgramPrivateSpace(), today: '2026-11-13' });
  const second = f.computer.run({ ownerId: 'synthetic-b', space: createProgramPrivateSpace(), today: '2026-11-13' });
  assert.deepEqual(await first, []); assert(!Object.hasOwn(f.posted[1].space, 'publicationDrafts'));
  f.emit('message', { ...f.posted[0], rows: [row] });
  f.emit('message', { ...f.posted[1], ownerId: 'synthetic-a', rows: [row] });
  f.emit('message', { ...f.posted[1], rows: [row] });
  const result = await second; assert.equal(result.length, 1); assert(Object.isFrozen(result[0]));
  f.computer.dispose(); assert.equal(f.stopped(), 1);
  assert.deepEqual(await f.computer.run({ ownerId: 'synthetic-a', space: createProgramPrivateSpace(), today: '2026-11-13' }), []);
});
test('W-TXT-16: malformed result or worker failure offers nothing, never mutates the input space', async () => {
  const f = fixture(), source = createProgramPrivateSpace(), before = JSON.stringify(source);
  const first = f.computer.run({ ownerId: 'synthetic-a', space: source, today: '2026-11-13' });
  f.emit('message', { ...f.posted[0], rows: [{ ...row, percent: -1 }] }); assert.deepEqual(await first, []);
  const second = f.computer.run({ ownerId: 'synthetic-a', space: source, today: '2026-11-13' });
  f.emit('error', null); assert.deepEqual(await second, []); assert.equal(JSON.stringify(source), before);
  f.computer.dispose();
});
