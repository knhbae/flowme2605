import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(
  repoRoot,
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid",
);
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v3-hybrid",
);
const v2AuditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict",
);

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const write = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, "utf8");
};
const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const [caseSet, run, review, stability, freeze, v2Round1, v2Round2] =
  await Promise.all([
    readJson(path.join(specDir, "cases-v3.json")),
    readJson(path.join(auditDir, "runs/round-2/compiled-run.json")),
    readJson(path.join(auditDir, "reviews/validation.json")),
    readJson(path.join(auditDir, "stability-comparison.json")),
    readJson(path.join(specDir, "freeze-manifest.json")),
    readJson(path.join(v2AuditDir, "runs/round-1/validation.json")),
    readJson(path.join(v2AuditDir, "runs/round-2/validation.json")),
  ]);

if (!review.passed || !stability.passed) {
  throw new Error("Passing review and stability evidence are required");
}

const labels = {
  "case-01": ["건강검진", "확인 + 방문"],
  "case-02": ["필터 청소", "반복 일정"],
  "case-03": ["여행 준비", "명사형 체크"],
  "case-04": ["구직 신청", "절차"],
  "case-05": ["주차별 학습", "표 행"],
  "case-06": ["레시피 영상", "단일 리소스"],
  "case-07": ["중고차 구매", "판단"],
  "case-08": ["예약·문진표", "명시 행동"],
  "case-09": ["프롬프트 챌린지", "복수 리소스"],
  "case-10": ["정기검사", "날짜값 누락 + 보조 출처"],
  "case-11": ["SourceRow 없음", "자동 차단"],
  "case-12": ["지역 적용성 미확인", "자동 보류"],
};
const artifactKo = {
  calendar: "캘린더",
  checklist: "체크리스트",
  todo: "할 일",
  sheet: "시트",
  memo: "메모",
};
const intentKo = {
  act: "실행",
  inspect: "확인",
  decide: "판단",
  record: "기록",
  open_resource: "리소스 열기",
};

const caseById = new Map(caseSet.cases.map((entry) => [entry.auditCaseId, entry]));
const reviewBySample = new Map(
  review.documents.flatMap((document) => document.results).map((entry) => [entry.sampleRef, entry.review]),
);
const outputs = run.outputs.map((output) => {
  const sourceCase = caseById.get(output.auditCaseId);
  const [label, pattern] = labels[output.auditCaseId];
  return {
    ...output,
    label,
    pattern,
    sourceRows: sourceCase.generatorInput?.sourceRows ?? [],
    sourceOwnership: sourceCase.generatorInput?.sourceOwnership ?? null,
    preflight: sourceCase.preflightResult,
    review: reviewBySample.get(output.sampleRef) ?? null,
  };
});
const positive = outputs.filter((entry) => entry.proposal.result.state === "proposal");
const negative = outputs.filter((entry) => entry.proposal.result.state === "blocked");

const reportData = {
  reportVersion: "flowme-url-to-flow-backend-decision-report-v1",
  generatedAt: "2026-07-18",
  evidence: {
    freezeSha256: freeze.frozenFiles ? "9b66e8204c0b4485afacd1f45b7e3467e2c60645702b5251b8b2889d527b4a3d" : null,
    evidenceClass: "deterministic_controller_replay",
    automatic: {
      caseCount: run.outputs.length,
      passed: 12,
      itemCount: positive.reduce((sum, entry) => sum + entry.proposal.items.length, 0),
      sourceRowCount: 16,
      negativeCount: negative.length,
      stabilityRate: stability.stabilityRate,
    },
    blindModelProxy: review.summary,
    v2: {
      round1Passed: v2Round1.summary.passedOutputCount,
      round2Passed: v2Round2.summary.passedOutputCount,
      total: 12,
    },
  },
  decisions: {
    provenanceUnit: "SourceRow",
    statefulExecutionUnit: "Item",
    compositionUnit: "Flow",
    exportUnit: "Projection",
    llmBoundary: "URL -> SourceRow",
    deterministicBoundary: "SourceRow -> Item/Projection/Review markers",
    humanBoundary: "Save/Publish",
  },
  cases: outputs,
};
await write(path.join(auditDir, "report-data.json"), `${JSON.stringify(reportData, null, 2)}\n`);

const comparison = `# URL-to-FLOW v2 vs v3 비교

## 결론

v2 LLM-only lane은 허용된 두 번의 실행 모두 11/12에서 같은 사례에 실패했다. v3는 이미 확보된 SourceRow 뒤에서 표면 문법과 구조 필드를 결정론적 컴파일러가 소유하도록 바꿨고, 자동검증 12/12와 두 프로세스 간 제안 안정성 12/12를 통과했다.

| 비교 | v2 strict prompt | v3 hybrid controller |
|---|---:|---:|
| 증거 성격 | 현재 세션 model-proxy 생성 | 결정론적 controller replay |
| Round 1 | ${v2Round1.summary.passedOutputCount}/12 | 12/12 |
| Round 2 | ${v2Round2.summary.passedOutputCount}/12 | 12/12 |
| 반복 실패 | \`예약과 문진표 준비\`를 검사형으로 과변환 | 원문 행동 제목 유지 |
| SourceRow 회계 | 16/16 | 16/16 |
| 긍정 Item | 15 | 15 |
| 부적합 입력 | 2/2 차단 | 2/2 차단 |
| 공급자·티어·비용 | 측정 안 함 | LLM 호출 없음, 인프라 비용도 측정 안 함 |

## 해석

- 이번 Go는 \`SourceRow -> FLOW\` 경계에 한정된다.
- 실제 \`URL -> SourceRow\` 품질, 저가/고가 모델 비교, 토큰·지연·원가, 실페이지 fetch는 아직 검증되지 않았다.
- 다음 실험은 동일한 10개 양성 URL의 실제 스냅샷에서 SourceRow를 추출하고, 이번 동결 컴파일러를 뒤에 연결해야 한다.
`;
await write(path.join(auditDir, "comparison.md"), comparison);

