import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const report = path.join(root, "docs", "content-audit", "2026-07-22-flow-content-value-qualified-benchmark-v1-ko.html");
const manualReviewPath = path.join(root, "docs", "specs", "2026-07-22-flow-content-value-qualified-benchmark-v1", "manual-render-review-v1.json");
const html = fs.readFileSync(report, "utf8");
const manualReview = JSON.parse(fs.readFileSync(manualReviewPath, "utf8"));
const count = (pattern) => (html.match(pattern) || []).length;
const caseIds = [
  ...Array.from({ length: 12 }, (_, index) => `VQ-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `BQ-${String(index + 1).padStart(2, "0")}`),
];
const checks = {
  minimumSize: Buffer.byteLength(html) > 100_000,
  positiveSlides: count(/data-class="positive"/g) === 12,
  boundarySlides: count(/data-class="boundary"/g) === 6,
  modelRoleCards: count(/class="role-card"/g) === 54,
  firstPageActualExamples: ["생활코딩 WEB1", "리모델링 공정별 하자 점검", "2026년 2학기 국가근로장학금 신청"].every((value) => html.includes(value)),
  requiredFilters: ["verdictFilter", "providerFilter", "artifactFilter", "evidenceFilter", "resultFilter", "agreementFilter", "roleFilter"].every((value) => html.includes(`id="${value}"`)),
  desktopContract: /min-height:900px/.test(html) && /1440px/.test(html),
  mobileContract: /@media\(max-width:700px\)/.test(html) && /min-height:844px/.test(html),
  allCaseIds: caseIds.every((caseId) => html.includes(caseId)),
  expandableFullOutputs: count(/<details/g) >= 30,
  noPlaceholder: !/(TODO|TBD|PLACEHOLDER|>undefined<|>null<)/.test(html),
  userValidationBoundary: html.includes("자동·에이전트 QA는 실제 사용자 검증이 아니다"),
  manualReviewReportMatches: manualReview.report === path.relative(root, report).replaceAll("\\", "/"),
  manualReviewConfirmed: manualReview.reviewMethod === "user_manual_confirmation"
    && manualReview.confirmation === "normal"
    && Object.values(manualReview.confirmedChecks).every(Boolean),
  exactViewportContractKeptSeparate: manualReview.staticViewportContracts.desktop === "1440x900"
    && manualReview.staticViewportContracts.mobile === "390x844"
    && manualReview.staticViewportContracts.verifiedBy === "report_structure_validator"
    && manualReview.automationBoundary.agentMeasuredExactViewportRender === false,
  manualReviewNotProductValidation: /not observed product usability/i.test(manualReview.interpretationBoundary),
};

const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({
  report,
  checks,
  browserRender: {
    status: "user_manual_confirmation_with_static_viewport_contract",
    reviewDate: manualReview.reviewDate,
    agentDomAccess: manualReview.automationBoundary.agentDomOrScreenshotAccess,
    observedProductUserValidation: false,
  },
}, null, 2));
if (failures.length) {
  console.error(`Report validation failed: ${failures.join(", ")}`);
  process.exit(1);
}
