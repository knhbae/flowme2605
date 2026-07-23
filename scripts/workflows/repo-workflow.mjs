import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

export const CORE_DOCUMENTS = [
  'AGENTS.md',
  'agent.md',
];

export const CONTEXT_ROUTES = [
  { trigger: '현재 상태/우선순위', files: ['docs/STATUS.md', 'docs/ROADMAP.md'] },
  { trigger: '제품/UX/콘텐츠 정책', files: ['docs/PRODUCT_PRINCIPLES.md', 'docs/DECISIONS.md'] },
  { trigger: '보류 아이디어 검토', files: ['docs/IDEAS.md'] },
  { trigger: 'route/component/data 구조', files: ['docs/SERVICE_STRUCTURE.md'] },
  { trigger: 'tooling/harness/release', files: ['docs/TOOLING.md', 'docs/harness/README.md'] },
  { trigger: '승인된 다단계 작업', files: ['docs/specs/README.md'] },
];

function git(args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    if (options.allowFailure) return '';
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

export function normalizeRepoPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function classifyChangedPath(value) {
  const file = normalizeRepoPath(value);

  if (file.startsWith('.agents/skills/') || file.startsWith('.claude/skills/')) return 'skills';
  if (file.startsWith('docs/content-audit/') || file.startsWith('docs/flow-rules/')) return 'content-research';
  if (file.startsWith('scripts/content-audit/')) return 'content-research';
  if (file.startsWith('scripts/') || file.startsWith('.github/') || file.startsWith('.githooks/')) return 'tooling';
  if (file.startsWith('docs/') || file === 'AGENTS.md' || file === 'agent.md' || file === 'CLAUDE.md' || file.endsWith('.md')) return 'documentation';
  if (/^(app|components|lib)\//.test(file)) return file.includes('.test.') ? 'tests' : 'runtime';
  if (/^(tests|test)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return 'tests';
  if (/^(package(-lock)?\.json|next\.config\.|playwright\.config\.|tsconfig\.json|vercel\.json|\.node-version)/.test(file)) return 'tooling';
  return 'other';
}

export function parsePorcelainStatus(raw) {
  const entries = raw.split('\0').filter(Boolean);
  let branch = '';
  const changes = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.startsWith('## ')) {
      branch = entry.slice(3);
      continue;
    }

    const status = entry.slice(0, 2);
    const file = normalizeRepoPath(entry.slice(3));
    changes.push({ status, file, group: classifyChangedPath(file) });

    if (/[RC]/.test(status) && entries[index + 1] && !entries[index + 1].startsWith('## ')) {
      changes.at(-1).previousFile = normalizeRepoPath(entries[index + 1]);
      index += 1;
    }
  }

  return { branch, changes };
}

export function groupChanges(changes) {
  const grouped = {};
  for (const change of changes) (grouped[change.group] ??= []).push(change);
  return grouped;
}

export function filterChangesByScopes(changes, scopes) {
  if (!scopes?.length) return changes;
  const normalizedScopes = scopes.map((scope) => normalizeRepoPath(scope).replace(/\/$/, ''));
  return changes.filter(({ file }) => normalizedScopes.some((scope) => file === scope || file.startsWith(`${scope}/`)));
}

export function summarizeStatuses(changes) {
  const summary = { modified: 0, added: 0, deleted: 0, renamed: 0, unmerged: 0, untracked: 0 };
  for (const { status } of changes) {
    if (status === '??') summary.untracked += 1;
    else if (status.includes('U')) summary.unmerged += 1;
    else if (status.includes('R') || status.includes('C')) summary.renamed += 1;
    else if (status.includes('D')) summary.deleted += 1;
    else if (status.includes('A')) summary.added += 1;
    else summary.modified += 1;
  }
  return summary;
}

export function recommendVerification(files) {
  const normalized = files.map(normalizeRepoPath);
  const groups = new Set(normalized.map(classifyChangedPath));
  const commands = [];
  const has = (pattern) => normalized.some((file) => pattern.test(file));

  if (groups.has('skills')) commands.push('npm run skills:sync');
  if (has(/^(package(-lock)?\.json|\.github\/workflows\/|scripts\/install-git-hooks\.mjs|\.node-version)/)) {
    commands.push('npm run security:audit');
  }
  if ([...groups].some((group) => ['skills', 'documentation', 'content-research', 'tooling'].includes(group))) {
    commands.push('npm run docs:check');
  }
  if ([...groups].some((group) => ['runtime', 'tests', 'tooling'].includes(group))) commands.push('npm test');
  if (groups.has('runtime') || has(/^(package(-lock)?\.json|next\.config\.|tsconfig\.json|scripts\/build-next\.mjs)/)) {
    commands.push('npm run build');
  }
  if (has(/^(app|components)\//) || has(/^playwright\.config\./)) commands.push('npm run test:e2e');

  return [...new Set(commands)];
}

function latestAuditEntries(limit = 5) {
  const directory = path.join(REPO_ROOT, 'docs', 'content-audit');
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const absolute = path.join(directory, entry.name);
      return { name: entry.name, modifiedAt: fs.statSync(absolute).mtime.toISOString(), directory: entry.isDirectory() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, limit);
}

function collectRepoState() {
  const parsed = parsePorcelainStatus(git(['status', '--porcelain=v1', '-z', '--branch']));
  const head = git(['rev-parse', '--short', 'HEAD']);
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { allowFailure: true });
  let ahead = null;
  let behind = null;

  if (upstream) {
    const counts = git(['rev-list', '--left-right', '--count', `HEAD...${upstream}`], { allowFailure: true }).split(/\s+/);
    if (counts.length === 2) {
      ahead = Number(counts[0]);
      behind = Number(counts[1]);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    branch: parsed.branch,
    head,
    upstream: upstream || null,
    ahead,
    behind,
    statusSummary: summarizeStatuses(parsed.changes),
    changes: parsed.changes,
    groupedChanges: groupChanges(parsed.changes),
    requiredDocuments: CORE_DOCUMENTS.map((file) => ({ file, exists: fs.existsSync(path.join(REPO_ROOT, file)) })),
    contextRoutes: CONTEXT_ROUTES.map((route) => ({
      ...route,
      files: route.files.map((file) => ({ file, exists: fs.existsSync(path.join(REPO_ROOT, file)) })),
    })),
    latestAuditEntries: latestAuditEntries(),
  };
}

function formatStatusSummary(summary) {
  return Object.entries(summary).map(([key, value]) => `${key} ${value}`).join(', ');
}

function renderChangeGroups(groups, limit = 12) {
  const names = Object.keys(groups).sort();
  if (names.length === 0) return '- 변경 없음';

  const lines = [];
  for (const name of names) {
    const changes = groups[name];
    lines.push(`- **${name}**: ${changes.length}`);
    for (const change of changes.slice(0, limit)) lines.push(`  - \`${change.status}\` \`${change.file}\``);
    if (changes.length > limit) lines.push(`  - ... ${changes.length - limit}개 더 있음`);
  }
  return lines.join('\n');
}

function renderSessionStart(state) {
  const sync = state.upstream ? `ahead ${state.ahead}, behind ${state.behind}` : 'upstream 없음';
  const routes = state.contextRoutes.map((route) => {
    const files = route.files.map((entry) => `\`${entry.file}\`${entry.exists ? '' : ' **MISSING**'}`).join(', ');
    return `- **${route.trigger}**: ${files}`;
  }).join('\n');
  return `# FLOW Session Start\n\n- 생성: ${state.generatedAt}\n- repo: \`${state.repoRoot}\`\n- branch: \`${state.branch}\`\n- HEAD: \`${state.head}\`\n- upstream: \`${state.upstream ?? '없음'}\` (${sync})\n- worktree: ${formatStatusSummary(state.statusSummary)}\n\n## 변경 그룹\n\n${renderChangeGroups(state.groupedChanges)}\n\n## 최근 review/evidence\n\n${state.latestAuditEntries.map((entry) => `- \`docs/content-audit/${entry.name}\` (${entry.modifiedAt})`).join('\n') || '- 없음'}\n\n## 기본 진입\n\n${state.requiredDocuments.map((entry, index) => `${index + 1}. \`${entry.file}\`${entry.exists ? '' : ' **MISSING**'}`).join('\n')}\n\n## 요청별 추가 컨텍스트\n\n${routes}\n\n> 위 문서를 모두 읽는 목록이 아니다. 사용자 요청과 직접 맞는 경로만 선택한다.\n\n## 시작 규칙\n\n- 기존 dirty path는 현재 작업 소유로 추정하지 않는다.\n- 제품 Stage, 구현 상태, 자동 QA, 배포, 실제 사용자 증거를 분리한다.\n- 사용자 요청과 관련된 diff를 읽은 뒤 범위와 검증 lane을 정한다.\n`;
}

function renderCloseout(state, scopes = []) {
  const scopedChanges = filterChangesByScopes(state.changes, scopes);
  const scopedGroups = groupChanges(scopedChanges);
  const scopedSummary = summarizeStatuses(scopedChanges);
  const files = scopedChanges.map((change) => change.file);
  const commands = recommendVerification(files);
  const hasRuntime = files.some((file) => /^(app|components|lib)\//.test(file));
  const hasDocs = files.some((file) => file.startsWith('docs/') || ['AGENTS.md', 'agent.md'].includes(file));
  const hasSpecs = files.some((file) => file.startsWith('docs/specs/'));
  const checkpoints = [
    hasDocs ? '`DECISIONS / IDEAS / STATUS` 중 실제로 바뀐 층만 갱신했는지 확인' : '문서 메모리 갱신 필요성 확인',
    hasRuntime ? '`SERVICE_STRUCTURE.md`가 현재 route/component 동작과 일치하는지 확인' : '서비스 구조 변경 없음 확인',
    hasSpecs ? 'spec의 scope, tasks, QA evidence 상태 확인' : 'multi-step 변경이면 durable spec 누락 여부 확인',
    '게시 요청이 있으면 PR history, push, PR, merge, deploy 상태를 각각 확인',
    '자동 QA와 실제 사용자 관찰 결과를 분리',
  ];

  const scopeLabel = scopes.length > 0 ? scopes.map((scope) => `\`${scope}\``).join(', ') : '전체 worktree';
  const fullSummary = scopes.length > 0 ? `\n- 전체 worktree: ${formatStatusSummary(state.statusSummary)}` : '';
  return `# FLOW Work Closeout\n\n- 생성: ${state.generatedAt}\n- branch/HEAD: \`${state.branch}\` / \`${state.head}\`\n- 검토 scope: ${scopeLabel}\n- scope 변경: ${formatStatusSummary(scopedSummary)}${fullSummary}\n\n## 변경 그룹\n\n${renderChangeGroups(scopedGroups)}\n\n## 권장 검증\n\n${commands.map((command) => `- [ ] \`${command}\``).join('\n') || '- [ ] 현재 작업에 맞는 수동 검증을 명시'}\n\n> 이 보고서는 명령을 실행하지 않았으며 통과를 주장하지 않습니다.\n\n## 문서·증거 체크포인트\n\n${checkpoints.map((item) => `- [ ] ${item}`).join('\n')}\n\n## 게시 상태\n\n- 로컬 편집: ${scopedChanges.length > 0 ? `${scopedChanges.length}개 scoped path 감지` : 'scope 내 변경 없음'}\n- 검증: 이 보고서만으로 미확인\n- 커밋: 현재 HEAD \`${state.head}\`; 이번 작업 포함 여부는 diff로 별도 확인\n- push: ${state.upstream ? `\`${state.upstream}\` 대비 ahead ${state.ahead}, behind ${state.behind}` : 'upstream 없음'}\n- PR / merge / deploy: 외부 상태를 별도 확인\n- 실제 사용자 검증: 별도 evidence가 없으면 미확인\n`;
}

export function buildWorkflowReport(mode, options = {}) {
  const state = collectRepoState();
  if (mode === 'session-start') return { mode, state, markdown: renderSessionStart(state) };
  if (mode === 'work-closeout') {
    const scopes = options.scopes ?? [];
    return { mode, scopes, state, scopedChanges: filterChangesByScopes(state.changes, scopes), markdown: renderCloseout(state, scopes) };
  }
  throw new Error(`Unknown workflow mode: ${mode}`);
}

function main() {
  const mode = process.argv[2];
  const json = process.argv.includes('--json');
  const scopeArgument = process.argv.find((argument) => argument.startsWith('--scope='));
  const scopes = scopeArgument ? scopeArgument.slice('--scope='.length).split(',').filter(Boolean) : [];
  if (!mode || !['session-start', 'work-closeout'].includes(mode)) {
    console.error('Usage: node scripts/workflows/repo-workflow.mjs <session-start|work-closeout> [--json] [--scope=path,path]');
    process.exit(1);
  }

  const report = buildWorkflowReport(mode, { scopes });
  console.log(json ? JSON.stringify(report, null, 2) : report.markdown);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) main();
