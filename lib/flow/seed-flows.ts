import { parseTextFlow } from './parser';
import { previewFlowBundles } from './creator-channel-preview';
import { realContentPilotBundles } from './real-content-pilot-flows';
import { realSourceChannelBundles } from './real-source-channel-batch';
import { Flow, FlowBundle, FlowItemDetail, Recipe } from './types';

const now = '2026-05-20T00:00:00.000Z';

const creatorUserIds: Record<string, string> = {
  'FLOW 큐레이션팀': 'user-flow-curation',
  '초기 이유식 기록맘': 'user-baby-food-record',
  '차근차근 모빌리티': 'user-mobility-notes',
  '루틴 공부방': 'user-study-routine',
  '웨딩 체크메이트': 'user-wedding-checkmate',
  '생활 루틴 코치': 'user-life-routine-coach',
  '생활 행정 노트': 'user-admin-note',
};

function makeTextBundle(flow: Omit<Flow, 'created_at' | 'updated_at'>, rawText: string): FlowBundle {
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

function creatorMeta(
  creator_name: string,
  creator_role: string,
  creator_note: string,
  usage_count: number,
  copy_count: number,
): Pick<Flow, 'owner_user_id' | 'creator_name' | 'creator_role' | 'creator_note' | 'usage_count' | 'copy_count'> {
  return {
    owner_user_id: creatorUserIds[creator_name] ?? 'user-flow-curation',
    creator_name,
    creator_role,
    creator_note,
    usage_count,
    copy_count,
  };
}

function tagMeta(tags: string[]): Pick<Flow, 'tags'> {
  return { tags };
}

const sourceNeedsReviewMeta: Record<
  string,
  Pick<Flow, 'source_status' | 'source_precision' | 'source_checked_at' | 'conversion_note' | 'primary_destination'>
> = {
  'job-change-risk-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '퇴사/이직 의사결정 체크리스트를 source-fit audit 전 검토 대기 Flow로 정규화했습니다.',
    primary_destination: 'memo',
  },
  'year-end-tax-docs': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '국세청 연말정산 간소화 공식 안내 기반 Flow입니다. 회사 제출 기준과 개인별 공제 판단을 분리해 audit했습니다.',
    primary_destination: 'sheet',
  },
  'passport-renewal-docs': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '정부24 여권 발급 안내 기반 Flow입니다. 사용자 여정 audit 전 검토 대기 상태입니다.',
    primary_destination: 'memo',
  },
  'national-health-checkup-d7': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '건강검진 공식 안내 기반 Flow입니다. 민감 영역이라 대표 노출 전 수동 검토가 필요합니다.',
    primary_destination: 'calendar',
  },
  'business-registration-basic': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '사업자등록 서류 안내 기반 Flow입니다. 세무/행정 리스크 검토 후 승격합니다.',
    primary_destination: 'memo',
  },
  'driver-license-renewal-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '안전운전 통합민원 안내 기반 Flow입니다. 면허 조건별 분기 audit이 필요합니다.',
    primary_destination: 'calendar',
  },
  'happy-birth-service-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '행복출산 원스톱서비스 안내 기반 Flow입니다. 민감 행정/육아 정보를 수동 검토해야 합니다.',
    primary_destination: 'memo',
  },
  'pet-registration-basic': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '정부24 동물등록 안내 기반 Flow입니다. 등록번호 보관 산출물 검토가 필요합니다.',
    primary_destination: 'memo',
  },
  'vaccination-certificate-issue': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '예방접종증명 발급 안내 기반 Flow입니다. 의료 민감 영역이라 수동 검토가 필요합니다.',
    primary_destination: 'memo',
  },
  'family-certificate-issue': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '가족관계등록부 증명서 안내 기반 Flow입니다. 제출처별 요구사항 audit이 필요합니다.',
    primary_destination: 'memo',
  },
  'resident-register-copy-issue': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '주민등록표 등본/초본 안내 기반 Flow입니다. 표시 항목 선택과 증빙 보관 UX 검토가 필요합니다.',
    primary_destination: 'memo',
  },
  'industrial-accident-claim-docs': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '산재보험 요양비청구 안내 기반 Flow입니다. 재정/노무 민감성 검토가 필요합니다.',
    primary_destination: 'sheet',
  },
  'new-car-delivery-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '신차 검수 체크리스트 기반 Flow입니다. 인수 전 사진/하자 기록 산출물 중심으로 audit했습니다.',
    primary_destination: 'sheet',
  },
  'diet-habit-2week': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 기반 Flow입니다. 단기 감량보다 식사/운동/생활습관 기록 산출물 중심으로 audit했습니다.',
    primary_destination: 'sheet',
  },
  'samsung-aircon-seasonal-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '공식 가전관리 Flow입니다. 실제 원본 배치 승격 전 상담/예약 메모 gap 검토가 필요합니다.',
    primary_destination: 'calendar',
  },
  'samsung-washer-filter-cleaning': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '공식 가전관리 루틴 Flow입니다. 반복 주기와 안전 경고 UX audit 후 승격합니다.',
    primary_destination: 'calendar',
  },
  'vehicle-inspection-prep': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: 'TS 자동차검사 안내 기반 Flow입니다. 검사 결과 후속 memo gap 검토가 필요합니다.',
    primary_destination: 'hybrid',
  },
  'qnet-exam-application-prep': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: 'Q-Net 원서접수 안내 기반 Flow입니다. 일정/서류/결제 증빙 산출물 audit이 필요합니다.',
    primary_destination: 'hybrid',
  },
  'computer-skills-d30-study': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '시나공 컴활 1급 필기+실기 교재 페이지 기반 Flow입니다. 시험일 역산 학습표와 오답 기록 산출물 중심으로 audit했습니다.',
    primary_destination: 'hybrid',
  },
  'diet-meal-exercise-log': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 기반 Flow입니다. 식사/운동/컨디션 기록의 안전 경계를 audit했습니다.',
    primary_destination: 'sheet',
  },
  'diet-reset-2week': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 기반 Flow입니다. 무리한 제한 방지와 유지 가능한 규칙 산출물 중심으로 audit했습니다.',
    primary_destination: 'sheet',
  },
};

function withItemDetails(
  bundle: FlowBundle,
  details: Record<string, Pick<FlowBundle['items'][number], 'description' | 'source_type' | 'risk_level'> & Omit<FlowItemDetail, 'item_id'>>,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => {
      const detail = details[item.title];
      if (!detail) return item;
      return {
        ...item,
        description: detail.description,
        source_type: detail.source_type,
        risk_level: detail.risk_level,
      };
    }),
    itemDetails: bundle.items
      .map((item) => {
        const detail = details[item.title];
        if (!detail) return null;
        return {
          item_id: item.id,
          why: detail.why,
          how: detail.how,
          completion_criteria: detail.completion_criteria,
          caution: detail.caution,
          links: detail.links,
        };
      })
      .filter(Boolean) as FlowItemDetail[],
  };
}

const movingText = `## D-30 큰 준비
- 이사 방식 정하기 D-30
- 이사할 집 하자 점검하기 D-30
- 필요 없는 물건 정리하기 D-30
- 이사/청소 업체 견적 받고 예약하기 D-30

## D-10 생활 이전 준비
- 우편물/카드/은행 주소 변경하기 D-10
- 정기 배달 서비스 중지 요청하기 D-10
- 대형폐기물 배출 신고와 수거일 확인하기 D-10
- 엘리베이터 또는 사다리차 사용 예약하기 D-10
- 인터넷/정수기 이전 설치 예약하기 D-10

## D-3 필수 예약 확인
- 도시가스 철거/설치 예약하기 D-3
- 자동이체 해지 또는 변경 확인하기 D-3
- 이사 당일 사용할 물건 따로 포장하기 D-3
- 관리사무소에 이사 시간과 차량 동선 공유하기 D-3

## D-1 최종 점검
- 이사 업체와 일정 최종 확인하기 D-1
- 이체 한도 증액 확인하기 D-1
- 귀중품과 중요 서류 별도 보관하기 D-1
- 냉장고 음식과 쓰레기 최종 정리하기 D-1

## D-Day 이사 당일
- 전기/가스/수도/관리비 정산하기 D-Day
- 이삿짐 분실/파손 확인하기 D-Day
- 계량기와 집 상태 사진 남기기 D-Day
- 열쇠, 출입카드, 주차등록 인수인계하기 D-Day
- 전입신고와 확정일자 확인하기 D-Day

## D+1 행정 마무리
- 정부24 전입신고 처리 결과 확인하기 D+1
- 임대차 계약 확정일자 부여 여부 확인하기 D+1`;

const workoutText = `@주 3회

## 준비 운동 5분
- 제자리 걷기 1분
- 팔 돌리기 앞/뒤 각 30초
- 무릎 들어 걷기 1분
- 가벼운 점핑잭 또는 스텝터치 1분

## 본 운동 20분
@2~3세트
- 스쿼트 15회
- 런지 양쪽 10회씩
- 점핑잭 30초
- 푸시업 10~15회
- 플랭크 숄더탭 30초
- 크런치 15회
- 러시안 트위스트 20회
- 플랭크 30초
- 세트 사이 45~60초 쉬기

## 마무리 스트레칭 5분
- 햄스트링 늘리기
- 고양이-소 자세
- 어깨/팔/목 스트레칭
- 복식 호흡으로 마무리
- 통증 또는 어지러움 여부 기록하기`;

const workoutReferenceLink = {
  label: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
  url: 'https://www.youtube.com/@ThankyouBUBU',
  type: 'reference' as const,
};

const workoutOfficialGuideLink = {
  label: 'CDC 신체활동 가이드',
  url: 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html',
  type: 'official' as const,
};

