import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
  materializePersonalWorkspacePocAuthoring,
  parsePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
  isPersonalWorkspacePocAuthoringFidelityManifestForSource,
  type PersonalWorkspacePocAuthoringFidelityCode,
} from './personal-workspace-poc-authoring-fidelity';

function analyze(rawText: string) {
  return analyzePersonalWorkspacePocAuthoringFidelity({
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
  });
}

function assertExactLocators(rawText: string): void {
  const result = analyze(rawText);
  for (const entry of result.manifest.entries) {
    assert.equal(
      entry.source.rawText,
      rawText.slice(entry.source.startOffset, entry.source.endOffset),
      entry.entryId,
    );
    assert.equal(entry.source.exact, true, entry.entryId);
  }
  let previousEnd = 0;
  for (const sourceLine of result.manifest.sourceLines) {
    assert.equal(sourceLine.line, result.manifest.sourceLines.indexOf(sourceLine) + 1);
    assert.equal(sourceLine.locator.startOffset, previousEnd, `line:${sourceLine.line}`);
    assert.equal(
      sourceLine.locator.rawText,
      rawText.slice(sourceLine.locator.startOffset, sourceLine.locator.endOffset),
      `line:${sourceLine.line}`,
    );
    assert.equal(sourceLine.locator.rawText.startsWith(sourceLine.rawLine), true);
    assert.equal(sourceLine.locator.exact, true);
    previousEnd = sourceLine.locator.endOffset;
  }
  assert.equal(previousEnd, rawText.length);
  assert.equal(
    result.manifest.sourceLines.map((line) => line.locator.rawText).join(''),
    rawText,
  );
}

test('every CRLF source line records raw text, semantic role, ownership, support, severity, and exact bytes', () => {
  const rawText = [
    '# 일정 🙂',
    '- 기준일: 2026-09-03',
    '',
    '이 문장은 원문 메모다.',
    '## 준비',
    '- [ ] 가방 확인',
    '\t- 장소:\t서울',
    '```txt',
    '- [ ] 코드 속 가짜 항목',
    '```',
    '  - 나만의 값: 확인 🧪',
    '',
  ].join('\r\n');

  const result = analyze(rawText);
  assert.deepEqual(
    result.manifest.sourceLines.map((line) => [
      line.line,
      line.rawLine,
      line.kind,
      line.owner,
      line.support,
      line.severity,
      line.reason,
      line.ownerItemLine ?? null,
    ]),
    [
      [1, '# 일정 🙂', 'title', 'flow', 'supported', 'none', 'flow-title', null],
      [2, '- 기준일: 2026-09-03', 'property', 'flow', 'supported', 'none', 'flow-anchor', null],
      [3, '', 'blank', 'source', 'source-only', 'none', 'blank-source-line', null],
      [4, '이 문장은 원문 메모다.', 'prose', 'source', 'source-only', 'none', 'ordinary-source-prose', null],
      [5, '## 준비', 'section', 'item', 'supported', 'none', 'item-section', null],
      [6, '- [ ] 가방 확인', 'item', 'item', 'supported', 'none', 'personal-flow-item', 6],
      [7, '\t- 장소:\t서울', 'property', 'item', 'supported', 'none', 'supported-item-property', 6],
      [8, '```txt', 'fenced-code', 'source', 'source-only', 'none', 'fenced-code-preserved', null],
      [9, '- [ ] 코드 속 가짜 항목', 'fenced-code', 'source', 'source-only', 'none', 'fenced-code-preserved', null],
      [10, '```', 'fenced-code', 'source', 'source-only', 'none', 'fenced-code-preserved', null],
      [11, '  - 나만의 값: 확인 🧪', 'property', 'item', 'supported', 'none', 'source-backed-item-description', 6],
      [12, '', 'blank', 'source', 'source-only', 'none', 'blank-source-line', null],
    ],
  );
  assertExactLocators(rawText);
});

function materialize(rawText: string) {
  return materializePersonalWorkspacePocAuthoring({
    handoffId: 'handoff-fidelity',
    documentId: 'document-fidelity',
    revisionId: 'revision-fidelity',
    rawText,
    committedAt: '2026-09-02T00:00:00.000Z',
  });
}

