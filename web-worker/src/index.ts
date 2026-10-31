/**
 * SREE DURGA HARIHARA ENTERPRISES — web API (Cloudflare Worker)
 * W1: health. W2: phone + password auth with HttpOnly signed sessions.
 * Secrets (wrangler secret / .dev.vars): DATABASE_URL, SESSION_SECRET.
 */
import { neon } from "@neondatabase/serverless";
import { argon2id } from "@noble/hashes/argon2.js";
import { normalizePhone } from "../../src/logic/auth";
import { getDb, withTransaction } from "../../src/db/client";
import { sql } from "drizzle-orm";
import { listItems } from "../../src/db/items";
import { getSaleBill, listSaleBills } from "../../src/db/billing";
import { listExpenses } from "../../src/db/expenses";
import { listActivity } from "../../src/db/activity";
import { getShopDetails, saveShopDetails } from "../../src/db/settings";
import { createItem, deleteItem } from "../../src/db/items";
import { cancelSaleBill, createCustomer, createSaleBill } from "../../src/db/billing";
import { addPurchase, deletePurchase } from "../../src/db/purchases";
import { saveStockEntry } from "../../src/db/stock";
import { createExpense, deleteExpense, updateExpense } from "../../src/db/expenses";
import { setAuditActor, type AuditActor } from "../../src/db/activity";

export interface Env {
  DATABASE_URL?: string;
  SESSION_SECRET?: string;
}

const COOKIE = "sdhhe_session";
const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60_000;

type Session = { uid: number; name: string; role: "owner" | "staff"; exp: number };

const attempts = new Map<string, { count: number; resetAt: number }>();

// Writes in one isolate are serialized so the audit actor cannot leak between requests.
let writeQueue: Promise<unknown> = Promise.resolve();

function asActor<T>(actor: AuditActor, fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    setAuditActor(actor);
    try {
      return await fn();
    } finally {
      setAuditActor(null);
    }
  });
  writeQueue = run.catch(() => {});
  return run;
}

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

function b64url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const pad = value.length % 4 ? "=".repeat(4 - (value.length % 4)) : "";
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

async function createToken(session: Session, secret: string): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(session)));
  const signature = b64url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

