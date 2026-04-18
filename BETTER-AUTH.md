# Better-Auth on Cloudflare Workers

> Lessons learned migrating RV Joyride from Clerk to better-auth. Self-hosted auth on Workers with zero vendor lock-in.

---

## Why Better-Auth over Clerk

| | Clerk | Better-Auth |
|--|-------|-------------|
| **Cost** | Free tier → $25/mo at scale | Free forever (self-hosted) |
| **Vendor lock-in** | High — Clerk hosts your users | None — your DB, your users |
| **Latency** | Extra hop to Clerk servers on every auth check | In-process — session check is a DB query via Hyperdrive |
| **Bundle** | `@clerk/clerk-react` adds ~50KB | `better-auth/react` is ~8KB |
| **Customization** | Limited to Clerk's UI components or custom + API | Full control — your email templates, your flows |
| **Workers compat** | Works but JWT verify on every request | Native — runs entirely in your Worker |
| **Data ownership** | Users live on Clerk's infra | Users table in your own Postgres |

**Bottom line:** Clerk is faster to set up (15 min), but better-auth is cheaper, faster at runtime, and you own everything. For production apps, better-auth wins.

---

## Architecture

```
Browser → Cookie (HttpOnly, cross-subdomain)
   ↓
Hono Worker → better-auth handler (/api/auth/*)
   ↓
Custom Postgres Adapter → PlanetScale via Hyperdrive
   ↓
Resend API (transactional emails)
```

### Key Design Decisions

1. **`better-auth/minimal`** — Must use this import, not `better-auth`. The full import pulls in Kysely which breaks Wrangler's esbuild bundler.

2. **Custom adapter, not Kysely/Drizzle** — Since we use `better-auth/minimal`, we implement `createAdapterFactory` directly against `postgres.js`. This avoids any ORM dependency.

3. **Per-request auth instance** — `createAuth(env, sql, ctx)` is called per-request because Workers env bindings are only available in request context.

4. **Session cookies, not JWTs** — better-auth uses stateful sessions (stored in DB) with HttpOnly cookies. No JWT verification overhead — just a DB lookup (fast via Hyperdrive).

---

## Database Setup

### Required Tables

better-auth needs these tables. Use `usePlural: true` in the adapter config so it maps `user` → `users`, `session` → `sessions`, etc.

```sql
-- Core auth tables (better-auth expects these)
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_verifications_identifier ON verifications(identifier);
```

### camelCase ↔ snake_case

better-auth uses camelCase internally (`expiresAt`, `userId`) but Postgres conventions use snake_case (`expires_at`, `user_id`). The custom adapter must convert both directions:

```typescript
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
```

Apply `keysToSnake()` on all data going INTO the DB, and `keysToCamel()` on all data coming OUT.

---

## Custom Postgres Adapter

The adapter implements CRUD operations via `createAdapterFactory` from `better-auth/adapters`. Key config:

```typescript
import { createAdapterFactory } from "better-auth/adapters";

const adapterCreator = createAdapterFactory({
  config: {
    adapterId: "postgres-raw",
    adapterName: "Postgres Raw Adapter",
    usePlural: true,        // user → users, session → sessions
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsArrays: false,  // PlanetScale doesn't support PG arrays well
    transaction: async (cb) => {
      return sql.begin(async (trx) => {
        // Create a transactional adapter instance
        return cb(trxAdapter);
      });
    },
  },
  adapter: buildAdapterOps(db),
});
```

### Gotcha: `usePlural: true`

This is critical. Without it, better-auth looks for table `verification` instead of `verifications`, `session` instead of `sessions`, etc. Must match your actual table names.

### Gotcha: Lazy options pattern

The adapter factory returns a function that takes `options` (provided by better-auth internally). We use a closure pattern to capture these options for transaction adapters:

```typescript
export function createRawAdapter(sql: Sql) {
  let lazyOptions: any = null;
  const adapterCreator = createAdapterFactory({ ... });
  return (options: any) => {
    lazyOptions = options;
    return adapterCreator(options);
  };
}
```

---

## Auth Configuration (Server)

