import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const defaultSpecDir = path.join(repoRoot, 'docs/specs/2026-07-21-flow-content-generalization-benchmark-v1');
const defaultOutput = path.join(repoRoot, 'docs/content-audit/2026-07-21-flow-content-generalization-benchmark-v1-ko.html');
const ROLES = ['rules', 'low_cost', 'high_capability'];
const ROLE_LABELS = { rules: '규칙 기반', low_cost: '저비용 역할', high_capability: '고성능 역할' };
const ARTIFACTS = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
const ARTIFACT_LABELS = { calendar: 'Calendar', checklist: 'Checklist', todo: 'Todo', sheet: 'Sheet', memo: 'Memo' };
const STATE_LABELS = {
  ready: 'ready', needs_confirmation: 'needs confirmation', source_import_required: 'source import required',
  hold: 'hold', blocked: 'blocked',
};

function parseArgs(argv) {
  const options = { specDir: defaultSpecDir, output: defaultOutput };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--spec-dir') options.specDir = path.resolve(argv[++index]);
    else if (arg === '--output') options.output = path.resolve(argv[++index]);
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/content-audit/build-flow-content-generalization-benchmark-v1.mjs',
    '  node scripts/content-audit/build-flow-content-generalization-benchmark-v1.mjs --spec-dir <dir> --output <html>',
    '',
    'The builder refuses to emit a final report until all 18 cases, 54 independent runs,',
    'completed adjudication, final holdout results, model comparison, and metrics exist.',
  ].join('\n');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJson(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  });
}

function loadRuns(specDir) {
  const runs = [];
  for (const role of ROLES) {
    const roleDir = path.join(specDir, 'runs', role === 'low_cost' ? 'low-cost' : role === 'high_capability' ? 'high-capability' : role);
    for (const file of walkJson(roleDir)) {
      const document = readJson(file);
      const candidates = Array.isArray(document) ? document : Array.isArray(document.runs) ? document.runs : [document];
      for (const run of candidates) {
        if (run?.caseId && run?.processor?.role) runs.push(run);
      }
    }
  }
  return runs;
}

function requireCompleteData(specDir) {
  const files = {
    manifest: 'source-manifest-v1.json',
    packets: 'blind-source-packets-v1.json',
    gold: 'gold-source-contract-v1.json',
    calibration: 'calibration-results-v1.json',
    finalHoldout: 'final-holdout-results-v1.json',
    comparison: 'model-comparison-v1.json',
    metrics: 'benchmark-metrics-v1.json',
    adjudication: 'final-adjudication-v1.json',
  };
  const missing = Object.entries(files)
    .filter(([, filename]) => !fs.existsSync(path.join(specDir, filename)))
    .map(([label, filename]) => `${label}: ${filename}`);
  if (missing.length) {
    throw new Error(`Final benchmark data are incomplete; report was not written.\nMissing required files:\n- ${missing.join('\n- ')}`);
  }

  const documents = Object.fromEntries(Object.entries(files).map(([key, filename]) => [key, readJson(path.join(specDir, filename))]));
  documents.calibrationComparison = fs.existsSync(path.join(specDir, 'calibration-revision-comparison-v1.json'))
    ? readJson(path.join(specDir, 'calibration-revision-comparison-v1.json'))
    : null;
  documents.runs = loadRuns(specDir);
  return documents;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Final benchmark data validation failed: ${message}`);
}

function validateData(data) {
  const manifestCases = data.manifest?.cases || [];
  const goldCases = data.gold?.cases || [];
  const packetCases = data.packets?.cases || [];
  assert(manifestCases.length === 18, `manifest must contain 18 cases; found ${manifestCases.length}.`);
  assert(goldCases.length === 18, `gold contract must contain 18 cases; found ${goldCases.length}.`);
  assert(packetCases.length === 18, `blind source packets must contain 18 cases; found ${packetCases.length}.`);
  assert(manifestCases.filter((entry) => entry.split === 'calibration').length === 12, 'calibration split must contain 12 cases.');
  assert(manifestCases.filter((entry) => entry.split === 'final_holdout').length === 6, 'final holdout split must contain 6 cases.');

  const caseIds = manifestCases.map((entry) => entry.caseId);
  assert(new Set(caseIds).size === 18, 'manifest case IDs must be unique.');
  assert(goldCases.every((entry) => caseIds.includes(entry.caseId)), 'gold contract case coverage differs from manifest.');
  assert(packetCases.every((entry) => caseIds.includes(entry.caseId)), 'source packet case coverage differs from manifest.');

  const runKeys = data.runs.map((run) => `${run.caseId}:${run.processor.role}`);
  assert(data.runs.length === 54, `expected 54 independent runs; found ${data.runs.length}.`);
  assert(new Set(runKeys).size === 54, 'run case/role keys must be unique.');
  for (const caseId of caseIds) {
    for (const role of ROLES) assert(runKeys.includes(`${caseId}:${role}`), `missing run ${caseId}:${role}.`);
  }

  const adjudicationEntries = data.adjudication?.entries || [];
  assert(adjudicationEntries.length === 54, `final adjudication must contain 54 entries; found ${adjudicationEntries.length}.`);
  assert(
    typeof data.adjudication?.adjudicator?.humanReviewerConfirmed === 'boolean',
    'final adjudication must explicitly state whether a human reviewer confirmed it.',
  );
  assert((data.finalHoldout?.records || []).length === 18, 'final holdout results must contain 18 role records.');
  assert((data.calibration?.records || []).length === 36, 'calibration results must contain 36 role records.');
  assert(data.metrics?.decisiveScope === 'final_holdout', 'benchmark metrics must declare final_holdout as decisive scope.');
  assert(data.comparison?.comparisonScope === 'final_holdout', 'model comparison must use final_holdout scope.');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

function formatRate(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(value === 1 ? 0 : 1)}%` : '측정 안 됨';
}

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('ko-KR') : '측정 안 됨';
}

