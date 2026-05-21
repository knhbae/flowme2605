import { expect, test } from '@playwright/test';

test('home presents FLOW as an executable content platform', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '경험을 바로 따라 할 수 있는 Flow로' })).toBeVisible();
  await expect(page.getByText('바로 따라할 수 있는 Flow')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flow 둘러보기' })).toBeVisible();
  await expect(page.getByRole('link', { name: '내 콘텐츠로 만들기' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '#D-Day 준비' })).toHaveAttribute('href', '/flows?tag=D-Day%20%EC%A4%80%EB%B9%84');
  await expect(page.getByText('시험 D-30 공부 계획 Flow').first()).toBeVisible();
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
  await expect(page.getByText(/실행 [0-9,]+/).first()).toBeVisible();
  await expect(page.getByText('#D-Day 준비').first()).toBeVisible();
});

test('flow card title opens the public execution page', async ({ page }) => {
  await page.goto('/flows?tag=D-Day%20%EC%A4%80%EB%B9%84');

  await page.getByRole('link', { name: '시험 D-30 공부 계획 Flow' }).click();

  await expect(page).toHaveURL(/\/f\/study-exam-d30-plan/);
  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: '제작자 스튜디오' })).toBeVisible();
  await expect(page.getByText('현재 사용자 · 제작자')).toBeVisible();
  await expect(page.getByRole('link', { name: '내 제작자 프로필' })).toHaveAttribute('href', '/u/my-flow-studio');
  await expect(page.getByText('아직 내 Flow가 없습니다')).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  await page.getByRole('button', { name: '내 Flow로 복사해 수정' }).click();
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
  await expect(page.getByText('200+')).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /ThankyouBUBU/ })).toBeVisible();
  await expect(page.getByText('실행성 점수').first()).toBeVisible();
});

test('preview creator channel supports browsing 20+ flowified entries', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByRole('heading', { name: '삼성전자서비스' })).toBeVisible();
  await expect(page.getByText('Flow화 콘텐츠')).toBeVisible();
  await expect(page.getByText('20').first()).toBeVisible();
  await expect(page.getByText('출처 커버리지')).toBeVisible();
  await expect(page.getByText('채널 Flow 라이브러리')).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).toBeVisible();
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

  await expect(page.getByText('예시 날짜로 미리보기')).toBeVisible();
  await expect(page.getByText('1. 기준 날짜 선택')).toBeVisible();
  await expect(page.getByText('2. 바로 실행')).toBeVisible();
  await expect(page.getByText('3. 저장/공유')).toBeVisible();
  await expect(page.getByRole('button', { name: '내 일정표 엑셀로 받기' })).toBeVisible();
  await expect(page.getByText('by FLOW 큐레이션팀')).toBeVisible();
  await expect(page.getByText(/복사 [0-9,]+/).first()).toBeVisible();
  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel('이사일').fill('2026-07-15');
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toBeVisible();
  await expect(page.getByText('추천 다음 항목')).toBeVisible();
  await expect(page.getByRole('heading', { name: '전체 흐름' })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toBeVisible();
  await expect(page.getByRole('button', { name: '전체 할 일' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'D-30 큰 준비', exact: true })).toBeVisible();
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toBeVisible();
  await page.getByRole('button', { name: '주별 보기' }).click();
  await expect(page.getByText('월', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('화', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '달력 보기' }).click();
  await expect(page.getByRole('heading', { name: '2026-06' })).toBeVisible();
  await expect(page.getByText('이번 달 핵심').first()).toBeVisible();
  await expect(page.getByText('월', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('일', { exact: true }).first()).toBeVisible();

  await page.getByText('이사 방식 정하기').first().click();
  await page.getByText('이사할 집 하자 점검하기').first().click();
  await expect(page.getByText('2 / 24').first()).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '내 일정표 엑셀로 받기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('moving-d30-basic.xlsx');
});

test('new flow creation keeps advanced settings secondary', async ({ page }) => {
  await page.goto('/flows/new');

  await expect(page.getByText('고급 설정')).toBeVisible();
  await expect(page.getByText('목표일 기준으로 준비하기')).toBeVisible();
  await expect(page.getByText('매일·매주 반복하기')).toBeVisible();
  await expect(page.getByText('식단·레시피로 구성하기')).toBeVisible();
});

test('meal plan flow exposes recipe and reaction log', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel('이유식 시작일').fill('2026-06-01');
  await expect(page.getByText('2026-06-01 ~ 2026-06-03')).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toBeVisible();
  await page.getByRole('button', { name: '레시피' }).click();
  await expect(page.getByText('연결된 식단').first()).toBeVisible();
  await expect(page.getByText('D+0~D+2 / 2026-06-01 ~ 2026-06-03')).toBeVisible();

  await page.getByRole('button', { name: '달력 보기' }).click();
  await expect(page.getByText('쌀미음 1일차', { exact: true })).toBeVisible();
  await expect(page.getByText('쌀미음 2일차', { exact: true })).toBeVisible();
  await expect(page.getByText('쌀미음 3일차', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '전체 할 일' }).click();
  await page.getByText('레시피 보기').first().click();
  await expect(page.getByText('쌀 또는 쌀가루', { exact: true })).toBeVisible();

  const reactionLog = page.getByTestId('reaction-log-meal-rice-0');
  await reactionLog.locator('summary').click();
  await expect(reactionLog.getByLabel('먹은 양')).toBeVisible();
});

