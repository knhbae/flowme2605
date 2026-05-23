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
  await page.getByLabel('완료: 이사 방식 정하기').check();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '진행 중인 Flow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toBeVisible();
  await expect(page.getByText('1 / 24 완료')).toBeVisible();
  await expect(page.getByRole('link', { name: '이어서 하기' })).toHaveAttribute('href', '/f/moving-d30-basic');

  await page.goto('/f/moving-d30-basic');
  await page.getByRole('button', { name: '내 버전 만들기' }).click();
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

  await expect(page.getByRole('heading', { name: '내 도구에 들어간 모습' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '캘린더에 이미 들어간 운동 일정' })).toBeVisible();
  await expect(page.getByText('추천 리듬: 주 3회')).toBeVisible();
  await expect(page.getByText('시작일', { exact: true })).toBeVisible();
  await expect(page.getByText('운동 요일')).toBeVisible();
  await expect(page.getByText('월간 미리보기', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /영상 열기/ })).toBeVisible();
  await expect(page.getByText('캘린더 일정으로 시작')).toHaveCount(0);
  await expect(page.getByText('1. 요일 정하기')).toHaveCount(0);
  await expect(page.getByText('2. 오늘 실행 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내 Flow로 수정')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '실행 항목' })).toBeVisible();
  const schedulePreview = page.getByRole('region', { name: '이번 주 등록 미리보기' });
  await expect(schedulePreview).toBeVisible();
  await expect(schedulePreview.getByText('월요일')).toBeVisible();
  await expect(schedulePreview.getByText('수요일')).toBeVisible();
  await expect(schedulePreview.getByText('금요일')).toBeVisible();
  await expect(page.getByText('한눈에 보는 전체 루트')).toHaveCount(0);
  await expect(page.getByText('이번 주 루틴 설정')).toHaveCount(0);
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '캘린더에 넣기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '엑셀 실행표 받기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '초보' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '절반' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 루틴' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByText('weekly')).toHaveCount(0);

  const calendarDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '캘린더에 넣기' }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe('real-thankyou-bubu-video-full-body-no-jump.ics');

  const excelDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '엑셀 실행표 받기' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('real-thankyou-bubu-video-full-body-no-jump.xlsx');
});

