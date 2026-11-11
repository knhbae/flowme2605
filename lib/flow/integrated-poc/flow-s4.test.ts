import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramLinkMemo, createProgramDocument } from './private-space';
import { setProgramDocumentTrashed } from './document-lifecycle';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPublicationDraft } from './publication-editor';
import { programCanonicalLink, programDocumentSourceLink, programFlowsByLink, programLinkHome, programLinkKey, programLinkMemoRaw, programLooksLikeLink } from './link-lookup';

// Flow pipeline stage 4 (S8): a pasted link finds the public Flows made from it, from the public list already on this
// device; with none, the link is kept under today in my writing, or a Flow is started from it.
const ACTOR = 'local-user', OWNER = 'creator-minji', NOW = '2026-11-08T00:00:00.000Z', TODAY = '2026-11-08';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: ACTOR, requestId: `s4-${++request}`, expectedSpace: data.spaces[ACTOR] });
const item = (id: string, title: string, sourceUrl: string | null = null): ProgramPublicItem => ({ id, title, description: '', completionCriteria: '', sourceUrl, schedule: { kind: 'undated' }, subchecks: [] });
function catalog() {
  const data = createProgramData();
  const add = (id: string, title: string, url: string | null, items: ProgramPublicItem[], archived = false) => {
    data.public.flows.push({ id, ownerId: OWNER, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title, summary: '합성', items, createdBy: OWNER, createdAt: NOW,
      source: { kind: 'user-text', label: '글', url, checkedAt: null } });
  };
  add('moving', '이사 준비 2주', 'https://www.example.com/moving-checklist/', [item('a', '짐 목록')]);
  add('pack', '짐 싸기 요령', null, [item('b', '상자 고르기'), item('c', '목록 붙이기', 'https://example.com/moving-checklist')]);
  add('old', '예전 이사 Flow', 'https://example.com/moving-checklist', [item('d', '옛 할 일')], true);
  add('video', '정리 영상 따라 하기', 'https://youtu.be/AbC123', [item('e', '보기')]);
  assert(validateProgramData(data));
  return data;
}

test('a link, not words: http(s) or www.; the key folds www/m, the trailing slash, tracking, the fragment and youtu.be', () => {
  assert.deepEqual(['https://example.com/a', 'www.example.com/a', 'http://x.kr', '이사 준비', 'example com'].map(programLooksLikeLink), [true, true, true, false, false]);
  const key = programLinkKey('https://www.example.com/moving-checklist/?utm_source=x#top');
  assert.equal(key, programLinkKey('http://example.com/moving-checklist'));
  assert.equal(key, programLinkKey('https://m.example.com/moving-checklist'));
  assert.equal(key, programLinkKey('www.example.com/moving-checklist'));
  assert.notEqual(key, programLinkKey('https://example.com/moving'));
  assert.equal(programLinkKey('https://youtu.be/AbC123'), programLinkKey('https://www.youtube.com/watch?v=AbC123&t=30s'));
  assert.equal(programLinkKey('https://youtube.com/shorts/AbC123'), programLinkKey('https://youtu.be/AbC123'));
  assert.deepEqual(['http://localhost/a', 'https://user:pw@example.com/a', 'https://example.com/?token=1', 'javascript:alert(1)'].map(programCanonicalLink), [null, null, null, null], 'not kept: as the address search refuses them');
});

test('the Flows made from a link: the Flow\'s own source first, then an item\'s; one taken back is not listed', () => {
  const data = catalog();
  const found = programFlowsByLink(data, 'https://example.com/moving-checklist?utm_campaign=share');
  assert.deepEqual(found.map(row => [row.flow.id, row.on, row.items]), [['moving', 'flow', []], ['pack', 'item', ['목록 붙이기']]]);
  assert.deepEqual(programFlowsByLink(data, 'https://www.youtube.com/watch?v=AbC123').map(row => row.flow.id), ['video']);
  assert.deepEqual(programFlowsByLink(data, 'https://example.com/other'), []);
  assert.deepEqual(programFlowsByLink(data, 'http://localhost/moving-checklist'), []);
});

test('a scheme-less video link is searched, kept, and compared as the same safe https address', () => {
  for (const link of ['youtube.com/watch?v=AbC123', 'm.youtube.com/shorts/AbC123', 'youtu.be/AbC123']) {
    assert.equal(programLooksLikeLink(link), true);
    assert.equal(programLinkKey(link), programLinkKey('https://www.youtube.com/watch?v=AbC123'));
    assert.deepEqual(programFlowsByLink(catalog(), link).map(row => row.flow.id), ['video']);
    assert.equal(programLinkMemoRaw('', TODAY, link), `[${TODAY}]\n- ${programCanonicalLink(link)}`);
  }
  assert.equal(programCanonicalLink('  YOUTUBE.COM/watch?v=AbC123  '), 'https://youtube.com/watch?v=AbC123');
  for (const text of ['youtube.com.example.com/watch?v=AbC123', 'youtube.com@localhost/watch', 'youtube.com 영상', 'javascript:youtube.com']) {
    assert.equal(programLooksLikeLink(text), false);
    assert.equal(programCanonicalLink(text), null);
  }
  assert.equal(programCanonicalLink('youtube.com/watch?token=private'), null, 'adding a scheme does not bypass the safe-link gate');
});

