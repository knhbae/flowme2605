import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

import { TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS } from '../../lib/flow/text-authoring/grammar-simulation-cases';
import {
  runGrammarSimulation,
  type GrammarSimulationResult,
} from '../../lib/flow/text-authoring/grammar-simulation';

type UiSimulationCheck = {
  id: string;
  target: 'route' | 'standalone' | 'both';
  viewport: string;
  action: string;
  expected: string;
  observed: string;
  passed: boolean;
};

type UiSimulationEvidence = {
  schemaVersion: 'flowme-text-authoring-ui-simulation-v1';
  executedAt: string;
  browser: string;
  routeUrl?: string;
  standaloneUrl?: string;
  commands: string[];
  checks: UiSimulationCheck[];
  consoleErrors: string[];
  pageErrors: string[];
  screenshots: Array<{
    label: string;
    file: string;
    viewport: string;
  }>;
  note: string;
};

const GENERATED_AT = new Date().toISOString();
const REPO_ROOT = process.cwd();
const OUTPUT_DIR = join(
  REPO_ROOT,
  'docs',
  'content-audit',
  '2026-07-31-flowme-text-authoring-grammar-simulation',
);
const RESULT_PATH = join(OUTPUT_DIR, 'grammar-simulation-results.json');
const REPORT_PATH = join(
  OUTPUT_DIR,
  'flowme-text-authoring-grammar-simulation-ko.html',
);
const README_PATH = join(OUTPUT_DIR, 'README.md');
const UI_EVIDENCE_PATH = join(OUTPUT_DIR, 'ui-simulation-evidence.json');
const STANDALONE_PATH = join(
  REPO_ROOT,
  'docs',
  'content-audit',
  '2026-07-29-flowme-text-authoring-ta-implementation',
  'flowme-text-authoring-ta-test.html',
);

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function compactRawText(value: string, maxLength = 2600): string {
  if (value.length <= maxLength) return value;
  const head = value.slice(0, maxLength);
  const lastLine = head.lastIndexOf('\n');
  return `${head.slice(0, Math.max(lastLine, 0))}\n… 전체 원문은 JSON 결과에서 확인`;
}

function artifactLabel(value: string): string {
  return {
    calendar: 'Calendar',
    todo: 'Todo',
    sheet: 'Sheet',
    memo: 'Memo',
    review: '검토 필요',
  }[value] ?? value;
}

function groupLabel(value: string): string {
  return {
    existing_content: '기존 콘텐츠',
    condition_change: '조건 변경',
    compatibility: '호환 문법',
    error_boundary: '오류 경계',
  }[value] ?? value;
}

function groupClass(value: string): string {
  return `group-${value.replaceAll('_', '-')}`;
}

function checkSummary(result: GrammarSimulationResult): string {
  return `${result.checks.filter((check) => check.passed).length}/${result.checks.length}`;
}

