import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const auditRoot = path.join(repoRoot, 'docs', 'content-audit');
const handoffRoot = path.join(
  auditRoot,
  '2026-07-27-p35-owner-feedback-independent-review-handoff',
);
const offlineRoot = path.join(handoffRoot, 'offline-preview');
const referenceRoot = path.join(offlineRoot, 'reference-screenshots');
const manifestPath = path.join(offlineRoot, 'preview-manifest.json');

const previewManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (previewManifest.failures.length > 0) {
  throw new Error(`Offline capture has ${previewManifest.failures.length} failure(s).`);
}

const packageLabels = {
  '2026-07-26-p35-01-entry-router-evidence': 'P35-01 전역 진입과 3탭',
  '2026-07-26-p35-02-public-result-first-evidence': 'P35-02 저장 전 결과 우선',
  '2026-07-26-p35-03-adjust-one-kind-evidence': 'P35-03 한 번에 한 종류 조정',
  '2026-07-26-p35-04-my-flow-safe-split-evidence': 'P35-04 My Flow와 Calendar 역할 분리',
  '2026-07-26-p35-05-my-flow-library-workspace-evidence': 'P35-05 My Flow 목록과 집중 workspace',
  '2026-07-26-p35-06-calendar-lens-evidence': 'P35-06 날짜 lens Calendar',
  '2026-07-26-p35-07-export-scope-first-evidence': 'P35-07 범위 우선 가져가기',
  '2026-07-26-p35-08-final-mece-gate': 'P35-08 최종 화면 gate',
};

const reviewThemes = {
  public: {
    title: '공개 Flow: 결과, 조정, 저장, 가져가기',
    summary:
      '이사, 날짜 없는 차량 점검, 반복 홈트를 나란히 본다. 전체 결과를 먼저 이해할 수 있는지, 조정이 충분하면서도 과하지 않은지, 저장과 외부 가져가기의 위치가 자연스러운지 검토한다.',
    files: previewManifest.captures.slice(0, 8).map((capture) => capture.file),
  },
  myFlow: {
    title: '내 Flow: 실행, 전체 계획, 기록, 항목 수정',
    summary:
      '한 Flow를 연 뒤 다음 행동, 항목 상세와 빠른 수정, 전체 계획, 기록, 완료 후 되돌리기까지 이어서 본다. 탭의 정체성과 날짜 묶음, 수정 깊이, 복구 문법을 검토한다.',
    files: previewManifest.captures.slice(8, 15).map((capture) => capture.file),
  },
  calendar: {
    title: '캘린더: 월간 lens와 선택일 실행',
    summary:
      '월간 화면과 선택일 agenda가 날짜가 있는 개인 실행 항목을 명확하게 보여 주는지, 같은 날짜의 Flow와 항목을 읽기 쉬운 단위로 묶는지 검토한다.',
    files: previewManifest.captures.slice(15, 18).map((capture) => capture.file),
  },
};

await mkdir(referenceRoot, { recursive: true });

const auditDirectories = await readdir(auditRoot, { withFileTypes: true });
const referencePackages = auditDirectories
  .filter((entry) => entry.isDirectory() && packageLabels[entry.name])
  .sort((left, right) => left.name.localeCompare(right.name));

const referenceEntries = [];
for (const packageEntry of referencePackages) {
  const sourceDirectory = path.join(auditRoot, packageEntry.name, 'screenshots');
  const destinationDirectory = path.join(referenceRoot, packageEntry.name);
  await mkdir(destinationDirectory, { recursive: true });

  const screenshotEntries = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const screenshot of screenshotEntries) {
    const source = path.join(sourceDirectory, screenshot.name);
    const destination = path.join(destinationDirectory, screenshot.name);
    await copyFile(source, destination);
    referenceEntries.push({
      package: packageEntry.name,
      packageLabel: packageLabels[packageEntry.name],
      file: path.posix.join('reference-screenshots', packageEntry.name, screenshot.name),
      source: path.posix.join(
        '..',
        '..',
        '..',
        packageEntry.name,
        'screenshots',
        screenshot.name,
      ),
      evidenceKind: 'current_automated_test_artifact',
    });
  }
}

const referenceManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  observedUserCount: 0,
  evidenceKind: 'current_automated_test_artifact',
  screenshotCount: referenceEntries.length,
  entries: referenceEntries,
};
await writeFile(
  path.join(offlineRoot, 'reference-manifest.json'),
  `${JSON.stringify(referenceManifest, null, 2)}\n`,
  'utf8',
);

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const pageStyles = `
  :root {
    color-scheme: light;
    --ink: #161616;
    --muted: #5f625e;
    --line: #d9ddd7;
    --surface: #ffffff;
    --soft: #f4f6f2;
    --accent: #1e5b42;
    --accent-soft: #e7f2ec;
    --warning: #8a4f08;
    --warning-soft: #fff4dc;
    --nav: #20241f;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: #eef1ec;
    color: var(--ink);
    font-family: Arial, "Malgun Gothic", sans-serif;
    font-size: 15px;
    line-height: 1.55;
    letter-spacing: 0;
  }
  a { color: var(--accent); }
  a:focus-visible, button:focus-visible {
    outline: 3px solid #d38515;
    outline-offset: 3px;
  }
  .shell {
    display: grid;
    grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
    min-height: 100vh;
  }
  nav {
    position: sticky;
    top: 0;
    align-self: start;
    min-height: 100vh;
    padding: 24px 18px;
    background: var(--nav);
    color: #fff;
  }
  nav strong { display: block; font-size: 18px; margin-bottom: 4px; }
  nav p { color: #cdd4cb; font-size: 13px; margin: 0 0 22px; }
  nav a {
    display: block;
    padding: 10px 8px;
    border-bottom: 1px solid #3b4139;
    color: #f8faf7;
    text-decoration: none;
  }
  nav a[aria-current="page"] {
    background: #f5f7f3;
    color: #131513;
    font-weight: 700;
  }
  main { min-width: 0; padding: 36px clamp(18px, 4vw, 56px) 72px; }
  .page-head {
    max-width: 980px;
    margin-bottom: 34px;
  }
  .eyebrow {
    margin: 0 0 8px;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }
  h1 { margin: 0 0 10px; font-size: 32px; line-height: 1.2; }
  h2 { margin: 44px 0 14px; font-size: 23px; line-height: 1.3; }
  h3 { margin: 0; font-size: 18px; line-height: 1.35; }
  .lede { max-width: 780px; margin: 0; color: var(--muted); font-size: 17px; }
  .notice {
    max-width: 980px;
    margin: 22px 0;
    padding: 14px 16px;
    border-left: 4px solid var(--warning);
    background: var(--warning-soft);
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-width: 980px;
    margin: 24px 0 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .fact { padding: 14px 12px; border-right: 1px solid var(--line); }
  .fact:last-child { border-right: 0; }
  .fact span { display: block; color: var(--muted); font-size: 12px; }
  .fact strong { display: block; margin-top: 3px; font-size: 18px; }
  .journey-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    max-width: 980px;
    margin-top: 20px;
  }
  .journey-link {
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
  }
  .journey-link strong { display: block; margin-bottom: 4px; }
  .journey-link span { color: var(--muted); font-size: 13px; }
  .capture-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
    max-width: 1120px;
  }
  figure {
    margin: 0;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
  }
  figure.wide { grid-column: 1 / -1; }
  figure img {
    display: block;
    width: auto;
    max-width: 100%;
    max-height: 780px;
    margin: 14px auto;
    border: 1px solid #e7e9e5;
    background: #fff;
    object-fit: contain;
  }
  .capture-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 0;
  }
  .tag {
    display: inline-block;
    padding: 3px 7px;
    border: 1px solid #cdd4cb;
    border-radius: 4px;
    background: var(--soft);
    color: #3e443d;
    font-size: 12px;
  }
  .questions { margin: 12px 0 0; padding-left: 20px; color: #424640; }
  .state-link { display: inline-block; margin-top: 10px; font-size: 13px; }
  .reference-groups { max-width: 1120px; }
  .reference-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }
  .reference-grid figure { padding: 10px; }
  .reference-grid figure img { margin: 8px auto; max-height: 480px; }
  .reference-grid figcaption { font-size: 12px; overflow-wrap: anywhere; }
  .footer {
    max-width: 980px;
    margin-top: 54px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .shell { display: block; }
    nav {
      position: static;
      min-height: 0;
      padding: 14px 16px;
    }
    nav strong, nav p { display: none; }
    nav .links { display: flex; gap: 4px; overflow-x: auto; }
    nav a {
      flex: 0 0 auto;
      padding: 8px 10px;
      border: 0;
      border-radius: 4px;
      font-size: 13px;
    }
    main { padding: 24px 14px 52px; }
    h1 { font-size: 26px; }
    .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fact:nth-child(2) { border-right: 0; }
    .fact:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
    .journey-links, .capture-list, .reference-grid { grid-template-columns: 1fr; }
    figure.wide { grid-column: auto; }
  }
`;

