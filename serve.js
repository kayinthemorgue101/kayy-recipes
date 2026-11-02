#!/usr/bin/env node
// Local preview with the same /r/<id> paths Render rewrites to /r/<id>.html.

const http = require("http");
const fs = require("fs");
const path = require("path");

const dist = path.resolve(__dirname, "dist");
const port = Number(process.env.PORT) || 4173;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function resolveFile(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch (e) { return null; }
  const recipe = decoded.match(/^\/r\/([a-z0-9-]+)\/?$/);
  let file;
  if (recipe) file = path.join(dist, "r", recipe[1] + ".html");
  else if (decoded === "/") file = path.join(dist, "index.html");
  else file = path.resolve(dist, decoded.replace(/^\/+/, ""));
  if (file !== dist && !file.startsWith(dist + path.sep)) return null;
  return file;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = resolveFile(url.pathname);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const missing = path.join(dist, "404.html");
    const body = fs.existsSync(missing) ? fs.readFileSync(missing) : "Not found";
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": "no-cache"
  });
  res.end(fs.readFileSync(file));
});

server.listen(port, () => {
  console.log("Kayy's Box  http://localhost:" + port);
});
