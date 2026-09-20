import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG,
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG_VERSION,
  getPersonalWorkspacePocAuthoringProperty,
  listEditablePersonalWorkspacePocAuthoringProperties,
  listPersonalWorkspacePocAuthoringNearMissTargets,
  locatePersonalWorkspacePocAuthoringPropertyValue,
  planPersonalWorkspacePocAuthoringNearMissRepair,
  planPersonalWorkspacePocAuthoringPropertyBatchEdit,
  planPersonalWorkspacePocAuthoringPropertyEdit,
  undoPersonalWorkspacePocAuthoringSourceTransaction,
} from './personal-workspace-poc-authoring-properties';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  parsePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';

function fingerprint(rawText: string): string {
  return fingerprintPersonalWorkspacePocAuthoringSource(rawText);
}

test('exposes a frozen versioned catalog with explicit write and handoff support', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG_VERSION, 2);
  assert.equal(PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.length, 16);
  assert.equal(Object.isFrozen(PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG), true);
  assert.equal(
    new Set(PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.map((entry) => entry.key)).size,
    PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.length,
  );
  assert.deepEqual(
    listEditablePersonalWorkspacePocAuthoringProperties().map((entry) => entry.key),
    ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'detail', 'completion', 'condition', 'resource', 'repeat', 'repeatEnd', 'guide', 'caution', 'source', 'subcheck'],
  );
  assert.deepEqual(getPersonalWorkspacePocAuthoringProperty('date'), {
    key: 'date',
    label: '날짜',
    sourceLabel: '날짜',
    aliases: ['날짜'],
    group: 'schedule',
    editor: 'native-date',
    valueKind: 'date',
    sourceKind: 'property',
    writeSupport: 'editable',
    handoffSupport: 'projected',
  });
  assert.equal(getPersonalWorkspacePocAuthoringProperty('time')?.editor, 'native-time');
  assert.equal(getPersonalWorkspacePocAuthoringProperty('time')?.handoffSupport, 'preserved-blocking');
  assert.equal(getPersonalWorkspacePocAuthoringProperty('detail')?.writeSupport, 'editable');
  assert.equal(getPersonalWorkspacePocAuthoringProperty('missing'), null);
});

test('re-enters an existing property by selecting only its exact raw value', () => {
  const rawText = '# 여행\n- [ ] 기차 예약\n  - 장소: 서울역  \n  - 자료: [예매](https://example.com/train)\n';
  const place = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText,
    expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 2,
    key: 'place',
  });
  assert.equal(place.status, 'located');
  if (place.status !== 'located') return;
  assert.equal(rawText.slice(place.selection.start, place.selection.end), '서울역');
  assert.equal(place.rawValue, '서울역');
  assert.equal(place.propertySourceLine, 3);
  assert.equal(place.mutationCount, 0);

  const resource = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText,
    expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 2,
    key: 'resource',
  });
  assert.equal(resource.status, 'located');
  if (resource.status === 'located') {
    assert.equal(
      rawText.slice(resource.selection.start, resource.selection.end),
      '[예매](https://example.com/train)',
    );
  }
});

test('puts a collapsed caret after an empty property prefix and preserves source bytes', () => {
  const rawText = '- [ ] 숙소 확인\r\n  - 장소:   \r\n';
  const result = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText,
    expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 1,
    key: 'place',
  });
  assert.equal(result.status, 'located');
  if (result.status !== 'located') return;
  assert.equal(result.selection.start, result.selection.end);
  assert.equal(result.selection.start, rawText.indexOf('\r\n', rawText.indexOf('장소:')));
  assert.equal(result.mutationCount, 0);
});

test('property re-entry stays inside the selected Item and fails closed on duplicates', () => {
  const rawText = [
    '- [ ] 첫째',
    '  - 장소: 서울',
    '- [ ] 둘째',
    '  - 장소: 부산',
    '  - 장소: 제주',
  ].join('\n');
  const first = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1, key: 'place',
  });
  assert.equal(first.status, 'located');
  if (first.status === 'located') {
    assert.equal(rawText.slice(first.selection.start, first.selection.end), '서울');
  }
  const second = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 3, key: 'place',
  });
  assert.equal(second.status, 'blocked');
  if (second.status === 'blocked') assert.equal(second.reason, 'duplicate-property');
});

