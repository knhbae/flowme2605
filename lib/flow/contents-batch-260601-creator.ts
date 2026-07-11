import { parseTextFlow } from './parser';
import { Flow, FlowBundle } from './types';

/**
 * 2026-06-01 크리에이터·블로그 기반 배치 (creator/blog-source build).
 *
 * 공식출처 배치(official)와 함께 "블로그·유튜브 기반 콘텐츠도 필요하다"는 요구를 반영한다.
 * 각 Flow는 실재하는 한국 YouTube 채널·블로그·플랫폼에 매핑된다.
 *
 * 원칙:
 * - YouTube 채널 기반 → source_type 'creator_experience', link type 'creator'.
 * - 블로그·플랫폼 기반 → source_type 'reference', link type 'reference'.
 * - URL은 WebSearch로 확인된 실제 포스트/재생목록 URL 우선 사용.
 * - 재테크/재무 콘텐츠는 'financial_sensitive'로 표시, 경고를 분리한다.
 * - 어떤 Flow도 검증/대표/공개 MVP 아님. source-review audit 후에 승격 검토.
 *
 * 분류: 모두 source_status 'needs_review', source_precision 'exact',
 * lifecycle 'fix', inventory source_needs_review.
 * 비민감 18개 → source_review 'audit_now'.
 * 재무민감 2개 → source_review 'risk_review'.
 *
 * 2026-06-03 rebuild: 20개 모두 WebSearch 실소스 기반으로 재작성.
 */

const now = '2026-06-01T00:00:00.000Z';

type BatchSpec = {
  flow: Omit<Flow, 'created_at' | 'updated_at'>;
  text: string;
  source_type: 'creator_experience' | 'reference';
};

function build(spec: BatchSpec): FlowBundle {
  const parsed = parseTextFlow(spec.text, spec.flow.id);
  const updatedAt = spec.flow.source_checked_at
    ? `${spec.flow.source_checked_at}T00:00:00.000Z`
    : now;
  return {
    flow: {
      ...spec.flow,
      content_type: spec.flow.content_type ?? 'default',
      source_status: spec.flow.source_status ?? 'needs_review',
      source_precision: spec.flow.source_precision ?? 'exact',
      source_checked_at: spec.flow.source_checked_at ?? '2026-06-01',
      created_at: now,
      updated_at: updatedAt,
      raw_text: spec.text,
    },
    ...parsed,
    items: parsed.items.map((item) => ({ ...item, source_type: spec.source_type })),
  };
}

