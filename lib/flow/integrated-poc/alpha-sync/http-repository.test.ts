import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaHttpRepository } from './http-repository';
import type { AlphaAuthConfig } from '../alpha-auth/config';
import { ALPHA_COMMAND_SCHEMA, type AlphaCommand } from '../alpha-persistence/contract';
const config: AlphaAuthConfig = { stage: 'development', url: 'https://wkmzcxpnojobxrgebapw.supabase.co', publishableKey: 'sb_publishable_test', redirectUrl: 'http://localhost:3104/auth/callback' };
const command: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'request-one', expectedRevision: 0, kind: 'change-private', changes: [{field: 'archivedDocumentIds', present: true, value: []}] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: {'Content-Type':'application/json'} });
test('M3 HTTP fixed-token executes through same-origin validated API only', async () => {
  const calls: {url: string; init?: RequestInit}[] = [];
  const session = { userId: 'a', accessToken: 'token-A' }, settings = { ...config };
  const request = (async (url, init) => { calls.push({url:String(url),init});
    return String(url).endsWith('/user') ? json({id:'a',is_anonymous:false}) : json({ok:true,value:{requestId:'request-one',revision:1,changed:true,kind:'change-private'}});
  }) as typeof fetch;
  const port = createAlphaHttpRepository(settings, session, request);
  settings.url = 'https://production.invalid'; session.accessToken = 'token-B'; session.userId = 'b';
  assert.equal((await port.execute(command)).ok, true);
  assert.deepEqual(calls.map(row => row.url), [`${config.url}/auth/v1/user`, '/api/alpha/account']);
  assert.equal((calls[1].init?.headers as Record<string,string>).Authorization, 'Bearer token-A');
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {kind:'execute',command});
});
test('M3 HTTP disallowed creator field and production config trigger no network', async () => {
  let calls = 0; const request = (async () => { calls++; throw Error(); }) as typeof fetch;
  const port = createAlphaHttpRepository(config, {userId:'a',accessToken:'token'}, request);
  assert.deepEqual(await port.execute({...command,kind:'change-private',changes:[{field:'publicationDrafts',present:true,value:[]}]}), {ok:false,reason:'invalid'});
  const prod = createAlphaHttpRepository({...config,url:'https://ldellkztijrijbpwthjl.supabase.co'}, {userId:'a',accessToken:'token'}, request);
  assert.deepEqual(await prod.execute(command), {ok:false,reason:'invalid'}); assert.equal(calls,0);
});
test('HTTP preserves explicit capacity rejection', async () => {
  const request = (async url => String(url).endsWith('/user') ? json({id:'a'}) : json({ok:false,reason:'limit'})) as typeof fetch;
  const port=createAlphaHttpRepository(config,{userId:'a',accessToken:'token'},request);
  assert.deepEqual(await port.execute(command),{ok:false,reason:'limit'});
});
test('M3 HTTP user mismatch rejects before API dispatch', async () => {
  let calls = 0; const request = (async () => { calls++; return json({id:'b'}); }) as typeof fetch;
  const port = createAlphaHttpRepository(config,{userId:'a',accessToken:'token'},request);
  assert.deepEqual(await port.execute(command), {ok:false,reason:'unauthenticated'}); assert.equal(calls,1);
});
test('M3 HTTP malformed post-dispatch success is unavailable, never a definitive rejection', async () => {
  const request = (async url => String(url).endsWith('/user') ? json({id:'a'}) : json({ok:true,value:{unexpected:true}})) as typeof fetch;
  const port = createAlphaHttpRepository(config,{userId:'a',accessToken:'token'},request);
  assert.deepEqual(await port.execute(command), {ok:false,reason:'unavailable'});
});
test('M3 HTTP lookup validates nullable receipt and uses requestId contract', async () => {
  let body: unknown;
  const request = (async (url,init) => { if(String(url).endsWith('/user')) return json({id:'a'}); body=JSON.parse(String(init?.body)); return json({ok:true,value:null}); }) as typeof fetch;
  const port = createAlphaHttpRepository(config,{userId:'a',accessToken:'token'},request);
  assert.deepEqual(await port.lookup('request-one'), {ok:true,value:null}); assert.deepEqual(body,{kind:'lookup',requestId:'request-one'});
});
test('M3 HTTP strict negative body survives non-2xx response for definitive precommit rejection', async () => {
  const request = (async url => String(url).endsWith('/user') ? json({id:'a'}) : json({ok:false,reason:'invalid'},400)) as typeof fetch;
  const port = createAlphaHttpRepository(config,{userId:'a',accessToken:'token'},request);
  assert.deepEqual(await port.execute(command),{ok:false,reason:'invalid'});
});
