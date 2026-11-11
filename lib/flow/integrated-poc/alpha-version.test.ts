import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { forgetAlphaBuildId, readAlphaBuildId } from './alpha-server/build-id';
import { ALPHA_VERSION, alphaNewerBuild, alphaOwnBuild, createAlphaVersionWatch, fetchAlphaServedBuild } from './alpha-version';

// W-VER-01~03 (기획 prd-version-20261111-1008, 총괄 11/11 11:0x·11:2x).
const doc = (content: string | null) => ({ querySelector: (selector: string) => selector === 'meta[name="flowme-build"]' && content !== null
  ? { getAttribute: (name: string) => name === 'content' ? content : null } : null }) as unknown as Document;

test('W-VER-01: the page knows its build from its HTML; the server names its own; unknown builds compare as nothing', () => {
  assert.equal(alphaOwnBuild(doc('h8jrAIv8SOZjvbibyH6QA')), 'h8jrAIv8SOZjvbibyH6QA');
  for (const bad of [null, '', ' ', 'a b', '<script>', 'x'.repeat(65)]) assert.equal(alphaOwnBuild(doc(bad)), '', String(bad));
  assert.equal(alphaOwnBuild(null), '');
  assert.equal(alphaNewerBuild('old-1', 'new_2'), 'new_2');
  assert.equal(alphaNewerBuild('old-1', 'old-1'), null, 'the same build');
  assert.equal(alphaNewerBuild('', 'new'), null, 'a page that does not know its build never shows the notice');
  for (const served of [null, undefined, '', 'bad value', 'x'.repeat(65)]) assert.equal(alphaNewerBuild('old', served), null, String(served));
  // Within the hour for a screen left open; at once when it shows again (the gap only stops a burst).
  assert(ALPHA_VERSION.everyMs <= 60 * 60_000 && ALPHA_VERSION.gapMs <= 60_000 && ALPHA_VERSION.waitMs >= 10_000);
});

test('W-VER-01: the build file is read once; a dev server without one says nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-build-'));
  forgetAlphaBuildId();
  assert.equal(readAlphaBuildId(root), '');
  forgetAlphaBuildId();
  mkdirSync(join(root, '.next')); writeFileSync(join(root, '.next', 'BUILD_ID'), 'abcDEF_12-3\n');
  assert.equal(readAlphaBuildId(root), 'abcDEF_12-3');
  writeFileSync(join(root, '.next', 'BUILD_ID'), 'changed');
  assert.equal(readAlphaBuildId(root), 'abcDEF_12-3', 'one process serves one build');
  forgetAlphaBuildId(); writeFileSync(join(root, '.next', 'BUILD_ID'), 'not a build id');
  assert.equal(readAlphaBuildId(root), '');
  forgetAlphaBuildId();
});

test('W-VER-01/02: comparing asks the light answer, once at a time, and only tells of a newer build; a failure tells nothing', async () => {
  let now = 0, asked = 0, answer: string | null = 'old', fail = false;
  const seen: string[] = [];
  const watch = createAlphaVersionWatch({ own: 'old', now: () => now, onNewer: build => seen.push(build),
    served: async () => { asked++; if (fail) throw Error('offline'); return answer; } });
  assert.equal(await watch.check(), null); assert.equal(asked, 1);
  now += 1000; assert.equal(await watch.check(), null); assert.equal(asked, 1, 'within the gap');
  now += ALPHA_VERSION.gapMs; answer = 'new'; assert.equal(await watch.check(), 'new'); assert.deepEqual(seen, ['new']);
  fail = true; assert.equal(await watch.check(true), null); assert.deepEqual(seen, ['new'], 'a failed answer is no answer');
  fail = false; const [a, b] = [watch.check(true), watch.check(true)]; await Promise.all([a, b]); assert.equal(asked, 4, 'one at a time');
  const none = createAlphaVersionWatch({ own: '', now: () => 0, onNewer: () => assert.fail(), served: async () => { assert.fail('not asked'); } });
  assert.equal(await none.check(true), null);
  // The header of the health answer, any status, never from a cache.
  const calls: [string, RequestInit | undefined][] = [];
  const served = await fetchAlphaServedBuild((async (url: string, init?: RequestInit) => { calls.push([url, init]);
    return new Response(null, { status: 503, headers: { 'X-FlowMe-Build': 'srv' } }); }) as typeof fetch);
  assert.equal(served, 'srv'); assert.deepEqual(calls, [['/api/alpha/health', { cache: 'no-store', credentials: 'same-origin' }]]);
});

test('W-VER-02/03: the notice is third in the line and never reloads by itself; [새로 고침] waits for every save', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
  const line = alpha.slice(alpha.indexOf('const alertLine: ProgramAlertLine | null'), alpha.indexOf('const noteNotice ='));
  const order = ['needsInputProtection ?', 'documentRecoveries > 0 ?', 'newBuild ?', 'message && !participationMessage ?'].map(part => line.indexOf(part));
  assert(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `order ${order}`);
  // int9 r2 (W-VER-04): with the flag that ends the line's words '· 새 버전'.
  assert(line.includes('note: versionNote(false) || null, newVersion: !!newBuild }') && line.includes('note: versionNote(true) || null, newVersion: !!newBuild }'), 'under the save line and the kept input');
  // The note rides along whichever line wins, the editor's own save trouble too, under [자세히].
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  assert(editor.includes('detail: editorRecoveryBody(serverView.recoveryBody), note: serverView.alert?.note,\n    newVersion: serverView.alert?.newVersion } : null;'));
  assert(editor.includes('{alertDetail && (alertLine.detail || alertLine.note) && <div className={styles.alertDetail}>{alertLine.detail}{alertLine.note}</div>}'));
  // One place reloads, and only from the person's [새로 고침] (at once when clean, or after the saves it waited for).
  assert.equal(alpha.split('window.location.reload()').length - 1, 2);
  assert(alpha.includes("const requestNewVersion = () => { captureInput(); if (versionClean()) { window.location.reload(); return; } setVersionReload('waiting'); };"));
  assert(alpha.includes('const versionClean = () => !storageErrorRef.current && !protectionRef.current && !hasInput()\n    && !controller.current?.snapshot().pending && !controller.current?.snapshot().busy;'));
  assert(alpha.includes("if (protectionRef.current || storageErrorRef.current || Date.now() - started > ALPHA_VERSION.waitMs) { setVersionReload('blocked'); return; }"));
  assert(alpha.includes("const shown = () => { if (document.visibilityState === 'visible') void watch.check(); };"), 'back on the screen: at once');
  const health = read('../../../app/api/alpha/health/route.ts'), page = read('../../../app/alpha/page.tsx');
  assert(health.includes("...(build ? { 'X-FlowMe-Build': build } : {})") && health.includes("'Cache-Control': 'no-store'"));
  assert(page.includes("return build ? { ...metadata, other: { 'flowme-build': build } } : metadata;"));
});
