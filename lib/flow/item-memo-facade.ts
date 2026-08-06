import type { MyFlowExecutionNote } from './execution-notes';
import { getFlowItemUserNote } from './flow-item-state';
import type { StoredMyFlowItemDraft } from './my-flow-personal-state';
import type { SourceBackedFlowMapPersonalCopyStepOverride } from './source-backed-my-flow';
import type {
  FlowRunRecord,
  MyFlowCompletionFeedback,
} from './storage';
import type { FlowItemState } from './types';

export const ITEM_MEMO_FACADE_SCHEMA_VERSION = 1 as const;

export type ItemMemoFacadeStore =
  | 'item_draft'
  | 'personal_copy'
  | 'legacy_item_state'
  | 'private_execution_note'
  | 'source_correction_note'
  | 'completion_source_correction'
  | 'run_item_snapshot'
  | 'run_personal_item_draft'
  | 'run_legacy_item_state'
  | 'run_private_execution_note'
  | 'run_source_correction_note'
  | 'run_completion_source_correction';

export type ItemMemoFacadeEntryVisibility =
  | 'default'
  | 'preserved'
  | 'private'
  | 'source_correction'
  | 'history';

export type ItemMemoFacadeEntryExportPolicy =
  | 'general_item_memo'
  | 'general_legacy_note'
  | 'history_view_only'
  | 'never_general';

export type ItemMemoFacadeEntry = {
  id: string;
  store: ItemMemoFacadeStore;
  storageIdentity: string;
  value: string;
  visibility: ItemMemoFacadeEntryVisibility;
  exportPolicy: ItemMemoFacadeEntryExportPolicy;
  readOnly: boolean;
  runId?: string;
};

export type ItemMemoFacadeGeneralExportField = {
  kind: 'item_memo' | 'legacy_item_note';
  value: string;
  sourceEntryId: string;
};

export type ItemMemoFacade = {
  schemaVersion: typeof ITEM_MEMO_FACADE_SCHEMA_VERSION;
  identity: {
    flowSlug: string;
    itemId: string;
    executionItemIds: string[];
  };
  writeTarget: {
    store: 'item_draft';
    key: string;
    field: 'memo';
  };
  defaultEntry?: ItemMemoFacadeEntry;
  entries: ItemMemoFacadeEntry[];
  generalExportFields: ItemMemoFacadeGeneralExportField[];
  generalExportExcludedEntryIds: string[];
};

export type BuildItemMemoFacadeOptions = {
  flowSlug: string;
  itemId: string;
  /** Item draft keys from lowest to highest read precedence. */
  itemDraftReadKeys: string[];
  /** The stable Item-level draft key used by the one visible memo input. */
  itemMemoWriteKey: string;
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  personalCopyOverride?: SourceBackedFlowMapPersonalCopyStepOverride;
  legacyItemState?: FlowItemState;
  /** Current Item/occurrence identities used by execution-note records. */
  executionItemIds?: string[];
  executionNotes?: MyFlowExecutionNote[];
  completionFeedback?: MyFlowCompletionFeedback;
  completedRuns?: FlowRunRecord[];
};

