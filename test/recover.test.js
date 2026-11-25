// Offline test for the "403 but the post is live" case. Needs nothing from Meta or the internet.
// Run: node test/recover.test.js
import http from "node:http";
import assert from "node:assert/strict";
import { publishCarousel } from "../src/instagram.js";

let mode = "ok";
let caption = "";
let publishCalls = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  for await (const c of req) body += c;
  const json = body ? JSON.parse(body) : {};
  res.setHeader("content-type", "application/json");
  if (req.method === "POST" && url.pathname.endsWith("/media_publish")) {
    publishCalls++;
    if (mode === "ok") return res.end(JSON.stringify({ id: "pub-1" }));
    res.writeHead(403);
    return res.end(JSON.stringify({ error: { message: "Application request limit reached", code: 4, error_subcode: 2207051 } }));
  }
  if (req.method === "POST" && url.pathname.endsWith("/media")) {
    if (json.caption) caption = json.caption;
    return res.end(JSON.stringify({ id: "c" + Math.random() }));
  }
  if (req.method === "GET" && url.searchParams.get("fields")?.includes("caption")) {
    if (mode === "error-but-live") {
      return res.end(JSON.stringify({ data: [{ id: "live-1", timestamp: new Date().toISOString(), caption, permalink: "https://instagram.com/p/LIVE/" }] }));
    }
    if (mode === "error-old-post") {
      return res.end(JSON.stringify({ data: [{ id: "old-1", timestamp: new Date(Date.now() - 3 * 3600e3).toISOString(), caption }] }));
    }
    return res.end(JSON.stringify({ data: [] }));
  }
  if (req.method === "GET" && url.searchParams.get("fields") === "permalink") return res.end(JSON.stringify({ permalink: "https://instagram.com/p/OK/" }));
  if (req.method === "GET") return res.end(JSON.stringify({ status_code: "FINISHED" }));
  res.writeHead(404);
  res.end("{}");
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;
const ig = { userId: "17841000000000", token: "TEST_TOKEN", base: `http://127.0.0.1:${port}/v26.0` };
const args = { ig, imageUrls: ["http://x/1.jpg", "http://x/2.jpg", "http://x/3.jpg"], caption: "5 events worth the flight\n\nTest caption", pollDelayMs: 1 };

mode = "ok";
let r = await publishCarousel(args);
assert.equal(r.id, "pub-1");
assert.equal(r.recoveredFromError, undefined);

mode = "error-but-live";
r = await publishCarousel(args);
assert.equal(r.id, "live-1");
assert.equal(r.recoveredFromError, true);
assert.equal(r.permalink, "https://instagram.com/p/LIVE/");

mode = "error-not-live";
await assert.rejects(() => publishCarousel(args), /2207051/);

mode = "error-old-post";
await assert.rejects(() => publishCarousel(args), /2207051/);

server.close();
console.log("Recovery tests passed (nothing real was contacted).");