const specs: BatchSpec[] = [
  // ──────────────────────────── 요리 / 식단 ────────────────────────────
  {
    source_type: 'creator_experience',
    flow: {
      id: 'creator-260601-recipe-video-execute',
      slug: 'recipe-video-execute',
      title: '레시피 영상 실전 적용 Flow',
      description: '백종원의 요리비책 채널에서 영상 한 편을 골라 재료 준비부터 완성·평가까지 실전으로 옮깁니다.',
      category: '요리/레시피',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '백종원의 요리비책 – 레시피 재생목록',
      source_url: 'https://www.youtube.com/playlist?list=PLOYo7Q0zXMLNmYqpJrt4pNeO-IlaDBVHW',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      conversion_note: '재생목록의 개별 영상 행을 아직 가져오지 않았으므로 사용자가 영상 한 편을 고르는 준비 화면까지만 유지하고 공개 대표 승격은 보류합니다.',
      tags: ['요리', '레시피', 'creator', 'YouTube'],
    },
    text: `## 1. 영상 선택과 재료 준비
- 오늘 만들 레시피 영상 한 편 고르기
  why: 재생목록 전체가 아니라 실제로 따라 할 영상 한 편을 정해야 재료와 순서를 정확히 옮길 수 있습니다.
  how: 재생목록에서 오늘 만들 메뉴 영상 한 편을 고르고, 영상 제목과 링크를 저장합니다.
  done: 영상 링크와 메뉴 이름을 메모에 저장했다.
  link: 백종원의 요리비책 재생목록 | https://www.youtube.com/playlist?list=PLOYo7Q0zXMLNmYqpJrt4pNeO-IlaDBVHW | creator
- 재료 목록 작성하고 없는 재료 확인하기
  why: 조리 도중 재료가 빠지면 중단하게 되므로 시작 전에 목록을 만들어야 합니다.
  how: 영상 첫 30초~1분(재료 소개 부분)을 보며 재료와 양을 메모하고, 집에 없는 것만 따로 표시합니다.
  done: 필요한 재료 목록과 구매할 항목을 적었다.
- 없는 재료 구매 또는 대체재 결정하기
  how: 선택한 영상에서 제작자가 직접 제시한 대체재만 확인하고, 그 밖의 변경은 개인 메모로 남깁니다.
  done: 구매하거나 대체재로 바꾸기로 결정했다.

## 2. 조리 실행
- 조리 전 공간·도구 세팅하기
  how: 도마, 칼, 계량컵, 팬을 꺼내두고 작업 공간을 정리합니다. 영상에서 백종원이 쓰는 도구를 미리 확인해 세팅합니다.
  done: 조리 도구를 꺼내 준비했다.
- 영상 보며 레시피 따라 조리하기
  why: 영상을 켜두고 진행해야 불 조절·타이밍 실수를 줄일 수 있습니다. 백종원 채널은 단계마다 설명이 명확합니다.
  how: 영상을 단계별로 정지·재생하며 따라가고, 바꾼 재료나 다른 점을 메모합니다.
  done: 요리를 완성했다.
  caution: 재료 대체나 화력 차이로 맛이 다를 수 있습니다. 실패해도 시도 자체가 다음 기준이 됩니다.

## 3. 평가와 기록
- 맛과 결과 한 줄 평가 남기기
  why: 평가를 남겨야 다음에 같은 레시피를 다시 만들지, 수정할지 결정할 수 있습니다.
  how: 간 맞음·불 강도·식감·다음에 바꿀 점을 한 줄씩 메모합니다.
  done: 평가와 다음에 바꿀 점을 기록했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-weekly-meal-plan',
      slug: 'weekly-meal-plan',
      title: '평일 5일 저녁 식단 Flow',
      description: '오늘의집 주간 식단표의 월~금 메뉴를 한 주 시트로 옮겨 장보기와 조리 순서를 확인합니다.',
      category: '요리/식단',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
      source_title: '오늘의집 – 쉬운 식단 맛있게 가벼운 5만원 이하 주간식단표',
      source_url: 'https://ohou.se/advices/8220',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      conversion_note: '원문에 있는 월~금 메뉴 다섯 행과 필요한 재료 확인을 한 주 실행 시트로 옮겼습니다.',
      warning: '원문의 비용·영양 표현은 작성 당시 사례입니다. 알레르기, 식이 제한과 현재 가격은 사용자가 별도로 확인하세요.',
      tags: ['요리', '식단', '장보기', 'reference'],
    },
    text: `@주 1회

## 장보기 전
- 원문 식단표에서 이번 주에 만들 메뉴 확인하기
  why: 이 Flow는 원문에 있는 평일 다섯 메뉴를 그대로 한 주 실행표로 옮깁니다.
  how: 알레르기나 먹지 못하는 재료가 있는 메뉴는 끄고, 사용할 메뉴의 재료만 원문에서 확인합니다.
  done: 이번 주에 만들 메뉴와 제외할 메뉴를 정했다.
  link: 오늘의집 평일 5일 식단표 | https://ohou.se/advices/8220 | reference
- 필요한 재료와 집에 있는 재료 나누기
  done: 살 재료만 장보기 메모에 남겼다.

## 월~금 식단
- 월요일 양배추참치덮밥·단무지무침 만들기
  done: 월요일 메뉴를 만들었다.
- 화요일 버섯샐러드 만들기
  done: 화요일 메뉴를 만들었다.
- 수요일 토마토 야채수프 만들기
  done: 수요일 메뉴를 만들었다.
- 목요일 굴무솥밥·무된장국 만들기
  caution: 굴 등 알레르기나 식이 제한이 있으면 해당 메뉴를 제외합니다.
  done: 목요일 메뉴를 만들었다.
- 금요일 연어 포케 만들기
  caution: 생식 재료의 보관·위생과 개인 식이 제한을 확인합니다.
  done: 금요일 메뉴를 만들었다.`,
  },

  // ──────────────────────────── 정리 / 수납 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-closet-organize-1day',
      slug: 'closet-organize-1day',
      title: '옷장 정리 1일 챌린지 Flow',
      description: '오늘의집 "미니멀 옷장 정리! 옷 비우는 기준과 잘 버리는 방법" 가이드를 바탕으로 옷장을 비우고, 분류하고, 되돌려 넣는 하루 정리를 실행합니다.',
      category: '정리/수납',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '오늘의집 – 미니멀 옷장 정리! 옷 비우는 기준과 잘 버리는 방법',
      source_url: 'https://ohou.se/advices/7406',
      conversion_note: '현재 오늘의집 원문의 개인별 비움 기준, 유예·중고·기부·수거 분류, 가족·계절별 배치 사례만 옷장 비우기→분류→되돌려 넣기 체크리스트로 전환했습니다.',
      tags: ['정리', '수납', '옷장', 'reference'],
    },
    text: `## 1. 비울 기준 준비
- 비움 기준과 유예기간 정하기
  why: 원문은 1년을 예로 들지만 3년·5년처럼 각자 상황에 맞는 기준과 유예기간을 먼저 정하라고 안내합니다.
  how: 입지 않은 기간, 현재 몸에 맞는지, 내일 바로 입고 나갈 수 있는지를 기준으로 남길지 다시 볼지 정합니다.
  done: 내가 사용할 비움 기준과 유예기간을 한 줄로 적었다.
  link: 오늘의집 옷장 정리 가이드 | https://ohou.se/advices/7406 | reference
- 분류용 박스나 봉투 미리 나누기
  how: 남김, 유예, 중고거래, 기부, 폐의류 수거처럼 실제 처리 방법별로 박스나 봉투를 준비합니다.
  done: 분류할 자리와 봉투를 준비했다.

## 2. 분류하기
- 옷을 꺼내 남김·유예·처분으로 분류하기
  how: 정한 기준으로 옷을 하나씩 보고, 망설여지는 옷은 바로 버리지 말고 유예 묶음에 둡니다.
  done: 꺼낸 옷을 처리 방법별로 나눴다.
- 남길 옷을 사람·계절·종류별로 묶기
  how: 가족 옷은 사람별로 구역을 나누고, 지난 계절 옷은 별도 보관할지 정합니다. 자주 입는 옷은 꺼내기 쉬운 위치에 둡니다.
  done: 남길 옷의 구역과 위치를 정했다.

## 3. 넣기·처분
- 정한 위치로 옷 되돌려 넣기
  how: 걸어둘 옷, 바구니에 넣을 옷, 지난 계절 보관함을 나눠 정한 구역에 넣습니다.
  done: 남길 옷을 정한 위치에 모두 넣었다.
- 비울 옷의 처리 방법과 날짜 정하기
  how: 상태에 따라 중고거래, 지인 나눔, 기부, 폐의류 수거 중 하나를 정하고 집 밖으로 보낼 날짜를 적습니다.
  done: 비울 옷마다 처리 방법과 날짜를 정했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-kitchen-reset-organize',
      slug: 'kitchen-reset-organize',
      title: '냉장고 식재료 정리 Flow',
      description: '오늘의집 냉장고 정리 원문에 맞춰 식재료 상태를 확인하고, 보이는 용기와 사용 빈도로 자리를 다시 잡습니다.',
      category: '정리/수납',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '오늘의집 – 보관 기간 늘려주는 냉장고 정리 노하우',
      source_url: 'https://ohou.se/advices/8631',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      conversion_note: '원문의 냉장고 식재료 상태 확인, 보이는 용기, 사용 순서별 배치와 냉동 소분을 체크리스트로 옮겼습니다.',
      tags: ['정리', '주방', '수납', 'reference'],
    },
    text: `## 1. 식재료 상태 확인
- 냉장고에서 정리가 필요한 식재료 꺼내기
  why: 원문은 냉장고를 먼저 훑고 상태와 보관 위치를 함께 확인하라고 안내합니다.
  how: 냉장실과 냉동실을 구역별로 확인하고, 먹을 것·먼저 먹을 것·정리할 것을 나눕니다. 소비기한만으로 상태를 단정하지 말고 제품 표시와 보관 상태를 함께 확인합니다.
  done: 정리할 식재료를 구분했다.
  link: 오늘의집 냉장고 정리 가이드 | https://ohou.se/advices/8631 | reference

## 2. 보이게 다시 넣기
- 식재료를 내용이 보이는 용기나 구역으로 나누기
  how: 식품과 용기에 표시된 보관 방법을 지키면서, 내용이 보이는 용기와 바구니로 구역을 나눕니다.
  done: 식재료 종류별 자리를 정했다.
- 자주 쓰는 식재료와 먼저 먹을 음식을 앞쪽에 놓기
  how: 자주 먹는 반찬과 먼저 사용할 재료는 손이 닿는 앞쪽에, 덜 쓰는 것은 위쪽이나 뒤쪽에 둡니다.
  done: 먼저 먹을 음식이 문을 열면 보이게 배치됐다.
- 냉동 식재료를 소분하고 내용 이름 붙이기
  how: 냉동실 안에서 내용이 가려지지 않도록 소분하고 이름을 표시합니다.
  done: 냉동 식재료를 찾을 수 있게 정리했다.`,
  },

  // ──────────────────────────── 재테크 / 재무 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-monthly-household-budget',
      slug: 'monthly-household-budget',
      title: '월간 가계부 시작 Flow',
      description: '가계 예산 50/30/20 법칙을 참고해 지출 카테고리를 잡고 첫 달 가계부 기록 루틴을 만듭니다.',
      category: '재테크/재무',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'sheet',
      source_title: '가계 예산 50/30/20 법칙 – 가계부 작성 가이드',
      source_url: 'https://eknowhow.kr/budgeting-50-30-20-rule/',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-12',
      conversion_note: '현재 연결된 2차 가계부 가이드의 50/30/20 예시와 고정·변동·금융지출 분류를 기록 출발점으로만 사용합니다. 대표 공개 Flow로 쓰기에는 출처 권위와 개인화 경계가 부족해 재구성이 필요합니다.',
      warning: '이 Flow는 지출 기록과 파악을 돕는 도구이며 투자·재무 조언이 아닙니다. 금융 결정은 공인 전문가와 상담하세요.',
      tags: ['재테크', '가계부', '재무', 'reference'],
    },
    text: `@월 1회(월초)

## 1. 지출 카테고리 설정
- 내 지출 유형에 맞는 카테고리 4~6개 정하기
  why: 카테고리가 너무 많으면 기록이 번거롭고, 너무 적으면 원인 파악이 어렵습니다. 초보일수록 크게 분류해 간결하게 적는 것이 지속에 유리합니다.
  how: 지출을 고정지출(월세·보험·구독), 변동지출(식비·교통·쇼핑), 금융지출(저축·투자·대출상환) 3가지로 크게 나눠 시작합니다. 50/30/20은 비교용 예시일 뿐이며, 실제 고정지출과 목표에 맞는 비율을 직접 정합니다.
  done: 카테고리 목록을 시트 첫 줄에 적었다.
  link: 가계 예산 50/30/20 법칙 가이드 | https://eknowhow.kr/budgeting-50-30-20-rule/ | reference
  caution: 투자 방식·종류는 이 Flow에서 결정하지 않습니다. 기록 습관을 먼저 만드는 게 목적입니다.
- 이번 달 고정지출 목록 작성하기
  how: 월세, 대출 상환, 보험료, 구독 서비스 등 매달 나가는 금액을 먼저 기록합니다.
  done: 고정지출 항목과 금액을 정리했다.

## 2. 매일 기록 루틴
- 하루 기록 습관: 자기 전 5분 그날 지출 입력하기
  why: 당일 입력하지 않으면 기억이 흐려지고 누락이 생깁니다.
  how: 카드·은행 앱의 결제 내역을 확인해 카테고리별로 시트에 입력합니다.
  done: 오늘 지출을 시트에 기록했다.

## 3. 월말 정산
- 카테고리별 합계와 예산 대비 비교하기
  why: 어느 카테고리에서 초과했는지 파악해야 다음 달 기준을 조정할 수 있습니다.
  done: 카테고리별 합계와 예산 대비 결과를 기록했다.
- 다음 달 조정 사항 1개만 정하기
  how: 초과 카테고리 중 하나를 골라 구체적인 조정 기준(예: 쇼핑 X만원 이하)을 정합니다.
  done: 다음 달 조정 기준 1개를 시트에 기록했다.
  caution: 한 번에 모든 지출을 줄이려 하면 지속하기 어렵습니다. 한 가지씩 조정하세요.`,
  },
  {
    source_type: 'creator_experience',
    flow: {
      id: 'creator-260601-payday-finance-routine',
      slug: 'payday-finance-routine',
      title: '월급날 재정 루틴 Flow',
      description: '토스피드 "통장 쪼개기" 가이드를 참고해 월급날 당일 고정지출 확인, 저축 이체, 생활비 분리까지 한 번에 처리하는 루틴을 만듭니다.',
      category: '재테크/재무',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'sheet',
      source_title: '토스피드 – 통장쪼개기로 적정소비하는 법',
      source_url: 'https://toss.im/tossfeed/article/bank-account-divide',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-12',
      conversion_note: '현재 토스피드 글의 예산 선배분과 목적별 통장 분리 사례를 월급날 기록 루틴으로 옮겼습니다. 개인 사례와 금융상품 선택을 권장값으로 오해할 수 있어 대표 공개 Flow로 승격하기 전 재구성이 필요합니다.',
      warning: '이 Flow는 지출 분리와 기록 습관을 돕는 체크리스트이며 투자·재무 조언이 아닙니다. 금융 결정은 공인 전문가와 상담하세요.',
      tags: ['재테크', '월급', '재무루틴', 'reference'],
    },
    text: `@월 1회(월급날)

## 1. 입금 확인
- 월급 입금 확인하고 실수령액 기록하기
  why: 세후 실수령액을 기록해야 이번 달 가용 예산을 정확하게 알 수 있습니다.
  done: 실수령액을 시트에 기록했다.
  link: 토스피드 통장 쪼개기 가이드 | https://toss.im/tossfeed/article/bank-account-divide | reference
  caution: 투자·금융상품 선택은 이 Flow에서 다루지 않습니다. 기록과 분리가 목적입니다.

## 2. 고정지출·저축 이체
- 이번 달 자동이체 항목 정상 처리 여부 확인하기
  why: 자동이체 실패를 당일 발견해야 연체·서비스 중단을 막을 수 있습니다.
  how: 은행 앱에서 출금 예정 항목과 실제 처리 내역을 비교합니다.
  done: 자동이체가 모두 정상 처리됐음을 확인했다.
- 저축·비상금 계좌로 목표 금액 이체하기
  why: 토스피드 가이드의 핵심 원칙: '선(先) 이체, 후(後) 소비'. 월급 당일 저축을 먼저 이체해야 "남으면 저축"이 아닌 "먼저 저축"이 됩니다.
  how: 예금, 적금, 연금저축 등 이번 달 목표 금액을 먼저 정해 자동이체 또는 즉시 이체합니다. 생활비·저축·비상금 비율은 출처의 개인 예시를 그대로 쓰지 말고 실제 고정지출과 목표에 맞게 직접 정합니다.
  done: 저축 금액을 이체했다.

## 3. 생활비 분리
- 이번 달 생활비 한도를 별도 계좌나 봉투로 분리하기
  why: 생활비와 전체 잔액이 섞이면 실제로 쓸 수 있는 금액이 얼마인지 파악하기 어렵습니다. 출처는 비상예비자금·예비비·재테크·생활비 통장으로 목적을 나누는 예시를 보여줍니다.
  done: 생활비를 분리하거나 한도를 시트에 기록했다.
- 지난달 지출 초과 항목 이번 달 조정 기준 확인하기
  done: 지난달 피드백과 이번 달 조정 기준을 확인했다.`,
  },

  // ──────────────────────────── 독서 / 자기계발 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-reading-habit-30day',
      slug: 'reading-habit-30day',
      title: '매일 15분 읽기 Flow',
      description: '브런치스토리 독서 습관 가이드에서 실제로 제안한 고정 시간과 읽을거리 준비를 짧은 반복 일정으로 옮깁니다.',
      category: '자기계발/독서',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '브런치스토리 @woochul4532 – 독서습관을 만들기 위한 10가지 방법',
      source_url: 'https://brunch.co.kr/@woochul4532/3',
      conversion_note: '원문의 고정 시간, 읽을거리 준비, 짧게 읽기와 다음 위치 메모를 반복 일정으로 옮겼습니다.',
      tags: ['독서', '자기계발', '습관', 'reference'],
    },
    text: `@매일 15분

## 읽기 전
- 매일 읽을 시간대 한 곳 정하기
  why: 원문은 아침 15분이나 출퇴근처럼 반복 가능한 시간을 먼저 확보하라고 제안합니다.
  how: 아침, 이동 시간, 점심, 취침 전 중 실제로 비울 수 있는 시간 하나를 고릅니다.
  done: 읽을 시간을 반복 일정으로 넣었다.
  link: 브런치스토리 독서습관 10가지 방법 | https://brunch.co.kr/@woochul4532/3 | reference
- 읽을 책이나 짧은 글을 바로 꺼낼 수 있게 두기
  done: 오늘 읽을 자료를 정하고 위치나 링크를 저장했다.

## 오늘 읽기
- 15분 동안 읽기
  how: 완독을 목표로 밀어붙이기보다 정해 둔 시간 동안 읽습니다.
  done: 오늘 15분 읽기를 마쳤다.
- 다시 시작할 위치와 짧은 메모 남기기
  done: 다음에 펼칠 위치와 기억할 내용을 적었다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-book-finish-one',
      slug: 'book-finish-one',
      title: '책 한 권 완독 실천 Flow',
      description: '리디(RIDI) "읽는 습관 들이는 다섯 가지 방법" 등에서 확인되는 완독 노하우를 참고해 한 권을 시작부터 완독까지 끝내는 실행 계획을 만듭니다.',
      category: '자기계발/독서',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '리디 – 꾸준한 독서, ‘읽는 습관’ 들이는 다섯 가지 방법',
      source_url: 'https://ridicorp.com/story/pr-reading-new-year-resolution/',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      conversion_note: '현재 리디 원문은 완독 계획이 아니라 읽는 습관과 완독 강박을 낮추는 글입니다. 완독일·페이지 속도·적용 행동은 원문 행이 아니므로 더 정확한 완독 템플릿 원문을 찾기 전 공개 승격하지 않습니다.',
      tags: ['독서', '완독', '자기계발', 'reference'],
    },
    text: `## 1. 시작 준비
