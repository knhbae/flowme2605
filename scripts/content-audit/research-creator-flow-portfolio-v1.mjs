import fs from 'node:fs/promises';
import path from 'node:path';
import {
  candidateProfiles,
  deepCreatorProfiles,
  knownYouTubeContentUrls,
  observedAt,
  staticContentUrls,
} from './creator-flow-portfolio-v1-data.mjs';

const repoRoot = process.cwd();
const assetDir = path.join(repoRoot, 'docs', 'content-audit', '2026-07-23-creator-flow-portfolio-assets');
const ledgerPath = path.join(assetDir, 'opened-creator-url-ledger-v1.json');
const headers = {
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
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
  return htmlDecode(value
    .replaceAll('\\u0026', '&')
    .replaceAll('\\/', '/')
    .replaceAll('\\"', '"')
    .replaceAll('\\n', '\n'));
}

function firstMatch(input, patterns) {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function textFromHtml(html) {
  return htmlDecode(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
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
        signal: AbortSignal.timeout(25_000),
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
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
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

function parsePageEvidence(result) {
  const { body } = result;
  const title = htmlDecode(firstMatch(body, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]) || '').replace(/\s+/g, ' ').trim() || null;
  const description = htmlDecode(firstMatch(body, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  ]) || '').replace(/\s+/g, ' ').trim() || null;
  const text = textFromHtml(body);
  const demandSignals = unique([
    ...[...text.matchAll(/(?:조회|조회수|views?)\s*[:：]?\s*([\d,.만천억KMBkmb+]+)/gi)].map((match) => `조회 ${match[1]}`),
    ...[...text.matchAll(/(?:저장|스크랩|좋아요|구독|다운로드|수강생|참여자|리뷰)\s*[:：]?\s*([\d,.만천억KMBkmb+]+)/gi)].map((match) => match[0]),
  ]).slice(0, 10);
  const communicationSignals = unique([
    ...[...text.matchAll(/(?:댓글|질문|후기|리뷰|자료\s*요청|파일\s*요청)\s*[:：]?\s*([\d,.만천억KMBkmb+]*)/gi)].map((match) => match[0].trim()),
  ]).filter((value) => value.length > 1).slice(0, 10);
  const shapeSignals = unique([
    body.includes('<table') ? 'html_table' : null,
    /체크\s*리스트|체크리스트/.test(text) ? 'checklist' : null,
    /계획표|일정표|식단표/.test(text) ? 'plan_or_table' : null,
    /(?:D[+-]\d+|\d+\s*주차|\d+\s*회차|\d+\s*단계|STEP\s*\d+)/i.test(text) ? 'ordered_or_timed_rows' : null,
    /PDF|XLSX|엑셀|다운로드|노션|템플릿/i.test(text) ? 'download_or_template' : null,
    /재생목록|시리즈|커리큘럼|강의\s*목록/i.test(text) ? 'series_or_curriculum' : null,
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
    opened: Boolean(result.ok && body.length > 300),
    title,
    description,
    demandSignals,
    communicationSignals,
    shapeSignals,
    businessSignals,
    textExcerpt: text.slice(0, 1800),
    htmlBytes: Buffer.byteLength(body),
    error: result.error || null,
  };
}

function parseChannelEvidence(result) {
  const html = result.body;
  const channelId = firstMatch(html, [
    /"channelId":"(UC[^"]+)"/,
    /"externalId":"(UC[^"]+)"/,
    /<link[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[^"]+)"/,
  ]);
  const title = decodeEscapes(firstMatch(html, [
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
    /<title>([^<]+)<\/title>/,
  ]) || '');
  const description = decodeEscapes(firstMatch(html, [
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/,
    /<meta[^>]+name="description"[^>]+content="([^"]*)"/,
  ]) || '');
  const subscriberText = decodeEscapes(firstMatch(html, [
    /"subscriberCountText":\{"simpleText":"([^"]+)"/,
    /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/,
  ]) || '');
  const initialVideoIds = unique([...html.matchAll(/"videoId":"([^"]+)"/g)].map((match) => match[1])).slice(0, 16);
  return {
    requestedUrl: result.requestedUrl,
    fetchUrl: result.fetchUrl,
    finalUrl: result.finalUrl,
    status: result.status,
    opened: Boolean(result.ok && html.length > 10_000),
    title: title || null,
    description: description || null,
    channelId,
    subscriberText: subscriberText || null,
    initialVideoUrls: initialVideoIds.map((id) => `https://www.youtube.com/watch?v=${id}`),
    businessSignals: unique([
      /비즈니스|business|협업|collab/i.test(description) ? 'business_contact' : null,
      /강의|클래스|course/i.test(description) ? 'course' : null,
      /책|도서|book/i.test(description) ? 'book' : null,
      /멤버십|membership/i.test(description) ? 'membership' : null,
      /쇼핑|shop|store/i.test(description) ? 'commerce' : null,
    ]),
    htmlBytes: Buffer.byteLength(html),
    error: result.error || null,
  };
}

