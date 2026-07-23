const queries = process.argv.slice(2);

if (queries.length === 0) {
  console.error('Usage: node scripts/content-audit/search-youtube-creators.mjs <query> [...]');
  process.exit(1);
}

const headers = {
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
};

function decode(value = '') {
  return value
    .replaceAll('\\u0026', '&')
    .replaceAll('\\/', '/')
    .replaceAll('\\"', '"');
}

function compactRuns(runs = []) {
  return runs.map((run) => decode(run.text || '')).join('');
}

function walk(value, matches) {
  if (!value || typeof value !== 'object') return;
  if (value.channelRenderer) {
    const channel = value.channelRenderer;
    matches.channels.push({
      channelId: channel.channelId,
      title: channel.title?.simpleText || compactRuns(channel.title?.runs),
      handle: channel.subscriberCountText?.simpleText || null,
      subscribers: channel.subscriberCountText?.simpleText || null,
      videos: channel.videoCountText?.runs?.map((run) => run.text).join('') || null,
      description: compactRuns(channel.descriptionSnippet?.runs),
      url: channel.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
        ? `https://www.youtube.com${channel.navigationEndpoint.commandMetadata.webCommandMetadata.url}`
        : `https://www.youtube.com/channel/${channel.channelId}`,
    });
  }
  if (value.videoRenderer) {
    const video = value.videoRenderer;
    matches.videos.push({
      videoId: video.videoId,
      title: compactRuns(video.title?.runs),
      owner: compactRuns(video.ownerText?.runs),
      views: video.viewCountText?.simpleText || compactRuns(video.viewCountText?.runs),
      published: video.publishedTimeText?.simpleText || null,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
    });
  }
  for (const child of Object.values(value)) walk(child, matches);
}

function findInitialData(html) {
  const markers = [
    'var ytInitialData = ',
    'window["ytInitialData"] = ',
    'ytInitialData = ',
  ];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start < 0) continue;
    const jsonStart = html.indexOf('{', start + marker.length);
    if (jsonStart < 0) continue;
    let depth = 0;
    let string = false;
    let escaped = false;
    for (let index = jsonStart; index < html.length; index += 1) {
      const char = html[index];
      if (string) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') string = false;
        continue;
      }
      if (char === '"') string = true;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
      }
    }
  }
  return null;
}

const output = [];
for (const query of queries) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers, redirect: 'follow' });
    const html = await response.text();
    const initialData = findInitialData(html);
    const matches = { channels: [], videos: [] };
    walk(initialData, matches);
    output.push({
      query,
      status: response.status,
      channels: matches.channels.slice(0, 5),
      videos: matches.videos.slice(0, 8),
      htmlBytes: Buffer.byteLength(html),
    });
  } catch (error) {
    output.push({ query, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify(output, null, 2));
