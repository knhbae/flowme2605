import {
  getPersonalWorkspacePocFlowItemFieldOwnership,
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocPersonalPlanItemOverlay,
  type PersonalWorkspacePocPersonalPlanOverlay,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import {
  type FlowEditorCommitHandlers,
  type FlowEditorValidation,
  type PreparedFlowEditorPlanCommit,
} from './flow-editor-transaction';
import {
  isPersonalWorkspacePocAuthoringFidelityManifestForSource,
} from './personal-workspace-poc-authoring-fidelity';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
} from './personal-workspace-poc-authoring';
import {
  applyPersonalWorkspacePocTransition,
  isPersonalWorkspacePocDate,
  isPersonalWorkspacePocState,
  validatePersonalWorkspacePocStateReferences,
} from './personal-workspace-poc-state';
import {
  preparePersonalWorkspacePocStorageCommit,
} from './personal-workspace-poc-storage-transaction';
import type { PersonalWorkspacePocStorage } from './personal-workspace-poc-storage';

export const PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION = 1 as const;

const SUPPORTED_ORIGINS = new Set<PersonalWorkspacePocOrigin>([
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
  'authoring-handoff',
]);

const PLAN_ERROR_FOCUS = '[data-personal-plan-error-summary]';
const PLAN_TITLE_FOCUS = '[data-personal-plan-title]';
const PLAN_ORDER_FOCUS = '[data-personal-plan-order]';
const PLAN_SECTION_TITLE_FOCUS = '[data-personal-plan-section-title]';
const ITEM_TITLE_FOCUS = '[data-personal-plan-item-title]';
const ITEM_DATE_FOCUS = '[data-personal-plan-item-date]';

export type PersonalWorkspacePocPlanTextDraft = Readonly<
  | { mode: 'inherit' }
  | { mode: 'override'; value: string }
>;

export type PersonalWorkspacePocPlanScheduleDraft = Readonly<
  | { mode: 'inherit' }
  | { mode: 'fixed_date'; date: string }
  | { mode: 'unscheduled' }
>;

export type PersonalWorkspacePocPlanItemIdentity = Readonly<{
  itemRef: string;
  savedCopyId: string;
  flowId: string;
  itemId: string;
}>;

export type PersonalWorkspacePocPlanSectionIdentity = Readonly<{
  sectionId: string;
  sourceOrder: number;
  editCapability: 'read-only' | 'poc-shadow';
}>;

/**
 * Only personal structural choices live in the editable Item draft. Source
 * title/memo/date and execution placement deliberately stay outside it.
 */
export type PersonalWorkspacePocPlanItemDraft = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION;
  guardId: string;
  identity: PersonalWorkspacePocPlanItemIdentity;
  title: PersonalWorkspacePocPlanTextDraft;
  memo: PersonalWorkspacePocPlanTextDraft;
  schedule: PersonalWorkspacePocPlanScheduleDraft;
}>;

/**
 * A Plan draft contains only the personal override intent plus identities.
 * The immutable source snapshot and exact execution placements are retained by
 * the trusted open guard/current state, never copied into editable fields.
 */
export type PersonalWorkspacePocPlanDraft = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION;
  guardId: string;
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  origin: PersonalWorkspacePocOrigin;
  title: PersonalWorkspacePocPlanTextDraft;
  /** Only stable sections with poc-shadow capability are present. */
  sectionTitles?: Readonly<Record<string, PersonalWorkspacePocPlanTextDraft>>;
  orderedItemRefs: readonly string[];
  items: Readonly<Record<string, PersonalWorkspacePocPlanItemDraft>>;
}>;

export type PersonalWorkspacePocPlanTrustedOpenGuard = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION;
  guardId: string;
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  origin: PersonalWorkspacePocOrigin;
  itemIdentities: readonly PersonalWorkspacePocPlanItemIdentity[];
  sectionIdentities: readonly PersonalWorkspacePocPlanSectionIdentity[];
  identityFingerprint: string;
  openedStateRevision: number;
  /** Exact storage bytes at open; null represents the not-yet-created state key. */
  openedStateRaw: string | null;
  /** Canonical bytes also protect the in-memory initial state when raw is null. */
  openedStateCanonicalBytes: string;
  canonicalSourceBytes: string;
  canonicalSourceFingerprint: string;
}>;

export type PersonalWorkspacePocPlanEditorFailure = Readonly<{
  kind: 'validation' | 'runtime' | 'storage';
  code: string;
  message: string;
  firstErrorFocus: string;
}>;

export type PersonalWorkspacePocPlanOpenResult =
  | Readonly<{
      ok: true;
      draft: PersonalWorkspacePocPlanDraft;
      guard: PersonalWorkspacePocPlanTrustedOpenGuard;
    }>
  | Readonly<{ ok: false; failure: PersonalWorkspacePocPlanEditorFailure }>;

export type PersonalWorkspacePocPlanItemOpenResult =
  | Readonly<{ ok: true; draft: PersonalWorkspacePocPlanItemDraft }>
  | Readonly<{ ok: false; failure: PersonalWorkspacePocPlanEditorFailure }>;

export type PersonalWorkspacePocPlanPreflightResult =
  | Readonly<{
      ok: true;
      kind: 'change' | 'no-op';
      overlay: PersonalWorkspacePocPersonalPlanOverlay;
      state: PersonalWorkspacePocState;
      message: string;
    }>
  | Readonly<{ ok: false; failure: PersonalWorkspacePocPlanEditorFailure }>;

export type PersonalWorkspacePocPlanEditorHandlersInput = Readonly<{
  storage: PersonalWorkspacePocStorage;
  guard: PersonalWorkspacePocPlanTrustedOpenGuard;
  /** Must synchronously return the current in-memory state, not the opened clone. */
  readCurrentState: () => PersonalWorkspacePocState;
  /** Must rebuild/read the current read-only origin model at preparation time. */
  readCurrentBaseModel: () => PersonalWorkspacePocReadModel;
  now: () => string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    if (entry !== undefined) normalized[key] = canonicalize(entry);
  }
  return normalized;
}

