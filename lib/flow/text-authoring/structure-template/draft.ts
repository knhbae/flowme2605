import {
  cloneAuthoringValue,
  stableAuthoringId,
  stableAuthoringJson,
} from "../identity";
import {
  STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION,
  type GroupInstance,
  type StructureDraft,
  type StructureDraftMaterialization,
  type StructureTemplateDefinition,
  type StructureTemplateDismissedSlot,
  type StructureTemplateSeedGroup,
  type StructureTemplateValue,
  type StructureTemplateValueMap,
} from "./types";

export type CreateStructureDraftOptions = Readonly<{
  draftId: string;
  sourceFingerprint: string;
  sourceRevisionId?: string;
  updatedAt: string;
}>;

export type StructureDraftAction =
  | Readonly<{
      type: "set_value";
      scopeInstanceId: "root" | string;
      slotId: string;
      value: StructureTemplateValue;
    }>
  | Readonly<{
      type: "add_group_instance";
      parentScopeInstanceId: "root" | string;
      groupId: string;
      instanceId?: string;
      values?: StructureTemplateValueMap;
    }>
  | Readonly<{
      type: "remove_group_instance";
      instanceId: string;
    }>
  | Readonly<{
      type: "dismiss_slot";
      scopeInstanceId: "root" | string;
      slotId: string;
    }>
  | Readonly<{
      type: "restore_slot";
      scopeInstanceId: "root" | string;
      slotId: string;
    }>
  | Readonly<{
      type: "mark_materialized";
      materialization: StructureDraftMaterialization;
    }>;

export class StructureDraftMutationError extends Error {
  readonly code:
    | "invalid_argument"
    | "duplicate_instance_id"
    | "missing_instance";

  constructor(
    code: StructureDraftMutationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "StructureDraftMutationError";
    this.code = code;
  }
}

function requiredText(value: string, label: string): string {
  if (value.trim() === "") {
    throw new StructureDraftMutationError(
      "invalid_argument",
      `${label} must be a non-empty string.`,
    );
  }
  return value;
}

function instantiateSeedGroup(
  draftId: string,
  templateId: string,
  seed: StructureTemplateSeedGroup,
  path: readonly string[],
  order: number,
): GroupInstance {
  const identityPath = [...path, `${seed.groupId}:${order}`];
  return {
    instanceId: stableAuthoringId(
      "structure-group",
      draftId,
      templateId,
      identityPath.join("/"),
    ),
    groupId: seed.groupId,
    order,
    values: {},
    children: (seed.childSeeds ?? []).map((child, childOrder) =>
      instantiateSeedGroup(
        draftId,
        templateId,
        child,
        identityPath,
        childOrder,
      ),
    ),
  };
}

export function createStructureDraft(
  definition: StructureTemplateDefinition,
  options: CreateStructureDraftOptions,
): StructureDraft {
  const draftId = requiredText(options.draftId, "draftId");
  const sourceFingerprint = requiredText(
    options.sourceFingerprint,
    "sourceFingerprint",
  );
  requiredText(options.updatedAt, "updatedAt");

  return {
    schemaVersion: STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION,
    draftId,
    templateId: definition.templateId,
    templateVersion: definition.version,
    sourceFingerprint,
    ...(options.sourceRevisionId
      ? { sourceRevisionId: options.sourceRevisionId }
      : {}),
    values: cloneAuthoringValue(definition.instanceDefaults.values),
    groups: definition.instanceDefaults.seedGroups.map((seed, order) =>
      instantiateSeedGroup(
        draftId,
        definition.templateId,
        seed,
        ["root"],
        order,
      ),
    ),
    dismissedSlots: [],
    materialized: false,
    revision: 1,
    updatedAt: options.updatedAt,
  };
}

function instanceIds(groups: readonly GroupInstance[]): Set<string> {
  const result = new Set<string>();
  const visit = (entries: readonly GroupInstance[]) => {
    entries.forEach((entry) => {
      result.add(entry.instanceId);
      visit(entry.children);
    });
  };
  visit(groups);
  return result;
}

