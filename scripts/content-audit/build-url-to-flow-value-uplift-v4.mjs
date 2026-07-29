import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditLegacySourceCase,
  auditV3Outputs,
  buildPairwiseViews,
  validateSourcePacket,
  validateValueUpliftProposal,
} from "./url-to-flow-value-uplift-v4-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(repoRoot, "docs/specs/2026-07-18-url-to-flow-value-uplift-v4");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-18-url-to-flow-value-uplift-v4");
const legacyCasePath = path.join(repoRoot, "docs/specs/2026-07-14-url-to-flow-prompt-lab/cases-v1.json");
const v3ReportPath = path.join(repoRoot, "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/report-data.json");

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const readJsonMaybe = async (file) => {
  try {
    return await readJson(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};
const write = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, "utf8");
};
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const [legacyCases, v3Report, contract, liveBaseline, enriched] = await Promise.all([
  readJson(legacyCasePath),
  readJson(v3ReportPath),
  readJson(path.join(specDir, "value-uplift-contract-v4.json")),
  readJson(path.join(specDir, "live-baseline.json")),
  readJson(path.join(specDir, "enriched-case-02-v4.json")),
]);

const reassessment = legacyCases.cases.map((sourceCase) =>
  auditLegacySourceCase(sourceCase, sourceCase.caseId === enriched.auditCaseId ? enriched : null),
);
const v3Audit = auditV3Outputs(v3Report);
const sourcePacketGate = validateSourcePacket(enriched);
const candidateValidation = validateValueUpliftProposal(enriched, contract, liveBaseline);
const v3Case02 = v3Report.cases.find((entry) => entry.auditCaseId === "case-02");
const pairwiseViews = buildPairwiseViews(enriched, v3Case02);
const reviewResults = (await Promise.all([
  readJsonMaybe(path.join(auditDir, "review-results/reviewer-a.json")),
  readJsonMaybe(path.join(auditDir, "review-results/reviewer-b.json")),
])).filter(Boolean);
const candidateOptionByReviewer = { "reviewer-a": "B", "reviewer-b": "A" };
const pairwiseJudgments = reviewResults.flatMap((review) =>
  review.judgments.map((judgment) => ({
    ...judgment,
    reviewerId: review.reviewerId,
    candidateWon: judgment.choice === candidateOptionByReviewer[review.reviewerId],
    baselineWon: judgment.choice !== "tie" && judgment.choice !== candidateOptionByReviewer[review.reviewerId],
  })),
);
const nonTieJudgments = pairwiseJudgments.filter((entry) => entry.choice !== "tie");
const pairwiseSummary = reviewResults.length
  ? {
      reviewerContextCount: reviewResults.length,
      judgmentCount: pairwiseJudgments.length,
      candidateWinCount: pairwiseJudgments.filter((entry) => entry.candidateWon).length,
      baselineWinCount: pairwiseJudgments.filter((entry) => entry.baselineWon).length,
      tieCount: pairwiseJudgments.filter((entry) => entry.choice === "tie").length,
      candidatePreferenceAmongNonTies: nonTieJudgments.length
        ? pairwiseJudgments.filter((entry) => entry.candidateWon).length / nonTieJudgments.length
        : 0,
      candidateOverallChoiceCount: reviewResults.filter(
        (review) => review.overallChoice === candidateOptionByReviewer[review.reviewerId],
      ).length,
      unsupportedOrUnsafeFindingCount: reviewResults.reduce(
        (sum, review) => sum + review.unsupportedOrUnsafeFindings.length,
        0,
      ),
      reviewerProxies: reviewResults.map((review) => review.reviewProxy),
      notes: reviewResults.map((review) => ({ reviewerId: review.reviewerId, note: review.note })),
    }
  : null;
const pairwisePassed = Boolean(
  pairwiseSummary
  && pairwiseSummary.reviewerContextCount >= contract.pairwiseGate.minimumIndependentReviewerContexts
  && pairwiseSummary.candidatePreferenceAmongNonTies >= contract.pairwiseGate.minimumCandidatePreferenceAmongNonTies
  && pairwiseSummary.candidateOverallChoiceCount === pairwiseSummary.reviewerContextCount
  && pairwiseSummary.unsupportedOrUnsafeFindingCount === 0,
);

const dispositionCounts = Object.fromEntries(
  contract.dispositions.map((value) => [value, reassessment.filter((entry) => entry.disposition === value).length]),
);

const legacyCaseById = new Map(legacyCases.cases.map((entry) => [entry.caseId, entry]));
const v3CaseById = new Map(v3Report.cases.map((entry) => [entry.auditCaseId, entry]));
const extractedContentCases = reassessment.map((entry) => {
  const sourceCase = legacyCaseById.get(entry.auditCaseId);
  const v3Case = v3CaseById.get(entry.auditCaseId);
  const primary = sourceCase?.source?.primary ?? {};
  const proposal = v3Case?.proposal ?? null;
  const isCurrentSourceCandidate = entry.auditCaseId === enriched.auditCaseId;
  const source = isCurrentSourceCandidate
    ? {
        ...enriched.source,
        checkedAt: enriched.capturedAt,
        evidenceMode: "current_source_reextracted",
        coverage: enriched.coverage,
      }
    : {
        title: primary.title ?? entry.title,
        url: primary.originalUrl ?? null,
        publisher: primary.publisher ?? null,
        sourceType: primary.sourceType ?? null,
        locale: primary.locale ?? null,
        countryContext: primary.countryContext ?? null,
        checkedAt: primary.checkedAt ?? null,
        accessStatus: primary.accessStatus ?? "unknown",
        rightsStatus: primary.rightsStatus ?? "unknown",
        riskClass: primary.riskLevel ?? null,
        evidenceMode: entry.sourceRowCount > 0 ? "legacy_sparse_source_rows" : "no_usable_source_rows",
        coverage: {
          status: "not_reverified_in_v4",
          scope: sourceCase?.claimedScope ?? null,
          excluded: [],
        },
      };
  const v3Items = proposal?.items ?? [];
  const v3SourceRows = v3Case?.sourceRows ?? sourceCase?.sourceRows ?? [];
  const v4Output = isCurrentSourceCandidate
    ? {
        state: "generated",
        flow: enriched.proposal.flow,
        items: enriched.proposal.items,
        cautions: enriched.proposal.cautions,
        projections: enriched.proposal.projections,
        exampleUserOverlay: enriched.proposal.exampleUserOverlay,
        renderedArtifacts: enriched.proposal.renderedArtifacts,
        outputCounts: {
          calendarEvents: 1,
          publishableItems: enriched.proposal.items.length,
          checklistRows: enriched.proposal.items.length,
          memoArtifacts: 1,
          sheetRows: 0,
        },
      }
    : {
        state: "not_generated",
        flow: null,
        items: [],
        projections: [],
        renderedArtifacts: {},
        outputCounts: {
          calendarEvents: 0,
          publishableItems: 0,
          checklistRows: 0,
          memoArtifacts: 0,
          sheetRows: 0,
        },
      };

  return {
    auditCaseId: entry.auditCaseId,
    title: entry.title,
    userJob: entry.originalUserJob,
    source,
    sourceEvidence: isCurrentSourceCandidate ? enriched.sourceEvidence : [],
    v3Extraction: {
      state: proposal?.result?.state ?? "missing",
      primaryArtifact: proposal?.result?.primaryArtifact ?? null,
      sourceRows: v3SourceRows,
      items: v3Items,
      projections: proposal?.projections ?? [],
      uncertaintyCodes: proposal?.review?.uncertaintyCodes ?? [],
      omittedRows: proposal?.omittedRows ?? [],
    },
    v4Output,
    decision: {
      disposition: entry.disposition,
      reasonCodes: entry.reasonCodes,
      unableToBuild: entry.disposition === "compile_candidate" ? [] : entry.neededEvidence,
      nextExtractionTargets: entry.neededEvidence,
    },
  };
});