export function canonicalPersonalWorkspacePocPlanEditorBytes(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  if (serialized === undefined) throw new TypeError('personal-plan-canonical-value-required');
  return serialized;
}

/**
 * Deterministic, non-cryptographic drift locator. Exact byte comparison remains
 * authoritative; this fingerprint makes receipts and diagnostics compact.
 */
export function fingerprintPersonalWorkspacePocPlanEditorBytes(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `pwp-plan-v1:${(hash >>> 0).toString(16).padStart(8, '0')}:${value.length}`;
}

function failure(
  code: string,
  message: string,
  firstErrorFocus = PLAN_ERROR_FOCUS,
  kind: PersonalWorkspacePocPlanEditorFailure['kind'] = 'validation',
): PersonalWorkspacePocPlanEditorFailure {
  return { kind, code, message, firstErrorFocus };
}

function throwFailure(value: PersonalWorkspacePocPlanEditorFailure): never {
  throw value;
}

function validationFromFailure(
  value: PersonalWorkspacePocPlanEditorFailure | null,
): FlowEditorValidation {
  return value ? { valid: false, firstErrorFocus: value.firstErrorFocus } : { valid: true };
}

function hasOwn(record: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function validateRawStateMatches(
  state: PersonalWorkspacePocState,
  raw: string | null,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (!isPersonalWorkspacePocState(state)) {
    return failure('invalid-current-state', '개인공간 상태를 다시 불러와 주세요.');
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersonalWorkspacePocState(parsed)
      || canonicalPersonalWorkspacePocPlanEditorBytes(parsed)
        !== canonicalPersonalWorkspacePocPlanEditorBytes(state)) {
      return failure('current-state-raw-mismatch', '저장된 상태와 화면 상태가 달라 다시 불러와야 합니다.');
    }
  } catch {
    return failure('invalid-current-state-raw', '저장된 개인공간 상태를 읽을 수 없습니다.');
  }
  return null;
}

type LocatedFlow = Readonly<{
  flow: PersonalWorkspacePocFlow;
  itemIdentities: readonly PersonalWorkspacePocPlanItemIdentity[];
  sectionIdentities: readonly PersonalWorkspacePocPlanSectionIdentity[];
}>;

