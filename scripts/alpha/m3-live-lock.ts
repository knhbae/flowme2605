import { open, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
/** The two explicit live runners share test accounts; never run them concurrently. */
export async function acquireM3LiveLock() {
  const path = '.tmp/alpha-m3-live.lock', id = randomUUID();
  const file = await open(path, 'wx');
  await file.writeFile(id); await file.close();
  return async () => { if (await readFile(path, 'utf8') !== id) throw Error('live-lock-owner-changed'); await unlink(path); };
}
