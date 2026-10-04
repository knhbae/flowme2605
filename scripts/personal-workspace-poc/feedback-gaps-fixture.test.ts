import assert from 'node:assert/strict';
import test from 'node:test';
import type { Page } from 'playwright';
import { installMemoDateBrowserFixture, memoDateResourceTarget } from './memo-date-browser-fixture-20261004';

test('fixture rejects existing cookies before exposing controls, installing routes or navigating', async () => {
  let laterCalls=0;
  const context={pages:()=>[{}],serviceWorkers:()=>[],storageState:async()=>({cookies:[{name:'synthetic-existing-cookie'}],origins:[]})};
  const page={context:()=>context,url:()=> 'about:blank',exposeFunction:()=>{laterCalls++;},goto:()=>{laterCalls++;}};
  await assert.rejects(installMemoDateBrowserFixture(page as unknown as Page,{enableFaultControl:true}),/existing-profile-state/);
  assert.equal(laterCalls,0);
});
test('fixture rejects existing localStorage or IndexedDB origins even on a blank single tab', async () => {
  let laterCalls=0;
  const context={pages:()=>[{}],serviceWorkers:()=>[],storageState:async(options:unknown)=>{
    assert.deepEqual(options,{indexedDB:true});return {cookies:[],origins:[{origin:'https://example.invalid',localStorage:[]}]};
  }};
  const page={context:()=>context,url:()=> 'about:blank',exposeFunction:()=>{laterCalls++;},goto:()=>{laterCalls++;}};
  await assert.rejects(installMemoDateBrowserFixture(page as unknown as Page),/existing-profile-state/);assert.equal(laterCalls,0);
});
test('fixture rejects nonblank pages, multiple tabs and service workers before inspecting storage', async () => {
  for (const scenario of [{url:'https://example.invalid',pages:[{}],workers:[]},{url:'about:blank',pages:[{},{}],workers:[]},{url:'about:blank',pages:[{}],workers:[{}]}]) {
    let inspected=0;const page={context:()=>({pages:()=>scenario.pages,serviceWorkers:()=>scenario.workers,storageState:()=>{inspected++;}}),url:()=>scenario.url};
    await assert.rejects(installMemoDateBrowserFixture(page as unknown as Page),/fresh-isolated/);assert.equal(inspected,0);
  }
});
test('fault controls do not widen fixed local GET-only resource forwarding', () => {
  for (const [url,method] of [
    ['https://alpha.wikiplans.com/api/alpha/account','POST'],['http://127.0.0.1:3106/api/alpha/account','GET'],
    ['https://wkmzcxpnojobxrgebapw.supabase.co/auth/v1/user','GET'],['https://user:secret@alpha.wikiplans.com/alpha','GET'],
    ['https://alpha.wikiplans.com/alpha','POST'],['https://example.invalid/alpha','GET'],
  ]) assert.equal(memoDateResourceTarget(url,method),null);
  assert.equal(memoDateResourceTarget('https://alpha.wikiplans.com/alpha','GET'),'http://127.0.0.1:3106/alpha');
});
