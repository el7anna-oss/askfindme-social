// Offline test: the same show is not posted twice, ticket listings are skipped, and a published day is not emailed again.
// Run: npm run test:history
import { spawn } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadHistory } from "../src/history.js";
import { pickEvents } from "../src/pick.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, ".testhist");
await rm(tmp, { recursive: true, force: true });
const day = (d, events) => mkdir(path.join(tmp, "posts", d), { recursive: true }).then(() => writeFile(path.join(tmp, "posts", d, "events.json"), JSON.stringify({ events })));
const ev = (id, name, extra = {}) => ({ id, name, url: "u", date: "2026-12-01", city: "X", countryCode: "US", image: "i", ...extra });

await day("2026-11-03", [ev("a1", "Museo Banksy Madrid", { attractionId: "att_banksy" }), ev("a2", "The Fray: Autumn Light Tour", { attractionId: "att_fray" })]);
await day("2026-09-01", [ev("old", "Old Show", { attractionId: "att_old" })]);

const h = await loadHistory({ dirs: [path.join(tmp, "posts")], today: "2026-11-04", skipDate: "2026-11-04" });
assert.deepEqual(h.ids.sort(), ["a1", "a2"], "ids from the last 60 days only");
assert.ok(h.names.includes("museo banksy madrid") && !h.names.includes("old show"));
assert.ok(h.attractions.includes("att_fray") && !h.attractions.includes("att_old"));
console.log("PASS history reads earlier drafts (ids 60 days, names 30, artists 14)");

const pool = [
  ev("n1", "Museo Banksy Madrid", { attractionId: "att_banksy" }), // same show, new id and date
  ev("n2", "The Fray: Autumn Light Tour (Berlin)", { attractionId: "att_fray" }), // same artist, another city
  ev("n3", "3-DAY GA - T-MOBILE ZONE AT SPHERE"),
  ev("n4", "THURSDAY - TURN 3 CLUB"),
  ev("n5", "SATURDAY - HEINEKEN SILVER MAIN GRANDSTAND"),
  ev("a1", "Something Else"), // an id we already used
  ev("g1", "Kodaline - Farewell Tour", { attractionId: "k1", countryCode: "IE" }),
  ev("g2", "J. Cole: The Fall-Off Tour", { attractionId: "k2", countryCode: "US" }),
  ev("g3", "Mrs. Doubtfire", { attractionId: "k3", countryCode: "GB" }),
  ev("g4", "Thursday Night Football", { attractionId: "k4", countryCode: "DE" }), // a real event that starts with a weekday word, no dash
];
const chosen = pickEvents(pool, { count: 5, seed: 1, history: h.ids, avoidNames: h.names, avoidAttractions: h.attractions });
const ids = chosen.map((e) => e.id).sort();
assert.deepEqual(ids, ["g1", "g2", "g3", "g4"], "only the four fresh events: " + ids);
console.log("PASS repeats, same artist, and ticket listings are skipped; a real event is kept");

const run = (script, args, env) =>
  new Promise((resolve) => {
    const c = spawn(process.execPath, [path.join(root, "src", script), ...args], { cwd: root, env: { ...process.env, ...env } });
    let out = "";
    c.stdout.on("data", (d) => (out += d));
    c.stderr.on("data", (d) => (out += d));
    c.on("close", (status) => resolve({ status, out }));
  });

// a published day: no new draft, no email
const today = new Date().toISOString().slice(0, 10);
const outRel = ".testhist/out";
await mkdir(path.join(root, outRel, today), { recursive: true });
await writeFile(path.join(root, outRel, today, "PUBLISHED.json"), "{}");
await writeFile(path.join(root, outRel, today, "caption.txt"), "c");
await writeFile(path.join(root, outRel, today, "events.json"), JSON.stringify({ events: [] }));
let r = await run("draft.js", ["--mock"], { OUT_DIR: outRel });
assert.equal(r.status, 0);
assert.match(r.out, /already published/);
assert.deepEqual((await readdir(path.join(root, outRel, today))).sort(), ["PUBLISHED.json", "caption.txt", "events.json"], "nothing rebuilt");
r = await run("notify.js", ["--dry"], { OUT_DIR: outRel });
assert.equal(r.status, 0);
assert.match(r.out, /already published, so no email is sent/);
console.log("PASS a published day is neither rebuilt nor emailed again");

await rm(tmp, { recursive: true, force: true });
console.log("\nAll history tests passed");
