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
import { reviewContentInventory } from './content-inventory';

const now = '2026-05-21T00:00:00.000Z';

type PreviewChannel = FlowUser & {
  source_url: string;
  channel_type: NonNullable<FlowUser['channel_type']>;
  is_preview_channel: true;
  base_category: string;
  source_type: SourceType;
  risk_level: RiskLevel;
  source_title: string;
};

const topicTemplates = [
  ['월간 점검 루틴', 'routine', 'start_date'],
  ['D-30 준비 플랜', 'timeline', 'end_date'],
  ['초보자 시작 체크', 'checklist', 'none'],
  ['4주 적응 루틴', 'routine', 'start_date'],
  ['구매 전 확인표', 'checklist', 'none'],
  ['방문 전 준비 Flow', 'timeline', 'end_date'],
  ['문제 발생 대응 순서', 'checklist', 'none'],
  ['계절 전환 관리', 'routine', 'start_date'],
  ['서류/도구 준비표', 'checklist', 'none'],
  ['D-Day 당일 체크', 'timeline', 'end_date'],
  ['기록 템플릿', 'routine', 'start_date'],
  ['2주 리셋 플랜', 'routine', 'start_date'],
  ['비용 비교 체크', 'checklist', 'none'],
  ['초급-중급 단계표', 'phase', 'start_date'],
  ['주간 반복 캘린더', 'routine', 'start_date'],
  ['실패 방지 체크', 'checklist', 'none'],
  ['공식 정보 확인 루트', 'checklist', 'none'],
  ['가족/동료 공유표', 'checklist', 'none'],
  ['30일 누적 루틴', 'routine', 'start_date'],
  ['마감 후 정리 플랜', 'timeline', 'end_date'],
  ['처음 7일 온보딩', 'routine', 'start_date'],
  ['상황별 의사결정표', 'checklist', 'none'],
  ['필수 준비물 압축표', 'checklist', 'none'],
  ['예약 전 확인 루트', 'timeline', 'end_date'],
  ['방문 후 후속관리', 'routine', 'start_date'],
  ['초기 세팅 체크리스트', 'checklist', 'none'],
  ['주말 집중 실행표', 'timeline', 'end_date'],
  ['매일 10분 유지 루틴', 'routine', 'start_date'],
  ['비상 상황 대응표', 'checklist', 'none'],
  ['반복 실패 원인 점검', 'checklist', 'none'],
  ['도구 선택 비교표', 'checklist', 'none'],
  ['D-7 최종 점검', 'timeline', 'end_date'],
  ['첫 달 유지 캘린더', 'routine', 'start_date'],
  ['초보 실수 방지표', 'checklist', 'none'],
  ['결과 리뷰 회고표', 'checklist', 'none'],
  ['보관/정리 루틴', 'routine', 'start_date'],
  ['계약/신청 전 확인표', 'checklist', 'none'],
  ['가족 공유 실행표', 'checklist', 'none'],
  ['월말 리셋 플랜', 'timeline', 'end_date'],
  ['분기별 점검 루틴', 'routine', 'start_date'],
  ['처음 구매 전 체크', 'checklist', 'none'],
  ['서비스 이용 전 준비', 'timeline', 'end_date'],
  ['기록 누락 복구표', 'checklist', 'none'],
  ['다음 단계 전환 플랜', 'timeline', 'end_date'],
] as const;