test('source-backed descriptions and JS-string locators are deterministic across CRLF, tabs, emoji, and trailing newline', () => {
  const rawText = [
    '# exact 🙂',
    '- [ ] 확인',
    '  - 알 수 없는 속성:\t값 🧪',
    '표식 없는 일반 문장은 원문이다.',
    '',
  ].join('\r\n');

  const first = analyze(rawText);
  const second = analyze(rawText);
  assert.deepEqual(first, second);
  assert.equal(first.manifest.sourceLength, rawText.length);
  assert.equal(first.manifest.sourceFingerprint, fingerprintPersonalWorkspacePocAuthoringSource(rawText));
  assert.deepEqual(first.manifest.entries, []);
  assert.equal(first.manifest.sourceLines[2].support, 'supported');
  assert.equal(first.manifest.sourceLines[2].reason, 'source-backed-item-description');
  assertExactLocators(rawText);
});

test('fenced code is source-only and cannot create Items or fidelity false positives', () => {
  const rawText = [
    '# 코드 메모',
    '```txt',
    '- [] 고치지 않음',
    '- [ ] 가짜 할 일',
    '  - 시간: 09:00',
    '이름\t날짜',
    '예약\t2026-09-02',
    '```',
    '- [ ] 실제 할 일',
  ].join('\n');

  const fidelity = analyze(rawText);
  assert.deepEqual(fidelity.manifest.entries, []);
  assert.deepEqual(fidelity.protectedLineNumbers, [2, 3, 4, 5, 6, 7, 8]);
  const parsed = parsePersonalWorkspacePocAuthoring(rawText);
  assert.deepEqual(parsed.items.map((item) => item.title), ['실제 할 일']);
  assert.deepEqual(parsed.blockingIssues, []);
});

test('one-level subchecks and direct source-backed descriptions are supported while deeper checks block', () => {
  const rawText = [
    '# 요리',
    '- [ ] 재료 준비',
    '  - [ ] 양파 손질',
    '    - [x] 양파 심 제거',
    '  - 나만의 팁: 찬물에 헹근다',
    '  - 빈 속성:   ',
  ].join('\n');

  const result = analyze(rawText);
  assert.deepEqual(
    result.manifest.entries.map((entry) => [entry.code, entry.source.startLine]),
    [
      ['nested-checklist-unsupported', 4],
    ],
  );
  assert.equal(result.manifest.entries[0].ownerItemLine, 2);
  assert.equal(result.manifest.sourceLines[2].reason, 'item-subcheck');
  assert.equal(result.manifest.sourceLines[4].reason, 'source-backed-item-description');
  assertExactLocators(rawText);
});

test('recurrence, recurrence end, time, and time zone are supported dedicated properties', () => {
  const rawText = [
    '# 루틴',
    '- [ ] 운동',
    '  - 반복: 매주 월, 수, 금',
    '  - 반복 종료: 2026-10-30',
    '  - 시간: 07:30',
    '  - 시간대: Asia/Seoul',
  ].join('\n');

  const result = analyze(rawText);
  assert.deepEqual(result.manifest.entries, []);
  assert.deepEqual(result.manifest.blockingCodes, []);
  assert.equal(
    result.manifest.sourceLines.slice(2).every((line) => (
      line.support === 'supported' && line.reason === 'supported-item-property'
    )),
    true,
  );
  assertExactLocators(rawText);
});

test('Markdown, TSV, and conservative CSV runs become exact table blocks', () => {
  const rawText = [
    '# 표 메모',
    '| 이름 | 날짜 |',
    '| --- | --- |',
    '| 예약 | 2026-09-02 |',
    '',
    '이름\t날짜',
    '예약\t2026-09-02',
    '',
    'name,date',
    'booking,2026-09-02',
    'packing,2026-09-03',
  ].join('\r\n');

  const result = analyze(rawText);
  assert.deepEqual(
    result.manifest.entries.map((entry) => [entry.code, entry.field]),
    [
      ['table-unsupported', 'markdown'],
      ['table-unsupported', 'tsv'],
      ['table-unsupported', 'csv'],
    ],
  );
  for (const entry of result.manifest.entries) {
    for (let line = entry.source.startLine; line <= entry.source.endLine; line += 1) {
      const sourceLine = result.manifest.sourceLines[line - 1];
      assert.equal(sourceLine.kind, 'table');
      assert.equal(sourceLine.support, 'unsupported');
      assert.equal(sourceLine.severity, 'blocking');
      assert.equal(sourceLine.reason, 'table-unsupported');
    }
  }
  assertExactLocators(rawText);
});

