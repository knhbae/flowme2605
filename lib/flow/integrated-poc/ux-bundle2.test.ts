import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramPublicRepository } from './contract';
import { alphaSocialConflictView } from './alpha-conflict-social';

// UX 2차 묶음 (11/7, spec ux-bundle2-spec 2350): ③ the Flow screens on the app's tokens, B6 one word for each thing
// (a public Flow's 버전, a document's 저장본, the 이야기 tab), B8 a refused post shown as written, not as a command.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const C = 'components/flow/integrated-poc/';

test('③: the Flow screens use the app tokens only, one primary color and no beige panel', () => {
  for (const name of ['ProgramDiscovery.module.css', 'ProgramCommunity.module.css']) {
    const css = read(C + name);
    assert.deepEqual(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [], [], `${name}: no color literal`);
  }
  const discovery = read(C + 'ProgramDiscovery.module.css');
  assert(discovery.includes('.page .primary{background:var(--flowme-b-primary);border-color:var(--flowme-b-primary)}'), 'the primary button is the writing screens\' blue');
  assert(discovery.includes('.page{max-width:1120px;background:var(--flowme-b-surface);'), 'no beige panel');
  assert(!discovery.includes('system-ui'), 'the frame font is inherited');
  assert(discovery.includes('box-shadow:0 12px 40px var(--flowme-b-shadow)'));
});

test('B6: the screens say 버전 for a public Flow, 저장본 for a saved document, 이야기 for the stories tab', () => {
  const files = ['lib/flow/integrated-poc/program-copy-header.ts', 'lib/flow/integrated-poc/program-discovery-display.ts',
    ...['ProgramDiscovery', 'ProgramCommunity', 'ProgramProposalReview', 'ProgramPublisher', 'ProgramCopyInspector', 'ProgramCopyProposal',
      'ProgramSpace', 'ProgramRevisionHistory', 'AlphaWorkspace', 'AlphaConflictReview'].map(name => `${C}${name}.tsx`)];
  for (const file of files) {
    const code = read(file).split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line)).map(line => line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')).join('\n');
    for (const word of ['판본', '경험·질문·지식', '다른 사람의 Flow 둘러보기']) assert(!code.includes(word), `${file}: ${word}`);
    assert(!/\d판|\}판/.test(code), `${file}: N판`);
  }
  assert(read('lib/flow/integrated-poc/program-copy-header.ts').includes("'Flow에서 가져옴' + (base ? ' · 버전 ' + base.number : '')"));
  const history = read(C + 'ProgramRevisionHistory.tsx');
  assert(history.includes('>문서 저장본</h2>') && history.includes('<h3>지금 내용을 저장본으로 남기기</h3>') && history.includes('-저장본.txt`'));
  assert(!history.includes('버전'), 'a saved document is never called 버전');
  assert(read(C + 'ProgramSpace.tsx').includes('>저장본·복구</button>'));
  assert(read(C + 'ProgramCommunity.tsx').includes('>버전 {version.number} · {stamp(version.createdAt)}</option>'));
  assert.equal(read(C + 'AlphaWorkspace.tsx').split('>이야기</button>').length - 1, 2);
});

const repository = { flows: [{ id: 'flow-a', ownerId: 'member-x', currentVersionId: 'flow-a-v2', category: '', situations: [], derivedFrom: null, archived: false }],
  versions: [{ id: 'flow-a-v1', title: '근력 운동 1' }, { id: 'flow-a-v2', title: '근력·유산소 운동 반복하기' }], posts: [], replies: [], reactions: [], proposals: [] } as unknown as ProgramPublicRepository;

