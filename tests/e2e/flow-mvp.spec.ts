import { expect, test } from '@playwright/test';

test('home presents FLOW as an executable content platform', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: '둘러보기', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '채널' })).toHaveAttribute('href', '/creators');
  await expect(page.getByRole('link', { name: '내 Flow' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flow Lab' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '제작자' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '따라하기 쉬운 실행 가이드, Flow' })).toBeVisible();
  await expect(page.getByText('바로 따라할 수 있는 Flow')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flow 둘러보기' })).toBeVisible();
  await expect(page.getByRole('link', { name: '내 콘텐츠로 Flow 만들기' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '#D-Day 준비' })).toHaveCount(0);
  await expect(page.getByText('이사 D-30 준비 Flow').first()).toBeVisible();
  await expect(page.getByText('중고차 구매 현장 점검 Flow').first()).toBeVisible();
  await expect(page.getByText('초기 이유식 메뉴·레시피 Flow').first()).toBeVisible();
  await expect(page.getByText('결혼 준비 D-180 Flow').first()).toBeVisible();
  await expect(page.getByText('직장인 영어공부 30일 루틴 Flow').first()).toBeVisible();
  await expect(page.getByText('미리보기').first()).toBeVisible();
  await expect(page.getByText('출력:').first()).toBeVisible();
});

test('flow list exposes the seed and online-sourced flows', async ({ page }) => {
  await page.goto('/flows');

  await expect(page.getByRole('heading', { name: '공개 Flow 탐색' })).toBeVisible();
  await expect(page.getByLabel('태그')).toBeVisible();
  await expect(page.getByLabel('카테고리')).toBeVisible();
  await expect(page.getByLabel('Flow 방식')).toBeVisible();
  await expect(page.getByLabel('정렬')).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '초기 이유식 메뉴·레시피 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '하루 20분 전신 홈트 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이직 전 리스크 점검 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '해외여행 출국 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '연말정산 서류 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '여권 재발급 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '국가건강검진 D-7 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '개인 사업자등록 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-180 Flow' })).toBeVisible();

  await page.getByLabel('카테고리').selectOption('결혼/준비');
  await expect(page.getByRole('heading', { name: '결혼 준비 D-180 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).not.toBeVisible();
  await expect(page.getByText('by 웨딩 체크메이트')).toBeVisible();
  await expect(page.getByText('베타 운영 중').first()).toBeVisible();
  await expect(page.getByText('#D-Day 준비').first()).toBeVisible();
});

test('flow card title opens the public execution page', async ({ page }) => {
  await page.goto('/flows?tag=D-Day%20%EC%A4%80%EB%B9%84');

  await page.getByRole('link', { name: '시험 D-30 공부 계획 Flow' }).click();

  await expect(page).toHaveURL(/\/f\/study-exam-d30-plan/);
  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toBeVisible();
});

test('moving restart route starts from move date setup', async ({ page }) => {
  await page.goto('/restart/moving-d30');

  await expect(page.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  await expect(page.getByLabel('이사일')).toBeVisible();
  await expect(page.getByRole('button', { name: '일정 만들기' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'AJD 이사할 때 체크리스트 상세 정리' })).toHaveAttribute(
    'href',
    /ajd\.co\.kr\/contents\/basic-tip\/detail/,
  );
  await expect(page.getByRole('link', { name: '정부24 전입신고 민원안내 및 신청' })).toHaveAttribute(
    'href',
    /gov\.kr\/mw\/AA020InfoCappView\.do/,
  );
  await expect(page.getByRole('region', { name: '이사 D-30 캘린더' })).toBeVisible();
  await expect(page.locator('.fc')).toBeVisible();
  await expect(page.getByText('D-10 주소 변경과 정기 서비스 정리')).toBeVisible();
});

test('moving restart edits items before export', async ({ page }) => {
  await page.goto('/restart/moving-d30');
  await page.getByLabel('이사일').fill('2026-06-27');
  await page.getByRole('button', { name: '일정 만들기' }).click();

  await page.getByRole('button', { name: '주소 변경과 정기 서비스 정리 편집' }).click();
  await page.getByLabel('항목 날짜').fill('2026-06-18');
  await page.getByLabel('항목 메모').fill('인터넷 이전 설치는 오전 시간으로 예약');
  await page.getByRole('button', { name: '항목 저장' }).click();

  await expect(page.getByText('2026-06-18')).toBeVisible();
  await expect(page.getByText('인터넷 이전 설치는 오전 시간으로 예약')).toBeVisible();

  await page.getByRole('button', { name: '항목 추가' }).click();
  await page.getByLabel('새 항목 제목').fill('관리사무소 엘리베이터 예약');
  await page.getByLabel('새 항목 날짜').fill('2026-06-20');
  await page.getByRole('button', { name: '새 항목 저장' }).click();
  await expect(page.getByRole('heading', { name: '관리사무소 엘리베이터 예약' })).toBeVisible();

  await page.getByRole('button', { name: '버릴 물건과 대형폐기물 정리 편집' }).click();
  await page.getByRole('button', { name: '항목 삭제' }).click();
  await expect(page.getByText('버릴 물건과 대형폐기물 정리')).toHaveCount(0);
});

test('moving restart exports edited items and gates flow save', async ({ page }) => {
  await page.goto('/restart/moving-d30');
  await page.getByLabel('이사일').fill('2026-06-27');
  await page.getByRole('button', { name: '일정 만들기' }).click();
  await page.getByRole('button', { name: '주소 변경과 정기 서비스 정리 편집' }).click();
  await page.getByLabel('항목 날짜').fill('2026-06-18');
  await page.getByRole('button', { name: '항목 저장' }).click();

  await page.getByRole('button', { name: '체크리스트 복사' }).click();
  await expect(page.getByText('체크리스트를 만들었습니다')).toBeVisible();
  await expect(page.getByText('2026-06-18')).toBeVisible();

  await page.getByRole('button', { name: '내 Flow로 저장' }).click();
  await expect(page.getByRole('dialog', { name: '내 Flow로 저장할까요?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그인/회원가입' })).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem('flow:auth:demo-user', 'true'));
  await page.getByRole('button', { name: '계속 둘러보기' }).click();
  await page.getByRole('button', { name: '내 Flow로 저장' }).click();
  await expect(page.getByText('내 Flow에 저장했습니다')).toBeVisible();
  await expect(page.getByRole('link', { name: '내 Flow에서 보기' })).toHaveAttribute('href', '/my');
});

test('flow discovery restores tag filter from URL query', async ({ page }) => {
  await page.goto('/flows?tag=돈이%20걸린%20결정');

  await expect(page.getByLabel('태그')).toHaveValue('돈이 걸린 결정');
  await expect(page.getByRole('link', { name: '#돈이 걸린 결정' })).toBeVisible();
  await expect(page.getByText('#돈이 걸린 결정').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toBeVisible();
});

test('my flow workspace separates copied or drafted flows from public discovery', async ({ page }) => {
  await page.goto('/my');

  await expect(page).toHaveTitle(/내 Flow/);
  await expect(page.getByRole('heading', { name: '내 Flow', exact: true })).toBeVisible();
  await expect(page.getByText('Creator Studio')).toHaveCount(0);
  await expect(page.getByText('사용자가 곧 제작자입니다')).toHaveCount(0);
  await expect(page.getByText('현재 사용자', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '내 제작자 프로필' })).toHaveAttribute('href', '/u/my-flow-studio');
  await expect(page.getByText('아직 만든 내 버전이 없습니다')).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '저장한 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByText('이사일 2026-07-15 · 0/24 완료')).toBeVisible();
  await expect(page.getByRole('link', { name: '이어서 관리하기' }).first()).toHaveAttribute('href', '/f/moving-d30-basic');

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('실행판 체크: 이사 방식 정하기').check();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '저장한 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByText('이사일 2026-07-15 · 1/24 완료')).toBeVisible();
  await expect(page.getByRole('link', { name: '이어서 관리하기' }).first()).toHaveAttribute('href', '/f/moving-d30-basic');

  await page.goto('/f/moving-d30-basic');
  await page.getByRole('region', { name: 'Flow artifact workbench' }).getByRole('button', { name: '내 버전' }).click();
  await expect(page).toHaveURL(/\/flows\/.+\/edit/);

  await page.goto('/my');
  await expect(page.getByText('발행 Flow')).toBeVisible();
  await expect(page.getByRole('button', { name: /초안/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
  await page.getByRole('link', { name: '내 제작자 프로필' }).click();
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toBeVisible();
});

test('creator profile aggregates creator flows from byline links', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await page.getByRole('link', { name: 'by 웨딩 체크메이트' }).click();

  await expect(page).toHaveURL(/\/u\//);
  await expect(page.getByRole('heading', { name: '웨딩 체크메이트' })).toBeVisible();
  await expect(page.getByText('총 실행')).toBeVisible();
  await expect(page.getByText('D-Day 준비', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-180 Flow' })).toBeVisible();
});

test('creator directory exposes channel-scale preview library', async ({ page }) => {
  await page.goto('/creators');

  await expect(page.getByRole('heading', { name: '제작자 채널' })).toBeVisible();
  await expect(page.getByText(/4\d{2}\+/)).toBeVisible();
  await expect(page.locator('header').getByText('실제 원본')).toBeVisible();
  await expect(page.locator('header').getByText('샘플 후보')).toBeVisible();
  await expect(page.locator('header').getByText('원본 검토')).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ThankyouBUBU', exact: true })).toBeVisible();
  await expect(page.getByText('실행성 점수')).toHaveCount(0);
});

test('creator directory exposes representative creator content links', async ({ page }) => {
  await page.goto('/creators');

  await expect(page.getByText('대표 Flow').first()).toBeVisible();
  await expect(page.locator('a[href="/f/real-thankyou-bubu-video-full-body-no-jump"]').first()).toBeVisible();
  await expect(page.locator('a[href="/f/real-fitvely-video-body-fat-6kg-method"]').first()).toBeVisible();
});

test('preview creator channel supports browsing 20+ flowified entries', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByRole('heading', { name: '삼성전자서비스' })).toBeVisible();
  const channelHeader = page.locator('header');
  await expect(channelHeader).toContainText('Flow 후보');
  await expect(channelHeader.getByText(/4\d/).first()).toBeVisible();
  await expect(channelHeader).toContainText('실제 원본');
  await expect(channelHeader).toContainText('샘플 후보');
  await expect(channelHeader).toContainText('원본 검토');
  await expect(page.getByText('채널 Flow 라이브러리')).toBeVisible();
  await expect(page.getByLabel('Flow 검색')).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).toBeVisible();
  await page.getByLabel('Flow 검색').fill('비상 상황');
  await expect(page.getByRole('link', { name: /가전관리 비상 상황 대응표/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).not.toBeVisible();
});

test('creator channel can filter real source-backed flows', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByText('실제 원본').first()).toBeVisible();
  await expect(page.getByText('대표 항목:')).toHaveCount(0);
  await page.getByRole('button', { name: '실제 원본' }).click();

  await expect(page.locator('a[href="/f/real-samsung-aircon-seasonal-care"]').first()).toBeVisible();
  await expect(page.locator('a[href^="/f/channel-samsung-service-"]')).toHaveCount(0);
});

test('fitness creator profile highlights exact video flows before samples', async ({ page }) => {
  await page.goto('/u/thankyou-bubu');

  await expect(page.getByText('실제 콘텐츠로 바로 시작')).toBeVisible();
  await expect(page.locator('a[href="/f/real-thankyou-bubu-video-full-body-no-jump"]').first()).toBeVisible();

  await page.locator('button').first().click();

  await expect(page.locator('a[href="/f/real-thankyou-bubu-video-full-body-no-jump"]').first()).toBeVisible();
  await expect(page.locator('a[href^="/f/channel-thankyou-bubu-"]')).toHaveCount(0);
});

test('fitness exact video flow keeps the execution panel minimal', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');

  const exactTool = page.getByRole('region', { name: '영상 반복 캘린더 설정' });
  await expect(exactTool.getByText('운동 캘린더 · primary')).toBeVisible();
  await expect(exactTool.getByRole('heading', { name: '4주 반복 운동 캘린더' })).toBeVisible();
  await expect(exactTool.getByText('추천 리듬: 주 3회')).toBeVisible();
  await expect(exactTool.getByText('시작일', { exact: true })).toBeVisible();
  await expect(exactTool.getByText('운동 요일')).toBeVisible();
  await expect(exactTool.getByText('4주 12회차 미리보기', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /영상 열기/ })).toBeVisible();
  await expect(page.getByText('캘린더 일정으로 시작')).toHaveCount(0);
  await expect(page.getByText('1. 요일 정하기')).toHaveCount(0);
  await expect(page.getByText('2. 오늘 실행 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내 Flow로 수정')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '실행 항목' })).toBeVisible();
  const schedulePreview = page.getByRole('region', { name: '이번 주 등록 미리보기' });
  await expect(schedulePreview).toBeVisible();
  await expect(schedulePreview.getByText('월요일').first()).toBeVisible();
  await expect(schedulePreview.getByText('수요일').first()).toBeVisible();
  await expect(schedulePreview.getByText('금요일').first()).toBeVisible();
  await expect(schedulePreview.getByText('12회차 표시')).toBeVisible();
  await expect(page.getByText('한눈에 보는 전체 루트')).toHaveCount(0);
  await expect(page.getByText('이번 주 루틴 설정')).toHaveCount(0);
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(exactTool.getByRole('button', { name: '캘린더에 넣기 · .ics' })).toBeVisible();
  await expect(exactTool.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeVisible();
  await expect(page.getByRole('button', { name: '초보' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '절반' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 루틴' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByText('weekly')).toHaveCount(0);

  const calendarDownloadPromise = page.waitForEvent('download');
  await exactTool.getByRole('button', { name: '캘린더에 넣기 · .ics' }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe('real-thankyou-bubu-video-full-body-no-jump.ics');

  const excelDownloadPromise = page.waitForEvent('download');
  await exactTool.getByRole('button', { name: '시트로 받기 · .xlsx' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('real-thankyou-bubu-video-full-body-no-jump.xlsx');
});

test('former broad ThankyouBUBU routes now render as one exact-video action', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-home-workout-starter');
  const starterWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(starterWorkbench.getByText('홈트 캘린더')).toBeVisible();
  await expect(starterWorkbench.getByText('4주 홈트 체크')).toBeVisible();
  await expect(page.getByText('운동 가능한 공간과 매트 준비')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '영상 반복 캘린더 설정' })).toHaveCount(0);

  await page.goto('/f/real-thankyou-bubu-20min-routine');
  await expect(page.getByText('20분 전신 운동 영상 주 3회 일정에 넣고 실행').first()).toBeVisible();
  await expect(page.getByText('주 3회 운동 요일 선택')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /영상 열기/ })).toBeVisible();
  const exactTool = page.getByRole('region', { name: '영상 반복 캘린더 설정' });
  await expect(exactTool.getByRole('button', { name: '캘린더에 넣기 · .ics' })).toBeVisible();
  await expect(exactTool.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeVisible();
});

test('diet exact video flow uses application language instead of workout scheduling', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('heading', { name: '기록표', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘 한 끼 적용 관찰표 Flow' })).toBeVisible();
  await expect(page.getByText('영상에서 기준 1개를 고른 뒤 다음 식사나 운동 전후 행동에 한 번만 적용하고, 적용 전/후 반응을 관찰표 한 줄에 적습니다.')).toBeVisible();
  await expect(workbench.getByRole('heading', { name: '오늘 한 끼 적용 관찰표' })).toBeVisible();
  await expect(page.getByText('오늘 적용 기준만 고르기')).toHaveCount(0);
  await expect(page.getByText('1. 적용일 정하기')).toHaveCount(0);
  await expect(page.getByText('적용 전후 기록').first()).toBeVisible();
  await expect(page.getByText('운동 요일')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 루틴' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByText('운동표에 이미 들어간 기준')).toHaveCount(0);
  await expect(page.getByText('적용 전후 관찰표').first()).toBeVisible();
  await expect(workbench.getByLabel('적용 전 기록 / 적용할 식사·운동 전후 행동')).toBeVisible();
  await expect(workbench.getByLabel('적용 전 기록 / 적용 전 컨디션')).toBeVisible();
  await expect(workbench.getByLabel('적용 후 기록 / 적용 후 반응')).toBeVisible();
  await expect(workbench.getByLabel('적용 후 기록 / 유지/중단 결정')).toBeVisible();
  const exactTool = page.getByRole('region', { name: '영상 반복 캘린더 설정' });
  await expect(exactTool.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeVisible();
  await expect(exactTool.getByRole('button', { name: '메모/노션에 복사' })).toBeVisible();
});

test('workout programming exact video starts from a decision table before weekly plan', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-workout-order');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('heading', { name: '후보 비교표', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '운동 기준 결정표에 들어간 적용 Flow' })).toBeVisible();
  await expect(page.getByText('영상의 운동 기준 후보를 먼저 비교하고, 고른 기준만 이번 주 운동표로 옮깁니다.')).toBeVisible();
  await expect(page.getByText('추천 리듬: 결정 후 적용')).toBeVisible();
  await expect(page.getByText('결정표+운동표')).toBeVisible();
  await expect(page.getByText('결정 후 운동표 미리보기')).toBeVisible();
  await expect(page.getByText('선택 기준 반영').first()).toBeVisible();
  await expect(page.getByText('운동표에 이미 들어간 기준')).toHaveCount(0);
  const exactTool = page.getByRole('region', { name: '영상 반복 캘린더 설정' });
  await expect(exactTool.getByRole('button', { name: '캘린더에 넣기 · .ics' })).toBeVisible();
  await expect(exactTool.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeVisible();
});

test('FITVELY diet record route starts from a source-rule observation sheet', async ({ page }) => {
  await page.goto('/f/real-fitvely-diet-record-routine');

  await expect(page.getByRole('heading', { name: 'FITVELY 식단 기록 루틴 Flow' })).toBeVisible();
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(page.getByText('하루 기록 항목 정하기')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '원문 보기' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=qcTxaFMWzKs');
});

test('exact video copy opens an editable draft with the execution item preserved', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');

  await page.getByRole('button', { name: '내 버전 만들기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: /ThankyouBUBU 전신 다이어트 실천 Flow 사본/ })).toBeVisible();
  await expect(page.getByText('1개 항목', { exact: true })).toBeVisible();
  await expect(page.getByLabel('실행 내용')).toHaveValue('운동 스케줄 등록하고 영상 실행');
});

test('creator profile merges newly shipped seed flows into existing browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([
        {
          flow: {
            id: 'flow-local-only',
            slug: 'local-only',
            title: 'Local only old flow',
            description: 'Old browser storage entry',
            category: '운동/홈트',
            structure_type: 'routine',
            anchor_type: 'start_date',
            status: 'published',
            owner_user_id: 'channel-thankyou-bubu',
            creator_name: 'ThankyouBUBU',
            creator_role: '홈트 루틴 채널',
            creator_note: 'old storage',
            created_at: '2026-05-20T00:00:00.000Z',
            updated_at: '2026-05-20T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
      ]),
    );
  });

  await page.goto('/u/thankyou-bubu');

  await expect(page.getByText('실제 콘텐츠로 바로 시작')).toBeVisible();
  await expect(page.locator('a[href="/f/real-thankyou-bubu-video-full-body-no-jump"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Local only old flow' })).toBeVisible();
});

test('real source public flow exposes source QA metadata and target metadata', async ({ page }) => {
  await page.goto('/f/real-samsung-aircon-seasonal-care');

  await expect(page.getByText('2026-05-21 확인')).toBeVisible();
  await expect(page.getByText('Flow 전환 방식:')).toBeVisible();
  await expect(page.getByText('정확한 출처 페이지')).toBeVisible();
  await expect(page.getByText('목표일 입력으로 시작')).toBeVisible();
  await expect(page.getByText('이 Flow는 아래 콘텐츠를 기반으로')).toBeVisible();
});

test('vehicle inspection route keeps reservation and result memo beside the timeline', async ({ page }) => {
  await page.goto('/f/vehicle-inspection-prep');

  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toBeVisible();
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByText('검사 예약·결과 후속 메모')).toHaveCount(0);
  await expect(workbench.getByLabel('검사 예약 정보')).toHaveCount(0);
  await expect(workbench.getByText('검사 결과 후속 memo gap 검토가 필요합니다.')).toHaveCount(0);
});

test('preview creator flow route opens encoded Korean slug', async ({ page }) => {
  await page.goto('/f/channel-samsung-service-%EC%9B%94%EA%B0%84-%EC%A0%90%EA%B2%80-%EB%A3%A8%ED%8B%B4');

  await expect(page).toHaveURL(/\/f\/channel-samsung-service-/);
  await expect(page.locator('main.p-8')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('new flow creation starts from pasted content and a human pattern choice', async ({ page }) => {
  await page.goto('/flows/new');

  await expect(page.getByRole('heading', { name: 'Flow 만들기' })).toBeVisible();
  await expect(page.getByText('콘텐츠 넣기')).toBeVisible();
  await expect(page.getByText('실행 방식 고르기')).toBeVisible();

  await page.getByLabel('제목').fill('자동차 구매 테스트 Flow');
  await page.getByLabel('원본 콘텐츠').fill('## 예산 확인\n- 총예산 정하기\n- 보험료 확인하기');
  await page.getByRole('button', { name: '순서대로 체크하기' }).click();
  await page.getByRole('button', { name: 'Flow 초안 만들기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '자동차 구매 테스트 Flow' })).toBeVisible();
});

test('text editor shows a public-style parsed preview while drafting', async ({ page }) => {
  await page.goto('/flows/flow-moving/edit');

  const sourceEditor = page.locator('textarea').first();
  await sourceEditor.fill('# 테스트 이사 Flow\n\n## D-30\n- 이사업체 견적 받기 D-30\n\n## D-Day\n- 이사 당일 확인 D-Day');

  const preview = page.getByTestId('editor-preview');
  await expect(preview).toContainText('미리보기');
  await expect(preview).toContainText('이사업체 견적 받기');
  await expect(preview).toContainText('D-30');
  await expect(preview).toContainText('이사 당일 확인');

  const detailPanel = page.locator('details').filter({ hasText: '실행 디테일' }).first();
  await detailPanel.locator('summary').click();
  await detailPanel.locator('textarea').first().fill('견적 기준을 남겨 나중에 비교하기 위해 필요합니다.');
  await expect(sourceEditor).toHaveValue(/why: 견적 기준을 남겨 나중에 비교하기 위해 필요합니다\./);

  await page.getByRole('button', { name: '발행' }).click();
  await expect(page.getByText('발행되었습니다')).toBeVisible();
  await expect(page.getByRole('link', { name: '제작자 프로필에서 보기' })).toBeVisible();
});

test('public moving flow calculates dates and updates progress', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByText('1. 이사일 입력하기')).toBeVisible();
  await expect(page.getByText('예시 날짜로 미리보기')).toBeVisible();
  await expect(page.getByText('캘린더', { exact: true })).toBeVisible();
  await expect(page.getByTestId('artifact-list-card').getByRole('heading', { name: '실행 리스트' })).toBeVisible();
  await expect(page.getByText('이사 방식 정하기').first()).toBeVisible();
  await expect(page.getByText('2. 실행 항목 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내보내기와 백업')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(page.getByText('내보내기와 백업')).toHaveCount(0);
  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('button', { name: '엑셀로 받기' })).toBeVisible();
  await expect(workbench.getByRole('button', { name: '엑셀로 받기' })).toBeDisabled();
  await expect(page.getByText('by FLOW 큐레이션팀')).toBeVisible();
  await expect(page.getByText('베타 운영 중').first()).toBeVisible();
  await page.getByLabel('이사일').fill('2026-07-15');
  await expect(page.getByText('이사일: 2026-07-15')).toBeVisible();
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 할 일' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'D-30 큰 준비', exact: true })).toHaveCount(0);
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '달력 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card').getByRole('heading', { name: '월간 캘린더' })).toBeVisible();
  await expect(page.getByText('월', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('일', { exact: true }).first()).toBeVisible();

  await page.getByLabel('실행판 체크: 이사 방식 정하기').check();
  await page.getByLabel('실행판 체크: 이사할 집 하자 점검하기').check();
  await expect(workbench.getByText('2/24 완료')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await workbench.getByRole('button', { name: '엑셀로 받기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('moving-d30-basic.xlsx');
});

test('moving flow opens with an export-first calendar preview hero', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const hero = page.getByRole('region', { name: 'Export-first flow hero' });
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(hero.getByText('이렇게 캘린더에 들어갑니다')).toBeVisible();

  await hero.getByLabel('이사일').fill('2026-06-22');
  await expect(hero.getByText('2026-05-23', { exact: true })).toBeVisible();
  await expect(hero.getByText('이사 방식 정하기')).toBeVisible();
  await expect(hero.getByText('2026-06-12', { exact: true })).toBeVisible();
  await expect(hero.getByText('우편물/카드/은행 주소 변경하기')).toBeVisible();
  await expect(hero.getByText('2026-06-22', { exact: true })).toBeVisible();
  await expect(hero.getByText('전기/가스/수도/관리비 정산하기')).toBeVisible();
  await expect(hero.getByRole('button', { name: '내 Flow에 저장' })).toBeVisible();

  const firstCard = page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card');
  await expect(firstCard.getByText('이사 방식 정하기')).toBeVisible();
  const heroBox = await hero.boundingBox();
  const listBox = await firstCard.boundingBox();
  expect(heroBox?.y ?? 0).toBeLessThan(listBox?.y ?? 0);
});

test('moving mobile saves to My Flow before external export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-06-26');
  const saveActions = page.getByTestId('moving-save-actions');
  await expect(saveActions.getByRole('button', { name: '내 Flow에 저장' })).toBeVisible();
  await saveActions.getByRole('button', { name: '내 Flow에 저장' }).click();

  await expect(page.getByText('내 Flow에 담았어요')).toBeVisible();
  await expect(saveActions.getByRole('link', { name: '내 Flow에서 관리하기' })).toHaveAttribute('href', '/my');
  await expect(saveActions.getByRole('button', { name: '캘린더로 보내기' })).toBeVisible();
  await expect(saveActions.getByRole('button', { name: '엑셀 실행표 받기' })).toBeVisible();

  await saveActions.getByRole('link', { name: '내 Flow에서 관리하기' }).click();
  await expect(page).toHaveURL('/my');
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByText('이사일 2026-06-26 · 0/24 완료')).toBeVisible();
});

test('my flow management tabs expose calendar checklist and routine views', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-06-26');
  await page.getByTestId('moving-save-actions').getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '저장한 Flow' })).toBeVisible();

  await page.getByRole('button', { name: '캘린더' }).click();
  await expect(page.getByRole('heading', { name: '월간 캘린더' })).toBeVisible();
  await expect(page.getByText('이사 방식 정하기').first()).toBeVisible();
  await expect(page.getByText('다가오는 일정')).toBeVisible();

  await page.getByRole('button', { name: '체크리스트' }).click();
  await page.getByLabel('내 Flow 체크: 이사 방식 정하기').check();

  await page.getByRole('button', { name: 'Flow별' }).click();
  await expect(page.getByText('이사일 2026-06-26 · 1/24 완료')).toBeVisible();

  await page.getByRole('button', { name: '루틴' }).click();
  await expect(page.getByRole('heading', { name: '저장된 루틴 Flow가 없습니다' })).toBeVisible();
});

