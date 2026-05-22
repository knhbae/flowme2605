import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNaturalArtifactAudit,
  realSourceNaturalArtifactAudits,
  summarizeNaturalArtifactAuditCoverage,
} from './natural-artifact-audit';
import { seedBundles } from './seed-flows';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing seed bundle: ${slug}`);
  return bundle;
}

test('real-source natural artifact audit batch only covers real-source flows', () => {
  assert.equal(realSourceNaturalArtifactAudits.length, 8);

  for (const audit of realSourceNaturalArtifactAudits) {
    const bundle = bundleBySlug(audit.slug);
    assert.equal(bundle.flow.source_status, 'real', audit.slug);
    assert.equal(audit.sourceUrl, bundle.flow.source_url, audit.slug);
  }
});

test('real-source natural artifact audits include concrete simulated outputs and comparisons', () => {
  for (const audit of realSourceNaturalArtifactAudits) {
    assert.ok(audit.sourceEvidence.length > 0, audit.slug);
    assert.ok(audit.naturalArtifacts.length > 0, audit.slug);
    assert.ok(audit.currentContentGap.length > 0, audit.slug);
    assert.ok(audit.currentUxGap.length > 0, audit.slug);

    for (const artifact of audit.naturalArtifacts) {
      assert.match(artifact.simulatedInputs.join(' '), /=/, `${audit.slug} needs key=value inputs`);
      assert.ok(artifact.expectedOutput.length > 0, `${audit.slug} needs expected output`);
      assert.ok(artifact.currentFlowMatch.length > 0, `${audit.slug} needs content comparison`);
      assert.ok(artifact.currentUxSupport.length > 0, `${audit.slug} needs UX comparison`);
      assert.ok(artifact.gap.length > 0, `${audit.slug} needs gap`);
    }
  }
});

test('first real-source artifact batch covers core output kinds', () => {
  const artifactKinds = new Set(
    realSourceNaturalArtifactAudits.flatMap((audit) => audit.naturalArtifacts.map((artifact) => artifact.kind)),
  );

  assert.ok(artifactKinds.has('monthly_calendar'));
  assert.ok(artifactKinds.has('routine_calendar'));
  assert.ok(artifactKinds.has('checklist'));
  assert.ok(artifactKinds.has('spreadsheet'));
  assert.ok(artifactKinds.has('memo'));
  assert.ok(artifactKinds.has('comparison_table'));
});

test('real-source natural artifact coverage summary tracks remaining work', () => {
  const summary = summarizeNaturalArtifactAuditCoverage(seedBundles);

  assert.equal(summary.realSourceCount, 40);
  assert.equal(summary.auditedRealSourceCount, realSourceNaturalArtifactAudits.length);
  assert.equal(summary.remainingRealSourceCount, 32);
  assert.ok(summary.decisionCounts.promote_to_manual_source_fit >= 1);
  assert.ok(summary.decisionCounts.reshape_content_or_ux >= 1);
});

test('natural artifact audit lookup returns the audited batch record', () => {
  const audit = getNaturalArtifactAudit('real-samsung-washer-filter-care');

  assert.ok(audit);
  assert.equal(audit.naturalArtifacts[0]?.kind, 'routine_calendar');
});
