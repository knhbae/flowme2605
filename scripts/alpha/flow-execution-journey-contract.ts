/** Fail closed on a mistyped or incomplete QA matrix. No app/environment writes. */
import type { ProgramCopy } from '../../lib/flow/integrated-poc/contract';

/** Personal date overrides are mutable; every other copy byte stays checked. */
export function journeyCopySourceIdentity(copies: readonly ProgramCopy[]): ProgramCopy[] {
  return copies.map(copy => ({ ...copy, itemOverrides: Object.fromEntries(Object.entries(copy.itemOverrides)
    .map(([itemId, override]) => { const { date: _date, ...rest } = override; return [itemId, rest] as const; })
    .filter(([, rest]) => Object.keys(rest).length > 0)) }));
}
export const journeyCases = ['raw-first', 'native-direct-return', 'public-copy', 'native-save-rejection'] as const;
export const journeyViewports = [[390, 844], [375, 812], [844, 390], [1024, 768], [1440, 900]] as const;
export type JourneySelection = {
  cases: readonly (typeof journeyCases[number])[];
  viewports: readonly (readonly [number, number])[];
};
export function selectJourneyScenarios(input: { single?: string; selected?: string }): JourneySelection {
  if (input.single !== undefined && input.single !== '1') throw Error('journey-single-option-rejected');
  if (input.selected !== undefined && !journeyCases.some(value => value === input.selected)) throw Error('journey-case-option-rejected');
  return { cases: input.selected === undefined ? journeyCases : journeyCases.filter(value => value === input.selected),
    viewports: input.single === '1' ? [[1440, 900]] : journeyViewports };
}
export function assertJourneyMatrixComplete(selection: JourneySelection,
  results: readonly { name: string; width: number; height: number }[]): void {
  const key = (name: string, width: number, height: number) => `${name}:${width}x${height}`;
  const expected = selection.viewports.flatMap(([width, height]) => selection.cases.map(name => key(name, width, height)));
  const actual = results.map(row => key(row.name, row.width, row.height));
  if (!expected.length || actual.length !== expected.length || new Set(expected).size !== expected.length
    || new Set(actual).size !== actual.length || actual.some(value => !expected.includes(value))) throw Error('journey-matrix-incomplete');
}
