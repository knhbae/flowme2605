import { spawn } from 'node:child_process';
import { readFileSync, realpathSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { buildCatalogLibrarySnapshot } from '../../lib/flow/integrated-poc/catalog-library-source';
import { CLOUDFLARE_RELEASE, releaseArguments, releaseEnvironment } from './cloudflare-release-contract';

const candidateRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function localJson(path: string): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { throw Error('release-settings-unavailable'); }
}
async function freePort(port: number): Promise<boolean> {
  return new Promise(resolveResult => {
    const probe = createServer();
    probe.once('error', () => resolveResult(false));
    probe.listen(port, CLOUDFLARE_RELEASE.bind, () => probe.close(() => resolveResult(true)));
  });
}
async function main() {
  const args = releaseArguments(process.argv.slice(2));
  if (!args || realpathSync(process.cwd()) !== realpathSync(candidateRoot)) throw Error('release-arguments-rejected');
  const settings = localJson(resolve(args.settingsRoot, '.tmp/alpha-laptop-host.json'));
  const keyObject = localJson(resolve(args.settingsRoot, '.tmp/alpha-m3-server.json'));
  const signing = keyObject && typeof keyObject === 'object' && Object.hasOwn(keyObject, 'FLOWME_ALPHA_M3_SIGNING_KEY')
    ? (keyObject as Record<string, unknown>).FLOWME_ALPHA_M3_SIGNING_KEY : null;
  const env = releaseEnvironment(settings, signing, process.env);
  if (!env || !existsSync(resolve(candidateRoot, 'node_modules/next/dist/bin/next'))) throw Error('release-preflight-rejected');
  const buildId = readFileSync(resolve(candidateRoot, '.next/BUILD_ID'), 'utf8').trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(buildId)) throw Error('release-build-rejected');
  const oldCatalog = process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
  try {
    process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = env.FLOWME_ALPHA_CATALOG_PACK_FILE;
    buildCatalogLibrarySnapshot(new Date().toISOString());
  } catch { throw Error('release-catalog-rejected'); }
  finally {
    if (oldCatalog === undefined) delete process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
    else process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = oldCatalog;
  }
  const summary = { origin: CLOUDFLARE_RELEASE.origin, bind: `${CLOUDFLARE_RELEASE.bind}:${args.port}`,
    buildId, backupJobs: CLOUDFLARE_RELEASE.backupJobs };
  if (args.check) { process.stdout.write(`${JSON.stringify({ ...summary, preflight: 'passed' })}\n`); return; }
  if (!await freePort(args.port)) throw Error('release-port-occupied');
  const child = spawn(process.execPath, [resolve(candidateRoot, 'node_modules/next/dist/bin/next'), 'start',
    '-H', CLOUDFLARE_RELEASE.bind, '-p', String(args.port)], { cwd: candidateRoot, env, stdio: 'inherit', windowsHide: true });
  process.stdout.write(`${JSON.stringify({ ...summary, launcherPid: process.pid, childPid: child.pid, starting: true })}\n`);
  child.once('error', () => { process.stderr.write('release-child-unavailable\n'); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code ?? 1; });
  process.once('SIGINT', () => child.kill('SIGINT'));
  process.once('SIGTERM', () => child.kill('SIGTERM'));
}
main().catch(() => { process.stderr.write('release-preflight-or-start-failed\n'); process.exitCode = 1; });
