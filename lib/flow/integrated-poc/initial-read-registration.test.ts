import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const alpha = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');

test('the first read after a session binds is registered, so text typed during it waits instead of failing', () => {
  // QA on 13b58a00: words typed while the first read ran were refused as busy (execute 0).
  assert(alpha.includes('if (store.snapshot().pending) void store.resolvePending(false); else startAutomaticRead(store);'));
  assert(!alpha.includes('else void store.refresh();'));
});

test('the interval read and the first read register the same way', () => {
  const start = alpha.indexOf('function refreshAutomatically()');
  const body = alpha.slice(start, alpha.indexOf('function startAutomaticRead', start));
  assert(body.includes('startAutomaticRead(store);') && !body.includes('store.refresh()'));
  const register = alpha.slice(alpha.indexOf('function startAutomaticRead'), alpha.indexOf('function closePreservation'));
  // Egress probe: the registered automatic read asks for tokens first (alpha-sync/read-probe.test.ts).
  assert(register.includes('automaticRead.current = read;') && register.includes('promise: store.refreshIfChanged().catch(() => false)'));
});
