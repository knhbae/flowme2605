import { expect, test } from '@playwright/test';

test('home presents FLOW as an executable content platform', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: '둘러보기', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '채널' })).toHaveAttribute('href', '/creators');
  await expect(page.getByRole('link', { name: '내 Flow', exact: true })).toBeVisible();
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
  await expect(page.getByText('결혼 준비 D-300 타임라인 Flow').first()).toBeVisible();
  await expect(page.getByText('직장인 영어공부 30일 루틴 Flow').first()).toBeVisible();
  await expect(page.getByText('미리보기').first()).toBeVisible();
  await expect(page.getByText('출력:').first()).toBeVisible();
  const sourceFlowSection = page.getByTestId('home-recent-source-flow-section');
  await expect(sourceFlowSection).toBeVisible();
  await expect(sourceFlowSection.getByTestId('home-recent-source-flow-card')).toHaveCount(2);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/moving-d30"]')).toBeVisible();
  await expect(sourceFlowSection.locator('a[href="/flow-maps/middle-school-math-1"]')).toBeVisible();
  await expect(sourceFlowSection.locator('a[href="/flow-maps/baby-health-schedule"]')).toHaveCount(0);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/postal-address-transfer"]')).toHaveCount(0);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/smishing-response"]')).toHaveCount(0);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/year-end-tax-submit"]')).toHaveCount(0);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/aircon-filter-cleaning"]')).toHaveCount(0);
  await expect(sourceFlowSection.locator('a[href="/flow-maps/picnic-food-safety"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '내 Flow 열기', exact: true })).toHaveAttribute('href', '/my');
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
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toBeVisible();

  await page.getByLabel('카테고리').selectOption('결혼/준비');
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toBeVisible();
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
  await expect(page.locator('.fc-event').first()).toBeVisible();
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
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
  await expect(page.getByText('아직 만든 내 버전이 없습니다')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '스튜디오' })).toHaveAttribute('href', '/u/my-flow-studio');
  await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();
  await expect(page.getByTestId('my-flow-empty-state').getByRole('link', { name: 'Flow 둘러보기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByTestId('my-flow-single-summary')).toContainText('이사 D-30 준비 Flow');
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('0/24');
  await expect(page.locator('a[href="/f/moving-d30-basic"]').first()).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('실행판 체크: 이사 방식 정하기').check();

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('1/24');
  await expect(page.locator('a[href="/f/moving-d30-basic"]').first()).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  await page.getByRole('region', { name: 'Flow artifact workbench' }).getByRole('button', { name: '내 버전' }).click();
  await expect(page).toHaveURL(/\/flows\/.+\/edit/);

  await page.goto('/my');
  await expect(page.getByText('발행 Flow')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /초안/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toHaveCount(0);
  await page.getByRole('link', { name: '스튜디오' }).click();
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toBeVisible();
  await expect(page.getByText('공개 Flow', { exact: true })).toBeVisible();
  await expect(page.getByText('초안').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
});

test('creator profile aggregates creator flows from byline links', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await page.getByRole('link', { name: 'by 웨딩 체크메이트' }).click();

  await expect(page).toHaveURL(/\/u\//);
  await expect(page.getByRole('heading', { name: '웨딩 체크메이트' })).toBeVisible();
  await expect(page.getByText('총 실행')).toBeVisible();
  await expect(page.getByText('D-Day 준비', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toBeVisible();
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
  await expect(exactTool.getByRole('heading', { name: '운동 캘린더', exact: true })).toBeVisible();
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
  await expect(page.getByTestId('my-flow-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-single-summary')).toContainText('이사 D-30 준비 Flow');
  await expect(page.getByTestId('my-flow-single-summary')).toContainText('0/24 완료');
});

test('my flow management tabs expose calendar checklist and routine views', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-06-26');
  await page.getByTestId('moving-save-actions').getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '저장한 Flow' })).toBeVisible();

  await page.getByTestId('my-flow-view-calendar').click();
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toBeVisible();

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '완료 체크' }).first().click();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('1/24');
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
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="home-workout-20min"]')).toBeVisible();

  await page.getByTestId('my-flow-scope-select').selectOption('home-workout-20min');
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'home-workout-20min');
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('0/18');

  await page.getByTestId('my-flow-view-calendar').click();
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
});

