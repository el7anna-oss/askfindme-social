// What was already shown on earlier days, read from the saved drafts themselves (posts/<date>/events.json).
// The drafts are the source of truth: nothing extra has to be remembered, and a day that was published by hand still counts.
//   ids          the exact events (kept for 60 days)
//   names        the same show under another id or date, e.g. "Museo Banksy Madrid" (30 days)
//   attractions  the same artist or team in another city (14 days)
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { baseName } from "./pick.js";

const DAY = 86_400_000;

export async function loadHistory({ dirs, today, skipDate = null }) {
  const ids = new Set();
  const names = new Set();
  const attractions = new Set();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  for (const dir of dirs) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (!e.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(e.name) || e.name === skipDate) continue;
      const age = Math.round((now - new Date(`${e.name}T00:00:00Z`).getTime()) / DAY);
      if (age < 0 || age > 60) continue;
      const meta = JSON.parse(await readFile(path.join(dir, e.name, "events.json"), "utf8").catch(() => "{}"));
      for (const ev of meta.events || []) {
        if (ev.id) ids.add(ev.id);
        if (age <= 30 && ev.name) names.add(baseName(ev.name));
        if (age <= 14 && ev.attractionId) attractions.add(ev.attractionId);
      }
    }
  }
  return { ids: [...ids], names: [...names], attractions: [...attractions] };
}
