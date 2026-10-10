/** Read-only test supply. Existing catalog bytes are referenced, never copied or logged.
 * No real Auth/signing config is inherited by the test process. */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { isAbsolute, parse, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const mode = process.argv[2], settingsRoot = process.argv[3];
if (mode !== 'new-tests' || !settingsRoot || process.argv.length !== 4 || !isAbsolute(settingsRoot)
  || resolve(settingsRoot) === parse(resolve(settingsRoot)).root) throw Error('release-verify-arguments-rejected');
async function main() {
  let catalog: string;
  try {
    const source = JSON.parse(readFileSync(resolve(settingsRoot, '.tmp/alpha-laptop-host.json'), 'utf8'));
    catalog = source.FLOWME_ALPHA_CATALOG_PACK_FILE;
    if (typeof catalog !== 'string' || !isAbsolute(catalog) || catalog === parse(catalog).root || !existsSync(catalog)) throw Error();
  } catch { throw Error('release-verify-source-unavailable'); }
  const digest = () => createHash('sha256').update(readFileSync(catalog)).digest('hex');
  const before = digest(), osKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC']);
  const ambient = Object.fromEntries(Object.entries(process.env).filter(([key]) => osKeys.has(key.toUpperCase())));
  const child = spawn(process.execPath, ['scripts/personal-workspace-poc/program-verify.mjs', 'new-tests', '2'], {
    cwd: process.cwd(), env: { ...ambient, FLOWME_ALPHA_CATALOG_PACK_FILE: catalog, FLOWME_PRIVATE_VERIFICATION: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', bytes => { output += bytes.toString(); });
  // Do not expose raw test failures or an arbitrary subprocess error path.
  child.stderr.on('data', () => {});
  const code = await new Promise<number | null>(resolveCode => {
    child.once('error', () => resolveCode(null)); child.once('exit', resolveCode);
  });
  let summary: Record<string, unknown>;
  try { summary = JSON.parse(output); } catch { throw Error('release-verify-summary-unavailable'); }
  if (summary.schema !== 'flowme-verification-public/1') throw Error('release-verify-summary-invalid');
  const unchanged = before === digest();
  process.stdout.write(`${JSON.stringify({ ...summary, catalogBytesUnchanged: unchanged, catalogSha256: before,
    realAccountCredentialsForwarded: false, settingsCopied: false }, null, 2)}\n`);
  process.exitCode = code === 0 && unchanged ? 0 : 1;
}
main().catch(() => { process.stderr.write('release-verify-failed\n'); process.exitCode = 1; });
