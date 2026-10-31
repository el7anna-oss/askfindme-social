// Chooses N varied events: needs a photo, no duplicates, max 2 per country, one per artist/team.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const baseName = (n) =>
  n
    .toLowerCase()
    .replace(/\s+[-–|:]\s+.*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Titles that are add-ons or products, not events worth a trip.
const BLOCK_WORDS = [
  "package", "vip", "parking", "hospitality", "upgrade", "meet & greet", "meet and greet",
  "voucher", "gift card", "lounge", "add-on", "add on", "fast pass", "fastpass", "premium seat",
  "camping", "shuttle", "merch", "donation", "cancelled", "canceled", "postponed", "rescheduled",
  "guided tour", "museum", "visita", "entrada",
];

export function pickEvents(
  events,
  { count = 5, seed = null, history = [], maxPerCountry = 2, categories = [], requireImage = true } = {}
) {
  const rand = seed === null ? Math.random : mulberry32(seed);
  const seenHistory = new Set(history);

  const usable = events.filter((e) => {
    if (!(e.id && e.name && e.url && e.date && e.city)) return false;
    if (requireImage && !e.image) return false;
    if (seenHistory.has(e.id)) return false;
    if (categories.length && !categories.includes((e.category || "").toUpperCase())) return false;
    const n = e.name.toLowerCase();
    return !BLOCK_WORDS.some((w) => n.includes(w));
  });

  // Fisher-Yates shuffle
  const pool = [...usable];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const chosen = [];
  const names = new Set();
  const attractions = new Set();
  const perCountry = {};

  for (const e of pool) {
    if (chosen.length >= count) break;
    const key = baseName(e.name);
    if (names.has(key)) continue;
    if (e.attractionId && attractions.has(e.attractionId)) continue;
    if ((perCountry[e.countryCode] || 0) >= maxPerCountry) continue;
    chosen.push(e);
    names.add(key);
    if (e.attractionId) attractions.add(e.attractionId);
    perCountry[e.countryCode] = (perCountry[e.countryCode] || 0) + 1;
  }

  // not enough variety: relax the per-country rule
  for (const e of pool) {
    if (chosen.length >= count) break;
    if (chosen.includes(e)) continue;
    const key = baseName(e.name);
    if (names.has(key)) continue;
    chosen.push(e);
    names.add(key);
  }

  return chosen;
}
