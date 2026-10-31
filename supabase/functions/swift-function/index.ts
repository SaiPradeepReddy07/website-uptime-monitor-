const appOrigin = "https://saipradeepreddy07.github.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) return true;

  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const [a, b] = parts.map(Number);
    if (parts.some((part) => Number(part) > 255)) return true;
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224;
  }

  return host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("Missing Supabase function environment");
    return json({ error: "Instant checks are not configured." }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Sign in to check this site." }, 401);
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) {
      return json({ error: "Your session expired. Sign in again." }, 401);
    }

    const input = await req.json().catch(() => null);
    const siteId = input?.site_id;
    if (typeof siteId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) {
      return json({ error: "A valid site id is required." }, 400);
    }

    // The user-scoped query applies the site's existing RLS ownership policy.
    const siteResponse = await fetch(
      `${supabaseUrl}/rest/v1/sites?id=eq.${encodeURIComponent(siteId)}&select=id,url&limit=1`,
      { headers: { apikey: anonKey, Authorization: authorization } },
    );
    if (!siteResponse.ok) {
      return json({ error: "Could not verify site ownership." }, 403);
    }
    const sites = await siteResponse.json();
    if (!Array.isArray(sites) || sites.length !== 1) {
      return json({ error: "Site not found for this account." }, 404);
    }

    const rawUrl = String(sites[0].url || "");
    const target = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    if (!["http:", "https:"].includes(target.protocol) || isPrivateHost(target.hostname)) {
      return json({ error: "This site address cannot be checked." }, 400);
    }

    let result: { up: boolean; status: number | null; ms: number | null };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const started = performance.now();
    try {
      const response = await fetch(target.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "website-uptime-monitor" },
      });
      result = {
        up: response.status < 400,
        status: response.status,
        ms: Math.round(performance.now() - started),
      };
    } catch {
      result = { up: false, status: null, ms: null };
    } finally {
      clearTimeout(timeout);
    }

    // Only the server function writes check rows; service credentials never reach the browser.
    const saved = await fetch(`${supabaseUrl}/rest/v1/checks?select=checked_at`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ site_id: siteId, ...result }),
    });
    if (!saved.ok) {
      console.error("Could not save instant check:", saved.status);
      return json({ error: "The check ran but its result could not be saved." }, 500);
    }
    const savedRows = await saved.json();
    return json({
      site_id: siteId,
      ...result,
      checked_at: savedRows?.[0]?.checked_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Instant check failed:", error);
    return json({ error: "Could not run the instant check. Try again shortly." }, 500);
  }
});
