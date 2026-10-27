// Checks every saved site and records the result. Runs on GitHub Actions.
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function ping(u) {
  const t = Date.now(), c = new AbortController(), to = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(u.startsWith("http") ? u : "https://" + u, { signal: c.signal, redirect: "follow", headers: { "User-Agent": "uptime-monitor" } });
    return { up: r.status < 400, status: r.status, ms: Date.now() - t };
  } catch { return { up: false, status: null, ms: null }; }
  finally { clearTimeout(to); }
}

const res = await fetch(`${URL_}/rest/v1/sites?select=id,url`, { headers: H });
if (!res.ok) { console.error("Could not read sites:", res.status, await res.text()); process.exit(1); }
const sites = await res.json();
const rows = await Promise.all(sites.map(async s => ({ site_id: s.id, ...(await ping(s.url)) })));
if (rows.length) {
  const w = await fetch(`${URL_}/rest/v1/checks`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows) });
  if (!w.ok) { console.error("Could not save checks:", w.status, await w.text()); process.exit(1); }
}
const old = new Date(Date.now() - 30 * 864e5).toISOString();
await fetch(`${URL_}/rest/v1/checks?checked_at=lt.${old}`, { method: "DELETE", headers: H });
console.log(`Checked ${rows.length} site(s):`, rows.map(r => `${r.up ? "UP" : "DOWN"}${r.ms ? " " + r.ms + "ms" : ""}`).join(", "));
