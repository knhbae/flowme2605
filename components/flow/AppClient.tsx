'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDate, getRangeEnd } from '@/lib/flow/date';
import { inferPrimaryDestination } from '@/lib/flow/destination';
import { buildCalendarIcs, buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } from '@/lib/flow/export';
import { getCreatorChannelSummaries } from '@/lib/flow/creator-channel-preview';
import { parseTextFlow, serializeTextFlow, timingLabel } from '@/lib/flow/parser';
import {
  getBundles,
  getActiveFlowProgress,
  getChecks,
  getItemStates,
  getReactionLogs,
  getStoredAnchor,
  hasDismissedStorageNotice,
  cloneSeedBundles,
  dismissStorageNotice,
  saveBundles,
  saveChecks,
  saveItemStates,
  saveReactionLogs,
  saveStoredAnchor,
} from '@/lib/flow/storage';
import {
  AnchorType,
  ContentType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowItemLinkType,
  FlowItemState,
  FlowUser,
  MealSlot,
  PrimaryDestination,
  ReactionLog,
  Recipe,
  RiskLevel,
  StructureType,
} from '@/lib/flow/types';
import { getCurrentUser, getVirtualUser, findVirtualUserByName, findVirtualUserBySlug } from '@/lib/flow/users';

const categoryPresets = [
  {
    label: '이사',
    category: '이사',
    structure_type: 'timeline' as const,
    content_type: 'default' as const,
    anchor_type: 'end_date' as const,
  },
  {
    label: '이유식',
    category: '육아/이유식',
    structure_type: 'phase' as const,
    content_type: 'meal_plan' as const,
    anchor_type: 'start_date' as const,
  },
  {
    label: '홈트',
    category: '운동/홈트',
    structure_type: 'routine' as const,
    content_type: 'default' as const,
    anchor_type: 'start_date' as const,
  },
  {
    label: '이직',
    category: '커리어/이직',
    structure_type: 'checklist' as const,
    content_type: 'default' as const,
    anchor_type: 'none' as const,
  },
];

const riskLabels: Record<RiskLevel, string> = {
  low: '낮은 위험',
  medium: '주의 필요',
  medical_sensitive: '의료 주의',
  financial_sensitive: '재정 주의',
};

const riskClasses: Record<RiskLevel, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  medical_sensitive: 'border-red-200 bg-red-50 text-red-800',
  financial_sensitive: 'border-teal-200 bg-teal-50 text-teal-800',
};

const categoryColors: Record<string, string> = {
  이사: '#1264F0',
  '육아/이유식': '#A16207',
  '운동/홈트': '#B91C1C',
  '커리어/이직': '#0F766E',
  '여행/해외': '#7C3AED',
  '세금/연말정산': '#4B5563',
  '공부/시험': '#2563EB',
  '공부/영어': '#0F766E',
  '자동차/구매': '#4B5563',
  '자동차/관리': '#0F766E',
  '결혼/준비': '#BE185D',
  '운동/러닝': '#B91C1C',
  '다이어트/습관': '#A16207',
};

const reactionFields: { key: keyof ReactionLog; label: string }[] = [
  { key: 'amount', label: '먹은 양' },
  { key: 'fedAt', label: '먹인 시간' },
  { key: 'skin', label: '피부 반응' },
  { key: 'vomitingOrDiarrhea', label: '구토/설사 여부' },
  { key: 'stool', label: '변 상태' },
  { key: 'sleep', label: '수면 변화' },
  { key: 'preferenceNote', label: '거부/선호 메모' },
];

const linkTypeLabels: Record<string, string> = {
  official: '공식 링크',
  reference: '참고 자료',
  tool: '도구',
  creator: '제작자 링크',
};

const genericCompletionCriteria = '이 항목을 완료했어요.';

function visibleCompletionCriteria(detail?: FlowItemDetail): string | undefined {
  if (!detail?.completion_criteria || detail.completion_criteria === genericCompletionCriteria) return undefined;
  return detail.completion_criteria;
}

