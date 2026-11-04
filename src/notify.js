// Emails you the draft (images + caption) with a link to approve it. Uses Resend (same account as the app).
//   node src/notify.js          send the newest draft
//   node src/notify.js --dry    only build the email, send nothing
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { argValue, resolveDraftDate, root } from "./folders.js";

const args = process.argv.slice(2);
const dry = args.includes("--dry");

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const date = await resolveDraftDate(config.outDir, argValue(args, "date"));
const dir = path.join(root, config.outDir, date);
// An already published draft is not emailed again as "ready to approve"
if (!args.includes("--force") && (await readFile(path.join(dir, "PUBLISHED.json"), "utf8").catch(() => ""))) {
  console.log(`The ${date} draft was already published, so no email is sent.`);
  process.exit(0);
}
const caption = await readFile(path.join(dir, "caption.txt"), "utf8");
const meta = JSON.parse(await readFile(path.join(dir, "events.json"), "utf8"));

const { resendKey, to, from, publishUrl } = config.notify;
const missing = [];
if (!dry && !resendKey) missing.push("RESEND_API_KEY");
if (!dry && !to) missing.push("NOTIFY_EMAIL");
if (missing.length) {
  console.log(`Email skipped (missing ${missing.join(", ")}).`);
  process.exit(0);
}

const thumbs = (meta.events || [])
  .map((e) => `<li>${esc(e.name)} - ${esc(e.city)}, ${esc(e.country)} - ${esc(e.date)}</li>`)
  .join("");

const names = (await readdir(dir)).filter((f) => f.endsWith(".jpg")).sort();
const imgs = config.publicBaseUrl
  ? names
      .map((f) => `<img src="${esc(`${config.publicBaseUrl}/${date}/${f}`)}" width="240" style="margin:4px;border-radius:8px" alt="">`)
      .join("")
  : "";

const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2 style="color:#3E9C8B">Draft ready for ${esc(date)}</h2>
<p>Nothing is posted yet. Look at the images, then approve.</p>
<ul>${thumbs}</ul>
<div>${imgs}</div>
<h3>Caption</h3>
<pre style="white-space:pre-wrap;font-family:inherit;background:#f4f7f8;padding:12px;border-radius:8px">${esc(caption)}</pre>
${publishUrl ? `<p><a href="${esc(publishUrl)}" style="background:#3E9C8B;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Approve and publish</a><br><small>Opens GitHub: tap "Run workflow".</small></p>` : ""}
<p style="color:#667">Don't want it? Just ignore this email. Nothing is posted without your approval.</p>
</div>`;

const subject = `Instagram draft ${date}: ${(meta.events || []).length} events`;

if (dry) {
  console.log(`Dry run. Subject: ${subject}. Email HTML is ${html.length} characters. Nothing sent.`);
  process.exit(0);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to, subject, html }),
});
if (!res.ok) {
  console.error(`Email failed: HTTP ${res.status}`);
  process.exit(1);
}
console.log("Draft email sent.");
