import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { programFlowBelow, programKeyboardBarCramped, programKeyboardBarPlace, programKeyboardBarSettle, programKeyboardRoom, programVisibleBottom } from './keyboard-bar-place';

// S4 v14 phone (11/2, S4-V14-PHONE-RESULT r_0011–r_0103, Samsung Android Chrome Custom Tab): scene 3 scrolled down,
// the browser's address bar hidden. Tapping the body opened the keyboard and brought the address bar back; for the
// whole first keyboard (2 min) the writing bar was not on screen, a blank band its height left above the keyboard
// (the body had made room for it). Closing and opening the keyboard again showed it. The bar was placed from
// window.innerHeight, its containing block stayed the taller one. Operating N4 has the same code.
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', editor, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const updates: string[] = [];
(function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'update' && node.initializer
    && node.initializer.getText(tree).includes('programKeyboardBarPlace')) updates.push(node.initializer.getText(tree));
  ts.forEachChild(node, visit);
})(tree);
assert.equal(updates.length, 1);
const updateSource = ts.transpileModule(`const update = ${updates[0]};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

type Style = { values: Map<string, string>; getPropertyValue(name: string): string; setProperty(name: string, value: string): void };
const style = (): Style => ({ values: new Map(), getPropertyValue(name) { return this.values.get(name) ?? ''; }, setProperty(name, value) { this.values.set(name, value); } });

/** A phone whose fixed elements are laid out in a box `box` tall while window.innerHeight says `inner`, the keyboard
 *  leaving `visible` px of the view (the visual viewport). The bar is drawn from that box's bottom. */
function phone(box: number, inner: number, visible: number, shown = true) {
  const bar = { style: style(), getClientRects: () => shown ? [{}] : [],
    getBoundingClientRect() { const bottom = box - parseFloat(bar.style.getPropertyValue('--writing-bar-bottom') || '0'); return { top: bottom - 44, bottom, height: 44 }; } };
  const host = { style: style(), getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 120, bottom: 300, height: 180 }),
    closest: () => null, querySelector: () => null, querySelectorAll: () => [], scrollIntoView() {}, ownerDocument: { body: {} } };
  const view = { innerWidth: 390, innerHeight: inner, scrollY: 0, performance: { now: () => 0 }, getComputedStyle: () => ({}) };
  const env = { shell: { querySelector: () => null }, view, visual: { width: 390, height: visible, offsetTop: 0, offsetLeft: 0 },
    barRef: { current: bar }, roomRef: { current: { style: { height: '' } } }, noticeRef: { current: null }, editorRef: { current: { refreshViewport() {} } },
    host, fitFolderRegion() {}, programEditorVisibleHeight: (top: number, bottom: number) => bottom - top,
    programFlowBelow, programKeyboardBarCramped, programKeyboardBarPlace, programKeyboardBarSettle, programKeyboardRoom, programVisibleBottom };
  const update = new Function('env', `const { ${Object.keys(env).join(', ')} } = env; let frame = 0, nudgeUntil = 0;\n${updateSource}\nreturn update;`)(env) as () => void;
  return { bar, update, drawnBottom: () => bar.getBoundingClientRect().bottom };
}

test('N5 v14 phone: the address bar back with the keyboard (the bar\'s box 56px taller than innerHeight) — the bar is drawn on the keyboard\'s top, not under it', () => {
  // 800 tall with the address bar hidden; it comes back (56px) with a 300px keyboard: 444px of view left.
  const p = phone(800, 744, 444);
  p.update();
  assert.equal(p.drawnBottom(), 444, 'its bottom on the visible bottom');
  p.update(); p.update();
  assert.equal(p.drawnBottom(), 444, 'and it stays there through later updates');
});

test('N5 v14 phone: a box as tall as innerHeight (the keyboard closed and opened again) is unchanged — the bar stays put', () => {
  const p = phone(744, 744, 444);
  p.update();
  assert.equal(p.bar.style.getPropertyValue('--writing-bar-bottom'), '300px');
  assert.equal(p.drawnBottom(), 444);
});

test('N5 v14 phone: a box shorter than innerHeight puts the bar back down onto the visible bottom too', () => {
  const p = phone(720, 744, 444);
  p.update();
  assert.equal(p.drawnBottom(), 444);
});

test('N5 v14 phone: a hidden bar (the body not focused) is not measured or moved', () => {
  const p = phone(800, 744, 444, false);
  p.update();
  assert.equal(p.bar.style.getPropertyValue('--writing-bar-bottom'), '300px');
});

test('N5 v14 phone: the settle rule — a pixel is no move, an unknown is no move, never below the box', () => {
  assert.equal(programKeyboardBarSettle(300, 445, 444), null);
  assert.equal(programKeyboardBarSettle(300, 443.5, 444), null);
  assert.equal(programKeyboardBarSettle(300, 500, 444), 356);
  assert.equal(programKeyboardBarSettle(300, 400, 444), 256);
  assert.equal(programKeyboardBarSettle(10, 400, 444), 0);
  assert.equal(programKeyboardBarSettle(Number.NaN, 500, 444), null);
  assert.equal(programKeyboardBarSettle(300, Number.NaN, 444), null);
});