function locateFlow(
  baseModel: PersonalWorkspacePocReadModel,
  state: PersonalWorkspacePocState,
  flowRef: string,
): LocatedFlow | PersonalWorkspacePocPlanEditorFailure {
  if (baseModel.version !== PERSONAL_WORKSPACE_POC_VERSION
    || !Array.isArray(baseModel.flows)) {
    return failure('invalid-base-model', '원본 Flow 목록을 다시 불러와 주세요.');
  }

  const flows = [...baseModel.flows, ...(state.authoredFlows ?? [])];
  const flowRefs = new Set<string>();
  const itemRefs = new Set<string>();
  let target: PersonalWorkspacePocFlow | null = null;

  for (const flow of flows) {
    if (typeof flow.ref !== 'string'
      || typeof flow.savedCopyId !== 'string'
      || typeof flow.flowId !== 'string'
      || flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)
      || !SUPPORTED_ORIGINS.has(flow.origin)
      || !Array.isArray(flow.items)) {
      return failure('foreign-flow-identity', '원본 Flow 식별자가 현재 계약과 다릅니다.');
    }
    if (flowRefs.has(flow.ref)) {
      return failure('duplicate-flow-identity', '같은 Flow 식별자가 중복되어 편집을 열 수 없습니다.');
    }
    flowRefs.add(flow.ref);
    if (flow.ref === flowRef) target = flow;

    if (flow.sections !== undefined && !Array.isArray(flow.sections)) {
      return failure('invalid-section-catalog', '구간 식별자를 확인할 수 없어 편집을 열지 않았습니다.');
    }
    const sectionIds = new Set<string>();
    const sectionOrders = new Set<number>();
    const sectionById = new Map<string, NonNullable<PersonalWorkspacePocFlow['sections']>[number]>();
    for (const section of flow.sections ?? []) {
      if (!section.sectionId.trim()
        || section.sectionId !== section.sectionId.trim()
        || sectionIds.has(section.sectionId)
        || !section.title.trim()
        || section.title !== section.title.trim()
        || !Number.isSafeInteger(section.sourceOrder)
        || section.sourceOrder < 0
        || sectionOrders.has(section.sourceOrder)
        || !['source', 'authoring', 'existing-personal'].includes(section.titleOwner)
        || !['read-only', 'poc-shadow'].includes(section.editCapability)
        || (section.editCapability === 'poc-shadow'
          && !['personal-draft', 'authoring-handoff'].includes(flow.origin))
        || (section.editCapability === 'poc-shadow'
          && flow.origin === 'personal-draft'
          && section.titleOwner !== 'existing-personal')
        || (section.editCapability === 'poc-shadow'
          && flow.origin === 'authoring-handoff'
          && section.titleOwner !== 'authoring')) {
        return failure('invalid-section-catalog', '구간 식별자가 중복되거나 소유권과 맞지 않습니다.');
      }
      sectionIds.add(section.sectionId);
      sectionOrders.add(section.sourceOrder);
      sectionById.set(section.sectionId, section);
    }

    const itemIds = new Set<string>();
    const sourceOrders = new Set<number>();
    for (const item of flow.items) {
      if (typeof item.ref !== 'string'
        || typeof item.itemId !== 'string'
        || typeof item.savedCopyId !== 'string'
        || typeof item.flowId !== 'string'
        || item.savedCopyId !== flow.savedCopyId
        || item.flowId !== flow.flowId
        || item.ref !== toPersonalWorkspacePocFlowItemRef(
          flow.savedCopyId,
          flow.flowId,
          item.itemId,
        )
        || (item.sectionId !== undefined
          && (!sectionById.has(item.sectionId)
            || item.sectionTitle !== sectionById.get(item.sectionId)?.title))) {
        return failure('foreign-item-identity', '다른 Flow의 할 일이 섞여 편집을 열 수 없습니다.');
      }
      if (itemRefs.has(item.ref) || itemIds.has(item.itemId)) {
        return failure('duplicate-item-identity', '같은 할 일 식별자가 중복되어 편집을 열 수 없습니다.');
      }
      if (!Number.isSafeInteger(item.sourceOrder) || sourceOrders.has(item.sourceOrder)) {
        return failure('duplicate-or-invalid-item-order', '원본 할 일 순서를 확인해 주세요.');
      }
      itemRefs.add(item.ref);
      itemIds.add(item.itemId);
      sourceOrders.add(item.sourceOrder);
    }
  }

  if (!target) return failure('missing-flow', '편집할 Flow를 찾을 수 없습니다.');
  if (target.items.length === 0) {
    return failure('missing-items', '편집할 할 일이 없는 Flow는 이 단계에서 저장할 수 없습니다.');
  }

  for (const item of target.items) {
    const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(
      item,
      target.origin,
      target,
    );
    if (ownership.dateDerivation.sourceSchedule.mode === 'unsupported'
      || ownership.dateDerivation.existingPersonalSchedule.mode === 'unsupported') {
      return failure(
        'unsupported-plan-schedule',
        '지원하지 않는 원본 일정이 있어 개인 계획 편집을 저장하지 않았습니다.',
        ITEM_DATE_FOCUS,
      );
    }
  }

  if (target.origin === 'authoring-handoff') {
    const authored = target as Partial<PersonalWorkspacePocAuthoredFlow>;
    const lineage = authored.authoring;
    if (!lineage
      || typeof lineage.rawText !== 'string'
      || typeof lineage.sourceFingerprint !== 'string'
      || lineage.fidelityManifest === undefined) {
      return failure(
        'authoring-fidelity-missing',
        '원문 보존 판정이 없는 작성 Flow는 먼저 다시 확인해 주세요.',
      );
    }
    if (lineage.sourceFingerprint
      !== fingerprintPersonalWorkspacePocAuthoringSource(lineage.rawText)) {
      return failure(
        'authoring-source-fingerprint-mismatch',
        '작성 원문과 원문 지문이 달라 저장하지 않았습니다.',
      );
    }
    if (!isPersonalWorkspacePocAuthoringFidelityManifestForSource(
      lineage.fidelityManifest,
      { rawText: lineage.rawText, sourceFingerprint: lineage.sourceFingerprint },
    )) {
      return failure(
        'authoring-fidelity-mismatch',
        '작성 원문과 보존 판정이 달라 저장하지 않았습니다.',
      );
    }
    if (lineage.fidelityManifest.entries.length > 0) {
      return failure(
        'authoring-fidelity-blocked',
        '손실 없이 옮길 수 없는 작성 내용이 있어 저장하지 않았습니다.',
      );
    }
    if (!Array.isArray(lineage.parsedItems)
      || !isRecord(lineage.sourceLineItemIdentityMap)
      || Object.keys(lineage.sourceLineItemIdentityMap).length !== target.items.length
      || lineage.parsedItems.length !== target.items.length) {
      return failure(
        'authoring-item-lineage-missing',
        '작성 원문 줄과 할 일 식별자 연결을 다시 확인해 주세요.',
      );
    }
    const targetItemByRef = new Map(target.items.map((item) => [item.ref, item]));
    const sourceLines = new Set<number>();
    for (const parsedItem of lineage.parsedItems) {
      if (!Number.isSafeInteger(parsedItem.sourceLine)
        || sourceLines.has(parsedItem.sourceLine)) {
        return failure('authoring-item-lineage-mismatch', '작성 원문 줄 연결이 중복되거나 바뀌었습니다.');
      }
      sourceLines.add(parsedItem.sourceLine);
      const identity = lineage.sourceLineItemIdentityMap[String(parsedItem.sourceLine)];
      if (!isRecord(identity)
        || identity.sourceLine !== parsedItem.sourceLine
        || typeof identity.itemRef !== 'string'
        || typeof identity.savedCopyId !== 'string'
        || typeof identity.flowId !== 'string'
        || typeof identity.itemId !== 'string') {
        return failure('authoring-item-lineage-mismatch', '작성 원문 줄과 할 일 식별자가 서로 맞지 않습니다.');
      }
      const item = targetItemByRef.get(identity.itemRef);
      if (!item
        || item.savedCopyId !== identity.savedCopyId
        || item.flowId !== identity.flowId
        || item.itemId !== identity.itemId
        || item.sourceOrder !== parsedItem.sourceOrder) {
        return failure('authoring-item-lineage-mismatch', '작성 원문에서 만든 할 일 식별자가 바뀌었습니다.');
      }
    }
  }

  return {
    flow: target,
    itemIdentities: target.items.map((item) => ({
      itemRef: item.ref,
      savedCopyId: item.savedCopyId,
      flowId: item.flowId,
      itemId: item.itemId,
    })),
    sectionIdentities: (target.sections ?? []).map((section) => ({
      sectionId: section.sectionId,
      sourceOrder: section.sourceOrder,
      editCapability: section.editCapability,
    })),
  };
}

function isFailure(
  value: LocatedFlow | PersonalWorkspacePocPlanEditorFailure,
): value is PersonalWorkspacePocPlanEditorFailure {
  return 'code' in value;
}

function guardCore(
  guard: Omit<PersonalWorkspacePocPlanTrustedOpenGuard, 'guardId'>,
): Omit<PersonalWorkspacePocPlanTrustedOpenGuard, 'guardId'> {
  return guard;
}

function guardIdFor(
  guard: Omit<PersonalWorkspacePocPlanTrustedOpenGuard, 'guardId'>,
): string {
  return `personal-plan-guard:${fingerprintPersonalWorkspacePocPlanEditorBytes(
    canonicalPersonalWorkspacePocPlanEditorBytes(guard),
  )}`;
}

