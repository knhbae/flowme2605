import {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowUser,
  PrimaryDestination,
  RiskLevel,
  SourcePrecision,
  SourceType,
  StructureType,
} from './types';
import { previewCreatorChannels } from './creator-channel-preview';

const checkedAt = '2026-05-21';
const sourceFreshnessReviewDate = '2026-08-22';
const sourceFreshnessReviewedSlugs = new Set([
  'real-thankyou-bubu-video-full-body-no-jump',
  'real-thankyou-bubu-video-daily-stretch-9min',
  'real-thankyou-bubu-video-belly-side-all-in-one',
  'real-thankyou-bubu-video-no-knee-cardio-strength',
  'real-thankyou-bubu-video-arm-back-shoulder',
  'real-thankyou-bubu-video-waist-8cm',
  'real-thankyou-bubu-video-8min-cardio',
  'real-thankyou-bubu-video-3min-arm',
  'real-thankyou-bubu-video-3min-abs',
  'real-thankyou-bubu-video-lower-belly-8min',
  'real-thankyou-bubu-home-workout-starter',
  'real-thankyou-bubu-20min-routine',
  'real-fitvely-video-body-fat-6kg-method',
  'real-fitvely-video-carb-reason',
  'real-fitvely-video-three-week-check',
  'real-fitvely-video-post-workout-nutrition',
  'real-fitvely-video-carb-amount-shorts',
  'real-fitvely-video-after-work-nutrition',
  'real-fitvely-video-weight-class-method',
  'real-fitvely-video-bulk-up-method',
  'real-fitvely-video-workout-order',
  'real-fitvely-video-workout-split-science',
  'real-fitvely-diet-record-routine',
  'real-qnet-application-examday-check',
  'real-gov24-resident-register-copy',
  'real-childcare-vaccination-visit-prep',
  'real-childcare-support-application-check',
  'real-ohouse-moving-d30-prep',
  'real-ohouse-movein-cleaning-check',
  'real-mofa-overseas-travel-prep',
]);
const sourceFreshnessCorrectedSlugs = new Set([
  'real-thankyou-bubu-20min-routine',
  'real-fitvely-video-body-fat-6kg-method',
  'real-fitvely-video-carb-reason',
  'real-fitvely-video-three-week-check',
  'real-fitvely-video-post-workout-nutrition',
  'real-fitvely-video-carb-amount-shorts',
  'real-fitvely-video-after-work-nutrition',
  'real-fitvely-video-weight-class-method',
  'real-qnet-application-examday-check',
  'real-childcare-vaccination-visit-prep',
  'real-mofa-overseas-travel-prep',
]);
const now = '2026-05-21T00:00:00.000Z';

type RealSourceAction = {
  title: string;
  why: string;
  how: string;
  completion_criteria: string;
  caution?: string;
  link_label?: string;
  link_url?: string;
};

type RealSourceSpec = {
  channelSlug: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  source_title: string;
  source_url: string;
  source_type: SourceType;
  source_precision: SourcePrecision;
  source_published_at?: string;
  source_modified_at?: string;
  source_checked_at?: string;
  primary_destination?: PrimaryDestination;
  creator_name?: string;
  creator_role?: string;
  creator_note?: string;
  risk_level: RiskLevel;
  conversion_note: string;
  warning?: string;
  tags: string[];
  sections: string[];
  actions: RealSourceAction[];
};

const channelBySlug = new Map(previewCreatorChannels.map((channel) => [channel.slug, channel]));

function requireChannel(slug: string): FlowUser {
  const channel = channelBySlug.get(slug);
  if (!channel) throw new Error(`Missing preview channel: ${slug}`);
  return channel;
}

function makeItems(spec: RealSourceSpec, flowId: string, sectionIds: string[]): FlowItem[] {
  const timelineOffsets = [-30, -14, -7, -1, 0];

  return spec.actions.map((action, index) => ({
    id: `${flowId}-item-${index + 1}`,
    flow_id: flowId,
    section_id: sectionIds[Math.min(index < 2 ? 0 : 1, sectionIds.length - 1)],
    title: action.title,
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
    description: `${spec.source_title} 기준으로 실행할 항목입니다.`,
  }));
}

function makeDetails(spec: RealSourceSpec, items: FlowItem[]): FlowItemDetail[] {
  const linkType =
    spec.source_type === 'official'
      ? 'official'
      : spec.source_type === 'creator_experience'
        ? 'creator'
        : 'reference';

  return items.map((item, index) => {
    const action = spec.actions[index];
    return {
      item_id: item.id,
      why: action.why,
      how: action.how,
      completion_criteria: action.completion_criteria,
      caution: action.caution ?? spec.warning,
      links: [
        {
          label: action.link_label ?? spec.source_title,
          url: action.link_url ?? spec.source_url,
          type: linkType,
        },
      ],
    };
  });
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
      description: spec.description ?? `${channel.name} 채널의 실제 출처를 실행 가능한 FLOW로 전환한 항목입니다.`,
      category: spec.category,
      structure_type: spec.structure_type,
      content_type: 'default',
      anchor_type: spec.anchor_type,
      status: 'published',
      source_status: 'real',
      source_precision: spec.source_precision,
      primary_destination: spec.primary_destination,
      source_title: spec.source_title,
      source_url: spec.source_url,
      source_published_at: spec.source_published_at,
      source_modified_at: spec.source_modified_at,
      source_checked_at:
        spec.source_checked_at ??
        (sourceFreshnessReviewedSlugs.has(spec.slug) ? sourceFreshnessReviewDate : checkedAt),
      conversion_note: spec.conversion_note,
      risk_level: spec.risk_level,
      warning: spec.warning,
      owner_user_id: channel.id,
      creator_name: spec.creator_name ?? channel.name,
      creator_role: spec.creator_role ?? channel.role,
      creator_note: spec.creator_note ?? channel.bio,
      usage_count: 0,
      copy_count: 0,
      tags: spec.tags,
      created_at: now,
      updated_at: sourceFreshnessCorrectedSlugs.has(spec.slug)
        ? `${sourceFreshnessReviewDate}T00:00:00.000Z`
        : spec.source_checked_at
          ? `${spec.source_checked_at}T00:00:00.000Z`
          : now,
    },
    sections,
    items,
    itemDetails: makeDetails(spec, items),
  };
}

type CreatorVideoSpec = {
  channelSlug: 'thankyou-bubu' | 'fitvely';
  slugPrefix: string;
  slug: string;
  title: string;
  flowTitle: string;
  videoId: string;
  category: string;
  focus: string;
  mode: 'workout' | 'diet' | 'workout-plan' | 'source-observation';
  actionTitle?: string;
  applicationTarget?: string;
  tags: string[];
};

