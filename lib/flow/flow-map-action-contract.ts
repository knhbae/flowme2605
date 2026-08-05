import type { CanonicalSavedCopyGroup } from './canonical-flow-storage';
import type { RiskLevel } from './types';

export type FlowMapSurface = 'public_preview' | 'saved_workspace';
export type FlowMapExecutionState = 'executable' | 'review_hold';
export type FlowMapSaveMode = 'save_all' | 'choose_child';

export type FlowMapSelectionState = {
  selectedCount: number;
  totalCount: number;
  itemIds?: string[];
};

export type FlowMapAction = {
  id:
    | 'save-map'
    | 'choose-child'
    | 'continue-map'
    | 'edit-map'
    | 'export-map'
    | 'open-source'
    | 'choose-saved-copy'
    | 'review-personal-conflict';
  intent:
    | 'save_all'
    | 'choose_child'
    | 'continue'
    | 'open_editor'
    | 'open_export'
    | 'open_source'
    | 'resolve_saved_copy'
    | 'review_personal_conflict';
  label: string;
  role: 'primary' | 'secondary' | 'source' | 'recovery';
  disabled: boolean;
  href?: string;
};

export type FlowMapRiskContract = {
  level: 'standard' | 'high';
  riskLevels: RiskLevel[];
  caution?: {
    text: string;
    placement: 'action_adjacent';
    adjacentToActionId: FlowMapAction['id'];
  };
};

export type FlowMapRecoveryContract = {
  required: boolean;
  reasons: ('canonical_copy_needs_choice' | 'personal_update_conflict')[];
  actions: FlowMapAction[];
};

export type FlowMapActionContract = {
  identity: {
    kind: 'source_backed_flow_map';
    mapId: string;
    title: string;
    source: FlowMapAction & {
      id: 'open-source';
      intent: 'open_source';
      role: 'source';
      href: string;
    };
  };
  controller: {
    kind: 'preserve_source_backed_map_controller';
    surface: FlowMapSurface;
    saveMode: FlowMapSaveMode;
    executionState: FlowMapExecutionState;
    selection?: FlowMapSelectionState;
    savedMapId?: string;
  };
  actions: {
    primary?: FlowMapAction;
    edit?: FlowMapAction;
    export?: FlowMapAction;
  };
  capabilities: {
    save: boolean;
    chooseChild: boolean;
    continue: boolean;
    edit: boolean;
    export: boolean;
    complete: false;
    openSource: true;
    recover: boolean;
  };
  risk: FlowMapRiskContract;
  recovery: FlowMapRecoveryContract;
};

export type BuildFlowMapActionContractInput = {
  mapId: string;
  title: string;
  sourceUrl: string;
  sourceLabel?: string;
  surface: FlowMapSurface;
  saveMode: FlowMapSaveMode;
  executionState: FlowMapExecutionState;
  editable: boolean;
  exportable?: boolean;
  selection?: FlowMapSelectionState;
  savedMapId?: string;
  riskLevels?: (RiskLevel | undefined)[];
  highRiskCaution?: string;
  canonicalCopyStatus?: CanonicalSavedCopyGroup['status'];
  personalConflictCount?: number;
};

export type BuildFlowMapRecoveryContractInput = Pick<
  BuildFlowMapActionContractInput,
  'surface' | 'canonicalCopyStatus' | 'personalConflictCount'
>;

const HIGH_RISK_LEVELS = new Set<RiskLevel>(['medical_sensitive', 'financial_sensitive']);

function assertNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be non-empty`);
  return normalized;
}

function validateSelection(selection?: FlowMapSelectionState): FlowMapSelectionState | undefined {
  if (!selection) return undefined;
  const { selectedCount, totalCount } = selection;
  if (
    !Number.isSafeInteger(selectedCount)
    || !Number.isSafeInteger(totalCount)
    || selectedCount < 0
    || totalCount < 0
    || selectedCount > totalCount
  ) {
    throw new RangeError('selection must use non-negative integer counts with selectedCount <= totalCount');
  }
  const itemIds = selection.itemIds?.map((itemId) => itemId.trim());
  if (itemIds) {
    if (itemIds.some((itemId) => !itemId)) {
      throw new TypeError('selection itemIds must be non-empty strings');
    }
    if (new Set(itemIds).size !== itemIds.length) {
      throw new TypeError('selection itemIds must be unique');
    }
    if (itemIds.length !== selectedCount) {
      throw new RangeError('selection itemIds length must match selectedCount');
    }
  }
  return { selectedCount, totalCount, ...(itemIds ? { itemIds } : {}) };
}

function uniqueRiskLevels(levels: (RiskLevel | undefined)[]): RiskLevel[] {
  return Array.from(new Set(levels.filter((level): level is RiskLevel => Boolean(level))));
}

function defaultHighRiskCaution(riskLevels: RiskLevel[]): string {
  const medical = riskLevels.includes('medical_sensitive');
  const financial = riskLevels.includes('financial_sensitive');
  if (medical && financial) {
    return '건강·재무 관련 내용은 최신 공식 원문과 필요한 전문 안내를 확인한 뒤 실행하세요.';
  }
  if (medical) return '건강 관련 내용은 최신 공식 원문과 의료기관 안내를 확인한 뒤 실행하세요.';
  return '재무 관련 내용은 최신 공식 원문과 필요한 전문 안내를 확인한 뒤 실행하세요.';
}

function buildPublicPrimaryAction(
  saveMode: FlowMapSaveMode,
  selection: FlowMapSelectionState | undefined,
): FlowMapAction {
  if (saveMode === 'choose_child') {
    return {
      id: 'choose-child',
      intent: 'choose_child',
      label: 'Flow 선택하기',
      role: 'primary',
      disabled: false,
    };
  }

  const selectedCount = selection?.selectedCount;
  const totalCount = selection?.totalCount;
  const disabled = selectedCount === 0;
  const label = disabled
    ? '저장할 항목 선택'
    : selectedCount !== undefined && totalCount !== undefined && selectedCount < totalCount
      ? `선택한 ${selectedCount}개로 시작`
      : '전체 저장하고 시작';
  return {
    id: 'save-map',
    intent: 'save_all',
    label,
    role: 'primary',
    disabled,
  };
}

export function buildFlowMapRecoveryContract(
  input: BuildFlowMapRecoveryContractInput,
): FlowMapRecoveryContract {
  if (input.surface !== 'saved_workspace') {
    return { required: false, reasons: [], actions: [] };
  }

  const reasons: FlowMapRecoveryContract['reasons'] = [];
  const actions: FlowMapAction[] = [];
  if (input.canonicalCopyStatus === 'needs_choice') {
    reasons.push('canonical_copy_needs_choice');
    actions.push({
      id: 'choose-saved-copy',
      intent: 'resolve_saved_copy',
      label: '사용할 사본 선택',
      role: 'recovery',
      disabled: false,
    });
  }
  if ((input.personalConflictCount ?? 0) > 0) {
    reasons.push('personal_update_conflict');
    actions.push({
      id: 'review-personal-conflict',
      intent: 'review_personal_conflict',
      label: '내 수정과 변경 내용 확인',
      role: 'recovery',
      disabled: false,
    });
  }
  return { required: actions.length > 0, reasons, actions };
}

export function buildFlowMapActionContract(input: BuildFlowMapActionContractInput): FlowMapActionContract {
  const mapId = assertNonEmpty(input.mapId, 'mapId');
  const title = assertNonEmpty(input.title, 'title');
  const sourceUrl = assertNonEmpty(input.sourceUrl, 'sourceUrl');
  const selection = validateSelection(input.selection);
  if (input.savedMapId !== undefined && input.savedMapId !== mapId) {
    throw new TypeError('savedMapId must match mapId');
  }
  if (!Number.isSafeInteger(input.personalConflictCount ?? 0) || (input.personalConflictCount ?? 0) < 0) {
    throw new RangeError('personalConflictCount must be a non-negative integer');
  }

  const source: FlowMapActionContract['identity']['source'] = {
    id: 'open-source',
    intent: 'open_source',
    label: input.sourceLabel?.trim() || '원문 보기',
    role: 'source',
    disabled: false,
    href: sourceUrl,
  };
  const executable = input.executionState === 'executable';
  const primary = executable
    ? input.surface === 'public_preview'
      ? buildPublicPrimaryAction(input.saveMode, selection)
      : {
          id: 'continue-map' as const,
          intent: 'continue' as const,
          label: '이어하기',
          role: 'primary' as const,
          disabled: false,
        }
    : undefined;
  const mapEditorAllowed = input.editable
    && !(input.surface === 'public_preview' && input.saveMode === 'choose_child');
  const edit = executable && mapEditorAllowed
    ? {
        id: 'edit-map' as const,
        intent: 'open_editor' as const,
        label: 'Flow 편집',
        role: 'secondary' as const,
        disabled: false,
      }
    : undefined;
  const exportAction = executable && input.exportable
    ? {
        id: 'export-map' as const,
        intent: 'open_export' as const,
        label: '내보내기',
        role: 'secondary' as const,
        disabled: false,
      }
    : undefined;
  const recovery = buildFlowMapRecoveryContract(input);
  const riskLevels = uniqueRiskLevels(input.riskLevels ?? []);
  const highRisk = riskLevels.some((level) => HIGH_RISK_LEVELS.has(level));
  const cautionAnchor = primary?.id ?? source.id;
  const risk: FlowMapRiskContract = {
    level: highRisk ? 'high' : 'standard',
    riskLevels,
    ...(highRisk
      ? {
          caution: {
            text: input.highRiskCaution?.trim() || defaultHighRiskCaution(riskLevels),
            placement: 'action_adjacent' as const,
            adjacentToActionId: cautionAnchor,
          },
        }
      : {}),
  };

  return {
    identity: {
      kind: 'source_backed_flow_map',
      mapId,
      title,
      source,
    },
    controller: {
      kind: 'preserve_source_backed_map_controller',
      surface: input.surface,
      saveMode: input.saveMode,
      executionState: input.executionState,
      ...(selection ? { selection } : {}),
      ...(input.savedMapId ? { savedMapId: input.savedMapId } : {}),
    },
    actions: {
      ...(primary ? { primary } : {}),
      ...(edit ? { edit } : {}),
      ...(exportAction ? { export: exportAction } : {}),
    },
    capabilities: {
      save: primary?.intent === 'save_all' && !primary.disabled,
      chooseChild: primary?.intent === 'choose_child',
      continue: primary?.intent === 'continue',
      edit: Boolean(edit),
      export: Boolean(exportAction),
      complete: false,
      openSource: true,
      recover: recovery.required,
    },
    risk,
    recovery,
  };
}
