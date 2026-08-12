import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  getFirstSavedPersonalDraftSlug,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const WIDE_VIEWPORTS = [
  { label: '1024', width: 1024, height: 768 },
  { label: '1440', width: 1440, height: 1000 },
] as const;
const MAP_SENTINELS = {
  snapshotTopLevel: { owner: 'snapshot', keep: 'map-snapshot-top-level' },
  snapshotPersonalCopy: { owner: 'snapshot.personalCopy', keep: 'map-personal-copy' },
  persistenceTopLevel: { owner: 'persistence', keep: 'map-persistence-top-level' },
  persistenceMap: { owner: 'persistence.map', keep: 'map-persistence-map' },
  persistencePersonalCopy: {
    owner: 'persistence.personalCopy',
    keep: 'map-persistence-personal-copy',
  },
  childFlow: { owner: 'persistence.childFlows[0]', keep: 'map-child-flow' },
  childStep: { owner: 'persistence.childFlows[0].steps[0]', keep: 'map-child-step' },
  childStepCalendar: {
    owner: 'persistence.childFlows[0].steps[0].calendar',
    keep: 'map-child-step-calendar',
  },
} as const;
const LEGACY_SENTINELS = {
  topLevel: { owner: 'legacy-record', keep: 'legacy-top-level' },
  nested: {
    owner: 'legacy-record.nested',
    keep: 'legacy-nested',
    deeper: { keep: 'legacy-deeper' },
  },
} as const;

type OriginKind =
  | 'canonical-personal-copy'
  | 'source-backed-map'
  | 'personal-draft'
  | 'legacy-saved-plan';

type CreatedOrigin = Readonly<{
  kind: OriginKind;
  slug: string;
  mapId?: string;
}>;

type OriginFixture = Readonly<{
  kind: OriginKind;
  label: string;
  titleToken: string;
  create: (page: Page) => Promise<CreatedOrigin>;
}>;

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

async function resetBrowserStorage(page: Page): Promise<void> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function createCanonicalPersonalCopy(page: Page): Promise<CreatedOrigin> {
  await resetBrowserStorage(page);
  await page.goto('/f/moving-d30-basic');
  await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();
  const mobileSave = page.getByTestId('public-flow-save-primary-mobile');
  const saveButton = await mobileSave.isVisible().catch(() => false)
    ? mobileSave
    : page.getByTestId('public-flow-save-primary');
  await savePublicFlow(page, saveButton);
  const slug = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(slug).toMatch(/^personal-copy:/u);
  return { kind: 'canonical-personal-copy', slug };
}

async function createSourceBackedMap(page: Page): Promise<CreatedOrigin> {
  await resetBrowserStorage(page);
  await page.goto('/flow-maps/middle-school-math-1');
  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap).toBeVisible();
  await publicMap
    .getByTestId('public-flow-capability-result')
    .getByRole('button', { name: 'Todo', exact: true })
    .click();
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('savedMap'))
    .toBe('middle-school-math-1');
  await page.evaluate(({ mapId, sentinels }) => {
    const snapshotKey = `flow:map:saved:${mapId}`;
    const persistenceKey = `flow:map:persistence:${mapId}`;
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) ?? 'null') as {
      title?: string;
      personalCopy?: Record<string, unknown>;
      [key: string]: unknown;
    } | null;
    const persistence = JSON.parse(window.localStorage.getItem(persistenceKey) ?? 'null') as {
      personalCopy?: Record<string, unknown>;
      map?: Record<string, unknown>;
      childFlows?: Array<Record<string, unknown> & {
        slug?: string;
        stepIds?: string[];
        steps?: Array<Record<string, unknown> & { calendar?: Record<string, unknown> }>;
      }>;
      [key: string]: unknown;
    } | null;
    if (!snapshot || !persistence?.map || !persistence.childFlows?.length) {
      throw new Error('Expected a complete source-backed Map fixture.');
    }
    const includedStepIdsByFlow = Object.fromEntries(
      persistence.childFlows.flatMap((child) => (
        child.slug && Array.isArray(child.stepIds)
          ? [[child.slug, [...child.stepIds]]]
          : []
      )),
    );
    const excludedStepIdsByFlow = Object.fromEntries(
      Object.keys(includedStepIdsByFlow).map((slug) => [slug, []]),
    );
    const personalCopy = {
      source: 'personal_edit',
      originalTitle: snapshot.title,
      includedStepIdsByFlow,
      excludedStepIdsByFlow,
      ...(persistence.personalCopy ?? {}),
      ...(snapshot.personalCopy ?? {}),
    };

    snapshot.unknownTopLevelSentinel = sentinels.snapshotTopLevel;
    snapshot.personalCopy = {
      ...personalCopy,
      unknownPersonalCopySentinel: sentinels.snapshotPersonalCopy,
    };
    persistence.unknownTopLevelSentinel = sentinels.persistenceTopLevel;
    persistence.map = {
      ...persistence.map,
      unknownMapSentinel: sentinels.persistenceMap,
    };
    persistence.personalCopy = {
      ...personalCopy,
      unknownPersonalCopySentinel: sentinels.persistencePersonalCopy,
    };
    persistence.childFlows = persistence.childFlows.map((child, childIndex) => (
      childIndex === 0
        ? {
            ...child,
            unknownChildFlowSentinel: sentinels.childFlow,
            steps: (child.steps ?? []).map((step, stepIndex) => (
              stepIndex === 0
                ? {
                    ...step,
                    unknownChildStepSentinel: sentinels.childStep,
                    calendar: {
                      ...(step.calendar ?? {}),
                      unknownCalendarSentinel: sentinels.childStepCalendar,
                    },
                  }
                : step
            )),
          }
        : child
    ));
    window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
    window.localStorage.setItem(persistenceKey, JSON.stringify(persistence));
  }, { mapId: 'middle-school-math-1', sentinels: MAP_SENTINELS });
  return {
    kind: 'source-backed-map',
    slug: 'source-backed-middle-school-math-1',
    mapId: 'middle-school-math-1',
  };
}

async function createPersonalMemoDraft(page: Page): Promise<CreatedOrigin> {
  await resetBrowserStorage(page);
  await page.goto('/flows');
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(
    '가족 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크',
  );
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await expect(editor).toBeVisible();
  await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(4);
  await editor.getByLabel('메모 초안 제목').fill('가족 여행 준비');
  await editor.getByTestId('flow-memo-draft-save').click();
  await expect(page).toHaveURL(/\/my\?savedFlow=url-draft-/u);
  return {
    kind: 'personal-draft',
    slug: await getFirstSavedPersonalDraftSlug(page),
  };
}

async function createLegacySavedPlan(page: Page): Promise<CreatedOrigin> {
  await resetBrowserStorage(page);
  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();
  await page.evaluate((sentinels) => {
    window.localStorage.setItem('flow:saved:vehicle-inspection-prep', JSON.stringify({
      slug: 'vehicle-inspection-prep',
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
      dateIntent: 'undated',
      unknownTopLevelSentinel: sentinels.topLevel,
      unknownNestedSentinel: sentinels.nested,
    }));
  }, LEGACY_SENTINELS);
  return { kind: 'legacy-saved-plan', slug: 'vehicle-inspection-prep' };
}

const ORIGINS: readonly OriginFixture[] = [
  {
    kind: 'canonical-personal-copy',
    label: 'canonical copy',
    titleToken: '이사 준비',
    create: createCanonicalPersonalCopy,
  },
  {
    kind: 'source-backed-map',
    label: 'source-backed Flow Map',
    titleToken: '수학 진도',
    create: createSourceBackedMap,
  },
  {
    kind: 'personal-draft',
    label: 'personal memo/URL draft (memo ingress)',
    titleToken: '여행 준비',
    create: createPersonalMemoDraft,
  },
  {
    kind: 'legacy-saved-plan',
    label: 'legacy saved record',
    titleToken: '차량 점검',
    create: createLegacySavedPlan,
  },
];

async function openApprovedPlan(
  page: Page,
  slug: string,
): Promise<Locator> {
  const params = new URLSearchParams({ view: 'flows', flow: slug });
  await page.goto(`/my?${params.toString()}`);
  expect(new URL(page.url()).searchParams.get('savedPlanLibrary')).toBeNull();
  const flow = await openMyFlowLibraryFlow(page, slug, 'plan');
  await expect(flow.getByTestId('approved-my-plan-workspace')).toBeVisible();
  await expect(flow.getByTestId('my-plan-edit')).toBeVisible();
  return flow;
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage) => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort();
      return Object.fromEntries(keys.map((key) => [key, storage.getItem(key) ?? '']));
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

