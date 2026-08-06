import type { FlowEditorContext, FlowEditorLevel } from './flow-editor-transaction';

export type FlowEditorSemanticRole =
  | 'unsaved-public-draft'
  | 'pending-parent-apply'
  | 'saved-personal-copy'
  | 'pending-saved-plan-save';

export type FlowEditorFieldId =
  | 'plan-title'
  | 'plan-anchor'
  | 'plan-items'
  | 'plan-routine'
  | 'item-title'
  | 'item-detail'
  | 'item-date'
  | 'item-completion-criterion'
  | 'source-and-safety';

export type FlowEditorFieldCapability = Readonly<{
  id: FlowEditorFieldId;
  mode: 'editable' | 'read-only';
}>;

export type FlowEditorSchemaCapabilities = Readonly<{
  title?: boolean;
  anchor?: boolean;
  anchorEditable?: boolean;
  items?: boolean;
  routine?: boolean;
  detail?: boolean;
  date?: boolean;
  completionCriterion?: boolean;
  sourceOrSafety?: boolean;
}>;

export type FlowEditorSurfaceContract = Readonly<{
  context: FlowEditorContext;
  level: FlowEditorLevel;
  semanticRole: FlowEditorSemanticRole;
  commitRole:
    | 'apply-public-draft'
    | 'apply-item-to-parent-public-draft'
    | 'save-personal-overlay'
    | 'apply-item-to-parent-personal-draft';
  stateLabel: '미저장 변경' | '저장한 계획';
  commitLabel: '이 내용으로 적용' | '이 항목 저장' | '저장' | '변경 저장';
  fields: readonly FlowEditorFieldCapability[];
}>;

const PLAN_FIELD_ORDER: readonly FlowEditorFieldId[] = [
  'plan-title',
  'plan-anchor',
  'plan-items',
  'plan-routine',
  'source-and-safety',
];

const ITEM_FIELD_ORDER: readonly FlowEditorFieldId[] = [
  'item-title',
  'item-detail',
  'item-date',
  'item-completion-criterion',
  'source-and-safety',
];

function isFieldAvailable(
  id: FlowEditorFieldId,
  capabilities: FlowEditorSchemaCapabilities,
): boolean {
  switch (id) {
    case 'plan-title':
    case 'item-title':
      return capabilities.title !== false;
    case 'plan-anchor':
      return Boolean(capabilities.anchor);
    case 'plan-items':
      return Boolean(capabilities.items);
    case 'plan-routine':
      return Boolean(capabilities.routine);
    case 'item-detail':
      return capabilities.detail !== false;
    case 'item-date':
      return capabilities.date !== false;
    case 'item-completion-criterion':
      return Boolean(capabilities.completionCriterion);
    case 'source-and-safety':
      return Boolean(capabilities.sourceOrSafety);
  }
}

export function getFlowEditorSurfaceContract(input: Readonly<{
  context: FlowEditorContext;
  level: FlowEditorLevel;
  capabilities?: FlowEditorSchemaCapabilities;
}>): FlowEditorSurfaceContract {
  const capabilities = input.capabilities ?? {};
  const order = input.level === 'plan' ? PLAN_FIELD_ORDER : ITEM_FIELD_ORDER;
  const semanticRole: FlowEditorSemanticRole = input.context === 'public-draft'
    ? input.level === 'plan'
      ? 'unsaved-public-draft'
      : 'pending-parent-apply'
    : input.level === 'plan'
      ? 'saved-personal-copy'
      : 'pending-saved-plan-save';
  const commitRole = input.context === 'public-draft'
    ? input.level === 'plan'
      ? 'apply-public-draft' as const
      : 'apply-item-to-parent-public-draft' as const
    : input.level === 'plan'
      ? 'save-personal-overlay' as const
      : 'apply-item-to-parent-personal-draft' as const;
  const commitLabel = input.context === 'public-draft'
    ? input.level === 'plan'
      ? '이 내용으로 적용' as const
      : '이 항목 저장' as const
    : input.level === 'plan'
      ? '저장' as const
      : '변경 저장' as const;

  return {
    context: input.context,
    level: input.level,
    semanticRole,
    commitRole,
    stateLabel: input.context === 'public-draft' ? '미저장 변경' : '저장한 계획',
    commitLabel,
    fields: order
      .filter((id) => isFieldAvailable(id, capabilities))
      .map((id) => ({
        id,
        mode:
          id === 'item-completion-criterion' ||
          id === 'source-and-safety' ||
          (id === 'plan-anchor' && capabilities.anchorEditable === false)
            ? 'read-only' as const
            : 'editable' as const,
      })),
  };
}

export function getFlowEditorFieldOrder(level: FlowEditorLevel): readonly FlowEditorFieldId[] {
  return level === 'plan' ? PLAN_FIELD_ORDER : ITEM_FIELD_ORDER;
}
