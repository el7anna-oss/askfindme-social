// Offline sample events so the whole pipeline can be tested without an API key.
// image is empty on purpose: the renderer then draws a branded gradient background.
const poster = (label, a, b) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1024" height="576" fill="url(#g)"/><text x="512" y="320" font-size="96" font-weight="800" fill="rgba(255,255,255,.85)" text-anchor="middle" font-family="Arial">${label}</text></svg>`
  );

const base = (id, name, city, country, countryCode, venue, date, category, img = poster("EVENT PHOTO", "#c0392b", "#2c3e50")) => ({
  id,
  name,
  url: `https://www.ticketmaster.com/event/${id}`,
  date,
  time: "20:00:00",
  venue,
  city,
  countryCode,
  country,
  category,
  attractionId: `att-${id}`,
  image: img,
  imageWidth: 1024,
  imageCredit: "Ticketmaster",
});

export const mockEvents = [
  base("m1", "Coldplay: Music of the Spheres World Tour", "London", "United Kingdom", "GB", "Wembley Stadium", "2026-11-14", "Music"),
  base("m2", "Real Madrid vs FC Barcelona", "Madrid", "Spain", "ES", "Santiago Bernabeu", "2026-11-22", "Sports"),
  base("m3", "Hamilton", "New York", "United States", "US", "Richard Rodgers Theatre", "2026-11-18", "Arts & Theatre"),
  base("m4", "Berlin Philharmonic: Beethoven Nine", "Berlin", "Germany", "DE", "Philharmonie Berlin", "2026-11-27", "Music"),
  base("m5", "Los Angeles Lakers vs Boston Celtics", "Los Angeles", "United States", "US", "Crypto.com Arena", "2026-12-03", "Sports"),
  base("m6", "Ajax vs Feyenoord", "Amsterdam", "Netherlands", "NL", "Johan Cruijff ArenA", "2026-11-29", "Sports"),
  base("m7", "Dublin Comedy Festival Gala", "Dublin", "Ireland", "IE", "3Arena", "2026-12-05", "Arts & Theatre"),
  base("m9", "VIP Package: Coldplay Premium Experience", "London", "United Kingdom", "GB", "Wembley Stadium", "2026-11-14", "Music"),
  base("m10", "Cathedral Treasure Visit", "Granada", "Spain", "ES", "Cathedral", "2026-11-04", "Miscellaneous"),
  base("m8", "Chicago Bulls vs Miami Heat with a very long title for testing the layout of three lines", "Chicago", "United States", "US", "United Center", "2026-12-09", "Sports"),
];
