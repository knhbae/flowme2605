import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildSourceBackedManualRegistrationQaHtml,
  buildSourceBackedManualRegistrationQaReport,
} from '../../lib/flow/source-backed-manual-registration-report';

const outputPath = resolve('docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html');
const report = buildSourceBackedManualRegistrationQaReport({
  generatedAt: '2026-07-06T00:00:00.000+09:00',
});
const html = `${buildSourceBackedManualRegistrationQaHtml(report).replace(/[ \t]+$/gm, '')}\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(
  JSON.stringify(
    {
      totalMaps: report.summary.totalMaps,
      lookupEligible: report.summary.lookupEligibleCount,
      qaPass: report.summary.qaPassCount,
      registrationHold: report.summary.registrationHoldCount,
      lookupBlocked: report.summary.lookupBlockedCount,
    },
    null,
    2,
  ),
);
