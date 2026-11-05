import { programDate } from './program-data';
import { programDaysBetween } from './date-label';

/** N11a 결정 2: the day this device last opened the space. Opened again three days or more later, the first screen is
 *  오늘 and the 밀린 일 card says since when (that whole day, also after a reload). Only this device keeps it. */
export const PROGRAM_OPENED_KEY = 'flow:alpha:opened:v1';
export const PROGRAM_RETURN_DAYS = 3;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function programOpening(storage: Storage | null, today: string): { first: boolean; since: string | null } {
  if (!programDate(today)) return { first: false, since: null };
  let stored: { last?: unknown; since?: unknown } = {};
  try { const value = JSON.parse(storage?.getItem(PROGRAM_OPENED_KEY) ?? '{}'); if (value && typeof value === 'object') stored = value; } catch { /* a new start */ }
  const last = typeof stored.last === 'string' && programDate(stored.last) ? stored.last : null;
  if (last === today) return { first: false, since: typeof stored.since === 'string' && programDate(stored.since) ? stored.since : null };
  const since = last && last < today && programDaysBetween(last, today) >= PROGRAM_RETURN_DAYS ? last : null;
  try { storage?.setItem(PROGRAM_OPENED_KEY, JSON.stringify({ last: today, since })); } catch { /* this visit only */ }
  return { first: since !== null, since };
}
