import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { patchAuthDebugProbe } from './patch-auth-debug-probe.mjs';

test('SDK debug probe compatibility patch is narrow and idempotent', () => {
  const source = "before; debug: !!(globalThis && supportsLocalStorage() && globalThis.localStorage && globalThis.localStorage.getItem('supabase.gotrue-js.locks.debug') === 'true'); after;";
  const result = patchAuthDebugProbe(source); assert(result.startsWith('before; debug: false')); assert(result.endsWith('; after;'));
  assert.equal(patchAuthDebugProbe(result), result); assert.throws(() => patchAuthDebugProbe('unexpected SDK code'));
});
test('installed ESM and CJS auth debug modules cannot perform the global probe', () => {
  for (const type of ['module', 'main']) {
    const source = readFileSync(new URL(`../../node_modules/@supabase/auth-js/dist/${type}/lib/locks.js`, import.meta.url), 'utf8');
    assert(source.includes('debug: false /* FlowMe:')); assert(!source.includes("getItem('supabase.gotrue-js.locks.debug')"));
  }
});
