// Builds the Instagram profile picture (1080x1080). Instagram crops it to a circle, so everything is centred.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "output", "profile");
await mkdir(out, { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;background:#0B2E3C;display:flex;align-items:center;justify-content:center;font-family:"Segoe UI","Helvetica Neue",Poppins,Arial,sans-serif}
.mark{position:relative;font-size:560px;font-weight:800;line-height:1;color:#3E9C8B;letter-spacing:-.04em;padding-right:.5em}
.badge{position:absolute;top:.08em;right:.02em;width:.5em;height:.5em;border-radius:50%;background:#F2B544;border:.03em solid #0B2E3C;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.badge i{font-style:normal;font-size:.16em;font-weight:900;color:#2A1D00;letter-spacing:0;line-height:1}
</style></head><body><div class="mark">f<span class="badge"><i>ASK</i></span></div></body></html>`;

const browser = await chromium.launch();
try {
  const pg = await (await browser.newContext({ viewport: { width: 1080, height: 1080 } })).newPage();
  await pg.setContent(html, { waitUntil: "load" });
  await pg.screenshot({ path: path.join(out, "askfindme-profile.png"), type: "png" });
} finally {
  await browser.close();
}
console.log("Saved", path.join(out, "askfindme-profile.png"));
