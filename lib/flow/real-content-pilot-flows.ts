import { Flow, FlowBundle, FlowItemDetail, RiskLevel, SourceType } from './types';
import { parseTextFlow } from './parser';

const now = '2026-05-21T00:00:00.000Z';

type PilotSource = {
  slug: string;
  category: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: SourceType;
  riskLevel: RiskLevel;
  sourcePublishedAt?: string;
  sourceModifiedAt?: string;
  sourceCheckedAt?: string;
};

export const realContentPilotSources: PilotSource[] = [
  {
    slug: 'samsung-aircon-seasonal-check',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 에어컨 사전점검 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/2002378?assess=N',
    sourceType: 'official',
    riskLevel: 'low',
    sourcePublishedAt: '2026-02-27',
    sourceCheckedAt: '2026-07-12',
  },
  {
    slug: 'samsung-washer-filter-cleaning',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 미세플라스틱 저감장치 필터 청소 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/1477182',
    sourceType: 'official',
    riskLevel: 'low',
    sourcePublishedAt: '2023-06-14',
    sourceCheckedAt: '2026-07-12',
  },
  {
    slug: 'vehicle-inspection-prep',
    category: '자동차/검사',
    sourceTitle: 'TS한국교통안전공단 정기검사 대상·기준·유효기간 안내',
    sourceUrl: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200',
    sourceType: 'official',
    riskLevel: 'medium',
    sourceCheckedAt: '2026-07-12',
  },
  {
    slug: 'qnet-exam-application-prep',
    category: '자격증/시험',
    sourceTitle: 'Q-Net 원서접수 안내',
    sourceUrl: 'https://q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103&rcvPFlag=Y',
    sourceType: 'official',
    riskLevel: 'medium',
  },
  {
    slug: 'computer-skills-d30-study',
    category: '자격증/시험',
    sourceTitle: '2026 한 권으로 끝내는 시나공 컴활 1급 필기+실기',
    sourceUrl: 'https://www.gilbut.co.kr/m/book/view?bookcode=BN004603',
    sourceType: 'reference',
    riskLevel: 'low',
    sourcePublishedAt: '2025-10-15',
    sourceCheckedAt: '2026-07-12',
  },
  {
    slug: 'diet-meal-exercise-log',
    category: '다이어트/기록',
    sourceTitle: '질병관리청 건강하게 체중 감량하기 안내',
    sourceUrl:
      'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  {
    slug: 'diet-reset-2week',
    category: '다이어트/기록',
    sourceTitle: '질병관리청 건강하게 체중 감량하기 안내',
    sourceUrl:
      'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
];

function makePilotBundle(flow: Omit<Flow, 'created_at' | 'updated_at'>, rawText: string): FlowBundle {
  const parsed = parseTextFlow(rawText, flow.id);
  return {
    flow: {
      ...flow,
      content_type: flow.content_type ?? 'default',
      created_at: now,
      updated_at: flow.source_checked_at ? `${flow.source_checked_at}T00:00:00.000Z` : now,
      raw_text: rawText,
    },
    ...parsed,
  };
}

function withPilotDetails(
  bundle: FlowBundle,
  source: Pick<PilotSource, 'sourceType' | 'riskLevel'>,
  details: Record<string, Partial<Pick<FlowBundle['items'][number], 'description' | 'source_type' | 'risk_level'>> & Omit<FlowItemDetail, 'item_id'>>,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => {
      const detail = details[item.title];
      return {
        ...item,
        description: detail?.description ?? item.description,
        source_type: detail?.source_type ?? source.sourceType,
        risk_level: detail?.risk_level ?? source.riskLevel,
      };
    }),
    itemDetails: bundle.items
      .map((item) => {
        const detail = details[item.title];
        return detail
          ? {
              item_id: item.id,
              why: detail.why,
              how: detail.how,
              completion_criteria: detail.completion_criteria,
              caution: detail.caution,
              links: detail.links,
            }
          : null;
      })
      .filter(Boolean) as FlowItemDetail[],
  };
}

const samsungAirconText = `## 가동 전 자가 점검
- 전원 플러그와 전용 차단기 확인하기
- 리모컨 표시와 배터리 확인하기
- 실외기 주변과 실외기실 통풍 확보하기
- 제품별 먼지 필터 확인하고 청소하기

## 냉방 상태 확인
- 냉방 18도로 10분 이상 시험 가동하기`;

