const owner = process.env.GITHUB_OWNER || "knhbae";
const repo = process.env.GITHUB_REPO || "flowme2605";
const branch = process.env.GITHUB_BRANCH || "design-ref-full-gap-alignment";
const jsonPath =
  process.env.REVIEW_JSON_PATH ||
  "flow-mvp/docs/content-audit/original-source-review/2026-06-01-creator-flow-review-notes.json";
const mdPath =
  process.env.REVIEW_MD_PATH ||
  "flow-mvp/docs/content-audit/original-source-review/2026-06-01-creator-flow-review-notes.md";

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-review-write-key",
  "cache-control": "no-store",
};

const send = (res, status, payload) => {
  res.writeHead(status, { ...headers, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const requireSetup = () => {
  if (!process.env.GITHUB_TOKEN) return "GITHUB_TOKEN";
  if (!process.env.REVIEW_WRITE_KEY) return "REVIEW_WRITE_KEY";
  return null;
};

const requireWriteKey = (req) => {
  const expected = process.env.REVIEW_WRITE_KEY;
  if (!expected) return true;
  return req.headers["x-review-write-key"] === expected;
};

const github = async (path, options = {}) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 404) return { status: 404, body: null };
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};

const decodeContent = (content) => Buffer.from(String(content || ""), "base64").toString("utf8");
const encodeContent = (content) => Buffer.from(content, "utf8").toString("base64");

const readRemoteJson = async () => {
  const result = await github(jsonPath, { method: "GET" });
  if (result.status === 404) return { sha: null, data: { generatedAt: "2026-06-01", updatedAt: null, reviews: {} } };
  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body?.message || `GitHub read failed: ${result.status}`);
  }
  return { sha: result.body.sha, data: JSON.parse(decodeContent(result.body.content)) };
};

const readRemoteSha = async (path) => {
  const result = await github(path, { method: "GET" });
  if (result.status === 404) return null;
  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body?.message || `GitHub read failed: ${result.status}`);
  }
  return result.body.sha;
};

const writeRemoteFile = async ({ path, content, message, sha }) => {
  const result = await github(path, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: encodeContent(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body?.message || `GitHub write failed: ${result.status}`);
  }
  return result.body;
};

const reviewMarkdown = (data) => {
  const rows = Object.values(data.reviews || {}).sort((a, b) => (a.flowId || "").localeCompare(b.flowId || ""));
  return [
    "# 제작자형 Flow 리뷰 메모",
    "",
    `Updated: ${data.updatedAt || ""}`,
    "",
    "| Flow | 점수 | 메모 | 저장 시각 |",
    "|---|---:|---|---|",
    ...rows.map((row) => {
      const memo = String(row.memo || "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
      return `| ${row.title || row.flowId} | ${row.rating ?? ""} | ${memo} | ${row.updatedAt || ""} |`;
    }),
    "",
  ].join("\n");
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  const missing = requireSetup();
  if (missing) {
    send(res, 503, { ok: false, error: "setup_missing", missing });
    return;
  }

  try {
    if (req.method === "GET") {
      const { data } = await readRemoteJson();
      send(res, 200, data);
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    if (!requireWriteKey(req)) {
      send(res, 401, { ok: false, error: "auth_failed" });
      return;
    }

    const note = JSON.parse(await readBody(req));
    const rating = note.rating === null || note.rating === undefined || note.rating === "" ? null : Number(note.rating);
    if (!note.flowId || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))) {
      send(res, 400, { ok: false, error: "invalid_review" });
      return;
    }

    const { sha, data } = await readRemoteJson();
    const updatedAt = new Date().toISOString();
    data.generatedAt = data.generatedAt || "2026-06-01";
    data.updatedAt = updatedAt;
    data.reviews = data.reviews || {};
    data.reviews[note.flowId] = {
      flowId: note.flowId,
      title: String(note.title || note.flowId).slice(0, 200),
      rating,
      memo: String(note.memo || "").slice(0, 5000),
      updatedAt,
    };

    const json = JSON.stringify(data, null, 2) + "\n";
    await writeRemoteFile({
      path: jsonPath,
      content: json,
      sha,
      message: `Update creator flow review note: ${note.flowId}`,
    });
    await writeRemoteFile({
      path: mdPath,
      content: reviewMarkdown(data),
      sha: await readRemoteSha(mdPath),
      message: `Update creator flow review notes markdown`,
    });

    send(res, 200, { ok: true, review: data.reviews[note.flowId] });
  } catch (error) {
    send(res, 500, { ok: false, error: "save_failed", message: error.message });
  }
};
