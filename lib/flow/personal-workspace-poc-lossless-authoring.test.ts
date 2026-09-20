import assert from 'node:assert/strict';
import test from 'node:test';

import { PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS } from './personal-workspace-poc-lossless-authoring.fixtures';
import {
  PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_LIMITS,
  PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION,
  analyzePersonalWorkspacePocLosslessAuthoring,
  locatePersonalWorkspacePocLosslessSource,
  roundTripPersonalWorkspacePocLosslessAuthoring,
  type PersonalWorkspacePocLosslessAuthoringAnalysis,
  type PersonalWorkspacePocLosslessIssue,
} from './personal-workspace-poc-lossless-authoring';

function assertSourceIsByteExact(
  analysis: PersonalWorkspacePocLosslessAuthoringAnalysis,
  expectedRawText: string,
): void {
  assert.equal(analysis.rawText, expectedRawText);
  assert.equal(roundTripPersonalWorkspacePocLosslessAuthoring(analysis), expectedRawText);
  assert.equal(analysis.blocks.map((block) => block.rawText).join(''), expectedRawText);
  assert.equal(analysis.sourceMutationCount, 0);
  assert.equal(analysis.sourcePreserved, true);
  assert.equal(analysis.fallback.rawText, expectedRawText);

  for (const block of analysis.blocks) {
    assert.deepEqual(
      locatePersonalWorkspacePocLosslessSource(expectedRawText, block.locator),
      { valid: true, rawText: block.rawText },
    );
  }
  for (const table of analysis.tables) {
    assert.deepEqual(
      locatePersonalWorkspacePocLosslessSource(expectedRawText, table.locator),
      { valid: true, rawText: table.rawText },
    );
    for (const row of table.sourceRows) {
      assert.deepEqual(
        locatePersonalWorkspacePocLosslessSource(expectedRawText, row.locator),
        { valid: true, rawText: row.rawText },
      );
      for (const cell of row.cells) {
        assert.deepEqual(
          locatePersonalWorkspacePocLosslessSource(expectedRawText, cell.locator),
          { valid: true, rawText: cell.rawText },
        );
      }
    }
  }
}

function assertNoInventedActions(analysis: PersonalWorkspacePocLosslessAuthoringAnalysis): void {
  assert.equal(analysis.projection.generatedItemCount, 0);
  assert.equal(analysis.projection.generatedTodoCount, 0);
  assert.equal(analysis.projection.generatedCalendarCount, 0);
}

test('publishes a versioned bounded contract and the exact 31-case canonical catalog', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION, 1);
  assert.deepEqual(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_LIMITS, {
    utf8Bytes: 1024 * 1024,
    physicalLines: 20_000,
    logicalCells: 50_000,
  });
  assert.equal(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS.length, 31);
  assert.equal(
    new Set(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS.map((entry) => entry.caseId)).size,
    31,
  );
});

for (const corpusCase of PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS) {
  test(`preserves canonical corpus case: ${corpusCase.caseId}`, () => {
    assert.ok(corpusCase.caseId.length > 0, 'each corpus case names its source scenario');
    assert.ok(corpusCase.sourceShape.length > 0, `${corpusCase.caseId}: source shape is explicit`);
    assert.ok(corpusCase.provenance.length > 0, `${corpusCase.caseId}: provenance is explicit`);
    assert.ok(corpusCase.upstreamBoundary.length > 0, `${corpusCase.caseId}: synthesis boundary is explicit`);
    assert.equal(corpusCase.expectedPreservation, 'byte-exact');
    assert.equal(corpusCase.expectedFallback, false);

    const analysis = analyzePersonalWorkspacePocLosslessAuthoring(corpusCase.rawText);
    assert.equal(analysis.status, corpusCase.expectedMode, `${corpusCase.caseId}: mode`);
    assert.equal(analysis.fallback.active, corpusCase.expectedFallback, `${corpusCase.caseId}: fallback`);
    assertSourceIsByteExact(analysis, corpusCase.rawText);
    assertNoInventedActions(analysis);

    if (corpusCase.expectedMode === 'safe-table') {
      assert.equal(analysis.projection.kind, 'sheet-source-rows');
      assert.equal(
        analysis.projection.rows.length,
        corpusCase.expectedOriginalItemCount,
        `${corpusCase.caseId}: one deterministic projection per source row`,
      );
    } else {
      assert.equal(analysis.projection.kind, 'none');
      assert.equal(analysis.tables.length, 0, `${corpusCase.caseId}: prose is not guessed as a table`);
    }
  });
}

