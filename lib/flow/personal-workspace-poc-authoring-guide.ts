import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
  type PersonalWorkspacePocAuthoringTemplateId,
} from './personal-workspace-poc-authoring';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
  type PersonalWorkspacePocAuthoringFidelityManifest,
  type PersonalWorkspacePocAuthoringSourceLine,
} from './personal-workspace-poc-authoring-fidelity';

export const PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_VERSION = 1 as const;

export type PersonalWorkspacePocAuthoringValueLocator = Readonly<{
  sourceFingerprint: string;
  line: number;
  syntaxPrefix: string;
  valueStartOffset: number;
  valueEndOffset: number;
  exact: true;
}>;

export type PersonalWorkspacePocAuthoringGuideTemplate = Readonly<{
  templateId: PersonalWorkspacePocAuthoringTemplateId;
  scaffold: string;
  scaffoldFingerprint: string;
  firstBlankValue: PersonalWorkspacePocAuthoringValueLocator;
}>;

export type PersonalWorkspacePocAuthoringGhostHintId =
  | 'flow-title'
  | 'step-title'
  | 'root-item'
  | 'child-check'
  | 'anchor-date'
  | 'relative-date'
  | 'fixed-date'
  | 'place'
  | 'resource'
  | 'completion-criteria';

export type PersonalWorkspacePocAuthoringGhostHint = Readonly<{
  hintId: PersonalWorkspacePocAuthoringGhostHintId;
  syntaxPrefix: string;
  example: string;
  lineKind: PersonalWorkspacePocAuthoringSourceLine['kind'];
  sourceRole: 'flow' | 'step' | 'item' | 'item-property';
}>;

export type PersonalWorkspacePocAuthoringGhostDescriptor = Readonly<{
  hintId: PersonalWorkspacePocAuthoringGhostHintId;
  line: number;
  sourceFingerprint: string;
  valueLocator: PersonalWorkspacePocAuthoringValueLocator;
  text: string;
  ariaHidden: true;
  pointerEvents: 'none';
  userSelect: 'none';
  sourceMutationCount: 0;
}>;

export type PersonalWorkspacePocAuthoringMenuActionId =
  | 'flow-title'
  | 'first-step'
  | 'first-task'
  | 'next-task'
  | 'child-check'
  | 'item-date'
  | 'item-time'
  | 'item-place'
  | 'item-resource'
  | 'item-completion-criteria'
  | 'new-step';

export type PersonalWorkspacePocAuthoringMenuGroupId =
  | 'document-start'
  | 'current-step'
  | 'current-item'
  | 'item-information'
  | 'new-section';

export type PersonalWorkspacePocAuthoringMenuAction = Readonly<{
  actionId: PersonalWorkspacePocAuthoringMenuActionId;
  groupId: PersonalWorkspacePocAuthoringMenuGroupId;
  label: string;
  syntax: string;
  hierarchyDepth: 0 | 1;
  availability: 'enabled' | 'blocked';
  blockedReason?: string;
  targetKinds: readonly PersonalWorkspacePocAuthoringGuideTargetKind[];
}>;

export type PersonalWorkspacePocAuthoringMenuGroup = Readonly<{
  groupId: PersonalWorkspacePocAuthoringMenuGroupId;
  label: string;
  actionIds: readonly PersonalWorkspacePocAuthoringMenuActionId[];
}>;

export type PersonalWorkspacePocAuthoringGuideCatalog = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_VERSION;
  catalogFingerprint: string;
  templates: readonly PersonalWorkspacePocAuthoringGuideTemplate[];
  ghostHints: readonly PersonalWorkspacePocAuthoringGhostHint[];
  menuGroups: readonly PersonalWorkspacePocAuthoringMenuGroup[];
  menuActions: readonly PersonalWorkspacePocAuthoringMenuAction[];
}>;

export type PersonalWorkspacePocAuthoringGuideTargetKind =
  | 'blank-line'
  | 'root-item';

