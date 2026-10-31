// Ticketmaster Discovery API (free key, default quota 2 requests/second, 5000/day).
// The API key is only ever sent to Ticketmaster and never printed.
const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoZ = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function bestImage(images = []) {
  const real = images.filter((i) => i && i.url && !i.fallback);
  const wide = real
    .filter((i) => i.ratio === "16_9" && i.width >= 1024)
    .sort((a, b) => b.width - a.width);
  if (wide.length) return wide[0];
  return real.sort((a, b) => (b.width || 0) - (a.width || 0))[0] || null;
}

function normalize(e) {
  const venue = e._embedded?.venues?.[0] || {};
  const img = bestImage(e.images);
  return {
    id: e.id,
    name: (e.name || "").trim(),
    url: e.url || "",
    date: e.dates?.start?.localDate || "",
    time: e.dates?.start?.localTime || "",
    venue: venue.name || "",
    city: venue.city?.name || "",
    countryCode: venue.country?.countryCode || "",
    country: venue.country?.name || "",
    category: e.classifications?.[0]?.segment?.name || "",
    attractionId: e._embedded?.attractions?.[0]?.id || "",
    image: img ? img.url : "",
    imageWidth: img ? img.width || 0 : 0,
    imageCredit: img?.attribution || "Ticketmaster",
  };
}

export async function fetchMarket({ apiKey, country, daysFrom, daysTo, size = 100 }) {
  const now = Date.now();
  const params = new URLSearchParams({
    apikey: apiKey,
    countryCode: country,
    size: String(size),
    sort: "relevance,desc",
    startDateTime: isoZ(new Date(now + daysFrom * 864e5)),
    endDateTime: isoZ(new Date(now + daysTo * 864e5)),
  });
  const res = await fetch(`${BASE}?${params}`);
  if (res.status === 401) throw new Error("Ticketmaster rejected the API key (401). Check TICKETMASTER_API_KEY.");
  if (res.status === 429) throw new Error("Ticketmaster rate limit (429). Wait a minute and retry.");
  if (!res.ok) throw new Error(`Ticketmaster ${country}: HTTP ${res.status}`);
  const json = await res.json();
  return (json._embedded?.events || []).map(normalize);
}

export async function fetchAll({ apiKey, markets, daysFrom, daysTo }) {
  const all = [];
  for (const country of markets) {
    try {
      const events = await fetchMarket({ apiKey, country, daysFrom, daysTo });
      console.log(`  ${country}: ${events.length} events`);
      all.push(...events);
    } catch (err) {
      console.log(`  ${country}: skipped (${err.message})`);
    }
    await sleep(600); // stay well under 2 requests/second
  }
  return all;
}
