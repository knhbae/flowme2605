import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const artifactPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-24-flowme-text-authoring-flow-view-poc-results",
  "flowme-text-authoring-flow-view-poc.html",
);
const requestedPort = Number.parseInt(
  process.env.FLOWME_FLOW_VIEW_POC_PORT ?? "4178",
  10,
);
const port = Number.isFinite(requestedPort) ? requestedPort : 4178;

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname === "/health") {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("ok");
    return;
  }
  if (
    pathname !== "/" &&
    pathname !== "/flowme-text-authoring-flow-view-poc.html"
  ) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  try {
    const html = await fs.readFile(artifactPath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    });
    response.end(html);
  } catch {
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    response.end("Build the local Flow view PoC artifact first.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Flow view PoC: http://127.0.0.1:${port}/`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
