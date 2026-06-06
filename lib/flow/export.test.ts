import assert from 'node:assert/strict';
import test from 'node:test';
import { getLogTables } from './artifact-fields';
import { buildCalendarIcs, buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } from './export';
import { seedBundles } from './seed-flows';

test('timeline text export includes calculated dates when anchor exists', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const text = buildText(moving, {}, '2026-07-15');

  assert.match(text, /이사 D-30 준비 Flow/);
  assert.match(text, /이사일: 2026-07-15/);
  assert.match(text, /\[D-30 \/ 2026-06-15\]/);
  assert.match(text, /이사 방식 정하기/);
});

test('memo text export renders a checkbox checklist with done criteria and official links', () => {
  const welfare = seedBundles.find((bundle) => bundle.flow.slug === 'welfare-benefit-finder');
  assert.ok(welfare);

  const text = buildText(welfare, {}, undefined);

  // Markdown checkboxes so the pasted memo is an interactive checklist in Notion/메모앱.
  assert.match(text, /- \[ \] 복지로에서 맞춤형급여안내\(복지멤버십\) 신청하기/);
  // Non-generic completion criteria travel into the memo so the user knows when to check the box.
  assert.match(text, /완료 기준: 받을 수 있을 것 같은 서비스를 목록으로 적었다\./);
  // The official handoff link (복지로) is carried into the memo as the action target.
  assert.match(text, /링크: 복지로 서비스 신청 - https:\/\/www\.bokjiro\.go\.kr\//);

  // A completed item flips the checkbox to [x] rather than appending "(완료)".
  const firstId = welfare.items[0].id;
  const checked = buildText(welfare, { [firstId]: true }, undefined);
  assert.match(checked, /- \[x\] /);
});

test('text and workbook exports include item notes and skipped state', () => {
  const wedding = seedBundles.find((bundle) => bundle.flow.slug === 'wedding-d180-basic');
  assert.ok(wedding);
  const first = wedding.items[0];
  const second = wedding.items[1];
  assert.ok(first);
  assert.ok(second);

  const itemStates = {
    [first.id]: { note: '양가 협의는 6월 첫째 주에 다시 확인' },
    [second.id]: { skipped: true, note: '스몰웨딩이라 후보 비교 범위를 줄임' },
  };

  const text = buildText(wedding, { [first.id]: true }, '2026-09-15', itemStates);

  assert.match(text, /- \[x\] 예식 날짜와 예상 하객 규모 정하기/);
  assert.match(text, /메모: 양가 협의는 6월 첫째 주에 다시 확인/);
  assert.match(text, /- \[ \] 웨딩홀 후보와 예산 범위 비교하기 \(스킵\)/);
  assert.match(text, /메모: 스몰웨딩이라 후보 비교 범위를 줄임/);

  const sheets = buildWorkbookSheets(wedding, { [first.id]: true }, '2026-09-15', { itemStates });
  const execution = sheets.find((sheet) => sheet.name === '실행표');
  assert.ok(execution);
  assert.deepEqual(execution.columns, ['상태', '시점', '날짜', '섹션', '실행 내용', '완료 기준', '바로가기', '내 메모']);
  assert.equal(execution.rows[0][0], '완료');
  assert.equal(execution.rows[0][7], '양가 협의는 6월 첫째 주에 다시 확인');
  assert.equal(execution.rows[1][0], '스킵');
  assert.equal(execution.rows[1][7], '스몰웨딩이라 후보 비교 범위를 줄임');
});

test('decision exports include comparison candidate notes', () => {
  const usedCar = seedBundles.find((bundle) => bundle.flow.slug === 'used-car-buying-check');
  assert.ok(usedCar);
  const comparisonState = {
    candidates: [
      { id: 'candidate-1', name: '아반떼 2021' },
      { id: 'candidate-2', name: 'K3 2020' },
    ],
    notes: {
      'used-car-price-mileage': {
        'candidate-1': '총 1,250만원',
        'candidate-2': '보험료 별도 확인',
      },
    },
  };

  const text = buildText(usedCar, {}, undefined, {}, comparisonState);

  assert.match(text, /\[후보 비교표\]/);
  assert.match(text, /비교 항목 \| 아반떼 2021 \| K3 2020/);
  assert.match(text, /후보별 가격·주행거리 \| 총 1,250만원 \| 보험료 별도 확인/);

  const sheets = buildWorkbookSheets(usedCar, {}, undefined, { comparisonState });
  const comparison = sheets.find((sheet) => sheet.name === '후보 비교');
  assert.ok(comparison);
  assert.deepEqual(comparison.columns, ['비교 항목', '아반떼 2021', 'K3 2020']);
  assert.deepEqual(comparison.rows[0], [
    '후보별 가격·주행거리',
    '총 1,250만원',
    '보험료 별도 확인',
  ]);
});

test('moving export includes vendor comparison and proof memo records', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const comparisonState = {
    candidates: [
      { id: 'candidate-1', name: '한빛이사' },
      { id: 'candidate-2', name: '빠른이사' },
    ],
    notes: {
      'moving-vendor-price': {
        'candidate-1': '포장이사 85만원',
        'candidate-2': '반포장이사 62만원',
      },
    },
  };
  const workbenchState = {
    occurrences: {},
    logRows: {},
    memoCards: {
      'moving-proof-contract-location': '문자 견적 캡처',
      'moving-proof-deposit': '예약금 10만원 이체 완료',
    },
  };

  const text = buildText(moving, {}, '2026-07-15', {}, comparisonState, workbenchState);

  assert.match(text, /\[후보 비교표\]/);
  assert.match(text, /비교 항목 \| 한빛이사 \| 빠른이사/);
  assert.match(text, /이사 업체 견적 금액 \| 포장이사 85만원 \| 반포장이사 62만원/);
  assert.match(text, /견적서\/계약서 위치: 문자 견적 캡처/);
  assert.match(text, /계약금\/예약금 증빙: 예약금 10만원 이체 완료/);

  const sheets = buildWorkbookSheets(moving, {}, '2026-07-15', { comparisonState, workbenchState });
  const comparison = sheets.find((sheet) => sheet.name === '후보 비교');
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(comparison);
  assert.deepEqual(comparison.rows[0], ['이사 업체 견적 금액', '포장이사 85만원', '반포장이사 62만원']);
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('견적서/계약서 위치') && row.includes('문자 견적 캡처')));
});

