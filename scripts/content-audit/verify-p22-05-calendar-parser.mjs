import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const packageId = '2026-07-11-claude-design-p22-05-external-import-evidence';
const packageDir = path.resolve('docs/content-audit', packageId);
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'fixture-manifest.json'), 'utf8'));
const moduleRoot =
  process.env.P22_ICAL_JS_ROOT ?? path.join(os.tmpdir(), 'flowme-p22-icaljs', 'node_modules', 'ical.js');
const packageJson = JSON.parse(fs.readFileSync(path.join(moduleRoot, 'package.json'), 'utf8'));
const { default: ICAL } = await import(pathToFileURL(path.join(moduleRoot, 'dist', 'ical.js')).href);

function parseCalendar(relativePath) {
  const filePath = path.join(packageDir, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const calendar = new ICAL.Component(ICAL.parse(source));
  const events = calendar.getAllSubcomponents('vevent').map((component) => new ICAL.Event(component));
  const physicalLineOverflowCount = source
    .split(/\r?\n/)
    .filter((line) => Buffer.byteLength(line, 'utf8') > 75).length;
  return { source, events, physicalLineOverflowCount };
}

const observations = manifest.representativeFlows.map((flow) => {
  const { events, physicalLineOverflowCount } = parseCalendar(flow.files.calendar);
  const expectedEvent = events.find((event) => event.summary.includes(flow.firstItem.title));
  return {
    id: flow.id,
    parser: `ical.js ${packageJson.version}`,
    eventCount: events.length,
    expectedEventCount: flow.expectedEventCount,
    titleFidelity: Boolean(expectedEvent),
    dateFidelity: expectedEvent?.startDate.toString() === flow.firstItem.expectedDate,
    memoFidelity: expectedEvent?.description.includes(flow.firstItem.memo) ?? false,
    uniqueUidCount: new Set(events.map((event) => event.uid)).size,
    stableUidProjectionCount: flow.expectedFields.calendarUids.length,
    physicalLineOverflowCount,
  };
});

const personal = parseCalendar(manifest.personalStep.files.calendar);
const personalEvent = personal.events[0];
const personalObservation = {
  parser: `ical.js ${packageJson.version}`,
  eventCount: personal.events.length,
  titleFidelity: personalEvent?.summary === manifest.personalStep.title,
  dateFidelity: personalEvent?.startDate.toString().startsWith(manifest.personalStep.date) ?? false,
  memoFidelity: personalEvent?.description.includes(manifest.personalStep.memo) ?? false,
  uidFidelity: personalEvent?.uid === manifest.personalStep.expectedFields.calendarUid,
  physicalLineOverflowCount: personal.physicalLineOverflowCount,
};

const passCount = observations.filter(
  (entry) =>
    entry.eventCount === entry.expectedEventCount &&
    entry.titleFidelity &&
    entry.dateFidelity &&
    entry.memoFidelity &&
    entry.uniqueUidCount === entry.expectedEventCount &&
    entry.physicalLineOverflowCount === 0,
).length;
const evidence = {
  packageId,
  observedAt: '2026-07-11',
  parser: {
    name: 'ical.js',
    version: packageJson.version,
    source: 'temporary isolated install outside the repository',
  },
  representativeFlows: observations,
  personalStep: personalObservation,
  summary: {
    representativeFlowCount: observations.length,
    externalParserImportPassCount: passCount,
    personalStepExternalParserImportPassed:
      personalObservation.eventCount === 1 &&
      personalObservation.titleFidelity &&
      personalObservation.dateFidelity &&
      personalObservation.memoFidelity &&
      personalObservation.uidFidelity &&
      personalObservation.physicalLineOverflowCount === 0,
    physicalLineOverflowCount:
      observations.reduce((sum, entry) => sum + entry.physicalLineOverflowCount, 0) +
      personalObservation.physicalLineOverflowCount,
  },
};

if (
  evidence.summary.externalParserImportPassCount !== observations.length ||
  !evidence.summary.personalStepExternalParserImportPassed ||
  evidence.summary.physicalLineOverflowCount !== 0
) {
  throw new Error(`Calendar parser gate failed: ${JSON.stringify(evidence.summary)}`);
}

fs.writeFileSync(
  path.join(packageDir, 'calendar-parser-observation.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(evidence.summary)}\n`);
