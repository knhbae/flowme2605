import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(
  DIR,
  "../../content-audit/2026-07-29-flow-content-ui-full-corpus-validation-review-v1-ko.html",
);
const GALLERY = "./2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html";

const view = JSON.parse(
  fs.readFileSync(path.join(DIR, "content-ui-view-model-v1.json"), "utf8"),
);
const coverage = JSON.parse(
  fs.readFileSync(path.join(DIR, "corpus-coverage-matrix-v1.json"), "utf8"),
);
const inventory = JSON.parse(
  fs.readFileSync(path.join(DIR, "corpus-inventory-v1.json"), "utf8"),
);
const newSourceVerification = JSON.parse(
  fs.readFileSync(path.join(DIR, "new-source-verification-v1.json"), "utf8"),
);
const projectionResults = JSON.parse(
  fs.readFileSync(path.join(DIR, "projection-ui-results-v1.json"), "utf8"),
);
const pacingResults = JSON.parse(
  fs.readFileSync(path.join(DIR, "schedule-playground-results-v1.json"), "utf8"),
);
const eventResults = JSON.parse(
  fs.readFileSync(path.join(DIR, "event-ui-results-v1.json"), "utf8"),
);
const comparison = JSON.parse(
  fs.readFileSync(path.join(DIR, "independent-ui-review-v1.json"), "utf8"),
);
const decisions = JSON.parse(
  fs.readFileSync(path.join(DIR, "planning-decision-handoff-v1.json"), "utf8"),
);
const gaps = JSON.parse(
  fs.readFileSync(path.join(DIR, "content-and-logic-gap-register-v1.json"), "utf8"),
);
const semanticManual = JSON.parse(
  fs.readFileSync(
    path.join(DIR, "semantic-provenance-manual-adjudication-v1.json"),
    "utf8",
  ),
);
const validation = JSON.parse(
  fs.readFileSync(path.join(DIR, "validation-results-v1.json"), "utf8"),
);
const browserQaPath = path.join(DIR, "browser-qa-v1.json");
const browserQa = fs.existsSync(browserQaPath)
  ? JSON.parse(fs.readFileSync(browserQaPath, "utf8"))
  : null;
const galleryPath = path.resolve(
  DIR,
  "../../content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html",
);
const finalGalleryHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(galleryPath))
  .digest("hex");
const reviewedGalleryHashes = [
  ...new Set(
    comparison.runLineage
      .map((run) =>
        run.inputFingerprints?.find(
          (fingerprint) => fingerprint.role === "gallery_html",
        )?.sha256,
      )
      .filter(Boolean)
      .map((value) => String(value).replace(/^sha256:/, "")),
  ),
];
if (reviewedGalleryHashes.length !== 1) {
  throw new Error(
    `Independent review Gallery fingerprints do not reconcile: ${reviewedGalleryHashes.join(", ")}`,
  );
}
const reviewedGalleryHash = reviewedGalleryHashes[0] ?? "UNKNOWN";
const galleryReviewSurfaceChanged =
  reviewedGalleryHash !== "UNKNOWN" && reviewedGalleryHash !== finalGalleryHash;

const LIFE = {
  family_parenting: "가족·육아",
  health_fitness: "건강·운동",
  hobby_pet: "취미·반려",
  home_living: "집·생활",
  meals_grocery: "식사·장보기",
  money_admin_purchase: "돈·행정·구매",
  study_reading: "학습·독서",
  travel_outings: "여행·외출",
  work_career: "일·커리어",
};
const LABEL = {
  calendar: "Calendar",
  checklist: "Checklist",
  todo: "Todo",
  sheet: "Sheet",
  memo: "Memo",
};
const EXECUTION = {
  compare_decide: "비교·결정",
  date_preparation: "날짜 준비",
  ordered_procedure: "순서형 절차",
  phase_lifecycle: "단계·상태",
  progress_tracking: "진도 추적",
  repeating_routine: "반복 루틴",
  resource_queue: "자료 queue",
};
const TEMPORAL = {
  anchor_offset: "기준일 역산",
  application_window: "신청 기간",
  availability_window: "이용 기간",
  due_deadline: "마감",
  fixed_occurrence: "고정 일정",
  manually_selected_date: "사용자 선택일",
  no_schedule: "일정 없음",
  source_duration: "원문 기간",
  user_pacing_assignment: "개인 pacing",
};
const REPRESENTATIVE_IDS = [
  "canonical:base-moving-d30",
  "canonical:base-opentutorials-web1-progress",
  "canonical:base-baby-food-174",
  "canonical:base-opic-plan",
  "canonical:base-new-car-comparison",
  "canonical:base-allblanc-7day-abs",
  "canonical:base-wtable-summer-banchan-five",
  "canonical:base-andstudio-job-prep-videos",
  "canonical:oq-oq-c02-kmooc-full",
  "canonical:oq-oq-c03-librivox",
  "canonical:oq-oq-c04-passport",
  "canonical:oq-oq-c05-washer",
  "canonical:oq-oq-b01-heat",
  "canonical:value-vq-03",
  "canonical:value-vq-11",
  "canonical:live-c01",
  "new:new-a02-seoul-museum-group",
  "new:new-a03-kakaopay-jeonse",
  "new:new-b03-fridge-week",
  "new:new-c01-programmers-kit",
  "new:new-c08-todoist-podcast",
  "events:event-kr-multi-show-choir",
  "events:event-kr-qnet-exam-lifecycle",
  "events:event-pattern-nps-rescheduled",
];