test('travel export includes official confirmation and emergency memo records', () => {
  const travel = seedBundles.find((bundle) => bundle.flow.slug === 'overseas-travel-d14');
  assert.ok(travel);

  const workbenchState = {
    occurrences: {},
    logRows: {},
    memoCards: {
      'travel-destination': '일본 도쿄',
      'travel-entry-condition': '무비자 90일, 여권 6개월 이상 확인',
      'travel-emergency-contact': '영사콜센터 +82-2-3210-0404 / 주일본대사관',
    },
  };

  const text = buildText(travel, {}, '2026-07-18', {}, undefined, workbenchState);

  assert.match(text, /방문 국가\/도시: 일본 도쿄/);
  assert.match(text, /입국 조건 확인 결과: 무비자 90일, 여권 6개월 이상 확인/);
  assert.match(text, /영사콜센터·현지 공관: 영사콜센터 \+82-2-3210-0404 \/ 주일본대사관/);

  const sheets = buildWorkbookSheets(travel, {}, '2026-07-18', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('방문 국가/도시') && row.includes('일본 도쿄')));
  assert.ok(workbench.rows.some((row) => row.includes('영사콜센터·현지 공관') && row.some((cell) => String(cell).includes('주일본대사관'))));
});

test('study export includes chapter progress and mock score records', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'real-sinagong-computer-d30-study');
  assert.ok(study);

  const workbenchState = {
    occurrences: {},
    logRows: {
      'study-chapter-week-1': {
        scope: '1~3장',
        targetDate: '2026-06-12',
        status: '완료',
        note: '요약노트 작성',
      },
      'study-mock-1': {
        solvedDate: '2026-06-13',
        score: '78점',
        wrongAnswers: '계산 문제 4개',
        retryDate: '2026-06-15',
        weaknessNote: '스프레드시트 함수',
      },
    },
    memoCards: {},
  };

  const text = buildText(study, {}, '2026-07-05', {}, undefined, workbenchState);

  assert.match(text, /1주차 개념 1회독 범위: 1~3장/);
  assert.match(text, /1주차 개념 1회독 목표일: 2026-06-12/);
  assert.match(text, /기출 1회차 점수: 78점/);
  assert.match(text, /기출 1회차 오답: 계산 문제 4개/);

  const sheets = buildWorkbookSheets(study, {}, '2026-07-05', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('1주차 개념 1회독') && row.includes('범위') && row.includes('1~3장')));
  assert.ok(workbench.rows.some((row) => row.includes('기출 1회차') && row.includes('점수') && row.includes('78점')));
});

