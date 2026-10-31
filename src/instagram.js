// Instagram content publishing (carousel). The token is only sent in the Authorization header
// and is never printed or included in error messages.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(ig, method, path, body) {
  const res = await fetch(`${ig.base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ig.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok || json.error) {
    const e = json.error || {};
    const code = e.code !== undefined ? ` code ${e.code}${e.error_subcode ? "/" + e.error_subcode : ""}` : "";
    throw new Error(
      `Instagram API ${method} ${path.split("?")[0].replace(/\d{6,}/g, "<id>")} failed: HTTP ${res.status}${code} ${e.message || json.raw || ""}`.trim()
    );
  }
  return json;
}

async function waitReady(ig, containerId, { tries = 20, delayMs = 3000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const s = await call(ig, "GET", `/${containerId}?fields=status_code,status`);
    if (!s.status_code || s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`Instagram could not process the media (${s.status_code}${s.status ? ": " + s.status : ""})`);
    }
    await sleep(delayMs);
  }
  throw new Error("Instagram media is still processing after waiting. Try again later.");
}

export async function publishCarousel({ ig, imageUrls, altTexts = [], caption, pollDelayMs = 3000 }) {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error(`A carousel needs 2 to 10 images, got ${imageUrls.length}`);
  }
  if (caption.length > 2200) throw new Error(`Caption too long (${caption.length}/2200)`);

  const children = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const body = { image_url: imageUrls[i], is_carousel_item: true };
    if (altTexts[i]) body.alt_text = altTexts[i].slice(0, 1000);
    const item = await call(ig, "POST", `/${ig.userId}/media`, body);
    children.push(item.id);
  }
  for (const id of children) await waitReady(ig, id, { delayMs: pollDelayMs });

  const container = await call(ig, "POST", `/${ig.userId}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  await waitReady(ig, container.id, { delayMs: pollDelayMs });

  const published = await call(ig, "POST", `/${ig.userId}/media_publish`, { creation_id: container.id });

  let permalink = "";
  try {
    const info = await call(ig, "GET", `/${published.id}?fields=permalink`);
    permalink = info.permalink || "";
  } catch {
    // the post is live even if the link lookup fails
  }
  return { id: published.id, permalink };
}