const newNormalIdSet = new Set(
  newSourceVerification.records
    .filter((record) =>
      ["product_candidate", "structure_probe"].includes(record.corpusTier),
    )
    .map((record) => `new:${record.researchId}`),
);
const newlyAddedDistinctNormal = view.contents.filter(
  (content) =>
    ["product_candidate", "structure_probe"].includes(content.corpusTier) &&
    newNormalIdSet.has(content.contentId),
).length;
const reverifiedNormalVariantsMerged =
  newSourceVerification.counts.normal - newlyAddedDistinctNormal;
const existingNormal = view.counts.normal - newlyAddedDistinctNormal;
const undatedContentCount = coverage.temporalIntent.no_schedule ?? 0;
const validationUserState =
  validation.claimBoundary?.userReviewStatus ??
  (validation.claimBoundary?.observedUserValidation ===
  "NOT_REVIEWED_BY_USER"
    ? "NOT_REVIEWED_BY_USER"
    : null);
const validationObservedUserState =
  validation.claimBoundary?.observedUserValidation ===
  "NOT_REVIEWED_BY_USER"
    ? "NOT_RUN"
    : validation.claimBoundary?.observedUserValidation;
const reviewBoundary = {
  browserQa:
    browserQa?.summary?.status ??
    validation.claimBoundary?.browserQa ??
    "PENDING",
  userReview: validationUserState ?? "NOT_REVIEWED_BY_USER",
  observedUserValidation: validationObservedUserState ?? "NOT_RUN",
  externalCalendar:
    validation.claimBoundary?.externalCalendarVtodoRoundTrip ?? "NOT_RUN",
};
const browserQaDescription =
  reviewBoundary.browserQa === "PASS"
    ? "동결된 최종 Gallery에서 1440×900·768×1024·390×844 상호작용과 console·overflow·asset 검사를 기록했습니다."
    : "1440×900·768×1024·390×844 상호작용과 console·overflow·asset 검사는 최종 pass 전입니다.";
const semanticMismatchByIndex = new Map(
  semanticManual.mismatches.map((mismatch) => [
    mismatch.queueIndex,
    mismatch,
  ]),
);
const semanticNeedsModify = semanticManual.adjudications
  .filter((adjudication) => adjudication.verdict === "needs_modify")
  .map((adjudication) => {
    const [contentId, itemId, field] = adjudication.uniqueKey.split("|");
    return {
      ...adjudication,
      contentId,
      itemId,
      field,
      mismatch: semanticMismatchByIndex.get(adjudication.queueIndex),
    };
  });
const semanticNeedsByContent = Object.groupBy(
  semanticNeedsModify,
  (record) => record.contentId,
);
const semanticReasonCounts = Object.fromEntries(
  Object.entries(
    Object.groupBy(semanticNeedsModify, (record) => record.reasonCode),
  ).map(([reasonCode, records]) => [reasonCode, records.length]),
);
const semanticZeroInvention =
  semanticManual.combinedClaimBoundary.zeroInventionClaim;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function galleryLink(contentId, mode = "") {
  const suffix = mode ? `/projection/${mode}` : "";
  return `${GALLERY}#content/${encodeURIComponent(contentId)}${suffix}`;
}

function canonicalRows(content) {
  return content.canonical?.sourceRows ?? [];
}

function canonicalItems(content) {
  return content.canonical?.items ?? [];
}

function traceRows(content) {
  const rows = canonicalRows(content).slice(0, 3);
  if (rows.length) {
    return rows.map(
      (row) =>
        `<li><span>${esc(row.sourceRowId)}</span><strong>${esc(
          row.title ?? row.label ?? row.text,
        )}</strong><small>${esc(
          row.detail ?? row.description ?? row.value ?? "",
        )}</small></li>`,
    );
  }
  return ["<li><strong>SourceRow 없음</strong><small>Historical 또는 boundary 상태</small></li>"];
}

function traceItems(content) {
  const items = canonicalItems(content).slice(0, 3);
  if (items.length) {
    return items.map(
      (item) =>
        `<li><span>${esc(item.itemId)}</span><strong>${esc(item.title)}</strong><small>${
          item.schedule ? esc(item.schedule.mode ?? item.schedule.type) : "날짜 없음"
        } · 근거 ${esc(
          (item.sourceTrace ?? []).flatMap((trace) => trace.sourceRowIds ?? []).length ||
            item.sourceRowIds?.length ||
            item.sourceRefIds?.length ||
            0,
        )}행</small></li>`,
    );
  }
  const event = content.eventSource?.occurrences?.[0];
  if (event) {
    return [
      `<li><span>${esc(event.occurrenceId)}</span><strong>Occurrence를 먼저 보존</strong><small>${esc(
        event.start ?? event.startDate ?? "미확정",
      )} · 사용자 의도 뒤 Item 활성화</small></li>`,
    ];
  }
  return ["<li><strong>Item 없음</strong><small>구조 확인 전 또는 멈춤 상태</small></li>"];
}

