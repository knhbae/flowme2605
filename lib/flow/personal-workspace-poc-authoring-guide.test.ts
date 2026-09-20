import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
} from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG,
  findPersonalWorkspacePocFirstBlankValueLocator,
  getPersonalWorkspacePocAuthoringGuideTemplate,
  getPersonalWorkspacePocAuthoringMenuAction,
  matchPersonalWorkspacePocAuthoringGhost,
  resolvePersonalWorkspacePocAuthoringGuideTarget,
} from './personal-workspace-poc-authoring-guide';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
} from './personal-workspace-poc-authoring-fidelity';

function manifestFor(rawText: string) {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  return analyzePersonalWorkspacePocAuthoringFidelity({
    rawText,
    sourceFingerprint,
  }).manifest;
}

test('guide catalog reuses all six approved scaffold bytes with computed first-value locators', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.version, 1);
  assert.equal(
    PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.catalogFingerprint,
    'guide-v1:5460:0eh6aui',
  );
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.templates.map((template) => ({
      templateId: template.templateId,
      scaffold: template.scaffold,
    })),
    PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => ({
      templateId: template.templateId,
      scaffold: template.scaffold,
    })),
  );

  for (const sourceTemplate of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES) {
    const template = getPersonalWorkspacePocAuthoringGuideTemplate(
      sourceTemplate.templateId,
    );
    assert.ok(template, sourceTemplate.templateId);
    assert.equal(template.scaffold, sourceTemplate.scaffold);
    assert.equal(
      template.scaffoldFingerprint,
      fingerprintPersonalWorkspacePocAuthoringSource(sourceTemplate.scaffold),
    );
    assert.deepEqual(
      template.firstBlankValue,
      findPersonalWorkspacePocFirstBlankValueLocator(sourceTemplate.scaffold),
    );
    assert.equal(template.firstBlankValue.line, 1);
    assert.equal(template.firstBlankValue.syntaxPrefix, '# ');
    assert.equal(template.firstBlankValue.valueStartOffset, 2);
    assert.equal(template.firstBlankValue.valueEndOffset, 2);
  }
  assert.equal(getPersonalWorkspacePocAuthoringGuideTemplate('not-a-template'), null);
});

test('global ghost catalog describes only recognized blank syntax and never source content', () => {
  const rawText = [
    '# ',
    '- 기준일: ',
    '## ',
    '- [ ] ',
    '  - [ ] ',
    '  - 상대 날짜: ',
    '  - 날짜: ',
    '  - 장소: ',
    '  - 자료: ',
    '  - 완료 기준: ',
    '  - 반복: ',
    '  - 시간대: ',
    '# 이미 입력한 제목',
    '일반 메모',
  ].join('\n');
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const manifest = manifestFor(rawText);
  const descriptors = manifest.sourceLines.map((line) =>
    matchPersonalWorkspacePocAuthoringGhost({ rawText, sourceFingerprint, line }),
  ).filter((value) => value !== null);

  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.hintId),
    [
      'flow-title',
      'anchor-date',
      'step-title',
      'root-item',
      'child-check',
      'relative-date',
      'fixed-date',
      'place',
      'resource',
      'completion-criteria',
    ],
  );
  assert.equal(descriptors.every((descriptor) => (
    descriptor.ariaHidden
    && descriptor.pointerEvents === 'none'
    && descriptor.userSelect === 'none'
    && descriptor.sourceMutationCount === 0
    && !rawText.includes(descriptor.text)
  )), true);

  const first = descriptors[0];
  assert.equal(first.valueLocator.valueStartOffset, 2);
  assert.equal(first.valueLocator.valueEndOffset, 2);
  assert.equal(
    matchPersonalWorkspacePocAuthoringGhost({
      rawText,
      sourceFingerprint: `${sourceFingerprint}:stale`,
      line: manifest.sourceLines[0],
    }),
    null,
  );
});

