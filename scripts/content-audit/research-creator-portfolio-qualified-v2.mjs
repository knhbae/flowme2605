import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDataPath = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-23-creator-flow-portfolio-data-v1.json',
);
const assetDir = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-27-creator-portfolio-qualified-assets',
);
const outputPath = path.join(assetDir, 'targeted-revalidation-v2.json');
const observedAt = '2026-07-27';

const targetDefinitions = [
  { creatorId: 'home-ajd', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'home-ohouse', reviewRole: 'top_recheck' },
  { creatorId: 'family-babyfood016', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'family-babybilly', reviewRole: 'top_recheck' },
  { creatorId: 'study-mansour', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'study-opentutorials', reviewRole: 'top_recheck' },
  { creatorId: 'money-getcha', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'money-zzanboo', reviewRole: 'top_recheck' },
  { creatorId: 'health-allblanc', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'health-bigsis', reviewRole: 'top_recheck' },
  { creatorId: 'meals-wtable', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'work-andstudio', reviewRole: 'logic_handoff_candidate' },
  { creatorId: 'travel-triple', reviewRole: 'boundary_recheck' },
  { creatorId: 'hobby-bodeum', reviewRole: 'boundary_recheck' },
  { creatorId: 'hobby-fitpet', reviewRole: 'boundary_recheck' },
];

const sourceOverrides = {
  'health-allblanc':
    'https://www.youtube.com/playlist?list=PLhWr-n-L9kWj5NFTs11Yb8CpZeKC-edMq',
};

const headers = {
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function htmlDecode(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function decodeEscapes(value = '') {
  return htmlDecode(
    value
      .replaceAll('\\u0026', '&')
      .replaceAll('\\/', '/')
      .replaceAll('\\"', '"')
      .replaceAll('\\n', '\n'),
  );
}

function firstMatch(input, patterns) {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function textFromHtml(html) {
  return htmlDecode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFetchUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'blog.naver.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const blogId = parsed.searchParams.get('blogId') || parts[0];
      const logNo = parsed.searchParams.get('logNo') || parts[1];
      if (blogId && logNo && /^\d+$/.test(logNo)) {
        return `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${encodeURIComponent(logNo)}`;
      }
    }
  } catch {
    return url;
  }
  return url;
}

async function fetchText(url, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(normalizeFetchUrl(url), {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      return {
        requestedUrl: url,
        fetchUrl: normalizeFetchUrl(url),
        finalUrl: response.url,
        status: response.status,
        ok: response.ok,
        body,
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return {
    requestedUrl: url,
    fetchUrl: normalizeFetchUrl(url),
    finalUrl: null,
    status: null,
    ok: false,
    body: '',
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

function basePageEvidence(result) {
  const title =
    htmlDecode(
      firstMatch(result.body, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]) || '',
    )
      .replace(/\s+/g, ' ')
      .trim() || null;
  const description =
    htmlDecode(
      firstMatch(result.body, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ]) || '',
    )
      .replace(/\s+/g, ' ')
      .trim() || null;
  const text = textFromHtml(result.body);
  const demandSignals = unique([
    ...[...text.matchAll(/(?:조회|조회수|views?)\s*[:：]?\s*([\d,.만천억KMBkmb+]+)/gi)].map(
      (match) => `조회 ${match[1]}`,
    ),
    ...[
      ...text.matchAll(
        /(?:저장|스크랩|좋아요|구독|다운로드|수강생|참여자|리뷰)\s*[:：]?\s*([\d,.만천억KMBkmb+]+)/gi,
      ),
    ].map((match) => match[0]),
  ]).slice(0, 12);
  const communicationSignals = unique([
    ...[
      ...text.matchAll(
        /(?:댓글|질문|후기|리뷰|자료\s*요청|파일\s*요청|비밀번호)\s*[:：]?\s*([\d,.만천억KMBkmb+]*)/gi,
      ),
    ].map((match) => match[0].trim()),
  ])
    .filter((value) => value.length > 1)
    .slice(0, 12);
  const shapeSignals = unique([
    result.body.includes('<table') ? 'html_table' : null,
    /체크\s*리스트|체크리스트/.test(text) ? 'checklist' : null,
    /계획표|일정표|식단표/.test(text) ? 'plan_or_table' : null,
    /(?:D[+-]\d+|\d+\s*주차|\d+\s*회차|\d+\s*단계|STEP\s*\d+)/i.test(text)
      ? 'ordered_or_timed_rows'
      : null,
    /PDF|XLSX|엑셀|다운로드|노션|템플릿/i.test(text)
      ? 'download_or_template'
      : null,
    /재생목록|시리즈|커리큘럼|강의\s*목록/i.test(text)
      ? 'series_or_curriculum'
      : null,
  ]);
  const businessSignals = unique([
    /상담|예약|견적/.test(text) ? 'consultation_or_booking' : null,
    /구매|상품|쇼핑|스토어/.test(text) ? 'commerce' : null,
    /강의|수강|클래스|챌린지/.test(text) ? 'course_or_challenge' : null,
    /제휴|파트너|협업|비즈니스\s*문의/.test(text) ? 'partnership' : null,
    /뉴스레터|멤버십|구독/.test(text) ? 'subscription_or_membership' : null,
  ]);
  return {
    requestedUrl: result.requestedUrl,
    fetchUrl: result.fetchUrl,
    finalUrl: result.finalUrl,
    status: result.status,
    opened: Boolean(result.ok && result.body.length > 300),
    title,
    description,
    demandSignals,
    communicationSignals,
    shapeSignals,
    businessSignals,
    textExcerpt: text.slice(0, 1800),
    htmlBytes: Buffer.byteLength(result.body),
    error: result.error || null,
  };
}

function youtubePageEvidence(result) {
  const evidence = basePageEvidence(result);
  const html = result.body;
  const description = decodeEscapes(
    firstMatch(html, [
      /"shortDescription":"([\s\S]*?)","isCrawlable"/,
      /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/,
    ]) || '',
  );
  const chapters = unique(
    [...description.matchAll(/(?:^|\n)(\d{1,2}:\d{2}(?::\d{2})?\s+[^\n]+)/g)].map(
      (match) => match[1],
    ),
  ).slice(0, 30);
  return {
    ...evidence,
    platform: 'youtube',
    channelId: firstMatch(html, [
      /"channelId":"(UC[^"]+)"/,
      /"externalId":"(UC[^"]+)"/,
    ]),
    subscriberText:
      decodeEscapes(
        firstMatch(html, [
          /"subscriberCountText":\{"simpleText":"([^"]+)"/,
          /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/,
        ]) || '',
      ) || null,
    viewCount:
      Number(
        firstMatch(html, [/"viewCount":"(\d+)"/, /"interactionCount":"(\d+)"/]),
      ) || null,
    commentCountText:
      decodeEscapes(
        firstMatch(html, [
          /"commentCount":\{"simpleText":"([^"]+)"/,
          /"countText":\{"runs":\[\{"text":"([^"]+)"\}\]\}/,
        ]) || '',
      ) || null,
    publishDate: firstMatch(html, [
      /"publishDate":"([^"]+)"/,
      /"uploadDate":"([^"]+)"/,
    ]),
    chapters,
    initialVideoIds: unique(
      [...html.matchAll(/"videoId":"([^"]+)"/g)].map((match) => match[1]),
    ).slice(0, 20),
    descriptionExcerpt: description.slice(0, 1800) || null,
  };
}

