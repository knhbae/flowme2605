import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// N1 fix 3 (S4 first screen): a new account has no documents and no position, so the writing tab shows the
// empty screen. Since R8b 2/5 the title row with the main tabs holds only the selected document's tools, so
// '새 글' lived only inside the title ▾ sheet and the first screen had nothing to write with. The empty screen
// now has its own '새 글 쓰기' (the same beginWriting). The title row with a document is unchanged.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const css = read('../../../components/flow/integrated-poc/ProgramSpace.module.css');

test('the empty first screen offers 새 글 쓰기 next to its line, through beginWriting', () => {
  const empty = space.slice(space.indexOf('<p>글과 할 일을 함께 적습니다.'), space.indexOf('</div> : <>', space.indexOf('<p>글과 할 일을 함께 적습니다.')));
  assert.match(empty, /<button type="button" className=\{styles\.emptyNewWriting\} disabled=\{preparingDocumentAction\} onClick=\{\(\) => void beginWriting\(\)\}>새 글 쓰기<\/button>/);
  // Before the Flow browsing link, so it is the first thing to press.
  assert(empty.indexOf('새 글 쓰기') < empty.indexOf('>Flow 찾기</button>'));
  assert.match(css, /\.space \.emptyNewWriting \{[^}]*background: var\(--flowme-b-primary\);[^}]*color: #fff;/);
});

test('the title row with the main tabs is unchanged', () => {
  assert(space.includes('{props.hostMainTabs ? selectedDocumentTools && <div className={styles.titleActions}>{selectedDocumentTools}</div>'));
});
