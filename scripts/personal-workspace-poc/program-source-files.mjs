import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// TypeScript normalizes Windows file names to '/', while path.resolve may not.
// Historical app copies under output are evidence, not current entry points.
export function isProgramTypecheckEntry(root, file) {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/$/, '');
  const normalizedFile = file.replaceAll('\\', '/');
  if (!normalizedFile.startsWith(`${normalizedRoot}/`)) return false;
  const relative = normalizedFile.slice(normalizedRoot.length + 1);
  return /^(?:lib|components)\/flow\/integrated-poc\/.+\.tsx?$/.test(relative);
}

// Keep verification reproducible with Node alone; rg is an agent convenience,
// not a declared dependency of a clean checkout or the CI runner.
export function listProgramSourcePaths(root) {
  const visit = directory => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return visit(relative);
    if (entry.isFile()) return [relative];
    throw new Error(`Unsupported Program source entry: ${relative}`);
  });
  return [
    ...visit('lib/flow/integrated-poc'),
    ...visit('components/flow/integrated-poc'),
    ...(existsSync(resolve(root, 'components/flow/integrated-poc/AlphaWorkspace.tsx'))
      ? ['app/alpha', 'app/auth', 'app/api/alpha', 'supabase/migrations'].flatMap(visit) : []),
    'components/flow/personal-workspace-poc/PersonalWorkspacePocRoute.tsx',
    'components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx',
  ].sort();
}
