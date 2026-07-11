import fs from 'node:fs';
import path from 'node:path';
import { normalizeExecutionModel } from '../../lib/flow/execution-model';
import {
  classifySourceReachability,
  sourceReachabilityIsHardBroken,
  sourceReachabilityNeedsManualReview,
  type SourceReachabilityBucket,
} from '../../lib/flow/source-reachability';
import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { cloneSeedBundles } from '../../lib/flow/storage';

type AuditTarget = {
  sourceUrl: string;
  slugs: string[];
  titles: string[];
  exposureStatuses: string[];
};

type AuditResult = AuditTarget & {
  bucket: SourceReachabilityBucket;
  status?: number;
  finalUrl?: string;
  contentType?: string;
  elapsedMs: number;
  error?: string;
};

const args = process.argv.slice(2);
const outputArgIndex = args.indexOf('--output');
const outputPath = outputArgIndex >= 0 ? args[outputArgIndex + 1] : undefined;
const strict = args.includes('--strict');
const timeoutMs = Number(process.env.FLOW_SOURCE_AUDIT_TIMEOUT_MS ?? 12_000);
const concurrency = Math.max(1, Number(process.env.FLOW_SOURCE_AUDIT_CONCURRENCY ?? 8));

function buildTargets(): AuditTarget[] {
  const byUrl = new Map<string, AuditTarget>();
  const bundles = mergeSourceBackedMyFlowBundles(cloneSeedBundles()).filter((bundle) => {
    if (bundle.flow.status !== 'published') return false;
    const exposureStatus = normalizeExecutionModel(bundle).exposureStatus;
    return exposureStatus !== 'catalog_preview' && exposureStatus !== 'hidden';
  });

  for (const bundle of bundles) {
    const sourceUrl = bundle.flow.source_url;
    if (!sourceUrl) continue;
    const exposureStatus = normalizeExecutionModel(bundle).exposureStatus;
    const current = byUrl.get(sourceUrl) ?? {
      sourceUrl,
      slugs: [],
      titles: [],
      exposureStatuses: [],
    };
    current.slugs.push(bundle.flow.slug);
    current.titles.push(bundle.flow.title);
    current.exposureStatuses.push(exposureStatus);
    byUrl.set(sourceUrl, current);
  }

  return [...byUrl.values()]
    .map((target) => ({
      ...target,
      slugs: [...new Set(target.slugs)].sort(),
      titles: [...new Set(target.titles)].sort(),
      exposureStatuses: [...new Set(target.exposureStatuses)].sort(),
    }))
    .sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
}

async function checkTarget(target: AuditTarget): Promise<AuditResult> {
  const startedAt = Date.now();
  try {
    const response = await fetch(target.sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        'user-agent': 'FlowMeSourceAudit/1.0 (+https://github.com/knhbae/flowme2605)',
      },
    });
    const finalUrl = response.url || target.sourceUrl;
    const bucket = classifySourceReachability({
      sourceUrl: target.sourceUrl,
      finalUrl,
      status: response.status,
    });
    await response.body?.cancel();
    return {
      ...target,
      bucket,
      status: response.status,
      finalUrl,
      contentType: response.headers.get('content-type') ?? undefined,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    return {
      ...target,
      bucket: classifySourceReachability({
        sourceUrl: target.sourceUrl,
        errorKind: isTimeout ? 'timeout' : 'network',
      }),
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

async function runPool(targets: AuditTarget[]) {
  const results: AuditResult[] = new Array(targets.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (nextIndex < targets.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await checkTarget(targets[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const targets = buildTargets();
  const results = await runPool(targets);
  const buckets = Object.fromEntries(
    [
      'reachable',
      'redirected',
      'access_blocked',
      'not_found',
      'server_error',
      'request_error',
      'timeout',
      'network_error',
    ].map((bucket) => [bucket, results.filter((result) => result.bucket === bucket).length]),
  );
  const payload = {
    generatedAt: new Date().toISOString(),
    policy: {
      routeScope: 'published normal-user routes only; catalog_preview and hidden excluded',
      timeoutMs,
      concurrency,
      networkReachabilityDoesNotProveSemanticFreshness: true,
      hardBrokenBuckets: ['not_found'],
    },
    summary: {
      routeCount: new Set(results.flatMap((result) => result.slugs)).size,
      uniqueSourceUrlCount: results.length,
      domainCount: new Set(results.map((result) => new URL(result.sourceUrl).hostname)).size,
      buckets,
      hardBrokenCount: results.filter((result) => sourceReachabilityIsHardBroken(result.bucket)).length,
      manualReviewCount: results.filter((result) => sourceReachabilityNeedsManualReview(result.bucket)).length,
    },
    attention: results.filter((result) => sourceReachabilityNeedsManualReview(result.bucket)),
    results,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (outputPath) {
    const absolutePath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, json, 'utf8');
  }
  console.log(json.trimEnd());

  if (strict && payload.summary.hardBrokenCount > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
