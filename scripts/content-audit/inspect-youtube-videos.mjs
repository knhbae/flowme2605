const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('Usage: node scripts/content-audit/inspect-youtube-videos.mjs <video-url-or-id> [...]');
  process.exit(1);
}

const headers = {
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
};

function firstMatch(input, patterns) {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function videoIdFrom(value) {
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    return url.searchParams.get('v') || url.pathname.match(/\/shorts\/([\w-]{11})/)?.[1] || null;
  } catch {
    return null;
  }
}

function decode(value) {
  if (!value) return null;
  return value
    .replaceAll('\\u0026', '&')
    .replaceAll('\\/', '/')
    .replaceAll('\\"', '"')
    .replaceAll('\\n', '\n');
}

function collectUnique(input, patterns, limit = 12) {
  const values = [];
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      const value = decode(match[1]).replace(/\s+/g, ' ').trim();
      if (value && !values.includes(value)) values.push(value);
      if (values.length >= limit) return values;
    }
  }
  return values;
}

function textValue(value) {
  if (!value) return null;
  if (typeof value.simpleText === 'string') return decode(value.simpleText);
  if (Array.isArray(value.runs)) return value.runs.map((run) => decode(run.text || '')).join('');
  return null;
}

function collectYouTubeNodes(value, output) {
  if (!value || typeof value !== 'object') return;
  if (value.commentsEntryPointHeaderRenderer) {
    const header = value.commentsEntryPointHeaderRenderer;
    output.commentCountText ||= textValue(header.commentCount)
      || textValue(header.headerText)
      || textValue(header.teaserAvatar);
  }
  if (value.commentsHeaderRenderer) {
    const header = value.commentsHeaderRenderer;
    const count = textValue(header.countText);
    if (count && /\d/.test(count)) output.commentCountText = count;
  }
  if (value.commentThreadRenderer?.comment?.commentRenderer) {
    const comment = value.commentThreadRenderer.comment.commentRenderer;
    const entry = {
      author: textValue(comment.authorText),
      text: textValue(comment.contentText),
      likes: textValue(comment.voteCount),
      published: textValue(comment.publishedTimeText),
    };
    if (entry.text && !output.comments.some((item) => item.text === entry.text)) output.comments.push(entry);
  }
  if (value.continuationEndpoint?.continuationCommand?.token) {
    const token = value.continuationEndpoint.continuationCommand.token;
    if (!output.continuationTokens.includes(token)) output.continuationTokens.push(token);
  }
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

async function fetchComments(html, videoId) {
  const apiKey = firstMatch(html, [/"INNERTUBE_API_KEY":"([^"]+)"/]);
  const clientVersion = firstMatch(html, [/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/]);
  if (!apiKey || !clientVersion) return { commentCountText: null, comments: [], error: 'youtube_api_config_missing' };

  const endpoint = `https://www.youtube.com/youtubei/v1/next?key=${encodeURIComponent(apiKey)}`;
  const baseBody = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion,
        hl: 'ko',
        gl: 'KR',
      },
    },
  };
  const firstResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ ...baseBody, videoId, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!firstResponse.ok) {
    return { commentCountText: null, comments: [], error: `youtube_next_${firstResponse.status}` };
  }
  const firstPayload = await firstResponse.json();
  const collected = { commentCountText: null, comments: [], continuationTokens: [] };
  collectCommentSections(firstPayload, collected);

  for (const continuation of collected.continuationTokens.slice(0, 3)) {
    if (collected.comments.length >= 5) break;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ ...baseBody, continuation }),
    });
    if (!response.ok) continue;
    collectYouTubeNodes(await response.json(), collected);
  }

  return {
    commentCountText: collected.commentCountText,
    comments: collected.comments.slice(0, 5),
    error: null,
  };
}

