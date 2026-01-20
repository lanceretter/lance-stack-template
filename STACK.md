# Lance's Preferred Tech Stack

> Reference guide for starting new projects. Based on patterns from conquest-hub, conquest-pbx, trashtastic-website-beta, trashtastic-helix, conquest-lpr, and conquest-bitminer.

---

## 💡 Philosophy: Local-First, Cloud-Deployable

Everything runs locally for development, but deploys to Cloudflare with zero changes.

### Key Principles

1. **Local Wrangler** — API runs via `wrangler dev --persist-to .wrangler/state` on port 8787
2. **Vite Proxy** — Frontend proxies `/api/*` to localhost:8787 during dev
3. **Shared Core Package** — Business logic in `packages/core/`, imported by both web and api
4. **Same Code, Any Database** — Core logic is database-agnostic; swap KV/D1/PlanetScale via bindings

### Local Development Flow

```bash
# Terminal 1: API (Cloudflare Worker running locally)
cd apps/api
npm run dev  # wrangler dev --port 8787 --persist-to .wrangler/state

# Terminal 2: Frontend (Vite with proxy)
cd apps/web
npm run dev  # vite on port 5173, proxies /api/* to :8787

# Or from root:
npm run dev  # concurrently runs both
```

### Database Strategy

The core package contains pure business logic with no database dependencies. Database access happens at the API layer:

| Environment | Database | Access Method |
|-------------|----------|---------------|
| **Local Dev** | D1 (SQLite) or KV | `wrangler dev --persist-to` |
| **Production** | D1, PlanetScale, or Supabase | Cloudflare bindings / Hyperdrive |

For PlanetScale/external Postgres, use Hyperdrive for connection pooling:

```toml
# wrangler.toml
[[hyperdrive]]
binding = "DB"
id = "your-hyperdrive-config-id"
```

### Core Package Pattern

Business logic lives in `packages/core/` — pure TypeScript, no runtime dependencies:

---

## 🤖 Cursor Agent Best Practices (Team Workflow)

