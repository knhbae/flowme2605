import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const defaultHtml = path.join(repoRoot, 'docs/content-audit/2026-07-21-flow-content-generalization-benchmark-v1-ko.html');
const ROLES = ['rules', 'low_cost', 'high_capability'];

function parseArgs(argv) {
  const options = { html: defaultHtml };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--html') options.html = path.resolve(argv[++index]);
    else if (argv[index] === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return options;
}

function extractEmbeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  if (!match) throw new Error(`Missing embedded JSON script #${id}.`);
  return JSON.parse(match[1]);
}

function count(text, pattern) {
  return (text.match(pattern) || []).length;
}

function verify(htmlPath) {
  if (!fs.existsSync(htmlPath)) throw new Error(`Benchmark HTML does not exist: ${htmlPath}`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const data = extractEmbeddedJson(html, 'benchmarkData');
  const errors = [];
  const ensure = (condition, message) => { if (!condition) errors.push(message); };

  ensure(Array.isArray(data.cases) && data.cases.length === 18, `embedded case count must be 18; found ${data.cases?.length ?? 0}.`);
  ensure(new Set((data.cases || []).map((entry) => entry.caseId)).size === 18, 'embedded case IDs must be unique.');
  ensure(data.metrics?.decisiveScope === 'final_holdout', 'metrics decisiveScope must be final_holdout.');
  ensure(data.metrics?.finalGeneralizationAssessment, 'final generalization assessment is missing.');
  ensure(data.comparison?.comparisonScope === 'final_holdout', 'model comparison must use final_holdout.');
  ensure(count(html, /class="case-slide"/g) === 18, 'static HTML must contain 18 case slides.');
  ensure(count(html, /class="teaser"/g) === 3, 'first page must contain exactly 3 actual case teasers.');
  ensure(count(html, /class="role-card"/g) === 54, 'static HTML must contain 54 role cards.');
  ensure(ROLES.every((role) => count(html, new RegExp(`data-role="${role}"`, 'g')) === 18), 'each role must appear exactly 18 times.');
  ensure((data.cases || []).every((entry) => html.includes(`id="case-${entry.caseId}"`)), 'every embedded case must have a static case section.');
  ensure((data.cases || []).every((entry) => entry.sourceRows?.length > 0 || entry.gold?.admissionLabel === 'boundary'), 'positive cases require visible SourceRows.');
  ensure((data.cases || []).every((entry) => html.includes(entry.sourceUrl.replace(/&/g, '&amp;'))), 'every case must expose its actual source URL.');

  for (const id of ['statusFilter', 'providerFilter', 'formatFilter', 'artifactFilter', 'roleFilter', 'outcomeFilter', 'disagreementFilter']) {
    ensure(html.includes(`id="${id}"`), `missing filter #${id}.`);
  }
  ensure(html.includes('@media(max-width:1080px)') && html.includes('@media(max-width:700px)'), 'desktop/mobile responsive CSS gates are missing.');
  ensure(html.includes('@media print'), 'PPT-like print/page-break styling is missing.');
  ensure(html.includes('min-height:900px'), '1440x900 slide baseline is missing.');
  ensure(!/<script[^>]+src=/i.test(html), 'single-file report must not load external scripts.');
  ensure(!/<link[^>]+rel=["']stylesheet/i.test(html), 'single-file report must not load external stylesheets.');
  ensure(!/\b(?:TODO|TBD|PLACEHOLDER)\b/.test(html), 'placeholder marker found in final HTML.');
  ensure(!/추정\s*비용|estimated\s*cost/i.test(html), 'report must not present estimated cost as evidence.');
  ensure(html.includes('자동 QA와 내부 adjudication은 관찰 사용자 검증이 아닙니다.'), 'observed-user validation boundary is missing.');

  const adjudicationEntries = (data.cases || []).flatMap((entry) => Object.values(entry.roles || {}).map((role) => role.finalEntry)).filter(Boolean);
  ensure(adjudicationEntries.length === 54, `embedded adjudication coverage must be 54; found ${adjudicationEntries.length}.`);
  for (const entry of data.cases || []) {
    for (const [role, roleView] of Object.entries(entry.roles || {})) {
      const run = roleView.run;
      ensure(run?.canonical?.items?.every((item) => Array.isArray(item.sourceRefs)), `${entry.caseId}:${role} has an Item without sourceRefs array.`);
      const actualCost = roleView.computed?.measurements?.actualCost;
      if (actualCost !== null && actualCost !== undefined) {
        ensure(typeof actualCost === 'number' && Number.isFinite(actualCost), `${entry.caseId}:${role} actual cost must be numeric or null.`);
        ensure(run.processor.measuredInputTokens !== null && run.processor.measuredOutputTokens !== null, `${entry.caseId}:${role} has cost without measured tokens.`);
      }
    }
  }

  if (errors.length) throw new Error(`Benchmark HTML verification failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  return { htmlPath, caseCount: data.cases.length, roleCardCount: 54 };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node scripts/content-audit/verify-flow-content-generalization-benchmark-v1.mjs [--html <report.html>]');
    return;
  }
  const result = verify(options.html);
  console.log(`PASS benchmark HTML: ${result.caseCount} cases, ${result.roleCardCount} role cards -> ${result.htmlPath}`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export { verify };