test('my flow ux12 demo renders grouped fixture flows without saving them', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX12');
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
  await expect(page.getByText('아직 만든 내 버전이 없습니다')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-today')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-today-summary')).toContainText('데모 오늘');
  await expect(page.getByTestId('my-flow-today-summary')).toContainText('2026-05-28 실행할 일');
  await expect(page.getByTestId('my-flow-today-summary')).toContainText('실제 오늘과 다른 고정 기준일');
  await expect(page.getByTestId('my-flow-today-summary')).toContainText('오늘 남은 일은 없고, 밀린 항목 2개가 있습니다.');
  await expect(page.getByTestId('my-flow-today-list')).toHaveCount(0);
  const overdueSectionBox = await page.getByTestId('my-flow-overdue-list').boundingBox();
  const completedSectionBox = await page.getByTestId('my-flow-today-completed-list').boundingBox();
  expect(overdueSectionBox?.y ?? 0).toBeLessThan(completedSectionBox?.y ?? 0);
  await expect(page.getByTestId('my-flow-today-completed-list').locator('article')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-today-completed-toggle')).toContainText('오늘 완료 3개 보기');
  await page.getByTestId('my-flow-today-completed-toggle').click();
  await expect(page.getByTestId('my-flow-today-completed-list').locator('article')).toHaveCount(3);
  const firstCompletedTodayRow = page.getByTestId('my-flow-today-completed-list').locator('article').first();
  await expect(firstCompletedTodayRow.getByTestId('my-flow-row-timing-chip')).toBeVisible();
  await expect(firstCompletedTodayRow).not.toContainText('큰 일정 확정');
  await expect(firstCompletedTodayRow).not.toContainText('결혼 준비 Flow');
  await page.getByTestId('my-flow-view-flow').click();
  const statusBoard = page.getByTestId('my-flow-status-board');
  await expect(statusBoard).toBeVisible();
  await expect(statusBoard).toContainText('Flow 상태판');
  await expect(statusBoard).toContainText('진행 중');
  await expect(statusBoard).toContainText('평균 진행');
  await expect(statusBoard).toContainText('다음 실행');
  await expect(statusBoard).toContainText('밀림');
  await expect(page.getByTestId('my-flow-overview-summary')).not.toContainText('전체 Flow 운영');
  const prioritySection = page.getByTestId('my-flow-priority-section');
  await expect(prioritySection).toBeVisible();
  await expect(prioritySection).toContainText('지금 볼 Flow');
  await expect(prioritySection).toContainText('오늘 남음 0');
  await expect(prioritySection).not.toContainText('오늘 4');
  await expect(prioritySection).toContainText('밀림 2');
  await expect(prioritySection).toContainText('7일 안 3');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first()).toContainText('밀림 있음');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first()).toContainText('이사 준비 Flow');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByRole('button', { name: '캘린더에서 열기' })).toBeVisible();
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').nth(1)).toContainText('다음 7일');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').nth(1)).toContainText('컴퓨터활용능력 학습 Flow');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').nth(2)).toContainText('초기 이유식 메뉴·레시피 Flow');
  await prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByRole('button', { name: '캘린더에서 열기' }).click();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-05-27');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toContainText('필요 없는 물건 정리하기');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByRole('button', { name: '완료 체크' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-inventory-toggle')).toContainText('전체 Flow 보기');
  await page.getByTestId('my-flow-inventory-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(18);
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="new-apartment-precheck"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="japan-esim-setup-before-departure"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="dog-adoption-first-week"]')).toBeVisible();
  const firstOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).toContainText('일정');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).toContainText('메모');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('증빙');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('기록');
  await expect(firstOverviewCard.getByRole('button', { name: '캘린더에서 열기' })).toBeVisible();
  await firstOverviewCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toContainText('필요 없는 물건 정리하기');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-demo-group')).toHaveCount(5);
  const businessOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="business-registration-basic"]');
  await expect(businessOverviewCard).not.toContainText('날짜 입력 없음 2026-06-03');
  await expect(businessOverviewCard).toContainText('데모 기준일 2026-06-03');
  await expect(businessOverviewCard.getByRole('button', { name: '메모에서 열기' })).toBeVisible();
  const taxOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="year-end-tax-docs"]');
  await expect(taxOverviewCard.getByRole('button', { name: '시트에서 열기' })).toBeVisible();
  const usedCarOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
  await expect(usedCarOverviewCard).toContainText('기준일 필요');
  await expect(usedCarOverviewCard.getByTestId('my-flow-type-counts')).toContainText('결정');
  await expect(usedCarOverviewCard.getByTestId('my-flow-type-counts')).toContainText('메모');
  await expect(usedCarOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('증빙');
  await expect(usedCarOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('기록');
  await expect(usedCarOverviewCard.getByRole('button', { name: '체크리스트에서 열기' })).toBeVisible();

  await expect(page.getByTestId('my-flow-view-checklist')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-routine')).toBeVisible();
  await usedCarOverviewCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-checklist-view')).toContainText('중고차 구매 현장 점검 Flow');
  const usedCarDecisionRow = page.getByTestId('my-flow-checklist-detail-section').locator('article[data-item-type="decision_hold"]').first();
  await expect(usedCarDecisionRow).toBeVisible();
  await usedCarDecisionRow.getByRole('button').first().click();
  const usedCarDecisionDetail = page.getByTestId('my-flow-checklist-detail-section').getByTestId('my-flow-item-detail');
  await expect(usedCarDecisionDetail).toHaveAttribute('data-item-type', 'decision_hold');
  await expect(usedCarDecisionDetail.getByTestId('my-flow-detail-type-summary')).toContainText('결정');
  await expect(usedCarDecisionDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('구매, 보류, 거절');
  await expect(usedCarDecisionDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('완료만 누르기보다');
  const decisionTypeSummaryBox = await usedCarDecisionDetail.getByTestId('my-flow-detail-type-summary').boundingBox();
  expect(decisionTypeSummaryBox?.height ?? 999).toBeLessThanOrEqual(32);
  await expect(usedCarDecisionDetail.getByTestId('my-flow-decision-fields')).toBeVisible();
  await expect(usedCarDecisionDetail.getByTestId('my-flow-decision-status')).toHaveValue('undecided');
  await expect(usedCarDecisionDetail.getByTestId('my-flow-decision-status')).toContainText('보류');
  await usedCarDecisionDetail.getByTestId('my-flow-decision-status').selectOption('hold');
  await usedCarDecisionDetail.getByTestId('my-flow-decision-next-review').fill('2026-06-15');
  await expect(usedCarDecisionDetail.getByRole('button', { name: '변경 저장' })).toBeVisible();
  await usedCarDecisionDetail.getByRole('button', { name: '변경 저장' }).click();
  await usedCarDecisionRow.getByRole('button').first().click();
  const savedUsedCarDecisionDetail = page.getByTestId('my-flow-checklist-detail-section').getByTestId('my-flow-item-detail');
  await expect(savedUsedCarDecisionDetail.getByTestId('my-flow-decision-status')).toHaveValue('hold');
  await expect(savedUsedCarDecisionDetail.getByTestId('my-flow-decision-next-review')).toHaveValue('2026-06-15');
  const usedCarEvidenceRow = page.getByTestId('my-flow-checklist-detail-section').locator('article[data-item-type="memo_evidence"]').first();
  await expect(usedCarEvidenceRow).toBeVisible();
  await usedCarEvidenceRow.getByRole('button').first().click();
  const usedCarEvidenceDetail = page.getByTestId('my-flow-checklist-detail-section').getByTestId('my-flow-item-detail');
  await expect(usedCarEvidenceDetail).toHaveAttribute('data-item-type', 'memo_evidence');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).toContainText('메모');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('증빙');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('사진');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('접수번호');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('메모에 남깁니다');
  await expect(usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('파일과 링크');
  const memoTypeSummaryBox = await usedCarEvidenceDetail.getByTestId('my-flow-detail-type-summary').boundingBox();
  expect(memoTypeSummaryBox?.height ?? 999).toBeLessThanOrEqual(32);
  await expect(usedCarEvidenceDetail.locator('[data-testid^="my-flow-proof"]')).toHaveCount(0);
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-scope-select').selectOption('all');
  await page.getByTestId('my-flow-view-checklist').click();
  await expect(page.getByTestId('my-flow-checklist-picker')).toContainText('체크할 Flow를 먼저 선택하세요');
  await expect(page.getByTestId('my-flow-checklist-summary-card')).toHaveCount(18);
  await expect(page.getByTestId('my-flow-checklist-detail-section')).toHaveCount(0);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')));
  expect(savedKeys).toHaveLength(0);

  await page.getByTestId('my-flow-view-calendar').click();
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByText('루틴은 아이콘으로 표시합니다')).toBeVisible();
  await expect(page.getByTestId('my-flow-routine-legend')).toContainText('운동');
  await expect(page.getByTestId('my-flow-routine-legend')).toContainText('러닝');
  await expect(page.getByTestId('my-flow-routine-legend')).toContainText('공부');
  await expect(page.getByTestId('my-flow-routine-legend')).toContainText('식단');
  await expect(page.getByTestId('my-flow-calendar-scope-filter')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-scope-all')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('my-flow-calendar-scope-routine').click();
  await expect(page.getByTestId('my-flow-calendar-scope-routine')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('루틴 · 0개 일정');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="scheduled_task"]')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-scope-schedule').click();
  await expect(page.getByTestId('my-flow-calendar-scope-schedule')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('일정 ·');
  await expect(page.locator('[data-testid="my-flow-routine-icon"]')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-scope-all').click();
  await expect(page.getByTestId('my-flow-calendar-scope-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  await page.getByTestId('my-flow-month-picker').fill('2026-12');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-12');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-12-31"]')).toBeVisible();
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.locator('.fc')).toBeVisible();
  await page.getByRole('button', { name: '다음 달' }).click();
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-06');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-01');
  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-05-27');
  await expect(page.locator('.fc-event').first()).toBeVisible();
  const clickedDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-29"]');
  await clickedDateCell.getByTestId('my-flow-calendar-date-button').click();
  await expect(clickedDateCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(clickedDateCell.getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-05-27"]').getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
  const firstEventCell = page.locator('.fc-daygrid-day:has(.fc-event)').first();
  const firstCalendarEvent = firstEventCell.locator('.fc-event').first();
  await firstCalendarEvent.click();
  await expect(firstEventCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(firstCalendarEvent).toHaveClass(/my-flow-calendar-active-event/);
  await expect(page.locator('.fc-event .line-through').first()).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-routine-dots"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
  const firstRoutineIcon = page.locator('[data-testid="my-flow-routine-icon"]').first();
  await expect(firstRoutineIcon).toHaveAttribute('data-routine-icon-kind', 'workout');
  await expect(firstRoutineIcon.locator('svg')).toBeVisible();
  await expect(firstRoutineIcon).toHaveText('');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"][data-routine-icon-kind="maintenance"] svg').first()).toBeVisible();
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+3');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-02"] [data-testid="my-flow-routine-icon"][data-routine-icon-kind="study"] svg')).toBeVisible();
  await expect(page.locator('.fc-event[aria-label*="상세 열기"]').first()).toBeVisible();
  const accessibleCalendarEvent = page.locator('.fc-event[aria-label*="상세 열기"]').first();
  await expect(accessibleCalendarEvent).toBeVisible();
  await accessibleCalendarEvent.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toBeVisible();
  await page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+3');
  await page.locator('.fc-daygrid-day[data-date="2026-05-28"]').click();
  const selectedCalendarRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="scheduled_task"]').first();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('컴퓨터활용능력 학습 Flow');
  await expect(selectedCalendarRow).not.toContainText('컴퓨터활용능력 학습 Flow');
  await expect(selectedCalendarRow.getByTestId('my-flow-row-timing-chip')).toContainText('기준 D-30');
  await expect(selectedCalendarRow.getByTestId('my-flow-row-timing-chip')).toHaveAttribute('aria-label', 'Flow 기준 D-30');
  await expect(selectedCalendarRow.getByTestId('my-flow-row-section-label')).toContainText('범위 쪼개기');
  await expect(selectedCalendarRow.getByRole('button', { name: '완료 취소' })).toBeVisible();
  await selectedCalendarRow.getByRole('button').first().click();
  const selectedCalendarDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-timing-chip')).toContainText('기준 D-30');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-timing-chip')).toHaveAttribute('aria-label', 'Flow 기준 D-30');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-section-label')).toContainText('범위 쪼개기');
  await expect(selectedCalendarDetail.getByText('상세', { exact: true })).toHaveCount(0);
  await expect(selectedCalendarDetail).toContainText('컴퓨터활용능력 학습 Flow');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-advanced-content')).toHaveCount(0);
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-source-link')).toBeVisible();
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-source-link')).toHaveAttribute('href', /^https:\/\//);
  await expect(selectedCalendarDetail.getByLabel('메모')).toHaveValue(/필기 암기와 실기 조작 시간/);
  const compactCalendarMemoBox = await selectedCalendarDetail.getByLabel('메모').boundingBox();
  expect(compactCalendarMemoBox?.height ?? 9999).toBeLessThanOrEqual(96);
  await expect(selectedCalendarDetail.getByRole('button', { name: '메모 크게 보기' })).toBeVisible();
  await selectedCalendarDetail.getByRole('button', { name: '메모 크게 보기' }).click();
  const expandedCalendarMemoBox = await selectedCalendarDetail.getByLabel('메모').boundingBox();
  expect(expandedCalendarMemoBox?.height ?? 0).toBeGreaterThan(compactCalendarMemoBox?.height ?? 0);
  await expect(selectedCalendarDetail.getByRole('button', { name: '메모 작게 보기' })).toBeVisible();
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-advanced-toggle')).toHaveCount(0);
  await expect(selectedCalendarDetail.getByRole('button', { name: '닫기', exact: true })).toBeVisible();
  await selectedCalendarDetail.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
  await selectedCalendarRow.getByRole('button').first().click();
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-03');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-overflow-date', '2026-06-03');
  await expect(page.getByTestId('my-flow-selected-day-overflow-note')).toContainText('+3');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('5개 루틴');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="scheduled_task"]').first().getByRole('button', { name: '완료 체크' })).toBeVisible();
  const selectedDayRoutineRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').first();
  await expect(selectedDayRoutineRow.getByRole('button', { name: '이번 항목 완료' })).toBeVisible();
  await expect(selectedDayRoutineRow.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(selectedDayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toContainText(/항목 \d+\/\d+/);
  await page.locator('[data-testid="my-flow-routine-icon"]').first().click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toBeVisible();
  const selectedRoutineDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  const routineProgressBefore = await selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill').innerText();
  const routineProgressMatch = routineProgressBefore.match(/(\d+)\/(\d+)/);
  expect(routineProgressMatch).not.toBeNull();
  const routineDoneBefore = Number(routineProgressMatch?.[1] ?? 0);
  const routineTotal = Number(routineProgressMatch?.[2] ?? 0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill')).toContainText(`항목 ${routineDoneBefore}/${routineTotal}`);
  await expect(selectedRoutineDetail.getByRole('button', { name: '이번 항목 완료' })).toBeVisible();
  const routineTitleBefore = await selectedRoutineDetail.getByLabel('제목').inputValue();
  await selectedRoutineDetail.getByRole('button', { name: '이번 항목 완료' }).click();
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill')).toContainText(`항목 ${routineDoneBefore + 1}/${routineTotal}`);
  await expect(selectedRoutineDetail.getByRole('button', { name: '이번 항목 완료' })).toBeVisible();
  await expect(selectedRoutineDetail.getByLabel('제목')).not.toHaveValue(routineTitleBefore);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-undo-notice')).toContainText('방금 완료한 항목');
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-action-group').getByRole('button', { name: '방금 완료 취소' })).toHaveCount(0);
  await expect(selectedRoutineDetail.getByRole('button', { name: '방금 완료 취소' })).toBeVisible();
  await selectedRoutineDetail.getByRole('button', { name: '방금 완료 취소' }).click();
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill')).toContainText(`항목 ${routineDoneBefore}/${routineTotal}`);
  await expect(selectedRoutineDetail.getByLabel('제목')).toHaveValue(routineTitleBefore);
  await expect(selectedRoutineDetail.getByRole('button', { name: '이번 항목 완료' })).toBeVisible();
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(selectedRoutineDetail.getByLabel('메모')).not.toHaveValue(/실행:/);
  await expect(selectedRoutineDetail.getByLabel('메모')).not.toHaveValue(/완료 기준:/);
  const routineRepeatToggleBox = await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').boundingBox();
  const routineTimeBox = await selectedRoutineDetail.getByLabel('시간').boundingBox();
  const routineLocationBox = await selectedRoutineDetail.getByLabel('장소').boundingBox();
  expect(routineRepeatToggleBox?.y ?? 9999).toBeLessThan(routineTimeBox?.y ?? 0);
  expect(routineRepeatToggleBox?.y ?? 9999).toBeLessThan(routineLocationBox?.y ?? 0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-occurrence-section')).toContainText('이번 일정');
  const routineOccurrenceBox = await selectedRoutineDetail.getByTestId('my-flow-routine-occurrence-section').boundingBox();
  expect(routineRepeatToggleBox?.y ?? 9999).toBeLessThan(routineOccurrenceBox?.y ?? 0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-repeat-editor')).toHaveCount(0);
  await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor')).toBeVisible();
  const routineRepeatEditor = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor');
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-repeat-cancel')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 요일 월')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 변경 적용 범위')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 변경 적용 범위')).toHaveValue('this');
  await expect(routineRepeatEditor.getByLabel('반복 요일 월')).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
  const repeatScopeBox = await routineRepeatEditor.getByLabel('반복 변경 적용 범위').boundingBox();
  const repeatWeekdayBox = await routineRepeatEditor.getByLabel('반복 요일 월').boundingBox();
  expect(repeatScopeBox?.y ?? 0).toBeLessThan(repeatWeekdayBox?.y ?? 0);
  await routineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('this');
  await expect(routineRepeatEditor).toContainText('이 이벤트만은 이번 날짜의 시간·장소·메모만 바꿉니다.');
  await expect(routineRepeatEditor.locator('select')).toContainText('이 이벤트 및 이후');
  await expect(routineRepeatEditor.locator('select')).toContainText('모든 이벤트');
  await expect(routineRepeatEditor.getByLabel('반복 요일 수')).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(1);
  await routineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('future');
  await expect(routineRepeatEditor.getByLabel('반복 요일 수')).toBeEnabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeEnabled();
  await routineRepeatEditor.getByTestId('my-flow-routine-end-date').fill('2026-06-02');
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-repeat-pending')).toContainText('저장 전');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(1);
  await routineRepeatEditor.getByTestId('my-flow-routine-repeat-cancel').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(1);
  await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').click();
  const reopenedRoutineRepeatEditor = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor');
  await expect(reopenedRoutineRepeatEditor.locator('select')).toHaveValue('this');
  await reopenedRoutineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('future');
  await reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-end-date').fill('2026-06-02');
  await expect(reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-pending')).toContainText('저장 전');
  await expect(reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-apply')).toHaveClass(/bg-blue-700/);
  await reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-apply').click();
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [aria-label^="하루 20분 전신 홈트 Flow"]')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article').first()).toHaveAttribute('data-item-type', 'scheduled_task');
  await page.getByTestId('my-flow-calendar-selected-day').locator('article').first().getByRole('button').first().click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveAttribute('data-item-type', 'scheduled_task');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel(/날짜 이동/)).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('날짜')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('input[aria-label="Flow 기준"]')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('반복 요일 월')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('메모')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('왜')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('방법')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('완료 기준')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByLabel('주의')).toHaveCount(0);

  await page.getByTestId('my-flow-calendar-selected-day').getByLabel('날짜').first().fill('2026-05-29');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '변경 저장' })).toBeVisible();
  await page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '변경 저장' }).click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-05-29');
});

test('my flow source-backed demo renders bridge bundles without publishing them as public seeds', async ({ page }) => {
  await page.goto('/my?demo=source-backed');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('원문 기반');
  await expect(page.getByTestId('my-flow-view-today')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(2);
  await expect(page.getByTestId('my-flow-demo-group')).toContainText(['이사 D-30 지도', '중1 수학 지도']);

  const movingCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await expect(movingCard).toContainText('원룸 이사 D-30 준비');
  await expect(movingCard).toContainText('0/5');
  await expect(movingCard.getByRole('button', { name: '캘린더에서 열기' })).toBeVisible();

  const mathCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(mathCard).toContainText('단원별 개념 진도');
  await expect(mathCard).toContainText('0/8');
  await expect(mathCard.getByRole('button', { name: '진도표 열기' })).toBeVisible();

  await mathCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-checklist-view')).toContainText('소인수분해');
  await expect(page.getByTestId('my-flow-checklist-view')).toContainText('정수와 유리수');
});

test('my flow source-backed demo stays lightweight on mobile inventory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByRole('button', { name: 'Flow 찾기' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(2);
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]')).toContainText('원룸 이사 D-30 준비');
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]')).toContainText('단원별 개념 진도');
});

test('source-backed flow map public page stays save-before focused', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap).toBeVisible();
  await expect(publicMap.getByRole('heading', { name: '중1 수학 목차 진도표' })).toBeVisible();
  await expect(publicMap).toContainText('Mathbang 중1 수학 목차');
  await expect(publicMap).toContainText('소인수분해');
  await expect(publicMap).toContainText('정수와 유리수');
  await expect(publicMap).toContainText('하위 항목 8개');
  await expect(publicMap.getByRole('button', { name: '전체 지도 저장' })).toBeVisible();
  await expect(publicMap).not.toContainText(/source fit|PoC|개발자|평가 점수/i);
});

test('source-backed flow map public page saves into the real My Flow path', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1');

  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
  await expect(page.getByTestId('my-flow-demo-badge')).toHaveCount(0);
  await expect(page.getByText('저장 완료')).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 Flow에 저장됨' })).toBeVisible();
  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('중1 수학 목차 진도표');
  await expect(postSavePanel).toContainText('8개 Step');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(3);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all')).toContainText('나머지 5개 Step');
  await postSavePanel.getByTestId('my-flow-post-save-open-first').click();
  const firstPostSaveStepRow = postSavePanel.getByTestId('my-flow-post-save-step-row').first();
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toContainText('개념 항목');
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toContainText('거듭제곱');

  await page.getByTestId('my-flow-post-save-view-flow').click();
  const mathCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(mathCard).toBeVisible();
  await expect(mathCard).toContainText('단원별 개념 진도');
  await expect(mathCard.getByTestId('my-flow-map-context')).toContainText('중1 수학 목차 진도표');
  await expect(mathCard).toContainText('0/8');
  await expect(mathCard.getByRole('link', { name: '지도 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');

  await mathCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveAttribute('aria-pressed', 'true');
  const detailSection = page.getByTestId('my-flow-checklist-detail-section');
  await expect(detailSection.getByTestId('my-flow-item-detail')).toBeVisible();
  const itemChecklist = detailSection.getByTestId('my-flow-item-checklist');
  await expect(itemChecklist).toContainText('거듭제곱');
  await itemChecklist.getByLabel('거듭제곱').check();
  await expect(itemChecklist).toContainText('1/8');

  await detailSection.getByTestId('my-flow-detail-date-input').fill('2026-06-29');
  await expect(detailSection.getByTestId('my-flow-progress-schedule-note')).toContainText('날짜를 넣으면');
  await detailSection.getByTestId('my-flow-detail-save-changes').click();
  await page.getByTestId('my-flow-view-calendar').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-29');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article')).toHaveCount(1);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:source-backed-')));
  expect(savedKeys).toEqual(['flow:saved:source-backed-middle-school-math-1']);
  const savedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'));
  expect(savedMap.version).toBe('2026-06-24.1');
  expect(savedMap.flowSlugs).toEqual(['source-backed-middle-school-math-1']);
});