Optional guidance for working with Cursor's AI agent in this stack. These patterns are adapted from [Cursor's agent best practices](https://cursor.com/blog/agent-best-practices) and tailored for this monorepo setup.

### Plan-First Workflow

Use **Plan Mode** (`Shift+Tab`) for:
- New features spanning multiple files/packages
- Architectural changes (adding new bindings, changing auth, DB migrations)
- Unfamiliar areas of the codebase

Skip planning for:
- Quick bug fixes in a single file
- Adding a new Hono route following existing patterns
- Simple UI tweaks in `apps/web`

**Tip:** Save plans to `.cursor/plans/` for documentation and to resume interrupted work.

### Context Strategy for This Stack

When prompting, tag relevant paths to help the agent find context faster:

| Task | Tag These |
|------|-----------|
| API changes | `apps/api/`, `wrangler.toml` |
| Frontend changes | `apps/frontend/`, `vite.config.ts` |
| Shared logic | `packages/core/` |
| Full-stack feature | `apps/api/`, `apps/web/`, `packages/core/` |
| Auth changes | `apps/api/src/` (middleware), `apps/web/src/` (ClerkProvider) |
| Database schema | `sql/migrations/`, `wrangler.toml` |

The agent can also search the codebase automatically — don't over-tag if you're unsure.

### Test-Driven Development Loop

This stack uses **Vitest** for testing in `packages/core/`. For business logic changes:

1. Ask the agent to write tests first based on expected behavior
2. Confirm tests fail (agent should not write implementation yet)
3. Commit the tests
4. Ask the agent to implement code that passes tests (without modifying tests)
5. Commit the implementation

Tests give the agent a clear success signal to iterate against.

### Git Workflow Safety

**Never commit secrets.** This stack uses:
- `.env.local` / `.env.production` for frontend env vars (gitignored)
- `wrangler secret put` for Worker secrets (never in code)
- Clerk keys should be in env files or Cloudflare secrets, not committed

**Commit hygiene:**
- Commit logical units of work separately
- Use descriptive commit messages (the agent can help draft these)
- Review diffs before accepting — AI-generated code can look correct but have subtle bugs

### When to Start a New Chat

**Start fresh when:**
- Moving to a different feature or package
- The agent seems confused or keeps repeating mistakes
- You've finished one logical unit of work

**Continue the conversation when:**
- Iterating on the same feature
- Debugging something the agent just built
- The agent needs earlier context

Long conversations accumulate noise. If agent effectiveness drops, start a new chat and use `@Past Chats` to reference previous work.

### Useful Agent Commands

If you've set up `.cursor/commands/` (see below), you can use:
- `/pr` — Commit, push, and open a pull request
- `/review` — Run checks and summarize potential issues
- `/fix-issue [number]` — Fetch a GitHub issue and implement a fix
- `/update-deps` — Update dependencies incrementally with tests

---

```typescript
// packages/core/src/index.ts
export * from "./types";
export * from "./calculations";
export * from "./validators";
```

```json
// packages/core/package.json
{
  "name": "@myproject/core",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "vitest": "^2.1.0"
  }
}
```

Import in both apps:

```typescript
// apps/api/src/index.ts
import { calculateThing, type MyType } from "@myproject/core";

// apps/web/src/lib/utils.ts
import { validateInput } from "@myproject/core";
```

---

## 🏗️ Project Structure

Monorepo with `npm workspaces`:

```
project-name/
├── apps/
│   ├── web/              # Frontend (Vite + React)
│   └── api/              # API (Cloudflare Worker + Hono)
├── packages/
│   ├── core/             # Shared business logic
│   └── shared/           # Shared types/utils (optional)
├── package.json          # Root with workspaces
├── turbo.json            # Optional - for Turborepo
└── README.md
```

---

## 🎨 Frontend Stack

| Category | Choice | Version |
|----------|--------|---------|
| **Framework** | React | 18.x |
| **Build Tool** | Vite | 5.x |
| **Language** | TypeScript | 5.x |
| **Styling** | TailwindCSS | 3.4.x |
| **Animations** | tailwindcss-animate | 1.x |
| **Component Library** | shadcn/ui | (copy-paste) |
| **UI Primitives** | Radix UI | @radix-ui/react-* |
| **Icons** | Lucide React | latest |
| **Routing** | React Router DOM | 6.x |
| **Data Fetching** | TanStack React Query | 5.x |
| **Forms** | React Hook Form | 7.x |
| **Form Validation** | Zod + @hookform/resolvers | latest |
| **Tables** | TanStack React Table | 8.x |
| **Toasts** | Sonner | 1.x |
| **Date Handling** | date-fns | 3.x |
| **Charts** | Recharts | 2.x |

### Utility Libraries
- `clsx` - Conditional classnames
- `tailwind-merge` - Merge Tailwind classes without conflicts
- `class-variance-authority` - Component variants (CVA)

### Frontend Dependencies (copy-paste)

```json
{
  "name": "@myproject/web",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler pages deploy dist"
  },
  "dependencies": {
    "@myproject/core": "*",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@tanstack/react-query": "^5.56.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.462.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react-swc": "^3.5.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "wrangler": "^4.50.0"
  }
}
```

---

## 🌗 Theming (Light / Dark / System)

Cloudflare-inspired dark mode with thin scrollbars and system preference detection.

### Theme Provider

```typescript
// src/components/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
```

### Theme Switcher Component

```typescript
// src/components/ThemeSwitcher.tsx
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

const themes = [
  { name: "Light", value: "light", icon: Sun },
  { name: "Dark", value: "dark", icon: Moon },
  { name: "System", value: "system", icon: Monitor },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <currentTheme.icon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.name}
            onClick={() => setTheme(t.value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <t.icon className="h-4 w-4" />
            <span>{t.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Prevent Flash on Load (index.html)

Add this script in `<head>` before any styles load:

```html
<script>
  (function() {
    const theme = localStorage.getItem('vite-ui-theme') || 'system';
    document.documentElement.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.add(theme);
    }
  })();
