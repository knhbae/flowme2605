import type { TextEditorRowMeta, TextMoveSelection, TextMoveTarget } from '../text-workspace';

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
    outdent?: boolean; startLine?: number; endLine?: number;
  }
  interface Options {
    value?: string; label?: string; controls?: boolean;
    getRowMeta?: () => TextEditorRowMeta[] | Record<number, TextEditorRowMeta>;
    isActionDisabled?: () => boolean;
    canApplyIndent?: (value: string, details: { outdent: boolean; startLine: number; endLine: number }) => boolean;
    canApplyInput?: (value: string, intent: InputIntent) => boolean;
    onInputRejected?: (intent: InputIntent) => void;
    onChange?: (value: string, input?: { inputType: string; inputSplice?: { start: number; end: number; text: string } }) => void;
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