test('re-enters all direct properties and a source-line-owned subcheck without writing', () => {
  const lines = [
    '- [ ] 준비',
    '  - [ ] 서류 챙기기',
    '  - 날짜: 2026-09-10',
    '  - 상대 날짜: ',
    '  - 시간: 09:00',
    '  - 시간대: Asia/Seoul',
    '  - 장소: 서울',
    '  - 소요 시간: 30분',
    '  - 설명: 접수 순서를 확인한다',
    '  - 완료 기준: 접수 번호를 받았다',
    '  - 실행 조건: 평일',
    '  - 자료: [신청서](https://example.com/form)',
    '  - 반복: 매주 월',
    '  - 반복 종료: 10회',
    '  - 안내: 번호표를 뽑는다',
    '  - 주의: 마감 시간을 확인한다',
    '  - 출처: https://example.com/source',
  ];
  const rawText = lines.join('\n');
  const lineByKey = new Map<string, number>([
    ['subcheck', 2], ['date', 3], ['relativeDate', 4], ['time', 5], ['timezone', 6],
    ['place', 7], ['duration', 8], ['detail', 9], ['completion', 10], ['condition', 11],
    ['resource', 12], ['repeat', 13], ['repeatEnd', 14], ['guide', 15], ['caution', 16], ['source', 17],
  ]);
  for (const entry of PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG) {
    const propertySourceLine = lineByKey.get(entry.key);
    const located = locatePersonalWorkspacePocAuthoringPropertyValue({
      rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key: entry.key,
      ...(entry.key === 'subcheck' ? { propertySourceLine } : {}),
    });
    assert.equal(located.status, 'located', entry.key);
    if (located.status !== 'located') continue;
    assert.equal(located.propertySourceLine, propertySourceLine);
    assert.equal(located.mutationCount, 0);
    assert.equal(rawText.slice(located.selection.start, located.selection.end), located.rawValue);
  }
});

test('re-entry blocks stale, unknown, missing, non-root, and protected targets with zero mutations', () => {
  const rawText = '- [ ] 확인\n  - 장소: 서울';
  const cases = [
    locatePersonalWorkspacePocAuthoringPropertyValue({ rawText, expectedSourceFingerprint: fingerprint(`${rawText}!`), itemSourceLine: 1, key: 'place' }),
    locatePersonalWorkspacePocAuthoringPropertyValue({ rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1, key: 'unknown' }),
    locatePersonalWorkspacePocAuthoringPropertyValue({ rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1, key: 'date' }),
    locatePersonalWorkspacePocAuthoringPropertyValue({ rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 2, key: 'place' }),
    locatePersonalWorkspacePocAuthoringPropertyValue({
      rawText: '```\n- [ ] 예시\n  - 장소: 서울\n```',
      expectedSourceFingerprint: fingerprint('```\n- [ ] 예시\n  - 장소: 서울\n```'),
      itemSourceLine: 2,
      key: 'place',
    }),
  ];
  assert.deepEqual(cases.map((result) => result.status), ['blocked', 'blocked', 'blocked', 'blocked', 'blocked']);
  assert.deepEqual(cases.map((result) => result.mutationCount), [0, 0, 0, 0, 0]);
  assert.deepEqual(
    cases.map((result) => result.status === 'blocked' ? result.reason : ''),
    ['stale-source', 'unknown-property', 'property-not-found', 'not-root-item', 'not-root-item'],
  );
});

test('explicit property apply updates only the value and one undo restores exact CRLF bytes', () => {
  const rawText = '# 여행\r\n- [ ] 기차 예약\r\n  - 장소: 서울역  \r\n메모';
  const result = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 2, key: 'place', value: '부산역', beforeSelection: { start: 2, end: 2 },
  });
  assert.equal(result.status, 'applied');
  if (result.status !== 'applied') return;
  assert.equal(result.nextRawText, '# 여행\r\n- [ ] 기차 예약\r\n  - 장소: 부산역  \r\n메모');
  assert.equal(result.mutationCount, 1);
  assert.equal(result.transaction.changes.length, 1);
  assert.equal(result.nextRawText.slice(result.selection.start, result.selection.end), '부산역');

  const undone = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo', rawText: result.nextRawText, transaction: result.transaction,
  });
  assert.deepEqual(undone, {
    status: 'undone', nextRawText: rawText, selection: { start: 2, end: 2 }, mutationCount: 1,
  });
});