- 읽을 책과 목표 완독일 정하기
  why: 완독일을 정해야 하루 분량을 역산할 수 있습니다. 독서 노하우의 공통 출발점은 "책 읽을 시간을 먼저 확보하는 것"입니다(아침 15분, 출퇴근 20~30분 등 고정 시간대).
  how: 책 총 페이지를 목표 일수로 나눠 하루 최소 페이지를 계산합니다. 집중해서 읽으면 대략 60분에 60페이지가 한 기준이 됩니다.
  done: 책 제목과 완독 목표일, 하루 분량을 메모에 적었다.
  link: 리디 – 읽는 습관 들이는 다섯 가지 방법 | https://ridicorp.com/story/pr-reading-new-year-resolution/ | reference
- 읽기 전 목차와 서문 훑기
  why: 전체 구조를 먼저 파악하면 읽는 속도와 이해도가 올라갑니다.
  done: 목차와 서문을 읽었다.

## 2. 읽기 실행
- 매일 목표 페이지까지 읽기
  how: 자신에게 맞는 책(좋아하는 장르 우선)을 선택했다면 습관 형성이 수월해집니다. 완독 강박을 버리면 독서가 즐거워집니다.
  done: 오늘 목표 페이지를 달성했다(실제 읽은 페이지 기록).
