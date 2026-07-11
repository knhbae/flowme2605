import fs from 'node:fs';
import path from 'node:path';
import { normalizeExecutionModel } from '../../lib/flow/execution-model';
import {
  collectUserFacingClaimText,
  findYearStampedSensitiveClaims,
} from '../../lib/flow/source-claim-freshness';
import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { cloneSeedBundles } from '../../lib/flow/storage';

const args = process.argv.slice(2);
const outputArgIndex = args.indexOf('--output');
const outputPath = outputArgIndex >= 0 ? args[outputArgIndex + 1] : undefined;
const strict = args.includes('--strict');

const MONEY_OR_RATE_PATTERN = /(?:\d+(?:\.\d+)?\s*%|\d[\d,]*(?:만|억)원|미화\s*\d[\d,]*달러)/u;
const DEADLINE_PATTERN = /\d+(?:일|개월|년)\s*(?:이내|이상|이하)/u;

function main() {
  const normalUserRoutes = mergeSourceBackedMyFlowBundles(cloneSeedBundles()).filter((bundle) => {
    if (bundle.flow.status !== 'published') return false;
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure !== 'catalog_preview' && exposure !== 'hidden';
  });
  const sensitiveRoutes = normalUserRoutes.filter(
    (bundle) => (bundle.flow.risk_level ?? 'low') !== 'low',
  );
  const yearStampedClaims = findYearStampedSensitiveClaims(normalUserRoutes);
  const numericAttention = sensitiveRoutes.flatMap((bundle) => {
    const texts = collectUserFacingClaimText(bundle);
    const moneyOrRate = texts.filter((text) => MONEY_OR_RATE_PATTERN.test(text));
    const deadline = texts.filter((text) => DEADLINE_PATTERN.test(text));
    if (moneyOrRate.length === 0 && deadline.length === 0) return [];
    return [{
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      riskLevel: bundle.flow.risk_level ?? 'low',
      sourceUrl: bundle.flow.source_url,
      sourceCheckedAt: bundle.flow.source_checked_at,
      moneyOrRate,
      deadline,
    }];
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    policy: {
      routeScope: 'published normal-user routes only; catalog_preview and hidden excluded',
      fixedCalendarYearInSensitiveUserCopy: 'forbidden',
      sourceTitlesAndProvenanceLinks: 'excluded from user-copy year scan',
      volatileNumbers: 'manual review; not automatically invalid',
      sourceCheckedAtStillRequired: true,
    },
    summary: {
      normalUserRouteCount: normalUserRoutes.length,
      sensitiveRouteCount: sensitiveRoutes.length,
      yearStampedClaimCount: yearStampedClaims.length,
      yearStampedRouteCount: new Set(yearStampedClaims.map((claim) => claim.slug)).size,
      numericAttentionRouteCount: numericAttention.length,
      missingSensitiveSourceCheckedAtCount: sensitiveRoutes.filter(
        (bundle) => !bundle.flow.source_checked_at,
      ).length,
    },
    yearStampedClaims,
    numericAttention,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (outputPath) {
    const absolutePath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, json, 'utf8');
  }
  console.log(json.trimEnd());

  if (strict && (yearStampedClaims.length > 0 || payload.summary.missingSensitiveSourceCheckedAtCount > 0)) {
    process.exitCode = 1;
  }
}

main();