function validateGuardIntegrity(
  guard: PersonalWorkspacePocPlanTrustedOpenGuard,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (guard.version !== PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION
    || !guard.guardId
    || !Array.isArray(guard.itemIdentities)
    || !Array.isArray(guard.sectionIdentities)
    || guard.guardId !== guardIdFor(guardCore({
      version: guard.version,
      flowRef: guard.flowRef,
      savedCopyId: guard.savedCopyId,
      flowId: guard.flowId,
      origin: guard.origin,
      itemIdentities: guard.itemIdentities,
      sectionIdentities: guard.sectionIdentities,
      identityFingerprint: guard.identityFingerprint,
      openedStateRevision: guard.openedStateRevision,
      openedStateRaw: guard.openedStateRaw,
      openedStateCanonicalBytes: guard.openedStateCanonicalBytes,
      canonicalSourceBytes: guard.canonicalSourceBytes,
      canonicalSourceFingerprint: guard.canonicalSourceFingerprint,
    }))) {
    return failure('invalid-open-guard', '편집 열기 정보를 확인할 수 없어 저장하지 않았습니다.');
  }
  const sectionIds = new Set<string>();
  const sectionOrders = new Set<number>();
  for (const identity of guard.sectionIdentities) {
    if (!identity.sectionId.trim()
      || identity.sectionId !== identity.sectionId.trim()
      || sectionIds.has(identity.sectionId)
      || !Number.isSafeInteger(identity.sourceOrder)
      || identity.sourceOrder < 0
      || sectionOrders.has(identity.sourceOrder)
      || !['read-only', 'poc-shadow'].includes(identity.editCapability)) {
      return failure('invalid-open-guard-sections', '편집 열기의 구간 식별자를 확인할 수 없습니다.');
    }
    sectionIds.add(identity.sectionId);
    sectionOrders.add(identity.sourceOrder);
  }
  const expectedIdentityFingerprint = fingerprintPersonalWorkspacePocPlanEditorBytes(
    canonicalPersonalWorkspacePocPlanEditorBytes({
      itemIdentities: guard.itemIdentities,
      sectionIdentities: guard.sectionIdentities,
    }),
  );
  if (guard.identityFingerprint !== expectedIdentityFingerprint
    || guard.canonicalSourceFingerprint
      !== fingerprintPersonalWorkspacePocPlanEditorBytes(guard.canonicalSourceBytes)) {
    return failure('invalid-open-guard-fingerprint', '편집 열기 정보가 바뀌어 저장하지 않았습니다.');
  }
  return null;
}

function inheritText(): PersonalWorkspacePocPlanTextDraft {
  return { mode: 'inherit' };
}

function textFromOverlay(
  record: object,
  key: 'title' | 'memo',
  value: string | undefined,
): PersonalWorkspacePocPlanTextDraft {
  return hasOwn(record, key) ? { mode: 'override', value: value ?? '' } : inheritText();
}

function itemDraftFrom(
  guardId: string,
  flow: PersonalWorkspacePocFlow,
  item: PersonalWorkspacePocFlow['items'][number],
  overlay: PersonalWorkspacePocPersonalPlanItemOverlay | undefined,
): PersonalWorkspacePocPlanItemDraft {
  return {
    version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
    guardId,
    identity: {
      itemRef: item.ref,
      savedCopyId: flow.savedCopyId,
      flowId: flow.flowId,
      itemId: item.itemId,
    },
    title: overlay ? textFromOverlay(overlay, 'title', overlay.title) : inheritText(),
    memo: overlay ? textFromOverlay(overlay, 'memo', overlay.memo) : inheritText(),
    schedule: overlay?.schedule
      ? clone(overlay.schedule)
      : { mode: 'inherit' },
  };
}

export function openPersonalWorkspacePocPlanEditor(input: Readonly<{
  baseModel: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  stateRaw: string | null;
  flowRef: string;
}>): PersonalWorkspacePocPlanOpenResult {
  const rawFailure = validateRawStateMatches(input.state, input.stateRaw);
  if (rawFailure) return { ok: false, failure: rawFailure };
  const referenceValidation = validatePersonalWorkspacePocStateReferences(
    input.state,
    input.baseModel,
  );
  if (!referenceValidation.ok) {
    return {
      ok: false,
      failure: failure(
        'invalid-state-references',
        `개인공간 참조를 다시 확인해 주세요. (${referenceValidation.reason})`,
      ),
    };
  }
  const located = locateFlow(input.baseModel, input.state, input.flowRef);
  if (isFailure(located)) return { ok: false, failure: located };

  const sourceBytes = canonicalPersonalWorkspacePocPlanEditorBytes(located.flow);
  const itemIdentities = clone(located.itemIdentities);
  const sectionIdentities = clone(located.sectionIdentities);
  const core: Omit<PersonalWorkspacePocPlanTrustedOpenGuard, 'guardId'> = {
    version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
    flowRef: located.flow.ref,
    savedCopyId: located.flow.savedCopyId,
    flowId: located.flow.flowId,
    origin: located.flow.origin,
    itemIdentities,
    sectionIdentities,
    identityFingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(
      canonicalPersonalWorkspacePocPlanEditorBytes({ itemIdentities, sectionIdentities }),
    ),
    openedStateRevision: input.state.revision,
    openedStateRaw: input.stateRaw,
    openedStateCanonicalBytes: canonicalPersonalWorkspacePocPlanEditorBytes(input.state),
    canonicalSourceBytes: sourceBytes,
    canonicalSourceFingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(sourceBytes),
  };
  const guard: PersonalWorkspacePocPlanTrustedOpenGuard = {
    ...core,
    guardId: guardIdFor(core),
  };
  const overlay = input.state.personalPlanOverlays?.[located.flow.ref];
  const items = Object.fromEntries(located.flow.items.map((item) => [
    item.ref,
    itemDraftFrom(guard.guardId, located.flow, item, overlay?.items[item.ref]),
  ]));
  const sectionTitles = Object.fromEntries((located.flow.sections ?? [])
    .filter((section) => section.editCapability === 'poc-shadow')
    .map((section) => [
      section.sectionId,
      overlay?.sectionTitles && hasOwn(overlay.sectionTitles, section.sectionId)
        ? { mode: 'override' as const, value: overlay.sectionTitles[section.sectionId] }
        : inheritText(),
    ]));
  return {
    ok: true,
    guard,
    draft: {
      version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
      guardId: guard.guardId,
      flowRef: located.flow.ref,
      savedCopyId: located.flow.savedCopyId,
      flowId: located.flow.flowId,
      origin: located.flow.origin,
      title: overlay
        ? textFromOverlay(overlay, 'title', overlay.title)
        : inheritText(),
      sectionTitles,
      orderedItemRefs: clone(overlay?.orderedItemRefs ?? located.flow.items.map((item) => item.ref)),
      items,
    },
  };
}

