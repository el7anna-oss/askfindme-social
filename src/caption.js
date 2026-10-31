const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
};

export const prettyDate = fmtDate;

export function buildCaption(events, cfg) {
  const lines = events.map(
    (e) => `• ${e.name} | ${e.city}, ${e.country} | ${fmtDate(e.date)}`
  );

  const contact = [`Flights: ${cfg.site} (link in bio)`];
  if (cfg.whatsapp) contact.push(`WhatsApp us: wa.me/${cfg.whatsapp}`);
  contact.push(`Email: ${cfg.email}`);

  const caption = [
    `✈️ ${events.length} events worth the flight`,
    "",
    ...lines,
    "",
    "Tickets are sold on each event's official Ticketmaster page. We do not sell event tickets.",
    "",
    "Tell us where you want to go and we will look for flights.",
    ...contact,
    "",
    "Event data and images: Ticketmaster.",
    "",
    "#askfindme #flights #traveldeals #concerttravel #traveltheworld",
  ].join("\n");

  if (caption.length > 2200) throw new Error(`Caption too long (${caption.length}/2200)`);
  return caption;
}

export function buildAltTexts(events) {
  return events.map((e) => `${e.name}, ${e.city}, ${e.country}, ${fmtDate(e.date)}. Image: Ticketmaster.`);
}
