// Publishes a finished draft to Instagram as one carousel.
//   node src/publish.js --dry            show exactly what would be posted, post nothing
//   node src/publish.js                  publish the newest draft
//   node src/publish.js --date 2026-11-02
//   node src/publish.js --force          publish even if this draft was already published
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { argValue, resolveDraftDate, root } from "./folders.js";
import { publishCarousel } from "./instagram.js";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const date = await resolveDraftDate(config.outDir, argValue(args, "date"));
const dir = path.join(root, config.outDir, date);

const files = (await readdir(dir).catch(() => [])).filter((f) => f.toLowerCase().endsWith(".jpg")).sort();
if (files.length < 3) {
  console.error(`Draft ${date} has ${files.length} images in ${config.outDir}/${date}. Run: npm run draft`);
  process.exit(1);
}

const caption = await readFile(path.join(dir, "caption.txt"), "utf8").catch(() => "");
if (!caption) {
  console.error(`Missing caption.txt in ${config.outDir}/${date}`);
  process.exit(1);
}

let alts = [];
try {
  const meta = JSON.parse(await readFile(path.join(dir, "events.json"), "utf8"));
  alts = meta.altTexts || [];
} catch {
  // alt texts are optional
}
// cover + one per event + contact slide
const altTexts = [
  "askfindme: events worth the flight",
  ...alts,
  `Contact askfindme: ${config.site}, ${config.email}`,
].slice(0, files.length);

const missing = [];
if (!config.publicBaseUrl) missing.push("PUBLIC_BASE_URL");
if (!dry && !config.ig.userId) missing.push("IG_USER_ID");
if (!dry && !config.ig.token) missing.push("IG_ACCESS_TOKEN");
if (missing.length) {
  console.error(`Missing settings: ${missing.join(", ")}. See README.md.`);
  process.exit(1);
}

const imageUrls = files.map((f) => `${config.publicBaseUrl}/${date}/${f}`);
const marker = path.join(dir, "PUBLISHED.json");

if (!force) {
  const done = await readFile(marker, "utf8").catch(() => "");
  if (done) {
    console.error(`Draft ${date} was already published. Use --force only if you really want to post it again.`);
    process.exit(1);
  }
}

console.log(`Draft ${date}: ${files.length} images`);
imageUrls.forEach((u) => console.log("  " + u));
console.log(`\nCaption (${caption.length} chars):\n${caption}\n`);

if (dry) {
  console.log("Dry run: nothing was posted.");
  process.exit(0);
}

// Instagram downloads each image itself, so every address must already be public.
for (const url of imageUrls) {
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try {
      const res = await fetch(url);
      const type = res.headers.get("content-type") || "";
      await res.body?.cancel();
      ok = res.ok && type.startsWith("image/");
    } catch {
      ok = false;
    }
    if (!ok) await sleep(5000);
  }
  if (!ok) {
    console.error(`Image is not publicly reachable yet: ${url}\nCheck that the repository is public and the draft was committed.`);
    process.exit(1);
  }
}

try {
  const result = await publishCarousel({ ig: config.ig, imageUrls, altTexts, caption });
  await writeFile(marker, JSON.stringify({ ...result, publishedAt: new Date().toISOString() }, null, 2), "utf8");
  console.log(`Published. ${result.permalink || "(link unavailable)"}`);
} catch (err) {
  console.error(`Publishing failed: ${err.message}`);
  process.exit(1);
}
