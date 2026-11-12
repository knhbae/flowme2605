/** UX review 11/12 P1 (복구함): discarding kept input ([보관 입력 버리기] and the three like it) asked nothing and could not
 *  be taken back. Now a discard reads the store's record first and keeps its entries for a short while; [되돌리기] saves
 *  them back through the store itself (the stores write canonical bytes, so the record comes back byte for byte). Only
 *  while the store is still empty: input kept since is never overwritten (그 뒤 바뀜). The stores and their formats are
 *  unchanged. */
type Result = { ok: true } | { ok: false };
export type ProgramRecoveryPort<Value, Entry> = { read(): ({ ok: true; value: Value | null }) | ({ ok: false }); save(entries: Entry[]): Result; clear(): Result };

/** Reads the record, then runs the store's discard (`clear`, with its screen state). `read`: it could not be read, so
 *  nothing was discarded; `clear`: the store refused. */
export function discardProgramRecovery<Value, Entry>(port: ProgramRecoveryPort<Value, Entry>, entriesOf: (value: Value) => readonly Entry[], clear: () => boolean):
  { ok: true; kept: Entry[] } | { ok: false; reason: 'read' | 'clear' } {
  const was = port.read();
  if (!was.ok) return { ok: false, reason: 'read' };
  const kept = was.value ? [...entriesOf(was.value)] : [];
  if (!clear()) return { ok: false, reason: 'clear' };
  return { ok: true, kept };
}

/** [되돌리기]: `changed` when the store holds something again (kept since); `failed` when it cannot be read or saved. */
export function restoreProgramRecovery<Value, Entry>(port: ProgramRecoveryPort<Value, Entry>, entriesOf: (value: Value) => readonly Entry[], kept: readonly Entry[]): 'restored' | 'changed' | 'failed' {
  if (!kept.length) return 'failed';
  const now = port.read();
  if (!now.ok) return 'failed';
  if (now.value && entriesOf(now.value).length) return 'changed';
  return port.save([...kept]).ok ? 'restored' : 'failed';
}
