import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION,
  evaluatePersonalWorkspacePocP3H1AndroidEvidence,
  type PersonalWorkspacePocP3H1FilesystemArtifact,
} from '../../lib/flow/personal-workspace-poc-p3h1-android-evidence';

type CliMode = 'verify' | 'finalize';
type CliOptions = Readonly<{
  mode: CliMode;
  file: string;
  artifactRoot?: string;
  out?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}>;

type ArtifactDescriptor = Readonly<{
  id: string;
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
}>;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256 = /^[0-9A-F]{64}$/u;
const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

function usage(): string {
  return [
    'Usage:',
    '  npx tsx scripts/personal-workspace-poc/verify-p3h1-android-evidence.ts --mode verify --file <evidence.json> --artifact-root <directory>',
    '  npx tsx scripts/personal-workspace-poc/verify-p3h1-android-evidence.ts --mode finalize --file <draft.json> --artifact-root <directory> --out <finalized.json> --verified-by <name> --verified-at <UTC ISO>',
    '',
    'NOT_RUN records may be verified without --artifact-root. EXECUTED records always require an explicit artifact root.',
    'Finalize verifies real files and adds filesystem verification, but never marks an UNREVIEWED draft as REVIEWED.',
    'The command exits successfully only for a complete reviewed E5-D/PASS record.',
  ].join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCli(argv: readonly string[]): CliOptions {
  const values = new Map<string, string>();
  const supported = new Set(['--mode', '--file', '--artifact-root', '--out', '--verified-by', '--verified-at']);
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!supported.has(option)) throw new Error(`Unknown option: ${option ?? '(missing)'}.`);
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`);
    if (values.has(option)) throw new Error(`${option} must be supplied only once.`);
    values.set(option, value);
  }
  if (!values.has('--file')) throw new Error('--file requires an evidence JSON path.');
  const mode = values.get('--mode') ?? 'verify';
  if (mode !== 'verify' && mode !== 'finalize') throw new Error('--mode must be verify or finalize.');
  const options: CliOptions = {
    mode,
    file: path.resolve(values.get('--file') as string),
    artifactRoot: values.has('--artifact-root') ? path.resolve(values.get('--artifact-root') as string) : undefined,
    out: values.has('--out') ? path.resolve(values.get('--out') as string) : undefined,
    verifiedBy: values.get('--verified-by'),
    verifiedAt: values.get('--verified-at'),
  };
  if (mode === 'verify' && (options.out || options.verifiedBy || options.verifiedAt)) {
    throw new Error('--out, --verified-by, and --verified-at are finalize-only options.');
  }
  if (mode === 'finalize') {
    if (!options.out) throw new Error('--mode finalize requires --out.');
    if (options.out === options.file) throw new Error('--out must differ from --file so the source draft is preserved.');
    if (!options.verifiedBy || options.verifiedBy.trim().length < 2) throw new Error('--mode finalize requires a named --verified-by value.');
    if (!options.verifiedAt || !ISO_INSTANT.test(options.verifiedAt) || !Number.isFinite(Date.parse(options.verifiedAt))) {
      throw new Error('--mode finalize requires --verified-at as a UTC ISO instant.');
    }
  }
  return options;
}

function isSafeRelativePath(value: string): boolean {
  if (!value || /[\u0000-\u001f\u007f:]/u.test(value)) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^(?:[A-Za-z]:|[\\/]{2})/u.test(value)) return false;
  return value.replace(/\\/gu, '/').split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function resolveArtifactPath(artifactRoot: string, relativePath: string): string {
  if (!isSafeRelativePath(relativePath)) throw new Error(`Unsafe artifact path: ${relativePath}.`);
  const rootRealPath = fs.realpathSync.native(artifactRoot);
  if (!fs.statSync(rootRealPath).isDirectory()) throw new Error(`Artifact root is not a directory: ${artifactRoot}.`);
  if (path.parse(rootRealPath).root === rootRealPath) throw new Error(`Artifact root is too broad: ${artifactRoot}.`);
  const platformRelativePath = relativePath.replace(/[\\/]/gu, path.sep);
  const lexicalPath = path.resolve(rootRealPath, platformRelativePath);
  if (!isInside(rootRealPath, lexicalPath)) throw new Error(`Artifact path escapes root: ${relativePath}.`);
  const realPath = fs.realpathSync.native(lexicalPath);
  if (!isInside(rootRealPath, realPath)) throw new Error(`Artifact symlink escapes root: ${relativePath}.`);
  if (!fs.statSync(realPath).isFile()) throw new Error(`Artifact is not a regular file: ${relativePath}.`);
  return realPath;
}

function hasBytes(buffer: Buffer, offset: number, bytes: readonly number[]): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function decodesAsUtf8(buffer: Buffer): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

export function detectArtifactMediaType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (buffer.length >= 3 && hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (buffer.length >= 4 && hasBytes(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  const text = decodesAsUtf8(buffer);
  if (text === null || text.includes('\0')) return null;
  const trimmed = text.replace(/^\uFEFF/u, '').trimStart();
  if (/^(?:<!doctype\s+html\b|<html\b)/iu.test(trimmed)) return 'text/html';
  if (/^<svg(?:\s|>)/iu.test(trimmed)) return 'image/svg+xml';
  if (/^[\[{]/u.test(trimmed)) {
    try { JSON.parse(trimmed); return 'application/json'; } catch { /* fall through to text */ }
  }
  return 'text/plain';
}

function descriptorsFromEvidence(evidence: unknown): readonly ArtifactDescriptor[] {
  if (!isRecord(evidence) || !Array.isArray(evidence.artifacts)) throw new Error('EXECUTED evidence needs an artifacts array.');
  const descriptors: ArtifactDescriptor[] = [];
  const seen = new Set<string>();
  const seenPaths = new Set<string>();
  for (const [index, value] of evidence.artifacts.entries()) {
    if (!isRecord(value)
      || typeof value.id !== 'string' || !ARTIFACT_ID.test(value.id)
      || typeof value.path !== 'string'
      || typeof value.sha256 !== 'string' || !SHA256.test(value.sha256)
      || !Number.isSafeInteger(value.bytes) || (value.bytes as number) <= 0
      || typeof value.mediaType !== 'string' || !value.mediaType.trim()) {
      throw new Error(`artifacts[${index}] has incomplete file metadata.`);
    }
    if (seen.has(value.id)) throw new Error(`Duplicate artifact ID: ${value.id}.`);
    seen.add(value.id);
    const comparablePath = value.path.replace(/\\/gu, '/').toLowerCase();
    if (seenPaths.has(comparablePath)) throw new Error(`Duplicate artifact path: ${value.path}.`);
    seenPaths.add(comparablePath);
    descriptors.push({
      id: value.id,
      path: value.path,
      sha256: value.sha256,
      bytes: value.bytes as number,
      mediaType: value.mediaType,
    });
  }
  if (descriptors.length === 0) throw new Error('EXECUTED evidence needs at least one artifact.');
  return descriptors;
}

export function inspectArtifactFiles(
  evidence: unknown,
  artifactRoot: string,
): readonly PersonalWorkspacePocP3H1FilesystemArtifact[] {
  const descriptors = descriptorsFromEvidence(evidence);
  return descriptors.map((descriptor) => {
    const artifactPath = resolveArtifactPath(artifactRoot, descriptor.path);
    const bytes = fs.readFileSync(artifactPath);
    const actual: PersonalWorkspacePocP3H1FilesystemArtifact = {
      id: descriptor.id,
      path: descriptor.path,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
      bytes: bytes.byteLength,
      mediaType: detectArtifactMediaType(bytes) ?? 'application/octet-stream',
    };
    if (actual.mediaType === 'application/octet-stream') {
      throw new Error(`Artifact ${descriptor.id} has an unsupported or unidentifiable media type.`);
    }
    const mismatches: string[] = [];
    if (actual.sha256 !== descriptor.sha256) mismatches.push('SHA-256');
    if (actual.bytes !== descriptor.bytes) mismatches.push('bytes');
    if (actual.mediaType !== descriptor.mediaType) mismatches.push('mediaType');
    if (mismatches.length > 0) throw new Error(`Artifact ${descriptor.id} does not match manifest: ${mismatches.join(', ')}.`);
    return actual;
  });
}

export function finalizeEvidenceRecord(
  evidence: unknown,
  verifiedBy: string,
  verifiedAt: string,
): unknown {
  if (!isRecord(evidence) || evidence.runStatus !== 'EXECUTED' || !Array.isArray(evidence.artifacts)) {
    throw new Error('Only an EXECUTED v2 evidence record can be finalized.');
  }
  if (evidence.schemaVersion !== 2) throw new Error('Only schemaVersion 2 can be finalized.');
  return {
    ...evidence,
    artifacts: evidence.artifacts.map((artifact, index) => {
      if (!isRecord(artifact)) throw new Error(`artifacts[${index}] must be an object.`);
      return {
        ...artifact,
        verification: { method: 'filesystem-sha256', verifiedAt, verifiedBy },
      };
    }),
  };
}

export function runCli(argv: readonly string[]): number {
  const options = parseCli(argv);
  const parsed: unknown = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  if (isRecord(parsed) && parsed.runStatus === 'NOT_RUN') {
    if (options.mode === 'finalize') throw new Error('A NOT_RUN record has no artifact files to finalize.');
    const evaluation = evaluatePersonalWorkspacePocP3H1AndroidEvidence(parsed);
    process.stdout.write(`${JSON.stringify({ mode: options.mode, file: options.file, ...evaluation }, null, 2)}\n`);
    return evaluation.status === 'PASS' ? 0 : 1;
  }
  if (!isRecord(parsed)
    || parsed.runStatus !== 'EXECUTED'
    || parsed.schemaVersion !== 2
    || parsed.contractVersion !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION) {
    const evaluation = evaluatePersonalWorkspacePocP3H1AndroidEvidence(parsed);
    process.stdout.write(`${JSON.stringify({ mode: options.mode, file: options.file, ...evaluation }, null, 2)}\n`);
    return 1;
  }
  if (!options.artifactRoot) throw new Error('EXECUTED evidence requires an explicit --artifact-root.');
  const actualArtifacts = inspectArtifactFiles(parsed, options.artifactRoot);
  const evidence = options.mode === 'finalize'
    ? finalizeEvidenceRecord(parsed, options.verifiedBy as string, options.verifiedAt as string)
    : parsed;
  const evaluation = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, { filesystemArtifacts: actualArtifacts });
  if (options.mode === 'finalize') {
    fs.mkdirSync(path.dirname(options.out as string), { recursive: true });
    fs.writeFileSync(options.out as string, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  }
  process.stdout.write(`${JSON.stringify({
    mode: options.mode,
    file: options.file,
    artifactRoot: fs.realpathSync.native(options.artifactRoot),
    output: options.mode === 'finalize' ? options.out : undefined,
    artifactsVerified: actualArtifacts.length,
    reviewStatus: isRecord(evidence) && isRecord(evidence.artifactReview) ? evidence.artifactReview.status : undefined,
    ...evaluation,
  }, null, 2)}\n`);
  return evaluation.status === 'PASS' && evaluation.evidenceLevel === 'E5-D' ? 0 : 1;
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) process.stdout.write(`${usage()}\n`);
    else process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage()}\n`);
    process.exitCode = 1;
  }
}
