import type { TextEditorRowMeta, TextMoveSelection, TextMoveTarget, TextTaskSplitIntent } from '../text-workspace';

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
    isActionDisabled?: () => boolean;
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
    getAddAnchor?:(lineIndex:number)=>{parentIndex:number;bottomIndex:number}|null;
    /** Separate direct-check admission; structural actions retain the common hold. */
    isCheckDisabled?: (lineIndex?: number) => boolean;
    canApplyIndent?: (value: string, details: { outdent: boolean; startLine: number; endLine: number }) => boolean;
    canApplyInput?: (value: string, intent: InputIntent) => boolean;
    canApplyTaskSplit?: (value: string, intent: InputIntent) => boolean;
    onInputRejected?: (intent: InputIntent) => void;
    onChange?: (value: string, input?: { inputType: string; inputSplice?: { start: number; end: number; text: string }; taskSplit?: TextTaskSplitIntent }) => void;
    onAction?: (action: Action) => unknown;
  }
  interface Instance {
    getValue(): string;
    getText(): string;
    getSelection(): Selection;
    setValue(value: string, settings?: { preserveSelection?: boolean }): boolean;
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
