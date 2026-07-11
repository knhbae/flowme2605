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
  return {
    flow: {
      ...spec.flow,
      content_type: spec.flow.content_type ?? 'default',
      source_status: spec.flow.source_status ?? 'needs_review',
      source_precision: spec.flow.source_precision ?? 'exact',
      source_checked_at: spec.flow.source_checked_at ?? '2026-06-01',
      created_at: now,
      updated_at: now,
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
      conversion_note: '요리비책 레시피 재생목록(조회수 1위 초간단 김치찌개 포함)을 "한 번 만들어보기" 실전 준비·실행·피드백 체크리스트로 전환했습니다.',
      tags: ['요리', '레시피', 'creator', 'YouTube'],
    },
    text: `## 1. 영상 선택과 재료 준비
- 오늘 만들 레시피 영상 한 편 고르기
  why: 백종원의 요리비책은 "인터넷에 떠도는 잘못된 레시피를 바로잡겠다"는 목적으로 시작한 채널입니다. 영상을 보고 "나중에"로 미루지 않으려면 만들 날짜와 메뉴를 먼저 고정해야 합니다.
  how: 재생목록에서 조회수 상위 영상(초간단 김치찌개 등)을 보고, 냉장고 재료·오늘 시간·조리 난이도에 맞는 영상 1편을 선택합니다. 예: 초간단 김치찌개는 돼지고기·물 3컵·새우젓(또는 참치액) 1큰술을 센불에 끓이다 중불로 10~15분, 신김치와 고춧가루를 넣고 더 끓이는 구조입니다.
  done: 영상 링크와 메뉴 이름을 메모에 저장했다.
  link: 백종원의 요리비책 재생목록 | https://www.youtube.com/playlist?list=PLOYo7Q0zXMLNmYqpJrt4pNeO-IlaDBVHW | creator
- 재료 목록 작성하고 없는 재료 확인하기
  why: 조리 도중 재료가 빠지면 중단하게 되므로 시작 전에 목록을 만들어야 합니다.
  how: 영상 첫 30초~1분(재료 소개 부분)을 보며 재료와 양을 메모하고, 집에 없는 것만 따로 표시합니다.
  done: 필요한 재료 목록과 구매할 항목을 적었다.
- 없는 재료 구매 또는 대체재 결정하기
  how: 백종원 레시피는 대체재에 관대한 편입니다. 영상 댓글에서 대체재 팁을 확인하는 것도 방법입니다.
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
      title: '한 주 식단·장보기 준비 Flow',
      description: '오늘의집 주간식단 가이드(5만원 이하 식단표)처럼 레시피를 먼저 고르고, 겹치는 재료를 합쳐 장을 효율적으로 봅니다.',
      category: '요리/식단',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
      source_title: '오늘의집 – 쉬운 식단 맛있게 가벼운 5만원 이하 주간식단표',
      source_url: 'https://ohou.se/advices/8220',
      conversion_note: '오늘의집 5만원 주간식단 가이드(ohou.se/advices/8220)를 바탕으로 레시피 탐색→식단 메모→장보기 목록을 주간 루틴 시트로 전환했습니다.',
      tags: ['요리', '식단', '장보기', 'reference'],
    },
    text: `@주 1회(주말)

## 1. 이번 주 레시피 고르기
- 이번 주 메뉴 3~5개 후보 정하기
  why: 오늘의집 5만원 식단 가이드처럼 메뉴를 먼저 정해야 중복 재료를 합칠 수 있어 식재료 낭비와 장보기 비용을 줄일 수 있습니다. 미리 식단을 짜고 장보기 목록을 작성하면 평균 식비를 약 23% 절약한다는 조사가 있습니다.
  how: 냉장고 재고와 이번 주 일정(외식·회식)을 보고 집밥이 필요한 날만 메뉴를 채웁니다. 자주 해먹는 메뉴 10~15가지 중에서 고르면 고민 시간이 줄어듭니다.
  done: 요일별 메뉴 초안을 시트에 적었다.
  link: 오늘의집 주간식단 가이드 | https://ohou.se/advices/8220 | reference
- 각 레시피의 재료 목록 합산하기
  how: 메뉴별 재료를 나열하고 겹치는 재료(예: 대파·달걀)는 합산 수량으로 정리합니다. 고정 메뉴 2~3개를 반복 배치하면 장보기가 단순해집니다.
  done: 장보기 목록 초안이 완성됐다.

## 2. 장보기 목록 정리
- 냉장고·냉동실 재고와 비교해 중복 삭제하기
  why: 재고 확인 없이 장을 보면 같은 재료를 이중으로 사게 됩니다.
  done: 살 것과 있는 것을 구분했다.
- 카테고리별로 목록 정렬하기(채소·단백질·냉동·양념)
  how: 마트 동선에 맞게 분류하면 장보는 시간이 줄어듭니다. 장보기는 주 1~2회가 적당합니다(너무 자주 가면 계획 없는 충동구매가 늘어납니다). 일요일 저녁 또는 월요일 오전에 점검+장보기를 묶으면 루틴이 정착됩니다.
  done: 카테고리별 장보기 목록이 완성됐다.

## 3. 실행 확인
- 장보기 완료 후 재료 보관 방법 확인하기
  done: 재료를 분리 보관했다.
- 이번 주 식단 시트 최종 확인하기
  done: 요일별 메뉴와 재료를 한눈에 볼 수 있게 정리됐다.`,
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
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '오늘의집 – 미니멀 옷장 정리! 옷 비우는 기준과 잘 버리는 방법',
      source_url: 'https://ohou.se/advices/7406',
      conversion_note: '오늘의집 옷장 정리 가이드(옷 비우는 기준·계절별 분류·세로 접기)를 옷장 비우기→분류→정리→기부/처분 하루 실행 체크리스트로 전환했습니다. (이전 advices/4269는 특정 ID 확인 불가로 검증된 옷장 정리 글로 교체)',
      tags: ['정리', '수납', '옷장', 'reference'],
    },
    text: `## 1. 비우기
- 옷장 전체 꺼내 바닥에 펼치기
  why: 오늘의집 가이드에서 강조하는 핵심: 전체를 꺼내야 무엇이 있는지 파악되고, 비어있는 상태를 기준으로 다시 넣을 수 있습니다.
  how: 선반·행거·서랍 모두 꺼내 바닥이나 침대에 펼쳐 놓습니다. 오른쪽엔 비울 옷, 왼쪽엔 남길 옷으로 나누는 방식을 씁니다.
  done: 옷장이 완전히 비었다.
  link: 오늘의집 옷장 정리 가이드 | https://ohou.se/advices/7406 | reference
- 1년 이상 안 입은 옷 분류하기
  why: 자주 안 입는 옷이 정리된 옷장을 다시 막는 주된 원인입니다. 비우는 기준은 보통 1년 이상 안 입은 옷, 사이즈가 맞지 않는 옷, 손상된 옷입니다. 분류는 유지 / 기부·중고판매 / 버리기 3가지로 나눕니다.
  how: 지난 1년을 떠올리며 입었던 옷과 안 입었던 옷으로 나눈 뒤, 유지·기부·폐기 3묶음으로 정리합니다.
  done: 유지·기부·폐기 묶음을 분리했다.

## 2. 분류하기
- 계절·종류별로 묶어 쌓기
  how: 유지할 옷을 먼저 계절별로 나누고, 같은 계절 안에서 종류별(상의/하의/아우터/원피스)로 세분화합니다. 서랍은 세로 접기(옷을 세워 넣기)로 정리하면 한눈에 보이고 꺼내기 쉽습니다.
  done: 카테고리별 묶음이 정해졌다.
- 자주 입는 옷 위치 우선순위 정하기
  why: 꺼내기 쉬운 위치에 자주 입는 옷이 있어야 정리된 상태가 유지됩니다. 자주 입는 옷은 눈높이에, 시즌오프 의류는 상단·하단에 배치합니다. 새 옷 1개 들어오면 안 입는 옷 1개를 반드시 비우는 규칙을 정합니다.
  done: 앞쪽·높이별 위치 계획을 정했다.

## 3. 넣기·처분
- 정한 위치로 옷 되돌려 넣기
  done: 옷장에 옷을 모두 넣었다.
- 처분·기부할 옷 봉투에 넣고 처리 계획 세우기
  how: 기부할 옷은 봉투에 담고, 처분할 옷은 수거 날짜나 방법을 정합니다.
  done: 처분 봉투와 처리 계획(기부처·수거일)을 기록했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-kitchen-reset-organize',
      slug: 'kitchen-reset-organize',
      title: '주방 리셋 정리 Flow',
      description: '오늘의집 냉장고 정리 노하우 가이드를 참고해 찬장·서랍·냉장고를 한 번에 리셋합니다.',
      category: '정리/수납',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '오늘의집 – 보관 기간 늘려주는 냉장고 정리 노하우',
      source_url: 'https://ohou.se/advices/8631',
      conversion_note: '오늘의집 냉장고 정리 가이드(ohou.se/advices/8631)를 주방 찬장·서랍·냉장고 리셋 체크리스트로 전환했습니다.',
      tags: ['정리', '주방', '수납', 'reference'],
    },
    text: `## 1. 냉장고 정리
- 냉장고 유통기한 지난 식품 버리기
  why: 유통기한 확인 없이 정리하면 나쁜 식품이 남아 공간을 낭비합니다. 오늘의집 가이드는 밀폐용기 사용으로 보관 기간을 늘리는 법을 강조합니다.
  how: 냉장·냉동칸을 순서대로 꺼내 유통기한(소비기한)을 확인하고 폐기합니다. 이후 비닐·지퍼백 대신 투명 밀폐용기로 교체하면 산화·부패가 늦어져 보관 기간이 늘어납니다.
  done: 유통기한 지난 식품을 모두 버렸다.
  link: 오늘의집 냉장고 정리 가이드 | https://ohou.se/advices/8631 | reference
- 남은 식재료 종류별로 정리하기
  how: 유통기한이 임박한 식품과 남은 반찬은 문을 열면 바로 보이는 전면·눈높이 칸에 둬서 먼저 소비합니다. 문칸은 온도 변화가 가장 크므로 소스·음료 등 쉽게 상하지 않는 것만 둡니다. 자주 먹는 반찬은 손 닿기 쉬운 중간 앞칸에 배치합니다.
  done: 식재료를 카테고리별로 배치했다.

## 2. 찬장·서랍 정리
- 자주 안 쓰는 그릇·도구 꺼내 한곳에 모으기
  why: 사용 빈도별로 공간을 나눠야 요리 중 꺼내기가 편해집니다.
  done: 자주 쓰는 것과 아닌 것을 분리했다.
- 잘 안 쓰는 도구 기부·처분 결정하기
  done: 처분 목록과 방법을 정했다.
- 자주 쓰는 도구를 손 닿는 위치로 재배치하기
  how: 그릇은 종류와 높이에 따라 칸을 나눠 정리합니다. 앞쪽에는 낮게, 뒤쪽은 높게 배치하면 가리는 것 없이 잘 보입니다.
  done: 배치를 바꿨다.

## 3. 정리 완료 확인
- 조리대 정리하고 청소하기
  how: 매일 10분 루틴 청소(조리 후 싱크대 물기 닦기)가 정리된 상태를 유지하는 핵심입니다.
  done: 조리대가 깨끗하게 비워졌다.
- 정리 전후 사진 찍어 기록하기
  why: 사진을 남기면 다음 리셋 때 기준 상태를 알 수 있습니다.
  done: 정리 후 사진을 메모에 첨부했다.`,
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
      conversion_note: '특정 유튜브 가계부 재생목록(슈카월드)이 가계부 주제 영상으로 검증되지 않아, WebSearch로 확인되는 보편적 가계부 방법론(50/30/20 법칙, 고정·변동·금융지출 분류)을 다루는 가이드로 출처를 일반화했습니다. 투자 조언이 아닌 기록 출발점입니다.',
      warning: '이 Flow는 지출 기록과 파악을 돕는 도구이며 투자·재무 조언이 아닙니다. 금융 결정은 공인 전문가와 상담하세요.',
      tags: ['재테크', '가계부', '재무', 'reference'],
    },
    text: `@월 1회(월초)

## 1. 지출 카테고리 설정
- 내 지출 유형에 맞는 카테고리 4~6개 정하기
  why: 카테고리가 너무 많으면 기록이 번거롭고, 너무 적으면 원인 파악이 어렵습니다. 초보일수록 크게 분류해 간결하게 적는 것이 지속에 유리합니다.
  how: 지출을 고정지출(월세·보험·구독), 변동지출(식비·교통·쇼핑), 금융지출(저축·투자·대출상환) 3가지로 크게 나눠 시작합니다. 분배 기준은 50/30/20 법칙(필수 생활비 50%, 여유 생활비 30%, 저축·투자 20%)을 참고합니다.
  done: 카테고리 목록을 시트 첫 줄에 적었다.
  link: 가계 예산 50/30/20 법칙 가이드 | https://eknowhow.kr/budgeting-50-30-20-rule/ | reference
  caution: 투자 방식·종류는 이 Flow에서 결정하지 않습니다. 기록 습관을 먼저 만드는 게 목적입니다.
- 이번 달 고정지출 목록 작성하기
  how: 월세, 대출 상환, 보험료, 구독 서비스 등 매달 나가는 금액을 먼저 기록합니다.
  done: 고정지출 항목과 금액을 정리했다.

## 2. 매일 기록 루틴
- 하루 기록 습관: 자기 전 5분 그날 지출 입력하기
  why: 당일 입력하지 않으면 기억이 흐려지고 누락이 생깁니다.
  how: 카드 앱이나 카카오페이·토스 내역을 확인해 카테고리별로 시트에 입력합니다.
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
      source_checked_at: '2026-07-11',
      conversion_note: '토스피드 통장 쪼개기 가이드(선 이체·후 소비, 급여·생활비·저축·비상금 4개 통장)를 월급날 루틴 체크리스트로 전환했습니다. (이전 howtomanage-salary URL은 확인 불가로 검증된 통장쪼개기 글로 교체)',
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
  how: 예금, 적금, ISA, 연금저축 등 목표 금액을 자동이체 또는 즉시 이체합니다. 토스피드가 제시하는 예시 분배 비율은 생활비 40% / 저축·투자 40% / 비상금 20%입니다(상황에 맞게 조정).
  done: 저축 금액을 이체했다.

## 3. 생활비 분리
- 이번 달 생활비 한도를 별도 계좌나 봉투로 분리하기
  why: 생활비와 전체 잔액이 섞이면 실제로 쓸 수 있는 금액이 얼마인지 파악하기 어렵습니다. 통장 쪼개기는 급여통장·생활비통장·저축(투자)통장·비상금통장 4개가 기본입니다.
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
      title: '30일 독서 습관 만들기 Flow',
      description: '브런치스토리 "@woochul4532 – 독서습관을 만들기 위한 10가지 방법"을 참고해 하루 15~30분 독서를 30일간 이어가는 루틴을 만듭니다.',
      category: '자기계발/독서',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      routine_duration_days: 30,
      source_title: '브런치스토리 @woochul4532 – 독서습관을 만들기 위한 10가지 방법',
      source_url: 'https://brunch.co.kr/@woochul4532/3',
      conversion_note: '브런치 독서 습관 10가지 가이드(brunch.co.kr/@woochul4532/3)를 하루 실천 루틴과 주간 기록으로 전환했습니다.',
      tags: ['독서', '자기계발', '습관', 'reference'],
    },
    text: `@매일 15~30분
