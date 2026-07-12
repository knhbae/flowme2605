import assert from 'node:assert/strict';
import { test } from 'node:test';
import { koreanFlowContentCandidates } from './korean-flow-content-candidates';

test('korean Flow content studio covers 30+ source-backed candidates across categories', () => {
  assert.ok(koreanFlowContentCandidates.length >= 30);

  const categories = new Set(koreanFlowContentCandidates.map((candidate) => candidate.category));
  assert.ok(categories.size >= 8);

  const highFitCount = koreanFlowContentCandidates.filter((candidate) => candidate.fitScore >= 4).length;
  assert.ok(highFitCount >= 25);
});

test('korean Flow content candidates stay executable and lightweight', () => {
  for (const candidate of koreanFlowContentCandidates) {
    assert.ok(candidate.sourceUrl.startsWith('https://'), `${candidate.id} has a source URL`);
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} should not exceed calendar/reminder input complexity`);
    assert.ok(candidate.flowItems.length >= 3, `${candidate.id} needs concrete Flow items`);
    const maxItems =
      candidate.structure === 'timeline' ||
      candidate.structure === 'challenge' ||
      candidate.id === 'used-car-buying-check' ||
      candidate.id === 'naver-search-advisor-site-readiness'
        ? 8
        : 4;
    assert.ok(candidate.flowItems.length <= maxItems, `${candidate.id} should stay lightweight for its structure`);
    assert.ok(candidate.cta.includes('저장'), `${candidate.id} CTA should be save-oriented`);
    assert.ok(candidate.sourceBoundary, `${candidate.id} keeps source/risk boundary`);
  }
});

test('representative used-car candidate stays a lightweight field checklist without required photo evidence', () => {
  const usedCar = koreanFlowContentCandidates.find((candidate) => candidate.id === 'used-car-buying-check');
  assert.ok(usedCar);
  assert.equal(usedCar.flowItems.length, 8);

  const executionText = usedCar.flowItems
    .map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`)
    .join('\n');

  for (const cue of ['성능점검기록부', '보험이력', '자동차등록원부', '침수', '정비소', '예상 수리비', '결함·보증·반품', '구매/보류/거절']) {
    assert.match(executionText, new RegExp(cue));
  }
  assert.doesNotMatch(executionText, /사진.*필수|증빙.*필수|업로드/);
});

test('representative washer candidate keeps setup simple and moves supplies links into memo', () => {
  const washer = koreanFlowContentCandidates.find((candidate) => candidate.id === 'washer-tub-clean-monthly');
  assert.ok(washer);
  assert.deepEqual(washer.inputs, ['첫 청소 날짜', '세탁기 종류', '반복 주기']);

  const executionText = washer.flowItems
    .map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`)
    .join('\n');

  for (const cue of ['매월 1회', '통세척', '고무패킹', '세제통', '배수필터', '문을 열어 내부 건조']) {
    assert.match(executionText, new RegExp(cue));
  }
  assert.match(washer.memo, /구매 링크/);
  assert.match(washer.memo, /상세 메모/);
  assert.doesNotMatch(`${washer.memo}\n${executionText}`, /사진 증빙.*필수|업로드.*필수/);
});

test('representative water purifier candidate separates filter rows for the sheet-first artifact', () => {
  const water = koreanFlowContentCandidates.find((candidate) => candidate.id === 'water-purifier-filter-cycle');
  assert.ok(water);
  assert.equal(water.destination, 'sheet');
  assert.deepEqual(water.inputs, ['정수기 모델', '필터 구성', '마지막 교체일']);

  const executionText = water.flowItems
    .map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`)
    .join('\n');

  for (const cue of ['세디먼트', '프리카본', 'RO/나노', '후카본', '9~12개월', '물맛·냄새']) {
    assert.match(executionText, new RegExp(cue));
  }
  assert.doesNotMatch(executionText, /프리\/포스트|프리.*후카본.*묶|포스트카본/);
  assert.match(water.memo, /필터 구매 링크/);
  assert.match(water.sourceBoundary, /제조사|렌탈사/);
});