const nav = (current) => `
  <nav aria-label="오프라인 검토 화면">
    <strong>FlowMe P35</strong>
    <p>Vercel 없이 보는 독립 검토 자료</p>
    <div class="links">
      <a href="index.html"${current === 'index' ? ' aria-current="page"' : ''}>안내</a>
      <a href="public-flow.html"${current === 'public' ? ' aria-current="page"' : ''}>공개 Flow</a>
      <a href="my-flow.html"${current === 'myFlow' ? ' aria-current="page"' : ''}>내 Flow</a>
      <a href="calendar.html"${current === 'calendar' ? ' aria-current="page"' : ''}>캘린더</a>
      <a href="export.html"${current === 'export' ? ' aria-current="page"' : ''}>가져가기</a>
      <a href="reference-gallery.html"${current === 'reference' ? ' aria-current="page"' : ''}>전체 증거</a>
    </div>
  </nav>
`;

const page = ({ title, current, body }) => `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · FlowMe P35</title>
  <style>${pageStyles}</style>
</head>
<body>
  <div class="shell">
    ${nav(current)}
    <main>
      ${body}
      <footer class="footer">
        이 자료는 로컬 P35 빌드를 자동 브라우저로 캡처한 검토 근거다.
        실제 사용자 관찰 수는 0이며, 캡처나 시뮬레이션을 사용자 검증으로 해석하면 안 된다.
      </footer>
    </main>
  </div>
</body>
</html>
`;

const captureByFile = new Map(
  previewManifest.captures.map((capture) => [capture.file, capture]),
);

const captureFigure = (capture) => {
  const snapshotName = path.posix.basename(capture.snapshot);
  const isWide = capture.viewport.startsWith('1024') || capture.viewport.startsWith('1440');
  return `
    <figure${isWide ? ' class="wide"' : ''}>
      <h3>${escapeHtml(capture.label)}</h3>
      <div class="capture-meta">
        <span class="tag">${escapeHtml(capture.route)}</span>
        <span class="tag">${escapeHtml(capture.viewport)}</span>
        <span class="tag">${escapeHtml(capture.state)}</span>
        <span class="tag">오류 ${capture.consoleAndPageErrorCount}</span>
      </div>
      <a
        href="${escapeHtml(capture.file)}"
        aria-label="${escapeHtml(capture.label)} 원본 이미지 열기"
      >
        <img src="${escapeHtml(capture.file)}" alt="${escapeHtml(capture.label)} 화면 캡처">
      </a>
      <ul class="questions">
        ${capture.reviewQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}
      </ul>
      <a class="state-link" href="state-snapshots/${escapeHtml(snapshotName)}">
        당시 보인 제목·조작·본문 JSON 열기
      </a>
    </figure>
  `;
};