@주 1회 점검

## 1주차: 시간과 책 고정
- 오늘 읽을 시간대 한 곳 고정하기
  why: 독서 시간을 정하지 않으면 "오늘은 피곤하니까 내일"로 미루기 쉽습니다. 브런치 가이드는 아침 15분 일찍 일어나 고정 시간에 읽는 방식을 권장합니다.
  how: 출퇴근(지하철 30분이면 2주에 1권), 점심시간, 취침 30분 전 중 현실적으로 가능한 시간 하나를 고릅니다.
  done: 오늘 독서 시간을 캘린더 반복 일정으로 넣었다.
  link: 브런치스토리 독서습관 10가지 방법 | https://brunch.co.kr/@woochul4532/3 | reference
- 이번 달 읽을 책 1권 선택하기
  why: 책을 항상 소지하고 다니면 틈틈이 꺼내 볼 수 있습니다. 미리 고르지 않으면 시작하는 데 에너지를 쓰게 됩니다.
  done: 책을 골랐다(제목 메모).

## 2주차: 15분 읽기 실행
- 하루 최소 15분, 반드시 책 펴기
  how: 하루 한 두 장을 읽는 것을 목표로 합니다. 15분이 넘어도 좋습니다. 완독 강박 없이 읽다 보면 습관이 형성됩니다.
  done: 오늘 책을 폈다(실제 읽은 시간 기록).
