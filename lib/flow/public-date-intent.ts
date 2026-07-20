export type PublicDateIntentMode = 'custom' | 'undated' | 'example';

export type PersistedPublicDateIntentMode = Exclude<PublicDateIntentMode, 'example'>;

export type PublicDateIntentResolution = {
  mode: PublicDateIntentMode;
  persistedMode: PersistedPublicDateIntentMode;
  previewAnchor: string;
  savedAnchor?: string;
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
      canSave: true,
      calendarEligible: false,
      previewOnly: false,
    };
  }

  return {
    mode,
    persistedMode: 'undated',
    previewAnchor: isValidPublicAnchorDate(exampleAnchor) ? exampleAnchor : '',
    canSave: true,
    calendarEligible: false,
    previewOnly: true,
  };
}

export function shouldPersistPublicDateIntent(mode: PublicDateIntentMode): boolean {
  return mode !== 'example';
}