function validateTextDraft(
  value: unknown,
  options: Readonly<{ allowEmpty: boolean; focus: string; label: string }>,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (!isRecord(value) || !hasOwn(value, 'mode')) {
    return failure('invalid-text-override', `${options.label} 변경 방식을 확인해 주세요.`, options.focus);
  }
  if (value.mode === 'inherit') {
    return Object.keys(value).length === 1
      ? null
      : failure('invalid-inherit-text', `${options.label} 상속 값에 다른 정보가 섞였습니다.`, options.focus);
  }
  if (value.mode !== 'override'
    || Object.keys(value).some((key) => !['mode', 'value'].includes(key))
    || typeof value.value !== 'string'
    || (!options.allowEmpty && !value.value.trim())
    || (!options.allowEmpty && value.value !== value.value.trim())) {
    return failure('invalid-text-override', `${options.label}을 확인해 주세요.`, options.focus);
  }
  return null;
}

function validateScheduleDraft(
  value: unknown,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return failure('invalid-plan-schedule', '개인 계획 날짜를 확인해 주세요.', ITEM_DATE_FOCUS);
  }
  if (value.mode === 'inherit' || value.mode === 'unscheduled') {
    return Object.keys(value).length === 1
      ? null
      : failure('invalid-plan-schedule', '개인 계획 날짜 값이 서로 맞지 않습니다.', ITEM_DATE_FOCUS);
  }
  if (value.mode !== 'fixed_date'
    || Object.keys(value).some((key) => !['mode', 'date'].includes(key))
    || !isPersonalWorkspacePocDate(value.date)) {
    return failure('invalid-plan-date', '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.', ITEM_DATE_FOCUS);
  }
  return null;
}

function validateItemDraftShape(
  item: unknown,
  expectedGuardId?: string,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (!isRecord(item)
    || item.version !== PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION
    || typeof item.guardId !== 'string'
    || (expectedGuardId !== undefined && item.guardId !== expectedGuardId)
    || !isRecord(item.identity)
    || typeof item.identity.itemRef !== 'string'
    || typeof item.identity.savedCopyId !== 'string'
    || typeof item.identity.flowId !== 'string'
    || typeof item.identity.itemId !== 'string'
    || item.identity.itemRef !== toPersonalWorkspacePocFlowItemRef(
      item.identity.savedCopyId,
      item.identity.flowId,
      item.identity.itemId,
    )) {
    return failure('invalid-item-draft-identity', '할 일 편집 식별자를 확인해 주세요.', ITEM_TITLE_FOCUS);
  }
  return validateTextDraft(item.title, {
    allowEmpty: false,
    focus: ITEM_TITLE_FOCUS,
    label: '할 일 제목',
  })
    ?? validateTextDraft(item.memo, {
      allowEmpty: true,
      focus: ITEM_TITLE_FOCUS,
      label: '메모',
    })
    ?? validateScheduleDraft(item.schedule);
}

export function validatePersonalWorkspacePocPlanItemDraft(
  item: unknown,
): FlowEditorValidation {
  return validationFromFailure(validateItemDraftShape(item));
}

