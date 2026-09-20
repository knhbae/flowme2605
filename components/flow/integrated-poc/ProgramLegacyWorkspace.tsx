'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programId } from '@/lib/flow/integrated-poc/contract';
import { programLegacyFolders } from '@/lib/flow/integrated-poc/legacy-folder-bridge';
import { createProgramLegacyPort } from '@/lib/flow/integrated-poc/legacy-port';
import type { ProgramLegacyView } from '@/lib/flow/integrated-poc/legacy-transaction';
import { inspectProgramLegacySnapshotPayload } from '@/lib/flow/integrated-poc/legacy-snapshot';
import { partitionProgramLegacyCapabilities } from '@/lib/flow/integrated-poc/legacy-capabilities';
import { programDate } from '@/lib/flow/integrated-poc/program-data';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { buildPersonalWorkspacePocTasks, type PersonalWorkspacePocTask } from '@/lib/flow/personal-workspace-poc-view-model';
import { ProgramLegacyPlan } from './ProgramLegacyPlan';
import { ProgramLegacyMapMembership } from './ProgramLegacyMapMembership';
import { programLegacyMapMembershipChildRetained } from '@/lib/flow/integrated-poc/legacy-map-membership-state';
import { ProgramLegacyMapItemEvidence } from './ProgramLegacyMapItemEvidence';
import { programLegacyPlanExecutionDate, programLegacyPlanItemIncluded } from '@/lib/flow/integrated-poc/program-legacy-plan-contract';
import { isPersonalWorkspacePocMemberInactive } from '@/lib/flow/personal-workspace-poc-state';
import type { PersonalWorkspacePocFlow, PersonalWorkspacePocTransition } from '@/lib/flow/personal-workspace-poc-contract';
import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';
import { MyPlanExecutionSurface } from '../my-flow/MyPlanExecutionSurface';
import { ProgramLegacySourceReview } from './ProgramLegacySourceReview';
import { readProgramLegacyMapReview, programLegacyMapQualityHold, type ProgramLegacyMapReviewAction } from '@/lib/flow/integrated-poc/legacy-map-review';
import styles from './ProgramLegacyWorkspace.module.css';

export type ProgramLegacyWorkspaceProps = { data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; onUndo: () => Promise<void>; today: string; selectedFlowId?: string; onRegisterEditors?: (api: ProgramEditorFlush | null) => void };
export type ProgramLegacyEdit = { kind: 'flow' | 'item' | 'date'; flowRef: string; itemRef?: string; title: string; memo: string; date: string };
export type ProgramLegacyEditor = { actorId: string; documentId: string; view: ProgramLegacyView; draft: ProgramLegacyEdit };
type Editor = ProgramLegacyEditor;

export function programLegacyDraftText(editor: Editor) {
  return `개인 변경 초안 (아직 저장하지 않음)\n제목: ${editor.draft.title}\n실행 날짜: ${editor.draft.date || '(날짜 미정)'}\n\n개인 메모\n${editor.draft.memo}`;
}
/** Synchronous draft/lock ownership: React's next render is not a safety boundary. */
export function createProgramLegacyEditorCoordinator(input: {
  onChange: (editor: Editor | null) => void; onLockChange: (locked: boolean) => void;
  isBusy: () => boolean; save: (editor: Editor) => Promise<boolean>;
}) {
  let current: Editor | null = null, depth = 0, flight: Promise<boolean> | null = null;
  const set = (editor: Editor | null) => { current = editor; input.onChange(editor); };
  const canEdit = () => depth === 0 && !flight && !input.isBusy();
  const api = {
    read: () => current,
    hasPendingInput: () => current !== null,
    pendingDocumentIds: () => current ? [current.documentId] : [],
    captureDrafts: () => current ? [{ title: current.draft.title || '개인 변경 초안', raw: programLegacyDraftText(current) }] : [],
    canAct: () => canEdit() && !current,
    canEdit,
    replace: (editor: Editor | null) => { if (!canEdit()) return false; set(editor); return true; },
    update: (patch: Partial<ProgramLegacyEdit>) => { if (!current || !canEdit()) return false; set({ ...current, draft: { ...current.draft, ...patch } }); return true; },
    lockInput: () => {
      depth++; input.onLockChange(true); let released = false;
      return () => { if (released) return; released = true; depth--; input.onLockChange(depth > 0); };
    },
    flushAll: (): Promise<boolean> => {
      if (flight) return flight;
      if (!current) return Promise.resolve(!input.isBusy());
      if (input.isBusy()) return Promise.resolve(false);
      const captured = current;
      // Defer the save until flight is installed, so reentrant input cannot race it.
      flight = Promise.resolve().then(() => input.save(captured)).then(ok => {
        if (ok && current === captured) set(null);
        return ok && current === null;
      }, () => false).finally(() => { flight = null; });
      return flight;
    },
  };
  return api;
}

