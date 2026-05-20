import { Flow, FlowBundle, FlowItemDetail, RiskLevel } from './types';
import { parseTextFlow } from './parser';

const now = '2026-05-21T00:00:00.000Z';

type PilotSource = {
  slug: string;
  category: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: 'official' | 'creator_experience' | 'reference';
  riskLevel: RiskLevel;
};

export const realContentPilotSources: PilotSource[] = [
  {
    slug: 'samsung-aircon-seasonal-check',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 Samsung Care+ 에어컨 관리 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/info/carePlus',
    sourceType: 'official',
    riskLevel: 'low',
  },
  {
    slug: 'samsung-washer-filter-cleaning',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 세탁기 필터 청소 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/1477182',
    sourceType: 'official',
    riskLevel: 'low',
  },
  {
    slug: 'vehicle-inspection-prep',
    category: '자동차/검사',
    sourceTitle: 'TS한국교통안전공단 자동차검사 절차 안내',
    sourceUrl: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    sourceType: 'official',
    riskLevel: 'medium',
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
    sourceTitle: '시나공 컴퓨터활용능력 학습 후기와 교재 정보',
    sourceUrl: 'https://www.sinagong.co.kr/',
    sourceType: 'reference',
    riskLevel: 'low',
  },
  {
    slug: 'diet-meal-exercise-log',
    category: '다이어트/기록',
    sourceTitle: '핏블리 다이어트 식단·운동 루틴 참고',
    sourceUrl: 'https://fashionbiz.co.kr/article/204870',
    sourceType: 'creator_experience',
    riskLevel: 'medical_sensitive',
  },
  {
    slug: 'diet-reset-2week',
    category: '다이어트/기록',
    sourceTitle: '다이어트 습관 리셋 루틴 참고',
    sourceUrl: 'https://fashionbiz.co.kr/article/204870',
    sourceType: 'creator_experience',
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
      updated_at: now,
      raw_text: rawText,
    },
    ...parsed,
  };
}