test('my flow filters narrow saved calendar checklist and routine management', async ({ page }) => {
  await page.addInitScript(() => {
    const savedAt = '2026-05-27T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    }));
    localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-06-26',
    }));
    localStorage.setItem('flow:saved:home-workout-20min', JSON.stringify({
      slug: 'home-workout-20min',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-05-27',
    }));
    localStorage.setItem('flow:home-workout-20min:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-05-27',
    }));
  });

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '하루 20분 전신 홈트 Flow' })).toBeVisible();

  await page.getByTestId('my-flow-filter-home-workout-20min').click();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '하루 20분 전신 홈트 Flow' })).toBeVisible();

  await page.getByRole('button', { name: '루틴' }).click();
  await expect(page.getByRole('heading', { name: '주간 루틴' })).toBeVisible();
  await expect(page.getByText('수요일')).toBeVisible();

  await page.getByRole('button', { name: '체크리스트' }).click();
  await page.getByLabel('내 Flow 체크: 제자리 걷기 1분').check();
  await page.getByTestId('my-flow-checklist-filter-done').click();
  await expect(page.getByLabel('내 Flow 체크: 제자리 걷기 1분')).toBeVisible();

  await page.getByTestId('my-flow-checklist-filter-open').click();
  await expect(page.getByLabel('내 Flow 체크: 제자리 걷기 1분')).toHaveCount(0);
});