const reportData = {
  reportVersion: "flowme-url-to-flow-value-uplift-v4-report-v2",
  generatedAt: "2026-07-18",
  baseline: {
    source: liveBaseline.capturedFrom,
    capturedAt: liveBaseline.capturedAt,
    contentCount: liveBaseline.contentCount,
    strongReferences: [
      { path: "/flow-maps/moving-d30", reason: "time axis and observable completion" },
      { path: "/flow-maps/curated-opic-mock-course", reason: "source plan preserved as executable schedule" },
      { path: "/flow-maps/curated-new-car-purchase-guide", reason: "decision, memo, official-source separation" },
    ],
    requiredCapabilities: liveBaseline.requiredCapabilities,
    flows: liveBaseline.flows,
  },
  correction: {
    previousEvidence: "v3 deterministic SourceRow fidelity/controller replay",
    previousModelProxyScore: v3Audit.priorModelProxyScore,
    validInterpretation: "The controller did not invent unsupported content.",
    invalidInterpretation: "The generated content is better than the live Flow finding baseline.",
    productQualityDecision: "No-Go for v3 public-content quality",
    controllerDecision: "Keep as a lower safety/accounting layer",
  },
  v3Audit,
  reassessment: {
    total: reassessment.length,
    dispositionCounts,
    cases: reassessment,
  },
  extractedContent: {
    summary: {
      reviewedCaseCount: extractedContentCases.length,
      currentSourceReextractedCount: extractedContentCases.filter((entry) => entry.source.evidenceMode === "current_source_reextracted").length,
      actualV4FlowCount: extractedContentCases.filter((entry) => entry.v4Output.state === "generated").length,
      intentionalNoCompileCount: extractedContentCases.filter((entry) => entry.v4Output.state === "not_generated").length,
      legacySparseFixtureCount: extractedContentCases.filter((entry) => entry.source.evidenceMode === "legacy_sparse_source_rows").length,
    },
    cases: extractedContentCases,
  },
  workedExample: {
    auditCaseId: enriched.auditCaseId,
    sourcePacketGate,
    candidateValidation,
    before: pairwiseViews.minimal,
    after: pairwiseViews.candidate,
    source: pairwiseViews.source,
  },
  gates: contract,
  pairwise: {
    status: pairwisePassed ? "passed" : reviewResults.length ? "failed" : "prepared",
    scoreState: candidateValidation.scoreState,
    packetCount: 2,
    requiredIndependentReviewerContexts: contract.pairwiseGate.minimumIndependentReviewerContexts,
    minimumCandidatePreferenceAmongNonTies: contract.pairwiseGate.minimumCandidatePreferenceAmongNonTies,
    results: pairwiseSummary,
    nonClaim: pairwisePassed
      ? "This is a one-case model-proxy preference result, not human validation or public-ready evidence."
      : "Prepared packets are not a preference result until independent reviewers submit judgments.",
  },
};

await Promise.all([
  writeJson(path.join(auditDir, "report-data.json"), reportData),
  writeJson(path.join(auditDir, "extracted-flow-content.json"), {
    version: "flowme-extracted-flow-content-v4.0",
    generatedAt: "2026-07-18",
    summary: reportData.extractedContent.summary,
    cases: extractedContentCases,
  }),
  writeJson(path.join(auditDir, "case-reassessment.json"), {
    version: "flowme-v4-case-reassessment-v1",
    generatedAt: "2026-07-18",
    cases: reassessment,
  }),
]);

const questions = [
  "Which option can be started faster without reopening the source?",
  "Which option makes completion or hold more observable?",
  "Which option creates the more useful calendar/checklist/todo/sheet/memo artifact?",
  "Which option preserves source context and cautions more reliably?",
  "Which option is more likely to be revisited or reused?",
  "Which option uses less generic copy?",
  "Overall, which option would you save?",
];
const packet = (reviewerId, optionA, optionB) => ({
  protocolVersion: "flowme-blind-pairwise-v4.0",
  reviewerId,
  source: pairwiseViews.source,
  optionA,
  optionB,
  questions,
  allowedChoice: ["A", "B", "tie"],
  requiredOutput: {
    reviewerId: "string",
    judgments: questions.map((question, index) => ({ questionId: `q${index + 1}`, choice: "A|B|tie", reasonCode: "string" })),
    unsupportedOrUnsafeFindings: [],
    overallChoice: "A|B|tie",
    note: "one concise sentence",
  },
  prohibitedContext: ["version labels", "model labels", "expected winner", "previous scores"],
});
await Promise.all([
  writeJson(path.join(auditDir, "review-packets/pair-01-reviewer-a.json"), packet("reviewer-a", pairwiseViews.minimal, pairwiseViews.candidate)),
  writeJson(path.join(auditDir, "review-packets/pair-01-reviewer-b.json"), packet("reviewer-b", pairwiseViews.candidate, pairwiseViews.minimal)),
]);