test('study export includes source-derived chapter defaults before user edits', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'computer-skills-d30-study');
  assert.ok(study);

  const workbenchState = {
    occurrences: {},
    logRows: {},
    memoCards: {},
  };

  const text = buildText(study, {}, '2026-06-22', {}, undefined, workbenchState);

  assert.match(text, /필기 핵심 개념 정리 범위: 컴퓨터 일반·스프레드시트 핵심 개념/);
  assert.match(text, /필기 핵심 개념 정리 상태: 원본에서 가져온 진도/);

  const sheets = buildWorkbookSheets(study, {}, '2026-06-22', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('필기 핵심 개념 정리') && row.includes('범위') && row.includes('컴퓨터 일반·스프레드시트 핵심 개념')));
});

test('study export ignores user overrides for source-derived scope rows', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'computer-skills-d30-study');
  assert.ok(study);

  const workbenchState = {
    occurrences: {},
    logRows: {
      'study-chapter-week-1': {
        scope: 'user-authored blank tracker category',
        targetDate: '2026-06-01',
        status: 'reviewed',
      },
    },
    memoCards: {},
  };

  const text = buildText(study, {}, '2026-06-22', {}, undefined, workbenchState);

  const progressTable = getLogTables(study)[0];
  const defaultScope = progressTable?.rows[0]?.defaultValues?.scope;
  assert.ok(defaultScope);

  const sheets = buildWorkbookSheets(study, {}, '2026-06-22', { workbenchState });
  const allCells = sheets.flatMap((sheet) => sheet.rows.flat()).map(String);
  assert.equal(text.includes('user-authored blank tracker category'), false);
  assert.equal(allCells.includes('user-authored blank tracker category'), false);
  assert.equal(allCells.includes(defaultScope), true);
  assert.equal(allCells.includes('2026-06-01'), true);
  assert.equal(allCells.includes('reviewed'), true);
});

test('study calendar export keeps each dated item executable', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'computer-skills-d30-study');
  assert.ok(study);

  const ics = buildIcsCalendar(study, {}, '2026-06-22');

  assert.match(ics, /SUMMARY:컴퓨터활용능력 D-30 학습 Flow - 필기와 실기 시험 범위 나누기/);
  assert.match(ics, /실행:/);
  assert.match(ics, /기록:/);
  assert.match(ics, /D-30 학습표|챕터 진도표/);
  assert.match(ics, /기출 점수·오답 기록|모의점수 로그/);
  assert.match(ics, /FLOW가 시험일 기준으로 변환/);
});

