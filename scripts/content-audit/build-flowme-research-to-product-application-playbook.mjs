import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');

const output = {
  html: path.join(docsDir, '2026-07-28-flowme-research-to-product-application-playbook-ceo-ko.html'),
  matrix: path.join(docsDir, '2026-07-28-flowme-research-to-product-decision-matrix.json'),
  handoff: path.join(docsDir, '2026-07-28-flowme-research-to-product-team-handoff-ko.md'),
  scenarios: path.join(docsDir, '2026-07-28-flowme-research-to-product-scenario-contract.json'),
};

const requiredInputs = [
  '2026-07-18-flowme-flow-content-model-category-playbook-ceo-ko.html',
  '2026-07-20-flowme-four-modes-p0-24-gallery-ko.html',
  '2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko.html',
  '2026-07-22-flow-content-value-qualified-benchmark-v1-ko.html',
  '2026-07-27-flowme-content-supply-potential-ceo-ko.html',
  '2026-07-27-flowme-content-supply-estimation-model.json',
  '2026-07-27-flowme-content-personal-adoption-evidence-ceo-ko.html',
  '2026-07-27-flowme-content-personal-adoption-evidence-ledger.json',
  '2026-07-27-flowme-current-content-adoption-evidence-map.json',
  '2026-07-28-flow-item-map-architecture-qualified-portfolio-fit-review-v2-ko.html',
  '2026-07-28-vertical-execution-service-review-ko.html',
  '2026-07-28-vertical-execution-service-benchmark-v1.json',
];

