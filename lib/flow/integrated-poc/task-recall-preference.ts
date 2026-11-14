/** Device preference: absence/unknown/unavailable storage never mounts recall. */
export const PROGRAM_TASK_RECALL_KEY = 'flowme:alpha:task-recall';
export const PROGRAM_TASK_RECALL_EVENT = 'flowme:alpha:task-recall-change';
export function programTaskRecallEnabled(storage: Pick<Storage, 'getItem'>): boolean {
  try { return storage.getItem(PROGRAM_TASK_RECALL_KEY) === 'on'; } catch { return false; }
}
export function saveProgramTaskRecallPreference(storage: Pick<Storage, 'setItem'>, enabled: boolean): boolean {
  try { storage.setItem(PROGRAM_TASK_RECALL_KEY, enabled ? 'on' : 'off'); return true; } catch { return false; }
}
