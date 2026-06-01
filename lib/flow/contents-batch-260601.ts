import { parseTextFlow } from './parser';
import { Flow, FlowBundle } from './types';

/**
 * 2026-06-01 콘텐츠 탐색 배치.
 *
 * 목적: "어떤 콘텐츠가 FLOW 콘텐츠가 되기 좋은가"를 반복 실험하기 위한 배치다.
 * 기존 시드가 운동/홈트(15)·다이어트(12)에 편중돼 있어, 이번 배치는 실생활
 * 행정·금융·커리어·주거·건강·디지털·안전·관계처럼 얇았던 영역을 골고루 채운다.
 *
 * 선정 기준(= FLOW 콘텐츠가 되기 좋은 신호):
 * 1) 한 번이 아니라 인생에서 반복되거나 시점이 분명한 과제 (이사, 면접, 검진, 신고).
 * 2) 사용자가 이미 캘린더/시트/메모로 옮겨 실행하는 과제 (export-first 적합).
 * 3) 흩어진 정보를 모아 "빠뜨리면 손해"인 항목이 분명한 과제.
 * 4) 민감 영역(건강/법률/재무/육아)은 공식 확인 질문과 경험 팁을 분리할 수 있는 과제.
 *
 * 모든 항목은 Stage 0 원칙에 따라 자동으로 legacy_accessible로 분류되며,
 * 실제 사용자 행동 데이터 전에는 대표/공개 MVP/검증으로 부르지 않는다.
 */

const now = '2026-06-01T00:00:00.000Z';

type BatchSpec = {
  flow: Omit<Flow, 'created_at' | 'updated_at'>;
  text: string;
};

function build(spec: BatchSpec): FlowBundle {
  const parsed = parseTextFlow(spec.text, spec.flow.id);
  return {
    flow: {
      ...spec.flow,
      content_type: spec.flow.content_type ?? 'default',
      // 갓 만든 탐색 배치는 실행 구조는 있으나 아직 source-fit audit 전이라
      // needs_review로 둔다. 분류상 lifecycle 'fix'(보강 필요) + catalog_preview로
      // 떨어져 대표/공개 MVP 노출 없이 직접 접근만 가능하다. Stage 0 원칙 준수.
      source_status: spec.flow.source_status ?? 'needs_review',
      source_checked_at: spec.flow.source_checked_at ?? '2026-06-01',
      created_at: now,
      updated_at: now,
      raw_text: spec.text,
    },
    ...parsed,
  };
}