export function ProgramLegacyEditorPanel({ editor, locked, busy, stale, latest, discarding, headingRef, update, save, acceptLatest, close, discard, resume, copy }: {
  editor: Editor; locked: boolean; busy: boolean; stale: boolean;
  latest: Pick<ProgramLegacyEdit, 'title' | 'memo' | 'date'> | null; discarding: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>; update: (patch: Partial<ProgramLegacyEdit>) => void;
  save: () => void; acceptLatest: () => void; close: () => void; discard: () => void; resume: () => void; copy: () => void;
}) {
  return <section className={styles.editor} aria-label="개인 변경 편집"><h2 ref={headingRef} tabIndex={-1}>{editor.draft.kind === 'flow' ? '개인 계획 이름' : editor.draft.kind === 'date' ? '개인 실행 날짜' : '개인 제목·메모'}</h2>
    <form onSubmit={event => { event.preventDefault(); save(); }}>{editor.draft.kind === 'date' ? <label>실행 날짜<input type="date" value={editor.draft.date} onChange={event => update({ date: event.target.value })} disabled={busy || locked} /><small>비우면 날짜 미정으로 둡니다. 원문 날짜는 바뀌지 않습니다.</small></label> : <><label>제목<input required maxLength={500} value={editor.draft.title} onChange={event => update({ title: event.target.value })} disabled={busy || locked} /></label>{editor.draft.kind === 'item' && <label>개인 메모<textarea rows={5} maxLength={30000} value={editor.draft.memo} onChange={event => update({ memo: event.target.value })} disabled={busy || locked} /></label>}</>}
      {stale && <div className={styles.error}><h3>최신 내용과 비교</h3><p>연결 상태가 바뀌었습니다. 입력은 보존했습니다.</p>{latest ? <><dl>{(editor.draft.kind === 'date' ? ['date'] : editor.draft.kind === 'flow' ? ['title'] : ['title', 'memo']).map(key => <React.Fragment key={key}><dt>{key === 'title' ? '제목' : key === 'memo' ? '메모' : '날짜'}</dt><dd><span>최신: {latest[key as keyof typeof latest] || '(비어 있음)'}</span><span>내 입력: {editor.draft[key as 'title' | 'memo' | 'date'] || '(비어 있음)'}</span></dd></React.Fragment>)}</dl><button type="button" disabled={busy || locked} onClick={acceptLatest}>차이를 확인했고 내 입력으로 다시 저장할 준비</button></> : <p>지금은 연결한 대상에 저장할 수 없습니다. 계속 편집하거나 아래 원문을 복사해 보관할 수 있습니다.</p>}</div>}
      <div className={styles.actions}><button className={styles.primary} disabled={busy || stale}>개인 변경 저장</button><button type="button" disabled={busy || locked} onClick={close}>편집 닫기</button></div>
    </form>
    <details className={styles.recovery} open={stale}><summary>저장 전 입력 보관</summary><p>화면 연결에 문제가 있어도 입력은 여기 남습니다. 새로고침하거나 창을 닫기 전 복사해 주세요.</p><label>복사할 편집 원문<textarea readOnly rows={7} value={programLegacyDraftText(editor)} onFocus={event => event.currentTarget.select()} /></label><button type="button" onClick={copy}>입력 원문 복사</button></details>
    {discarding && <div className={styles.notice}><p>저장하지 않은 입력을 버리고 닫을까요?</p><div className={styles.actions}><button disabled={busy || locked} onClick={discard}>입력 버리고 닫기</button><button onClick={resume}>계속 편집</button></div></div>}
  </section>;
}

export function programLegacyWorkspaceModel(view: ProgramLegacyView) {
  const checked = inspectProgramLegacySnapshotPayload(view.payload);
  if (!checked.ok) return null;
  const partition = partitionProgramLegacyCapabilities(view.payload);
  if (!partition.ok) return null;
  const ordinary = new Set(partition.items.filter(item => item.capability === 'ordinary').map(item => item.itemRef));
  const itemTitles = new Map(checked.model.flows.flatMap(flow => flow.items.map(item => [item.ref, item.title] as const)));
  return { flows: checked.model.flows.filter(flow => !isPersonalWorkspacePocMemberInactive(view.payload.state, flow.ref)).map(flow => ({ ...flow, title: view.canonicalFolders.byFlow[flow.ref]?.title ?? flow.title })),
    tasks: buildPersonalWorkspacePocTasks(checked.model, view.payload.state).filter(task => task.kind === 'quick_item' || ordinary.has(task.ref) && !programLegacyMapMembershipChildRetained(view.payload.mapMembership, task.flowRef ?? '') && programLegacyPlanItemIncluded(task.flowRef ? view.payload.planSelections?.flows[task.flowRef] : undefined, task.ref)).map(task => {
      const context = task.flowRef ? checked.sourceContextByFlow.get(task.flowRef)?.get(task.ref) : undefined;
      const time = view.payload.state.placements[task.ref]?.time ?? context?.attributes.time;
      return { ...task, date: programLegacyPlanExecutionDate(task.flowRef ? view.payload.planSelections?.flows[task.flowRef] : undefined, view.payload.state, task.ref, task.date ?? null) ?? undefined, ...(time ? { time } : {}), folderId: view.canonicalFolders.byItem[task.ref]?.folderId ?? task.folderId };
    }), folders: view.canonicalFolders.folders, nonordinary: partition.items.filter(item => item.capability !== 'ordinary').map(item => ({ ...item, title: itemTitles.get(item.itemRef) ?? '제목을 확인할 수 없는 항목' })) };
}

/** Display follows the fully validated execution projection, never a token match alone. */
export function programLegacyMapExecutionHeld(flow?: PersonalWorkspacePocFlow) {
  const group = flow?.presentation?.mapGroup;
  return !!group && (group.executionState === 'review-hold' || !!programLegacyMapQualityHold(group.ownerId));
}

export function programLegacyMapReviewPresentation(review: NonNullable<ReturnType<typeof readProgramLegacyMapReview>>, effectiveFlow?: PersonalWorkspacePocFlow) {
  const group = effectiveFlow?.presentation?.mapGroup;
  const confirmed = review.held && review.blockers.length === 0 && group?.groupRef === review.groupRef && group.executionState === 'executable';
  return { confirmed, required: review.held && !confirmed };
}

