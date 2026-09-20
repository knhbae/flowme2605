import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

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
    'components/flow/personal-workspace-poc/PersonalWorkspacePocRoute.tsx',
    'components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx',
  ].sort();
}
