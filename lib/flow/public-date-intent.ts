export type PublicDateIntentMode = 'custom' | 'undated' | 'example';

export type PersistedPublicDateIntentMode = Exclude<PublicDateIntentMode, 'example'>;

export type PublicDateIntentPreviewScheduleState =
  | 'not_applicable'
  | 'provisional'
  | 'committed'
  | 'missing'
  | 'undated';

export type PublicDateIntentPrimaryAction =
  | {
      kind: 'focus_date';
      canCommit: false;
    }
  | {
      kind: 'save_custom';
      canCommit: true;
      persistedMode: 'custom';
    }
  | {
      kind: 'save_undated';
      canCommit: true;
      persistedMode: 'undated';
    };

export type PublicDateIntentResolution = {
  mode: PublicDateIntentMode;
  persistedMode: PersistedPublicDateIntentMode;
  previewAnchor: string;
  savedAnchor?: string;
  previewScheduleState: PublicDateIntentPreviewScheduleState;
  primaryAction: PublicDateIntentPrimaryAction;
  allowExplicitUndatedSave: boolean;
  canSave: boolean;
  calendarEligible: boolean;
  previewOnly: boolean;
};

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPublicAnchorDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizePublicDateIntentMode(value: unknown): PublicDateIntentMode {
  if (value === 'custom' || value === 'example') return value;
  if (value === 'undated' || value === 'undecided') return 'undated';
  return 'example';
}

export function resolvePublicDateIntent({
  anchorType,
  mode,
  customAnchor,
  exampleAnchor,
}: {
  anchorType: string;
  mode: PublicDateIntentMode;
  customAnchor: string;
  exampleAnchor: string;
}): PublicDateIntentResolution {
  if (anchorType === 'none') {
    return {
      mode: 'undated',
      persistedMode: 'undated',
      previewAnchor: '',
      previewScheduleState: 'not_applicable',
      primaryAction: {
        kind: 'save_undated',
        canCommit: true,
        persistedMode: 'undated',
      },
      allowExplicitUndatedSave: false,
      canSave: true,
      calendarEligible: false,
      previewOnly: false,
    };
  }

  if (mode === 'custom') {
    const validAnchor = isValidPublicAnchorDate(customAnchor) ? customAnchor : '';
    return {
      mode,
      persistedMode: validAnchor ? 'custom' : 'undated',
      previewAnchor: validAnchor,
      ...(validAnchor ? { savedAnchor: validAnchor } : {}),
      previewScheduleState: validAnchor ? 'committed' : 'missing',
      primaryAction: validAnchor
        ? {
            kind: 'save_custom',
            canCommit: true,
            persistedMode: 'custom',
          }
        : {
            kind: 'focus_date',
            canCommit: false,
          },
      allowExplicitUndatedSave: true,
      canSave: Boolean(validAnchor),
      calendarEligible: Boolean(validAnchor),
      previewOnly: false,
    };
  }

  if (mode === 'undated') {
    return {
      mode,
      persistedMode: 'undated',
      previewAnchor: '',
      previewScheduleState: 'undated',
      primaryAction: {
        kind: 'save_undated',
        canCommit: true,
        persistedMode: 'undated',
      },
      allowExplicitUndatedSave: false,
      canSave: true,
      calendarEligible: false,
      previewOnly: false,
    };
  }

  return {
    mode,
    persistedMode: 'undated',
    previewAnchor: isValidPublicAnchorDate(exampleAnchor) ? exampleAnchor : '',
    previewScheduleState: 'provisional',
    primaryAction: {
      kind: 'focus_date',
      canCommit: false,
    },
    allowExplicitUndatedSave: true,
    canSave: false,
    calendarEligible: false,
    previewOnly: true,
  };
}

export function shouldPersistPublicDateIntent(mode: PublicDateIntentMode): boolean {
  return mode !== 'example';
}