test('[내 글에 링크로 두기]: under today\'s head (at its end), or a new head for today where no line moves', () => {
  assert.equal(programLinkMemoRaw('[2026-11-08]\n- [ ] 장보기\n\n[2026-11-07]\n- 어제', TODAY, 'https://www.example.com/a/'),
    '[2026-11-08]\n- [ ] 장보기\n- https://www.example.com/a\n\n[2026-11-07]\n- 어제');
  // F10 W-ORDER-01 (11/11): one dated head is a new document, oldest first: today's new head goes under it.
  assert.equal(programLinkMemoRaw('[2026-11-07]\n- [ ] 어제 할 일', TODAY, 'https://example.com/a'), '[2026-11-07]\n- [ ] 어제 할 일\n\n[2026-11-08]\n- https://example.com/a');
  assert.equal(programLinkMemoRaw('', TODAY, 'https://example.com/a'), '[2026-11-08]\n- https://example.com/a');
  assert.equal(programLinkMemoRaw('[2026-11-08]', TODAY, 'http://localhost/a'), null);
  // Through the private command: the memo line only; every task keeps its date.
  const made = ok(createProgramDocument(createProgramData(), { ...base(createProgramData()), expectedSpace: createProgramData().spaces[ACTOR], title: '일기', raw: '[2026-11-07]\n- [ ] 어제 할 일\n- 메모' }));
  const before = M.tasks(made.data.spaces[ACTOR].text).map(task => [task.title, task.date]);
  const kept = ok(addProgramLinkMemo(made.data, { ...base(made.data), documentId: made.result, link: 'https://example.com/a', today: TODAY }));
  assert.equal(M.raw(M.getDocument(kept.data.spaces[ACTOR].text, made.result)), '[2026-11-07]\n- [ ] 어제 할 일\n- 메모\n\n[2026-11-08]\n- https://example.com/a');
  assert.deepEqual(M.tasks(kept.data.spaces[ACTOR].text).map(task => [task.title, task.date]), before);
  const trashed = ok(setProgramDocumentTrashed(made.data, { ...base(made.data), documentId: made.result, trashed: true, now: NOW }));
  const refused = addProgramLinkMemo(trashed.data, { ...base(trashed.data), documentId: made.result, link: 'https://example.com/a', today: TODAY });
  assert(!refused.ok && refused.reason === 'unresolved', 'not into a trashed document');
});

test('where the link goes: the writing document whose caret was kept, while it is mine to write in and has no input waiting', () => {
  const made = ok(createProgramDocument(createProgramData(), { ...base(createProgramData()), expectedSpace: createProgramData().spaces[ACTOR], title: '일기', raw: '- 메모' }));
  const space = structuredClone(made.data.spaces[ACTOR]);
  space.position = { ...space.position, documentId: made.result };
  assert.equal(programLinkHome(space, []), made.result);
  assert.equal(programLinkHome(space, [made.result]), null, 'input waiting there');
  assert.equal(programLinkHome({ ...space, archivedDocumentIds: [made.result] }, []), null, 'archived');
  assert.equal(programLinkHome({ ...space, position: { ...space.position, documentId: 'missing' } }, []), null);
});

test('[이 링크로 Flow 만들기]: the new document\'s `- 출처:` line fills the publication draft\'s source link', () => {
  assert.equal(programDocumentSourceLink('- 출처: https://www.example.com/a/?utm_source=x\n- [ ] 할 일'), 'https://www.example.com/a');
  assert.equal(programDocumentSourceLink('- 메모\n- 출처 없음'), null);
  const made = ok(createProgramDocument(createProgramData(), { ...base(createProgramData()), expectedSpace: createProgramData().spaces[ACTOR], title: '링크로 만드는 Flow', raw: '- 출처: https://example.com/a\n- [ ] 첫 할 일' }));
  assert.equal(createProgramPublicationDraft(made.data, made.result, NOW)!.sourceUrl, 'https://example.com/a');
  const plain = ok(createProgramDocument(createProgramData(), { ...base(createProgramData()), expectedSpace: createProgramData().spaces[ACTOR], title: '글', raw: '- [ ] 할 일' }));
  assert.equal(createProgramPublicationDraft(plain.data, plain.result, NOW)!.sourceUrl, '', 'as before without one');
});

test('the wiring: Flow 찾기 reads the link from the search box and the list already here; the host keeps or starts', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const discovery = read('components/flow/integrated-poc/ProgramDiscovery.tsx'), workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
  assert(discovery.includes('const linkMatches = linkQuery ? programFlowsByLink(data, linkQuery) : [];'));
  assert(workspace.includes('onKeepLink={keepLink} onCreateFromLink={createFromLink}'));
  assert(workspace.includes("const home = programLinkHome(space, pendingImportDocuments());"));
  assert(!/fetch\(/.test(read('lib/flow/integrated-poc/link-lookup.ts')), 'nothing is fetched');
});
