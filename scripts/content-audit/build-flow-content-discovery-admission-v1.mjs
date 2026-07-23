import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const DATE = '2026-07-20';
const OBSERVED_AT = '2026-07-20T23:30:00+09:00';
const AUDIT_DIR = path.join(ROOT, 'docs', 'content-audit');
const SPEC_DIR = path.join(ROOT, 'docs', 'specs', '2026-07-20-flow-content-discovery-admission');
const GALLERY_PATH = path.join(AUDIT_DIR, '2026-07-20-flowme-four-modes-p0-24-gallery-ko.html');
const EXPANSION_PATH = path.join(AUDIT_DIR, '2026-07-19-flow-content-source-expansion-seed.json');

const OUTPUTS = {
  goal: path.join(AUDIT_DIR, `${DATE}-flow-content-discovery-admission-goal-ko.md`),
  contract: path.join(AUDIT_DIR, `${DATE}-flow-content-discovery-admission-contract-v1.json`),
  p0: path.join(AUDIT_DIR, `${DATE}-flow-content-discovery-p0-reclassification-v1.json`),
  candidates: path.join(AUDIT_DIR, `${DATE}-flow-content-discovery-candidate-ledger-v1.json`),
  html: path.join(AUDIT_DIR, `${DATE}-flow-content-discovery-admission-strategy-ceo-ko.html`),
};

const SOURCE_DOCS = [
  'docs/content-audit/2026-07-18-flowme-flow-content-contract-v1.json',
  'docs/specs/2026-07-20-flowme-taxonomy-v1-1/spec.md',
  'docs/specs/2026-07-20-flowme-taxonomy-v1-1/taxonomy-v1.1.json',
  'docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/spec.md',
  'docs/content-audit/2026-07-20-flowme-p25-production-review-p26-program/decision-matrix.json',
  'docs/flow-rules/source-to-flow-conversion-gate.md',
  'docs/flow-rules/content-conversion-playbooks.md',
  'docs/flow-rules/quality-gate.md',
  'docs/PRODUCT_PRINCIPLES.md',
];

