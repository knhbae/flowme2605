import fs from "node:fs";

const htmlPath = "docs/content-audit/2026-05-31-online-source-catalog-200.html";
const reviewPath = "docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json";

const html = fs.readFileSync(htmlPath, "utf8");
const reviews = JSON.parse(fs.readFileSync(reviewPath, "utf8"));

const reviewMap = Object.fromEntries(
  reviews.map((r) => [
    r.id,
    {
      status: r.reviewStatus,
      label: r.reviewStatusLabel,
      pageTitle: r.pageTitle,
      resolvedOriginalUrl: r.resolvedOriginalUrl,
      resolvedOriginalTitle: r.resolvedOriginalTitle,
      originalSummary: r.originalSummary,
      flowContent: r.flowContent,
      realFlowDraft: r.realFlowDraft,
      sourceKind: r.sourceKind,
    },
  ]),
);

const block = `  <!-- original-source-review-sync:start -->
  <script>
    (() => {
      const originalReviewMap = ${JSON.stringify(reviewMap)};
      const statusClass = (status) => {
        if (status === "original_readable") return "status-readable";
        if (status === "needs_original_source_selection") return "status-unresolved";
        return "status-needs-work";
      };
      const list = (items) => (items || []).filter(Boolean).map((x) => "<li>" + esc(x) + "</li>").join("");
      const reviewStyle = document.createElement("style");
      reviewStyle.textContent = \`
        .source-review,
        .real-flow-draft,
        .quality-review {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 8px;
          padding: 10px;
          margin: 10px 0;
        }
        .source-review-head,
        .draft-head,
        .quality-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .source-review-head h3,
        .draft-head h3,
        .quality-head h3 {
          margin: 0;
          font-size: 14px;
        }
        .source-status,
        .quality-badge {
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 12px;
          white-space: nowrap;
        }
        .status-readable,
        .quality-good { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
        .status-unresolved,
        .quality-warn { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }
        .status-needs-work { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
        .source-review p,
        .real-flow-draft p,
        .quality-review p {
          margin: 0;
          color: #334155;
          font-size: 13px;
        }
        .source-review .source-title,
        .draft-meta {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
        }
        .draft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        .draft-block {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 9px;
          background: #f8fafc;
        }
        .draft-block h4 {
          margin: 0 0 6px;
          font-size: 13px;
          color: #0f172a;
        }
        .draft-block ol,
        .draft-block ul {
          margin: 0;
          padding-left: 18px;
          color: #334155;
          font-size: 13px;
        }
        .first-action {
          border-left: 3px solid #2563eb;
          padding-left: 8px;
          margin-top: 8px;
        }
        .flowme-checklist {
          border: 1px solid #bfdbfe;
          background: #f8fbff;
          border-radius: 8px;
          padding: 10px;
          margin-top: 10px;
        }
        .flowme-checklist h4 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #0f172a;
        }
        .flowme-checklist .draft-meta {
          margin-bottom: 8px;
        }
        .flowme-check-item {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
          padding: 7px 0;
          border-top: 1px solid #dbeafe;
          font-size: 13px;
          color: #1e293b;
        }
        .flowme-check-item:first-of-type {
          border-top: 0;
        }
        .flowme-check-item input {
          margin-top: 2px;
        }
        .check-copy {
          min-width: 0;
        }
        .evidence-line {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
        }
        .basis-pill {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          border-radius: 999px;
          color: #1d4ed8;
          font-size: 11px;
          padding: 2px 6px;
          white-space: nowrap;
        }
        .basis-pill.needs-recheck {
          border-color: #fde68a;
          background: #fffbeb;
          color: #92400e;
        }
        .basis-pill.summary-supported {
          border-color: #e9d5ff;
          background: #faf5ff;
          color: #6b21a8;
        }
        .verification-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin: 7px 0 8px;
          color: #475569;
          font-size: 12px;
        }
        .score-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .score-chip {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 12px;
          color: #334155;
        }
        .card-score {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 700;
          padding: 3px 7px;
          white-space: nowrap;
        }
        .card-score.needs-work {
          border-color: #fde68a;
          background: #fffbeb;
          color: #92400e;
        }
        .card-score.rejected {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }
        .card-score.mvp {
          border-color: #a7f3d0;
          background: #ecfdf5;
          color: #047857;
        }
        .score-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }
        .score-strip .score-chip {
          padding: 2px 6px;
          font-size: 11px;
        }
        .fit-review {
          border: 1px solid #d7e1ee;
          background: #f8fafc;
          border-radius: 8px;
          padding: 10px;
          margin-top: 10px;
        }
        .fit-review.fit { border-color: #a7f3d0; background: #ecfdf5; }
        .fit-review.conditional { border-color: #fde68a; background: #fffbeb; }
        .fit-review.reject { border-color: #fecaca; background: #fef2f2; }
        .fit-review.recheck { border-color: #dbeafe; background: #eff6ff; }
        .fit-review h4 {
          margin: 0 0 6px;
          font-size: 13px;
        }
        .fit-review ul {
          margin: 6px 0 0 18px;
          padding: 0;
          color: #334155;
          font-size: 13px;
        }
        .actual-flow {
          border: 1px solid #bfdbfe;
          background: #f8fbff;
          border-radius: 8px;
          padding: 10px;
          margin-top: 10px;
        }
        .actual-flow h4 {
          margin: 0 0 6px;
          font-size: 14px;
          color: #0f172a;
        }
        .actual-flow-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          margin-top: 8px;
        }
        .actual-flow-block {
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #fff;
          padding: 8px;
          font-size: 12px;
        }
        .actual-flow-block b {
          display: block;
          margin-bottom: 4px;
          color: #0f172a;
          font-size: 12px;
        }
        .actual-flow-block ul,
        .actual-flow-block ol {
          margin: 0 0 0 17px;
          padding: 0;
          color: #334155;
        }
        .actual-flow-block li {
          margin: 3px 0;
        }
        .actual-flow-compact-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 6px 0 0;
        }
        .actual-flow-chip {
          border: 1px solid #dbeafe;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 11px;
          padding: 2px 7px;
          white-space: nowrap;
        }
      \`;
      document.head.appendChild(reviewStyle);

      const scoreLabels = {
        sourceFidelity: "원문 충실도",
        executionTransfer: "실행 전환성",
        demandRepeatImpact: "수요/반복성",
        inputSimplicity: "입력 단순성",
        flowmeDifferentiation: "FlowMe 차별성",
        sensitivityRisk: "민감도 리스크",
      };
      const scoreClass = (label) => {
        if (label === "P0 Flow 적합" || label === "P1 Flow 적합") return "mvp";
        if (label === "조건부" || label === "원문 재확인") return "needs-work";
        if (label === "탈락") return "rejected";
        return "";
      };
      const qualityForRow = (r) => {
        const draft = originalReviewMap[r.id] && originalReviewMap[r.id].realFlowDraft;
        return draft && draft.quality;
      };
      const decorateCardScores = () => {
        document.querySelectorAll(".card").forEach((card) => {
          const title = card.querySelector(".title")?.textContent || "";
          const id = (title.match(/^(\\d{3})\\./) || [])[1];
          if (!id || card.querySelector(".card-score")) return;
          const row = rows.find((item) => item.id === id);
          const quality = row && qualityForRow(row);
          if (!quality) return;
          const fit = originalReviewMap[id]?.realFlowDraft?.flowFit;
          const head = card.querySelector(".card-head");
          const score = document.createElement("span");
          score.className = "card-score " + scoreClass(quality.label);
          score.textContent = (fit?.verdict || quality.label || "평가") + " · " + (quality.average || "-") + "/5" + (quality.rank ? " #" + quality.rank : "");
          head?.appendChild(score);
          const scores = quality.scores || {};
          const strip = document.createElement("div");
          strip.className = "score-strip";
          const weights = quality.weights || {};
          strip.innerHTML = Object.entries(scores).map(([key, value]) => '<span class="score-chip">' + esc(scoreLabels[key] || key) + ' ' + esc(value) + ' · ' + esc(weights[key] || 0) + '%</span>').join("");
          card.querySelector(".desc")?.after(strip);
        });
      };

      const renderSourceReview = (r) => {
        const review = originalReviewMap[r.id];
        if (!review) return "";
        return [
          '<section class="source-review">',
          '<div class="source-review-head"><h3>원문 확인 상태</h3><span class="source-status ' + statusClass(review.status) + '">' + esc(review.label) + '</span></div>',
          '<p>' + esc(review.originalSummary || "원문 요약이 없습니다.") + '</p>',
          review.pageTitle ? '<p class="source-title">원문 제목: ' + esc(review.pageTitle) + '</p>' : '',
          review.resolvedOriginalUrl ? '<p class="source-title">확인한 원문: <a href="' + esc(review.resolvedOriginalUrl) + '" target="_blank" rel="noreferrer">' + esc(review.resolvedOriginalUrl) + '</a></p>' : '',
          review.status === "needs_original_source_selection" ? '<p class="source-title">현재 링크는 검색결과입니다. 실제 원문 URL을 선택한 뒤 Flow 변환을 확정해야 합니다.</p>' : '',
          '</section>'
        ].join("");
      };

      const renderRealFlowDraft = (r) => {
        const review = originalReviewMap[r.id];
        const draft = review && review.realFlowDraft;
        if (!draft) return "";
        const action = draft.firstAction || {};
        const sourceHandling = draft.sourceHandling || {};
        const flowChecklist = draft.flowChecklist || {};
        const verification = flowChecklist.sourceVerification || draft.sourceVerification || {};
        const confidenceClass = (confidence) => {
          if (confidence === "needs_recheck") return " needs-recheck";
          if (confidence === "summary_supported") return " summary-supported";
          return "";
        };
        const flowChecklistItems = (flowChecklist.items || []).map((item) => [
          '<label class="flowme-check-item">',
          '<input type="checkbox" disabled>',
          '<span class="check-copy">' + esc(item.label) + (item.evidence ? '<span class="evidence-line">근거: ' + esc(item.evidence) + '</span>' : '') + '</span>',
          '<span class="basis-pill' + confidenceClass(item.confidence) + '">' + esc(item.basis || item.kind || "체크") + '</span>',
          '</label>'
        ].join("")).join("");
        return [
          '<section class="real-flow-draft">',
          '<div class="draft-head"><h3>실제 Flow 초안</h3><span class="quality-badge quality-good">' + esc(draft.primaryDestination || "hybrid") + '</span></div>',
          '<p><b>' + esc(draft.flowTitle || r.title) + '</b></p>',
          '<p class="draft-meta">원문: ' + esc(draft.sourceTitle || review.pageTitle || r.title) + ' · 형태: ' + esc(draft.contentShape || "웹 원문") + ' · 구조: ' + esc(draft.structure || "checklist") + '</p>',
          '<p class="draft-meta">' + esc(draft.userNeed || "") + '</p>',
          '<div class="first-action"><p><b>첫 액션: ' + esc(action.title || "기준 입력") + '</b></p><p>' + esc(action.how || "") + '</p><p class="draft-meta">완료 기준: ' + esc(action.completion || draft.completion || "") + '</p></div>',
          '<div class="flowme-checklist"><h4>' + esc(flowChecklist.title || "FlowMe 실제 체크리스트") + '</h4><p class="draft-meta">' + esc(flowChecklist.intent || "원문 기반 실행 항목입니다.") + '</p><div class="verification-line"><span class="basis-pill' + confidenceClass(verification.level === "source_text" ? "direct" : "needs_recheck") + '">' + esc(verification.label || "근거 확인") + '</span><span>' + esc(verification.note || "") + '</span></div>' + flowChecklistItems + '</div>',
          '<div class="draft-grid">',
          '<div class="draft-block"><h4>원문에서 잡은 실제 단서</h4><ul>' + (list(draft.sourceSignals) || '<li>원문 요약 기준으로만 초안 생성</li>') + '</ul></div>',
          '<div class="draft-block"><h4>캘린더/일정</h4><ul>' + (list(draft.calendar) || '<li>일정 없이 체크/메모 중심으로 관리</li>') + '</ul></div>',
          '<div class="draft-block"><h4>변환 참고 항목</h4><ol>' + list(draft.checklist) + '</ol></div>',
          '<div class="draft-block"><h4>반복/기록</h4><ul>' + (list(draft.routine) || '<li>반복이 필요한 경우 사용자가 주기만 추가</li>') + '</ul></div>',
          '<div class="draft-block"><h4>출처/주의 분리</h4><ul>' + list([sourceHandling.fact, sourceHandling.experience, sourceHandling.caution]) + '</ul></div>',
          '</div>',
          '</section>'
        ].join("");
      };

      const renderActualFlowContent = (r) => {
        const draft = originalReviewMap[r.id] && originalReviewMap[r.id].realFlowDraft;
        const content = draft && draft.actualFlowContent;
        if (!content) return "";
        if (content.status !== "ready") {
          return '<section class="actual-flow"><h4>Flow 콘텐츠</h4><p class="draft-meta">생성 안 함: ' + esc(content.reason || "Flow 적합 후보가 아닙니다.") + '</p></section>';
        }
        const requiredInputs = (content.inputs || []).filter((item) => item.required !== false).slice(0, 3);
        const optionalInputCount = Math.max(0, (content.inputs || []).filter((item) => item.required === false).length);
        const inputChips = requiredInputs.map((item) => '<span class="actual-flow-chip">' + esc(item.name) + '</span>').join("") + (optionalInputCount ? '<span class="actual-flow-chip">선택 ' + esc(optionalInputCount) + '</span>' : "");
        const actionItems = [
          ...(content.calendarItems || []).map((item) => ({ type: "일정", title: item.title, detail: item.timing || item.description || "" })),
          ...(content.checklistItems || []).map((item) => ({ type: "체크", title: item.title, detail: item.completion || "" })),
          ...(content.routineItems || []).map((item) => ({ type: "루틴", title: item.title, detail: item.repeat || item.description || "" })),
        ].slice(0, 4);
        const actions = actionItems.map((item) => '<li><b>' + esc(item.type) + '</b> ' + esc(item.title) + (item.detail ? '<br><span class="draft-meta">' + esc(item.detail) + '</span>' : '') + '</li>').join("");
        const records = (content.recordFields || []).slice(0, 3).map((item) => '<span class="actual-flow-chip">' + esc(item) + '</span>').join("");
        return [
          '<section class="actual-flow">',
          '<h4>Flow 콘텐츠</h4>',
          '<p><b>' + esc(content.title || r.title) + '</b></p>',
          '<p class="draft-meta">' + esc(content.anchor?.name || "") + ' 기준 · ' + esc(content.primaryDestination || "hybrid") + '</p>',
          '<div class="actual-flow-compact-meta">' + inputChips + '</div>',
          '<div class="actual-flow-grid">',
          '<div class="actual-flow-block"><b>실행</b><ol>' + actions + '</ol></div>',
          '<div class="actual-flow-block"><b>기록</b><div class="actual-flow-compact-meta">' + records + '</div></div>',
          '<div class="actual-flow-block"><b>완료</b><p class="draft-meta">' + esc(content.completionDefinition || "") + '</p></div>',
          '</div>',
          '</section>'
        ].join("");
      };

      const renderQualityReview = (r) => {
        const draft = originalReviewMap[r.id] && originalReviewMap[r.id].realFlowDraft;
        const quality = draft && draft.quality;
        if (!quality) return "";
        const fit = draft.flowFit || {};
        const fitClass = fit.level || "";
        const fitReasons = list([...(fit.reasons || []), ...(fit.blockers || []).map((x) => "보완/차단: " + x)]);
        const scores = quality.scores || {};
        const weights = quality.weights || {};
        const scoreHtml = Object.entries(scores).map(([key, value]) => '<span class="score-chip">' + esc(scoreLabels[key] || key) + ' ' + esc(value) + ' · 가중치 ' + esc(weights[key] || 0) + '%</span>').join("");
        const badgeClass = quality.average >= 4 ? "quality-good" : "quality-warn";
        return [
          '<section class="quality-review">',
          '<div class="quality-head"><h3>Flow화 평가</h3><span class="quality-badge ' + badgeClass + '">' + esc(fit.verdict || quality.label || "검토") + (quality.rank ? ' #' + esc(quality.rank) : '') + ' · ' + esc(quality.average || "-") + '/5</span></div>',
          '<div class="fit-review ' + esc(fitClass) + '"><h4>엄격 판정: ' + esc(fit.verdict || "검토") + '</h4><ul>' + fitReasons + '</ul></div>',
          '<div class="score-row">' + scoreHtml + '</div>',
          '<p class="draft-meta">다음 보완: ' + esc(quality.topFix || "") + '</p>',
          '</section>'
        ].join("");
      };

      const flowFromReview = (r) => {
        const review = originalReviewMap[r.id];
        return review && review.flowContent ? review.flowContent : flowPreview(r);
      };

      renderDeepDive = function renderDeepDiveWithOriginalReview(r) {
        const preview = flowFromReview(r);
        const sourceItems = sourceSummary(r).map((x) => "<li>" + esc(x) + "</li>").join("");
        const fallbackItems = preview.items || [];
        const executionItems = fallbackItems.length
          ? fallbackItems.map((x) => "<li>" + esc(x) + "</li>").join("")
          : [
              ...(preview.calendar || []).map((x) => "캘린더: " + x),
              ...(preview.checklist || []).map((x) => "체크: " + x),
              ...(preview.routine || []).map((x) => "루틴: " + x)
            ].map((x) => "<li>" + esc(x) + "</li>").join("");
        const conversion = preview.need
          ? ['<li>' + esc(preview.need) + '</li><li>' + esc(preview.structure) + '</li><li>' + esc(preview.completion) + '</li><li>' + esc(preview.status) + '</li>'].join("")
          : ['<li>구조/목적지: ' + esc((preview.structure || "") + " / " + (preview.destination || "")) + '</li><li>완료 기준: ' + esc(preview.completion || "") + '</li><li>출처/위험 분리: ' + esc(preview.risk || "") + '</li>'].join("");
        return [
          '<details class="deep-dive">',
          '<summary>Flow 콘텐츠 / 원문 / 평가</summary>',
          renderSourceReview(r),
          renderActualFlowContent(r),
          renderQualityReview(r),
          '</details>'
        ].join("");
      };

      const sortRowsByEvaluation = () => {
        const order = { P0: 0, P1: 1, P2: 2, RECHECK: 3, OUT: 4 };
        rows.sort((a, b) => {
          const qa = originalReviewMap[a.id]?.realFlowDraft?.quality || {};
          const qb = originalReviewMap[b.id]?.realFlowDraft?.quality || {};
          const rankA = qa.rank || 9999;
          const rankB = qb.rank || 9999;
          const priorityA = order[qa.priority] ?? 9;
          const priorityB = order[qb.priority] ?? 9;
          return (
            priorityA - priorityB ||
            rankA - rankB ||
            (qb.average || 0) - (qa.average || 0) ||
            impactRank(a.category) - impactRank(b.category) ||
            a.id.localeCompare(b.id)
          );
        });
      };

      const originalRender = render;
      render = function renderWithScores() {
        sortRowsByEvaluation();
        originalRender();
        decorateCardScores();
      };
      render();
      saveNotes();
    })();
  </script>
  <!-- original-source-review-sync:end -->`;

const marker = /  <!-- original-source-review-sync:start -->[\s\S]*?  <!-- original-source-review-sync:end -->/;
const next = marker.test(html) ? html.replace(marker, block) : html.replace("</body>", `${block}\n</body>`);
fs.writeFileSync(htmlPath, next, "utf8");
console.log(`synced ${reviews.length} reviews into ${htmlPath}`);
