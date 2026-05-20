import { parseTextFlow } from './parser';
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
      why: '블로그·유튜브형 경험 콘텐츠를 바로 실행 가능한 단계로 바꾼 항목입니다.',
      how: '원문 링크를 참고해 본인 상황에 맞는 기준, 예산, 난이도, 일정을 조정합니다.',
      completion_criteria: `${item.title}을 실행했거나 내 상황에 맞게 조정했다.`,
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

const studyExamD30Text = `## D-30 범위와 기준 잡기
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
        category: '자동차/면허',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: 'none',
        status: 'published',
        risk_level: 'medium',
        source_title: '정부24 운전면허 정보 공지 참고',
        source_url: 'https://www.gov.kr/portal/ntcItm/123533?Mcode=11226',
        warning: '면허 갱신 기간과 적성검사 요건은 개인 면허 종류와 상태에 따라 달라질 수 있습니다.',
      },
      driverLicenseRenewalText,
    ),
    {
      label: '정부24 운전면허 정보 공지 참고',
      url: 'https://www.gov.kr/portal/ntcItm/123533?Mcode=11226',
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
  withReferenceSourceDetails(
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
    {
      label: '집에서 공부 효과 높이는 학습 팁',
      url: 'https://englishfact.com/ko/10-tips-to-enhance-english-study-at-home/',
    },
    'low',
  ),
  withReferenceSourceDetails(
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
    {
      label: '직장인 30일 영어 독학 루틴',
      url: 'https://www.new1eng.com/blog/adult-english-30day-self-study',
    },
    'low',
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
        source_title: '신차 인수 체크리스트 참고',
        source_url: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
        warning: '차량 인수 후 발견되는 하자는 처리 기준이 달라질 수 있으므로 인수 전 사진과 기록을 남기세요.',
      },
      newCarDeliveryText,
    ),
    {
      label: '차량 구매 전 점검 가이드',
      url: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
    },
    'financial_sensitive',
  ),
  withReferenceSourceDetails(
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
    {
      label: '타이어 공기압·셀프정비 체크리스트',
      url: 'https://gnsl0879.tistory.com/717',
    },
    'medium',
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-wedding-d180',
        slug: 'wedding-d180-basic',
        title: '결혼 준비 D-180 Flow',
        description: '예식일을 기준으로 웨딩홀, 스드메, 청첩장, 본식 디테일까지 시기별로 정리합니다.',
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
    {
      label: '결혼식 준비 체크리스트',
      url: 'https://www.ohprint.me/blog/wedding-checklist',
    },
    'financial_sensitive',
  ),
  withReferenceSourceDetails(
    makeTextBundle(
      {
        id: 'flow-running-5k',
        slug: 'running-5k-4week',
        title: '초보 러너 5km 4주 완주 Flow',
        description: '걷기와 조깅을 섞어 4주 동안 첫 5km 완주를 준비하는 주 3회 루틴입니다.',
        category: '운동/러닝',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '초보 러너 5km 루틴 참고',
        source_url: 'https://headrock.tistory.com/entry/%F0%9F%8F%83%E2%80%8D%E2%99%80%EF%B8%8F-%EC%B4%88%EB%B3%B4-%EB%9F%AC%EB%84%88%EB%A5%BC-%EC%9C%84%ED%95%9C-5km-%EB%8B%AC%EB%A6%AC%EA%B8%B0-%ED%9B%88%EB%A0%A8%EB%B2%95-%E2%80%94-%EC%9D%B4%EB%A0%87%EA%B2%8C-%EC%8B%9C%EC%9E%91%ED%95%B4%EB%B3%B4%EC%84%B8%EC%9A%94',
        warning: '통증, 어지러움, 기존 질환이 있으면 운동 강도를 낮추고 전문가와 상담하세요.',
      },
      running5kRoutineText,
    ),
    {
      label: '초보 러너 5km 4주 루틴',
      url: 'https://headrock.tistory.com/entry/%F0%9F%8F%83%E2%80%8D%E2%99%80%EF%B8%8F-%EC%B4%88%EB%B3%B4-%EB%9F%AC%EB%84%88%EB%A5%BC-%EC%9C%84%ED%95%9C-5km-%EB%8B%AC%EB%A6%AC%EA%B8%B0-%ED%9B%88%EB%A0%A8%EB%B2%95-%E2%80%94-%EC%9D%B4%EB%A0%87%EA%B2%8C-%EC%8B%9C%EC%9E%91%ED%95%B4%EB%B3%B4%EC%84%B8%EC%9A%94',
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
        category: '다이어트/습관',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medical_sensitive',
        source_title: '다이어트 식단·운동 습관 콘텐츠 참고',
        source_url: 'https://pdf.idaegu.com/data/20260507_13.pdf',
        warning: '이 Flow는 일반적인 습관 기록용입니다. 질환, 임신·수유, 섭식장애 경험, 약물 복용이 있으면 전문가 상담을 우선하세요.',
      },
      dietHabitText,
    ),
    {
      label: '식단과 운동 습관 기사 참고',
      url: 'https://pdf.idaegu.com/data/20260507_13.pdf',
    },
    'medical_sensitive',
  ),
];

function enrichSeedMeta(bundle: FlowBundle, index: number): FlowBundle {
  const creatorByCategory = bundle.flow.category.includes('자동차')
    ? creatorMeta('차근차근 모빌리티', '자동차 생활 크리에이터', '구매와 관리에서 놓치기 쉬운 확인 순서를 정리합니다.', 420 + index * 37, 88 + index * 9)
    : bundle.flow.category.includes('공부')
      ? creatorMeta('루틴 공부방', '학습 루틴 크리에이터', '시험과 자기계발 콘텐츠를 실행 단위로 쪼개 정리합니다.', 510 + index * 31, 102 + index * 8)
      : bundle.flow.category.includes('결혼')
        ? creatorMeta('웨딩 체크메이트', '결혼 준비 경험자', '준비 기간별 의사결정과 업체 확인 순서를 정리합니다.', 760 + index * 21, 164 + index * 7)
        : bundle.flow.category.includes('운동') || bundle.flow.category.includes('다이어트')
          ? creatorMeta('생활 루틴 코치', '운동·습관 크리에이터', '무리하지 않고 반복할 수 있는 루틴을 실행표로 정리합니다.', 690 + index * 25, 141 + index * 6)
          : bundle.flow.category.includes('서류') || bundle.flow.category.includes('사업') || bundle.flow.category.includes('노무')
            ? creatorMeta('생활 행정 노트', '공식자료 큐레이터', '공식 안내를 신청 전 확인 순서로 재구성합니다.', 360 + index * 18, 72 + index * 5)
            : creatorMeta('FLOW 큐레이션팀', '경험 콘텐츠 큐레이터', '반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.', 480 + index * 24, 96 + index * 6);

  return {
    ...bundle,
    flow: {
      ...bundle.flow,
      ...(bundle.flow.creator_name ? {} : creatorByCategory),
      tags: bundle.flow.tags ?? buildSeedTags(bundle),
    },
  };
}

function buildSeedTags(bundle: FlowBundle): string[] {
  const tags = new Set<string>();
  const { flow } = bundle;

  if (flow.structure_type === 'timeline') tags.add('D-Day 준비');
  if (flow.structure_type === 'routine') tags.add('매일 루틴');
  if (flow.structure_type === 'checklist') tags.add('체크리스트');
  if (flow.content_type === 'meal_plan') tags.add('식단·레시피');
  if (flow.risk_level === 'financial_sensitive') tags.add('돈이 걸린 결정');
  if (flow.risk_level === 'medical_sensitive') tags.add('건강주의');
  if (flow.source_url?.includes('gov.kr') || flow.source_url?.includes('nhis.or.kr') || flow.source_url?.includes('hometax')) tags.add('공식확인');
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
        category: '운동/홈트',
        structure_type: 'routine',
        content_type: 'default',
        anchor_type: 'start_date',
        status: 'published',
        risk_level: 'medium',
        source_title: '홈트 루틴 참고',
        source_url: 'https://hyeondams.tistory.com/185',
        warning: '통증이 있거나 질환이 있는 경우 무리하지 말고 전문가와 상담하세요.',
      },
      workoutText,
    ),
    {
      '가벼운 점핑잭 또는 스텝터치 1분': {
        description: '관절 부담이 크면 점핑잭 대신 스텝터치처럼 충격이 낮은 동작으로 바꿉니다.',
        source_type: 'reference',
        risk_level: 'medium',
      },
      '세트 사이 45~60초 쉬기': {
        description: '호흡이 너무 가쁘거나 자세가 흐트러지면 휴식 시간을 늘리고 반복 수를 줄입니다.',
        source_type: 'reference',
        risk_level: 'medium',
      },
      '통증 또는 어지러움 여부 기록하기': {
        description: '통증, 어지러움, 호흡 곤란이 있으면 중단하고 몸 상태를 확인합니다.',
        why: '운동 루틴은 반복 실행이 목적이므로 무리한 신호를 빨리 발견해야 지속할 수 있습니다.',
        how: '운동 직후 통증 부위, 어지러움, 호흡 상태를 짧게 기록합니다.',
        completion_criteria: '몸 상태를 기록했고 필요하면 다음 운동 강도를 낮추기로 결정했다.',
        links: [
          {
            label: 'CDC 신체활동 가이드',
            url: 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html',
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
        source_title: '국세청 홈택스·정부24 연말정산 자료 참고',
        source_url: 'https://www.hometax.go.kr',
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
];

export const seedBundles: FlowBundle[] = baseSeedBundles.map(enrichSeedMeta);