function scenarioCard(
  result: GrammarSimulationResult,
  rawText: string,
): string {
  const observations = result.observations;
  const issueText = observations.issueCount > 0
    ? `${observations.issueCount}개 · ${observations.issueTypes.join(', ')}`
    : '없음';
  const dateText = observations.dateRange
    ? `${observations.dateRange.start} → ${observations.dateRange.end}`
    : '계산된 날짜 없음';
  const failedChecks = result.checks.filter((check) => !check.passed);
  const checkRows = result.checks.map((check) => `
    <li class="${check.passed ? 'check-pass' : 'check-fail'}">
      <span>${check.passed ? '통과' : '실패'}</span>
      <strong>${escapeHtml(check.label)}</strong>
      ${check.passed ? '' : `<code>${escapeHtml(JSON.stringify(check.actual))}</code>`}
    </li>`).join('');
  return `
    <article class="scenario-card ${result.passed ? 'is-pass' : 'is-fail'}"
      data-group="${escapeHtml(result.group)}"
      data-search="${escapeHtml([
        result.id,
        result.title,
        result.summary,
        result.sourceShape,
        result.boundary,
      ].join(' ').toLocaleLowerCase())}">
      <div class="scenario-heading">
        <div>
          <div class="eyebrow-row">
            <span class="group-pill ${groupClass(result.group)}">${escapeHtml(groupLabel(result.group))}</span>
            <code>${escapeHtml(result.id)}</code>
          </div>
          <h3>${escapeHtml(result.title)}</h3>
          <p>${escapeHtml(result.summary)}</p>
        </div>
        <span class="result-pill ${result.passed ? 'pass' : 'fail'}">
          ${result.passed ? 'PASS' : 'FAIL'} · ${checkSummary(result)}
        </span>
      </div>
      <div class="scenario-metrics">
        <span><b>${observations.stepCount}</b> Step</span>
        <span><b>${observations.itemCount}</b> Item</span>
        <span><b>${observations.artifactCounts.calendar}</b> Calendar</span>
        <span><b>${observations.artifactCounts.todo}</b> Todo</span>
        <span><b>${observations.artifactCounts.sheet}</b> Sheet</span>
        <span><b>${observations.artifactCounts.memo}</b> Memo</span>
      </div>
      <dl class="scenario-facts">
        <div><dt>원문 형태</dt><dd>${escapeHtml(result.sourceShape)}</dd></div>
        <div><dt>자연스러운 결과</dt><dd>${escapeHtml(artifactLabel(result.naturalDestination))}</dd></div>
        <div><dt>실제 주 결과</dt><dd>${escapeHtml(artifactLabel(observations.primaryArtifact))}</dd></div>
        <div><dt>날짜 범위</dt><dd>${escapeHtml(dateText)}</dd></div>
        <div><dt>해석 이슈</dt><dd>${escapeHtml(issueText)}</dd></div>
        <div><dt>ICS</dt><dd>${observations.icsEventCount} VEVENT · RRULE ${observations.icsHasRrule ? '있음' : '없음'}</dd></div>
      </dl>
      <div class="boundary"><b>의미 경계</b>${escapeHtml(result.boundary)}</div>
      ${failedChecks.length > 0 ? `
        <div class="failure-callout">
          기대와 다른 검사 ${failedChecks.length}개가 있습니다.
        </div>` : ''}
      <details>
        <summary>입력 문법과 전체 검사 보기</summary>
        <div class="details-grid">
          <div>
            <h4>입력</h4>
            <pre>${escapeHtml(compactRawText(rawText))}</pre>
          </div>
          <div>
            <h4>검사</h4>
            <ul class="check-list">${checkRows}</ul>
          </div>
        </div>
      </details>
    </article>`;
}

function comparisonSection(results: GrammarSimulationResult[]): string {
  const groups = new Map<string, GrammarSimulationResult[]>();
  for (const result of results) {
    if (!result.comparisonKey) continue;
    groups.set(
      result.comparisonKey,
      [...(groups.get(result.comparisonKey) ?? []), result],
    );
  }
  return [...groups.entries()].map(([key, entries]) => `
    <article class="comparison-card">
      <div class="comparison-label">${escapeHtml({
        'relative-anchor': '기준일과 날짜 표현',
        'repeat-condition': '반복과 조건',
        'date-coverage': '날짜 커버리지',
        'schedule-detail': '시간 상세',
        'table-format': '표 형식',
      }[key] ?? key)}</div>
      <div class="comparison-track">
        ${entries.map((entry) => {
          const observation = entry.observations;
          const dates = observation.dateRange
            ? `${observation.dateRange.start}<br>→ ${observation.dateRange.end}`
            : '날짜 없음';
          return `
            <div class="comparison-state">
              <span>${escapeHtml(entry.changeLabel ?? entry.title)}</span>
              <strong>${escapeHtml(artifactLabel(observation.primaryArtifact))} · ${observation.artifactCounts.calendar} Calendar</strong>
              <small>${dates}</small>
              ${observation.repeatValues.length > 0
                ? `<small>반복: ${escapeHtml(observation.repeatValues.join(', '))}</small>`
                : ''}
              ${observation.conditionValues.length > 0
                ? `<small>조건: ${escapeHtml(observation.conditionValues.join(', '))}</small>`
                : ''}
            </div>`;
        }).join('')}
      </div>
    </article>`).join('');
}

function existingContentRows(results: GrammarSimulationResult[]): string {
  return results
    .filter((result) => result.group === 'existing_content')
    .map((result) => `
      <tr>
        <td><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.sourceShape)}</small></td>
        <td>${result.observations.stepCount} / ${result.observations.itemCount}</td>
        <td>${escapeHtml(artifactLabel(result.naturalDestination))}</td>
        <td>${result.observations.artifactCounts.calendar}</td>
        <td>${result.observations.artifactCounts.todo}</td>
        <td>${result.observations.artifactCounts.sheet}</td>
        <td>${result.observations.issueCount}</td>
        <td><span class="mini-pass">${result.passed ? 'PASS' : 'FAIL'}</span></td>
      </tr>`).join('');
}