- 기억에 남는 구절이나 생각 메모하기
  how: 줄 긋기, 포스트잇, 메모 앱 중 편한 방식으로 남깁니다.
  done: 오늘 읽은 내용에서 메모를 남겼다.

## 3. 완독 후
- 완독 날짜와 완독 소감 한 줄 적기
  done: 완독 날짜와 소감을 기록했다.
- 배운 내용 중 실제로 적용할 것 1가지 정하기
  why: 독서 후 행동으로 이어지지 않으면 정보가 남지 않습니다.
  done: 적용할 행동 1가지를 메모했다.`,
  },

  // ──────────────────────────── 뷰티 / 스킨케어 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-morning-skincare-routine',
      slug: 'morning-skincare-routine',
      title: '아침 스킨케어 5분 루틴 Flow',
      description: '늘투엔티스 "스킨케어 순서 5단계 완벽 가이드"를 참고해 세안부터 자외선 차단까지 아침 루틴을 5분에 완성합니다.',
      category: '뷰티/스킨케어',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'calendar',
      source_title: '늘투엔티스 – 스킨케어 순서 완벽 가이드: 5단계로 완성하는 아침·저녁 피부 관리 루틴',
      source_url: 'https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/',
      source_checked_at: '2026-07-11',
      conversion_note: '상업 브랜드의 일반 가이드이므로 제품 효능이나 피부 타입 판정은 승인 근거로 쓰지 않고, 표시된 아침 사용 순서만 검토 대상으로 남겼습니다.',
      warning: '제품 사용 후 자극이나 증상이 생기면 중단하고 피부과 전문의 또는 제품 안내를 확인하세요.',
      tags: ['스킨케어', '뷰티', '루틴', 'reference'],
    },
    text: `@매일 아침

## 아침 스킨케어 순서
- 미온수로 가볍게 세안하기
  why: 스킨케어의 황금률은 "묽은 제형에서 진한 제형 순". 세안은 그 시작이며, 아침에는 밤새 나온 피지와 노폐물만 정리하면 됩니다. 뜨거운 물은 피부 장벽을 약하게 할 수 있습니다.
  how: 미온수로 30초~1분 가볍게 세안하고 부드럽게 물기를 닦습니다. 자극이 강한 클렌저보다 순한 클렌저를 씁니다.
  done: 세안을 완료했다.
  link: 늘투엔티스 스킨케어 5단계 가이드 | https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/ | reference
- 토너를 화장솜이나 손으로 두드려 흡수시키기
  how: 세안 후 바로 수분을 채워야 건조함을 줄일 수 있습니다. 피부 결을 정리하듯 가볍게 두드려 흡수시킵니다.
  done: 수분 케어를 했다.
- 수분 에센스 또는 앰플 얇게 바르기
  why: 토너 → 에센스/세럼/앰플 → 크림 순으로 제형이 점점 진해지도록 발라야 흡수가 좋습니다.
  done: 에센스를 발랐다.
- 보습 크림 얇게 바르기
  why: 아침에는 유분이 적고 가벼운 수분 크림을 골라야 자외선 차단제·메이크업이 밀리지 않습니다.
  done: 보습 크림을 발랐다.