function getItemDetail(bundle: FlowBundle, itemId: string): FlowItemDetail | undefined {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function FlowBadges({ bundle, showStatus = false }: { bundle: FlowBundle; showStatus?: boolean }) {
  const { flow } = bundle;
  const visibleRisk = flow.risk_level && flow.risk_level !== 'low' ? flow.risk_level : undefined;
  return (
    <div className="flex flex-wrap gap-2">
      {showStatus ? (
        <Badge className={flow.status === 'published' ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700'}>
          {flow.status === 'published' ? '공개 Flow' : '초안 Flow'}
        </Badge>
      ) : null}
      {flow.source_url ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">✓ 출처 확인됨</Badge> : null}
      {visibleRisk ? (
        <Badge className={riskClasses[visibleRisk]}>{riskLabels[visibleRisk]}</Badge>
      ) : null}
    </div>
  );
}

function FlowHeroMeta({ bundle }: { bundle: FlowBundle }) {
  const count = getFlowItemCount(bundle);
  const anchorLabel = bundle.flow.anchor_type === 'none' ? '바로 체크 시작' : `${getAnchorInputLabel(bundle)} 입력으로 시작`;
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-800">{getFlowDurationLabel(bundle)}</span>
      <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-800">{count}개 항목</span>
      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">{anchorLabel}</span>
    </div>
  );
}

function SourceContentCard({ bundle }: { bundle: FlowBundle }) {
  if (!bundle.flow.source_title && !bundle.flow.source_url) return null;

  const domain = getSourceDomain(bundle.flow.source_url);
  const sourceMeta = [
    domain,
    bundle.flow.source_checked_at ? `${bundle.flow.source_checked_at} 확인` : null,
    bundle.flow.updated_at ? `${formatDate(new Date(bundle.flow.updated_at))} 업데이트` : null,
    getSourcePrecisionLabel(bundle),
  ].filter(Boolean);

  return (
    <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-700">이 Flow는 아래 콘텐츠를 기반으로</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-950">{bundle.flow.source_title ?? '원본 콘텐츠'}</h2>
          <p className="mt-1 text-sm text-gray-500">{sourceMeta.join(' · ')}</p>
          {bundle.flow.conversion_note ? <p className="mt-2 text-sm leading-6 text-gray-600">Flow 전환 방식: {bundle.flow.conversion_note}</p> : null}
        </div>
        {bundle.flow.source_url ? (
          <a className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:border-blue-300 hover:text-blue-700" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
      </div>
    </section>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>진행률</span>
        <span>
          {done} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function slugify(input: string) {
  const ascii = input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `flow-${Date.now()}`;
}

function getStructureLabel(bundle: FlowBundle): string {
  if (bundle.flow.content_type === 'meal_plan') return '식단·레시피형';
  if (bundle.flow.structure_type === 'timeline') return '날짜 역산형';
  if (bundle.flow.structure_type === 'routine') return '반복 루틴형';
  return '체크리스트형';
}

function getAnchorInputLabel(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return '날짜 입력 없음';
  if (bundle.flow.content_type === 'meal_plan') return '이유식 시작일';
  if (bundle.flow.category.includes('건강/검진')) return '검진일';
  if (bundle.flow.category.includes('여행')) return '출국일';
  if (bundle.flow.category.includes('결혼')) return '예식일';
  if (bundle.flow.category.includes('공부/시험') || bundle.flow.category.includes('시험') || bundle.flow.category.includes('자격증')) return '시험일';
  if (bundle.flow.category.includes('자동차/관리')) return '관리 시작일';
  if (bundle.flow.category.includes('이사')) return '이사일';
  if (bundle.flow.category.includes('운동') || bundle.flow.category.includes('러닝')) return '운동 시작일';
  return bundle.flow.anchor_type === 'end_date' ? '목표일' : '시작일';
}

function getAnchorLabel(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return '기준값 없음';
  return `${getAnchorInputLabel(bundle)} 입력`;
}

function getSetupStepTitle(bundle: FlowBundle): string {
  return bundle.flow.anchor_type === 'none' ? '1. 바로 확인' : `1. ${getAnchorInputLabel(bundle)} 입력하기`;
}

function getSetupStepDescription(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return '날짜 입력 없이 바로 확인합니다.';
  return `입력할 날짜: ${getAnchorInputLabel(bundle)}`;
}

function getSetupStepHelp(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return '이 Flow는 날짜 입력이 필요 없는 체크리스트입니다.';
  return `${getAnchorInputLabel(bundle)} 기준으로 날짜가 계산됩니다.`;
}

function hasDatedCalendarSchedule(bundle: FlowBundle): boolean {
  if (bundle.mealSlots?.some((slot) => slot.day_offset !== undefined)) return true;
  return bundle.items.some((item) => item.day_offset !== undefined);
}

function hasCalendarSchedule(bundle: FlowBundle): boolean {
  return hasDatedCalendarSchedule(bundle) || isFitnessExactVideoFlow(bundle);
}

function getFlowResultText(bundle: FlowBundle): string {
  if (bundle.flow.description) return bundle.flow.description;
  if (bundle.flow.structure_type === 'timeline') return '목표 날짜를 기준으로 해야 할 일을 순서대로 실행합니다.';
  if (bundle.flow.structure_type === 'routine') return '정해진 요일과 반복 규칙에 맞춰 루틴을 체크합니다.';
  if (bundle.flow.content_type === 'meal_plan') return '시작일 기준 식단표, 레시피, 반응 기록을 함께 실행합니다.';
  return '단계별 확인 항목을 하나씩 실행합니다.';
}

function getFlowItemCount(bundle: FlowBundle): number {
  return bundle.flow.content_type === 'meal_plan' ? bundle.mealSlots?.length ?? 0 : bundle.items.length;
}

function getFlowDurationLabel(bundle: FlowBundle): string {
  if (bundle.flow.content_type === 'meal_plan') return '첫 식단표 기준';
  if (bundle.flow.structure_type === 'routine') return bundle.repeatRules?.[1]?.replace('@', '') ?? bundle.repeatRules?.[0]?.replace('@', '') ?? '반복 실행';
  const offsets = bundle.items.map((item) => item.day_offset).filter((value): value is number => value !== undefined);
  if (!offsets.length) return '체크리스트';
  const min = Math.min(...offsets);
  const max = Math.max(...offsets);
  if (min < 0 && max <= 0) {
    const days = Math.abs(min);
    if (days >= 90 && days % 30 === 0) return `평균 소요 ${days / 30}개월`;
    return `평균 소요 ${days}일`;
  }
  return `${max - min + 1}일 흐름`;
}

function formatCount(value?: number): string {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0);
}

function getSourceDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getCreatorName(bundle: FlowBundle): string {
  return getCreatorUser(bundle)?.name ?? bundle.flow.creator_name ?? 'FLOW 큐레이션팀';
}

function getCreatorUser(bundle: FlowBundle): FlowUser | undefined {
  return getVirtualUser(bundle.flow.owner_user_id) ?? findVirtualUserByName(bundle.flow.creator_name);
}

function getCreatorRole(bundle: FlowBundle): string | undefined {
  return getCreatorUser(bundle)?.role ?? bundle.flow.creator_role;
}

function getCreatorNote(bundle: FlowBundle): string | undefined {
  return getCreatorUser(bundle)?.bio ?? bundle.flow.creator_note;
}

function getCreatorAvatar(bundle: FlowBundle): string {
  return getCreatorUser(bundle)?.avatar_initial ?? getCreatorName(bundle).slice(0, 1);
}

function getCreatorPath(bundle: FlowBundle): string {
  const user = getCreatorUser(bundle);
  return `/u/${user?.slug ?? creatorSlug(getCreatorName(bundle))}`;
}

function decodeCreatorSlug(value: string): string {
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

function creatorKey(value: string): string {
  return decodeCreatorSlug(value).trim().toLowerCase().replace(/\s+/g, '-');
}

function creatorSlug(name: string): string {
  return creatorKey(name);
}

function normalizeCreatorSlug(slug: string): string {
  return creatorKey(slug);
}

function getFlowTags(bundle: FlowBundle): string[] {
  return bundle.flow.tags ?? [];
}

function getSeedIds(): Set<string> {
  return new Set(cloneSeedBundles().map((bundle) => bundle.flow.id));
}

function isUserOwnedFlow(bundle: FlowBundle, seedIds: Set<string>): boolean {
  const currentUser = getCurrentUser();
  return bundle.flow.owner_user_id === currentUser.id || (!seedIds.has(bundle.flow.id) && !bundle.flow.owner_user_id);
}

function cloneBundleForEditing(bundle: FlowBundle): FlowBundle {
  const id = `flow-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const copied = JSON.parse(JSON.stringify(bundle)) as FlowBundle;

  return {
    ...copied,
    flow: {
      ...copied.flow,
      id,
      slug: `${copied.flow.slug}-copy-${Date.now()}`,
      title: `${copied.flow.title} 사본`,
      status: 'draft',
      raw_text: copied.flow.raw_text ?? serializeTextFlow(copied.sections, copied.items, copied.itemDetails, copied.warnings),
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      created_at: now,
      updated_at: now,
    },
    sections: copied.sections.map((section) => ({ ...section, flow_id: id })),
    items: copied.items.map((item) => ({ ...item, flow_id: id })),
    mealSlots: copied.mealSlots?.map((slot) => ({ ...slot, flow_id: id })),
    recipes: copied.recipes?.map((recipe) => ({ ...recipe, flow_id: id })),
  };
}

function FlowCard({
  bundle,
  variant = 'default',
  editable = false,
  onCopy,
}: {
  bundle: FlowBundle;
  variant?: 'default' | 'compact';
  editable?: boolean;
  onCopy?: (bundle: FlowBundle) => void;
}) {
  const count = getFlowItemCount(bundle);
  const color = categoryColors[bundle.flow.category] ?? '#6B7280';

  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-600">{bundle.flow.category}</span>
          <Badge className="border-gray-200 bg-gray-50 text-gray-600">{getStructureLabel(bundle)}</Badge>
          <Badge
            className={
              bundle.flow.source_status === 'real'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : bundle.flow.source_status === 'preview'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
            }
          >
            {getSourceStatusLabel(bundle)}
          </Badge>
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-snug text-gray-950">
            <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={`/f/${bundle.flow.slug}`}>
              {bundle.flow.title}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{getFlowResultText(bundle)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
              {getCreatorAvatar(bundle)}
            </span>
            <Link className="font-medium underline-offset-2 hover:text-blue-700 hover:underline" href={getCreatorPath(bundle)}>
              by {getCreatorName(bundle)}
            </Link>
            <span>베타 운영 중</span>
            <span>{count}개 항목</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {getFlowTags(bundle).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
        {variant === 'default' ? <p className="text-sm font-medium text-gray-600">{getAnchorLabel(bundle)}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" href={`/f/${bundle.flow.slug}`}>
          시작하기
        </Link>
        {editable ? (
          <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" href={`/flows/${bundle.flow.id}/edit`}>
            편집하기
          </Link>
        ) : onCopy ? (
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => onCopy?.(bundle)}>
            내 버전 만들기
          </button>
        ) : null}
      </div>
    </article>
  );
}

function createEmptyMealBundle({
  id,
  slug,
  title,
  description,
  category,
  anchor_type,
}: {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  anchor_type: AnchorType;
}): FlowBundle {
  const now = new Date().toISOString();
  return {
    flow: {
      id,
      slug,
      title,
      description,
      category,
      structure_type: 'phase',
      content_type: 'meal_plan',
      anchor_type,
      status: 'draft',
      risk_level: 'medical_sensitive',
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      warning:
        '이 Flow는 제작자 경험 기반의 식단표와 레시피를 시작일 기준으로 정리한 것입니다. 아이의 건강 상태, 알레르기, 시작 시기, 재료 선택은 전문가 또는 공식 정보를 확인하세요.',
      created_at: now,
      updated_at: now,
    },
    sections: [{ id: `${id}-phase-1`, flow_id: id, title: '초기 1단계', order: 0 }],
    items: [],
    mealSlots: [],
    recipes: [],
    warnings: [],
  };
}

function createTextBundle({
  id,
  slug,
  title,
  description,
  category,
  structure_type,
  anchor_type,
  initialText,
}: {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  initialText?: string;
}): FlowBundle {
  const now = new Date().toISOString();
  const rawText =
    initialText?.trim() ||
    (structure_type === 'timeline'
      ? '# 새 Flow\n\n## D-30\n- 해야 할 일 D-30\n\n## D-Day\n- 당일 확인 D-Day'
      : structure_type === 'routine'
        ? '@주 3회\n\n## 준비\n- 첫 번째 루틴\n\n## 본 루틴\n@2~3세트\n- 반복할 동작'
        : '## 첫 번째 섹션\n- 확인할 일');
  const parsed = parseTextFlow(rawText, id);

  return {
    flow: {
      id,
      slug,
      title,
      description,
      category,
      structure_type,
      content_type: 'default',
      anchor_type,
      status: 'draft',
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      created_at: now,
      updated_at: now,
      raw_text: rawText,
    },
    ...parsed,
  };
}

function useBundles() {
  const [bundles, setBundles] = useState<FlowBundle[]>(() => cloneSeedBundles());
  useEffect(() => setBundles(getBundles()), []);

  const persist = (next: FlowBundle[]) => {
    setBundles(next);
    saveBundles(next);
  };

  return { bundles, persist };
}

export function FlowList() {
  const { bundles, persist } = useBundles();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '전체';
  const initialTag = searchParams.get('tag') ?? '전체';
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [structure, setStructure] = useState('전체');
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const categories = ['전체', ...Array.from(new Set(bundles.map((bundle) => bundle.flow.category)))];
  const tags = ['전체', ...Array.from(new Set(bundles.flatMap((bundle) => getFlowTags(bundle))))];
  const quickTags = ['블로그 따라하기', 'D-Day 준비', '매일 루틴', '돈이 걸린 결정', '공식확인'];
  const structures = ['전체', '날짜 역산형', '반복 루틴형', '체크리스트형', '식단·레시피형'];
  const filtered = bundles
    .filter((bundle) => {
      const categoryMatched = category === '전체' || bundle.flow.category === category;
      const tagMatched = tag === '전체' || getFlowTags(bundle).includes(tag);
      const structureMatched = structure === '전체' || getStructureLabel(bundle) === structure;
      return categoryMatched && tagMatched && structureMatched;
    })
    .sort((a, b) => {
      if (sort === 'recent') return new Date(b.flow.updated_at).getTime() - new Date(a.flow.updated_at).getTime();
      return (b.flow.usage_count ?? 0) - (a.flow.usage_count ?? 0);
    });
  const copyFlow = (bundle: FlowBundle) => {
    const next = cloneBundleForEditing(bundle);
    persist([...bundles, next]);
    window.location.href = `/flows/${next.flow.id}/edit`;
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:pb-8">
      <PlatformNav />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Explore</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">공개 Flow 탐색</h1>
          <p className="mt-2 text-gray-600">블로그, 유튜브, 개인 경험을 바로 실행할 수 있는 루트로 둘러봅니다.</p>
        </div>
        <Link className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows/new">
          내 콘텐츠로 만들기
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {quickTags.map((item) => (
            <Link
              key={item}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${tag === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
              href={`/flows?tag=${encodeURIComponent(item)}`}
            >
              #{item}
            </Link>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">태그</span>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={tag} onChange={(event) => setTag(event.target.value)}>
              {tags.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">카테고리</span>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Flow 방식</span>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={structure} onChange={(event) => setStructure(event.target.value)}>
              {structures.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">정렬</span>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="popular">인기순</option>
              <option value="recent">최신순</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>{filtered.length}개 Flow</span>
          {tag !== '전체' ? <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">#{tag}</span> : null}
          {category !== '전체' ? <span className="rounded-full bg-gray-50 px-2 py-1 font-medium text-gray-700">{category}</span> : null}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bundle) => (
          <FlowCard key={bundle.flow.id} bundle={bundle} onCopy={copyFlow} />
        ))}
      </div>
    </main>
  );
}

function PlatformNav() {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
      <Link className="text-lg font-semibold tracking-tight text-gray-950" href="/">
        FLOW
      </Link>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-white" href="/flows">
          둘러보기
        </Link>
        <Link className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-white" href="/creators">
          채널
        </Link>
        <Link className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-white" href="/my">
          내 Flow
        </Link>
      </div>
    </nav>
  );
}

function StatCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-semibold text-gray-950`}>{value}</p>
    </div>
  );
}

function getSourceStatusLabel(bundle: FlowBundle) {
  if (bundle.flow.source_status === 'real') return '출처 확인';
  if (bundle.flow.source_status === 'preview') return '샘플';
  if (bundle.flow.source_status === 'needs_review') return '검수 필요';
  return bundle.flow.source_url ? '출처 연결' : '초안';
}

function getSourcePrecisionLabel(bundle: FlowBundle): string | undefined {
  if (bundle.flow.source_precision === 'exact') return '정확한 출처 페이지';
  if (bundle.flow.source_precision === 'broad') return '넓은 출처';
  return undefined;
}

function isFitnessExactVideoFlow(bundle: FlowBundle): boolean {
  return Boolean(bundle.flow.tags?.includes('exact-video') && bundle.flow.source_url?.includes('youtube.com/watch'));
}

function getCreatorBundlePriority(bundle: FlowBundle): number {
  if (bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact') return 0;
  if (bundle.flow.source_status === 'real') return 1;
  if (bundle.flow.source_status === 'needs_review') return 2;
  return 3;
}

export function CreatorDirectory() {
  const { bundles } = useBundles();
  const summaries = getCreatorChannelSummaries(bundles);
  const totalFlows = summaries.reduce((sum, item) => sum + item.flow_count, 0);
  const totalRealFlows = summaries.reduce((sum, item) => sum + item.real_flow_count, 0);
  const totalPreviewFlows = summaries.reduce((sum, item) => sum + item.preview_flow_count, 0);
  const averageScore = Math.round(
    summaries.reduce((sum, item) => sum + item.execution_score, 0) / Math.max(summaries.length, 1),
  );
  const categories = Array.from(new Set(summaries.flatMap((item) => item.specialty_tags))).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <PlatformNav />
      <header className="border-b border-gray-200 pb-6">
        <p className="text-sm font-semibold text-blue-700">Creator Channels</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">제작자 채널</h1>
        <p className="mt-3 max-w-3xl leading-7 text-gray-600">
          채널별 콘텐츠가 실제 실행 Flow로 얼마나 잘 전환되는지 확인하는 미리보기입니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <StatCard label="채널" value={`${summaries.length}`} />
          <StatCard label="Flow화 콘텐츠" value={`${totalFlows}+`} />
          <StatCard label="출처 확인" value={`${totalRealFlows}`} />
          <StatCard label="샘플" value={`${totalPreviewFlows}`} />
          <StatCard label="평균 실행성 점수" value={`${averageScore}`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {category}
            </span>
          ))}
        </div>
      </header>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((channel) => {
          const representativeFlows = bundles
            .filter((bundle) => bundle.flow.owner_user_id === channel.id)
            .sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b))
            .slice(0, 3);

          return (
          <article
            key={channel.id}
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">{channel.channel_type}</p>
                <h2 className="mt-1 text-xl font-semibold">
                  <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={`/u/${channel.slug}`}>
                    {channel.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-gray-600">{channel.role}</p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                {channel.flow_count} flows
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">{channel.bio}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <StatCard label="출처 확인" value={`${channel.real_flow_count}`} compact />
              <StatCard label="샘플" value={`${channel.preview_flow_count}`} compact />
              <StatCard label="실행성 점수" value={`${channel.execution_score}`} compact />
            </div>
            {representativeFlows.length ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500">대표 Flow</p>
                <div className="mt-2 space-y-2">
                  {representativeFlows.map((bundle) => (
                    <Link
                      key={bundle.flow.id}
                      className="block rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                      href={`/f/${bundle.flow.slug}`}
                    >
                      {bundle.flow.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
          );
        })}
      </section>
    </main>
  );
}

export function HomeLanding() {
  const { bundles, persist } = useBundles();
  const featured = [
    'study-exam-d30-plan',
    'wedding-d180-basic',
    'used-car-buying-check',
    'running-5k-4week',
  ]
    .map((slug) => bundles.find((bundle) => bundle.flow.slug === slug))
    .filter(Boolean) as FlowBundle[];
  const timeline = bundles.filter((bundle) => bundle.flow.structure_type === 'timeline').slice(0, 4);
  const routines = bundles.filter((bundle) => bundle.flow.structure_type === 'routine').slice(0, 4);
  const categories = ['공부', '자동차', '결혼', '운동·습관', '육아', '생활서류', '이사', '여행'];
  const copyFlow = (bundle: FlowBundle) => {
    const next = cloneBundleForEditing(bundle);
    persist([...bundles, next]);
    window.location.href = `/flows/${next.flow.id}/edit`;
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:pb-12">
      <PlatformNav />
      <section className="grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-950 md:text-5xl">
            따라하기 쉬운 실행 가이드, Flow
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            읽고 끝냈던 블로그·유튜브를 날짜표와 체크리스트로 바꿔드려요.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-md bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white" href="/flows">
              Flow 둘러보기
            </Link>
            <Link className="inline-flex items-center px-1 py-3 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline" href="/flows/new">
              내 콘텐츠로 Flow 만들기
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">이런 콘텐츠가 Flow가 됩니다</p>
          <div className="mt-4 space-y-3">
            {featured.slice(0, 3).map((bundle) => (
              <Link key={bundle.flow.id} className="block rounded-md border border-gray-200 p-3 hover:border-blue-300" href={`/f/${bundle.flow.slug}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-950">{bundle.flow.title}</p>
                  <span className="shrink-0 text-xs font-medium text-blue-700">{getStructureLabel(bundle)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{getAnchorLabel(bundle)} · {getFlowItemCount(bundle)}개 항목</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">추천</p>
            <h2 className="text-2xl font-semibold">바로 따라할 수 있는 Flow</h2>
          </div>
          <Link className="text-sm font-semibold text-blue-700" href="/flows">전체 보기</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((bundle) => (
            <FlowCard key={bundle.flow.id} bundle={bundle} variant="compact" onCopy={copyFlow} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">카테고리로도 볼 수 있어요</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <Link key={item} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700" href={`/flows?tag=${encodeURIComponent(item)}`}>
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">날짜를 넣으면 달라지는 Flow</h2>
          <div className="mt-4 space-y-3">
            {timeline.map((bundle) => (
              <Link key={bundle.flow.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3" href={`/f/${bundle.flow.slug}`}>
                <span className="font-medium">{bundle.flow.title}</span>
                <span className="text-sm text-gray-500">{getAnchorLabel(bundle)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">반복해서 쌓는 루틴 Flow</h2>
          <div className="mt-4 space-y-3">
            {routines.map((bundle) => (
              <Link key={bundle.flow.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3" href={`/f/${bundle.flow.slug}`}>
                <span className="font-medium">{bundle.flow.title}</span>
                <span className="text-sm text-gray-500">{getAnchorLabel(bundle)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function MyFlows() {
  const { bundles } = useBundles();
  const currentUser = getCurrentUser();
  const seedIds = useMemo(() => getSeedIds(), []);
  const [activeProgress, setActiveProgress] = useState<ReturnType<typeof getActiveFlowProgress>>([]);
  const owned = bundles.filter((bundle) => isUserOwnedFlow(bundle, seedIds));
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'copy'>('all');
  const published = owned.filter((bundle) => bundle.flow.status === 'published');
  const drafts = owned.filter((bundle) => bundle.flow.status === 'draft');
  const copies = owned.filter((bundle) => bundle.flow.title.endsWith('사본') || bundle.flow.slug.includes('-copy-'));
  const totalUsage = owned.reduce((sum, bundle) => sum + (bundle.flow.usage_count ?? 0), 0);
  const totalCopies = owned.reduce((sum, bundle) => sum + (bundle.flow.copy_count ?? 0), 0);
  const filtered = statusFilter === 'published'
    ? published
    : statusFilter === 'draft'
      ? drafts
      : statusFilter === 'copy'
        ? copies
        : owned;
  const tabs = [
    ['all', `전체 ${owned.length}`],
    ['draft', `초안 ${drafts.length}`],
    ['published', `발행됨 ${published.length}`],
    ['copy', `복사본 ${copies.length}`],
  ] as const;

  useEffect(() => {
    setActiveProgress(getActiveFlowProgress());
  }, [bundles]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:pb-8">
      <PlatformNav />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">내 실행 공간</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">내 Flow</h1>
          <p className="mt-2 text-gray-600">진행 중인 Flow와 내 버전으로 만든 Flow가 여기에 모입니다.</p>
        </div>
        <Link className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows">
          Flow 둘러보기
        </Link>
      </div>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-700">
            {currentUser.avatar_initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-700">현재 사용자</p>
            <h2 className="text-xl font-semibold text-gray-950">{currentUser.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{currentUser.bio}</p>
          </div>
          <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" href={`/u/${currentUser.slug}`}>
            내 제작자 프로필
          </Link>
        </div>
      </section>

      {activeProgress.length > 0 ? (
        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">이 브라우저에 저장됨</p>
              <h2 className="text-xl font-semibold">진행 중인 Flow</h2>
            </div>
            <p className="text-sm text-gray-500">로그인 없이 이 기기에만 저장됩니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeProgress.map((progress) => (
              <article key={progress.slug} className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-950">{progress.title}</h3>
                <p className="mt-2 text-sm font-semibold text-blue-700">{progress.done} / {progress.total} 완료</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-[#2563EB]" style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : '0%' }} />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {[progress.anchor ? `기준일 ${progress.anchor}` : null, progress.skipped ? `${progress.skipped}개 제외` : null].filter(Boolean).join(' · ') || '진행 상태 저장됨'}
                </p>
                <Link className="mt-4 inline-flex rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" href={`/f/${progress.slug}`}>
                  이어서 하기
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {owned.length > 0 ? (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['발행 Flow', published.length],
              ['초안', drafts.length],
              ['총 실행', formatCount(totalUsage)],
              ['총 복사', formatCount(totalCopies)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
              </div>
            ))}
          </section>

          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusFilter === id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((bundle) => (
                <FlowCard key={bundle.flow.id} bundle={bundle} editable />
              ))}
            </div>
          ) : (
            <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <h2 className="text-xl font-semibold">이 상태의 Flow가 없습니다</h2>
              <p className="mt-2 text-gray-600">다른 탭을 보거나 새 Flow를 만들어 보세요.</p>
            </section>
          )}
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">아직 만든 내 버전이 없습니다</h2>
          <p className="mt-2 text-gray-600">관심 있는 Flow를 시작하거나, 필요한 경우 내 버전으로 만들어 수정하세요.</p>
          <Link className="mt-5 inline-flex rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows">
            Flow 둘러보기
          </Link>
        </section>
      )}
    </main>
  );
}

export function CreatorProfile({ slug }: { slug: string }) {
  const { bundles } = useBundles();
  const normalized = normalizeCreatorSlug(slug);
  const user = findVirtualUserBySlug(normalized);
  const previewSummary = getCreatorChannelSummaries(bundles).find((item) => item.slug === normalized);
  const creatorBundles = bundles.filter((bundle) => {
    const creator = getCreatorUser(bundle);
    if (user) return creator?.id === user.id;
    return normalizeCreatorSlug(creator?.slug ?? creatorSlug(getCreatorName(bundle))) === normalized;
  }).sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b));
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'preview'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const first = creatorBundles[0];
  const profile = user ?? (first ? getCreatorUser(first) : undefined);
  const totalUsage = creatorBundles.reduce((sum, bundle) => sum + (bundle.flow.usage_count ?? 0), 0);
  const totalCopies = creatorBundles.reduce((sum, bundle) => sum + (bundle.flow.copy_count ?? 0), 0);
  const categories = Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category))).slice(0, 6);
  const allCategories = ['전체', ...Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category)))];
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const visibleCreatorBundles = creatorBundles
    .filter((bundle) => (categoryFilter === '전체' ? true : bundle.flow.category === categoryFilter))
    .filter((bundle) => {
      if (sourceFilter === 'real') return bundle.flow.source_status === 'real';
      if (sourceFilter === 'preview') return bundle.flow.source_status === 'preview';
      return true;
    })
    .filter((bundle) => {
      if (!normalizedLibraryQuery) return true;
      const searchable = [
        bundle.flow.title,
        bundle.flow.description,
        bundle.flow.category,
        bundle.flow.source_title,
        ...(bundle.flow.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedLibraryQuery);
    });
  const exactRealBundles = creatorBundles.filter(
    (bundle) => bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact',
  );
  const recommendedBundles = exactRealBundles.slice(0, 3);

  if (!first && !profile) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-8">
        <PlatformNav />
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">제작자를 찾을 수 없습니다</h1>
          <p className="mt-2 text-gray-600">공개 Flow 탐색에서 다른 제작자를 확인해 보세요.</p>
          <Link className="mt-5 inline-flex rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows">
            공개 Flow 탐색
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:pb-8">
      <PlatformNav />
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-blue-700">
            {profile?.avatar_initial ?? (first ? getCreatorAvatar(first) : '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-700">{profile?.is_current_user ? 'My Creator Profile' : 'Creator'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile?.name ?? (first ? getCreatorName(first) : '제작자')}</h1>
            <p className="mt-2 text-gray-600">{profile?.role ?? (first ? getCreatorRole(first) : '')}</p>
            <p className="mt-3 max-w-3xl leading-7 text-gray-600">{profile?.bio ?? (first ? getCreatorNote(first) : '')}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">공개 Flow</p>
            <p className="mt-1 text-2xl font-semibold">{creatorBundles.length}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">총 실행</p>
            <p className="mt-1 text-2xl font-semibold">{formatCount(totalUsage)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">총 복사</p>
            <p className="mt-1 text-2xl font-semibold">{formatCount(totalCopies)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(profile?.specialty_tags ?? categories).map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{category}</span>
          ))}
        </div>
        {previewSummary ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-7">
            <StatCard label="Flow화 콘텐츠" value={`${previewSummary.flow_count}`} compact />
            <StatCard label="출처 확인" value={`${previewSummary.real_flow_count}`} compact />
            <StatCard label="샘플" value={`${previewSummary.preview_flow_count}`} compact />
            <StatCard label="실행 항목" value={`${previewSummary.executable_item_count}`} compact />
            <StatCard label="앵커 커버리지" value={`${previewSummary.anchor_coverage}%`} compact />
            <StatCard label="출처 커버리지" value={`${previewSummary.source_coverage}%`} compact />
            <StatCard label="실행성 점수" value={`${previewSummary.execution_score}`} compact />
          </section>
        ) : null}
      </header>

      {recommendedBundles.length ? (
        <section className="mt-8 border-y border-gray-200 bg-gray-50 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Exact Source</p>
              <h2 className="mt-1 text-2xl font-semibold">실제 콘텐츠로 바로 시작</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                운동/다이어트 앱처럼 출처가 분명한 콘텐츠를 먼저 고르고, 오늘 실행한 기록과 다음 반복 날짜까지 남기게 구성했습니다.
              </p>
            </div>
            <button
              className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700"
              type="button"
              onClick={() => setSourceFilter('real')}
            >
              실제 Flow만 보기
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {recommendedBundles.map((bundle) => (
              <FlowCard key={`recommended-${bundle.flow.id}`} bundle={bundle} variant="compact" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">Published Flows</p>
            <h2 className="text-2xl font-semibold">채널 Flow 라이브러리</h2>
            <p className="mt-1 text-sm text-gray-600">
              {visibleCreatorBundles.length}개 표시 / 전체 {creatorBundles.length}개
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-700" href="/flows/new">내 콘텐츠로 만들기</Link>
        </div>
        <label className="mb-3 block">
          <span className="text-sm font-semibold text-gray-700">Flow 검색</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="제목, 카테고리, 태그, 출처로 검색"
            value={libraryQuery}
            onChange={(event) => setLibraryQuery(event.target.value)}
          />
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['real', '출처 확인'],
            ['preview', '샘플'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                sourceFilter === key
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => setSourceFilter(key as 'all' | 'real' | 'preview')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {allCategories.map((category) => (
            <button
              key={category}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                categoryFilter === category
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleCreatorBundles.map((bundle) => (
            <FlowCard key={bundle.flow.id} bundle={bundle} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewFlow() {
  const { bundles, persist } = useBundles();
  const [presetKey, setPresetKey] = useState('custom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('공부/시험');
  const [structure, setStructure] = useState<StructureType>('timeline');
  const [contentType, setContentType] = useState<ContentType>('default');
  const [anchor, setAnchor] = useState<AnchorType>('end_date');
  const [sourceText, setSourceText] = useState('');

  const applyPreset = (key: string) => {
    setPresetKey(key);
    if (key === 'custom') return;

    const next = categoryPresets.find((item) => item.label === key);
    if (!next) return;
    setCategory(next.category);
    setStructure(next.structure_type);
    setContentType(next.content_type);
    setAnchor(next.anchor_type);
  };

  const submit = () => {
    const id = `flow-${crypto.randomUUID()}`;
    const safeTitle = title.trim() || '새 실행 Flow';
    const slug = `${slugify(safeTitle)}-${Date.now()}`;
    const bundle =
      contentType === 'meal_plan'
        ? createEmptyMealBundle({
            id,
            slug,
            title: safeTitle,
            description,
            category,
            anchor_type: anchor,
          })
        : createTextBundle({
            id,
            slug,
            title: safeTitle,
            description,
            category,
            structure_type: structure,
            anchor_type: anchor,
            initialText: sourceText,
          });

    persist([...bundles, bundle]);
    window.location.href = `/flows/${id}/edit`;
  };

  const patternCards = [
    {
      id: 'goal',
      title: '목표일 기준으로 준비하기',
      description: '시험, 결혼, 이사처럼 끝나는 날짜가 있고 거꾸로 준비해야 하는 콘텐츠',
      category: '공부/시험',
      structure_type: 'timeline' as const,
      content_type: 'default' as const,
      anchor_type: 'end_date' as const,
      example: '- 기출 1회 풀기 D-14',
    },
    {
      id: 'routine',
      title: '매일·매주 반복하기',
      description: '공부, 운동, 자동차 관리처럼 반복해서 쌓는 루틴 콘텐츠',
      category: '운동/루틴',
      structure_type: 'routine' as const,
      content_type: 'default' as const,
      anchor_type: 'start_date' as const,
      example: '@주 3회',
    },
    {
      id: 'checklist',
      title: '순서대로 체크하기',
      description: '자동차 구매, 서류 준비, 점검처럼 완료 여부가 중요한 콘텐츠',
      category: '생활/체크',
      structure_type: 'checklist' as const,
      content_type: 'default' as const,
      anchor_type: 'none' as const,
      example: '- 계약 전 확인하기',
    },
    {
      id: 'meal',
      title: '식단·레시피로 구성하기',
      description: '이유식, 식단, 요리 루틴처럼 기간표와 레시피가 함께 필요한 콘텐츠',
      category: '식단/레시피',
      structure_type: 'phase' as const,
      content_type: 'meal_plan' as const,
      anchor_type: 'start_date' as const,
      example: 'D+0~D+2 메뉴',
    },
  ];

  const selectPattern = (pattern: (typeof patternCards)[number]) => {
    setPresetKey(pattern.id);
    setCategory(pattern.category);
    setStructure(pattern.structure_type);
    setContentType(pattern.content_type);
    setAnchor(pattern.anchor_type);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <PlatformNav />
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Create</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Flow 만들기</h1>
        <p className="mt-2 text-gray-600">블로그 글, 영상 요약, 개인 노하우를 붙여넣고 실행 순서로 정리합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href="/my">
            제작자 스튜디오
          </Link>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={`/u/${getCurrentUser().slug}`}>
            내 제작자 프로필
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <p className="text-sm font-medium text-gray-500">1. 콘텐츠 넣기</p>
            <h2 className="mt-1 text-xl font-semibold">무엇을 Flow로 만들까요?</h2>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">제목</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 시험 D-30 공부 계획" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">한 줄 설명</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="예: 시험일을 넣으면 남은 30일 공부 순서가 정리됩니다." />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">원본 콘텐츠</span>
            <textarea className="min-h-[260px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder={'블로그 글, 영상 요약, 메모를 붙여넣으세요.\n\n## 준비\n- 해야 할 일 D-30\n- 당일 확인 D-Day'} />
          </label>

          <div>
            <p className="text-sm font-medium text-gray-500">2. 실행 방식 고르기</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {patternCards.map((pattern) => (
                <button
                  key={pattern.id}
                  className={`rounded-lg border p-4 text-left ${presetKey === pattern.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  onClick={() => selectPattern(pattern)}
                >
                  <p className="font-semibold text-gray-950">{pattern.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{pattern.description}</p>
                  <p className="mt-3 rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600">{pattern.example}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <p className="text-sm font-medium text-gray-500">3. 시작 전 확인</p>
            <h2 className="mt-1 text-lg font-semibold">초안 설정</h2>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">카테고리</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={category} onChange={(event) => { setPresetKey('custom'); setCategory(event.target.value); }} />
          </label>
          <details className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">고급 설정</summary>
            <div className="mt-3 space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium">표현 방식</span>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={structure} onChange={(event) => setStructure(event.target.value as StructureType)}>
                  <option value="timeline">날짜 역산 일정표</option>
                  <option value="phase">기간별 식단/단계표</option>
                  <option value="routine">반복 루틴</option>
                  <option value="checklist">단계형 체크리스트</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">기준 날짜</span>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={anchor} onChange={(event) => setAnchor(event.target.value as AnchorType)}>
                  <option value="start_date">시작일 기준</option>
                  <option value="end_date">목표일 기준</option>
                  <option value="baby_age_month">아이 월령 기준</option>
                  <option value="none">날짜 없이 체크</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={contentType === 'meal_plan'} onChange={(event) => setContentType(event.target.checked ? 'meal_plan' : 'default')} />
                식단표와 레시피가 필요한 Flow
              </label>
            </div>
          </details>
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">다음 단계에서 다듬습니다</p>
            <p className="mt-1">항목 제목, 날짜, 반복 규칙, 링크, 완료 기준은 편집 화면에서 바로 수정할 수 있습니다.</p>
          </div>
          <button className="w-full rounded-md bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white" onClick={submit}>
            Flow 초안 만들기
          </button>
        </aside>
      </div>
    </main>
  );
}

export function Editor({ id }: { id: string }) {
  const { bundles, persist } = useBundles();
  const bundle = bundles.find((item) => item.flow.id === id);

  if (!bundle) return <main className="p-8">Flow를 찾을 수 없습니다.</main>;

  const save = (next: FlowBundle) => {
    persist(bundles.map((item) => (item.flow.id === id ? next : item)));
  };

  return bundle.flow.content_type === 'meal_plan' ? (
    <MealPlanEditor bundle={bundle} onSave={save} />
  ) : (
    <TextFlowEditor bundle={bundle} onSave={save} />
  );
}

function TextFlowEditor({ bundle, onSave }: { bundle: FlowBundle; onSave: (bundle: FlowBundle) => void }) {
  const [text, setText] = useState(bundle.flow.raw_text ?? '');
  const [draftItems, setDraftItems] = useState<FlowItem[]>(bundle.items);
  const [draftDetails, setDraftDetails] = useState<FlowItemDetail[]>(bundle.itemDetails ?? []);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastPublished, setLastPublished] = useState(false);
  const parsed = useMemo(() => parseTextFlow(text, bundle.flow.id), [bundle.flow.id, text]);

  useEffect(() => {
    setDraftItems(parsed.items);
    setDraftDetails((details) => {
      const parsedDetails = parsed.itemDetails ?? [];
      const merged = parsed.items.map((item) => {
        const fromText = parsedDetails.find((detail) => detail.item_id === item.id);
        const fromState = details.find((detail) => detail.item_id === item.id);
        return fromText ?? fromState ?? { item_id: item.id };
      });
      return merged.filter(
        (detail) =>
          detail.why ||
          detail.how ||
          detail.completion_criteria ||
          detail.caution ||
          (detail.links?.length ?? 0) > 0,
      );
    });
  }, [parsed.items, parsed.itemDetails]);

  const updateItem = (id: string, patch: Partial<FlowItem>) => {
    setDraftItems((items) => {
      const nextItems = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
      setText(serializeTextFlow(parsed.sections, nextItems, draftDetails, parsed.warnings));
      return nextItems;
    });
  };

  const updateDetail = (id: string, patch: Partial<FlowItemDetail>) => {
    setDraftDetails((details) => {
      const existing = details.find((detail) => detail.item_id === id) ?? { item_id: id };
      const nextDetail = { ...existing, ...patch };
      const nextDetails = [
        ...details.filter((detail) => detail.item_id !== id),
        nextDetail,
      ].filter(
        (detail) =>
          detail.why ||
          detail.how ||
          detail.completion_criteria ||
          detail.caution ||
          (detail.links?.length ?? 0) > 0,
      );
      setText(serializeTextFlow(parsed.sections, draftItems, nextDetails, parsed.warnings));
      return nextDetails;
    });
  };

  const saveDraft = (status = bundle.flow.status) => {
    onSave({
      ...bundle,
      sections: parsed.sections,
      items: draftItems,
      itemDetails: draftDetails,
      repeatRules: parsed.repeatRules,
      warnings: parsed.warnings,
      flow: {
        ...bundle.flow,
        status,
        raw_text: text,
        updated_at: new Date().toISOString(),
      },
    });
    setSaveMessage(status === 'published' ? '발행됨' : '초안 저장됨');
    setLastPublished(status === 'published');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <EditorHeader bundle={bundle} onSave={() => saveDraft()} onPublish={() => saveDraft('published')} />
      {lastPublished ? <PublishSuccessPanel bundle={bundle} /> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">1. 콘텐츠 원문</p>
              <h2 className="text-lg font-semibold">붙여넣은 내용을 정리합니다</h2>
            </div>
            <Badge className="border-gray-200 bg-gray-50 text-gray-700">Markdown</Badge>
          </div>
          <details className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-blue-900">고급 문법 보기</summary>
            <div className="mt-3 grid gap-3 text-blue-950 md:grid-cols-3">
              <div>
                <p className="font-semibold">초급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'## 섹션\n- 할 일 D-3\n- 할 일 D-Day'}</pre>
              </div>
              <div>
                <p className="font-semibold">중급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'- 할 일 D-3\n  done: 완료 기준\n  link: 이름 | URL | official'}</pre>
              </div>
              <div>
                <p className="font-semibold">고급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'- 할 일 D-3\n  why: 왜 필요한가\n  how: 실행 방법\n  caution: 주의사항'}</pre>
              </div>
            </div>
          </details>
          <textarea className="h-[520px] w-full rounded-md border border-gray-300 p-3 font-mono text-sm leading-6" value={text} onChange={(event) => { setText(event.target.value); setSaveMessage(''); }} />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">2. 실행 항목</p>
              <h2 className="text-lg font-semibold">바로 실행할 수 있게 다듬기</h2>
              <p className="mt-1 text-sm text-gray-500">{draftItems.length}개 항목 · 여기서 수정하면 원문에도 반영됩니다.</p>
            </div>
            {saveMessage ? <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">{saveMessage}</span> : null}
          </div>
          <div className="max-h-[520px] space-y-4 overflow-auto pr-1">
            {parsed.sections.map((section) => (
              <div key={section.id} className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{section.title}</h3>
                  <span className="text-xs text-gray-500">
                    {draftItems.filter((item) => item.section_id === section.id).length}개 항목
                  </span>
                </div>
                <div className="space-y-3">
                  {draftItems.filter((item) => item.section_id === section.id).map((item) => (
                    <div key={item.id} className="rounded-md border border-gray-200 bg-white p-3">
                      {(() => {
                        const detail = draftDetails.find((entry) => entry.item_id === item.id);
                        const primaryLink = detail?.links?.[0];
                        return (
                          <>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-gray-500">실행 내용</span>
                        <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                      </label>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">기준일로부터</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" type="number" value={item.day_offset ?? ''} placeholder="-30" onChange={(event) => updateItem(item.id, { day_offset: event.target.value === '' ? undefined : Number(event.target.value) })} />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">기간</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" type="number" value={item.duration_days ?? ''} placeholder="1" onChange={(event) => updateItem(item.id, { duration_days: event.target.value === '' ? undefined : Number(event.target.value) })} />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">반복 규칙</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={item.repeat_rule ?? ''} placeholder="주 3회" onChange={(event) => updateItem(item.id, { repeat_rule: event.target.value || undefined })} />
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        표시 시점: {timingLabel(item.day_offset, item.duration_days) || '기준 없음'}
                      </p>
                      <details className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700">실행 디테일</summary>
                        <div className="mt-3 grid gap-3">
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">왜 필요한가</span>
                            <textarea className="min-h-16 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.why ?? ''} onChange={(event) => updateDetail(item.id, { why: event.target.value })} />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">어떻게 실행하나</span>
                            <textarea className="min-h-16 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.how ?? ''} onChange={(event) => updateDetail(item.id, { how: event.target.value })} />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">완료 기준</span>
                            <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.completion_criteria ?? ''} onChange={(event) => updateDetail(item.id, { completion_criteria: event.target.value })} />
                          </label>
                          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_120px]">
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">링크 이름</span>
                              <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.label ?? ''} placeholder="정부24" onChange={(event) => updateDetail(item.id, { links: [{ label: event.target.value, url: primaryLink?.url ?? '', type: primaryLink?.type ?? 'reference' }] })} />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">URL</span>
                              <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.url ?? ''} placeholder="https://..." onChange={(event) => updateDetail(item.id, { links: [{ label: primaryLink?.label ?? '링크', url: event.target.value, type: primaryLink?.type ?? 'reference' }] })} />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">유형</span>
                              <select className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.type ?? 'reference'} onChange={(event) => updateDetail(item.id, { links: [{ label: primaryLink?.label ?? '링크', url: primaryLink?.url ?? '', type: event.target.value as FlowItemLinkType }] })}>
                                <option value="official">공식</option>
                                <option value="reference">참고</option>
                                <option value="tool">도구</option>
                                <option value="creator">제작자</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      </details>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {parsed.warnings.length > 0 ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{parsed.warnings.join(' / ')}</div> : null}
        </section>
      </div>
      <TextEditorPreview sections={parsed.sections} items={parsed.items} />
    </main>
  );
}

function TextEditorPreview({
  sections,
  items,
}: {
  sections: FlowBundle['sections'];
  items: FlowItem[];
}) {
  return (
    <section data-testid="editor-preview" className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">미리보기</p>
          <h2 className="text-lg font-semibold">공개 페이지 미리보기</h2>
        </div>
        <Badge className="border-gray-200 bg-gray-50 text-gray-700">저장 전 미리보기</Badge>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-md border border-gray-100 p-3">
            <h3 className="font-semibold">{section.title}</h3>
            <div className="mt-2 space-y-2">
              {items.filter((item) => item.section_id === section.id).map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <span className="mt-1 h-4 w-4 rounded border border-gray-300" />
                  <span className="font-mono text-blue-700">{timingLabel(item.day_offset, item.duration_days)}</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MealPlanEditor({ bundle, onSave }: { bundle: FlowBundle; onSave: (bundle: FlowBundle) => void }) {
  const [draft, setDraft] = useState(bundle);
  const [editorTab, setEditorTab] = useState<'slots' | 'recipes' | 'safety' | 'preview'>('slots');
  const [lastPublished, setLastPublished] = useState(false);

  const updateSlot = (id: string, patch: Partial<MealSlot>) => {
    setDraft((value) => ({
      ...value,
      mealSlots: (value.mealSlots ?? []).map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    }));
  };

  const updateRecipe = (id: string, patch: Partial<Recipe>) => {
    setDraft((value) => ({
      ...value,
      recipes: (value.recipes ?? []).map((recipe) => (recipe.id === id ? { ...recipe, ...patch } : recipe)),
    }));
  };

  const addRecipe = () => {
    const recipeId = `${bundle.flow.id}-recipe-${Date.now()}`;
    setDraft((value) => ({
      ...value,
      recipes: [
        ...(value.recipes ?? []),
        {
          id: recipeId,
          flow_id: value.flow.id,
          title: '새 레시피',
          ingredients: [{ name: '재료' }],
          steps: [{ order: 1, text: '조리 순서' }],
          source_type: 'creator_experience',
          risk_level: 'medical_sensitive',
        },
      ],
    }));
  };

  const addSlot = () => {
    const recipe = draft.recipes?.[0];
    setDraft((value) => ({
      ...value,
      mealSlots: [
        ...(value.mealSlots ?? []),
        {
          id: `${value.flow.id}-meal-${Date.now()}`,
          flow_id: value.flow.id,
          section_id: value.sections[0]?.id,
          recipe_id: recipe?.id ?? '',
          day_offset: 0,
          duration_days: 3,
          menu_title: '새 메뉴',
          new_ingredients: [],
          allergy_watch_days: 3,
          order: value.mealSlots?.length ?? 0,
        },
      ],
    }));
  };

  const saveDraft = (status = draft.flow.status) => {
    onSave({
      ...draft,
      flow: { ...draft.flow, status, updated_at: new Date().toISOString() },
    });
    setLastPublished(status === 'published');
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <EditorHeader bundle={draft} onSave={() => saveDraft()} onPublish={() => saveDraft('published')} />
      {lastPublished ? <PublishSuccessPanel bundle={draft} /> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ['slots', '식단표'],
          ['recipes', '레시피'],
          ['safety', '주의문'],
          ['preview', '미리보기'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${editorTab === id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`}
            onClick={() => setEditorTab(id as typeof editorTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {editorTab === 'slots' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">식단 슬롯</h2>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={addSlot}>
              슬롯 추가
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">시작일 기준 며칠 뒤부터 몇 일간 먹일지, 메뉴와 새 재료, 연결 레시피를 정합니다.</p>
          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">기간</th>
                  <th className="p-2">메뉴</th>
                  <th className="p-2">새 재료</th>
                  <th className="p-2">연결된 레시피</th>
                </tr>
              </thead>
              <tbody>
                {(draft.mealSlots ?? []).map((slot) => (
                  <tr key={slot.id} className="border-b">
                    <td className="p-2">
                      <div className="flex gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">D+ 시작</span>
                          <input className="w-20 rounded border px-2 py-1" type="number" value={slot.day_offset} onChange={(event) => updateSlot(slot.id, { day_offset: Number(event.target.value) })} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">며칠간</span>
                          <input className="w-20 rounded border px-2 py-1" type="number" value={slot.duration_days} onChange={(event) => updateSlot(slot.id, { duration_days: Number(event.target.value) })} />
                        </label>
                      </div>
                    </td>
                    <td className="p-2">
                      <input className="w-full rounded border px-2 py-1" value={slot.menu_title} onChange={(event) => updateSlot(slot.id, { menu_title: event.target.value })} />
                    </td>
                    <td className="p-2">
                      <input className="w-full rounded border px-2 py-1" value={slot.new_ingredients.join(', ')} onChange={(event) => updateSlot(slot.id, { new_ingredients: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                    </td>
                    <td className="p-2">
                      <select className="w-full rounded border px-2 py-1" value={slot.recipe_id} onChange={(event) => updateSlot(slot.id, { recipe_id: event.target.value })}>
                        {(draft.recipes ?? []).map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.title}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editorTab === 'recipes' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">레시피 카드</h2>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={addRecipe}>
              레시피 추가
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {(draft.recipes ?? []).map((recipe) => (
              <div key={recipe.id} className="rounded-md border border-gray-200 p-3">
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">레시피 제목</span>
                  <input className="w-full rounded border px-2 py-1 font-semibold" value={recipe.title} onChange={(event) => updateRecipe(recipe.id, { title: event.target.value })} />
                </label>
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">재료 - 한 줄에 하나씩</span>
                  <textarea className="min-h-20 w-full rounded border px-2 py-1 text-sm" value={recipe.ingredients.map((item) => item.name).join('\n')} onChange={(event) => updateRecipe(recipe.id, { ingredients: event.target.value.split('\n').filter(Boolean).map((name) => ({ name })) })} />
                </label>
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">조리 순서 - 한 줄에 하나씩</span>
                  <textarea className="min-h-24 w-full rounded border px-2 py-1 text-sm" value={recipe.steps.map((item) => item.text).join('\n')} onChange={(event) => updateRecipe(recipe.id, { steps: event.target.value.split('\n').filter(Boolean).map((text, index) => ({ order: index + 1, text })) })} />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">분량/농도</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="분량/농도 메모" value={recipe.texture_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { texture_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">보관</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="보관 메모" value={recipe.storage_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { storage_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">도구</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="도구 메모" value={recipe.tool_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { tool_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">주의</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="주의 메모" value={recipe.caution_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { caution_note: event.target.value })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editorTab === 'safety' ? (
        <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-amber-900">Warning/caution text</span>
            <textarea className="min-h-20 w-full rounded-md border border-amber-200 p-3 text-sm" value={draft.flow.warning ?? ''} onChange={(event) => setDraft((value) => ({ ...value, flow: { ...value.flow, warning: event.target.value } }))} />
          </label>
        </section>
      ) : null}

      {editorTab === 'preview' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500">공개 페이지 미리보기</p>
            <h2 className="text-xl font-semibold">{draft.flow.title}</h2>
          </div>
          {draft.flow.warning ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{draft.flow.warning}</div> : null}
          <MealPlanRenderer bundle={draft} anchor="" checks={{}} onToggle={() => undefined} reactionLogs={{}} onReactionChange={() => undefined} />
        </section>
      ) : null}
    </main>
  );
}

function EditorHeader({
  bundle,
  onSave,
  onPublish,
}: {
  bundle: FlowBundle;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3">
            <FlowBadges bundle={bundle} showStatus />
          </div>
          <p className="text-sm text-gray-500">붙여넣기 → 실행 항목 다듬기 → 발행</p>
          <h1 className="mt-1 text-3xl font-semibold">{bundle.flow.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/f/${bundle.flow.slug}`}>
            미리보기
          </Link>
          <button className="rounded-md border px-3 py-2 text-sm" onClick={onSave}>
            초안 저장
          </button>
          <button className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" onClick={onPublish}>
            발행
          </button>
        </div>
      </div>
    </header>
  );
}

function PublishSuccessPanel({ bundle }: { bundle: FlowBundle }) {
  const publicPath = `/f/${bundle.flow.slug}`;
  const creatorPath = getCreatorPath(bundle);

  const copyPublicLink = async () => {
    const url = `${window.location.origin}${publicPath}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <section className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-semibold text-green-800">발행되었습니다</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-950">다음 행동을 선택하세요</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" onClick={copyPublicLink}>
          공개 링크 복사
        </button>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={publicPath}>
          공개 페이지 열기
        </Link>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={creatorPath}>
          제작자 프로필에서 보기
        </Link>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href="/flows/new">
          다른 Flow 만들기
        </Link>
      </div>
    </section>
  );
}

export function PublicFlow({ slug }: { slug: string }) {
  const { bundles, persist } = useBundles();
  const [bundle, setBundle] = useState<FlowBundle | null>(() => cloneSeedBundles().find((item) => item.flow.slug === slug) ?? null);
  const [anchor, setAnchor] = useState('');
  const [anchorMode, setAnchorMode] = useState<AnchorMode>('custom');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [itemStates, setItemStates] = useState<Record<string, FlowItemState>>({});
  const [weekdaySelection, setWeekdaySelection] = useState(['월', '수', '금']);
  const [reactionLogs, setReactionLogs] = useState<Record<string, ReactionLog>>({});
  const [copyState, setCopyState] = useState('');
  const [downloadState, setDownloadState] = useState('');
  const [calendarState, setCalendarState] = useState('');
  const [view, setView] = useState<PublicView>('list');
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showStorageNotice, setShowStorageNotice] = useState(false);

  useEffect(() => {
    const found = getBundles().find((item) => item.flow.slug === slug) ?? null;
    const storedAnchor = getStoredAnchor(slug);
    const hasStoredAnchor = Boolean(storedAnchor.anchor) || storedAnchor.mode !== 'custom';
    const defaultAnchorMode: AnchorMode = found && isFitnessExactVideoFlow(found) ? 'example' : 'custom';
    setBundle(found);
    setAnchor(storedAnchor.anchor);
    setAnchorMode(hasStoredAnchor && isAnchorMode(storedAnchor.mode) ? storedAnchor.mode : defaultAnchorMode);
    setChecks(getChecks(slug));
    setItemStates(getItemStates(slug));
    setReactionLogs(getReactionLogs(slug));
    setShowStorageNotice(!hasDismissedStorageNotice());
  }, [slug]);

  useEffect(() => {
    saveChecks(slug, checks);
  }, [checks, slug]);

  useEffect(() => {
    saveStoredAnchor(slug, { mode: anchorMode, anchor });
  }, [anchor, anchorMode, slug]);

  useEffect(() => {
    saveItemStates(slug, itemStates);
  }, [itemStates, slug]);

  useEffect(() => {
    saveReactionLogs(slug, reactionLogs);
  }, [reactionLogs, slug]);

  useEffect(() => {
    const update = () => setShowMobileActions(window.scrollY > 520);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!bundle) return <main className="p-8">Flow를 찾을 수 없습니다.</main>;

  const displayAnchor = getPreviewAnchor(bundle, anchorMode, anchor);
  const views = getPublicViews(bundle, Boolean(displayAnchor));
  const activeView = views.some((item) => item.id === view) ? view : 'list';
  const executableIds = getExecutableCheckIds(bundle, displayAnchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const executableCount = executableIds.length;
  const done = executableIds.filter((id) => checks[id]).length;
  const canExportCalendar = hasCalendarSchedule(bundle);
  const showTodayExecution = isFitnessExactVideoFlow(bundle);
  const primaryDestination = inferPrimaryDestination(bundle);

  const toggle = (id: string) => {
    setChecks((value) => {
      const ids = getToggleCheckIds(bundle, id, displayAnchor);
      const nextValue = !ids.every((checkId) => value[checkId]);
      return ids.reduce(
        (next, checkId) => ({
          ...next,
          [checkId]: nextValue,
        }),
        { ...value },
      );
    });
  };
  const updateReaction = (slotId: string, patch: ReactionLog) => {
    setReactionLogs((value) => ({ ...value, [slotId]: { ...value[slotId], ...patch } }));
  };
  const updateItemNote = (id: string, note: string) => {
    setItemStates((value) => ({
      ...value,
      [id]: {
        ...value[id],
        note,
      },
    }));
  };
  const toggleItemSkipped = (id: string) => {
    setItemStates((value) => {
      const current = value[id] ?? {};
      return {
        ...value,
        [id]: {
          ...current,
          skipped: !current.skipped,
        },
      };
    });
  };
  const copy = async () => {
    const text = buildText(bundle, checks, displayAnchor, itemStates);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('복사됨');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyState(copied ? '복사됨' : '복사 실패');
    }
    window.setTimeout(() => setCopyState(''), 1600);
  };
  const downloadExcel = async () => {
    setDownloadState('생성 중');
    const sheets = buildWorkbookSheets(bundle, checks, displayAnchor, {
      weekdays: weekdaySelection,
      reactionLogs,
      itemStates,
    });
    const buffer = await buildXlsxBuffer(sheets);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.flow.slug}.xlsx`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setDownloadState('완료');
    window.setTimeout(() => setDownloadState(''), 1600);
  };
  const downloadCalendar = () => {
    setCalendarState('생성 중');
    const ics = hasDatedCalendarSchedule(bundle)
      ? buildIcsCalendar(bundle, checks, displayAnchor, itemStates)
      : buildCalendarIcs(bundle, displayAnchor, weekdaySelection);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.flow.slug}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setCalendarState('완료');
    window.setTimeout(() => setCalendarState(''), 1600);
  };
  const copyToEditableDraft = () => {
    if (!bundle) return;
    const next = cloneBundleForEditing(bundle);
    persist([...bundles, next]);
    window.location.href = `/flows/${next.flow.id}/edit`;
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 pb-28 md:pb-8">
      <header className="border-b border-gray-200 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>{bundle.flow.category}</span>
          <span>{bundle.flow.content_type === 'meal_plan' ? '식단/레시피' : '실행 체크리스트'}</span>
          {bundle.flow.source_title ? <span>{bundle.flow.source_title}</span> : null}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{bundle.flow.title}</h1>
        {bundle.flow.description ? <p className="mt-3 max-w-3xl text-gray-600">{bundle.flow.description}</p> : null}
        <FlowHeroMeta bundle={bundle} />
        <div className="mt-4">
          <FlowBadges bundle={bundle} />
        </div>
      </header>

      {!showTodayExecution ? (
      <section className="my-6 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
            <p className="text-sm font-semibold text-blue-700">{getSetupStepTitle(bundle)}</p>
            <p className="mt-1 text-sm text-gray-600">{getSetupStepDescription(bundle)}</p>
            <p className="mt-1 text-sm text-gray-500">{getSetupStepHelp(bundle)}</p>
            <div className="mt-4">
              <AnchorInput bundle={bundle} anchor={anchor} displayAnchor={displayAnchor} mode={anchorMode} onModeChange={setAnchorMode} onChange={setAnchor} weekdays={weekdaySelection} onWeekdaysChange={setWeekdaySelection} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-blue-700">진행률</p>
              <p className="mt-1 text-sm text-gray-600">항목을 체크하면 이 브라우저에 자동 저장됩니다.</p>
              <div className="mt-4">
              <ProgressBar done={done} total={executableCount} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-blue-700">내보내기와 백업</p>
              <p className="mt-1 text-sm text-gray-600">
                {done > 0 ? '체크 상태, 스킵, 메모까지 함께 저장됩니다.' : '항목을 체크하면 텍스트, 엑셀, 캘린더로 백업할 수 있어요.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300" disabled={done === 0} title={done === 0 ? '항목을 하나라도 체크하면 받을 수 있어요' : undefined} onClick={copy}>
                  체크리스트 복사하기
                </button>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold disabled:border-gray-200 disabled:text-gray-400" disabled={done === 0} title={done === 0 ? '항목을 하나라도 체크하면 받을 수 있어요' : undefined} onClick={downloadExcel}>
                  내 일정표 엑셀로 받기
                </button>
                {canExportCalendar ? (
                  <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold disabled:border-gray-200 disabled:text-gray-400" disabled={done === 0} title={done === 0 ? '항목을 하나라도 체크하면 받을 수 있어요' : undefined} onClick={downloadCalendar}>
                    캘린더 파일 받기
                  </button>
                ) : null}
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={copyToEditableDraft}>
                  내 버전 만들기
                </button>
                {copyState ? <span className="py-2 text-sm text-green-700">{copyState}</span> : null}
                {downloadState ? <span className="py-2 text-sm text-blue-700">{downloadState}</span> : null}
                {calendarState ? <span className="py-2 text-sm text-blue-700">{calendarState}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {showStorageNotice ? (
        <section className="my-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p>
              <span className="font-semibold">진행 상황은 이 브라우저에 자동 저장됩니다.</span> 다른 기기에서 보거나 백업하려면 엑셀 실행표를 받아두세요.
            </p>
            <button
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700"
              onClick={() => {
                dismissStorageNotice();
                setShowStorageNotice(false);
              }}
            >
              확인
            </button>
          </div>
        </section>
      ) : null}

      <section className="my-5 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-gray-950 underline-offset-2 hover:text-blue-700 hover:underline" href={getCreatorPath(bundle)}>
              by {getCreatorName(bundle)}
            </Link>
            {getCreatorRole(bundle) ? <p className="mt-1 text-sm text-gray-500">{getCreatorRole(bundle)}</p> : null}
            {getCreatorNote(bundle) ? <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{getCreatorNote(bundle)}</p> : null}
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-md bg-gray-50 px-3 py-2 font-semibold text-gray-800">베타 운영 중</span>
          </div>
        </div>
      </section>

      <SourceContentCard bundle={bundle} />

      {bundle.flow.warning ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          {bundle.flow.warning}
        </div>
      ) : null}

      {showTodayExecution ? (
        <ExactVideoToolPreview
          bundle={bundle}
          anchor={anchor}
          displayAnchor={displayAnchor}
          anchorMode={anchorMode}
          onAnchorModeChange={setAnchorMode}
          onAnchorChange={setAnchor}
          weekdays={weekdaySelection}
          onWeekdaysChange={setWeekdaySelection}
          destination={primaryDestination}
          onCopyText={copy}
          onDownloadExcel={downloadExcel}
          onDownloadCalendar={downloadCalendar}
          onCopyToEditableDraft={copyToEditableDraft}
          copyState={copyState}
          downloadState={downloadState}
          calendarState={calendarState}
        />
      ) : null}

      {showTodayExecution ? (
        <ExactVideoRenderer bundle={bundle} checks={checks} onToggle={toggle} />
      ) : (
        <>
          <FlowOverview bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} />

          {views.length > 1 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {views.map((item) => (
                <button key={item.id} className={`rounded-md border px-3 py-2 text-sm font-semibold ${activeView === item.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`} onClick={() => setView(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {activeView === 'week' ? (
            <WeekRenderer bundle={bundle} anchor={displayAnchor} weekdays={weekdaySelection} checks={checks} onToggle={toggle} />
          ) : activeView === 'month' ? (
            <MonthRenderer bundle={bundle} anchor={displayAnchor} checks={checks} onToggle={toggle} />
          ) : activeView === 'recipes' ? (
            <RecipeListRenderer bundle={bundle} anchor={displayAnchor} />
          ) : bundle.flow.content_type === 'meal_plan' ? (
            <MealPlanRenderer bundle={bundle} anchor={displayAnchor} checks={checks} onToggle={toggle} reactionLogs={reactionLogs} onReactionChange={updateReaction} />
          ) : bundle.flow.structure_type === 'timeline' ? (
            <TimelineRenderer bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          ) : bundle.flow.structure_type === 'routine' ? (
            <RoutineRenderer bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} weekdays={weekdaySelection} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          ) : (
            <ChecklistRenderer bundle={bundle} checks={checks} itemStates={itemStates} onToggle={toggle} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          )}
        </>
      )}

      <div className={`fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 md:hidden ${showMobileActions ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-600">진행률</span>
            <span className="font-semibold">{done} / {executableCount}</span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white disabled:bg-gray-300" disabled={done === 0} onClick={copy}>
              체크리스트 복사
            </button>
            <button className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold disabled:border-gray-200 disabled:text-gray-400" disabled={done === 0} onClick={downloadExcel}>
              엑셀 받기
            </button>
            {canExportCalendar ? (
              <button className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold disabled:border-gray-200 disabled:text-gray-400" disabled={done === 0} onClick={downloadCalendar}>
                캘린더
              </button>
            ) : null}
            <button className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" onClick={copyToEditableDraft}>
              내 버전
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function AnchorInput({
  bundle,
  anchor,
  displayAnchor,
  mode,
  onModeChange,
  onChange,
  weekdays,
  onWeekdaysChange,
}: {
  bundle: FlowBundle;
  anchor: string;
  displayAnchor: string;
  mode: AnchorMode;
  onModeChange: (value: AnchorMode) => void;
  onChange: (value: string) => void;
  weekdays: string[];
  onWeekdaysChange: (value: string[]) => void;
}) {
  if (bundle.flow.anchor_type === 'none') {
    return <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">아래 항목을 하나씩 확인하고 완료한 것은 체크하세요.</div>;
  }

  const label = getAnchorInputLabel(bundle);
  const anchorDate = anchor ? new Date(anchor) : null;
  const today = new Date();
  const daysUntil = anchorDate && !Number.isNaN(anchorDate.getTime())
    ? Math.ceil((anchorDate.getTime() - new Date(formatDate(today)).getTime()) / 86400000)
    : null;
  const earliestOffset = getEarliestOffset(bundle);
  const isPast = daysUntil !== null && daysUntil < 0;
  const isClose = daysUntil !== null && earliestOffset < 0 && daysUntil >= 0 && daysUntil < Math.abs(earliestOffset);

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label={label}
            className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2"
            type="date"
            value={anchor}
            onChange={(event) => {
              onModeChange('custom');
              onChange(event.target.value);
            }}
          />
          <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => onModeChange('custom')}>
            입력
          </button>
        </div>
      </label>
      <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        또는
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'undecided' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`} type="button" onClick={() => onModeChange('undecided')}>
          아직 날짜가 안 정해졌어요
        </button>
        <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'example' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`} type="button" onClick={() => onModeChange('example')}>
          그냥 예시로 둘러볼게요
        </button>
      </div>
      {mode === 'custom' && anchor ? (
        <div className={`rounded-md border p-3 text-sm ${isPast ? 'border-red-200 bg-red-50 text-red-800' : isClose ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {isPast ? (
            `${label}이 이미 지났어요. 다른 날짜를 입력하시겠어요?`
          ) : (
            <>
              <span className="font-semibold">{label}: {anchor}</span>
              {daysUntil !== null ? ` (D-${daysUntil})` : ''} 으로 모든 항목이 자동 조정됐어요.
              {isClose ? ` ${label}까지 ${daysUntil}일밖에 남지 않아 일부 초기 단계는 빠르게 처리하거나 건너뛸 수 있어요.` : null}
            </>
          )}
        </div>
      ) : mode === 'example' ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600">예시 날짜로 미리보기 · {label} {displayAnchor}</p>
      ) : mode === 'undecided' ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600">날짜 없이 항목만 먼저 둘러봅니다. 날짜를 넣으면 모든 일정이 다시 계산됩니다.</p>
      ) : null}
      {bundle.flow.structure_type === 'routine' ? (
        <div>
          <p className="mb-2 text-sm font-semibold">{getWeekdaySelectionLabel(bundle)}</p>
          <div className="flex flex-wrap gap-2">
            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
              <label key={day} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={weekdays.includes(day)}
                  onChange={() =>
                    onWeekdaysChange(
                      weekdays.includes(day)
                        ? weekdays.filter((value) => value !== day)
                        : [...weekdays, day],
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getWeekdaySelectionLabel(bundle: FlowBundle): string {
  if (bundle.flow.slug.startsWith('real-fitvely-video-')) return '적용 요일';
  if (bundle.flow.category.includes('운동')) return '운동 요일';
  return '반복 요일';
}

function getEmbeddedToolCopy(destination: PrimaryDestination): {
  title: string;
  description: string;
  rhythm: string;
  tool: string;
  previewTitle: string;
} {
  if (destination === 'calendar') {
    return {
      title: '캘린더에 이미 들어간 운동 일정',
      description: '영상 하나가 월간 달력의 반복 운동 일정으로 먼저 들어갑니다. 사용자는 시작일과 요일만 바꾸면 됩니다.',
      rhythm: '주 3회',
      tool: '캘린더',
      previewTitle: '월간 미리보기',
    };
  }
  if (destination === 'hybrid' || destination === 'sheet') {
    return {
      title: '운동표에 이미 들어간 기준',
      description: '영상의 핵심 기준을 이번 주 운동표에 먼저 넣어두고, 사용자는 날짜와 요일만 조정합니다.',
      rhythm: '주 3회',
      tool: '운동표',
      previewTitle: '주간 운동표 미리보기',
    };
  }
  return {
    title: '식사 체크표에 이미 들어간 적용 Flow',
    description: '영상의 원칙을 오늘부터 일별 체크표에 넣어둡니다. 필요하면 적용일과 요일만 가볍게 바꿉니다.',
    rhythm: '매일',
    tool: '체크표',
    previewTitle: '일별 적용 체크표',
  };
}

const weekdayIndex: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

function getExactVideoSchedule(
  anchor: string,
  weekdays: string[],
  title: string,
  destination: PrimaryDestination,
): { date: string; day: string; label: string; title: string }[] {
  if (!anchor) return [];

  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return [];

  const selected = weekdays.length ? weekdays : ['월', '수', '금'];
  const label =
    destination === 'calendar'
      ? '캘린더 일정'
      : destination === 'hybrid' || destination === 'sheet'
        ? '운동표 반영'
        : '메모 적용';

  return [...selected]
    .filter((day) => weekdayIndex[day] !== undefined)
    .sort((a, b) => weekdayIndex[a] - weekdayIndex[b])
    .map((day) => {
      const offset = (weekdayIndex[day] - start.getDay() + 7) % 7;
      return {
        date: formatDate(addDays(start, offset)),
        day,
        label,
        title,
      };
    });
}

function getExactToolPreview(
  anchor: string,
  weekdays: string[],
  title: string,
  destination: PrimaryDestination,
): { date: string; day: string; label: string; title: string }[] {
  if (destination !== 'memo') return getExactVideoSchedule(anchor, weekdays, title, destination);
  if (!anchor) return [];

  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return [];

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const day = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return {
      date: formatDate(date),
      day,
      label: '적용 체크',
      title,
    };
  });
}

function itemDate(anchor: string, item: FlowItem) {
  if (!anchor || item.day_offset === undefined) return '';
  return formatDate(addDays(new Date(anchor), item.day_offset));
}

type PublicView = 'list' | 'week' | 'month' | 'recipes';
type AnchorMode = 'custom' | 'example' | 'undecided';

function nextMonday(date: Date): Date {
  const day = date.getDay();
  const add = day === 0 ? 1 : 8 - day;
  return addDays(date, add);
}

function getPreviewAnchor(bundle: FlowBundle, mode: AnchorMode, customAnchor: string): string {
  if (bundle.flow.anchor_type === 'none') return '';
  if (mode === 'custom') return customAnchor;
  if (mode === 'undecided') return '';
  const today = new Date();
  if (bundle.flow.content_type === 'meal_plan') return formatDate(today);
  if (bundle.flow.category.includes('결혼')) return formatDate(addDays(today, 180));
  if (bundle.flow.category.includes('이사')) return formatDate(addDays(today, 30));
  if (bundle.flow.category.includes('여행')) return formatDate(addDays(today, 14));
  if (bundle.flow.structure_type === 'routine') return formatDate(nextMonday(today));
  return formatDate(today);
}

function getAnchorModeLabel(mode: AnchorMode): string {
  if (mode === 'custom') return '내 날짜 기준';
  if (mode === 'undecided') return '날짜 미정';
  return '예시 날짜로 미리보기';
}

function isAnchorMode(value: string): value is AnchorMode {
  return value === 'custom' || value === 'example' || value === 'undecided';
}

function getEarliestOffset(bundle: FlowBundle): number {
  const itemOffsets = bundle.items.map((item) => item.day_offset).filter((value): value is number => value !== undefined);
  const mealOffsets = (bundle.mealSlots ?? []).map((slot) => slot.day_offset);
  return Math.min(0, ...itemOffsets, ...mealOffsets);
}

type ScheduleEntry = {
  id: string;
  title: string;
  section: string;
  timing: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  detail?: FlowItemDetail;
  meta?: string;
};

type CalendarEntry = ScheduleEntry & {
  calendarDate: string;
  dayIndex: number;
};

function occurrenceCheckId(id: string, date: string): string {
  return `${id}__${date}`;
}

function isDateBasedFlow(bundle: FlowBundle): boolean {
  return bundle.flow.content_type === 'meal_plan' || bundle.flow.structure_type === 'timeline';
}

function getEntryCheckIds(entry: ScheduleEntry): string[] {
  const duration = Math.max(entry.durationDays ?? 1, 1);
  if (duration <= 1) return [entry.id];
  return Array.from({ length: duration }, (_, index) =>
    occurrenceCheckId(entry.id, formatDate(addDays(new Date(entry.startDate), index))),
  );
}

function getExecutableCheckIds(bundle: FlowBundle, anchor: string): string[] {
  if (isDateBasedFlow(bundle) && anchor) {
    return getScheduleEntries(bundle, anchor).flatMap(getEntryCheckIds);
  }
  if (bundle.flow.content_type === 'meal_plan') return (bundle.mealSlots ?? []).map((slot) => slot.id);
  return bundle.items.map((item) => item.id);
}

function getToggleCheckIds(bundle: FlowBundle, id: string, anchor: string): string[] {
  if (!isDateBasedFlow(bundle) || !anchor) return [id];
  const entry = getScheduleEntries(bundle, anchor).find((item) => item.id === id);
  return entry ? getEntryCheckIds(entry) : [id];
}

function isBaseEntryChecked(bundle: FlowBundle, id: string, anchor: string, checks: Record<string, boolean>): boolean {
  const ids = getToggleCheckIds(bundle, id, anchor);
  return ids.length > 0 && ids.every((checkId) => checks[checkId]);
}

function baseStateId(id: string): string {
  return id.split('__')[0];
}

function isItemStateSkipped(itemStates: Record<string, FlowItemState>, id: string): boolean {
  return Boolean(itemStates[baseStateId(id)]?.skipped);
}

function getPublicViews(bundle: FlowBundle, hasScheduleAnchor = false): { id: PublicView; label: string }[] {
  if (isFitnessExactVideoFlow(bundle)) {
    return [{ id: 'list', label: '실행 항목' }];
  }
  if (bundle.flow.content_type === 'meal_plan') {
    return [
      { id: 'list', label: '전체 할 일' },
      ...(hasScheduleAnchor ? [{ id: 'month' as PublicView, label: '일정 보기' }] : []),
      { id: 'recipes', label: '레시피' },
    ];
  }
  if (bundle.flow.structure_type === 'timeline') {
    return [
      { id: 'list', label: '전체 할 일' },
      ...(hasScheduleAnchor ? [{ id: 'month' as PublicView, label: '일정 보기' }] : []),
    ];
  }
  if (bundle.flow.structure_type === 'routine') {
    return [
      { id: 'list', label: '전체 루틴' },
      ...(hasScheduleAnchor ? [{ id: 'week' as PublicView, label: '일정 보기' }] : []),
    ];
  }
  return [{ id: 'list', label: '전체 할 일' }];
}

function getScheduleEntries(bundle: FlowBundle, anchor: string): ScheduleEntry[] {
  if (!anchor && bundle.flow.structure_type !== 'checklist') return [];
  if (bundle.flow.content_type === 'meal_plan') {
    return (bundle.mealSlots ?? []).map((slot) => {
      const start = addDays(new Date(anchor), slot.day_offset);
      const end = getRangeEnd(start, slot.duration_days);
      return {
        id: slot.id,
        title: slot.menu_title,
        section: getSectionTitleForBundle(bundle, slot.section_id),
        timing: timingLabel(slot.day_offset, slot.duration_days),
        startDate: formatDate(start),
        endDate: formatDate(end),
        durationDays: slot.duration_days,
        meta: slot.new_ingredients.length ? `새 재료: ${slot.new_ingredients.join(', ')}` : undefined,
      };
    });
  }

  return bundle.items
    .filter((item) => item.day_offset !== undefined)
    .map((item) => {
      const start = addDays(new Date(anchor), item.day_offset ?? 0);
      const end = item.duration_days && item.duration_days > 1 ? getRangeEnd(start, item.duration_days) : undefined;
      return {
        id: item.id,
        title: item.title,
        section: getSectionTitleForBundle(bundle, item.section_id),
        timing: timingLabel(item.day_offset, item.duration_days),
        startDate: formatDate(start),
        endDate: end ? formatDate(end) : undefined,
        durationDays: item.duration_days,
        detail: getItemDetail(bundle, item.id),
        meta: item.repeat_rule,
      };
    });
}

function expandCalendarEntries(entries: ScheduleEntry[]): CalendarEntry[] {
  return entries.flatMap((entry) => {
    const duration = Math.max(entry.durationDays ?? 1, 1);
    return Array.from({ length: duration }, (_, index) => {
      const calendarDate = formatDate(addDays(new Date(entry.startDate), index));
      return {
        ...entry,
        id: duration > 1 ? occurrenceCheckId(entry.id, calendarDate) : entry.id,
        calendarDate,
        dayIndex: index + 1,
      };
    });
  });
}

function getSectionTitleForBundle(bundle: FlowBundle, sectionId?: string): string {
  return bundle.sections.find((section) => section.id === sectionId)?.title ?? '';
}

function getWeekKey(date: string): string {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(value, diff);
  return formatDate(monday);
}

function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, index) => formatDate(addDays(start, index)));
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function getMonthCalendarDays(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const prefix = first.getDay();
  const days: (string | null)[] = Array.from({ length: prefix }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function WeekRenderer({
  bundle,
  anchor,
  weekdays,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (bundle.flow.structure_type === 'routine') {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-semibold">주간 루틴</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(weekdays.length ? weekdays : ['월', '수', '금']).map((day) => (
            <div key={day} className="rounded-md border border-gray-200 p-3">
              <h3 className="font-semibold">{day}요일</h3>
              <div className="mt-3 space-y-2 text-sm">
                {bundle.sections.map((section) => (
                  <div key={section.id}>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-gray-500">{bundle.items.filter((item) => item.section_id === section.id).length}개 동작</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const entries = expandCalendarEntries(getScheduleEntries(bundle, anchor));
  if (!anchor) return <EmptyScheduleMessage />;

  const weeks = Array.from(new Set(entries.map((entry) => getWeekKey(entry.calendarDate)))).sort();
  return (
    <div className="space-y-5">
      {weeks.map((week) => (
        <section key={week} className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{week} 주</h2>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {getWeekDays(week).map((date) => {
                const dayEntries = entries.filter((entry) => entry.calendarDate === date);
                const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()];
                return (
                  <div key={date} className="min-h-36 rounded-md border border-gray-200 bg-[#FAFAF8] p-2">
                    <p className="text-xs font-semibold text-gray-600">{dayLabel}</p>
                    <p className="text-xs text-gray-500">{date.slice(5)}</p>
                    <div className="mt-2 space-y-2">
                      {dayEntries.map((entry) => (
                        <label key={entry.id} className="block rounded border border-gray-200 bg-white p-2 text-xs leading-4">
                          <span className="mb-1 block font-mono text-blue-700">{entry.timing}</span>
                          <span className="flex items-start gap-1.5 font-semibold">
                            <input className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
                            <span>{entry.durationDays && entry.durationDays > 1 ? `${entry.title} ${entry.dayIndex}일차` : entry.title}</span>
                          </span>
                          {entry.endDate ? <span className="mt-1 block text-gray-500">~ {entry.endDate}</span> : null}
                          {entry.meta ? <span className="mt-1 block text-gray-600">{entry.meta}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function MonthRenderer({
  bundle,
  anchor,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const entries = expandCalendarEntries(getScheduleEntries(bundle, anchor));
  if (!anchor) return <EmptyScheduleMessage />;

  const months = Array.from(new Set(entries.map((entry) => monthKey(entry.calendarDate)))).sort();
  return (
    <div className="space-y-5">
      {months.map((month) => (
        <section key={month} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">{month}</h2>
            <p className="text-sm font-semibold text-gray-600">이번 달 핵심 {new Set(entries.filter((entry) => monthKey(entry.calendarDate) === month).map((entry) => entry.id)).size}개</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="rounded-md bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                  {day}
                </div>
              ))}
              {getMonthCalendarDays(month).map((date, index) => {
                const dayEntries = date ? entries.filter((entry) => entry.calendarDate === date) : [];
                return (
                  <div key={`${month}-${index}`} className={`min-h-32 rounded-md border p-2 ${date ? 'border-gray-200 bg-[#FAFAF8]' : 'border-gray-100 bg-gray-50/60'}`}>
                    {date ? <p className="text-xs font-medium text-gray-500">{date.slice(8)}</p> : null}
                    <div className="mt-2 space-y-2">
                      {dayEntries.map((entry) => (
                        <label key={entry.id} className="block rounded border border-gray-200 bg-white p-2 text-xs leading-4">
                          <span className="mb-1 block font-mono text-blue-700">{entry.timing}</span>
                          <span className="flex items-start gap-1.5 font-semibold">
                            <input className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
                            <span>{entry.durationDays && entry.durationDays > 1 ? `${entry.title} ${entry.dayIndex}일차` : entry.title}</span>
                          </span>
                          {entry.meta ? <span className="mt-1 block text-gray-600">{entry.meta}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function RecipeListRenderer({ bundle, anchor }: { bundle: FlowBundle; anchor: string }) {
  return (
    <div className="space-y-4">
      {(bundle.recipes ?? []).map((recipe) => (
        <section key={recipe.id} className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{recipe.title}</h2>
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-600">연결된 식단</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(bundle.mealSlots ?? []).filter((slot) => slot.recipe_id === recipe.id).map((slot) => {
                const start = anchor ? addDays(new Date(anchor), slot.day_offset) : null;
                const end = start ? getRangeEnd(start, slot.duration_days) : null;
                const dateLabel = start && end ? ` / ${formatDate(start)} ~ ${formatDate(end)}` : '';
                return (
                  <span key={slot.id} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                    {timingLabel(slot.day_offset, slot.duration_days)}{dateLabel}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">재료</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {recipe.ingredients.map((ingredient) => <li key={ingredient.name}>{ingredient.name}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">조리 방법</h3>
              <ol className="mt-2 list-decimal pl-5 text-sm">
                {recipe.steps.map((step) => <li key={step.order}>{step.text}</li>)}
              </ol>
            </div>
          </div>
          {recipe.caution_note ? <p className="mt-4 text-sm text-red-700"><b>주의:</b> {recipe.caution_note}</p> : null}
        </section>
      ))}
    </div>
  );
}

function EmptyScheduleMessage() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
      기준 날짜를 입력하면 주간/월간 보기로 전환됩니다.
    </section>
  );
}

function ItemDetailContent({ detail }: { detail?: FlowItemDetail }) {
  if (!detail?.why && !detail?.how && !detail?.completion_criteria && !detail?.caution && !detail?.links?.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-gray-100 bg-[#FAFAF8] p-3 text-sm">
      <div className="grid gap-3 text-gray-700 md:grid-cols-2">
        {detail.why ? (
          <div>
            <p className="text-xs font-semibold text-gray-500">💡 왜 필요한가요</p>
            <p className="mt-1 leading-6">{detail.why}</p>
          </div>
        ) : null}
        {detail.how ? (
          <div>
            <p className="text-xs font-semibold text-gray-500">🔧 어떻게 하나요</p>
            <p className="mt-1 leading-6">{detail.how}</p>
          </div>
        ) : null}
        {visibleCompletionCriteria(detail) ? (
          <div>
            <p className="text-xs font-semibold text-gray-500">✅ 완료 조건</p>
            <p className="mt-1 leading-6">{visibleCompletionCriteria(detail)}</p>
          </div>
        ) : null}
        {detail.caution ? (
          <div className="text-amber-800">
            <p className="text-xs font-semibold">⚠️ 주의</p>
            <p className="mt-1 leading-6">{detail.caution}</p>
          </div>
        ) : null}
        {detail.links?.length ? (
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500">바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.links.map((link) => (
                <a key={`${link.label}-${link.url}`} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700" href={link.url} target="_blank" rel="noreferrer">
                  {linkTypeLabels[link.type] ?? '링크'} · {link.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailPreview({ detail }: { detail?: FlowItemDetail }) {
  const text = detail?.why ?? detail?.how ?? detail?.caution;
  if (!text) return null;
  return <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{text}</p>;
}

function ItemCardBadges({ badges }: { badges: ActionBadge[] }) {
  const visibleBadges = badges.filter((badge) => !['날짜 고정', '완료 기준', '할 일', '루틴'].includes(badge.label));
  return <ExecutionMetaBadges badges={visibleBadges} />;
}

function ItemMetaText({ parts }: { parts: string[] }) {
  const text = parts.filter(Boolean).join(' · ');
  if (!text) return null;
  return <span className="shrink-0 text-xs font-semibold leading-6 text-gray-500">{text}</span>;
}

function FlowItemCard({
  bundle,
  item,
  anchor,
  checked,
  state,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  item: FlowItem;
  anchor?: string;
  checked: boolean;
  state?: FlowItemState;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const detail = getItemDetail(bundle, item.id);
  const skipped = Boolean(state?.skipped);
  const date = item.day_offset !== undefined && anchor ? itemDate(anchor, item) : '';
  const timing = item.day_offset !== undefined ? timingLabel(item.day_offset, item.duration_days) : '';
  const repeat = item.repeat_rule && !timing ? item.repeat_rule : '';
  const hasDetail = Boolean(detail?.why || detail?.how || detail?.completion_criteria || detail?.caution || detail?.links?.length);
  const memoButtonLabel = state?.note ? '메모' : '메모 추가';

  return (
    <div data-testid="flow-item-card" className={`rounded-lg border border-gray-200 bg-white p-4 transition ${skipped ? 'opacity-60' : 'hover:border-gray-300'}`}>
      <div className="flex gap-3">
        <input
          aria-label={`완료: ${item.title}`}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300"
          type="checkbox"
          disabled={skipped}
          checked={checked}
          onChange={() => onToggle(item.id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-6 text-gray-950">{item.title}</h3>
            <ItemMetaText parts={[repeat, timing, date]} />
          </div>
          <ItemCardBadges badges={getActionBadges(bundle, item, detail)} />
          <DetailPreview detail={detail} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
        <button
          className="min-h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700"
          type="button"
          onClick={() => setMemoOpen((value) => !value)}
        >
          {memoButtonLabel}
        </button>
        <button
          className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold ${skipped ? 'border-gray-300 bg-white text-gray-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
          type="button"
          aria-pressed={skipped}
          onClick={() => onSkipToggle(item.id)}
        >
          {skipped ? '다시 포함' : '해당 없음'}
        </button>
        {hasDetail ? (
          <button
            className="min-h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700"
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? '접기' : '자세히'}
          </button>
        ) : null}
      </div>

      {memoOpen ? (
        <div className="mt-3 pl-8">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-gray-700">메모</span>
            <textarea
              aria-label={`${item.title} 메모`}
              className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="예) 우리는 포장이사로 결정됨, 견적은 다음 주 비교"
              value={state?.note ?? ''}
              onChange={(event) => onNoteChange(item.id, event.target.value)}
            />
          </label>
          <p className="mt-1 text-xs font-medium text-gray-500">자동 저장됨 · 이 기기에만 저장</p>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="pl-8">
          <ItemDetailContent detail={detail} />
        </div>
      ) : null}
    </div>
  );
}

function getSectionItemIds(bundle: FlowBundle, sectionId: string): string[] {
  if (bundle.flow.content_type === 'meal_plan') {
    return (bundle.mealSlots ?? []).filter((slot) => slot.section_id === sectionId).map((slot) => slot.id);
  }
  return bundle.items.filter((item) => item.section_id === sectionId).map((item) => item.id);
}

function getNextEntries(
  bundle: FlowBundle,
  anchor: string,
  checks: Record<string, boolean>,
  itemStates: Record<string, FlowItemState> = {},
): ScheduleEntry[] {
  const entries = getScheduleEntries(bundle, anchor).filter((entry) => !isItemStateSkipped(itemStates, entry.id) && !isBaseEntryChecked(bundle, entry.id, anchor, checks));
  if (!entries.length && (bundle.flow.structure_type === 'checklist' || bundle.flow.structure_type === 'routine' || bundle.flow.structure_type === 'timeline')) {
    return bundle.items
      .filter((item) => !checks[item.id] && !itemStates[item.id]?.skipped)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.title,
        section: getSectionTitleForBundle(bundle, item.section_id),
        timing: bundle.flow.structure_type === 'routine' ? item.repeat_rule ?? '이번 주 루틴' : '',
        startDate: '',
      }));
  }
  return entries
    .sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))
    .slice(0, 3);
}

type ActionBadge = {
  label: string;
  className: string;
};

function hasAttentionRisk(risk?: RiskLevel) {
  return risk === 'medium' || risk === 'medical_sensitive' || risk === 'financial_sensitive';
}

function getDateBoundCount(bundle: FlowBundle) {
  if (bundle.flow.content_type === 'meal_plan') return bundle.mealSlots?.length ?? 0;
  return bundle.items.filter((item) => item.day_offset !== undefined || Boolean(item.repeat_rule)).length;
}

function getAttentionCount(bundle: FlowBundle) {
  if (bundle.flow.warning) return Math.max(1, bundle.items.length || bundle.recipes?.length || 1);
  return bundle.items.filter((item) => {
    const detail = getItemDetail(bundle, item.id);
    return Boolean(detail?.caution) || hasAttentionRisk(item.risk_level);
  }).length;
}

function getExecutionSummary(
  bundle: FlowBundle,
  anchor: string,
  checks: Record<string, boolean>,
  nextEntries: ScheduleEntry[],
  itemStates: Record<string, FlowItemState> = {},
) {
  const executableIds = getExecutableCheckIds(bundle, anchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const fallbackTotal = bundle.flow.content_type === 'meal_plan' ? (bundle.mealSlots ?? []).length : bundle.items.length;
  const total = executableIds.length || fallbackTotal;
  const done = executableIds.filter((id) => checks[id]).length;

  return [
    {
      label: '다음',
      value: nextEntries[0]?.timing || (nextEntries.length ? `${nextEntries.length}개` : '없음'),
    },
    {
      label: '날짜 고정',
      value: `${getDateBoundCount(bundle)}개`,
    },
    {
      label: '확인·주의',
      value: `${getAttentionCount(bundle)}개`,
    },
    {
      label: '완료',
      value: `${done} / ${total}`,
    },
  ];
}

function getActionBadges(bundle: FlowBundle, item: FlowItem, detail?: FlowItemDetail): ActionBadge[] {
  const badges: ActionBadge[] = [];

  if (bundle.flow.structure_type === 'routine' || item.repeat_rule) {
    badges.push({ label: '루틴', className: 'border-red-100 bg-red-50 text-red-700' });
  } else if (item.day_offset !== undefined) {
    badges.push({ label: '날짜 고정', className: 'border-blue-100 bg-blue-50 text-blue-700' });
  } else {
    badges.push({ label: '할 일', className: 'border-gray-200 bg-gray-50 text-gray-700' });
  }

  if (visibleCompletionCriteria(detail)) {
    badges.push({ label: '완료 기준', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' });
  }

  if (detail?.caution || hasAttentionRisk(item.risk_level)) {
    badges.push({ label: '확인·주의', className: 'border-amber-100 bg-amber-50 text-amber-800' });
  }

  if (item.source_type === 'official') {
    badges.push({ label: '공식 확인', className: 'border-teal-100 bg-teal-50 text-teal-700' });
  }

  return badges;
}

function ExecutionMetaBadges({ badges }: { badges: ActionBadge[] }) {
  if (!badges.length) return null;

  return (
    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {badges.map((badge) => (
        <span key={badge.label} className={`rounded-full border px-2 py-0.5 font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      ))}
    </span>
  );
}

function FlowOverview({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
}) {
  const executableIds = getExecutableCheckIds(bundle, anchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const done = executableIds.filter((id) => checks[id]).length;
  const total = executableIds.length || (bundle.flow.content_type === 'meal_plan' ? bundle.mealSlots?.length ?? 0 : bundle.items.filter((item) => !itemStates[item.id]?.skipped).length);
  const showNext = done > 0 && done < total;
  const nextEntries = showNext ? getNextEntries(bundle, anchor, checks, itemStates) : [];
  const summaryItems = getExecutionSummary(bundle, anchor, checks, nextEntries, itemStates);

  return (
    <section className={`mb-5 grid items-start gap-4 ${showNext ? 'lg:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]' : ''}`}>
      {showNext ? (
      <div className="min-w-0 rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">다음 행동</p>
        <h2 className="mt-1 text-2xl font-semibold">지금 먼저 체크할 일</h2>
        <p className="mt-1 text-sm text-blue-900/70">가까운 항목을 먼저 처리하고, 날짜 고정·주의 항목은 놓치지 않게 따로 확인하세요.</p>
        <div className="mt-4 border-t border-blue-100 pt-3">
          <p className="text-xs font-semibold text-blue-700">실행 우선순위</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="border-l border-blue-200 pl-3">
                <p className="text-xs font-medium text-blue-900/60">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {nextEntries.length ? nextEntries.map((entry, index) => (
            <label key={entry.id} className={`block rounded-lg border bg-white p-3 ${index === 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-blue-100'}`}>
              <span className="flex items-start gap-3">
                <input className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, entry.id, anchor, checks)} onChange={() => onToggle(entry.id)} />
                <span>
                  {index === 0 ? <span className="mb-1 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">추천 다음 항목</span> : null}
                  <span className="block font-semibold">{entry.title}</span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {[entry.timing, entry.startDate, entry.section].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
            </label>
          )) : (
            <p className="rounded-md bg-white p-3 text-sm text-gray-600">표시할 다음 항목이 없습니다.</p>
          )}
        </div>
      </div>
      ) : null}

      <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500">한눈에 보는 전체 루트</p>
            <h2 className="text-xl font-semibold">전체 흐름</h2>
          </div>
          <span className="text-sm text-gray-500">{bundle.sections.length}단계</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bundle.sections.map((section, index) => {
            const ids = getSectionItemIds(bundle, section.id);
            const done = ids.filter((id) => checks[id]).length;
            const total = ids.length;
            return (
              <a key={section.id} href={`#section-${section.id}`} className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3 hover:border-blue-300">
                <p className="text-xs font-semibold text-blue-700">Step {index + 1}</p>
                <p className="mt-1 line-clamp-2 font-semibold">{section.title}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-[#2563EB]" style={{ width: total ? `${Math.round((done / total) * 100)}%` : '0%' }} />
                </div>
                <p className="mt-2 text-xs text-gray-500">{done} / {total} 완료</p>
              </a>
            );
          })}
        </div>
      </div>

    </section>
  );
}

function TimelineRenderer({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      {bundle.sections.map((section) => (
        <section id={`section-${section.id}`} key={section.id} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-4 space-y-3">
            {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                anchor={anchor}
                checked={isBaseEntryChecked(bundle, item.id, anchor, checks)}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MealPlanRenderer({
  bundle,
  anchor,
  checks,
  onToggle,
  reactionLogs,
  onReactionChange,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
  reactionLogs: Record<string, ReactionLog>;
  onReactionChange: (id: string, patch: ReactionLog) => void;
}) {
  return (
    <div className="space-y-5">
      {bundle.sections.map((section) => (
        <section id={`section-${section.id}`} key={section.id} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-4 space-y-4">
            {(bundle.mealSlots ?? []).filter((slot) => slot.section_id === section.id).map((slot) => {
              const start = anchor ? addDays(new Date(anchor), slot.day_offset) : null;
              const end = start ? getRangeEnd(start, slot.duration_days) : null;
              const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
              return (
                <div key={slot.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <label className="flex gap-3">
                    <input className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, slot.id, anchor, checks)} onChange={() => onToggle(slot.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-amber-50 px-2 py-1 font-mono font-semibold text-amber-700">{timingLabel(slot.day_offset, slot.duration_days)}</span>
                        {start && end ? <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{formatDate(start)} ~ {formatDate(end)}</span> : null}
                      </span>
                      <span className="mt-2 block text-base font-semibold text-gray-950">{slot.menu_title}</span>
                    </span>
                  </label>
                  <p className="mt-2 text-sm text-gray-600">새 재료: {slot.new_ingredients.join(', ')}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <details data-testid={`recipe-${slot.id}`} className="rounded-md border border-gray-200 p-3">
                      <summary className="cursor-pointer font-semibold">레시피 보기</summary>
                      {recipe ? (
                        <div className="mt-3 space-y-3 text-sm">
                          <div>
                            <h3 className="font-semibold">재료</h3>
                            <ul className="mt-1 list-disc pl-5">
                              {recipe.ingredients.map((ingredient) => (
                                <li key={ingredient.name}>{ingredient.name}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="font-semibold">조리 방법</h3>
                            <ol className="mt-1 list-decimal pl-5">
                              {recipe.steps.map((step) => (
                                <li key={step.order}>{step.text}</li>
                              ))}
                            </ol>
                          </div>
                          {recipe.texture_note ? <p><b>분량/농도:</b> {recipe.texture_note}</p> : null}
                          {recipe.storage_note ? <p><b>보관:</b> {recipe.storage_note}</p> : null}
                          {recipe.tool_note ? <p><b>도구:</b> {recipe.tool_note}</p> : null}
                          {recipe.caution_note ? <p className="text-red-700"><b>주의:</b> {recipe.caution_note}</p> : null}
                        </div>
                      ) : null}
                    </details>
                    <details data-testid={`reaction-log-${slot.id}`} className="rounded-md border border-gray-200 p-3">
                      <summary className="cursor-pointer font-semibold">반응 기록</summary>
                      <div className="mt-3 grid gap-2">
                        {reactionFields.map((field) => (
                          <label key={field.key} className="grid gap-1 text-sm">
                            <span>{field.label}</span>
                            <input className="rounded border border-gray-300 px-2 py-1" value={reactionLogs[slot.id]?.[field.key] ?? ''} onChange={(event) => onReactionChange(slot.id, { [field.key]: event.target.value })} />
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ExactVideoToolPreview({
  bundle,
  anchor,
  displayAnchor,
  anchorMode,
  onAnchorModeChange,
  onAnchorChange,
  weekdays,
  onWeekdaysChange,
  destination,
  onCopyText,
  onDownloadExcel,
  onDownloadCalendar,
  onCopyToEditableDraft,
  copyState,
  downloadState,
  calendarState,
}: {
  bundle: FlowBundle;
  anchor: string;
  displayAnchor: string;
  anchorMode: AnchorMode;
  onAnchorModeChange: (value: AnchorMode) => void;
  onAnchorChange: (value: string) => void;
  weekdays: string[];
  onWeekdaysChange: (value: string[]) => void;
  destination: PrimaryDestination;
  onCopyText: () => void;
  onDownloadExcel: () => void;
  onDownloadCalendar: () => void;
  onCopyToEditableDraft: () => void;
  copyState: string;
  downloadState: string;
  calendarState: string;
}) {
  const item = bundle.items[0];
  const preview = item ? getExactToolPreview(displayAnchor, weekdays, item.title, destination) : [];
  const copy = getEmbeddedToolCopy(destination);

  return (
    <section className="my-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-sm font-semibold text-blue-700">내 도구에 들어간 모습</h2>
          <h3 className="mt-1 text-2xl font-semibold text-gray-950">{copy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{copy.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">추천 리듬: {copy.rhythm}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">{copy.tool}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
          {bundle.flow.source_url ? (
            <a className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
              영상 열기
            </a>
          ) : null}
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyToEditableDraft}>
            내 버전 만들기
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <section aria-label="이번 주 등록 미리보기" className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">{copy.previewTitle}</h3>
              <p className="mt-1 text-sm text-gray-600">미리 들어간 내용을 보고 시작일과 요일만 바꿉니다.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700">{preview.length}개 표시</span>
          </div>
          <ExactToolPreviewGrid entries={preview} destination={destination} />
        </section>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-950">시작일</p>
              <div className="mt-2">
                <AnchorInput
                  bundle={bundle}
                  anchor={anchor}
                  displayAnchor={displayAnchor}
                  mode={anchorMode}
                  onModeChange={onAnchorModeChange}
                  onChange={onAnchorChange}
                  weekdays={weekdays}
                  onWeekdaysChange={onWeekdaysChange}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-950">가져가기</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" onClick={onDownloadCalendar}>
                  캘린더에 넣기
                </button>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onDownloadExcel}>
                  엑셀 실행표 받기
                </button>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyText}>
                  메모/노션에 복사
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {calendarState ? <span className="text-blue-700">{calendarState}</span> : null}
                {downloadState ? <span className="text-blue-700">{downloadState}</span> : null}
                {copyState ? <span className="text-green-700">{copyState}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExactToolPreviewGrid({
  entries,
  destination,
}: {
  entries: { date: string; day: string; label: string; title: string }[];
  destination: PrimaryDestination;
}) {
  if (destination === 'memo') {
    return (
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">일별 적용 체크표</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {entries.map((entry) => (
            <div key={entry.date} className="rounded-md border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-950">{entry.day}요일</p>
              <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
              <p className="mt-2 text-xs font-medium text-blue-700">{entry.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-gray-700">월간 미리보기</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.date} className="rounded-md border border-blue-100 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.day}요일</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{entry.date}</p>
            <p className="mt-2 text-sm text-gray-600">{entry.label}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-950">{entry.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExactVideoRenderer({
  bundle,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const item = bundle.items[0];
  const detail = item ? getItemDetail(bundle, item.id) : undefined;

  if (!item) return null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-950">실행 항목</h2>
            <p className="mt-1 text-sm font-semibold text-blue-700">{bundle.sections[0]?.title ?? '오늘 실행'}</p>
          </div>
          {bundle.flow.source_url ? (
            <a className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
              원본 열기
            </a>
          ) : null}
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
          <label className="flex gap-3">
            <input className="mt-1" type="checkbox" checked={Boolean(checks[item.id])} onChange={() => onToggle(item.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-gray-950">{item.title}</span>
              <DetailPreview detail={detail} />
            </span>
          </label>
          <ItemDetailContent detail={detail} />
        </div>
      </section>
    </div>
  );
}

function RoutineRenderer({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
  weekdays,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  weekdays: string[];
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const rules = (bundle.repeatRules ?? []).join(', ') || '주 3회';
  const firstSection = bundle.sections[0];
  const firstItems = firstSection ? bundle.items.filter((item) => item.section_id === firstSection.id).slice(0, 3) : [];
  const showSafetyNote = hasAttentionRisk(bundle.flow.risk_level) || Boolean(bundle.flow.warning);
  const weekdayLabel = getWeekdaySelectionLabel(bundle);
  const setupLabel = bundle.flow.slug.startsWith('real-fitvely-video-') ? '이번 주 적용 설정' : '이번 주 루틴 설정';
  const previewLabel = bundle.flow.slug.startsWith('real-fitvely-video-') ? '첫 적용 미리보기' : '첫 루틴 미리보기';

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-red-100 bg-red-50/50 p-5">
        <p className="text-sm font-semibold text-red-700">{setupLabel}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">시작일</p>
            <p className="mt-1 font-semibold text-gray-950">{anchor || '미입력'}</p>
          </div>
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">{weekdayLabel}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {weekdays.length ? weekdays.map((day) => (
                <span key={day} className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{day}</span>
              )) : <span className="text-sm text-gray-500">미선택</span>}
            </div>
          </div>
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">반복 규칙</p>
            <p className="mt-1 font-semibold text-gray-950">{rules}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border-l border-red-200 pl-3">
            <p className="text-sm font-semibold text-gray-700">리셋 규칙</p>
            <p className="mt-1 text-sm leading-6 text-gray-600">놓친 날은 부채로 쌓지 않고 다음 가능한 세션부터 다시 시작합니다.</p>
          </div>
          {showSafetyNote ? (
            <div className="border-l border-amber-200 pl-3">
              <p className="text-sm font-semibold text-gray-700">몸 상태 체크</p>
              <p className="mt-1 text-sm leading-6 text-gray-600">{bundle.flow.warning ?? '통증·어지러움이 있으면 강도를 낮추거나 중단합니다.'}</p>
            </div>
          ) : null}
        </div>
        {firstItems.length ? (
          <div className="mt-4 rounded-lg bg-white p-3">
            <p className="text-sm font-semibold text-gray-700">{previewLabel}</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {firstItems.map((item) => (
                <li key={item.id}>- {item.title}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      {bundle.sections.map((section) => (
        <section id={`section-${section.id}`} key={section.id} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-4 space-y-3">
            {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                anchor={anchor}
                checked={Boolean(checks[item.id])}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChecklistRenderer({
  bundle,
  checks,
  itemStates,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      {bundle.sections.map((section) => (
        <section id={`section-${section.id}`} key={section.id} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-4 space-y-3">
            {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                checked={Boolean(checks[item.id])}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