function valueOrNotMeasured(value, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${formatNumber(value)}${suffix}` : '측정 안 됨';
}

function projectionOffered(projection) {
  return projection && !['not_applicable', 'blocked', 'not_available'].includes(projection.availability);
}

const OFFICIAL_CASE_IDS = new Set(['GB-01', 'GB-02', 'GB-03', 'GB-04', 'GB-07', 'GB-08', 'GB-12', 'GB-13', 'GB-14', 'GB-15', 'GB-17']);
const CREATOR_CASE_IDS = new Set(['GB-05', 'GB-11', 'GB-16', 'GB-18']);

function providerGroup(caseId) {
  if (OFFICIAL_CASE_IDS.has(caseId)) return 'official';
  if (CREATOR_CASE_IDS.has(caseId)) return 'creator';
  return 'platform';
}

function sourceFormatGroup(sourceFormat) {
  if (sourceFormat.includes('video')) return 'video';
  if (/(pdf|csv|table|curriculum|file)/.test(sourceFormat)) return 'table_file';
  return 'web';
}

function rolePass(computed) {
  if (!computed) return false;
  if (computed.goldAdmissionLabel === 'boundary') return computed.boundary?.correctStop === true && computed.review?.correctStopJudged === true;
  return computed.comparisons?.flowPossible?.match === true
    && computed.comparisons?.primaryArtifact?.match === true
    && computed.review?.directlyUsablePositive === true;
}

function buildViewModel(data) {
  const goldById = new Map(data.gold.cases.map((entry) => [entry.caseId, entry]));
  const packetById = new Map(data.packets.cases.map((entry) => [entry.caseId, entry]));
  const runByKey = new Map(data.runs.map((entry) => [`${entry.caseId}:${entry.processor.role}`, entry]));
  const adjudicationByKey = new Map(data.adjudication.entries.map((entry) => [`${entry.caseId}:${entry.role}`, entry]));
  const cases = data.manifest.cases.map((manifestCase) => {
    const goldCase = goldById.get(manifestCase.caseId);
    const packet = packetById.get(manifestCase.caseId);
    const roles = Object.fromEntries(ROLES.map((role) => {
      const run = runByKey.get(`${manifestCase.caseId}:${role}`);
      const finalEntry = adjudicationByKey.get(`${manifestCase.caseId}:${role}`);
      return [role, { run, finalEntry, computed: finalEntry?.computed || null, adjudication: finalEntry?.adjudication || null }];
    }));
    const firstTitle = ROLES.map((role) => roles[role].run?.canonical?.title).find(Boolean);
    const title = packet?.sourceMetadata?.title || firstTitle || goldCase.gold.userJob || manifestCase.caseId;
    const states = ROLES.map((role) => roles[role].run.feasibility.state);
    const artifacts = ROLES.map((role) => roles[role].run.classification.primaryArtifact).filter(Boolean);
    const possibilities = ROLES.map((role) => roles[role].run.feasibility.flowPossible);
    const disagreement = new Set(states).size > 1 || new Set(artifacts).size > 1 || new Set(possibilities).size > 1;
    const outcome = ROLES.every((role) => rolePass(roles[role].computed)) ? 'success' : 'failure';
    return {
      ...manifestCase,
      title,
      gold: goldCase.gold,
      sourceRows: goldCase.sourceRows,
      packet,
      roles,
      states: [...new Set(states)],
      artifacts: [...new Set([goldCase.gold.naturalArtifact, ...artifacts].filter(Boolean))],
      provider: packet?.sourceMetadata?.provider || new URL(manifestCase.sourceUrl).hostname,
      sourceFormat: packet?.sourceMetadata?.sourceFormat || 'unknown',
      providerGroup: providerGroup(manifestCase.caseId),
      sourceFormatGroup: sourceFormatGroup(packet?.sourceMetadata?.sourceFormat || 'unknown'),
      disagreement,
      outcome,
    };
  });
  return { cases, data };
}

function statusBadge(state) {
  return `<span class="status status-${esc(state)}">${esc(STATE_LABELS[state] || state)}</span>`;
}

function renderMetricCards(data) {
  const overall = data.metrics.finalHoldout.overall;
  const cards = [
    ['Flow 판정', formatRate(overall.flowPossibilityAgreement?.rate), '목표 ≥ 85%'],
    ['경계 recall', formatRate(overall.boundaryRecall?.rate), '목표 100%'],
    ['SourceRow 의미 보존', formatRate(overall.sourceRowMeaningPreservation?.rate), '목표 ≥ 90%'],
    ['Primary artifact', formatRate(overall.primaryArtifactAgreement?.positiveRate), '목표 ≥ 85%'],
    ['발명 라벨', formatNumber(overall.inventions?.total), '목표 0'],
    ['삭제·대수정', formatRate(overall.reviewedItemChanges?.combinedRate), '목표 ≤ 20%'],
  ];
  return cards.map(([label, value, note]) => `<article class="metric-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
}

