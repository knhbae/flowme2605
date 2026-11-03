import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaCommunityMediaPort } from './media-client';
import { isProgramStoredMedia } from '../community-media';
import { validateProgramMedia } from '../program-data';
import { createProgramData } from '../program-data';
import { createProgramPost } from '../community';

const id = 'media-11111111-2222-4333-8444-555555555555';
const media = { id, dataUrl: `flowme-media:${id}`, alt: '검증 사진', synthetic: true };
const signal = new AbortController().signal;

test('stored media identity is exact and opaque; arbitrary URLs or mismatched IDs are rejected', () => {
  assert(isProgramStoredMedia(media)); assert(validateProgramMedia(media));
  for (const dataUrl of ['https://example.com/image.webp', `flowme-media:${id}/secret`, 'flowme-media:media-aaaaaaaa-2222-4333-8444-555555555555']) {
    assert(!isProgramStoredMedia({ ...media, dataUrl })); assert(!validateProgramMedia({ ...media, dataUrl }));
  }
  const data = createProgramData();
  const result = createProgramPost(data, { actorId: data.activeActorId, requestId: 'media-post', kind: 'question', title: '사진 질문', body: '검증', topic: '', media: [{ ...media, secret: 'not public' } as typeof media] }, '2026-09-21T00:00:00.000Z');
  assert(result.ok); assert.deepEqual(result.data.public.posts[0].media, [media]);
});

test('media stage and read use only same-origin bearer requests, caller cancellation and no-store', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const port = createAlphaCommunityMediaPort({ accessToken: () => 'test-only-token', fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return init?.method === 'POST' ? Response.json({ ok: true, value: media }) : new Response(new Blob(['test'], { type: 'image/webp' }));
  } });
  assert.deepEqual(await port.stage({ requestId: 'stage-1', dataUrl: 'data:image/png;base64,aGVsbG8=', alt: media.alt, synthetic: true }, signal), media);
  assert.equal((await port.read(id, signal)).type, 'image/webp');
  assert.deepEqual(calls.map(call => call.url), ['/api/alpha/media', `/api/alpha/media?id=${id}`]);
  for (const call of calls) { assert.equal(call.init?.signal, signal); assert.equal(call.init?.cache, 'no-store'); assert.equal(new Headers(call.init?.headers).get('Authorization'), 'Bearer test-only-token'); }
  assert.equal(JSON.parse(String(calls[0].init?.body)).kind, 'stage');
});

test('missing login, non-media IDs, rejected reads and forged stage response cannot become image URLs', async () => {
  let requests = 0;
  const denied = createAlphaCommunityMediaPort({ accessToken: () => null, fetch: async () => { requests++; throw Error('unexpected'); } });
  await assert.rejects(denied.read(id, signal)); await assert.rejects(denied.read('../secret', signal)); assert.equal(requests, 0);
  const rejected = createAlphaCommunityMediaPort({ accessToken: () => 'test', fetch: async () => new Response('', { status: 403 }) });
  await assert.rejects(rejected.read(id, signal));
  const forged = createAlphaCommunityMediaPort({ accessToken: () => 'test', fetch: async () => Response.json({ ok: true, value: { ...media, dataUrl: 'https://example.com/private' } }) });
  await assert.rejects(forged.stage({ requestId: 'stage-2', dataUrl: 'data:image/png;base64,aGVsbG8=', alt: '검증', synthetic: true }, signal));
  const unsafe = createAlphaCommunityMediaPort({ accessToken: () => 'test', fetch: async () => new Response(new Blob(['test'], { type: 'image/svg+xml' })) });
  await assert.rejects(unsafe.read(id, signal));
});

test('explicit stage discard uses the exact authenticated ID and respects a live attachment conflict', async () => {
  const calls: { url: string; method?: string }[] = [];
  const port = createAlphaCommunityMediaPort({ accessToken: () => 'test', fetch: async (url, init) => {
    calls.push({ url: String(url), method: init?.method }); return new Response('', { status: 409 });
  } });
  assert.equal(await port.discard!(id, signal), false);
  assert.deepEqual(calls, [{ url: `/api/alpha/media?id=${id}`, method: 'DELETE' }]);
  await assert.rejects(port.discard!('../other-owner', signal)); assert.equal(calls.length, 1);
});