```typescript
// auth.ts
import { betterAuth } from "better-auth/minimal";  // NOT "better-auth"
import { emailOTP } from "better-auth/plugins/email-otp";
import { bearer } from "better-auth/plugins/bearer";

export function createAuth(env: Env, sql: SqlClient, ctx?: ExecutionContext) {
  return betterAuth({
    baseURL: env.API_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: createRawAdapter(sql),

    // Email + password (secondary flow)
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    // Session config
    session: {
      expiresIn: 60 * 60 * 24 * 30,  // 30 days
      updateAge: 60 * 60 * 24 * 7,    // refresh weekly
      cookieCache: { enabled: false }, // disable on Workers (no shared memory)
    },

    // Cross-subdomain cookies (api.example.com ↔ app.example.com)
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: env.ENVIRONMENT === "production" ? ".yourdomain.com" : undefined,
      },
      defaultCookieAttributes: {
        secure: env.ENVIRONMENT === "production",
        httpOnly: true,
        sameSite: env.ENVIRONMENT === "production" ? "lax" : "none",
        path: "/",
      },
    },

    trustedOrigins: [
      env.APP_URL,
      "https://yourdomain.com",
      "http://localhost:5173",
    ],

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,  // 10 minutes
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendEmail(env.RESEND_API_KEY, { to: email, ... });
        },
      }),
      bearer(),  // enables Authorization: Bearer <token> for mobile
    ],
  });
}
```

### Wiring into Hono

```typescript
// index.ts

// Per-request DB singleton (shared across all middleware + routes)
app.use("/api/*", async (c, next) => {
  c.set("db", getDb(c.env));
  return next();
});

// better-auth catch-all handler (no auth middleware — auth routes are public)
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const auth = createAuth(c.env, c.get("db"), c.executionCtx);
  return auth.handler(c.req.raw);
});
```

### Auth Middleware

```typescript
// middleware/auth.ts
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env, c.get("db"), c.executionCtx);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session?.user) {
    c.set("userId", session.user.id);
    return next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});
```

---

## Auth Client (React)

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const API_BASE = import.meta.env.VITE_API_URL || "";
// VITE_API_URL is "https://api.example.com/api" but basePath is "/api/auth"
// Strip trailing "/api" to avoid double-pathing
const AUTH_BASE = API_BASE.replace(/\/api$/, "") || undefined;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE,
  basePath: "/api/auth",
  plugins: [emailOTPClient()],
});
```

### Gotcha: Double `/api` in URL

If your `VITE_API_URL` is `https://api.example.com/api` and `basePath` is `/api/auth`, you'll get `https://api.example.com/api/api/auth/...`. Always strip the trailing `/api` from the base URL.

### Auth Hook

```typescript
// hooks/use-auth.ts
export function useAuth() {
  const { data: session, isPending } = authClient.useSession();

  return {
    isSignedIn: !!session?.user,
    isLoaded: !isPending,
    userId: session?.user?.id ?? null,
    signOut: () => authClient.signOut(),
    user: session?.user ?? null,
  };
}
```

### Dynamic Proxy Client

better-auth's client uses `createDynamicPathProxy` — it auto-maps method calls to API endpoints:
- `authClient.listSessions()` → `GET /api/auth/list-sessions`
- `authClient.revokeSession({ id })` → `POST /api/auth/revoke-session`
- `authClient.emailOtp.sendVerificationOtp(...)` → `POST /api/auth/email-otp/send-verification-otp`

TypeScript types may not know about these dynamic methods. Use `(authClient as any).listSessions()` if needed.

---

## Email Setup (Resend)

### Domain Configuration

Set up two Resend domains:
- `auth.yourdomain.com` — transactional auth emails (OTP, verification, password reset)
- `notify.yourdomain.com` — notification emails (login alerts, marketing)

### Email Template Consistency Checklist

All templates should share:
- **Header**: `🏕️ Brand Name` in `#ea580c` (or your brand color), 24px bold, centered
- **Content box**: `background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center;`
- **Font stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Footer**: Disclaimer in `#94a3b8`, 13px, centered
- **Max width**: 480px, auto-centered
- **Muted text color**: `#94a3b8` (consistent across all templates)

