import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type ReviewPayload = {
  flowId?: string;
  title?: string;
  rating?: number;
  keep?: boolean;
  issue?: boolean;
  memo?: string;
};

const notesJsonPath = path.join(
  process.cwd(),
  'docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.json',
);
const notesMdPath = path.join(
  process.cwd(),
  'docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.md',
);

async function readReviews() {
  try {
    const raw = await fs.readFile(notesJsonPath, 'utf8');
    return JSON.parse(raw) as { generatedAt: string; updatedAt: string | null; reviews: Record<string, ReviewPayload & { updatedAt?: string }> };
  } catch {
    return { generatedAt: '2026-06-02', updatedAt: null, reviews: {} };
  }
}

async function writeReviews(data: { generatedAt: string; updatedAt: string | null; reviews: Record<string, ReviewPayload & { updatedAt?: string }> }) {
  await fs.mkdir(path.dirname(notesJsonPath), { recursive: true });
  await fs.writeFile(notesJsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  const rows = Object.values(data.reviews).sort((a, b) => String(a.flowId).localeCompare(String(b.flowId)));
  const markdown = [
    '# 한국어 Flow 콘텐츠 UI 평가 메모',
    '',
    `Updated: ${data.updatedAt ?? ''}`,
    '',
    '| Flow | 점수 | 후보 유지 | 문제 있음 | 메모 | 저장 시각 |',
    '|---|---:|---|---|---|---|',
    ...rows.map((row) => {
      const memo = String(row.memo ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
      return `| ${row.title ?? row.flowId} | ${row.rating ?? ''} | ${row.keep ? 'Y' : ''} | ${row.issue ? 'Y' : ''} | ${memo} | ${row.updatedAt ?? ''} |`;
    }),
    '',
  ].join('\n');
  await fs.writeFile(notesMdPath, markdown, 'utf8');
}

export async function GET() {
  return NextResponse.json(await readReviews());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ReviewPayload;
  if (!payload.flowId) {
    return NextResponse.json({ ok: false, error: 'flowId is required' }, { status: 400 });
  }
  const rating = payload.rating == null ? undefined : Number(payload.rating);
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ ok: false, error: 'rating must be 1-5' }, { status: 400 });
  }

  const data = await readReviews();
  const updatedAt = new Date().toISOString();
  data.updatedAt = updatedAt;
  data.reviews[payload.flowId] = {
    flowId: payload.flowId,
    title: String(payload.title ?? payload.flowId),
    rating,
    keep: Boolean(payload.keep),
    issue: Boolean(payload.issue),
    memo: String(payload.memo ?? '').slice(0, 5000),
    updatedAt,
  };
  await writeReviews(data);
  return NextResponse.json({ ok: true, review: data.reviews[payload.flowId] });
}
