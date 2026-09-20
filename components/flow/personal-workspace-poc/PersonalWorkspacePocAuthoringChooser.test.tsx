import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AUTHORING_CHOOSER_GROUPS, createAuthoringChooser, reduceAuthoringChooser, selectAuthoringChooser,
} from '@/lib/flow/personal-workspace-poc-authoring-chooser';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '@/lib/flow/personal-workspace-poc-authoring';
import {
  PersonalWorkspacePocAuthoringChooserGroups,
  isPersonalWorkspacePocAuthoringPropertyOwnerCurrent,
  type PersonalWorkspacePocAuthoringPropertyOwner,
} from './PersonalWorkspacePocAuthoringSurface';

const source = readFileSync(new URL('./PersonalWorkspacePocAuthoringSurface.tsx', import.meta.url), 'utf8');
const body = (name: string) => source.match(new RegExp(`const ${name} = (?:useCallback\\()?([\\s\\S]*?)\\n  \\};`, 'u'))?.[0] ?? '';

function ownerFixture(): PersonalWorkspacePocAuthoringPropertyOwner {
  const rawText = '# 원문\r\n## 준비\r\n- [ ] 정확한 항목\r\n  - 장소: 원래 장소';
  return {
    itemTitle: '정확한 항목', draftSerialized: JSON.stringify({ rawText, intent: 'opening' }),
    snapshot: {
      editorId: 'same-native-editor', documentId: 'same-document', rawText,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
      dispatchCount: 3, selectionStart: 17, selectionEnd: 17, selectionDirection: 'none',
      scrollTop: 80, scrollLeft: 0, composing: false,
    },
  };
}

test('K3A first group component renders exactly four native buttons and no property/value form', () => {
  const html = renderToStaticMarkup(<PersonalWorkspacePocAuthoringChooserGroups groups={AUTHORING_CHOOSER_GROUPS} disabled={false} onChoose={() => { throw new Error('SSR must not dispatch'); }} />);
  assert.equal((html.match(/<button\b/gu) ?? []).length, 4);
  for (const { key, label } of AUTHORING_CHOOSER_GROUPS) {
    assert.ok(html.includes(`data-testid="personal-workspace-authoring-chooser-group-${key}"`));
    assert.ok(html.includes(`>${label}</button>`));
  }
  assert.doesNotMatch(html, /<input|<form|role="menu|tabindex="-1"|property-edit-/u);
  assert.match(html, /min-h-12/u);
});

test('K3A applying/recovery group component keeps all four buttons present and disabled', () => {
  const html = renderToStaticMarkup(<PersonalWorkspacePocAuthoringChooserGroups groups={AUTHORING_CHOOSER_GROUPS} disabled onChoose={() => {}} />);
  assert.equal((html.match(/disabled=""/gu) ?? []).length, 4);
  assert.equal((html.match(/<button\b/gu) ?? []).length, 4);
});

test('K3A React owner and failed empty input survive value-back-group roundtrip without source reticketing', () => {
  const owner = ownerFixture();
  const before = JSON.stringify(owner);
  const editor = { owner, key: 'place', value: '' };
  const feedback = { kind: 'failed', message: '입력한 값은 남아 있어요.' };
  const draft = { editor, feedback };
  let state = createAuthoringChooser<typeof owner, typeof draft>({ owner, entry: 'groups' });
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'choose-group', group: 'schedule' }).state;
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'choose-property', key: 'place', initialDraft: draft }).state;
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'back' }).state;
  assert.equal(selectAuthoringChooser(state).stage, 'properties');
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'back' }).state;
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'choose-group', group: 'schedule' }).state;
  state = reduceAuthoringChooser(state, { session: state.session, owner, type: 'choose-property', key: 'place', initialDraft: { editor: { ...editor, value: '잘못된 기본값' }, feedback } }).state;
  assert.strictEqual(state.drafts.place, draft);
  assert.strictEqual(state.drafts.place?.editor.owner, owner);
  assert.strictEqual(state.drafts.place?.feedback, feedback);
  assert.equal(state.drafts.place?.editor.value, '');
  assert.equal(isPersonalWorkspacePocAuthoringPropertyOwnerCurrent(owner, { ...owner.snapshot, dispatchCount: 5 }), false);
  assert.equal(JSON.stringify(owner), before);
});

test('K3A React cached form branch runs before fresh snapshot and never rereads draft or rebuilds its source owner', () => {
  const open = body('openPropertyEditor');
  const cachedStart = open.indexOf("if (currentChooser?.stage === 'properties' && remembered)");
  const cachedEnd = open.indexOf('const snapshot = sourceRef.current?.readSnapshot();', cachedStart);
  assert.ok(cachedStart >= 0 && cachedEnd > cachedStart);
  const cached = open.slice(cachedStart, cachedEnd);
  assert.match(cached, /setPropertyEditor\(remembered\.editor\)/u);
  assert.match(cached, /setSourceHelperFeedback\(remembered\.feedback\)/u);
  assert.doesNotMatch(cached, /localStorage|getItem|createPersonalWorkspacePocSourceEditorTicket/u);
  assert.match(open, /if \(currentChooser\) draftSerialized = currentChooser\.owner\.draftSerialized/u);
  assert.match(open, /snapshot: currentChooser\?\.owner\.ticket\.expected \?\? snapshot/u);
});

