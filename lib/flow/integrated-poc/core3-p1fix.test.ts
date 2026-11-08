import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { recoveryLineDocumentId } from './saved-input-notice';

// Core3 P1 fix (11/8, UX mockup check and QA): the 복구함 toast in the mockup's 알림 tokens (ink, white words, a white
// [복구함 열기]); the open document's line pressed at 44px without widening its row, gone with the title row while
// the keyboard is up; and that line for the document the screen shows, also when the address names none.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const css = read('../../../components/flow/integrated-poc/AlphaWorkspace.module.css');

test('the line follows the document shown: with an id in the address, without one, and not off the writing screen', () => {
  assert.equal(recoveryLineDocumentId({ view: 'space', id: 'doc-a' }, 'doc-a'), 'doc-a');
  // The app opened on the last document: #flowme/space with no id, the space says which one is open.
  assert.equal(recoveryLineDocumentId({ view: 'space' }, 'doc-b'), 'doc-b');
  // Before the space has said (first render), the address's id.
  assert.equal(recoveryLineDocumentId({ view: 'space', id: 'doc-a' }, ''), 'doc-a');
  // Moved to another document by the address: what is open until the space has opened it.
  assert.equal(recoveryLineDocumentId({ view: 'space', id: 'doc-c' }, 'doc-a'), 'doc-a');
  assert.equal(recoveryLineDocumentId({ view: 'space' }, ''), undefined);
  assert.equal(recoveryLineDocumentId({ view: 'discover' }, 'doc-a'), undefined);
  assert.equal(recoveryLineDocumentId({ view: 'activity', id: 'x' }, 'doc-a'), undefined);
});

test('the wiring: the space reports its open document; the host counts that document\'s entries', () => {
  assert(space.includes('useEffect(() => { props.onOpenDocumentChange?.(selected); }, [selected]);'));
  assert(alpha.includes('const openDocumentId = recoveryLineDocumentId(destination, shownDocumentId);'));
  assert(alpha.includes('onMainTabChange={setMainTab} onOpenDocumentChange={setShownDocumentId}'));
  assert(alpha.includes('documentRecoveries = openDocumentId ? announcedDrafts.filter(entry => entry.documentId === openDocumentId).length'));
});

test('the toast in the 알림 tokens; the line at 44px in the same row height; hidden while the keyboard is up', () => {
  const toast = css.slice(css.indexOf('.recoveryToast {'), css.indexOf('}', css.indexOf('.recoveryToast {')));
  // Core3 P3: the same colors through tokens (--flowme-b-on-ink #fff, --flowme-b-on-ink-muted #c9d3ff).
  assert(toast.includes('background: var(--flowme-b-ink); color: var(--flowme-b-on-ink);') && !toast.includes('border-left') && !/#[0-9a-f]{3,6}/i.test(toast));
  assert(css.includes('.recoveryToast button { min-width: 44px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 8px; background: transparent; color: var(--flowme-b-on-ink-muted);'));
  assert(css.includes('.recoveryToast button:last-child { background: var(--flowme-b-on-ink); color: var(--flowme-b-primary); }'));
  assert(css.includes('.recoveryToast button:focus-visible { outline: 2px solid var(--flowme-b-on-ink); outline-offset: 2px; }'));
  // 44px to press; -6px above and below keep the row as it was at 32px.
  assert(css.includes('.documentRecovery > button { min-height: 44px; margin: -6px 0;'));
  assert(css.includes('.page[data-alpha-frame="b"][data-writing-keyboard="true"] .documentRecovery { display: none; }'));
  // The other notices' buttons keep their colors.
  for (const rule of ['.triedPrompt button {', '.moveNotice button {']) assert(css.slice(css.indexOf(rule)).split('\n')[0].includes('color: var(--flowme-b-primary-strong);'), rule);
});