const focusedPage = (key) => {
  const theme = reviewThemes[key];
  const captures = theme.files.map((file) => captureByFile.get(file));
  return page({
    title: theme.title,
    current: key,
    body: `
      <header class="page-head">
        <p class="eyebrow">Current local browser capture</p>
        <h1>${escapeHtml(theme.title)}</h1>
        <p class="lede">${escapeHtml(theme.summary)}</p>
      </header>
      <div class="notice">
        이미지는 클릭하면 원본 크기로 열린다. 각 화면 아래 JSON에는 해당 상태에서
        실제로 보인 제목, accessible action 이름, test id, 본문, 오류가 들어 있다.
      </div>
      <section class="capture-list">
        ${captures.map(captureFigure).join('')}
      </section>
    `,
  });
};

const exportCurrent = previewManifest.captures.find(
  (capture) => capture.state === 'public_secondary_export',
);
const exportReference = referenceEntries.filter(
  (entry) => entry.package === '2026-07-26-p35-07-export-scope-first-evidence',
);

const indexHtml = page({
  title: '오프라인 검토 안내',
  current: 'index',
  body: `
    <header class="page-head">
      <p class="eyebrow">Offline review bundle</p>
      <h1>Vercel 없이 검토하는 FlowMe P35</h1>
      <p class="lede">
        이 묶음은 공개 Flow의 결과·조정·저장·가져가기, My Flow의 실행·수정·기록,
        Calendar의 날짜별 실행 상태를 정적 화면과 구조화 JSON으로 재현한다.
      </p>
    </header>
    <div class="notice">
      Vercel 접속이 막히면 이 <strong>index.html</strong>부터 검토한다.
      화면은 2026-07-27 로컬 P35 빌드에서 새로 캡처했으며 실제 사용자 관찰은 아니다.
    </div>
    <section class="facts" aria-label="검토 자료 수치">
      <div class="fact"><span>현재 상태 캡처</span><strong>${previewManifest.captures.length}</strong></div>
      <div class="fact"><span>P35 참고 캡처</span><strong>${referenceEntries.length}</strong></div>
      <div class="fact"><span>캡처 오류</span><strong>${previewManifest.failures.length}</strong></div>
      <div class="fact"><span>관찰 사용자</span><strong>0</strong></div>
    </section>
    <h2>순서대로 검토하기</h2>
    <div class="journey-links">
      <a class="journey-link" href="public-flow.html">
        <strong>1. 공개 Flow</strong>
        <span>결과 → 한 종류 조정 → 저장 또는 가져가기 → receipt</span>
      </a>
      <a class="journey-link" href="my-flow.html">
        <strong>2. 내 Flow</strong>
        <span>다음 행동 → 항목 상세·수정 → 전체 계획 → 기록 → 완료 복구</span>
      </a>
      <a class="journey-link" href="calendar.html">
        <strong>3. 캘린더</strong>
        <span>월간 날짜 lens → 선택일 agenda → Flow에서 열기</span>
      </a>
      <a class="journey-link" href="export.html">
        <strong>4. 가져가기</strong>
        <span>Flow 전체·선택 항목·현재 항목 범위와 결과 확인</span>
      </a>
      <a class="journey-link" href="reference-gallery.html">
        <strong>5. P35 전체 증거</strong>
        <span>P35-01부터 P35-08까지 ${referenceEntries.length}개 자동 캡처</span>
      </a>
      <a class="journey-link" href="../unified-review-prompt-ko.txt">
        <strong>6. 통합 검토 프롬프트</strong>
        <span>Codex와 Claude Design에 그대로 전달할 요청 원문</span>
      </a>
    </div>
    <h2>판단할 일곱 질문</h2>
    <ol>
      <li>저장 전 조정에서 항목 제목, 상세 내용, 날짜까지 자연스럽게 수정할 수 있어야 하는가?</li>
      <li>저장 완료 후 오늘 할 일보다 저장된 전체 Flow 결과를 먼저 확인해야 하는가?</li>
      <li>다음 할 일은 같은 날짜의 항목을 한 실행 묶음으로 보여 줘야 하는가?</li>
      <li>공개 미리보기에서 FlowMe 저장과 외부 도구 가져가기를 함께 결정해야 하는가?</li>
      <li>완료 항목이 화면에서 사라질 때만 즉시 되돌리기가 필요한가?</li>
      <li>다음 행동 탭은 Flow 형태마다 충분히 구체적인 의미를 갖는가?</li>
      <li>기록 탭은 진행 기록, 단계 메모, 회고, 재사용을 명확히 구분하는가?</li>
    </ol>
    <h2>구조화 근거</h2>
    <div class="journey-links">
      <a class="journey-link" href="preview-manifest.json">
        <strong>현재 캡처 manifest</strong>
        <span>route, state, viewport, 검토 질문, 품질 수치</span>
      </a>
      <a class="journey-link" href="reference-manifest.json">
        <strong>P35 참고 캡처 manifest</strong>
        <span>원래 evidence package와 복사된 이미지 경로</span>
      </a>
      <a class="journey-link" href="render-check.json">
        <strong>오프라인 렌더링 검증</strong>
        <span>6개 HTML × 3개 viewport의 링크·overflow·이미지·오류 결과</span>
      </a>
      <a class="journey-link" href="../evaluation-matrix.json">
        <strong>평가 매트릭스</strong>
        <span>F01~F07 판정 기준과 surface ownership</span>
      </a>
      <a class="journey-link" href="../review-scenarios.json">
        <strong>사용자 여정 시나리오</strong>
        <span>형태별 세션과 확인할 상태 전이</span>
      </a>
    </div>
  `,
});

