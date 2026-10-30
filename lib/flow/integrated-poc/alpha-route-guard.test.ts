import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { alphaHomeLocation, alphaRouteDecision } from './alpha-route-guard';
import { middleware } from '../../../middleware';

test('Alpha paths and their assets stay open', () => {
  for (const path of ['/alpha', '/alpha/', '/auth/callback', '/api/alpha/account', '/api/alpha/social', '/api/alpha/creator',
    '/api/alpha/writing/doc-1', '/api/alpha/media', '/api/alpha/catalog', '/api/alpha/preservation', '/api/alpha/backup-jobs',
    '/api/alpha/health', '/_next/static/chunks/app.js', '/_next/static/css/app.css', '/icon.svg', '/favicon.ico'])
    assert.equal(alphaRouteDecision(path), 'allow', path);
});

test('the root goes to /alpha', () => assert.equal(alphaRouteDecision('/'), 'home'));

test('legacy pages, lab pages and the unauthenticated review writer are closed', () => {
  for (const path of ['/my', '/flows', '/flows/new', '/flows/x/edit', '/calendar', '/f/passport', '/u/creator', '/flow-maps/m',
    '/flow-maps/m/creator', '/flow-lab', '/flow-lab/p22-observation', '/ia-compare', '/restart/moving-d30', '/creators',
    '/content-flows', '/api/content-flow-review', '/api/alpha', '/api/alphax/account', '/alphabet', '/auth', '/_next/image',
    '/_next/data/x.json', '/robots.txt', '/my/', '/MY', '/Alpha'])
    assert.equal(alphaRouteDecision(path), 'block', path);
});

test('encoded separators and dot segments never pass an allowed prefix', () => {
  for (const path of ['/_next/static/%2e%2e/api/content-flow-review', '/api/alpha/%2E%2E/../flows', '/alpha/%2fmy',
    '/auth/%5cmy', '/alpha/..', '/alpha/./x', '/api/alpha/../content-flow-review', '/alpha\\my'])
    assert.equal(alphaRouteDecision(path), 'block', path);
});

test('the root goes to /alpha on the forwarded public host, not the listen address', () => {
  assert.equal(alphaHomeLocation('alpha.wikiplans.com', 'https', 'http:'), 'https://alpha.wikiplans.com/alpha');
  assert.equal(alphaHomeLocation('localhost:3000', null, 'http:'), 'http://localhost:3000/alpha');
  assert.equal(alphaHomeLocation('localhost:3000', 'http', 'http:'), 'http://localhost:3000/alpha');
  for (const host of [null, '', 'evil.com/x', 'a b', 'host:99999x', 'alpha.wikiplans.com\r\nSet-Cookie: x'])
    assert.equal(alphaHomeLocation(host, 'https', 'http:'), null, String(host));
});

test('the middleware answers 404, a 307 to /alpha on the public host, or passes through', () => {
  // As behind the tunnel: Next sees its listen address, the proxy forwards the public Host and protocol.
  const run = (path: string, method = 'GET', headers: Record<string, string> = { host: 'alpha.wikiplans.com', 'x-forwarded-proto': 'https' }) =>
    middleware(new NextRequest(`http://127.0.0.1:3105${path}`, { method, headers }));
  const blocked = run('/api/content-flow-review', 'POST');
  assert.equal(blocked.status, 404);
  assert.equal(blocked.headers.get('Cache-Control'), 'no-store');
  assert.equal(run('/flows').status, 404);
  const home = run('/?next=/my');
  assert.equal(home.status, 307);
  assert.equal(home.headers.get('Location'), 'https://alpha.wikiplans.com/alpha');
  assert.equal(home.headers.get('Cache-Control'), 'no-store');
  assert.equal(run('/', 'GET', { host: 'bad host' }).status, 404);
  const open = run('/alpha');
  assert.equal(open.status, 200);
  assert.equal(open.headers.get('x-middleware-next'), '1');
});

test('the middleware runs on every path: no matcher narrows it', () => {
  const source = readFileSync(new URL('../../../middleware.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /export const config/);
  assert.match(source, /alphaRouteDecision\(request\.nextUrl\.pathname\)/);
});
