'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import type { ProgramCreatorWorking } from '@/lib/flow/integrated-poc/creator-workspace-contract';
import { applyProgramCreatorAction, creatorWorkingFromRecord, importedCreatorWorking, fingerprintPersonalWorkspacePocAuthoringSource as fingerprint,
  handoffProgramCreatorDraft, inspectProgramCreatorHandoff, previewProgramCreatorSource, setProgramCreatorWorking } from '@/lib/flow/integrated-poc/creator-workspace';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '@/lib/flow/personal-workspace-poc-authoring';
import { findPersonalWorkspacePocStructureTemplatePreview, planProgramCreatorStructure } from '@/lib/flow/integrated-poc/creator-workspace-tools';
import { PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG, planPersonalWorkspacePocAuthoringPropertyEdit } from '@/lib/flow/personal-workspace-poc-authoring-properties';
import { buildPersonalWorkspacePocEditorLineGuides } from '@/lib/flow/personal-workspace-poc-editor-guidance';
import { listPersonalWorkspacePocCreatorDrafts, type PersonalWorkspacePocCreatorDraftAction } from '@/lib/flow/personal-workspace-poc-creator-drafts';
import type { PersonalWorkspacePocResultNavigationState } from '@/lib/flow/personal-workspace-poc-result-projection';
import { PersonalWorkspacePocLiveEditor, type PersonalWorkspacePocLiveEditorHandle } from '../personal-workspace-poc/PersonalWorkspacePocLiveEditor';
import { PersonalWorkspacePocResultPresenter } from '../personal-workspace-poc/PersonalWorkspacePocResultPresenter';
import styles from './ProgramCreatorWorkspace.module.css';
import { creatorSourceIdentity, planCreatorSourceOrder, validCreatorSourceIdentity, creatorNativeText, creatorNativeOffsetToSource, creatorSourceOffsetToNative, type CreatorSourceOrderPlan } from '@/lib/flow/integrated-poc/creator-source-order';
import { reconcileCreatorSourceLines } from '@/lib/flow/integrated-poc/creator-execution-handoff';
import type { PersonalWorkspacePocLiveEditorSnapshot } from '../personal-workspace-poc/PersonalWorkspacePocLiveEditor';
import { inspectCreatorUpdate,applyCreatorUpdate,type CreatorUpdatePreview,type CreatorUpdateChoice } from '@/lib/flow/integrated-poc/creator-update';
import { previewProgramCreatorSavedRestore, restoreProgramCreatorSavedRevision, type CreatorHistoryPreview } from '@/lib/flow/integrated-poc/creator-history';
import { readNativeCreatorHistory } from '@/lib/flow/integrated-poc/creator-history-codec';
import type { ProgramCreatorSavedRevision } from '@/lib/flow/integrated-poc/creator-history-contract';
import { planCreatorCalendarSourceOrder } from '@/lib/flow/integrated-poc/creator-calendar-source-order';
import { ProgramCreatorStructureForm } from './ProgramCreatorStructureForm';
import { commitProgramCreatorStructure, prepareProgramCreatorStructure, restoreProgramCreatorStructureHistory, type ProgramCreatorStructurePrepared, type ProgramCreatorStructureSidecar } from '@/lib/flow/integrated-poc/creator-structure-sidecar';
import { ProgramCreatorNativeContext, ProgramCreatorNativeResult, ProgramCreatorNativeComparison, type ProgramCreatorNativeOperationRequest } from './ProgramCreatorNativeContext';
import { applyProgramNativeCreatorOperation } from '@/lib/flow/integrated-poc/creator-native-workspace';
import { createNativeCreatorDocumentOwner } from '@/lib/flow/integrated-poc/native-creator-document';
import { nativeCreatorSourceFocusRange, type NativeCreatorSourceFocusTarget } from '@/lib/flow/integrated-poc/creator-native-source-focus';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff, type ProgramNativeHandoffPreview } from '@/lib/flow/integrated-poc/creator-native-execution-adapter';
import { ProgramCreatorNativeHandoff, programNativeHandoffChoices } from './ProgramCreatorNativeHandoff';
import { ProgramCreatorSourceUpdate, type ProgramCreatorSourceCommand } from './ProgramCreatorSourceUpdate';
import { stageProgramNativeSourceUpdate, transitionProgramNativeSourceUpdate, upgradeProgramNativeSourceAbsences } from '@/lib/flow/integrated-poc/creator-native-source-store';
import { inspectProgramCreatorNativeLineage, applyProgramCreatorNativeLineage, type ProgramNativeLineagePreview } from '@/lib/flow/integrated-poc/creator-native-lineage';
import type { ProgramNativeLineageMapping } from '@/lib/flow/integrated-poc/creator-native-lineage-contract';
import { ProgramCreatorNativeLineage, defaultProgramNativeLineageMappings } from './ProgramCreatorNativeLineage';
import { programRawTemplateResultPolicy, programCreatorResultScope, programCreatorResultNavigation, programTemplateResultViews } from '@/lib/flow/integrated-poc/creator-template-result';
import { normalizeAlphaCreatorRawUpdateChoices, type AlphaCreatorIntent } from '@/lib/flow/integrated-poc/alpha-creator/contract';
import { executeAlphaCreatorIntent, previewAlphaCreatorSavedRestore } from '@/lib/flow/integrated-poc/alpha-creator/dispatch';

export type ProgramCreatorWorkspaceProps = { data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; today: string;
  storageScope?: 'local' | 'account';
  selectedDraftId?: string; active?: boolean; captureRoute?: () => (id: string | undefined, replace: boolean) => boolean;
  onRegisterEditors?: (port: ProgramEditorFlush | null) => void };
export function programCreatorEditorText(working:ProgramCreatorWorking):string { return working.nativePendingRawText??working.rawText; }
export function programCreatorWithEditorText(working:ProgramCreatorWorking,rawText:string):ProgramCreatorWorking {
  const next={...working};
  if(working.nativeDocument){if(creatorNativeText(rawText)===creatorNativeText(working.nativeDocument.document.rawText))delete next.nativePendingRawText;else next.nativePendingRawText=rawText;}
  else next.rawText=rawText;
  return next;
}
export function programCreatorNeedsSave(data: ProgramData, actorId: string, working: ProgramCreatorWorking | null): boolean {
  const workspace = data.spaces[actorId]?.creatorWorkspace;
  return !!working && (!workspace || !programSame(working, creatorWorkingFromRecord(workspace, working.draftId)));
}
export function ProgramCreatorHandoffComparison({ previous, personal, next, source }: { previous: string | null; personal: string | null; next: string | null; source: string }) {
  return <section aria-label="제작물과 개인 문서 비교" className={styles.comparison}><p>개인 문서의 수정은 자동으로 덮어쓰지 않습니다. 개인 문서를 먼저 확인하거나 제작 원문을 다시 조정하세요.</p>
    <details><summary>직전 인계 내용</summary><pre>{previous ?? '첫 인계입니다.'}</pre></details>
    <details open><summary>현재 개인 문서</summary><pre>{personal ?? '연결 문서가 없습니다.'}</pre></details>
    <details open><summary>이번에 인계할 내용</summary><pre>{next ?? '이 원문은 아직 개인 실행으로 인계할 수 없습니다.'}</pre></details>
    <label>보관할 제작 원문<textarea readOnly rows={5} value={source} onFocus={event => event.currentTarget.select()} /></label>
  </section>;
}
/** Templates replace the document; insertion/property actions supply their own explicit span. */
export function programCreatorReplacementRange(rawText: string, range?: { start: number; end: number }) {
  return range ?? { start: 0, end: rawText.length };
}
/** Keep unchanged text out of a browser-owned order edit. Replacing a common
 * first line after cut/paste can corrupt Chromium's native Redo entry. The
 * planned document/identity/selection stays unchanged; only the edit span shrinks.
 */