test('final contextual catalog preserves hierarchy while blocking unsupported child and time writes', () => {
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.menuGroups
      .filter((group) => ['current-step', 'current-item', 'item-information', 'new-section'].includes(group.groupId))
      .map((group) => [group.label, group.actionIds]),
    [
      ['현재 단계에', ['first-task', 'next-task']],
      ['현재 할 일 안에', ['child-check']],
      ['항목 정보', [
        'item-date',
        'item-time',
        'item-place',
        'item-resource',
        'item-completion-criteria',
      ]],
      ['새 구간으로', ['new-step']],
    ],
  );
  assert.deepEqual(
    ['next-task', 'child-check', 'item-date', 'new-step'].map((actionId) => {
      const action = getPersonalWorkspacePocAuthoringMenuAction(actionId);
      assert.ok(action);
      return [action.actionId, action.syntax, action.hierarchyDepth, action.availability];
    }),
    [
      ['next-task', '- [ ] ', 0, 'enabled'],
      ['child-check', '  - [ ] ', 1, 'blocked'],
      ['item-date', '  - 날짜: ', 1, 'enabled'],
      ['new-step', '## ', 0, 'enabled'],
    ],
  );
  assert.equal(getPersonalWorkspacePocAuthoringMenuAction('item-time')?.availability, 'blocked');
  assert.equal(getPersonalWorkspacePocAuthoringMenuAction('recurrence'), null);
});

test('safe target resolver proposes title, first step, first task, and next task by exact context', () => {
  const cases = [
    ['', 0, 'flow-title'],
    ['# 여행\n', '# 여행\n'.length, 'first-step'],
    ['# 여행\n## 예약\n', '# 여행\n## 예약\n'.length, 'first-task'],
    [
      '# 여행\n## 예약\n- [ ] 항공권\n',
      '# 여행\n## 예약\n- [ ] 항공권\n'.length,
      'next-task',
    ],
  ] as const;

  for (const [rawText, caret, preferredActionId] of cases) {
    const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
    const target = resolvePersonalWorkspacePocAuthoringGuideTarget({
      rawText,
      sourceFingerprint,
      selectionStart: caret,
      selectionEnd: caret,
    });
    assert.ok(target, preferredActionId);
    assert.equal(target.kind, 'blank-line');
    assert.equal(target.preferredActionId, preferredActionId);
  }
});

test('root Item target follows its owned properties, removes duplicate properties, and preserves CRLF insertion shape', () => {
  const rawText = '# 여행\r\n## 예약\r\n- [ ] 항공권\r\n  - 날짜: 2026-09-03\r\n## 출발\r\n';
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const itemOffset = rawText.indexOf('항공권');
  const target = resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText,
    sourceFingerprint,
    selectionStart: itemOffset,
    selectionEnd: itemOffset,
  });
  assert.ok(target);
  assert.equal(target.kind, 'root-item');
  assert.equal(target.ownerItemLine, 3);
  assert.equal(target.insertionPrefix, '');
  assert.equal(target.insertionSuffix, '\r\n');
  assert.equal(rawText.slice(0, target.replaceStart).endsWith('  - 날짜: 2026-09-03\r\n'), true);
  assert.equal(target.allowedActionIds.includes('item-date'), false);
  assert.equal(target.allowedActionIds.includes('item-place'), true);
});

test('guide target keeps PoC-local preserved schedule properties reachable while ranged, protected, unknown, and stale owners fail closed', () => {
  const rawText = [
    '# 검토',
    '- [ ] 할 일',
    '  - 반복: 매일',
    '```txt',
    '',
    '```',
  ].join('\n');
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const manifest = manifestFor(rawText);
  const itemOffset = rawText.indexOf('할 일');
  const codeBlankOffset = rawText.indexOf('\n\n') + 1;

  assert.equal(resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText,
    sourceFingerprint,
    selectionStart: itemOffset,
    selectionEnd: itemOffset + 2,
  }), null);
  const preservedTarget = resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText,
    sourceFingerprint,
    selectionStart: itemOffset,
    selectionEnd: itemOffset,
  });
  assert.ok(preservedTarget);
  assert.equal(preservedTarget.kind, 'root-item');
  assert.equal(resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText,
    sourceFingerprint,
    selectionStart: codeBlankOffset,
    selectionEnd: codeBlankOffset,
  }), null);
  assert.equal(resolvePersonalWorkspacePocAuthoringGuideTarget({
    rawText: `${rawText}\n`,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(`${rawText}\n`),
    selectionStart: `${rawText}\n`.length,
    selectionEnd: `${rawText}\n`.length,
    fidelityManifest: manifest,
  }), null);
});
