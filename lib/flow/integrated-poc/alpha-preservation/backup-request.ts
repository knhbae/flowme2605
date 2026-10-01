/** Legacy backup only. Restore/import keep their existing request and recovery contract. */
export const LEGACY_BACKUP_REQUEST = Object.freeze({ clientMs: 180_000, serverMs: 120_000, slowMs: 10_000,
  // A bounded 30 MB file may double when carried as an escaped JSON string.
  responseBytes: 60_000_256 });

export function createBackupRequestBudget(milliseconds: number, parent?: AbortSignal) {
  const controller = new AbortController(), deadline = Date.now() + milliseconds;
  const cancel = () => controller.abort(Error('backup-cancelled'));
  const expire = () => controller.abort(Error('backup-timeout'));
  const timer = setTimeout(expire, milliseconds);
  if (parent?.aborted) cancel(); else parent?.addEventListener('abort', cancel, { once: true });
  const check = () => { if (Date.now() >= deadline && !controller.signal.aborted) expire(); controller.signal.throwIfAborted(); };
  async function run<T>(work: () => Promise<T>): Promise<T> {
    check();
    let abort: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      abort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', abort, { once: true });
    });
    try { const value = await Promise.race([Promise.resolve().then(() => { check(); return work(); }), interrupted]); check(); return value; }
    finally { controller.signal.removeEventListener('abort', abort); }
  }
  return { signal: controller.signal, check, run, cancel,
    dispose: () => { clearTimeout(timer); parent?.removeEventListener('abort', cancel); } };
}

/** Bounds the bytes actually received and interrupts stalled bodies as well as fetch. */
export async function readBackupResponse(response: Response, signal: AbortSignal, maximum: number = LEGACY_BACKUP_REQUEST.responseBytes,
  parse: (raw: string) => unknown = JSON.parse): Promise<unknown> {
  signal.throwIfAborted();
  const reader = response.body?.getReader(); if (!reader) throw Error('backup-response-invalid');
  const chunks: Uint8Array[] = []; let length = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const next = await reader.read(); signal.throwIfAborted(); if (next.done) break;
      length += next.value.byteLength;
      if (length > maximum) { cancel(); throw Error('backup-response-limit'); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw Error('backup-response-invalid'); }
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
