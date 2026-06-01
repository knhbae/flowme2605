import { parseTextFlow } from './parser';
import { Flow, FlowBundle } from './types';

/**
 * 2026-06-01 공식출처 기반 배치 (official-source rebuild).
 *
 * 2026-06-01-ux-content-evaluation.md의 핵심 지적("원본 충실도가 가장 약하다,
 * 27/34가 정확한 공식출처 없는 일반론")을 반영해, generic 배치를 폐기하고
 * **모든 Flow가 실재하는 한국 공공서비스 포털에 매핑되는** 배치로 다시 만들었다.
 *
 * 원칙:
 * - 각 Flow는 실재하는 공식 포털(정부24, 홈택스, 국민건강보험, 질병관리청,
 *   고용보험, 한국장학재단, 청약홈, 국민연금공단 등)의 서비스에 매핑한다.
 * - URL은 해당 기관의 실재 도메인(메인/서비스 랜딩)만 사용한다. 확신 없는
 *   깊은 쿼리스트링 deep-link는 만들지 않는다(허위 출처 금지).
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
      primary_destination: 'memo',
      source_title: '한국장학재단 국가장학금 안내',
      source_url: 'https://www.kosaf.go.kr',
      warning: '신청기간, 소득분위 기준, 지원 금액은 학기·연도마다 달라집니다. 한국장학재단 공식 공지를 반드시 확인하세요.',
    },
    text: `## D-14 신청 전 확인
- 이번 학기 신청기간(1차/2차) 확인하기 D-14
  why: 국가장학금은 정해진 신청기간을 지나면 해당 학기 신청이 불가능합니다.
  how: 한국장학재단 공지에서 1차/2차 신청 시작·마감일을 확인합니다.
  done: 신청 시작일과 마감일을 메모와 캘린더에 적었다.
  link: 한국장학재단 | https://www.kosaf.go.kr | official
- 본인·학부모 공동인증서(또는 금융인증서) 준비하기 D-14
- 학자금 지원구간 산정용 가구원 동의 대상 확인하기 D-14
  why: 가구원(부모 등) 정보제공 동의가 늦으면 소득분위 산정이 지연됩니다.

## D-7 신청
- 본인 명의 계좌·학적 정보 확인하기 D-7
- 신청서 작성하고 가구원 동의 요청 보내기 D-7
  done: 신청 완료 화면 또는 접수번호를 저장했다.

## D-Day 마감 점검
- 가구원 동의 완료 여부 확인하기 D-Day
  caution: 본인 신청만 하고 가구원 동의가 빠지면 미완료 처리될 수 있습니다.
- 서류 제출 요청(필요 시) 마감 전 처리하기 D-Day`,
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
      source_title: '청약홈(한국부동산원) 청약 안내',
      source_url: 'https://www.applyhome.co.kr',
      warning: '청약 자격, 가점, 특별공급 요건은 공급 유형과 지역마다 다릅니다. 청약홈 공고문과 공식 안내로 직접 확인하세요.',
    },
    text: `## 1. 통장·기본 자격
- 청약통장 종류·납입 회차·예치금 확인하기
  why: 주택 유형·지역별 예치금 기준을 못 맞추면 청약 자체가 제한됩니다.
  how: 청약홈에서 내 청약통장 가입내역과 납입 인정 회차를 확인합니다.
  done: 납입 회차와 예치금 상태를 메모했다.
  link: 청약홈 | https://www.applyhome.co.kr | official
- 무주택 기간·세대주 여부 확인하기
  caution: 세대 구성원의 주택 소유도 무주택 요건에 영향을 줍니다.

## 2. 가점·유형
- 청약가점(무주택기간·부양가족·통장기간) 계산해 보기
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
      source_title: '주택도시보증공사(HUG) 전세보증금반환보증',
      source_url: 'https://www.khug.or.kr',
      warning: '가입 가능 대상, 보증료, 신청 기한은 물건·계약 조건마다 다릅니다. HUG 공식 안내와 상담으로 확인하세요.',
    },
    text: `## 1. 가입 가능 여부
- 전세 계약 조건이 보증 대상에 맞는지 확인하기
  why: 전세가율, 선순위 채권, 주택 유형에 따라 가입이 거절될 수 있습니다.
  how: HUG 전세보증금반환보증 안내에서 대상·한도 요건을 확인합니다.
  done: 가입 가능/제한 여부와 사유를 메모했다.
  link: 주택도시보증공사 | https://www.khug.or.kr | official
- 보증 신청 가능 기한(잔금·전입 기준) 확인하기
  caution: 신청 가능 기간을 넘기면 가입이 불가능할 수 있습니다.

## 2. 서류 준비
- 전세계약서·전입신고·확정일자·등본 등 서류 모으기
  done: 필요 서류 체크리스트를 완료했다.
- 보증료(요율) 예상액 계산하기

## 3. 신청·관리
- 보증 신청하고 증서 발급 확인하기
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
      source_title: '복지로 복지서비스 안내',
      source_url: 'https://www.bokjiro.go.kr',
      warning: '지원 대상과 금액은 가구 소득·재산·지역에 따라 다릅니다. 복지로와 주민센터에서 직접 확인하세요.',
    },
    text: `## 1. 내 상황 정리
- 가구 구성·생애주기(임신·출산·취업·노년 등) 적어보기
  why: 복지서비스는 상황별로 나뉘어 있어 내 상황을 먼저 정의해야 검색이 됩니다.
  done: 내 가구·생애주기 키워드를 메모했다.

## 2. 검색·확인
- 복지로에서 맞춤형 급여안내(모의계산) 해보기
  how: 복지로의 복지서비스 검색·모의계산으로 받을 수 있는 항목을 추립니다.
  done: 받을 수 있을 것 같은 서비스를 목록으로 적었다.
  link: 복지로 | https://www.bokjiro.go.kr | official
- 각 서비스의 신청 방법(온라인/주민센터) 확인하기

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
      source_title: '소상공인시장진흥공단 안내',
      source_url: 'https://www.semas.or.kr',
      warning: '지원 대상, 한도, 금리, 신청기간은 사업과 연도마다 다릅니다. 공식 공고와 상담으로 확인하세요.',
    },
    text: `## 1. 대상 확인
- 사업자 요건(업력·매출·업종) 확인하기
  why: 정책자금은 업종·업력·매출 기준으로 대상이 제한됩니다.
  how: 소상공인시장진흥공단 공지에서 현재 모집 중인 사업과 요건을 봅니다.
  done: 해당될 것 같은 지원사업을 적었다.
  link: 소상공인시장진흥공단 | https://www.semas.or.kr | official

## 2. 준비
- 사업자등록증·매출 증빙·재무 자료 정리하기
- 교육 이수 요건 있는지 확인하기
  caution: 일부 정책자금은 사전 교육 이수가 조건입니다.

## 3. 신청
- 모집기간·접수 방식 확인하고 신청하기
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
      source_title: '고용보험 실업급여 안내',
      source_url: 'https://www.ei.go.kr',
      warning: '수급 자격, 이직 사유 인정, 금액·기간은 개인 상황에 따라 다릅니다. 고용보험과 고용센터 안내를 우선 확인하세요.',
    },
    text: `## 1. 자격·서류
- 피보험단위기간·이직 사유 등 수급 요건 확인하기
  why: 자발적 이직 등 사유에 따라 수급이 제한될 수 있어 먼저 확인해야 합니다.
  how: 고용보험 실업급여 안내에서 수급 요건을 확인합니다.
  done: 수급 가능성과 확인이 필요한 점을 메모했다.
  link: 고용보험 | https://www.ei.go.kr | official
- 전 직장에 이직확인서 처리 요청하기
  caution: 이직확인서가 처리돼야 수급자격 신청이 진행됩니다.

## 2. 신청
- 워크넷 구직등록하기
- 수급자격 신청자 온라인 교육 이수하기
- 고용센터 방문해 수급자격 신청하기
  done: 수급자격 인정 여부를 확인했다.

## 3. 수급 중
- 실업인정일·구직활동 요건 캘린더에 표시하기
  caution: 정해진 구직활동을 못 하면 해당 회차 급여가 지급되지 않을 수 있습니다.`,
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
      source_title: '고용24(국민취업지원제도) 안내',
      source_url: 'https://www.work24.go.kr',
      warning: '지원 유형(Ⅰ·Ⅱ), 소득·재산 요건, 수당은 개인 상황에 따라 다릅니다. 고용24와 고용센터에서 확인하세요.',
    },
    text: `## 1. 대상 확인
- 소득·재산·취업경험 기준으로 유형(Ⅰ/Ⅱ) 확인하기
  why: 유형에 따라 구직촉진수당 지급 여부가 달라집니다.
  how: 고용24 국민취업지원제도 안내에서 대상 요건을 확인합니다.
  done: 해당될 것 같은 유형을 메모했다.
  link: 고용24 | https://www.work24.go.kr | official

## 2. 신청
- 신청서·소득재산 증빙 준비하기
- 온라인 또는 고용센터에서 신청하기
  done: 신청 접수 상태를 저장했다.

## 3. 참여
- 상담 후 취업활동계획(IAP) 수립 일정 잡기
  caution: 취업활동계획과 정해진 활동을 이행해야 수당이 유지됩니다.`,
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
      source_title: '국민연금공단 내 곁에 국민연금',
      source_url: 'https://www.nps.or.kr',
      warning: '예상연금액은 가정에 따른 추정치이며 실제 수령액과 다를 수 있습니다. 국민연금공단 안내로 확인하세요.',
    },
    text: `## 1. 현황 확인
- 가입내역(가입기간·납부 이력) 확인하기
  why: 가입기간이 수급 요건과 연금액을 좌우합니다.
  how: 국민연금공단에서 가입내역·예상연금 조회를 합니다.
  done: 총 가입기간과 예상연금액을 메모했다.
  link: 국민연금공단 | https://www.nps.or.kr | official
- 납부 예외·미납 기간 있는지 확인하기

## 2. 보완 검토
- 추후납부(추납)·임의가입 대상인지 확인하기
  caution: 추납·임의가입은 본인 상황에 따라 유불리가 달라 상담이 필요합니다.

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
      source_title: '국민건강보험공단 피부양자 안내',
      source_url: 'https://www.nhis.or.kr',
      warning: '피부양자 소득·재산·부양 요건은 기준이 바뀔 수 있습니다. 국민건강보험공단 안내로 확인하세요.',
    },
    text: `## 1. 자격 확인
- 대상자의 소득·재산·부양 요건 확인하기
  why: 소득·재산 기준 초과 시 피부양자에서 제외되어 지역가입자가 됩니다.
  how: 국민건강보험공단 피부양자 자격 안내를 확인합니다.
  done: 등록 가능 여부와 확인할 점을 메모했다.
  link: 국민건강보험공단 | https://www.nhis.or.kr | official

## 2. 서류·신청
- 가족관계 증빙 등 필요 서류 준비하기
- 직장(사업장) 또는 공단을 통해 등록 신청하기
  done: 등록 처리 결과를 확인했다.
  caution: 자격 변동(취업·소득 발생) 시 다시 신고가 필요합니다.`,
  },

  // ───────────────────────── 건강 / 예방접종 (민감) ─────────────────────────
  {
    flow: {
      id: 'official-260601-infant-health-checkup',
      slug: 'infant-health-checkup-schedule',
      title: '영유아 건강검진 일정 Flow',
      description: '국민건강보험 영유아 건강검진 시기에 맞춰 검진·구강검진 방문을 놓치지 않게 준비합니다.',
      category: '육아/검진',
      structure_type: 'phase',
      anchor_type: 'baby_age_month',
      status: 'published',
      risk_level: 'medical_sensitive',
      primary_destination: 'calendar',
      source_title: '국민건강보험 영유아 건강검진 안내',
      source_url: 'https://www.nhis.or.kr',
      warning: '검진 시기·항목·발달평가 결과는 의료진 안내를 우선하세요. 이 Flow는 방문 일정을 챙기는 준비용입니다.',
    },
    text: `## 검진 시기 확인
- 우리 아이 검진 차수와 가능 기간 확인하기
  why: 영유아 건강검진은 차수별로 검진 가능 기간이 정해져 있습니다.
  how: 국민건강보험 영유아 건강검진 안내에서 월령별 검진 시기를 확인합니다.
  done: 다음 검진 차수와 기간을 캘린더에 표시했다.
  link: 국민건강보험 | https://www.nhis.or.kr | official
- 구강검진 차수도 함께 확인하기

## 방문 준비
- 검진 가능 병·의원 찾고 예약하기
- 사전 문진표(발달 등) 미리 작성하기
  caution: 발달 관련 우려가 있으면 검진 결과를 의료진과 상담합니다.

## 검진 후
- 결과와 권고사항 기록하고 다음 차수 알림 걸기
  done: 결과와 다음 검진 예정일을 메모했다.`,
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
      source_title: '질병관리청 예방접종도우미',
      source_url: 'https://nip.kdca.go.kr',
      warning: '접종 권장 대상, 무료 지원, 금기사항은 개인 건강상태에 따라 다릅니다. 질병관리청 안내와 의료진 상담을 우선하세요.',
    },
    text: `## 1. 대상 확인
- 연령·기저질환별 권장 접종 항목 확인하기
  why: 폐렴구균·대상포진·인플루엔자 등은 연령·질환별로 권장과 지원이 다릅니다.
  how: 질병관리청 예방접종도우미에서 권장 일정과 국가지원 대상을 확인합니다.
  done: 나에게 권장되는 접종과 지원 여부를 메모했다.
  link: 예방접종도우미 | https://nip.kdca.go.kr | official
- 과거 접종 이력·금기사항 정리하기
  caution: 금기·주의 대상은 접종 전 의료진과 상담합니다.

## 2. 예약·접종
- 지정 의료기관 확인하고 예약하기
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
      source_title: '정부24 국민비서 안내',
      source_url: 'https://www.gov.kr',
      warning: '제공 알림 항목과 채널(앱/문자/카카오 등)은 변경될 수 있습니다. 국민비서 공식 안내로 확인하세요.',
    },
    text: `## 1. 항목 선택
- 받고 싶은 알림(건강검진·예방접종·교통·세금 등) 고르기
  why: 챙기기 어려운 행정 기한을 알림으로 받으면 과태료·미수령을 줄입니다.
  how: 정부24 국민비서에서 알림 가능한 항목을 확인합니다.
  done: 신청할 알림 항목을 정했다.
  link: 정부24 국민비서 | https://www.gov.kr | official

## 2. 신청
- 알림 받을 채널 정하고 신청하기
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
      source_title: '외교부 여권안내',
      source_url: 'https://www.passport.go.kr',
      warning: '사진 규격, 미성년자·대리 신청, 수수료, 처리 기간은 공식 기준을 따릅니다. 외교부 여권안내로 확인하세요.',
    },
    text: `## 1. 사진·서류
- 여권 사진 규격 확인하고 촬영하기
  why: 규격에 안 맞는 사진은 접수 단계에서 반려되는 가장 흔한 사유입니다.
  how: 외교부 여권안내의 사진 규격을 확인하고 촬영합니다.
  done: 규격에 맞는 사진을 준비했다.
  link: 외교부 여권안내 | https://www.passport.go.kr | official
- 신분증 등 필요 서류 확인하기
  caution: 미성년자·대리 신청은 추가 서류가 필요합니다.

## 2. 신청·수령
- 가까운 여권 접수처 확인하고 방문 신청하기
- 수수료·처리 기간·수령 방법 확인하기
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
      source_title: '외교부 해외안전여행',
      source_url: 'https://www.0404.go.kr',
      warning: '여행경보 단계와 입국 요건은 수시로 바뀝니다. 외교부 해외안전여행 공지를 출발 직전 다시 확인하세요.',
    },
    text: `## 1. 위험 정보
- 방문국 여행경보 단계 확인하기
  why: 경보 단계에 따라 여행 자제·철수 권고가 달라집니다.
  how: 외교부 해외안전여행에서 국가별 여행경보와 안전공지를 봅니다.
  done: 방문국 경보 단계와 주의사항을 메모했다.
  link: 외교부 해외안전여행 | https://www.0404.go.kr | official

## 2. 비상 대비
- 현지 대사관·영사관 연락처와 영사콜센터 저장하기
- 동행등록 등 안전 서비스 신청 검토하기
- 여권 사본·비상연락·보험증서 따로 보관하기
  done: 비상 정보 메모를 만들었다.
  caution: 사건·사고 시 영사조력 범위에는 한계가 있으니 여행자보험을 함께 준비합니다.`,
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
      source_title: '관세청 여행자 휴대품 안내',
      source_url: 'https://www.customs.go.kr',
      warning: '면세범위, 신고 대상, 반입금지·제한 품목은 변경될 수 있습니다. 관세청 공식 안내를 확인하세요.',
    },
    text: `## 1. 면세범위 확인
- 휴대품 면세범위(주류·담배·향수·총액 한도) 확인하기
  why: 한도를 넘기면 자진신고해야 하며, 미신고 적발 시 가산세가 붙습니다.
  how: 관세청 여행자 휴대품 안내에서 현재 면세 한도를 확인합니다.
  done: 면세 한도와 내 구매 예정 항목을 비교 메모했다.
  link: 관세청 | https://www.customs.go.kr | official

## 2. 신고·반입
- 면세범위 초과 시 자진신고 방법 확인하기
  caution: 자진신고하면 일정 감면이 있지만, 미신고 적발은 불이익이 큽니다.
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
      source_title: '자동차민원 대국민포털',
      source_url: 'https://www.ecar.go.kr',
      warning: '이전등록 기한, 취득세, 필요 서류는 거래 형태·지역마다 다릅니다. 자동차민원 포털과 관할 기관으로 확인하세요.',
    },
    text: `## 1. 서류·기한
- 이전등록 기한(매수일 기준) 확인하기
  why: 기한을 넘기면 과태료가 부과될 수 있습니다.
  how: 자동차민원 대국민포털에서 이전등록 절차와 기한을 확인합니다.
  done: 이전등록 마감일을 캘린더에 표시했다.
  link: 자동차민원 대국민포털 | https://www.ecar.go.kr | official
- 양도증명·자동차등록증·신분증 등 서류 준비하기

## 2. 보험·세금
- 책임보험 가입(명의 기준) 확인하기
  caution: 보험 공백 상태 운행은 위법이며 사고 시 위험이 큽니다.
- 취득세 등 비용 확인하기

## 3. 등록
- 이전등록 신청하고 새 등록증 확인하기
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
      source_title: '무공해차 통합누리집',
      source_url: 'https://www.ev.or.kr',
      warning: '보조금 금액, 잔여물량, 지원 조건은 연도·지자체마다 다르고 조기 소진될 수 있습니다. 공식 누리집으로 확인하세요.',
    },
    text: `## 1. 대상·물량
- 구매 예정 차종의 국고·지자체 보조금 확인하기
  why: 보조금은 지자체별로 다르고 물량이 소진되면 받을 수 없습니다.
  how: 무공해차 통합누리집에서 차종별 보조금과 지자체 잔여물량을 확인합니다.
  done: 차종 보조금과 거주지 잔여물량을 메모했다.
  link: 무공해차 통합누리집 | https://www.ev.or.kr | official
- 거주지 신청 자격·우선순위 확인하기

## 2. 신청
- 출고·계약 일정과 신청 절차(대리신청 등) 확인하기
  caution: 계약·출고·신청 순서와 기한을 어기면 지원에서 제외될 수 있습니다.
- 충전 환경(완속/급속) 미리 점검하기`,
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
      source_title: '위택스(지방세 납부)',
      source_url: 'https://www.wetax.go.kr',
      warning: '부과·납부 기한과 감면 제도는 지자체·연도마다 다릅니다. 위택스와 관할 지자체 안내로 확인하세요.',
    },
    text: `## 1. 확인
- 부과된 지방세 항목·금액·납부기한 확인하기
  why: 납부기한을 넘기면 가산금이 붙습니다.
  how: 위택스에서 내 지방세 부과·납부 내역을 확인합니다.
  done: 항목별 금액과 기한을 메모·캘린더에 적었다.
  link: 위택스 | https://www.wetax.go.kr | official

## 2. 절세 검토
- 자동차세 연납 할인 등 절세 제도 확인하기
  caution: 연납 신청은 기간이 정해져 있어 시점을 놓치면 적용이 안 됩니다.

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
      source_title: '국세청 홈택스 / 정부24 미환급금 조회',
      source_url: 'https://www.gov.kr',
      warning: '환급 대상·금액은 개인 납세 이력에 따라 다릅니다. 홈택스·정부24 공식 조회로 확인하세요.',
    },
    text: `## 1. 조회
- 홈택스에서 국세 환급금 조회하기
  why: 신고 정정·과오납 등으로 받지 못한 환급금이 남아 있을 수 있습니다.
  how: 홈택스 또는 정부24 미환급금 조회 서비스로 확인합니다.
  done: 환급 대상 금액을 메모했다.
  link: 정부24 | https://www.gov.kr | official
- 지방세 환급금·미수령금도 확인하기

## 2. 신청·수령
- 환급 계좌 정보 등록하고 신청하기
  done: 신청 상태와 예상 입금 시점을 확인했다.
  caution: 환급 사칭 문자·링크에 주의하고 공식 사이트로만 접속합니다.`,
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
      primary_destination: 'memo',
      source_title: '정부24 / 대법원 전자가족관계등록시스템',
      source_url: 'https://www.gov.kr',
      warning: '신고기한, 필요 서류, 동시 신청 서비스는 변경될 수 있습니다. 정부24와 전자가족관계등록 안내로 확인하세요.',
    },
    text: `## D+0 서류 준비
- 출생증명서 등 신고 서류 확인하기 D+0
  why: 출생신고는 신고기한이 있어 서류를 일찍 준비하는 게 좋습니다.
  how: 정부24/전자가족관계등록에서 출생신고 절차와 서류를 확인합니다.
  done: 필요 서류를 모았다.
  link: 정부24 | https://www.gov.kr | official
- 아이 이름·등록기준지 정하기

## D+7 신고·연계
- 출생신고 접수하기 D+7
  done: 출생신고 접수를 확인했다.
- 행복출산 원스톱 등 함께 신청 가능한 서비스 확인하기 D+7
  caution: 양육·출산 지원은 거주지·가구 조건에 따라 달라 공식 확인이 필요합니다.

## D+25 기한 점검
- 신고기한 내 완료 여부 최종 확인하기 D+25
  caution: 신고기한을 넘기면 과태료가 부과될 수 있습니다.`,
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
      source_title: '정부24 안심상속 원스톱서비스',
      source_url: 'https://www.gov.kr',
      warning: '신청 자격(상속인 등), 기한, 상속 처리(승인·포기)는 법적 판단이 필요합니다. 정부24 안내와 전문가 상담을 우선하세요.',
    },
    text: `## 1. 자격·서류
- 신청 자격(상속인 등)과 신청 기한 확인하기
  why: 상속 재산·채무 파악이 늦으면 한정승인·포기 결정 시점을 놓칠 수 있습니다.
  how: 정부24 안심상속 원스톱서비스 안내에서 자격·서류·기한을 확인합니다.
  done: 신청 자격과 기한을 메모했다.
  link: 정부24 안심상속 | https://www.gov.kr | official
- 사망신고·가족관계 서류 준비하기

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
      source_title: '정부24 인감/본인서명사실확인 안내',
      source_url: 'https://www.gov.kr',
      warning: '발급 방식(방문/온라인), 용도별 요건은 다를 수 있습니다. 정부24와 주민센터 안내로 확인하세요.',
    },
    text: `## 1. 용도·종류
- 제출처가 요구하는 서류 종류·통수 확인하기
  why: 인감증명서와 본인서명사실확인서는 용도·요구 형식이 다를 수 있습니다.
  how: 제출처 요구사항과 정부24 안내를 대조합니다.
  done: 필요한 서류 종류와 통수를 메모했다.
  link: 정부24 | https://www.gov.kr | official
- 부동산 매도용 등 특정 용도 요건 확인하기
  caution: 부동산 매도용 인감증명은 별도 요건이 있습니다.

## 2. 발급
- 발급 방법(주민센터 방문 등) 확인하고 발급받기
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
      source_title: '복지로 / 임신육아종합포털 아이사랑',
      source_url: 'https://www.bokjiro.go.kr',
      warning: '지원 종류·금액·중복 여부는 아이 연령과 보육 형태(어린이집/가정양육)에 따라 다릅니다. 복지로·아이사랑으로 확인하세요.',
    },
    text: `## 1. 대상 확인
- 아이 연령·보육형태에 맞는 지원(보육료/양육수당 등) 확인하기
  why: 어린이집 이용과 가정양육은 받는 지원이 달라 형태를 먼저 정해야 합니다.
  how: 복지로/아이사랑에서 연령·형태별 지원을 확인합니다.
  done: 우리 아이에게 맞는 지원 항목을 메모했다.
  link: 복지로 | https://www.bokjiro.go.kr | official
  caution: 보육료와 양육수당은 동시 수급이 안 되는 등 중복 제한이 있습니다.

## 2. 신청
- 신청 방법(복지로 온라인/주민센터) 확인하고 신청하기
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
      source_title: '병무청 안내',
      source_url: 'https://www.mma.go.kr',
      warning: '검사 일정·준비물·연기 사유는 개인 상황에 따라 다릅니다. 병무청 공식 안내와 통지서를 우선 확인하세요.',
    },
    text: `## 1. 일정·서류
- 검사 통지서의 일시·장소 확인하기
  why: 정당한 사유 없이 검사에 응하지 않으면 불이익이 있습니다.
  how: 병무청 안내와 통지서에서 일정·준비물을 확인합니다.
  done: 검사일과 장소를 캘린더에 등록했다.
  link: 병무청 | https://www.mma.go.kr | official
- 신분증 등 준비물·사전 문진 확인하기

## 2. 사전 점검
- 기존 질환·치료 이력 관련 서류 준비 여부 확인하기
  caution: 질환 관련 판정은 제출 서류와 검사 결과에 따라 달라져 임의 판단하지 않습니다.

## 3. 검사 후
- 판정 결과와 다음 절차(입영 등) 일정 메모하기
  done: 결과와 다음 일정을 적었다.`,
  },
];

export const contentsBatch260601OfficialBundles: FlowBundle[] = specs.map(build);
