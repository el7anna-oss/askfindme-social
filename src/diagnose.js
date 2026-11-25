// Read-only check of the Instagram connection. Posts nothing, changes nothing.
// Run it from GitHub: Actions > "Check Instagram connection" > Run workflow.
// The token is never printed (it is replaced by *** in every line of output).
import { config } from "./config.js";

const { userId, token, base } = config.ig;
const host = new URL(base).origin;
const mask = (s) => (token ? String(s).split(token).join("***") : String(s));
const out = (s = "") => console.log(mask(s));

async function get(label, path, { auth = true } = {}) {
  out(`\n=== ${label} ===`);
  let res;
  try {
    res = await fetch(`${path.startsWith("http") ? path : base + path}`, {
      headers: auth ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) {
    out(`Network error: ${e.message}`);
    return null;
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  for (const h of ["x-app-usage", "x-business-use-case-usage", "x-ad-account-usage"]) {
    const v = res.headers.get(h);
    if (v) out(`${h}: ${v}`);
  }
  if (!res.ok || json.error) {
    const e = json.error || {};
    out(`FAILED  HTTP ${res.status}  code ${e.code ?? "?"}  subcode ${e.error_subcode ?? "-"}`);
    out(`message: ${e.message || json.raw || "(none)"}`);
    if (e.error_user_msg) out(`user message: ${e.error_user_msg}`);
    if (e.fbtrace_id) out(`fbtrace_id: ${e.fbtrace_id}`);
    return null;
  }
  return json;
}

if (!userId || !token) {
  console.error("IG_USER_ID or IG_ACCESS_TOKEN is missing in the repository secrets.");
  process.exit(1);
}
out(`Instagram API host: ${host}   (token is ${token.length} characters long)`);

// 1. Is the token alive, who owns it, when does it expire, which permissions does it have
const dbg = await get("1. Token check", `${host}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`, { auth: false });
if (dbg?.data) {
  const d = dbg.data;
  out(`valid: ${d.is_valid}`);
  out(`type: ${d.type}`);
  out(`app_id: ${d.app_id}   application: ${d.application || "?"}`);
  out(`expires: ${d.expires_at ? new Date(d.expires_at * 1000).toISOString() : "never"}`);
  out(`data access expires: ${d.data_access_expires_at ? new Date(d.data_access_expires_at * 1000).toISOString() : "n/a"}`);
  out(`permissions: ${(d.scopes || []).join(", ") || "(none listed)"}`);
  if (d.error) out(`token error: ${JSON.stringify(d.error)}`);
}

// 2. The account itself
const acc = await get("2. Instagram account", `/${userId}?fields=username,account_type,media_count,followers_count`);
if (acc) {
  out(`username: ${acc.username}`);
  out(`account type: ${acc.account_type || "(not shown)"}`);
  out(`posts: ${acc.media_count}   followers: ${acc.followers_count}`);
}

// 3. Publishing quota for the last 24 hours
const q = await get("3. Publishing quota (last 24h)", `/${userId}/content_publishing_limit?fields=quota_usage,config`);
if (q?.data?.[0]) {
  const d = q.data[0];
  out(`posts used: ${d.quota_usage} of ${d.config?.quota_total ?? "?"}  (window ${d.config?.quota_duration ? d.config.quota_duration / 3600 + " hours" : "?"})`);
}

// 4. What is really on the account
const media = await get("4. Latest posts on the account", `/${userId}/media?fields=timestamp,media_type,permalink&limit=6`);
if (media?.data) {
  if (!media.data.length) out("(no posts returned)");
  for (const m of media.data) out(`${m.timestamp}  ${m.media_type}  ${m.permalink}`);
}

out("\nDone. Nothing was posted or changed.");
