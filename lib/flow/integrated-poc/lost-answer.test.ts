import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALPHA_LOST_ANSWER_CHECKS_MS } from './alpha-sync/controller';

// 11/7 (live, 390): 되돌리기 of a new-document import was saved, but its answer came back as the tunnel's 502 page, and the
// screen said '저장 상태 확인이 필요합니다… 새로고침'. A social write whose answer was lost is now looked up by its request
// id (as a reload does) before it is called unknown, and it is never sent again for that.
const controller = readFileSync(join(process.cwd(), 'lib/flow/integrated-poc/alpha-sync/controller.ts'), 'utf8').replace(/\r\n/g, '\n');
const at = controller.indexOf('  async function execute('), execute = controller.slice(at, controller.indexOf('\n  }\n', at));

test('two quiet lookups, 1.5 s then 3 s after a lost answer', () => {
  assert.deepEqual([...ALPHA_LOST_ANSWER_CHECKS_MS], [1500, 3000]);
});
test('only a social write (social, undo-social) whose own request is still pending and whose answer was lost', () => {
  const rule = controller.slice(controller.indexOf('const lostSocialAnswer'), controller.indexOf('async function execute('));
  for (const part of ["command.kind === 'social' || command.kind === 'undo-social'", 'next.state?.pending?.requestId === command.requestId',
    "next.lastError === 'unavailable' || next.status === 'checking-result'"]) assert(rule.includes(part), part);
});
test('the check is a lookup only (resolvePending(false)): the same request is never sent again here', () => {
  assert(execute.includes('ok = await client.resolvePending(false);'));
  assert(!/resolvePending\(true\)/.test(execute));
  assert(execute.indexOf('if (!ok && lostSocialAnswer(command, next))') < execute.indexOf('const account = next.state?.confirmed;'), 'before the result is read');
  assert(execute.includes("if (epoch !== generation) return rejected('session-expired');\n          ok = await client.resolvePending(false);"), 'a new session ends it');
  assert(execute.includes('if (ok || !lostSocialAnswer(command, next)) break;'));
});
test('while it runs the write shows as saving (not 저장 여부 확인 못 함); the flag never outlives the write', () => {
  assert(controller.includes("status: quietCheck && busy ? 'saving' : current.status"));
  assert(execute.includes('} finally { quietCheck = false;'));
});