function renderCaseTeaser(caseView) {
  const firstRows = caseView.sourceRows.slice(0, 2);
  return `<article class="teaser">
    <div class="teaser-top"><span>${esc(caseView.caseId)}</span>${statusBadge(caseView.roles.rules.run.feasibility.state)}</div>
    <h3>${esc(caseView.title)}</h3>
    <p>${esc(caseView.gold.userJob)}</p>
    <ol>${firstRows.map((row) => `<li><b>${esc(row.sourceRowId)}</b> ${esc(row.text)}</li>`).join('')}</ol>
    <a href="${esc(caseView.sourceUrl)}" target="_blank" rel="noreferrer">실제 원문 열기</a>
  </article>`;
}

function renderSourceRows(caseView) {
  return `<ol class="source-rows">${caseView.sourceRows.map((row) => `<li>
    <span class="row-id">${esc(row.sourceRowId)}</span>
    <div><b>${esc(row.meaning || row.goldRole)}</b><p>${esc(row.text)}</p><small>${esc(row.goldRole)} · ${row.requiredForMeaning ? '의미 보존 필수' : '보조 행'}</small></div>
  </li>`).join('')}</ol>`;
}

function renderItems(run) {
  if (!run.canonical.items.length) return '<p class="empty">생성된 Item 없음</p>';
  return `<ol class="item-list">${run.canonical.items.map((item) => `<li>
    <div class="item-title"><span>${esc(item.intent)}</span><b>${esc(item.title)}</b></div>
    <p>${esc(item.detail)}</p>
    <dl><dt>완료</dt><dd>${esc(item.completion?.doneWhen)}</dd><dt>SourceRefs</dt><dd>${esc((item.sourceRefs || []).join(', ') || '없음')}</dd>${item.schedule ? `<dt>일정</dt><dd><code>${esc(JSON.stringify(item.schedule))}</code></dd>` : ''}</dl>
  </li>`).join('')}</ol>`;
}

function renderInputs(run) {
  if (!run.minimumInputs.length) return '<p class="empty">첫 결과 전 필수 입력 없음</p>';
  return `<ul class="compact-list">${run.minimumInputs.map((input) => `<li><b>${esc(input.semanticKey)}</b><span>${input.requiredBeforeFirstPreview ? '첫 결과 전 필수' : '후속 입력'} · ${esc(input.owner)}</span><small>${esc(input.reason)}</small></li>`).join('')}</ul>`;
}

function renderProjections(run) {
  return `<div class="projection-list">${ARTIFACTS.map((artifact) => {
    const projection = run.projections[artifact];
    return `<details ${projectionOffered(projection) ? 'open' : ''}><summary><b>${esc(ARTIFACT_LABELS[artifact])}</b><span>${esc(projection?.availability || '없음')}</span></summary>
      <div class="projection-body">${projection?.payload ? `<pre>${esc(JSON.stringify(projection.payload, null, 2))}</pre>` : '<p>payload 없음</p>'}${(projection?.losses || []).length ? `<ul>${projection.losses.map((loss) => `<li>${esc(loss.field || loss.path || 'loss')}: ${esc(loss.reason || loss.note || '')}</li>`).join('')}</ul>` : '<small>기록된 projection loss 없음</small>'}</div>
    </details>`;
  }).join('')}<div class="ics-line"><b>ICS</b><span>event ${esc(run.projections.ics?.eventCount ?? 0)} · action ${run.projections.ics?.actionVisible ? '표시' : '숨김'}</span></div></div>`;
}

function flattenLosses(run) {
  return [
    ...(run.selfReview?.omissions || []).map((entry) => typeof entry === 'string' ? entry : entry.reason || JSON.stringify(entry)),
    ...ARTIFACTS.flatMap((artifact) => (run.projections[artifact]?.losses || []).map((loss) => `${artifact}: ${loss.reason || loss.note || loss.field || JSON.stringify(loss)}`)),
  ];
}

function renderReview(roleView) {
  const { run, computed, adjudication } = roleView;
  const losses = flattenLosses(run);
  const inventions = computed?.inventions?.labels || [];
  const changedItems = (adjudication?.itemJudgments || []).filter((entry) => ['delete', 'major_edit'].includes(entry.disposition));
  return `<div class="review-grid">
    <div><h5>누락·손실</h5>${losses.length ? `<ul>${losses.map((loss) => `<li>${esc(loss)}</li>`).join('')}</ul>` : '<p>기록된 손실 없음</p>'}</div>
    <div><h5>발명</h5>${inventions.length ? `<ul>${inventions.map((item) => `<li>${esc(item.inventionType)} · ${esc(item.affectedPath)}</li>`).join('')}</ul>` : '<p>판정된 발명 없음</p>'}</div>
    <div><h5>Adjudication</h5><p><b>${esc(adjudication?.usability || '미판정')}</b></p><p>삭제 ${esc(computed?.items?.deleteCount ?? '—')} · 대수정 ${esc(computed?.items?.majorEditCount ?? '—')}</p>${changedItems.length ? `<ul>${changedItems.map((item) => `<li>${esc(item.itemId)} · ${esc(item.disposition)}${item.note ? ` · ${esc(item.note)}` : ''}</li>`).join('')}</ul>` : '<small>삭제·대수정 Item 없음</small>'}</div>
  </div>`;
}