test('explicit property apply inserts with local line endings without changing another Item', () => {
  const rawText = '- [ ] 첫째\r\n메모\r\n- [ ] 둘째\r\n  - 장소: 부산';
  const result = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 1, key: 'completion', value: '예약 번호를 확인했다',
  });
  assert.equal(result.status, 'applied');
  if (result.status !== 'applied') return;
  assert.equal(
    result.nextRawText,
    '- [ ] 첫째\r\n메모\r\n  - 완료 기준: 예약 번호를 확인했다\r\n- [ ] 둘째\r\n  - 장소: 부산',
  );
  assert.equal(result.nextRawText.slice(result.selection.start, result.selection.end), '예약 번호를 확인했다');
});

test('property apply normalizes an explicit relative date and validates dates and links', () => {
  const rawText = '- [ ] 신청';
  const relative = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 1, key: 'relativeDate', value: 'D - 03',
  });
  assert.equal(relative.status, 'applied');
  if (relative.status === 'applied') assert.equal(relative.nextRawText, '- [ ] 신청\n  - 상대 날짜: D-3');

  for (const [key, value] of [['date', '2026-02-30'], ['resource', 'javascript:alert(1)']] as const) {
    const invalid = planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
      itemSourceLine: 1, key, value,
    });
    assert.equal(invalid.status, 'blocked');
    if (invalid.status === 'blocked') assert.equal(invalid.reason, 'invalid-value');
    assert.equal(invalid.mutationCount, 0);
  }
});

test('property apply blocks conflicting schedules, missing dependencies, invalid properties, stale sources, cancel, and no-op', () => {
  const rawText = '- [ ] 신청\n  - 날짜: 2026-09-10\n  - 장소: 서울';
  const results = [
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key: 'relativeDate', value: 'D-3',
    }),
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key: 'timezone', value: 'Asia/Seoul',
    }),
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key: 'duration', value: '0분',
    }),
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(`${rawText}!`), itemSourceLine: 1,
      key: 'place', value: '부산',
    }),
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'cancel', rawText, expectedSourceFingerprint: 'ignored-on-cancel', itemSourceLine: 1,
      key: 'place', value: '부산',
    }),
    planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key: 'place', value: '서울',
    }),
  ];
  assert.deepEqual(results.map((result) => result.status), ['blocked', 'blocked', 'blocked', 'blocked', 'cancelled', 'no-op']);
  assert.deepEqual(results.map((result) => result.mutationCount), [0, 0, 0, 0, 0, 0]);
});

test('native time and dependent schedule properties are PoC-local editable with validation', () => {
  const rawText = '- [ ] 아침 운동\n  - 시간: 09:00\n  - 반복: 매주 월, 수, 금';
  const timezone = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
    key: 'timezone', value: 'Asia/Seoul',
  });
  assert.equal(timezone.status, 'applied');
  if (timezone.status !== 'applied') return;
  const repeatEnd = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText: timezone.nextRawText,
    expectedSourceFingerprint: fingerprint(timezone.nextRawText), itemSourceLine: 1,
    key: 'repeatEnd', value: '2026-10-02',
  });
  assert.equal(repeatEnd.status, 'applied');
  if (repeatEnd.status === 'applied') {
    assert.match(repeatEnd.nextRawText, /시간대: Asia\/Seoul/u);
    assert.match(repeatEnd.nextRawText, /반복 종료: 2026-10-02/u);
  }

  for (const [key, value] of [['time', '24:00'], ['timezone', 'Mars/Olympus']] as const) {
    const invalid = planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
      key, value,
    });
    assert.equal(invalid.status, 'blocked');
    assert.equal(invalid.mutationCount, 0);
  }
});