test('diet log text export starts with record table guidance', () => {
  const diet = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  assert.ok(diet);

  const text = buildText(diet, {}, undefined, {}, undefined);

  assert.match(text, /## 기록표/);
  assert.match(text, /식단, 운동, 측정, 컨디션/);
});

test('workbench records are included in text and workbook exports', () => {
  const diet = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  assert.ok(diet);

  const workbenchState = {
    occurrences: {
      '2026-05-22:1': { done: true, note: '컨디션 좋아서 강도 유지' },
      '2026-05-25:2': { done: true, note: '듣기 20분, 단어 30개' },
    },
    logRows: {
      '2026-05-22': {
        식단: '현미밥, 닭가슴살, 샐러드',
        운동: '상체 40분',
        컨디션: '수면 7시간',
      },
    },
    memoCards: {},
    weeklyReview: '저녁 탄수화물을 절반으로 줄여보기',
  };

  const text = buildText(diet, {}, '2026-05-22', {}, undefined, workbenchState);

  assert.match(text, /## 실행판 기록/);
  assert.match(text, /2026-05-22 식단: 현미밥, 닭가슴살, 샐러드/);
  assert.match(text, /1회차: 완료 - 컨디션 좋아서 강도 유지/);
  assert.match(text, /2회차: 완료 - 듣기 20분, 단어 30개/);
  assert.match(text, /주간 리뷰: 저녁 탄수화물을 절반으로 줄여보기/);

  const sheets = buildWorkbookSheets(diet, {}, '2026-05-22', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.deepEqual(workbench.columns, ['유형', '날짜/회차', '항목', '값']);
  assert.ok(workbench.rows.some((row) => row.some((cell) => String(cell).includes('듣기 20분, 단어 30개'))));
  assert.ok(workbench.rows.some((row) => row.includes('현미밥, 닭가슴살, 샐러드')));
  assert.ok(workbench.rows.some((row) => row.includes('저녁 탄수화물을 절반으로 줄여보기')));
});

test('decision text export includes comparison section before checklist items', () => {
  const usedCar = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');
  assert.ok(usedCar);

  const text = buildText(usedCar, {}, undefined, {}, {
    candidates: [
      { id: 'candidate-1', name: '후보 A' },
      { id: 'candidate-2', name: '후보 B' },
    ],
    notes: {},
  });

  assert.ok(text.indexOf('[후보 비교표]') > -1);
  assert.ok(text.indexOf('[후보 비교표]') < text.indexOf('총예산을 차량가, 이전비, 보험료, 정비비로 나누기'));
});

test('used-car text export carries the vehicle-condition guarantee boundary near the top', () => {
  const usedCar = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');
  assert.ok(usedCar);

  const text = buildText(usedCar, {}, undefined, {}, {
    candidates: [{ id: 'candidate-1', name: '아반떼 2021' }],
    notes: {},
  });

  assert.match(text.split('\n').slice(0, 4).join('\n'), /차량 상태를 보증하지 않습니다/);
  assert.ok(text.indexOf('차량 상태를 보증하지 않습니다') < text.indexOf('[후보 비교표]'));
});

test('risk-boundary exports preserve delivery evidence and diet observation values', () => {
  const newCar = seedBundles.find((entry) => entry.flow.slug === 'new-car-delivery-check');
  const diet = seedBundles.find((entry) => entry.flow.slug === 'diet-habit-2week');
  assert.ok(newCar);
  assert.ok(diet);

  const newCarWorkbench = {
    occurrences: {},
    logRows: {},
    memoCards: {
      'new-car-delivery-place': 'Mapo delivery bay / Kim manager',
      'new-car-photo-files': 'door-scratch-4821.jpg, hud-test-20260603.mp4',
      'new-car-dealer-confirmation': 'dealer confirmed scratch and will send written repair date',
      'new-car-handover-boundary': 'do not sign until repair memo is attached',
    },
  };
  const newCarText = buildText(newCar, {}, undefined, {}, {
    candidates: [{ id: 'candidate-1', name: 'Avante CN7 VIN 4821' }],
    notes: {
      'new-car-defect-dealer-confirmation': {
        'candidate-1': 'hold delivery until written confirmation',
      },
    },
  }, newCarWorkbench);
  assert.match(newCarText, /door-scratch-4821\.jpg/);
  assert.match(newCarText, /do not sign until repair memo is attached/);

  const newCarSheets = buildWorkbookSheets(newCar, {}, undefined, { workbenchState: newCarWorkbench });
  const newCarWorkbenchSheet = newCarSheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(newCarWorkbenchSheet);
  assert.ok(newCarWorkbenchSheet.rows.some((row) => row.includes('door-scratch-4821.jpg, hud-test-20260603.mp4')));
  assert.ok(newCarWorkbenchSheet.rows.some((row) => row.includes('do not sign until repair memo is attached')));

  const dietWorkbench = {
    occurrences: {},
    logRows: {
      '2026-06-01': {
        식단: 'breakfast oatmeal, lunch kimbap, dinner tofu',
        운동: '30m walk',
        측정: 'waist 82cm',
        컨디션: 'normal',
        리뷰: 'observe late dinner trigger',
      },
      '2026-06-03': {
        컨디션: 'dizziness repeated, stop and consult professional',
      },
    },
    memoCards: {},
    weeklyReview: 'late dinner and low sleep correlate with snack cravings',
  };
  const dietText = buildText(diet, {}, '2026-06-01', {}, undefined, dietWorkbench);
  assert.match(dietText, /dizziness repeated, stop and consult professional/);
  assert.match(dietText, /late dinner and low sleep correlate with snack cravings/);

  const dietSheets = buildWorkbookSheets(diet, {}, '2026-06-01', { workbenchState: dietWorkbench });
  const dietWorkbenchSheet = dietSheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(dietWorkbenchSheet);
  assert.ok(dietWorkbenchSheet.rows.some((row) => row.includes('observe late dinner trigger')));
  assert.ok(dietWorkbenchSheet.rows.some((row) => row.includes('dizziness repeated, stop and consult professional')));
});

test('ics export omits skipped dated flow items', () => {
  const wedding = seedBundles.find((bundle) => bundle.flow.slug === 'wedding-d180-basic');
  assert.ok(wedding);
  const first = wedding.items[0];
  const second = wedding.items[1];
  assert.ok(first);
  assert.ok(second);

  const ics = buildIcsCalendar(wedding, { [first.id]: true }, '2026-09-15', {
    [second.id]: { skipped: true },
  });

  assert.match(ics, /예식 날짜와 예상 하객 규모 정하기/);
  assert.doesNotMatch(ics, /웨딩홀 후보와 예산 범위 비교하기/);
});

test('workbook export uses user-facing Korean columns instead of raw db fields', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const sheets = buildWorkbookSheets(moving, { 'flow-moving-item-0': true }, '2026-07-15');
  const summary = sheets.find((sheet) => sheet.name === '실행 요약');
  assert.ok(summary);
  assert.deepEqual(summary.rows[0], ['FLOW', '이사 D-30 준비 Flow']);
  assert.deepEqual(summary.rows[2], ['진행률', '1 / 24 (4%)']);
  assert.ok(summary.rows.some((row) => row.includes('오늘/기준일 항목')));

  const execution = sheets.find((sheet) => sheet.name === '실행표');
  assert.ok(execution);

  assert.deepEqual(execution.columns, ['상태', '시점', '날짜', '섹션', '실행 내용', '완료 기준', '바로가기', '내 메모']);
  assert.doesNotMatch(execution.columns.join(','), /flow_title|structure_type|day_offset|done|why|how/);
  assert.deepEqual(execution.rows[0], [
    '완료',
    'D-30',
    '2026-06-15',
    'D-30 큰 준비',
    '이사 방식 정하기',
    '',
    '',
    '',
  ]);
  const moveInRow = execution.rows.find((row) => row.includes('전입신고와 확정일자 확인하기'));
  assert.ok(moveInRow);
  assert.match(String(moveInRow[5]), /전입신고 접수 상태/);
  assert.match(String(moveInRow[6]), /정부24 전입신고/);

  const detail = sheets.find((sheet) => sheet.name === '상세');
  assert.ok(detail);
  assert.deepEqual(detail.columns, ['실행 내용', '섹션', '왜 필요한가', '실행 방법', '주의', '출처/링크']);
  const detailRow = detail.rows.find((row) => row.includes('전입신고와 확정일자 확인하기'));
  assert.ok(detailRow);
  assert.match(String(detailRow[2]), /주소 이전/);
  assert.match(String(detailRow[3]), /정부24/);
});

test('meal plan workbook includes execution, recipe, and reaction log sheets', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');
  assert.ok(baby);

  const sheets = buildWorkbookSheets(
    baby,
    { 'meal-rice-0': true },
    '2026-06-01',
    {
      reactionLogs: {
        'meal-rice-0': {
          amount: '30ml',
          fedAt: '08:30',
          skin: '없음',
        },
      },
    },
  );

  assert.deepEqual(sheets.map((sheet) => sheet.name), ['실행 요약', '실행표', '주간 보기', '월간 보기', '상세', '레시피', '반응기록']);

  const execution = sheets.find((sheet) => sheet.name === '실행표');
  assert.ok(execution);
  assert.deepEqual(execution.rows[0], [
    '완료',
    'D+0~D+2',
    '2026-06-01 ~ 2026-06-03',
    '초기 1단계',
    '쌀미음',
    '새 재료: 쌀',
    '레시피: 쌀미음',
    '',
  ]);

  const recipes = sheets.find((sheet) => sheet.name === '레시피');
  assert.ok(recipes);
  assert.match(String(recipes.rows[0][1]), /쌀 또는 쌀가루/);
  assert.match(String(recipes.rows[0][2]), /1\. 쌀 또는 쌀가루를 준비한다/);

  const reaction = sheets.find((sheet) => sheet.name === '반응기록');
  assert.ok(reaction);
  assert.deepEqual(reaction.rows[0].slice(0, 7), [
    'D+0~D+2',
    '2026-06-01 ~ 2026-06-03',
    '쌀미음',
    '쌀',
    '30ml',
    '08:30',
    '없음',
  ]);

  const weekly = sheets.find((sheet) => sheet.name === '주간 보기');
  assert.ok(weekly);
  assert.deepEqual(weekly.columns, ['주', '월', '화', '수', '목', '금', '토', '일']);
  assert.ok(weekly.rows.some((row) => String(row[1]).includes('쌀미음 1일차')));
  assert.ok(weekly.rows.some((row) => String(row[2]).includes('쌀미음 2일차')));
  assert.ok(weekly.rows.some((row) => String(row[3]).includes('쌀미음 3일차')));

  const monthly = sheets.find((sheet) => sheet.name === '월간 보기');
  assert.ok(monthly);
  assert.deepEqual(monthly.columns, ['월/주', '월', '화', '수', '목', '금', '토', '일']);
  assert.ok(monthly.rows.some((row) => row[0] === '2026-06'));
  assert.ok(monthly.rows.some((row) => String(row[1]).includes('쌀미음 1일차')));
  assert.ok(monthly.rows.some((row) => String(row[2]).includes('쌀미음 2일차')));
  assert.ok(monthly.rows.some((row) => String(row[3]).includes('쌀미음 3일차')));
});

test('document issue exports include structured submitter memo records', () => {
  const family = seedBundles.find((bundle) => bundle.flow.slug === 'family-certificate-issue');
  assert.ok(family);

  const workbenchState = {
    occurrences: {},
    logRows: {},
    memoCards: {
      'family-submitter-requirement': '은행 제출, 상세 증명서 요구',
      'family-disclosure-scope': '주민등록번호 뒷자리 비공개',
      'family-file-location': 'PDF 파일명 family-bank-2026.pdf',
    },
  };

  const text = buildText(family, {}, undefined, {}, undefined, workbenchState);

  assert.match(text, /제출처 요구사항: 은행 제출, 상세 증명서 요구/);
  assert.match(text, /주민등록번호 공개 범위: 주민등록번호 뒷자리 비공개/);
  assert.match(text, /파일\/출력 위치: PDF 파일명 family-bank-2026\.pdf/);

  const sheets = buildWorkbookSheets(family, {}, undefined, { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('제출처 요구사항') && row.includes('은행 제출, 상세 증명서 요구')));
  assert.ok(workbench.rows.some((row) => row.includes('파일/출력 위치') && row.includes('PDF 파일명 family-bank-2026.pdf')));
});

test('qnet exports include multi-deadline application records with user values', () => {
  const qnet = seedBundles.find((bundle) => bundle.flow.slug === 'qnet-exam-application-prep');
  assert.ok(qnet);

  const workbenchState = {
    occurrences: {},
    logRows: {
      'qnet-application-deadline': {
        due: '2026-06-10 18:00',
        status: '접수 전',
        evidence: 'Q-Net 공지 캡처',
      },
      'qnet-exam-site': {
        due: '2026-07-15 09:00',
        status: '서울동부 시험장',
        evidence: '교통편 40분',
      },
    },
    memoCards: {},
  };

  const text = buildText(qnet, {}, '2026-07-15', {}, undefined, workbenchState);

  assert.match(text, /원서접수 마감 마감\/시점: 2026-06-10 18:00/);
  assert.match(text, /원서접수 마감 증빙\/메모: Q-Net 공지 캡처/);
  assert.match(text, /시험장·입실 시간 상태\/결정: 서울동부 시험장/);

  const sheets = buildWorkbookSheets(qnet, {}, '2026-07-15', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('원서접수 마감') && row.includes('마감/시점') && row.includes('2026-06-10 18:00')));
  assert.ok(workbench.rows.some((row) => row.includes('시험장·입실 시간') && row.includes('상태/결정') && row.includes('서울동부 시험장')));
});

