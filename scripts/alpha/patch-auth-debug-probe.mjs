// Compatibility patch for the pinned SDK only. Auth/crypto/session/lock logic is untouched.
// auth-js 2.116.0 reads a legacy lock-debug flag at import time by probing global
// localStorage, even with custom storage. That violates FlowMe's PoC-only writes.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const replacement = 'false /* FlowMe: disable deprecated global-storage debug probe only. */';
const pattern = /!!\(globalThis &&\s*(?:supportsLocalStorage\(\)|\(0, helpers_1.supportsLocalStorage\)\(\)) &&\s*globalThis.localStorage &&\s*globalThis.localStorage.getItem\('supabase.gotrue-js.locks.debug'\) === 'true'\)/g;
export function patchAuthDebugProbe(source) {
  if (source.includes(replacement)) return source;
  if ([...source.matchAll(pattern)].length !== 1) throw Error('Unsupported auth-js debug probe; review the pinned SDK before updating.');
  return source.replace(pattern, replacement);
}
export function applyAuthDebugProbePatch(root = process.cwd()) {
  const base = resolve(root, 'node_modules/@supabase/auth-js');
  if (JSON.parse(readFileSync(resolve(base, 'package.json'), 'utf8')).version !== '2.116.0') throw Error('Auth SDK version changed; review FlowMe storage-boundary compatibility patch.');
  // Validate all artifacts before changing any artifact. Generated dependency rewrite only.
  const files = ['dist/module/lib/locks.js', 'dist/main/lib/locks.js'].map(path => {
    const file = resolve(base, path), original = readFileSync(file, 'utf8');
    return { file, original, patched: patchAuthDebugProbe(original) };
  });
  for (const file of files) if (file.original !== file.patched) writeFileSync(file.file, file.patched);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  applyAuthDebugProbePatch(); console.log('FlowMe: pinned auth-js legacy debug probe disabled; custom PoC storage retained.');
}
