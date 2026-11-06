import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { programFencedRecoveryRaw } from './recovery-restore';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPrivateSpace } from './program-data';

// P3 (11/7): 복구함 › 새 문서로 복구 refused kept input with an unfinished '- [' ('해결하지 않은 변경이 있습니다').
// Such input now goes in whole between fence lines, every character as it was; nothing is fixed.
const store = (raw: string) => {
  const empty = M.addDocument(createProgramPrivateSpace().text, { title: 't', folderId: 'folder-unfiled' }), id = empty.documents.at(-1)!.id;
  const next = M.editText(empty, id, raw);
  return next === empty ? null : M.raw(M.getDocument(next, id));
};

test('the grammar refuses an unfinished checkbox as it is (why the fence is needed)', () => {
  for (const raw of ['- [', '할 일\n- [', '- [x', '- [ ]\n- [ ', '  - [']) assert.equal(store(raw), null, raw);
  for (const raw of ['- [ ] 장보기', '- [ 반쯤', '메모']) assert.equal(store(raw), raw, raw);
});

test('between fence lines every line is kept as typed, and the text inside is the kept input exactly', () => {
  for (const raw of ['- [', '# 제목\n- [ ] 장보기\n- [\n  - [x\n본문', '- [\r\n다음 줄', '앞\n```\n- [\n```\n뒤', '````js\n- [\n````', '~~~\n- [']) {
    const fenced = programFencedRecoveryRaw(raw), kept = store(fenced);
    assert.equal(kept, fenced, `stored as given: ${JSON.stringify(raw)}`);
    const lines = fenced.split('\n'), fence = lines[0];
    assert.equal(lines.at(-1), fence);
    assert.equal(lines.slice(1, -1).join('\n'), raw.replace(/\r\n?/g, '\n'), 'no character changed');
    assert(!raw.split(/\r?\n/).some(line => /^ *`+/.test(line) && /^ *(`+)/.exec(line)![1].length >= fence.length), 'no line can close it early');
  }
});

test('restoreDraft tries the input as it is first, and fences it only when the grammar refuses it (unresolved)', () => {
  const source = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/AlphaWorkspace.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const at = source.indexOf('  async function restoreDraft('), restore = source.slice(at, source.indexOf('\n  }\n', at));
  assert(restore.includes('const plain = restore(current, draft.raw);'));
  assert(restore.includes("fenced = !plain.ok && plain.reason === 'unresolved';"));
  assert(restore.includes('return fenced ? restore(current, programFencedRecoveryRaw(draft.raw)) : plain;'));
  assert(restore.includes('원문 전체를 ``` 줄 사이에 글자 그대로 넣었습니다.'));
});