async function fetchFeedVideos(channelId) {
  if (!channelId) return [];
  const result = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  if (!result.ok) return [];
  return [...result.body.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<published>([^<]+)<\/published>[\s\S]*?<\/entry>/g)]
    .map((match) => ({
      videoId: match[1],
      title: htmlDecode(match[2]),
      publishedAt: match[3],
      url: `https://www.youtube.com/watch?v=${match[1]}`,
    }));
}

function textValue(value) {
  if (!value) return null;
  if (typeof value.simpleText === 'string') return decodeEscapes(value.simpleText);
  if (Array.isArray(value.runs)) return value.runs.map((run) => decodeEscapes(run.text || '')).join('');
  return null;
}

function collectYouTubeNodes(value, output) {
  if (!value || typeof value !== 'object') return;
  if (value.commentsEntryPointHeaderRenderer) {
    const header = value.commentsEntryPointHeaderRenderer;
    output.commentCountText ||= textValue(header.commentCount) || textValue(header.headerText);
  }
  if (value.commentsHeaderRenderer) {
    const count = textValue(value.commentsHeaderRenderer.countText);
    if (count && /\d/.test(count)) output.commentCountText = count;
  }
  const comment = value.commentThreadRenderer?.comment?.commentRenderer;
  if (comment && output.topComments.length < 5) {
    const text = textValue(comment.contentText);
    if (text && !output.topComments.some((entry) => entry.text === text)) {
      output.topComments.push({
        author: textValue(comment.authorText),
        text: text.slice(0, 360),
        likes: textValue(comment.voteCount),
      });
    }
  }
  const token = value.continuationEndpoint?.continuationCommand?.token;
  if (token && !output.continuationTokens.includes(token)) output.continuationTokens.push(token);
  for (const child of Object.values(value)) collectYouTubeNodes(child, output);
}

function collectCommentSections(value, output) {
  if (!value || typeof value !== 'object') return;
  if (value.itemSectionRenderer?.targetId === 'comments-section') {
    collectYouTubeNodes(value.itemSectionRenderer, output);
    return;
  }
  if (value.commentsEntryPointHeaderRenderer) collectYouTubeNodes(value, output);
  for (const child of Object.values(value)) collectCommentSections(child, output);
}

async function fetchYouTubeComments(html, videoId) {
  const apiKey = firstMatch(html, [/"INNERTUBE_API_KEY":"([^"]+)"/]);
  const clientVersion = firstMatch(html, [/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/]);
  if (!apiKey || !clientVersion) return { commentCountText: null, topComments: [], error: 'youtube_api_config_missing' };
  const endpoint = `https://www.youtube.com/youtubei/v1/next?key=${encodeURIComponent(apiKey)}`;
  const baseBody = {
    context: { client: { clientName: 'WEB', clientVersion, hl: 'ko', gl: 'KR' } },
  };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        ...baseBody,
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { commentCountText: null, topComments: [], error: `youtube_next_${response.status}` };
    const output = { commentCountText: null, topComments: [], continuationTokens: [] };
    collectCommentSections(await response.json(), output);
    for (const continuation of output.continuationTokens.slice(0, 2)) {
      if (output.topComments.length >= 3) break;
      const continuationResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ ...baseBody, continuation }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!continuationResponse.ok) continue;
      collectYouTubeNodes(await continuationResponse.json(), output);
    }
    return {
      commentCountText: output.commentCountText,
      topComments: output.topComments.slice(0, 3),
      error: null,
    };
  } catch (error) {
    return { commentCountText: null, topComments: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function videoIdFrom(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:shorts|live)\/([\w-]{11})/)?.[1] || null;
  } catch {
    return /^[\w-]{11}$/.test(url) ? url : null;
  }
}