- 읽다 멈춘 페이지와 짧은 메모 남기기
  done: 진행 페이지와 오늘 기억에 남는 문장 한 줄을 적었다.

## 3~4주차: 점검과 유지
- 주간 읽은 페이지 합산하고 다음 주 목표 정하기
  how: 이번 주 페이지 합계를 보고 부담 없이 달성 가능한 다음 주 목표를 정합니다. 행동이 습관으로 자동화되는 데는 평균 약 66일(개인차 18~254일)이 걸린다는 연구가 있으니, 30일은 "완성"이 아니라 관성을 만드는 출발 구간으로 보면 됩니다.
  done: 주간 독서량과 다음 주 목표를 기록했다.
- 한 달 완료 후 다음 책 후보 2권 미리 정하기
  done: 다음 달에 읽을 책 후보를 메모에 적었다.`,
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
      conversion_note: '특정 브런치 포스트(@libraryman/164)가 확인되지 않아, WebSearch로 확인되는 완독 노하우(시간 먼저 확보·좋아하는 장르·완독 강박 버리기)를 다루는 리디 가이드로 출처를 일반화했습니다.',
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
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '늘투엔티스 – 스킨케어 순서 완벽 가이드: 5단계로 완성하는 아침·저녁 피부 관리 루틴',
      source_url: 'https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/',
      conversion_note: '스킨케어 5단계 가이드(묽은 제형→진한 제형 순)를 아침 5분 루틴으로 전환했습니다.',
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
- 오늘 피부 상태 한 줄 기록하기(선택)
  why: 피부 변화는 며칠에 걸쳐 나타나므로 기록이 있어야 패턴을 파악할 수 있습니다.
  done: 오늘 피부 상태를 기록했다.`,
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
      risk_level: 'low',
      primary_destination: 'sheet',
      source_title: '한지센터 – 내 피부 타입 확인하는 법과 그에 맞는 데일리 루틴',
      source_url: 'https://hanjicenter.kr/%EB%82%B4-%ED%94%BC%EB%B6%80-%ED%83%80%EC%9E%85-%ED%99%95%EC%9D%B8%ED%95%98%EB%8A%94-%EB%B2%95%EA%B3%BC-%EA%B7%B8%EC%97%90-%EB%A7%9E%EB%8A%94-%EB%8D%B0%EC%9D%BC%EB%A6%AC-%EB%A3%A8%ED%8B%B4-%EC%A0%95/',
      conversion_note: '피부 타입 자가진단 가이드(세안 후 1시간 관찰법)를 주간 피부 관찰 시트로 전환했습니다.',
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
      title: '국내여행 D-7 준비 Flow',
      description: '트립닷컴 국내여행 준비물 가이드와 브런치 국내여행 체크리스트를 참고해 숙박·이동·일정 예약과 짐 싸기까지 일주일 전 준비를 체크합니다.',
      category: '여행',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '트립닷컴 – 국내 여행 준비물 체크리스트! 알차게 챙겨가는 법',
      source_url: 'https://kr.trip.com/guide/info/%EA%B5%AD%EB%82%B4+%EC%97%AC%ED%96%89+%EC%A4%80%EB%B9%84%EB%AC%BC.html',
      conversion_note: '특정 브런치 포스트(@fruitful0522/24) 확인 불가로, WebSearch로 확인되는 트립닷컴 국내여행 준비물 가이드로 출처를 일반화했습니다. D-7부터 출발 전까지 타임라인으로 전환했습니다.',
      tags: ['여행', '국내여행', '준비', 'reference'],
    },
    text: `## D-7 예약 확인
- 숙소·교통(기차·버스·항공) 예약 내역 재확인하기 D-7
  why: 예약 변경이나 취소 정책은 출발 전에 알아야 대응할 수 있습니다. 국내 여행도 숙소 유형에 따라 패킹 목록이 달라집니다.
  how: 예약 확인 메일이나 앱에서 체크인 시간, 취소 정책, 연락처를 확인합니다.
  done: 예약 내역과 취소 정책을 메모에 정리했다.
  link: 트립닷컴 국내여행 준비물 체크리스트 | https://kr.trip.com/guide/info/%EA%B5%AD%EB%82%B4+%EC%97%AC%ED%96%89+%EC%A4%80%EB%B9%84%EB%AC%BC.html | reference
- 현지 교통과 주요 장소 이동 시간 확인하기 D-7
  how: 산간 지역이나 남부 지방은 지역마다 기온 차이가 클 수 있으니 날씨 예보도 함께 확인합니다.
  done: 현지 이동 계획(대중교통·렌터카 등)과 날씨를 메모에 정했다.

## D-3 일정·짐
- 당일 방문할 장소 순서와 운영시간 확인하기 D-3
  why: 운영시간과 예약 필요 여부를 미리 확인해야 현지에서 낭비 없이 움직일 수 있습니다.
  done: 방문 순서와 영업시간을 정리했다.
- 짐 목록 작성하고 필수품 확인하기 D-3
  how: 신분증, 편안한 신발, 숙박 예약 확인서, 충전기, 개인 위생용품, 상비약을 기본 체크합니다. 봄·가을은 일교차가 크므로 얇은 겉옷과 우산을 추가합니다.
  done: 여행 짐 목록을 작성했다.

## D-1 출발 전 최종 확인
- 예약 바우처·신분증·카드 한 곳에 모으기 D-1
  done: 필수 서류와 결제 수단을 준비했다.
- 숙소 주소와 체크인 방법 저장하기 D-1
  done: 숙소 연락처와 체크인 안내를 저장했다.

## D-0 출발 당일
- 출발 전 필수품·서류 최종 점검하고 집 잠금·가스·전기 확인하기 D-0
  how: 신분증·예약 바우처·충전기·상비약·날씨용품을 다시 확인하고, 가스 밸브·전기·문 잠금을 점검한 뒤 출발합니다.
  done: 당일 최종 점검을 마치고 출발했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-travel-packing-list',
      slug: 'travel-packing-list',
      title: '여행 짐 싸기 체크리스트 Flow',
      description: 'KKday 해외여행 준비물 체크리스트와 브런치 해외여행 준비물 가이드를 참고해 필수품부터 챙기고, 과잉 짐 없이 가방을 완성합니다.',
      category: '여행',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: 'KKday Korea – 2026 해외여행 준비물 체크리스트(+짐 싸는 팁)',
      source_url: 'https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist',
      conversion_note: 'KKday 여행 준비물 가이드(압축백 활용, 캐리어 배치법)를 카테고리별 체크리스트로 전환했습니다.',
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

## 마지막 확인
- 캐리어 짐 배치 확인(무거운 것 아래, 자주 꺼낼 것 위)
  how: 신발·책 등 무거운 물건은 바퀴쪽(아래)에, 충전기·우산·세면도구 등 자주 꺼내는 것은 위쪽에 배치합니다. 부피 큰 옷·침구는 압축백으로 50% 이상 부피를 줄일 수 있고, 10일 이상 장기 여행은 압축가방 활용을 권장합니다.
  done: 가방 무게와 배치를 확인했다.
- 집 출발 전 잠금·가스·전기 확인 목록 정하기
  done: 출발 전 확인 목록을 메모에 적었다.`,
  },

  // ──────────────────────────── 홈카페 / 취미 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-home-cafe-daily',
      slug: 'home-cafe-daily',
      title: '홈카페 루틴 만들기 Flow',
      description: '홈카페 입문 가이드를 참고해 매일 아침 또는 여가 시간에 카페 음료를 집에서 즐기는 루틴을 만듭니다.',
      category: '홈카페/취미',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      source_title: '아침산책의 커피 이야기 – 아이스 커피 맛있게 만드는 법(집에서 아메리카노)',
      source_url: 'https://morningwalkcoffee.com/ice-coffee-recipes/',
      conversion_note: '특정 홈카페 입문서(homecafe.space) URL이 확인되지 않아, WebSearch로 확인되는 아이스 커피 레시피 가이드로 출처를 일반화했습니다. 기본 장비·메뉴·루틴을 일상 루틴으로 전환했습니다.',
      tags: ['홈카페', '취미', '루틴', 'reference'],
    },
    text: `@매일(또는 주말)

## 홈카페 루틴
- 오늘 만들 음료 1가지 정하기
  why: 메뉴를 먼저 고르면 재료와 도구 준비가 빠르게 됩니다. 에스프레소 머신은 진한 커피, 드립 머신은 부드러운 맛, 캡슐 머신은 간편함을 원할 때 선택합니다.
  done: 오늘 메뉴를 정했다.
  link: 아이스 커피 만드는 법 가이드 | https://morningwalkcoffee.com/ice-coffee-recipes/ | reference
- 물 온도·원두 상태 확인하기
  why: 물 온도와 원두 신선도가 맛의 70%를 결정합니다. 잘못된 추출 온도는 쓴맛·신맛 불균형을 만듭니다.
  how: 드립 커피는 85~93°C(끓인 물을 30초 식힌 온도), 에스프레소는 90~96°C가 적정입니다. 원두는 개봉 후 2~4주 내 사용하고, 가스 밸브를 통해 가스가 나오는 신선한 원두인지 확인합니다.
  done: 물 온도와 원두 상태를 확인했다.
  caution: 끓는 물(100°C)을 바로 사용하면 쓴맛이 강해집니다. 아이스 음료라도 추출 온도는 뜨겁게 유지합니다.
- 재료와 도구 준비하기(원두·우유·시럽·잔)
  how: 아이스 아메리카노 기본 레시피: 에스프레소 1~2샷에 찬물 100~150ml를 먼저 섞은 뒤 얼음을 채운 잔에 붓습니다(뜨거운 에스프레소를 얼음에 바로 부으면 향이 날아가고 쓴맛이 강해집니다). 머신이 없으면 인스턴트 커피 2스틱+물 250ml+얼음으로도 됩니다. 라떼는 여기에 우유 250ml를 더합니다.
  done: 재료와 도구를 꺼냈다.
- 레시피 순서대로 음료 만들기
  how: 처음엔 기본 비율부터 시작해 맛을 보며 조정합니다. 공간은 주방·창가 선반·작은 벽면 어디든 활용 가능합니다.
  done: 음료를 완성했다.
- 사용한 도구 바로 헹구기(포터필터·드리퍼·잔)
  why: 커피 오일과 찌꺼기는 식으면 굳어 제거하기 어렵습니다. 바로 헹구면 세제 없이도 깨끗하게 유지됩니다.
  how: 음료를 마신 직후 흐르는 물로 포터필터·드리퍼·잔을 간단히 헹굽니다. 주 1회는 세제로 깨끗이 씻고 완전히 건조시킵니다.
  done: 사용 도구를 헹궜다.
- 한 줄 평가 남기기(달기·쓴기·다음에 바꿀 점)
  why: 기록이 있어야 나만의 레시피로 발전시킬 수 있습니다. 작은 조정(원두 양 ±1g, 물 온도 ±3°C)이 맛을 크게 바꿉니다.
  done: 오늘 음료 평가와 다음에 바꿀 점을 메모했다.`,
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
      title: '포트폴리오 제작 4주 플랜 Flow',
      description: 'velog "@vonvoyage27 – 포트폴리오 4주 만에 준비하기" 가이드를 참고해 4주 안에 포트폴리오를 완성하는 단계별 플랜을 만듭니다.',
      category: '커리어/취업',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'hybrid',
      source_title: 'Velog @vonvoyage27 – 포트폴리오 4주 만에 준비하기',
      source_url: 'https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8',
      conversion_note: 'velog 4주 포트폴리오 가이드(1주 기획·설계, 3주 개발·완성 구조)를 4주 실행 타임라인으로 전환했습니다.',
      tags: ['커리어', '포트폴리오', '취업', 'reference'],
    },
    text: `## D-28 목적과 구조 정하기
- 포트폴리오 목적(취업 지원·프리랜서·이직)과 대상 확인하기 D-28
  why: 목적에 따라 강조할 내용과 포맷이 달라집니다. 가이드 구조: 아이템 선정 → 기술 선정 → 기능 정의 → 페이지 기획.
  done: 목적과 주요 지원 직무를 메모했다.
  link: velog 포트폴리오 4주 준비 가이드 | https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8 | reference
- 넣을 프로젝트·작업물 후보 목록 만들기 D-28
  how: 경험한 프로젝트를 나열하고 지원 직무와 관련성이 높은 것부터 선정합니다. 회사가 보고 싶어하는 것: Git 계정(학습 기록), 프로젝트(포트폴리오), 코딩 테스트.
  done: 후보 프로젝트 목록을 작성했다.

## D-21 콘텐츠 작성
- 각 프로젝트별 상황·역할·성과 정리하기 D-21
  why: '무엇을 했다'보다 '어떤 문제를, 어떻게, 결과는?'을 보여야 설득력이 있습니다.
  how: STAR(상황-과제-행동-결과) 구조로 각 프로젝트를 200~300자로 정리합니다. 포트폴리오 컨셉을 정해 전체 흐름을 일관성 있게 만듭니다.
  done: 모든 프로젝트 설명을 초안으로 작성했다.

## D-14 포맷과 디자인
- 포트폴리오 도구 선택하고 템플릿 설정하기 D-14
  done: 노션·피그마·PDF 중 도구를 선택했다.
- 포트폴리오 초안 완성하기 D-7
  done: 전체 초안을 완성했다.

## D-1 검토와 완성
- 지원 직무 관점으로 최종 검토하기 D-1
  done: 최종 버전을 저장하고 공유 링크를 준비했다.`,
  },
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-blog-youtube-start',
      slug: 'blog-youtube-start',
      title: '블로그·유튜브 첫 콘텐츠 시작 Flow',
      description: '브런치스토리 "@skychang44 – 블로그를 활용해 유튜브 쉽게 시작하는 법"을 참고해 채널 세팅부터 첫 번째 글·영상 발행까지 준비를 완성합니다.',
      category: '콘텐츠 창작',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '브런치스토리 @skychang44 – 블로그를 활용해 유튜브 쉽게 시작하는 법',
      source_url: 'https://brunch.co.kr/@skychang44/346',
      conversion_note: '브런치 블로그+유튜브 시작 가이드(블로그 콘텐츠→유튜브 스크립트 활용)를 첫 채널 세팅과 첫 콘텐츠 발행 체크리스트로 전환했습니다.',
      tags: ['블로그', '유튜브', '콘텐츠창작', 'reference'],
    },
    text: `## 1. 채널 콘셉트 잡기
- 주제·타깃·톤앤매너 한 줄로 정하기
  why: 콘셉트 없이 시작하면 첫 글을 어떻게 써야 할지 막막해집니다. 브런치 가이드처럼 블로그 콘텐츠를 스크립트로 삼아 유튜브를 시작하면 양쪽 채널을 동시에 성장시킬 수 있습니다.
  how: "○○에 관심 있는 ○○을 위해 ○○한 방식으로 쓴다"처럼 한 문장으로 정리합니다. 처음에는 블로그 첨부 자료 창구로 유튜브를 활용하는 것도 좋은 방법입니다.
  done: 채널 콘셉트를 한 줄로 적었다.
  link: 브런치 블로그+유튜브 시작 가이드 | https://brunch.co.kr/@skychang44/346 | reference
- 첫 콘텐츠 아이디어 3개 적기
  done: 첫 3편의 주제를 메모했다.

## 2. 채널 세팅
- 블로그·유튜브 계정 만들고 채널명·프로필 설정하기
  how: 네이버 블로그는 naver.com → 로그인 → '블로그' 메뉴 → '블로그 개설하기' 순서로 개설합니다.
  done: 계정을 만들고 기본 정보를 입력했다.
- 첫 번째 글·영상 주제와 발행 날짜 정하기
  why: 날짜를 정하지 않으면 "언제든 시작"이 되어 시작을 못합니다. 블로그와 유튜브 두 채널을 연계하면 방문자·구독자가 양쪽에서 유입됩니다.
  done: 첫 번째 콘텐츠 주제와 발행 날짜를 메모했다.

## 3. 첫 콘텐츠 발행
- 초안 작성하기
  done: 초안을 완성했다.
- 발행하고 링크 저장하기
  done: 첫 콘텐츠를 발행하고 링크를 메모에 저장했다.`,
  },

  // ──────────────────────────── 생활습관 / 디지털 웰빙 ────────────────────────────
  {
    source_type: 'reference',
    flow: {
      id: 'creator-260601-morning-routine-30day',
      slug: 'morning-routine-30day',
      title: '아침 루틴 30일 챌린지 Flow',
      description: '브런치스토리 "@pletalk – 하루를 설레게 만드는 작은 습관, 모닝루틴"을 참고해 30일간 아침 시간 30분을 구조화해 하루를 주도적으로 시작합니다.',
      category: '생활습관',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'calendar',
      routine_duration_days: 30,
      source_title: '브런치스토리 @pletalk – 하루를 설레게 만드는 작은 습관, 모닝루틴',
      source_url: 'https://brunch.co.kr/@pletalk/58',
      conversion_note: '브런치 모닝루틴 포스트(brunch.co.kr/@pletalk/58)를 30일 아침 루틴으로 전환했습니다.',
      tags: ['생활습관', '아침루틴', '자기계발', 'reference'],
    },
    text: `@매일 아침 30분

## 아침 루틴 (30분)
- 알람 즉시 일어나기(스누즈 없애기)
  why: 스누즈를 누르면 "5분만 더"가 금세 30분이 되고 수면 관성이 강해져 오히려 일어나기 더 어려워집니다. 기상 시간을 고정하면 체내시계가 그 시간에 적응합니다. 습관 자동화에는 평균 약 66일(개인차 18~254일)이 걸리니 30일은 흐름을 만드는 출발 구간으로 봅니다.
  done: 오늘 알람에 스누즈 없이 일어났다.
  link: 브런치 모닝루틴 가이드 | https://brunch.co.kr/@pletalk/58 | reference
- 물 한 컵 마시기
  done: 기상 후 물을 마셨다.
- 오늘 할 일 TOP 3 메모하기(5분)
  why: 아침에 우선순위를 정해야 하루 중 중요한 일에 집중할 수 있습니다. 급하게 업무부터 시작하기보다, 좋아하는 작은 행동으로 마음을 데운 뒤 본격적인 일에 들어가는 방식이 모닝루틴의 핵심입니다.
  how: 오늘 반드시 해야 할 일 3가지만 적고, 나머지는 그 다음으로 넘깁니다.
  done: 오늘 TOP 3를 메모에 적었다.
- 가벼운 스트레칭 또는 산책(10분)
  done: 스트레칭 또는 가벼운 움직임을 완료했다.
- 주간 완료율 기록하기(주 1회)
  how: 이번 주 몇 일을 루틴대로 지켰는지 기록하고, 못 지킨 날의 이유를 확인합니다.
  done: 이번 주 완료율과 이유를 기록했다.`,
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
      conversion_note: '바잇미 강아지 산책 가이드(사회화·리드줄·적정 온도·훈련 방법)를 출발 전 준비부터 귀가 후 확인까지 루틴으로 전환했습니다.',
      tags: ['반려동물', '강아지', '산책', 'reference'],
    },
    text: `@하루 1~2회

## 산책 전 준비
- 리드줄·배변봉투·물·간식 챙기기
  why: 빠진 준비물은 산책 중 문제가 됩니다. 반려견과 산책 시 안전을 위해 반드시 하네스나 목줄을 채웁니다.
  done: 산책 준비물을 확인했다.
  link: 바잇미 강아지 산책 가이드 | https://www.biteme.co.kr/blog/%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EC%96%B8%EC%A0%9C%EB%B6%80%ED%84%B0-%EA%B0%95%EC%95%84%EC%A7%80-%EC%82%B0%EC%B1%85-%EA%B0%80%EC%9D%B4%EB%93%9C/ | reference
- 강아지 상태(발바닥·다리·기분) 간단히 확인하기
  why: 산책 전 상태를 확인하면 이상 징후를 조기에 발견할 수 있습니다. 적정 산책 온도는 15~25°C, 한 번에 20~30분이 기준입니다. 29~32°C 이상이면 10~15분 이내로 줄이고, 32°C를 넘거나 미세먼지 매우 나쁨·폭설·태풍이면 실외 산책을 쉽니다(여름은 이른 아침·늦은 저녁에).
  done: 강아지 상태를 확인했다.

## 산책 중
- 배변 처리하고 봉투 밀봉하기
  done: 배변을 봉투에 담아 처리했다.
- 강아지 컨디션 관찰하기(다리 절거나 숨가쁨 등)
  how: 강아지가 반려인을 앞서 걷지 않도록 주의하고 항상 옆에서 걸을 수 있도록 훈련합니다. 외출 전 "앉아" 신호로 기다리는 습관을 숙지시킵니다.
  done: 이상 징후 없이 산책을 완료했다.

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
      title: '반려동물 건강 관찰 기록 Flow',
      description: '핏펫 블로그 "수의사가 알려주는 강아지 건강검진 필수 항목"과 반려견 건강 체크 가이드를 참고해 식욕·배변·활동량·외관 변화를 주간 기록으로 남겨 이상 징후를 조기에 파악합니다.',
      category: '반려동물',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'sheet',
      source_title: '핏펫몰 블로그 – 수의사가 알려주는 강아지 건강검진 필수 항목',
      source_url: 'https://www.fitpetmall.com/blog/dog-health-checkup',
      conversion_note: '수의사 기준 강아지 건강검진 항목(식사·활동·배변·외관)을 주간 기록 시트로 전환했습니다.',
      tags: ['반려동물', '건강관찰', '기록', 'reference'],
    },
    text: `@주 1회

