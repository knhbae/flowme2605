import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProgramSourcePaths } from './program-source-files.mjs';

export const DIAGNOSTIC_PREFIX = 'FLOWME_FAILURE_DIAGNOSTICS ';
export const MAX_FAILURE_DIAGNOSTICS = 128;
export const MAX_DIAGNOSTIC_BYTES = 65_536;
const schema = 'flowme-failure-diagnostics/1';
const classes = new Set(['assertion', 'timeout', 'hook', 'subtests', 'cancelled', 'aborted', 'test-code', 'runner', 'unknown']);
const countKeys = ['testExecutions', 'passed', 'failed', 'skipped', 'cancelled'];
const problems = new Set(['missing', 'invalid', 'missing-summary', 'transport-truncated', 'count-mismatch', 'unresolved']);
const own = (value, key) => {
  try { return value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined; }
  catch { return undefined; }
};
const integer = (value, min = 0, max = 1_000_000_000) => Number.isSafeInteger(value) && value >= min && value <= max;
const missing = problem => ({ schema, status: 'incomplete', problem, failures: [], totalFailureEvents: null,
  unmapped: 0, unclassified: 0, omitted: 0, totals: null });

export function classifyFailure(error) {
  const cause = own(error, 'cause');
  if (own(error, 'code') === 'ERR_ASSERTION' || own(cause, 'code') === 'ERR_ASSERTION') return 'assertion';
  const types = { testTimeoutFailure: 'timeout', hookFailed: 'hook', subtestsFailed: 'subtests',
    cancelledByParent: 'cancelled', testAborted: 'aborted', testCodeFailure: 'test-code' };
  const type = own(error, 'failureType');
  if (typeof type === 'string' && Object.hasOwn(types, type)) return types[type];
  return own(error, 'code') === 'ERR_TEST_FAILURE' ? 'runner' : 'unknown';
}

// Reconstruct every published object. Never serialize event/error objects, names,
// paths, messages or a hash of runtime data. Indices refer only to testPaths.
export function sanitizeFailureDiagnostics(value, fileCount, expected) {
  try {
    if (!value || value.schema !== schema || !integer(fileCount) || !Array.isArray(value.failures)
      || value.failures.length > MAX_FAILURE_DIAGNOSTICS) return missing('invalid');
    if (value.status === 'incomplete' && value.totalFailureEvents === null && value.failures.length === 0)
      return missing(problems.has(value.problem) ? value.problem : 'invalid');
    for (const key of ['totalFailureEvents', 'unmapped', 'unclassified', 'omitted'])
      if (!integer(value[key])) return missing('invalid');
    if (value.totalFailureEvents !== value.failures.length + value.omitted
      || value.unmapped > value.totalFailureEvents || value.unclassified > value.totalFailureEvents) return missing('invalid');
    const failures = [];
    for (const row of value.failures) {
      if (!row || !['test', 'suite'].includes(row.type) || !classes.has(row.classification)) return missing('invalid');
      const fields = { fileIndex: [1, fileCount], line: [1, 1_000_000_000], column: [1, 1_000_000_000],
        caseId: [1, 1_000_000_000], nesting: [0, 1_000_000_000] };
      const record = {};
      for (const [key, [min, max]] of Object.entries(fields)) {
        if (row[key] !== null && !integer(row[key], min, max)) return missing('invalid');
        record[key] = row[key];
      }
      failures.push({ ...record, type: row.type, classification: row.classification });
    }
    const totals = value.totals;
    if (!totals || !countKeys.every(key => integer(totals[key]))) return missing('missing-summary');
    const safeTotals = Object.fromEntries(countKeys.map(key => [key, totals[key]]));
    if (value.unmapped < failures.filter(row => Object.values(row).includes(null)).length
      || value.unclassified < failures.filter(row => row.classification === 'unknown').length) return missing('invalid');
    const countMismatch = expected && countKeys.some(key => safeTotals[key] !== expected[key]);
    const unresolved = value.unmapped > 0 || value.unclassified > 0 || value.omitted > 0
      || failures.some(row => Object.values(row).includes(null)) || value.totalFailureEvents < safeTotals.failed;
    const problem = countMismatch ? 'count-mismatch' : unresolved ? 'unresolved' : 'none';
    return { schema, status: problem === 'none' ? 'complete' : 'incomplete', problem, failures,
      totalFailureEvents: value.totalFailureEvents, unmapped: value.unmapped,
      unclassified: value.unclassified, omitted: value.omitted, totals: safeTotals };
  } catch { return missing('invalid'); }
}

