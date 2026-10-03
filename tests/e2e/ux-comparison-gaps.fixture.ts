import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import { mockCloudflareRelease, RELEASE_ORIGIN } from './cloudflare-release.fixture';
import { pairedSocialAccount, users } from './alpha-auth.fixture';
import { createHash } from 'node:crypto';
import { createAlphaFakeServer, validateAlphaCommand } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { materializeAccount, privateChanges } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { isAlphaSocialCommand } from '../../lib/flow/integrated-poc/alpha-social/contract';
import { executeAlphaSocialIntent } from '../../lib/flow/integrated-poc/alpha-social/dispatch';
import { alphaSocialReferences, isAlphaSocialContext, type AlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';
import type { AlphaCommand, AlphaReceipt } from '../../lib/flow/integrated-poc/alpha-persistence/contract';

/** In-memory draft-only overlay. Real network remains the base fixture's exact
 * page/static GET capability. Nothing here calls live Auth, BFF or Supabase. */
export async function mockParticipationDraft(page: Page) {
  const base = await mockCloudflareRelease(page, { document: { title: '합성 개인 문서', raw: '보존할 일반 메모' } });
  const initial = await base.current();
  const context = pairedSocialAccount('a', initial).value.context as AlphaSocialContext;
  const references = alphaSocialReferences(context, users.a.id);
  const server = createAlphaFakeServer([{ account: initial, references }]);
  const repository = server.connect(server.issueSession(users.a.id));
  const commands: AlphaCommand[] = [], lookups: string[] = [], denied: string[] = [];
  const receipts = new Map<string, { fingerprint: string; receipt: AlphaReceipt }>();
  const publicBefore = canonicalJson(context.public);
  let rejectBody: string | null = null, loseBody: string | null = null;
  let rejected: AlphaCommand | null = null, lost: AlphaCommand | null = null, hideReceipt = false;
  const current = async () => { const result = await repository.read(); if (!result.ok) throw Error('draft-fixture-read'); return result.value; };
  const json = (route: Route, value: unknown) => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': RELEASE_ORIGIN, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(value) });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const authRead = url.origin === 'https://wkmzcxpnojobxrgebapw.supabase.co' && url.pathname === '/rest/v1/rpc/flowme_alpha_social_read_v1';
    const accountRead = url.origin === 'https://wkmzcxpnojobxrgebapw.supabase.co' && url.pathname === '/rest/v1/flowme_alpha_accounts';
    const ownedApi = url.origin === RELEASE_ORIGIN && ['/api/alpha/account', '/api/alpha/social'].includes(url.pathname);
    if (!authRead && !accountRead && !ownedApi) return route.fallback();
    const invalidQuery = accountRead ? url.search !== '?select=account' : !!url.search;
    if (invalidQuery || url.username || url.password || authRead && !['POST', 'OPTIONS'].includes(method)
      || accountRead && method !== 'GET' || ownedApi && method !== 'POST') {
      denied.push(`${method}:${url.pathname}`); return json(route, { ok: false, reason: 'invalid' });
    }
    if (authRead) {
      if (method === 'OPTIONS') return json(route, {});
      expect(request.postDataJSON()).toEqual({});
      return json(route, { ok: true, value: { account: await current(), context: structuredClone(context) } });
    }
    if (accountRead) return json(route, [{ account: await current() }]);
    const body = request.postDataJSON();
    if (body.kind === 'lookup' && typeof body.requestId === 'string' && url.pathname === '/api/alpha/account') {
      lookups.push(body.requestId); return json(route, { ok: true, value: hideReceipt ? null : receipts.get(body.requestId)?.receipt ?? null });
    }
    const command = body.command;
    if (body.kind !== 'execute' || url.pathname !== '/api/alpha/social' || !isAlphaSocialCommand(command)
      || command.intent.type !== 'participation-save') {
      denied.push(`${method}:${url.pathname}:command`); return json(route, { ok: false, reason: 'invalid' });
    }
    commands.push(structuredClone(command));
    const old = receipts.get(command.requestId), fingerprint = canonicalJson(command);
    if (old) return json(route, old.fingerprint === fingerprint ? { ok: true, value: old.receipt } : { ok: false, reason: 'idempotency-conflict' });
    const before = await current();
    if (command.expectedRevision !== before.revision || command.expectedPublicRevision !== context.revision)
      return json(route, { ok: false, reason: 'revision-conflict' });
    if (rejectBody !== null && command.intent.draft.body === rejectBody) {
      rejectBody = null; rejected = structuredClone(command); return json(route, { ok: false, reason: 'rate-limited' });
    }
    const transition = executeAlphaSocialIntent(materializeAccount(before, references).data, before.ownerId, command.intent, command.requestId, '2026-10-02T07:00:00.000Z');
    if (!transition.ok || !transition.changed || canonicalJson(transition.data.public) !== publicBefore)
      return json(route, { ok: false, reason: transition.ok ? 'no-change' : 'invalid' });
    const changes = privateChanges(before.space, transition.data.spaces[before.ownerId]);
    expect(changes.every(change => change.field === 'participationDrafts')).toBe(true);
    const result = await repository.execute({ schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: command.requestId, expectedRevision: command.expectedRevision, changes });
    if (!result.ok) return json(route, result);
    const receipt: AlphaReceipt = { ...result.value, kind: 'social', publicRevision: context.revision, resultId: transition.result };
    receipts.set(command.requestId, { fingerprint, receipt });
    if (loseBody !== null && command.intent.draft.body === loseBody) {
      loseBody = null; lost = structuredClone(command); hideReceipt = true; return json(route, { ok: false, reason: 'unavailable' });
    }
    return json(route, { ok: true, value: receipt });
  });
  return { current, commands, lookups, diagnostics: server.diagnostics,
    rejectNextBody(body: string) { rejectBody = body; }, loseNextBody(body: string) { loseBody = body; },
    rejected: () => rejected, lost: () => lost, revealReceipt() { hideReceipt = false; },
    async assertBoundary(info: TestInfo) {
      expect(denied).toEqual([]); expect(canonicalJson(context.public)).toBe(publicBefore);
      expect(base.diagnostics()).toEqual({ mutations: 0, operations: 0 }); await base.assertBoundary(info);
      await info.attach('draft-only-overlay', { contentType: 'application/json', body: JSON.stringify({ publicUnchanged: true,
        realAuthRequests: 0, realApiRequests: 0, changedFields: ['participationDrafts'], ...server.diagnostics(),
        commands: commands.map(command => ({ requestId: command.requestId, kind: command.kind, expectedRevision: command.expectedRevision })), lookups,
        rejectedRequestId: rejected?.requestId ?? null, lostRequestId: lost?.requestId ?? null }) });
    } };
}

