const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const here = __dirname;
const repoRoot = path.resolve(here, '..', '..', '..');
const reportPath = path.join(here, '..', '2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html');
const p2aVerdictOverridePath = path.join(
  here,
  '..',
  '..',
  'specs',
  '2026-09-03-flowme-integrated-poc-lossless-result-closure-v1',
  'current-verdict-overrides.json',
);
const p2bVerdictOverridePath = path.join(
  here,
  '..',
  '..',
  'specs',
  '2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1',
  'current-verdict-overrides.json',
);
const p2cVerdictOverridePath = path.join(
  here,
  '..',
  '..',
  'specs',
  '2026-09-03-flowme-integrated-poc-personal-editing-closure-v1',
  'current-verdict-overrides.json',
);
const verdictOverridePaths = [p2aVerdictOverridePath, p2bVerdictOverridePath, p2cVerdictOverridePath];

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
const required = [
  'id', 'product', 'title', 'category', 'journey', 'priority', 'decision',
  'source', 'sourceArtifact', 'expected', 'currentEvidence', 'verdict',
  'evidence', 'reason', 'action', 'linkGroup',
];

const inputs = [
  ['requirements-v41.json', 'V41'],
  ['requirements-d1.json', 'D1'],
  ['requirements-d2.json', 'D2'],
  ['requirements-bp.json', 'BP'],
];
const expectedCounts = { V41: 78, D1: 26, D2: 64, BP: 86 };
const allowedVerdicts = new Set(['충족', '부분', '미충족', '의도적 변경', '제외', '결정 필요']);
const allowedEvidence = new Set(['E0', 'E1', 'E2', 'E3', 'E4', 'E5-D', 'E5-U']);
const decisionClassFor = (value) => {
  const decision = String(value);
  if (decision.includes('결정')) return '충돌';
  if (decision.includes('대체')) return '대체됨';
  if (decision.includes('보류')) return '보류';
  if (decision.includes('제외')) return '제외';
  if (decision.includes('후보') || decision.includes('제안')) return '제안';
  if (decision.includes('PoC')) return 'PoC 임시';
  if (decision.includes('관찰')) return '관찰';
  return '확정';
};
const priorThisRunRows = readJson('requirements-this-run.json');
const p2aThisRunRows = readJson('requirements-this-run-p2a.json');
const p2bThisRunRows = readJson('requirements-this-run-p2b.json');
const p2cThisRunRows = readJson('requirements-this-run-p2c.json');
const thisRunRows = [...new Map(
  [...priorThisRunRows, ...p2aThisRunRows, ...p2bThisRunRows, ...p2cThisRunRows]
    .map((row) => [row.id, row]),
).values()];
const thisRunById = new Map(thisRunRows.map((row) => [row.id, row]));
const subcheckGroups = readJson('requirements-subchecks.json');
const subchecksByParent = new Map(subcheckGroups.map((group) => [group.parentId, group.subchecks]));
const verificationManifest = readJson('verification-manifest.json');
const verdictOverrideConfigs = verdictOverridePaths.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
if (verdictOverrideConfigs[0].version !== 2 || !Array.isArray(verdictOverrideConfigs[0].overrides)) {
  throw new Error('P2-A verdict override contract must remain version 2');
}
if (verdictOverrideConfigs[1].version !== 1
  || verdictOverrideConfigs[1].stage !== 'P2-B'
  || !Array.isArray(verdictOverrideConfigs[1].overrides)) {
  throw new Error('P2-B verdict override contract must be stage P2-B version 1');
}
if (verdictOverrideConfigs[2].version !== 1
  || verdictOverrideConfigs[2].stage !== 'P2-C'
  || !Array.isArray(verdictOverrideConfigs[2].overrides)) {
  throw new Error('P2-C verdict override contract must be stage P2-C version 1');
}

function applyCurrentVerdictOverrides(row) {
  return verdictOverrideConfigs.flatMap((config) => config.overrides)
    .filter((override) => override.id === row.id)
    .reduce((current, override) => {
      if (current.verdict !== override.from) {
        throw new Error(`${row.id} override expected ${override.from}, got ${current.verdict}`);
      }
      const previousEvidence = Array.isArray(current.currentEvidence)
        ? current.currentEvidence
        : [current.currentEvidence];
      return {
        ...current,
        verdict: override.to,
        currentEvidence: override.currentEvidence ?? [
          ...previousEvidence,
          `현재 판정 보정: ${override.evidence}`,
        ],
        evidence: override.evidenceLevel ?? current.evidence,
        reason: override.reason ?? current.reason,
        action: override.action ?? current.action,
      };
    }, row);
}

const requirements = inputs.flatMap(([file, product]) => {
  const rows = readJson(file);
  if (!Array.isArray(rows)) throw new Error(`${file} must contain an array`);
  rows.forEach((row, index) => {
    required.forEach((field) => {
      if (!(field in row)) throw new Error(`${file}[${index}] is missing ${field}`);
    });
    if (row.product !== product) throw new Error(`${row.id} has the wrong product`);
    if (!Array.isArray(row.category) || row.category.length === 0) throw new Error(`${row.id} needs categories`);
    if (!allowedVerdicts.has(row.verdict)) throw new Error(`${row.id} has invalid verdict ${row.verdict}`);
    if (!allowedEvidence.has(row.evidence)) throw new Error(`${row.id} has invalid evidence ${row.evidence}`);
    if (!['P0', 'P1', 'P2'].includes(row.priority)) throw new Error(`${row.id} has invalid priority ${row.priority}`);
    const expectedId = `${product}-${String(index + 1).padStart(3, '0')}`;
    if (row.id !== expectedId) throw new Error(`${file}[${index}] expected ${expectedId}, got ${row.id}`);
  });
  if (rows.length !== expectedCounts[product]) {
    throw new Error(`${file} expected ${expectedCounts[product]} rows, got ${rows.length}`);
  }
  return rows.map((row) => ({
    ...applyCurrentVerdictOverrides(row),
    decisionClass: decisionClassFor(row.decision),
    thisRun: thisRunById.get(row.id) ?? {
      status: '구현 변경 없음',
      detail: '이번 감사에서는 판정·근거·후속 조치만 갱신했다.',
    },
    subchecks: subchecksByParent.get(row.id) ?? [],
  }));
});

