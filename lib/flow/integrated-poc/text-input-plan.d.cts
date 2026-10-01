declare namespace plans {
  interface Selection { start: number; end: number; direction?: 'forward' | 'backward' | 'none' }
  interface Replacement { start: number; end: number; text: string; nextRaw: string; selectionAfter: Selection }
  interface IndentPlan extends Replacement { startLine: number; endLine: number; outdent: boolean }
  interface IndentLease { raw: string; selection: Selection; startLine: number; endLine: number; outdent: boolean; epoch: number }
  interface Row { kind?: string; subtreeEndIndex?: number }
  function planMemoEnter(raw: string, selection: Selection, meta?: Row | null): Replacement | null;
  function planTaskEnter(raw: string, selection: Selection, meta?: Row | null): Replacement | null;
  function planIndent(raw: string, selection: Selection, metadata: Row[] | Record<number, Row>, outdent: boolean,
    fenced?: boolean[], lease?: IndentLease | null, epoch?: number): IndentPlan | null;
  function indentLease(plan: IndentPlan, epoch: number): IndentLease;
}
export = plans;
