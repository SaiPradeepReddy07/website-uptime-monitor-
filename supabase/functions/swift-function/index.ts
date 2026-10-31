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
  const host = hostname.replace(/^\\[|\\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) return true;

  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\\d+$/.test(part))) {
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

function targetUrl(rawUrl: string): URL | null {
  try {
    const target = new URL(/^https?:\\/\\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    if (!["http:", "https:"].includes(target.protocol) || isPrivateHost(target.hostname)) return null;
    return target;
  } catch {
    return null;
  }
}

async function ping(target: URL): Promise<{ up: boolean; status: number | null; ms: number | null }> {
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
    return {
      up: response.status < 400,
      status: response.status,
      ms: Math.round(performance.now() - started),
    };
  } catch {
    return { up: false, status: null, ms: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  run: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= values.length) return;
      results[index] = await run(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
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

  const scheduledSecret = req.headers.get("x-uptime-cron-secret");
  if (scheduledSecret) {
    try {
      const validation = await fetch(
        `${supabaseUrl}/rest/v1/rpc/verify_uptime_cron_secret`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ candidate: scheduledSecret }),
        },
      );
      if (!validation.ok || await validation.json() !== true) {
        return json({ error: "Unauthorized scheduler request." }, 401);
      }

      const siteResponse = await fetch(
        `${supabaseUrl}/rest/v1/sites?select=id,url`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      );
      if (!siteResponse.ok) {
        console.error("Could not load sites for scheduled check:", siteResponse.status);
        return json({ error: "Could not load sites for scheduled check." }, 500);
      }

      const sites = await siteResponse.json();
      const rows = await mapWithConcurrency(
        sites,
        8,
        async (site: { id: string; url: string }) => {
          const target = targetUrl(String(site.url || ""));
          const result = target
            ? await ping(target)
            : { up: false, status: null, ms: null };
          return { site_id: site.id, ...result };
        },
      );

      if (rows.length) {
        const saved = await fetch(`${supabaseUrl}/rest/v1/checks`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(rows),
        });
        if (!saved.ok) {
          console.error("Could not save scheduled checks:", saved.status);
          return json({ error: "Could not save scheduled checks." }, 500);
        }
      }
      return json({ checked: rows.length });
    } catch (error) {
      console.error("Scheduled check failed:", error);
      return json({ error: "Scheduled check failed." }, 500);
    }
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

    const target = targetUrl(String(sites[0].url || ""));
    if (!target) return json({ error: "This site address cannot be checked." }, 400);

    const result = await ping(target);
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
