import { expect, test, type Download } from '@playwright/test';

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
  await expect(page.getByRole('heading', { name: '처음이면 여기서 시작' })).toBeVisible();
  await expect(page.getByText('511개 전체를 훑기보다 목적과 도구를 먼저 고르면 빠릅니다.')).toBeVisible();
  await expect(page.getByLabel('태그')).toBeVisible();
  await expect(page.getByLabel('카테고리')).toBeVisible();
  await expect(page.getByLabel('Flow 방식')).toBeVisible();
  await expect(page.getByLabel('정렬')).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 할 일을 월간 일정표로 준비하기' })).toBeVisible();
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
  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();
  await expect(page).toHaveURL(/\/flows\/.+\/edit/);

  await page.goto('/my');
  await expect(page.getByText('발행 Flow')).toBeVisible();
  await expect(page.getByRole('button', { name: /초안/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /이사 D-30 할 일을 월간 일정표로 준비하기 사본/ })).toBeVisible();
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
  await expect(page.locator('header').getByText('출처 확인')).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ThankyouBUBU', exact: true })).toBeVisible();
  await expect(page.getByText('실행성 점수').first()).toBeVisible();
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
  await expect(page.getByText('Flow화 콘텐츠')).toBeVisible();
  await expect(page.getByText(/4\d/).first()).toBeVisible();
  await expect(page.getByText('출처 커버리지')).toBeVisible();
  await expect(page.getByText('목적별 Flow 라이브러리')).toBeVisible();
  await expect(page.getByLabel('Flow 검색')).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).toBeVisible();
  await page.getByLabel('Flow 검색').fill('비상 상황');
  await expect(page.getByRole('link', { name: /가전관리 비상 상황 대응표/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).not.toBeVisible();
});

test('creator channel cards show source task rhythm and tool', async ({ page }) => {
  await page.goto('/u/thankyou-bubu');

  const library = page.locator('section').filter({ has: page.getByRole('heading', { name: '목적별 Flow 라이브러리' }) });

  await expect(page.getByRole('heading', { name: '목적별 Flow 라이브러리' })).toBeVisible();
  await expect(page.getByText('정확한 출처').first()).toBeVisible();
  await expect(page.getByText('도구: 캘린더').first()).toBeVisible();
  await expect(page.getByText('리듬: 주 3회').first()).toBeVisible();
  await expect(page.getByText('첫 설정: 시작일').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '캘린더형' })).toBeVisible();
  await expect(page.getByRole('button', { name: '체크표형' })).toBeVisible();
  await expect(page.getByText('첫 행동:')).toHaveCount(0);

  await page.getByRole('button', { name: '체크표형' }).click();
  await expect(library.locator('a[href="/f/real-thankyou-bubu-video-full-body-no-jump"]')).toHaveCount(0);
  await expect(library.getByRole('link', { name: /운동\/홈트 초보자 시작 체크/ })).toBeVisible();

  await page.goto('/flows');
  await expect(page.getByText('도구: 캘린더')).toHaveCount(0);
  await expect(page.getByText('첫 행동:').first()).toBeVisible();
});