function validatePlanDraftShape(
  draft: unknown,
  guard?: PersonalWorkspacePocPlanTrustedOpenGuard,
): PersonalWorkspacePocPlanEditorFailure | null {
  if (!isRecord(draft)
    || draft.version !== PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION
    || typeof draft.guardId !== 'string'
    || (guard !== undefined && draft.guardId !== guard.guardId)
    || typeof draft.flowRef !== 'string'
    || typeof draft.savedCopyId !== 'string'
    || typeof draft.flowId !== 'string'
    || draft.flowRef !== toPersonalWorkspacePocFlowRef(draft.savedCopyId, draft.flowId)
    || !SUPPORTED_ORIGINS.has(draft.origin as PersonalWorkspacePocOrigin)
    || !Array.isArray(draft.orderedItemRefs)
    || !isRecord(draft.items)) {
    return failure('invalid-plan-draft-identity', '개인 계획 편집 식별자를 확인해 주세요.');
  }
  if (guard && (draft.flowRef !== guard.flowRef
    || draft.savedCopyId !== guard.savedCopyId
    || draft.flowId !== guard.flowId
    || draft.origin !== guard.origin)) {
    return failure('foreign-plan-draft', '다른 Flow의 편집 내용은 저장하지 않았습니다.');
  }
  const titleFailure = validateTextDraft(draft.title, {
    allowEmpty: false,
    focus: PLAN_TITLE_FOCUS,
    label: 'Flow 제목',
  });
  if (titleFailure) return titleFailure;

  if (draft.sectionTitles !== undefined && !isRecord(draft.sectionTitles)) {
    return failure('invalid-section-title-drafts', '구간 제목 편집 내용을 확인해 주세요.', PLAN_SECTION_TITLE_FOCUS);
  }
  const sectionTitles = isRecord(draft.sectionTitles) ? draft.sectionTitles : {};
  const sectionTitleIds = Object.keys(sectionTitles);
  if (sectionTitleIds.some((sectionId) => !sectionId.trim())) {
    return failure('invalid-section-title-drafts', '구간 식별자를 확인해 주세요.', PLAN_SECTION_TITLE_FOCUS);
  }
  if (sectionTitleIds.length > 0
    && !['personal-draft', 'authoring-handoff'].includes(draft.origin as string)) {
    return failure('read-only-section-title', '원본 구간 제목은 개인 계획에서 바꾸지 않았습니다.', PLAN_SECTION_TITLE_FOCUS);
  }
  if (guard) {
    const expectedEditableIds = guard.sectionIdentities
      .filter((identity) => identity.editCapability === 'poc-shadow')
      .map((identity) => identity.sectionId);
    const expectedEditableSet = new Set(expectedEditableIds);
    if (sectionTitleIds.length !== expectedEditableIds.length
      || sectionTitleIds.some((sectionId) => !expectedEditableSet.has(sectionId))) {
      return failure('foreign-section-title-draft', '다른 Flow의 구간이 섞여 저장하지 않았습니다.', PLAN_SECTION_TITLE_FOCUS);
    }
  }
  for (const value of Object.values(sectionTitles)) {
    const sectionFailure = validateTextDraft(value, {
      allowEmpty: false,
      focus: PLAN_SECTION_TITLE_FOCUS,
      label: '구간 제목',
    });
    if (sectionFailure) return sectionFailure;
  }

  const orderedItemRefs = draft.orderedItemRefs as unknown[];
  if (orderedItemRefs.length === 0
    || orderedItemRefs.some((ref) => typeof ref !== 'string' || !ref.trim())
    || new Set(orderedItemRefs).size !== orderedItemRefs.length) {
    return failure('invalid-plan-item-order', '할 일 순서를 확인해 주세요.', PLAN_ORDER_FOCUS);
  }
  const itemKeys = Object.keys(draft.items);
  const typedOrderedItemRefs = orderedItemRefs as string[];
  if (itemKeys.length !== typedOrderedItemRefs.length
    || itemKeys.some((ref) => !typedOrderedItemRefs.includes(ref))) {
    return failure('missing-or-foreign-plan-item', '할 일 목록과 순서가 서로 맞지 않습니다.', PLAN_ORDER_FOCUS);
  }
  if (guard) {
    const expectedRefs = guard.itemIdentities.map((identity) => identity.itemRef);
    const expected = new Set(expectedRefs);
    if (itemKeys.length !== expectedRefs.length
      || itemKeys.some((ref) => !expected.has(ref))
      || typedOrderedItemRefs.some((ref) => !expected.has(ref))) {
      return failure('foreign-plan-item', '다른 Flow의 할 일이 섞여 저장하지 않았습니다.', PLAN_ORDER_FOCUS);
    }
  }
  for (const [itemRef, item] of Object.entries(draft.items)) {
    const itemFailure = validateItemDraftShape(item, draft.guardId);
    if (itemFailure) return itemFailure;
    const typed = item as PersonalWorkspacePocPlanItemDraft;
    if (typed.identity.itemRef !== itemRef
      || typed.identity.savedCopyId !== draft.savedCopyId
      || typed.identity.flowId !== draft.flowId) {
      return failure('foreign-item-draft', '다른 Flow의 할 일이 섞여 저장하지 않았습니다.', ITEM_TITLE_FOCUS);
    }
    if (guard) {
      const expected = guard.itemIdentities.find((identity) => identity.itemRef === itemRef);
      if (!expected
        || canonicalPersonalWorkspacePocPlanEditorBytes(expected)
          !== canonicalPersonalWorkspacePocPlanEditorBytes(typed.identity)) {
        return failure('changed-item-identity', '할 일 식별자가 바뀌어 저장하지 않았습니다.', ITEM_TITLE_FOCUS);
      }
    }
  }
  return null;
}

export function validatePersonalWorkspacePocPlanDraft(
  draft: unknown,
): FlowEditorValidation {
  return validationFromFailure(validatePlanDraftShape(draft));
}

export function openPersonalWorkspacePocPlanItemEditor(input: Readonly<{
  parentDraft: PersonalWorkspacePocPlanDraft;
  itemRef: string;
}>): PersonalWorkspacePocPlanItemOpenResult {
  const parentFailure = validatePlanDraftShape(input.parentDraft);
  if (parentFailure) return { ok: false, failure: parentFailure };
  const item = input.parentDraft.items[input.itemRef];
  if (!item) {
    return { ok: false, failure: failure('missing-item', '편집할 할 일을 찾을 수 없습니다.') };
  }
  return { ok: true, draft: clone(item) };
}

export function applyPersonalWorkspacePocPlanItemDraft(input: Readonly<{
  parentDraft: Readonly<PersonalWorkspacePocPlanDraft>;
  itemDraft: Readonly<PersonalWorkspacePocPlanItemDraft>;
  trustedGuardId?: string;
}>): Readonly<{
  draft: PersonalWorkspacePocPlanDraft;
  validation: FlowEditorValidation;
}> {
  const parentFailure = validatePlanDraftShape(input.parentDraft);
  if (parentFailure) throwFailure(parentFailure);
  const itemFailure = validateItemDraftShape(input.itemDraft, input.parentDraft.guardId);
  if (itemFailure) throwFailure(itemFailure);
  if (input.trustedGuardId !== undefined
    && (input.parentDraft.guardId !== input.trustedGuardId
      || input.itemDraft.guardId !== input.trustedGuardId)) {
    throwFailure(failure('untrusted-item-draft', '편집 열기 정보가 달라 적용하지 않았습니다.'));
  }
  const itemRef = input.itemDraft.identity.itemRef;
  const previous = input.parentDraft.items[itemRef];
  if (!previous
    || previous.identity.savedCopyId !== input.itemDraft.identity.savedCopyId
    || previous.identity.flowId !== input.itemDraft.identity.flowId
    || previous.identity.itemId !== input.itemDraft.identity.itemId) {
    throwFailure(failure('foreign-item-draft', '다른 Flow의 할 일은 적용하지 않았습니다.'));
  }
  const draft: PersonalWorkspacePocPlanDraft = {
    ...clone(input.parentDraft),
    items: {
      ...clone(input.parentDraft.items),
      [itemRef]: clone(input.itemDraft),
    },
  };
  const validation = validationFromFailure(validatePlanDraftShape(draft));
  return { draft, validation };
}

function textOverrideValue(
  draft: PersonalWorkspacePocPlanTextDraft,
  inherited: string | undefined,
): string | undefined {
  if (draft.mode === 'inherit' || draft.value === inherited) return undefined;
  return draft.value;
}