function cloneValueMap(
  values: StructureTemplateValueMap,
): Record<string, StructureTemplateValue> {
  return cloneAuthoringValue(values);
}

function reindexGroups(groups: readonly GroupInstance[]): GroupInstance[] {
  return groups.map((group, order) =>
    group.order === order ? group : { ...group, order },
  );
}

function mapInstance(
  groups: readonly GroupInstance[],
  instanceId: string,
  update: (instance: GroupInstance) => GroupInstance,
): Readonly<{ groups: GroupInstance[]; found: boolean }> {
  let found = false;
  const next = groups.map((group) => {
    if (group.instanceId === instanceId) {
      found = true;
      return update(group);
    }
    const nested = mapInstance(group.children, instanceId, update);
    if (!nested.found) return group;
    found = true;
    return { ...group, children: nested.groups };
  });
  return { groups: next, found };
}

function removeInstance(
  groups: readonly GroupInstance[],
  instanceId: string,
): Readonly<{
  groups: GroupInstance[];
  found: boolean;
  removedIds: ReadonlySet<string>;
}> {
  const removedIds = new Set<string>();
  const collect = (instance: GroupInstance) => {
    removedIds.add(instance.instanceId);
    instance.children.forEach(collect);
  };

  let found = false;
  const retained: GroupInstance[] = [];
  groups.forEach((group) => {
    if (group.instanceId === instanceId) {
      found = true;
      collect(group);
      return;
    }
    const nested = removeInstance(group.children, instanceId);
    if (nested.found) {
      found = true;
      nested.removedIds.forEach((id) => removedIds.add(id));
      retained.push({ ...group, children: nested.groups });
    } else {
      retained.push(group);
    }
  });
  return { groups: reindexGroups(retained), found, removedIds };
}

function nextDraft(
  draft: StructureDraft,
  updatedAt: string,
  patch: Partial<StructureDraft>,
  invalidateMaterialization = true,
): StructureDraft {
  requiredText(updatedAt, "updatedAt");
  return {
    ...draft,
    ...patch,
    materialized: invalidateMaterialization
      ? false
      : (patch.materialized ?? draft.materialized),
    revision: draft.revision + 1,
    updatedAt,
  };
}

function sameDismissedSlot(
  left: StructureTemplateDismissedSlot,
  right: StructureTemplateDismissedSlot,
): boolean {
  return left.scopeInstanceId === right.scopeInstanceId
    && left.slotId === right.slotId;
}

function assertKnownScope(draft: StructureDraft, scopeInstanceId: string): void {
  if (scopeInstanceId !== "root" && !instanceIds(draft.groups).has(scopeInstanceId)) {
    throw new StructureDraftMutationError(
      "missing_instance",
      `Unknown structure group instance: ${scopeInstanceId}`,
    );
  }
}

/**
 * Pure immutable sidecar reducer. It never receives or returns authored source
 * text, so choosing or editing a structure template cannot mutate rawText.
 */
