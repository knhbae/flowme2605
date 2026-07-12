import { parseTextFlow } from './parser';
import { realContentPilotBundles } from './real-content-pilot-flows';
import { realSourceChannelBundles } from './real-source-channel-batch';
import { contentsBatch260601OfficialBundles } from './contents-batch-260601-official';
import { contentsBatch260601CreatorBundles } from './contents-batch-260601-creator';
import { curatedSourceAppSeedFlowBundles } from './curated-source-app-seed';
import { Flow, FlowBundle, FlowItemDetail, Recipe } from './types';

const now = '2026-05-20T00:00:00.000Z';

const remoteHelpSessionPrecheckText = `## 지원 전 신뢰와 범위
- 요청자와 작업 범위 확인하기 D-Day
- 화면 공유만으로 충분한지 먼저 선택하기 D-Day

## 세션 시작 전 권한
- 일회성 원격 제어가 필요한지 확인하기 D-Day
- 접속값은 FlowMe에 저장하지 않기 D-Day

## 반복 관리 보류
- 반복 접근은 담당자와 해지일 메모가 있을 때만 보류하기 D-Day

## 지원 직후
- 세션 종료와 남은 권한 정리하기 D-Day`;

const fridgeCleanoutWeeklyPlanText = `## 시작일 냉장고 지도
- 냉장고 지도에서 우선 소진 재료 3개 고르기 D-Day
- 이번 주 메인 재료와 메뉴 후보 묶기 D-Day

## D+1~D+6 재고 소진
- 1~2일차 신선 재료 먼저 쓰기 D+1
- 3~4일차 남은 요리와 재료 변형하기 D+3
- 5~6일차 냉동실과 기본 재료로 이어가기 D+5

## D+7 장보기 전
- 7일차 남은 재료 처리와 장보기 보류 결정하기 D+7`;

const kidsPrintableSquishyCraftText = `## 전날 원문과 재료
- 원문 도안 링크와 사용 조건 저장하기 D-1
- 도안 출력과 코팅 재료 준비하기 D-1
- 보호자가 미리 자를 부분 정하기 D-1

## 놀이 당일
- 아이와 스퀴시 만들기 D-Day
- 완성 사진은 선택 메모로만 남기기 D-Day

## 정리
- 남은 도안과 재료 정리하기 D-Day
- 다음 놀이 후보 메모하기 D-Day`;

const newApartmentPrecheckText = `## 사전점검 전날 준비
- 사전점검 준비물 챙기기 D-1
- 점검 동선과 체크 구역 나누기 D-1

## 사전점검 당일
- 현관과 창호 작동 상태 확인하기 D-Day
- 욕실과 주방 배수 상태 확인하기 D-Day
- 콘센트와 조명 전원 확인하기 D-Day
- 하자 위치와 보수 요청 메모 남기기 D-Day

## 점검 다음 날
- 보수 요청 목록 정리해서 관리사무소에 전달하기 D+1
- 입주 전 재확인 일정 잡기 D+1`;

const japanEsimSetupText = `## D-3 통신 수단 확정
- eSIM 구매 링크와 사용 가능 기기 확인하기 D-3
- QR 코드와 설치 안내 메일 저장하기 D-3

## D-1 출국 전 설치
- eSIM 프로필 미리 설치하기 D-1
- 데이터 로밍은 꺼두고 현지 회선 활성화 순서 메모하기 D-1

## D-Day 도착 후 확인
- 공항 도착 후 현지 회선 켜기 D-Day
- 지도와 메신저 연결 확인하기 D-Day`;

const altPhoneSk7SelfActivationText = `## 개통 전 준비
- 셀프개통 가능 시간과 준비물 확인하기 D-Day
- 가입유형과 요금제 선택하기 D-Day

## 개통 중
- 유심 일련번호와 신청 정보 입력하기 D-Day
- 번호이동 사전동의 처리하기 D-Day

## 개통 직후
- 유심 교체 후 재부팅하기 D-Day
- 통화·문자·데이터 연결 확인하기 D-Day`;

const infantHealthCheckupPrepText = `## D-14 검진 기간 확인
- 검진 가능 기간과 기관 후보 확인하기 D-14

## D-10 예약
- 검진기관 예약하기 D-10

## D-3 문진표 준비
- 웹 문진표와 발달선별검사지 작성 확인하기 D-3
- 등록번호 4자리 저장 위치 정하기 D-3

## D-1 방문 준비
- 방문 준비물과 질문 메모 정리하기 D-1

## D-Day 방문
- 예약 시간에 검진기관 방문하기 D-Day`;

const chiangmaiSoloTripPackingText = `## D-7 통신과 결제
- 메인폰과 비상폰 통신 수단 정하기 D-7
- 현금·GLN·카드 결제 수단 확인하기 D-7

## D-5 보험과 비상 메모
- 여행자보험 가입 여부 확인하기 D-5
- 비상약과 현지 연락 메모 준비하기 D-5

## D-1 짐 체크
- 압축팩과 의류 짐 줄이기 D-1
- 필터 샤워기와 숙소 생활용품 챙기기 D-1`;

const leaseContractReportDeadlineText = `## 계약 직후
- 신고 대상과 30일 마감 확인하기 D-Day

## D+7 전 준비
- 계약서와 인증수단 준비하기 D+7
- 방문 또는 온라인 신고 방식 정하기 D+7

## D+20 전 작성
- 부동산거래관리시스템 신고서 작성하기 D+20

## D+30 전 마무리
- 전자서명과 접수 상태 확인하기 D+30
- 신고필증과 확정일자 표시 확인하기 D+30`;

const jeonseContractPrecheckDocsText = `## 계약 3일 전
- 시세와 등기부등본 권리관계 확인하기 D-3
- 전세보증보험 가능 여부 확인하기 D-3

## 계약 당일
- 중개사와 표준계약서 확인하기 D-Day
- 계약서 정보 일치 여부 확인하기 D-Day

## 입주 직후
- 확정일자와 임대차신고 일정 저장하기 D+1
- 전세보증보험 가입 확인하기 D+1

## 이상 항목 발견 시
- 보류 사유와 문의 대상 메모하기 D-Day`;

const pictureBookReadingRoutineText = `## 읽기 전
- 오늘 읽을 그림책과 질문 카드 고르기 D-Day
- 표지 보고 이야기 나누기 D-Day

## 독서 시간
- 그림책 함께 읽기 D-Day
- 아이가 고른 장면 짚어보기 D-Day

## 읽은 후
- 기억나는 장면이나 단어 묻기 D-Day
- 다음에 읽을 책 후보 남기기 D-Day`;

const elementarySchoolEntryD30Text = `## D-30 공식 안내
- 취학통지와 예비소집 안내 확인하기 D-30

## D-21 먼저 살 물건
- 먼저 살 물건만 정하기 D-21

## D-14 학교 안내 전 보류
- 학교 안내 전 보류할 물건 표시하기 D-14

## D-7 이름 표시
- 네임스티커와 이름 표시하기 D-7

## D-1 입학식 전날
- 등교 동선과 입학식 가방 점검하기 D-1`;

const kidsDinoFootprintArtText = `## 놀이 전 준비
- 공룡 놀이 준비물 꺼내기 D-1

## 주말 놀이
- 공룡 발자국 찍기 D-Day
- 아이 말 메모하며 이야기 만들기 D-Day

## 놀이 후
- 작품 말리고 다음 놀이 고르기 D-Day`;

const bananaPeanutRecipeVideoText = `## 요리 전
- 바나나·땅콩버터와 내열 용기 확인하기 D-Day

## 조리
- 용기에 재료 넣고 섞기 D-Day
- 원본 영상 기준으로 에어프라이어에 굽기 D-Day

## 조리 후
- 식힘 후 맛과 변형 메모 남기기 D-Day`;

const dogAdoptionFirstWeekText = `## 입양 전 준비
- 사료와 물그릇, 배변패드 준비하기 D-1
- 집 안 위험 물건 치우고 안정 공간 만들기 D-1

## 입양 첫날
- 이동 후 휴식 공간에 적응시키기 D-Day
- 기존 접종 기록과 입양 서류 확인하기 D-Day

## 첫 주 체크
- 첫 건강검진 예약하기 D+3
- 동물등록 여부 확인하기 D+7
- 산책과 목욕 시작 시점 메모하기 D+7`;

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

const sourceReviewMeta: Record<
  string,
  Pick<Flow, 'source_status' | 'source_precision' | 'source_checked_at' | 'conversion_note' | 'primary_destination'>
