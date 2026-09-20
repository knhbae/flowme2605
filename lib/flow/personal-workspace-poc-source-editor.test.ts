import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
} from './personal-workspace-poc-authoring';
import {
  resolvePersonalWorkspacePocAuthoringGuideTarget,
} from './personal-workspace-poc-authoring-guide';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
} from './personal-workspace-poc-authoring-fidelity';
import {
  createPersonalWorkspacePocSourceEditorTicket,
  planPersonalWorkspacePocHelperTransaction,
  planPersonalWorkspacePocSourceEditorTransaction,
  planPersonalWorkspacePocTemplateTransaction,
  projectPersonalWorkspacePocAuthoringSourceLines,
  type PersonalWorkspacePocSourceEditorSnapshot,
  type PersonalWorkspacePocSourceEditorTransactionResult,
} from './personal-workspace-poc-source-editor';

function snapshot(
  rawText = '',
  overrides: Partial<PersonalWorkspacePocSourceEditorSnapshot> = {},
): PersonalWorkspacePocSourceEditorSnapshot {
  return {
    editorId: 'editor-1',
    documentId: 'document-1',
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
    selectionStart: rawText.length,
    selectionEnd: rawText.length,
    selectionDirection: 'none',
    scrollTop: 0,
    scrollLeft: 0,
    dispatchCount: 0,
    composing: false,
    ...overrides,
  };
}

function assertZeroMutation(
  result: PersonalWorkspacePocSourceEditorTransactionResult,
  reason: string,
): void {
  assert.equal(result.ok, false, reason);
  if (result.ok) return;
  assert.equal(result.reason, reason);
  assert.deepEqual(
    [
      result.sourceMutationCount,
      result.draftMutationCount,
      result.workspaceMutationCount,
      result.operatingMutationCount,
    ],
    [0, 0, 0, 0],
  );
}

test('each approved template is one replacement with exact bytes and a computed first-value caret', () => {
  for (const [index, template] of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.entries()) {
    const current = snapshot('', { dispatchCount: index });
    const ticket = createPersonalWorkspacePocSourceEditorTicket({
      transactionId: `template-${index}`,
      kind: 'template',
      snapshot: current,
    });
    const result = planPersonalWorkspacePocTemplateTransaction({
      ticket,
      current,
      templateId: template.templateId,
    });
    assert.equal(result.ok, true, template.templateId);
    if (!result.ok) continue;
    assert.equal(result.plan.replaceOperationCount, 1);
    assert.equal(result.plan.sourceMutationCount, 1);
    assert.equal(result.plan.draftMutationMaximum, 1);
    assert.equal(result.plan.workspaceMutationCount, 0);
    assert.equal(result.plan.operatingMutationCount, 0);
    assert.equal(result.plan.replacement.replaceStart, 0);
    assert.equal(result.plan.replacement.replaceEnd, 0);
    assert.equal(result.plan.replacement.insertedText, template.scaffold);
    assert.equal(result.plan.nextSnapshot.rawText, template.scaffold);
    assert.equal(result.plan.nextSnapshot.selectionStart, 2);
    assert.equal(result.plan.nextSnapshot.selectionEnd, 2);
    assert.equal(result.plan.nextSnapshot.dispatchCount, index + 1);
  }
});

test('editor ticket rejects double, composing, stale identity/source/dispatch, and nonempty template applies with zero mutations', () => {
  const expected = snapshot('');
  const ticket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'guarded-template',
    kind: 'template',
    snapshot: expected,
  });
  const templateId = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0].templateId;

  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: expected,
    templateId,
    consumedTransactionIds: ['guarded-template'],
  }), 'already-applied');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, composing: true },
    templateId,
  }), 'composing');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, editorId: 'editor-2' },
    templateId,
  }), 'stale-editor');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, documentId: 'document-2' },
    templateId,
  }), 'stale-document');

  const changed = snapshot('changed');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: changed,
    templateId,
  }), 'stale-source');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, dispatchCount: 1 },
    templateId,
  }), 'stale-dispatch');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, selectionDirection: 'forward' },
    templateId,
  }), 'stale-selection');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, scrollTop: 1 },
    templateId,
  }), 'stale-scroll');

  const nonempty = snapshot('# existing');
  const nonemptyTicket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'nonempty-template',
    kind: 'template',
    snapshot: nonempty,
  });
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket: nonemptyTicket,
    current: nonempty,
    templateId,
  }), 'source-not-empty');
  assertZeroMutation(planPersonalWorkspacePocTemplateTransaction({
    ticket,
    current: { ...expected, sourceFingerprint: 'raw-v1:0:forged0' },
    templateId,
  }), 'invalid-source-fingerprint');
});

