/**
 * SREE DURGA HARIHARA ENTERPRISES — web API (Cloudflare Worker)
 * W1: scaffold + health check. The Neon URL is a Worker secret, never sent to the browser.
 */

export interface Env {
  DATABASE_URL?: string;
  SESSION_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        ok: true,
        service: "sdhhe-api",
        databaseConfigured: Boolean(env.DATABASE_URL),
        sessionConfigured: Boolean(env.SESSION_SECRET),
        at: new Date().toISOString(),
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
