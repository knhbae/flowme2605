import { test, expect, type Locator, type Page } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
// The editor also has a separate empty live region for line-move announcements.
const editorStatus = (page: Page) => editor(page).locator(':scope > div')
  .filter({ has: page.getByRole('button', { name: '날짜순 정렬', exact: true }) }).getByRole('status');
const sync = (page: Page) => page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('status');
async function clickTarget(target: Locator) {
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  // Explicit native centering avoids a fractional top-edge crop left by the
  // browser's nearest-edge scroll. Keep the strict full-rectangle assertion.
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      withinViewport: rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0
        && rect.right <= innerWidth && rect.bottom <= innerHeight,
      receivesPointer: !!hit && (hit === element || element.contains(hit)),
    };
  }), { message: 'Visible action fits the viewport and is not covered at its center' })
    .toEqual({ withinViewport: true, receivesPointer: true });
  await target.click();
}
async function closeManagement(page: Page) {
  const details = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await details.getAttribute('open') !== null) await clickTarget(details.locator('summary'));
}

test('production bundle: create folder/document, write, set date/time and reload without outside storage writes', async ({ page }, info) => {
  const mock = await mockCloudflareRelease(page);
  await page.goto('/alpha'); await login(page); await closeManagement(page);
  await expect(sync(page)).toHaveText('서버와 연결됨');
  await clickTarget(page.locator('summary').filter({ hasText: /^폴더 정리$/ }));
  await page.getByLabel('새 폴더 이름', { exact: true }).fill('합성 검증 폴더');
  await clickTarget(page.getByRole('button', { name: '폴더 만들기', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.folders.some(folder => folder.title === '합성 검증 폴더')).toBe(true);
  await page.getByRole('combobox', { name: '폴더', exact: true }).selectOption({ label: '합성 검증 폴더' });
  await page.getByLabel('새 문서', { exact: true }).fill('합성 검증 문서');
  await clickTarget(page.getByRole('button', { name: '만들기', exact: true }));
  await expect(page.getByRole('heading', { name: '합성 검증 문서', exact: true })).toBeVisible();
  await editor(page).locator('textarea').fill('- [ ] 합성 검증 할 일\n합성 메모');
  await expect(editorStatus(page)).toHaveText('저장됨');
  await expect.poll(async () => M.tasks((await mock.current()).space.text).some(task => task.title === '합성 검증 할 일')).toBe(true);
  await clickTarget(page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '전체 할 일', exact: true }));
  const taskAction = page.getByRole('button', { name: '합성 검증 할 일 작업', exact: true });
  await clickTarget(taskAction);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('실행 날짜', { exact: true }).fill('2026-10-10');
  await dialog.getByLabel(/^시간/).fill('09:30');
  await clickTarget(dialog.getByRole('button', { name: '날짜·시간 적용', exact: true }));
  await expect.poll(async () => {
    const task = M.tasks((await mock.current()).space.text).find(row => row.title === '합성 검증 할 일');
    return { date: task?.date, time: task?.time, folder: task?.folder };
  }).toEqual({ date: '2026-10-10', time: '09:30', folder: '합성 검증 폴더' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(taskAction, 'Escape restores focus to the semantic task action owner').toBeFocused();
  const saved = await mock.current(), beforeReload = mock.diagnostics();
  const document = saved.space.text.documents.find(row => row.title === '합성 검증 문서')!;
  expect(document.folderId).toBe(saved.space.text.folders.find(row => row.title === '합성 검증 폴더')!.id);
  await page.reload();
  await expect(page.getByRole('heading', { name: '개인공간', exact: true })).toBeVisible();
  await expect(sync(page)).toHaveText('서버와 연결됨');
  await clickTarget(page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '문서', exact: true }));
  await expect(editor(page).locator('textarea')).toHaveValue(M.raw(document));
  expect(await mock.current()).toEqual(saved);
  expect(mock.diagnostics()).toEqual(beforeReload);
  await mock.assertBoundary(info);
  const screenshot = info.outputPath('production-private-document.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach('production-private-document', { contentType: 'image/png', path: screenshot });
});

test('production bundle: committed-but-unavailable save survives pending poll and same-request receipt ACK', async ({ page }, info) => {
  await page.clock.install();
  const mock = await mockCloudflareRelease(page, { document: { title: '합성 저장 복구', raw: '- [ ] 기존 합성 할 일' } });
  await page.goto('/alpha'); await login(page); await closeManagement(page);
  await expect(editor(page).locator('textarea')).toHaveValue('- [ ] 기존 합성 할 일');
  mock.state.loseNextReceipt = true;
  const before = mock.diagnostics(), beforeRevision = (await mock.current()).revision;
  await editor(page).locator('textarea').fill('- [ ] 응답 유실 뒤 합성 할 일');
  await page.clock.runFor(600);
  await expect(sync(page)).toHaveText('저장 결과 확인이 필요합니다');
  await expect(editorStatus(page)).toHaveText('저장되지 않은 입력');
  expect((await mock.current()).revision).toBe(beforeRevision + 1);
  const own = mock.state.lostRequestId;
  expect(own).not.toBeNull();
  const readCount = mock.reads.length;
  // Synthetic browser timer advancement, not 20 seconds of wall time or a
  // real-device background/resume observation. The product interval is intact.
  await page.clock.fastForward(20_100);
  await expect.poll(() => mock.reads.length).toBeGreaterThan(readCount);
  expect(mock.reads.at(-1)).toBe(beforeRevision + 1);
  await expect(page.getByRole('region', { name: '다른 기기 변경과 입력 보호', exact: true })).toHaveCount(0);
  await clickTarget(page.getByRole('button', { name: '저장 결과 확인 · 같은 요청 재시도', exact: true }));
  await expect(sync(page)).toHaveText('서버 저장 확인');
  await expect(editorStatus(page)).toHaveText('저장됨');
  await expect(editor(page).locator('textarea')).toHaveValue('- [ ] 응답 유실 뒤 합성 할 일');
  await expect(page.getByRole('region', { name: '저장 결과 복구', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '다른 기기 변경과 입력 보호', exact: true })).toHaveCount(0);
  expect(mock.lookups).toContain(own);
  expect(mock.commands.filter(command => command.requestId === own)).toHaveLength(1);
  expect(mock.diagnostics()).toEqual({ mutations: before.mutations + 1, operations: before.operations + 1 });
  const saved = await mock.current();
  await page.reload();
  await expect(editor(page).locator('textarea')).toHaveValue('- [ ] 응답 유실 뒤 합성 할 일');
  await expect(editorStatus(page)).toHaveText('저장됨');
  expect(await mock.current()).toEqual(saved);
  expect(mock.diagnostics()).toEqual({ mutations: before.mutations + 1, operations: before.operations + 1 });
  await mock.assertBoundary(info);
  const screenshot = info.outputPath('production-recovered-ack.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach('production-recovered-ack', { contentType: 'image/png', path: screenshot });
});
