import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  detectArtifactMediaType,
  finalizeEvidenceRecord,
  inspectArtifactFiles,
  resolveArtifactPath,
  runCli,
} from './verify-p3h1-android-evidence';
import { PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION } from '../../lib/flow/personal-workspace-poc-p3h1-android-evidence';

function temporaryDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-p3h1-evidence-'));
}

function pngBytes(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
}

function descriptor(relativePath: string, bytes: Buffer): Record<string, unknown> {
  return {
    id: 'capture-1',
    path: relativePath,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    bytes: bytes.byteLength,
    mediaType: 'image/png',
    capturedAt: '2026-09-04T08:00:00.000Z',
    roles: ['A1'],
    verification: null,
  };
}

test('sniffs supported artifact media types from bytes rather than file names', () => {
  assert.equal(detectArtifactMediaType(pngBytes()), 'image/png');
  assert.equal(detectArtifactMediaType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(detectArtifactMediaType(Buffer.from('0000ftypisom')), 'video/mp4');
  assert.equal(detectArtifactMediaType(Buffer.from('{"ok":true}', 'utf8')), 'application/json');
  assert.equal(detectArtifactMediaType(Buffer.from('<!doctype html><html></html>', 'utf8')), 'text/html');
  assert.equal(detectArtifactMediaType(Buffer.from([0x00, 0xff, 0x00])), null);
});

test('resolves ordinary files beneath the explicit real artifact root', () => {
  const root = temporaryDirectory();
  try {
    fs.mkdirSync(path.join(root, 'android'));
    const expected = path.join(root, 'android', 'capture.png');
    fs.writeFileSync(expected, pngBytes());
    assert.equal(resolveArtifactPath(root, 'android/capture.png'), fs.realpathSync.native(expected));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects absolute paths and every lexical traversal form before reading', () => {
  const root = temporaryDirectory();
  try {
    for (const unsafe of ['../outside.png', 'android/../outside.png', '/outside.png', 'C:\\outside.png', '\\\\server\\share\\file.png', 'capture.png:alternate-stream']) {
      assert.throws(() => resolveArtifactPath(root, unsafe), /Unsafe artifact path/u, unsafe);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a filesystem-volume root as an artifact root', () => {
  const volumeRoot = path.parse(process.cwd()).root;
  assert.throws(() => resolveArtifactPath(volumeRoot, 'made-up.png'), /Artifact root is too broad/u);
});

test('rejects a directory junction that resolves outside the artifact root', () => {
  const parent = temporaryDirectory();
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'capture.png'), pngBytes());
  const link = path.join(root, 'escape');
  try {
    fs.symlinkSync(outside, link, 'junction');
    assert.throws(() => resolveArtifactPath(root, 'escape/capture.png'), /symlink escapes root/u);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('reads actual bytes and returns only a manifest-exact filesystem context', () => {
  const root = temporaryDirectory();
  try {
    const bytes = pngBytes();
    fs.writeFileSync(path.join(root, 'capture.png'), bytes);
    const evidence = { runStatus: 'EXECUTED', artifacts: [descriptor('capture.png', bytes)] };
    assert.deepEqual(inspectArtifactFiles(evidence, root), [{
      id: 'capture-1',
      path: 'capture.png',
      sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
      bytes: bytes.byteLength,
      mediaType: 'image/png',
    }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed on byte, SHA, or sniffed media-type mismatch', () => {
  const root = temporaryDirectory();
  try {
    const bytes = pngBytes();
    fs.writeFileSync(path.join(root, 'capture.png'), bytes);
    for (const mutation of [
      { bytes: bytes.byteLength + 1 },
      { sha256: 'A'.repeat(64) },
      { mediaType: 'image/jpeg' },
    ]) {
      const artifact = { ...descriptor('capture.png', bytes), ...mutation };
      assert.throws(() => inspectArtifactFiles({ runStatus: 'EXECUTED', artifacts: [artifact] }, root), /does not match manifest/u);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('finalize adds filesystem verification while preserving UNREVIEWED adjudication', () => {
  const input = {
    schemaVersion: 2,
    runStatus: 'EXECUTED',
    artifacts: [descriptor('capture.png', pngBytes())],
    artifactReview: { status: 'UNREVIEWED', reviewedBy: '', reviewedAt: '', scenarioIds: [], artifactIds: [] },
  };
  const output = finalizeEvidenceRecord(input, '김검증', '2026-09-04T09:00:00.000Z') as typeof input;
  assert.deepEqual(output.artifacts[0].verification, {
    method: 'filesystem-sha256', verifiedAt: '2026-09-04T09:00:00.000Z', verifiedBy: '김검증',
  });
  assert.deepEqual(output.artifactReview, input.artifactReview);
  assert.equal(input.artifacts[0].verification, null);
});

test('CLI finalize writes a separate verified draft and verify still refuses an unreviewed record', () => {
  const root = temporaryDirectory();
  const source = path.join(root, 'draft.json');
  const output = path.join(root, 'finalized.json');
  const bytes = pngBytes();
  fs.writeFileSync(path.join(root, 'capture.png'), bytes);
  fs.writeFileSync(source, JSON.stringify({
    schemaVersion: 2,
    contractVersion: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION,
    runStatus: 'EXECUTED',
    artifacts: [descriptor('capture.png', bytes)],
    artifactReview: { status: 'UNREVIEWED', reviewedBy: '', reviewedAt: '', scenarioIds: [], artifactIds: [] },
  }));
  const originalWrite = process.stdout.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  try {
    assert.equal(runCli([
      '--mode', 'finalize', '--file', source, '--artifact-root', root, '--out', output,
      '--verified-by', '김검증', '--verified-at', '2026-09-04T09:00:00.000Z',
    ]), 1);
    assert.ok(fs.existsSync(output));
    const finalized = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(finalized.artifacts[0].verification.method, 'filesystem-sha256');
    assert.equal(finalized.artifactReview.status, 'UNREVIEWED');
    assert.equal(runCli(['--mode', 'verify', '--file', output, '--artifact-root', root]), 1);
  } finally {
    process.stdout.write = originalWrite;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CLI rejects legacy EXECUTED JSON before reading any artifact path', () => {
  const root = temporaryDirectory();
  const source = path.join(root, 'legacy.json');
  fs.writeFileSync(source, JSON.stringify({
    schemaVersion: 1,
    contractVersion: 'flowme-personal-workspace-p3h1-android-evidence-v1',
    runStatus: 'EXECUTED',
    artifacts: [{ id: 'legacy', path: '../../outside.mp4' }],
  }));
  let output = '';
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  try {
    assert.equal(runCli(['--mode', 'verify', '--file', source]), 1);
    assert.match(output, /legacy-executed-evidence-rejected/u);
  } finally {
    process.stdout.write = originalWrite;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
