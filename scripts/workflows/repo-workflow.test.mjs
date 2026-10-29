import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTEXT_ROUTES,
  CORE_DOCUMENTS,
  classifyChangedPath,
  filterChangesByScopes,
  groupChanges,
  isDocsOnlyChange,
  isDocsOnlyPath,
  parsePorcelainStatus,
  parseRawDiff,
  recommendVerification,
  selectPrePushCheck,
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

test('treats only documents that docs:check covers and no code reads as docs-only', () => {
  for (const file of [
    'AGENTS.md',
    'docs/TOOLING.md',
    'docs/specs/2026-07-11-canonical-flow-data-model/spec.md',
    '.agents/skills/flow-session-start/SKILL.md',
    '.claude/skills/flow-session-start/SKILL.md',
  ]) {
    assert.equal(isDocsOnlyPath(file), true, file);
  }

  for (const file of [
    'docs/content-audit/2026-07-01-curated-source-app-seed-v1.json',
    'docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.md',
    'docs/flow-rules/first-user-validation-script.md',
    'docs/validation-sessions/TEMPLATE.md',
    'docs/specs/2026-09-12-flowme-integrated-product-poc-program/git-local-evidence-manifest.json',
    'lib/flow/README.md',
    '.githooks/pre-push',
    'package.json',
    '.agents/skills/humanize-korean/references/metrics.py',
    '.claude/skills/humanize-korean/references/metrics.py',
    '.agents/skills/humanize-korean/references/baseline.json',
    '.agents/skills/flow-session-start/agents/openai.yaml',
  ]) {
    assert.equal(isDocsOnlyPath(file), false, file);
  }
});

test('reads modes from a raw diff so symlinks and type changes never count as docs', () => {
  // Captured from `git diff --raw -z --no-renames` on a fixture repository.
  const raw = ':000000 100644 0000000 b917a72 A\0.agents/skills/x/run.py\0'
    + ':100644 100644 7898192 c1827f0 M\0docs/a.md\0'
    + ':100644 000000 6178079 0000000 D\0docs/b.md\0'
    + ':100644 120000 f2ad6c7 e77de85 T\0docs/c.md\0'
    + ':000000 120000 0000000 e77de85 A\0docs/link.md\0';
  const changes = parseRawDiff(raw);

  assert.deepEqual(changes.map(({ file, status }) => `${status} ${file}`), [
    'A .agents/skills/x/run.py',
    'M docs/a.md',
    'D docs/b.md',
    'T docs/c.md',
    'A docs/link.md',
  ]);
  assert.deepEqual(changes.map(isDocsOnlyChange), [false, true, true, false, false]);
  assert.deepEqual(parseRawDiff(''), []);
});

const ZERO = '0'.repeat(40);
const LOCAL = 'a'.repeat(40);
const REMOTE = 'b'.repeat(40);
const BASE = 'c'.repeat(40);

const plain = (file) => ({ file, oldMode: '100644', newMode: '100644', status: 'M' });

function fakeGit(filesByRange, base = BASE) {
  const calls = [];
  return {
    calls,
    mergeBase: (head) => {
      calls.push(['merge-base', head]);
      return base;
    },
    changedFiles: (from, to) => {
      calls.push(['diff', from, to]);
      return filesByRange[`${from}..${to}`]?.map((change) => (typeof change === 'string' ? plain(change) : change)) ?? null;
    },
  };
}

test('pre-push runs docs:check only when every pushed ref changes docs alone', () => {
  const docs = fakeGit({ [`${REMOTE}..${LOCAL}`]: ['docs/TOOLING.md', '.agents/skills/flow-session-start/SKILL.md'] });
  assert.equal(selectPrePushCheck(`refs/heads/topic ${LOCAL} refs/heads/topic ${REMOTE}\n`, docs), 'docs:check');
  assert.deepEqual(docs.calls, [['diff', REMOTE, LOCAL]]);

  const mixed = fakeGit({ [`${REMOTE}..${LOCAL}`]: ['docs/TOOLING.md', 'scripts/workflows/repo-workflow.mjs'] });
  assert.equal(selectPrePushCheck(`refs/heads/topic ${LOCAL} refs/heads/topic ${REMOTE}\n`, mixed), 'verify');

  const twoRefs = fakeGit({
    [`${REMOTE}..${LOCAL}`]: ['docs/TOOLING.md'],
    [`${BASE}..${REMOTE}`]: ['lib/flow/date.ts'],
  });
  const raw = `refs/heads/a ${LOCAL} refs/heads/a ${REMOTE}\nrefs/heads/b ${REMOTE} refs/heads/b ${BASE}\n`;
  assert.equal(selectPrePushCheck(raw, twoRefs), 'verify');

  const update = `refs/heads/topic ${LOCAL} refs/heads/topic ${REMOTE}\n`;
  const skillScript = fakeGit({ [`${REMOTE}..${LOCAL}`]: [
    '.agents/skills/humanize-korean/references/metrics.py',
    '.claude/skills/humanize-korean/references/metrics.py',
  ] });
  assert.equal(selectPrePushCheck(update, skillScript), 'verify');

  const docSymlink = fakeGit({ [`${REMOTE}..${LOCAL}`]: [
    { file: 'docs/TOOLING.md', oldMode: '100644', newMode: '120000', status: 'T' },
  ] });
  assert.equal(selectPrePushCheck(update, docSymlink), 'verify');
});

test('pre-push diffs a new remote branch from its merge base with main', () => {
  const git = fakeGit({ [`${BASE}..${LOCAL}`]: ['AGENTS.md'] });
  assert.equal(selectPrePushCheck(`refs/heads/topic ${LOCAL} refs/heads/topic ${ZERO}\n`, git), 'docs:check');
  assert.deepEqual(git.calls, [['merge-base', LOCAL], ['diff', BASE, LOCAL]]);
});

test('pre-push falls back to verify when the range cannot be read', () => {
  const noBase = fakeGit({}, '');
  assert.equal(selectPrePushCheck(`refs/heads/topic ${LOCAL} refs/heads/topic ${ZERO}\n`, noBase), 'verify');

  const unknownRemote = fakeGit({});
  assert.equal(selectPrePushCheck(`refs/heads/topic ${LOCAL} refs/heads/topic ${REMOTE}\n`, unknownRemote), 'verify');
});

test('pre-push skips deleted refs instead of diffing them', () => {
  const git = fakeGit({});
  assert.equal(selectPrePushCheck(`(delete) ${ZERO} refs/heads/old ${REMOTE}\n`, git), 'docs:check');
  assert.deepEqual(git.calls, []);
});
