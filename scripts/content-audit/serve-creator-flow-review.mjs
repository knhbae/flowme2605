import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const htmlPath = path.join(root, "docs/content-audit/2026-06-01-creator-flow-samples.html");
const notesPath = path.join(root, "docs/content-audit/original-source-review/2026-06-01-creator-flow-review-notes.json");
const notesMdPath = path.join(root, "docs/content-audit/original-source-review/2026-06-01-creator-flow-review-notes.md");
const samplesPath = path.join(root, "docs/content-audit/original-source-review/2026-06-01-creator-flow-validation-samples.json");
const port = Number(process.env.PORT || process.argv[2] || 54521);

const sampleTitles = new Map(
  JSON.parse(fs.readFileSync(samplesPath, "utf8")).samples.map((sample) => [sample.id, sample.title]),
);

const readJson = () => {
  if (!fs.existsSync(notesPath)) {
    return { generatedAt: "2026-06-01", updatedAt: null, reviews: {} };
  }
  return JSON.parse(fs.readFileSync(notesPath, "utf8"));
};

const writeReviewFiles = (data) => {
  fs.mkdirSync(path.dirname(notesPath), { recursive: true });
  fs.writeFileSync(notesPath, JSON.stringify(data, null, 2) + "\n", "utf8");

  const rows = Object.values(data.reviews).sort((a, b) => (a.flowId || "").localeCompare(b.flowId || ""));
  const md = [
    "# 제작자형 Flow 리뷰 메모",
    "",
    `Updated: ${data.updatedAt}`,
    "",
    "| Flow | 점수 | 메모 | 저장 시각 |",
    "|---|---:|---|---|",
    ...rows.map((row) => {
      const title = row.title || sampleTitles.get(row.flowId) || row.flowId;
      const memo = String(row.memo || "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
      return `| ${title} | ${row.rating ?? ""} | ${memo} | ${row.updatedAt || ""} |`;
    }),
    "",
  ].join("\n");
  fs.writeFileSync(notesMdPath, md, "utf8");
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const parseNote = (request, body) => {
  const contentType = request.headers["content-type"] || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(body);
    return {
      flowId: form.get("flowId"),
      title: form.get("title"),
      rating: form.get("rating"),
      memo: form.get("memo"),
      fromForm: true,
    };
  }
  return JSON.parse(body);
};

const send = (response, status, body, contentType = "application/json; charset=utf-8") => {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, x-review-write-key",
  });
  response.end(body);
};

const sendFormSaved = (response, review) => {
  send(
    response,
    200,
    `<!doctype html><meta charset="utf-8"><title>Saved</title><p>저장됨: ${review.title}</p>`,
    "text/html; charset=utf-8",
  );
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      send(response, 204, "");
      return;
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/review")) {
      send(response, 200, fs.readFileSync(htmlPath, "utf8"), "text/html; charset=utf-8");
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/reviews") {
      send(response, 200, JSON.stringify(readJson()));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reviews") {
      const note = parseNote(request, await readBody(request));
      if (!sampleTitles.has(note.flowId)) {
        send(response, 400, JSON.stringify({ ok: false, error: "unknown flowId" }));
        return;
      }
      const rating = note.rating === null || note.rating === undefined || note.rating === "" ? null : Number(note.rating);
      if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        send(response, 400, JSON.stringify({ ok: false, error: "rating must be 1-5" }));
        return;
      }
      const data = readJson();
      const updatedAt = new Date().toISOString();
      data.updatedAt = updatedAt;
      data.reviews[note.flowId] = {
        flowId: note.flowId,
        title: sampleTitles.get(note.flowId),
        rating,
        memo: String(note.memo || "").slice(0, 5000),
        updatedAt,
      };
      writeReviewFiles(data);
      if (note.fromForm) {
        sendFormSaved(response, data.reviews[note.flowId]);
        return;
      }
      send(response, 200, JSON.stringify({ ok: true, review: data.reviews[note.flowId] }));
      return;
    }

    send(response, 404, JSON.stringify({ ok: false, error: "not found" }));
  } catch (error) {
    send(response, 500, JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Flow review page: http://127.0.0.1:${port}/review`);
  console.log(`Saving notes to: ${notesPath}`);
});
