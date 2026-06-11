import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = path.join(repoRoot, '.agents', 'skills');
const targetRoot = path.join(repoRoot, '.claude', 'skills');
const checkOnly = process.argv.includes('--check');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const files = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolutePath).split(path.sep).join('/'));
      }
    }
  }

  await walk(root);
  return files;
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function compareTrees(source, target) {
  const sourceFiles = await listFiles(source);
  const targetFiles = await listFiles(target);
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  const differences = [];

  for (const relativePath of sourceFiles) {
    if (!targetSet.has(relativePath)) {
      differences.push(`missing in .claude/skills: ${relativePath}`);
      continue;
    }

    const [sourceBuffer, targetBuffer] = await Promise.all([
      fs.readFile(path.join(source, relativePath)),
      fs.readFile(path.join(target, relativePath)),
    ]);

    if (!sourceBuffer.equals(targetBuffer)) {
      differences.push(`content differs: ${relativePath}`);
    }
  }

  for (const relativePath of targetFiles) {
    if (!sourceSet.has(relativePath)) {
      differences.push(`extra in .claude/skills: ${relativePath}`);
    }
  }

  return differences;
}

if (!(await pathExists(sourceRoot))) {
  console.error(`Missing source skill directory: ${path.relative(repoRoot, sourceRoot)}`);
  process.exit(1);
}

if (checkOnly) {
  const differences = await compareTrees(sourceRoot, targetRoot);
  if (differences.length > 0) {
    console.error('Skill sync check failed:');
    for (const difference of differences) {
      console.error(`- ${difference}`);
    }
    process.exit(1);
  }

  console.log('Skill sync check passed.');
  process.exit(0);
}

await fs.rm(targetRoot, { recursive: true, force: true });
await copyDirectory(sourceRoot, targetRoot);
console.log('Synced .agents/skills to .claude/skills.');