for (const name of requiredInputs) {
  const file = path.join(docsDir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing required input: ${file}`);
}

const supplyModel = JSON.parse(
  fs.readFileSync(path.join(docsDir, '2026-07-27-flowme-content-supply-estimation-model.json'), 'utf8'),
);
const adoptionMap = JSON.parse(
  fs.readFileSync(path.join(docsDir, '2026-07-27-flowme-current-content-adoption-evidence-map.json'), 'utf8'),
);
const adoptionEvidence = JSON.parse(
  fs.readFileSync(path.join(docsDir, '2026-07-27-flowme-content-personal-adoption-evidence-ledger.json'), 'utf8'),
);
const verticalBenchmark = JSON.parse(
  fs.readFileSync(path.join(docsDir, '2026-07-28-vertical-execution-service-benchmark-v1.json'), 'utf8'),
);

const generatedAt = '2026-07-29T10:38:01+09:00';
const checkedAt = '2026-07-29';

const evidenceLabels = {
  repository_fact: '저장소 확인',
  external_official: '외부 공식 자료',
  public_reaction: '공개 사용자 반응',
  strategic_inference: '전략적 판단',
  hypothesis_unmeasured: '가설·미측정',
};

const sourceDocs = [
  {
    id: 'product-principles',
    title: '제품 원칙',
    href: '../PRODUCT_PRINCIPLES.md',
    role: '결과물 우선, 외부 도구 연결, Stage 0 원칙',
    evidenceType: 'repository_fact',
  },
  {
    id: 'service-structure',
    title: '현재 서비스 구조',
    href: '../SERVICE_STRUCTURE.md',
    role: '/flows, 공개 Flow, 캘린더, 내 Flow의 현재 책임',
    evidenceType: 'repository_fact',
  },
  {
    id: 'canonical-spec',
    title: '정식 Flow 데이터 모델 명세',
    href: '../specs/2026-07-11-canonical-flow-data-model/spec.md',
    role: 'SourceRow → Item → Step → Flow → Map/Bundle 및 결과물 변환 원칙',
    evidenceType: 'repository_fact',
  },
  {
    id: 'content-model',
    title: 'Flow 콘텐츠 모델·카테고리 플레이북',
    href: './2026-07-18-flowme-flow-content-model-category-playbook-ceo-ko.html',
    role: '좋은 Flow의 구성과 카테고리 사례',
    evidenceType: 'strategic_inference',
  },
  {
    id: 'four-modes',
    title: '네 가지 시작 방식과 P0 24개 갤러리',
    href: './2026-07-20-flowme-four-modes-p0-24-gallery-ko.html',
    role: '저장·즉시 실행·전체 계획·보류의 사례',
    evidenceType: 'strategic_inference',
  },
  {
    id: 'vertical-atlas',
    title: '버티컬 서비스 콘텐츠 도감',
    href: './2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko.html',
    role: '27개 서비스와 실제 콘텐츠의 FlowMe 수용 범위',
    evidenceType: 'external_official',
  },
  {
    id: 'value-benchmark',
    title: '콘텐츠 가치·수요 엄격 품질 검토',
    href: './2026-07-22-flow-content-value-qualified-benchmark-v1-ko.html',
    role: '원본과 실행 결과물의 품질 기준',
    evidenceType: 'strategic_inference',
  },
  {
    id: 'supply',
    title: '콘텐츠 공급 잠재량',
    href: './2026-07-27-flowme-content-supply-potential-ceo-ko.html',
    role: '153개 원재고, 44개 대표 후보, 60~90개 P0 가설',
    evidenceType: 'repository_fact',
  },
  {
    id: 'adoption',
    title: '외부 콘텐츠 개인 실행 전환 증거',
    href: './2026-07-27-flowme-content-personal-adoption-evidence-ceo-ko.html',
    role: 'E2 결과물 수요와 E3 이상 실행 자기보고',
    evidenceType: 'public_reaction',
  },
  {
    id: 'adoption-map',
    title: '현재 콘텐츠와 외부 실행 증거 매핑',
    href: './2026-07-27-flowme-current-content-adoption-evidence-map.json',
    role: '기존 P0 24개와 현재 대표 후보의 증거 수준',
    evidenceType: 'public_reaction',
  },
  {
    id: 'architecture',
    title: 'Item·Map·결과물 구조 재검토',
    href: './2026-07-28-flow-item-map-architecture-qualified-portfolio-fit-review-v2-ko.html',
    role: '하나의 실행 상태와 여러 결과물의 관계',
    evidenceType: 'repository_fact',
  },
  {
    id: 'vertical-execution',
    title: '24개 전문 실행 서비스 비교',
    href: './2026-07-28-vertical-execution-service-review-ko.html',
    role: '최소 입력, 결과 미리보기, 다음 행동, 수정·완료 패턴',
    evidenceType: 'external_official',
  },
  {
    id: 'user-feedback',
    title: '최근 사용자 피드백 종합',
    href: './2026-07-26-flowme-user-feedback-synthesis-ko.txt',
    role: '긴 화면, 불명확한 저장 결과, 한 화면 한 Flow 필요성',
    evidenceType: 'strategic_inference',
  },
];

const inventorySnapshot = {
  checkedAt,
  rawBundles: supplyModel.repositorySnapshot.bundles,
  sections: supplyModel.repositorySnapshot.sections,
  items: supplyModel.repositorySnapshot.items,
  categoryStrings: supplyModel.repositorySnapshot.distinctCategoryStrings,
  representativeEligible: supplyModel.repositorySnapshot.publicHandling.representativeEligible,
  currentlyBrowseable: 7,
  observedSessionsDone: 0,
  observedSessionsTarget: 15,
  sourceStatus: supplyModel.repositorySnapshot.sourceStatus,
  lifecycle: supplyModel.repositorySnapshot.lifecycle,
  p0Evidence: adoptionMap.summary.p0,
  evidenceBasis: [
    '2026-07-28 저장소 재집계',
    '2026-07-28 /flows 로컬 렌더링',
    '2026-07-27 외부 공개 반응 매핑',
  ],
};

const conflictResolutions = [
  {
    id: 'market-focus',
    question: '육아·여행 중심인가, 루틴·레시피·프로젝트 중심인가?',
    evidence: '육아·여행은 유입 맥락이 넓지만 고정 댓글 표본의 실행 자기보고는 운동·루틴이 더 강했다.',
    resolution:
      '카테고리 하나를 전문 앱처럼 소유하지 않는다. 집·생활 루틴, 제작자 프로그램, 레시피·식단을 세 개의 검증 경로로 운영하고 육아·여행은 이 경로가 쓰이는 상황으로 활용한다.',
    evidenceTypes: ['public_reaction', 'strategic_inference'],
  },
  {
    id: 'inventory-count',
    question: '153개, 44개, 60~90개 중 무엇이 현재 콘텐츠 수인가?',
    evidence: '153개는 원재고, 44개는 대표 노출 가능 후보, 현재 /flows 탐색 화면은 7개다.',
    resolution:
      '지금의 제품 지표는 “검증용 대표 Flow 6~8개”로 둔다. 60~90개는 사용성과 제작 운영이 확인된 뒤의 재고 목표이며 출시 선행조건이 아니다.',
    evidenceTypes: ['repository_fact', 'hypothesis_unmeasured'],
  },
  {
    id: 'p0-24-evidence',
    question: '기존 P0 24개는 수요가 검증된 콘텐츠인가?',
    evidence: '직접 증거 1개, 같은 유형의 인접 증거 19개, 공개 반응 미확인 4개다.',
    resolution:
      '24개는 비교 후보군으로 유지한다. 직접 증거가 없는 항목은 콘텐츠 품질과 과업 적합성을 따로 확인하며 “검증 완료”라고 부르지 않는다.',
    evidenceTypes: ['public_reaction', 'repository_fact'],
  },
  {
    id: 'content-types',
    question: '7개 Flow 유형을 각각 다른 제품 모델로 만들어야 하는가?',
    evidence: '현재 정식 명세는 Item 하나의 상태를 여러 결과물로 변환하고, 일정·반복·분기 등은 축으로 다룬다.',
    resolution:
      '7개 유형은 콘텐츠팀의 점검표로만 남긴다. 제품에서는 하나의 Item 모델과 네 가지 시작 방식만 사용한다.',
    evidenceTypes: ['repository_fact', 'strategic_inference'],
  },
  {
    id: 'export-vs-native',
    question: '외부 도구로 보내는가, FlowMe 안에서 관리하는가?',
    evidence: '현재 저장소에는 내 Flow 완료·메모·재사용과 캘린더·체크리스트·시트·메모 변환이 함께 존재한다.',
    resolution:
      'P0는 외부 결과물과 가벼운 실행 상태를 모두 허용하되, 사용자가 돌아오는 이유가 확인되기 전에는 무거운 통합 계획 도구로 확장하지 않는다.',
    evidenceTypes: ['repository_fact', 'strategic_inference'],
  },
  {
    id: 'creator-platform',
    question: '제작자 플랫폼을 지금 만들어야 하는가?',
    evidence: '외부 공개 반응은 있으나 FlowMe 관찰 세션은 0/15이며, 27개 제작자 후보 중 공개 가능한 정식 후보는 매우 제한적이었다.',
    resolution:
      '초기에는 FlowMe가 제작을 지원하고 제작자는 출처·검토·링크로 참여한다. 직접 발행 도구와 수익 배분은 소비자 실행과 제작자 재참여가 확인된 뒤로 미룬다.',
    evidenceTypes: ['repository_fact', 'hypothesis_unmeasured'],
  },
];

const applyNow = [
  {
    proposalId: 'P-01',
    id: 'one-canonical-item',
    title: '하나의 실행 항목을 기준으로 삼기',
    decision:
      '체크 가능한 행동 제목, 필요한 상세 설명, 원문 추적 정보를 기본으로 한다. 일정·장소·비용·담당자·반복은 필요할 때만 붙인다.',
    reason: '현재 정식 명세와 외부 도구 변환 원칙이 일치한다.',
    evidenceTypes: ['repository_fact'],
  },
  {
    proposalId: 'P-02',
    id: 'undated-is-valid',
    title: '날짜 없는 저장을 정상 흐름으로 인정하기',
    decision: '박물관·영상·레시피처럼 날짜가 정해지지 않은 콘텐츠는 먼저 저장하고 나중에 일정을 붙인다.',
    reason: '날짜 없는 실행 항목은 현재 ICS에서도 일정으로 만들지 않는 규칙이 있다.',
    evidenceTypes: ['repository_fact', 'strategic_inference'],
  },
  {
    proposalId: 'P-03',
    id: 'result-first',
    title: '결과부터 보여주고 입력은 최소화하기',
    decision:
      '사용자가 받을 체크리스트·일정·표·메모를 먼저 보여준다. 결과를 바꾸는 날짜·지역·월령 같은 정보만 0~1개 먼저 받는다.',
    reason: '24개 전문 실행 서비스 비교와 최근 UX 피드백의 공통 결론이다.',
    evidenceTypes: ['external_official', 'strategic_inference'],
  },
  {
    proposalId: 'P-04',
    id: 'natural-arrival',
    title: '콘텐츠마다 가장 자연스러운 결과물 하나를 먼저 정하기',
    decision: '저장·체크·일정·기록 중 기본 결과물 하나를 먼저 고르고, 다른 형식은 같은 실행본에서 파생한다.',
    reason: '캘린더·체크리스트·시트·메모를 별도 콘텐츠로 만들면 상태가 갈라진다.',
    evidenceTypes: ['repository_fact', 'strategic_inference'],
  },
  {
    proposalId: 'P-05',
    id: 'source-separation',
    title: '원문·제작자·개인 실행 기록을 분리하기',
    decision:
      '원문과 제작자 표시는 보존하고, FlowMe 편집 내용과 사용자의 비공개 수정·완료·메모를 별도 층으로 관리한다.',
    reason: '권리와 최신성, 재사용 관계를 동시에 지키는 최소 경계다.',
    evidenceTypes: ['repository_fact', 'strategic_inference'],
  },
  {
    proposalId: 'P-06',
    id: 'one-flow-screen',
    title: '한 화면에서는 한 Flow와 다음 행동에 집중하기',
    decision: '긴 콘텐츠 목록보다 현재 Flow의 결과, 첫 행동, 원문, 저장 또는 실행 버튼을 우선한다.',
    reason: '최근 화면 피드백에서 반복된 이해 방해 요인이다.',
    evidenceTypes: ['strategic_inference'],
  },
  {
    proposalId: 'P-07',
    id: 'remove-fake-popularity',
    title: '근거 없는 인기순을 즉시 없애기',
    decision:
      '실제 이벤트가 쌓이기 전에는 인기순을 사용하지 않는다. 큐레이션·최근 확인·가나다순처럼 설명 가능한 정렬만 쓴다.',
    reason: '현재 seed의 생성 수치로 /flows 인기순이 계산된다.',
    evidenceTypes: ['repository_fact'],
  },
];

const validateBeforeApply = [
  {
    id: 'category-focus',
    title: '세 개 검증 경로의 우선순위',
    decision: '집·생활 루틴, 제작자 프로그램, 레시피·식단 중 실제 저장·실행률이 높은 순서로 확대한다.',
    validation: '경로별 5명, 총 15명의 관찰 세션',
    evidenceTypes: ['public_reaction', 'hypothesis_unmeasured'],
  },
  {
    id: 'save-later-date',
    title: '저장 후 날짜 정하기',
    decision: '날짜 미정 콘텐츠의 핵심 P0 후보지만, 버튼 이름과 다시 찾는 위치는 관찰로 확인한다.',
    validation: '사용자가 도움 없이 저장하고 나중에 일정을 붙이는지 확인',
    evidenceTypes: ['strategic_inference', 'hypothesis_unmeasured'],
  },
  {
    id: 'date-window',
    title: '가능 기간과 마감 표현',
    decision: '영유아 검진·자동차검사에는 필요하지만 날짜 범위를 한눈에 이해하는지 확인해야 한다.',
    validation: '종류, 시작일, 마감일, 예약 행동을 정확히 설명하는지 확인',
    evidenceTypes: ['repository_fact', 'hypothesis_unmeasured'],
  },
  {
    id: 'repeat-and-reuse',
    title: '반복 완료와 다시 사용',
    decision: '기술 기반은 있으나 사용자가 회차와 전체 Flow의 완료를 구분하는지 확인한다.',
    validation: '한 회차 완료, 다음 회차 확인, 전체 재시작 과업',
    evidenceTypes: ['repository_fact', 'hypothesis_unmeasured'],
  },
  {
    id: 'creator-value',
    title: '제작자 표시와 원문 유입 가치',
    decision: '제작자가 링크를 붙이고 다시 업데이트할 이유가 되는지 실제 제작자 대화로 확인한다.',
    validation: '제작 지원 파일럿에서 링크 클릭·저장·수정 요청의 효용 확인',
    evidenceTypes: ['strategic_inference', 'hypothesis_unmeasured'],
  },
];

const defer = [
  {
    id: 'role-collaboration',
    title: '가족·팀 역할 분담',
    reason: '콘텐츠 필드로는 유용하지만 P0의 저장·실행 흐름보다 뒤에 있다.',
    revisit: '한 Flow를 두 명 이상이 실제로 함께 쓰는 사례가 반복될 때',
  },
  {
    id: 'creator-publisher',
    title: '제작자 직접 발행 도구',
    reason: '현재는 제작 지원과 검토가 품질·권리 위험을 낮춘다.',
    revisit: '제작자 5명 이상이 두 번째 Flow를 요청하거나 직접 수정하려 할 때',
  },
  {
    id: 'direct-sync',
    title: 'OAuth·양방향 동기화',
    reason: '내보내기와 가벼운 저장으로 핵심 수요를 먼저 확인할 수 있다.',
    revisit: '같은 외부 도구로 반복 내보내는 사용이 측정될 때',
  },
  {
    id: 'marketplace',
    title: '유료 Flow 마켓',
    reason: '공급·품질·권리·수요가 확인되지 않은 상태에서 거래 기능이 앞서면 운영 비용만 커진다.',
    revisit: '유료 원본 제작자와 반복 사용자 집단이 동시에 확인될 때',
  },
];

const doNotApply = [
  '모든 콘텐츠를 복잡한 다단계 계획으로 만들기',
  '원문에 없는 일정·준비물·행동을 그럴듯하게 채우기',
  '날짜 없는 행동에 임의 일정을 강제하기',
  '결과를 보여주기 전에 많은 개인정보와 설정을 요구하기',
  'AI 초안을 제작자가 검토한 경험처럼 표시하기',
  '조회수·댓글·자동 QA를 FlowMe 사용 검증으로 부르기',
  '가짜 사용량·후기·인기 순위를 노출하거나 정렬에 사용하기',
  '원문 영상·사진·강의와 버티컬 앱의 전문 기능을 복제하기',
  'P0에서 예약·결제·지도·전문 판단·마켓플레이스를 직접 운영하기',
  '개인 실행본과 단순 버전을 공개 콘텐츠 수에 중복 계산하기',
];

const admissionModes = [
  {
    id: 'link_bucket',
    label: '저장만 하기',
    userCopy: '일단 저장',
    rule: '한 개 행동과 원문 링크면 충분하다. 날짜는 나중에 붙일 수 있다.',
    example: '아이와 국립중앙박물관 가보기',
    initialInputs: 0,
    defaultArrival: '메모·버킷',
  },
  {
    id: 'quick_flow',
    label: '바로 실행하기',
    userCopy: '지금 시작',
    rule: '1~5개의 체크 또는 참고 메모로 바로 쓸 수 있다.',
    example: '공룡 발자국 미술 놀이',
    initialInputs: 0,
    defaultArrival: '체크리스트·메모',
  },
  {
    id: 'full_flow',
    label: '계획으로 펼치기',
    userCopy: '날짜를 넣고 시작',
    rule: '기준일·기간·반복처럼 결과를 바꾸는 정보 1개를 받고 전체 실행본을 만든다.',
    example: '이사 D-30 준비',
    initialInputs: 1,
    defaultArrival: '캘린더·체크·표',
  },
  {
    id: 'hold',
    label: '검토 전 보류',
    userCopy: '원문 확인 필요',
    rule: '원문 행, 권리, 최신성 또는 안전 근거가 부족하면 항목을 만들어 채우지 않는다.',
    example: '출처와 항목이 맞지 않는 건강 루틴',
    initialInputs: 0,
    defaultArrival: '미리보기만 또는 비공개 검토',
  },
];

const canonicalContentContract = {
  definition:
    'Flow는 특정 상황에서 바로 실행할 수 있도록 출처를 확인한 행동 항목과 필요한 실행 정보가 묶인 재사용 가능한 기준본이다.',
  hierarchy: [
    {
      level: 'SourceRow',
      korean: '원문에서 확인한 근거',
      rule: '원문에 실제로 있는 사실·행동·조건만 기록한다.',
    },
    {
      level: 'Item',
      korean: '독립적으로 체크하거나 기록할 행동',
      rule: '행동 제목, 상세 설명, 출처 추적이 기본이다.',
    },
    {
      level: 'Step',
      korean: '필요할 때만 쓰는 묶음',
      rule: '여러 Item을 이해하는 데 도움이 될 때만 사용한다.',
    },
    {
      level: 'Flow',
      korean: '하나의 사용자 목적',
      rule: '한 Flow에는 한 가지 사용자 상황과 한 가지 기본 결과물이 있다.',
    },
    {
      level: 'Map/Bundle',
      korean: '여러 Flow의 탐색 지도',
      rule: '실행 상태를 복제하지 않고 관련 Flow를 연결한다.',
    },
    {
      level: 'PersonalRun',
      korean: '사용자에게 적용된 개인 실행본',
      rule: '날짜, 담당자, 완료, 개인 메모는 비공개 상태로 분리한다.',
    },
  ],
  requiredItemFields: ['actionTitle', 'detail', 'sourceTrace'],
  optionalItemFields: [
    'date',
    'time',
    'dateWindow',
    'location',
    'materials',
    'cost',
    'assignee',
    'repeatRule',
    'branchCondition',
    'completionCriteria',
    'caution',
    'externalActionUrl',
  ],
  projectionRules: [
    {
      condition: '날짜·시간·마감이 핵심',
      destination: 'calendar',
      korean: '캘린더',
      guardrail: '날짜 없는 Item은 일정으로 만들지 않는다.',
    },
    {
      condition: '독립 행동의 누락 방지가 핵심',
      destination: 'checklist',
      korean: '체크리스트',
      guardrail: '설명이나 링크만 있는 행을 억지로 할 일로 만들지 않는다.',
    },
    {
      condition: '여러 회차·값·상태 비교가 핵심',
      destination: 'sheet',
      korean: '표',
      guardrail: '기록 열은 실제 사용자 판단에 필요한 것만 둔다.',
    },
    {
      condition: '원문 참고·요약·결정 기록이 핵심',
      destination: 'memo',
      korean: '메모',
      guardrail: '원문 전체를 복제하지 않고 링크와 필요한 요점만 남긴다.',
    },
  ],
};

const scenarios = [
  {
    id: 'museum-bucket',
    label: '아이와 박물관 가보기',
    category: '육아·외출',
    admissionMode: 'link_bucket',
    sourceShape: '블로그·영상·장소 소개',
    minimumItem: {
      actionTitle: '아이와 국립중앙박물관 가보기',
      detail: '가보고 싶은 이유와 원문에서 확인한 핵심 한 줄',
      completion: '방문했거나 관심이 없어져 목록에서 정리함',
    },
    optionalFields: ['location', 'estimatedDuration', 'laterDate'],
    minimumInputs: [],
    defaultArrival: ['memo'],
    progression: '저장 → 날짜가 생기면 캘린더 일정 추가 → 방문 후 메모',
    currentSupport: 'partial',
    currentSupportKo: '날짜 없는 실행 항목과 개인 메모는 가능하나 “나중에 일정 추가” 진입을 화면마다 통일해야 한다.',
    additionalDevelopment: ['저장만 하기 CTA', '내 Flow의 일정 추가 진입'],
    externalBoundary: '운영시간·예약·지도는 원문 또는 지도 서비스에서 확인한다.',
    evidenceTypes: ['strategic_inference', 'repository_fact'],
  },
  {
    id: 'craft-video',
    label: '만들기 영상 따라 하기',
    category: '취미·만들기',
    admissionMode: 'quick_flow',
    sourceShape: '제작자 영상·블로그',
    minimumItem: {
      actionTitle: '공룡 발자국 미술 놀이 해보기',
      detail: '원문에 나온 준비물과 핵심 주의사항, 영상 링크',
      completion: '만들기를 끝내고 결과 사진 또는 짧은 메모를 남김',
    },
    optionalFields: ['materials', 'estimatedDuration', 'laterDate'],
    minimumInputs: [],
    defaultArrival: ['checklist', 'memo'],
    progression: '지금 실행 또는 저장 → 준비물 확인 → 원문을 보며 실행',
    currentSupport: 'partial',
    currentSupportKo: '체크·메모·원문 링크는 가능하다. 원문에 없는 제작 단계를 채우지 않는 콘텐츠 검수가 필요하다.',
    additionalDevelopment: ['지금 시작/저장만 하기 분리'],
    externalBoundary: '영상과 이미지 자산은 제작자 플랫폼에 남긴다.',
    evidenceTypes: ['public_reaction', 'strategic_inference'],
  },
  {
    id: 'recipe-meal-plan',
    label: '레시피와 주간 식단',
    category: '요리·식사',
    admissionMode: 'quick_flow',
    sourceShape: '제작자 레시피·레시피 묶음',
    minimumItem: {
      actionTitle: '야채 참치 볶음 만들기',
      detail: '재료·분량·조리 핵심과 원문 링크',
      completion: '요리를 끝내거나 다음 식단에서 제외함',
    },
    optionalFields: ['servings', 'materials', 'cookTime', 'weekStart'],
    minimumInputs: [],
    defaultArrival: ['memo', 'checklist'],
    progression: '단일 레시피는 메모 → 여러 레시피를 고르면 식단표와 장보기 목록으로 확장',
    currentSupport: 'partial',
    currentSupportKo: '메모·체크·시트 변환은 가능하다. 선택한 레시피를 장보기 목록으로 합치는 로직은 추가가 필요하다.',
    additionalDevelopment: ['레시피 묶음 선택', '장보기 항목 합치기'],
    externalBoundary: '원문 레시피·영상·식료품 주문은 외부에 남긴다.',
    evidenceTypes: ['public_reaction', 'repository_fact'],
  },
  {
    id: 'moving-d30',
    label: '이사 D-30 준비',
    category: '이사·생활',
    admissionMode: 'full_flow',
    sourceShape: '출처가 있는 이사 체크리스트',
    minimumItem: {
      actionTitle: '이사 방식과 견적 후보 정하기',
      detail: '이사 방식 한 가지와 비교할 후보를 정한다.',
      completion: '방식과 후보가 기록됨',
    },
    optionalFields: ['anchorDate', 'dayOffset', 'contact', 'cost', 'completionCriteria'],
    minimumInputs: ['moveDate'],
    defaultArrival: ['calendar', 'checklist', 'memo'],
    progression: '전체 결과 미리보기 → 이사일 입력 → 날짜별 실행 → 완료·재사용',
    currentSupport: 'supported',
    currentSupportKo: '현재 공개 Flow Map에서 결과 미리보기, 기준일 입력, 저장, 내 Flow 실행을 확인했다.',
    additionalDevelopment: ['화면별 같은 저장 영수증과 결과물 표현'],
    externalBoundary: '업체 견적·예약·결제는 외부 서비스에서 한다.',
    evidenceTypes: ['repository_fact'],
  },
  {
    id: 'family-trip',
    label: '가족 여행 준비',
    category: '여행·외출',
    admissionMode: 'link_bucket',
    sourceShape: '여행지 콘텐츠·장소 모음',
    minimumItem: {
      actionTitle: '공주 가족여행 후보로 저장하기',
      detail: '가고 싶은 장소와 원문 링크',
      completion: '여행 후보에서 선택하거나 제외함',
    },
    optionalFields: ['destination', 'travelDates', 'participants', 'packingList'],
    minimumInputs: [],
    defaultArrival: ['memo'],
    progression: '목적지 저장 → 날짜가 정해지면 일정·예약·짐 준비 Flow로 확장',
    currentSupport: 'partial',
    currentSupportKo: '목적지 저장과 메모는 가능하지만 날짜가 생긴 뒤 여러 Flow로 확장하는 안내는 표준화되지 않았다.',
    additionalDevelopment: ['저장본에서 날짜 입력', '관련 준비 Flow 제안'],
    externalBoundary: '지도 동선, 실시간 가격, 예약은 여행 서비스에 남긴다.',
    evidenceTypes: ['public_reaction', 'strategic_inference'],
  },
  {
    id: 'infant-checkup-window',
    label: '영유아 건강검진 기간 확인',
    category: '육아·공식',
    admissionMode: 'full_flow',
    sourceShape: '국민건강보험공단 공식 안내',
    minimumItem: {
      actionTitle: '4차 영유아 건강검진 예약하기',
      detail: '검진 종류와 공식 검진 가능 기간을 확인한다.',
      completion: '예약 정보를 기록했거나 공식 사이트에서 대상 여부를 다시 확인함',
    },
    optionalFields: ['checkupType', 'dateWindow', 'reservationDate', 'officialUrl', 'caution'],
    minimumInputs: ['childBirthDateOrOfficialWindow'],
    defaultArrival: ['calendar', 'checklist'],
    progression: '검진 종류·가능 기간 표시 → 예약일 선택 → 공식 예약/확인',
    currentSupport: 'partial',
    currentSupportKo: 'date_window와 내보내기 기반은 있으나 종류·범위·예약일을 구분하는 화면 검증이 필요하다.',
    additionalDevelopment: ['날짜 범위 전용 표시', '검진 종류 라벨', '공식 확인 CTA'],
    externalBoundary: '대상 판정·의료 상담·예약 완료는 공식·의료 서비스에서 한다.',
    evidenceTypes: ['repository_fact', 'external_official'],
  },
  {
    id: 'vehicle-inspection-window',
    label: '자동차검사 기한 관리',
    category: '자동차·공식',
    admissionMode: 'full_flow',
    sourceShape: '한국교통안전공단 공식 안내',
    minimumItem: {
      actionTitle: '자동차검사 예약 마감일 확인하기',
      detail: '검사 종류, 검사 가능 기간, 챙길 사항을 공식 출처에서 확인한다.',
      completion: '예약일과 준비사항을 기록함',
    },
    optionalFields: ['inspectionType', 'dateWindow', 'reservationDate', 'documents', 'officialUrl'],
    minimumInputs: ['officialInspectionWindow'],
    defaultArrival: ['calendar', 'checklist', 'memo'],
    progression: '가능 기간 확인 → 마감 알림 → 예약 링크 → 결과 메모',
    currentSupport: 'partial',
    currentSupportKo: '기간 데이터와 예약·결과 메모 기반은 있으나 사용자가 기간과 예약일을 혼동하지 않는지 확인해야 한다.',
    additionalDevelopment: ['기간/예약일 시각 분리', '검사 종류 표시'],
    externalBoundary: '검사 대상 판정과 예약은 공단에서 완료한다.',
    evidenceTypes: ['repository_fact', 'external_official'],
  },
  {
    id: 'care-routine',
    label: '청소·식물 관리 반복 루틴',
    category: '집·생활',
    admissionMode: 'full_flow',
    sourceShape: '공식 관리 안내·제작자 루틴',
    minimumItem: {
      actionTitle: '세탁기 필터 청소하기',
      detail: '원문에 나온 청소 대상과 안전 주의사항',
      completion: '이번 회차 청소를 끝내고 다음 점검을 남김',
    },
    optionalFields: ['repeatRule', 'lastDoneAt', 'nextDueAt', 'conditionMemo'],
    minimumInputs: ['startDateOrLastDoneAt'],
    defaultArrival: ['checklist', 'calendar'],
    progression: '기본 주기 확인 → 이번 회차 완료 → 다음 회차 생성 → 필요 시 주기 수정',
    currentSupport: 'partial',
    currentSupportKo: '반복 규칙·완료·재사용 기반은 있으나 회차와 전체 Flow의 상태 설명을 단순화해야 한다.',
    additionalDevelopment: ['회차 중심 완료 UI', '다음 회차 한 줄 미리보기'],
    externalBoundary: '센서·진단·날씨 기반 자동 주기 계산은 전문 서비스에 남긴다.',
    evidenceTypes: ['repository_fact', 'external_official'],
  },
  {
    id: 'career-application',
    label: '채용 공고 지원 관리',
    category: '학습·커리어',
    admissionMode: 'link_bucket',
    sourceShape: '채용 공고 URL',
    minimumItem: {
      actionTitle: '지원할 공고로 저장하기',
      detail: '회사·직무·공고 링크와 다음 확인 행동',
      completion: '지원·보류·탈락·종료 상태가 기록됨',
    },
    optionalFields: ['company', 'role', 'deadline', 'status', 'followUpDate'],
    minimumInputs: [],
    defaultArrival: ['sheet', 'checklist'],
    progression: 'URL 저장 → 상태 추가 → 마감·후속 일정 설정 → 결과 기록',
    currentSupport: 'partial',
    currentSupportKo: 'URL-first와 시트·체크·날짜 필드는 있으나 지원 상태용 간단한 흐름은 아직 표준 콘텐츠로 묶이지 않았다.',
    additionalDevelopment: ['상태 필드', '후속 행동 템플릿'],
    externalBoundary: '공고 데이터베이스, ATS 점수, 채용 추천은 만들지 않는다.',
    evidenceTypes: ['external_official', 'strategic_inference'],
  },
  {
    id: 'family-role',
    label: '가족 행사 역할 나누기',
    category: '가족·행사',
    admissionMode: 'full_flow',
    sourceShape: '제작자 행사 준비 콘텐츠',
    minimumItem: {
      actionTitle: '생일 케이크 주문하기',
      detail: '주문 기준과 원문 링크',
      completion: '주문 정보가 기록되고 담당자가 확인함',
    },
    optionalFields: ['eventDate', 'assignee', 'handoffStatus', 'cost', 'contact'],
    minimumInputs: ['eventDate'],
    defaultArrival: ['checklist', 'calendar'],
    progression: '행사일 입력 → 할 일 확인 → 담당자 지정 → 전달 확인',
    currentSupport: 'missing',
    currentSupportKo: '날짜·체크는 가능하지만 담당자와 전달 상태는 정식 공통 모델로 확정되지 않았다.',
    additionalDevelopment: ['담당자 필드', '전달 확인 상태'],
    externalBoundary: '메신저 관계망과 공동 편집 권한 체계는 P1 이후다.',
    evidenceTypes: ['strategic_inference', 'hypothesis_unmeasured'],
  },
  {
    id: 'passport-official',
    label: '여권 발급·갱신 준비',
    category: '공식 절차',
    admissionMode: 'quick_flow',
    sourceShape: '외교부·정부 공식 안내',
    minimumItem: {
      actionTitle: '여권 신청 준비사항 확인하기',
      detail: '내 상황에 필요한 서류와 공식 신청 경로를 확인한다.',
      completion: '서류를 준비하고 공식 신청 단계로 이동함',
    },
    optionalFields: ['applicationType', 'documents', 'visitDate', 'officialUrl', 'checkedAt'],
    minimumInputs: ['applicationType'],
    defaultArrival: ['checklist', 'memo'],
    progression: '신청 유형 선택 → 서류 확인 → 방문 일정 선택 → 공식 사이트·기관에서 완료',
    currentSupport: 'partial',
    currentSupportKo: '체크리스트·메모·공식 링크는 가능하다. 유형별 조건과 최신 확인일을 첫 화면에서 더 명확히 보여줘야 한다.',
    additionalDevelopment: ['신청 유형 분기', '공식 확인일 강조'],
    externalBoundary: '자격 판단·수수료·예약·접수는 공식 기관에서 확인한다.',
    evidenceTypes: ['repository_fact', 'external_official'],
  },
  {
    id: 'learning-course',
    label: '강의·학습 과정 실행',
    category: '학습·커리어',
    admissionMode: 'full_flow',
    sourceShape: '공개 강의 목차·제작자 시리즈',
    minimumItem: {
      actionTitle: 'WEB1 첫 강의 듣고 실습하기',
      detail: '공개 목차의 강의 제목, 실습 링크, 완료 기준',
      completion: '강의 시청과 해당 실습을 마침',
    },
    optionalFields: ['courseOrder', 'targetDate', 'repeatDays', 'progress', 'retryMemo'],
    minimumInputs: [],
    defaultArrival: ['checklist', 'sheet'],
    progression: '전체 목차 확인 → 다음 강의 실행 → 개인 진도 기록 → 다시 시작',
    currentSupport: 'partial',
    currentSupportKo: '단원 체크·진도·재사용은 가능하다. 원본 플랫폼 진도와 FlowMe 개인 기록을 분리해 보여줘야 한다.',
    additionalDevelopment: ['다음 학습 한 줄', '원본 진도/개인 기록 라벨'],
    externalBoundary: '강의 재생·문제 출제·적응형 학습 엔진은 원본 서비스에 남긴다.',
    evidenceTypes: ['repository_fact', 'public_reaction'],
  },
];

const scenarioUiExamples = {
  'museum-bucket': {
    state: '날짜 미정',
    source: '국립중앙박물관 어린이박물관 이용 안내 · 발행 전 원문 확인',
    result: '가볼 곳 저장 + 원문',
    title: '아이와 국립중앙박물관 가보기',
    description: '날짜를 정하지 않아도 가보고 싶은 이유와 장소부터 남깁니다.',
    facts: [
      ['장소', '서울 용산'],
      ['예상 시간', '2~3시간 · 예시'],
    ],
    items: [
      ['방문 후보로 저장', '운영시간과 예약 여부는 원문에서 확인'],
      ['아이와 보고 싶은 전시 메모', '원문에서 고른 한 줄을 개인 메모로 저장'],
    ],
    primary: '일단 저장',
    secondary: '날짜 정하기',
    note: '저장할 때 날짜를 강제로 묻지 않습니다.',
  },
  'craft-video': {
    state: '지금 실행 가능',
    source: '제작자 만들기 영상 · 실제 발행 전 원문 검수',
    result: '준비 체크 + 원문 영상',
    title: '공룡 발자국 미술 놀이',
    description: '원문에서 확인한 준비물만 보고 바로 시작하거나 나중에 저장합니다.',
    facts: [
      ['준비', '10분 · 예시'],
      ['활동', '20분 · 예시'],
    ],
    items: [
      ['스케치북·물감·장난감 공룡 준비', '전략 예시 데이터'],
      ['영상을 보며 발자국 찍기', '영상은 제작자 플랫폼에서 재생'],
      ['결과 사진 또는 짧은 메모 남기기', '개인 기록은 비공개'],
    ],
    primary: '지금 시작',
    secondary: '저장만 하기',
    note: '재료와 순서는 원문 확인 뒤 발행합니다.',
  },
  'recipe-meal-plan': {
    state: '메모로 바로 저장',
    source: '제작자 레시피 원문 · 전략 예시 데이터',
    result: '레시피 메모 + 조리 체크',
    title: '야채 참치 볶음',
    description: '한 개 레시피는 메모로 충분하고, 식단에 넣을 때만 표와 장보기 목록으로 넓힙니다.',
    facts: [
      ['분량', '2인분 · 예시'],
      ['조리', '20분 · 예시'],
    ],
    items: [
      ['재료와 분량 확인', '원문에 표시된 수량을 그대로 유지'],
      ['조리 핵심 순서 체크', '완료 상태만 FlowMe에 저장'],
    ],
    primary: '레시피로 저장',
    secondary: '이번 주 식단에 넣기',
    note: '식단 선택 시에만 같은 재료를 장보기 목록으로 합칩니다.',
  },
  'moving-d30': {
    state: '기준일 적용',
    source: 'FlowMe source-backed 이사 준비 기준본',
    result: '일정 + 체크 + 메모',
    title: '이사 D-30 준비',
    description: '전체 결과를 먼저 본 뒤 이사일 하나를 넣으면 날짜별 실행본이 만들어집니다.',
    facts: [
      ['이사일', '2026.09.27 · 예시 입력'],
      ['시작', 'D-30부터'],
    ],
    items: [
      ['이사 방식과 견적 후보 정하기', 'D-30 · 첫 행동'],
      ['불필요한 물건 분류하기', 'D-21 · 체크리스트'],
      ['주소 변경 목록 확인하기', 'D-7 · 메모 포함'],
    ],
    primary: '이 일정으로 저장',
    secondary: '이사일 바꾸기',
    note: '업체 견적과 결제는 외부 서비스에서 진행합니다.',
  },
  'family-trip': {
    state: '여행 후보',
    source: '한국관광공사·제작자 여행 원문 조합 전 검수 필요',
    result: '목적지 저장 + 원문',
    title: '공주 가족여행 후보',
    description: '시간표를 만들기 전에 가고 싶은 장소부터 저장합니다.',
    facts: [
      ['지역', '충남 공주'],
      ['날짜', '아직 정하지 않음'],
    ],
    items: [
      ['공산성', '목적지만 저장 · 시간은 나중에'],
      ['국립공주박물관', '운영 정보는 원문에서 확인'],
    ],
    primary: '여행 후보로 저장',
    secondary: '날짜 정하고 준비 열기',
    note: '지도 동선, 가격, 예약은 여행 서비스에 남깁니다.',
  },
  'infant-checkup-window': {
    state: '공식 확인 필요',
    source: '국민건강보험공단 공식 안내 · 대상 조회 결과 필요',
    result: '기간 확인 + 예약 행동',
    title: '4차 영유아 건강검진',
    description: '검진 종류, 가능한 기간, 실제 예약일을 서로 다른 정보로 보여줍니다.',
    facts: [
      ['검진 가능 기간', '2026.08.12–2027.02.11 · 예시 입력'],
      ['예약일', '아직 정하지 않음'],
    ],
    items: [
      ['공식 대상 여부 다시 확인', '생년월일과 공단 조회 결과 기준'],
      ['검진 기관 선택', '예약은 의료기관 또는 공식 경로에서 완료'],
    ],
    primary: '예약일 정하기',
    secondary: '공식 정보 확인',
    note: '기간은 예시입니다. 의료 판단과 대상 판정은 하지 않습니다.',
  },
  'vehicle-inspection-window': {
    state: '기한 관리',
    source: '한국교통안전공단 공식 안내 · 차량별 조회 필요',
    result: '기간 + 마감 알림 + 준비',
    title: '정기 자동차검사',
    description: '검사 가능 기간과 예약일을 분리하고 꼭 챙길 사항만 남깁니다.',
    facts: [
      ['검사 가능 기간', '2026.09.01–2026.10.31 · 예시 입력'],
      ['예약일', '아직 정하지 않음'],
    ],
    items: [
      ['검사 종류와 기간 확인', '차량별 공식 조회 결과 기준'],
      ['필수 준비사항 확인', '공식 안내에서 확인한 항목만 표시'],
    ],
    primary: '예약일 정하기',
    secondary: '공단 예약 열기',
    note: '검사 대상 판정과 예약 완료는 공단에서 진행합니다.',
  },
  'care-routine': {
    state: '이번 회차',
    source: '제조사 관리 안내 · 모델별 원문 확인 필요',
    result: '반복 체크 + 다음 점검',
    title: '세탁기 필터 청소',
    description: '전체 계획보다 지금 해야 할 한 회차와 다음 점검만 보여줍니다.',
    facts: [
      ['이번 회차', '2026.08.02 · 예시 입력'],
      ['다음 점검', '4주 후 · 예시 규칙'],
    ],
    items: [
      ['전원과 급수 상태 확인', '제조사 안전 안내 우선'],
      ['필터 분리·세척·재장착', '모델별 원문을 보며 실행'],
    ],
    primary: '이번 회차 완료',
    secondary: '주기 바꾸기',
    note: '완료하면 다음 회차를 만들고 지난 기록은 유지합니다.',
  },
  'career-application': {
    state: '지원 후보',
    source: '채용 공고 URL · 전략 예시',
    result: '지원 표 + 후속 행동',
    title: '제품기획자 채용 공고',
    description: '공고를 저장한 뒤 상태와 마감, 다음 행동만 관리합니다.',
    facts: [
      ['마감', '2026.08.14 · 예시 입력'],
      ['상태', '관심'],
    ],
    items: [
      ['지원 여부 판단', '공고 원문과 자격 요건 확인'],
      ['포트폴리오 맞춤 점검', '후속 행동으로 추가'],
    ],
    primary: '지원 후보로 저장',
    secondary: '마감 알림 추가',
    note: '공고 수집, ATS 점수, 채용 추천은 FlowMe가 만들지 않습니다.',
  },
  'family-role': {
    state: '역할 분담 · P1 후보',
    source: '제작자 행사 준비 콘텐츠 · 전략 예시',
    result: '담당 체크 + 행사일',
    title: '가족 생일 준비',
    description: '행사일을 기준으로 누가 무엇을 맡았는지 한눈에 확인합니다.',
    facts: [
      ['행사일', '2026.08.23 · 예시 입력'],
      ['참여', '가족 3명 · 예시'],
    ],
    items: [
      ['케이크 주문', '담당: 아빠 · 전달 전'],
      ['식사 장소 예약', '담당: 엄마 · 확인 전'],
      ['초대 연락', '담당: 나 · 진행 중'],
    ],
    primary: '역할 확정',
    secondary: '가족에게 공유',
    note: '담당자와 전달 상태는 추가 모델 검토가 필요합니다.',
  },
  'passport-official': {
    state: '공식 절차',
    source: '외교부 여권안내 · 2026.07.29 확인 예시',
    result: '준비 체크 + 공식 링크',
    title: '성인 여권 재발급 준비',
    description: '내 신청 유형에 필요한 준비만 확인하고 실제 신청은 공식 기관에서 완료합니다.',
    facts: [
      ['신청 유형', '재발급 · 예시 선택'],
      ['방문일', '아직 정하지 않음'],
    ],
    items: [
      ['공식 필요 서류 확인', '발행 전 최신 안내에서 다시 확인'],
      ['사진 규격과 수수료 확인', 'FlowMe가 임의로 해석하지 않음'],
    ],
    primary: '준비 목록 저장',
    secondary: '공식 안내 열기',
    note: '자격 판단, 수수료 확정, 접수는 공식 기관에 남깁니다.',
  },
  'learning-course': {
    state: '개인 진도',
    source: '생활코딩 WEB1 공개 목차 · 전략 예시',
    result: '다음 학습 + 개인 진도',
    title: 'WEB1 다음 학습',
    description: '전체 강의를 복제하지 않고 다음 강의와 개인 완료 기록만 관리합니다.',
    facts: [
      ['개인 진도', '2/14 · 예시 입력'],
      ['다음', '3. HTML'],
    ],
    items: [
      ['원본 강의 열기', '강의는 원본 플랫폼에서 재생'],
      ['예제를 직접 입력해 보기', '개인 완료 기준'],
      ['막힌 점 한 줄 남기기', '비공개 메모'],
    ],
    primary: '다음 강의 시작',
    secondary: '이번 주 일정 추가',
    note: '원본 강의 진도와 FlowMe 개인 기록을 구분합니다.',
  },
};

const categoryStrategy = [
  {
    lane: '집·생활 루틴',
    role: '첫 번째 제품 검증 경로',
    whyNow: '낮은 권리·안전 위험, 반복 행동, 현재 구현 준비도가 함께 높다.',
    examples: ['세탁기 필터 청소', '공간별 청소', '이사 D-30'],
    defaultArtifacts: ['체크리스트', '캘린더'],
    decision: 'P0 집중',
    evidenceTypes: ['repository_fact', 'external_official'],
  },
  {
    lane: '제작자 프로그램',
    role: '행동 지속과 제작자 가치를 함께 확인하는 경로',
    whyNow: '운동·학습의 공개 자기보고가 상대적으로 강하고, 제작자 시리즈의 출처 행이 명확하다.',
    examples: ['정확한 운동 영상 루틴', '공개 강의 시리즈', '만들기 프로젝트'],
    defaultArtifacts: ['체크리스트', '진도표', '캘린더'],
    decision: 'P0 집중',
    evidenceTypes: ['public_reaction', 'strategic_inference'],
  },
  {
    lane: '레시피·식단',
    role: '제작자 원문과 결과물 수요를 확인하는 파트너 경로',
    whyNow: '단일 레시피는 단순 메모로 시작할 수 있고, 묶음은 장보기·식단표로 추가 가치가 생긴다.',
    examples: ['단일 레시피 메모', '주간 식단', '장보기 목록'],
    defaultArtifacts: ['메모', '체크리스트', '표'],
    decision: 'P0 파트너 파일럿',
    evidenceTypes: ['public_reaction', 'strategic_inference'],
  },
  {
    lane: '공식 필수 과업',
    role: '성장 콘텐츠와 분리된 신뢰 경로',
    whyNow: '댓글 반응보다 정확한 기간·마감·공식 링크가 가치의 핵심이다.',
    examples: ['자동차검사', '여권', '영유아 검진'],
    defaultArtifacts: ['체크리스트', '캘린더', '메모'],
    decision: '소수 운영',
    evidenceTypes: ['external_official', 'strategic_inference'],
  },
];

const p0ProofPortfolio = [
  {
    id: 'moving-d30',
    title: '이사 D-30',
    lane: '집·생활 루틴',
    sourceClass: '제작자·편집 원본',
    behavior: '기준일 입력 → 전체 일정 저장 → 첫 행동',
    artifact: '캘린더 + 체크 + 메모',
    readiness: '현재 화면 가능',
    reason: '기준일형의 대표',
  },
  {
    id: 'washer-care',
    title: '세탁기 필터 관리',
    lane: '집·생활 루틴',
    sourceClass: '공식 원본',
    behavior: '회차 완료 → 다음 점검',
    artifact: '반복 체크 + 캘린더',
    readiness: '콘텐츠 보강',
    reason: '반복형의 대표',
  },
  {
    id: 'creator-workout',
    title: '정확한 제작자 운동 영상',
    lane: '제작자 프로그램',
    sourceClass: '제작자 원본',
    behavior: '영상 선택 → 일정 또는 지금 실행 → 회차 기록',
    artifact: '체크 + 캘린더',
    readiness: '권리·문구 확인',
    reason: '제작자 시리즈의 대표',
  },
  {
    id: 'public-course',
    title: '공개 강의 시리즈',
    lane: '제작자 프로그램',
    sourceClass: '공개 제작자 원본',
    behavior: '다음 강의 확인 → 실행 → 개인 진도',
    artifact: '체크 + 진도표',
    readiness: '후보 선별',
    reason: '진도형의 대표',
  },
  {
    id: 'creator-recipe',
    title: '제작자 단일 레시피',
    lane: '레시피·식단',
    sourceClass: '제작자 원본',
    behavior: '메모 저장 → 지금 조리 또는 나중에 실행',
    artifact: '메모 + 체크',
    readiness: '직접 증거 후보 있음',
    reason: '참고형의 대표',
  },
  {
    id: 'weekly-meal',
    title: '주간 식단과 장보기',
    lane: '레시피·식단',
    sourceClass: '제작자 묶음',
    behavior: '레시피 선택 → 식단표 → 장보기',
    artifact: '표 + 체크',
    readiness: '로직 보강',
    reason: '묶음 변환 가치 확인',
  },
  {
    id: 'vehicle-window',
    title: '자동차검사 기간',
    lane: '공식 필수 과업',
    sourceClass: '공식 원본',
    behavior: '검사 종류·기간 확인 → 예약일 기록',
    artifact: '캘린더 + 체크',
    readiness: '기간 UX 보강',
    reason: '날짜 범위의 대표',
  },
  {
    id: 'museum-bucket',
    title: '박물관·체험 저장',
    lane: '육아·여행 상황',
    sourceClass: '제작자·장소 원본',
    behavior: '날짜 없이 저장 → 나중에 일정 추가',
    artifact: '메모 → 캘린더',
    readiness: 'P0 새 사례',
    reason: '날짜 미정 저장의 대표',
  },
];

const implementationInventory = [
  {
    capability: 'URL·메모 입력과 hit / review / miss 처리',
    status: 'implemented',
    statusKo: '이미 구현',
    evidence: 'components/flow/AppClient.tsx, lib/flow/url-first-lookup.ts',
    decision: '유지하되 사용자 화면에서는 내부 상태어를 숨긴다.',
  },
  {
    capability: '공개 Flow 결과 미리보기와 기준일 입력',
    status: 'partial',
    statusKo: '구현됨·정리 필요',
    evidence: '/flow-maps/moving-d30 로컬 렌더링, components/flow/AppClient.tsx',
    decision: '한 Flow, 한 결과, 한 기본 버튼 규칙으로 화면 간 표현을 맞춘다.',
  },
  {
    capability: '날짜 없는 Item을 ICS에서 제외',
    status: 'implemented',
    statusKo: '이미 구현',
    evidence: 'lib/flow/export.ts, lib/flow/export.test.ts',
    decision: '핵심 제품 규칙으로 승격한다.',
  },
  {
    capability: '날짜 범위 데이터와 내보내기',
    status: 'partial',
    statusKo: '기반 구현·UX 미확인',
    evidence: 'lib/flow/types.ts, lib/flow/export.ts, lib/flow/export.test.ts',
    decision: '검진·검사 사례로 범위와 예약일의 이해도를 확인한다.',
  },
  {
    capability: '캘린더·체크리스트·시트·메모 결과물',
    status: 'implemented',
    statusKo: '이미 구현',
    evidence: 'components/flow/FlowExportPanel.tsx, lib/flow/export.ts',
    decision: '콘텐츠별 기본 결과물 하나를 먼저 보여준다.',
  },
  {
    capability: '개인 완료·메모·날짜 수정·재사용 기록',
    status: 'implemented',
    statusKo: '이미 구현',
    evidence:
      'lib/flow/storage.ts, lib/flow/personal-draft-structural-edit.ts, tests/e2e/p24-execution-trust.spec.ts',
    decision: '기능 추가보다 이해 가능한 진입과 한 줄 다음 행동을 먼저 다듬는다.',
  },
  {
    capability: '제작자·출처·확인일 표시',
    status: 'partial',
    statusKo: '데이터 있음·표현 불균일',
    evidence: 'lib/flow/types.ts, components/flow/AppClient.tsx',
    decision: '실행 항목과 분리된 출처 블록으로 통일한다.',
  },
  {
    capability: 'SourceRow → Item → Flow 정식 계약',
    status: 'docs_only',
    statusKo: '명세 우선·런타임 전환 중',
    evidence: 'docs/specs/2026-07-11-canonical-flow-data-model/spec.md, lib/flow/types.ts',
    decision: '새 유형을 더하지 말고 다음 seed 정리의 기준으로 사용한다.',
  },
  {
    capability: '담당자·전달 상태',
    status: 'defer',
    statusKo: 'P1 이후',
    evidence: '현재 공통 runtime 타입에 정식 필드 없음',
    decision: '가족 공동 사용 수요가 확인된 뒤 추가한다.',
  },
  {
    capability: '인기순',
    status: 'conflict',
    statusKo: '중단 필요',
    evidence: 'lib/flow/seed-flows.ts, components/flow/AppClient.tsx',
    decision: '생성된 usage_count 기반 정렬을 제거한다.',
  },
  {
    capability: '직접 API·양방향 동기화·예약·결제·지도',
    status: 'do_not_build',
    statusKo: 'P0 비대상',
    evidence: '제품 원칙과 버티컬 서비스 경계',
    decision: '외부 링크와 내보내기로 남긴다.',
  },
];

const developmentSlices = [
  {
    proposalId: 'P-10',
    id: 'slice-1-content-admission',
    order: 1,
    name: '콘텐츠 채택 기준과 검증용 대표 Flow 정리',
    userProblem: '콘텐츠 수는 많지만 무엇을 저장하고 어떤 결과를 받는지 일관되지 않다.',
    outcome:
      '모든 후보가 저장만·바로 실행·계획으로 펼치기·보류 중 하나로 분류되고, 기본 결과물과 첫 행동이 정해진다.',
    changes: [
      '공통 Item 계약과 원문 추적 필드 확정',
      '검증용 대표 Flow 6~8개 재선정',
      '현재 153개를 유지·보강·교체·보류로 다시 분류',
      '생성 수치 기반 인기순 제거',
      '원문에 없는 행동·날짜를 채우는 콘텐츠 차단',
    ],
    likelyModules: [
      'lib/flow/types.ts',
      'lib/flow/seed-flows.ts',
      'lib/flow/content-lifecycle.ts',
      'components/flow/AppClient.tsx',
    ],
    acceptance: [
      '각 대표 Flow에 원문, 제작자 또는 공식 제공자, 확인일, 기본 결과물이 있다.',
      '날짜가 없는 후보는 날짜 없이 저장된다.',
      '출처 행이 부족한 후보는 보류된다.',
      '실제 사용 이벤트가 없으면 인기순이 없다.',
    ],
    dependencies: ['CEO의 콘텐츠 단위·세 개 검증 경로 승인'],
    collisionRisk: 'seed 및 /flows를 건드리는 다른 개발 라인과 충돌 가능성이 높아 전용 브랜치와 파일 소유권이 필요하다.',
    exclusions: ['새 편집기', '대규모 마이그레이션', '제작자 발행 도구'],
  },
  {
    proposalId: 'P-11',
    id: 'slice-2-result-first',
    order: 2,
    name: '결과부터 보고 저장·실행하는 흐름 통일',
    userProblem: '기능은 있지만 화면마다 저장 결과, 날짜 처리, 다음 행동의 표현이 다르다.',
    outcome:
      '결과 미리보기 → 저장/실행 → 필요한 입력 → 저장 확인 → 첫 행동 → 나중에 일정 추가가 같은 말과 같은 순서로 이어진다.',
    changes: [
      '한 화면 한 Flow와 한 기본 버튼',
      '날짜 없이 저장하고 나중에 일정 추가',
      '날짜 범위와 예약일 분리 표시',
      '콘텐츠별 기본 결과물 미리보기',
      '저장 확인과 내 Flow 첫 행동 연결',
      '출처·제작자·주의사항의 고정 위치',
    ],
    likelyModules: [
      'components/flow/AppClient.tsx',
      'components/flow/FlowExportPanel.tsx',
      'lib/flow/storage.ts',
      'lib/flow/export.ts',
      'tests/e2e/url-first-user-surface.spec.ts',
    ],
    acceptance: [
      '날짜 없는 저장은 VEVENT를 만들지 않는다.',
      '나중에 날짜를 붙이면 같은 Item이 한 번만 일정에 나타난다.',
      '날짜 범위와 실제 예약일이 서로 다른 라벨로 보인다.',
      '390px에서 기본 버튼과 첫 행동이 먼저 보인다.',
      '저장 후 사용자는 저장 위치와 다음 행동을 설명할 수 있다.',
    ],
    dependencies: ['Slice 1 콘텐츠 계약과 대표 사례'],
    collisionRisk: '/flows, 공개 Flow, 내 Flow, 캘린더를 함께 건드리므로 순차 개발과 E2E 기준 고정이 필요하다.',
    exclusions: ['담당자 협업', 'OAuth', '마켓플레이스', 'AI 자동 생성'],
  },
];

const observationGate = {
  proposalId: 'P-12',
  status: 'not_started',
  completed: 0,
  target: 15,
  design: '세 개 검증 경로에서 각 5명',
  primaryBehavior:
    '사용자가 설명 없이 결과물을 이해하고 저장 또는 실행한 뒤, 내 첫 행동과 날짜를 나중에 붙이는 방법을 찾을 수 있는가?',
  proposedThresholds: [
    {
      metric: '결과물 이해',
      threshold: '12/15 이상',
      note: '받게 될 결과물을 자신의 말로 설명',
    },
    {
      metric: '저장·실행 시작',
      threshold: '10/15 이상',
      note: '도움 없이 기본 버튼을 선택하고 첫 행동까지 도달',
    },
    {
      metric: '날짜 나중에 정하기',
      threshold: '해당 과업 4/5 이상',
      note: '날짜 미정 저장 후 일정 추가 위치를 찾음',
    },
    {
      metric: '출처 인지',
      threshold: '10/15 이상',
      note: '원문과 FlowMe 편집 내용을 구분',
    },
  ],
  evidenceType: 'hypothesis_unmeasured',
};

const proposalRegistry = [
  ...applyNow.map((item) => ({
    id: item.proposalId,
    group: '콘텐츠·UX 원칙',
    title: item.title,
    summary: item.decision,
  })),
  {
    id: 'P-08',
    group: '초기 전략',
    title: '세 개 검증 경로와 공식 신뢰 경로 운영',
    summary: '집·생활 루틴, 제작자 프로그램, 레시피·식단을 비교하고 공식 필수 과업은 소수의 신뢰 경로로 분리한다.',
  },
  {
    id: 'P-09',
    group: '콘텐츠 포트폴리오',
    title: '검증용 대표 Flow 8개를 먼저 완성',
    summary: '60~90개를 채우기 전에 서로 다른 행동 방식과 결과물을 대표하는 8개 Flow의 품질과 사용 흐름을 확인한다.',
  },
  {
    id: developmentSlices[0].proposalId,
    group: '개발 순서',
    title: developmentSlices[0].name,
    summary: developmentSlices[0].outcome,
  },
  {
    id: developmentSlices[1].proposalId,
    group: '개발 순서',
    title: developmentSlices[1].name,
    summary: developmentSlices[1].outcome,
  },
  {
    id: observationGate.proposalId,
    group: '검증 기준',
    title: '15명 행동 관찰 후 집중 경로 결정',
    summary: '세 개 검증 경로에서 각 5명을 관찰하고 결과 이해, 저장·실행 시작, 날짜 나중에 정하기, 출처 인지를 확인한다.',
  },
];

const uiFeedbackRegistry = scenarios.map((scenario, index) => {
  const ui = scenarioUiExamples[scenario.id];
  return {
    id: `UI-${String(index + 1).padStart(2, '0')}`,
    scenarioId: scenario.id,
    group: '화면 예시',
    title: scenario.label,
    summary: `${ui.result} · ${ui.state}`,
  };
});

const feedbackRegistry = [...proposalRegistry, ...uiFeedbackRegistry];

const ceoDecisions = [
  {
    no: 1,
    proposalIds: ['P-01'],
    question: 'Flow 콘텐츠 단위를 하나의 실행 항목(Item) 모델로 통일할 것인가?',
    recommendation: '승인',
    alternative: '7개 유형별 모델 유지',
    impact: '콘텐츠·UX·개발이 같은 상태와 결과물을 사용한다.',
  },
  {
    no: 2,
    proposalIds: ['P-02', 'P-03', 'P-04', 'P-05', 'P-06'],
    question: 'P0 여정을 결과 확인 → 저장/실행 → 최소 입력 → 첫 행동 → 재사용으로 확정할 것인가?',
    recommendation: '승인',
    alternative: '처음부터 계획 편집과 상세 설정 제공',
    impact: '첫 행동 전 이탈 요인을 줄이고 현재 기능을 재사용한다.',
  },
  {
    no: 3,
    proposalIds: ['P-08', 'P-09', 'P-12'],
    question: '집·생활 루틴, 제작자 프로그램, 레시피·식단을 세 개 검증 경로로 운영할 것인가?',
    recommendation: '승인하되 15명 관찰 후 한 경로에 더 집중',
    alternative: '육아 전문 앱 하나를 먼저 구축',
    impact: '수평 구조를 유지하면서 실제 행동 신호를 비교할 수 있다.',
  },
  {
    no: 4,
    proposalIds: ['P-07', 'P-10', 'P-11'],
    question: '다음 개발을 콘텐츠 채택 기준 정리와 결과 중심 흐름 통일 두 단계로 제한할 것인가?',
    recommendation: '승인',
    alternative: '동시에 편집기·협업·API·마켓을 개발',
    impact: '현재 개발과 충돌을 줄이고 검증 가능한 단위로 진행한다.',
  },
];

const decisionMatrix = {
  schemaVersion: '1.1.0',
  generatedAt,
  checkedAt,
  status: 'strategy_recommendation_not_user_validated',
  objective:
    '최근 조사 결과를 Flow 콘텐츠, UX, 콘텐츠 전략, 개발 우선순위의 실행 기준으로 통합한다.',
  executiveDecision:
    'FlowMe는 출처가 있는 실행 항목과 필요한 실행 정보만 구조화하고, 사용자가 결과를 먼저 본 뒤 저장·실행·최소 입력·재사용으로 이어지게 한다.',
  evidenceBoundary:
    '저장소·공식 자료·공개 사용자 반응·전략적 판단·가설을 분리했다. FlowMe 실제 관찰 세션은 0/15다.',
  inventorySnapshot,
  conflictResolutions,
  decisions: {
    applyNow,
    validateBeforeApply,
    defer,
    doNotApply,
  },
  categoryStrategy,
  p0ProofPortfolio,
  implementationInventory,
  developmentSlices,
  observationGate,
  proposalRegistry,
  uiFeedbackRegistry,
  ceoDecisions,
  sourceDocs,
};

const scenarioContract = {
  schemaVersion: '1.1.0',
  generatedAt,
  checkedAt,
  status: 'strategy_contract_examples_not_published_content',
  definition: canonicalContentContract.definition,
  canonicalContentContract,
  admissionModes,
  scenarios,
  scenarioUiExamples,
  uiFeedbackRegistry,
  guardrails: doNotApply,
  evidenceBoundary:
    '예시 Item은 전략 계약을 설명하기 위한 화면·데이터 예시다. 실제 발행 전에는 각 원문 행, 권리, 최신성, 안전을 다시 확인해야 한다.',
};

const handoff = `# FlowMe 조사 결과 → 제품 적용 팀 실행 기준

작성일: 2026-07-29  
상태: 전략 확정안, 실제 사용자 검증 전  
관찰 세션: 0/15

## 한눈에 보는 결론

FlowMe의 콘텐츠는 **출처가 있는 행동 항목과 필요한 실행 정보의 조합**으로 통일한다.

사용자는 먼저 결과물을 보고, \`저장만 하기\`, \`지금 시작\`, \`날짜를 넣고 시작\` 중 자연스러운 행동을 선택한다. 날짜·장소·비용·담당자·반복은 결과를 바꿀 때만 받는다.

다음 개발은 두 단계만 진행한다.

1. 콘텐츠 채택 기준과 검증용 대표 Flow 6~8개 정리
2. 결과 미리보기부터 저장·실행·나중에 일정 추가까지 화면 흐름 통일

## 제안 번호

보고서와 피드백에서 아래 번호를 공통으로 사용한다.

| 번호 | 제안 | 구분 |
|---|---|---|
${proposalRegistry.map((item) => `| ${item.id} | ${item.title} | ${item.group} |`).join('\n')}

화면 예시는 \`UI-01\`부터 \`UI-12\`까지 번호를 붙였다.

| 번호 | 화면 예시 | 기본 결과 |
|---|---|---|
${uiFeedbackRegistry.map((item) => `| ${item.id} | ${item.title} | ${item.summary} |`).join('\n')}

## 숫자를 읽는 법

| 숫자 | 뜻 | 판단 |
|---|---|---|
| ${inventorySnapshot.rawBundles}개 | 저장소 원재고 | 품질이 보장된 공개 Flow 수가 아님 |
| ${inventorySnapshot.representativeEligible}개 | 대표 노출 가능 후보 | 콘텐츠·출처 보강이 남아 있음 |
| ${inventorySnapshot.currentlyBrowseable}개 | 2026-07-28 \`/flows\`에서 실제 탐색되는 콘텐츠 | 현재 사용자에게 보이는 범위 |
| ${inventorySnapshot.observedSessionsDone}/${inventorySnapshot.observedSessionsTarget} | FlowMe 실제 관찰 세션 | 아직 사용성 검증 전 |

## 확정할 제품 규칙

| 규칙 | 팀이 할 일 |
|---|---|
| 실행 항목(Item)은 행동 제목 + 상세 설명 + 출처 추적이 기본 | 콘텐츠·개발 계약을 하나로 맞춘다 |
| 날짜 없는 Item도 정상 | 저장 후 일정 추가 흐름을 만든다 |
| 기본 결과물 하나를 먼저 선택 | 캘린더·체크·표·메모를 동시에 전면 노출하지 않는다 |
| 한 화면 한 Flow | 결과·첫 행동·기본 버튼을 우선한다 |
| 원문과 개인 기록 분리 | 제작자·원문·확인일과 개인 수정·완료·메모를 섞지 않는다 |
| 근거가 없으면 보류 | 원문에 없는 행동·날짜·준비물을 만들지 않는다 |
| 실제 이벤트 전 인기순 금지 | 생성된 \`usage_count\` 기반 정렬을 제거한다 |

## 네 가지 시작 방식

| 내부 분류 | 사용자에게 보일 말 | 대표 예시 | 기본 결과 |
|---|---|---|---|
| \`link_bucket\` | 일단 저장 | 박물관·여행지·영상 | 메모·버킷 |
| \`quick_flow\` | 지금 시작 | 만들기·단일 레시피·준비 확인 | 체크리스트·메모 |
| \`full_flow\` | 날짜를 넣고 시작 | 이사 D-30·반복 루틴·학습 과정 | 캘린더·체크·표 |
| \`hold\` | 원문 확인 필요 | 출처·권리·안전 불충분 | 공개하지 않음 |

## 콘텐츠팀

1. 각 후보의 사용자 상황과 기본 결과물을 한 문장으로 쓴다.
2. 원문에서 확인된 행동만 Item으로 만든다.
3. 한 Item만으로 충분하면 Step과 다단계 구조를 만들지 않는다.
4. 검증용 대표 6~8개를 세 개 경로와 공식 신뢰 경로에서 고른다.
5. 기존 153개는 유지·보강·교체·보류로 다시 분류한다.

콘텐츠 통과 기준:

- 원문 URL, 제작자 또는 공식 제공자, 확인일이 있다.
- 행동 제목은 사용자가 실제로 할 수 있다.
- 상세 설명은 원문 근거와 완료 기준을 설명한다.
- 날짜와 반복은 필요한 경우에만 있다.
- 기본 결과물과 첫 행동이 분명하다.
- 권리·안전 경계가 분명하다.

## UX팀

1. 결과물을 입력보다 먼저 보여준다.
2. 한 화면에서는 한 Flow와 한 기본 버튼에 집중한다.
3. 날짜 미정 저장과 나중에 일정 추가를 같은 위치에서 이어준다.
4. 가능 기간, 예약일, 마감일을 서로 다른 라벨로 보여준다.
5. 원문·제작자·주의사항은 실행 항목과 분리한다.
6. 저장 후 저장 위치와 첫 행동을 바로 알려준다.

## 개발팀

### Slice 1. 콘텐츠 채택 기준과 대표 Flow 정리

주요 대상: \`lib/flow/types.ts\`, \`lib/flow/seed-flows.ts\`, \`lib/flow/content-lifecycle.ts\`, \`components/flow/AppClient.tsx\`

완료 조건:

- 각 대표 Flow에 출처·기본 결과물·첫 행동이 있다.
- 날짜 없는 후보는 날짜 없이 저장된다.
- 근거가 부족한 후보는 보류된다.
- 실제 이벤트가 없으면 인기순이 없다.

### Slice 2. 결과부터 저장·실행하는 흐름 통일

주요 대상: \`components/flow/AppClient.tsx\`, \`components/flow/FlowExportPanel.tsx\`, \`lib/flow/storage.ts\`, \`lib/flow/export.ts\`, 관련 E2E

완료 조건:

- 날짜 없는 저장은 VEVENT를 만들지 않는다.
- 나중에 날짜를 붙여도 같은 Item이 중복되지 않는다.
- 날짜 범위와 예약일이 구분된다.
- 모바일에서 기본 CTA와 첫 행동이 먼저 보인다.
- 저장 후 사용자가 저장 위치와 다음 행동을 찾을 수 있다.

## QA·리서치

자동 QA와 화면 캡처는 구현 확인이다. 사용자 검증으로 부르지 않는다.

다음 관찰은 세 개 검증 경로에서 각 5명, 총 15명으로 설계한다.

핵심 질문: **사용자가 설명 없이 결과물을 이해하고 저장 또는 실행한 뒤, 첫 행동과 나중에 날짜를 붙이는 방법을 찾을 수 있는가?**

## 이번에 하지 않을 것

${doNotApply.map((item) => `- ${item}`).join('\n')}

## 근거 문서

${sourceDocs.map((doc) => `- [${doc.title}](${doc.href}) — ${doc.role}`).join('\n')}

## 함께 보는 산출물

- [CEO·제품 적용 보고서](./2026-07-28-flowme-research-to-product-application-playbook-ceo-ko.html)
- [결정 매트릭스](./2026-07-28-flowme-research-to-product-decision-matrix.json)
- [대표 사례 계약](./2026-07-28-flowme-research-to-product-scenario-contract.json)
`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const fieldLabels = {
  location: '장소',
  estimatedDuration: '예상 시간',
  laterDate: '나중에 정할 날짜',
  materials: '준비물',
  servings: '인분',
  cookTime: '조리 시간',
  weekStart: '식단 시작일',
  anchorDate: '기준일',
  dayOffset: '기준일 대비 날짜',
  contact: '연락처',
  cost: '비용',
  completionCriteria: '완료 기준',
  destination: '목적지',
  travelDates: '여행 기간',
  participants: '참여자',
  packingList: '짐 목록',
  checkupType: '검진 종류',
  dateWindow: '가능 기간',
  reservationDate: '예약일',
  officialUrl: '공식 링크',
  caution: '주의사항',
  inspectionType: '검사 종류',
  documents: '필요 서류',
  repeatRule: '반복 주기',
  lastDoneAt: '마지막 완료일',
  nextDueAt: '다음 예정일',
  conditionMemo: '상태 메모',
  company: '회사',
  role: '직무',
  deadline: '마감일',
  status: '상태',
  followUpDate: '후속 확인일',
  eventDate: '행사일',
  assignee: '담당자',
  handoffStatus: '전달 상태',
  applicationType: '신청 유형',
  visitDate: '방문일',
  checkedAt: '확인일',
  courseOrder: '강의 순서',
  targetDate: '목표일',
  repeatDays: '실행 요일',
  progress: '진도',
  retryMemo: '다시 볼 메모',
  moveDate: '이사일',
  childBirthDateOrOfficialWindow: '자녀 생년월일 또는 공식 검진 기간',
  officialInspectionWindow: '공식 검사 가능 기간',
  startDateOrLastDoneAt: '시작일 또는 마지막 완료일',
};

function displayField(field) {
  return fieldLabels[field] ?? field;
}

function evidenceTags(types) {
  return `<div class="evidence-tags">${types
    .map((type) => `<span class="evidence ${escapeHtml(type)}">${escapeHtml(evidenceLabels[type])}</span>`)
    .join('')}</div>`;
}

function evidenceTag(type) {
  return evidenceTags([type]);
}

function list(items, className = '') {
  return `<ul${className ? ` class="${className}"` : ''}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function proposalBadge(id) {
  return `<span class="proposal-id">${escapeHtml(id)}</span>`;
}

function renderDecisionCard(item, mode) {
  return `<article class="decision-card ${mode}">
    <div class="decision-top">
      ${item.proposalId ? proposalBadge(item.proposalId) : ''}
      <div class="decision-label">${escapeHtml(
        mode === 'apply' ? '지금 적용' : mode === 'validate' ? '확인 후 적용' : '뒤로 미룸',
      )}</div>
    </div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.decision ?? item.reason)}</p>
    ${item.reason && item.decision ? `<small>${escapeHtml(item.reason)}</small>` : ''}
    ${item.validation ? `<div class="validation"><b>확인 방법</b>${escapeHtml(item.validation)}</div>` : ''}
    ${item.revisit ? `<div class="validation"><b>다시 볼 조건</b>${escapeHtml(item.revisit)}</div>` : ''}
    ${item.evidenceTypes ? evidenceTags(item.evidenceTypes) : ''}
  </article>`;
}

function renderScenario(scenario) {
  const ui = scenarioUiExamples[scenario.id];
  const uiFeedback = uiFeedbackRegistry.find((item) => item.scenarioId === scenario.id);
  const supportLabel = {
    supported: '현재 가능',
    partial: '부분 가능',
    missing: '추가 개발',
  }[scenario.currentSupport];
  return `<article class="scenario">
    <header>
      <div>
        <div class="scenario-id-row">${proposalBadge(uiFeedback.id)}<span class="scenario-category">${escapeHtml(
          scenario.category,
        )}</span></div>
        <h3>${escapeHtml(scenario.label)}</h3>
      </div>
      <span class="support ${escapeHtml(scenario.currentSupport)}">${escapeHtml(supportLabel)}</span>
    </header>
    <div class="flow-ui" aria-label="${escapeHtml(scenario.label)} 전략 UI 예시">
      <div class="flow-ui-bar">
        <span class="mock-label">전략 UI 예시</span>
        <span class="mock-state">${escapeHtml(ui.state)}</span>
      </div>
      <div class="flow-ui-source"><span>원문·제작자</span><b>${escapeHtml(ui.source)}</b></div>
      <span class="flow-ui-result">${escapeHtml(ui.result)}</span>
      <h4>${escapeHtml(ui.title)}</h4>
      <p class="flow-ui-description">${escapeHtml(ui.description)}</p>
      <div class="flow-ui-facts">
        ${ui.facts
          .map(
            ([label, value]) =>
              `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`,
          )
          .join('')}
      </div>
      <div class="flow-ui-items">
        ${ui.items
          .map(
            ([title, detail], index) => `<div class="flow-ui-item">
              <span class="mock-check">${index + 1}</span>
              <div><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></div>
            </div>`,
          )
          .join('')}
      </div>
      <div class="flow-ui-actions">
        <span class="mock-primary">${escapeHtml(ui.primary)}</span>
        <span class="mock-secondary">${escapeHtml(ui.secondary)}</span>
      </div>
      <div class="flow-ui-note">${escapeHtml(ui.note)}</div>
    </div>
    <div class="scenario-notes">
      <div><b>현재 판단</b><span>${escapeHtml(scenario.currentSupportKo)}</span></div>
      <div><b>보강할 것</b><span>${escapeHtml(scenario.additionalDevelopment.join(' · '))}</span></div>
      <div><b>외부에 남길 것</b><span>${escapeHtml(scenario.externalBoundary)}</span></div>
    </div>
    ${evidenceTags(scenario.evidenceTypes)}
  </article>`;
}

function renderFeedbackCard(item, compact = false) {
  const options = [
    ['take', '가져감'],
    ['revise', '수정'],
    ['drop', '안 가져감'],
    ['hold', '보류'],
  ];
  return `<article class="feedback-card${compact ? ' compact' : ''}" data-proposal-id="${escapeHtml(item.id)}">
    <div class="feedback-card-head">
      ${proposalBadge(item.id)}
      <span>${escapeHtml(item.group)}</span>
    </div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.summary)}</p>
    <div class="feedback-options" role="radiogroup" aria-label="${escapeHtml(item.id)} 선택">
      ${options
        .map(
          ([value, label]) => `<label>
            <input type="radio" name="feedback-${escapeHtml(item.id)}" value="${escapeHtml(value)}">
            <span>${escapeHtml(label)}</span>
          </label>`,
        )
        .join('')}
    </div>
    <label class="feedback-note">
      <span>수정 의견</span>
      <input type="text" data-feedback-note placeholder="필요할 때만 짧게 입력">
    </label>
  </article>`;
}

function renderImplementationRow(item) {
  const statusLabels = {
    implemented: '이미 구현',
    partial: '구현됨·정리 필요',
    docs_only: '명세 우선',
    defer: 'P1 이후',
    conflict: '중단 필요',
    do_not_build: 'P0 비대상',
  };
  return `<tr>
    <td><b>${escapeHtml(item.capability)}</b></td>
    <td><span class="impl-status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status])}</span></td>
    <td>${escapeHtml(item.decision)}</td>
    <td><code>${escapeHtml(item.evidence)}</code></td>
  </tr>`;
}

function renderSourceLink(doc) {
  return `<a class="source-link" href="${escapeHtml(doc.href)}">
    <span>${escapeHtml(evidenceLabels[doc.evidenceType])}</span>
    <b>${escapeHtml(doc.title)}</b>
    <small>${escapeHtml(doc.role)}</small>
  </a>`;
}

const scenarioPairs = [];
for (let index = 0; index < scenarios.length; index += 2) {
  scenarioPairs.push(scenarios.slice(index, index + 2));
}

const reportHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>FlowMe 조사 결과 → 제품 적용 전략 보고서</title>
  <style>
    :root {
      --ink:#17211d;
      --muted:#63706a;
      --paper:#f4f5f2;
      --white:#ffffff;
      --line:#d8ddd8;
      --green:#17664f;
      --mint:#e0f1ea;
      --coral:#c95642;
      --peach:#f7e1dc;
      --yellow:#c89816;
      --cream:#f7edc7;
      --blue:#2c65a1;
      --sky:#dfeaf6;
      --violet:#6650a4;
      --lavender:#e9e4f5;
      --gray:#eef0ed;
      --dark:#101916;
    }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; background:var(--paper); }
    body {
      margin:0;
      color:var(--ink);
      background:var(--paper);
      font-family:"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
      line-height:1.5;
      letter-spacing:0;
    }
    a { color:inherit; }
    button, input, select { font:inherit; }
    .topbar {
      position:sticky;
      top:0;
      z-index:30;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      min-height:54px;
      padding:8px 20px;
      background:rgba(244,245,242,.96);
      border-bottom:1px solid var(--line);
      backdrop-filter:blur(10px);
    }
    .brand { font-size:14px; font-weight:850; white-space:nowrap; }
    .topbar nav { display:flex; gap:4px; overflow:auto; }
    .topbar nav a {
      flex:none;
      padding:7px 9px;
      color:var(--muted);
      text-decoration:none;
      font-size:12px;
      font-weight:700;
      border-bottom:2px solid transparent;
    }
    .topbar nav a:hover,
    .topbar nav a.active { color:var(--ink); border-color:var(--green); }
    .download-links { display:flex; gap:6px; flex:none; }
    .download-links a {
      display:inline-flex;
      align-items:center;
      min-height:32px;
      padding:6px 9px;
      border:1px solid var(--line);
      border-radius:4px;
      background:var(--white);
      text-decoration:none;
      font-size:11px;
      font-weight:800;
    }
    main { padding:0 0 64px; }
    .slide {
      width:100%;
      min-height:calc(100vh - 54px);
      scroll-margin-top:54px;
      padding:46px max(32px, calc((100vw - 1344px) / 2));
      border-bottom:1px solid var(--line);
      background:var(--white);
      position:relative;
      overflow:hidden;
    }
    .slide.alt { background:var(--paper); }
    .slide.dark { color:#fff; background:var(--dark); }
    .slide::after {
      content:attr(data-page);
      position:absolute;
      right:max(32px, calc((100vw - 1344px) / 2));
      bottom:18px;
      color:#929d97;
      font-size:11px;
      font-weight:800;
    }
    .slide.dark::after { color:#84928b; }
    .slide-inner { width:min(1344px, 100%); margin:0 auto; }
    .slide-head {
      display:grid;
      grid-template-columns:48px 1fr auto;
      align-items:start;
      gap:14px;
      margin-bottom:26px;
    }
    .slide-no {
      display:flex;
      align-items:center;
      justify-content:center;
      width:42px;
      height:42px;
      border-radius:4px;
      background:var(--ink);
      color:#fff;
      font-size:12px;
      font-weight:850;
    }
    .dark .slide-no { background:#fff; color:var(--ink); }
    .eyebrow {
      margin-bottom:4px;
      color:var(--green);
      font-size:12px;
      font-weight:850;
    }
    .dark .eyebrow { color:#80d6b7; }
    h1,h2,h3,p { margin-top:0; }
    h1 { max-width:1040px; margin-bottom:18px; font-size:46px; line-height:1.15; }
    h2 { margin-bottom:0; font-size:30px; line-height:1.25; }
    h3 { margin-bottom:9px; font-size:19px; line-height:1.32; }
    .lead { max-width:1040px; color:#34443d; font-size:21px; line-height:1.55; }
    .dark .lead { color:#cbd7d1; }
    .claim {
      align-self:start;
      padding:5px 9px;
      border:1px solid #a8cabc;
      border-radius:999px;
      color:var(--green);
      background:#eff8f4;
      font-size:11px;
      font-weight:850;
      white-space:nowrap;
    }
    .dark .claim { color:#dff7ee; border-color:#426c5c; background:#1c332a; }
    .hero {
      display:grid;
      grid-template-columns:1.1fr .9fr;
      gap:44px;
      align-items:center;
      min-height:660px;
    }
    .hero h1 em { color:#f0c84b; font-style:normal; }
    .hero-summary {
      display:grid;
      gap:0;
      border-top:1px solid #405048;
    }
    .hero-summary div {
      display:grid;
      grid-template-columns:110px 1fr;
      gap:20px;
      padding:17px 0;
      border-bottom:1px solid #405048;
    }
    .hero-summary span { color:#80d6b7; font-size:12px; font-weight:850; }
    .hero-summary b { color:#fff; font-size:18px; }
    .metric-grid {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:10px;
      margin-top:28px;
    }
    .metric {
      min-height:126px;
      padding:17px;
      border-top:4px solid var(--green);
      background:#f2f5f3;
      color:var(--ink);
    }
    .metric:nth-child(2) { border-color:var(--coral); }
    .metric:nth-child(3) { border-color:var(--blue); }
    .metric:nth-child(4) { border-color:var(--yellow); }
    .metric b { display:block; margin-bottom:7px; font-size:34px; line-height:1; }
    .metric span { display:block; color:var(--muted); font-size:12px; }
    .metric small { display:block; margin-top:8px; color:#7b8781; font-size:10px; }
    .executive-line {
      margin-top:22px;
      padding:16px 18px;
      border-left:5px solid var(--coral);
      background:var(--peach);
      font-size:18px;
      font-weight:800;
    }
    .grid-2, .grid-3, .grid-4 {
      display:grid;
      gap:14px;
    }
    .grid-2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .grid-3 { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .grid-4 { grid-template-columns:repeat(4,minmax(0,1fr)); }
    .panel {
      padding:20px;
      border:1px solid var(--line);
      border-radius:6px;
      background:var(--white);
    }
    .alt .panel { background:#fff; }
    .panel strong.kicker {
      display:block;
      margin-bottom:9px;
      color:var(--green);
      font-size:11px;
      font-weight:850;
    }
    .panel p { margin-bottom:0; color:#46544e; font-size:14px; }
    .decision-card {
      min-height:232px;
      padding:19px;
      border:1px solid var(--line);
      border-top:5px solid var(--green);
      border-radius:5px;
      background:#fff;
    }
    .decision-card.validate { border-top-color:var(--yellow); }
    .decision-card.defer { border-top-color:#8c9691; }
    .decision-card h3 { min-height:50px; }
    .decision-card p { color:#3f4e47; font-size:14px; }
    .decision-card small { display:block; color:var(--muted); font-size:12px; }
    .decision-top {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:11px;
    }
    .proposal-id {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:46px;
      min-height:25px;
      padding:4px 7px;
      border:1px solid currentColor;
      border-radius:4px;
      color:var(--green);
      background:#fff;
      font-size:10px;
      font-weight:900;
      line-height:1;
    }
    .dark .proposal-id { color:#a8e6cf; background:#17251f; }
    .proposal-strip {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin:0 0 14px 56px;
    }
    .slice-card .proposal-id,
    .lane-card .proposal-id { margin-bottom:9px; }
    .decision-label {
      display:inline-block;
      padding:4px 7px;
      border-radius:3px;
      color:var(--green);
      background:var(--mint);
      font-size:10px;
      font-weight:850;
    }
    .decision-card.validate .decision-label { color:#7c5b00; background:var(--cream); }
    .decision-card.defer .decision-label { color:#58635e; background:var(--gray); }
    .validation {
      margin-top:13px;
      padding:10px 11px;
      border-left:3px solid var(--yellow);
      background:#fff9e6;
      color:#5b5030;
      font-size:12px;
    }
    .validation b { display:block; margin-bottom:2px; }
    .evidence-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:12px; }
    .evidence {
      padding:3px 6px;
      border-radius:3px;
      font-size:9px;
      font-weight:850;
      color:#fff;
      background:#6c7872;
    }
    .evidence.repository_fact { background:var(--green); }
    .evidence.external_official { background:var(--blue); }
    .evidence.public_reaction { background:var(--violet); }
    .evidence.strategic_inference { color:#3d3100; background:#e6c24d; }
    .evidence.hypothesis_unmeasured { background:var(--coral); }
    .stop-list {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px 14px;
      margin:0;
      padding:0;
      list-style:none;
    }
    .stop-list li {
      min-height:54px;
      padding:11px 12px 11px 36px;
      border:1px solid #e9cbc4;
      background:#fff7f4;
      position:relative;
      font-size:13px;
    }
    .stop-list li::before {
      content:"×";
      position:absolute;
      left:12px;
      top:8px;
      color:var(--coral);
      font-size:22px;
      font-weight:900;
    }
    .slice-preview {
      display:grid;
      grid-template-columns:1fr 54px 1fr;
      align-items:stretch;
      gap:14px;
      margin-top:22px;
    }
    .slice-card {
      padding:24px;
      border:1px solid var(--line);
      border-top:6px solid var(--green);
      background:#fff;
    }
    .slice-card.second { border-top-color:var(--blue); }
    .slice-card .slice-number {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      margin-bottom:12px;
      border-radius:50%;
      color:#fff;
      background:var(--green);
      font-size:12px;
      font-weight:900;
    }
    .slice-card.second .slice-number { background:var(--blue); }
    .slice-card p { color:#45534d; }
    .slice-card ul { margin:12px 0 0; padding-left:18px; color:#45534d; font-size:13px; }
    .slice-arrow {
      display:flex;
      align-items:center;
      justify-content:center;
      color:var(--muted);
      font-size:30px;
    }
    .behavior-gate {
      display:grid;
      grid-template-columns:170px 1fr;
      gap:18px;
      margin-top:18px;
      padding:20px;
      color:#fff;
      background:var(--ink);
    }
    .behavior-gate strong { color:#f0c84b; font-size:32px; line-height:1; }
    .behavior-gate p { margin:0; color:#d4ded9; font-size:15px; }
    .evidence-funnel {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:0;
      margin-top:20px;
      border:1px solid var(--line);
    }
    .funnel-step {
      padding:20px;
      border-right:1px solid var(--line);
      background:#fff;
      position:relative;
    }
    .funnel-step:last-child { border-right:0; }
    .funnel-step:not(:last-child)::after {
      content:"›";
      position:absolute;
      z-index:2;
      right:-12px;
      top:50%;
      width:24px;
      height:24px;
      margin-top:-12px;
      border:1px solid var(--line);
      border-radius:50%;
      background:var(--paper);
      text-align:center;
      line-height:21px;
      font-size:19px;
      font-weight:900;
    }
    .funnel-step b { display:block; margin-bottom:6px; font-size:30px; }
    .funnel-step span { display:block; color:var(--muted); font-size:12px; }
    .funnel-step small { display:block; margin-top:10px; font-size:10px; color:#7c8882; }
    .ladder {
      display:grid;
      grid-template-columns:repeat(6,1fr);
      align-items:end;
      gap:8px;
      min-height:250px;
      margin-top:26px;
    }
    .ladder-step {
      display:flex;
      flex-direction:column;
      justify-content:flex-end;
      min-height:90px;
      padding:12px;
      color:#fff;
      background:#74807a;
    }
    .ladder-step:nth-child(2) { min-height:115px; background:#657a71; }
    .ladder-step:nth-child(3) { min-height:140px; background:var(--blue); }
    .ladder-step:nth-child(4) { min-height:165px; background:var(--violet); }
    .ladder-step:nth-child(5) { min-height:190px; background:var(--green); }
    .ladder-step:nth-child(6) { min-height:215px; background:var(--coral); }
    .ladder-step b { font-size:24px; }
    .ladder-step span { font-size:12px; font-weight:800; }
    .ladder-step small { margin-top:4px; font-size:10px; opacity:.88; }
    .boundary-note {
      margin-top:16px;
      padding:14px 16px;
      border-left:5px solid var(--coral);
      background:var(--peach);
      font-size:14px;
      font-weight:750;
    }
    .conflict-table, .implementation-table, .portfolio-table {
      width:100%;
      border-collapse:collapse;
      table-layout:fixed;
      background:#fff;
    }
    .table-scroll {
      width:100%;
      max-width:100%;
      overflow-x:auto;
      overscroll-behavior-inline:contain;
    }
    .conflict-table th, .conflict-table td,
    .implementation-table th, .implementation-table td,
    .portfolio-table th, .portfolio-table td {
      padding:12px;
      border:1px solid var(--line);
      text-align:left;
      vertical-align:top;
      font-size:12px;
      overflow-wrap:anywhere;
    }
    .conflict-table th, .implementation-table th, .portfolio-table th {
      color:#46534d;
      background:var(--gray);
      font-weight:850;
    }
    .conflict-table td:first-child { width:25%; font-weight:800; }
    .conflict-table td:nth-child(2) { width:32%; color:#53615b; }
    .conflict-table td:nth-child(3) { width:43%; }
    .model-pipeline {
      display:grid;
      grid-template-columns:repeat(6,minmax(0,1fr));
      gap:12px;
      align-items:stretch;
      margin-top:24px;
    }
    .model-node {
      min-height:180px;
      padding:16px;
      border-top:5px solid var(--green);
      background:#fff;
      position:relative;
    }
    .model-node:nth-child(2) { border-color:var(--blue); }
    .model-node:nth-child(3) { border-color:var(--yellow); }
    .model-node:nth-child(4) { border-color:var(--coral); }
    .model-node:nth-child(5) { border-color:var(--violet); }
    .model-node:nth-child(6) { border-color:#52605a; }
    .model-node:not(:last-child)::after {
      content:"→";
      position:absolute;
      right:-18px;
      top:72px;
      z-index:2;
      width:24px;
      height:24px;
      border:1px solid var(--line);
      border-radius:50%;
      background:var(--paper);
      text-align:center;
      line-height:21px;
      font-weight:900;
    }
    .model-node span { display:block; color:var(--muted); font-size:10px; font-weight:850; }
    .model-node b { display:block; margin:7px 0; font-size:17px; }
    .model-node p { margin:0; color:#4c5a54; font-size:12px; }
    .field-strip {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:20px;
      padding:18px;
      border:1px solid var(--line);
      background:#fff;
    }
    .field-strip .required, .field-strip .optional {
      padding:7px 9px;
      border-radius:3px;
      font-size:11px;
      font-weight:800;
    }
    .field-strip .required { color:#fff; background:var(--green); }
    .field-strip .optional { color:#425149; background:var(--gray); }
    .mode-card {
      min-height:274px;
      padding:20px;
      border:1px solid var(--line);
      border-top:6px solid var(--green);
      background:#fff;
    }
    .mode-card:nth-child(2) { border-top-color:var(--blue); }
    .mode-card:nth-child(3) { border-top-color:var(--yellow); }
    .mode-card:nth-child(4) { border-top-color:var(--coral); }
    .mode-card .mode-user-copy {
      display:inline-block;
      margin-bottom:12px;
      padding:5px 8px;
      color:#fff;
      background:var(--ink);
      font-size:11px;
      font-weight:850;
    }
    .mode-card h3 { min-height:48px; }
    .mode-card p { color:#48564f; font-size:13px; }
    .mode-card dl { margin:16px 0 0; }
    .mode-card dt { color:var(--muted); font-size:10px; font-weight:850; }
    .mode-card dd { margin:2px 0 10px; font-size:12px; font-weight:750; }
    .projection-board {
      display:grid;
      grid-template-columns:1fr 72px 1.4fr;
      gap:18px;
      align-items:center;
      margin-top:30px;
    }
    .canonical-run {
      padding:24px;
      border:2px solid var(--green);
      background:#fff;
    }
    .canonical-run .item-demo {
      margin-top:14px;
      padding:14px;
      border-left:5px solid var(--green);
      background:var(--mint);
    }
    .canonical-run .item-demo span { display:block; color:#496159; font-size:11px; }
    .projection-arrow { text-align:center; color:var(--muted); font-size:32px; }
    .projection-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }
    .projection {
      min-height:138px;
      padding:16px;
      border:1px solid var(--line);
      background:#fff;
    }
    .projection b { display:block; margin-bottom:6px; font-size:17px; }
    .projection p { margin:0; color:#52605a; font-size:11px; }
    .projection.calendar { border-top:5px solid var(--blue); }
    .projection.checklist { border-top:5px solid var(--green); }
    .projection.sheet { border-top:5px solid var(--yellow); }
    .projection.memo { border-top:5px solid var(--violet); }
    .journey {
      display:grid;
      grid-template-columns:repeat(8,minmax(0,1fr));
      gap:8px;
      margin-top:28px;
    }
    .journey-step {
      min-height:150px;
      padding:14px;
      border-top:5px solid var(--green);
      background:#fff;
      position:relative;
    }
    .journey-step:nth-child(2n) { border-color:var(--blue); }
    .journey-step:not(:last-child)::after {
      content:"›";
      position:absolute;
      right:-9px;
      top:58px;
      z-index:2;
      font-size:22px;
      font-weight:900;
    }
    .journey-step span { color:var(--muted); font-size:10px; font-weight:850; }
    .journey-step b { display:block; margin:8px 0 6px; font-size:14px; }
    .journey-step p { margin:0; color:#55635d; font-size:11px; }
    .ux-rule {
      display:grid;
      grid-template-columns:1fr 1fr;
      margin-top:22px;
      border:1px solid var(--line);
    }
    .ux-rule > div { padding:18px; }
    .ux-rule .current { background:#fff2ef; }
    .ux-rule .target { background:#eef8f4; }
    .ux-rule h3 { font-size:15px; }
    .ux-rule ul { margin:0; padding-left:18px; font-size:12px; }
    .screen-comparison {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:28px;
      align-items:start;
    }
    .screen-side h3 { font-size:18px; }
    .phone-row {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
    }
    .phone {
      padding:8px;
      border:1px solid #c9cfcb;
      border-radius:8px;
      background:#151b18;
    }
    .phone img {
      display:block;
      width:100%;
      aspect-ratio:390/844;
      object-fit:cover;
      object-position:top;
      border-radius:4px;
      background:#fff;
    }
    .phone figcaption {
      min-height:42px;
      padding:8px 3px 2px;
      color:#dbe3df;
      font-size:10px;
      text-align:center;
    }
    .target-phone {
      width:min(390px,100%);
      margin:0 auto;
      padding:16px;
      border:8px solid #151b18;
      border-radius:8px;
      background:#f8f8f5;
    }
    .target-phone .appbar {
      display:flex;
      justify-content:space-between;
      padding-bottom:12px;
      border-bottom:1px solid var(--line);
      font-size:12px;
      font-weight:850;
    }
    .target-phone .creator {
      margin-top:14px;
      color:var(--green);
      font-size:10px;
      font-weight:850;
    }
    .target-phone h4 { margin:5px 0 7px; font-size:22px; line-height:1.25; }
    .target-phone .result-label {
      display:inline-block;
      padding:4px 7px;
      background:var(--mint);
      color:var(--green);
      font-size:10px;
      font-weight:850;
    }
    .target-phone .preview-item {
      margin-top:14px;
      padding:13px;
      border:1px solid var(--line);
      background:#fff;
    }
    .target-phone .preview-item b { display:block; font-size:14px; }
    .target-phone .preview-item span { color:var(--muted); font-size:10px; }
    .target-phone .primary,
    .target-phone .secondary {
      display:block;
      width:100%;
      min-height:42px;
      margin-top:10px;
      border:0;
      border-radius:4px;
      font-size:13px;
      font-weight:850;
    }
    .target-phone .primary { color:#fff; background:var(--green); }
    .target-phone .secondary { border:1px solid var(--line); background:#fff; }
    .target-phone .source-box {
      margin-top:14px;
      padding-top:12px;
      border-top:1px solid var(--line);
      color:#53615b;
      font-size:10px;
    }
    .scenario-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; align-items:start; }
    .scenario {
      padding:16px;
      border:1px solid var(--line);
      border-radius:6px;
      background:#fff;
    }
    .scenario header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .scenario-id-row { display:flex; align-items:center; gap:8px; }
    .scenario-category { color:var(--green); font-size:10px; font-weight:850; }
    .scenario h3 { margin-top:3px; font-size:18px; }
    .support {
      flex:none;
      padding:4px 7px;
      border-radius:3px;
      font-size:10px;
      font-weight:850;
    }
    .support.supported { color:#fff; background:var(--green); }
    .support.partial { color:#654e00; background:var(--cream); }
    .support.missing { color:#fff; background:var(--coral); }
    .flow-ui {
      margin-top:10px;
      padding:12px;
      border:5px solid #18211d;
      border-radius:8px;
      background:#f7f8f5;
      box-shadow:0 7px 20px rgba(23,33,29,.08);
    }
    .flow-ui-bar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      padding-bottom:8px;
      border-bottom:1px solid var(--line);
    }
    .mock-label,
    .mock-state {
      font-size:9px;
      font-weight:900;
    }
    .mock-label { color:#fff; background:var(--ink); padding:4px 6px; border-radius:3px; }
    .mock-state { color:var(--green); }
    .flow-ui-source {
      display:grid;
      grid-template-columns:68px minmax(0,1fr);
      gap:8px;
      margin-top:9px;
      color:#56635d;
      font-size:9px;
    }
    .flow-ui-source span { color:var(--green); font-weight:900; }
    .flow-ui-source b { overflow-wrap:anywhere; }
    .flow-ui-result {
      display:inline-flex;
      margin-top:10px;
      padding:4px 7px;
      border-radius:3px;
      color:var(--green);
      background:var(--mint);
      font-size:9px;
      font-weight:900;
    }
    .flow-ui h4 { margin:6px 0 4px; font-size:20px; line-height:1.25; }
    .flow-ui-description { margin:0; color:#53615b; font-size:10px; }
    .flow-ui-facts {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
      margin-top:10px;
    }
    .flow-ui-facts div {
      min-height:43px;
      padding:7px 9px;
      border:1px solid var(--line);
      background:#fff;
    }
    .flow-ui-facts span { display:block; color:var(--muted); font-size:8px; font-weight:800; }
    .flow-ui-facts b { display:block; margin-top:2px; font-size:10px; }
    .flow-ui-items { margin-top:9px; border:1px solid var(--line); background:#fff; }
    .flow-ui-item {
      display:grid;
      grid-template-columns:24px minmax(0,1fr);
      gap:8px;
      align-items:start;
      min-height:43px;
      padding:8px;
      border-bottom:1px solid var(--line);
    }
    .flow-ui-item:last-child { border-bottom:0; }
    .mock-check {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:22px;
      height:22px;
      border:1px solid #9fb9ad;
      border-radius:3px;
      color:var(--green);
      background:var(--mint);
      font-size:9px;
      font-weight:900;
    }
    .flow-ui-item b { display:block; font-size:10px; }
    .flow-ui-item small { display:block; margin-top:2px; color:var(--muted); font-size:8px; }
    .flow-ui-actions {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
      margin-top:9px;
    }
    .mock-primary,
    .mock-secondary {
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:34px;
      padding:6px;
      border-radius:4px;
      font-size:9px;
      font-weight:900;
      text-align:center;
    }
    .mock-primary { color:#fff; background:var(--green); }
    .mock-secondary { border:1px solid var(--line); background:#fff; }
    .flow-ui-note { margin-top:8px; color:#59665f; font-size:8px; }
    .scenario-notes {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      margin-top:10px;
      border:1px solid var(--line);
      background:var(--paper);
    }
    .scenario-notes > div { padding:8px; border-right:1px solid var(--line); }
    .scenario-notes > div:last-child { border-right:0; }
    .scenario-notes b { display:block; color:var(--green); font-size:8px; }
    .scenario-notes span { display:block; margin-top:2px; color:#48564f; font-size:8px; }
    .lane-card {
      min-height:280px;
      padding:19px;
      border:1px solid var(--line);
      border-top:6px solid var(--green);
      background:#fff;
    }
    .lane-card:nth-child(2) { border-top-color:var(--violet); }
    .lane-card:nth-child(3) { border-top-color:var(--yellow); }
    .lane-card:nth-child(4) { border-top-color:var(--blue); }
    .lane-card .lane-role { color:var(--muted); font-size:10px; font-weight:850; }
    .lane-card h3 { min-height:48px; margin-top:5px; }
    .lane-card p { color:#4d5b55; font-size:12px; }
    .lane-card ul { margin:12px 0; padding-left:18px; font-size:11px; }
    .lane-decision {
      display:inline-block;
      padding:5px 8px;
      color:#fff;
      background:var(--ink);
      font-size:10px;
      font-weight:850;
    }
    .portfolio-table th:nth-child(1) { width:16%; }
    .portfolio-table th:nth-child(2) { width:15%; }
    .portfolio-table th:nth-child(3) { width:19%; }
    .portfolio-table th:nth-child(4) { width:18%; }
    .portfolio-table th:nth-child(5) { width:16%; }
    .portfolio-table th:nth-child(6) { width:16%; }
    .impl-status {
      display:inline-block;
      padding:4px 6px;
      border-radius:3px;
      color:#fff;
      background:#737f79;
      font-size:9px;
      font-weight:850;
    }
    .impl-status.implemented { background:var(--green); }
    .impl-status.partial { color:#5f4900; background:var(--cream); }
    .impl-status.docs_only { background:var(--blue); }
    .impl-status.defer { background:#737f79; }
    .impl-status.conflict { background:var(--coral); }
    .impl-status.do_not_build { background:var(--dark); }
    code {
      font-family:"Cascadia Code","Consolas",monospace;
      color:#3f4c46;
      font-size:10px;
      overflow-wrap:anywhere;
    }
    .team-board {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:12px;
      margin-top:20px;
    }
    .team {
      min-height:250px;
      padding:18px;
      border-top:5px solid var(--green);
      background:#fff;
    }
    .team:nth-child(2) { border-color:var(--blue); }
    .team:nth-child(3) { border-color:var(--yellow); }
    .team:nth-child(4) { border-color:var(--coral); }
    .team span { color:var(--muted); font-size:10px; font-weight:850; }
    .team h3 { margin-top:5px; }
    .team ul { margin:0; padding-left:18px; color:#4e5b55; font-size:12px; }
    .ceo-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px;
      margin-top:20px;
    }
    .ceo-decision {
      min-height:220px;
      padding:20px;
      border:1px solid #3d4d45;
      background:#17251f;
    }
    .ceo-decision .decision-no {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:28px;
      height:28px;
      margin-bottom:11px;
      border-radius:50%;
      color:var(--ink);
      background:#f0c84b;
      font-size:11px;
      font-weight:900;
    }
    .ceo-proposal-refs { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
    .ceo-decision h3 { color:#fff; }
    .ceo-decision dl { margin:12px 0 0; }
    .ceo-decision dt { color:#80d6b7; font-size:10px; font-weight:850; }
    .ceo-decision dd { margin:2px 0 10px; color:#d2ddd7; font-size:12px; }
    .source-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
      margin-top:20px;
    }
    .source-link {
      display:flex;
      flex-direction:column;
      min-height:132px;
      padding:15px;
      border:1px solid var(--line);
      background:#fff;
      text-decoration:none;
    }
    .source-link:hover { border-color:var(--green); }
    .source-link span { color:var(--green); font-size:9px; font-weight:850; }
    .source-link b { margin-top:7px; font-size:14px; }
    .source-link small { margin-top:5px; color:var(--muted); font-size:10px; }
    .artifact-links {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:20px;
    }
    .artifact-links a {
      display:inline-flex;
      min-height:38px;
      align-items:center;
      padding:8px 11px;
      border:1px solid #446358;
      border-radius:4px;
      color:#fff;
      text-decoration:none;
      font-size:12px;
      font-weight:850;
    }
    .feedback-intro {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin:0 0 14px;
      padding:12px 14px;
      border:1px solid #b8d5c8;
      border-left:5px solid var(--green);
      border-radius:5px;
      background:#eef8f4;
      color:#3f5149;
      font-size:12px;
    }
    .feedback-intro b { color:var(--green); }
    .feedback-counts { display:flex; flex-wrap:wrap; gap:6px; flex:none; }
    .feedback-counts span {
      min-width:58px;
      padding:5px 7px;
      border:1px solid #c8d9d1;
      border-radius:4px;
      background:#fff;
      font-size:9px;
      font-weight:900;
      text-align:center;
    }
    .feedback-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:9px;
    }
    .ui-feedback-details {
      margin-top:12px;
      padding:11px;
      border:1px solid var(--line);
      border-radius:6px;
      background:#edf2ef;
    }
    .ui-feedback-details summary {
      cursor:pointer;
      color:var(--green);
      font-size:11px;
      font-weight:900;
    }
    .compact-feedback-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
      margin-top:10px;
    }
    .feedback-card {
      min-width:0;
      padding:12px;
      border:1px solid var(--line);
      border-radius:6px;
      background:#fff;
    }
    .feedback-card-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
    }
    .feedback-card-head > span:last-child { color:var(--muted); font-size:8px; font-weight:850; }
    .feedback-card h3 { margin:8px 0 4px; font-size:13px; line-height:1.3; }
    .feedback-card p {
      min-height:43px;
      margin:0;
      color:#53615b;
      font-size:9px;
      line-height:1.45;
    }
    .feedback-card.compact p { min-height:0; }
    .feedback-card.compact h3 { font-size:12px; }
    .feedback-card.compact .feedback-note input { min-height:29px; }
    .feedback-options {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:3px;
      margin-top:9px;
    }
    .feedback-options label { min-width:0; cursor:pointer; }
    .feedback-options input {
      position:absolute;
      width:1px;
      height:1px;
      opacity:0;
      pointer-events:none;
    }
    .feedback-options span {
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:29px;
      padding:4px 2px;
      border:1px solid var(--line);
      border-radius:3px;
      background:var(--paper);
      color:#53615b;
      font-size:8px;
      font-weight:850;
      text-align:center;
    }
    .feedback-options input:focus-visible + span { outline:2px solid var(--blue); outline-offset:1px; }
    .feedback-options input:checked + span { border-color:var(--green); color:#fff; background:var(--green); }
    .feedback-note { display:block; margin-top:7px; }
    .feedback-note > span { display:block; color:var(--muted); font-size:8px; font-weight:800; }
    .feedback-note input {
      width:100%;
      min-height:31px;
      margin-top:3px;
      padding:6px 8px;
      border:1px solid var(--line);
      border-radius:3px;
      background:#fff;
      color:var(--ink);
      font-size:9px;
    }
    .feedback-output {
      display:grid;
      grid-template-columns:minmax(0,1.5fr) minmax(280px,.5fr);
      gap:12px;
      margin-top:12px;
    }
    .feedback-summary {
      width:100%;
      min-height:108px;
      resize:vertical;
      padding:10px;
      border:1px solid var(--line);
      border-radius:5px;
      background:#fff;
      color:var(--ink);
      font-family:"Cascadia Code","Consolas",monospace;
      font-size:10px;
      line-height:1.5;
    }
    .feedback-tools {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:6px;
      align-content:start;
    }
    .feedback-tools button {
      min-height:38px;
      padding:7px 9px;
      border:1px solid var(--line);
      border-radius:4px;
      background:#fff;
      color:var(--ink);
      font-size:10px;
      font-weight:850;
      cursor:pointer;
    }
    .feedback-tools button.primary-tool { border-color:var(--green); color:#fff; background:var(--green); }
    .feedback-tools button:hover { border-color:var(--green); }
    .feedback-status {
      grid-column:1/-1;
      min-height:18px;
      color:var(--green);
      font-size:9px;
      font-weight:800;
    }
    .sources-details {
      grid-column:1/-1;
      margin-top:4px;
      padding:9px 10px;
      border:1px solid var(--line);
      border-radius:5px;
      background:#fff;
    }
    .sources-details summary { cursor:pointer; font-size:10px; font-weight:850; }
    .sources-details .source-grid { grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:10px; }
    .sources-details .source-link { min-height:92px; padding:10px; }
    .sources-details .source-link b { font-size:11px; }
    @media (max-width: 960px) {
      .topbar { align-items:flex-start; flex-wrap:wrap; }
      .topbar nav { order:3; width:100%; }
      .download-links { margin-left:auto; }
      .slide {
        min-height:0;
        padding:34px 22px 58px;
      }
      .slide::after { right:22px; }
      h1 { font-size:36px; }
      h2 { font-size:26px; }
      .lead { font-size:18px; }
      .hero { grid-template-columns:1fr; min-height:0; }
      .metric-grid { grid-template-columns:repeat(2,1fr); }
      .grid-4 { grid-template-columns:repeat(2,1fr); }
      .model-pipeline { grid-template-columns:repeat(3,1fr); }
      .model-node::after { display:none; }
      .journey { grid-template-columns:repeat(4,1fr); }
      .journey-step::after { display:none; }
      .screen-comparison { grid-template-columns:1fr; }
      .team-board { grid-template-columns:repeat(2,1fr); }
      .source-grid { grid-template-columns:repeat(2,1fr); }
      .feedback-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .compact-feedback-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .feedback-output { grid-template-columns:1fr; }
    }
    @media (max-width: 640px) {
      .topbar { position:relative; padding:8px 12px; }
      .brand { width:100%; }
      .download-links { margin-left:0; }
      .slide { padding:28px 16px 54px; scroll-margin-top:0; }
      .slide::after { right:16px; }
      .slide-head { grid-template-columns:40px 1fr; }
      .slide-head .claim { grid-column:2; justify-self:start; }
      .proposal-strip { margin-left:0; }
      .slide-no { width:36px; height:36px; }
      h1 { font-size:30px; }
      h2 { font-size:23px; }
      h3 { font-size:17px; }
      .lead { font-size:16px; }
      .hero-summary div { grid-template-columns:80px 1fr; gap:10px; }
      .hero-summary b { font-size:15px; }
      .metric-grid, .grid-2, .grid-3, .grid-4,
      .scenario-grid, .ceo-grid, .team-board, .source-grid, .feedback-grid, .compact-feedback-grid {
        grid-template-columns:1fr;
      }
      .stop-list { grid-template-columns:1fr; }
      .slice-preview { grid-template-columns:1fr; }
      .slice-arrow { transform:rotate(90deg); }
      .behavior-gate { grid-template-columns:1fr; }
      .evidence-funnel { grid-template-columns:1fr; }
      .funnel-step { border-right:0; border-bottom:1px solid var(--line); }
      .funnel-step:last-child { border-bottom:0; }
      .funnel-step::after { display:none; }
      .ladder { grid-template-columns:repeat(2,1fr); align-items:stretch; }
      .ladder-step { min-height:112px !important; }
      .table-scroll table { width:auto; max-width:none; }
      .conflict-table { min-width:760px; }
      .implementation-table { min-width:860px; }
      .portfolio-table { min-width:900px; }
      .model-pipeline { grid-template-columns:1fr; }
      .model-node { min-height:0; }
      .projection-board { grid-template-columns:1fr; }
      .projection-arrow { transform:rotate(90deg); }
      .journey { grid-template-columns:repeat(2,1fr); }
      .ux-rule { grid-template-columns:1fr; }
      .phone-row { grid-template-columns:1fr; overflow:visible; }
      .phone { width:min(240px,100%); margin:0 auto; }
      .flow-ui-actions, .scenario-notes { grid-template-columns:1fr; }
      .scenario-notes > div { border-right:0; border-bottom:1px solid var(--line); }
      .scenario-notes > div:last-child { border-bottom:0; }
      .feedback-intro { align-items:flex-start; flex-direction:column; }
      .feedback-counts { width:100%; }
      .feedback-counts span { flex:1; min-width:0; }
      .feedback-tools { grid-template-columns:1fr; }
      .sources-details .source-grid { grid-template-columns:1fr; }
      .mode-card, .decision-card, .lane-card, .team { min-height:0; }
    }
    @media print {
      .topbar { display:none; }
      .slide { min-height:100vh; break-after:page; padding:32px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">FLOWME · 조사 결과 → 제품 적용</div>
    <nav aria-label="보고서 바로가기">
      <a href="#s1">결론</a>
      <a href="#s4">근거</a>
      <a href="#s6">콘텐츠</a>
      <a href="#s9">UX</a>
      <a href="#s11">사례</a>
      <a href="#s17">전략</a>
      <a href="#s19">개발</a>
      <a href="#s21">결정</a>
      <a href="#s22">피드백</a>
    </nav>
    <div class="download-links">
      <a href="./2026-07-28-flowme-research-to-product-decision-matrix.json">결정 JSON</a>
      <a href="./2026-07-28-flowme-research-to-product-team-handoff-ko.md">팀 핸드오프</a>
    </div>
  </header>
  <main>
    <section class="slide dark" id="s1" data-page="01 / 22">
      <div class="slide-inner hero">
        <div>
          <div class="eyebrow">핵심 결론 · 2026.07.29 개선본</div>
          <h1>좋은 콘텐츠를 <em>내가 바로 실행할 수 있는 형태</em>로 바꾼다</h1>
          <p class="lead">FlowMe는 긴 계획을 대신 쓰는 앱이 아니다. 원문과 제작자를 지키면서 사용자가 행동을 시작할 수 있도록 일정·체크·기록으로 옮겨 주는 연결 도구다.</p>
          <div class="metric-grid">
            <div class="metric"><b>${inventorySnapshot.rawBundles}</b><span>저장소 전체 후보</span><small>공개 품질을 뜻하지 않음</small></div>
            <div class="metric"><b>${inventorySnapshot.representativeEligible}</b><span>대표 노출 가능 후보</span><small>보강·검토 남음</small></div>
            <div class="metric"><b>${inventorySnapshot.currentlyBrowseable}</b><span>현재 /flows 탐색 수</span><small>2026-07-28 로컬 렌더링</small></div>
            <div class="metric"><b>${inventorySnapshot.observedSessionsDone}/${inventorySnapshot.observedSessionsTarget}</b><span>실제 관찰 세션</span><small>아직 검증 전</small></div>
          </div>
        </div>
        <div class="hero-summary">
          <div><span>장기 비전</span><b>사용자의 여러 행동을 돕는 개인 비서</b></div>
          <div><span>초기 제품</span><b>콘텐츠 하나를 실행 가능한 결과로 바꾸기</b></div>
          <div><span>핵심 단위</span><b>출처가 있는 행동 항목 + 필요한 실행 정보</b></div>
          <div><span>소유할 것</span><b>개인 일정·완료·메모·재사용 관계</b></div>
          <div><span>남겨둘 것</span><b>원문·예약·결제·지도·전문 판단</b></div>
          <div><span>이번 결론</span><b>검증용 6~8개와 다음 개발 2개만 집중</b></div>
        </div>
      </div>
    </section>

    <section class="slide alt" id="s2" data-page="02 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">02</span>
          <div><div class="eyebrow">적용과 금지</div><h2>지금 적용할 것과 지금 만들지 않을 것</h2></div>
          <span class="claim">최종 전략 판단</span>
        </div>
        <div class="grid-4">
          ${applyNow.slice(0, 4).map((item) => renderDecisionCard(item, 'apply')).join('')}
        </div>
        <div class="executive-line">기능 수를 늘리는 것이 목표가 아니다. 같은 콘텐츠 규칙과 같은 사용자 순서로 현재 기능을 묶는 것이 먼저다.</div>
        <h3 style="margin-top:22px">명시적으로 금지</h3>
        ${list(doNotApply.slice(0, 6), 'stop-list')}
        <p style="margin-top:9px;color:var(--muted);font-size:11px">전체 금지 항목은 결정 매트릭스와 팀 실행 기준 문서에 담았다.</p>
      </div>
    </section>

    <section class="slide" id="s3" data-page="03 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">03</span>
          <div><div class="eyebrow">다음 두 단계</div><h2>다음 개발은 두 단계, 먼저 볼 행동은 하나</h2></div>
          <span class="claim">개발 전달 기준</span>
        </div>
        <div class="slice-preview">
          <article class="slice-card">
            ${proposalBadge(developmentSlices[0].proposalId)}
            <span class="slice-number">1</span>
            <h3>${escapeHtml(developmentSlices[0].name)}</h3>
            <p>${escapeHtml(developmentSlices[0].outcome)}</p>
            ${list(developmentSlices[0].changes.slice(0, 4))}
          </article>
          <div class="slice-arrow">→</div>
          <article class="slice-card second">
            ${proposalBadge(developmentSlices[1].proposalId)}
            <span class="slice-number">2</span>
            <h3>${escapeHtml(developmentSlices[1].name)}</h3>
            <p>${escapeHtml(developmentSlices[1].outcome)}</p>
            ${list(developmentSlices[1].changes.slice(0, 4))}
          </article>
        </div>
        <div class="behavior-gate">
          <div>${proposalBadge(observationGate.proposalId)}<br><strong>0/15</strong><br><span>아직 관찰 전</span></div>
          <p><b>먼저 확인할 행동</b><br>${escapeHtml(observationGate.primaryBehavior)}<br><br>세 개 검증 경로에서 각 5명씩 확인한다. 공개 댓글과 자동 QA는 이 숫자에 포함하지 않는다.</p>
        </div>
      </div>
    </section>

    <section class="slide alt" id="s4" data-page="04 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">04</span>
          <div><div class="eyebrow">근거의 범위</div><h2>숫자 네 개는 서로 다른 질문에 답한다</h2></div>
          <span class="claim">저장소 확인 + 미측정</span>
        </div>
        <div class="evidence-funnel">
          <div class="funnel-step"><b>${inventorySnapshot.rawBundles}</b><span>저장소에 들어 있는 전체 후보</span><small>콘텐츠 양</small></div>
          <div class="funnel-step"><b>${inventorySnapshot.representativeEligible}</b><span>대표 노출 가능 후보</span><small>품질 후보 지표</small></div>
          <div class="funnel-step"><b>${inventorySnapshot.currentlyBrowseable}</b><span>현재 탐색 화면에 보이는 콘텐츠</span><small>사용자에게 보이는 수</small></div>
          <div class="funnel-step"><b>${inventorySnapshot.observedSessionsDone}</b><span>직접 관찰한 FlowMe 사용자</span><small>사용자 검증</small></div>
        </div>
        <div class="grid-2" style="margin-top:22px">
          <div class="panel">
            <strong class="kicker">외부 공개 반응</strong>
            <h3>${adoptionEvidence.headline.checkedSources}개 원본 · ${adoptionEvidence.headline.fixedReactions}개 고정 댓글 표본</h3>
            <p>E2 이상 ${adoptionEvidence.headline.fixedE2ToE5}개, E3 이상 ${adoptionEvidence.headline.fixedE3ToE5}개를 확인했다. 콘텐츠를 옮겨 쓰거나 따라 한 자기보고의 간접 근거다.</p>
            ${evidenceTag('public_reaction')}
          </div>
          <div class="panel">
            <strong class="kicker">현재 P0 24개</strong>
            <h3>직접 1 · 인접 19 · 미확인 4</h3>
            <p>직접 증거가 있는 콘텐츠가 하나뿐이라는 뜻이다. 나머지는 선별 가설 또는 공식 과업으로 따로 검증한다.</p>
            ${evidenceTags(['public_reaction', 'repository_fact'])}
          </div>
        </div>
        <div class="ladder">
          ${adoptionEvidence.evidenceLadder
            .map(
              (item) => `<div class="ladder-step"><b>${escapeHtml(item.level)}</b><span>${escapeHtml(item.label)}</span><small>${escapeHtml(
                item.short,
              )}</small></div>`,
            )
            .join('')}
        </div>
        <div class="boundary-note">E2~E5도 공개 자기보고다. FlowMe의 저장 성공률, 첫 행동 도달률, 반복률을 증명하지 않는다.</div>
      </div>
    </section>

    <section class="slide" id="s5" data-page="05 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">05</span>
          <div><div class="eyebrow">충돌한 결론 정리</div><h2>최근 조사에서 충돌한 결론을 이렇게 정리한다</h2></div>
          <span class="claim">통합 판단</span>
        </div>
        <div class="table-scroll"><table class="conflict-table">
          <thead><tr><th>충돌한 질문</th><th>확인된 사실</th><th>최종 판단</th></tr></thead>
          <tbody>
            ${conflictResolutions
              .map(
                (item) => `<tr><td>${escapeHtml(item.question)}${evidenceTags(item.evidenceTypes)}</td><td>${escapeHtml(
                  item.evidence,
                )}</td><td><b>${escapeHtml(item.resolution)}</b></td></tr>`,
              )
              .join('')}
          </tbody>
        </table></div>
      </div>
    </section>

    <section class="slide alt" id="s6" data-page="06 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">06</span>
          <div><div class="eyebrow">Flow의 구조</div><h2>원문은 근거가 되고, 실행 항목은 행동이 되고, 개인 실행본은 상태를 가진다</h2></div>
          <span class="claim">정식 명세 기반</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-01')}${proposalBadge('P-05')}</div>
        <p class="lead">${escapeHtml(canonicalContentContract.definition)}</p>
        <div class="model-pipeline">
          ${canonicalContentContract.hierarchy
            .map(
              (node) => `<article class="model-node"><span>${escapeHtml(node.level)}</span><b>${escapeHtml(
                node.korean,
              )}</b><p>${escapeHtml(node.rule)}</p></article>`,
            )
            .join('')}
        </div>
        <div class="field-strip">
          ${canonicalContentContract.requiredItemFields
            .map((field) => `<span class="required">기본 · ${escapeHtml(field)}</span>`)
            .join('')}
          ${canonicalContentContract.optionalItemFields
            .map((field) => `<span class="optional">선택 · ${escapeHtml(field)}</span>`)
            .join('')}
        </div>
        <div class="executive-line">Step은 필수가 아니다. 한 행동과 원문 링크만으로 충분하면 Item 하나에서 끝낸다.</div>
      </div>
    </section>

    <section class="slide" id="s7" data-page="07 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">07</span>
          <div><div class="eyebrow">네 가지 시작 방식</div><h2>7개 유형을 제품에 노출하지 않고 네 가지 시작 방식으로 단순화한다</h2></div>
          <span class="claim">제품·콘텐츠 공통 규칙</span>
        </div>
        <div class="grid-4">
          ${admissionModes
            .map(
              (mode) => `<article class="mode-card">
                <span class="mode-user-copy">${escapeHtml(mode.userCopy)}</span>
                <h3>${escapeHtml(mode.label)}</h3>
                <p>${escapeHtml(mode.rule)}</p>
                <dl>
                  <dt>대표 예시</dt><dd>${escapeHtml(mode.example)}</dd>
                  <dt>처음 받는 정보</dt><dd>${mode.initialInputs}개</dd>
                  <dt>기본 결과</dt><dd>${escapeHtml(mode.defaultArrival)}</dd>
                </dl>
              </article>`,
            )
            .join('')}
        </div>
        <div class="boundary-note">이 분류는 내부 운영 기준이다. 사용자는 “저장”, “지금 시작”, “날짜를 넣고 시작”, “원문 확인 필요”처럼 자신의 행동만 본다.</div>
      </div>
    </section>

    <section class="slide alt" id="s8" data-page="08 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">08</span>
          <div><div class="eyebrow">하나의 상태, 여러 결과물</div><h2>캘린더·체크리스트·표·메모는 같은 실행본을 다르게 보는 방식이다</h2></div>
          <span class="claim">저장소 확인</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-04')}</div>
        <div class="projection-board">
          <div class="canonical-run">
            <span class="scenario-category">개인 실행본 · 상태는 하나</span>
            <h3>세탁기 필터 관리</h3>
            <div class="item-demo"><b>세탁기 필터 청소하기</b><span>완료 여부 · 8월 30일 · 원문 링크 · 개인 메모</span></div>
          </div>
          <div class="projection-arrow">→</div>
          <div class="projection-grid">
            ${canonicalContentContract.projectionRules
              .map(
                (rule) => `<div class="projection ${escapeHtml(rule.destination)}"><b>${escapeHtml(rule.korean)}</b><p>${escapeHtml(
                  rule.condition,
                )}</p><p><strong>경계:</strong> ${escapeHtml(rule.guardrail)}</p></div>`,
              )
              .join('')}
          </div>
        </div>
        <div class="executive-line">결과물을 바꿔도 완료 상태와 개인 메모는 갈라지지 않는다. 날짜가 없으면 캘린더 결과만 비어 있어야 한다.</div>
      </div>
    </section>

    <section class="slide" id="s9" data-page="09 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">09</span>
          <div><div class="eyebrow">목표 사용자 여정</div><h2>사용자는 입력 폼이 아니라 쓸 수 있는 결과부터 만난다</h2></div>
          <span class="claim">외부 서비스 비교 + UX 판단</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-02')}${proposalBadge('P-03')}${proposalBadge('P-06')}</div>
        <div class="journey">
          ${[
            ['1', '원본 발견', '블로그·영상·공식 안내'],
            ['2', '결과 미리보기', '받을 일정·체크·표·메모'],
            ['3', '저장 또는 실행', '기본 버튼 하나'],
            ['4', '최소 정보', '결과를 바꾸는 0~1개 입력'],
            ['5', '개인 실행본', '내 날짜·완료·메모'],
            ['6', '외부로 보내기', '필요한 형식 하나'],
            ['7', '첫 행동', '오늘 할 한 가지'],
            ['8', '완료·재사용', '지난 기록을 남기고 다시 시작'],
          ]
            .map(
              ([no, title, text]) => `<div class="journey-step"><span>${no}</span><b>${title}</b><p>${text}</p></div>`,
            )
            .join('')}
        </div>
        <div class="ux-rule">
          <div class="current">
            <h3>피해야 할 순서</h3>
            ${list(['로그인·설정·유형 선택', '긴 항목 전체 노출', '저장 결과가 보이지 않음', '원문과 개인 메모가 섞임'])}
          </div>
          <div class="target">
            <h3>목표 순서</h3>
            ${list(['결과와 첫 행동 먼저', '저장 또는 지금 실행', '필요할 때만 날짜·조건', '저장 위치와 다음 행동 확인'])}
          </div>
        </div>
      </div>
    </section>

    <section class="slide alt" id="s10" data-page="10 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">10</span>
          <div><div class="eyebrow">현재와 목표</div><h2>현재 기능은 많다. 이제 화면마다 같은 순서로 보이게 해야 한다</h2></div>
          <span class="claim">자동 렌더링 · 사용자 검증 아님</span>
        </div>
        <div class="screen-comparison">
          <div class="screen-side">
            <h3>현재 로컬 화면</h3>
            <div class="phone-row">
              <figure class="phone"><img src="./2026-07-28-flowme-research-to-product-assets/current-flow-finding-mobile.png" alt="현재 Flow 찾기 모바일 화면"><figcaption>Flow 찾기 · 7개 탐색</figcaption></figure>
              <figure class="phone"><img src="./2026-07-28-flowme-research-to-product-assets/current-result-preview-mobile.png" alt="현재 이사 Flow 결과 미리보기 모바일 화면"><figcaption>이사 결과 · 기준일 입력</figcaption></figure>
              <figure class="phone"><img src="./2026-07-28-flowme-research-to-product-assets/current-my-flow-mobile.png" alt="현재 내 Flow 저장 결과 모바일 화면"><figcaption>내 Flow · 저장 확인과 실행</figcaption></figure>
            </div>
            <div class="boundary-note">URL 입력, 결과 미리보기, 저장, 완료, 메모, 재사용의 기반은 이미 있다. 문제는 기능 부재보다 화면 간 말과 순서가 일정하지 않다는 점이다.</div>
          </div>
          <div class="screen-side">
            <h3>목표 첫 화면 전략 예시</h3>
            <div class="target-phone" aria-label="목표 Flow 첫 화면 전략 예시">
              <div class="appbar"><span>FLOW</span><span>원문 보기</span></div>
              <div class="creator">만들기 제작자 · 2026.07.28 확인</div>
              <h4>공룡 발자국 미술 놀이</h4>
              <span class="result-label">체크리스트 + 원문 영상</span>
              <div class="preview-item"><b>준비물 확인하기</b><span>원문에서 확인된 준비물만 표시</span></div>
              <div class="preview-item"><b>영상을 보며 만들어 보기</b><span>날짜 없이 바로 시작할 수 있음</span></div>
              <button class="primary">지금 시작</button>
              <button class="secondary">저장만 하기 · 날짜는 나중에</button>
              <div class="source-box"><b>원문과 제작자</b><br>영상은 원본 플랫폼에서 재생 · FlowMe에는 체크 상태와 내 메모만 저장</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${scenarioPairs
      .map(
        (pair, index) => `<section class="slide ${index % 2 ? '' : 'alt'}" id="s${11 + index}" data-page="${String(
          11 + index,
        ).padStart(2, '0')} / 22">
          <div class="slide-inner">
            <div class="slide-head">
              <span class="slide-no">${String(11 + index).padStart(2, '0')}</span>
              <div><div class="eyebrow">대표 사례 ${index * 2 + 1}–${index * 2 + pair.length}</div><h2>${escapeHtml(
                [
                  '날짜가 없어도 좋은 Flow가 될 수 있다',
                  '날짜가 생기면 저장본이 계획으로 펼쳐진다',
                  '가능 기간과 예약일은 다른 정보다',
                  '반복과 상태는 회차별 행동으로 보인다',
                  '협업과 공식 절차는 경계를 더 분명히 한다',
                  '학습 진도는 원본 서비스와 개인 기록을 나눈다',
                ][index],
              )}</h2></div>
              <span class="claim">전략 예시 · 발행본 아님</span>
            </div>
            <div class="scenario-grid">${pair.map(renderScenario).join('')}</div>
          </div>
        </section>`,
      )
      .join('')}

    <section class="slide alt" id="s17" data-page="17 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">17</span>
          <div><div class="eyebrow">콘텐츠 전략</div><h2>한 분야의 전문 앱을 복제하지 않고 세 개 검증 경로와 하나의 신뢰 경로로 시작한다</h2></div>
          <span class="claim">추천안 · 관찰 전</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-08')}</div>
        <div class="grid-4">
          ${categoryStrategy
            .map(
              (lane) => `<article class="lane-card">
                ${proposalBadge('P-08')}
                <span class="lane-role">${escapeHtml(lane.role)}</span>
                <h3>${escapeHtml(lane.lane)}</h3>
                <p>${escapeHtml(lane.whyNow)}</p>
                ${list(lane.examples)}
                <p><b>기본 결과:</b> ${escapeHtml(lane.defaultArtifacts.join(' · '))}</p>
                <span class="lane-decision">${escapeHtml(lane.decision)}</span>
                ${evidenceTags(lane.evidenceTypes)}
              </article>`,
            )
            .join('')}
        </div>
        <div class="executive-line">육아·여행은 버리는 것이 아니다. 박물관 저장, 가족여행 준비, 아이 레시피처럼 세 검증 경로가 실제로 쓰이는 유입 상황으로 활용한다.</div>
      </div>
    </section>

    <section class="slide" id="s18" data-page="18 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">18</span>
          <div><div class="eyebrow">P0 검증용 대표 Flow</div><h2>60~90개를 채우기 전에 여덟 개로 핵심 작동 방식을 증명한다</h2></div>
          <span class="claim">가설·미측정</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-09')}</div>
        <div class="table-scroll"><table class="portfolio-table">
          <thead><tr><th>대표 Flow</th><th>검증 경로</th><th>확인할 행동</th><th>기본 결과</th><th>준비도</th><th>대표 이유</th></tr></thead>
          <tbody>
            ${p0ProofPortfolio
              .map(
                (item) => `<tr><td><b>${escapeHtml(item.title)}</b></td><td>${escapeHtml(item.lane)}</td><td>${escapeHtml(
                  item.behavior,
                )}</td><td>${escapeHtml(item.artifact)}</td><td>${escapeHtml(item.readiness)}</td><td>${escapeHtml(
                  item.reason,
                )}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table></div>
        <div class="grid-3" style="margin-top:18px">
          <div class="panel"><strong class="kicker">기존 P0 24개</strong><h3>비교 후보군으로 유지</h3><p>직접 1, 인접 19, 미확인 4. 24개 전체를 출시 콘텐츠로 간주하지 않는다.</p></div>
          <div class="panel"><strong class="kicker">현재 대표 후보 44개</strong><h3>보강 대기열</h3><p>여덟 개의 규칙과 관찰 결과가 확인된 뒤 같은 기준으로 확대한다.</p></div>
          <div class="panel"><strong class="kicker">P0 60~90개</strong><h3>운영 목표 가설</h3><p>사용자 가치와 제작·검토 처리량이 확인된 뒤의 재고 목표다.</p></div>
        </div>
      </div>
    </section>

    <section class="slide alt" id="s19" data-page="19 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">19</span>
          <div><div class="eyebrow">현재 구현</div><h2>새로 만들 기능보다 이미 있는 기능을 같은 규칙으로 맞추는 일이 많다</h2></div>
          <span class="claim">코드·테스트 확인</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-07')}</div>
        <div class="table-scroll"><table class="implementation-table">
          <thead><tr><th>능력</th><th>현재 상태</th><th>제품 판단</th><th>근거 위치</th></tr></thead>
          <tbody>${implementationInventory.map(renderImplementationRow).join('')}</tbody>
        </table></div>
      </div>
    </section>

    <section class="slide" id="s20" data-page="20 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">20</span>
          <div><div class="eyebrow">팀 실행 기준</div><h2>각 팀은 같은 두 개발 단계를 다른 관점에서 완성한다</h2></div>
          <span class="claim">실행 순서</span>
        </div>
        <div class="proposal-strip">${proposalBadge('P-10')}${proposalBadge('P-11')}${proposalBadge('P-12')}</div>
        <div class="slice-preview">
          ${developmentSlices
            .map(
              (slice, index) => `<article class="slice-card ${index ? 'second' : ''}">
                ${proposalBadge(slice.proposalId)}
                <span class="slice-number">${slice.order}</span>
                <h3>${escapeHtml(slice.name)}</h3>
                <p>${escapeHtml(slice.userProblem)}</p>
                <div class="validation"><b>완료 기준</b>${escapeHtml(slice.acceptance.slice(0, 3).join(' · '))}</div>
                <small>${escapeHtml(slice.collisionRisk)}</small>
              </article>${index === 0 ? '<div class="slice-arrow">→</div>' : ''}`,
            )
            .join('')}
        </div>
        <div class="team-board">
          <article class="team"><span>CONTENT</span><h3>출처와 행동을 맞춘다</h3>${list(['원문 행 확인', '기본 결과물 결정', '6~8개 대표 Flow 보강', '근거 부족 후보 보류'])}</article>
          <article class="team"><span>UX</span><h3>결과와 첫 행동을 앞세운다</h3>${list(['한 화면 한 Flow', '0~1개 최소 입력', '날짜 나중에 정하기', '저장 확인과 다음 행동'])}</article>
          <article class="team"><span>DEVELOPMENT</span><h3>기존 기능을 같은 계약으로 묶는다</h3>${list(['Item 상태 단일화', '결과물 변환 일관성', '가짜 인기순 제거', '순차 E2E 고정'])}</article>
          <article class="team"><span>QA / RESEARCH</span><h3>자동 확인과 사용자 관찰을 나눈다</h3>${list(['링크·내보내기 자동 QA', '390px·1440px 렌더링', '15명 행동 관찰', '측정 전 검증 표현 금지'])}</article>
        </div>
      </div>
    </section>

    <section class="slide dark" id="s21" data-page="21 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">21</span>
          <div><div class="eyebrow">CEO 결정</div><h2>오늘 결정할 네 가지</h2></div>
          <span class="claim">승인·수정·보류</span>
        </div>
        <div class="ceo-grid">
          ${ceoDecisions
            .map(
              (item) => `<article class="ceo-decision">
                <span class="decision-no">${item.no}</span>
                <div class="ceo-proposal-refs">${item.proposalIds.map(proposalBadge).join('')}</div>
                <h3>${escapeHtml(item.question)}</h3>
                <dl>
                  <dt>추천안</dt><dd>${escapeHtml(item.recommendation)}</dd>
                  <dt>대안</dt><dd>${escapeHtml(item.alternative)}</dd>
                  <dt>승인 효과</dt><dd>${escapeHtml(item.impact)}</dd>
                </dl>
              </article>`,
            )
            .join('')}
        </div>
        <div class="artifact-links">
          <a href="./2026-07-28-flowme-research-to-product-decision-matrix.json">결정 매트릭스 JSON</a>
          <a href="./2026-07-28-flowme-research-to-product-scenario-contract.json">12개 대표 사례 계약 JSON</a>
          <a href="./2026-07-28-flowme-research-to-product-team-handoff-ko.md">팀 핸드오프 문서</a>
        </div>
        <div class="boundary-note">이 보고서는 전략 결정안이다. FlowMe의 실제 사용성과 시장 반응은 아직 검증되지 않았다.</div>
      </div>
    </section>

    <section class="slide alt" id="s22" data-page="22 / 22">
      <div class="slide-inner">
        <div class="slide-head">
          <span class="slide-no">22</span>
          <div><div class="eyebrow">제안 번호별 피드백</div><h2>가져갈 것, 고칠 것, 버릴 것을 바로 표시한다</h2></div>
          <span class="claim">P-01–P-12 · UI-01–UI-12</span>
        </div>
        <div class="feedback-intro">
          <div><b>사용법</b> 전략은 P 번호, 화면 예시는 UI 번호로 답합니다. 하나를 고르고 수정이 필요할 때만 의견을 적습니다. 선택은 서버로 전송되지 않습니다.</div>
          <div class="feedback-counts" aria-live="polite">
            <span id="count-take">가져감 0</span>
            <span id="count-revise">수정 0</span>
            <span id="count-drop">안 가져감 0</span>
            <span id="count-hold">보류 0</span>
          </div>
        </div>
        <div class="feedback-grid">${proposalRegistry.map((item) => renderFeedbackCard(item)).join('')}</div>
        <details class="ui-feedback-details">
          <summary>화면 예시 UI-01–UI-12도 선택하기</summary>
          <div class="compact-feedback-grid">${uiFeedbackRegistry.map((item) => renderFeedbackCard(item, true)).join('')}</div>
        </details>
        <div class="feedback-output">
          <textarea id="feedback-summary" class="feedback-summary" readonly aria-label="복사용 피드백 요약"></textarea>
          <div class="feedback-tools">
            <button type="button" id="copy-feedback" class="primary-tool">피드백 문장 복사</button>
            <button type="button" id="download-feedback">JSON 받기</button>
            <button type="button" id="reset-feedback">선택 초기화</button>
            <a href="#s21" style="display:flex;align-items:center;justify-content:center;min-height:38px;border:1px solid var(--line);border-radius:4px;background:#fff;text-decoration:none;font-size:10px;font-weight:850">CEO 결정으로 돌아가기</a>
            <div class="feedback-status" id="feedback-status">선택 내용은 현재 브라우저에만 저장됩니다.</div>
          </div>
          <details class="sources-details">
            <summary>근거 문서와 JSON 산출물 보기</summary>
            <div class="source-grid">${sourceDocs.map(renderSourceLink).join('')}</div>
            <div class="artifact-links">
              <a style="color:var(--ink);border-color:var(--line);background:#fff" href="./2026-07-28-flowme-research-to-product-decision-matrix.json">결정 매트릭스 JSON</a>
              <a style="color:var(--ink);border-color:var(--line);background:#fff" href="./2026-07-28-flowme-research-to-product-scenario-contract.json">12개 사례·UI 계약 JSON</a>
              <a style="color:var(--ink);border-color:var(--line);background:#fff" href="./2026-07-28-flowme-research-to-product-team-handoff-ko.md">팀 실행 기준</a>
            </div>
            <div class="boundary-note">공개 사용자 반응, 자동 QA, 렌더링 화면은 FlowMe 실제 사용성 검증이 아니다.</div>
          </details>
        </div>
      </div>
    </section>
  </main>
  <script>
    const links = Array.from(document.querySelectorAll('.topbar nav a'));
    const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach((section) => observer.observe(section));

    const feedbackStorageKey = 'flowme-research-to-product-feedback-v1';
    const feedbackProposals = ${JSON.stringify(
      feedbackRegistry.map((item) => ({ id: item.id, title: item.title })),
    ).replaceAll('<', '\\u003c')};
    const feedbackLabels = {
      take: '가져감',
      revise: '수정',
      drop: '안 가져감',
      hold: '보류',
    };
    const feedbackCards = Array.from(document.querySelectorAll('.feedback-card'));
    const feedbackSummary = document.getElementById('feedback-summary');
    const feedbackStatus = document.getElementById('feedback-status');
    let feedbackState = {};

    try {
      feedbackState = JSON.parse(localStorage.getItem(feedbackStorageKey) || '{}');
    } catch {
      feedbackState = {};
    }

    function setFeedbackStatus(message) {
      feedbackStatus.textContent = message;
    }

    function saveFeedbackState() {
      try {
        localStorage.setItem(feedbackStorageKey, JSON.stringify(feedbackState));
        setFeedbackStatus('선택을 이 브라우저에 저장했습니다.');
      } catch {
        setFeedbackStatus('브라우저 저장을 사용할 수 없습니다. 복사 또는 JSON 받기를 이용하세요.');
      }
    }

    function renderFeedbackState() {
      const counts = { take: 0, revise: 0, drop: 0, hold: 0 };
      const selectedLines = [];
      const unselected = [];

      feedbackProposals.forEach((proposal) => {
        const value = feedbackState[proposal.id] || {};
        if (value.choice && feedbackLabels[value.choice]) {
          counts[value.choice] += 1;
          selectedLines.push(
            proposal.id + ' ' + feedbackLabels[value.choice] +
            (value.note ? ' - ' + value.note : '') +
            ' | ' + proposal.title
          );
        } else {
          unselected.push(proposal.id);
        }
      });

      Object.keys(counts).forEach((key) => {
        const node = document.getElementById('count-' + key);
        node.textContent = feedbackLabels[key] + ' ' + counts[key];
      });

      const lines = ['FlowMe 제안 피드백'];
      if (selectedLines.length) lines.push.apply(lines, selectedLines);
      if (unselected.length) lines.push('미선택: ' + unselected.join(', '));
      feedbackSummary.value = lines.join('\\n');
    }

    feedbackCards.forEach((card) => {
      const proposalId = card.dataset.proposalId;
      const saved = feedbackState[proposalId] || {};
      const savedRadio = card.querySelector('input[type="radio"][value="' + saved.choice + '"]');
      const noteInput = card.querySelector('[data-feedback-note]');
      if (savedRadio) savedRadio.checked = true;
      noteInput.value = saved.note || '';

      card.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.addEventListener('change', () => {
          feedbackState[proposalId] = {
            choice: input.value,
            note: noteInput.value.trim(),
          };
          saveFeedbackState();
          renderFeedbackState();
        });
      });

      noteInput.addEventListener('input', () => {
        const current = feedbackState[proposalId] || {};
        feedbackState[proposalId] = {
          choice: current.choice || '',
          note: noteInput.value.trim(),
        };
        saveFeedbackState();
        renderFeedbackState();
      });
    });

    document.getElementById('copy-feedback').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(feedbackSummary.value);
        setFeedbackStatus('피드백 문장을 복사했습니다.');
      } catch {
        feedbackSummary.focus();
        feedbackSummary.select();
        document.execCommand('copy');
        setFeedbackStatus('피드백 문장을 복사했습니다.');
      }
    });

    document.getElementById('download-feedback').addEventListener('click', () => {
      const payload = {
        report: '2026-07-28-flowme-research-to-product-application-playbook-ceo-ko.html',
        savedAt: new Date().toISOString(),
        proposals: feedbackProposals.map((proposal) => ({
          ...proposal,
          choice: feedbackState[proposal.id]?.choice || '',
          choiceLabel: feedbackLabels[feedbackState[proposal.id]?.choice] || '',
          note: feedbackState[proposal.id]?.note || '',
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = '2026-07-28-flowme-proposal-feedback.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedbackStatus('피드백 JSON을 만들었습니다.');
    });

    document.getElementById('reset-feedback').addEventListener('click', () => {
      if (!window.confirm('이 브라우저에 저장된 제안 선택과 메모를 모두 지울까요?')) return;
      feedbackState = {};
      try { localStorage.removeItem(feedbackStorageKey); } catch {}
      feedbackCards.forEach((card) => {
        card.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
        card.querySelector('[data-feedback-note]').value = '';
      });
      renderFeedbackState();
      setFeedbackStatus('선택과 메모를 초기화했습니다.');
    });

    renderFeedbackState();
  </script>
</body>
</html>
`;

fs.writeFileSync(output.matrix, `${JSON.stringify(decisionMatrix, null, 2)}\n`, 'utf8');
fs.writeFileSync(output.scenarios, `${JSON.stringify(scenarioContract, null, 2)}\n`, 'utf8');
fs.writeFileSync(output.handoff, handoff, 'utf8');
fs.writeFileSync(output.html, reportHtml, 'utf8');

console.log(
  JSON.stringify(
    {
      generatedAt,
      outputs: output,
      counts: {
        applyNow: applyNow.length,
        validateBeforeApply: validateBeforeApply.length,
        defer: defer.length,
        doNotApply: doNotApply.length,
        scenarios: scenarios.length,
        scenarioUiExamples: Object.keys(scenarioUiExamples).length,
        proposals: proposalRegistry.length,
        uiFeedbackItems: uiFeedbackRegistry.length,
        feedbackItems: feedbackRegistry.length,
        proofPortfolio: p0ProofPortfolio.length,
        implementationRows: implementationInventory.length,
        sourceDocs: sourceDocs.length,
      },
    },
    null,
    2,
  ),
);
