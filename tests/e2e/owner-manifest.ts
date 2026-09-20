import { readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const historicalSurfaceSpecs = [
  'personal-workspace-poc.spec.ts',
  'personal-workspace-integration-poc.spec.ts',
  'personal-workspace-authoring-workspace-parity.spec.ts',
  'personal-workspace-stage-1-runtime.spec.ts',
  'personal-workspace-stage-2-runtime.spec.ts',
  'personal-workspace-stage-3-runtime.spec.ts',
  'personal-workspace-stage-4-runtime.spec.ts',
] as const;
const artifactSpecs = [
  'personal-workspace-a0-decision-packet.spec.ts',
  'personal-workspace-authoring-parity-report.spec.ts',
  'personal-workspace-gap-closure-plan.spec.ts',
  'personal-workspace-integrated-gap-closure-report.spec.ts',
  'personal-workspace-integrated-validation-report.spec.ts',
  'personal-workspace-p1-functional-gap-closure-report.spec.ts',
  'personal-workspace-p2a-lossless-result-validation-report.spec.ts',
  'personal-workspace-p2b-occurrence-txt-validation-report.spec.ts',
  'personal-workspace-p2c-personal-editing-validation-report.spec.ts',
  'personal-workspace-product-ux-report.spec.ts',
  'personal-workspace-requirements-traceability.spec.ts',
  'personal-workspace-stage-1-contract.spec.ts',
];
const standaloneSpecs = ['personal-workspace-integrated-standalone.spec.ts', 'personal-workspace-standalone-demo.spec.ts'];
export type BrowserOwner = 'operating' | 'program' | 'historical-surface' | 'historical-artifact' | 'historical-standalone';

export function browserOwnership(root = process.cwd()) {
  const directory = path.join(root, 'tests/e2e');
  const files = readdirSync(directory, { recursive: true }).map(String)
    .map(file => file.replaceAll('\\', '/')).filter(file => file.endsWith('.spec.ts')).sort();
  const groups: Record<BrowserOwner, string[]> = { operating: [], program: [], 'historical-surface': [], 'historical-artifact': [], 'historical-standalone': [] };
  for (const file of files) {
    const owners: BrowserOwner[] = [];
    if ((historicalSurfaceSpecs as readonly string[]).includes(file)) owners.push('historical-surface');
    if (artifactSpecs.includes(file)) owners.push('historical-artifact');
    if (standaloneSpecs.includes(file)) owners.push('historical-standalone');
    if (/^integrated-product-poc-[\w-]+\.spec\.ts$/.test(file)) owners.push('program');
    if (!file.startsWith('personal-workspace-') && !file.startsWith('integrated-product-poc-')) owners.push('operating');
    if (owners.length !== 1) throw new Error(`Browser spec must have exactly one owner: ${file} (${owners.join(', ')})`);
    groups[owners[0]].push(file);
  }
  const required = [...historicalSurfaceSpecs, ...artifactSpecs, ...standaloneSpecs];
  for (const file of required) if (!files.includes(file)) throw new Error(`Required historical assertion file missing: ${file}`);
  const committed = execFileSync('git', ['ls-files', 'tests/e2e'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/)
    .filter(file => file.endsWith('.spec.ts')).map(file => file.slice('tests/e2e/'.length));
  for (const file of committed) if (!files.includes(file)) throw new Error(`Committed browser spec omitted: ${file}`);
  const flattened = Object.values(groups).flat();
  if (flattened.length !== files.length || new Set(flattened).size !== files.length) throw new Error('Browser owner partition has duplicates or omissions');
  return { groups, files, committedCount: committed.length };
}

export const browserSpecPatterns = (files: readonly string[]) => files.map(file => `**/${file}`);