export const previewCreatorChannels: PreviewChannel[] = [
  {
    id: 'channel-samsung-service',
    slug: 'samsung-service',
    name: '삼성전자서비스',
    role: '가전관리 공식 채널',
    bio: '제품별 청소, 필터, 점검 안내를 반복 관리 Flow로 재구성합니다.',
    avatar_initial: '삼',
    specialty_tags: ['가전관리', '공식확인', '계절점검'],
    source_url: 'https://www.samsungsvc.co.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '가전관리',
    source_type: 'official',
    risk_level: 'low',
    source_title: '삼성전자서비스 제품 관리 안내',
  },
  {
    id: 'channel-thankyou-bubu',
    slug: 'thankyou-bubu',
    name: 'ThankyouBUBU',
    role: '홈트 루틴 채널',
    bio: '집에서 따라 할 수 있는 운동 루틴을 시작일 기준 실행표로 바꿉니다.',
    avatar_initial: '홈',
    specialty_tags: ['홈트', '운동루틴', '초보자'],
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '운동/홈트',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: 'ThankyouBUBU 홈트 루틴 콘텐츠',
  },
  {
    id: 'channel-fitvely',
    slug: 'fitvely',
    name: '핏블리 FITVELY',
    role: '다이어트·운동 채널',
    bio: '식단, 운동, 기록 습관을 2주와 4주 단위 실행 Flow로 정리합니다.',
    avatar_initial: '핏',
    specialty_tags: ['다이어트', '식단기록', '운동'],
    source_url: 'https://www.fitvely.com/',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '다이어트/기록',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    source_title: '핏블리 다이어트 루틴 콘텐츠',
  },
  {
    id: 'channel-sinagong',
    slug: 'sinagong',
    name: '시나공',
    role: '자격증 학습 채널',
    bio: '시험 일정과 교재 진도를 D-Day 학습 Flow로 재구성합니다.',
    avatar_initial: '시',
    specialty_tags: ['자격증', '컴활', 'D-Day'],
    source_url: 'https://www.sinagong.co.kr/',
    channel_type: 'brand',
    is_preview_channel: true,
    base_category: '자격증/시험',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '시나공 자격증 학습 콘텐츠',
  },
  {
    id: 'channel-gov24',
    slug: 'gov24',
    name: '정부24',
    role: '생활 행정 공식 채널',
    bio: '민원, 발급, 신고 절차를 신청 전 체크 Flow로 전환합니다.',
    avatar_initial: '정',
    specialty_tags: ['생활행정', '공식확인', '서류'],
    source_url: 'https://www.gov.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '생활행정',
    source_type: 'official',
    risk_level: 'medium',
    source_title: '정부24 민원 안내',
  },
  {
    id: 'channel-childcare',
    slug: 'childcare-portal',
    name: '아이사랑 육아 포털',
    role: '육아 정보 공식 채널',
    bio: '월령별 준비와 기관 신청 절차를 보호자 실행 Flow로 정리합니다.',
    avatar_initial: '육',
    specialty_tags: ['육아', '기관신청', '공식확인'],
    source_url: 'https://www.childcare.go.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '육아/돌봄',
    source_type: 'official',
    risk_level: 'medical_sensitive',
    source_title: '아이사랑 육아 정보',
  },
  {
    id: 'channel-pet-care',
    slug: 'pet-care-note',
    name: '반려동물 생활 노트',
    role: '반려동물 관리 채널',
    bio: '훈련, 건강관리, 방문 준비 콘텐츠를 체크리스트와 루틴으로 나눕니다.',
    avatar_initial: '펫',
    specialty_tags: ['반려동물', '훈련', '관리'],
    source_url: 'https://www.youtube.com/results?search_query=%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC+%EA%B4%80%EB%A6%AC',
    channel_type: 'curation',
    is_preview_channel: true,
    base_category: '반려동물',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '반려동물 관리 콘텐츠 모음',
  },
  {
    id: 'channel-ohouse',
    slug: 'ohouse-living',
    name: '오늘의집',
    role: '이사·주거 채널',
    bio: '이사 준비, 수납, 주거 관리 콘텐츠를 D-Day와 반복 Flow로 검증합니다.',
    avatar_initial: '집',
    specialty_tags: ['이사', '주거관리', '수납'],
    source_url: 'https://ohou.se/',
    channel_type: 'community',
    is_preview_channel: true,
    base_category: '이사/주거',
    source_type: 'reference',
    risk_level: 'low',
    source_title: '오늘의집 주거 관리 콘텐츠',
  },
  {
    id: 'channel-travelholic',
    slug: 'travelholic',
    name: '여행에미치다',
    role: '여행 준비 채널',
    bio: '여행 준비물, 예약, 현지 실행 콘텐츠를 출발일 기준 Flow로 전환합니다.',
    avatar_initial: '여',
    specialty_tags: ['여행', '준비물', 'D-Day'],
    source_url: 'https://www.instagram.com/travelholic_insta/',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '여행',
    source_type: 'creator_experience',
    risk_level: 'medium',
    source_title: '여행에미치다 여행 준비 콘텐츠',
  },
  {
    id: 'channel-mobility',
    slug: 'mobility-life',
    name: '차근차근 모빌리티',
    role: '자동차 생활 채널',
    bio: '구매, 검사, 정비, 보험 확인을 차량 생활주기 Flow로 묶습니다.',
    avatar_initial: '차',
    specialty_tags: ['자동차', '검사', '정비'],
    source_url: 'https://www.youtube.com/results?search_query=%EC%9E%90%EB%8F%99%EC%B0%A8+%EA%B4%80%EB%A6%AC+%EC%B2%B4%ED%81%AC',
    channel_type: 'curation',
    is_preview_channel: true,
    base_category: '자동차/관리',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '자동차 생활 관리 콘텐츠',
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

function itemTitles(channel: PreviewChannel, suffix: string): string[] {
  return [
    `${channel.base_category} 목표와 기준 정하기`,
    `${suffix}에 필요한 자료 모으기`,
    '공식/원천 소스 확인하기',
    '실행 순서대로 체크하기',
    '결과와 다음 수정점 기록하기',
  ];
}

function makePreviewBundle(channel: PreviewChannel, topicIndex: number): FlowBundle {
  const [suffix, structureType, anchorType] = topicTemplates[topicIndex];
  const structure_type = structureType as StructureType;
  const anchor_type = anchorType as AnchorType;
  const slug = `channel-${channel.slug}-${slugify(suffix)}`;
  const flow_id = `flow-preview-${channel.slug}-${topicIndex + 1}`;
  const sectionId = `${flow_id}-section-main`;
  const titles = itemTitles(channel, suffix);
  const items: FlowItem[] = titles.map((title, index) => ({
    id: `${flow_id}-item-${index + 1}`,
    flow_id,
    section_id: sectionId,
    title,
    type: structure_type === 'timeline' ? 'calendar' : 'todo',
    day_offset: anchor_type === 'end_date' ? -Math.max(0, 30 - index * 7) : anchor_type === 'start_date' ? index * 3 : undefined,
    repeat_rule: structure_type === 'routine' ? 'weekly' : undefined,
    source_type: channel.source_type,
    risk_level: channel.risk_level,
    order: index + 1,
  }));

  const itemDetails: FlowItemDetail[] = items.map((item, index) => ({
    item_id: item.id,
    why: `${channel.name}의 ${suffix} 콘텐츠를 실제 행동으로 옮기기 위한 ${index + 1}번째 확인점입니다.`,
    how: `${channel.source_title}를 열어 기준을 확인하고, 내 상황에 맞는 실행 메모를 남깁니다.`,
    completion_criteria: `${item.title} 항목을 확인하고 다음 행동 또는 보류 사유를 기록했다.`,
    caution: channel.risk_level === 'medical_sensitive' ? '건강·육아 관련 결정은 공식 정보와 전문가 조언을 함께 확인하세요.' : undefined,
    links: [{ label: channel.source_title, url: channel.source_url, type: channel.source_type === 'official' ? 'official' : 'reference' }],
  }));

  return {
    flow: {
      id: flow_id,
      slug,
      title: `${channel.base_category} ${suffix}`,
      description: `${channel.name} 채널의 ${suffix} 콘텐츠를 실행 가능한 Flow로 재구성했습니다.`,
      category: channel.base_category,
      structure_type,
      content_type: 'default',
      anchor_type,
      status: 'published',
      source_status: 'preview',
      source_title: channel.source_title,
      source_url: channel.source_url,
      risk_level: channel.risk_level,
      created_at: now,
      updated_at: now,
      owner_user_id: channel.id,
      creator_name: channel.name,
      creator_role: channel.role,
      creator_note: channel.bio,
      usage_count: 900 + topicIndex * 37,
      copy_count: 180 + topicIndex * 11,
      tags: [
        channel.base_category,
        structure_type === 'timeline' ? 'D-Day 준비' : structure_type === 'routine' ? '반복 루틴' : '체크리스트',
        channel.source_type === 'official' ? '공식확인' : '채널콘텐츠',
      ].slice(0, 6),
      warning:
        channel.risk_level === 'medical_sensitive'
          ? '건강·육아 관련 정보는 개인 상황에 따라 달라질 수 있습니다. 공식 정보와 전문가 조언을 함께 확인하세요.'
          : undefined,
    },
    sections: [{ id: sectionId, flow_id, title: suffix, order: 1 }],
    items,
    itemDetails,
  };
}

export const previewFlowBundles: FlowBundle[] = previewCreatorChannels.flatMap((channel) =>
  topicTemplates.map((_, topicIndex) => makePreviewBundle(channel, topicIndex)),
);

export type CreatorChannelSummary = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar_initial: string;
  specialty_tags: string[];
  source_url?: string;
  channel_type?: FlowUser['channel_type'];
  is_preview_channel: boolean;
  flow_count: number;
  category_count: number;
  executable_item_count: number;
  anchor_coverage: number;
  source_coverage: number;
  sensitive_count: number;
  real_flow_count: number;
  preview_flow_count: number;
  needs_review_flow_count: number;
  sample_candidate_count: number;
  manual_source_fit_count: number;
  derived_source_review_count: number;
  source_review_count: number;
  representative_ready_count: number;
  next_content_action: string;
  execution_score: number;
};

export function getCreatorChannelSummaries(bundles: FlowBundle[]): CreatorChannelSummary[] {
  return previewCreatorChannels.map((channel) => {
    const channelBundles = bundles.filter((bundle) => bundle.flow.owner_user_id === channel.id);
    const sourceBacked = channelBundles.filter((bundle) => bundle.flow.source_url).length;
    const anchored = channelBundles.filter((bundle) => bundle.flow.anchor_type !== 'none').length;
    const executableItemCount = channelBundles.reduce((sum, bundle) => sum + bundle.items.length, 0);
    const categoryCount = new Set(channelBundles.map((bundle) => bundle.flow.category)).size;
    const sourceCoverage = Math.round((sourceBacked / Math.max(channelBundles.length, 1)) * 100);
    const anchorCoverage = Math.round((anchored / Math.max(channelBundles.length, 1)) * 100);
    const sensitiveCount = channelBundles.filter((bundle) => bundle.flow.risk_level?.includes('sensitive')).length;
    const realFlowCount = channelBundles.filter((bundle) => bundle.flow.source_status === 'real').length;
    const previewFlowCount = channelBundles.filter((bundle) => bundle.flow.source_status === 'preview').length;
    const needsReviewFlowCount = channelBundles.filter((bundle) => bundle.flow.source_status === 'needs_review').length;
    const inventoryReviews = channelBundles.map(reviewContentInventory);
    const sampleCandidateCount = inventoryReviews.filter((review) => review.level === 'generated_preview_candidate').length;
    const manualSourceFitCount = inventoryReviews.filter((review) => review.level === 'manual_source_fit').length;
    const derivedSourceReviewCount = inventoryReviews.filter((review) => review.level === 'derived_real_source').length;
    const representativeReadyCount = inventoryReviews.filter(
      (review) => review.publicHandling === 'representative_eligible',
    ).length;
    const sourceReviewCount = manualSourceFitCount + derivedSourceReviewCount;
    const nextContentAction =
      sampleCandidateCount > sourceReviewCount
        ? '샘플 후보에 실제 원본 URL을 붙이고 원본별 검토를 진행하세요.'
        : '대표 후보를 고르고 수동 source-fit audit을 보강하세요.';

    return {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      role: channel.role,
      bio: channel.bio,
      avatar_initial: channel.avatar_initial,
      specialty_tags: channel.specialty_tags,
      source_url: channel.source_url,
      channel_type: channel.channel_type,
      is_preview_channel: true,
      flow_count: channelBundles.length,
      category_count: categoryCount,
      executable_item_count: executableItemCount,
      anchor_coverage: anchorCoverage,
      source_coverage: sourceCoverage,
      sensitive_count: sensitiveCount,
      real_flow_count: realFlowCount,
      preview_flow_count: previewFlowCount,
      needs_review_flow_count: needsReviewFlowCount,
      sample_candidate_count: sampleCandidateCount,
      manual_source_fit_count: manualSourceFitCount,
      derived_source_review_count: derivedSourceReviewCount,
      source_review_count: sourceReviewCount,
      representative_ready_count: representativeReadyCount,
      next_content_action: nextContentAction,
      execution_score: Math.min(
        100,
        Math.round(sourceCoverage * 0.35 + anchorCoverage * 0.25 + Math.min(executableItemCount / 100, 1) * 40),
      ),
    };
  });
}
