import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

test('content flow review API writes review JSON and markdown under the current workspace', async () => {
  const originalCwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowme-review-api-'));

  try {
    process.chdir(tempDir);
    const routeUrl = `${pathToFileURL(path.join(originalCwd, 'app/api/content-flow-review/route.ts')).href}?t=${Date.now()}`;
    const { GET, POST } = await import(routeUrl);

    const response = await POST(
      new Request('http://test.local/api/content-flow-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          flowId: 'washer-tub-clean-monthly',
          title: '세탁기 통세척 월간 관리',
          rating: 5,
          keep: true,
          issue: false,
          memo: '캘린더 반복과 메모 링크 정도면 충분함',
        }),
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.review.rating, 5);

    const notesJsonPath = path.join(
      tempDir,
      'docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.json',
    );
    const notesMdPath = path.join(
      tempDir,
      'docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.md',
    );
    const saved = JSON.parse(await fs.readFile(notesJsonPath, 'utf8'));
    assert.equal(saved.reviews['washer-tub-clean-monthly'].memo, '캘린더 반복과 메모 링크 정도면 충분함');
    assert.equal(saved.reviews['washer-tub-clean-monthly'].keep, true);

    const markdown = await fs.readFile(notesMdPath, 'utf8');
    assert.match(markdown, /세탁기 통세척 월간 관리/);
    assert.match(markdown, /캘린더 반복과 메모 링크 정도면 충분함/);

    const getResponse = await GET();
    const getBody = await getResponse.json();
    assert.equal(getBody.reviews['washer-tub-clean-monthly'].rating, 5);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