export type PersonalWorkspacePocAuthoringGuideTarget = Readonly<{
  targetId: string;
  kind: PersonalWorkspacePocAuthoringGuideTargetKind;
  sourceFingerprint: string;
  line: number;
  ownerItemLine?: number;
  replaceStart: number;
  replaceEnd: number;
  insertionPrefix: string;
  insertionSuffix: string;
  preferredActionId: PersonalWorkspacePocAuthoringMenuActionId;
  allowedActionIds: readonly PersonalWorkspacePocAuthoringMenuActionId[];
}>;

function stableGuideHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function guideFingerprint(value: unknown): string {
  const serialized = JSON.stringify(value);
  return `guide-v1:${serialized.length}:${stableGuideHash(serialized)}`;
}

const GHOST_HINTS = Object.freeze([
  Object.freeze({
    hintId: 'flow-title',
    syntaxPrefix: '# ',
    example: '예: 8월 제주 여행 준비',
    lineKind: 'title',
    sourceRole: 'flow',
  }),
  Object.freeze({
    hintId: 'step-title',
    syntaxPrefix: '## ',
    example: '예: 예약',
    lineKind: 'section',
    sourceRole: 'step',
  }),
  Object.freeze({
    hintId: 'root-item',
    syntaxPrefix: '- [ ] ',
    example: '예: 항공권 확인',
    lineKind: 'item',
    sourceRole: 'item',
  }),
  Object.freeze({
    hintId: 'child-check',
    syntaxPrefix: '  - [ ] ',
    example: '예: 예약번호 확인',
    // The fidelity owner deliberately keeps an empty nested marker source-only
    // until a value exists, so its safe blank presentation is prose-shaped.
    lineKind: 'prose',
    sourceRole: 'item-property',
  }),
  Object.freeze({
    hintId: 'anchor-date',
    syntaxPrefix: '- 기준일: ',
    example: '예: 2026-09-02',
    lineKind: 'property',
    sourceRole: 'flow',
  }),
  Object.freeze({
    hintId: 'relative-date',
    syntaxPrefix: '  - 상대 날짜: ',
    example: '예: D-7',
    lineKind: 'property',
    sourceRole: 'item-property',
  }),
  Object.freeze({
    hintId: 'fixed-date',
    syntaxPrefix: '  - 날짜: ',
    example: '예: 2026-09-02',
    lineKind: 'property',
    sourceRole: 'item-property',
  }),
  Object.freeze({
    hintId: 'place',
    syntaxPrefix: '  - 장소: ',
    example: '예: 김포공항',
    lineKind: 'property',
    sourceRole: 'item-property',
  }),
  Object.freeze({
    hintId: 'resource',
    syntaxPrefix: '  - 자료: ',
    example: '예: https://example.com',
    lineKind: 'property',
    sourceRole: 'item-property',
  }),
  Object.freeze({
    hintId: 'completion-criteria',
    syntaxPrefix: '  - 완료 기준: ',
    example: '예: 예약번호를 메모에 남김',
    lineKind: 'property',
    sourceRole: 'item-property',
  }),
] satisfies readonly PersonalWorkspacePocAuthoringGhostHint[]);