test('duration calendar checks only one day at a time', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel('이유식 시작일').fill('2026-06-01');
  await page.getByRole('button', { name: '달력 보기' }).click();

  const firstDay = page.locator('label').filter({ hasText: '쌀미음 1일차' }).first();
  const secondDay = page.locator('label').filter({ hasText: '쌀미음 2일차' }).first();

  await firstDay.getByRole('checkbox').check();

  await expect(firstDay.getByRole('checkbox')).toBeChecked();
  await expect(secondDay.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByText('1 / 18').first()).toBeVisible();
});

test('routine flow highlights weekly routine setup', async ({ page }) => {
  await page.goto('/f/running-5k-4week');

  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel('운동 시작일').fill('2026-06-01');

  await expect(page.getByText('이번 주 루틴 설정')).toBeVisible();
  await expect(page.getByText('운동 요일').first()).toBeVisible();
  await expect(page.getByText('첫 루틴 미리보기')).toBeVisible();
});

test('public flow can be copied into an editable draft', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByRole('button', { name: '내 Flow로 복사해 수정' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
  await expect(page.getByText('초안 Flow')).toBeVisible();
});

test('flow lab shows converted pilot and scale validation boards', async ({ page }) => {
  await page.goto('/flow-lab');

  await expect(page.getByRole('heading', { name: '실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증' })).toBeVisible();
  await expect(page.getByText('3 x 4 파일럿 검증')).toBeVisible();
  await expect(page.getByText('B 파일럿 실제 Flow 변환')).toBeVisible();
  await expect(page.getByText('200+ 제작자 채널 Flow 검증')).toBeVisible();
  await expect(page.getByText('10 converted')).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스 에어컨/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /자동차검사 준비/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Q-Net 원서접수/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /다이어트 식단·운동 기록/ })).toBeVisible();
});

test('representative real content pilot flows are executable', async ({ page }) => {
  await page.goto('/f/samsung-aircon-seasonal-check');
  await expect(page.getByRole('heading', { name: /에어컨/ })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toBeVisible();
  await expect(page.getByRole('link', { name: '삼성전자서비스 Samsung Care+ 에어컨 관리 안내' }).first()).toHaveAttribute(
    'href',
    'https://www.samsungsvc.co.kr/info/carePlus',
  );
  await expect(page.getByRole('button', { name: '내 날짜 입력' })).toBeVisible();
  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel('시작일').fill('2026-06-01');
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toBeVisible();
  await expect(page.getByText('2026-06-01').first()).toBeVisible();
  await page.locator('label').filter({ hasText: '전원 연결과 리모컨 배터리 확인하기' }).first().click();
  await expect(page.getByText('1 / 8').first()).toBeVisible();

  await page.goto('/f/qnet-exam-application-prep');
  await expect(page.getByRole('heading', { name: /Q-Net/ })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Q-Net 원서접수 안내' }).first()).toHaveAttribute(
    'href',
    'https://q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103&rcvPFlag=Y',
  );
  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel(/^기준 종료일$/).fill('2026-07-15');
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
});