function formatProjection(content) {
  const cell = content.projectionCells.find(
    (entry) => entry.projection === content.primaryProjection,
  );
  if (!cell) return "<p>projection 결과 없음</p>";
  return `<div class="projection-result">
    <div><b>${esc(LABEL[cell.projection])}</b><small>${esc(
      cell.recommendation,
    )}</small></div>
    <div><b>${esc(cell.counts.destinationRecordCount)}</b><small>destination record</small></div>
    <div><b>${esc(cell.availability)}</b><small>생성 가능</small></div>
    <div><b>${esc(cell.fidelity)}</b><small>정보 보존</small></div>
  </div>
  <p class="loss">${esc(
    cell.lossManifest.map((loss) => loss.reason).join(" ") ||
      "명시된 property-level 손실 없음",
  )}</p>`;
}

function reviewFor(contentId) {
  return comparison.comparisons.find((record) => record.contentId === contentId);
}

function caseSection(content, index) {
  const review = reviewFor(content.contentId);
  const semanticNeeds = semanticNeedsByContent[content.contentId] ?? [];
  const sourceRowCount = canonicalRows(content).length;
  const itemCount = canonicalItems(content).length;
  return `<article class="case" id="case-${index + 1}">
    <header class="case-title">
      <div>
        <span class="case-no">${String(index + 1).padStart(2, "0")}</span>
        <span class="chip">${esc(LIFE[content.taxonomy.primaryLifeArea])}</span>
        <span class="chip">${esc(content.taxonomy.sourceShape)}</span>
      </div>
      <h2>${esc(content.title)}</h2>
      <p>${esc(content.userJob)}</p>
      <a class="open" href="${galleryLink(content.contentId)}">전체 Item을 Gallery에서 열기 →</a>
    </header>
    <div class="trace">
      <section class="trace-block source">
        <div class="trace-label">1 · 원문 → SourceRow</div>
        <h3>${esc(content.source.provider)}</h3>
        <p>${sourceRowCount} SourceRow · ${esc(content.source.sourceFormat)} · ${esc(
          content.source.accessStatus,
        )}</p>
        <ol>${traceRows(content).join("")}</ol>
      </section>
      <div class="arrow">→</div>
      <section class="trace-block canonical">
        <div class="trace-label">2 · canonical Item</div>
        <h3>${itemCount} Item · ${esc(content.canonical?.steps?.length ?? 0)} Step</h3>
        <p>${esc(content.taxonomy.primaryExecutionPattern)} · ${esc(
          content.taxonomy.temporalIntent,
        )}</p>
        <ol>${traceItems(content).join("")}</ol>
      </section>
      <div class="arrow">→</div>
      <section class="trace-block output">
        <div class="trace-label">3 · 기본 projection</div>
        ${formatProjection(content)}
        <a href="${galleryLink(content.contentId, content.primaryProjection)}">실제 ${esc(
          LABEL[content.primaryProjection],
        )} 결과 보기 →</a>
      </section>
    </div>
    <div class="judgment">
      <div><span>Reviewer A</span><strong>${esc(review?.reviewerA.contentValue)}</strong><small>${esc(
        review?.reviewerA.itemGranularity,
      )} · ${esc(review?.reviewerA.uiUnderstandability)}</small></div>
      <div><span>Reviewer B</span><strong>${esc(review?.reviewerB.contentValue)}</strong><small>${esc(
        review?.reviewerB.itemGranularity,
      )} · ${esc(review?.reviewerB.uiUnderstandability)}</small></div>
      <div class="synthesis"><span>내부 종합</span><strong>${esc(
        review?.synthesizedInternalVerdict,
      )}</strong><small>${
        review?.disagreeingAxes.length
          ? `불일치: ${esc(review.disagreeingAxes.join(", "))}`
          : "6축 일치"
      }</small></div>
      <div><span>사용자 검토</span><strong>NOT REVIEWED</strong><small>Gallery에서 직접 판단 필요</small></div>
    </div>
    ${
      semanticNeeds.length
        ? `<div class="status-note"><strong>수동 SourceRow 대조: ${semanticNeeds.length}개 필드 Modify</strong><br>${semanticNeeds
            .map(
              (record) =>
                `<code>${esc(record.itemId)}|${esc(record.field)}</code> · ${esc(record.reasonCode)} · ${esc(record.mismatch?.issue ?? "")}`,
            )
            .join("<br>")}</div>`
        : ""
    }
  </article>`;
}

const contentsById = new Map(view.contents.map((content) => [content.contentId, content]));
const semanticReasonRows = Object.entries(semanticReasonCounts)
  .sort((left, right) => right[1] - left[1])
  .map(
    ([reasonCode, count]) =>
      `<li><span><code>${esc(reasonCode)}</code></span><strong>${count}</strong></li>`,
  )
  .join("");
const semanticModifyCards = Object.entries(semanticNeedsByContent)
  .sort((left, right) => right[1].length - left[1].length)
  .map(([contentId, records]) => {
    const content = contentsById.get(contentId);
    return `<article class="gap-card">
      <span>${records.length}개 필드 · 수동 판정</span>
      <h3>${esc(content?.title ?? contentId)}</h3>
      <small>${esc(contentId)}</small>
      <p>${records
        .map(
          (record) =>
            `<code>${esc(record.itemId)}|${esc(record.field)}</code> · ${esc(record.reasonCode)}<br>${esc(record.mismatch?.issue ?? "")}`,
        )
        .join("<br><br>")}</p>
      <a class="open" href="${galleryLink(contentId)}">Gallery에서 콘텐츠 열기 →</a>
    </article>`;
  })
  .join("");
