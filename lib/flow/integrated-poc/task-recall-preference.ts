/** Fresh devices enable recall; explicit OFF and unknown/unavailable storage stay closed. */
export const PROGRAM_TASK_RECALL_KEY = 'flowme:alpha:task-recall';
export const PROGRAM_TASK_RECALL_EVENT = 'flowme:alpha:task-recall-change';
export function programTaskRecallEnabled(storage: Pick<Storage, 'getItem'>): boolean {
  try { const value = storage.getItem(PROGRAM_TASK_RECALL_KEY); return value === null || value === 'on'; } catch { return false; }
}
export function saveProgramTaskRecallPreference(storage: Pick<Storage, 'setItem'>, enabled: boolean): boolean {
  try { storage.setItem(PROGRAM_TASK_RECALL_KEY, enabled ? 'on' : 'off'); return true; } catch { return false; }
}
