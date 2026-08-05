import Link from 'next/link';
import { toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import { buildFlowMapActionContract } from '@/lib/flow/flow-map-action-contract';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';
import {
  buildSourceBackedFlowMapPublishPackage,
  getSourceBackedFlowMapQualityDecision,
  isSourceBackedFlowMapExecutable,
  type SourceBackedFlowMapPublishPackage,
} from '@/lib/flow/source-backed-my-flow';
import { PlatformNav } from './PlatformNav';
import { FlowContextDisclosure } from './FlowContextDisclosure';
import { FlowSaveBeforeFrame } from './FlowSaveBeforeFrame';
import { SourceBackedFlowMapExecutionOutline } from './SourceBackedFlowMapExecutionOutline';
import { SourceBackedFlowMapSaveExperience } from './SourceBackedFlowMapSaveExperience';

type SourceBackedFlowMapProps = {
  mapId: string;
  q3CopyEnabled?: boolean;
  visualSubtractionEnabled?: boolean;
};

function getMapRiskLevels(publishPackage: SourceBackedFlowMapPublishPackage) {
  return Array.from(new Set(
    publishPackage.creator.sourceRows
      .map((row) => row.riskLevel)
      .filter((riskLevel): riskLevel is NonNullable<typeof riskLevel> => Boolean(riskLevel)),
  ));
}

function NotFoundMap({ q3CopyEnabled }: { q3CopyEnabled: boolean }) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-8">
      <div className="mx-auto max-w-3xl">
      <PlatformNav />
      <section className="rounded-2xl border border-dashed border-[#E7E4DD] bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">콘텐츠를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          {q3CopyEnabled
            ? '다른 공개 계획이나 내 계획 데모를 확인해 주세요.'
            : '다른 공개 Flow나 내 Flow 데모를 확인해 주세요.'}
        </p>
        <Link className="mt-5 inline-flex rounded-xl bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white" href="/my?demo=source-backed">
          {q3CopyEnabled ? `${copy.navigation.myPlans} 보기` : '내 Flow 보기'}
        </Link>
      </section>
      </div>
    </main>
  );
}