test('flow item card makes detail and skipped states explicit', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-06-22');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(page.getByLabel('실행판 체크: 이사할 집 하자 점검하기')).toBeVisible();
  const firstDetail = workbench.getByTestId('artifact-list-card').locator('summary', { hasText: '자세히' }).first();
  await expect(firstDetail).toBeVisible();

  await firstDetail.click();
  await expect(workbench.getByText('실행:').first()).toBeVisible();
  await expect(workbench.getByText('완료:').first()).toBeVisible();
  await expect(workbench.getByText('이유:').first()).toBeVisible();
});

test('source-fit decisions are visible on direct-access public flow pages', async ({ page }) => {
  await page.goto('/f/study-exam-d30-plan');
  await expect(page.getByTestId('source-fit-status')).toHaveAttribute('data-decision', 'catalog_preview_only');

  await page.goto('/f/running-5k-4week');
  await expect(page.getByTestId('source-fit-status')).toHaveAttribute('data-decision', 'reshape_before_featured');
});

test('computer skills final QA exports checklist and calendar without study progress tables', async ({ page }) => {
  await page.goto('/f/computer-skills-d30-study');

  await expect(page.getByRole('heading', { name: '컴퓨터활용능력 D-30 학습 Flow' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
  await expect(page.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(page.getByTestId('artifact-log-table-study-mock-scores')).toHaveCount(0);

  await page.getByLabel('시험일').fill('2026-06-22');
  await expect(page.getByText('05-23').first()).toBeVisible();

  await page.getByLabel('실행판 체크: 필기와 실기 시험 범위 나누기').check();
  let studyWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  const listCard = studyWorkbench.getByTestId('artifact-list-card');
  const calendarCard = studyWorkbench.getByTestId('artifact-calendar-card');
  await expect(listCard.getByRole('button', { name: '엑셀로 받기' })).toBeEnabled();
  await expect(calendarCard.getByRole('button', { name: '캘린더 받기' })).toBeEnabled();

  const excelDownloadPromise = page.waitForEvent('download');
  await listCard.getByRole('button', { name: '엑셀로 받기' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('computer-skills-d30-study.xlsx');

  const calendarDownloadPromise = page.waitForEvent('download');
  studyWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await studyWorkbench.getByTestId('artifact-calendar-card').getByRole('button', { name: '캘린더 받기' }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe('computer-skills-d30-study.ics');
});

test('risk-boundary QA exports new-car evidence memo and diet observation sheet', async ({ page }) => {
  await page.goto('/f/new-car-delivery-check');

  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench).toBeVisible();
  const holdSection = workbench.getByTestId('flow-hold-section');
  await expect(holdSection).toContainText('인수 보류 기준');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-reason').fill('driver door scratch');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files').fill('door-scratch-4821.jpg, hud-test-20260603.mp4');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-confirmation').fill('dealer confirmed scratch and will send written repair date');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-next-check').fill('do not sign until repair memo is attached');
  await workbench.locator('input[type="checkbox"]').first().check();
  await expect(workbench.getByRole('button', { name: '엑셀로 받기' })).toBeEnabled();

  let excelDownloadPromise = page.waitForEvent('download');
  await workbench.getByRole('button', { name: '엑셀로 받기' }).click();
  let excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('new-car-delivery-check.xlsx');

  await page.goto('/f/diet-habit-2week');
  await page.locator('input[type="date"]').first().fill('2026-06-01');

  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await workbench.getByLabel(/캘린더 회차 체크:/).first().check();
  const dietCalendarCard = workbench.getByTestId('artifact-calendar-card');
  await expect(dietCalendarCard.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeEnabled();

  excelDownloadPromise = page.waitForEvent('download');
  await dietCalendarCard.getByRole('button', { name: '시트로 받기 · .xlsx' }).click();
  excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('diet-habit-2week.xlsx');
});

test('public MVP guardrail screens keep evidence and stop conditions first', async ({ page }) => {
  await page.goto('/f/new-car-delivery-check');

  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('인수 보류 기준');
  await expect(workbench.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/diet-habit-2week');
  await page.locator('input[type="date"]').first().fill('2026-06-01');

  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
});

test('moving mobile sticky action saves to My Flow before export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByRole('checkbox', { name: /이사 방식 정하기/ }).first().check();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const mobileBar = page.getByTestId('mobile-export-bar');
  await expect(mobileBar).toBeVisible();
  await expect(mobileBar.getByText('1 / 24')).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: '내 Flow에 저장' })).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
  await expect(mobileBar.getByRole('button', { name: '엑셀 받기' })).toHaveCount(0);

  await mobileBar.getByRole('button', { name: '내 Flow에 저장' }).click();
  await expect(page.getByText('내 Flow에 담았어요')).toBeVisible();
  await expect(mobileBar.getByRole('link', { name: '내 Flow에서 관리하기' })).toBeVisible();
});

test('wedding flow answers first-screen questions and persists date note and skip state', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await expect(page.getByRole('heading', { name: '결혼 준비 D-180 Flow' })).toBeVisible();
  await expect(page.getByText('평균 소요 6개월')).toBeVisible();
  await expect(page.getByText('12개 항목', { exact: true })).toBeVisible();
  await expect(page.getByText('예식일 입력으로 시작')).toBeVisible();
  await expect(page.getByText('첫 행동:')).toHaveCount(0);
  await expect(page.getByText('이 Flow는 아래 콘텐츠를 기반으로')).toBeVisible();
  await expect(page.getByText('ohprint.me')).toBeVisible();
  await expect(page.getByLabel('예식일')).toBeVisible();

  await page.getByLabel('예식일').fill('2026-09-15');
  await expect(page.getByText('예식일: 2026-09-15')).toBeVisible();
  await expect(page.getByText(/모든 항목이 자동 조정/)).toBeVisible();

  const firstItem = page.locator('[data-testid="flow-item-card"]').filter({ hasText: '예식 날짜와 예상 하객 규모 정하기' }).first();
  await expect(firstItem.getByLabel('완료: 예식 날짜와 예상 하객 규모 정하기')).toBeVisible();
  await expect(firstItem.getByText(/D-180/)).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '메모' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '해당 없음' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '자세히' })).toBeVisible();
  await firstItem.getByLabel('완료: 예식 날짜와 예상 하객 규모 정하기').check();
  await firstItem.getByRole('button', { name: '메모' }).click();
  await expect(firstItem.getByText('자동 저장됨 · 이 기기에만 저장')).toBeVisible();
  await firstItem.getByLabel('예식 날짜와 예상 하객 규모 정하기 메모').fill('양가 협의는 6월 첫째 주에 다시 확인');

  const secondItem = page.locator('[data-testid="flow-item-card"]').filter({ hasText: '웨딩홀 후보와 예산 범위 비교하기' }).first();
  await secondItem.getByRole('button', { name: '해당 없음' }).click();
  await expect(page.getByText('1 / 11').first()).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('예식일')).toHaveValue('2026-09-15');
  await firstItem.getByRole('button', { name: '메모' }).click();
  await expect(firstItem.getByLabel('예식 날짜와 예상 하객 규모 정하기 메모')).toHaveValue('양가 협의는 6월 첫째 주에 다시 확인');
  await expect(secondItem.getByRole('button', { name: '다시 포함' })).toBeVisible();
  await expect(page.getByText('1 / 11').first()).toBeVisible();
});