test('B8: a refused post or review is its title, its body and the Flow it names; nothing of the command', () => {
  const draft = { id: 'draft-1', kind: 'experience', title: '해 봤어요 · 근력·유산소 운동 반복하기', body: '일주일 해 봤습니다.', topic: '', postId: null,
    flowId: 'flow-a', versionId: null, itemId: null, cursor: { start: 18, end: 18 }, editTargetId: 'post-9', evidencePostIds: ['post-1'] };
  const view = alphaSocialConflictView({ type: 'participation-save', draft, expected: null } as never, repository);
  assert.equal(view.text, '해 봤어요 · 근력·유산소 운동 반복하기\n\n일주일 해 봤습니다.\n\n연결: 근력·유산소 운동 반복하기');
  for (const hidden of ['{', '"draft"', 'cursor', 'editTargetId', 'evidencePostIds', 'post-9', 'post-1']) assert(!view.text!.includes(hidden), hidden);
  assert.equal(view.note, '이 글은 공개되지 않았습니다. 내용을 복사해 두고, 최신 화면에서 다시 공개해 주세요.');
  // A reply has no title: its body alone; a named version wins over the Flow's current one; no public rows, no 연결.
  const reply = alphaSocialConflictView({ type: 'participation-submit', draft: { ...draft, kind: 'reply', title: '', versionId: 'flow-a-v1' }, expected: null } as never, repository);
  assert.equal(reply.text, '일주일 해 봤습니다.\n\n연결: 근력 운동 1');
  assert.equal(alphaSocialConflictView({ type: 'participation-save', draft, expected: null } as never, null).text, '해 봤어요 · 근력·유산소 운동 반복하기\n\n일주일 해 봤습니다.');
});

test('B8: any other public request is one sentence, with no text box', () => {
  assert.deepEqual(alphaSocialConflictView({ type: 'copy-import', versionId: 'flow-a-v2', itemIds: [], anchor: null } as never, repository),
    { text: null, note: '‘근력·유산소 운동 반복하기’ 가져오기 요청이 저장되지 않았습니다.' });
  assert.equal(alphaSocialConflictView({ type: 'publication-archive', documentId: 'd', flowId: 'flow-a', expectedVersionId: 'flow-a-v2' } as never, repository).note,
    '‘근력·유산소 운동 반복하기’ 공개 철회 요청이 저장되지 않았습니다.');
  assert.equal(alphaSocialConflictView({ type: 'copy-anchor', copyId: 'c', anchor: null } as never, repository).note, '요청이 저장되지 않았습니다.');
});

test('B8: the screen around it speaks of what changed elsewhere and of my own words', () => {
  const review = read(C + 'AlphaConflictReview.tsx') + read('lib/flow/integrated-poc/alpha-conflict-social.ts');
  assert(!review.includes('JSON.stringify'), 'no raw command');
  for (const text of ['지금 저장된 내용', '내가 쓴 내용', '저장된 쪽에는 이 문서가 없습니다.', '저장된 내용을 아직 불러오지 못했습니다.', '내가 쓴 쪽에는 이 문서가 없습니다.',
    '>내 내용 복사</button>', '함께 바뀐 것', '저장된 내용을 아직 불러오지 못해 내가 쓴 내용만 보입니다.', '달라진 내용이 없습니다. [최신 내용 열기]를 눌러 주세요.',
    '내가 쓴 내용과 저장된 내용을 비교하지 못했습니다. 지금 쓴 내용을 복사해 두세요.', "personalAuthoring:'내 Flow의 버전·실행·반복'", "draftRevisions: '문서 저장본'",
    '만들던 Flow는 자동으로 합치지 않습니다. 내용을 복사해 두고 최신 화면에서 확인해 주세요.']) assert(review.includes(text), text);
  for (const old of ['서버 현재 원문', '저장하려던 원문', '내 원문 복사', '공개·참여 작업 보관본', '함께 확인할 변경']) assert(!review.includes(old), old);
  const workspace = read(C + 'AlphaWorkspace.tsx');
  assert(workspace.includes('<h2>다른 곳에서 먼저 바뀐 내용이 있습니다</h2><p>지금 쓴 내용은 이 기기에 남겨 두었습니다. 최신 내용을 연 뒤 필요하면 다시 붙여 넣으세요.</p>'));
  assert(workspace.includes("conflict: '다른 곳에서 먼저 저장했습니다',"));
  assert(!workspace.includes('입력 보관 후 최신 내용 열기'));
  assert(workspace.includes('publicRepository={snapshot.references?.public ?? data?.public}'));
});
