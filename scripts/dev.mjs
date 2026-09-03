import { createReadStream, existsSync, statSync, watch } from "node:fs";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 4173);
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

function rebuild() {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], { cwd: ROOT, stdio: "inherit" });
  return result.status === 0;
}

if (!rebuild()) process.exit(1);

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${PORT}`).pathname);
  const safePath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let target = path.join(DIST, safePath);
  if (!target.startsWith(DIST)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) target = path.join(target, "index.html");
  if (!existsSync(target)) target = path.join(DIST, "404.html");
  response.writeHead(target.endsWith("404.html") ? 404 : 200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(target).pipe(response);
});

server.listen(PORT, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${PORT}/`));

let timer;
for (const directory of [path.join(ROOT, "content"), path.join(ROOT, "site")]) {
  watch(directory, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(), 120);
  });
}