---

## Critical: `pg.Client` vs `pg.Pool` on Hyperdrive

> **Lesson learned from Conquest LPR (March 2026).** This one took days to debug.

Hyperdrive IS a connection pooler. It manages the real connections to PlanetScale at the edge. Using `pg.Pool` inside your Worker adds a **second layer of pooling on top of Hyperdrive**, which causes deadlocks, connection starvation, and timeouts under load.

### The Problem

When better-auth was added, `pg.Pool` was introduced because Kysely (better-auth's DB adapter) requires a Pool interface. Then the entire app's Database class was migrated to share that Pool. This caused cascading failures:

1. Multiple pools competing for the same Hyperdrive connections → deadlocks
2. Isolated per-request pools → connection storms
3. Pool size escalation (1 → 4 → 8 → 12) → Hyperdrive connection exhaustion
4. Stale idle connections from old isolates eating Hyperdrive's 60-connection limit

### The Fix

```
BROKEN:  Database class → pg.Pool (shared) → Hyperdrive → PlanetScale
                                    ↑
         Better Auth Kysely ────────┘  (competing for same pool)

WORKING: Database class → pg.Client (direct) → Hyperdrive → PlanetScale
         Better Auth Kysely → pg.Pool(max=1) → Hyperdrive → PlanetScale
```

**Use `pg.Client` for all app database access.** Each request creates a direct connection to Hyperdrive, uses it, and closes it. Hyperdrive handles the real pooling.

**Only use `pg.Pool` where absolutely required** (e.g., Kysely adapter), and keep it minimal (`max: 1`).

```typescript
// GOOD — direct client, one connection per request
export class PostgresDatabase {
  private client: Client | null = null;
  constructor(private connectionString: string) {}

  async getClient(): Promise<Client> {
    if (!this.client) {
      const { Client: PgClient } = await import('pg');
      this.client = new PgClient({ connectionString: this.connectionString });
      await this.client.connect();
    }
    return this.client;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}

// BAD — pool on top of Hyperdrive
const pool = new Pool({ connectionString: env.HYPERDRIVE.connectionString, max: 5 });
```

### If Using Kysely (e.g., better-auth's built-in adapter)

Do NOT use a real `pg.Pool` — even `max: 1` causes stale connections when Hyperdrive recycles the proxy connection. Instead, create a fake Pool wrapper that gives Kysely a fresh `pg.Client` per query:

```typescript
function createHyperdriveKyselyPool(connectionString: string): Pool {
  return {
    connect: async () => {
      const { Client } = await import('pg');
      const client = new Client({ connectionString });
      await client.connect();
      (client as any).release = async () => { await client.end(); };
      return client as any;
    },
    end: async () => {},
    on: () => {},
    removeAllListeners: () => {},
    query: async (...args: any[]) => {
      const { Client } = await import('pg');
      const client = new Client({ connectionString });
      await client.connect();
      try { return await (client as any).query(...args); }
      finally { await client.end(); }
    },
  } as unknown as Pool;
}
```

This satisfies Kysely's Pool interface while creating fresh connections per query — matching how the rest of the app works. No stale connections, no pool contention.

### If Using `postgres.js` (custom adapter approach)

This problem doesn't apply — `postgres.js` (`postgres()`) manages its own lightweight connections and works naturally with Hyperdrive without a Pool.

---

## Performance: What NOT to Do

### Never block sign-in with notification emails

```typescript
// BAD — blocks sign-in by 200-500ms (Resend API round-trip)
databaseHooks: {
  session: {
    create: {
      after: async (session) => {
        await sendEmail(...);  // ← blocks the response
      },
    },
  },
},

// GOOD — fire-and-forget via waitUntil
databaseHooks: {
  session: {
    create: {
      after: async (session) => {
        const work = (async () => {
          // DB query + sendEmail
        })();
        if (ctx) ctx.waitUntil(work);
        // Return immediately — don't await
      },
    },
  },
},
```

### Disable cookie cache on Workers

```typescript
session: {
  cookieCache: { enabled: false },  // Workers have no shared memory across isolates
},
```

Cookie caching assumes a long-lived process. Workers are ephemeral — cached cookies would be stale immediately.

### Share one DB connection per request

Don't create a new `postgres()` instance in every route handler. Use Hono context middleware:

```typescript
app.use("/api/*", async (c, next) => {
  c.set("db", getDb(c.env));
  return next();
});

// In routes: c.get("db") instead of getDb(c.env)
```

This reduces connection pressure on PlanetScale/Hyperdrive from N connections per request to 1.

---

## Session Management

better-auth includes built-in session management endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/list-sessions` | GET | List all active sessions for current user |
| `/api/auth/revoke-session` | POST | Revoke a specific session by ID |
| `/api/auth/revoke-sessions` | POST | Revoke all sessions |
| `/api/auth/revoke-other-sessions` | POST | Revoke all except current |

These are automatically available via the `app.on(["POST", "GET"], "/api/auth/*", ...)` catch-all. No custom routes needed.

### Client Usage

```typescript
const res = await (authClient as any).listSessions();
const sessions = res.data; // [{ id, token, ipAddress, userAgent, ... }]

await (authClient as any).revokeSession({ id: sessionId });
await (authClient as any).revokeOtherSessions();
```

---

## Migration Checklist: Clerk → Better-Auth

1. **Create auth tables** — `users`, `sessions`, `accounts`, `verifications`
2. **Build custom adapter** — `createAdapterFactory` with `usePlural: true` and snake_case conversion
3. **Set secrets** — `BETTER_AUTH_SECRET` (32+ byte hex), `RESEND_API_KEY`
4. **Replace ClerkProvider** — `createAuthClient` from `better-auth/react`
5. **Replace `useAuth()`** — Wrap `authClient.useSession()` to match old interface
6. **Replace `verifyToken()`** — `auth.api.getSession({ headers })` in middleware
7. **Update CORS** — Add `trustedOrigins` in better-auth config
8. **Set up Resend** — Domain verification, email templates
9. **Test OTP flow** — Send to real email (Resend rejects fake domains)
10. **Deploy** — Set secrets via `wrangler secret put`

### Secrets to Configure

```bash
wrangler secret put BETTER_AUTH_SECRET    # openssl rand -hex 32
wrangler secret put RESEND_API_KEY        # from resend.com dashboard
```

---

## Comparison: Auth Middleware (Before/After)

### Clerk (Before)

```typescript
import { verifyToken } from "@clerk/backend";

async function requireAuth(c, next) {
  const token = c.req.header("Authorization")?.slice(7);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, {
    secretKey: c.env.CLERK_SECRET_KEY,
  });
  c.set("userId", payload.sub);
  return next();
}
```

**Latency**: ~50-150ms (network call to Clerk to verify JWT, or local RSA verify with cached JWKS)

### Better-Auth (After)

```typescript
const auth = createAuth(c.env, c.get("db"), c.executionCtx);
const session = await auth.api.getSession({ headers: c.req.raw.headers });
if (session?.user) {
  c.set("userId", session.user.id);
  return next();
}
```

**Latency**: ~5-15ms (single DB query via Hyperdrive, no external service)

---

## Files Reference (RV Joyride)

| File | Purpose |
|------|---------|
| `apps/api/src/auth.ts` | `createAuth()` — better-auth config |
| `apps/api/src/auth-adapter.ts` | Custom postgres adapter with snake_case conversion |
| `apps/api/src/middleware/auth.ts` | `requireAuth` middleware (session + API key) |
| `apps/api/src/services/resend.ts` | Email templates (OTP, verification, login notification) |
| `apps/web/src/lib/auth-client.ts` | Client-side `createAuthClient` |
| `apps/web/src/hooks/use-auth.ts` | `useAuth()` hook wrapping better-auth |
| `apps/web/src/hooks/use-sessions.ts` | Session management hooks |
| `apps/web/src/pages/login.tsx` | Login page (OTP + password flows) |
| `apps/web/src/pages/settings.tsx` | Session list + revoke UI |
| `sql/migrations/048_better_auth.sql` | Auth tables migration |