test('xlsx export builds a valid workbook archive', async () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const buffer = await buildXlsxBuffer(buildWorkbookSheets(moving, {}, '2026-07-15'));
  const bytes = Buffer.from(buffer);

  assert.ok(bytes.byteLength > 1000);
  assert.equal(bytes.subarray(0, 2).toString('utf8'), 'PK');
});

test('ics export creates all-day calendar events from dated flow items', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const ics = buildIcsCalendar(moving, {}, '2026-07-15');

  assert.match(ics, /^BEGIN:VCALENDAR/m);
  assert.match(ics, /VERSION:2.0/);
  assert.match(ics, /PRODID:-\/\/FLOW MVP\/\/KO/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:이사 D-30 준비 Flow - 이사 방식 정하기/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260615/);
  assert.match(ics, /DTEND;VALUE=DATE:20260616/);
  assert.match(ics, /DESCRIPTION:/);
  assert.match(ics, /END:VCALENDAR$/);
});

test('ics export expands multi-day meal slots into calendar ranges', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');
  assert.ok(baby);

  const ics = buildIcsCalendar(baby, { 'meal-rice-0': true }, '2026-06-01');

  assert.match(ics, /SUMMARY:초기 이유식 메뉴·레시피 Flow - 쌀미음/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260601/);
  assert.match(ics, /DTEND;VALUE=DATE:20260604/);
  assert.match(ics, /STATUS:CONFIRMED/);
});