</script>
```

### CSS Variables (index.css)

Cloudflare-inspired dark theme with near-neutral grays, thin scrollbars:

```css
@layer base {
  :root {
    /* =========================================
       LIGHT THEME
       ========================================= */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --radius: 0.5rem;
    
    /* Sidebar */
    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 240 10% 3.9%;
    --sidebar-primary: 217.2 91.2% 59.8%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 220 14.3% 95.9%;
    --sidebar-accent-foreground: 220.9 39.3% 11%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 224.3 76.3% 48%;
  }

  .dark {
    /* =========================================
       DARK THEME - Cloudflare-inspired
       Near-neutral grays with minimal saturation
       ========================================= */
    --background: 220 8% 10%;
    --foreground: 0 0% 85%;
    --card: 220 8% 12%;
    --card-foreground: 0 0% 85%;
    --popover: 220 8% 14%;
    --popover-foreground: 0 0% 85%;
    --muted: 220 6% 16%;
    --muted-foreground: 0 0% 55%;
    --border: 220 6% 20%;
    --input: 220 6% 18%;
    --ring: 217 70% 55%;
    --primary: 217 90% 61%;
    --primary-foreground: 220 8% 10%;
    --secondary: 220 6% 18%;
    --secondary-foreground: 0 0% 80%;
    --accent: 220 6% 18%;
    --accent-foreground: 0 0% 85%;
    --destructive: 0 50% 50%;
    --destructive-foreground: 0 0% 95%;
    
    /* Sidebar */
    --sidebar-background: 220 8% 8%;
    --sidebar-foreground: 0 0% 70%;
    --sidebar-primary: 217 70% 55%;
    --sidebar-primary-foreground: 0 0% 95%;
    --sidebar-accent: 220 6% 14%;
    --sidebar-accent-foreground: 0 0% 85%;
    --sidebar-border: 220 6% 16%;
    --sidebar-ring: 217 70% 55%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Thin, subtle scrollbars (Cloudflare-style) */
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }

  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  *::-webkit-scrollbar-thumb {
    background-color: hsl(var(--border));
    border-radius: 3px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5);
  }
}
```

---

## ⚡ Backend Stack

| Category | Choice |
|----------|--------|
| **Runtime** | Cloudflare Workers |
| **Framework** | Hono |
| **Validation** | Zod |
| **Config** | wrangler.toml |

### API Dependencies

```json
{
  "name": "@myproject/api",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --port 8787 --persist-to .wrangler/state",
    "dev:remote": "wrangler dev --remote --port 8787",
    "build": "tsc",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@myproject/core": "*",
    "hono": "^4.10.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "typescript": "^5.5.3",
    "wrangler": "^4.50.0"
  }
}
```

> **Note:** `--persist-to .wrangler/state` keeps KV/D1 data between restarts. Use `dev:remote` to test against production bindings.

### Hono API Pattern

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  // KV, D1, R2, Hyperdrive bindings
  MY_KV: KVNamespace;
  DB: D1Database;
  // Secrets
  API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use("/api/*", cors({
  origin: (origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS?.split(",") || ["*"];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  credentials: true,
}));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Routes
app.get("/api/items", async (c) => {
  // ...
});

// Scheduled handler (for cron)
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  // ...
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
```

---

## 🗄️ Database Options

| Database | Use Case | ORM/Client |
|----------|----------|------------|
| **PlanetScale** | Serverless PostgreSQL, branching | `postgres` via Hyperdrive |
| **Supabase** | Full-featured PostgreSQL + Auth + Realtime | `@supabase/supabase-js` |
| **Cloudflare D1** | Simple SQLite, low-latency | Raw SQL or Drizzle |

### PlanetScale Setup (Preferred)

Install the CLI:

```bash
brew install planetscale/tap/pscale
pscale auth login
```

### Local Database Access via pscale CLI

**No credentials needed** — uses your authenticated pscale session:

```bash
# Quick queries
export PSCALE_ALLOW_NONINTERACTIVE_SHELL=true
echo "SELECT * FROM users LIMIT 5;" | pscale shell my-db main --org my-org

# Or create helper scripts:
```

**scripts/pscale-query.sh:**

```bash
#!/bin/bash
export PSCALE_ALLOW_NONINTERACTIVE_SHELL=true
echo "$1" | pscale shell my-db main --org my-org
```

**scripts/pscale-migrate.sh:**

```bash
#!/bin/bash
export PSCALE_ALLOW_NONINTERACTIVE_SHELL=true
cat "$1" | pscale shell my-db main --org my-org
```

Usage:

```bash
./scripts/pscale-query.sh "SELECT COUNT(*) FROM orders;"
./scripts/pscale-migrate.sh sql/migrations/001_initial.sql
```

### Migrations Workflow

Store migrations in `sql/migrations/` with numbered prefixes:

```
sql/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_orders_table.sql
│   ├── 003_add_customer_status.sql
│   └── README.md
└── schema.sql  # Full schema for reference
```

**Apply migrations:**

```bash
# Via helper script
./scripts/pscale-migrate.sh sql/migrations/003_add_customer_status.sql

# Or directly
cat sql/migrations/003_add_customer_status.sql | pscale shell my-db main --org my-org
```

**Migration rules:**
1. Never modify existing migrations — create new ones
2. Naming: `XXX_description.sql` (e.g., `004_add_webhook_events.sql`)
3. Keep `sql/schema.sql` updated with full current schema
4. Document migrations in `sql/migrations/README.md`

### Hyperdrive for Production

Connect PlanetScale to Cloudflare Workers via Hyperdrive:

```toml
# wrangler.toml
[[hyperdrive]]
binding = "DB"
id = "your-hyperdrive-config-id"
```

```typescript
// Worker code
import postgres from "postgres";

const sql = postgres(c.env.DB.connectionString, {
  ssl: false,  // Hyperdrive handles SSL
});

const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Drizzle ORM (Optional)

If you prefer an ORM over raw SQL:

```json
{
  "dependencies": {
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.8"
  }
}
```

---

## 🔐 Authentication (Clerk)

Clerk is the preferred auth provider. **Always use production Clerk keys** — even for local development.

### Why Production Keys Everywhere?

- Your real Google login works locally
- No separate test users to manage
- Tokens validate against the same Clerk instance
- Simpler mental model: one environment, one set of keys

### How It Works Locally

```
Browser (localhost:5173)
    ↓ Click "Sign in with Google"
Clerk.js → Clerk's hosted auth (accounts.xxx.clerk.accounts.dev)
    ↓
Google OAuth consent screen
    ↓ Authenticate
Google → Clerk → localhost:5173 (redirect with session)
    ↓
Clerk.js gets JWT token
    ↓
App sends token → localhost:8787 (local Worker)
    ↓
Worker validates → Clerk API (using sk_live_xxx)
    ↓
✅ Authenticated!
```

**Key insight:** Clerk auth happens on Clerk's servers. Your localhost is just where the browser redirects after auth. Clerk doesn't care if you're on localhost or production.

### One-Time Setup

#### 1. Clerk Dashboard (Production Instance)

1. **Enable Google OAuth:**
   - User & Authentication → Social Connections → Google
   - Toggle "Enable for sign-up and sign-in"
   - Toggle "Use custom credentials" (required for production)
   - Copy the **Authorized redirect URI** (looks like `https://xxx.clerk.accounts.dev/v1/oauth_callback`)

2. **Get your keys:**
   - Settings → API Keys
   - Copy `pk_live_xxx` (Publishable key)
   - Copy `sk_live_xxx` (Secret key)

#### 2. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. **Authorized JavaScript origins:**
   - `http://localhost:5173`
   - `https://your-app.pages.dev`
4. **Authorized redirect URIs:**
   - Paste the Clerk redirect URI from step 1
