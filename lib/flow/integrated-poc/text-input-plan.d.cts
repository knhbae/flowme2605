// Types for the native editor's input plans (text-input-plan.cjs) that TypeScript modules use directly.
export type InputPlanSelection = { start: number; end: number; direction?: 'forward' | 'backward' | 'none' };
export type IndentPlan = { start: number; end: number; text: string; nextRaw: string; selectionAfter: InputPlanSelection; startLine: number; endLine: number; outdent: boolean };
export function planIndent(raw: string, selection: InputPlanSelection, metadata: unknown, outdent: boolean, fenced?: boolean[], lease?: unknown, epoch?: number): IndentPlan | null;
declare const plans: { planIndent: typeof planIndent; [name: string]: unknown };
export default plans;