test('exact video workbook stays lightweight for personal sheets', () => {
  const workout = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-video-full-body-no-jump');
  const diet = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  assert.ok(workout);
  assert.ok(diet);

  const workoutSheets = buildWorkbookSheets(workout, {}, '2026-05-25', { weekdays: ['월', '수', '금'] });
  const dietSheets = buildWorkbookSheets(diet, {}, '2026-05-25', { weekdays: ['월', '수', '금'] });

  assert.deepEqual(workoutSheets.map((sheet) => sheet.name), ['실행 요약', '실행표', '상세']);
  assert.deepEqual(dietSheets.map((sheet) => sheet.name), ['실행 요약', '실행표', '상세']);
  assert.equal(workoutSheets.find((sheet) => sheet.name === '실행표')?.rows.length, 1);
  assert.equal(dietSheets.find((sheet) => sheet.name === '실행표')?.rows.length, 1);
});

test('calendar export creates a portable weekly event for exact video flows', () => {
  const workout = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-video-full-body-no-jump');
  assert.ok(workout);

  const ics = buildCalendarIcs(workout, '2026-05-25', ['월', '수', '금']);

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:ThankyouBUBU 전신 다이어트 실천 Flow/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260525/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  assert.match(ics, /URL:https:\/\/www\.youtube\.com\/watch\?v=/);
});

