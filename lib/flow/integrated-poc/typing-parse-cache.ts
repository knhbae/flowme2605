import { textWorkspaceModel } from './text-workspace';

/**
 * typelag (나) (11/11): the switch for the model's document parse cache (vendor text-model: a document's parse is kept
 * while everything the parser reads for it stays the same, so an Enter or a key in one document parses only that one).
 * On by default in the browser window. Off on one device with localStorage 'flowme:alpha:parse-cache' = 'off', or here
 * (PROGRAM_PARSE_CACHE.enabled): every read parses again as before. The server and the save worker never use it.
 */
export const PROGRAM_PARSE_CACHE = { enabled: true };
export const PROGRAM_PARSE_CACHE_KEY = 'flowme:alpha:parse-cache';

export function programParseCacheEnabled(storage?: Pick<Storage, 'getItem'> | null): boolean {
  if (!PROGRAM_PARSE_CACHE.enabled) return false;
  try {
    const store = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage;
    return store?.getItem(PROGRAM_PARSE_CACHE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Sets the model's cache from the switch, in a browser window only; returns whether it is on. */
export function applyProgramParseCache(storage?: Pick<Storage, 'getItem'> | null): boolean {
  const on = typeof window !== 'undefined' && programParseCacheEnabled(storage);
  return textWorkspaceModel.parseCache(on).on;
}