test('my flow separates ready source-backed content from review-needed saved flows', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');

  await page.evaluate(() => {
    localStorage.setItem(
      'flow:saved:alt-phone-sk7-self-activation',
      JSON.stringify({
        slug: 'alt-phone-sk7-self-activation',
        savedAt: '2026-06-24T12:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }),
    );
  });

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();

  const readySection = page.getByTestId('my-flow-ready-section');
  const reviewSection = page.getByTestId('my-flow-review-section');
  await expect(readySection).toContainText('바로 이어서 볼 Flow');
  await expect(readySection.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]')).toBeVisible();
  await expect(readySection).not.toContainText('알뜰폰 SK7 셀프개통 체크 Flow');

  await expect(reviewSection).toContainText('확인 후 실행할 Flow');
  const reviewCard = reviewSection.locator('[data-testid="my-flow-overview-card"][data-flow-slug="alt-phone-sk7-self-activation"]');
  await expect(reviewCard).toContainText('알뜰폰 SK7 셀프개통 체크 Flow');
  await expect(reviewCard.getByTestId('my-flow-content-readiness')).toContainText('검토 필요');
  await expect(reviewCard).toContainText('원문 구조나 실행 항목을 다시 정리해야 하는 Flow입니다.');
});

test('source-backed single progress map opens step detail on mobile My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/middle-school-math-1');

  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveCount(0);

  await page.getByTestId('my-flow-post-save-open-first').click();
  const firstPostSaveStepRow = page.getByTestId('my-flow-post-save-step-row').first();
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toBeVisible();
  const itemChecklist = firstPostSaveStepRow.getByTestId('my-flow-post-save-detail').getByTestId('my-flow-item-checklist');
  await expect(itemChecklist).toContainText('거듭제곱');
  await itemChecklist.getByLabel('거듭제곱').check();
  await expect(itemChecklist).toContainText('1/8');
  await page.getByTestId('my-flow-post-save-open-first').click();
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toHaveCount(0);
});

test('source-backed moving map saves one dated timeline into My Flow calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap.getByRole('heading', { name: '원룸 이사 D-30 일정 지도' })).toBeVisible();
  await expect(publicMap.getByLabel('이사일')).toBeVisible();
  await expect(publicMap).toContainText('원룸 이사 D-30 준비');
  await expect(publicMap).toContainText('이사 방식과 견적 후보 정하기');
  await expect(publicMap).toContainText('하위 항목 3개');

  await page.getByLabel('이사일').fill('2026-07-22');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await expect(page.getByTestId('my-flow-demo-badge')).toHaveCount(0);

  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('원룸 이사 D-30 일정 지도');
  await expect(postSavePanel).toContainText('1개 Flow');
  await expect(postSavePanel).toContainText('5개 Step');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(3);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all').first()).toContainText('전체 일정 보기');

  await postSavePanel.getByTestId('my-flow-post-save-open-first').click();
  const firstPostSaveStepRow = postSavePanel.getByTestId('my-flow-post-save-step-row').first();
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toContainText('확인 항목');
  await expect(firstPostSaveStepRow.getByTestId('my-flow-post-save-detail')).toContainText('이사 방식 1개를 정합니다.');

  await postSavePanel.getByTestId('my-flow-post-save-view-all').first().click();
  const calendarCard = page.getByTestId('my-flow-calendar-card');
  await expect(calendarCard).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const calendarTop = await calendarCard.evaluate((element) => element.getBoundingClientRect().top);
  expect(calendarTop).toBeLessThan(96);
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toContainText('지도 일정');
  await expect(selectedDateGroup).toContainText('원룸 이사 D-30 일정 지도');
  await expect(selectedDateGroup).toContainText('1개 · 1개 남음');
  await expect(selectedDateGroup.getByTestId('my-flow-row-flow-chip')).toHaveCount(0);
  await expect(selectedDateGroup.getByTestId('my-flow-row-progress-chip')).toHaveCount(0);

  const savedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:saved:moving-d30') || 'null'));
  expect(savedMap.version).toBe('2026-06-24.1');
  expect(savedMap.anchor).toBe('2026-07-22');
  expect(savedMap.flowSlugs).toEqual(['source-backed-moving-d30']);
  expect(savedMap.stepCountsByFlow).toEqual({
    'source-backed-moving-d30': 5,
  });
  const persistenceRecord = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:persistence:moving-d30') || 'null'));
  expect(persistenceRecord.schemaVersion).toBe(1);
  expect(persistenceRecord.readiness.content).toBe('ready_for_my_flow');
  expect(persistenceRecord.childFlows[0].stepIds).toEqual([
    'moving-method-quotes',
    'moving-cleaning-waste',
    'moving-address-admin',
    'moving-meter-photos',
    'moving-move-day-admin',
  ]);
});

test('source-backed baby health map saves input-bearing official schedule flows into My Flow', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap.getByRole('heading', { name: '영유아 검진·접종 일정 지도' })).toBeVisible();
  await expect(publicMap).toContainText('아이 생년월일');
  await expect(publicMap).toContainText('영유아 건강검진 일정');
  await expect(publicMap).toContainText('아이 예방접종 일정 확인');

  await page.getByLabel('아이 생년월일').fill('2026-01-15');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=baby-health-schedule');
  await expect(page.getByTestId('my-flow-demo-badge')).toHaveCount(0);
  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('영유아 검진·접종 일정 지도');
  await expect(postSavePanel).toContainText('2개 Flow');
  await expect(postSavePanel).toContainText('18개 Step');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(6);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all')).toHaveCount(2);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all').first()).toContainText('전체 일정 보기');
  await postSavePanel.getByTestId('my-flow-post-save-view-flow').click();

  const babyMapGroup = page.getByTestId('my-flow-map-group');
  await expect(babyMapGroup).toContainText('영유아 검진·접종 일정 지도');
  await expect(babyMapGroup).toContainText('2개 Flow');
  await expect(babyMapGroup.getByTestId('my-flow-map-group-source-link')).toHaveAttribute('href', '/flow-maps/baby-health-schedule');
  const checkupCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-baby-health-checkups"]');
  const vaccinationCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-baby-vaccination-schedule"]');
  await expect(checkupCard).toContainText('영유아 건강검진 일정');
  await expect(checkupCard.getByTestId('my-flow-map-context')).toContainText('영유아 검진·접종 일정 지도');
  await expect(checkupCard).toContainText('0/12');
  await expect(checkupCard.getByRole('link', { name: '지도 보기' })).toHaveAttribute('href', '/flow-maps/baby-health-schedule');
  await expect(vaccinationCard).toContainText('아이 예방접종 일정 확인');
  await expect(vaccinationCard).toContainText('0/6');

  const savedRecords = await page.evaluate(() => {
    const keys = [
      'flow:saved:source-backed-baby-health-checkups',
      'flow:saved:source-backed-baby-vaccination-schedule',
    ];
    return Object.fromEntries(keys.map((key) => [key, JSON.parse(localStorage.getItem(key) || 'null')]));
  });
  expect(savedRecords['flow:saved:source-backed-baby-health-checkups'].anchor).toBe('2026-01-15');
  expect(savedRecords['flow:saved:source-backed-baby-vaccination-schedule'].anchor).toBe('2026-01-15');
  const savedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:saved:baby-health-schedule') || 'null'));
  expect(savedMap.version).toBe('2026-06-23.1');
  expect(savedMap.anchor).toBe('2026-01-15');
  expect(savedMap.stepCountsByFlow).toEqual({
    'source-backed-baby-health-checkups': 12,
    'source-backed-baby-vaccination-schedule': 6,
  });
});

test('source-backed baby health map remains visible on mobile Flow tab after save', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/baby-health-schedule');

  await page.getByLabel('아이 생년월일').fill('2026-01-15');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=baby-health-schedule');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('영유아 검진·접종 일정 지도');
  await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByRole('button', { name: 'Flow 찾기' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-group')).toContainText('영유아 검진·접종 일정 지도');
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(2);
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-baby-health-checkups"]')).toContainText('0/12');
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-baby-vaccination-schedule"]')).toContainText('0/6');
});

test('my flow shows update review notice for changed source-backed saved maps', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule');

  await page.getByLabel('아이 생년월일').fill('2026-01-15');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=baby-health-schedule');

  await page.evaluate(() => {
    const key = 'flow:map:saved:baby-health-schedule';
    const snapshot = JSON.parse(window.localStorage.getItem(key) || 'null');
    snapshot.version = '2026-01-01.old';
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  });

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview).toBeVisible();
  await expect(updateReview).toContainText('저장한 지도에 다시 볼 내용이 있습니다');
  await expect(updateReview).toContainText('영유아 검진·접종 일정 지도');
  await expect(updateReview).toContainText('업데이트 확인 필요');
  await expect(updateReview).toContainText('자동 반영 안 함');
  await expect(updateReview).toContainText('기존 체크와 메모는 유지');
  await expect(updateReview).toContainText('원문 기준 정보가 새로 발행되었습니다');
  await expect(updateReview).toContainText('검진/접종처럼 공식 일정은 자동으로 바꾸지 않습니다');
  await updateReview.getByTestId('my-flow-map-update-toggle').click();
  const comparison = updateReview.getByTestId('my-flow-map-update-comparison');
  await expect(comparison).toContainText('저장 2026-01-01.old');
  await expect(comparison).toContainText('현재 2026-06-23.1');
  await expect(comparison.getByTestId('my-flow-map-update-comparison-row')).toHaveCount(2);
  await expect(updateReview.getByRole('link', { name: '지도 보기' })).toHaveAttribute('href', '/flow-maps/baby-health-schedule');
  await updateReview.getByTestId('my-flow-map-update-dismiss').click();
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);

  await page.reload();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
});

test('my flow update review can apply a new source-backed snapshot without changing saved child flows', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule');

  await page.getByLabel('아이 생년월일').fill('2026-01-15');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=baby-health-schedule');

  await page.evaluate(() => {
    const key = 'flow:map:saved:baby-health-schedule';
    const snapshot = JSON.parse(window.localStorage.getItem(key) || 'null');
    snapshot.version = '2026-01-01.old';
    snapshot.stepCountsByFlow['source-backed-baby-health-checkups'] = 11;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  });

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview).toBeVisible();
  await updateReview.getByTestId('my-flow-map-update-toggle').click();
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('Step 11 → 12');

  await updateReview.getByTestId('my-flow-map-update-apply').click();
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-applied')).toContainText('새 기준으로 표시했습니다');
  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:baby-health-schedule') || 'null'),
    checkups: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-health-checkups') || 'null'),
    vaccinations: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-vaccination-schedule') || 'null'),
  }));
  expect(savedState.snapshot.version).toBe('2026-06-23.1');
  expect(savedState.snapshot.stepCountsByFlow['source-backed-baby-health-checkups']).toBe(12);
  expect(savedState.checkups.anchor).toBe('2026-01-15');
  expect(savedState.vaccinations.anchor).toBe('2026-01-15');
});

test('my flow update apply adds missing child flow records without deleting existing progress', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule');

  await page.getByLabel('아이 생년월일').fill('2026-01-15');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=baby-health-schedule');

  await page.evaluate(() => {
    const key = 'flow:map:saved:baby-health-schedule';
    const snapshot = JSON.parse(window.localStorage.getItem(key) || 'null');
    snapshot.version = '2026-01-01.old';
    snapshot.flowSlugs = ['source-backed-baby-health-checkups'];
    window.localStorage.setItem(key, JSON.stringify(snapshot));
    window.localStorage.removeItem('flow:saved:source-backed-baby-vaccination-schedule');
  });

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await updateReview.getByTestId('my-flow-map-update-toggle').click();
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('새로 추가');
  await updateReview.getByTestId('my-flow-map-update-apply').click();

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:baby-health-schedule') || 'null'),
    checkups: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-health-checkups') || 'null'),
    vaccinations: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-vaccination-schedule') || 'null'),
  }));
  expect(savedState.snapshot.flowSlugs).toContain('source-backed-baby-vaccination-schedule');
  expect(savedState.checkups.anchor).toBe('2026-01-15');
  expect(savedState.vaccinations.anchor).toBe('2026-01-15');
});