test('representative thankyou bubu exact-video candidate keeps the original video as the execution source', () => {
  const workout = koreanFlowContentCandidates.find((candidate) => candidate.id === 'thankyou-bubu-no-jump-home-workout');
  assert.ok(workout);
  assert.equal(workout.sourceType, 'creator_video');
  assert.equal(workout.sourceUrl, 'https://www.youtube.com/watch?v=pcyrlkHXAdE');
  assert.deepEqual(workout.inputs, ['운동 시작일', '운동 요일', '운동 시간대']);
  assert.equal(workout.flowItems.length, 4);

  const executionText = [
    workout.sourceSignal,
    workout.memo,
    workout.sourceBoundary,
    ...workout.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['원본 영상', '점프 없음', '눕는 동작 없음', '반복 없음', '토크 없음', '몸 상태', '통증', '어지러움', '호흡 곤란']) {
    assert.match(executionText, new RegExp(cue));
  }
  assert.doesNotMatch(executionText, /30일.*운동표|새 운동표|동작 순서.*새로 만든다|동작 순서.*생성/);
});

test('representative wedding candidate preserves source-specific execution cues', () => {
  const wedding = koreanFlowContentCandidates.find((candidate) => candidate.id === 'wedding-12-month-timeline');
  assert.ok(wedding);
  assert.equal(wedding.flowItems.length, 8);

  const executionText = wedding.flowItems
    .map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`)
    .join('\n');

  for (const cue of ['D-300', '보증인원 변경 가능 기한', '계약금', '위약금', '하객 명단', '식권', 'BGM', '역할 분담']) {
    assert.match(executionText, new RegExp(cue));
  }
});

test('fresh diversified candidates cover travel setup, recipe, and kids play without heavy fields', () => {
  const esim = koreanFlowContentCandidates.find((candidate) => candidate.id === 'japan-esim-setup-before-departure');
  const recipe = koreanFlowContentCandidates.find((candidate) => candidate.id === 'banana-peanut-recipe-video');
  const kidsPlay = koreanFlowContentCandidates.find((candidate) => candidate.id === 'kids-dino-footprint-art');

  assert.ok(esim);
  assert.ok(recipe);
  assert.ok(kidsPlay);

  assert.equal(esim.category, '여행/디지털 준비');
  assert.equal(recipe.category, '요리/레시피');
  assert.equal(kidsPlay.category, '육아/놀이');

  for (const candidate of [esim, recipe, kidsPlay]) {
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} keeps calendar/reminder-level inputs`);
    assert.ok(candidate.flowItems.length <= 4, `${candidate.id} stays lightweight`);
  }

  assert.match(esim.memo, /APN|데이터 로밍|상세 메모/);
  assert.doesNotMatch(esim.inputs.join('\n'), /APN|로밍|고객센터/);

  assert.match(recipe.memo, /칼로리 계산은 기본으로 넣지 않는다|원본 영상 링크/);
  assert.doesNotMatch(`${recipe.memo}\n${recipe.flowItems.map((item) => item.memo).join('\n')}`, /식단 관리.*필수|영양 기록.*필수/);

  assert.match(kidsPlay.memo, /발달 평가는 넣지 않는다|아이/);
  assert.doesNotMatch(`${kidsPlay.memo}\n${kidsPlay.flowItems.map((item) => item.memo).join('\n')}`, /사진 증빙.*필수|교육 효과.*보장/);
});

