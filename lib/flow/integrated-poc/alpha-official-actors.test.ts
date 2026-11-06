import assert from 'node:assert/strict';
import test from 'node:test';
import { ALPHA_ENVIRONMENT_POLICY } from './alpha-persistence/environment';
import type { AlphaAuthConfig } from './alpha-auth/config';
import { ALPHA_OFFICIAL_ACTORS_RPC, createAlphaOfficialActorsReader, programFlowAttributionLabel, readAlphaOfficialActors } from './alpha-official-actors';

// Synthetic-only identifiers. No operating or official account is queried/seeded.
const known = 'member-00000000-0000-4000-8000-000000000001';
const other = 'member-00000000-0000-4000-8000-000000000002';
const another = 'member-00000000-0000-4000-8000-000000000003';
const config: AlphaAuthConfig = { stage: 'test', url: `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`,
  publishableKey: 'sb_publishable_synthetic_only', redirectUrl: 'http://localhost:3000/auth/callback' };
const session = { userId: 'synthetic-reader', accessToken: 'synthetic-token-only' };
const flow = { id: 'synthetic-flow', ownerId: known };
const version = { flowId: flow.id, createdBy: known, source: { kind: 'user-text' } };
const body = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test('official metadata accepts only a separate exact successful list of public aliases', () => {
  assert.deepEqual(readAlphaOfficialActors({ ok: true, value: [known, another] }), [known, another]);
  assert.deepEqual(readAlphaOfficialActors({ ok: true, value: [] }), []);
  for (const value of [null, { ok: false, value: [known] }, { ok: true, value: [known], actors: [] },
    { ok: true, value: known }, { ok: true, value: [null] }, { ok: true, value: [known, known] },
    { ok: true, value: ['FlowMe'] }, { ok: true, value: ['owner-id-is-not-a-public-alias'] }])
    assert.equal(readAlphaOfficialActors(value), null);
});

test('only server-listed Flow owner and version author together grant the official detail label', () => {
  assert.equal(programFlowAttributionLabel(flow, version, [known]), 'FlowMe가 정리한 자료');
  assert.equal(programFlowAttributionLabel(flow, { ...version, createdBy: another }, [known, another]), 'FlowMe가 정리한 자료');
  for (const [f, v, list] of [
    [flow, version, []], [{ ...flow, ownerId: other }, version, [known]],
    [flow, { ...version, createdBy: other }, [known]],
    [flow, { ...version, flowId: 'different-flow' }, [known]],
    [{ ...flow, ownerId: other, derivedFrom: { flowId: flow.id } }, { ...version, createdBy: other }, [known]],
  ] as const) assert.equal(programFlowAttributionLabel(f, v, list), '사용자가 정리한 자료');
});

test('source explanations and display names cannot self-issue an official mark', () => {
  for (const text of ['FlowMe 정리', '법제처 공식 안내', 'FlowMe']) {
    const spoof = { ...version, source: { kind: 'user-text', description: text, name: text } };
    const spoofFlow = { ...flow, ownerId: other, name: 'FlowMe' };
    assert.equal(programFlowAttributionLabel(spoofFlow, spoof, [known]), '사용자가 정리한 자료');
  }
  assert.equal(programFlowAttributionLabel(flow, { ...version, source: { kind: 'repository-source' } }, []), '기존 출처 자료');
});

test('one concurrent metadata request per reader, exact endpoint, no content or owner in body', async () => {
  let count = 0, resolve!: (r: Response) => void;
  const request = ((url: string, init: RequestInit) => {
    count++;
    assert.equal(url, `${config.url}/rest/v1/rpc/${ALPHA_OFFICIAL_ACTORS_RPC}`);
    assert.equal(init.method, 'POST'); assert.equal(init.body, '{}'); assert.equal(init.cache, 'no-store');
    assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${session.accessToken}`);
    return new Promise<Response>(done => { resolve = done; });
  }) as typeof fetch;
  const reader = createAlphaOfficialActorsReader(config, session, request);
  const one = reader.read(), two = reader.read(); assert.equal(one, two); assert.equal(count, 1);
  resolve(body({ ok: true, value: [known] }));
  assert.deepEqual(await one, [known]); assert.equal(await reader.read(), await one); assert.equal(count, 1);
});

for (const [name, response] of [
  ['missing RPC', () => body({ code: 'PGRST202' }, 404)],
  ['HTTP failure', () => body({ ok: true, value: [known] }, 500)],
  ['expired session', () => body({ ok: false }, 401)],
  ['bad shape', () => body({ ok: true, value: [known], unexpected: true })],
  ['bad JSON', () => new Response('not JSON')],
] as const) test(`${name}: no mark, no throw, no retry during this session`, async () => {
  let count = 0;
  const reader = createAlphaOfficialActorsReader(config, session, (async () => { count++; return response(); }) as typeof fetch);
  assert.deepEqual(await reader.read(), []); assert.deepEqual(await reader.read(), []); assert.equal(count, 1);
});

test('network failure settles to no mark without blocking another independent read', async () => {
  let count = 0;
  const reader = createAlphaOfficialActorsReader(config, session, (async () => { count++; throw Error('synthetic-unavailable'); }) as typeof fetch);
  assert.deepEqual(await Promise.all([reader.read(), Promise.resolve('ordinary-read-ready')]), [[], 'ordinary-read-ready']);
  assert.deepEqual(await reader.read(), []); assert.equal(count, 1);
});

test('reader snapshots credentials; a later account never borrows the previous account request', async () => {
  const changed = { ...session }, headers: string[] = [];
  const request = (async (_url: unknown, init: RequestInit) => { headers.push(new Headers(init.headers).get('Authorization')!); return body({ ok: true, value: [] }); }) as typeof fetch;
  const previous = createAlphaOfficialActorsReader(config, changed, request);
  changed.userId = 'synthetic-other-reader'; changed.accessToken = 'synthetic-other-token-only';
  const next = createAlphaOfficialActorsReader(config, changed, request);
  await previous.read(); await next.read(); await previous.read();
  assert.deepEqual(headers, [`Bearer ${session.accessToken}`, `Bearer ${changed.accessToken}`]);
});

test('invalid connection makes no request and the accepted server list cannot be mutated', async () => {
  let count = 0;
  const reader = createAlphaOfficialActorsReader({ ...config, url: 'http://not-the-approved-project.invalid' }, session,
    (async () => { count++; return body({ ok: true, value: [known] }); }) as typeof fetch);
  assert.deepEqual(await reader.read(), []); assert.equal(count, 0);
  const list = readAlphaOfficialActors({ ok: true, value: [known] })!;
  assert.throws(() => (list as string[]).push(other));
});
