import type { WritingBarAction } from './writing-bar';

// S5 (real accounts, 10/31): → on the writing bar did nothing and said nothing. A press held for a save was dropped
// by the next keystroke, and a refused indent was ignored. Every way a bar press ends without acting says why.

const NAME: Record<WritingBarAction, string> = { indent: '들여쓰기', outdent: '내어쓰기', task: '할 일 표시', enter: '메모 줄 추가', menu: '추가 메뉴' };
const head = (action: WritingBarAction) => `${NAME[action]}를 하지 않았습니다.`;

/** Why a held press was let go before it ran. */
export type ProgramBarDrop = 'typed' | 'left' | 'moved' | 'locked' | 'expired';
export function programBarDropNotice(action: WritingBarAction, why: ProgramBarDrop): string {
  return `${head(action)} ${{
    typed: '누른 뒤 글자가 더 입력됐습니다. 다시 눌러 주세요.',
    left: '커서가 편집 칸을 벗어났습니다. 다시 눌러 주세요.',
    moved: '누른 뒤 커서나 줄이 바뀌었습니다. 원하는 줄에서 다시 눌러 주세요.',
    locked: '지금은 이 문서를 고칠 수 없습니다.',
    expired: '편집 칸이 준비되지 않았습니다. 다시 눌러 주세요.',
  }[why]}`;
}

/** Why ⇤·⇥ was refused when it ran: the editor's state, the line's own shape (the native plan), or the model.
 *  'folder' and 'protected' already said why (a linked folder line; a protection rule such as a recurring item's
 *  source line), so the bar adds nothing. A refusal with no known cause is 'unknown', never a shape guess. */
export type ProgramIndentShape = 'tab' | 'odd' | 'fence' | 'deepest' | 'none' | 'unknown';
export type ProgramIndentRefusal =
  | { kind: 'busy'; why: 'locked' | 'checking' | 'invalid' }
  | { kind: 'shape'; why: ProgramIndentShape }
  | { kind: 'model'; reason: string | null }
  | { kind: 'folder' }
  | { kind: 'protected' };

const MAX_DEPTH = 32;
/** The native plan's line rules (text-input-plan planIndent) for the caret's line: a tab or an odd number of
 *  spaces before it, a line inside a ``` block, the deepest level, or nothing left to take out. */
export function programIndentShape(raw: string, caret: number, outdent: boolean): ProgramIndentShape {
  const lines = raw.split('\n'), index = raw.slice(0, Math.max(0, caret)).split('\n').length - 1, line = lines[index] ?? '';
  if (lines.slice(0, index + 1).filter(text => /^\s*```/.test(text)).length % 2 === 1) return 'fence';
  const prefix = /^[ \t]*/.exec(line)![0];
  if (prefix.includes('\t')) return 'tab';
  if (prefix.length % 2) return 'odd';
  if (outdent ? prefix.length < 2 : prefix.length / 2 >= MAX_DEPTH) return outdent ? 'none' : 'deepest';
  return 'unknown';
}

export function programIndentRefusalNotice(action: 'indent' | 'outdent', refusal: Exclude<ProgramIndentRefusal, { kind: 'folder' } | { kind: 'protected' }>): string {
  const reason = refusal.kind === 'busy' ? {
    locked: '지금은 이 문서를 고칠 수 없습니다.',
    checking: '앞의 체크를 반영하는 중입니다. 잠시 뒤 다시 눌러 주세요.',
    invalid: '위에 안내한 입력 문제를 먼저 풀어 주세요.',
  }[refusal.why] : refusal.kind === 'shape' ? {
    tab: '이 줄 앞에 탭 문자가 있습니다. 탭을 지우고 띄어쓰기로 맞춰 주세요.',
    odd: '이 줄 앞의 빈칸이 홀수입니다. 두 칸 단위로 맞춰 주세요.',
    fence: '코드 블록(```) 안의 줄은 바꾸지 않습니다.',
    deepest: '더 깊게 들일 수 없는 단계입니다.',
    none: '더 내어 쓸 칸이 없습니다.',
    unknown: '이 줄을 지금 옮기지 못했습니다.',
  }[refusal.why] : refusal.reason === 'invalid-format' ? '이렇게 옮기면 날짜·진행률·하위 구조가 맞지 않습니다.'
    : refusal.reason === 'identity-ambiguous' ? '옮긴 뒤 기존 항목과의 연결을 확인하지 못했습니다. 한 줄씩 옮겨 주세요.'
    : refusal.reason === 'progress-check-conflict' ? '옮기면 진행 기록과 체크 표시가 맞지 않게 됩니다.'
    : '이렇게 옮기면 문서 구조를 안전하게 저장할 수 없습니다.';
  return `${head(action)} ${reason}`;
}