test('new anti-repetition candidates cover telecom activation and infant admin logistics', () => {
  const telecom = koreanFlowContentCandidates.find((candidate) => candidate.id === 'alt-phone-sk7-self-activation');
  const infantCheckup = koreanFlowContentCandidates.find((candidate) => candidate.id === 'infant-health-checkup-prep');

  assert.ok(telecom);
  assert.ok(infantCheckup);

  assert.equal(telecom.category, '통신/디지털 준비');
  assert.equal(telecom.destination, 'checklist');
  assert.deepEqual(telecom.inputs, ['개통 예정일', '유심 보유 여부', '번호이동 여부']);

  const telecomText = [
    telecom.sourceSignal,
    telecom.memo,
    telecom.sourceBoundary,
    ...telecom.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['유심', '유심 일련번호', '번호이동 사전동의', '통화', '데이터', '민감 정보']) {
    assert.match(telecomText, new RegExp(cue));
  }
  assert.doesNotMatch(telecomText, /주민등록번호.*입력 필드|인증값.*입력 필드|요금제 추천.*필수/);

  assert.equal(infantCheckup.category, '육아/행정');
  assert.equal(infantCheckup.sourceType, 'official');
  assert.equal(infantCheckup.destination, 'hybrid');
  assert.deepEqual(infantCheckup.inputs, ['검진 예정일', '아이 월령', '검진기관']);

  const infantText = [
    infantCheckup.sourceSignal,
    infantCheckup.memo,
    infantCheckup.sourceBoundary,
    ...infantCheckup.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['검진 가능 기간', '검진기관 예약', '문진표', '발달선별', '등록번호', 'D-Day']) {
    assert.match(infantText, new RegExp(cue));
  }
  assert.doesNotMatch(infantText, /성장 평가 입력|검진 결과 점수|진단 결과 기록|치료 계획/);
});

test('expanded anti-repetition candidates cover long-stay travel, short study, and housing admin', () => {
  const chiangmai = koreanFlowContentCandidates.find((candidate) => candidate.id === 'chiangmai-solo-trip-packing');
  const study3Day = koreanFlowContentCandidates.find((candidate) => candidate.id === 'computer-skills-written-3day-summary');
  const leaseReport = koreanFlowContentCandidates.find((candidate) => candidate.id === 'lease-contract-report-deadline');

  assert.ok(chiangmai);
  assert.ok(study3Day);
  assert.ok(leaseReport);

  assert.equal(chiangmai.category, '여행/장기체류');
  assert.equal(chiangmai.destination, 'checklist');
  assert.deepEqual(chiangmai.inputs, ['출국일', '체류 기간', '여행 도시']);

  const chiangmaiText = [
    chiangmai.sourceSignal,
    chiangmai.memo,
    chiangmai.sourceBoundary,
    ...chiangmai.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['유심/eSIM', 'GLN', '여행자보험', '필터 샤워기', 'PDF 체크리스트']) {
    assert.match(chiangmaiText, new RegExp(cue));
  }
  assert.doesNotMatch(chiangmaiText, /상품 구매.*필수|보험 가입하면.*안전|안전.*보장합니다/);

  assert.equal(study3Day.category, '공부/자격증');
  assert.equal(study3Day.destination, 'hybrid');
  assert.deepEqual(study3Day.inputs, ['시험일', '하루 공부 시간', '자료 저장 위치']);

  const studyText = [
    study3Day.sourceSignal,
    study3Day.memo,
    study3Day.sourceBoundary,
    ...study3Day.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['CBT', '요약 PDF', '1과목', '2과목', '월단위', 'D-1']) {
    assert.match(studyText, new RegExp(cue));
  }
  assert.doesNotMatch(studyText, /합격을 보장|점수를 예측해|학습 기록.*필수/);

  assert.equal(leaseReport.category, '주거/행정');
  assert.equal(leaseReport.destination, 'hybrid');
  assert.deepEqual(leaseReport.inputs, ['계약일', '신고 방식', '주택 소재지']);

  const leaseText = [
    leaseReport.sourceSignal,
    leaseReport.memo,
    leaseReport.sourceBoundary,
    ...leaseReport.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['30일', '계약서', '부동산 거래관리 시스템', '전자서명', '신고필증']) {
    assert.match(leaseText, new RegExp(cue));
  }
  assert.doesNotMatch(leaseText, /주민등록번호.*입력 필드|법적 효력.*보장합니다|과태료.*확정 판단/);
});

