import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programSourceLine } from './program-discovery-display';

// S-a: a general publication never records a source check date, so its intro and detail said
// "출처 확인 기록: 없음" right under a source note that may name a check date. Without a date the line
// was not drawn; with one it read "출처 확인 기록: {date} · 지금 원문을 다시 확인한 결과는 아닙니다."
// UX B4 (11/6): that second line is gone; the source line itself says the check date once. Storage formats unchanged.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramDiscovery.tsx', import.meta.url), 'utf8');

test('the detail says the source and its check date in one line, and no second check line', () => {
  assert(!source.includes('출처 확인 기록'));
  assert(!source.includes("checkedAt ?? '없음'"));
  assert(source.includes('<p className={styles.sourceLine}>{kindLabel && <>{kindLabel} · </>}{programSourceLine(version.source)}'));
  assert.match(programSourceLine({ kind: 'repository-source', label: '보건소', checkedAt: '2026-11-06' }), /^출처 보건소 · .+ 확인$/);
  assert.equal(programSourceLine({ kind: 'user-text', label: '직접 작성한 내용', checkedAt: null }), '출처 직접 작성한 내용');
});
