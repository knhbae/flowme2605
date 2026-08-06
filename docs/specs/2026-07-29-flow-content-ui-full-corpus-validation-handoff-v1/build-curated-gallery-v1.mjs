import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const secondReview = process.argv.includes("--second-review");
const sourceFileName =
  "2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html";
const sourcePath = path.join(repoRoot, "docs/content-audit", sourceFileName);
const outputDirectory = path.join(
  repoRoot,
  "docs/content-audit",
  secondReview
    ? "2026-07-31-flow-content-other-content-review-v1-ko"
    : "2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko-parts",
);
const outputPath = path.join(outputDirectory, "review.html");
const manifestPath = path.join(
  outputDirectory,
  secondReview ? "manifest.json" : "curated-manifest.json",
);
const hardFileBytes = 1024 * 1024;
const expectedSourceSha256 =
  "021667d19d042a5dfd418f3dbcbf553fd871a08b0fd47703fe716538419aaf56";
const reviewDate = secondReview ? "2026-07-31" : "2026-07-30";
const dataOpen = '<script id="curatedData" type="application/json">';
const dataClose = "</script>";
const sourceHtml = fs.readFileSync(sourcePath, "utf8");
const sourceSha256 = sha256(sourceHtml);
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(
    `Source Gallery SHA changed: expected ${expectedSourceSha256}, received ${sourceSha256}`,
  );
}
const sourceData = readEmbeddedJson(
  sourceHtml,
  '<script id="corpusData" type="application/json">',
);

const groups = {
  date: "날짜 기준 실행",
  undated: "날짜 없는 진행",
  decision: "결정과 결과물",
  boundary: "일정과 안전 경계",
};

const firstSelection = [
  {
    contentId: "canonical:base-moving-d30",
    group: "date",
    core: true,
    resultKind: "calendar",
    resultLabel: "캘린더 일정",
    focus: "같은 날짜의 여러 행동을 한 일정으로 묶어도 이해되나요?",
    caution:
      "이사일은 사용자가 정하는 값입니다. 원문 D-day와 개인 날짜를 같은 사실처럼 보지 마세요.",
  },
  {
    contentId: "canonical:base-baby-food-174",
    group: "date",
    core: true,
    resultKind: "calendar",
    resultLabel: "캘린더 식단",
    focus: "D+ 날짜와 식단 순서, 주의 범위가 분명하게 보이나요?",
    caution:
      "식단 순서 검토용 자료입니다. 건강·이유식 안전성이나 개인 적합성을 보장하지 않습니다.",
  },
  {
    contentId: "canonical:base-opic-plan",
    group: "undated",
    core: true,
    resultKind: "sheet",
    resultLabel: "표로 보는 진도",
    focus: "학습 범위와 진행 상태를 표로 받는 것이 자연스러운가요?",
    caution:
      "시작일을 입력하기 전에는 개인 캘린더 일정으로 확정하지 않습니다.",
  },
  {
    contentId: "canonical:base-opentutorials-web1-progress",
    group: "undated",
    core: true,
    resultKind: "sheet",
    resultLabel: "표로 보는 진도",
    focus: "날짜가 없어도 원문 순서의 진도표부터 시작하는 것이 편한가요?",
    caution:
      "원문에는 고정 학습일이 없습니다. 일정은 사용자가 원할 때만 별도로 정합니다.",
  },
  {
    contentId: "canonical:base-andstudio-job-prep-videos",
    group: "undated",
    core: true,
    resultKind: "todo",
    resultLabel: "할 일 목록",
    focus: "영상 3편을 각각 미루고 완료할 수 있는 할 일로 두는 것이 맞나요?",
    caution:
      "영상 순서와 링크는 원문에서 가져오고, 개인 마감일은 자동으로 만들지 않습니다.",
  },
  {
    contentId: "canonical:base-new-car-comparison",
    group: "decision",
    core: true,
    resultKind: "checklist",
    resultLabel: "구매 체크리스트",
    focus: "비교·결정·구매 행동이 적당한 크기의 체크 항목으로 나뉘었나요?",
    caution:
      "차량 선택과 계약 판단은 사용자 몫입니다. 원문에 없는 추천이나 조건을 추가하지 않습니다.",
  },
  {
    contentId: "generalization:GB-07",
    group: "decision",
    core: true,
    resultKind: "memo",
    resultLabel: "비교 메모",
    focus: "백업 방식 비교는 일정이나 할 일보다 메모로 보는 것이 이해하기 쉽나요?",
    caution:
      "비용·속도·복원 성능을 근거 없이 비교하거나 특정 방식을 정답으로 추천하지 않습니다.",
  },
  {
    contentId: "events:event-kr-qnet-exam-lifecycle",
    group: "boundary",
    core: true,
    resultKind: "event",
    resultLabel: "시험 일정 확인",
    focus: "접수 기간·시험일·발표일이 서로 다른 일정으로 이해되나요?",
    caution:
      "시험 배정 기간만으로 개인 시험 일정을 만들지 않습니다. 확정된 날짜·시간·장소가 필요합니다.",
  },
  {
    contentId: "events:event-pattern-nps-rescheduled",
    group: "boundary",
    core: false,
    resultKind: "eventHold",
    resultLabel: "일정 저장 보류",
    focus: "변경된 시간과 장소가 다시 확인될 때까지 저장을 멈추는 것이 안전한가요?",
    caution:
      "기존 시간과 장소를 새 날짜에 복사하지 않습니다. 변경 회차의 세부 정보가 다시 확인되어야 합니다.",
  },
  {
    contentId: "new:new-a05-nfa-home-fire",
    group: "boundary",
    core: false,
    resultKind: "checklist",
    resultLabel: "안전 체크리스트",
    focus: "공식 점검 행동과 주의 범위가 과장 없이 충분히 보이나요?",
    caution:
      "원문에 없는 월간 점검 주기를 만들지 않습니다. 실제 설치·점검은 최신 공식 안내를 다시 확인하세요.",
  },
];