function changedRawKeys(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): string[] {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => before[key] !== after[key])
    .sort();
}

function allowedPlanSaveKeys(origin: CreatedOrigin): Set<string> {
  const keys = new Set([
    'flow_builder_mvp_bundles_v11',
    'flow:my-flow:date-overrides',
    'flow:my-flow:item-drafts',
    'flow:canonical:origin:v1',
    'flow:meta:last-visit',
    `flow:saved:${origin.slug}`,
    `flow:${origin.slug}:anchorDate`,
    `flow_builder_mvp_checks_${origin.slug}`,
    `flow_builder_mvp_item_state_${origin.slug}`,
    `flow:my-flow:structural-overlay:${encodeURIComponent(origin.slug)}`,
  ]);
  if (origin.mapId) {
    keys.add(`flow:map:saved:${origin.mapId}`);
    keys.add(`flow:map:persistence:${origin.mapId}`);
  }
  return keys;
}

async function captureOriginIdentity(page: Page, origin: CreatedOrigin): Promise<unknown> {
  return page.evaluate(({ kind, slug, mapId }) => {
    const read = (key: string): unknown => {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    };
    const record = read(`flow:saved:${slug}`) as {
      slug?: string;
      schemaVersion?: number;
      personalCopyKey?: string;
      sourceFlowKey?: string;
      sourceFlowSlug?: string;
      sourceVersion?: string;
      selectedArtifactMode?: string;
      dateIntent?: string;
      anchor?: string;
      lastSaveRequestId?: string;
      savedItemCount?: number;
      unknownTopLevelSentinel?: unknown;
      unknownNestedSentinel?: unknown;
    } | null;
    const schemaVersionPresent = Boolean(
      record && Object.prototype.hasOwnProperty.call(record, 'schemaVersion'),
    );

    if (kind === 'canonical-personal-copy') {
      return {
        record: {
          slug: record?.slug,
          schemaVersion: record?.schemaVersion,
          personalCopyKey: record?.personalCopyKey,
          sourceFlowKey: record?.sourceFlowKey,
          sourceFlowSlug: record?.sourceFlowSlug,
          sourceVersion: record?.sourceVersion,
          selectedArtifactMode: record?.selectedArtifactMode,
        },
        sourceBundlesRaw: window.localStorage.getItem('flow_builder_mvp_bundles_v11'),
      };
    }

    if (kind === 'source-backed-map') {
      const snapshot = read(`flow:map:saved:${mapId}`) as {
        mapId?: string;
        version?: string;
        flowSlugs?: string[];
      } | null;
      const persistence = read(`flow:map:persistence:${mapId}`) as {
        schemaVersion?: number;
        recordType?: string;
        bridgeStorageKey?: string;
        map?: { id?: string; version?: string };
        childFlows?: Array<{
          slug?: string;
          flowId?: string;
          stepIds?: string[];
          steps?: Array<{ stepId?: string }>;
        }>;
      } | null;
      return {
        record: {
          slug: record?.slug,
          schemaVersionPresent,
          selectedArtifactMode: record?.selectedArtifactMode,
          dateIntent: record?.dateIntent,
          anchor: record?.anchor,
        },
        snapshot: {
          mapId: snapshot?.mapId,
          version: snapshot?.version,
          flowSlugs: snapshot?.flowSlugs,
        },
        persistence: {
          schemaVersion: persistence?.schemaVersion,
          recordType: persistence?.recordType,
          bridgeStorageKey: persistence?.bridgeStorageKey,
          map: {
            id: persistence?.map?.id,
            version: persistence?.map?.version,
          },
          childFlows: persistence?.childFlows?.map((child) => ({
            slug: child.slug,
            flowId: child.flowId,
            stepIds: child.stepIds,
            stepIdentity: child.steps?.map((step) => step.stepId),
          })),
        },
        sourceBundlesRaw: window.localStorage.getItem('flow_builder_mvp_bundles_v11'),
      };
    }

    if (kind === 'personal-draft') {
      const bundles = (read('flow_builder_mvp_bundles_v11') ?? []) as Array<{
        flow?: {
          id?: string;
          slug?: string;
          status?: string;
          source_title?: string;
          source_url?: string;
          raw_text?: string;
          tags?: string[];
        };
        items?: Array<{ id?: string }>;
        itemDetails?: Array<{
          item_id?: string;
          source_fragment_ids?: string[];
          source_fragment_text?: string;
        }>;
      }>;
      const bundle = bundles.find((candidate) => candidate.flow?.slug === slug);
      return {
        record: {
          slug: record?.slug,
          schemaVersionPresent,
          selectedArtifactMode: record?.selectedArtifactMode,
        },
        flow: {
          id: bundle?.flow?.id,
          slug: bundle?.flow?.slug,
          status: bundle?.flow?.status,
          sourceTitle: bundle?.flow?.source_title,
          sourceUrl: bundle?.flow?.source_url,
          rawText: bundle?.flow?.raw_text,
          tags: bundle?.flow?.tags,
        },
        itemIds: bundle?.items?.map((item) => item.id),
        sourceFragments: bundle?.itemDetails?.map((detail) => ({
          itemId: detail.item_id,
          ids: detail.source_fragment_ids,
          text: detail.source_fragment_text,
        })),
      };
    }

    return {
      record: {
        slug: record?.slug,
        schemaVersionPresent,
        personalCopyKeyPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'personalCopyKey'),
        ),
        sourceFlowKeyPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'sourceFlowKey'),
        ),
        sourceFlowSlugPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'sourceFlowSlug'),
        ),
        sourceVersionPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'sourceVersion'),
        ),
        lastSaveRequestIdPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'lastSaveRequestId'),
        ),
        savedItemCountPresent: Boolean(
          record && Object.prototype.hasOwnProperty.call(record, 'savedItemCount'),
        ),
        selectedArtifactMode: record?.selectedArtifactMode,
        dateIntent: record?.dateIntent,
        anchor: record?.anchor,
        unknownTopLevelSentinel: record?.unknownTopLevelSentinel,
        unknownNestedSentinel: record?.unknownNestedSentinel,
      },
      sourceBundlesRaw: window.localStorage.getItem('flow_builder_mvp_bundles_v11'),
    };
  }, origin);
}

async function captureMapRawOwnersAndSentinels(page: Page, mapId: string) {
  return page.evaluate((savedMapId) => {
    const read = (key: string) => JSON.parse(
      window.localStorage.getItem(key) ?? 'null',
    ) as Record<string, unknown> | null;
    const snapshot = read(`flow:map:saved:${savedMapId}`);
    const persistence = read(`flow:map:persistence:${savedMapId}`);
    if (!snapshot || !persistence) throw new Error('Expected raw Map records.');
    const snapshotPersonalCopy = snapshot.personalCopy as Record<string, unknown> | undefined;
    const persistencePersonalCopy = persistence.personalCopy as Record<string, unknown> | undefined;
    const persistenceMap = persistence.map as Record<string, unknown> | undefined;
    const childFlows = Array.isArray(persistence.childFlows)
      ? persistence.childFlows as Array<Record<string, unknown>>
      : [];
    const firstChild = childFlows.find((child) => (
      child.unknownChildFlowSentinel !== undefined
    )) ?? childFlows[0];
    const firstChildSteps = Array.isArray(firstChild?.steps)
      ? firstChild.steps as Array<Record<string, unknown>>
      : [];
    const firstStep = firstChildSteps.find((step) => (
      step.unknownChildStepSentinel !== undefined
    )) ?? firstChildSteps[0];
    const firstStepCalendar = firstStep?.calendar as Record<string, unknown> | undefined;
    const personalCopyOwner = (personalCopy?: Record<string, unknown>) => ({
      source: personalCopy?.source,
      originalTitle: personalCopy?.originalTitle,
      includedStepIdsByFlow: personalCopy?.includedStepIdsByFlow,
      excludedStepIdsByFlow: personalCopy?.excludedStepIdsByFlow,
    });

    return {
      snapshot: {
        title: snapshot.title,
        personalCopyOwner: personalCopyOwner(snapshotPersonalCopy),
        unknownTopLevelSentinel: snapshot.unknownTopLevelSentinel,
        unknownPersonalCopySentinel: snapshotPersonalCopy?.unknownPersonalCopySentinel,
      },
      persistence: {
        mapTitle: persistenceMap?.title,
        personalCopyOwner: personalCopyOwner(persistencePersonalCopy),
        unknownTopLevelSentinel: persistence.unknownTopLevelSentinel,
        unknownMapSentinel: persistenceMap?.unknownMapSentinel,
        unknownPersonalCopySentinel: persistencePersonalCopy?.unknownPersonalCopySentinel,
        firstChild: {
          slug: firstChild?.slug,
          flowId: firstChild?.flowId,
          stepIds: firstChild?.stepIds,
          unknownChildFlowSentinel: firstChild?.unknownChildFlowSentinel,
        },
        firstStep: {
          stepId: firstStep?.stepId,
          unknownChildStepSentinel: firstStep?.unknownChildStepSentinel,
          unknownCalendarSentinel: firstStepCalendar?.unknownCalendarSentinel,
        },
      },
    };
  }, mapId);
}