test('promoted P1 flows expose new execution model surfaces', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await expect(page.getByRole('heading', { name: '결혼 준비 D-180 Flow' })).toBeVisible();
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByText('후보 비교 preview')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();

  await page.goto('/f/study-exam-d30-plan');

  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toBeVisible();
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByText('회차 그리드 · primary')).toBeVisible();
  await expect(page.getByText('회차 기록표 · secondary')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();

  for (const [slug, title] of [
    ['home-workout-20min', '하루 20분 전신 홈트 Flow'],
    ['english-study-30day-routine', '직장인 영어공부 30일 루틴 Flow'],
    ['car-care-monthly-routine', '월 1회 자동차 관리 루틴 Flow'],
  ] as const) {
    await page.goto(`/f/${slug}`);

    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
    await expect(page.getByText('회차 그리드 · primary')).toBeVisible();
    await expect(page.getByText('회차 기록표 · secondary')).toBeVisible();
    await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  }
});

test('new flow creation keeps advanced settings secondary', async ({ page }) => {
  await page.goto('/flows/new');

  await expect(page.getByText('고급 설정')).toBeVisible();
  await expect(page.getByText('목표일 기준으로 준비하기')).toBeVisible();
  await expect(page.getByText('매일·매주 반복하기')).toBeVisible();
  await expect(page.getByText('식단·레시피로 구성하기')).toBeVisible();
});

test('meal plan flow exposes recipe and menu calendar without reaction log', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  await page.getByLabel('이유식 시작일').fill('2026-06-01');
  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByText('D+0~D+2 · 06-01~06-03')).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '달력 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(workbench.getByText('쌀미음', { exact: true })).toBeVisible();
  await expect(workbench.getByText('찹쌀미음', { exact: true })).toBeVisible();
  await expect(workbench.getByText('애호박미음', { exact: true })).toBeVisible();

  await workbench.getByText('레시피 보기').first().click();
  await expect(workbench.getByText('쌀 또는 쌀가루', { exact: true })).toBeVisible();
  await expect(page.getByTestId('reaction-log-meal-rice-0')).toHaveCount(0);
});

test('baby food first screen prioritizes the menu calendar over reaction logging', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('meal-reaction-workbench')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByTestId('meal-reaction-log-card')).toHaveCount(0);
  await expect(workbench.getByTestId('meal-recipe-detail-card')).toHaveCount(0);
  await expect(workbench).toContainText('전문가');
});