test('source-backed flow map creator page shows publish structure without mixing user execution', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1/creator');

  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toBeVisible();
  await expect(creatorMap.getByRole('heading', { name: '중1 수학 목차 진도표' })).toBeVisible();
  await expect(creatorMap).toContainText('제작자 편집');
  await expect(creatorMap).toContainText('원문 행');
  await expect(creatorMap).toContainText('사용자에게 저장될 Step');
  await expect(creatorMap).toContainText('초안 0개 수정');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('거듭제곱');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('에라토스테네스의 체');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('참고 원문');
  await expect(creatorMap).toContainText('저장 후 사용자 화면');
  await expect(creatorMap.getByTestId('flow-map-source-row')).toHaveCount(8);
  await expect(creatorMap.getByRole('link', { name: '공개 화면 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');

  await creatorMap.getByTestId('flow-map-source-row').nth(1).click();
  await creatorMap.getByTestId('creator-draft-note').fill('2단원 제목과 fallback item 확인');
  await creatorMap.getByTestId('creator-save-draft').click();
  await expect(creatorMap).toContainText('초안 저장됨');
  await creatorMap.getByTestId('creator-publish-draft').click();
  await expect(creatorMap).toContainText('로컬 발행 표시됨');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:creator-draft:middle-school-math-1') || 'null'));
  expect(draft.publishedVersion).toBe('2026-06-24.1');
  expect(draft.rows['math-integers-rationals'].creatorNote).toBe('2단원 제목과 fallback item 확인');
  const published = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:published-local:middle-school-math-1') || 'null'));
  expect(published.source).toBe('local_creator_publish');
  expect(published.rows['math-integers-rationals'].creatorNote).toBe('2단원 제목과 fallback item 확인');
  await expect(creatorMap).not.toContainText('오늘 실행');
  await expect(creatorMap).not.toContainText('완료 체크');
});

test('my flow step detail saves portable calendar task fields', async ({ page }) => {
  await page.goto('/flow-maps/moving-d30');

  await page.getByLabel('이사일').fill('2026-07-22');
  await page.getByRole('button', { name: '전체 지도 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
  const movingCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await movingCard.getByTestId('my-flow-next-action-open').click();

  const detail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(detail).toBeVisible();
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-06-24');
  await detail.locator('input[type="time"]').fill('09:30');
  await detail.getByTestId('my-flow-detail-repeat-input').selectOption('weekly');
  await detail.locator('input[placeholder="장소 없음"]').fill('집');
  await detail.locator('textarea').first().fill('견적 후보 3곳과 포함 범위만 메모');
  await detail.getByRole('button', { name: '변경 저장' }).click();

  const stored = await page.evaluate(() => ({
    dateOverrides: JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    drafts: JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
  }));
  expect(Object.values(stored.dateOverrides)).toContain('2026-06-24');
  const draftValues = Object.values(stored.drafts) as Array<Record<string, string>>;
  expect(draftValues.some((draft) => draft.time === '09:30' && draft.location === '집' && draft.repeatPreset === 'weekly')).toBe(true);

  await page.goto('/my');
  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-24"]')).toContainText('이사 방식');
});

test('my flow mobile saved map edit and revisit keeps step detail lightweight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  const publicMap = page.getByTestId('flow-map-public');
  await publicMap.locator('input[type="date"]').fill('2026-07-22');
  await publicMap.locator('button').last().click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();

  const movingCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await movingCard.scrollIntoViewIfNeeded();
  await movingCard.getByTestId('my-flow-next-action-open').click();

  await expect(page.getByRole('dialog')).toBeVisible();
  const detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await expect(detail).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-repeat-input')).toBeVisible();

  const detailBox = await detail.boundingBox();
  expect(detailBox).not.toBeNull();
  expect(detailBox!.y).toBeGreaterThanOrEqual(0);

  await detail.getByTestId('my-flow-detail-date-input').fill('2026-06-25');
  await detail.locator('input[type="time"]').fill('10:00');
  await detail.getByTestId('my-flow-detail-repeat-input').selectOption('weekly');
  await detail.locator('textarea').first().fill('mobile revisit memo');
  await detail.getByTestId('my-flow-detail-save-changes').click();

  await page.goto('/my');
  await page.getByTestId('my-flow-today-calendar-open').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-25"] .fc-event')).toHaveCount(1);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test('source-backed baby health creator page keeps official source review separate from execution', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule/creator');

  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toBeVisible();
  await expect(creatorMap.getByRole('heading', { name: '영유아 검진·접종 일정 지도' })).toBeVisible();
  await expect(creatorMap).toContainText('원문 행');
  await expect(creatorMap).toContainText('준비');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('공식');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('건강 민감');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('문진표');
  await expect(creatorMap).toContainText('저장 후 사용자 화면');
  await expect(creatorMap.getByTestId('flow-map-source-row')).toHaveCount(18);
  await expect(creatorMap.getByRole('link', { name: '공개 화면 보기' })).toHaveAttribute('href', '/flow-maps/baby-health-schedule');
  await expect(creatorMap).not.toContainText('오늘 실행');
  await expect(creatorMap).not.toContainText('완료 체크');
});

test('source-backed direct-route experiments can still save into my flow', async ({ page }) => {
  const cases = [
    { mapId: 'postal-address-transfer', slug: 'source-backed-postal-address-transfer', anchor: '2026-07-01' },
    { mapId: 'smishing-response', slug: 'source-backed-smishing-response' },
    { mapId: 'year-end-tax-submit', slug: 'source-backed-year-end-tax-submit', anchor: '2026-01-25' },
    { mapId: 'aircon-filter-cleaning', slug: 'source-backed-aircon-filter-cleaning', anchor: '2026-07-06' },
    { mapId: 'picnic-food-safety', slug: 'source-backed-picnic-food-safety', anchor: '2026-07-12' },
  ];

  for (const flowCase of cases) {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`/flow-maps/${flowCase.mapId}`);

    const publicMap = page.getByTestId('flow-map-public');
    await expect(publicMap).toBeVisible();
    await expect(publicMap.getByRole('link').last()).toBeVisible();
    if (flowCase.anchor) {
      await publicMap.getByTestId('flow-map-anchor-input').fill(flowCase.anchor);
    } else {
      await expect(publicMap.getByTestId('flow-map-anchor-input')).toHaveCount(0);
    }

    await publicMap.getByTestId('flow-map-save-all').click();
    await expect(page).toHaveURL(new RegExp(`/my\\?savedMap=${flowCase.mapId}$`));
    await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();

    const savedState = await page.evaluate(({ mapId, slug }) => ({
      snapshot: JSON.parse(window.localStorage.getItem(`flow:map:saved:${mapId}`) || 'null'),
      persistence: JSON.parse(window.localStorage.getItem(`flow:map:persistence:${mapId}`) || 'null'),
      child: JSON.parse(window.localStorage.getItem(`flow:saved:${slug}`) || 'null'),
    }), flowCase);

    expect(savedState.snapshot.flowSlugs).toContain(flowCase.slug);
    expect(savedState.persistence.recordType).toBe('saved_source_backed_flow_map');
    expect(savedState.child.selectedArtifactMode).toBeTruthy();
    if (flowCase.anchor) {
      expect(savedState.snapshot.anchor).toBe(flowCase.anchor);
      expect(savedState.child.anchor).toBe(flowCase.anchor);
    }
  }
});

test('source-backed direct-route experiments keep source link checklist and memo in my flow', async ({ page }) => {
  const cases = [
    { mapId: 'postal-address-transfer', slug: 'source-backed-postal-address-transfer', anchor: '2026-07-01' },
    { mapId: 'smishing-response', slug: 'source-backed-smishing-response' },
    { mapId: 'year-end-tax-submit', slug: 'source-backed-year-end-tax-submit', anchor: '2026-01-25' },
    { mapId: 'aircon-filter-cleaning', slug: 'source-backed-aircon-filter-cleaning', anchor: '2026-07-06' },
    { mapId: 'picnic-food-safety', slug: 'source-backed-picnic-food-safety', anchor: '2026-07-12' },
  ];

  for (const flowCase of cases) {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`/flow-maps/${flowCase.mapId}`);

    const publicMap = page.getByTestId('flow-map-public');
    await expect(publicMap).toBeVisible();
    if (flowCase.anchor) {
      await publicMap.getByTestId('flow-map-anchor-input').fill(flowCase.anchor);
    }

    await publicMap.getByTestId('flow-map-save-all').click();
    await expect(page).toHaveURL(new RegExp(`/my\\?savedMap=${flowCase.mapId}$`));
    await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();

    const card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowCase.slug}"]`);
    await expect(card).toBeVisible();
    await card.getByTestId('my-flow-next-action-open').click();

    const detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-source-link')).toHaveAttribute('href', /^https:\/\//);

    const itemChecklist = detail.getByTestId('my-flow-item-checklist');
    await expect(itemChecklist).toBeVisible();
    const firstItemCheckbox = itemChecklist.locator('input[type="checkbox"]').first();
    await firstItemCheckbox.check();
    await expect(firstItemCheckbox).toBeChecked();

    const memo = `${flowCase.mapId} rehearsal memo`;
    await detail.getByTestId('my-flow-detail-memo').fill(memo);
    await detail.getByTestId('my-flow-detail-save-changes').click();

    const storedAfterEdit = await page.evaluate(() => ({
      stepItemChecks: JSON.parse(window.localStorage.getItem('flow:my-flow:step-item-checks') || '{}'),
      itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    }));
    expect(JSON.stringify(storedAfterEdit.stepItemChecks)).toContain('true');
    expect(JSON.stringify(storedAfterEdit.itemDrafts)).toContain(memo);

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    const restoredCard = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowCase.slug}"]`);
    await expect(restoredCard).toBeVisible();
    await restoredCard.getByTestId('my-flow-next-action-open').click();
    const restoredDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await expect(restoredDetail.getByTestId('my-flow-detail-memo')).toHaveValue(memo);
    await expect(restoredDetail.getByTestId('my-flow-item-checklist').locator('input[type="checkbox"]').first()).toBeChecked();
  }
});

test('my flow ux20 demo keeps large flow inventories grouped and collapsed', async ({ page }) => {
  await page.goto('/my?demo=ux20');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX20');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-list')).toHaveCount(0);
  const priorityCardCount = await page.getByTestId('my-flow-priority-card').count();
  expect(priorityCardCount).toBeGreaterThan(0);
  expect(priorityCardCount).toBeLessThanOrEqual(4);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-inventory-toggle')).toContainText('30');

  await page.getByTestId('my-flow-inventory-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(30);
  await expect(page.getByTestId('my-flow-demo-group')).toHaveCount(14);

  await page.getByTestId('my-flow-list-filter-routine').click();
  await expect(page.getByTestId('my-flow-inventory-toggle')).toHaveCount(0);
  const routineCardCount = await page.getByTestId('my-flow-overview-card').count();
  expect(routineCardCount).toBeGreaterThan(0);
  expect(routineCardCount).toBeLessThan(30);

  await page.getByTestId('my-flow-search').fill('자동차');
  const searchedCardCount = await page.getByTestId('my-flow-overview-card').count();
  expect(searchedCardCount).toBeGreaterThan(0);
  expect(searchedCardCount).toBeLessThanOrEqual(routineCardCount);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')));
  expect(savedKeys).toHaveLength(0);
});

test('my flow inventory can hide and restore a flow without removing today data', async ({ page }) => {
  await page.goto('/my?demo=ux20');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();
  const firstCard = page.getByTestId('my-flow-overview-card').first();
  const firstTitle = await firstCard.locator('h3').innerText();
  await firstCard.getByTestId('my-flow-hide-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card').filter({ hasText: firstTitle })).toHaveCount(0);

  await page.getByTestId('my-flow-list-filter-hidden').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-overview-card')).toContainText(firstTitle);
  await page.getByTestId('my-flow-overview-card').getByTestId('my-flow-hide-toggle').click();
  await page.getByTestId('my-flow-list-filter-all').click();
  await expect(page.getByTestId('my-flow-overview-card').filter({ hasText: firstTitle })).toHaveCount(1);
});

test('my flow ux12 calendar collapses dense days and opens recurring routine edits by default', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  const denseDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-27"]');
  await expect(denseDateCell.locator('.fc-event')).toHaveCount(4);
  const scheduleEventPadding = await denseDateCell.locator('.fc-event').first().evaluate((node) => {
    const styles = window.getComputedStyle(node);
    return {
      left: Number.parseFloat(styles.paddingLeft),
      right: Number.parseFloat(styles.paddingRight),
    };
  });
  expect(scheduleEventPadding.left).toBeLessThanOrEqual(1);
  expect(scheduleEventPadding.right).toBeLessThanOrEqual(1);
  const scheduleOverflow = denseDateCell.getByTestId('my-flow-schedule-overflow');
  await expect(scheduleOverflow).toContainText('+2');
  const scheduleOverflowEventStyle = await denseDateCell.locator('.fc-event:has([data-testid="my-flow-schedule-overflow"])').first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
    };
  });
  expect(scheduleOverflowEventStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(scheduleOverflowEventStyle.borderTopColor).toBe('rgba(0, 0, 0, 0)');
  await expect(scheduleOverflow).toHaveAttribute('aria-label', /2026-05-27/);
  await expect(scheduleOverflow).toHaveAttribute('aria-label', /2/);
  await page.locator('.fc-daygrid-day[data-date="2026-05-29"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-05-29');
  await scheduleOverflow.click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-05-27');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-schedule-overflow-date', '2026-05-27');
  await expect(page.getByTestId('my-flow-selected-day-schedule-overflow-note')).toContainText('+2');
  await expect(page.getByTestId('my-flow-selected-day-schedule-overflow-note')).toContainText('일정 포함');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);

  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first().click();
  await page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-toggle').click();
  const routineRepeatEditor = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor');
  await expect(routineRepeatEditor.locator('select')).toHaveValue('this');
  await expect(routineRepeatEditor.locator('input[type="checkbox"]').first()).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
});