export type ItemMemoFacadeWriteResult = {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  mutation: {
    store: 'item_draft';
    key: string;
    field: 'memo';
    value: string;
  };
  deletedKeys: [];
};

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function uniqueNonBlank(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isVisibleValue(value: string): boolean {
  return value.trim().length > 0;
}

function createEntry(options: {
  id: string;
  store: ItemMemoFacadeStore;
  storageIdentity: string;
  value: string;
  visibility: ItemMemoFacadeEntryVisibility;
  exportPolicy: ItemMemoFacadeEntryExportPolicy;
  readOnly: boolean;
  runId?: string;
}): ItemMemoFacadeEntry {
  return {
    id: options.id,
    store: options.store,
    storageIdentity: options.storageIdentity,
    value: options.value,
    visibility: options.visibility,
    exportPolicy: options.exportPolicy,
    readOnly: options.readOnly,
    ...(options.runId ? { runId: options.runId } : {}),
  };
}

function getCurrentPersonalEntries(
  options: BuildItemMemoFacadeOptions,
): ItemMemoFacadeEntry[] {
  const draftEntries = uniqueNonBlank(options.itemDraftReadKeys).flatMap((key, index) => {
    const draft = options.itemDrafts[key];
    if (!draft || !hasOwn(draft, 'memo')) return [];
    return [createEntry({
      id: `item-draft:${index}:${key}`,
      store: 'item_draft',
      storageIdentity: key,
      value: draft.memo ?? '',
      visibility: 'preserved',
      exportPolicy: 'history_view_only',
      readOnly: key !== options.itemMemoWriteKey,
    })];
  });
  const personalCopyEntries = options.personalCopyOverride
    && hasOwn(options.personalCopyOverride, 'userMemo')
    ? [createEntry({
        id: `personal-copy:${options.flowSlug}:${options.itemId}`,
        store: 'personal_copy',
        storageIdentity: `${options.flowSlug}::${options.itemId}`,
        value: options.personalCopyOverride.userMemo ?? '',
        visibility: 'preserved',
        exportPolicy: 'history_view_only',
        readOnly: true,
      })]
    : [];

  return [...draftEntries, ...personalCopyEntries];
}

function getCurrentExecutionEntries(
  notes: MyFlowExecutionNote[],
  executionItemIds: Set<string>,
): ItemMemoFacadeEntry[] {
  return notes.flatMap((note, index) => {
    if (!executionItemIds.has(note.itemId)) return [];
    return [createEntry({
      id: `execution:${note.kind}:${index}:${note.itemId}`,
      store: note.kind === 'private'
        ? 'private_execution_note'
        : 'source_correction_note',
      storageIdentity: note.itemId,
      value: note.note,
      visibility: note.kind === 'private' ? 'private' : 'source_correction',
      exportPolicy: 'never_general',
      readOnly: true,
    })];
  });
}

function getCompletionCorrectionEntry(
  feedback: MyFlowCompletionFeedback | undefined,
  itemId: string,
  executionItemIds: Set<string>,
): ItemMemoFacadeEntry[] {
  const correction = feedback?.sourceCorrectionDraft;
  if (!correction) return [];
  if (
    correction.scope === 'item'
    && correction.itemId
    && correction.itemId !== itemId
    && !executionItemIds.has(correction.itemId)
  ) return [];
  return [createEntry({
    id: `completion-correction:${feedback.flowSlug}:${correction.itemId ?? 'flow'}`,
    store: 'completion_source_correction',
    storageIdentity: `${feedback.flowSlug}::${correction.itemId ?? 'flow'}`,
    value: correction.note,
    visibility: 'source_correction',
    exportPolicy: 'never_general',
    readOnly: true,
  })];
}

function getRunEntries(options: {
  runs: FlowRunRecord[];
  itemId: string;
  itemDraftReadKeys: Set<string>;
  executionItemIds: Set<string>;
}): ItemMemoFacadeEntry[] {
  return options.runs.flatMap((run) => {
    const snapshot = run.completionSnapshot;
    if (!snapshot) return [];
    const itemMemoEntries = (snapshot.itemSnapshots ?? []).flatMap((item, index) => {
      if (
        item.itemId !== options.itemId
        && !options.executionItemIds.has(item.itemId)
        && !options.itemDraftReadKeys.has(item.itemId)
      ) return [];
      if (!hasOwn(item, 'memo')) return [];
      return [createEntry({
        id: `run-item:${run.runId}:${index}:${item.itemId}`,
        store: 'run_item_snapshot',
        storageIdentity: item.itemId,
        value: item.memo ?? '',
        visibility: 'history',
        exportPolicy: 'history_view_only',
        readOnly: true,
        runId: run.runId,
      })];
    });
    const runPersonalEntries = Object.entries(
      run.personalExecutionStateSnapshot?.itemDrafts ?? {},
    ).flatMap(([key, draft], index) => {
      if (!options.itemDraftReadKeys.has(key) || !hasOwn(draft, 'memo')) return [];
      return [createEntry({
        id: `run-personal:${run.runId}:${index}:${key}`,
        store: 'run_personal_item_draft',
        storageIdentity: key,
        value: draft.memo ?? '',
        visibility: 'history',
        exportPolicy: 'history_view_only',
        readOnly: true,
        runId: run.runId,
      })];
    });
    const runLegacyValue = getFlowItemUserNote(snapshot.itemStates[options.itemId]);
    const runLegacyEntries = runLegacyValue === undefined
      ? []
      : [createEntry({
          id: `run-legacy:${run.runId}:${options.itemId}`,
          store: 'run_legacy_item_state',
          storageIdentity: options.itemId,
          value: runLegacyValue,
          visibility: 'history',
          exportPolicy: 'history_view_only',
          readOnly: true,
          runId: run.runId,
        })];
    const runExecutionEntries = (snapshot.executionNotes ?? []).flatMap((note, index) => {
      if (!options.executionItemIds.has(note.itemId)) return [];
      return [createEntry({
        id: `run-execution:${run.runId}:${note.kind}:${index}:${note.itemId}`,
        store: note.kind === 'private'
          ? 'run_private_execution_note'
          : 'run_source_correction_note',
        storageIdentity: note.itemId,
        value: note.note,
        visibility: 'history',
        exportPolicy: 'never_general',
        readOnly: true,
        runId: run.runId,
      })];
    });
    const runCompletionCorrection = snapshot.completionFeedback?.sourceCorrectionDraft;
    const runCompletionCorrectionEntries = runCompletionCorrection
      && (
        runCompletionCorrection.scope === 'flow'
        || !runCompletionCorrection.itemId
        || runCompletionCorrection.itemId === options.itemId
        || options.executionItemIds.has(runCompletionCorrection.itemId)
      )
      ? [createEntry({
          id: `run-completion-correction:${run.runId}:${runCompletionCorrection.itemId ?? 'flow'}`,
          store: 'run_completion_source_correction',
          storageIdentity: `${run.flowSlug}::${runCompletionCorrection.itemId ?? 'flow'}`,
          value: runCompletionCorrection.note,
          visibility: 'history',
          exportPolicy: 'never_general',
          readOnly: true,
          runId: run.runId,
        })]
      : [];
    return [
      ...itemMemoEntries,
      ...runPersonalEntries,
      ...runLegacyEntries,
      ...runExecutionEntries,
      ...runCompletionCorrectionEntries,
    ];
  });
}

function chooseDefaultEntry(entries: ItemMemoFacadeEntry[]): ItemMemoFacadeEntry | undefined {
  const itemDraft = [...entries]
    .reverse()
    .find((entry) => entry.store === 'item_draft');
  const fallback = itemDraft ?? entries.find((entry) => entry.store === 'personal_copy');
  if (!fallback) return undefined;
  return {
    ...fallback,
    visibility: 'default',
    exportPolicy: 'general_item_memo',
  };
}

/**
 * Resolves the one visible Item memo without migrating or merging any store.
 * Every legacy, private, correction, and historical value remains addressable
 * as its own entry so callers can render or recover it intentionally.
 */
export function buildItemMemoFacade(
  options: BuildItemMemoFacadeOptions,
): ItemMemoFacade {
  const flowSlug = options.flowSlug.trim();
  const itemId = options.itemId.trim();
  const itemMemoWriteKey = options.itemMemoWriteKey.trim();
  const executionItemIds = uniqueNonBlank([
    itemId,
    ...(options.executionItemIds ?? []),
  ]);
  const executionItemIdSet = new Set(executionItemIds);
  const personalEntries = getCurrentPersonalEntries(options);
  const defaultEntry = chooseDefaultEntry(personalEntries);
  const currentPersonalEntries = personalEntries.map((entry) => (
    entry.id === defaultEntry?.id ? defaultEntry : entry
  ));
  const legacyValue = getFlowItemUserNote(options.legacyItemState);
  const legacyEntries = legacyValue === undefined
    ? []
    : [createEntry({
        id: `legacy-item-state:${flowSlug}:${itemId}`,
        store: 'legacy_item_state',
        storageIdentity: itemId,
        value: legacyValue,
        visibility: 'preserved',
        exportPolicy: 'general_legacy_note',
        readOnly: true,
      })];
  const entries = [
    ...currentPersonalEntries,
    ...legacyEntries,
    ...getCurrentExecutionEntries(options.executionNotes ?? [], executionItemIdSet),
    ...getCompletionCorrectionEntry(
      options.completionFeedback,
      itemId,
      executionItemIdSet,
    ),
    ...getRunEntries({
      runs: options.completedRuns ?? [],
      itemId,
      itemDraftReadKeys: new Set(uniqueNonBlank(options.itemDraftReadKeys)),
      executionItemIds: executionItemIdSet,
    }),
  ];
  const generalExportFields: ItemMemoFacadeGeneralExportField[] = [
    ...(defaultEntry && isVisibleValue(defaultEntry.value)
      ? [{
          kind: 'item_memo' as const,
          value: defaultEntry.value,
          sourceEntryId: defaultEntry.id,
        }]
      : []),
    ...legacyEntries.flatMap((entry) => isVisibleValue(entry.value)
      ? [{
          kind: 'legacy_item_note' as const,
          value: entry.value,
          sourceEntryId: entry.id,
        }]
      : []),
  ];

  return {
    schemaVersion: ITEM_MEMO_FACADE_SCHEMA_VERSION,
    identity: { flowSlug, itemId, executionItemIds },
    writeTarget: { store: 'item_draft', key: itemMemoWriteKey, field: 'memo' },
    ...(defaultEntry ? { defaultEntry } : {}),
    entries,
    generalExportFields,
    generalExportExcludedEntryIds: entries
      .filter((entry) => entry.exportPolicy === 'never_general' || entry.exportPolicy === 'history_view_only')
      .map((entry) => entry.id),
  };
}

/**
 * Applies the facade's default write to Item memo only. It deliberately stores
 * an empty string instead of deleting a key, and never receives or rewrites
 * legacy notes, execution notes, corrections, or completed-run snapshots.
 */
export function applyItemMemoFacadeWrite(options: {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  itemMemoWriteKey: string;
  value: string;
}): ItemMemoFacadeWriteResult {
  const key = options.itemMemoWriteKey.trim();
  if (!key) throw new Error('An Item memo write key is required.');
  const itemDrafts = {
    ...options.itemDrafts,
    [key]: {
      ...(options.itemDrafts[key] ?? {}),
      memo: options.value,
    },
  };
  return {
    itemDrafts,
    mutation: { store: 'item_draft', key, field: 'memo', value: options.value },
    deletedKeys: [],
  };
}
