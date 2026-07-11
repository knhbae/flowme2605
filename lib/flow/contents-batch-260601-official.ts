import { parseTextFlow } from './parser';
import { Flow, FlowBundle } from './types';

/**
 * 2026-06-01 공식출처 기반 배치 (official-source rebuild).
 *
 * 2026-06-01-ux-content-evaluation.md의 핵심 지적("원본 충실도가 가장 약하다,
 * 27/34가 정확한 공식출처 없는 일반론")을 반영해, generic 배치를 폐기하고
 * **모든 Flow가 실재하는 한국 공공서비스 포털에 매핑되는** 배치로 다시 만들었다.
 *
 * 2026-06-03 WebSearch 기반 전면 재검증(rebuild):
 * - 각 Flow의 핵심 수치(금액·기준·기한·요율)를 2026년 WebSearch 결과로 재확인
 * - 검색으로 확정되지 않은 수치(여권 처리기간, 국민취업 재산상한, 전기차 보조금액,
 *   소상공인 금리 등)는 단정을 피하고 "공식 확인" 프롬프트로 전환
 * - 영유아 구강검진 차수(총 4회), 자동차세 연납 할인율(약 4.6%), 국가장학금
 *   구간별 금액 등 기존 stale/부정확 수치를 검색 기반으로 교정
 * - 출처 title을 더 구체적인 페이지명으로 업데이트
 *
 * 원칙:
 * - 각 Flow는 실재하는 공식 포털(정부24, 홈택스, 국민건강보험, 질병관리청,
 *   고용보험, 한국장학재단, 청약홈, 국민연금공단 등)의 서비스에 매핑한다.
 * - URL은 각 서비스의 실재 랜딩 페이지를 사용한다. 확신 없는 깊은 쿼리스트링
 *   deep-link는 만들지 않되, 최소한 해당 서비스 섹션 URL은 명시한다.
 * - 항목은 공식 정보(official) 기반이며, 대상/금액/조건은 개인 상황에 따라
 *   달라지므로 "공식 확인 질문"으로 남기고 Flow가 단정하지 않는다.
 * - 민감(의료/재무) 영역은 경고와 중단/상담 조건을 분리한다.
 *
 * 분류: 모두 source_status 'needs_review'(audit 전), source_precision 'exact',
 * 항목 source_type 'official' → inventory source_needs_review, lifecycle 'fix',
 * 대부분 source_review priority 'audit_now'. 어떤 것도 검증/대표/공개 MVP 아님.
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
      source_status: spec.flow.source_status ?? 'needs_review',
      source_precision: spec.flow.source_precision ?? 'exact',
      source_checked_at: spec.flow.source_checked_at ?? '2026-06-01',
      created_at: now,
      updated_at: now,
      raw_text: spec.text,
    },
    // 공식 정보 기반 배치이므로 모든 항목을 official로 표시한다.
    ...parsed,
    items: parsed.items.map((item) => ({ ...item, source_type: 'official' as const })),
  };
}

const specs: BatchSpec[] = [
  // ───────────────────────── 학자금 / 주거 / 금융 지원 ─────────────────────────
  {
    flow: {
      id: 'official-260601-national-scholarship',
      slug: 'national-scholarship-apply',
      title: '국가장학금 신청 준비 Flow',
      description: '학기별 신청기간을 놓치지 않게 가구원 동의, 소득분위 산정, 서류를 미리 준비합니다.',
      category: '교육/장학',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'calendar',
      source_title: '한국장학재단 – 국가장학금 Ⅰ유형(학생직접지원형) 안내',
      source_url: 'https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_01_01',
      warning: '신청기간, 소득분위 기준, 지원 금액은 학기·연도마다 달라집니다. 한국장학재단 공식 공지를 반드시 확인하세요.',
    },
    text: `## D-14 신청 전 확인
- 이번 학기 신청기간(1차/2차) 확인하기 D-14
  why: 국가장학금은 정해진 신청기간을 지나면 해당 학기 신청이 불가능합니다. 1차(전년 11~12월), 2차(2~3월) 각각 마감일이 다릅니다.
  how: 한국장학재단 공지에서 1차/2차 신청 시작·마감일을 확인합니다.
  done: 신청 시작일과 마감일을 메모와 캘린더에 적었다.
  link: 한국장학재단 국가장학금 Ⅰ유형 안내 | https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_01_01 | official
  caution: 2026학년도 1학기 기준 2차 신청은 2월 1일~3월 12일(18:00)이었습니다. 학기마다 날짜가 다르니 재단 공지로 확인하세요.
- 본인·학부모 공동인증서(또는 금융인증서) 준비하기 D-14
  why: 가구원 동의는 공동인증서 또는 금융인증서로만 가능합니다.
- 학자금 지원구간 산정용 가구원 동의 대상 확인하기 D-14
  why: 가구원(부모 등) 정보제공 동의가 늦으면 소득분위 산정이 지연되어 심사 자체가 진행되지 않습니다.
  caution: 2026학년도 1학기 가구원 동의(서류제출) 기간은 2월 3일~3월 24일(18:00)이었습니다. 다음 학기 기간을 재단 공지로 확인하세요.

## D-7 신청
- 본인 명의 계좌·학적 정보 확인하기 D-7
  done: 재학 중인 학교와 학적 상태가 장학금 지급 요건에 맞는지 확인했다.
- 신청서 작성하고 가구원 동의 요청 보내기 D-7
  how: 한국장학재단 홈페이지 또는 모바일 앱에서 신청하고, 가구원에게 동의 요청을 전송합니다.
  done: 신청 완료 화면 또는 접수번호를 저장했다.

## D-Day 마감 점검
- 가구원 동의 완료 여부 확인하기 D-Day
  caution: 본인 신청만 하고 가구원 동의가 빠지면 미완료 처리될 수 있습니다. 동의 완료 여부를 재단 홈페이지에서 재확인합니다.
- 서류 제출 요청(필요 시) 마감 전 처리하기 D-Day
  caution: 2026학년도 Ⅰ유형 연간 지원금액은 기초·차상위 등록금 전액, 1~3구간 600만원, 4~6구간 440만원, 7~8구간 360만원, 9구간 100만원 수준입니다(학기당 절반씩). 구간 경곗값과 금액은 매학기 재단 공지로 확인하세요.`,
  },
  {
    flow: {
      id: 'official-260601-housing-subscription',
      slug: 'housing-subscription-account',
      title: '주택청약 자격·통장 준비 Flow',
      description: '청약홈 기준으로 청약통장, 무주택·세대주 요건, 가점 항목을 미리 정리해 청약 전 자격을 점검합니다.',
      category: '주거/청약',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '청약홈(한국부동산원) – 청약 안내·자격 확인',
      source_url: 'https://www.applyhome.co.kr/co/coa/selectMainView.do',
      warning: '청약 자격, 가점, 특별공급 요건은 공급 유형과 지역마다 다릅니다. 청약홈 공고문과 공식 안내로 직접 확인하세요.',
    },
    text: `## 1. 통장·기본 자격
- 청약통장 종류·납입 회차·예치금 확인하기
  why: 주택 유형·지역별 예치금 기준을 못 맞추면 청약 자체가 제한됩니다.
  how: 청약홈에서 내 청약통장 가입내역과 납입 인정 회차를 확인합니다.
  done: 납입 회차와 예치금 상태를 메모했다.
  link: 청약홈 | https://www.applyhome.co.kr/co/coa/selectMainView.do | official
  caution: 2026년부터 청약통장 월 납입 인정 한도가 10만원→25만원으로 상향되었습니다. 가입 은행에서 납입액 변경을 확인하세요.
- 무주택 기간·세대주 여부 확인하기
  caution: 세대 구성원의 주택 소유도 무주택 요건에 영향을 줍니다. 무주택 기간은 만 30세 또는 혼인신고일 중 빠른 날부터 산정합니다.

## 2. 가점·유형
- 청약가점(무주택기간·부양가족·통장기간) 계산해 보기
  how: 민영주택 가점은 부양가족 수(최대 35점) + 무주택기간(최대 32점) + 청약통장 가입기간(최대 17점)으로 산정합니다.
  done: 내 가점 총점을 계산해 메모했다.
- 일반공급/특별공급(신혼·생애최초 등) 해당 여부 확인하기
  done: 내가 노릴 공급 유형을 정했다.

## 3. 공고 대응
- 관심 지역 입주자모집공고 알림 설정하기
- 공고문에서 청약일·서류·계약금 일정 메모하기
  caution: 공고문 기준이 우선이며, 부적격 당첨 시 불이익이 있습니다.`,
  },
  {
    flow: {
      id: 'official-260601-jeonse-guarantee',
      slug: 'jeonse-guarantee-apply',
      title: '전세보증금 반환보증 가입 준비 Flow',
      description: 'HUG 기준으로 보증 대상 요건, 필요 서류, 가입 시점을 정리해 전세보증금 안전장치를 준비합니다.',
      category: '주거/금융',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '주택도시보증공사(HUG) – 전세보증금반환보증 상품 개요',
      source_url: 'https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp',
      warning: '가입 가능 대상, 보증료, 신청 기한은 물건·계약 조건마다 다릅니다. HUG 공식 안내(1566-9009)와 상담으로 확인하세요.',
    },
    text: `## 1. 가입 가능 여부
- 전세 계약 조건이 보증 대상에 맞는지 확인하기
  why: 전세가율, 선순위 채권, 주택 유형에 따라 가입이 거절될 수 있습니다.
  how: HUG 전세보증금반환보증 안내에서 대상·한도 요건을 확인합니다.
  done: 가입 가능/제한 여부와 사유를 메모했다.
  link: HUG 전세보증금반환보증 상품 개요 | https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp | official
  caution: 2026년 기준 보증 한도는 수도권 7억원 이하, 비수도권 5억원 이하입니다. 전세보증금이 공시가격의 126% 이하여야 가입 가능합니다(2026년 강화 기준).
- 보증 신청 가능 기한(잔금·전입 기준) 확인하기
  caution: 신청 가능 기간을 넘기면 가입이 불가능할 수 있습니다.

## 2. 서류 준비
- 전세계약서·전입신고·확정일자·등본 등 서류 모으기
  why: 전입신고와 확정일자는 대항력·우선변제권 확보의 핵심 요건이며 보증 가입에도 필수입니다.
  done: 필요 서류 체크리스트를 완료했다.
- 보증료(요율) 예상액 계산하기

## 3. 신청·관리
- 지사 방문 또는 모바일(네이버부동산·카카오페이·토스)로 신청하기
  done: 보증증서 또는 접수 상태를 저장했다.
- 보증 기간·갱신 시점 캘린더에 표시하기`,
  },
  {
    flow: {
      id: 'official-260601-welfare-finder',
      slug: 'welfare-benefit-finder',
      title: '맞춤형 복지서비스 찾기 Flow',
      description: '복지로 기준으로 내 상황(가구·소득·생애주기)에 맞는 받을 수 있는 복지서비스를 빠뜨리지 않게 점검합니다.',
      category: '복지/지원',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '복지로 – 복지서비스 신청(온라인 민원 신청)',
      source_url: 'https://www.bokjiro.go.kr/ssis-tbu/twatza/wmAplyMng/selectWmGdnc.do',
      warning: '지원 대상과 금액은 가구 소득·재산·지역에 따라 다릅니다. 복지로와 주민센터에서 직접 확인하세요.',
    },
    text: `## 1. 내 상황 정리
- 가구 구성·생애주기(임신·출산·취업·노년 등) 적어보기
  why: 복지서비스는 상황별로 나뉘어 있어 내 상황을 먼저 정의해야 검색이 됩니다.
  done: 내 가구·생애주기 키워드를 메모했다.

## 2. 검색·확인
- 복지로에서 맞춤형급여안내(복지멤버십) 신청하기
  how: 복지로 복지멤버십에 가입하면 가구 특성·연령 기준으로 받을 수 있는 복지서비스를 맞춤형으로 안내받습니다. 공동인증서 또는 간편인증으로 로그인 후 신청하거나, 신분증을 가지고 읍·면·동 주민센터를 방문해 신청합니다.
  done: 받을 수 있을 것 같은 서비스를 목록으로 적었다.
  link: 복지로 서비스 신청 | https://www.bokjiro.go.kr/ssis-tbu/twatza/wmAplyMng/selectWmGdnc.do | official
  caution: 복지멤버십은 가입 후 가구 특성 기반 1차 안내를 받고, 금융정보 제공에 동의하면 소득·재산을 반영한 정밀 안내를 추가로 받습니다. 안내를 받았다고 자동 지급되는 것은 아니며, 각 서비스를 별도로 신청해야 심사가 진행됩니다.
- 각 서비스의 신청 방법(온라인/주민센터) 확인하기
  how: 온라인 신청은 복지로에서, 서류 제출이 필요하거나 어려운 경우 읍·면·동 행정복지센터를 방문합니다.

## 3. 신청
- 신청 가능한 것부터 서류 준비해 신청하기
  caution: 대상 여부가 애매하면 주민센터에 확인 후 신청합니다.
- 신청 결과·지급 시점 메모하기`,
  },
  {
    flow: {
      id: 'official-260601-small-business-fund',
      slug: 'small-business-fund-check',
      title: '소상공인 정책자금·지원 확인 Flow',
      description: '소상공인시장진흥공단 기준으로 정책자금·지원사업 대상 여부와 신청 준비를 점검합니다.',
      category: '사업/지원',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '소상공인시장진흥공단 – 정책자금 신청 안내',
      source_url: 'https://ols.semas.or.kr/ols/man/SMAN010M/page.do',
      source_checked_at: '2026-07-11',
      warning: '지원 대상, 한도, 금리, 신청기간은 사업과 연도마다 다릅니다. 공식 공고와 상담(1533-0100)으로 확인하세요.',
    },
    text: `## 1. 대상 확인
- 사업자 요건(업력·매출·업종·근로자 수) 확인하기
  why: 정책자금은 상시근로자 5명 미만(제조·건설·운수·광업은 10명 미만) 소상공인을 대상으로 합니다.
  how: 소상공인시장진흥공단 공지에서 현재 모집 중인 사업과 요건을 봅니다.
  done: 해당될 것 같은 지원사업을 적었다.
  link: 소상공인 정책자금 신청 안내 | https://ols.semas.or.kr/ols/man/SMAN010M/page.do | official
  caution: 접수 중인 자금, 금리, 한도, 신청 기간은 수시로 달라지므로 신청 화면과 최신 공고문에서 다시 확인합니다.

## 2. 준비
- 사업자등록증·매출 증빙·재무 자료 정리하기
- 교육 이수 요건 있는지 확인하기
  caution: 일부 정책자금은 추가 서류나 사전 확인이 필요할 수 있으므로 선택한 자금의 신청 안내를 따릅니다.

## 3. 신청
- 모집기간·접수 방식(온라인/지역센터) 확인하고 신청하기
  done: 신청 접수번호 또는 상태를 저장했다.`,
  },

  // ───────────────────────── 고용 / 연금 / 보험 ─────────────────────────
  {
    flow: {
      id: 'official-260601-unemployment-benefit',
      slug: 'unemployment-benefit-apply',
      title: '실업급여(구직급여) 신청 준비 Flow',
      description: '고용보험 기준으로 수급 요건 확인, 이직확인서, 수급자격 신청, 구직활동까지 순서대로 준비합니다.',
      category: '고용/실업급여',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '고용24 – 실업급여 신청 안내',
      source_url: 'https://ei.work24.go.kr/ei/eih/cp/cc/ccEminsrFollow/retrieveCc200Info.do',
      source_checked_at: '2026-07-11',
      warning: '수급 자격, 이직 사유 인정, 금액·기간은 개인 상황에 따라 다릅니다. 고용보험과 고용센터 안내를 우선 확인하세요.',
    },
    text: `## 1. 자격·서류
- 피보험단위기간·이직 사유 등 수급 요건 확인하기
  why: 이직일 이전 18개월 내 피보험 단위기간 180일 이상이어야 하며, 자발적 이직 등 사유에 따라 수급이 제한될 수 있어 먼저 확인해야 합니다.
  how: 고용24 실업급여 신청 안내에서 수급 요건과 신청 순서를 확인합니다.
  done: 수급 가능성과 확인이 필요한 점을 메모했다.
  link: 고용24 실업급여 신청 안내 | https://ei.work24.go.kr/ei/eih/cp/cc/ccEminsrFollow/retrieveCc200Info.do | official
- 전 직장에 이직확인서 처리 요청하기
  caution: 사업주는 근로자 요청 시 10일 이내 이직확인서를 고용센터에 제출해야 합니다. 미발급 시 고용센터에 '이직확인서 발급 요청서'를 제출하세요.

## 2. 신청
- 고용24에서 구직 신청하기
  done: 고용24 구직 신청이 완료되었다.
- 수급자격 신청자 온라인 교육 이수하기
- 고용센터 방문해 수급자격 신청하기
  done: 수급자격 인정 여부를 확인했다.

## 3. 수급 중
- 실업인정일·구직활동 요건 캘린더에 표시하기
  caution: 정해진 구직활동을 못 하면 해당 회차 급여가 지급되지 않을 수 있습니다. 이직일 다음 날부터 12개월 내 소정급여일수 한도로 지급되므로 늦지 않게 신청하세요.`,
  },
  {
    flow: {
      id: 'official-260601-job-seeker-allowance',
      slug: 'job-seeker-allowance-apply',
      title: '국민취업지원제도 신청 준비 Flow',
      description: '고용24 기준으로 유형별 지원 대상, 신청 서류, 취업활동계획 수립까지 준비합니다.',
      category: '고용/취업지원',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '고용24 – 국민취업지원제도 취업지원신청 안내',
      source_url: 'https://www.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do',
      warning: '지원 유형(Ⅰ·Ⅱ), 소득·재산 요건, 수당은 개인 상황에 따라 다릅니다. 고용24와 고용센터에서 확인하세요.',
    },
    text: `## 1. 대상 확인
- 소득·재산·취업경험 기준으로 유형(Ⅰ/Ⅱ) 확인하기
  why: 유형에 따라 구직촉진수당 지급 여부가 달라집니다.
  how: 고용24 국민취업지원제도 안내에서 대상 요건을 확인합니다.
  done: 해당될 것 같은 유형을 메모했다.
  link: 고용24 국민취업지원제도 신청 안내 | https://www.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do | official
  caution: Ⅰ유형은 가구 중위소득 60% 이하(청년 18~34세는 120% 이하)가 기본 요건이며 재산 기준도 함께 봅니다(상한액은 공식 확인). 2026년부터 구직촉진수당이 월 60만원(기존 50만원)으로 인상되었고, 부양가족 1인당 월 10만원(최대 40만원)이 추가 지원됩니다.

## 2. 신청
- 신청서·소득재산 증빙 준비하기
- 고용24(www.work24.go.kr) 온라인 또는 고용센터 방문 신청하기
  done: 신청 접수 상태를 저장했다.

## 3. 참여
- 상담 후 취업활동계획(IAP) 수립 일정 잡기
  caution: 취업활동계획과 정해진 활동을 이행해야 수당이 유지됩니다. Ⅱ유형은 내일배움카드 훈련 참여 시 월 최대 28만 4천원의 취업활동비용을 지원받습니다.`,
  },
  {
    flow: {
      id: 'official-260601-pension-estimate',
      slug: 'pension-estimate-check',
      title: '국민연금 가입내역·예상연금 확인 Flow',
      description: '국민연금공단 기준으로 내 가입내역, 예상 노령연금, 추납·임의가입 여부를 점검합니다.',
      category: '연금/노후',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '국민연금공단 전자민원 – 개인 가입내역·예상연금 조회',
      source_url: 'https://nps.or.kr/elctcvlcpt/comm/getOHAC0000M3.do?menuId=MN24001727',
      source_checked_at: '2026-07-11',
      warning: '예상연금액은 가정에 따른 추정치이며 실제 수령액과 다를 수 있습니다. 국민연금공단(1355) 안내로 확인하세요.',
    },
    text: `## 1. 현황 확인
- 가입내역(가입기간·납부 이력) 확인하기
  why: 노령연금은 최소 가입기간 10년을 채워야 수급 자격이 생기고, 가입기간이 길수록 연금액이 늘어납니다.
  how: 국민연금공단 전자민원(공동인증서·간편인증 로그인)에서 가입내역·예상연금을 조회합니다. '내 곁에 국민연금' 앱이나 정부24에서도 조회할 수 있습니다.
  done: 총 가입기간과 예상연금액을 메모했다.
  link: 국민연금공단 전자민원 가입내역 조회 | https://nps.or.kr/elctcvlcpt/comm/getOHAC0000M3.do?menuId=MN24001727 | official
- 납부 예외·미납 기간 있는지 확인하기

## 2. 보완 검토
- 추후납부(추납)·임의가입 대상인지 확인하기
  caution: 추납·임의가입은 본인 상황에 따라 유불리가 달라 공단 상담(1355)이 필요합니다.

## 3. 정리
- 예상연금과 노후 목표를 비교 메모하기
  done: 부족분과 다음 확인 사항을 적었다.`,
  },
  {
    flow: {
      id: 'official-260601-health-insurance-dependent',
      slug: 'health-insurance-dependent',
      title: '건강보험 피부양자 등록 준비 Flow',
      description: '국민건강보험 기준으로 피부양자 자격 요건, 필요 서류, 신청을 준비합니다.',
      category: '건강보험/행정',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '국민건강보험공단 – 피부양자 자격 신고서',
      source_url: 'https://www.nhis.or.kr/static/html/wbdb/f/wbdbf.html',
      source_checked_at: '2026-07-11',
      warning: '피부양자 소득·재산·부양 요건은 기준이 바뀔 수 있습니다. 국민건강보험공단 안내로 확인하세요.',
    },
    text: `## 1. 자격 확인
- 대상자의 소득·재산·부양 요건 확인하기
  why: 소득·재산 기준 초과 시 피부양자에서 제외되어 지역가입자가 됩니다.
  how: 국민건강보험공단 안내에서 자격 기준을 확인하고, 피부양자 자격 신고서의 준비 항목을 봅니다.
  done: 등록 가능 여부와 확인할 점을 메모했다.
  link: 건강보험공단 피부양자 자격 신고서 | https://www.nhis.or.kr/static/html/wbdb/f/wbdbf.html | official
  caution: 소득·재산·부양 요건과 적용 시점은 개인 상황과 최신 기준에 따라 달라질 수 있으므로 공단 안내에서 다시 확인합니다.

## 2. 서류·신청
- 가족관계 증빙 등 필요 서류 준비하기
- 직장가입자(가족)가 회사 인사팀 또는 공단 홈페이지(민원여기요)를 통해 피부양자 자격 취득 신고하기
  done: 등록 처리 결과를 확인했다.
  caution: 자격 변동(취업·소득 발생) 시 다시 신고가 필요합니다.`,
  },

  // ───────────────────────── 건강 / 예방접종 (민감) ─────────────────────────
  {
    flow: {
      id: 'official-260601-infant-health-checkup',
      slug: 'infant-health-checkup-schedule',
      title: '영유아 건강검진 일정 Flow',
      description: '생년월일을 입력하면 NHIS 영유아 건강검진 8차 일정(+구강검진 4회)이 캘린더에 자동 배치됩니다.',
      category: '육아/검진',
      structure_type: 'timeline',
      anchor_type: 'baby_birth_date',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'calendar',
      source_title: '국민건강보험공단 – 영유아 건강검진 안내 및 검진일자 조회',
      source_url: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
      source_checked_at: '2026-07-11',
      warning: '검진 시기·항목·발달평가 결과는 의료진 안내를 우선하세요. 이 Flow는 방문 일정을 챙기는 준비용입니다.',
    },
    text: `## 영유아 건강검진 (일반 8회)
- 1차 검진 예약 D+14~D+35
  why: 생후 14~35일 사이 신생아 건강검진입니다. 기간을 넘기면 해당 차수를 받을 수 없습니다.
  how: 건강보험공단 앱(The건강보험) 또는 검진일자 조회에서 1차 가능 병·의원을 찾아 예약합니다.
  done: 1차 검진 병원을 예약하고 일정을 캘린더에 표시했다.
  link: 국민건강보험 영유아 검진일자 조회 | https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do | official
  caution: 검진 항목·발달평가 결과는 의료진 안내를 우선하세요.
- 2차 검진 예약 D+120~D+180
  why: 생후 4~6개월 사이 검진입니다. 신체·운동 발달을 점검합니다.
  how: 공단 앱에서 2차 가능 의료기관을 조회하고 예약합니다.
  done: 2차 검진을 예약했다.
- 3차 검진 예약 D+270~D+360
  why: 생후 9~12개월 사이 검진입니다.
  done: 3차 검진을 예약했다.
- 4차 검진 + 1차 구강검진 D+540~D+720
  why: 생후 18~24개월 검진입니다. 이 시기에 1차 구강검진(18~29개월)도 함께 확인합니다.
  done: 4차 일반검진과 1차 구강검진 일정을 확인했다.
  caution: 발달 관련 우려가 있으면 검진 결과를 의료진과 상담합니다.
- 5차 검진 + 2차 구강검진 D+900~D+1080
  why: 생후 30~36개월 검진입니다. 2차 구강검진(30~41개월)도 함께 챙깁니다.
  done: 5차 일반검진과 2차 구강검진 일정을 확인했다.
- 6차 검진 + 3차 구강검진 D+1260~D+1440
  why: 생후 42~48개월 검진입니다. 3차 구강검진(42~53개월)도 함께 챙깁니다.
  done: 6차 일반검진과 3차 구강검진 일정을 확인했다.
- 7차 검진 + 4차 구강검진 D+1620~D+1800
  why: 생후 54~60개월 검진입니다. 4차 구강검진(54~65개월)도 함께 챙깁니다.
  done: 7차 일반검진과 4차 구강검진 일정을 확인했다.
- 8차 검진 예약 D+1980~D+2130
  why: 생후 66~71개월, 마지막(8차) 검진입니다.
  done: 8차 검진을 예약했다.`,
  },
  {
    flow: {
      id: 'official-260601-adult-vaccine',
      slug: 'adult-vaccine-schedule-check',
      title: '성인·어르신 예방접종 일정 확인 Flow',
      description: '질병관리청 예방접종도우미 기준으로 연령·기저질환별 권장 접종과 무료지원 대상을 확인합니다.',
      category: '건강/예방접종',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'memo',
      source_title: '질병관리청 예방접종도우미 – 2026 예방접종 자료',
      source_url: 'https://nip.kdca.go.kr/irhp/mngm/goFormBrdList.do',
      source_precision: 'broad',
      source_checked_at: '2026-07-11',
      warning: '접종 권장 대상, 무료 지원, 금기사항은 개인 건강상태에 따라 다릅니다. 질병관리청 안내와 의료진 상담을 우선하세요.',
    },
    text: `## 1. 대상 확인
- 연령·기저질환별 권장 접종 항목 확인하기
  why: 폐렴구균·대상포진·인플루엔자 등은 연령·질환별로 권장과 지원이 다릅니다.
  how: 질병관리청 예방접종도우미에서 권장 일정과 국가지원 대상을 확인합니다.
  done: 나에게 권장되는 접종과 지원 여부를 메모했다.
  link: 예방접종도우미 2026 예방접종 자료 | https://nip.kdca.go.kr/irhp/mngm/goFormBrdList.do | official
  caution: 지원 대상과 권장 시기는 연도와 건강 상태에 따라 달라질 수 있으므로 최신 일정표와 의료진 안내를 함께 확인합니다.
- 과거 접종 이력·금기사항 정리하기
  caution: 금기·주의 대상은 접종 전 의료진과 상담합니다.

## 2. 예약·접종
- 지정 의료기관(질병관리청 예방접종도우미 위탁기관 조회) 확인하고 예약하기
- 접종일·접종기관·이상반응 기록하기
  caution: 접종 후 이상반응이 지속되면 의료기관에 연락합니다.`,
  },
  {
    flow: {
      id: 'official-260601-citizen-secretary',
      slug: 'citizen-secretary-alerts',
      title: '국민비서 알림 신청 Flow',
      description: '국민비서(구삐) 기준으로 건강검진·예방접종·교통과태료 등 놓치기 쉬운 행정 알림을 한 번에 신청합니다.',
      category: '생활행정',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '국민비서(구삐) – 알림서비스 신청·서비스 안내',
      source_url: 'https://www.ips.go.kr/pot/svc/ntcn/selectSvcGuide.do',
      warning: '제공 알림 항목과 채널(앱/문자/카카오 등)은 변경될 수 있습니다. 국민비서 공식 안내(1577-2558)로 확인하세요.',
    },
    text: `## 1. 항목 선택
- 받고 싶은 알림(건강검진·예방접종·교통과태료·자동차검사·운전면허 갱신 등) 고르기
  why: 챙기기 어려운 행정 기한을 알림으로 받으면 과태료·미수령을 줄입니다. 국민비서는 건강검진·예방접종·자동차 검사·운전면허 갱신·과태료·정부 지원금 등 100여 종의 알림을 제공합니다.
  how: 국민비서 서비스 안내에서 알림 가능한 항목을 확인합니다.
  done: 신청할 알림 항목을 정했다.
  link: 국민비서 알림서비스 안내 | https://www.ips.go.kr/pot/svc/ntcn/selectSvcGuide.do | official

## 2. 신청
- 알림 받을 채널(카카오톡·네이버앱·토스) 정하고 신청하기
  how: 카카오톡에서 '국민비서 구삐' 채널 추가 후 본인 인증(카카오인증서·PASS·공동인증서 중 선택) 완료 후 알림 항목을 선택합니다. 네이버앱(전자문서→국민비서) 또는 토스(전체메뉴→국민비서)로도 신청 가능합니다.
- 정상 수신되는지 확인하기
  done: 알림 신청 완료와 수신 채널을 확인했다.`,
  },

  // ───────────────────────── 여권 / 여행 / 관세 ─────────────────────────
  {
    flow: {
      id: 'official-260601-first-passport',
      slug: 'first-passport-issue',
      title: '여권 신규 발급 준비 Flow',
      description: '외교부 여권 안내 기준으로 사진 규격, 신청 서류, 수수료, 수령을 준비합니다.',
      category: '여행/여권',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '외교부 여권안내 – 여권 최초 발급 기본사항 안내',
      source_url: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=2',
      warning: '사진 규격, 미성년자·대리 신청, 수수료, 처리 기간은 공식 기준을 따릅니다. 외교부 여권안내로 확인하세요.',
    },
    text: `## 1. 사진·서류
- 여권 사진 규격 확인하고 촬영하기
  why: 규격에 안 맞는 사진은 접수 단계에서 반려되는 가장 흔한 사유입니다.
  how: 외교부 여권안내의 사진 규격을 확인하고 촬영합니다. 권장 해상도 413×531픽셀, 접수일 기준 6개월 이내 촬영본이어야 합니다. AI 편집·필터 적용 사진은 불가합니다.
  done: 규격에 맞는 사진을 준비했다.
  link: 외교부 여권안내 최초 발급 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=2 | official
- 신분증 등 필요 서류 확인하기
  caution: 미성년자·대리 신청은 추가 서류가 필요합니다.

## 2. 신청·수령
- 가까운 여권 접수처(구청 등) 확인하고 방문 신청하기
  caution: 처리 기간은 신청 방식·시기에 따라 다릅니다(성수기에는 더 길어질 수 있음). 출국일에 충분히 여유를 두고 신청하고, 정확한 처리 기간은 접수처에서 확인하세요.
- 수수료·처리 기간·수령 방법 확인하기
  link: 외교부 여권안내 수수료 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=41 | official
  done: 수령 예정일을 캘린더에 표시했다.`,
  },
  {
    flow: {
      id: 'official-260601-overseas-safety',
      slug: 'overseas-safety-register',
      title: '해외여행 안전정보·영사조력 준비 Flow',
      description: '외교부 해외안전여행 기준으로 여행경보, 영사조력, 비상연락을 출국 전 정리합니다.',
      category: '여행/안전',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '외교부 해외안전여행(0404) – 여행경보·동행등록·영사콜센터',
      source_url: 'https://0404.go.kr/app/main/mainPage',
      source_checked_at: '2026-07-11',
      conversion_note: '외교부 해외안전여행의 현재 메인에서 여행경보, 안전공지, 동행서비스, 영사콜센터 확인 동선을 점검했습니다.',
      warning: '여행경보 단계와 입국 요건은 수시로 바뀝니다. 외교부 해외안전여행 공지를 출발 직전 다시 확인하세요.',
    },
    text: `## 1. 위험 정보
- 방문국 여행경보 단계 확인하기
  why: 경보 단계(여행유의·여행자제·여행제한·여행금지 4단계)에 따라 여행 자제·철수 권고가 달라집니다.
  how: 외교부 해외안전여행(0404.go.kr)에서 국가별 여행경보와 안전공지를 봅니다.
  done: 방문국 경보 단계와 주의사항을 메모했다.
  link: 외교부 해외안전여행 여행경보 | https://0404.go.kr/app/main/mainPage | official

## 2. 비상 대비
- 현지 대사관·영사관 연락처와 영사콜센터(02-3210-0404, 24시간) 저장하기
- 동행등록(해외여행자 인터넷등록제) 신청 검토하기
  how: 0404.go.kr에서 여행 정보를 등록하면 외교부·공관이 안전정보를 이메일로 제공합니다.
- 여권 사본·비상연락·보험증서 따로 보관하기
  done: 비상 정보 메모를 만들었다.
  caution: 영사콜센터는 연중무휴 24시간 운영되며 해외 사건·사고 접수, 신속해외송금 지원 등을 돕습니다. 다만 영사조력 범위에는 한계가 있으니 여행자보험을 함께 준비하세요.`,
  },
  {
    flow: {
      id: 'official-260601-customs-traveler',
      slug: 'customs-traveler-declare',
      title: '해외여행 휴대품 면세범위·신고 Flow',
      description: '관세청 기준으로 면세범위와 자진신고 대상을 정리해 입국 시 가산세·과태료를 피합니다.',
      category: '여행/관세',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '관세청 – 여행자 휴대품 통관 안내',
      source_url: 'https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=2837&cntntsId=829',
      warning: '면세범위, 신고 대상, 반입금지·제한 품목은 변경될 수 있습니다. 관세청 공식 안내를 확인하세요.',
    },
    text: `## 1. 면세범위 확인
- 휴대품 면세범위(총액·주류·담배·향수) 확인하기
  why: 한도를 넘기면 자진신고해야 하며, 미신고 적발 시 세액의 40% 가산세가 붙습니다.
  how: 관세청 여행자 휴대품 안내에서 현재 면세 한도를 확인합니다.
  done: 면세 한도와 내 구매 예정 항목을 비교 메모했다.
  link: 관세청 여행자 휴대품 통관 안내 | https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=2837&cntntsId=829 | official
  caution: 2026년 기준 기본 면세 한도는 1인당 미화 800달러입니다. 별도 면세 허용: 주류 합계 2L·미화 400달러 이하, 담배(궐련) 200개비, 향수 100mL.

## 2. 신고·반입
- 면세범위 초과 시 자진신고 방법 확인하기
  caution: 자진신고하면 관세의 30%(최대 20만원)를 감면받습니다. 미신고 적발 시 가산세 40%가 추가됩니다.
  how: 신고물품이 있으면 신고서(종이 또는 모바일)를 제출합니다. 모바일 신고 시 즉시 고지서 발급·납부가 가능합니다.
- 반입금지·제한 품목(식물·육류 등) 확인하기`,
  },

  // ───────────────────────── 자동차 / 세금 ─────────────────────────
  {
    flow: {
      id: 'official-260601-car-transfer',
      slug: 'used-car-ownership-transfer',
      title: '자동차 이전등록(명의이전) 준비 Flow',
      description: '자동차민원 대국민포털 기준으로 중고차 명의이전 서류와 기한, 보험·세금을 정리합니다.',
      category: '자동차/등록',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '정부24 – 자동차 이전등록 신청 안내',
      source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09006&CappBizCD=15000000370',
      warning: '이전등록 기한, 취득세, 필요 서류는 거래 형태·지역마다 다릅니다. 자동차민원 포털과 관할 기관으로 확인하세요.',
    },
    text: `## 1. 서류·기한
- 이전등록 기한(매수일 기준 15일 이내) 확인하기
  why: 기한을 넘기면 과태료가 부과될 수 있습니다.
  how: 정부24 또는 자동차민원 대국민포털에서 이전등록 절차와 기한을 확인합니다.
  done: 이전등록 마감일을 캘린더에 표시했다.
  link: 정부24 자동차 이전등록 신청 | https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09006&CappBizCD=15000000370 | official
  caution: 이전등록 기한은 매수일로부터 15일 이내입니다. 취득세는 취득일부터 60일 이내에 신고·납부해야 하며, 비영업용 승용차는 7%, 경차는 4%(취득세 75만원까지 면제)입니다. 화물·승합·영업용 세율은 차종별로 다르니 위택스·관할 지자체에서 확인하세요.
- 양도증명·자동차등록증·신분증·인감증명서(개인 간 거래) 등 서류 준비하기

## 2. 보험·세금
- 책임보험 가입(명의 기준) 확인하기
  caution: 보험 공백 상태 운행은 위법이며 사고 시 위험이 큽니다.
- 취득세 등 비용 확인하기

## 3. 등록
- 이전등록 신청하고 새 등록증 확인하기
  how: 정부24 온라인 신청(2~3 영업일 소요) 또는 관할 기관 방문 신청(당일 처리 가능)합니다.
  done: 이전등록 완료와 등록증을 확인했다.`,
  },
  {
    flow: {
      id: 'official-260601-ev-subsidy',
      slug: 'ev-subsidy-apply',
      title: '전기차 구매보조금 신청 준비 Flow',
      description: '무공해차 통합누리집 기준으로 보조금 대상·잔여물량·신청 절차를 정리합니다.',
      category: '자동차/지원',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '무공해차 통합누리집 – 전기차 구매보조금 지급현황·대상 차종',
      source_url: 'https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do',
      warning: '보조금 금액, 잔여물량, 지원 조건은 연도·지자체마다 다르고 조기 소진될 수 있습니다. 공식 누리집으로 확인하세요.',
    },
    text: `## 1. 대상·물량 확인
- 구매 예정 차종의 국고·지자체 보조금 확인하기
  why: 보조금은 지자체별로 다르고 물량이 소진되면 받을 수 없습니다. 예산이 상반기에 조기 소진되는 경향이 있어 공고 직후 빠르게 움직여야 합니다.
  how: 무공해차 통합누리집에서 차종별 보조금과 거주 지자체 잔여물량을 실시간으로 확인합니다. 국고보조금 + 지자체보조금 + (노후차 폐차 시 전환지원금) 세 항목을 합산해 총액을 파악합니다.
  done: 차종별 보조금 금액과 거주지 잔여물량을 메모했다.
  link: 무공해차 통합누리집 전기차 보조금 | https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do | official
  caution: 보조금 금액과 항목은 연도·지자체마다 변경됩니다. 정확한 금액은 반드시 공식 누리집에서 확인하세요.
- 거주지 신청 자격·우선순위 확인하기
  why: 지자체별로 신청 자격(실거주 여부, 이전 보조금 수령 이력 등)과 우선순위 기준이 다릅니다.
  how: 거주 지자체 보조금 공고문에서 신청 자격 조건과 우선순위 항목을 확인합니다. 법인·사업자와 개인 조건이 다를 수 있으므로 해당 유형을 확인하세요.
  done: 거주지 신청 자격을 확인하고 우선순위 해당 여부를 파악했다.

## 2. 계약 전: 보조금 지원 확인서 신청
- 보조금 지원 확인서 신청하기(계약 전 필수)
  why: 전기차 보조금은 반드시 지원 확인서를 받은 후 차량을 계약해야 합니다. 계약 먼저 하면 보조금 대상에서 제외될 수 있습니다.
  how: 거주 지자체 또는 자동차 제조사 딜러를 통해 보조금 지원 확인서를 신청합니다. 신청 후 확인서 발급까지 수일이 걸릴 수 있으므로 미리 신청합니다.
  done: 보조금 지원 확인서를 신청했고 발급 예정일을 확인했다.
  caution: 지원 확인서 없이 차량 계약부터 하면 보조금을 받을 수 없습니다. 이 순서는 반드시 지켜야 합니다.
- 취득세 감면 적용 여부 확인하기
  why: 전기차는 취득세 감면 혜택이 있으며, 이를 미리 확인해야 계약 시 세금 처리가 정확하게 이루어집니다.
  how: 지방세특례제한법 기준으로 전기차 취득세 감면 한도를 확인합니다. 딜러 또는 거주 지자체 세무과에 문의하면 정확한 감면 금액을 안내받을 수 있습니다.
  done: 적용 가능한 취득세 감면 금액을 확인했다.

## 3. 계약·출고
- 보조금 지원 확인서 발급 후 차량 계약하기
  why: 지원 확인서 발급 후 정해진 기간 내에 계약·출고해야 보조금이 유지됩니다.
  how: 딜러와 계약 시 보조금 대리신청 여부, 출고 예정일, 계약 기한을 명확히 확인합니다. 대부분의 경우 딜러가 보조금 신청을 대리합니다.
  done: 차량 계약서를 작성했고 출고 예정일을 확인했다.
  caution: 계약 후 지원 확인서 유효기간 내에 출고가 이루어져야 합니다. 기한을 초과하면 보조금이 취소될 수 있습니다.
- 출고 후 보조금 정산 확인하기
  why: 출고 후 실제 입금된 보조금이 사전 확인한 금액과 일치하는지 확인해야 합니다.
  how: 출고 완료 후 지자체 또는 딜러를 통해 보조금 정산 내역을 확인합니다. 차량 등록 및 취득세 납부 영수증도 함께 보관합니다.
  done: 보조금 입금 금액과 취득세 감면 내역을 확인하고 영수증을 보관했다.

## 4. 충전 환경 준비
- 충전 환경(완속/급속) 미리 점검하기
  why: 충전 인프라 없이 전기차를 구매하면 일상 사용이 불편해집니다. 사전에 충전 환경을 파악해야 합니다.
  how: 거주지 주차장 완속충전기 설치 가능 여부를 확인합니다(아파트는 관리사무소 또는 입주자 대표회의 승인 필요). 주변 급속충전소 위치와 요금도 확인합니다.
  done: 집 근처 충전 환경(완속·급속)을 확인하고 충전 계획을 세웠다.
  link: 환경부 전기차 충전소 찾기 | https://www.ev.or.kr/evcharger | official`,
  },
  {
    flow: {
      id: 'official-260601-property-tax',
      slug: 'property-local-tax-pay',
      title: '지방세(재산세·자동차세) 납부 Flow',
      description: '위택스 기준으로 부과 시기에 맞춰 지방세를 확인·납부하고 절세(연납 등)를 검토합니다.',
      category: '세금/납부',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '위택스(WeTax) – 지방세 조회·납부',
      source_url: 'https://www.wetax.go.kr/main/',
      warning: '부과·납부 기한과 감면 제도는 지자체·연도마다 다릅니다. 위택스와 관할 지자체 안내로 확인하세요.',
    },
    text: `## 1. 확인
- 부과된 지방세 항목·금액·납부기한 확인하기
  why: 납부기한을 넘기면 가산금이 붙습니다.
  how: 위택스에서 내 지방세 부과·납부 내역을 확인합니다. 취득세·재산세·자동차세·주정차 과태료까지 365일 24시간 조회 가능합니다.
  done: 항목별 금액과 기한을 메모·캘린더에 적었다.
  link: 위택스 지방세 조회·납부 | https://www.wetax.go.kr/main/ | official

## 2. 절세 검토
- 자동차세 연납 할인 등 절세 제도 확인하기
  how: 자동차세를 1월에 연납하면 남은 기간분에 대해 공제를 받습니다(2026년 1월 연납 기준 약 4.6% 수준이며 감면율은 해마다 축소되어 왔습니다). 서울 외 지역은 위택스·스마트위택스 앱, 서울은 ETAX·STAX 앱으로 신청하며 3·6·9월에도 추가 신청 기회가 있습니다.
  caution: 연납 신청은 기간(통상 1월)이 정해져 있어 시점을 놓치면 그 달 할인이 적용되지 않습니다. 정확한 할인율은 위택스에서 확인하세요.

## 3. 납부
- 기한 내 납부하고 영수증 보관하기
  done: 납부 완료와 영수증을 저장했다.`,
  },
  {
    flow: {
      id: 'official-260601-tax-refund',
      slug: 'tax-refund-find',
      title: '미환급 세금·환급금 찾기 Flow',
      description: '홈택스·정부24 기준으로 못 받은 국세 환급금과 미환급금을 조회해 신청합니다.',
      category: '세금/환급',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'low',
      primary_destination: 'memo',
      source_title: '국세청 홈택스 – 국세환급금 찾기·원클릭 환급 서비스',
      source_url: 'https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=42&tm2lIdx=4203000000&tm3lIdx=4203010000',
      warning: '환급 대상·금액은 개인 납세 이력에 따라 다릅니다. 홈택스·정부24 공식 조회로 확인하세요.',
    },
    text: `## 1. 조회
- 홈택스에서 국세 환급금 조회하기
  why: 신고 정정·과오납 등으로 받지 못한 환급금이 남아 있을 수 있습니다. 미수령 환급금은 최초 지급요구일부터 5년이 지나면 국고로 귀속됩니다.
  how: 홈택스 [납부·고지·환급] → [국세환급금 찾기]에서 조회합니다. 또는 국세청 원클릭 환급 서비스(AI가 미리 계산한 환급 예상액 확인 후 신청)를 이용합니다.
  done: 환급 대상 금액을 메모했다.
  link: 국세청 홈택스 국세환급금 찾기 | https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=42&tm2lIdx=4203000000&tm3lIdx=4203010000 | official
- 지방세 환급금·미수령금도 위택스에서 확인하기

## 2. 신청·수령
- 환급 계좌 정보 홈택스에 등록하고 신청하기
  how: 홈택스 또는 손택스에 환급받을 계좌를 등록하면 자동으로 입금됩니다. 통지서가 있으면 우체국 방문 수령도 가능합니다.
  done: 신청 상태와 예상 입금 시점을 확인했다.
  caution: 환급 사칭 문자·링크에 주의하고 공식 사이트(hometax.go.kr)로만 접속합니다.`,
  },

  // ───────────────────────── 가족 / 출생 / 상속 / 행정서류 ─────────────────────────
  {
    flow: {
      id: 'official-260601-birth-registration',
      slug: 'birth-registration-prep',
      title: '출생신고 준비 Flow',
      description: '출생 후 신고기한 안에 출생신고와 함께 받을 수 있는 서비스를 정리합니다.',
      category: '가족/출생',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'calendar',
      source_title: '정부24 – 행복출산 원스톱서비스(출생신고 통합 신청)',
      source_url: 'https://www.gov.kr/portal/onestopSvc/happyBirth',
      warning: '신고기한, 필요 서류, 동시 신청 서비스는 변경될 수 있습니다. 정부24와 전자가족관계등록 안내로 확인하세요.',
    },
    text: `## D+0 서류 준비
- 출생증명서 등 신고 서류 확인하기 D+0
  why: 출생신고는 신고기한이 있어 서류를 일찍 준비하는 게 좋습니다.
  how: 정부24 행복출산 원스톱서비스 또는 읍·면·동 주민센터에서 출생신고 절차와 서류를 확인합니다.
  done: 필요 서류를 모았다.
  link: 정부24 행복출산 원스톱서비스 | https://www.gov.kr/portal/onestopSvc/happyBirth | official
- 아이 이름·등록기준지 정하기

## D+7 신고·연계
- 출생신고 접수하기 D+7
  how: 정부24(온라인) 또는 주민센터 방문으로 신고합니다. 신청인은 출산자 본인 또는 배우자이며 대리인은 온라인 신청 불가합니다.
  done: 출생신고 접수를 확인했다.
- 행복출산 원스톱 등 함께 신청 가능한 서비스 확인하기 D+7
  caution: 부모급여는 출생일 포함 60일 이내 신청 시 출생월부터 소급 지급됩니다. 양육·출산 지원은 거주지·가구 조건에 따라 달라 공식 확인이 필요합니다.

## D+25 기한 점검
- 신고기한 내 완료 여부 최종 확인하기 D+25
  caution: 출생 후 1개월(30일) 이내 신고가 원칙이며, 신고기한을 넘기면 과태료가 부과될 수 있습니다.`,
  },
  {
    flow: {
      id: 'official-260601-safe-inheritance',
      slug: 'safe-inheritance-onestop',
      title: '안심상속 원스톱 신청 준비 Flow',
      description: '정부24 안심상속 기준으로 고인의 금융·세금·재산 내역을 한 번에 조회 신청하는 준비를 정리합니다.',
      category: '가족/상속',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'financial_sensitive',
      primary_destination: 'memo',
      source_title: '정부24 – 안심상속 원스톱서비스(사망자 재산조회)',
      source_url: 'https://www.gov.kr/portal/onestopSvc/safeInheritance',
      warning: '신청 자격(상속인 등), 기한, 상속 처리(승인·포기)는 법적 판단이 필요합니다. 정부24 안내와 전문가 상담을 우선하세요.',
    },
    text: `## 1. 자격·서류
- 신청 자격(상속인 등)과 신청 기한 확인하기
  why: 상속 재산·채무 파악이 늦으면 한정승인·포기 결정 시점을 놓칠 수 있습니다.
  how: 정부24 안심상속 원스톱서비스 안내에서 자격·서류·기한을 확인합니다.
  done: 신청 자격과 기한을 메모했다.
  link: 정부24 안심상속 원스톱서비스 | https://www.gov.kr/portal/onestopSvc/safeInheritance | official
  caution: 안심상속 원스톱 서비스는 사망일이 속한 달의 말일부터 1년 이내 신청합니다. 신청 자격은 1·2·3순위 상속인 및 대습상속인·후견인이며, 온라인(정부24) 신청은 1·2순위 상속인에 한합니다. 일부 재산은 사망 후 6개월 내 조회가 유리하니 가급적 빨리 신청하세요. 문의: 정부24 콜센터 1588-2188.
- 사망신고·가족관계 서류, 신청인 신분증 준비하기
  caution: 대리 신청 시 상속인 위임장과 인감증명서(또는 본인서명사실확인서)가 추가로 필요합니다.

## 2. 신청·확인
- 금융·국세·지방세·연금 등 재산조회 신청하기
- 조회 결과로 재산·채무 정리하기
  caution: 채무가 재산보다 많으면 한정승인·상속포기 등은 기한 내 법적 절차가 필요합니다.

## 3. 다음 결정
- 상속 처리 방향(승인/한정승인/포기) 전문가 상담 잡기
  done: 다음 상담·처리 일정을 정했다.`,
  },
  {
    flow: {
      id: 'official-260601-seal-certificate',
      slug: 'seal-or-signature-certificate',
      title: '인감증명·본인서명사실확인서 발급 Flow',
      description: '정부24 기준으로 용도에 맞는 인감증명서 또는 본인서명사실확인서 발급을 준비합니다.',
      category: '서류/증명',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '정부24 – 인감증명서 발급 안내',
      source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025',
      warning: '발급 방식(방문/온라인), 용도별 요건은 다를 수 있습니다. 정부24와 주민센터 안내로 확인하세요.',
    },
    text: `## 1. 용도·종류
- 제출처가 요구하는 서류 종류·통수 확인하기
  why: 인감증명서와 본인서명사실확인서는 용도·요구 형식이 다를 수 있습니다.
  how: 제출처 요구사항과 정부24 안내를 대조합니다.
  done: 필요한 서류 종류와 통수를 메모했다.
  link: 정부24 인감증명서 발급 안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025 | official
- 부동산 매도용 등 특정 용도 요건 확인하기
  caution: 부동산 매도용 인감증명서는 온라인 발급 불가이며 시군구청·주민센터를 방문해야 합니다. 매수인의 이름·주민번호·주소를 정확히 기재해야 하며, 유효기간은 발행일로부터 3개월입니다.

## 2. 발급
- 발급 방법(주민센터 방문 또는 정부24 온라인) 확인하고 발급받기
  how: 부동산 매도용·대출용은 방문 발급만 가능합니다. 신분증을 가지고 주소지 무관 시군구청·주민센터를 방문합니다.
  done: 발급 완료와 보관 위치를 기록했다.`,
  },
  {
    flow: {
      id: 'official-260601-childcare-fee-support',
      slug: 'childcare-fee-support-apply',
      title: '보육료·양육수당 지원 신청 Flow',
      description: '복지로·아이사랑 기준으로 어린이집·가정양육에 따른 보육료/양육수당 지원 신청을 준비합니다.',
      category: '육아/지원',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '정부24 – 보육료 및 양육수당 지원신청(변경) 안내',
      source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13510000024',
      warning: '지원 종류·금액·중복 여부는 아이 연령과 보육 형태(어린이집/가정양육)에 따라 다릅니다. 복지로·아이사랑으로 확인하세요.',
    },
    text: `## 1. 대상 확인
- 아이 연령·보육형태에 맞는 지원(보육료/양육수당/부모급여) 확인하기
  why: 어린이집 이용과 가정양육은 받는 지원이 달라 형태를 먼저 정해야 합니다.
  how: 복지로(bokjiro.go.kr) 또는 정부24에서 연령·형태별 지원을 확인합니다.
  done: 우리 아이에게 맞는 지원 항목을 메모했다.
  link: 정부24 보육료·양육수당 신청 안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13510000024 | official
  caution: 보육료와 양육수당은 동시 수급이 안 됩니다. 가정양육수당은 소득에 관계없이 지원되며, 24개월~86개월(취학년도 2월) 미만은 월 10만원입니다. 2026년부터 0~5세 어린이집·유치원 보육료 전액 지원(무상보육)이 확대되었습니다.

## 2. 신청
- 신청 방법(복지로 온라인/주민센터) 확인하고 신청하기
  how: 온라인 신청은 복지로(bokjiro.go.kr)에서, 방문 신청은 주소지 읍·면·동 주민센터에서 합니다. 신청 후 14일 이내(특별한 사정 시 16일) 처리됩니다.
- 보육형태 변경(어린이집↔가정) 시 자격 변경 신고하기
  done: 신청 결과와 지원 시작 시점을 확인했다.`,
  },
  {
    flow: {
      id: 'official-260601-military-exam',
      slug: 'military-exam-prep',
      title: '병역판정검사 준비 Flow',
      description: '병무청 기준으로 병역판정검사 일정, 준비물, 사전 절차를 정리합니다.',
      category: '병역/행정',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      risk_level: 'medium',
      primary_destination: 'memo',
      source_title: '병무청 – 병역판정검사 대상자 안내',
      source_url: 'https://www.mma.go.kr/contents.do?mc=usr0000167',
      warning: '검사 일정·준비물·연기 사유는 개인 상황에 따라 다릅니다. 병무청 공식 안내와 통지서를 우선 확인하세요.',
    },
    text: `## 1. 일정·서류
- 검사 통지서의 일시·장소 확인하기
  why: 정당한 사유 없이 검사에 응하지 않으면 불이익이 있습니다.
  how: 병무청 안내와 통지서에서 일정·준비물을 확인합니다. 2026년도 대상자는 병무청 홈페이지(병무민원→민원신청→병역판정검사)에서 희망 일정을 확인할 수 있습니다.
  done: 검사일과 장소를 캘린더에 등록했다.
  link: 병무청 병역판정검사 대상자 안내 | https://www.mma.go.kr/contents.do?mc=usr0000167 | official
- 신분증 등 준비물·사전 문진 확인하기

## 2. 사전 점검
- 기존 질환·치료 이력 관련 서류 준비 여부 확인하기
  caution: 질환 관련 판정은 제출 서류와 검사 결과에 따라 달라져 임의 판단하지 않습니다. 연기 사유(질병·가족 간호·천재지변 등)가 있으면 지방병무청 민원실 또는 병무청 홈페이지에서 연기 신청을 하고, 사유를 증명하는 서류(병무용진단서 등)를 제출합니다.

## 3. 검사 후
- 판정 결과와 다음 절차(입영 등) 일정 메모하기
  done: 결과와 다음 일정을 적었다.`,
  },
];

export const contentsBatch260601OfficialBundles: FlowBundle[] = specs.map(build);