test('edits every lossless direct property, accepts markdown links, and appends distinct guide or caution lines', () => {
  let rawText = '- [ ] 신청';
  const updates = [
    ['duration', ' 30 분 '],
    ['detail', '신분증을 준비한다'],
    ['condition', '비가 오지 않을 때'],
    ['completion', '접수 번호를 확인했다'],
    ['resource', '[신청서](https://example.com/form)'],
    ['guide', '창구에서 번호표를 뽑는다'],
    ['caution', '마감 시간을 확인한다'],
    ['source', '[공식 안내](https://example.com/source)'],
  ] as const;
  for (const [key, value] of updates) {
    const result = planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
      itemSourceLine: 1, key, value,
    });
    assert.equal(result.status, 'applied', key);
    if (result.status === 'applied') rawText = result.nextRawText;
  }
  assert.match(rawText, /소요 시간: 30분/u);
  assert.match(rawText, /자료: \[신청서\]\(https:\/\/example\.com\/form\)/u);
  assert.match(rawText, /출처: \[공식 안내\]\(https:\/\/example\.com\/source\)/u);

  const appended = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 1, key: 'guide', value: '담당자에게 확인한다',
  });
  assert.equal(appended.status, 'applied');
  if (appended.status !== 'applied') return;
  assert.equal((appended.nextRawText.match(/  - 안내:/gu) ?? []).length, 2);
  const duplicate = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText: appended.nextRawText,
    expectedSourceFingerprint: fingerprint(appended.nextRawText),
    itemSourceLine: 1, key: 'guide', value: '담당자에게 확인한다',
  });
  assert.equal(duplicate.status, 'no-op');
  assert.equal(duplicate.mutationCount, 0);
});

test('adds a one-level subcheck before properties and re-enters the exact chosen child action', () => {
  const rawText = '- [ ] 출발 준비\n  - 장소: 서울역';
  const added = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    itemSourceLine: 1, key: 'subcheck', value: '신분증 챙기기',
  });
  assert.equal(added.status, 'applied');
  if (added.status !== 'applied') return;
  assert.equal(added.nextRawText, '- [ ] 출발 준비\n  - [ ] 신분증 챙기기\n  - 장소: 서울역');
  const second = planPersonalWorkspacePocAuthoringPropertyEdit({
    intent: 'apply', rawText: added.nextRawText, expectedSourceFingerprint: fingerprint(added.nextRawText),
    itemSourceLine: 1, key: 'subcheck', value: '표 확인하기',
  });
  assert.equal(second.status, 'applied');
  if (second.status !== 'applied') return;
  const exact = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText: second.nextRawText, expectedSourceFingerprint: fingerprint(second.nextRawText),
    itemSourceLine: 1, propertySourceLine: 3, key: 'subcheck',
  });
  assert.equal(exact.status, 'located');
  if (exact.status === 'located') {
    assert.equal(second.nextRawText.slice(exact.selection.start, exact.selection.end), '표 확인하기');
    assert.equal(exact.mutationCount, 0);
  }
});

test('applies time plus timezone and recurrence plus end as one native change and one undo', () => {
  const rawText = '- [ ] 운동';
  const timePair = planPersonalWorkspacePocAuthoringPropertyBatchEdit({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), itemSourceLine: 1,
    updates: [{ key: 'timezone', value: 'Asia/Seoul' }, { key: 'time', value: '07:30' }],
  });
  assert.equal(timePair.status, 'applied');
  if (timePair.status !== 'applied') return;
  assert.equal(timePair.transaction.kind, 'property-batch-edit');
  assert.equal(timePair.transaction.changes.length, 1);
  assert.match(timePair.nextRawText, /시간: 07:30/u);
  assert.match(timePair.nextRawText, /시간대: Asia\/Seoul/u);

  const recurrencePair = planPersonalWorkspacePocAuthoringPropertyBatchEdit({
    intent: 'apply', rawText: timePair.nextRawText,
    expectedSourceFingerprint: fingerprint(timePair.nextRawText), itemSourceLine: 1,
    updates: [{ key: 'repeatEnd', value: '10 회' }, { key: 'repeat', value: '매주 월, 수, 금' }],
  });
  assert.equal(recurrencePair.status, 'applied');
  if (recurrencePair.status !== 'applied') return;
  assert.equal(recurrencePair.transaction.changes.length, 1);
  assert.match(recurrencePair.nextRawText, /반복 종료: 10회/u);
  const undone = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo', rawText: recurrencePair.nextRawText, transaction: recurrencePair.transaction,
  });
  assert.equal(undone.status, 'undone');
  if (undone.status === 'undone') assert.equal(undone.nextRawText, timePair.nextRawText);
});