test('creator channel can filter real source-backed flows', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByText('출처 확인').first()).toBeVisible();
  await expect(page.getByText('할 일:').first()).toBeVisible();
  await page.getByRole('button', { name: '출처 확인' }).click();

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
  await expect(page.getByRole('heading', { name: '캘린더에 들어간 반복 일정' })).toBeVisible();
  await expect(page.getByText('도구: 캘린더')).toBeVisible();
  await expect(page.getByText('리듬: 주 3회')).toBeVisible();
  await expect(page.getByText('시작일', { exact: true })).toBeVisible();
  await expect(page.getByText('반복 요일')).toBeVisible();
  await expect(page.getByRole('heading', { name: '월간 캘린더 미리보기' })).toBeVisible();
  await expect(page.getByRole('link', { name: /원본 열기/ })).toBeVisible();
  await expect(page.getByText('캘린더 일정으로 시작')).toHaveCount(0);
  await expect(page.getByText('1. 요일 정하기')).toHaveCount(0);
  await expect(page.getByText('2. 오늘 실행 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내 Flow로 수정')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '실행 항목' })).toBeVisible();
  const schedulePreview = page.getByTestId('tool-surface-preview');
  await expect(schedulePreview).toBeVisible();
  await expect(
    schedulePreview.evaluate((surface) => {
      const heading = Array.from(document.querySelectorAll('h2')).find((element) => element.textContent?.trim() === '실행 항목');
      return heading ? Boolean(surface.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    }),
  ).resolves.toBe(true);
  await expect(schedulePreview.getByText('월요일')).toBeVisible();
  await expect(schedulePreview.getByText('수요일')).toBeVisible();
  await expect(schedulePreview.getByText('금요일')).toBeVisible();
  await expect(page.getByText('한눈에 보는 전체 루트')).toHaveCount(0);
  await expect(page.getByText('이번 주 루틴 설정')).toHaveCount(0);
  await expect(page.locator('details').filter({ hasText: '출처와 주의 정보' })).not.toHaveAttribute('open', '');
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

test('public flow detail shows primary tool surface before execution details', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');

  await expect(page.getByRole('heading', { name: '내 도구에 들어간 모습' })).toBeVisible();
  await expect(page.getByText('도구: 캘린더')).toBeVisible();
  await expect(page.getByText('리듬: 주 3회')).toBeVisible();
  await expect(page.getByRole('heading', { name: '월간 캘린더 미리보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '캘린더에 넣기' })).toBeVisible();

  const surface = page.getByTestId('tool-surface-preview');
  await expect(surface).toBeVisible();
  await expect(surface).toContainText('운동');
});

test('public D-Day flow detail uses the shared tool surface', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const surface = page.getByTestId('tool-surface-preview');
  await expect(surface).toBeVisible();
  await expect(surface).toContainText('D-Day');
  await expect(surface).toContainText('단계표');
});

test('mobile public flow shows the tool surface before source metadata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  const positions = await page.evaluate(() => {
    const surface = document.querySelector('[data-testid="tool-surface-preview"]');
    const sourceCard = Array.from(document.querySelectorAll('section,div')).find((element) =>
      element.textContent?.includes('by FLOW 큐레이션팀'),
    );

    return {
      surfaceTop: surface?.getBoundingClientRect().top ?? 9999,
      sourceTop: sourceCard?.getBoundingClientRect().top ?? 9999,
    };
  });

  expect(positions.surfaceTop).toBeLessThan(844);
  expect(positions.surfaceTop).toBeLessThan(positions.sourceTop);
});