async function readSession(request: Request, secret: string): Promise<Session | null> {
  const cookie = request.headers.get("Cookie") ?? "";
  const part = cookie.split(/;\s*/).find((entry) => entry.startsWith(`${COOKIE}=`));
  if (!part) return null;
  const [payload, signature] = part.slice(COOKIE.length + 1).split(".");
  if (!payload || !signature) return null;
  if (signature !== b64url(await hmac(secret, payload))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function b64decode(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function b64encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/=+$/, "");
}

/** Verify a PHC argon2id hash ($argon2id$v=19$m=…,t=…,p=…$salt$digest). */
function verifyArgon2(password: string, hash: string): boolean {
  const parts = hash.split("$");
  if (parts.length !== 6 || parts[1] !== "argon2id") return false;
  const params = new Map(
    parts[3].split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const m = Number(params.get("m"));
  const t = Number(params.get("t"));
  const p = Number(params.get("p"));
  if (!Number.isFinite(m) || !Number.isFinite(t) || !Number.isFinite(p)) return false;
  const salt = b64decode(parts[4]);
  const expected = b64encode(b64decode(parts[5]));
  const digest = argon2id(new TextEncoder().encode(password), salt, {
    m,
    t,
    p,
    dkLen: b64decode(parts[5]).length,
  });
  const actual = b64encode(digest);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function sessionCookie(token: string, url: URL): string {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}`;
}

function clearCookie(): string {
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function retryAfterMs(phone: string): number {
  const entry = attempts.get(phone);
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) {
    attempts.delete(phone);
    return 0;
  }
  return entry.count >= MAX_ATTEMPTS ? entry.resetAt - Date.now() : 0;
}

function recordFailure(phone: string): void {
  const now = Date.now();
  const entry = attempts.get(phone);
  if (!entry || now > entry.resetAt) {
    attempts.set(phone, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

async function login(request: Request, env: Env, url: URL): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { phone?: string; password?: string } | null;
  if (!body?.phone || !body?.password) {
    return json({ error: "Phone and password are required" }, { status: 400 });
  }
  const phone = normalizePhone(body.phone);
  if (!phone.valid) return json({ error: phone.reason }, { status: 400 });

  const wait = retryAfterMs(phone.phone);
  if (wait > 0) {
    return json({ error: `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s` }, { status: 429 });
  }

  const sql = neon(env.DATABASE_URL as string);
  const rows = (await sql`
    select id, name, phone, password_hash, role, active
    from app_users where phone = ${phone.phone} limit 1
  `) as { id: number; name: string; password_hash: string; role: string; active: boolean }[];

  const user = rows[0];
  if (!user) {
    recordFailure(phone.phone);
    return json({ error: "No account found for this number" }, { status: 404 });
  }
  if (!user.active) {
    return json({ error: "This account is disabled — ask the owner" }, { status: 403 });
  }

  let valid = false;
  try {
    valid = verifyArgon2(body.password, user.password_hash);
  } catch (err) {
    console.error("argon2 verify failed:", err);
  }
  if (!valid) {
    recordFailure(phone.phone);
    return json({ error: "Wrong password" }, { status: 401 });
  }

  attempts.delete(phone.phone);
  const session: Session = {
    uid: Number(user.id),
    name: String(user.name),
    role: user.role === "owner" ? "owner" : "staff",
    exp: Date.now() + SESSION_HOURS * 3600_000,
  };
  const token = await createToken(session, env.SESSION_SECRET as string);
  return json(
    { user: { id: session.uid, name: session.name, role: session.role } },
    { headers: { "Set-Cookie": sessionCookie(token, url) } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "sdhhe-api",
        databaseConfigured: Boolean(env.DATABASE_URL),
        sessionConfigured: Boolean(env.SESSION_SECRET),
        at: new Date().toISOString(),
      });
    }

    if (!env.DATABASE_URL || !env.SESSION_SECRET) {
      return json({ error: "Server not configured" }, { status: 500 });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return login(request, env, url);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } });
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const session = await readSession(request, env.SESSION_SECRET);
      if (!session) return json({ error: "Not signed in" }, { status: 401 });
      return json({ user: { id: session.uid, name: session.name, role: session.role } });
    }

    // ---- W3 read API (session required) ----
    const session = await readSession(request, env.SESSION_SECRET);
    if (!session) return json({ error: "Not signed in" }, { status: 401 });

    const db = getDb(env.DATABASE_URL as string);
    try {
      if (url.pathname === "/api/_txn-test" && request.method === "GET") {
        const rows = await withTransaction(env.DATABASE_URL as string, (tx) =>
          tx.execute(sql`select 1 as ok`),
        );
        return json({ ok: true, rows });
      }
      if (url.pathname === "/api/items" && request.method === "GET") {
        return json({ items: await listItems(db) });
      }

      if (url.pathname === "/api/bills" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
        return json({ bills: await listSaleBills(db, limit) });
      }

      if (url.pathname.startsWith("/api/bills/") && request.method === "GET") {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid bill id" }, { status: 400 });
        const bill = await getSaleBill(db, id);
        if (!bill) return json({ error: "Bill not found" }, { status: 404 });
        return json({ bill });
      }

      if (url.pathname === "/api/expenses" && request.method === "GET") {
        const month = url.searchParams.get("month") ?? undefined;
        const category = url.searchParams.get("category") ?? undefined;
        return json({ expenses: await listExpenses(db, { month, category }) });
      }

      if (url.pathname === "/api/activity" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 25, 200);
        return json({ activity: await listActivity(db, limit) });
      }

      if (url.pathname === "/api/shop" && request.method === "GET") {
        return json({ shop: await getShopDetails(db) });
      }

      // ---- W3b writes (session actor threaded per request) ----
      const actor: AuditActor = { userId: session.uid, name: session.name, role: session.role };
      const body = ["POST", "PUT"].includes(request.method)
        ? await request.json().catch(() => ({}))
        : {};

      if (url.pathname === "/api/items" && request.method === "POST") {
        return json({ item: await asActor(actor, () => createItem(db, body)) });
      }

      if (url.pathname.startsWith("/api/items/") && request.method === "DELETE") {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid item id" }, { status: 400 });
        await asActor(actor, () => deleteItem(db, id));
        return json({ ok: true });
      }

      if (url.pathname === "/api/customers" && request.method === "POST") {
        return json({ customer: await asActor(actor, () => createCustomer(db, body)) });
      }

      if (url.pathname === "/api/expenses" && request.method === "POST") {
        return json({ expense: await asActor(actor, () => createExpense(db, body)) });
      }

      if (url.pathname.startsWith("/api/expenses/") && request.method === "PUT") {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid expense id" }, { status: 400 });
        return json({ expense: await asActor(actor, () => updateExpense(db, id, body)) });
      }

      if (url.pathname.startsWith("/api/expenses/") && request.method === "DELETE") {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid expense id" }, { status: 400 });
        await asActor(actor, () => deleteExpense(db, id));
        return json({ ok: true });
      }

      if (url.pathname === "/api/shop" && request.method === "PUT") {
        await asActor(actor, () => saveShopDetails(db, body));
        return json({ ok: true });
      }

      // ---- W3c transactional writes (Neon WebSocket pool, verified on Workers) ----
      if (url.pathname === "/api/purchases" && request.method === "POST") {
        return json({ purchase: await asActor(actor, () => addPurchase(db, body)) });
      }

      if (url.pathname.startsWith("/api/purchases/") && request.method === "DELETE") {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid purchase id" }, { status: 400 });
        await asActor(actor, () => deletePurchase(env.DATABASE_URL as string, id));
        return json({ ok: true });
      }

      if (url.pathname === "/api/bills" && request.method === "POST") {
        return json({ bill: await asActor(actor, () => createSaleBill(env.DATABASE_URL as string, body)) });
      }

      if (url.pathname.match(/^\/api\/bills\/\d+\/cancel$/) && request.method === "POST") {
        const id = Number(url.pathname.split("/")[3]);
        return json({ result: await asActor(actor, () => cancelSaleBill(env.DATABASE_URL as string, id)) });
      }

      if (url.pathname === "/api/stock" && request.method === "POST") {
        return json({ stock: await asActor(actor, () => saveStockEntry(env.DATABASE_URL as string, body)) });
      }
    } catch (err) {
      console.error("api error:", err);
      return json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};