test('fixed-length routines bound the recurring calendar event with UNTIL', () => {
  // 30-day challenge starting Monday 2026-06-08 → UNTIL = 2026-07-07 (start + 29 days).
  const reading = seedBundles.find((bundle) => bundle.flow.slug === 'reading-habit-30day');
  assert.ok(reading);
  assert.equal(reading.flow.routine_duration_days, 30);
  const readingIcs = buildCalendarIcs(reading, '2026-06-08', ['월', '수', '금']);
  assert.match(readingIcs, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260707/);

  const morning = seedBundles.find((bundle) => bundle.flow.slug === 'morning-routine-30day');
  assert.ok(morning);
  assert.match(buildCalendarIcs(morning, '2026-06-08', ['월', '수', '금']), /UNTIL=20260707/);

  // 28-day weekly routine → UNTIL = start + 27 days.
  const detox = seedBundles.find((bundle) => bundle.flow.slug === 'digital-detox-weekly');
  assert.ok(detox);
  assert.equal(detox.flow.routine_duration_days, 28);
  assert.match(buildCalendarIcs(detox, '2026-06-08', ['월', '수', '금']), /UNTIL=20260705/);
});

test('open-ended daily habits keep recurring without an UNTIL bound', () => {
  for (const slug of ['morning-skincare-routine', 'home-cafe-daily', 'dog-walk-routine']) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.flow.routine_duration_days, undefined, `${slug} should stay open-ended`);
    const ics = buildCalendarIcs(bundle, '2026-06-08', ['월', '수', '금']);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/, `${slug} should recur weekly`);
    assert.doesNotMatch(ics, /UNTIL=/, `${slug} should not be bounded`);
  }
});