const exportHtml = page({
  title: '가져가기 범위와 결과',
  current: 'export',
  body: `
    <header class="page-head">
      <p class="eyebrow">Current + P35 evidence</p>
      <h1>가져가기 범위와 결과 확인</h1>
      <p class="lede">
        공개 Flow에서 외부 결과를 고르는 위치와 My Flow에서 전체·선택·현재 범위를
        내보내는 구조를 함께 본다. 형식보다 대상과 개수를 먼저 예측할 수 있는지 평가한다.
      </p>
    </header>
    <section class="capture-list">
      ${captureFigure(exportCurrent)}
      ${exportReference
        .map(
          (entry) => `
            <figure>
              <h3>${escapeHtml(path.posix.basename(entry.file, '.png'))}</h3>
              <div class="capture-meta">
                <span class="tag">P35-07</span>
                <span class="tag">자동 캡처</span>
              </div>
              <a
                href="${escapeHtml(entry.file)}"
                aria-label="${escapeHtml(path.posix.basename(entry.file, '.png'))} 원본 이미지 열기"
              >
                <img src="${escapeHtml(entry.file)}" alt="${escapeHtml(path.posix.basename(entry.file))} 화면 캡처">
              </a>
            </figure>
          `,
        )
        .join('')}
    </section>
  `,
});

const referenceGroups = referencePackages
  .map((packageEntry) => {
    const entries = referenceEntries.filter((entry) => entry.package === packageEntry.name);
    return `
      <section>
        <h2>${escapeHtml(packageLabels[packageEntry.name])} <small>(${entries.length})</small></h2>
        <div class="reference-grid">
          ${entries
            .map(
              (entry) => `
                <figure>
                  <a
                    href="${escapeHtml(entry.file)}"
                    aria-label="${escapeHtml(path.posix.basename(entry.file, '.png'))} 원본 이미지 열기"
                  >
                    <img src="${escapeHtml(entry.file)}" alt="${escapeHtml(path.posix.basename(entry.file))} 캡처">
                  </a>
                  <figcaption>${escapeHtml(path.posix.basename(entry.file))}</figcaption>
                </figure>
              `,
            )
            .join('')}
        </div>
      </section>
    `;
  })
  .join('');