test('K3A React one-level back stores values plus failure and applies the existing pending/recovery lock', () => {
  const navigation = source.match(/const navigateChooser = useCallback\(([\s\S]*?)\n  \}, \[closeOverlay/u)?.[1] ?? '';
  assert.match(navigation, /pending\.current \|\| sourceHelperRecoveryRequired\.current/u);
  assert.match(navigation, /type: 'remember-value',[\s\S]*draft: \{ editor: propertyEditor, feedback: sourceHelperFeedback \}/u);
  assert.match(navigation, /session: current\.session, owner: current\.owner/u);
  assert.doesNotMatch(navigation, /getItem|setItem|removeItem|applyNativeReplacement|applyPersistedSourceHelper/u);
  assert.match(source, /if \(chooserRef\.current\?\.stage === 'value' && navigateChooser\(\{ type: 'back' \}\)\) return/u);
});

test('K3A React explicit reselect creates a new session for the confirmed target and only the current field draft', () => {
  const reselect = body('confirmPropertyOwnerSelection');
  assert.match(reselect, /snapshot\.documentId !== propertyEditor\.owner\.snapshot\.documentId/u);
  assert.match(reselect, /createAuthoringChooser<HelperOverlay, AuthoringChooserDraft>\(\{ owner: helper, entry: previousChooser\.entry \}\)/u);
  assert.match(reselect, /key: previousChooser\.property,[\s\S]*initialDraft: \{ editor: \{ \.\.\.propertyEditor, itemSourceLine, owner \}/u);
  assert.doesNotMatch(reselect, /\.\.\.previousChooser\.drafts/u);
  assert.match(body('applyPropertyEditor'), /expectedDraftSerialized: propertyEditor\.owner\.draftSerialized/u);
});

test('K3A React chooser Tab leaves native navigation alone and Escape pops before closing other overlays', () => {
  const events = source.match(/const onEscape = \(event: KeyboardEvent\) => \{([\s\S]*?)\n    \};/u)?.[1] ?? '';
  const tab = events.slice(0, events.indexOf("if (event.key !== 'Escape'"));
  assert.match(tab, /event\.key === 'Tab'/u);
  assert.match(tab, /reason: 'tab'/u);
  assert.doesNotMatch(tab, /preventDefault|\.focus\(/u);
  assert.ok(events.indexOf("navigateChooser({ type: 'back' })") < events.indexOf('if (overlay)'));
  assert.match(events, /event\.isComposing \|\| event\.keyCode === 229/u);
});

test('K3A external document and help transitions discard the chooser without bypassing recovery locks', () => {
  for (const name of ['beginAuthoring', 'toggleTemplatePicker', 'openValidationExamples', 'repairNearMiss', 'focusIssue']) {
    assert.match(body(name), /setChooser\(undefined\)/u, name);
  }
  for (const name of ['toggleTemplatePicker', 'openValidationExamples']) {
    assert.match(body(name), /pending\.current \|\| sourceHelperRecoveryRequired\.current/u, name);
  }
  assert.match(source, /candidate && !candidate\.matches\(':disabled'\) \? candidate : overlayHeadingRef\.current/u);
});

test('K3A anchored desktop helper bounds its own scroll height by space below the resolved top', () => {
  const desktopHelper = source.match(/@media \(min-width: 900px\) \{\s+\[data-testid="personal-workspace-authoring-helper-menu"\] \{([\s\S]*?)\n          \}/u)?.[1] ?? '';
  assert.match(desktopHelper, /--poc-helper-resolved-top: clamp\(/u);
  assert.match(desktopHelper, /top: var\(--poc-helper-resolved-top\)/u);
  assert.match(desktopHelper, /max-height: min\(28rem, calc\(var\(--poc-visual-viewport-top, 0px\) \+ var\(--poc-visual-viewport-height, 100dvh\) - var\(--poc-helper-resolved-top\) - max\(\.5rem, var\(--personal-workspace-authoring-safe-bottom\)\)\)\)/u);
  assert.match(source, /data-testid="personal-workspace-authoring-helper-menu"[\s\S]*?overflow-y-auto/u);
  assert.doesNotMatch(desktopHelper, /position: absolute|overflow: hidden/u);
});

test('K3A short landscape inline value editing releases only its local nested scroller without replacing the editor or hiding feedback', () => {
  assert.match(source, /const inlinePropertyEditorActive = Boolean\(\s+propertyEditor && !dependentPropertyOpen && mobileStep === 'input' && authoringStarted && !receipt,/u);
  assert.match(source, /mainClassName=\{inlinePropertyEditorActive \? 'personal-workspace-authoring-inline-property-active' : undefined\}/u);
  const landscape = source.slice(source.indexOf('@media (max-width: 1023px) and (max-height: 480px) and (orientation: landscape)'));
  const override = landscape.slice(landscape.indexOf('/* The inline form needs'), landscape.indexOf('      `}</style>'));
  for (const element of ['shell', 'content', 'columns', 'column']) {
    assert.match(override, new RegExp(`personal-workspace-authoring-${element}[^\\n]+height: auto`, 'u'));
  }
  assert.equal((override.match(/personal-workspace-authoring-inline-property-active/gu) ?? []).length, 4);
  assert.doesNotMatch(override, /platform-nav|display: none|font-size|position: fixed|min-height: 2/u);
  assert.match(source, /inlinePanel=\{renderPropertyEditorForm\('inline'\)\}/u);
  assert.match(source, /data-testid="personal-workspace-authoring-property-owner"/u);
  assert.match(source, /'personal-workspace-authoring-property-feedback'/u);
  assert.match(source, /data-testid="personal-workspace-authoring-property-retry"/u);
});