test('new diversification batch breaks out of appliance travel study and car repetition', () => {
  const dorm = koreanFlowContentCandidates.find((candidate) => candidate.id === 'college-dorm-move-in-checklist');
  const elementary = koreanFlowContentCandidates.find((candidate) => candidate.id === 'elementary-school-entry-d30');
  const craft = koreanFlowContentCandidates.find((candidate) => candidate.id === 'kids-printable-squishy-craft');
  const remote = koreanFlowContentCandidates.find((candidate) => candidate.id === 'anydesk-remote-setup-check');
  const fridge = koreanFlowContentCandidates.find((candidate) => candidate.id === 'fridge-cleanout-weekly-plan');

  for (const candidate of [dorm, elementary, craft, remote, fridge]) {
    assert.ok(candidate);
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} keeps setup simple`);
    assert.ok(candidate.flowItems.length <= 5, `${candidate.id} stays reviewable`);
  }

  assert.deepEqual(
    [dorm.category, elementary.category, craft.category, remote.category, fridge.category],
    ['학생/생활전환', '학부모/입학준비', '육아/도안놀이', '디지털/원격지원', '집밥/식재료'],
  );

  const dormText = [dorm.sourceSignal, dorm.memo, ...dorm.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo}`)].join('\n');
  for (const cue of ['최신 기숙사 공지', '제출서류', '결핵검사', '반입금지', 'D-Day', '시설점검']) {
    assert.match(dormText, new RegExp(cue));
  }

  const elementaryText = [elementary.sourceSignal, elementary.memo, ...elementary.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo}`)].join('\n');
  for (const cue of ['D-30', '취학통지', '예비소집', '보류', '네임스티커', '등교 동선', '학교 안내', '입학식']) {
    assert.match(elementaryText, new RegExp(cue));
  }
  assert.doesNotMatch(elementaryText, /주민등록번호.*입력 필드|취학통지서 이미지.*저장|지원금 금액.*확정|예방접종.*기록/);

  const craftText = [craft.sourceSignal, craft.memo, craft.sourceBoundary, ...craft.flowItems.map((item) => `${item.title} ${item.memo}`)].join('\n');
  for (const cue of ['도안', '출력', '재료', '놀이 날짜', '저작권']) {
    assert.match(craftText, new RegExp(cue));
  }
  assert.doesNotMatch(craftText, /발달.*평가.*입력|교육 효과.*보장합니다|도안.*복제해서 제공/);

  const remoteText = [remote.sourceSignal, remote.memo, remote.sourceBoundary, ...remote.flowItems.map((item) => `${item.title} ${item.memo}`)].join('\n');
  for (const cue of ['누가 먼저 요청', '공식 사이트', 'AnyDesk 주소', '수동 승인', '연결 요청', '세션 종료', '민감']) {
    assert.match(remoteText, new RegExp(cue));
  }
  assert.doesNotMatch(remoteText, /비밀번호.*필수 저장|인증값.*입력 필드로 저장한다|무단 접속.*가능/);

  const fridgeText = [fridge.sourceSignal, fridge.memo, fridge.sourceBoundary, ...fridge.flowItems.map((item) => `${item.title} ${item.memo}`)].join('\n');
  for (const cue of ['재고', '7일 메뉴', '장보기 보류', '남은 재료']) {
    assert.match(fridgeText, new RegExp(cue));
  }
  assert.doesNotMatch(fridgeText, /절약.*보장합니다|영양.*처방합니다|식단 관리.*필수 입력/);
});

test('remote help session precheck starts from permission choice without storing access values', () => {
  const remoteHelp = koreanFlowContentCandidates.find((candidate) => candidate.id === 'remote-help-session-precheck');

  assert.ok(remoteHelp);
  assert.equal(remoteHelp.sourceType, 'official');
  assert.equal(remoteHelp.destination, 'checklist');
  assert.equal(remoteHelp.structure, 'checklist');
  assert.ok(remoteHelp.inputs.length <= 4);
  assert.ok(remoteHelp.flowItems.length <= 4);

  assert.match(remoteHelp.flowItems[0].title, /requested support|trust|scope|요청|범위|상대/);
  assert.match(remoteHelp.flowItems[1].title, /screen share|one-time remote control|repeated management|화면 공유|일회성|반복/);

  const text = [
    remoteHelp.title,
    remoteHelp.sourceSignal,
    remoteHelp.memo,
    remoteHelp.uxNote,
    remoteHelp.sourceBoundary,
    ...remoteHelp.inputs,
    ...remoteHelp.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of [
    'screen share',
    'one-time remote control',
    'repeated management',
    'close',
    'review access',
    'AnyDesk',
    'TeamViewer',
    'Chrome Remote Desktop',
    'Zoom',
    'Quick Assist',
  ]) {
    assert.match(text, new RegExp(cue));
  }

  assert.doesNotMatch(
    text,
    /remote ID input|password input|access code input|session link input|token input|screenshot upload|support chat archive|device list|stores codes|stores passwords|fraud score|security guarantee/i,
  );
});

test('naver search advisor readiness starts from access method without storing verification values', () => {
  const naverReadiness = koreanFlowContentCandidates.find((candidate) => candidate.id === 'naver-search-advisor-site-readiness');

  assert.ok(naverReadiness);
  assert.equal(naverReadiness.sourceType, 'official');
  assert.equal(naverReadiness.destination, 'hybrid');
  assert.equal(naverReadiness.structure, 'checklist');
  assert.ok(naverReadiness.inputs.length <= 3);
  assert.equal(naverReadiness.flowItems.length, 5);

  assert.match(naverReadiness.flowItems[0].title, /site unit|access method|사이트 단위|접근권한/);
  assert.match(naverReadiness.flowItems[1].title, /ownership method|소유확인|Flow 밖/);
  assert.match(naverReadiness.flowItems[4].title, /revisit|다시 볼 날짜|status/);

  const text = [
    naverReadiness.title,
    naverReadiness.sourceSignal,
    naverReadiness.memo,
    naverReadiness.uxNote,
    naverReadiness.sourceBoundary,
    ...naverReadiness.inputs,
    ...naverReadiness.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of [
    'Naver Search Advisor',
    'HTML file',
    'HTML tag',
    'robots.txt',
    'noindex',
    'sitemap',
    'RSS',
    'ask developer/host admin',
    'verification',
    'crawl',
    'indexing',
    'ranking',
  ]) {
    assert.match(text, new RegExp(cue, 'i'));
  }

  assert.doesNotMatch(
    text,
    /token input|DNS record input|meta tag content input|OAuth grant|API key input|credential input|sitemap file upload|ranking target|traffic goal|SEO score|indexing guarantee|ranking guarantee/i,
  );
});

test('second diversification batch adds garden project and document prep axes without heavy inputs', () => {
  const balcony = koreanFlowContentCandidates.find((candidate) => candidate.id === 'balcony-fall-vegetable-calendar');
  const paint = koreanFlowContentCandidates.find((candidate) => candidate.id === 'self-wall-paint-weekend');
  const taxDocs = koreanFlowContentCandidates.find((candidate) => candidate.id === 'freelancer-income-tax-docs');

  for (const candidate of [balcony, paint, taxDocs]) {
    assert.ok(candidate);
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} keeps setup simple`);
    assert.ok(candidate.flowItems.length <= 5, `${candidate.id} stays reviewable`);
  }

  assert.deepEqual(
    [balcony.category, paint.category, taxDocs.category],
    ['베란다텃밭/채소', '집꾸미기/셀프시공', '프리랜서/세금준비'],
  );

  const balconyText = [
    balcony.sourceSignal,
    balcony.memo,
    balcony.sourceBoundary,
    ...balcony.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['파종', '수확', '빛', '물', '통풍']) {
    assert.match(balconyText, new RegExp(cue));
  }
  assert.doesNotMatch(balconyText, /수확.*보장합니다|농업 처방|매일 관찰.*필수/);

  const paintText = [
    paint.sourceSignal,
    paint.memo,
    paint.sourceBoundary,
    ...paint.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['롤러', '마스킹', '보양', '모서리', '건조']) {
    assert.match(paintText, new RegExp(cue));
  }
  assert.doesNotMatch(paintText, /시공 견적.*필수|비용.*보장|제품 설명서보다 우선/);

  const taxText = [
    taxDocs.sourceSignal,
    taxDocs.memo,
    taxDocs.sourceBoundary,
    ...taxDocs.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['소득 자료', '경비 증빙', '홈택스', '세무대리인', '누락']) {
    assert.match(taxText, new RegExp(cue));
  }
  assert.doesNotMatch(taxText, /세액을 계산|절세 판단|신고 의무.*판단해준다|경비 인정.*확정/);
});

