import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('./check-docs.mjs', import.meta.url));
const required = ['AGENTS.md', 'agent.md', 'README.md', 'docs/PROJECT_CONTROL.md',
  'docs/STATUS.md', 'docs/STATUS_HISTORY.md', 'docs/ROADMAP.md', 'docs/IDEAS.md',
  'docs/specs/README.md', 'docs/specs/TEMPLATE.md', 'docs/REFERENCE.md', 'docs/HISTORY.md',
  'docs/harness/README.md', 'docs/harness/SDLC.md', 'docs/harness/QA.md', 'docs/harness/ROLES.md'];

function fixture(run) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'flow-docs-portability-'));
  const root = path.join(temporary, 'repo');
  try {
    for (const name of required) {
      const target = path.join(root, name);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, '# Test fixture\n');
    }
    const check = target => {
      writeFileSync(path.join(root, 'README.md'), `[target](<${target}>)\n`);
      return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
    };
    run({ root, temporary, check });
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(tmpdir()));
    assert(path.basename(temporary).startsWith('flow-docs-portability-'));
    rmSync(temporary, { recursive: true });
  }
}

test('relative repository documents remain valid', () => fixture(({ check }) => {
  const result = check('docs/STATUS.md');
  assert.equal(result.status, 0, result.stderr);
}));
test('missing local documents still fail', () => fixture(({ check }) => {
  const result = check('docs/missing.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /broken local link/);
}));
test('absolute existing files and Windows drive or UNC links fail on every host', () => fixture(({ root, check }) => {
  for (const target of [path.join(root, 'AGENTS.md').replaceAll('\\', '/'),
    'D:/another-worktree/spec.md', '//machine/share/spec.md', 'file:///D:/another-worktree/spec.md']) {
    const result = check(target);
    assert.equal(result.status, 1, target);
    assert.match(result.stderr, /non-portable absolute local link/);
  }
}));
test('a real sibling file cannot satisfy a repository link', () => fixture(({ temporary, check }) => {
  writeFileSync(path.join(temporary, 'outside.md'), '# Existing outside file\n');
  const result = check('../outside.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /local link escapes repository/);
}));