export function reduceStructureDraft(
  draft: StructureDraft,
  action: StructureDraftAction,
  updatedAt: string,
): StructureDraft {
  switch (action.type) {
    case "set_value": {
      requiredText(action.slotId, "slotId");
      assertKnownScope(draft, action.scopeInstanceId);
      if (action.scopeInstanceId === "root") {
        return nextDraft(draft, updatedAt, {
          values: {
            ...cloneValueMap(draft.values),
            [action.slotId]: cloneAuthoringValue(action.value),
          },
        });
      }
      const mapped = mapInstance(
        draft.groups,
        action.scopeInstanceId,
        (instance) => ({
          ...instance,
          values: {
            ...cloneValueMap(instance.values),
            [action.slotId]: cloneAuthoringValue(action.value),
          },
        }),
      );
      return nextDraft(draft, updatedAt, { groups: mapped.groups });
    }

    case "add_group_instance": {
      requiredText(action.groupId, "groupId");
      assertKnownScope(draft, action.parentScopeInstanceId);
      const siblingCount = action.parentScopeInstanceId === "root"
        ? draft.groups.length
        : (() => {
            let count = 0;
            mapInstance(draft.groups, action.parentScopeInstanceId, (parent) => {
              count = parent.children.length;
              return parent;
            });
            return count;
          })();
      const generatedId = stableAuthoringId(
        "structure-group",
        draft.draftId,
        action.parentScopeInstanceId,
        action.groupId,
        draft.revision,
        siblingCount,
      );
      const newInstance: GroupInstance = {
        instanceId: requiredText(action.instanceId ?? generatedId, "instanceId"),
        groupId: action.groupId,
        order: siblingCount,
        values: cloneValueMap(action.values ?? {}),
        children: [],
      };
      if (instanceIds(draft.groups).has(newInstance.instanceId)) {
        throw new StructureDraftMutationError(
          "duplicate_instance_id",
          `Structure group instance already exists: ${newInstance.instanceId}`,
        );
      }
      if (action.parentScopeInstanceId === "root") {
        return nextDraft(draft, updatedAt, {
          groups: [...draft.groups, newInstance],
        });
      }
      const mapped = mapInstance(
        draft.groups,
        action.parentScopeInstanceId,
        (parent) => ({
          ...parent,
          children: [...parent.children, newInstance],
        }),
      );
      return nextDraft(draft, updatedAt, { groups: mapped.groups });
    }

    case "remove_group_instance": {
      requiredText(action.instanceId, "instanceId");
      const removed = removeInstance(draft.groups, action.instanceId);
      if (!removed.found) {
        throw new StructureDraftMutationError(
          "missing_instance",
          `Unknown structure group instance: ${action.instanceId}`,
        );
      }
      return nextDraft(draft, updatedAt, {
        groups: removed.groups,
        dismissedSlots: draft.dismissedSlots.filter(
          (entry) => !removed.removedIds.has(entry.scopeInstanceId),
        ),
      });
    }

    case "dismiss_slot": {
      requiredText(action.slotId, "slotId");
      assertKnownScope(draft, action.scopeInstanceId);
      const entry: StructureTemplateDismissedSlot = {
        scopeInstanceId: action.scopeInstanceId,
        slotId: action.slotId,
      };
      if (draft.dismissedSlots.some((candidate) => sameDismissedSlot(candidate, entry))) {
        return draft;
      }
      return nextDraft(draft, updatedAt, {
        dismissedSlots: [...draft.dismissedSlots, entry],
      });
    }

    case "restore_slot": {
      requiredText(action.slotId, "slotId");
      assertKnownScope(draft, action.scopeInstanceId);
      const entry: StructureTemplateDismissedSlot = {
        scopeInstanceId: action.scopeInstanceId,
        slotId: action.slotId,
      };
      const dismissedSlots = draft.dismissedSlots.filter(
        (candidate) => !sameDismissedSlot(candidate, entry),
      );
      if (dismissedSlots.length === draft.dismissedSlots.length) return draft;
      return nextDraft(draft, updatedAt, { dismissedSlots });
    }

    case "mark_materialized": {
      const { insertedRange } = action.materialization;
      if (
        insertedRange.start < 0
        || insertedRange.end < insertedRange.start
        || !Number.isSafeInteger(insertedRange.start)
        || !Number.isSafeInteger(insertedRange.end)
      ) {
        throw new StructureDraftMutationError(
          "invalid_argument",
          "materialization.insertedRange must be a valid source range.",
        );
      }
      requiredText(action.materialization.transactionId, "transactionId");
      requiredText(action.materialization.at, "materialization.at");
      requiredText(
        action.materialization.sourceRevisionId,
        "materialization.sourceRevisionId",
      );
      return nextDraft(
        draft,
        updatedAt,
        { materialized: cloneAuthoringValue(action.materialization) },
        false,
      );
    }
  }
}

/** Stable semantic form useful for deterministic reducer assertions. */
export function serializeStructureDraft(draft: StructureDraft): string {
  return stableAuthoringJson(draft);
}