function renderRoleCard(role, roleView) {
  const { run, computed, adjudication } = roleView;
  const offered = ARTIFACTS.filter((artifact) => projectionOffered(run.projections[artifact]));
  const measuredCost = computed?.measurements?.actualCost;
  return `<article class="role-card" data-role="${esc(role)}">
    <header><div><span>${esc(ROLE_LABELS[role])}</span><h3>${esc(run.processor.modelOrAgent)}</h3></div>${statusBadge(run.feasibility.state)}</header>
    <div class="decision-line"><b>${run.feasibility.flowPossible ? 'Flow 가능' : 'Flow 중지'}</b><span>${esc(run.classification.sourceShape)} → ${esc(run.classification.primaryArtifact || 'artifact 없음')}</span></div>
    <p class="reason">${esc(run.feasibility.reason)}</p>
    <div class="role-metrics"><span>Items <b>${run.canonical.items.length}</b></span><span>입력 <b>${run.minimumInputs.length}</b></span><span>결과물 <b>${offered.length}</b></span><span>판정 <b>${rolePass(computed) ? '성공' : '실패'}</b></span></div>
    <section><h4>Canonical Items</h4>${renderItems(run)}</section>
    <section><h4>최소 사용자 입력</h4>${renderInputs(run)}</section>
    <section><h4>Projection</h4>${renderProjections(run)}</section>
    <section><h4>Gate</h4><dl class="gate-list">${Object.entries(run.gates).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></section>
    <section><h4>손실·발명·최종 판정</h4>${renderReview(roleView)}</section>
    <footer><span>시간 ${valueOrNotMeasured(run.processor.elapsedMs, 'ms')}</span><span>입력 token ${valueOrNotMeasured(run.processor.measuredInputTokens)}</span><span>출력 token ${valueOrNotMeasured(run.processor.measuredOutputTokens)}</span><span>실제 비용 ${typeof measuredCost === 'number' ? formatNumber(measuredCost) : '측정 안 됨'}</span><span>${esc(adjudication?.reviewStatus || 'unreviewed')}</span></footer>
  </article>`;
}

function renderCase(caseView, index) {
  const meta = caseView.packet.sourceMetadata;
  const filterData = {
    status: caseView.states.join(' '), provider: caseView.providerGroup, format: caseView.sourceFormatGroup,
    artifact: caseView.artifacts.join(' '), outcome: caseView.outcome, disagreement: caseView.disagreement ? 'yes' : 'no',
  };
  return `<section class="case-slide" id="case-${esc(caseView.caseId)}" data-case data-status="${esc(filterData.status)}" data-provider="${esc(filterData.provider)}" data-format="${esc(filterData.format)}" data-artifact="${esc(filterData.artifact)}" data-outcome="${esc(filterData.outcome)}" data-disagreement="${esc(filterData.disagreement)}">
    <header class="case-head"><div><span class="case-index">${String(index + 1).padStart(2, '0')} / 18 · ${esc(caseView.split)}</span><h2>${esc(caseView.title)}</h2><p>${esc(caseView.gold.userJob)}</p></div><div class="case-verdict"><span>${caseView.outcome === 'success' ? '성공' : '실패'}</span><b>${caseView.disagreement ? '역할 의견 불일치' : '역할 판정 일치'}</b></div></header>
    <div class="source-band"><div><b>${esc(caseView.provider)}</b><span>${esc(caseView.sourceFormat)} · ${esc(meta.accessStatus)} · ${esc(meta.observedAt)}</span></div><a href="${esc(caseView.sourceUrl)}" target="_blank" rel="noreferrer">실제 원문 열기</a></div>
    <div class="source-contract"><section><h3>확보한 SourceRows · ${caseView.sourceRows.length}행</h3>${renderSourceRows(caseView)}</section><aside><h3>Gold contract</h3><dl><dt>판정</dt><dd>${esc(caseView.gold.admissionLabel)} · ${esc(caseView.gold.state)}</dd><dt>원문 완전성</dt><dd>${esc(caseView.gold.sourceCompleteness)}</dd><dt>자연스러운 결과물</dt><dd>${esc(caseView.gold.naturalArtifact || '없음')}</dd><dt>최소 입력</dt><dd>${esc(caseView.gold.minimumInputs.map((input) => input.semanticKey).join(', ') || '없음')}</dd><dt>만들면 안 되는 Item</dt><dd>${esc(caseView.gold.forbiddenItems.join(' / ') || '없음')}</dd><dt>원문 경계</dt><dd>${esc((caseView.packet.missingBoundary || []).join(' / ') || '없음')}</dd></dl></aside></div>
    <div class="flow-arrow" aria-hidden="true"><span>실제 원문</span><i>→</i><span>SourceRows</span><i>→</i><span>3개 독립 변환</span><i>→</i><span>Adjudication</span></div>
    <div class="role-grid">${ROLES.map((role) => renderRoleCard(role, caseView.roles[role])).join('')}</div>
  </section>`;
}

function selectOptions(values) {
  return values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
}

