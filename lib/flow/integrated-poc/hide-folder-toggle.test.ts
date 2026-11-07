import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// PRD X1~X4 (user's choice 11/8): the writing head's 날짜별 | 폴더별 and its folder chips are held back until the folder
// screen is redesigned. A folder line's ⋮ entrances and the 분류 tab stay; nothing stored changes.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const space = read('components/flow/integrated-poc/ProgramSpace.tsx'), editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx');

test('the switch and its chips are off; their only reader of the kept folder goes with them', () => {
  assert.match(space, /export const PROGRAM_WRITING_VIEW_SWITCH = false;/);
  const fn = space.slice(space.indexOf('function viewSwitch('), space.indexOf('function recentLine('));
  assert(fn.indexOf('!PROGRAM_WRITING_VIEW_SWITCH') < fn.indexOf('data-view-switch'), 'nothing is drawn before the flag is read');
  assert.equal(space.split('lastViewFolder(').length - 1, 2, 'read only inside the switch (and declared)');
});

test('the ⋮ entrances stay: 이 폴더만 모아 보기 gathers through changeFolder; 분류에서 이 폴더 보기 opens 분류', () => {
  assert(space.includes('onGatherFolder={collectionMode ? undefined : scopeId => {'));
  assert(space.includes("onOpenScope={scopeId => { if (space.text.folders.some(item => item.id === scopeId)) { if (collectionMode)"));
  assert(editor.includes('data-gather-folder'), 'the ⋮ menu item');
  assert(editor.includes('data-gather-end'), '전체 보기 in the gathered view');
});