const workoutDetails: Parameters<typeof withItemDetails>[1] = {
  '제자리 걷기 1분': {
    description: '운동 전 심박을 천천히 올리는 준비 동작입니다.',
    why: '갑자기 강한 동작으로 들어가면 관절과 호흡에 부담이 생길 수 있어 낮은 강도의 시작이 필요합니다.',
    how: '허리를 세우고 팔을 자연스럽게 흔들며 제자리에서 1분간 걷습니다. 숨이 차지 않는 속도로 시작합니다.',
    completion_criteria: '1분 동안 제자리 걷기를 마치고 호흡이 안정적인지 확인했다.',
    links: [workoutReferenceLink, workoutOfficialGuideLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '팔 돌리기 앞/뒤 각 30초': {
    description: '어깨 관절을 앞뒤로 풀어 상체 동작을 준비합니다.',
    why: '푸시업이나 숄더탭 전에 어깨 가동성을 확인하면 통증 신호를 더 빨리 알아차릴 수 있습니다.',
    how: '팔을 크게 벌리고 앞 방향 30초, 뒤 방향 30초를 천천히 돌립니다. 어깨가 찝히면 범위를 줄입니다.',
    completion_criteria: '앞뒤 각 30초를 완료했고 어깨 통증 여부를 확인했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '무릎 들어 걷기 1분': {
    description: '고관절과 코어를 깨우는 낮은 강도의 준비 동작입니다.',
    why: '스쿼트와 런지 전에 고관절을 움직이면 하체 동작에서 균형을 잡기 쉽습니다.',
    how: '무릎을 배꼽 방향으로 번갈아 들어 올리고 상체가 뒤로 젖혀지지 않게 1분간 반복합니다.',
    completion_criteria: '좌우 무릎 들기를 1분간 완료했고 균형이 크게 흔들리지 않았다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '가벼운 점핑잭 또는 스텝터치 1분': {
    description: '관절 부담이 크면 점핑잭 대신 스텝터치처럼 충격이 낮은 동작으로 바꿉니다.',
    why: '본 운동 전 체온을 올리되 무릎이나 발목 부담을 본인 상태에 맞춰 조절해야 합니다.',
    how: '점프가 괜찮으면 점핑잭을 하고, 충격이 부담되면 좌우로 한 발씩 이동하는 스텝터치로 1분 진행합니다.',
    completion_criteria: '1분간 워밍업을 마치고 관절 불편감이 없는지 확인했다.',
    links: [workoutReferenceLink, workoutOfficialGuideLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '스쿼트 15회': {
    description: '하체와 코어를 함께 쓰는 본 운동 첫 동작입니다.',
    why: '스쿼트는 홈트 루틴의 기본 하체 동작이지만 무릎 방향과 허리 자세가 무너지기 쉽습니다.',
    how: '발을 어깨너비로 두고 무릎이 안쪽으로 모이지 않게 15회 앉았다 일어납니다. 깊이는 자세가 유지되는 범위로 제한합니다.',
    completion_criteria: '스쿼트 15회를 자세 흐트러짐 없이 완료했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '런지 양쪽 10회씩': {
    description: '좌우 하체 균형과 둔근 사용을 확인하는 동작입니다.',
    why: '런지는 한쪽씩 진행되기 때문에 좌우 근력 차이와 균형 문제를 발견하기 좋습니다.',
    how: '한 발을 뒤로 보내고 앞 무릎이 발끝보다 과하게 나가지 않게 내려갑니다. 양쪽 10회씩 진행합니다.',
    completion_criteria: '양쪽 런지 10회씩을 마치고 좌우 불편감 차이를 기록했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '점핑잭 30초': {
    description: '짧게 심박을 올리는 전신 유산소 동작입니다.',
    why: '근력 동작 사이에 심박을 올려 20분 루틴의 운동 밀도를 높입니다.',
    how: '30초 동안 리듬을 유지합니다. 무릎이나 발목 부담이 있으면 팔 동작과 스텝터치로 대체합니다.',
    completion_criteria: '30초 동안 본인에게 맞는 강도로 점핑잭 또는 대체 동작을 완료했다.',
    links: [workoutReferenceLink, workoutOfficialGuideLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '푸시업 10~15회': {
    description: '가슴, 어깨, 팔, 코어를 함께 쓰는 상체 동작입니다.',
    why: '푸시업은 상체 근력 확인에 좋지만 손목과 어깨 부담이 생기기 쉬워 난이도 조절이 필요합니다.',
    how: '바닥 푸시업이 어렵다면 무릎을 대거나 벽 푸시업으로 바꿉니다. 몸통이 꺾이지 않는 범위에서 10~15회 진행합니다.',
    completion_criteria: '본인에게 맞는 버전으로 푸시업 10~15회를 완료했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '플랭크 숄더탭 30초': {
    description: '플랭크 자세에서 어깨를 번갈아 터치해 코어 안정성을 확인합니다.',
    why: '몸통 흔들림을 줄이는 훈련은 다른 전신 동작의 자세 유지에도 도움이 됩니다.',
    how: '손을 어깨 아래에 두고 플랭크 자세를 잡은 뒤 좌우 어깨를 천천히 터치합니다. 골반이 크게 흔들리면 무릎을 댑니다.',
    completion_criteria: '30초 동안 숄더탭을 진행했고 허리 통증이 없었다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '크런치 15회': {
    description: '복부를 짧게 수축해 코어 감각을 확인하는 동작입니다.',
    why: '복부 운동은 목으로 당기거나 허리가 뜨면 효과보다 불편감이 커질 수 있습니다.',
    how: '손으로 목을 잡아당기지 않고 갈비뼈를 골반 쪽으로 말아 올리는 느낌으로 15회 진행합니다.',
    completion_criteria: '목이나 허리 부담 없이 크런치 15회를 완료했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '러시안 트위스트 20회': {
    description: '몸통 회전과 복부 긴장을 함께 쓰는 코어 동작입니다.',
    why: '회전 동작은 속도를 내기 쉬워 허리 부담을 만들 수 있으므로 통제된 범위가 중요합니다.',
    how: '등을 길게 세운 상태에서 좌우로 천천히 회전합니다. 허리가 불편하면 발을 바닥에 두고 범위를 줄입니다.',
    completion_criteria: '좌우 합산 20회를 천천히 완료했고 허리 불편감이 없었다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '플랭크 30초': {
    description: '루틴 마지막 코어 고정 동작입니다.',
    why: '플랭크는 전신 긴장을 확인하기 좋지만 허리가 꺾이면 부담이 커질 수 있습니다.',
    how: '팔꿈치를 어깨 아래에 두고 머리부터 발끝까지 일직선을 유지합니다. 어려우면 무릎 플랭크로 30초 진행합니다.',
    completion_criteria: '30초 플랭크를 본인에게 맞는 버전으로 완료했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '세트 사이 45~60초 쉬기': {
    description: '호흡이 너무 가쁘거나 자세가 흐트러지면 휴식 시간을 늘리고 반복 수를 줄입니다.',
    why: '휴식 없이 밀어붙이면 다음 세트 자세가 무너지고 부상 위험이 커질 수 있습니다.',
    how: '세트가 끝나면 45~60초 쉬면서 호흡을 고릅니다. 말하기 어려울 정도면 더 쉬고 강도를 낮춥니다.',
    completion_criteria: '각 세트 사이에 휴식 시간을 지켰고 다음 세트 자세를 유지했다.',
    links: [workoutReferenceLink, workoutOfficialGuideLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '햄스트링 늘리기': {
    description: '운동 후 뒤허벅지를 천천히 늘려 하체 긴장을 줄입니다.',
    why: '스쿼트와 런지 후 하체 근육을 천천히 풀어야 다음 운동까지 뻐근함을 관리하기 쉽습니다.',
    how: '한쪽 다리를 앞으로 두고 허리를 길게 편 상태에서 뒤허벅지가 당기는 범위까지만 숙입니다.',
    completion_criteria: '양쪽 햄스트링을 무리 없는 범위에서 늘렸다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '고양이-소 자세': {
    description: '등과 허리를 부드럽게 움직여 마무리하는 스트레칭입니다.',
    why: '코어 동작 후 허리와 흉추 움직임을 회복하면 긴장감을 낮추는 데 도움이 됩니다.',
    how: '네발기기 자세에서 등을 둥글게 말았다가 천천히 펴는 동작을 호흡과 함께 반복합니다.',
    completion_criteria: '통증 없이 고양이-소 자세를 여러 번 반복했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '어깨/팔/목 스트레칭': {
    description: '상체 동작 후 어깨와 목 주변 긴장을 풀어줍니다.',
    why: '푸시업과 숄더탭 후 어깨와 목에 힘이 남아 있으면 다음 날 뻐근함이 커질 수 있습니다.',
    how: '어깨를 낮추고 목을 좌우로 천천히 기울입니다. 팔은 가슴 앞으로 당겨 어깨 뒤쪽을 늘립니다.',
    completion_criteria: '어깨, 팔, 목을 각각 무리 없는 범위에서 풀었다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '복식 호흡으로 마무리': {
    description: '호흡을 낮춰 운동 상태에서 일상 상태로 돌아옵니다.',
    why: '짧은 홈트라도 마무리 호흡을 하면 심박과 긴장을 낮추고 운동 종료 신호를 만들 수 있습니다.',
    how: '앉거나 누워 코로 들이마시고 입으로 길게 내쉬며 5~8회 반복합니다.',
    completion_criteria: '복식 호흡을 마치고 호흡과 어지러움 여부를 확인했다.',
    links: [workoutReferenceLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '통증 또는 어지러움 여부 기록하기': {
    description: '통증, 어지러움, 호흡 곤란이 있으면 중단하고 몸 상태를 확인합니다.',
    why: '운동 루틴은 반복 실행이 목적이므로 무리한 신호를 빨리 발견해야 지속할 수 있습니다.',
    how: '운동 직후 통증 부위, 어지러움, 호흡 상태를 짧게 기록합니다. 이상이 있으면 다음 운동 강도를 낮춥니다.',
    completion_criteria: '몸 상태를 기록했고 필요하면 다음 운동 강도를 낮추기로 결정했다.',
    links: [workoutReferenceLink, workoutOfficialGuideLink],
    source_type: 'official',
    risk_level: 'medium',
  },
};

const jobChangeText = `## 1. 퇴사 가능 상태 확인
- 근로계약서에서 퇴사 통보 기한 확인하기
- 취업규칙 또는 사내 퇴사 프로세스 확인하기
- 현재 업무 인수인계 범위 정리하기
- 남은 연차, 급여, 퇴직금 예상 금액 확인하기
- 퇴직연금 또는 IRP 계좌 지급 절차 확인하기
- 퇴사 시점이 프로젝트 일정과 충돌하는지 확인하기

## 2. 이직할 회사 조건 비교
- 연봉과 복리후생 비교하기
- 근무 지역과 출퇴근 시간 확인하기
- 업무 강도와 성장 가능성 비교하기
- 회사 리뷰와 내부 분위기 조사하기

## 3. 지원 서류 업데이트
- 최신 경력과 성과를 이력서에 반영하기
- 지원 회사에 맞게 자기소개서 수정하기
- 포트폴리오가 필요한 직무라면 최신 작업물 정리하기
- 경력증명서, 원천징수영수증 등 필요 서류 목록 확인하기

## 4. 면접 준비
- 지원 직무 예상 질문 정리하기
- 이전 회사에서의 성과와 기여도 사례 준비하기
- 비대면 면접 환경 점검하기
- 처우 협의 기준선과 양보 가능한 조건 정리하기

## 5. 재정 안전장치 확인
- 공백 기간을 가정해 최소 3개월치 생활비 계산하기
- 퇴직금과 실업급여 가능 여부 확인하기
- 이직확인서 처리와 고용보험 이력 확인하기
- 새 회사 급여 지급일과 기존 자금 흐름 비교하기
- 건강보험, 국민연금 등 공백 기간 처리 방식 확인하기`;

const overseasTravelText = `## D-14 서류와 입국 조건
- 여권 잔여 유효기간 확인하기 D-14
- 비자 또는 전자여행허가 필요 여부 확인하기 D-14
- 여행경보와 현지 안전 공지 확인하기 D-14
- 여행자보험 가입 여부 결정하기 D-14

## D-7 예약과 동선
- 항공권, 숙소, 현지 이동 예약 내역 모으기 D-7
- 공항 이동 시간과 체크인 마감 시간 확인하기 D-7
- 해외 결제 카드와 현금/환전 계획 확인하기 D-7
- 여권 사본과 비상연락처를 클라우드에 저장하기 D-7

## D-3 짐과 반입 규정
- 기내 반입 금지 물품과 보조배터리 규정 확인하기 D-3
- 액체류, 의약품, 충전기, 어댑터를 분리 포장하기 D-3
- 로밍, eSIM, 오프라인 지도와 번역앱 준비하기 D-3

## D-1 출국 전 최종 확인
- 온라인 체크인과 좌석, 수하물 기준 확인하기 D-1
- 여권, 카드, 현금, 예약 바우처를 한 파우치에 모으기 D-1
- 첫날 숙소 주소와 심야 체크인 방법 저장하기 D-1

## D-Day 출국 당일
- 공항 도착 목표 시간에 맞춰 출발하기 D-Day
- 수하물 위탁 전 보조배터리와 귀중품 분리하기 D-Day
- 탑승구와 탑승 마감 시간을 다시 확인하기 D-Day`;

const yearEndTaxText = `## 1. 기본 확인
- 회사 연말정산 제출 일정 확인하기
- 홈택스 연말정산 간소화 서비스 접속 준비하기
- 공동/간편 인증 수단 확인하기

## 2. 간소화 자료 내려받기
- 소득·세액공제 자료 조회하기
- 의료비, 교육비, 보험료, 신용카드 자료 누락 여부 확인하기
- PDF 다운로드 또는 회사 제출 방식에 맞게 파일 저장하기

## 3. 추가 증빙 챙기기
- 주민등록등본 등 인적공제 증빙 필요 여부 확인하기
- 월세, 기부금, 안경구입비 등 간소화 누락 가능 자료 확인하기
- 부양가족 자료 제공 동의 상태 확인하기

## 4. 제출 전 검토
- 공제 대상이 아닌 항목을 제외했는지 확인하기
- 회사 시스템에 업로드하고 제출 완료 상태 확인하기
- 환급 또는 추가 납부 예상 금액을 기록하기`;

function withOfficialSourceDetails(
  bundle: FlowBundle,
  source: { label: string; url: string },
  risk_level: FlowBundle['flow']['risk_level'] = bundle.flow.risk_level,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => ({
      ...item,
      source_type: 'official',
      risk_level,
    })),
    itemDetails: bundle.items.map((item) => ({
      item_id: item.id,
      why: '공식 안내의 신청 조건, 제출 서류, 처리 절차를 실행 전에 확인하기 위한 항목입니다.',
      how: '링크의 최신 안내를 열어 본인 상황에 해당하는 신청 자격, 구비서류, 수수료, 처리기간을 확인합니다.',
      completion_criteria: `${item.title}에 필요한 준비 여부를 확인했다.`,
      links: [{ ...source, type: 'official' as const }],
    })),
  };
}

function withReferenceSourceDetails(
  bundle: FlowBundle,
  source: { label: string; url: string },
  risk_level: FlowBundle['flow']['risk_level'] = bundle.flow.risk_level,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => ({
      ...item,
      source_type: 'reference',
      risk_level,
    })),
    itemDetails: bundle.items.map((item) => ({
      item_id: item.id,
      completion_criteria: '이 항목을 완료했어요.',
      links: [{ ...source, type: 'reference' as const }],
    })),
  };
}

const passportRenewalText = `## 신청 전 확인
- 여권 유효기간과 여행 일정 확인하기
- 온라인 신청 가능 대상인지 확인하기
- 최근 6개월 이내 여권 사진 준비하기

## 신청 진행
- 정부24 또는 여권 안내 페이지에서 신청 경로 확인하기
- 수수료와 수령 방법 확인하기
- 신청 후 접수 상태 확인하기`;

const healthCheckupText = `## D-7 예약 준비
- 검진 대상 여부와 검진기관 확인하기 D-7
- 문진표 작성 방법 확인하기 D-7
- 복용약과 질환 관련 문의할 내용 정리하기 D-7

## D-1 검진 전날
- 금식 안내 확인하기 D-1
- 신분증과 필요한 서류 챙기기 D-1
- 수면내시경 예정이면 이동 방법 정하기 D-1

## D-Day 검진 당일
- 예약 시간보다 여유 있게 도착하기 D-Day
- 접수 후 문진표와 본인 확인 진행하기 D-Day
- 검진 결과 수령 방법 확인하기 D-Day`;

const businessRegistrationText = `## 신청 전 준비
- 개인/법인과 업종 유형 정리하기
- 사업장 임대차계약서 필요 여부 확인하기
- 인허가 업종인지 확인하기
- 공동사업이면 동업계약서 준비하기

## 신청 진행
- 홈택스 또는 세무서 신청 경로 확인하기
- 사업자등록 신청서 작성하기
- 신청 후 등록 상태와 정정 필요 여부 확인하기`;

const driverLicenseRenewalText = `## 갱신 대상 확인
- 운전면허 갱신 또는 적성검사 기간 확인하기
- 건강검진 자료 활용 가능 여부 확인하기
- 사진과 신분증 필요 여부 확인하기

## 신청 진행
- 온라인/방문 신청 가능 경로 확인하기
- 수수료와 수령 방법 확인하기
- 갱신 완료 후 면허증 정보 확인하기`;

const happyBirthText = `## 출생신고 전후 확인
- 출생신고 완료 여부 확인하기
- 행복출산 통합신청 대상 서비스 확인하기
- 보호자 신분증과 가족관계 자료 준비하기

## 신청 진행
- 정부24 또는 주민센터 신청 경로 확인하기
- 양육수당, 아동수당 등 신청 항목 선택하기
- 신청 후 처리 상태와 추가 서류 요청 확인하기`;

const petRegistrationText = `## 등록 전 확인
- 등록 대상 동물인지 확인하기
- 내장형/외장형/인식표 방식 비교하기
- 등록 대행기관 또는 지자체 절차 확인하기

## 등록/변경 진행
- 소유자 정보와 동물 정보를 준비하기
- 신규 등록 또는 변경신고 신청하기
- 등록번호와 변경 처리 상태 확인하기`;

const vaccinationCertificateText = `## 발급 전 확인
- 본인 또는 자녀 증명서 발급 가능 여부 확인하기
- 예방접종도우미 또는 정부24 발급 경로 확인하기
- 방문 발급 시 신분증 준비하기

## 발급 진행
- 필요한 접종 항목과 언어 확인하기
- 증명서 출력 또는 파일 저장하기
- 제출처가 요구하는 형식과 유효기간 확인하기`;

const familyCertificateText = `## 발급 목적 확인
- 가족관계증명서 종류 선택하기
- 일반/상세/특정 증명서 중 필요한 범위 확인하기
- 제출처가 요구하는 주민등록번호 공개 범위 확인하기

## 발급 진행
- 전자가족관계등록시스템 또는 정부24 경로 확인하기
- 본인 인증 후 증명서 발급하기
- 제출 전 이름, 관계, 공개 범위 확인하기`;

const residentRegisterText = `## 발급 전 확인
- 등본과 초본 중 필요한 서류 확인하기
- 주소 변동, 병역, 세대원 표시 여부 확인하기
- 제출처가 요구하는 주민등록번호 공개 범위 확인하기

## 발급 진행
- 정부24 또는 무인민원발급기 경로 확인하기
- 발급 수수료와 출력 가능 환경 확인하기
- 제출 전 표시 항목과 발급일 확인하기`;

const industrialAccidentClaimText = `## 청구 전 정리
- 청구 유형이 요양비, 이송비, 보조기 등 무엇인지 확인하기
- 영수증과 진료비 상세내역서 모으기
- 처방전, 통원 확인서 등 보완 서류 확인하기

## 청구 진행
- 근로복지공단 신청 경로 확인하기
- 청구서와 첨부 서류 제출하기
- 처리 상태와 보완 요청 확인하기`;

const studyExamD30Text = `@매일 60~90분

## D-30 범위와 기준 잡기
- 시험 범위와 출제 비중 정리하기 D-30
- 남은 기간을 주차별 목표로 나누기 D-30
- 매일 공부 가능한 시간 블록 표시하기 D-30

## D-21 1회독 실행
- 핵심 개념 1회독 시작하기 D-21
- 단원별 헷갈리는 개념 표시하기 D-21
- 기출 또는 예제 문제를 가볍게 풀기 D-21

## D-14 문제풀이 전환
- 자주 틀리는 유형 노트 만들기 D-14
- 시간 제한을 두고 문제 세트 풀기 D-14
- 오답 원인을 개념/계산/실수로 분류하기 D-14

## D-7 실전 정리
- 실전처럼 모의고사 1회 풀기 D-7
- 암기표와 오답노트만 남기기 D-7
- 시험 당일 준비물과 이동 시간 확인하기 D-1`;

const studyPlanLink = {
  label: '집에서 공부 효과 높이는 학습 팁',
  url: 'https://englishfact.com/ko/10-tips-to-enhance-english-study-at-home/',
  type: 'reference' as const,
};

const studyExamD30Details: Parameters<typeof withItemDetails>[1] = {
  '시험 범위와 출제 비중 정리하기': {
    description: '시험 범위 전체를 한 장에 모으고, 점수 비중이 큰 단원부터 표시합니다.',
    why: '범위와 비중을 먼저 정하지 않으면 쉬운 단원만 반복하거나 중요한 단원을 뒤로 미루기 쉽습니다.',
    how: '강의계획서, 공지, 기출 목차를 모아 단원별 출제 비중을 상·중·하로 표시하고 아직 모르는 범위에 별표를 붙입니다.',
    completion_criteria: '시험 범위 목록과 우선순위가 정리됐다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '남은 기간을 주차별 목표로 나누기': {
    description: 'D-30부터 D-Day까지 남은 기간을 1회독, 문제풀이, 실전 정리 단계로 나눕니다.',
    why: '큰 목표를 하루 단위로 바로 쪼개면 계획이 무너지기 쉬우므로 주차별 산출물을 먼저 잡아야 합니다.',
    how: '첫 10일은 범위 1회독, 다음 10일은 문제풀이, 마지막 7일은 오답과 모의고사처럼 각 주차 끝에 남길 결과물을 적습니다.',
    completion_criteria: '주차별 목표와 각 주차의 완료 산출물이 정해졌다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '매일 공부 가능한 시간 블록 표시하기': {
    description: '하루 중 실제로 공부 가능한 시간을 캘린더에 고정 블록으로 표시합니다.',
    why: '공부 시간은 의지만으로 생기지 않기 때문에 출퇴근, 수업, 식사 시간을 빼고 남는 블록을 먼저 확인해야 합니다.',
    how: '평일과 주말을 나눠 30분 이상 집중 가능한 시간을 표시하고, 피곤한 시간대에는 암기보다 가벼운 복습을 배치합니다.',
    completion_criteria: '매일 사용할 공부 시간 블록이 캘린더나 메모에 표시됐다.',
    caution: '처음부터 모든 빈 시간을 공부로 채우면 지속하기 어려우니 예비 시간을 남깁니다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '핵심 개념 1회독 시작하기': {
    description: '전체 범위를 완벽히 외우려 하지 말고 핵심 개념을 한 번 끝까지 훑습니다.',
    why: '첫 회독의 목적은 완벽한 이해가 아니라 범위 구조와 약한 단원을 발견하는 것입니다.',
    how: '단원별 핵심 정의, 공식, 흐름을 읽고 이해가 안 되는 부분은 표시만 한 뒤 다음 단원으로 넘어갑니다.',
    completion_criteria: '핵심 개념 범위를 한 번 끝까지 훑고 미해결 표시를 남겼다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '단원별 헷갈리는 개념 표시하기': {
    description: '1회독 중 막힌 개념을 단원별로 모아 다음 복습의 출발점으로 만듭니다.',
    why: '헷갈리는 개념을 따로 모아두지 않으면 문제풀이 단계에서 같은 실수를 반복합니다.',
    how: '교재 목차 옆에 헷갈림 표시를 하고, 왜 헷갈리는지 용어, 공식, 순서, 예외 중 하나로 분류합니다.',
    completion_criteria: '단원별 헷갈리는 개념 목록이 만들어졌다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '기출 또는 예제 문제를 가볍게 풀기': {
    description: '1회독 직후 쉬운 예제나 기출을 풀어 개념이 문제로 어떻게 나오는지 확인합니다.',
    why: '개념만 읽으면 아는 것처럼 느껴져도 실제 문제의 질문 방식에 막힐 수 있습니다.',
    how: '시간 제한 없이 단원별 대표 문제를 조금씩 풀고, 틀린 문제는 풀이를 베끼기보다 어느 개념을 몰랐는지 표시합니다.',
    completion_criteria: '각 주요 단원에서 대표 문제를 풀고 틀린 이유를 기록했다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '자주 틀리는 유형 노트 만들기': {
    description: '틀린 문제를 유형별로 묶어 반복해서 확인할 수 있는 짧은 노트를 만듭니다.',
    why: '오답을 문제 번호로만 모으면 시험 직전에 무엇을 다시 봐야 하는지 찾기 어렵습니다.',
    how: '틀린 문제를 개념 누락, 계산 실수, 조건 오독, 시간 부족으로 분류하고 각 유형별 대표 문제를 1~2개만 남깁니다.',
    completion_criteria: '반복해서 틀리는 유형과 대표 문제가 정리됐다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '시간 제한을 두고 문제 세트 풀기': {
    description: '실제 시험보다 조금 짧은 시간 제한을 두고 문제 세트를 풉니다.',
    why: '시간 압박 속에서 풀어봐야 실제로 버릴 문제와 먼저 풀 문제를 판단할 수 있습니다.',
    how: '문제 수와 제한 시간을 정하고, 모르는 문제는 표시 후 넘어가며 끝난 뒤 못 푼 이유를 따로 기록합니다.',
    completion_criteria: '시간 제한 문제 세트를 풀고 시간 부족 구간을 확인했다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '오답 원인을 개념/계산/실수로 분류하기': {
    description: '틀린 문제를 원인별로 나눠 남은 일주일의 복습 방향을 정합니다.',
    why: '오답 수만 세면 공부량은 늘어나도 실제 점수를 깎는 원인을 줄이기 어렵습니다.',
    how: '각 오답 옆에 개념 부족, 계산 오류, 조건 실수, 시간 부족 중 하나를 표시하고 가장 많은 원인부터 복습합니다.',
    completion_criteria: '오답마다 원인 태그가 붙었고 가장 많이 반복되는 원인을 확인했다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '실전처럼 모의고사 1회 풀기': {
    description: '시험 시간, 준비물, 쉬는 규칙을 실제처럼 맞춰 모의고사를 한 번 풉니다.',
    why: '마지막 주에는 지식보다 시간 배분과 긴장 상태에서의 실수가 점수를 좌우할 수 있습니다.',
    how: '알람을 맞추고 휴대폰 알림을 끈 뒤 실제 시험 시간과 같은 길이로 풀고, 끝난 직후 채점과 시간 기록을 남깁니다.',
    completion_criteria: '모의고사 1회를 실전 조건으로 풀고 점수와 시간 배분을 기록했다.',
    caution: '점수가 낮아도 새 범위를 늘리기보다 반복 실수만 줄이는 쪽으로 조정합니다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '암기표와 오답노트만 남기기': {
    description: '시험 직전 볼 자료를 암기표와 핵심 오답노트로 줄입니다.',
    why: '마지막에 자료가 너무 많으면 무엇을 봐야 할지 몰라 복습 효율이 떨어집니다.',
    how: '새 자료를 추가하지 않고 공식, 정의, 자주 틀리는 유형만 한 묶음으로 모아 이동 중에도 볼 수 있게 정리합니다.',
    completion_criteria: '시험 전날 볼 최종 암기표와 오답노트가 한 묶음으로 정리됐다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '시험 당일 준비물과 이동 시간 확인하기': {
    description: '수험표, 신분증, 필기구, 계산기, 교통편처럼 당일 변수들을 전날 확정합니다.',
    why: '시험 당일 실수는 공부량과 무관하게 발생하므로 준비물과 이동 시간을 미리 고정해야 합니다.',
    how: '시험장 주소와 도착 목표 시간을 적고, 필요한 준비물을 가방에 넣은 뒤 예비 교통편과 입실 마감 시간을 확인합니다.',
    completion_criteria: '시험장 이동 계획과 준비물 체크가 끝났다.',
    caution: '입실 마감 시간과 허용 준비물은 시험 공지 기준으로 다시 확인합니다.',
    links: [studyPlanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
};

const englishStudyRoutineText = `@매일 30분
@주 1회 점검

## 1주차 듣기·읽기 입력
- 짧은 영상 또는 오디오 10분 듣기
- 모르는 표현 5개만 저장하기
- 같은 주제의 짧은 글 1개 읽기

## 2주차 문장 따라 말하기
- 저장한 표현으로 예문 3개 만들기
- 1분 음성으로 따라 말하고 녹음하기
- 발음보다 끊기지 않는 흐름 확인하기

## 3주차 쓰기·말하기 전환
- 하루 일과를 영어 5문장으로 쓰기
- 같은 내용을 1분 말하기로 녹음하기
- 자주 막히는 단어를 다음 날 입력 자료로 고르기

## 4주차 반복 가능한 루틴 만들기
- 한 달 동안 쌓인 표현 20개 복습하기
- 가장 잘 맞은 공부 시간대 기록하기
- 다음 30일 목표를 듣기/말하기/쓰기 중 하나로 좁히기`;

const englishRoutineLink = {
  label: '직장인 30일 영어 독학 루틴',
  url: 'https://www.new1eng.com/blog/adult-english-30day-self-study',
  type: 'reference' as const,
};

const englishStudyRoutineDetails: Parameters<typeof withItemDetails>[1] = {
  '짧은 영상 또는 오디오 10분 듣기': {
    description: '매일 부담 없이 들을 수 있는 짧은 입력 자료를 정합니다.',
    why: '초반에는 긴 강의보다 반복 가능한 10분 입력이 루틴을 만드는 데 더 안정적입니다.',
    how: '출퇴근이나 점심시간에 들을 5~10분 영상 또는 오디오를 고르고, 처음에는 전체 뜻보다 흐름을 잡습니다.',
    completion_criteria: '오늘 들을 10분 입력 자료를 듣고 제목이나 링크를 기록했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '모르는 표현 5개만 저장하기': {
    description: '하루에 저장할 표현 수를 5개로 제한합니다.',
    why: '모르는 표현을 모두 저장하면 복습 부담이 커져 루틴이 빨리 무너질 수 있습니다.',
    how: '오늘 들은 자료에서 다시 쓸 가능성이 높은 표현만 5개 골라 뜻과 짧은 예문을 함께 적습니다.',
    completion_criteria: '표현 5개와 짧은 예문을 저장했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '같은 주제의 짧은 글 1개 읽기': {
    description: '들은 내용과 비슷한 주제의 짧은 글을 읽어 입력을 연결합니다.',
    why: '듣기와 읽기를 같은 주제로 묶으면 새 단어가 반복되어 기억에 남기 쉽습니다.',
    how: '영상 주제와 비슷한 블로그, 뉴스, 짧은 설명 글을 하나 읽고 아는 표현이 다시 나오는지 표시합니다.',
    completion_criteria: '같은 주제의 짧은 글 1개를 읽고 반복 표현을 표시했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '저장한 표현으로 예문 3개 만들기': {
    description: '저장한 표현을 본인 상황에 맞는 문장으로 바꿉니다.',
    why: '표현을 보기만 하면 실제 말하기나 쓰기에서 떠오르지 않으므로 직접 문장으로 바꿔야 합니다.',
    how: '저장한 표현 중 3개를 골라 회사, 일상, 취미 상황에 맞는 짧은 예문을 만듭니다.',
    completion_criteria: '저장한 표현으로 개인 예문 3개를 작성했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '1분 음성으로 따라 말하고 녹음하기': {
    description: '예문 또는 입력 자료를 1분 동안 따라 말하고 녹음합니다.',
    why: '말하기는 입 밖으로 내는 횟수가 필요하므로 짧게라도 녹음해야 실제 막힘을 확인할 수 있습니다.',
    how: '문장 3~5개를 천천히 읽고 휴대폰으로 1분 녹음합니다. 완벽한 발음보다 끊기지 않는 흐름을 봅니다.',
    completion_criteria: '1분 음성 파일을 남기고 막힌 표현을 표시했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '발음보다 끊기지 않는 흐름 확인하기': {
    description: '녹음 파일에서 말이 끊기는 구간을 확인합니다.',
    why: '초기 루틴에서는 원어민 같은 발음보다 문장을 끝까지 이어 말하는 경험이 더 중요합니다.',
    how: '녹음을 한 번 듣고 멈춘 지점, 다시 시작한 지점, 단어가 떠오르지 않은 지점을 메모합니다.',
    completion_criteria: '녹음에서 끊긴 구간과 다음 연습 표현을 기록했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '하루 일과를 영어 5문장으로 쓰기': {
    description: '오늘 있었던 일을 영어 5문장으로 짧게 씁니다.',
    why: '일상 문장은 반복해서 쓰기 쉬워 말하기 소재로도 바로 전환할 수 있습니다.',
    how: '시간 순서대로 오늘 한 일, 느낀 점, 내일 할 일을 5문장으로 쓰고 모르는 단어는 쉬운 표현으로 바꿉니다.',
    completion_criteria: '하루 일과 영어 문장 5개를 작성했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '같은 내용을 1분 말하기로 녹음하기': {
    description: '방금 쓴 5문장을 보며 1분 말하기로 전환합니다.',
    why: '쓰기에서 말하기로 옮겨야 실제 대화에서 사용할 수 있는 표현이 됩니다.',
    how: '쓴 문장을 한 번 읽고, 두 번째에는 문장을 보되 자연스럽게 말하듯 1분 녹음합니다.',
    completion_criteria: '같은 내용을 1분 말하기로 녹음했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '자주 막히는 단어를 다음 날 입력 자료로 고르기': {
    description: '말할 때 막힌 단어를 다음 날 듣기·읽기 자료의 주제로 연결합니다.',
    why: '막힌 단어를 바로 다음 입력으로 연결하면 루틴이 본인 약점 중심으로 조정됩니다.',
    how: '녹음 중 떠오르지 않은 단어 1~3개를 적고, 그 단어가 들어간 짧은 영상이나 글을 다음 날 자료로 고릅니다.',
    completion_criteria: '다음 날 입력 자료의 키워드와 링크를 정했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '한 달 동안 쌓인 표현 20개 복습하기': {
    description: '30일 동안 저장한 표현 중 다시 쓸 표현 20개를 고릅니다.',
    why: '많이 모은 표현보다 실제로 다시 쓸 수 있는 표현을 추리는 것이 다음 루틴으로 이어집니다.',
    how: '저장한 표현을 훑고 업무, 일상, 자기소개에 바로 쓸 수 있는 표현 20개만 남깁니다.',
    completion_criteria: '다음 달에도 유지할 핵심 표현 20개를 골랐다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '가장 잘 맞은 공부 시간대 기록하기': {
    description: '30일 동안 실제로 지킨 공부 시간대를 확인합니다.',
    why: '영어 루틴은 시간대가 맞아야 이어지므로 성공한 시간대를 기준으로 다음 계획을 잡아야 합니다.',
    how: '아침, 점심, 퇴근 후, 자기 전 중 가장 완료율이 높았던 시간대를 보고 다음 달 기본 시간으로 정합니다.',
    completion_criteria: '가장 완료율이 높았던 공부 시간대를 기록했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '다음 30일 목표를 듣기/말하기/쓰기 중 하나로 좁히기': {
    description: '다음 달 루틴의 핵심 방향을 하나로 좁힙니다.',
    why: '한 번에 듣기, 말하기, 쓰기를 모두 키우려 하면 루틴이 복잡해져 지속하기 어렵습니다.',
    how: '지난 30일 기록을 보고 가장 약하거나 가장 필요한 영역 하나를 고르고 다음 달 완료 기준을 적습니다.',
    completion_criteria: '다음 30일의 우선 목표와 완료 기준을 하나로 정했다.',
    links: [englishRoutineLink],
    source_type: 'reference',
    risk_level: 'low',
  },
};

const usedCarBuyingText = `## 예산과 후보 정리
- 총예산을 차량가, 이전비, 보험료, 정비비로 나누기
- 원하는 차종의 연식·주행거리별 시세 확인하기
- 사고 이력과 성능점검기록부 확인 기준 정하기

## 방문 전 준비
- 낮 시간 방문 일정 잡기
- 확인할 차량 사진과 매물 정보를 저장하기
- 손전등, 휴대폰 충전, 체크 메모 준비하기

## 현장 확인
- 외판 단차와 도장 흔적 확인하기
- 타이어 마모와 제조 연월 확인하기
- 엔진룸 누유, 냉각수, 벨트 상태 확인하기
- 시동, 변속, 제동, 핸들 떨림 확인하기

## 계약 전 확인
- 자동차등록원부와 압류·저당 여부 확인하기
- 명의이전 비용과 보험 가입 시점 확인하기
- 계약서 특약과 인수 후 정비 계획 기록하기`;

const newCarDeliveryText = `## 인수 전 준비
- 계약서 옵션과 최종 견적 다시 확인하기
- 보험 시작일과 결제 수단 준비하기
- 번호판, 틴팅, 블랙박스 등 인수 전 작업 범위 확인하기

## 외관 확인
- 차대번호와 계약 차량 일치 여부 확인하기
- 도장면 스크래치와 단차 확인하기
- 유리, 휠, 타이어 손상 확인하기

## 실내·기능 확인
- 계기판 경고등과 주행거리 확인하기
- 에어컨, 히터, 오디오, 내비게이션 작동 확인하기
- 스마트키, 충전 케이블, 매뉴얼, 기본 공구 확인하기

## 인수 후 정리
- 등록증과 보험 증권 보관하기
- 첫 주행 후 이상 소음과 경고등 기록하기
- 초기 점검 또는 서비스 예약 필요 여부 확인하기`;

const carCareMonthlyText = `@월 1회
@장거리 전 추가 점검

## 타이어와 제동
- 타이어 공기압 확인하기
- 마모한계선과 편마모 확인하기
- 브레이크 소음이나 밀림 느낌 기록하기

## 오일과 소모품
- 엔진오일 교체 주기와 잔량 확인하기
- 냉각수와 워셔액 보충 필요 여부 확인하기
- 와이퍼 떨림과 닦임 상태 확인하기

## 전기·시야
- 전조등, 브레이크등, 방향지시등 확인하기
- 블랙박스 녹화와 메모리 상태 확인하기
- 실내 비상용품과 충전 케이블 위치 확인하기`;

const carCareLink = {
  label: '타이어 공기압·셀프정비 체크리스트',
  url: 'https://gnsl0879.tistory.com/717',
  type: 'reference' as const,
};

const carCareMonthlyDetails: Parameters<typeof withItemDetails>[1] = {
  '타이어 공기압 확인하기': {
    description: '월 1회 타이어 공기압을 확인하고 장거리 전에는 한 번 더 봅니다.',
    why: '공기압이 부족하거나 과하면 연비, 제동, 타이어 마모에 영향을 줄 수 있습니다.',
    how: '차량 권장 공기압 기준을 확인하고 주유소 또는 휴대용 게이지로 네 바퀴를 확인합니다.',
    completion_criteria: '네 바퀴 공기압을 확인했고 필요하면 보충했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '마모한계선과 편마모 확인하기': {
    description: '타이어 홈 깊이와 한쪽만 닳는 편마모를 확인합니다.',
    why: '마모 상태는 제동거리와 빗길 안전에 직접 영향을 줄 수 있습니다.',
    how: '타이어 홈의 마모한계선과 안쪽·바깥쪽 마모 차이를 보고 이상하면 정비소 점검 대상으로 표시합니다.',
    completion_criteria: '마모한계선과 편마모 여부를 확인했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '브레이크 소음이나 밀림 느낌 기록하기': {
    description: '주행 중 브레이크 소음, 떨림, 밀림 느낌을 기록합니다.',
    why: '브레이크 이상은 안전과 직결되므로 느낌이 반복되면 자가 점검으로 끝내면 안 됩니다.',
    how: '최근 주행에서 끼익 소리, 페달 떨림, 제동거리 증가가 있었는지 적고 반복되면 정비 예약합니다.',
    completion_criteria: '브레이크 이상 느낌 여부와 후속 조치 필요성을 기록했다.',
    caution: '제동 이상이 있으면 운행을 줄이고 정비소 점검을 우선하세요.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '엔진오일 교체 주기와 잔량 확인하기': {
    description: '엔진오일 교체 시점과 잔량 또는 경고 상태를 확인합니다.',
    why: '엔진오일 관리는 차량 상태 유지의 기본이며 교체 주기를 놓치면 고장 위험이 커질 수 있습니다.',
    how: '정비 기록에서 마지막 교체일과 주행거리를 확인하고, 차량 안내 기준에 맞춰 다음 교체 시점을 적습니다.',
    completion_criteria: '마지막 교체 기록과 다음 교체 후보 시점을 기록했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '냉각수와 워셔액 보충 필요 여부 확인하기': {
    description: '냉각수와 워셔액 잔량을 확인하고 부족하면 보충합니다.',
    why: '냉각수 부족은 과열 위험을 만들고 워셔액 부족은 시야 확보에 영향을 줍니다.',
    how: '엔진이 식은 상태에서 냉각수 탱크 눈금을 확인하고, 워셔액은 계절에 맞는 제품으로 보충합니다.',
    completion_criteria: '냉각수와 워셔액 잔량을 확인했고 부족분을 보충했다.',
    caution: '뜨거운 엔진 상태에서 냉각수 캡을 열지 않습니다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '와이퍼 떨림과 닦임 상태 확인하기': {
    description: '와이퍼 작동 시 떨림, 소음, 줄무늬가 남는지 확인합니다.',
    why: '비 오는 날 시야 확보가 안 되면 운전 위험이 커지므로 미리 교체 필요성을 봐야 합니다.',
    how: '워셔액을 뿌리고 와이퍼를 작동해 닦임 상태를 본 뒤 고무 갈라짐이나 소음을 확인합니다.',
    completion_criteria: '와이퍼 닦임 상태를 확인했고 교체 필요 여부를 결정했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '전조등, 브레이크등, 방향지시등 확인하기': {
    description: '외부 등화장치가 모두 켜지는지 확인합니다.',
    why: '등화장치 고장은 야간 시야와 주변 차량에게 보내는 신호에 영향을 줍니다.',
    how: '전조등, 상향등, 브레이크등, 후진등, 방향지시등을 순서대로 켜고 외부에서 확인합니다.',
    completion_criteria: '주요 등화장치 작동 여부를 확인했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '블랙박스 녹화와 메모리 상태 확인하기': {
    description: '블랙박스가 정상 녹화되고 메모리 오류가 없는지 확인합니다.',
    why: '사고나 분쟁 상황에서 녹화가 안 되어 있으면 블랙박스가 있어도 도움이 되지 않습니다.',
    how: '최근 영상이 저장되는지 재생해 보고 날짜, 시간, 메모리 오류, 전원 연결 상태를 확인합니다.',
    completion_criteria: '최근 녹화 파일을 재생했고 저장 상태를 확인했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
  '실내 비상용품과 충전 케이블 위치 확인하기': {
    description: '비상용품과 충전 케이블이 필요한 위치에 있는지 확인합니다.',
    why: '장거리나 야간 운전 중 필요한 물건은 트렁크 깊숙한 곳보다 바로 찾을 수 있어야 합니다.',
    how: '삼각대, 조끼, 휴대폰 충전 케이블, 물티슈, 간단 공구의 위치를 확인하고 부족한 물품을 적습니다.',
    completion_criteria: '실내 비상용품 위치와 보충 필요 목록을 확인했다.',
    links: [carCareLink],
    source_type: 'reference',
    risk_level: 'medium',
  },
};

const weddingD180Text = `## D-180 큰 일정 확정
- 예식 날짜와 예상 하객 규모 정하기 D-180
- 웨딩홀 후보와 예산 범위 비교하기 D-180
- 양가 주요 일정과 우선순위 맞추기 D-180

## D-120 주요 업체 예약
- 스튜디오, 드레스, 메이크업 후보 비교하기 D-120
- 본식 스냅과 영상 필요 여부 정하기 D-120
- 신혼여행 예산과 일정 후보 정리하기 D-120

## D-60 초대와 디테일
- 청첩장 문구와 발송 명단 정리하기 D-60
- 식순, 사회자, 축가, 혼주 동선 확인하기 D-60
- 예복, 한복, 부케, 답례품 진행 상태 확인하기 D-60

## D-14 최종 확인
- 최종 하객 수와 식대 기준 확인하기 D-14
- 본식 당일 시간표와 연락망 공유하기 D-7
- 결제 잔금과 준비물 체크하기 D-1`;

const weddingChecklistLink = {
  label: '결혼식 준비 체크리스트',
  url: 'https://www.ohprint.me/blog/wedding-checklist',
  type: 'reference' as const,
};

const weddingD180Details: Parameters<typeof withItemDetails>[1] = {
  '예식 날짜와 예상 하객 규모 정하기': {
    description: '예식 후보일과 하객 규모 구간을 정해 웨딩홀 탐색 기준을 만듭니다.',
    why: '예식일과 하객 규모가 정해져야 웨딩홀 후보, 식대 예산, 청첩장 수량을 현실적으로 좁힐 수 있습니다.',
    how: '양가와 가능한 주말 후보 1~3개를 추리고, 친척·지인·회사 동료 명단을 100명 단위로 합산해 150명 이하, 150~250명, 250명 이상 중 어디에 가까운지 정합니다.',
    completion_criteria: '예식일 후보 1~3개와 예상 하객 규모 구간을 기록했다.',
    caution: '양가 일정 충돌이 생기기 쉬우므로 후보일은 하나만 두지 않습니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '웨딩홀 후보와 예산 범위 비교하기': {
    description: '위치, 보증인원, 식대, 대관료, 포함 항목을 한 표에서 비교합니다.',
    why: '웨딩홀 비용은 보증인원과 포함 항목에 따라 크게 달라져 제목 견적만으로는 비교하기 어렵습니다.',
    how: '후보 3~5곳의 위치, 가능한 날짜, 보증인원, 1인 식대, 대관료, 꽃장식·음향 포함 여부를 같은 기준으로 적습니다.',
    completion_criteria: '후보 3곳 이상을 같은 기준으로 비교했고 우선 방문할 곳을 정했다.',
    caution: '계약금 환불 조건과 보증인원 변경 가능 시점을 함께 확인합니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '양가 주요 일정과 우선순위 맞추기': {
    description: '상견례, 예단·예물, 혼주 준비처럼 양가 협의가 필요한 항목을 먼저 정렬합니다.',
    why: '양가 기대치가 늦게 드러나면 이미 예약한 일정이나 예산을 다시 조정해야 할 수 있습니다.',
    how: '양가 부모님과 반드시 맞춰야 하는 항목, 각자 결정해도 되는 항목, 아직 보류할 항목을 나눕니다.',
    completion_criteria: '양가 협의 필요 항목과 담당자를 정리했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '스튜디오, 드레스, 메이크업 후보 비교하기': {
    description: '스드메 패키지와 개별 계약의 포함 범위, 추가금 기준을 비교합니다.',
    why: '스드메는 기본가보다 촬영 원본, 헬퍼비, 드레스 업그레이드, 메이크업 추가 비용에서 차이가 납니다.',
    how: '패키지 후보별 포함 항목, 원본·수정본 비용, 헬퍼비, 촬영 가능일, 취소 조건을 적습니다.',
    completion_criteria: '후보별 포함/추가 비용을 비교했고 상담 또는 계약 후보를 정했다.',
    caution: '추가금 기준을 구두로만 듣지 말고 견적서나 메시지로 남깁니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '본식 스냅과 영상 필요 여부 정하기': {
    description: '본식 사진, 영상, 원판, 앨범 구성의 필요 여부와 예산 상한을 정합니다.',
    why: '본식 기록 상품은 촬영 범위와 보정본 수에 따라 비용 차이가 커서 뒤늦게 고르면 예산이 흔들립니다.',
    how: '원하는 결과물이 사진 중심인지 영상 중심인지 정하고, 필수 컷과 필요 없는 구성을 표시합니다.',
    completion_criteria: '스냅/영상 필요 여부와 예산 상한을 기록했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '신혼여행 예산과 일정 후보 정리하기': {
    description: '휴가 가능일, 항공권, 숙소, 환율, 보험을 포함한 대략 예산을 잡습니다.',
    why: '신혼여행은 예식 준비와 비용 지출 시기가 겹치므로 큰 예산 항목을 먼저 분리해야 합니다.',
    how: '가능한 출발일 2~3개와 목적지 후보를 정하고 항공·숙소·현지 비용을 대략 합산합니다.',
    completion_criteria: '여행 후보지와 총예산 범위를 정했고 예약 검토 시점을 정했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '청첩장 문구와 발송 명단 정리하기': {
    description: '종이/모바일 청첩장 문구, 주소록, 발송 대상을 정리합니다.',
    why: '청첩장은 하객 수 확정, 식대 예산, 답례품 수량과 직접 연결됩니다.',
    how: '양가 명단과 본인 지인 명단을 나누고, 주소가 필요한 대상과 모바일 발송 대상을 분리합니다.',
    completion_criteria: '발송 명단과 문구 초안을 만들었고 검토 담당자를 정했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '식순, 사회자, 축가, 혼주 동선 확인하기': {
    description: '본식 진행 순서와 사람별 역할, 리허설이 필요한 동선을 확인합니다.',
    why: '식순과 동선이 늦게 정해지면 사회자, 축가, 혼주, 스냅 촬영팀이 서로 다른 정보를 갖게 됩니다.',
    how: '식순 초안, 입장 순서, 축가 위치, 혼주 인사 동선, 촬영 요청 컷을 한 문서로 정리합니다.',
    completion_criteria: '사회자와 양가 혼주에게 공유할 본식 진행 초안을 만들었다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'low',
  },
  '예복, 한복, 부케, 답례품 진행 상태 확인하기': {
    description: '주문·대여·수령일이 있는 세부 준비물을 한 번에 점검합니다.',
    why: '세부 준비물은 담당자가 흩어지기 쉬워 누가 언제 찾는지 기록하지 않으면 본식 직전에 몰립니다.',
    how: '품목별 담당자, 주문처, 결제 여부, 수령 예정일, 보관 위치를 적습니다.',
    completion_criteria: '각 품목의 담당자와 수령일을 정리했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '최종 하객 수와 식대 기준 확인하기': {
    description: '보증인원, 최종 인원 통보일, 식대 정산 기준을 확정합니다.',
    why: '최종 하객 수는 당일 식대와 좌석, 답례품 수량에 직접 영향을 줍니다.',
    how: '참석 회신, 양가 추가 명단, 업체 최종 통보 마감일을 맞춰 보증인원과 예상 인원을 분리해 적습니다.',
    completion_criteria: '보증인원과 예상 참석 인원을 구분해 기록했고 업체 통보일을 확인했다.',
    caution: '보증인원 변경 마감 이후에는 비용이 늘 수 있으므로 계약 조건을 다시 봅니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '본식 당일 시간표와 연락망 공유하기': {
    description: '신랑·신부, 혼주, 사회자, 업체 담당자의 당일 시간표와 연락처를 공유합니다.',
    why: '본식 당일에는 질문이 한 사람에게 몰리기 쉬워 연락망과 시간표가 있어야 지연을 줄일 수 있습니다.',
    how: '메이크업 시작, 이동, 리허설, 본식, 사진 촬영, 정산 시간을 순서대로 적고 담당자 연락처를 붙입니다.',
    completion_criteria: '당일 시간표와 연락망을 양가와 주요 담당자에게 공유했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'low',
  },
  '결제 잔금과 준비물 체크하기': {
    description: '잔금, 봉투, 신분증, 계약서, 개인 준비물을 전날 한 번에 확인합니다.',
    why: '본식 전날에는 시간이 부족하므로 결제와 준비물을 분리해 마지막 누락을 줄여야 합니다.',
    how: '업체별 잔금 금액과 결제 수단, 당일 가져갈 물건, 전달할 봉투와 보관 담당자를 적습니다.',
    completion_criteria: '잔금 목록과 당일 준비물 체크가 끝났고 보관 담당자를 정했다.',
    caution: '현금이나 귀중품은 보관 담당자와 전달 시점을 명확히 합니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
};

const running5kRoutineText = `@주 3회
@4주 완주 루틴

## 1주차 걷기와 짧은 조깅
- 5분 걷기로 워밍업하기
- 1분 조깅과 2분 걷기 5세트 반복하기
- 5분 천천히 걸으며 마무리하기

## 2주차 조깅 시간 늘리기
- 5분 걷기로 워밍업하기
- 2분 조깅과 2분 걷기 5세트 반복하기
- 무릎, 발목, 호흡 상태 기록하기

## 3주차 지속주 감각 만들기
- 10분 이상 천천히 이어 달리기
- 500m 빠르게, 500m 천천히 반복하기
- 하루는 반드시 휴식하기

## 4주차 5km 도전
- 초반 1km를 의식적으로 천천히 달리기
- 걷더라도 전체 5km 거리 완주하기
- 완주 후 통증과 다음 목표 기록하기`;

const dietHabitText = `@매일 기록
@주 3회 운동

## 식사 기록
- 아침, 점심, 저녁 먹은 내용 기록하기
- 단백질과 채소가 한 끼에 포함됐는지 확인하기
- 물 섭취와 야식 여부 기록하기

## 운동 기록
- 20분 걷기 또는 가벼운 유산소 하기
- 스쿼트, 푸시업, 플랭크 중 2개 선택하기
- 운동 후 피로도와 통증 여부 기록하기

## 주간 점검
- 체중보다 식사·수면·활동 패턴을 먼저 보기
- 무리한 제한으로 폭식이 생겼는지 확인하기
- 다음 주 유지할 습관 2개만 고르기`;

const babyWarning =
  '이 Flow는 제작자 경험 기반의 식단표와 레시피를 시작일 기준으로 정리한 것입니다. 아이의 건강 상태, 알레르기, 시작 시기, 재료 선택은 전문가 또는 공식 정보를 확인하세요. 꿀, 질식 위험 식품, 알레르기 유발 가능 식품은 공식 안전 정보를 우선 확인하세요.';

function recipe(
  id: string,
  title: string,
  ingredients: string[],
  steps: string[],
  notes: Partial<Recipe> = {},
): Recipe {
  return {
    id,
    flow_id: 'flow-baby-food',
    title,
    ingredients: ingredients.map((name) => ({ name })),
    steps: steps.map((text, index) => ({ order: index + 1, text })),
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    ...notes,
  };
}

const babyFoodBundle: FlowBundle = {
  flow: {
    id: 'flow-baby-food',
    slug: 'baby-food-menu-recipe',
    title: '초기 이유식 메뉴·레시피 Flow',
    description:
      '시작일을 입력하면 초기 이유식 메뉴, 새 재료, 레시피, 반응 기록을 날짜별로 확인할 수 있습니다.',
    category: '육아/이유식',
    structure_type: 'phase',
    content_type: 'meal_plan',
    anchor_type: 'start_date',
    status: 'published',
    risk_level: 'medical_sensitive',
    source_title: '초기 이유식 식단표 참고',
    source_url: 'https://kimstar1021.tistory.com/63',
    warning: babyWarning,
    ...creatorMeta('초기 이유식 기록맘', '육아 경험 크리에이터', '초기 이유식 시작일 기준 메뉴와 반응 기록을 정리했습니다.', 982, 214),
    ...tagMeta(['초보자용', '식단·레시피', '건강주의', '매일 기록', '육아']),
    created_at: now,
    updated_at: now,
  },
  sections: [
    { id: 'baby-phase-1', flow_id: 'flow-baby-food', title: '초기 1단계', order: 0 },
    { id: 'baby-phase-2', flow_id: 'flow-baby-food', title: '초기 2단계', order: 1 },
  ],
  items: [],
  mealSlots: [
    {
      id: 'meal-rice-0',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-rice',
      day_offset: 0,
      duration_days: 3,
      menu_title: '쌀미음',
      new_ingredients: ['쌀'],
      allergy_watch_days: 3,
      order: 0,
    },
    {
      id: 'meal-sticky-rice-3',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-sticky-rice',
      day_offset: 3,
      duration_days: 3,
      menu_title: '찹쌀미음',
      new_ingredients: ['찹쌀'],
      allergy_watch_days: 3,
      order: 1,
    },
    {
      id: 'meal-zucchini-6',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-zucchini',
      day_offset: 6,
      duration_days: 3,
      menu_title: '애호박미음',
      new_ingredients: ['애호박'],
      allergy_watch_days: 3,
      order: 2,
    },
    {
      id: 'meal-bokchoy-9',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-bokchoy',
      day_offset: 9,
      duration_days: 3,
      menu_title: '청경채미음',
      new_ingredients: ['청경채'],
      allergy_watch_days: 3,
      order: 3,
    },
    {
      id: 'meal-beef-30',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-2',
      recipe_id: 'recipe-beef',
      day_offset: 30,
      duration_days: 3,
      menu_title: '소고기미음',
      new_ingredients: ['소고기'],
      allergy_watch_days: 3,
      order: 4,
    },
    {
      id: 'meal-squash-33',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-2',
      recipe_id: 'recipe-squash',
      day_offset: 33,
      duration_days: 3,
      menu_title: '단호박미음',
      new_ingredients: ['단호박'],
      allergy_watch_days: 3,
      order: 5,
    },
  ],
  itemDetails: [],
  recipes: [
    recipe(
      'recipe-rice',
      '쌀미음',
      ['쌀 또는 쌀가루', '물'],
      [
        '쌀 또는 쌀가루를 준비한다.',
        '물과 함께 충분히 익힌다.',
        '곱게 갈거나 체에 거른다.',
        '아이에게 맞는 농도로 조절한다.',
      ],
      {
        texture_note: '초기 미음 농도에 맞춰 묽게 조절한다.',
        storage_note: '조리 후 보관 방식과 폐기 기준은 보호자가 공식 식품 안전 정보를 확인해 메모한다.',
        tool_note: '조리 도구와 보관 용기는 사용 전 깨끗이 세척한다.',
        caution_note: '처음 먹는 날은 소량 반응 관찰 메모를 남긴다. 공식 권장량이 아닙니다.',
      },
    ),
    recipe(
      'recipe-sticky-rice',
      '찹쌀미음',
      ['찹쌀 또는 찹쌀가루', '물'],
      ['찹쌀을 준비한다.', '충분히 익힌다.', '곱게 갈거나 체에 거른다.', '농도를 확인한다.'],
      {
        storage_note: '남은 분량은 위생적으로 소분하고 보관 시간을 별도 기록한다.',
        tool_note: '체, 믹서, 숟가락 등 아이 입에 닿는 도구는 따로 관리한다.',
        caution_note: '새 곡물 반응을 기록하고 이상 반응이 의심되면 중단 후 확인한다.',
      },
    ),
    recipe(
      'recipe-zucchini',
      '애호박미음',
      ['애호박', '쌀미음 베이스'],
      [
        '애호박을 손질한다.',
        '충분히 익힌다.',
        '쌀미음 베이스와 함께 곱게 섞는다.',
        '입자감을 확인한다.',
      ],
      {
        texture_note: '껍질이나 큰 입자가 남지 않도록 곱게 조절한다.',
        storage_note: '새 재료 반응 관찰 기간에는 기록을 남긴다.',
        caution_note: '채소 입자감이 아이에게 맞는지 먹이기 전 확인한다.',
      },
    ),
    recipe(
      'recipe-bokchoy',
      '청경채미음',
      ['청경채', '쌀미음 베이스'],
      [
        '청경채를 손질한다.',
        '충분히 익힌다.',
        '곱게 갈거나 체에 거른다.',
        '쌀미음 베이스와 섞는다.',
      ],
      {
        texture_note: '섬유질이 거칠게 남지 않도록 충분히 익히고 곱게 간다.',
        storage_note: '새 재료 반응을 기록한다.',
        caution_note: '처음 먹는 채소는 피부, 변, 수면 변화를 함께 메모한다.',
      },
    ),
    recipe(
      'recipe-beef',
      '소고기미음',
      ['소고기', '쌀미음 베이스'],
      [
        '소고기를 손질한다.',
        '충분히 익힌다.',
        '곱게 갈아 쌀미음 베이스와 섞는다.',
        '아이에게 맞는 농도와 입자감을 확인한다.',
      ],
      {
        texture_note: '질긴 섬유가 남지 않도록 곱게 갈고 농도를 다시 확인한다.',
        storage_note: '육류 재료는 조리와 보관 위생을 특히 따로 확인한다.',
        caution_note: '단백질 재료는 아이 상태에 따라 전문가 또는 공식 정보를 확인한다.',
      },
    ),
    recipe(
      'recipe-squash',
      '단호박미음',
      ['단호박', '쌀미음 베이스'],
      [
        '단호박을 손질한다.',
        '충분히 익힌다.',
        '곱게 으깨거나 갈아 쌀미음 베이스와 섞는다.',
        '농도를 조절한다.',
      ],
      {
        texture_note: '덩어리 없이 부드럽게 으깨고 필요하면 체에 거른다.',
        storage_note: '남은 재료와 완성분은 분리해 보관 메모를 남긴다.',
        caution_note: '단맛이 강한 재료도 아이 반응과 섭취량을 기록한다.',
      },
    ),
  ],
  warnings: [babyWarning],
};

const additionalOnlineBundles: FlowBundle[] = [
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-passport-renewal',
        slug: 'passport-renewal-docs',
        title: '여권 재발급 준비 Flow',
        description: '여행 전 여권 재발급 가능 여부, 사진, 신청 경로, 수령까지 놓치기 쉬운 준비를 확인합니다.',
        category: '여행/여권',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medium',
        source_title: '정부24 여권 발급 민원 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12600000001&tp_seq=',
        warning: '여권 발급 가능 대상, 사진 규격, 수수료, 수령 방식은 최신 공식 안내를 확인하세요.',
      },
      passportRenewalText,
    ),
    {
      label: '정부24 여권 발급 민원 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12600000001&tp_seq=',
    },
    'medium',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-national-health-checkup',
        slug: 'national-health-checkup-d7',
        title: '국가건강검진 D-7 준비 Flow',
        description: '검진일을 기준으로 대상 확인, 금식, 신분증, 수면내시경 이동 계획을 날짜별로 준비합니다.',
        category: '건강/검진',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '국민건강보험 건강검진 안내',
        source_url: 'https://www.nhis.or.kr/static/html/wbma/c/wbhaca04500_2025_1.pdf',
        warning: '검진 전 금식, 약 복용, 수면내시경 주의사항은 검진기관과 의료진 안내를 우선 확인하세요.',
      },
      healthCheckupText,
    ),
    {
      label: '국민건강보험 건강검진 안내',
      url: 'https://www.nhis.or.kr/static/html/wbma/c/wbhaca04500_2025_1.pdf',
    },
    'medical_sensitive',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-business-registration',
        slug: 'business-registration-basic',
        title: '개인 사업자등록 준비 Flow',
        description: '업종, 사업장, 임대차계약서, 인허가 여부를 정리하고 홈택스 신청 전 준비물을 점검합니다.',
        category: '사업/세무',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '홈택스 사업자등록 제출서류 안내',
        source_url: 'https://mob.tbht.hometax.go.kr/jsonAction.do?actionId=UTBABAAB92F001',
        warning: '사업자등록, 인허가, 세무 처리는 업종과 개인 상황에 따라 달라질 수 있습니다. 세무서 또는 세무 전문가 확인이 필요할 수 있습니다.',
      },
      businessRegistrationText,
    ),
    {
      label: '홈택스 사업자등록 제출서류 안내',
      url: 'https://mob.tbht.hometax.go.kr/jsonAction.do?actionId=UTBABAAB92F001',
    },
    'financial_sensitive',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-driver-license-renewal',
        slug: 'driver-license-renewal-check',
        title: '운전면허 갱신 준비 Flow',
        description: '갱신·적성검사 기간, 사진, 신분증, 수수료와 온라인/방문 신청 경로를 확인합니다.',
        category: '자동차/검사',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medium',
        source_title: '한국도로교통공단 안전운전 통합민원 면허갱신 안내',
        source_url: 'https://www.safedriving.or.kr/diGuide/selectDiGuide02.do',
        warning: '면허 갱신 기간과 적성검사 요건은 개인 면허 종류와 상태에 따라 달라질 수 있습니다.',
      },
      driverLicenseRenewalText,
    ),
    {
      label: '한국도로교통공단 안전운전 통합민원 면허갱신 안내',
      url: 'https://www.safedriving.or.kr/diGuide/selectDiGuide02.do',
    },
    'medium',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-happy-birth',
        slug: 'happy-birth-service-check',
        title: '행복출산 통합신청 준비 Flow',
        description: '출생신고 이후 받을 수 있는 출산·양육 관련 서비스를 한 번에 신청하기 전 필요한 정보를 정리합니다.',
        category: '육아/출산',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '정부24 행복출산 민원 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001&HighCtgCD=A01004&tp_seq=01',
        warning: '지원 대상, 지급 조건, 신청 가능 기간은 거주지와 가족 상황에 따라 달라질 수 있습니다.',
      },
      happyBirthText,
    ),
    {
      label: '정부24 행복출산 민원 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001&HighCtgCD=A01004&tp_seq=01',
    },
    'medical_sensitive',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-pet-registration',
        slug: 'pet-registration-basic',
        title: '반려견 동물등록 준비 Flow',
        description: '동물등록 대상, 등록 방식, 대행기관, 소유자 정보 변경 신고까지 확인합니다.',
        category: '생활/반려동물',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'low',
        source_title: '정부24 동물등록 신청·변경신고 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15410000003&HighCtgCD=A09006',
      },
      petRegistrationText,
    ),
    {
      label: '정부24 동물등록 신청·변경신고 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15410000003&HighCtgCD=A09006',
    },
    'low',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-vaccination-certificate',
        slug: 'vaccination-certificate-issue',
        title: '예방접종증명서 발급 Flow',
        description: '본인·자녀 예방접종증명서 발급 경로, 언어, 제출처 요구 형식을 확인합니다.',
        category: '건강/증명서',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '정부24 예방접종증명 민원 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14600000398&HighCtgCD=A05004',
        warning: '예방접종 이력과 증명 가능 항목은 접종 기록 상태에 따라 달라질 수 있습니다.',
      },
      vaccinationCertificateText,
    ),
    {
      label: '정부24 예방접종증명 민원 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14600000398&HighCtgCD=A05004',
    },
    'medical_sensitive',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-family-certificate',
        slug: 'family-certificate-issue',
        title: '가족관계증명서 발급 Flow',
        description: '제출처가 요구하는 증명서 종류, 공개 범위, 발급 경로를 먼저 정리합니다.',
        category: '서류/증명',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'low',
        source_title: '정부24 가족관계등록부 증명서 안내',
        source_url: 'https://m.gov.kr/mw/AA020InfoCappView.do?CappBizCD=97400000004&HighCtgCD=A01008&tp_seq=01',
      },
      familyCertificateText,
    ),
    {
      label: '정부24 가족관계등록부 증명서 안내',
      url: 'https://m.gov.kr/mw/AA020InfoCappView.do?CappBizCD=97400000004&HighCtgCD=A01008&tp_seq=01',
    },
    'low',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-resident-register-copy',
        slug: 'resident-register-copy-issue',
        title: '주민등록등본·초본 발급 Flow',
        description: '등본/초본 선택, 표시 항목, 주민등록번호 공개 범위, 발급 환경을 확인합니다.',
        category: '서류/증명',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'low',
        source_title: '정부24 주민등록표 등본·초본 발급 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A1004',
      },
      residentRegisterText,
    ),
    {
      label: '정부24 주민등록표 등본·초본 발급 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A1004',
    },
    'low',
  ),
  withOfficialSourceDetails(
    makeTextBundle(
      {
        id: 'flow-industrial-accident-claim',
        slug: 'industrial-accident-claim-docs',
        title: '산재보험 요양비 청구 준비 Flow',
        description: '요양비 청구 유형, 영수증, 진료비 상세내역서, 보완 서류를 정리합니다.',
        category: '노무/산재',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '정부24 산재보험 요양비청구 민원 안내',
        source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14900000263&HighCtgCD=A05007&tp_seq=',
        warning: '산재 인정 여부, 청구 가능 항목, 보완 서류는 근로복지공단 판단과 개인 상황에 따라 달라질 수 있습니다.',
      },
      industrialAccidentClaimText,
    ),
    {
      label: '정부24 산재보험 요양비청구 민원 안내',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14900000263&HighCtgCD=A05007&tp_seq=',
    },
    'financial_sensitive',
  ),
];