const secondSelection = [
  {
    contentId: "canonical:value-vq-03",
    group: "date",
    core: true,
    resultKind: "calendar",
    resultLabel: "주간 식단 캘린더",
    calendarTitle: {
      context: "평일 저녁 식단",
      mode: "context_only",
    },
    focus:
      "캘린더 제목이 ‘평일 저녁 식단’으로만 반복되고 상세에도 실제 메뉴가 충분히 보이지 않습니다. 이 상태로 쓸 수 있나요?",
    caution:
      "현재 결과 상세에는 실제 메뉴·재료·조리법이 빠져 있습니다. 원문 근거를 더 가져오기 전에는 임의로 채우지 않습니다.",
  },
  {
    contentId: "canonical:value-vq-11",
    group: "date",
    core: true,
    resultKind: "calendar",
    resultLabel: "신청 기간 캘린더",
    calendarTitle: {
      context: "국가근로장학금 신청",
      mode: "context_step",
    },
    focus:
      "신청 기간과 서류 마감이 ‘전체 제목: 단계’로 보이면 무엇을 해야 하는지 바로 알 수 있나요?",
    caution:
      "2026년 7월 31일 한국장학재단 공식 페이지에서 기간을 다시 확인했습니다. 2차 운영 여부는 소속 대학 공지를 별도로 확인해야 합니다.",
  },
  {
    contentId: "legacy:preapp:busan-friends-2n3d-route",
    group: "date",
    core: true,
    resultKind: "calendar",
    resultLabel: "여행 일정 캘린더",
    calendarTitle: {
      context: "부산 2박 3일",
      mode: "context_step",
    },
    focus:
      "12개 장소를 ‘부산 2박 3일: 1일차’처럼 사흘 일정으로 묶고, 상세에서 방문 순서를 보는 게 편한가요?",
    caution:
      "원문의 3일 코스 순서만 옮깁니다. 운영시간·주소·실시간 교통 정보는 이 검토본에서 새로 만들지 않습니다.",
  },
  {
    contentId: "canonical:value-vq-01",
    group: "undated",
    core: true,
    resultKind: "todo",
    resultLabel: "신청 할 일",
    focus:
      "조건 확인부터 신청 결과와 지원 시작월 확인까지 네 가지 할 일로 나누면 실제 신청에 도움이 되나요?",
    caution:
      "자격을 대신 판단하지 않습니다. 개인정보 입력과 신청은 복지로 또는 주민센터에서 진행합니다.",
  },
  {
    contentId: "canonical:value-vq-12",
    group: "undated",
    core: true,
    resultKind: "checklist",
    resultLabel: "재난 준비 체크리스트",
    focus:
      "대피 계획·키트·연락처·훈련을 한 목록으로 준비하는 방식이 실제로 쓸 만한가요?",
    caution:
      "공식 준비 행동을 옮긴 검토본입니다. 응급 결과를 보장하지 않으며 약은 수의사와 확인합니다.",
  },
  {
    contentId: "canonical:value-vq-05",
    group: "decision",
    core: true,
    resultKind: "sheet",
    resultLabel: "강좌 진도표",
    focus:
      "고정 일정을 만들지 않고, 공개 차시 10개를 순서와 상태가 있는 표로 받는 게 편한가요?",
    caution:
      "원문에 학습 기간이 없으므로 주당 분량이나 마감일을 자동으로 만들지 않습니다.",
  },
  {
    contentId: "canonical:value-vq-06",
    group: "decision",
    core: true,
    resultKind: "sheet",
    resultLabel: "구매 비교표",
    focus:
      "제품별 값 없이 공식 비교 기준 6개만 나오는 표도 구매 판단에 도움이 되나요?",
    caution:
      "공식 시험 항목과 개인 구매 판단을 분리합니다. 개인 영양·건강 조언으로 사용하지 않습니다.",
  },
  {
    contentId: "canonical:value-vq-10",
    group: "decision",
    core: true,
    resultKind: "sheet",
    resultLabel: "공정별 점검표",
    focus:
      "리모델링 공정 13개를 한 표에서 확인·보류·메모하는 방식이 현장 점검에 도움이 되나요?",
    caution:
      "원문 점검 항목을 옮긴 자료입니다. 하자 판정이나 계약·법률 판단은 전문가와 확인해야 합니다.",
  },
];

