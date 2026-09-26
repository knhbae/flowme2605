import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { createAlphaMediaHandler, normalizeAlphaMedia, ALPHA_MEDIA_POLICY } from './media-handler';
import { signAlphaCommand } from './command-handler';
const owner = '11111111-1111-4111-8111-111111111111', key = 'ab'.repeat(32), token = 'fixture-only-no-real-secret-token';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
const inputImage = async () => `data:image/png;base64,${(await sharp({ create: { width: 2,height: 3,channels: 3,background: 'red' } }).png().toBuffer()).toString('base64')}`;
function fixture() {
  const state = { row: null as any, object: null as Uint8Array | null, cancelled: false, linked: false, revoked: false,
    preserved: null as null | {id:string;mime:string;bytes:number;sha256:string;base64:string}, preservedReads:0, revokePreserved:false,
    revokeDuringDownload: false, corrupt: false, downloadStatus: 200, calls: [] as { path: string; method: string; headers: Headers; body: any }[] };
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname, method = init?.method ?? 'GET', headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    if (path.endsWith('flowme_alpha_preserved_media_read_v1')) {
      state.preservedReads++;
      return state.preserved && !(state.revokePreserved && state.preservedReads > 1)
        ? Response.json({ok:true,value:state.preserved}) : Response.json({ok:false,reason:'not-found'});
    }
    state.calls.push({ path,method,headers,body });
    assert.equal(headers.get('authorization'), `Bearer ${token}`);
    if (path === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
    if (path.endsWith('media_stage_v1')) {
      assert.equal(body.proof, signAlphaCommand(owner, body.stage_text, key)); const intent = JSON.parse(body.stage_text);
      if (!state.row) state.row = { id: intent.id,path: `media/${intent.id}.webp`,sha256: intent.sha256,bytes: intent.bytes,status: 'uploading',
        media: { id: intent.id,dataUrl: `flowme-media:${intent.id}`,alt: intent.alt,synthetic: intent.synthetic } };
      if (intent.action === 'ready') { assert(state.object); state.row.status = 'staged'; }
      return Response.json({ ok: true,value: state.row });
    }
    if (path.endsWith('media_read_v1')) return state.cancelled || state.revoked ? Response.json({ ok: false,reason: 'not-found' })
      : Response.json({ ok: true,value: { id: state.row.id,path: state.row.path,sha256: state.row.sha256,bytes: state.row.bytes } });
    if (path.endsWith('media_cancel_v1')) {
      if (state.linked) return Response.json({ ok: false,reason: 'conflict' });
      state.cancelled = true; return Response.json({ ok: true,value: { id: state.row.id,path: state.row.path } });
    }
    if (path.startsWith('/storage/v1/object/')) {
      if (method === 'POST') { assert.equal(headers.get('x-upsert'), 'false'); state.object = body; return Response.json({ Key: state.row.path }); }
      if (method === 'DELETE') { assert.deepEqual(body, { prefixes: [state.row.path] }); state.object = null; return Response.json([]); }
      if (state.downloadStatus !== 200) return Response.json({ error: 'upstream failure' }, { status: state.downloadStatus });
      if (state.revokeDuringDownload) state.revoked = true;
      return new Response(state.corrupt ? new Uint8Array([1,2,3]) : state.object, { headers: { 'Content-Type': 'image/webp' } });
    }
    throw Error(`Unexpected path ${path}`);
  };
  const handler = createAlphaMediaHandler(env, fetcher);
  const request = (method: string, body?: unknown, query = '') => new Request(`http://localhost:3104/api/alpha/media${query}`, {
    method, headers: { Origin: 'http://localhost:3104',Authorization: `Bearer ${token}`,'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const stage = async () => handler(request('POST', { kind: 'stage', requestId: 'photo-1',dataUrl: await inputImage(),alt: '선택한 사진',synthetic: false }));
  return { state,handler,request,stage };
}

test('media missing Storage bytes use owner-scoped restored bytes and recheck access', async () => {
  const f=fixture();await f.stage();const bytes=Buffer.from(f.state.object!);
  f.state.preserved={id:f.state.row.id,mime:'image/webp',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')};
  f.state.downloadStatus=404;
  const response=await f.handler(f.request('GET',undefined,`?id=${f.state.row.id}`));assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  assert.equal(f.state.preservedReads,2);
  f.state.preservedReads=0;f.state.downloadStatus=200;f.state.corrupt=true;
  const repaired=await f.handler(f.request('GET',undefined,`?id=${f.state.row.id}`));assert.equal(repaired.status,200);assert.deepEqual(Buffer.from(await repaired.arrayBuffer()),bytes);f.state.corrupt=false;f.state.downloadStatus=404;
  f.state.preservedReads=0;f.state.revokePreserved=true;assert.equal((await f.handler(f.request('GET',undefined,`?id=${f.state.row.id}`))).status,404);
  f.state.preservedReads=0;f.state.revokePreserved=false;f.state.downloadStatus=503;assert.equal((await f.handler(f.request('GET',undefined,`?id=${f.state.row.id}`))).status,503);assert.equal(f.state.preservedReads,0);
  f.state.downloadStatus=404;f.state.preserved.base64=Buffer.from('bad bytes').toString('base64');assert.equal((await f.handler(f.request('GET',undefined,`?id=${f.state.row.id}`))).status,400);
});

test('media decode/reencode strips EXIF and applies orientation before WebP storage', async () => {
  const image = await sharp({ create: { width: 2,height: 3,channels: 3,background: 'blue' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  assert((await sharp(image).metadata()).exif);
  const normalized = await normalizeAlphaMedia(`data:image/jpeg;base64,${image.toString('base64')}`), metadata = await sharp(normalized.data).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined); assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.width, 3); assert.equal(metadata.height, 2); assert.equal(normalized.bytes, normalized.data.length);
});
test('media refuses mislabeled bytes, magic-only corrupt input, oversized and excessive pixels', async () => {
  const png = await inputImage();
  for (const input of [png.replace('image/png','image/jpeg'),'data:image/png;base64,iVBORw0KGgo=',
    `data:image/png;base64,${Buffer.alloc(ALPHA_MEDIA_POLICY.bytes + 1).toString('base64')}`]) await assert.rejects(normalizeAlphaMedia(input));
  const large = await sharp({ create: { width: 4001,height: 4000,channels: 3,background: 'red' } }).png().toBuffer();
  await assert.rejects(normalizeAlphaMedia(`data:image/png;base64,${large.toString('base64')}`));
});
test('media stages immutable normalized bytes and returns only opaque public descriptor', async () => {
  const f = fixture(), response = await f.stage(), value = await response.json(); assert.equal(response.status, 200); assert.equal(value.ok,true);
  assert.match(value.value.id,/^media-/); assert.equal(value.value.dataUrl,`flowme-media:${value.value.id}`);
  assert.equal(Object.keys(value.value).length,4); assert(!JSON.stringify(value).includes(owner)); assert(!JSON.stringify(value).includes(key));
  assert(f.state.calls.some(call => call.path.includes('/authenticated/'))); assert.equal(f.state.row.status,'staged');
  const count = f.state.calls.filter(call => call.method === 'POST' && call.path.startsWith('/storage')).length;
  assert.equal((await (await f.stage()).json()).value.id,value.value.id);
  assert.equal(f.state.calls.filter(call => call.method === 'POST' && call.path.startsWith('/storage')).length,count);
});
test('media GET uses authenticated object read, verifies hash and rechecks authorization after bytes', async () => {
  const f = fixture(); await f.stage(); const query = `?id=${f.state.row.id}`;
  const response = await f.handler(f.request('GET',undefined,query)); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('content-type'),'image/webp'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.state.object);
  f.state.corrupt = true; assert.equal((await f.handler(f.request('GET',undefined,query))).status,400);
  f.state.corrupt = false; f.state.revokeDuringDownload = true;
  assert.equal((await f.handler(f.request('GET',undefined,query))).status,404);
});
test('media explicit cancellation removes only its exact unlinked object; linked photo is protected', async () => {
  const f = fixture(); await f.stage(); const query = `?id=${f.state.row.id}`; f.state.linked = true;
  assert.equal((await f.handler(f.request('DELETE',undefined,query))).status,409); assert(f.state.object);
  f.state.linked = false; assert.equal((await f.handler(f.request('DELETE',undefined,query))).status,200); assert.equal(f.state.object,null);
  assert.equal((await f.handler(f.request('GET',undefined,query))).status,404);
});
test('media upstream server failure is unavailable, not a missing or unauthorized photo', async () => {
  const f = fixture(); await f.stage(); f.state.downloadStatus = 503;
  const response = await f.handler(f.request('GET', undefined, `?id=${f.state.row.id}`));
  assert.equal(response.status, 503); assert.equal((await response.json()).reason, 'unavailable');
  assert.equal(f.state.cancelled, false); assert(f.state.object);
});
test('media rejects alternate origin, query injection and malformed input without reservation', async () => {
  const f = fixture();
  const foreign = new Request('http://localhost:3104/api/alpha/media', { method: 'POST',headers: { Origin: 'https://example.com',Authorization: `Bearer ${token}` },body: '{}' });
  assert.equal((await f.handler(foreign)).status,400);
  assert.equal((await f.handler(f.request('GET',undefined,'?id=../secret'))).status,400);
  assert.equal((await f.handler(f.request('POST',{ kind: 'stage',requestId: 'x',dataUrl:'data:image/png;base64,iVBORw0KGgo=',alt:'x',synthetic:false }))).status,400);
  assert(!f.state.calls.some(call => call.path.endsWith('media_stage_v1')));
});