test('repeated workout video calendar export keeps each reminder executable', () => {
  const slugs = [
    'real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-daily-stretch-9min',
    'real-thankyou-bubu-video-belly-side-all-in-one',
    'real-thankyou-bubu-video-no-knee-cardio-strength',
    'real-thankyou-bubu-video-arm-back-shoulder',
    'real-thankyou-bubu-video-waist-8cm',
    'real-thankyou-bubu-video-8min-cardio',
    'real-thankyou-bubu-video-3min-arm',
    'real-thankyou-bubu-video-3min-abs',
    'real-thankyou-bubu-video-lower-belly-8min',
    'real-thankyou-bubu-home-workout-starter',
    'real-thankyou-bubu-20min-routine',
  ];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);

    const ics = buildCalendarIcs(bundle, '2026-05-25', ['월', '수', '금']);

    assert.match(ics, /RRULE:FREQ=WEEKLY/, `${slug} should export a weekly reminder`);
    assert.match(ics, /캘린더 알림/, `${slug} reminder needs standalone guidance`);
    assert.match(ics, /준비:/, `${slug} reminder needs preparation`);
    assert.match(ics, /실행:/, `${slug} reminder needs execution`);
    assert.match(ics, /운동 후 기록:/, `${slug} reminder needs record fields`);
    assert.match(ics, /원본 영상:/, `${slug} reminder needs source-video handoff`);
    assert.match(ics, /youtube\.com\/watch\?v=/, `${slug} reminder needs original video URL`);
    assert.match(ics, /중단|전문가/, `${slug} reminder needs stop or consult condition`);
  }
});
