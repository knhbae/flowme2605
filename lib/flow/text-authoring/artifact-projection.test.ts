import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthoringArtifactProjection } from './artifact-projection';
import { applyAuthoringOperation } from './operations';
import { createTextAuthoringDocument } from './parser';

const NOW = '2026-08-04T00:00:00.000Z';

function authoringDocument(rawText: string) {
  return createTextAuthoringDocument(rawText, { now: NOW });
}

test('Calendar sorts resolved dates ascending with source order as the tie-break while other projections keep source order', () => {
  const document = authoringDocument([
    '# 날짜 정렬',
    '## 실행',
    '- [ ] 늦은 항목',
    '  날짜: 2026-08-10',
    '- [ ] 같은 날 첫 항목',
    '  날짜: 2026-08-03',
    '- [ ] 같은 날 둘째 항목',
    '  날짜: 2026-08-03',
  ].join('\n'));

  const sourceOrder = document.parseResult.canonical.items.map((item) => item.title);
  const projection = buildAuthoringArtifactProjection(document);

  assert.deepEqual(sourceOrder, [
    '늦은 항목',
    '같은 날 첫 항목',
    '같은 날 둘째 항목',
  ]);
  assert.deepEqual(
    projection.artifacts.calendar.rows.map((row) => row.title),
    ['같은 날 첫 항목', '같은 날 둘째 항목', '늦은 항목'],
  );
  assert.deepEqual(
    projection.artifacts.todo.rows.map((row) => row.title),
    sourceOrder,
  );
  assert.deepEqual(
    projection.artifacts.memo.rows.map((row) => row.title),
    sourceOrder,
  );
  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    sourceOrder,
  );
});

test('a hidden preview anchor cannot resolve relative dates without an explicit ISO anchor in the raw document', () => {
  const withoutRawAnchor = authoringDocument([
    '# 기준일 없음',
    '## 실행',
    '- [ ] 사전 확인',
    '  상대 날짜: D-3',
    '- [ ] 당일 확인',
    '  상대 날짜: D-Day',
  ].join('\n'));
  const hiddenAnchor = buildAuthoringArtifactProjection(withoutRawAnchor, {
    anchor: '2026-08-10',
  });

  assert.equal(hiddenAnchor.artifacts.calendar.eligible, false);
  assert.equal(hiddenAnchor.artifacts.calendar.count, 0);
  assert.equal(
    hiddenAnchor.artifacts.calendar.losses.filter(
      (loss) => loss.reason === 'relative_anchor_required',
    ).length,
    2,
  );

  const withRawAnchor = authoringDocument([
    '# 기준일 있음',
    '기준일: 2026-08-10',
    '## 실행',
    '- [ ] 사전 확인',
    '  상대 날짜: D-3',
    '- [ ] 당일 확인',
    '  상대 날짜: D-Day',
  ].join('\n'));
  const resolved = buildAuthoringArtifactProjection(withRawAnchor);

  assert.deepEqual(
    resolved.artifacts.calendar.rows.map((row) => row.date),
    ['2026-08-07', '2026-08-10'],
  );
});

test('Sheet is disabled for a title-only list and enabled for two shared meaningful fields', () => {
  const titleOnly = authoringDocument([
    '# 제목 목록',
    '## 실행',
    '- [ ] 첫 항목',
    '- [ ] 둘째 항목',
    '- [ ] 셋째 항목',
  ].join('\n'));
  const titleOnlyProjection = buildAuthoringArtifactProjection(titleOnly, {
    primaryArtifact: 'sheet',
  });

  assert.equal(titleOnlyProjection.artifacts.sheet.eligible, false);
  assert.equal(titleOnlyProjection.artifacts.sheet.count, 0);
  assert.equal(titleOnlyProjection.primaryArtifact, 'todo');
  assert.equal(titleOnly.parseResult.artifactEligibility.counts.sheet, 0);
  assert.equal(
    titleOnly.parseResult.artifactEligibility.secondary.includes('sheet'),
    false,
  );
  assert.ok(
    titleOnlyProjection.artifacts.sheet.losses.some(
      (loss) => loss.reason === 'insufficient_tabular_structure',
    ),
  );

  const structured = authoringDocument([
    '# 반복 필드 목록',
    '## 실행',
    '- [ ] 첫 항목',
    '  설명: 첫 설명',
    '  장소: 서울',
    '- [ ] 둘째 항목',
    '  설명: 둘째 설명',
    '  장소: 부산',
  ].join('\n'));
  const structuredProjection = buildAuthoringArtifactProjection(structured, {
    primaryArtifact: 'sheet',
  });

  assert.equal(structuredProjection.artifacts.sheet.eligible, true);
  assert.equal(structuredProjection.artifacts.sheet.count, 2);
  assert.equal(structured.parseResult.artifactEligibility.counts.sheet, 2);
  assert.equal(
    structured.parseResult.artifactEligibility.secondary.includes('sheet'),
    true,
  );
  assert.deepEqual(
    structuredProjection.artifacts.sheet.sheetColumns?.map((column) => column.label),
    ['항목', '설명', '장소'],
  );
  assert.deepEqual(structuredProjection.artifacts.sheet.rows[0].sheetCells, {
    title: '첫 항목',
    description: '첫 설명',
    place: '서울',
  });
});