const MENU_ACTIONS = Object.freeze([
  Object.freeze({
    actionId: 'flow-title',
    groupId: 'document-start',
    label: 'Flow 이름 적기',
    syntax: '# ',
    hierarchyDepth: 0,
    availability: 'enabled',
    targetKinds: Object.freeze(['blank-line'] as const),
  }),
  Object.freeze({
    actionId: 'first-step',
    groupId: 'document-start',
    label: '첫 단계',
    syntax: '## ',
    hierarchyDepth: 0,
    availability: 'enabled',
    targetKinds: Object.freeze(['blank-line'] as const),
  }),
  Object.freeze({
    actionId: 'first-task',
    groupId: 'current-step',
    label: '첫 할 일',
    syntax: '- [ ] ',
    hierarchyDepth: 0,
    availability: 'enabled',
    targetKinds: Object.freeze(['blank-line'] as const),
  }),
  Object.freeze({
    actionId: 'next-task',
    groupId: 'current-step',
    label: '다음 할 일',
    syntax: '- [ ] ',
    hierarchyDepth: 0,
    availability: 'enabled',
    targetKinds: Object.freeze(['blank-line', 'root-item'] as const),
  }),
  Object.freeze({
    actionId: 'child-check',
    groupId: 'current-item',
    label: '하위 확인',
    syntax: '  - [ ] ',
    hierarchyDepth: 1,
    availability: 'blocked',
    blockedReason: '현재 PoC parser는 하위 checklist를 lossless Item으로 저장하지 못합니다.',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'item-date',
    groupId: 'item-information',
    label: '날짜',
    syntax: '  - 날짜: ',
    hierarchyDepth: 1,
    availability: 'enabled',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'item-time',
    groupId: 'item-information',
    label: '시간',
    syntax: '  - 시간: ',
    hierarchyDepth: 1,
    availability: 'blocked',
    blockedReason: '시간은 현재 PoC materialization에서 실행 정확성을 보존하지 못합니다.',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'item-place',
    groupId: 'item-information',
    label: '장소',
    syntax: '  - 장소: ',
    hierarchyDepth: 1,
    availability: 'enabled',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'item-resource',
    groupId: 'item-information',
    label: '자료',
    syntax: '  - 자료: ',
    hierarchyDepth: 1,
    availability: 'enabled',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'item-completion-criteria',
    groupId: 'item-information',
    label: '완료 기준',
    syntax: '  - 완료 기준: ',
    hierarchyDepth: 1,
    availability: 'enabled',
    targetKinds: Object.freeze(['root-item'] as const),
  }),
  Object.freeze({
    actionId: 'new-step',
    groupId: 'new-section',
    label: '새 단계',
    syntax: '## ',
    hierarchyDepth: 0,
    availability: 'enabled',
    targetKinds: Object.freeze(['blank-line', 'root-item'] as const),
  }),
] satisfies readonly PersonalWorkspacePocAuthoringMenuAction[]);

const MENU_GROUPS = Object.freeze([
  Object.freeze({
    groupId: 'document-start',
    label: '문서 시작',
    actionIds: Object.freeze(['flow-title', 'first-step'] as const),
  }),
  Object.freeze({
    groupId: 'current-step',
    label: '현재 단계에',
    actionIds: Object.freeze(['first-task', 'next-task'] as const),
  }),
  Object.freeze({
    groupId: 'current-item',
    label: '현재 할 일 안에',
    actionIds: Object.freeze(['child-check'] as const),
  }),
  Object.freeze({
    groupId: 'item-information',
    label: '항목 정보',
    actionIds: Object.freeze([
      'item-date',
      'item-time',
      'item-place',
      'item-resource',
      'item-completion-criteria',
    ] as const),
  }),
  Object.freeze({
    groupId: 'new-section',
    label: '새 구간으로',
    actionIds: Object.freeze(['new-step'] as const),
  }),
] satisfies readonly PersonalWorkspacePocAuthoringMenuGroup[]);

function matchGhostHintForRawLine(
  rawLine: string,
): PersonalWorkspacePocAuthoringGhostHint | null {
  for (const hint of GHOST_HINTS) {
    if (!rawLine.startsWith(hint.syntaxPrefix)) continue;
    if (rawLine.slice(hint.syntaxPrefix.length).trim().length !== 0) continue;
    return hint;
  }
  return null;
}

function valueLocatorForLine(
  sourceFingerprint: string,
  line: PersonalWorkspacePocAuthoringSourceLine,
  syntaxPrefix: string,
): PersonalWorkspacePocAuthoringValueLocator {
  return {
    sourceFingerprint,
    line: line.line,
    syntaxPrefix,
    valueStartOffset: line.locator.startOffset + syntaxPrefix.length,
    valueEndOffset: line.locator.startOffset + line.rawLine.length,
    exact: true,
  };
}