async function inspectYouTubeVideo(url) {
  const videoId = videoIdFrom(url);
  if (!videoId) return { requestedUrl: url, opened: false, error: 'video_id_missing' };
  const result = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  const html = result.body;
  const comments = result.ok ? await fetchYouTubeComments(html, videoId) : { commentCountText: null, topComments: [], error: null };
  const description = decodeEscapes(firstMatch(html, [
    /"shortDescription":"([\s\S]*?)","isCrawlable"/,
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/,
  ]) || '');
  const chapters = unique([...description.matchAll(/(?:^|\n)(\d{1,2}:\d{2}(?::\d{2})?\s+[^\n]+)/g)].map((match) => match[1])).slice(0, 30);
  return {
    requestedUrl: url,
    finalUrl: result.finalUrl,
    status: result.status,
    opened: Boolean(result.ok && html.length > 10_000),
    platform: 'youtube',
    videoId,
    title: decodeEscapes(firstMatch(html, [
      /"title":"([^"]+)","lengthSeconds"/,
      /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
    ]) || '') || null,
    author: decodeEscapes(firstMatch(html, [
      /"author":"([^"]+)","channelId"/,
      /<link[^>]+itemprop="name"[^>]+content="([^"]+)"/,
    ]) || '') || null,
    channelId: firstMatch(html, [/"channelId":"(UC[^"]+)"/]),
    viewCount: Number(firstMatch(html, [/"viewCount":"(\d+)"/, /"interactionCount":"(\d+)"/])) || null,
    likeCount: Number(firstMatch(html, [/"likeCount":"?(\d+)"?/, /"defaultText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,]+) likes"/])) || null,
    commentCountText: comments.commentCountText,
    topComments: comments.topComments,
    publishDate: firstMatch(html, [/"publishDate":"([^"]+)"/, /"uploadDate":"([^"]+)"/]),
    lengthSeconds: Number(firstMatch(html, [/"lengthSeconds":"(\d+)"/])) || null,
    descriptionExcerpt: description.slice(0, 1600) || null,
    chapters,
    shapeSignals: unique([
      chapters.length > 1 ? 'chapter_rows' : null,
      /DAY\s*\d+|Day\s*\d+|\d+\s*일|챌린지/i.test(description) ? 'day_or_challenge_rows' : null,
      /STEP\s*\d+|\d+\s*단계/i.test(description) ? 'ordered_rows' : null,
      /재생목록|playlist/i.test(description) ? 'playlist' : null,
    ]),
    businessSignals: unique([
      /비즈니스|business|협업|collab/i.test(description) ? 'business_contact' : null,
      /책|도서|book/i.test(description) ? 'book' : null,
      /강의|클래스|course/i.test(description) ? 'course' : null,
      /구매|쇼핑|store|shop/i.test(description) ? 'commerce' : null,
      /멤버십|membership/i.test(description) ? 'membership' : null,
    ]),
    commentFetchError: comments.error,
    htmlBytes: Buffer.byteLength(html),
    error: result.error || null,
  };
}

