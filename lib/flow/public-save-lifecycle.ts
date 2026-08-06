declare const sourceKeyBrand: unique symbol;
declare const personalCopyKeyBrand: unique symbol;
declare const idempotencyKeyBrand: unique symbol;
declare const draftTokenBrand: unique symbol;

export type SourceKey = string & { readonly [sourceKeyBrand]: true };
export type PersonalCopyKey = string & { readonly [personalCopyKeyBrand]: true };
export type IdempotencyKey = string & { readonly [idempotencyKeyBrand]: true };
export type DraftToken = string & { readonly [draftTokenBrand]: true };

function stableKey<T extends string>(value: string, label: string): T {
  if (!value.trim()) {
    throw new TypeError(`${label} must not be empty`);
  }
  return value as T;
}

export function createSourceKey(value: string): SourceKey {
  return stableKey<SourceKey>(value, 'sourceKey');
}

export function createPersonalCopyKey(value: string): PersonalCopyKey {
  return stableKey<PersonalCopyKey>(value, 'personalCopyKey');
}

export function createIdempotencyKey(value: string): IdempotencyKey {
  return stableKey<IdempotencyKey>(value, 'idempotencyKey');
}

export function createDraftToken(value: string): DraftToken {
  return stableKey<DraftToken>(value, 'draftToken');
}

export type SaveIntent = Readonly<{
  sourceKey: SourceKey;
  /** A caller-reserved identity used only when this request creates a copy. */
  personalCopyKey: PersonalCopyKey;
  idempotencyKey: IdempotencyKey;
  draftToken: DraftToken;
}>;

export type ExistingPersonalCopy = Readonly<{
  sourceKey: SourceKey;
  personalCopyKey: PersonalCopyKey;
}>;

export type PublicSaveChoice =
  | Readonly<{
      kind: 'create';
      personalCopyKey: PersonalCopyKey;
    }>
  | Readonly<{
      kind: 'overwrite';
      personalCopyKey: PersonalCopyKey;
    }>
  | Readonly<{
      kind: 'copy';
      personalCopyKey: PersonalCopyKey;
    }>;

export type PublicSaveFailure = Readonly<{
  code: string;
  message: string;
}>;

export type PublicSaveEditingState = Readonly<{
  status: 'editing';
  draftToken: DraftToken;
}>;

export type PublicSaveChoiceRequiredState = Readonly<{
  status: 'choice_required';
  draftToken: DraftToken;
  intent: SaveIntent;
  existingCopies: readonly ExistingPersonalCopy[];
}>;

export type PublicSaveSavingState = Readonly<{
  status: 'saving';
  draftToken: DraftToken;
  intent: SaveIntent;
  choice: PublicSaveChoice;
  attempt: number;
}>;

export type PublicSaveRecoverableErrorState = Readonly<{
  status: 'recoverable_error';
  draftToken: DraftToken;
  intent: SaveIntent;
  choice: PublicSaveChoice;
  attempt: number;
  error: PublicSaveFailure;
}>;

export type PublicSaveRecoveryRequiredState = Readonly<{
  status: 'recovery_required';
  draftToken: DraftToken;
  intent: SaveIntent;
  choice: PublicSaveChoice;
  attempt: number;
  error: PublicSaveFailure;
}>;

export type PublicSaveSavedState = Readonly<{
  status: 'saved';
  draftToken: DraftToken;
  intent: SaveIntent;
  choice: PublicSaveChoice;
  attempt: number;
}>;

export type PublicSaveLifecycleState =
  | PublicSaveEditingState
  | PublicSaveChoiceRequiredState
  | PublicSaveSavingState
  | PublicSaveRecoverableErrorState
  | PublicSaveRecoveryRequiredState
  | PublicSaveSavedState;

export type PublicSaveLifecycleEvent =
  | Readonly<{
      type: 'request';
      intent: SaveIntent;
      existingCopies: readonly ExistingPersonalCopy[];
    }>
  | Readonly<{
      type: 'choose_overwrite';
      personalCopyKey: PersonalCopyKey;
    }>
  | Readonly<{
      type: 'choose_copy';
    }>
  | Readonly<{
      type: 'cancel';
    }>
  | Readonly<{
      type: 'succeed';
    }>
  | Readonly<{
      type: 'fail';
      error: PublicSaveFailure;
    }>
  | Readonly<{
      type: 'retry';
    }>
  | Readonly<{
      type: 'recovery_succeeded';
      error: PublicSaveFailure;
    }>
  | Readonly<{
      type: 'recovery_failed';
      error: PublicSaveFailure;
    }>;