const selection = secondReview ? secondSelection : firstSelection;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function readEmbeddedJson(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Missing embedded data marker: ${marker}`);
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd < 0) throw new Error("Missing embedded data closing tag");
  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function pick(record, keys) {
  if (!record) return null;
  return Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(record, key))
      .map((key) => [key, record[key]]),
  );
}

function resultProjectionName(resultKind) {
  return {
    calendar: "calendar",
    checklist: "checklist",
    todo: "todo",
    sheet: "sheet",
    memo: "memo",
    event: "calendar",
    eventHold: "calendar",
  }[resultKind];
}

function projectContent(content, presentation) {
  const canonical = content.canonical ?? {};
  const projectionName = resultProjectionName(presentation.resultKind);
  const sourceProjection = (content.projectionCells ?? []).find(
    (cell) => cell.projection === projectionName,
  );
  if (!sourceProjection) {
    throw new Error(
      `Missing ${projectionName} projection for ${content.contentId}`,
    );
  }
  const resultProjection = pick(sourceProjection, [
    "projection",
    "availability",
    "generationState",
    "counts",
    "output",
    "preview",
    "prohibitionReason",
    "fallback",
  ]);
  return {
    presentation: {
      group: presentation.group,
      groupLabel: groups[presentation.group],
      core: presentation.core,
      resultKind: presentation.resultKind,
      resultLabel: presentation.resultLabel,
      focus: presentation.focus,
      caution: presentation.caution,
      calendarTitle: presentation.calendarTitle ?? null,
    },
    contentId: content.contentId,
    title: content.displayTitle ?? content.title,
    userJob: content.userJob ?? content.saveReason,
    primaryProjection: content.primaryProjection,
    sourceCanonicalContentHash: canonical.contentHash ?? null,
    sourceProjectionCellSha256: `sha256:${sha256(
      JSON.stringify(sourceProjection),
    )}`,
    resultProjection,
    source: pick(content.source, [
      "title",
      "provider",
      "url",
      "canonicalUrl",
      "observedAt",
    ]),
    minimumInputs: (content.minimumInputs ?? []).map((input) =>
      pick(input, ["key", "label", "type", "required", "source"]),
    ),
    steps: (canonical.steps ?? []).map((step) =>
      pick(step, ["stepId", "title", "order", "itemIds"]),
    ),
    items: (canonical.items ?? []).map((item) =>
      pick(item, [
        "itemId",
        "stepId",
        "title",
        "description",
        "intent",
        "order",
        "completion",
        "schedule",
        "optional",
      ]),
    ),
    sourceRows: (canonical.sourceRows ?? []).map((row) =>
      pick(row, ["rowType", "title", "detail", "order", "group", "original"]),
    ),
    eventSource: content.eventSource ?? null,
    evidenceNotes: Array.isArray(content.evidenceNotes)
      ? content.evidenceNotes
      : content.evidenceNotes
        ? [content.evidenceNotes]
        : [],
  };
}

const sourceById = new Map(
  sourceData.contents.map((content) => [content.contentId, content]),
);
const selectedIds = selection.map((entry) => entry.contentId);
if (new Set(selectedIds).size !== selectedIds.length) {
  throw new Error("Curated selection contains duplicate content IDs");
}

const missingIds = selectedIds.filter((contentId) => !sourceById.has(contentId));
if (missingIds.length) {
  throw new Error(`Missing curated content IDs: ${missingIds.join(", ")}`);
}

const projectedCases = selection.map((entry) =>
  projectContent(sourceById.get(entry.contentId), entry),
);
const selectionId = `sha256:${sha256(JSON.stringify(selection))}`;
const curatedPayload = {
  schemaVersion: "flowme-curated-content-review-v1",
  generatedAt: new Date().toISOString(),
  reviewDate,
  reviewBatch: secondReview ? "other-content-v1" : "representative-v1",
  selectionId,
  sourceCorpusFingerprint: sourceData.corpusFingerprint,
  sourceSha256: `sha256:${sourceSha256}`,
  groups,
  cases: projectedCases,
};

function serializeData(data) {
  const { cases, ...metadata } = data;
  const metadataJson = JSON.stringify(metadata);
  const caseLines = cases.map((content) => JSON.stringify(content));
  return `${metadataJson.slice(0, -1)},"cases":[\n${caseLines.join(
    ",\n",
  )}\n]}`.replaceAll("<", "\\u003c");
}

function htmlDocument(data) {
  const embeddedData = serializeData(data);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" href="data:,">
<title>FlowMe 대표 콘텐츠 검토</title>
<style>
:root{--text:#18181b;--muted:#65656f;--line:#e5e7eb;--surface:#f7f8fa;--blue:#3654ff;--blue-soft:#eef1ff;--good:#16794b;--warn:#9a6200;--bad:#b33636}
*{box-sizing:border-box}
html{background:#fff;color:var(--text)}
body{margin:0;font-family:Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;word-break:keep-all}
button,input,textarea{font:inherit}
button,a{touch-action:manipulation}
button{cursor:pointer}
a{color:inherit}
.app-header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}
.header-inner{max-width:880px;min-height:64px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:14px}
.brand{font-size:18px;font-weight:850;letter-spacing:-.035em}.brand span{color:var(--blue)}
.header-actions{display:flex;align-items:center;gap:8px}
.plain-btn,.icon-btn{min-height:44px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--text);font-weight:720}
.plain-btn{padding:0 14px}.icon-btn{width:44px;padding:0}
main{max-width:880px;margin:0 auto;padding:42px 20px 92px}
.home-intro{max-width:680px}
h1{font-size:42px;line-height:1.14;letter-spacing:-.055em;margin:0}
.lead{font-size:17px;line-height:1.7;color:var(--muted);margin:16px 0 0}
.created{margin:9px 0 0;color:var(--muted);font-size:12px}
.progress-wrap{margin-top:28px}.progress-copy{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--muted)}
.progress{height:7px;margin-top:9px;background:#eceef2;border-radius:999px;overflow:hidden}.progress>span{display:block;height:100%;background:var(--blue);transition:width .2s ease}
.section-heading{display:flex;justify-content:space-between;align-items:end;gap:18px;margin:42px 0 14px}
.section-heading h2{font-size:21px;letter-spacing:-.035em;margin:0}.section-heading p{color:var(--muted);font-size:13px;margin:0}
.case-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.case-card{min-width:0;border:1px solid var(--line);border-radius:14px;padding:18px;background:#fff;display:flex;flex-direction:column;align-items:stretch;text-align:left}
.case-card:hover{border-color:#bcc6ff;background:#fcfcff}
.case-top{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px}
.status{font-weight:760}.status.done{color:var(--good)}.status.modify{color:var(--warn)}.status.hold{color:var(--bad)}
.case-card h3{font-size:18px;line-height:1.35;letter-spacing:-.03em;margin:13px 0 8px}
.case-card p{font-size:14px;line-height:1.55;color:var(--muted);margin:0}
.case-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line);font-size:13px}
.destination{font-weight:760;color:var(--blue)}
.arrow{font-size:18px}
.optional-note{padding:14px 16px;border-radius:12px;background:var(--surface);font-size:13px;line-height:1.55;color:var(--muted);margin-bottom:14px}
.detail-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:28px}
.back{min-height:44px;border:0;background:transparent;padding:0;color:var(--muted);font-weight:720}
.position{font-size:13px;color:var(--muted)}
.detail-head{max-width:730px}
.context{color:var(--blue);font-weight:760;font-size:14px;margin:0 0 10px}
.detail-head h1{font-size:36px}
.job{color:var(--muted);font-size:16px;line-height:1.65;margin:14px 0 0}
.focus{margin-top:24px;padding:18px 20px;border-left:4px solid var(--blue);background:var(--blue-soft);border-radius:0 12px 12px 0}
.focus strong{display:block;font-size:13px;color:var(--blue);margin-bottom:6px}.focus p{font-size:17px;line-height:1.55;margin:0;font-weight:720}
.facts{display:flex;flex-wrap:wrap;gap:9px 18px;margin:18px 0 0;color:var(--muted);font-size:13px}
.facts strong{color:var(--text)}
.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:32px 0 24px;padding:5px;background:var(--surface);border-radius:12px}
.tab{min-height:44px;border:0;border-radius:9px;background:transparent;color:var(--muted);font-weight:750}
.tab[aria-selected="true"]{background:#fff;color:var(--text);box-shadow:0 1px 4px rgba(20,20,25,.08)}
.panel{min-width:0}
.panel h2{font-size:21px;letter-spacing:-.035em;margin:0 0 16px}
.inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:24px}
.input-preview{padding:14px;border:1px solid var(--line);border-radius:11px}
.input-preview span{display:block;color:var(--muted);font-size:12px}.input-preview strong{display:block;margin-top:5px;font-size:14px}
.step-label{margin:23px 0 9px;color:var(--muted);font-size:12px;font-weight:780}
.item-list,.result-list{display:grid;gap:8px}
.item,.result-row{padding:14px 15px;border:1px solid var(--line);border-radius:11px;background:#fff}
.item-title,.result-title{font-size:15px;font-weight:760;line-height:1.45}
.item p,.result-row p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
.item details{margin-top:9px}.item summary{cursor:pointer;color:var(--muted);font-size:12px}
.more{margin-top:10px;border-top:1px solid var(--line)}.more>summary{min-height:48px;display:flex;align-items:center;cursor:pointer;color:var(--blue);font-weight:740}
.more .item-list{padding-top:6px}
.result-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.result-head h2{margin:0}.result-name{color:var(--blue);font-size:13px;font-weight:780}
.preview-note{margin:12px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.calendar-label{font-size:12px;color:var(--blue);font-weight:760;margin-bottom:6px}
.check{display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:start}.check:before{content:"";width:18px;height:18px;margin-top:1px;border:1.5px solid #a9adb7;border-radius:5px}
.todo:before{border-radius:50%}
.result-groups{display:grid;gap:12px}.result-group{padding:15px;border:1px solid var(--line);border-radius:11px}.result-group h3{font-size:14px;margin:0 0 10px}.result-group .result-list{gap:7px}.result-group .result-row{padding:10px 0;border:0;border-top:1px solid var(--line);border-radius:0}.result-group .result-row:first-child{border-top:0}
.sheet-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:11px}
table{width:100%;min-width:560px;border-collapse:collapse;font-size:13px}th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--surface);color:var(--muted);font-size:12px}tr:last-child td{border-bottom:0}
.muted{color:var(--muted);font-size:12px;line-height:1.45}
.memo{padding:20px;border:1px solid var(--line);border-radius:12px}.memo h3{font-size:17px;margin:0 0 12px}.memo p{margin:8px 0;color:var(--muted);font-size:14px;line-height:1.6}
.notice{padding:15px 16px;border-radius:11px;background:#fff8e8;color:#714d00;font-size:13px;line-height:1.55;margin:18px 0}
.source{margin-top:26px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.source>summary{min-height:56px;display:flex;align-items:center;cursor:pointer;font-weight:740}.source-body{padding:0 0 18px;color:var(--muted);font-size:13px;line-height:1.55}.source-body a{color:var(--blue);font-weight:740}.source-rows{margin:12px 0 0;padding-left:20px}.source-rows li{margin:6px 0}
.review-grid{display:grid;gap:18px;margin-top:16px}
.question{border-bottom:1px solid var(--line);padding-bottom:18px}.question strong{display:block;font-size:15px;margin-bottom:10px}
.choices{display:flex;gap:8px;flex-wrap:wrap}.choice{position:relative}.choice input{position:absolute;opacity:0;pointer-events:none}.choice span{display:flex;min-width:72px;min-height:42px;align-items:center;justify-content:center;padding:0 12px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:13px;font-weight:720}.choice input:checked+span{border-color:var(--blue);background:var(--blue-soft);color:var(--blue)}
.verdicts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.verdict{min-height:46px;border:1px solid var(--line);border-radius:10px;background:#fff;font-weight:760}.verdict.selected{border-color:var(--blue);background:var(--blue-soft);color:var(--blue)}
label.note-label{display:block;font-weight:740;font-size:14px;margin-bottom:8px}textarea{width:100%;min-height:110px;resize:vertical;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:16px;line-height:1.5}
.save-next{width:100%;min-height:50px;border:0;border-radius:11px;background:var(--blue);color:#fff;font-weight:800}
.detail-nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:32px}.detail-nav button{min-height:44px;border:1px solid var(--line);border-radius:10px;background:#fff;font-weight:720}.detail-nav button:last-child{grid-column:3}.detail-nav button:disabled{opacity:.35;cursor:default}
.storage-note{display:none;margin:0 auto;max-width:880px;padding:10px 20px;background:#fff8e8;color:#714d00;font-size:12px;line-height:1.45}.storage-note.visible{display:block}
.toast{position:fixed;left:50%;bottom:22px;z-index:30;transform:translate(-50%,20px);padding:11px 15px;border-radius:10px;background:#202127;color:#fff;font-size:13px;opacity:0;pointer-events:none;transition:.2s}.toast.show{opacity:1;transform:translate(-50%,0)}
:focus-visible{outline:3px solid rgba(54,84,255,.35);outline-offset:3px}
@media(max-width:620px){
  .header-inner{padding:0 14px;min-height:58px}.plain-btn{font-size:12px;padding:0 10px}.brand{font-size:17px}
  main{padding:30px 14px 82px}h1{font-size:34px}.lead{font-size:15px}
  .case-list{grid-template-columns:1fr}.section-heading{align-items:start;flex-direction:column;gap:5px;margin-top:34px}
  .case-card{padding:16px}.detail-top{margin-bottom:22px}.detail-head h1{font-size:30px}.job{font-size:15px}
  .focus{padding:15px 16px}.focus p{font-size:16px}.tabs{margin-top:26px}.tab{font-size:13px}
  .inputs{grid-template-columns:1fr}.result-head{align-items:start;flex-direction:column;gap:5px}
  .sheet-wrap{overflow:visible}.sheet-wrap table{min-width:0;table-layout:fixed}.sheet-wrap th:nth-child(3),.sheet-wrap td:nth-child(3),.sheet-wrap th:nth-child(4),.sheet-wrap td:nth-child(4){display:none}.sheet-wrap th:first-child,.sheet-wrap td:first-child{width:50px}.sheet-wrap th,.sheet-wrap td{padding:11px 10px;overflow-wrap:anywhere}
  .verdicts{grid-template-columns:1fr}.verdict{min-height:44px}.detail-nav{grid-template-columns:1fr 1fr}.detail-nav button:last-child{grid-column:2}
}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<header class="app-header">
  <div class="header-inner">
    <div class="brand">FLOW<span>Me</span></div>
    <div class="header-actions">
      <button class="plain-btn" type="button" data-action="export">검토 결과 받기</button>
    </div>
  </div>
  <p id="storageNote" class="storage-note" role="status">이 환경에서는 자동 저장이 되지 않습니다. 검토 결과를 파일로 받아 보관해 주세요.</p>
</header>
<main id="app"></main>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
${dataOpen}${embeddedData}${dataClose}
<script>
"use strict";
const DATA=JSON.parse(document.getElementById("curatedData").textContent);
const CASES=DATA.cases;
const BY_ID=new Map(CASES.map(c=>[c.contentId,c]));
const SIMPLE_REVIEW=DATA.reviewBatch==="other-content-v1";
const STORAGE_KEY="flowme-curated-content-review-"+(DATA.reviewBatch||"v1");
const QUESTIONS=SIMPLE_REVIEW?[]:[
  ["saveValue","링크만 저장하는 것보다 이 결과를 실제로 쓸 이유가 있나요?"],
  ["itemSize","각 행동의 크기가 적당한가요?"],
  ["outputFit","추천한 도구 결과가 가장 자연스러운가요?"],
  ["sourceTrust","원문·개인 설정·주의사항이 구분되어 보이나요?"]
];
let storageAvailable=true;
let state=loadState();

function emptyReview(){return{verdict:null,answers:{},comment:"",updatedAt:null}}
function initialState(){return{schemaVersion:1,selectionId:DATA.selectionId,reviews:Object.fromEntries(CASES.map(c=>[c.contentId,emptyReview()]))}}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(parsed&&parsed.schemaVersion===1&&parsed.selectionId===DATA.selectionId){
      for(const c of CASES)if(!parsed.reviews[c.contentId])parsed.reviews[c.contentId]=emptyReview();
      return parsed
    }
  }catch(error){storageAvailable=false}
  return initialState()
}
function saveState(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true}
  catch(error){storageAvailable=false}
  document.getElementById("storageNote").classList.toggle("visible",!storageAvailable)
}
function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function reviewedCount(){return CASES.filter(c=>state.reviews[c.contentId]?.verdict).length}
function reviewStatus(contentId){
  const verdict=state.reviews[contentId]?.verdict;
  return verdict==="go"?(SIMPLE_REVIEW?"좋음":"Go"):verdict==="modify"?"보완 필요":verdict==="hold"?(SIMPLE_REVIEW?"필요성 모르겠음":"보류"):"미검토"
}
function statusClass(contentId){
  const verdict=state.reviews[contentId]?.verdict;
  return verdict==="go"?"done":verdict==="modify"?"modify":verdict==="hold"?"hold":""
}
function contentHash(contentId,tab){return"#case/"+encodeURIComponent(contentId)+"/"+(tab||(SIMPLE_REVIEW?"result":"content"))}
function route(){
  const hash=location.hash||"#home";
  if(hash==="#home")return{kind:"home"};
  const match=hash.match(/^#case\\/([^/]+)\\/(content|result|review)$/);
  if(!match)return{kind:"home"};
  const contentId=decodeURIComponent(match[1]);
  if(!BY_ID.has(contentId))return{kind:"home"};
  return{kind:"case",contentId,tab:match[2]}
}
function setRoute(hash){if(location.hash===hash)render();else location.hash=hash}
function toast(message){
  const node=document.getElementById("toast");node.textContent=message;node.classList.add("show");
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove("show"),1800)
}
function downloadJson(){
  const payload={schemaVersion:1,selectionId:DATA.selectionId,exportedAt:new Date().toISOString(),reviews:state.reviews};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=SIMPLE_REVIEW?"flowme-other-content-review-v1.json":"flowme-representative-content-review-v1.json";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  toast("검토 결과 파일을 만들었습니다")
}
function renderHome(){
  const done=reviewedCount(),percent=Math.round(done/CASES.length*100);
  const core=CASES.filter(c=>c.presentation.core),optional=CASES.filter(c=>!c.presentation.core);
  const madeOn=String(DATA.reviewDate||"").replace(/^(\\d{4})-(\\d{2})-(\\d{2})$/,"$1. $2. $3.");
  const title=SIMPLE_REVIEW?"다른 콘텐츠 8개를 확인해 주세요":"대표 콘텐츠만 확인해 주세요";
  const lead=SIMPLE_REVIEW?"카드를 열면 도구에서 보일 결과부터 나옵니다. 좋음·보완 필요·필요성 모르겠음 중 하나만 고르면 됩니다.":"기술 정보와 전체 데이터는 숨겼습니다. 각 사례에서 내용, 도구 결과, 내 판단만 차례로 보면 됩니다.";
  const optionalSection=optional.length?'<section><div class="section-heading"><div><h2>경계 사례 · 시간 있으면</h2></div><p>일정 변경과 안전 콘텐츠</p></div><p class="optional-note">기본 검토가 끝난 뒤, 잘못된 일정 생성이나 안전 정보 과장을 막는 방식만 확인하면 됩니다.</p><div class="case-list">'+optional.map(renderCaseCard).join("")+'</div></section>':"";
  return'<section class="home-intro"><h1>'+title+'</h1><p class="lead">'+lead+'</p><p class="created">만든 날짜 · '+esc(madeOn)+'</p><div class="progress-wrap"><div class="progress-copy"><span>'+done+' / '+CASES.length+' 검토</span><span>'+percent+'%</span></div><div class="progress"><span style="width:'+percent+'%"></span></div></div></section>'+renderCaseSection(SIMPLE_REVIEW?"이번 검토 8개":"기본 검토 8개",SIMPLE_REVIEW?"약 15분":"약 30분",core)+optionalSection
}
function renderCaseSection(title,time,cases){
  return'<section><div class="section-heading"><div><h2>'+esc(title)+'</h2></div><p>'+esc(time)+'</p></div><div class="case-list">'+cases.map(renderCaseCard).join("")+'</div></section>'
}
function renderCaseCard(c){
  const index=CASES.indexOf(c)+1;
  return'<button class="case-card" type="button" data-open="'+esc(c.contentId)+'"><span class="case-top"><span>'+index+' · '+esc(c.presentation.groupLabel)+'</span><span class="status '+statusClass(c.contentId)+'">'+reviewStatus(c.contentId)+'</span></span><h3>'+esc(c.title)+'</h3><p>'+esc(c.presentation.focus)+'</p><span class="case-bottom"><span class="destination">'+esc(c.presentation.resultLabel)+'</span><span class="arrow">→</span></span></button>'
}
function renderDetail(c,tab){
  const index=CASES.indexOf(c),source=c.source??{};
  return'<div class="detail-top"><button class="back" type="button" data-route="#home">← 목록</button><span class="position">'+(index+1)+' / '+CASES.length+'</span></div>'+
    '<section class="detail-head"><p class="context">'+esc(c.presentation.groupLabel)+'</p><h1>'+esc(c.title)+'</h1><p class="job">'+esc(c.userJob)+'</p><div class="focus"><strong>이번에 판단할 것</strong><p>'+esc(c.presentation.focus)+'</p></div><div class="facts"><span><strong>추천 결과</strong> · '+esc(c.presentation.resultLabel)+'</span><span><strong>출처</strong> · '+esc(sourceLabel(source))+'</span></div></section>'+ 
    '<div class="tabs" role="tablist" aria-label="검토 단계">'+tabButton(c,"content","내용",tab)+tabButton(c,"result","도구 결과",tab)+tabButton(c,"review","내 판단",tab)+'</div>'+
    '<section class="panel">'+(tab==="content"?renderContent(c):tab==="result"?renderResult(c):renderReview(c))+'</section>'+
    '<div class="detail-nav"><button type="button" data-prev="'+esc(c.contentId)+'" '+(index===0?"disabled":"")+'>이전</button><button type="button" data-next="'+esc(c.contentId)+'" '+(index===CASES.length-1?"disabled":"")+'>다음</button></div>'
}
function tabButton(c,value,label,active){
  return'<button class="tab" type="button" role="tab" aria-selected="'+(active===value)+'" data-route="'+contentHash(c.contentId,value)+'">'+label+'</button>'
}
function renderContent(c){
  const inputs=c.minimumInputs??[];
  return'<h2>실제로 하게 될 내용</h2>'+
    (inputs.length?'<div class="inputs">'+inputs.map(input=>'<div class="input-preview"><span>필요한 입력</span><strong>'+esc(input.label)+(input.required?" · 필수":" · 선택")+'</strong></div>').join("")+'</div>':"")+
    renderItems(c)+
    '<p class="notice">'+esc(c.presentation.caution)+'</p>'+
    renderSource(c)
}
function orderedItems(c){
  const stepOrder=new Map((c.steps??[]).map((step,index)=>[step.stepId,index]));
  return[...(c.items??[])].sort((a,b)=>(stepOrder.get(a.stepId)??999)-(stepOrder.get(b.stepId)??999)||(a.order??0)-(b.order??0))
}
function renderItems(c){
  if(c.eventSource)return renderEventRows(c.eventSource);
  const items=orderedItems(c),visible=items.slice(0,6),rest=items.slice(6);
  if(!items.length)return'<div class="notice">사용자가 회차나 의도를 선택하기 전에는 실행 항목을 만들지 않습니다.</div>';
  return'<div class="item-list">'+visible.map(item=>renderItem(c,item)).join("")+'</div>'+
    (rest.length?'<details class="more"><summary>나머지 '+rest.length+'개 행동 보기</summary><div class="item-list">'+rest.map(item=>renderItem(c,item)).join("")+'</div></details>':"")
}
function stepTitle(c,stepId){return(c.steps??[]).find(step=>step.stepId===stepId)?.title??""}
function renderItem(c,item){
  const schedule=scheduleLabel(item.schedule),done=item.completion?.doneWhen;
  return'<article class="item"><div class="item-title">'+esc(item.title)+'</div>'+(item.description?'<p>'+esc(item.description)+'</p>':"")+
    ((schedule||done)?'<details><summary>일정·완료 기준</summary>'+(schedule?'<p>일정: '+esc(schedule)+'</p>':"")+(done?'<p>완료: '+esc(done)+'</p>':"")+(stepTitle(c,item.stepId)?'<p>묶음: '+esc(stepTitle(c,item.stepId))+'</p>':"")+'</details>':"")+'</article>'
}
function scheduleLabel(schedule){
  if(!schedule)return"";
  if(schedule.mode==="anchor_offset"&&Number.isFinite(schedule.dayOffset))return"D"+(schedule.dayOffset>0?"+":"")+schedule.dayOffset;
  if(schedule.startDate)return[formatDateValue(schedule.startDate),schedule.endDate?formatDateValue(schedule.endDate):""].filter(Boolean).join(" ~ ");
  if(schedule.start)return formatDateValue(schedule.start);
  if(schedule.dueDate)return formatDateValue(schedule.dueDate);
  if(schedule.mode)return schedule.mode.replaceAll("_"," ");
  return""
}
function htmlText(value){return esc(value??"").replaceAll("\\n","<br>")}
function renderResult(c){
  return'<div class="result-head"><h2>도구에서 보일 모습</h2><span class="result-name">'+esc(c.presentation.resultLabel)+'</span></div>'+
    (c.presentation.resultKind==="calendar"?renderCalendar(c):
      c.presentation.resultKind==="sheet"?renderSheet(c):
      c.presentation.resultKind==="todo"?renderChecklist(c,true):
      c.presentation.resultKind==="checklist"?renderChecklist(c,false):
      c.presentation.resultKind==="memo"?renderMemo(c):
      c.presentation.resultKind==="eventHold"?renderEventHold(c):
      renderEvent(c))+
    '<p class="notice">'+esc(c.presentation.caution)+'</p>'
}
function calendarDisplayTitle(c,record){
  const rule=c.presentation.calendarTitle;
  if(!rule)return record.title;
  const context=rule.context||c.title;
  if(rule.mode==="context_only")return context;
  const childId=(record.childItemIds??[])[0];
  const item=(c.items??[]).find(entry=>entry.itemId===childId);
  const step=(c.steps??[]).find(entry=>entry.stepId===item?.stepId);
  const tail=step?.title?.trim();
  if(!tail||tail===context)return context;
  return context+": "+tail
}
function renderCalendar(c){
  const projection=c.resultProjection??{},allRows=projection.preview?.records??projection.output?.records??[],rows=allRows.slice(0,12);
  if(!rows.length)return'<div class="notice">날짜 입력 전에는 일정이 만들어지지 않습니다.</div>';
  const titleNote=c.presentation.calendarTitle?'<p class="preview-note">이전 검토 의견을 반영한 제목 표시안입니다. 날짜와 D-day는 왼쪽에 따로 보입니다.</p>':"";
  return titleNote+'<div class="result-list">'+rows.map(record=>'<article class="result-row"><div class="calendar-label">'+esc(scheduleLabel(record.schedule)||"날짜 선택 필요")+'</div><div class="result-title">'+esc(calendarDisplayTitle(c,record))+'</div>'+(record.detail?'<p>'+htmlText(record.detail)+'</p>':"")+'</article>').join("")+'</div>'+previewNote(rows.length,allRows.length)
}
function renderChecklist(c,todo){
  const output=c.resultProjection?.output??{};
  if(todo){
    const parents=output.parents??[],tasks=output.tasks??[];
    if(!parents.length&&!tasks.length)return'<div class="notice">표시할 할 일이 없습니다.</div>';
    const parentIds=new Set(parents.map(parent=>parent.taskId));
    const groups=parents.map(parent=>renderTaskGroup(parent,tasks.filter(task=>task.parentTaskId===parent.taskId)));
    const ungrouped=tasks.filter(task=>!parentIds.has(task.parentTaskId));
    return'<div class="result-groups">'+groups.join("")+(ungrouped.length?renderTaskGroup({title:"그 밖의 할 일"},ungrouped):"")+'</div>'
  }
  const allGroups=output.groups??[],visible=allGroups.slice(0,6),rest=allGroups.slice(6);
  if(!allGroups.length)return'<div class="notice">표시할 체크리스트가 없습니다.</div>';
  return'<div class="result-groups">'+visible.map(renderChecklistGroup).join("")+'</div>'+
    (rest.length?'<details class="more"><summary>나머지 '+rest.length+'개 묶음 보기</summary><div class="result-groups">'+rest.map(renderChecklistGroup).join("")+'</div></details>':"")
}
function renderTaskGroup(parent,tasks){
  return'<section class="result-group"><h3>'+esc(parent.title||"할 일")+'</h3><div class="result-list">'+tasks.map(task=>'<article class="result-row check todo"><div><div class="result-title">'+esc(task.title)+'</div>'+(task.detail?'<p>'+htmlText(task.detail)+'</p>':"")+'</div></article>').join("")+'</div></section>'
}
function renderChecklistGroup(group){
  return'<section class="result-group"><h3>'+esc(group.title||"체크 항목")+'</h3><div class="result-list">'+(group.entries??[]).map(entry=>'<article class="result-row check"><div><div class="result-title">'+esc(entry.title)+'</div>'+(entry.detail?'<p>'+htmlText(entry.detail)+'</p>':"")+'</div></article>').join("")+'</div></section>'
}
function renderSheet(c){
  const allRows=c.resultProjection?.output?.rows??[],rows=allRows.slice(0,14);
  if(!allRows.length)return'<div class="notice">표시할 표 항목이 없습니다.</div>';
  return'<div class="sheet-wrap"><table><thead><tr><th>순서</th><th>내용</th><th>상태</th><th>일정</th></tr></thead><tbody>'+rows.map((row,index)=>'<tr><td>'+(index+1)+'</td><td>'+esc(row.title)+(row.detail?'<br><span class="muted">'+esc(row.detail)+'</span>':"")+'</td><td>'+esc(statusLabel(row.status))+'</td><td>'+esc(row.start||row.end?[row.start,row.end].filter(Boolean).join(" ~ "):"—")+'</td></tr>').join("")+'</tbody></table></div>'+previewNote(rows.length,allRows.length)
}
function statusLabel(status){return status==="not_started"?"시작 전":status==="in_progress"?"진행 중":status==="done"?"완료":status||"—"}
function previewNote(visible,total){return total>visible?'<p class="preview-note">전체 '+total+'개 중 앞의 '+visible+'개만 미리 봅니다.</p>':""}
function renderMemo(c){
  const sections=c.resultProjection?.output?.sections??[];
  if(!sections.length)return'<div class="notice">표시할 메모가 없습니다.</div>';
  return'<article class="memo"><h3>'+esc(c.title)+'</h3>'+sections.map(section=>'<section><strong>'+esc(section.heading)+'</strong>'+(section.lines??[]).map(line=>'<p>'+esc(String(line).replace(/^- \\[ \\] /,""))+'</p>').join("")+'</section>').join("")+'</article>'
}
function renderEvent(c){
  const records=c.resultProjection?.preview?.records??[];
  if(records.length)return renderProjectionEvents(records);
  return'<div class="notice"><strong>아직 개인 일정으로 저장된 항목은 없습니다.</strong><br>참석할 회차와 실제 배정 정보를 먼저 선택해야 합니다.</div><p class="preview-note">아래는 저장 결과가 아니라 원문에서 확인할 일정입니다.</p>'+renderEventRows(c.eventSource)
}
function renderEventHold(c){
  const records=c.resultProjection?.preview?.records??[];
  return'<div class="notice"><strong>아직 일정으로 저장하지 않습니다.</strong><br>새 회차의 시간과 장소가 다시 확인되어야 합니다.</div>'+renderProjectionEvents(records)
}
function renderProjectionEvents(records){
  if(!records.length)return'<div class="notice">표시할 일정 정보가 없습니다.</div>';
  return'<div class="result-list">'+records.map(record=>'<article class="result-row"><div class="calendar-label">'+esc(eventDate(record.schedule??{}))+(record.status?" · "+esc(eventStatus(record.status)):"")+'</div><div class="result-title">'+esc(eventTitle(record,{}))+'</div></article>').join("")+'</div>'
}
function renderEventRows(eventSource){
  if(!eventSource)return'<div class="notice">표시할 일정 정보가 없습니다.</div>';
  const rows=[...(eventSource.windows??[]),...(eventSource.occurrences??[]),...(eventSource.milestones??[])];
  if(!rows.length)return'<div class="notice">회차를 선택하기 전에는 실행 항목을 만들지 않습니다.</div>';
  return'<div class="result-list">'+rows.map(row=>'<article class="result-row"><div class="calendar-label">'+esc(eventDate(row))+(row.status?" · "+esc(eventStatus(row.status)):"")+'</div><div class="result-title">'+esc(eventTitle(row,eventSource))+'</div>'+(row.locationName?'<p>'+esc(row.locationName)+'</p>':"")+'</article>').join("")+'</div>'
}
function eventTitle(row,eventSource){
  const labels={
    "qnet-written-regular":"필기시험 원서접수",
    "qnet-written-vacancy":"필기시험 빈자리 추가접수",
    "qnet-practical-application":"실기시험 원서접수",
    "qnet-written-result":"필기시험 합격자 발표",
    "qnet-final-result":"최종 합격자 발표"
  };
  const id=row.windowId||row.milestoneId||row.occurrenceId;
  if(labels[id])return labels[id];
  if(row.status==="cancelled")return"취소된 기존 일정";
  if(row.status==="rescheduled")return"변경된 새 일정";
  if(row.action==="result_check")return"결과 확인";
  return row.title||eventSource.edition?.title||eventSource.series?.title||"일정"
}
function eventDate(row){
  const start=row.startDate||row.start||row.windowStart||row.at||row.date;
  const end=row.endDate||row.end||row.windowEnd;
  if(!start)return"날짜 확인 필요";
  return formatDateValue(start)+(end?" ~ "+formatDateValue(end):"")
}
function formatDateValue(value){
  const text=String(value),match=text.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:T(\\d{2}):(\\d{2}))?/);
  if(!match)return text;
  return match[1]+". "+match[2]+". "+match[3]+". "+(match[4]?match[4]+":"+match[5]:"")
}
function eventStatus(status){return status==="cancelled"?"취소됨":status==="rescheduled"?"변경됨":status==="scheduled"?"예정":status}
function renderSource(c){
  const source=c.source??{},rows=(c.sourceRows??[]).slice(0,6),url=source.canonicalUrl||source.url,title=source.title||c.title,label=sourceLabel(source);
  return'<details class="source"><summary>출처와 원문 보기</summary><div class="source-body"><p>'+esc(title)+(label!==title?" · "+esc(label):"")+(source.observedAt?" · "+esc(source.observedAt)+" 확인":"")+'</p>'+(url?'<p><a href="'+esc(url)+'" target="_blank" rel="noreferrer">원문 열기 ↗</a></p>':"")+(rows.length?'<ol class="source-rows">'+rows.map(row=>'<li>'+esc(row.title)+(row.detail&&row.detail!==row.title?" · "+esc(row.detail):"")+'</li>').join("")+'</ol>':"")+'</div></details>'
}
function sourceLabel(source){
  const provider=source.provider||"";
  return provider&&!provider.includes("_")?provider:(source.title||"원문")
}
function renderReview(c){
  const review=state.reviews[c.contentId]??emptyReview();
  const labels=SIMPLE_REVIEW?[["go","좋음"],["modify","보완 필요"],["hold","필요성 모르겠음"]]:[["go","Go"],["modify","수정 필요"],["hold","보류"]];
  return'<h2>내 판단</h2><p class="preview-note">'+(SIMPLE_REVIEW?"느낌에 가장 가까운 하나만 골라 주세요.":"네 가지 질문과 최종 판단을 선택하면 됩니다.")+'</p><div class="review-grid">'+QUESTIONS.map(([key,label])=>'<div class="question"><strong>'+esc(label)+'</strong><div class="choices">'+["yes","unsure","no"].map(value=>'<label class="choice"><input type="radio" name="'+key+'" value="'+value+'" '+(review.answers[key]===value?"checked":"")+'><span>'+(value==="yes"?"예":value==="unsure"?"애매":"아니오")+'</span></label>').join("")+'</div></div>').join("")+
    '<div class="question"><strong>'+(SIMPLE_REVIEW?"어떤가요?":"최종 판단")+'</strong><div class="verdicts">'+labels.map(([value,label])=>'<button class="verdict '+(review.verdict===value?"selected":"")+'" type="button" aria-pressed="'+(review.verdict===value)+'" data-verdict="'+value+'">'+label+'</button>').join("")+'</div></div>'+ 
    '<div><label class="note-label" for="reviewNote">이유 한 줄</label><textarea id="reviewNote" placeholder="이해되지 않거나 바꾸고 싶은 점만 적어 주세요.">'+esc(review.comment)+'</textarea></div>'+
    '<button class="save-next" type="button" data-action="save-next">저장하고 다음</button></div>'
}
function updateReviewFromForm(c){
  const review=state.reviews[c.contentId]??emptyReview();
  for(const [key] of QUESTIONS){const checked=document.querySelector('input[name="'+key+'"]:checked');if(checked)review.answers[key]=checked.value}
  const note=document.getElementById("reviewNote");if(note)review.comment=note.value.trim();
  review.updatedAt=new Date().toISOString();state.reviews[c.contentId]=review;saveState()
}
function render(){
  saveState();
  const current=route(),app=document.getElementById("app");
  if(current.kind==="home")app.innerHTML=renderHome();
  else app.innerHTML=renderDetail(BY_ID.get(current.contentId),current.tab);
  window.scrollTo(0,0)
}
document.addEventListener("click",event=>{
  const target=event.target.closest("button,[data-route]");
  if(!target)return;
  if(target.dataset.action==="export"){downloadJson();return}
  if(target.dataset.route){setRoute(target.dataset.route);return}
  if(target.dataset.open){setRoute(contentHash(target.dataset.open));return}
  const current=route();
  if(current.kind!=="case")return;
  const content=BY_ID.get(current.contentId),index=CASES.indexOf(content);
  if(target.dataset.prev&&index>0){setRoute(contentHash(CASES[index-1].contentId));return}
  if(target.dataset.next&&index<CASES.length-1){setRoute(contentHash(CASES[index+1].contentId));return}
  if(target.dataset.verdict){
    const review=state.reviews[content.contentId]??emptyReview();review.verdict=target.dataset.verdict;review.updatedAt=new Date().toISOString();state.reviews[content.contentId]=review;saveState();render();return
  }
  if(target.dataset.action==="save-next"){
    updateReviewFromForm(content);
    if(QUESTIONS.some(([key])=>!state.reviews[content.contentId].answers[key])){toast("네 가지 질문에 모두 답해 주세요");return}
    if(!state.reviews[content.contentId].verdict){toast("Go·수정 필요·보류 중 하나를 골라 주세요");return}
    toast("판단을 저장했습니다");
    setRoute(index<CASES.length-1?contentHash(CASES[index+1].contentId):"#home")
  }
});
document.addEventListener("change",event=>{
  if(!event.target.matches('.choices input'))return;
  const current=route();if(current.kind!=="case")return;updateReviewFromForm(BY_ID.get(current.contentId))
});
document.addEventListener("input",event=>{
  if(event.target.id!=="reviewNote")return;
  const current=route();if(current.kind!=="case")return;
  const review=state.reviews[current.contentId]??emptyReview();review.comment=event.target.value;state.reviews[current.contentId]=review
});
window.addEventListener("hashchange",render);
if(!location.hash)location.hash="#home";else render();
</script>
</body>
</html>`;
}