const representatives = REPRESENTATIVE_IDS.map((id) => contentsById.get(id)).filter(Boolean);
if (representatives.length < 24) {
  throw new Error(`Representative content count ${representatives.length} < 24`);
}

const heroIds = [
  "canonical:base-opentutorials-web1-progress",
  "canonical:base-moving-d30",
  "new:new-a03-kakaopay-jeonse",
];
const heroCards = heroIds
  .map((id) => contentsById.get(id))
  .map(
    (content) => `<a class="hero-card" href="${galleryLink(content.contentId)}">
      <span>${esc(LIFE[content.taxonomy.primaryLifeArea])} · ${esc(
        LABEL[content.primaryProjection],
      )}</span>
      <strong>${esc(content.title)}</strong>
      <p>${esc(content.userJob)}</p>
      <small>${canonicalRows(content).length} SourceRow → ${
        canonicalItems(content).length
      } Item</small>
    </a>`,
  )
  .join("");

const lifeRows = Object.entries(coverage.lifeArea)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([key, count]) => `<div class="bar-row"><span>${esc(LIFE[key])}</span><div><i style="width:${
      (count / Math.max(...Object.values(coverage.lifeArea))) * 100
    }%"></i></div><strong>${count}</strong></div>`,
  )
  .join("");

function compactCoverageRows(values, labels = {}) {
  return Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([key, count]) =>
        `<li><span>${esc(labels[key] ?? key)}</span><strong>${count}</strong></li>`,
    )
    .join("");
}

const executionRows = compactCoverageRows(
  coverage.executionPattern,
  EXECUTION,
);
const temporalRows = compactCoverageRows(coverage.temporalIntent, TEMPORAL);
const projectionRows = compactCoverageRows(
  coverage.primaryProjection,
  LABEL,
);

const gapCards = gaps.gaps
  .map(
    (gap) => `<article class="gap-card">
      <span>${esc(gap.gapId)} · ${esc(gap.severity)}</span>
      <h3>${esc(gap.title)}</h3>
      <strong>${gap.repeatedProblemCount}개 콘텐츠</strong>
      <p>${esc(gap.proposedRule)}</p>
      <small>${esc(gap.contentIds.slice(0, 5).join(" · "))}</small>
    </article>`,
  )
  .join("");

const decisionCards = decisions.decisions
  .map(
    (decision) => `<article class="decision">
      <span>${esc(decision.decisionId)}</span>
      <h3>${esc(decision.question)}</h3>
      <div><b>추천</b><p>${esc(decision.recommendation)}</p></div>
      <div><b>대안</b><p>${esc(decision.alternative)}</p></div>
      <small>${decision.repeatedProblemCount}회 반복 · ${esc(
        decision.status ?? "DRAFT_PENDING_USER_REVIEW",
      )}</small>
    </article>`,
  )
  .join("");