test('lists only explicit root checkbox near misses outside protected source', () => {
  const rawText = [
    '- [] 첫째',
    '-[] 둘째',
    '- [  ] 셋째',
    '- [ ] 정상',
    '- [x] 완료',
    '- [서울] 모호',
    '  - [] 들여쓴 줄',
    '- []',
    '```md',
    '- [] 코드 예시',
    '```',
    '<!--',
    '- [] 주석 예시',
    '-->',
  ].join('\n');
  const targets = listPersonalWorkspacePocAuthoringNearMissTargets(rawText);
  assert.deepEqual(targets.map((target) => target.title), ['첫째', '둘째', '셋째']);
  assert.deepEqual(targets.map((target) => target.sourceLine), [1, 2, 3]);
  assert.equal(new Set(targets.map((target) => target.targetId)).size, 3);
});

test('near-miss repair changes only the chosen prefix after explicit apply and is one-step undoable', () => {
  const rawText = '# 준비\r\n- []  첫째  \r\n메모\r- [  ] 둘째';
  const targets = listPersonalWorkspacePocAuthoringNearMissTargets(rawText);
  assert.equal(targets.length, 2);
  const result = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText),
    targetId: targets[1].targetId, beforeSelection: { start: 0, end: 0 },
  });
  assert.equal(result.status, 'repaired');
  if (result.status !== 'repaired') return;
  assert.equal(result.nextRawText, '# 준비\r\n- []  첫째  \r\n메모\r- [ ] 둘째');
  assert.equal(result.nextRawText.slice(result.selection.start, result.selection.end), '둘째');
  assert.equal(result.transaction.kind, 'near-miss-repair');
  assert.equal(result.transaction.changes.length, 1);

  const parsed = parsePersonalWorkspacePocAuthoring(result.nextRawText);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, '둘째');
  const undone = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo', rawText: result.nextRawText, transaction: result.transaction,
  });
  assert.equal(undone.status, 'undone');
  if (undone.status === 'undone') assert.equal(undone.nextRawText, rawText);
});

test('near-miss cancel, stale source, and unknown target produce zero mutations', () => {
  const rawText = '- [] 확인';
  const target = listPersonalWorkspacePocAuthoringNearMissTargets(rawText)[0];
  assert.ok(target);
  const cancelled = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'cancel', rawText, expectedSourceFingerprint: 'ignored-on-cancel', targetId: target.targetId,
  });
  const stale = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'apply', rawText: `${rawText}!`, expectedSourceFingerprint: fingerprint(rawText), targetId: target.targetId,
  });
  const unknown = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), targetId: 'missing',
  });
  assert.deepEqual([cancelled.status, stale.status, unknown.status], ['cancelled', 'blocked', 'blocked']);
  assert.deepEqual([cancelled.mutationCount, stale.mutationCount, unknown.mutationCount], [0, 0, 0]);
});

test('undo refuses stale source, cancellation, and a tampered snapshot without mutation', () => {
  const rawText = '- [] 확인';
  const target = listPersonalWorkspacePocAuthoringNearMissTargets(rawText)[0];
  const repaired = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'apply', rawText, expectedSourceFingerprint: fingerprint(rawText), targetId: target.targetId,
  });
  assert.equal(repaired.status, 'repaired');
  if (repaired.status !== 'repaired') return;
  const stale = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo', rawText: `${repaired.nextRawText}!`, transaction: repaired.transaction,
  });
  const cancelled = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'cancel', rawText: repaired.nextRawText, transaction: repaired.transaction,
  });
  const tampered = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo', rawText: repaired.nextRawText,
    transaction: { ...repaired.transaction, beforeRawText: `${rawText}!` },
  });
  assert.deepEqual([stale.status, cancelled.status, tampered.status], ['blocked', 'cancelled', 'blocked']);
  assert.deepEqual([stale.mutationCount, cancelled.mutationCount, tampered.mutationCount], [0, 0, 0]);
});
