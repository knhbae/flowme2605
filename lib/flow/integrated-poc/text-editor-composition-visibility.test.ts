import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
function section(start: string, end: string) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a);
  return source.slice(a, b);
}

// Execute shipped geometry and event callbacks. This is not a native IME test.
function fixture() {
  const paints = new Map<string, string>(), classes = new Set<string>(), events = new Map<string, (event?: any) => void>();
  const textarea = { value: '[2026-09-30]\n- [ ] 입력\n- [ ] 다음', selectionStart: 20, selectionEnd: 20,
    selectionDirection: 'none', scrollTop: 30, scrollLeft: 0, style: { setProperty: (name: string, value: string) => paints.set(name, value) } };
  const writes: string[] = [];
  const context = vm.createContext({ textarea, rows: [{ offsetTop: 20, offsetHeight: 44 }, { offsetTop: 64, offsetHeight: 88 }, { offsetTop: 152, offsetHeight: 44 }],
    composing: false, compositionAnchor: 0, destroyed: false, mode: 'live', selection: { start: 20, end: 20, direction: 'none' },
    lastReported: textarea.value, config: { onChange: (raw: string) => writes.push(raw) }, root: { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } },
    foldedIds: new Set(), moveState: null, gesture: null, nextTabLeaves: false, nativeDepth: 0, pendingChange: false, doc: {}, viewport: {},
    cancelMove() {}, unfoldAll() {}, captureBlurReveal() {}, scheduleRender() {}, syncGeometry() {}, onKeydown() {}, maybeRequestPicker() {},
    listen: (_target: unknown, name: string, handler: (event?: any) => void) => events.set(name, handler),
    renderCount: 0 });
  vm.runInContext(section('    function remember() {', '    function scheduleRender() {') +
    section('    function syncCompositionGeometry() {', '    function syncGeometry() {') +
    'function render() { renderCount++; syncCompositionGeometry(); }' +
    section("    listen(textarea, 'input',", "    listen(doc, 'selectionchange',"), context);
  return { context, textarea, paints, classes, events, writes };
}

test('composition keeps the native buffer, caret and scroll while masking only its wrapped row', () => {
  const f = fixture(), before = { ...f.textarea };
  f.events.get('compositionstart')!();
  assert(f.classes.has('tle-composing'));
  assert.equal(f.paints.get('--tle-composition-top'), '34px');
  assert.equal(f.paints.get('--tle-composition-bottom'), '122px');
  assert.deepEqual(f.textarea, before);
  assert.equal(f.writes.length, 0);
  f.textarea.scrollTop = 80;
  vm.runInContext('syncCompositionGeometry()', f.context);
  assert.equal(f.paints.get('--tle-composition-top'), '0px');
  assert.equal(f.paints.get('--tle-composition-bottom'), '72px');
});

test('composition paint covers a multiline selection and updates wrapping without rewriting input', () => {
  const f = fixture(); f.textarea.selectionStart = 13; f.textarea.selectionEnd = 27;
  f.events.get('compositionstart')!();
  assert.equal(f.paints.get('--tle-composition-top'), '34px');
  assert.equal(f.paints.get('--tle-composition-bottom'), '166px');
  f.context.rows[1].offsetHeight = 132; f.context.rows[2].offsetTop = 196;
  f.textarea.selectionEnd = 20;
  f.events.get('input')!({ isComposing: true });
  assert.equal(f.paints.get('--tle-composition-bottom'), '166px');
  assert.equal(f.writes.length, 0);
});

test('unfinished composition never publishes; end publishes exact input once despite the trailing input event', () => {
  const f = fixture(); f.events.get('compositionstart')!();
  const raw = f.textarea.value.replace('입력', '한글 입력');
  f.textarea.value = raw;
  f.events.get('input')!({ isComposing: true, inputType: 'insertCompositionText' });
  f.events.get('input')!({ isComposing: false, inputType: 'insertText' });
  assert.equal(f.writes.length, 0); assert.equal(f.textarea.value, raw);
  f.events.get('compositionend')!();
  assert(!f.classes.has('tle-composing'));
  assert.deepEqual(f.writes, [raw]);
  f.events.get('input')!({ isComposing: false, inputType: 'insertText' });
  assert.deepEqual(f.writes, [raw]); assert.equal(f.textarea.value, raw);
});

test('composition CSS preserves surrounding mirror geometry and only hides active mirror rows', () => {
  assert.doesNotMatch(css, /\.tle-composing\s+\.tle-viewport\s*\{[^}]*visibility:\s*hidden/);
  assert.match(css, /\.tle-line-composition\s*\{\s*visibility:\s*hidden;/);
  assert.doesNotMatch(css, /\.tle-line-composition\s*\{[^}]*display:\s*none/);
  assert.match(css, /mask-image:\s*linear-gradient\(to bottom,[^;]*--tle-composition-top[^;]*--tle-composition-bottom/);
  assert.match(source, /if \(composing && active && mode === 'live'\) row\.classList\.add\('tle-line-composition'\)/);
  assert.match(source, /mirror\.style\.width =[^;]+;[\s\S]*?syncCompositionGeometry\(\);/);
  assert.doesNotMatch(section('    function syncCompositionGeometry() {', '    function syncGeometry() {'), /setSelectionRange|\.value\s*=|\.focus\(|\.blur\(|publish\(/);
});

test('composition still blocks programmatic replacement, indentation, undo, movement and actions', () => {
  for (const name of ['replaceRange(start, end, text, settings)', 'indent(outdent)', 'undo()', 'action(kind, lineIndex, details)']) {
    const body = source.slice(source.indexOf(`    function ${name} {`));
    assert.match(body.slice(0, body.indexOf('\n', body.indexOf('\n') + 1)), /composing/);
  }
  assert.match(source, /if \(composing \|\| event\.isComposing \|\| event\.keyCode === 229 \|\| event\.defaultPrevented\) return/);
  assert.match(source, /const actionsDisabled = composing \|\|/);
  assert.match(source, /if \(destroyed \|\| composing \|\| event\.button !== 0/);
});
