import type { FlowBundle, FlowItem, FlowItemDetail } from './types';
import type { SourceBackedMyFlowMap } from './source-backed-my-flow';

const now = '2026-06-25T00:00:00.000Z';

const postalAddressSourceUrl = 'https://service.epost.go.kr/front.RetrieveAddressMoveInfo.postal';
const smishingSourceUrl = 'https://www.kisa.or.kr/1020601';
const yearEndTaxSourceUrl = 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=6489&nttSn=1330438';
const airconFilterSourceUrl = 'https://www.samsungsvc.co.kr/solution/28524';
const picnicFoodSourceUrl =
  'https://www.mfds.go.kr/brd/m_827/view.do?company_cd=&company_nm=&itm_seq_1=0&multi_itm_seq=0&page=2&seq=3608&srchFr=&srchTo=&srchTp=&srchWord=';

function lines(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function item(
  flowId: string,
  sectionId: string,
  id: string,
  title: string,
  description: string,
  order: number,
  options: Partial<FlowItem> = {},
): FlowItem {
  return {
    id,
    flow_id: flowId,
    section_id: sectionId,
    title,
    description,
    type: options.type ?? 'todo',
    order,
    ...options,
  };
}

function detail(
  itemId: string,
  why: string,
  how: string[],
  completion: string,
  sourceUrl: string,
  caution?: string,
): FlowItemDetail {
  return {
    item_id: itemId,
    why,
    how: lines(how),
    completion_criteria: completion,
    ...(caution ? { caution } : {}),
    links: [{ label: '원문 열기', url: sourceUrl, type: 'official' }],
  };
}

export const additionalSourceBackedMyFlowMaps: SourceBackedMyFlowMap[] = [
  {
    id: 'postal-address-transfer',
    userLabel: '우편물 이전',
    title: '주거이전 우편물 전송 일정',
    version: '2026-06-25.1',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary:
      '전입신고 뒤 우편물이 이전 주소로 가는 일을 줄이기 위해 인터넷우체국의 주거이전 우편물 전송서비스 확인, 결제, 시작일 메모를 한 흐름으로 저장합니다.',
    sourceTitle: '인터넷우체국 주거이전 우편물 전송서비스',
    sourceUrl: postalAddressSourceUrl,
    artifacts: ['전입신고 다음날 확인 일정', '결제/신청 체크', '서비스 시작일 메모'],
    setupInput: {
      label: '전입신고일',
      hint: '전입신고 다음날부터 우체국 조회/결제 여부를 확인하는 일정으로 저장합니다.',
      defaultValue: '2026-07-01',
    },
    flowSlugs: ['source-backed-postal-address-transfer'],
  },
  {
    id: 'smishing-response',
    userLabel: '스미싱 대응',
    title: '스미싱·큐싱 의심 문자 대응',
    version: '2026-06-25.1',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary:
      '의심 문자를 받았을 때 링크를 다시 누르지 않고, KISA 118 또는 보호나라 채널/통합신고센터로 상담·신고하는 최소 대응 체크리스트입니다.',
    sourceTitle: 'KISA 스미싱·큐싱 공격 대응',
    sourceUrl: smishingSourceUrl,
    artifacts: ['상담/신고 체크', '의심 문자 메모', '원문 링크'],
    flowSlugs: ['source-backed-smishing-response'],
  },
  {
    id: 'year-end-tax-submit',
    userLabel: '연말정산 제출',
    title: '연말정산 간소화자료 온라인 제출',
    version: '2026-06-25.1',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary:
      '회사 제출 마감일 전에 홈택스에서 간소화자료를 확인하고, 근무월 선택과 간편제출까지 진행했는지만 저장합니다. 세액 판단은 FlowMe가 하지 않습니다.',
    sourceTitle: '국세청 편리한 연말정산 간편제출 이용방법',
    sourceUrl: yearEndTaxSourceUrl,
    artifacts: ['마감 전 확인 일정', '간편제출 체크', '근무월/근무처 메모'],
    setupInput: {
      label: '회사 제출 마감일',
      hint: '회사에서 안내한 제출 마감일을 기준으로 D-3, D-1, D-Day 확인 일정을 만듭니다.',
      defaultValue: '2026-01-25',
    },
    flowSlugs: ['source-backed-year-end-tax-submit'],
  },
  {
    id: 'aircon-filter-cleaning',
    userLabel: '에어컨 필터',
    title: '천장형 에어컨 1way 필터 청소 루틴',
    version: '2026-06-25.1',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary:
      '삼성전자서비스의 필터 분리, 청소, 건조, 장착, 필터 리셋 순서를 한 번의 반복 일정으로 저장합니다.',
    sourceTitle: '삼성전자서비스 천장형 에어컨 1way 필터 청소 및 관리 방법',
    sourceUrl: airconFilterSourceUrl,
    artifacts: ['2주 반복 일정', '청소 체크', '필터 리셋 메모'],
    setupInput: {
      label: '다음 청소일',
      hint: '다음 청소일 1개만 넣으면 2주 반복 일정으로 저장합니다. 실제 주기는 사용 환경에 맞게 바꿀 수 있습니다.',
      defaultValue: '2026-07-06',
    },
    flowSlugs: ['source-backed-aircon-filter-cleaning'],
  },
  {
    id: 'picnic-food-safety',
    userLabel: '나들이 도시락',
    title: '나들이 도시락 식중독 예방 체크',
    version: '2026-06-25.1',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary:
      '나들이 전날 장보기부터 당일 조리, 운반, 섭취 전 확인까지 식약처 카드뉴스의 실행 단서를 간단한 날짜형 체크로 저장합니다.',
    sourceTitle: '식품의약품안전처 나들이철 위생적이고 안전하게',
    sourceUrl: picnicFoodSourceUrl,
    artifacts: ['나들이 전날/당일 일정', '도시락 준비 체크', '보관·섭취 메모'],
    setupInput: {
      label: '나들이일',
      hint: '나들이일을 기준으로 전날 장보기와 당일 조리/운반/섭취 체크를 배치합니다.',
      defaultValue: '2026-07-12',
    },
    flowSlugs: ['source-backed-picnic-food-safety'],
  },
];

export const additionalSourceBackedMyFlowBundles: FlowBundle[] = [
  {
    flow: {
      id: 'flow-source-backed-postal-address-transfer',
      slug: 'source-backed-postal-address-transfer',
      title: '주거이전 우편물 전송 확인',
      description: '전입신고 뒤 우편물 전송서비스 조회, 결제, 시작일을 확인하는 이사 후 행정 Flow입니다.',
      category: '생활 행정',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'start_date',
      status: 'published',
      source_title: '인터넷우체국 주거이전 우편물 전송서비스',
      source_url: postalAddressSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-25',
      primary_destination: 'hybrid',
      setup_anchor_label: '전입신고일',
      setup_anchor_hint: '전입신고일을 기준으로 다음날 조회와 7일 이내 결제 확인을 배치합니다.',
      risk_level: 'low',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:postal-address-transfer', 'timeline', 'official'],
    },
    sections: [{ id: 'postal-after-move', flow_id: 'flow-source-backed-postal-address-transfer', title: '전입신고 후 확인', order: 0 }],
    items: [
      item(
        'flow-source-backed-postal-address-transfer',
        'postal-after-move',
        'postal-next-day-check',
        '우편물 전송 신청·결제 조회',
        '전입신고 다음날 우체국에서 접수 또는 결제 대상인지 확인합니다.',
        0,
        { type: 'calendar', day_offset: 1, duration_days: 1, source_type: 'official' },
      ),
      item(
        'flow-source-backed-postal-address-transfer',
        'postal-after-move',
        'postal-payment-deadline',
        '수수료 결제 필요 여부 확인',
        '유료 대상이면 안내문자 접수번호와 결제 기한을 메모합니다.',
        1,
        { type: 'calendar', day_offset: 3, duration_days: 1, source_type: 'official' },
      ),
      item(
        'flow-source-backed-postal-address-transfer',
        'postal-after-move',
        'postal-service-start',
        '서비스 시작일과 종료일 메모',
        '서비스 시작일, 기간, 연장 필요 여부만 짧게 남깁니다.',
        2,
        { type: 'calendar', day_offset: 7, duration_days: 1, source_type: 'official' },
      ),
    ],
    itemDetails: [
      detail('postal-next-day-check', '전입신고 시 신청한 우편물 전송서비스는 익일부터 우체국 조회/결제 확인이 필요할 수 있습니다.', [
        '인터넷우체국 주거이전서비스를 열기',
        '전입신고 때 신청한 무료/유료 전송서비스가 있는지 조회',
        '미신청이면 개별 신청 가능 여부와 본인인증 조건 확인',
      ], '신청 또는 조회 결과와 다음 해야 할 일이 메모에 남아 있습니다.', postalAddressSourceUrl),
      detail('postal-payment-deadline', '타 권역 이사 등 유료 대상이면 결제하지 않을 경우 서비스가 자동 취소될 수 있습니다.', [
        '안내문자 접수번호가 있으면 결제 화면에서 조회',
        '수수료와 결제 기한을 메모',
        '결제하지 않을 항목은 취소 또는 미진행으로 표시',
      ], '결제 필요 여부, 접수번호, 결제 상태가 메모에 남아 있습니다.', postalAddressSourceUrl),
      detail('postal-service-start', '우편물이 언제부터 새 주소로 오는지 알아야 빠진 우편을 별도로 챙길 수 있습니다.', [
        '서비스 시작일과 종료 예정일 확인',
        '연장이 필요하면 종료 3일 전 다시 볼 메모 남기기',
        '법원 송달 등 별도 신고가 필요한 우편은 따로 처리 메모',
      ], '서비스 시작/종료일과 연장 필요 여부가 정리되어 있습니다.', postalAddressSourceUrl),
    ],
  },
  {
    flow: {
      id: 'flow-source-backed-smishing-response',
      slug: 'source-backed-smishing-response',
      title: '스미싱·큐싱 의심 문자 대응',
      description: '의심 문자를 받았을 때 상담/신고 경로와 남길 정보를 확인하는 보안 대응 체크리스트입니다.',
      category: '디지털 안전',
      structure_type: 'checklist',
      content_type: 'default',
      anchor_type: 'none',
      status: 'published',
      source_title: 'KISA 스미싱·큐싱 공격 대응',
      source_url: smishingSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-25',
      primary_destination: 'internal_check',
      risk_level: 'medium',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:smishing-response', 'checklist', 'official'],
    },
    sections: [{ id: 'smishing-report', flow_id: 'flow-source-backed-smishing-response', title: '상담과 신고', order: 0 }],
    items: [
      item('flow-source-backed-smishing-response', 'smishing-report', 'smishing-stop-click', '의심 링크 다시 누르지 않기', '문자 내용, 발신자, 링크를 메모하되 링크 실행은 피합니다.', 0, { source_type: 'official', risk_level: 'medium' }),
      item('flow-source-backed-smishing-response', 'smishing-report', 'smishing-118-channel', '118 또는 보호나라 채널 확인', 'KISA 안내에 있는 상담/확인 경로 중 하나를 사용합니다.', 1, { source_type: 'official', risk_level: 'medium' }),
      item('flow-source-backed-smishing-response', 'smishing-report', 'smishing-report-center', '통합신고센터 신고 여부 메모', '스미싱 문자 신고를 진행했는지와 접수 내용을 남깁니다.', 2, { source_type: 'official', risk_level: 'medium' }),
    ],
    itemDetails: [
      detail('smishing-stop-click', '피해 확산을 막기 위해 의심 문자 내용을 보존하되 링크를 다시 실행하지 않는 것이 먼저입니다.', [
        '문자 화면, 발신 번호, 받은 시각을 메모',
        'URL이나 QR을 다시 열지 않기',
        '이미 개인정보를 입력했는지 여부만 짧게 표시',
      ], '의심 문자 정보와 링크 실행 여부가 기록되어 있습니다.', smishingSourceUrl, 'FlowMe는 악성 여부를 판정하지 않습니다. KISA/공식 신고 경로 확인을 우선합니다.'),
      detail('smishing-118-channel', 'KISA 원문은 국번없이 118과 카카오톡 보호나라 채널을 상담/신고 경로로 안내합니다.', [
        '국번없이 118 상담 가능 여부 확인',
        '카카오톡 보호나라 채널의 스미싱/큐싱 메뉴 확인',
        '상담한 경우 안내받은 다음 행동만 메모',
      ], '상담 경로와 안내받은 다음 행동이 남아 있습니다.', smishingSourceUrl, '전화번호, 인증번호, 계좌정보는 FlowMe 메모에 저장하지 않습니다.'),
      detail('smishing-report-center', '공식 신고가 필요한 경우 통합신고대응센터의 스미싱 문자 신고 경로를 사용할 수 있습니다.', [
        '통합신고대응센터 링크 열기',
        '스미싱 문자 신고 진행 여부 표시',
        '접수번호가 있다면 접수번호만 메모',
      ], '신고 진행 여부 또는 접수번호가 남아 있습니다.', smishingSourceUrl),
    ],
  },
  {
    flow: {
      id: 'flow-source-backed-year-end-tax-submit',
      slug: 'source-backed-year-end-tax-submit',
      title: '연말정산 간소화자료 온라인 제출',
      description: '홈택스에서 간소화자료를 확인하고 회사에 온라인 제출했는지만 관리하는 제출 Flow입니다.',
      category: '세금 행정',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'end_date',
      status: 'published',
      source_title: '국세청 편리한 연말정산 간편제출 이용방법',
      source_url: yearEndTaxSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-25',
      primary_destination: 'hybrid',
      setup_anchor_label: '회사 제출 마감일',
      setup_anchor_hint: '회사 제출 마감일을 기준으로 자료 확인과 제출 일정을 만듭니다.',
      risk_level: 'financial_sensitive',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:year-end-tax-submit', 'timeline', 'official'],
      warning: 'FlowMe는 공제 가능 여부나 세액을 판단하지 않습니다. 회사/국세청 안내를 기준으로 제출 상태만 기록합니다.',
    },
    sections: [{ id: 'year-end-submit', flow_id: 'flow-source-backed-year-end-tax-submit', title: '간소화자료 제출', order: 0 }],
    items: [
      item('flow-source-backed-year-end-tax-submit', 'year-end-submit', 'tax-login-months', '간소화자료 조회와 근무월 확인', '홈택스 로그인 후 근무기간에 해당하는 월을 확인합니다.', 0, { type: 'calendar', day_offset: -3, duration_days: 1, source_type: 'official', risk_level: 'financial_sensitive' }),
      item('flow-source-backed-year-end-tax-submit', 'year-end-submit', 'tax-submit-employer', '제출할 근무처 선택 후 간편제출', '회사 제출처를 고르고 간편제출을 진행합니다.', 1, { type: 'calendar', day_offset: -1, duration_days: 1, source_type: 'official', risk_level: 'financial_sensitive' }),
      item('flow-source-backed-year-end-tax-submit', 'year-end-submit', 'tax-submit-confirm', '제출 완료 여부와 회사 확인 메모', '제출 완료 화면 또는 회사 확인 요청만 짧게 남깁니다.', 2, { type: 'calendar', day_offset: 0, duration_days: 1, source_type: 'official', risk_level: 'financial_sensitive' }),
    ],
    itemDetails: [
      detail('tax-login-months', '신규 입사자나 중도 퇴사자는 근무기간에 해당하는 월 선택이 필요할 수 있습니다.', [
        '홈택스 로그인',
        '연말정산 간소화 자료 조회 화면 열기',
        '근무한 월만 선택했는지 확인',
      ], '근무월 확인 여부가 메모에 남아 있습니다.', yearEndTaxSourceUrl, '공제 가능 여부는 FlowMe가 판단하지 않습니다.'),
      detail('tax-submit-employer', '국세청 원문은 간소화자료 제출 버튼, 근무처 선택, 간편제출 흐름을 안내합니다.', [
        '간소화자료 제출 버튼 선택',
        '제출할 근무처 선택',
        '간편제출 버튼으로 제출 진행',
      ], '근무처와 제출 진행 여부가 기록되어 있습니다.', yearEndTaxSourceUrl),
      detail('tax-submit-confirm', '제출 후 회사가 요청한 확인이나 보완 사항이 있을 수 있어 상태만 남깁니다.', [
        '제출 완료 화면 또는 회사 안내 확인',
        '보완 요청이 있으면 요청 내용만 짧게 메모',
        '민감한 주민번호, 인증정보, 세부 금액은 저장하지 않기',
      ], '제출 완료 또는 보완 요청 여부가 남아 있습니다.', yearEndTaxSourceUrl, '세부 세액과 민감정보는 외부 공식 서비스에서 확인합니다.'),
    ],
  },
  {
    flow: {
      id: 'flow-source-backed-aircon-filter-cleaning',
      slug: 'source-backed-aircon-filter-cleaning',
      title: '천장형 에어컨 1way 필터 청소',
      description: '필터 분리, 먼지 제거, 건조, 장착, 리셋을 한 번의 반복 일정으로 관리합니다.',
      category: '집 관리',
      structure_type: 'routine',
      content_type: 'default',
      anchor_type: 'start_date',
      status: 'published',
      source_title: '삼성전자서비스 천장형 에어컨 1way 필터 청소 및 관리 방법',
      source_url: airconFilterSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-25',
      primary_destination: 'calendar',
      setup_anchor_label: '다음 청소일',
      setup_anchor_hint: '다음 청소일을 기준으로 2주 반복 일정을 만듭니다.',
      risk_level: 'low',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:aircon-filter-cleaning', 'routine', 'official'],
    },
    sections: [{ id: 'aircon-cleaning', flow_id: 'flow-source-backed-aircon-filter-cleaning', title: '반복 청소', order: 0 }],
    items: [
      item('flow-source-backed-aircon-filter-cleaning', 'aircon-cleaning', 'aircon-clean-repeat', '필터 청소하고 리셋하기', '2주마다 또는 청소 알림이 켜졌을 때 필터 청소와 리셋을 처리합니다.', 0, {
        type: 'calendar',
        duration_days: 1,
        repeat_rule: 'FREQ=WEEKLY;INTERVAL=2',
        source_type: 'official',
      }),
    ],
    itemDetails: [
      detail('aircon-clean-repeat', '원문은 약 2주에 한 번 또는 필터 청소 알림 시 청소를 안내합니다.', [
        '운전을 정지하고 보조전원스위치 끄기',
        '그릴을 손으로 잡고 열어 필터 분리',
        '진공청소기나 부드러운 솔로 먼지 제거',
        '물청소한 경우 그늘에서 완전히 건조',
        '필터를 걸림턱에 맞춰 장착하고 그릴 닫기',
        '필터 리셋 또는 알림 해제 실행',
      ], '청소, 건조, 장착, 리셋까지 완료되어 다음 반복일이 남아 있습니다.', airconFilterSourceUrl, '모델별 방법이 다를 수 있으므로 사용설명서와 원문을 우선합니다.'),
    ],
  },
  {
    flow: {
      id: 'flow-source-backed-picnic-food-safety',
      slug: 'source-backed-picnic-food-safety',
      title: '나들이 도시락 식중독 예방',
      description: '나들이 전날 장보기와 당일 조리, 운반, 섭취 전 확인만 가볍게 저장합니다.',
      category: '생활 안전',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'start_date',
      status: 'published',
      source_title: '식품의약품안전처 나들이철 위생적이고 안전하게',
      source_url: picnicFoodSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-25',
      primary_destination: 'hybrid',
      setup_anchor_label: '나들이일',
      setup_anchor_hint: '나들이일 기준으로 전날 장보기와 당일 조리/운반/섭취 확인을 저장합니다.',
      risk_level: 'medium',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:picnic-food-safety', 'timeline', 'official'],
    },
    sections: [{ id: 'picnic-prep', flow_id: 'flow-source-backed-picnic-food-safety', title: '나들이 전후', order: 0 }],
    items: [
      item('flow-source-backed-picnic-food-safety', 'picnic-prep', 'picnic-shopping', '장보기 순서와 1시간 이내 구입', '실온식품, 채소/과일, 냉장식품, 육류, 어패류 순서와 시간만 확인합니다.', 0, { type: 'calendar', day_offset: -1, duration_days: 1, source_type: 'official', risk_level: 'medium' }),
      item('flow-source-backed-picnic-food-safety', 'picnic-prep', 'picnic-cooking', '손 씻기와 익혀 조리하기', '도시락 조리 전후 손 씻기, 충분히 익히기, 식혀 담기를 확인합니다.', 1, { type: 'calendar', day_offset: 0, duration_days: 1, source_type: 'official', risk_level: 'medium' }),
      item('flow-source-backed-picnic-food-safety', 'picnic-prep', 'picnic-carry-eat', '차갑게 운반하고 빠르게 먹기', '아이스박스 보관, 고온 방치 금지, 섭취 전 상태 확인을 체크합니다.', 2, { type: 'calendar', day_offset: 0, duration_days: 1, source_type: 'official', risk_level: 'medium' }),
    ],
    itemDetails: [
      detail('picnic-shopping', '식약처 원문은 나들이 장보기 순서와 1시간 이내 구입을 안내합니다.', [
        '실온보관식품부터 장보기 시작',
        '과일/채소, 냉장식품, 육류, 어패류 순서로 구매',
        '장보기 시간을 1시간 이내로 잡기',
      ], '구매 순서와 필요한 보냉 준비가 메모에 남아 있습니다.', picnicFoodSourceUrl),
      detail('picnic-cooking', '도시락 준비 단계에서는 손 씻기, 충분히 익히기, 식혀 담기가 핵심입니다.', [
        '조리 전후와 재료가 바뀔 때 손 씻기',
        '육류 등은 중심부까지 충분히 익히기',
        '밥과 반찬을 식혀 개별 용기에 담기',
      ], '조리 전후 체크와 포장 상태가 확인되어 있습니다.', picnicFoodSourceUrl),
      detail('picnic-carry-eat', '운반과 섭취 단계에서 고온 방치와 오염된 용기를 피해야 합니다.', [
        '조리된 음식은 아이스박스로 차갑게 운반',
        '차 트렁크나 햇볕이 닿는 곳에 방치하지 않기',
        '먹기 전 손 씻기와 용기 손상 여부 확인',
        '보관/운반 상태가 애매하면 섭취하지 않기',
      ], '운반 상태와 섭취 여부가 짧게 남아 있습니다.', picnicFoodSourceUrl, '식중독 의심 증상이 있으면 FlowMe 기록보다 의료기관/공식 상담을 우선합니다.'),
    ],
  },
];