const referenceHtml = page({
  title: 'P35 전체 증거',
  current: 'reference',
  body: `
    <header class="page-head">
      <p class="eyebrow">Automated evidence gallery</p>
      <h1>P35-01~P35-08 전체 캡처</h1>
      <p class="lede">
        이전 P35 slice에서 남긴 ${referenceEntries.length}개 화면을 오프라인으로 복사했다.
        현재 상태 캡처와 모순이 있으면 현재 로컬 캡처와 current source를 우선한다.
      </p>
    </header>
    <div class="notice">
      이 갤러리는 상태 범위를 넓게 보는 보조 자료다. 구현 완료나 실제 사용자 이해를
      증명하지 않으며, 각 이미지의 원래 package는 reference-manifest.json에서 확인한다.
    </div>
    <div class="reference-groups">${referenceGroups}</div>
  `,
});

await Promise.all([
  writeFile(path.join(offlineRoot, 'index.html'), indexHtml, 'utf8'),
  writeFile(path.join(offlineRoot, 'public-flow.html'), focusedPage('public'), 'utf8'),
  writeFile(path.join(offlineRoot, 'my-flow.html'), focusedPage('myFlow'), 'utf8'),
  writeFile(path.join(offlineRoot, 'calendar.html'), focusedPage('calendar'), 'utf8'),
  writeFile(path.join(offlineRoot, 'export.html'), exportHtml, 'utf8'),
  writeFile(path.join(offlineRoot, 'reference-gallery.html'), referenceHtml, 'utf8'),
]);

const readme = `# FlowMe P35 오프라인 Preview

- 생성일: ${new Date().toISOString()}
- 캡처 source: \`${previewManifest.baseUrl}\`
- current local browser capture: \`${previewManifest.captures.length}\`
- P35 reference screenshot: \`${referenceEntries.length}\`
- capture failure: \`${previewManifest.failures.length}\`
- observed-user count: \`0\`

## 시작 파일

Vercel에 접근할 수 없으면 [index.html](./index.html)을 브라우저에서 연다.
서버, 외부 CSS, 외부 JavaScript 없이 동작한다.

## 화면별 파일

1. [공개 Flow](./public-flow.html)
2. [내 Flow](./my-flow.html)
3. [캘린더](./calendar.html)
4. [가져가기](./export.html)
5. [P35 전체 증거](./reference-gallery.html)

## 구조화 evidence

- [현재 캡처 manifest](./preview-manifest.json)
- [P35 참고 캡처 manifest](./reference-manifest.json)
- [오프라인 렌더링 검증](./render-check.json)
- \`state-snapshots/\`: 각 화면에서 보인 heading, accessible action, test id, 본문,
  viewport, overflow, console/page error

## Evidence 경계

- 현재 18장은 로컬 P35 빌드의 자동 브라우저 캡처다.
- 참고 ${referenceEntries.length}장은 P35-01~P35-08 자동 evidence에서 복사했다.
- 둘 다 실제 사용자 관찰이 아니다.
- Preview, 캡처, current source가 다르면 current source와 재현 가능한 current
  interaction을 우선하고 차이를 기록한다.
`;
await writeFile(path.join(offlineRoot, 'README.md'), readme, 'utf8');

console.log(
  JSON.stringify(
    {
      offlineRoot,
      currentCaptureCount: previewManifest.captures.length,
      referenceCaptureCount: referenceEntries.length,
      htmlFileCount: 6,
    },
    null,
    2,
  ),
);
