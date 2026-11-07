import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programFlowBelow } from './keyboard-bar-place';

// 17px fix (since 10/08): the body was sized to end 12px above the bottom tab, while the page still laid out the
// work pane's bottom padding (20) and its own (104) below it, so the writing page was 11-36px taller than the screen
// (390: 17, 1280: 58). Scrolled, the body measured from a higher top grew and the page with it. Now, while no
// keyboard is up, the body also leaves room for what the page lays out below it and is measured from the page's top.
type Node = { name: string; parentElement: Node | null; nextElementSibling: Node | null; rect: { top: number; bottom: number; height: number };
  style: Partial<Record<'display' | 'position' | 'marginTop' | 'marginBottom' | 'paddingBottom' | 'borderBottomWidth', string>>; getBoundingClientRect(): Node['rect'] };
function node(name: string, top: number, height: number, style: Node['style'] = {}): Node {
  const made: Node = { name, parentElement: null, nextElementSibling: null, rect: { top, bottom: top + height, height }, style, getBoundingClientRect: () => made.rect };
  return made;
}
function within(parent: Node, ...children: Node[]) { children.forEach((child, index) => { child.parentElement = parent; child.nextElementSibling = children[index + 1] ?? null; }); return parent; }
const style = (entry: object) => ({ display: 'block', position: 'static', marginTop: '0px', marginBottom: '0px', paddingBottom: '0px', borderBottomWidth: '0px', ...(entry as Node).style });

test('the page height below the body: what follows it in flow, and the bottom paddings up to the page', () => {
  // 390, writing: body, the notice row (50) and the room under it (53) in the editor; the work pane's padding 20,
  // the page's 104. The writing bar is fixed, the menu sheet hidden, a side column beside the body.
  const body = node('body', 0, 2000, { paddingBottom: '0px' }), page = node('main', 0, 860, { paddingBottom: '104px' });
  const pane = node('workPane', 8, 748, { paddingBottom: '20px' }), editor = node('section', 28, 700), host = node('host', 144, 540);
  const notices = node('notices', 684, 50), room = node('room', 734, 53), bar = node('bar', 719, 49, { position: 'fixed' });
  const side = node('side', 144, 300), sheet = node('sheet', 0, 0, { display: 'none' }), header = node('header', 0, 64, { position: 'fixed' });
  within(body, page); within(page, header, pane, sheet); within(pane, editor); within(editor, side, host, notices, bar, room);
  // The side column sits beside the body, not below it; it comes before it here anyway.
  assert.equal(programFlowBelow(host, body, style), 50 + 53 + 20 + 104);
  // Nothing shown under the body: the paddings alone (the 124 that made the page too tall).
  notices.style = { display: 'none' }; room.style = { display: 'none' };
  assert.equal(programFlowBelow(host, body, style), 124);
  // A column beside it after it in the markup is not below it; margins below count.
  const beside = node('beside', 150, 400);
  within(editor, host, beside); host.style = { marginBottom: '6px' };
  assert.equal(programFlowBelow(host, body, style), 6 + 124);
});

test('the editor fits the body to the screen while no keyboard is up, measured from the page top', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const update = editor.slice(editor.indexOf('const update = () => {\n      frame = 0;'), editor.indexOf('const observer = new ResizeObserver(schedule);'));
  assert.match(update, /const keyboard = programVisibleBottom\(view, visual, null\) < view\.innerHeight;/);
  assert.match(update, /const below = keyboard \? null : programFlowBelow\(host, host\.ownerDocument\.body, node => view\.getComputedStyle\(node as Element\)\);/);
  assert.match(update, /const top = host\.getBoundingClientRect\(\)\.top \+ \(keyboard \? 0 : view\.scrollY\);/);
  assert.match(update, /const height = programEditorVisibleHeight\(top, below === null \? bottom : Math\.min\(bottom, view\.innerHeight - below \+ 12\), Number\.isFinite\(line\) \? line : undefined, Number\.isFinite\(pad\) \? pad : undefined\);/);
  // The W2 notices still come off the bottom first; fix 5's room is set before (it is below the body too).
  assert(update.indexOf('bottom -= notice') < update.indexOf('const height = programEditorVisibleHeight('));
  assert(update.indexOf('room.style.height = height') < update.indexOf('const below = '));
});
