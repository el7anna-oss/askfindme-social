// Loads .env (Node 22 built-in) and exposes validated settings. Never logs secret values.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // no .env file: fine for --mock runs and for GitHub Actions (values come from secrets)
}

const list = (v, fallback) =>
  (v || fallback)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const str = (v, fallback = "") => (v ?? "").toString().trim() || fallback;

const igHost = str(process.env.IG_API_HOST, "graph.facebook.com");
const igVersion = str(process.env.IG_API_VERSION, "v26.0");

export const config = {
  apiKey: str(process.env.TICKETMASTER_API_KEY),
  markets: list(process.env.MARKETS, "US,GB,DE,ES,NL,IE"),
  daysFrom: num(process.env.DAYS_FROM, 3),
  daysTo: num(process.env.DAYS_TO, 45),
  categories: list(process.env.CATEGORIES, "MUSIC,SPORTS,ARTS & THEATRE"),
  // photo = event image in a framed card; plain = branded text-only cards (no Ticketmaster photos)
  imageMode: str(process.env.IMAGE_MODE, "photo").toLowerCase() === "plain" ? "plain" : "photo",
  site: str(process.env.SITE, "askfindme.com"),
  email: str(process.env.CONTACT_EMAIL, "support@askfindme.com"),
  whatsapp: str(process.env.WHATSAPP).replace(/\D/g, ""),

  // where drafts are written: "output" locally, "posts" in GitHub Actions (committed so Instagram can fetch them)
  outDir: str(process.env.OUT_DIR, "output"),
  // public web address that serves the images, e.g. https://raw.githubusercontent.com/<user>/<repo>/main/posts
  publicBaseUrl: str(process.env.PUBLIC_BASE_URL).replace(/\/+$/, ""),

  ig: {
    userId: str(process.env.IG_USER_ID),
    token: str(process.env.IG_ACCESS_TOKEN),
    base: str(process.env.IG_API_BASE, `https://${igHost}/${igVersion}`).replace(/\/+$/, ""),
  },

  notify: {
    resendKey: str(process.env.RESEND_API_KEY),
    to: str(process.env.NOTIFY_EMAIL),
    from: str(process.env.EMAIL_FROM, "askfindme <noreply@askfindme.com>"),
    publishUrl: str(process.env.PUBLISH_URL),
  },
};