- 자외선 차단제(SPF30 이상) 바르기
  why: 아침 루틴은 보호(자외선 차단, 항산화)에 초점을 맞춥니다. 흐린 날도 자외선이 있으므로 생략하지 않습니다.
  done: 자외선 차단제를 발랐다.
  caution: 자외선 차단제의 사용량과 덧바름은 제품 표시를 따릅니다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-skin-weekly-check',
      slug: 'skin-weekly-check',
      title: '주간 피부 상태 관찰 Flow',
      description: '피부 타입 자가진단 가이드(한지센터)를 참고해 주 1회 피부 상태를 관찰하고 루틴을 조정합니다.',
      category: '뷰티/스킨케어',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'sheet',
      source_title: '한지센터 – 내 피부 타입 확인하는 법과 그에 맞는 데일리 루틴',
      source_url: 'https://hanjicenter.kr/%EB%82%B4-%ED%94%BC%EB%B6%80-%ED%83%80%EC%9E%85-%ED%99%95%EC%9D%B8%ED%95%98%EB%8A%94-%EB%B2%95%EA%B3%BC-%EA%B7%B8%EC%97%90-%EB%A7%9E%EB%8A%94-%EB%8D%B0%EC%9D%BC%EB%A6%AC-%EB%A3%A8%ED%8B%B4-%EC%A0%95/',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      conversion_note: '원문은 피부 타입을 설명하는 일반 글이며 주간 진단표나 제품 반응 판정 도구가 아닙니다. 의료·피부과 근거가 있는 관찰 양식을 찾기 전 공개하지 않습니다.',
      warning: '이 화면으로 피부 상태나 제품 적합성을 진단하지 않습니다. 지속되는 자극·통증·염증은 피부과 전문의에게 확인하세요.',
      tags: ['스킨케어', '뷰티', '관찰', 'reference'],
    },
    text: `@주 1회

## 주간 피부 체크
- 이번 주 피부 전반 상태 자가진단하기(유·수분, 트러블, 민감도)
  how: 가이드 방법: 미온수 세안 후 아무것도 바르지 않고 1시간 기다린 뒤 자연광에서 피부를 봅니다. 피지·건조·당김 정도를 확인하면 피부 타입을 파악할 수 있습니다.
  done: 이번 주 피부 상태를 관찰표에 기록했다.
  link: 한지센터 피부 타입 확인 가이드 | https://hanjicenter.kr/%EB%82%B4-%ED%94%BC%EB%B6%80-%ED%83%80%EC%9E%85-%ED%99%95%EC%9D%B8%ED%95%98%EB%8A%94-%EB%B2%95%EA%B3%BC-%EA%B7%B8%EC%97%90-%EB%A7%9E%EB%8A%94-%EB%8D%B0%EC%9D%BC%EB%A6%AC-%EB%A3%A8%ED%8B%B4-%EC%A0%95/ | reference
- 새로 사용한 제품과 피부 반응 연결하기
  why: 제품과 반응을 기록해야 맞지 않는 성분이나 제품을 파악할 수 있습니다. 피부과 전문의도 "무엇을 바르느냐보다 어떤 순서로, 언제 바르느냐"를 중시합니다.
  done: 새 제품과 반응 여부를 기록했다.
- 이번 주 루틴 중 빠진 날과 이유 확인하기
  done: 루틴을 지킨 날과 빠진 날, 이유를 기록했다.
- 다음 주 유지 또는 조정할 루틴 1가지 정하기
  done: 다음 주 조정 항목을 정했다.`,
  },

  // ──────────────────────────── 여행 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-domestic-trip-d7',
      slug: 'domestic-trip-d7',
      title: '국내여행 짐 준비 Flow',
      description: '트립닷컴 국내여행 준비물 가이드에서 여행 조건에 맞는 짐만 골라 나만의 출발 전 체크리스트를 만듭니다.',
      category: '여행',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '트립닷컴 – 국내 여행 준비물 체크리스트! 알차게 챙겨가는 법',
      source_url: 'https://kr.trip.com/guide/info/%EA%B5%AD%EB%82%B4+%EC%97%AC%ED%96%89+%EC%A4%80%EB%B9%84%EB%AC%BC.html',
      conversion_note: '현재 원문은 예약·관광 동선이 아니라 계절·동반자·숙박형태·활동별 준비물 글입니다. 발명된 D-7 예약 타임라인을 제거하고 출발 전 개인 짐 목록으로 재구성했습니다.',
      tags: ['여행', '국내여행', '준비', 'reference'],
    },
    text: `## 1. 이번 여행 조건 정하기
- 계절·동반자·숙박형태·활동 적기
  why: 원문은 누구와 어디서 무엇을 하는지에 따라 필요한 준비물이 달라진다고 안내합니다.
  how: 계절, 혼자/가족/반려동물 동반 여부, 호텔/민박/캠핑, 물놀이/트레킹 같은 활동을 메모합니다.
  done: 이번 여행에 해당하는 조건을 적었다.
  link: 트립닷컴 국내여행 준비물 체크리스트 | https://kr.trip.com/guide/info/%EA%B5%AD%EB%82%B4+%EC%97%AC%ED%96%89+%EC%A4%80%EB%B9%84%EB%AC%BC.html | reference

## 2. 공통 준비물 챙기기
- 신분증·지갑·휴대폰·충전기 챙기기
  done: 기본 필수품을 가방에 넣었다.
- 세면도구·개인 위생용품·평소 쓰는 약 챙기기
  how: 숙소가 제공하는 수건·세면도구가 있는지 먼저 확인하고 없는 것만 추가합니다.
  done: 개인용품과 숙소 제공 여부를 대조했다.

## 3. 조건별 준비물 더하기
- 계절과 날씨에 맞는 옷·보호용품 고르기
  how: 일교차, 비, 더위, 추위 중 이번 여행에 해당하는 항목만 짐 목록에 넣습니다.
  done: 날씨에 맞는 옷과 용품을 골랐다.
- 동반자와 활동에 필요한 물건 더하기
  how: 아이 용품, 반려동물 용품, 물놀이·캠핑·트레킹 용품처럼 이번 여행에 해당하는 것만 추가합니다.
  done: 동반자와 활동별 준비물을 추가했다.

## 4. 출발 전 목록 확정
- 내 짐 목록에서 불필요한 물건 빼고 최종 확인하기
  done: 이번 여행에 필요한 짐만 남긴 최종 체크리스트를 만들었다.
- 여행 후 빠뜨렸거나 유용했던 물건 한 줄 남기기
  done: 다음 여행에 다시 쓸 메모를 남겼다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-travel-packing-list',
      slug: 'travel-packing-list',
      title: '여행 짐 싸기 체크리스트 Flow',
      description: 'KKday 해외여행 준비물 체크리스트에서 서류·결제·의류·생활용품과 캐리어 배치 항목을 옮깁니다.',
      category: '여행',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: 'KKday Korea – 2026 해외여행 준비물 체크리스트(+짐 싸는 팁)',
      source_url: 'https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      conversion_note: '원문의 여행 서류, 결제수단, 의류·세면용품과 캐리어 배치를 출발 전 체크리스트로 옮겼습니다.',
      warning: '여권 유효기간, 비자, 기내 반입 제한은 국가·항공사·공항마다 다릅니다. 출발 전 공식 안내를 다시 확인하세요.',
      tags: ['여행', '짐싸기', '준비', 'reference'],
    },
    text: `## 필수 서류·결제
- 신분증·여권(해외) 확인하기
  done: 신분증과 필요 서류를 가방에 넣었다.
  link: KKday 여행 준비물 체크리스트 | https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist | reference
- 예약 바우처·숙소 주소 오프라인 저장하기
  why: 현지에서 인터넷이 안 되는 상황을 대비해 오프라인으로 저장해야 합니다.
  done: 예약 확인서와 숙소 주소를 캡처해 저장했다.
- 카드·현금(필요시 환전) 확인하기
  done: 결제 수단을 확인했다.

## 의류·생활용품
- 여행 일수에 맞게 의류 목록 작성하기
  how: 일수보다 1~2벌 적게 챙깁니다. 숙소에 세탁기가 있다면 2~3일치만으로도 충분합니다. 겹쳐 입을 수 있는 아이템 위주로 구성합니다.
  done: 의류 목록을 작성하고 가방에 넣었다.
