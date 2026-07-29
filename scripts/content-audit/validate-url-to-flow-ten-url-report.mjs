import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark");
const report = await fs.readFile(path.join(auditDir, "report.html"), "utf8");
const gallery = await fs.readFile(path.join(auditDir, "case-gallery.html"), "utf8");
const selected = JSON.parse(await fs.readFile(path.join(auditDir, "selected-flows.json"), "utf8"));
const summary = JSON.parse(await fs.readFile(path.join(auditDir, "benchmark-summary.json"), "utf8"));
const selectedValidation = JSON.parse(await fs.readFile(path.join(auditDir, "selected-validation.json"), "utf8"));

const checks = [];
const check = (name, passed, actual = null) => checks.push({ name, passed: Boolean(passed), actual });
const reportSlideCount = (report.match(/<section\b[^>]*class="[^"]*\bslide\b[^"]*"/g) ?? []).length;
const galleryCaseIds = [...new Set([...gallery.matchAll(/id="(case-\d{2})"/g)].map((match) => match[1]))];
const firstSlide = report.slice(report.indexOf('id="slide-1"'), report.indexOf('id="slide-2"'));

check("report_has_15_slides", reportSlideCount === 15, reportSlideCount);
check("gallery_has_10_cases", galleryCaseIds.length === 10, galleryCaseIds);
check("selected_has_10_cases", selected.cases.length === 10, selected.cases.length);
check("selected_validation_passed", selectedValidation.passed && selectedValidation.passedCaseCount === 10, selectedValidation);
check("utf8_has_no_replacement_character", !report.includes("�") && !gallery.includes("�"));
check("report_starts_with_actual_flow", firstSlide.includes("극세 필터") && firstSlide.includes("4주 청소 루틴") && firstSlide.includes("case-02"));
check("report_has_exact_evidence", report.includes("극세 필터의 청소 주기는 4주에 1회입니다."));
check("report_has_actual_artifacts", ["4주마다", "먼지 양에 맞는 청소 방법 선택", "강한 햇빛"].every((text) => report.includes(text)));
check("report_has_zero_output_case", report.includes("case-06") && report.includes("재추출"));
check("report_has_raw_gate_conflict", report.includes("7/10") && report.includes("3/10") && report.includes("13"));
check("report_has_decisions", report.includes("CONDITIONAL GO") && report.includes("HOLD") && report.includes("NO-GO"));
check("report_has_nonclaims", report.includes("사람의 편집") && report.includes("실제 API 가격"));
check("gallery_has_source_and_donewhen", gallery.includes("SourceEvidence") && gallery.includes("doneWhen"));
check("summary_decision_consistent", summary.backendDecision.minimumInternalAdapter === "conditional_go" && summary.backendDecision.productionUrlAiBackend === "hold" && summary.backendDecision.automaticPublication === "no_go", summary.backendDecision);

const failed = checks.filter((entry) => !entry.passed);
process.stdout.write(`${JSON.stringify({ passed: failed.length === 0, checks, failedCount: failed.length }, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