test('segments rich LF source without interpreting protected table-like text', () => {
  const rawText = [
    '원문 메모',
    '',
    '> 이름,상태',
    '> 인용,유지',
    '',
    '```csv',
    '이름,상태',
    '코드,유지',
    '```',
    '',
    '<section>',
    '이름,상태',
    'HTML,유지',
    '</section>',
    '',
    '<!--',
    '이름,상태',
    '주석,유지',
    '-->',
    '',
    '순서\t설명',
    '1\t실제 표',
  ].join('\n');

  const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.equal(analysis.status, 'safe-table');
  assert.equal(analysis.lineEndings, 'lf');
  assert.deepEqual(
    analysis.blocks.map((block) => block.kind),
    ['prose', 'blank', 'blockquote', 'blank', 'code-fence', 'blank', 'html', 'blank', 'comment', 'blank', 'table'],
  );
  assert.equal(analysis.tables.length, 1);
  assert.equal(analysis.tables[0].format, 'tsv');
  assert.deepEqual(analysis.tables[0].rows, [['1', '실제 표']]);
  assert.equal(analysis.projection.rows.length, 1);
  assertSourceIsByteExact(analysis, rawText);
  assertNoInventedActions(analysis);
});

test('preserves CRLF CSV quotes, delimiters, empty cells, URLs, and embedded newlines', () => {
  const rawText = [
    '순서,작품,메모,자료',
    '1,"어린 왕자, 낭독본","첫 줄\r\n둘째 줄","https://example.com/read?a=1,2&b=3"',
    '2,"말한 ""문장""",끝,',
  ].join('\r\n');

  const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.equal(analysis.status, 'safe-table');
  assert.equal(analysis.lineEndings, 'crlf');
  assert.equal(analysis.tables[0].format, 'csv');
  assert.deepEqual(analysis.tables[0].headers, ['순서', '작품', '메모', '자료']);
  assert.deepEqual(analysis.tables[0].rows, [
    ['1', '어린 왕자, 낭독본', '첫 줄\r\n둘째 줄', 'https://example.com/read?a=1,2&b=3'],
    ['2', '말한 "문장"', '끝', ''],
  ]);
  assert.equal(analysis.projection.rows.length, 2);
  assert.equal(analysis.tables[0].sourceRows[1].rawText.includes('\r\n'), true);
  assertSourceIsByteExact(analysis, rawText);
  assertNoInventedActions(analysis);
});

test('preserves quoted TSV tabs and newlines as source cells', () => {
  const rawText = [
    '순서\t제목\t메모',
    '1\t"탭\t포함"\t"첫 줄\n둘째 줄"',
    '2\t끝\t',
  ].join('\n');

  const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.equal(analysis.status, 'safe-table');
  assert.equal(analysis.tables[0].format, 'tsv');
  assert.deepEqual(analysis.tables[0].rows, [
    ['1', '탭\t포함', '첫 줄\n둘째 줄'],
    ['2', '끝', ''],
  ]);
  assert.equal(analysis.tables[0].sourceRows[1].cells[1].rawText, '"탭\t포함"');
  assertSourceIsByteExact(analysis, rawText);
  assertNoInventedActions(analysis);
});

test('projects escaped Markdown pipes and empty cells without changing their source bytes', () => {
  const rawText = [
    '| 순서 | 설명 | 자료 |',
    '| :--- | --- | ---: |',
    '| 1 | 왼쪽 \\| 오른쪽 | https://example.com?a=1&b=2 |',
    '| 2 | 빈 자료 |  |',
  ].join('\n');

  const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.equal(analysis.status, 'safe-table');
  assert.equal(analysis.tables[0].format, 'markdown');
  assert.deepEqual(analysis.tables[0].rows, [
    ['1', '왼쪽 | 오른쪽', 'https://example.com?a=1&b=2'],
    ['2', '빈 자료', ''],
  ]);
  assert.equal(analysis.projection.rows[0].cells[1].rawText, ' 왼쪽 \\| 오른쪽 ');
  assertSourceIsByteExact(analysis, rawText);
  assertNoInventedActions(analysis);
});