test('third diversification batch covers seasonal food, official admin, vehicle inspection, camping, and pickup prep', () => {
  const kimjang = koreanFlowContentCandidates.find((candidate) => candidate.id === 'first-kimjang-weekend-checklist');
  const passport = koreanFlowContentCandidates.find((candidate) => candidate.id === 'passport-renewal-online-pickup');
  const carInspection = koreanFlowContentCandidates.find((candidate) => candidate.id === 'car-inspection-renewal-window');
  const camping = koreanFlowContentCandidates.find((candidate) => candidate.id === 'beginner-camping-packing-sheet');
  const pickup = koreanFlowContentCandidates.find((candidate) => candidate.id === 'free-appliance-pickup-reservation');

  for (const candidate of [kimjang, passport, carInspection, camping, pickup]) {
    assert.ok(candidate);
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} keeps setup simple`);
    assert.ok(candidate.flowItems.length <= 4, `${candidate.id} stays reviewable`);
    assert.match(candidate.cta, /저장/);
  }

  assert.deepEqual(
    [kimjang.category, passport.category, carInspection.category, camping.category, pickup.category],
    ['계절음식/집안행사', '여행/공식행정', '차량/공식검사', '캠핑/여가준비', '정리/방문수거'],
  );

  const kimjangText = [
    kimjang.sourceSignal,
    kimjang.memo,
    kimjang.sourceBoundary,
    ...kimjang.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['D-3', 'D-1', '절임', '헹굼', '배수', '보관 전환']) {
    assert.match(kimjangText, new RegExp(cue));
  }
  assert.doesNotMatch(kimjangText, /염도 계산 결과|pH 입력 필드|발효 결과.*보장합니다/);

  const passportText = [
    passport.sourceSignal,
    passport.memo,
    passport.sourceBoundary,
    ...passport.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['온라인 신청 가능 조건', '6개월 이내', '정부24', '방문 수령', '기존 여권']) {
    assert.match(passportText, new RegExp(cue));
  }
  assert.doesNotMatch(passportText, /여권 번호.*입력 필드|주민등록번호.*입력 필드|긴급 발급.*보장합니다/);

  const carText = [
    carInspection.sourceSignal,
    carInspection.memo,
    carInspection.sourceBoundary,
    ...carInspection.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['만료 90일', '관능', 'ABS', '하체', '전조등', '배출가스', '재검사']) {
    assert.match(carText, new RegExp(cue));
  }
  assert.doesNotMatch(carText, /자동차등록증|정비 견적 산출|검사 통과.*보장/);

  const campingText = [
    camping.sourceSignal,
    camping.memo,
    camping.sourceBoundary,
    ...camping.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['쉘터', '취침', '조리', '안전', '조명', '아이', '반려동물']) {
    assert.match(campingText, new RegExp(cue));
  }
  assert.doesNotMatch(campingText, /장비 추천 순위표|캠핑장 예약 대행 버튼/);

  const pickupText = [
    pickup.sourceSignal,
    pickup.memo,
    pickup.sourceBoundary,
    ...pickup.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['수거 가능 품목', '소형가전', '예약', '철거', '통로', '수거 당일']) {
    assert.match(pickupText, new RegExp(cue));
  }
  assert.doesNotMatch(pickupText, /개인정보.*입력 필드|수거 가능.*보장합니다/);
});

test('creator source breadth batch adds sheet, pet, housing, template, and baking material flows', () => {
  const piano = koreanFlowContentCandidates.find((candidate) => candidate.id === 'piano-carol-sheet-7day-practice');
  const cat = koreanFlowContentCandidates.find((candidate) => candidate.id === 'cat-adoption-first-week-setup');
  const jeonse = koreanFlowContentCandidates.find((candidate) => candidate.id === 'jeonse-contract-precheck-docs');
  const goodnotes = koreanFlowContentCandidates.find((candidate) => candidate.id === 'goodnotes-template-study-setup');
  const macaron = koreanFlowContentCandidates.find((candidate) => candidate.id === 'macaron-template-baking-day');

  for (const candidate of [piano, cat, jeonse, goodnotes, macaron]) {
    assert.ok(candidate);
    assert.ok(candidate.inputs.length <= 3, `${candidate.id} keeps setup simple`);
    assert.ok(candidate.flowItems.length <= 4, `${candidate.id} stays reviewable`);
    assert.match(candidate.cta, /저장/);
  }

  assert.deepEqual(
    [piano.category, cat.category, jeonse.category, goodnotes.category, macaron.category],
    ['음악/악보연습', '반려묘/입양준비', '주거/계약전점검', '디지털필기/템플릿', '베이킹/도안자료'],
  );

  const pianoText = [
    piano.sourceSignal,
    piano.memo,
    piano.sourceBoundary,
    ...piano.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['PDF', '댓글', 'D-7', '난이도', '녹음']) {
    assert.match(pianoText, new RegExp(cue));
  }
  assert.doesNotMatch(pianoText, /악보 파일.*복제해서 제공|교육 효과.*보장합니다|연주 점수.*필수/);

  const catText = [
    cat.sourceSignal,
    cat.memo,
    cat.sourceBoundary,
    ...cat.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['입양 후', '화장실', '이동장', '병원', '첫 주']) {
    assert.match(catText, new RegExp(cue));
  }
  assert.doesNotMatch(catText, /질병.*진단|접종.*판단해준다|사진 기록.*필수/);

  const jeonseText = [
    jeonse.sourceSignal,
    jeonse.memo,
    jeonse.sourceBoundary,
    ...jeonse.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['시세', '등기부등본', '보증보험', '표준계약서', '확정일자', '보류']) {
    assert.match(jeonseText, new RegExp(cue));
  }
  assert.doesNotMatch(jeonseText, /안전 점수|법률 결론|계약해도 됩니다|주민등록번호.*입력 필드/);

  const templateText = [
    goodnotes.sourceSignal,
    goodnotes.memo,
    goodnotes.sourceBoundary,
    ...goodnotes.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['PDF', '굿노트', '노트쉘프', '노타빌리티', '저작권', '7일']) {
    assert.match(templateText, new RegExp(cue));
  }
  assert.doesNotMatch(templateText, /속지 파일.*복제해서 제공|속지 파일.*재배포|학습 성과.*보장/);

  const macaronText = [
    macaron.sourceSignal,
    macaron.memo,
    macaron.sourceBoundary,
    ...macaron.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');
  for (const cue of ['도안 PDF', '댓글', '재료', '출력', '오븐', '저작권']) {
    assert.match(macaronText, new RegExp(cue));
  }
  assert.doesNotMatch(macaronText, /성공 보장합니다|정밀 온도 계산기|오븐 온도.*필수 입력|도안 파일.*복제해서 제공/);
});