function expectMapRawSentinels(
  raw: Awaited<ReturnType<typeof captureMapRawOwnersAndSentinels>>,
): void {
  expect(raw.snapshot.unknownTopLevelSentinel).toEqual(MAP_SENTINELS.snapshotTopLevel);
  expect(raw.snapshot.unknownPersonalCopySentinel).toEqual(
    MAP_SENTINELS.snapshotPersonalCopy,
  );
  expect(raw.persistence.unknownTopLevelSentinel).toEqual(
    MAP_SENTINELS.persistenceTopLevel,
  );
  expect(raw.persistence.unknownMapSentinel).toEqual(MAP_SENTINELS.persistenceMap);
  expect(raw.persistence.unknownPersonalCopySentinel).toEqual(
    MAP_SENTINELS.persistencePersonalCopy,
  );
  expect(raw.persistence.firstChild.unknownChildFlowSentinel).toEqual(
    MAP_SENTINELS.childFlow,
  );
  expect(raw.persistence.firstStep.unknownChildStepSentinel).toEqual(
    MAP_SENTINELS.childStep,
  );
  expect(raw.persistence.firstStep.unknownCalendarSentinel).toEqual(
    MAP_SENTINELS.childStepCalendar,
  );
}

async function captureLegacySchemaAndSentinels(page: Page, slug: string) {
  return page.evaluate((flowSlug) => {
    const record = JSON.parse(
      window.localStorage.getItem(`flow:saved:${flowSlug}`) ?? 'null',
    ) as Record<string, unknown> | null;
    if (!record) throw new Error('Expected a legacy saved record.');
    const present = (key: string) => Object.prototype.hasOwnProperty.call(record, key);
    return {
      slug: record.slug,
      selectedArtifactMode: record.selectedArtifactMode,
      dateIntent: record.dateIntent,
      unknownTopLevelSentinel: record.unknownTopLevelSentinel,
      unknownNestedSentinel: record.unknownNestedSentinel,
      promotedIdentityFields: {
        schemaVersion: present('schemaVersion'),
        personalCopyKey: present('personalCopyKey'),
        sourceFlowKey: present('sourceFlowKey'),
        sourceFlowSlug: present('sourceFlowSlug'),
        sourceVersion: present('sourceVersion'),
        lastSaveRequestId: present('lastSaveRequestId'),
        savedItemCount: present('savedItemCount'),
      },
    };
  }, slug);
}

function expectLegacySchemaAndSentinels(
  record: Awaited<ReturnType<typeof captureLegacySchemaAndSentinels>>,
): void {
  expect(record.unknownTopLevelSentinel).toEqual(LEGACY_SENTINELS.topLevel);
  expect(record.unknownNestedSentinel).toEqual(LEGACY_SENTINELS.nested);
  expect(record.promotedIdentityFields).toEqual({
    schemaVersion: false,
    personalCopyKey: false,
    sourceFlowKey: false,
    sourceFlowSlug: false,
    sourceVersion: false,
    lastSaveRequestId: false,
    savedItemCount: false,
  });
}

