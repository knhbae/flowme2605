import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { AUTOMATIC_READ_IDLE_MS, AUTOMATIC_READ_INPUT_EVENTS, automaticReadSchedule } from './automatic-read-idle';

const POLL = 20_000;
function harness() {
  let t = 0, reads = 0;
  const schedule = automaticReadSchedule(() => t, () => { reads++; });
  // Advance the fake clock tick by tick, firing the interval the way setInterval would.
  const advance = (ms: number) => { const end = t + ms; for (let next = t - (t % POLL) + POLL; next <= end; next += POLL) { t = next; schedule.interval(); } t = end; };
  return { schedule, advance, at: () => t, reads: () => reads, reset: () => { reads = 0; } };
}

test('the interval reads every tick until ten minutes pass without input', () => {
  const h = harness();
  h.advance(AUTOMATIC_READ_IDLE_MS - 1);
  assert.equal(h.reads(), Math.floor((AUTOMATIC_READ_IDLE_MS - 1) / POLL));
  h.reset();
  h.advance(60 * 60_000);
  assert.equal(h.reads(), 0, 'an hour left open without input makes no interval read');
});

test('the first input after the idle stretch reads once at once, then the interval resumes', () => {
  const h = harness();
  h.advance(AUTOMATIC_READ_IDLE_MS + 5 * POLL); h.reset();
  h.schedule.input();
  assert.equal(h.reads(), 1);
  h.schedule.input(); h.schedule.input();
  assert.equal(h.reads(), 1, 'further input while active does not read again');
  h.advance(3 * POLL);
  assert.equal(h.reads(), 4);
});

test('input while active never reads by itself and keeps the interval going', () => {
  const h = harness();
  for (let i = 0; i < 6; i++) { h.advance(AUTOMATIC_READ_IDLE_MS / 2); h.schedule.input(); }
  assert.equal(h.reads(), Math.floor(3 * AUTOMATIC_READ_IDLE_MS / POLL));
});

test('focus and becoming visible still read immediately, idle or not, and end the idle stretch', () => {
  const h = harness();
  h.schedule.returned();
  assert.equal(h.reads(), 1);
  h.advance(AUTOMATIC_READ_IDLE_MS + POLL); h.reset();
  h.schedule.returned();
  assert.equal(h.reads(), 1);
  h.advance(POLL);
  assert.equal(h.reads(), 2);
});

test('input that arrives just before the limit keeps the tab active', () => {
  const h = harness();
  h.advance(AUTOMATIC_READ_IDLE_MS - POLL); h.schedule.input(); h.reset();
  h.advance(AUTOMATIC_READ_IDLE_MS - 1);
  assert.equal(h.reads(), Math.floor((AUTOMATIC_READ_IDLE_MS - 1) / POLL));
});

const alpha = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');

test('the host wires every input event, focus and visibility to the schedule, and all of them go through refreshAutomatically', () => {
  assert.deepEqual([...AUTOMATIC_READ_INPUT_EVENTS], ['pointerdown', 'keydown', 'input', 'compositionstart', 'touchstart', 'wheel']);
  const effect = alpha.slice(alpha.indexOf('const reads = automaticReadSchedule('), alpha.indexOf('const performMutation'));
  assert(alpha.includes('const reads = automaticReadSchedule(Date.now, refresh);'));
  assert(effect.includes('window.setInterval(reads.interval, POLL_MS)') && !effect.includes('setInterval(refresh'));
  assert(effect.includes("window.addEventListener('focus', reads.returned)"));
  assert(effect.includes("if (document.visibilityState === 'visible') reads.returned(); else refresh();"));
  assert(effect.includes('window.addEventListener(type, reads.input, input)') && effect.includes('window.removeEventListener(type, reads.input, input)'));
  assert(effect.includes("window.addEventListener('online', refresh)"));
});

test('a hidden tab, a busy store and the preservation dialog still skip every read, idle or not', () => {
  const start = alpha.indexOf('function refreshAutomatically()');
  const body = alpha.slice(start, alpha.indexOf('function startAutomaticRead', start));
  assert(body.includes("if (disposed.current || preservationRef.current || document.visibilityState === 'hidden' || !store || store.snapshot().busy) return;"));
  assert(body.includes('startAutomaticRead(store);'));
});

test('waiting for an automatic read is untouched by the idle rule', () => {
  // A registered read stays awaitable however it started; idleness only decides whether a new one starts.
  const register = alpha.slice(alpha.indexOf('function startAutomaticRead'), alpha.indexOf('function closePreservation'));
  assert(!register.includes('reads.') && !register.includes('automaticReadSchedule'));
  assert(alpha.includes('const read = automaticReadToAwait(automaticRead.current, { store, ownerId: owner, epoch, busy: store.snapshot().busy }, options);'));
});