export function findPersonalWorkspacePocFirstBlankValueLocator(
  rawText: string,
): PersonalWorkspacePocAuthoringValueLocator | null {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const { manifest } = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText,
    sourceFingerprint,
  });
  for (const line of manifest.sourceLines) {
    const hint = matchGhostHintForRawLine(line.rawLine);
    if (!hint || line.kind !== hint.lineKind) continue;
    return valueLocatorForLine(sourceFingerprint, line, hint.syntaxPrefix);
  }
  return null;
}

const GUIDE_TEMPLATES = Object.freeze(
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => {
    const firstBlankValue = findPersonalWorkspacePocFirstBlankValueLocator(
      template.scaffold,
    );
    if (!firstBlankValue) {
      throw new Error(`Missing first blank value: ${template.templateId}`);
    }
    return Object.freeze({
      templateId: template.templateId,
      scaffold: template.scaffold,
      scaffoldFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(
        template.scaffold,
      ),
      firstBlankValue,
    });
  }),
);

const CATALOG_PAYLOAD = Object.freeze({
  version: PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_VERSION,
  templates: GUIDE_TEMPLATES,
  ghostHints: GHOST_HINTS,
  menuGroups: MENU_GROUPS,
  menuActions: MENU_ACTIONS,
});

export const PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG = Object.freeze({
  ...CATALOG_PAYLOAD,
  catalogFingerprint: guideFingerprint(CATALOG_PAYLOAD),
}) satisfies PersonalWorkspacePocAuthoringGuideCatalog;

const GUIDE_TEMPLATE_BY_ID = new Map(
  GUIDE_TEMPLATES.map((template) => [template.templateId, template]),
);

const MENU_ACTION_BY_ID = new Map(
  MENU_ACTIONS.map((action) => [action.actionId, action]),
);

export function getPersonalWorkspacePocAuthoringGuideTemplate(
  templateId: string,
): PersonalWorkspacePocAuthoringGuideTemplate | null {
  return GUIDE_TEMPLATE_BY_ID.get(
    templateId as PersonalWorkspacePocAuthoringTemplateId,
  ) ?? null;
}

export function getPersonalWorkspacePocAuthoringMenuAction(
  actionId: string,
): PersonalWorkspacePocAuthoringMenuAction | null {
  return MENU_ACTION_BY_ID.get(
    actionId as PersonalWorkspacePocAuthoringMenuActionId,
  ) ?? null;
}

export function matchPersonalWorkspacePocAuthoringGhost(input: Readonly<{
  rawText: string;
  sourceFingerprint: string;
  line: PersonalWorkspacePocAuthoringSourceLine;
}>): PersonalWorkspacePocAuthoringGhostDescriptor | null {
  if (
    fingerprintPersonalWorkspacePocAuthoringSource(input.rawText)
      !== input.sourceFingerprint
  ) {
    return null;
  }
  if (
    input.line.support === 'unsupported'
    || input.line.kind === 'fenced-code'
    || input.line.kind === 'table'
  ) {
    return null;
  }
  const exactRawLine = input.rawText.slice(
    input.line.locator.startOffset,
    input.line.locator.startOffset + input.line.rawLine.length,
  );
  if (exactRawLine !== input.line.rawLine) return null;
  const hint = matchGhostHintForRawLine(input.line.rawLine);
  if (!hint || input.line.kind !== hint.lineKind) return null;
  return {
    hintId: hint.hintId,
    line: input.line.line,
    sourceFingerprint: input.sourceFingerprint,
    valueLocator: valueLocatorForLine(
      input.sourceFingerprint,
      input.line,
      hint.syntaxPrefix,
    ),
    text: hint.example,
    ariaHidden: true,
    pointerEvents: 'none',
    userSelect: 'none',
    sourceMutationCount: 0,
  };
}

