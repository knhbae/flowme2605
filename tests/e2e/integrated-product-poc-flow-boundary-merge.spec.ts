import { test, expect, type Page } from '@playwright/test';
import { buildPersonalWorkspacePocReadModel } from '../../lib/flow/personal-workspace-poc-read-model';
import { buildPersonalWorkspacePocTasks } from '../../lib/flow/personal-workspace-poc-view-model';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { prepareProgramLegacyView } from '../../lib/flow/integrated-poc/legacy-transaction';
import { programLegacyFolders } from '../../lib/flow/integrated-poc/legacy-folder-bridge';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';
import type { FlowBundle } from '../../lib/flow/types';

const KEY = 'flow:poc:personal-workspace:v1:program:state', PREFIX = 'flow:poc:personal-workspace:v1:';
const DATE = '2026-09-20', NEXT = '2026-09-21', TITLE = 'Merge canonical parent';
const bundle: FlowBundle = {
  flow: { id: 'boundary-flow', slug: 'boundary-source', title: TITLE, category: 'Synthetic merge QA', structure_type: 'timeline', anchor_type: 'start_date', status: 'published', created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z' },
  sections: [{ id: 'boundary-section', flow_id: 'boundary-flow', title: '준비', order: 0 }],
  items: [0, 1].map(index => ({ id: `boundary-item-${index}`, flow_id: 'boundary-flow', section_id: 'boundary-section', title: `Boundary item ${index + 1}`, type: 'calendar', day_offset: 0, order: index })),
};
const entries = {
  flow_builder_mvp_bundles_v11: JSON.stringify([bundle]),
  'flow:saved:copy:boundary': JSON.stringify({ slug: 'copy:boundary', savedAt: '2026-09-20T00:00:00Z', selectedArtifactMode: 'calendar', dateIntent: 'custom', anchor: DATE, schemaVersion: 2, personalCopyKey: 'copy:boundary', sourceFlowKey: 'boundary-flow', sourceFlowSlug: 'boundary-source', sourceVersion: 'source-v1', lastSaveRequestId: 'request:boundary', savedItemCount: 2 }),
};
const wire = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const state = async (page: Page) => JSON.parse((await wire(page))!) as ProgramEnvelope;
const space = async (page: Page) => (await state(page)).data.spaces['local-user'];
const tasks = async (page: Page) => {
  const view = prepareProgramLegacyView((await state(page)).data, { actorId: 'local-user', now: '2026-09-20T03:00:00Z' });
  if (!view.ok) throw Error(`Current legacy projection failed: ${JSON.stringify(view)}`);
  return buildPersonalWorkspacePocTasks(view.payload.model, view.payload.state);
};

test('canonical Flow folder is inherited; one Item date/completion moves only its personal execution, projections and Undo survive reload', async ({ page }) => {
  test.setTimeout(150_000);
  page.setDefaultTimeout(15_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-09-20T03:00:00Z'));
  const storage = { get length() { return Object.keys(entries).length; }, key: (index: number) => Object.keys(entries)[index] ?? null, getItem: (key: string) => entries[key as keyof typeof entries] ?? null };
  const read = buildPersonalWorkspacePocReadModel(storage, [bundle]);
  expect(read.ok).toBe(true); if (!read.ok) throw Error('Invalid synthetic source fixture');
  expect(read.model.flows).toHaveLength(1);
  const flow = read.model.flows[0], first = flow.items[0], second = flow.items[1];
  expect(flow.origin).toBe('canonical-personal-copy');
  const calls: { method: string; key: string | null }[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.exposeBinding('__flowBoundaryAudit', (_source, call) => calls.push(call));
  await page.addInitScript(({ entries }) => {
    if (!sessionStorage.getItem('flow-boundary-seeded')) {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      sessionStorage.setItem('flow-boundary-seeded', '1');
    }
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        if (this === localStorage) void (window as unknown as { __flowBoundaryAudit: (value: unknown) => Promise<void> }).__flowBoundaryAudit({ method, key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      } });
    }
  }, { entries });
  const verify = async () => {
    expect(await page.evaluate(prefix => Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith(prefix)).map(key => [key, localStorage.getItem(key)])), PREFIX)).toEqual(entries);
    expect(calls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX))).toEqual([]);
    expect(errors).toEqual([]);
  };
  await page.goto('/my?personalWorkspacePoc=v1');
  // Current boot already projects compatible saved records read-only. Creating
  // the folder below is the first explicit Program write, not fixture injection.
  await expect(page.getByRole('button', { name: `${TITLE} 개인 Flow`, exact: true })).toBeVisible();
  expect(await wire(page)).toBeNull();
  await page.getByText('폴더 정리', { exact: true }).click();
  await page.getByLabel('새 폴더 이름', { exact: true }).fill('Parent folder');
  await page.getByRole('button', { name: '폴더 만들기', exact: true }).click();
  await expect.poll(async () => (await space(page)).savedBindings.length).toBe(1);
  const binding = (await space(page)).savedBindings[0];
  expect(binding.flowRef).toBe(flow.ref);
  await page.getByText('PoC 설정', { exact: true }).click();
  await page.getByRole('button', { name: /^기존 제작·실행 도구/ }).click();
  const legacy = page.getByRole('region', { name: '기존 계획과 개인 문서 연결', exact: true });
  await legacy.getByRole('button', { name: new RegExp(`^${TITLE}`) }).click();
  await legacy.getByText('폴더와 개인 항목 순서', { exact: true }).click();
  await legacy.getByRole('combobox', { name: '계획 폴더', exact: true }).selectOption({ label: 'Parent folder' });
  const folderId = (await space(page)).text.folders.find(folder => folder.title === 'Parent folder')!.id;
  await expect.poll(async () => M.getDocument((await space(page)).text, binding.documentId)?.folderId).toBe(folderId);
  const afterFolder = await space(page), initialTasks = await tasks(page);
  expect(initialTasks.map(task => task.date)).toEqual([DATE, DATE]);
  for (const task of initialTasks) expect(task.flowRef).toBe(flow.ref);
  const inherited = programLegacyFolders(afterFolder);
  expect(inherited.byFlow[flow.ref].folderId).toBe(folderId);
  expect(inherited.byItem[first.ref].folderId).toBe(folderId);
  expect(inherited.byItem[second.ref].folderId).toBe(folderId);
  await legacy.getByRole('link', { name: `${first.title} 상세 보기`, exact: true }).click();
  await legacy.getByRole('button', { name: '실행 날짜 변경', exact: true }).click();
  const editing = legacy.getByRole('region', { name: '개인 변경 편집', exact: true });
  await editing.getByLabel(/^실행 날짜/).fill(NEXT);
  await editing.getByRole('button', { name: '개인 변경 저장', exact: true }).click();
  await expect.poll(async () => (await tasks(page)).find(task => task.ref === first.ref)?.date).toBe(NEXT);
  const dated = await tasks(page);
  expect(dated.find(task => task.ref === second.ref)?.date).toBe(DATE);
  for (const task of dated) expect(task.flowRef).toBe(flow.ref);
  expect((await space(page)).savedBindings).toEqual(afterFolder.savedBindings);
  const completion = legacy.getByRole('checkbox', { name: `${first.title} 완료`, exact: true });
  await expect(completion).toHaveAttribute('aria-checked', 'false');
  // This ARIA checkbox is a button whose transaction resolves asynchronously.
  // Keep a single real click and wait for both the rendered and persisted result.
  await completion.click();
  await expect(legacy.getByRole('checkbox', { name: `${first.title} 완료 취소`, exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await tasks(page)).find(task => task.ref === first.ref)?.completed).toBe(true);
  await legacy.getByRole('button', { name: '같은 개인 문서 열기', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE, exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: '개인공간 보기' });
  await nav.getByRole('button', { name: '오늘', exact: true }).click();
  await expect(page.getByRole('button', { name: `${first.title} 작업`, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `${second.title} 작업`, exact: true })).toBeVisible();
  await nav.getByRole('button', { name: '월간', exact: true }).click();
  await expect(page.getByRole('button', { name: `${first.title} 다시 열기`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: `${second.title} 작업`, exact: true })).toBeVisible();
  await nav.getByRole('button', { name: '전체 할 일', exact: true }).click();
  const row = page.locator('li[data-task-id]').filter({ has: page.getByRole('button', { name: `${first.title} 작업`, exact: true }) });
  await expect(row.getByRole('button', { name: `${first.title} 다시 열기`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  const projected = M.tasks((await space(page)).text).filter(task => task.docId === binding.documentId);
  expect(projected.find(task => task.title === first.title)?.date).toBe(NEXT);
  expect(projected.find(task => task.title === second.title)?.date).toBe(DATE);
  await row.getByRole('button', { name: `${first.title} 다시 열기`, exact: true }).click();
  await expect.poll(async () => (await tasks(page)).find(task => task.ref === first.ref)?.completed).toBe(false);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(async () => (await tasks(page)).find(task => task.ref === first.ref)?.completed).toBe(true);
  const lastSuccess = await wire(page);
  await page.reload(); await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect(await wire(page)).toBe(lastSuccess);
  const final = await space(page);
  expect(M.getDocument(final.text, binding.documentId)?.folderId).toBe(folderId);
  expect(programLegacyFolders(final).byItem[first.ref].folderId).toBe(folderId);
  expect(programLegacyFolders(final).byItem[second.ref].folderId).toBe(folderId);
  expect((await tasks(page)).find(task => task.ref === second.ref)?.date).toBe(DATE);
  expect((await tasks(page)).find(task => task.ref === first.ref)?.date).toBe(NEXT);
  await verify();
});
