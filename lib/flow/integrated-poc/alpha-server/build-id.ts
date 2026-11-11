import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** W-VER-01 (11/11): this server's build, Next's `.next/BUILD_ID` under the folder it runs in, read once per process
 *  (a deploy starts a new process). '' when it cannot be read (a dev server): then nothing is compared or shown. */
let cached: string | null = null;
export function readAlphaBuildId(root: string = process.cwd()): string {
  if (cached !== null) return cached;
  let value = '';
  try { value = readFileSync(join(root, '.next', 'BUILD_ID'), 'utf8').trim(); } catch { value = ''; }
  cached = /^[\w-]{1,64}$/.test(value) ? value : '';
  return cached;
}
/** Tests only: read the file again next time. */
export function forgetAlphaBuildId(): void { cached = null; }
