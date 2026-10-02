import test from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE_ORIGIN, releaseQaLocalPort, releaseResourceTarget } from './cloudflare-release.fixture';

test('JP01 local asset QA chooses only the two explicit loopback ports', () => {
  assert.equal(releaseQaLocalPort(), 3106);
  for (const port of ['3106', '3107']) {
    const parsed = releaseQaLocalPort(port);
    assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, 'GET', 'local', parsed), `http://127.0.0.1:${port}/alpha`);
  }
  for (const invalid of ['', '03107', '3108', '3107/', 'https://other.example', '3107\n'])
    assert.throws(() => releaseQaLocalPort(invalid), /release-qa-local-port-rejected/);
  assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, 'GET', 'local', 9999 as 3106), null);
});

test('JP02 fresh bundle selection never grants API, credential, redirect or foreign-origin access', () => {
  for (const port of [3106, 3107] as const) {
    for (const address of [`${RELEASE_ORIGIN}/api/alpha/social`, `${RELEASE_ORIGIN}/auth/callback`,
      'https://user:secret@alpha.wikiplans.com/alpha', 'https://other.example/alpha', `${RELEASE_ORIGIN}/_next/static/%2e%2e/file.js`])
      assert.equal(releaseResourceTarget(address, 'GET', 'local', port), null);
    assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, 'POST', 'local', port), null);
  }
});

test('JP03 remote-readonly keeps its fixed origin irrespective of local asset selection', () => {
  assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, 'GET', 'remote-readonly', 3107), `${RELEASE_ORIGIN}/alpha`);
});
