const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = __dirname;
const REPO = path.resolve(ROOT, '..', '..', '..');
const CANONICAL_MAIN = '46e567ec09c5eba37ac703529b3d3eccc75e0dde';
const APP_SOURCE = '45b1f424a9e73a188750eb22691a756b86153231';
const CANONICAL_DIR = 'docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation';
const CANONICAL_PROMPT = `${CANONICAL_DIR}/prompt-ko.md`;
const PRIOR_SHA = '7D608B993342AEF5F570AA7C967E3DF46A7BC1083BB3BCCA8C631473E451A6C0';
const ALLOWED_EVIDENCE = new Set([
  'current_production_interaction',
  'current_package_screenshot',
  'current_source',
  'prior_design_artifact',
  'reference_pattern',
  'heuristic_simulation',
  'inaccessible',
]);

const checks = [];
function check(id, condition, detail) {
  checks.push({ id, passed: Boolean(condition), detail });
}
function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}
function json(name) {
  return JSON.parse(read(name));
}
function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}
function collectEvidence(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvidence(item, found));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (key === 'evidenceKind') {
        const values = Array.isArray(item) ? item : [item];
        found.push(...values);
      }
      collectEvidence(item, found);
    });
  }
  return found;
}

const requiredFiles = [
  'README.md', 'audit.md', 'canonical-alignment.md', 'p28-development-handoff.md',
  'p28-backlog.md', 'qa.md', 'review.html', 'promise-matrix.json',
  'case-journey-matrix.json', 'journey-step-matrix.json',
  'source-capability-matrix.json', 'ux-alternative-comparison.json',
  'production-journey-results.json', 'prior-artifact-results.json',
];
requiredFiles.forEach((name) => check(`file:${name}`, fs.existsSync(path.join(ROOT, name)), name));

const originMain = git('rev-parse', 'origin/main');
check('origin-main', originMain === CANONICAL_MAIN, originMain);
const canonicalFiles = git('ls-tree', '-r', '--name-only', 'origin/main', '--', CANONICAL_DIR).split(/\r?\n/).filter(Boolean);
check('canonical-package-files', canonicalFiles.length === 8, `${canonicalFiles.length}`);
check('canonical-prompt-exists', canonicalFiles.includes(CANONICAL_PROMPT), CANONICAL_PROMPT);
const prompt = git('show', `origin/main:${CANONICAL_PROMPT}`);
check('canonical-prompt-title', prompt.includes('FlowMe P28-00 Claude Design / Codex 공통 검토 프롬프트'), 'prompt title');
check('canonical-prompt-e2e', prompt.includes('tests/e2e/p27-foundation.spec.ts'), 'canonical E2E path');
check('canonical-prompt-feedback', prompt.includes('2026-07-21-p27-user-feedback-synthesis'), 'P27 feedback input');

const delta = git('diff', '--name-only', `${APP_SOURCE}..${CANONICAL_MAIN}`).split(/\r?\n/).filter(Boolean);
check('main-delta-count', delta.length === 8, `${delta.length}`);
check('main-delta-docs-only', delta.every((name) => name.startsWith(`${CANONICAL_DIR}/`)), delta.join(', '));

const priorPath = path.resolve(ROOT, '..', '2026-07-19-flow-content-usage-preview-ko.html');
const priorHash = crypto.createHash('sha256').update(fs.readFileSync(priorPath)).digest('hex').toUpperCase();
check('prior-artifact-sha', priorHash === PRIOR_SHA, priorHash);

const promise = json('promise-matrix.json');
check('promise-count', promise.promises.length === 15, `${promise.promises.length}`);
check('promise-ids', promise.promises.map((item) => item.id).join(',') === Array.from({ length: 15 }, (_, index) => `PR-${String(index + 1).padStart(2, '0')}`).join(','), 'PR-01..PR-15');
check('promise-main', promise.reviewedMainCommit === CANONICAL_MAIN, promise.reviewedMainCommit);
check('promise-app-source', promise.applicationSourceCommit === APP_SOURCE, promise.applicationSourceCommit);
check('promise-prior-sha', promise.priorArtifactSha256 === PRIOR_SHA, promise.priorArtifactSha256);
check('promise-missing-zero', promise.canonicalRequirementMissingCount === 0, `${promise.canonicalRequirementMissingCount}`);

