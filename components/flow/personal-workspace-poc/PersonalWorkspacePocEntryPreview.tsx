'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { readPersonalWorkspacePocEntryPreview, type PersonalWorkspacePocEntryReadPacket,
  type PersonalWorkspacePocEntrySourceItem, type PersonalWorkspacePocEntryReadField } from '@/lib/flow/personal-workspace-poc-entry-read';
import type { PersonalWorkspacePocEntryNavigationPresentation } from '@/lib/flow/personal-workspace-poc-entry-navigation';
import { PersonalWorkspacePocResultPresenter, type PersonalWorkspacePocResultOpenItemIntent } from './PersonalWorkspacePocResultPresenter';

const control = 'min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
function fieldText(field: PersonalWorkspacePocEntryReadField<string>, missing: string) {
  return field.availability === 'present' ? field.value : missing;
}
function scheduleText(item: PersonalWorkspacePocEntrySourceItem) {
  const schedule = item.sourceSchedule;
  if (schedule?.mode === 'day-offset') return `기준일 ${schedule.dayOffset < 0 ? '' : '+'}${schedule.dayOffset}일`;
  if (schedule?.mode === 'absolute') return schedule.date ?? '날짜 값 없음';
  if (schedule?.mode === 'none') return '날짜 미정';
  if (schedule?.mode === 'unsupported') return '이 원문 일정 형식은 표시하지 못합니다.';
  return fieldText(item.date, '원문 날짜 정보 없음');
}
function SourceDetails({ item }: Readonly<{ item: PersonalWorkspacePocEntrySourceItem }>) {
  return <>
    <dt className="font-semibold">원문 설명</dt>
    <dd data-testid="personal-workspace-item-description" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{fieldText(item.description, '보유한 원문 설명이 없습니다.')}</dd>
    <dt className="mt-3 font-semibold">완료 기준</dt>
    <dd data-testid="personal-workspace-item-completion-criterion" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.completionCriterion ?? '보유한 완료 기준이 없습니다.'}</dd>
    <dt className="mt-3 font-semibold">원문 일정</dt>
    <dd data-testid="personal-workspace-item-source-schedule">{scheduleText(item)}{item.time !== undefined ? ` · ${item.time}` : ''}</dd>
    {item.sourceChecked !== undefined ? <><dt className="mt-3 font-semibold">원문 체크 표식</dt><dd>{item.sourceChecked ? '체크됨' : '체크 안 됨'} · 개인 완료와 별개</dd></> : null}
    {item.sourceLink ? <><dt className="mt-3 font-semibold">항목 출처</dt><dd className="break-words [overflow-wrap:anywhere]">{item.sourceLabel}{item.sourceLink.status === 'safe'
      ? <a href={item.sourceLink.href} target="_blank" rel="noopener noreferrer" className="block min-h-11 py-2 text-teal-800 underline">항목 원문 열기</a>
      : <span>원문 링크를 열 수 없어요.</span>}</dd></> : null}
  </>;
}