function withPilotDetails(
  bundle: FlowBundle,
  details: Record<string, Pick<FlowBundle['items'][number], 'description' | 'source_type' | 'risk_level'> & Omit<FlowItemDetail, 'item_id'>>,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => {
      const detail = details[item.title];
      return detail
        ? {
            ...item,
            description: detail.description,
            source_type: detail.source_type,
            risk_level: detail.risk_level,
          }
        : item;
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

const samsungAirconText = `@계절 시작 전 1회
## 사용 전 자가 점검
- 전원 연결과 리모컨 배터리 확인하기
- 실외기 주변 통풍 공간 정리하기
- 실내기 먼지 필터 분리와 세척하기
- 냉방 시험 가동하고 냄새와 소음 기록하기

## 사용 중 반복 관리
- 2주마다 외부 필터 먼지 확인하기
- 냉방 효율이 떨어졌는지 체감 기록하기
- 물 맺힘이나 누수 흔적 확인하기
- 전문 세척 필요 여부 결정하기`;

const samsungWasherText = `@월 1회
## 필터 점검
- 세탁기 전원 끄고 물기 주변 정리하기
- 필터 분리 가능 여부와 모델 안내 확인하기
- 필터 이물질 제거하고 손상 여부 확인하기
- 필터 재조립 후 배수 오류가 없는지 확인하기

## 세탁 환경 관리
- 세탁조 냄새와 이물질 발생 여부 기록하기
- 세탁실 습기와 곰팡이 흔적 확인하기
- 전문 세척 또는 소모품 교체 필요 여부 판단하기`;

const vehicleInspectionText = `## D-14 검사 기간 확인
- 자동차검사 유효기간과 예약 가능일 확인하기 D-14
- 자동차등록증과 차량 정보 준비하기 D-14
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
- 원서접수 시작일과 결제 수단 준비하기 D-21

## D-14 접수 후 확인
- 접수 내역과 시험장 위치 확인하기 D-14
- 환불과 변경 마감일 기록하기 D-14
- 수험표 출력 가능 시점 확인하기 D-7

## D-Day 시험 당일
- 신분증과 수험표 챙기기 D-Day
- 허용 필기구와 계산기 기준 확인하기 D-Day
- 시험 후 합격자 발표일 기록하기 D-Day`;

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
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: samsungAirconSource.riskLevel,
        source_title: samsungAirconSource.sourceTitle,
        source_url: samsungAirconSource.sourceUrl,
      },
      samsungAirconText,
    ),
    {
      '실외기 주변 통풍 공간 정리하기': {
        description: '실외기 주변 장애물을 치워 통풍 공간을 확보합니다.',
        why: '실외기 통풍이 막히면 냉방 효율이 떨어지고 제품 부담이 커질 수 있습니다.',
        how: '실외기 앞뒤와 주변에 쌓인 물건, 먼지, 낙엽을 치우고 배출 방향을 막지 않게 둡니다.',
        completion_criteria: '실외기 주변에 바람 흐름을 막는 물건이 없음을 확인했다.',
        links: [{ label: samsungAirconSource.sourceTitle, url: samsungAirconSource.sourceUrl, type: 'official' }],
        source_type: samsungAirconSource.sourceType,
        risk_level: samsungAirconSource.riskLevel,
      },
      '실내기 먼지 필터 분리와 세척하기': {
        description: '분리 가능한 먼지 필터를 꺼내 먼지를 제거하고 완전히 말립니다.',
        why: '필터 먼지는 냄새와 효율 저하의 흔한 원인이므로 사용 전 확인이 필요합니다.',
        how: '제품 안내에 맞춰 필터를 분리하고 물세척 가능 여부를 확인한 뒤 그늘에서 말립니다.',
        completion_criteria: '필터를 청소하고 물기가 남지 않은 상태로 재조립했다.',
        links: [{ label: samsungAirconSource.sourceTitle, url: samsungAirconSource.sourceUrl, type: 'official' }],
        source_type: samsungAirconSource.sourceType,
        risk_level: samsungAirconSource.riskLevel,
      },
      '전문 세척 필요 여부 결정하기': {
        description: '냄새, 곰팡이, 누수, 냉방 약화가 반복되면 전문 점검 필요 여부를 판단합니다.',
        why: '분해 세척이나 내부 점검은 사용자가 직접 처리하기 어려운 범위가 있을 수 있습니다.',
        how: '자가 점검 기록을 보고 냄새, 소음, 누수, 효율 저하가 계속되는지 확인합니다.',
        completion_criteria: '자가 관리로 충분한지 또는 서비스 예약이 필요한지 결정했다.',
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
        title: '삼성 세탁기 필터 청소 Flow',
        description: '월 1회 세탁기 필터와 배수 상태, 세탁실 환경을 확인해 냄새와 오류를 줄입니다.',
        category: samsungWasherSource.category,
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: samsungWasherSource.riskLevel,
        source_title: samsungWasherSource.sourceTitle,
        source_url: samsungWasherSource.sourceUrl,
      },
      samsungWasherText,
    ),
    {
      '필터 분리 가능 여부와 모델 안내 확인하기': {
        description: '사용 중인 모델의 필터 위치와 분리 가능 여부를 먼저 확인합니다.',
        why: '모델별 필터 구조가 달라 무리하게 분리하면 부품 손상으로 이어질 수 있습니다.',
        how: '제품 모델명과 공식 안내를 확인한 뒤 안내된 방식으로만 필터를 분리합니다.',
        completion_criteria: '모델별 필터 위치와 분리 방법을 확인했다.',
        links: [{ label: samsungWasherSource.sourceTitle, url: samsungWasherSource.sourceUrl, type: 'official' }],
        source_type: samsungWasherSource.sourceType,
        risk_level: samsungWasherSource.riskLevel,
      },
      '필터 이물질 제거하고 손상 여부 확인하기': {
        description: '필터 안의 먼지, 섬유, 이물질을 제거하고 균열이나 변형이 있는지 봅니다.',
        why: '필터 막힘은 배수 오류나 냄새의 원인이 될 수 있습니다.',
        how: '물기를 받을 준비를 한 뒤 필터를 청소하고 손상된 부품은 교체 필요 여부를 기록합니다.',
        completion_criteria: '필터 이물질을 제거하고 손상 여부를 확인했다.',
        links: [{ label: samsungWasherSource.sourceTitle, url: samsungWasherSource.sourceUrl, type: 'official' }],
        source_type: samsungWasherSource.sourceType,
        risk_level: samsungWasherSource.riskLevel,
      },
      '전문 세척 또는 소모품 교체 필요 여부 판단하기': {
        description: '냄새, 배수 오류, 곰팡이가 반복되면 전문 세척이나 소모품 교체를 검토합니다.',
        why: '필터 청소만으로 해결되지 않는 문제는 내부 오염이나 부품 상태 확인이 필요할 수 있습니다.',
        how: '최근 오류 코드, 냄새 발생 시점, 세탁실 습기 상태를 함께 기록합니다.',
        completion_criteria: '자가 청소 후에도 남은 문제와 다음 조치를 정했다.',
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
        description: '자동차검사 예약 전 기간, 서류, 차량 상태, 당일 접수와 결과 확인을 단계별로 준비합니다.',
        category: vehicleInspectionSource.category,
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: vehicleInspectionSource.riskLevel,
        source_title: vehicleInspectionSource.sourceTitle,
        source_url: vehicleInspectionSource.sourceUrl,
        warning: '검사 기간, 수수료, 재검사 기준은 차량과 검사소 상황에 따라 달라질 수 있으므로 공식 안내를 확인하세요.',
      },
      vehicleInspectionText,
    ),
    {
      '자동차검사 유효기간과 예약 가능일 확인하기': {
        description: '검사 유효기간과 예약 가능한 날짜를 먼저 확인합니다.',
        why: '검사 기간을 놓치면 과태료나 재검사 일정 문제가 생길 수 있습니다.',
        how: 'TS 자동차검사 안내에서 차량 정보 기준 유효기간과 예약 가능일을 확인합니다.',
        completion_criteria: '검사 유효기간과 예약 후보일을 기록했다.',
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
      '접수 내역과 시험장 위치 확인하기': {
        description: '접수 완료 후 시험장, 일시, 과목 정보를 다시 확인합니다.',
        why: '접수만 완료하고 시험장 위치나 시간을 놓치면 당일 이동 계획이 흔들릴 수 있습니다.',
        how: 'Q-Net 접수 내역에서 시험장 주소, 입실 시간, 변경 가능 여부를 확인합니다.',
        completion_criteria: '시험장 위치와 접수 내역을 저장했다.',
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
        title: '컴퓨터활용능력 D-30 학습 Flow',
        description: '필기와 실기 범위를 나누고 기출 회독, 실기 환경 점검, 실전 전환을 30일 단위로 진행합니다.',
        category: computerSkillsSource.category,
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: computerSkillsSource.riskLevel,
        source_title: computerSkillsSource.sourceTitle,
        source_url: computerSkillsSource.sourceUrl,
      },
      computerSkillsText,
    ),
    {
      '필기와 실기 시험 범위 나누기': {
        description: '필기 이론과 실기 기능을 분리해 남은 기간의 학습 범위를 나눕니다.',
        why: '컴퓨터활용능력은 암기와 실습 비중이 달라 같은 방식으로 공부하면 누락이 생기기 쉽습니다.',
        how: '교재 또는 학습 후기의 목차를 기준으로 필기, 실기, 기출 풀이 블록을 따로 잡습니다.',
        completion_criteria: 'D-30부터 시험 전날까지의 학습 범위를 나눴다.',
        links: [{ label: computerSkillsSource.sourceTitle, url: computerSkillsSource.sourceUrl, type: 'reference' }],
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '실기 프로그램 환경 점검하기': {
        description: '실기 연습에 필요한 프로그램 버전과 파일 실행 환경을 확인합니다.',
        why: '실기 시험은 기능 위치와 단축키, 파일 형식에 익숙해지는 시간이 필요합니다.',
        how: '학습 자료의 권장 환경과 본인 PC 환경이 크게 다르지 않은지 확인합니다.',
        completion_criteria: '실기 연습 파일을 열고 저장까지 테스트했다.',
        source_type: computerSkillsSource.sourceType,
        risk_level: computerSkillsSource.riskLevel,
      },
      '오답을 유형별로 정리하기': {
        description: '반복해서 틀리는 이론, 함수, 기능을 유형별로 모읍니다.',
        why: '시험 직전에는 새 범위보다 반복 실수 제거가 점수 개선에 더 직접적일 수 있습니다.',
        how: '오답을 암기형, 계산형, 기능 조작형으로 분류하고 다시 풀 날짜를 정합니다.',
        completion_criteria: '오답 유형 목록과 재풀이 일정을 만들었다.',
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
    {
      '단백질과 채소 포함 여부 계획하기': {
        description: '끼니마다 단백질과 채소가 들어가는지 먼저 계획합니다.',
        why: '식사 기록은 제한보다 패턴 파악이 목적이며, 균형을 확인해야 무리한 감량을 피할 수 있습니다.',
        how: '아침에 오늘 먹을 끼니를 떠올리고 단백질, 채소가 빠진 끼니를 표시합니다.',
        completion_criteria: '오늘 식사 계획에 단백질과 채소 포함 여부를 표시했다.',
        caution: '특정 식품군을 무리하게 배제하지 마세요.',
        links: [{ label: dietLogSource.sourceTitle, url: dietLogSource.sourceUrl, type: 'creator' }],
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
    {
      '시작 체중보다 식사 패턴 먼저 기록하기': {
        description: '체중보다 식사 시간, 간식, 외식 빈도 같은 패턴을 먼저 기록합니다.',
        why: '초기 2주는 체중 변화보다 무너지는 패턴을 찾는 것이 지속 가능성에 더 중요합니다.',
        how: '식사 시간, 간식 시간, 배고픔 정도, 수면 시간을 간단히 적습니다.',
        completion_criteria: '체중 외에 식사 패턴 기록 항목을 정했다.',
        caution: '체중 숫자만으로 성공 여부를 판단하지 마세요.',
        links: [{ label: dietResetSource.sourceTitle, url: dietResetSource.sourceUrl, type: 'creator' }],
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