test('generic transaction validates one replace range and the next selection before mutation', () => {
  const current = snapshot('abc');
  const ticket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'generic-helper',
    kind: 'helper',
    snapshot: current,
  });
  assertZeroMutation(planPersonalWorkspacePocSourceEditorTransaction({
    ticket,
    current,
    replacement: {
      replaceStart: -1,
      replaceEnd: 0,
      insertedText: 'x',
      nextSelectionStart: 0,
      nextSelectionEnd: 0,
    },
  }), 'invalid-replace-range');
  assertZeroMutation(planPersonalWorkspacePocSourceEditorTransaction({
    ticket,
    current,
    replacement: {
      replaceStart: 0,
      replaceEnd: 0,
      insertedText: '',
      nextSelectionStart: 0,
      nextSelectionEnd: 0,
    },
  }), 'empty-insert');
  assertZeroMutation(planPersonalWorkspacePocSourceEditorTransaction({
    ticket,
    current,
    replacement: {
      replaceStart: 0,
      replaceEnd: 0,
      insertedText: 'x',
      nextSelectionStart: 99,
      nextSelectionEnd: 99,
    },
  }), 'invalid-next-selection');
});

test('helper uses the same one-replacement plan for a blank target and an owned Item block', () => {
  const blank = snapshot('');
  const blankTarget = resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText: blank.rawText,
    sourceFingerprint: blank.sourceFingerprint,
    selectionStart: 0,
    selectionEnd: 0,
  });
  assert.ok(blankTarget);
  const blankTicket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'helper-title',
    kind: 'helper',
    snapshot: blank,
  });
  const title = planPersonalWorkspacePocHelperTransaction({
    ticket: blankTicket,
    current: blank,
    target: blankTarget,
    actionId: 'flow-title',
  });
  assert.equal(title.ok, true);
  if (title.ok) {
    assert.equal(title.plan.replaceOperationCount, 1);
    assert.equal(title.plan.nextSnapshot.rawText, '# ');
    assert.equal(title.plan.nextSnapshot.selectionStart, 2);
  }

  const itemRaw = '# 여행\r\n## 준비\r\n- [ ] 여권 확인';
  const itemOffset = itemRaw.indexOf('여권');
  const item = snapshot(itemRaw, {
    selectionStart: itemOffset,
    selectionEnd: itemOffset,
  });
  const itemTarget = resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText: item.rawText,
    sourceFingerprint: item.sourceFingerprint,
    selectionStart: item.selectionStart,
    selectionEnd: item.selectionEnd,
  });
  assert.ok(itemTarget);
  const itemTicket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'helper-date',
    kind: 'helper',
    snapshot: item,
  });
  const date = planPersonalWorkspacePocHelperTransaction({
    ticket: itemTicket,
    current: item,
    target: itemTarget,
    actionId: 'item-date',
  });
  assert.equal(date.ok, true);
  if (date.ok) {
    assert.equal(
      date.plan.nextSnapshot.rawText,
      `${itemRaw}\r\n  - 날짜: `,
    );
    assert.equal(
      date.plan.nextSnapshot.selectionStart,
      date.plan.nextSnapshot.rawText.length,
    );
    assert.equal(date.plan.nextSnapshot.dispatchCount, 1);
  }
});

test('helper blocks unsupported, duplicate, foreign-target, and wrong-kind actions with zero mutations', () => {
  const rawText = '# 여행\n## 준비\n- [ ] 여권\n  - 날짜: 2026-09-03';
  const offset = rawText.indexOf('여권');
  const current = snapshot(rawText, { selectionStart: offset, selectionEnd: offset });
  const target = resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText,
    sourceFingerprint: current.sourceFingerprint,
    selectionStart: offset,
    selectionEnd: offset,
  });
  assert.ok(target);
  const ticket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'helper-guard',
    kind: 'helper',
    snapshot: current,
  });
  assertZeroMutation(planPersonalWorkspacePocHelperTransaction({
    ticket,
    current,
    target,
    actionId: 'child-check',
  }), 'unsupported-action');
  assertZeroMutation(planPersonalWorkspacePocHelperTransaction({
    ticket,
    current,
    target,
    actionId: 'item-date',
  }), 'action-not-allowed');
  assertZeroMutation(planPersonalWorkspacePocHelperTransaction({
    ticket,
    current,
    target: { ...target, sourceFingerprint: 'raw-v1:0:stale00' },
    actionId: 'item-place',
  }), 'stale-guide-target');

  const templateTicket = createPersonalWorkspacePocSourceEditorTicket({
    transactionId: 'wrong-kind',
    kind: 'template',
    snapshot: current,
    requireEmptySource: false,
  });
  assertZeroMutation(planPersonalWorkspacePocHelperTransaction({
    ticket: templateTicket,
    current,
    target,
    actionId: 'item-place',
  }), 'wrong-transaction-kind');
});

