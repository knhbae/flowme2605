import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  lintActionTitle,
  validateSourcePacket,
  validateValueUpliftProposal,
} from "./url-to-flow-value-uplift-v4-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(repoRoot, "docs/specs/2026-07-18-url-to-flow-value-uplift-v4");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-18-url-to-flow-value-uplift-v4");
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const exists = async (file) => Boolean(await fs.stat(file).catch(() => null));

const [report, reassessment, extractedContent, contract, baseline, enriched, packetA, packetB] = await Promise.all([
  readJson(path.join(auditDir, "report-data.json")),
  readJson(path.join(auditDir, "case-reassessment.json")),
  readJson(path.join(auditDir, "extracted-flow-content.json")),
  readJson(path.join(specDir, "value-uplift-contract-v4.json")),
  readJson(path.join(specDir, "live-baseline.json")),
  readJson(path.join(specDir, "enriched-case-02-v4.json")),
  readJson(path.join(auditDir, "review-packets/pair-01-reviewer-a.json")),
  readJson(path.join(auditDir, "review-packets/pair-01-reviewer-b.json")),
]);

assert.equal(baseline.contentCount, 7, "live baseline must contain the seven visible Flow finding maps");
assert.equal(baseline.flows.length, 7);
assert.equal(reassessment.cases.length, 12);
assert.equal(reassessment.cases.filter((entry) => entry.disposition === "compile_candidate").length, 1);
assert.equal(reassessment.cases.filter((entry) => entry.disposition === "reextract_required").length, 9);
assert.equal(reassessment.cases.filter((entry) => entry.disposition === "blocked").length, 2);
assert.equal(reassessment.cases.find((entry) => entry.auditCaseId === "case-05").reasonCodes[0], "table_row_without_payload");
assert.equal(reassessment.cases.find((entry) => entry.auditCaseId === "case-06").reasonCodes[0], "opaque_resource_without_locator");
assert.equal(reassessment.cases.find((entry) => entry.auditCaseId === "case-10").reasonCodes[0], "date_label_without_value_or_user_anchor");
assert.equal(report.v3Audit.caseCount, 10);
assert.equal(report.v3Audit.itemCount, 15);
assert.equal(report.v3Audit.exactCopyCount + report.v3Audit.suffixCopyCount, 15);
assert.equal(report.v3Audit.observableCompletionCount, 0);
assert.equal(report.v3Audit.projectionPayloadCount, 0);
assert.equal(report.v3Audit.productReadyCaseCount, 0);
assert.equal(report.correction.productQualityDecision, "No-Go for v3 public-content quality");
assert.equal(report.reportVersion, "flowme-url-to-flow-value-uplift-v4-report-v2");
assert.equal(report.extractedContent.summary.reviewedCaseCount, 12);
assert.equal(report.extractedContent.summary.currentSourceReextractedCount, 1);
assert.equal(report.extractedContent.summary.actualV4FlowCount, 1);
assert.equal(report.extractedContent.summary.intentionalNoCompileCount, 11);
assert.equal(report.extractedContent.summary.legacySparseFixtureCount, 9);
assert.equal(extractedContent.cases.length, 12);
assert.equal(extractedContent.cases.filter((entry) => entry.v4Output.state === "generated").length, 1);
assert.equal(extractedContent.cases.filter((entry) => entry.v4Output.state === "not_generated").length, 11);
assert.ok(extractedContent.cases.filter((entry) => entry.v4Output.state === "not_generated").every((entry) => entry.v4Output.outputCounts.publishableItems === 0));
const extractedCase02 = extractedContent.cases.find((entry) => entry.auditCaseId === "case-02");
assert.equal(extractedCase02.source.evidenceMode, "current_source_reextracted");
assert.equal(extractedCase02.sourceEvidence.length, 5);
assert.equal(extractedCase02.v4Output.items.length, 3);
assert.equal(extractedCase02.v4Output.renderedArtifacts.calendar.nextOccurrences[0], "2026-08-17");
assert.match(extractedCase02.v4Output.renderedArtifacts.calendar.ics, /RRULE:FREQ=WEEKLY;INTERVAL=4/);
assert.match(extractedCase02.v4Output.renderedArtifacts.checklist.text, /먼지 양에 맞는 청소 방법 선택/);
assert.equal(report.pairwise.status, "passed");
assert.equal(report.pairwise.results.reviewerContextCount, 2);
assert.equal(report.pairwise.results.candidateWinCount, 13);
assert.equal(report.pairwise.results.judgmentCount, 14);
assert.equal(report.pairwise.results.candidateOverallChoiceCount, 2);
assert.equal(report.pairwise.results.unsupportedOrUnsafeFindingCount, 0);
assert.ok(report.pairwise.results.candidatePreferenceAmongNonTies >= 0.7);