const samsungWasherText = `## 청소 전 확인
- 미세플라스틱 저감장치 필터 LED 상태 확인하기
- 본 제품과 연결된 세탁기 전원 끄기
- 필터 손잡이와 분리 방향 확인하기

## 필터 분해와 이물질 제거
- 필터 손잡이를 돌려 필터 분리하기
- 필터를 손잡이에서 분리하기
- 필터 이물질을 물세척 없이 제거하기
- 손상이나 변형 여부 확인하기

## 재조립과 리셋
- 필터 손잡이를 다시 조립하기
- 필터를 시계 방향으로 밀어 넣기
- 전원을 연결하고 필터 버튼 3초 리셋하기`;

const vehicleInspectionText = `## D-14 검사 기간 확인
- 자동차검사 기간과 예약 가능일 확인하기 D-14
- 차량번호와 예약 정보 확인하기 D-14
- 가까운 검사소와 수수료 확인하기 D-10

## D-3 차량 상태 점검
- 번호판과 차대번호 식별 상태 확인하기 D-3
- 등화장치와 경음기 작동 확인하기 D-3
- 타이어 마모와 공기압 확인하기 D-3
- 오일 누유와 경고등 여부 기록하기 D-3

## D-Day 검사 당일
- 예약 시간보다 여유 있게 검사소 도착하기 D-Day
- 접수와 수수료 결제 진행하기 D-Day
- 검사 결과와 재검사 필요 항목 기록하기 D-Day`;

const qnetExamText = `## D-30 응시 조건 확인
- 응시 자격과 제출 서류 필요 여부 확인하기 D-30
- Q-Net 회원 정보와 사진 등록 상태 확인하기 D-30
- 원서접수 시작일, 마감 시각, 결제 수단 기록하기 D-21

## D-14 접수 후 확인
- 접수 내역, 결제 완료, 접수번호 저장하기 D-14
- 환불과 변경 마감일을 별도 deadline으로 기록하기 D-14
- 수험표 출력 가능 시점과 PDF 보관 위치 확인하기 D-7

## D-Day 시험 당일
- 신분증과 수험표 챙기기 D-Day
- 허용 필기구, 계산기 기준, 입실 시간 확인하기 D-Day
- 시험장 이동 시간과 합격자 발표일 기록하기 D-Day`;

const computerSkillsText = `## D-30 범위 쪼개기
- 필기와 실기 시험 범위 나누기 D-30
- 매일 공부 가능한 시간 블록 정하기 D-30
- 기출 회독 목표 정하기 D-28

## D-21 기본기 회독
- 핵심 이론 1회독 시작하기 D-21
- 자주 틀리는 기능 목록 만들기 D-18
- 실기 프로그램 환경 점검하기 D-14

## D-7 실전 전환
- 제한 시간 맞춰 모의 문제 풀기 D-7
- 오답을 유형별로 정리하기 D-5
- 시험장 준비물과 이동 시간 확인하기 D-1`;

const dietLogText = `@매일
## 아침 설정
- 오늘 식사 시간과 운동 가능 시간 정하기
- 단백질과 채소 포함 여부 계획하기
- 물 섭취 목표 정하기

## 저녁 기록
- 실제 식사와 간식 기록하기
- 운동 시간과 강도 기록하기
- 배고픔과 컨디션 변화 기록하기
- 다음 날 조정할 한 가지 정하기`;

const dietResetText = `@14일
## 1주차 관찰
- 시작 체중보다 식사 패턴 먼저 기록하기
- 매일 같은 시간에 식사 로그 남기기
- 무리한 제한 없이 줄일 간식 하나 정하기
- 걷기나 가벼운 운동 시간을 확보하기

## 2주차 조정
- 자주 무너지는 시간대 찾기
- 대체 식사나 간식 후보 정하기
- 운동 후 컨디션과 수면 상태 기록하기
- 다음 2주에 유지할 규칙 3개 정하기`;

const [
  samsungAirconSource,
  samsungWasherSource,
  vehicleInspectionSource,
  qnetExamSource,
  computerSkillsSource,
  dietLogSource,
  dietResetSource,
] = realContentPilotSources;

