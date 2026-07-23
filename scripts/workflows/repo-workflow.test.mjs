import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTEXT_ROUTES,
  CORE_DOCUMENTS,
  classifyChangedPath,
  filterChangesByScopes,
  groupChanges,
  parsePorcelainStatus,
  recommendVerification,
  summarizeStatuses,
} from './repo-workflow.mjs';

test('keeps session start core context small and routes optional documents by task', () => {
  assert.deepEqual(CORE_DOCUMENTS, ['AGENTS.md', 'agent.md']);
  assert.equal(CONTEXT_ROUTES.some((route) => route.files.includes('docs/IDEAS.md')), true);
  assert.equal(CONTEXT_ROUTES.some((route) => route.files.includes('docs/SERVICE_STRUCTURE.md')), true);
  assert.equal(CONTEXT_ROUTES.every((route) => route.files.length <= 2), true);
});

test('classifies canonical workflow paths into stable lanes', () => {
  assert.equal(classifyChangedPath('.agents/skills/flow-session-start/SKILL.md'), 'skills');
  assert.equal(classifyChangedPath('docs/workflows/session-start.md'), 'documentation');
  assert.equal(classifyChangedPath('docs/content-audit/review.html'), 'content-research');
  assert.equal(classifyChangedPath('components/flow/AppClient.tsx'), 'runtime');
  assert.equal(classifyChangedPath('lib/flow/date.test.ts'), 'tests');
  assert.equal(classifyChangedPath('scripts/workflows/repo-workflow.mjs'), 'tooling');
  assert.equal(classifyChangedPath('.github/pull_request_template.md'), 'tooling');
});

test('filters closeout changes by explicit path prefixes', () => {
  const changes = [
    { file: 'docs/workflows/session-start.md' },
    { file: 'scripts/workflows/repo-workflow.mjs' },
    { file: 'components/flow/AppClient.tsx' },
  ];

  assert.deepEqual(
    filterChangesByScopes(changes, ['docs/workflows', 'scripts/workflows']).map((change) => change.file),
    ['docs/workflows/session-start.md', 'scripts/workflows/repo-workflow.mjs'],
  );
});

test('parses null-delimited porcelain status without losing Unicode paths', () => {
  const parsed = parsePorcelainStatus('## main...origin/main\0 M docs/STATUS.md\0?? docs/한글 검토.md\0');

  assert.equal(parsed.branch, 'main...origin/main');
  assert.deepEqual(parsed.changes.map((change) => change.file), ['docs/STATUS.md', 'docs/한글 검토.md']);
  assert.deepEqual(summarizeStatuses(parsed.changes), {
    modified: 1,
    added: 0,
    deleted: 0,
    renamed: 0,
    unmerged: 0,
    untracked: 1,
  });
  assert.equal(groupChanges(parsed.changes).documentation.length, 2);
});

test('recommends verification by blast radius without claiming execution', () => {
  assert.deepEqual(recommendVerification(['docs/workflows/session-start.md']), ['npm run docs:check']);

  assert.deepEqual(
    recommendVerification([
      '.agents/skills/flow-session-start/SKILL.md',
      'components/flow/AppClient.tsx',
      'package.json',
    ]),
    [
      'npm run skills:sync',
      'npm run security:audit',
      'npm run docs:check',
      'npm test',
      'npm run build',
      'npm run test:e2e',
    ],
  );
});
