import type { TextEditorRowMeta, TextMoveSelection, TextMoveTarget, TextTaskSplitIntent } from '../text-workspace';
import type { FolderIndentPlan } from '../folder-operation';

declare namespace editor {
  interface Selection {
    start: number; end: number; direction: 'forward' | 'backward' | 'none';
    selectionStart: number; selectionEnd: number; lineIndex: number;
  }
  interface Action {
    type: string; kind: string; lineIndex: number; lineText: string; value: string;
    selection: Selection; selectionStart: number; selectionEnd: number;
    beforeLineId?: string | null; depth?: number;
  }
  interface InputIntent {
    kind: 'replace' | 'enter' | 'indent'; start: number; end: number; text: string;
    selectionBefore: { start: number; end: number; direction: Selection['direction'] };
    selectionAfter: { start: number; end: number; direction: Selection['direction'] };
    outdent?: boolean; startLine?: number; endLine?: number; taskSplit?: TextTaskSplitIntent;
  }
  interface Options {
    value?: string; label?: string; controls?: boolean; taskSplitEnabled?: boolean;
    /** Display the actual full-writer action; the handler rechecks write authority. */
    getCheckAction?: (lineIndex: number, meta: TextEditorRowMeta) => 'toggle' | 'progress-open' | 'reference-open';
    getRowMeta?: () => TextEditorRowMeta[] | Record<number, TextEditorRowMeta>;
    /** typelag ② (11/11): draw again and measure only the rows a render changed. Off when absent (every row, as r3). */
    rowPatch?: boolean;
    isActionDisabled?: () => boolean;
    /** W12: show the muted '/ 메뉴' or '/ 폴더' hint on an empty line after a 0.4s pause. Off when absent. */
    lineHints?: () => boolean;
    /** The row metadata may not match the text, so progress marks stay RAW. Defaults to isActionDisabled. */
    isPaintDisabled?: () => boolean;
    /** ⇤·⇥ (indent and Tab) may run while other actions wait. Defaults to isActionDisabled. */
    isIndentDisabled?: () => boolean;
    /** Compatibility alias: true turns lineBreakEnter and plusOpensAuthoring on and typingPickers off. */
    explicitAddOnly?:()=>boolean;
    /** Enter inserts one plain line break instead of the list continuation rules. */
    lineBreakEnter?:()=>boolean;
    /** Typing "- " or "- [ ] " at a line end opens the scope or task picker. */
    typingPickers?:()=>boolean;
    /** The row ＋ opens the writing insert menu instead of the default insert action. */
    plusOpensAuthoring?:()=>boolean;
    /** List Enter v2: date header and folder lines end with a plain line; Shift+Enter at a task's end opens its memo line. */
    listEnterV2?:()=>boolean;
    /** memo-enter (11/10): a plain Enter at a memo line's end continued the memo (the host may say how to leave it). */
    onMemoContinue?:()=>void;
    /** memo-enter (11/10): Enter on an empty memo line left the memo. */
    onMemoExit?:()=>void;
    getAddAnchor?:(lineIndex:number)=>{parentIndex:number;bottomIndex:number}|null;
    /** Separate direct-check admission; structural actions retain the common hold. */
    isCheckDisabled?: (lineIndex?: number) => boolean;
    canApplyIndent?: (value: string, details: { outdent: boolean; startLine: number; endLine: number }) => boolean;
    /** A narrow host proof can adjust a just-created folder's captured automatic blank. */
    adjustIndentPlan?: (plan: FolderIndentPlan) => FolderIndentPlan | null;
    onIndentStart?: (plan: FolderIndentPlan) => void;
    /** Always cleared synchronously after the native command, including failures. */
    onIndentEnd?: () => void;
    canApplyInput?: (value: string, intent: InputIntent) => boolean;
    canApplyTaskSplit?: (value: string, intent: InputIntent) => boolean;
    onInputRejected?: (intent: InputIntent) => void;
    /** A real Enter, past the IME and modifier guards, runs this before the row is read. */
    beforeEnter?: () => void;
    onChange?: (value: string, input?: { inputType: string; inputSplice?: { start: number; end: number; text: string }; taskSplit?: TextTaskSplitIntent }) => void;
    onAction?: (action: Action) => unknown;
  }
  interface Instance {
    getValue(): string;
    getText(): string;
    getSelection(): Selection;
    /** Read caret/name-start viewport geometry without changing input or layout. */
    caretRect(offset?: number): { left: number; top: number; right: number; bottom: number; width: number; height: number } | null;
    /** selection: an explicit caret for the new value (it wins over preserveSelection). */
    setValue(value: string, settings?: { preserveSelection?: boolean; selection?: { start: number; end: number; direction?: Selection['direction'] } }): boolean;
    setText(value: string, settings?: { preserveSelection?: boolean }): boolean;
    focus(lineIndex?: number): boolean;
    focusControl(lineIndex: number): boolean;
    insert(text: string): boolean;
    replaceRange(start: number, end: number, text: string, settings?: {
      preserveSelection?: boolean;
      selectionAfter?: { start: number; end: number; direction?: Selection['direction'] };
    }): boolean;
    indent(outdent?: boolean): boolean;
    /** Run the Enter key handler as a real Enter/Shift+Enter would; false while composing or read-only. */
    enter(shift?: boolean): boolean;
    setMoveState(value: (TextMoveSelection & { targets: TextMoveTarget[] }) | null): boolean;
    focusMoveTarget(ordinal: number): boolean;
    prepareAction(lineIndex: number): boolean;
    prepareMove(lineIndex: number): boolean;
    toggleFold(lineIndex: number): boolean;
    isFolded(lineIndex: number): boolean;
    unfoldAll(): void;
    undo(): boolean;
    refresh(): void;
    refreshViewport(): void;
    setMode(mode: 'live' | 'text'): void;
    destroy(): void;
  }
  function create(container: HTMLElement, options?: Options): Readonly<Instance>;
}
export = editor;
