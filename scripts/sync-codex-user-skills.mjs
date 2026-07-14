import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = path.join(repoRoot, '.agents', 'skills');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const targetRoot = path.join(codexHome, 'skills');
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
  if (!(await pathExists(root))) return [];

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

async function listSkillNames() {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
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

async function compareSkill(skillName) {
  const source = path.join(sourceRoot, skillName);
  const target = path.join(targetRoot, skillName);
  const sourceFiles = await listFiles(source);
  const targetFiles = await listFiles(target);
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  const differences = [];

  if (!(await pathExists(target))) {
    return [`missing Codex user skill: ${skillName}`];
  }

  for (const relativePath of sourceFiles) {
    if (!targetSet.has(relativePath)) {
      differences.push(`${skillName}: missing ${relativePath}`);
      continue;
    }

    const [sourceBuffer, targetBuffer] = await Promise.all([
      fs.readFile(path.join(source, relativePath)),
      fs.readFile(path.join(target, relativePath)),
    ]);

    if (!sourceBuffer.equals(targetBuffer)) {
      differences.push(`${skillName}: content differs ${relativePath}`);
    }
  }

  for (const relativePath of targetFiles) {
    if (!sourceSet.has(relativePath)) {
      differences.push(`${skillName}: extra ${relativePath}`);
    }
  }

  return differences;
}

if (!(await pathExists(sourceRoot))) {
  console.error(`Missing source skill directory: ${path.relative(repoRoot, sourceRoot)}`);
  process.exit(1);
}

const skillNames = await listSkillNames();
const invalidSkills = [];

for (const skillName of skillNames) {
  if (!(await pathExists(path.join(sourceRoot, skillName, 'SKILL.md')))) {
    invalidSkills.push(`${skillName}: missing SKILL.md`);
  }
}

if (invalidSkills.length > 0) {
  console.error('Invalid canonical skill tree:');
  for (const problem of invalidSkills) console.error(`- ${problem}`);
  process.exit(1);
}

if (checkOnly) {
  const differences = (
    await Promise.all(skillNames.map((skillName) => compareSkill(skillName)))
  ).flat();

  if (differences.length > 0) {
    console.error('Codex user skill sync check failed:');
    for (const difference of differences) console.error(`- ${difference}`);
    process.exit(1);
  }

  console.log(`Codex user skill sync check passed: ${skillNames.length} skills.`);
  process.exit(0);
}

await fs.mkdir(targetRoot, { recursive: true });

for (const skillName of skillNames) {
  const source = path.join(sourceRoot, skillName);
  const target = path.join(targetRoot, skillName);
  await fs.rm(target, { recursive: true, force: true });
  await copyDirectory(source, target);
}

console.log(`Installed ${skillNames.length} FLOW skills into ${targetRoot}.`);
console.log('Restart or open a new Codex task to refresh skill discovery.');
