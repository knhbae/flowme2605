import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTextAuthoringDocument } from './parser';

const FIXED_DOCUMENT_ID = 'blank-scaffold-parser-contract';

test('exact blank scaffold syntax stays source-backed without canonical output or issues', () => {
  const rawText = [
    '# ',
    '## ',
    '- [ ] ',
    '  - [ ] ',
    '- 기준일: ',
    '- 날짜: ',
    '  - 상대 날짜: ',
    '  - 시간: ',
    '  - 시간대: ',
    '  - 장소: ',
    '  - 소요 시간: ',
    '  - 반복: ',
    '  - 반복 종료: ',
    '  - 조건: ',
    '  - 설명: ',
    '  - 완료 기준: ',
    '  - 자료: ',
    '  - 안내: ',
    '  - 주의: ',
    '  - 출처: ',
  ].join('\r\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: FIXED_DOCUMENT_ID,
  });
  const canonical = result.canonical;
  const expectedRows = rawText.split('\r\n');

  assert.equal(canonical.steps.length, 0);
  assert.equal(canonical.items.length, 0);
  assert.equal(canonical.fields.length, 0);
  assert.equal(canonical.memos.length, 0);
  assert.equal(canonical.sourceRefs.length, 0);
  assert.equal(result.mappings.length, 0);
  assert.equal(result.issues.length, 0);

  assert.deepEqual(
    canonical.sourceRows.map((row) => row.rawText),
    expectedRows,
  );
  assert.deepEqual(
    canonical.sourceRows.map((row) => (
      rawText.slice(row.sourceRange.startOffset, row.sourceRange.endOffset)
    )),
    expectedRows,
  );
  assert.ok(result.blocks.every((block) => block.included === false));
});

test('blank scaffold rows do not suppress valid nonempty sibling structure', () => {
  const rawText = [
    '# ',
    '# 실제 Flow',
    '- 기준일: ',
    '- 기준일: 2026-09-01',
    '## ',
    '## 실행',
    '- [ ] ',
    '- [ ] 유효한 할 일',
    '  - 날짜: ',
    '  - 날짜: 2026-09-02',
    '  - [ ] ',
    '  - [ ] 유효한 하위 확인',
  ].join('\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: `${FIXED_DOCUMENT_ID}-siblings`,
  });
  const canonical = result.canonical;

  assert.equal(canonical.flow.title, '실제 Flow');
  assert.deepEqual(canonical.steps.map((step) => step.title), ['실행']);
  assert.deepEqual(canonical.items.map((item) => item.title), ['유효한 할 일']);
  assert.deepEqual(canonical.items[0]?.subchecks?.map((row) => row.title), [
    '유효한 하위 확인',
  ]);
  assert.deepEqual(
    canonical.fields.map((field) => [field.key, field.value]),
    [
      ['anchor', '2026-09-01'],
      ['date', '2026-09-02'],
    ],
  );
  assert.equal(result.issues.length, 0);
});

test('a blank root Item ends Item ownership without inventing a replacement', () => {
  const rawText = [
    '# 소유권 확인',
    '## 첫 단계',
    '- [ ] 첫 할 일',
    '- [ ] ',
    '  - 날짜: 2026-09-03',
  ].join('\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: `${FIXED_DOCUMENT_ID}-root-item-boundary`,
  });
  const canonical = result.canonical;

  assert.deepEqual(canonical.items.map((item) => item.title), ['첫 할 일']);
  assert.equal(canonical.items[0]?.schedule, undefined);
  assert.equal(canonical.items[0]?.properties.length, 0);
  assert.equal(canonical.fields.length, 0);
  assert.equal(
    result.blocks.find((block) => block.rawText === '- [ ] ')?.parentBlockId,
    result.blocks.find((block) => block.rawText === '## 첫 단계')?.blockId,
  );
  assert.deepEqual(result.issues.map((issue) => issue.messageKey), [
    'authoring.property_requires_item',
  ]);
});

for (const blankHeading of ['## ', '# '] as const) {
  test(`${blankHeading.trim()} placeholder ends Step and Item ownership`, () => {
    const rawText = [
      '# 소유권 확인',
      '## 첫 단계',
      '- [ ] 첫 할 일',
      blankHeading,
      '  - 날짜: 2026-09-04',
      '- [ ] 다음 할 일',
    ].join('\n');

    const result = parseTextAuthoringDocument(rawText, {
      documentId: `${FIXED_DOCUMENT_ID}-${blankHeading.length}-heading-boundary`,
    });
    const canonical = result.canonical;
    const [firstItem, nextItem] = canonical.items;

    assert.deepEqual(canonical.items.map((item) => item.title), [
      '첫 할 일',
      '다음 할 일',
    ]);
    assert.equal(firstItem?.schedule, undefined);
    assert.equal(firstItem?.properties.length, 0);
    assert.equal(canonical.fields.length, 0);
    assert.notEqual(firstItem?.stepId, nextItem?.stepId);
    assert.equal(
      canonical.steps.find((step) => step.stepId === nextItem?.stepId)?.generated,
      true,
    );
    assert.equal(
      result.blocks.find((block) => block.rawText === blankHeading)?.parentBlockId,
      undefined,
    );
    assert.deepEqual(result.issues.map((issue) => issue.messageKey), [
      'authoring.property_requires_item',
    ]);
  });
}

test('blank indented subcheck and property keep their valid Item owner', () => {
  const rawText = [
    '# 소유권 확인',
    '## 첫 단계',
    '- [ ] 첫 할 일',
    '  - [ ] ',
    '  - 날짜: ',
    '  - 날짜: 2026-09-05',
    '  - [ ] 실제 하위 확인',
  ].join('\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: `${FIXED_DOCUMENT_ID}-nested-owner`,
  });
  const [item] = result.canonical.items;

  assert.equal(result.canonical.items.length, 1);
  assert.equal(item?.schedule?.date, '2026-09-05');
  assert.deepEqual(item?.subchecks?.map((row) => row.title), [
    '실제 하위 확인',
  ]);
  assert.equal(result.issues.length, 0);
});

test('a blank Flow anchor never inherits the current Item as its presentation owner', () => {
  const rawText = [
    '# 소유권 확인',
    '## 첫 단계',
    '- [ ] 첫 할 일',
    '- 기준일: ',
  ].join('\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: `${FIXED_DOCUMENT_ID}-flow-anchor-owner`,
  });
  const anchorBlock = result.blocks.find((block) => block.rawText === '- 기준일: ');

  assert.ok(anchorBlock);
  assert.equal(anchorBlock.interpretedRole, 'field');
  assert.equal(anchorBlock.parentBlockId, undefined);
  assert.equal(result.canonical.items.length, 1);
  assert.equal(result.canonical.fields.length, 0);
  assert.equal(result.issues.length, 0);
});

test('nonempty invalid property values continue to emit their existing issues', () => {
  const rawText = [
    '# 오류 확인',
    '## 실행',
    '- [ ] 입력 확인',
    '  - 날짜: 2026-02-31',
    '  - 상대 날짜: 다음 주',
    '  - 자료: example.com/reference',
  ].join('\n');

  const result = parseTextAuthoringDocument(rawText, {
    documentId: `${FIXED_DOCUMENT_ID}-invalid`,
  });

  assert.deepEqual(
    result.issues.map((issue) => issue.type),
    ['invalid_date', 'invalid_date', 'invalid_url'],
  );
  assert.equal(result.issues.at(-1)?.blocking, true);
  assert.equal(result.canonical.items[0]?.schedule, undefined);
  assert.equal(result.canonical.items[0]?.resources.length, 0);
});