const cases = json('case-journey-matrix.json');
check('case-count', cases.cases.length === 5, `${cases.cases.length}`);
const steps = json('journey-step-matrix.json');
check('step-case-count', steps.cases.length === 5, `${steps.cases.length}`);
check('ten-steps-each', steps.cases.every((item) => item.steps.length === 10), steps.cases.map((item) => `${item.id}:${item.steps.length}`).join(', '));
const requiredStepFields = ['stage', 'visible', 'decision', 'primaryAction', 'redundantCopy', 'depth', 'currentSupport', 'block', 'change'];
check('step-fields', steps.cases.every((item) => item.steps.every((step) => requiredStepFields.every((field) => Object.prototype.hasOwnProperty.call(step, field)))), requiredStepFields.join(', '));

const alternatives = json('ux-alternative-comparison.json');
check('alternatives-abc', alternatives.alternatives.map((item) => item.id).join('') === 'ABC', alternatives.alternatives.map((item) => item.id).join(','));
check('hybrid-recommended', alternatives.recommendation.id === 'C', alternatives.recommendation.id);

const backlog = read('p28-backlog.md');
const slices = [...backlog.matchAll(/^## (P28-\d{2})[^\n]*$/gm)].map((match, index, all) => ({
  id: match[1],
  text: backlog.slice(match.index, all[index + 1]?.index ?? backlog.length),
}));
check('backlog-slices', slices.map((item) => item.id).join(',') === 'P28-01,P28-02,P28-03,P28-04,P28-05,P28-06,P28-07', slices.map((item) => item.id).join(','));
const backlogFields = ['사용자 문제', '적용 route', '구현 범위', '비범위', '데이터 영향', '선행 의존성', '접근성', 'unit/E2E', 'screenshot marker', '완료 기준'];
slices.forEach((slice) => {
  check(`${slice.id}:fields`, backlogFields.every((field) => slice.text.includes(field)) && slice.text.includes('390') && slice.text.includes('1024') && slice.text.includes('acceptance'), backlogFields.join(', '));
});

const audit = read('audit.md');
for (let index = 1; index <= 12; index += 1) {
  check(`audit-section-${index}`, audit.includes(`## ${index}.`), `section ${index}`);
}
check('audit-feedback-synthesis', audit.includes('P27 사용자 피드백 종합 reconciliation'), 'feedback reconciliation');
check('audit-canonical-sha', audit.includes(PRIOR_SHA), PRIOR_SHA);

const handoff = read('p28-development-handoff.md');
check('handoff-first-goal', handoff.includes('[이번 실행 목표: P28-01]'), 'P28-01');
check('handoff-sequence', handoff.includes('P28-01 → P28-02 → P28-03 → P28-05 → P28-07'), 'required sequence');
check('handoff-e2e', handoff.includes('tests/e2e/p27-foundation.spec.ts'), 'canonical E2E');
check('handoff-no-app-overreach', handoff.includes('새로운 source 콘텐츠나 seed를 추가하지 않는다'), 'P28-01 boundary');

const review = read('review.html');
check('html-main-commit', review.includes('46e567e'), 'reviewed main');
check('html-app-commit', review.includes('45b1f42'), 'application source');
check('html-alignment-link', review.includes('canonical-alignment.md'), 'alignment link');
check('html-handoff-link', review.includes('p28-development-handoff.md'), 'handoff link');

const textFiles = ['README.md', 'audit.md', 'canonical-alignment.md', 'p28-development-handoff.md', 'p28-backlog.md', 'qa.md', 'review.html'];
const stalePath = ['p27-flow', 'lifecycle-workspace.spec.ts'].join('-');
check('stale-e2e-path-zero', textFiles.every((name) => !read(name).includes(stalePath)), 'deprecated E2E path absent');

const evidenceFiles = ['promise-matrix.json', 'case-journey-matrix.json', 'journey-step-matrix.json', 'production-journey-results.json', 'prior-artifact-results.json'];
const evidenceValues = evidenceFiles.flatMap((name) => collectEvidence(json(name)));
const invalidEvidence = [...new Set(evidenceValues.filter((value) => !ALLOWED_EVIDENCE.has(value)))];
check('evidence-kinds', invalidEvidence.length === 0, invalidEvidence.join(', '));

const failed = checks.filter((item) => !item.passed);
const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  canonicalPrompt: CANONICAL_PROMPT,
  reviewedMainCommit: CANONICAL_MAIN,
  applicationSourceCommit: APP_SOURCE,
  priorArtifactSha256: priorHash,
  observedUserSessions: 0,
  summary: { checkCount: checks.length, passedCount: checks.length - failed.length, failedCount: failed.length, canonicalRequirementMissingCount: failed.length },
  checks,
};
fs.writeFileSync(path.join(ROOT, 'canonical-alignment-results.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result.summary)}\n`);
if (failed.length > 0) {
  process.stderr.write(`${JSON.stringify(failed, null, 2)}\n`);
  process.exitCode = 1;
}