function uiEvidenceSection(evidence: UiSimulationEvidence | undefined): string {
  if (!evidence) {
    return `
      <div class="empty-evidence">
        UI 실행 증거 파일이 아직 없습니다. 의미 시뮬레이션 결과와 별도로
        <code>ui-simulation-evidence.json</code>을 생성한 뒤 이 리포트를 다시 빌드하세요.
      </div>`;
  }
  const checkRows = evidence.checks.map((check) => `
    <tr>
      <td><code>${escapeHtml(check.id)}</code></td>
      <td>${escapeHtml(check.target)}</td>
      <td>${escapeHtml(check.viewport)}</td>
      <td>${escapeHtml(check.action)}</td>
      <td>${escapeHtml(check.observed)}</td>
      <td><span class="${check.passed ? 'mini-pass' : 'mini-fail'}">${check.passed ? 'PASS' : 'FAIL'}</span></td>
    </tr>`).join('');
  const screenshots = evidence.screenshots.map((shot) => `
    <a class="screenshot-link" href="${escapeHtml(shot.file)}">
      <span>${escapeHtml(shot.label)}</span>
      <small>${escapeHtml(shot.viewport)}</small>
    </a>`).join('');
  return `
    <div class="evidence-meta">
      <span><b>실행</b> ${escapeHtml(evidence.executedAt)}</span>
      <span><b>브라우저</b> ${escapeHtml(evidence.browser)}</span>
      <span><b>Console error</b> ${evidence.consoleErrors.length}</span>
      <span><b>Page error</b> ${evidence.pageErrors.length}</span>
    </div>
    <div class="table-shell">
      <table>
        <thead><tr><th>ID</th><th>대상</th><th>화면</th><th>조작</th><th>관찰</th><th>결과</th></tr></thead>
        <tbody>${checkRows}</tbody>
      </table>
    </div>
    <div class="screenshot-links">${screenshots}</div>
    <p class="evidence-note">${escapeHtml(evidence.note)}</p>`;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const results = runGrammarSimulation(
  TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS,
);
const failedResults = results.filter((result) => !result.passed);
if (failedResults.length > 0) {
  throw new Error(
    `Grammar simulation failed: ${failedResults.map((result) => result.id).join(', ')}`,
  );
}

const uiEvidence = existsSync(UI_EVIDENCE_PATH)
  ? JSON.parse(readFileSync(UI_EVIDENCE_PATH, 'utf8')) as UiSimulationEvidence
  : undefined;
const repoStatus = git(['status', '--short']);
const repo = {
  branch: git(['branch', '--show-current']),
  commit: git(['rev-parse', '--short=12', 'HEAD']),
  dirtyPathCount: repoStatus ? repoStatus.split(/\r?\n/u).length : 0,
};
const standalone = existsSync(STANDALONE_PATH)
  ? {
      file: relative(REPO_ROOT, STANDALONE_PATH).replaceAll('\\', '/'),
      bytes: statSync(STANDALONE_PATH).size,
      sha256: sha256(STANDALONE_PATH),
    }
  : null;
const groupCounts = Object.fromEntries(
  ['existing_content', 'condition_change', 'compatibility', 'error_boundary']
    .map((group) => [
      group,
      results.filter((result) => result.group === group).length,
    ]),
);
const uiPassed = uiEvidence?.checks.filter((check) => check.passed).length ?? 0;
const uiTotal = uiEvidence?.checks.length ?? 0;
const findings = [
  {
    status: 'confirmed',
    title: '상대 날짜는 실제 기준일이 있어야 Calendar가 된다',
    detail:
      '기준 대상 이름만 있을 때 Todo 2 / Calendar 0이며, 2026-08-10을 주면 2026-08-07과 2026-08-10 두 날짜가 생긴다.',
  },
  {
    status: 'confirmed',
    title: '반복과 조건은 의미를 보존하지만 아직 실행 엔진은 아니다',
    detail:
      '매주·매월 문구와 조건은 canonical Markdown 및 ICS 설명에 남지만, 반복 회차를 펼치지 않고 RRULE도 만들지 않는다.',
  },
  {
    status: 'confirmed',
    title: '표와 긴 목록은 행을 축약하지 않는다',
    detail:
      'K-MOOC 14행, LibriVox 38행, 신차 14개, 이사 27개가 원문 순서와 수량을 유지했다.',
  },
  {
    status: 'confirmed',
    title: '모호한 값은 추정하지 않고 원문 + 이슈로 남긴다',
    detail:
      '8월 3일, 내일, 담당자 속성, URL-only, 설명 문장은 자동 날짜·Item·필드로 발명되지 않았다.',
  },
  {
    status: 'decision',
    title: 'Anchor 변경 시 preflight identity 정책은 별도 결정이 필요하다',
    detail:
      '현재 날짜와 ICS 내용은 바뀌지만 preflightId 입력에는 anchor/date가 포함되지 않는다. 저장·영수증 동일성 정책을 정한 뒤 수정 여부를 결정해야 한다.',
  },
  {
    status: 'decision',
    title: '원문 이슈와 외부 산출물의 표시 수준을 정해야 한다',
    detail:
      'invalid/unknown 값은 raw source와 이슈에는 남지만 지원 Markdown·artifact에는 빠지거나 설명으로 평탄화된다. “내보내기 전 확인” 노출 정책이 필요하다.',
  },
];

const reportData = {
  schemaVersion: 'flowme-text-authoring-grammar-simulation-v1',
  generatedAt: GENERATED_AT,
  goal:
    '기존 FLOW 콘텐츠와 단일 조건 변경을 현재 문법·산출물·UI에 적용해 의미 보존과 오류 경계를 검증한다.',
  claimBoundary:
    '자동화된 내부 시뮬레이션 및 QA 결과이며, 관찰 사용자 검증이나 공개 준비 완료를 뜻하지 않는다.',
  repo,
  standalone,
  summary: {
    scenarioCount: results.length,
    passedScenarioCount: results.filter((result) => result.passed).length,
    failedScenarioCount: failedResults.length,
    groupCounts,
    uiPassed,
    uiTotal,
  },
  findings,
  uiEvidence: uiEvidence ?? null,
  scenarios: TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.map(
    (scenario, index) => ({
      ...results[index],
      rawText: scenario.rawText,
      expected: scenario.expected,
    }),
  ),
};

writeFileSync(RESULT_PATH, `${JSON.stringify(reportData, null, 2)}\n`, 'utf8');

const reportHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe 문법 적용 시뮬레이션 · 2026-07-31</title>
  <style>
    :root {
      --ink: #18231d;
      --muted: #66736b;
      --line: #dbe3dd;
      --paper: #ffffff;
      --canvas: #f4f7f3;
      --green: #28624a;
      --green-soft: #e6f1ea;
      --mint: #cfe4d7;
      --amber: #9a5d17;
      --amber-soft: #fff1d8;
      --red: #a63c35;
      --red-soft: #feeceb;
      --blue: #325b7c;
      --blue-soft: #e8f0f6;
      --shadow: 0 12px 34px rgba(25, 55, 39, .08);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--canvas);
      font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif;
      line-height: 1.55;
    }
    a { color: inherit; }
    button, input { font: inherit; }
    .page { width: min(1220px, calc(100% - 40px)); margin: 0 auto; }
    .hero {
      padding: 58px 0 32px;
      border-bottom: 1px solid var(--line);
      background: var(--paper);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(260px, .5fr);
      gap: 40px;
      align-items: end;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      color: var(--green);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .04em;
    }
    .kicker::before {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--green);
    }
    h1 {
      margin: 0;
      max-width: 820px;
      font-size: clamp(34px, 5vw, 62px);
      line-height: 1.08;
      letter-spacing: -.045em;
    }
    .hero-lead {
      max-width: 760px;
      margin: 22px 0 0;
      color: #4e5d54;
      font-size: 18px;
    }
    .scope-note {
      padding: 20px;
      border: 1px solid #b9d1c1;
      border-radius: 18px;
      background: var(--green-soft);
      font-size: 14px;
    }
    .scope-note strong { display: block; margin-bottom: 8px; color: var(--green); }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      padding: 24px 0;
    }
    .summary-card {
      min-height: 132px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--paper);
      box-shadow: var(--shadow);
    }
    .summary-card span { color: var(--muted); font-size: 13px; }
    .summary-card strong {
      display: block;
      margin: 6px 0 2px;
      font-size: 32px;
      letter-spacing: -.04em;
    }
    .summary-card small { color: var(--green); font-weight: 700; }
    main { padding: 16px 0 72px; }
    section { margin-top: 56px; scroll-margin-top: 20px; }
    .section-heading {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: end;
      margin-bottom: 18px;
    }
    .section-heading h2 { margin: 0; font-size: 28px; letter-spacing: -.025em; }
    .section-heading p { max-width: 610px; margin: 0; color: var(--muted); }
    .conclusion-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .finding {
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--paper);
    }
    .finding.decision { border-color: #e5c898; background: #fffaf0; }
    .finding .tag {
      display: inline-block;
      margin-bottom: 10px;
      color: var(--green);
      font-size: 12px;
      font-weight: 800;
    }
    .finding.decision .tag { color: var(--amber); }
    .finding h3 { margin: 0 0 8px; font-size: 18px; }
    .finding p { margin: 0; color: var(--muted); font-size: 14px; }
    .comparison-stack { display: grid; gap: 14px; }
    .comparison-card {
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--paper);
      overflow: hidden;
    }
    .comparison-label {
      margin-bottom: 14px;
      color: var(--green);
      font-size: 13px;
      font-weight: 800;
    }
    .comparison-track {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }
    .comparison-state {
      min-width: 210px;
      flex: 1;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fafcf9;
    }
    .comparison-state span, .comparison-state small { display: block; }
    .comparison-state span { color: var(--muted); font-size: 12px; }
    .comparison-state strong { display: block; margin: 7px 0; font-size: 15px; }
    .comparison-state small { color: #59665e; }
    .table-shell {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--paper);
    }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid var(--line); text-align: left; }
    th {
      color: var(--muted);
      background: #f8faf7;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .03em;
    }
    td { font-size: 14px; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    td small { display: block; margin-top: 3px; color: var(--muted); }
    .mini-pass, .mini-fail {
      display: inline-flex;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }
    .mini-pass { color: var(--green); background: var(--green-soft); }
    .mini-fail { color: var(--red); background: var(--red-soft); }
    .evidence-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .evidence-meta span {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--paper);
      color: var(--muted);
      font-size: 12px;
    }
    .evidence-meta b { color: var(--ink); }
    .empty-evidence, .evidence-note {
      padding: 18px;
      border: 1px dashed #b9c6bd;
      border-radius: 16px;
      color: var(--muted);
      background: #fafcf9;
    }
    .screenshot-links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }
    .screenshot-link {
      display: flex;
      min-width: 190px;
      flex-direction: column;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--paper);
      text-decoration: none;
    }
    .screenshot-link:hover { border-color: var(--green); }
    .screenshot-link small { color: var(--muted); }
    .controls {
      position: sticky;
      top: 10px;
      z-index: 5;
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 16px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: rgba(255, 255, 255, .96);
      box-shadow: var(--shadow);
    }
    .filter-row { display: flex; gap: 6px; overflow-x: auto; }
    .filter-button {
      flex: 0 0 auto;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: var(--paper);
      cursor: pointer;
    }
    .filter-button[aria-pressed="true"] {
      color: #fff;
      border-color: var(--green);
      background: var(--green);
    }
    .search {
      min-width: 220px;
      margin-left: auto;
      padding: 9px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--ink);
      background: #fafcf9;
    }
    .scenario-list { display: grid; gap: 14px; }
    .scenario-card {
      padding: 22px;
      border: 1px solid var(--line);
      border-left: 5px solid var(--green);
      border-radius: 18px;
      background: var(--paper);
      box-shadow: 0 8px 24px rgba(25, 55, 39, .05);
    }
    .scenario-card.is-fail { border-left-color: var(--red); }
    .scenario-card[hidden] { display: none; }
    .scenario-heading {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: start;
    }
    .scenario-heading h3 { margin: 8px 0 4px; font-size: 21px; }
    .scenario-heading p { margin: 0; color: var(--muted); }
    .eyebrow-row { display: flex; align-items: center; gap: 8px; }
    .eyebrow-row code { color: #748078; font-size: 11px; }
    .group-pill, .result-pill {
      display: inline-flex;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }
    .group-existing-content { color: var(--green); background: var(--green-soft); }
    .group-condition-change { color: var(--blue); background: var(--blue-soft); }
    .group-compatibility { color: #6d4f86; background: #f1eafa; }
    .group-error-boundary { color: var(--amber); background: var(--amber-soft); }
    .result-pill.pass { color: var(--green); background: var(--green-soft); }
    .result-pill.fail { color: var(--red); background: var(--red-soft); }
    .scenario-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }
    .scenario-metrics span {
      padding: 7px 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--muted);
      background: #fafcf9;
      font-size: 12px;
    }
    .scenario-metrics b { color: var(--ink); font-size: 14px; }
    .scenario-facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      overflow: hidden;
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--line);
    }
    .scenario-facts div { padding: 12px; background: var(--paper); }
    .scenario-facts dt { color: var(--muted); font-size: 11px; }
    .scenario-facts dd { margin: 4px 0 0; font-size: 13px; font-weight: 700; }
    .boundary {
      display: flex;
      gap: 12px;
      margin-top: 14px;
      padding: 13px 14px;
      border-radius: 12px;
      background: #f5f8f4;
      color: #4e5d54;
      font-size: 13px;
    }
    .boundary b { flex: 0 0 auto; color: var(--green); }
    details { margin-top: 14px; border-top: 1px solid var(--line); }
    summary { padding: 14px 0 0; color: var(--green); font-weight: 800; cursor: pointer; }
    .details-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
      gap: 16px;
      margin-top: 12px;
    }
    .details-grid h4 { margin: 0 0 8px; }
    pre {
      max-height: 420px;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border-radius: 12px;
      color: #dce8df;
      background: #1c2821;
      font: 12px/1.6 Consolas, "SFMono-Regular", monospace;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .check-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .check-list li {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border-radius: 10px;
      background: #f7f9f6;
      font-size: 12px;
    }
    .check-list li span { color: var(--green); font-weight: 800; }
    .check-list li.check-fail span { color: var(--red); }
    .check-list code { grid-column: 1 / -1; overflow-wrap: anywhere; }
    .method {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .method article {
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--paper);
    }
    .method h3 { margin: 0 0 7px; font-size: 16px; }
    .method p { margin: 0; color: var(--muted); font-size: 13px; }
    .artifact-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .artifact-link {
      display: inline-flex;
      padding: 10px 14px;
      border-radius: 10px;
      color: #fff;
      background: var(--green);
      text-decoration: none;
      font-weight: 800;
      font-size: 13px;
    }
    .artifact-link.secondary { color: var(--green); background: var(--green-soft); }
    footer {
      padding: 28px 0 44px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 900px) {
      .hero-grid, .details-grid { grid-template-columns: 1fr; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scenario-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .method { grid-template-columns: 1fr; }
      .controls { align-items: stretch; flex-direction: column; }
      .search { width: 100%; min-width: 0; margin: 0; }
    }
    @media (max-width: 620px) {
      .page { width: min(100% - 24px, 1220px); }
      .hero { padding-top: 36px; }
      h1 { font-size: 36px; }
      .hero-lead { font-size: 16px; }
      .summary-grid, .conclusion-grid { grid-template-columns: 1fr; }
      .summary-card { min-height: 0; }
      .section-heading, .scenario-heading { align-items: start; flex-direction: column; }
      .scenario-card { padding: 18px 15px; }
      .scenario-facts { grid-template-columns: 1fr; }
      .result-pill { align-self: flex-start; }
      .boundary { flex-direction: column; gap: 4px; }
      section { margin-top: 42px; }
    }
    @media print {
      body { background: #fff; }
      .controls { display: none; }
      .scenario-card { break-inside: avoid; box-shadow: none; }
      details { display: none; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="page hero-grid">
      <div>
        <div class="kicker">TA-GRAMMAR-SIM-01 · 2026-07-31</div>
        <h1>Flow 문법, 실제 콘텐츠에 얼마나 버티는가</h1>
        <p class="hero-lead">
          기존 FLOW 콘텐츠 8종과 한 조건씩 바꾼 문법 사례를 같은 작성기와
          Calendar·Todo·Sheet·Memo 산출물에 통과시켰습니다.
        </p>
      </div>
      <aside class="scope-note">
        <strong>검증 범위</strong>
        자동화된 내부 시뮬레이션과 브라우저 QA입니다.
        사용자 관찰 검증, 공개 준비 완료, AI 자동 생성 성능은 포함하지 않습니다.
      </aside>
    </div>
  </header>

  <div class="page summary-grid" aria-label="시뮬레이션 요약">
    <article class="summary-card"><span>전체 시나리오</span><strong>${results.length}</strong><small>${results.length}/${results.length} 의미 검사 통과</small></article>
    <article class="summary-card"><span>기존 콘텐츠</span><strong>${groupCounts.existing_content}</strong><small>최대 38행까지 보존</small></article>
    <article class="summary-card"><span>조건·호환·오류</span><strong>${Number(groupCounts.condition_change) + Number(groupCounts.compatibility) + Number(groupCounts.error_boundary)}</strong><small>한 조건씩 변경</small></article>
    <article class="summary-card"><span>브라우저 UI</span><strong>${uiTotal > 0 ? `${uiPassed}/${uiTotal}` : '—'}</strong><small>${uiTotal > 0 ? '자동 UI 확인' : '증거 파일 대기'}</small></article>
  </div>

  <main class="page">
    <section id="conclusion">
      <div class="section-heading">
        <div><h2>한눈에 본 결론</h2></div>
        <p>현재 문법이 잘하는 일과 아직 제품 결정이 필요한 일을 분리했습니다.</p>
      </div>
      <div class="conclusion-grid">
        ${findings.map((finding) => `
          <article class="finding ${finding.status === 'decision' ? 'decision' : ''}">
            <span class="tag">${finding.status === 'decision' ? '결정 필요' : '확인됨'}</span>
            <h3>${escapeHtml(finding.title)}</h3>
            <p>${escapeHtml(finding.detail)}</p>
          </article>`).join('')}
      </div>
    </section>

    <section id="changes">
      <div class="section-heading">
        <div><h2>한 조건씩 바꾸면</h2></div>
        <p>기준일, 날짜 표현, 반복, 조건, 표 형식만 바꾸고 Item 수와 원문 의미가 흔들리지 않는지 비교했습니다.</p>
      </div>
      <div class="comparison-stack">${comparisonSection(results)}</div>
    </section>

    <section id="content">
      <div class="section-heading">
        <div><h2>기존 FLOW 콘텐츠 8종</h2></div>
        <p>자연스러운 목적지를 먼저 정하고, 원문 수량과 순서를 그대로 대조했습니다.</p>
      </div>
      <div class="table-shell">
        <table>
          <thead><tr><th>콘텐츠</th><th>Step / Item</th><th>목적지</th><th>Calendar</th><th>Todo</th><th>Sheet</th><th>Issue</th><th>결과</th></tr></thead>
          <tbody>${existingContentRows(results)}</tbody>
        </table>
      </div>
    </section>

    <section id="ui">
      <div class="section-heading">
        <div><h2>현재 UI 적용 결과</h2></div>
        <p>실시간 반영, 예시 전환, 결과 탭, 오류 수정, 작은 화면 스크롤을 route와 standalone에서 확인합니다.</p>
      </div>
      ${uiEvidenceSection(uiEvidence)}
    </section>

    <section id="scenarios">
      <div class="section-heading">
        <div><h2>27개 시나리오 자세히 보기</h2></div>
        <p>필터나 검색으로 사례를 좁히고, 입력 문법과 각 검사의 실제 관찰값을 펼쳐볼 수 있습니다.</p>
      </div>
      <div class="controls">
        <div class="filter-row" role="group" aria-label="시나리오 필터">
          <button class="filter-button" type="button" data-filter="all" aria-pressed="true">전체 ${results.length}</button>
          <button class="filter-button" type="button" data-filter="existing_content" aria-pressed="false">기존 콘텐츠 ${groupCounts.existing_content}</button>
          <button class="filter-button" type="button" data-filter="condition_change" aria-pressed="false">조건 변경 ${groupCounts.condition_change}</button>
          <button class="filter-button" type="button" data-filter="compatibility" aria-pressed="false">호환 ${groupCounts.compatibility}</button>
          <button class="filter-button" type="button" data-filter="error_boundary" aria-pressed="false">오류 ${groupCounts.error_boundary}</button>
        </div>
        <input class="search" type="search" placeholder="예: 반복, K-MOOC, 날짜" aria-label="시나리오 검색">
      </div>
      <div class="scenario-list">
        ${results.map((result, index) => scenarioCard(
          result,
          TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS[index].rawText,
        )).join('')}
      </div>
    </section>

    <section id="method">
      <div class="section-heading">
        <div><h2>검증 방법과 산출물</h2></div>
        <p>같은 입력을 parser, canonical 구조, projection, preflight, Markdown, ICS 순으로 확인했습니다.</p>
      </div>
      <div class="method">
        <article><h3>1. 원문 보존</h3><p>SourceRow → Item → Step → Flow 계보를 유지하고 원문에 없는 날짜·행동·주기를 만들지 않습니다.</p></article>
        <article><h3>2. 자연스러운 목적지</h3><p>날짜는 Calendar, 명시 행동은 Todo, 원문 표는 Sheet, 설명·주의는 Memo로 projection합니다.</p></article>
        <article><h3>3. 실패 경계</h3><p>모호한 값은 자동 보정하지 않고 원문과 이슈로 남깁니다. 사용자 검증으로 표현하지 않습니다.</p></article>
      </div>
      <div class="artifact-links">
        ${standalone ? `<a class="artifact-link" href="../2026-07-29-flowme-text-authoring-ta-implementation/flowme-text-authoring-ta-test.html">Standalone 작성기 열기</a>` : ''}
        <a class="artifact-link secondary" href="grammar-simulation-results.json">전체 JSON 결과</a>
        <a class="artifact-link secondary" href="README.md">실행 명령 보기</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="page">
      Branch ${escapeHtml(repo.branch)} · Commit ${escapeHtml(repo.commit)} ·
      Dirty paths ${repo.dirtyPathCount} · Generated ${escapeHtml(GENERATED_AT)}
      ${standalone ? ` · Standalone SHA-256 ${escapeHtml(standalone.sha256.slice(0, 16))}…` : ''}
    </div>
  </footer>

  <script>
    (() => {
      const buttons = [...document.querySelectorAll('[data-filter]')];
      const cards = [...document.querySelectorAll('.scenario-card')];
      const search = document.querySelector('.search');
      let activeFilter = 'all';
      const apply = () => {
        const query = (search.value || '').trim().toLocaleLowerCase();
        cards.forEach((card) => {
          const groupMatches = activeFilter === 'all' || card.dataset.group === activeFilter;
          const searchMatches = !query || (card.dataset.search || '').includes(query);
          card.hidden = !(groupMatches && searchMatches);
        });
      };
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          activeFilter = button.dataset.filter;
          buttons.forEach((candidate) => candidate.setAttribute(
            'aria-pressed',
            String(candidate === button),
          ));
          apply();
        });
      });
      search.addEventListener('input', apply);
    })();
  </script>
</body>
</html>`;

writeFileSync(REPORT_PATH, reportHtml, 'utf8');

const readme = `# FlowMe Text Authoring Grammar Simulation

Date: 2026-07-31  
Goal: TA-GRAMMAR-SIM-01

## Run

\`\`\`powershell
npm.cmd run sync:text-authoring-demo-examples
npm.cmd run build:text-authoring-html
npm.cmd run capture:text-authoring-grammar-ui
npm.cmd run simulate:text-authoring-grammar
npx.cmd tsx --test lib/flow/text-authoring/grammar-simulation.test.ts
\`\`\`

## Outputs

- \`flowme-text-authoring-grammar-simulation-ko.html\`
- \`grammar-simulation-results.json\`
- \`ui-simulation-evidence.json\` and screenshots when browser evidence is present

## Claim boundary

This is automated internal simulation and QA. It is not observed-user
validation, public readiness, deployment evidence, or AI generation quality.

## Current repository snapshot

- Branch: \`${repo.branch}\`
- Commit: \`${repo.commit}\`
- Dirty paths at generation: ${repo.dirtyPathCount}
- Scenario result: ${results.length}/${results.length} passed
- Demo dropdown: existing content 8, condition changes 8, compatibility 6, expected-review inputs 5
${uiTotal > 0 ? `- Route/standalone UI result: ${uiPassed}/${uiTotal} passed` : '- Route/standalone UI result: not captured'}
${standalone ? `- Standalone bytes: ${standalone.bytes}
- Standalone SHA-256: \`${standalone.sha256}\`` : '- Standalone: not found'}
`;
writeFileSync(README_PATH, readme, 'utf8');

console.log(JSON.stringify({
  report: relative(REPO_ROOT, REPORT_PATH).replaceAll('\\', '/'),
  results: relative(REPO_ROOT, RESULT_PATH).replaceAll('\\', '/'),
  readme: relative(REPO_ROOT, README_PATH).replaceAll('\\', '/'),
  scenarios: results.length,
  passed: results.filter((result) => result.passed).length,
  ui: uiEvidence
    ? `${uiPassed}/${uiTotal}`
    : 'not-attached',
}, null, 2));