- 세면도구·충전기·상비약 넣기
  how: 기내 반입 시 액체류는 100ml 이하 개별 용기에 담아 1L 지퍼백 한 개 분량까지만 가능합니다. 종류별 패킹 큐브(메쉬/투명)를 쓰면 캐리어 안이 한눈에 정리됩니다.
  done: 세면도구와 충전기를 확인해 넣었다.
  caution: 액체류와 의약품 반입 기준은 이용 항공사와 공항의 현재 안내를 확인합니다.

## 마지막 확인
- 캐리어 짐 배치 확인(무거운 것 아래, 자주 꺼낼 것 위)
  how: 신발·책 등 무거운 물건은 바퀴쪽(아래)에, 충전기·우산·세면도구 등 자주 꺼내는 것은 위쪽에 배치합니다. 부피 큰 옷·침구는 압축백으로 50% 이상 부피를 줄일 수 있고, 10일 이상 장기 여행은 압축가방 활용을 권장합니다.
  done: 가방 무게와 배치를 확인했다.`,
  },

  // ──────────────────────────── 홈카페 / 취미 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-home-cafe-daily',
      slug: 'home-cafe-daily',
      title: '아이스 커피 한 잔 만들기 Flow',
      description: '아이스 커피 원문에서 내 도구에 맞는 추출법을 하나 골라 물·얼음 비율과 결과를 기록합니다.',
      category: '홈카페/취미',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '아침산책의 커피 이야기 – 아이스 커피 맛있게 만드는 법(집에서 아메리카노)',
      source_url: 'https://morningwalkcoffee.com/ice-coffee-recipes/',
      conversion_note: '원문이 설명하는 아이스 커피 추출법 중 하나를 골라 한 잔 만들고 다음 조정을 메모하는 순서로 정리했습니다.',
      tags: ['홈카페', '취미', '루틴', 'reference'],
    },
    text: `## 추출법 고르기
- 내 도구에 맞는 아이스 커피 방식 하나 고르기
  why: 원문은 에스프레소, 핸드드립, 콜드브루를 서로 다른 추출법으로 설명합니다.
  how: 지금 가진 도구와 준비 시간에 맞춰 세 방식 중 하나를 고릅니다.
  done: 오늘 사용할 추출법을 정했다.
  link: 아이스 커피 만드는 법 가이드 | https://morningwalkcoffee.com/ice-coffee-recipes/ | reference

## 한 잔 만들기
- 선택한 방식의 원두·물·얼음 양 확인하기
  how: 원문에서 선택한 방식의 비율만 확인하고 내 잔 크기에 맞춰 메모합니다.
  done: 사용할 양을 적고 재료를 준비했다.
- 원문 순서대로 추출하고 차갑게 만들기
  done: 아이스 커피 한 잔을 완성했다.
- 농도와 다음에 바꿀 점 한 줄 남기기
  done: 사용한 비율과 다음 조정 한 가지를 메모했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-new-hobby-30day',
      slug: 'new-hobby-30day',
      title: '새 취미 30일 시작 Flow',
      description: '클래스101 플랫폼과 30일 챌린지 성공 가이드를 참고해 새 취미를 30일간 꾸준히 이어가는 실행 계획을 만듭니다.',
      category: '취미/자기계발',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      status: 'published',
      source_status: 'preview',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '클래스101 – 취미 클래스 / 90일 습관 챌린지 가이드',
      source_url: 'https://class101.net/ko',
      conversion_note: '현재 출처는 취미 클래스 플랫폼의 넓은 랜딩으로 30일 실행 행을 직접 뒷받침하지 못합니다. 구체적인 커리큘럼 출처를 연결하기 전까지 preview로 유지합니다.',
      tags: ['취미', '자기계발', '클래스', 'reference'],
    },
    text: `## 시작 전 준비
- 배울 취미와 강의·자료 결정하기 D-1
  why: 막연하게 시작하면 첫 주에 방향을 잃기 쉽습니다. 행동이 습관으로 자동화되는 데는 평균 약 66일(개인차 18~254일)이 걸리므로, 30일은 "완성"이 아니라 흐름을 만드는 출발 구간으로 잡습니다.
  how: 클래스101 등에서 커리큘럼과 난이도를 보고 하나를 선택합니다. '최소 실행 기준'(예: 하루 10분)을 먼저 정하고 완벽함 대신 무조건 실행을 원칙으로 삼습니다.
  done: 취미 종류와 사용할 강의·자료를 결정했다.
  link: 클래스101 | https://class101.net/ko | reference
- 최소 재료·도구만 파악해 준비하기 D+0~D+1
  why: 처음부터 많이 사면 쓰지 않을 수 있습니다. 기본 도구만 먼저 준비합니다.
  done: 최소 준비물을 구매하거나 준비했다.

## 1주차: 기초 익히기
- 첫 클래스(또는 튜토리얼) 따라 하고 배운 것 메모하기 D+1~D+7
  how: 첫 시도는 잘하려 하기보다 끝까지 한 번 완주하는 것이 목표입니다. 막힌 점은 질문으로 남겨둡니다.
  done: 기초 과정을 한 번 완료하고 배운 내용과 질문을 메모했다.
- 1주차 점검 — 최소 실행 기준을 지켰는지 확인하기 D+7
  how: 초반 1~2주가 가장 그만두기 쉬운 구간입니다. 못 지킨 날 이유를 적고 다음 주 기준을 조정합니다.
  done: 이번 주 실행 일수와 이유를 기록했다.

## 2~3주차: 반복
- 2주차 점검 — 연습 패턴 유지·조정하기 D+14
  how: 익숙해지는 2주차부터 연습 시간이나 강도를 조금씩 늘려 강화합니다.
  done: 2주차 진행 상황과 조정 계획을 기록했다.
- 3주차 점검 — 이어가기 어려운 요인 제거하기 D+21
  done: 3주차 진행 상황을 기록하고 방해 요인을 한 가지 줄였다.

## 30일 마무리
- 30일 결과물·성장 기록 남기기 D+30
  how: 시작 전과 비교한 변화를 메모나 사진으로 남깁니다. 계속할지, 다음 단계로 갈지를 결정합니다.
  done: 30일 전후 비교 결과를 기록했다.`,
  },

  // ──────────────────────────── 커리어 / 콘텐츠 창작 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-portfolio-4week',
      slug: 'portfolio-4week',
      title: '개발 프로젝트 포트폴리오 4주 Flow',
      description: '개발 프로젝트를 1주 기획·설계하고 3주 개발·배포해 포트폴리오 자료까지 완성합니다.',
      category: '커리어/취업',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'hybrid',
      source_title: 'Velog @vonvoyage27 – 포트폴리오 4주 만에 준비하기',
      source_url: 'https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8',
      conversion_note: '현재 원문의 아이템 선정→기술·기능·페이지 기획→DB/API 설계→개발→배포→포트폴리오 작성 순서와 1주 설계·3주 개발 구조를 그대로 4주 타임라인으로 전환했습니다.',
      tags: ['커리어', '포트폴리오', '취업', 'reference'],
    },
    text: `## D-28 프로젝트 범위 정하기
- 만들 프로젝트 아이템과 기술 스택 정하기 D-28
  why: 원문은 아이템 선정과 기술 결정을 4주 프로젝트의 첫 단계로 둡니다.
  how: 구현할 문제, 사용할 프론트엔드·백엔드 기술, 배포 환경을 한 장에 정리합니다.
  done: 프로젝트 아이템과 기술 스택을 정했다.
  link: velog 포트폴리오 4주 준비 가이드 | https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8 | reference
- 핵심 기능과 3~5개 화면 범위 정하기 D-25
  how: 로그인, CRUD, 검색·필터처럼 만들 기능과 각 화면을 적고 이번 4주에 하지 않을 범위도 함께 정합니다.
  done: 기능 목록과 화면 범위를 확정했다.

## D-21 기획·설계 마치기
- 페이지 기획과 DB·API 설계 문서 만들기 D-21
  how: 화면 흐름, 데이터 구조, API 목록을 개발 전에 검토할 수 있는 문서로 남깁니다.
  done: 페이지 기획서와 DB·API 설계 초안을 완성했다.

## D-20~D-7 개발하고 배포하기
- 개발 일정을 나누고 핵심 기능 구현 시작하기 D-20
  how: 작업을 일정 보드에 나누고 핵심 기능부터 구현하며 변경 사항을 Git에 남깁니다.
  done: D-8까지 정한 핵심 기능이 배포 가능한 상태로 동작한다.
- 서비스 배포하고 도메인·실행 방법 정리하기 D-7
  done: 배포 주소와 실행 방법, 저장소 링크를 확인했다.

## D-1 포트폴리오 완성
- 프로젝트 설명·역할·성과·데모를 한 페이지로 정리하기 D-1
  how: 프로젝트 설명, GitHub와 배포 주소, 기술 스택, 주요 기능, 담당 역할과 성과, 설계 자료와 데모를 정리합니다.
  done: 채용 담당자가 프로젝트를 실행하고 내 역할을 확인할 수 있는 포트폴리오를 완성했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-blog-youtube-start',
      slug: 'blog-youtube-start',
      title: '블로그 글을 영상으로 옮기기 Flow',
      description: '이미 쓴 블로그 글 한 편을 영상 대본으로 다듬고, 발행한 글과 영상을 서로 연결합니다.',
      category: '콘텐츠 창작',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '브런치스토리 @skychang44 – 블로그를 활용해 유튜브 쉽게 시작하는 법',
      source_url: 'https://brunch.co.kr/@skychang44/346',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      conversion_note: '기존 블로그 글을 영상 대본으로 바꾸고, 완성한 영상과 원문 글을 서로 연결하는 순서로 정리했습니다.',
      tags: ['블로그', '유튜브', '콘텐츠창작', 'reference'],
    },
    text: `## 1. 옮길 글 고르기