test('my flow ux12 log entry keeps recording lightweight in item detail', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();
  const usedCarOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
  await usedCarOverviewCard.getByTestId('my-flow-next-action-open').click();

  const usedCarLogRow = page.getByTestId('my-flow-checklist-detail-section').locator('article[data-item-type="log_entry"]').first();
  await expect(usedCarLogRow).toBeVisible();
  await usedCarLogRow.getByRole('button').first().click();
  const logDetail = page.getByTestId('my-flow-checklist-detail-section').getByTestId('my-flow-item-detail');
  await expect(logDetail).toHaveAttribute('data-item-type', 'log_entry');
  await expect(logDetail.getByTestId('my-flow-detail-type-summary')).toContainText('기록');
  await expect(logDetail.getByTestId('my-flow-detail-type-summary')).not.toContainText('상태나 관찰값');
  const logTypeSummaryBox = await logDetail.getByTestId('my-flow-detail-type-summary').boundingBox();
  expect(logTypeSummaryBox?.height ?? 9999).toBeLessThanOrEqual(32);
  await expect(logDetail.getByTestId('my-flow-log-fields')).toBeVisible();
  await expect(logDetail.getByTestId('my-flow-log-value')).toHaveValue('');
  await expect(logDetail.getByTestId('my-flow-log-fields')).not.toContainText('숫자, 상태');
  await expect(logDetail.getByTestId('my-flow-log-fields')).not.toContainText('긴 설명은 아래 메모');
  await expect(logDetail.locator('[data-testid^="my-flow-proof"]')).toHaveCount(0);

  await logDetail.getByTestId('my-flow-log-value').fill('손전등 준비, 체크 메모 열어둠');
  await expect(logDetail.getByRole('button', { name: '변경 저장' })).toBeVisible();
  await logDetail.getByRole('button', { name: '변경 저장' }).click();
  await usedCarLogRow.getByRole('button').first().click();
  const savedLogDetail = page.getByTestId('my-flow-checklist-detail-section').getByTestId('my-flow-item-detail');
  await expect(savedLogDetail.getByTestId('my-flow-log-value')).toHaveValue('손전등 준비, 체크 메모 열어둠');
});

test('my flow ux12 mobile routine rail keeps overflow horizontal without overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  const routineRail = routineCell.getByTestId('my-flow-routine-rail');
  const routineIcons = routineCell.getByTestId('my-flow-routine-icon');
  const routineOverflow = routineCell.getByTestId('my-flow-routine-overflow');
  await expect(routineRail).toBeVisible();
  await expect(routineIcons).toHaveCount(1);
  await expect(routineIcons.nth(0)).toBeVisible();
  await expect(routineOverflow).toContainText('+4');

  const railBox = await routineRail.boundingBox();
  const firstIconBox = await routineIcons.nth(0).boundingBox();
  const overflowBox = await routineOverflow.boundingBox();
  const routineRailEventVisualStyle = await routineCell.locator('.my-flow-routine-rail-event').first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
      borderTopWidth: style.borderTopWidth,
    };
  });
  expect(routineRailEventVisualStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(routineRailEventVisualStyle.borderTopColor).toBe('rgba(0, 0, 0, 0)');
  expect(firstIconBox).not.toBeNull();
  expect(overflowBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(firstIconBox?.width ?? 0).toBeGreaterThanOrEqual(28);
  expect(firstIconBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  const firstIconVisualStyle = await routineIcons.nth(0).evaluate((node) => {
    const style = window.getComputedStyle(node);
    const hasVisibleShadow = /0px [1-9]\d*px [1-9]\d*px/.test(style.boxShadow);
    return {
      backgroundColor: style.backgroundColor,
      hasVisibleShadow,
    };
  });
  expect(firstIconVisualStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(firstIconVisualStyle.hasVisibleShadow).toBe(false);
  expect((firstIconBox?.x ?? 0) + (firstIconBox?.width ?? 0)).toBeLessThanOrEqual((overflowBox?.x ?? 0) + 1);
  expect((overflowBox?.x ?? 0) + (overflowBox?.width ?? 0)).toBeLessThanOrEqual((railBox?.x ?? 0) + (railBox?.width ?? 0) + 1);
});

test('my flow ux12 calendar marks clicked routine icons active', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await routineIcon.click();

  await expect(routineIcon).toHaveClass(/my-flow-calendar-active-routine/);
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-03');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveAttribute('data-item-type', 'routine_session');
});

test('my flow ux12 moves only one routine occurrence from calendar detail', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const sourceRoutineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const sourceRoutineLabel = await sourceRoutineIcon.getAttribute('aria-label');
  expect(sourceRoutineLabel).toBeTruthy();
  await sourceRoutineIcon.click();

  const routineDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(routineDetail).toHaveAttribute('data-item-type', 'routine_session');
  await expect(routineDetail.getByLabel('날짜')).toHaveValue('2026-06-03');
  await routineDetail.getByLabel('날짜').fill('2026-06-04');
  await routineDetail.getByRole('button', { name: '변경 저장' }).click();

  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-04');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-04"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(1);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-06"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
});

test('my flow ux12 drags one routine icon to another calendar date', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const sourceRoutineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const sourceRoutineLabel = await sourceRoutineIcon.getAttribute('aria-label');
  expect(sourceRoutineLabel).toBeTruthy();

  await sourceRoutineIcon.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));

  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-04"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(1);
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('2026-06-04');
});

test('my flow ux12 drags an overflow routine row to another calendar date', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]').click();
  const overflowRoutineRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').nth(2);
  await expect(overflowRoutineRow).toBeVisible();
  const overflowRoutineKey = await overflowRoutineRow.getAttribute('data-routine-key');
  expect(overflowRoutineKey).toBeTruthy();

  await overflowRoutineRow.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));

  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).toContainText('2026-06-04');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator(`article[data-routine-key="${overflowRoutineKey}"]`)).toHaveCount(1);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+2');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).toContainText('2026-06-03');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator(`article[data-routine-key="${overflowRoutineKey}"]`)).toHaveCount(0);
});

test('my flow ux12 today routine rows rely on the progress pill only', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-05-29"] [data-testid="my-flow-routine-icon"]').first();
  await expect(routineIcon).toBeVisible();
  await routineIcon.dragTo(page.locator('.fc-daygrid-day[data-date="2026-05-28"]'));

  await page.getByTestId('my-flow-view-today').click();
  const todayRoutineRow = page.getByTestId('my-flow-today-open-list').locator('article[data-item-type="routine_session"]').first();
  await expect(todayRoutineRow).toBeVisible();
  await expect(todayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toContainText(/항목 \d+\/\d+/);
  await expect(todayRoutineRow.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
});

test('my flow mobile keeps single saved flow lighter than dense saved lists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-28T03:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-06-26' }));
  });

  await page.goto('/my');

  await expect(page.getByText('저장한 Flow를 오늘 할 일 중심으로 이어서 봅니다.')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-routine')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overdue-list').getByRole('button', { name: '완료 체크' }).first()).toHaveText('');
  await expect(page.getByRole('button', { name: '밀린 항목 더 보기 2개' })).toBeVisible();

  await page.goto('/my?demo=ux12');
  await expect(page.getByTestId('my-flow-view-checklist')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-routine')).toBeVisible();
});

test('my flow mobile item opens editable detail sheet from today page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-today').click();
  await expect(page.getByTestId('my-flow-today-list')).toHaveCount(0);
  const overdueListBox = await page.getByTestId('my-flow-overdue-list').boundingBox();
  const completedListBox = await page.getByTestId('my-flow-today-completed-list').boundingBox();
  expect(overdueListBox?.y ?? 0).toBeLessThan(completedListBox?.y ?? 0);

  const firstRunnableRow = page.getByTestId('my-flow-overdue-list').locator('article').first();
  await expect(firstRunnableRow).toBeVisible();
  await firstRunnableRow.getByRole('button').first().click();
  const mobileDetail = page.getByRole('dialog', { name: 'Flow 항목 상세' });
  await expect(mobileDetail).toBeVisible();
  await expect(mobileDetail).toContainText('실행 항목');
  await expect(mobileDetail.getByLabel('제목')).toHaveCount(0);
  await expect(mobileDetail.getByRole('button', { name: '완료 체크' })).toHaveCount(1);
  await expect(mobileDetail.getByRole('button', { name: '이번 항목 완료' })).toHaveCount(0);
  const originalMemo = await mobileDetail.getByLabel('메모').inputValue();
  await mobileDetail.getByLabel('메모').fill('모바일에서 취소할 실행 메모');
  await expect(mobileDetail.getByRole('button', { name: '변경 취소' })).toBeVisible();
  await mobileDetail.getByRole('button', { name: '변경 취소' }).click();
  await expect(mobileDetail).toHaveCount(0);

  await firstRunnableRow.getByRole('button').first().click();
  await expect(mobileDetail.getByLabel('메모')).toHaveValue(originalMemo);
  await mobileDetail.getByLabel('메모').fill('모바일에서 수정한 실행 메모');
  await mobileDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(mobileDetail).toHaveCount(0);
  await firstRunnableRow.getByRole('button').first().click();
  await expect(mobileDetail.getByLabel('메모')).toHaveValue('모바일에서 수정한 실행 메모');
});

