'use strict';
const phases = ['ime', 'commit', 'task', 'enter'];
const median = values => { const sorted = [...values].sort((a, b) => a - b), n = sorted.length; return n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.ceil((n - 1) / 2)]) / 2 : null; };
const percent = (value, base) => Number.isFinite(value) && base > 0 ? Math.round(100 * (value / base - 1)) : null;
function group(blocks) {
  return { blocks: blocks.length, ...Object.fromEntries(phases.map(phase => [phase, {
    median: median(blocks.map(block => block.summary[phase].median)), p95: median(blocks.map(block => block.summary[phase].p95)),
  }])) };
}
function summarize(pairs, options = {}) {
  const valid = pairs.filter(pair => pair.base.machine.valid && pair.cand.machine.valid);
  const base = group(valid.map(pair => pair.base)), cand = group(valid.map(pair => pair.cand));
  const vsBaseNow = Object.fromEntries(phases.map(phase => [phase, percent(cand[phase].median, base[phase].median)]));
  const paired = valid.map((pair, index) => ({ pair: index + 1, order: pair.order,
    changes: Object.fromEntries(phases.map(phase => [phase, percent(pair.cand.summary[phase].median, pair.base.summary[phase].median)])) }));
  const inputs = valid.flatMap(pair => [pair.base, pair.cand]);
  const fingerprints = new Set(inputs.map(block => block.start?.committedTextSHA256));
  const accounts = new Set(inputs.map(block => block.start?.committedAccountSHA256));
  const browsers = new Set(inputs.map(block => block.browserVersion));
  const raw = new Set(inputs.map(block => block.rawSha));
  const minimum = options.minimum ?? 3;
  const contract = valid.length >= minimum && fingerprints.size === 1 && !fingerprints.has(undefined)
    && accounts.size === 1 && !accounts.has(undefined) && browsers.size === 1 && !browsers.has(undefined) && raw.size === 1
    && inputs.every(block => block.typedOk && block.start?.clean === true && block.errors.length === 0 && block.outside.length === 0);
  const slow = phases.filter(phase => options.aa ? Math.abs(vsBaseNow[phase] ?? Infinity) > 5 : (vsBaseNow[phase] ?? Infinity) > 5);
  const verdict = !contract ? 'HOLD_INPUT_OR_VALID_PAIRS' : slow.length ? (options.aa ? 'HOLD_AA_UNSTABLE' : 'PERFORMANCE_FAIL') : 'PASS';
  return { schema: 'flowme-paired-perf/1', aa: !!options.aa, verdict, unchangedDefaultThresholdPercent: 5,
    pairedAggregationChangesGate: false, minimumValidPairs: minimum, validPairs: valid.length,
    groups: { 'full-cpu6': { base, cand, vsBaseNow, paired } },
    inputContract: { pass: contract, sameInitialCommittedText: fingerprints.size === 1, sameInitialAccount: accounts.size === 1, sameBrowser: browsers.size === 1, sameFinalRaw: raw.size === 1 },
    slowerPhases: slow, limits: 'AA is an independent validity gate. Never subtract its ratio or discard slow valid blocks. Worker post/reply intervals include main-thread delay.' };
}
module.exports = { phases, median, percent, summarize };