> = {
  'job-change-risk-check': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '퇴사/이직 의사결정 체크리스트를 원문 적합성 확인 전 검토 대기 Flow로 정규화했습니다.',
    primary_destination: 'memo',
  },
  'year-end-tax-docs': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '국세청 연말정산 간소화 공식 안내 기반 Flow입니다. 회사 제출 기준과 개인별 공제 판단을 분리해 정리했습니다.',
    primary_destination: 'sheet',
  },
  'passport-renewal-docs': {
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-11',
    conversion_note: '외교부 여권 재발급 안내의 대상, 신청 경로, 사진과 구비서류를 다시 확인해 준비 순서로 옮겼습니다.',
    primary_destination: 'memo',
  },
  'national-health-checkup-d7': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '건강검진 공식 안내 기반 Flow입니다. 민감 영역이라 공개 전 수동 검토가 필요합니다.',
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
    conversion_note: '안전운전 통합민원 안내 기반 Flow입니다. 면허 조건별 분기 확인이 필요합니다.',
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
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    conversion_note:
      '정부24 구형 민원 페이지의 등록인식표 문구가 현재 국가동물보호정보시스템 안내와 맞지 않아 신규 공개 실행을 중단하고 최신 공식 안내 기반 Flow로 연결합니다.',
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
    conversion_note: '가족관계등록부 증명서 안내 기반 Flow입니다. 제출처별 요구사항 확인이 필요합니다.',
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
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-11',
    conversion_note: '신차 검수 체크리스트 기반 Flow입니다. 인수 전 사진/하자 기록 산출물 중심으로 구성했습니다.',
    primary_destination: 'sheet',
  },
  'diet-habit-2week': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 중 수면 원칙 하나만 14일 체크로 좁힌 Flow입니다. 포괄 식단/활동 관찰표로 대표하지 않습니다.',
    primary_destination: 'calendar',
  },
  'samsung-aircon-seasonal-check': {
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    conversion_note: '2026 삼성전자서비스 사전점검 안내의 전원, 리모컨, 실외기 통풍, 필터, 냉방 시험 가동 순서를 옮겼습니다.',
    primary_destination: 'internal_check',
  },
  'samsung-washer-filter-cleaning': {
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    conversion_note: '삼성전자서비스의 필터 LED 확인, 전원 차단, 물세척 금지, 재조립과 리셋 순서를 옮겼습니다.',
    primary_destination: 'internal_check',
  },
  'vehicle-inspection-prep': {
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    conversion_note: 'TS 정기검사 대상·기준·유효기간 안내 기반 Flow입니다. 검사기간과 예약 정보, 차량 사전점검, 결과표와 후속 정비 메모를 분리했습니다.',
    primary_destination: 'hybrid',
  },
  'qnet-exam-application-prep': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: 'Q-Net 원서접수 안내 기반 Flow입니다. 일정/서류/결제 증빙 산출물 확인이 필요합니다.',
    primary_destination: 'hybrid',
  },
  'computer-skills-d30-study': {
    source_status: 'real',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    conversion_note: '2026 시나공 컴활 1급 필기+실기 교재와 대한상공회의소 2024~2026 시험 기준을 확인한 Flow입니다. 시험일 역산 학습표와 오답 기록 산출물 중심으로 구성했습니다.',
    primary_destination: 'hybrid',
  },
  'diet-meal-exercise-log': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 기반 Flow입니다. 식사/운동/컨디션 기록의 안전 경계를 정리했습니다.',
    primary_destination: 'sheet',
  },
  'diet-reset-2week': {
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-05-23',
    conversion_note: '질병관리청 건강 체중감량 안내 기반 Flow입니다. 무리한 제한 방지와 유지 가능한 규칙 산출물 중심으로 구성했습니다.',
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
- 면허 종류와 갱신/적성검사 대상 여부 정리하기
- 만료일과 건강검진 자료 활용 가능 여부 확인하기
- 사진 규격, 신분증, 수수료 준비 상태 확인하기

## 신청 진행
- 온라인 신청 또는 시험장/경찰서 방문 경로 선택하기
- 수령 방법과 방문 예약 필요 여부 기록하기
- 갱신 완료 후 면허증 정보와 보관 위치 확인하기`;

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
- 제출처가 요구한 증명서 종류와 발급 기한 적기
- 일반/상세/특정 증명서 중 필요한 범위 선택하기
- 주민등록번호 공개 범위와 대상자 기준 확인하기

## 발급 진행
- 전자가족관계등록시스템 또는 정부24 경로 확인하기
- 본인 인증 후 선택한 범위로 증명서 발급하기
- 제출 전 이름, 관계, 공개 범위, 파일 위치 확인하기`;

const residentRegisterText = `## 발급 전 확인
- 제출처가 요구한 등본/초본 조건 적기
- 주소 변동, 병역, 세대원 표시 여부 선택하기
- 주민등록번호 공개 범위와 개인정보 표시 항목 확인하기

## 발급 진행
- 정부24 또는 무인민원발급기 경로 확인하기
- 발급 수수료와 출력/PDF 저장 환경 확인하기
- 제출 전 표시 항목, 발급일, 파일 위치 확인하기`;

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
- 카히스토리 등 사고·보험 이력과 자동차등록원부·성능점검기록부 확인 기준 정하기

## 방문 전 준비
- 낮 시간 방문 일정 잡기
- 확인할 차량 사진과 매물 정보를 저장하기
- 손전등, 휴대폰 충전, 체크 메모 준비하기

## 현장 확인
- 외판 단차와 도장 흔적, 침수 흔적 확인하기
- 타이어 마모와 제조 연월 확인하기
- 엔진룸 누유, 냉각수, 벨트 상태 확인하기
- 시동, 변속, 제동, 핸들 떨림 확인하기
- 정비소 또는 전문가 점검 결과와 예상 수리비 확인하기

## 계약 전 확인
- 자동차등록원부와 압류·저당 여부 확인하기
- 명의이전 비용과 보험 가입 시점 확인하기
- 계약서에 결함·보증·반품 조건이 적혀 있는지 확인하기
- 최종 구매/보류/거절 결정 메모하기`;

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

const weddingD180Text = `## D-300~D-180 웨딩홀·예산·하객 규모 큰 기준
- 예식 날짜와 예상 하객 규모 정하기 D-300
- 웨딩홀 후보와 예산 범위 비교하기 D-270
- 양가 주요 일정과 우선순위 맞추기 D-240

## D-120 주요 업체 예약
- 스튜디오, 드레스, 메이크업 후보 비교하기 D-120
- 본식 스냅과 영상 필요 여부 정하기 D-120
- 신혼여행 예산과 일정 후보 정리하기 D-120

## D-60 초대와 하객 명단
- 청첩장 인쇄·배송 완료일과 발송 명단 정리하기 D-60

## D-30 본식 진행과 준비물
- 식순·사회자 대본·BGM 파일 확인하기 D-30
- 식권·주차권·답례품 수량과 전달 담당자 정하기 D-30

## D-14 최종 확인
- 최종 하객 수와 식대 기준 확인하기 D-14
- 업체 스케줄·차량·촬영 동선 재확인하기 D-7
- 당일 시간표·잔금·역할 분담 공유하기 D-1`;

const weddingChecklistLink = {
  label: '결혼식 준비 체크리스트',
  url: 'https://www.ohprint.me/blog/wedding-checklist',
  type: 'reference' as const,
};

const weddingD180Details: Parameters<typeof withItemDetails>[1] = {
  '예식 날짜와 예상 하객 규모 정하기': {
    description: '예식 후보일과 하객 규모 구간을 정해 웨딩홀 탐색 기준을 만듭니다.',
    why: '원문은 D-300~D-180 구간을 결혼 준비 밑그림으로 보고, 예식일과 하객 규모를 먼저 잡아 웨딩홀·식대·청첩장 수량을 좁히도록 안내합니다.',
    how: '양가와 가능한 주말 후보 1~3개를 추리고, 친척·지인·회사 동료 명단을 100명 단위로 합산해 150명 이하, 150~250명, 250명 이상 중 어디에 가까운지 정합니다.',
    completion_criteria: '예식일 후보 1~3개와 예상 하객 규모 구간을 기록했다.',
    caution: '양가 일정 충돌이 생기기 쉬우므로 후보일은 하나만 두지 않습니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '웨딩홀 후보와 예산 범위 비교하기': {
    description: '위치, 보증인원, 식대, 대관료, 계약금/위약금, 포함 항목을 한 표에서 비교합니다.',
    why: '원문은 인기 베뉴는 1년 전부터 예약 경쟁이 생길 수 있다고 보고, 보증인원·대관료·식대·주차를 초기에 비교하도록 안내합니다.',
    how: '후보 3~5곳의 위치, 가능한 날짜, 보증인원, 1인 식대, 대관료, 계약금/위약금, 꽃장식·음향 포함 여부를 같은 기준으로 적습니다.',
    completion_criteria: '후보 3곳 이상을 같은 기준으로 비교했고 계약금/위약금 조건과 우선 방문할 곳을 정했다.',
    caution: '계약금 환불 조건과 보증인원 변경 가능 시점을 함께 확인합니다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '양가 주요 일정과 우선순위 맞추기': {
    description: '상견례, 예단·예물, 혼주 준비처럼 양가 협의가 필요한 항목을 먼저 정렬합니다.',
    why: '원문은 상견례와 양가 일정 조율을 큰 준비 흐름 안에 두므로, 예약 전에 반드시 맞춰야 할 항목과 보류할 항목을 나눠야 합니다.',
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
  '청첩장 인쇄·배송 완료일과 발송 명단 정리하기': {
    description: '종이/모바일 청첩장 문구, 인쇄 완료일, 배송 완료일, 발송 대상을 정리합니다.',
    why: '원문은 D-90~D-60 구간에서 청첩장 디자인 확정, 인쇄, 배송, 하객 전달을 따로 챙기도록 안내합니다.',
    how: '양가 명단과 본인 지인 명단을 나누고, 주소가 필요한 대상과 모바일 발송 대상을 분리한 뒤 인쇄 완료일과 배송 완료일을 캘린더 메모에 남깁니다.',
    completion_criteria: '청첩장 문구, 인쇄·배송 완료일, 발송 명단, 검토 담당자를 정했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'financial_sensitive',
  },
  '식순·사회자 대본·BGM 파일 확인하기': {
    description: '예식순서, 사회자 대본, 성혼선언문, 혼인서약서, 축사, 식전·식중 BGM 파일을 확인합니다.',
    why: '원문은 D-30 구간에서 식순, 선언문, 서약서, 축사, BGM, 사회자 대본을 최종 점검 항목으로 둡니다.',
    how: '식순 초안, 사회자 대본, 축가 위치, BGM 파일명, 촬영 요청 컷을 한 문서로 정리하고 사회자와 업체 담당자에게 공유합니다.',
    completion_criteria: '본식 진행 파일과 대본을 한 곳에 모았고 사회자·업체 담당자에게 공유했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'low',
  },
  '식권·주차권·답례품 수량과 전달 담당자 정하기': {
    description: '식권, 주차권, 답례품 수량과 당일 전달 담당자를 정합니다.',
    why: '원문은 D-30 구간에서 식권, 주차권, 식전 영상과 같은 당일 전달물을 최종 점검하라고 안내합니다.',
    how: '하객 수 기준으로 식권·주차권·답례품 예상 수량을 적고, 보관 위치와 당일 전달 담당자를 함께 정합니다.',
    completion_criteria: '식권·주차권·답례품 수량과 보관 위치, 전달 담당자를 기록했다.',
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
  '업체 스케줄·차량·촬영 동선 재확인하기': {
    description: '모든 업체와 스케줄을 재확인하고 차량, 촬영, 스타일리스트 동선을 공유합니다.',
    why: '원문은 D-15~D-7 구간에서 업체 스케줄 재확인과 차량·촬영·스타일리스트 동선 공유를 강조합니다.',
    how: '메이크업 시작, 차량 출발, 리허설, 본식, 사진 촬영, 정산 시간을 순서대로 적고 업체 담당자 연락처를 붙입니다.',
    completion_criteria: '업체별 스케줄과 차량·촬영 동선을 주요 담당자에게 공유했다.',
    links: [weddingChecklistLink],
    source_type: 'creator_experience',
    risk_level: 'low',
  },
  '당일 시간표·잔금·역할 분담 공유하기': {
    description: '당일 시간표, 잔금, 식권·답례품 전달, 혼주 헬프 역할 분담을 공유합니다.',
    why: '원문은 D-Day에 도착 시간, 식권, 답례품, 혼주 헬프 등 역할 분담이 필요하다고 안내합니다.',
    how: '업체별 잔금 금액과 결제 수단, 당일 가져갈 물건, 식권·답례품 담당자, 혼주 헬프 담당자를 한 장에 적어 공유합니다.',
    completion_criteria: '당일 시간표, 잔금, 전달물, 역할 분담표를 양가와 주요 담당자에게 공유했다.',
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

const plankChallengeSourceUrl =
  'https://khj2510.tistory.com/entry/%ED%94%8C%EB%9E%AD%ED%81%AC-30%EC%9D%BC-%EC%B1%8C%EB%A6%B0%EC%A7%80-%EA%B3%84%ED%9A%8D%ED%91%9C-%EA%B3%B5%EC%9C%A0';

const plankChallengeDays = [
  { day: 1, seconds: 20, point: '기본 플랭크 자세 숙지' },
  { day: 2, seconds: 25, point: '팔꿈치 바로 아래 어깨' },
  { day: 3, seconds: 30, point: '목-등 일직선 확인' },
  { day: 4, seconds: 35, point: '발뒤꿈치 밀어내기' },
  { day: 5, seconds: 40, point: '배꼽 당겨 척추 중립' },
  { day: 6, seconds: 45, point: '무릎 굽힘 주의' },
  { day: 7, rest: true, point: '종아리·요추 스트레칭' },
  { day: 8, seconds: 50, point: '복압 유지 연습' },
  { day: 9, seconds: 55, point: '호흡 3:3 패턴' },
  { day: 10, seconds: 60, point: '셀프 영상 확인' },
  { day: 11, seconds: 65, point: '사이드 플랭크 15초' },
  { day: 12, seconds: 70, point: '엉덩이 흔들림 줄이기' },
  { day: 13, seconds: 75, point: '복사근 의식' },
  { day: 14, seconds: 80, point: '손바닥 플랭크 20초' },
  { day: 15, seconds: 85, point: '변형 없이 버티기' },
  { day: 16, seconds: 90, point: '호흡 리듬 유지' },
  { day: 17, seconds: 95, point: '둔근·허벅지 조임' },
  { day: 18, seconds: 100, point: '복식호흡 병행' },
  { day: 19, rest: true, point: '회복·스트레칭' },
  { day: 20, seconds: 105, point: '타이머 대신 음악' },
  { day: 21, seconds: 110, point: '변형 없이 유지' },
  { day: 22, seconds: 115, point: '시선 30cm 앞' },
  { day: 23, seconds: 120, point: '코어·둔근 재확인' },
  { day: 24, seconds: 125, point: '노팔 V-hold 20초' },
  { day: 25, seconds: 130, point: '팔 교차 지지' },
  { day: 26, seconds: 135, point: '발끝-머리 정렬' },
  { day: 27, rest: true, point: '폼롤러 회복' },
  { day: 28, seconds: 140, point: '호흡 흔들림 줄이기' },
  { day: 29, seconds: 145, point: '마지막 호흡 조절' },
  { day: 30, seconds: 150, point: '챌린지 완주' },
] as const;

const plankChallengeBundle: FlowBundle = {
  flow: {
    id: 'flow-plank-30-day-challenge',
    slug: 'plank-30-day-challenge',
    title: '30일 플랭크 챌린지 Flow',
    description: '시작일을 넣으면 원문 계획표의 Day별 목표 초수와 휴식일이 30일 캘린더에 배치됩니다.',
    category: '운동/챌린지',
    structure_type: 'timeline',
    content_type: 'default',
    anchor_type: 'start_date',
    status: 'published',
    risk_level: 'medium',
    source_title: '플랭크 30일 챌린지 계획표 공유',
    source_url: plankChallengeSourceUrl,
    source_status: 'needs_review',
    source_precision: 'exact',
    source_checked_at: '2026-06-07',
    conversion_note:
      '원문 표의 Day별 목표 초수, 체크 포인트, Day 7·19·27 휴식일만 실행 캘린더로 옮겼습니다. 효과 설명은 보장으로 쓰지 않고 메모/주의로 낮춥니다.',
    primary_destination: 'calendar',
    warning:
      '이 Flow는 운동 효과를 보장하지 않습니다. 통증, 어지러움, 호흡 곤란, 기존 질환 악화가 있으면 중단하고 전문가 상담을 우선하세요.',
    ...creatorMeta('생활 루틴 코치', '운동 챌린지 큐레이터', 'Day별 표가 있는 블로그 콘텐츠가 FlowMe 캘린더 실행물로 충분히 바뀌는지 확인하는 후보입니다.', 980, 144),
    ...tagMeta(['운동·습관', '30일 챌린지', '캘린더', 'P0 검증']),
    created_at: now,
    updated_at: now,
  },
  sections: [
    {
      id: 'plank-30-day-section',
      flow_id: 'flow-plank-30-day-challenge',
      title: '원문 30일 계획표',
      description: '원문 Day별 시간표를 시작일 기준 캘린더로 옮긴 실행 목록입니다.',
      order: 0,
    },
  ],
  items: plankChallengeDays.map((entry, index) => {
    const hasSeconds = 'seconds' in entry;
    const title = hasSeconds ? `Day ${entry.day} 플랭크 ${entry.seconds}초` : `Day ${entry.day} 휴식·스트레칭`;
    return {
      id: `plank-day-${entry.day}`,
      flow_id: 'flow-plank-30-day-challenge',
      section_id: 'plank-30-day-section',
      title,
      description: hasSeconds ? `원문 목표: ${entry.seconds}초 · 체크 포인트: ${entry.point}` : `원문 휴식일: ${entry.point}`,
      type: 'todo' as const,
      day_offset: entry.day - 1,
      order: index,
      source_type: 'creator_experience' as const,
      risk_level: 'medium' as const,
    };
  }),
  itemDetails: plankChallengeDays.map((entry) => {
    const hasSeconds = 'seconds' in entry;
    return {
      item_id: `plank-day-${entry.day}`,
      why: hasSeconds
        ? `원문 계획표의 Day ${entry.day} 목표는 ${entry.seconds}초이며, 오늘은 "${entry.point}"를 함께 확인합니다.`
        : '원문 계획표에서 휴식일로 분리된 날입니다. 플랭크를 억지로 완료 처리하지 않고 회복 상태를 확인합니다.',
      how: hasSeconds
        ? `준비: 타이머를 ${entry.seconds}초로 맞춥니다. 실행: 원문 체크포인트 "${entry.point}"를 보며 가능한 범위에서 버팁니다. 마무리: 목표 초수를 채웠는지 또는 조정했는지를 메모합니다.`
        : `실행: 플랭크 목표 초수 대신 원문 휴식일 체크포인트인 "${entry.point}"를 기준으로 가벼운 스트레칭이나 회복 메모만 남깁니다.`,
      completion_criteria: hasSeconds
        ? `${entry.seconds}초 목표를 완료했거나, 무리하지 않도록 낮춘 목표와 이유를 메모했습니다.`
        : '오늘은 휴식일로 표시하고 스트레칭 또는 회복 메모를 남겼습니다.',
      caution:
        '허리 통증, 어지러움, 호흡 곤란이 있으면 즉시 중단합니다. 원문은 개인 블로그 계획표이므로 몸 상태와 전문가 조언을 우선합니다.',
      links: [{ label: '원문 계획표', url: plankChallengeSourceUrl, type: 'reference' as const }],
    };
  }),
  repeatRules: [],
  warnings: [],
};

const dietHabitText = `@매일 체크
@14일

## 14일 수면 체크
- 14일 동안 8시간 이상 자기 체크하기`;

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
      '시작일을 입력하면 초기 이유식 메뉴, 새 재료, 레시피를 날짜별로 확인할 수 있습니다.',
    category: '육아/이유식',
    structure_type: 'phase',
    content_type: 'meal_plan',
    anchor_type: 'start_date',
    status: 'published',
    risk_level: 'medical_sensitive',
    source_title: '초기이유식 식단표 공유 (개인 경험)',
    source_url: 'https://kimstar1021.tistory.com/63',
    source_status: 'real',
    source_precision: 'exact',
    source_published_at: '2023-07-06',
    source_modified_at: '2023-08-31',
    source_checked_at: '2026-07-12',
    conversion_note:
      '원문은 한 보호자의 2023년 식단표와 조리 경험입니다. 고정 3일 간격과 재료 순서를 모든 아이에게 적용할 수 없어 신규 공개 실행은 보류하며, 원문 행과 기존 저장 기록은 검토용으로 보존합니다.',
    primary_destination: 'calendar',
    warning: babyWarning,
    ...creatorMeta('초기 이유식 기록맘', '육아 경험 크리에이터', '초기 이유식 시작일 기준 메뉴와 레시피를 정리했습니다.', 982, 214),
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
      id: 'meal-cauliflower-12',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-cauliflower',
      day_offset: 12,
      duration_days: 3,
      menu_title: '콜리플라워미음',
      new_ingredients: ['콜리플라워'],
      allergy_watch_days: 3,
      order: 4,
    },
    {
      id: 'meal-broccoli-15',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-broccoli',
      day_offset: 15,
      duration_days: 3,
      menu_title: '브로콜리미음',
      new_ingredients: ['브로콜리'],
      allergy_watch_days: 3,
      order: 5,
    },
    {
      id: 'meal-potato-18',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-potato',
      day_offset: 18,
      duration_days: 3,
      menu_title: '감자미음',
      new_ingredients: ['감자'],
      allergy_watch_days: 3,
      order: 6,
    },
    {
      id: 'meal-sweet-potato-21',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-sweet-potato',
      day_offset: 21,
      duration_days: 3,
      menu_title: '고구마미음',
      new_ingredients: ['고구마'],
      allergy_watch_days: 3,
      order: 7,
    },
    {
      id: 'meal-squash-24',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-1',
      recipe_id: 'recipe-squash',
      day_offset: 24,
      duration_days: 3,
      menu_title: '단호박미음',
      new_ingredients: ['단호박'],
      allergy_watch_days: 3,
      order: 8,
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
      order: 9,
    },
    {
      id: 'meal-beef-broccoli-33',
      flow_id: 'flow-baby-food',
      section_id: 'baby-phase-2',
      recipe_id: 'recipe-beef-broccoli',
      day_offset: 33,
      duration_days: 3,
      menu_title: '쌀·오트밀 소고기 브로콜리미음',
      new_ingredients: ['오트밀', '브로콜리'],
      allergy_watch_days: 3,
      order: 10,
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
      'recipe-cauliflower',
      '콜리플라워미음',
      ['콜리플라워 꽃 부분', '쌀미음 베이스'],
      [
        '줄기보다 부드러운 꽃 부분 위주로 손질한다.',
        '충분히 씻고 익힌다.',
        '쌀미음 베이스와 함께 곱게 간다.',
        '거친 입자가 남으면 체에 한 번 더 거른다.',
      ],
      {
        texture_note: '원문처럼 줄기 부분은 빼고 부드러운 부분만 사용한다.',
        storage_note: '남은 채소 큐브는 만든 날짜를 적어 보관한다.',
        caution_note: '새 채소는 3일 단위로 반응을 보며, 이상 반응이 있으면 중단 후 확인한다.',
      },
    ),
    recipe(
      'recipe-broccoli',
      '브로콜리미음',
      ['브로콜리 꽃 부분', '쌀미음 베이스'],
      [
        '꽃봉오리를 깨끗이 씻는다.',
        '충분히 익힌 뒤 부드러운 부분만 사용한다.',
        '쌀미음 베이스와 함께 곱게 간다.',
        '필요하면 체에 걸러 입자를 낮춘다.',
      ],
      {
        texture_note: '원문은 콜리플라워와 브로콜리 모두 줄기보다 꽃 부분 사용을 권합니다.',
        storage_note: '큐브로 얼릴 경우 재료명과 만든 날짜를 적는다.',
        caution_note: '새 재료 반응은 보호자가 관찰하고, 이상 반응이 의심되면 전문가 확인을 우선한다.',
      },
    ),
    recipe(
      'recipe-potato',
      '감자미음',
      ['감자', '쌀미음 베이스', '물'],
      [
        '감자를 충분히 익힌다.',
        '쌀미음 베이스와 함께 곱게 간다.',
        '되직하면 물을 조금씩 추가한다.',
        '아이에게 맞는 농도인지 먹이기 전에 확인한다.',
      ],
      {
        texture_note: '원문은 감자처럼 수분이 적은 재료는 물을 조금 더 넣어 농도를 조절한다고 설명합니다.',
        storage_note: '완성분은 소분하고 먹인 날짜를 남긴다.',
        caution_note: '농도와 입자감은 아이 상태에 맞춰 보호자가 조절한다.',
      },
    ),
    recipe(
      'recipe-sweet-potato',
      '고구마미음',
      ['고구마', '쌀미음 베이스', '물'],
      [
        '고구마를 충분히 익힌다.',
        '쌀미음 베이스와 함께 곱게 간다.',
        '되직하면 물을 추가해 농도를 맞춘다.',
        '덩어리가 남지 않았는지 확인한다.',
      ],
      {
        texture_note: '감자와 마찬가지로 수분이 적어 물 양을 조절하는 재료입니다.',
        storage_note: '남은 완성분은 보관 기준과 폐기 기준을 따로 메모한다.',
        caution_note: '단맛이 강한 재료도 섭취량과 반응을 함께 확인한다.',
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
    recipe(
      'recipe-beef-broccoli',
      '쌀·오트밀 소고기 브로콜리미음',
      ['쌀 또는 쌀가루', '오트밀', '소고기', '브로콜리', '소고기 육수 또는 물'],
      [
        '소고기를 충분히 익히고 육수를 준비한다.',
        '쌀과 오트밀을 익힌다.',
        '익힌 브로콜리와 소고기를 함께 곱게 간다.',
        '농도와 입자감을 확인한 뒤 먹인다.',
      ],
      {
        texture_note: '원문은 2단계에서 쌀과 오트밀을 섞고 농도를 조금씩 올리는 흐름을 설명합니다.',
        storage_note: '육류가 들어간 식단은 만든 날짜와 보관 위치를 더 명확히 적는다.',
        caution_note: '육류, 곡물, 새 채소가 겹치는 식단은 아이 상태와 전문가/공식 정보를 우선 확인한다.',
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
        source_title: '외교부 여권안내 – 유효기간 만료에 따른 재발급',
        source_url: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
        source_checked_at: '2026-07-11',
        conversion_note: '외교부 여권안내의 현재 재발급 대상, 방문·온라인 신청 구분, 6개월 이내 사진, 구비서류와 수령 경로를 재확인했습니다.',
        warning: '여권 발급 가능 대상, 사진 규격, 수수료, 수령 방식은 최신 공식 안내를 확인하세요.',
      },
      passportRenewalText,
    ),
    {
      label: '외교부 여권 재발급 안내',
      url: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
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
        source_url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04500m01.do',
        source_checked_at: '2026-07-11',
        warning: '검진 전 금식, 약 복용, 수면내시경 주의사항은 검진기관과 의료진 안내를 우선 확인하세요.',
      },
      healthCheckupText,
    ),
    {
      label: '국민건강보험 건강검진 안내',
      url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04500m01.do',
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

const washerTubCleanMonthlyText = `@매월 1회

## 월간 통세척
- 통세척 코스 돌리고 문 열어 건조하기
- 고무패킹 물기와 먼지 닦기
- 세제통과 배수필터 확인하기`;

const washerTubCleanLink = {
  label: '세탁기 통세척 방법 완벽 가이드',
  url: 'https://raga-t.com/entry/%EC%84%B8%ED%83%81%EA%B8%B0-%ED%86%B5%EC%84%B8%EC%B2%99-%EB%B0%A9%EB%B2%95-%EC%99%84%EB%B2%BD-%EA%B0%80%EC%9D%B4%EB%93%9C',
  type: 'reference' as const,
};

const washerTubCleanMonthlyDetails: Parameters<typeof withItemDetails>[1] = {
  '통세척 코스 돌리고 문 열어 건조하기': {
    description: '월 1회 통세척 코스를 실행하고 세탁조 안쪽 습기를 빼는 루틴입니다.',
    why: '세탁조 안쪽 습기와 잔여 세제는 냄새와 오염감의 반복 원인이 되므로, 세척보다 건조까지 끝내야 루틴이 완성됩니다.',
    how: '세탁물 없이 내 모델 설명서의 통세척/통살균 코스를 실행한 뒤 문을 열어 내부 물기를 말립니다. 세제나 클리너는 설명서에서 허용한 종류와 양만 사용합니다.',
    completion_criteria: '통세척 코스가 끝났고 세탁기 문을 열어 내부 건조 상태로 두었습니다.',
    caution: '세제 사용량, 고온 코스 가능 여부, 무세제 통세척 지원 여부는 세탁기 모델 설명서를 우선합니다.',
    links: [washerTubCleanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '고무패킹 물기와 먼지 닦기': {
    description: '문 주변 고무패킹 안쪽의 물기, 먼지, 머리카락을 닦는 항목입니다.',
    why: '고무패킹 안쪽은 물기가 남기 쉬워 세탁 직후 확인하지 않으면 냄새가 다시 생기기 쉽습니다.',
    how: '마른 천으로 고무패킹 안쪽 홈을 벌려 닦고, 이물질이나 끈적임이 보이면 한 번 더 닦습니다.',
    completion_criteria: '고무패킹 안쪽 물기와 눈에 보이는 먼지를 닦았습니다.',
    links: [washerTubCleanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '세제통과 배수필터 확인하기': {
    description: '세제통 분리 세척과 배수필터 이물 확인을 같은 월간 루틴으로 묶습니다.',
    why: '세제통과 배수필터는 사용자가 잊기 쉬운 관리 지점이라 통세척일에 같이 처리해야 반복 관리가 쉽습니다.',
    how: '세제통을 분리해 헹구고 말립니다. 배수필터는 물받이를 준비한 뒤 모델 설명서 순서에 따라 이물질을 확인하고, 다음 확인 시점도 설명서나 제품 알림에 맞춥니다.',
    completion_criteria: '세제통을 원위치했고 배수필터 이물 확인을 마쳤습니다.',
    caution: '배수필터 분리 전에는 물이 흐를 수 있으니 수건이나 물받이를 준비합니다.',
    links: [washerTubCleanLink],
    source_type: 'reference',
    risk_level: 'low',
  },
};

const monsteraCareRoutineText = `@7~10일마다 확인

## 몬스테라 상태 확인
- 겉흙 2~3cm 마름 확인 후 물주기
- 밝은 간접광과 배수구멍 상태 보기
- 잎 색과 새잎 상태 메모하기

## 1~2년 점검
- 분갈이 필요 여부 확인하기`;

const monsteraCareLink = {
  label: '몬스테라 관리 가이드 참고',
  url: 'https://jhbd2.tistory.com/178',
  type: 'reference' as const,
};

const monsteraCareRoutineDetails: Parameters<typeof withItemDetails>[1] = {
  '겉흙 2~3cm 마름 확인 후 물주기': {
    description: '날짜만 보고 물을 주지 않고 겉흙과 화분 무게를 확인한 뒤 결정하는 루틴입니다.',
    why: '몬스테라는 실내 환경에 따라 마르는 속도가 달라서 고정 주기보다 겉흙 상태 확인이 더 실행에 가깝습니다.',
    how: '손가락이나 막대로 겉흙 2~3cm가 말랐는지 확인하고, 아직 축축하면 이번 물주기는 보류로 체크합니다.',
    completion_criteria: '물주기 또는 보류를 결정했고 다음 확인일을 유지했습니다.',
    caution: '잎 처짐이나 과습 의심이 반복되면 물주기보다 위치와 배수 상태를 먼저 확인합니다.',
    links: [monsteraCareLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '밝은 간접광과 배수구멍 상태 보기': {
    description: '햇빛 위치와 화분 배수 상태를 함께 보는 환경 점검 항목입니다.',
    why: '물주기만 체크하면 빛 부족이나 배수 문제를 놓치기 쉬워 잎 상태가 계속 나빠질 수 있습니다.',
    how: '직사광이 강하지 않은 밝은 간접광 위치인지 보고, 화분 아래 배수구멍이 막히지 않았는지 확인합니다.',
    completion_criteria: '빛 위치와 배수구멍 상태를 확인했고 필요하면 위치 조정 메모를 남겼습니다.',
    links: [monsteraCareLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '잎 색과 새잎 상태 메모하기': {
    description: '잎 끝 마름, 갈색 반점, 새잎 성장 여부를 짧게 남기는 관찰 항목입니다.',
    why: '식물 상태 변화는 하루 단위보다 누적 변화가 중요하므로 짧은 메모가 다음 물주기 판단을 돕습니다.',
    how: '잎 끝, 반점, 새잎, 줄기 기울어짐 중 눈에 띄는 변화만 한 줄로 적습니다. 사진은 선택으로 둡니다.',
    completion_criteria: '이상 없음 또는 관찰 메모를 남겼습니다.',
    links: [monsteraCareLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '분갈이 필요 여부 확인하기': {
    description: '뿌리 과밀, 배수, 화분 크기를 1~2년마다 보는 낮은 빈도 점검입니다.',
    why: '분갈이는 매주 할 일이 아니므로 물주기 루틴과 분리해 낮은 빈도의 확인 항목으로 두는 편이 가볍습니다.',
    how: '뿌리가 배수구로 많이 보이는지, 물 빠짐이 느려졌는지, 화분이 너무 작아졌는지 확인합니다.',
    completion_criteria: '분갈이 필요 또는 유지 결정을 메모했습니다.',
    links: [monsteraCareLink],
    source_type: 'reference',
    risk_level: 'low',
  },
};

const waterPurifierFilterCycleText = `## 필터 교체표 만들기
- 정수기 모델과 필터 구성을 적기
- 침전 필터 교체 주기 기록하기
- 프리/카본 필터 교체 주기 기록하기
- RO/나노 필터 교체 주기 기록하기
- 후카본 필터 교체 주기 기록하기
- 코크/출수구 자가 살균과 물맛·냄새 확인하기`;

const waterPurifierFilterLink = {
  label: '정수기 필터 교체 방법과 주기 참고',
  url: 'https://pihamadam.tistory.com/267',
  type: 'reference' as const,
};

const waterPurifierFilterCycleDetails: Parameters<typeof withItemDetails>[1] = {
  '정수기 모델과 필터 구성을 적기': {
    description: '정수기 모델명, 필터 이름, 마지막 교체일을 한 표에 모으는 첫 항목입니다.',
    why: '필터별 교체 주기가 달라서 모델과 필터 구성이 없으면 다음 교체일을 계산하기 어렵습니다.',
    how: '모델명, 필터명, 마지막 교체일, 구매 링크 또는 고객센터 연락처를 메모합니다.',
    completion_criteria: '정수기 모델명과 현재 필터 구성을 표 첫 행에 기록했습니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '침전 필터 교체 주기 기록하기': {
    description: '모래, 녹, 큰 입자를 거르는 1단계 필터의 교체 주기를 표에 기록합니다.',
    why: '침전 필터는 상대적으로 짧은 주기로 관리되는 경우가 많아 다음 알림 기준이 필요합니다.',
    how: '원문과 제품 설명서를 참고해 3~6개월 범위의 모델 기준 주기를 적고, 실제 마지막 교체일을 같이 둡니다.',
    completion_criteria: '침전 필터의 마지막 교체일과 다음 확인 기준을 기록했습니다.',
    caution: '정확한 주기는 제조사와 모델 안내를 우선합니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '프리/카본 필터 교체 주기 기록하기': {
    description: '물맛과 냄새에 영향을 주는 프리/카본 필터의 교체 기준을 기록합니다.',
    why: '물맛·냄새 변화는 사용자가 가장 빨리 체감하는 신호라 교체 기록과 함께 봐야 합니다.',
    how: '6~12개월 기준 주기, 마지막 교체일, 물맛·냄새 메모를 같은 행에 둡니다.',
    completion_criteria: '프리/카본 필터의 다음 교체 기준과 물맛·냄새 확인란을 만들었습니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  'RO/나노 필터 교체 주기 기록하기': {
    description: '장주기 필터의 마지막 교체일과 다음 구매/예약 기준을 기록합니다.',
    why: 'RO/나노 필터는 주기가 길어 기억에 의존하면 교체 시점을 놓치기 쉽습니다.',
    how: '12~24개월 범위의 기준을 모델 설명서와 맞춰 적고, 다음 교체 예정월을 표에 표시합니다.',
    completion_criteria: 'RO/나노 필터의 다음 교체 예정월을 기록했습니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '후카본 필터 교체 주기 기록하기': {
    description: '정수 과정 마지막 단계의 물맛과 냄새 개선 필터를 별도 행으로 기록합니다.',
    why: '원문은 후카본 필터를 프리카본과 분리해 9~12개월 주기로 설명하므로, 한 행으로 묶으면 다음 교체일 판단이 흐려집니다.',
    how: '9~12개월 기준 주기, 마지막 교체일, 물맛·냄새 메모를 같은 행에 둡니다.',
    completion_criteria: '후카본 필터의 다음 교체 예정월과 물맛·냄새 확인란을 만들었습니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
  '코크/출수구 자가 살균과 물맛·냄새 확인하기': {
    description: '필터 교체만이 아니라 코크/출수구 자가 살균과 체감 상태를 확인하는 항목입니다.',
    why: '정수기 관리는 필터 날짜만으로 끝나지 않으므로 자가 살균 여부와 물맛·냄새 변화를 같이 봐야 합니다.',
    how: '자가 살균 기능이 있으면 실행 여부를 체크하고, 물맛·냄새 변화가 있으면 다음 교체일을 앞당길지 메모합니다.',
    completion_criteria: '코크/출수구 확인과 물맛·냄새 상태 메모를 남겼습니다.',
    links: [waterPurifierFilterLink],
    source_type: 'reference',
    risk_level: 'low',
  },
};

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
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
      },
      englishStudyRoutineText,
    ),
    englishStudyRoutineDetails,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-elementary-school-entry-d30',
        slug: 'elementary-school-entry-d30',
        title: '초등학교 입학 D-30 준비 Flow',
        description: '입학식 날짜를 기준으로 취학통지와 예비소집을 확인하고, 먼저 살 물건과 학교 안내 전 보류할 물건, 이름 표시, 등교 동선, 입학식 가방 점검을 나눕니다.',
        category: '학부모/입학준비',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '교육부 2026학년도 초등학교 취학통지 및 예비소집 안내',
        source_url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-08',
        conversion_note: '교육부의 취학통지·예비소집 공식 안내를 기준으로 D-30 행정 확인을 만들고, 학부모 체크리스트의 네임스티커·등교 동선·입학식 전날 점검 단서는 보조 실행 카드로만 사용했습니다. 준비물 구매 추천, 지원금 금액 안내, 예방접종/건강 기록, 학교별 최신 안내 판단은 Flow 밖에 둡니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '입학식 날짜',
        setup_anchor_hint: '입학식 날짜를 넣으면 D-30 취학통지·예비소집 확인부터 D-1 입학식 가방 점검까지 생성됩니다.',
        warning: '학교별 준비물과 입학식 시간은 최신 학교/교육청 안내가 우선입니다. 아동 주민등록번호, 취학통지서 이미지, 건강 정보, 지원금 세부 금액, 교실·담임 화면 캡처는 FLOW에 저장하지 마세요.',
        ...creatorMeta('생활 행정 노트', '가족 행정 체크 큐레이터', '가족 행정 콘텐츠가 쇼핑 목록이나 민감정보 기록으로 커지지 않고 날짜 기준 실행 Flow가 되는지 확인하는 public 후보입니다.', 1280, 166),
        ...tagMeta(['학부모', '초등입학', '취학통지', '예비소집', '다양화 후보']),
      },
      elementarySchoolEntryD30Text,
    ),
    {
      '취학통지와 예비소집 안내 확인하기': {
        description: '정부24 또는 지자체 취학통지, 학교별 예비소집 일정, 학교 홈페이지 공지를 확인합니다.',
        why: '초등 입학 준비의 첫 행동은 준비물 구매가 아니라 공식 취학통지와 학교 예비소집 안내를 확인하는 것입니다.',
        how: '공식 안내와 학교 홈페이지를 열고 취학통지 발급/도착 여부, 예비소집 날짜, 학교 공지 확인 상태만 체크합니다. 주민등록번호나 통지서 이미지는 FLOW에 적지 않습니다.',
        completion_criteria: '취학통지 확인 상태와 예비소집 일정이 정리됐습니다.',
        caution: '학교 배정, 제출 방식, 예비소집 세부 일정은 지역과 학교별 최신 안내를 우선합니다.',
        links: [
          {
            label: '교육부 2026학년도 취학통지·예비소집 안내',
            url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '먼저 살 물건만 정하기': {
        description: '책가방, 실내화, 실내화 주머니, 연필, 지우개처럼 학교가 달라도 먼저 준비해도 되는 물건만 고릅니다.',
        why: '입학 준비가 쇼핑 목록으로 커지지 않으려면 먼저 살 물건과 학교 안내 후 살 물건을 분리해야 합니다.',
        how: '가방과 실내화처럼 공통성이 높은 물건만 먼저 살 목록에 두고, 수량·브랜드·지원금 금액은 FLOW에서 추천하지 않습니다.',
        completion_criteria: '먼저 살 물건 목록이 5개 안팎으로 정리됐습니다.',
        caution: '준비물은 학교 안내문이 우선입니다. 특정 상품이나 지원금 신청 판단은 이 Flow가 대신하지 않습니다.',
        links: [
          {
            label: '학부모 입학 준비 체크리스트 참고',
            url: 'https://hahappa.tistory.com/153',
            type: 'creator',
          },
          {
            label: '교육부 2026학년도 취학통지·예비소집 안내',
            url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W',
            type: 'official',
          },
        ],
        source_type: 'reference',
        risk_level: 'medium',
      },
      '학교 안내 전 보류할 물건 표시하기': {
        description: '공책, 종합장, 미술도구, 색연필/사인펜 종류, 추가 서류처럼 학교별로 달라질 수 있는 항목은 보류로 둡니다.',
        why: '보류 항목이 보여야 학부모가 불필요한 구매를 줄이고 학교 안내를 기다릴 수 있습니다.',
        how: '학교 안내문을 받기 전에는 공책 규격, 미술도구 종류, 추가 서류를 사지 않고 보류로 표시합니다.',
        completion_criteria: '학교 안내 후 확인할 준비물이 보류 목록으로 분리됐습니다.',
        caution: '보류는 누락이 아니라 정상 상태입니다. 학교나 담임 안내가 나온 뒤 구매 여부를 결정합니다.',
        links: [
          {
            label: '학부모 입학 준비 체크리스트 참고',
            url: 'https://hahappa.tistory.com/153',
            type: 'creator',
          },
        ],
        source_type: 'reference',
        risk_level: 'medium',
      },
      '네임스티커와 이름 표시하기': {
        description: '연필, 지우개, 물통, 실내화, 가방에 이름을 붙이고 학교 안내문에서 표기 방식이 있는지 확인합니다.',
        why: '입학 직전에는 추가 구매보다 분실하기 쉬운 물건에 이름을 붙이는 실행이 더 직접적입니다.',
        how: '이미 준비한 물건에만 이름을 붙이고, 학교에서 금지하거나 지정한 표기 방식이 있으면 학교 안내를 따릅니다.',
        completion_criteria: '주요 물건의 이름 표시가 끝났고 여분 네임스티커가 챙겨졌습니다.',
        caution: '아이 이름 외의 개인정보를 겉면에 과하게 적지 않습니다.',
        links: [
          {
            label: '학부모 입학 준비 체크리스트 참고',
            url: 'https://hahappa.tistory.com/153',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '등교 동선과 입학식 가방 점검하기': {
        description: '집에서 학교까지 가는 길, 횡단보도, 통학 시간, 가방 무게를 아이와 확인하고 입학식 전날 요구 물품만 넣습니다.',
        why: '입학식 전날의 핵심은 더 사는 것이 아니라 아이가 다음 날 어디로 가고 무엇을 들고 갈지 확인하는 것입니다.',
        how: '등교 동선을 한 번 걸어보고, 입학식 안내문에 적힌 물건만 가방에 넣습니다. 학교별 서류나 통지서 원본은 FLOW에 업로드하지 않습니다.',
        completion_criteria: '등교 동선 연습과 입학식 가방 점검이 끝났습니다.',
        caution: '아이 위치, 학교 배정 문서, 반/담임 정보 화면은 FLOW에 저장하지 않습니다.',
        links: [
          {
            label: '학부모 입학 준비 체크리스트 참고',
            url: 'https://hahappa.tistory.com/153',
            type: 'creator',
          },
          {
            label: '교육부 2026학년도 취학통지·예비소집 안내',
            url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W',
            type: 'official',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-washer-tub-clean-monthly',
        slug: 'washer-tub-clean-monthly',
        title: '세탁기 통세척 월간 관리 Flow',
        description: '월 1회 통세척, 고무패킹, 세제통, 배수필터를 한 번에 확인하는 가벼운 세탁기 관리 루틴입니다.',
        category: '가전 관리',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '세탁기 통세척 방법 완벽 가이드',
        source_url: washerTubCleanLink.url,
        source_status: 'real',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
        conversion_note: '통세척 방법 글에서 반복 실행 가능한 월간 관리 항목만 추려 루틴 Flow로 승격했습니다. 사진 증빙은 기본값으로 요구하지 않습니다.',
        primary_destination: 'calendar',
        ...creatorMeta('생활 루틴 코치', '생활 관리 큐레이터', '반복 관리가 필요한 생활 콘텐츠를 가벼운 캘린더 루틴으로 정리합니다.', 1560, 214),
        ...tagMeta(['가전 관리', '세탁기', '월간 루틴', '원문 따라하기']),
      },
      washerTubCleanMonthlyText,
    ),
    washerTubCleanMonthlyDetails,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-monstera-care-routine',
        slug: 'monstera-care-routine',
        title: '몬스테라 물주기·분갈이 루틴 Flow',
        description: '겉흙 2~3cm, 밝은 간접광, 배수구멍, 잎 상태를 반복 확인하는 초보 식물 관리 루틴입니다.',
        category: '식물 관리',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '몬스테라 식물 관리 가이드 참고',
        source_url: monsteraCareLink.url,
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-07',
        conversion_note: '몬스테라 관리 글에서 반복 판단할 수 있는 물주기, 빛, 배수, 잎 상태를 주기 루틴으로 남기고, 분갈이는 원문 기준에 맞춰 1~2년 점검으로 분리했습니다.',
        primary_destination: 'calendar',
        ...creatorMeta('생활 루틴 코치', '식물 루틴 큐레이터', '초보 식물 관리 콘텐츠가 루틴 Flow로 충분히 가벼운지 검증하는 후보입니다.', 1320, 188),
        ...tagMeta(['식물 관리', '몬스테라', '물주기', 'P0 검증']),
      },
      monsteraCareRoutineText,
    ),
    monsteraCareRoutineDetails,
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-water-purifier-filter-cycle',
        slug: 'water-purifier-filter-cycle',
        title: '정수기 필터 교체 주기표 Flow',
        description: '필터별 마지막 교체일과 다음 교체 기준을 표로 관리하고, 코크/출수구와 물맛·냄새 확인을 함께 둡니다.',
        category: '가전 관리',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'low',
        source_title: '정수기 필터 교체 방법과 주기 참고',
        source_url: waterPurifierFilterLink.url,
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-07',
        conversion_note: '정수기 필터 주기 글에서 침전, 프리카본, RO/나노, 후카본 필터 주기와 코크/출수구·자가 살균·물맛 냄새 확인 행을 추려 시트 우선 Flow로 승격했습니다.',
        primary_destination: 'sheet',
        setup_anchor_label: '필터 주기표 작성',
        setup_anchor_hint: '날짜 입력 없이 필터별 마지막 교체일, 원문 교체 주기, 다음 확인일, 상태 메모를 표에 채웁니다.',
        ...creatorMeta('생활 루틴 코치', '가전 관리 큐레이터', '필터별 주기표가 FlowMe의 sheet-first UX와 맞는지 검증하는 후보입니다.', 1180, 156),
        ...tagMeta(['가전 관리', '정수기', '필터', '시트']),
      },
      waterPurifierFilterCycleText,
    ),
    waterPurifierFilterCycleDetails,
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
        source_title: '자동차365 중고차 구매가이드',
        source_url: 'https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
        conversion_note: '자동차365 공식 구매가이드의 성능상태점검기록부, 보험 이력, 등록 원부, 압류·저당 확인 순서를 현장 점검 Flow로 정리했습니다.',
        warning: '이 체크리스트는 참고용이며 차량 상태를 보증하지 않습니다. 사고·침수·압류·저당 여부는 공식 조회와 전문가 점검을 함께 사용하세요.',
      },
      usedCarBuyingText,
    ),
    {
      label: '자동차365 중고차 구매가이드',
      url: 'https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y',
    },
    'financial_sensitive',
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-new-car-delivery',
        slug: 'new-car-delivery-check',
        title: '신차 인수 점검 Flow',
        description: '신차 인수 현장에서 원문 체크리스트를 따라 확인하고, 이상 시 대응 기준을 서명 전에 분리해 보는 Flow입니다.',
        category: '자동차/구매',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '겟차 신차 검수 체크리스트 가이드',
        source_url: 'https://web.getcha.kr/blog/new-car-inspection-checklist-complete-guide-2026',
        warning: '차량 인수 후 발견되는 하자는 처리 기준이 달라질 수 있습니다. 서명 또는 인수 확정 전에 사진 파일명, 딜러 확인, 보류 조건을 남기세요.',
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
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
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
        title: '결혼 준비 D-300 타임라인 Flow',
        description: '예식일을 기준으로 D-300부터 D-Day까지 12개 항목을 웨딩홀, 스드메, 청첩장, 본식 디테일 순서로 정리합니다.',
        category: '결혼/준비',
        structure_type: 'timeline',
        content_type: 'default',
        primary_destination: 'calendar',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '결혼 준비 체크리스트 참고',
        source_url: 'https://www.ohprint.me/blog/wedding-checklist',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
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
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
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
  plankChallengeBundle,
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-diet-habit',
        slug: 'diet-habit-2week',
        title: '2주 수면 체크 Flow',
        description: '원문 전체를 포괄하지 않고, 14일 동안 늦게 자지 않고 8시간 이상 자기만 매일 체크하는 Flow입니다.',
        category: '생활/수면',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '질병관리청 건강하게 체중 감량하기 안내',
        source_url:
          'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
        warning: '이 Flow는 감량 처방이나 수면 치료가 아니라 14일 수면 체크용입니다. 질환, 임신·수유, 섭식장애 경험, 약물 복용, 어지러움·통증·수면 문제가 반복되면 체크보다 전문가 상담을 우선하세요.',
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

type ValidationFixMeta = Pick<Flow, 'setup_anchor_label' | 'setup_anchor_hint'> &
  Partial<Pick<Flow, 'stop_conditions' | 'principles' | 'hold_section'>>;

const validationFixMeta: Record<string, ValidationFixMeta> = {
  'computer-skills-d30-study': {
    setup_anchor_label: '시험일',
    setup_anchor_hint: '실제 시험일을 넣으면 D-30 학습 일정과 D-1 준비 항목이 그 날짜 기준으로 계산됩니다.',
  },
  'diet-habit-2week': {
    setup_anchor_label: '체크 시작일',
    setup_anchor_hint: '처방이나 감량 목표가 아니라 14일 동안 8시간 이상 자기 체크를 시작하는 날짜입니다.',
    stop_conditions: [
      '어지러움, 통증, 수면 문제가 반복되면 체크를 멈추고 전문가 상담을 우선합니다.',
      '질환, 임신·수유, 섭식장애 경험, 약물 복용 중이면 FLOW 체크보다 전문가 상담을 우선합니다.',
    ],
    principles: [
      '수면 체크는 처방이나 감량 결과 판단이 아니라 14일 동안 한 가지 생활 규칙을 지켰는지 보는 자료입니다.',
      '여러 습관을 동시에 관리하지 않고, 잠든 시각과 8시간 이상 수면 여부만 체크합니다.',
    ],
  },
  'new-car-delivery-check': {
    setup_anchor_label: '인수일 기록',
    setup_anchor_hint: '날짜 입력보다 현장 증거표가 우선입니다. 실제 인수일은 보류 메모와 사진 파일명에 함께 남깁니다.',
    hold_section: {
      title: '인수 보류 기준',
      reasons: [
        '차대번호, 계약 옵션, 등록 문서가 맞지 않거나 딜러 확인이 비어 있습니다.',
        '외관 흠집, 유리·휠 손상, 경고등 등 결함 사진 파일명이 증거표에 없습니다.',
        '수리·교체·재방문 약속이 말로만 남고 서면 확인이나 담당자명이 없습니다.',
      ],
      consequence: 'FLOW는 인수 여부를 결정하지 않습니다. 보류 기준이 있으면 서명 전 딜러 확인과 사용자 판단을 분리해 기록합니다.',
      memo_template: '딜러 확인: / 사진 파일명: / 보류 사유: / 서명 보류 여부: / 다음 확인 시점:',
    },
  },
  'moving-d30-basic': {
    setup_anchor_label: '이사일',
    setup_anchor_hint: '이사 당일을 넣으면 D-30, D-10, D-1, D+1 준비 일정이 자동으로 배치됩니다.',
  },
  'baby-food-menu-recipe': {
    setup_anchor_label: '이유식 시작일',
    setup_anchor_hint: '첫 이유식 날짜를 기준으로 새 재료 관찰일과 레시피 확인일을 계산합니다.',
  },
  'new-apartment-precheck': {
    setup_anchor_label: '사전점검일',
    setup_anchor_hint: '사전점검 방문일을 넣으면 전날 준비, 당일 점검, 다음 날 보수 요청 정리 일정으로 나눕니다.',
    hold_section: {
      title: '보수 요청 보류 기준',
      reasons: [
        '하자 위치나 증상이 메모에 충분히 남아 있지 않습니다.',
        '관리사무소나 시공사에 전달할 목록이 정리되지 않았습니다.',
        '입주 전 재확인 일정이 아직 잡히지 않았습니다.',
      ],
      consequence: 'FLOW는 하자 책임을 판단하지 않습니다. 보수 요청 목록과 재확인 일정만 분리해 기록합니다.',
      memo_template: '하자 위치: / 증상: / 보수 요청: / 전달 여부: / 재확인일:',
    },
  },
  'japan-esim-setup-before-departure': {
    setup_anchor_label: '출국일',
    setup_anchor_hint: '출국일 기준 D-3 구매 확인, D-1 설치, D-Day 현지 연결 확인을 캘린더에 배치합니다.',
  },
  'dog-adoption-first-week': {
    setup_anchor_label: '입양일',
    setup_anchor_hint: '입양일 기준 전날 준비, 첫날 적응, 첫 주 병원/등록 체크를 배치합니다. 건강 판단은 병원 상담을 우선합니다.',
    stop_conditions: [
      '식욕 저하, 구토, 설사, 호흡 이상이 있으면 Flow 체크보다 동물병원 상담을 우선합니다.',
      '접종 기록이 불명확하면 임의로 접종 일정을 정하지 말고 병원에서 확인합니다.',
    ],
  },
  'used-car-buying-check': {
    setup_anchor_label: '현장 체크 시작',
    setup_anchor_hint: '체크리스트는 차량 상태 보증이 아닙니다. 방문일, 공식 조회 결과, 전문가 점검 여부, 보류 사유를 가볍게 메모합니다.',
    hold_section: {
      title: '구매 보류 메모',
      reasons: [
        '성능점검기록부/보험이력/압류·저당 확인이 비어 있거나 서로 맞지 않습니다.',
        '시운전 중 경고등, 소음, 변속 충격 등 확인 대상이 남았습니다.',
        '판매자 설명, 수리 약속, 환불/보증 조건이 서면으로 남지 않았습니다.',
      ],
      consequence: 'FLOW는 구매 결정을 하지 않습니다. 보류 기준이 있으면 계약금/서명 전 공식 조회와 전문가 점검을 먼저 확인하도록 남깁니다.',
      memo_template: '공식 조회: / 전문가 점검: / 보류 사유: / 계약금 보류 여부: / 다음 확인 시점:',
    },
  },
  'passport-renewal-docs': {
    setup_anchor_label: '접수일 기록',
    setup_anchor_hint: '접수 예정일, 사진 준비 상태, 수령·보관 메모를 기준으로 제출 준비를 확인합니다.',
  },
  'real-thankyou-bubu-home-workout-starter': {
    setup_anchor_label: '운동 시작일',
    setup_anchor_hint: '첫 운동일과 반복 요일을 정하면 영상 실행 알림과 운동 기록 항목이 만들어집니다.',
  },
  'real-fitvely-diet-record-routine': {
    setup_anchor_label: '기록 시작일',
    setup_anchor_hint: '식단 조언으로 확정하지 않고, 선택한 한 가지 기록 규칙을 시작하는 날짜입니다.',
  },
  'plank-30-day-challenge': {
    setup_anchor_label: '챌린지 시작일',
    setup_anchor_hint: '첫날을 넣으면 원문 Day 1~30 목표 초수와 휴식일이 날짜별 캘린더에 배치됩니다.',
    stop_conditions: [
      '허리 통증, 어지러움, 호흡 곤란이 있으면 즉시 중단합니다.',
      '기존 질환이나 운동 제한이 있으면 챌린지 시작 전 전문가 상담을 우선합니다.',
    ],
    principles: [
      '원문 표의 목표 초수와 휴식일을 캘린더로 옮기는 Flow이며, 운동 효과를 보장하지 않습니다.',
      '완료는 목표 초수 달성만이 아니라 무리하지 않도록 조정한 기록까지 포함합니다.',
    ],
  },
  'vehicle-inspection-prep': {
    setup_anchor_label: '검사일',
    setup_anchor_hint: '자동차검사 예약일을 기준으로 예약 정보, 차량 사전점검, 결과표와 후속 정비 메모 일정을 계산합니다.',
  },
  'real-mofa-overseas-travel-prep': {
    setup_anchor_label: '출국일',
    setup_anchor_hint: '출국일 기준으로 안전 정보, 비상연락망, 현지 위험 확인 항목을 배치합니다.',
  },
};

function applyValidationFixMeta(bundle: FlowBundle): FlowBundle {
  const meta = validationFixMeta[bundle.flow.slug];
  if (!meta) return bundle;

  let next: FlowBundle = {
    ...bundle,
    flow: {
      ...bundle.flow,
      ...meta,
    },
  };

  if (bundle.flow.slug === 'diet-habit-2week') {
    const removedSectionIds = new Set(
      next.sections.filter((section) => section.title.includes('중단') || section.title.includes('상담')).map((section) => section.id),
    );
    const removedItemIds = new Set(
      next.items
        .filter(
          (item) =>
            removedSectionIds.has(item.section_id ?? '') ||
            item.title.includes('중단') ||
            item.title.includes('상담'),
        )
        .map((item) => item.id),
    );

    next = {
      ...next,
      sections: next.sections.filter((section) => !removedSectionIds.has(section.id)),
      items: next.items.filter((item) => !removedItemIds.has(item.id)),
      itemDetails: next.itemDetails?.filter((detail) => !removedItemIds.has(detail.item_id)),
    };
  }

  if (bundle.flow.slug === 'computer-skills-d30-study') {
    const d1SectionId = 'flow-computer-skills-d30-study-section-d1';
    const hasD1Section = next.sections.some((section) => section.id === d1SectionId);
    const studyCopyByTitle: Record<
      string,
      {
        description: string;
        why: string;
        how: string;
        completion_criteria: string;
        caution: string;
      }
    > = {
      '필기와 실기 시험 범위 나누기': {
        description: '필기 이론, 스프레드시트 실기, 데이터베이스 실기를 남은 30일 캘린더에 나눕니다.',
        why: '컴활은 필기 암기와 실기 조작 시간이 달라서 범위를 먼저 나누지 않으면 마지막 주가 오답 정리보다 새 범위로 밀립니다.',
        how: '실행: 교재 목차를 열고 필기, 스프레드시트, 데이터베이스, 기출 보완을 네 학습 범위로 나눕니다. 기록: 오늘 항목의 실행 항목 메모에 범위와 보완할 단원을 적습니다.',
        completion_criteria: '필기/스프레드시트/데이터베이스/기출 보완 범위가 정해졌고 D-30 캘린더의 첫 주 일정과 맞습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '매일 공부 가능한 시간 블록 정하기': {
        description: '평일/주말에 실제로 비울 수 있는 공부 시간을 캘린더 일정 기준으로 정합니다.',
        why: '시험일 역산 캘린더는 실제 공부 가능한 시간이 있어야 밀리지 않습니다.',
        how: '실행: 평일 공부 시간 1개와 주말 보충 시간 1개를 정합니다. 기록: 캘린더 export 후 일정 제목이나 실행 항목 메모에 공부 시간대를 남깁니다.',
        completion_criteria: '평일/주말 공부 시간 블록이 정해졌고 캘린더 일정으로 옮길 수 있습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '기출 회독 목표 정하기': {
        description: '시험 전까지 풀 기출 회차 수와 다시 풀 회차를 정합니다.',
        why: '기출 회독 수보다 다시 풀 회차와 날짜가 있어야 마지막 주 보완이 실행됩니다.',
        how: '실행: 풀 회차 수, 목표 점수, 재풀이 날짜를 정합니다. 기록: 실행 항목 메모에 회차와 재풀이 날짜를 남기고 엑셀 export 때 확인합니다.',
        completion_criteria: '기출 회차 수와 재풀이 날짜가 D-30 캘린더 안에 들어갔습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '핵심 이론 1회독 시작하기': {
        description: '필기 핵심 개념을 첫 회독하고 약한 단원을 메모합니다.',
        why: '첫 회독은 암기 완료가 아니라 실기와 기출에서 반복 확인할 약한 단원을 찾는 단계입니다.',
        how: '실행: 핵심 이론을 정해진 시간만큼 읽고 바로 예제나 기출 1세트와 연결합니다. 기록: 약한 단원은 실행 항목 메모에 적어 다음 복습일에 보이게 합니다.',
        completion_criteria: '오늘 읽은 범위와 다시 볼 단원이 실행 항목 메모에 남았습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '자주 틀리는 기능 목록 만들기': {
        description: '함수식, 피벗테이블, 쿼리, 폼처럼 반복 실수 유형을 목록으로 만듭니다.',
        why: '실기는 틀린 기능을 다시 열어 직접 조작해야 점수가 오릅니다.',
        how: '실행: 최근 틀린 문제를 보며 함수, 피벗, 차트, 쿼리, 폼/보고서 중 어디서 막혔는지 나눕니다. 기록: 기능명과 다시 풀 파일명을 실행 항목 메모에 적습니다.',
        completion_criteria: '반복 실수 기능과 다시 풀 파일명이 최소 3개 이상 정리됐습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '실기 프로그램 환경 점검하기': {
        description: '2026년 1급 실기 기준인 MS Office LTSC Professional Plus 2021에서 실기 파일 열기, 저장, 함수 입력, 피벗/쿼리 작업이 가능한지 확인합니다.',
        why: '시험 직전 프로그램 버전이나 저장 위치 문제를 만나면 공부한 내용을 실행하기 어렵습니다.',
        how: '실행: 대한상공회의소 시험안내에서 현재 수험용 프로그램을 확인한 뒤 MS Office LTSC Professional Plus 2021에서 예제 파일을 저장하고 함수 입력, 피벗테이블, 쿼리 작업을 한 번씩 확인합니다. 기록: 프로그램 버전과 막힌 기능을 실행 항목 메모에 남깁니다.',
        completion_criteria: '실기 파일 열기/저장과 주요 기능 조작이 확인됐고 문제 상황이 있으면 메모됐습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '제한 시간 맞춰 모의 문제 풀기': {
        description: '제한 시간을 두고 기출 또는 모의 문제 1회차를 풉니다.',
        why: '시간 안에 끝내는 순서가 잡혀야 시험장에서 쉬운 문제를 놓치지 않습니다.',
        how: '실행: 타이머를 켜고 한 회차를 멈추지 않고 풉니다. 기록: 완료 여부, 막힌 기능, 다시 풀 날짜를 실행 항목 메모에 적고 엑셀 export에서 확인합니다.',
        completion_criteria: '한 회차를 제한 시간 기준으로 풀었고 막힌 기능과 재풀이 날짜가 남았습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '오답을 유형별로 정리하기': {
        description: '암기형, 계산형, 기능 조작형으로 오답을 나누고 다시 풀 날짜를 정합니다.',
        why: '오답은 점수보다 다시 고칠 행동으로 나눠야 마지막 복습에서 바로 실행됩니다.',
        how: '실행: 틀린 문제를 암기형, 계산형, 기능 조작형으로 표시합니다. 기록: 유형과 다시 풀 날짜를 실행 항목 메모에 남깁니다.',
        completion_criteria: '오답 유형과 재풀이 날짜가 정리되어 다음 캘린더 일정과 연결됐습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
      '시험장 준비물과 이동 시간 확인하기': {
        description: '수험표, 신분증, 시험장 위치, 출발 시간을 전날 캘린더 메모에 남깁니다.',
        why: '시험 전날에는 새 공부보다 준비물과 이동 시간을 확정하는 것이 시험 실패 위험을 줄입니다.',
        how: '실행: 수험표, 신분증, 시험장 주소, 교통편, 출발 시간을 확인합니다. 기록: 전날 캘린더 일정과 실행 항목 메모에 준비물과 출발 시간을 적습니다.',
        completion_criteria: '수험표, 신분증, 시험장 위치, 출발 시간이 시험장 준비 메모에 남았습니다.',
        caution: '새 범위를 늘리기보다 오답 재풀이, 실기 환경, 시험장 준비를 우선합니다.',
      },
    };
    next = {
      ...next,
      sections: hasD1Section
        ? next.sections
        : [
            ...next.sections,
            {
              id: d1SectionId,
              flow_id: bundle.flow.id,
              title: 'D-1 최종 확인',
              description: '시험 전날 준비물과 이동 시간을 시험일 기준으로 따로 확인합니다.',
              order: next.sections.length,
            },
          ],
      items: next.items.map((item) => {
        const copy = studyCopyByTitle[item.title];
        return {
          ...item,
          ...(item.day_offset === -1 ? { section_id: d1SectionId } : {}),
          ...(copy ? { description: copy.description } : {}),
        };
      }),
      itemDetails: next.itemDetails?.map((detail) => {
        const item = next.items.find((entry) => entry.id === detail.item_id);
        const copy = item ? studyCopyByTitle[item.title] : undefined;
        if (!copy) return detail;
        return {
          ...detail,
          why: copy.why,
          how: copy.how,
          completion_criteria: copy.completion_criteria,
          caution: copy.caution,
        };
      }),
    };
  }

  if (bundle.flow.slug === 'real-mofa-overseas-travel-prep') {
    const mofaCopyByTitle: Record<
      string,
      {
        description: string;
        why: string;
        how: string;
        completion_criteria: string;
        caution: string;
      }
    > = {
      '방문 국가 여행경보 확인': {
        description: '외교부 해외안전여행에서 베트남 국가/지역별 여행경보와 최신 안전 공지를 확인합니다.',
        why: '여행경보 단계와 최근 안전 공지는 일정 변경, 야간 이동, 보험 확인 여부를 정하는 기준입니다.',
        how: '외교부 해외안전여행 국가/지역별 정보에서 방문 도시를 검색하고 여행경보 단계, 최근 공지, 확인일을 실행 항목 메모에 적습니다.',
        completion_criteria: '여행경보 단계, 확인일, 피해야 할 지역/시간대가 메모에 남았습니다.',
        caution: 'FLOW는 출국 가능 여부를 판단하지 않습니다. 외교부 공지와 항공/입국 조건을 직접 확인하세요.',
      },
      '여권과 비자 조건 확인': {
        description: '여권 만료일, 무비자 체류 가능 기간, 전자허가/비자 필요 여부를 확인합니다.',
        why: '여권 유효기간이나 입국 조건이 맞지 않으면 항공권이 있어도 출국 또는 입국이 막힐 수 있습니다.',
        how: '여권 만료일과 항공권 정보를 놓고 외교부/방문국 공지의 입국 조건을 확인한 뒤 부족한 서류를 실행 항목 메모에 적습니다.',
        completion_criteria: '여권 유효기간, 체류 가능 기간, 필요한 입국 서류가 적혔습니다.',
        caution: 'FLOW는 출국 가능 여부를 판단하지 않습니다. 외교부 공지와 항공/입국 조건을 직접 확인하세요.',
      },
      '긴급 연락처와 영사콜센터 저장': {
        description: '영사콜센터, 현지 공관, 보험사 긴급번호를 휴대폰과 오프라인 메모에 저장합니다.',
        why: '분실, 사고, 통신 장애가 생기면 온라인 검색보다 저장된 연락처가 먼저 필요합니다.',
        how: '영사콜센터, 주베트남 대한민국 대사관/총영사관, 보험사 긴급번호, 동행자 연락처를 휴대폰과 오프라인 메모에 같이 저장합니다.',
        completion_criteria: '영사콜센터와 현지 공관 연락처가 휴대폰 및 오프라인 메모에 저장됐습니다.',
        caution: 'FLOW는 출국 가능 여부를 판단하지 않습니다. 외교부 공지와 항공/입국 조건을 직접 확인하세요.',
      },
      '보험과 현지 이동 계획 점검': {
        description: '여행자보험 보장 범위와 공항-숙소 이동, 야간 이동 피할 구간을 확인합니다.',
        why: '보험 보장 범위와 첫 이동 경로가 정리되어야 사고나 지연 상황에서 바로 대응할 수 있습니다.',
        how: '여행자보험 증권의 보장 범위와 긴급 연락처를 확인하고 공항-숙소 이동, 야간 이동, 피해야 할 지역을 실행 항목 메모에 적습니다.',
        completion_criteria: '보험 증권 위치, 보험사 긴급번호, 공항-숙소 이동 경로가 저장됐습니다.',
        caution: 'FLOW는 출국 가능 여부를 판단하지 않습니다. 외교부 공지와 항공/입국 조건을 직접 확인하세요.',
      },
      '가족에게 일정과 비상 연락 방법 공유': {
        description: '항공편, 숙소, 현지 연락처, 연락 두절 시 확인 방법을 가족이나 동행자에게 보냅니다.',
        why: '현지에서 연락이 끊겼을 때 가족이 확인할 기준 정보가 있어야 신고와 지원 요청이 빨라집니다.',
        how: '항공편, 숙소, 주요 이동일, 영사콜센터, 보험사 연락처, 연락 두절 시 확인 순서를 가족이나 동행자에게 공유합니다.',
        completion_criteria: '최신 일정과 비상 연락 방법이 가족 또는 동행자에게 전달됐습니다.',
        caution: 'FLOW는 출국 가능 여부를 판단하지 않습니다. 외교부 공지와 항공/입국 조건을 직접 확인하세요.',
      },
    };

    next = {
      ...next,
      flow: {
        ...next.flow,
        description: '외교부 해외안전여행 국가/지역별 정보를 출국일 기준 체크리스트와 캘린더로 바꾼 Flow입니다.',
        conversion_note:
          '외교부 해외안전여행 국가/지역별 정보를 출국일 기준 여행경보, 입국 조건, 영사 연락처, 보험/이동, 가족 공유 체크로 압축했습니다.',
        primary_destination: 'hybrid',
        ...creatorMeta('FLOW 큐레이션팀', '공식자료 큐레이터', '외교부 해외안전여행 정보를 출국일 기준 실행 항목으로 정리합니다.', 642, 118),
        owner_user_id: next.flow.owner_user_id,
      },
      sections: next.sections.map((section) =>
        section.title === '출국 전'
          ? { ...section, description: '출국 전 공식 안전정보와 입국 조건을 확인합니다.' }
          : section.title === '현지 대비'
            ? { ...section, description: '현지에서 바로 쓸 연락처와 이동/보험 정보를 저장합니다.' }
            : section,
      ),
      items: next.items.map((item) => {
        const copy = mofaCopyByTitle[item.title];
        return copy ? { ...item, description: copy.description } : item;
      }),
      itemDetails: next.itemDetails?.map((detail) => {
        const item = next.items.find((entry) => entry.id === detail.item_id);
        const copy = item ? mofaCopyByTitle[item.title] : undefined;
        if (!copy) return detail;
        return {
          ...detail,
          why: copy.why,
          how: copy.how,
          completion_criteria: copy.completion_criteria,
          caution: copy.caution,
        };
      }),
    };
  }

  if (bundle.flow.slug === 'new-car-delivery-check') {
    next = {
      ...next,
      items: next.items.map((item) => {
        const holdEligible = /차대번호|도장면|유리|휠|타이어|경고등|등록증|보험/.test(item.title);
        if (!holdEligible) return item;
        return {
          ...item,
          hold_eligible: true,
          photo_filename_pattern: 'YYYYMMDD_차량번호_부위_순번.jpg',
          status: 'check',
        };
      }),
    };
  }

  if (bundle.flow.slug === 'used-car-buying-check') {
    next = {
      ...next,
      items: next.items.map((item) => {
        const holdEligible = /사고|보험 이력|성능점검기록부|현장|시동|변속|제동|압류|저당|계약서|정비소|전문가|구매\/보류\/거절/.test(item.title);
        if (!holdEligible) return item;
        return {
          ...item,
          hold_eligible: true,
          status: 'check',
        };
      }),
    };
  }

  if (bundle.flow.slug === 'real-fitvely-diet-record-routine') {
    const sectionId = next.sections[0]?.id ?? `${next.flow.id}-section-meals`;
    const mealItems = [
      {
        id: `${next.flow.id}-breakfast-check`,
        title: '아침 식단 확인',
        description: '아침 메뉴를 보고 오늘 정한 식단 기준을 지켰는지만 체크합니다.',
        order: 0,
      },
      {
        id: `${next.flow.id}-lunch-check`,
        title: '점심 식단 확인',
        description: '점심 메뉴를 보고 지켰음/못 지켰음만 남깁니다.',
        order: 1,
      },
      {
        id: `${next.flow.id}-dinner-check`,
        title: '저녁 식단 확인',
        description: '저녁 메뉴를 보고 오늘 식단 체크를 마무리합니다.',
        order: 2,
      },
    ];

    next = {
      ...next,
      flow: {
        ...next.flow,
        primary_destination: 'calendar',
        conversion_note: 'FITVELY 식단 영상을 처방표로 확장하지 않고 아침, 점심, 저녁 식단 확인 캘린더와 완료 체크로 압축했습니다.',
      },
      sections: [
        {
          id: sectionId,
          flow_id: next.flow.id,
          title: '하루 식단 체크',
          description: '메모 대신 아침, 점심, 저녁을 지켰는지만 체크합니다.',
          order: 0,
        },
      ],
      items: mealItems.map((item) => ({
        id: item.id,
        flow_id: next.flow.id,
        section_id: sectionId,
        title: item.title,
        description: item.description,
        type: 'calendar' as const,
        repeat_rule: '매일 체크',
        source_type: next.items[0]?.source_type ?? 'creator_experience',
        risk_level: next.flow.risk_level,
        order: item.order,
      })),
      itemDetails: mealItems.map((item) => ({
        item_id: item.id,
        why: '식단 처방표를 새로 만들지 않고, 실제 식사에서 사용자가 지켰는지만 빠르게 확인합니다.',
        how: `${item.title.replace('확인', '')} 메뉴를 보고 선택한 기준을 지켰으면 체크합니다. 자세한 식단 기준은 원본 영상을 열어 확인합니다.`,
        completion_criteria: `${item.title} 칸이 지켰음/못 지켰음 중 하나로 판단됐다.`,
        caution: next.flow.warning,
        links: next.flow.source_url
          ? [
              {
                label: next.flow.source_title ?? 'FITVELY 원본 영상',
                url: next.flow.source_url,
                type: 'creator' as const,
              },
            ]
          : [],
      })),
    };
  }

  return next;
}

function enrichSeedMeta(bundle: FlowBundle, index: number): FlowBundle {
  const category = bundle.flow.category;
  const reviewMeta = sourceReviewMeta[bundle.flow.slug];
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

  return applyValidationFixMeta({
    ...bundle,
    flow: {
      ...bundle.flow,
      ...reviewMeta,
      ...(bundle.flow.creator_name ? {} : creatorByCategory),
      tags: bundle.flow.tags ?? buildSeedTags(bundle),
    },
  });
}

type CopyPolishConfig = {
  artifact: string;
  record: string;
  sourceCheck: string;
  boundary: string;
  sourceType: FlowBundle['items'][number]['source_type'];
  riskLevel: FlowBundle['flow']['risk_level'];
};

const sourceRiskCopyPolish: Record<string, CopyPolishConfig> = {
  'computer-skills-d30-study': {
    artifact: 'D-30 캘린더와 실행 항목 메모',
    record: '시험일, 단원, 오답 유형, 재풀이 날짜, 실기 파일 상태',
    sourceCheck: '교재 목차와 최신 기출 범위',
    boundary: '새 범위를 늘리기보다 오답 재풀이와 실기 환경 확인을 우선합니다.',
    sourceType: 'reference',
    riskLevel: 'low',
  },
  'diet-habit-2week': {
    artifact: '14일 수면 체크표',
    record: '잠든 시각, 8시간 이상 수면 여부, 다음 날 피로감',
    sourceCheck: '질병관리청 안내 중 충분한 수면 원칙',
    boundary: '감량 처방이나 수면 치료가 아니라 수면 체크이며, 어지러움·통증·수면 문제가 반복되면 전문가 상담을 우선합니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'new-car-delivery-check': {
    artifact: '신차 인수 현장 체크리스트',
    record: '계약 옵션, 하자 위치, 사진 파일명, 딜러 확인, 서명 전 보류 조건',
    sourceCheck: '신차 검수 체크리스트의 외관·실내·서류 확인 순서',
    boundary: '하자를 발견하면 서명 또는 인수 확정 전에 사진 파일명, 딜러 확인, 보류 조건을 남깁니다.',
    sourceType: 'reference',
    riskLevel: 'financial_sensitive',
  },
  'year-end-tax-docs': {
    artifact: '연말정산 회사 제출 메모',
    record: '회사 마감, 간소화 확인일, 추가 증빙, 공제 판단 질문, 제출 상태',
    sourceCheck: '국세청 간소화 일정과 회사 제출 기준',
    boundary: '공제 가능 여부는 Flow가 확정하지 않고 회사 또는 국세청 확인 질문으로 남깁니다.',
    sourceType: 'official',
    riskLevel: 'financial_sensitive',
  },
  'diet-meal-exercise-log': {
    artifact: '식사·운동·컨디션 관찰표',
    record: '끼니, 간식, 운동 시간, 강도, 배고픔, 통증이나 어지러움',
    sourceCheck: '질병관리청의 식사·활동·생활습관 기록 원칙',
    boundary: '체중감량 처방이 아니라 관찰 기록이며 이상 신호가 있으면 중단합니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'diet-reset-2week': {
    artifact: '2주 리셋 관찰표와 다음 규칙 메모',
    record: '식사 시간, 간식 패턴, 대체 행동, 운동, 수면, 유지할 규칙',
    sourceCheck: '질병관리청의 무리하지 않는 체중관리 원칙',
    boundary: '끼니를 건너뛰거나 극단적으로 제한하지 않고 유지 가능한 규칙만 남깁니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'business-registration-basic': {
    artifact: '사업자등록 신청 전 공식 질문 메모',
    record: '업종, 사업장 증빙, 인허가 후보, 세무서 질문, 접수 증빙',
    sourceCheck: '홈택스 제출서류 안내',
    boundary: '업종코드, 과세유형, 인허가 판단은 공식 확인 질문으로 분리합니다.',
    sourceType: 'official',
    riskLevel: 'financial_sensitive',
  },
  'happy-birth-service-check': {
    artifact: '행복출산 신청 가족정보 메모',
    record: '출생일, 거주지, 보호자 계좌, 지원 항목 질문, 제출 증빙',
    sourceCheck: '정부24 행복출산 통합신청 안내',
    boundary: '지원 대상과 지급 여부는 거주지·가구 조건에 따라 달라져 공식 확인으로 남깁니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'industrial-accident-claim-docs': {
    artifact: '산재 요양비 청구 증빙 메모',
    record: '청구 유형, 영수증 파일명, 금액, 공단 질문, 보완 요청 상태',
    sourceCheck: '정부24 산재보험 요양비청구 안내',
    boundary: '산재 인정이나 지급 가능성은 Flow가 판단하지 않고 공단 확인 질문으로 남깁니다.',
    sourceType: 'official',
    riskLevel: 'financial_sensitive',
  },
  'national-health-checkup-d7': {
    artifact: '건강검진 D-7 캘린더와 기관 질문 메모',
    record: '검진기관, 복용약 질문, 금식 안내 확인, 수면내시경 이동, 결과 수령 방법',
    sourceCheck: '국민건강보험 건강검진 안내와 검진기관 안내',
    boundary: '금식, 약 복용, 내시경 이동은 의료진 또는 검진기관 확인 질문으로 기록합니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'vaccination-certificate-issue': {
    artifact: '예방접종증명서 제출 메모',
    record: '대상자, 언어, 제출처 요구 형식, 누락 기록 확인, 파일 위치',
    sourceCheck: '정부24 예방접종증명 민원 안내',
    boundary: '접종 이력 누락이나 정정은 보건소 또는 접종기관 확인으로 분리합니다.',
    sourceType: 'official',
    riskLevel: 'medical_sensitive',
  },
  'job-change-risk-check': {
    artifact: '이직 전 회사·보험·현금흐름 리스크 메모',
    record: '회사 질문, 인수인계, 퇴직급여, 고용보험, 공백 기간 생활비, 결정 기준선',
    sourceCheck: '회사 규정, 고용보험, 건강보험, 퇴직급여 공식 확인 경로',
    boundary: '법적·재정적 결론을 내리지 않고 회사와 공공기관에 확인할 질문으로 분리합니다.',
    sourceType: 'reference',
    riskLevel: 'financial_sensitive',
  },
};

function polishSourceRiskItemCopy(bundle: FlowBundle): FlowBundle {
  const config = sourceRiskCopyPolish[bundle.flow.slug];
  if (!config) return bundle;

  const previousDetails = new Map(bundle.itemDetails?.map((detail) => [detail.item_id, detail]));
  return {
    ...bundle,
    items: bundle.items.map((item) => ({
      ...item,
      description:
        item.description && item.description.length >= 20
          ? item.description
          : `${config.artifact}에 ${item.title} 결과를 남겨 다음 단계에서 바로 확인할 수 있게 합니다.`,
      source_type: item.source_type ?? config.sourceType,
      risk_level: item.risk_level ?? config.riskLevel,
    })),
    itemDetails: bundle.items.map((item) => {
      const existing = previousDetails.get(item.id);
      return {
        item_id: item.id,
        why:
          existing?.why && existing.why.length >= 20
            ? `${existing.why} 이 결과는 ${config.artifact}에 남길 값과 연결됩니다.`
            : `${config.artifact}은 ${config.record}를 한곳에 모아야 쓸모가 있습니다. 이 항목은 "${item.title}" 판단을 빠뜨리지 않게 합니다.`,
        how:
          existing?.how && existing.how.length >= 20
            ? `${existing.how} 확인한 값은 ${config.artifact}의 메모나 상태 칸에 적습니다.`
            : `${config.sourceCheck}를 확인한 뒤, 실행판의 ${config.artifact}에 ${config.record} 중 해당 값을 적습니다.`,
        completion_criteria:
          existing?.completion_criteria && existing.completion_criteria.length >= 15 && existing.completion_criteria !== '이 항목을 완료했어요.'
            ? `${existing.completion_criteria} ${config.artifact}에도 같은 상태를 기록했다.`
            : `${config.artifact}에 "${item.title}"의 날짜, 상태, 증빙, 질문 중 필요한 값이 기록됐다.`,
        caution: existing?.caution ?? config.boundary,
        links: existing?.links,
      };
    }),
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
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
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
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-new-apartment-precheck',
        slug: 'new-apartment-precheck',
        title: '신축 아파트 입주 사전점검 Flow',
        description: '사전점검일을 기준으로 준비물, 하자 확인, 보수 요청 정리를 체크합니다.',
        category: '주거/입주',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'low',
        source_title: '신축 아파트 사전점검 체크리스트 참고',
        source_url: 'https://blog.naver.com/PostView.naver?blogId=juniorhome&logNo=223358772350',
        source_status: 'preview',
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
        conversion_note: '기존 원문이 404로 확인되어 공개 노출을 중단했습니다. 대체 출처에서 준비물·구역별 점검·보수 요청 행을 다시 확인하기 전까지 preview로 유지합니다.',
        primary_destination: 'internal_check',
        ...creatorMeta('생활 루틴 코치', '입주 준비 큐레이터', '하자 사진은 기본 필드로 강제하지 않고 메모에 남기는 흐름을 확인하는 P0 stress fixture입니다.', 1840, 238),
        ...tagMeta(['입주', '사전점검', '체크리스트', 'P0 검증']),
      },
      newApartmentPrecheckText,
    ),
    {
      '사전점검 준비물 챙기기': {
        description: '줄자, 포스트잇, 펜, 충전기, 물티슈처럼 점검 중 바로 쓸 물건을 챙깁니다.',
        why: '당일 준비물이 없으면 하자 위치와 증상을 정확히 남기기 어렵습니다.',
        how: '방문 전날 가방에 준비물을 넣고, 사진 촬영이 가능한 휴대폰 배터리를 확인합니다.',
        completion_criteria: '점검 준비물이 한 곳에 모였고 당일 들고 갈 수 있습니다.',
        source_type: 'creator_experience',
      },
      '하자 위치와 보수 요청 메모 남기기': {
        description: '하자 위치, 증상, 요청 내용을 짧게 적어 보수 요청 목록으로 남깁니다.',
        why: '입주 전 보수 요청은 위치와 증상이 분명해야 누락을 줄일 수 있습니다.',
        how: '사진은 선택으로 남기고, FlowMe에는 위치와 요청 내용을 메모로 적습니다.',
        completion_criteria: '보수 요청 목록이 관리사무소에 전달할 수 있는 형태로 정리됐습니다.',
        source_type: 'creator_experience',
      },
      '보수 요청 목록 정리해서 관리사무소에 전달하기': {
        description: '전날/당일 확인한 하자를 한 목록으로 묶어 전달합니다.',
        why: '구두 전달만 하면 항목이 빠질 수 있어 점검 다음 날 정리가 필요합니다.',
        how: '현관, 욕실, 주방, 전기, 창호 순서로 묶어 메모를 정리합니다.',
        completion_criteria: '보수 요청 목록을 전달했고 재확인 일정을 메모했습니다.',
        source_type: 'creator_experience',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-japan-esim-setup',
        slug: 'japan-esim-setup-before-departure',
        title: '일본 eSIM 출국 전 등록 체크 Flow',
        description: '출국일을 기준으로 eSIM 구매, 설치, 도착 후 연결 확인을 캘린더에 넣습니다.',
        category: '여행 준비',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'low',
        source_title: '일본 eSIM 사용 후기와 설치 순서 참고',
        source_url: 'https://blog.naver.com/PostView.naver?blogId=travelnote_jp&logNo=223529001204',
        source_status: 'preview',
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
        conversion_note: '기존 원문이 404로 확인되어 공개 노출을 중단했습니다. 대체 출처에서 기기 지원·설치·활성화 순서를 다시 확인하기 전까지 preview로 유지합니다.',
        primary_destination: 'calendar',
        ...creatorMeta('FLOW 큐레이션팀', '여행 준비 큐레이터', '여행 준비 Flow가 짧은 날짜형 컨텐츠를 얼마나 가볍게 담는지 확인하는 P0 stress fixture입니다.', 2260, 321),
        ...tagMeta(['여행', 'eSIM', '출국 전', 'P0 검증']),
      },
      japanEsimSetupText,
    ),
    {
      'eSIM 구매 링크와 사용 가능 기기 확인하기': {
        description: '구매 전 휴대폰 eSIM 지원 여부와 현지 데이터 상품 조건을 확인합니다.',
        why: '지원되지 않는 기기나 다른 국가 상품을 사면 출국 후 바로 쓰기 어렵습니다.',
        how: '기기 설정의 eSIM 지원 여부와 상품 국가, 사용 기간, 데이터 용량을 확인합니다.',
        completion_criteria: '구매할 상품과 기기 지원 여부를 확인했습니다.',
        source_type: 'creator_experience',
      },
      'eSIM 프로필 미리 설치하기': {
        description: '출국 전 QR 코드로 eSIM 프로필을 설치하되 현지 회선 활성화는 도착 후로 둡니다.',
        why: '공항 도착 후 QR 메일을 찾느라 시간을 쓰지 않기 위해 미리 설치합니다.',
        how: '설정에서 eSIM을 추가하고 회선 이름을 일본 여행처럼 알아보기 쉽게 바꿉니다.',
        completion_criteria: 'eSIM 프로필이 설치됐고 아직 현지 데이터는 켜지 않았습니다.',
        source_type: 'creator_experience',
      },
      '공항 도착 후 현지 회선 켜기': {
        description: '도착 후 현지 회선을 켜고 데이터 연결을 확인합니다.',
        why: '현지 지도와 메신저가 바로 연결되어야 이동 동선이 끊기지 않습니다.',
        how: '데이터 회선을 eSIM으로 바꾸고 지도 앱, 메신저, 브라우저 연결을 확인합니다.',
        completion_criteria: '지도와 메신저가 현지 데이터로 연결됩니다.',
        source_type: 'creator_experience',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-alt-phone-sk7-self-activation',
        slug: 'alt-phone-sk7-self-activation',
        title: '알뜰폰 SK7 셀프개통 체크 Flow',
        description: '유심을 받은 뒤 셀프개통 전 준비, 번호이동 사전동의, 개통 직후 통화·데이터 확인을 순서대로 체크합니다.',
        category: '통신/디지털 준비',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medium',
        source_title: '알뜰폰 SK7모바일 셀프개통 후기',
        source_url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-08',
        conversion_note: '개인 후기의 요금제 설명은 메모로 내리고, 셀프개통 가능 시간 확인, 유심 일련번호 입력, 번호이동 사전동의, 유심 교체, 통화·데이터 확인만 실행 체크리스트로 변환했습니다. 주민등록번호나 인증값은 저장하지 않습니다.',
        primary_destination: 'internal_check',
        setup_anchor_label: '개통 체크 시작',
        setup_anchor_hint: '개통 예정일, 유심 보유 여부, 번호이동 여부만 보고 순서형 체크리스트를 엽니다. 개인정보와 인증값은 FLOW에 저장하지 않습니다.',
        warning: '요금제, 개통 가능 시간, 본인인증 조건, 번호이동 제한은 통신사 공식 안내를 우선 확인하세요.',
        ...creatorMeta('FLOW 큐레이션팀', '디지털 절차 큐레이터', '온라인 절차형 콘텐츠가 캘린더보다 체크리스트 중심으로 작동하는지 확인하는 다양화 public 후보입니다.', 1320, 186),
        ...tagMeta(['통신', '알뜰폰', '셀프개통', '다양화 후보']),
      },
      altPhoneSk7SelfActivationText,
    ),
    {
      '셀프개통 가능 시간과 준비물 확인하기': {
        description: '유심, 유심 일련번호, 본인인증 수단, Wi-Fi 환경, 기존 통신사 정보를 먼저 확인합니다.',
        why: '셀프개통은 중간에 통신이 끊기거나 인증이 막히면 다시 진행하기 어렵기 때문에 준비물이 먼저 보여야 합니다.',
        how: '개통 가능 시간과 필요한 인증 수단은 통신사 공식 안내에서 확인하고, 원문 후기는 진행 순서 참고로만 둡니다.',
        completion_criteria: '유심, 인증 수단, Wi-Fi, 기존 통신사 정보가 준비됐습니다.',
        caution: '주민등록번호, 인증번호, 카드 정보 같은 민감 정보는 FLOW에 적지 않습니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '가입유형과 요금제 선택하기': {
        description: '신규가입인지 번호이동인지 정하고 사용할 요금제를 선택합니다.',
        why: '가입유형을 잘못 고르면 이후 번호이동 사전동의나 유심 정보 입력 흐름이 달라집니다.',
        how: '원문처럼 신청 전 가입유형과 요금제를 정하되, 가격 비교나 추천은 FLOW가 판단하지 않습니다.',
        completion_criteria: '가입유형과 요금제가 신청 전 확정됐습니다.',
        caution: '요금제 금액과 혜택은 변동될 수 있으므로 통신사 공식 페이지를 확인합니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '유심 일련번호와 신청 정보 입력하기': {
        description: '신청서와 셀프개통 화면에서 유심 일련번호와 필요한 신청 정보를 입력합니다.',
        why: '원문에서 반복해서 등장하는 막힘 지점은 유심 정보와 번호이동 정보 입력입니다.',
        how: '유심 카드에 적힌 일련번호를 보고 통신사 화면에 직접 입력합니다. FLOW에는 입력값을 저장하지 않습니다.',
        completion_criteria: '유심 일련번호 입력 단계가 통신사 화면에서 완료됐습니다.',
        caution: '개인 식별정보와 인증값은 통신사 화면에만 입력하고 FLOW 메모에는 남기지 않습니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '번호이동 사전동의 처리하기': {
        description: '기존 통신사 문자나 ARS 안내에서 위약금, 잔여 할부금, 소멸 혜택을 확인하고 동의합니다.',
        why: '번호이동 사용자는 이 단계가 끝나야 새 통신사 개통이 진행됩니다.',
        how: '기존 통신사에서 온 문자 또는 ARS 안내를 확인하고, 동의 완료 여부만 FLOW에 체크합니다.',
        completion_criteria: '번호이동 사전동의가 완료됐습니다.',
        caution: '위약금, 할부금, 결합 혜택 소멸 여부는 기존 통신사 안내를 직접 확인합니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '유심 교체 후 재부팅하기': {
        description: '개통 완료 후 새 유심을 장착하고 휴대폰을 재부팅합니다.',
        why: '원문은 개통 완료 뒤 유심 교체와 재부팅을 해야 실제 사용 상태가 된다고 설명합니다.',
        how: '기존 유심을 빼고 새 유심을 장착한 뒤 전원을 껐다 켭니다. 인식이 늦으면 한 번 더 재부팅합니다.',
        completion_criteria: '새 유심이 장착됐고 휴대폰 재부팅을 완료했습니다.',
        caution: '개통 완료 전 유심을 바꾸면 통화가 끊길 수 있으니 통신사 화면의 완료 상태를 먼저 확인합니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '통화·문자·데이터 연결 확인하기': {
        description: '통화, 문자, 데이터 연결이 정상인지 확인하고 안 되면 공식 고객센터 안내로 이동합니다.',
        why: '셀프개통 Flow의 완료 기준은 신청 완료가 아니라 실제 통신이 되는지 확인하는 것입니다.',
        how: '짧은 통화 테스트, 문자 수신, 모바일 데이터 브라우징을 확인합니다. 실패하면 공식 고객센터 또는 개통 안내를 봅니다.',
        completion_criteria: '통화, 문자, 데이터가 모두 연결됩니다.',
        caution: '연결 실패 원인 판단은 FLOW가 하지 않습니다. 공식 고객센터와 통신사 안내를 우선합니다.',
        links: [
          {
            label: 'SK7 셀프개통 후기 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-infant-health-checkup-prep',
        slug: 'infant-health-checkup-prep',
        title: '영유아 건강검진 예약 준비 Flow',
        description: '검진 예정일을 기준으로 검진 기간 확인, 기관 예약, 문진표/발달선별 작성, 등록번호 준비, 방문 체크를 일정으로 나눕니다.',
        category: '육아/행정',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '국민건강보험 영유아 건강검진 안내',
        source_url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
        conversion_note: '공식 안내의 검진 시기 확인, 웹 문진표/발달선별검사지 작성, 등록번호 4자리 저장, 검진기관 예약/방문 절차만 D-14~D-Day 준비 일정으로 변환했습니다. 검진 결과 해석, 성장 평가 기록, 진단/치료 판단은 Flow에 넣지 않습니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '검진 예정일',
        setup_anchor_hint: '검진 예정일을 넣으면 D-14 기간 확인, D-10 예약, D-3 문진표/발달선별, D-1 방문 준비, D-Day 방문 체크가 배치됩니다.',
        warning: 'FLOW는 영유아 건강검진의 방문 준비만 돕습니다. 검진 결과 해석, 성장·발달 판단, 치료 상담은 검진기관과 의료진 안내를 우선하세요.',
        ...creatorMeta('FLOW 큐레이션팀', '육아 행정 큐레이터', '공식 검진 안내를 의료 기록 앱이 아니라 방문 준비 캘린더로 바꾸는 Stage 0 후보입니다.', 1680, 246),
        ...tagMeta(['육아', '건강검진', '문진표', '공식 안내', 'Stage 0 후보']),
      },
      infantHealthCheckupPrepText,
    ),
    {
      '검진 가능 기간과 기관 후보 확인하기': {
        description: '월령별 검진 기간과 방문 가능한 검진기관 후보를 확인합니다.',
        why: '공식 안내는 검진표의 검진 기간 내에 받아야 하며, 기간과 기관 확인이 먼저라고 설명합니다.',
        how: '검진표, 건강iN, 공단 고객상담센터 안내로 검진 가능 기간을 확인하고 집/어린이집 동선에 맞는 기관 후보를 적습니다.',
        completion_criteria: '검진 가능 기간과 기관 후보가 확인됐습니다.',
        caution: '검진 대상 여부와 기간은 최신 공식 안내 또는 공단/기관 안내를 우선합니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
      '검진기관 예약하기': {
        description: '검진기관에 예약 가능 시간, 주소, 방문 안내를 확인합니다.',
        why: '공식 안내는 장시간 대기 불편을 줄이기 위해 미리 검진 예약 후 방문하는 것이 편리하다고 설명합니다.',
        how: '기관에 연락해 예약 시간, 보호자 확인 방식, 문진표 작성 방식, 주차/접수 위치를 메모합니다.',
        completion_criteria: '예약 일시와 검진기관 정보가 저장됐습니다.',
        caution: '기관별 운영 시간과 접수 방식은 다를 수 있으므로 해당 기관 안내를 따릅니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
      '웹 문진표와 발달선별검사지 작성 확인하기': {
        description: '건강iN에서 문진표 또는 발달선별검사지 작성이 필요한지 확인하고 작성합니다.',
        why: '원문은 검진기관에서 아이를 달래며 작성하면 시간이 오래 걸리므로 가정에서 미리 작성하면 편리하다고 설명합니다.',
        how: '건강iN에서 문진표 작성 또는 발달선별검사지 작성 버튼을 확인합니다. 발달선별검사는 2차 검진부터 시작한다는 원문 주석을 함께 둡니다.',
        completion_criteria: '문진표 또는 해당 월령의 발달선별검사지 작성 상태를 확인했습니다.',
        caution: '발달선별검사지 대상 여부와 작성 방식은 월령과 공식 안내를 확인합니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
      '등록번호 4자리 저장 위치 정하기': {
        description: '검진기관에 알려줄 등록번호 4자리를 보호자가 찾을 수 있는 곳에 저장합니다.',
        why: '공식 안내는 인터넷 문진표/발달선별검사지 전송을 위해 등록번호를 검진기관에 알려주어야 한다고 설명합니다.',
        how: '등록번호 자체는 안전한 메모 위치에 두고, FLOW에는 “등록번호 확인 위치”만 적습니다.',
        completion_criteria: '방문 당일 등록번호를 찾을 위치가 정해졌습니다.',
        caution: '등록번호와 개인정보는 필요한 사람에게만 공유하고, 공개 메모나 공유 화면에 남기지 않습니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
      '방문 준비물과 질문 메모 정리하기': {
        description: '등록번호 확인 위치, 보호자 확인 수단, 아이 상태와 질문할 내용을 한 줄로 정리합니다.',
        why: '방문 전날 준비를 줄이면 접수와 문진표 확인에 쓰는 시간을 줄일 수 있습니다.',
        how: '아이 컨디션, 수면/식사 특이사항, 검진기관에 물어볼 질문만 짧게 적습니다. 결과 해석이나 진단 기록은 만들지 않습니다.',
        completion_criteria: '방문 준비 메모가 한 줄로 정리됐습니다.',
        caution: '아이 상태가 급격히 나빠졌다면 예약 체크보다 의료기관 상담을 우선합니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
      '예약 시간에 검진기관 방문하기': {
        description: '예약 시간에 방문하고, 온라인 문진표/발달선별검사지 등록번호를 접수 시 전달합니다.',
        why: '원문은 인터넷 작성 자료를 검진기관이 전송받으려면 등록번호를 알려줘야 한다고 설명합니다.',
        how: '접수 시 예약자 정보와 등록번호를 알려주고, 기관 안내에 따라 검진을 받습니다.',
        completion_criteria: '검진기관 방문과 접수를 완료했습니다.',
        caution: '검진 결과 해석과 후속 조치는 검진기관과 의료진 안내를 따릅니다.',
        links: [
          {
            label: '국민건강보험 영유아 건강검진 웹 서비스 안내',
            url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medical_sensitive',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-chiangmai-solo-trip-packing',
        slug: 'chiangmai-solo-trip-packing',
        title: '치앙마이 혼자 여행 준비물 체크 Flow',
        description: '출국일을 기준으로 혼자/장기체류 여행의 통신, 결제, 보험·비상 메모, 짐 압축, 숙소 생활용품을 체크합니다.',
        category: '여행/장기체류',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'end_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '치앙마이 혼자 여행 준비물 체크리스트',
        source_url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-08',
        conversion_note: '원문의 장기 혼자 여행 준비물, PDF 체크리스트, 유심/eSIM, GLN/현금/카드, 여행자보험, 비상약/연락처, 압축팩, 필터 샤워기 단서만 출국 전 준비 체크로 변환했습니다. 상품 추천, 보험 보장, 안전 보장은 Flow가 판단하지 않습니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '출국일',
        setup_anchor_hint: '출국일을 넣으면 D-7 통신/결제, D-5 보험/비상 메모, D-1 짐과 숙소 생활용품 체크가 배치됩니다.',
        warning: '상품 구매, 보험 보장, 결제 가능 여부, 여행 안전은 최신 공식/서비스 안내를 확인하세요. 원문은 개인 경험 참고로만 표시합니다.',
        ...creatorMeta('FLOW 큐레이션팀', '장기체류 여행 큐레이터', '혼자/장기체류 여행 준비물 콘텐츠가 일반 여행 체크리스트와 다르게 작동하는지 확인하는 다양화 public 후보입니다.', 1460, 218),
        ...tagMeta(['여행', '장기체류', '치앙마이', '준비물', '다양화 후보']),
      },
      chiangmaiSoloTripPackingText,
    ),
    {
      '메인폰과 비상폰 통신 수단 정하기': {
        description: '메인폰 유심/eSIM과 비상용 통신 수단을 정하고 구매 링크나 설정 링크는 메모에 둡니다.',
        why: '혼자 장기체류 여행은 지도, 숙소 연락, 결제 인증이 끊기면 바로 불편해지므로 원문처럼 통신 수단을 먼저 정리합니다.',
        how: '메인폰에 쓸 유심/eSIM을 정하고, 보조폰이나 예비 통신 수단이 필요한지만 체크합니다. 상품 비교는 FLOW가 대신하지 않습니다.',
        completion_criteria: '메인 통신 수단과 예비 통신 수단 여부가 정해졌고 원문 링크가 저장됐습니다.',
        caution: '통신 상품 조건, 개통 가능 기기, 현지 지원 여부는 판매처와 통신사 최신 안내를 확인합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '현금·GLN·카드 결제 수단 확인하기': {
        description: '현금, GLN, 카드처럼 서로 다른 결제 수단을 최소 두 가지 이상 준비합니다.',
        why: '원문은 현금과 GLN 같은 현지 결제 준비를 다루며, 장기체류자는 한 가지 결제 수단에만 의존하기 어렵습니다.',
        how: '필요한 현금 범위, GLN 사용 여부, 카드 예비 수단을 정하고 앱 설치나 환전 링크는 메모에 붙입니다.',
        completion_criteria: '현금·GLN·카드 중 사용할 결제 수단 2개 이상이 정해졌습니다.',
        caution: '환율, 수수료, 결제 가능 가맹점은 계속 바뀌므로 금융/결제 서비스 최신 안내를 확인합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '여행자보험 가입 여부 확인하기': {
        description: '여행자보험 가입 여부를 정하고, 가입했다면 증권 링크와 긴급 연락처 위치만 메모합니다.',
        why: '원문 준비물에는 보험이 포함되지만, FLOW의 역할은 보장 해석이 아니라 가입 여부와 찾을 위치를 놓치지 않게 하는 것입니다.',
        how: '가입/미가입 상태를 선택하고 보험사 링크, 증권 보관 위치, 긴급 연락처 확인 위치만 남깁니다.',
        completion_criteria: '보험 가입 여부와 필요 시 증권/연락처를 찾을 위치가 정해졌습니다.',
        caution: '보장 범위, 청구 조건, 제외 항목은 보험사 약관과 공식 안내를 확인합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '비상약과 현지 연락 메모 준비하기': {
        description: '비상약, 숙소 연락처, 현지 긴급 연락처, 보험사 연락처를 한 메모에 모읍니다.',
        why: '혼자 여행자는 아플 때나 길이 막혔을 때 바로 열 수 있는 비상 메모가 필요합니다.',
        how: '지사제, 밴드, 개인 상비약 여부를 체크하고 숙소·보험사·현지 긴급 연락처를 짧은 메모로 정리합니다.',
        completion_criteria: '비상약 체크와 현지 연락 메모 1개가 완성됐습니다.',
        caution: '의료 판단, 약 복용, 안전 상황은 공식 안내와 의료진/현지 긴급기관 안내를 우선합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '압축팩과 의류 짐 줄이기': {
        description: '체류 기간과 날씨에 맞춰 의류를 줄이고 압축팩으로 부피를 정리합니다.',
        why: '원문은 장기 여행 짐의 부피를 줄이는 준비물 단서를 제공하며, 사용자는 출국 전 실제 가방에 넣을 항목만 고르면 됩니다.',
        how: '날씨, 세탁 가능 여부, 이동 횟수를 보고 의류를 줄인 뒤 압축팩 사용 여부를 체크합니다.',
        completion_criteria: '가져갈 의류 묶음과 압축팩 사용 여부가 정해졌습니다.',
        caution: '항공사 수하물 규정과 현지 날씨는 출국 전 다시 확인합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '필터 샤워기와 숙소 생활용품 챙기기': {
        description: '필터 샤워기, 여분 필터, 물티슈, 지퍼백 같은 숙소 생활용품 중 필요한 것만 고릅니다.',
        why: '원문은 장기체류 숙소에서 실제 쓴 생활용품을 제시하므로, FLOW는 필요한 항목을 고르고 링크를 보관하는 정도면 충분합니다.',
        how: '숙소 유형과 체류 기간을 보고 필요한 생활용품만 선택합니다. 특정 상품 링크는 메모에 넣고 필수 준비물처럼 표시하지 않습니다.',
        completion_criteria: '숙소 생활용품 체크가 끝났고 구매/참고 링크가 필요하면 메모에 저장됐습니다.',
        caution: '숙소 규칙, 항공 보안 규정, 상품 품질은 직접 확인합니다.',
        links: [
          {
            label: '치앙마이 혼자 여행 준비물 체크리스트 원문',
            url: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-lease-contract-report-deadline',
        slug: 'lease-contract-report-deadline',
        title: '주택 임대차계약 신고 마감 Flow',
        description: '계약일을 기준으로 신고 대상 확인, 계약서·인증수단 준비, 온라인/방문 신고, 접수 상태와 신고필증 확인을 30일 안에 처리합니다.',
        category: '주거/행정',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: '부동산거래관리시스템 주택임대차신고 서비스 안내',
        source_url: 'https://rtms.molit.go.kr/main/serviceInfo.do',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
        conversion_note: 'RTMS/정부24/정책브리핑의 공식 안내에서 계약 체결일 30일 이내 신고, 보증금·월세 신고대상 기준, 방문/온라인 신고, 계약서 첨부 시 단독신고 가능, 접수·처리 상태 확인, 신고필증/확정일자 확인 단서만 실행 일정으로 변환했습니다. 개인 블로그는 화면 순서 참고로만 두고, 주민등록번호·인증값·계약 상세 금액은 FLOW 입력 필드로 만들지 않습니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '계약일',
        setup_anchor_hint: '계약일을 넣으면 D-Day 대상 확인, D+7 준비, D+20 신고서 작성, D+30 접수·필증 확인 일정이 배치됩니다.',
        warning: '신고 대상 여부, 과태료, 법적 효력, 확정일자 효력은 최신 RTMS·정부24·관할 주민센터 안내를 확인하세요. FLOW는 마감과 준비 체크만 돕습니다.',
        ...creatorMeta('생활 행정 노트', '생활 행정 큐레이터', '공식 행정 마감 콘텐츠가 개인정보 저장 없이 캘린더와 준비 체크로 작동하는지 확인하는 다양화 public 후보입니다.', 1240, 176),
        ...tagMeta(['주거', '임대차', '신고', '행정 마감', '다양화 후보']),
      },
      leaseContractReportDeadlineText,
    ),
    {
      '신고 대상과 30일 마감 확인하기': {
        description: '계약일, 주택 소재지, 보증금·월세 기준을 공식 안내에서 확인하고 30일 마감일을 캘린더에 둡니다.',
        why: 'RTMS는 임대인과 임차인이 계약 체결일로부터 30일 이내 공동신고하는 구조를 안내하며, 신고대상 기준도 지역과 금액에 따라 달라집니다.',
        how: 'RTMS 서비스 안내에서 신고대상 기준과 신고지역을 확인합니다. FLOW에는 대상 여부 확정값보다 “공식 확인 완료”와 마감일만 남깁니다.',
        completion_criteria: '공식 안내에서 신고 대상 여부를 확인했고 계약일 기준 30일 마감일이 정해졌습니다.',
        caution: '신고 대상 여부와 과태료는 FLOW가 판단하지 않습니다. 최신 공식 안내와 관할 기관 확인을 우선합니다.',
        links: [
          {
            label: 'RTMS 주택임대차신고 서비스 안내',
            url: 'https://rtms.molit.go.kr/main/serviceInfo.do',
            type: 'official',
          },
          {
            label: '정책브리핑 주택 임대차 신고제 Q&A',
            url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148888119',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '계약서와 인증수단 준비하기': {
        description: '계약서 원본/스캔본, 본인 확인 수단, 대리 신고 여부를 준비합니다.',
        why: '공식 안내는 계약서 또는 계약 입증서류가 있으면 신고할 수 있고, 계약서를 제출하면 확정일자 자동부여와 연결된다고 설명합니다.',
        how: '계약서 파일 위치와 인증수단 보유 여부만 체크합니다. 주민등록번호, 인증번호, 계약 상세 금액은 FLOW 메모에 적지 않습니다.',
        completion_criteria: '계약서 파일 위치와 필요한 인증수단이 준비됐습니다.',
        caution: '개인 식별정보, 인증값, 계약서 원문은 FLOW에 저장하지 않습니다.',
        links: [
          {
            label: '정부24 주택 임대차신고 민원안내',
            url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010',
            type: 'official',
          },
          {
            label: '주택임대차계약신고 블로그 절차 참고',
            url: 'https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365',
            type: 'creator',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '방문 또는 온라인 신고 방식 정하기': {
        description: '주택 소재지 관할 주민센터 방문으로 할지, RTMS/정부24 흐름으로 온라인 신고할지 정합니다.',
        why: '공식 안내는 목적물 소재지 관할 주민센터 방문신고와 부동산거래관리시스템 온라인 신고를 모두 제시합니다.',
        how: '방문이면 관할 주민센터와 방문 가능 시간을 확인하고, 온라인이면 RTMS 접속과 로그인 가능 여부를 확인합니다.',
        completion_criteria: '신고 방식과 접속/방문 경로가 정해졌습니다.',
        caution: '관할 기관과 온라인 처리 가능 여부는 실제 접수기관 안내를 확인합니다.',
        links: [
          {
            label: 'RTMS 주택임대차신고 서비스 안내',
            url: 'https://rtms.molit.go.kr/main/serviceInfo.do',
            type: 'official',
          },
          {
            label: '정부24 주택 임대차신고 민원안내',
            url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '부동산거래관리시스템 신고서 작성하기': {
        description: 'RTMS 또는 정부24 연결 화면에서 신청인, 임대인·임차인, 목적물, 계약 내용을 계약서 기준으로 작성합니다.',
        why: '블로그 절차와 공식 안내 모두 온라인 신고서 작성과 접수 상태 확인을 핵심 단계로 둡니다.',
        how: '공식 사이트에서 직접 입력하고, FLOW에는 “작성 시작/임시저장/작성 완료” 같은 처리 상태만 체크합니다.',
        completion_criteria: '공식 사이트에서 신고서 작성 또는 임시저장을 완료했습니다.',
        caution: '계약 상세정보와 개인정보는 공식 사이트에만 입력하고 FLOW에는 저장하지 않습니다.',
        links: [
          {
            label: 'RTMS 주택임대차신고 서비스 안내',
            url: 'https://rtms.molit.go.kr/main/serviceInfo.do',
            type: 'official',
          },
          {
            label: '주택임대차계약신고 블로그 절차 참고',
            url: 'https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365',
            type: 'creator',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '전자서명과 접수 상태 확인하기': {
        description: '전자서명 또는 제출 후 접수 완료 상태와 보완 요청 여부를 확인합니다.',
        why: '정책브리핑 Q&A는 온라인 사이트에서 진행 상황 확인이 가능하고 서류 보완 등은 문자로 안내될 수 있다고 설명합니다.',
        how: '공식 사이트의 접수/완료 상태를 확인하고, 보완 요청이 있으면 보류 메모에 “보완 필요”만 남깁니다.',
        completion_criteria: '접수 완료 또는 보완 필요 상태를 확인했습니다.',
        caution: '보완 요청 내용과 법적 처리 상태는 관할 기관 안내를 따릅니다.',
        links: [
          {
            label: '정책브리핑 주택 임대차 신고제 Q&A',
            url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148888119',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '신고필증과 확정일자 표시 확인하기': {
        description: '신고필증 발급 여부와 계약서 제출 시 확정일자 표시 여부를 확인하고 저장 위치만 메모합니다.',
        why: '정책브리핑 Q&A는 계약서 제출 시 임대차계약신고필증에 확정일자 번호가 표시된다고 설명합니다.',
        how: '신고필증 파일은 안전한 개인 저장소에 두고, FLOW에는 저장 위치와 확인 완료 여부만 남깁니다.',
        completion_criteria: '신고필증 또는 처리 상태 확인이 끝났고 저장 위치가 정해졌습니다.',
        caution: '확정일자 효력과 권리 관계 판단은 공식 안내와 전문가 상담을 우선합니다.',
        links: [
          {
            label: '정책브리핑 주택 임대차 신고제 Q&A',
            url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148888119',
            type: 'official',
          },
          {
            label: '정부24 주택 임대차신고 민원안내',
            url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-jeonse-contract-precheck-docs',
        slug: 'jeonse-contract-precheck-docs',
        title: '전세계약 전 서류 체크 Flow',
        description: '계약 예정일을 기준으로 시세, 등기부등본, 보증보험, 계약서 정보 일치, 입주 후 보호 절차를 확인하고 이상 항목은 보류 메모로 남깁니다.',
        category: '주거/계약전점검',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'financial_sensitive',
        source_title: "카카오페이 페이어텐션 - 전세 계약할 때 '이것' 꼭 확인하세요",
        source_url: 'https://contents.kakaopay.com/contents/2056',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-08',
        conversion_note: '카카오페이 콘텐츠가 안내한 국토교통부 전세사기 예방 체크리스트의 계약 전/계약 시/계약 후 핵심 점검 단서만 Flow로 변환했습니다. 보험 상품 안내는 추천으로 쓰지 않고, 시세·등기부등본·보증보험 가능 여부·중개사/계약서 확인·확정일자/임대차신고·보류 사유 메모만 남깁니다. 법률 판단과 계약 진행 결론은 만들지 않습니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '계약 예정일',
        setup_anchor_hint: '계약 예정일을 넣으면 D-3 계약 전 서류 확인, D-Day 계약서 정보 일치 확인, D+1 입주 후 보호 절차 체크가 생성됩니다.',
        warning: 'FLOW는 법률 판단이나 계약 진행 결론을 제공하지 않습니다. 주민등록번호, 계좌번호, 계약서 원문, 계약금 영수증 원본은 FLOW에 저장하지 말고 공인중개사·공식기관·전문가 확인을 우선하세요.',
        ...creatorMeta('생활 행정 노트', '주거 계약 체크 큐레이터', '공식 체크리스트가 들어간 생활 계약 콘텐츠를 가벼운 확인/보류 Flow로 바꿀 수 있는지 검증하는 제작자 자료 확장 후보입니다.', 1360, 184),
        ...tagMeta(['주거', '전세계약', '체크리스트', '보류', '제작자 자료 확장']),
      },
      jeonseContractPrecheckDocsText,
    ),
    {
      '시세와 등기부등본 권리관계 확인하기': {
        description: '주변 시세와 등기부등본의 소유자, 근저당, 압류 등 권리관계를 확인합니다.',
        why: '원문은 계약 전 단계에서 시세 점검과 등기부등본 확인을 핵심 포인트로 제시합니다.',
        how: '주변 시세를 비교하고 등기부등본에서 실제 소유자, 선순위 권리, 압류/가압류 여부를 확인합니다. 이상 항목은 보류 사유로 남깁니다.',
        completion_criteria: '시세와 등기부등본 확인 상태가 체크됐고, 이상 항목이 있으면 보류 메모가 생겼습니다.',
        caution: '등기부등본 해석과 계약 진행 판단은 공인중개사·전문가 확인 대상입니다.',
        links: [
          {
            label: "카카오페이 전세 계약 체크 콘텐츠",
            url: 'https://contents.kakaopay.com/contents/2056',
            type: 'creator',
          },
          {
            label: '대한민국 법원 인터넷등기소',
            url: 'https://www.iros.go.kr',
            type: 'official',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '전세보증보험 가능 여부 확인하기': {
        description: '해당 주택이 전세보증보험 가입 대상인지 공식/전문가 확인 대상으로 표시합니다.',
        why: '원문은 계약 전 보증보험 가입 가능 여부 점검을 핵심 포인트로 안내합니다.',
        how: '보증기관, 공인중개사, 공식 안내에서 가입 가능 여부를 확인하고 FLOW에는 확인 전/확인 완료/보류만 남깁니다.',
        completion_criteria: '보증보험 가능 여부 확인 상태가 표시됐고, 불확실하면 보류 메모가 남았습니다.',
        caution: '보증보험 가입 가능 여부와 보장 범위는 FLOW가 판단하지 않습니다.',
        links: [
          {
            label: "카카오페이 전세 계약 체크 콘텐츠",
            url: 'https://contents.kakaopay.com/contents/2056',
            type: 'creator',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '중개사와 표준계약서 확인하기': {
        description: '중개사 등록번호와 표준계약서 사용 여부를 계약 당일 체크합니다.',
        why: '원문은 계약 시 중개사 등록번호·대표자 실명 확인과 표준계약서 사용을 중요 포인트로 요약합니다.',
        how: '중개사 등록번호, 대표자, 표준계약서 사용 여부를 확인하고, 확인 어려운 항목은 보류 사유로 적습니다.',
        completion_criteria: '중개사와 계약서 양식 확인이 끝났습니다.',
        caution: '계약서 문구 해석과 특약 판단은 전문가 확인 대상으로 분리합니다.',
        links: [
          {
            label: "카카오페이 전세 계약 체크 콘텐츠",
            url: 'https://contents.kakaopay.com/contents/2056',
            type: 'creator',
          },
          {
            label: '국토교통부 정책자료',
            url: 'https://www.molit.go.kr',
            type: 'official',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '계약서 정보 일치 여부 확인하기': {
        description: '주소, 면적, 보증금, 임대인 정보가 실제 매물과 등기부등본 정보와 맞는지 확인합니다.',
        why: '원문은 계약서 정보 일치 여부 확인을 계약 시 핵심 포인트로 제시합니다.',
        how: '계약서의 주소, 면적, 보증금, 임대인 정보를 실제 매물·등기부등본과 대조합니다. 계약금·계좌번호·주민등록번호는 FLOW에 적지 않습니다.',
        completion_criteria: '계약서 정보 일치 확인이 끝났거나 보류 사유가 기록됐습니다.',
        caution: 'FLOW는 법률 판단이나 계약 진행 결론을 제공하지 않습니다.',
        links: [
          {
            label: "카카오페이 전세 계약 체크 콘텐츠",
            url: 'https://contents.kakaopay.com/contents/2056',
            type: 'creator',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '확정일자와 임대차신고 일정 저장하기': {
        description: '입주 직후 확정일자, 전입신고, 임대차신고 일정을 후속 체크로 저장합니다.',
        why: '원문은 계약 후 확정일자와 임대차신고로 보호 절차를 마무리하라고 안내합니다.',
        how: '입주일 직후 해야 할 보호 절차를 일정으로 남기고, 신고 대상·효력 판단은 공식 안내에서 확인합니다.',
        completion_criteria: '입주 후 보호 절차 일정이 저장됐습니다.',
        caution: '확정일자 효력, 대항력, 신고 대상 여부는 공식기관 확인 대상입니다.',
        links: [
          {
            label: '정부24',
            url: 'https://www.gov.kr',
            type: 'official',
          },
          {
            label: '부동산거래관리시스템',
            url: 'https://rtms.molit.go.kr',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'financial_sensitive',
      },
      '전세보증보험 가입 확인하기': {
        description: '입주 후 보증보험 가입 진행 여부를 다시 확인합니다.',
        why: '원문은 계약 후 보증금 보호 절차 중 하나로 전세보증보험 가입 확인을 제시합니다.',
        how: '보증기관 또는 전문가 안내에 따라 가입 가능 여부와 진행 상태를 확인합니다. FLOW에는 확인 상태와 문의 대상만 남깁니다.',
        completion_criteria: '보증보험 가입 가능/진행/보류 상태가 표시됐습니다.',
        caution: '상품 추천, 가입 가능 보장, 보장 범위 판단은 하지 않습니다.',
        links: [
          {
            label: "카카오페이 전세 계약 체크 콘텐츠",
            url: 'https://contents.kakaopay.com/contents/2056',
            type: 'creator',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
      '보류 사유와 문의 대상 메모하기': {
        description: '이상 항목이 있으면 계약 결론 대신 보류 사유와 문의할 기관/전문가를 남깁니다.',
        why: '전세계약 체크 Flow의 핵심은 사용자를 계약 결론으로 밀어 넣는 것이 아니라 의심 항목에서 멈추게 하는 것입니다.',
        how: '소유자 불일치, 근저당, 보증보험 불가, 계약서 정보 불일치처럼 걸리는 항목을 보류 사유로 적고 문의 대상을 지정합니다.',
        completion_criteria: '보류 사유와 다음 문의 대상이 기록됐습니다.',
        caution: '보류는 실패가 아니라 정상 결과입니다. 계약 진행 여부는 전문가 확인 후 결정합니다.',
        links: [
          {
            label: '국토교통부',
            url: 'https://www.molit.go.kr',
            type: 'official',
          },
        ],
        source_type: 'reference',
        risk_level: 'financial_sensitive',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-picture-book-reading-routine',
        slug: 'picture-book-reading-routine',
        title: '그림책 읽기 루틴 + 질문 카드 Flow',
        description: '읽을 요일과 책 제목을 정하고, 읽기 전 표지 질문, 함께 읽기, 읽은 후 한 줄 메모를 독서 루틴에 붙입니다.',
        category: '육아/독서',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '토토북 그림책 독서 지도안',
        source_url: 'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
        source_status: 'preview',
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
        conversion_note: '기존 2015 워크북 PDF가 반복 검사에서 404로 확인되어 공개 노출을 중단했습니다. 현재 그림책 지도안으로 질문 행을 다시 확인하기 전까지 preview로 유지합니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '첫 독서일',
        setup_anchor_hint: '첫 독서일과 읽을 요일을 정하면 오늘 책, 표지 질문 카드, 함께 읽기, 읽은 후 한 줄 메모 카드가 반복 루틴에 붙습니다.',
        warning: '교육 효과, 독서 수준, 발달 평가는 FLOW가 판단하지 않습니다. 지도안과 제작자 후기는 보호자가 참고하는 질문 카드로만 사용합니다.',
        ...creatorMeta('FLOW 큐레이션팀', '독서/놀이 큐레이터', '책 콘텐츠가 별도 학습관리 앱이 아니라 반복 독서 루틴 안의 질문 카드로 작동하는지 확인하는 다양화 public 후보입니다.', 1020, 142),
        ...tagMeta(['육아', '독서', '그림책', '질문 카드', '다양화 후보']),
      },
      pictureBookReadingRoutineText,
    ),
    {
      '오늘 읽을 그림책과 질문 카드 고르기': {
        description: '오늘 읽을 책 제목과 사용할 질문 카드 1개를 고릅니다.',
        why: '독서 Flow의 첫 행동은 긴 지도안을 읽는 것이 아니라 오늘 책과 질문 하나를 정하는 것입니다.',
        how: '책 제목을 적고, 지도안 PDF나 제작자 리뷰에서 읽기 전 질문 하나만 골라 메모에 붙입니다.',
        completion_criteria: '오늘 책 제목과 질문 카드 1개가 정해졌습니다.',
        caution: '책 전체 지도안을 모두 입력하지 않습니다. 오늘 쓸 질문 하나만 남깁니다.',
        links: [
          {
            label: '토토북 그림책 독서 지도안 PDF',
            url: 'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
            type: 'official',
          },
          {
            label: '그림책 하브루타 리뷰 예시',
            url: 'https://blog.naver.com/PostView.nhn?blogId=now_dream&logNo=222108102133',
            type: 'creator',
          },
        ],
        source_type: 'official',
        risk_level: 'low',
      },
      '표지 보고 이야기 나누기': {
        description: '표지와 제목을 보고 어떤 이야기일지 아이에게 물어봅니다.',
        why: '기존 독서 지도안은 읽기 전 활동을 따로 두며, 보호자는 이를 짧은 대화 카드로 쓰면 됩니다.',
        how: '“무슨 일이 생길 것 같아?”처럼 답이 정해지지 않은 질문을 하나만 던집니다.',
        completion_criteria: '읽기 전 대화를 한 번 나눴습니다.',
        caution: '정답을 맞히게 하거나 독해 점수처럼 기록하지 않습니다.',
        links: [
          {
            label: '토토북 그림책 독서 지도안 PDF',
            url: 'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'low',
      },
      '그림책 함께 읽기': {
        description: '아이와 그림책 한 권을 끝까지 읽습니다.',
        why: 'FlowMe가 해야 할 일은 독서법을 설명하는 것이 아니라 실제 읽는 시간을 캘린더에 붙이는 것입니다.',
        how: '정해 둔 독서 시간에 책을 읽고, 아이가 멈춘 장면은 다음 카드에서 짚습니다.',
        completion_criteria: '그림책 1권을 함께 읽었습니다.',
        caution: '읽기 시간은 짧아도 됩니다. 분량 목표보다 실제 읽기 완료를 우선합니다.',
        links: [
          {
            label: '토토북 그림책 독서 지도안 PDF',
            url: 'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'low',
      },
      '아이가 고른 장면 짚어보기': {
        description: '읽는 중 아이가 오래 보거나 다시 보려는 장면을 하나만 짚습니다.',
        why: '질문 카드형 Flow는 보호자가 아이 반응을 길게 기록하지 않아도 다음 대화로 이어지게 해야 합니다.',
        how: '“여기서 뭐가 제일 재미있어?”처럼 장면 하나에 연결된 질문을 합니다.',
        completion_criteria: '아이가 고른 장면 1개를 확인했습니다.',
        caution: '아이 반응을 평가하거나 비교하지 않습니다.',
        links: [
          {
            label: '그림책 하브루타 리뷰 예시',
            url: 'https://blog.naver.com/PostView.nhn?blogId=now_dream&logNo=222108102133',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '기억나는 장면이나 단어 묻기': {
        description: '읽은 뒤 기억나는 장면, 단어, 느낌 중 하나만 물어보고 한 줄로 남깁니다.',
        why: '읽은 후 활동은 독후감 전체가 아니라 다음 독서로 이어질 한 줄이면 충분합니다.',
        how: '아이의 말을 그대로 적거나 보호자가 기억한 장면을 한 줄로 적습니다.',
        completion_criteria: '아이 말 또는 보호자 메모 한 줄을 남겼습니다.',
        caution: '독서감상문, 독해 점수, 학습 성과표로 확장하지 않습니다.',
        links: [
          {
            label: '토토북 그림책 독서 지도안 PDF',
            url: 'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'low',
      },
      '다음에 읽을 책 후보 남기기': {
        description: '다음 독서 루틴에서 읽을 책 후보나 질문 후보를 하나만 남깁니다.',
        why: '독서 루틴은 한 번 읽고 끝나는 것이 아니라 다음 책 선택으로 이어질 때 반복 가치가 생깁니다.',
        how: '오늘 반응이 좋았던 주제, 비슷한 책, 다시 읽고 싶은 장면 중 하나를 다음 후보로 적습니다.',
        completion_criteria: '다음 책 또는 다음 질문 후보 1개가 저장됐습니다.',
        caution: '권장도서 목록 전체를 캘린더에 깔지 않습니다.',
        links: [
          {
            label: '그림책 하브루타 리뷰 예시',
            url: 'https://blog.naver.com/PostView.nhn?blogId=now_dream&logNo=222108102133',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-kids-printable-squishy-craft',
        slug: 'kids-printable-squishy-craft',
        title: '아이 도안 스퀴시 만들기 준비 Flow',
        description: '주말 놀이 날짜를 기준으로 원문 도안 링크, 사용 조건, 출력과 재료, 보호자 사전 작업, 놀이 당일 정리만 가볍게 체크합니다.',
        category: '육아/아이 놀이',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '메이크잇 무료도안 겨울 간식꾸러미 스퀴시 만들기',
        source_url: 'https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-10',
        conversion_note: '제작자 도안 원문은 복제하지 않고 링크와 사용 조건 확인만 Flow에 남깁니다. FlowMe는 도안 파일, 비밀번호, 다운로드 파일, 아이 사진, 교육 평가 기록을 저장하지 않으며 출력/재료/보호자 사전 작업/놀이 후 정리만 실행 체크로 옮깁니다.',
        primary_destination: 'hybrid',
        setup_anchor_label: '놀이 날짜',
        setup_anchor_hint: '놀이 날짜를 넣으면 전날 원문 링크 확인, 도안 출력, 재료 준비와 당일 만들기/정리 체크가 만들어집니다.',
        warning: '도안 이미지와 파일은 원문에서 확인합니다. FlowMe는 제작자 자료를 복제하거나 재배포하지 않고, 아이 사진이나 발달/교육 평가 기록도 저장하지 않습니다.',
        ...creatorMeta('FLOW 큐레이션', '가족 놀이 Flow 큐레이터', '제작자 도안 콘텐츠를 원문 링크와 실행 체크로 분리해, 저작물 복제 없이 가정 놀이 준비 Flow가 되는지 확인하는 public 후보입니다.', 860, 104),
        ...tagMeta(['육아', '아이 놀이', '도안', '스퀴시', '제작자 자료 확장']),
      },
      kidsPrintableSquishyCraftText,
    ),
    {
      '원문 도안 링크와 사용 조건 저장하기': {
        why: '도안 콘텐츠는 FlowMe 안으로 복사하는 자료가 아니라 원문을 열어 확인해야 하는 제작자 자료입니다.',
        how: '원문 블로그 링크를 열고 도안 사용 조건, 다운로드 위치, 필요한 영상이나 안내를 확인합니다. FlowMe에는 원문 URL과 확인 상태만 남깁니다.',
        completion_criteria: '원문 링크와 사용 조건 확인 상태가 메모/URL로 남았습니다.',
        caution: '도안 이미지, PDF, 비밀번호, 다운로드 파일은 FlowMe에 저장하지 않습니다.',
        links: [
          {
            label: '메이크잇 무료도안 스퀴시 원문',
            url: 'https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491',
            type: 'creator',
          },
        ],
      },
      '도안 출력과 코팅 재료 준비하기': {
        why: '사용자가 실제로 막히는 지점은 도안 설명보다 출력, 코팅, 테이프, 가위 같은 준비물입니다.',
        how: '원문에서 필요한 도안 장수와 준비물을 확인하고 프린트 종이, 투명테이프나 손코팅지, 솜, 가위, 풀을 준비합니다.',
        completion_criteria: '도안 출력물과 핵심 재료가 한곳에 모였습니다.',
        caution: '재료 상품 추천이나 구매 링크 추천은 FlowMe가 하지 않습니다.',
        links: [
          {
            label: '원문 도안과 준비 안내',
            url: 'https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491',
            type: 'creator',
          },
        ],
      },
      '보호자가 미리 자를 부분 정하기': {
        why: '아이 놀이 Flow는 안전한 작업 범위를 미리 정해야 당일에 가볍게 실행됩니다.',
        how: '아이 나이에 맞춰 칼, 작은 가위, 테이프 접착처럼 보호자가 먼저 처리할 부분을 표시합니다.',
        completion_criteria: '보호자 사전 작업 범위가 정해졌습니다.',
        caution: '아이 연령에 따른 발달 평가나 안전 보증을 기록하지 않습니다.',
      },
      '아이와 스퀴시 만들기': {
        why: 'FlowMe의 핵심 실행은 원문을 보면서 당일 놀이를 시작하고 끝내는 것입니다.',
        how: '원문 예시를 열어 두고 아이가 할 수 있는 붙이기, 채우기, 꾸미기부터 진행합니다. 막히는 단계만 짧게 메모합니다.',
        completion_criteria: '스퀴시 만들기 활동을 마쳤거나 다음에 이어 할 단계가 정해졌습니다.',
        caution: '원문 제작 순서를 FlowMe가 새로 해석하거나 보증하지 않습니다.',
        links: [
          {
            label: '원문 만들기 예시',
            url: 'https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491',
            type: 'creator',
          },
        ],
      },
      '완성 사진은 선택 메모로만 남기기': {
        why: '기록은 다음 놀이를 고르는 데 도움이 되지만, 사진 업로드를 기본 요구로 만들면 앱이 무거워집니다.',
        how: '완성 여부와 아이가 좋아한 부분을 한 줄로 남깁니다. 사진은 FlowMe 기본 저장값으로 요구하지 않습니다.',
        completion_criteria: '완성 여부나 아이 반응 한 줄이 선택 메모로 남았습니다.',
        caution: '아이 얼굴 사진, 실명, 기관 제출용 기록은 저장하지 않습니다.',
      },
      '남은 도안과 재료 정리하기': {
        why: '놀이 콘텐츠는 끝난 뒤 정리가 되어야 다음 실행으로 이어집니다.',
        how: '남은 출력물과 재료를 보관하거나 버리고, 다시 쓸 수 있는 재료만 작은 메모로 남깁니다.',
        completion_criteria: '남은 도안과 재료의 보관/폐기 상태가 정리되었습니다.',
      },
      '다음 놀이 후보 메모하기': {
        why: '한 번 만든 Flow가 다음 주말 놀이 후보로 이어지면 저장 가치가 생깁니다.',
        how: '아이 반응을 보고 다음에 해볼 도안, 필요한 재료, 보류할 이유를 한 줄로 적습니다.',
        completion_criteria: '다음 놀이 후보나 보류 이유가 메모로 남았습니다.',
        caution: '놀이 효과, 교육 성과, 발달 개선을 보장하지 않습니다.',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-remote-help-session-precheck',
        slug: 'remote-help-session-precheck',
        title: '원격지원 사전 권한 체크 Flow',
        description: '원격지원 도구를 열기 전에 요청자, 작업 범위, 화면 공유와 원격 제어의 차이, 반복 접근 여부, 세션 종료 후 남은 권한 정리만 가볍게 확인합니다.',
        category: '디지털/원격지원',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medium',
        source_title: 'AnyDesk, Chrome Remote Desktop, Zoom, Microsoft Quick Assist, TeamViewer 원격지원 공식 문서',
        source_url: 'https://support.anydesk.com/v1/docs/connect-to-a-remote-client',
        source_status: 'needs_review',
        source_precision: 'broad',
        source_checked_at: '2026-06-10',
        conversion_note: '공식 원격지원 문서에서 공통으로 드러나는 신뢰 확인, 화면 공유, 일회성 원격 제어, 반복 접근, 세션 종료 단계를 FlowMe의 짧은 권한 체크리스트로 변환했습니다. FlowMe는 접속 코드, ID, 비밀번호, 세션 URL, 토큰, 스크린샷, 채팅, 기기 목록을 저장하지 않고 원격지원 도구와 연동하지 않습니다.',
        primary_destination: 'internal_check',
        setup_anchor_label: '지원 체크 시작',
        setup_anchor_hint: '날짜 입력 없이 요청자, 작업 범위, 권한 방식, 종료 확인만 체크합니다.',
        warning: '이 Flow는 원격지원 보안 판단이나 사기 여부를 보장하지 않습니다. 모르는 요청자, 예상하지 못한 지원, 결제나 인증 정보 입력 요구가 있으면 세션을 시작하지 말고 공식 고객센터나 내부 담당자에게 별도로 확인하세요.',
        ...creatorMeta('FLOW 큐레이션', '디지털 절차 Flow 큐레이터', '원격지원 도구 사용법을 도구별 설치 가이드가 아니라 사용자가 세션 전에 확인할 권한 사다리로 바꾼 public 검증 샘플입니다.', 760, 88),
        ...tagMeta(['디지털', '원격지원', '권한 체크', '민감정보 미저장', 'public 검증']),
      },
      remoteHelpSessionPrecheckText,
    ),
    {
      '요청자와 작업 범위 확인하기': {
        description: '누가 왜 지원을 요청했는지, 어떤 앱이나 화면까지만 볼 수 있는지 먼저 적습니다.',
        why: 'Quick Assist와 Chrome Remote Desktop 같은 도구는 사용자가 코드를 입력하거나 공유를 승인해야 세션이 시작됩니다. FlowMe의 첫 행동은 도구 실행이 아니라 요청자와 범위를 확인하는 것입니다.',
        how: '요청자 이름, 소속이나 관계, 해결할 작업 1개, 보여도 되는 화면 범위를 짧게 적습니다. 예상하지 못한 연락이거나 결제, 인증, 계좌, 신분증 입력을 요구하면 세션을 시작하지 않습니다.',
        completion_criteria: '요청자와 작업 범위가 한 문장으로 정리됐습니다.',
        caution: '지원자 신원 판단이나 사기 판정은 FlowMe가 보장하지 않습니다.',
        links: [
          {
            label: 'Microsoft Quick Assist 공식 문서',
            url: 'https://learn.microsoft.com/en-us/windows/client-management/quick-assist',
            type: 'official',
          },
          {
            label: 'Chrome Remote Desktop 공식 도움말',
            url: 'https://support.google.com/chrome/answer/1649523?co=GENIE.Platform%3DDesktop&hl=EN',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '화면 공유만으로 충분한지 먼저 선택하기': {
        description: '상대가 보기만 해도 되는지, 마우스와 키보드 제어까지 필요한지 분리합니다.',
        why: 'Zoom 문서는 화면 공유와 원격 제어를 구분하고, 원격 제어는 허용 후 마우스와 키보드 조작이 가능하다고 설명합니다. 가능하면 보기 전용 화면 공유가 더 가벼운 선택입니다.',
        how: '상대가 말로 안내만 해도 되면 화면 공유로 시작합니다. 파일 열기, 설정 변경, 설치 작업처럼 조작이 필요할 때만 일회성 원격 제어를 검토합니다.',
        completion_criteria: '이번 세션의 권한 방식이 화면 공유 또는 원격 제어 중 하나로 정해졌습니다.',
        caution: '전체 화면을 공유하면 열려 있는 앱이나 파일이 보일 수 있습니다. 공유 전 민감한 창을 닫습니다.',
        links: [
          {
            label: 'Zoom 화면 공유 보안 문서',
            url: 'https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0059642',
            type: 'official',
          },
          {
            label: 'TeamViewer attended support 문서',
            url: 'https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-remote/remote-control/provide-attended-remote-support/',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '일회성 원격 제어가 필요한지 확인하기': {
        description: '마우스와 키보드 제어가 꼭 필요한 경우에만 일회성 세션으로 제한합니다.',
        why: 'Chrome Remote Desktop은 일회성 액세스 코드와 중지 버튼을, AnyDesk는 원격 사용자의 수동 승인 또는 별도 무인 접근을 구분합니다. FlowMe는 반복 접근보다 일회성 확인을 기본으로 둡니다.',
        how: '상대가 직접 조작해야 하는 작업인지 확인하고, 작업이 끝나면 다시 연결할 이유가 없는지 확인합니다. 반복 접속이 필요하다는 말이 나오면 다음 항목에서 따로 보류합니다.',
        completion_criteria: '이번 지원이 일회성 원격 제어인지, 화면 공유로 충분한지 결정됐습니다.',
        caution: '관리자 권한, 프로그램 설치, 파일 전송이 필요하면 작업 범위를 다시 확인합니다.',
        links: [
          {
            label: 'AnyDesk 원격 클라이언트 연결 문서',
            url: 'https://support.anydesk.com/v1/docs/connect-to-a-remote-client',
            type: 'official',
          },
          {
            label: 'Chrome Remote Desktop 공식 도움말',
            url: 'https://support.google.com/chrome/answer/1649523?co=GENIE.Platform%3DDesktop&hl=EN',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '접속값은 FlowMe에 저장하지 않기': {
        description: '코드, ID, 비밀번호, 세션 URL, 토큰은 원격지원 도구 안에서만 사용하고 FlowMe 메모에는 남기지 않습니다.',
        why: '원격지원 도구의 접속값은 세션을 열 수 있는 민감값입니다. FlowMe는 실행 체크와 출처 링크만 남기고 접근값 저장소가 되지 않아야 합니다.',
        how: '메모에는 요청자, 작업 범위, 선택한 권한 방식, 종료 확인만 남깁니다. AnyDesk ID, TeamViewer 세션값, Chrome Remote Desktop/Quick Assist 코드, Zoom 링크, 비밀번호, 토큰, 스크린샷, 채팅, 기기 목록은 저장하지 않습니다.',
        completion_criteria: 'FlowMe에 민감 접속값이 남지 않았습니다.',
        caution: '접속값을 저장하거나 공유해야 하는 상황이면 이 Flow 범위를 벗어난 별도 보안 절차로 다룹니다.',
        links: [
          {
            label: 'Microsoft Quick Assist 공식 문서',
            url: 'https://learn.microsoft.com/en-us/windows/client-management/quick-assist',
            type: 'official',
          },
          {
            label: 'AnyDesk 무인 접근 문서',
            url: 'https://support.anydesk.com/docs/unattended-access',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '반복 접근은 담당자와 해지일 메모가 있을 때만 보류하기': {
        description: '무인 접근이나 반복 관리는 즉시 진행하지 않고 담당자, 목적, 해지일이 확인될 때만 보류 메모로 남깁니다.',
        why: 'AnyDesk와 TeamViewer 계열 문서는 참석 지원과 무인 접근을 별도 개념으로 다룹니다. 반복 접근은 가벼운 지원 세션보다 권한 부담이 커서 public Flow에서는 보류 상태가 기본입니다.',
        how: '반복 접근을 요청받으면 담당자, 조직, 목적, 접근 기간, 해지 확인 방법을 적고 바로 허용하지 않습니다. 내부 IT 담당자나 공식 고객센터 확인이 끝난 뒤에만 별도 절차로 넘깁니다.',
        completion_criteria: '반복 접근 요청이 허용, 거절, 보류 중 하나로 정리됐습니다.',
        caution: 'FlowMe는 기기 관리, 접근 정책, 무인 접속 설정을 대신하지 않습니다.',
        links: [
          {
            label: 'AnyDesk 무인 접근 문서',
            url: 'https://support.anydesk.com/docs/unattended-access',
            type: 'official',
          },
          {
            label: 'TeamViewer attended support 문서',
            url: 'https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-remote/remote-control/provide-attended-remote-support/',
            type: 'official',
          },
        ],
        source_type: 'official',
        risk_level: 'medium',
      },
      '세션 종료와 남은 권한 정리하기': {
        description: '지원이 끝나면 공유 중지, 연결 해제, 남은 권한과 열린 창을 확인합니다.',
        why: 'Chrome Remote Desktop은 공유 종료를, Zoom은 Stop Share를, AnyDesk는 세션 종료를 명시합니다. Flow의 마지막 행동은 작업 완료가 아니라 접근 종료 확인입니다.',
        how: '공유 중지 또는 연결 해제를 누르고, 원격 제어 표시가 사라졌는지 봅니다. 임시로 연 앱, 파일 전송, 클립보드, 자동 승인, 무인 접근 설정이 남아 있으면 끕니다.',
        completion_criteria: '세션이 종료됐고 남은 권한이 없는지 확인했습니다.',
        caution: '이상한 결제, 계정 변경, 파일 이동, 보안 경고가 보이면 도구 재사용보다 공식 지원 채널 확인을 우선합니다.',
        links: [
          {
            label: 'Chrome Remote Desktop 공식 도움말',
            url: 'https://support.google.com/chrome/answer/1649523?co=GENIE.Platform%3DDesktop&hl=EN',
            type: 'official',
          },
          {
            label: 'Zoom 화면 공유 보안 문서',
            url: 'https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0059642',
            type: 'official',
          },
          {
            label: 'AnyDesk 원격 클라이언트 연결 문서',
            url: 'https://support.anydesk.com/v1/docs/connect-to-a-remote-client',
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
        id: 'flow-fridge-cleanout-weekly-plan',
        slug: 'fridge-cleanout-weekly-plan',
        title: '냉장고 파먹기 7일 재고 소진 Flow',
        description: '장보기 전에 냉장고 지도, 우선 소진 재료 3개, 이번 주 메뉴 후보, 장보기 보류 상태를 7일 재고표로 가볍게 정리합니다.',
        category: '집밥/식재료',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '냉장고 파먹기 7일 식단 플랜 creator blog',
        source_url:
          'https://smilellama.tistory.com/entry/%EC%9B%94-10%EB%A7%8C-%EC%9B%90-%EC%8B%9D%EB%B9%84-%EC%A0%88%EC%95%BD-%EC%A0%9C%EA%B0%80-%EC%84%B1%EA%B3%B5%ED%95%9C-%EB%83%89%EC%9E%A5%EA%B3%A0-%ED%8C%8C%EB%A8%B9%EA%B8%B0-7%EC%9D%BC-%EC%8B%9D%EB%8B%A8-%ED%94%8C%EB%9E%9C-%EC%95%8C%EB%9C%B0-%EC%9E%A5%EB%B3%B4%EA%B8%B0-%ED%8C%81-%ED%8F%AC%ED%95%A8',
        source_status: 'real',
        source_precision: 'exact',
        source_checked_at: '2026-07-11',
        conversion_note:
          'creator blog의 절약 경험과 7일 메뉴 예시를 그대로 보장하지 않고, 냉장고 지도 작성, 우선 소진 재료 선택, 신선 재료-남은 요리-냉동실 재료 순서, 장보기 보류 판단만 실행 가능한 재고표로 변환했습니다. FlowMe는 식비 절약액, 영양 균형, 식품 안전, 다이어트 결과를 판단하거나 보장하지 않습니다.',
        primary_destination: 'sheet',
        setup_anchor_label: '시작일',
        setup_anchor_hint: '시작일을 고르면 7일 재고 소진표가 만들어집니다. 냉장고 속 재료와 메뉴 후보만 적고, 영양·절약 판단은 하지 않습니다.',
        warning:
          '상했거나 안전이 의심되는 식재료는 먹지 말고 폐기하세요. FlowMe는 식비 절약, 영양 균형, 식품 안전, 다이어트 결과를 보장하지 않습니다.',
        ...creatorMeta(
          'FLOW 큐레이션',
          '식재료 실행 Flow 큐레이터',
          '온라인 냉장고 파먹기 경험을 절약 보장이 아닌 가벼운 재고 소진표로 정리합니다.',
          690,
          81,
        ),
        ...tagMeta(['집밥', '냉장고 파먹기', '재고표', '장보기 보류', 'public 검증']),
      },
      fridgeCleanoutWeeklyPlanText,
    ),
    {
      '냉장고 지도에서 우선 소진 재료 3개 고르기': {
        description: '냉장실, 냉동실, 실온 재료를 훑고 이번 주에 먼저 써야 할 재료 3개만 고릅니다.',
        why: '원문은 냉장고를 구역별로 적어 재료를 눈에 보이게 만드는 것에서 시작합니다. FlowMe에서는 전체 재고 관리가 아니라 이번 주 우선 재료 3개를 고르는 행동으로 줄입니다.',
        how: '냉장실, 냉동실, 실온을 각각 1분씩 보고 유통기한이 가깝거나 이미 뜯은 재료를 적습니다. 먹어도 되는지 애매한 재료는 소진 후보가 아니라 폐기/확인 메모로 분리합니다.',
        completion_criteria: '이번 주 우선 소진 재료 3개가 시트 첫 줄에 적혔습니다.',
        caution: 'FlowMe는 식재료의 섭취 가능 여부를 판단하지 않습니다. 냄새, 곰팡이, 변색, 보관 오류가 의심되면 먹지 않습니다.',
        links: [
          {
            label: '냉장고 지도와 7일 플랜 원문',
            url:
              'https://smilellama.tistory.com/entry/%EC%9B%94-10%EB%A7%8C-%EC%9B%90-%EC%8B%9D%EB%B9%84-%EC%A0%88%EC%95%BD-%EC%A0%9C%EA%B0%80-%EC%84%B1%EA%B3%B5%ED%95%9C-%EB%83%89%EC%9E%A5%EA%B3%A0-%ED%8C%8C%EB%A8%B9%EA%B8%B0-7%EC%9D%BC-%EC%8B%9D%EB%8B%A8-%ED%94%8C%EB%9E%9C-%EC%95%8C%EB%9C%B0-%EC%9E%A5%EB%B3%B4%EA%B8%B0-%ED%8C%81-%ED%8F%AC%ED%95%A8',
            type: 'creator',
          },
          {
            label: '냉장고 재고 루틴 참고',
            url: 'https://aruma16.tistory.com/126',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '이번 주 메인 재료와 메뉴 후보 묶기': {
        description: '우선 재료 3개를 기준으로 2~3개 메뉴 후보를 만들고, 꼭 사야 할 재료와 보류할 재료를 나눕니다.',
        why: '원문은 메인 요리 2~3개를 먼저 고르고 추가 구매 목록을 제한합니다. 이 Flow는 메뉴 확정이 아니라 메뉴 후보와 장보기 보류를 한 줄에 남기는 데 집중합니다.',
        how: '우선 재료 3개 옆에 만들 수 있는 메뉴 후보를 적습니다. 없는 재료를 바로 장바구니에 넣지 말고 대체 가능, 꼭 필요, 보류 중 하나로 표시합니다.',
        completion_criteria: '메뉴 후보와 장보기 보류 항목이 시트에 들어갔습니다.',
        caution: '절약액이나 영양 균형은 FlowMe가 계산하지 않습니다. 필요한 식재료를 무리하게 빼는 방식으로 쓰지 않습니다.',
      },
      '1~2일차 신선 재료 먼저 쓰기': {
        description: '상하기 쉬운 채소, 해동한 재료, 이미 뜯은 재료를 먼저 씁니다.',
        why: '원문 7일 플랜은 초반에 신선 재료를 먼저 쓰는 흐름입니다. 사용자는 날짜별로 메뉴 후보와 실제 소진 여부만 적으면 됩니다.',
        how: '오늘과 내일 먹을 메뉴 후보를 고르고, 신선 재료 칸에 실제로 쓴 재료를 적습니다. 애매한 재료는 먹기보다 폐기/확인 메모로 남깁니다.',
        completion_criteria: '1~2일차에 쓸 신선 재료와 메뉴 후보가 기록됐습니다.',
        caution: '보관 상태가 불안한 재료는 소진 목표에 넣지 않습니다.',
      },
      '3~4일차 남은 요리와 재료 변형하기': {
        description: '남은 반찬, 조리된 재료, 자투리 채소를 볶음밥·전·비빔밥 같은 다른 형태로 바꿔 씁니다.',
        why: '원문은 중간 날짜에 남은 요리와 재료를 변형하는 흐름을 제안합니다. FlowMe는 레시피를 새로 만들지 않고 변형 후보만 기록합니다.',
        how: '남은 요리와 자투리 재료를 보고 한 번 더 쓸 수 있는 메뉴 후보를 적습니다. 보관 기간이 애매하면 먹지 않고 폐기/확인으로 표시합니다.',
        completion_criteria: '3~4일차 변형 메뉴 후보와 실제 사용 재료가 적혔습니다.',
        caution: '남은 음식 보관 기간과 위생 상태는 사용자가 별도로 확인해야 합니다.',
      },
      '5~6일차 냉동실과 기본 재료로 이어가기': {
        description: '냉동실 재료, 계란, 두부, 밥, 면처럼 기본 재료로 이번 주 후반 메뉴를 이어갑니다.',
        why: '원문 후반부는 냉동실과 기본 재료를 활용해 추가 구매를 줄이는 흐름입니다. FlowMe는 냉동실 재고를 전체 관리하지 않고 이번 주 사용할 후보만 적게 합니다.',
        how: '냉동실에서 이번 주에 꺼낼 재료 1~2개를 고르고 기본 재료와 묶습니다. 새로 사야 할 재료는 꼭 필요할 때만 표시합니다.',
        completion_criteria: '5~6일차에 쓸 냉동실/기본 재료 후보가 정리됐습니다.',
        caution: '해동 후 재냉동이나 오래 보관된 식재료는 안전 기준을 사용자가 확인해야 합니다.',
      },
      '7일차 남은 재료 처리와 장보기 보류 결정하기': {
        description: '마지막 날 남은 재료를 보고 처리, 폐기, 다음 주 보류, 장보기 필요 중 하나로 정합니다.',
        why: '원문 7일차는 장보기 없이 남은 재료를 비우는 흐름입니다. FlowMe에서는 “다 먹기”가 아니라 다음 장보기 전에 보류/필요를 분리하는 결정을 남깁니다.',
        how: '남은 재료를 시트에 보고 처리 가능, 폐기/확인, 다음 주 보류, 구매 필요 중 하나로 표시합니다. 구매 필요 항목만 장보기 메모로 옮깁니다.',
        completion_criteria: '장보기 보류 항목과 실제 구매 필요 항목이 분리됐습니다.',
        caution: '비우기 자체가 목표가 아닙니다. 안전하지 않은 식재료는 남김없이 쓰려고 하지 않습니다.',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-kids-dino-footprint-art',
        slug: 'kids-dino-footprint-art',
        title: '아이 공룡 발자국 미술 놀이 Flow',
        description: '주말 놀이 날짜에 준비물, 공룡 발자국 찍기, 아이 말 메모, 정리 체크를 가볍게 붙입니다.',
        category: '육아/놀이',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'low',
        source_title: '유아 공룡 놀이 자료 참고',
        source_url: 'https://info.childcare.go.kr/info/pnis/search/PnisFileDownload.jsp?STCODE_POP=41480000016&filetype=YUPLOADU&flag=DNGB&schoolyear=2026&wkyear=202604',
        source_status: 'preview',
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
        conversion_note: '2026 어린이집 파일 URL을 자동·수동 경로에서 안정적으로 다시 열지 못해 공개 노출을 중단했습니다. 원문 행을 재확인하기 전까지 놀이 준비 fixture로만 유지합니다.',
        primary_destination: 'hybrid',
        ...creatorMeta('FLOW 큐레이션팀', '가족 놀이 큐레이터', '아이 놀이 콘텐츠가 교육 기록 앱처럼 무거워지지 않고 주말 실행 카드로 작동하는지 확인하는 다양화 후보입니다.', 940, 112),
        ...tagMeta(['육아', '놀이', '공룡', '다양화 후보']),
      },
      kidsDinoFootprintArtText,
    ),
    {
      '공룡 놀이 준비물 꺼내기': {
        description: '공룡 그림이나 피규어, 물감 또는 클레이, 종이, 물티슈를 놀이 장소에 모읍니다.',
        why: '부모가 주말에 바로 시작하려면 교육 설명보다 준비물이 먼저 보여야 합니다.',
        how: '집에 있는 공룡 그림/피규어와 찍기 도구를 꺼내고, 바닥 오염을 막을 종이와 물티슈를 같이 둡니다.',
        completion_criteria: '준비물이 한곳에 모였고 아이가 바로 시작할 수 있습니다.',
        links: [
          {
            label: '공룡 놀이 자료',
            url: 'https://info.childcare.go.kr/info/pnis/search/PnisFileDownload.jsp?STCODE_POP=41480000016&filetype=YUPLOADU&flag=DNGB&schoolyear=2026&wkyear=202604',
            type: 'reference',
          },
        ],
        source_type: 'reference',
        risk_level: 'low',
      },
      '공룡 발자국 찍기': {
        description: '피규어 발이나 손가락/도구로 종이에 발자국을 찍고 아이가 색을 고르게 둡니다.',
        why: '원문 소재의 핵심은 공룡 발자국이라는 활동 단서이며, Flow는 이를 주말 놀이 행동으로 옮깁니다.',
        how: '물감이나 클레이를 소량만 쓰고, 아이가 고른 색과 방향으로 발자국을 찍습니다.',
        completion_criteria: '발자국 작품 1개를 만들었습니다.',
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '아이 말 메모하며 이야기 만들기': {
        description: '어떤 공룡이 지나갔는지, 어디로 갔는지 아이가 말하게 하고 한 줄만 메모합니다.',
        why: '놀이 후 기록은 발달 평가가 아니라 다음 놀이를 고르는 힌트면 충분합니다.',
        how: '아이 말을 그대로 한 줄 적고, 평가나 점수는 남기지 않습니다.',
        completion_criteria: '아이 말 또는 다음에 이어갈 이야기 한 줄을 남겼습니다.',
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '작품 말리고 다음 놀이 고르기': {
        description: '작품을 말리고 다음 주에 해볼 공룡/동물 놀이 후보를 하나 고릅니다.',
        why: 'FlowMe 안에서 긴 기록을 하지 않아도 다음 주 실행으로 이어져야 반복 가치가 생깁니다.',
        how: '작품은 말릴 곳에 두고, 다음 놀이 후보만 메모에 남깁니다.',
        completion_criteria: '정리했고 다음 놀이 후보 1개를 정했습니다.',
        source_type: 'creator_experience',
        risk_level: 'low',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-banana-peanut-recipe-video',
        slug: 'banana-peanut-recipe-video',
        title: '바나나 땅콩버터 빵 영상 따라하기 Flow',
        description: '짧은 레시피 영상을 재료 확인, 섞기, 굽기, 다음 조리 메모로 옮긴 당일 요리 체크리스트입니다.',
        category: '요리/레시피',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'low',
        source_title: '노밀가루 바나나 땅콩버터 빵 20분 완성',
        source_url: 'https://www.recipio.kr/recipes/WwyL63J3',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-07',
        conversion_note: '짧은 레시피 영상에서 조리 실행에 필요한 네 단계만 추려 체크리스트로 변환했습니다. 칼로리, 식단 관리, 영양 기록은 기본에서 제외했습니다.',
        primary_destination: 'internal_check',
        setup_anchor_label: '요리 체크 시작',
        setup_anchor_hint: '날짜 입력 없이 재료 확인, 섞기, 굽기, 다음 조리 메모만 체크합니다.',
        ...creatorMeta('FLOW 큐레이션팀', '레시피 실행 큐레이터', '제작자 영상 레시피가 FlowMe에서 체크리스트와 원본 링크만으로 충분한지 확인하는 다양화 후보입니다.', 1180, 174),
        ...tagMeta(['요리', '레시피', '영상', '다양화 후보']),
      },
      bananaPeanutRecipeVideoText,
    ),
    {
      '바나나·땅콩버터와 내열 용기 확인하기': {
        description: '바나나, 계란, 땅콩버터, 에어프라이어용 내열 용기를 준비합니다.',
        why: '요리 Flow의 첫 행동은 설명 읽기가 아니라 조리 가능한 재료가 있는지 확인하는 것입니다.',
        how: '원본 영상 링크를 열어 필요한 재료와 용기를 확인하고, 없는 재료만 메모합니다.',
        completion_criteria: '바나나, 땅콩버터, 내열 용기가 준비됐습니다.',
        links: [
          {
            label: '원본 레시피 영상',
            url: 'https://www.recipio.kr/recipes/WwyL63J3',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '용기에 재료 넣고 섞기': {
        description: '바나나를 으깨고 계란과 땅콩버터를 넣어 반죽을 만듭니다.',
        why: '원문 영상의 핵심 조리 순서를 사용자가 손으로 할 수 있는 체크로 줄입니다.',
        how: '원본 영상의 질감과 순서를 확인하면서 내열 용기 안에서 재료를 섞습니다.',
        completion_criteria: '굽기 전 반죽이 준비됐습니다.',
        links: [
          {
            label: '원본 레시피 영상',
            url: 'https://www.recipio.kr/recipes/WwyL63J3',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '원본 영상 기준으로 에어프라이어에 굽기': {
        description: '원본 영상의 온도와 시간을 확인해 에어프라이어에 굽고 중간 상태를 봅니다.',
        why: 'FlowMe가 온도/시간을 새로 판단하지 않고 원본 영상으로 돌아가게 해야 조리 실패를 줄입니다.',
        how: '굽기 전 원본 영상의 온도/시간을 다시 확인하고, 기기 차이가 있으면 다음 조리 메모에 남깁니다.',
        completion_criteria: '원본 영상 기준으로 굽기를 완료했습니다.',
        links: [
          {
            label: '원본 레시피 영상',
            url: 'https://www.recipio.kr/recipes/WwyL63J3',
            type: 'creator',
          },
        ],
        source_type: 'creator_experience',
        risk_level: 'low',
      },
      '식힘 후 맛과 변형 메모 남기기': {
        description: '식힌 뒤 다음에 바꿀 분량, 굽기 시간, 토핑 후보만 한 줄로 남깁니다.',
        why: '요리 Flow가 식단 관리나 영양 기록으로 커지지 않으려면 다음 실행에 필요한 메모만 남겨야 합니다.',
        how: '맛, 굽기 정도, 다음에 바꿀 점을 한 줄로 적고 칼로리/식단 기록은 만들지 않습니다.',
        completion_criteria: '다음 조리 메모 1줄을 남겼습니다.',
        source_type: 'creator_experience',
        risk_level: 'low',
      },
    },
  ),
  withItemDetails(
    makeTextBundle(
      {
        id: 'flow-dog-adoption-first-week',
        slug: 'dog-adoption-first-week',
        title: '강아지 입양 첫 주 체크 Flow',
        description: '입양일을 기준으로 준비물, 안정 공간, 첫 병원 예약, 동물등록 확인을 체크합니다.',
        category: '반려동물',
        structure_type: 'timeline',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '강아지 입양 전 준비 가이드 참고',
        source_url: 'https://www.gomin77.co.kr/blog/dog-puppy-pet-adoption',
        source_status: 'needs_review',
        source_precision: 'exact',
        source_checked_at: '2026-06-04',
        conversion_note: '입양 전후 준비와 첫 주 체크만 남기고 건강 판단은 동물병원 확인 메모로 분리했습니다.',
        primary_destination: 'hybrid',
        warning: '이 Flow는 반려견 건강 판단을 대신하지 않습니다. 이상 증상이 있으면 동물병원 상담을 우선합니다.',
        ...creatorMeta('생활 루틴 코치', '반려동물 생활 큐레이터', '생활 이벤트와 반려동물 체크가 My Flow 안에서 섞일 때의 밀도를 확인하는 P0 stress fixture입니다.', 1710, 204),
        ...tagMeta(['반려동물', '입양', '첫 주', 'P0 검증']),
      },
      dogAdoptionFirstWeekText,
    ),
    {
      '사료와 물그릇, 배변패드 준비하기': {
        description: '입양 첫날 바로 필요한 기본 물품을 먼저 준비합니다.',
        why: '첫날은 환경 변화가 커서 보호자가 물품을 찾느라 동선을 늘리면 적응이 더 어려워질 수 있습니다.',
        how: '사료, 물그릇, 배변패드, 리드줄, 이동장을 한 곳에 둡니다.',
        completion_criteria: '입양 첫날 필요한 물품이 준비됐습니다.',
        source_type: 'creator_experience',
      },
      '기존 접종 기록과 입양 서류 확인하기': {
        description: '접종 수첩, 입양 계약서, 보호자 연락처를 확인합니다.',
        why: '첫 병원 방문 때 이전 접종 기록과 기본 정보가 필요합니다.',
        how: '서류 내용을 메모에 적고 누락된 정보는 입양처에 확인합니다.',
        completion_criteria: '접종 기록 또는 기록 없음 상태를 메모했습니다.',
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '첫 건강검진 예약하기': {
        description: '입양 후 첫 주 안에 동물병원에서 기본 상태를 확인할 일정을 잡습니다.',
        why: '건강 판단은 FlowMe가 아니라 동물병원 확인이 기준이어야 합니다.',
        how: '병원 예약일, 준비 서류, 물어볼 질문을 메모합니다.',
        completion_criteria: '병원 예약 또는 방문이 완료됐습니다.',
        caution: '식욕 저하, 구토, 설사, 호흡 이상이 있으면 일정 체크보다 병원 상담을 우선합니다.',
        source_type: 'creator_experience',
        risk_level: 'medium',
      },
      '동물등록 여부 확인하기': {
        description: '등록 여부와 마이크로칩 정보를 확인하고 필요한 일정을 잡습니다.',
        why: '반려동물 등록은 보호자 정보와 연결되는 행정 체크입니다.',
        how: '등록 완료 여부, 등록번호, 변경이 필요한 보호자 정보를 메모합니다.',
        completion_criteria: '등록 완료 또는 등록 예정일이 정리됐습니다.',
        source_type: 'reference',
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
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
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
            label: '고용24 구직급여 안내',
            url: 'https://ei.work24.go.kr/ei/eih/eg/pb/pbPersonBnef/retrievePb0201Info.do',
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
        source_precision: 'broad',
        source_checked_at: '2026-07-11',
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
            url: 'https://www.0404.go.kr/main/mainPage',
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
            url: 'https://www.airport.co.kr/www/index.do',
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
  ...contentsBatch260601OfficialBundles,
  ...contentsBatch260601CreatorBundles,
  ...curatedSourceAppSeedFlowBundles,
];

export const seedBundles: FlowBundle[] = baseSeedBundles.map((bundle, index) => polishSourceRiskItemCopy(enrichSeedMeta(bundle, index)));