const creatorInspiredBundles: FlowBundle[] = [
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-study-exam-d30',
        slug: 'study-exam-d30-plan',
        title: '시험 D-30 공부 계획 Flow',
        description: '시험일을 기준으로 범위 정리, 1회독, 문제풀이, 실전 점검을 30일 안에 실행합니다.',
        category: '공부/시험',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'low',
        source_title: '공부 계획 블로그 콘텐츠 참고',
        source_url: 'https://englishfact.com/ko/10-tips-to-enhance-english-study-at-home/',
      },
      studyExamD30Text,
    ),
    studyExamD30Details,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-english-study-30day',
        slug: 'english-study-30day-routine',
        title: '직장인 영어공부 30일 루틴 Flow',
        description: '매일 30분씩 듣기·읽기에서 말하기·쓰기까지 옮겨가는 독학 루틴입니다.',
        category: '공부/영어',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '직장인 영어 독학 루틴 참고',
        source_url: 'https://www.new1eng.com/blog/adult-english-30day-self-study',
      },
      englishStudyRoutineText,
    ),
    englishStudyRoutineDetails,
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-used-car-buying',
        slug: 'used-car-buying-check',
        title: '중고차 구매 현장 점검 Flow',
        description: '예산, 매물 조사, 현장 확인, 계약 전 확인까지 중고차 구매 전 과정을 체크합니다.',
        category: '자동차/구매',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '중고차 구매 체크리스트 참고',
        source_url: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
        warning: '중고차 구매는 차량 상태, 계약 조건, 압류·저당 여부에 따라 손실 위험이 있습니다. 공식 조회와 전문가 점검을 함께 사용하세요.',
      },
      usedCarBuyingText,
    ),
    {
      label: '중고차 구매 체크리스트 가이드',
      url: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
    },
    'financial_sensitive',
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-new-car-delivery',
        slug: 'new-car-delivery-check',
        title: '신차 인수 점검 Flow',
        description: '계약 옵션, 외관, 실내 기능, 인수 후 이상 기록까지 신차 인수 당일 체크합니다.',
        category: '자동차/구매',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '겟차 신차 검수 체크리스트 가이드',
        source_url: 'https://web.getcha.kr/blog/new-car-inspection-checklist-complete-guide-2026',
        warning: '차량 인수 후 발견되는 하자는 처리 기준이 달라질 수 있으므로 인수 전 사진과 기록을 남기세요.',
      },
      newCarDeliveryText,
    ),
    {
      label: '겟차 신차 검수 체크리스트 가이드',
      url: 'https://web.getcha.kr/blog/new-car-inspection-checklist-complete-guide-2026',
    },
    'financial_sensitive',
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-car-care-monthly',
        slug: 'car-care-monthly-routine',
        title: '월 1회 자동차 관리 루틴 Flow',
        description: '타이어, 오일, 소모품, 등화장치, 블랙박스를 월 1회 또는 장거리 전 점검합니다.',
        category: '자동차/관리',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '자동차 셀프정비·타이어 관리 참고',
        source_url: 'https://gnsl0879.tistory.com/717',
        warning: '정비가 필요한 이상 징후가 보이면 자가 판단만으로 운행하지 말고 정비소 점검을 받으세요.',
      },
      carCareMonthlyText,
    ),
    carCareMonthlyDetails,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-wedding-d180',
        slug: 'wedding-d180-basic',
        title: '결혼 준비 D-180 Flow',
        description: '예식일을 기준으로 6개월간 12개 항목을 웨딩홀, 스드메, 청첩장, 본식 디테일 순서로 정리합니다.',
        category: '결혼/준비',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '결혼 준비 체크리스트 참고',
        source_url: 'https://www.ohprint.me/blog/wedding-checklist',
        warning: '결혼 준비 비용과 일정은 지역, 업체, 양가 상황에 따라 크게 달라질 수 있습니다.',
      },
      weddingD180Text,
    ),
    weddingD180Details,
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-running-5k',
        slug: 'running-5k-4week',
        title: '초보 러너 5km 4주 완주 Flow',
        description: '걷기와 조깅을 섞어 4주 동안 첫 5km 완주를 준비하는 주 3회 루틴입니다.',
        category: '운동/루틴',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '런데이 초보 러닝 콘텐츠 참고',
        source_url: 'https://www.runday.co.kr/',
        warning: '통증, 어지러움, 기존 질환이 있으면 운동 강도를 낮추고 전문가와 상담하세요.',
      },
      running5kRoutineText,
    ),
    {
      label: '런데이 초보 러닝 콘텐츠 참고',
      url: 'https://www.runday.co.kr/',
    },
    'medium',
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-diet-habit',
        slug: 'diet-habit-2week',
        title: '2주 다이어트 습관 기록 Flow',
        description: '체중 숫자보다 식사, 물, 운동, 수면 패턴을 먼저 보는 2주 기록 루틴입니다.',
        category: '다이어트/기록',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '질병관리청 건강하게 체중 감량하기 안내',
        source_url:
          'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
        warning: '이 Flow는 일반적인 습관 기록용입니다. 질환, 임신·수유, 섭식장애 경험, 약물 복용이 있으면 전문가 상담을 우선하세요.',
      },
      dietHabitText,
    ),
    {
      label: '질병관리청 건강하게 체중 감량하기 안내',
      url: 'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    },
    'medical_sensitive',
  ),
];