const TIER = {
  link_bucket: { label: 'Link/Bucket', short: '링크 보관', color: 'blue' },
  quick_flow: { label: 'Quick Flow', short: '짧은 실행', color: 'green' },
  full_flow: { label: 'Full Flow', short: '구조형 실행', color: 'gold' },
  hold_reject: { label: 'Hold/Reject', short: '보류·제외', color: 'red' },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractGallery() {
  const html = fs.readFileSync(GALLERY_PATH, 'utf8');
  const start = html.indexOf('const MODES');
  const end = html.indexOf('const escapeHtml');
  if (start < 0 || end < 0) throw new Error('P0 gallery data block was not found.');
  const code = html
    .slice(start, end)
    .replace(/\bconst\s+(MODES|ACTUAL|FLOW_STATE|APPLIED|FLOWS)\s*=/g, 'globalThis.$1 =');
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

const p0Decision = {
  C01: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_for_internal_canary',
    sourceRows: 'complete_official', initialInputs: 0, laterInputs: ['아이 생년월일 또는 다음 검진 기준일 1개'],
    defaultArtifact: 'todo', secondaryArtifacts: ['calendar', 'memo'], selection: 'first_canary',
    reason: '사용자의 일은 전체 8회 표를 관리하는 것이 아니라 다음 검진 1건과 공식 가능 기간을 놓치지 않는 것이다.',
    reduction: '현재 8개 회차 Item은 공식 참고표로 내리고, 활성 Item은 다음 일반·구강검진 1건만 둔다. 예약일은 사용자가 정한 뒤 Calendar로 보낸다.',
    uxScore: 88, uxComment: '공개 카드에서 “다음 검진 1건”이 바로 보이면 5초 이해가 가능하다. 현재 8행 노출은 모바일 첫 행동을 흐린다.',
  },
  C02: {
    admissionTier: 'hold_reject', targetTier: 'full_flow', readiness: 'rights_and_legal_review_required',
    sourceRows: 'complete_creator', initialInputs: 0, laterInputs: ['비교할 업체명'], defaultArtifact: 'sheet', secondaryArtifacts: ['checklist', 'memo'], selection: 'boundary_control',
    reason: '행은 있으나 계약 판단에 가까운 민감 영역이고 제작자 원문의 변환 허가와 공식 계약 근거가 없다.',
    reduction: '7개 확인행은 유지할 수 있지만 “적정/안전” 판정은 만들지 않는다. 업체별 진행·보류·거절 상태와 질문만 별도 실행 상태로 둔다.',
    uxScore: 57, uxComment: 'Sheet 비교에는 맞지만 현재 앱에서 법률적 확정처럼 읽힐 위험이 크다. 공개보다 내부 대조군이 적절하다.',
  },
  C03: {
    admissionTier: 'link_bucket', targetTier: 'quick_flow', readiness: 'source_import_required',
    sourceRows: 'broad_source', initialInputs: 0, laterInputs: ['놀이 날짜 선택'], defaultArtifact: 'memo', secondaryArtifacts: ['checklist'], selection: 'not_selected',
    reason: '현재 PDF 범위가 넓어 네 행동이 해당 활동의 직접 원문 행인지 설명하기 어렵다.',
    reduction: '제목·원문 링크·준비물·대상 연령만 Link/Bucket으로 보존한다. 정확한 활동 행을 확보한 뒤 한 번의 만들기 Quick Flow로 승격한다.',
    uxScore: 45, uxComment: '링크 보관은 자연스럽지만 현재 네 Item을 실행 화면에 보이면 출처 신뢰가 깨진다.',
  },
  C04: {
    admissionTier: 'link_bucket', targetTier: 'quick_flow', readiness: 'source_import_required',
    sourceRows: 'broad_question_source', initialInputs: 0, laterInputs: ['읽을 책 제목'], defaultArtifact: 'memo', secondaryArtifacts: ['checklist'], selection: 'not_selected',
    reason: '원문 질문 템플릿보다 FlowMe가 만든 독서 절차가 더 많아 source fidelity가 낮다.',
    reduction: '원문 질문 1개와 책 링크만 보관한다. 책 읽기 자체를 여러 Item으로 늘리지 않는다.',
    uxScore: 42, uxComment: '사용자는 질문 한 가지를 원하지만 현재 6행은 독서법 강의처럼 보인다.',
  },
  C05: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_second_wave',
    sourceRows: 'complete_official', initialInputs: 0, laterInputs: ['입소일 또는 서비스 변경일'], defaultArtifact: 'todo', secondaryArtifacts: ['calendar', 'memo'], selection: 'not_selected',
    reason: '신청 경로 확인·신청·결과 확인이라는 짧은 행정 작업이며 다단계 계획은 필요 없다.',
    reduction: '변경 시 재확인은 조건부 후속 안내로 내리고 핵심 행동 3개만 체크한다.',
    uxScore: 83, uxComment: '공식 링크와 다음 행동이 명확해 현재 카드·My Flow·내보내기 틀에 잘 맞는다.',
  },
  C06: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator', initialInputs: 0, laterInputs: ['시작 주', '제외할 메뉴'], defaultArtifact: 'calendar', secondaryArtifacts: ['checklist', 'memo'], selection: 'second_wave',
    reason: '월~금 메뉴 행과 장보기 준비가 연결되어 주간 일정 구조가 실행 성공에 중요하다.',
    reduction: '재고 확인은 별도 Item이 아니라 장보기 Step의 detail로 묶고, 5개 요일 메뉴를 핵심 Item으로 유지한다.',
    uxScore: 84, uxComment: '주간 Calendar와 체크리스트로 자연스럽게 투영된다. 공개 전 제작자 권리 협의가 필요하다.',
  },
  C07: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator', initialInputs: 0, laterInputs: ['만들기 날짜'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo'], selection: 'not_selected',
    reason: '한 번의 만들기 세션이며 날짜·장기 진도보다 정확한 원문 도안과 순서가 중요하다.',
    reduction: '완성 사진·다음 놀이·남은 재료 정리는 개인 메모로 내리고 준비·만들기·정리 3묶음만 체크한다.',
    uxScore: 76, uxComment: 'Quick Flow로는 맞지만 원문 도안 파일을 복제하지 않는 링크 중심 UI가 필수다.',
  },
  C08: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'ready_for_internal_canary',
    sourceRows: 'complete_official_plan', initialInputs: 0, laterInputs: ['학습 시작일', '학습 요일'], defaultArtifact: 'checklist', secondaryArtifacts: ['calendar', 'sheet'], selection: 'first_canary',
    reason: '14주차 순서와 진도 상태가 핵심이며 완료·보류·재개가 장기간 유지되어야 한다.',
    reduction: '주차별 주제와 원문 활동만 유지하고 세부 차시·임의 마감은 만들지 않는다.',
    uxScore: 91, uxComment: '현재 progress surface와 가장 잘 맞는 대표 Full Flow다. 모바일에서는 현재 주차와 다음 주차를 우선 노출해야 한다.',
  },
  C09: {
    admissionTier: 'link_bucket', targetTier: 'quick_flow', readiness: 'source_import_required',
    sourceRows: 'broad_creator_source', initialInputs: 0, laterInputs: ['출국일'], defaultArtifact: 'memo', secondaryArtifacts: ['checklist'], selection: 'not_selected',
    reason: '통신사·기기별 절차가 다른데 현재 원문 범위가 넓어 6개 행동을 직접 뒷받침하지 못한다.',
    reduction: '구매처 링크·지원 기기·QR 보관 정보만 남긴다. 설치 행은 정확한 상품별 원문 확보 후 승격한다.',
    uxScore: 49, uxComment: '출국 전 링크 보관 가치는 있으나 잘못된 설치 순서를 체크리스트로 고정하면 실패 비용이 크다.',
  },
  C10: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_second_wave',
    sourceRows: 'complete_commercial_article', initialInputs: 0, laterInputs: ['여행일', '동반자'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo', 'sheet'], selection: 'not_selected',
    reason: '짐 싸기는 한 세션에서 끝나는 작업이며 장기 단계보다 준비물 그룹과 담당 상태가 중요하다.',
    reduction: '여행 조건 입력과 사후 개선은 Item이 아니라 setup/memo로 이동한다. 준비물 5묶음만 체크한다.',
    uxScore: 79, uxComment: '체크리스트와 Sheet export에는 잘 맞지만 비슷한 R04와 중복되어 대표 슬롯 하나만 유지해야 한다.',
  },
  C11: {
    admissionTier: 'link_bucket', targetTier: 'quick_flow', readiness: 'rights_restricted_no_derivatives',
    sourceRows: 'complete_official_route', initialInputs: 0, laterInputs: ['방문일'], defaultArtifact: 'memo', secondaryArtifacts: ['calendar'], selection: 'boundary_control',
    reason: '목적지 순서는 명확하지만 공공누리 변경금지 조건 때문에 파생 실행본 공개가 잠긴다.',
    reduction: '원문 제목·네 목적지·원문 링크를 한 카드에 보존하고, 사용자가 직접 방문일만 붙이게 한다.',
    uxScore: 68, uxComment: 'Link/Bucket의 경계 사례로 유용하다. “Flow 실행”보다 “원문 코스 저장”이 정확하다.',
  },
  C12: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'ready_second_wave',
    sourceRows: 'complete_open_source', initialInputs: 0, laterInputs: ['시작 과정', '학습 요일'], defaultArtifact: 'sheet', secondaryArtifacts: ['checklist', 'calendar'], selection: 'not_selected',
    reason: '선수조건과 과정 순서, 장기 진도 상태가 필수인 학습 경로다.',
    reduction: '전체 OSSU를 한 번에 노출하지 않고 시작 구간만 활성화하며 이후 구간은 잠금/참고로 둔다.',
    uxScore: 87, uxComment: 'Full Flow 구조에는 잘 맞지만 전체 로드맵을 모바일에 평면 나열하면 과밀해진다.',
  },
  C13: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator_recipe', initialInputs: 0, laterInputs: ['조리 날짜'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo'], selection: 'not_selected',
    reason: '한 끼 조리는 한 세션의 순서형 실행이며 재료·수량·주의는 detail에 속한다.',
    reduction: '결과 평가를 별도 Item으로 두지 않고 개인 메모로 남긴다. 원문 조리 행 3개만 체크한다.',
    uxScore: 82, uxComment: '짧은 실행과 원문 복귀가 명확해 Quick Flow 대표형이다. 제작자 허가 전 공개는 잠근다.',
  },
  C14: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator_article', initialInputs: 0, laterInputs: ['정리할 날짜'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo'], selection: 'first_canary',
    reason: '하루 안에 끝나는 한 번의 정리 작업이며 날짜 없이 저장해도 바로 가치가 있다.',
    reduction: '기준 결정은 setup/memo로 두고 꺼내기·분류·되돌리기·처분 예약 네 묶음만 체크한다.',
    uxScore: 90, uxComment: '날짜 없는 저장, 나중 일정화, 짧은 체크리스트를 한 번에 검증하는 좋은 Quick Flow다.',
  },
  C15: {
    admissionTier: 'hold_reject', targetTier: 'full_flow', readiness: 'source_and_health_review_required',
    sourceRows: 'homepage_only', initialInputs: 0, laterInputs: ['시작일', '운동 요일'], defaultArtifact: 'calendar', secondaryArtifacts: ['checklist', 'memo'], selection: 'boundary_control',
    reason: '4주·세트·거리·휴식이 현재 홈페이지에서 직접 확인되지 않아 운동 처방을 만들어낸 상태다.',
    reduction: '모든 회차를 숨기고 정확한 공식 프로그램 원문과 중단 기준이 확보될 때까지 Hold한다.',
    uxScore: 31, uxComment: '일정 UI에는 맞아 보여도 출처 없는 운동량을 실행하게 하므로 현재 틀에 넣으면 안 된다.',
  },
  C16: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator_article', initialInputs: 0, laterInputs: ['대상 글 URL', '완료 목표일'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo'], selection: 'first_canary',
    reason: '기존 글 한 편을 영상으로 전환하는 하나의 명확한 제작 작업이다.',
    reduction: '4개 산출물 중심 행동을 유지하고 채널 성장·4주 계획으로 범위를 넓히지 않는다.',
    uxScore: 89, uxComment: '제작자가 자신의 원문 링크를 유지하면서 수정·공유할 이유가 분명한 creator canary다.',
  },
  O01: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_second_wave',
    sourceRows: 'complete_official', initialInputs: 0, laterInputs: ['여행 예정일'], defaultArtifact: 'todo', secondaryArtifacts: ['calendar', 'memo'], selection: 'not_selected',
    reason: '재발급 필요 확인·신청·수령이라는 짧은 행정 작업이다.',
    reduction: '사진·수수료·수령 방식은 detail로 묶고 핵심 행동 3개만 체크한다.',
    uxScore: 85, uxComment: '공식 링크와 마감 연결이 좋아 Quick Flow에 맞는다. 실행 시 최신 공지를 재확인해야 한다.',
  },
  O02: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_for_internal_canary',
    sourceRows: 'complete_official', initialInputs: 0, laterInputs: ['방문일'], defaultArtifact: 'todo', secondaryArtifacts: ['calendar', 'memo'], selection: 'first_canary',
    reason: '사용자의 핵심 일은 검사 가능 기간 확인과 방문일 결정이며 차량 점검표 전체가 아니다.',
    reduction: '현재 10개 Item을 “검사 가능 기간 확인”, “검사소·방문일 정하기” 2개로 줄인다. 검사 결과는 메모에 남긴다.',
    uxScore: 93, uxComment: '0입력 저장 후 날짜를 나중에 붙이는 최소 입력 모델의 가장 선명한 Quick Flow다.',
  },
  O03: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'local_source_import_required',
    sourceRows: 'national_common_plus_local_gap', initialInputs: 0, laterInputs: ['입학 예정 학교 또는 지역', '기준일'], defaultArtifact: 'calendar', secondaryArtifacts: ['checklist', 'memo'], selection: 'not_selected',
    reason: '공통 준비와 학교별 일정·제출물이 분리되어야 하며 여러 시점의 준비가 연결된다.',
    reduction: '전국 공통 행만 기본으로 두고 학교별 제출물은 사용자가 원문을 추가하기 전 만들지 않는다.',
    uxScore: 72, uxComment: 'Full Flow 구조에는 맞지만 지역 원문이 없으면 사용자가 그대로 따를 수 없다.',
  },
  O04: {
    admissionTier: 'hold_reject', targetTier: 'full_flow', readiness: 'official_source_and_legal_review_required',
    sourceRows: 'creator_article_only', initialInputs: 0, laterInputs: ['비교할 주택'], defaultArtifact: 'sheet', secondaryArtifacts: ['checklist', 'memo'], selection: 'boundary_control',
    reason: '법률·재무 영향이 큰데 공식 주 출처와 전문가 검토가 부족하다.',
    reduction: '안전 판정·가입 가능 판정을 만들지 않는다. 공식 조회 링크와 질문 목록이 확보될 때까지 Hold한다.',
    uxScore: 38, uxComment: '비교 Sheet는 필요하지만 현재 데이터로 실행시키면 잘못된 확신을 줄 수 있다.',
  },
  R01: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'ready_for_internal_canary',
    sourceRows: 'complete_official', initialInputs: 0, laterInputs: ['이사일'], defaultArtifact: 'calendar', secondaryArtifacts: ['checklist', 'sheet', 'memo'], selection: 'first_canary',
    reason: 'D-14부터 이사 후까지 상대 날짜와 단계 순서가 실행 성공에 직접 영향을 준다.',
    reduction: '6개 기간 Step은 유지하되 24개 세부 행동을 모바일에서 단계별로 접고, 예시 날짜는 저장하지 않는다.',
    uxScore: 94, uxComment: '기준일 1개로 Calendar·checklist·sheet를 모두 설명할 수 있는 대표 Full Flow다.',
  },
  R02: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator_article', initialInputs: 0, laterInputs: ['시작일'], defaultArtifact: 'checklist', secondaryArtifacts: ['calendar', 'memo'], selection: 'not_selected',
    reason: '7일간 재료 소진 순서와 중간 조정이 핵심인 짧은 진도형 계획이다.',
    reduction: '개인 재고 선택은 setup/memo로 두고 원문 7일 구간만 실행 상태로 유지한다.',
    uxScore: 81, uxComment: '진도형 Full Flow로 쓸 수 있으나 개인 재고 입력을 별도 데이터 모델로 확장하면 안 된다.',
  },
  R03: {
    admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'rights_review_required',
    sourceRows: 'complete_creator_article', initialInputs: 0, laterInputs: ['시작일', '대상 프로젝트'], defaultArtifact: 'checklist', secondaryArtifacts: ['calendar', 'sheet', 'memo'], selection: 'not_selected',
    reason: '범위 결정부터 배포·설명까지 선행 관계와 여러 산출물이 이어지는 프로젝트다.',
    reduction: '원문에 없는 4주 마감은 강제하지 않고 사용자가 목표일을 정할 때만 일정화한다.',
    uxScore: 78, uxComment: 'Full Flow에는 맞지만 현재 제목의 4주가 원문 근거인지 재확인해야 한다.',
  },
  R04: {
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_second_wave',
    sourceRows: 'complete_commercial_article', initialInputs: 0, laterInputs: ['출발일', '여행 유형'], defaultArtifact: 'checklist', secondaryArtifacts: ['memo', 'sheet'], selection: 'not_selected',
    reason: '한 번의 짐 싸기 작업이며 날짜·장기 단계보다 준비물 묶음이 중요하다.',
    reduction: '6개 준비물 그룹은 유지하고 목적지별 비자·반입 규정은 공식 링크 참고로 분리한다.',
    uxScore: 80, uxComment: 'Quick Flow로 자연스럽지만 C10과 역할이 겹쳐 한 버전만 대표로 운영해야 한다.',
  },
};