test('Flow presentation renders only inactive supported lines and keeps exact overlay geometry', () => {
  const rawText = [
    '# 여행 🙂',
    '## 준비',
    '- [ ] 여권 확인',
    '  - 날짜: 2026-09-03',
    '  - [ ] 하위 확인',
    '일반 메모',
    '# ',
    '```txt',
    '- [ ] 가짜',
    '```',
    '',
  ].join('\r\n');
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const activeOffset = rawText.indexOf('여권');
  const projection = projectPersonalWorkspacePocAuthoringSourceLines({
    rawText,
    sourceFingerprint,
    view: 'flow',
    selectionStart: activeOffset,
    selectionEnd: activeOffset,
    ghostEnabled: true,
  });

  assert.equal(projection.failSafeRaw, false);
  assert.deepEqual(projection.activeLineNumbers, [3]);
  assert.deepEqual(
    projection.lines.map((line) => [line.line, line.mode, line.reason]),
    [
      [1, 'rendered', 'supported-inactive'],
      [2, 'rendered', 'supported-inactive'],
      [3, 'raw', 'active-selection'],
      [4, 'rendered', 'supported-inactive'],
      [5, 'rendered', 'supported-inactive'],
      [6, 'raw', 'source-only'],
      [7, 'raw', 'incomplete'],
      [8, 'raw', 'protected'],
      [9, 'raw', 'protected'],
      [10, 'raw', 'protected'],
      [11, 'raw', 'incomplete'],
    ],
  );
  for (const line of projection.lines.filter((candidate) => candidate.mode === 'rendered')) {
    assert.equal(line.presentationText?.length, line.rawLine.length, `line:${line.line}`);
  }
  assert.equal(projection.lines[0].presentationText, '  여행 🙂');
  assert.equal(projection.lines[2].presentationText, undefined);
  assert.equal(projection.lines[3].presentationText, '    날짜: 2026-09-03');
  assert.equal(projection.lines[3].hierarchyDepth, 1);
  assert.equal(projection.lines[3].showHierarchyGuide, true);
  assert.equal(projection.lines[6].ghost?.hintId, 'flow-title');
});

test('multi-line selection makes every spanned line raw while other recognized lines stay rendered', () => {
  const rawText = '# 여행\r\n## 준비\r\n- [ ] 여권\r\n  - 장소: 공항\r\n';
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const selectionStart = rawText.indexOf('여행');
  const selectionEnd = rawText.indexOf('여권') + 1;
  const projection = projectPersonalWorkspacePocAuthoringSourceLines({
    rawText,
    sourceFingerprint,
    view: 'flow',
    selectionStart,
    selectionEnd,
    ghostEnabled: false,
  });
  assert.deepEqual(projection.activeLineNumbers, [1, 2, 3]);
  assert.deepEqual(projection.lines.map((line) => line.mode), [
    'raw',
    'raw',
    'raw',
    'rendered',
    'raw',
  ]);
});

test('pure view and stale manifest fail safe to raw without ghost or source mutation', () => {
  const original = '# 원본\n- [ ] 확인\n# ';
  const fingerprint = fingerprintPersonalWorkspacePocAuthoringSource(original);
  const manifest = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText: original,
    sourceFingerprint: fingerprint,
  }).manifest;
  const pure = projectPersonalWorkspacePocAuthoringSourceLines({
    rawText: original,
    sourceFingerprint: fingerprint,
    view: 'text',
    selectionStart: 0,
    selectionEnd: 0,
    ghostEnabled: true,
    fidelityManifest: manifest,
  });
  assert.equal(pure.lines.every((line) => line.mode === 'raw' && !line.ghost), true);

  const changed = `${original}\n`;
  const stale = projectPersonalWorkspacePocAuthoringSourceLines({
    rawText: changed,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(changed),
    view: 'flow',
    selectionStart: 0,
    selectionEnd: 0,
    ghostEnabled: true,
    fidelityManifest: manifest,
  });
  assert.equal(stale.failSafeRaw, true);
  assert.equal(stale.lines.every((line) => line.mode === 'raw' && !line.ghost), true);
  assert.equal(stale.lines.map((line) => line.source.rawText).join(''), changed);
});