test('baby food mobile starts with warning and menu calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/baby-food-menu-recipe');

  const workbench = page.getByLabel('Flow artifact workbench');
  const warning = workbench.getByTestId('meal-sensitive-warning');
  const calendarCard = workbench.getByTestId('artifact-calendar-card').first();

  await expect(warning).toBeVisible();
  await expect(calendarCard).toBeVisible();
  await expect(workbench.getByTestId('meal-today-reaction-card')).toHaveCount(0);

  const warningBox = await warning.boundingBox();
  const calendarBox = await calendarCard.boundingBox();
  expect(warningBox).not.toBeNull();
  expect(calendarBox).not.toBeNull();
  expect(warningBox!.y).toBeLessThan(calendarBox!.y);
  expect(calendarBox!.y).toBeLessThan(844);

  await expect(page.getByText('validated')).toHaveCount(0);
});

test('baby food mobile omits the reaction summary before the calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/baby-food-menu-recipe');

  const workbench = page.getByLabel('Flow artifact workbench');
  const summaryCard = workbench.getByTestId('meal-reaction-summary-card');

  await expect(summaryCard).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();

  const order = await workbench.locator('[data-testid="artifact-calendar-card"], [data-testid="meal-recipe-detail-card"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.testid),
  );
  expect(order[0]).toBe('artifact-calendar-card');
});

test('duration calendar checks only one day at a time', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  await page.getByLabel('이유식 시작일').fill('2026-06-01');

  const firstDay = page.getByLabel('이유식 완료: 쌀미음');
  const secondDay = page.getByLabel('이유식 완료: 찹쌀미음');

  await firstDay.check();

  await expect(firstDay).toBeChecked();
  await expect(secondDay).not.toBeChecked();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();
});

test('routine flow highlights weekly routine setup', async ({ page }) => {
  await page.goto('/f/running-5k-4week');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('routine-session-grid-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-session-log-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-today-session-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  await page.getByLabel('운동 시작일').fill('2026-06-01');

  await expect(page.getByText('추천 다음 항목')).toHaveCount(0);
  await page.getByRole('button', { name: '월별 달력' }).click();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.getByRole('button', { name: '전체 루틴' }).click();
  await page.locator('[data-testid="flow-item-card"]').first().getByRole('checkbox').check();
  await expect(page.getByText('추천 다음 항목')).toBeVisible();
});

test('routine desktop uses session grid and session log artifacts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/running-5k-4week');

  const workbench = page.getByLabel('Flow artifact workbench');
  const sessionGrid = workbench.getByTestId('routine-session-grid-card');
  const sessionLog = workbench.getByTestId('routine-session-log-card');
  const todayCard = workbench.getByTestId('routine-today-session-card');

  await expect(sessionGrid).toBeVisible();
  await expect(sessionGrid.getByText(/WEEK 1/)).toBeVisible();

  await expect(sessionLog).toBeVisible();
  await expect(sessionLog.getByRole('button', { name: '시트로 받기 · .xlsx' })).toBeVisible();

  await expect(todayCard).toBeVisible();

  const gridBox = await sessionGrid.boundingBox();
  const logBox = await sessionLog.boundingBox();
  expect(gridBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(gridBox!.y).toBeLessThan(logBox!.y);

  await expect(page.getByText('validated')).toHaveCount(0);
});

test('routine mobile puts the session card before the calendar card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const slug of [
    'running-5k-4week',
    'home-workout-20min',
    'english-study-30day-routine',
    'car-care-monthly-routine',
    'real-thankyou-bubu-video-full-body-no-jump',
  ] as const) {
    await page.goto(`/f/${slug}`);

    const workbench = page.getByLabel('Flow artifact workbench');
    const sessionCard = workbench.getByTestId('routine-today-session-card').first();
    const calendarCard = workbench.getByTestId('artifact-calendar-card').first();

    await expect(sessionCard).toBeVisible();
    await expect(sessionCard.getByRole('checkbox')).toBeVisible();
    await expect(sessionCard.getByTestId('routine-session-record-button')).toBeVisible();
    await expect(calendarCard).toBeVisible();

    const sessionBox = await sessionCard.boundingBox();
    const recordButtonBox = await sessionCard.getByTestId('routine-session-record-button').boundingBox();
    const calendarBox = await calendarCard.boundingBox();
    expect(sessionBox).not.toBeNull();
    expect(recordButtonBox).not.toBeNull();
    expect(calendarBox).not.toBeNull();
    expect(sessionBox!.y).toBeLessThan(844);
    expect(recordButtonBox!.y).toBeLessThan(844);
    expect(sessionBox!.y).toBeLessThan(calendarBox!.y);

    await expect(page.getByText('validated')).toHaveCount(0);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/running-5k-4week');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card').last()).toBeVisible();
});

test('low-context date labels explain the required anchor', async ({ page }) => {
  await page.goto('/f/national-health-checkup-d7');

  await expect(page.getByText('입력할 날짜: 검진일')).toBeVisible();
  await page.getByLabel('검진일').fill('2026-06-20');

  await expect(page.getByText('검진일 기준으로 날짜가 계산됩니다.')).toBeVisible();
  await expect(page.getByText('2026-06-13').first()).toBeVisible();
});

test('no-anchor checklist skips date setup and hides calendar export', async ({ page }) => {
  await page.goto('/f/year-end-tax-docs');

  await expect(page.getByText('날짜 입력 없이 바로 확인합니다')).toBeVisible();
  await expect(page.getByText('이 Flow는 날짜 입력이 필요 없는 체크리스트입니다.')).toBeVisible();
  await expect(page.getByText('아래 항목을 하나씩 확인하고 완료한 것은 체크하세요.')).toBeVisible();
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('button', { name: '캘린더 받기' })).not.toBeVisible();
  await expect(workbench.getByRole('button', { name: '메모/노션에 복사' })).toBeVisible();
});

test('used-car checklist shows decision preview instead of calendar by default', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 기준');
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
});

test('used-car first screen keeps hold memo and checklist before comparison density', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 기준');
  await expect(workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
});

test('representative flows show artifact-first previews on the first screen', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-comparison-card')).toHaveCount(0);

  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-log-table-fitvely-nutrition-action-observation-log')).toBeVisible();
});

test('artifact workbench shows the primary usable surface first', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('내 실행판');
  await expect(workbench).toContainText('실행 리스트');
  await expect(workbench).toContainText('월간 캘린더');

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/home-workout-20min');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('반복 캘린더');
  await expect(workbench).toContainText('회차');

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('기록표');
  await expect(workbench).toContainText('적용 전후 관찰표');
  await expect(workbench).toContainText('영상에서 고른 기준');
  await expect(workbench).toContainText('적용 전 컨디션');
  await expect(workbench).toContainText('적용 후 반응');
  await expect(workbench).toContainText('유지/중단 결정');
});

test('common first screen keeps progress inside the artifact workbench', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByText('0/24 완료')).toBeVisible();
  await expect(page.getByText('항목을 체크하면 이 브라우저에 자동 저장됩니다.')).toHaveCount(0);

  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
});

test('artifact workbench exposes export actions next to the natural artifact', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  const movingListCard = workbench.getByTestId('artifact-list-card');
  const movingCalendarCard = workbench.getByTestId('artifact-calendar-card');
  await expect(workbench).toBeVisible();
  await expect(movingListCard.getByRole('button', { name: '메모/노션에 복사' })).toBeVisible();
  await expect(movingListCard.getByRole('button', { name: '엑셀로 받기' })).toBeVisible();
  await expect(movingListCard.getByRole('button', { name: '내 버전' })).toBeVisible();
  await expect(movingCalendarCard.getByRole('button', { name: '캘린더 받기' })).toBeVisible();
  await expect(workbench.getByText('실행판에서 체크한 내용을 내 도구로 옮깁니다.')).toHaveCount(0);

  await page.goto('/f/computer-skills-d30-study');
  workbench = page.getByLabel('Flow artifact workbench');
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByRole('button', { name: '엑셀로 받기' })).toBeVisible();
  await expect(studyCalendarCard.getByRole('button', { name: '캘린더 받기' })).toBeVisible();
});

test('moving desktop shows calendar artifact before execution list', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const workbench = page.getByLabel('Flow artifact workbench');
  const order = await workbench.locator('[data-testid="artifact-calendar-card"], [data-testid="artifact-list-card"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid')),
  );

  expect(order.slice(0, 2)).toEqual(['artifact-calendar-card', 'artifact-list-card']);
});

test('moving desktop keeps source context in a right rail beside the workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/moving-d30-basic');

  const layout = page.getByTestId('flow-desktop-workbench-layout');
  const rail = page.getByTestId('flow-desktop-rail');
  const workbench = page.getByLabel('Flow artifact workbench');

  await expect(layout).toBeVisible();
  await expect(rail.getByTestId('flow-source-card')).toBeVisible();

  const railBox = await rail.boundingBox();
  const workbenchBox = await workbench.boundingBox();

  expect(railBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(railBox!.x).toBeGreaterThan(workbenchBox!.x + workbenchBox!.width);
});

test('dense desktop routes keep source context in a right rail beside the workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const slug of [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
    'used-car-buying-check',
    'baby-food-menu-recipe',
  ]) {
    await page.goto(`/f/${slug}`);

    const layout = page.getByTestId('flow-desktop-workbench-layout');
    const rail = page.getByTestId('flow-desktop-rail');
    const workbench = page.getByLabel('Flow artifact workbench');

    await expect(layout).toBeVisible();
    await expect(rail.getByTestId('flow-source-card')).toBeVisible();

    const railBox = await rail.boundingBox();
    const workbenchBox = await workbench.boundingBox();

    expect(railBox).not.toBeNull();
    expect(workbenchBox).not.toBeNull();
    expect(railBox!.x).toBeGreaterThan(workbenchBox!.x + workbenchBox!.width);
  }
});