test('an original table keeps its real columns and cells even when it has only one data row', () => {
  const table = authoringDocument([
    '활동\t담당\t자료',
    '예약 확인\t민지\thttps://example.com/booking',
  ].join('\n'));
  const projection = buildAuthoringArtifactProjection(table, {
    primaryArtifact: 'sheet',
  });

  assert.equal(projection.artifacts.sheet.eligible, true);
  assert.equal(projection.artifacts.sheet.count, 1);
  assert.deepEqual(
    projection.artifacts.sheet.sheetColumns?.map((column) => column.label),
    ['활동', '담당', '자료'],
  );
  assert.deepEqual(projection.artifacts.sheet.rows[0].sheetCells, {
    '활동': '예약 확인',
    '담당': '민지',
    '자료': 'https://example.com/booking',
  });
});

test('projection rows expose execution detail, schedule context, and links without changing source order', () => {
  const document = authoringDocument([
    '# 상세 필드',
    '## 실행',
    '- [ ] 장소 예약',
    '  설명: 좌석을 확인합니다.',
    '  완료 기준: 예약번호를 저장함',
    '  날짜: 2026-08-10',
    '  시간: 09:30',
    '  시간대: Asia/Seoul',
    '  장소: 서울역',
    '  소요 시간: 45분',
    '  반복: 매주 월요일',
    '  조건: 비가 오면 실내',
    '  자료: [예약 페이지](https://example.com/booking)',
    '  출처: [공식 안내](https://example.com/official)',
  ].join('\n'));

  const row = buildAuthoringArtifactProjection(document).artifacts.todo.rows[0];

  assert.equal(row.description, '좌석을 확인합니다.');
  assert.equal(row.detail, row.description);
  assert.equal(row.completion, '예약번호를 저장함');
  assert.equal(row.date, '2026-08-10');
  assert.equal(row.time, '09:30');
  assert.equal(row.timezone, 'Asia/Seoul');
  assert.equal(row.place, '서울역');
  assert.equal(row.durationMinutes, 45);
  assert.equal(row.repeat, '매주 월요일');
  assert.equal(row.condition, '비가 오면 실내');
  assert.deepEqual(
    row.resources.map(({ label, url }) => ({ label, url })),
    [{ label: '예약 페이지', url: 'https://example.com/booking' }],
  );
  assert.deepEqual(
    row.sources?.map(({ label, url }) => ({ label, url })),
    [{ label: '공식 안내', url: 'https://example.com/official' }],
  );
  assert.equal(row.links.length, 2);
});

test('projection uses the latest owned place and condition instead of stale source values', () => {
  let document = authoringDocument([
    '# 변경한 상세',
    '## 실행',
    '- [ ] 장소 확인',
    '  - 장소: 서울',
    '  - 조건: 비가 오면 실내',
    '  - 자료: [이전 자료](https://example.com/old-resource)',
    '  - 출처: [이전 출처](https://example.com/old-source)',
  ].join('\n'));
  const itemId = document.parseResult.canonical.items[0].itemId;
  document = applyAuthoringOperation(
    document,
    { type: 'set_property', itemId, key: 'place', value: '부산' },
    { actorLane: 'creator', now: '2026-08-04T01:00:00.000Z' },
  );
  document = applyAuthoringOperation(
    document,
    { type: 'set_property', itemId, key: 'condition', value: '맑으면 야외' },
    { actorLane: 'creator', now: '2026-08-04T01:01:00.000Z' },
  );
  document = applyAuthoringOperation(
    document,
    {
      type: 'set_property',
      itemId,
      key: 'resource',
      value: '새 자료 https://example.com/new-resource',
    },
    { actorLane: 'creator', now: '2026-08-04T01:02:00.000Z' },
  );
  document = applyAuthoringOperation(
    document,
    {
      type: 'set_property',
      itemId,
      key: 'source',
      value: '새 출처 https://example.com/new-source',
    },
    { actorLane: 'creator', now: '2026-08-04T01:03:00.000Z' },
  );

  const row = buildAuthoringArtifactProjection(document).artifacts.todo.rows[0];
  assert.equal(row.place, '부산');
  assert.equal(row.condition, '맑으면 야외');
  assert.deepEqual(row.resources.map((link) => link.url), [
    'https://example.com/new-resource',
  ]);
  assert.deepEqual(row.sources?.map((link) => link.url), [
    'https://example.com/new-source',
  ]);
});