export function programLegacyCapabilityNotices(items: NonNullable<ReturnType<typeof programLegacyWorkspaceModel>>['nonordinary']) {
  const groups = new Map<string, { key: string; text: string; items: typeof items }>();
  for (const item of items) {
    const key = `${item.capability}:${item.reason}`;
    const group = groups.get(key) ?? { key, items: [], text: item.reason === 'source-item-execution-archived'
      ? '원문 연결 검토에서 실행 보관했습니다. 개인 내용·날짜·기록은 연결한 문서에 남아 있습니다.'
      : item.capability === 'series' ? '반복 회차는 연결한 개인 문서의 회차 도구에서 확인하세요.'
      : item.capability === 'held' ? 'Map 실행 조건 검토가 필요합니다.' : '원문 일정·행 연결을 안전하게 해석할 수 없습니다.' };
    group.items.push(item); groups.set(key, group);
  }
  return [...groups.values()];
}

export function programLegacyEditorRegistry(read: () => (ProgramEditorFlush | null)[]): ProgramEditorFlush {
  return {
    hasPendingInput: () => read().some(port => port?.hasPendingInput?.()),
    pendingDocumentIds: () => [...new Set(read().flatMap(port => port?.pendingDocumentIds?.() ?? []))],
    captureDrafts: () => read().flatMap(port => port?.captureDrafts?.() ?? []),
    blocksExternalSnapshot: (before, next) => read().some(port => port?.blocksExternalSnapshot?.(before, next)),
    lockInput: () => { const releases = read().flatMap(port => port ? [port.lockInput()] : []); return () => releases.reverse().forEach(release => release()); },
    flushAll: async () => { for (const port of read()) if (port && !await port.flushAll()) return false; return !read().some(port => port?.hasPendingInput?.()); },
  };
}
/** Keep the source list reachable even when the selected document cannot execute. */
export function programLegacyWorkspaceCatalog(data: ProgramData) {
  const space = data.spaces[data.activeActorId], folders = programLegacyFolders(space);
  try {
    const checked = inspectProgramLegacySnapshotPayload(JSON.parse(space.legacySnapshot?.raw ?? 'null'));
    return { ...folders, sources: checked.ok ? [...checked.payload.model.flows, ...(checked.payload.state.authoredFlows ?? [])] : [], flows: checked.ok ? checked.model.flows.filter(flow => !isPersonalWorkspacePocMemberInactive(checked.payload.state, flow.ref)).map(flow => ({ ...flow,
      title: folders.byFlow[flow.ref]?.title ?? flow.title })) : [] };
  } catch { return { ...folders, sources: [], flows: [] }; }
}
function planAction(view: ProgramLegacyView, flow: PersonalWorkspacePocFlow, now: string): Extract<PersonalWorkspacePocTransition, { type: 'apply-personal-plan' }> {
  return { type: 'apply-personal-plan', flowRef: flow.ref, savedCopyId: flow.savedCopyId, flowId: flow.flowId, origin: flow.origin,
    expectedRevision: view.payload.state.revision, knownItemRefs: flow.items.map(item => item.ref),
    knownSectionIds: flow.sections?.map(section => section.sectionId), editableSectionIds: flow.sections?.filter(section => section.editCapability === 'poc-shadow').map(section => section.sectionId),
    overlay: view.payload.state.personalPlanOverlays?.[flow.ref] ?? { flowRef: flow.ref, savedCopyId: flow.savedCopyId, flowId: flow.flowId, items: {} }, now };
}
/** Allowlisted personal fields only. This cannot edit the original source. */
export function makeProgramLegacyEditAction(view: ProgramLegacyView, draft: ProgramLegacyEdit, now: string): PersonalWorkspacePocTransition | null {
  const model = programLegacyWorkspaceModel(view), flow = model?.flows.find(flow => flow.ref === draft.flowRef);
  if (!flow) return null;
  if (draft.kind === 'date') return draft.itemRef && flow.items.some(item => item.ref === draft.itemRef) && (!draft.date || programDate(draft.date))
    ? { type: 'move-date', itemRef: draft.itemRef, ...(draft.date ? { date: draft.date } : {}), now } : null;
  if (!draft.title.trim() || /[\r\n]/u.test(draft.title) || draft.title.length > 500 || draft.memo.length > 30000) return null;
  const action = planAction(view, flow, now);
  if (draft.kind === 'flow') return { ...action, overlay: { ...action.overlay, title: draft.title.trim() } };
  if (!draft.itemRef || !flow.items.some(item => item.ref === draft.itemRef)) return null;
  return { ...action, overlay: { ...action.overlay, items: { ...action.overlay.items,
    [draft.itemRef]: { ...(action.overlay.items[draft.itemRef] ?? { itemRef: draft.itemRef }), title: draft.title.trim(), memo: draft.memo } } } };
}
export function makeProgramLegacyOrderAction(view: ProgramLegacyView, flowRef: string, itemRef: string, direction: -1 | 1, now: string): PersonalWorkspacePocTransition | null {
  const flow = programLegacyWorkspaceModel(view)?.flows.find(flow => flow.ref === flowRef); if (!flow) return null;
  const ordered = [...flow.items].sort((a, b) => a.sourceOrder - b.sourceOrder).map(item => item.ref), index = ordered.indexOf(itemRef), destination = index + direction;
  if (index < 0 || destination < 0 || destination >= ordered.length) return null;
  [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
  const action = planAction(view, flow, now); return { ...action, overlay: { ...action.overlay, orderedItemRefs: ordered } };
}
export function programLegacyIssueText(code: string): string {
  const messages: Record<string, string> = {
    'missing-legacy-snapshot': '연결한 기존 계획이 없습니다. 내 공간에서 기존 계획을 먼저 연결해 주세요.',
    'recurrence-window-required': '반복의 회차·예외를 새 문서와 맞추는 연결이 아직 없습니다. 반복 원본은 유지했습니다.',
    'map-review-required': '검토 대기 중인 Map입니다. 묶음의 원문과 실행 조건을 먼저 확인해야 합니다.',
    'archived-document-review-required': '연결한 문서가 보관 중입니다. 내 공간에서 복원한 뒤 다시 열어 주세요.',
    'unmapped-folder': '새 개인 폴더를 기존 계획의 폴더와 연결하지 못했습니다. 폴더를 임의로 바꾸지 않았습니다.',
    'structure-review-required': '문서 간 이동·하위 구조의 변경을 안전하게 맞추지 못했습니다. 개인 문서의 추가 내용은 유지했습니다.',
    'unrepresentable-shadow-field': '기존 형식이 이 개인 변경을 표현하지 못합니다. 변경을 버리지 않고 문서에 유지했습니다.',
    'unsupported-action': '이 동작은 아직 단일 저장 경로에 연결되지 않았습니다. 기존 저장소로 우회하지 않습니다.',
    'use-program-undo': '이 화면의 되돌리기는 내 공간과 같은 변경 기록을 사용합니다.',
    'stale-program-view': '다른 변경이 먼저 저장됐습니다. 입력은 유지했습니다. 최신 내용과 비교해 주세요.',
    'actor-mismatch': '현재 인물에게 연결된 계획만 수정할 수 있습니다.',
  };
  return messages[code] ?? '기존 내용과 개인 문서를 안전하게 연결하지 못했습니다. 원본과 개인 입력은 변경하지 않았습니다.';
}

export type ProgramLegacyMapDraft = { token: string; action: ProgramLegacyMapReviewAction; documentIds: string[] };
/** The source token is opaque CAS evidence, not a navigation/document schema. */
export function createProgramLegacyMapEditor(read: () => ProgramLegacyMapDraft | null, isBusy: () => boolean): ProgramEditorFlush {
  return {
    lockInput: () => () => undefined, // The registry locks the parent coordinator synchronously.
    hasPendingInput: () => !!read(),
    pendingDocumentIds: () => [...(read()?.documentIds ?? [])],
    captureDrafts: () => {
      const draft = read(); return draft ? [{ title: 'Map 개인 검토 선택', raw: `아직 확정하지 않은 출처 선택\n${Object.entries(draft.action.sourceByItemRef).map(([ref, url]) => `${ref}\n${url}`).join('\n\n')}\n확인한 조건\n${draft.action.acknowledgedReasons.join('\n')}` }] : [];
    },
    flushAll: async () => !read() && !isBusy(),
  };
}

export function ProgramLegacyWorkspace({ data, mutate, navigate, onUndo, today, selectedFlowId, onRegisterEditors }: ProgramLegacyWorkspaceProps) {
  const actorId = data.activeActorId, dataRef = useRef(data); dataRef.current = data;
  const mutateRef = useRef(mutate); mutateRef.current = mutate;
  const port = useMemo(() => createProgramLegacyPort({ actorId, readData: () => dataRef.current, mutate: (label, build, options) => mutateRef.current(label, build, options) }), [actorId]);
  const [selected, setSelected] = useState<string | undefined>(() => selectedFlowId ?? data.spaces[actorId].savedBindings[0]?.flowRef);
  const selectionActor = useRef(actorId);
  const view = useMemo(() => port.read(new Date().toISOString(), selected), [port, data, selected]);
  const model = useMemo(() => view.ok ? programLegacyWorkspaceModel(view) : null, [view]);
  const catalog = useMemo(() => programLegacyWorkspaceCatalog(data), [data]);
  const [activeItem, setActiveItem] = useState<string | null>(null), [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null), [discarding, setDiscarding] = useState(false);
  const [busy, setBusy] = useState(false), pending = useRef(false);
  const [locked, setLocked] = useState(false);
  const saveRef = useRef<(editor: Editor) => Promise<boolean>>(async () => false);
  const coordinator = useMemo(() => createProgramLegacyEditorCoordinator({ onChange: setEditor, onLockChange: setLocked, isBusy: () => pending.current, save: draft => saveRef.current(draft) }), []);
  const sourceEditor = useRef<ProgramEditorFlush | null>(null), [sourcePending, setSourcePending] = useState(false);
  const planEditor = useRef<ProgramEditorFlush | null>(null), [planPending, setPlanPending] = useState(false);
  const registerPlanEditor = useCallback((api: ProgramEditorFlush | null) => { planEditor.current = api; }, []);
  const membershipEditor = useRef<ProgramEditorFlush | null>(null), [membershipPending, setMembershipPending] = useState(false);
  const registerMembershipEditor = useCallback((api: ProgramEditorFlush | null) => { membershipEditor.current = api; }, []);
  const [mapDraft, setMapDraftState] = useState<ProgramLegacyMapDraft | null>(null);
  const mapDraftRef = useRef(mapDraft);
  const setMapDraft = (next: typeof mapDraft) => { mapDraftRef.current = next; setMapDraftState(next); };
  const mapEditor = useMemo(() => createProgramLegacyMapEditor(() => mapDraftRef.current, () => pending.current), []);
  const registerSourceEditor = useCallback((api: ProgramEditorFlush | null) => { sourceEditor.current = api; }, []);
  const registry = useMemo(() => programLegacyEditorRegistry(() => [coordinator, sourceEditor.current, mapEditor, planEditor.current, membershipEditor.current]), [coordinator, mapEditor]);
  const canAct = () => coordinator.canAct() && !sourceEditor.current?.hasPendingInput?.() && !mapDraftRef.current && !planEditor.current?.hasPendingInput?.() && !membershipEditor.current?.hasPendingInput?.();
  const [message, setMessage] = useState(''), [error, setError] = useState(false);
  const detail = useRef<HTMLElement>(null), editHeading = useRef<HTMLHeadingElement>(null);
  const flow = model?.flows.find(flow => flow.ref === selected), binding = data.spaces[actorId].savedBindings.find(binding => binding.flowRef === selected);
  const flowTasks = model?.tasks.filter(task => task.flowRef === selected) ?? [], task = flowTasks.find(task => task.ref === activeItem);
  const stale = !!editor && (editor.actorId !== actorId || !view.ok || editor.view.token !== view.token);
  const actionsBlocked = busy || locked || !!editor || sourcePending || !!mapDraft || membershipPending || planPending;
  const sourceSnapshot = useMemo(() => {
    try { return inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot?.raw ?? 'null')); } catch { return null; }
  }, [data, actorId]);
  const selectedMap = sourceSnapshot?.ok ? sourceSnapshot.mapSourceFlows.find(entry => entry.ref === selected)?.presentation?.mapGroup : null;
  const mapReview = selectedMap && sourceSnapshot?.ok ? readProgramLegacyMapReview(sourceSnapshot.mapSourceFlows, selectedMap.groupRef, sourceSnapshot.payload.sourceLifecycle) : null;
  const mapRecord = mapReview && sourceSnapshot?.ok ? sourceSnapshot.payload.mapReview?.groups[mapReview.groupRef] : null;
  const mapPresentation = mapReview ? programLegacyMapReviewPresentation(mapReview, view.ok ? flow : undefined) : null;
  const executionHeld = programLegacyMapExecutionHeld(flow);
  const membershipRetained = sourceSnapshot?.ok === true && !!selected
    && programLegacyMapMembershipChildRetained(sourceSnapshot.payload.mapMembership, selected);
  const mapStale = !!mapDraft && (!view.ok || mapDraft.token !== view.token || mapDraft.action.expectedSourceToken !== mapReview?.sourceToken);
  useEffect(() => {
    // Explicit route identity wins over the saved array's order. Leaving this
    // mounted surface must not reset its selection or discard another editor.
    if (selectedFlowId !== undefined || selectionActor.current !== actorId) {
      setSelected(selectedFlowId ?? dataRef.current.spaces[actorId].savedBindings[0]?.flowRef);
      setActiveItem(null); setMessage('');
    }
    selectionActor.current = actorId;
  }, [actorId, selectedFlowId]);
  useEffect(() => { onRegisterEditors?.(registry); return () => onRegisterEditors?.(null); }, [registry, onRegisterEditors]);
  useEffect(() => { if (editor) editHeading.current?.focus(); }, [editor?.draft.kind, editor?.draft.itemRef]);
  useEffect(() => { if (task && !editor) detail.current?.focus(); }, [task?.ref, !!editor]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (registry.hasPendingInput?.()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [registry]);
  async function confirmMap() {
    const captured = mapDraftRef.current;
    if (!captured || mapStale || pending.current || locked || sourceEditor.current?.hasPendingInput?.() || membershipEditor.current?.hasPendingInput?.()) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const receipt = await port.commitMapReview({ expectedToken: captured.token, action: captured.action });
      if (receipt.ok && captured === mapDraftRef.current) setMapDraft(null);
      setError(!receipt.ok); setMessage(receipt.ok ? '검토한 출처와 조건을 개인 공간에 보관했습니다. 같은 Map의 실행을 이어갈 수 있습니다.' : '검토 선택을 저장하지 못했습니다. 선택은 유지했습니다. 최신 내용과 연결 상태를 확인해 주세요.');
    } finally { pending.current = false; setBusy(false); }
  }
  async function commit(action: PersonalWorkspacePocTransition, expected: ProgramLegacyView, editorSave = false) {
    if (executionHeld || pending.current || (!editorSave && !canAct())) return false;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const receipt = await port.commit({ action, expectedToken: expected.token, now: new Date().toISOString(), ...(action.type === 'complete' ? { executionDate: today } : {}) });
      setError(!receipt.ok);
      setMessage(receipt.ok ? '개인 문서에도 같은 변경을 저장했습니다.' : receipt.issues.length ? receipt.issues.map(issue => programLegacyIssueText(issue.code)).join(' ') : programErrorMessage(receipt.reason));
      return receipt.ok;
    } finally { pending.current = false; setBusy(false); }
  }
  async function changeFolder(folderId: string) {
    if (!canAct() || !selected) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const receipt = await port.commitFolder({ flowRef: selected, folderId, expectedToken: JSON.stringify(data.spaces[actorId]), requestId: programId('legacy-folder') });
      setError(!receipt.ok); setMessage(receipt.ok ? '같은 개인 문서의 폴더를 옮겼습니다.' : programErrorMessage(receipt.reason));
    } finally { pending.current = false; setBusy(false); }
  }
  function start(kind: ProgramLegacyEdit['kind']) {
    if (executionHeld || !view.ok || !flow || !binding || !canAct()) return;
    setMessage(''); setDiscarding(false);
    coordinator.replace({ actorId, documentId: binding.documentId, view, draft: { kind, flowRef: flow.ref, ...(task ? { itemRef: task.ref } : {}), title: kind === 'flow' ? flow.title : task?.title ?? '', memo: task?.memo ?? '', date: task?.date ?? '' } });
  }
  saveRef.current = async captured => {
    // Consult the live port, not the render snapshot, before flushing a captured editor.
    const latest = port.read(new Date().toISOString(), captured.draft.flowRef);
    if (captured.actorId !== dataRef.current.activeActorId || !latest.ok || latest.token !== captured.view.token) {
      setError(true); setMessage('연결 상태가 바뀌어 저장하지 않았습니다. 입력을 유지했으니 최신 내용과 비교해 주세요.'); return false;
    }
    const action = makeProgramLegacyEditAction(captured.view, captured.draft, new Date().toISOString());
    if (!action) { setError(true); setMessage('제목과 날짜를 확인해 주세요. 입력은 그대로 유지했습니다.'); return false; }
    const saved = await commit(action, captured.view, true); if (saved) setDiscarding(false); return saved;
  };
  const latestDraft = editor && editor.actorId === actorId && view.ok ? (() => {
    const latestModel = programLegacyWorkspaceModel(view), latestFlow = latestModel?.flows.find(flow => flow.ref === editor.draft.flowRef), latestTask = latestModel?.tasks.find(task => task.ref === editor.draft.itemRef);
    return latestFlow && (editor.draft.kind === 'flow' || latestTask) ? { title: editor.draft.kind === 'flow' ? latestFlow.title : latestTask!.title, memo: latestTask?.memo ?? '', date: latestTask?.date ?? '' } : null;
  })() : null;
  const support = <details className={styles.support}><summary>기존 기능의 연결 범위</summary><p>개인 수정과 검증된 입력 원문의 변경 비교를 같은 개인 문서에 저장합니다. 공개 판본 갱신과는 별개입니다. 반복 회차는 내 공간의 회차 도구를 사용하고, 검토 대기 Map·검증된 행 연결이 없는 원본은 이 목록에서 실행하지 않습니다.</p><p>기존 제작 전체, 삭제·휴지통, QuickItem 문서 간 이동은 이 화면에 연결하지 않았습니다. 새 개인 내용과 운영 원본은 보존하며 기존 저장소로 우회하지 않습니다.</p></details>;
  const viewErrors = !view.ok ? view.issues.map(issue => programLegacyIssueText(issue.code)) : [];
  return <section className={styles.workspace} aria-label="기존 계획과 개인 문서 연결" aria-busy={busy}>
    <header className={styles.heading}><h1>기존 계획</h1><div className={styles.actions}><button disabled={actionsBlocked} onClick={() => { if (canAct()) navigate({ view: 'space' }); }}>내 공간으로</button><button disabled={actionsBlocked} onClick={() => { if (canAct()) void onUndo(); }}>되돌리기</button></div></header>
    {message && <p className={error ? styles.error : styles.status} role={error ? 'alert' : 'status'}>{message}</p>}
    {selected && !catalog.flows.some(flow => flow.ref === selected) && <p className={styles.notice} role="status">요청한 기존 계획을 찾을 수 없습니다. 다른 계획으로 자동 이동하지 않았습니다. 목록에서 다시 선택해 주세요.</p>}
    {editor && <ProgramLegacyEditorPanel editor={editor} locked={locked} busy={busy} stale={stale} latest={latestDraft} discarding={discarding} headingRef={editHeading}
      update={patch => { coordinator.update(patch); }} save={() => { void coordinator.flushAll(); }}
      acceptLatest={() => { const current = coordinator.read(); if (current && current.actorId === actorId && view.ok && latestDraft) coordinator.replace({ ...current, view }); }}
      close={() => { if (coordinator.canEdit()) setDiscarding(true); }} discard={() => { if (coordinator.replace(null)) setDiscarding(false); }} resume={() => { setDiscarding(false); editHeading.current?.focus(); }}
      copy={() => { const current = coordinator.read(); if (!current) return; void (async () => { try { await navigator.clipboard.writeText(programLegacyDraftText(current)); setError(false); setMessage('편집 원문을 복사했습니다.'); } catch { setError(true); setMessage('자동 복사를 사용할 수 없습니다. 복사할 편집 원문을 선택해 직접 복사해 주세요.'); } })(); }} />}
      {selectedMap && <ProgramLegacyMapMembership key={`${actorId}:${selectedMap.groupRef}`} data={data} groupRef={selectedMap.groupRef} mutate={mutate} disabled={busy || locked || !!editor || !!mapDraft || sourcePending || planPending} canStart={() => coordinator.canAct() && !mapDraftRef.current && !sourceEditor.current?.hasPendingInput?.() && !planEditor.current?.hasPendingInput?.()} onRegisterEditors={registerMembershipEditor} onPendingChange={setMembershipPending} />}
      {selected && <ProgramLegacyPlan key={`${actorId}:${selected}`} data={data} flowRef={selected} mutate={mutate} disabled={busy || locked || !!editor || !!mapDraft || sourcePending || membershipPending} canStart={() => coordinator.canAct() && !mapDraftRef.current && !sourceEditor.current?.hasPendingInput?.() && !membershipEditor.current?.hasPendingInput?.()} onRegisterEditors={registerPlanEditor} onPendingChange={setPlanPending} />}
      <div className={styles.layout}>
        <aside className={styles.library}><label>계획 찾기<input value={query} onChange={event => setQuery(event.target.value)} placeholder="저장한 제목" /></label>
          <ul>{catalog.flows.filter(flow => flow.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(entry => <li key={entry.ref}><button disabled={actionsBlocked} aria-current={selected === entry.ref ? 'page' : undefined} onClick={() => { if (!canAct()) return; navigate({ view: 'legacy', id: entry.ref }); }}>{entry.title}<small>{entry.items.length}개 항목 · {catalog.byFlow[entry.ref]?.path ?? '개인 문서 연결 없음'}{catalog.byFlow[entry.ref]?.archived ? ' · 보관 중' : ''}</small></button></li>)}</ul>
          {!catalog.flows.length && <p>연결한 저장 Flow가 없습니다.</p>}{model?.tasks.some(task => task.kind === 'quick_item') && <p className={styles.muted}>기존 빠른 할 일은 내 공간의 개인 문서에서 이어서 사용할 수 있습니다.</p>}
        </aside>
        <div className={styles.content}>
          <ProgramLegacySourceReview data={data} port={port} flowRef={selected} blocked={busy || locked || !!editor || !!mapDraft || membershipPending} canStart={() => coordinator.canAct() && !mapDraftRef.current && !planEditor.current?.hasPendingInput?.() && !membershipEditor.current?.hasPendingInput?.()} onRegisterEditors={registerSourceEditor} onPendingChange={setSourcePending} />
          {mapReview && <details key={`${mapReview.groupRef}:${mapPresentation?.confirmed}`} className={styles.source} open={mapPresentation?.required || executionHeld || !!mapDraft}><summary>Map 원문·실행 조건 검토{mapPresentation?.confirmed && <span className={styles.reviewState}>개인 검토 완료</span>}{!executionHeld && !!mapReview.blockers.length && <span className={styles.reviewState}>원문 연결 보완 필요</span>}</summary>
            <h3>{mapReview.title}</h3><p>개인 실행을 위한 확인입니다. 제작자의 공개 판본 승인이나 공식 정보의 검증을 대신하지 않습니다.</p>
            {!executionHeld && !!mapReview.blockers.length && <p>아래 내용은 원본 검토를 위한 보완 사항입니다. 기존 개인 실행은 보류되지 않았습니다.</p>}
            {mapReview.reasons.filter(reason => !mapReview.blockers.length || reason !== '공개 저장 후 My Flow에서 실행 가능한 source-backed Step 기록으로 사용할 수 있습니다.').map((reason, index) => <p key={index}>{reason}</p>)}
            {mapReview.blockers.map((reason, index) => <p className={styles.notice} key={index}>{reason}</p>)}
            {mapReview.items.map(item => <details key={item.itemRef}><summary>{item.title}</summary><ProgramLegacyMapItemEvidence item={item.original} flow={mapReview.children.find(child => child.ref === item.flowRef)!} className={styles.mapEvidence} />
              {item.sourceUrls.map(url => <p key={url}><a href={url} target="_blank" rel="noreferrer">원문 보기: {url}</a></p>)}
              {mapDraft && <label>이 항목에 확인한 원문 출처<select aria-label={`${item.title} 확인 출처`} disabled={busy || locked || mapStale} value={mapDraft.action.sourceByItemRef[item.itemRef] ?? ''} onChange={event => {
                const current = mapDraftRef.current; if (!current || pending.current || locked) return;
                setMapDraft({ ...current, action: { ...current.action, sourceByItemRef: { ...current.action.sourceByItemRef, [item.itemRef]: event.target.value } } });
              }}><option value="">출처를 직접 확인한 뒤 선택</option>{item.sourceUrls.map(url => <option key={url} value={url}>{url}</option>)}</select></label>}
            </details>)}
            {mapRecord && <p>개인 검토 기록: {mapRecord.reviewedAt}{mapRecord.sourceToken !== mapReview.sourceToken ? ' · 원문이 바뀌어 다시 검토해야 합니다.' : ''}</p>}
            {mapDraft ? <><label className={styles.mapAcknowledge}><input type="checkbox" checked={mapDraft.action.acknowledgedReasons.length === mapReview.reasons.length && !!mapDraft.action.acknowledgedReasons.length} disabled={busy || locked || mapStale} onChange={event => { const current = mapDraftRef.current; if (current && !pending.current && !locked) setMapDraft({ ...current, action: { ...current.action, acknowledgedReasons: event.target.checked ? [...mapReview.reasons] : [] } }); }} />표시된 모든 검토 조건과 항목별 원문을 확인했습니다</label>
              {mapStale && <p role="alert">검토 중 내용이 바뀌었습니다. 이 선택으로 덮어쓰지 않습니다. 선택을 보관한 뒤 최신 상태에서 다시 검토해 주세요.</p>}
              <div className={styles.actions}><button disabled={busy || locked || mapStale || mapReview.blockers.length > 0 || !mapReview.reasons.length || mapDraft.action.acknowledgedReasons.length !== mapReview.reasons.length || mapReview.items.some(item => !item.sourceUrls.includes(mapDraft.action.sourceByItemRef[item.itemRef]))} onClick={() => void confirmMap()}>검토 내용을 보관하고 개인 실행 재개</button><button disabled={busy || locked} onClick={() => setMapDraft(null)}>검토 선택 버리기</button></div>
              <details><summary>저장 전 선택 보관</summary><textarea readOnly value={mapEditor.captureDrafts?.()[0]?.raw ?? ''} aria-label="복사할 Map 검토 선택" /></details>
            </> : mapPresentation?.required && <button disabled={actionsBlocked || !view.ok || !!mapReview.blockers.length || !mapReview.reasons.length || (mapRecord?.sourceToken === mapReview.sourceToken)} onClick={() => { if (canAct() && view.ok) setMapDraft({ token: view.token, documentIds: data.spaces[actorId].savedBindings.filter(binding => mapReview.children.some(flow => flow.ref === binding.flowRef)).map(binding => binding.documentId), action: { groupRef: mapReview.groupRef, expectedSourceToken: mapReview.sourceToken, requestId: programId('map-review'), now: new Date().toISOString(), acknowledgedReasons: [], sourceByItemRef: {} } }); }}>조건과 출처를 확인하며 검토 시작</button>}
          </details>}
          {programLegacyCapabilityNotices(model?.nonordinary.filter(item => item.flowRef === selected) ?? []).map(group => <div className={styles.notice} key={group.key}><p>{group.items.length}개 항목 · {group.text}</p><details><summary>해당 항목 보기</summary><ul>{group.items.map(item => <li key={item.itemRef}>{item.title}</li>)}</ul></details></div>)}
          {!view.ok || !model ? <div className={styles.notice} role="status">{viewErrors.map((text, index) => <p key={index}>{text}</p>)}{catalog.flows.length > 1 && <p>다른 계획은 목록에서 계속 열 수 있습니다.</p>}{binding && <button disabled={actionsBlocked} onClick={() => { if (coordinator.canAct()) navigate({ view: 'space', id: binding.documentId }); }}>연결한 개인 문서 열기</button>}<details className={styles.source}><summary>선택한 계획 원문</summary><pre>{JSON.stringify(catalog.sources.find(flow => flow.ref === selected), null, 2)}</pre></details></div> : flow ? <fieldset className={styles.surface} disabled={actionsBlocked}>
            {membershipRetained ? <header className={styles.heading} data-testid="program-retained-flow">
              <h2>{flow.title}</h2><div className={styles.actions}>
                <button disabled={!binding} onClick={() => { if (binding && canAct()) navigate({ view: 'space', id: binding.documentId }); }}>같은 개인 문서 열기</button>
                <button onClick={() => start('flow')}>제목 수정</button>
              </div>
            </header> : <MyPlanExecutionSurface<PersonalWorkspacePocTask> model={{ flowSlug: flow.ref, flowTitle: flow.title, progressLabel: executionHeld ? '실행 보류 중' : `${flowTasks.filter(task => task.completed).length}/${flowTasks.length}개 완료`, composition: 'stacked', editAvailable: !executionHeld,
              todos: buildDateGroupedTodoListViewModel({ items: flowTasks.map(task => ({ id: task.ref, title: task.title, date: task.date, completed: task.completed, sourceOrder: task.sourceOrder, data: task, meta: [task.time ?? '', task.timelinePolicy === 'excluded' ? '기간 목록에서 숨김' : ''].filter(Boolean) })) }),
              transferOpen: false, transferAvailable: false, transferItemCount: flowTasks.length, activeItemOpen: !!task, headingLevel: 2 }}
              actions={{ getItemHref: () => '#program-legacy-detail', onOpenItem: row => { if (canAct()) setActiveItem(row.id); },
                onToggleItem: row => { if (!executionHeld && canAct()) void commit({ type: 'complete', itemRef: row.id, completed: !row.completed, now: new Date().toISOString() }, view); },
                onBackToLibrary: () => { if (canAct()) { setSelected(undefined); setActiveItem(null); } }, onEditPlan: () => start('flow'), onToggleTransfer: () => undefined, onCloseTransfer: () => undefined }}
              renderers={{ renderTransferPanel: () => null,
                renderManagementMenu: () => <button disabled={!binding} onClick={() => { if (binding && canAct()) navigate({ view: 'space', id: binding.documentId }); }}>같은 개인 문서 열기</button>,
                renderItemDetail: () => task ? <section id="program-legacy-detail" ref={detail} tabIndex={-1} className={styles.detail}><h3>{task.title}</h3><p>{task.date ?? '날짜 미정'}{task.time ? ` · ${task.time}` : ''}</p>
                  {task.description && <p className={styles.pre}>{task.description}</p>}{task.completionCriterion && <p>완료 기준: {task.completionCriterion}</p>}{task.memo && <div><h4>개인 메모</h4><p className={styles.pre}>{task.memo}</p></div>}
                  <div className={styles.actions}><button onClick={() => start('item')}>제목·메모 편집</button><button onClick={() => start('date')}>실행 날짜 변경</button><button onClick={() => void commit({ type: 'restore-execution-date', itemRef: task.ref, now: new Date().toISOString() }, view)}>원래 계획 날짜 따르기</button></div>
                  <label>기간 목록 표시<select value={task.timelinePolicy} onChange={event => void commit({ type: 'set-timeline-policy', itemRef: task.ref, policy: event.target.value as PersonalWorkspacePocTask['timelinePolicy'], now: new Date().toISOString() }, view)}><option value="auto">자동</option><option value="included">포함</option><option value="excluded">숨김</option></select></label>
                  {task.sourceTimingLabel && <p className={styles.muted}>원문 일정: {task.sourceTimingLabel}</p>}
                  <p className={styles.muted}>할 일 소속: {catalog.byItem[task.ref]?.path ?? '확인 필요'}</p>
                </section> : null }} />}
            <details className={styles.controls}><summary>폴더와 개인 항목 순서</summary><label>계획 폴더<select aria-label="계획 폴더" value={catalog.byFlow[flow.ref]?.folderId ?? 'folder-unfiled'} onChange={event => void changeFolder(event.target.value)}>{catalog.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select></label>
              <ol className={styles.order}>{[...flow.items].sort((a, b) => a.sourceOrder - b.sourceOrder).map((item, index) => <li key={item.ref}><span>{item.title}</span><button aria-label={`${item.title} 위로`} disabled={index === 0} onClick={() => { const action = makeProgramLegacyOrderAction(view, flow.ref, item.ref, -1, new Date().toISOString()); if (action) void commit(action, view); }}>↑</button><button aria-label={`${item.title} 아래로`} disabled={index === flow.items.length - 1} onClick={() => { const action = makeProgramLegacyOrderAction(view, flow.ref, item.ref, 1, new Date().toISOString()); if (action) void commit(action, view); }}>↓</button></li>)}</ol>
            </details>
            <details className={styles.source}><summary>원문과 연결 정보</summary><p>개인 수정은 원문을 바꾸지 않습니다. 같은 개인 문서에 연결해 사용합니다.</p><p>{flow.sourceSlug ?? flow.origin}</p><pre>{JSON.stringify(view.payload.model.flows.find(original => original.ref === flow.ref) ?? view.payload.state.authoredFlows?.find(original => original.ref === flow.ref), null, 2)}</pre></details>
          </fieldset> : <p className={styles.empty}>저장한 계획을 선택하세요.</p>}
        </div>
      </div>{support}
  </section>;
}
