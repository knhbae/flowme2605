import {consumeOwnedWritingAck,noteWritingPhase,type OwnedWritingAck} from './writing-ack';
import type {ProgramDocumentInput} from './program-document-input';
import { eul, ro } from './folder-notice';
import { planFolderPickerLink } from './folder-picker';
import { textWorkspaceModel as M, type TextInputSplice, type TextTaskSplitIntent, type TextProgressCheckConflict, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { programClone } from './contract';
import { mergeProgramTextWorkspace } from './text-merge';
import type { ProgramPrivateMutationObserver } from './ui-contract';
import { captureProgramFolderOperation, undoProgramFolderOperation, combineProgramFolderScopes, planProgramFreshFolderIndent, programFolderStillFree, programFolderNewUsesElsewhere, programFreshFolderAvailable, programFolderOperationNotice, type ProgramFolderOperation, type FolderIndentPlan } from './folder-operation';

export type ProgramTaskProgressEdit = { taskId: string; date: string; percent: number; correctionAsOfDate?: string };
export type ProgramTextCommitOptions = {
  /** Explicit existing date/cumulative-progress command; never inferred from title/RAW typing. */
  privateTaskProgress?: ProgramTaskProgressEdit;
  onPrivateMutation?: ProgramPrivateMutationObserver;
  groupId?: string;
  expectedWorkspace?: TextWorkspaceState;
  /** Generation of this exact serialized submission; never an ACK for later input. */
  writingGeneration?: number;
  privateTaskSchedule?: { taskId: string; date: string | null; time: string };
  /** UI-only confirmation of a successful schedule's server-generated property IDs. */
  onPrivateTaskScheduleAcknowledged?: (confirmation: Promise<TextWorkspaceState | null>) => void;
  /** The host refused this save before sending it (a result is still pending, or another command is in
   * flight): it never reached the server. Without this call a refused save counts as possibly sent. */
  onNotSent?: () => void;
};

export type ProgramTextCommit = (next: TextWorkspaceState, label: string, options?: ProgramTextCommitOptions) => Promise<boolean>;

export interface ProgramTextDraftState {
  committed: TextWorkspaceState;
  working: TextWorkspaceState;
  raw: string;
  dirty: boolean;
  saving: boolean;
  invalid: boolean;
  error: string;
  progressConflict?: TextProgressCheckConflict;
  /** The refused line (index in raw) when the model named one; shown with the reason, and put back on request. */
  problemLine?: number;
  /** One line about a finished folder line: moved to a folder, its folder renamed, or the move put back. */
  folderNotice?: string;
}

/** Serializes draft commits while preserving newer typing and rejected raw input. */
/** D11 (d): ⇤·⇥ on a linked folder line changes nothing and says why (D11 A's words, without the undo hint). */
export const FOLDER_INDENT_NOTICE = '폴더 줄의 들여쓰기는 글로 바꿀 수 없습니다. 분류 화면의 상위 폴더에서 옮겨 주세요.';

const FOLDER_PROBLEM_TEXT: Record<string, string> = {
  'name-conflict': '같은 위치에 이름이 겹치는 폴더가 있습니다. 다른 이름을 입력해 주세요. 입력은 남아 있습니다.',
  'unknown-id': '현재 작업 공간에 없는 폴더 연결입니다. 연결 정보를 지우고 폴더 이름만 입력해 주세요. 입력은 남아 있습니다.',
  'identity-mismatch': 'TXT의 폴더 연결이 현재 폴더와 맞지 않습니다. 변경한 연결 정보를 되돌려 주세요. 입력은 남아 있습니다.',
  'invalid-parent': '하위 폴더의 들여쓰기와 상위 폴더를 확인해 주세요. 입력은 남아 있습니다.',
  'folder-limit': '폴더는 100개까지 만들 수 있습니다. 이 줄을 되돌리거나 쓰지 않는 폴더를 정리해 주세요. 입력은 남아 있습니다.',
  'folder-subfolder': '하위 폴더가 있어 이 폴더 줄은 옮기지 않았습니다. 이 줄을 되돌려 주세요. 입력은 남아 있습니다.',
  // D11 A (folder grammar 4판): the words are the spec's.
  'folder-indent': '폴더 줄의 들여쓰기는 글로 바꿀 수 없습니다. ↶로 되돌리거나 분류 화면의 상위 폴더에서 옮겨 주세요.',
};

export function createProgramTextDraft(
  workspace: TextWorkspaceState,
  docId: string,
  commit: ProgramTextCommit,
  notify: (state: ProgramTextDraftState) => void,
  validateWorkspace: (next: TextWorkspaceState) => boolean = () => true,
  documentInput?: ProgramDocumentInput,
  backgroundSave = false,
  validationContext: () => unknown = () => validateWorkspace,
  /** The newest workspace the host holds (another tab's saves reach it while this input stays unsaved). */
  latestWorkspace: () => TextWorkspaceState | undefined = () => undefined,
) {
  let state: ProgramTextDraftState = { committed: workspace, working: workspace, raw: M.raw(M.getDocument(workspace, docId)), dirty: false, saving: false, invalid: false, error: '' };
  let flight: Promise<boolean> | null = null;
  let label = '문서 편집';
  let groupId: string | undefined;
  let privateTaskSchedule: ProgramTextCommitOptions['privateTaskSchedule'];
  let inputGeneration = 0;
  type Attempt = { before: TextWorkspaceState; next: TextWorkspaceState; generation: number; allowBasicChecks: boolean };
  let submitted: Attempt | null = null;
  // Earlier attempts from the same committed base that may have reached the server, kept until one is
  // confirmed, the base moves or the input is discarded. A retry the host refused before sending (a result
  // still pending) never enters it, so it cannot push out the request whose reply was lost.
  let unconfirmed: Attempt[] = [];
  const pasteHistory: { before: TextWorkspaceState; after: TextWorkspaceState }[] = [];
  const report = () => notify({ ...state });
  type Input = { inputType: string; inputSplice?: TextInputSplice; taskSplit?: TextTaskSplitIntent; compositionGeneration?: number; folderHold?: number[]; folderDeclare?: number[]; folderLink?: number[]; folderMove?: number[] };
  const signature=(input?:Input)=>JSON.stringify(input?{inputType:input.inputType,inputSplice:input.inputSplice,taskSplit:input.taskSplit,compositionGeneration:input.compositionGeneration,folderHold:input.folderHold,folderDeclare:input.folderDeclare,folderLink:input.folderLink,folderMove:input.folderMove}:null);
  /** A save whose reply was lost, confirmed later on a newer base: another device saved a different
   * document, the host took that as its base, and the submitted input was merged onto it per document.
   * Accept only when the confirmed text is exactly that merge of this submission; newer input moves
   * onto the confirmed text by the same merge. Anything else stays unconfirmed (and protected). */
  function acceptMergedSave(attempt: Attempt, before: TextWorkspaceState, next: TextWorkspaceState) {
    if (state.saving || !programSame(state.committed, attempt.before) || programSame(attempt.before, before)) return false;
    const merged = mergeProgramTextWorkspace(attempt.before, attempt.next, before);
    if (!merged || !programSame(merged, next) || !M.validate(next) || !validateWorkspace(next) || !M.getDocument(next, docId)) return false;
    const unchangedInput = inputGeneration === attempt.generation && programSame(state.working, attempt.next)
      && state.raw === M.raw(M.getDocument(attempt.next, docId));
    if (unchangedInput) {
      const working = documentInput?.install(next) ?? next;
      state = { ...state, committed: working, working, raw: M.raw(M.getDocument(working, docId)), dirty: false, error: '', progressConflict: undefined };
      folderOperation = null; folderEnter = null; submitted = null; unconfirmed = []; report(); return true;
    }
    if (inputGeneration <= attempt.generation) return false;
    const moved = mergeProgramTextWorkspace(attempt.next, state.working, next);
    if (!moved || !validateWorkspace(moved) || !M.getDocument(moved, docId) || M.raw(M.getDocument(moved, docId)) !== state.raw) return false;
    const working = documentInput?.install(moved) ?? moved;
    state = { ...state, committed: next, working, error: '', progressConflict: undefined };
    folderOperation = null; folderEnter = null;
    submitted = null; unconfirmed = []; report(); return true;
  }
  function deriveRaw(raw:string,input?:Input){
      const baseRaw = M.raw(M.getDocument(state.committed, docId));
      const before = state.working;
      const committedLines = M.getDocument(state.committed, docId)?.lines ?? [];
      const canRestoreCommitted = !input?.folderDeclare && !input?.folderLink && !input?.folderMove && raw === baseRaw && programSame({ ...before,
        documents: before.documents.map(doc => doc.id === docId ? { ...doc, lines: committedLines } : doc),
        flows: before.flows.map(doc => doc.id === docId ? { ...doc, lines: committedLines } : doc),
      }, state.committed);
      const history = (input?.inputType === 'historyUndo' || input?.inputType === 'historyRedo') ? pasteHistory.slice().reverse().find(entry => {
        const from = input.inputType === 'historyUndo' ? entry.after : entry.before;
        const to = input.inputType === 'historyUndo' ? entry.before : entry.after;
        return programSame(M.getDocument(before, docId), M.getDocument(from, docId)) && raw === M.raw(M.getDocument(to, docId));
      }) : undefined;
      const historyFrom = history && (input?.inputType === 'historyUndo' ? history.after : history.before);
      const historyTo = history && (input?.inputType === 'historyUndo' ? history.before : history.after);
      // Genuine native history may restore a paste/split snapshot only while its whole
      // workspace still matches. Never overwrite newer records or another edit.
      const proof = !history && !canRestoreCommitted ? documentInput?.prepare(before, raw, input) ?? null : null;
      const edit: ReturnType<typeof M.editTextResult> = history
        ? programSame(before, historyFrom) ? { state: historyTo!, reason: null } : { state: before, reason: 'identity-ambiguous' }
        : canRestoreCommitted ? { state: state.committed, reason: null }
          : proof ? { state: proof.next.workspace, reason: null }
          : M.editTextResult(before, docId, raw, { folderText: true, ...(input?.inputSplice ? { inputSplice: input.inputSplice } : {}), ...(input?.taskSplit ? { taskSplit: input.taskSplit } : {}),
            ...(input?.folderHold ? { folderHold: input.folderHold } : {}), ...(input?.folderDeclare ? { folderDeclare: input.folderDeclare } : {}), ...(input?.folderLink ? { folderLink: input.folderLink } : {}), ...(input?.folderMove ? { folderMove: input.folderMove } : {}) });
      return {baseRaw,before,proof,edit};
  }
  const blankless = (text: TextWorkspaceState) => M.raw(M.getDocument(text, docId)).split('\n').filter(line => line.trim()).join('\n');
  const onlyBlankLinesAdded = (from: TextWorkspaceState, to: TextWorkspaceState) => blankless(from) === blankless(to)
    && programSame({ ...from, documents: [], flows: [] }, { ...to, documents: [], flows: [] });
  // The last finished folder line move, for one undo right after it (D3 B).
  let lastMove: { before: TextWorkspaceState; after: TextWorkspaceState; lineIds: string[] } | null = null;
  let folderSequence = 0;
  let folderOperation: { id: number; at: number; change: ProgramFolderOperation; generation: number; fresh: boolean;
    automaticBlank?: { id: string; text: string } } | null = null;
  let folderEnter: { before: TextWorkspaceState; generation: number; lineId: string } | null = null;
  const folderIndentProofs = new WeakSet<object>();
  // Folders this draft made. S4 v14 phone (11/2): a new folder's line emptied and typed again finds the folder by its
  // name and only links it; that line is still the new folder's (D11 B), as long as nothing else uses it.
  const madeFolders = new Set<string>();
  // N6 review (11/2): D11 B also asks the host's newest workspace. Another tab may have filed a document in the folder,
  // linked it or moved it while this input, unsaved, keeps the folder as it was; then the line stays where it is.
  const latestFree = (folderId: string) => {
    const latest = latestWorkspace(), parent = state.working.folders.find(folder => folder.id === folderId)?.parentId ?? null;
    return !latest || programFolderStillFree(latest, docId, folderId, parent);
  };
  function recordFolder(before: TextWorkspaceState, after: TextWorkspaceState) {
    const change = captureProgramFolderOperation(before, after);
    if (!change) { if (folderOperation) folderOperation.fresh = false; return; }
    for (const id of change.createdFolders) madeFolders.add(id);
    const previous = folderOperation;
    const grouped = previous?.change.kind === 'scopes' && change.kind === 'scopes' && Date.now() - previous.at <= 3000;
    folderOperation = { id: grouped ? previous.id : ++folderSequence, at: Date.now(),
      change: grouped ? combineProgramFolderScopes(previous.change, change) : change, generation: inputGeneration,
      fresh: change.createdLines.length === 1 && (change.kind === 'create' || change.kind === 'link' && madeFolders.has(change.createdLines[0].folderId)) };
  }
  let prepared: {state:ProgramTextDraftState;raw:string;signature:string;ownerRevision:number|undefined;context:unknown;value:ReturnType<typeof deriveRaw>}|null=null;
  const basicCheckReady=()=>!state.invalid&&(!state.saving||submitted?.allowBasicChecks===true);
  const api = {
    canCheck:(lineId:string,date:string)=>basicCheckReady()&&!!documentInput?.canPrepareCheck(state.working,lineId,date),
    generation:()=>inputGeneration,
    folderOperation: () => folderOperation && { id: folderOperation.id, kind: folderOperation.change.kind, at: folderOperation.at,
      lineId: folderOperation.change.createdLines[0]?.lineId ?? folderOperation.change.lines[0]?.lineId,
      notice: programFolderOperationNotice(state.working, folderOperation.change) },
    endFolderNotice(id?: number) { if (folderOperation && (id === undefined || folderOperation.id === id)) { folderOperation = null; folderEnter = null; } },
    noteFolderEnter(lineId: string) {
      if (folderOperation && folderOperation.generation === inputGeneration && !folderOperation.automaticBlank
        && folderOperation.change.lines.some(line => line.docId === docId && line.lineId === lineId && line.expected?.trimStart().startsWith('- /')))
        folderEnter = { before: state.working, generation: inputGeneration, lineId };
    },
    folderRenameBase(fromId: string) {
      if (!folderOperation || folderOperation.change.kind !== 'move' || !api.canUndoFolderMove()
        || !folderOperation.change.bindings.some(row => row.before?.scopeId === fromId)) return null;
      const restored = undoProgramFolderOperation(state.working, folderOperation.change);
      return restored.ok ? restored.next : null;
    },
    freshFolderLine(lineId: string) {
      const operation = folderOperation, created = operation?.change.createdLines[0];
      return !!operation?.fresh && operation.generation === inputGeneration && created?.lineId === lineId
        && programFreshFolderAvailable(state.working, { ...created, automaticBlank: operation.automaticBlank }) && latestFree(created.folderId);
    },
    /** S4 v14 phone (r_0049–0059): a new folder's linked line, its name deleted and typed back with '- /' kept. The
     *  line never let the folder go, so nothing was linked again and D11 B stayed shut. For a folder this draft made
     *  that nothing else uses, it is taken as let go and typed again: a link of that folder, fresh. False otherwise. */
    relinkFolderLine(lineId: string) {
      const binding = state.working.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === lineId);
      if (state.invalid || binding?.kind !== 'scope' || !madeFolders.has(binding.scopeId)
        || !programFreshFolderAvailable(state.working, { docId, lineId, folderId: binding.scopeId }) || !latestFree(binding.scopeId)) return false;
      const change = captureProgramFolderOperation({ ...state.working, bindings: state.working.bindings.filter(row => row !== binding) }, state.working);
      if (change?.kind !== 'link' || change.createdLines.length !== 1) return false;
      folderOperation = { id: ++folderSequence, at: Date.now(), change, generation: inputGeneration, fresh: true }; folderEnter = null;
      return true;
    },
    planFreshFolderIndent(plan: FolderIndentPlan, operationId: number) {
      const operation = folderOperation;
      if (!basicCheckReady() || !operation?.fresh || operation.id !== operationId || operation.generation !== inputGeneration) return null;
      const created = operation.change.createdLines[0]; if (!created || created.docId !== docId || !latestFree(created.folderId)) return null;
      const proof = planProgramFreshFolderIndent(state.working, { ...created, automaticBlank: operation.automaticBlank }, plan);
      if (!proof) return null;
      const owned = { ...proof, plan: programClone(proof.plan), before: state.working, generation: inputGeneration, operationId };
      const seal = (value: object) => { for (const entry of Object.values(value)) if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) seal(entry); Object.freeze(value); };
      seal(owned.next); seal(owned.plan); Object.freeze(owned);
      folderIndentProofs.add(owned); return owned;
    },
    applyFreshFolderIndent(proof: { next: TextWorkspaceState; before: TextWorkspaceState; generation: number; operationId: number }, raw: string) {
      if (!folderIndentProofs.has(proof)) return false;
      folderIndentProofs.delete(proof);
      if (!basicCheckReady() || proof.before !== state.working || proof.generation !== inputGeneration || folderOperation?.id !== proof.operationId
        || !folderOperation.fresh || M.raw(M.getDocument(proof.next, docId)) !== raw || !M.validate(proof.next) || !validateWorkspace(proof.next)
        || !latestFree(folderOperation.change.createdLines[0]?.folderId ?? '')) return false;
      const before = state.working, automaticBlank = folderOperation.automaticBlank;
      const folder = proof.next.folders.find(folder => folder.id === folderOperation!.change.createdLines[0]?.folderId)!;
      const place = folder.parentId ? `‘${proof.next.folders.find(parent => parent.id === folder.parentId)!.title}’ 아래` : '최상위';
      inputGeneration++; prepared = null; folderEnter = null; privateTaskSchedule = undefined; lastMove = null;
      const working = documentInput?.install(proof.next) ?? proof.next;
      state = { ...state, working, raw, dirty: true, invalid: false, error: '', progressConflict: undefined, folderNotice: `‘${folder.title}’${eul(folder.title)} ${place}로 옮겼습니다` };
      recordFolder(before, working);
      if (automaticBlank && folderOperation) folderOperation.change = captureProgramFolderOperation(before, working, [automaticBlank.id])!;
      label = '새 폴더 옮기기'; groupId = `text:${docId}`; report(); return true;
    },
    undoFolderOperation(id: number) {
      if (!basicCheckReady() || folderOperation?.id !== id) return { ok: false as const, reason: '이 폴더 동작의 알림이 끝났습니다. 현재 입력은 유지했습니다.' };
      const result = undoProgramFolderOperation(state.working, folderOperation.change);
      if (!result.ok) return result;
      if (!validateWorkspace(result.next)) return { ok: false as const, reason: '현재 문서의 보존 조건이 바뀌어 되돌리지 않았습니다. 현재 입력은 유지했습니다.' };
      inputGeneration++; prepared = null; privateTaskSchedule = undefined; lastMove = null; folderOperation = null; folderEnter = null;
      const working = documentInput?.install(result.next) ?? result.next;
      state = { ...state, working, raw: M.raw(M.getDocument(working, docId)), dirty: true, error: '', folderNotice: '폴더 동작을 되돌렸습니다', progressConflict: undefined };
      label = '폴더 동작 되돌리기'; groupId = `text:${docId}`; report(); return { ok: true as const };
    },
    canApplyLocal:()=>!!documentInput&&basicCheckReady(),
    applyLocal(next:TextWorkspaceState,nextLabel:string){
      if(!documentInput||!basicCheckReady()||next===state.working||!M.validate(next)||!validateWorkspace(next))return false;
      inputGeneration++;prepared=null;privateTaskSchedule=undefined;
      if (folderOperation) folderOperation.fresh = false; folderEnter = null;
      const working=documentInput.install(next);
      state={...state,working,raw:M.raw(M.getDocument(working,docId)),dirty:true,error:'',progressConflict:undefined};
      label=nextLabel;groupId=`text:${docId}`;report();return true;
    },
    applyCheck(lineId:string,date:string){
      if(!basicCheckReady()||!documentInput)return false;
      const before=state.working,proof=documentInput.prepareCheck(before,lineId,date);
      if(!proof||!validateWorkspace(proof.next.workspace))return false;
      const working=documentInput.accept(proof,before);if(!working)return false;
      inputGeneration++;prepared=null;privateTaskSchedule=undefined;
      if (folderOperation) folderOperation.fresh = false; folderEnter = null;
      state={...state,working,raw:M.raw(M.getDocument(working,docId)),dirty:true,error:'',progressConflict:undefined};
      label='할 일 체크 변경';groupId=`text:${docId}`;report();return true;
    },
    cancelPreparedRaw(){prepared=null;},
    /** Judge the refused raw again (a folder freed elsewhere, say). True once it is accepted. */
    recheck() { return state.invalid ? api.updateRaw(state.raw, '', { inputType: 'recheck' }) : true; },
    prepareRaw(raw:string,input?:Input,exactCommand=false){
      const value=deriveRaw(raw,input);
      if(exactCommand&&(value.edit.reason!==null||M.raw(M.getDocument(value.edit.state,docId))!==raw)
        ||!validateWorkspace(value.edit.state)){prepared=null;return false;}
      prepared={state,raw,signature:signature(input),ownerRevision:documentInput?.revision(),context:validationContext(),value};return true;
    },
    flush(){
      if(state.invalid)return false;
      if(!M.validate(state.working)||!validateWorkspace(state.working)){state={...state,invalid:true,dirty:true,error:'현재 입력의 보존 조건을 확인하지 못했습니다. 원문을 유지했습니다.'};report();return false;}
      return true;
    },
    getState: () => state,
    rejectRaw(raw: string) {
      privateTaskSchedule = undefined;
      if (folderOperation) folderOperation.fresh = false; folderEnter = null;
      inputGeneration++;
      state = { ...state, raw, invalid: true, dirty: true, progressConflict: undefined, problemLine: undefined, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
    },
    updateRaw(raw: string, progressDate = '', input?: Input) {
      privateTaskSchedule = undefined;
      const enter = folderEnter; folderEnter = null;
      inputGeneration++;
      const admitted = prepared && prepared.state===state && prepared.raw===raw && prepared.signature===signature(input)
        &&prepared.ownerRevision===documentInput?.revision()&&prepared.context===validationContext() ? prepared : null;
      const value = admitted ? admitted.value : deriveRaw(raw,input);
      prepared=null;
      const {baseRaw,before,proof,edit}=value;
      const next = edit.state;
      const acceptedRaw = edit.normalizedText ?? raw;
      const folderError = edit.folderProblem ? FOLDER_PROBLEM_TEXT[edit.folderProblem] ?? '폴더 이름과 연결 정보를 확인해 주세요. 입력은 남아 있습니다.' : '';
      const protectedChange = !admitted && !validateWorkspace(next);
      let invalid = protectedChange || M.raw(M.getDocument(next, docId)) !== acceptedRaw;
      let working=next;
      if(!invalid&&documentInput){
        const owned=proof?documentInput.accept(proof,before):documentInput.install(next);
        if(!owned)invalid=true;else working=owned;
      }
      if (!invalid && input?.inputSplice && next !== before) pasteHistory.push({ before, after: working });
      state = { ...state, raw: invalid ? raw : acceptedRaw, working: invalid ? state.working : working, invalid,
        dirty: state.saving || acceptedRaw !== baseRaw || next !== state.committed,
        progressConflict: !protectedChange && invalid && edit.reason === 'progress-check-conflict' ? edit.progressConflict : undefined,
        problemLine: !protectedChange && invalid ? edit.folderLine : undefined,
        folderNotice: !invalid && edit.folderMoved ? edit.folderMoved.renamed ? `폴더 이름을 ‘${edit.folderMoved.title}’로 바꿨습니다` : `‘${edit.folderMoved.title}’ 폴더로 옮겼습니다` : undefined,
        error: protectedChange ? '보관·휴지통·복구 문서나 반복 규칙·보류 항목의 원문 표시는 여기서 바꿀 수 없습니다. 해당 줄을 원래대로 되돌리면 일반 할 일과 메모를 계속 편집할 수 있습니다. 입력은 보관 중입니다.'
          : !invalid ? '' : folderError || (edit.reason === 'identity-ambiguous'
            ? '여러 줄의 변경을 기존 항목과 연결하지 못해 반영하지 않았습니다. 제목 수정과 줄 이동은 나누고, 여러 제목은 한 줄씩 수정해 저장해 주세요. 입력은 그대로 남아 있습니다.'
            : edit.reason === 'invalid-format'
              ? '날짜·진행률·들여쓰기 형식을 확인해 주세요. 입력은 그대로 남아 있습니다.'
              : edit.reason === 'progress-check-conflict'
                ? '진행 기록과 다른 체크 표시로 바꿀 수 없습니다. 체크 표시를 되돌린 뒤 ‘진행 조절’에서 변경해 주세요. 입력은 남아 있습니다.'
              : '입력을 안전하게 반영하지 못했습니다. 변경을 나눠서 다시 시도해 주세요. 입력은 그대로 남아 있습니다.') };
      // The Enter that finished the line only adds an empty line; the move stays the one thing ↶ puts back.
      if (!invalid) lastMove = edit.folderMoved ? { before, after: state.working, lineIds: (input?.folderMove ?? []).map(index => M.getDocument(before, docId)?.lines[index]?.id).filter((id): id is string => !!id) }
        : lastMove && lastMove.after === before && onlyBlankLinesAdded(lastMove.after, state.working) ? { ...lastMove, after: state.working } : null;
      if (!invalid) {
        const oldDoc = M.getDocument(before, docId), newDoc = M.getDocument(state.working, docId);
        const at = oldDoc?.lines.findIndex(line => line.id === enter?.lineId) ?? -1;
        // The Enter's line goes right under the folder line. Above blank lines just like it (left there before), the
        // model gives the new id to the last of them (N5 3b); it is the same text either way.
        const oldIds = new Set(oldDoc?.lines.map(line => line.id)), added = newDoc?.lines.findIndex(line => !oldIds.has(line.id)) ?? -1;
        const blank = newDoc?.lines[added];
        const automatic = enter && enter.before === before && enter.generation === inputGeneration - 1 && folderOperation
          && oldDoc && newDoc && at >= 0 && added > at && newDoc.lines.length === oldDoc.lines.length + 1 && blank
          && newDoc.lines.slice(at + 1, added + 1).every(line => line.text === /^ */.exec(oldDoc.lines[at].text)![0] + '  ')
          && oldDoc.lines.every((line, index) => programSame(line, newDoc.lines[index < added ? index : index + 1]))
          && onlyBlankLinesAdded(before, state.working);
        if (automatic && folderOperation) {
          folderOperation.automaticBlank = { ...blank }; folderOperation.generation = inputGeneration;
          const previousId = newDoc.lines[added - 1].id;
          for (const region of folderOperation.change.regions) if (region.docId === docId && region.ids.includes(enter.lineId)) {
            const index = region.ids.indexOf(region.ids.includes(previousId) ? previousId : enter.lineId); region.ids.splice(index + 1, 0, blank.id);
          }
          folderOperation.change.lines.push({ docId, lineId: blank.id, expected: blank.text, restore: blank.text, order: newDoc.lines.map(line => line.id) });
        } else recordFolder(before, state.working);
      } else if (folderOperation) folderOperation.fresh = false;
      label = '문서 편집'; groupId = `text:${docId}`; report();
      return !invalid;
    },
    /** A typed "- /name" line was kept as text (folderHold); judge it once now that it is finished.
     * linkOnly (left, not finished explicitly) links only a folder of exactly that name and makes nothing.
     * False when there is nothing to do, or when the judgement refused it (the error keeps the input). */
    declareFolderLine(lineIndex: number, linkOnly = false, picker = false) {
      if (state.invalid) return false;
      const previous = state, doc = M.getDocument(state.working, docId), lineId = doc?.lines[lineIndex]?.id;
      const unbound = !!lineId && !state.working.bindings.some(row => row.docId === docId && row.lineId === lineId);
      if (picker && unbound) {
        const row = M.rowMeta(state.working, docId).find(row => row.id === lineId);
        const ids = new Set(doc!.lines.slice(lineIndex + 1, row?.subtreeEndIndex ?? lineIndex + 1).map(line => line.id));
        if (state.working.bindings.some(row => row.docId === docId && row.kind === 'scope' && ids.has(row.lineId))) {
          state = { ...state, folderNotice: '하위 폴더가 연결된 줄은 여기서 옮길 수 없습니다. 하위 폴더를 먼저 옮겨 주세요.' }; report(); return false;
        }
      }
      if (state.folderNotice) state = { ...state, folderNotice: undefined };
      const lines = linkOnly ? { folderLink: [lineIndex] } : { folderDeclare: [lineIndex] };
      const check = M.editTextResult(state.working, docId, state.raw, { folderText: true, ...lines });
      if (check.reason === null && check.state === state.working) return false;
      const changed = api.updateRaw(state.raw, '', { inputType: 'folderDeclare', ...lines });
      if (changed && picker && unbound) {
        const linked = state.working.bindings.find(row => row.docId === docId && row.lineId === lineId && row.kind === 'scope');
        if (linked?.kind !== 'scope') { api.restoreState(previous); return false; }
        // The declaration port supplies its validated new/existing folder ID.
        // Reuse explicit selection admission for the original unbound head's
        // children; every other normalized field stays as declared.
        const base = { ...state.working, bindings: state.working.bindings.filter(row => !(row.docId === docId && row.lineId === lineId)) };
        const placed = planFolderPickerLink(base, docId, lineId!, linked.scopeId);
        if (placed.problem || !validateWorkspace(placed.state)) { api.restoreState(previous); return false; }
        const working = documentInput?.install(placed.state) ?? placed.state;
        inputGeneration++; state = { ...state, working, raw: M.raw(M.getDocument(working, docId)) }; recordFolder(previous.working, working); report();
      }
      return changed;
    },
    /** D3 B (W15): a linked folder line finished with Enter. Its folder is renamed when only this document uses
     * it; otherwise the line, with its tasks, moves to the folder of its new name in the same place, made if
     * missing. A refusal (two folders of that name there, a subfolder line under it, the folder limit) changes
     * nothing and says why; the caller then puts the name back. */
    moveFolderLine(lineIndex: number): { ok: true; renamed: boolean; fromId: string; toId: string; before: TextWorkspaceState } | { ok: false; reason: string | null } {
      if (state.invalid) return { ok: false, reason: null };
      const line = M.getDocument(state.working, docId)?.lines[lineIndex];
      const binding = line && state.working.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
      if (!line || !binding || binding.kind !== 'scope') return { ok: false, reason: null };
      const check = M.editTextResult(state.working, docId, state.raw, { folderText: true, folderMove: [lineIndex] });
      if (check.reason !== null || !check.folderMoved) return { ok: false, reason: check.folderProblem ?? check.reason };
      // N7: a rename is for a folder this document alone uses; a use the host's newest workspace has and the draft does
      // not (another tab's, new) refuses it. Uses the draft knows keep W15's judgement (review 5).
      const latest = latestWorkspace();
      if (check.folderMoved.renamed && latest && programFolderNewUsesElsewhere(state.working, latest, docId, binding.scopeId)) return { ok: false, reason: 'used-elsewhere' };
      const before = state.working;
      if (state.folderNotice) state = { ...state, folderNotice: undefined };
      if (!api.updateRaw(state.raw, '', { inputType: 'folderMove', folderMove: [lineIndex] })) return { ok: false, reason: null };
      const after = state.working.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
      const toId = after && after.kind === 'scope' ? after.scopeId : binding.scopeId;
      return { ok: true, renamed: toId === binding.scopeId, fromId: binding.scopeId, toId, before };
    },
    /** N1: a linked folder line whose name was typed or pasted over is finished by putting that one line's
     * text back to its folder's name. Nothing is renamed or moved; the status row names the typed name. */
    restoreFolderLineName(lineIndex: number) { return api.restoreFolderLineNames([lineIndex]); },
    /** The same for several lines at once (a paste that renamed more than one), in one edit; only those lines change. */
    restoreFolderLineNames(lineIndexes: number[], boxed = false) {
      if (state.invalid) return false;
      const lines = M.getDocument(state.working, docId)?.lines ?? [], raws = state.raw.split('\n'), typed: string[] = [], kept: string[] = [];
      let unfiled = false;
      for (const index of lineIndexes) {
        const line = lines[index];
        const binding = line && state.working.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
        const folder = binding && binding.kind === 'scope' ? state.working.folders.find(entry => entry.id === binding.scopeId) : undefined;
        if (!line || !folder || raws[index] !== line.text || !/^ *- \//.test(line.text)) continue;
        const name = line.text.replace(/^ *- \//, '').trim();
        if (name === folder.title) continue;
        raws[index] = /^ */.exec(line.text)![0] + '- /' + folder.title; typed.push(`‘${name}’`); kept.push(folder.title);
        // 미분류 cannot be renamed in 분류 either.
        if (folder.id === 'folder-unfiled') unfiled = true;
      }
      if (!typed.length || !api.updateRaw(raws.join('\n'), '', { inputType: 'folderRestore' })) return false;
      state = { ...state, folderNotice: unfiled ? `미분류 폴더의 이름은 바꿀 수 없습니다(입력: ${typed.join(', ')})`
        // W15 (D12): the 4th edition words; a name changes only when its line is finished with Enter.
        // N7 review 4: boxed, the typed names were also kept in the 복구함, and the words say so.
        : `폴더 이름은 Enter로 마칠 때만 바뀝니다 · ${kept.length === 1 ? `‘${kept[0]}’${ro(kept[0])}` : '원래 이름으로'} 두었습니다${boxed ? `. 입력(${typed.join(', ')})은 복구함에 보관했습니다` : `(입력: ${typed.join(', ')})`}` }; report(); return true;
    },
    canUndoFolderMove: () => !!lastMove && !state.invalid && state.working === lastMove.after,
    /** Compatibility port for existing picker callers; W18 uses the same selective forward inverse. */
    undoFolderMove() {
      if (!api.canUndoFolderMove() || !folderOperation) return false;
      return api.undoFolderOperation(folderOperation.id).ok;
    },
    apply(next: TextWorkspaceState, nextLabel: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule'], picker?: { lineId: string; scopeId: string }, folderBefore?: TextWorkspaceState) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      const before = state.working;
      const linked = picker && planFolderPickerLink(before, docId, picker.lineId, picker.scopeId);
      if (picker && (!linked || linked.problem || !programSame(linked.state, next))) return false;
      inputGeneration++;
      const working=documentInput?.install(next)??next;
      lastMove = picker && linked?.moved ? { before, after: working, lineIds: [picker.lineId] } : null;
      state = { ...state, working, raw: M.raw(M.getDocument(working, docId)), dirty: true, error: '', progressConflict: undefined };
      folderEnter = null; recordFolder(folderBefore ?? before, working);
      label = nextLabel; groupId = undefined; privateTaskSchedule = schedule; report(); return true;
    },
    /** W15 review P1-4: the screen refused the text of a change just made (apply, a folder move or its undo), so
     *  put back the state from right before it; the model and the screen agree again and nothing is saved. */
    restoreState(previous: ProgramTextDraftState) {
      if (state.saving || previous.saving) return false;
      inputGeneration++; prepared = null; privateTaskSchedule = undefined;
      folderOperation = null; folderEnter = null;
      const working = documentInput?.install(previous.working) ?? previous.working;
      state = { ...previous, working }; report(); return true;
    },
    synchronize(next: TextWorkspaceState) {
      if (state.dirty || state.saving || state.committed === next || programSame(state.committed, next)) return false;
      if(documentInput&&(!M.validate(next)||!validateWorkspace(next)))return false;
      const working=documentInput?.install(next)??next;
      folderOperation = null; folderEnter = null;
      state = { ...state, committed: working, working, raw: M.raw(M.getDocument(working, docId)), error: '', progressConflict: undefined };
      report(); return true;
    },
    acceptConfirmedSave(before: TextWorkspaceState, next: TextWorkspaceState, ack?:OwnedWritingAck) {
      const attempt = submitted;
      if(ack){
        const started=performance.now();
        try{
          // Every valid input entered the private immutable owner and its host
          // preservation guard. This exact receipt cannot acknowledge a newer raw.
          if(!attempt||!state.saving||!state.dirty||state.invalid||!documentInput?.rows(state.working)
            ||state.committed!==attempt.before||before!==attempt.before||next!==attempt.next
            ||!consumeOwnedWritingAck(ack,{documentId:docId,generation:attempt.generation,expected:attempt.before,next:attempt.next},inputGeneration))return false;
          state={...state,committed:attempt.next};report();return true;
        }finally{noteWritingPhase('ack-draft-accept',started,ack.identity);}
      }
      if (!attempt || !state.dirty || state.invalid) return false;
      // Any unconfirmed attempt from this base may be the one the server applied, the latest first; each is
      // judged exactly, then as merged onto the host's newer base.
      const attempts = [attempt, ...unconfirmed.slice().reverse()];
      const proven = programSame(state.committed, before) ? attempts.find(entry => programSame(entry.before, before) && programSame(entry.next, next)) : undefined;
      if (!proven) return attempts.some(entry => acceptMergedSave(entry, before, next));
      const unchangedInput = inputGeneration === proven.generation && programSame(state.working, next)
        && state.raw === M.raw(M.getDocument(next, docId));
      if (!state.saving && unchangedInput) {
        const working=documentInput?.install(next)??next;
        // An exact late receipt can install a fresh immutable owner for the
        // unchanged move. It is not a later edit and must not consume its undo.
        if (lastMove?.after === state.working && programSame(state.working, working)) lastMove = { ...lastMove, after: working };
        state = { ...state, committed: working, working, dirty: false, error: '', progressConflict: undefined };
        submitted = null; unconfirmed = []; report(); return true;
      }
      if ((!unchangedInput && inputGeneration <= proven.generation)
        || !M.validate(next) || !M.validate(state.working)
        || !validateWorkspace(next) || !validateWorkspace(state.working)
        || !M.getDocument(next, docId) || !M.getDocument(state.working, docId)
        || state.raw !== M.raw(M.getDocument(state.working, docId))) return false;
      // The shell proved this exact submitted receipt, not the latest input.
      // Preserve its live flight and all newer working/raw/identity/dirty state.
      // true means the receipt was consumed; callers must still check pending input.
      // A retry refused while this result was unknown left its error; the newer input is saved next.
      state = { ...state, committed: next, error: '' }; unconfirmed = [];
      report(); return true;
    },
    discard(next: TextWorkspaceState) {
      if (state.saving) return false;
      if(documentInput&&(!M.validate(next)||!validateWorkspace(next)))return false;
      privateTaskSchedule = undefined;
      submitted = null; unconfirmed = []; inputGeneration++;
      folderOperation = null; folderEnter = null;
      const working=documentInput?.install(next)??next;
      state = { committed: working, working, raw: M.raw(M.getDocument(working, docId)), dirty: false, saving: false, invalid: false, error: '' };
      report(); return true;
    },
    save(): Promise<boolean> {
      if (flight) return flight;
      if (state.invalid) return Promise.resolve(false);
      if (!state.dirty) return Promise.resolve(true);
      flight = (async () => {
        while (state.dirty && !state.invalid) {
          if(documentInput&&!(backgroundSave ? !!documentInput.rows(state.working)&&validateWorkspace(state.working) : api.flush()))return false;
          const next = state.working, submittedRaw = M.raw(M.getDocument(next, docId));
          const before = state.committed, schedule = privateTaskSchedule;
          const oldIds = new Set([...before.documents, ...before.flows].flatMap(doc => doc.lines.map(line => line.id)));
          const insertedProperty = schedule && [...next.documents, ...next.flows].some(doc => doc.lines.some(line => !oldIds.has(line.id)));
          let confirmation: Promise<TextWorkspaceState | null> | undefined;
          const prior = submitted, priorUnconfirmed = unconfirmed;
          unconfirmed = submitted && programSame(submitted.before, state.committed) ? [...unconfirmed, submitted] : [];
          submitted = { before: state.committed, next, generation: inputGeneration,
            // Structural/schedule/generated-ID confirmations keep their original hold.
            allowBasicChecks:backgroundSave&&!!documentInput&&!schedule&&groupId===`text:${docId}` };
          state = { ...state, saving: true, error: '', progressConflict: undefined }; report();
          let accepted = false, notSent = false;
          try { accepted = await commit(next, label, { groupId, expectedWorkspace: state.committed,writingGeneration:inputGeneration, onNotSent: () => { notSent = true; },
            ...(schedule ? { privateTaskSchedule: schedule } : {}),
            ...(insertedProperty ? { onPrivateTaskScheduleAcknowledged: (pending: Promise<TextWorkspaceState | null>) => { confirmation = pending; } } : {}) }); } catch { accepted = false; }
          if (!accepted) {
            // Refused before sending: the attempts that may have reached the server stay as they were.
            if (notSent) { submitted = prior; unconfirmed = priorUnconfirmed; }
            state = { ...state, saving: false, dirty: true, error: '저장하지 못했습니다. 입력은 남아 있습니다. 다시 저장해 주세요.' };
            report(); return false;
          }
          let committed = next, working = state.working;
          if (confirmation) {
            const authoritative = await confirmation.catch(() => null);
            const comparable = programClone(next);
            const identities = new Map<string, string>();
            let valid = !!authoritative && M.validate(authoritative);
            for (const doc of [...comparable.documents, ...comparable.flows]) {
              const incoming = authoritative && M.getDocument(authoritative, doc.id);
              if (!incoming) { valid = false; break; }
              for (const [index, line] of doc.lines.entries()) if (!oldIds.has(line.id)) {
                const replacement = incoming.lines[index];
                if (!replacement || oldIds.has(replacement.id)) { valid = false; break; }
                identities.set(line.id, replacement.id); line.id = replacement.id;
              }
            }
            if (!valid || !programSame(comparable, authoritative)) {
              state = { ...state, saving: false, dirty: true, error: '저장된 일정의 문맥을 확인하지 못했습니다. 입력은 남아 있습니다.' };
              submitted = null; report(); return false;
            }
            // Change identities only. Newer raw text, selection and its dirty state remain owned by the editor.
            working = programClone(state.working);
            for (const doc of [...working.documents, ...working.flows]) for (const line of doc.lines) line.id = identities.get(line.id) ?? line.id;
            if (!M.validate(working) || M.raw(M.getDocument(working, docId)) !== state.raw) {
              state = { ...state, saving: false, dirty: true, error: '입력을 안전하게 연결하지 못했습니다. 입력은 남아 있습니다.' };
              submitted = null; report(); return false;
            }
            committed = authoritative!;
          }
          const unchanged = state.working === next && state.raw === submittedRaw;
          working=documentInput?.install(working)??working;
          submitted = null; unconfirmed = [];
          state = { ...state, committed, working, saving: false, dirty: !unchanged };
          report();
        }
        return !state.dirty;
      })().finally(() => { flight = null; });
      return flight;
    },
  };
  return api;
}