function enrichSeedMeta(bundle: FlowBundle, index: number): FlowBundle {
  const category = bundle.flow.category;
  const needsReviewMeta = sourceNeedsReviewMeta[bundle.flow.slug];
  const creatorByCategory = category.includes('자동차')
    ? creatorMeta('차근차근 모빌리티', '자동차 생활 크리에이터', '구매와 관리에서 놓치기 쉬운 확인 순서를 정리합니다.', 420 + index * 37, 88 + index * 9)
    : category.includes('자격증') || category.includes('공부')
      ? creatorMeta('루틴 공부방', '학습 루틴 크리에이터', '시험과 자기계발 콘텐츠를 실행 단위로 쪼개 정리합니다.', 510 + index * 31, 102 + index * 8)
      : category.includes('가전')
        ? creatorMeta('FLOW 큐레이션팀', '공식자료 큐레이터', '공식 관리 안내를 반복 실행표로 재구성합니다.', 480 + index * 24, 96 + index * 6)
        : category.includes('결혼')
          ? creatorMeta('웨딩 체크메이트', '결혼 준비 경험자', '준비 기간별 의사결정과 업체 확인 순서를 정리합니다.', 760 + index * 21, 164 + index * 7)
          : category.includes('운동') || category.includes('다이어트')
            ? creatorMeta('생활 루틴 코치', '운동·습관 크리에이터', '무리하지 않고 반복할 수 있는 루틴을 실행표로 정리합니다.', 690 + index * 25, 141 + index * 6)
            : category.includes('서류') || category.includes('사업') || category.includes('노무')
              ? creatorMeta('생활 행정 노트', '공식자료 큐레이터', '공식 안내를 신청 전 확인 순서로 재구성합니다.', 360 + index * 18, 72 + index * 5)
              : creatorMeta('FLOW 큐레이션팀', '경험 콘텐츠 큐레이터', '반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.', 480 + index * 24, 96 + index * 6);

  return {
    ...bundle,
    flow: {
      ...bundle.flow,
      ...needsReviewMeta,
      ...(bundle.flow.creator_name ? {} : creatorByCategory),
      tags: bundle.flow.tags ?? buildSeedTags(bundle),
    },
  };
}