test('my flow mobile calendar keeps date selection separate and gives events usable tap targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-calendar').click();
  const calendarCardBox = await page.getByTestId('my-flow-calendar-card').boundingBox();
  expect(calendarCardBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((calendarCardBox?.x ?? 9999) + (calendarCardBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(calendarCardBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  const calendarTop = await page.locator('.fc').boundingBox();
  expect(calendarTop?.y ?? 9999).toBeLessThan(540);
  expect(calendarTop?.y ?? 9999).toBeLessThanOrEqual(140);
  expect(calendarTop?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((calendarTop?.x ?? 9999) + (calendarTop?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(calendarTop?.width ?? 0).toBeGreaterThanOrEqual(330);
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  const mobileDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-29"]');
  await mobileDateCell.getByTestId('my-flow-calendar-date-button').click();
  await expect(mobileDateCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(mobileDateCell.getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog', { name: 'Flow 항목 상세' })).toHaveCount(0);
  const selectedDayAfterDateTap = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayAfterDateTap?.y ?? 9999).toBeLessThan(520);

  const mobileEvent = page.locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"][aria-label*="상세 열기"]');
  const eventBox = await mobileEvent.boundingBox();
  expect(eventBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  await mobileEvent.click();
  const mobileDetail = page.getByRole('dialog', { name: 'Flow 항목 상세' });
  await expect(mobileDetail).toBeVisible();
  await expect(mobileDetail).toContainText('필기와 실기 시험 범위 나누기');
  await expect(mobileDetail.getByLabel('제목')).toHaveCount(0);
  await expect(mobileDetail.getByLabel('메모')).toBeVisible();
  await mobileDetail.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(mobileDetail).toHaveCount(0);

  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const routineOverflow = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]');
  const firstRoutineBox = await routineIcon.boundingBox();
  const overflowBox = await routineOverflow.boundingBox();
  expect(firstRoutineBox?.width ?? 0).toBeGreaterThanOrEqual(28);
  expect(firstRoutineBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  expect(overflowBox?.width ?? 0).toBeGreaterThanOrEqual(11);
  expect(overflowBox?.height ?? 0).toBeGreaterThanOrEqual(28);

  const sameDayRoutineBoxes = await page
    .locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"], .fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).map((rect) => ({ x: rect.x, y: rect.y })));
  expect(sameDayRoutineBoxes.length).toBeGreaterThanOrEqual(2);
  expect(Math.max(...sameDayRoutineBoxes.map((box) => box.y)) - Math.min(...sameDayRoutineBoxes.map((box) => box.y))).toBeLessThan(3);

  await routineOverflow.click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-overflow-date', '2026-06-03');
  await expect(page.getByTestId('my-flow-selected-day-overflow-note')).toContainText('+4');
  const selectedDayAfterOverflow = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayAfterOverflow?.y ?? 9999).toBeLessThan(220);
  const selectedDayBox = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((selectedDayBox?.x ?? 9999) + (selectedDayBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(selectedDayBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  const selectedDayFirstRow = page.getByTestId('my-flow-calendar-selected-day').locator('article').first();
  const selectedDayFirstRowBox = await selectedDayFirstRow.boundingBox();
  expect(selectedDayFirstRowBox?.height ?? 9999).toBeLessThanOrEqual(92);
  await expect(selectedDayFirstRow.getByTestId('my-flow-row-date-meta')).toBeHidden();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '이번 항목 완료' }).first()).toBeVisible();

  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const mobileScheduleContent = page.locator('.fc-daygrid-day[data-date="2026-05-28"] [data-testid="my-flow-calendar-schedule-content"]').first();
  const mobileScheduleRail = mobileScheduleContent.getByTestId('my-flow-calendar-schedule-rail');
  await expect(mobileScheduleContent).toBeVisible();
  await expect(mobileScheduleRail).toBeVisible();
  const railWidth = await mobileScheduleRail.evaluate((node) => node.getBoundingClientRect().width);
  expect(railWidth).toBeGreaterThanOrEqual(2);
});

test('my flow mobile checklist and routine tabs start from compact execution summaries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-checklist').click();
  const firstChecklistSummary = page.getByTestId('my-flow-checklist-summary-card').first();
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-checklist-picker')).toContainText('체크할 Flow를 먼저 선택하세요');
  await expect(page.getByTestId('my-flow-checklist-summary-card')).toHaveCount(4);
  await expect(firstChecklistSummary).toContainText('신축 아파트 입주 사전점검 Flow');
  await expect(firstChecklistSummary).toContainText('개 남음');
  await expect(firstChecklistSummary).not.toContainText('필요 없는 물건 정리하기');
  await expect(firstChecklistSummary.getByRole('button', { name: '체크 항목 열기' })).toBeVisible();
  await expect(page.getByTestId('my-flow-checklist-picker-toggle')).toContainText('체크 Flow 더 보기 14개');
  await page.getByTestId('my-flow-checklist-picker-toggle').click();
  await expect(page.getByTestId('my-flow-checklist-summary-card')).toHaveCount(18);
  await expect(page.getByTestId('my-flow-checklist-picker-toggle')).toContainText('체크 Flow 접기');

  await page.getByTestId('my-flow-view-routine').click();
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-routine-next-section')).toBeVisible();
  await expect(page.getByTestId('my-flow-routine-next-section')).toContainText('다음 루틴');
  await expect(page.getByTestId('my-flow-routine-next-card')).toHaveCount(3);
  await expect(page.getByTestId('my-flow-routine-next-card').first()).toContainText('2026-05-29');
  await expect(page.getByTestId('my-flow-routine-next-card').first()).toContainText('하루 20분 전신 홈트 Flow');
  await expect(page.getByTestId('my-flow-routine-next-card').nth(1)).toContainText('초보 러너 5km 4주 완주 Flow');
  await expect(page.getByTestId('my-flow-routine-next-card').nth(2)).toContainText('삼성 에어컨 계절 전 점검 Flow');
  await expect(page.getByTestId('my-flow-routine-next-section').locator('text=하루 20분 전신 홈트 Flow')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-routine-next-card').first().getByRole('button', { name: '이번 항목 완료' })).toBeVisible();
  await expect(page.getByTestId('my-flow-routine-next-card').first().getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-routine-next-card').first().getByTestId('my-flow-routine-progress-pill')).toContainText(/항목 \d+\/\d+/);
  await expect(page.getByTestId('my-flow-routine-board')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-routine-board-toggle')).toContainText('주간 루틴 보기 5개');
  await page.getByTestId('my-flow-routine-board-toggle').click();
  await expect(page.getByTestId('my-flow-routine-board')).toHaveCount(5);
  await expect(page.getByTestId('my-flow-routine-board-toggle')).toContainText('주간 루틴 접기');
});

test('my flow mobile status board opens actionable flow lists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-board')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-priority-section')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toContainText('찾아서 열기');
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText('Flow 찾기');
  await expect(page.getByTestId('my-flow-status-overdue')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-next')).toHaveCount(0);
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const inventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(18);
  await expect(inventorySheet.getByRole('button', { name: '완료 체크' })).toHaveCount(0);
  await inventorySheet.getByRole('button', { name: '닫기', exact: true }).click();

  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const openInventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(openInventorySheet).toBeVisible();
  await openInventorySheet.getByTestId('my-flow-list-filter-open').click();
  await expect(openInventorySheet.getByTestId('my-flow-list-filter-open')).toHaveAttribute('aria-pressed', 'true');
  await expect(openInventorySheet.getByTestId('my-flow-group-row')).toHaveCount(18);
});

test('my flow mobile ux20 limits large inventory before showing all flows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux20');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const inventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(8);
  await expect(inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle')).toContainText('전체 Flow 보기 30개');

  await inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle').click();
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(30);
  await expect(inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle')).toHaveCount(0);

  await inventorySheet.getByTestId('my-flow-list-filter-routine').click();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-routine')).toHaveAttribute('aria-pressed', 'true');
  const routineRows = await inventorySheet.getByTestId('my-flow-group-row').count();
  expect(routineRows).toBeGreaterThan(0);
  expect(routineRows).toBeLessThan(30);
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

  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toBeVisible();
  await expect(page.getByText('평균 소요 10개월')).toBeVisible();
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
  await expect(firstItem.getByText(/D-300 ·/)).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '메모' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '해당 없음' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '자세히' })).toBeVisible();
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench).toContainText('보증인원 변경 가능 기한');
  await expect(workbench.getByTestId('wedding-source-bridge')).toContainText('계약금/위약금');
  await expect(workbench).toContainText('하객 명단');
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

  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toBeVisible();
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toContainText('월간 캘린더 + 실행 리스트');
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();

  await page.goto('/f/study-exam-d30-plan');

  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toBeVisible();
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByText('회차 그리드')).toBeVisible();
  await expect(page.getByText('회차 기록표')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();

  for (const [slug, title] of [
    ['home-workout-20min', '하루 20분 전신 홈트 Flow'],
    ['english-study-30day-routine', '직장인 영어공부 30일 루틴 Flow'],
    ['car-care-monthly-routine', '월 1회 자동차 관리 루틴 Flow'],
  ] as const) {
    await page.goto(`/f/${slug}`);

    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
    await expect(page.getByText('회차 그리드')).toBeVisible();
    await expect(page.getByText('회차 기록표')).toBeVisible();
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
  await expect(workbench.getByText('콜리플라워미음', { exact: true })).toBeVisible();
  await expect(workbench.getByText('소고기미음', { exact: true })).toBeVisible();
  await expect(workbench.getByTestId('meal-source-bridge')).toContainText('3일 단위 새 재료');
  await expect(workbench.getByTestId('meal-source-bridge')).toContainText('쌀가루 20배죽');

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
  await expect(workbench).toContainText('시작일 기준 식단표');
  await expect(workbench).toContainText('원문에서 옮긴 실행 기준');
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
  await expect(sessionGrid.getByText(/1주차/).first()).toBeVisible();

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

  await expect(page.getByText('날짜 입력 없이 표에 필요한 값을 바로 채웁니다.')).toBeVisible();
  await expect(page.getByText('이 Flow는 날짜 입력이 필요 없는 체크리스트입니다.')).toBeVisible();
  await expect(page.getByText('표에 필요한 값을 채우고, 확인이 끝난 행만 완료로 표시하세요.')).toBeVisible();
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('button', { name: '캘린더 받기' })).not.toBeVisible();
  await expect(workbench.getByRole('button', { name: '메모/노션에 복사' })).toBeVisible();
});

test('used-car checklist shows decision preview instead of calendar by default', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 메모');
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench).toContainText('카히스토리');
  await expect(workbench).toContainText('자동차등록원부');
  await expect(workbench).toContainText('침수 흔적');
  await expect(workbench).toContainText('정비소 또는 전문가 점검');
  await expect(workbench).toContainText('계약서에 결함·보증·반품 조건');
  await expect(workbench.getByTestId('used-car-source-bridge')).toContainText('원문에서 옮긴 점검 순서');
  const decisionCard = workbench.getByTestId('used-car-decision-result-card');
  await expect(decisionCard).toContainText('점검 후 판단');
  await expect(decisionCard).toContainText('현장 체크가 끝나면 구매/보류/거절 중 하나만 남깁니다');
  await expect(decisionCard.getByRole('button', { name: '구매 진행' })).toBeVisible();
  await expect(decisionCard.getByRole('button', { name: '보류' })).toBeVisible();
  await expect(decisionCard.getByRole('button', { name: '거절' })).toBeVisible();
  await decisionCard.getByRole('button', { name: '보류' }).click();
  await expect(decisionCard.getByRole('button', { name: '보류' })).toHaveAttribute('aria-pressed', 'true');
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('공식 조회/사진 메모(선택)');
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
});

test('used-car first screen keeps hold memo and checklist before comparison density', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 메모');
  await expect(workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  const listTop = await workbench.getByTestId('artifact-list-card').evaluate((element) => element.getBoundingClientRect().top);
  const holdTop = await workbench.getByTestId('flow-hold-section').evaluate((element) => element.getBoundingClientRect().top);
  expect(listTop).toBeLessThan(holdTop);
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
  await expect(usedCarHold).toContainText('구매 보류 메모');
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

test('content flows studio renders saved execution previews for every candidate', async ({ page }) => {
  await page.goto('/content-flows');

  await expect(page.locator('body')).not.toContainText('고충실도');
  await expect(page.getByText('실행 UI').first()).toBeVisible();

  await expect(page.locator('body')).not.toContainText('P0');
  await expect(page.locator('body')).not.toContainText('P1');
  await expect(page.locator('body')).not.toContainText('P2');
  await expect(page.getByText('우선').first()).toBeVisible();
  await expect(page.getByText('검토').first()).toBeVisible();
  await expect(page.getByLabel('원문 대응 강도')).toContainText('대응 약함');
  await expect(page.getByLabel(/Flow 적합도 \d\.\d점/).first()).toBeVisible();
  await expect(page.getByTestId('content-flow-candidate').first().getByText(/적합 \d\.\d/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '활용 가능성 평가' })).toBeVisible();
  await expect(page.getByText('원문을 본 사용자가 이 Flow를 저장하고 실제로 실행할 수 있는지 남깁니다.')).toBeVisible();
  await expect(page.getByText('최우선 판정 질문')).toBeVisible();
  await expect(page.getByText('원문을 읽고 저장한 뒤, 생성된 캘린더/체크리스트/시트/메모만 보고도 다음 행동을 할 수 있는가?')).toBeVisible();
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('원문 → 실행 산출물 대응');
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('Flow에서 확인');
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('완료 기준:');
  await expect(page.getByText('원문 보고 바로 쓸 수 있음')).toBeVisible();
  await expect(page.getByText('원문 대비 실행이 막힘')).toBeVisible();
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('대표 검토 축');
  await expect(page.getByTestId('content-flow-coverage-group')).toHaveCount(7);
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('생활 전환');
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('서류/행정');

  await page.getByTestId('content-flow-coverage-group').filter({ hasText: '서류/행정' }).click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-flow-id', 'freelancer-income-tax-docs');

  await page.getByRole('button', { name: /반복 방지 신규 후보/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(8);

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="balcony-fall-vegetable-calendar"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('채소별 파종·수확 후보일');
  await expect(page.getByTestId('content-flow-sheet-surface')).toContainText('첫 수확 후보');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="self-wall-paint-weekend"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('셀프 페인팅');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('D-1 가구 이동과 바닥 보양');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="freelancer-income-tax-docs"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('자료 준비만 남긴 신고 전 체크 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('세무 판단');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="anydesk-remote-setup-check"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('누가 먼저 요청한 지원인지 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('일회성 지원은 수동 승인으로 진행');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('AnyDesk 주소/비밀번호/인증값 미저장 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('작업 후 세션 종료와 자동 접속 설정 확인');

  await page.getByRole('button', { name: /최근 다양화 후보/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(5);
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="first-kimjang-weekend-checklist"]')).toContainText(
    '초보 김장 주말 체크리스트',
  );
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="passport-renewal-online-pickup"]')).toContainText(
    '여권 재발급 온라인 신청·수령 준비',
  );

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="passport-renewal-online-pickup"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('방문 수령을 나누는 공식행정 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('여권번호, 주민등록번호, 결제 정보는 Flow에 저장하지 않습니다.');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="beginner-camping-packing-sheet"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('캠핑 준비물 시트 Flow');
  await expect(page.getByTestId('content-flow-sheet-surface')).toContainText('안전·조명');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="free-appliance-pickup-reservation"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('폐가전 방문수거 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수거 가능 품목 확인');

  await page.getByRole('button', { name: /제작자 자료 확장/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(5);
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="piano-carol-sheet-7day-practice"]')).toContainText(
    '아이 피아노 캐롤 악보 7일 연습',
  );
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="jeonse-contract-precheck-docs"]')).toContainText(
    '전세계약 전 서류 10단계 확인',
  );

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="jeonse-contract-precheck-docs"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('계약 전 확인·보류가 함께 보이는 전세 서류 체크 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('법률 판단');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('보류 사유');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="cat-adoption-first-week-setup"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('입양 전 공간 준비부터 첫 병원 질문까지');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수의사 확인');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="piano-carol-sheet-7day-practice"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('무료 악보 링크를 복제하지 않고 7일 연습 일정');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('악보 파일을 복제하지 않고');

  await page.getByRole('button', { name: '전체 후보' }).click();
  await page.getByLabel('원문 대응 강도').selectOption('weak');
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(2);
  await expect(page.getByTestId('content-flow-candidate').first()).toContainText('대응 약함');
  await page.getByTestId('content-flow-candidate').first().click();
  await expect(page.getByTestId('content-flow-preview-tab-save')).toContainText('보류 후보');
  await expect(page.getByTestId('content-flow-hold-review-note')).toContainText('보류 판정');
  await page.getByTestId('content-flow-preview-tab-save').click();
  await expect(page.getByTestId('content-flow-hold-candidate')).toContainText('현재 저장 후보 아님');
  await expect(page.getByTestId('content-flow-hold-candidate')).toContainText('원문 교체 또는 후보 제외가 먼저입니다');
  await page.getByLabel('원문 대응 강도').selectOption('전체');

  await page.getByLabel('원문 대응 강도').selectOption('needs_review');
  await expect.poll(async () => page.getByTestId('content-flow-candidate').count()).toBeGreaterThanOrEqual(12);
  await expect(page.getByTestId('content-flow-candidate').first()).toContainText('재검토 필요');
  await page.getByTestId('content-flow-candidate').first().click();
  await expect(page.getByTestId('content-flow-preview-tab-save')).toContainText('조건부 저장 검토');
  await expect(page.getByTestId('content-flow-conditional-review-note')).toContainText('조건부 검토');
  await page.getByTestId('content-flow-preview-tab-save').click();
  await expect(page.getByTestId('content-flow-conditional-candidate')).toContainText('조건부 저장 검토');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('조건 확인 후 저장 미리보기');
  await page.getByLabel('원문 대응 강도').selectOption('전체');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="remote-help-session-precheck"]').click();
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="remote-help-session-precheck"]')).toContainText('실행 UI');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('원격 도움 세션 권한 사전 체크');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('화면 공유만으로 충분한지 먼저 선택');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('접속값은 Flow에 저장하지 않습니다');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('세션 종료와 접근 정리');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="naver-search-advisor-site-readiness"]').click();
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="naver-search-advisor-site-readiness"]')).toContainText('실행 UI');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('Naver Search Advisor 사이트 준비 체크');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('사이트 단위와 접근권한 먼저 고르기');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('검증값은 Flow에 저장하지 않습니다');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('다시 볼 날짜 정하기');

  const ids = await page
    .getByTestId('content-flow-candidate')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-flow-id')).filter(Boolean));
  expect(ids.length).toBeGreaterThanOrEqual(32);

  const counts = { calendar: 0, sheet: 0, checklist: 0, decision: 0 };
  for (const id of ids) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-flow-id', id);
    await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-active-tab', 'execute');
    await expect(page.getByTestId('content-flow-execution-simulator')).toBeVisible();
    expect(await page.getByTestId('content-flow-detail-sheet-preview').locator('input[type="checkbox"]').count()).toBeGreaterThan(0);

    const hasSheet = (await page.getByTestId('content-flow-sheet-surface').count()) > 0;
    const hasChecklist = (await page.getByTestId('content-flow-checklist-surface').count()) > 0;
    const hasDecision = (await page.getByTestId('content-flow-decision-surface').count()) > 0;
    if (hasSheet) counts.sheet += 1;
    else if (hasChecklist) counts.checklist += 1;
    else if (hasDecision) counts.decision += 1;
    else {
      counts.calendar += 1;
      await expect(page.getByTestId('content-flow-simulated-calendar').locator('[data-selected="true"]')).toHaveCount(1);
    }
  }

  expect(counts.calendar + counts.sheet + counts.checklist + counts.decision).toBe(ids.length);
  expect(counts.calendar).toBeGreaterThan(0);
  expect(counts.sheet).toBeGreaterThan(0);
  expect(counts.checklist).toBeGreaterThan(0);
  expect(counts.decision).toBeGreaterThan(0);
});