test('public detail rebrand keeps a tool-first shell without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByTestId('flow-public-shell')).toBeVisible();
  await expect(page.getByTestId('flow-public-search')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();
  await expect(page.getByTestId('flow-desktop-workbench-layout')).toBeVisible();

  const shellBox = await page.getByTestId('flow-public-shell').boundingBox();
  const workbenchBox = await page.getByLabel('Flow artifact workbench').boundingBox();
  expect(shellBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(shellBox!.width).toBeGreaterThan(workbenchBox!.width * 0.9);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasHorizontalOverflow).toBe(false);
});

test('mobile export sheet remains available from the sticky fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/computer-skills-d30-study');

  await page.getByLabel('시험일').fill('2026-06-22');
  await page.getByLabel('실행판 체크: 필기와 실기 시험 범위 나누기').check();

  const workbench = page.getByLabel('Flow artifact workbench');
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByTestId('mobile-artifact-export-excel')).toBeVisible();
  await expect(studyCalendarCard.getByTestId('mobile-artifact-export-calendar')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const mobileBar = page.getByTestId('mobile-export-bar');
  await expect(mobileBar.getByRole('button', { name: '시트·캘린더로 받기' })).toBeVisible();

  await mobileBar.getByRole('button', { name: '시트·캘린더로 받기' }).click();
  const sheet = page.getByTestId('mobile-export-sheet');
  await expect(sheet.getByRole('heading', { name: '어디로 가져갈까요' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '엑셀로 받기' })).toBeEnabled();
  await expect(sheet.getByRole('button', { name: /캘린더에 추가/ })).toBeEnabled();
});

test('validation fix surfaces route-specific anchors, safety panels, and mobile destination CTA labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/computer-skills-d30-study');
  await expect(page.getByLabel('시험일')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('mobile-export-bar').getByRole('button', { name: '시트·캘린더로 받기' })).toBeVisible();

  await page.goto('/f/diet-habit-2week');
  await expect(page.locator('input[type="date"]').first()).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox', { name: /중단|상담/ })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('mobile-export-bar')).toBeVisible();

  await page.goto('/f/new-car-delivery-check');
  await expect(page.getByTestId('flow-hold-section')).toContainText('인수 보류 기준');
  await expect(page.getByTestId('flow-hold-section')).toContainText('사진 파일명');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('mobile-export-bar').getByRole('button', { name: '증거표 .xlsx 받기' })).toBeVisible();
});

test('vehicle hold memo entries update the mobile export CTA', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  const newCarHold = page.getByTestId('flow-hold-section');
  await expect(newCarHold).toBeVisible();
  await newCarHold.getByTestId('flow-hold-field-new-car-delivery-check-hold-reason').fill('paint scratch needs dealer confirmation');
  await newCarHold.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files').fill('door-scratch-4821.jpg');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('mobile-export-bar').getByRole('button', { name: '보류 2건 포함 .xlsx' })).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  const usedCarHold = page.getByTestId('flow-hold-section');
  await expect(usedCarHold).toContainText('구매 보류 기준');
  await usedCarHold.getByTestId('flow-hold-field-used-car-buying-check-hold-reason').fill('insurance history conflicts with seller explanation');
  await usedCarHold.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files').fill('usedcar_20260526_engine_noise.mp4');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('mobile-export-bar').getByRole('button', { name: '보류 2건 포함 .xlsx' })).toBeVisible();
});

test('mobile workbench exposes destination CTAs on the first artifact cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  let listCard = workbench.getByTestId('artifact-list-card');
  let calendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(listCard.getByTestId('mobile-artifact-export-excel')).toBeVisible();
  await expect(listCard.getByTestId('mobile-artifact-export-excel')).toHaveAttribute('aria-label', /시트로 받기: .*실행 리스트/);
  await expect(calendarCard.getByTestId('mobile-artifact-export-calendar')).toBeVisible();
  await expect(calendarCard.getByTestId('mobile-artifact-export-calendar')).toHaveAttribute('aria-label', /캘린더로 받기: .*월간 캘린더/);

  await page.goto('/f/computer-skills-d30-study');
  workbench = page.getByLabel('Flow artifact workbench');
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByTestId('mobile-artifact-export-excel')).toBeVisible();
  await expect(studyListCard.getByTestId('mobile-artifact-export-excel')).toHaveAttribute('aria-label', /시트로 받기: .*실행 리스트/);
  await expect(studyCalendarCard.getByTestId('mobile-artifact-export-calendar')).toBeVisible();
  await expect(studyCalendarCard.getByTestId('mobile-artifact-export-calendar')).toHaveAttribute('aria-label', /캘린더로 받기: .*월간 캘린더/);

  await page.goto('/f/diet-habit-2week');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/new-car-delivery-check');
  workbench = page.getByLabel('Flow artifact workbench');
  const newCarListCard = workbench.getByTestId('artifact-list-card');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(newCarListCard).toBeVisible();
});

test('mobile log artifacts show a summary card before dense tables', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/diet-habit-2week');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
});

test('mobile study route starts with checklist and calendar instead of progress tables', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/computer-skills-d30-study');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();

  const order = await workbench.locator('[data-testid="artifact-list-card"], [data-testid="artifact-calendar-card"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.testid ?? node.tagName.toLowerCase()),
  );

  expect(order.slice(0, 2)).toEqual(['artifact-calendar-card', 'artifact-list-card']);
});

test('mobile vehicle checklist routes omit comparison summary grids', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
});

test('study progress table is absent from the experiment checklist route', async ({ page }) => {
  await page.goto('/f/computer-skills-d30-study');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-log-table-study-mock-scores')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
});

test('mobile sensitive routes collapse secondary execution sections below the first artifact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  let collapsedSections = page.getByTestId('mobile-collapsed-section');
  await expect(collapsedSections).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  collapsedSections = page.getByTestId('mobile-collapsed-section');
  await expect(collapsedSections).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('flow-hold-section')).toBeVisible();

  await page.goto('/f/baby-food-menu-recipe');
  collapsedSections = page.getByTestId('mobile-collapsed-section');
  await expect(collapsedSections).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('meal-reaction-workbench')).toBeVisible();
});

test('artifact workbench saves local execution entries', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-07-15');
  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByText('0/24 완료')).toBeVisible();
  await workbench.getByLabel('실행판 체크: 이사 방식 정하기').click();
  await expect(workbench.getByLabel('실행판 체크: 이사 방식 정하기')).toBeChecked();
  await expect(workbench.getByText('1/24 완료')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('이사일')).toHaveValue('2026-07-15');
  await expect(page.getByLabel('Flow artifact workbench').getByLabel('실행판 체크: 이사 방식 정하기')).toBeChecked();
  await expect(page.getByLabel('Flow artifact workbench').getByText('1/24 완료')).toBeVisible();
  const reloadedMovingWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(reloadedMovingWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(reloadedMovingWorkbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.reload();
  const restoredMovingWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredMovingWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(restoredMovingWorkbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/overseas-travel-d14');
  await page.getByLabel('출국일').fill('2026-07-18');
  const travelWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(travelWorkbench.getByRole('heading', { name: '공식 확인·비상 카드' })).toBeVisible();
  await expect(travelWorkbench.getByRole('heading', { name: '이사 업체 후보 비교' })).toHaveCount(0);
  await travelWorkbench.getByLabel('방문 국가/도시').fill('일본 도쿄');
  await travelWorkbench.getByLabel('입국 조건 확인 결과').fill('무비자 90일, 여권 6개월 이상 확인');
  await travelWorkbench.getByLabel('영사콜센터·현지 공관').fill('영사콜센터 +82-2-3210-0404 / 주일본대사관');

  await page.reload();
  const restoredTravelWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredTravelWorkbench.getByLabel('방문 국가/도시')).toHaveValue('일본 도쿄');
  await expect(restoredTravelWorkbench.getByLabel('입국 조건 확인 결과')).toHaveValue('무비자 90일, 여권 6개월 이상 확인');
  await expect(restoredTravelWorkbench.getByLabel('영사콜센터·현지 공관')).toHaveValue('영사콜센터 +82-2-3210-0404 / 주일본대사관');

  await page.goto('/f/real-sinagong-computer-d30-study');
  await page.getByRole('textbox', { name: '시험일' }).fill('2026-07-05');
  const studyWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(studyWorkbench.getByRole('heading', { name: '챕터 진도표' })).toBeVisible();
  await expect(studyWorkbench.getByRole('heading', { name: '기출 점수·오답 기록' })).toBeVisible();
  await studyWorkbench.getByLabel('1주차 개념 1회독 / 범위').fill('1~3장');
  await studyWorkbench.getByLabel('1주차 개념 1회독 / 목표일').fill('2026-06-12');
  await studyWorkbench.getByLabel('기출 1회차 / 점수').fill('78점');
  await studyWorkbench.getByLabel('기출 1회차 / 오답').fill('계산 문제 4개');

  await page.reload();
  const restoredStudyWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredStudyWorkbench.getByLabel('1주차 개념 1회독 / 범위')).toHaveValue('1~3장');
  await expect(restoredStudyWorkbench.getByLabel('1주차 개념 1회독 / 목표일')).toHaveValue('2026-06-12');
  await expect(restoredStudyWorkbench.getByLabel('기출 1회차 / 점수')).toHaveValue('78점');
  await expect(restoredStudyWorkbench.getByLabel('기출 1회차 / 오답')).toHaveValue('계산 문제 4개');

  await page.goto('/f/study-exam-d30-plan');
  const routineWorkbench = page.getByLabel('Flow artifact workbench');
  await routineWorkbench.getByLabel('회차 완료: 1회차').check();
  await routineWorkbench.getByLabel('회차 메모: 1회차').fill('오답노트 20분 추가');
  await routineWorkbench.getByLabel('회차 완료: 2회차').check();
  await routineWorkbench.getByLabel('회차 메모: 2회차').fill('듣기 20분, 단어 30개');
  await expect(routineWorkbench.getByLabel('회차 완료: 2회차')).toBeChecked();

  await page.reload();
  const reloadedRoutineWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(reloadedRoutineWorkbench.getByLabel('회차 완료: 1회차')).toBeChecked();
  await expect(reloadedRoutineWorkbench.getByLabel('회차 메모: 1회차')).toHaveValue('오답노트 20분 추가');
  await expect(reloadedRoutineWorkbench.getByLabel('회차 완료: 2회차')).toBeChecked();
  await expect(reloadedRoutineWorkbench.getByLabel('회차 메모: 2회차')).toHaveValue('듣기 20분, 단어 30개');

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  const logWorkbench = page.getByLabel('Flow artifact workbench');
  await logWorkbench.getByLabel('적용 전 기록 / 적용할 식사·운동 전후 행동').fill('다음 점심 한 끼');
  await logWorkbench.getByLabel('적용 전 기록 / 영상에서 고른 기준').fill('원본 영상에서 고른 기준 1개');
  await logWorkbench.getByLabel('적용 후 기록 / 유지/중단 결정').fill('한 번 더 적용');
  await logWorkbench.getByLabel('주간 조정 메모').fill('다음 주에도 같은 기준을 유지할지 확인');

  await page.reload();
  const reloadedLogWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(reloadedLogWorkbench.getByLabel('적용 전 기록 / 적용할 식사·운동 전후 행동')).toHaveValue('다음 점심 한 끼');
  await expect(reloadedLogWorkbench.getByLabel('적용 전 기록 / 영상에서 고른 기준')).toHaveValue('원본 영상에서 고른 기준 1개');
  await expect(reloadedLogWorkbench.getByLabel('적용 후 기록 / 유지/중단 결정')).toHaveValue('한 번 더 적용');
  await expect(reloadedLogWorkbench.getByLabel('주간 조정 메모')).toHaveValue('다음 주에도 같은 기준을 유지할지 확인');
});

