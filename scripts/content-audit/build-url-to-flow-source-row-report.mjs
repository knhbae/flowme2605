import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(
  repoRoot,
  "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const legacySpecDir = path.join(
  repoRoot,
  "docs/specs/2026-07-14-url-to-flow-prompt-lab",
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function maybeJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function proposalsForRound(round) {
  const directory = path.join(auditDir, `runs/${round}`);
  const result = new Map();
  for (const name of await readdir(directory)) {
    if (!name.startsWith("batch-") || !name.endsWith(".json")) continue;
    const run = await readJson(path.join(directory, name));
    for (const output of run.outputs ?? []) result.set(output.caseId, output.proposal);
  }
  return result;
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const artifactLabel = {
  calendar: "캘린더",
  checklist: "체크리스트",
  todo: "할 일",
  sheet: "시트",
  memo: "메모",
  hybrid: "복합",
};

function pct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function proposalSummary(proposal) {
  return {
    state: proposal.status.generationState,
    outcome: proposal.status.outcome,
    errorCode: proposal.status.errorCode,
    disposition: proposal.reviewHints.recommendedDisposition,
    sourceShape: proposal.sourceAssessment.sourceShape,
    userNeed: proposal.conversionDecision?.userNeed ?? null,
    lifeArea: proposal.conversionDecision?.lifeArea ?? null,
    planningPattern: proposal.conversionDecision?.planningPattern ?? null,
    artifact: proposal.conversionDecision?.primaryArtifact ?? null,
    proposalTitle: proposal.proposal.proposalTitle,
    items: proposal.proposal.items.map((item) => ({
      proposalId: item.proposalId,
      title: item.title,
      intent: item.intent,
      sourceRowIds: item.sourceRowIds,
      doneWhen: item.completion.doneWhen,
      completionMode: item.completion.mode,
      memoCandidate: item.memoCandidate,
      scheduleText: item.scheduleCandidate?.sourceText ?? null,
    })),
    omittedRows: proposal.proposal.omittedRows,
    projections: proposal.projectionPlan,
    uncertainties: proposal.reviewHints.uncertainties,
  };
}

function renderPreview({ caseEntry, legacyCase, proposal }) {
  const conversion = proposal.conversionDecision;
  const source = legacyCase.source.primary;
  const items = proposal.proposal.items
    .map(
      (item, index) => `
        <li class="flow-item">
          <span class="check" aria-hidden="true"></span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.completion.doneWhen)}</p>
            ${item.scheduleCandidate ? `<small>일정 근거: ${escapeHtml(item.scheduleCandidate.sourceText)}</small>` : ""}
            ${item.memoCandidate ? `<small>메모: ${escapeHtml(item.memoCandidate)}</small>` : ""}
          </div>
        </li>`,
    )
    .join("");
  const projections = proposal.projectionPlan
    .filter((entry) => entry.applicability === "applicable")
    .map((entry) => `<span class="chip">${escapeHtml(artifactLabel[entry.target] ?? entry.target)}</span>`)
    .join("");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(proposal.proposal.proposalTitle ?? caseEntry.caseId)} · FLOW preview</title>
  <style>
    :root{color-scheme:light;--ink:#172033;--muted:#697386;--line:#dfe5ee;--paper:#fff;--bg:#f4f7fb;--brand:#2659d9;--warn:#a85b00}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;line-height:1.55}
    main{width:min(720px,calc(100% - 28px));margin:32px auto}.notice{border:1px solid #f2d099;background:#fff8e8;color:#6d4300;padding:12px 16px;border-radius:14px;font-size:.9rem}
    article{margin-top:14px;background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:clamp(20px,5vw,40px);box-shadow:0 18px 45px rgba(25,40,75,.08)}
    .eyebrow{color:var(--brand);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}h1{font-size:clamp(1.7rem,6vw,2.6rem);line-height:1.15;margin:.5rem 0 1rem}
    .need{font-size:1.05rem;color:#354158}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.chip{background:#edf3ff;color:#2049ad;border-radius:999px;padding:7px 11px;font-size:.85rem;font-weight:700}
    h2{font-size:1rem;margin:28px 0 10px}.flow-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}.flow-item{display:flex;gap:12px;border:1px solid var(--line);border-radius:16px;padding:14px}.check{width:22px;height:22px;border:2px solid #9aa7bb;border-radius:7px;flex:none;margin-top:2px}.flow-item p{margin:4px 0;color:var(--muted)}small{display:block;color:#526079;margin-top:4px}
    .source{margin-top:28px;padding-top:18px;border-top:1px solid var(--line);font-size:.9rem;color:var(--muted)}a{color:var(--brand);overflow-wrap:anywhere}.empty{color:var(--muted)}
  </style>
</head>
<body>
  <main>
    <div class="notice">Prompt Lab 검토용 초안입니다. 저장·발행·외부 도구 쓰기는 수행되지 않았습니다.</div>
    <article>
      <div class="eyebrow">FLOW preview · ${escapeHtml(caseEntry.caseId)}</div>
      <h1>${escapeHtml(proposal.proposal.proposalTitle ?? "제안 없음")}</h1>
      <p class="need">${escapeHtml(conversion?.userNeed ?? proposal.proposal.incompleteReason ?? "변환 제안이 없습니다.")}</p>
      <div class="chips"><span class="chip">${escapeHtml(artifactLabel[conversion?.primaryArtifact] ?? "검토 필요")}</span>${projections}</div>
      <h2>실행 항목</h2>
      ${items ? `<ol class="flow-list">${items}</ol>` : `<p class="empty">생성된 실행 항목이 없습니다.</p>`}
      <div class="source">원문: <a href="${escapeHtml(source.originalUrl ?? "#")}">${escapeHtml(source.title ?? "출처")}</a></div>
    </article>
  </main>
</body>
</html>`;
}

function exampleCard(caseData, label) {
  const rows = caseData.sourceRows
    .map((row) => `<li><code>${escapeHtml(row.rowType)}</code> ${escapeHtml(row.title)}</li>`)
    .join("");
  const items = caseData.round2.items
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.doneWhen)}</span></li>`)
    .join("");
  return `<div class="example-card">
    <div><span class="mini-label">SourceRows</span><ul>${rows}</ul></div>
    <div class="arrow" aria-hidden="true">→</div>
    <div><span class="mini-label">${escapeHtml(label)}</span><ul>${items || "<li>제안 없음</li>"}</ul></div>
  </div>`;
}

export async function buildSourceRowReport() {
  const caseDocument = await readJson(path.join(specDir, "cases-v1.json"));
  const legacyCases = (await readJson(path.join(legacySpecDir, "cases-v1.json"))).cases;
  const legacyById = new Map(legacyCases.map((entry) => [entry.caseId, entry]));
  const round1Validation = await readJson(path.join(auditDir, "runs/round-1/validation.json"));
  const round2Validation = await readJson(path.join(auditDir, "runs/round-2/validation.json"));
  const round3Validation = await readJson(path.join(auditDir, "runs/round-3/validation.json"));
  const round2Review = await readJson(path.join(auditDir, "reviews/round-2/validation.json"));
  const round3Review = await maybeJson(path.join(auditDir, "reviews/round-3/validation.json"));
  const leakage = await readJson(path.join(auditDir, "leakage-report.json"));
  const schemaProfile = await readJson(path.join(specDir, "schema-profile-v1.json"));
  const bareEquivalence = await readJson(path.join(auditDir, "bare/equivalence.json"));
  const stability = await readJson(path.join(auditDir, "runs/round-3/stability.json"));
  const round2Proposals = await proposalsForRound("round-2");
  const round3Proposals = await proposalsForRound("round-3");
  const review2ById = new Map(round2Review.cases.map((entry) => [entry.caseId, entry]));
  const valid2ById = new Map(
    round2Validation.documents.flatMap((document) => document.results).map((entry) => [entry.caseId, entry]),
  );
  const valid3ById = new Map(
    round3Validation.documents.flatMap((document) => document.results).map((entry) => [entry.caseId, entry]),
  );
  const stabilityById = new Map(stability.cases.map((entry) => [entry.caseId, entry]));
  const generatorCaseIds = caseDocument.cases
    .filter((entry) => entry.generatorInput !== null)
    .map((entry) => entry.generatorInput.caseId);
  const generatorCaseIdsOpaque = generatorCaseIds.every((caseId) => !/^case-\d{2}$/.test(caseId));
  const round1BatchSizes = round1Validation.documents.map((document) => document.results.length);
  const protocolChecks = {
    generatorCaseIdsOpaque,
    round1ThreeFourCaseBatches: JSON.stringify(round1BatchSizes) === JSON.stringify([4, 4, 4]),
    round3Prerequisite: round2Review.passed === true,
    round3InputBindingProven:
      stability.runInputBindingProven === true && stability.freshContextProven === true,
  };
  const protocolConformancePassed = Object.values(protocolChecks).every(Boolean);

  const cases = caseDocument.cases.map((caseEntry) => {
    const legacy = legacyById.get(caseEntry.caseId);
    const round2 = round2Proposals.get(caseEntry.caseId);
    const round3 = round3Proposals.get(caseEntry.caseId);
    const review = review2ById.get(caseEntry.caseId);
    return {
      caseId: caseEntry.caseId,
      positiveCase: Boolean(caseEntry.generatorInput),
      modelInvoked: caseEntry.preflightResult.modelInvoked,
      source: {
        title: legacy.source.primary.title,
        url: legacy.source.primary.originalUrl,
      },
      sourceRows: caseEntry.generatorInput?.sourceRows.map((row) => ({
        rowType: row.rowType,
        title: row.title,
        detail: row.detail,
        order: row.order,
      })) ?? [],
      round2: proposalSummary(round2),
      round2Valid: valid2ById.get(caseEntry.caseId)?.passed ?? false,
      round2Review: review
        ? {
            verdict: review.verdict,
            itemDecisions: review.itemReviews.map((entry) => entry.decision),
            unsupportedSignals: review.unsupportedSignals,
            scores: review.scores,
            topFix: review.topFix,
          }
        : null,
      round3: proposalSummary(round3),
      round3Valid: valid3ById.get(caseEntry.caseId)?.passed ?? false,
      stability: {
        exact: stabilityById.get(caseEntry.caseId)?.exactSignatureMatch ?? false,
        mismatchPaths:
          stabilityById.get(caseEntry.caseId)?.mismatchDetails.map((entry) => entry.path) ?? [],
      },
    };
  });

  const completionChecks = {
    sourceRowOnlyInput: leakage.passed && generatorCaseIdsOpaque,
    protocolConformance: protocolConformancePassed,
    compactSchema: schemaProfile.passed,
    bareValidator: bareEquivalence.equivalent && bareEquivalence.barePassed,
    round2Schema: round2Validation.passed,
    round2SourceRowAccounting: round2Validation.summary.sourceRowAccountingRate === 1,
    round2NegativeDisposition: round2Review.metrics.negativeExact === 2,
    round2ItemKeepRate: round2Review.metrics.itemKeepRate >= 0.8,
    round2UnsupportedZero: round2Review.metrics.unsupportedSignalCount === 0,
    round2SevenAxis: round2Review.metrics.sevenAxisAverage >= 3.5,
    round2Execution: round2Review.metrics.axisAverages.executionClarity >= 4,
    round2Fidelity: round2Review.metrics.axisAverages.contentFidelityCoverage >= 4,
    round2Safety: round2Review.metrics.axisAverages.sourceSafetySeparation >= 4,
    round3Schema: round3Validation.passed,
    round3SourceRowAccounting: round3Validation.summary.sourceRowAccountingRate === 1,
    round3Review: round3Review?.passed ?? false,
  };
  const completionPassed = Object.values(completionChecks).every(Boolean);
  const failedChecks = Object.entries(completionChecks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const reportData = {
    reportVersion: "flowme-source-row-prompt-lab-report-v1",
    laneId: "url-to-flow-source-row-v1",
    period: "2026-07-15–2026-07-18",
    authority: "corrected_experimental_evidence",
    legacyPreflight: {
      acceptedForCompletion: false,
      reasons: [
        "10/10 positive packets included canonical userJob",
        "full source metadata and semantic IDs were model-visible",
      ],
    },
    evidenceBoundary: {
      currentSession: "in_session_unselected_model_proxy",
      provider: null,
      model: null,
      lowCostModelComparison: null,
      premiumModelComparison: null,
      tokens: null,
      cost: null,
      latency: null,
      humanReview: false,
    },
    rounds: {
      round1: round1Validation.summary,
      round2: {
        deterministic: round2Validation.summary,
        blindReview: round2Review.metrics,
      },
      round3: {
        deterministic: round3Validation.summary,
        blindReview: round3Review?.metrics ?? null,
        stability: stability.metrics,
        completionAuthority: false,
      },
    },
    evidence: {
      leakage,
      schemaProfile,
      bareEquivalence,
      completionVerificationPath: "completion-verification.json",
      protocolAudit: {
        passed: protocolConformancePassed,
        checks: protocolChecks,
        round1BatchSizes,
        generatorCaseIds,
        limitations: [
          "Round 3 was run after Round 2 failed, contrary to the preregistered prerequisite.",
          "Run logs do not bind each output to a packet hash or prove a fresh generation context.",
          "Round 2 resource-row review decisions are policy-sensitive and were not adjudicated.",
        ],
      },
    },
    completion: {
      passed: completionPassed,
      failedChecks,
      checks: completionChecks,
      promptLabDecision: completionPassed ? "v1_complete" : "v1_incomplete",
      productionBackendDecision: "no_go",
    },
    cases,
  };
  await writeFile(path.join(auditDir, "report-data.json"), `${JSON.stringify(reportData, null, 2)}\n`, "utf8");

  const previewDir = path.join(auditDir, "previews");
  await mkdir(previewDir, { recursive: true });
  const previewLinks = [];
  for (const caseEntry of caseDocument.cases.filter((entry) => entry.generatorInput)) {
    const legacy = legacyById.get(caseEntry.caseId);
    const proposal = round2Proposals.get(caseEntry.caseId);
    const html = renderPreview({ caseEntry, legacyCase: legacy, proposal });
    const fileName = `${caseEntry.caseId}.html`;
    await writeFile(path.join(previewDir, fileName), html, "utf8");
    previewLinks.push({ caseId: caseEntry.caseId, file: `previews/${fileName}` });
  }
  const previewIndexCards = previewLinks
    .map(
      (entry) => `<a href="${path.basename(entry.file)}"><strong>${entry.caseId}</strong><span>FLOW 초안 열기</span></a>`,
    )
    .join("");
  await writeFile(
    path.join(previewDir, "index.html"),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FLOW previews</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif}main{width:min(980px,calc(100% - 28px));margin:40px auto}h1{font-size:clamp(2rem,7vw,4rem);margin:0 0 10px}p{color:#667085}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:28px}a{display:flex;justify-content:space-between;align-items:center;gap:12px;background:white;border:1px solid #dfe5ee;border-radius:18px;padding:20px;text-decoration:none;color:#172033}a span{color:#2659d9;font-size:.9rem}</style></head><body><main><h1>FLOW 초안 10건</h1><p>SourceRow-only Prompt Lab의 Round 2 결과를 사용자 화면처럼 확인합니다. 저장·발행 결과가 아닙니다.</p><div class="grid">${previewIndexCards}</div></main></body></html>`,
    "utf8",
  );

  const tableRows = cases
    .map(
      (entry) => `| ${entry.caseId} | ${entry.sourceRows.map((row) => row.title).join(" / ") || "preflight negative"} | ${entry.round2.artifact ?? "-"} | ${entry.round2Valid ? "PASS" : "FAIL"} | ${entry.round2Review?.verdict ?? "-"} | ${entry.stability.exact ? "same" : "changed"} |`,
    )
    .join("\n");
  const comparison = `# URL-to-FLOW Prompt Lab v1 — SourceRow-only corrected result

**기간:** 2026-07-15–2026-07-18  
**결론:** Prompt Lab v1 **미완료**, production backend **No-Go**

## 30초 예시

- 성공 예시: \`극세 필터 4주에 한 번 청소 / 먼지 제거, 물세척, 그늘 건조\` 한 행은 한 실행 Item과 literal \`4주에 한 번\` schedule 후보로 안정적으로 옮길 수 있었다.
- 실패 예시: \`여권 / 데이터 유심\` 두 명사형 check 행을 모델이 \`여행 준비\`로 넓혔다. 실용적으로는 그럴듯하지만 SourceRow-only 근거 계약에서는 준비 행동과 날짜 준비 패턴이 추가된 것이다.
- 구조 결론: negative preflight는 2/2였지만 sparse SourceRow의 의미 분류·Item wording이 흔들렸고, generator에는 canonical case ID도 남아 입력 계약을 완전히 지키지 못했다.

## 오염된 preflight와 교정 lane

2026-07-14 rich-packet 결과는 positive 10/10에서 \`userJob\`이 hidden canonical user need와 같았고 full source metadata/semantic ID도 보였다. 따라서 schema·validator 사전실험으로만 보존하며 corrected completion 계산에서 제외한다.

교정 lane은 deterministic preflight 뒤 positive 10건에 SourceRow \`rowType/title/detail/order\`와 opaque provenance ID를 전달했다. 다만 generator-visible \`caseId\`는 canonical \`case-01...10\`으로 남았고, case-11/12만 모델을 호출하지 않았다.

## 라운드 결과

| Round | Schema | SourceRow | Negative | Item keep | Unsupported | 7축 평균 | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 · v1.0 | ${round1Validation.summary.passedOutputCount}/12 | ${round1Validation.summary.exactlyOnceSourceRows}/${round1Validation.summary.receivedSourceRows} | 2/2 | 미측정 | 미측정 | 미측정 | required output contract 결함 |
| 2 · v1.1 | ${round2Validation.summary.passedOutputCount}/12 | ${round2Validation.summary.exactlyOnceSourceRows}/${round2Validation.summary.receivedSourceRows} | 2/2 | ${pct(round2Review.metrics.itemKeepRate)} | ${round2Review.metrics.unsupportedSignalCount} | ${round2Review.metrics.sevenAxisAverage.toFixed(2)} | keep/unsupported gate 실패 |
| 3 · v1.1 | ${round3Validation.summary.passedOutputCount}/12 | ${round3Validation.summary.exactlyOnceSourceRows}/${round3Validation.summary.receivedSourceRows} | 2/2 | ${round3Review ? pct(round3Review.metrics.itemKeepRate) : "pending"} | ${round3Review?.metrics.unsupportedSignalCount ?? "pending"} | ${round3Review?.metrics.sevenAxisAverage?.toFixed(2) ?? "pending"} | protocol-deviating output comparison |

Round 2↔3 기록 출력의 core signature exact match는 전체 ${stability.metrics.exactMatches}/${stability.metrics.comparedCases} (${pct(stability.metrics.exactMatchRate)}), model-generated positive ${stability.metrics.positiveExactMatches}/${stability.metrics.positiveComparedCases} (${pct(stability.metrics.positiveExactMatchRate)}), deterministic negative ${stability.metrics.negativesExact}/${stability.metrics.negativeCount}다. 실행 로그에 packet hash와 fresh-context 증거가 없어 “같은 입력의 모델 안정성”으로 해석할 수 없다.

## 케이스별 요약

| Case | SourceRows | Round 2 artifact | Validator | Blind verdict | R2↔R3 |
| --- | --- | --- | --- | --- | --- |
${tableRows}

## 완료 gate

통과: SourceRow semantic-field 경계, compact schema, bare validator equivalence, Round 2 schema/accounting/negative, 7축 평균과 Execution/Fidelity/Safety.  
실패: ${failedChecks.join(", ")}.

## 실험 프로토콜 한계

- Round 1은 preregistered 4+4+4가 아니라 4+4+2+2 envelope로 저장됐다.
- Round 2가 모든 gate를 통과한 뒤에만 Round 3를 실행한다는 선행조건을 어겼다. protocol note가 이를 공개하지만 편차를 없애지는 않는다.
- generator-visible case ID가 opaque remap이 아니었고, Round 3 로그는 packet/prompt hash나 fresh context를 증명하지 않는다.
- prompt는 single resource에 \`use_resource\`를 허용하지만 case-06은 그 표현으로 edit, case-09는 keep 판정을 받아 Item keep 73.3%는 reviewer-policy에 민감하다. unsupported=15 실패는 이 재판정과 무관하다.

## 모델·비용 증거 경계

이번 실행은 현재 세션의 **unselected model-proxy** 증거다. provider/model/tier/token/cost/latency와 사람 리뷰는 측정되지 않았다. 따라서 저가/고가 모델 비교나 실제 API 비용 결론으로 사용할 수 없다. 동일 packet/prompt/schema hash를 모델 선택 세션에서 재사용해야 한다.

## 다음 데이터 구조 결정

1. deterministic preflight와 semantic generator를 계속 분리한다.
2. \`lifeArea\`처럼 sparse rows에서 확정 불가능한 분류는 \`unknown/null + confidence/reason\` 후보를 검토한다.
3. noun-only \`check\`와 generic \`resource\`의 action contract를 SourceRow extraction 단계에서 더 명시적으로 표현한다.
4. case-01/09/10처럼 canonical 의미가 행에 없는 fixture는 model 실패가 아니라 extraction sufficiency 경고로 분리한다.
5. v1.2/4회차를 즉흥 실행하지 말고 새 schema·source-row sufficiency 실험으로 별도 preregister한다.

## 산출물

- [한국어 PPT형 HTML](./report.html)
- [FLOW 초안 10건](./previews/index.html)
- [기계 판독 report data](./report-data.json)
- [완료 검증 결과](./completion-verification.json)
- [교정 spec](../../specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/spec.md)
- [QA](../../specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/qa.md)
`;
  await writeFile(path.join(auditDir, "comparison.md"), comparison, "utf8");

  const success = cases.find((entry) => entry.caseId === "case-02");
  const overreach = cases.find((entry) => entry.caseId === "case-03");
  const genericResource = cases.find((entry) => entry.caseId === "case-09");
  const inspection = cases.find((entry) => entry.caseId === "case-10");
  const gateRows = Object.entries(completionChecks)
    .map(
      ([key, passed]) => `<tr><td>${escapeHtml(key)}</td><td><span class="pill ${passed ? "pass" : "fail"}">${passed ? "PASS" : "FAIL"}</span></td></tr>`,
    )
    .join("");
  const matrixRows = cases
    .map(
      (entry) => `<tr><td>${entry.caseId}</td><td>${escapeHtml(entry.sourceRows.map((row) => row.title).join(" · ") || "preflight negative")}</td><td>${escapeHtml(artifactLabel[entry.round2.artifact] ?? "—")}</td><td>${entry.round2Valid ? "PASS" : "FAIL"}</td><td>${escapeHtml(entry.round2Review?.verdict ?? "—")}</td><td>${entry.stability.exact ? "same" : "changed"}</td></tr>`,
    )
    .join("");
  const reportHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>URL-to-FLOW Prompt Lab v1 · SourceRow-only 결과</title>
  <style>
    :root{--ink:#172033;--muted:#657188;--paper:#fff;--cream:#f7f2e8;--blue:#2659d9;--blue-soft:#edf3ff;--green:#147d64;--green-soft:#eaf8f3;--red:#b13e3e;--red-soft:#fff0ef;--amber:#a56100;--line:#dfe5ee;--shadow:0 22px 70px rgba(21,35,70,.12)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-snap-type:y proximity}body{margin:0;background:#e9eef6;color:var(--ink);font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;line-height:1.55}.deck{width:min(1440px,100%);margin:auto}.slide{min-height:100svh;background:var(--paper);padding:clamp(28px,6vw,86px);padding-top:max(80px,clamp(28px,6vw,86px));border-bottom:1px solid var(--line);display:flex;flex-direction:column;justify-content:center;scroll-snap-align:start;overflow:hidden;position:relative}.slide:nth-child(even){background:var(--cream)}
    .kicker{font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--blue)}h1{font-size:clamp(2.45rem,7vw,6.6rem);line-height:.98;letter-spacing:-.055em;max-width:1100px;margin:.2em 0}.slide h2{font-size:clamp(2rem,5vw,4.4rem);line-height:1.05;letter-spacing:-.045em;margin:.15em 0 .55em;max-width:1100px}.lead{font-size:clamp(1.05rem,2.2vw,1.55rem);color:#364258;max-width:900px}.muted{color:var(--muted)}
    .outcome{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.pill{display:inline-flex;align-items:center;border-radius:999px;padding:7px 11px;font-size:.8rem;font-weight:850;background:#eef1f6}.pill.pass{background:var(--green-soft);color:var(--green)}.pill.fail{background:var(--red-soft);color:var(--red)}.pill.info{background:var(--blue-soft);color:var(--blue)}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.card{grid-column:span 4;background:rgba(255,255,255,.86);border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:0 10px 35px rgba(36,52,86,.06)}.cream .card{background:#fff}.card h3{margin:0 0 8px;font-size:1.1rem}.metric{font-size:clamp(2.2rem,5vw,4rem);font-weight:900;letter-spacing:-.05em;line-height:1}.metric.fail{color:var(--red)}.metric.pass{color:var(--green)}
    .example-card{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;background:#fff;border:1px solid var(--line);border-radius:26px;padding:clamp(18px,3vw,32px);box-shadow:var(--shadow);margin-top:20px}.example-card ul{padding-left:20px;margin:.7em 0}.example-card li{margin:.45em 0}.example-card li span{display:block;color:var(--muted);font-size:.9rem}.mini-label{font-size:.73rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--blue)}.arrow{font-size:2rem;color:var(--blue)}code{background:#eef2f7;border-radius:6px;padding:2px 5px;font-size:.78em}
    .pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;align-items:stretch}.stage{border:1px solid var(--line);background:white;border-radius:18px;padding:18px}.stage strong{display:block}.stage small{color:var(--muted)}.stage.model{border-color:#9bb5ff;background:var(--blue-soft)}
    .table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:white}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}tr:last-child td{border-bottom:0}
    .callout{border-left:5px solid var(--blue);background:var(--blue-soft);border-radius:0 18px 18px 0;padding:18px 22px;margin-top:22px;max-width:1000px}.callout.fail{border-color:var(--red);background:var(--red-soft)}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.list{font-size:clamp(1rem,1.7vw,1.25rem);padding-left:1.2em}.list li{margin:.65em 0}.tiny{font-size:.78rem;color:var(--muted)}
    .controls{position:fixed;right:16px;top:16px;z-index:20;display:flex;align-items:center;gap:8px;background:rgba(20,31,52,.9);color:white;border-radius:999px;padding:7px;box-shadow:0 12px 30px rgba(0,0,0,.25)}.controls button{width:44px;height:44px;border:0;border-radius:50%;background:white;color:#172033;font-size:1.15rem;cursor:pointer}.controls output{min-width:70px;text-align:center;font-size:.8rem}.progress{position:fixed;left:0;top:0;height:4px;background:var(--blue);z-index:30;width:0}
    @media(max-width:820px){.slide{min-height:auto;padding:82px 18px 72px}.grid{display:block}.card{margin:4px 0;padding:12px}.metric{font-size:2rem}.slide h2{font-size:2rem;margin-bottom:.4em}.lead{font-size:1rem}.two,.pipeline,.example-card{grid-template-columns:1fr}.arrow{transform:rotate(90deg);text-align:center}.controls{right:10px;top:10px;bottom:auto}h1{font-size:clamp(2.5rem,14vw,4.6rem)}}
    @media print{body{background:white}.slide{min-height:100vh;break-after:page}.controls,.progress{display:none}}
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>
  <article class="deck" id="deck">
    <section class="slide">
      <div class="kicker">URL-to-FLOW · SourceRow-only corrected lane</div>
      <h1>그럴듯한 Flow는 나왔다.<br>아직 믿고 자동화할 수는 없다.</h1>
      <p class="lead">12건을 새 입력 계약으로 다시 돌렸지만 계약·품질 gate를 모두 지키지 못했다. 결론은 <strong>Prompt Lab v1 미완료 · production backend No-Go</strong>다.</p>
      <div class="outcome"><span class="pill pass">Round 2 schema 12/12</span><span class="pill fail">Item keep 73.3%</span><span class="pill fail">Unsupported 15</span><span class="pill fail">입력·protocol 위반</span><span class="pill info">비용 증거 없음</span></div>
      ${exampleCard(overreach, "생성된 Flow")}
      <p class="tiny">첫 예시부터 보이는 문제: ‘여권 / 데이터 유심’만으로 모델이 ‘여행 준비’를 확정했다.</p>
    </section>

    <section class="slide">
      <div class="kicker">Example 01 · grounded success</div>
      <h2>값이 행에 있으면 강하다</h2>
      <p class="lead">청소 대상·방법·주기가 한 SourceRow 안에 같이 있으면 Item과 Calendar 후보를 근거 그대로 만들 수 있다.</p>
      ${exampleCard(success, "Round 2 Flow")}
      <div class="callout"><strong>왜 통과했나</strong><br>‘극세 필터’, ‘4주에 한 번’, ‘먼지 제거·물세척·그늘 건조’가 모두 literal row evidence다.</div>
    </section>

    <section class="slide">
      <div class="kicker">Example 02 · sparse row</div>
      <h2>행이 짧으면 분류가 흔들린다</h2>
      <div class="two">
        <div>${exampleCard(genericResource, "Round 2")}</div>
        <div class="card"><h3>보이지 않는 것</h3><ul class="list"><li>사진이라는 주제</li><li>실행 날짜</li><li>학습/취미 life area</li><li>prompt 안의 실제 과제</li></ul><p class="muted">canonical 정답에 있어도 SourceRow에 없으면 모델이 맞혀서는 안 된다.</p></div>
      </div>
    </section>

    <section class="slide">
      <div class="kicker">Why corrected lane</div>
      <h2>이전 10/10은 품질 증거가 아니었다</h2>
      <div class="grid"><div class="card"><div class="metric fail">10/10</div><h3>canonical userJob 노출</h3><p>positive packet의 userJob이 hidden expected user need와 동일했다.</p></div><div class="card"><div class="metric fail">full</div><h3>source metadata 노출</h3><p>title, URL, publisher, locale, risk, semantic IDs가 prompt에 들어갔다.</p></div><div class="card"><div class="metric pass">분리</div><h3>이번 corrected evidence</h3><p>기존 결과는 validator preflight로만 보존하고 completion 분모에서 제외했다.</p></div></div>
    </section>

    <section class="slide">
      <div class="kicker">Input contract</div>
      <h2>규칙과 모델의 경계를 먼저 잘랐다</h2>
      <div class="pipeline"><div class="stage"><strong>Rich intake</strong><small>locale · risk · rights · access</small></div><div class="stage"><strong>Deterministic preflight</strong><small>negative 2건 차단</small></div><div class="stage model"><strong>SourceRow generator</strong><small>opaque provenance + rowType/title/detail/order</small></div><div class="stage"><strong>Validator</strong><small>schema · accounting · schedule literal</small></div><div class="stage"><strong>Blind review</strong><small>keep · 7축 · unsupported</small></div></div>
      <div class="callout fail"><strong>입력 계약 편차</strong><br>source/row ID는 opaque였지만 generator-visible case ID는 canonical case-01…10이었다. negative 2건은 preflight에서 정확히 멈췄다.</div>
    </section>

    <section class="slide">
      <div class="kicker">Data model</div>
      <h2>최소 provenance는 SourceRow,<br>최소 실행 상태는 Item</h2>
      <div class="pipeline"><div class="stage"><strong>SourceRow</strong><small>원문 근거 최소 단위</small></div><div class="stage"><strong>Item</strong><small>check / decide / record / hold</small></div><div class="stage"><strong>Step</strong><small>순서·의미 그룹</small></div><div class="stage"><strong>Flow</strong><small>한 사용자 일</small></div><div class="stage"><strong>Projection</strong><small>ICS · todo · sheet · memo</small></div></div>
      <p class="lead">ICS도 체크리스트도 canonical 최소 단위가 아니다. 같은 Item을 목적지에 맞게 투영한다.</p>
    </section>

    <section class="slide">
      <div class="kicker">Fixed corpus · 12</div>
      <h2>주제보다 source shape를 섞었다</h2>
      <div class="table-wrap"><table><thead><tr><th>Case</th><th>SourceRows</th><th>R2 artifact</th><th>Validator</th><th>Review</th><th>R2↔R3</th></tr></thead><tbody>${matrixRows}</tbody></table></div>
    </section>

    <section class="slide">
      <div class="kicker">Round 1 · baseline</div>
      <h2>의미보다 JSON 계약에서 먼저 무너졌다</h2>
      <div class="grid"><div class="card"><div class="metric fail">${round1Validation.summary.passedOutputCount}/12</div><h3>schema valid</h3></div><div class="card"><div class="metric pass">16/16</div><h3>SourceRow accounting</h3></div><div class="card"><div class="metric pass">2/2</div><h3>negative disposition</h3></div></div>
      <div class="callout"><strong>한 defect class만 수정</strong><br>실제 prompt diff를 정규화해 required output contract lock 외 변경이 없음을 확인했다. 다만 Round 1 envelope는 preregistered 4+4+4가 아니라 4+4+2+2였다.</div>
    </section>

    <section class="slide">
      <div class="kicker">Round 2 · corrected prompt</div>
      <h2>기계 유효성은 통과,<br>semantic grounding은 미달</h2>
      <div class="grid"><div class="card"><div class="metric pass">12/12</div><h3>schema</h3></div><div class="card"><div class="metric pass">16/16</div><h3>accounting</h3></div><div class="card"><div class="metric fail">${pct(round2Review.metrics.itemKeepRate)}</div><h3>Item keep · 목표 80%</h3></div><div class="card"><div class="metric fail">${round2Review.metrics.unsupportedSignalCount}</div><h3>unsupported · 목표 0</h3></div><div class="card"><div class="metric pass">${round2Review.metrics.sevenAxisAverage.toFixed(2)}</div><h3>7축 평균 · 목표 3.5</h3></div><div class="card"><div class="metric pass">2/2</div><h3>negative</h3></div></div>
    </section>

    <section class="slide">
      <div class="kicker">Failure anatomy</div>
      <h2>‘쓸 만함’과 ‘근거 있음’은 다르다</h2>
      <div class="two"><div class="card"><h3>case-03</h3><p><strong>Rows:</strong> 여권 · 데이터 유심</p><p><strong>Overreach:</strong> 여행 준비, date_preparation, 준비 완료</p><p><strong>필요한 수정:</strong> noun-only check의 중립 action contract</p></div><div class="card"><h3>case-10</h3><p><strong>Rows:</strong> 정기검사 유효기간 · 기관 내부 단계</p><p><strong>지켜낸 것:</strong> 날짜 값 발명 없음, supporting row omission</p><p><strong>남은 문제:</strong> lifeArea/intent와 완료 기준 불확실</p></div></div>
      <div class="callout fail"><strong>핵심</strong><br>prompt를 더 길게 만드는 문제만이 아니다. sparse SourceRow와 required enum schema가 모델에게 근거 없는 확정을 강요할 수 있다.</div>
    </section>

    <section class="slide">
      <div class="kicker">Round 3 · protocol-deviating comparison</div>
      <h2>모델 생성 positive는<br>3/10만 같은 signature였다</h2>
      <div class="grid"><div class="card"><div class="metric fail">${stability.metrics.positiveExactMatches}/${stability.metrics.positiveComparedCases}</div><h3>positive exact</h3></div><div class="card"><div class="metric fail">${stability.metrics.exactMatches}/${stability.metrics.comparedCases}</div><h3>negative 포함 전체</h3></div><div class="card"><div class="metric fail">${round3Validation.summary.passedOutputCount}/12</div><h3>validator</h3></div><div class="card"><div class="metric pass">${stability.metrics.negativesExact}/${stability.metrics.negativeCount}</div><h3>deterministic negative</h3></div></div>
      <p class="lead">artifact, intent, grouping, memo presence가 흔들렸다. 하지만 run log에 packet hash와 fresh-context 증거가 없어 이것을 “같은 입력 모델 안정성”으로 부를 수는 없다.</p>
    </section>

    <section class="slide">
      <div class="kicker">Schema & validator</div>
      <h2>재사용 가능한 실험 장치는 남았다</h2>
      <div class="grid"><div class="card"><div class="metric pass">${schemaProfile.limits.objectSchemas.actual}</div><h3>object schemas · ≤12</h3></div><div class="card"><div class="metric pass">${schemaProfile.limits.declaredProperties.actual}</div><h3>properties · ≤60</h3></div><div class="card"><div class="metric pass">${schemaProfile.limits.serializedBytes.actual}</div><h3>schema bytes · ≤12KiB</h3></div><div class="card"><div class="metric pass">same</div><h3>bare/run diagnostics hash</h3></div></div>
      <div class="callout">재사용 가능한 packet/prompt/schema는 남았다. 다음 cheap/premium 실행은 각 run log에 실제 packet·prompt·schema hash와 모델·비용을 직접 기록해야 한다.</div>
    </section>

    <section class="slide">
      <div class="kicker">Cost evidence</div>
      <h2>이번 세션에서 비용 결론은 낼 수 없다</h2>
      <div class="grid"><div class="card"><h3>Provider</h3><div class="metric">N/A</div><p>선택·관찰되지 않음</p></div><div class="card"><h3>Token / latency</h3><div class="metric">N/A</div><p>측정 로그 없음</p></div><div class="card"><h3>Cheap vs premium</h3><div class="metric">N/A</div><p>동일 hash 재실행 필요</p></div></div>
      <p class="lead">현재 증거는 <strong>in-session unselected model-proxy</strong>다. 실제 API 단가나 모델 우열로 바꾸어 말하면 안 된다.</p>
    </section>

    <section class="slide">
      <div class="kicker">Completion audit</div>
      <h2>무엇이 통과했고, 무엇이 막혔나</h2>
      <div class="table-wrap"><table><thead><tr><th>Gate</th><th>Result</th></tr></thead><tbody>${gateRows}</tbody></table></div>
    </section>

    <section class="slide">
      <div class="kicker">Backend preparation</div>
      <h2>지금 구현해야 할 것은 LLM API가 아니다</h2>
      <ol class="list"><li><strong>SourceRow sufficiency:</strong> noun/resource/date-label rows에 action/topic/value가 충분한지 표시</li><li><strong>Nullable semantic candidate:</strong> lifeArea 등은 unknown/null + confidence/reason 검토</li><li><strong>Opaque request contract:</strong> case/source/row lineage ID를 모두 remap하고 validator로 증명</li><li><strong>Review policy:</strong> generic resource의 keep/edit 기준을 먼저 adjudicate</li><li><strong>Model experiment:</strong> packet/prompt/schema hash를 run log에 묶어 저가/고가 모델을 별도 세션에서 실행</li></ol>
    </section>

    <section class="slide">
      <div class="kicker">Decision</div>
      <h2>v1은 미완료.<br>하지만 다음 실험 질문은 명확해졌다.</h2>
      <p class="lead">“어떤 모델이 더 좋은가?”보다 먼저 “SourceRow가 어떤 semantic 결정을 허용해야 하는가?”를 고정해야 한다.</p>
      <div class="outcome"><span class="pill fail">Prompt Lab v1 incomplete</span><span class="pill fail">Production backend No-Go</span><span class="pill pass">Test harness reusable</span></div>
      <div class="callout"><strong>다음 preregistered 목표</strong><br>SourceRow sufficiency flag + nullable/unknown semantic fields를 설계하고, 동일 12건에서 unsupported=0과 keep≥80%를 다시 검증한다. 임의 v1.2/4회차는 만들지 않는다.</div>
      <p class="tiny">검토 링크: comparison.md · previews/index.html · report-data.json · completion-verification.json · spec/qa</p>
    </section>
  </article>
  <nav class="controls" aria-label="슬라이드 이동"><button type="button" id="prev" aria-label="이전 슬라이드">←</button><output id="counter">1 / 16</output><button type="button" id="next" aria-label="다음 슬라이드">→</button></nav>
  <script>
    const slides=[...document.querySelectorAll('.slide')],counter=document.querySelector('#counter'),progress=document.querySelector('#progress');let current=0;
    const go=i=>{current=Math.max(0,Math.min(slides.length-1,i));slides[current].scrollIntoView({behavior:'smooth',block:'start'});update()};
    const update=()=>{counter.textContent=(current+1)+' / '+slides.length;progress.style.width=((current+1)/slides.length*100)+'%'};
    document.querySelector('#prev').addEventListener('click',()=>go(current-1));document.querySelector('#next').addEventListener('click',()=>go(current+1));
    addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(current+1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(current-1)}});
    const observer=new IntersectionObserver(entries=>{const hit=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(hit){current=slides.indexOf(hit.target);update()}},{threshold:[.35,.65]});slides.forEach(s=>observer.observe(s));update();
  </script>
</body>
</html>`;
  await writeFile(path.join(auditDir, "report.html"), reportHtml, "utf8");
  return {
    completionPassed,
    failedChecks,
    reportData: "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/report-data.json",
    comparison: "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/comparison.md",
    html: "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/report.html",
    previews: previewLinks.length,
  };
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  buildSourceRowReport()
    .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