- 영상으로 옮길 기존 블로그 글 한 편 고르기
  why: 원문은 이미 쓴 블로그 글을 영상의 내용과 대본으로 재사용하는 방법을 설명합니다.
  done: 원문 글 제목과 링크를 메모했다.
  link: 브런치 블로그+유튜브 시작 가이드 | https://brunch.co.kr/@skychang44/346 | reference

## 2. 말하는 대본으로 다듬기
- 글의 핵심 문장과 사례만 영상 대본으로 추리기
  how: 글의 문장을 그대로 읽기보다 말로 설명할 핵심과 사례를 순서대로 정리합니다.
  done: 촬영할 대본을 완성했다.
- 영상 촬영·편집 후 발행하기
  done: 영상을 발행하고 링크를 저장했다.

## 3. 두 콘텐츠 연결
- 블로그 글에는 영상을, 영상 설명에는 블로그 링크를 넣기
  done: 글과 영상에서 서로 이동할 수 있게 연결했다.`,
  },

  // ──────────────────────────── 생활습관 / 디지털 웰빙 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-morning-routine-30day',
      slug: 'morning-routine-30day',
      title: '나만의 아침 루틴 시작 Flow',
      description: '브런치스토리의 모닝루틴 서평에서 제안한 수면 준비, 고정 기상 시간과 내가 하고 싶은 아침 행동을 짧게 시험합니다.',
      category: '생활습관',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'calendar',
      source_title: '브런치스토리 @pletalk – 하루를 설레게 만드는 작은 습관, 모닝루틴',
      source_url: 'https://brunch.co.kr/@pletalk/58',
      source_checked_at: '2026-07-11',
      conversion_note: '원문에 없는 30일 챌린지와 고정 행동 묶음을 제거하고, 전날 준비·기상 시간·개인이 고른 아침 행동·짧은 회고만 남겼습니다.',
      tags: ['생활습관', '아침루틴', '자기계발', 'reference'],
    },
    text: `@매일

## 전날 저녁
- 내일 아침에 하고 싶은 일 한 가지 적기
  why: 원문은 자신을 몰아세우기보다 아침에 기대되는 행동을 먼저 고르라고 제안합니다.
  done: 내일 아침 행동 한 가지를 적었다.
  link: 브런치 모닝루틴 가이드 | https://brunch.co.kr/@pletalk/58 | reference
- 잠을 방해할 행동 한 가지 줄이고 기상 시간 정하기
  how: 늦은 화면 사용이나 늦은 식사처럼 내 수면을 방해하는 요인 하나를 줄이고, 실제로 유지할 기상 시간을 정합니다.
  done: 기상 시간과 줄일 행동을 정했다.

## 아침
- 정한 시간에 일어나 내가 고른 행동 시작하기
  done: 오늘 아침 행동을 실행했다.
