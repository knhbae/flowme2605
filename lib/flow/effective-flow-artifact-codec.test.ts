import assert from 'node:assert/strict';
import test from 'node:test';

import {
  encodeEffectiveFlowArtifactResources,
  encodeEffectiveFlowTsv,
  parseEffectiveFlowArtifactResources,
  parseEffectiveFlowLabeledMemo,
  parseEffectiveFlowTsv,
} from './effective-flow-artifact-codec';
import {
  buildPersonalStructuralListExportArtifactsFromRows,
  PERSONAL_STRUCTURAL_SHEET_HEADERS,
  type PersonalStructuralListExportResource,
} from './personal-structural-list-export';

function fieldMap(fields: readonly { label: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.label, field.value]));
}

function normalizeMemoValue(value: string): string {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

test('TSV codec round-trips tabs, LF, CRLF, quotes, empty cells, and unicode', () => {
  const rows = [
    ['일반', '탭', '여러 줄', '따옴표', '빈 값', 'URL'],
    [
      '한글, 쉼표; 역슬래시\\ 😀',
      '앞\t뒤',
      'CRLF\r\n둘째\n셋째',
      '"겹따옴표"와 ""연속""',
      '',
      'https://example.com/path?q=한글&one=1#부분',
    ],
  ];

  const encoded = encodeEffectiveFlowTsv(rows);

  assert.match(encoded, /"앞\t뒤"/u);
  assert.match(encoded, /"CRLF\r\n둘째\n셋째"/u);
  assert.match(encoded, /"""겹따옴표""와 """"연속"""""/u);
  assert.deepEqual(parseEffectiveFlowTsv(encoded), rows);
  assert.throws(() => parseEffectiveFlowTsv('제목\t"닫히지 않음\n'), /Unclosed quoted TSV cell/u);
});

test('resource cell codec preserves optional labels, order, and URL special characters', () => {
  const resources = [
    {
      label: '공식 "자료", A; 경로\\ 😀',
      url: 'https://example.com/tool?q=한글&mode=1#시작',
    },
    { url: 'https://example.org/raw?one=1&two=2#끝' },
  ] satisfies PersonalStructuralListExportResource[];

  const encoded = encodeEffectiveFlowArtifactResources(resources);

  assert.deepEqual(parseEffectiveFlowArtifactResources(encoded), resources);
});

test('golden rich row preserves declared Sheet and Memo fields through artifact parsers', () => {
  const resources = [
    {
      label: '공식 "자료", A; 경로\\ 😀',
      url: 'https://example.com/tool?q=한글&mode=1#시작',
    },
    { url: 'https://example.org/raw?one=1&two=2#끝' },
  ] satisfies PersonalStructuralListExportResource[];
  const description = '설명 첫 줄\r\n둘째 줄에는 탭\t과 "따옴표", 쉼표; 역슬래시\\ 😀\n셋째 줄';
  const completionCriteria = '사진 2장 확인\r\n완료 답장에 "확인" 표시';
  const memo = '개인 메모\r\n탭\t유지, 세미콜론; 😀';
  const executionMemo = '실행 메모 첫 줄\n둘째 줄 \\ 경로';
  const itemWarning = '항목 주의: "중복" 확인\r\n다음 줄';
  const flowWarning = '계획 주의, 전체; 확인\n탭\t포함';
  const sourceRef = '원문 "표시", A; https://source.example.com/a?q=1&b=2#근거';
  const sourceLabel = 'Flow 원문 "이름", A; \\ 😀';
  const sourceUrl = 'https://flow.example.com/source?q=한글&mode=full#원문';
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: '특수문자 보존 Flow',
    sourceLabel,
    sourceUrl,
    rows: [{
      itemId: 'special-character-golden',
      title: '한글 "제목", 쉼표; 역슬래시\\ 😀',
      date: '2030-09-01',
      scheduleState: 'timed',
      time: '09:30',
      durationMinutes: 45,
      timeZone: 'Asia/Seoul',
      repeatLabel: '매주 · 월·수 · 5회',
      description,
      completionCriteria,
      memo,
      executionMemo,
      itemWarning,
      flowWarning,
      resources,
      sourceRef,
      status: 'done',
      personalOrderRank: 7,
    }],
  });

  const sheet = parseEffectiveFlowTsv(artifacts.sheetTsv);
  assert.equal(sheet.length, 2);
  assert.deepEqual(sheet[0], [...PERSONAL_STRUCTURAL_SHEET_HEADERS]);
  const sheetRow = Object.fromEntries(sheet[0]!.map((header, index) => [header, sheet[1]![index]]));
  assert.equal(sheetRow['설명'], description);
  assert.equal(sheetRow['시간대'], 'Asia/Seoul');
  assert.equal(sheetRow['반복'], '매주 · 월·수 · 5회');
  assert.equal(sheetRow['완료 기준'], normalizeMemoValue(completionCriteria));
  assert.equal(sheetRow['메모'], memo);
  assert.equal(sheetRow['실행 메모'], executionMemo);
  assert.equal(sheetRow['항목 주의'], itemWarning);
  assert.equal(sheetRow['계획 주의'], flowWarning);
  assert.equal(sheetRow['원문'], sourceRef);
  assert.equal(sheetRow['계획 원문 이름'], sourceLabel);
  assert.equal(sheetRow['계획 원문 URL'], sourceUrl);
  assert.deepEqual(parseEffectiveFlowArtifactResources(sheetRow['자료']!), resources);

  const parsedMemo = parseEffectiveFlowLabeledMemo(artifacts.memoText);
  assert.equal(parsedMemo.title, '특수문자 보존 Flow');
  assert.equal(parsedMemo.summary, '할 일 1개');
  assert.equal(parsedMemo.records.length, 1);
  assert.equal(parsedMemo.records[0]!.title, '한글 "제목", 쉼표; 역슬래시\\ 😀');
  const memoFields = fieldMap(parsedMemo.records[0]!.fields);
  assert.equal(memoFields['시간대'], 'Asia/Seoul');
  assert.equal(memoFields['반복'], '매주 · 월·수 · 5회');
  assert.equal(memoFields['설명'], normalizeMemoValue(description));
  assert.equal(memoFields['완료 기준'], normalizeMemoValue(completionCriteria));
  assert.equal(memoFields['개인 메모'], normalizeMemoValue(memo));
  assert.equal(memoFields['실행 메모'], normalizeMemoValue(executionMemo));
  assert.equal(memoFields['주의'], normalizeMemoValue(itemWarning));
  assert.equal(memoFields['계획 주의'], normalizeMemoValue(flowWarning));
  assert.equal(memoFields['자료 1 이름'], resources[0]!.label);
  assert.equal(memoFields['자료 1 URL'], resources[0]!.url);
  assert.equal(memoFields['자료 2 이름'], undefined);
  assert.equal(memoFields['자료 2 URL'], resources[1]!.url);
  assert.equal(memoFields['원문'], sourceRef);
  assert.deepEqual(fieldMap(parsedMemo.footerFields ?? []), {
    '계획 원문 이름': sourceLabel,
    '계획 원문 URL': sourceUrl,
  });

  assert.match(artifacts.checklistText, /설명: 설명 첫 줄/u);
  assert.match(artifacts.checklistText, /시간대: Asia\/Seoul/u);
  assert.match(artifacts.checklistText, /반복: 매주 · 월·수 · 5회/u);
  assert.match(artifacts.checklistText, /완료 기준: 사진 2장 확인/u);
  assert.match(artifacts.checklistText, /개인 메모: 개인 메모/u);
  assert.match(artifacts.checklistText, /실행 메모: 실행 메모 첫 줄/u);
  assert.match(artifacts.checklistText, /자료: 공식 "자료", A; 경로\\ 😀 - https:\/\/example\.com/u);
});

test('absent source values stay empty instead of becoming an invented source', () => {
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: '원문 없는 Flow',
    rows: [{
      itemId: 'source-absent',
      title: '원문 없는 항목',
      scheduleState: 'unscheduled',
      status: 'pending',
      personalOrderRank: 0,
    }],
  });
  const sheet = parseEffectiveFlowTsv(artifacts.sheetTsv);
  const row = Object.fromEntries(sheet[0]!.map((header, index) => [header, sheet[1]![index]]));

  assert.equal(row['원문'], '');
  assert.equal(row['계획 원문 이름'], '');
  assert.equal(row['계획 원문 URL'], '');
  const memo = parseEffectiveFlowLabeledMemo(artifacts.memoText);
  assert.equal(memo.records[0]!.fields.some((entry) => entry.label === '원문'), false);
  assert.equal(memo.footerFields, undefined);
});