function findCaretLine(
  manifest: PersonalWorkspacePocAuthoringFidelityManifest,
  caret: number,
): PersonalWorkspacePocAuthoringSourceLine | null {
  const lineStartingAtCaret = [...manifest.sourceLines].reverse().find(
    (line) => line.locator.startOffset === caret,
  );
  if (lineStartingAtCaret) return lineStartingAtCaret;
  for (const line of manifest.sourceLines) {
    if (
      caret >= line.locator.startOffset
      && (caret < line.locator.endOffset || (
        caret === line.locator.endOffset
        && caret === manifest.sourceLength
      ))
    ) {
      return line;
    }
  }
  return manifest.sourceLines.at(-1) ?? null;
}

function nearestRootItemLine(
  manifest: PersonalWorkspacePocAuthoringFidelityManifest,
  line: PersonalWorkspacePocAuthoringSourceLine,
): PersonalWorkspacePocAuthoringSourceLine | null {
  if (line.kind === 'item' && line.support === 'supported') return line;
  if (!line.ownerItemLine || line.support !== 'supported') return null;
  return manifest.sourceLines.find(
    (candidate) => candidate.line === line.ownerItemLine
      && candidate.kind === 'item'
      && candidate.support === 'supported',
  ) ?? null;
}

function lineEndingFor(
  rawText: string,
  line: PersonalWorkspacePocAuthoringSourceLine,
): string {
  return rawText.slice(
    line.locator.startOffset + line.rawLine.length,
    line.locator.endOffset,
  );
}

function defaultLineEnding(rawText: string): string {
  const match = /\r\n|\r|\n/u.exec(rawText);
  return match?.[0] ?? '\n';
}

function propertyActionForLine(
  rawLine: string,
): PersonalWorkspacePocAuthoringMenuActionId | null {
  const match = /^(?: {2,}|\t+)- (?:상대 날짜|날짜|시간|시간대|장소|자료|반복|반복 종료|완료 기준):/u.exec(rawLine);
  if (!match) return null;
  const label = /- ([^:]+):/u.exec(match[0])?.[1];
  switch (label) {
    case '날짜': return 'item-date';
    case '시간': return 'item-time';
    case '장소': return 'item-place';
    case '자료': return 'item-resource';
    case '완료 기준': return 'item-completion-criteria';
    default: return null;
  }
}

/**
 * P1 can edit these exact source properties without claiming that the personal
 * Flow execution model owns them. They remain blocking at handoff, but must
 * not hide the contextual property catalog needed to amend or remove them.
 */
function isPocLocalPreservedPropertyLine(line: PersonalWorkspacePocAuthoringSourceLine): boolean {
  return line.kind === 'property'
    && /^(?: {2,}|\t+)- (?:시간|시간대|반복|반복 종료):/u.test(line.rawLine);
}

function blankTargetActions(
  manifest: PersonalWorkspacePocAuthoringFidelityManifest,
  line: PersonalWorkspacePocAuthoringSourceLine,
): Readonly<{
  preferredActionId: PersonalWorkspacePocAuthoringMenuActionId;
  allowedActionIds: readonly PersonalWorkspacePocAuthoringMenuActionId[];
}> {
  const before = manifest.sourceLines.filter(
    (candidate) => candidate.line < line.line && candidate.rawLine.trim().length > 0,
  );
  const hasTitle = before.some(
    (candidate) => candidate.kind === 'title' && candidate.support === 'supported',
  );
  if (!hasTitle) {
    return { preferredActionId: 'flow-title', allowedActionIds: ['flow-title'] };
  }
  const lastSectionIndex = before.findLastIndex(
    (candidate) => candidate.kind === 'section' && candidate.support === 'supported',
  );
  if (lastSectionIndex < 0) {
    return {
      preferredActionId: 'first-step',
      allowedActionIds: ['first-step', 'first-task'],
    };
  }
  const hasItemAfterSection = before.slice(lastSectionIndex + 1).some(
    (candidate) => candidate.kind === 'item' && candidate.support === 'supported',
  );
  return hasItemAfterSection
    ? {
      preferredActionId: 'next-task',
      allowedActionIds: ['next-task', 'new-step'],
    }
    : {
      preferredActionId: 'first-task',
      allowedActionIds: ['first-task', 'new-step'],
    };
}

