import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseProgramLocation } from './navigation';
import { PROGRAM_RETURN_KEY, PROGRAM_RETURN_MS, forgetProgramReturn, programFlowShareUrl, rememberProgramReturn, shareProgramLink, takeProgramReturn } from './program-share-link';

const memory = () => { const map = new Map<string, string>(); return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } }; };

test('the link pins the version and reads back as that exact Flow detail; nothing else rides along', () => {
  const url = programFlowShareUrl('https://alpha.example/alpha', 'flow-move', 'flow-move-v2');
  assert.equal(url, 'https://alpha.example/alpha#flowme/flow/flow-move?version=flow-move-v2');
  assert.deepEqual(parseProgramLocation(url!.slice(url!.indexOf('#'))), { view: 'flow', id: 'flow-move', versionId: 'flow-move-v2' });
  // IDs are encoded, and an ID that cannot round-trip gives no link.
  assert.equal(programFlowShareUrl('/alpha', 'flow a/b', 'v 1'), '/alpha#flowme/flow/flow%20a%2Fb?version=v+1');
  assert.equal(programFlowShareUrl('/alpha', '', 'v1'), null);
  assert.equal(programFlowShareUrl('/alpha', 'flow-a', ''), null);
});

test('share sheet first, then the clipboard; a cancelled sheet is quiet; a failure shows the link', async () => {
  const calls: string[] = [];
  assert.equal(await shareProgramLink('u', { share: async () => { calls.push('share'); }, copy: async () => { calls.push('copy'); } }), 'shared');
  assert.equal(await shareProgramLink('u', { share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); }, copy: async () => { calls.push('copy2'); } }), 'cancelled');
  assert.equal(await shareProgramLink('u', { share: async () => { throw new Error('denied'); }, copy: async () => { calls.push('copy3'); } }), 'copied');
  assert.equal(await shareProgramLink('u', { copy: async () => { throw new Error('denied'); } }), 'fallback');
  assert.equal(await shareProgramLink('u', {}), 'fallback');
  assert.deepEqual(calls, ['share', 'copy3']);
  // A share that never settles shows the link instead of leaving the button waiting.
  assert.equal(await shareProgramLink('u', { share: () => new Promise<void>(() => {}), copy: async () => { calls.push('never'); } }, 20), 'fallback');
  assert.equal(calls.includes('never'), false);
});

test('a sign-in returns once to the remembered place, within half an hour', () => {
  const store = memory(), now = 1_000_000;
  assert.equal(rememberProgramReturn(store, '#flowme/flow/flow-move?version=flow-move-v2', now), true);
  assert.equal(takeProgramReturn(store, now + 60_000), '#flowme/flow/flow-move?version=flow-move-v2');
  // Once: the entry is gone after the first read.
  assert.equal(takeProgramReturn(store, now + 60_000), null);
  assert.equal(store.map.has(PROGRAM_RETURN_KEY), false);
  // Too old, or from the future: dropped, and still removed.
  rememberProgramReturn(store, '#flowme/flow/flow-move?version=flow-move-v2', now);
  assert.equal(takeProgramReturn(store, now + PROGRAM_RETURN_MS + 1), null);
  assert.equal(store.map.has(PROGRAM_RETURN_KEY), false);
  rememberProgramReturn(store, '#flowme/flow/a', now);
  assert.equal(takeProgramReturn(store, now - 1), null);
  // Only exact, meaningful places are kept: not the default space, not a malformed or tampered fragment.
  for (const hash of ['#flowme/space', '', '#elsewhere', '#flowme/flow/a?version=v&item=', '#flowme/flow/a?item=i']) assert.equal(rememberProgramReturn(store, hash, now), false, hash);
  store.map.set(PROGRAM_RETURN_KEY, JSON.stringify({ hash: '#flowme/flow/a?item=i', at: now }));
  assert.equal(takeProgramReturn(store, now), null);
  store.map.set(PROGRAM_RETURN_KEY, '{not json');
  assert.equal(takeProgramReturn(store, now), null);
  assert.equal(takeProgramReturn(null, now), null);
  assert.equal(rememberProgramReturn(null, '#flowme/discover', now), false);
});

test('FC5 review 1·2: only a public Flow detail is remembered, and each attempt forgets the last one', () => {
  const store = memory(), now = 1_000_000;
  // A Flow, with or without its version, is kept; documents, drafts and other places never reach storage.
  for (const hash of ['#flowme/flow/flow-move?version=flow-move-v2', '#flowme/flow/flow-move']) {
    assert.equal(rememberProgramReturn(store, hash, now), true, hash);
    assert.equal(takeProgramReturn(store, now), hash);
  }
  for (const hash of ['#flowme/space/doc-private', '#flowme/creator/draft-1', '#flowme/discover', '#flowme/community', '#flowme/space']) {
    assert.equal(rememberProgramReturn(store, hash, now), false, hash);
    assert.equal(store.map.has(PROGRAM_RETURN_KEY), false, hash);
  }
  // A stored document place (an older build, or a tampered entry) is not returned to.
  store.map.set(PROGRAM_RETURN_KEY, JSON.stringify({ hash: '#flowme/space/doc-private', at: now }));
  assert.equal(takeProgramReturn(store, now), null);
  // Flow A, sign-in cancelled, then a new attempt from /alpha (or the default space): the A entry is gone.
  for (const retry of ['', '#flowme/space']) {
    rememberProgramReturn(store, '#flowme/flow/flow-a?version=flow-a-v1', now);
    assert.equal(rememberProgramReturn(store, retry, now + 60_000), false);
    assert.equal(takeProgramReturn(store, now + 120_000), null, retry || 'empty');
  }
  // A new attempt from another Flow replaces it.
  rememberProgramReturn(store, '#flowme/flow/flow-a?version=flow-a-v1', now);
  rememberProgramReturn(store, '#flowme/flow/flow-b?version=flow-b-v3', now + 1);
  assert.equal(takeProgramReturn(store, now + 2), '#flowme/flow/flow-b?version=flow-b-v3');
  forgetProgramReturn(null);
});

