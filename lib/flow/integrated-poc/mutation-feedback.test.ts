import assert from 'node:assert/strict';
import test from 'node:test';
import { nextProgramMutationFeedback, programMutationFeedbackAfterNavigation } from './mutation-feedback';

test('quiet successful publication retry replaces the previous failure', () => {
  const failure = nextProgramMutationFeedback({ status: '', failed: false }, '공개', { ok: false, reason: 'storage-unavailable' }, true);
  assert.equal(failure.failed, true);
  assert.match(failure.status, /저장하지 못했습니다/);
  assert.deepEqual(nextProgramMutationFeedback(failure, 'PoC에 선택 내용 공개', { ok: true, result: 'flow', changed: true }, true),
    { status: 'PoC에 선택 내용 공개 · 저장됨', failed: false });
});

test('quiet confirmed no-op also clears a prior failure without claiming a new write', () => {
  assert.deepEqual(nextProgramMutationFeedback({ status: '실패', failed: true }, '초안', { ok: true, result: 'draft', changed: false }, true),
    { status: '이미 같은 상태입니다.', failed: false });
});

test('ordinary successful autosave remains quiet and repeated failure remains visible', () => {
  const success = { status: '공개 · 저장됨', failed: false };
  assert.deepEqual(nextProgramMutationFeedback(success, '초안', { ok: true, result: 'draft', changed: true }, true), success);
  const failure = nextProgramMutationFeedback(success, '초안', { ok: false, reason: 'conflict' }, true);
  assert(failure.failed); assert.match(failure.status, /다른 변경이 먼저/);
  assert.deepEqual(nextProgramMutationFeedback(failure, '초안', { ok: false, reason: 'conflict' }, true), failure);
});

test('explicit changes and same-position actions keep distinct feedback', () => {
  assert.equal(nextProgramMutationFeedback({ status: '', failed: false }, '이동', { ok: true, result: 'item', changed: true }).status, '이동 · 저장됨');
  assert.equal(nextProgramMutationFeedback({ status: '', failed: false }, '이동', { ok: true, result: 'item', changed: false }).status, '이미 같은 상태입니다.');
});

test('confirmed storage with pending presentation never invites a duplicate save', () => {
  const feedback = nextProgramMutationFeedback({ status: '이전 실패', failed: true }, '검토', { ok: true, result: 'map', changed: true, presentationPending: true }, true);
  assert.deepEqual(feedback, { status: '저장됨 · 화면 갱신 필요', failed: false });
  const blocked = nextProgramMutationFeedback(feedback, '다시 저장', { ok: false, reason: 'presentation-pending' });
  assert.match(blocked.status, /앞선 저장은 완료/); assert.doesNotMatch(blocked.status, /저장하지 못했습니다/);
});

test('completed operation stays on its context or exact result but not an unrelated target or actor', () => {
  const value=nextProgramMutationFeedback({status:'',failed:false},'글 삭제',{ok:true,changed:true,result:'post-a'},false,{actorId:'a',location:'#post-a'});
  assert.equal(programMutationFeedbackAfterNavigation(value,'a','#post-a'),value);
  const result=programMutationFeedbackAfterNavigation(value,'a','#reply',['post-a']);assert.equal(result.status,value.status);
  assert.equal(result.completion?.location,'#reply');
  assert.deepEqual(programMutationFeedbackAfterNavigation(value,'a','#post-b',['post-b']),{status:'',failed:false});
  assert.deepEqual(programMutationFeedbackAfterNavigation(value,'b','#post-a',['post-a']),{status:'',failed:false});
});
test('quiet autosave retains original completion ownership while failure and pending presentation remain durable', () => {
  const value=nextProgramMutationFeedback({status:'',failed:false},'삭제',{ok:true,result:'a',changed:true},false,{actorId:'a',location:'#a'});
  assert.equal(nextProgramMutationFeedback(value,'초안',{ok:true,result:'draft',changed:true},true,{actorId:'a',location:'#b'}),value);
  for(const result of [{ok:false as const,reason:'conflict'},{ok:true as const,result:'a',changed:true,presentationPending:true as const}]) {
    const warning=nextProgramMutationFeedback(value,'저장',result,false,{actorId:'a',location:'#a'});
    assert.equal(warning.completion,undefined); assert.equal(programMutationFeedbackAfterNavigation(warning,'b','#b'),warning);
  }
  const warning={status:'작성 중 입력 보호',failed:false};assert.equal(programMutationFeedbackAfterNavigation(warning,'a','#b'),warning);
});
