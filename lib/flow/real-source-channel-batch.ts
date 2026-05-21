import {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowUser,
  RiskLevel,
  SourcePrecision,
  SourceType,
  StructureType,
} from './types';
import { previewCreatorChannels } from './creator-channel-preview';

const checkedAt = '2026-05-21';
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
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  source_title: string;
  source_url: string;
  source_type: SourceType;
  source_precision: SourcePrecision;
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
      description: `${channel.name} 채널의 실제 출처를 실행 가능한 FLOW로 전환한 항목입니다.`,
      category: spec.category,
      structure_type: spec.structure_type,
      content_type: 'default',
      anchor_type: spec.anchor_type,
      status: 'published',
      source_status: 'real',
      source_precision: spec.source_precision,
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

type CreatorVideoSpec = {
  channelSlug: 'thankyou-bubu' | 'fitvely';
  slugPrefix: string;
  slug: string;
  title: string;
  flowTitle: string;
  videoId: string;
  category: string;
  focus: string;
  mode: 'workout' | 'diet';
  tags: string[];
};

const thankyouBubuExactVideos: CreatorVideoSpec[] = [
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'full-body-no-jump',
    title: '전신 다이어트 최고의 운동',
    flowTitle: 'ThankyouBUBU 전신 다이어트 실천 Flow',
    videoId: 'pcyrlkHXAdE',
    category: '운동/홈트',
    focus: '점프와 눕는 동작을 줄인 전신 루틴',
    mode: 'workout',
    tags: ['운동', '홈트', '전신', 'exact-video'],
  },
  {
    channelSlug: 'thankyou-bubu',
    slugPrefix: 'real-thankyou-bubu-video',
    slug: 'daily-stretch-9min',
    title: '하루 9분 전신 스트레칭 BEST',
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
    title: 'NO관절부담 뱃살 옆구리살 빼는 운동',
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
    title: 'NO무릎부담 전신유산소 근력 다이어트',
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
    title: '팔뚝살 5cm 줄어드는 다이어트운동',
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
    title: '허리둘레 8cm 줄어드는 운동',
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
    title: '8분 아랫뱃살 빼는 최고의 운동',
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
    flowTitle: 'FITVELY 체지방 감량 기준 Flow',
    videoId: 'EQcoKqDO8Ds',
    category: '다이어트/기록',
    focus: '체지방 감량 원칙을 이번 주 기준으로 바꾸기',
    mode: 'diet',
    tags: ['다이어트', '체지방', '기록', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'carb-reason',
    title: '다이어트할 때 탄수화물을 꼭 먹어야 하는 이유',
    flowTitle: 'FITVELY 탄수화물 기준 Flow',
    videoId: '_h3u30M9ECc',
    category: '다이어트/기록',
    focus: '탄수화물 제한보다 섭취 기준을 세우기',
    mode: 'diet',
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
    focus: '단기 감량 사례를 현실적인 점검표로 바꾸기',
    mode: 'diet',
    tags: ['다이어트', '점검', '습관', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'post-workout-nutrition',
    title: '운동직후 섭취가 중요한 것',
    flowTitle: 'FITVELY 운동직후 섭취 Flow',
    videoId: 'J8YmqzhPS2Q',
    category: '다이어트/기록',
    focus: '운동 후 영양 섭취 기준 만들기',
    mode: 'diet',
    tags: ['운동', '영양', '기록', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'carb-amount-shorts',
    title: '탄수화물 얼마나 섭취해야 할까',
    flowTitle: 'FITVELY 탄수화물 양 조정 Flow',
    videoId: 't630vnDGIWw',
    category: '다이어트/기록',
    focus: '탄수화물 섭취량을 기록 기반으로 조정하기',
    mode: 'diet',
    tags: ['다이어트', '탄수화물', 'shorts', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'after-work-nutrition',
    title: '퇴근 후 운동하는 사람을 위한 영양 섭취 방법',
    flowTitle: 'FITVELY 퇴근후 운동 영양 Flow',
    videoId: 'zipquv7TErU',
    category: '다이어트/기록',
    focus: '퇴근 후 운동 전후 식사 타이밍 만들기',
    mode: 'diet',
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
    tags: ['다이어트', '체중구간', '기준', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'bulk-up-method',
    title: '핏블리가 경험하고 알려주는 벌크업 운동 방법',
    flowTitle: 'FITVELY 벌크업 기준 Flow',
    videoId: 'JurCSqpjl5I',
    category: '운동/홈트',
    focus: '벌크업 운동 기준을 주간 루틴으로 바꾸기',
    mode: 'diet',
    tags: ['운동', '벌크업', '루틴', 'exact-video'],
  },
  {
    channelSlug: 'fitvely',
    slugPrefix: 'real-fitvely-video',
    slug: 'workout-order',
    title: '다이어트에 가장 중요한 운동 순서',
    flowTitle: 'FITVELY 운동 순서 결정 Flow',
    videoId: 'oPBA8E_WtXY',
    category: '운동/홈트',
    focus: '유산소와 무산소 순서를 내 루틴에 적용하기',
    mode: 'diet',
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
    mode: 'diet',
    tags: ['운동', '루틴설계', '분할법', 'exact-video'],
  },
];

function makeCreatorVideoSpec(video: CreatorVideoSpec): RealSourceSpec {
  const sourceUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const sourceTitle = `${video.title} - ${video.channelSlug === 'thankyou-bubu' ? 'ThankyouBUBU' : '핏블리 FITVELY'}`;
  const common = {
    channelSlug: video.channelSlug,
    slug: `${video.slugPrefix}-${video.slug}`,
    title: video.flowTitle,
    category: video.category,
    structure_type: 'routine' as StructureType,
    anchor_type: 'start_date' as AnchorType,
    source_title: sourceTitle,
    source_url: sourceUrl,
    source_type: 'creator_experience' as SourceType,
    source_precision: 'exact' as SourcePrecision,
    risk_level: 'medical_sensitive' as RiskLevel,
    warning:
      '운동과 체중 관리 콘텐츠는 개인 건강 상태에 따라 맞지 않을 수 있습니다. 통증, 어지러움, 기존 질환이 있으면 중단하고 전문가 상담을 우선하세요.',
    tags: video.tags,
  };

  if (video.mode === 'workout') {
    return {
      ...common,
      conversion_note: `영상 "${video.title}"를 오늘 실행할 운동 세션, 강도 조절, 완료 기록 루틴으로 전환했습니다.`,
      sections: ['운동 전 준비', '운동 후 기록'],
      actions: [
        {
          title: '영상 열기',
          why: '운동 Flow의 첫 목표는 계획을 세우는 것이 아니라 실제 콘텐츠를 재생 가능한 상태로 만드는 것입니다.',
          how: '제작자 영상 링크를 열고 오늘 할 영상이 맞는지 제목과 길이를 확인합니다. 통증이나 피로가 있으면 재생 전에 중단합니다.',
          completion_criteria: '영상 페이지를 열고 오늘 따라 할 콘텐츠를 확인했습니다.',
        },
        {
          title: '오늘 가능한 방식 선택',
          why: `${video.focus}을 그대로 따라가기 어려운 날에도 초보, 보통, 낮은 강도 중 하나로 정하면 시작 장벽이 낮아집니다.`,
          how: '초보는 속도를 줄이고, 보통은 영상 그대로 따라가며, 낮은 강도는 점프나 부담 동작을 쉬운 동작으로 바꿉니다.',
          completion_criteria: '오늘 실행 방식을 초보, 보통, 낮은 강도 중 하나로 정했습니다.',
        },
        {
          title: `${video.focus} 실행 후 완료 상태 체크`,
          why: '운동 앱처럼 완료, 절반, 못함 중 하나라도 남겨야 다음 실행 여부를 판단할 수 있습니다.',
          how: '영상을 따라 한 뒤 완료, 절반 완료, 못함 중 하나를 고릅니다. 통증이 있으면 완료보다 통증 기록을 우선합니다.',
          completion_criteria: '오늘의 완료 상태를 완료, 절반 완료, 못함 중 하나로 체크했습니다.',
        },
        {
          title: '힘들었던 지점 하나만 표시',
          why: '긴 운동 기록은 부담이 크므로 다음에 조정할 지점 하나만 남기는 편이 반복에 유리합니다.',
          how: '숨이 찼던 구간, 관절 부담이 있던 동작, 따라가기 어려웠던 속도 중 가장 큰 방해 요소 하나만 표시합니다.',
          completion_criteria: '다음에 조정할 지점 1개를 정했습니다.',
        },
        {
          title: '다음 반복 여부 결정',
          why: 'FLOW는 장기 코칭보다 다음 한 번을 정하는 데 집중해야 가볍게 유지됩니다.',
          how: '오늘 완료했으면 같은 영상을 반복하고, 절반 이하였으면 낮은 강도나 짧은 영상으로 바꿀지 정합니다.',
          completion_criteria: '다음에 같은 영상으로 갈지 낮은 강도로 갈지 결정했습니다.',
        },
      ],
    };
  }

  return {
    ...common,
    conversion_note: `영상 "${video.title}"를 식단/운동 앱처럼 기준 선택, 오늘 적용, 7일 리뷰 루틴으로 전환했습니다.`,
    sections: ['기준 선택', '기록과 조정'],
    actions: [
      {
        title: '핵심 기준 확인',
        why: `${video.focus}는 정보로 끝나기 쉬우므로 먼저 오늘 적용할 기준을 하나로 좁혀야 합니다.`,
        how: '영상을 열고 식사량, 탄수화물, 운동 순서, 운동 후 섭취 중 이 Flow가 다루는 핵심 기준을 확인합니다.',
        completion_criteria: '오늘 확인할 핵심 기준 1개를 정했습니다.',
      },
      {
        title: '오늘 적용 방식 선택',
        why: '다이어트 앱처럼 모든 것을 기록하려 하면 부담이 커지므로 오늘 적용 방식 하나만 선택합니다.',
        how: '한 끼에 적용, 운동 전후에 적용, 오늘은 관찰만 하기 중 하나를 고릅니다. 무리한 제한이 필요한 방식은 선택하지 않습니다.',
        completion_criteria: '오늘 적용 방식을 한 끼, 운동 전후, 관찰 중 하나로 정했습니다.',
      },
      {
        title: '한 끼 또는 운동에 적용하고 완료 상태 체크',
        why: '거대한 목표보다 오늘 한 끼나 오늘 운동 순서에 반영해야 사용자가 즉시 도움을 체감할 수 있습니다.',
        how: '선택한 기준을 다음 식사 한 번, 운동 전후 섭취, 유산소/무산소 순서 중 하나에만 적용하고 완료, 절반, 못함 중 하나를 체크합니다.',
        completion_criteria: '오늘 적용 결과를 완료, 절반 완료, 못함 중 하나로 체크했습니다.',
      },
      {
        title: '무리한 제한 신호 확인',
        why: '체중 관리 콘텐츠는 실행성이 높을수록 과도한 제한 위험도 같이 커져 안전 점검이 Flow 안에 있어야 합니다.',
        how: '배고픔, 어지러움, 폭식 충동, 운동 중 통증이 있었는지 확인하고 있으면 강도를 낮추거나 전문가 상담 메모를 남깁니다.',
        completion_criteria: '무리한 제한 신호가 있었는지 예/아니오로 기록했습니다.',
      },
      {
        title: '7일 뒤 유지/수정 결정',
        why: 'FLOW는 상세 코칭보다 기준을 유지할지 바꿀지 정하는 얇은 리뷰만 제공해야 가볍습니다.',
        how: '7일 뒤 식단 기록률, 운동 횟수, 컨디션 중 2개만 보고 같은 기준을 유지할지 낮출지 정합니다.',
        completion_criteria: '7일 뒤 확인할 항목 2개와 유지/수정 판단 기준을 정했습니다.',
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
    title: '삼성 에어컨 계절 세척 준비 Flow',
    category: '가전관리',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '삼성전자서비스 에어컨 세척 서비스 안내',
    source_url: 'https://www.samsungsvc.co.kr/info/maintenance',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'low',
    conversion_note: '공식 세척 서비스 안내를 계절 전 점검과 예약 준비 순서로 전환했습니다.',
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
        title: '필터 오염과 냉방 상태 점검',
        why: '단순 필터 청소로 해결되는 문제인지 전문 세척이 필요한 상태인지 먼저 구분해야 합니다.',
        how: '전원을 끄고 필터 먼지, 냄새, 냉방 약화, 물 맺힘 여부를 체크합니다.',
        completion_criteria: '필터 오염, 냄새, 냉방 상태를 사진이나 메모로 기록했습니다.',
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
    title: '삼성 세탁기 배수필터 관리 Flow',
    category: '가전관리',
    structure_type: 'routine',
    anchor_type: 'start_date',
    source_title: '삼성전자서비스 세탁기 배수필터 청소 안내',
    source_url: 'https://www.samsungsvc.co.kr/solution/1978102',
    source_type: 'official',
    source_precision: 'exact',
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
        how: '필터를 꺼내 흐르는 물로 씻고 내부에 보이는 이물질을 제거합니다.',
        completion_criteria: '필터 세척과 내부 이물질 제거를 완료했습니다.',
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
    source_title: 'ThankyouBUBU YouTube 홈트 채널',
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    source_type: 'creator_experience',
    source_precision: 'broad',
    risk_level: 'medical_sensitive',
    conversion_note: '홈트 채널의 초보자 루틴 성격을 준비, 실행, 기록 루틴으로 전환했습니다.',
    warning: '운동 중 통증이나 어지러움이 있으면 중단하고 전문가 상담을 권장합니다.',
    tags: ['운동', '홈트', 'creator'],
    sections: ['운동 전 준비', '운동 후 기록'],
    actions: [
      {
        title: '운동 가능한 공간과 매트 준비',
        why: '초보자는 동작보다 먼저 미끄럼, 충돌, 소음 같은 환경 리스크를 줄여야 합니다.',
        how: '팔을 벌릴 수 있는 공간을 확보하고 매트, 물, 수건을 손 닿는 곳에 둡니다.',
        completion_criteria: '운동 공간에서 방해 물건을 치우고 매트를 깔았습니다.',
        caution: '채널 단위 출처이므로 특정 영상의 세부 동작은 실행 전 다시 확인하세요.',
      },
      {
        title: '오늘 가능한 강도 선택',
        why: '몸 상태와 맞지 않는 강도는 루틴 지속보다 중단 가능성을 높입니다.',
        how: '초보, 저강도, 전신, 스트레칭 등 현재 컨디션에 맞는 영상을 하나 고릅니다.',
        completion_criteria: '오늘 실행할 영상 1개와 예상 시간을 정했습니다.',
      },
      {
        title: '워밍업과 관절 상태 확인',
        why: '무릎, 허리, 손목 상태를 확인하면 무리한 동작을 미리 피할 수 있습니다.',
        how: '영상 시작 전 가벼운 관절 돌리기와 제자리 걷기로 통증 여부를 봅니다.',
        completion_criteria: '통증 부위와 피해야 할 동작을 메모했습니다.',
      },
      {
        title: '영상 루틴을 무리 없는 범위로 수행',
        why: '처음부터 완벽히 따라 하기보다 중단 없이 끝내는 경험이 더 중요합니다.',
        how: '호흡이 너무 가쁘거나 자세가 무너지면 반복 수를 줄이고 쉬운 동작으로 바꿉니다.',
        completion_criteria: '선택한 루틴을 끝까지 따라 했거나 중단 사유를 기록했습니다.',
      },
      {
        title: '운동 시간과 몸 상태 기록',
        why: '다음 운동 강도는 실제 수행 시간과 다음날 몸 상태를 보고 조정해야 합니다.',
        how: '운동 시간, 난이도, 통증, 다음에 줄이거나 늘릴 동작을 짧게 적습니다.',
        completion_criteria: '운동 기록 1줄과 다음 루틴 조정점을 남겼습니다.',
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
    source_title: 'ThankyouBUBU YouTube 홈트 채널',
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    source_type: 'creator_experience',
    source_precision: 'broad',
    risk_level: 'medical_sensitive',
    conversion_note: '20분 내외 홈트 콘텐츠를 주간 반복 루틴과 난이도 조정 기준으로 전환했습니다.',
    warning: '운동 중 통증이나 어지러움이 있으면 중단하고 전문가 상담을 권장합니다.',
    tags: ['운동', '루틴', 'creator'],
    sections: ['주간 계획', '운동 기록'],
    actions: [
      {
        title: '주 3회 운동 요일 선택',
        why: '반복 운동은 의지보다 캘린더에 고정된 시간이 있을 때 성공률이 높습니다.',
        how: '일주일 중 쉬는 날을 포함해 20분을 낼 수 있는 요일 3개를 고릅니다.',
        completion_criteria: '이번 주 운동 요일 3개를 캘린더에 적었습니다.',
      },
      {
        title: '20분 확보 가능한 시간대 고정',
        why: '운동 전후 정리 시간을 고려하지 않으면 루틴이 자주 밀립니다.',
        how: '운동 20분과 준비 5분을 합쳐 25분 슬롯을 같은 시간대에 배치합니다.',
        completion_criteria: '각 운동일마다 시작 시간을 정했습니다.',
      },
      {
        title: '루틴 전후 스트레칭 포함',
        why: '짧은 운동일수록 바로 강한 동작에 들어가면 관절 부담이 커질 수 있습니다.',
        how: '영상 전 2분, 영상 후 3분 스트레칭을 고정 체크 항목으로 둡니다.',
        completion_criteria: '스트레칭 포함 여부를 운동 기록에 표시했습니다.',
      },
      {
        title: '완료 여부와 난이도 기록',
        why: '다음 주 루틴을 유지할지 바꿀지는 실제 체감 난이도 기록이 있어야 결정할 수 있습니다.',
        how: '완료, 절반 완료, 중단 중 하나와 체감 난이도 1-5를 적습니다.',
        completion_criteria: '운동일마다 완료 상태와 난이도를 기록했습니다.',
      },
      {
        title: '다음 주 강도 유지 또는 조정 결정',
        why: '무리한 증량은 중단을 만들고, 너무 쉬운 루틴은 변화 체감을 줄입니다.',
        how: '3회 중 2회 이상 무리 없이 끝냈으면 유지하거나 조금 늘리고, 아니면 강도를 낮춥니다.',
        completion_criteria: '다음 주 영상 길이 또는 강도 조정 결정을 남겼습니다.',
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
    source_title: 'FITVELY 공식 사이트',
    source_url: 'https://www.fitvely.com/',
    source_type: 'creator_experience',
    source_precision: 'broad',
    risk_level: 'medical_sensitive',
    conversion_note: '다이어트 관리 콘텐츠의 기록 습관을 식사, 운동, 수면 체크 루틴으로 전환했습니다.',
    warning: '체중 감량 목표는 건강 상태에 따라 달라질 수 있으므로 무리한 제한은 피하세요.',
    tags: ['다이어트', '기록', 'creator'],
    sections: ['기록 기준 만들기', '주간 점검'],
    actions: [
      {
        title: '하루 기록 항목 정하기',
        why: '기록 항목이 많으면 오래 못 가고, 적으면 원인을 찾기 어렵습니다.',
        how: '식사 사진, 물, 운동, 수면, 컨디션처럼 하루 5개 이하 항목만 고릅니다.',
        completion_criteria: '매일 적을 항목 목록을 5개 이하로 확정했습니다.',
      },
      {
        title: '식사 사진 또는 메모 남기기',
        why: '정확한 칼로리보다 먹은 시간과 양의 패턴을 보는 것이 초반 지속에 유리합니다.',
        how: '식사 직후 사진을 찍거나 메뉴와 대략적인 양을 한 줄로 적습니다.',
        completion_criteria: '하루 식사 기록이 2회 이상 남았습니다.',
      },
      {
        title: '운동 여부와 수면 시간 기록',
        why: '식단만 보면 체중 변화 원인을 놓치기 쉽고, 수면 부족도 폭식에 영향을 줍니다.',
        how: '운동 여부, 걸음 수나 운동 시간, 잠든 시간과 기상 시간을 함께 적습니다.',
        completion_criteria: '운동과 수면 기록을 같은 날짜에 남겼습니다.',
      },
      {
        title: '폭식이나 결식 패턴 표시',
        why: '문제 행동을 비난하기보다 반복 조건을 찾아야 다음 조정이 가능합니다.',
        how: '야식, 과식, 결식이 있던 날에 이유를 짧게 표시합니다.',
        completion_criteria: '특이 식사 패턴과 원인을 날짜별로 표시했습니다.',
      },
      {
        title: '주간 평균과 다음 조정점 정리',
        why: '하루 결과에 흔들리지 않으려면 일주일 단위로 유지할 행동을 골라야 합니다.',
        how: '7일 기록을 보고 잘 된 행동 1개와 줄일 행동 1개를 선택합니다.',
        completion_criteria: '다음 주에 유지할 행동과 조정할 행동을 각각 1개 정했습니다.',
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
    title: '시나공 컴활 D-30 학습 Flow',
    category: '자격증 시험',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '시나공 컴퓨터활용능력 학습 자료',
    source_url: 'https://www.sinagong.co.kr/',
    source_type: 'reference',
    source_precision: 'broad',
    risk_level: 'medium',
    conversion_note: '자격증 학습 자료 탐색을 시험일까지의 기출, 요약, 오답 루틴으로 전환했습니다.',
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
    title: 'Q-Net 원서접수와 시험당일 Flow',
    category: '자격증 시험',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: 'Q-Net 원서접수시 유의사항',
    source_url: 'https://www.q-net.or.kr/rcv002.do?gSite=L&id=rcv002_identi',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: 'Q-Net 원서접수 유의사항을 접수 전, 접수 완료, 시험당일 체크로 전환했습니다.',
    tags: ['자격증', '공식출처', 'Q-Net'],
    sections: ['접수 전 확인', '시험 당일'],
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
      },
      {
        title: '입실 시간과 시험장 위치 확인',
        why: '시험 당일 지각이나 장소 착오는 복구하기 어렵습니다.',
        how: '지도 앱으로 이동 시간을 확인하고 입실 마감보다 여유 있게 출발 시간을 정합니다.',
        completion_criteria: '시험장 주소, 입실 시간, 출발 시간을 기록했습니다.',
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
    title: '아이사랑 영유아 검진/접종 방문 준비 Flow',
    category: '육아/돌봄',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '아이사랑 월령별 성장 및 돌보기',
    source_url: 'https://www.childcare.go.kr/?menuno=439',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'medical_sensitive',
    conversion_note: '월령별 성장 정보와 방문 준비 항목을 병원 방문 전후 체크로 전환했습니다.',
    warning: '검진, 접종, 치료 판단은 의료진 안내를 우선하세요.',
    tags: ['육아', '검진', '공식출처'],
    sections: ['방문 전', '방문 후'],
    actions: [
      {
        title: '아이 월령과 필요한 검진/접종 확인',
        why: '월령에 따라 확인할 성장 항목과 접종 일정이 달라집니다.',
        how: '아이 생년월일을 기준으로 아이사랑 또는 병원 안내에서 해당 월령 정보를 확인합니다.',
        completion_criteria: '이번 방문에서 확인할 검진 또는 접종 항목을 적었습니다.',
      },
      {
        title: '병원 예약과 문진표 준비',
        why: '문진표를 미리 준비하면 방문 당일 대기와 누락 질문을 줄일 수 있습니다.',
        how: '병원 예약 시간을 잡고 필요한 문진표, 앱 입력, 보호자 정보를 확인합니다.',
        completion_criteria: '예약 시간과 문진표 준비 상태를 확인했습니다.',
      },
      {
        title: '아기수첩과 최근 증상 기록 준비',
        why: '의료진은 이전 접종, 성장 기록, 최근 증상을 함께 보고 판단합니다.',
        how: '아기수첩, 체온 변화, 수유, 수면, 최근 증상을 한 줄씩 적습니다.',
        completion_criteria: '방문 때 보여줄 기록과 수첩을 챙겼습니다.',
      },
      {
        title: '방문 당일 체온과 컨디션 확인',
        why: '접종이나 검진 진행 여부는 당일 컨디션에 따라 달라질 수 있습니다.',
        how: '출발 전 체온, 발열, 설사, 기침, 처방약 복용 여부를 확인합니다.',
        completion_criteria: '당일 컨디션 기록을 병원에 전달할 수 있습니다.',
      },
      {
        title: '접종 후 관찰 사항과 다음 일정 기록',
        why: '방문 후 반응과 다음 예약을 기록해야 이후 상담에서 혼동이 줄어듭니다.',
        how: '접종명, 관찰 안내, 이상 반응 여부, 다음 방문 날짜를 기록합니다.',
        completion_criteria: '방문 결과와 다음 일정을 보호자 기록에 남겼습니다.',
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
    title: '반려동물 등록 준비 Flow',
    category: '반려동물',
    structure_type: 'checklist',
    anchor_type: 'none',
    source_title: '국가동물보호정보시스템 동물등록제도 안내',
    source_url: 'https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66',
    source_type: 'official',
    source_precision: 'exact',
    risk_level: 'medium',
    conversion_note: '동물등록제도 안내를 등록 대상 확인과 등록 후 관리 체크리스트로 전환했습니다.',
    tags: ['반려동물', '등록', '공식출처'],
    sections: ['등록 대상 확인', '등록 후 관리'],
    actions: [
      {
        title: '등록 대상 동물 여부 확인',
        why: '등록 의무와 방식은 동물 종류와 월령에 따라 달라질 수 있습니다.',
        how: '동물등록제도 안내에서 등록 대상 기준을 확인하고 반려동물 정보를 대조합니다.',
        completion_criteria: '등록 대상 여부와 등록 필요 시점을 확인했습니다.',
      },
      {
        title: '등록 방식과 대행기관 확인',
        why: '내장형, 외장형 등 방식과 대행기관 선택에 따라 방문 준비가 달라집니다.',
        how: '가까운 대행기관과 가능한 등록 방식을 확인하고 문의가 필요한 내용을 적습니다.',
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
    source_title: '국가동물보호정보시스템 자주하는 질문',
    source_url: 'https://www.animal.go.kr/front/awtis/faq/faqList.do?menuNo=2000000021',
    source_type: 'reference',
    source_precision: 'broad',
    risk_level: 'medium',
    conversion_note: '반려동물 관련 FAQ를 병원 방문 전 질문 정리와 방문 후 기록 루틴으로 전환했습니다.',
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
    title: '외교부 해외여행 안전 준비 Flow',
    category: '여행',
    structure_type: 'timeline',
    anchor_type: 'end_date',
    source_title: '외교부 해외안전여행',
    source_url: 'https://www.0404.go.kr/',
    source_type: 'official',
    source_precision: 'broad',
    risk_level: 'medium',
    conversion_note: '해외안전여행 정보를 출국 전 안전 확인과 현지 비상 대비 순서로 전환했습니다.',
    tags: ['여행', '안전', '공식출처'],
    sections: ['출국 전', '현지 대비'],
    actions: [
      {
        title: '방문 국가 여행경보 확인',
        why: '국가별 위험 수준은 일정과 보험, 취소 판단에 직접 영향을 줍니다.',
        how: '외교부 해외안전여행에서 방문 국가와 도시의 최신 여행경보를 확인합니다.',
        completion_criteria: '방문 국가의 여행경보 단계와 확인일을 기록했습니다.',
      },
      {
        title: '여권과 비자 조건 확인',
        why: '여권 만료일이나 비자 조건을 놓치면 출국이나 입국이 제한될 수 있습니다.',
        how: '여권 만료일, 입국 가능 기간, 비자 또는 전자허가 필요 여부를 확인합니다.',
        completion_criteria: '여권 유효기간과 입국 조건을 확인했습니다.',
      },
      {
        title: '긴급 연락처와 영사콜센터 저장',
        why: '현지에서 인터넷이 안 되거나 분실 상황이 생기면 오프라인 연락처가 필요합니다.',
        how: '영사콜센터, 현지 공관, 여행 동행자, 보험사 연락처를 휴대폰과 종이에 저장합니다.',
        completion_criteria: '비상 연락처가 휴대폰과 오프라인 메모에 모두 있습니다.',
      },
      {
        title: '보험과 현지 이동 계획 점검',
        why: '사고, 지연, 의료 상황에 대비하려면 보험 범위와 이동 동선이 명확해야 합니다.',
        how: '여행자보험 보장 범위와 공항-숙소 이동, 야간 이동 계획을 확인합니다.',
        completion_criteria: '보험 증서와 주요 이동 경로를 저장했습니다.',
      },
      {
        title: '가족에게 일정과 비상 연락 방법 공유',
        why: '비상 상황에서는 주변 사람이 일정과 연락 방식을 알고 있어야 대응이 빠릅니다.',
        how: '항공편, 숙소, 이동 일정, 연락 불가 시 대체 연락처를 가족에게 보냅니다.',
        completion_criteria: '가족 또는 지인에게 최신 여행 일정과 비상 연락법을 공유했습니다.',
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
    source_url: 'https://www.kdca.go.kr/menu.es?mid=a20102060200',
    source_type: 'official',
    source_precision: 'exact',
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
    source_title: '한국교통안전공단 자동차검사 절차 안내',
    source_url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    source_type: 'official',
    source_precision: 'exact',
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
        title: '등록증과 차량 상태 점검',
        why: '검사소 방문 전 기본 서류와 차량 상태를 확인하면 재방문 가능성을 줄입니다.',
        how: '자동차등록증, 보험, 계기판 경고등, 와이퍼, 경적 등을 확인합니다.',
        completion_criteria: '필수 서류와 기본 작동 상태를 확인했습니다.',
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
    source_url: 'https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111o',
    source_type: 'official',
    source_precision: 'exact',
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