## 주간 건강 관찰 기록
- 식욕 변화 확인하기(사료 남기는지, 먹는 속도 등)
  why: 수의사 가이드 핵심: 식욕 감소는 건강 이상의 초기 신호입니다. 평소 잘 먹던 강아지가 갑자기 사료를 남기거나 먹는 속도가 느려졌다면 건강 이상을 의심합니다.
  done: 이번 주 식욕 상태를 시트에 기록했다.
  link: 핏펫 강아지 건강검진 가이드 | https://www.fitpetmall.com/blog/dog-health-checkup | reference
- 배변 상태 확인하기(횟수·굳기·색 등)
  why: 배변 이상은 소화기 문제나 탈수의 신호가 될 수 있습니다. 수의사 문진 항목에 배뇨·배변 습관이 포함됩니다.
  done: 이번 주 배변 상태를 기록했다.
- 활동량·기분 변화 확인하기(평소보다 처지거나 예민한지)
  why: 활동량은 중요한 기준입니다. 평소 활발하던 강아지가 무기력해지거나 산책을 싫어하면 몸 상태를 의심합니다.
  done: 활동량과 기분 상태를 기록했다.
- 외관 이상(피부·눈·귀·발 등) 확인하기
  done: 외관 이상 여부를 기록했다.
- 이상 징후 여부와 동물병원 방문 필요성 판단하기
  caution: 이상 징후가 있거나 판단이 어려우면 동물병원에 빨리 연락하세요. 이 Flow는 관찰 기록 도구이며 진단이 아닙니다.
  done: 이상 징후 여부와 다음 조치를 기록했다.`,
  },
];

export const contentsBatch260601CreatorBundles: FlowBundle[] = specs.map(build);