test('public D-Day flow uses the surface export actions without legacy duplicates', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const surface = page.getByTestId('tool-surface-preview');
  await expect(surface.getByRole('button', { name: '엑셀 실행표 받기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '체크리스트 복사하기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 일정표 엑셀로 받기' })).toHaveCount(0);
});

test('daily check flow detail uses checklist surface', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  await expect(page.getByRole('heading', { name: '내 도구에 들어간 모습' })).toBeVisible();
  await expect(page.getByText('도구: 체크표')).toBeVisible();
  await expect(page.getByText('리듬: 매일')).toBeVisible();
  await expect(page.getByRole('heading', { name: '7일 체크표 미리보기' })).toBeVisible();
  await expect(page.getByText('적용 체크').first()).toBeVisible();
  await expect(page.getByText('토요일')).toBeVisible();
  await expect(page.getByText('일요일')).toBeVisible();

  const excelDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '엑셀 실행표 받기' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('real-fitvely-video-body-fat-6kg-method.xlsx');

  const selectedWeekdays = await readSelectedWeekdaysFromWorkbook(excelDownload);
  expect(selectedWeekdays).toBe('월 / 화 / 수 / 목 / 금 / 토 / 일');
});

test('diet exact video flow uses application language instead of workout scheduling', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  await expect(page.getByRole('heading', { name: '체크표에 들어간 일별 적용' })).toBeVisible();
  await expect(page.getByText('리듬: 매일')).toBeVisible();
  await expect(page.getByRole('heading', { name: '7일 체크표 미리보기' })).toBeVisible();
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

  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
  await expect(page.getByText('이 Flow는 캘린더에 들어가는 반복 루틴입니다')).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 일정 설정' })).toBeVisible();
  const toolPreviewHeading = page.getByRole('heading', { name: '내 도구 미리보기' });
  await expect(toolPreviewHeading).toBeVisible();
  await expect(toolPreviewHeading).not.toHaveClass(/sr-only/);
  await expect(page.getByRole('heading', { name: '전문가용 원문 편집' })).toBeVisible();
  await expect(page.locator('textarea').first()).not.toBeVisible();
  await expect(page.getByLabel('실행 내용')).toHaveValue(/운동|영상/);
  await expect(page.getByRole('button', { name: '내 Flow로 가져오기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '캘린더에 넣기' })).toHaveCount(0);
});

test('copied D-Day flow edits dates before raw content', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
  await expect(page.getByText('이 Flow는 D-Day 표로 관리하는 일정입니다')).toBeVisible();
  await expect(page.getByLabel('목표일').or(page.getByLabel('시작일'))).toBeVisible();
  await expect(page.getByRole('heading', { name: 'D-Day 단계표 미리보기' })).toBeVisible();
});

test('daily-check editor defaults copied Fitvely flow to every day', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
  await expect(page.getByText('리듬: 매일')).toBeVisible();
  await expect(page.getByText('토요일')).toBeVisible();
  await expect(page.getByText('일요일')).toBeVisible();
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

test('real source public flow exposes source QA metadata and first action', async ({ page }) => {
  await page.goto('/f/real-samsung-aircon-seasonal-care');

  await expect(page.getByText('출처 확인일: 2026-05-21')).toBeVisible();
  await expect(page.getByText('Flow 전환 방식:')).toBeVisible();
  await expect(page.getByText('출처 정밀도: 정확한 출처 페이지')).toBeVisible();
  await expect(page.getByText('첫 행동:').first()).toBeVisible();
});

test('preview creator flow route opens encoded Korean slug', async ({ page }) => {
  await page.goto('/f/channel-samsung-service-%EC%9B%94%EA%B0%84-%EC%A0%90%EA%B2%80-%EB%A3%A8%ED%8B%B4');

  await expect(page).toHaveURL(/\/f\/channel-samsung-service-/);
  await expect(page.locator('main.p-8')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCount(1);
});

async function readSelectedWeekdaysFromWorkbook(download: Download) {
  const path = await download.path();
  expect(path).toBeTruthy();

  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ((ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule) as typeof ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path as string);

  const summary = workbook.getWorksheet('실행 요약');
  expect(summary).toBeTruthy();
  const weekdayRow = summary
    ?.getRows(1, summary.rowCount)
    ?.find((row) => row.getCell(1).value === '선택 요일');

  return String(weekdayRow?.getCell(2).value ?? '');
}

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

test('raw advanced edits persist after save and reload', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 일정 설정' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 도구 미리보기' })).toBeVisible();
  await expect(page.locator('textarea').first()).not.toBeVisible();

  await page.getByRole('heading', { name: '전문가용 원문 편집' }).click();
  const sourceEditor = page.locator('textarea').first();
  await expect(sourceEditor).toBeVisible();
  await expect(sourceEditor).toContainText('D-30');
  await sourceEditor.fill('# raw advanced persistence\n\n## D-1\n- edited raw item D-1');

  await page.getByRole('button', { name: '초안 저장' }).click();
  await expect(page.getByText(/초안 저장됨|발행됨/)).toBeVisible();

  await page.reload();
  await page.getByRole('heading', { name: '전문가용 원문 편집' }).click();
  await expect(page.locator('textarea').first()).toHaveValue(/edited raw item D-1/);

  await page.getByRole('button', { name: '발행' }).click();
  await expect(page.getByText('발행됨')).toBeVisible();
});

test('copied editor keeps long item lists collapsed and marks raw editing as expert-only', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page.locator('label').filter({ hasText: '실행 내용' })).toHaveCount(6);
  await expect(page.getByRole('button', { name: '나머지 실행 항목 펼치기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '전문가용 원문 편집' })).toBeVisible();
  await expect(page.getByText('일반 사용자는 위 일정 설정과 실행 내용만 바꿔도 충분합니다.')).toBeVisible();
});

test('raw advanced edits update the published flow items', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await page.getByRole('heading', { name: '전문가용 원문 편집' }).click();
  await page.locator('textarea').first().fill('# raw advanced publish\n\n## D-1\n- edited raw publish item D-1');

  await page.getByRole('button', { name: '발행' }).click();
  await page.locator('a[href^="/f/moving-d30-basic-copy-"]').click();

  await expect(page.getByTestId('tool-surface-preview').getByText('edited raw publish item')).toBeVisible();
});

test('public moving flow calculates dates and updates progress', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByText('예시 날짜로 미리보기')).toBeVisible();
  await expect(page.getByText('1. 기준 날짜 선택')).toBeVisible();
  await expect(page.getByText('2. 바로 실행')).toBeVisible();
  await expect(page.getByText('3. 저장/공유')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 일정표 엑셀로 받기' })).toHaveCount(0);
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

  await page.getByRole('checkbox', { name: /이사 방식 정하기/ }).first().check();
  await page.getByRole('checkbox', { name: /이사할 집 하자 점검하기/ }).first().check();
  await expect(page.getByText('2 / 24').first()).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '엑셀 실행표 받기' }).click();
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

  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: /이사 D-30 할 일을 월간 일정표로 준비하기 사본/ })).toBeVisible();
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