export function normalizePersonalWorkspacePocPlanOverlay(input: Readonly<{
  draft: PersonalWorkspacePocPlanDraft;
  guard: PersonalWorkspacePocPlanTrustedOpenGuard;
  sourceFlow: PersonalWorkspacePocFlow;
}>): PersonalWorkspacePocPersonalPlanOverlay {
  const draftFailure = validatePlanDraftShape(input.draft, input.guard);
  if (draftFailure) throwFailure(draftFailure);
  const sourceRefs = input.sourceFlow.items.map((item) => item.ref);
  const sourceByRef = new Map(input.sourceFlow.items.map((item) => [item.ref, item]));
  const items: Record<string, PersonalWorkspacePocPersonalPlanItemOverlay> = {};

  for (const itemRef of sourceRefs) {
    const source = sourceByRef.get(itemRef);
    const draft = input.draft.items[itemRef];
    if (!source || !draft) {
      throwFailure(failure('missing-source-item', '원본 할 일을 다시 불러와 주세요.'));
    }
    const title = textOverrideValue(draft.title, source.title);
    const memo = textOverrideValue(draft.memo, source.description);
    const schedule = draft.schedule.mode === 'inherit'
      ? undefined
      : draft.schedule.mode === 'fixed_date'
        ? { mode: 'fixed_date' as const, date: draft.schedule.date }
        : { mode: 'unscheduled' as const };
    if (title !== undefined || memo !== undefined || schedule !== undefined) {
      items[itemRef] = {
        itemRef,
        ...(title !== undefined ? { title } : {}),
        ...(memo !== undefined ? { memo } : {}),
        ...(schedule !== undefined ? { schedule } : {}),
      };
    }
  }

  const editableSections = (input.sourceFlow.sections ?? [])
    .filter((section) => section.editCapability === 'poc-shadow');
  const sectionTitles: Record<string, string> = {};
  for (const section of editableSections) {
    const sectionDraft = input.draft.sectionTitles?.[section.sectionId];
    if (!sectionDraft) {
      throwFailure(failure(
        'missing-section-title-draft',
        '편집할 개인 구간을 다시 불러와 주세요.',
        PLAN_SECTION_TITLE_FOCUS,
      ));
    }
    const title = textOverrideValue(sectionDraft, section.title);
    if (title !== undefined) sectionTitles[section.sectionId] = title;
  }

  const title = textOverrideValue(input.draft.title, input.sourceFlow.title);
  const orderChanged = sourceRefs.length !== input.draft.orderedItemRefs.length
    || sourceRefs.some((ref, index) => ref !== input.draft.orderedItemRefs[index]);
  return {
    flowRef: input.guard.flowRef,
    savedCopyId: input.guard.savedCopyId,
    flowId: input.guard.flowId,
    ...(title !== undefined ? { title } : {}),
    ...(orderChanged ? { orderedItemRefs: clone(input.draft.orderedItemRefs) } : {}),
    ...(Object.keys(sectionTitles).length > 0 ? { sectionTitles } : {}),
    items,
  };
}

function freshContextFailure(input: Readonly<{
  guard: PersonalWorkspacePocPlanTrustedOpenGuard;
  baseModel: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  stateRaw: string | null;
}>): Readonly<{
  failure: PersonalWorkspacePocPlanEditorFailure | null;
  located?: LocatedFlow;
}> {
  const guardFailure = validateGuardIntegrity(input.guard);
  if (guardFailure) return { failure: guardFailure };
  if (input.stateRaw !== input.guard.openedStateRaw) {
    return { failure: failure('stale-state-raw', '편집 중 저장 상태가 바뀌어 다시 확인해야 합니다.') };
  }
  if (input.state.revision !== input.guard.openedStateRevision) {
    return { failure: failure('stale-state-revision', '다른 변경이 먼저 저장되어 다시 확인해야 합니다.') };
  }
  const rawFailure = validateRawStateMatches(input.state, input.stateRaw);
  if (rawFailure) return { failure: rawFailure };
  if (canonicalPersonalWorkspacePocPlanEditorBytes(input.state)
    !== input.guard.openedStateCanonicalBytes) {
    return { failure: failure('stale-current-state', '편집 중 개인공간 상태가 바뀌어 다시 확인해야 합니다.') };
  }
  const refs = validatePersonalWorkspacePocStateReferences(input.state, input.baseModel);
  if (!refs.ok) {
    return {
      failure: failure('invalid-current-references', `현재 참조를 확인해 주세요. (${refs.reason})`),
    };
  }
  const located = locateFlow(input.baseModel, input.state, input.guard.flowRef);
  if (isFailure(located)) return { failure: located };
  if (located.flow.savedCopyId !== input.guard.savedCopyId
    || located.flow.flowId !== input.guard.flowId
    || located.flow.origin !== input.guard.origin) {
    return { failure: failure('changed-flow-identity', '원본 Flow 식별자가 바뀌어 저장하지 않았습니다.') };
  }
  const identityBytes = canonicalPersonalWorkspacePocPlanEditorBytes({
    itemIdentities: located.itemIdentities,
    sectionIdentities: located.sectionIdentities,
  });
  if (fingerprintPersonalWorkspacePocPlanEditorBytes(identityBytes)
      !== input.guard.identityFingerprint
    || identityBytes
      !== canonicalPersonalWorkspacePocPlanEditorBytes({
        itemIdentities: input.guard.itemIdentities,
        sectionIdentities: input.guard.sectionIdentities,
      })) {
    return { failure: failure('changed-item-identities', '원본 할 일 또는 구간 구성이 바뀌어 저장하지 않았습니다.') };
  }
  const sourceBytes = canonicalPersonalWorkspacePocPlanEditorBytes(located.flow);
  if (sourceBytes !== input.guard.canonicalSourceBytes) {
    return { failure: failure('stale-source-bytes', '원본 Flow가 바뀌어 편집 내용을 다시 확인해야 합니다.') };
  }
  if (fingerprintPersonalWorkspacePocPlanEditorBytes(sourceBytes)
    !== input.guard.canonicalSourceFingerprint) {
    return { failure: failure('stale-source-fingerprint', '원본 Flow 지문이 바뀌어 저장하지 않았습니다.') };
  }
  return { failure: null, located };
}

