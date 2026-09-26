import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectPrivateCatalogClientImports } from './check-private-catalog-imports.mjs';

test('client import gate follows static and dynamic imports to frozen source', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-catalog-client-gate-'));
  try {
    const app = join(root, 'app'), components = join(root, 'components'), privateDir = join(root, 'lib/flow/integrated-poc');
    mkdirSync(app); mkdirSync(components); mkdirSync(privateDir, { recursive: true });
    writeFileSync(join(root, 'tsconfig.next.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./*'] }, resolveJsonModule: true } }));
    writeFileSync(join(app, 'page.tsx'), "'use client'; import { x } from '@/components/view'; export default function Page(){ return x; }");
    writeFileSync(join(components, 'view.ts'), "export const x = import('../lib/flow/integrated-poc/catalog-library-source');");
    writeFileSync(join(privateDir, 'catalog-library-source.ts'), 'export const secret = 1;');
    const result = inspectPrivateCatalogClientImports(root);
    assert.equal(result.clientRoots, 1);
    assert.equal(result.sourceFiles, 3);
    assert.equal(result.forbiddenPaths.length, 1);
    assert.equal(result.forbiddenPaths[0].at(-1), 'lib/flow/integrated-poc/catalog-library-source.ts');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('client import gate follows reexports and require without relying on Windows separators', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-catalog-client-gate-'));
  try {
    const app = join(root, 'app'), components = join(root, 'components'), privateDir = join(root, 'lib/flow/integrated-poc');
    mkdirSync(app); mkdirSync(components); mkdirSync(privateDir, { recursive: true });
    writeFileSync(join(root, 'tsconfig.next.json'), JSON.stringify({ compilerOptions: { allowJs: true, baseUrl: '.', paths: { '@/*': ['./*'] } } }));
    writeFileSync(join(app, 'page.tsx'), "'use client'; export { x } from '@/components/view';");
    writeFileSync(join(components, 'view.ts'), "export const x = require('../lib/flow/integrated-poc/catalog-content-source');");
    writeFileSync(join(privateDir, 'catalog-content-source.ts'), 'export const x = 1;');
    const result = inspectPrivateCatalogClientImports(root);
    assert.equal(result.sourceFiles, 3);
    assert.deepEqual(result.forbiddenPaths, [['app/page.tsx', 'components/view.ts', 'lib/flow/integrated-poc/catalog-content-source.ts']]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
