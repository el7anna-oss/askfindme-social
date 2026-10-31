// Draft mode: builds today's carousel (images + caption) into output/<date>/ and posts NOTHING.
//   npm run draft:mock          offline test with sample events
//   npm run draft               real run (needs TICKETMASTER_API_KEY in .env)
//   npm run draft -- --seed 7   same pick every time for the same seed
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { fetchAll } from "./ticketmaster.js";
import { pickEvents } from "./pick.js";
import { buildCaption, buildAltTexts } from "./caption.js";
import { renderCarousel } from "./render.js";
import { mockEvents } from "./mock.js";

import { root } from "./folders.js";
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const value = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const count = Number(value("count") || 5);
const seed = value("seed") !== undefined ? Number(value("seed")) : null;
const mock = flag("mock");

let history = [];
try {
  history = JSON.parse(await readFile(path.join(root, "data", "posted.json"), "utf8"));
} catch {
  // no history yet
}

let events;
if (mock) {
  console.log("Mock mode: using sample events");
  events = mockEvents;
} else {
  if (!config.apiKey) {
    console.error("Missing TICKETMASTER_API_KEY. Copy .env.example to .env and add your key, or run: npm run draft:mock");
    process.exit(1);
  }
  console.log(`Fetching events for ${config.markets.join(", ")} ...`);
  events = await fetchAll(config);
}

const chosen = pickEvents(events, {
  count,
  seed,
  history,
  categories: config.categories,
  requireImage: config.imageMode === "photo",
});
if (chosen.length < 3) {
  console.error(`Only ${chosen.length} usable events found (need photo, city, date). Widen MARKETS or DAYS_TO in .env.`);
  process.exit(1);
}

const day = new Date().toISOString().slice(0, 10);
const outDir = path.join(root, config.outDir, day);
const alreadyPublished = await readFile(path.join(outDir, "PUBLISHED.json"), "utf8").catch(() => "");
if (alreadyPublished && !flag("force")) {
  console.error(`Today's draft (${day}) was already published, so it is not rebuilt. Use --force to overwrite.`);
  process.exit(0);
}
await rm(outDir, { recursive: true, force: true }); // each run starts clean, no old images left behind
await mkdir(outDir, { recursive: true });

const files = await renderCarousel(chosen, config, outDir);
const caption = buildCaption(chosen, config);
await writeFile(path.join(outDir, "caption.txt"), caption, "utf8");
await writeFile(
  path.join(outDir, "events.json"),
  JSON.stringify({ events: chosen, altTexts: buildAltTexts(chosen) }, null, 2),
  "utf8"
);

if (flag("remember")) {
  // remember these events so they are not picked again
  const histFile = path.join(root, "data", "posted.json");
  await mkdir(path.dirname(histFile), { recursive: true });
  const updated = [...history, ...chosen.map((e) => e.id)].slice(-600);
  await writeFile(histFile, JSON.stringify(updated, null, 2), "utf8");
}

console.log(`\nDraft ready in ${outDir}`);
files.forEach((f) => console.log("  " + path.basename(f)));
console.log("  caption.txt, events.json\n(nothing was posted)");