function extractRecipeUrls(html, baseUrl, limit = 6) {
  const urls = [];
  for (const match of html.matchAll(/href=["']([^"']*\/recipe\/\d+[^"']*)["']/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      url.search = '';
      url.hash = '';
      if (!urls.includes(url.href)) urls.push(url.href);
      if (urls.length >= limit) break;
    } catch {
      // Ignore malformed links.
    }
  }
  return urls;
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
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

await fs.mkdir(assetDir, { recursive: true });

const profileEvidence = await mapLimit(candidateProfiles, 6, async (candidate) => {
  const result = await fetchText(candidate.profileUrl);
  const evidence = candidate.platform === 'youtube'
    ? parseChannelEvidence(result)
    : parsePageEvidence(result);
  return { candidateId: candidate.candidateId, ...evidence };
});

const profileById = new Map(profileEvidence.map((entry) => [entry.candidateId, entry]));
const contentEvidenceByCreator = {};

for (const creator of deepCreatorProfiles) {
  let contentUrls = [...(staticContentUrls[creator.candidateId] || [])];
  if (creator.candidateId === 'meals-10000recipe') {
    const profile = profileById.get(creator.candidateId);
    const page = await fetchText(profile?.finalUrl || creator.profileUrl);
    contentUrls = extractRecipeUrls(page.body, page.finalUrl || creator.profileUrl, 5);
  }
  if (creator.platform === 'youtube') {
    const profile = profileById.get(creator.candidateId);
    const known = knownYouTubeContentUrls[creator.candidateId] || [];
    const feed = await fetchFeedVideos(profile?.channelId);
    contentUrls = unique([
      ...known,
      ...feed.map((video) => video.url),
      ...(profile?.initialVideoUrls || []),
    ]).slice(0, 4);
  }

  const evidence = await mapLimit(contentUrls, creator.platform === 'youtube' ? 1 : 3, async (url) => {
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) return inspectYouTubeVideo(url);
    return {
      platform: creator.platform,
      ...parsePageEvidence(await fetchText(url)),
    };
  });
  contentEvidenceByCreator[creator.candidateId] = evidence;
}

const deepCreatorEvidence = deepCreatorProfiles.map((creator) => ({
  creatorId: creator.candidateId,
  profile: profileById.get(creator.candidateId),
  contents: contentEvidenceByCreator[creator.candidateId] || [],
}));

const successfulProfiles = profileEvidence.filter((entry) => entry.opened);
const contentEntries = deepCreatorEvidence.flatMap((creator) => creator.contents);
const successfulContents = contentEntries.filter((entry) => entry.opened);
const youtubeContents = contentEntries.filter((entry) => entry.platform === 'youtube');
const communicationContents = contentEntries.filter((entry) => (
  entry.commentCountText
  || entry.topComments?.length
  || entry.communicationSignals?.length
));
const rowStructuredContents = contentEntries.filter((entry) => (
  entry.chapters?.length
  || entry.shapeSignals?.length
));

const ledger = {
  schemaVersion: 'creator-flow-portfolio-opened-url-ledger-v1',
  generatedAt: new Date().toISOString(),
  observedAt,
  evidenceBoundary: [
    'opened=true는 조사 시점에 응답 본문을 실제 수신한 URL만 뜻한다.',
    '조회·댓글·구독 등 보이지 않는 수치는 추정하지 않고 null 또는 빈 배열로 남겼다.',
    'YouTube 댓글 수와 공개 댓글 일부는 공개 WEB 응답에서 확인했으며 로그인 전용 반응은 포함하지 않는다.',
    '검색 결과 제목만 확인한 URL은 콘텐츠 열람 수에 포함하지 않았다.',
  ],
  summary: {
    discoveredCreatorCandidates: candidateProfiles.length,
    profileUrlsAttempted: profileEvidence.length,
    profileUrlsOpened: successfulProfiles.length,
    deepCreators: deepCreatorProfiles.length,
    contentUrlsAttempted: contentEntries.length,
    contentUrlsOpened: successfulContents.length,
    youtubeContentUrlsOpened: youtubeContents.filter((entry) => entry.opened).length,
    contentsWithCommunicationEvidence: communicationContents.length,
    contentsWithRowStructureEvidence: rowStructuredContents.length,
  },
  profileEvidence,
  deepCreatorEvidence,
};

await fs.writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ledgerPath, summary: ledger.summary }, null, 2));
