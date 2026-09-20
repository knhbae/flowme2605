import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'components/flow/integrated-poc/ProgramApp.module.css'), 'utf8');
const rules = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(match => match[1].trim().split('*/').at(-1)!.trim() === selector)
  .map(match => match[2]).join(';');

test('skip link does not paint or intercept controls without its own keyboard focus', () => {
  assert.match(rules('.skip'), /opacity:0/);
  assert.match(rules('.skip'), /pointer-events:none/);
  assert.doesNotMatch(rules('.skip'), /display:none|visibility:hidden/);
});

test('keyboard focus reveals an operable skip link inside the viewport', () => {
  const focused = rules('.skip:focus-visible');
  assert.match(focused, /top:10px/);
  assert.match(focused, /opacity:1/);
  assert.match(focused, /pointer-events:auto/);
});

test('initial live status reserves no duplicate notice but pending and error feedback remain mounted', () => {
  const source = readFileSync(resolve(process.cwd(), 'components/flow/integrated-poc/ProgramApp.tsx'), 'utf8');
  assert.match(rules('.status:empty'), /min-height:0/);
  assert.match(source, /통합 PoC · 이 기기에 저장/);
  assert.match(source, /role=\{failed \? 'alert' : 'status'\} aria-live="polite">\{pending \? '저장 중…' : status\}/);
  assert.doesNotMatch(source, /status \|\| '변경은 PoC 전용 공간에만 저장됩니다\.'/);
});