test('diet exact video flow uses application language instead of workout scheduling', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  await expect(page.getByRole('heading', { name: '식사 체크표에 이미 들어간 적용 Flow' })).toBeVisible();
  await expect(page.getByText('추천 리듬: 매일')).toBeVisible();
  await expect(page.getByRole('heading', { name: '일별 적용 체크표' })).toBeVisible();
  await expect(page.getByText('오늘 적용 기준만 고르기')).toHaveCount(0);
  await expect(page.getByText('1. 적용일 정하기')).toHaveCount(0);
  await expect(page.getByText('적용 요일').first()).toBeVisible();
  await expect(page.getByText('운동 요일')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 루틴' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '캘린더에 넣기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '메모/노션에 복사' })).toBeVisible();
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
  await expect(page.getByText('월별 달력 preview')).toBeVisible();
  await expect(page.getByText('실행 리스트 미리보기')).toBeVisible();
  await expect(page.getByText('이사 방식 정하기').first()).toBeVisible();
  await expect(page.getByText('2. 실행 항목 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내보내기와 백업')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  await expect(page.getByRole('button', { name: '내 일정표 엑셀로 받기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '내 일정표 엑셀로 받기' })).toBeDisabled();
  await expect(page.getByText('by FLOW 큐레이션팀')).toBeVisible();
  await expect(page.getByText('베타 운영 중').first()).toBeVisible();
  await page.getByLabel('이사일').fill('2026-07-15');
  await expect(page.getByText('이사일: 2026-07-15')).toBeVisible();
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '전체 흐름' })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 할 일' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'D-30 큰 준비', exact: true })).toHaveCount(0);
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '달력 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  await page.getByRole('button', { name: '월별 달력' }).click();
  await expect(page.getByRole('heading', { name: '2026-06' })).toBeVisible();
  await expect(page.getByText('이번 달 핵심').first()).toBeVisible();
  await expect(page.getByText('월', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('일', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '전체 할 일' }).click();
  await page.getByRole('checkbox', { name: /이사 방식 정하기/ }).first().check();
  await page.getByRole('checkbox', { name: /이사할 집 하자 점검하기/ }).first().check();
  await expect(page.getByText('2 / 24').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '내 일정표 엑셀로 받기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('moving-d30-basic.xlsx');
});

test('source-fit decisions are visible on direct-access public flow pages', async ({ page }) => {
  await page.goto('/f/study-exam-d30-plan');
  await expect(page.getByTestId('source-fit-status')).toHaveAttribute('data-decision', 'catalog_preview_only');

  await page.goto('/f/running-5k-4week');
  await expect(page.getByTestId('source-fit-status')).toHaveAttribute('data-decision', 'reshape_before_featured');
});

test('mobile export actions open from a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByRole('checkbox', { name: /이사 방식 정하기/ }).first().check();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const mobileBar = page.getByTestId('mobile-export-bar');
  await expect(mobileBar).toBeVisible();
  await expect(mobileBar.getByText('1 / 24')).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: '내보내기' })).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
  await expect(mobileBar.getByRole('button', { name: '엑셀 받기' })).toHaveCount(0);

  await mobileBar.getByRole('button', { name: '내보내기' }).click();

  const sheet = page.getByTestId('mobile-export-sheet');
  await expect(sheet.getByRole('heading', { name: '내보내기와 백업' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '텍스트로 복사' })).toBeEnabled();
  await expect(sheet.getByRole('button', { name: '엑셀로 받기' })).toBeEnabled();
  await expect(sheet.getByRole('button', { name: '캘린더 파일 받기' })).toBeEnabled();
  await expect(sheet.getByRole('button', { name: '내 버전 만들기' })).toBeEnabled();

  await sheet.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByTestId('mobile-export-sheet')).toHaveCount(0);
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
  await expect(firstItem.getByRole('button', { name: '메모 추가' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '해당 없음' })).toBeVisible();
  await expect(firstItem.getByRole('button', { name: '자세히' })).toBeVisible();
  await firstItem.getByLabel('완료: 예식 날짜와 예상 하객 규모 정하기').check();
  await firstItem.getByRole('button', { name: '메모 추가' }).click();
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
  await expect(page.getByText('반복 달력 preview')).toBeVisible();
  await expect(page.getByText('한 회차에 하는 일')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();

  for (const [slug, title] of [
    ['home-workout-20min', '하루 20분 전신 홈트 Flow'],
    ['english-study-30day-routine', '직장인 영어공부 30일 루틴 Flow'],
    ['car-care-monthly-routine', '월 1회 자동차 관리 루틴 Flow'],
  ] as const) {
    await page.goto(`/f/${slug}`);

    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
    await expect(page.getByText('반복 달력 preview')).toBeVisible();
    await expect(page.getByText('한 회차에 하는 일')).toBeVisible();
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

test('meal plan flow exposes recipe and reaction log', async ({ page }) => {
  await page.goto('/f/baby-food-menu-recipe');

  await page.getByLabel('이유식 시작일').fill('2026-06-01');
  await expect(page.getByText('2026-06-01 ~ 2026-06-03')).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '달력 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  await page.getByRole('button', { name: '레시피' }).click();
  await expect(page.getByText('연결된 식단').first()).toBeVisible();
  await expect(page.getByText('D+0~D+2 / 2026-06-01 ~ 2026-06-03')).toBeVisible();

  await page.getByRole('button', { name: '월별 달력' }).click();
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

  await page.getByLabel('이유식 시작일').fill('2026-06-01');
  await page.getByRole('button', { name: '월별 달력' }).click();

  const firstDay = page.locator('label').filter({ hasText: '쌀미음 1일차' }).first();
  const secondDay = page.locator('label').filter({ hasText: '쌀미음 2일차' }).first();

  await firstDay.getByRole('checkbox').check();

  await expect(firstDay.getByRole('checkbox')).toBeChecked();
  await expect(secondDay.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByText('1 / 18').first()).toBeVisible();
});

test('routine flow highlights weekly routine setup', async ({ page }) => {
  await page.goto('/f/running-5k-4week');

  await expect(page.getByText('반복 달력 preview')).toBeVisible();
  await expect(page.getByText('한 회차에 하는 일')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toBeVisible();
  await page.getByLabel('운동 시작일').fill('2026-06-01');

  await expect(page.getByText('추천 다음 항목')).toHaveCount(0);
  await expect(page.getByText('이번 주 루틴 설정')).toBeVisible();
  await expect(page.getByText('운동 요일').first()).toBeVisible();
  await expect(page.getByText('첫 루틴 미리보기')).toBeVisible();
  await expect(page.getByText('리셋 규칙')).toBeVisible();
  await expect(page.getByText('놓친 날은 부채로 쌓지 않고 다음 가능한 세션부터 다시 시작합니다.')).toBeVisible();
  await page.getByRole('button', { name: '월별 달력' }).click();
  await expect(page.getByText('루틴 회차')).toBeVisible();
  await expect(page.getByText('1회차').first()).toBeVisible();

  await page.getByRole('button', { name: '전체 루틴' }).click();
  await page.locator('[data-testid="flow-item-card"]').first().getByRole('checkbox').check();
  await expect(page.getByText('추천 다음 항목')).toBeVisible();
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
  await expect(page.getByRole('button', { name: '캘린더 파일 받기' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: '체크리스트 복사하기' })).toBeVisible();
});

test('used-car checklist shows decision preview instead of calendar by default', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  await expect(page.getByText('후보 비교 preview')).toBeVisible();
  await expect(page.getByText('현장에서 바로 체크')).toBeVisible();
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(page.getByText('총예산을 차량가, 이전비, 보험료, 정비비로 나누기').first()).toBeVisible();
});

test('representative flows show artifact-first previews on the first screen', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let artifactPreview = page.getByLabel('Flow artifact preview');
  await expect(artifactPreview).toBeVisible();
  await expect(artifactPreview).toContainText('실행 리스트');
  await expect(artifactPreview).toContainText('월간 캘린더');

  await page.goto('/f/used-car-buying-check');
  artifactPreview = page.getByLabel('Flow artifact preview');
  await expect(artifactPreview).toBeVisible();
  await expect(artifactPreview).toContainText('후보 비교표');
  await expect(artifactPreview).toContainText('현장 체크리스트');

  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');
  artifactPreview = page.getByLabel('Flow artifact preview');
  await expect(artifactPreview).toBeVisible();
  await expect(artifactPreview).toContainText('반복 캘린더');
  await expect(artifactPreview).toContainText('회차 메모');

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  artifactPreview = page.getByLabel('Flow artifact preview');
  await expect(artifactPreview).toBeVisible();
  await expect(artifactPreview).toContainText('기록표');
  await expect(artifactPreview).toContainText('반복 리마인더');
});

test('artifact workbench shows the primary usable surface first', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('내 실행판');
  await expect(workbench).toContainText('전체 할 일');
  await expect(workbench).toContainText('월간 캘린더');

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('후보 비교표');
  await expect(workbench.getByLabel('후보 1 이름')).toBeVisible();

  await page.goto('/f/home-workout-20min');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('반복 캘린더');
  await expect(workbench).toContainText('회차');

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('기록표');
  await expect(workbench).toContainText('식단');
  await expect(workbench).toContainText('운동');
  await expect(workbench).toContainText('측정');
  await expect(workbench).toContainText('컨디션');
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
  await reloadedMovingWorkbench.getByLabel('후보 1 이름').fill('한빛이사');
  await reloadedMovingWorkbench.getByLabel('이사 업체 견적 금액 / 후보 1 메모').fill('포장이사 85만원');
  await reloadedMovingWorkbench.getByLabel('견적서/계약서 위치').fill('문자 견적 캡처');

  await page.reload();
  const restoredMovingWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredMovingWorkbench.getByLabel('후보 1 이름')).toHaveValue('한빛이사');
  await expect(restoredMovingWorkbench.getByLabel('이사 업체 견적 금액 / 후보 1 메모')).toHaveValue('포장이사 85만원');
  await expect(restoredMovingWorkbench.getByLabel('견적서/계약서 위치')).toHaveValue('문자 견적 캡처');

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
  await logWorkbench.getByLabel(/식단$/).first().fill('현미밥, 닭가슴살, 샐러드');
  await logWorkbench.getByLabel('주간 리뷰 메모').fill('저녁 탄수화물을 절반으로 줄여보기');

  await page.reload();
  const reloadedLogWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(reloadedLogWorkbench.getByLabel(/식단$/).first()).toHaveValue('현미밥, 닭가슴살, 샐러드');
  await expect(reloadedLogWorkbench.getByLabel('주간 리뷰 메모')).toHaveValue('저녁 탄수화물을 절반으로 줄여보기');
});