const specs: BatchSpec[] = [
  // ───────────────────────────── 주거 / 계약 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-jeonse-contract',
      slug: 'jeonse-contract-safety-check',
      title: '전세 계약 안전 점검 Flow',
      description: '계약 전 등기부·보증금 안전·특약·확정일자까지, 전세 사기를 피하는 확인 순서를 메모로 정리합니다.',
      category: '주거/계약',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '대법원 인터넷등기소 / 주택도시보증공사 안심전세',
      source_url: 'https://www.iros.go.kr',
      warning: '보증금 안전, 권리관계, 보증보험 가입 가능 여부는 물건마다 다릅니다. 등기부와 공식 안내로 직접 확인하고 필요하면 전문가 상담을 받으세요.',
    },
    text: `## 1. 계약 전 권리관계 확인
- 등기부등본 발급해 근저당·가압류·신탁 여부 확인하기
  why: 보증금보다 앞선 빚(선순위 근저당)이 크면 경매 시 보증금을 돌려받지 못할 수 있습니다.
  how: 대법원 인터넷등기소에서 해당 주소 등기부를 발급해 '을구'의 근저당 설정액과 날짜를 봅니다.
  done: 근저당 설정액과 설정일을 메모에 적었다.
  caution: 계약 직전과 잔금일 당일 두 번 확인합니다.
- 건축물대장으로 위반건축물·용도 확인하기
  why: 근린생활시설을 주거로 쓰는 등 용도가 다르면 전입신고·보증보험이 막힐 수 있습니다.
- 집주인 신분증과 등기부상 소유자 일치 확인하기
  done: 계약 상대가 실제 소유자(또는 위임장 보유 대리인)임을 확인했다.

## 2. 보증금 안전장치
- 전세보증금 반환보증 가입 가능 여부 확인하기
  why: 집주인이 보증금을 못 돌려줘도 보증기관이 대신 돌려주는 안전장치입니다.
  how: HUG/SGI 보증 조건(전세가율, 선순위 채권)을 미리 확인합니다.
  done: 가입 가능/불가와 이유를 메모했다.
- 전세가율(매매가 대비 전세금 비율) 계산하기
- 특약에 '근저당 말소', '보증보험 협조' 조항 넣기 협의하기

## 3. 계약 당일
- 계약금 송금은 등기부상 소유자 명의 계좌로만 하기
  caution: 대리인·중개사 개인 계좌 입금은 사고 위험이 큽니다.
- 계약서 사본·영수증·중개대상물 확인서 보관하기

## 4. 입주 후 즉시
- 전입신고와 확정일자 같은 날 받기
  why: 대항력과 우선변제권이 생기는 핵심 단계라 하루도 미루면 안 됩니다.
  done: 전입신고 완료, 확정일자 도장 받은 계약서를 사진으로 보관했다.
- 잔금일 등기부 다시 확인해 변동 없는지 보기`,
  },
  {
    flow: {
      id: 'batch-260601-first-solo-living',
      slug: 'first-solo-living-setup',
      title: '자취 시작 준비 Flow',
      description: '집 구하기부터 입주, 행정처리, 첫 살림 장만까지 처음 혼자 살 때 빠뜨리기 쉬운 준비를 정리합니다.',
      category: '주거/생활',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 입주 전 행정
- 전입신고·확정일자 일정 잡기
- 인터넷·통신 신규/이전 신청하기
- 도시가스 개통 예약하기
  caution: 가스는 방문 개통이라 입주일에 맞춰 미리 예약해야 합니다.
- 전기·수도 명의변경 또는 사용 신청하기

## 2. 첫 살림 우선순위
- 당장 필요한 것만 먼저 사기 (침구, 커튼, 기본 주방, 청소도구)
  why: 한 번에 다 사면 과지출과 반품이 늘어 우선순위 구분이 중요합니다.
  how: '첫날 필수 / 첫주 / 한 달 안'으로 나눠 시트에 적습니다.
  done: 3단계 구매 리스트를 만들었다.
- 분리수거·음식물 처리 방법 확인하기
- 가까운 마트·약국·세탁소 위치 저장하기

## 3. 안전·비용 관리
- 현관 도어록 비밀번호 변경하기
- 누수·곰팡이·보일러 작동 점검하고 사진 남기기
- 월 고정비(월세·관리비·공과금·통신) 예산표 만들기
  done: 월 고정비 합계를 계산해 시트에 적었다.`,
  },
  {
    flow: {
      id: 'batch-260601-move-in-inspection',
      slug: 'apartment-move-in-inspection',
      title: '입주 사전점검 Flow',
      description: '새 집(아파트·신축) 입주 전 하자를 사진과 함께 기록해 보수 요청까지 빠뜨리지 않게 정리합니다.',
      category: '주거/계약',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
    },
    text: `## 1. 점검 준비물
- 손전등, 휴대폰 충전기, 마스킹테이프, 메모지 챙기기
  why: 콘센트 작동(충전기), 하자 위치 표시(테이프), 어두운 곳(손전등) 점검에 필요합니다.
- 하자 위치별 사진 폴더 미리 만들기

## 2. 공간별 점검
- 벽·천장·바닥 마감 균열·들뜸·오염 확인하기
  done: 발견한 하자마다 위치+사진 파일명을 기록했다.
- 문·창문·중문 여닫힘과 잠금 확인하기
- 콘센트·스위치·조명 전부 작동시켜 보기
- 싱크대·세면대·변기 급수와 배수 확인하기
  caution: 물을 받았다가 빼면서 배수 속도와 누수도 함께 봅니다.
- 보일러·환기·인터폰 작동 확인하기

## 3. 보수 요청
- 하자 목록을 사진과 함께 정리해 시공사/관리사무소에 접수하기
  done: 접수 번호 또는 담당자 확인을 받았다.
- 재점검(보수 확인) 날짜 캘린더에 등록하기`,
  },

  // ───────────────────────────── 금융 / 세무 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-freelancer-tax',
      slug: 'freelancer-income-tax-may',
      title: '프리랜서 종합소득세 신고 준비 Flow',
      description: '5월 종합소득세 신고 전 소득·경비 증빙과 공제 항목을 모아 신고 또는 세무 상담을 준비합니다.',
      category: '금융/세무',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'sheet',
      source_title: '국세청 홈택스 종합소득세 신고 안내',
      source_url: 'https://www.hometax.go.kr',
      warning: '경비 인정 범위와 공제 적용은 사업 형태와 개인 상황에 따라 다릅니다. 홈택스 안내와 세무 전문가 확인으로 최종 판단하세요.',
    },
    text: `## 1. 소득 모으기
- 모든 거래처 지급명세서·원천징수 내역 확인하기
  why: 신고 누락은 가산세로 이어지므로 모든 소득원을 먼저 모아야 합니다.
  how: 홈택스 '지급명세서 조회'와 통장 입금 내역을 대조합니다.
  done: 거래처별 연 소득 합계를 시트에 적었다.
- 3.3% 원천징수된 세액 합계 확인하기

## 2. 경비 증빙
- 사업용 카드·현금영수증·세금계산서 모으기
  how: 사업 관련 지출을 항목(통신·임차·소모품·외주 등)으로 시트에 분류합니다.
  done: 경비 항목별 합계를 정리했다.
- 홈택스 사업용 신용카드 등록 여부 확인하기

## 3. 공제·신고
- 인적공제·연금·보험료 등 공제 항목 점검하기
  caution: 적용 가능 여부가 헷갈리는 항목은 '확인 질문'으로 남기고 임의 판단하지 않습니다.
- 단순경비율 vs 장부신고 어느 쪽이 유리한지 비교 메모하기
- 납부 또는 환급 예상액 확인하고 5월 납부일 캘린더에 등록하기
  done: 신고 방식과 예상 세액을 메모했다.`,
  },
  {
    flow: {
      id: 'batch-260601-subscription-audit',
      slug: 'subscription-audit-monthly',
      title: '구독·자동결제 점검 Flow',
      description: '잊고 내고 있던 구독과 자동결제를 매달 한 번 점검해 새는 고정비를 줄입니다.',
      category: '금융/세무',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
    },
    text: `@월 1회

## 이번 달 점검
- 카드·간편결제 명세서에서 정기결제 항목 추리기
  why: 안 쓰는데 빠져나가는 구독이 평균 몇 개씩 있어 명세서 확인이 핵심입니다.
  how: 카드사 앱의 '정기결제/구독' 메뉴 또는 명세서를 보고 시트에 옮깁니다.
  done: 이번 달 정기결제 항목과 금액을 모두 적었다.
- 각 항목을 유지/해지/대체로 분류하기
- 무료체험 후 자동전환 예정인 것 해지 알림 걸기
  caution: 무료체험은 결제 전날 알림을 걸어두면 자동결제를 막기 쉽습니다.
- 해지한 금액 합계로 월 절약액 기록하기
  done: 이번 달 절약액을 시트에 적었다.`,
  },
  {
    flow: {
      id: 'batch-260601-emergency-fund',
      slug: 'emergency-fund-3month',
      title: '비상금 3개월치 만들기 Flow',
      description: '생활비 3개월치 비상금을 목표로, 매주 모으는 금액과 진행률을 기록하며 쌓아갑니다.',
      category: '금융/세무',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
    },
    text: `## 시작 설정
- 월 고정 생활비 계산해 목표액(×3) 정하기
  why: 실직·질병 등 소득 공백을 버티는 완충금이라 '생활비 기준' 목표가 중요합니다.
  done: 목표 비상금 액수를 정했다.
- 비상금 전용 계좌(쉽게 인출하되 평소엔 안 건드릴 곳) 분리하기

@매주 1회

## 주간 적립
- 이번 주 적립액 자동이체 또는 수동 이체하기
- 남은 목표액과 진행률 기록하기
  done: 누적 금액과 목표 대비 %를 시트에 적었다.
- 충동 지출 있었으면 원인 한 줄 메모하기
  caution: 비상금은 '진짜 비상'에만 쓰고, 사용했으면 다시 채울 계획을 적습니다.`,
  },

  // ───────────────────────────── 커리어 / 취업 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-resume-portfolio',
      slug: 'resume-portfolio-prep',
      title: '이력서·포트폴리오 준비 Flow',
      description: '지원 전 이력서·경력기술서·포트폴리오를 빠진 곳 없이 다듬어 제출 직전 상태로 만듭니다.',
      category: '커리어/취업',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 내용 채우기
- 경력·프로젝트를 '성과 + 숫자'로 다시 쓰기
  why: '담당함'보다 '무엇을 얼마나 개선했는가'가 서류 통과를 가릅니다.
  how: 각 경험을 "상황-행동-결과(수치)" 한 줄로 정리합니다.
  done: 주요 경험 3개 이상을 수치 포함 문장으로 바꿨다.
- 직무 키워드에 맞춰 표현 정렬하기
- 공백·이직 사유 답변 미리 준비하기

## 2. 형식 점검
- 오타·맞춤법·날짜·회사명 검수하기
  caution: 지원 회사명이 다른 곳으로 남아있는 복붙 실수를 꼭 확인합니다.
- 파일명 규칙 통일하기 (이름_직무_이력서.pdf)
- PDF로 변환해 레이아웃 깨짐 확인하기

## 3. 포트폴리오·링크
- 포트폴리오 링크 접근 권한·만료 확인하기
  done: 시크릿창에서 링크가 열리는지 확인했다.
- 깃허브/블로그 등 첨부 링크 최신화하기
- 추천인·경력증명 준비 여부 메모하기`,
  },
  {
    flow: {
      id: 'batch-260601-interview-d3',
      slug: 'interview-d3-prep',
      title: '면접 D-3 준비 Flow',
      description: '면접 3일 전부터 회사 조사, 예상 질문, 당일 준비물까지 날짜별로 준비합니다.',
      category: '커리어/취업',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
    },
    text: `## D-3 회사·직무 조사
- 회사 사업·최근 뉴스·제품 파악하기 D-3
  why: '왜 우리 회사인가'에 구체적으로 답하려면 최신 정보가 필요합니다.
  done: 회사에 대한 핵심 3가지와 질문 1개를 적었다.
- 채용공고 다시 읽고 요구 역량 매칭하기 D-3

## D-2 예상 질문 연습
- 자기소개·지원동기·강약점 답변 소리내어 연습하기 D-2
  how: 답변을 1분 이내로 말하고 녹음해 들어봅니다.
  done: 핵심 질문 5개를 막힘 없이 말할 수 있다.
- 직무 기술 질문·역질문 정리하기 D-2

## D-1 동선·준비물
- 가는 길·소요시간·도착 버퍼 확인하기 D-1
- 복장 준비하고 서류·신분증 챙기기 D-1
  done: 가방에 필요한 것을 다 넣었다.

## D-Day 당일
- 30분 전 도착 목표로 출발하기 D-Day
- 면접 직후 질문·분위기 메모 남기기 D-Day
  why: 다음 면접과 처우 협상에 쓸 기록이 됩니다.`,
  },
  {
    flow: {
      id: 'batch-260601-resignation-handover',
      slug: 'resignation-handover-d30',
      title: '퇴사 인수인계 D-30 Flow',
      description: '퇴사 통보부터 인수인계 문서, 자료 정리, 행정 마무리까지 깔끔하게 떠나도록 날짜별로 정리합니다.',
      category: '커리어/취업',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'calendar',
      warning: '퇴직급여·연차정산·고용보험 등 세부 조건은 회사 규정과 공식 기준에 따라 다릅니다. 인사팀과 공공기관에 직접 확인하세요.',
    },
    text: `## D-30 통보와 일정
- 퇴사 의사 전달하고 마지막 근무일 합의하기 D-30
  caution: 사직서 제출일과 최종 근무일을 문서로 남깁니다.
- 인수인계 대상 업무 목록화하기 D-30
  done: 담당 업무와 인계 대상자를 표로 만들었다.

## D-14 인수인계 문서
- 업무 매뉴얼·진행중 건·연락처 정리하기 D-14
  why: 후임이 바로 이어받을 수 있어야 분쟁 없이 마무리됩니다.
  done: 인수인계서 초안을 작성했다.
- 계정·권한·공용 자료 위치 정리하기 D-14

## D-7 마무리
- 개인 자료 백업하고 회사 자료와 분리하기 D-7
  caution: 회사 기밀·고객 정보는 반출하지 않습니다.
- 연차·경비·법인카드 정산하기 D-7

## D-Day 마지막 날
- 장비·출입증·법인카드 반납하기 D-Day
- 경력증명서·원천징수영수증 발급 요청하기 D-Day
  why: 다음 회사 제출과 연말정산·이직확인서에 필요합니다.
- 고용보험 이직확인서 처리 여부 확인하기 D-Day`,
  },
  {
    flow: {
      id: 'batch-260601-first-day-job',
      slug: 'first-day-new-job',
      title: '첫 출근 준비 Flow',
      description: '입사 첫 출근을 앞두고 행정 서류, 동선, 첫 주 적응 포인트까지 미리 준비합니다.',
      category: '커리어/취업',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 제출 서류
- 회사가 요청한 입사 서류 목록 확인하기
  how: 보통 신분증 사본, 통장 사본, 경력증명, 자격증, 건강검진 등이 필요합니다.
  done: 요청 서류를 모두 준비했다.
- 4대보험·급여계좌 정보 정리하기

## 2. 동선·복장
- 출근길·소요시간·도착 시간 확인하기
- 첫날 복장(드레스코드) 확인하기

## 3. 첫 주 적응
- 팀원 이름·역할 메모할 준비하기
  why: 초반 관계 형성이 적응 속도를 좌우합니다.
- 모르는 용어·약어 그날그날 메모하는 습관 만들기
  done: '첫 주 질문/용어' 메모를 만들었다.
- 1주차 목표(파악할 것)와 회고 시간 정하기`,
  },

  // ───────────────────────────── 건강 / 병원 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-post-checkup',
      slug: 'post-checkup-followup',
      title: '건강검진 결과 후속조치 Flow',
      description: '검진 결과지를 받은 뒤 재검·진료·생활습관 항목을 빠뜨리지 않게 정리하고 일정으로 옮깁니다.',
      category: '건강/검진',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'memo',
      source_title: '국민건강보험 건강검진 결과 안내',
      source_url: 'https://www.nhis.or.kr',
      warning: '검진 결과 해석과 치료 여부는 반드시 의료진 판단을 따르세요. 이 Flow는 결과를 정리하고 진료 예약을 챙기는 준비용입니다.',
    },
    text: `## 1. 결과 정리
- 결과지에서 '정상 아님/추가검사 필요' 항목 표시하기
  why: 여러 항목 중 후속조치가 필요한 것만 골라야 행동으로 이어집니다.
  done: 재검·상담 필요 항목을 목록으로 적었다.
- 수치와 기준치 함께 메모해 다음 검진과 비교 준비하기

## 2. 진료 예약
- 추가검사·전문과 진료 예약하기
  caution: 결과 해석은 자가 판단하지 말고 진료에서 확인합니다.
  done: 예약 날짜를 캘린더에 등록했다.
- 결과지·복용약 목록 챙겨 진료 가기

## 3. 생활 점검(관찰)
- 의료진이 권한 생활습관 항목만 기록표로 만들기
  caution: 임의로 식단·운동·약을 늘리지 않고 권고 범위 안에서만 기록합니다.
- 다음 검진·재검 예정일 미리 캘린더에 표시하기`,
  },
  {
    flow: {
      id: 'batch-260601-dental-routine',
      slug: 'dental-checkup-routine',
      title: '치과 정기검진·스케일링 Flow',
      description: '6개월 주기로 치과 검진과 스케일링을 놓치지 않게 예약·기록하는 루틴입니다.',
      category: '건강/검진',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      warning: '통증·잇몸 출혈 등 증상이 있으면 주기와 상관없이 치과 진료를 우선하세요.',
    },
    text: `@6개월마다

## 예약·방문
- 정기검진·스케일링 예약하기
  why: 스케일링은 연 1회 건강보험이 적용돼 주기 관리가 비용도 아낍니다.
  done: 방문 날짜를 캘린더에 등록했다.
- 보험 적용 스케일링 사용 여부(연 1회) 확인하기
- 진료에서 받은 권고(충치·잇몸·교정 등) 메모하기
  caution: 권고받은 추가 치료는 일정과 예상 비용을 따로 적어둡니다.

## 다음 주기 예약
- 다음 6개월 뒤 검진 알림 미리 걸기
  done: 다음 방문 예정 알림을 설정했다.`,
  },
  {
    flow: {
      id: 'batch-260601-flu-vaccine',
      slug: 'flu-vaccine-season-prep',
      title: '독감 예방접종 시즌 준비 Flow',
      description: '가을~겨울 독감 시즌에 가족별 접종 대상·일정·접종기관을 정리해 빠뜨리지 않게 합니다.',
      category: '건강/예방접종',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'memo',
      source_title: '질병관리청 예방접종도우미',
      source_url: 'https://nip.kdca.go.kr',
      warning: '접종 대상, 무료 지원 여부, 금기사항은 개인 건강상태에 따라 다릅니다. 질병관리청 안내와 접종기관 확인을 우선하세요.',
    },
    text: `## 1. 대상 확인
- 가족별 접종 대상·무료지원 여부 확인하기
  why: 어린이·임신부·어르신은 국가지원 대상이라 대상과 기간 확인이 핵심입니다.
  how: 질병관리청 예방접종도우미에서 대상과 지원 기간을 확인합니다.
  done: 가족별 대상/지원 여부를 메모했다.
- 알레르기·기저질환 등 접종 전 확인사항 정리하기
  caution: 금기사항이 있으면 접종 전 의료진과 상담합니다.

## 2. 예약·방문
- 가까운 지정 접종기관 찾고 예약하기
- 접종일 가족 일정 맞춰 캘린더에 등록하기
  done: 접종 날짜를 정했다.

## 3. 접종 후 기록
- 접종일·접종기관·이상반응 기록하기
  caution: 접종 후 이상반응이 지속되면 접종기관에 연락합니다.`,
  },
  {
    flow: {
      id: 'batch-260601-sleep-habit',
      slug: 'sleep-habit-2week-observe',
      title: '수면 습관 2주 관찰 Flow',
      description: '취침·기상·카페인·스크린 습관을 2주간 관찰 기록해 내 수면 패턴을 파악하는 관찰표입니다.',
      category: '건강/생활습관',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'sheet',
      warning: '이 Flow는 치료가 아니라 수면 패턴 관찰 기록입니다. 불면이 2주 이상 지속되거나 일상에 지장이 크면 전문의 상담을 우선하세요.',
    },
    text: `## 시작 설정
- 관찰만 하고 바꾸지 않을 1주차, 작게 바꿀 2주차로 나누기
  why: 먼저 현재 패턴을 알아야 무엇을 바꿀지 정할 수 있습니다.
  done: 2주 관찰 계획을 정했다.

@매일

## 매일 기록
- 취침·기상 시각 기록하기
  done: 시트에 오늘 취침/기상 시각을 적었다.
- 카페인 섭취 시각·양 기록하기
- 잠들기 전 스크린 사용 시간 기록하기
- 아침 컨디션(1~5점) 기록하기
  caution: 점수가 며칠 연속 낮거나 낮 졸림이 심하면 무리한 자가 조정 대신 상담을 고려합니다.

## 주간 정리
- 1주 패턴 보고 바꿀 습관 1개만 정하기
  why: 한 번에 여러 개를 바꾸면 무엇이 효과인지 알 수 없습니다.
  done: 다음 주에 시도할 습관 1개를 적었다.`,
  },

  // ───────────────────────────── 육아 / 돌봄 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-daycare-admission',
      slug: 'daycare-admission-prep',
      title: '어린이집 입소 준비 Flow',
      description: '입소 신청부터 적응기간, 준비물, 첫 등원까지 부모가 챙겨야 할 것을 시점별로 정리합니다.',
      category: '육아/돌봄',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '임신육아종합포털 아이사랑 / 어린이집 입소 안내',
      source_url: 'https://www.childcare.go.kr',
      warning: '입소 우선순위, 대기, 지원 기준은 지역·기관마다 다릅니다. 아이사랑 포털과 해당 어린이집 안내로 직접 확인하세요.',
    },
    text: `## 1. 신청·선정
- 입소 대기 신청·우선순위 조건 확인하기
  why: 맞벌이·다자녀 등 가점 조건에 따라 대기 순번이 달라집니다.
  done: 신청 현황과 예상 순번을 메모했다.
- 어린이집 방문해 환경·식단·교사 확인하기

## 2. 입소 서류·준비물
- 입소 제출 서류(건강기록·예방접종 등) 확인하기
- 이름표 붙일 준비물(여벌옷·기저귀·낮잠이불 등) 챙기기
  done: 준비물 체크리스트를 완료했다.

## 3. 적응기간
- 적응 프로그램 일정과 단축 등원 계획 잡기
  caution: 아이마다 적응 속도가 달라 무리한 일정은 피합니다.
- 비상연락·투약의뢰·알레르기 정보 공유하기
  why: 응급상황 대응을 위해 교사와 미리 공유해야 합니다.
- 첫 등원일·하원 동선 정하기`,
  },
  {
    flow: {
      id: 'batch-260601-baby-first-week',
      slug: 'newborn-first-week-home',
      title: '신생아 첫 주 집 준비 Flow',
      description: '출산 후 아기를 집에 데려오기 전, 수유·수면·위생·환경을 안전하게 준비하는 체크리스트입니다.',
      category: '육아/돌봄',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'memo',
      warning: '신생아 건강·수유·황달 등은 의료진 안내를 우선하세요. 이 Flow는 집 환경과 준비물을 챙기는 용도입니다.',
    },
    text: `## 1. 수유·수면 환경
- 수유 용품·소독 도구 준비하기
- 아기 침대·실내 온습도 맞추기
  why: 신생아는 체온조절이 미숙해 적정 온습도 유지가 중요합니다.
  done: 실내 온도/습도 기준을 정하고 맞췄다.
- 등 대고 재우기 등 안전수면 환경 확인하기
  caution: 침대에 푹신한 이불·인형을 두지 않습니다.

## 2. 위생·건강 관찰
- 손소독·방문객 위생 규칙 정하기
- 배꼽·황달·체온·수유량 관찰 항목 정하기
  caution: 황달·수유 거부·고열 등 이상 신호는 즉시 의료진에 연락합니다.
- 산후조리·예방접종·영유아검진 일정 메모하기

## 3. 부모 준비
- 야간 수유 역할·휴식 나누기
- 응급실·소아과 연락처 보이는 곳에 붙이기
  done: 비상 연락처를 정리해 붙였다.`,
  },

  // ───────────────────────────── 학습 / 시험 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-toeic-d30',
      slug: 'toeic-d30-prep',
      title: '토익 D-30 준비 Flow',
      description: '시험 30일 전부터 파트별 학습, 모의고사, 실전 점검까지 날짜와 반복 루틴으로 준비합니다.',
      category: '학습/시험',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
    },
    text: `## D-30 기준 잡기
- 현재 실력 모의고사 1회 풀어 약점 파트 파악하기 D-30
  why: 약점 파트를 알아야 30일을 효율적으로 배분할 수 있습니다.
  done: 파트별 점수와 약점을 시트에 적었다.
- 목표 점수와 파트별 목표 정하기 D-30

@매일 LC/RC 각 30분

## 매일 학습
- 약점 파트 집중 문제풀이하기
  how: 틀린 문제는 오답 이유를 한 줄로 적습니다.
  done: 오늘 푼 문항 수와 오답 유형을 기록했다.
- 매일 단어 30개 누적 복습하기

## D-7 실전 점검
- 시간 재고 모의고사 풀기 D-7
- 시험장 위치·준비물(신분증·연필) 확인하기 D-7
  done: 시험 당일 준비물을 챙겼다.

## D-Day
- 컨디션 관리하고 시험 직후 약점 메모하기 D-Day`,
  },
  {
    flow: {
      id: 'batch-260601-reading-habit',
      slug: 'reading-habit-4week',
      title: '독서 습관 4주 루틴 Flow',
      description: '하루 조금씩 읽는 습관을 4주간 만들고, 읽은 분량과 한 줄 메모를 기록합니다.',
      category: '학습/자기계발',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
    },
    text: `## 시작 설정
- 읽을 책 1권과 하루 분량(쪽/시간) 정하기
  why: 목표가 작고 구체적일수록 습관이 됩니다.
  done: 책과 하루 목표 분량을 정했다.
- 읽을 시간·장소(트리거) 정하기

@매일 15분

## 매일 기록
- 오늘 읽은 분량 기록하기
  done: 시트에 오늘 읽은 쪽수를 적었다.
- 기억할 문장·생각 한 줄 메모하기
  why: 한 줄 메모가 다 읽은 뒤 남는 자산이 됩니다.

@매주 1회

## 주간 회고
- 이번 주 읽은 분량과 빠진 날 돌아보기
- 다음 주 분량 조정하기
  caution: 못 지킨 날을 자책하기보다 분량을 현실적으로 낮춥니다.`,
  },
  {
    flow: {
      id: 'batch-260601-driver-license-test',
      slug: 'driver-license-test-prep',
      title: '운전면허 취득 준비 Flow',
      description: '신체검사부터 학과·기능·도로주행 시험까지 운전면허 취득 단계를 순서대로 정리합니다.',
      category: '학습/자격',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '도로교통공단 안전운전 통합민원',
      source_url: 'https://www.safedriving.or.kr',
      warning: '응시 절차·수수료·면제 조건은 면허 종류와 개인 상황에 따라 다릅니다. 공식 안내로 확인하세요.',
    },
    text: `## 1. 사전 준비
- 응시할 면허 종류(1·2종) 정하기
- 신체검사·교통안전교육 받기
  done: 신체검사와 교육을 마쳤다.

## 2. 학과시험
- 교재·기출 앱으로 학과 공부하기
  how: 틀린 문제 위주로 반복합니다.
- 학과시험 예약·응시하기
  done: 학과 합격을 확인했다.

## 3. 기능·도로주행
- 기능시험(장내) 연습·응시하기
- 도로주행 연습하고 응시하기
  caution: 도로주행은 감점 항목(안전거리·신호·정지선)을 미리 익힙니다.
- 합격 후 면허증 발급받기
  done: 면허증을 수령했다.`,
  },

  // ───────────────────────────── 여행 / 이동 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-domestic-trip',
      slug: 'domestic-trip-2d1n',
      title: '국내 1박2일 여행 준비 Flow',
      description: '예약·동선·짐·예산을 한 번에 정리해 떠나기 전 빠뜨림 없이 준비하는 체크리스트입니다.',
      category: '여행/이동',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 예약
- 숙소·교통(기차/렌터카) 예약하기
  done: 예약 확인 메일/번호를 저장했다.
- 가고 싶은 곳·맛집 동선 순서로 정리하기
  caution: 휴무일·예약 필수 여부를 미리 확인합니다.

## 2. 짐
- 1박 기준 옷·세면·충전기·상비약 챙기기
- 날씨 확인하고 우산/겉옷 결정하기
  done: 출발일 날씨를 확인했다.

## 3. 출발 전
- 예산과 결제수단(현금/카드) 정하기
- 집 단속(가스·전기·문단속) 하기
- 차량이면 주유·타이어·세차 확인하기`,
  },
  {
    flow: {
      id: 'batch-260601-camping-first',
      slug: 'camping-first-checklist',
      title: '첫 캠핑 준비물 Flow',
      description: '처음 캠핑 갈 때 텐트·취사·수면·안전 장비를 빠뜨리지 않게 카테고리별로 챙깁니다.',
      category: '여행/이동',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      warning: '화기·전기 사용과 날씨 변화는 안전사고로 이어질 수 있습니다. 캠핑장 규정과 일기예보를 확인하세요.',
    },
    text: `## 1. 잠자리
- 텐트·타프·매트·침낭 챙기기
  done: 잠자리 장비를 다 챙겼다.
- 날씨 맞춰 보온/방수 준비하기

## 2. 취사
- 버너·코펠·식기·물 챙기기
- 식단 짜고 식재료 손질해 가기
  why: 현장 조리를 줄이면 편하고 쓰레기도 줍니다.

## 3. 안전·기타
- 랜턴·보조배터리·구급함 챙기기
- 화기 안전수칙·소화 대비 확인하기
  caution: 텐트 안 화기 사용은 일산화탄소 중독 위험이 있어 금지합니다.
- 캠핑장 규정·체크인/아웃 시간 확인하기
- 쓰레기 분리·잔불 정리 계획 세우기`,
  },
  {
    flow: {
      id: 'batch-260601-overseas-d60',
      slug: 'overseas-trip-d60-booking',
      title: '해외여행 D-60 예약 타임라인 Flow',
      description: '항공·숙소·여권·예약을 시점별로 진행해 가격과 준비를 모두 놓치지 않게 합니다.',
      category: '여행/이동',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      warning: '비자·입국 요건·여권 유효기간 규정은 국가마다 다릅니다. 외교부와 해당국 공식 정보를 확인하세요.',
    },
    text: `## D+0 큰 결정
- 여권 유효기간(6개월 이상) 확인하기 D+0
  why: 유효기간 부족은 출국 자체가 막히는 가장 흔한 사고입니다.
  done: 여권 만료일을 확인했다.
- 항공권 검색·예약하기 D+0

## D+7 숙소·동선
- 숙소 예약하고 취소 규정 확인하기 D+7
- 비자·입국요건 확인하기 D+7
  caution: 전자여행허가(ETA 등) 필요 국가인지 미리 확인합니다.

## D+30 디테일
- 여행자보험 가입하기 D+30
- 환전·해외결제 카드 준비하기 D+30
- 데이터(로밍/eSIM) 정하기 D+30

## D+55 출발 직전
- 일정·예약·숙소 주소 한 곳에 정리하기 D+55
  done: 예약 확인서를 한 폴더에 모았다.
- 짐·전압(어댑터)·상비약 챙기기 D+55`,
  },

  // ───────────────────────────── 디지털 / 보안 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-phone-migration',
      slug: 'phone-change-migration',
      title: '스마트폰 교체 데이터 이전 Flow',
      description: '새 폰으로 바꿀 때 백업·인증·간편결제·자료 이전을 빠뜨리지 않게 순서대로 정리합니다.',
      category: '디지털/보안',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
    },
    text: `## 1. 옛 폰에서 백업
- 사진·연락처·메시지 백업하기
  done: 백업 완료를 확인했다.
- 카카오톡 대화 백업하기
  caution: 카톡은 별도 백업/복원을 안 하면 대화가 사라질 수 있습니다.
- 인증서·간편결제 이전 방법 확인하기

## 2. 새 폰 설정
- 데이터 이전(USB/클라우드) 실행하기
- 본인인증·OTP·은행 앱 재등록하기
  why: 기기 변경 시 인증·OTP는 대부분 재등록이 필요합니다.
  done: 주요 앱 로그인/인증을 마쳤다.

## 3. 옛 폰 마무리
- 옛 폰 데이터 완전 삭제(초기화)하기
  caution: 초기화 전 모든 이전이 끝났는지 다시 확인합니다.
- 유심·기기 반납/처분 정하기`,
  },
  {
    flow: {
      id: 'batch-260601-password-audit',
      slug: 'password-security-audit',
      title: '비밀번호·계정 보안 점검 Flow',
      description: '중요 계정의 비밀번호와 2단계 인증을 주기적으로 점검해 계정 도용을 예방합니다.',
      category: '디지털/보안',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'sheet',
    },
    text: `@3개월마다

## 계정 점검
- 메일·은행·간편결제 등 중요 계정 목록화하기
  why: 메일이 뚫리면 연결된 계정이 줄줄이 위험해 우선순위가 중요합니다.
  done: 중요 계정 목록을 시트에 적었다.
- 여러 곳에 같은 비밀번호 쓰는 계정 바꾸기
  caution: 비밀번호 재사용이 가장 흔한 침해 경로입니다.
- 2단계 인증(OTP) 켜져 있는지 확인하기
  done: 중요 계정의 2단계 인증을 확인했다.
- 안 쓰는 계정·앱 권한 정리하기
- 로그인 알림·복구 이메일/전화 최신화하기`,
  },
  {
    flow: {
      id: 'batch-260601-photo-backup',
      slug: 'photo-cloud-backup-routine',
      title: '사진·파일 백업 루틴 Flow',
      description: '소중한 사진과 파일을 매달 백업하고 정리해 분실·고장에 대비하는 루틴입니다.',
      category: '디지털/보안',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
    },
    text: `@월 1회

## 이번 달 백업
- 새로 찍은 사진·영상 클라우드/외장에 백업하기
  why: 폰 분실·고장은 예고 없이 와서 정기 백업이 유일한 대비입니다.
  done: 이번 달 백업 완료를 확인했다.
- 중요 문서(증명서·계약서 등) 백업 위치 확인하기
- 클라우드 저장공간·요금 점검하기
  caution: 용량 초과로 자동백업이 멈춰 있지 않은지 확인합니다.
- 백업본이 실제로 열리는지 한 번 확인하기
  why: '백업했다고 믿었는데 안 열리는' 사고를 막습니다.`,
  },

  // ───────────────────────────── 반려동물 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-new-puppy',
      slug: 'new-puppy-first-week',
      title: '강아지 입양 첫 주 준비 Flow',
      description: '새 강아지를 맞이하기 전 환경·용품·병원·등록을 준비해 첫 주를 안전하게 보냅니다.',
      category: '반려동물',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      warning: '예방접종·중성화·건강 문제는 수의사 진료를 우선하세요. 동물등록은 법적 의무입니다.',
    },
    text: `## 1. 환경·용품
- 사료·식기·배변패드·켄넬 준비하기
  done: 기본 용품을 갖췄다.
- 위험물(전선·약·식물) 치우고 공간 정하기
  caution: 강아지가 삼키면 위험한 물건을 먼저 치웁니다.

## 2. 건강
- 동물병원 첫 방문·접종 일정 잡기
  why: 접종 전에는 외부 활동을 제한해야 해서 초기 일정이 중요합니다.
  done: 병원 방문일을 정했다.
- 이전 보호자/분양처에서 접종·건강 기록 받기

## 3. 행정·적응
- 동물등록(내장칩/외장) 신청하기
  caution: 동물등록은 법적 의무이며 미등록 시 과태료가 있습니다.
- 첫 주 적응(분리불안·배변) 관찰 기록하기
- 산책·식사·배변 루틴 시간 정하기`,
  },
  {
    flow: {
      id: 'batch-260601-pet-checkup',
      slug: 'pet-health-checkup-prep',
      title: '반려동물 건강검진 준비 Flow',
      description: '정기 건강검진 전 증상·식이·기록을 정리해 진료에서 빠뜨리지 않고 확인합니다.',
      category: '반려동물',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      warning: '검진 항목과 결과 해석은 수의사 판단을 따르세요. 이 Flow는 진료 준비용 정리입니다.',
    },
    text: `## 1. 평소 관찰 정리
- 최근 식욕·체중·배변·활력 변화 메모하기
  why: 말 못 하는 반려동물은 보호자 관찰 기록이 진단에 큰 도움이 됩니다.
  done: 최근 변화 항목을 적었다.
- 걱정되는 증상·행동 변화 적어 가기

## 2. 예약·준비
- 검진 예약하고 금식 등 준비사항 확인하기
  caution: 혈액검사 전 금식이 필요할 수 있어 미리 확인합니다.
- 이전 검진·접종·복용약 기록 챙기기

## 3. 진료 후
- 권고받은 검사·치료·재방문 일정 메모하기
  done: 다음 방문/재검 일정을 캘린더에 등록했다.
- 식이·체중 관리 권고 기록표 만들기`,
  },

  // ───────────────────────────── 생활 / 계절 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-yearend-clean',
      slug: 'year-end-deep-clean-d7',
      title: '연말 대청소 D-7 Flow',
      description: '연말 대청소를 구역별로 나눠 7일간 부담 없이 끝내는 타임라인입니다.',
      category: '생활/계절',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
    },
    text: `## D-7 비우기
- 안 쓰는 물건 버리기·기부·중고 정리하기 D-7
  why: 물건을 먼저 줄여야 청소와 수납이 쉬워집니다.
  done: 한 구역을 비웠다.

## D-5 주방
- 냉장고 정리하고 유통기한 지난 것 버리기 D-5
- 가스레인지·후드·싱크대 닦기 D-5

## D-3 욕실·창
- 욕실 물때·곰팡이 청소하기 D-3
- 창틀·방충망·유리 닦기 D-3

## D-1 마무리
- 바닥·먼지·환기 마무리하기 D-1
- 분리수거 한 번에 배출하기 D-1
  done: 집 전체 청소를 끝냈다.`,
  },
  {
    flow: {
      id: 'batch-260601-winter-home',
      slug: 'winter-home-check',
      title: '겨울철 집 점검 Flow',
      description: '난방·결로·동파·외풍을 겨울 전에 점검해 추위와 사고를 예방하는 체크리스트입니다.',
      category: '생활/계절',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      warning: '보일러·가스 관련 이상은 직접 손대지 말고 전문가/관리사무소에 점검을 요청하세요.',
    },
    text: `## 1. 난방
- 보일러 작동·온수 점검하기
  caution: 이상한 소리·냄새가 나면 사용을 멈추고 점검을 요청합니다.
- 난방 필요 없는 구역 밸브 조절하기

## 2. 결로·외풍
- 창문 외풍·결로 부위 확인하고 단열재/뽁뽁이 붙이기
  why: 결로는 곰팡이로 이어져 미리 막는 게 좋습니다.
  done: 외풍 부위를 처리했다.
- 환기 시간 정해 습기 빼기

## 3. 동파·안전
- 외부 수도·계량기 동파 대비하기
  caution: 한파 예보 때는 수도를 살짝 틀어두는 등 동파를 예방합니다.
- 전기장판·히터 사용 안전(과열·타이머) 확인하기`,
  },
  {
    flow: {
      id: 'batch-260601-wardrobe-swap',
      slug: 'seasonal-wardrobe-swap',
      title: '환절기 옷장 정리 Flow',
      description: '계절이 바뀔 때 옷을 정리·세탁·보관하고 필요한 것만 남기는 정리 루틴입니다.',
      category: '생활/계절',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 꺼내고 분류
- 지난 계절 옷 다 꺼내 입은 것/안 입은 것 나누기
  why: 한 번도 안 입은 옷을 알아야 다음 소비를 줄입니다.
  done: 옷을 세 더미(보관/처분/수선)로 나눴다.
- 안 입은 옷 기부·중고·버리기 정하기

## 2. 세탁·보관
- 보관할 옷 세탁·드라이 맡기기
  caution: 오염된 채 보관하면 변색·좀이 생깁니다.
- 방습제 넣어 비시즌 옷 보관하기

## 3. 다음 계절 준비
- 다가올 계절 옷 상태(보풀·단추·길이) 점검하기
- 부족한 기본템만 메모해 충동구매 줄이기
  done: 진짜 필요한 것만 구매 메모에 적었다.`,
  },

  // ───────────────────────────── 안전 / 응급 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-firstaid-kit',
      slug: 'home-firstaid-kit-check',
      title: '가정 상비약·구급함 점검 Flow',
      description: '집 구급함의 약 유통기한과 부족한 품목을 반기마다 점검해 응급 상황에 대비합니다.',
      category: '안전/응급',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      warning: '약 복용·보관은 사용설명서와 약사 안내를 따르세요. 처방약은 임의로 나눠 쓰지 않습니다.',
    },
    text: `@6개월마다

## 점검
- 상비약 유통기한 확인하고 지난 것 폐기하기
  caution: 폐의약품은 약국·전용 수거함에 버립니다.
  done: 유통기한 지난 약을 정리했다.
- 부족한 품목(소독약·밴드·해열제·체온계 등) 채우기
- 가족 알레르기·복용약 메모 최신화하기
  why: 응급 시 정보 공유가 빠른 대응을 돕습니다.
- 응급 연락처(119·주치의·가까운 응급실) 붙여두기
  done: 비상 연락처를 보이는 곳에 붙였다.`,
  },
  {
    flow: {
      id: 'batch-260601-disaster-prep',
      slug: 'disaster-home-prep',
      title: '지진·화재 가정 대비 점검 Flow',
      description: '비상용품, 대피 동선, 소화·차단 위치를 점검해 재난에 대비하는 가정 체크리스트입니다.',
      category: '안전/응급',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '행정안전부 국민재난안전포털',
      source_url: 'https://www.safekorea.go.kr',
      warning: '대피 요령은 상황에 따라 다릅니다. 국민재난안전포털 공식 안내를 함께 확인하세요.',
    },
    text: `## 1. 비상용품
- 비상가방(물·비상식량·손전등·배터리·구급함) 준비하기
  done: 비상가방을 한곳에 두었다.
- 가족 비상연락·집결 장소 정하기
  why: 흩어졌을 때 다시 만날 약속이 있어야 합니다.

## 2. 집 안 점검
- 가구 넘어짐 방지·높은 곳 무거운 물건 점검하기
- 소화기 위치·사용법 확인하기
  caution: 소화기 압력 게이지가 정상 범위인지 봅니다.
- 가스·전기 차단 위치 가족 모두 알기

## 3. 대피
- 현관까지 대피 동선 확보(짐으로 막지 않기)하기
- 화재경보기·감지기 작동 확인하기
  done: 감지기 작동을 확인했다.`,
  },

  // ───────────────────────────── 관계 / 이벤트 ─────────────────────────────
  {
    flow: {
      id: 'batch-260601-housewarming',
      slug: 'housewarming-prep',
      title: '집들이 준비 Flow',
      description: '초대·메뉴·청소·동선을 미리 정리해 손님맞이를 여유 있게 준비합니다.',
      category: '관계/이벤트',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
    },
    text: `## 1. 초대·메뉴
- 인원·날짜 정하고 초대하기
  done: 참석 인원을 확정했다.
- 음식(직접/배달/포장) 정하고 양 계산하기
  caution: 알레르기·비건 등 식이 제한을 미리 물어봅니다.

## 2. 준비
- 부족한 그릇·의자·수저 점검하기
- 음료·간식·답례품 준비하기

## 3. 당일 전
- 화장실·현관·거실 위주로 청소하기
  why: 손님이 보는 공간에 시간을 집중하면 효율적입니다.
- 주차·찾아오는 길 안내 메시지 보내기
  done: 오는 길 안내를 공유했다.`,
  },
  {
    flow: {
      id: 'batch-260601-parents-birthday',
      slug: 'parents-birthday-prep',
      title: '부모님 생신 준비 Flow',
      description: '식당·선물·가족 일정·이벤트를 미리 챙겨 부모님 생신을 빠뜨림 없이 준비합니다.',
      category: '관계/이벤트',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
    },
    text: `## D-14 큰 결정
- 가족 일정 맞춰 날짜·장소 정하기 D-14
  done: 모일 날짜와 장소를 확정했다.
- 식당 예약하기(인원·룸·메뉴) D-14
  caution: 주말·명절 근처는 예약이 빨리 차니 서두릅니다.

## D-7 선물·역할
- 선물 정하고 주문하기 D-7
  how: 가족끼리 중복되지 않게 미리 맞춥니다.
- 케이크·꽃·메시지 등 역할 나누기 D-7

## D-1 확인
- 예약·선물 도착·이동편 확인하기 D-1
  done: 예약과 선물을 최종 확인했다.

## D-Day
- 사진·영상 남기고 다음 기념일 메모하기 D-Day`,
  },
];

export const contentsBatch260601Bundles: FlowBundle[] = specs.map(build);