export function readFailureDiagnostics(text, fileCount, expected, truncated = false) {
  if (truncated) return missing('transport-truncated');
  const lines = text.split(/\r?\n/).filter(line => line.startsWith(DIAGNOSTIC_PREFIX));
  if (!lines.length) return missing('missing');
  if (lines.length !== 1) return missing('invalid');
  try { return sanitizeFailureDiagnostics(JSON.parse(lines[0].slice(DIAGNOSTIC_PREFIX.length)), fileCount, expected); }
  catch { return missing('invalid'); }
}

export async function collectFailureDiagnostics(source, files) {
  const index = new Map(files.map((file, offset) => [resolve(file.path), { number: offset + 1, lengths: file.lineLengths }]));
  const result = { schema, failures: [], totalFailureEvents: 0, unmapped: 0, unclassified: 0, omitted: 0, totals: null };
  for await (const event of source) {
    const data = own(event, 'data');
    if (own(event, 'type') === 'test:summary' && own(data, 'file') === undefined) {
      const counts = own(data, 'counts');
      result.totals = { testExecutions: own(counts, 'tests'), passed: own(counts, 'passed'),
        failed: own(counts, 'failed'), skipped: own(counts, 'skipped'), cancelled: own(counts, 'cancelled') };
    }
    if (own(event, 'type') !== 'test:fail') continue;
    result.totalFailureEvents++;
    let file;
    try {
      const name = own(data, 'file');
      if (typeof name === 'string') file = index.get(resolve(name.startsWith('file:') ? fileURLToPath(name) : name));
    } catch { /* Unknown source is counted, never printed. */ }
    const inputLine = own(data, 'line'), inputColumn = own(data, 'column');
    const line = file && integer(inputLine, 1, file.lengths.length) ? inputLine : null;
    const column = line !== null && integer(inputColumn, 1, file.lengths[line - 1] + 1) ? inputColumn : null;
    const inputId = own(data, 'testId') ?? own(data, 'testNumber'), inputNesting = own(data, 'nesting');
    const details = own(data, 'details');
    const classification = classifyFailure(own(details, 'error'));
    const record = { fileIndex: file?.number ?? null, line, column,
      caseId: integer(inputId, 1) ? inputId : null, nesting: integer(inputNesting) ? inputNesting : null,
      type: own(details, 'type') === 'suite' ? 'suite' : 'test', classification };
    if (Object.values(record).includes(null)) result.unmapped++;
    if (classification === 'unknown') result.unclassified++;
    if (result.failures.length < MAX_FAILURE_DIAGNOSTICS) result.failures.push(record);
    else result.omitted++;
  }
  return sanitizeFailureDiagnostics(result, files.length);
}

export default async function* reporter(source) {
  let result;
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const files = listProgramSourcePaths(root).filter(path => /\.test\.tsx?$/.test(path)).map(path => ({
      path: resolve(root, path), lineLengths: readFileSync(resolve(root, path), 'utf8').split(/\r?\n/).map(line => line.length),
    }));
    result = await collectFailureDiagnostics(source, files);
  } catch { result = missing('invalid'); }
  yield DIAGNOSTIC_PREFIX + JSON.stringify(result) + '\n';
}
