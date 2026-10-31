import {consumeOwnedWritingAck,noteWritingPhase,type OwnedWritingAck} from './writing-ack';
import type {ProgramDocumentInput} from './program-document-input';
import { ro } from './folder-notice';
import { planFolderPickerLink } from './folder-picker';
import { textWorkspaceModel as M, type TextInputSplice, type TextTaskSplitIntent, type TextProgressCheckConflict, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { programClone } from './contract';
import { mergeProgramTextWorkspace } from './text-merge';
import type { ProgramPrivateMutationObserver } from './ui-contract';

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
      submitted = null; unconfirmed = []; report(); return true;
    }
    if (inputGeneration <= attempt.generation) return false;
    const moved = mergeProgramTextWorkspace(attempt.next, state.working, next);
    if (!moved || !validateWorkspace(moved) || !M.getDocument(moved, docId) || M.raw(M.getDocument(moved, docId)) !== state.raw) return false;
    const working = documentInput?.install(moved) ?? moved;
    state = { ...state, committed: next, working, error: '', progressConflict: undefined };
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
  let prepared: {state:ProgramTextDraftState;raw:string;signature:string;ownerRevision:number|undefined;context:unknown;value:ReturnType<typeof deriveRaw>}|null=null;
  const basicCheckReady=()=>!state.invalid&&(!state.saving||submitted?.allowBasicChecks===true);
  const api = {
    canCheck:(lineId:string,date:string)=>basicCheckReady()&&!!documentInput?.canPrepareCheck(state.working,lineId,date),
    generation:()=>inputGeneration,
    canApplyLocal:()=>!!documentInput&&basicCheckReady(),
    applyLocal(next:TextWorkspaceState,nextLabel:string){
      if(!documentInput||!basicCheckReady()||next===state.working||!M.validate(next)||!validateWorkspace(next))return false;
      inputGeneration++;prepared=null;privateTaskSchedule=undefined;
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
      inputGeneration++;
      state = { ...state, raw, invalid: true, dirty: true, progressConflict: undefined, problemLine: undefined, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
    },
    updateRaw(raw: string, progressDate = '', input?: Input) {
      privateTaskSchedule = undefined;
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
        inputGeneration++; state = { ...state, working, raw: M.raw(M.getDocument(working, docId)) }; report();
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
    restoreFolderLineNames(lineIndexes: number[]) {
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
        : `폴더 이름은 Enter로 마칠 때만 바뀝니다 · ${kept.length === 1 ? `‘${kept[0]}’${ro(kept[0])}` : '원래 이름으로'} 두었습니다(입력: ${typed.join(', ')})` }; report(); return true;
    },
    canUndoFolderMove: () => !!lastMove && !state.invalid && state.working === lastMove.after,
    /** One undo right after a folder line moved: the state before the move, with that line's name back. Only the
     *  moved line changes; another line typed over and left keeps its text (W15 review P1-1, D3 B F4). */
    undoFolderMove() {
      if (!api.canUndoFolderMove()) return false;
      const { before, lineIds } = lastMove!; lastMove = null;
      const doc = M.getDocument(before, docId); if (!doc) return false;
      const raw = doc.lines.map(line => {
        if (!lineIds.includes(line.id)) return line.text;
        const binding = before.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
        const folder = binding && binding.kind === 'scope' ? before.folders.find(entry => entry.id === binding.scopeId) : undefined;
        return folder && /^ *- \//.test(line.text) ? /^ */.exec(line.text)![0] + '- /' + folder.title : line.text;
      }).join('\n');
      const restored = M.editTextResult(before, docId, raw, { folderText: true });
      if (restored.reason !== null || !validateWorkspace(restored.state)) return false;
      inputGeneration++; prepared = null; privateTaskSchedule = undefined;
      const working = documentInput?.install(restored.state) ?? restored.state;
      state = { ...state, working, raw: M.raw(M.getDocument(working, docId)), dirty: true, invalid: false, error: '',
        progressConflict: undefined, problemLine: undefined, folderNotice: '폴더 옮김을 되돌렸습니다' };
      label = '폴더 옮김 되돌리기'; groupId = `text:${docId}`; report(); return true;
    },
    apply(next: TextWorkspaceState, nextLabel: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule'], picker?: { lineId: string; scopeId: string }) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      const before = state.working;
      const linked = picker && planFolderPickerLink(before, docId, picker.lineId, picker.scopeId);
      if (picker && (!linked || linked.problem || !programSame(linked.state, next))) return false;
      inputGeneration++;
      const working=documentInput?.install(next)??next;
      lastMove = picker && linked?.moved ? { before, after: working, lineIds: [picker.lineId] } : null;
      state = { ...state, working, raw: M.raw(M.getDocument(working, docId)), dirty: true, error: '', progressConflict: undefined };
      label = nextLabel; groupId = undefined; privateTaskSchedule = schedule; report(); return true;
    },
    /** W15 review P1-4: the screen refused the text of a change just made (apply, a folder move or its undo), so
     *  put back the state from right before it; the model and the screen agree again and nothing is saved. */
    restoreState(previous: ProgramTextDraftState) {
      if (state.saving || previous.saving) return false;
      inputGeneration++; prepared = null; privateTaskSchedule = undefined;
      const working = documentInput?.install(previous.working) ?? previous.working;
      state = { ...previous, working }; report(); return true;
    },
    synchronize(next: TextWorkspaceState) {
      if (state.dirty || state.saving || state.committed === next || programSame(state.committed, next)) return false;
      if(documentInput&&(!M.validate(next)||!validateWorkspace(next)))return false;
      const working=documentInput?.install(next)??next;
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