async function expectSharedSavedEditor(
  page: Page,
  editor: Locator,
  level: 'plan' | 'item',
): Promise<void> {
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-flow-editor-surface', 'true');
  await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
  await expect(editor).toHaveAttribute('data-editor-context', 'saved-overlay');
  await expect(editor).toHaveAttribute('data-editor-level', level);
  await expect(editor).toHaveAttribute(
    'data-editor-commit-role',
    level === 'plan' ? 'save-personal-overlay' : 'apply-item-to-parent-personal-draft',
  );
  await expect(editor).toHaveAttribute(
    'data-editor-transaction',
    level === 'plan' ? 'atomic' : 'atomic-child',
  );
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(1);
  await expect(editor.locator('[data-editor-action-role="commit"]')).toHaveCount(1);
  await expect(editor.locator('[data-editor-actions-sticky="true"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
}

async function expectEditorGeometry(
  page: Page,
  editor: Locator,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<void> {
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  if (viewport.width < 640) {
    expect(box!.x).toBeLessThanOrEqual(1);
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  } else {
    expect(box!.x + box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box!.width).toBeLessThanOrEqual(673);
  }
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
  await expect(editor.locator(
    '[data-testid="saved-flow-editor-cancel"], '
      + '[data-testid="saved-flow-editor-item-cancel"]',
  )).toBeVisible();
  await expect(editor.locator('[data-editor-action-role="commit"]')).toBeVisible();
}

test.describe('approved My Plan shared edit lifecycle', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  for (const fixture of ORIGINS) {
    test(`${fixture.label} opens the common editor and preserves its origin through the 390px lifecycle`, async ({ page }) => {
      test.setTimeout(120_000);
      const browserErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));

      const origin = await fixture.create(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      let flow = await openApprovedPlan(page, origin.slug);
      const storageBeforeEditor = await rawStorageSnapshot(page);
      const planOpener = flow.getByTestId('my-plan-edit');
      await planOpener.focus();
      await planOpener.click();

      let planEditor = page.getByTestId('saved-flow-editor-plan');
      await expectSharedSavedEditor(page, planEditor, 'plan');
      await expectEditorGeometry(page, planEditor, MOBILE_VIEWPORT);

      const titleInput = planEditor.getByTestId('saved-flow-editor-title-input');
      const originalPlanTitle = await titleInput.inputValue();
      await titleInput.fill(`${fixture.titleToken} 취소 확인`);
      await planEditor.getByTestId('saved-flow-editor-cancel').click();
      let discardPrompt = planEditor.getByTestId('flow-editor-discard-prompt');
      await expect(discardPrompt).toBeVisible();
      await discardPrompt.locator('[data-editor-discard-action="continue-editing"]').click();
      await expect(planEditor.getByTestId('saved-flow-editor-cancel')).toBeFocused();
      await planEditor.getByTestId('saved-flow-editor-cancel').click();
      await expect(discardPrompt).toBeVisible();
      await discardPrompt.locator('[data-editor-discard-action="discard-changes"]').click();
      await expect(planEditor).toHaveCount(0);
      await expect(planOpener).toBeFocused();
      expect(await rawStorageSnapshot(page)).toEqual(storageBeforeEditor);

      await planOpener.click();
      planEditor = page.getByTestId('saved-flow-editor-plan');
      await expectSharedSavedEditor(page, planEditor, 'plan');
      await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(originalPlanTitle);
      const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').first();
      const itemId = await itemOpener.getAttribute('data-item-id');
      expect(itemId).toBeTruthy();
      const storageBeforeItemApply = await rawStorageSnapshot(page);

      await itemOpener.focus();
      await itemOpener.click();
      let itemEditor = page.getByTestId('saved-flow-editor-item');
      await expectSharedSavedEditor(page, itemEditor, 'item');
      await expectEditorGeometry(page, itemEditor, MOBILE_VIEWPORT);
      await itemEditor.getByTestId('saved-flow-editor-item-title-input').fill(
        `${fixture.titleToken} 버릴 항목`,
      );
      await page.goBack();
      discardPrompt = itemEditor.getByTestId('flow-editor-discard-prompt');
      await expect(discardPrompt).toBeVisible();
      await discardPrompt.locator('[data-editor-discard-action="discard-changes"]').click();
      await expect(itemEditor).toHaveCount(0);
      await expect(planEditor).toBeVisible();
      await expect(itemOpener).toBeFocused();
      expect(await rawStorageSnapshot(page)).toEqual(storageBeforeItemApply);

      await itemOpener.click();
      itemEditor = page.getByTestId('saved-flow-editor-item');
      await expectSharedSavedEditor(page, itemEditor, 'item');
      const savedItemTitle = `${fixture.titleToken} 최종 확인하기`;
      const savedItemDetail = `${fixture.titleToken} 실행 전에 확인한 내용을 개인 메모로 남깁니다.`;
      const savedItemDate = '2031-08-21';
      await itemEditor.getByTestId('saved-flow-editor-item-title-input').fill(savedItemTitle);
      await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(savedItemDetail);
      await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(savedItemDate);
      await itemEditor.getByTestId('my-flow-detail-save-changes').click();
      await expect(itemEditor).toHaveCount(0);
      const parentItem = planEditor.locator(
        `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
      );
      await expect(parentItem).toContainText(savedItemTitle);
      await expect(parentItem).toContainText(savedItemDate);
      await expect(parentItem.getByTestId('saved-flow-editor-item-open')).toBeFocused();
      expect(await rawStorageSnapshot(page)).toEqual(storageBeforeItemApply);

      const identityBeforeSave = await captureOriginIdentity(page, origin);
      const mapRawBeforeSave = origin.kind === 'source-backed-map' && origin.mapId
        ? await captureMapRawOwnersAndSentinels(page, origin.mapId)
        : undefined;
      if (mapRawBeforeSave) expectMapRawSentinels(mapRawBeforeSave);
      const legacyBeforeSave = origin.kind === 'legacy-saved-plan'
        ? await captureLegacySchemaAndSentinels(page, origin.slug)
        : undefined;
      if (legacyBeforeSave) expectLegacySchemaAndSentinels(legacyBeforeSave);
      const savedPlanTitle = `${fixture.titleToken} 편집 수명주기 저장본`;
      await planEditor.getByTestId('saved-flow-editor-title-input').fill(savedPlanTitle);
      await planEditor.getByTestId('saved-flow-editor-save').click();
      await expect(planEditor).toHaveCount(0);

      const storageAfterSave = await rawStorageSnapshot(page);
      expect(storageAfterSave.session).toEqual(storageBeforeItemApply.session);
      const changedKeys = changedRawKeys(storageBeforeItemApply.local, storageAfterSave.local);
      expect(changedKeys.length).toBeGreaterThan(0);
      const allowedKeys = allowedPlanSaveKeys(origin);
      expect(changedKeys.filter((key) => !allowedKeys.has(key))).toEqual([]);
      expect(storageAfterSave.local['flow:editor-storage-commit-marker:v2']).toBeUndefined();
      expect(storageAfterSave.session['flow:editor-storage-recovery:v2']).toBeUndefined();
      expect(await captureOriginIdentity(page, origin)).toEqual(identityBeforeSave);
      if (legacyBeforeSave) {
        const legacyAfterSave = await captureLegacySchemaAndSentinels(page, origin.slug);
        expectLegacySchemaAndSentinels(legacyAfterSave);
        expect(legacyAfterSave).toEqual(legacyBeforeSave);
      }
      if (mapRawBeforeSave && origin.mapId) {
        const mapRawAfterSave = await captureMapRawOwnersAndSentinels(page, origin.mapId);
        expectMapRawSentinels(mapRawAfterSave);
        expect(mapRawAfterSave.snapshot.title).toBe(savedPlanTitle);
        expect(mapRawAfterSave.persistence.mapTitle).toBe(savedPlanTitle);
        expect(mapRawAfterSave.snapshot.personalCopyOwner).toEqual(
          mapRawBeforeSave.snapshot.personalCopyOwner,
        );
        expect(mapRawAfterSave.persistence.personalCopyOwner).toEqual(
          mapRawBeforeSave.persistence.personalCopyOwner,
        );
        expect(mapRawAfterSave.persistence.firstChild).toEqual(
          mapRawBeforeSave.persistence.firstChild,
        );
        expect(mapRawAfterSave.persistence.firstStep).toEqual(
          mapRawBeforeSave.persistence.firstStep,
        );
      }

      await page.reload();
      flow = await openApprovedPlan(page, origin.slug);
      await expect(flow).toContainText(savedPlanTitle);
      await flow.getByTestId('my-plan-edit').click();
      planEditor = page.getByTestId('saved-flow-editor-plan');
      await expectSharedSavedEditor(page, planEditor, 'plan');
      await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(savedPlanTitle);
      const reloadedParentItem = planEditor.locator(
        `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
      );
      await expect(reloadedParentItem).toContainText(savedItemTitle);
      await expect(reloadedParentItem).toContainText(savedItemDate);
      await reloadedParentItem.getByTestId('saved-flow-editor-item-open').click();
      itemEditor = page.getByTestId('saved-flow-editor-item');
      await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue(savedItemTitle);
      await expect.poll(() => (
        itemEditor.getByTestId('saved-flow-editor-item-detail-input').inputValue()
      )).toContain(savedItemDetail);
      await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue(savedItemDate);
      expect(browserErrors).toEqual([]);
    });
  }

  for (const fixture of ORIGINS.filter(({ kind }) => (
    kind === 'source-backed-map' || kind === 'legacy-saved-plan'
  ))) {
    test(`${fixture.label} item-only save does not rewrite its record or title owner`, async ({ page }) => {
      test.setTimeout(120_000);
      const origin = await fixture.create(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      let flow = await openApprovedPlan(page, origin.slug);
      await flow.getByTestId('my-plan-edit').click();

      let planEditor = page.getByTestId('saved-flow-editor-plan');
      await expectSharedSavedEditor(page, planEditor, 'plan');
      const openedPlanTitle = await planEditor
        .getByTestId('saved-flow-editor-title-input')
        .inputValue();
      const savedRecordKey = `flow:saved:${origin.slug}`;
      const recordRawBefore = await page.evaluate((key) => (
        window.localStorage.getItem(key)
      ), savedRecordKey);
      expect(recordRawBefore).not.toBeNull();
      const mapRawBefore = origin.kind === 'source-backed-map' && origin.mapId
        ? await captureMapRawOwnersAndSentinels(page, origin.mapId)
        : undefined;
      if (mapRawBefore) expectMapRawSentinels(mapRawBefore);
      const legacyBefore = origin.kind === 'legacy-saved-plan'
        ? await captureLegacySchemaAndSentinels(page, origin.slug)
        : undefined;
      if (legacyBefore) expectLegacySchemaAndSentinels(legacyBefore);
      const storageBeforeItemOnlySave = await rawStorageSnapshot(page);

      const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').first();
      const itemId = await itemOpener.getAttribute('data-item-id');
      expect(itemId).toBeTruthy();
      await itemOpener.click();
      let itemEditor = page.getByTestId('saved-flow-editor-item');
      await expectSharedSavedEditor(page, itemEditor, 'item');
      const savedItemTitle = `${fixture.titleToken} 항목만 수정`;
      await itemEditor.getByTestId('saved-flow-editor-item-title-input').fill(savedItemTitle);
      await itemEditor.getByTestId('my-flow-detail-save-changes').click();
      await expect(itemEditor).toHaveCount(0);
      await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(
        openedPlanTitle,
      );
      await planEditor.getByTestId('saved-flow-editor-save').click();
      await expect(planEditor).toHaveCount(0);

      const storageAfterItemOnlySave = await rawStorageSnapshot(page);
      const changedKeys = changedRawKeys(
        storageBeforeItemOnlySave.local,
        storageAfterItemOnlySave.local,
      );
      expect(changedKeys.length).toBeGreaterThan(0);
      expect(changedKeys).not.toContain(savedRecordKey);
      expect(storageAfterItemOnlySave.local[savedRecordKey]).toBe(recordRawBefore);
      expect(storageAfterItemOnlySave.local['flow:editor-storage-commit-marker:v2']).toBeUndefined();
      expect(storageAfterItemOnlySave.session['flow:editor-storage-recovery:v2']).toBeUndefined();

      if (mapRawBefore && origin.mapId) {
        const mapRawAfter = await captureMapRawOwnersAndSentinels(page, origin.mapId);
        expectMapRawSentinels(mapRawAfter);
        expect(mapRawAfter.snapshot.title).toBe(mapRawBefore.snapshot.title);
        expect(mapRawAfter.persistence.mapTitle).toBe(mapRawBefore.persistence.mapTitle);
        expect(mapRawAfter.snapshot.personalCopyOwner).toEqual(
          mapRawBefore.snapshot.personalCopyOwner,
        );
        expect(mapRawAfter.persistence.personalCopyOwner).toEqual(
          mapRawBefore.persistence.personalCopyOwner,
        );
        expect(mapRawAfter.persistence.firstChild).toEqual(mapRawBefore.persistence.firstChild);
        expect(mapRawAfter.persistence.firstStep).toEqual(mapRawBefore.persistence.firstStep);
      }
      if (legacyBefore) {
        const legacyAfter = await captureLegacySchemaAndSentinels(page, origin.slug);
        expectLegacySchemaAndSentinels(legacyAfter);
        expect(legacyAfter).toEqual(legacyBefore);
      }

      await page.reload();
      flow = await openApprovedPlan(page, origin.slug);
      await flow.getByTestId('my-plan-edit').click();
      planEditor = page.getByTestId('saved-flow-editor-plan');
      await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(
        openedPlanTitle,
      );
      const reloadedItem = planEditor.locator(
        `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
      );
      await expect(reloadedItem).toContainText(savedItemTitle);
      await reloadedItem.getByTestId('saved-flow-editor-item-open').click();
      itemEditor = page.getByTestId('saved-flow-editor-item');
      await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue(
        savedItemTitle,
      );
    });
  }

  for (const viewport of WIDE_VIEWPORTS) {
    for (const fixture of ORIGINS) {
      test(`${fixture.label} keeps shared Plan/Item and focus parity at ${viewport.label}px`, async ({ page }) => {
        test.setTimeout(120_000);
        const origin = await fixture.create(page);
        await page.setViewportSize(viewport);
        const flow = await openApprovedPlan(page, origin.slug);
        const storageBefore = await rawStorageSnapshot(page);
        const planOpener = flow.getByTestId('my-plan-edit');
        await planOpener.focus();
        await planOpener.click();

        const planEditor = page.getByTestId('saved-flow-editor-plan');
        await expectSharedSavedEditor(page, planEditor, 'plan');
        await expectEditorGeometry(page, planEditor, viewport);
        const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').first();
        await itemOpener.focus();
        await itemOpener.click();

        const itemEditor = page.getByTestId('saved-flow-editor-item');
        await expectSharedSavedEditor(page, itemEditor, 'item');
        await expectEditorGeometry(page, itemEditor, viewport);
        await page.goBack();
        await expect(itemEditor).toHaveCount(0);
        await expect(planEditor).toBeVisible();
        await expect(itemOpener).toBeFocused();

        await planEditor.getByTestId('saved-flow-editor-cancel').click();
        await expect(planEditor).toHaveCount(0);
        await expect(planOpener).toBeFocused();
        expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
      });
    }
  }
});

async function expectMinimumTargetSize(
  target: Locator,
  minimum: Readonly<{ width?: number; height?: number }> = { height: 48 },
): Promise<void> {
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (minimum.width !== undefined) expect(box?.width ?? 0).toBeGreaterThanOrEqual(minimum.width);
  if (minimum.height !== undefined) expect(box?.height ?? 0).toBeGreaterThanOrEqual(minimum.height);
}

async function expectMyFlowLibraryHistoryLevel(
  page: Page,
  level: 'list' | 'plan',
): Promise<void> {
  await expect.poll(() => page.evaluate(() => {
    const state = window.history.state as {
      flowmeMyFlowLibrary?: { level?: string };
    } | null;
    return state?.flowmeMyFlowLibrary?.level ?? null;
  })).toBe(level);
}

function mobileLibraryRow(page: Page, flowSlug: string): Locator {
  return page.locator(
    `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
  );
}

function mobileArchivedRow(page: Page, flowSlug: string): Locator {
  return page.locator(
    `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${flowSlug}"]`,
  );
}

async function openMobileApprovedPlanFromLibrary(
  page: Page,
  flowSlug: string,
): Promise<Readonly<{ opener: Locator; plan: Locator }>> {
  const opener = mobileLibraryRow(page, flowSlug).getByTestId('my-flow-mobile-structure-open');
  await expect(opener).toBeVisible();
  await opener.focus();
  await opener.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(flowSlug);
  await expectMyFlowLibraryHistoryLevel(page, 'plan');
  const plan = page.locator(
    `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`,
  );
  await expect(plan.getByTestId('approved-my-plan-workspace')).toBeVisible();
  return { opener, plan };
}

async function archiveFromMobileApprovedPlan(plan: Locator): Promise<void> {
  const managementTrigger = plan.getByTestId('my-plan-management-trigger');
  await expectMinimumTargetSize(managementTrigger);
  await managementTrigger.click();
  const archive = plan.getByTestId('my-flow-archive-toggle');
  await expectMinimumTargetSize(archive);
  await archive.click();
}

test.describe('approved My Plan mobile lifecycle continuity', () => {
  test('390 Back returns to the saved-plan list and restores the same opener focus', async ({ page }) => {
    test.setTimeout(120_000);
    const origin = await createCanonicalPersonalCopy(page);
    await page.goto('/my?view=flows');

    const { opener, plan } = await openMobileApprovedPlanFromLibrary(page, origin.slug);
    const back = plan.getByTestId('my-plan-library-back');
    await expectMinimumTargetSize(back, { width: 48, height: 48 });
    await back.click();

    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBeNull();
    await expectMyFlowLibraryHistoryLevel(page, 'list');
    await expect(plan).toHaveCount(0);
    await expect(mobileLibraryRow(page, origin.slug)).toBeVisible();
    await expect(opener).toBeFocused();
  });

  test('390 archive consumes the Plan entry instead of leaving browser Back on My Plan', async ({ page }) => {
    test.setTimeout(120_000);
    const origin = await createCanonicalPersonalCopy(page);
    await page.goto('/flows');
    await page.goto('/my?view=flows');

    const { plan } = await openMobileApprovedPlanFromLibrary(page, origin.slug);
    await archiveFromMobileApprovedPlan(plan);

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.get('flow'),
        status: url.searchParams.get('status'),
      };
    }).toEqual({ flow: null, status: 'archived' });
    await expectMyFlowLibraryHistoryLevel(page, 'list');
    await expect(mobileArchivedRow(page, origin.slug)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/flows(?:\?|$)/u);
    expect(new URL(page.url()).searchParams.get('flow')).toBeNull();
    await expect(plan).toHaveCount(0);
  });

  test('390 archive Undo restores stable row focus and archived restore stays single-owner with 48px targets', async ({ page }) => {
    test.setTimeout(120_000);
    const origin = await createCanonicalPersonalCopy(page);
    await page.goto('/my?view=flows');

    let { plan } = await openMobileApprovedPlanFromLibrary(page, origin.slug);
    await archiveFromMobileApprovedPlan(plan);

    const snackbar = page.getByTestId('my-flow-lifecycle-snackbar');
    const undo = page.getByTestId('my-flow-lifecycle-undo');
    await expect(snackbar).toHaveAttribute('data-lifecycle-action', 'archive');
    await expect(undo).toBeFocused();

    let archivedRow = mobileArchivedRow(page, origin.slug);
    await expect(archivedRow).toBeVisible();
    const directRestore = archivedRow.getByTestId('my-flow-archived-direct-restore');
    const archivedManagementTrigger = archivedRow.getByTestId(
      'my-flow-archived-management-trigger',
    );
    await expectMinimumTargetSize(directRestore);
    await expectMinimumTargetSize(archivedManagementTrigger);
    await archivedManagementTrigger.click();
    const archivedManagement = archivedRow.getByTestId('my-flow-archived-management-menu');
    await expect(archivedManagement.getByTestId('my-flow-archive-toggle')).toHaveCount(0);
    const archivedMenuItems = archivedManagement.getByRole('menuitem');
    expect(await archivedMenuItems.count()).toBeGreaterThan(0);
    for (let index = 0; index < await archivedMenuItems.count(); index += 1) {
      await expectMinimumTargetSize(archivedMenuItems.nth(index));
    }
    await page.keyboard.press('Escape');

    await undo.click();
    await expect(snackbar).toHaveCount(0);
    let activeRow = mobileLibraryRow(page, origin.slug);
    const activeOpener = activeRow.getByTestId('my-flow-mobile-structure-open');
    await expect(activeRow).toBeVisible();
    await expect(activeOpener).toBeFocused();

    ({ plan } = await openMobileApprovedPlanFromLibrary(page, origin.slug));
    await archiveFromMobileApprovedPlan(plan);
    archivedRow = mobileArchivedRow(page, origin.slug);
    await expect(archivedRow).toBeVisible();
    await archivedRow.getByTestId('my-flow-archived-direct-restore').click();

    await expect(snackbar).toHaveAttribute('data-lifecycle-action', 'restore');
    await expect(undo).toBeFocused();
    activeRow = mobileLibraryRow(page, origin.slug);
    await expect(activeRow).toBeVisible();
    await expect(archivedRow).toHaveCount(0);
  });
});

const PERSONAL_DRAFT_BOUNDARY_SENTINELS = {
  bundle: { owner: 'personal-draft-bundle', keep: 'bundle-raw' },
  flow: { owner: 'personal-draft-flow', keep: 'flow-source-raw' },
  record: { owner: 'personal-draft-record', keep: 'record-identity-raw' },
} as const;
const CANONICAL_DATE_ALIAS_SENTINEL = {
  owner: 'canonical-date-scoped-alias',
  keep: 'non-date-fields',
} as const;

async function installPersonalDraftBoundarySentinels(
  page: Page,
  flowSlug: string,
): Promise<void> {
  await page.evaluate(({ slug, sentinels }) => {
    const bundleKey = 'flow_builder_mvp_bundles_v11';
    const bundles = JSON.parse(window.localStorage.getItem(bundleKey) ?? '[]') as Array<
      Record<string, unknown> & { flow?: Record<string, unknown> }
    >;
    const bundleIndex = bundles.findIndex((candidate) => candidate.flow?.slug === slug);
    if (bundleIndex < 0) throw new Error('Expected the personal draft bundle.');
    const bundle = bundles[bundleIndex]!;
    bundles[bundleIndex] = {
      ...bundle,
      unknownBoundarySentinel: sentinels.bundle,
      flow: {
        ...bundle.flow,
        unknownBoundarySentinel: sentinels.flow,
      },
    };

    const recordKey = `flow:saved:${slug}`;
    const record = JSON.parse(window.localStorage.getItem(recordKey) ?? 'null') as
      | Record<string, unknown>
      | null;
    if (!record) throw new Error('Expected the personal draft saved record.');
    window.localStorage.setItem(bundleKey, JSON.stringify(bundles));
    window.localStorage.setItem(recordKey, JSON.stringify({
      ...record,
      unknownBoundarySentinel: sentinels.record,
    }));
  }, { slug: flowSlug, sentinels: PERSONAL_DRAFT_BOUNDARY_SENTINELS });
}

async function capturePersonalDraftAnchorBoundary(page: Page, flowSlug: string) {
  return page.evaluate((slug) => {
    const bundleKey = 'flow_builder_mvp_bundles_v11';
    const bundles = JSON.parse(window.localStorage.getItem(bundleKey) ?? '[]') as Array<
      Record<string, unknown> & { flow?: Record<string, unknown> }
    >;
    const record = JSON.parse(window.localStorage.getItem(`flow:saved:${slug}`) ?? 'null') as
      | Record<string, unknown>
      | null;
    if (!record) throw new Error('Expected the personal draft saved record.');
    let flowAnchorType: unknown;
    let flowUpdatedAt: unknown;
    let found = false;
    const preservedBundles = bundles.map((bundle) => {
      if (bundle.flow?.slug !== slug) return bundle;
      found = true;
      const {
        anchor_type: anchorType,
        updated_at: updatedAt,
        ...preservedFlow
      } = bundle.flow;
      flowAnchorType = anchorType;
      flowUpdatedAt = updatedAt;
      return { ...bundle, flow: preservedFlow };
    });
    if (!found) throw new Error('Expected the personal draft bundle.');
    const {
      anchor,
      dateIntent,
      savedAt,
      ...preservedRecord
    } = record;
    return {
      preservedBundles,
      flowAnchorType,
      flowUpdatedAt,
      preservedRecord,
      recordAnchor: anchor,
      recordDateIntent: dateIntent,
      recordSavedAt: savedAt,
      storedAnchor: JSON.parse(
        window.localStorage.getItem(`flow:${slug}:anchorDate`) ?? 'null',
      ) as unknown,
    };
  }, flowSlug);
}

async function installLegacyAnchor(
  page: Page,
  flowSlug: string,
  anchor: string,
): Promise<void> {
  await page.evaluate(({ slug, value }) => {
    const recordKey = `flow:saved:${slug}`;
    const record = JSON.parse(window.localStorage.getItem(recordKey) ?? 'null') as
      | Record<string, unknown>
      | null;
    if (!record) throw new Error('Expected the legacy saved record.');
    window.localStorage.setItem(recordKey, JSON.stringify({
      ...record,
      anchor: value,
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${slug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: value }),
    );
  }, { slug: flowSlug, value: anchor });
}

async function captureLegacyAnchorBoundary(page: Page, flowSlug: string) {
  return page.evaluate((slug) => {
    const record = JSON.parse(window.localStorage.getItem(`flow:saved:${slug}`) ?? 'null') as
      | Record<string, unknown>
      | null;
    const itemDrafts = JSON.parse(
      window.localStorage.getItem('flow:my-flow:item-drafts') ?? '{}',
    ) as Record<string, unknown>;
    if (!record) throw new Error('Expected the legacy saved record.');
    const {
      anchor,
      dateIntent,
      savedAt,
      ...preservedRecord
    } = record;
    return {
      preservedRecord,
      anchor,
      dateIntent,
      savedAt,
      storedAnchor: JSON.parse(
        window.localStorage.getItem(`flow:${slug}:anchorDate`) ?? 'null',
      ) as unknown,
      ownedItemDrafts: Object.entries(itemDrafts)
        .filter(([key]) => key.startsWith(`${slug}::`))
        .map(([key, value]) => ({ key, value })),
    };
  }, flowSlug);
}

async function captureMapCompositionBoundary(
  page: Page,
  mapId: string,
  flowSlug: string,
  itemId: string,
) {
  return page.evaluate(({ savedMapId, slug, stepId }) => {
    const snapshot = JSON.parse(
      window.localStorage.getItem(`flow:map:saved:${savedMapId}`) ?? 'null',
    ) as Record<string, unknown> | null;
    const persistence = JSON.parse(
      window.localStorage.getItem(`flow:map:persistence:${savedMapId}`) ?? 'null',
    ) as Record<string, unknown> | null;
    if (!snapshot || !persistence) throw new Error('Expected raw Map records.');
    const capturePersonalCopy = (owner: unknown) => {
      const personalCopy = owner && typeof owner === 'object' && !Array.isArray(owner)
        ? owner as Record<string, unknown>
        : {};
      const included = personalCopy.includedStepIdsByFlow as
        | Record<string, string[]>
        | undefined;
      const excluded = personalCopy.excludedStepIdsByFlow as
        | Record<string, string[]>
        | undefined;
      const overrides = personalCopy.stepOverridesByFlow as
        | Record<string, Record<string, unknown>>
        | undefined;
      return {
        included: included?.[slug] ?? [],
        excluded: excluded?.[slug] ?? [],
        itemOverride: overrides?.[slug]?.[stepId] ?? null,
      };
    };
    const childFlows = Array.isArray(persistence.childFlows)
      ? persistence.childFlows as Array<Record<string, unknown>>
      : [];
    const child = childFlows.find((candidate) => candidate.slug === slug);
    const itemStates = JSON.parse(
      window.localStorage.getItem(`flow_builder_mvp_item_state_${slug}`) ?? '{}',
    ) as Record<string, unknown>;
    const dateOverrides = JSON.parse(
      window.localStorage.getItem('flow:my-flow:date-overrides') ?? '{}',
    ) as Record<string, unknown>;
    return {
      snapshot: capturePersonalCopy(snapshot.personalCopy),
      persistence: {
        ...capturePersonalCopy(persistence.personalCopy),
        childStepIds: Array.isArray(child?.stepIds) ? child.stepIds : [],
      },
      itemState: itemStates[stepId] ?? null,
      ownedDateOverrides: Object.entries(dateOverrides)
        .filter(([key]) => key.startsWith(`${slug}::${stepId}::`)),
    };
  }, { savedMapId: mapId, slug: flowSlug, stepId: itemId });
}

async function readMapRawBytes(page: Page, mapId: string) {
  return page.evaluate((savedMapId) => ({
    snapshot: window.localStorage.getItem(`flow:map:saved:${savedMapId}`),
    persistence: window.localStorage.getItem(`flow:map:persistence:${savedMapId}`),
  }), mapId);
}

function shiftIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().slice(0, 10);
}

async function readCanonicalItemDraft(
  page: Page,
  flowSlug: string,
  itemId: string,
): Promise<Record<string, unknown> | null> {
  return page.evaluate(({ slug, id }) => {
    const drafts = JSON.parse(
      window.localStorage.getItem('flow:my-flow:item-drafts') ?? '{}',
    ) as Record<string, Record<string, unknown>>;
    return drafts[`${slug}::${id}::draft-overlay`] ?? null;
  }, { slug: flowSlug, id: itemId });
}

test.describe('approved My Plan final persistence boundaries', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('personal memo draft start anchor survives reload without rewriting raw source or identity', async ({ page }) => {
    test.setTimeout(120_000);
    const anchor = '2031-11-03';
    const origin = await createPersonalMemoDraft(page);
    await installPersonalDraftBoundarySentinels(page, origin.slug);
    const before = await capturePersonalDraftAnchorBoundary(page, origin.slug);

    let flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    const anchorInput = planEditor.getByTestId('saved-flow-editor-anchor-input');
    await expect(anchorInput).toBeEnabled();
    await expect(anchorInput).toHaveJSProperty('required', false);
    await expect(anchorInput).toHaveValue('');
    await anchorInput.fill(anchor);
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const after = await capturePersonalDraftAnchorBoundary(page, origin.slug);
    expect(after.preservedBundles).toEqual(before.preservedBundles);
    expect(after.preservedRecord).toEqual(before.preservedRecord);
    expect(after.flowAnchorType).toBe('start_date');
    expect(after.flowUpdatedAt).not.toBe(before.flowUpdatedAt);
    expect(after.recordAnchor).toBe(anchor);
    expect(after.recordDateIntent).toBe('custom');
    expect(after.recordSavedAt).not.toBe(before.recordSavedAt);
    expect(after.storedAnchor).toEqual({ mode: 'custom', anchor });

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    await expect(planEditor.getByTestId('saved-flow-editor-anchor-input')).toHaveValue(anchor);
    expect((await capturePersonalDraftAnchorBoundary(page, origin.slug)).preservedBundles)
      .toEqual(after.preservedBundles);
  });

  test('canonical memo-only Item edit follows a later Plan anchor without materializing its old date', async ({ page }) => {
    test.setTimeout(120_000);
    const itemMemo = '기준일을 바꿔도 새 일정으로 따라가야 하는 개인 메모';
    const origin = await createCanonicalPersonalCopy(page);
    let flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    let anchorInput = planEditor.getByTestId('saved-flow-editor-anchor-input');
    await expect(anchorInput).toBeEnabled();
    let openedAnchor = await anchorInput.inputValue();
    if (!openedAnchor) {
      openedAnchor = '2031-10-01';
      await anchorInput.fill(openedAnchor);
      await planEditor.getByTestId('saved-flow-editor-save').click();
      await page.reload();
      flow = await openApprovedPlan(page, origin.slug);
      await flow.getByTestId('my-plan-edit').click();
      planEditor = page.getByTestId('saved-flow-editor-plan');
      anchorInput = planEditor.getByTestId('saved-flow-editor-anchor-input');
      await expect(anchorInput).toHaveValue(openedAnchor);
    }
    expect(openedAnchor).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const savedAnchor = shiftIsoDate(openedAnchor, 14);

    const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').first();
    const itemId = await itemOpener.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await itemOpener.click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    const untouchedItemDate = await itemEditor
      .getByTestId('saved-flow-editor-item-date-input')
      .inputValue();
    expect(untouchedItemDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const expectedShiftedItemDate = shiftIsoDate(untouchedItemDate, 14);
    await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(itemMemo);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await anchorInput.fill(savedAnchor);
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const storedDraft = await readCanonicalItemDraft(page, origin.slug, itemId!);
    expect(storedDraft).toMatchObject({ memo: itemMemo });
    expect(storedDraft).not.toHaveProperty('date');

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    await expect(planEditor.getByTestId('saved-flow-editor-anchor-input')).toHaveValue(savedAnchor);
    const reloadedItem = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(reloadedItem).toContainText(expectedShiftedItemDate);
    await reloadedItem.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input'))
      .toHaveValue(expectedShiftedItemDate);
    await expect.poll(() => itemEditor
      .getByTestId('saved-flow-editor-item-detail-input')
      .inputValue()).toContain(itemMemo);
  });

  test('canonical Saved editor replaces a stale date-scoped alias and can reset to the source date', async ({ page }) => {
    test.setTimeout(180_000);
    const origin = await createCanonicalPersonalCopy(page);
    let flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    const initialPlanEditor = page.getByTestId('saved-flow-editor-plan');
    const initialAnchorInput = initialPlanEditor.getByTestId('saved-flow-editor-anchor-input');
    await expect(initialAnchorInput).toBeEnabled();
    if (!await initialAnchorInput.inputValue()) {
      await initialAnchorInput.fill('2032-01-10');
      await initialPlanEditor.getByTestId('saved-flow-editor-save').click();
      await expect(initialPlanEditor).toHaveCount(0);
    } else {
      await initialPlanEditor.getByTestId('saved-flow-editor-cancel').click();
    }
    const legacyParams = new URLSearchParams({
      view: 'flows',
      flow: origin.slug,
      editorTransaction: 'off',
    });
    await page.goto(`/my?${legacyParams.toString()}`);
    flow = await openMyFlowLibraryFlow(page, origin.slug, 'plan');
    const executionItemLink = flow.getByTestId('my-plan-todo-detail-link').first();
    await expect(executionItemLink).toBeVisible();
    await executionItemLink.click();
    let detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    const itemId = await detail.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await detail.getByTestId('my-flow-quick-item-edit').click();
    const legacyEditor = page.locator(
      `[data-testid="my-flow-item-detail"][data-item-id="${itemId}"][data-detail-mode="edit"]:visible`,
    );
    await expect(legacyEditor).toHaveCount(1);
    await expect(page.getByTestId('saved-flow-editor-item')).toHaveCount(0);
    const legacyDateInput = legacyEditor.getByTestId('my-flow-detail-date-input');
    const sourceDate = await legacyDateInput.inputValue();
    expect(sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const firstFixedDate = shiftIsoDate(sourceDate, 3);
    const secondFixedDate = shiftIsoDate(sourceDate, 6);
    await legacyDateInput.fill(firstFixedDate);
    await legacyEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(legacyEditor).toHaveCount(0);

    const aliasKey = `${origin.slug}::${itemId}::${sourceDate}`;
    const preservedAliasFields = await page.evaluate(({ key, date, sentinel }) => {
      const dateOverrides = JSON.parse(
        window.localStorage.getItem('flow:my-flow:date-overrides') ?? '{}',
      ) as Record<string, unknown>;
      if (dateOverrides[key] !== date) {
        throw new Error('Expected the legacy execution editor to persist A to B.');
      }
      const itemDraftKey = 'flow:my-flow:item-drafts';
      const itemDrafts = JSON.parse(
        window.localStorage.getItem(itemDraftKey) ?? '{}',
      ) as Record<string, Record<string, unknown>>;
      const seededAlias = {
        ...(itemDrafts[key] ?? {}),
        date,
        unknownBoundarySentinel: sentinel,
      };
      itemDrafts[key] = seededAlias;
      window.localStorage.setItem(itemDraftKey, JSON.stringify(itemDrafts));
      const { date: _date, ...preserved } = seededAlias;
      return preserved;
    }, { key: aliasKey, date: firstFixedDate, sentinel: CANONICAL_DATE_ALIAS_SENTINEL });

    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    let itemRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(itemRow).toContainText(firstFixedDate);
    await itemRow.getByTestId('saved-flow-editor-item-open').click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input'))
      .toHaveValue(firstFixedDate);
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(secondFixedDate);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const readOwners = () => page.evaluate(({ slug, id, alias }) => {
      const itemDrafts = JSON.parse(
        window.localStorage.getItem('flow:my-flow:item-drafts') ?? '{}',
      ) as Record<string, Record<string, unknown>>;
      const dateOverrides = JSON.parse(
        window.localStorage.getItem('flow:my-flow:date-overrides') ?? '{}',
      ) as Record<string, unknown>;
      return {
        valueOwner: itemDrafts[`${slug}::${id}::draft-overlay`] ?? null,
        dateScopedAlias: itemDrafts[alias] ?? null,
        dateOverride: dateOverrides[alias] ?? null,
      };
    }, { slug: origin.slug, id: itemId!, alias: aliasKey });
    let owners = await readOwners();
    expect(owners.valueOwner).toMatchObject({ date: secondFixedDate });
    expect(owners.dateScopedAlias).toEqual(preservedAliasFields);
    expect(owners.dateOverride).toBeNull();

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    itemRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(itemRow).toContainText(secondFixedDate);
    await itemRow.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input'))
      .toHaveValue(secondFixedDate);
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(sourceDate);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    owners = await readOwners();
    expect(owners.valueOwner ?? {}).not.toHaveProperty('date');
    expect(owners.dateScopedAlias).toEqual(preservedAliasFields);
    expect(owners.dateOverride).toBeNull();

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    itemRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(itemRow).toContainText(sourceDate);
    await itemRow.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input'))
      .toHaveValue(sourceDate);
  });

  test('anchored legacy A to B preserves fixed Item date, memo, and unknown raw fields', async ({ page }) => {
    test.setTimeout(120_000);
    const openedAnchor = '2031-12-01';
    const savedAnchor = '2031-12-10';
    const fixedItemDate = '2031-12-20';
    const itemMemo = '앵커 이동 뒤에도 보존해야 하는 개인 메모';
    const origin = await createLegacySavedPlan(page);
    await installLegacyAnchor(page, origin.slug, openedAnchor);
    const before = await captureLegacyAnchorBoundary(page, origin.slug);
    expectLegacySchemaAndSentinels(
      await captureLegacySchemaAndSentinels(page, origin.slug),
    );

    let flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    const anchorInput = planEditor.getByTestId('saved-flow-editor-anchor-input');
    await expect(anchorInput).toBeEnabled();
    await expect(anchorInput).toHaveJSProperty('required', true);
    await expect(anchorInput).toHaveValue(openedAnchor);
    await anchorInput.fill(savedAnchor);

    const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').first();
    const itemId = await itemOpener.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await itemOpener.click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(fixedItemDate);
    await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(itemMemo);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const after = await captureLegacyAnchorBoundary(page, origin.slug);
    expect(after.preservedRecord).toEqual(before.preservedRecord);
    expect(after.anchor).toBe(savedAnchor);
    expect(after.dateIntent).toBe('custom');
    expect(after.savedAt).not.toBe(before.savedAt);
    expect(after.storedAnchor).toEqual({ mode: 'custom', anchor: savedAnchor });
    expect(after.ownedItemDrafts.some(({ value }) => {
      const draft = value as Record<string, unknown>;
      return draft.date === fixedItemDate && draft.memo === itemMemo;
    })).toBe(true);
    expectLegacySchemaAndSentinels(
      await captureLegacySchemaAndSentinels(page, origin.slug),
    );

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    await expect(planEditor.getByTestId('saved-flow-editor-anchor-input')).toHaveValue(savedAnchor);
    const reloadedItem = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(reloadedItem).toContainText(fixedItemDate);
    await reloadedItem.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input'))
      .toHaveValue(fixedItemDate);
    await expect.poll(() => itemEditor
      .getByTestId('saved-flow-editor-item-detail-input')
      .inputValue()).toContain(itemMemo);
  });

  test('source-backed Map keeps inclusion, order, and removed Item date after reload', async ({ page }) => {
    test.setTimeout(180_000);
    const seededDate = '2032-01-20';
    const origin = await createSourceBackedMap(page);
    expect(origin.mapId).toBeTruthy();
    let flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    const initialRows = planEditor.getByTestId('saved-flow-editor-item-row');
    expect(await initialRows.count()).toBeGreaterThanOrEqual(3);
    const initialIds = await initialRows.evaluateAll((rows) => rows.map(
      (row) => row.getAttribute('data-item-id') ?? '',
    ));
    const [firstId, secondId, excludedId] = initialIds;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(excludedId).toBeTruthy();

    await initialRows.first().getByTestId('saved-flow-editor-item-open').click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(seededDate);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);
    let mapBoundary = await captureMapCompositionBoundary(
      page,
      origin.mapId!,
      origin.slug,
      firstId!,
    );
    expect((mapBoundary.snapshot.itemOverride as Record<string, unknown>).schedule)
      .toEqual({ mode: 'fixed_date', date: seededDate });
    expect((mapBoundary.persistence.itemOverride as Record<string, unknown>).schedule)
      .toEqual({ mode: 'fixed_date', date: seededDate });
    expectMapRawSentinels(await captureMapRawOwnersAndSentinels(page, origin.mapId!));

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    let firstRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${firstId}"]`,
    );
    await expect(firstRow).toContainText(seededDate);
    await firstRow.locator('[role="group"] button').nth(1).click();
    const excludedRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${excludedId}"]`,
    );
    await excludedRow.getByRole('checkbox').uncheck();
    firstRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${firstId}"]`,
    );
    await firstRow.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('');
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const expectedIncludedOrder = [
      secondId!,
      firstId!,
      ...initialIds.slice(2).filter((itemId) => itemId !== excludedId),
    ];
    mapBoundary = await captureMapCompositionBoundary(
      page,
      origin.mapId!,
      origin.slug,
      firstId!,
    );
    expect(mapBoundary.snapshot.included).toEqual(expectedIncludedOrder);
    expect(mapBoundary.persistence.included).toEqual(expectedIncludedOrder);
    expect(mapBoundary.persistence.childStepIds).toEqual(expectedIncludedOrder);
    expect(mapBoundary.snapshot.excluded).toContain(excludedId);
    expect(mapBoundary.persistence.excluded).toContain(excludedId);
    expect((mapBoundary.snapshot.itemOverride as Record<string, unknown> | null)?.schedule)
      .toBeUndefined();
    expect((mapBoundary.persistence.itemOverride as Record<string, unknown> | null)?.schedule)
      .toBeUndefined();
    expect(mapBoundary.ownedDateOverrides).toEqual([]);
    expect(mapBoundary.itemState).toMatchObject({ personalOrder: 1 });
    const excludedState = await captureMapCompositionBoundary(
      page,
      origin.mapId!,
      origin.slug,
      excludedId!,
    );
    expect(excludedState.itemState).toMatchObject({ personalExcluded: true });
    expectMapRawSentinels(await captureMapRawOwnersAndSentinels(page, origin.mapId!));

    await page.reload();
    flow = await openApprovedPlan(page, origin.slug);
    await flow.getByTestId('my-plan-edit').click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    const reloadedRows = planEditor.getByTestId('saved-flow-editor-item-row');
    await expect(reloadedRows.nth(0)).toHaveAttribute('data-item-id', secondId!);
    await expect(reloadedRows.nth(1)).toHaveAttribute('data-item-id', firstId!);
    await expect(planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${excludedId}"] input[type="checkbox"]`,
    )).not.toBeChecked();
    firstRow = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${firstId}"]`,
    );
    await firstRow.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue('');
  });

  test('source-backed Map no-op save closes without rewriting snapshot or persistence bytes', async ({ page }) => {
    test.setTimeout(120_000);
    const origin = await createSourceBackedMap(page);
    expect(origin.mapId).toBeTruthy();
    const flow = await openApprovedPlan(page, origin.slug);
    const before = await readMapRawBytes(page, origin.mapId!);
    await flow.getByTestId('my-plan-edit').click();
    const planEditor = page.getByTestId('saved-flow-editor-plan');
    const anchorInput = planEditor.getByTestId('saved-flow-editor-anchor-input');
    await expect(anchorInput).toBeDisabled();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);
    expect(await readMapRawBytes(page, origin.mapId!)).toEqual(before);
  });
});