export function resolvePersonalWorkspacePocAuthoringGuideTarget(input: Readonly<{
  rawText: string;
  sourceFingerprint: string;
  selectionStart: number;
  selectionEnd: number;
  fidelityManifest?: PersonalWorkspacePocAuthoringFidelityManifest;
}>): PersonalWorkspacePocAuthoringGuideTarget | null {
  if (
    input.selectionStart !== input.selectionEnd
    || input.selectionStart < 0
    || input.selectionStart > input.rawText.length
    || fingerprintPersonalWorkspacePocAuthoringSource(input.rawText)
      !== input.sourceFingerprint
  ) {
    return null;
  }
  const fresh = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText: input.rawText,
    sourceFingerprint: input.sourceFingerprint,
  }).manifest;
  const manifest = input.fidelityManifest ?? fresh;
  if (
    manifest.sourceFingerprint !== input.sourceFingerprint
    || manifest.sourceLength !== input.rawText.length
    || JSON.stringify(manifest.sourceLines) !== JSON.stringify(fresh.sourceLines)
  ) {
    return null;
  }
  const line = findCaretLine(manifest, input.selectionStart);
  if (!line || line.support === 'unsupported' || line.kind === 'fenced-code' || line.kind === 'table') {
    return null;
  }

  if (line.kind === 'blank' && line.rawLine.trim().length === 0) {
    const actions = blankTargetActions(manifest, line);
    return {
      targetId: `guide-target-v1:${input.sourceFingerprint}:blank:${line.line}`,
      kind: 'blank-line',
      sourceFingerprint: input.sourceFingerprint,
      line: line.line,
      replaceStart: line.locator.startOffset,
      replaceEnd: line.locator.startOffset + line.rawLine.length,
      insertionPrefix: '',
      insertionSuffix: '',
      ...actions,
    };
  }

  const rootItem = nearestRootItemLine(manifest, line);
  if (!rootItem) return null;
  const ownedLines = manifest.sourceLines.filter(
    (candidate) => candidate.line === rootItem.line
      || candidate.ownerItemLine === rootItem.line,
  );
  if (ownedLines.some((candidate) => (
    candidate.support === 'unsupported' && !isPocLocalPreservedPropertyLine(candidate)
  ))) return null;
  const lastOwned = ownedLines.at(-1) ?? rootItem;
  const terminator = lineEndingFor(input.rawText, lastOwned);
  const usedActions = new Set(
    ownedLines.map((candidate) => propertyActionForLine(candidate.rawLine)).filter(
      (action): action is PersonalWorkspacePocAuthoringMenuActionId => Boolean(action),
    ),
  );
  const allowedActionIds = (MENU_ACTIONS as readonly PersonalWorkspacePocAuthoringMenuAction[]).filter(
    (action) => action.targetKinds.includes('root-item')
      && !usedActions.has(action.actionId),
  ).map((action) => action.actionId);
  return {
    targetId: `guide-target-v1:${input.sourceFingerprint}:item:${rootItem.line}`,
    kind: 'root-item',
    sourceFingerprint: input.sourceFingerprint,
    line: line.line,
    ownerItemLine: rootItem.line,
    replaceStart: lastOwned.locator.endOffset,
    replaceEnd: lastOwned.locator.endOffset,
    insertionPrefix: terminator ? '' : defaultLineEnding(input.rawText),
    insertionSuffix: terminator || '',
    preferredActionId: 'next-task',
    allowedActionIds,
  };
}