async function fetchTranscript(html) {
  const rawUrl = firstMatch(html, [/"captionTracks":\[\{"baseUrl":"([^"]+)"/]);
  if (!rawUrl) return { language: null, text: null, error: 'captions_unavailable' };
  const language = decode(firstMatch(html, [/"captionTracks":\[\{[\s\S]{0,2000}?"languageCode":"([^"]+)"/]));
  const captionUrl = new URL(decode(rawUrl));
  captionUrl.searchParams.set('fmt', 'json3');
  const response = await fetch(captionUrl, { headers, redirect: 'follow' });
  if (!response.ok) return { language, text: null, error: `captions_${response.status}` };
  const body = await response.text();
  let text;
  if (body.trim().startsWith('{')) {
    const payload = JSON.parse(body);
    text = (payload.events || [])
      .flatMap((event) => event.segs || [])
      .map((segment) => segment.utf8 || '')
      .join('');
  } else {
    text = [...body.matchAll(/<(?:text|p)\b[^>]*>([\s\S]*?)<\/(?:text|p)>/g)]
      .map((match) => match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>'))
      .join(' ');
  }
  text = text.replace(/\s+/g, ' ').trim();
  return { language, text, error: null };
}

async function inspect(target) {
  const videoId = videoIdFrom(target);
  if (!videoId) throw new Error(`Cannot resolve video id: ${target}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url, { headers, redirect: 'follow' });
  const html = await response.text();
  const title = decode(firstMatch(html, [
    /"title":"([^"]+)","lengthSeconds"/,
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
  ]));
  const author = decode(firstMatch(html, [
    /"author":"([^"]+)","channelId"/,
    /<link[^>]+itemprop="name"[^>]+content="([^"]+)"/,
  ]));
  const channelId = firstMatch(html, [/"channelId":"(UC[^"]+)"/]);
  const viewCount = firstMatch(html, [
    /"viewCount":"(\d+)"/,
    /"interactionCount":"(\d+)"/,
  ]);
  const lengthSeconds = firstMatch(html, [/"lengthSeconds":"(\d+)"/]);
  const publishDate = firstMatch(html, [
    /"publishDate":"([^"]+)"/,
    /"uploadDate":"([^"]+)"/,
  ]);
  const commentCountCandidates = collectUnique(html, [
    /"commentCount":"?(\d[\d,]*)"?/g,
    /"countText":\{"runs":\[\{"text":"([^"]+)"/g,
    /"commentsCount":\{"runs":\[\{"text":"([^"]+)"/g,
  ], 8).filter((value) => /\d/.test(value));
  const likeCountCandidates = collectUnique(html, [
    /"likeCount":"?(\d[\d,]*)"?/g,
    /"label":"좋아요\s*([^"]+)"/g,
    /"label":"like this video along with ([^"]+)"/gi,
  ], 8);
  const description = decode(firstMatch(html, [
    /"shortDescription":"([\s\S]*?)","isCrawlable"/,
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/,
  ]));
  const chapters = collectUnique(description || '', [
    /(?:^|\n)(\d{1,2}:\d{2}(?::\d{2})?\s+[^\n]+)/g,
  ], 30);
  const numberedLines = collectUnique(description || '', [
    /(?:^|\n)((?:DAY|Day|day|STEP|Step|step|[0-9]{1,2}[.)])\s*[^\n]+)/g,
  ], 30);
  let comments = { commentCountText: null, comments: [], error: null };
  try {
    comments = await fetchComments(html, videoId);
  } catch (error) {
    comments = {
      commentCountText: null,
      comments: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
  let transcript = { language: null, text: null, error: null };
  try {
    transcript = await fetchTranscript(html);
  } catch (error) {
    transcript = {
      language: null,
      text: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    requestedUrl: target,
    url,
    status: response.status,
    videoId,
    title,
    author,
    channelId,
    viewCount: viewCount ? Number(viewCount) : null,
    commentCountCandidates,
    commentCountText: comments.commentCountText,
    topComments: comments.comments,
    commentFetchError: comments.error,
    likeCountCandidates,
    lengthSeconds: lengthSeconds ? Number(lengthSeconds) : null,
    publishDate,
    description,
    chapters,
    numberedLines,
    transcriptLanguage: transcript.language,
    transcriptExcerpt: transcript.text?.slice(0, 12_000) || null,
    transcriptFetchError: transcript.error,
    htmlBytes: Buffer.byteLength(html),
  };
}

const results = [];
for (const target of targets) {
  try {
    results.push(await inspect(target));
  } catch (error) {
    results.push({ requestedUrl: target, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify(results, null, 2));
