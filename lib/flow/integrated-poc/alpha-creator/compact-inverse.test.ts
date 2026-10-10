import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCreatorInverse, createCreatorInverse, CREATOR_INVERSE_SCHEMA, type CreatorInversePatch } from './compact-inverse';
import { canonicalJson } from '../alpha-persistence/json';

const padding = 'unchanged evidence '.repeat(250);
const space = (value: object) => ({ creatorWorkspace: { padding, ...value }, text: { unchanged: true } });
const compact = (changes: unknown[]) => [{ field: 'creatorWorkspace', schema: CREATOR_INVERSE_SCHEMA, changes }];
function roundtrip(before: object, after: object) {
  const beforeRaw = canonicalJson(before), afterRaw = canonicalJson(after);
  const inverse = createCreatorInverse(before, after);
  assert.deepEqual(applyCreatorInverse(after, [inverse]), before);
  const redo = createCreatorInverse(after, before);
  assert.deepEqual(applyCreatorInverse(before, [redo]), after);
  assert.equal(canonicalJson(before), beforeRaw); assert.equal(canonicalJson(after), afterRaw);
  return inverse;
}

test('small edit stores changed leaf only and supports Undo/Redo', () => {
  const inverse = roundtrip(space({ name: 'before' }), space({ name: 'after' }));
  assert('schema' in inverse);
  assert.deepEqual(inverse.changes, [{ op: 'set', path: ['name'], value: 'before' }]);
  assert(JSON.stringify(inverse).length < 200);
});
test('object missing, null, empty string, numeric keys and type changes remain distinct', () => {
  roundtrip(space({ a: null, empty: '', '0': { b: false }, scalar: [1] }), space({ other: null, '0': { b: true }, scalar: 1 }));
});
test('append history uses splice without copying earlier history', () => {
  const inverse = roundtrip(space({ log: [padding, 1] }), space({ log: [padding, 1, 'new entry'] }));
  assert('schema' in inverse);
  assert.deepEqual(inverse.changes, [{ op: 'splice', path: ['log'], expectedLength: 3, index: 2, remove: 1, values: [] }]);
});
test('array insert delete replace reorder and nested changes restore exact ordering', () => {
  for (const [a, b] of [[[1, 2], [1, 8, 2]], [[1, 8, 2], [1, 2]], [[], [null]], [[1, 2, 3], [3, 2, 1]], [[{ a: 1 }], [{ a: 2 }]]]) {
    roundtrip(space({ array: a }), space({ array: b }));
  }
});
test('root missing, null, scalar, arrays, small replacement and other fields use legacy format', () => {
  for (const [before, after] of [[{}, { creatorWorkspace: {} }], [{ creatorWorkspace: null }, { creatorWorkspace: {} }], [{ creatorWorkspace: {} }, {}], [{ creatorWorkspace: [] }, { creatorWorkspace: {} }], [{ creatorWorkspace: { a: 1 } }, { creatorWorkspace: { a: 2 } }]]) {
    assert(!('schema' in roundtrip(before, after)));
  }
  const before = { text: { long: padding } }, after = { text: null };
  const inverse = createCreatorInverse(before, after, 'text');
  assert(!('schema' in inverse)); assert.deepEqual(applyCreatorInverse(after, [inverse]), before);
});
test('unchanged fields retain compatible legacy form; whole-field legacy remains readable', () => {
  const input = space({ value: 1 }); const inverse = createCreatorInverse(input, input);
  assert(!('schema' in inverse)); assert.deepEqual(applyCreatorInverse(input, [inverse]), input);
  assert.deepEqual(applyCreatorInverse({}, [{ field: 'creatorWorkspace', present: true, value: null }]), { creatorWorkspace: null });
});
test('dense changes fall back to legacy without losing any field', () => {
  const a = Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`x${i}`, 1]));
  const b = Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`x${i}`, 2]));
  assert(!('schema' in roundtrip(space(a), space(b))));
});

