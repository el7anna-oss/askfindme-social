// Offline end-to-end test: a fake Instagram + fake image host on localhost.
// Run: npm run test:publish   (needs nothing from Meta, Ticketmaster or the internet)
import http from "node:http";
import { spawn } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = ".testout";
const outAbs = path.join(root, OUT);
await rm(outAbs, { recursive: true, force: true });

// async on purpose: the child talks to the fake server that lives in this same process
const run = (script, args, env = {}) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "src", script), ...args], {
      cwd: root,
      env: { ...process.env, OUT_DIR: OUT, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });

// 1. build a mock draft
let r = await run("draft.js", ["--mock", "--seed", "5"]);
assert.equal(r.status, 0, r.stderr + r.stdout);
const date = (await readdir(outAbs))[0];
const jpgs = (await readdir(path.join(outAbs, date))).filter((f) => f.endsWith(".jpg"));
assert.equal(jpgs.length, 7, "cover + 5 events + contact");

// 2. fake servers
const calls = [];
let n = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && url.pathname.startsWith("/files/")) {
    const f = path.join(outAbs, url.pathname.slice("/files/".length));
    try {
      const buf = await readFile(f);
      res.writeHead(200, { "content-type": "image/jpeg" });
      return res.end(buf);
    } catch {
      res.writeHead(404);
      return res.end();
    }
  }
  let body = "";
  for await (const c of req) body += c;
  const json = body ? JSON.parse(body) : {};
  calls.push({ method: req.method, path: url.pathname, auth: req.headers.authorization, json });
  res.setHeader("content-type", "application/json");
  if (url.pathname.endsWith("/media_publish")) return res.end(JSON.stringify({ id: "9990001" }));
  if (url.pathname.endsWith("/media")) return res.end(JSON.stringify({ id: `c${++n}` }));
  if (req.method === "GET" && url.searchParams.get("fields") === "permalink") return res.end(JSON.stringify({ permalink: "https://instagram.com/p/TEST/" }));
  if (req.method === "GET") return res.end(JSON.stringify({ status_code: "FINISHED" }));
  res.writeHead(404);
  res.end("{}");
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;

const env = {
  PUBLIC_BASE_URL: `http://127.0.0.1:${port}/files`,
  IG_API_BASE: `http://127.0.0.1:${port}/v26.0`,
  IG_USER_ID: "17841000000000",
  IG_ACCESS_TOKEN: "TEST_TOKEN_NOT_REAL",
};

// 3. dry run posts nothing
r = await run("publish.js", ["--dry"], env);
assert.equal(r.status, 0, r.stderr + r.stdout);
assert.equal(calls.length, 0, "dry run must not call Instagram");

// 4. real publish against the fake
r = await run("publish.js", [], env);
assert.equal(r.status, 0, r.stderr + r.stdout);
const posts = calls.filter((c) => c.method === "POST");
assert.equal(posts.length, 7 + 1 + 1, "7 items + carousel + publish");
assert.ok(posts.slice(0, 7).every((c) => c.json.is_carousel_item === true && c.json.image_url.startsWith(env.PUBLIC_BASE_URL)));
assert.equal(posts[7].json.media_type, "CAROUSEL");
assert.equal(posts[7].json.children.split(",").length, 7);
assert.ok(posts[7].json.caption.includes("Ticketmaster"));
assert.ok(posts.every((c) => c.auth === "Bearer TEST_TOKEN_NOT_REAL"));
assert.ok(!r.stdout.includes("TEST_TOKEN") && !r.stderr.includes("TEST_TOKEN"), "token must never be printed");
const marker = JSON.parse(await readFile(path.join(outAbs, date, "PUBLISHED.json"), "utf8"));
assert.equal(marker.id, "9990001");

// 5. publishing the same draft twice is refused; so is rebuilding it
const before = calls.length;
r = await run("publish.js", [], env);
assert.notEqual(r.status, 0);
assert.equal(calls.length, before);
r = await run("draft.js", ["--mock", "--seed", "5"]);
assert.ok(r.stdout.concat(r.stderr).includes("already published"));

// 6. email builds
r = await run("notify.js", ["--dry"], env);
assert.equal(r.status, 0, r.stderr + r.stdout);

server.close();
await rm(outAbs, { recursive: true, force: true });
console.log("All publishing tests passed (nothing real was contacted).");
