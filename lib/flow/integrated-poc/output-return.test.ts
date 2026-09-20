import test from 'node:test';
import assert from 'node:assert/strict';
import { programOutputReturnBase, programOutputReturnUrl } from './output-return';
import { parseProgramLocation, programLocation } from './navigation';
import { isProgramExecutionTargetKey } from './recurrence-order-contract';
const page = 'http://127.0.0.1:3641/my?personalWorkspacePoc=v1';
const target = { documentId: 'doc-one', executionKey: JSON.stringify(['text-task', 'doc-one', 'line-one']) };
test('exact loopback gate only, hash typed target roundtrip without modifying operating query', () => {
  for (const origin of ['http://127.0.0.1:3641', 'https://localhost:9000', 'http://[::1]:3641']) {
    const url = programOutputReturnUrl(`${origin}/my?personalWorkspacePoc=v1#old`, 'local-user', target)!;
    assert.equal(new URL(url).search, '?personalWorkspacePoc=v1');
    assert.deepEqual(parseProgramLocation(new URL(url).hash), { view: 'space', id: target.documentId, returnActorId: 'local-user', executionKey: target.executionKey });
  }
  for (const url of [undefined, 'javascript:alert(1)', 'file:///my?personalWorkspacePoc=v1', page.replace('127.0.0.1','example.com'), page.replace('127.0.0.1','127.0.0.1.evil.com'), page.replace('127.0.0.1','user:pass@127.0.0.1'), page+'&x=1', page+'&personalWorkspacePoc=v1', page.replace('=v1','=V1'), page.replace('/my?','/my/?'), page.replace('=v1','=%76%31')]) assert.equal(programOutputReturnBase(url), null, url);
});
test('strict paired return navigation rejects wrong surfaces, missing actor, duplicate and forged creator shape', () => {
  const hash = programLocation({view:'space',id:target.documentId,returnActorId:'local-user',executionKey:target.executionKey});
  for (const bad of [hash.replace('space','flow'),hash.replace('actor=local-user&',''),hash+'&actor=local-user',hash+'&action=publish']) assert.deepEqual(parseProgramLocation(bad),{view:'space'});
  assert.equal(programOutputReturnUrl(page,'local-user',{...target,executionKey:'["unknown"]'}),null);
  const valid=JSON.stringify(['occurrence','creator','owner','row','series','series:occurrence:2026-09-14']);
  assert(isProgramExecutionTargetKey(valid));
  for(const bad of [valid.replace('2026-09-14','2026-02-30'),valid.replace('series:occurrence:','other:occurrence:'),valid.replace('"row"','"__proto__"')]) assert(!isProgramExecutionTargetKey(bad));
});