function buildSeedTags(bundle: FlowBundle): string[] {
  const tags = new Set<string>();
  const { flow } = bundle;
  const officialSourceDomains = [
    'gov.kr',
    'nhis.or.kr',
    'hometax',
    'nts.go.kr',
    'health.kdca.go.kr',
    'kdca.go.kr',
    'safedriving.or.kr',
    'samsungsvc.co.kr',
    'kotsa.or.kr',
    'q-net.or.kr',
  ];
  const sourceUrl = flow.source_url ?? '';
  const isOfficialSource = officialSourceDomains.some((domain) => sourceUrl.includes(domain));

  if (flow.structure_type === 'timeline') tags.add('D-Day 준비');
  if (flow.structure_type === 'routine') tags.add('매일 루틴');
  if (flow.structure_type === 'checklist') tags.add('체크리스트');
  if (flow.content_type === 'meal_plan') tags.add('식단·레시피');
  if (flow.risk_level === 'financial_sensitive') tags.add('돈이 걸린 결정');
  if (flow.risk_level === 'medical_sensitive') tags.add('건강주의');
  if (isOfficialSource) tags.add('공식확인');
  if (!tags.has('공식확인')) tags.add('블로그 따라하기');
  if (flow.category.includes('공부')) tags.add('공부');
  if (flow.category.includes('자동차')) tags.add('자동차');
  if (flow.category.includes('결혼')) tags.add('결혼');
  if (flow.category.includes('운동') || flow.category.includes('다이어트')) tags.add('운동·습관');
  if (flow.category.includes('육아') || flow.category.includes('이유식')) tags.add('육아');
  if (flow.category.includes('서류') || flow.category.includes('사업') || flow.category.includes('노무')) tags.add('생활서류');
  if (flow.category.includes('여행')) tags.add('여행');
  if (flow.category.includes('이사')) tags.add('이사');
  if (flow.slug.includes('basic') || flow.slug.includes('check') || flow.slug.includes('routine')) tags.add('초보자용');

  return Array.from(tags).slice(0, 6);
}

