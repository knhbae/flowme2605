import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'AGENTS.md',
  'agent.md',
  'README.md',
  'docs/PROJECT_CONTROL.md',
  'docs/STATUS.md',
  'docs/STATUS_HISTORY.md',
  'docs/ROADMAP.md',
  'docs/IDEAS.md',
  'docs/specs/README.md',
  'docs/specs/TEMPLATE.md',
  'docs/REFERENCE.md',
  'docs/HISTORY.md',
  'docs/harness/README.md',
  'docs/harness/SDLC.md',
  'docs/harness/QA.md',
  'docs/harness/ROLES.md',
];

const scanEntries = ['AGENTS.md', 'agent.md', 'README.md', 'design.md', 'docs'];
const ignoredDirs = new Set(['.git', '.next', 'node_modules', 'test-results']);

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    errors.push(`Missing required harness file: ${file}`);
  }
}

function collectMarkdown(entry) {
  const absolute = path.join(root, entry);
  if (!existsSync(absolute)) return [];

  const stats = statSync(absolute);
  if (stats.isFile()) {
    return absolute.endsWith('.md') ? [absolute] : [];
  }

  if (!stats.isDirectory()) return [];

  const files = [];
  for (const child of readdirSync(absolute, { withFileTypes: true })) {
    if (child.isDirectory() && ignoredDirs.has(child.name)) continue;

    const relative = path.join(entry, child.name);
    if (child.isDirectory()) {
      files.push(...collectMarkdown(relative));
    } else if (child.isFile() && child.name.endsWith('.md')) {
      files.push(path.join(root, relative));
    }
  }
  return files;
}

function normalizeTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  const withoutTitle = trimmed.startsWith('<')
    ? trimmed.slice(1, trimmed.indexOf('>'))
    : trimmed.split(/\s+/)[0];

  const withoutAnchor = withoutTitle.split('#')[0];
  if (!withoutAnchor) return null;
  if (/^(https?:|mailto:|tel:)/i.test(withoutAnchor)) return null;

  try {
    return decodeURIComponent(withoutAnchor);
  } catch {
    return withoutAnchor;
  }
}

let checkedLinks = 0;
const markdownFiles = scanEntries.flatMap(collectMarkdown);

for (const file of markdownFiles) {
  const relativeFile = path.relative(root, file);
  const content = readFileSync(file, 'utf8');
  const links = content.matchAll(/!?\[[^\]]*?\]\(([^)]+)\)/g);

  for (const match of links) {
    const target = normalizeTarget(match[1]);
    if (!target) continue;

    checkedLinks += 1;
    const resolved = path.resolve(path.dirname(file), target);
    if (!existsSync(resolved)) {
      errors.push(`${relativeFile}: broken local link -> ${match[1]}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Documentation check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Documentation check passed: ${requiredFiles.length} required files, ${checkedLinks} local links.`);