- 오늘 아침 루틴에서 유지하거나 바꿀 점 한 줄 적기
  done: 다음 아침에 적용할 조정 한 가지를 적었다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-digital-detox-weekly',
      slug: 'digital-detox-weekly',
      title: '디지털 디톡스 주간 루틴 Flow',
      description: 'honeulstudio "디지털 디톡스가 필요한 이유" 가이드를 참고해 스마트폰·SNS 사용을 줄이고 집중 시간을 회복하는 주간 루틴을 만듭니다.',
      category: '디지털 웰빙',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      source_status: 'preview',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      risk_level: 'low',
      primary_destination: 'calendar',
      routine_duration_days: 28,
      source_title: 'honeulstudio – 디지털 디톡스가 필요한 이유(스마트폰 의존 줄이는 현실적인 방법)',
      source_url: 'https://honeulstudio.com/%EB%94%94%EC%A7%80%ED%84%B8-%EB%94%94%ED%86%A1%EC%8A%A4%EA%B0%80-%ED%95%84%EC%9A%94%ED%95%9C-%EC%9D%B4%EC%9C%A0-%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%8F%B0-%EC%9D%98%EC%A1%B4-%EC%A4%84%EC%9D%B4%EB%8A%94/',
      conversion_note: '기존 원문이 404로 확인되어 공개 노출을 중단했습니다. 대체 출처에서 시간 제한·대체 활동 행을 다시 확인하기 전까지 preview로 유지합니다.',
      tags: ['디지털', '디톡스', '생활습관', 'reference'],
    },
    text: `@주 1회 점검
@매일 저녁

## 매일 실천
- 취침 1시간 전 스마트폰 알림 끄기
  why: 취침 전에 알림과 화면 사용을 줄이면 정해 둔 취침 루틴을 방해하는 자극을 낮추는 데 도움이 될 수 있습니다.
  done: 오늘 취침 1시간 전 알림을 껐다.
  link: honeulstudio 디지털 디톡스 가이드 | https://honeulstudio.com/%EB%94%94%EC%A7%80%ED%84%B8-%EB%94%94%ED%86%A1%EC%8A%A4%EA%B0%80-%ED%95%84%EC%9A%94%ED%95%9C-%EC%9D%B4%EC%9C%A0-%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%8F%B0-%EC%9D%98%EC%A1%B4-%EC%A4%84%EC%9D%B4%EB%8A%94/ | reference
- SNS 사용 시간 하루 총 X분 이하로 목표 설정하기
  how: "하루 종일 스마트폰 금지"보다 특정 시간만 제한하는 점진적 접근이 효과적입니다. "아침 8~10시 금지", "저녁 9시 이후 SNS 금지" 같은 구체적인 규칙을 정합니다. 스크린타임 기능으로 앱별 하루 사용 제한을 설정하고, 화면을 흑백 모드로 바꾸면 시각 자극이 줄어 사용 시간이 자연스럽게 감소합니다.
  done: SNS 제한 시간을 설정했다.

## 주간 점검
- 이번 주 스크린타임 확인하고 지난 주와 비교하기
  done: 이번 주 스크린타임을 기록했다.
- 스마트폰 없이 보낸 시간에 한 활동 한 줄 기록하기
  why: 대체 활동을 기록하면 디지털 디톡스가 단순히 "금지"가 아닌 "교환"이 됩니다. 대체 활동 예: 독서, 운동, 산책, 요리, 그림 그리기.
  done: 이번 주 스마트폰 없이 한 활동을 기록했다.
- 다음 주 목표 조정하기(더 줄이거나 유지)
  done: 다음 주 목표를 정했다.`,
  },

  // ──────────────────────────── 반려동물 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-dog-walk-routine',
      slug: 'dog-walk-routine',
      title: '강아지 산책 루틴 Flow',
      description: '바잇미 블로그 "강아지 산책 언제부터? 초보 반려인을 위한 강아지 산책 가이드"를 참고해 강아지 산책 준비부터 귀가 후 관리까지 루틴을 만듭니다.',
      category: '반려동물',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '바잇미 블로그 – 강아지 산책 언제부터? 초보 반려인을 위한 강아지 산책 가이드',
      source_url: 'https://www.biteme.co.kr/blog/%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EC%96%B8%EC%A0%9C%EB%B6%80%ED%84%B0-%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EA%B0%80%EC%9D%B4%EB%93%9C/',
      source_checked_at: '2026-07-11',
      conversion_note: '상업 블로그의 연령·예방접종·수치형 건강 조언은 실행 기준에서 제외하고, 목줄·배변봉투·날씨·피로 확인과 귀가 후 정리만 남겼습니다.',
      warning: '어린 강아지의 산책 시작 시점, 예방접종, 질환·통증이 관련되면 수의사 안내를 우선하세요.',
      tags: ['반려동물', '강아지', '산책', 'reference'],
    },
    text: `@하루 1~2회

## 산책 전 준비
- 리드줄·배변봉투·물·간식 챙기기
  why: 빠진 준비물은 산책 중 문제가 됩니다. 반려견과 산책 시 안전을 위해 반드시 하네스나 목줄을 채웁니다.
  done: 산책 준비물을 확인했다.
  link: 바잇미 강아지 산책 가이드 | https://www.biteme.co.kr/blog/%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EC%96%B8%EC%A0%9C%EB%B6%80%ED%84%B0-%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EA%B0%80%EC%9D%B4%EB%93%9C/ | reference
- 강아지 상태(발바닥·다리·기분) 간단히 확인하기
  why: 날씨와 반려견 상태가 평소와 다르면 산책 시간을 줄이거나 쉬어야 합니다.
  how: 바닥 온도와 날씨, 발바닥·다리 상태를 보고 무리하지 않을지 결정합니다.
  done: 강아지 상태를 확인했다.

## 산책 중
- 배변 처리하고 봉투 밀봉하기
  done: 배변을 봉투에 담아 처리했다.
- 강아지 컨디션 관찰하기(다리 절거나 숨가쁨 등)
  how: 리드줄을 안전하게 잡고, 걷기를 거부하거나 다리를 절고 숨이 가쁜 등 평소와 다른 모습이 보이면 산책을 중단합니다.
  done: 이상 징후 없이 산책을 완료했다.
  caution: 이상 징후가 계속되면 수의사에게 확인합니다.

## 귀가 후
- 발바닥과 몸 닦아주기
  why: 외부에서 묻어온 이물질이나 오염물을 제거해 피부 트러블을 예방합니다.
  done: 발바닥과 몸을 닦았다.
- 물과 간식 제공하기
  done: 귀가 후 수분과 간식을 제공했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-pet-health-observation',
      slug: 'pet-health-observation',
      title: '강아지 건강검진 상담 준비 Flow',
      description: '수의사 칼럼의 문진·신체검사·혈액·X선·소변검사 항목을 보고 병원에 전달할 생활 정보와 질문을 준비합니다.',
      category: '반려동물',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-11',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '핏펫몰 블로그 – 수의사가 알려주는 강아지 건강검진 필수 항목',
      source_url: 'https://www.fitpetmall.com/blog/dog-health-checkup',
      conversion_note: '수의사 문진에 전달할 생활 정보, 검사 항목 질문, 검사 결과와 다음 일정을 한 상담 메모로 정리했습니다.',
      warning: '이 Flow는 진단 도구가 아닙니다. 검사 필요 여부와 결과 해석은 수의사 안내를 따르세요.',
      tags: ['반려동물', '건강관찰', '기록', 'reference'],
    },
    text: `## 병원에 전달할 정보
- 식사·간식·목욕·산책·예방접종 정보 정리하기
  why: 원문은 건강검진 전 문진에서 식이와 생활 패턴, 예방접종 정보를 자세히 전달하는 것이 중요하다고 설명합니다.
  done: 수의사에게 전달할 생활 정보를 메모했다.
  link: 핏펫 강아지 건강검진 가이드 | https://www.fitpetmall.com/blog/dog-health-checkup | reference
- 최근 달라진 점과 복용 중인 약 메모하기
  done: 최근 변화와 약 정보를 적었다.

## 검사 상담
- 우리 강아지에게 필요한 검사 항목과 이유 묻기
  how: 원문에 나온 문진, 신체검사, 혈액검사, X선검사, 소변검사를 참고해 나이와 병력에 필요한 항목을 수의사에게 묻습니다.
  done: 권장받은 검사와 이유를 메모했다.
  caution: 모든 검사를 일괄 선택하지 말고 수의사의 개별 권고를 따릅니다.
- 금식·소변 채취 등 방문 전 준비 확인하기
  done: 병원이 안내한 준비사항을 적었다.

## 검사 후
- 결과와 다음 방문·추적 확인 일정 기록하기
  done: 수의사 설명과 다음 일정을 저장했다.`,
  },
];

export const contentsBatch260601CreatorBundles: FlowBundle[] = specs.map(build);