test('decision flow comparison table edits and persists candidate notes', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  await expect(page.getByLabel('후보 1 이름')).toBeVisible();
  await page.getByLabel('후보 1 이름').fill('아반떼 2021');
  await page.getByLabel('총예산을 차량가, 이전비, 보험료, 정비비로 나누기 / 후보 1 메모').fill('총 1,250만원');
  await page.getByRole('button', { name: '후보 추가' }).click();
  await page.getByLabel('후보 3 이름').fill('K3 2020');

  await page.reload();

  await expect(page.getByLabel('후보 1 이름')).toHaveValue('아반떼 2021');
  await expect(page.getByLabel('총예산을 차량가, 이전비, 보험료, 정비비로 나누기 / 후보 1 메모')).toHaveValue('총 1,250만원');
  await expect(page.getByLabel('후보 3 이름')).toHaveValue('K3 2020');
});

test('public flow can be copied into an editable draft', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByRole('button', { name: '내 버전 만들기' }).click();

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
  await expect(inventory.getByText('10', { exact: true }).first()).toBeVisible();
  const lifecycle = page.locator('section').filter({ hasText: '전체 Flow 운영 분류' });
  await expect(lifecycle).toBeVisible();
  await expect(lifecycle.getByText('대표 유지', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('보강 필요', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('미리보기 전용', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('삭제 후보', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('실제 원본 Flow의')).toBeVisible();
  await expect(page.getByText('수동 Source-Fit Audit')).toBeVisible();
  await expect(page.getByText('원본 콘텐츠가 FLOW화될 가치가 있는지 점검')).toBeVisible();
  const artifactAudit = page.locator('section').filter({ hasText: 'Natural Artifact Audit' });
  await expect(artifactAudit).toBeVisible();
  await expect(artifactAudit.getByText('사용자가 실제로 만들 산출물 기준 검토')).toBeVisible();
  await expect(artifactAudit.getByText('exact source')).toBeVisible();
  await expect(artifactAudit.getByText('catalog review')).toBeVisible();
  await expect(artifactAudit.getByText('감사 완료')).toBeVisible();
  await expect(artifactAudit.getByText('40', { exact: true }).first()).toBeVisible();
  const sourceFitAudit = page.locator('section').filter({ hasText: '수동 Source-Fit Audit' });
  await expect(sourceFitAudit.getByText('감사 완료')).toBeVisible();
  await expect(sourceFitAudit.getByText('카탈로그 미리보기 1')).toBeVisible();
  await expect(page.getByRole('link', { name: '시험 D-30 공부 계획 Flow', exact: true })).toBeVisible();
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
