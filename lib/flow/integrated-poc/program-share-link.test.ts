import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseProgramLocation } from './navigation';
import { PROGRAM_RETURN_KEY, PROGRAM_RETURN_MS, programFlowShareUrl, rememberProgramReturn, shareProgramLink, takeProgramReturn } from './program-share-link';

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
  rememberProgramReturn(store, '#flowme/discover', now);
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

test('the sign-in wiring: Google remembers the place; the callback restores it once in place of plain /alpha', () => {
  const panel = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaAuthPanel.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const google = panel.slice(panel.indexOf('async function signInGoogle()'), panel.indexOf('const signedIn = '));
  assert(google.indexOf('rememberProgramReturn(') >= 0 && google.indexOf('rememberProgramReturn(') < google.indexOf('signInWithOAuth('));
  assert.match(panel, /window\.history\.replaceState\(null, '', `\/alpha\$\{takeProgramReturn\(tabStorage\(\), Date\.now\(\)\) \?\? ''\}`\);/);
  assert(!panel.includes("window.history.replaceState(null, '', '/alpha');"));
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
  for (const text of ['Alpha에 로그인한 사람만 열 수 있습니다.', '미확인 콘텐츠는 링크를 만들지 않습니다.', '링크를 복사했습니다', '길게 눌러 복사해 주세요']) assert(button.includes(text), text);
  assert.match(button, /window\.setTimeout\(\(\) => setState\(null\), 3000\)/);
});
