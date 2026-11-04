import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { LOGO_CSS, logoHtml } from "./logo.js";
import { prettyDate } from "./caption.js";

const W = 1080;
const H = 1350; // 4:5, the tallest feed ratio Instagram allows for carousels

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GRADIENTS = [
  "linear-gradient(135deg,#0B2E3C,#1F6F78)",
  "linear-gradient(135deg,#142A4A,#3E6FA8)",
  "linear-gradient(135deg,#2A1D3F,#7A4A8C)",
  "linear-gradient(135deg,#0F3B33,#3E9C8B)",
  "linear-gradient(135deg,#3A2A12,#B07A2A)",
];

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Segoe UI","Helvetica Neue",Poppins,Arial,sans-serif;color:#fff;position:relative;background:#0B2E3C}
${LOGO_CSS}
.fill{position:absolute;inset:0}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,24,32,.55) 0%,rgba(6,24,32,0) 28%,rgba(6,24,32,.35) 52%,rgba(6,24,32,.94) 100%)}
.bgblur{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(38px) brightness(.5) saturate(1.2)}
.shade2{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,24,32,.35) 0%,rgba(6,24,32,.15) 40%,rgba(6,24,32,.82) 100%)}
.card{position:absolute;top:190px;left:72px;width:936px;height:527px;border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.18)}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.bigcity{position:absolute;top:240px;left:72px;right:72px;font-size:150px;font-weight:800;line-height:.95;letter-spacing:-.03em;opacity:.16;text-transform:uppercase;overflow:hidden;max-height:420px}
.mid{position:absolute;left:72px;right:72px;top:740px;bottom:160px;display:flex;flex-direction:column;justify-content:center}
.foot{position:absolute;left:72px;right:72px;bottom:72px;padding-top:28px;border-top:2px solid rgba(255,255,255,.3);font-size:32px;font-weight:700}
.top{position:absolute;top:70px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center}
.chip{font-size:28px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:12px 24px;border-radius:999px;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.35)}
.bottom{position:absolute;left:72px;right:72px;bottom:72px}
.where{display:inline-block;font-size:32px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#0B2E3C;background:#F2B544;padding:10px 22px;border-radius:12px;margin-bottom:26px}
.title{font-weight:800;line-height:1.05;letter-spacing:-.015em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.meta{margin-top:26px;font-size:38px;font-weight:600;color:#E8F1F3}
.meta span{opacity:.8}
.cta{margin-top:40px;padding-top:28px;border-top:2px solid rgba(255,255,255,.3);display:flex;justify-content:space-between;align-items:center;font-size:32px;font-weight:700}
.cta small{font-size:22px;font-weight:500;opacity:.7}
.center{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 90px}
.big{font-size:104px;font-weight:800;line-height:1.02;letter-spacing:-.02em;margin-top:70px}
.big em{font-style:normal;color:#F2B544}
.sub{font-size:40px;margin-top:34px;color:#CFE3E7}
.swipe{position:absolute;bottom:80px;left:0;right:0;text-align:center;font-size:34px;font-weight:700;color:#F2B544}
.line{font-size:44px;font-weight:600;margin-top:28px;color:#fff}
.small{position:absolute;bottom:60px;left:0;right:0;text-align:center;font-size:24px;opacity:.65;padding:0 80px}
`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${body}</body></html>`;

function coverSlide(count) {
  return page(`
  <div class="fill" style="background:linear-gradient(150deg,#0B2E3C 0%,#14505F 60%,#1F6F78 100%)"></div>
  <div class="center">
    ${logoHtml(120)}
    <div class="big">${count} events<br>worth <em>the flight</em></div>
    <div class="sub">Europe &amp; USA · coming up soon</div>
  </div>
  <div class="swipe">Swipe →</div>`);
}

function eventSlide(e, index, total, cfg) {
  const len = e.name.length;
  const photo = cfg.imageMode === "photo" && e.image;
  const size = photo ? (len < 28 ? 78 : len < 48 ? 66 : 56) : len < 28 ? 92 : len < 48 ? 76 : 62;
  const grad = GRADIENTS[index % GRADIENTS.length];
  const when = [prettyDate(e.date), e.time ? e.time.slice(0, 5) : ""].filter(Boolean).join(" \u00b7 ");
  return page(`
  <div class="fill" style="background:${grad}"></div>
  ${photo ? `<img class="bgblur" src="${esc(e.image)}" onerror="this.remove()" />` : `<div class="bigcity">${esc(e.city)}</div>`}
  <div class="shade2"></div>
  ${photo ? `<div class="card"><img src="${esc(e.image)}" onerror="this.parentElement.remove()" /></div>` : ""}
   <div class="top">${logoHtml(52)}</div>
  ${
    photo
      ? `<div class="mid">
    <div><span class="where">${esc(e.city)} \u00b7 ${esc(e.country)}</span></div>
    <div class="title" style="font-size:${size}px">${esc(e.name)}</div>
    <div class="meta">${esc(when)}<br><span>${esc(e.venue)}</span></div>
  </div>
  <div class="foot">\u2708 Fly there: ${esc(cfg.site)}</div>`
      : `<div class="bottom">
    <div class="where">${esc(e.city)} \u00b7 ${esc(e.country)}</div>
    <div class="title" style="font-size:${size}px">${esc(e.name)}</div>
    <div class="meta">${esc(when)}<br><span>${esc(e.venue)}</span></div>
    <div class="cta"><div>\u2708 Fly there: ${esc(cfg.site)}</div></div>
  </div>`
  }`);
}

function ctaSlide(cfg) {
  const lines = [`✉ ${cfg.email}`];
  if (cfg.whatsapp) lines.unshift("WhatsApp: message us");
  return page(`
  <div class="fill" style="background:linear-gradient(150deg,#0B2E3C 0%,#14505F 60%,#1F6F78 100%)"></div>
  <div class="center">
    ${logoHtml(110)}
    <div class="big" style="font-size:88px">Tell us where<br>you want to <em>go</em></div>
    ${lines.map((l) => `<div class="line">${esc(l)}</div>`).join("")}
    <div class="line" style="color:#F2B544">${esc(cfg.site)} · link in bio</div>
  </div>
  <div class="small">Tickets for events are sold on each event's official Ticketmaster page. askfindme does not sell event tickets.</div>`);
}

export async function renderCarousel(events, cfg, outDir) {
  await mkdir(outDir, { recursive: true });
  const withCover = cfg.slides?.cover === true;
  const withContact = cfg.slides?.contact === true;
  const first = withCover ? 2 : 1; // file number of the first event, so the files stay in order
  const slides = [
    ...(withCover ? [{ name: "01-cover", html: coverSlide(events.length) }] : []),
    ...events.map((e, i) => ({
      name: `${String(i + first).padStart(2, "0")}-${e.id.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`,
      html: eventSlide(e, i, events.length, cfg),
    })),
    ...(withContact ? [{ name: `${String(events.length + first).padStart(2, "0")}-contact`, html: ctaSlide(cfg) }] : []),
  ];

  const browser = await chromium.launch();
  const files = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    for (const s of slides) {
      await pg.setContent(s.html, { waitUntil: "load", timeout: 30000 });
      await pg.evaluate(() => document.fonts.ready);
      const file = path.join(outDir, `${s.name}.jpg`);
      await pg.screenshot({ path: file, type: "jpeg", quality: 90 });
      files.push(file);
    }
  } finally {
    await browser.close();
  }
  return files;
}
