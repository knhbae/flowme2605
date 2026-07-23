const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('Usage: node scripts/content-audit/inspect-youtube-creator.mjs <channel-url> [...]');
  process.exit(1);
}

const headers = {
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function firstMatch(input, patterns) {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function decodeEscapes(value) {
  if (!value) return null;
  try {
    return JSON.parse(`"${value.replaceAll('"', '\\"')}"`);
  } catch {
    return value
      .replaceAll('\\u0026', '&')
      .replaceAll('\\/', '/')
      .replaceAll('\\"', '"');
  }
}

async function inspect(target) {
  const channelUrl = target.replace(/\/+$/, '');
  const response = await fetch(channelUrl, { headers, redirect: 'follow' });
  const html = await response.text();
  const channelId = firstMatch(html, [
    /"channelId":"(UC[^"]+)"/,
    /"externalId":"(UC[^"]+)"/,
    /<link[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[^"]+)"/,
  ]);
  const canonical = firstMatch(html, [
    /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/,
    /<meta[^>]+property="og:url"[^>]+content="([^"]+)"/,
  ]);
  const title = decodeEscapes(firstMatch(html, [
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
    /<title>([^<]+)<\/title>/,
  ]));
  const description = decodeEscapes(firstMatch(html, [
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/,
    /<meta[^>]+name="description"[^>]+content="([^"]*)"/,
  ]));
  const subscriberText = decodeEscapes(firstMatch(html, [
    /"subscriberCountText":\{"simpleText":"([^"]+)"/,
    /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/,
  ]));
  const videoIds = unique([...html.matchAll(/"videoId":"([^"]+)"/g)].map((match) => match[1]));

  let feedVideos = [];
  if (channelId) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feedResponse = await fetch(feedUrl, { headers, redirect: 'follow' });
    const feed = await feedResponse.text();
    feedVideos = [...feed.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<published>([^<]+)<\/published>[\s\S]*?<\/entry>/g)]
      .map((match) => ({
        videoId: match[1],
        title: match[2].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
        publishedAt: match[3],
        url: `https://www.youtube.com/watch?v=${match[1]}`,
      }));
  }

  return {
    requestedUrl: target,
    status: response.status,
    canonical,
    channelId,
    title,
    description,
    subscriberText,
    initialVideoUrls: videoIds.slice(0, 12).map((id) => `https://www.youtube.com/watch?v=${id}`),
    feedVideos,
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