export const realContentPilotBundles: FlowBundle[] = [
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-samsung-aircon-seasonal-check',
        slug: samsungAirconSource.slug,
        title: '삼성 에어컨 계절 전 점검 Flow',
        description: '계절 시작 전 에어컨 전원, 실외기 주변, 필터, 시험 가동 상태를 순서대로 확인합니다.',
        category: samsungAirconSource.category,
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: samsungAirconSource.riskLevel,
        source_title: samsungAirconSource.sourceTitle,
        source_url: samsungAirconSource.sourceUrl,
        source_published_at: samsungAirconSource.sourcePublishedAt,
        source_modified_at: samsungAirconSource.sourceModifiedAt,
        source_checked_at: samsungAirconSource.sourceCheckedAt,
      },
      samsungAirconText,
    ),
    samsungAirconSource,
    {
      '실외기 주변과 실외기실 통풍 확보하기': {
        description: '실외기 주변 장애물을 치우고 실외기실 창문을 열어 통풍을 확보합니다.',
        why: '실외기 통풍이 막히면 냉방 효율이 떨어지고 제품 부담이 커질 수 있습니다.',
        how: '실외기 앞뒤의 물건을 치우고, 실외기실에 설치된 경우 창문을 충분히 엽니다.',
        completion_criteria: '실외기 주변과 실외기실의 바람길을 확보했다.',
        links: [{ label: samsungAirconSource.sourceTitle, url: samsungAirconSource.sourceUrl, type: 'official' }],
        source_type: samsungAirconSource.sourceType,
        risk_level: samsungAirconSource.riskLevel,
      },
      '제품별 먼지 필터 확인하고 청소하기': {
        description: '제품 설명서에서 필터 종류와 분리 방법을 확인한 뒤 먼지를 제거합니다.',
        why: '필터 먼지는 냄새와 효율 저하의 흔한 원인이므로 사용 전 확인이 필요합니다.',
        how: '극세필터는 진공청소기로 먼지를 제거하고, 물세척한 경우 그늘에서 완전히 말립니다. 다른 필터는 모델별 안내를 우선합니다.',
        completion_criteria: '필터를 청소하고 물기가 남지 않은 상태로 재조립했다.',
        links: [{ label: samsungAirconSource.sourceTitle, url: samsungAirconSource.sourceUrl, type: 'official' }],
        source_type: samsungAirconSource.sourceType,
        risk_level: samsungAirconSource.riskLevel,
      },
      '냉방 18도로 10분 이상 시험 가동하기': {
        description: '냉방 운전과 18도를 선택하고 10분 이상 기다려 찬바람이 나오는지 확인합니다.',
        why: '실제 가동 전에 냉방 상태를 확인하면 더운 시기에 발견할 고장을 미리 찾을 수 있습니다.',
        how: '냉방 모드, 희망 온도 18도로 설정하고 10분 이상 가동한 뒤 찬바람이 나오는지 확인합니다.',
        completion_criteria: '10분 이상 시험 가동하고 냉방 상태를 확인했다.',
        links: [{ label: samsungAirconSource.sourceTitle, url: samsungAirconSource.sourceUrl, type: 'official' }],
        source_type: samsungAirconSource.sourceType,
        risk_level: samsungAirconSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-samsung-washer-filter-cleaning',
        slug: samsungWasherSource.slug,
        title: '삼성 미세플라스틱 저감장치 필터 청소 Flow',
        description: '삼성전자서비스 안내 범위에 맞춰 미세플라스틱 저감장치 필터 분리, 이물질 제거, 재조립, 리셋을 확인합니다.',
        category: samsungWasherSource.category,
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: samsungWasherSource.riskLevel,
        source_title: samsungWasherSource.sourceTitle,
        source_url: samsungWasherSource.sourceUrl,
        source_published_at: samsungWasherSource.sourcePublishedAt,
        source_modified_at: samsungWasherSource.sourceModifiedAt,
        source_checked_at: samsungWasherSource.sourceCheckedAt,
      },
      samsungWasherText,
    ),
    samsungWasherSource,
    {
      '미세플라스틱 저감장치 필터 LED 상태 확인하기': {
        description: '필터 LED가 깜빡이는지 확인해 청소 필요 상태인지 먼저 봅니다.',
        why: '공식 안내는 필터 LED 점등을 청소 필요 신호로 설명합니다.',
        how: '제품 표시부에서 필터 LED 상태를 확인하고 청소 시작 여부를 결정합니다.',
        completion_criteria: '필터 LED 상태와 청소 필요 여부를 확인했다.',
        links: [{ label: samsungWasherSource.sourceTitle, url: samsungWasherSource.sourceUrl, type: 'official' }],
        source_type: samsungWasherSource.sourceType,
        risk_level: samsungWasherSource.riskLevel,
      },
      '필터 이물질을 물세척 없이 제거하기': {
        description: '분리한 필터의 이물질을 쓰레기통에 버리고 물로 세척하지 않습니다.',
        why: '공식 안내는 수거된 이물질을 물과 함께 배출하지 않도록 물세척을 피하라고 설명합니다.',
        how: '필터 안 이물질을 마른 상태로 제거하고, 청소 중 나온 이물질은 쓰레기통에 버립니다.',
        completion_criteria: '필터 이물질을 물세척 없이 제거했다.',
        links: [{ label: samsungWasherSource.sourceTitle, url: samsungWasherSource.sourceUrl, type: 'official' }],
        source_type: samsungWasherSource.sourceType,
        risk_level: samsungWasherSource.riskLevel,
      },
      '전원을 연결하고 필터 버튼 3초 리셋하기': {
        description: '필터를 재조립한 뒤 전원을 연결하고 필터 버튼을 3초 동안 눌러 리셋합니다.',
        why: '청소 후 리셋까지 해야 표시 상태를 정리하고 다음 사용 상태를 확인할 수 있습니다.',
        how: '필터를 시계 방향으로 밀어 넣고 전원을 연결한 뒤 필터 버튼을 3초간 누릅니다.',
        completion_criteria: '필터 재조립과 버튼 리셋까지 완료했다.',
        links: [{ label: samsungWasherSource.sourceTitle, url: samsungWasherSource.sourceUrl, type: 'official' }],
        source_type: samsungWasherSource.sourceType,
        risk_level: samsungWasherSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-vehicle-inspection-prep',
        slug: vehicleInspectionSource.slug,
        title: '자동차검사 D-14 준비 Flow',
        description: '자동차검사 가능 기간, 예약 정보, 차량 상태, 당일 접수와 결과 확인을 단계별로 준비합니다.',
        category: vehicleInspectionSource.category,
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: vehicleInspectionSource.riskLevel,
        source_title: vehicleInspectionSource.sourceTitle,
        source_url: vehicleInspectionSource.sourceUrl,
        source_published_at: vehicleInspectionSource.sourcePublishedAt,
        source_modified_at: vehicleInspectionSource.sourceModifiedAt,
        source_checked_at: vehicleInspectionSource.sourceCheckedAt,
        warning: '검사 기간, 수수료, 재검사 기준은 차량과 검사소 상황에 따라 달라질 수 있으므로 공식 안내를 확인하세요.',
      },
      vehicleInspectionText,
    ),
    vehicleInspectionSource,
    {
      '자동차검사 기간과 예약 가능일 확인하기': {
        description: '차량별 검사 가능 기간과 예약 가능한 날짜를 먼저 확인합니다.',
        why: '검사 기간을 놓치면 과태료나 재검사 일정 문제가 생길 수 있습니다.',
        how: 'TS 정기검사 안내와 사이버검사소에서 차량별 검사 가능 기간과 예약 가능일을 확인합니다.',
        completion_criteria: '차량별 검사 가능 기간과 예약 후보일을 기록했다.',
        links: [{ label: vehicleInspectionSource.sourceTitle, url: vehicleInspectionSource.sourceUrl, type: 'official' }],
        source_type: vehicleInspectionSource.sourceType,
        risk_level: vehicleInspectionSource.riskLevel,
      },
      '차량번호와 예약 정보 확인하기': {
        description: '종이 서류를 일괄 준비하기보다 예약에 쓰는 차량번호와 예약자 연락처, 예약 내역을 확인합니다.',
        why: '검사 종류와 접수 방식에 따라 필요한 정보가 달라질 수 있어 현재 예약 화면을 기준으로 확인하는 편이 정확합니다.',
        how: '사이버검사소 예약 내역에서 차량번호, 검사 종류, 검사소, 예약 시각, 예약자 연락처를 확인합니다.',
        completion_criteria: '차량번호와 검사소, 예약 시각을 바로 열 수 있게 저장했다.',
        links: [{ label: vehicleInspectionSource.sourceTitle, url: vehicleInspectionSource.sourceUrl, type: 'official' }],
        source_type: vehicleInspectionSource.sourceType,
        risk_level: vehicleInspectionSource.riskLevel,
      },
      '등화장치와 경음기 작동 확인하기': {
        description: '전조등, 방향지시등, 제동등, 비상등, 경음기 작동 상태를 확인합니다.',
        why: '기본 안전장치 이상은 검사 지적이나 재검사로 이어질 수 있습니다.',
        how: '차량을 정차한 상태에서 외부 도움을 받아 각 장치를 순서대로 켜 봅니다.',
        completion_criteria: '주요 등화장치와 경음기가 정상 작동함을 확인했다.',
        source_type: vehicleInspectionSource.sourceType,
        risk_level: vehicleInspectionSource.riskLevel,
      },
      '검사 결과와 재검사 필요 항목 기록하기': {
        description: '검사 후 적합 여부와 보완 또는 재검사 항목을 기록합니다.',
        why: '재검사가 필요한 경우 기한과 정비 항목을 바로 정리해야 일정 지연을 줄일 수 있습니다.',
        how: '검사 결과표를 보관하고 재검사 항목, 기한, 정비 필요 사항을 메모합니다.',
        completion_criteria: '검사 결과와 후속 조치 필요 여부를 기록했다.',
        links: [{ label: vehicleInspectionSource.sourceTitle, url: vehicleInspectionSource.sourceUrl, type: 'official' }],
        source_type: vehicleInspectionSource.sourceType,
        risk_level: vehicleInspectionSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-qnet-exam-application-prep',
        slug: qnetExamSource.slug,
        title: 'Q-Net 원서접수 준비 Flow',
        description: '응시 조건, 회원 정보, 원서접수 일정, 수험표와 시험 당일 준비물을 D-Day 기준으로 확인합니다.',
        category: qnetExamSource.category,
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: qnetExamSource.riskLevel,
        source_title: qnetExamSource.sourceTitle,
        source_url: qnetExamSource.sourceUrl,
        warning: '시험별 접수 기간, 환불, 변경, 준비물 기준은 다를 수 있으므로 Q-Net 공지를 기준으로 확인하세요.',
      },
      qnetExamText,
    ),
    qnetExamSource,
    {
      '응시 자격과 제출 서류 필요 여부 확인하기': {
        description: '응시하려는 종목의 자격 요건과 사전 제출 서류 필요 여부를 확인합니다.',
        why: '응시 자격이나 서류 확인을 놓치면 접수 후에도 시험 응시가 제한될 수 있습니다.',
        how: 'Q-Net 종목별 안내와 원서접수 안내에서 응시 조건, 서류 제출 기준을 확인합니다.',
        completion_criteria: '응시 조건과 제출 서류 필요 여부를 기록했다.',
        links: [{ label: qnetExamSource.sourceTitle, url: qnetExamSource.sourceUrl, type: 'official' }],
        source_type: qnetExamSource.sourceType,
        risk_level: qnetExamSource.riskLevel,
      },
      '접수 내역, 결제 완료, 접수번호 저장하기': {
        description: '접수 완료 후 결제 상태, 접수번호, 시험장, 일시, 과목 정보를 다시 확인합니다.',
        why: '접수만 완료하고 결제나 접수번호 저장을 놓치면 이후 수험표와 변경 확인이 흔들릴 수 있습니다.',
        how: 'Q-Net 접수 내역에서 결제 완료 여부, 접수번호, 시험장 주소, 입실 시간, 변경 가능 여부를 확인합니다.',
        completion_criteria: '결제 상태, 접수번호, 시험장 위치를 저장했다.',
        links: [{ label: qnetExamSource.sourceTitle, url: qnetExamSource.sourceUrl, type: 'official' }],
        source_type: qnetExamSource.sourceType,
        risk_level: qnetExamSource.riskLevel,
      },
      '신분증과 수험표 챙기기': {
        description: '시험 당일 필요한 신분증과 수험표를 별도 위치에 준비합니다.',
        why: '신분 확인 자료가 없으면 응시가 제한될 수 있습니다.',
        how: '시험별 신분증 인정 기준과 수험표 출력 가능 시점을 확인하고 전날 가방에 넣습니다.',
        completion_criteria: '신분증과 수험표를 준비했다.',
        source_type: qnetExamSource.sourceType,
        risk_level: qnetExamSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-computer-skills-d30-study',
        slug: computerSkillsSource.slug,
        title: '컴퓨터활용능력 1급 D-30 학습 Flow',
        description:
          '2026 시나공 1급 교재를 기준으로 필기와 실기 범위를 나누고 기출 회독, 실기 환경 점검, 실전 전환을 30일 단위로 진행합니다. D-30 일정은 FLOW가 시험일 기준으로 변환한 실행표입니다.',
        category: computerSkillsSource.category,
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: computerSkillsSource.riskLevel,
        source_title: computerSkillsSource.sourceTitle,
        source_url: computerSkillsSource.sourceUrl,
        source_published_at: computerSkillsSource.sourcePublishedAt,
        source_modified_at: computerSkillsSource.sourceModifiedAt,
        source_checked_at: computerSkillsSource.sourceCheckedAt,
        warning: '이 Flow는 2026 컴퓨터활용능력 1급 교재와 2024~2026 시험 기준에 맞춘 학습표입니다. 2027년 이후 시험은 대한상공회의소의 새 출제기준을 다시 확인하세요.',
      },
      computerSkillsText,
    ),
    computerSkillsSource,
    {
      '필기와 실기 시험 범위 나누기': {
        description: '필기 이론과 실기 기능을 분리해 남은 기간의 학습 범위를 나눕니다.',
        why: '컴퓨터활용능력은 암기와 실습 비중이 달라 같은 방식으로 공부하면 누락이 생기기 쉽습니다.',
        how: '실행: 교재 페이지와 목차를 열고 필기, 스프레드시트 실기, 데이터베이스 실기, 기출 보완을 네 블록으로 나눕니다. 기록: 챕터 진도표의 범위 row를 확인하고 목표일과 상태만 조정합니다.',
        completion_criteria: 'D-30부터 시험 전날까지의 학습 범위를 나눴다.',
        links: [{ label: computerSkillsSource.sourceTitle, url: computerSkillsSource.sourceUrl, type: 'reference' }],
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '매일 공부 가능한 시간 블록 정하기': {
        description: '평일과 주말에 실제로 비울 수 있는 공부 시간을 캘린더 기준으로 정합니다.',
        why: 'D-30 학습표는 시험일에서 역산되므로, 사용자가 매일 확보할 시간 없이 날짜만 만들면 실행이 끊깁니다.',
        how: '실행: 평일 공부 가능 시간과 주말 보충 시간을 각각 하나씩 정합니다. 기록: 캘린더 일정 제목이나 챕터 진도표 메모에 평일/주말 공부 가능 시간을 적습니다.',
        completion_criteria: '평일과 주말 공부 시간 블록을 정하고 D-30 학습표에 반영했다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '기출 회독 목표 정하기': {
        description: '남은 기간 안에 풀 기출 회차와 재풀이 기준을 정합니다.',
        why: '컴활 학습은 새 범위 학습만큼 기출 회독과 오답 재풀이 기준이 중요합니다.',
        how: '실행: 시험일까지 풀 기출 회차 수와 재풀이할 회차를 정합니다. 기록: 기출 점수·오답 기록에 회차, 목표 점수, 재풀이일을 적습니다.',
        completion_criteria: '기출 회독 목표와 재풀이 기준이 모의점수 로그에 들어갔다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '핵심 이론 1회독 시작하기': {
        description: '필기 핵심 개념 row부터 첫 회독을 시작하고 완료 상태를 남깁니다.',
        why: '첫 주에 필기 핵심을 한 번 지나가야 뒤의 기출 오답을 유형별로 묶을 수 있습니다.',
        how: '실행: 챕터 진도표의 필기 핵심 개념 row를 오늘 목표로 잡고 읽은 범위를 표시합니다. 기록: 목표일, 상태, 약한 개념 메모를 챕터 진도표에 남깁니다.',
        completion_criteria: '필기 핵심 개념 row의 목표일과 상태가 챕터 진도표에 기록됐다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '자주 틀리는 기능 목록 만들기': {
        description: '반복해서 틀리는 함수, 피벗, 쿼리, 폼 같은 기능을 유형으로 묶습니다.',
        why: '틀린 기능을 유형으로 묶어야 마지막 주에 새 범위보다 재풀이 우선순위를 잡을 수 있습니다.',
        how: '실행: 최근 기출이나 연습 문제에서 틀린 기능을 함수식, 피벗테이블, 쿼리, 폼처럼 유형으로 묶습니다. 기록: 기출 점수·오답 기록의 오답 칸과 재풀이일 칸에 남깁니다.',
        completion_criteria: '자주 틀리는 기능 유형과 재풀이일이 기출 점수·오답 기록에 들어갔다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '실기 프로그램 환경 점검하기': {
        description: '2026년 1급 실기 기준인 MS Office LTSC Professional Plus 2021과 연습 파일 실행 환경을 확인합니다.',
        why: '실기 시험은 기능 위치와 단축키, 파일 형식에 익숙해지는 시간이 필요합니다.',
        how: '실행: 대한상공회의소 시험안내에서 현재 수험용 프로그램을 확인한 뒤 실기 연습 파일을 열고 저장, 함수 입력, 피벗 또는 쿼리 작업을 시험합니다. 기록: 프로그램 버전과 막힌 기능을 챕터 진도표 메모에 적습니다.',
        completion_criteria: '실기 연습 파일을 열고 저장까지 테스트했다.',
        links: [{ label: '대한상공회의소 컴퓨터활용능력 시험안내', url: 'https://license.korcham.net/co/examguide.do', type: 'official' }],
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '제한 시간 맞춰 모의 문제 풀기': {
        description: '시험 직전에는 실제 제한 시간을 두고 모의 문제를 풉니다.',
        why: '시간 제한 안에서 막히는 지점을 알아야 마지막 보완을 새 범위가 아니라 실전 약점에 집중할 수 있습니다.',
        how: '실행: 제한 시간을 정해 모의 문제나 기출 회차를 한 번 풉니다. 기록: 점수, 남은 시간, 틀린 유형을 기출 점수·오답 기록에 적습니다.',
        completion_criteria: '제한 시간 풀이 결과가 점수와 오답 유형으로 기록됐다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '오답을 유형별로 정리하기': {
        description: '반복해서 틀리는 이론, 함수, 기능을 유형별로 모읍니다.',
        why: '시험 직전에는 새 범위보다 반복 실수 제거가 점수 개선에 더 직접적일 수 있습니다.',
        how: '실행: 오답을 암기형, 계산형, 기능 조작형으로 분류하고 다시 풀 날짜를 정합니다. 기록: 기출 점수·오답 기록에 오답 유형과 재풀이일을 남깁니다.',
        completion_criteria: '오답 유형 목록과 재풀이 일정을 만들었다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '시험장 준비물과 이동 시간 확인하기': {
        description: '시험 전날에는 공부량을 늘리기보다 시험장 준비와 이동 시간을 확인합니다.',
        why: '마지막 하루는 새 범위를 늘리는 것보다 시험장 변수와 준비물 누락을 줄이는 편이 더 안전합니다.',
        how: '실행: 수험표, 신분증, 시험장 위치, 이동 시간을 확인합니다. 기록: 시험장 준비 메모나 캘린더 일정에 출발 시간과 준비물 확인 상태를 남깁니다.',
        completion_criteria: '시험장 준비물과 이동 시간이 캘린더 일정 또는 시험장 준비 메모에 기록됐다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-diet-meal-exercise-log',
        slug: dietLogSource.slug,
        title: '다이어트 식사·운동 기록 Flow',
        description: '매일 아침 식사와 운동 가능 시간을 정하고 저녁에 실제 식사, 운동, 컨디션을 기록합니다.',
        category: dietLogSource.category,
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: dietLogSource.riskLevel,
        source_title: dietLogSource.sourceTitle,
        source_url: dietLogSource.sourceUrl,
        warning: '체중 감량과 운동은 건강 상태에 따라 달라질 수 있습니다. 질환, 임신, 통증, 섭식 문제가 있으면 전문가와 상담하세요.',
      },
      dietLogText,
    ),
    dietLogSource,
    {
      '단백질과 채소 포함 여부 계획하기': {
        description: '끼니마다 단백질과 채소가 들어가는지 먼저 계획합니다.',
        why: '식사 기록은 제한보다 패턴 파악이 목적이며, 균형을 확인해야 무리한 감량을 피할 수 있습니다.',
        how: '아침에 오늘 먹을 끼니를 떠올리고 단백질, 채소가 빠진 끼니를 표시합니다.',
        completion_criteria: '오늘 식사 계획에 단백질과 채소 포함 여부를 표시했다.',
        caution: '특정 식품군을 무리하게 배제하지 마세요.',
        links: [{ label: dietLogSource.sourceTitle, url: dietLogSource.sourceUrl, type: 'official' }],
        source_type: dietLogSource.sourceType,
        risk_level: dietLogSource.riskLevel,
      },
      '운동 시간과 강도 기록하기': {
        description: '실제 운동 시간, 강도, 몸 상태를 함께 적습니다.',
        why: '운동량만 늘리기보다 피로와 회복 상태를 함께 봐야 지속 가능한 루틴을 만들 수 있습니다.',
        how: '운동 종류, 시간, 체감 강도, 통증 또는 어지러움 여부를 짧게 기록합니다.',
        completion_criteria: '운동 시간과 강도, 몸 상태를 기록했다.',
        caution: '통증이나 어지러움이 있으면 운동을 중단하고 상태를 확인하세요.',
        source_type: dietLogSource.sourceType,
        risk_level: dietLogSource.riskLevel,
      },
      '다음 날 조정할 한 가지 정하기': {
        description: '하루 기록을 보고 내일 바꿀 행동 하나만 정합니다.',
        why: '한 번에 많은 규칙을 바꾸면 지속하기 어렵고 기록도 흐려질 수 있습니다.',
        how: '간식, 물, 운동, 수면 중 가장 영향이 컸던 하나를 골라 내일 규칙으로 적습니다.',
        completion_criteria: '다음 날 조정할 행동 한 가지를 정했다.',
        source_type: dietLogSource.sourceType,
        risk_level: dietLogSource.riskLevel,
      },
    },
  ),
  withPilotDetails(
    makePilotBundle(
      {
        id: 'flow-diet-reset-2week',
        slug: dietResetSource.slug,
        title: '다이어트 2주 습관 리셋 Flow',
        description: '2주 동안 식사 패턴을 관찰하고 간식, 걷기, 대체 식사 후보를 작게 조정합니다.',
        category: dietResetSource.category,
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: dietResetSource.riskLevel,
        source_title: dietResetSource.sourceTitle,
        source_url: dietResetSource.sourceUrl,
        warning: '건강 상태와 생활 패턴에 따라 적절한 식사와 운동은 달라질 수 있습니다. 무리한 제한은 피하고 필요한 경우 전문가와 상담하세요.',
      },
      dietResetText,
    ),
    dietResetSource,
    {
      '시작 체중보다 식사 패턴 먼저 기록하기': {
        description: '체중보다 식사 시간, 간식, 외식 빈도 같은 패턴을 먼저 기록합니다.',
        why: '초기 2주는 체중 변화보다 무너지는 패턴을 찾는 것이 지속 가능성에 더 중요합니다.',
        how: '식사 시간, 간식 시간, 배고픔 정도, 수면 시간을 간단히 적습니다.',
        completion_criteria: '체중 외에 식사 패턴 기록 항목을 정했다.',
        caution: '체중 숫자만으로 성공 여부를 판단하지 마세요.',
        links: [{ label: dietResetSource.sourceTitle, url: dietResetSource.sourceUrl, type: 'official' }],
        source_type: dietResetSource.sourceType,
        risk_level: dietResetSource.riskLevel,
      },
      '무리한 제한 없이 줄일 간식 하나 정하기': {
        description: '완전 금지 대신 줄일 간식 하나와 대체 행동을 정합니다.',
        why: '극단적인 제한은 폭식이나 루틴 중단으로 이어질 수 있어 작은 조정이 필요합니다.',
        how: '가장 자주 먹는 간식 하나를 고르고 횟수, 양, 대체 후보를 정합니다.',
        completion_criteria: '줄일 간식 하나와 대체 후보를 기록했다.',
        caution: '식사를 거르거나 과도하게 제한하지 마세요.',
        source_type: dietResetSource.sourceType,
        risk_level: dietResetSource.riskLevel,
      },
      '다음 2주에 유지할 규칙 3개 정하기': {
        description: '2주 기록 중 실제로 지킬 수 있었던 규칙 세 가지만 남깁니다.',
        why: '리셋의 목적은 단기 감량보다 다음 루틴으로 옮겨 갈 지속 가능한 규칙을 찾는 것입니다.',
        how: '식사, 간식, 운동, 수면 중 성공률이 높았던 행동을 세 개 골라 다음 2주 규칙으로 적습니다.',
        completion_criteria: '다음 2주에 유지할 규칙 세 개를 정했다.',
        source_type: dietResetSource.sourceType,
        risk_level: dietResetSource.riskLevel,
      },
    },
  ),
];