const invalid: [string, unknown[]][] = [
  ['empty path', [{ op: 'set', path: [], value: 1 }]],
  ['nonstring path', [{ op: 'set', path: [0], value: 1 }]],
  ['unsafe path', [{ op: 'set', path: ['__proto__', 'polluted'], value: 1 }]],
  ['missing parent', [{ op: 'set', path: ['absent', 'x'], value: 1 }]],
  ['scalar parent', [{ op: 'set', path: ['value', 'x'], value: 1 }]],
  ['index leading zero', [{ op: 'set', path: ['array', '01'], value: 1 }]],
  ['negative array index', [{ op: 'set', path: ['array', '-1'], value: 1 }]],
  ['array append index', [{ op: 'set', path: ['array', '1'], value: 1 }]],
  ['array exponent index', [{ op: 'set', path: ['array', '1e0'], value: 1 }]],
  ['array remove forbidden', [{ op: 'remove', path: ['array', '0'] }]],
  ['remove missing', [{ op: 'remove', path: ['absent'] }]],
  ['set noop', [{ op: 'set', path: ['value'], value: 1 }]],
  ['unknown op', [{ op: 'move', path: ['value'], value: 2 }]],
  ['extra member', [{ op: 'set', path: ['value'], value: 2, extra: true }]],
  ['missing value', [{ op: 'set', path: ['value'] }]],
  ['duplicate path', [{ op: 'set', path: ['value'], value: 2 }, { op: 'set', path: ['value'], value: 3 }]],
  ['ancestor overlap', [{ op: 'set', path: ['obj'], value: { x: 2 } }, { op: 'set', path: ['obj', 'x'], value: 3 }]],
  ['descendant overlap', [{ op: 'set', path: ['obj', 'x'], value: 2 }, { op: 'set', path: ['obj'], value: { x: 3 } }]],
  ['splice length mismatch', [{ op: 'splice', path: ['array'], expectedLength: 2, index: 0, remove: 1, values: [] }]],
  ['splice bad index', [{ op: 'splice', path: ['array'], expectedLength: 1, index: 2, remove: 0, values: [1] }]],
  ['splice bad remove', [{ op: 'splice', path: ['array'], expectedLength: 1, index: 0, remove: 2, values: [] }]],
  ['splice fractional index', [{ op: 'splice', path: ['array'], expectedLength: 1, index: 0.5, remove: 0, values: [1] }]],
  ['splice negative index', [{ op: 'splice', path: ['array'], expectedLength: 1, index: -1, remove: 0, values: [1] }]],
  ['splice noop', [{ op: 'splice', path: ['array'], expectedLength: 1, index: 0, remove: 1, values: [1] }]],
  ['splice wrong target', [{ op: 'splice', path: ['obj'], expectedLength: 0, index: 0, remove: 0, values: [1] }]],
  ['splice child overlap', [{ op: 'splice', path: ['array'], expectedLength: 1, index: 1, remove: 0, values: [2] }, { op: 'set', path: ['array', '0'], value: 3 }]],
  ['empty changes', []],
];
for (const [name, changes] of invalid) test(`reject ${name} without mutation`, () => {
  const input = space({ value: 1, array: [1], obj: { x: 1 } }), raw = canonicalJson(input);
  assert.throws(() => applyCreatorInverse(input, compact(changes)));
  assert.equal(canonicalJson(input), raw);
});
test('unknown schema, hybrid entry, wrong field, duplicate fields, invalid legacy and excessive patches reject', () => {
  const entry = compact([{ op: 'set', path: ['value'], value: 2 }])[0];
  for (const entries of [[{ ...entry, schema: 'future' }], [{ ...entry, present: true }], [{ ...entry, field: 'text' }], [entry, entry], [{ field: 'creatorWorkspace', present: false, value: null }], [{ field: 'creatorWorkspace', present: true }], compact(Array.from({ length: 4097 }, (_, i) => ({ op: 'set', path: [`x${i}`], value: 1 })))]) {
    assert.throws(() => applyCreatorInverse(space({ value: 1 }), entries));
  }
});
test('untrusted non-JSON getter and non-finite values reject before execution', () => {
  let accessed = false;
  const input = { get creatorWorkspace() { accessed = true; return {}; } };
  assert.throws(() => createCreatorInverse(input, space({})));
  assert.equal(accessed, false);
  assert.throws(() => applyCreatorInverse(space({}), compact([{ op: 'set', path: ['value'], value: Infinity }])));
});
test('seeded property: 300 nested mixed object/array mutations preserve before/after exactly', () => {
  let seed = 0x72c0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  function value(depth = 0): any {
    const choice = Math.floor(random() * (depth > 3 ? 4 : 6));
    if (choice === 0) return null;
    if (choice === 1) return random() > .5;
    if (choice === 2) return Math.floor(random() * 30);
    if (choice === 3) return `내용-${Math.floor(random() * 30)}`;
    if (choice === 4) return Array.from({ length: Math.floor(random() * 5) }, () => value(depth + 1));
    return Object.fromEntries(Array.from({ length: Math.floor(random() * 5) }, (_, i) => [`key${i}`, value(depth + 1)]));
  }
  for (let i = 0; i < 300; i++) roundtrip(space({ value: value() }), space({ value: value() }));
});
