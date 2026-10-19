import { textWorkspaceModel as M, type TextInputSplice, type TextProgressCheckConflict, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { programClone } from './contract';

export type ProgramTextCommitOptions = {
  groupId?: string;
  expectedWorkspace?: TextWorkspaceState;
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
) {
  let state: ProgramTextDraftState = { committed: workspace, working: workspace, raw: M.raw(M.getDocument(workspace, docId)), dirty: false, saving: false, invalid: false, error: '' };
  let flight: Promise<boolean> | null = null;
  let label = '문서 편집';
  let groupId: string | undefined;
  let privateTaskSchedule: ProgramTextCommitOptions['privateTaskSchedule'];
  let inputGeneration = 0;
  let submitted: { before: TextWorkspaceState; next: TextWorkspaceState; generation: number } | null = null;
  const pasteHistory: { before: TextWorkspaceState; after: TextWorkspaceState }[] = [];
  const report = () => notify({ ...state });
  const api = {
    getState: () => state,
    rejectRaw(raw: string) {
      privateTaskSchedule = undefined;
      inputGeneration++;
      state = { ...state, raw, invalid: true, dirty: true, progressConflict: undefined, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
    },
    updateRaw(raw: string, progressDate = '', input?: { inputType: string; inputSplice?: TextInputSplice }) {
      privateTaskSchedule = undefined;
      inputGeneration++;
      const baseRaw = M.raw(M.getDocument(state.committed, docId));
      const before = state.working;
      const committedLines = M.getDocument(state.committed, docId)?.lines ?? [];
      const canRestoreCommitted = raw === baseRaw && programSame({ ...before,
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
      // Genuine native history may restore a paste snapshot only while its whole
      // workspace still matches. Never overwrite newer records or another edit.
      const edit: ReturnType<typeof M.editTextResult> = history
        ? programSame(before, historyFrom) ? { state: historyTo!, reason: null } : { state: before, reason: 'identity-ambiguous' }
        : canRestoreCommitted ? { state: state.committed, reason: null }
          : M.editTextResult(before, docId, raw, { folderText: true, ...(input?.inputSplice ? { inputSplice: input.inputSplice } : {}) });
      const next = edit.state;
      const acceptedRaw = edit.normalizedText ?? raw;
      const folderError = edit.folderProblem ? ({
        'name-conflict': '같은 위치에 이름이 겹치는 폴더가 있습니다. 다른 이름을 입력해 주세요. 입력은 남아 있습니다.',
        'unknown-id': '현재 작업 공간에 없는 폴더 연결입니다. 연결 정보를 지우고 폴더 이름만 입력해 주세요. 입력은 남아 있습니다.',
        'identity-mismatch': 'TXT의 폴더 연결이 현재 폴더와 맞지 않습니다. 변경한 연결 정보를 되돌려 주세요. 입력은 남아 있습니다.',
        'invalid-parent': '하위 폴더의 들여쓰기와 상위 폴더를 확인해 주세요. 입력은 남아 있습니다.',
      } as Record<string, string>)[edit.folderProblem] ?? '폴더 이름과 연결 정보를 확인해 주세요. 입력은 남아 있습니다.' : '';
      const protectedChange = !validateWorkspace(next);
      const invalid = protectedChange || M.raw(M.getDocument(next, docId)) !== acceptedRaw;
      if (!invalid && input?.inputSplice && next !== before) pasteHistory.push({ before, after: next });
      state = { ...state, raw: invalid ? raw : acceptedRaw, working: invalid ? state.working : next, invalid,
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
    apply(next: TextWorkspaceState, nextLabel: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule']) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      inputGeneration++;
      state = { ...state, working: next, raw: M.raw(M.getDocument(next, docId)), dirty: true, error: '', progressConflict: undefined };
      label = nextLabel; groupId = undefined; privateTaskSchedule = schedule; report(); return true;
    },
    synchronize(next: TextWorkspaceState) {
      if (state.dirty || state.saving || state.committed === next || programSame(state.committed, next)) return false;
      state = { ...state, committed: next, working: next, raw: M.raw(M.getDocument(next, docId)), error: '', progressConflict: undefined };
      report(); return true;
    },
    acceptConfirmedSave(before: TextWorkspaceState, next: TextWorkspaceState) {
      const attempt = submitted;
      if (!attempt || !state.dirty || state.invalid || !programSame(state.committed, before)
        || !programSame(attempt.before, before) || !programSame(attempt.next, next)) return false;
      const unchangedInput = inputGeneration === attempt.generation && programSame(state.working, next)
        && state.raw === M.raw(M.getDocument(next, docId));
      if (!state.saving && unchangedInput) {
        state = { ...state, committed: next, working: next, dirty: false, error: '', progressConflict: undefined };
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
      privateTaskSchedule = undefined;
      submitted = null; inputGeneration++;
      state = { committed: next, working: next, raw: M.raw(M.getDocument(next, docId)), dirty: false, saving: false, invalid: false, error: '' };
      report(); return true;
    },
    save(): Promise<boolean> {
      if (flight) return flight;
      if (state.invalid) return Promise.resolve(false);
      if (!state.dirty) return Promise.resolve(true);
      flight = (async () => {
        while (state.dirty && !state.invalid) {
          const next = state.working, submittedRaw = M.raw(M.getDocument(next, docId));
          const before = state.committed, schedule = privateTaskSchedule;
          const oldIds = new Set([...before.documents, ...before.flows].flatMap(doc => doc.lines.map(line => line.id)));
          const insertedProperty = schedule && [...next.documents, ...next.flows].some(doc => doc.lines.some(line => !oldIds.has(line.id)));
          let confirmation: Promise<TextWorkspaceState | null> | undefined;
          submitted = { before: state.committed, next, generation: inputGeneration };
          state = { ...state, saving: true, error: '', progressConflict: undefined }; report();
          let accepted = false;
          try { accepted = await commit(next, label, { groupId, expectedWorkspace: state.committed,
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
