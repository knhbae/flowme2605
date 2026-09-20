import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonalWorkspacePocAuthoringSurface.tsx', import.meta.url), 'utf8');

// These are source-level coordinator regressions. The unchanged Stage 2 browser
// cases separately verify actual first-line and first-blank DOM selection.
test('C1FO01 explicit entry focuses the first line only in the verified untouched new document', () => {
  const commit = source.slice(source.indexOf('  const commitEntryAuthoring ='), source.indexOf('  const prepareEntryAuthoring ='));
  const focus = commit.slice(commit.indexOf('        const focus ='), commit.indexOf('        consumeEntryConfirmation(focus)'));
  assert.match(commit, /const nextDocumentId = `\$\{AUTHORING_DOCUMENT_ID\}:personal:\$\{editorDocumentEpoch \+ 1\}`/u);
  assert.match(focus, /entryMounted\.current/u);
  assert.match(focus, /current\?\.documentId !== nextDocumentId/u);
  assert.match(focus, /current\.rawText !== saved\.draft\.rawText/u);
  assert.match(focus, /current\.dispatchCount !== 0/u);
  assert.match(focus, /current\.composing/u);
  assert.match(focus, /pending\.current \|\| entryAttempt\.current/u);
  assert.match(focus, /current\.selectionStart !== 0 \|\| current\.selectionEnd !== 0/u);
  assert.match(focus, /entryAuthoringBridge\.isLocked\(\)/u);
  assert.doesNotMatch(focus, /currentOwnedEntry\(|readPersonalWorkspacePocEntryNavigationBinding\(|finishOwnedEntryWrite\(/u);
  assert.match(focus, /sourceRef\.current\?\.focusRange\(0, 0\)/u);
  assert.doesNotMatch(focus, /focusRange\(saved\.draft\.rawText\.length/u);
  assert.ok(commit.indexOf('finishOwnedEntryWrite') < commit.indexOf('adoptAuthoringDocument'));
});

test('C1FO02 a verified scaffold focuses its first blank synchronously and deferred scrolling cannot replace a later selection', () => {
  const apply = source.slice(source.indexOf('  const applyTemplate ='), source.indexOf('  const applyStructureTemplatePreview ='));
  const focused = apply.indexOf('    sourceRef.current?.focusRange(');
  const frame = apply.indexOf('    window.requestAnimationFrame(');
  assert.ok(focused > apply.indexOf('if (!lastDraftPersistenceOk.current)'), 'only after persistence success');
  assert.ok(focused > apply.indexOf('if (!applied?.ok)'), 'only after native transaction success');
  assert.ok(focused < frame, 'first blank is not deferred to an animation frame');
  const direct = apply.slice(focused, frame);
  assert.match(direct, /planned\.plan\.replacement\.nextSelectionStart/u);
  assert.match(direct, /planned\.plan\.replacement\.nextSelectionEnd/u);
  const scroll = apply.slice(frame, apply.indexOf('    const template =', frame));
  assert.doesNotMatch(scroll, /focusRange|setSelectionRange/u);
  assert.match(scroll, /current\?\.documentId !== applied\.snapshot\.documentId/u);
  assert.match(scroll, /current\.dispatchCount !== applied\.snapshot\.dispatchCount/u);
  assert.match(scroll, /current\.selectionStart !== planned\.plan\.replacement\.nextSelectionStart/u);
  assert.match(scroll, /current\.selectionEnd !== planned\.plan\.replacement\.nextSelectionEnd/u);
  assert.match(scroll, /scrollIntoView/u);
});