test('content flows studio keeps the execution preview near the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/content-flows');

  await expect(page.getByRole('heading', { name: '원문을 Flow UI로 평가하기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '원문을 실제 Flow UI로 바꿔보고 평가하기' })).toHaveCount(0);

  const candidateList = page.getByTestId('content-flow-candidate-list');
  await expect(candidateList).toHaveAttribute('aria-label', 'Flow 콘텐츠 후보 선택');
  await expect(candidateList.getByTestId('content-flow-candidate').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(candidateList).toHaveClass(/snap-x/);
  await expect(candidateList.getByTestId('content-flow-candidate').first()).toHaveClass(/snap-start/);

  const tabList = page.getByTestId('content-flow-preview-tabs');
  await expect(tabList.getByRole('tab')).toHaveCount(4);
  await expect(tabList.getByRole('tab', { selected: true })).toHaveText('실행 화면');
  const tabLayout = await tabList.evaluate((element) => {
    const buttons = Array.from(element.querySelectorAll('button')).map((button) => button.getBoundingClientRect());
    return {
      firstTop: buttons[0]?.top ?? 0,
      secondTop: buttons[1]?.top ?? 0,
      thirdTop: buttons[2]?.top ?? 0,
      pageWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(Math.abs(tabLayout.firstTop - tabLayout.secondTop)).toBeLessThan(2);
  expect(tabLayout.thirdTop).toBeGreaterThan(tabLayout.firstTop + 8);
  expect(tabLayout.scrollWidth).toBeLessThanOrEqual(tabLayout.pageWidth + 1);

  const previewTop = await page.getByTestId('content-flow-high-fidelity').evaluate((element) => element.getBoundingClientRect().top);
  expect(previewTop).toBeLessThan(640);

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="anydesk-remote-setup-check"]').click();
  await page.waitForTimeout(350);
  const anydeskPreviewTop = await page.getByTestId('content-flow-high-fidelity').evaluate((element) => element.getBoundingClientRect().top);
  expect(anydeskPreviewTop).toBeLessThan(640);
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('누가 먼저 요청한 지원인지 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수동 승인');
});

test('content flows studio keeps source-specific execution details in representative previews', async ({ page }) => {
  await page.goto('/content-flows');

  const expectations: Record<string, string[]> = {
    'washer-tub-clean-monthly': ['문 열어 건조', '세제통', '고무패킹', '과탄산소다', '2주 간격'],
    'monstera-care-routine': ['밝은 간접광', '배수구멍', '겉흙 2~3cm', '체크 0/4', '오늘은 보류'],
    'wedding-12-month-timeline': ['D-300~D-180', '보증인원 변경 가능 기한', '계약금/위약금', '하객 명단', '식권', 'BGM', '역할 분담'],
    'water-purifier-filter-cycle': ['코크/출수구', '자가 살균', '물맛/냄새', '후카본'],
    'used-car-buying-check': ['자동차등록원부', '침수 흔적', '정비소 검수', '결함·보증·반품', '구매/보류/거절'],
    'plank-30-day-challenge': ['Day 7·19·27', 'Day 9', '호흡 3:3 패턴', 'Day 30 150초', '허리 통증'],
    'thankyou-bubu-no-jump-home-workout': ['점프 없음', '눕는 동작 없음', '원본 영상', '몸 상태 메모', '통증'],
  };

  for (const [id, terms] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const preview = page.getByTestId('content-flow-high-fidelity');
    await expect(preview).toHaveAttribute('data-flow-id', id);
    for (const term of terms) {
      await expect(preview).toContainText(term);
    }
  }
});

test('content flows wedding preview shows the full source-derived timeline without mixing future checks into the first date', async ({ page }) => {
  await page.goto('/content-flows');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="wedding-12-month-timeline"]').click();
  await page.getByTestId('content-flow-preview-tab-execute').click();

  const preview = page.getByTestId('content-flow-high-fidelity');
  await expect(preview).toHaveAttribute('data-flow-id', 'wedding-12-month-timeline');
  await expect(preview).toContainText('체크 0/5');

  const timelineList = page.getByTestId('content-flow-full-timeline-list');
  await expect(timelineList).toContainText('8단계 타임라인');
  await expect(timelineList).toContainText('웨딩홀 계약금·위약금 확인');
  await expect(timelineList).toContainText('식권·좌석·BGM 준비');
  await expect(timelineList).toContainText('본식 역할 분담 공유');

  const selectedDayPanel = page.getByTestId('content-flow-selected-day-panel');
  await expect(selectedDayPanel).toContainText('웨딩홀 후보 3곳 정리');
  await expect(selectedDayPanel).toContainText('보증인원 기준 입력');

  const detailSheet = page.getByTestId('content-flow-detail-sheet-preview');
  await expect(detailSheet).toContainText('보증인원 변경 가능 기한 확인');
  await expect(detailSheet).toContainText('계약금/위약금 규정 확인');
  await expect(detailSheet).not.toContainText('BGM 파일 확인 일정 만들기');
});

test('content flows washer preview keeps setup light and method details in memo', async ({ page }) => {
  await page.goto('/content-flows');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="washer-tub-clean-monthly"]').click();

  const traceRows = page.getByTestId('content-flow-source-trace-row');
  await expect(traceRows.filter({ hasText: '준비물이 달라진다' })).toContainText('내 세탁기 방식과 준비물 확인');
  await expect(traceRows.filter({ hasText: '준비물이 달라진다' })).toContainText('구매 링크');

  await page.getByTestId('content-flow-preview-tab-save').click();

  const savePreview = page.getByTestId('content-flow-high-fidelity');
  await expect(savePreview).toContainText('첫 실행일');
  await expect(savePreview).toContainText('반복 주기');
  await expect(savePreview).toContainText('선택 메모');
  await expect(savePreview).not.toContainText('준비물 메모');

  await page.getByTestId('content-flow-preview-tab-execute').click();
  const executionPreview = page.getByTestId('content-flow-high-fidelity');
  await expect(executionPreview).toContainText('체크 0/6');
  await expect(executionPreview).toContainText('과탄산소다 100g');
  await expect(executionPreview).toContainText('세탁 후 문 열어 건조');
  await expect(executionPreview).toContainText('냄새가 반복되면 다음 실행부터 2주 1회로 조정');
});

test('content flows studio links promoted candidates to matching public service flows', async ({ page }) => {
  await page.goto('/content-flows');

  const expectations: Record<string, string> = {
    'washer-tub-clean-monthly': '/f/washer-tub-clean-monthly',
    'monstera-care-routine': '/f/monstera-care-routine',
    'wedding-12-month-timeline': '/f/wedding-d180-basic',
    'water-purifier-filter-cycle': '/f/water-purifier-filter-cycle',
    'used-car-buying-check': '/f/used-car-buying-check',
    'plank-30-day-challenge': '/f/plank-30-day-challenge',
    'thankyou-bubu-no-jump-home-workout': '/f/real-thankyou-bubu-home-workout-starter',
    'japan-esim-setup-before-departure': '/f/japan-esim-setup-before-departure',
    'kids-dino-footprint-art': '/f/kids-dino-footprint-art',
    'banana-peanut-recipe-video': '/f/banana-peanut-recipe-video',
    'jeonse-contract-precheck-docs': '/f/jeonse-contract-precheck-docs',
    'elementary-school-entry-d30': '/f/elementary-school-entry-d30',
    'kids-printable-squishy-craft': '/f/kids-printable-squishy-craft',
    'remote-help-session-precheck': '/f/remote-help-session-precheck',
    'fridge-cleanout-weekly-plan': '/f/fridge-cleanout-weekly-plan',
  };

  for (const [id, href] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const link = page.getByTestId('content-flow-public-route-link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', href);
  }

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="lg-aircon-filter-biweekly"]').click();
  await expect(page.getByTestId('content-flow-public-route-link')).toHaveCount(0);
});

test('promoted content-flow service routes preserve executable source cues', async ({ page }) => {
  const expectations: Record<string, string[]> = {
    '/f/washer-tub-clean-monthly': ['문 열어 건조', '고무패킹', '세제통', '배수필터', '과탄산소다', '2주 1회'],
    '/f/monstera-care-routine': ['겉흙 2~3cm', '밝은 간접광', '배수구멍', '분갈이'],
    '/f/wedding-d180-basic': ['D-300~D-180', '보증인원', '계약금', '청첩장', '식권', 'BGM', '역할 분담'],
    '/f/water-purifier-filter-cycle': ['코크/출수구', '자가 살균', '물맛·냄새', 'RO/나노', '후카본'],
    '/f/used-car-buying-check': ['원문에서 옮긴 점검 순서', '자동차등록원부', '침수 흔적', '점검 후 판단', '구매/보류/거절'],
    '/f/plank-30-day-challenge': ['Day 7·19·27 휴식', 'Day 9 호흡 3:3 패턴', 'Day 30 150초', '허리 통증'],
    '/f/real-thankyou-bubu-home-workout-starter': ['원문에서 옮긴 실행 기준', '점프 없음', '눕는 동작 없음', '원본 영상 열기', '저장 후 남길 기록'],
    '/f/japan-esim-setup-before-departure': ['eSIM', '사용 가능 기기', '프로필', '현지 회선', '지도와 메신저'],
    '/f/kids-dino-footprint-art': ['공룡', '준비물', '발자국', '아이 말', '다음 놀이'],
    '/f/banana-peanut-recipe-video': ['바나나', '땅콩버터', '내열 용기', '원본 영상', '칼로리'],
    '/f/jeonse-contract-precheck-docs': ['시세', '등기부등본', '전세보증보험', '표준계약서', '확정일자', '보류 사유', '법률 판단'],
    '/f/elementary-school-entry-d30': ['취학통지', '예비소집', '먼저 살 물건', '학교 안내 전 보류', '네임스티커', '등교 동선', '입학식 가방'],
    '/f/kids-printable-squishy-craft': ['원문 도안 링크', '사용 조건', '도안 출력', '코팅 재료', '보호자가 미리 자를 부분', '완성 사진은 선택 메모', '다음 놀이 후보'],
    '/f/remote-help-session-precheck': ['요청자와 작업 범위', '화면 공유만으로 충분', '일회성 원격 제어', '접속값은 FlowMe에 저장하지 않기', '반복 접근', '세션 종료'],
    '/f/fridge-cleanout-weekly-plan': ['냉장고 지도', '우선 재료', '메뉴 후보', '장보기 보류', '상태', '장보기 전 메모'],
  };

  for (const [route, terms] of Object.entries(expectations)) {
    await page.goto(route);
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
    await expect(workbench).toBeVisible();
    if (route === '/f/used-car-buying-check') {
      await expect(page.locator('body')).toContainText('현장 체크 시작');
      await expect(page.locator('body')).toContainText('날짜 입력 없이 현장 체크리스트를 바로 엽니다.');
      await expect(page.locator('body')).not.toContainText('방문/시승일 기록');
    }
    if (route === '/f/jeonse-contract-precheck-docs') {
      await expect(page.locator('body')).toContainText('계약 예정일');
      await expect(page.locator('header')).toContainText('계약 일정 체크');
      await expect(page.locator('header')).not.toContainText('실행 체크리스트');
      await expect(workbench.getByTestId('jeonse-source-bridge')).toContainText('D-3');
      await expect(workbench.getByTestId('jeonse-source-bridge')).toContainText('D-Day');
      await expect(workbench.getByTestId('jeonse-source-bridge')).toContainText('D+1');
      await expect(workbench).toContainText('일정 보기');
      await expect(workbench).toContainText('전체 보기');
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('계약 전 서류 확인');
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('이 날의 체크 항목');
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('0/2 완료');
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('보류 사유 남기기');
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('주의할 점');
      await expect(workbench.getByTestId('jeonse-calendar-preview')).toContainText('캘린더 미리보기');
      await workbench.getByTestId('jeonse-calendar-preview').getByText('캘린더 미리보기').click();
      await expect(workbench.getByTestId('jeonse-calendar-preview')).toContainText('D-3');
      await expect(workbench.getByTestId('jeonse-calendar-preview')).toContainText('D-Day');
      await expect(workbench.getByTestId('jeonse-calendar-preview')).toContainText('D+1');
      await workbench.getByTestId('jeonse-source-bridge').getByRole('button', { name: /D-Day/ }).click();
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('계약서 정보 확인');
      await workbench.getByTestId('jeonse-source-bridge').getByRole('button', { name: /D\+1/ }).click();
      await expect(workbench.getByTestId('jeonse-selected-event-card')).toContainText('입주 후 보호 절차');
      await expect(workbench).toContainText('캘린더에 넣기');
      await workbench.getByRole('tab', { name: '전체 보기' }).click();
      await expect(workbench.getByTestId('jeonse-all-items')).toContainText('전체 체크 항목 7개');
      await expect(workbench.getByTestId('jeonse-all-items')).toContainText('0/2 완료');
      await expect(workbench.getByTestId('jeonse-all-items')).toContainText('상세 메모');
      await expect(workbench.getByTestId('jeonse-hold-decision-card')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('계약해도 됩니다');
      await expect(page.locator('body')).not.toContainText('계약 안전 점수');
      await expect(page.locator('body')).not.toContainText('전문가 확인 필요');
      await expect(page.locator('body')).not.toContainText('진행 상황은 이 브라우저에 자동 저장됩니다');
      await expect(page.getByLabel('Flow artifact preview')).toHaveCount(0);
      await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
      await expect(page.getByTestId('flow-source-card')).toHaveCount(0);
      await expect(page.getByTestId('flow-warning-card')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Flow 전환 방식');
      await expect(page.locator('body')).not.toContainText('제작자 자료 확장 후보');
    }
    if (route === '/f/fridge-cleanout-weekly-plan') {
      await expect(workbench.getByRole('heading', { name: '7일 재고 소진표' }).first()).toBeVisible();
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('우선 재료');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('메뉴 후보');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('장보기 보류');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('상태');
      await expect(workbench).toContainText('장보기 전 메모');
      await expect(workbench).toContainText('절약액이나 영양 균형은 계산하지 않습니다');
      await expect(workbench).not.toContainText('운동');
      await expect(workbench).not.toContainText('측정');
      await expect(page.locator('body')).not.toContainText('칼로리');
      await expect(page.locator('body')).not.toContainText('체중 감량');
      await expect(page.locator('body')).not.toContainText('보장합니다');
    }
    for (const term of terms) {
      await expect(workbench).toContainText(term);
    }
  }
});

test('promoted maintenance routes use source-specific artifact workbenches', async ({ page }) => {
  for (const route of ['/f/washer-tub-clean-monthly', '/f/monstera-care-routine']) {
    await page.goto(route);
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });

    await expect(workbench.getByRole('heading', { name: '관리 캘린더' })).toBeVisible();
    await expect(workbench).toContainText('관리일');
    await expect(workbench.getByTestId('maintenance-source-bridge')).toContainText('원문에서 옮긴 실행 단서');
    await expect(workbench.getByTestId('maintenance-source-bridge').getByRole('link', { name: '원문 보기' })).toBeVisible();
    await expect(workbench).not.toContainText('반복 요일');
    await expect(workbench).not.toContainText('회차');
    await expect(workbench.getByTestId('maintenance-routine-checklist-card')).toBeVisible();
    await expect(workbench.getByTestId('maintenance-routine-next-card')).toBeVisible();
    await expect(workbench.getByTestId('routine-session-log-card')).toHaveCount(0);
    await expect(workbench.getByTestId('routine-today-session-card')).toHaveCount(0);
    await expect(page.locator('body')).toContainText('반복 주기');
    await expect(page.locator('body')).not.toContainText('반복 요일');
    await expect(page.locator('body')).not.toContainText('회차 메모');
    await expect(page.locator('body')).not.toContainText('운동·습관 크리에이터');
    await expect(page.getByTestId('source-fit-status')).toHaveCount(0);
  }

  await page.goto('/f/washer-tub-clean-monthly');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('통세척/통살균 코스');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('월 1회 관리일');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('과탄산소다');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('2주 1회');

  await page.goto('/f/monstera-care-routine');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('겉흙 2~3cm');
  await expect(page.getByTestId('maintenance-source-bridge')).toContainText('상태 확인일');
  await expect(page.getByTestId('maintenance-result-selector')).toContainText('오늘 결과');
  await expect(page.getByTestId('maintenance-result-selector')).toContainText('물주기 완료');
  await expect(page.getByTestId('maintenance-result-selector')).toContainText('오늘은 보류');
  await expect(page.getByTestId('maintenance-result-selector')).toContainText('관찰 메모');
  await page.getByTestId('maintenance-result-selector').getByRole('button', { name: '오늘은 보류' }).click();
  await expect(page.getByTestId('maintenance-result-selector').getByRole('button', { name: '오늘은 보류' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toContainText('1~2년마다');
  await expect(page.locator('body')).not.toContainText('6개월마다');

  await page.goto('/f/water-purifier-filter-cycle');
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });

  await expect(page.locator('body')).toContainText('필터 주기표 작성');
  await expect(page.locator('body')).toContainText('실행 시트');
  await expect(page.locator('body')).toContainText('6개 행');
  await expect(page.locator('body')).toContainText('날짜 입력 없이 표에 필요한 값을 바로 채웁니다.');
  await expect(page.locator('body')).toContainText('표에 필요한 값을 채우고, 확인이 끝난 행만 완료로 표시하세요.');
  await expect(page.locator('body')).not.toContainText('바로 체크 시작');
  await expect(page.locator('body')).not.toContainText('체크리스트 6개 항목');
  await expect(page.locator('body')).not.toContainText('가전 관리 · 실행 체크리스트');
  await expect(page.locator('body')).not.toContainText('날짜 입력 없이 바로 확인합니다.');
  await expect(page.locator('body')).not.toContainText('아래 항목을 하나씩 확인하고 완료한 것은 체크하세요.');
  await expect(workbench.getByTestId('artifact-log-table-water-purifier-filter-cycle-log')).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-water-purifier-filter-cycle-log')).toContainText('후카본');
  await expect(workbench.getByTestId('water-purifier-source-bridge')).toContainText('후카본');
  await expect(workbench.getByTestId('water-purifier-source-bridge')).toContainText('원문 9~12개월');
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(page.getByTestId('source-fit-status')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('반복 리마인더');
  await expect(page.locator('body')).not.toContainText('측정, 운동, 리뷰');
  await expect(page.locator('body')).not.toContainText('MOBILE SUMMARY');
  await expect(page.locator('body')).toContainText('가장 먼저 확인할 필터');
});

test('plank challenge public route lets users compare the source table with the execution calendar', async ({ page }) => {
  await page.goto('/f/plank-30-day-challenge');

  await expect(page.getByRole('heading', { name: '30일 플랭크 챌린지 Flow' })).toBeVisible();
  await expect(page.getByTestId('flow-source-card')).toContainText('플랭크 30일 챌린지 계획표 공유');
  await expect(page.getByTestId('flow-source-card')).toContainText('Day별 목표 초수');
  await expect(page.getByTestId('flow-warning-card')).toContainText('운동 효과를 보장하지 않습니다');

  await page.getByLabel('챌린지 시작일').fill('2026-06-01');
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('plank-source-bridge')).toContainText('Day 7·19·27 휴식');
  await expect(workbench.getByTestId('plank-source-bridge')).toContainText('Day 9 호흡 3:3 패턴');
  await expect(workbench.getByTestId('plank-source-bridge')).toContainText('Day 30 150초');
  await expect(workbench.getByTestId('artifact-list-card').getByRole('heading', { name: '30일 실행표' })).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card').locator('input[aria-label^="실행판 체크:"]')).toHaveCount(30);
  await expect(workbench.getByTestId('artifact-list-card')).toContainText('Day 1 플랭크 20초');
  await expect(workbench.getByTestId('artifact-list-card')).toContainText('Day 7 휴식·스트레칭');
  await expect(workbench.getByTestId('artifact-list-card')).toContainText('Day 9 플랭크 55초');
  await expect(workbench.getByTestId('artifact-list-card')).toContainText('호흡 3:3 패턴');
  await expect(workbench.getByTestId('artifact-list-card')).toContainText('Day 30 플랭크 150초');
  await expect(workbench.getByTestId('artifact-calendar-card')).toContainText('Day 30 플랭크 150초');
  await expect(workbench).toContainText('허리 통증');
  await expect(workbench.getByRole('link', { name: '원문 보기' })).toBeVisible();
});

test('promoted public routes bring the executable artifact into the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/f/water-purifier-filter-cycle',
    '/f/wedding-d180-basic',
    '/f/used-car-buying-check',
    '/f/plank-30-day-challenge',
    '/f/elementary-school-entry-d30',
    '/f/kids-printable-squishy-craft',
    '/f/fridge-cleanout-weekly-plan',
  ]) {
    await page.goto(route);

    const workbenchTop = await page.getByRole('region', { name: 'Flow artifact workbench' }).evaluate((element) => element.getBoundingClientRect().top);
    expect(workbenchTop).toBeLessThan(640);
  }
});