const baselineMd = `# Live Flow 찾기 baseline capture\n\n- Captured: 2026-07-18\n- URL: ${liveBaseline.capturedFrom}\n- Visible content count: ${liveBaseline.contentCount}\n- Method: ${liveBaseline.captureMethod}\n\n| Flow | Input/choice | Result bundle | First action | Scale |\n|---|---|---|---|---:|\n${liveBaseline.flows.map((entry) => `| [${entry.title}](https://flowme2605.vercel.app${entry.path}) | ${entry.inputRule} | ${entry.resultBundle.join(" + ")} | ${entry.firstAction} | ${entry.itemCount} |`).join("\n")}\n\n## Benchmark policy\n\nThe seven visible Flows define mandatory public-surface capabilities. The primary quality references are moving D-30, OPIC, and new-car purchase because they most clearly preserve timing, completion, decision, and source boundaries. Reading is a visible lower bound, not the target ceiling.\n`;
await write(path.join(auditDir, "live-baseline-capture.md"), baselineMd);

const comparisonMd = `# v3 controller evidence vs v4 product-quality gate\n\n| Question | v3 | v4 |\n|---|---|---|\n| Did every SourceRow stay accounted for? | yes | required hard gate |\n| Is the source scope complete or bounded? | not tested | required |\n| Does every Item have observable completion? | 0/${v3Audit.itemCount} | ${candidateValidation.metrics.observableCompletionRate * 100}% in worked candidate |\n| Are projections usable payloads? | ${v3Audit.projectionPayloadCount} | ${candidateValidation.metrics.projectionCount} payloads in worked candidate |\n| Does the result expose input -> bundle -> first action? | no | required |\n| Does it match live Flow 찾기 capabilities? | not tested | ${Math.round(candidateValidation.metrics.liveBaselineCapabilityRate * 100)}% in worked candidate |\n| Is it better than baseline? | not tested | score withheld until blind pairwise |\n\nThe v3 controller remains useful as a source-accounting layer. It is no longer a publish-quality decision maker.\n`;
await write(path.join(auditDir, "comparison.md"), comparisonMd);

const colors = {
  navy: "#111827",
  blue: "#2563eb",
  cyan: "#06b6d4",
  green: "#16803c",
  red: "#b42318",
  amber: "#a15c00",
};
const css = `
 :root{--ink:${colors.navy};--muted:#617086;--blue:${colors.blue};--cyan:${colors.cyan};--green:${colors.green};--red:${colors.red};--amber:${colors.amber};--line:#d9e0e8;--soft:#f4f7fb;--paper:#fff;--rail:#0f172a;font-family:Inter,"Pretendard","Noto Sans KR",system-ui,sans-serif;color:var(--ink)}
 *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#e8edf3;line-height:1.48}.deck{scroll-snap-type:y proximity}.slide{min-height:100svh;background:var(--paper);display:grid;grid-template-columns:176px minmax(0,1fr);scroll-snap-align:start;border-bottom:1px solid #c9d2de}.rail{background:var(--rail);color:#fff;padding:34px 24px;display:flex;flex-direction:column;gap:18px}.rail .num{font-size:54px;font-weight:850;line-height:1;color:#5dd5ee}.rail .name{font-size:18px;font-weight:760}.rail .meta{margin-top:auto;color:#94a3b8;font-size:12px}.canvas{padding:44px 54px 38px;display:flex;flex-direction:column;gap:24px;overflow:hidden}.canvas h1{font-size:clamp(40px,5vw,74px);line-height:1.06;letter-spacing:-.055em;margin:0;max-width:1200px}.canvas h2{font-size:clamp(30px,3.2vw,50px);line-height:1.12;letter-spacing:-.04em;margin:0}.canvas h3{font-size:19px;margin:0 0 8px}.canvas a{color:var(--blue)}.lead{font-size:20px;color:var(--muted);max-width:980px;margin:0}.blue{color:var(--blue)}.green{color:var(--green)}.red{color:var(--red)}.muted{color:var(--muted)}.small{font-size:13px}.evidence{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px;margin-top:auto}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.open{border-top:4px solid var(--blue);padding:18px 4px 0}.open.weak{border-color:var(--red)}.open.good{border-color:var(--green)}.open p{margin:6px 0}.big{font-size:42px;font-weight:850;line-height:1}.metric-row{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line);background:#fbfdff}.metric{padding:18px;text-align:center;border-left:1px solid var(--line)}.metric:first-child{border-left:0}.metric strong{display:block;font-size:36px;color:var(--blue);line-height:1}.metric span{font-size:12px;color:var(--muted)}.pair{display:grid;grid-template-columns:1fr 70px 1.2fr;gap:18px;align-items:center}.panel{border:1px solid var(--line);padding:22px;background:#fff}.panel.weak{background:#fff7f6;border-color:#f0b7b0}.panel.good{background:#f2fbf5;border-color:#acd7b9}.arrow{font-size:46px;color:var(--blue);text-align:center;font-weight:900}.label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800}.title{font-size:25px;font-weight:820;margin:8px 0}.promise{font-size:16px;color:var(--muted)}.item{border-top:1px solid var(--line);padding:12px 0}.item b{display:block}.item span{font-size:13px;color:var(--muted)}.rules{display:grid;border-top:1px solid var(--line)}.rule{display:grid;grid-template-columns:180px 1fr;gap:18px;border-bottom:1px solid var(--line);padding:13px 0}.rule b{color:var(--blue)}.pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.stage{border:1px solid var(--line);padding:15px;min-height:118px}.stage strong{color:var(--blue);display:block;font-size:18px}.stage span{font-size:12px;color:var(--muted)}.stage.hold{background:#fff8eb}.stage.pass{background:#f1faf4}.table{width:100%;border-collapse:collapse;font-size:14px}.table th,.table td{text-align:left;padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:top}.table th{font-size:11px;color:var(--muted);text-transform:uppercase}.status{font-weight:800}.status.hold{color:var(--amber)}.status.block{color:var(--red)}.status.pass{color:var(--green)}.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid var(--line);padding:7px 10px;font-size:12px;font-weight:730}.code{background:#101827;color:#e6eef9;padding:20px;font-family:Consolas,monospace;font-size:13px;white-space:pre-wrap;overflow:auto}.case-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.case{border:1px solid var(--line);padding:12px;text-decoration:none;min-height:115px}.case:hover{border-color:var(--blue)}.case b{display:block}.case small{color:var(--muted)}.case.pass{border-top:4px solid var(--green)}.case.hold{border-top:4px solid var(--amber)}.case.block{border-top:4px solid var(--red)}.bar{height:9px;background:#e5eaf0;margin-top:8px}.bar span{display:block;height:100%;background:var(--blue)}.nav{position:fixed;right:16px;bottom:16px;display:flex;gap:8px;z-index:20}.nav button{border:1px solid #aeb8c4;background:#fff;padding:9px 12px;cursor:pointer}.nav .counter{background:var(--rail);color:#fff;border-color:var(--rail);min-width:82px}.checklist{list-style:none;padding:0;margin:0}.checklist li{padding:9px 0;border-bottom:1px solid var(--line)}.checklist li:before{content:"✓";color:var(--green);font-weight:900;margin-right:10px}.footnote{padding:12px 16px;background:var(--soft);font-size:13px;color:var(--muted)}.flow-hero{display:grid;grid-template-columns:.9fr 1.25fr;gap:20px}.source-card,.flow-card,.artifact-card,.catalog-card{border:1px solid var(--line);background:#fff;padding:18px}.source-card{background:#f8fafc}.flow-card{border-top:5px solid var(--green)}.fact{display:grid;grid-template-columns:42px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}.fact:last-child{border-bottom:0}.fact b{color:var(--blue)}.flow-summary{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.flow-summary span{padding:6px 9px;background:var(--soft);font-size:12px}.artifact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.artifact-card{min-height:275px}.artifact-card h3{color:var(--blue)}.calendar-date{font-size:27px;font-weight:850}.occurrences{display:flex;gap:7px;flex-wrap:wrap}.occurrences span{background:#eef5ff;padding:5px 8px;font-size:12px}.output-lines{white-space:pre-line;font-size:13px}.source-map{display:grid;grid-template-columns:1fr 54px 1fr;gap:10px;align-items:center}.source-map .map-arrow{text-align:center;color:var(--blue);font-size:26px;font-weight:900}.catalog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.catalog-card{padding:14px;text-decoration:none;color:var(--ink);min-height:190px;border-top:4px solid var(--amber)}.catalog-card.pass{border-top-color:var(--green)}.catalog-card.block{border-top-color:var(--red)}.catalog-card b{display:block}.catalog-card .rows{font-size:12px;color:var(--muted);margin:8px 0}.catalog-card .generated{font-size:13px;margin:7px 0}.zero{color:var(--red);font-weight:800}.truth-banner{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line)}.truth-banner>div{padding:18px}.truth-banner>div+div{border-left:1px solid var(--line)}.truth-banner strong{font-size:40px;display:block}.truth-banner .made strong{color:var(--green)}.truth-banner .held strong{color:var(--red)}
@media(min-width:901px){#slide-1 .canvas{padding-top:27px;padding-bottom:20px;gap:13px}#slide-1 .canvas h1{font-size:52px}#slide-1 .truth-banner>div{padding:8px 14px}#slide-1 .truth-banner strong{font-size:29px;line-height:1.05}#slide-1 .source-card,#slide-1 .flow-card{padding:12px 14px}#slide-1 .title{font-size:21px;margin:5px 0}#slide-1 .flow-summary{margin:5px 0;gap:5px}#slide-1 .flow-summary span{padding:4px 7px}#slide-1 .item{padding:6px 0}#slide-1 .item span{font-size:12px}#slide-4 .canvas,#slide-5 .canvas{padding-top:32px;padding-bottom:26px;gap:14px}#slide-4 .catalog-card,#slide-5 .catalog-card{min-height:158px;padding:10px}#slide-4 .catalog-card .rows,#slide-5 .catalog-card .rows{margin:4px 0}#slide-4 .catalog-card .generated,#slide-5 .catalog-card .generated{margin:4px 0;font-size:12px}}
@media(max-width:900px){.slide{grid-template-columns:1fr;min-height:auto}.rail{padding:16px 20px;display:grid;grid-template-columns:auto 1fr auto;align-items:center}.rail .num{font-size:28px}.rail .meta{margin:0}.canvas{padding:28px 20px 70px}.grid2,.grid3,.grid4,.pair,.flow-hero,.artifact-grid,.source-map{grid-template-columns:1fr}.source-map .map-arrow{transform:rotate(90deg)}.arrow{transform:rotate(90deg)}.metric-row{grid-template-columns:1fr 1fr}.pipeline{grid-template-columns:1fr 1fr}.case-grid,.catalog-grid{grid-template-columns:1fr 1fr}.rule{grid-template-columns:1fr}.canvas h1{font-size:42px}}
@media(max-width:560px){.metric-row,.pipeline,.case-grid,.catalog-grid,.truth-banner{grid-template-columns:1fr}.truth-banner>div+div{border-left:0;border-top:1px solid var(--line)}.metric{border-left:0;border-top:1px solid var(--line)}.metric:first-child{border-top:0}.canvas h1{font-size:34px}.canvas h2{font-size:29px}.lead{font-size:17px}.nav button:not(.counter){display:none}}
@media print{@page{size:16in 9in;margin:0}.nav{display:none}.slide{width:16in;height:9in;min-height:0;break-after:page;overflow:hidden}.canvas{padding:34px 46px}.rail{padding:28px 22px}}
`;

const slide = (number, name, body, evidence = "") => `<section class="slide" id="slide-${number}"><aside class="rail"><div class="num">${String(number).padStart(2, "0")}</div><div class="name">${name}</div><div class="meta">FLOW · Value Uplift v4<br>2026.07.18</div></aside><main class="canvas">${body}${evidence ? `<div class="evidence">${evidence}</div>` : ""}</main></section>`;
const strong = reportData.baseline.strongReferences.map((entry) => liveBaseline.flows.find((flow) => flow.path === entry.path));
const candidateItems = enriched.proposal.items.map((item) => `<div class="item"><b>${esc(item.title)}</b><span>완료: ${esc(item.completion.criterion)}</span></div>`).join("");
const sourceUseByEvidence = {
  "ev-01-recurrence": "4주 반복 캘린더",
  "ev-02-light-dust": "방법 선택 + 청소 Item",
  "ev-03-heavy-dust": "방법 선택 + 청소 Item",
  "ev-04-dry": "건조 Item + 완료 기준",
  "ev-05-caution": "주의 메모",
};
const sourceEvidenceRows = enriched.sourceEvidence.map((entry) => `<tr><td><b>${esc(entry.normalizedFact ?? entry.text)}</b><br><span class="small muted">${esc(entry.location)}</span></td><td>${esc(sourceUseByEvidence[entry.evidenceId])}</td><td>${entry.evidenceId === "ev-01-recurrence" ? "원문 짧은 인용 + 정규화" : "원문 의미를 실행 필드로 정규화"}</td></tr>`).join("");
const sourceModeLabel = (entry) => entry.source.evidenceMode === "current_source_reextracted"
  ? "현재 원문 재확인"
  : entry.source.evidenceMode === "legacy_sparse_source_rows"
    ? "기존 희소 SourceRow"
    : "사용 가능한 SourceRow 없음";
const cardKind = (entry) => entry.v4Output.state === "generated" ? "pass" : entry.decision.disposition === "blocked" ? "block" : "hold";
const compactRows = (rows) => rows.length ? rows.map((row) => row.title).join(" · ") : "없음";
const compactItems = (items) => items.length ? items.map((item) => item.title).join(" · ") : "생성 없음";
const renderCatalogCards = (entries) => entries.map((entry) => `<a class="catalog-card ${cardKind(entry)}" href="flow-content-gallery.html#${esc(entry.auditCaseId)}"><small>${esc(entry.auditCaseId)} · ${sourceModeLabel(entry)}</small><b>${esc(entry.title)}</b><div class="rows">입력 근거: ${esc(compactRows(entry.v3Extraction.sourceRows))}</div><div class="generated">v3: ${esc(entry.v3Extraction.primaryArtifact ?? "artifact 없음")} → ${esc(compactItems(entry.v3Extraction.items))}</div><div class="${entry.v4Output.state === "generated" ? "status pass" : "zero"}">v4: ${entry.v4Output.state === "generated" ? `${entry.v4Output.items.length} Items · 실제 출력 3종` : "Flow 생성 안 함 · publishable Item 0"}</div></a>`).join("");
const firstSixCards = renderCatalogCards(extractedContentCases.slice(0, 6));
const lastSixCards = renderCatalogCards(extractedContentCases.slice(6));
const case01 = extractedContentCases.find((entry) => entry.auditCaseId === "case-01");
const case05 = extractedContentCases.find((entry) => entry.auditCaseId === "case-05");
const case06 = extractedContentCases.find((entry) => entry.auditCaseId === "case-06");
const rendered = enriched.proposal.renderedArtifacts;

const slides = [
  slide(1, "실제 생성 결과", `<h1>원문에서 실제로 만든 Flow는<br><span class="green">이 1개</span>입니다</h1><div class="truth-banner"><div class="made"><strong>1</strong><span>현재 원문을 다시 읽고 만든 v4 Flow</span></div><div class="held"><strong>11</strong><span>근거 부족·접근·지역 문제로 의도적으로 생성 안 함</span></div></div><div class="flow-hero"><div class="source-card"><div class="label">원문 · 삼성전자서비스 · 2026-07-18 확인</div><div class="title">${esc(enriched.source.title)}</div><p>“${esc(enriched.sourceEvidence[0].verbatimExcerpt)}”</p><p class="muted">오염 정도별 청소법 · 그늘 건조 · 필터 손상 주의를 한 Flow 범위로 사용</p><p><a href="${esc(enriched.source.url)}">원문 열기</a></p></div><div class="flow-card"><div class="label">생성된 Flow 콘텐츠</div><div class="title">${esc(enriched.proposal.flow.title)}</div><div class="flow-summary"><span>입력: ${esc(enriched.proposal.flow.inputRule.label)}</span>${enriched.proposal.flow.resultBundle.map((value) => `<span>${esc(value)}</span>`).join("")}</div>${candidateItems}</div></div>`, `판단 대상은 case-02 한 건입니다. 나머지 11개를 생성 성공 사례로 세지 않습니다.`),
  slide(2, "원문 → Flow 대응", `<h2>원문 근거 5개가 <span class="blue">어느 Flow 필드가 됐는지</span></h2><table class="table"><thead><tr><th>원문에서 확인한 사실</th><th>생성된 콘텐츠</th><th>처리 방식</th></tr></thead><tbody>${sourceEvidenceRows}</tbody></table><div class="grid2"><div class="footnote"><b>사용한 범위</b><br>${esc(enriched.coverage.scope)}</div><div class="footnote"><b>제외한 범위</b><br>${esc(enriched.coverage.excluded.join(" · "))}</div></div>`, `짧은 원문 인용과 정규화 사실을 분리했습니다. 새 청소법·주기·효과는 추가하지 않았습니다.`),
  slide(3, "실제 출력", `<h2>예시 날짜를 넣으면 사용자는 <span class="blue">이 3개를 받습니다</span></h2><p class="lead">보고서 표시용 사용자 예시 입력: 첫 청소일 ${esc(enriched.proposal.exampleUserOverlay.firstRunDate)} · 원문 사실이 아닌 사용자 선택</p><div class="artifact-grid"><div class="artifact-card"><div class="label">Calendar / ICS</div><h3>${esc(rendered.calendar.title)}</h3><div class="calendar-date">${esc(rendered.calendar.firstOccurrence)}</div><p>${esc(rendered.calendar.repeatLabel)}</p><div class="occurrences">${rendered.calendar.nextOccurrences.map((value) => `<span>${esc(value)}</span>`).join("")}</div><p class="small muted">RRULE:FREQ=WEEKLY;INTERVAL=4</p></div><div class="artifact-card"><div class="label">Checklist</div><h3>청소 3단계</h3><div class="output-lines">${esc(rendered.checklist.text)}</div></div><div class="artifact-card"><div class="label">Memo / Notion copy</div><h3>${esc(rendered.memo.title)}</h3><p>${esc(rendered.memo.text)}</p><p class="small"><a href="${esc(rendered.memo.sourceUrl)}">공식 원문 링크</a></p></div></div>`, `<a href="previews/case-02.html">case-02 전체 원문 근거·v3·v4·ICS 보기</a>`),
  slide(4, "12개 실제 내용 ①", `<h2>기존 추출행과 생성 결과를 <span class="blue">그대로 공개</span></h2><p class="lead">case-01~06. 카드에는 이전 실험이 읽은 SourceRow, v3 Item, v4 생성 여부가 모두 표시됩니다.</p><div class="catalog-grid">${firstSixCards}</div>`, `<a href="flow-content-gallery.html">12개 전체 원문→출력 갤러리 열기</a>`),
  slide(5, "12개 실제 내용 ②", `<h2>생성하지 않은 것도 <span class="blue">빈 결과까지 보여줍니다</span></h2><p class="lead">case-07~12. “재추출”은 숨겨진 Flow가 있다는 뜻이 아니라 현재 publishable Flow가 0개라는 뜻입니다.</p><div class="catalog-grid">${lastSixCards}</div>`, `<a href="flow-content-gallery.html#case-07">case-07부터 상세 보기</a>`),
  slide(6, "왜 0개인가", `<h2>보류 사례는 <span class="blue">무엇을 못 만들었는지</span>로 판단</h2><div class="grid3"><div class="panel weak"><div class="label">case-01 · 건강검진</div><div class="title">${esc(compactItems(case01.v3Extraction.items))}</div><p>원문 행은 있으나 실제 검진일·기간·예약 완료 조건 없음</p><p class="zero">calendar 0 · publishable Item 0</p></div><div class="panel weak"><div class="label">case-05 · K-MOOC</div><div class="title">${esc(compactItems(case05.v3Extraction.items))}</div><p>주차 이름만 있고 강의 셀·퀴즈 값·관리 열 없음</p><p class="zero">sheet row 0 · publishable Item 0</p></div><div class="panel weak"><div class="label">case-06 · 레시피</div><div class="title">${esc(compactItems(case06.v3Extraction.items))}</div><p>정확한 영상 제목·URL·실행 내용 없음</p><p class="zero">resource card 0 · publishable Item 0</p></div></div><div class="truth-banner"><div class="made"><strong>1</strong><span>실제 v4 Flow</span></div><div class="held"><strong>11</strong><span>의도적 미생성</span></div></div>`, `이전 희소 SourceRow를 “원문 전체를 읽은 결과”로 포장하지 않습니다.`),
  slide(7, "라이브 기준선", `<h2>완성 후보는 <span class="blue">라이브 강한 3개와 비교</span></h2><div class="grid3">${strong.map((flow) => `<div class="open good"><h3>${esc(flow.title)}</h3><p><b>${esc(flow.inputRule)}</b></p><p>${esc(flow.resultBundle.join(" + "))}</p><p class="muted">먼저: ${esc(flow.firstAction)}</p><p class="small">${flow.itemCount}개 · ${esc(flow.destinations.join(" / "))}</p></div>`).join("")}</div><div class="rules"><div class="rule"><b>공통 8개 기능</b><span>job · input/choice · result bundle · first action · count/destination · done/decision · source trace · return/export</span></div><div class="rule"><b>목표선</b><span>이사·오픽·신차를 시간, 완료, 결정, 출처 분리의 강한 reference로 사용</span></div></div>`, `2026-07-18 라이브 ${liveBaseline.capturedFrom}에서 7개를 확인.`),
  slide(8, "Flow의 단위", `<h2>최소 단위는 ICS가 아니라 <span class="blue">상태를 가진 Item</span></h2><div class="grid3"><div class="open"><div class="big">01</div><h3>SourceEvidence</h3><p>사실의 최소 단위</p><p class="muted">“극세 필터 4주에 1회”</p></div><div class="open"><div class="big">02</div><h3>Item</h3><p>완료·판단·기록 상태의 최소 단위</p><p class="muted">“청소 방법 하나를 선택했다”</p></div><div class="open"><div class="big">03</div><h3>Projection</h3><p>같은 Item의 목적지별 표현</p><p class="muted">ICS · checklist · sheet · memo</p></div></div><div class="code">SourceEvidence → Item → Step → Flow → FlowMap\n                         ↘ Calendar / Checklist / Todo / Sheet / Memo</div><div class="footnote">현재 repo는 FlowItem + FlowItemDetail이 실제 저장 단위이고, ICS는 scheduled Item export입니다.</div>`),
  slide(9, "v3가 왜 높게 나왔나", `<h2>4.99는 제품 점수가 아니라 <span class="blue">왜곡 방지 점수</span></h2><div class="grid2"><div class="rules"><div class="rule"><b>복사/접미사</b><span>${v3Audit.exactCopyCount}/${v3Audit.itemCount} 정확 복사 · ${v3Audit.suffixCopyCount}/${v3Audit.itemCount} 고정 suffix</span></div><div class="rule"><b>메모/일정</b><span>${v3Audit.memoCount}/${v3Audit.itemCount} memo · ${v3Audit.scheduleEvidenceCount}/${v3Audit.itemCount} schedule</span></div><div class="rule"><b>완료/locator</b><span>${v3Audit.observableCompletionCount}/${v3Audit.itemCount} doneWhen · ${v3Audit.sourceLocatorCount}/${v3Audit.itemCount} URL/tool/place</span></div><div class="rule"><b>내보내기</b><span>${v3Audit.projectionPayloadCount} usable payload</span></div></div><div class="panel weak"><div class="label">실제 판단</div><div class="title">v3 product-ready 0개</div><p>원 URL 전체, 실제 완료조건, 캘린더·시트 payload를 평가하지 않았습니다.</p></div></div>`, `v3는 SourceEvidence 회계와 unsupported claim 차단 레이어로만 유지.`),
  slide(10, "증거 소유권", `<h2>보이는 모든 필드는 <span class="blue">5개 출처 중 하나</span></h2><div class="grid3"><div class="open"><h3>source_fact</h3><p>4주에 1회</p><p>강한 햇빛 건조 주의</p></div><div class="open"><h3>source_transform</h3><p>조건별 방법 그룹화</p><p>4주 interval → RRULE</p></div><div class="open"><h3>execution_scaffold</h3><p>done · hold 상태</p><p>export mapping</p></div><div class="open"><h3>user_choice</h3><p>첫 청소일</p><p>개인 메모</p></div><div class="open"><h3>safety_boundary</h3><p>원문 범위 밖 제외</p><p>공식 확인 경계</p></div><div class="open weak"><h3>공개 불가</h3><p>model_inference</p><p>근거 없는 날짜·단계·효과</p></div></div>`, `“원문보다 낫다”는 사실 추가가 아니라 실행 구조·상태·이식성 추가.`),
  slide(11, "v4 알고리즘", `<h2><span class="blue">충실도 → 실행 충분성 → 가치 상승</span></h2><div class="pipeline"><div class="stage"><strong>1. Snapshot</strong><span>fetch, source, rights/locale/risk</span></div><div class="stage"><strong>2. Evidence</strong><span>행동·조건·시간·완료·URL·주의</span></div><div class="stage"><strong>3. Job/Artifact</strong><span>한 user job, 한 자연 산출물</span></div><div class="stage hold"><strong>4. Sufficiency</strong><span>compile / draft / re-extract / block</span></div><div class="stage"><strong>5. Compile</strong><span>허용된 scaffold만 추가</span></div><div class="stage"><strong>6. Validate</strong><span>copy, doneWhen, trace, loss</span></div><div class="stage"><strong>7. Live gate</strong><span>8기능 + pattern reference</span></div><div class="stage"><strong>8. Blind A/B</strong><span>모델명·버전 숨김</span></div><div class="stage pass"><strong>9. Human</strong><span>approve / save / publish</span></div><div class="stage hold"><strong>10. Measure</strong><span>edit rate, cost, latency</span></div></div><div class="rules"><div class="rule"><b>LLM</b><span>source diagnosis, evidence/job/artifact/copy 제안</span></div><div class="rule"><b>규칙</b><span>날짜·반복 검증, evidence 회계, 완료 기준, projection loss, publish gate</span></div></div>`),
  slide(12, "Artifact별 충분성", `<h2>행 수가 아니라 <span class="blue">산출물에 필요한 근거</span></h2><table class="table"><thead><tr><th>Artifact</th><th>최소 근거</th><th>이번 실패 예</th><th>처리</th></tr></thead><tbody><tr><td>Calendar</td><td>날짜·offset·반복 또는 사용자 anchor</td><td>“정기검사 유효기간” 값 없음</td><td class="status hold">재추출</td></tr><tr><td>Checklist/Todo</td><td>행동 대상 + done/decision</td><td>“예약과 문진표 준비”</td><td class="status hold">재추출</td></tr><tr><td>Sheet</td><td>안정적 행 집합 + 열 구조</td><td>“1주차 강의와 퀴즈” cell 없음</td><td class="status hold">재추출</td></tr><tr><td>Resource/Memo</td><td>실제 URL + 리소스로 할 job</td><td>“Day 1 prompt 열어보기”</td><td class="status hold">source import</td></tr><tr><td>Decision</td><td>판단 기준·선후·보류 중 하나</td><td>“차량 확인 후 구매 판단”</td><td class="status hold">가이드 재추출</td></tr></tbody></table><div class="footnote">단일 Item도 공식 기한/주기, 실제 완료·결정, source trace가 있으면 가능. Item 개수를 채우기 위한 분할은 금지.</div>`),
  slide(13, "공통 데이터 계약", `<h2>도구마다 다른 구조가 아니라 <span class="blue">같은 Item의 projection</span></h2><div class="grid2"><div class="code">{\n  sourceEvidence: [{ id, kind, locator }],\n  item: {\n    title, stateMode, doneWhen,\n    schedule?, record?, decision?,\n    sourceEvidenceRefs, ownership\n  },\n  projections: [\n    { target, payload, lossLedger }\n  ],\n  userOverlay, executionRun\n}</div><div class="rules"><div class="rule"><b>Calendar / ICS</b><span>date, recurrence, timezone, description, stable UID</span></div><div class="rule"><b>Checklist / Todo</b><span>title, doneWhen, due/unscheduled, source link</span></div><div class="rule"><b>Sheet</b><span>stable columns, status, note, next action</span></div><div class="rule"><b>Memo</b><span>context, caution, links, decision history</span></div><div class="rule"><b>공통</b><span>같은 Item ID와 SourceEvidenceRef, 누락은 lossLedger</span></div></div></div>`, `ICS는 저장 최소 단위가 아니라 캘린더 projection입니다.`),
  slide(14, "품질 게이트", `<h2>점수보다 먼저 <span class="blue">hard fail 0</span></h2><div class="grid2"><ul class="checklist"><li>SourceEvidence 회계 100%</li><li>unsupported claim 0</li><li>generic action 0</li><li>observable done/decision/record 100%</li><li>projection payload + loss ledger</li><li>live capability 8/8</li></ul><div class="rules"><div class="rule"><b>Weak</b><span>여권 확인하기</span></div><div class="rule"><b>Need source</b><span>귀국일 이후 만료인지 비교 — 날짜 근거가 있을 때만</span></div><div class="rule"><b>Weak</b><span>Day 1 prompt 열어보기</span></div><div class="rule"><b>Need source</b><span>실제 prompt로 촬영 후 완료 — prompt와 URL이 있을 때만</span></div></div></div><div class="footnote">자동 self-score는 품질 점수가 아닙니다. 절대축과 pairwise는 독립 리뷰에서만 적용합니다.</div>`),
  slide(15, "저가/고가 모델 비교", `<h2>모델 승자는 JSON이 아니라 <span class="blue">accepted Flow당 비용</span></h2><div class="grid3"><div class="open"><h3>Lower-cost proxy</h3><p>전체 선택: 개선안</p><p class="muted">7축 중 6개 개선안 · 입력 없는 v3가 시작 속도 1축 승리</p></div><div class="open"><h3>Higher-capability proxy</h3><p>전체 선택: 개선안</p><p class="muted">7축 모두 개선안</p></div><div class="open good"><h3>Blind result</h3><p class="big">${pairwiseSummary ? `${(pairwiseSummary.candidatePreferenceAmongNonTies * 100).toFixed(1)}%` : "대기"}</p><p class="muted">${pairwiseSummary ? `${pairwiseSummary.candidateWinCount}/${pairwiseSummary.judgmentCount} 가치축 · overall ${pairwiseSummary.candidateOverallChoiceCount}/${pairwiseSummary.reviewerContextCount}` : "독립 결과 미수집"}</p></div></div><div class="rules"><div class="rule"><b>이번에 증명</b><span>한 사례에서 A/B 순서를 뒤집어도 두 reviewer proxy가 개선안을 선택</span></div><div class="rule"><b>아직 미증명</b><span>10 URL extractor 일반화, 실제 token/latency/price, human edit</span></div><div class="rule"><b>비용 공식</b><span>fetch + extract + retry + review + human edit + storage / accepted Flow</span></div></div>`),
  slide(16, "결정과 다음 실행", `<h2>지금 판단할 수 있는 것은 <span class="blue">case-02의 실제 내용</span></h2><div class="grid2"><div class="panel good"><div class="label">이번 산출물</div><div class="title">원문→Flow→실제 출력</div><ul><li>원문 근거 5개와 사용 위치</li><li>stateful Item 3개와 완료 기준</li><li>예시 날짜 기반 calendar/checklist/memo</li><li>12개 기존 출력과 미생성 11개 공개</li></ul></div><div class="panel"><div class="label">다음 검증</div><div class="title">나머지 URL도 같은 형식으로</div><ol><li>실제 URL snapshot 재추출</li><li>원문 근거와 정규화 사실 분리</li><li>compile candidate만 실제 출력 생성</li><li>사람이 Flow 콘텐츠를 직접 승인</li><li>accepted cost와 수정률 비교</li></ol></div></div><div class="rules"><div class="rule"><b>공개 품질</b><span>기존 v3 12건은 No-Go</span></div><div class="rule"><b>현재 후보</b><span>${pairwisePassed ? "pairwise_passed_internal_candidate" : candidateValidation.status}; 아직 public_ready 아님</span></div></div>`, `보고서의 성격을 “기준 설명서”에서 “실제 콘텐츠 판단 보고서”로 수정했습니다.`),
];

const reportHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>FLOW URL-to-Flow Value Uplift v4</title><style>${css}</style></head><body><div class="deck">${slides.join("")}</div><div class="nav"><button type="button" data-dir="-1" aria-label="이전 슬라이드">이전</button><button type="button" class="counter" aria-live="polite">1 / ${slides.length}</button><button type="button" data-dir="1" aria-label="다음 슬라이드">다음</button></div><script>const slides=[...document.querySelectorAll('.slide')];let active=0;const counter=document.querySelector('.counter');const go=(index)=>{active=Math.max(0,Math.min(slides.length-1,index));slides[active].scrollIntoView({behavior:'smooth'});counter.textContent=(active+1)+' / '+slides.length};document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('click',()=>go(active+Number(button.dataset.dir))));addEventListener('keydown',event=>{if(['ArrowDown','ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(active+1)}if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(active-1)}if(event.key==='Home')go(0);if(event.key==='End')go(slides.length-1)});const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){active=slides.indexOf(entry.target);counter.textContent=(active+1)+' / '+slides.length}}),{threshold:.55});slides.forEach(slide=>observer.observe(slide));</script></body></html>`;
await write(path.join(auditDir, "report.html"), reportHtml);

const previewCss = `${css}.preview{max-width:1180px;margin:24px auto;background:#fff;padding:32px;min-height:720px}.preview-head{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding-bottom:18px}.preview-head>div{min-width:0}.preview-head>a{flex:0 0 auto;white-space:nowrap;align-self:flex-start}.preview h1{font-size:34px;margin:0}.preview h2{font-size:25px;margin:0 0 14px}.preview .tag{font-size:12px;font-weight:800;color:var(--blue)}.content-section{padding:26px 0;border-bottom:1px solid var(--line)}.content-section:last-child{border-bottom:0}.preview .cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}.preview .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.preview .meta-grid span{background:var(--soft);padding:8px;font-size:12px}.preview .actual-output{background:#f2fbf5;border:1px solid #acd7b9;padding:18px}.preview .not-generated{background:#fff7f6;border:1px solid #f0b7b0;padding:18px}.preview pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e6eef9;padding:14px;font-size:12px}.gallery{max-width:1240px;margin:0 auto;padding:36px 24px}.gallery-head{background:var(--rail);color:#fff;padding:34px;margin-bottom:22px}.gallery-head h1{font-size:42px;margin:0 0 12px}.gallery-case{background:#fff;padding:28px;margin-bottom:24px;border:1px solid var(--line)}@media(max-width:760px){.preview{margin:0;padding:20px}.preview .cols,.preview .meta-grid{grid-template-columns:1fr}.gallery{padding:0}.gallery-head,.gallery-case{margin:0;padding:20px;border-left:0;border-right:0}.gallery-head h1{font-size:32px}}`;

const renderSourceSection = (entry) => {
  const sourceRows = entry.sourceEvidence.length
    ? entry.sourceEvidence.map((value) => `<li><b>${esc(value.normalizedFact ?? value.text)}</b><br><span class="small muted">위치: ${esc(value.location)}</span></li>`).join("")
    : entry.v3Extraction.sourceRows.map((value) => `<li><b>${esc(value.title)}</b>${value.detail ? `<br><span class="small muted">${esc(value.detail)}</span>` : ""}</li>`).join("");
  const sourceLink = entry.source.url ? `<a href="${esc(entry.source.url)}">원문 열기</a>` : `<span class="zero">원문 URL 없음</span>`;
  const exactQuote = entry.sourceEvidence.find((value) => value.verbatimExcerpt)?.verbatimExcerpt;
  return `<section class="content-section"><h2>① 원문에서 확인된 것</h2><div class="meta-grid"><span>${sourceModeLabel(entry)}</span><span>${esc(entry.source.publisher ?? "기관 미확인")}</span><span>확인일 ${esc(entry.source.checkedAt ?? "미확인")}</span><span>${esc(entry.source.accessStatus)} · ${esc(entry.source.rightsStatus)}</span></div><p>${sourceLink}</p>${exactQuote ? `<div class="footnote">짧은 원문 인용: “${esc(exactQuote)}”</div>` : `<div class="footnote">이번 v4에서 원문 전체를 다시 확인한 사례가 아닙니다. 아래는 이전 실험이 저장한 희소 SourceRow입니다.</div>`}<ul>${sourceRows || "<li>사용 가능한 SourceRow 0개</li>"}</ul><p class="small muted">변환 범위: ${esc(entry.source.coverage?.scope ?? "확인되지 않음")}</p></section>`;
};

const renderV3Section = (entry) => {
  const rows = entry.v3Extraction.sourceRows.map((value) => `<li>${esc(value.title)}${value.detail ? ` — ${esc(value.detail)}` : ""}</li>`).join("");
  const items = entry.v3Extraction.items.map((value) => `<div class="item"><b>${esc(value.title)}</b><span>completionMode: ${esc(value.completionMode)} · memo: ${esc(value.memo ?? "없음")} · 일정 근거: ${esc(value.scheduleEvidence?.sourceText ?? "없음")}</span></div>`).join("");
  return `<section class="content-section"><h2>② v3가 실제로 만든 것</h2><div class="cols"><div class="panel"><div class="label">입력 SourceRow</div><ul>${rows || "<li>0개</li>"}</ul></div><div class="panel weak"><div class="label">생성 결과</div><div class="title">${esc(entry.v3Extraction.primaryArtifact ?? "artifact 없음")}</div>${items || `<p class="zero">Item 0개</p>`}<p class="small muted">불확실성: ${esc(entry.v3Extraction.uncertaintyCodes.join(" · ") || "표시 없음")}</p></div></div></section>`;
};

const renderV4Section = (entry) => {
  if (entry.v4Output.state !== "generated") {
    const counts = entry.v4Output.outputCounts;
    return `<section class="content-section"><h2>③ v4가 사용자에게 보여줄 것</h2><div class="not-generated"><div class="label red">생성 안 함</div><div class="title">Flow 콘텐츠를 생성하지 않았습니다</div><p>calendar ${counts.calendarEvents} · publishable Item ${counts.publishableItems} · checklist ${counts.checklistRows} · memo ${counts.memoArtifacts} · sheet row ${counts.sheetRows}</p><p class="muted">근거가 채워지기 전에는 “확인하기/준비하기” 같은 filler Item을 만들지 않습니다.</p></div></section>`;
  }
  const flow = entry.v4Output.flow;
  const items = entry.v4Output.items.map((value) => `<div class="item"><b>${esc(value.title)}</b><span>완료: ${esc(value.completion.criterion)}</span></div>`).join("");
  const artifacts = entry.v4Output.renderedArtifacts;
  return `<section class="content-section"><h2>③ v4가 사용자에게 보여줄 것</h2><div class="actual-output"><div class="label green">실제 생성</div><div class="title">${esc(flow.title)}</div><p>입력: ${esc(flow.inputRule.label)} ${esc(entry.v4Output.exampleUserOverlay.firstRunDate)} → ${esc(flow.resultBundle.join(" + "))}</p>${items}<div class="artifact-grid"><div class="artifact-card"><h3>Calendar</h3><p><b>${esc(artifacts.calendar.firstOccurrence)}</b>부터 ${esc(artifacts.calendar.repeatLabel)}</p><p>${esc(artifacts.calendar.nextOccurrences.join(" · "))}</p></div><div class="artifact-card"><h3>Checklist</h3><div class="output-lines">${esc(artifacts.checklist.text)}</div></div><div class="artifact-card"><h3>Memo</h3><p>${esc(artifacts.memo.text)}</p></div></div><details><summary>실제 ICS 보기</summary><pre>${esc(artifacts.calendar.ics)}</pre></details></div></section>`;
};

const renderDecisionSection = (entry) => `<section class="content-section"><h2>④ 판정과 다음 추출</h2><div class="cols"><div class="panel ${entry.v4Output.state === "generated" ? "good" : "weak"}"><div class="label">판정</div><div class="title">${entry.v4Output.state === "generated" ? "내부 비교 후보" : entry.decision.disposition === "blocked" ? "생성 차단" : "원문 재추출 필요"}</div><p>${esc(entry.decision.reasonCodes.join(" · ") || "source sufficiency passed")}</p></div><div class="panel"><div class="label">다음에 채울 근거</div><ul>${entry.decision.nextExtractionTargets.map((value) => `<li>${esc(value)}</li>`).join("") || "<li>사람 승인과 추가 URL 일반화 검증</li>"}</ul></div></div></section>`;
const renderCaseContent = (entry) => `${renderSourceSection(entry)}${renderV3Section(entry)}${renderV4Section(entry)}${renderDecisionSection(entry)}`;

const galleryHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>12개 원문→Flow 실제 내용</title><style>${previewCss}</style></head><body><main class="gallery"><header class="gallery-head"><h1>12개 원문→Flow 실제 내용</h1><p>실제 v4 Flow 생성 1개 · 의도적 미생성 11개. 각 사례에서 원문 근거, v3 출력, v4 출력 또는 빈 결과, 다음 추출을 모두 보여줍니다.</p><p><a href="report.html" style="color:#5dd5ee">PPT 보고서로 돌아가기</a></p></header>${extractedContentCases.map((entry) => `<article class="gallery-case" id="${esc(entry.auditCaseId)}"><div class="tag">${esc(entry.auditCaseId)} · ${esc(entry.decision.disposition)}</div><h1>${esc(entry.title)}</h1><p class="muted">${esc(entry.userJob)}</p>${renderCaseContent(entry)}</article>`).join("")}</main></body></html>`;
await write(path.join(auditDir, "flow-content-gallery.html"), galleryHtml);

for (const entry of extractedContentCases) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${esc(entry.title)} · v4 audit</title><style>${previewCss}</style></head><body><main class="preview"><div class="preview-head"><div><div class="tag">${esc(entry.auditCaseId)} · ${esc(entry.decision.disposition)}</div><h1>${esc(entry.title)}</h1><p class="muted">${esc(entry.userJob)}</p></div><a href="../report.html">보고서</a></div>${renderCaseContent(entry)}</main></body></html>`;
  await write(path.join(auditDir, `previews/${entry.auditCaseId}.html`), html);
}

process.stdout.write(`${JSON.stringify({
  report: path.relative(repoRoot, path.join(auditDir, "report.html")).replaceAll("\\", "/"),
  liveBaselineCount: liveBaseline.contentCount,
  v3ProductReadyCount: v3Audit.productReadyCaseCount,
  dispositions: dispositionCounts,
  candidateStatus: pairwisePassed ? "pairwise_passed_internal_candidate" : candidateValidation.status,
  pairwisePackets: 2,
}, null, 2)}\n`);
