import {consumeOwnedWritingAck,noteWritingPhase,type OwnedWritingAck} from './writing-ack';
import type {ProgramDocumentInput} from './program-document-input';
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
}

/** Serializes draft commits while preserving newer typing and rejected raw input. */
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
  let submitted: { before: TextWorkspaceState; next: TextWorkspaceState; generation: number; allowBasicChecks: boolean } | null = null;
  const pasteHistory: { before: TextWorkspaceState; after: TextWorkspaceState }[] = [];
  const report = () => notify({ ...state });
  type Input = { inputType: string; inputSplice?: TextInputSplice; taskSplit?: TextTaskSplitIntent; compositionGeneration?: number; folderHold?: number[]; folderDeclare?: number[]; folderLink?: number[] };
  const signature=(input?:Input)=>JSON.stringify(input?{inputType:input.inputType,inputSplice:input.inputSplice,taskSplit:input.taskSplit,compositionGeneration:input.compositionGeneration,folderHold:input.folderHold,folderDeclare:input.folderDeclare,folderLink:input.folderLink}:null);
  /** A save whose reply was lost, confirmed later on a newer base: another device saved a different
   * document, the host took that as its base, and the submitted input was merged onto it per document.
   * Accept only when the confirmed text is exactly that merge of this submission; newer input moves
   * onto the confirmed text by the same merge. Anything else stays unconfirmed (and protected). */
  function acceptMergedSave(attempt: NonNullable<typeof submitted>, before: TextWorkspaceState, next: TextWorkspaceState) {
    if (state.saving || !programSame(state.committed, attempt.before) || programSame(attempt.before, before)) return false;
    const merged = mergeProgramTextWorkspace(attempt.before, attempt.next, before);
    if (!merged || !programSame(merged, next) || !M.validate(next) || !validateWorkspace(next) || !M.getDocument(next, docId)) return false;
    const unchangedInput = inputGeneration === attempt.generation && programSame(state.working, attempt.next)
      && state.raw === M.raw(M.getDocument(attempt.next, docId));
    if (unchangedInput) {
      const working = documentInput?.install(next) ?? next;
      state = { ...state, committed: working, working, raw: M.raw(M.getDocument(working, docId)), dirty: false, error: '', progressConflict: undefined };
      submitted = null; report(); return true;
    }
    if (inputGeneration <= attempt.generation) return false;
    const moved = mergeProgramTextWorkspace(attempt.next, state.working, next);
    if (!moved || !validateWorkspace(moved) || !M.getDocument(moved, docId) || M.raw(M.getDocument(moved, docId)) !== state.raw) return false;
    const working = documentInput?.install(moved) ?? moved;
    state = { ...state, committed: next, working, error: '', progressConflict: undefined };
    submitted = null; report(); return true;
  }
  function deriveRaw(raw:string,input?:Input){
      const baseRaw = M.raw(M.getDocument(state.committed, docId));
      const before = state.working;
      const committedLines = M.getDocument(state.committed, docId)?.lines ?? [];
      const canRestoreCommitted = !input?.folderDeclare && !input?.folderLink && raw === baseRaw && programSame({ ...before,
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
            ...(input?.folderHold ? { folderHold: input.folderHold } : {}), ...(input?.folderDeclare ? { folderDeclare: input.folderDeclare } : {}), ...(input?.folderLink ? { folderLink: input.folderLink } : {}) });
      return {baseRaw,before,proof,edit};
  }
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
      state = { ...state, raw, invalid: true, dirty: true, progressConflict: undefined, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
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
      const folderError = edit.folderProblem ? ({
        'name-conflict': '같은 위치에 이름이 겹치는 폴더가 있습니다. 다른 이름을 입력해 주세요. 입력은 남아 있습니다.',
        'unknown-id': '현재 작업 공간에 없는 폴더 연결입니다. 연결 정보를 지우고 폴더 이름만 입력해 주세요. 입력은 남아 있습니다.',
        'identity-mismatch': 'TXT의 폴더 연결이 현재 폴더와 맞지 않습니다. 변경한 연결 정보를 되돌려 주세요. 입력은 남아 있습니다.',
        'invalid-parent': '하위 폴더의 들여쓰기와 상위 폴더를 확인해 주세요. 입력은 남아 있습니다.',
      } as Record<string, string>)[edit.folderProblem] ?? '폴더 이름과 연결 정보를 확인해 주세요. 입력은 남아 있습니다.' : '';
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
        error: protectedChange ? '보관·휴지통·복구 문서나 반복 규칙·보류 항목의 원문 표시는 여기서 바꿀 수 없습니다. 해당 줄을 원래대로 되돌리면 일반 할 일과 메모를 계속 편집할 수 있습니다. 입력은 보관 중입니다.'
          : !invalid ? '' : folderError || (edit.reason === 'identity-ambiguous'
            ? '여러 줄의 변경을 기존 항목과 연결하지 못해 반영하지 않았습니다. 제목 수정과 줄 이동은 나누고, 여러 제목은 한 줄씩 수정해 저장해 주세요. 입력은 그대로 남아 있습니다.'
            : edit.reason === 'invalid-format'
              ? '날짜·진행률·들여쓰기 형식을 확인해 주세요. 입력은 그대로 남아 있습니다.'
              : edit.reason === 'progress-check-conflict'
                ? '진행 기록과 다른 체크 표시로 바꿀 수 없습니다. 체크 표시를 되돌린 뒤 ‘진행 조절’에서 변경해 주세요. 입력은 남아 있습니다.'
              : '입력을 안전하게 반영하지 못했습니다. 변경을 나눠서 다시 시도해 주세요. 입력은 그대로 남아 있습니다.') };
      label = '문서 편집'; groupId = `text:${docId}`; report();
      return !invalid;
    },
    /** A typed "- /name" line was kept as text (folderHold); judge it once now that it is finished.
     * linkOnly (left, not finished explicitly) links only a folder of exactly that name and makes nothing.
     * False when there is nothing to do, or when the judgement refused it (the error keeps the input). */
    declareFolderLine(lineIndex: number, linkOnly = false) {
      if (state.invalid) return false;
      const lines = linkOnly ? { folderLink: [lineIndex] } : { folderDeclare: [lineIndex] };
      const check = M.editTextResult(state.working, docId, state.raw, { folderText: true, ...lines });
      if (check.reason === null && check.state === state.working) return false;
      return api.updateRaw(state.raw, '', { inputType: 'folderDeclare', ...lines });
    },
    apply(next: TextWorkspaceState, nextLabel: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule']) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      inputGeneration++;
      const working=documentInput?.install(next)??next;
      state = { ...state, working, raw: M.raw(M.getDocument(working, docId)), dirty: true, error: '', progressConflict: undefined };
      label = nextLabel; groupId = undefined; privateTaskSchedule = schedule; report(); return true;
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
      if (!programSame(state.committed, before) || !programSame(attempt.before, before) || !programSame(attempt.next, next))
        return acceptMergedSave(attempt, before, next);
      const unchangedInput = inputGeneration === attempt.generation && programSame(state.working, next)
        && state.raw === M.raw(M.getDocument(next, docId));
      if (!state.saving && unchangedInput) {
        const working=documentInput?.install(next)??next;
        state = { ...state, committed: working, working, dirty: false, error: '', progressConflict: undefined };
        submitted = null; report(); return true;
      }
      if ((!unchangedInput && inputGeneration <= attempt.generation)
        || !M.validate(next) || !M.validate(state.working)
        || !validateWorkspace(next) || !validateWorkspace(state.working)
        || !M.getDocument(next, docId) || !M.getDocument(state.working, docId)
        || state.raw !== M.raw(M.getDocument(state.working, docId))) return false;
      // The shell proved this exact submitted receipt, not the latest input.
      // Preserve its live flight and all newer working/raw/identity/dirty state.
      // true means the receipt was consumed; callers must still check pending input.
      state = { ...state, committed: next };
      report(); return true;
    },
    discard(next: TextWorkspaceState) {
      if (state.saving) return false;
      if(documentInput&&(!M.validate(next)||!validateWorkspace(next)))return false;
      privateTaskSchedule = undefined;
      submitted = null; inputGeneration++;
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
          submitted = { before: state.committed, next, generation: inputGeneration,
            // Structural/schedule/generated-ID confirmations keep their original hold.
            allowBasicChecks:backgroundSave&&!!documentInput&&!schedule&&groupId===`text:${docId}` };
          state = { ...state, saving: true, error: '', progressConflict: undefined }; report();
          let accepted = false;
          try { accepted = await commit(next, label, { groupId, expectedWorkspace: state.committed,writingGeneration:inputGeneration,
            ...(schedule ? { privateTaskSchedule: schedule } : {}),
            ...(insertedProperty ? { onPrivateTaskScheduleAcknowledged: (pending: Promise<TextWorkspaceState | null>) => { confirmation = pending; } } : {}) }); } catch { accepted = false; }
          if (!accepted) {
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
          submitted = null;
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