export function createPublicSaveLifecycleState(
  draftToken: DraftToken,
): PublicSaveEditingState {
  return {
    status: 'editing',
    draftToken,
  };
}

function copiesForSource(
  sourceKey: SourceKey,
  copies: readonly ExistingPersonalCopy[],
): ExistingPersonalCopy[] {
  const seen = new Set<PersonalCopyKey>();
  const result: ExistingPersonalCopy[] = [];

  for (const copy of copies) {
    if (copy.sourceKey !== sourceKey || seen.has(copy.personalCopyKey)) continue;
    seen.add(copy.personalCopyKey);
    result.push(copy);
  }

  return result;
}

function toSaving(
  state: PublicSaveChoiceRequiredState | PublicSaveRecoverableErrorState,
  choice: PublicSaveChoice,
  attempt: number,
): PublicSaveSavingState {
  return {
    status: 'saving',
    draftToken: state.draftToken,
    intent: state.intent,
    choice,
    attempt,
  };
}

export function reducePublicSaveLifecycle(
  state: PublicSaveLifecycleState,
  event: PublicSaveLifecycleEvent,
): PublicSaveLifecycleState {
  switch (event.type) {
    case 'request': {
      if (state.status !== 'editing' || event.intent.draftToken !== state.draftToken) {
        return state;
      }

      const existingCopies = copiesForSource(event.intent.sourceKey, event.existingCopies);
      if (existingCopies.length > 0) {
        return {
          status: 'choice_required',
          draftToken: state.draftToken,
          intent: event.intent,
          existingCopies,
        };
      }

      return {
        status: 'saving',
        draftToken: state.draftToken,
        intent: event.intent,
        choice: {
          kind: 'create',
          personalCopyKey: event.intent.personalCopyKey,
        },
        attempt: 1,
      };
    }

    case 'choose_overwrite': {
      if (state.status !== 'choice_required') return state;
      const selectedCopy = state.existingCopies.find(
        (copy) => copy.personalCopyKey === event.personalCopyKey,
      );
      if (!selectedCopy) return state;

      return toSaving(state, {
        kind: 'overwrite',
        personalCopyKey: selectedCopy.personalCopyKey,
      }, 1);
    }

    case 'choose_copy': {
      if (state.status !== 'choice_required') return state;
      const identityAlreadyExists = state.existingCopies.some(
        (copy) => copy.personalCopyKey === state.intent.personalCopyKey,
      );
      if (identityAlreadyExists) return state;

      return toSaving(state, {
        kind: 'copy',
        personalCopyKey: state.intent.personalCopyKey,
      }, 1);
    }

    case 'cancel': {
      if (state.status !== 'choice_required' && state.status !== 'recoverable_error') {
        return state;
      }
      return createPublicSaveLifecycleState(state.draftToken);
    }

    case 'succeed': {
      if (state.status !== 'saving') return state;
      return {
        status: 'saved',
        draftToken: state.draftToken,
        intent: state.intent,
        choice: state.choice,
        attempt: state.attempt,
      };
    }

    case 'fail': {
      if (state.status !== 'saving') return state;
      return {
        status: event.error.code === 'rollback_incomplete'
          ? 'recovery_required'
          : 'recoverable_error',
        draftToken: state.draftToken,
        intent: state.intent,
        choice: state.choice,
        attempt: state.attempt,
        error: event.error,
      };
    }

    case 'retry': {
      if (state.status !== 'recoverable_error') return state;
      return toSaving(state, state.choice, state.attempt + 1);
    }

    case 'recovery_succeeded': {
      if (state.status !== 'recovery_required') return state;
      return {
        ...state,
        status: 'recoverable_error',
        error: event.error,
      };
    }

    case 'recovery_failed': {
      if (state.status !== 'recovery_required') return state;
      return {
        ...state,
        error: event.error,
      };
    }
  }
}
