import type { PersonalWorkspacePocAuthoringPropertyKey } from './personal-workspace-poc-authoring-properties';

/** UI navigation only: not a parser group, durable schema, or source ticket. */
export const AUTHORING_CHOOSER_VERSION = 1 as const;
export type AuthoringChooserGroupKey = 'schedule' | 'execution' | 'content' | 'provenance';
export type AuthoringChooserGroup = Readonly<{
  key: AuthoringChooserGroupKey;
  label: string;
  propertyKeys: readonly PersonalWorkspacePocAuthoringPropertyKey[];
}>;
function group(key: AuthoringChooserGroupKey, label: string, propertyKeys: readonly PersonalWorkspacePocAuthoringPropertyKey[]): AuthoringChooserGroup {
  return Object.freeze({ key, label, propertyKeys: Object.freeze([...propertyKeys]) });
}
export const AUTHORING_CHOOSER_GROUPS: readonly AuthoringChooserGroup[] = Object.freeze([
  group('schedule', '일정', ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration']),
  group('execution', '실행', ['completion', 'condition', 'subcheck']),
  group('content', '내용', ['detail', 'resource']),
  group('provenance', '더 보기', ['repeat', 'repeatEnd', 'guide', 'caution', 'source']),
]);

const EMPTY_KEYS: readonly PersonalWorkspacePocAuthoringPropertyKey[] = Object.freeze([]);
const EMPTY_GROUPS: readonly AuthoringChooserGroup[] = Object.freeze([]);

export function getAuthoringChooserGroup(key: string): AuthoringChooserGroup | null {
  return AUTHORING_CHOOSER_GROUPS.find(entry => entry.key === key) ?? null;
}
export function getAuthoringChooserPropertyGroup(key: string): AuthoringChooserGroup | null {
  return AUTHORING_CHOOSER_GROUPS.find(entry => entry.propertyKeys.some(property => property === key)) ?? null;
}

/** Fresh per opening, compared by reference. This is never a K1-A source ticket. */
export type AuthoringChooserSession = Readonly<{ kind: 'authoring-chooser-ui-session' }>;
type ChooserPosition =
  | Readonly<{ stage: 'structure' | 'groups' | 'closed'; group: null; property: null }>
  | Readonly<{ stage: 'properties'; group: AuthoringChooserGroupKey; property: null }>
  | Readonly<{ stage: 'value'; group: AuthoringChooserGroupKey; property: PersonalWorkspacePocAuthoringPropertyKey }>;

export type AuthoringChooserState<Owner extends object, Draft> = Readonly<{
  version: typeof AUTHORING_CHOOSER_VERSION;
  session: AuthoringChooserSession;
  /** Opaque coordinator owner, preserved by reference without reading/freezing it. */
  owner: Owner;
  entry: 'structure' | 'groups';
  /** Draft may include the coordinator's exact values and failure/stale message. */
  drafts: Readonly<Partial<Record<PersonalWorkspacePocAuthoringPropertyKey, Draft>>>;
}> & ChooserPosition;

type ChooserCommand<Draft> =
  | Readonly<{ type: 'show-groups' }>
  | Readonly<{ type: 'choose-group'; group: AuthoringChooserGroupKey }>
  | Readonly<{ type: 'choose-property'; key: PersonalWorkspacePocAuthoringPropertyKey; initialDraft?: Draft }>
  | Readonly<{ type: 'remember-value'; key: PersonalWorkspacePocAuthoringPropertyKey; draft: Draft }>
  | Readonly<{ type: 'back' }>
  | Readonly<{ type: 'close'; reason: 'cancel' | 'tab' | 'outside' | 'external' }>;
export type AuthoringChooserAction<Owner extends object, Draft> = Readonly<{
  session: AuthoringChooserSession;
  owner: Owner;
}> & ChooserCommand<Draft>;
export type AuthoringChooserFocus = 'none' | 'opener' | 'structure' | 'groups' | 'group' | 'property' | 'value';
export type AuthoringChooserResult<Owner extends object, Draft> = Readonly<{
  state: AuthoringChooserState<Owner, Draft>;
  changed: boolean;
  reason: 'changed' | 'same' | 'closed' | 'stale-session' | 'stale-owner' | 'navigation-locked' | 'invalid-transition';
  focus: AuthoringChooserFocus;
  focusKey?: AuthoringChooserGroupKey | PersonalWorkspacePocAuthoringPropertyKey;
}>;

export function createAuthoringChooser<Owner extends object, Draft = unknown>(input: Readonly<{
  owner: Owner;
  entry: 'structure' | 'groups';
}>): AuthoringChooserState<Owner, Draft> {
  if (!input.owner || typeof input.owner !== 'object' || !['structure', 'groups'].includes(input.entry)) {
    throw new TypeError('authoring-chooser-requires-owner-and-entry');
  }
  return Object.freeze({ version: AUTHORING_CHOOSER_VERSION,
    session: Object.freeze({ kind: 'authoring-chooser-ui-session' as const }),
    owner: input.owner, entry: input.entry, stage: input.entry, group: null, property: null,
    drafts: Object.freeze({}),
  });
}

/** Rendering data excludes opaque owner/draft fields and never guesses availability. */
export function selectAuthoringChooser<Owner extends object, Draft>(state: AuthoringChooserState<Owner, Draft>) {
  return Object.freeze({
    stage: state.stage,
    group: state.group,
    property: state.property,
    groups: state.stage === 'groups' ? AUTHORING_CHOOSER_GROUPS : EMPTY_GROUPS,
    propertyKeys: state.stage === 'properties' ? getAuthoringChooserGroup(state.group)!.propertyKeys : EMPTY_KEYS,
  });
}

/**
 * Back/group navigation never opens, validates, refreshes, or replaces an owner.
 * The adapter must retain the existing K1-A ticket and derive navigationLocked
 * from its applying/recovery state. Stale detection, IME, availability, existing
 * value selection, explicit reselect, submit/retry and storage remain there.
 * In particular, opening a value again must reuse drafts[key], not reacquire a
 * fresh source snapshot. An explicitly confirmed owner change needs a new UI
 * session; this module intentionally provides no retarget/copy-to-owner action.
 */
export function reduceAuthoringChooser<Owner extends object, Draft>(
  state: AuthoringChooserState<Owner, Draft>,
  action: AuthoringChooserAction<Owner, Draft>,
  options: Readonly<{ navigationLocked?: boolean }> = {},
): AuthoringChooserResult<Owner, Draft> {
  const unchanged = (reason: AuthoringChooserResult<Owner, Draft>['reason']): AuthoringChooserResult<Owner, Draft> =>
    Object.freeze({ state, changed: false, reason, focus: 'none' });
  const changed = (
    position: ChooserPosition,
    focus: AuthoringChooserFocus,
    focusKey?: AuthoringChooserResult<Owner, Draft>['focusKey'],
    drafts = state.drafts,
  ): AuthoringChooserResult<Owner, Draft> => Object.freeze({
    state: Object.freeze({ ...state, ...position, drafts }), changed: true, reason: 'changed', focus,
    ...(focusKey === undefined ? {} : { focusKey }),
  });

  if (state.stage === 'closed') return unchanged('closed');
  if (action.session !== state.session) return unchanged('stale-session');
  if (action.owner !== state.owner) return unchanged('stale-owner');
  if (options.navigationLocked) return unchanged('navigation-locked');

  switch (action.type) {
    case 'show-groups':
      if (state.stage === 'groups') return unchanged('same');
      if (state.stage !== 'structure') return unchanged('invalid-transition');
      return changed({ stage: 'groups', group: null, property: null }, 'groups');
    case 'choose-group':
      if (state.stage !== 'groups' || !getAuthoringChooserGroup(action.group)) return unchanged('invalid-transition');
      return changed({ stage: 'properties', group: action.group, property: null }, 'property');
    case 'choose-property': {
      if (state.stage !== 'properties' || getAuthoringChooserPropertyGroup(action.key)?.key !== state.group) return unchanged('invalid-transition');
      const hasDraft = Object.prototype.hasOwnProperty.call(state.drafts, action.key);
      const drafts = hasDraft || !Object.prototype.hasOwnProperty.call(action, 'initialDraft')
        ? state.drafts : Object.freeze({ ...state.drafts, [action.key]: action.initialDraft });
      return changed({ stage: 'value', group: state.group, property: action.key }, 'value', action.key, drafts);
    }
    case 'remember-value':
      if (state.stage !== 'value' || action.key !== state.property) return unchanged('invalid-transition');
      if (Object.prototype.hasOwnProperty.call(state.drafts, action.key) && state.drafts[action.key] === action.draft) return unchanged('same');
      return changed({ stage: 'value', group: state.group, property: state.property }, 'none', undefined,
        Object.freeze({ ...state.drafts, [action.key]: action.draft }));
    case 'back':
      if (state.stage === 'value') return changed({ stage: 'properties', group: state.group, property: null }, 'property', state.property);
      if (state.stage === 'properties') return changed({ stage: 'groups', group: null, property: null }, 'group', state.group);
      if (state.stage === 'groups' && state.entry === 'structure') return changed({ stage: 'structure', group: null, property: null }, 'structure');
      return changed({ stage: 'closed', group: null, property: null }, 'opener', undefined, Object.freeze({}));
    case 'close':
      if (!['cancel', 'tab', 'outside', 'external'].includes(action.reason)) return unchanged('invalid-transition');
      return changed({ stage: 'closed', group: null, property: null }, action.reason === 'cancel' ? 'opener' : 'none', undefined, Object.freeze({}));
    default:
      return unchanged('invalid-transition');
  }
}