function ReviewHoldMap({
  publishPackage,
  q3CopyEnabled,
}: {
  publishPackage: SourceBackedFlowMapPublishPackage;
  q3CopyEnabled: boolean;
}) {
  const { map, public: publicSurface } = publishPackage;
  const displayTitle = toUserFacingMapTitle(publicSurface.title);
  const qualityDecision = getSourceBackedFlowMapQualityDecision(map.id);
  const needsSourceRows = qualityDecision.executionHoldReason === 'source_rows';
  const needsMedicalSourceFit = qualityDecision.executionHoldReason === 'medical_source_fit';
  const eyebrow = needsSourceRows
    ? '실행 항목 준비 중'
    : needsMedicalSourceFit
      ? '시작 시기 확인 필요'
      : '최신 공식 내용 확인 필요';
  const lead = needsSourceRows
    ? '원문 자료에서 실제로 실행할 항목을 고르는 중이에요.'
    : needsMedicalSourceFit
      ? '아이의 발달과 수유 상태를 확인한 뒤 시작 시기를 정해야 해요.'
    : '공식 원문과 현재 표시 내용을 다시 확인하고 있어요.';
  const description = needsSourceRows
    ? '개별 자료와 난이도를 확인하기 전에는 이 페이지에서 저장하거나 파일로 받지 않습니다. 아래 원문 자료를 먼저 둘러보세요.'
    : needsMedicalSourceFit
      ? '이 페이지의 150~180일 식단은 민간 참고 자료입니다. 현재 공식 안내는 대체로 생후 6개월 무렵 시작을 권하므로, 아이 상태를 확인하기 전에는 새 일정으로 저장하거나 파일로 받지 않습니다.'
    : '공식 내용이 달라질 수 있어 지금은 이 페이지에서 저장하거나 파일로 받지 않습니다. 아래 원문에서 최신 내용을 확인해 주세요.';
  const sourceLinkLabel = needsSourceRows
    ? '원문 자료 둘러보기'
    : needsMedicalSourceFit
      ? '공식 이유식 안내 보기'
      : '최신 공식 내용 확인';
  const hasSeparateReviewSource = Boolean(map.reviewUrl && map.reviewUrl !== map.sourceUrl);
  const identitySourceLabel = hasSeparateReviewSource
    ? needsMedicalSourceFit
      ? '참고 식단표 원문'
      : '원문 보기'
    : sourceLinkLabel;
  const actionContract = buildFlowMapActionContract({
    mapId: map.id,
    title: displayTitle,
    sourceUrl: map.sourceUrl,
    sourceLabel: identitySourceLabel,
    surface: 'public_preview',
    saveMode: publicSurface.saveMode,
    executionState: 'review_hold',
    editable: false,
    exportable: false,
    riskLevels: getMapRiskLevels(publishPackage),
  });

  return (
    <main data-testid="flow-map-public" className="min-h-screen bg-[#FAFAF8] px-4 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <PlatformNav />
        <section
          data-testid="flow-map-review-hold"
          data-map-execution-state={actionContract.controller.executionState}
          data-map-edit-capability={actionContract.capabilities.edit ? 'available' : 'hidden'}
          data-map-save-capability={actionContract.capabilities.save ? 'available' : 'hidden'}
          className="border-t-4 border-[#E2A62B] bg-white px-5 py-7 shadow-[0_18px_50px_rgba(31,35,48,0.07)] sm:px-8 sm:py-10"
        >
          <p className="text-sm font-semibold text-[#8A5A00]">{eyebrow}</p>
          <h1 className="mt-2 break-keep text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {displayTitle}
          </h1>
          <p className="mt-4 max-w-2xl break-keep text-base font-semibold leading-7 text-slate-800">
            {lead}
          </p>
          <p className="mt-2 max-w-2xl break-keep text-sm leading-6 text-slate-600">
            {description}
          </p>
          {actionContract.risk.caution ? (
            <p
              data-testid="flow-map-risk-caution"
              data-adjacent-to-action={actionContract.risk.caution.adjacentToActionId}
              className="mt-4 border-l-2 border-[#E2A62B] bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-950"
            >
              {actionContract.risk.caution.text}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {hasSeparateReviewSource ? (
              <a
                data-testid="flow-map-review-source-link"
                className="inline-flex min-h-11 items-center justify-center bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2944DB]"
                href={map.reviewUrl}
                target="_blank"
                rel="noreferrer"
              >
                {sourceLinkLabel}
              </a>
            ) : null}
            <a
              data-testid="flow-map-source-link"
              data-flow-identity-slot="source"
              data-map-action-intent={actionContract.identity.source.intent}
              className={`inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold ${hasSeparateReviewSource ? 'border border-[#D9D6CF] bg-white text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]' : 'bg-[#3654FF] text-white hover:bg-[#2944DB]'}`}
              href={actionContract.identity.source.href}
              target="_blank"
              rel="noreferrer"
            >
              {actionContract.identity.source.label}
            </a>
            <Link
              className="inline-flex min-h-11 items-center justify-center border border-[#D9D6CF] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]"
              href="/flows"
            >
              {q3CopyEnabled ? '다른 계획 찾기' : '다른 Flow 찾기'}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SourceBackedFlowMapPublicPage({
  mapId,
  q3CopyEnabled = true,
  visualSubtractionEnabled = true,
}: SourceBackedFlowMapProps) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return <NotFoundMap q3CopyEnabled={q3CopyEnabled} />;
  if (!isSourceBackedFlowMapExecutable(publishPackage.map)) {
    return <ReviewHoldMap publishPackage={publishPackage} q3CopyEnabled={q3CopyEnabled} />;
  }

  const { map, public: publicSurface } = publishPackage;
  const displayTitle = toUserFacingMapTitle(publicSurface.title);
  const chooseChildBeforeSave = publicSurface.saveMode === 'choose_child';
  const riskLevels = getMapRiskLevels(publishPackage);
  const choiceCopy = publicSurface.choiceCopy ?? {
    resultPromise: '준비표 하나를 고른 뒤 필요한 설정을 확인해 저장합니다.',
    heading: '먼저 준비표 하나를 고르세요.',
    body: q3CopyEnabled
      ? '각 준비표 화면에서 필요한 설정을 확인한 뒤 내 계획에 저장합니다.'
      : '각 준비표 화면에서 필요한 설정을 확인한 뒤 내 Flow에 저장합니다.',
    inputLabel: q3CopyEnabled ? '계획별 설정' : '준비표별 설정',
    childCtaLabel: '설정하고 시작',
  };
  const previewSteps = publicSurface.childFlows.flatMap((flow) => flow.steps.map((step) => ({
    ...step,
    itemKey: `${flow.slug}::${step.id}`,
    flowSlug: flow.slug,
    flowTitle: flow.title,
  })));
  const previewRows = previewSteps.map((step) => ({
    id: step.itemKey,
    timing: step.stepTitle ? toUserFacingSourceTitle(step.stepTitle) : undefined,
    title: step.title,
    summary: step.detailItems[0],
  }));
  const actionContract = buildFlowMapActionContract({
    mapId: map.id,
    title: displayTitle,
    sourceUrl: map.sourceUrl,
    sourceLabel: '원문 보기',
    surface: 'public_preview',
    saveMode: publicSurface.saveMode,
    executionState: 'executable',
    editable: !chooseChildBeforeSave,
    exportable: false,
    selection: chooseChildBeforeSave
      ? undefined
      : { selectedCount: previewSteps.length, totalCount: previewSteps.length },
    riskLevels,
  });
  const decisionActions = (
    <div
      data-testid="flow-map-choose-child"
      data-map-action-intent={actionContract.actions.primary?.intent}
      className="grid gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#6E6B64]">
          {q3CopyEnabled
            ? copy.map.selectPlans
            : actionContract.actions.primary?.label ?? '사용할 Flow를 고르세요'}
        </p>
        {q3CopyEnabled ? (
          <FlowContextDisclosure
            kind="help"
            label="계획 선택 도움말"
            eyebrow="선택 도움말"
            title="사용할 계획을 고르세요"
            testId="flow-map-choice-help"
          >
            <p>목적에 맞는 계획 하나를 열어 내용을 확인하세요. 이 단계에서는 아직 내 계획에 저장되지 않습니다.</p>
          </FlowContextDisclosure>
        ) : null}
      </div>
      {publicSurface.childFlows.map((flow) => (
        <Link
          key={flow.slug}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#D9D6CF] bg-white px-3 py-2.5 text-sm font-semibold text-[#1B1A17] hover:border-[#3654FF]/40 hover:text-[#3654FF]"
          href={`/f/${flow.slug}`}
        >
          <span className="min-w-0 break-keep">{toContentDisplayTitle(flow.title)}</span>
          <span className="shrink-0 text-xs text-[#3654FF]">열기 →</span>
        </Link>
      ))}
      {actionContract.risk.caution ? (
        <p
          data-testid="flow-map-risk-caution"
          data-adjacent-to-action={actionContract.risk.caution.adjacentToActionId}
          className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950"
        >
          {actionContract.risk.caution.text}
        </p>
      ) : null}
    </div>
  );

  return (
    <main
      data-testid="flow-map-public"
      data-map-save-mode={actionContract.controller.saveMode}
      data-map-execution-state={actionContract.controller.executionState}
      className={`${chooseChildBeforeSave ? '' : 'flowme-mobile-map-save-clearance'} min-h-screen bg-[#FAFAF8] px-4 py-5 pb-28 sm:px-5 sm:py-8 sm:pb-16`}
    >
      <div className="mx-auto max-w-5xl">
      <PlatformNav />
      {chooseChildBeforeSave ? (
        <>
          <FlowSaveBeforeFrame
            rootTestId="flow-map-hero"
            previewTestId="flow-map-artifact-preview"
            previewRowTestId="flow-map-artifact-preview-row"
            eyebrow={copy.publicPreview.eyebrow}
            title={displayTitle}
            categoryLabel={publicSurface.categoryLabel}
            sourceLabel={toUserFacingSourceTitle(publicSurface.sourceTitle)}
            sourceHref={actionContract.identity.source.href}
            inputLabel={q3CopyEnabled ? '계획별 설정' : 'Flow별 설정'}
            resultLabel={`선택지 ${publicSurface.childFlows.length}개`}
            itemCount={previewSteps.length}
            previewRows={previewRows}
            actions={decisionActions}
            composition="legacy"
            showScheduleIntent={!visualSubtractionEnabled}
            q3CopyEnabled={q3CopyEnabled}
          />
          <SourceBackedFlowMapExecutionOutline
            sourceTitle={publicSurface.sourceTitle}
            sourceHref={actionContract.identity.source.href}
            sourceLabel={actionContract.identity.source.label}
            sourceActionIntent={actionContract.identity.source.intent}
            summary={publicSurface.summary}
            inputLabel={choiceCopy.inputLabel}
            itemCount={previewSteps.length}
            chooseChildBeforeSave
            childCtaLabel={choiceCopy.childCtaLabel}
            flows={publicSurface.childFlows.map((flow) => ({
              ...flow,
              steps: flow.steps.map((step) => ({
                ...step,
                itemKey: `${flow.slug}::${step.id}`,
              })),
            }))}
          />
        </>
      ) : (
        <SourceBackedFlowMapSaveExperience
          publishPackage={publishPackage}
          displayTitle={displayTitle}
          sourceLabel={actionContract.identity.source.label}
          q3CopyEnabled={q3CopyEnabled}
          visualSubtractionEnabled={visualSubtractionEnabled}
        />
      )}
      </div>
    </main>
  );
}
