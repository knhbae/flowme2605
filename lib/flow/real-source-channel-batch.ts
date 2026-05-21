import {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowUser,
  RiskLevel,
  SourceType,
  StructureType,
} from './types';
import { previewCreatorChannels } from './creator-channel-preview';

const checkedAt = '2026-05-21';
const now = '2026-05-21T00:00:00.000Z';

type RealSourceSpec = {
  channelSlug: string;
  slug: string;
  title: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  source_title: string;
  source_url: string;
  source_type: SourceType;
  risk_level: RiskLevel;
  conversion_note: string;
  warning?: string;
  tags: string[];
  sections: string[];
  actions: string[];
};

const channelBySlug = new Map(previewCreatorChannels.map((channel) => [channel.slug, channel]));

function requireChannel(slug: string): FlowUser {
  const channel = channelBySlug.get(slug);
  if (!channel) throw new Error(`Missing preview channel: ${slug}`);
  return channel;
}

function makeItems(spec: RealSourceSpec, flowId: string, sectionIds: string[]): FlowItem[] {
  const timelineOffsets = [-30, -14, -7, -1, 0];

  return spec.actions.map((title, index) => ({
    id: `${flowId}-item-${index + 1}`,
    flow_id: flowId,
    section_id: sectionIds[Math.min(index < 2 ? 0 : 1, sectionIds.length - 1)],
    title,
    type: spec.structure_type === 'timeline' ? 'calendar' : 'todo',
    day_offset:
      spec.anchor_type === 'end_date'
        ? timelineOffsets[index] ?? 0
        : spec.anchor_type === 'start_date'
          ? index * 7
          : undefined,
    repeat_rule: spec.structure_type === 'routine' ? 'weekly' : undefined,
    source_type: spec.source_type,
    risk_level: spec.risk_level,
    order: index + 1,
    description: `${spec.source_title} 기반 실행 항목`,
  }));
}

function makeDetails(spec: RealSourceSpec, items: FlowItem[]): FlowItemDetail[] {
  const linkType = spec.source_type === 'official' ? 'official' : spec.source_type === 'creator_experience' ? 'creator' : 'reference';

  return items.map((item) => ({
    item_id: item.id,
    why: `${spec.title}을 실제로 실행 가능한 단계로 바꾸기 위한 확인 항목입니다.`,
    how: `${spec.source_title}의 기준을 먼저 확인하고, 본인 상황에 맞는 날짜/준비물/기록을 남깁니다.`,
    completion_criteria: `"${item.title}" 항목의 확인, 준비, 실행 또는 기록이 끝났습니다.`,
    caution:
      spec.risk_level === 'medical_sensitive'
        ? '건강, 운동, 육아 관련 판단은 개인 상태에 따라 달라질 수 있으므로 공식 정보와 전문가 조언을 함께 확인하세요.'
        : spec.risk_level === 'financial_sensitive'
          ? '비용, 계약, 행정 처리 조건은 상황마다 달라질 수 있으므로 원문과 담당 기관 안내를 다시 확인하세요.'
          : '원문이 변경될 수 있으므로 실행 전 링크의 최신 안내를 다시 확인하세요.',
    links: [{ label: spec.source_title, url: spec.source_url, type: linkType }],
  }));
}

function buildBundle(spec: RealSourceSpec): FlowBundle {
  const channel = requireChannel(spec.channelSlug);
  const flowId = `flow-${spec.slug}`;
  const sections = spec.sections.map((title, index) => ({
    id: `${flowId}-section-${index + 1}`,
    flow_id: flowId,
    title,
    order: index + 1,
  }));
  const items = makeItems(
    spec,
    flowId,
    sections.map((section) => section.id),
  );

  return {
    flow: {
      id: flowId,
      slug: spec.slug,
      title: spec.title,
      description: `${channel.name} 채널의 실제 출처를 실행 가능한 FLOW로 전환한 항목입니다.`,
      category: spec.category,
      structure_type: spec.structure_type,
      content_type: 'default',
      anchor_type: spec.anchor_type,
      status: 'published',
      source_status: 'real',
      source_title: spec.source_title,
      source_url: spec.source_url,
      source_checked_at: checkedAt,
      conversion_note: spec.conversion_note,
      risk_level: spec.risk_level,
      warning: spec.warning,
      owner_user_id: channel.id,
      creator_name: channel.name,
      creator_role: channel.role,
      creator_note: channel.bio,
      usage_count: 0,
      copy_count: 0,
      tags: spec.tags,
      created_at: now,
      updated_at: now,
    },
    sections,
    items,
    itemDetails: makeDetails(spec, items),
  };
}