5. Copy Client ID and Client Secret back to Clerk dashboard
6. **Set publishing status to "In Production"** (otherwise limited to 100 test users)

#### 3. Worker Secret

```bash
wrangler secret put CLERK_SECRET_KEY
# Enter: sk_live_xxxxx
```

#### 4. Environment Files

**.env.local** (local development):

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_API_URL=http://localhost:8787
```

**.env.production** (deployed):

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_API_URL=https://my-api.workers.dev
```

### Dependencies

```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.59.2"
  }
}
```

Worker (for token verification):

```json
{
  "dependencies": {
    "@clerk/backend": "^2.29.0"
  }
}
```

### Frontend Setup

```typescript
// main.tsx
import { ClerkProvider } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={CLERK_KEY}>
    <App />
  </ClerkProvider>
);
```

### Worker Auth Middleware

```typescript
import { verifyToken } from "@clerk/backend";

async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });
    c.set("userId", payload.sub);
    return next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

// Usage
app.get("/api/protected", requireAuth, async (c) => {
  const userId = c.get("userId");
  // ...
});
```

### Free Tier Limits

Clerk free tier includes:
- **10,000 monthly active users**
- **Unlimited social connections** (Google, GitHub, etc.)
- **No restrictions on localhost**

---

## 🔐 Alternative Auth Options

| Provider | Best For |
|----------|----------|
| **Supabase Auth** | When already using Supabase for everything |
| **Simple Password** | Internal tools (X-App-Password header) |

---

## ☁️ Cloudflare Bindings

| Binding | Use Case | wrangler.toml |
|---------|----------|---------------|
| **KV Namespace** | Config, cache, sessions | `[[kv_namespaces]]` |
| **R2 Bucket** | File/image storage | `[[r2_buckets]]` |
| **D1 Database** | SQLite database | `[[d1_databases]]` |
| **Hyperdrive** | External DB connection pooling | `[[hyperdrive]]` |
| **Queues** | Background jobs | `[[queues.producers]]` |
| **Durable Objects** | Real-time, WebSockets | `[[durable_objects.bindings]]` |
| **Cron Triggers** | Scheduled tasks | `[triggers]` |

### Example wrangler.toml

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-15"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

[[kv_namespaces]]
binding = "MY_KV"
id = "abc123..."

[[r2_buckets]]
binding = "FILES"
bucket_name = "my-files"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xyz789..."

[triggers]
crons = ["0 8 * * *"]  # Daily at 8 AM UTC
```

---

## 🚀 Deployment

| Component | Platform | Command |
|-----------|----------|---------|
| **Frontend** | Cloudflare Pages | `wrangler pages deploy dist` |
| **API** | Cloudflare Workers | `wrangler deploy` |

### Root package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:web": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "deploy": "npm run deploy:api && npm run deploy:web",
    "deploy:api": "npm run deploy --workspace=apps/api",
    "deploy:web": "npm run deploy --workspace=apps/web"
  },
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

---

## 📱 Mobile (Optional)

When you need iOS/Android from the web app:

```json
{
  "dependencies": {
    "@capacitor/android": "^7.4.3",
    "@capacitor/cli": "^7.4.3",
    "@capacitor/core": "^7.4.3",
    "@capacitor/ios": "^7.4.3"
  }
}
```

---

## 🛠️ Config Files

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
```

### components.json (shadcn/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### tsconfig.json (Frontend)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🚀 Quick Start Commands

```bash
# Create new project
mkdir my-project && cd my-project
npm init -y

# Setup workspaces
mkdir -p apps/web apps/api packages/core

# Create frontend
cd apps/web
npm create vite@latest . -- --template react-swc-ts
npm install
npx shadcn@latest init

# Create API
cd ../api
npm init -y
npm install hono zod
npm install -D wrangler @cloudflare/workers-types typescript

# Back to root
cd ../..
# Edit package.json to add workspaces
```

---

## 📚 Useful Links

- [Hono Docs](https://hono.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Clerk Docs](https://clerk.com/docs)