export const versionedPublicIds = {flow:'comparison-public-flow',old:'comparison-public-v1',current:'comparison-public-v2',item:'comparison-public-item'};
export const versionedPublicTitle = '합성 공개 준비 Flow';

/** Two immutable synthetic versions are seeded before references and hashes.
 * Only copy-import and private text/position changes are admitted; the shared
 * fixture still denies every real Auth/API request and observes sentinels. */
export async function mockVersionedPublicEntry(page: Page) {
  const base = await mockCloudflareRelease(page,{document:{title:'합성 개인 문서',raw:'보존할 개인 메모'}});
  const initial = await base.current(), context = pairedSocialAccount('a',initial).value.context as AlphaSocialContext;
  const other = context.actors[1].id, stamp = '2026-10-01T00:00:00Z';
  context.public.flows.push({id:versionedPublicIds.flow,ownerId:other,currentVersionId:versionedPublicIds.current,
    category:'합성 검증',situations:['준비'],derivedFrom:null,archived:false});
  for (const [id,number,parentVersionId,itemTitle] of [
    [versionedPublicIds.old,1,null,'합성 이전 판본 준비 항목'],
    [versionedPublicIds.current,2,versionedPublicIds.old,'합성 최신 판본 변경 항목'],
  ] as const) context.public.versions.push({id,flowId:versionedPublicIds.flow,number,parentVersionId,
    title:versionedPublicTitle,summary:`합성 판본 ${number}`,source:{kind:'simulated-example',label:`합성 출처 ${number}`,url:null,checkedAt:null},
    createdBy:other,createdAt:stamp,items:[{id:versionedPublicIds.item,title:itemTitle,description:`합성 방법 ${number}`,
      completionCriteria:`합성 기준 ${number}`,sourceUrl:null,schedule:{kind:'fixed',date:number===1?'2026-10-10':'2026-10-11'},subchecks:[]}]});
  if (!isAlphaSocialContext(context)) throw Error('versioned-synthetic-context-invalid');
  const references = alphaSocialReferences(context,users.a.id), publicBefore = canonicalJson(context.public);
  const publicHash = createHash('sha256').update(publicBefore).digest('hex');
  const server = createAlphaFakeServer([{account:initial,references}]), repository = server.connect(server.issueSession(users.a.id));
  const commands: AlphaCommand[] = [], lookups: string[] = [], denied: string[] = [];
  const receipts = new Map<string,{fingerprint:string;receipt:AlphaReceipt}>();
  const current = async()=>{const result=await repository.read();if(!result.ok)throw Error('versioned-fixture-read');return result.value;};
  const json = (route: Route,value:unknown)=>route.fulfill({status:200,contentType:'application/json',
    headers:{'Access-Control-Allow-Origin':RELEASE_ORIGIN,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},body:JSON.stringify(value)});
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),method=request.method();
    const socialRead=url.origin==='https://wkmzcxpnojobxrgebapw.supabase.co'&&url.pathname==='/rest/v1/rpc/flowme_alpha_social_read_v1';
    const accountRead=url.origin==='https://wkmzcxpnojobxrgebapw.supabase.co'&&url.pathname==='/rest/v1/flowme_alpha_accounts';
    const ownedApi=url.origin===RELEASE_ORIGIN&&['/api/alpha/account','/api/alpha/social'].includes(url.pathname);
    if(!socialRead&&!accountRead&&!ownedApi)return route.fallback();
    if((accountRead?url.search!=='?select=account':!!url.search)||url.username||url.password
      ||socialRead&&!['POST','OPTIONS'].includes(method)||accountRead&&method!=='GET'||ownedApi&&method!=='POST'){
      denied.push(`${method}:${url.pathname}:nonexact`);return json(route,{ok:false,reason:'invalid'});
    }
    if(socialRead){if(method==='OPTIONS')return json(route,{});expect(request.postDataJSON()).toEqual({});
      return json(route,{ok:true,value:{account:await current(),context:structuredClone(context)}});}
    if(accountRead)return json(route,[{account:await current()}]);
    const body=request.postDataJSON();
    if(body.kind==='lookup'&&typeof body.requestId==='string'&&url.pathname==='/api/alpha/account'){
      lookups.push(body.requestId);return json(route,{ok:true,value:receipts.get(body.requestId)?.receipt??null});
    }
    const command=body.command;
    const privateCommand=url.pathname==='/api/alpha/account'&&validateAlphaCommand(command)&&command.kind==='change-private'
      &&command.changes.every(change=>['text','position'].includes(change.field));
    const copyCommand=url.pathname==='/api/alpha/social'&&isAlphaSocialCommand(command)&&command.intent.type==='copy-import'
      &&[versionedPublicIds.old,versionedPublicIds.current].includes(command.intent.versionId);
    if(body.kind!=='execute'||!privateCommand&&!copyCommand){denied.push(`${method}:${url.pathname}:command`);return json(route,{ok:false,reason:'invalid'});}
    commands.push(structuredClone(command));
    const fingerprint=canonicalJson(command),old=receipts.get(command.requestId);
    if(old)return json(route,old.fingerprint===fingerprint?{ok:true,value:old.receipt}:{ok:false,reason:'idempotency-conflict'});
    const before=await current();
    if(command.expectedRevision!==before.revision||copyCommand&&command.expectedPublicRevision!==context.revision)
      return json(route,{ok:false,reason:'revision-conflict'});
    let compiled=privateCommand?command:null,resultId:string|undefined;
    if(copyCommand){
      const transition=executeAlphaSocialIntent(materializeAccount(before,references).data,before.ownerId,command.intent,command.requestId,stamp);
      if(!transition.ok||!transition.changed||canonicalJson(transition.data.public)!==publicBefore)
        return json(route,{ok:false,reason:transition.ok?'no-change':'invalid'});
      const changes=privateChanges(before.space,transition.data.spaces[before.ownerId]);
      expect(changes.every(change=>['text','copies','archivedDocumentIds'].includes(change.field))).toBe(true);
      compiled={schema:'flowme-alpha-command/1',kind:'change-private',requestId:command.requestId,expectedRevision:command.expectedRevision,changes};resultId=transition.result;
    }
    if(!compiled)return json(route,{ok:false,reason:'invalid'});
    const result=await repository.execute(compiled);if(!result.ok)return json(route,result);
    const receipt:AlphaReceipt={...result.value,kind:command.kind,...(resultId?{resultId}:{}),...(copyCommand?{publicRevision:context.revision}:{})};
    receipts.set(command.requestId,{fingerprint,receipt});return json(route,{ok:true,value:receipt});
  });
  return {current,commands,lookups,context,diagnostics:server.diagnostics,async assertBoundary(info:TestInfo){
    expect(denied,'Version fixture rejects nonexact and out-of-scope commands').toEqual([]);
    expect(canonicalJson(context.public)).toBe(publicBefore);expect(base.diagnostics()).toEqual({mutations:0,operations:0});
    await base.assertBoundary(info);
    await info.attach('versioned-public-synthetic-overlay',{contentType:'application/json',body:JSON.stringify({
      forwardedAuth:0,forwardedApi:0,publicHash,publicUnchanged:true,currentVersionId:versionedPublicIds.current,
      retainedVersionId:versionedPublicIds.old,...server.diagnostics(),commands:commands.map(command=>({kind:command.kind,requestId:command.requestId,
        expectedRevision:command.expectedRevision,...(command.kind==='social'?{intent:command.intent.type}: {})})),lookups})});
  }};
}