export function preflightPersonalWorkspacePocPlanCommit(input: Readonly<{
  draft: PersonalWorkspacePocPlanDraft;
  guard: PersonalWorkspacePocPlanTrustedOpenGuard;
  currentBaseModel: PersonalWorkspacePocReadModel;
  currentState: PersonalWorkspacePocState;
  currentStateRaw: string | null;
  now: string;
}>): PersonalWorkspacePocPlanPreflightResult {
  const draftFailure = validatePlanDraftShape(input.draft, input.guard);
  if (draftFailure) return { ok: false, failure: draftFailure };
  const fresh = freshContextFailure({
    guard: input.guard,
    baseModel: input.currentBaseModel,
    state: input.currentState,
    stateRaw: input.currentStateRaw,
  });
  if (fresh.failure || !fresh.located) {
    return {
      ok: false,
      failure: fresh.failure ?? failure('missing-fresh-flow', '원본 Flow를 다시 불러와 주세요.'),
    };
  }
  if (!Number.isFinite(Date.parse(input.now)) || new Date(input.now).toISOString() !== input.now) {
    return { ok: false, failure: failure('invalid-commit-time', '저장 시각을 확인해 주세요.') };
  }

  let overlay: PersonalWorkspacePocPersonalPlanOverlay;
  try {
    overlay = normalizePersonalWorkspacePocPlanOverlay({
      draft: input.draft,
      guard: input.guard,
      sourceFlow: fresh.located.flow,
    });
  } catch (error) {
    const normalized = isRecord(error) && typeof error.code === 'string'
      ? error as PersonalWorkspacePocPlanEditorFailure
      : failure('overlay-normalization-failed', '개인 계획 변경을 정리하지 못했습니다.');
    return { ok: false, failure: normalized };
  }
  const transitioned = applyPersonalWorkspacePocTransition(input.currentState, {
    type: 'apply-personal-plan',
    expectedRevision: input.guard.openedStateRevision,
    flowRef: input.guard.flowRef,
    savedCopyId: input.guard.savedCopyId,
    flowId: input.guard.flowId,
    origin: input.guard.origin,
    knownItemRefs: fresh.located.itemIdentities.map((identity) => identity.itemRef),
    knownSectionIds: fresh.located.sectionIdentities.map((identity) => identity.sectionId),
    editableSectionIds: fresh.located.sectionIdentities
      .filter((identity) => identity.editCapability === 'poc-shadow')
      .map((identity) => identity.sectionId),
    overlay,
    now: input.now,
  });
  if (transitioned.error) {
    return {
      ok: false,
      failure: failure(
        `transition-${transitioned.error}`,
        transitioned.message,
      ),
    };
  }
  if (transitioned.changed) {
    const references = validatePersonalWorkspacePocStateReferences(
      transitioned.state,
      input.currentBaseModel,
    );
    if (!references.ok) {
      return {
        ok: false,
        failure: failure(
          'post-transition-reference-failed',
          `변경 후 참조가 맞지 않아 저장하지 않았습니다. (${references.reason})`,
        ),
      };
    }
  }
  return {
    ok: true,
    kind: transitioned.changed ? 'change' : 'no-op',
    overlay,
    state: transitioned.state,
    message: transitioned.message,
  };
}

function noOpPreparedCommit(): PreparedFlowEditorPlanCommit {
  return {
    commit: () => undefined,
    rollbackAndVerify: () => true,
  };
}

export function createPersonalWorkspacePocPlanEditorHandlers(
  options: PersonalWorkspacePocPlanEditorHandlersInput,
): FlowEditorCommitHandlers<
  PersonalWorkspacePocPlanDraft,
  PersonalWorkspacePocPlanItemDraft
> {
  const capturedGuard = clone(options.guard);
  const guardFailure = validateGuardIntegrity(capturedGuard);
  if (guardFailure) throwFailure(guardFailure);

  const rejectPublic = (): never => throwFailure(failure(
    'public-editor-role-forbidden',
    '개인공간 PoC에서는 공개 Flow 편집을 실행하지 않습니다.',
    PLAN_ERROR_FOCUS,
    'runtime',
  ));

  return {
    preparePublicDraft: rejectPublic,
    applyItemToParentPublicDraft: rejectPublic,
    applyItemToParentPersonalDraft: ({ parentDraft, itemDraft }) => {
      const parentFailure = validatePlanDraftShape(parentDraft, capturedGuard);
      if (parentFailure) throwFailure(parentFailure);
      return applyPersonalWorkspacePocPlanItemDraft({
        parentDraft,
        itemDraft,
        trustedGuardId: capturedGuard.guardId,
      });
    },
    preparePersonalOverlay: ({ transactionId, requestId, revision, draft }) => {
      let stateRaw: string | null;
      let currentState: PersonalWorkspacePocState;
      let currentBaseModel: PersonalWorkspacePocReadModel;
      try {
        stateRaw = options.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
        currentState = options.readCurrentState();
        currentBaseModel = options.readCurrentBaseModel();
      } catch {
        throwFailure(failure(
          'fresh-context-read-failed',
          '현재 개인공간 상태를 읽지 못했습니다.',
          PLAN_ERROR_FOCUS,
          'storage',
        ));
      }
      const preflight = preflightPersonalWorkspacePocPlanCommit({
        draft,
        guard: capturedGuard,
        currentBaseModel,
        currentState,
        currentStateRaw: stateRaw,
        now: options.now(),
      });
      if (!preflight.ok) throwFailure(preflight.failure);
      if (preflight.kind === 'no-op') return noOpPreparedCommit();
      return preparePersonalWorkspacePocStorageCommit({
        storage: options.storage,
        state: preflight.state,
        transactionId: `personal-plan:${transactionId}:${requestId}:${revision}`,
      });
    },
  };
}