const m = comparison.metrics;
const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FlowMe Full-Corpus Validation Review v1</title>
  <style>
    :root{--bg:#f7f7f4;--paper:#fff;--ink:#171713;--muted:#66665e;--line:#deded7;--blue:#3157f3;--blueSoft:#eef2ff;--purple:#7555d9;--purpleSoft:#f2edff;--green:#16795a;--greenSoft:#e9f7f1;--yellow:#9c6500;--yellowSoft:#fff7db;--red:#b33434;--redSoft:#fff0ed}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR",Arial,sans-serif;line-height:1.6}a{color:inherit}.top{position:sticky;top:0;z-index:10;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:rgba(255,255,255,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.brand{font-weight:900;font-size:20px}.brand i{font-style:normal;color:var(--blue)}.top nav{display:flex;gap:10px}.top a,.open{display:inline-flex;text-decoration:none;border:1px solid var(--line);padding:9px 14px;border-radius:10px;font-weight:750;background:#fff}.top a.primary,.open{background:var(--blue);border-color:var(--blue);color:#fff}.hero{min-height:calc(100vh - 64px);display:flex;flex-direction:column;justify-content:center;max-width:1240px;margin:auto;padding:64px 32px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-weight:850;font-size:12px;color:var(--blue)}h1{font-size:clamp(38px,5vw,72px);line-height:1.08;letter-spacing:-.05em;margin:16px 0 20px;max-width:1000px}.hero>p{font-size:20px;color:var(--muted);max-width:850px}.claim{display:inline-block;background:var(--yellowSoft);color:var(--yellow);border:1px solid #ecd894;border-radius:999px;padding:8px 14px;font-weight:800;margin-top:18px}.hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:38px}.hero-card{min-height:240px;text-decoration:none;background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:26px;display:flex;flex-direction:column;box-shadow:0 14px 35px rgba(35,35,25,.05);transition:.2s}.hero-card:hover{transform:translateY(-3px);border-color:#aab7ff}.hero-card span,.hero-card small{font-size:12px;color:var(--blue);font-weight:800}.hero-card strong{font-size:24px;line-height:1.25;margin-top:22px}.hero-card p{color:var(--muted);flex:1}.section{min-height:calc(100vh - 64px);max-width:1240px;margin:auto;padding:86px 32px;display:flex;flex-direction:column;justify-content:center}.section h2{font-size:clamp(32px,4vw,54px);line-height:1.15;letter-spacing:-.04em;margin:12px 0 18px}.section-lead{font-size:19px;color:var(--muted);max-width:800px}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-top:40px}.metric{background:var(--paper);border:1px solid var(--line);padding:22px;border-radius:18px}.metric b{display:block;font-size:32px;line-height:1.1}.metric span{font-size:12px;color:var(--muted)}.pipeline{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:42px;align-items:center}.node{min-height:126px;border-radius:18px;padding:18px;background:var(--paper);border:1px solid var(--line)}.node b{display:block}.node small{color:var(--muted)}.node.source{border-top:5px solid var(--purple)}.node.canonical{border-top:5px solid var(--blue)}.node.overlay{border-top:5px solid #d29a16}.node.output{border-top:5px solid var(--green)}.pipe-arrow{text-align:center;font-size:24px;color:#999}.two{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:36px}.bars,.review-metrics{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:28px}.bar-row{display:grid;grid-template-columns:150px 1fr 36px;gap:12px;align-items:center;margin:13px 0}.bar-row div{height:9px;background:#ecece6;border-radius:9px;overflow:hidden}.bar-row i{display:block;height:100%;background:var(--blue)}.review-metrics dl{display:grid;grid-template-columns:1fr auto;gap:14px;margin:0}.review-metrics dt{color:var(--muted)}.review-metrics dd{margin:0;font-weight:850}.warning{background:var(--yellowSoft);border:1px solid #ead385;border-radius:18px;padding:20px;margin-top:24px}.case{min-height:calc(100vh - 64px);max-width:1320px;margin:auto;padding:76px 32px;display:flex;flex-direction:column;justify-content:center;border-top:1px solid var(--line)}.case-title{max-width:920px}.case-no{font-size:13px;font-weight:900;color:var(--blue);margin-right:10px}.chip{display:inline-block;padding:5px 10px;border-radius:999px;background:var(--blueSoft);color:var(--blue);font-size:11px;font-weight:800;margin-right:5px}.case h2{font-size:clamp(32px,4vw,54px);line-height:1.12;letter-spacing:-.04em;margin:14px 0}.case-title>p{font-size:18px;color:var(--muted)}.trace{display:grid;grid-template-columns:1fr 36px 1fr 36px 1fr;align-items:stretch;gap:12px;margin-top:36px}.trace-block{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:24px;min-width:0}.trace-block.source{border-top:5px solid var(--purple)}.trace-block.canonical{border-top:5px solid var(--blue)}.trace-block.output{border-top:5px solid var(--green)}.trace-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900}.trace-block.source .trace-label{color:var(--purple)}.trace-block.canonical .trace-label{color:var(--blue)}.trace-block.output .trace-label{color:var(--green)}.trace-block h3{margin:10px 0 0}.trace-block>p{color:var(--muted);font-size:13px}.trace-block ol{list-style:none;margin:20px 0 0;padding:0}.trace-block li{padding:13px 0;border-top:1px solid var(--line)}.trace-block li span{display:block;color:var(--muted);font:10px ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trace-block li strong{display:block;font-size:14px}.trace-block li small{display:block;color:var(--muted)}.arrow{display:flex;align-items:center;justify-content:center;color:#aaa;font-size:24px}.projection-result{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.projection-result div{background:var(--greenSoft);border-radius:12px;padding:12px}.projection-result b,.projection-result small{display:block}.projection-result small{font-size:10px;color:var(--muted)}.loss{min-height:58px}.trace-block.output a{color:var(--green);font-weight:800}.judgment{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.judgment>div{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:15px}.judgment span,.judgment strong,.judgment small{display:block}.judgment span{font-size:10px;text-transform:uppercase;color:var(--muted);font-weight:800}.judgment strong{font-size:18px}.judgment small{color:var(--muted)}.judgment .synthesis{background:var(--blueSoft);border-color:#cbd4ff}.gap-grid,.decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:34px}.gap-card,.decision{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:26px}.gap-card>span,.decision>span{font-size:11px;font-weight:850;color:var(--blue)}.gap-card strong{display:block;font-size:26px}.gap-card small{color:var(--muted)}.decision div{display:grid;grid-template-columns:54px 1fr;gap:10px}.decision div p{margin:0 0 14px}.decision small{color:var(--red);font-weight:800}.status{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:34px}.status>div{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:26px}.status b{display:block;font-size:28px}.foot{padding:64px 32px;text-align:center;background:#191a1e;color:#fff}.foot h2{font-size:36px}.foot a{display:inline-flex;padding:14px 18px;border-radius:12px;background:#fff;color:#111;text-decoration:none;font-weight:850}
    .provenance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:32px}.provenance article,.coverage-card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:22px}.provenance b{display:block;font-size:34px;line-height:1.1}.provenance span,.provenance small{display:block;color:var(--muted)}.coverage-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:26px}.coverage-card h3{margin:0 0 14px}.coverage-card ul{list-style:none;margin:0;padding:0}.coverage-card li{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-top:1px solid var(--line)}.coverage-card li span{color:var(--muted)}.coverage-card li strong{font-variant-numeric:tabular-nums}.status-note{background:var(--yellowSoft);border:1px solid #ead385;border-radius:16px;padding:16px 18px;margin-top:20px}
    main,.hero,.section,.case,.trace-block,.projection-result>div,.gap-card,.decision,.status,.status>div{min-width:0;max-width:100%}.decision div{grid-template-columns:54px minmax(0,1fr)}.projection-result{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.claim,.decision,.projection-result b,.projection-result small,.status b,.status p,.status span{overflow-wrap:anywhere;word-break:break-word}
    @media(max-width:900px){.top{padding:0 16px}.top nav a:not(.primary){display:none}.hero,.section,.case{padding:54px 18px;min-height:auto;width:100%}.hero-grid,.two,.metrics,.gap-grid,.decision-grid,.status,.coverage-grid,.provenance{grid-template-columns:minmax(0,1fr)}.hero-card{min-height:190px}.pipeline{grid-template-columns:minmax(0,1fr)}.pipe-arrow{transform:rotate(90deg)}.trace{grid-template-columns:minmax(0,1fr)}.arrow{transform:rotate(90deg);height:30px}.judgment{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.metrics{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.bar-row{grid-template-columns:100px minmax(0,1fr) 30px}.case{padding-top:72px}.case h2{font-size:34px}.projection-result{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
    @media(max-width:440px){.judgment,.projection-result{grid-template-columns:minmax(0,1fr)}.metric b{font-size:24px}.top{height:58px}.top .brand{font-size:18px;line-height:1.15}.top a.primary{padding:7px 9px;max-width:110px;text-align:center;line-height:1.15}.hero{padding-top:40px}h1{font-size:40px}}
  </style>
</head>
<body>
  <header class="top">
    <div class="brand">FLOW<i>Me</i> · Full-Corpus Review</div>
    <nav>
      <a href="#results">핵심 결과</a>
      <a href="#semantic">원문 의미 판정</a>
      <a href="#cases">${representatives.length}개 사례</a>
      <a class="primary" href="${GALLERY}">전체 Gallery 열기</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <div class="eyebrow">Flow Content UI Full-Corpus Validation & Planning Handoff Lab v1</div>
      <h1>아키텍처는 설명이 아니라<br>${view.counts.normal}개 source-backed 콘텐츠 화면으로 판단합니다.</h1>
      <p>기존·계승 ${existingNormal}개와 이번에 직접 원문을 확인해 별도 user job으로 추가한 ${newlyAddedDistinctNormal}개를 같은 canonical 구조에 넣었습니다. 신규 원문 중 정상 자격은 ${newSourceVerification.counts.normal}개였고, ${reverifiedNormalVariantsMerged}개는 기존 user job 재확인으로 병합했습니다. ${view.counts.item}개 Item과 Calendar·Checklist·Todo·Sheet·Memo 결과를 전체 Gallery에서 빠짐없이 열 수 있습니다.</p>
      <span class="claim">브라우저 QA: ${reviewBoundary.browserQa} · 사용자 검토: ${reviewBoundary.userReview} · observed-user validation: ${reviewBoundary.observedUserValidation} · 외부 Calendar/VTODO 왕복: ${reviewBoundary.externalCalendar}</span>
      <div class="hero-grid">${heroCards}</div>
    </section>

    <section class="section" id="results">
      <div class="eyebrow">Measured corpus</div>
      <h2>${view.counts.normal}개 정상·구조 콘텐츠, ${view.counts.item} Item, ${view.counts.projectionCell} projection 조합</h2>
      <p class="section-lead">Boundary ${view.counts.boundary}개와 Historical ${view.counts.historical}개는 별도입니다. 숫자를 채우는 데 사용하지 않았고, 모든 수치는 machine-readable corpus에서 읽었습니다.</p>
      <div class="metrics">
        <div class="metric"><b>${view.counts.normal}</b><span>서로 다른 user job</span></div>
        <div class="metric"><b>${view.counts.productCandidate}</b><span>Product candidate</span></div>
        <div class="metric"><b>${view.counts.structureProbe}</b><span>Structure probe</span></div>
        <div class="metric"><b>${view.counts.item}</b><span>canonical Item</span></div>
        <div class="metric"><b>${view.counts.sourceRow}</b><span>SourceRow</span></div>
        <div class="metric"><b>${view.counts.projectionCell}</b><span>5-format cells</span></div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">Corpus lineage</div>
      <h2>기존 corpus를 보존하고, 실제 신규 원문을 따로 추적했습니다.</h2>
      <p class="section-lead">Gallery 수와 정상 corpus 수를 섞지 않습니다. 신규 검토 URL 중 정상으로 포함되지 않은 결과도 boundary·historical 상태로 남습니다.</p>
      <div class="provenance">
        <article><b>${existingNormal}</b><span>기존·계승 정상 콘텐츠</span><small>기존 canonical·projection·qualified 연구 및 재확인 병합</small></article>
        <article><b>${newSourceVerification.counts.reviewedUrls}</b><span>신규 실제 URL 직접 확인</span><small>검색 제목만이 아니라 원문 구조 확인</small></article>
        <article><b>${newlyAddedDistinctNormal}</b><span>신규 distinct 정상 추가</span><small>정상 자격 ${newSourceVerification.counts.normal} 중 ${reverifiedNormalVariantsMerged}개는 기존 user job에 병합</small></article>
        <article><b>${inventory.counts.raw}</b><span>inventory 원시 기록</span><small>${inventory.counts.sourceBackedRaw} source-backed raw → ${view.counts.gallery} Gallery</small></article>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">Canonical grammar</div>
      <h2>ICS를 원본으로 삼지 않아도 되는 이유</h2>
      <p class="section-lead">날짜 없는 ${undatedContentCount}개 콘텐츠와 event-native 원문을 함께 다루려면 실행 상태와 원문 사실, 개인 일정을 분리해야 합니다.</p>
      <div class="pipeline">
        <div class="node source"><b>SourceRow</b><small>원문 행·회차·조건</small></div><div class="pipe-arrow">→</div>
        <div class="node canonical"><b>Item</b><small>독립 완료·결정·기록</small></div><div class="pipe-arrow">→</div>
        <div class="node canonical"><b>Step · Flow</b><small>세션·사용자 job</small></div><div class="pipe-arrow">→</div>
        <div class="node overlay"><b>UserFlowCopy</b><small>개인 입력·pacing</small></div>
      </div>
      <div class="pipeline">
        <div class="node source"><b>Series · Edition</b><small>원문 행사 정체성</small></div><div class="pipe-arrow">→</div>
        <div class="node source"><b>Occurrence</b><small>회차·창·마일스톤</small></div><div class="pipe-arrow">→</div>
        <div class="node canonical"><b>선택 후 Item</b><small>저장·예약·참석</small></div><div class="pipe-arrow">→</div>
        <div class="node output"><b>Projection</b><small>Calendar·Todo·Sheet…</small></div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">Coverage and disagreement</div>
      <h2>구조 포괄성은 넓어졌지만, 기획 판단은 아직 끝나지 않았습니다.</h2>
      <div class="two">
        <div class="bars"><h3>lifeArea coverage</h3>${lifeRows}</div>
        <div class="review-metrics">
          <h3>독립 내부 검토 일치율</h3>
          <dl>
            <dt>Item granularity verdict</dt><dd>${Math.round(m.axisAgreement.itemGranularity.rate * 100)}%</dd>
            <dt>Primary 적합성 verdict</dt><dd>${Math.round(m.axisAgreement.primaryProjection.rate * 100)}%</dd>
            <dt>Primary 실제 선택</dt><dd>${Math.round((m.selectionAgreement?.primaryProjection?.rate ?? 0) * 100)}%</dd>
            <dt>Checklist / Todo verdict</dt><dd>${Math.round(m.axisAgreement.checklistTodoDecision.rate * 100)}%</dd>
            <dt>Checklist / Todo 실제 선택</dt><dd>${Math.round((m.selectionAgreement?.checklistTodo?.rate ?? 0) * 100)}%</dd>
            <dt>Schedule suitability</dt><dd>${Math.round(m.axisAgreement.scheduleSuitability.rate * 100)}%</dd>
            <dt>Content value</dt><dd>${Math.round(m.axisAgreement.contentValue.rate * 100)}%</dd>
            <dt>UI understandability</dt><dd>${Math.round(m.axisAgreement.uiUnderstandability.rate * 100)}%</dd>
            <dt>6축 verdict + 2개 선택 exact</dt><dd>${m.exactAgreement}/${m.content}</dd>
          </dl>
          <div class="warning">두 내부 agent가 동결된 corpus와 review surface를 독립 판독했습니다. 6축 적합성 verdict와 실제 Primary·Checklist/Todo 선택까지 모두 같은 콘텐츠는 ${m.exactAgreement}개입니다. 이는 규칙 불일치 탐지용 내부 증거이며, 관찰 사용자 행동이나 기본값 승인이 아닙니다.</div>
          <div class="status-note">A2/B2가 본 review surface Gallery SHA는 <code>${reviewedGalleryHash.slice(0, 12)}…</code>입니다. 현재 Gallery SHA는 <code>${finalGalleryHash.slice(0, 12)}…</code>${galleryReviewSurfaceChanged ? "이며, 합성된 내부 판정 표시를 넣은 뒤 생성된 post-synthesis surface입니다. view model과 projection 입력은 그대로지만 최종 렌더링 자체는 독립 검토 대상과 byte-identical하지 않으므로 최종 browser QA에서 별도로 확인합니다." : "로 독립 검토 surface와 동일합니다."}</div>
        </div>
      </div>
      <div class="coverage-grid">
        <article class="coverage-card"><h3>실행 패턴</h3><ul>${executionRows}</ul></article>
        <article class="coverage-card"><h3>일정 의미</h3><ul>${temporalRows}</ul></article>
        <article class="coverage-card"><h3>기본 projection</h3><ul>${projectionRows}</ul></article>
      </div>
      <div class="status-note">전체 ${projectionResults.counts.cells}칸 중 실제 생성 ${projectionResults.counts.generated}, 사용자 overlay 뒤 preview ${projectionResults.counts.previewRequiresOverlay}, 금지·비추천 ${projectionResults.counts.prohibited}입니다. pacing ${pacingResults.counts.content}개와 event ${eventResults.counts.content}개는 별도 상호작용 계약으로 확인합니다.</div>
    </section>

    <section class="section" id="semantic">
      <div class="eyebrow">Manual semantic provenance adjudication</div>
      <h2>141개 의미 판정 중 17개 필드는 실제 수정이 필요합니다.</h2>
      <p class="section-lead">26개 콘텐츠의 trace-only queue를 동결 SourceRow와 수동 대조했습니다. 124개는 의미 보존 범위였지만, 11개 콘텐츠의 17개 제목·detail은 중요한 행을 숨기거나 원문에 없는 행동·시점·projection 결론을 섞었습니다.</p>
      <div class="metrics">
        <div class="metric"><b>${semanticManual.summary.traceOnlyVerdictCounts.verified_equivalent}</b><span>verified equivalent</span></div>
        <div class="metric"><b>${semanticManual.summary.traceOnlyVerdictCounts.bounded_normalization}</b><span>bounded normalization</span></div>
        <div class="metric"><b>${semanticManual.summary.traceOnlyVerdictCounts.needs_modify}</b><span>needs modify</span></div>
        <div class="metric"><b>${semanticManual.summary.traceOnlyVerdictCounts.unknown}</b><span>unknown</span></div>
        <div class="metric"><b>${semanticManual.summary.ownerOrProvenanceGapCounts.completion}</b><span>completion provenance gap</span></div>
        <div class="metric"><b>${semanticManual.summary.ownerOrProvenanceGapCounts.schedule}</b><span>schedule provenance gap</span></div>
      </div>
      <div class="two">
        <article class="coverage-card"><h3>반복된 수정 유형</h3><ul>${semanticReasonRows}</ul></article>
        <article class="coverage-card"><h3>판정 경계</h3><ul>
          <li><span>141개 queue 수동 판정</span><strong>COMPLETE</strong></li>
          <li><span>수동 validator</span><strong>${semanticManual.selfValidation.passed}/${semanticManual.selfValidation.total} ${esc(semanticManual.selfValidation.status)}</strong></li>
          <li><span>전체 corpus 발명 0</span><strong>${esc(semanticZeroInvention)}</strong></li>
          <li><span>사용자 검증</span><strong>NOT_RUN</strong></li>
        </ul></article>
      </div>
      <div class="warning">이 결과는 141개 trace-only queue를 닫았다는 뜻입니다. 전체 4,465개 감사 필드에서 원문에 없는 행동·날짜·반복·완료 기준이 0임을 증명하지 않습니다. completion 412개와 schedule 124개의 owner·derivation 공백도 해소되지 않았습니다.</div>
      <div class="gap-grid">${semanticModifyCards}</div>
    </section>

    <div id="cases"></div>
    ${representatives.map(caseSection).join("\n")}

    <section class="section">
      <div class="eyebrow">Repeated gaps</div>
      <h2>현재 snapshot에서 반복된 ${gaps.gaps.length}개 공통 문제</h2>
      <p class="section-lead">좋지 않은 결과도 숨기지 않았습니다. 아래 count와 콘텐츠 ID는 machine corpus와 내부 검토에서 자동 집계했으며, 실제 사용자 문제로 확정한 값은 아닙니다.</p>
      <div class="gap-grid">${gapCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">Planning handoff</div>
      <h2>기획에서 검토할 ${decisions.decisions.length}개 기본값</h2>
      <p class="section-lead">추천안은 마련했지만 현재 상태는 모두 DRAFT_PENDING_USER_REVIEW입니다.</p>
      <div class="decision-grid">${decisionCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">QA boundary</div>
      <h2>자동 검증과 실제 사용자 검토를 분리했습니다.</h2>
      <div class="status">
        <div><span>Machine validator</span><b>${validation.summary.passed}/${validation.summary.checks} ${esc(validation.summary.status)}</b><p>corpus·projection·provenance·pacing·event·review-state 계약</p></div>
        <div><span>Final browser QA</span><b>${reviewBoundary.browserQa}</b><p>${browserQaDescription}</p></div>
        <div><span>User review</span><b>${reviewBoundary.userReview}</b><p>Gallery의 검토 패널에서 사용자가 직접 남긴 결과만 사용자 검토입니다. observed-user validation은 ${reviewBoundary.observedUserValidation}입니다.</p></div>
        <div><span>External Calendar/VTODO round-trip</span><b>${reviewBoundary.externalCalendar}</b><p>Google·Outlook·Apple Calendar 계정 왕복 호환성을 검증했다고 주장하지 않습니다.</p></div>
        <div><span>Production impact</span><b>NONE</b><p>app runtime·DB·crawler·production API·production UI를 변경하지 않았습니다.</p></div>
      </div>
    </section>
  </main>
  <footer class="foot">
    <h2>이제 숫자가 아니라 실제 콘텐츠를 검토할 차례입니다.</h2>
    <p>전체 ${view.counts.gallery}개 화면, ${view.counts.normal}개 정상·구조 콘텐츠, ${view.counts.item}개 Item과 ${view.counts.projectionCell}개 projection 조합을 확인할 수 있습니다.</p>
    <a href="${GALLERY}">Full-Corpus Gallery 열기 →</a>
  </footer>
</body>
</html>`;

const normalizedHtml = html.replace(/[ \t]+$/gm, "");
fs.writeFileSync(OUT, normalizedHtml, "utf8");
console.log(
  JSON.stringify(
    {
      output: path.relative(path.resolve(DIR, "../../.."), OUT).replaceAll("\\", "/"),
      bytes: Buffer.byteLength(normalizedHtml),
      representativeContents: representatives.length,
      planningDecisions: decisions.decisions.length,
      manualSemanticAdjudication: {
        reviewed: semanticManual.scope.traceOnlyQueueReviewed,
        needsModify:
          semanticManual.summary.traceOnlyVerdictCounts.needs_modify,
        needsModifyContents: Object.keys(semanticNeedsByContent).length,
        zeroInventionClaim: semanticZeroInvention,
      },
    },
    null,
    2,
  ),
);