const sourceGate = validateSourcePacket(enriched);
assert.equal(sourceGate.passed, true);
const candidate = validateValueUpliftProposal(enriched, contract, baseline);
assert.equal(candidate.passed, true);
assert.equal(candidate.status, "ready_for_pairwise_review");
assert.equal(candidate.metrics.sourceEvidenceAccountingRate, 1);
assert.equal(candidate.metrics.unsupportedClaimCount, 0);
assert.equal(candidate.metrics.genericActionRate, 0);
assert.equal(candidate.metrics.observableCompletionRate, 1);
assert.equal(candidate.metrics.liveBaselineCapabilityRate, 1);
assert.equal(candidate.scoreState, "withheld_until_independent_pairwise_review");

assert.equal(packetA.optionA.title, packetB.optionB.title, "review packets must reverse A/B order");
assert.equal(packetA.optionB.title, packetB.optionA.title, "review packets must reverse A/B order");
assert.equal(packetA.questions.length, 7);
assert.deepEqual(packetA.prohibitedContext, packetB.prohibitedContext);

assert.equal(lintActionTitle("여권 확인하기").passed, false);
assert.equal(lintActionTitle("Day 1 prompt 열어보기").passed, false);
assert.equal(lintActionTitle("먼지 양에 맞는 청소 방법 선택").passed, true);

const missingCompletion = structuredClone(enriched);
delete missingCompletion.proposal.items[0].completion;
assert.equal(validateValueUpliftProposal(missingCompletion, contract, baseline).passed, false);

const unsupported = structuredClone(enriched);
unsupported.proposal.unsupportedClaims.push("근거 없는 효과");
assert.equal(validateValueUpliftProposal(unsupported, contract, baseline).passed, false);

const invalidRef = structuredClone(enriched);
invalidRef.proposal.items[0].sourceEvidenceRefs = ["ev-does-not-exist"];
assert.equal(validateValueUpliftProposal(invalidRef, contract, baseline).passed, false);

const incompleteSource = structuredClone(enriched);
incompleteSource.coverage.status = "unknown";
assert.equal(validateSourcePacket(incompleteSource).passed, false);

const reportHtml = await fs.readFile(path.join(auditDir, "report.html"), "utf8");
assert.match(reportHtml, /원문에서 실제로 만든 Flow는/);
assert.match(reportHtml, /의도적으로 생성 안 함/);
assert.match(reportHtml, /예시 날짜를 넣으면 사용자는/);
assert.match(reportHtml, /극세 필터 4주 청소 루틴/);
assert.match(reportHtml, /pairwise_passed_internal_candidate/);
assert.match(reportHtml, /92\.9%/);
assert.equal((reportHtml.match(/class="slide"/g) ?? []).length, 16);

const galleryHtml = await fs.readFile(path.join(auditDir, "flow-content-gallery.html"), "utf8");
assert.match(galleryHtml, /실제 v4 Flow 생성 1개 · 의도적 미생성 11개/);
assert.equal((galleryHtml.match(/class="gallery-case"/g) ?? []).length, 12);
assert.match(galleryHtml, /Flow 콘텐츠를 생성하지 않았습니다/);
assert.match(galleryHtml, /실제 ICS 보기/);

for (const entry of reassessment.cases) {
  const previewPath = path.join(auditDir, `previews/${entry.auditCaseId}.html`);
  assert.equal(await exists(previewPath), true);
  const previewHtml = await fs.readFile(previewPath, "utf8");
  assert.match(previewHtml, /① 원문에서 확인된 것/);
  assert.match(previewHtml, /② v3가 실제로 만든 것/);
  assert.match(previewHtml, /③ v4가 사용자에게 보여줄 것/);
  assert.match(previewHtml, /④ 판정과 다음 추출/);
}

process.stdout.write(`${JSON.stringify({
  passed: true,
  liveBaselineCount: baseline.contentCount,
  reassessedCaseCount: reassessment.cases.length,
  v3ProductReadyCount: report.v3Audit.productReadyCaseCount,
  candidateStatus: candidate.status,
  pairwiseStatus: report.pairwise.status,
  pairwiseCandidateWins: `${report.pairwise.results.candidateWinCount}/${report.pairwise.results.judgmentCount}`,
  selfTests: 4,
  reportSlideCount: 16,
  extractedV4FlowCount: report.extractedContent.summary.actualV4FlowCount,
  intentionalNoCompileCount: report.extractedContent.summary.intentionalNoCompileCount,
}, null, 2)}\n`);