test('promoted maintenance mobile routes show the date checklist before the next-date card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/f/washer-tub-clean-monthly', '/f/monstera-care-routine']) {
    await page.goto(route);

    const checklistTop = await page.getByTestId('maintenance-routine-checklist-card').evaluate((element) => element.getBoundingClientRect().top);
    const nextCardTop = await page.getByTestId('maintenance-routine-next-card').evaluate((element) => element.getBoundingClientRect().top);
    const firstCheckTop = await page.getByLabel(/관리 체크:/).first().evaluate((element) => element.getBoundingClientRect().top);

    expect(checklistTop).toBeLessThan(nextCardTop);
    expect(firstCheckTop).toBeLessThan(844);
  }
});

test('content flows studio brings representative artifacts into the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/content-flows');

  const expectations: Record<string, string> = {
    'wedding-12-month-timeline': 'content-flow-simulated-calendar',
    'water-purifier-filter-cycle': 'content-flow-sheet-surface',
    'used-car-buying-check': 'content-flow-decision-surface',
    'plank-30-day-challenge': 'content-flow-simulated-calendar',
  };

  for (const [id, testId] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const artifactTop = await page.getByTestId(testId).evaluate((element) => element.getBoundingClientRect().top);
    expect(artifactTop).toBeLessThan(840);
  }
});

test('content flows studio sends review notes to the repo-backed review API', async ({ page }) => {
  let postedPayload: Record<string, unknown> | null = null;

  await page.route('**/api/content-flow-review', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ generatedAt: '2026-06-02', updatedAt: null, reviews: {} }),
      });
      return;
    }

    postedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, review: { ...postedPayload, updatedAt: '2026-06-06T00:00:00.000Z' } }),
    });
  });

  await page.goto('/content-flows');
  const selectedId = await page.getByTestId('content-flow-high-fidelity').getAttribute('data-flow-id');
  await page.getByTestId('content-flow-rating-4').click();
  await page.locator('aside').filter({ has: page.getByTestId('content-flow-review-save') }).locator('input[type="checkbox"]').first().check();
  await page.locator('textarea').fill('실제 실행 화면 기준으로 판단 가능');
  await page.getByTestId('content-flow-review-save').click();

  await expect.poll(() => postedPayload?.flowId).toBe(selectedId);
  expect(postedPayload?.rating).toBe(4);
  expect(postedPayload?.keep).toBe(true);
  expect(postedPayload?.memo).toBe('실제 실행 화면 기준으로 판단 가능');
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
  await expect(inventory.getByText('44', { exact: true }).first()).toBeVisible();
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
  await expect(needsReviewPriority.getByText('0', { exact: true }).first()).toBeVisible();
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
  await expect(sourceFitAudit.getByText('카탈로그 미리보기 5')).toBeVisible();
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
  const workoutSourceBridge = workbench.getByTestId('exact-video-source-bridge');
  await expect(workoutSourceBridge).toContainText('원문에서 옮긴 실행 기준');
  await expect(workoutSourceBridge).toContainText('점프 없음');
  await expect(workoutSourceBridge).toContainText('눕는 동작 없음');
  await expect(workoutSourceBridge).toContainText('원본 영상을 열고, 정한 요일에 1회 실행합니다');
  await expect(workoutSourceBridge).toContainText('저장 후 남길 기록');
  await expect(workoutSourceBridge.getByRole('link', { name: '원본 영상 열기' })).toHaveAttribute('href', /youtube\.com\/watch\?v=pcyrlkHXAdE/);
  const workoutResultCard = workbench.getByTestId('exact-video-result-card');
  await expect(workoutResultCard).toContainText('오늘 결과');
  await expect(workoutResultCard).toContainText('운동 후 기록');
  await expect(workoutResultCard.getByRole('button', { name: '완료' })).toBeVisible();
  await expect(workoutResultCard.getByRole('button', { name: '강도 낮춤' })).toBeVisible();
  await expect(workoutResultCard.getByRole('button', { name: '휴식으로 변경' })).toBeVisible();
  await expect(workoutResultCard.getByLabel('운동 후 몸 상태 메모')).toBeVisible();
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