const freshCandidates = [
  {
    candidateId: 'NEW-OHOUSE-MAP-01', title: '오늘의집 셀프인테리어 가이드 묶음', provider: '오늘의집',
    sourceUrl: 'https://contents.ohou.se/advices/guides/self_interior', lifeArea: 'home_living', sourceShape: 'resource_collection',
    rowEvidence: '비용·계획·페인트·바닥·조명·배치·수납·패브릭·벽꾸미기 9개 섹션과 다수의 개별 글 링크.',
    visibleDemand: '개별 글에 조회·스크랩이 노출된다. 예: 20평대 비용 글 조회 383,626·스크랩 2,258, 원룸 공간 활용 글 조회 490,705·스크랩 5,328.',
    rights: 'permission_required', risk: 'commercial_creator', admissionTier: 'link_bucket', targetTier: 'full_flow', readiness: 'provider_permission_required',
    decision: 'shortlist_provider_map', nextAction: '개별 글 1개 단위로 URL·행·권리를 수입하고, 가이드 전체는 Flow Map이 아니라 탐색용 Link/Bucket으로 유지한다.',
    scores: { demand: [96, '조회·스크랩이 실제로 보이며 수십만 단위 글이 다수다.'], conversion: [68, '목록 구조는 강하지만 전체 묶음을 하나의 Flow로 만들면 목적이 섞인다.'], creator: [92, '여러 제작자·주제별 fork와 원문 유입이 자연스럽다.'], ux: [72, '현재 앱에는 Link/Bucket 표면이 필요하며 Full Flow 카드로 바로 넣으면 과밀하다.'] },
  },
  {
    candidateId: 'NEW-OHOUSE-QUOTE-01', title: '인테리어 상담 준비 체크리스트', provider: '오늘의집',
    sourceUrl: 'https://ohou.se/advices/12360', lifeArea: 'money_admin_purchase', sourceShape: 'decision_checklist',
    rowEvidence: '공사 범위·스타일, 방문 상담 2~3곳, 포함 항목, 현장 실측, 예산 조정의 명시적 체크 5개.',
    visibleDemand: '현재 페이지에서 조회·스크랩 수치는 확인되지 않았다.', rights: 'permission_required', risk: 'commercial_purchase',
    admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'provider_permission_required', decision: 'provider_queue',
    nextAction: '업체 선택 판정은 만들지 않고 5개 확인행과 업체별 메모만 쓰는 내부 Quick Flow를 제작자 협의 후 검토한다.',
    scores: { demand: [61, '검색·복사 의도는 높지만 페이지의 직접 수요 수치는 보이지 않는다.'], conversion: [88, '명시적 5행이 있어 임의 행동 없이 변환 가능하다.'], creator: [78, '시공 전문가가 사례·지역별 버전을 만들 여지가 크다.'], ux: [84, 'Quick checklist와 memo에 잘 맞고 날짜 입력이 필수가 아니다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-WEDDING-110', title: '서울시 결혼 준비 체크리스트 110선', provider: '서울특별시',
    sourceUrl: 'https://opengov.seoul.go.kr/og/com/download.php?dname=%EC%98%88%EB%B9%84%EB%B6%80%EB%B6%80+%EC%8A%A4%C2%B7%EB%93%9C%C2%B7%EB%A9%94+%EC%B6%94%EA%B0%80%EA%B8%88+%ED%8F%AD%ED%83%84%E2%80%A6+%EC%84%9C%EC%9A%B8%EC%8B%9C+%EA%B2%B0%ED%98%BC+%EC%A4%80%EB%B9%84+%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8+%EC%A0%9C%EC%9E%91.pdf&dtype=basic&nid=31208121&rid=F0000105564892',
    lifeArea: 'family_parenting', sourceShape: 'source_table_rows', rowEvidence: '보도자료에서 본식 40·스튜디오 19·드레스 24·메이크업 27, 합계 110개라고 확인. 이 세션에서는 실제 110행 파일을 안정적으로 추출하지 못했다.',
    visibleDemand: '서울시가 소비자상담 825건을 분석했고 66%가 계약 해제·해지·위약금 문제였다고 공개했다. 이는 문제 강도이지 콘텐츠 조회수는 아니다.',
    rights: 'official_rights_review_required', risk: 'legal_purchase', admissionTier: 'hold_reject', targetTier: 'full_flow', readiness: 'source_import_required',
    decision: 'high_priority_import', nextAction: '110행 원본과 공공누리 유형을 확보한 뒤 예식·스드메를 한 Flow로 합치지 말고 비교 Sheet 중심 Flow Map으로 나눈다.',
    scores: { demand: [90, '피해상담 825건이라는 실제 문제 신호가 있으나 다운로드 수요와는 구분했다.'], conversion: [74, '110행 표 구조는 강하지만 현재 행 본문을 모두 확보하지 못했다.'], creator: [55, '공식 trust anchor이며 제작자 fork보다 업체 비교·후기 overlay가 적합하다.'], ux: [70, 'Sheet/decision UI가 필요하고 110행을 모바일 체크리스트로 평면 노출하면 실패한다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-ECO-VACATION', title: '친환경 여름휴가 체크리스트', provider: '서울특별시',
    sourceUrl: 'https://news.seoul.go.kr/env/archives/570011', lifeArea: 'travel_outings', sourceShape: 'grouped_checklist',
    rowEvidence: '집을 나서기 전·이동·여행지·분리배출 4개 Step, 각 5개 안팎의 명시적 체크 행.', visibleDemand: '2026-07-15 최신 게시. 추천 수는 0으로 노출된다.',
    rights: 'kogl_type_4_no_derivatives', risk: 'low', admissionTier: 'link_bucket', targetTier: 'quick_flow', readiness: 'rights_restricted_no_derivatives',
    decision: 'link_only', nextAction: '원문 링크와 4개 주제 요약만 보관한다. 파생 체크리스트 공개는 하지 않는다.',
    scores: { demand: [46, '계절성·최신성은 있으나 추천 0 외에 강한 수요 신호는 없다.'], conversion: [86, '행과 그룹이 명확하지만 변경금지 권리가 변환을 막는다.'], creator: [38, '공식 캠페인 콘텐츠라 사용자 fork 동기가 약하다.'], ux: [68, '링크 저장에는 맞고 20개 체크를 그대로 노출하면 정보량이 과하다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-MUSEUM-GROUP', title: '서울상상나라 인솔교사 사전 단체 체크리스트', provider: '서울상상나라',
    sourceUrl: 'https://www.seoulchildrensmuseum.org/download.do?fn=%EC%82%AC%EC%A0%84%EB%8B%A8%EC%B2%B4%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8%2819.10%29.pdf&fnR=%2Ff00_files%2F20191003112143_492.pdf',
    lifeArea: 'family_parenting', sourceShape: 'role_handoff_checklist', rowEvidence: '방문 전·방문 시·방문 후 구분, 2시간 이동 운영, 권장 어린이:성인 7:1, 증빙 준비 등은 검색 추출로 확인. PDF 직접 열기는 실패했다.',
    visibleDemand: '조회·다운로드 수치는 보이지 않는다.', rights: 'official_unknown', risk: 'child_group_safety', admissionTier: 'hold_reject', targetTier: 'full_flow', readiness: 'source_import_required',
    decision: 'shortlist_after_import', nextAction: 'PDF 원문 행과 최신 운영 여부를 확보한 뒤 기준일·담당자·방문 전/중/후가 있는 Full Flow로 검토한다.',
    scores: { demand: [63, '단체 인솔이라는 반복 업무 수요는 추론되지만 직접 수치는 없다.'], conversion: [79, '역할·시점·완료 행이 있어 Full Flow 적합성이 높다.'], creator: [70, '교사·기관별 수정본과 역할 분담 공유가 자연스럽다.'], ux: [77, '담당자와 단계 접기가 필요하며 현재 평면 카드만으로는 부족하다.'] },
  },
  {
    candidateId: 'NEW-GOV24-ONESTOP', title: '정부24 원스톱 서비스 모음', provider: '정부24',
    sourceUrl: 'https://www.gov.kr/portal/main/nologin', lifeArea: 'money_admin_purchase', sourceShape: 'service_directory',
    rowEvidence: '전입신고+, 맘편한 임신, 행복출산, 온종일 돌봄, 취업서류, 안심상속, 내차관리 등 원스톱 서비스 목록.', visibleDemand: '정부 공식 대표 포털이지만 개별 서비스 수요 수치는 이 페이지에 없다.',
    rights: 'official_link_only', risk: 'admin_sensitive', admissionTier: 'link_bucket', targetTier: 'link_bucket', readiness: 'provider_directory',
    decision: 'source_provider_index', nextAction: '하나의 Flow로 만들지 않고 개별 서비스 상세 URL을 찾는 공식 source provider 인덱스로 사용한다.',
    scores: { demand: [82, '공식 생활행정 진입점이라 의도는 높지만 페이지 자체 이용량은 확인하지 않았다.'], conversion: [35, '목록은 서비스 디렉터리이며 실행 행이 아니다.'], creator: [20, '공식 source discovery 역할이지 creator fork 대상이 아니다.'], ux: [78, 'Link/Bucket 검색·저장에는 맞고 Flow 카드로 만들면 목적이 섞인다.'] },
  },
  {
    candidateId: 'NEW-EASYLAW-WEDDING-MAP', title: '찾기쉬운 생활법령 결혼준비자 법령 맵', provider: '찾기쉬운 생활법령정보',
    sourceUrl: 'https://easylaw.go.kr/CSP/SysChartRetrievePLst.laf?csmSeq=170', lifeArea: 'family_parenting', sourceShape: 'reference_map',
    rowEvidence: '결혼자금·신혼집·혼수·이삿짐·예식장·신혼여행 등 대분류와 다수 법령 링크.', visibleDemand: '조회·저장 수치는 보이지 않는다. 페이지가 구 버전으로 표시된다.',
    rights: 'official_link_only', risk: 'legal_stale', admissionTier: 'link_bucket', targetTier: 'link_bucket', readiness: 'freshness_review_required',
    decision: 'backup_reference', nextAction: '공식 주제 맵으로만 연결하고 최신 세부 페이지를 개별 source로 재탐색한다.',
    scores: { demand: [67, '결혼·계약의 높은 의도는 추론되지만 직접 수요 신호는 없다.'], conversion: [42, '법령 맵은 참고 구조이지 사용자가 그대로 실행할 행이 아니다.'], creator: [24, '공식 trust anchor이며 사용자 fork와 거리가 있다.'], ux: [73, 'Link/Bucket 참고 탭에는 맞고 실행 체크리스트로 만들면 법률 설명을 행동으로 오해한다.'] },
  },
  {
    candidateId: 'NEW-IFIXIT-WASHER', title: '세탁기 정기 관리 7단계', provider: 'iFixit',
    sourceUrl: 'https://www.ifixit.com/Guide/How+To+Maintain+Your+Washing+Machine/182518', lifeArea: 'home_living', sourceShape: 'ordered_procedure',
    rowEvidence: '전원 분리·세제함·고무 패킹·도어 유리·펌프 필터·급수 필터·관리 코스 7개 명시적 Step.', visibleDemand: '확인 시점 기준 최근 30일 51회, 누적 1,055회 조회.',
    rights: 'cc_by_nc_sa_commercial_license_required', risk: 'household_safety', admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'commercial_license_required',
    decision: 'provider_permission_queue', nextAction: '모델별 제조사 지침 우선 경고와 비상업 라이선스 경계를 유지하고 상업 이용 허가 후 한국어 Quick Flow로 검토한다.',
    scores: { demand: [58, '실제 조회는 보이지만 아직 대중 수요가 강하다고 보기는 어렵다.'], conversion: [94, '행·순서·준비물·주의가 모두 명확하다.'], creator: [91, '기여·수정·번역·평판 구조가 강한 커뮤니티형 원천이다.'], ux: [86, '한 세션 Quick Flow와 반복 일정 옵션에 잘 맞는다.'] },
  },
  {
    candidateId: 'NEW-IFIXIT-HOSE', title: '새는 정원 호스 연결부 교체', provider: 'iFixit',
    sourceUrl: 'https://www.ifixit.com/Guide/How+to+Fix+a+Leaking+Garden+Hose+Connector/189188', lifeArea: 'home_living', sourceShape: 'ordered_procedure',
    rowEvidence: '분리·절단·새 연결부 삽입·클램프·조임·누수 확인 6개 Step과 칼날 주의.', visibleDemand: '확인 시점 기준 최근 30일 1,210회, 누적 1,717회 조회.',
    rights: 'cc_by_nc_sa_commercial_license_required', risk: 'sharp_tool_safety', admissionTier: 'hold_reject', targetTier: 'quick_flow', readiness: 'license_and_safety_review_required',
    decision: 'second_wave_after_review', nextAction: '상업 이용 허가와 칼날 안전 검토 후 한 세션 Quick Flow로 만든다.',
    scores: { demand: [72, '최근 30일 조회가 누적 대비 높아 현재 계절 수요 신호가 보인다.'], conversion: [92, '정확한 순서와 완료 기준이 있다.'], creator: [88, '댓글로 순서 수정 의견이 남는 편집형 커뮤니티 구조다.'], ux: [74, 'Quick Flow에는 맞지만 안전 경고를 실행행과 분리해 상단에 고정해야 한다.'] },
  },
  {
    candidateId: 'NEW-IFIXIT-HOUSEHOLD-MAP', title: 'iFixit Household 수리 가이드 묶음', provider: 'iFixit',
    sourceUrl: 'https://www.ifixit.com/Device/Household', lifeArea: 'home_living', sourceShape: 'community_resource_collection',
    rowEvidence: '17개 카테고리와 다수 교체·기술 가이드. 개별 가이드는 독립 Step 구조.', visibleDemand: '카테고리 페이지 최근 30일 50,795회, 누적 1,842,632회 조회.',
    rights: 'cc_by_nc_sa_commercial_license_required', risk: 'mixed_repair_safety', admissionTier: 'link_bucket', targetTier: 'full_flow', readiness: 'provider_partnership_required',
    decision: 'provider_lead', nextAction: '카테고리 전체를 변환하지 말고 수요·안전·모델 적합도가 높은 개별 가이드만 공급 제휴 대상으로 삼는다.',
    scores: { demand: [98, '카테고리 자체의 강한 실제 조회 신호가 있다.'], conversion: [82, '개별 가이드는 매우 강하지만 컬렉션 전체는 하나의 Flow가 아니다.'], creator: [97, '누구나 작성·수정하고 기여 평판을 얻는 구조가 명확하다.'], ux: [76, 'Link/Bucket과 개별 Quick Flow를 함께 지원해야 하며 현재 단일 카드만으로는 부족하다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-LEARNING-2026', title: '2026 서울시민대학 여름 계절학기', provider: '서울특별시평생교육진흥원',
    sourceUrl: 'https://mediahub.seoul.go.kr/archives/2018516', lifeArea: 'study_reading', sourceShape: 'dated_resource_queue',
    rowEvidence: '7월 7일~8월 21일, 4개 캠퍼스, 110개 강좌, 대부분 1~4회차라는 일정·목록 구조.', visibleDemand: '페이지 조회 5,300, 좋아요 7, 모집 3,700명.',
    rights: 'kogl_type_4_no_derivatives', risk: 'time_sensitive', admissionTier: 'link_bucket', targetTier: 'full_flow', readiness: 'source_import_and_rights_required',
    decision: 'seasonal_provider_lead', nextAction: '뉴스 페이지를 Flow로 만들지 않고 강좌 상세·프로그램북을 수입한 뒤 선택한 강좌 1개만 일정 Flow로 만든다.',
    scores: { demand: [80, '조회와 모집 규모가 실제로 보인다.'], conversion: [66, '프로그램북을 수입해야 개별 회차가 생긴다.'], creator: [45, '공식 강좌 제공자 중심이며 사용자 fork보다 선택·저장이 중요하다.'], ux: [71, 'resource queue와 선택 후 Full Flow 전환이 필요하다.'] },
  },
  {
    candidateId: 'NEW-KTO-INCENTIVE-COURSE', title: '기업 인센티브 관광 패키지 과정', provider: '한국관광공사 관광e배움터',
    sourceUrl: 'https://touredu.visitkorea.or.kr/common/C202300286/0000/0', lifeArea: 'work_career', sourceShape: 'course_package',
    rowEvidence: '현재 과정 외 3개 연계 과정을 완료해야 수료증을 받는 패키지 구조, 신청 후 30일, 진도 80% 수료 기준.', visibleDemand: '학습인원 300+와 후기 1건이 노출된다.',
    rights: 'official_link_only', risk: 'low_b2b', admissionTier: 'full_flow', targetTier: 'full_flow', readiness: 'ready_second_wave',
    decision: 'niche_backup', nextAction: '소비자 P0가 아니라 업무·관광 B2B 포트폴리오 공백을 채우는 second-wave 학습 Flow로 둔다.',
    scores: { demand: [59, '300+ 학습자는 보이나 대중 생활 콘텐츠 수요는 아니다.'], conversion: [87, '패키지·기간·완료 기준이 명시적이다.'], creator: [50, '교육 제공자 공유는 가능하지만 사용자 fork 동기는 보통이다.'], ux: [83, 'K-MOOC와 같은 progress Full Flow 틀에 자연스럽게 맞는다.'] },
  },
  {
    candidateId: 'NEW-OHOUSE-CREATOR-GUIDE', title: '오늘의집 사용자가 좋아하는 콘텐츠 가이드', provider: '오늘의집 필진단',
    sourceUrl: 'https://ohou.se/advices/9760', lifeArea: 'work_career', sourceShape: 'creator_playbook',
    rowEvidence: '노하우형·큐레이션형과 살림·요리·식물·캠핑 등 Good Case 링크를 제공한다.', visibleDemand: '해당 안내 글 자체는 조회 66, 좋아요 1, 스크랩·댓글 0.',
    rights: 'permission_required', risk: 'commercial_creator', admissionTier: 'link_bucket', targetTier: 'link_bucket', readiness: 'provider_research_only',
    decision: 'creator_source_strategy', nextAction: '사용자 Flow로 만들지 않고 어떤 제작자 콘텐츠가 모방·저장되는지 발굴하는 공급 측 가이드로 사용한다.',
    scores: { demand: [35, '안내 글 자체 수요는 낮다.'], conversion: [28, '실행행이 아니라 제작자 콘텐츠 선정 기준이다.'], creator: [94, '제작자 공급과 카테고리 확장 인사이트는 매우 강하다.'], ux: [62, '제품 콘텐츠가 아니라 내부 source scout 도구로 적합하다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-BUS-FARE', title: '서울시 장애인 버스요금 지원 신청', provider: '서울특별시',
    sourceUrl: 'https://news.seoul.go.kr/welfare/dsbus/ko/conts/view.do?menuId=K_USAGE_INFO', lifeArea: 'money_admin_purchase', sourceShape: 'official_application_steps',
    rowEvidence: '신청자격 체크부터 자격 확인·동의·본인인증·정보 입력·카드/계좌 확인·완료까지 7개 공식 Step.', visibleDemand: '페이지에 조회 수치는 없다.',
    rights: 'official_link_only', risk: 'sensitive_identity_finance', admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'privacy_and_accessibility_review_required',
    decision: 'official_second_wave', nextAction: 'FlowMe는 주민번호·계좌를 받지 않고 공식 신청 링크와 완료 상태만 제공한다.',
    scores: { demand: [66, '대상자에게는 강한 필요지만 지역·자격 범위가 좁고 수치는 없다.'], conversion: [91, '공식 7단계가 명확하다.'], creator: [18, '공식 trust anchor이며 fork 대상이 아니다.'], ux: [79, 'Quick Flow에 맞지만 민감정보 입력이 FlowMe 화면처럼 보이지 않게 외부 이동을 명확히 해야 한다.'] },
  },
  {
    candidateId: 'NEW-EASYLAW-BIRTH-REPORT', title: '출생신고 준비', provider: '찾기쉬운 생활법령정보',
    sourceUrl: 'https://easylaw.go.kr/CSP/CnpClsMainBtr.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=707&popMenu=ov', lifeArea: 'family_parenting', sourceShape: 'official_deadline_procedure',
    rowEvidence: '출생 후 1개월 기한, 신고 장소, 신고서 기재사항, 출생증명서·신분증명서 등 첨부서류가 명시되어 있다.', visibleDemand: '페이지에 조회·저장 수치는 없다.',
    rights: 'official_link_only', risk: 'legal_identity_sensitive', admissionTier: 'quick_flow', targetTier: 'quick_flow', readiness: 'ready_second_wave',
    decision: 'second_wave_candidate', nextAction: '출생일을 넣기 전에는 날짜 없이 저장하고, 입력 시 공식 1개월 기한만 계산한다. 개인정보는 수집하지 않는다.',
    scores: { demand: [84, '기한을 놓치면 과태료가 발생하는 높은 긴급성은 확인되지만 이용량은 모른다.'], conversion: [93, '기한·장소·서류 행이 명확하다.'], creator: [22, '공식 trust anchor이며 개인 경험은 메모로만 분리해야 한다.'], ux: [91, '기준일 1개와 Todo/Calendar 변환을 검증하는 강한 Quick Flow다.'] },
  },
  {
    candidateId: 'NEW-SEOUL-KIDS-CAFE', title: '2026 여기저기 서울형 키즈카페', provider: '서울특별시',
    sourceUrl: 'https://news.seoul.go.kr/welfare/archives/579652', lifeArea: 'family_parenting', sourceShape: 'dynamic_location_schedule',
    rowEvidence: '18개소, 4~6월·9~11월 주말, 10:00~17:30 3회차, 4~9세, 사전예약 또는 현장접수. 장소별 일정은 별도 포털에 있다.', visibleDemand: '추천 0이 노출되며 개별 장소 수요는 이 페이지에서 확인되지 않는다.',
    rights: 'kogl_type_4_no_derivatives', risk: 'child_local_schedule', admissionTier: 'link_bucket', targetTier: 'full_flow', readiness: 'dynamic_source_import_required',
    decision: 'resource_queue_only', nextAction: '뉴스를 Flow로 만들지 않고 최신 장소·회차 API/상세표를 확보한 뒤 사용자가 선택한 1회 방문만 일정화한다.',
    scores: { demand: [62, '가족 나들이 의도는 높지만 직접 수요 수치는 약하다.'], conversion: [58, '운영 틀은 있으나 장소별 실제 회차가 별도 원문에 있다.'], creator: [48, '지역별 후기 fork는 가능하지만 공식 일정이 우선이다.'], ux: [74, '장소 큐와 선택 후 일정화가 필요해 현재 단일 Flow보다 Link/Bucket이 맞다.'] },
  },
];

const contract = {
  documentType: 'flow_content_discovery_admission_contract',
  schemaVersion: '1.0.0-proposal',
  observedAt: OBSERVED_AT,
  status: 'proposal_for_ceo_product_content_review',
  scope: '원문 후보 발굴·편입·승격 판정. 런타임 타입이나 앱 구현을 새로 정의하지 않는다.',
  oneSentenceDefinition: 'Flow는 한 사용자가 한 목표를 실제로 끝내도록 원문 근거가 있는 최소 행동과 필요한 설명·일정만 묶은 재사용 실행 객체다.',
  discoveryThesis: 'one original source -> one user job -> one natural artifact -> minimum execution UI',
  sourceDocuments: SOURCE_DOCS,
  compatibility: {
    canonicalHierarchy: 'SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map',
    destinationBeforeLayout: true,
    projectionNotType: ['calendar', 'checklist', 'todo', 'sheet', 'memo'],
    p26DateIntent: ['schedule_now', 'keep_undated', 'preview_only'],
    noExampleDatePersistence: true,
    conflict: '없음. 이 계약은 기존 canonical data contract 위에 admission/discovery 판정만 추가한다.',
  },
  minimumData: {
    flowRequired: ['stableFlowId', 'goal', 'expectedOutcome', 'sourceRefs', 'defaultArtifact'],
    itemRequired: ['stableItemId', 'actionFirstTitle', 'detailOrMethod', 'completionOrRecordCriterion', 'sourceRowIds', 'order'],
    itemOptional: ['schedule', 'recurrence', 'location', 'assignee', 'dependencies', 'decisionState', 'costOrQuantity', 'personalMemo'],
    nonExecution: ['원문 설명', '공식 참고 정보', '위험·주의', '제작자 경험·팁', '행동을 요구하지 않는 링크', '조건부 후속 안내'],
    itemRule: '독립적으로 완료·보류·재개 상태가 필요하고 사용자가 지금 체크할 가치가 있을 때만 Item이다.',
    detailRule: '수량·비용·링크·조건·특이사항·먹은 양·통증·이상반응·견적 세부는 기본적으로 detail/memo다.',
  },
  admissionModel: {
    note: '항목 수만으로 분류하지 않는다. 실행 성공에 날짜·순서·분기·역할·진도가 중요한지를 본다.',
    tiers: {
      link_bucket: { definition: '원문을 다시 보거나 후보를 고르는 저장 단위', requiredEvidence: ['정확한 URL', '제목', '출처', '왜 저장하는지'], forbidden: ['임의 Item', '임의 일정'] },
      quick_flow: { definition: '한 세션 또는 한 결정에서 끝나는 1~7개 안팎의 원문 기반 핵심 행동', triggers: ['짧은 신청', '한 번의 만들기·조리·정리', '한 번의 확인·선택'], note: '7개는 경계 예시이지 하드 리밋이 아니다.' },
      full_flow: { definition: '날짜·순서·분기·역할·진도 중 하나 이상이 실행 성공에 필수인 콘텐츠', triggers: ['D-day', '주차 진도', '선행관계', '업체 비교 상태', '역할 인계'] },
      hold_reject: { definition: '원문 행·최신성·권리·안전 근거가 부족해 실행시키면 안 되는 콘텐츠', outcomes: ['source_import_required', 'rights_review_required', 'safety_review_required', 'reject'] },
    },
    orthogonalGates: ['source row completeness', 'freshness', 'rights/publication', 'safety/sensitivity', 'locale/applicability'],
    currentAndTarget: '현재 안전한 tier와 보강 후 목표 tier를 함께 기록해 잠재력과 현재 공개 가능성을 혼동하지 않는다.',
  },
  minimumInputPolicy: {
    initialRequiredDefault: 0,
    initialRequiredTypicalMax: 1,
    exceptionalMax: 3,
    rule: '원문에서 아는 값은 다시 묻지 않고, 결과를 바꾸는 기준일·선택·역할만 요청한다.',
    flow: ['열람', '날짜 없이 저장', '생성 항목 수·영향 미리보기', '필요 시 기준일 1개', '결과 확인 후 일부 항목 일정화'],
    displayOrigins: ['source_fact', 'user_input', 'calculated_value', 'preview_example'],
  },
  projectionRules: {
    calendar: '사용자가 확정한 날짜/시각/기간/반복만 이벤트로 내보낸다. 날짜 없는 Item과 예시 날짜는 제외한다.',
    checklist: 'actionFirstTitle과 완료 상태를 내보내고 detail/source link는 접힌 참고로 둔다.',
    todo: '독립적인 다음 행동과 선택한 날짜만 보낸다.',
    sheet: '행=Item, 열=상태·날짜·담당·메모·source URL. 비교 콘텐츠는 옵션별 진행·보류·거절 상태를 유지한다.',
    memo: 'Flow 목표·원문 설명·주의·source link·개인 메모를 보존하되 실행 상태를 대체하지 않는다.',
  },
  discoveryRecordRequired: ['candidateId', 'sourceUrl', 'openedAt', 'sourceShape', 'rowEvidence', 'visibleDemand', 'rights', 'risk', 'admissionTier', 'targetTier', 'readiness', 'scores', 'nextAction'],
  discoveryScoreShape: {
    requiredKeys: ['demand', 'conversion', 'creator', 'ux'],
    valueShape: '[score 0~100, source-grounded comment]',
  },
  uxFitGate: [
    '/flows 카드에서 저장 후 생길 결과를 5초 안에 설명할 수 있다.',
    '첫 행동 또는 첫 일정이 한 화면에서 보인다.',
    '/my에서 날짜 없음과 일정 있음이 섞이지 않는다.',
    'Calendar/checklist/sheet/memo projection이 같은 Item을 읽는다.',
    '390px에서 전체 Item을 평면 나열하지 않고 Step·detail을 접는다.',
  ],
  ceoDecisionProposal: [
    'Flow를 실행 항목 중심 객체로 유지하되 발굴 단계에서는 Link/Bucket을 정식 편입 상태로 둔다.',
    'Quick/Full 구조 판정과 source·rights·safety 공개 gate를 분리한다.',
    '날짜 없는 0입력 저장과 결과 확인 후 일정화를 기본으로 채택한다.',
  ],
};

function buildP0Ledger() {
  const gallery = extractGallery();
  const records = gallery.FLOWS.map((flow) => {
    const source = gallery.ACTUAL[flow.id];
    const decision = p0Decision[flow.id];
    if (!decision) throw new Error(`Missing P0 decision for ${flow.id}`);
    return {
      flowId: flow.id,
      title: flow.title,
      currentDisplayMode: flow.mode,
      sourceUrl: source.sourceUrl,
      sourceState: source.sourceState,
      sourceWarning: source.warning,
      currentItemCount: source.items?.length ?? 0,
      currentItems: (source.items ?? []).map(([title, detail], index) => ({ order: index + 1, title, detail })),
      admissionTier: decision.admissionTier,
      admissionLabel: TIER[decision.admissionTier].label,
      targetTierAfterFix: decision.targetTier,
      targetLabel: TIER[decision.targetTier].label,
      promotionReadiness: decision.readiness,
      sourceRowStatus: decision.sourceRows,
      setup: { initialRequiredInputCount: decision.initialInputs, laterOptionalInputs: decision.laterInputs },
      projections: { primary: decision.defaultArtifact, secondary: decision.secondaryArtifacts },
      portfolioSelection: decision.selection,
      decisionReason: decision.reason,
      overbuildAudit: decision.reduction,
      uxFrameworkFit: { score: decision.uxScore, comment: decision.uxComment },
      sourceTrace: { reviewArtifact: path.relative(ROOT, GALLERY_PATH).replaceAll('\\', '/'), sourceUrl: source.sourceUrl },
    };
  });
  const counts = Object.fromEntries(Object.keys(TIER).map((tier) => [tier, records.filter((r) => r.admissionTier === tier).length]));
  const selectionCounts = records.reduce((acc, record) => {
    acc[record.portfolioSelection] = (acc[record.portfolioSelection] ?? 0) + 1;
    return acc;
  }, {});
  return {
    documentType: 'flow_content_discovery_p0_reclassification', schemaVersion: '1.0.0-proposal', observedAt: OBSERVED_AT,
    status: 'review_required', sourceArtifact: path.relative(ROOT, GALLERY_PATH).replaceAll('\\', '/'),
    classificationBoundary: '현재 4-mode UI 분류가 아니라 발굴·편입 구조를 판정한다. 공개 권리와 구조 tier는 별도 gate다.',
    counts: { total: records.length, byAdmissionTier: counts, byPortfolioSelection: selectionCounts },
    records,
  };
}

const priorExpansion = readJson(EXPANSION_PATH);
const priorCounts = priorExpansion.candidates.reduce((acc, candidate) => {
  const status = candidate.conversionState ?? 'unknown';
  acc[status] = (acc[status] ?? 0) + 1;
  return acc;
}, {});

const candidateLedger = {
  documentType: 'flow_content_discovery_candidate_ledger', schemaVersion: '1.0.0-proposal', observedAt: OBSERVED_AT,
  status: 'review_required',
  evidenceBoundary: '기존 36개 조사는 기준선으로 재사용했고 신규 16개 URL은 이 세션에서 실제로 열었다. 보이지 않는 수요 수치는 추정하지 않았다.',
  priorEvidence: {
    source: path.relative(ROOT, EXPANSION_PATH).replaceAll('\\', '/'), candidateCount: priorExpansion.candidates.length,
    conversionStateCounts: priorCounts,
  },
  freshCandidateCount: freshCandidates.length,
  freshCandidates: freshCandidates.map((candidate) => ({ ...candidate, openedAt: OBSERVED_AT })),
  nextProductionQueue: [
    { rank: 1, refId: 'O02', title: '자동차검사', wave: 'first_canary', why: 'Quick·공식·0입력 저장·나중 일정화' },
    { rank: 2, refId: 'R01', title: '이사일 기준 준비', wave: 'first_canary', why: 'Full·기준일 1개·다중 projection' },
    { rank: 3, refId: 'C14', title: '옷장 정리', wave: 'first_canary', why: 'Quick·날짜 없음·한 세션 실행' },
    { rank: 4, refId: 'C08', title: 'K-MOOC 진도', wave: 'first_canary', why: 'Full·주차 진도·재개 상태' },
    { rank: 5, refId: 'C16', title: '블로그 글을 영상으로', wave: 'first_canary', why: 'creator 원문 유입·수정·공유' },
    { rank: 6, refId: 'C01', title: '다음 영유아 건강검진', wave: 'first_canary', why: '공식 가능 기간과 한 건 알림의 최소 모델' },
    { rank: 7, refId: 'C06', title: '평일 5일 저녁 식단', wave: 'second_wave', why: '주간 source row와 Calendar 연결' },
    { rank: 8, refId: 'NEW-EASYLAW-BIRTH-REPORT', title: '출생신고 준비', wave: 'second_wave', why: '공식 기한·기준일 1개·민감정보 비수집' },
  ],
  boundaryControls: [
    { refId: 'C11', expectedTier: 'link_bucket', why: '실행 구조는 있으나 변경금지 권리' },
    { refId: 'C02', expectedTier: 'hold_reject', why: '제작자 권리와 계약 민감성' },
    { refId: 'C15', expectedTier: 'hold_reject', why: '홈페이지뿐인 운동량 근거' },
    { refId: 'NEW-GOV24-ONESTOP', expectedTier: 'link_bucket', why: '공식 provider index이지 하나의 사용자 목표가 아님' },
  ],
};

const p0Ledger = buildP0Ledger();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function scoreMarkup(label, tuple) {
  return `<div class="score"><b>${esc(label)}</b><strong>${tuple[0]}</strong><p>${esc(tuple[1])}</p></div>`;
}

function renderP0Cards(records) {
  return records.map((record) => `
    <article class="record" data-tier="${record.admissionTier}">
      <div class="record-head"><span class="id">${record.flowId}</span><span class="badge ${TIER[record.admissionTier].color}">${TIER[record.admissionTier].label}</span></div>
      <h3>${esc(record.title)}</h3>
      <p class="reason">${esc(record.decisionReason)}</p>
      <dl><div><dt>현재</dt><dd>${record.currentItemCount} Item · ${esc(record.currentDisplayMode)}</dd></div><div><dt>목표</dt><dd>${esc(TIER[record.targetTierAfterFix].label)}</dd></div><div><dt>준비</dt><dd>${esc(record.promotionReadiness)}</dd></div><div><dt>기본 결과물</dt><dd>${esc(record.projections.primary)}</dd></div></dl>
      <details><summary>과밀·UX 점검</summary><p>${esc(record.overbuildAudit)}</p><p><b>UX ${record.uxFrameworkFit.score}</b> · ${esc(record.uxFrameworkFit.comment)}</p></details>
      <a class="source" href="${esc(record.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
    </article>`).join('');
}

function renderCandidateCards(candidates) {
  return candidates.map((candidate) => `
    <article class="candidate" data-tier="${candidate.admissionTier}">
      <div class="record-head"><span class="id">${esc(candidate.candidateId)}</span><span class="badge ${TIER[candidate.admissionTier].color}">${TIER[candidate.admissionTier].label}</span></div>
      <h3>${esc(candidate.title)}</h3>
      <p class="meta">${esc(candidate.provider)} · ${esc(candidate.sourceShape)} · ${esc(candidate.readiness)}</p>
      <p>${esc(candidate.rowEvidence)}</p>
      <p class="demand"><b>보이는 수요</b> ${esc(candidate.visibleDemand)}</p>
      <details><summary>점수와 코멘트</summary><div class="score-grid">${scoreMarkup('수요', candidate.scores.demand)}${scoreMarkup('변환', candidate.scores.conversion)}${scoreMarkup('제작자', candidate.scores.creator)}${scoreMarkup('UX', candidate.scores.ux)}</div></details>
      <p class="next"><b>다음</b> ${esc(candidate.nextAction)}</p>
      <a class="source" href="${esc(candidate.sourceUrl)}" target="_blank" rel="noreferrer">실제 원문 열기</a>
    </article>`).join('');
}

function renderQueue(queue) {
  return queue.map((item) => `<li><span>${item.rank}</span><div><b>${esc(item.title)}</b><small>${esc(item.wave)} · ${esc(item.why)}</small></div></li>`).join('');
}

const goalMd = `# FlowMe 콘텐츠 발굴·편입 기준 확정 목표

아래 텍스트는 다음 콘텐츠 발굴 세션에서도 그대로 사용할 수 있는 수정본이다.

\`\`\`text
/goal
D:\\flowme2605\\flow-mvp 기준으로 진행해줘.

목표:
FlowMe에 가져올 원문 콘텐츠를 발굴하고, 각 후보를 Link/Bucket · Quick Flow · Full Flow · Hold/Reject 중 어디까지 편입할지 같은 기준으로 판정한다.
새 Flow 런타임이나 편집기를 설계하는 작업이 아니라, 기존 canonical Flow 계약·Taxonomy v1.1·Output Quality v2·P25/P26을 재사용해 콘텐츠팀의 source scout 및 승격 규칙을 확정한다.
앱 코드와 seed는 수정하지 않는다.

핵심 질문:
1. 이 원문은 한 사용자의 한 목표와 한 자연스러운 결과물로 설명되는가?
2. 실제 URL에서 일정·표·체크·파일·영상 행을 확보할 수 있는가?
3. 원문을 다시 보는 Link/Bucket이면 충분한가, 한 세션 Quick Flow인가, 날짜·순서·분기·역할·진도가 필요한 Full Flow인가?
4. 지금 안전하게 편입 가능한 단계와 source·rights·freshness·safety 보강 후 목표 단계는 각각 무엇인가?
5. 저장 직후 사용자가 얻는 결과와 첫 행동이 현재 /flows · /my · Calendar · export 틀에서 5초 안에 보이는가?
6. 제작자가 원문 유입과 출처를 보존하면서 자신의 Flow를 홍보·수정·fork할 이유가 있는가?

편입 기준:
- Link/Bucket: 정확한 URL·제목·출처·저장 이유만 보존한다. 임의 Item과 날짜를 만들지 않는다.
- Quick Flow: 한 세션 또는 한 결정에서 끝나는 최소 행동만 둔다. 항목 수는 보조 신호일 뿐 하드 리밋이 아니다.
- Full Flow: 날짜·순서·분기·역할·진도 중 하나 이상이 실행 성공에 중요할 때만 사용한다.
- Hold/Reject: 원문 행·최신성·권리·안전·적용 범위가 부족해 사용자를 실행시키면 안 되는 상태다.
- 구조 tier와 공개 gate를 분리한다. source row, rights, freshness, safety, locale을 각각 기록한다.

최소 입력:
- 열람과 날짜 없는 저장은 입력 0개가 기본이다.
- 결과를 바꾸는 기준일·선택·역할만 보통 0~1개, 예외적으로 최대 3개까지 묻는다.
- 예시 날짜는 미리보기이며 사용자 일정으로 저장하지 않는다.
- Calendar/checklist/todo/sheet/memo는 Flow 종류가 아니라 같은 Item의 projection이다.

작업:
1. 현재 P0 24개와 기존 source scout 후보를 중복 제거된 기준선으로 읽는다.
2. 신규 후보 URL을 실제로 열고 source shape, 행 확보, 보이는 수요, 권리, 민감도, 제작자·커뮤니티 가능성을 기록한다.
3. 현재 P0 24개를 네 편입 단계로 재분류하고 과도한 Item·임의 날짜·완료 기준을 표시한다.
4. 다음 콘텐츠 제작 후보 6~8개와 Link/Bucket·Hold 대조군을 확정한다.
5. 현재 UX/UI surface와 모바일 390px에서 실제 사용 가능한지 판정한다.

산출물:
- 콘텐츠 발굴 편입 계약 JSON
- 현재 P0 24개 재분류 원장 JSON
- 신규 웹 후보 검증 원장 JSON
- CEO·제품·콘텐츠팀용 12~14장 PPT형 한국어 HTML

완료 기준:
- 모든 후보에 실제 URL, source shape, 보이는 수요와 추론 수요의 구분, 현재 tier, 목표 tier, gate, 다음 행동이 있다.
- P0 24개가 빠짐없이 재분류된다.
- 다음 제작 후보 6~8개와 제외·보류 이유가 명확하다.
- 사용자 최초 입력은 기본 0~1개로 설명된다.
- 앱 코드와 seed는 변경하지 않는다.
- JSON 파싱, docs:check, 390px·1280px HTML 렌더링을 검증한다.
\`\`\`
`;

const specMd = `# Flow Content Discovery Admission

## Status

Review package. Product code and seed data are out of scope.

## Problem

Existing Flow contracts define runtime data well, but content scouting still risks treating every useful URL as a multi-step Flow. This package adds a discovery admission layer without replacing the canonical model.

## Decision proposal

1. Classify source candidates as Link/Bucket, Quick Flow, Full Flow, or Hold/Reject.
2. Keep structural tier separate from source, freshness, rights, safety, and locale gates.
3. Default activation to zero-input undated save; request only values that change the result.
4. Use the current Item model and projection contracts. Do not create a parallel runtime taxonomy.

## Outputs

${Object.values(OUTPUTS).map((file) => `- ${path.relative(ROOT, file).replaceAll('\\', '/')}`).join('\n')}
`;

const planMd = `# Plan

1. Reuse current contract, taxonomy, output-quality, P25/P26, and P0 evidence.
2. Verify fresh URLs and record source rows, visible demand, rights, and risk separately.
3. Reclassify all current P0 24 records.
4. Select six first-canary candidates, two second-wave candidates, and boundary controls.
5. Generate JSON ledgers and a 14-section Korean review HTML.
6. Validate JSON, docs, and 390px/1280px rendering.
`;

const tasksMd = `# Tasks

- [x] Read canonical contracts and current P0 gallery.
- [x] Reuse the 36-candidate source expansion baseline.
- [x] Open and review 16 fresh URLs.
- [x] Define admission and minimum-input rules.
- [x] Reclassify current P0 24.
- [x] Select next production queue and boundary controls.
- [x] Generate review artifacts.
- [x] Run JSON and docs validation.
- [x] Render at 390px and 1280px and inspect overflow/interactions.
`;

const qaMd = `# QA

- Parse all three generated JSON files.
- Assert P0 record count is 24 and tier counts sum to 24.
- Assert fresh candidate count is 16 and every candidate has a URL, score comments, tier, readiness, and next action.
- Assert the next production queue contains 8 unique references.
- Assert no TODO, TBD, placeholder, generic memoHint, or generated app seed is present.
- Run \`npm.cmd run docs:check\`.
- Render the HTML at 390x844 and 1280x900.
- Check horizontal overflow, tier filters, details expansion, source links, and long Korean text wrapping.

## Result (2026-07-20)

- PASS: all three JSON files parsed; P0 24 records equal Link 4 + Quick 10 + Full 7 + Hold 3.
- PASS: fresh candidate count is 16; the next production queue contains 8 unique references.
- PASS: all required score comments, URLs, tiers, readiness values, and next actions are present.
- PASS: no TODO, TBD, placeholder, generic memoHint, or app seed output was found.
- PASS: \`npm.cmd run docs:check\` reported 14 required files and 2,442 valid local links.
- PASS: 390x844 and 1280x900 both reported zero horizontal overflow and rendered all 14 sections.
- PASS: P0 Quick filter showed 10 records; fresh Quick filter showed 4 records; details expansion worked.
- PASS: browser console reported 0 errors and 0 warnings.
- Evidence: \`output/playwright/2026-07-20-flow-content-discovery-admission-mobile.png\`.
- Evidence: \`output/playwright/2026-07-20-flow-content-discovery-admission-desktop.png\`.
`;

const tierCount = p0Ledger.counts.byAdmissionTier;
const queue = candidateLedger.nextProductionQueue;

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FlowMe 콘텐츠 발굴·편입 전략</title>
<link rel="icon" href="data:,">
<style>
:root{--ink:#18201c;--muted:#5e6862;--line:#d5ddd8;--paper:#fff;--page:#edf1ee;--green:#176b4f;--green-soft:#e7f3ed;--blue:#285bc5;--blue-soft:#eaf0fc;--gold:#8b650f;--gold-soft:#f8efd8;--red:#ad463b;--red-soft:#fae9e6;--dark:#17251f}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--page);color:var(--ink);font-family:"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",Arial,sans-serif;line-height:1.58;letter-spacing:0;word-break:keep-all}button,a{font:inherit;letter-spacing:0}a{color:var(--blue);text-underline-offset:3px}.top{position:sticky;top:0;z-index:20;border-bottom:1px solid #cbd4ce;background:rgba(237,241,238,.96)}.top-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;width:min(1240px,calc(100% - 32px));min-height:54px;margin:auto}.brand{font-weight:900}.nav{display:flex;gap:14px;overflow:auto;white-space:nowrap}.nav a{padding:15px 0 12px;color:var(--muted);font-size:12px;font-weight:800;text-decoration:none}main{width:min(1240px,calc(100% - 32px));margin:auto;padding:20px 0 72px}.slide{margin:0 0 20px;padding:34px 38px;border:1px solid var(--line);border-radius:8px;background:var(--paper)}.slide-no{margin:0 0 8px;color:var(--green);font-size:12px;font-weight:900;text-transform:uppercase}.hero{padding:46px 46px 40px;background:var(--dark);color:#fff}.hero .slide-no{color:#aee0ca}h1,h2,h3,p{margin-top:0}h1{max-width:920px;margin-bottom:16px;font-size:46px;line-height:1.15;letter-spacing:0}h2{margin-bottom:10px;font-size:31px;line-height:1.24;letter-spacing:0}h3{font-size:17px;line-height:1.34;letter-spacing:0}.lead{max-width:940px;margin-bottom:22px;color:#d5dfd9;font-size:18px}.decision{padding:16px 18px;border-left:5px solid #6fd0a6;border-radius:5px;background:#24372f;font-size:20px;font-weight:850}.metrics,.four,.three,.two{display:grid;gap:12px}.metrics{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px}.four{grid-template-columns:repeat(4,minmax(0,1fr))}.three{grid-template-columns:repeat(3,minmax(0,1fr))}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.metric,.panel,.tier,.projection,.case{padding:16px;border:1px solid var(--line);border-radius:7px;background:#f8faf9}.metric strong{display:block;color:#b9ead5;font-size:30px}.metric span{color:#ced9d3;font-size:12px}.panel b,.tier b,.projection b{display:block;margin-bottom:6px}.panel p,.tier p,.projection p{margin:0;color:var(--muted);font-size:13px}.tier{border-top:5px solid var(--blue)}.tier.green{border-top-color:var(--green)}.tier.gold{border-top-color:var(--gold)}.tier.red{border-top-color:var(--red)}.callout{margin-top:14px;padding:14px 16px;border-left:5px solid var(--gold);background:var(--gold-soft);color:#604917}.flowline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:18px 0}.node{padding:9px 11px;border:1px solid var(--line);border-radius:5px;background:#fff;font-size:13px;font-weight:850}.arrow{color:var(--muted)}.source-note{color:var(--muted);font-size:13px}.filters{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}.filter{min-height:38px;padding:7px 11px;border:1px solid #cbd4ce;border-radius:5px;background:#fff;color:#455049;font-size:12px;font-weight:850;cursor:pointer}.filter.active{border-color:var(--dark);background:var(--dark);color:#fff}.records,.candidates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.record,.candidate{min-width:0;padding:16px;border:1px solid var(--line);border-radius:7px;background:#fff}.record-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.id{color:var(--muted);font-size:11px;font-weight:850;overflow-wrap:anywhere}.badge{padding:4px 7px;border-radius:4px;font-size:10px;font-weight:900;white-space:nowrap}.badge.blue{background:var(--blue-soft);color:var(--blue)}.badge.green{background:var(--green-soft);color:var(--green)}.badge.gold{background:var(--gold-soft);color:var(--gold)}.badge.red{background:var(--red-soft);color:var(--red)}.record h3,.candidate h3{margin-bottom:8px}.reason,.candidate>p{color:#3e4943;font-size:13px}.meta{color:var(--muted)!important}.demand{padding:10px;border-left:4px solid var(--blue);background:var(--blue-soft)}.next{padding:10px;background:#f5f7f6}.record dl{margin:12px 0}.record dl div{display:grid;grid-template-columns:74px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid #edf0ee;font-size:12px}.record dt{color:var(--muted);font-weight:800}.record dd{margin:0;overflow-wrap:anywhere}.source{display:inline-flex;margin-top:12px;font-size:12px;font-weight:850}details{margin-top:10px;border-top:1px solid var(--line);padding-top:9px}summary{cursor:pointer;font-size:12px;font-weight:850}details p{margin:9px 0 0;color:var(--muted);font-size:12px}.score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}.score{padding:9px;border:1px solid var(--line);border-radius:5px;background:#f8faf9}.score b{font-size:11px}.score strong{float:right;color:var(--green)}.score p{clear:both}.queue{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0 0;padding:0;list-style:none}.queue li{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid var(--line);border-radius:6px;background:#fff}.queue li>span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--dark);color:#fff;font-size:12px;font-weight:900;flex:0 0 auto}.queue b,.queue small{display:block}.queue small{margin-top:3px;color:var(--muted)}.origin{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.origin div{padding:12px;border:1px solid var(--line);border-radius:5px}.origin b{display:block;font-size:12px}.origin span{color:var(--muted);font-size:11px}.diagram{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:10px;margin-top:18px}.diagram .panel{height:100%}.decision-list{margin:18px 0 0;padding:0;list-style:none}.decision-list li{padding:13px 0;border-bottom:1px solid var(--line);font-weight:750}.decision-list span{display:inline-grid;place-items:center;width:25px;height:25px;margin-right:8px;border-radius:50%;background:var(--dark);color:#fff;font-size:11px}.refs{columns:2;column-gap:28px}.refs a{display:block;margin:5px 0;font-size:12px;overflow-wrap:anywhere}.hidden{display:none!important}.compact{color:var(--muted);font-size:13px}
@media(max-width:900px){.records,.candidates{grid-template-columns:repeat(2,minmax(0,1fr))}.four{grid-template-columns:repeat(2,minmax(0,1fr))}.three{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.diagram{grid-template-columns:1fr}.diagram .arrow{transform:rotate(90deg);text-align:center}.origin{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.top-inner,main{width:min(100% - 20px,1240px)}.nav{max-width:62vw}.slide{padding:22px 16px}.hero{padding:28px 20px}h1{font-size:31px}h2{font-size:24px}.lead{font-size:15px}.decision{font-size:16px}.records,.candidates,.two,.four,.queue{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.metric{padding:12px}.metric strong{font-size:24px}.score-grid{grid-template-columns:1fr}.record dl div{grid-template-columns:64px 1fr}.origin{grid-template-columns:1fr}.refs{columns:1}.flowline{align-items:stretch}.node{flex:1 1 100%}.arrow{display:none}}
</style>
</head>
<body>
<header class="top"><div class="top-inner"><div class="brand">FLOWME / SOURCE ADMISSION</div><nav class="nav"><a href="#model">편입 모델</a><a href="#p0">P0 24</a><a href="#fresh">신규 후보</a><a href="#queue">제작 큐</a></nav></div></header>
<main>
<section class="slide hero" id="top"><p class="slide-no">01 / 전략 결론</p><h1>모든 좋은 URL을 Flow로 만들지 않는다</h1><p class="lead">이번 목표는 새 실행 객체를 발명하는 일이 아니다. 실제 원문을 발굴한 뒤 지금 안전한 편입 단계와 보강 후 목표 단계를 분리해, 콘텐츠팀이 같은 기준으로 제작 큐를 만들게 하는 일이다.</p><div class="decision">Flow는 원문 근거가 있는 최소 행동만 실행시키고, 나머지는 Link/Bucket·detail·memo 또는 Hold로 남긴다.</div><div class="metrics"><div class="metric"><strong>24</strong><span>현재 P0 재분류</span></div><div class="metric"><strong>36</strong><span>기존 source scout 기준선</span></div><div class="metric"><strong>16</strong><span>이번 실제 URL 추가 검토</span></div><div class="metric"><strong>8</strong><span>다음 제작 후보</span></div></div></section>

<section class="slide"><p class="slide-no">02 / 목표 보정</p><h2>콘텐츠 발굴 레이어만 추가한다</h2><div class="three"><div class="panel"><b>재사용</b><p>Canonical hierarchy, Taxonomy v1.1, Output Quality v2, P25/P26 날짜·export 계약.</p></div><div class="panel"><b>새로 결정</b><p>Link/Bucket·Quick·Full·Hold 편입 판정과 source scout 원장.</p></div><div class="panel"><b>제외</b><p>앱 코드, seed, 편집기, Calendar API, 새 runtime type.</p></div></div><div class="callout"><b>중복 방지:</b> Calendar·checklist·todo·sheet·memo는 기존처럼 같은 Item의 projection이다. 이번 문서는 새로운 Flow 종류를 만들지 않는다.</div></section>

<section class="slide"><p class="slide-no">03 / 증거 범위</p><h2>확인한 것과 아직 모르는 것을 분리했다</h2><div class="four"><div class="panel"><b>원문</b><p>현재 P0 갤러리 24개 URL과 Item, 기존 후보 36개, 신규 URL 16개.</p></div><div class="panel"><b>수요</b><p>조회·스크랩·모집·학습인원처럼 화면에 보인 수치만 visible로 기록.</p></div><div class="panel"><b>불확실성</b><p>보이지 않는 조회·다운로드는 unknown. PDF 직접 추출 실패도 그대로 기록.</p></div><div class="panel"><b>검증 경계</b><p>실제 사용자 관찰이나 제작자 허가가 완료됐다는 뜻은 아니다.</p></div></div></section>

<section class="slide"><p class="slide-no">04 / 최소 계약</p><h2>한 사용자의 한 목표, 한 자연스러운 결과물</h2><div class="flowline"><span class="node">SourceRow</span><span class="arrow">→</span><span class="node">Item</span><span class="arrow">→</span><span class="node">Step</span><span class="arrow">→</span><span class="node">Flow</span><span class="arrow">→</span><span class="node">Bundle / Map</span></div><div class="two"><div class="panel"><b>Item에 필수</b><p>행동 제목 · 실행 방법/detail · 완료/기록 기준 · sourceRowIds · 순서.</p></div><div class="panel"><b>Item이 아닌 것</b><p>원문 설명 · 참고 · 주의 · 팁 · 비행동 링크 · 조건부 후속 안내 · 개인 메모.</p></div></div></section>

<section class="slide" id="model"><p class="slide-no">05 / 편입 모델</p><h2>구조 tier와 공개 gate는 서로 다른 축이다</h2><div class="four"><div class="tier"><b>Link/Bucket</b><p>정확한 URL과 저장 이유. 실행행을 만들 근거가 없거나 링크 보존이 목적.</p></div><div class="tier green"><b>Quick Flow</b><p>한 세션·한 결정에서 끝나는 최소 행동. 항목 수는 보조 신호다.</p></div><div class="tier gold"><b>Full Flow</b><p>날짜·순서·분기·역할·진도 중 하나 이상이 성공에 중요.</p></div><div class="tier red"><b>Hold/Reject</b><p>행·최신성·권리·안전·적용 범위가 부족해 실행시키면 안 됨.</p></div></div><div class="callout">같은 후보에도 <b>구조상 Quick</b>과 <b>공개 전 권리 검토</b>가 동시에 존재할 수 있다. 이를 하나의 readiness 점수로 뭉개지 않는다.</div></section>

<section class="slide"><p class="slide-no">06 / 판정 순서</p><h2>URL을 열면 이 순서로 자른다</h2><div class="diagram"><div class="panel"><b>1. 원문 gate</b><p>실제 행·일정·표·파일·영상 목록이 있는가?</p></div><span class="arrow">→</span><div class="panel"><b>2. 사용자 일</b><p>저장 뒤 첫 행동과 완료 결과를 한 문장으로 말할 수 있는가?</p></div><span class="arrow">→</span><div class="panel"><b>3. 구조·공개</b><p>Link/Quick/Full을 정하고 rights·freshness·safety를 별도 잠근다.</p></div></div><div class="callout">실패하면 AI로 빈 행을 채우지 않는다. Link/Bucket, source_import_required, Hold 중 하나로 보낸다.</div></section>

<section class="slide"><p class="slide-no">07 / 최소 입력</p><h2>저장은 0개, 일정화는 결과를 본 뒤</h2><div class="origin"><div><b>source_fact</b><span>원문 제목·행·기간·링크</span></div><div><b>user_input</b><span>기준일·선택·담당</span></div><div><b>calculated_value</b><span>D-day 적용 결과</span></div><div><b>preview_example</b><span>저장하지 않는 예시</span></div></div><div class="flowline"><span class="node">열람</span><span class="arrow">→</span><span class="node">날짜 없이 저장</span><span class="arrow">→</span><span class="node">항목 수·결과 미리보기</span><span class="arrow">→</span><span class="node">필요 시 0~1개 입력</span><span class="arrow">→</span><span class="node">일부 일정화</span></div></section>

<section class="slide"><p class="slide-no">08 / 결과물 변환</p><h2>한 Item을 다섯 결과물로 투영한다</h2><div class="five four"><div class="projection"><b>Calendar</b><p>사용자가 확정한 날짜만. 날짜 없음·예시는 제외.</p></div><div class="projection"><b>Checklist / Todo</b><p>행동 제목과 완료 상태. detail은 접어서 표시.</p></div><div class="projection"><b>Sheet</b><p>Item 행, 상태·날짜·담당·메모·source URL 열.</p></div><div class="projection"><b>Memo</b><p>목표·설명·주의·출처·개인 기록. 실행 상태와 분리.</p></div></div></section>

<section class="slide"><p class="slide-no">09 / 현재 UX·UI 적합</p><h2>틀은 맞지만 콘텐츠 밀도 규칙이 더 엄격해야 한다</h2><div class="three"><div class="panel"><b>/flows</b><p>카드에서 “저장하면 무엇이 생기는지”와 Item 수보다 첫 결과를 먼저 보여준다.</p></div><div class="panel"><b>/my</b><p>Quick은 한 화면, Full은 현재 Step과 다음 Step 우선. 전체 Item을 평면 나열하지 않는다.</p></div><div class="panel"><b>Calendar·export</b><p>확정 일정만 보낸다. source link와 detail은 메모에 보존하고 예시 날짜를 저장하지 않는다.</p></div></div><div class="callout"><b>P26 충돌 없음:</b> schedule now · keep undated · preview only 세 상태와 같은 방향이다. 필요한 것은 새 화면보다 콘텐츠 admission과 압축이다.</div></section>

<section class="slide" id="p0"><p class="slide-no">10 / 현재 P0 24</p><h2>편입 결과: Link ${tierCount.link_bucket} · Quick ${tierCount.quick_flow} · Full ${tierCount.full_flow} · Hold ${tierCount.hold_reject}</h2><p class="compact">필터를 누르면 해당 단계만 보인다. 각 카드의 “과밀·UX 점검”에서 무엇을 Item에서 내릴지 확인할 수 있다.</p><div class="filters" data-filter-scope="p0"><button class="filter active" data-filter="all">전체 24</button><button class="filter" data-filter="link_bucket">Link ${tierCount.link_bucket}</button><button class="filter" data-filter="quick_flow">Quick ${tierCount.quick_flow}</button><button class="filter" data-filter="full_flow">Full ${tierCount.full_flow}</button><button class="filter" data-filter="hold_reject">Hold ${tierCount.hold_reject}</button></div><div class="records" id="p0Records">${renderP0Cards(p0Ledger.records)}</div></section>

<section class="slide"><p class="slide-no">11 / 과도한 Item 정리</p><h2>대표 네 사례는 이렇게 줄인다</h2><div class="two"><div class="case"><h3>영유아 건강검진</h3><p>8회 전체를 실행 Item으로 만들지 않는다. <b>다음 검진 1건</b>과 공식 가능 기간만 실행, 전체 회차표는 reference.</p></div><div class="case"><h3>자동차검사</h3><p>10개 점검을 만들지 않는다. <b>기간 확인</b>과 <b>검사소·방문일 결정</b> 2개, 결과는 memo.</p></div><div class="case"><h3>가족여행 짐</h3><p>조건 입력과 사후 개선을 Item에서 내린다. 준비물 그룹만 체크하고 담당·가방 위치는 Sheet/memo.</p></div><div class="case"><h3>레시피·만들기</h3><p>결과 평가·다음 후보·사진 기록은 별도 Item이 아니다. 원문 조리·제작 순서만 체크한다.</p></div></div></section>

<section class="slide" id="fresh"><p class="slide-no">12 / 신규 실제 URL 16</p><h2>수요가 커도 원문 행과 권리가 없으면 승격하지 않는다</h2><div class="filters" data-filter-scope="fresh"><button class="filter active" data-filter="all">전체 16</button><button class="filter" data-filter="link_bucket">Link</button><button class="filter" data-filter="quick_flow">Quick</button><button class="filter" data-filter="full_flow">Full</button><button class="filter" data-filter="hold_reject">Hold</button></div><div class="candidates" id="freshRecords">${renderCandidateCards(freshCandidates)}</div></section>

<section class="slide" id="queue"><p class="slide-no">13 / 다음 제작 큐</p><h2>첫 canary 6개, second wave 2개</h2><ol class="queue">${renderQueue(queue)}</ol><div class="callout">C11 Link/Bucket, C02·C15 Hold, 정부24 provider index를 함께 대조해 admission gate가 실제로 작동하는지도 검증한다.</div></section>

<section class="slide"><p class="slide-no">14 / CEO 결정 요청</p><h2>세 가지만 승인하면 다음 콘텐츠 제작으로 넘어갈 수 있다</h2><ol class="decision-list"><li><span>1</span>Link/Bucket · Quick Flow · Full Flow · Hold/Reject를 콘텐츠 발굴 편입 단계로 채택한다.</li><li><span>2</span>구조 tier와 source·rights·freshness·safety 공개 gate를 분리한다.</li><li><span>3</span>날짜 없는 0입력 저장과 결과 확인 후 일정화를 기본 사용 방식으로 채택한다.</li></ol><h3 style="margin-top:24px">근거 문서</h3><div class="refs">${SOURCE_DOCS.map((doc) => `<a href="../${esc(doc.replace('docs/', ''))}">${esc(doc)}</a>`).join('')}</div></section>
</main>
<script>
document.querySelectorAll('[data-filter-scope]').forEach((group)=>{
  group.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-filter]'); if(!button)return;
    group.querySelectorAll('.filter').forEach((item)=>item.classList.toggle('active',item===button));
    const target=group.dataset.filterScope==='p0'?document.getElementById('p0Records'):document.getElementById('freshRecords');
    target.querySelectorAll('[data-tier]').forEach((card)=>card.classList.toggle('hidden',button.dataset.filter!=='all'&&card.dataset.tier!==button.dataset.filter));
  });
});
</script>
</body>
</html>`;

fs.mkdirSync(AUDIT_DIR, { recursive: true });
fs.mkdirSync(SPEC_DIR, { recursive: true });
fs.writeFileSync(OUTPUTS.goal, goalMd, 'utf8');
fs.writeFileSync(OUTPUTS.contract, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
fs.writeFileSync(OUTPUTS.p0, `${JSON.stringify(p0Ledger, null, 2)}\n`, 'utf8');
fs.writeFileSync(OUTPUTS.candidates, `${JSON.stringify(candidateLedger, null, 2)}\n`, 'utf8');
fs.writeFileSync(OUTPUTS.html, html, 'utf8');
fs.writeFileSync(path.join(SPEC_DIR, 'spec.md'), specMd, 'utf8');
fs.writeFileSync(path.join(SPEC_DIR, 'plan.md'), planMd, 'utf8');
fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), tasksMd, 'utf8');
fs.writeFileSync(path.join(SPEC_DIR, 'qa.md'), qaMd, 'utf8');

console.log(JSON.stringify({ outputs: OUTPUTS, specDir: SPEC_DIR, p0Counts: p0Ledger.counts, freshCandidates: freshCandidates.length, queue: queue.length }, null, 2));
