export const FLOW_STORAGE_WRITE_LOCK = 'flowme:storage:all-user-data:v1';
export const FLOW_USER_DATA_WRITE_LOCK = FLOW_STORAGE_WRITE_LOCK;
export const FLOW_EXPORT_RECEIPT_WRITE_LOCK = FLOW_STORAGE_WRITE_LOCK;
/** @deprecated Use FLOW_USER_DATA_WRITE_LOCK for every overlapping Flow write. */
export const FLOW_MAP_SAVE_WRITE_LOCK = FLOW_USER_DATA_WRITE_LOCK;

export type StorageWriteLockManager = Readonly<{
  request<T>(
    name: string,
    options: Readonly<{ mode: 'exclusive' }>,
    callback: () => T | Promise<T>,
  ): Promise<T>;
}>;

export type StorageWriteLockResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      reason: 'unavailable' | 'lock_failed' | 'operation_failed';
      error?: unknown;
    }>;

const inProcessTails = new Map<string, Promise<void>>();

async function withInProcessLock<T>(
  name: string,
  operation: () => T | Promise<T>,
): Promise<StorageWriteLockResult<T>> {
  const previous = inProcessTails.get(name) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const tail = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  const queuedTail = previous.then(() => tail);
  inProcessTails.set(name, queuedTail);
  await previous;
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, reason: 'operation_failed', error };
  } finally {
    release();
    if (inProcessTails.get(name) === queuedTail) inProcessTails.delete(name);
  }
}

function getBrowserLockManager(): StorageWriteLockManager | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const locks = navigator.locks as unknown as StorageWriteLockManager | undefined;
  return locks && typeof locks.request === 'function' ? locks : undefined;
}

/**
 * Serializes a storage read/modify/write sequence across same-origin tabs.
 * Browser callers fail closed when Web Locks are unavailable. Node-only callers
 * use a process-local queue so contract tests retain the same ordering rule.
 */
export async function withStorageWriteLock<T>(
  name: string,
  operation: () => T | Promise<T>,
  lockManager: StorageWriteLockManager | undefined = getBrowserLockManager(),
): Promise<StorageWriteLockResult<T>> {
  if (!name.trim()) {
    return { ok: false, reason: 'lock_failed', error: new TypeError('Storage lock name is required.') };
  }
  if (!lockManager) {
    if (typeof window === 'undefined') return withInProcessLock(name, operation);
    return { ok: false, reason: 'unavailable' };
  }

  let operationStarted = false;
  try {
    const value = await lockManager.request(name, { mode: 'exclusive' }, async () => {
      operationStarted = true;
      return operation();
    });
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      reason: operationStarted ? 'operation_failed' : 'lock_failed',
      error,
    };
  }
}

export function getFlowMapSaveWriteLockName(mapId: string): string {
  if (!mapId.trim()) throw new TypeError('Flow Map ID is required for its storage lock.');
  // Map saves overlap normal Plan writes through saved records, Item state,
  // Map snapshots, and the shared canonical-origin registry. Every mutation
  // of those keys must therefore participate in one same-origin lock.
  return FLOW_USER_DATA_WRITE_LOCK;
}

export function withFlowUserDataWriteLock<T>(
  operation: () => T | Promise<T>,
  lockManager?: StorageWriteLockManager,
): Promise<StorageWriteLockResult<T>> {
  return withStorageWriteLock(FLOW_USER_DATA_WRITE_LOCK, operation, lockManager);
}
