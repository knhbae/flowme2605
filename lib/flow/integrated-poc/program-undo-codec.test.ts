import test from 'node:test';
import assert from 'node:assert/strict';
import { expandProgramUndo, shareProgramUndo, PROGRAM_UNDO_CODEC } from './program-undo-codec';
const wire = (nodes: unknown[], root = nodes.length - 1) => ({ codec: PROGRAM_UNDO_CODEC, nodes, root });
const expand = (value: unknown, budget = 30_000_000) => expandProgramUndo(JSON.parse(JSON.stringify(value)), budget);

test('UC01 small legacy maps retain their format and reading never migrates', () => {
 const legacy = { a: [{ title: 'small' }] };
 assert.equal(shareProgramUndo(legacy), legacy); assert.equal(expandProgramUndo(legacy, 100), legacy);
});
test('UC02 shared wire roundtrips CRLF, Unicode, unknown fields and scalar types without object aliases', () => {
 const snapshot = { raw: '한글 👩‍💻\r\n[] \" \\'.repeat(1000), nested: { array: [null, true, false, 1, 0.25, ''] } };
 const history = { a: Array.from({ length: 80 }, (_, i) => ({ label: String(i), workspace: snapshot })) };
 const shared = shareProgramUndo(history) as { codec: string };
 assert.equal(shared.codec, PROGRAM_UNDO_CODEC);
 assert(JSON.stringify(shared).length < JSON.stringify(history).length / 10);
 const restored = expand(shared) as typeof history; assert.deepEqual(restored, history);
 restored.a[0].workspace.nested.array.push('edited');
 assert.equal(restored.a[1].workspace.nested.array.length, 6); assert.equal(snapshot.nested.array.length, 6);
});
test('UC03 deterministic structural sharing disregards object insertion order, not array order', () => {
 const raw = 'original'.repeat(2000);
 const a = { a: [{ x: raw, y: [1, 2] }, { y: [1, 2], x: raw }] };
 const b = { a: [{ y: [1, 2], x: raw }, { x: raw, y: [1, 2] }] };
 assert.deepEqual(shareProgramUndo(a), shareProgramUndo(b));
 assert.notDeepEqual(shareProgramUndo(a), shareProgramUndo({ a: [{ x: raw, y: [2, 1] }] }));
});
test('UC04 future codecs, wrong tags, malformed scalars and node shapes fail closed', () => {
 for (const invalid of [{ ...wire([[0, null]]), codec: 'future/9' }, { ...wire([[0, null]]), extra: true }, wire([]), wire([[3, null]]), wire([[0, {}]]), wire([[0, null, 1]]), wire([[1, 'not-array']]), wire([[2, {}]])]) assert.throws(() => expand(invalid));
 assert.throws(() => expandProgramUndo(wire([[0, Infinity]]), 100));
});
test('UC05 self, forward, fractional, negative and out-of-range references are rejected', () => {
 for (const ref of [0, 1, -1, 0.5, '0', null, 999999]) assert.throws(() => expand(wire([[1, [ref]]])));
 for (const root of [-1, 0.5, 1, null, '0']) assert.throws(() => expand(wire([[0, null]], root as number)));
});
test('UC06 duplicate or unsorted properties and unused nodes are rejected', () => {
 for (const pairs of [[['a', 0], ['a', 0]], [['b', 0], ['a', 0]], [['a']], [[1, 0]]]) assert.throws(() => expand(wire([[0, null], [2, pairs]])));
 assert.throws(() => expand(wire([[0, 'unused'], [0, 'used']])));
});
test('UC07 tiny exponential expansion bombs are rejected before hydration', () => {
 const nodes: unknown[] = [[0, 'x']]; for (let i = 1; i < 35; i++) nodes.push([1, [i - 1, i - 1]]);
 assert.throws(() => expand(wire(nodes)), /expanded-size/);
});
test('UC08 expanded UTF8 budget includes punctuation, keys and multi-byte text exactly', () => {
 const value = { 가: ['한글😀', null] }, rawBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
 const shared = wire([[0, '한글😀'], [0, null], [1, [0, 1]], [2, [['가', 2]]]]);
 assert.deepEqual(expand(shared, rawBytes), value); assert.throws(() => expand(shared, rawBytes - 1));
});
test('UC09 depth is bounded even when expanded bytes are small', () => {
 const nodes: unknown[] = [[0, null]]; for (let i = 1; i < 130; i++) nodes.push([1, [i - 1]]);
 assert.throws(() => expand(wire(nodes)), /expanded-size/);
});
test('UC10 special JSON property names remain own data without prototype pollution', () => {
 const restored = expand(wire([[0, true], [2, [['polluted', 0]]], [2, [['__proto__', 1], ['constructor', 0]]]])) as Record<string, unknown>;
 assert(Object.hasOwn(restored, '__proto__')); assert.equal(restored.constructor, true);
 assert.equal(({} as Record<string, unknown>).polluted, undefined); assert.equal(Object.getPrototypeOf(restored), Object.prototype);
});