const realSourceSpecs: RealSourceSpec[] = [
  {
    channelSlug: 'samsung-service',
    slug: 'real-samsung-aircon-seasonal-care',
    title: '삼성 에어컨 계절 세척 준비 Flow',
    category: '가전관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '삼성전자서비스 에어컨 세척 서비스 안내',
    source_url: 'https://www.samsungsvc.co.kr/info/maintenance',
    source_type: 'official',
    risk_level: 'low',
    conversion_note: '공식 세척 서비스 안내를 계절 전 점검과 예약 준비 순서로 전환했습니다.',
    tags: ['가전관리', '공식출처', '에어컨'],
    sections: ['예약 전 확인', '방문 전 실행'],
    actions: ['에어컨 모델과 설치 위치 확인', '필터 오염과 냉방 상태 점검', '세척 필요 범위와 비용 확인', '방문 가능 날짜와 연락처 준비', '세척 후 정상 작동과 누수 여부 기록'],
  },
  {
    channelSlug: 'samsung-service',
    slug: 'real-samsung-washer-filter-care',
    title: '삼성 세탁기 배수필터 관리 Flow',
    category: '가전관리',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '삼성전자서비스 세탁기 배수필터 청소 안내',
    source_url: 'https://www.samsungsvc.co.kr/solution/1978102',
    source_type: 'official',
    risk_level: 'low',
    conversion_note: '배수필터 청소와 잔수 제거 안내를 반복 관리 루틴으로 전환했습니다.',
    tags: ['가전관리', '공식출처', '세탁기'],
    sections: ['청소 전 준비', '청소 후 확인'],
    actions: ['전원과 물 배수 상태 확인', '잔수 제거 도구와 수건 준비', '배수필터 분리 전 물 넘침 가능성 확인', '필터와 내부 이물질 제거', '재조립 후 누수와 오류 코드 확인'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slug: 'real-thankyou-bubu-home-workout-starter',
    title: 'ThankyouBUBU 홈트 시작 Flow',
    category: '운동/홈트',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: 'ThankyouBUBU YouTube 홈트 채널',
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    conversion_note: '홈트 채널의 초보자 루틴 성격을 준비, 실행, 기록 루틴으로 전환했습니다.',
    warning: '운동 중 통증이나 어지러움이 있으면 중단하고 전문가 상담을 권장합니다.',
    tags: ['운동', '홈트', 'creator'],
    sections: ['운동 전 준비', '운동 후 기록'],
    actions: ['운동 가능한 공간과 매트 준비', '오늘 가능한 강도 선택', '워밍업과 관절 상태 확인', '영상 루틴을 무리 없는 범위로 수행', '운동 시간과 몸 상태 기록'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slug: 'real-thankyou-bubu-20min-routine',
    title: 'ThankyouBUBU 20분 반복 운동 Flow',
    category: '운동/홈트',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: 'ThankyouBUBU YouTube 홈트 채널',
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    conversion_note: '짧은 홈트 콘텐츠 소비를 주간 반복 실행 루틴으로 바꿨습니다.',
    warning: '운동 강도는 개인 체력에 맞게 조절하고 통증이 있으면 중단하세요.',
    tags: ['운동', '반복루틴', 'creator'],
    sections: ['주간 계획', '운동 기록'],
    actions: ['주 3회 운동 요일 선택', '20분 확보 가능한 시간대 고정', '루틴 전후 스트레칭 포함', '완료 여부와 난이도 기록', '다음 주 강도 유지 또는 조정 결정'],
  },
  {
    channelSlug: 'fitvely',
    slug: 'real-fitvely-diet-record-routine',
    title: 'FITVELY 식단 기록 루틴 Flow',
    category: '다이어트/기록',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: 'FITVELY 공식 사이트',
    source_url: 'https://www.fitvely.com/',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    conversion_note: '다이어트 콘텐츠를 식단, 운동, 컨디션 기록 루틴으로 전환했습니다.',
    warning: '체중 감량 목표는 건강 상태에 따라 달라지므로 무리한 제한은 피하세요.',
    tags: ['다이어트', '기록', 'creator'],
    sections: ['기록 기준 만들기', '주간 점검'],
    actions: ['하루 기록 항목 정하기', '식사 사진 또는 메모 남기기', '운동 여부와 수면 시간 기록', '폭식이나 결식 패턴 표시', '주간 평균과 다음 조정점 정리'],
  },
  {
    channelSlug: 'fitvely',
    slug: 'real-fitvely-weekly-body-check',
    title: 'FITVELY 주간 바디 체크 Flow',
    category: '다이어트/기록',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: 'FITVELY 공식 사이트',
    source_url: 'https://www.fitvely.com/',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    conversion_note: '체형 관리 콘텐츠를 주간 측정과 피드백 루틴으로 전환했습니다.',
    warning: '측정값은 참고용이며 건강 이상이 있으면 전문가 상담이 우선입니다.',
    tags: ['다이어트', '주간점검', 'creator'],
    sections: ['측정 준비', '피드백'],
    actions: ['같은 요일과 시간으로 측정 예약', '체중보다 행동 지표를 함께 기록', '운동 수행 횟수 확인', '식단 기록 누락 원인 정리', '다음 주 유지할 행동 1개 선택'],
  },
  {
    channelSlug: 'sinagong',
    slug: 'real-sinagong-computer-d30-study',
    title: '시나공 컴활 D-30 학습 Flow',
    category: '자격증 시험',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '시나공 컴퓨터활용능력 학습 자료',
    source_url: 'https://www.sinagong.co.kr/',
    source_type: 'reference',
    risk_level: 'medium',
    conversion_note: '교재와 자료 중심 학습을 시험일 기준 D-30 루틴으로 전환했습니다.',
    tags: ['자격증', 'D-Day', '시나공'],
    sections: ['D-30 계획', '시험 직전'],
    actions: ['시험일과 응시 과목 확정', '기출과 핵심요약 자료 확보', '주차별 학습 분량 나누기', '오답 정리와 재풀이 일정 잡기', '시험 전 준비물과 시험장 이동 확인'],
  },
  {
    channelSlug: 'sinagong',
    slug: 'real-qnet-application-examday-check',
    title: 'Q-Net 원서접수와 시험당일 Flow',
    category: '자격증 시험',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: 'Q-Net 원서접수시 유의사항',
    source_url: 'https://www.q-net.or.kr/rcv002.do?gSite=L&id=rcv002_identi',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '원서접수와 인정 신분증 안내를 접수 전후 체크 Flow로 전환했습니다.',
    tags: ['자격증', '공식출처', 'Q-Net'],
    sections: ['접수 전 확인', '시험 당일'],
    actions: ['응시 자격과 접수 기간 확인', '사진과 기본 정보 준비', '접수 완료와 수험표 확인', '인정 신분증과 준비물 챙기기', '입실 시간과 시험장 위치 확인'],
  },
  {
    channelSlug: 'gov24',
    slug: 'real-gov24-moving-report-check',
    title: '정부24 전입신고 Flow',
    category: '생활행정',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '정부24 전입신고 민원안내',
    source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&tp_seq=01',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '전입신고 민원 안내를 이사일 기준 신고 준비 Flow로 전환했습니다.',
    tags: ['생활행정', '공식출처', '이사'],
    sections: ['신고 전 확인', '신고 후 확인'],
    actions: ['이사일과 신고 기한 확인', '온라인 신청 가능 여부 확인', '신분증과 세대 정보 준비', '정부24 또는 주민센터에서 신고 진행', '처리 결과와 후속 주소 변경 확인'],
  },
  {
    channelSlug: 'gov24',
    slug: 'real-gov24-resident-register-copy',
    title: '정부24 주민등록등본 발급 Flow',
    category: '생활행정',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '정부24 주민등록표 등본 발급 민원안내',
    source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A1004',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '등본 발급 안내를 제출 목적별 확인 체크리스트로 전환했습니다.',
    tags: ['생활행정', '공식출처', '증명서'],
    sections: ['발급 전', '발급 후'],
    actions: ['제출처가 요구하는 등본 종류 확인', '본인 인증 수단 준비', '주민번호 공개 범위 선택', 'PDF 저장 또는 출력 방식 결정', '제출 전 발급일과 표시 항목 확인'],
  },
  {
    channelSlug: 'childcare-portal',
    slug: 'real-childcare-vaccination-visit-prep',
    title: '아이사랑 영유아 검진/접종 방문 준비 Flow',
    category: '육아/돌봄',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '아이사랑 월령별 성장 및 돌보기',
    source_url: 'https://www.childcare.go.kr/?menuno=439',
    source_type: 'official',
    risk_level: 'medical_sensitive',
    conversion_note: '월령별 돌봄 정보를 보호자 방문 준비와 기록 Flow로 전환했습니다.',
    warning: '접종과 검진 일정은 의료기관과 공식 안내를 기준으로 확인하세요.',
    tags: ['육아', '공식출처', '검진'],
    sections: ['방문 전', '방문 후'],
    actions: ['아이 월령과 필요한 검진/접종 확인', '병원 예약과 문진표 준비', '아기수첩과 최근 증상 기록 준비', '방문 당일 체온과 컨디션 확인', '접종 후 관찰 사항과 다음 일정 기록'],
  },
  {
    channelSlug: 'childcare-portal',
    slug: 'real-childcare-support-application-check',
    title: '아이사랑 시간제보육 신청 Flow',
    category: '육아/돌봄',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '아이사랑 시간제 보육 이용안내',
    source_url: 'https://www.childcare.go.kr/?menuno=202',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '시간제보육 이용 안내를 신청 전 조건 확인 Flow로 전환했습니다.',
    tags: ['육아', '공식출처', '보육'],
    sections: ['자격 확인', '신청 실행'],
    actions: ['지원 대상과 이용 조건 확인', '아이사랑 회원가입과 아동 등록 확인', '이용 가능 기관과 시간 조회', '예약과 결제 방식 확인', '이용 후 증빙과 다음 예약 기록'],
  },
  {
    channelSlug: 'pet-care-note',
    slug: 'real-pet-registration-check',
    title: '반려동물 등록 준비 Flow',
    category: '반려동물',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '국가동물보호정보시스템 동물등록제도 안내',
    source_url: 'https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '동물등록제 안내를 등록 대상과 변경 신고 준비 Flow로 전환했습니다.',
    tags: ['반려동물', '공식출처', '등록'],
    sections: ['등록 대상 확인', '등록 후 관리'],
    actions: ['등록 대상 동물 여부 확인', '등록 방식과 대행기관 확인', '소유자 정보와 연락처 준비', '등록 완료 후 등록번호 보관', '주소나 소유자 정보 변경 시 신고 기한 확인'],
  },
  {
    channelSlug: 'pet-care-note',
    slug: 'real-pet-health-visit-routine',
    title: '반려동물 병원 방문 기록 Flow',
    category: '반려동물',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '국가동물보호정보시스템 자주하는 질문',
    source_url: 'https://www.animal.go.kr/front/awtis/faq/faqList.do?menuNo=2000000021',
    source_type: 'reference',
    risk_level: 'medium',
    conversion_note: '반려동물 등록과 관리 FAQ를 병원 방문 전후 기록 루틴으로 전환했습니다.',
    tags: ['반려동물', '기록', '관리'],
    sections: ['방문 전', '방문 후'],
    actions: ['최근 증상과 식욕 변화 기록', '등록번호와 이전 진료 기록 준비', '수의사에게 물어볼 질문 정리', '처방과 주의사항 기록', '다음 접종/검진 날짜 저장'],
  },
  {
    channelSlug: 'ohouse-living',
    slug: 'real-ohouse-moving-d30-prep',
    title: '오늘의집 원룸 이사 D-30 Flow',
    category: '이사/주거',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '오늘의집 원룸 이사 준비 순서 가이드',
    source_url: 'https://ohou.se/advices/12199',
    source_type: 'reference',
    risk_level: 'financial_sensitive',
    conversion_note: '원룸 이사 준비 순서 콘텐츠를 D-30 실행 Flow로 전환했습니다.',
    tags: ['이사', '주거', '오늘의집'],
    sections: ['이사 전', '이사 당일'],
    actions: ['이사 방식과 예산 범위 정하기', '업체 예약과 이전 설치 일정 잡기', '짐 정리와 최소 생활 세트 구분', '이사 당일 공과금과 하자 사진 체크', '전입신고와 후속 주소 변경 확인'],
  },
  {
    channelSlug: 'ohouse-living',
    slug: 'real-ohouse-movein-cleaning-check',
    title: '오늘의집 입주청소 결정 Flow',
    category: '이사/주거',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '오늘의집 원룸 입주청소 가격표',
    source_url: 'https://ohou.se/advices/12375',
    source_type: 'reference',
    risk_level: 'financial_sensitive',
    conversion_note: '입주청소 비용 가이드를 셀프/업체 선택 체크리스트로 전환했습니다.',
    tags: ['청소', '주거', '오늘의집'],
    sections: ['견적 전', '청소 후'],
    actions: ['집 상태와 청소 범위 사진으로 기록', '셀프 청소와 업체 의뢰 기준 정하기', '평수와 날짜 기준 견적 비교', '계약 전 포함/제외 범위 확인', '청소 후 하자와 재청소 요청 사항 기록'],
  },
  {
    channelSlug: 'travelholic',
    slug: 'real-mofa-overseas-travel-prep',
    title: '외교부 해외여행 안전 준비 Flow',
    category: '여행',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '외교부 해외안전여행',
    source_url: 'https://www.0404.go.kr/',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '해외안전여행 정보를 출국 전 안전 확인 Flow로 전환했습니다.',
    tags: ['여행', '공식출처', '안전'],
    sections: ['출국 전', '현지 대비'],
    actions: ['방문 국가 여행경보 확인', '여권과 비자 조건 확인', '긴급 연락처와 영사콜센터 저장', '보험과 현지 이동 계획 점검', '가족에게 일정과 비상 연락 방법 공유'],
  },
  {
    channelSlug: 'travelholic',
    slug: 'real-kdca-travel-health-check',
    title: '질병관리청 해외여행 건강 Flow',
    category: '여행',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '질병관리청 해외여행 전 건강정보',
    source_url: 'https://www.kdca.go.kr/menu.es?mid=a20102060200',
    source_type: 'official',
    risk_level: 'medical_sensitive',
    conversion_note: '여행 전 건강정보를 예방접종, 약, 위생 준비 Flow로 전환했습니다.',
    warning: '예방접종과 예방약은 국가와 개인 건강상태에 따라 달라지므로 의료진 상담이 필요할 수 있습니다.',
    tags: ['여행', '건강', '공식출처'],
    sections: ['출국 전 건강 확인', '여행 중 기록'],
    actions: ['방문 국가 감염병 위험 확인', '필요 예방접종과 상담 일정 확인', '복용약과 구급약 준비', '물과 음식 위생 수칙 정리', '귀국 후 증상 발생 시 기록과 진료 계획 세우기'],
  },
  {
    channelSlug: 'mobility-life',
    slug: 'real-ts-vehicle-inspection-prep',
    title: 'TS 자동차검사 준비 Flow',
    category: '자동차 관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '한국교통안전공단 자동차검사 절차 안내',
    source_url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '자동차검사 절차 안내를 검사일 기준 준비 Flow로 전환했습니다.',
    tags: ['자동차', '공식출처', '검사'],
    sections: ['검사 전', '검사 후'],
    actions: ['검사 대상과 예약 가능일 확인', '등록증과 차량 상태 점검', '등화장치와 타이어 상태 확인', '검사소 방문 시간과 결제 준비', '검사 결과와 정비 필요 항목 기록'],
  },
  {
    channelSlug: 'mobility-life',
    slug: 'real-safe-driving-license-renewal',
    title: '안전운전 면허 갱신 Flow',
    category: '자동차 관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '한국도로교통공단 운전면허증 발급 가이드',
    source_url: 'https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111o',
    source_type: 'official',
    risk_level: 'medium',
    conversion_note: '면허 발급/갱신 안내를 적성검사와 사진 준비 Flow로 전환했습니다.',
    tags: ['자동차', '면허', '공식출처'],
    sections: ['갱신 전', '방문/신청 후'],
    actions: ['면허 갱신 또는 적성검사 대상 확인', '사진과 기존 면허증 준비', '건강검진 또는 적성검사 필요 여부 확인', '온라인/방문 신청 경로 선택', '새 면허 수령과 다음 갱신 기한 기록'],
  },
];

export const realSourceChannelBundles: FlowBundle[] = realSourceSpecs.map(buildBundle);