test('single comma prose and authoring property values are not mistaken for tables', () => {
  const rawText = [
    '# 메모',
    '- [ ] 확인',
    '  - 장소: 서울, 강남',
    '일반 문장, 쉼표가 있어도 표가 아니다.',
    '다음 문장, 이어서 쓴 메모다.',
  ].join('\n');

  assert.deepEqual(analyze(rawText).manifest.entries, []);
  assert.equal(materialize(rawText).ok, true);
});

test('only the three narrow nonblank root checkbox near-misses are correctable blockers', () => {
  const rawText = [
    '# 문법',
    '- [] 1번',
    '-[] 2번',
    '- [  ] 3번',
    '- []',
    '- [x] 완료',
    '  - [] 들여쓴 행',
    '* [] 모호한 행',
    '- [ ] 정상',
  ].join('\n');

  const result = analyze(rawText);
  assert.deepEqual(
    result.manifest.entries.map((entry) => entry.source.startLine),
    [2, 3, 4],
  );
  assert.equal(result.manifest.entries.every((entry) => (
    entry.code === 'near-miss-checkbox'
    && entry.next === 'correct'
    && entry.commit === 'block'
  )), true);
  assertExactLocators(rawText);
});

test('all approved blank scaffolds keep zero fidelity entries and zero parse issues', () => {
  for (const template of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES) {
    const parsed = parsePersonalWorkspacePocAuthoring(template.scaffold);
    assert.deepEqual(parsed.fidelityManifest.entries, [], template.templateId);
    assert.equal(
      parsed.fidelityManifest.sourceLines.every((line) => line.support === 'source-only'),
      true,
      template.templateId,
    );
    assert.deepEqual(parsed.blockingIssues, [], template.templateId);
  }
});

test('every unsupported material category blocks materialization instead of becoming an accepted loss', () => {
  const cases: Array<readonly [PersonalWorkspacePocAuthoringFidelityCode, string]> = [
    ['unknown-property', '    - 알 수 없는 속성: 값'],
    ['nested-checklist-unsupported', '    - [ ] 하위 확인'],
    ['table-unsupported', 'name,date\nfirst,2026-09-02\nsecond,2026-09-03'],
    ['near-miss-checkbox', '- [] 표식 수정'],
  ];

  for (const [code, material] of cases) {
    const rawText = ['# 차단', '- [ ] 정상 항목', material].join('\n');
    const result = materialize(rawText);
    assert.equal(result.ok, false, code);
    assert.equal(result.handoff.status, 'blocked', code);
    assert.ok(result.handoff.blockingIssues.includes(code), code);
    assert.ok(result.handoff.fidelityManifest.blockingCodes.includes(code), code);
    assertExactLocators(rawText);
  }
});

test('simple title and fixed date still materialize while preserving exact CRLF source', () => {
  const rawText = '# 예약\r\n- [ ] 방문\r\n  - 날짜: 2026-09-03\r\n일반 메모 🙂\r\n';
  const result = materialize(rawText);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.rawText, rawText);
  assert.equal(result.lineage.rawText, rawText);
  assert.equal(result.flow.authoring.rawText, rawText);
  assert.deepEqual(result.handoff.blockingIssues, []);
  assert.deepEqual(result.handoff.fidelityManifest.entries, []);
});

test('persisted fidelity manifest validation rejects stale source and altered decisions', () => {
  const rawText = '# 준비\r\n- [ ] 예약\r\n  - 날짜: 2026-09-03\r\n';
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const manifest = analyze(rawText).manifest;
  assert.equal(isPersonalWorkspacePocAuthoringFidelityManifestForSource(
    manifest,
    { rawText, sourceFingerprint },
  ), true);
  assert.equal(isPersonalWorkspacePocAuthoringFidelityManifestForSource(
    manifest,
    { rawText: `${rawText}메모`, sourceFingerprint },
  ), false);
  assert.equal(isPersonalWorkspacePocAuthoringFidelityManifestForSource(
    { ...manifest, sourcePreserved: false },
    { rawText, sourceFingerprint },
  ), false);
  assert.equal(isPersonalWorkspacePocAuthoringFidelityManifestForSource(
    {
      ...manifest,
      sourceLines: manifest.sourceLines.map((line, index) => index === 0
        ? { ...line, reason: 'altered-decision' }
        : line),
    },
    { rawText, sourceFingerprint },
  ), false);
});