/** No writer port: the same personal result and retained source fields have separate reading owners. */
export function PersonalWorkspacePocEntryPreview({ packet, flowRef, localToday, beforeReadAction, presentation, onPresentationChange }: Readonly<{
  packet: PersonalWorkspacePocEntryReadPacket; flowRef: string; localToday: string;
  beforeReadAction: () => boolean;
  presentation: PersonalWorkspacePocEntryNavigationPresentation['preview'];
  onPresentationChange: (next: PersonalWorkspacePocEntryNavigationPresentation['preview']) => void;
}>) {
  const { owner, openItemRef, ...navigation } = presentation;
  const opener = useRef<string | undefined>(undefined);
  const host = useRef<HTMLDivElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const focusFrame = useRef<number | undefined>(undefined);
  const scope = `${flowRef}/${owner}/${navigation.resultView}/${navigation.baseDate ?? ''}/${navigation.selectedDate ?? ''}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  useEffect(() => () => { if (focusFrame.current !== undefined) window.cancelAnimationFrame(focusFrame.current); }, [scope, packet]);
  const read = useMemo(() => readPersonalWorkspacePocEntryPreview(packet, { flowRef, localToday,
    ...(navigation.baseDate ? { baseDate: navigation.baseDate } : {}),
    ...(navigation.selectedDate ? { selectedDate: navigation.selectedDate } : {}),
  }), [packet, flowRef, localToday, navigation.baseDate, navigation.selectedDate]);
  if (!read.ok) return <p role="alert" className="py-4 text-sm text-red-800">이 사본을 안전하게 읽지 못했습니다. 목록에서 다시 선택해 주세요.</p>;
  const preview = read.preview;
  const detail = openItemRef ? preview.sourceView.items.find(item => item.itemRef === openItemRef) : undefined;
  const personal = detail ? preview.personalDetails.find(item => item.itemRef === detail.itemRef)?.memo : undefined;
  const title = detail ? owner === 'source' ? fieldText(detail.title, '원문 제목 정보 없음')
    : preview.personalResult.items.find(item => (item.sourceItemRef ?? item.ref) === detail.itemRef)?.title ?? '항목 상세' : '';
  const close = () => {
    const selector = opener.current;
    onPresentationChange({ owner, ...navigation });
    focusFrame.current = window.requestAnimationFrame(() => {
      if (latestScope.current !== scope || !beforeReadAction()) return;
      const sourceIndex = preview.sourceView.items.findIndex(item => item.itemRef === openItemRef);
      const fallback = owner === 'source' ? host.current?.querySelector<HTMLElement>(`#personal-workspace-entry-source-item-${sourceIndex}`)
        : [...(host.current?.querySelectorAll<HTMLElement>('[data-result-open-item]') ?? [])].find(button => button.dataset.resultOpenItem === openItemRef);
      (selector ? host.current?.querySelector<HTMLElement>(selector) ?? fallback : fallback)?.focus();
    });
  };
  const open = (intent: Pick<PersonalWorkspacePocResultOpenItemIntent, 'itemRef' | 'returnFocusSelector'>) => {
    opener.current = intent.returnFocusSelector;
    onPresentationChange({ owner, ...navigation, openItemRef: intent.itemRef });
    focusFrame.current = window.requestAnimationFrame(() => { if (latestScope.current === scope && beforeReadAction()) detailHeading.current?.focus(); });
  };
  const navigate = (next: Omit<PersonalWorkspacePocEntryNavigationPresentation['preview'], 'owner' | 'openItemRef'>) => { onPresentationChange({ owner, ...next }); };
  return <div ref={host} data-testid="personal-workspace-entry-preview" data-entry-owner={owner} className="mt-4 min-w-0"
    onClickCapture={event => { if (!beforeReadAction()) { event.preventDefault(); event.stopPropagation(); } }}
    onKeyDownCapture={event => { if (!beforeReadAction()) { event.preventDefault(); event.stopPropagation(); } }}
    onKeyDown={event => { if (event.key === 'Escape' && openItemRef) { event.preventDefault(); close(); } }}>
    <div role="group" aria-label="미리보기 기준" className="mb-3 flex flex-wrap gap-2">
      {(['personal-copy', 'source'] as const).map(value => <button key={value} type="button" aria-pressed={owner === value}
        className={`${control} ${owner === value ? 'border-teal-700 bg-teal-50 text-teal-900' : ''}`}
        onClick={() => { if (owner !== value) onPresentationChange({ ...navigation, owner: value }); }}>
        {value === 'personal-copy' ? '내 사본 미리보기' : '원문 기준 보기'}
      </button>)}
    </div>
    {owner === 'personal-copy' ? <div data-testid="personal-workspace-entry-flow-items">
      <PersonalWorkspacePocResultPresenter readOnly projection={preview.personalResult} navigation={navigation}
        headingId="personal-workspace-entry-views-heading"
        onResultViewChange={resultView => navigate({ ...navigation, resultView: resultView === 'txt' ? 'text' : resultView })}
        onCalendarBaseDateChange={baseDate => navigate({ ...navigation, baseDate })}
        onCalendarSelectedDateChange={selectedDate => navigate({ ...navigation, selectedDate })}
        onOpenItem={open} />
    </div> : <section aria-label="보유한 원문 정보" className="min-w-0">
      <p className="text-sm leading-6 text-slate-600">전체 원문은 저장되어 있지 않습니다. 확인 가능한 원문 정보만 표시합니다. 개인 수정과 실행 기록은 포함하지 않습니다.</p>
      <h4 className="mt-3 break-words font-semibold [overflow-wrap:anywhere]">{fieldText(preview.sourceView.title, '원문 제목 정보 없음')}</h4>
      {preview.sourceView.orderAvailability === 'unavailable' ? <p className="mt-1 text-xs text-slate-600">원문 순서를 확인할 수 없습니다.</p> : null}
      <ol className="mt-3 divide-y divide-slate-200">
        {preview.sourceView.items.map((item, index) => <li key={item.itemRef} data-source-item-ref={item.itemRef} className="py-2">
          <button id={`personal-workspace-entry-source-item-${index}`} type="button" className={`${control} w-full break-words text-left [overflow-wrap:anywhere]`}
            onClick={() => open({ itemRef: item.itemRef, returnFocusSelector: `#personal-workspace-entry-source-item-${index}` })}>
            {fieldText(item.title, '원문 제목 정보 없음')}
          </button>
          {item.sectionId ? <p className="mt-1 text-xs leading-5 text-slate-600">{(() => {
            const section = preview.sourceView.sections.find(value => value.sectionId === item.sectionId);
            return section ? fieldText(section.title, '원문 구간 제목 정보 없음') : '원문 구간 정보 없음';
          })()}</p> : null}
          <p className="mt-1 text-xs leading-5 text-slate-600">{scheduleText(item)}</p>
        </li>)}
      </ol>
    </section>}
    {detail ? <section data-testid="personal-workspace-entry-item-detail" aria-labelledby="personal-workspace-entry-detail-heading"
      className="mt-4 min-w-0 rounded-md border border-teal-700 bg-teal-50 p-4 text-sm leading-6 text-slate-800">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h4 id="personal-workspace-entry-detail-heading" ref={detailHeading} tabIndex={-1} className="min-w-0 break-words font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700 [overflow-wrap:anywhere]">{title}</h4>
        <button type="button" className={`${control} shrink-0`} onClick={close}>상세 닫기</button>
      </div>
      <dl className="mt-3 min-w-0"><SourceDetails item={detail} />
        {owner === 'personal-copy' ? <><dt className="mt-3 font-semibold">개인 메모</dt><dd data-testid="personal-workspace-item-personal-memo"
          className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{personal?.availability === 'present' ? personal.value : '기록한 개인 메모가 없습니다.'}</dd></> : null}
      </dl>
    </section> : null}
  </div>;
}