const ids = new Set();
requirements.forEach((row) => {
  if (ids.has(row.id)) throw new Error(`duplicate requirement id: ${row.id}`);
  ids.add(row.id);
});
thisRunRows.forEach((row) => {
  if (!ids.has(row.id)) throw new Error(`this-run change references unknown id: ${row.id}`);
  if (!row.status || !row.detail) throw new Error(`this-run change is incomplete: ${row.id}`);
});
if (subcheckGroups.length !== 77) throw new Error(`expected 77 compound parents, got ${subcheckGroups.length}`);
const subcheckIds = new Set();
let subcheckCount = 0;
subcheckGroups.forEach((group) => {
  if (!ids.has(group.parentId)) throw new Error(`subchecks reference unknown parent: ${group.parentId}`);
  if (!Array.isArray(group.subchecks) || group.subchecks.length < 2) throw new Error(`subchecks are incomplete: ${group.parentId}`);
  group.subchecks.forEach((subcheck, index) => {
    const expectedId = `${group.parentId}.${index + 1}`;
    if (subcheck.id !== expectedId) throw new Error(`expected ${expectedId}, got ${subcheck.id}`);
    if (subcheckIds.has(subcheck.id)) throw new Error(`duplicate subcheck id: ${subcheck.id}`);
    if (!allowedVerdicts.has(subcheck.verdict) || !allowedEvidence.has(subcheck.evidence)) throw new Error(`invalid subcheck enum: ${subcheck.id}`);
    if (!subcheck.title || !subcheck.note) throw new Error(`empty subcheck: ${subcheck.id}`);
    subcheckIds.add(subcheck.id);
    subcheckCount += 1;
  });
});
if (subcheckCount !== 386) throw new Error(`expected 386 subchecks, got ${subcheckCount}`);
if (verificationManifest.version !== 4) throw new Error(`expected verification manifest v4, got ${verificationManifest.version}`);
const primaryRequirements = requirements.filter((row) => row.product !== 'BP');
const bridgeRequirements = requirements.filter((row) => row.product === 'BP');
const allSubchecks = subcheckGroups.flatMap((group) => group.subchecks);
const verdictManifestKeys = {
  '충족': 'fulfilled',
  '부분': 'partial',
  '미충족': 'missing',
  '의도적 변경': 'intentionalChange',
  '결정 필요': 'decisionRequired',
  '제외': 'excluded',
};
const verdictCounts = (rows) => Object.entries(verdictManifestKeys).reduce((counts, [verdict, key]) => {
  counts[key] = rows.filter((row) => row.verdict === verdict).length;
  return counts;
}, {});
const assertCountMap = (label, expected, actual) => {
  Object.values(verdictManifestKeys).forEach((key) => {
    if (expected[key] !== actual[key]) {
      throw new Error(`${label}.${key} expected ${expected[key]}, got ${actual[key]}`);
    }
  });
};
const expectedCurrentPrimarySnapshot = {
  total: 168,
  gaps: 17,
  verdicts: {
    fulfilled: 128,
    partial: 13,
    missing: 4,
    intentionalChange: 11,
    decisionRequired: 0,
    excluded: 12,
  },
};
if (verificationManifest.coverage.primaryRequirements !== primaryRequirements.length
  || verificationManifest.coverage.bridgeContracts !== bridgeRequirements.length
  || verificationManifest.coverage.compoundParents !== subcheckGroups.length
  || verificationManifest.coverage.subchecks !== subcheckCount) {
  throw new Error('verification manifest coverage does not match trace data');
}
assertCountMap('currentPrimaryVerdicts', verdictCounts(primaryRequirements), verificationManifest.coverage.currentPrimaryVerdicts);
assertCountMap('currentSubcheckVerdicts', verdictCounts(allSubchecks), verificationManifest.coverage.currentSubcheckVerdicts);
assertCountMap('currentBridgeVerdicts', verdictCounts(bridgeRequirements), verificationManifest.coverage.currentBridgeVerdicts);
const primaryGaps = primaryRequirements.filter((row) => ['부분', '미충족'].includes(row.verdict)).length;
if (verificationManifest.coverage.currentPrimaryGaps !== primaryGaps) {
  throw new Error(`currentPrimaryGaps expected ${primaryGaps}, got ${verificationManifest.coverage.currentPrimaryGaps}`);
}
if (primaryRequirements.length !== expectedCurrentPrimarySnapshot.total) {
  throw new Error(`locked primary total expected ${expectedCurrentPrimarySnapshot.total}, got ${primaryRequirements.length}`);
}
assertCountMap(
  'lockedP2CPrimaryVerdicts',
  expectedCurrentPrimarySnapshot.verdicts,
  verdictCounts(primaryRequirements),
);
if (primaryGaps !== expectedCurrentPrimarySnapshot.gaps) {
  throw new Error(`locked P2-C primary gaps expected ${expectedCurrentPrimarySnapshot.gaps}, got ${primaryGaps}`);
}
['V41', 'D1', 'D2'].forEach((product) => {
  const gaps = primaryRequirements.filter((row) => row.product === product && ['부분', '미충족'].includes(row.verdict)).length;
  if (verificationManifest.coverage.currentPrimaryGapsByProduct[product] !== gaps) {
    throw new Error(`currentPrimaryGapsByProduct.${product} expected ${gaps}, got ${verificationManifest.coverage.currentPrimaryGapsByProduct[product]}`);
  }
});
const bridgeGaps = bridgeRequirements.filter((row) => ['부분', '미충족'].includes(row.verdict)).length;
if (verificationManifest.coverage.currentBridgeGaps !== bridgeGaps) {
  throw new Error(`currentBridgeGaps expected ${bridgeGaps}, got ${verificationManifest.coverage.currentBridgeGaps}`);
}
const runIds = new Set();
verificationManifest.runs.forEach((run) => {
  if (!run.id || runIds.has(run.id)) throw new Error(`invalid or duplicate verification run id: ${run.id}`);
  runIds.add(run.id);
  if (typeof run.command !== 'string' || !run.command.trim()) throw new Error(`verification run is missing command evidence: ${run.id}`);
  if (!Number.isInteger(run.passed) || run.passed < 0 || !Number.isInteger(run.failed) || run.failed < 0) {
    throw new Error(`verification run has invalid pass/fail counts: ${run.id}`);
  }
  const total = run.tests ?? run.staticPages ?? run.localLinks;
  if (!Number.isInteger(total) || total < 0 || run.passed + run.failed !== total) {
    throw new Error(`verification run totals are inconsistent: ${run.id}`);
  }
  if (run.status && !['PASS', 'FAIL'].includes(run.status)) throw new Error(`verification run has invalid status: ${run.id}`);
  if (run.failed > 0) {
    const failureFields = ['suite', 'fixtureId', 'field', 'value', 'classification', 'summary'];
    if (run.status !== 'FAIL' || !run.failure || failureFields.some((field) => !String(run.failure[field] || '').trim())) {
      throw new Error(`failing verification run is missing structured failure evidence: ${run.id}`);
    }
  } else if (run.status === 'FAIL') {
    throw new Error(`passing verification run cannot have FAIL status: ${run.id}`);
  }
  if (run.stoppedEarly !== undefined && typeof run.stoppedEarly !== 'boolean') {
    throw new Error(`verification run has invalid stoppedEarly flag: ${run.id}`);
  }
  if (run.stoppedEarly && run.failed === 0) throw new Error(`stopped verification run must record a failure: ${run.id}`);
});
const p2bOverrideConfig = verdictOverrideConfigs[1];
const resolveEvidenceFile = (file) => {
  const resolved = path.resolve(repoRoot, file);
  const relative = path.relative(repoRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`P2-B evidence escapes or resolves to the repository root: ${file}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`P2-B evidence file does not exist: ${file}`);
  }
};
p2bOverrideConfig.overrides.forEach((override) => {
  if (override.to !== '충족') return;
  if (!Array.isArray(override.implementationEvidence) || override.implementationEvidence.length === 0) {
    throw new Error(`${override.id} cannot be fulfilled without implementation evidence`);
  }
  if (!Array.isArray(override.testEvidence) || override.testEvidence.length === 0) {
    throw new Error(`${override.id} cannot be fulfilled without test evidence`);
  }
  [...override.implementationEvidence, ...override.testEvidence].forEach(resolveEvidenceFile);
  if (!Array.isArray(override.verificationRunIds) || override.verificationRunIds.length === 0) {
    throw new Error(`${override.id} cannot be fulfilled without a verification run`);
  }
  override.verificationRunIds.forEach((runId) => {
    const run = verificationManifest.runs.find((candidate) => candidate.id === runId);
    const total = run?.tests ?? run?.staticPages ?? run?.localLinks;
    if (!run || run.failed !== 0 || run.passed !== total || run.status === 'FAIL') {
      throw new Error(`${override.id} verification run is not passing: ${runId}`);
    }
  });
});
const fullRegression = verificationManifest.runs.find((run) => run.id === 'p2c-full-regression');
const regressionTail = verificationManifest.runs.find((run) => run.id === 'p2c-full-regression-tail');
if (!fullRegression || !fullRegression.stoppedEarly || fullRegression.failed < 1 || !regressionTail || regressionTail.failed !== 0) {
  throw new Error('full regression interruption and tail rerun evidence are incomplete');
}
const traceDataFiles = [
  ...inputs.map(([file]) => file),
  'requirements-d1-history.json',
  'requirements-v41-d2-history.json',
  'requirements-this-run.json',
  'requirements-this-run-p2a.json',
  'requirements-this-run-p2b.json',
  'requirements-this-run-p2c.json',
  'requirements-subchecks.json',
  'verification-manifest.json',
];
const requirementHash = crypto.createHash('sha256')
  .update([
    ...traceDataFiles.map((file) => fs.readFileSync(path.join(here, file))),
    ...verdictOverridePaths.map((file) => fs.readFileSync(file)),
  ].join('\u0000'))
  .digest('hex');

const histories = [
  ...(fs.existsSync(path.join(here, 'requirements-d1-history.json'))
    ? readJson('requirements-d1-history.json')
    : []),
  ...(fs.existsSync(path.join(here, 'requirements-v41-d2-history.json'))
    ? readJson('requirements-v41-d2-history.json')
    : []),
];
const decisionRows = requirements.filter((row) =>
  ['의도적 변경', '결정 필요'].includes(row.verdict) || String(row.decision).includes('대체'),
);

const safeData = JSON.stringify({ requirements, histories, decisionRows, verificationManifest, provenance: { requirementHash } }).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>FlowMe 통합 PoC 요구사항 추적 보고서</title>
  <style>
    :root{--ink:#16211f;--muted:#60706d;--line:#d9e1df;--soft:#f4f7f6;--teal:#0f766e;--teal2:#e7f5f2;--navy:#26395e;--amber:#9a5b00;--amber2:#fff4db;--red:#a33a3a;--red2:#fff0ef;--green:#26734f;--green2:#e9f7ef;--violet:#6253a5;--violet2:#f0edff;--shadow:0 18px 48px rgba(22,33,31,.1)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:max(70px,calc(env(safe-area-inset-top) + 62px))}body{margin:0;background:#edf2f0;color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;line-height:1.58}button,input,select{font:inherit}button,a{touch-action:manipulation}.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.skip{position:fixed;left:max(12px,env(safe-area-inset-left));top:-80px;z-index:100;background:#fff;padding:12px;border:2px solid var(--teal)}.skip:focus{top:max(12px,env(safe-area-inset-top))}
    .top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:max(8px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 8px max(16px,env(safe-area-inset-left));background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.brand{font-weight:900;letter-spacing:-.03em}.top nav{display:flex;gap:4px;overflow:auto}.top a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:#42534f;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap}
    main{width:min(1440px,100%);margin:auto;background:#fff;min-height:100vh}.hero{padding:clamp(34px,6vw,82px) clamp(18px,5vw,72px) 36px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#fff 20%,#eef8f5)}.eyebrow{margin:0 0 10px;color:var(--teal);font-size:12px;font-weight:900;letter-spacing:.13em}.hero h1{max-width:940px;margin:0;font-size:clamp(34px,6vw,72px);line-height:1.08;letter-spacing:-.055em}.lead{max-width:880px;margin:22px 0 0;color:#445652;font-size:clamp(16px,2vw,20px)}.hero-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 16px;border:1px solid #9eb0ac;border-radius:8px;background:#fff;color:var(--ink);font-weight:800;text-decoration:none;cursor:pointer}.btn.primary{border-color:var(--teal);background:var(--teal);color:#fff}
    .summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--line)}.summary article{padding:20px clamp(16px,3vw,30px);border-right:1px solid var(--line)}.summary article:last-child{border:0}.summary span{display:block;color:var(--muted);font-size:12px}.summary strong{display:block;margin-top:3px;font-size:clamp(23px,3vw,34px);letter-spacing:-.04em}
    .section{padding:44px clamp(16px,5vw,72px);border-bottom:1px solid var(--line)}.section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.section h2{margin:0;font-size:clamp(25px,4vw,40px);letter-spacing:-.04em}.section-head p{max-width:760px;margin:8px 0 0;color:var(--muted)}.kicker{display:block;margin-bottom:5px;color:var(--teal);font-size:11px;font-weight:900;letter-spacing:.13em}
    .source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.source-card{padding:20px;border:1px solid var(--line);border-top:4px solid var(--teal);background:#fff}.source-card[data-product="D1"]{border-top-color:var(--navy)}.source-card[data-product="D2"]{border-top-color:var(--violet)}.source-card h3{margin:0;font-size:20px}.source-card p{margin:8px 0;color:var(--muted);font-size:14px}.source-card dl{display:grid;grid-template-columns:1fr auto;gap:6px;margin:16px 0 0;font-size:13px}.source-card dd{margin:0;font-weight:900}.source-card a{color:var(--teal);font-weight:800}.bridge-contract{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;margin-top:12px;padding:16px 20px;border:1px dashed #b8944b;background:#fff9e9}.bridge-contract h3{margin:0;font-size:16px}.bridge-contract p{margin:3px 0 0;color:var(--muted);font-size:13px}.bridge-contract strong{display:block;font-size:25px;color:var(--amber)}.bridge-stats{text-align:right}.bridge-stats span{display:block;color:var(--muted);font-size:12px}
    .method-grid,.gate-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.method-card,.gate{padding:18px;border:1px solid var(--line);background:var(--soft)}.method-card h3,.gate h3{margin:0 0 7px;font-size:17px}.method-card p,.gate p{margin:0;color:var(--muted);font-size:14px}.legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.chip{display:inline-flex;align-items:center;min-height:28px;padding:2px 9px;border-radius:999px;background:#e9eeee;color:#43534f;font-size:11px;font-weight:850}.chip[data-verdict="충족"]{background:var(--green2);color:var(--green)}.chip[data-verdict="부분"]{background:var(--amber2);color:var(--amber)}.chip[data-verdict="미충족"]{background:var(--red2);color:var(--red)}.chip[data-verdict="의도적 변경"]{background:var(--violet2);color:var(--violet)}.chip[data-verdict="제외"]{background:#eceff2;color:#4e5964}.chip[data-verdict="결정 필요"]{background:#e8eefb;color:var(--navy)}.owner-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.owner-card{position:relative;padding:18px;border:1px solid var(--line);background:#fff}.owner-card:not(:last-child)::after{content:"→";position:absolute;right:-9px;top:42%;z-index:2;color:var(--teal);font-weight:900}.owner-card b{display:block;color:var(--teal);font-size:11px}.owner-card h3{margin:4px 0 7px;font-size:17px}.owner-card p{margin:0;color:var(--muted);font-size:13px}.owner-card.locked{background:var(--red2)}
    .flow{display:grid;grid-template-columns:repeat(8,minmax(110px,1fr));gap:0;overflow:auto;padding-bottom:8px}.flow-step{position:relative;min-height:114px;padding:15px 22px 15px 14px;border:1px solid var(--line);background:#fff}.flow-step:not(:last-child)::after{content:"→";position:absolute;right:5px;top:42%;color:var(--teal);font-weight:900}.flow-step b{display:block;color:var(--teal);font-size:11px}.flow-step strong{display:block;margin-top:4px;font-size:14px}.flow-step small{display:block;margin-top:4px;color:var(--muted)}
    .filter-panel{position:sticky;top:58px;z-index:20;padding:14px;border:1px solid var(--line);background:rgba(255,255,255,.98);box-shadow:0 8px 22px rgba(22,33,31,.06)}.filters{display:grid;grid-template-columns:minmax(220px,2fr) repeat(6,minmax(112px,1fr));gap:8px}.filters input,.filters select{min-height:46px;width:100%;min-width:0;padding:0 11px;border:1px solid #b9c6c3;border-radius:7px;background:#fff;color:var(--ink)}.filter-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;color:var(--muted);font-size:13px}.filter-meta strong{color:var(--ink)}
    .matrix{display:grid;gap:10px;margin-top:18px}.req{border:1px solid var(--line);background:#fff}.req summary{display:grid;grid-template-columns:92px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:66px;padding:10px 14px;cursor:pointer;list-style:none}.req summary::-webkit-details-marker{display:none}.req summary:hover{background:#f8faf9}.req-id{font-weight:950;color:var(--teal)}.req[data-product="D1"] .req-id{color:var(--navy)}.req[data-product="D2"] .req-id{color:var(--violet)}.req[data-product="BP"] .req-id{color:var(--amber)}.req-title{font-weight:850;overflow-wrap:anywhere}.req-meta{display:flex;flex-wrap:wrap;justify-content:end;gap:5px}.req-body{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--line)}.req-block{padding:16px;border-right:1px solid var(--line)}.req-block:nth-child(2n){border-right:0}.req-block:nth-child(n+3){border-top:1px solid var(--line)}.req-block h4{margin:0 0 6px;color:var(--muted);font-size:11px;letter-spacing:.08em}.req-block p{margin:0;white-space:pre-line;overflow-wrap:anywhere;font-size:14px}.req-source{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px!important}.req-subchecks{grid-column:1/-1;padding:16px;border-top:1px solid var(--line);background:#f8faf9}.req-subchecks h4{margin:0 0 10px;font-size:13px}.req-subchecks ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}.req-subchecks li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:8px;padding:9px;border:1px solid var(--line);background:#fff;font-size:13px}.req-subchecks li p{grid-column:2/-1;margin:0;color:var(--muted)}.empty-results{padding:32px;border:1px dashed #9badA8;text-align:center;color:var(--muted)}
    .history{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.history article{padding:16px;border-left:4px solid var(--violet);background:var(--violet2)}.history h3{margin:0;font-size:15px}.history p{margin:6px 0 0;color:#51497b;font-size:13px}
    .compare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.compare article{min-width:0;border:1px solid var(--line);background:#fff}.compare h3{margin:0;padding:15px;border-bottom:1px solid var(--line);font-size:17px}.pair{display:grid;grid-template-columns:1fr 1fr}.pair figure{min-width:0;margin:0;padding:8px}.pair figure+figure{border-left:1px solid var(--line)}.pair img{display:block;width:100%;height:360px;object-fit:contain;background:#eef2f1}.pair figcaption{margin-top:7px;color:var(--muted);font-size:12px}.compare p{margin:0;padding:0 15px 15px;color:var(--muted);font-size:13px}
    .ledger{width:100%;border-collapse:collapse}.ledger th,.ledger td{padding:12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.ledger th{color:var(--muted);font-size:12px}.ledger td{font-size:14px}.ledger [data-status="fail"]{color:var(--red);font-weight:900}.callout{margin-top:16px;padding:16px;border-left:4px solid var(--amber);background:var(--amber2)}.callout strong{display:block;margin-bottom:5px}.foot{padding:28px clamp(16px,5vw,72px) max(28px,env(safe-area-inset-bottom));color:var(--muted);font-size:13px;background:#f4f7f6}
    @media(max-width:1100px){.summary{grid-template-columns:repeat(2,1fr)}.summary article{border-bottom:1px solid var(--line)}.summary article:nth-child(2n){border-right:0}.summary article:last-child{grid-column:1/-1;border-bottom:0}.filters{grid-template-columns:repeat(3,minmax(0,1fr))}.filters input{grid-column:1/-1}.compare{grid-template-columns:1fr}.pair img{height:420px}}
    @media(max-width:760px){.top nav{display:none}.hero{padding-top:34px}.source-grid,.method-grid,.gate-grid,.history,.owner-grid{grid-template-columns:1fr}.owner-card:not(:last-child)::after{content:"↓";right:16px;top:auto;bottom:-15px}.section{padding-top:34px;padding-bottom:34px}.section-head{display:block}.filters{grid-template-columns:1fr 1fr}.filters input{grid-column:1/-1}.filter-panel{top:58px}.req summary{grid-template-columns:72px minmax(0,1fr);gap:8px}.req-meta{grid-column:1/-1;justify-content:start}.req-body{grid-template-columns:1fr}.req-block,.req-block:nth-child(2n){border-right:0}.req-block:nth-child(n+2){border-top:1px solid var(--line)}.req-subchecks li{grid-template-columns:minmax(0,1fr) auto}.req-subchecks li>strong,.req-subchecks li p{grid-column:1/-1}.pair{grid-template-columns:1fr}.pair figure+figure{border-left:0;border-top:1px solid var(--line)}.pair img{height:auto;max-height:620px}.ledger,.ledger tbody,.ledger tr,.ledger td{display:block}.ledger thead{display:none}.ledger tr{padding:10px 0;border-bottom:1px solid var(--line)}.ledger td{border:0;padding:4px 0}.ledger td::before{content:attr(data-label);display:block;color:var(--muted);font-size:11px;font-weight:800}}
    @media(max-height:520px){.filter-panel{position:static}}
    @media(max-width:420px){.summary{grid-template-columns:1fr 1fr}.filters{grid-template-columns:1fr}.filter-panel{position:static}.hero h1{font-size:37px}.bridge-contract{grid-template-columns:1fr}.bridge-contract strong{font-size:21px}.bridge-stats{text-align:left}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
  </style>
</head>
<body>
<a class="skip" href="#requirements">요구사항 목록으로 이동</a>
<header class="top"><div class="brand">FLOW · 통합 추적</div><nav aria-label="보고서 바로가기"><a href="#sources">세 결과물</a><a href="#method">비교 방법</a><a href="#requirements">요구 매트릭스</a><a href="#compare">화면 비교</a><a href="#gates">남은 결정</a><a href="./2026-09-02-flowme-integrated-poc-gap-closure-plan-ko.html">단계 계획</a></nav></header>
<main>
  <section class="hero">
    <p class="eyebrow">V4.1 · 개발 1 · 개발 2 / ATOMIC REQUIREMENT TRACE</p>
    <h1>세 결과물을 한 행씩<br>현재 PoC에 대조했습니다.</h1>
    <p class="lead">당시 대화와 결정 변경, 정본 화면과 기능 흐름을 원자 요구로 나눴습니다. 각 행에서 원출처, 기대 동작, 현재 구현·테스트 증거, 차이 원인과 다음 조치를 함께 볼 수 있습니다.</p>
    <div class="hero-actions"><a class="btn primary" href="#requirements">요구사항 바로 보기</a><a class="btn" href="./2026-09-02-flowme-integrated-poc-gap-closure-plan-ko.html">단계별 실행 계획</a><a class="btn" href="./2026-09-02-flowme-integrated-flow-poc-standalone-ko.html">통합 PoC 직접 조작</a><a class="btn" href="./2026-09-02-flowme-integrated-poc-requirements-traceability-method-ko.md">판정 방법 원문</a></div>
  </section>
  <section class="summary" aria-label="요구사항 요약">
    <article><span>세 결과물 원자 요구</span><strong id="primary-count">0</strong></article>
    <article><span>별도 통합 연결 계약</span><strong id="bridge-count">0</strong></article>
    <article><span>세 결과물 중 충족</span><strong id="pass-count">0</strong></article>
    <article><span>세 결과물 중 부분·미충족</span><strong id="gap-count">0</strong></article>
    <article><span>세 결과물 중 변경·제외·결정</span><strong id="boundary-count">0</strong></article>
  </section>

  <section class="section" id="sources">
    <div class="section-head"><div><span class="kicker">SOURCE COVERAGE</span><h2>세 결과물을 동등하게 추적</h2><p>통합 blueprint는 세 결과물 사이의 연결 규칙입니다. 별도 네 번째 제품 산출물로 세지 않습니다.</p></div></div>
    <div class="source-grid">
      <article class="source-card" data-product="V41"><h3>개인공간 v4.1</h3><p>폴더·기간·QuickItem·이동·완료의 화면과 조작 문법</p><dl><dt>요구</dt><dd data-product-count="V41">0</dd><dt>1차 근거</dt><dd>spec·HTML·QA</dd></dl><p data-product-verdicts="V41"></p><p><a href="../specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md">v4.1 정본 열기</a></p></article>
      <article class="source-card" data-product="D1"><h3>개발 1 기준 대화</h3><p>네 origin, 공통 Plan/Item 편집, lifecycle·복구 owner</p><dl><dt>요구</dt><dd data-product-count="D1">0</dd><dt>대화</dt><dd>전체 페이지 확인</dd></dl><p data-product-verdicts="D1"></p><p><a href="../specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md">개발 1 정본 열기</a></p></article>
      <article class="source-card" data-product="D2"><h3>개발 2 기준 대화</h3><p>일반 Text Authoring, 구조·결과·작성 틀, creator/personal 경계</p><dl><dt>요구</dt><dd data-product-count="D2">0</dd><dt>대화</dt><dd>159 turn 확인</dd></dl><p data-product-verdicts="D2"></p><p><a href="../specs/2026-07-28-flowme-text-authoring-ux-v1/spec.md">개발 2 정본 열기</a></p></article>
    </div>
    <article class="bridge-contract"><div><h3>통합 blueprint · 연결 계약</h3><p>세 결과물의 저장 경계·identity·공통 시나리오를 대조하는 행입니다. 제품 결과물 수와 요구 개수에는 포함하지 않습니다. <a href="../specs/2026-09-01-flowme-integration-blueprint-v0/spec.md">연결 정본 열기</a></p></div><div class="bridge-stats"><strong><span data-product-count="BP">0</span>개</strong><span id="bridge-verdicts"></span></div></article>
    <div class="callout"><strong>정본 링크 범위</strong>상대 경로 링크는 저장소 구조 안에서 열립니다. 외부로 복사한 보고서에서는 요구 행의 출처 경로를 참고하세요.</div>
  </section>

  <section class="section" id="method">
    <div class="section-head"><div><span class="kicker">METHOD</span><h2>어떻게 정리하고 비교했는가</h2></div></div>
    <div class="method-grid">
      <article class="method-card"><h3>1. 원출처 보존</h3><p>같은 뜻이 반복돼도 V41·D1·D2 행을 합치지 않습니다. 대체된 결정은 현재 결함이 아니라 변경 이력으로 남깁니다.</p></article>
      <article class="method-card"><h3>2. 관찰 조건 하나씩</h3><p>부모 254행 중 복합 계약 77행은 386개 하위 관찰 조건으로 다시 나눠 각각 판정합니다.</p></article>
      <article class="method-card"><h3>3. 코드와 조작 증거 분리</h3><p>구현 위치만 있으면 E1, 모델 테스트는 E2, 브라우저 조작은 E3, 회귀·build까지 묶이면 E4입니다.</p></article>
    </div>
    <div class="legend" aria-label="판정 범례"><span class="chip" data-verdict="충족">충족</span><span class="chip" data-verdict="부분">부분</span><span class="chip" data-verdict="미충족">미충족</span><span class="chip" data-verdict="의도적 변경">의도적 변경</span><span class="chip" data-verdict="제외">제외</span><span class="chip" data-verdict="결정 필요">결정 필요</span></div>
  </section>

  <section class="section">
    <div class="section-head"><div><span class="kicker">END-TO-END MAP</span><h2>한 제품에서 이어져야 할 흐름</h2><p>각 단계의 필터를 누르면 관련 요구만 볼 수 있습니다.</p></div></div>
    <div class="flow" aria-label="통합 사용자 흐름">
      <button class="flow-step" data-journey-shortcut="입력"><b>D2</b><strong>일반 텍스트 입력</strong><small>원문·틀·초안</small></button>
      <button class="flow-step" data-journey-shortcut="구조"><b>D2</b><strong>구조 확인·수정</strong><small>lineage·오류</small></button>
      <button class="flow-step" data-journey-shortcut="결과"><b>D2/D1</b><strong>실제 결과 확인</strong><small>Text·Todo·Calendar</small></button>
      <button class="flow-step" data-journey-shortcut="저장"><b>BRIDGE</b><strong>명시적 저장</strong><small>owner·receipt</small></button>
      <button class="flow-step" data-journey-shortcut="탐색"><b>V41/D1</b><strong>개인공간 찾기</strong><small>폴더·origin</small></button>
      <button class="flow-step" data-journey-shortcut="상세"><b>D1</b><strong>Flow·Item 상세</strong><small>편집·소유권</small></button>
      <button class="flow-step" data-journey-shortcut="이동"><b>V41</b><strong>날짜·폴더·순서</strong><small>같은 transition</small></button>
      <button class="flow-step" data-journey-shortcut="복구"><b>ALL</b><strong>완료·Undo·reload</strong><small>원본 불변</small></button>
    </div>
  </section>

  <section class="section" id="owners">
    <div class="section-head"><div><span class="kicker">DATA OWNERSHIP</span><h2>세 결과물이 만나는 저장 경계</h2><p>작성 중 값과 개인 실행 값은 PoC에만 쓰고, 기존 Flow 원본과 운영 writer는 건드리지 않습니다.</p></div></div>
    <div class="owner-grid">
      <article class="owner-card"><b>D1 · INPUT</b><h3>네 saved-plan origin</h3><p>운영 key의 원본 Flow를 읽기만 하고 savedCopyId+flowId+itemId로 투영합니다.</p></article>
      <article class="owner-card"><b>D2 · DRAFT</b><h3>작성 초안</h3><p><code>flow:poc:personal-workspace:v1:*draft</code>에 원문·틀·폴더·Undo 이력만 저장합니다.</p></article>
      <article class="owner-card"><b>V4.1 · SHADOW</b><h3>개인 실행 위치</h3><p>폴더·날짜·순서·완료·QuickItem·Undo는 versioned PoC shadow state가 소유합니다.</p></article>
      <article class="owner-card locked"><b>LOCKED</b><h3>운영 writer</h3><p>기존 완료·메모·날짜·보관·export writer는 호출하지 않습니다. CreatorDraft와 실제 Calendar 연결은 결정 게이트입니다.</p></article>
    </div>
  </section>

  <section class="section" id="requirements">
    <div class="section-head"><div><span class="kicker">TRACEABILITY MATRIX</span><h2>원자 요구사항 전체</h2><p>현재 구현의 차이를 숨기지 않습니다. <code>결정 필요</code>는 개발 누락이 아니라 운영 owner나 제품 정책을 먼저 정해야 하는 항목입니다.</p></div></div>
    <div class="filter-panel">
      <div class="filters">
        <label><span class="visually-hidden">검색</span><input id="query" type="search" aria-label="검색" placeholder="ID·요구·출처·증거 검색"></label>
        <label><span class="visually-hidden">결과물</span><select id="product-filter" aria-label="결과물"><option value="primary">세 결과물 전체</option><option value="all">세 결과물 + 연결 계약</option><option value="V41">v4.1</option><option value="D1">개발 1</option><option value="D2">개발 2</option><option value="BP">통합 연결 계약</option></select></label>
        <label><span class="visually-hidden">판정</span><select id="verdict-filter" aria-label="판정"><option value="all">모든 판정</option></select></label>
        <label><span class="visually-hidden">결정 상태</span><select id="decision-filter" aria-label="결정 상태"><option value="all">모든 결정 상태</option></select></label>
        <label><span class="visually-hidden">여정</span><select id="journey-filter" aria-label="여정"><option value="all">모든 화면·여정</option></select></label>
        <label><span class="visually-hidden">분류</span><select id="category-filter" aria-label="분류"><option value="all">모든 분류</option></select></label>
        <label><span class="visually-hidden">우선순위</span><select id="priority-filter" aria-label="우선순위"><option value="all">모든 우선순위</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option></select></label>
      </div>
      <div class="filter-meta"><span role="status" aria-live="polite"><strong id="visible-count">0</strong>개 표시</span><div><button class="btn" id="reset-filters" type="button">필터 초기화</button> <button class="btn" id="copy-summary" type="button">현재 결과 복사</button></div></div>
    </div>
    <div class="matrix" id="matrix"></div>
  </section>

  <section class="section" id="history-section">
    <div class="section-head"><div><span class="kicker">DECISION CHANGE LEDGER</span><h2>바뀐 결정과 아직 필요한 결정을 분리</h2><p>대화 중 대체된 안은 현재 결함으로 세지 않습니다. 세 결과물의 충돌과 승인되지 않은 변경은 별도의 결정 행으로 남깁니다.</p></div></div>
    <div class="history" id="history"></div>
    <h3>현재 결정 게이트·의도적 변경</h3>
    <div class="history" id="decision-history"></div>
  </section>

  <section class="section" id="compare">
    <div class="section-head"><div><span class="kicker">SCREEN MATCHING</span><h2>원래 화면과 현재 통합 화면</h2><p>화면 유사성만으로 충족 판정을 내리지 않았습니다. 각 비교는 위 요구 행의 조작·저장 증거와 함께 봅니다.</p></div></div>
    <div class="compare">
      <article><h3>V4.1 · 모바일 폴더</h3><div class="pair"><figure><img src="2026-09-01-flowme-personal-workspace-v4-1-poc-local-validation-assets/reference-mobile-folder.png" alt="v4.1 기준 모바일 폴더 화면"><figcaption>기준 · 한 줄 상단, 빠른 입력, 평면 목록</figcaption></figure><figure><img src="2026-09-02-flowme-integrated-flow-poc-validation-report-assets/after-workspace-390x844.png" alt="현재 통합 PoC 모바일 개인공간"><figcaption>현재 · origin 4개와 기간 실행 연결</figcaption></figure></div><p>정보 위계와 평면 목록은 이어졌지만 글로벌 PlatformNav, PoC header, 기간 탭이 겹쳐 첫 항목이 더 늦게 시작합니다.</p></article>
      <article><h3>D1 · 공통 Item 편집</h3><div class="pair"><figure><img src="2026-08-12-my-plan-edit-lifecycle-ui-capture-review-assets/screenshots/06-after-canonical-item-editor-390.png" alt="개발 1 공통 Item 편집기"><figcaption>기준 · 제목·메모·날짜와 staged 적용</figcaption></figure><figure><img src="2026-09-02-flowme-integrated-poc-stage-3-runtime-assets/plan-390x844.png" alt="현재 통합 PoC 공통 Plan 편집기"><figcaption>현재 · source 읽기 전용과 개인 staged 편집</figcaption></figure></div><p>단계 3에서 네 saved-plan origin과 작성 handoff를 같은 Plan→Item editor, staged apply, receipt·retry·Undo에 연결했고 Chromium 13/13과 6개 viewport PNG 24개로 확인했습니다. 안정적인 section 제목 owner, 실제 /calendar·export·운영 lifecycle은 열지 않아 해당 부모 요구는 부분 또는 제외 경계를 유지합니다.</p></article>
      <article><h3>D2 · 작성 화면</h3><div class="pair"><figure><img src="2026-09-02-flowme-integrated-flow-poc-validation-report-assets/before-authoring-390x844.png" alt="개선 전 통합 작성 화면"><figcaption>이전 · 틀과 안내가 먼저 차지한 화면</figcaption></figure><figure><img src="2026-09-03-flowme-integrated-poc-authoring-workspace-parity-report-assets/after-react-390x844.png" alt="현재 통합 작성 결과 화면"><figcaption>현재 · 한 편집기와 전체 빈칸 예시, 선택형 검토</figcaption></figure></div><p>React와 standalone은 한 편집기, 입력/결과 두 상태, 6개 작성 틀과 picker 예시, 전체 빈칸 ghost/toggle, 선택형 검토, browser-native Undo, stable 개인 Flow handoff를 같은 핵심 계약으로 사용합니다. 문맥형 line helper는 React 전용 P1 경계이며, CreatorDraft library와 공개 후보 owner도 이번 개인 handoff 범위 밖입니다.</p></article>
    </div>
  </section>

  <section class="section" id="gates">
    <div class="section-head"><div><span class="kicker">PRODUCT BOUNDARIES</span><h2>확정한 경계와 다시 여는 조건</h2></div></div>
    <div class="gate-grid">
      <article class="gate"><h3>D2 저장 대상</h3><p>이번 PoC의 첫 성공 경로는 명시적인 개인 Flow handoff입니다. CreatorDraft library와 공개 후보는 별도 owner 승인 전까지 보류합니다.</p></article>
      <article class="gate"><h3>D1 운영 editor·writer</h3><p>편집·완료·휴지통 UX는 PoC shadow command로만 검증합니다. 실제 Calendar·export·lifecycle writer는 운영 owner 승인 뒤 adapter로 연결합니다.</p></article>
      <article class="gate"><h3>통합 화면 token</h3><p>운영 PlatformNav와 ink/cobalt를 전역 owner로 보존하고 teal은 exact-query 개인공간 accent로 한정합니다. 영구 token 통합은 별도 디자인 게이트입니다.</p></article>
      <article class="gate"><h3>구조 수정 범위</h3><p>일반 텍스트와 선택형 구조 검토를 기본으로 유지합니다. 지원 가능한 좁은 near-miss만 명시 correction 후보이며 자동 수정은 하지 않습니다.</p></article>
      <article class="gate"><h3>독립 HTML 역할</h3><p>embedded fixture 기반 오프라인 수동 검토 동반물입니다. React PoC 정본의 live origin·저장·실기 증거를 대신하지 않습니다.</p></article>
      <article class="gate"><h3>Stage 5 고급 fidelity</h3><p>recurrence runtime, public S3·version, table/source 양방향 update는 후속 보류 또는 이번 PoC 제외입니다. identity·권한·conflict·rollback owner 승인 때 각각 다시 엽니다.</p></article>
      <article class="gate"><h3>운영 이관</h3><p>identity·schema·migration·dual read·rollback 승인 전 PoC snapshot을 운영 저장소로 옮기지 않습니다.</p></article>
    </div>
    <div class="callout"><strong>현재 통합 판정</strong>핵심 연결을 조작할 수 있는 기능형 PoC이지만, 세 결과물 전체의 제품 통합은 완료되지 않았습니다. 자동 근거와 실제 기기·관찰 사용자 증거도 분리돼 있습니다.</div>
  </section>

  <section class="section">
    <div class="section-head"><div><span class="kicker">EVIDENCE LEDGER</span><h2>검증과 게시 상태</h2></div></div>
    <table class="ledger"><thead><tr><th>항목</th><th>상태</th><th>해석</th></tr></thead><tbody>
      <tr><td data-label="항목">요구사항 출처 감사</td><td data-label="상태" id="source-ledger">세 결과물 + 연결 계약</td><td data-label="해석">실제 대화·정본·화면·현재 코드 매칭. 연결 계약은 결과물 수에서 제외</td></tr>
      <tr><td data-label="항목">추적 데이터 SHA-256</td><td data-label="상태"><code id="requirement-hash"></code></td><td data-label="해석">요구·하위 판정·결정 이력·이번 수정의 현재 bytes로 다시 생성됐는지 확인</td></tr>
      <tr><td data-label="항목">자동 테스트·build·브라우저</td><td data-label="상태" id="automation-summary"></td><td data-label="해석" id="automation-time"></td></tr>
      <tr><td data-label="항목">전체 npm 회귀</td><td data-label="상태" id="full-regression-summary"></td><td data-label="해석" id="full-regression-detail"></td></tr>
      <tr><td data-label="항목">의존성 보안 감사</td><td data-label="상태" id="security-audit-summary"></td><td data-label="해석">기능·회귀 검증과 분리한 기존 의존성 상태. 이 단계에서는 자동 수정하지 않음</td></tr>
      <tr><td data-label="항목">운영 데이터 불변 자동 증거</td><td data-label="상태" id="storage-boundary-summary"></td><td data-label="해석" id="storage-boundary-scope"></td></tr>
      <tr><td data-label="항목">실제 Android Chrome</td><td data-label="상태" id="android-status"></td><td data-label="해석">사용자 제공 수정 전 사진과 자동 브라우저를 실기 완료로 대체하지 않음</td></tr>
      <tr><td data-label="항목">실제 iOS Safari</td><td data-label="상태" id="ios-status"></td><td data-label="해석">safe area·키보드·OS gesture 확인 필요</td></tr>
      <tr><td data-label="항목">관찰 사용자</td><td data-label="상태" id="observed-users"></td><td data-label="해석">발견·이해·회복·효용 미검증</td></tr>
      <tr><td data-label="항목">commit / push / PR</td><td data-label="상태">미진행</td><td data-label="해석">현재 격리 worktree의 로컬 변경</td></tr>
      <tr><td data-label="항목">Preview / Production</td><td data-label="상태">미진행</td><td data-label="해석">배포 승인 없음</td></tr>
    </tbody></table>
  </section>
</main>
<footer class="foot">이 문서는 2026-09-03 현재 격리 worktree의 추적 감사입니다. 보고서 필터·메모리는 운영 FlowMe 저장소에 쓰지 않습니다.</footer>
<script id="trace-data" type="application/json">${safeData}</script>
<script>
(() => {
  const data = JSON.parse(document.getElementById('trace-data').textContent);
  const rows = data.requirements;
  const matrix = document.getElementById('matrix');
  document.getElementById('requirement-hash').textContent = data.provenance.requirementHash.slice(0, 16)+'…';
  const run = id => data.verificationManifest.runs.find(item => item.id === id);
  const fullRegression = run('p2c-full-regression');
  const regressionTail = run('p2c-full-regression-tail');
  const p2aParity = run('p2a-lossless-parity-model');
  const p2aBrowser = run('p2a-browser-regression');
  const p2bSuite = run('p2b-personal-workspace-poc-suite');
  const p2bModel = run('p2b-occurrence-txt-model');
  const p2bStandalone = run('p2b-standalone-model');
  const p2bBrowser = run('p2b-browser-focused');
  const p2bViewports = run('p2b-result-six-viewport-browser');
  const p2bBuild = run('p2b-production-build');
  const p2cSuite = run('p2c-personal-workspace-poc-suite');
  const p2cCrossSurface = run('p2c-cross-surface-contract');
  const p2cStandalone = run('p2c-standalone-model');
  const p2cReactBrowser = run('p2c-react-browser-focused');
  const p2cReactViewports = run('p2c-react-five-viewport-browser');
  const p2cStandaloneBrowser = run('p2c-standalone-browser-focused');
  const p2cStandaloneViewports = run('p2c-standalone-five-viewport-browser');
  const p2cBuild = run('p2c-production-build');
  const fullRegressionState = fullRegression.failed > 0 ? 'FAIL '+fullRegression.failed+(fullRegression.stoppedEarly?' · 중단':'') : 'PASS';
  document.getElementById('automation-summary').textContent = 'PoC '+run('personal-workspace-poc-model').passed+'/'+run('personal-workspace-poc-model').tests+' · P2-A parity '+p2aParity.passed+'/'+p2aParity.tests+' · P2-A browser '+p2aBrowser.passed+'/'+p2aBrowser.tests+' · P2-B PoC '+p2bSuite.passed+'/'+p2bSuite.tests+' · focused '+p2bModel.passed+'/'+p2bModel.tests+' · standalone '+p2bStandalone.passed+'/'+p2bStandalone.tests+' · browser '+p2bBrowser.passed+'/'+p2bBrowser.tests+' + 6 viewport '+p2bViewports.passed+'/'+p2bViewports.tests+' · build '+p2bBuild.passed+'/'+p2bBuild.staticPages+' · P2-C PoC '+p2cSuite.passed+'/'+p2cSuite.tests+' · cross '+p2cCrossSurface.passed+'/'+p2cCrossSurface.tests+' · standalone '+p2cStandalone.passed+'/'+p2cStandalone.tests+' · React browser '+p2cReactBrowser.passed+'/'+p2cReactBrowser.tests+' + 5 viewport '+p2cReactViewports.passed+'/'+p2cReactViewports.tests+' · standalone browser '+p2cStandaloneBrowser.passed+'/'+p2cStandaloneBrowser.tests+' + 5 viewport '+p2cStandaloneViewports.passed+'/'+p2cStandaloneViewports.tests+' · build '+p2cBuild.passed+'/'+p2cBuild.staticPages+' · Stage 1 결합 '+run('stage1-combined-model').passed+'/'+run('stage1-combined-model').tests+' · Stage 1 browser '+run('stage1-runtime-browser').passed+'/'+run('stage1-runtime-browser').tests+' · Stage 2 browser '+run('stage2-runtime-browser').passed+'/'+run('stage2-runtime-browser').tests+' + 통합 '+run('stage2-integration-runtime-browser').passed+'/'+run('stage2-integration-runtime-browser').tests+' · 작성 최종 browser '+run('authoring-workspace-final-browser-bundle').passed+'/'+run('authoring-workspace-final-browser-bundle').tests+' · v4.1 core '+run('personal-workspace-v41-core-runtime-browser').passed+'/'+run('personal-workspace-v41-core-runtime-browser').tests+' · Stage 3 browser '+run('stage3-runtime-browser').passed+'/'+run('stage3-runtime-browser').tests+' · Stage 4 browser '+run('stage4-runtime-browser').passed+'/'+run('stage4-runtime-browser').tests+' · standalone model/runtime '+run('standalone-model').passed+'/'+run('standalone-model').tests+' + '+run('standalone-runtime-browser').passed+'/'+run('standalone-runtime-browser').tests+' · npm '+fullRegression.passed+'/'+fullRegression.tests+' ('+fullRegressionState+') · tail '+regressionTail.passed+'/'+regressionTail.tests+' · build '+p2cBuild.passed+'/'+p2cBuild.staticPages;
  document.getElementById('automation-time').textContent = '현재 격리 checkout의 manifest snapshot 생성: '+data.verificationManifest.generatedAt;
  const fullRegressionSummary = document.getElementById('full-regression-summary');
  fullRegressionSummary.textContent = fullRegression.passed+'/'+fullRegression.tests+' 통과 · '+fullRegression.failed+' 실패 · '+(fullRegression.stoppedEarly?'중단':'완료');
  fullRegressionSummary.dataset.status = fullRegression.failed > 0 ? 'fail' : 'pass';
  const regressionTailGroupCount = typeof regressionTail.groups === 'number'
    ? regressionTail.groups
    : Object.keys(regressionTail.groups || {}).length;
  document.getElementById('full-regression-detail').textContent = fullRegression.failure.summary+' 이번 fresh 실행은 fail-fast로 중단됐습니다. 중단 뒤 tail '+regressionTailGroupCount+'개 그룹 '+regressionTail.passed+'/'+regressionTail.tests+'를 별도로 통과했지만 전체 npm 성공으로 합산하지 않습니다.';
  const securityAudit = data.verificationManifest.knownIssues.securityAudit;
  document.getElementById('security-audit-summary').textContent = securityAudit.status+' · '+securityAudit.vulnerabilities+'건 (high '+securityAudit.high+', low '+securityAudit.low+')';
  document.getElementById('storage-boundary-summary').textContent = '허용 prefix 밖 write/remove '+data.verificationManifest.storageBoundary.writesOutsideAllowedPrefix+'/'+data.verificationManifest.storageBoundary.removesOutsideAllowedPrefix+' · clear '+data.verificationManifest.storageBoundary.clearCalls+' · sentinel 변경 '+data.verificationManifest.storageBoundary.operatingSentinelBytesChanged;
  document.getElementById('storage-boundary-scope').textContent = data.verificationManifest.storageBoundary.scope+' — '+data.verificationManifest.storageBoundary.note;
  document.getElementById('android-status').textContent = data.verificationManifest.externalEvidence.androidChrome;
  document.getElementById('ios-status').textContent = data.verificationManifest.externalEvidence.iosSafari;
  document.getElementById('observed-users').textContent = data.verificationManifest.externalEvidence.observedUsers+'명';
  const controls = {
    query: document.getElementById('query'), product: document.getElementById('product-filter'),
    verdict: document.getElementById('verdict-filter'), decision: document.getElementById('decision-filter'), journey: document.getElementById('journey-filter'),
    category: document.getElementById('category-filter'), priority: document.getElementById('priority-filter')
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const options = (select, values) => [...new Set(values)].sort((a,b)=>a.localeCompare(b,'ko')).forEach(value => select.insertAdjacentHTML('beforeend','<option value="'+escape(value)+'">'+escape(value)+'</option>'));
  options(controls.verdict, rows.map(row => row.verdict));
  options(controls.decision, rows.map(row => row.decisionClass));
  options(controls.journey, rows.map(row => row.journey));
  options(controls.category, rows.flatMap(row => row.category));
  const count = (fn) => rows.filter(fn).length;
  document.getElementById('primary-count').textContent = count(row => row.product !== 'BP');
  document.getElementById('bridge-count').textContent = count(row => row.product === 'BP');
  document.getElementById('pass-count').textContent = count(row => row.product !== 'BP' && row.verdict === '충족');
  document.getElementById('gap-count').textContent = count(row => row.product !== 'BP' && (row.verdict === '부분' || row.verdict === '미충족'));
  document.getElementById('boundary-count').textContent = count(row => row.product !== 'BP' && ['의도적 변경','제외','결정 필요'].includes(row.verdict));
  document.getElementById('bridge-verdicts').textContent = '충족 '+count(row => row.product === 'BP' && row.verdict === '충족')+' · 부분/미충족 '+count(row => row.product === 'BP' && ['부분','미충족'].includes(row.verdict))+' · 변경/제외/결정 '+count(row => row.product === 'BP' && ['의도적 변경','제외','결정 필요'].includes(row.verdict));
  ['V41','D1','D2','BP'].forEach(product => { document.querySelector('[data-product-count="'+product+'"]').textContent = count(row => row.product === product); });
  ['V41','D1','D2'].forEach(product => { document.querySelector('[data-product-verdicts="'+product+'"]').textContent = '충족 '+count(row => row.product === product && row.verdict === '충족')+' · 부분/미충족 '+count(row => row.product === product && ['부분','미충족'].includes(row.verdict))+' · 변경/제외/결정 '+count(row => row.product === product && ['의도적 변경','제외','결정 필요'].includes(row.verdict)); });

  const searchable = row => [row.id,row.title,row.source,row.sourceArtifact,row.expected,row.currentEvidence,row.reason,row.action,row.linkGroup,row.thisRun.status,row.thisRun.detail,JSON.stringify(row.subchecks),row.category.join(' ')].join(' ').toLocaleLowerCase('ko');
  const selected = () => {
    const query = controls.query.value.trim().toLocaleLowerCase('ko');
    return rows.filter(row => (!query || searchable(row).includes(query)) &&
      (controls.product.value === 'all' || (controls.product.value === 'primary' && row.product !== 'BP') || row.product === controls.product.value) &&
      (controls.verdict.value === 'all' || row.verdict === controls.verdict.value) &&
      (controls.decision.value === 'all' || row.decisionClass === controls.decision.value) &&
      (controls.journey.value === 'all' || row.journey === controls.journey.value) &&
      (controls.category.value === 'all' || row.category.includes(controls.category.value)) &&
      (controls.priority.value === 'all' || row.priority === controls.priority.value));
  };
  const renderSubchecks = row => row.subchecks.length ? '<section class="req-subchecks"><h4>하위 관찰 조건 '+row.subchecks.length+'개</h4><ul>'+row.subchecks.map(subcheck => '<li><strong>'+escape(subcheck.id)+'</strong><span>'+escape(subcheck.title)+'</span><span class="chip" data-verdict="'+escape(subcheck.verdict)+'">'+escape(subcheck.verdict)+' · '+escape(subcheck.evidence)+'</span><p>'+escape(subcheck.note)+'</p></li>').join('')+'</ul></section>' : '';
  const render = () => {
    const visible = selected();
    document.getElementById('visible-count').textContent = visible.length;
    matrix.innerHTML = visible.length ? visible.map(row => '<details class="req" data-product="'+escape(row.product)+'"><summary><span class="req-id">'+escape(row.id)+'</span><span class="req-title">'+escape(row.title)+'</span><span class="req-meta"><span class="chip" data-verdict="'+escape(row.verdict)+'">'+escape(row.verdict)+'</span><span class="chip">'+escape(row.priority)+'</span><span class="chip">'+escape(row.evidence)+'</span>'+(row.subchecks.length?'<span class="chip">하위 '+row.subchecks.length+'</span>':'')+'</span></summary><div class="req-body"><section class="req-block"><h4>당시 기대 화면·행동</h4><p>'+escape(row.expected)+'</p></section><section class="req-block"><h4>현재 구현·검증 증거</h4><p>'+escape(Array.isArray(row.currentEvidence) ? row.currentEvidence.join('\\n') : row.currentEvidence)+'</p></section><section class="req-block"><h4>원출처·결정 상태</h4><p class="req-source">'+escape(row.source)+'\\n'+escape(row.sourceArtifact)+'\\n'+escape(row.decisionClass)+' ('+escape(row.decision)+') · '+escape(row.category.join(' · '))+' · '+escape(row.journey)+'</p></section><section class="req-block"><h4>차이 원인·이번 작업·다음 조치</h4><p>'+escape(row.reason)+'\\n\\n이번 작업: '+escape(row.thisRun.status)+' — '+escape(row.thisRun.detail)+'\\n\\n다음: '+escape(row.action)+'\\n연결 묶음: '+escape(row.linkGroup)+'</p></section>'+renderSubchecks(row)+'</div></details>').join('') : '<div class="empty-results">선택한 조건에 맞는 요구가 없습니다.</div>';
  };
  Object.values(controls).forEach(control => { control.addEventListener(control === controls.query ? 'input' : 'change', render); });
  document.getElementById('reset-filters').addEventListener('click', () => { controls.query.value='';controls.product.value='primary';Object.values(controls).slice(2).forEach(control => control.value='all');render();controls.query.focus(); });
  document.querySelectorAll('[data-journey-shortcut]').forEach(button => button.addEventListener('click', () => { controls.journey.value = button.dataset.journeyShortcut; render(); document.getElementById('requirements').scrollIntoView(); }));
  document.getElementById('copy-summary').addEventListener('click', async () => {
    const visible = selected();
    const text = ['FlowMe 통합 PoC 요구 추적','표시 '+visible.length+' / 전체 '+rows.length,''].concat(visible.map(row => row.id+' | '+row.verdict+' | '+row.title+' | '+row.action)).join('\\n');
    try { await navigator.clipboard.writeText(text); document.getElementById('copy-summary').textContent='복사됨'; } catch { window.prompt('아래 내용을 복사하세요.', text); }
  });
  const history = document.getElementById('history');
  history.innerHTML = data.histories.length ? data.histories.map(item => '<article><h3>'+escape(item.product ? item.product+' · ' : '')+escape(item.id)+' · '+escape(item.status)+'</h3><p>'+escape(item.meaning)+'</p><p><strong>출처</strong> '+escape(item.source)+(item.replacedBy?' · <strong>대체</strong> '+escape(item.replacedBy):'')+'</p></article>').join('') : '<p class="empty-results">대체 결정 ledger를 확인 중입니다.</p>';
  const decisionHistory = document.getElementById('decision-history');
  decisionHistory.innerHTML = data.decisionRows.length ? data.decisionRows.map(item => '<article><h3>'+escape(item.id)+' · '+escape(item.verdict)+'</h3><p>'+escape(item.title)+' — '+escape(item.reason)+'</p><p><strong>다음</strong> '+escape(item.action)+'</p></article>').join('') : '<p class="empty-results">현재 결정 게이트가 없습니다.</p>';
  render();
})();
</script>
</body>
</html>`;

if (process.argv.includes('--verify-only')) {
  console.log(`verified ${requirements.length} requirements without writing report HTML`);
} else {
  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`built ${path.relative(process.cwd(), reportPath)} with ${requirements.length} requirements`);
}
