export function isP35PublicSaveLifecycleEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('saveLifecycle') !== 'off';
}

export function isP35EditorTransactionEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('editorTransaction') !== 'off';
}

export function isP35CapabilityResultEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('capabilityResult') !== 'off';
}

export function isP35QuickLocalResultEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('quickLocalResult') !== 'off';
}

export function isP35SavedTransferEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('savedTransfer') !== 'off';
}

export function isP35SavedPlanLibraryEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('savedPlanLibrary') !== 'off';
}

export function isP35VisualSubtractionEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('visualSubtraction') !== 'off';
}

export function isP35Q3CopyEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('q3Copy') !== 'off';
}