test('vehicle hold memo edits and persists user notes', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason').fill('insurance history conflict');
  await workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files').fill('usedcar_20260526_engine_noise.mp4');

  await page.reload();

  const restoredWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredWorkbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toHaveValue('insurance history conflict');
  await expect(restoredWorkbench.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files')).toHaveValue('usedcar_20260526_engine_noise.mp4');
});

test('public flow can be copied into an editable draft', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByRole('region', { name: 'Flow artifact workbench' }).getByRole('button', { name: '내 버전' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
  await expect(page.getByText('초안 Flow')).toBeVisible();
});

test('flow lab shows converted pilot and scale validation boards', async ({ page }) => {
  await page.goto('/flow-lab');

  await expect(page.getByRole('heading', { name: '실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증' })).toBeVisible();
  await expect(page.getByText('3 x 4 파일럿 검증')).toBeVisible();
  const inventory = page.locator('section').filter({ hasText: '전체 콘텐츠 인벤토리' });
  await expect(inventory).toBeVisible();
  await expect(inventory.getByText('실제 원본', { exact: true })).toBeVisible();
  await expect(inventory.getByText('40', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('샘플 후보', { exact: true })).toBeVisible();
  await expect(inventory.getByText('440', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('수동 검토', { exact: true })).toBeVisible();
  await expect(inventory.getByText('71', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('검토 대기', { exact: true })).toBeVisible();
  await expect(inventory.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('legacy 접근', { exact: true })).toBeVisible();
  await expect(inventory.getByText('0', { exact: true }).first()).toBeVisible();
  const lifecycle = page.locator('section').filter({ hasText: '전체 Flow 운영 분류' });
  await expect(lifecycle).toBeVisible();
  await expect(lifecycle.getByText('대표 유지', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('보강 필요', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('미리보기 전용', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('삭제 후보', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('실제 원본 Flow의')).toBeVisible();
  const broadSourceGuard = page.locator('section').filter({ hasText: 'Broad Source Guard' });
  await expect(broadSourceGuard).toBeVisible();
  await expect(broadSourceGuard.getByText('Broad real sources', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Representative leaks', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Exact source replacement queue', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Hidden broad-source decisions', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(broadSourceGuard.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(broadSourceGuard.getByText('none', { exact: true }).first()).toBeVisible();
  await expect(broadSourceGuard.getByText('real-fitvely-weekly-body-check')).toBeVisible();
  await expect(broadSourceGuard.getByText('real-pet-health-visit-routine')).toHaveCount(0);
  await expect(broadSourceGuard.getByText('real-mofa-overseas-travel-prep')).toHaveCount(0);
  const readiness = page.locator('section').filter({ hasText: '대표 승격 1차 심사' });
  await expect(readiness).toBeVisible();
  await expect(readiness.getByText('대표 후보', { exact: true }).first()).toBeVisible();
  await expect(readiness.getByText('Public MVP 후보', { exact: true }).first()).toBeVisible();
  await expect(readiness.getByRole('link', { name: '컴퓨터활용능력 D-30 학습 Flow' })).toBeVisible();
  await expect(readiness.getByRole('link', { name: '신차 인수 점검 Flow' })).toBeVisible();
  await expect(readiness.getByText('diet-habit-2week')).toBeVisible();
  const representativeUxReview = page.locator('section').filter({ hasText: 'Representative UX Content Review' });
  await expect(representativeUxReview).toBeVisible();
  await expect(representativeUxReview.getByText('ready_for_observed_session').first()).toBeVisible();
  await expect(representativeUxReview.getByText('needs_guardrail_rewrite').first()).toBeVisible();
  await expect(representativeUxReview.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(representativeUxReview.getByText('diet-habit-2week')).toBeVisible();
  await expect(representativeUxReview.getByText('new-car-delivery-check')).toBeVisible();
  const mobileSimulationProtocol = page.locator('section').filter({ hasText: 'Mobile Simulation Protocol' });
  await expect(mobileSimulationProtocol).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('No validated routes')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('avg score 77')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('diet-habit-2week')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('new-car-delivery-check')).toBeVisible();
  const observedSessionPrep = page.getByTestId('observed-session-prep-panel');
  await expect(observedSessionPrep).toBeVisible();
  await expect(observedSessionPrep.getByText('Observed-session prep package', { exact: true })).toBeVisible();
  await expect(observedSessionPrep.getByText('3 routes')).toBeVisible();
  await expect(observedSessionPrep.getByText('0 validated')).toBeVisible();
  await expect(observedSessionPrep.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(observedSessionPrep.getByText('diet-habit-2week')).toBeVisible();
  await expect(observedSessionPrep.getByText('new-car-delivery-check')).toBeVisible();
  await expect(observedSessionPrep.getByText('screenshot targets', { exact: true })).toBeVisible();
  const observedSessionEvidence = page.getByTestId('observed-session-evidence-panel');
  await expect(observedSessionEvidence).toBeVisible();
  await expect(observedSessionEvidence.getByText('Observed-session evidence log', { exact: true })).toBeVisible();
  await expect(observedSessionEvidence.getByText('1 session note')).toBeVisible();
  await expect(observedSessionEvidence.getByText('2 not run')).toBeVisible();
  await expect(observedSessionEvidence.getByText('0 candidate signals')).toBeVisible();
  await expect(observedSessionEvidence.getByText('0 validated', { exact: true })).toHaveCount(0);
  await expect(observedSessionEvidence.locator('span').filter({ hasText: 'no signal' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'computer-skills-d30-study' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'diet-habit-2week' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'new-car-delivery-check' })).toBeVisible();
  const sessionIntake = page.getByTestId('observed-session-note-intake');
  await expect(sessionIntake).toBeVisible();
  await expect(sessionIntake.getByRole('combobox', { name: 'Route' })).toBeVisible();
  await expect(sessionIntake.getByRole('combobox', { name: 'Decision' })).not.toContainText('validated');
  await sessionIntake.getByRole('combobox', { name: 'Route' }).selectOption('diet-habit-2week');
  await sessionIntake.getByRole('spinbutton', { name: 'Session number' }).fill('1');
  await sessionIntake.getByRole('combobox', { name: 'Decision' }).selectOption('friction');
  await sessionIntake.getByLabel('Artifact-near CTA').fill('missed first, found after prompt');
  await sessionIntake.getByLabel('Sticky fallback').fill('used fallback sheet');
  await sessionIntake.getByLabel('Export/copy').fill('copied observation sheet');
  await sessionIntake.getByRole('textbox', { name: 'Friction' }).fill('Stop condition was noticed after table editing.');
  await sessionIntake.getByRole('textbox', { name: 'Follow-up' }).fill('Move stop cue closer to the first row.');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('# Observed Session Note: diet-habit-2week');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('Decision: `friction`');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('Artifact-near CTA: missed first, found after prompt');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('This note is not validation.');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('# Observed Session Run Sheet: diet-habit-2week');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('Moderator prompt');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('Decision options: `no signal`, `friction`, `candidate signal`');
  const noteDownloadPromise = page.waitForEvent('download');
  await sessionIntake.getByRole('button', { name: 'Download note' }).click();
  const noteDownload = await noteDownloadPromise;
  expect(noteDownload.suggestedFilename()).toMatch(/diet-habit-2week-session-01\.md$/);
  const runSheetDownloadPromise = page.waitForEvent('download');
  await sessionIntake.getByRole('button', { name: 'Download run sheet' }).click();
  const runSheetDownload = await runSheetDownloadPromise;
  expect(runSheetDownload.suggestedFilename()).toBe('diet-habit-2week-observed-session-run-sheet.md');
  const uxCleanupBacklog = page.locator('section').filter({ hasText: 'UX Cleanup Backlog' });
  await expect(uxCleanupBacklog).toBeVisible();
  await expect(uxCleanupBacklog.getByText('36 routes')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('0 validated')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('exact_workout_video_execution_detail')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('health_observation_guardrail')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('vehicle_purchase_evidence_first')).toBeVisible();
  const designRefGapQueue = page.getByTestId('design-ref-gap-queue-panel');
  await expect(designRefGapQueue).toBeVisible();
  await expect(designRefGapQueue.getByText('Design-ref gap queue')).toBeVisible();
  await expect(designRefGapQueue.getByText('8 items')).toBeVisible();
  await expect(designRefGapQueue.getByText('8 landed')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 pending')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 P1 pending')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 validated')).toBeVisible();
  await expect(designRefGapQueue.getByText('mobile-study-log-summary')).toBeVisible();
  await expect(designRefGapQueue.getByText('observed-session-prep')).toBeVisible();
  const exportFirstSimulation = page.locator('section').filter({ hasText: 'Export-first Simulation' });
  await expect(exportFirstSimulation).toBeVisible();
  await expect(exportFirstSimulation.getByText('Final QA candidate', { exact: true }).first()).toBeVisible();
  await expect(exportFirstSimulation.getByText('Public MVP after UX fix', { exact: true }).first()).toBeVisible();
  await expect(exportFirstSimulation.getByText('calendar + sheet')).toBeVisible();
  await expect(exportFirstSimulation.getByText('sheet + memo')).toBeVisible();
  await expect(exportFirstSimulation.getByText('mockScore=68')).toBeVisible();
  await expect(exportFirstSimulation.getByText('dealerConfirmed=hold delivery until written confirmation')).toBeVisible();
  await expect(exportFirstSimulation.getByText('stopCondition=consult professional if dizziness repeats')).toBeVisible();
  const needsReviewPriority = page.locator('section').filter({ hasText: '검토 대기 우선순위' });
  await expect(needsReviewPriority).toBeVisible();
  await expect(needsReviewPriority.getByText('바로 audit', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('원본 교체', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('리스크 검토', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('0개')).toBeVisible();
  const sourceFitAudit = page.locator('section').filter({ hasText: '원본 콘텐츠가 FLOW화될 가치가 있는지 점검' });
  await expect(sourceFitAudit).toBeVisible();
  await expect(sourceFitAudit.getByText('수동 Source-Fit Audit')).toBeVisible();
  const artifactAudit = page.locator('section').filter({ hasText: 'Natural Artifact Audit' });
  await expect(artifactAudit).toBeVisible();
  await expect(artifactAudit.getByText('사용자가 실제로 만들 산출물 기준 검토')).toBeVisible();
  await expect(artifactAudit.getByText('exact source')).toBeVisible();
  await expect(artifactAudit.getByText('catalog review')).toBeVisible();
  await expect(artifactAudit.getByText('감사 완료')).toBeVisible();
  await expect(artifactAudit.getByText('40', { exact: true }).first()).toBeVisible();
  await expect(sourceFitAudit.getByText('감사 완료')).toBeVisible();
  await expect(sourceFitAudit.getByText('카탈로그 미리보기 4')).toBeVisible();
  await expect(page.getByRole('link', { name: '시험 D-30 공부 계획 Flow', exact: true })).toBeVisible();
  await expect(page.getByText('B 파일럿 실제 Flow 변환')).toBeVisible();
  await expect(page.getByText('200+ 제작자 채널 Flow 검증')).toBeVisible();
  await expect(page.getByText('10 converted')).toBeVisible();
  const convertedPilot = page.locator('section').filter({ hasText: 'B 파일럿 실제 Flow 변환' });
  await expect(convertedPilot.getByRole('link', { name: /삼성전자서비스 에어컨/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /자동차검사 준비/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /Q-Net 원서접수/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /다이어트 식단·운동 기록/ })).toBeVisible();
});

test('representative real content pilot flows are executable', async ({ page }) => {
  await page.goto('/f/samsung-aircon-seasonal-check');
  await expect(page.getByRole('heading', { name: '삼성 에어컨 계절 전 점검 Flow' })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByText('삼성전자서비스 Samsung Care+ 에어컨 관리 안내').first()).toBeVisible();
  await expect(page.getByRole('link', { name: '원문 보기' }).first()).toHaveAttribute(
    'href',
    'https://www.samsungsvc.co.kr/info/carePlus',
  );
  await page.getByLabel('시작일').fill('2026-06-01');
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toHaveCount(0);
  await expect(page.getByText('2026-06-01').first()).toBeVisible();
  await page.getByLabel('완료: 전원 연결과 리모컨 배터리 확인하기').check();
  await expect(page.getByText('1 / 8').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toBeVisible();

  await page.goto('/f/qnet-exam-application-prep');
  await expect(page.getByRole('heading', { name: 'Q-Net 원서접수 준비 Flow' })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByText('Q-Net 원서접수 안내').first()).toBeVisible();
  await expect(page.getByRole('link', { name: '원문 보기' }).first()).toHaveAttribute(
    'href',
    'https://q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103&rcvPFlag=Y',
  );
  await expect(page.getByText('입력할 날짜: 시험일')).toBeVisible();
  await page.getByLabel('시험일').fill('2026-07-15');
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
});

test('reshaped official route workbenches expose natural artifact fields', async ({ page }) => {
  await page.goto('/f/family-certificate-issue');
  await expect(page.getByRole('heading', { name: '가족관계증명서 발급 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '메모 카드' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '제출처 요구사항' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '주민등록번호 공개 범위' })).toBeVisible();

  await page.goto('/f/passport-renewal-docs');
  await expect(page.getByRole('heading', { name: '여권 재발급 준비 Flow' })).toBeVisible();
  const passportWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(passportWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(passportWorkbench.getByRole('heading', { name: '메모 카드' })).toHaveCount(0);
  await expect(passportWorkbench.getByRole('textbox', { name: '여행일·신청자·신청 경로' })).toHaveCount(0);

  await page.goto('/f/driver-license-renewal-check');
  await expect(page.getByRole('heading', { name: '운전면허 갱신 준비 Flow' })).toBeVisible();
  const driverWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(driverWorkbench.getByRole('heading', { name: '후보 비교표' }).first()).toBeVisible();
  await expect(driverWorkbench.getByText('면허/갱신 유형')).toBeVisible();

  await page.goto('/f/qnet-exam-application-prep');
  await expect(page.getByRole('heading', { name: 'Q-Net 원서접수 준비 Flow' })).toBeVisible();
  await page.getByLabel('시험일').fill('2026-07-15');
  await expect(page.getByText('접수·결제 마감 기록')).toBeVisible();
  await expect(page.getByLabel('원서접수 마감 / 마감/시점')).toBeVisible();
  await expect(page.getByLabel('시험장·입실 시간 / 상태/결정')).toBeVisible();
});

test('MOFA travel route opens with checklist and calendar instead of emergency memo card fields', async ({ page }) => {
  await page.goto('/f/real-mofa-overseas-travel-prep');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByRole('heading', { name: '메모 카드' })).toHaveCount(0);
  await expect(workbench.getByRole('textbox', { name: '방문 국가와 확인일' })).toHaveCount(0);
  await expect(workbench.getByRole('textbox', { name: '영사콜센터·현지 공관 연락처' })).toHaveCount(0);
  await expect(workbench.getByRole('textbox', { name: '가족 공유 메모' })).toHaveCount(0);
});

test('experiment feedback routes keep one artifact-first execution surface', async ({ page }) => {
  const routes = [
    'computer-skills-d30-study',
    'moving-d30-basic',
    'vehicle-inspection-prep',
    'real-mofa-overseas-travel-prep',
    'passport-renewal-docs',
    'new-car-delivery-check',
    'used-car-buying-check',
  ];

  for (const slug of routes) {
    await page.goto(`/f/${slug}`);
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
    await expect(workbench).toBeVisible();
    if (slug !== 'moving-d30-basic') {
      await expect(page.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: '전체 할 일' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
    await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
    await expect(workbench.getByText('자세히').first()).toBeVisible();
  }
});

test('routine feedback routes remove duplicate routine summaries and generic session records', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-home-workout-starter');
  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByText('홈트 캘린더')).toBeVisible();
  await expect(page.getByText('운동 캘린더 · primary')).toHaveCount(0);
  await expect(page.getByText('4주 12회차')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음 회차 기록' })).toHaveCount(0);
  await expect(page.getByTestId('flow-item-card')).toHaveCount(0);

  await page.goto('/f/real-fitvely-diet-record-routine');
  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByText('식단 체크 캘린더')).toBeVisible();
  await expect(workbench.getByText('아침 식단 확인').first()).toBeVisible();
  await expect(page.getByText('4주 12회차')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음 회차 기록' })).toHaveCount(0);
  await expect(page.getByTestId('flow-item-card')).toHaveCount(0);

  await page.goto('/f/diet-habit-2week');
  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByText('수면 체크 캘린더')).toBeVisible();
  await expect(page.getByRole('button', { name: '전체 루틴' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
});

test('baby food feedback route keeps menu calendar and recipe details in the workbench only', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByText('식단표 + 레시피')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByText('레시피 보기').first()).toBeVisible();
  await expect(page.getByText('반응 기록')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 할 일' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
});