test('the sign-in wiring: Google remembers the place; the callback restores it once in place of plain /alpha', () => {
  const panel = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaAuthPanel.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const google = panel.slice(panel.indexOf('async function signInGoogle()'), panel.indexOf('const signedIn = '));
  assert(google.indexOf('rememberProgramReturn(') >= 0 && google.indexOf('rememberProgramReturn(') < google.indexOf('signInWithOAuth('));
  assert.match(panel, /window\.history\.replaceState\(null, '', `\/alpha\$\{takeProgramReturn\(tabStorage\(\), Date\.now\(\)\) \?\? ''\}`\);/);
  assert(!panel.includes("window.history.replaceState(null, '', '/alpha');"));
  // A password sign-in, sign-up or reset is a new attempt too: it forgets an earlier Google attempt's place.
  const submit = panel.slice(panel.indexOf("const result = mode === 'signup'") - 200, panel.indexOf("const result = mode === 'signup'"));
  assert(submit.includes('forgetProgramReturn(tabStorage());'));
});

test('FC5 review 3: the link, the waiting state and a late answer belong to the Flow and version they were made for', () => {
  const button = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramShareLink.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(button.includes('const key = `${flowId}\\n${versionId}`;'));
  assert(button.includes('const state = result?.key === key ? result : null, busy = busyKey === key;'));
  assert(button.includes('setBusyKey(current => current === started ? null : current);'));
  assert(button.includes('if (shown.current !== started) return;'));
});

test('three places, the same button: Flow detail ⋯, the publish panel, 내 활동 › 내 공개 Flow; never for an archived Flow', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const discovery = read('ProgramDiscovery.tsx'), community = read('ProgramCommunity.tsx'), publisher = read('ProgramPublisher.tsx'), button = read('ProgramShareLink.tsx');
  assert(discovery.includes("{!flow.archived && <ProgramShareLink flowId={flow.id} versionId={version.id} unverified={flow.id.startsWith('catalog-')} />}"));
  assert(community.includes('{!flow.archived && <ProgramShareLink flowId={flow.id} versionId={flow.versionId} />}'));
  // The account publish keeps the dialog on "공개했습니다" with the link, 공개한 Flow 보기 and 닫기 (UX 13 order).
  assert.match(publisher, /if \(storageScope === 'account' && flowId\) \{ setPublished\(\{ flowId, versionId: result\.result,/);
  const panel = publisher.slice(publisher.indexOf('if (published) return <dialog'), publisher.indexOf('return <dialog ref={dialog} className={styles.dialog} aria-labelledby="program-publisher-title"'));
  assert(panel.indexOf('<ProgramShareLink') < panel.indexOf('공개한 Flow 보기') && panel.indexOf('공개한 Flow 보기') < panel.indexOf('>닫기<'));
  // The honest line, the unverified block, the 3-second result and the hand-copy fallback.
  for (const text of ['FlowMe에 로그인한 사람만 열 수 있습니다.', '미확인 콘텐츠는 링크를 만들지 않습니다.', '링크를 복사했습니다', '길게 눌러 복사해 주세요']) assert(button.includes(text), text);
  assert.match(button, /window\.setTimeout\(\(\) => setResult\(null\), 3000\)/);
});

test('C9 × FC5: a republish shows C9 panel with the new Flow link; other account publishes show FC5 panel; 내 공개 Flow keeps both', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const publisher = read('ProgramPublisher.tsx'), community = read('ProgramCommunity.tsx');
  // The republish branch comes first and returns before FC5's panel.
  const done = publisher.slice(publisher.indexOf('if (republishing) {\n        const flowId'), publisher.indexOf("} catch { setMessage('공개 결과를 확인하지 못했습니다."));
  assert(done.indexOf('setRepublished({ flowId, versionId: result.result }); setMessage(\'\'); return;') >= 0);
  assert(done.indexOf('setRepublished(') < done.indexOf('setPublished('), 'republish first');
  // C9's panel: its words, then the link for the new Flow's first version, then 새 공개 Flow 열기.
  const panel = publisher.slice(publisher.indexOf('{republished ? <section'), publisher.indexOf('새 공개 Flow 열기</button></section>'));
  assert(panel.includes('새 링크로 버전 1을 공개했습니다. 예전 Flow는 철회된 그대로입니다.'));
  assert(panel.includes('<ProgramShareLink flowId={republished.flowId} versionId={republished.versionId} />'));
  // 내 공개 Flow: C9's row (철회됨, 새 링크로 다시 공개…) with FC5's link only while the Flow is live.
  const row = community.slice(community.indexOf('<section><h2>내 공개 Flow</h2>'), community.indexOf('<section><h2>작성 중인 공개 초안</h2>'));
  assert(row.includes("{flow.archived ? '공개 철회됨' : '공개 중'}") && row.includes("'새 링크로 다시 공개…'"));
  assert(row.indexOf('{!flow.archived && <ProgramShareLink flowId={flow.id} versionId={flow.versionId} />}') > row.indexOf('</button>'));
});
