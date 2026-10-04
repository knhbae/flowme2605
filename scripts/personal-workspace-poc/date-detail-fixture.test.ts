import test from 'node:test';
import assert from 'node:assert/strict';
import { memoDateResourceTarget } from './memo-date-browser-fixture-20261004';

test('date-detail fixture can target only its explicit new QA listener, without touching support-owned 3106', () => {
  const origin = 'http://127.0.0.1:3115';
  assert.equal(memoDateResourceTarget('https://alpha.wikiplans.com/alpha', 'GET', origin), origin + '/alpha');
  assert.equal(memoDateResourceTarget(origin + '/_next/static/app.js', 'GET', origin), origin + '/_next/static/app.js');
  assert.equal(memoDateResourceTarget('http://127.0.0.1:3106/alpha', 'GET', origin), null);
  assert.equal(memoDateResourceTarget(origin + '/api/alpha/account', 'POST', origin), null);
});
test('local fixture target rejects unknown port, real host, credentials and traversal', () => {
  for (const origin of ['http://127.0.0.1:3105', 'https://alpha.wikiplans.com', 'http://localhost:3115', 'http://127.0.0.1:3115/path'])
    assert.equal(memoDateResourceTarget('https://alpha.wikiplans.com/alpha', 'GET', origin), null);
  for (const url of ['https://user:pass@alpha.wikiplans.com/alpha', 'https://alpha.wikiplans.com/_next/static/%2e%2e/secret'])
    assert.equal(memoDateResourceTarget(url, 'GET', 'http://127.0.0.1:3115'), null);
  assert.equal(memoDateResourceTarget('https://alpha.wikiplans.com/alpha', 'GET'), 'http://127.0.0.1:3106/alpha');
});