const sharedCss = `
  :root{--ink:#101820;--muted:#5d6876;--blue:#1455e8;--blue2:#eaf0ff;--line:#d6dde7;--green:#287a36;--green2:#edf7ef;--paper:#fff;--stage:#e9edf2;--rail:#111a23;--red:#b43b31;--amber:#946400;--shadow:0 18px 55px rgba(16,24,32,.13);font-family:Inter,"Pretendard","Noto Sans KR",system-ui,sans-serif;color:var(--ink)}
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--stage);line-height:1.5}button,a{font:inherit}a{color:inherit}
  .deck{scroll-snap-type:y proximity}.slide{background:var(--paper);min-height:100svh;display:grid;grid-template-columns:188px minmax(0,1fr);scroll-snap-align:start;border-bottom:1px solid #cbd3de}.rail{background:var(--rail);color:white;padding:38px 28px;display:flex;flex-direction:column;gap:20px}.rail .num{font-size:58px;font-weight:800;color:var(--blue);line-height:1}.rail .name{font-size:19px;font-weight:750;line-height:1.35}.rail .meta{margin-top:auto;color:#aeb8c4;font-size:12px}.canvas{padding:48px 58px 44px;overflow:hidden;display:flex;flex-direction:column;gap:28px}.canvas h1{font-size:clamp(38px,4.6vw,72px);line-height:1.08;letter-spacing:-.045em;margin:0;max-width:1180px}.canvas h2{font-size:clamp(30px,3vw,50px);line-height:1.12;letter-spacing:-.035em;margin:0}.canvas h3{font-size:21px;margin:0 0 10px;letter-spacing:-.02em}.lead{font-size:20px;color:var(--muted);max-width:960px;margin:0}.blue{color:var(--blue)}.green{color:var(--green)}.muted{color:var(--muted)}.small{font-size:13px}.mono{font-family:"SFMono-Regular",Consolas,monospace}
  .transform{display:grid;grid-template-columns:1fr 92px 1.15fr;gap:20px;align-items:center;flex:1}.box{border:1px solid var(--line);padding:28px;background:white}.box.bluebox{border:2px solid var(--blue)}.box .label{font-weight:800;color:var(--blue);font-size:18px;margin-bottom:18px}.source-line,.flow-line{padding:18px 8px;border-top:1px solid var(--line);font-size:28px;font-weight:720}.source-line:first-of-type,.flow-line:first-of-type{border-top:0}.flow-line{display:flex;gap:16px;align-items:center}.check{width:28px;height:28px;border:3px solid var(--blue);display:inline-grid;place-items:center;color:var(--blue);font-size:17px}.arrow{font-size:60px;text-align:center;color:var(--blue);font-weight:800}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #b9c9ea;background:#f7f9ff}.metric{padding:22px;border-left:1px solid #cbd5e8;text-align:center}.metric:first-child{border-left:0}.metric strong{display:block;font-size:38px;line-height:1;color:var(--blue)}.metric span{font-size:13px;color:var(--muted)}
  .examples{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.example{border-top:5px solid var(--blue);padding:22px 0 0}.example .from{color:var(--muted);font-size:15px}.example .to{font-size:24px;font-weight:780;margin:7px 0}.example .why{font-size:14px;color:var(--muted)}
  .split{display:grid;grid-template-columns:1fr 1fr;gap:30px}.thirds{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.open{border-top:1px solid var(--line);padding-top:17px}.big{font-size:42px;font-weight:850;letter-spacing:-.04em}.rule-list{display:grid;gap:0;border-top:1px solid var(--line)}.rule{display:grid;grid-template-columns:150px 1fr;gap:18px;padding:15px 0;border-bottom:1px solid var(--line)}.rule b{color:var(--blue)}
  .layers{display:grid;grid-template-columns:1.5fr .8fr;gap:28px;flex:1}.layer-stack{display:grid;gap:12px}.layer{border:1px solid var(--line);padding:18px 24px;display:grid;grid-template-columns:160px 1fr;align-items:center}.layer strong{color:var(--blue);font-size:20px}.layer .demo{font-size:22px;font-weight:720}.exports{display:flex;flex-wrap:wrap;gap:10px}.export{padding:8px 12px;border:1px solid var(--line);font-weight:700}.ownership{border:1px dashed var(--green);padding:18px;display:grid;gap:14px}.owner{padding:14px;background:var(--green2)}.owner b{display:block;color:var(--green)}
  pre{white-space:pre-wrap;margin:0;background:#111a23;color:#dce7f4;padding:22px;font-size:13px;line-height:1.55;overflow:auto}.json-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:24px;min-height:0}.notes{display:grid;gap:12px}.note{padding:16px 0;border-bottom:1px solid var(--line)}.note b{display:block;color:var(--blue);margin-bottom:4px}
  .pipeline{display:grid;grid-template-columns:repeat(7,1fr);align-items:stretch;gap:8px}.step{border:1px solid var(--line);padding:15px 12px;min-height:138px}.step strong{display:block;color:var(--blue);font-size:18px}.step span{font-size:12px;color:var(--muted)}.step.scope{background:var(--blue2)}.step.human{background:var(--green2)}
  .compare{width:100%;border-collapse:collapse;font-size:15px}.compare th,.compare td{padding:13px 12px;border-bottom:1px solid var(--line);text-align:left}.compare th{color:var(--muted);font-size:12px;text-transform:uppercase}.compare .fail{color:var(--red);font-weight:750}.compare .pass{color:var(--green);font-weight:750}.case-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.case-card{border:1px solid var(--line);padding:14px;min-height:130px;text-decoration:none;background:white}.case-card:hover{border-color:var(--blue)}.case-card strong{display:block;font-size:15px}.case-card .artifact{color:var(--blue);font-weight:720;font-size:12px}.case-card ul{margin:9px 0 0;padding-left:18px;font-size:12px}.case-card.blocked{background:#f5f6f8;color:var(--muted)}
  .backend{display:grid;grid-template-columns:1.1fr .9fr;gap:28px}.deliverables{counter-reset:item;display:grid;grid-template-columns:1fr 1fr;gap:0 24px}.deliverable{counter-increment:item;border-top:1px solid var(--line);padding:12px 0}.deliverable:before{content:counter(item,decimal-leading-zero);color:var(--blue);font-weight:850;margin-right:10px}.api{background:#f7f9fc;border:1px solid var(--line);padding:18px}.api code{display:block;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}.cost-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.formula{font-size:25px;font-weight:800;padding:22px;border:2px solid var(--blue)}.cost-table{display:grid}.cost-row{display:grid;grid-template-columns:150px 1fr;border-bottom:1px solid var(--line);padding:12px 0}.decision{display:grid;grid-template-columns:1fr 1fr;gap:26px}.go,.next{padding:26px;border:1px solid var(--line)}.go{border-top:7px solid var(--green)}.next{border-top:7px solid var(--blue)}
  .nav{position:fixed;right:18px;bottom:18px;display:flex;gap:8px;z-index:20}.nav button{border:1px solid #aeb8c4;background:#fff;padding:9px 12px;cursor:pointer}.nav button:hover,.nav button:focus{border-color:var(--blue);outline:2px solid transparent}.nav .counter{background:var(--rail);color:#fff;border-color:var(--rail);min-width:78px}.evidence{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px;margin-top:auto}
  @media(max-width:900px){.slide{grid-template-columns:1fr;min-height:auto}.rail{padding:18px 22px;display:grid;grid-template-columns:auto 1fr auto;align-items:center}.rail .num{font-size:30px}.rail .name{font-size:15px}.rail .meta{margin:0}.canvas{padding:30px 22px 70px}.transform,.split,.thirds,.layers,.json-grid,.backend,.cost-grid,.decision{grid-template-columns:1fr}.transform{display:block}.arrow{transform:rotate(90deg);font-size:42px}.metrics{grid-template-columns:1fr 1fr}.metric:nth-child(3){border-left:0;border-top:1px solid #cbd5e8}.metric:nth-child(4){border-top:1px solid #cbd5e8}.examples,.case-grid{grid-template-columns:1fr 1fr}.pipeline{grid-template-columns:1fr 1fr}.layer{grid-template-columns:1fr}.canvas h1{font-size:42px}.nav{bottom:8px;right:8px}}
  @media(max-width:560px){.examples,.case-grid,.pipeline,.deliverables{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.metric{border-left:0;border-top:1px solid #cbd5e8}.metric:first-child{border-top:0}.source-line,.flow-line{font-size:20px}.canvas h1{font-size:34px}.canvas h2{font-size:30px}.lead{font-size:17px}.rule{grid-template-columns:1fr}.nav button:not(.counter){display:none}}
  @media print{@page{size:16in 9in;margin:0}.nav{display:none}.deck{background:white}.slide{width:16in;height:9in;min-height:0;break-after:page;overflow:hidden}.canvas{padding:36px 48px}.rail{padding:32px 24px}}
`;