function renderHtml(viewModel) {
  const { cases, data } = viewModel;
  const states = [...new Set(cases.flatMap((entry) => entry.states))].sort();
  const artifacts = [...new Set(cases.flatMap((entry) => entry.artifacts))].sort();
  const coverCaseIds = ['GB-14', 'GB-16', 'GB-17'];
  const firstThree = coverCaseIds.map((caseId) => cases.find((entry) => entry.caseId === caseId)).filter(Boolean);
  const finalAssessment = data.metrics.finalGeneralizationAssessment;
  const generatedAt = data.metrics.evaluatedAt;
  const embedded = { generatedAt, evidenceBoundary: data.metrics.validationBoundary, cases, metrics: data.metrics, comparison: data.comparison };
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Flow Content Generalization Benchmark v1</title>
  <style>
    :root{--bg:#fafaf8;--surface:#fff;--ink:#1b1a17;--muted:#6e6b64;--line:#e7e4dd;--soft:#f3f1ec;--blue:#3654ff;--blue-soft:#eef1ff;--green:#1f8a5b;--green-soft:#edf8f2;--warn:#a16207;--warn-soft:#fff7df;--danger:#a33a32;--danger-soft:#fff0ed;--shadow:0 14px 38px rgba(29,31,25,.08);--radius:16px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,Pretendard,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;line-height:1.5}button,select,input{font:inherit;color:inherit}a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}.case-slide dd,.case-slide p,.case-slide li,.case-slide a,.teaser{overflow-wrap:anywhere}.topbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:58px;padding:10px 22px;background:rgba(250,250,248,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.brand{display:flex;align-items:center;gap:11px;white-space:nowrap}.brand-mark{width:30px;height:30px;border-radius:9px;background:var(--blue);color:#fff;display:grid;place-items:center;font-weight:900}.brand strong{font-size:14px}.brand small{display:block;color:var(--muted);font-size:10px}.filters{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.filters select,.filters input{height:34px;border:1px solid var(--line);border-radius:9px;background:#fff;padding:0 9px;font-size:11px;min-width:112px}.filters input{min-width:160px}.filters button{height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface);padding:0 12px;font-size:11px;font-weight:800;cursor:pointer}.result-count{font-size:11px;color:var(--muted);min-width:58px;text-align:right}
    .slide{min-height:900px;padding:68px clamp(24px,5vw,78px);border-bottom:1px solid var(--line);break-after:page}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#fff 0 60%,var(--blue-soft) 60%)}.cover-head{max-width:980px}.cover h1{font-size:clamp(42px,6vw,82px);line-height:.98;letter-spacing:-.055em;margin:0 0 26px;max-width:900px}.cover-lead{max-width:760px;font-size:18px;color:var(--muted);margin:0 0 28px}.claim-boundary{display:inline-block;max-width:900px;padding:10px 14px;border-left:4px solid var(--warn);background:var(--warn-soft);font-size:12px}.cover-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:32px 0}.cover-summary div{background:#fff;border:1px solid var(--line);padding:18px}.cover-summary strong{display:block;font-size:30px}.cover-summary span{font-size:11px;color:var(--muted)}.teaser-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.teaser{background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow)}.teaser-top{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--muted)}.teaser h3{margin:13px 0 5px;font-size:17px;line-height:1.25}.teaser p{font-size:12px;color:var(--muted);min-height:54px}.teaser ol{padding-left:17px;font-size:11px;min-height:72px}.teaser a{font-size:11px;font-weight:800}
    .metrics-slide h2,.findings-slide h2{font-size:48px;letter-spacing:-.04em;margin:0 0 8px}.metrics-slide>p,.findings-slide>p{color:var(--muted);margin:0 0 34px}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric-card{background:var(--surface);border:1px solid var(--line);padding:24px;min-height:145px}.metric-card span,.metric-card small{display:block;color:var(--muted);font-size:12px}.metric-card strong{display:block;font-size:42px;line-height:1.1;margin:12px 0}.role-summary{margin-top:24px;background:#1e2335;color:#fff;padding:24px;border-radius:var(--radius)}.role-summary h3{margin-top:0}.role-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.role-summary-grid div{border-left:1px solid rgba(255,255,255,.2);padding-left:16px}.role-summary-grid span{font-size:11px;color:#bbc2dd}.role-summary-grid strong{display:block;font-size:28px;margin-top:6px}.finding-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.finding-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:22px}.finding-card h3{margin:0 0 12px;font-size:18px}.finding-card ul{padding-left:18px;margin:0;display:grid;gap:9px;font-size:12px}.finding-card.bad{border-top:4px solid var(--danger)}.finding-card.good{border-top:4px solid var(--green)}.finding-card.next{border-top:4px solid var(--blue)}.model-strip{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.model-strip article{background:#1e2335;color:#fff;border-radius:var(--radius);padding:20px}.model-strip h3{margin:0 0 8px}.model-strip p{font-size:12px;color:#cbd1e7;margin:0}.model-strip strong{color:#fff}
    .case-slide{min-height:900px;padding:54px clamp(18px,4vw,58px) 72px;border-bottom:1px solid var(--line);break-after:page}.case-slide[hidden]{display:none}.case-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}.case-index{font-size:11px;color:var(--blue);font-weight:850;text-transform:uppercase}.case-head h2{margin:6px 0 5px;font-size:clamp(30px,4vw,52px);line-height:1.05;letter-spacing:-.045em}.case-head p{margin:0;max-width:760px;color:var(--muted)}.case-verdict{text-align:right}.case-verdict span{display:block;font-size:26px;font-weight:900;color:var(--blue)}.case-verdict b{font-size:11px;color:var(--muted)}.source-band{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#1e2335;color:#fff;padding:14px 18px;border-radius:12px}.source-band div{display:flex;align-items:baseline;gap:12px}.source-band span{font-size:11px;color:#bbc2dd}.source-band a{color:#fff;font-size:11px;font-weight:800}.source-contract{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,.65fr);gap:14px;margin-top:14px}.source-contract>section,.source-contract>aside{background:#fff;border:1px solid var(--line);padding:18px;border-radius:12px}.source-contract h3{font-size:13px;margin:0 0 12px}.source-rows{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.source-rows li{display:grid;grid-template-columns:72px 1fr;gap:9px;border-top:1px solid var(--line);padding-top:9px}.row-id{font:700 10px ui-monospace,monospace;color:var(--blue)}.source-rows b{font-size:11px}.source-rows p{font-size:11px;margin:2px 0}.source-rows small{font-size:9px;color:var(--muted)}.source-contract dl,.gate-list{display:grid;grid-template-columns:105px 1fr;gap:7px 10px;margin:0;font-size:11px}.source-contract dt,.gate-list dt{color:var(--muted)}.source-contract dd,.gate-list dd{margin:0;font-weight:650}.flow-arrow{display:grid;grid-template-columns:1fr 24px 1fr 24px 1fr 24px 1fr;align-items:center;text-align:center;margin:18px 0;color:var(--muted);font-size:10px;font-weight:800}.flow-arrow i{font-style:normal;color:var(--blue);font-size:18px}.role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}.role-card{min-width:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 7px 24px rgba(29,31,25,.05)}.role-card[hidden]{display:none}.role-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:15px;border-bottom:1px solid var(--line)}.role-card>header span{font-size:10px;color:var(--muted)}.role-card>header h3{font-size:12px;margin:3px 0 0;line-height:1.3}.status{display:inline-block;border-radius:999px;padding:4px 7px;font-size:9px!important;font-weight:850;white-space:nowrap;background:var(--soft);color:var(--muted)!important}.status-ready{background:var(--green-soft);color:var(--green)!important}.status-needs_confirmation{background:var(--blue-soft);color:var(--blue)!important}.status-source_import_required,.status-hold{background:var(--warn-soft);color:var(--warn)!important}.status-blocked{background:var(--danger-soft);color:var(--danger)!important}.decision-line{display:flex;justify-content:space-between;gap:8px;padding:13px 15px 0;font-size:10px}.decision-line b{font-size:13px}.decision-line span{color:var(--muted);text-align:right}.reason{font-size:10px;color:var(--muted);padding:0 15px;min-height:46px}.role-metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.role-metrics span{padding:8px 4px;text-align:center;font-size:8px;color:var(--muted);border-right:1px solid var(--line)}.role-metrics span:last-child{border-right:0}.role-metrics b{display:block;font-size:12px;color:var(--ink)}.role-card>section{padding:13px 15px;border-bottom:1px solid var(--line)}.role-card h4{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 9px}.item-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.item-list li{background:var(--soft);padding:10px;border-radius:8px}.item-title{display:flex;gap:7px;align-items:baseline}.item-title span{font-size:8px;color:var(--blue);font-weight:850}.item-title b{font-size:11px}.item-list p{font-size:10px;margin:5px 0;color:var(--muted)}.item-list dl{display:grid;grid-template-columns:54px 1fr;gap:3px;margin:0;font-size:9px}.item-list dt{color:var(--muted)}.item-list dd{margin:0;overflow-wrap:anywhere}.item-list code{font-size:8px}.empty{margin:0;padding:10px;background:var(--soft);font-size:10px;color:var(--muted)}.compact-list{list-style:none;margin:0;padding:0;display:grid;gap:7px}.compact-list li{display:grid;grid-template-columns:1fr auto;gap:3px;font-size:10px}.compact-list span{color:var(--blue)}.compact-list small{grid-column:1/-1;color:var(--muted)}.projection-list{display:grid;gap:5px}.projection-list details{border:1px solid var(--line);border-radius:7px}.projection-list summary{display:flex;justify-content:space-between;padding:7px 8px;cursor:pointer;font-size:9px}.projection-list summary span{color:var(--muted)}.projection-body{padding:0 8px 8px;font-size:9px}.projection-body pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1e2335;color:#e8ebf6;padding:8px;border-radius:6px;max-height:160px;overflow:auto;font-size:8px}.projection-body p{margin:0;color:var(--muted)}.projection-body ul{padding-left:15px}.ics-line{display:flex;justify-content:space-between;font-size:9px;padding:7px 8px;background:var(--soft);border-radius:7px}.gate-list{grid-template-columns:88px 1fr;font-size:9px}.review-grid{display:grid;gap:8px}.review-grid>div{border-left:3px solid var(--line);padding-left:8px}.review-grid h5{font-size:9px;margin:0}.review-grid p,.review-grid ul{font-size:9px;margin:4px 0}.review-grid ul{padding-left:14px}.review-grid small{font-size:8px;color:var(--muted)}.role-card footer{display:flex;flex-wrap:wrap;gap:8px;padding:10px 15px;background:var(--soft);font-size:8px;color:var(--muted)}
    .empty-results{display:none;min-height:50vh;place-items:center;text-align:center}.empty-results.visible{display:grid}.empty-results h2{font-size:32px}.footer-note{padding:24px;text-align:center;color:var(--muted);font-size:10px}@media(max-width:1080px){.topbar{align-items:flex-start}.filters{max-width:70%}.role-grid{grid-template-columns:1fr}.source-contract{grid-template-columns:1fr}.cover-summary{grid-template-columns:repeat(2,1fr)}.teaser-grid,.finding-grid{grid-template-columns:1fr}.model-strip{grid-template-columns:1fr}.teaser p,.teaser ol{min-height:0}.source-rows{grid-template-columns:1fr}.case-slide{min-height:0}.role-card{break-inside:avoid}}
    @media(max-width:700px){.topbar{position:relative;display:block;padding:12px}.brand{margin-bottom:10px}.filters{max-width:none;display:grid;grid-template-columns:1fr 1fr}.filters select,.filters input{width:100%;min-width:0}.result-count{text-align:left}.slide,.case-slide{padding:32px 14px;min-height:0}.cover{background:#fff}.cover h1{font-size:42px}.cover-lead{font-size:15px}.cover-summary{grid-template-columns:1fr 1fr}.metric-grid{grid-template-columns:1fr}.role-summary-grid{grid-template-columns:1fr}.case-head{display:block}.case-verdict{text-align:left;margin-top:14px}.source-band{display:block}.source-band div{display:block}.source-band span{display:block;margin:4px 0}.source-contract>section,.source-contract>aside{padding:13px}.flow-arrow{grid-template-columns:1fr;gap:2px;text-align:left}.flow-arrow i{transform:rotate(90deg);width:18px;text-align:center}.role-grid{display:block}.role-card{margin-bottom:12px}.role-card>section{padding:12px}.source-rows li{grid-template-columns:64px 1fr}.case-head h2{font-size:32px}}
    @media print{.topbar{display:none}.slide,.case-slide{min-height:100vh;break-after:page}.role-card{box-shadow:none}.projection-list details:not([open]) .projection-body{display:block}.case-slide[hidden],.role-card[hidden]{display:block}}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">F</span><div><strong>Generalization Benchmark v1</strong><small>18 sources · 3 independent roles · internal adjudication</small></div></div>
    <div class="filters" aria-label="벤치마크 필터">
      <input id="searchFilter" type="search" placeholder="case·원문·사용자 job 검색" aria-label="검색">
      <select id="statusFilter" aria-label="상태"><option value="">모든 상태</option>${selectOptions(states)}</select>
      <select id="providerFilter" aria-label="provider 유형"><option value="">공식·제작자·플랫폼</option><option value="official">공식 콘텐츠</option><option value="creator">제작자 콘텐츠</option><option value="platform">플랫폼 콘텐츠</option></select>
      <select id="formatFilter" aria-label="원문 형식"><option value="">모든 원문 형식</option><option value="video">영상</option><option value="table_file">표·파일</option><option value="web">일반 웹</option></select>
      <select id="artifactFilter" aria-label="결과물"><option value="">모든 결과물</option>${selectOptions(artifacts)}</select>
      <select id="roleFilter" aria-label="모델 역할"><option value="">3개 역할 나란히</option>${ROLES.map((role) => `<option value="${role}">${ROLE_LABELS[role]}</option>`).join('')}</select>
      <select id="outcomeFilter" aria-label="성공 여부"><option value="">성공·실패 전체</option><option value="success">성공</option><option value="failure">실패</option></select>
      <select id="disagreementFilter" aria-label="의견 불일치"><option value="">의견 일치·불일치</option><option value="yes">의견 불일치</option><option value="no">의견 일치</option></select>
      <button id="resetFilters" type="button">초기화</button><span class="result-count" id="resultCount">18 / 18</span>
    </div>
  </header>
  <main>
    <section class="slide cover">
      <div class="cover-head"><h1>처음 보는 원문에서도<br>Flow가 자연스러운가</h1><p class="cover-lead">동결 규칙을 18개 실제 원문에 적용하고 SourceRow, canonical Item, 최소 입력, projection, 경계 판정을 세 역할로 비교한 내부 벤치마크입니다.</p><p class="claim-boundary">${esc(data.metrics.validationBoundary)}</p></div>
      <div class="cover-summary"><div><strong>${cases.length}</strong><span>실제 원문</span></div><div><strong>${data.runs.length}</strong><span>독립 변환 run</span></div><div><strong>${data.manifest.cases.filter((entry) => entry.split === 'final_holdout').length}</strong><span>Final holdout</span></div><div><strong>${finalAssessment.allRolesCombinedPass ? 'PASS' : 'FAIL'}</strong><span>Final 기준 · 모든 역할 합산</span></div></div>
      <div class="teaser-grid">${firstThree.map(renderCaseTeaser).join('')}</div>
    </section>
    <section class="slide metrics-slide"><h2>Final holdout 결과</h2><p>Calibration은 진단 자료이며 최종 일반화 판단에는 대체하지 않았습니다. 아래 수치는 adjudication이 완료된 실제 값만 표시합니다.</p><div class="metric-grid">${renderMetricCards(data)}</div><div class="role-summary"><h3>역할별 목표 통과</h3><div class="role-summary-grid">${ROLES.map((role) => { const summary = finalAssessment.byRole[role]; return `<div><span>${ROLE_LABELS[role]}</span><strong>${summary.pass ? 'PASS' : 'FAIL'}</strong><small>${summary.passedTargets} / ${summary.totalTargets} targets</small></div>`; }).join('')}</div></div></section>
    <section class="slide findings-slide"><h2>결론: 지금은 자동 생성보다<br>판정·보류 계층이 먼저다</h2><p>잘 멈추는 것과 자연스러운 결과물을 고르는 것은 서로 다른 문제였다. 특히 날짜가 보인다고 Calendar가 되는 것은 아니다.</p><div class="finding-grid"><article class="finding-card good"><h3>비교적 일반화됨</h3><ul><li>명시된 연령 창 + 사용자 anchor의 Calendar</li><li>한국 적용성이 없는 해외 의료 일정의 보수적 정지</li><li>고정 job이 없는 갱신형 컬렉션 정지</li><li>source 값 재입력 0, 일정 없는 ICS 0</li></ul></article><article class="finding-card bad"><h3>아직 약함</h3><ul><li>NHI 교과표: Sheet와 Calendar 경계</li><li>Hopper CSV: 상태표와 날짜 배치 경계</li><li>주민등록증: Todo와 Checklist 경계</li><li>관찰 가능한 completion을 source에서 쓰는 일</li></ul></article><article class="finding-card next"><h3>Backend 전 필수 규칙</h3><ul><li>생성 전 completeness·locale·safety stop gate</li><li>날짜보다 retained state를 먼저 판정</li><li>title·detail뿐 아니라 completion provenance 검사</li><li>artifact 불일치는 자동 공개 대신 needs_review</li></ul></article></div><div class="model-strip"><article><h3>저비용 역할</h3><p>Flow ${formatRate(data.metrics.finalHoldout.byRole.low_cost.flowPossibilityAgreement.rate)} · 경계 ${formatRate(data.metrics.finalHoldout.byRole.low_cost.boundaryRecall.rate)} · artifact ${formatRate(data.metrics.finalHoldout.byRole.low_cost.primaryArtifactAgreement.positiveRate)}. <strong>stop gate 보조에는 가능</strong>하지만 공개 Item 생성에는 대수정이 필요했다.</p></article><article><h3>고성능 역할</h3><p>Flow ${formatRate(data.metrics.finalHoldout.byRole.high_capability.flowPossibilityAgreement.rate)} · 경계 ${formatRate(data.metrics.finalHoldout.byRole.high_capability.boundaryRecall.rate)} · artifact ${formatRate(data.metrics.finalHoldout.byRole.high_capability.primaryArtifactAgreement.positiveRate)}. 의미 보존은 강했지만 <strong>artifact 선택은 단독 위임 불가</strong>다.</p></article></div></section>
    <div id="caseDeck">${cases.map(renderCase).join('')}</div>
    <section class="empty-results" id="emptyResults"><div><h2>조건에 맞는 사례가 없습니다.</h2><p>필터를 줄이거나 초기화해 주세요.</p></div></section>
  </main>
  <footer class="footer-note">생성 시각 ${esc(generatedAt)} · 자동 QA와 내부 adjudication은 관찰 사용자 검증이 아닙니다.</footer>
  <script type="application/json" id="benchmarkData">${safeJson(embedded)}</script>
  <script>
    (function(){
      var ids=['searchFilter','statusFilter','providerFilter','formatFilter','artifactFilter','roleFilter','outcomeFilter','disagreementFilter'];
      var controls=Object.fromEntries(ids.map(function(id){return [id,document.getElementById(id)];}));
      var cases=Array.from(document.querySelectorAll('[data-case]'));
      function apply(){
        var query=controls.searchFilter.value.trim().toLowerCase();
        var shown=0;
        cases.forEach(function(node){
          var ok=(!query||node.textContent.toLowerCase().includes(query))
            &&(!controls.statusFilter.value||node.dataset.status.split(' ').includes(controls.statusFilter.value))
            &&(!controls.providerFilter.value||node.dataset.provider===controls.providerFilter.value)
            &&(!controls.formatFilter.value||node.dataset.format===controls.formatFilter.value)
            &&(!controls.artifactFilter.value||node.dataset.artifact.split(' ').includes(controls.artifactFilter.value))
            &&(!controls.outcomeFilter.value||node.dataset.outcome===controls.outcomeFilter.value)
            &&(!controls.disagreementFilter.value||node.dataset.disagreement===controls.disagreementFilter.value);
          node.hidden=!ok;if(ok)shown+=1;
          Array.from(node.querySelectorAll('[data-role]')).forEach(function(card){card.hidden=Boolean(controls.roleFilter.value&&card.dataset.role!==controls.roleFilter.value);});
        });
        document.getElementById('resultCount').textContent=shown+' / '+cases.length;
        document.getElementById('emptyResults').classList.toggle('visible',shown===0);
      }
      ids.forEach(function(id){controls[id].addEventListener(id==='searchFilter'?'input':'change',apply);});
      document.getElementById('resetFilters').addEventListener('click',function(){ids.forEach(function(id){controls[id].value='';});apply();});
      apply();
    }());
  </script>
</body>
</html>`;
}

export function buildReport({ specDir = defaultSpecDir, output = defaultOutput } = {}) {
  const data = requireCompleteData(specDir);
  validateData(data);
  const html = renderHtml(buildViewModel(data));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, html, 'utf8');
  fs.renameSync(temporary, output);
  return { output, caseCount: data.manifest.cases.length, runCount: data.runs.length };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = buildReport(options);
  console.log(`PASS benchmark report: ${result.caseCount} cases, ${result.runCount} runs -> ${result.output}`);
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