const html = htmlDocument(curatedPayload);
const htmlBytes = byteLength(html);
if (htmlBytes > hardFileBytes) {
  throw new Error(
    `Curated review is ${htmlBytes} bytes, above ${hardFileBytes}`,
  );
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, html);

const manifest = {
  schemaVersion: "flowme-curated-content-review-manifest-v1",
  generatedAt: curatedPayload.generatedAt,
  reviewBatch: curatedPayload.reviewBatch,
  selectionId,
  source: {
    path: path.relative(repoRoot, sourcePath).replaceAll(path.sep, "/"),
    bytes: byteLength(sourceHtml),
    sha256: `sha256:${sourceSha256}`,
    corpusFingerprint: sourceData.corpusFingerprint,
  },
  output: {
    path: path.relative(repoRoot, outputPath).replaceAll(path.sep, "/"),
    bytes: htmlBytes,
    sha256: `sha256:${sha256(html)}`,
    hardFileBytes,
  },
  policy: {
    selectedContentCount: projectedCases.length,
    coreReviewCount: projectedCases.filter(
      (content) => content.presentation.core,
    ).length,
    optionalBoundaryCount: projectedCases.filter(
      (content) => !content.presentation.core,
    ).length,
    technicalMetadataHiddenFromDefaultUi: true,
    fullCorpusPreserved: true,
    sourceShaPinned: true,
    actualProjectionResultPreserved: true,
    calendarTitleDisplayCandidateOnly: secondReview,
    simplifiedUserVerdict: secondReview,
    reviewQuestionsRequired: true,
    observedUserValidation: "NOT_RUN",
  },
  cases: projectedCases.map((content) => ({
    contentId: content.contentId,
    title: content.title,
    group: content.presentation.group,
    core: content.presentation.core,
    resultKind: content.presentation.resultKind,
    sourceCanonicalContentHash: content.sourceCanonicalContentHash,
    sourceProjectionCellSha256: content.sourceProjectionCellSha256,
    resultProjectionSha256: `sha256:${sha256(
      JSON.stringify(content.resultProjection),
    )}`,
    curatedPayloadSha256: `sha256:${sha256(JSON.stringify(content))}`,
    counts: {
      step: content.steps.length,
      item: content.items.length,
      sourceRow: content.sourceRows.length,
    },
  })),
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (sha256(fs.readFileSync(sourcePath)) !== sourceSha256) {
  throw new Error("Source Gallery changed while creating curated review");
}

const parsedOutputData = readEmbeddedJson(
  fs.readFileSync(outputPath, "utf8"),
  dataOpen,
);
if (JSON.stringify(parsedOutputData) !== JSON.stringify(curatedPayload)) {
  throw new Error("Embedded curated payload changed during generation");
}

console.log(
  JSON.stringify(
    {
      output: manifest.output.path,
      bytes: htmlBytes,
      sizeKiB: Number((htmlBytes / 1024).toFixed(1)),
      selectedContentCount: projectedCases.length,
      coreReviewCount: manifest.policy.coreReviewCount,
      optionalBoundaryCount: manifest.policy.optionalBoundaryCount,
      sourceSha256,
    },
    null,
    2,
  ),
);