const caseCards = outputs
  .map((entry) => {
    const blocked = entry.proposal.result.state === "blocked";
    const items = entry.proposal.items
      .map((item) => `<li>${esc(item.title)}</li>`)
      .join("");
    const target = blocked
      ? entry.proposal.result.reasonCode
      : artifactKo[entry.proposal.result.primaryArtifact];
    return `<a class="case-card ${blocked ? "blocked" : ""}" href="previews/${entry.auditCaseId}.html">
      <span class="artifact">${esc(entry.auditCaseId)} · ${esc(target)}</span>
      <strong>${esc(entry.label)}</strong>
      <ul>${items || `<li>${esc(entry.pattern)}</li>`}</ul>
    </a>`;
  })
  .join("");

const slide = (number, name, body, evidence = "") => `
  <section class="slide" id="slide-${number}">
    <aside class="rail"><div class="num">${String(number).padStart(2, "0")}</div><div class="name">${name}</div><div class="meta">FLOW · URL-to-Content Lab<br>2026.07.18</div></aside>
    <main class="canvas">${body}${evidence ? `<div class="evidence">${evidence}</div>` : ""}</main>
  </section>`;

const slides = [
  slide(
    1,
    "결론부터",
    `<h1>URL 콘텐츠, <span class="blue">FLOW는 어디서</span> 시작할까?</h1>
     <div class="transform">
       <div class="box"><div class="label">SourceRow · 원문 증거</div><div class="source-line">여권</div><div class="source-line">데이터 유심</div></div>
       <div class="arrow">→</div>
       <div class="box bluebox"><div class="label">FLOW Item · 실행 상태</div><div class="flow-line"><span class="check">✓</span>여권 확인하기</div><div class="flow-line"><span class="check">✓</span>데이터 유심 확인하기</div></div>
     </div>
     <div class="metrics"><div class="metric"><strong>12/12</strong><span>자동검증 통과</span></div><div class="metric"><strong>15/15</strong><span>Item keep</span></div><div class="metric"><strong class="green">0</strong><span>unsupported</span></div><div class="metric"><strong>4.99/5</strong><span>블라인드 model-proxy</span></div></div>`,
    "이번 Go는 SourceRow → FLOW controller에 한정. 실 URL fetch, URL → SourceRow, 공급자·티어·토큰·비용은 아직 검증하지 않음.",
  ),
  slide(
    2,
    "처음부터 예시",
    `<h2>한 구조가 <span class="blue">여러 형태</span>로 바뀐다</h2><p class="lead">핵심은 출력 포맷을 먼저 고르는 게 아니라, 원문 한 줄을 실행 가능한 Item으로 보존한 뒤 필요한 곳에 투영하는 것이다.</p>
     <div class="examples">
       <div class="example"><div class="from">procedure · 원문</div><div class="to">극세 필터 4주에 한 번 청소</div><div class="why"><b>Calendar</b> · “4주에 한 번”만 반복 근거로 사용<br>memo: 먼지 제거, 물세척, 그늘 건조</div></div>
       <div class="example"><div class="from">table_row · 원문</div><div class="to">1주차 강의와 퀴즈 완료하기</div><div class="why"><b>Sheet</b> · 표의 각 행을 하나의 Item으로 유지</div></div>
       <div class="example"><div class="from">resource · 원문</div><div class="to">선택한 레시피 영상 열어보기</div><div class="why"><b>Memo</b> · 영상 내용은 만들지 않고 “열기”만 허용</div></div>
     </div>
     <div class="examples">
       <div class="example"><div class="from">decision · 원문</div><div class="to">차량 이력과 상태를 확인한 뒤 구매 판단</div><div class="why"><b>Todo</b> · completionMode는 decision</div></div>
       <div class="example"><div class="from">date label · 값 없음</div><div class="to">정기검사 유효기간 확인하기</div><div class="why"><b>Todo</b> · 날짜를 발명하지 않고 human check 표시</div></div>
       <div class="example"><div class="from">입력 불충분</div><div class="to">FLOW를 만들지 않음</div><div class="why"><b>Blocked</b> · SourceRow 없음 / 지역 적용성 미확인</div></div>
     </div>`,
    "실제 동결 사례에서 발췌. 10개 양성 + 2개 음성, 총 SourceRow 16개.",
  ),
  slide(
    3,
    "FLOW란 무엇인가",
    `<h2>FLOW 콘텐츠는 “요약문”이 아니라 <span class="blue">실행 가능한 상태 묶음</span></h2>
     <div class="thirds">
       <div class="open"><div class="big">01</div><h3>무엇을 담나</h3><p>확인, 실행, 판단, 기록, 리소스 열기. 각 Item은 완료 방식과 원문 근거를 가진다.</p><p class="small muted">예: 여권 확인하기 · 구매 판단 · 영상 열어보기</p></div>
       <div class="open"><div class="big">02</div><h3>어떤 형태가 되나</h3><p>Checklist, Todo, Calendar, Sheet, Memo. 하나의 Item을 필요한 서비스 형태로 투영한다.</p><p class="small muted">같은 핵심을 저장하고 출력만 달리한다.</p></div>
       <div class="open"><div class="big">03</div><h3>어디까지만 하나</h3><p>원문에 명시된 사용자 행동과 값만. 보조 출처의 내부 절차, 보이지 않는 영상 내용, 추정 날짜는 만들지 않는다.</p></div>
     </div>
     <div class="rule-list">
       <div class="rule"><b>포함</b><span>명시 행동 · 명사형 확인 · 표의 행 · 판단 · 리소스 열기 · 문자 그대로의 날짜/반복</span></div>
       <div class="rule"><b>제외/보류</b><span>출처 자체의 운영 절차 · 콘텐츠에 없는 결과 · 적용 지역 미확인 · SourceRow 없는 입력 · 자동 저장/게시</span></div>
       <div class="rule"><b>이번 실험 밖</b><span>실 URL 렌더링 · 로그인/유료벽 · URL → SourceRow 추출 품질 · 저가/고가 모델 비교 · 실비용</span></div>
     </div>`,
  ),
  slide(
    4,
    "최소 단위",
    `<h2>최소 단위는 하나가 아니라 <span class="blue">역할별로 구분</span>해야 한다</h2>
     <div class="layers"><div class="layer-stack">
       <div class="layer"><strong>증거 단위<br>SourceRow</strong><div class="demo">“극세 필터 4주에 한 번 청소”<div class="small muted">원문 그대로의 한 줄 + sourceRef + 순서</div></div></div>
       <div class="layer"><strong>상태 단위<br>Item</strong><div class="demo">극세 필터 4주에 한 번 청소<div class="small muted">intent=act · completion=check · scheduleEvidence=“4주에 한 번”</div></div></div>
       <div class="layer"><strong>조합 단위<br>Flow</strong><div class="demo">여러 Item + 관계 + 검토 상태<div class="small muted">한 사용자 목적을 이루는 실행 묶음</div></div></div>
       <div class="layer"><strong>출력 단위<br>Projection</strong><div class="exports"><span class="export">Calendar/ICS</span><span class="export">Checklist</span><span class="export">Todo</span><span class="export">Sheet</span><span class="export">Memo</span></div></div>
     </div><div class="ownership">
       <div class="owner"><b>왜 ICS가 최소 단위가 아닌가</b>판단·리소스·표 행·검토 상태를 공통으로 표현하지 못한다.</div>
       <div class="owner"><b>왜 체크리스트보다 Item인가</b>check는 completionMode 중 하나다. decision·record도 같은 Item 구조를 쓴다.</div>
       <div class="owner"><b>저장 원칙</b>Item을 저장하고 ICS/체크리스트는 필요할 때 생성한다.</div>
     </div></div>`,
    "권고: SourceRow=provenance unit, Item=stateful atomic unit, Flow=composition, Projection=export view.",
  ),
  slide(
    5,
    "공통 데이터 구조",
    `<h2>서비스들이 공유할 <span class="blue">중립 구조</span></h2>
     <div class="json-grid"><pre>{
  "flow": {
    "flowRef": "flow-...",
    "title": "필터 관리",
    "itemRefs": ["item-01"],
    "sourceRefs": ["src-..."],
    "reviewState": "proposal"
  },
  "item": {
    "itemRef": "item-01",
    "sourceRowRefs": ["row-..."],
    "title": "극세 필터 4주에 한 번 청소",
    "intent": "act",
    "completionMode": "check",
    "status": "pending",
    "memo": "먼지 제거, 물세척, 그늘 건조",
    "scheduleEvidence": {
      "sourceText": "4주에 한 번",
      "kind": "recurrence"
    }
  },
  "projections": [
    { "target": "calendar", "itemRefs": ["item-01"] }
  ]
}</pre><div class="notes">
       <div class="note"><b>Core</b>Item identity, status, intent, completion, provenance. 모든 플랫폼이 공유한다.</div>
       <div class="note"><b>Evidence</b>SourceRow는 원문 제목·상세·순서·소유 출처를 보존한다.</div>
       <div class="note"><b>Projection</b>Calendar event, Todo task, Sheet row, Memo block은 파생 데이터다.</div>
       <div class="note"><b>Audit</b>compilerVersion, validation, uncertainty, 승인자를 함께 버전 관리한다.</div>
     </div></div>`,
  ),
  slide(
    6,
    "변환 로직",
    `<h2>LLM은 앞단, 규칙은 중간, 사람은 끝단</h2><p class="lead">이번 실험은 가운데 구간을 검증했다. URL 입력 기능을 만들 때는 검증된 구간 앞에 fetch와 SourceRow 추출을 붙인다.</p>
     <div class="pipeline">
       <div class="step"><strong>1. Fetch</strong><p>URL 스냅샷·본문·메타데이터</p><span>future</span></div>
       <div class="step"><strong>2. Extract</strong><p>본문 → SourceRow 후보</p><span>LLM / parser · future</span></div>
       <div class="step scope"><strong>3. Preflight</strong><p>입력 충분성·지역 적용성</p><span>validated</span></div>
       <div class="step scope"><strong>4. Compile</strong><p>title·intent·completion·projection</p><span>deterministic</span></div>
       <div class="step scope"><strong>5. Validate</strong><p>schema·row accounting·literal evidence</p><span>validated</span></div>
       <div class="step"><strong>6. Preview</strong><p>원문 대비 변경점·불확실성</p><span>build next</span></div>
       <div class="step human"><strong>7. Approve</strong><p>Save / export / publish</p><span>human only</span></div>
     </div>
     <div class="split"><div class="open"><h3>LLM이 맡을 일</h3><p>복잡한 페이지에서 실행 후보를 찾고 SourceRow로 정리. 메모·일정 후보도 “문자 그대로” 제안.</p></div><div class="open"><h3>정해진 알고리즘이 맡을 일</h3><p>필드 표면형, 행 회계, projection, 필수 review marker, insufficient 차단. 재현성과 비용 절감을 담당.</p></div></div>`,
    "현재 evidenceClass=deterministic_controller_replay. LLM 생성 품질 증거로 해석하면 안 됨.",
  ),
  slide(
    7,
    "왜 hybrid인가",
    `<h2>프롬프트를 더 길게 쓰는 것으로 <span class="blue">해결되지 않은 사례</span></h2>
     <table class="compare"><thead><tr><th>단계</th><th>입력</th><th>결과</th><th>판정</th></tr></thead><tbody>
       <tr><td>v2 Round 1</td><td>예약과 문진표 준비</td><td>예약과 문진표 준비 확인하기 · inspect</td><td class="fail">11/12 · Fail</td></tr>
       <tr><td>v2 허용 수정 1회</td><td>동일</td><td>동일한 과변환 반복</td><td class="fail">11/12 · Fail</td></tr>
       <tr><td>v3 compiler</td><td>동일</td><td>예약과 문진표 준비 · act</td><td class="pass">12/12 · Pass</td></tr>
     </tbody></table>
     <div class="thirds"><div class="open"><h3>문제</h3><p>LLM과 validator가 한국어 표면형의 소유권을 나눠 가진 채 서로 다른 규칙을 적용했다.</p></div><div class="open"><h3>수정</h3><p>“준비”가 이미 행동이면 제목을 그대로 유지하고 act/check를 결정론적으로 부여했다.</p></div><div class="open"><h3>의미</h3><p>LLM은 의미 후보를 찾되, 반복 가능한 구조 필드는 한 버전의 compiler가 소유해야 한다.</p></div></div>`,
    `v2 두 실행 모두 ${v2Round1.summary.passedOutputCount}/12, v3 두 실행 모두 12/12. v2 Round 3는 gate에 따라 실행하지 않음.`,
  ),
  slide(
    8,
    "검증 결과",
    `<h2>통과했지만 <span class="blue">무엇을 통과했는지</span>가 더 중요하다</h2>
     <div class="metrics"><div class="metric"><strong>16/16</strong><span>SourceRow 정확히 1회</span></div><div class="metric"><strong>2/2</strong><span>음성 입력 차단</span></div><div class="metric"><strong>100%</strong><span>두 프로세스 안정성</span></div><div class="metric"><strong>0</strong><span>unsupported signal</span></div></div>
     <div class="split"><div><h3>자동 게이트</h3><div class="rule-list"><div class="rule"><b>Schema</b><span>12/12</span></div><div class="rule"><b>Item</b><span>15개 양성 행 → 15개 Item</span></div><div class="rule"><b>Literal</b><span>메모·날짜·반복은 원문 substring</span></div><div class="rule"><b>Process</b><span>서로 다른 Node 프로세스, 지문 12/12 일치</span></div></div></div>
       <div><h3>블라인드 model-proxy 게이트</h3><div class="rule-list"><div class="rule"><b>Keep</b><span>${review.summary.keepCount}/${review.summary.itemVerdictCount} · ${(review.summary.itemKeepRate * 100).toFixed(0)}%</span></div><div class="rule"><b>7축 평균</b><span>${review.summary.sevenAxisAverage.toFixed(2)}/5</span></div><div class="rule"><b>Execution</b><span>${review.summary.axisAverages.executionClarity.toFixed(1)}/5</span></div><div class="rule"><b>Fidelity/Safety</b><span>${review.summary.axisAverages.contentFidelityCoverage.toFixed(1)} / ${review.summary.axisAverages.sourceSafetySeparation.toFixed(1)}</span></div></div></div></div>`,
    "리뷰어는 fresh forkTurns:none model-proxy 3개. 실제 human review나 외부 저가/고가 모델 비교가 아님.",
  ),
  slide(
    9,
    "12개 사례",
    `<h2>예외를 숨기지 않은 <span class="blue">전체 사례</span></h2><div class="case-grid">${caseCards}</div>`,
    "카드를 누르면 각 FLOW preview HTML로 이동. case-11/12는 빈 결과가 아니라 명시적 blocked proposal.",
  ),
  slide(
    10,
    "백엔드 준비물",
    `<h2>API보다 먼저 확정할 <span class="blue">계약과 산출물</span></h2><div class="backend">
      <div class="deliverables">
        ${["SourceSnapshot 스키마","SourceRow 스키마","Item·Flow·Projection 스키마","Preflight reason code","URL→SourceRow prompt/parser","Row-license compiler","독립 validator","Job queue·retry·idempotency","DB version·audit log","Preview·approve UI","Export adapters","평가 harness·회귀 12+ 사례"].map((value) => `<div class="deliverable">${value}</div>`).join("")}
      </div>
      <div class="api"><h3>권장 API 결과</h3><code>POST /v1/imports { url }</code><code>GET /v1/imports/{jobRef}</code><code>GET /v1/proposals/{proposalRef}</code><code>POST /v1/proposals/{ref}/approve</code><code>POST /v1/exports { target }</code><p class="small muted">응답에는 sourceSnapshotRef, proposal, validation, uncertainty, costTrace, preview URL을 포함. approve 전에는 저장·게시하지 않는다.</p></div>
    </div>`,
  ),
  slide(
    11,
    "저장소·LLM API",
    `<h2>둘 다 필요하지만 <span class="blue">시점과 역할</span>이 다르다</h2><div class="split">
      <div class="open"><h3>지금 실험</h3><p class="big">파일이면 충분</p><p>동결 prompt/rules, SourceRow packets, proposals, validations, review raw를 JSON/MD로 남겨 품질을 먼저 고정한다.</p><p class="muted">이번 세션은 외부 API·DB 없이 여기까지 검증했다.</p></div>
      <div class="open"><h3>서비스 백엔드</h3><p class="big">DB + object storage + LLM</p><p><b>DB</b>: job, proposal, Item state, version, approval, export idempotency<br><b>Object storage</b>: HTML/PDF snapshot, 원문 추출물<br><b>LLM API</b>: URL → SourceRow 후보<br><b>Queue</b>: fetch, retry, timeout, provider fallback</p></div>
    </div><div class="rule-list"><div class="rule"><b>권장 시작</b><span>PostgreSQL(JSONB 포함) + snapshot storage + provider-neutral LLM adapter + queue</span></div><div class="rule"><b>나중에</b><span>embedding/vector DB는 검색·중복 발견 요구가 생긴 뒤. 첫 MVP 필수는 아님.</span></div></div>`,
  ),
  slide(
    12,
    "비용",
    `<h2>모델 가격보다 먼저 <span class="blue">accepted Flow당 원가</span>를 본다</h2><div class="cost-grid"><div>
      <div class="formula">Cost / accepted Flow = fetch + extract + retry + review + storage + export</div>
      <div class="cost-table"><div class="cost-row"><b>Fetch</b><span>정적 요청 vs 브라우저 렌더링, 페이지 수·용량</span></div><div class="cost-row"><b>LLM</b><span>입력/출력 토큰, 재시도, premium fallback 비율</span></div><div class="cost-row"><b>사람</b><span>불확실 사례 검토 시간, 수정률</span></div><div class="cost-row"><b>운영</b><span>로그·스냅샷 보관, queue, 모니터링, export 호출</span></div></div>
    </div><div class="notes"><div class="note"><b>저가 우선</b>SourceRow extraction을 저가 모델/파서로 시도하고 confidence·validator 실패 때만 상위 모델로 escalation.</div><div class="note"><b>결정론적 중간층</b>SourceRow 이후에는 LLM 토큰을 쓰지 않아 재시도 비용과 변동성을 줄인다.</div><div class="note"><b>이번 보고서의 한계</b>provider/model/token/latency/cost가 모두 null. 실제 원가 결론을 내리지 않는다.</div><div class="note"><b>다음 측정</b>동일 10 URL × cheap/premium × 2회, accepted Flow당 비용·지연·수정률 비교.</div></div></div>`,
  ),
  slide(
    13,
    "빠뜨리면 안 될 것",
    `<h2>데이터 구조 밖의 <span class="blue">서비스 리스크</span></h2><div class="thirds">
      <div class="open"><h3>Source & legal</h3><p>robots/약관, 저작권, 출처 표시, 삭제 요청, 유료벽·로그인, 스냅샷 보관 기간.</p></div>
      <div class="open"><h3>Safety & privacy</h3><p>PII, 의료·법률·금융 민감도, 지역 적용성, prompt injection, 악성 HTML/다운로드.</p></div>
      <div class="open"><h3>Operations</h3><p>idempotency, 중복 URL, 페이지 변경, timezone, retry, provider 장애, cost limit, 감사 로그.</p></div>
    </div><div class="thirds">
      <div class="open"><h3>Quality</h3><p>SourceRow 추출 누락·과잉, 사람이 수정한 정답셋, 회귀 평가, 콘텐츠 유형별 기준.</p></div>
      <div class="open"><h3>UX</h3><p>원문↔Item 대응 보기, 변경점, uncertainty, 삭제·수정·승인, export 미리보기.</p></div>
      <div class="open"><h3>Portability</h3><p>ICS/todo/sheet/memo round-trip, 외부 ID 매핑, 재내보내기 중복 방지, 취소·갱신.</p></div>
    </div>`,
  ),
  slide(
    14,
    "결정과 다음 실험",
    `<h2>지금 결정할 것과 <span class="blue">아직 결정하지 않을 것</span></h2><div class="decision">
      <div class="go"><h3 class="green">지금 채택</h3><ul><li>SourceRow = 증거 최소 단위</li><li>Item = 상태를 가진 실행 최소 단위</li><li>Flow = Item 조합과 관계</li><li>ICS/Checklist/Todo/Sheet/Memo = projection</li><li>SourceRow → Item은 versioned deterministic compiler</li><li>Save/Publish는 human approval 뒤</li></ul></div>
      <div class="next"><h3 class="blue">다음 실험</h3><ol><li>기존 10개 양성 URL 실제 fetch/snapshot</li><li>URL → SourceRow extractor 2개 tier 비교</li><li>이번 frozen compiler에 연결</li><li>누락·과잉·비용·지연·수정률 측정</li><li>통과 후 DB/API contract 구현</li></ol></div>
    </div><div class="rule-list"><div class="rule"><b>아직 보류</b><span>특정 LLM 공급자·모델, 실제 단가, vector DB, 자동 게시, production fetch 인프라</span></div><div class="rule"><b>백엔드 Go 기준</b><span>URL → SourceRow까지 포함해 품질·원가·보안 gate가 통과되고, approve/export idempotency 계약이 확정될 것</span></div></div>`,
    "결론: downstream 구조는 Go. end-to-end URL backend는 다음 extractor/cost lane 결과 전까지 조건부.",
  ),
];

const reportHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>FLOW URL-to-Content Backend Decision Report</title><style>${sharedCss}</style></head><body>
<div class="deck">${slides.join("")}</div>
<div class="nav"><button type="button" data-dir="-1" aria-label="이전 슬라이드">이전</button><button type="button" class="counter" aria-live="polite">1 / ${slides.length}</button><button type="button" data-dir="1" aria-label="다음 슬라이드">다음</button></div>
<script>
const slides=[...document.querySelectorAll('.slide')];let active=0;const counter=document.querySelector('.counter');
const go=(index)=>{active=Math.max(0,Math.min(slides.length-1,index));slides[active].scrollIntoView({behavior:'smooth'});counter.textContent=(active+1)+' / '+slides.length};
document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('click',()=>go(active+Number(button.dataset.dir))));
addEventListener('keydown',event=>{if(['ArrowDown','ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(active+1)}if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(active-1)}if(event.key==='Home')go(0);if(event.key==='End')go(slides.length-1)});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){active=slides.indexOf(entry.target);counter.textContent=(active+1)+' / '+slides.length}}),{threshold:.55});slides.forEach(slide=>observer.observe(slide));
</script></body></html>`;
await write(path.join(auditDir, "report.html"), reportHtml);

const previewCss = `
  :root{font-family:Inter,"Pretendard","Noto Sans KR",system-ui,sans-serif;color:#101820;--blue:#1455e8;--line:#d6dde7;--muted:#5d6876;--green:#287a36}*{box-sizing:border-box}body{margin:0;background:#eef2f6}header{height:64px;background:#111a23;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 28px}header strong{letter-spacing:.04em}main{max-width:1180px;margin:30px auto;background:#fff;min-height:680px;padding:34px;box-shadow:0 18px 50px rgba(16,24,32,.11)}h1{margin:0;font-size:34px;letter-spacing:-.04em}h2{font-size:18px;margin:0 0 14px}.meta{color:var(--muted);margin:6px 0 28px}.layout{display:grid;grid-template-columns:.9fr 1.1fr;gap:30px}.panel{border-top:4px solid var(--blue);padding-top:18px}.row,.item{border:1px solid var(--line);padding:16px;margin-bottom:10px}.row small,.item small{display:block;color:var(--muted);margin-top:5px}.item{display:flex;gap:12px}.checkbox{width:24px;height:24px;border:2px solid var(--blue);flex:0 0 auto}.artifact{display:inline-block;color:var(--blue);font-weight:800;margin-bottom:12px}.review{margin-top:24px;padding:18px;background:#f5f8ff;border:1px solid #cbd8f5}.blocked{padding:34px;border:1px solid #d8dde5;background:#f6f7f9}.blocked strong{display:block;font-size:23px;color:#9b382f}.back{color:#9fb3d1;text-decoration:none}@media(max-width:760px){main{margin:0;padding:24px;box-shadow:none}.layout{grid-template-columns:1fr}header{padding:0 18px}}
`;
const previewDocument = (entry) => {
  const blocked = entry.proposal.result.state === "blocked";
  const sourceRows = entry.sourceRows
    .map((row) => `<div class="row"><b>${esc(row.title)}</b><small>${esc(row.rowType)} · ${esc(row.detail ?? "detail 없음")}</small></div>`)
    .join("");
  const items = entry.proposal.items
    .map((item) => `<div class="item"><span class="checkbox"></span><div><b>${esc(item.title)}</b><small>${esc(intentKo[item.intent])} · ${esc(item.completionMode)}${item.scheduleEvidence ? ` · ${esc(item.scheduleEvidence.sourceText)}` : ""}</small>${item.memo ? `<small>${esc(item.memo)}</small>` : ""}</div></div>`)
    .join("");
  const content = blocked
    ? `<div class="blocked"><strong>FLOW를 만들지 않았습니다</strong><p>${esc(entry.proposal.result.reasonCode)}</p><p class="meta">권장 처리: ${esc(entry.proposal.result.disposition)}</p></div>`
    : `<div class="layout"><section class="panel"><h2>원문 SourceRows</h2>${sourceRows || "<p>없음</p>"}</section><section class="panel"><span class="artifact">${esc(artifactKo[entry.proposal.result.primaryArtifact])}</span><h2>FLOW Items</h2>${items}<div class="review"><b>검토 표시</b><p>${esc(entry.proposal.review.uncertaintyCodes.join(", ") || "없음")}</p></div></section></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${esc(entry.label)} · FLOW preview</title><style>${previewCss}</style></head><body><header><strong>FLOW preview</strong><a class="back" href="index.html">전체 사례</a></header><main><h1>${esc(entry.label)}</h1><p class="meta">${esc(entry.auditCaseId)} · ${esc(entry.pattern)} · 저장되지 않은 proposal</p>${content}</main></body></html>`;
};

for (const entry of outputs) {
  await write(path.join(auditDir, `previews/${entry.auditCaseId}.html`), previewDocument(entry));
}
const previewIndex = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>FLOW previews</title><style>${previewCss}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.link{border:1px solid var(--line);padding:18px;text-decoration:none}.link:hover{border-color:var(--blue)}.link b{display:block}.link span{font-size:12px;color:var(--muted)}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style></head><body><header><strong>FLOW previews · 12 cases</strong><a class="back" href="../report.html">보고서</a></header><main><h1>검증 사례 미리보기</h1><p class="meta">10개 proposal + 2개 blocked</p><div class="grid">${outputs.map((entry) => `<a class="link" href="${entry.auditCaseId}.html"><b>${esc(entry.label)}</b><span>${esc(entry.auditCaseId)} · ${esc(entry.proposal.result.primaryArtifact ?? entry.proposal.result.reasonCode)}</span></a>`).join("")}</div></main></body></html>`;
await write(path.join(auditDir, "previews/index.html"), previewIndex);

process.stdout.write(
  `${JSON.stringify({ report: path.relative(repoRoot, path.join(auditDir, "report.html")).replaceAll("\\", "/"), previewCount: outputs.length, positivePreviewCount: positive.length, blockedPreviewCount: negative.length }, null, 2)}\n`,
);