test('returns the entire source as raw fallback for ambiguous or risky tables', () => {
  const cases: readonly Readonly<{
    name: string;
    rawText: string;
    issue: PersonalWorkspacePocLosslessIssue;
  }>[] = [
    { name: 'unclosed quote', rawText: '열1,열2\n1,"닫히지 않음', issue: 'unclosed-quote' },
    { name: 'inconsistent width', rawText: '열1,열2\n1,2,3', issue: 'inconsistent-column-count' },
    { name: 'empty header', rawText: '열1,\n1,2', issue: 'empty-header' },
    { name: 'duplicate header', rawText: '열1,열1\n1,2', issue: 'duplicate-header' },
    { name: 'ambiguous delimiter', rawText: '열1,열2\t열3\n1,2\t3', issue: 'ambiguous-delimiter' },
    { name: 'formula', rawText: '열1,열2\n1,=SUM(A1)', issue: 'formula-like-cell' },
    { name: 'characters after quote', rawText: '열1,열2\n1,"값"뒤', issue: 'characters-after-closing-quote' },
    { name: 'markdown width', rawText: '| 열1 | 열2 | 열3 |\n| --- | --- |\n| 1 | 2 | 3 |', issue: 'invalid-markdown-separator' },
    { name: 'markdown body missing', rawText: '| 열1 | 열2 |\n| --- | --- |', issue: 'missing-body' },
    { name: 'multiple tables', rawText: '열1,열2\n1,2\n\n열3,열4\n3,4', issue: 'multiple-tables' },
  ];

  for (const current of cases) {
    const analysis = analyzePersonalWorkspacePocLosslessAuthoring(current.rawText);
    assert.equal(analysis.status, 'raw-fallback', current.name);
    assert.equal(analysis.fallback.active, true, current.name);
    assert.equal(analysis.issues.includes(current.issue), true, `${current.name}: ${current.issue}`);
    assert.equal(analysis.projection.kind, 'none', current.name);
    assert.deepEqual(analysis.fallback.availableAs, ['raw-text', 'txt-copy']);
    assertSourceIsByteExact(analysis, current.rawText);
    assertNoInventedActions(analysis);
  }
});

test('round-trips LF, CRLF, CR, mixed endings, and a final blank line byte-for-byte', () => {
  const cases = [
    { rawText: '첫 줄\n둘째 줄\n', lineEndings: 'lf' },
    { rawText: '첫 줄\r\n둘째 줄\r\n', lineEndings: 'crlf' },
    { rawText: '첫 줄\r둘째 줄\r', lineEndings: 'cr' },
    { rawText: '첫 줄\r\n둘째 줄\n셋째 줄\r', lineEndings: 'mixed' },
    { rawText: '', lineEndings: 'none' },
  ] as const;

  for (const current of cases) {
    const first = analyzePersonalWorkspacePocLosslessAuthoring(current.rawText);
    const second = analyzePersonalWorkspacePocLosslessAuthoring(current.rawText);
    assert.equal(first.lineEndings, current.lineEndings);
    assert.deepEqual(first, second, `${current.lineEndings}: deterministic analysis`);
    assertSourceIsByteExact(first, current.rawText);
  }
});

test('fails closed at byte, physical-line, and logical-cell budgets without truncation', () => {
  const rawText = '열1,열2\n값1,값2';
  const cases = [
    { limits: { utf8Bytes: 1 }, issue: 'byte-limit', exceeded: 'bytes' },
    { limits: { physicalLines: 1 }, issue: 'line-limit', exceeded: 'lines' },
    { limits: { logicalCells: 3 }, issue: 'cell-limit', exceeded: 'cells' },
  ] as const;

  for (const current of cases) {
    const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText, { limits: current.limits });
    assert.equal(analysis.status, 'raw-fallback');
    assert.equal(analysis.issues.includes(current.issue), true);
    assert.equal(analysis.budget.exceeded.includes(current.exceeded), true);
    assert.equal(analysis.projection.kind, 'none');
    assertSourceIsByteExact(analysis, rawText);
    assertNoInventedActions(analysis);
  }
});

test('locators reject stale source instead of silently rebinding rows or cells', () => {
  const rawText = '순서,제목\n1,원문';
  const analysis = analyzePersonalWorkspacePocLosslessAuthoring(rawText);
  const cell = analysis.tables[0].sourceRows[1].cells[1];

  assert.deepEqual(
    locatePersonalWorkspacePocLosslessSource(rawText, cell.locator),
    { valid: true, rawText: '원문' },
  );
  assert.deepEqual(
    locatePersonalWorkspacePocLosslessSource(rawText.replace('원문', '변경'), cell.locator),
    { valid: false, rawText: '변경' },
  );
});