const thankyouBubuExactVideos: CreatorVideoSpec[] = [
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'full-body-no-jump',
    title: '전신 다이어트 최고의 운동 [점프 없음, 눕는동작 없음, 반복 없음, 토크 없음]',
    flowTitle: 'ThankyouBUBU 전신 다이어트 실천 Flow',
    videoId: 'pcyrlkHXAdE',
    category: '운동/홈트',
    focus: '점프, 눕는 동작, 반복, 토크를 줄인 전신 루틴',
    mode: 'workout',
    tags: ['운동', '홈트', '전신', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'daily-stretch-9min',
    title: '하루 9분! 전신 스트레칭 BEST',
    flowTitle: 'ThankyouBUBU 9분 스트레칭 Flow',
    videoId: 'aob4Lh1Vebk',
    category: '운동/홈트',
    focus: '운동 전후 전신 스트레칭',
    mode: 'workout',
    tags: ['운동', '스트레칭', '회복', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'belly-side-all-in-one',
    title: 'NO관절부담 뱃살 옆구리살 빼는 운동 [뱃살 올인원]',
    flowTitle: 'ThankyouBUBU 뱃살 옆구리 루틴 Flow',
    videoId: 'toAUho9bEw0',
    category: '운동/홈트',
    focus: '관절 부담을 줄인 복부와 옆구리 루틴',
    mode: 'workout',
    tags: ['운동', '복부', '관절부담낮춤', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'no-knee-cardio-strength',
    title: 'NO무릎부담 전신유산소 근력 다이어트 [칼소폭 올인원]',
    flowTitle: 'ThankyouBUBU 무릎부담 낮춘 전신 Flow',
    videoId: 'hesjApxDlj0',
    category: '운동/홈트',
    focus: '무릎 부담을 낮춘 전신 유산소와 근력',
    mode: 'workout',
    tags: ['운동', '전신유산소', '무릎부담낮춤', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'arm-back-shoulder',
    title: '팔뚝살 5cm 줄어드는 다이어트운동 [팔뚝살 등살 가슴 어깨]',
    flowTitle: 'ThankyouBUBU 팔뚝 등살 루틴 Flow',
    videoId: '73IrtWDDby0',
    category: '운동/홈트',
    focus: '팔뚝, 등, 어깨 중심 상체 루틴',
    mode: 'workout',
    tags: ['운동', '상체', '팔뚝', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'waist-8cm',
    title: '허리둘레 8cm 줄어드는 운동 [뱃살 옆구리살]',
    flowTitle: 'ThankyouBUBU 허리둘레 집중 Flow',
    videoId: 'k3MznPQvUEk',
    category: '운동/홈트',
    focus: '허리와 옆구리 중심 코어 루틴',
    mode: 'workout',
    tags: ['운동', '허리', '코어', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: '8min-cardio',
    title: '8분 완벽한 전신유산소 다이어트',
    flowTitle: 'ThankyouBUBU 8분 전신유산소 Flow',
    videoId: 'O87gkL1cKSc',
    category: '운동/홈트',
    focus: '짧은 시간 전신 유산소 루틴',
    mode: 'workout',
    tags: ['운동', '8분', '전신유산소', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: '3min-arm',
    title: '3분 최고의 팔뚝살빼는운동',
    flowTitle: 'ThankyouBUBU 3분 팔뚝 Flow',
    videoId: 'Kl9Dmx86Z0Q',
    category: '운동/홈트',
    focus: '3분 팔뚝 집중 루틴',
    mode: 'workout',
    tags: ['운동', '3분', '팔뚝', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: '3min-abs',
    title: '3분 최고의 복근운동',
    flowTitle: 'ThankyouBUBU 3분 복근 Flow',
    videoId: '6IUL8-nGetA',
    category: '운동/홈트',
    focus: '3분 복근 집중 루틴',
    mode: 'workout',
    tags: ['운동', '3분', '복근', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'lower-belly-8min',
    title: '8분! 아랫뱃살 똥배 빼는 최고의 운동',
    flowTitle: 'ThankyouBUBU 8분 아랫뱃살 Flow',
    videoId: '9xxCFu21CLM',
    category: '운동/홈트',
    focus: '아랫배 중심 복부 루틴',
    mode: 'workout',
    tags: ['운동', '복부', '8분', 'exact-video'],
  },
];

const fitvelyExactVideos: CreatorVideoSpec[] = [
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'body-fat-6kg-method',
    title: '핏블리가 체지방 6kg을 감량한 비법',
    flowTitle: 'FITVELY 체지방 6kg 감량 비법 Flow',
    videoId: 'EQcoKqDO8Ds',
    category: '다이어트/기록',
    focus: '체지방 감량 영상에서 직접 확인한 기준 1개 기록하기',
    mode: 'source-observation',
    actionTitle: '원본 영상에서 확인한 기준 1개 기록',
    tags: ['다이어트', '체지방', '기록', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'carb-reason',
    title: '다이어트할 때 탄수화물을 꼭 먹어야 하는 이유',
    flowTitle: 'FITVELY 탄수화물을 먹어야 하는 이유 Flow',
    videoId: '_h3u30M9ECc',
    category: '다이어트/기록',
    focus: '탄수화물 제한보다 섭취 기준을 세우기',
    mode: 'diet',
    actionTitle: '다음 식사 탄수화물 기준 정하기',
    applicationTarget: '다음 식사 한 끼의 탄수화물 양이나 종류',
    tags: ['다이어트', '탄수화물', '식단', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'three-week-check',
    title: '3주만에 -13kg 감량한 여자의 팩트폭행',
    flowTitle: 'FITVELY 3주 감량 점검 Flow',
    videoId: 'nfdIpPXfIc8',
    category: '다이어트/기록',
    focus: '단기 감량 사례 영상에서 직접 확인한 주장 1개 기록하기',
    mode: 'source-observation',
    actionTitle: '원본 클립에서 확인한 주장 1개 기록',
    tags: ['다이어트', '점검', '습관', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'post-workout-nutrition',
    title: '운동직후 “이것” 섭취 가장 중요, 단백질 아님',
    flowTitle: 'FITVELY 운동직후 섭취 Flow',
    videoId: 'J8YmqzhPS2Q',
    category: '다이어트/기록',
    focus: '운동 후 영양 섭취 기준 만들기',
    mode: 'diet',
    actionTitle: '운동 직후 섭취 기준 정하기',
    applicationTarget: '오늘 운동 직후 섭취 행동 하나',
    tags: ['운동', '영양', '기록', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'carb-amount-shorts',
    title: '탄수화물 얼마나 섭취해야 할까',
    flowTitle: 'FITVELY 오늘 탄수화물 기록 Flow',
    videoId: 't630vnDGIWw',
    category: '다이어트/기록',
    focus: '탄수화물 섭취량을 기록 기반으로 조정하기',
    mode: 'diet',
    actionTitle: '오늘 탄수화물 양 기록하고 조정',
    applicationTarget: '오늘 먹을 탄수화물 양과 기록 방식',
    tags: ['다이어트', '탄수화물', 'shorts', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'after-work-nutrition',
    title: '퇴근 후 운동하는 사람을 위한 영양 섭취 방법과 잘못된 경우 Top3',
    flowTitle: 'FITVELY 퇴근후 운동 영양 Flow',
    videoId: 'zipquv7TErU',
    category: '다이어트/기록',
    focus: '퇴근 후 운동 전후 식사 타이밍 만들기',
    mode: 'diet',
    actionTitle: '퇴근 후 운동 전후 식사 시간 정하기',
    applicationTarget: '퇴근 후 운동 전후 식사 타이밍 하나',
    tags: ['운동', '식단', '퇴근후운동', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'weight-class-method',
    title: '체중 별 다이어트 방법 정리',
    flowTitle: 'FITVELY 체중별 다이어트 Flow',
    videoId: 'qADmhOJemTs',
    category: '다이어트/기록',
    focus: '현재 체중 구간에 맞는 실행 기준 고르기',
    mode: 'diet',
    actionTitle: '현재 체중 구간에 맞는 기준 선택',
    applicationTarget: '현재 체중 구간에 맞는 식사나 운동 기준 하나',
    tags: ['다이어트', '체중구간', '기준', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'bulk-up-method',
    title: '핏블리가 경험하고 알려주는 벌크업 운동 방법',
    flowTitle: 'FITVELY 벌크업 운동표 적용 Flow',
    videoId: 'JurCSqpjl5I',
    category: '운동/홈트',
    focus: '벌크업 운동 기준을 주간 루틴으로 바꾸기',
    mode: 'workout-plan',
    actionTitle: '이번 주 벌크업 운동 기준 정하기',
    tags: ['운동', '벌크업', '루틴', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'workout-order',
    title: '다이어트에 가장 중요한 운동 순서! 유산소 먼저? 무산소 먼저?',
    flowTitle: 'FITVELY 운동 순서 결정 Flow',
    videoId: 'oPBA8E_WtXY',
    category: '운동/홈트',
    focus: '유산소와 무산소 순서를 내 루틴에 적용하기',
    mode: 'workout-plan',
    actionTitle: '유산소·근력 순서를 오늘 루틴에 반영',
    tags: ['운동', '운동순서', '다이어트', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'workout-split-science',
    title: '과학적으로 운동루틴 짜는법',
    flowTitle: 'FITVELY 운동루틴 설계 Flow',
    videoId: '-GJMwcES45A',
    category: '운동/홈트',
    focus: '분할, 세트수, 휴식을 주간 운동표로 정리하기',
    mode: 'workout-plan',
    actionTitle: '이번 주 분할·세트·휴식 기준 정하기',
    tags: ['운동', '루틴설계', '분할법', 'exact-video'],
  },
];

function makeCreatorVideoSpec(video: CreatorVideoSpec): RealSourceSpec {
  const sourceUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const sourceTitle = `${video.title} - ${video.channelSlug === 'thankyou-bubu' ? 'ThankyouBUBU' : '핏블리 FITVELY'}`;
  const isSingleApplication = video.mode === 'diet' || video.mode === 'source-observation';
  const common = {
    channelSlug: video.channelSlug,
    slug: `${video.slugPrefix}-${video.slug}`,
    title: video.flowTitle,
    category: video.category,
    structure_type: (isSingleApplication ? 'checklist' : 'routine') as StructureType,
    anchor_type: (isSingleApplication ? 'none' : 'start_date') as AnchorType,
    source_title: sourceTitle,
    source_url: sourceUrl,
    source_type: 'creator_experience' as SourceType,
    source_precision: 'exact' as SourcePrecision,
    primary_destination: (video.mode === 'workout'
      ? 'calendar'
      : video.mode === 'workout-plan'
        ? 'hybrid'
        : 'sheet') as PrimaryDestination,
    risk_level: 'medical_sensitive' as RiskLevel,
    warning:
      '운동과 체중 관리 콘텐츠는 개인 건강 상태에 따라 맞지 않을 수 있습니다. 통증, 어지러움, 기존 질환이 있으면 중단하고 전문가 상담을 우선하세요.',
    tags: video.tags,
  };

  if (video.mode === 'workout') {
    return {
      ...common,
      conversion_note: `영상 "${video.title}"를 운동 스케줄에 등록하고 한 번 실행하는 단일 체크리스트로 전환했습니다.`,
      sections: ['오늘 운동'],
      actions: [
        {
          title: '운동 스케줄 등록하고 영상 실행',
          why: '사용자가 해야 할 일은 복잡한 체크리스트를 관리하는 것이 아니라 운동할 날짜를 정하고 영상을 한 번 실행하는 것입니다.',
          how: `캘린더 알림: 이 문장은 반복 일정마다 함께 들어가며, 알림만 보고도 준비, 실행, 기록, 중단 조건을 확인할 수 있어야 합니다. 요약: ${video.focus} 영상을 이번 주 반복 일정에 넣고, 오늘 가능한 강도로 1회 따라 합니다. 상세히 보기: FLOW는 운동 순서를 새로 처방하지 않고 준비, 원본 영상 실행, 운동 후 기록만 정리합니다. 준비: 이번 주 운동할 요일과 시간을 정하고 물, 매트, 주변 공간을 준비합니다. 실행: 원본 영상의 자세, 순서, 박자를 보며 무리하지 않는 강도로 따라갑니다. 원본 영상: 정확한 동작 설명과 속도는 YouTube 링크를 열어 확인합니다. 운동 후 기록: 완료 여부, 체감 난이도, 통증이나 어지러움, 다음 회차 강도 조정 메모를 남깁니다. 마무리: 같은 영상을 다음 일정에 반복할지, 휴식하거나 강도를 낮출지 정합니다.`,
          completion_criteria: '운동 스케줄을 등록했고, 원본 영상을 1회 실행한 뒤 완료 여부와 몸 상태 메모를 남겼습니다.',
          caution:
            '통증, 어지러움, 호흡 곤란, 기존 질환 악화가 있으면 즉시 중단하고 전문가 상담을 우선하세요. FLOW의 요약은 원본 영상 실행과 기록을 돕는 메모이며 운동 처방이 아닙니다.',
        },
      ],
    };
  }

  if (video.mode === 'workout-plan') {
    return {
      ...common,
      conversion_note: `영상 "${video.title}"를 운동 기준 결정표에서 고른 뒤 이번 주 운동표에 옮길 기준 1개로 전환했습니다.`,
      sections: ['운동 기준 결정표'],
      actions: [
        {
          title: video.actionTitle ?? '이번 주 운동 기준 정하기',
          why: `${video.focus}는 정보로만 저장하면 실행으로 이어지기 어려우므로 이번 주 운동표의 한 칸으로 옮겨야 합니다.`,
          how: `요약: ${video.focus}를 먼저 운동 기준 결정표에 비교하고, 선택한 기준만 이번 주 운동표에 옮깁니다. 준비: 원본 영상 링크를 열고 결정표와 이번 주 운동표에서 바꿀 칸을 하나 정합니다. 결정표: 원본 영상에서 오늘 비교할 기준 후보 2~3개를 적고 내 일정, 회복, 장비, 목표 조건에 맞는 하나를 고릅니다. 선택 기준: 원본 영상에서 오늘 필요한 순서, 분할, 세트, 휴식, 중량, 식사 타이밍 중 하나만 선택합니다. 결정 후 운동표: 선택한 기준을 이번 주 운동 요일, 회차 순서, 적용 부위, 세트/휴식 메모 중 필요한 칸에 적습니다. 원본 영상: 기준을 고른 이유와 예외는 YouTube 링크를 열어 확인합니다. 실행: 오늘 운동에 선택한 기준을 적용하고 무리하지 않는 강도로 진행합니다. 기록: 결정표에 남긴 선택 기준, 실제 수행 여부, 피로도, 통증/호흡 문제, 다음 회차 조정 메모를 남깁니다. 수정 조건: 통증, 과한 피로, 호흡 곤란, 회복 부족, 일정 충돌이 있으면 중단하거나 주간 운동표를 수정하고 전문가 상담을 우선합니다.`,
          completion_criteria: '이번 주 운동표에 적용할 기준 1개를 적고, 오늘 운동 후 수행 여부와 다음 회차 수정 여부를 기록했습니다.',
          caution:
            '통증, 과한 피로, 호흡 곤란, 회복 부족, 기존 질환 악화가 있으면 중단하고 전문가 상담을 우선하세요. FLOW는 원본 영상의 운동 기준을 주간 계획 메모로 옮기는 도구이며 운동 처방이 아닙니다.',
        },
      ],
    };
  }

  if (video.mode === 'source-observation') {
    return {
      ...common,
      structure_type: 'checklist',
      anchor_type: 'none',
      conversion_note: `영상 "${video.title}"에서 직접 확인할 수 있는 기준 1개를 출처 문장과 적용/보류 결정으로 기록하도록 전환했습니다.`,
      sections: ['출처 확인 기록'],
      actions: [
        {
          title: video.actionTitle ?? '원본 영상에서 확인한 기준 1개 기록',
          why: `${video.focus}가 먼저이며, 영상 제목만으로 식사·운동·수면 행동을 새로 처방해서는 안 됩니다.`,
          how: '요약: 영상에서 직접 확인할 수 있는 기준이나 주장 1개만 출처 확인표에 남깁니다. 준비: 원본 영상 링크를 열고 제목이 아니라 실제 영상에서 확인할 문장을 정합니다. 첫 행동: 원본에서 확인한 문장 1개를 그대로 옮기지 말고 짧게 요약합니다. 기준 후보: 영상에서 명시적으로 설명된 행동이나 판단 기준만 후보로 적고, 영상에 없는 식사·운동·수면 축이나 기간·횟수·수치를 만들지 않습니다. 적용 기준: 내 상황에 적용할지는 아직 실행으로 확정하지 않고 적용/보류로 결정합니다. 적용 전 기록: 출처에서 확인한 문장, 확인 시점, 개인 상황과 맞지 않을 수 있는 점을 적습니다. 적용 후 기록: 즉시 행동한 결과가 아니라 적용/보류 결정과 추가로 확인할 질문을 적습니다. 관찰표: 확인일, 출처 문장 요약, 영상 근거, 적용/보류, 개인 메모를 한 행에 기록합니다. 원본 영상: 정확한 맥락과 예외는 YouTube 링크를 열어 확인합니다. 기록: 출처 문장과 적용/보류 결정을 저장합니다. 중단 조건: 극단적 감량, 무리한 제한, 어지러움, 통증, 기존 질환 우려가 있으면 실행하지 말고 전문가 상담을 우선합니다. 마무리: 근거가 충분할 때만 별도의 개인 행동으로 옮기고, 부족하면 보류합니다.',
          completion_criteria: '원본 영상에서 직접 확인한 문장 1개와 적용/보류 결정, 추가 확인할 질문을 관찰표 한 행에 기록했습니다.',
          caution:
            '극단적 감량, 무리한 식사 제한, 어지러움, 통증, 기존 질환 우려가 있으면 실행하지 말고 전문가 상담을 우선하세요. FLOW는 출처 확인 기록을 돕는 도구이며 감량 효과를 보장하지 않습니다.',
        },
      ],
    };
  }

  return {
    ...common,
    conversion_note: `영상 "${video.title}"를 오늘 적용할 한 가지 식단/운동 행동으로 전환했습니다.`,
    sections: ['오늘 적용'],
    actions: [
      {
        title: video.actionTitle ?? '다음 식사 한 끼에 적용할 기준 선택',
        why: `${video.focus}는 정보로 끝나기 쉬우므로 사용자가 바로 할 수 있는 한 가지 행동으로 좁혀야 합니다.`,
        how: `요약: ${video.focus}를 전체 식단 계획이 아니라 오늘 적용할 행동 1개와 관찰표 1행으로 좁힙니다. 준비: 원본 영상 링크를 열고 오늘 확인할 기준 후보만 봅니다. 첫 행동: ${video.applicationTarget ?? '다음 식사 한 끼나 오늘 운동 전후 행동 하나'}에 오늘 한 번 적용할 기준 1개만 고릅니다. 기준 후보: 원본 영상에서 오늘 비교하거나 적용할 기준을 확인하되, 영상 밖의 수치나 식단을 새로 만들지 않습니다. 적용 기준: 선택한 기준을 다음 식사나 운동 전후 행동 한 번에만 반영합니다. 적용 전 기록: 적용할 식사/운동 전후 행동, 시간, 현재 컨디션, 허기나 제한감을 관찰표에 먼저 적습니다. 실행: 선택한 기준을 ${video.applicationTarget ?? '다음 식사 한 끼나 오늘 운동 전후 행동 하나'}에 한 번만 적용합니다. 적용 후 기록: 실제 먹은 음식/시간/양 또는 운동 전후 행동, 몸 상태, 허기나 폭식 유발감, 유지/중단 결정을 같은 행에 적습니다. 관찰표: 날짜, 적용할 식사/운동 전후 행동, 선택 기준, 적용 전 컨디션, 적용 후 반응, 유지/중단 결정을 같은 행에 적습니다. 원본 영상: 기준을 고른 이유와 예외는 YouTube 링크를 열어 확인합니다. 중단 조건: 무리한 제한, 어지러움, 통증, 폭식 유발감, 기존 질환 우려가 있으면 멈추고 전문가 상담을 우선합니다. 마무리: 같은 기준을 한 번 더 적용할지, 수정하거나 중단할지 정합니다.`,
        completion_criteria: '적용 전 컨디션, 실제 적용 내용, 적용 후 반응, 유지/중단 결정을 관찰표 한 행에 기록했습니다.',
        caution:
          '무리한 식사 제한, 어지러움, 통증, 폭식 유발감, 기존 질환 우려가 있으면 중단하고 전문가 상담을 우선하세요. FLOW는 원본 영상의 원칙을 행동 메모로 좁히는 도구이며 감량 효과를 보장하지 않습니다.',
      },
    ],
  };
}

const fitnessCreatorDeepDiveSpecs: RealSourceSpec[] = [
  ...thankyouBubuExactVideos.map(makeCreatorVideoSpec),
  ...fitvelyExactVideos.map(makeCreatorVideoSpec),
];

const realSourceSpecs: RealSourceSpec[] = [
  ...fitnessCreatorDeepDiveSpecs,
  {
    channelSlug: 'samsung-service',
    slug: 'real-samsung-aircon-seasonal-care',
    title: '삼성 에어컨 전문 세척 예약 준비 Flow',
    category: '가전관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '삼성전자서비스 에어컨 세척 서비스 안내',
    source_url: 'https://www.samsungsvc.co.kr/info/maintenance',
    source_type: 'official',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    risk_level: 'low',
    conversion_note: '공식 전문 세척 서비스 안내를 필요 신호 확인, 상담과 예약, 방문 후 확인 순서로 전환했습니다.',
    tags: ['가전관리', '공식출처', '에어컨'],
    sections: ['예약 전 확인', '방문 전 실행'],
    actions: [
      {
        title: '에어컨 모델과 설치 위치 확인',
        why: '세척 가능 범위와 방문 준비물은 모델과 실내기 위치에 따라 달라질 수 있습니다.',
        how: '제품 라벨, 리모컨, 앱 등록 정보를 보고 모델명과 설치 위치를 한 줄로 적어 둡니다.',
        completion_criteria: '모델명, 설치 위치, 실내기 개수를 예약 메모에 남겼습니다.',
      },
      {
        title: '전문 세척 필요 신호 기록',
        why: '냄새, 필터 먼지, 냉방 효율 저하와 사용 기간을 먼저 기록해야 상담 때 필요한 서비스 범위를 설명하기 쉽습니다.',
        how: '가동 시 냄새, 외부 필터 먼지, 냉방 효율 저하, 구매 후 사용 기간을 사진이나 메모로 남깁니다.',
        completion_criteria: '전문 세척 상담에 전달할 상태 신호를 기록했습니다.',
      },
      {
        title: '세척 필요 범위와 비용 확인',
        why: '서비스 범위를 모르면 방문 당일 추가 비용이나 일정 변경이 생길 수 있습니다.',
        how: '삼성전자서비스 안내에서 세척 대상, 제외 항목, 예상 비용 기준을 확인합니다.',
        completion_criteria: '요청할 세척 범위와 예산 상한을 정했습니다.',
      },
      {
        title: '방문 가능 날짜와 연락처 준비',
        why: '예약 단계에서는 방문 가능한 시간대와 현장 연락처가 바로 필요합니다.',
        how: '가족 일정과 관리실 출입 가능 시간을 확인하고 연락 가능한 번호를 정합니다.',
        completion_criteria: '예약 후보 날짜 2개와 현장 연락처 1개를 준비했습니다.',
      },
      {
        title: '세척 후 정상 작동과 누수 여부 기록',
        why: '서비스 직후 확인해야 이상 여부를 빠르게 문의하거나 재점검을 요청할 수 있습니다.',
        how: '냉방을 짧게 가동해 바람, 소음, 냄새, 누수 여부를 확인하고 사진을 남깁니다.',
        completion_criteria: '세척 후 확인 결과와 문의 필요 여부를 기록했습니다.',
      },
    ],
  },
  {
    channelSlug: 'samsung-service',
    slug: 'real-samsung-washer-filter-care',
    title: '삼성 비스포크 AI 콤보 배수필터 청소 Flow',
    category: '가전관리',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '삼성전자서비스 비스포크 AI 콤보 배수필터 청소 안내',
    source_url: 'https://www.samsungsvc.co.kr/solution/1978102',
    source_type: 'official',
    source_precision: 'exact',
    source_published_at: '2024-03-22',
    source_checked_at: '2026-07-12',
    risk_level: 'low',
    conversion_note: '배수필터 청소와 잔수 제거 안내를 반복 관리 루틴으로 전환했습니다.',
    tags: ['가전관리', '공식출처', '세탁기'],
    sections: ['청소 전 준비', '청소 후 확인'],
    actions: [
      {
        title: '전원과 물 배수 상태 확인',
        why: '전원 연결이나 물이 남은 상태에서 필터를 열면 누수나 안전 문제가 생길 수 있습니다.',
        how: '세탁기를 멈추고 전원을 끈 뒤 배수 완료 여부를 확인합니다.',
        completion_criteria: '전원 차단과 배수 완료를 확인했습니다.',
      },
      {
        title: '잔수 제거 도구와 수건 준비',
        why: '배수필터를 열 때 남은 물이 흘러나올 수 있어 바닥 보호가 먼저 필요합니다.',
        how: '낮은 용기, 수건, 장갑을 세탁기 앞에 두고 물 받을 공간을 만듭니다.',
        completion_criteria: '물 받을 용기와 수건을 배치했습니다.',
      },
      {
        title: '배수필터 분리 전 물 넘침 가능성 확인',
        why: '필터를 급하게 열면 한 번에 물이 쏟아질 수 있습니다.',
        how: '안내 순서에 맞춰 잔수 호스나 필터 캡을 천천히 열어 남은 물을 먼저 뺍니다.',
        completion_criteria: '잔수를 천천히 빼고 필터를 열 준비가 됐습니다.',
      },
      {
        title: '필터와 내부 이물질 제거',
        why: '먼지, 동전, 머리카락은 배수 오류와 냄새의 원인이 될 수 있습니다.',
        how: '필터를 꺼내 부드러운 솔로 필터와 내부를 청소하고 보이는 이물질을 제거합니다.',
        completion_criteria: '부드러운 솔로 필터와 내부 청소를 완료했습니다.',
      },
      {
        title: '재조립 후 누수와 오류 코드 확인',
        why: '필터가 덜 잠기면 다음 세탁 때 누수나 배수 오류가 반복될 수 있습니다.',
        how: '필터를 끝까지 잠그고 짧은 헹굼이나 배수 동작으로 물샘과 오류를 확인합니다.',
        completion_criteria: '누수와 오류 코드 없이 정상 동작을 확인했습니다.',
      },
    ],
  },
  {
    channelSlug: 'thankyou-bubu',
    slug: 'real-thankyou-bubu-home-workout-starter',
    title: 'ThankyouBUBU 홈트 시작 Flow',
    category: '운동/홈트',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '전신 다이어트 최고의 운동 [점프 없음, 눕는동작 없음, 반복 없음, 토크 없음] - ThankyouBUBU',
    source_url: 'https://www.youtube.com/watch?v=pcyrlkHXAdE',
    source_type: 'creator_experience',
    source_precision: 'exact',
    risk_level: 'medical_sensitive',
    primary_destination: 'calendar',
    conversion_note: '점프와 눕는 동작을 줄인 전신 운동 영상을 하나의 캘린더 운동 일정과 실행 기록 메모로 전환했습니다.',
    warning: '운동 중 통증이나 어지러움이 있으면 중단하고 전문가 상담을 권장합니다.',
    tags: ['운동', '홈트', 'creator', 'exact-video'],
    sections: ['오늘 운동'],
    actions: [
      {
        title: '점프 없는 전신 홈트 영상 일정에 넣고 실행',
        why: '이 Flow의 목적은 사용자가 새 운동표를 설계하는 것이 아니라, 원본 follow-along 영상을 정한 요일에 열고 무리 없는 강도로 1회 실행하는 것입니다.',
        how: '캘린더 알림: 이 문장은 반복 일정마다 함께 들어가며, 알림만 보고 준비-실행-기록을 시작할 수 있어야 합니다. 요약: 점프, 눕는 동작, 반복, 토크를 줄인 ThankyouBUBU 전신 운동 영상을 이번 주 반복 일정에 넣습니다. 상세히 보기: 준비: 팔을 벌릴 수 있는 공간, 매트, 물, 수건을 준비하고 원본 영상을 엽니다. 실행: FLOW는 동작 순서를 새로 처방하지 않고, 영상의 자세와 박자를 보면서 오늘 가능한 강도로 1회 따라 하도록 정리합니다. 원본 영상: 정확한 동작 설명과 속도는 YouTube 링크를 열어 확인합니다. 운동 후 기록: 완료 여부, 체감 난이도, 통증이나 어지러움, 다음 회차 강도 조정 메모를 남깁니다. 마무리: 같은 영상을 다음 일정에 반복할지, 쉬운 강도로 낮출지 결정합니다.',
        completion_criteria: '캘린더에 운동 일정을 넣고, 원본 영상을 1회 실행한 뒤 완료 여부와 몸 상태 메모를 남겼습니다.',
        caution:
          '통증, 어지러움, 호흡 곤란, 기존 질환 악화가 있으면 즉시 중단하고 전문가 상담을 우선하세요. FLOW는 원본 영상 실행과 기록을 돕는 도구이며 운동 처방이 아닙니다.',
      },
    ],
  },
  {
    channelSlug: 'thankyou-bubu',
    slug: 'real-thankyou-bubu-20min-routine',
    title: 'ThankyouBUBU 20분 반복 운동 Flow',
    category: '운동/홈트',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '전신 다이어트 최고의 운동 [칼소폭 찐 핵핵핵 매운맛] - ThankyouBUBU',
    source_url: 'https://www.youtube.com/watch?v=gSz5n4sLENI',
    source_type: 'creator_experience',
    source_precision: 'exact',
    risk_level: 'medical_sensitive',
    primary_destination: 'calendar',
    conversion_note: '19분가량의 전신 운동 영상을 하나의 주간 반복 일정과 회차별 상태 기록으로 전환했습니다.',
    warning: '운동 중 통증이나 어지러움이 있으면 중단하고 전문가 상담을 권장합니다.',
    tags: ['운동', '루틴', 'creator', 'exact-video'],
    sections: ['오늘 운동'],
    actions: [
      {
        title: '20분 전신 운동 영상 일정에 넣고 실행',
        why: '이 영상은 사용자가 별도 운동표를 설계하기보다 원본 follow-along 영상을 정한 요일에 반복 실행하고, 회차별 난이도를 기록할 때 가장 자연스럽습니다.',
        how: '캘린더 알림: 이 문장은 반복 일정마다 함께 들어가며, 알림만 보고 준비-실행-기록을 시작할 수 있어야 합니다. 요약: ThankyouBUBU의 고강도 전신 운동 영상을 사용자가 고른 요일과 시간의 반복 일정에 넣고 한 회차씩 실행합니다. 상세히 보기: 준비: 운동 전후 여유 시간과 회복 상태를 보고 반복할 요일과 시간을 직접 정하고, 매트, 물, 수건을 준비한 뒤 원본 영상을 엽니다. 실행: FLOW는 동작 순서나 주간 횟수를 새로 만들지 않고, 영상의 자세와 박자를 기준으로 따라 하되 호흡이 과하게 가쁘거나 자세가 무너지면 반복 수와 강도를 낮추도록 안내합니다. 원본 영상: 정확한 동작 설명, 속도, 쉬는 타이밍은 YouTube 링크를 열어 확인합니다. 운동 후 기록: 완료/절반 완료/중단, 체감 난이도 1-5, 통증이나 어지러움, 다음 회차 강도 조정 메모를 남깁니다. 마무리: 회차별 몸 상태를 보고 같은 영상을 다음 일정에 반복할지, 쉬거나 강도를 낮출지 정합니다.',
        completion_criteria: '사용자가 고른 요일에 운동 일정을 넣고, 원본 영상을 실행한 회차마다 완료 상태와 다음 강도 조정 메모를 남겼습니다.',
        caution:
          '통증, 어지러움, 호흡 곤란, 과한 피로, 기존 질환 악화가 있으면 즉시 중단하고 전문가 상담을 우선하세요. FLOW는 원본 영상 실행과 기록을 돕는 도구이며 운동 처방이 아닙니다.',
      },
    ],
  },
  {
    channelSlug: 'fitvely',
    slug: 'real-fitvely-diet-record-routine',
    title: 'FITVELY 식단 기록 루틴 Flow',
    category: '다이어트/기록',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '【영양학】 다이어트 식단, 이 영상으로 g단위 완벽정리 해드림 - FITVELY',
    source_url: 'https://www.youtube.com/watch?v=qcTxaFMWzKs',
    source_type: 'creator_experience',
    source_precision: 'exact',
    primary_destination: 'sheet',
    risk_level: 'medical_sensitive',
    conversion_note: 'FITVELY 영양학 영상을 원본 기준 1개, 식사 관찰표, 주간 조정 메모로 전환했습니다.',
    warning: '체중 감량 목표는 건강 상태에 따라 달라질 수 있으므로 무리한 제한, 폭식 유발감, 어지러움이 있으면 중단하세요.',
    tags: ['다이어트', '기록', 'creator', '관찰표'],
    sections: ['식단 관찰표'],
    actions: [
      {
        title: '식단 기준 1개를 골라 관찰표에 기록',
        why: '단백질, 탄수화물, 식이섬유, 지방 기준을 한꺼번에 바꾸면 처방처럼 보이므로 오늘 한 끼와 컨디션 한 줄만 관찰표에 남깁니다.',
        how: '요약: FITVELY 영양학 영상에서 단백질, 탄수화물, 식이섬유, 지방처럼 오늘 볼 식단 구성 기준 1개만 고르고 엑셀 관찰표에 옮깁니다. 적용 기준: 원본 영상에서 오늘 식사에 적용하거나 비교할 기준 하나를 선택합니다. 관찰표: 날짜, 식사 메모, 선택한 기준, 컨디션, 다음 조정 메모를 같은 행에 적습니다. 원본 영상: 기준을 고른 이유와 예외는 YouTube 링크를 열어 확인합니다. 기록: 오늘 한 끼, 운동/수면/컨디션, 주간 조정 메모 중 필요한 행만 채웁니다. 중단 조건: 과한 제한감, 폭식 유발감, 어지러움, 통증, 기존 질환 우려가 있으면 적용을 멈추고 전문가 상담을 우선합니다.',
        completion_criteria: '오늘 식사 1개 이상에 대해 선택한 식단 기준, 식사 메모, 컨디션, 다음 조정 메모를 관찰표에 남겼습니다.',
        caution:
          '무리한 식사 제한, 폭식 유발감, 어지러움, 통증, 기존 질환 우려가 있으면 중단하고 전문가 상담을 우선하세요. FLOW는 원본 영상의 기준을 관찰표로 옮기는 도구이며 감량 효과를 보장하지 않습니다.',
      },
    ],
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
    source_precision: 'broad',
    risk_level: 'medical_sensitive',
    conversion_note: '체중 중심 확인을 주간 행동 지표 점검 루틴으로 바꿨습니다.',
    warning: '체중과 체형 변화는 건강 상태에 따라 다르며 과도한 감량 목표는 피하세요.',
    tags: ['다이어트', '체크인', 'creator'],
    sections: ['측정 준비', '피드백'],
    actions: [
      {
        title: '같은 요일과 시간으로 측정 예약',
        why: '체중과 컨디션은 시간대에 따라 달라져 같은 조건으로 봐야 비교가 가능합니다.',
        how: '기상 후나 운동 전처럼 반복 가능한 시간대를 하나 정해 알림을 둡니다.',
        completion_criteria: '주간 체크 요일과 시간을 고정했습니다.',
      },
      {
        title: '체중보다 행동 지표를 함께 기록',
        why: '체중만 보면 실제로 유지한 식사, 운동, 수면 행동을 놓칠 수 있습니다.',
        how: '체중 옆에 운동 횟수, 기록 일수, 수면 평균을 함께 적습니다.',
        completion_criteria: '숫자 결과와 행동 지표가 같은 표에 기록됐습니다.',
      },
      {
        title: '운동 수행 횟수 확인',
        why: '몸 변화보다 먼저 확인할 것은 계획한 루틴을 실제로 했는지입니다.',
        how: '지난 7일 중 운동 완료 표시가 몇 개인지 세고 빠진 요일을 확인합니다.',
        completion_criteria: '주간 운동 완료 횟수와 누락 요일을 적었습니다.',
      },
      {
        title: '식단 기록 누락 원인 정리',
        why: '누락 원인을 알면 다음 주 기록 방식을 줄이거나 바꿀 수 있습니다.',
        how: '바빠서, 외식, 늦은 식사, 귀찮음처럼 누락 이유를 분류합니다.',
        completion_criteria: '가장 많이 반복된 누락 원인 1개를 골랐습니다.',
      },
      {
        title: '다음 주 유지할 행동 1개 선택',
        why: '여러 목표를 동시에 바꾸면 실천이 흐려지므로 핵심 행동 하나부터 고정합니다.',
        how: '지난주에 실제로 가능했던 행동 중 다음 주에도 반복할 행동 하나를 정합니다.',
        completion_criteria: '다음 주 유지 행동 1개와 실행 요일을 정했습니다.',
      },
    ],
  },
  {
    channelSlug: 'sinagong',
    slug: 'real-sinagong-computer-d30-study',
    title: '2026 시나공 컴활 1급 D-30 학습 Flow',
    category: '자격증 시험',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '2026 한 권으로 끝내는 시나공 컴활 1급 필기+실기',
    source_url: 'https://www.gilbut.co.kr/m/book/view?bookcode=BN004603',
    source_type: 'reference',
    source_precision: 'exact',
    source_published_at: '2025-10-15',
    source_checked_at: '2026-07-12',
    risk_level: 'medium',
    conversion_note: '시나공 컴활 1급 교재 페이지를 D-30 학습표와 오답 기록 루틴으로 전환했습니다.',
    tags: ['자격증', '공부', '컴활'],
    sections: ['D-30 계획', '시험 직전'],
    actions: [
      {
        title: '시험일과 응시 과목 확정',
        why: '시험일까지 남은 날짜와 과목 범위가 정해져야 학습 분량을 나눌 수 있습니다.',
        how: '접수 내역이나 목표 시험일을 확인하고 필기, 실기, 급수를 구분합니다.',
        completion_criteria: '시험일, 급수, 과목 범위를 학습표 상단에 적었습니다.',
      },
      {
        title: '기출과 핵심요약 자료 확보',
        why: 'D-30 학습은 새 이론보다 반복 가능한 기출과 요약 자료가 중심이 됩니다.',
        how: '시나공 사이트나 보유 교재에서 최신 기출, 핵심요약, 실습 파일을 모읍니다.',
        completion_criteria: '기출 세트와 요약 자료 위치를 바로 열 수 있게 저장했습니다.',
      },
      {
        title: '주차별 학습 분량 나누기',
        why: '남은 기간 전체를 보지 않으면 시험 직전 오답과 실전 연습 시간이 부족해집니다.',
        how: '1-2주는 개념과 기출, 3주는 오답, 마지막 주는 실전처럼 배치합니다.',
        completion_criteria: '4주 학습표에 날짜별 분량을 배치했습니다.',
      },
      {
        title: '오답 정리와 재풀이 일정 잡기',
        why: '자격증 시험은 틀린 유형을 다시 맞히는 과정이 점수 상승에 직접 연결됩니다.',
        how: '틀린 문제를 유형별로 묶고 2일 뒤, 1주 뒤 재풀이 날짜를 넣습니다.',
        completion_criteria: '오답 목록과 재풀이 날짜가 함께 기록됐습니다.',
      },
      {
        title: '시험 전 준비물과 시험장 이동 확인',
        why: '시험 직전에는 학습보다 신분증, 시간, 장소 실수를 줄이는 것이 중요합니다.',
        how: '수험표, 신분증, 시험장 주소, 입실 시간을 전날 체크리스트로 정리합니다.',
        completion_criteria: '시험 전날 준비물과 이동 계획을 모두 확인했습니다.',
      },
    ],
  },
  {
    channelSlug: 'sinagong',
    slug: 'real-qnet-application-examday-check',
    title: 'Q-Net 원서접수·응시 준비 Flow',
    category: '자격증 시험',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: 'Q-Net 원서접수안내',
    source_url: 'https://www.q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103',
    source_type: 'official',
    source_precision: 'exact',
    primary_destination: 'memo',
    risk_level: 'medium',
    conversion_note: 'Q-Net 원서접수안내를 날짜를 확정하지 않는 접수·응시 준비 체크로 전환하고 인정 신분증 안내를 해당 항목의 보조 링크로 연결했습니다.',
    tags: ['자격증', '공식출처', 'Q-Net'],
    sections: ['접수 전 확인', '접수 후 확인'],
    actions: [
      {
        title: '응시 자격과 접수 기간 확인',
        why: '응시 자격이나 접수 기간을 놓치면 학습을 해도 시험을 볼 수 없습니다.',
        how: 'Q-Net에서 종목, 회차, 접수 시작과 마감 시간을 확인합니다.',
        completion_criteria: '접수 기간과 응시 자격 확인 결과를 기록했습니다.',
      },
      {
        title: '사진과 기본 정보 준비',
        why: '원서접수 중 사진이나 개인 정보가 준비되지 않으면 원하는 시험장을 놓칠 수 있습니다.',
        how: '증명사진 파일, 연락처, 주소, 학력이나 경력 정보를 미리 확인합니다.',
        completion_criteria: '접수 입력에 필요한 기본 정보를 준비했습니다.',
      },
      {
        title: '접수 완료와 수험표 확인',
        why: '결제 또는 접수 상태가 완료인지 확인해야 시험 당일 문제가 없습니다.',
        how: '접수 후 마이페이지에서 접수 상태, 시험장, 수험번호를 확인합니다.',
        completion_criteria: '접수 완료 화면과 수험표 정보를 저장했습니다.',
      },
      {
        title: '인정 신분증과 준비물 챙기기',
        why: '시험장에서는 인정되는 신분증과 준비물이 없으면 응시가 제한될 수 있습니다.',
        how: 'Q-Net 안내의 신분증 기준과 종목별 준비물을 전날 가방에 넣습니다.',
        completion_criteria: '신분증과 종목별 준비물을 체크했습니다.',
        link_label: 'Q-Net 인정 신분증 범위',
        link_url: 'https://www.q-net.or.kr/rcv002.do?gSite=Q&id=rcv002_identi',
      },
    ],
  },
  {
    channelSlug: 'gov24',
    slug: 'real-gov24-moving-report-check',
    title: '정부24 전입신고 Flow',
    category: '생활행정',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '정부24 전입신고 민원안내',
    source_url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&tp_seq=01',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: '전입신고 민원 안내를 이사 후 신고 준비와 처리 확인 체크리스트로 전환했습니다.',
    tags: ['생활행정', '정부24', '공식출처'],
    sections: ['신고 전 확인', '신고 후 확인'],
    actions: [
      {
        title: '이사일과 신고 기한 확인',
        why: '전입신고는 이사일 기준으로 처리해야 하므로 날짜를 먼저 고정해야 합니다.',
        how: '실제 입주일 또는 이사 완료일을 확인하고 신고 가능한 기간을 메모합니다.',
        completion_criteria: '이사일과 신고 마감 기준을 적었습니다.',
      },
      {
        title: '온라인 신청 가능 여부 확인',
        why: '세대 상황에 따라 온라인 신청이 어려울 수 있어 방문 필요 여부를 먼저 봐야 합니다.',
        how: '정부24 안내에서 온라인 신청 조건과 본인 인증 가능 여부를 확인합니다.',
        completion_criteria: '온라인 신청 또는 주민센터 방문 중 실행 경로를 정했습니다.',
      },
      {
        title: '신분증과 세대 정보 준비',
        why: '신고 과정에서 세대주, 전입자, 기존 주소 같은 정보가 필요합니다.',
        how: '본인 인증 수단, 신분증, 이전 주소, 새 주소, 세대주 정보를 준비합니다.',
        completion_criteria: '신고 입력에 필요한 정보를 한곳에 모았습니다.',
      },
      {
        title: '정부24 또는 주민센터에서 신고 진행',
        why: '정보 준비만으로는 완료가 아니며 실제 신고 접수 상태를 만들어야 합니다.',
        how: '정한 경로로 전입신고를 제출하고 접수 번호나 처리 상태를 확인합니다.',
        completion_criteria: '전입신고 접수 완료 또는 방문 접수 완료를 확인했습니다.',
      },
      {
        title: '처리 결과와 후속 주소 변경 확인',
        why: '전입신고 후에도 은행, 보험, 배송지 같은 주소 변경이 별도로 남습니다.',
        how: '처리 완료 여부를 확인하고 자주 쓰는 서비스의 주소 변경 목록을 만듭니다.',
        completion_criteria: '전입 처리 결과와 후속 주소 변경 목록을 기록했습니다.',
      },
    ],
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
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: '등본 발급 안내를 제출처 요구사항 확인과 발급 후 검수 단계로 전환했습니다.',
    tags: ['생활행정', '정부24', '공식출처'],
    sections: ['발급 전', '발급 후'],
    actions: [
      {
        title: '제출처가 요구하는 등본 종류 확인',
        why: '제출처마다 주민등록등본, 초본, 세대원 표시 여부 요구가 다를 수 있습니다.',
        how: '기관 안내문이나 담당자에게 필요한 서류명과 표시 항목을 확인합니다.',
        completion_criteria: '필요한 서류명과 표시 항목을 메모했습니다.',
      },
      {
        title: '본인 인증 수단 준비',
        why: '온라인 발급은 인증이 막히면 중간에 진행이 멈춥니다.',
        how: '공동인증서, 간편인증, 휴대폰 인증 등 사용 가능한 인증 수단을 확인합니다.',
        completion_criteria: '정부24 로그인과 본인 인증을 완료할 수 있습니다.',
      },
      {
        title: '주민번호 공개 범위 선택',
        why: '불필요한 개인정보 노출을 줄이려면 제출처 요구 범위만 공개해야 합니다.',
        how: '주민번호 뒷자리, 세대원 정보, 주소 변동 사항 공개 여부를 제출처 기준에 맞춥니다.',
        completion_criteria: '공개 범위를 제출처 요구와 맞춰 선택했습니다.',
      },
      {
        title: 'PDF 저장 또는 출력 방식 결정',
        why: '온라인 제출인지 종이 제출인지에 따라 저장 방식과 출력 상태가 달라집니다.',
        how: '제출 방식에 맞춰 PDF 저장, 프린터 출력, 전자문서지갑 중 하나를 선택합니다.',
        completion_criteria: '제출 가능한 파일 또는 출력물을 확보했습니다.',
      },
      {
        title: '제출 전 발급일과 표시 항목 확인',
        why: '발급일 제한이나 표시 항목 오류가 있으면 서류를 다시 받아야 합니다.',
        how: '파일 첫 페이지에서 발급일, 이름, 주소, 공개 범위를 다시 확인합니다.',
        completion_criteria: '발급일과 표시 항목이 제출 조건과 일치합니다.',
      },
    ],
  },
  {
    channelSlug: 'childcare-portal',
    slug: 'real-childcare-vaccination-visit-prep',
    title: '아이사랑 4~6개월 검진·접종 확인 Flow',
    category: '육아/돌봄',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '아이사랑 월령별 성장 및 돌보기 (4~6개월)',
    source_url: 'https://www.childcare.go.kr/?menuno=439',
    source_type: 'official',
    source_precision: 'exact',
    primary_destination: 'memo',
    risk_level: 'medical_sensitive',
    conversion_note: '4~6개월 건강검진과 생후 4개월 예방접종 안내를 공식 정보 확인과 최근 상태·질문 메모로 좁혀 전환했습니다.',
    warning: '검진, 접종, 치료 판단은 의료진 안내를 우선하세요.',
    tags: ['육아', '검진', '공식출처'],
    sections: ['공식 안내 확인', '보호자 메모'],
    actions: [
      {
        title: '4~6개월 건강검진 안내 확인',
        why: '이 출처가 다루는 검진 범위는 4~6개월이므로 아이의 현재 월령과 공식 안내 범위를 먼저 맞춰야 합니다.',
        how: '아이사랑 4~6개월 페이지에서 건강검진 안내를 확인하고, 실제 검진 시기와 항목은 의료기관 안내를 다시 확인합니다.',
        completion_criteria: '아이의 현재 월령과 4~6개월 건강검진 안내를 확인했습니다.',
      },
      {
        title: '생후 4개월 예방접종 안내 확인',
        why: '출처는 생후 4개월 예방접종을 안내하지만 실제 접종 가능 여부와 일정은 의료진 판단이 우선입니다.',
        how: '아이사랑 페이지의 생후 4개월 예방접종 안내를 확인하고, 접종명과 일정은 의료기관에서 다시 확인합니다.',
        completion_criteria: '생후 4개월 예방접종 안내와 의료기관에 추가 확인할 내용을 기록했습니다.',
      },
      {
        title: '최근 상태와 보호자 질문 메모',
        why: '검진이나 접종 판단을 대신하지 않으면서도 최근 상태와 궁금한 점을 정리하면 의료진에게 정확히 전달하기 쉽습니다.',
        how: '최근 체온, 수유, 수면, 평소와 다른 증상과 보호자 질문을 짧게 적고, 판단이나 처방은 의료진에게 확인합니다.',
        completion_criteria: '최근 상태와 의료진에게 확인할 질문을 메모했습니다.',
      },
    ],
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
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: '시간제 보육 이용 안내를 자격 확인, 기관 조회, 예약 실행 체크로 전환했습니다.',
    tags: ['육아', '보육', '공식출처'],
    sections: ['자격 확인', '신청 실행'],
    actions: [
      {
        title: '지원 대상과 이용 조건 확인',
        why: '시간제보육은 대상, 시간, 이용 방식 조건이 맞아야 예약할 수 있습니다.',
        how: '아이사랑 안내에서 연령, 이용 시간, 지원 기준을 확인합니다.',
        completion_criteria: '우리 아이가 이용 가능한 조건인지 판단했습니다.',
      },
      {
        title: '아이사랑 회원가입과 아동 등록 확인',
        why: '예약 전 보호자 계정과 아동 정보가 준비되지 않으면 신청이 지연됩니다.',
        how: '아이사랑 로그인 후 보호자 정보와 아동 등록 상태를 확인합니다.',
        completion_criteria: '예약에 사용할 계정과 아동 정보가 준비됐습니다.',
      },
      {
        title: '이용 가능 기관과 시간 조회',
        why: '가까운 기관이라도 원하는 시간에 자리가 없을 수 있습니다.',
        how: '지역, 날짜, 시간대를 넣어 이용 가능한 기관을 비교합니다.',
        completion_criteria: '후보 기관과 시간대 2개 이상을 골랐습니다.',
      },
      {
        title: '예약과 결제 방식 확인',
        why: '예약 확정 조건과 비용 처리 방식을 알아야 당일 이용에 차질이 없습니다.',
        how: '예약 단계에서 결제, 취소, 준비물 안내를 확인하고 보호자 연락처를 점검합니다.',
        completion_criteria: '예약 완료 또는 예약 가능 조건을 확인했습니다.',
      },
      {
        title: '이용 후 증빙과 다음 예약 기록',
        why: '반복 이용하려면 이용 내역과 아이 반응을 함께 남기는 편이 좋습니다.',
        how: '이용 시간, 결제 내역, 아이 컨디션, 다음 필요 날짜를 적습니다.',
        completion_criteria: '이용 내역과 다음 예약 후보를 기록했습니다.',
      },
    ],
  },
  {
    channelSlug: 'pet-care-note',
    slug: 'real-pet-registration-check',
    title: '반려견 동물등록 준비 Flow',
    category: '반려동물',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '국가동물보호정보시스템 동물등록제도 안내',
    source_url: 'https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66',
    source_type: 'official',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    risk_level: 'medium',
    conversion_note: '현재 동물등록제도 안내의 2개월 이상 반려견 기준과 내장형·외장형 등록 절차를 준비 체크리스트로 전환했습니다.',
    tags: ['반려동물', '등록', '공식출처'],
    sections: ['등록 대상 확인', '등록 후 관리'],
    actions: [
      {
        title: '등록 대상 동물 여부 확인',
        why: '등록 의무와 방식은 동물 종류와 월령에 따라 달라질 수 있습니다.',
        how: '국가동물보호정보시스템에서 주택·준주택 또는 반려 목적으로 기르는 2개월 이상 반려견인지 확인합니다.',
        completion_criteria: '등록 대상 여부와 등록 필요 시점을 확인했습니다.',
      },
      {
        title: '등록 방식과 대행기관 확인',
        why: '내장형, 외장형 등 방식과 대행기관 선택에 따라 방문 준비가 달라집니다.',
        how: '내장형 또는 외장형 중 가능한 방식과 가까운 등록 대행기관을 확인하고, 방문 가능 여부를 미리 문의합니다.',
        completion_criteria: '방문할 기관과 등록 방식을 정했습니다.',
      },
      {
        title: '소유자 정보와 연락처 준비',
        why: '등록 정보가 정확해야 분실이나 변경 신고 때 문제가 줄어듭니다.',
        how: '소유자 이름, 주소, 연락처, 반려동물 이름과 특징을 확인합니다.',
        completion_criteria: '등록 신청에 필요한 기본 정보를 준비했습니다.',
      },
      {
        title: '등록 완료 후 등록번호 보관',
        why: '등록번호는 분실 신고, 정보 변경, 조회 때 반복해서 필요합니다.',
        how: '등록 완료증이나 등록번호를 사진과 메모 앱에 저장합니다.',
        completion_criteria: '등록번호와 기관 정보를 찾기 쉬운 곳에 보관했습니다.',
      },
      {
        title: '주소나 소유자 정보 변경 시 신고 기한 확인',
        why: '등록 후 정보가 바뀌면 변경 신고를 놓치기 쉽습니다.',
        how: '주소, 연락처, 소유자 변경이 생길 때 확인할 신고 경로와 기한을 메모합니다.',
        completion_criteria: '변경 신고가 필요한 상황과 확인 경로를 기록했습니다.',
      },
    ],
  },
  {
    channelSlug: 'pet-care-note',
    slug: 'real-pet-health-visit-routine',
    title: '반려동물 병원 방문 기록 Flow',
    category: '반려동물',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '서울시 우리동네 동물병원',
    source_url: 'https://news.seoul.go.kr/env/archives/567583/',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: '서울시 우리동네 동물병원 안내를 병원 방문 준비물, 필수진료 확인, 방문 후 기록 루틴으로 전환했습니다.',
    tags: ['반려동물', '병원', '기록'],
    sections: ['방문 전', '방문 후'],
    actions: [
      {
        title: '최근 증상과 식욕 변화 기록',
        why: '진료 전 증상 변화를 시간순으로 정리하면 수의사에게 더 정확히 설명할 수 있습니다.',
        how: '식욕, 배변, 활동량, 구토, 기침 등 평소와 다른 점을 날짜와 함께 적습니다.',
        completion_criteria: '최근 증상과 시작 시점을 한눈에 볼 수 있게 정리했습니다.',
      },
      {
        title: '등록번호와 이전 진료 기록 준비',
        why: '반려동물 식별 정보와 이전 처방 이력은 진료 판단의 참고가 됩니다.',
        how: '동물등록번호, 예방접종 기록, 이전 검사 결과나 처방 사진을 준비합니다.',
        completion_criteria: '병원에 보여줄 등록번호와 과거 기록을 챙겼습니다.',
      },
      {
        title: '수의사에게 물어볼 질문 정리',
        why: '진료실에서는 긴장해서 중요한 질문을 놓치기 쉽습니다.',
        how: '증상 원인, 검사 필요 여부, 약 복용법, 재방문 기준을 질문 목록으로 만듭니다.',
        completion_criteria: '진료 중 확인할 질문 3개 이상을 적었습니다.',
      },
      {
        title: '처방과 주의사항 기록',
        why: '약 이름, 용량, 주의사항을 놓치면 집에서 관리가 어려워집니다.',
        how: '처방전, 약 봉투, 수의사 설명을 사진으로 남기고 핵심 주의사항을 적습니다.',
        completion_criteria: '복약 방법과 주의사항을 보호자 기록에 남겼습니다.',
      },
      {
        title: '다음 접종/검진 날짜 저장',
        why: '반려동물 관리는 다음 방문 일정을 놓치지 않는 것이 중요합니다.',
        how: '다음 접종, 재진, 검사 예정일을 캘린더와 기록장에 함께 저장합니다.',
        completion_criteria: '다음 병원 관련 일정이 캘린더에 등록됐습니다.',
      },
    ],
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
    source_precision: 'exact',
    risk_level: 'financial_sensitive',
    conversion_note: '원룸 이사 준비 가이드를 D-30 예약, 정리, 당일 확인 순서로 전환했습니다.',
    tags: ['이사', '주거', '참고출처'],
    sections: ['이사 전', '이사 당일'],
    actions: [
      {
        title: '이사 방식과 예산 범위 정하기',
        why: '원룸 이사는 셀프, 용달, 포장 여부에 따라 비용과 준비가 크게 달라집니다.',
        how: '짐 양, 엘리베이터, 거리, 도움 가능한 사람을 보고 이사 방식을 고릅니다.',
        completion_criteria: '이사 방식과 예산 상한을 정했습니다.',
      },
      {
        title: '업체 예약과 이전 설치 일정 잡기',
        why: '이사일이 가까워질수록 원하는 시간대와 이전 설치 예약이 어려워집니다.',
        how: '이사업체, 인터넷, 정수기, 에어컨 등 이전 설치가 필요한 항목을 함께 예약합니다.',
        completion_criteria: '업체 예약과 이전 설치 일정이 캘린더에 들어갔습니다.',
      },
      {
        title: '짐 정리와 최소 생활 세트 구분',
        why: '짐을 줄이고 마지막까지 쓸 물건을 분리해야 포장 당일 혼란이 줄어듭니다.',
        how: '버릴 것, 가져갈 것, 마지막날 쓸 것 세 구역으로 나눠 포장합니다.',
        completion_criteria: '최소 생활 세트와 먼저 포장할 짐을 구분했습니다.',
      },
      {
        title: '이사 당일 공과금과 하자 사진 체크',
        why: '공과금 정산과 하자 사진은 퇴거 및 입주 분쟁을 줄이는 근거가 됩니다.',
        how: '계량기, 벽지, 바닥, 옵션 상태를 사진으로 찍고 정산 내역을 보관합니다.',
        completion_criteria: '퇴거/입주 상태 사진과 정산 내역을 저장했습니다.',
      },
      {
        title: '전입신고와 후속 주소 변경 확인',
        why: '이사 후 행정과 배송 주소를 바꾸지 않으면 중요한 우편물을 놓칠 수 있습니다.',
        how: '전입신고 후 은행, 보험, 쇼핑몰, 회사 주소 변경 목록을 처리합니다.',
        completion_criteria: '전입신고와 주요 서비스 주소 변경을 완료했습니다.',
      },
    ],
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
    source_precision: 'exact',
    risk_level: 'financial_sensitive',
    conversion_note: '입주청소 가격 정보를 셀프/업체 결정, 견적 비교, 결과 확인 체크로 전환했습니다.',
    tags: ['이사', '청소', '견적'],
    sections: ['견적 전', '청소 후'],
    actions: [
      {
        title: '집 상태와 청소 범위 사진으로 기록',
        why: '견적은 오염 정도와 범위에 따라 달라지므로 사진 근거가 있어야 비교가 쉽습니다.',
        how: '화장실, 주방, 창틀, 바닥, 옵션 가전 상태를 밝은 사진으로 남깁니다.',
        completion_criteria: '견적 요청에 쓸 공간별 사진을 준비했습니다.',
      },
      {
        title: '셀프 청소와 업체 의뢰 기준 정하기',
        why: '직접 할 수 있는 범위를 넘으면 시간과 결과 모두 손해가 날 수 있습니다.',
        how: '입주 전 여유 시간, 오염 정도, 장비 필요 여부를 보고 셀프 또는 업체를 고릅니다.',
        completion_criteria: '셀프 처리 범위와 업체 의뢰 범위를 구분했습니다.',
      },
      {
        title: '평수와 날짜 기준 견적 비교',
        why: '같은 원룸이라도 평수, 날짜, 추가 작업에 따라 견적 차이가 생깁니다.',
        how: '최소 2곳 이상에 같은 사진과 같은 범위로 견적을 요청합니다.',
        completion_criteria: '동일 조건 견적 2개 이상을 비교했습니다.',
      },
      {
        title: '계약 전 포함/제외 범위 확인',
        why: '창틀, 곰팡이, 가전 내부처럼 제외되는 항목이 있으면 추가 비용이 생깁니다.',
        how: '견적서에서 포함 항목, 제외 항목, 추가 비용, 재청소 기준을 확인합니다.',
        completion_criteria: '포함/제외 범위와 추가 비용 기준을 저장했습니다.',
      },
      {
        title: '청소 후 하자와 재청소 요청 사항 기록',
        why: '청소 직후 확인해야 재청소 요청이 가능하고 입주 후 분쟁을 줄일 수 있습니다.',
        how: '계약 범위와 비교해 미흡한 부분을 사진으로 찍고 요청 내용을 정리합니다.',
        completion_criteria: '청소 결과 확인과 재요청 필요 여부를 기록했습니다.',
      },
    ],
  },
  {
    channelSlug: 'travelholic',
    slug: 'real-mofa-overseas-travel-prep',
    title: '외교부 베트남 여행 안전 준비 Flow',
    description: '외교부 해외안전여행의 베트남 국가·지역별 정보를 안전 확인표와 비상 연락처 메모로 정리한 Flow입니다.',
    category: '여행',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '외교부 해외안전여행 베트남 국가/지역별 정보',
    source_url: 'https://www.0404.go.kr/ntnSafetyInfo/86/detail',
    source_type: 'official',
    source_precision: 'exact',
    primary_destination: 'memo',
    creator_name: 'FLOW 큐레이션팀',
    creator_role: '공식자료 큐레이터',
    creator_note: '외교부 베트남 안전정보를 날짜를 만들지 않는 확인표로 정리합니다.',
    risk_level: 'medium',
    conversion_note: '외교부 베트남 국가/지역별 정보를 출국 전 안전 확인과 현지 비상 대비 순서로 전환했습니다.',
    tags: ['여행', '베트남', '안전', '공식출처'],
    sections: ['출국 전', '현지 대비'],
    actions: [
      {
        title: '베트남 여행경보와 안전공지 확인',
        why: '베트남의 위험 수준과 최신 안전공지는 일정과 이동 계획 판단에 직접 영향을 줍니다.',
        how: '외교부 베트남 국가/지역별 정보에서 최신 여행경보와 안전공지를 확인합니다.',
        completion_criteria: '베트남 여행경보 단계, 안전공지, 확인일을 기록했습니다.',
      },
      {
        title: '베트남 현지 주의 지역과 행동 확인',
        why: '같은 국가 안에서도 최근 공지와 지역에 따라 주의할 상황이 달라질 수 있습니다.',
        how: '베트남 국가/지역별 정보의 안전공지와 여행경보 조정 내역에서 일정에 해당하는 지역과 주의 행동을 확인합니다.',
        completion_criteria: '베트남 일정에서 주의할 지역이나 행동을 기록했습니다.',
      },
      {
        title: '주베트남 공관과 긴급 신고 번호 저장',
        why: '현지에서 인터넷이 안 되거나 분실 상황이 생기면 오프라인 연락처가 필요합니다.',
        how: '외교부 페이지에서 영사콜센터, 주베트남대사관 또는 관할 총영사관, 현지 긴급 신고 번호를 확인해 저장합니다.',
        completion_criteria: '베트남 비상 연락처를 휴대폰과 오프라인 메모에 모두 저장했습니다.',
      },
      {
        title: '베트남 비상 연락 카드 오프라인 보관',
        why: '휴대폰 분실이나 통신 장애 때도 공관과 현지 신고 번호를 확인할 수 있어야 합니다.',
        how: '저장한 공관, 영사콜센터, 현지 신고 번호와 숙소 정보를 한 장 메모로 만들어 종이나 오프라인 파일로 보관합니다.',
        completion_criteria: '베트남 여행용 비상 연락 카드를 오프라인에서 열 수 있습니다.',
      },
      {
        title: '베트남 일정과 비상 연락 방법 공유',
        why: '비상 상황에서는 주변 사람이 일정과 연락 방식을 알고 있어야 대응이 빠릅니다.',
        how: '베트남 항공편, 숙소, 주요 이동 일정, 연락 불가 시 사용할 공관 연락처를 가족이나 지인에게 보냅니다.',
        completion_criteria: '가족 또는 지인에게 베트남 일정과 비상 연락법을 공유했습니다.',
      },
    ],
  },
  {
    channelSlug: 'travelholic',
    slug: 'real-kdca-travel-health-check',
    title: '질병관리청 해외여행 건강 Flow',
    category: '여행',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '질병관리청 해외여행 전 건강정보',
    source_url: 'https://kdca.go.kr/kdca/4916/subview.do',
    source_type: 'official',
    source_precision: 'exact',
    source_checked_at: '2026-07-11',
    risk_level: 'medical_sensitive',
    conversion_note: '해외여행 전 건강정보를 감염병 확인, 예방접종 상담, 귀국 후 관찰 루틴으로 전환했습니다.',
    warning: '예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.',
    tags: ['여행', '건강', '공식출처'],
    sections: ['출국 전 건강 확인', '여행 중 기록'],
    actions: [
      {
        title: '방문 국가 감염병 위험 확인',
        why: '국가와 지역에 따라 필요한 예방 조치와 상담 시점이 달라집니다.',
        how: '질병관리청 해외여행 건강정보에서 방문 국가의 감염병 위험을 확인합니다.',
        completion_criteria: '방문 국가별 건강 위험과 확인일을 기록했습니다.',
      },
      {
        title: '필요 예방접종과 상담 일정 확인',
        why: '일부 예방접종은 출국 직전보다 여유를 두고 상담해야 합니다.',
        how: '필요 접종 여부를 확인하고 병원 또는 여행의학 상담 가능 일정을 잡습니다.',
        completion_criteria: '상담 또는 접종 필요 여부와 예약 일정을 정했습니다.',
      },
      {
        title: '복용약과 구급약 준비',
        why: '여행 중 기존 약을 놓치거나 기본 약이 없으면 현지 대응이 어려울 수 있습니다.',
        how: '상시 복용약, 처방전, 기본 구급약, 보관 조건을 체크합니다.',
        completion_criteria: '복용약과 구급약 목록을 짐 목록에 넣었습니다.',
      },
      {
        title: '물과 음식 위생 수칙 정리',
        why: '여행 중 감염 위험은 물, 음식, 손 위생에서 많이 발생합니다.',
        how: '마실 물, 얼음, 길거리 음식, 손 씻기 기준을 여행 메모에 적습니다.',
        completion_criteria: '현지에서 지킬 위생 수칙 3개 이상을 정했습니다.',
      },
      {
        title: '귀국 후 증상 발생 시 기록과 진료 계획 세우기',
        why: '귀국 후 발열이나 설사 같은 증상은 여행력과 함께 설명해야 합니다.',
        how: '증상 시작일, 방문 지역, 먹은 음식, 접촉 정보를 기록하고 진료 기준을 확인합니다.',
        completion_criteria: '귀국 후 이상 증상 발생 시 사용할 기록 양식을 준비했습니다.',
      },
    ],
  },
  {
    channelSlug: 'mobility-life',
    slug: 'real-ts-vehicle-inspection-prep',
    title: 'TS 자동차검사 준비 Flow',
    category: '자동차 관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '한국교통안전공단 정기검사 대상·기준·유효기간 안내',
    source_url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200',
    source_type: 'official',
    source_precision: 'exact',
    source_checked_at: '2026-07-12',
    risk_level: 'medium',
    conversion_note: '자동차검사 절차 안내를 예약 전 차량 점검과 검사 후 정비 기록으로 전환했습니다.',
    tags: ['자동차', '검사', '공식출처'],
    sections: ['검사 전', '검사 후'],
    actions: [
      {
        title: '검사 대상과 예약 가능일 확인',
        why: '자동차검사는 기간을 놓치면 과태료나 운행 차질이 생길 수 있습니다.',
        how: '차량 등록 정보와 검사 안내를 확인해 검사 기간과 예약 가능일을 봅니다.',
        completion_criteria: '검사 기간과 예약 후보 날짜를 기록했습니다.',
      },
      {
        title: '예약 정보와 차량 상태 점검',
        why: '검사소 방문 전 현재 예약 내역과 차량 상태를 확인하면 접수 착오와 재방문 가능성을 줄입니다.',
        how: '차량번호, 검사소, 예약 시각을 확인하고 계기판 경고등, 와이퍼, 경적 등을 점검합니다.',
        completion_criteria: '예약 정보와 기본 작동 상태를 확인했습니다.',
      },
      {
        title: '등화장치와 타이어 상태 확인',
        why: '전조등, 방향지시등, 제동등, 타이어는 검사에서 자주 확인되는 기본 항목입니다.',
        how: '동승자나 벽 반사를 이용해 등화류를 보고 타이어 마모와 공기압을 확인합니다.',
        completion_criteria: '등화류와 타이어 상태를 사진 또는 메모로 남겼습니다.',
      },
      {
        title: '검사소 방문 시간과 결제 준비',
        why: '예약 시간과 결제 수단을 준비해야 대기와 접수 지연을 줄일 수 있습니다.',
        how: '검사소 위치, 예약 시간, 도착 여유 시간, 결제 수단을 확인합니다.',
        completion_criteria: '방문 시간과 결제 수단을 준비했습니다.',
      },
      {
        title: '검사 결과와 정비 필요 항목 기록',
        why: '부적합이나 권고 사항은 정비 일정과 비용으로 바로 연결해야 합니다.',
        how: '검사 결과표를 보관하고 정비가 필요한 항목, 기한, 예상 비용을 적습니다.',
        completion_criteria: '검사 결과와 후속 정비 계획을 기록했습니다.',
      },
    ],
  },
  {
    channelSlug: 'mobility-life',
    slug: 'real-safe-driving-license-renewal',
    title: '안전운전 면허 갱신 Flow',
    category: '자동차 관리',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '한국도로교통공단 운전면허증 발급 가이드',
    source_url: 'https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111',
    source_type: 'official',
    source_precision: 'exact',
    source_checked_at: '2026-07-11',
    risk_level: 'medium',
    conversion_note: '운전면허증 발급 가이드를 갱신 대상 확인, 준비물, 신청 후 기록 체크로 전환했습니다.',
    tags: ['자동차', '면허', '공식출처'],
    sections: ['갱신 전', '방문/신청 후'],
    actions: [
      {
        title: '면허 갱신 또는 적성검사 대상 확인',
        why: '면허 종류와 기간에 따라 단순 갱신인지 적성검사인지 절차가 달라집니다.',
        how: '안전운전 통합민원 또는 면허증 정보를 보고 갱신 기간과 대상 여부를 확인합니다.',
        completion_criteria: '갱신 대상, 기간, 필요한 절차를 확인했습니다.',
      },
      {
        title: '사진과 기존 면허증 준비',
        why: '사진 규격이나 기존 면허증이 준비되지 않으면 신청이 지연됩니다.',
        how: '최근 사진, 기존 면허증, 본인 확인 수단을 준비하고 사진 규격을 확인합니다.',
        completion_criteria: '신청에 필요한 사진과 기존 면허증을 준비했습니다.',
      },
      {
        title: '건강검진 또는 적성검사 필요 여부 확인',
        why: '적성검사 대상이면 건강 관련 확인이 추가로 필요할 수 있습니다.',
        how: '면허 종류와 안내 기준에 따라 건강검진 결과 활용 또는 별도 검사가 필요한지 봅니다.',
        completion_criteria: '건강검진 또는 적성검사 필요 여부를 판단했습니다.',
      },
      {
        title: '온라인/방문 신청 경로 선택',
        why: '수령 방식과 처리 시간은 신청 경로에 따라 달라질 수 있습니다.',
        how: '온라인 신청 가능 여부, 시험장 또는 경찰서 방문 가능 시간, 수령 방법을 비교합니다.',
        completion_criteria: '신청 경로와 방문 또는 수령 일정을 정했습니다.',
      },
      {
        title: '새 면허 수령과 다음 갱신 기한 기록',
        why: '갱신 완료 후 다음 기한을 기록해야 같은 문제를 반복하지 않습니다.',
        how: '새 면허증 정보를 확인하고 다음 갱신 기간을 캘린더에 등록합니다.',
        completion_criteria: '새 면허증 수령과 다음 갱신 알림 등록을 완료했습니다.',
      },
    ],
  },
];

export const realSourceChannelBundles: FlowBundle[] = realSourceSpecs.map(buildBundle);