async function inspectUrl(url) {
  const result = await fetchText(url);
  return url.includes('youtube.com') || url.includes('youtu.be')
    ? youtubePageEvidence(result)
    : basePageEvidence(result);
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return output;
}

const sourceData = JSON.parse(await fs.readFile(sourceDataPath, 'utf8'));
const creatorsById = new Map(
  sourceData.creatorPortfolioRecords.map((record) => [record.creatorId, record]),
);
const examplesByCreator = new Map(
  sourceData.representativeFlowExamples.map((example) => [example.creatorId, example]),
);

await fs.mkdir(assetDir, { recursive: true });

const records = await mapLimit(targetDefinitions, 4, async (target) => {
  const creator = creatorsById.get(target.creatorId);
  if (!creator) throw new Error(`Unknown creatorId: ${target.creatorId}`);
  const example = examplesByCreator.get(target.creatorId);
  const sourceUrl =
    sourceOverrides[target.creatorId] ||
    example?.userContentBundle?.sourceUrls?.[0] ||
    creator.contentReviews?.[0]?.url;
  const [profile, representativeSource] = await Promise.all([
    inspectUrl(creator.profileUrl),
    sourceUrl ? inspectUrl(sourceUrl) : Promise.resolve(null),
  ]);
  return {
    creatorId: target.creatorId,
    creatorName: creator.name,
    categoryId: creator.categoryId,
    categoryLabel: creator.categoryLabel,
    reviewRole: target.reviewRole,
    observationWindow: {
      from: sourceData.observedAt,
      to: observedAt,
    },
    profile,
    representativeSource,
    priorEvidence: {
      observedAt: sourceData.observedAt,
      openedContentCount: creator.observedMetrics.openedContentCount,
      demandSummary: creator.demandEvidence,
      communicationSummary: creator.communicationEvidence,
      sourceRowSummary: creator.portfolioDepthEvidence,
    },
  };
});

const output = {
  schemaVersion: 'flowme-creator-portfolio-targeted-revalidation-v2',
  generatedAt: new Date().toISOString(),
  observedAt,
  purpose:
    '2026-07-23 제작자 포트폴리오의 상위 12명과 경계 3명을 표적 재열람한 증거 원장',
  evidenceBoundary: [
    'opened=true는 조사 시점에 해당 URL의 응답 본문을 실제 수신했다는 뜻이다.',
    'visible metric이 보이지 않으면 null 또는 빈 배열로 남기며 추정하지 않는다.',
    '기존 2026-07-23 증거와 새 관측값은 observationWindow로 구분한다.',
    '댓글 존재는 audience activity이며 제작자 응답을 뜻하지 않는다.',
    '권리 상태는 페이지 접근 가능 여부와 별도로 판정한다.',
  ],
  summary: {
    targetedCreators: records.length,
    topRechecks: records.filter((record) => record.reviewRole !== 'boundary_recheck')
      .length,
    boundaryRechecks: records.filter(
      (record) => record.reviewRole === 'boundary_recheck',
    ).length,
    profileUrlsOpened: records.filter((record) => record.profile.opened).length,
    representativeSourceUrlsOpened: records.filter(
      (record) => record.representativeSource?.opened,
    ).length,
  },
  records,
};

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, summary: output.summary }, null, 2));