const baseSeedBundles: FlowBundle[] = [
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-moving',
        slug: 'moving-d30-basic',
        title: '이사 D-30 준비 Flow',
        description: '이사일을 기준으로 D-30부터 당일과 행정 마무리까지 필요한 일을 날짜별로 실행합니다.',
        category: '이사',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'low',
        source_title: '이사 체크리스트 참고',
        source_url:
          'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
      },
      movingText,
    ),
    {
      '이사 방식 정하기': {
        description: '포장이사, 반포장이사, 직접 운반 중 예산과 짐 양에 맞는 방식을 정합니다.',
        source_type: 'creator_experience',
      },
      '이사할 집 하자 점검하기': {
        description: '입주 전 벽지, 누수, 배수, 콘센트, 창문, 도어락 상태를 사진으로 남깁니다.',
        why: '입주 후 발견한 하자는 책임 소재가 애매해질 수 있어 이사 전 기록이 중요합니다.',
        how: '현관, 욕실, 주방, 창문, 콘센트, 보일러 주변을 사진과 짧은 메모로 남깁니다.',
        completion_criteria: '주요 공간 사진과 하자 목록을 집주인 또는 중개인에게 공유했다.',
        source_type: 'creator_experience',
      },
      '대형폐기물 배출 신고와 수거일 확인하기': {
        description: '지자체 신고 방식과 수거일이 다르므로 이사 전 배출 가능한 날짜를 먼저 확인합니다.',
        why: '대형폐기물은 당일 배출이 어려운 경우가 많아 이사 일정과 충돌할 수 있습니다.',
        how: '거주지 지자체 대형폐기물 신고 페이지에서 품목, 배출 장소, 수거일을 확인합니다.',
        completion_criteria: '배출 신고 번호와 수거 예정일을 기록했다.',
        source_type: 'reference',
      },
      '관리사무소에 이사 시간과 차량 동선 공유하기': {
        description: '공동주택은 엘리베이터 보양, 주차 위치, 사다리차 가능 여부를 미리 맞춰야 합니다.',
        source_type: 'creator_experience',
      },
      '계량기와 집 상태 사진 남기기': {
        description: '전기, 가스, 수도 계량기와 주요 하자 사진을 남겨 정산과 분쟁 확인에 활용합니다.',
        source_type: 'creator_experience',
      },
      '전입신고와 확정일자 확인하기': {
        description: '전입신고와 임대차 계약 확정일자 처리 필요 여부를 같은 날 확인합니다.',
        why: '주소 이전과 임대차 계약 관련 권리 확인에 직접 연결되는 행정 절차입니다.',
        how: '전입신고는 정부24 또는 주민센터, 확정일자는 인터넷등기소 또는 주민센터에서 확인합니다.',
        completion_criteria: '전입신고 접수 상태와 확정일자 부여 여부를 각각 확인했다.',
        links: [
          {
            label: '정부24 전입신고',
            url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016',
            type: 'official',
          },
          {
            label: '인터넷등기소',
            url: 'https://www.iros.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
      },
      '정부24 전입신고 처리 결과 확인하기': {
        description: '정부24 또는 주민센터에서 전입신고 처리 상태와 세대주 확인 필요 여부를 확인합니다.',
        why: '신청만 하고 끝내면 세대주 확인이나 보완 요청을 놓칠 수 있습니다.',
        how: '정부24 MyGOV 또는 신청 내역에서 처리 상태를 확인합니다.',
        completion_criteria: '처리 완료 또는 보완 필요 상태를 확인하고 캡처/메모를 남겼다.',
        links: [
          {
            label: '정부24',
            url: 'https://www.gov.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
      },
      '임대차 계약 확정일자 부여 여부 확인하기': {
        description: '임대차 계약서 확정일자 신청 여부와 부여일을 별도로 확인합니다.',
        why: '임대차 계약 관련 권리 확인에서 날짜와 신청 상태가 중요합니다.',
        how: '인터넷등기소 또는 주민센터에서 계약서 기준 확정일자 부여 여부를 확인합니다.',
        completion_criteria: '확정일자 부여일과 계약서 보관 위치를 기록했다.',
        links: [
          {
            label: '인터넷등기소',
            url: 'https://www.iros.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
      },
    },
  ),
  babyFoodBundle,
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-workout',
        slug: 'home-workout-20min',
        title: '하루 20분 전신 홈트 Flow',
        description: '운동 시작일과 요일을 정하고 주 3회 루틴을 체크합니다. 준비 운동, 본 운동, 마무리 기록까지 포함합니다.',
        category: '운동/루틴',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
        source_url: 'https://www.youtube.com/@ThankyouBUBU',
        warning: '통증이 있거나 질환이 있는 경우 무리하지 말고 전문가와 상담하세요.',
      },
      workoutText,
    ),
    workoutDetails,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-job-change',
        slug: 'job-change-risk-check',
        title: '이직 전 리스크 점검 Flow',
        description: '퇴사 가능 상태, 회사 조건, 면접, 서류, 재정 안전장치를 순서대로 확인합니다.',
        category: '커리어/이직',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '이직 준비 체크리스트 참고',
        source_url: 'https://luckysuni-diary.tistory.com/102',
        warning: '재정 관련 항목은 개인 상황에 따라 달라질 수 있습니다. 법적·재정적 확정 조언으로 사용하지 마세요.',
      },
      jobChangeText,
    ),
    {
      '취업규칙 또는 사내 퇴사 프로세스 확인하기': {
        description: '계약서와 사내 규정의 통보 방식, 결재 라인, 장비 반납 절차를 확인합니다.',
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '퇴직연금 또는 IRP 계좌 지급 절차 확인하기': {
        description: '퇴직급여 지급 방식과 필요한 계좌, 처리 일정을 회사 담당자에게 확인합니다.',
        why: '퇴직급여는 지급 방식과 계좌 요건을 놓치면 실제 수령 일정이 밀릴 수 있습니다.',
        how: '회사 인사/급여 담당자에게 필요한 계좌, 서류, 예상 지급일을 확인합니다.',
        completion_criteria: '필요 계좌와 제출 서류, 예상 지급일을 기록했다.',
        links: [
          {
            label: '고용노동부 퇴직급여',
            url: 'https://www.moel.go.kr/retirementpay.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '이직확인서 처리와 고용보험 이력 확인하기': {
        description: '실업급여 가능성은 퇴사 사유와 고용보험 이력에 따라 달라지므로 공식 기준을 확인합니다.',
        why: '공백 기간이 생기면 고용보험 이력과 이직확인서 처리 상태가 다음 행동을 좌우합니다.',
        how: '고용보험 또는 Work24에서 자격 이력, 이직확인서 처리 여부, 수급 요건을 확인합니다.',
        completion_criteria: '이직확인서 처리 상태와 고용보험 이력을 확인했다.',
        caution: '실업급여 가능 여부는 퇴사 사유와 개인 이력에 따라 달라집니다.',
        links: [
          {
            label: '고용보험',
            url: 'https://www.ei.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '건강보험, 국민연금 등 공백 기간 처리 방식 확인하기': {
        description: '입사일 공백이 있으면 지역가입 전환, 납부 예외 등 개인 상황별 처리가 필요할 수 있습니다.',
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-overseas-travel',
        slug: 'overseas-travel-d14',
        title: '해외여행 출국 준비 Flow',
        description: '출국일을 기준으로 여권, 입국 조건, 짐, 공항 동선을 순서대로 확인합니다.',
        category: '여행/해외',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '외교부·여권안내·공항 반입 규정 참고',
        source_url: 'https://passport.go.kr/home/kor/contents.do?menuPos=48',
        warning: '입국 조건, 비자, 항공 보안 규정은 국가와 항공사에 따라 달라질 수 있습니다. 출국 전 공식 정보를 확인하세요.',
      },
      overseasTravelText,
    ),
    {
      '여권 잔여 유효기간 확인하기': {
        description: '국가별로 여권 잔여 유효기간과 사증 요건이 다를 수 있습니다.',
        why: '여권 유효기간이 부족하면 항공 탑승 또는 입국이 거절될 수 있습니다.',
        how: '여권 만료일과 목적지 입국 요건을 함께 확인합니다.',
        completion_criteria: '여권 만료일과 목적지 입국 요건을 기록했다.',
        links: [
          {
            label: '외교부 여권안내',
            url: 'https://passport.go.kr/home/kor/contents.do?menuPos=48',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '여행경보와 현지 안전 공지 확인하기': {
        description: '현지 치안, 감염병, 자연재해, 시위 등 여행 위험 정보를 확인합니다.',
        why: '여행경보는 일정 변경과 현지 이동 계획을 판단하는 기준이 됩니다.',
        how: '외교부 해외안전여행에서 목적지 국가와 도시의 최신 공지를 확인합니다.',
        completion_criteria: '목적지 여행경보 단계와 긴급 연락처를 저장했다.',
        links: [
          {
            label: '해외안전여행',
            url: 'https://www.0404.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '기내 반입 금지 물품과 보조배터리 규정 확인하기': {
        description: '보조배터리, 액체류, 공구류, 라이터 등은 공항 보안 검색에서 문제가 될 수 있습니다.',
        why: '수하물 재포장이나 압수로 출국 당일 시간이 지연될 수 있습니다.',
        how: '공항 및 항공사 안내에서 기내/위탁 가능 여부를 확인하고 애매한 물건은 미리 분리합니다.',
        completion_criteria: '기내 가방과 위탁 수하물에 넣을 물건을 분리했다.',
        links: [
          {
            label: '한국공항공사',
            url: 'https://www.airport.co.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-year-end-tax',
        slug: 'year-end-tax-docs',
        title: '연말정산 서류 준비 Flow',
        description: '홈택스 간소화 자료와 추가 증빙을 확인해 회사 제출 전 누락을 줄입니다.',
        category: '세금/연말정산',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '국세청 연말정산 간소화 서비스 개통 안내',
        source_url: 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=&nttSn=1347979',
        warning: '세액공제 가능 여부는 개인 상황과 해당 연도 세법에 따라 달라질 수 있습니다. 공식 안내와 회사 기준을 확인하세요.',
      },
      yearEndTaxText,
    ),
    {
      '홈택스 연말정산 간소화 서비스 접속 준비하기': {
        description: '간소화 자료 조회를 위해 홈택스 로그인과 인증 수단을 미리 준비합니다.',
        why: '연말정산 기간에는 접속과 인증 과정에서 시간이 오래 걸릴 수 있습니다.',
        how: '홈택스 접속, 간편인증 또는 공동/금융인증서 사용 가능 여부를 확인합니다.',
        completion_criteria: '홈택스 로그인과 인증 수단을 확인했다.',
        links: [
          {
            label: '국세청 홈택스',
            url: 'https://www.hometax.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '주민등록등본 등 인적공제 증빙 필요 여부 확인하기': {
        description: '부양가족, 장애인, 재학 등 일부 증빙은 별도 서류가 필요할 수 있습니다.',
        why: '간소화 자료만으로 확인되지 않는 공제는 추가 증빙을 빠뜨리기 쉽습니다.',
        how: '회사 안내와 정부24 제증명 발급 가능 항목을 확인합니다.',
        completion_criteria: '필요 증빙 목록과 발급 위치를 정리했다.',
        links: [
          {
            label: '정부24',
            url: 'https://www.gov.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '월세, 기부금, 안경구입비 등 간소화 누락 가능 자료 확인하기': {
        description: '간소화 자료에 자동 반영되지 않거나 누락될 수 있는 자료를 별도로 확인합니다.',
        why: '누락 자료를 제출하지 않으면 받을 수 있는 공제를 놓칠 수 있습니다.',
        how: '영수증, 이체 내역, 기관 발급 자료를 회사 제출 기준에 맞게 정리합니다.',
        completion_criteria: '간소화 외 추가 증빙 파일을 제출 폴더에 모았다.',
        links: [
          {
            label: '국세청 홈택스',
            url: 'https://www.hometax.go.kr',
            type: 'official',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
    },
  ),
  ...additionalOnlineBundles,
  ...creatorInspiredBundles,
  ...realContentPilotBundles,
  ...realSourceChannelBundles,
  ...previewFlowBundles,
];

export const seedBundles: FlowBundle[] = baseSeedBundles.map(enrichSeedMeta);