export function programCreatorOrderNativeReplacement(before: string, after: string) {
  const splitsPair = (text: string, at: number) => at > 0 && at < text.length && (
    text[at - 1] === '\r' && text[at] === '\n'
    || text.charCodeAt(at - 1) >= 0xd800 && text.charCodeAt(at - 1) <= 0xdbff
      && text.charCodeAt(at) >= 0xdc00 && text.charCodeAt(at) <= 0xdfff
  );
  let start = 0, end = before.length, afterEnd = after.length;
  while (start < end && start < afterEnd && before[start] === after[start]) start++;
  while (splitsPair(before, start) || splitsPair(after, start)) start--;
  while (end > start && afterEnd > start && before[end - 1] === after[afterEnd - 1]) { end--; afterEnd--; }
  while (splitsPair(before, end) || splitsPair(after, afterEnd)) { end++; afterEnd++; }
  return { range: { start, end }, replacement: after.slice(start, afterEnd) };
}
export function ProgramCreatorHistoryComparison({preview}:{preview:CreatorHistoryPreview}) {
  const selected=preview.entry.kind==='text-authoring-v1'?createNativeCreatorDocumentOwner({id:preview.draftId,source:preview.entry.origin},preview.entry.savedAt):null;
  const native=selected?.ok?selected.owner:preview.entry.kind==='program'?preview.entry.context?.nativeDocument:null;
  const previous=preview.expectedSpace.creatorWorkspace?.working?.nativeDocument;
  return <section className={styles.comparison} aria-label="제작 저장본 비교"><h2>현재 원문과 선택한 저장본</h2>
    <p>{preview.mode==='full-document'?'복구하면 이 제작 초안의 원문과 포함·역할·구조·검토 설정을 함께 저장합니다.':'복구하면 이 제작 초안의 원문과 이 저장본에 남아 있는 작성 틀 설정을 저장합니다.'} 개인 인계 문서·실행 기록·공개 판본은 바꾸지 않습니다.</p>
    <details open><summary>현재 제작 원문 · {preview.currentTitle}</summary><pre>{preview.currentRaw}</pre></details>
    <details open><summary>선택한 저장본 · {preview.entry.savedAt}</summary><pre>{preview.entry.rawText}</pre></details>
    {native&&<>{previous?<ProgramCreatorNativeComparison before={previous} after={native}/>:<details><summary>복구할 제작 설정과 결과</summary><ProgramCreatorNativeResult owner={native}/></details>}</>}
    {preview.entry.kind==='program'&&preview.entry.context&&<details><summary>이 저장본의 작성 설정 · {preview.entry.context.contextRevision}</summary><pre>{JSON.stringify(preview.entry.context.structure??null,null,2)}</pre></details>}
    {preview.entry.kind==='text-authoring-v1'&&<><p>기존 제작기의 실제 저장 ID {preview.entry.origin.versionId}. 원래 저장소와 판본은 유지합니다.</p><details><summary>원래 저장본의 전체 구조 자료 · 읽기 전용</summary><pre>{preview.entry.origin.documentJson}</pre></details></>}
  </section>;
}
export function ProgramCreatorWorkspace(props: ProgramCreatorWorkspaceProps) {
  const { data, mutate, navigate, today, selectedDraftId, onRegisterEditors } = props, actorId = data.activeActorId;
  const dataRef = useRef(data); dataRef.current = data;
  const workspace = data.spaces[actorId].creatorWorkspace;
  const initial = workspace?.working ?? (workspace && selectedDraftId ? creatorWorkingFromRecord(workspace, selectedDraftId) : null);
  const [buffer, setBuffer] = useState<ProgramCreatorWorking | null>(initial), bufferRef = useRef(buffer); bufferRef.current = buffer;
  const baseline = useRef(workspace?.working ?? null), [mount, setMount] = useState(0);
  // A native property edit refreshes the raw editor, not the focused inspector.
  // Full owner/history replacement still uses `mount` to reset both surfaces.
  const [nativeTextMount,setNativeTextMount]=useState(0);
  const editor = useRef<PersonalWorkspacePocLiveEditorHandle>(null), [locked, setLocked] = useState(false), lockCount = useRef(0);
  const blankSourceFocus=useRef<string|null>(null);
  const sourceFrame = useRef<HTMLDivElement>(null);
  const [orderSaving,setOrderSaving] = useState(false), orderSavingRef = useRef(false);
  const composing = useRef(false);
  const nativeContextPort=useRef<ProgramEditorFlush|null>(null);
  const registerNativePort=useMemo(()=>(value:ProgramEditorFlush|null)=>{nativeContextPort.current=value;},[actorId]);
  const sourceUpdatePort=useRef<ProgramEditorFlush|null>(null);
  const registerSourceUpdatePort=useMemo(()=>(value:ProgramEditorFlush|null)=>{sourceUpdatePort.current=value;},[actorId]);
  const pending = useRef(false), saving = useRef<Promise<boolean> | null>(null), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState(false), [tab, setTab] = useState<'input'|'result'|'library'>('input');
  const [query, setQuery] = useState(''), [archived, setArchived] = useState(false), [rename, setRename] = useState('');
  const [choice, setChoice] = useState<ProgramCreatorWorking | 'close' | null>(null), [replacement, setReplacement] = useState<{ raw: string; label: string; templateId?: ProgramCreatorWorking['templateId'];
    structure: { draftId: string; templateId: string; catalogVersion: string; contractVersion: string; sourceFingerprint: string; itemCount: number } } | null>(null);
  const [propertyLine, setPropertyLine] = useState(''), [propertyKey, setPropertyKey] = useState('date'), [propertyValue, setPropertyValue] = useState('');
  const propertyInput=useRef({line:propertyLine,key:propertyKey,value:propertyValue});propertyInput.current={line:propertyLine,key:propertyKey,value:propertyValue};
  const [resultChoices, setResultChoices] = useState<Record<string, Partial<PersonalWorkspacePocResultNavigationState>>>({});
  const [nativeItem,setNativeItem]=useState<string|null|undefined>(undefined);
  // Display state only: never write selection into the creator's saved document.
  const nativeSelection=useRef<{actorId:string;draftId:string;ownerId:string;itemId:string}|null>(null);
  const rememberNativeSelection=useMemo(()=>(ownerId:string,itemId:string|null)=>{
    const current=bufferRef.current;
    if(dataRef.current.activeActorId!==actorId||!current?.nativeDocument||current.nativeDocument.id!==ownerId)return;
    if(itemId===null){nativeSelection.current=null;return;}
    if(current.nativeDocument.document.parseResult.canonical.items.some(item=>item.itemId===itemId))
      nativeSelection.current={actorId,draftId:current.draftId,ownerId,itemId};
  },[actorId]);
  const [nativeAnchor,setNativeAnchor]=useState(today);
  const nativeAnchorInput=useRef<HTMLInputElement>(null);
  const [nativeHandoff,setNativeHandoff]=useState<ProgramNativeHandoffPreview|null>(null),nativeHandoffRef=useRef(nativeHandoff);nativeHandoffRef.current=nativeHandoff;
  const [nativeHandoffChoices,setNativeHandoffChoices]=useState<Record<string,CreatorUpdateChoice>>({});
  const nativeHandoffChoicesRef=useRef(nativeHandoffChoices);nativeHandoffChoicesRef.current=nativeHandoffChoices;
  const nativeHandoffRequest=useRef<{id:string;now:string|null}|null>(null);
  const [nativeLineage,setNativeLineage]=useState<ProgramNativeLineagePreview|null>(null),nativeLineageRef=useRef(nativeLineage);nativeLineageRef.current=nativeLineage;
  const [lineageMapping,setLineageMapping]=useState<ProgramNativeLineageMapping>({items:{},remaining:{}}),lineageMappingRef=useRef(lineageMapping);lineageMappingRef.current=lineageMapping;
  const lineageRequest=useRef<{id:string;now:string|null}|null>(null),lineageFrame=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{if(nativeLineage)lineageFrame.current?.querySelector<HTMLElement>('h2')?.focus();},[nativeLineage?.id]);
  const nativeHandoffTrigger=useRef<HTMLButtonElement|null>(null),nativeHandoffFrame=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{if(nativeHandoff)nativeHandoffFrame.current?.querySelector<HTMLElement>('h2')?.focus();},[nativeHandoff?.id]);
  const [comparison, setComparison] = useState<ReturnType<typeof inspectProgramCreatorHandoff>>(null);
  const [updateReview,setUpdateReview]=useState<CreatorUpdatePreview|null>(null),[updateChoices,setUpdateChoices]=useState<Record<string,CreatorUpdateChoice>>({});
  const updateReviewRef=useRef(updateReview),updateChoicesRef=useRef(updateChoices);updateReviewRef.current=updateReview;updateChoicesRef.current=updateChoices;
  const [orderStep, setOrderStep] = useState('');
  const [historyPreview,setHistoryPreview]=useState<CreatorHistoryPreview|null>(null),[historyEntry,setHistoryEntry]=useState<ProgramCreatorSavedRevision|null>(null);
  const historyRequest=useRef<{id:string;now:string|null}|null>(null);
  type ReadyOrder = Extract<CreatorSourceOrderPlan,{status:'ready'}>;
  const [orderPreview, setOrderPreview] = useState<{ plan: ReadyOrder; snapshot: PersonalWorkspacePocLiveEditorSnapshot; owner: typeof workspace } | null>(null);
  const orderHistory = useRef<{ plan: ReadyOrder; draftId: string; beforeWorking: ProgramCreatorWorking; snapshot: PersonalWorkspacePocLiveEditorSnapshot } | null>(null);
  const structureHistory = useRef<{ prepared: ProgramCreatorStructurePrepared; beforeWorking: ProgramCreatorWorking; afterWorking: ProgramCreatorWorking; snapshot: PersonalWorkspacePocLiveEditorSnapshot; afterSnapshot: PersonalWorkspacePocLiveEditorSnapshot } | null>(null);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  const clock = useMemo(() => new Date().toISOString(), [buffer?.rawText, buffer?.draftId]);
  const templatePolicy = useMemo(() => buffer && tab === 'result' ? programRawTemplateResultPolicy(buffer, clock) : null, [buffer, tab, clock]);
  const resultScope = programCreatorResultScope(actorId, buffer);
  // Match native handoff: explicit input -> this draft's last handoff -> source.
  const lastNativeAnchor = buffer ? workspace?.nativeExecutionSources?.[buffer.draftId]?.revisions.at(-1)?.anchor : null;
  const nativePreviewAnchor = nativeAnchor || lastNativeAnchor || undefined;
  const navigation = programCreatorResultNavigation(templatePolicy, resultChoices[resultScope]);
  const chooseResult = (choice: Partial<PersonalWorkspacePocResultNavigationState>) => setResultChoices(values => ({ ...values, [resultScope]: { ...values[resultScope], ...choice } }));
  const preview = useMemo(() => buffer ? previewProgramCreatorSource(buffer, today, clock, { baseDate: navigation.baseDate, selectedDate: navigation.selectedDate }) : null, [buffer, today, clock, navigation.baseDate, navigation.selectedDate]);
  const record = buffer ? workspace?.library.records[buffer.draftId] : undefined;
  const needsSave = programCreatorNeedsSave(data, actorId, buffer);
  const rows = workspace ? listPersonalWorkspacePocCreatorDrafts(workspace.library, { query, status: archived ? 'archived' : 'active' }) : [];
  const guides = useMemo(() => buffer ? buildPersonalWorkspacePocEditorLineGuides({ rawText: buffer.rawText, sourceFingerprint: fingerprint(buffer.rawText), view: 'flow', selectionStart: 0, selectionEnd: 0, ghostEnabled: false }) : [], [buffer?.rawText]);
  function report(ok: boolean, text: string) { setError(!ok); setMessage(text); }
  function blockRawAuxiliary() {
    if(updateReviewRef.current){report(false,'개인 업데이트 비교를 적용하거나 모두 유지하고 닫은 뒤 계속해 주세요. 선택은 유지했습니다.');return true;}
    if(propertyInput.current.value!==''){report(false,'속성 입력을 원문에 적용하거나 취소한 뒤 계속해 주세요. 입력은 유지했습니다.');return true;}
    return false;
  }
  function clearUpdateReview(){updateReviewRef.current=null;updateChoicesRef.current={};setUpdateReview(null);setUpdateChoices({});}
  function changeProperty(field:'line'|'key'|'value',value:string){
    if(pending.current||lockCount.current)return;
    propertyInput.current={...propertyInput.current,[field]:value};
    if(field==='line')setPropertyLine(value);else if(field==='key')setPropertyKey(value);else setPropertyValue(value);
  }
  function clearProperty(){propertyInput.current={line:'',key:'date',value:''};setPropertyLine('');setPropertyKey('date');setPropertyValue('');}
  function cancelProperty(){if(pending.current||lockCount.current)return;clearProperty();synchronizeCreatorWorking();}
  function compareSaved(entry:ProgramCreatorSavedRevision) {
    if(pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing)return;
    if(blockRawAuxiliary())return;
    if(nativeHandoffRef.current||nativeLineageRef.current){report(false,'개인 실행 비교를 적용하거나 닫은 뒤 저장본을 비교해 주세요. 선택은 유지했습니다.');return;}
    if(sourceUpdatePort.current?.hasPendingInput?.()){report(false,'새 원문 비교 입력을 저장하거나 취소한 뒤 저장본을 비교해 주세요. 입력은 유지했습니다.');return;}
    if(nativeContextPort.current?.hasPendingInput?.()){report(false,'구조 입력을 적용하거나 취소한 뒤 저장본을 비교해 주세요. 입력은 유지했습니다.');return;}
    setHistoryEntry(entry);setHistoryPreview(null);historyRequest.current=null;
    if(!programSame(nativeBuffer(),baseline.current)||programCreatorNeedsSave(dataRef.current,actorId,nativeBuffer())){report(false,'현재 입력을 제작 초안으로 저장한 뒤 이전 저장본을 비교해 주세요. 입력은 유지했습니다.');return;}
    let raw:string|null=null;
    if(props.storageScope!=='account'&&entry.kind==='text-authoring-v1') {try{const read=readNativeCreatorHistory(window.localStorage);if(read.kind!=='ready')throw Error('read');raw=read.raw;}catch{report(false,'기존 저장 이력을 읽지 못했습니다. 보관된 원문과 구조 자료는 아래에서 확인할 수 있습니다.');return;}}
    const result=props.storageScope==='account'
      ? previewAlphaCreatorSavedRestore(dataRef.current,actorId,bufferRef.current!.draftId,entry.id)
      : previewProgramCreatorSavedRestore(dataRef.current,actorId,bufferRef.current!.draftId,entry.id,raw);
    if(!result.ok){report(false,result.reason==='empty-source'?'원문이 없는 저장본입니다. 구조 자료를 읽기 보존하며 빈 내용으로 덮어쓰지 않습니다.':result.reason==='unsupported-native-document-codec'?'이 저장본의 전체 제작 설정을 안전하게 복구할 수 없습니다. 원래 원문과 구조 자료는 읽기 보존합니다.':'저장본이나 원문이 바뀌었습니다. 현재 입력과 원래 저장 이력을 다시 확인해 주세요.');return;}
    setHistoryPreview(result.value);historyRequest.current={id:programId('creator-restore'),now:null};
  }
  async function restoreSaved() {
    const review=historyPreview,request=historyRequest.current;
    if(!review||!request||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing)return;
    if(blockRawAuxiliary())return;
    if(nativeHandoffRef.current||nativeLineageRef.current){report(false,'개인 실행 비교를 적용하거나 닫은 뒤 저장본을 복구해 주세요. 선택은 유지했습니다.');return;}
    if(nativeContextPort.current?.hasPendingInput?.()){report(false,'구조 입력을 적용하거나 취소한 뒤 복구해 주세요. 입력은 유지했습니다.');return;}
    if(!programSame(nativeBuffer(),baseline.current)||programCreatorNeedsSave(dataRef.current,actorId,nativeBuffer())){report(false,'비교 뒤 입력이 바뀌었습니다. 입력을 저장하고 다시 비교해 주세요.');return;}
    pending.current=true;setBusy(true);const release=port.lockInput();
    try {
      if(saving.current&&!await saving.current)return;
      const now=request.now??=new Date().toISOString();let nextWorking:ProgramCreatorWorking|null=null;
      const alphaCreator: AlphaCreatorIntent = { type: 'history-restore', draftId: review.draftId, revisionId: review.entry.id, now };
      const result=await mutate('제작 저장본 복구',current=>{
        let raw:string|null=null;
        if(props.storageScope!=='account'&&review.entry.kind==='text-authoring-v1'){const read=readNativeCreatorHistory(window.localStorage);if(read.kind!=='ready')return {ok:false,data:current,reason:'conflict'};raw=read.raw;}
        if(props.storageScope==='account'&&!programSame(current.spaces[actorId],review.expectedSpace))return {ok:false,data:current,reason:'conflict'};
        const changed=props.storageScope==='account'
          ? executeAlphaCreatorIntent(current,actorId,alphaCreator,request.id)
          : restoreProgramCreatorSavedRevision(current,{actorId,requestId:request.id,preview:review},raw,now);
        if(changed.ok)nextWorking=changed.data.spaces[actorId].creatorWorkspace!.working;
        return changed;
      }, { alphaCreator });
      if(!result.ok){report(false,programErrorMessage(result.reason));return;}
      if(nextWorking){baseline.current=nextWorking;bufferRef.current=nextWorking;setBuffer(nextWorking);structureHistory.current=null;orderHistory.current=null;setOrderPreview(null);setComparison(null);clearUpdateReview();clearProperty();setNativeItem(null);setMount(n=>n+1);}
      setHistoryPreview(null);setHistoryEntry(null);historyRequest.current=null;
      report(true,review.mode==='full-document'?'선택한 저장본의 원문과 제작 설정을 복구했습니다. 개인 실행·공개는 그대로입니다.':'선택한 저장본의 원문과 남아 있는 작성 설정을 복구했습니다. 개인 실행·공개는 그대로입니다.');
    } catch{report(false,'복구를 저장하지 못했습니다. 현재 입력과 비교한 저장본은 유지했습니다.');}
    finally{release();pending.current=false;setBusy(false);}
  }
  function nativeBuffer() {
    const current = bufferRef.current, snapshot = editor.current?.readSnapshot();
    if (!current || !snapshot || snapshot.documentId !== current.draftId) return current;
    const shown=programCreatorEditorText(current);
    const next = programCreatorWithEditorText(current,creatorNativeText(shown)===snapshot.rawText ? shown : snapshot.rawText);
    if (next.sourceIdentity && !validCreatorSourceIdentity(next.sourceIdentity,next.rawText)) delete next.sourceIdentity;
    return next;
  }
  function acceptConfirmedCreatorWorking(confirmed:ProgramCreatorWorking|null):boolean {
    if(dataRef.current.activeActorId!==actorId||pending.current||saving.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing
      ||nativeContextPort.current?.hasPendingInput?.()||sourceUpdatePort.current?.hasPendingInput?.()
      ||nativeHandoffRef.current||nativeLineageRef.current||updateReviewRef.current||propertyInput.current.value!=='')return false;
    if(!programSame(nativeBuffer(),confirmed))return false;
    // A retried receipt can confirm exactly what remains in the native editor.
    // Acknowledge it without remounting the editor or clearing its Undo journal.
    baseline.current=confirmed;
    if(!programSame(bufferRef.current,confirmed)){bufferRef.current=confirmed;setBuffer(confirmed);}
    return true;
  }
  async function flushDraft(): Promise<boolean> {
    if (saving.current) { if (!await saving.current) return false; }
    if (composing.current || editor.current?.readSnapshot()?.composing) { report(false, '글자 조합이 끝난 뒤 다시 시도해 주세요. 입력은 유지했습니다.'); return false; }
    const wanted = nativeBuffer();
    if (programSame(wanted, baseline.current)) return true;
    const expected = baseline.current, capturedActor = actorId;
    const task = (async () => {
      try {
        const now = new Date().toISOString();
        const result = await mutate('제작 중 입력 복구 저장', current => setProgramCreatorWorking(current, { actorId: capturedActor, expectedWorking: expected, working: wanted }, now), { history: false, alphaCreator: { type: 'working', working: wanted, now } });
        if (!result.ok) { report(false, programErrorMessage(result.reason)); return false; }
        baseline.current = wanted; report(true, '작성 중 입력을 보관했습니다. 제작 초안의 명시 저장과는 별개입니다.'); return true;
      } catch { report(false, '입력을 저장하지 못했습니다. 아래 원문을 보관하고 다시 시도해 주세요.'); return false; }
    })();
    saving.current = task; try { return await task; } finally { if (saving.current === task) saving.current = null; }
  }
  flushRef.current = flushDraft;
  const port = useMemo<ProgramEditorFlush>(() => ({
    flushAll: async () => {if(blockRawAuxiliary())return false;if(nativeHandoffRef.current||nativeLineageRef.current){report(false,'개인 실행 비교를 적용하거나 모두 유지하고 닫은 뒤 이동해 주세요. 선택은 유지했습니다.');return false;}if(sourceUpdatePort.current&&!await sourceUpdatePort.current.flushAll())return false;if(nativeContextPort.current&&!await nativeContextPort.current.flushAll())return false;return flushRef.current();},
    lockInput: () => { const releaseChild=nativeContextPort.current?.lockInput?.(),releaseSource=sourceUpdatePort.current?.lockInput?.();lockCount.current++; setLocked(true); return () => { releaseChild?.();releaseSource?.();lockCount.current = Math.max(0, lockCount.current - 1); setLocked(lockCount.current > 0); }; },
    hasPendingInput: () => composing.current || !!editor.current?.readSnapshot()?.composing || !!nativeContextPort.current?.hasPendingInput?.() || !!sourceUpdatePort.current?.hasPendingInput?.() || !!nativeHandoffRef.current || !!nativeLineageRef.current || !!updateReviewRef.current || propertyInput.current.value!=='' || !programSame(nativeBuffer(), baseline.current),
    blocksExternalSnapshot: (before, next) => !programSame(before.spaces[actorId]?.creatorWorkspace, next.spaces[actorId]?.creatorWorkspace),
    captureDrafts: () => { const draft = nativeBuffer(); return draft ? [{ title: draft.title || '제작 중 원문', raw: programCreatorEditorText(draft) },
      ...(draft.structure ? [{ title: `${draft.title || '빈 제작 원문'} · 작성 틀 입력`, raw: JSON.stringify({version:1,draftId:draft.draftId,structure:draft.structure},null,2) }] : []),
      ...(nativeHandoffRef.current ? [{title:`${draft.title || '제작 원문'} · 개인 실행 비교 선택`,raw:JSON.stringify({version:1,draftId:draft.draftId,preview:nativeHandoffRef.current,choices:nativeHandoffChoicesRef.current},null,2)}] : []),
      ...(nativeLineageRef.current ? [{title:`${draft.title || '제작 원문'} · 기존 문서 연결 선택`,raw:JSON.stringify({version:1,draftId:draft.draftId,preview:nativeLineageRef.current,mapping:lineageMappingRef.current},null,2)}] : []),
      ...(updateReviewRef.current ? [{title:`${draft.title || '제작 원문'} · 개인 업데이트 비교 선택`,raw:JSON.stringify({version:1,draftId:draft.draftId,preview:updateReviewRef.current,choices:updateChoicesRef.current},null,2)}] : []),
      ...(propertyInput.current.value!=='' ? [{title:`${draft.title || '제작 원문'} · 미반영 속성 입력`,raw:JSON.stringify({version:1,draftId:draft.draftId,sourceFingerprint:fingerprint(programCreatorEditorText(draft)),property:propertyInput.current},null,2)}] : []),
      ...(nativeContextPort.current?.captureDrafts?.()??[]),...(sourceUpdatePort.current?.captureDrafts?.()??[])] : []; },
    captureCreatorWorking: () => { const working = nativeBuffer(); return working ? structuredClone(working) : null; },
    acceptConfirmedCreatorWorking,
  }), [actorId]);
  useEffect(() => { onRegisterEditors?.(port); return () => onRegisterEditors?.(null); }, [port, onRegisterEditors]);
  useEffect(() => {
    if (pending.current || locked || orderPreview || programSame(buffer, baseline.current)) return;
    const timer = window.setTimeout(() => { void flushRef.current(); }, 600); return () => window.clearTimeout(timer);
  }, [buffer, locked, busy, orderPreview]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (port.hasPendingInput?.()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [port]);
  // Global Undo/Redo and an accepted external snapshot change the stored working
  // document. A clean mounted editor must follow that snapshot; dirty input stays.
  function synchronizeCreatorWorking() {
    if(pending.current||saving.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing||nativeContextPort.current?.hasPendingInput?.()||sourceUpdatePort.current?.hasPendingInput?.())return false;
    const incoming=dataRef.current.spaces[actorId]?.creatorWorkspace?.working??null;
    if(programSame(incoming,baseline.current))return false;
    if(acceptConfirmedCreatorWorking(incoming))return true;
    if(blockRawAuxiliary())return false;
    if(nativeHandoffRef.current||nativeLineageRef.current){
      report(false,'저장된 제작 상태가 바뀌었습니다. 비교 선택은 유지했습니다. 선택을 보관하거나 비교를 닫은 뒤 최신 상태를 열어 주세요.');return false;
    }
    if(!programSame(nativeBuffer(),baseline.current)){
      report(false,'저장된 제작 상태가 바뀌었습니다. 작성 중인 입력은 유지했습니다. 입력을 보관한 뒤 최신 상태를 열어 주세요.');return false;
    }
    const selected=nativeSelection.current,previous=bufferRef.current;
    const restoreSelection=selected?.actorId===actorId&&selected.draftId===previous?.draftId&&selected.draftId===incoming?.draftId
      &&selected.ownerId===previous?.nativeDocument?.id&&selected.ownerId===incoming?.nativeDocument?.id
      &&incoming.nativeDocument.document.parseResult.canonical.items.some(item=>item.itemId===selected.itemId)?selected:null;
    nativeSelection.current=restoreSelection;
    baseline.current=incoming;bufferRef.current=incoming;setBuffer(incoming);setMount(n=>n+1);
    structureHistory.current=null;orderHistory.current=null;historyRequest.current=null;
    nativeHandoffRef.current=null;nativeHandoffRequest.current=null;setNativeHandoff(null);setNativeHandoffChoices({});
    nativeLineageRef.current=null;lineageRequest.current=null;setNativeLineage(null);setLineageMapping({items:{},remaining:{}});
    setOrderPreview(null);setHistoryPreview(null);setHistoryEntry(null);setComparison(null);clearUpdateReview();clearProperty();
    setReplacement(null);setChoice(null);setNativeItem(restoreSelection?.itemId??null);setOrderStep('');
    return true;
  }
  useEffect(()=>{synchronizeCreatorWorking();},[workspace?.working,locked,busy]);
  useEffect(()=>{
    if(!blankSourceFocus.current||busy||locked||tab!=='input')return;
    const requested=blankSourceFocus.current,current=bufferRef.current;blankSourceFocus.current=null;
    if(current?.draftId===requested&&current.rawText===''&&!current.structure&&!current.nativeDocument&&!composing.current&&!editor.current?.readSnapshot()?.composing)editor.current?.focusRange(0);
  },[buffer?.draftId,mount,busy,locked,tab]);
  type SelectionRoute = { origin: 'user' | 'route'; commit: (id: string | undefined, replace: boolean) => boolean };
  const choiceRoute = useRef<SelectionRoute | null>(null);
  const captureSelectionRoute = (origin: SelectionRoute['origin']): SelectionRoute => ({ origin, commit: props.captureRoute?.() ?? (() => false) });
  function restoreSelectionRoute(route: SelectionRoute) {
    if (route.origin === 'route') route.commit(bufferRef.current?.draftId, true);
    // A retained choice can be retried after its failed route has been restored.
    choiceRoute.current = captureSelectionRoute('user');
  }
  function cancelChoice() {
    if (choiceRoute.current) restoreSelectionRoute(choiceRoute.current);
    choiceRoute.current = null; setChoice(null);
  }
  async function saveChoice() {
    const next=choice,route=choiceRoute.current??captureSelectionRoute('user');
    if(!next)return;
    if(await saveExplicit())await switchWorking(next==='close'?null:next,route);
    else restoreSelectionRoute(route);
  }
  async function switchWorking(next: ProgramCreatorWorking | null, route = choiceRoute.current ?? captureSelectionRoute('user')) {
    if (pending.current || lockCount.current || composing.current || editor.current?.readSnapshot()?.composing) return;
    if(blockRawAuxiliary()){restoreSelectionRoute(route);return;}
    pending.current = true; setBusy(true);
    try {
      if (saving.current && !await saving.current) { restoreSelectionRoute(route); return; }
      const now = new Date().toISOString();
      const result = await mutate('제작 원문 열기', current => setProgramCreatorWorking(current, { actorId, expectedWorking: baseline.current, working: next }, now), { history: false, alphaCreator: { type: 'working', working: next, now } });
      if (!result.ok) { report(false, programErrorMessage(result.reason)); restoreSelectionRoute(route); return; }
      blankSourceFocus.current=next?.rawText===''&&next.baseRecordRevision===null&&!next.structure&&!next.nativeDocument?next.draftId:null;
      baseline.current = next; bufferRef.current = next; setBuffer(next); setMount(n => n + 1); setNativeItem(null);setChoice(null); setComparison(null); setReplacement(null); setHistoryPreview(null); setHistoryEntry(null); historyRequest.current = null; structureHistory.current=null; orderHistory.current=null;
      nativeHandoffRef.current=null;nativeHandoffRequest.current=null;setNativeHandoff(null);setNativeHandoffChoices({});setTab(next ? 'input' : 'library');setMessage('');
      nativeLineageRef.current=null;lineageRequest.current=null;setNativeLineage(null);setLineageMapping({items:{},remaining:{}});
      clearUpdateReview();clearProperty();
      choiceRoute.current=null;
      route.commit(next?.draftId, route.origin === 'route');
    } catch { report(false,'제작 원문을 열지 못했습니다. 현재 입력은 유지했습니다.'); restoreSelectionRoute(route); }
    finally { pending.current = false; setBusy(false); }
  }
  function choose(next: ProgramCreatorWorking | 'close', origin: SelectionRoute['origin'] = 'user') {
    if (pending.current || lockCount.current) return;
    const route=captureSelectionRoute(origin);choiceRoute.current=route;
    if(composing.current||editor.current?.readSnapshot()?.composing){restoreSelectionRoute(route);return;}
    if(blockRawAuxiliary()){restoreSelectionRoute(route);return;}
    if(nativeHandoffRef.current||nativeLineageRef.current){report(false,'개인 실행 비교를 적용하거나 닫은 뒤 다른 제작 원문을 열어 주세요. 선택은 유지했습니다.');restoreSelectionRoute(route);return;}
    if(sourceUpdatePort.current?.hasPendingInput?.()){report(false,'새 원문 비교 입력을 저장하거나 취소한 뒤 다른 원문을 열어 주세요. 입력은 유지했습니다.');restoreSelectionRoute(route);return;}
    if (programCreatorNeedsSave(dataRef.current, actorId, nativeBuffer()) || nativeContextPort.current?.hasPendingInput?.()) { setChoice(next); return; }
    void switchWorking(next === 'close' ? null : next, route);
  }
  useEffect(() => {
    if(props.active===false||pending.current||lockCount.current)return;
    if (!selectedDraftId) { if(bufferRef.current?.draftId) captureSelectionRoute('route').commit(bufferRef.current.draftId,true); return; }
    if (bufferRef.current?.draftId === selectedDraftId) return;
    const own = dataRef.current.spaces[actorId].creatorWorkspace, next = own ? creatorWorkingFromRecord(own, selectedDraftId) : null;
    if (next) choose(next,'route');
    else restoreSelectionRoute(captureSelectionRoute('route'));
  }, [selectedDraftId, props.active, busy, locked]);
  async function commit(build: (current: ProgramData, now: string) => Exclude<PersonalWorkspacePocCreatorDraftAction, { type: 'undo' } | { type: 'cancel' }>, label: string) {
    if (pending.current || lockCount.current) return false;
    if(blockRawAuxiliary())return false;
    if(nativeHandoffRef.current||nativeLineageRef.current){report(false,'개인 실행 비교를 적용하거나 닫은 뒤 제작 초안을 변경해 주세요. 선택은 유지했습니다.');return false;}
    if(sourceUpdatePort.current&&!await sourceUpdatePort.current.flushAll())return false;
    if(nativeContextPort.current&&!await nativeContextPort.current.flushAll())return false;
    const release = port.lockInput(); pending.current = true; setBusy(true);
    try {
      if (!await flushDraft()) return false;
      const requestId = programId('request'), now = new Date().toISOString(); const captured: { working: ProgramCreatorWorking | null } = { working: null };
      const expectedStructure=bufferRef.current?.structure ?? null;
      const expectedNativeDocument=bufferRef.current?.nativeDocument??null,expectedNativeSelection=bufferRef.current?.nativeSelection??null;
      let alphaCreator: AlphaCreatorIntent | null = null;
      const result = await mutate(label, current => { const action = build(current, now); alphaCreator = { type: 'library-action', action, now };
        const transition = applyProgramCreatorAction(current, { actorId, requestId, action,expectedStructure,expectedNativeDocument,expectedNativeSelection }, now);
        if (transition.ok) captured.working = transition.data.spaces[actorId].creatorWorkspace?.working ?? null; return transition;
      }, { alphaCreator: () => { if (!alphaCreator) throw Error('creator-action-not-captured'); return alphaCreator; } });
      if (!result.ok) { report(false, programErrorMessage(result.reason)); return false; }
      baseline.current = captured.working; if (captured.working?.draftId === bufferRef.current?.draftId) { bufferRef.current = captured.working; setBuffer(captured.working); }
      report(true, `${label} 완료`); return true;
    } catch { report(false, '저장하지 못했습니다. 제작 원문은 그대로 유지했습니다.'); return false; }
    finally { pending.current = false; setBusy(false); release(); }
  }
  function saveExplicit() { return commit((current, now) => {
    const own = current.spaces[actorId].creatorWorkspace!, w = own.working!;
    return { type: 'save', draftId: w.draftId, rawText: w.rawText, title: w.title, sourceFingerprint: fingerprint(w.rawText),
      expectedLibraryRevision: own.library.revision, ...(w.baseRecordRevision ? { expectedRecordRevision: w.baseRecordRevision } : {}), ...(w.templateId ? { templateId: w.templateId } : {}), now };
  }, '제작 초안 저장'); }
  function cancelNativeHandoff() {
    if(pending.current||lockCount.current)return;
    nativeHandoffRef.current=null;nativeHandoffRequest.current=null;setNativeHandoff(null);setNativeHandoffChoices({});
    report(true,'개인 실행은 바꾸지 않았습니다.');
    synchronizeCreatorWorking();
    if(typeof window!=='undefined')window.requestAnimationFrame(()=>{if(!nativeHandoffRef.current&&!composing.current)nativeHandoffTrigger.current?.focus();});
  }
  function prepareNativeHandoff() {
    const working=nativeBuffer();
    if(!working?.nativeDocument||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing)return;
    if(!programSame(dataRef.current.spaces[actorId]?.creatorWorkspace?.working??null,baseline.current)){
      report(false,'저장된 제작 상태가 바뀌었습니다. 비교를 닫고 최신 원문을 확인한 뒤 다시 비교해 주세요. 선택은 유지했습니다.');return;
    }
    if(nativeContextPort.current?.hasPendingInput?.()||sourceUpdatePort.current?.hasPendingInput?.()||!programSame(working,baseline.current)||programCreatorNeedsSave(dataRef.current,actorId,working)){
      report(false,'작성 중인 원문과 구조를 적용하고 제작 초안을 저장한 뒤 비교해 주세요. 입력은 유지했습니다.');return;
    }
    const result=inspectProgramNativeCreatorHandoff(dataRef.current,{actorId,draftId:working.draftId,...(nativeAnchor?{anchor:nativeAnchor}:{})},new Date().toISOString());
    if(!result.ok){
      if(result.reason==='native-lineage-mapping-required'){
        const lineage=inspectProgramCreatorNativeLineage(dataRef.current,{actorId,draftId:working.draftId,...(nativeAnchor?{anchor:nativeAnchor}:{})},new Date().toISOString());
        if(lineage.ok){nativeLineageRef.current=lineage.preview;setNativeLineage(lineage.preview);setLineageMapping(defaultProgramNativeLineageMappings(lineage.preview));lineageRequest.current={id:programId('native-lineage'),now:null};report(true,'기존 개인 항목과 제작 항목의 연결을 확인해 주세요. 아직 개인 내용은 바꾸지 않았습니다.');return;}
      }
      report(false,result.reason==='invalid-anchor'?'개인 계획 기준일을 확인해 주세요.':result.reason==='archived'?'제작 초안이나 연결 문서가 보관되어 있습니다. 먼저 보관에서 꺼내 주세요.':'제작 설정이나 기존 문서 연결을 확인하지 못했습니다. 원문과 기존 기록은 유지했습니다. 제작 초안을 다시 열어 확인해 주세요.');return;
    }
    nativeHandoffRef.current=result.preview;setNativeHandoff(result.preview);setNativeHandoffChoices(programNativeHandoffChoices(result.preview));
    nativeHandoffRequest.current={id:programId('native-handoff'),now:null};report(true,'개인 실행에 반영할 내용을 확인해 주세요. 아직 저장하지 않았습니다.');
  }
  function changeNativeHandoff(itemId:string,field:keyof CreatorUpdateChoice,value:'keep'|'incoming') {
    const row=nativeHandoffRef.current?.rows.find(row=>row.itemId===itemId);
    if(pending.current||lockCount.current||!row||field!=='source'&&!row.fieldUpdatesAllowed)return;
    setNativeHandoffChoices(current=>({...current,[itemId]:{...(current[itemId]??{source:'keep',date:'keep',time:'keep',children:'keep'}),[field]:value}}));
    nativeHandoffRequest.current={id:programId('native-handoff'),now:null};
  }
  function cancelNativeLineage(){
    if(pending.current||lockCount.current)return;
    nativeLineageRef.current=null;lineageRequest.current=null;setNativeLineage(null);setLineageMapping({items:{},remaining:{}});
    report(true,'기존 문서 연결과 개인 기록은 바꾸지 않았습니다.');synchronizeCreatorWorking();
    if(typeof window!=='undefined')window.requestAnimationFrame(()=>nativeHandoffTrigger.current?.focus());
  }
  async function acceptNativeLineage(){
    const preview=nativeLineageRef.current,request=lineageRequest.current,working=nativeBuffer();
    if(!preview||!request||!working||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing)return;
    if(nativeContextPort.current?.hasPendingInput?.()||sourceUpdatePort.current?.hasPendingInput?.()||!programSame(working,baseline.current)||programCreatorNeedsSave(dataRef.current,actorId,working)){
      report(false,'비교 뒤 입력이 바뀌었습니다. 현재 입력과 연결 선택을 보관하고 다시 비교해 주세요.');return;
    }
    pending.current=true;setBusy(true);const release=port.lockInput();
    try{
      if(saving.current&&!await saving.current)return;
      const now=request.now??=new Date().toISOString(),result=await mutate('기존 개인 문서와 제작 항목 연결',current=>applyProgramCreatorNativeLineage(current,{actorId,requestId:request.id,preview,mapping:lineageMappingRef.current},now), { alphaCreator: { type: 'native-lineage', draftId: preview.draftId, ...(nativeAnchor ? { anchor: nativeAnchor } : {}), mapping: lineageMappingRef.current, now } });
      if(!result.ok){report(false,`${programErrorMessage(result.reason)} 연결 선택은 유지했습니다.`);return;}
      nativeLineageRef.current=null;lineageRequest.current=null;setNativeLineage(null);setLineageMapping({items:{},remaining:{}});
      report(true,result.result==='cancelled'?'연결을 변경하지 않았습니다.':'같은 개인 문서에 제작 항목을 연결했습니다. 기존 개인 내용은 유지했습니다. 제작 내용을 반영하려면 다시 비교해 주세요.');
    }catch{report(false,'연결을 저장하지 못했습니다. 선택과 기존 개인 기록은 유지했습니다. 다시 시도해 주세요.');}
    finally{release();pending.current=false;setBusy(false);}
  }
  async function acceptNativeHandoff() {
    const review=nativeHandoffRef.current,request=nativeHandoffRequest.current,working=nativeBuffer();
    if(!review||!request||!working||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing)return;
    if(nativeContextPort.current?.hasPendingInput?.()||!programSame(working,baseline.current)||programCreatorNeedsSave(dataRef.current,actorId,working)){
      report(false,'비교 뒤 입력이 바뀌었습니다. 입력을 저장하고 최신 내용으로 다시 비교해 주세요.');return;
    }
    pending.current=true;setBusy(true);const release=port.lockInput();let destination:string|null=null;
    try {
      if(saving.current&&!await saving.current)return;
      const now=request.now??=new Date().toISOString();let changed=false;
      const result=await mutate('제작 설정 개인 실행 연결',current=>{const transition=applyProgramNativeCreatorHandoff(current,{actorId,requestId:request.id,preview:review,choices:nativeHandoffChoices},now);if(transition.ok)changed=transition.changed;return transition;}, { alphaCreator: { type: 'native-handoff', draftId: review.draftId, ...(nativeAnchor ? { anchor: nativeAnchor } : {}), choices: nativeHandoffChoices, now } });
      if(!result.ok){report(false,`${programErrorMessage(result.reason)} 비교와 선택은 유지했습니다.`);return;}
      nativeHandoffRef.current=null;nativeHandoffRequest.current=null;setNativeHandoff(null);setNativeHandoffChoices({});
      report(true,changed?(review.documentId?'선택한 제작 내용을 개인 실행에 반영했습니다. 개인 기록은 유지했습니다.':'선택한 제작 내용으로 개인 문서를 만들었습니다.'):'이미 반영된 내용이거나 선택한 변경이 없습니다.');
      if(result.result!=='cancelled'&&!result.presentationPending)destination=result.result;
    }catch{report(false,'저장하지 못했습니다. 비교와 선택은 유지했습니다. 다시 시도해 주세요.');}
    finally{release();pending.current=false;setBusy(false);}
    if(destination)navigate({view:'space',id:destination});
  }
  async function applyNativeOperation(request:ProgramCreatorNativeOperationRequest):Promise<{ok:true}|{ok:false;reason:string}> {
    const current=nativeBuffer();
    if(!current?.nativeDocument||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing||sourceUpdatePort.current?.hasPendingInput?.())return{ok:false,reason:'conflict'};
    if(!programSame(current.nativeDocument,request.expectedOwner)
      ||request.operation.type==='sync_working_text_from_input'&&current.nativePendingRawText!==request.operation.rawText
      ||current.nativePendingRawText!==undefined&&request.operation.type!=='sync_working_text_from_input')return{ok:false,reason:'conflict'};
    pending.current=true;setBusy(true);const release=port.lockInput();
    try{
      if(!await flushDraft())return{ok:false,reason:'storage'};
      const expectedWorking=baseline.current,capture:{working:ProgramCreatorWorking|null}={working:null};
      const result=await mutate('제작 구조 변경',data=>{const changed=applyProgramNativeCreatorOperation(data,{actorId,requestId:request.requestId,draftId:current.draftId,expectedWorking,expectedOwner:request.expectedOwner,operation:request.operation},request.now);
        if(changed.ok)capture.working=changed.data.spaces[actorId].creatorWorkspace!.working;return changed;}, { alphaCreator: { type: 'native-operation', draftId: current.draftId, operation: request.operation, now: request.now } });
      if(!result.ok)return{ok:false,reason:result.reason};
      if(capture.working){const next=capture.working,snapshot=editor.current?.readSnapshot();baseline.current=next;bufferRef.current=next;setBuffer(next);
        if(snapshot?.rawText!==creatorNativeText(programCreatorEditorText(next)))setNativeTextMount(n=>n+1);orderHistory.current=null;structureHistory.current=null;setOrderPreview(null);}
      report(true,'제작 구조 변경을 보관했습니다. 저장 판본으로 남기려면 제작 초안을 저장해 주세요.');return{ok:true};
    }catch{return{ok:false,reason:'storage'};}
    finally{release();pending.current=false;setBusy(false);}
  }
  async function applySourceCommand(command:ProgramCreatorSourceCommand):Promise<{ok:true}|{ok:false;reason:string}> {
    const working=nativeBuffer();
    if(!working?.nativeDocument||pending.current||lockCount.current||composing.current||editor.current?.readSnapshot()?.composing
      ||nativeHandoffRef.current||nativeLineageRef.current||nativeContextPort.current?.hasPendingInput?.()||working.nativePendingRawText!==undefined
      ||!programSame(working,baseline.current)||!programSame(working,command.input.expectedWorking))
      return{ok:false,reason:'작성 중인 원문·구조·개인 실행 비교를 먼저 적용하거나 취소해 주세요. 비교 입력은 유지했습니다.'};
    pending.current=true;setBusy(true);const release=port.lockInput();
    try{
      if(saving.current&&!await saving.current)return{ok:false,reason:'먼저 입력 저장을 다시 시도해 주세요. 비교 입력은 유지했습니다.'};
      const capture:{working:ProgramCreatorWorking|null}={working:null};
      const alphaCreator: AlphaCreatorIntent = command.kind === 'stage'
        ? { type: 'source-stage', draftId: working.draftId, envelope: command.input.envelope, candidateDocument: command.input.candidateDocument,
          ...(command.input.matches ? { matches: command.input.matches } : {}), ...(command.input.projectionOptions ? { projectionOptions: command.input.projectionOptions } : {}),
          ...(command.input.replaceSession !== undefined ? { replaceSession: command.input.replaceSession } : {}), now: command.now }
        : command.kind === 'upgrade' ? { type: 'source-upgrade', draftId: working.draftId, now: command.now }
        : { type: 'source-transition', draftId: working.draftId, event: command.input.event, now: command.now };
      const result=await mutate(command.kind==='stage'?'제작 원본 비교 보관':command.kind==='upgrade'?'이전 원본 비교 기준 복구':'제작 원본 비교 선택',current=>{
        const transition=command.kind==='stage'?stageProgramNativeSourceUpdate(current,command.input,command.now)
          :command.kind==='upgrade'?upgradeProgramNativeSourceAbsences(current,command.input,command.now):transitionProgramNativeSourceUpdate(current,command.input,command.now);
        if(transition.ok)capture.working=transition.data.spaces[actorId].creatorWorkspace!.working;return transition;
      }, { alphaCreator });
      if(!result.ok)return{ok:false,reason:programErrorMessage(result.reason)};
      if(capture.working){const next=capture.working,snapshot=editor.current?.readSnapshot();baseline.current=next;bufferRef.current=next;setBuffer(next);
        if(snapshot?.rawText!==creatorNativeText(programCreatorEditorText(next)))setMount(n=>n+1);
        orderHistory.current=null;structureHistory.current=null;setOrderPreview(null);setNativeItem(null);}
      return{ok:true};
    }catch{return{ok:false,reason:'저장하지 못했습니다. 원문 비교와 선택은 유지했습니다. 다시 시도해 주세요.'};}
    finally{release();pending.current=false;setBusy(false);}
  }
  async function openNativeResultItem(itemId:string){
    if(pending.current||lockCount.current||composing.current)return;
    if(nativeContextPort.current&&!await nativeContextPort.current.flushAll())return;
    const owner=bufferRef.current?.nativeDocument;
    if(!owner?.document.parseResult.canonical.items.some(item=>item.itemId===itemId)){report(false,'이 결과의 원래 항목을 찾지 못했습니다. 다른 항목으로 이동하지 않았습니다.');return;}
    setNativeItem(itemId);setTab('input');
  }
  async function openNativeSource(target:NativeCreatorSourceFocusTarget){
    if(pending.current||lockCount.current||composing.current||nativeContextPort.current?.hasPendingInput?.())return;
    if(nativeContextPort.current&&!await nativeContextPort.current.flushAll())return;
    const focus=()=>{
      const working=nativeBuffer(),snapshot=editor.current?.readSnapshot(),owner=working?.nativeDocument;
      const range=owner?nativeCreatorSourceFocusRange(owner,target):null;
      if(!working||!owner||!range||working.nativePendingRawText!==undefined||!snapshot||snapshot.composing
        ||pending.current||lockCount.current||composing.current||snapshot.documentId!==working.draftId
        ||snapshot.rawText!==creatorNativeText(target.rawText)){
        report(false,'원문이나 선택 항목이 바뀌어 이동하지 않았습니다. 현재 입력을 유지했습니다.');return;
      }
      if(!editor.current?.focusRange(range.start,range.end))report(false,'원문 위치를 열지 못했습니다. 입력은 유지했습니다.');
    };
    setTab('input');if(typeof window==='undefined')focus();else window.requestAnimationFrame(focus);
  }
  async function nativeReplace(raw: string, range?: { start: number; end: number }, templateId?: ProgramCreatorWorking['templateId'], expected?: PersonalWorkspacePocLiveEditorSnapshot):Promise<boolean> {
    if (pending.current || lockCount.current || !bufferRef.current) return false;
    const snapshot = expected ?? editor.current?.readSnapshot(); if (!snapshot || snapshot.composing || composing.current) return false;
    pending.current = true; setBusy(true);
    try {
      const result = await editor.current!.applyNativeReplacement({ expected: snapshot, replacement: raw, range: programCreatorReplacementRange(snapshot.rawText, range) });
      if (!result.ok) { report(false, `원문에 적용하지 않았습니다 (${result.reason}). 입력을 유지했습니다.`); return false; }
      const next = { ...programCreatorWithEditorText(bufferRef.current,result.snapshot.rawText), ...(templateId ? { templateId } : {}) };
      delete next.sourceIdentity; orderHistory.current = null; structureHistory.current=null; setOrderPreview(null);
      bufferRef.current = next; setBuffer(next); setReplacement(null); report(true, '원문에 적용했습니다. 원문 편집기의 되돌리기를 사용할 수 있습니다.');return true;
    } finally { pending.current = false; setBusy(false); }
  }
  async function insertScaffold(templateId: ProgramCreatorWorking['templateId']) {
    const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(row => row.templateId === templateId);
    const working = bufferRef.current, snapshot = editor.current?.readSnapshot();
    if (!template || !working || !snapshot || pending.current || lockCount.current || composing.current || snapshot.composing || record?.status === 'archived') return;
    if (snapshot.documentId !== working.draftId || snapshot.rawText !== '' || programCreatorEditorText(working) !== ''
      || snapshot.sourceFingerprint !== fingerprint('') || !programSame(dataRef.current.spaces[actorId]?.creatorWorkspace?.working ?? null, baseline.current)) {
      report(false, '작성 틀은 빈 원문에서 시작할 수 있습니다. 현재 입력은 유지했습니다.'); return;
    }
    await nativeReplace(template.scaffold, { start: 0, end: 0 }, template.templateId, snapshot);
    const applied = editor.current?.readSnapshot();
    if (applied?.documentId === working.draftId && applied.rawText === template.scaffold && !applied.composing) editor.current?.focusRange(2);
  }
  function changeStructure(sidecar: ProgramCreatorStructureSidecar | null) {
    const current=bufferRef.current;
    if(!current || (pending.current || lockCount.current) && !composing.current)return;
    const next={...current};if(sidecar)next.structure=sidecar;else delete next.structure;
    structureHistory.current=null;bufferRef.current=next;setBuffer(next);
  }
  async function materializeStructure(prepared:ProgramCreatorStructurePrepared) {
    const current=nativeBuffer(),snapshot=editor.current?.readSnapshot();
    if(!current || !snapshot || pending.current || lockCount.current || composing.current || snapshot.composing)return;
    const currentRaw=programCreatorEditorText(current);
    const verified=current.structure&&prepareProgramCreatorStructure(current.structure,{draftId:current.draftId,rawText:currentRaw,now:prepared.after.draft.updatedAt});
    if(dataRef.current.activeActorId!==actorId || !programSame(dataRef.current.spaces[actorId]?.creatorWorkspace?.working??null,baseline.current)
      || !verified?.ok || !programSame(verified.value,prepared)
      || current.draftId!==prepared.draftId || currentRaw!==prepared.beforeRawText || !programSame(current.structure??null,prepared.before)
      || snapshot.documentId!==current.draftId || snapshot.rawText!==creatorNativeText(currentRaw)) {
      report(false,'입력이나 작성 틀이 바뀌었습니다. 입력한 내용으로 다시 미리보기를 확인해 주세요.');return;
    }
    pending.current=true;setBusy(true);
    try {
      // Persist the pre-existing form draft first; materialization itself is one
      // native replacement and one subsequent atomic working-source transaction.
      if(!await flushDraft())return;
      const result=await editor.current!.applyNativeReplacement({expected:snapshot,replacement:creatorNativeText(prepared.command.nextRawText),range:{start:0,end:snapshot.rawText.length}});
      if(!result.ok){
        if(result.snapshot && result.snapshot.documentId===current.draftId && result.snapshot.rawText!==creatorNativeText(currentRaw)) {
          const retained=programCreatorWithEditorText(current,result.snapshot.rawText);delete retained.sourceIdentity;bufferRef.current=retained;setBuffer(retained);
        }
        report(false,'원문 반영을 완료하지 못했습니다. 현재 원문과 작성 틀 입력을 보존했습니다.');return;
      }
      const committed=commitProgramCreatorStructure(prepared,{draftId:current.draftId,rawText:currentRaw,sidecar:current.structure??null,
        nativeRawText:result.snapshot.rawText===creatorNativeText(prepared.command.nextRawText)?prepared.command.nextRawText:result.snapshot.rawText});
      if(!committed.ok){
        const retained=programCreatorWithEditorText(current,result.snapshot.rawText);delete retained.sourceIdentity;
        bufferRef.current=retained;setBuffer(retained);report(false,'반영된 원문과 작성 틀을 함께 확인해 주세요. 입력은 보존했습니다.');return;
      }
      const lines=reconcileCreatorSourceLines(current.sourceIdentity?.lines??[],committed.value.rawText);
      const next={...programCreatorWithEditorText(current,committed.value.rawText),structure:committed.value.sidecar};
      if(!current.nativeDocument)next.sourceIdentity=creatorSourceIdentity(committed.value.rawText,lines);
      delete next.templateId;
      structureHistory.current={prepared,beforeWorking:current,afterWorking:next,snapshot,afterSnapshot:result.snapshot};orderHistory.current=null;setOrderPreview(null);
      bufferRef.current=next;setBuffer(next);orderSavingRef.current=true;setOrderSaving(true);
      if(await flushDraft())report(true,'입력한 내용으로 원문을 만들었습니다. 원문 편집기의 되돌리기로 원문과 작성 틀을 함께 복구할 수 있습니다.');
    }catch{report(false,'저장을 완료하지 못했습니다. 원문과 작성 틀 입력을 보존했습니다. 입력 보관에서 다시 시도해 주세요.');}
    finally{pending.current=false;setBusy(false);orderSavingRef.current=false;setOrderSaving(false);}
  }
  function showOrder(calendarResult = false) {
    const snapshot=editor.current?.readSnapshot(), current=bufferRef.current;
    if (!snapshot || !current || pending.current || lockCount.current || snapshot.composing || composing.current) return;
    const prior=workspace?.executionSources?.[current.draftId]?.revisions.at(-1)?.sourceLines ?? [];
    const shown=programCreatorEditorText(current),raw=creatorNativeText(shown)===snapshot.rawText ? shown : snapshot.rawText;
    const identity=current.sourceIdentity && validCreatorSourceIdentity(current.sourceIdentity,raw) ? current.sourceIdentity
      : creatorSourceIdentity(raw,reconcileCreatorSourceLines(prior,raw));
    const selection={start:creatorNativeOffsetToSource(raw,snapshot.selectionStart),end:creatorNativeOffsetToSource(raw,snapshot.selectionEnd),direction:snapshot.selectionDirection};
    const plan=calendarResult ? planCreatorCalendarSourceOrder({...current,rawText:raw},identity,Number(orderStep),selection,today,new Date().toISOString())
      : planCreatorSourceOrder(identity,Number(orderStep),selection);
    if(plan.status !== 'ready') { report(plan.status==='noop',plan.status==='noop' ? '이미 날짜순입니다. 원문은 바꾸지 않았습니다.' : `이 구간은 안전하게 정렬할 수 없습니다 (${plan.reason}). 원문을 직접 확인해 주세요.`);return; }
    setOrderPreview({plan,snapshot,owner:dataRef.current.spaces[actorId].creatorWorkspace});
  }
  function cancelOrder() {
    const capture=orderPreview; setOrderPreview(null);
    if(capture) restoreOrderPresentation(capture.snapshot,capture.plan.before.rawText,capture.plan.selectionBefore);
  }
  function restoreOrderPresentation(snapshot: PersonalWorkspacePocLiveEditorSnapshot, raw: string, selection: {start:number;end:number;direction:'none'|'forward'|'backward'}) {
    const current=editor.current?.readSnapshot();
    if(!current || current.documentId!==snapshot.documentId || current.rawText!==creatorNativeText(raw) || current.composing)return;
    editor.current?.focusRange(creatorSourceOffsetToNative(raw,selection.start),creatorSourceOffsetToNative(raw,selection.end),selection.direction);
    // Presentation-only and scoped to this mounted source editor, never a global selector.
    const textarea=sourceFrame.current?.querySelector<HTMLTextAreaElement>('textarea[data-testid="personal-workspace-live-editor-textarea"]');
    if(textarea && textarea.value===creatorNativeText(raw)){textarea.scrollTop=snapshot.scrollTop;textarea.scrollLeft=snapshot.scrollLeft;}
  }
  async function applyOrder() {
    const capture=orderPreview,current=bufferRef.current,snapshot=editor.current?.readSnapshot();
    if(!capture || !current || !snapshot || pending.current || lockCount.current) return;
    if(snapshot.composing || composing.current || dataRef.current.activeActorId!==actorId || !programSame(dataRef.current.spaces[actorId].creatorWorkspace,capture.owner)
      || snapshot.documentId!==capture.snapshot.documentId || snapshot.rawText!==capture.snapshot.rawText || snapshot.dispatchCount!==capture.snapshot.dispatchCount) {
      report(false,'원문이나 저장 상태가 바뀌었습니다. 정렬을 다시 확인해 주세요. 입력은 유지했습니다.');setOrderPreview(null);return;
    }
    pending.current=true;setBusy(true);
    try {
      const edit=programCreatorOrderNativeReplacement(snapshot.rawText,creatorNativeText(capture.plan.after.rawText));
      const result=await editor.current!.applyNativeReplacement({expected:snapshot,...edit});
      if(!result.ok) {
        if(result.snapshot && result.snapshot.documentId===current.draftId && result.snapshot.rawText!==current.rawText) {
          const retained=programCreatorWithEditorText(current,result.snapshot.rawText);delete retained.sourceIdentity;bufferRef.current=retained;setBuffer(retained);orderHistory.current=null;
        }
        report(false,`정렬을 완료하지 못했습니다 (${result.reason}). 원문을 보관하고 다시 확인해 주세요.`);return;
      }
      const next=programCreatorWithEditorText(current,capture.plan.after.rawText);
      if(!current.nativeDocument)next.sourceIdentity=capture.plan.after;
      structureHistory.current=null;
      orderSavingRef.current=true;setOrderSaving(true);
      orderHistory.current={plan:capture.plan,draftId:current.draftId,beforeWorking:{...current,sourceIdentity:capture.plan.before},snapshot:capture.snapshot};
      bufferRef.current=next;setBuffer(next);setOrderPreview(null);
      restoreOrderPresentation(capture.snapshot,capture.plan.after.rawText,capture.plan.selectionAfter);
      if(await flushDraft()) report(true,'같은 구간의 날짜 있는 항목을 정렬했습니다. 원문에서 Ctrl+Z로 되돌리고 Ctrl+Shift+Z로 다시 적용할 수 있습니다.');
    } catch {report(false,'정렬을 저장하지 못했습니다. 원문 입력을 보관한 뒤 다시 시도해 주세요.');}
    finally {pending.current=false;setBusy(false);orderSavingRef.current=false;setOrderSaving(false);}
  }
  function acceptNativeInput(snapshot: PersonalWorkspacePocLiveEditorSnapshot, inputType: string) {
    if(lockCount.current || pending.current)return;
    const current=bufferRef.current!; const history=orderHistory.current;
    const structure=structureHistory.current;
    if(structure && structure.prepared.draftId===snapshot.documentId) {
      const desired=inputType==='historyUndo'?structure.beforeWorking:structure.afterWorking,desiredRaw=programCreatorEditorText(desired);
      const restored=restoreProgramCreatorStructureHistory(structure.prepared,{transactionId:structure.prepared.command.transactionId,inputType,
        beforeRawText:programCreatorEditorText(current),rawText:snapshot.rawText===creatorNativeText(desiredRaw)?desiredRaw:snapshot.rawText,sidecar:current.structure??null});
      if(restored.ok){
        const next={...programCreatorWithEditorText(current,restored.value.rawText),structure:restored.value.sidecar};
        if(desired.sourceIdentity)next.sourceIdentity=desired.sourceIdentity;else delete next.sourceIdentity;
        if(desired.templateId)next.templateId=desired.templateId;else delete next.templateId;
        bufferRef.current=next;setBuffer(next);setOrderPreview(null);
        const presentation=inputType==='historyUndo'?structure.snapshot:structure.afterSnapshot;
        queueMicrotask(()=>restoreOrderPresentation(presentation,restored.value.rawText,{start:creatorNativeOffsetToSource(restored.value.rawText,presentation.selectionStart),end:creatorNativeOffsetToSource(restored.value.rawText,presentation.selectionEnd),direction:presentation.selectionDirection}));
        return;
      }
      structureHistory.current=null;
    }
    let next=programCreatorWithEditorText(current,snapshot.rawText);
    if(history && history.draftId===snapshot.documentId && inputType==='historyUndo' && programCreatorEditorText(current)===history.plan.after.rawText && snapshot.rawText===creatorNativeText(history.plan.before.rawText)) {
      next=programCreatorWithEditorText(next,history.plan.before.rawText);if(!current.nativeDocument)next.sourceIdentity=history.plan.before;
      queueMicrotask(()=>restoreOrderPresentation(history.snapshot,history.plan.before.rawText,history.plan.selectionBefore));
    } else if(history && history.draftId===snapshot.documentId && inputType==='historyRedo' && programCreatorEditorText(current)===history.plan.before.rawText && snapshot.rawText===creatorNativeText(history.plan.after.rawText)) {
      next=programCreatorWithEditorText(next,history.plan.after.rawText);if(!current.nativeDocument)next.sourceIdentity=history.plan.after;
      queueMicrotask(()=>restoreOrderPresentation(history.snapshot,history.plan.after.rawText,history.plan.selectionAfter));
    } else {delete next.sourceIdentity;orderHistory.current=null;}
    setOrderPreview(null);bufferRef.current=next;setBuffer(next);
  }
  function insertSource(syntax: string) {
    const snapshot = editor.current?.readSnapshot(); if (!snapshot) return;
    const start = snapshot.selectionStart, text = `${start && snapshot.rawText[start-1] !== '\n' ? '\n' : ''}${syntax}\n`;
    void nativeReplace(text, { start, end: snapshot.selectionEnd });
  }
  function reviewUpdate() {
    if(pending.current||lockCount.current||needsSave||!bufferRef.current)return;
    if(propertyInput.current.value!==''){blockRawAuxiliary();return;}
    const preview=inspectCreatorUpdate(dataRef.current,bufferRef.current.draftId,new Date().toISOString());
    if(!preview){report(false,'적용할 새 저장 판본과 이전 인계 항목을 확인하지 못했습니다. 원문을 저장한 뒤 다시 확인해 주세요.');return;}
    updateReviewRef.current=preview;updateChoicesRef.current={};setUpdateChoices({});setUpdateReview(preview);
  }
  function changeUpdateChoice(id:string,field:keyof CreatorUpdateChoice,value:'keep'|'incoming') {
    if(pending.current||lockCount.current||!updateReviewRef.current?.rows.some(row=>row.id===id))return;
    const choices={...updateChoicesRef.current,[id]:{...(updateChoicesRef.current[id]??{source:'keep',date:'keep',time:'keep',children:'keep'}),[field]:value}};
    updateChoicesRef.current=choices;setUpdateChoices(choices);
  }
  function cancelUpdate(){
    if(pending.current||lockCount.current)return;
    clearUpdateReview();report(true,'개인 내용은 바꾸지 않았습니다.');synchronizeCreatorWorking();
  }
  async function acceptUpdate() {
    const review=updateReviewRef.current,choices=updateChoicesRef.current;
    if(!review||pending.current||lockCount.current)return;
    if(propertyInput.current.value!==''){report(false,'속성 입력을 적용하거나 취소한 뒤 개인 업데이트를 적용해 주세요. 입력과 선택은 유지했습니다.');return;}
    pending.current=true;setBusy(true);const release=port.lockInput?.()??(()=>{});
    try{
      if(!await flushDraft())return;
      const now = new Date().toISOString();
      const result=await mutate('제작 업데이트 선택 수용',current=>applyCreatorUpdate(current,{actorId,preview:review,choices}), { alphaCreator: { type: 'raw-update', draftId: review.draftId, choices: normalizeAlphaCreatorRawUpdateChoices(review, choices), now } });
      if(!result.ok){report(false,'개인 문서나 원문이 바뀌었거나 저장하지 못했습니다. 비교와 선택은 유지했습니다. 저장 실패라면 다시 시도하고, 내용이 바뀌었다면 최신 내용으로 다시 비교해 주세요.');return;}
      clearUpdateReview();report(true,'선택한 제작 내용을 반영했습니다. 개인 날짜·진행·메모와 이전 기록은 보존했습니다. 전체 되돌리기로 취소할 수 있습니다.');
    }catch{report(false,'저장하지 못했습니다. 비교와 선택은 그대로 두었습니다. 다시 시도해 주세요.');}
    finally{pending.current=false;setBusy(false);release();}
  }
  function showStructure(templateId: string) {
    if (pending.current || lockCount.current) return;
    const snapshot = editor.current?.readSnapshot(), definition = findPersonalWorkspacePocStructureTemplatePreview(templateId);
    if (!snapshot || !definition) { report(false, '검증된 구조 템플릿을 확인하지 못했습니다. 원문은 바꾸지 않았습니다.'); return; }
    setReplacement({ raw: definition.expectedRawText, label: `${definition.label} 구조 템플릿 예시`, templateId: definition.templateId,
      structure: { draftId: snapshot.documentId, templateId, catalogVersion: definition.catalogVersion,
        contractVersion: definition.contractVersion, sourceFingerprint: snapshot.sourceFingerprint, itemCount: definition.expectedItemCount } });
  }
  async function applyReplacement() {
    if (!replacement) return;
    const snapshot = editor.current?.readSnapshot(); if (!snapshot) return;
    const structure = replacement.structure;
    const plan = planProgramCreatorStructure({ draftId: snapshot.documentId, expectedDraftId: structure.draftId,
      templateId: structure.templateId, catalogVersion: structure.catalogVersion, contractVersion: structure.contractVersion,
      rawText: snapshot.rawText, expectedSourceFingerprint: structure.sourceFingerprint, confirmed: true, composing: snapshot.composing || composing.current });
    if (plan.status !== 'applied') {
      report(false, plan.reason === 'nonempty-source' ? '구조 템플릿은 정확히 빈 제작 원문에서만 시작합니다. 지금 원문은 보관하고 별도 빈 제작 원문을 열어 주세요.'
        : `원문이나 조합 상태가 바뀌어 적용하지 않았습니다 (${plan.reason}). 예시를 다시 확인해 주세요.`); return;
    }
    await nativeReplace(plan.nextRawText, undefined, replacement.templateId);
  }
  async function propertyApply() {
    if(pending.current||lockCount.current||updateReviewRef.current){if(updateReviewRef.current)blockRawAuxiliary();return;}
    const snapshot = editor.current?.readSnapshot(); if (!snapshot) return;
    const property=propertyInput.current;
    const result = planPersonalWorkspacePocAuthoringPropertyEdit({ intent: 'apply', rawText: snapshot.rawText, expectedSourceFingerprint: snapshot.sourceFingerprint,
      itemSourceLine: Number(property.line), key: property.key, value: property.value, beforeSelection: { start: snapshot.selectionStart, end: snapshot.selectionEnd } });
    if (result.status === 'applied') {
      try{if(await nativeReplace(result.nextRawText,undefined,undefined,snapshot))clearProperty();}
      catch{report(false,'속성을 적용하지 못했습니다. 입력은 유지했습니다. 다시 시도해 주세요.');}
    } else {if(result.status==='no-op')clearProperty();report(result.status === 'no-op', result.status === 'blocked' ? `속성을 적용하지 않았습니다 (${result.reason}). 원문을 확인해 주세요.` : '바뀐 내용이 없습니다.');}
  }
  async function handoff(confirmed = false) {
    if (pending.current || lockCount.current || !record || needsSave) return;
    if(blockRawAuxiliary())return;
    const inspection = inspectProgramCreatorHandoff(dataRef.current, actorId, record.draftId, today, new Date().toISOString());
    if (inspection?.documentId && workspace?.handoffs[record.draftId]?.recordRevision !== record.recordRevision
      && (!confirmed || comparison?.recordRevision !== record.recordRevision || comparison.source !== record.rawText)) { setComparison(inspection); return; }
    const release = port.lockInput(); pending.current = true; setBusy(true);
    try {
      if (!await flushDraft()) return;
      const requestId = programId('request'), now = new Date().toISOString();
      const result = await mutate('제작물 개인 문서 인계', current => handoffProgramCreatorDraft(current, { actorId, requestId, draftId: record.draftId, expectedRecordRevision: record.recordRevision, today }, now), { alphaCreator: { type: 'raw-handoff', draftId: record.draftId, expectedRecordRevision: record.recordRevision, today, now } });
      if (!result.ok) { setComparison(inspectProgramCreatorHandoff(dataRef.current, actorId, record.draftId, today, now)); report(false, programErrorMessage(result.reason)); return; }
      navigate({ view: 'space', id: result.result });
    } finally { pending.current = false; setBusy(false); release(); }
  }
  const blocked = busy || locked || record?.status === 'archived';
  return <section className={styles.workspace} aria-label="제작 작업 공간" aria-busy={busy}
    onKeyDownCapture={event=>{if(orderPreview && event.key==='Escape' && !composing.current){event.preventDefault();cancelOrder();}}}
    onCompositionStartCapture={() => { composing.current = true; }}
    onCompositionEndCapture={() => { composing.current = false; queueMicrotask(() => { const latest = nativeBuffer(); if (latest) { bufferRef.current = latest; setBuffer(latest); } }); }}
    onBeforeInputCapture={event => { if ((lockCount.current || orderSavingRef.current) && !composing.current && !editor.current?.readSnapshot()?.composing) event.preventDefault(); }}>
    <header className={styles.heading}><h1>제작하기</h1><button disabled={busy || locked} onClick={() => navigate({ view: 'space' })}>내 공간</button></header>
    <nav className={styles.actions} aria-label="제작 단계">{(['input','result','library'] as const).map((value,i) => <button key={value} disabled={busy||locked} aria-current={tab === value ? 'page' : undefined} onClick={() => {if(value!==tab&&blockRawAuxiliary())return;if((nativeHandoffRef.current||nativeLineageRef.current)&&value!=='result'){report(false,'개인 실행 비교를 적용하거나 모두 유지하고 닫은 뒤 이동해 주세요. 선택은 유지했습니다.');return;}if(sourceUpdatePort.current?.hasPendingInput?.()&&value!=='input'){report(false,'새 원문 비교 입력을 저장하거나 취소한 뒤 이동해 주세요. 입력은 유지했습니다.');return;}setTab(value);}}>{['원문','결과','제작 초안'][i]}</button>)}</nav>
    {message && ((!nativeHandoff&&!nativeLineage) || tab !== 'result') && <p role={error ? 'alert' : 'status'} className={error ? styles.error : styles.status}>{message}</p>}
    {choice && <section className={styles.notice} aria-label="작성 중 원문 확인"><p>명시 저장하지 않은 제작 원문이 있습니다.</p><div className={styles.actions}><button disabled={busy || locked} onClick={() => void saveChoice()}>저장하고 열기</button><button disabled={busy || locked} onClick={() => void switchWorking(choice === 'close' ? null : choice)}>입력 버리고 열기</button><button onClick={cancelChoice}>계속 편집</button></div></section>}
    <div hidden={tab !== 'library'}><section className={styles.library}><div className={styles.actions}><button disabled={busy || locked} onClick={() => choose({ draftId: programId('creator'), rawText: '', title: '', baseRecordRevision: null })}>빈 제작 원문 만들기</button><button aria-pressed={archived} onClick={() => setArchived(v => !v)}>{archived ? '사용 중 초안 보기' : '보관함 보기'}</button></div>
      {workspace?.importedWorkingCandidates&&<section aria-label="가져온 미저장 원문"><h2>가져온 미저장 원문</h2><p>저장판과 별도로 보관한 원문입니다. 열어 확인한 뒤 직접 저장하세요.</p>
        {Object.entries(workspace.importedWorkingCandidates.candidates).map(([id,candidate])=><details key={id}><summary>{candidate.working.title||'제목 없는 원문'} · {candidate.readOnly?'이전 복구 기록 · 읽기 전용':candidate.kind==='recovery'?'복구 원문':'미저장 원문'}</summary>
          <pre>{candidate.working.nativePendingRawText??candidate.working.rawText}</pre>
          {!candidate.readOnly&&<button disabled={busy||locked||!importedCreatorWorking(workspace,id)} onClick={()=>{const working=importedCreatorWorking(workspace,id);if(working)choose(working);}}>이 원문 이어 쓰기</button>}
          <details><summary>보존한 원본 저장값</summary><pre>{workspace.importedWorkingCandidates!.sources[candidate.sourceKey]}</pre></details>
        </details>)}
      </section>}
      <label>제작 초안 찾기<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <ul>{rows.map(row => <li key={row.draftId}><button disabled={busy || locked} onClick={() => choose(creatorWorkingFromRecord(workspace!, row.draftId)!)}>{row.title}<small>저장 판본 {row.recordRevision} · {row.status === 'archived' ? '보관됨' : '사용 중'}</small></button></li>)}</ul>{!rows.length && <p>이 목록에 제작 초안이 없습니다.</p>}
    </section></div>
    {!buffer && tab !== 'library' && <section className={styles.notice}><p>빈 원문에서 시작하거나 보관한 제작 초안을 이어 쓰세요.</p><button onClick={() => choose({ draftId: programId('creator'), rawText: '', title: '', baseRecordRevision: null })}>빈 제작 원문 만들기</button><button onClick={() => setTab('library')}>제작 초안 열기</button></section>}
    {buffer && <>
      <div hidden={tab !== 'input'}>
        <label>제작 초안 제목<input value={buffer.title} maxLength={200} readOnly={blocked && !composing.current} onChange={event => { if ((lockCount.current || pending.current) && !composing.current) return; const next = { ...bufferRef.current!, title: event.target.value }; bufferRef.current = next; setBuffer(next); }} /></label>
        {record?.status === 'archived' && <p className={styles.notice}>보관한 초안입니다. 복원한 뒤 편집할 수 있습니다.</p>}
        <div className={styles.actions}><button disabled={blocked} onClick={() => insertSource('## ')}>구간 추가</button><button disabled={blocked} onClick={() => insertSource('- [ ] ')}>할 일 추가</button><button disabled={blocked || buffer.nativePendingRawText!==undefined || !buffer.rawText.trim() || !buffer.title.trim()} onClick={() => void saveExplicit()}>제작 초안 저장</button></div>
        <details><summary>작성 틀·예시 선택</summary><p>빈 틀을 선택하면 원문에 바로 넣습니다. 구조 템플릿 예시는 빈 제작 원문에서 시작합니다.</p><div className={styles.templates}>{PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map(template => <div key={template.templateId}><strong>{template.label}</strong><button disabled={blocked || programCreatorEditorText(buffer) !== ''} onClick={() => void insertScaffold(template.templateId)}>빈 틀 넣기</button><button disabled={blocked} onClick={() => showStructure(template.templateId)}>예시 확인</button></div>)}</div></details>
        <ProgramCreatorStructureForm key={`${actorId}:${buffer.draftId}`} draftId={buffer.draftId} rawText={programCreatorEditorText(buffer)} sidecar={buffer.structure??null} disabled={blocked}
          onChange={changeStructure} onMaterialize={materializeStructure} onCompositionChange={value=>{composing.current=value;}}
          onReturnToSource={()=>{const snapshot=editor.current?.readSnapshot();if(snapshot&&!composing.current&&!snapshot.composing)editor.current?.focusRange(snapshot.selectionStart,snapshot.selectionEnd,snapshot.selectionDirection);}} />
        {replacement && <section className={styles.notice} aria-label="제작 원문 적용 확인"><h2>{replacement.label}</h2><pre>{replacement.raw}</pre>
          <p>확인한 항목 {replacement.structure.itemCount}개를 빈 제작 원문에 넣습니다. 날짜와 내용은 예시이며 적용 뒤 직접 수정할 수 있습니다.</p><details><summary>구조 템플릿 검증 정보</summary><p>StructureDraft {replacement.structure.contractVersion} · 카탈로그 {replacement.structure.catalogVersion}. 원문이 바뀌면 적용하지 않습니다.</p></details>
          <button disabled={blocked} onClick={() => void applyReplacement()}>확인한 구조 예시로 시작</button><button onClick={() => setReplacement(null)}>취소</button></section>}
        <div ref={sourceFrame}><PersonalWorkspacePocLiveEditor key={`${actorId}:${buffer.draftId}:${mount}:${nativeTextMount}`} ref={editor} editorId={`program-creator-editor-${buffer.draftId}`} documentId={buffer.draftId}
          initialValue={programCreatorEditorText(buffer)} readOnly={record?.status === 'archived' || locked && !composing.current && !editor.current?.readSnapshot()?.composing || orderSaving && !composing.current && !editor.current?.readSnapshot()?.composing} lineGuides={guides} rows={16} label="제작 원문" showReviewControl={false}
          onNativeInput={acceptNativeInput} /></div>
        {buffer.nativeDocument&&<ProgramCreatorNativeContext key={`native:${actorId}:${buffer.draftId}:${mount}`} owner={buffer.nativeDocument} pendingRawText={buffer.nativePendingRawText}
          onOperation={applyNativeOperation} onOpenSource={openNativeSource} readOnly={blocked} selectedItemId={nativeItem} onSelectionChange={rememberNativeSelection} onRegisterEditors={registerNativePort}/>}
        {buffer.nativeDocument&&<ProgramCreatorSourceUpdate key={`source-update:${actorId}:${buffer.draftId}`} data={data} working={buffer} disabled={blocked}
          onCommand={applySourceCommand} onRegisterEditors={registerSourceUpdatePort}/>}
        {!buffer.nativeDocument&&<details><summary>원문 날짜순 정렬</summary><p>같은 구간의 날짜 있는 항목만 날짜·종일·시각 순으로 옮깁니다. 날짜 미정 항목은 제자리에 두며 속성과 하위 체크를 함께 옮깁니다.</p>
          <label>정렬할 구간<select value={orderStep} onChange={event=>setOrderStep(event.target.value)}><option value="">구간 선택</option>{programCreatorEditorText(buffer).replace(/\r\n?/gu,'\n').split('\n').flatMap((line,index)=>/^##\s+\S/u.test(line)?[<option key={index} value={index+1}>{line.slice(3)} · {index+1}행</option>]:[])}</select></label>
          <button disabled={blocked || !orderStep} onClick={()=>showOrder()}>날짜순 미리보기</button>
          <details><summary>상대 날짜·반복을 포함해 결과 순서에 맞추기</summary><p>기준일과 반복 규칙으로 계산한 Calendar 결과의 첫 일정 순서로 원문 항목을 옮깁니다. 일정이 없는 항목은 구간 끝에 원래 순서로 남깁니다. 회차를 여러 원문 항목으로 복제하지 않습니다.</p><button disabled={blocked || !orderStep} onClick={()=>showOrder(true)}>Calendar 결과순 미리보기</button></details></details>}
        {orderPreview && <section className={styles.notice} aria-label="제작 원문 날짜순 확인" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();cancelOrder();}}}><h2>같은 구간의 원문 순서 변경</h2>
          <p>{orderPreview.plan.beforeTitles.join(' → ')} → {orderPreview.plan.afterTitles.join(' → ')}</p><details><summary>적용할 전체 원문</summary><pre>{orderPreview.plan.after.rawText}</pre></details>
          <button disabled={blocked} onClick={()=>void applyOrder()}>확인한 순서로 원문에 적용</button><button disabled={busy} onClick={cancelOrder}>정렬 취소</button></section>}
        {preview?.materialized&&<details><summary>항목 속성 편집</summary><div className={styles.properties}><label>대상 항목<select disabled={blocked} value={propertyLine} onChange={event => changeProperty('line',event.target.value)}><option value="">항목 선택</option>{preview.materialized.parseResult.items.map(item => <option key={item.sourceLine} value={item.sourceLine}>{item.title} · {item.sourceLine}행</option>)}</select></label><label>속성<select disabled={blocked} value={propertyKey} onChange={event => changeProperty('key',event.target.value)}>{PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.map(property => <option key={property.key} value={property.key}>{property.label}</option>)}</select></label><label>값<input disabled={blocked} value={propertyValue} onChange={event => changeProperty('value',event.target.value)} /></label><button disabled={blocked || !propertyLine} onClick={()=>void propertyApply()}>원문 속성에 적용</button>{propertyValue!==''&&<button disabled={blocked} onClick={cancelProperty}>속성 입력 취소</button>}</div></details>}
        {!!preview?.materialized?.parseResult.blockingIssues.length && <details open><summary>원문 확인이 필요한 부분</summary><ul>{preview.materialized.parseResult.blockingIssues.map((issue,i) => <li key={i}>{issue.line ? `${issue.line}행 · ` : ''}{issue.message}</li>)}</ul></details>}
        <details><summary>저장 전 입력 보관</summary><label>복사할 제작 원문<textarea readOnly rows={6} value={programCreatorEditorText(buffer)} onFocus={event => event.currentTarget.select()} /></label>
          {buffer.structure&&<label>복사할 작성 틀 입력 JSON<textarea readOnly rows={6} value={JSON.stringify({version:1,draftId:buffer.draftId,structure:buffer.structure},null,2)} onFocus={event=>event.currentTarget.select()}/></label>}
          <button disabled={busy} onClick={() => void flushDraft()}>입력 보관 다시 시도</button></details>
      </div>
      <div hidden={tab !== 'result'}><h2>원문 결과 확인</h2><p>결과 확인은 개인 문서를 만들거나 실행 기록을 바꾸지 않습니다.</p>
        {buffer.nativeDocument&&<><label>개인 계획 기준일<input ref={nativeAnchorInput} type="date" value={nativeAnchor} aria-describedby="native-anchor-hint" disabled={blocked||!!nativeHandoff||!!nativeLineage} onChange={event=>setNativeAnchor(event.target.value)}/></label><p id="native-anchor-hint">{nativeAnchor?`상대 일정을 ${nativeAnchor} 기준으로 미리 봅니다. 개인 실행과 비교할 때도 같은 날짜를 사용합니다.`:lastNativeAnchor?`마지막 인계 기준일 ${lastNativeAnchor}로 미리 보고 비교합니다. 다른 날짜를 쓰려면 기준일을 입력하세요.`:'원문에 있는 기준일로 미리 봅니다. 원문에도 기준일이 없으면 상대 일정은 날짜 미정으로 남습니다.'} 원문의 날짜와 기존 개인 실행 기록은 바뀌지 않습니다.</p>{nativeAnchor&&<button disabled={blocked||!!nativeHandoff||!!nativeLineage} onClick={()=>{setNativeAnchor('');nativeAnchorInput.current?.focus();}}>{lastNativeAnchor?'마지막 인계 기준으로 보기':'원문 기준으로 보기'}</button>}</>}
        {buffer.nativePendingRawText!==undefined&&<p className={styles.notice}>원문 변경을 아직 제작 구조에 반영하지 않았습니다. 아래는 마지막으로 반영한 구조의 결과이며, 새 입력은 원문 화면에서 비교·적용할 수 있습니다.</p>}
        {buffer.nativeDocument?<ProgramCreatorNativeResult key={resultScope} owner={buffer.nativeDocument} anchor={nativePreviewAnchor} structure={buffer.structure} draftId={buffer.draftId} today={today} onOpenItem={itemId=>void openNativeResultItem(itemId)}/>:preview?.result?.ok ? <PersonalWorkspacePocResultPresenter projection={preview.result.projection} navigation={navigation} readOnly availableViews={templatePolicy ? programTemplateResultViews(templatePolicy) : undefined}
          onResultViewChange={resultView => chooseResult({ resultView })} onCalendarBaseDateChange={baseDate => chooseResult({ baseDate })}
          onCalendarSelectedDateChange={selectedDate => chooseResult({ selectedDate })} onOpenItem={intent => { const sourceLine = preview.result?.ok ? preview.result.projection.items.find(item => item.ref === intent.itemRef)?.sourceLine : undefined; if (sourceLine) { setTab('input'); window.setTimeout(() => { const offset = buffer.rawText.split('\n').slice(0,sourceLine-1).join('\n').length + (sourceLine > 1 ? 1 : 0); editor.current?.focusRange(offset); },0); } }} />
          : <p role="status">원문의 확인 항목을 해결하면 결과를 볼 수 있습니다.</p>}
        {buffer.nativeDocument?<button ref={nativeHandoffTrigger} disabled={blocked||needsSave||buffer.nativePendingRawText!==undefined||!!nativeHandoff||!!nativeLineage} onClick={prepareNativeHandoff}>제작 설정을 개인 실행과 비교</button>:<button disabled={blocked || needsSave || !preview?.materialized?.ok} onClick={() => void handoff()}>{workspace?.handoffs[buffer.draftId] ? '같은 개인 문서에 인계' : '확인한 제작물을 개인 문서로 인계'}</button>}{needsSave && <p>인계 전에 제작 초안을 명시 저장해 주세요.</p>}
        {nativeHandoff&&<div ref={nativeHandoffFrame}><ProgramCreatorNativeHandoff preview={nativeHandoff} choices={nativeHandoffChoices} busy={busy||locked} feedback={{error,text:message}} onChange={changeNativeHandoff} onApply={()=>void acceptNativeHandoff()} onCancel={cancelNativeHandoff} onRefresh={prepareNativeHandoff}/></div>}
        {nativeLineage&&<div ref={lineageFrame}><ProgramCreatorNativeLineage preview={nativeLineage} mapping={lineageMapping} busy={busy||locked} feedback={{error,text:message}}
          onChange={next=>{if(pending.current||lockCount.current)return;lineageMappingRef.current=next;setLineageMapping(next);lineageRequest.current={id:programId('native-lineage'),now:null};}} onApply={()=>void acceptNativeLineage()} onCancel={cancelNativeLineage} onRefresh={prepareNativeHandoff}/></div>}
        {!buffer.nativeDocument&&workspace?.executionSources?.[buffer.draftId]&&<button disabled={blocked||needsSave} onClick={reviewUpdate}>개인 수정과 새 제작 내용 비교</button>}
        <p>반복은 개인 문서의 개별 회차에서 날짜·완료·포함 여부를 바꿉니다. 원문 시간과 시간대는 그대로 보존하며 기기 시간대로 자동 변환하지 않습니다.</p>
        <details><summary>작성·출력 지원 범위</summary><p>고정 날짜순 정렬은 날짜 미정 항목의 자리를 유지합니다. Calendar 결과순 정렬은 상대 날짜·반복의 첫 일정을 사용하고 미정 항목을 구간 끝으로 옮깁니다. 작성 틀의 입력값은 원문과 별도로 보관하며, 확인한 뒤 원문에 반영합니다. 연결을 해제해도 원문은 남습니다. 자료·영상 링크는 보존하며 파일 첨부 업로드는 지원하지 않습니다.</p></details>
      </div>
      {record && <details className={styles.manage}><summary>제작 초안 관리·출처</summary><p>이 Program 제작 초안의 저장 판본 {record.recordRevision}. 개인 문서·공개 Flow와 별도로 저장됩니다.</p>
        <details className={styles.history}><summary>제작 초안의 저장 이력</summary><p>실제로 남아 있는 저장본만 표시합니다. Program 명시 저장은 최근 5개, 가져온 기존 제작기 저장본은 별도로 보존합니다. 자동 임시저장·개인 문서 저장 이력과는 다릅니다.</p>
          {!(workspace?.savedHistory?.drafts[record.draftId]?.length)&&<p>아직 수집한 저장 이력이 없습니다. 과거 저장본을 임의로 만들지 않습니다.</p>}
          <div className={styles.actions}>{[...(workspace?.savedHistory?.drafts[record.draftId]??[])].reverse().map(entry=><button key={entry.id} disabled={busy||locked} onClick={()=>compareSaved(entry)}>{entry.kind==='program'?`Program 저장 ${entry.record.recordRevision}${entry.context?` · 작성 설정 ${entry.context.contextRevision}`:''}`:`기존 저장 ${entry.origin.versionId}`} · {entry.savedAt}</button>)}</div>
          {historyEntry&&!historyPreview&&<><pre>{historyEntry.rawText||'(원문 없음)'}</pre>{historyEntry.kind==='text-authoring-v1'&&<details><summary>원래 저장본의 전체 구조 자료 · 읽기 전용</summary><pre>{historyEntry.origin.documentJson}</pre></details>}</>}
          {historyPreview&&<><ProgramCreatorHistoryComparison preview={historyPreview}/><button disabled={busy||locked||needsSave} onClick={()=>void restoreSaved()}>{historyPreview.mode==='full-document'?'이 저장본의 원문·제작 설정으로 복구':'이 저장본의 원문으로 복구'}</button></>}
          {historyEntry&&<button disabled={busy} onClick={()=>{setHistoryEntry(null);setHistoryPreview(null);historyRequest.current=null;}}>저장본 비교 닫기</button>}
        </details>
        {workspace?.origins[record.draftId] && <details><summary>기존 CreatorDraft 원문</summary><p>원래 초안: {workspace.origins[record.draftId].creatorDraftId}. 원래 보관함은 바꾸지 않았습니다.</p><pre>{workspace.origins[record.draftId].current.rawText}</pre></details>}
        {workspace?.executionSources?.[record.draftId] && <details><summary>개인 실행으로 인계한 원문 판본</summary><p>명시 인계한 원문만 보관합니다. 이전 회차 기록을 최신 제작 내용으로 덮어쓰지 않습니다.</p>{workspace.executionSources[record.draftId].revisions.map(revision => <details key={revision.id}><summary>제작 판본 {revision.recordRevision} · {revision.rows.length}개 항목</summary><pre>{revision.raw}</pre></details>)}<button disabled={busy || locked} onClick={() => navigate({view:'space',id:workspace.executionSources![record.draftId].documentId})}>같은 개인 문서·이전 회차 기록 확인</button></details>}
        <div className={styles.actions}>{record.status === 'active' ? <><label>바꿀 이름<input value={rename} onChange={event => setRename(event.target.value)} /></label><button disabled={busy || locked || needsSave || !rename.trim()} onClick={() => void commit((current,now) => ({ type:'rename', draftId:record.draftId,title:rename,expectedLibraryRevision:current.spaces[actorId].creatorWorkspace!.library.revision,expectedRecordRevision:record.recordRevision,now }), '이름 변경')}>이름 변경</button><button disabled={busy || locked || needsSave} onClick={() => void commit((current,now) => ({ type:'duplicate',sourceDraftId:record.draftId,newDraftId:programId('creator'),expectedLibraryRevision:current.spaces[actorId].creatorWorkspace!.library.revision,expectedSourceRecordRevision:record.recordRevision,now }), '초안 복제')}>별도 초안 복제</button><button disabled={busy || locked || needsSave} onClick={() => void commit((current,now) => ({ type:'archive',draftId:record.draftId,expectedLibraryRevision:current.spaces[actorId].creatorWorkspace!.library.revision,expectedRecordRevision:record.recordRevision,now }), '초안 보관')}>보관</button></> : <button disabled={busy || locked} onClick={() => void commit((current,now) => ({ type:'restore',draftId:record.draftId,expectedLibraryRevision:current.spaces[actorId].creatorWorkspace!.library.revision,expectedRecordRevision:record.recordRevision,now }), '초안 복원')}>복원</button>}<button disabled={busy || locked} onClick={() => choose('close')}>원문 닫고 목록 보기</button></div>
      </details>}
      {comparison && <><ProgramCreatorHandoffComparison {...comparison} />{comparison.executionChange && <p>같은 원문 항목 {comparison.executionChange.retainedRows}개 · 새 항목 {comparison.executionChange.newRows}개 · 이전 판본으로 남길 항목 {comparison.executionChange.removedRows}개. 반복 규칙 {comparison.executionChange.series}개{comparison.executionChange.timeZones.length ? ` · 원문 시간대 ${comparison.executionChange.timeZones.join(', ')}` : ''}. 같은 항목·규칙의 이전 회차도 비교 후 명시적으로 다시 연결합니다.</p>}{comparison.documentId && <button onClick={() => navigate({ view:'space', id:comparison.documentId! })}>개인 문서 확인</button>}<button disabled={busy || locked || needsSave} onClick={() => void handoff(!comparison.conflict)}>{comparison.conflict ? '최신 상태로 인계 다시 확인' : '비교한 원문을 같은 문서에 인계'}</button><button onClick={() => setComparison(null)}>비교 닫기</button></>}
      {updateReview&&<section aria-label="제작 업데이트 선택 비교" className={styles.comparison} onKeyDown={event=>{if(event.key==='Escape'&&!busy){event.preventDefault();cancelUpdate();}}}>
        <h2>개인 수정과 새 제작 내용</h2><p>선택한 항목만 바꿉니다. 날짜·시간·하위 확인은 각각 선택하며 메모·진행 기록은 유지합니다. 하위 확인을 새 원문으로 바꾸면 기존 하위 행은 이전 하위 확인 문서에 보관합니다. 원문에서 삭제되거나 반복 여부가 바뀐 이전 항목도 기록과 함께 보관합니다.</p>
        {updateReview.rows.map(row=>{const choice=updateChoices[row.id]??{source:'keep',date:'keep',time:'keep',children:'keep'};const change=(field:keyof CreatorUpdateChoice,value:'keep'|'incoming')=>changeUpdateChoice(row.id,field,value);return <fieldset key={row.id} disabled={busy||locked}><legend>{row.title} · {row.sourceKind}</legend>
          <details><summary>이전 원문</summary><pre>{row.previous||'이전 항목 없음'}</pre></details><details open={row.hasPrivateChanges}><summary>현재 개인 내용{row.hasPrivateChanges?' · 수정 있음':''}</summary><pre>{row.personal||'개인 항목 없음'}</pre></details><details open><summary>새 제작 내용</summary><pre>{row.incoming||'원문에서 삭제됨'}</pre></details>
          <label><input type="radio" name={`creator-source-${row.id}`} checked={choice.source==='keep'} onChange={()=>change('source','keep')}/>{row.kind==='added'?'지금 추가하지 않기':'이전 원문과 개인 내용 유지'}</label>
          <label><input type="radio" name={`creator-source-${row.id}`} checked={choice.source==='incoming'} onChange={()=>change('source','incoming')}/>{row.kind==='removed'?'이전 항목·기록 보관':'새 원문 항목 수용'}</label>
          {choice.source==='incoming'&&row.kind==='changed'&&row.sourceKind==='ordinary → ordinary'&&(['date','time','children'] as const).map((field,i)=><label key={field}>{['실행 날짜','실행 시간','하위 확인'][i]}<select value={choice[field]} onChange={event=>change(field,event.target.value as 'keep'|'incoming')}><option value="keep">현재 개인 내용 유지</option><option value="incoming">새 원문 내용 적용</option></select></label>)}
        </fieldset>;})}
        <button disabled={busy||locked} onClick={()=>void acceptUpdate()}>선택한 변경만 한 번 적용</button><button disabled={busy||locked} onClick={cancelUpdate}>모두 유지하고 비교 닫기</button><button disabled={busy||locked} onClick={reviewUpdate}>최신 내용으로 다시 비교</button>
      </section>}
    </>}
  </section>;
}
