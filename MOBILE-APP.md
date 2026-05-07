# Mobile App on Expo + EAS

> Lessons learned shipping native iOS/Android apps for an existing Cloudflare-Worker-backed product. Lifted verbatim from rv-helper (RV Joyride) and trashtastic-helix (driver app, May 2026). Use this when you need a real native app — not a PWA wrapper.

---

## Why Expo over Capacitor

Capacitor wraps your existing web app in a WebView. It's fast to set up, but you're shipping a webview-flavored experience: maps lag, gestures feel off, deep-OS features (background location, push, secure-store, biometrics) are bolted on rather than native.

Expo gives you a real React Native app with first-class native modules. Same React/TypeScript skill set, but the resulting app feels native because it is.

| | Capacitor | Expo / React Native |
|--|-----------|---------------------|
| **Setup** | 30 min — wraps your Vite build | 1-2 hours — separate project, EAS account |
| **Feel** | WebView (touch latency, scroll inertia off) | Native (60fps gestures, real OS animations) |
| **Maps** | Mapbox GL JS in webview (slow at 100+ markers) | MapLibre native (smooth at 1000+) |
| **Background features** | Cordova plugins (legacy) | expo-location, expo-task-manager (modern) |
| **Build pipeline** | Xcode/Gradle locally | EAS cloud build (no Xcode/Android Studio needed for CI) |
| **OTA updates** | Capacitor Live Updates (paid) | expo-updates (free, S3-backed) |
| **Code reuse with web** | High (same DOM components) | Low (native components are different) |

**Bottom line:** if "feels web-y" is acceptable, Capacitor is faster. For anything where users will live in the app for hours (delivery driver, RV navigator, field tech), Expo wins.

---

## Repo layout: standalone, not a workspace

The single most important decision. Most existing Lance Stack projects are Vite + React 18. Expo SDK 54 ships React 19 + React Native 0.81 + Metro. Mixing these in one `node_modules` causes:
- Two `react` resolutions → "Invalid Hook Call" runtime errors
- Metro vs Vite config conflicts
- Hot-reload chaos
- Lockfile thrashing

**Solution:** the mobile app lives at `apps/<name>/` with its own `package.json` and `node_modules`. NOT in `npm workspaces`. Contributors run:

```bash
cd apps/driver-app
npm install      # separate from root
npm run start    # expo dev server
```

Document this in the project's CLAUDE.md / AGENTS.md so the next contributor doesn't `npm install` from root and break everything.

```
your-project/
├── apps/
│   ├── api/                  # existing Cloudflare Worker
│   ├── web/                  # existing Vite + React 18
│   └── driver-app/           # NEW Expo project (standalone)
│       ├── package.json      # own deps, own lockfile
│       ├── node_modules/     # gitignored, separate install
│       ├── app.json
│       ├── eas.json
│       ├── App.tsx
│       ├── index.ts
│       ├── metro.config.js   # vanilla, no monorepo hoist tricks
│       └── src/
│           ├── lib/
│           │   ├── api-base.ts      # API_BASE_URL resolution
│           │   ├── api-client.ts    # apiFetch with bearer + 401 handling
│           │   └── auth-client.ts   # better-auth wrappers (see below)
│           ├── hooks/
│           │   └── use-auth.ts      # session state via react-query
│           ├── navigation/
│           │   └── RootNavigator.tsx  # auth/state-gated stack
│           └── screens/
│               ├── SignInScreen.tsx
│               └── ...
```

`metro.config.js` is vanilla — no `watchFolders`, no `singleton-modules` hacks. Those tricks are needed when sharing deps across a monorepo. We don't share, we install fresh.

---

## Stack: Expo SDK 54 + the canonical native modules

Pin to the SDK version and use `npx expo install` for everything else. NEVER hand-pick versions for `expo-*` or `react-native-*` packages — they have to match the SDK's bundled-native-modules manifest, and `expo install` reads that manifest. Hand-picking will fail at build time.

```json
{
  "dependencies": {
    "expo": "~54.0.33",
    "react": "19.1.0",
    "react-native": "0.81.5",

    "@react-navigation/native": "^7.x",
    "@react-navigation/native-stack": "^7.x",
    "@tanstack/react-query": "^5.x",

    "@maplibre/maplibre-react-native": "^11.x",

    "expo-dev-client": "~6.x",
    "expo-keep-awake": "~15.x",
    "expo-location": "~19.x",
    "expo-notifications": "~0.32.x",
    "expo-secure-store": "~15.x",
    "expo-sqlite": "~16.x",
    "expo-status-bar": "~3.x",
    "expo-updates": "~29.x",

    "react-native-gesture-handler": "~2.x",
    "react-native-reanimated": "~4.x",
    "react-native-worklets": "~0.x",
    "react-native-safe-area-context": "~5.x",
    "react-native-screens": "~4.x"
  }
}
```

**`react-native-worklets` is mandatory** — `react-native-reanimated@4` extracted worklets into a separate package. `expo-doctor` will fail without it. (Bug we hit on first build.)

```bash
# Add deps the right way:
npx expo install <package> [...more]
# Validate before building:
npx expo-doctor
```

---

## Maps: MapLibre + CARTO basemaps (free)

`@maplibre/maplibre-react-native` is the renderer. Tile source is **CARTO basemaps**, served free from CDN with no API key:
- Light: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Dark: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`

Attribution required (CARTO + OSM); MapLibre handles it automatically with `attributionEnabled={true}`.

`MapLibreGL.setAccessToken(null)` at app start suppresses the "no Mapbox token configured" warning since CARTO doesn't need one.

```tsx
// App.tsx
import MapLibreGL from "@maplibre/maplibre-react-native";
MapLibreGL.setAccessToken(null);  // CARTO doesn't need a token
```

```tsx
// RouteScreen.tsx
import { MapView, Camera, ShapeSource, CircleLayer } from "@maplibre/maplibre-react-native";

<MapView
  mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  logoEnabled={false}
  attributionEnabled
>
  <Camera centerCoordinate={[lng, lat]} zoomLevel={11} />
</MapView>
```

For routing/directions (turn-by-turn data), use **HERE Routing API** server-side — best-in-class for trucks (vehicle dimensions, weight, restricted streets). For Mapbox-equivalent stop ordering on big routes (100+ stops), Mapbox Optimization v2 supports up to 1000 waypoints. Pick based on your domain:
- Delivery / trash / freight → HERE
- General consumer routing → Mapbox

For turn-by-turn nav in v1, deep-link to Apple Maps / Google Maps / Waze. In-app TBT is its own surface (worth it later, not v1):

```tsx
const url = Platform.OS === "ios"
  ? `maps://?daddr=${lat},${lng}&q=${label}`
  : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
Linking.openURL(url).catch(() =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
);
```

---

## Auth: plain fetch, NOT createAuthClient

If your backend uses better-auth (see [BETTER-AUTH.md](./BETTER-AUTH.md)), do NOT use `better-auth/react` or `createAuthClient` on mobile. Two reasons:

1. `useSession()` is a Nanostores Atom, not a React hook. RN doesn't have the same DOM-tied subscription model — you'd be writing a custom adapter.
2. `better-auth/react` imports `window` and `document` at module load. Crashes on RN.

Instead, use plain fetch wrappers + react-query for reactive session state. Same end result, predictable.

### auth-client.ts

```typescript
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./api-base";

const TOKEN_KEY = "myapp.bearer_token";

export class AuthHTTPError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthHTTPError";
    this.status = status;
  }
}

async function authFetch(path: string, body?: Record<string, unknown>) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${API_BASE_URL}/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text.length > 0 ? safeParse(text) : null;
  if (!res.ok) {
    throw new AuthHTTPError(extractError(data) ?? `HTTP ${res.status}`, res.status);
  }
  return data;
}

export async function sendOtp(email: string): Promise<void> {
  await authFetch("/email-otp/send-verification-otp", { email, type: "sign-in" });
}

export async function signIn(email: string, otp: string) {
  const data = await authFetch("/sign-in/email-otp", { email, otp });
  // better-auth returns flat OR nested under .session — handle both
  const token = data?.token ?? data?.session?.token;
  const user = data?.user ?? data?.session?.user;
  if (!token || !user?.id) throw new Error("Sign-in returned no token");
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return { token, user };
}

export async function getSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return { user: null };
  try {
    const data = await authFetch("/get-session");
    return { user: data?.user ?? null };
  } catch (e) {
    // Only clear on 401/403 — not on network errors. Otherwise offline launch
    // forces a re-login.
    if (e instanceof AuthHTTPError && (e.status === 401 || e.status === 403)) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return { user: null };
    }
    throw e;
  }
}

export async function signOut() {
  try { await authFetch("/sign-out", {}); } catch {}
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

### use-auth.ts (react-query session state)

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut as authSignOut, getSession } from "../lib/auth-client";

const SESSION_KEY = ["auth", "session"] as const;

export function useAuth() {
  const qc = useQueryClient();
  const session = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getSession,
    staleTime: 60_000,
    retry: false,
  });
  const signOutMut = useMutation({
    mutationFn: authSignOut,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SESSION_KEY });
      // Drop ALL app-namespace caches — different user might sign in next on
      // a shared device.
      qc.removeQueries({ queryKey: ["driver"] });  // or whatever your namespace is
    },
  });
  return {
    isLoaded: !session.isPending,
    isSignedIn: !!session.data?.user,
    user: session.data?.user ?? null,
    signOut: () => signOutMut.mutateAsync(),
  };
}

// SignInScreen calls this after signIn() succeeds — seeds the cache directly
// instead of waiting for a second /get-session round-trip.
export function useSetSession() {
  const qc = useQueryClient();
  return (user: { id: string; email: string } | null) =>
    qc.setQueryData(SESSION_KEY, { user });
}
```

### apiFetch with auto-bearer + 401 handling

```typescript
// api-client.ts
import { API_BASE_URL } from "./api-base";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "myapp.bearer_token";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only auto-set JSON Content-Type if body is a string. FormData uploads
  // need to keep their auto-generated multipart boundary header.
  if (!headers.has("Content-Type") && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Server rejected. Drop the token so useAuth's next session check
      // returns user=null and the navigator falls back to SignIn.
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    const body = await res.text();
    let parsed: unknown = body;
    try { parsed = JSON.parse(body); } catch {}
    throw { status: res.status, body: parsed };
  }
  // Handle 204/empty bodies cleanly.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (text.length === 0) return undefined as T;
  return JSON.parse(text) as T;
}
```

---

## EAS configuration

### eas.json (4 profiles)

```json
{
  "cli": {
    "version": ">= 18.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": false }
    },
    "development-simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true }
    },
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.example.com"
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

`development-simulator` builds run in iOS Simulator on Mac (need Xcode installed). `development` requires a registered device. `staging` and `production` are TestFlight-bound.

### app.json key bits

```json
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "0.1.0",
    "newArchEnabled": true,
    "scheme": "myapp",
    "splash": {
      "image": "./assets/splash-icon.png",
      "backgroundColor": "#16a34a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourorg.myapp",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "...",
        "UIBackgroundModes": ["location", "fetch"]
      }
    },
    "android": {
      "package": "com.yourorg.myapp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#16a34a"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/<eas-project-id>"
    },
    "runtimeVersion": { "policy": "appVersion" },
    "plugins": [
      ["expo-location", {
        "locationAlwaysAndWhenInUsePermission": "...",
        "isIosBackgroundLocationEnabled": true,
        "isAndroidBackgroundLocationEnabled": true,
        "isAndroidForegroundServiceEnabled": true
      }],
      "expo-secure-store",
      "expo-sqlite",
      "expo-notifications",
      "@maplibre/maplibre-react-native",
      "expo-updates"
    ],
    "extra": {
      "eas": { "projectId": "<auto-populated by eas init>" }
    },
    "owner": "your-eas-username"
  }
}
```

---

## Build + ship pipeline

```bash
# 1. One-time setup (NOT npm workspace, NOT root install)
cd apps/my-app
npm install
npx expo install <missing native modules>
npx expo-doctor   # validate before any build

# 2. EAS init (creates the project on EAS servers)
eas login         # interactive — browser auth or credentials
eas init --force  # generates projectId, writes app.json

# 3. First build — pick which:
#    a. Simulator-only (free, needs Xcode):
eas build --platform ios --profile development-simulator
#    b. TestFlight (real iPad, needs Apple Dev membership $99/yr):
eas build --platform ios --profile staging
#       → first run interactive: Apple ID + 2FA + cert/profile setup
#       → cert + profile cached on EAS servers for future builds

# 4. Submit to TestFlight (after build completes)
eas submit --platform ios --latest
#    → first run interactive: ASC app creation + ASC API key generation
#    → API key cached on EAS servers; future submits run non-interactive
```

### Distribution: Internal Testing on TestFlight

For internal team testing (up to 100 testers), **TestFlight Internal Testing** is the right path:
- No device UDIDs needed (unlike ad-hoc)
- Users install via TestFlight app on iPhone OR iPad with a single team-member Apple ID
- Apple processing is 10-30 min after `eas submit` finishes (mostly invisible to you)

The `staging` build profile + `eas submit` pipeline lands the build there automatically.

For the `production` profile, App Store Review (Apple review team, 1-7 days) is the gate before public release. Skip `production` until you actually ship to consumers.

### OTA updates (no rebuild for JS-only fixes)

Once on TestFlight, JS-only changes (no new native modules) can ship via `expo-updates` without a new EAS build:

```bash
eas update --branch staging --message "fix: typo in login screen"
# Pushes to https://u.expo.dev/<projectId>/staging
# App fetches on next foreground, applies on next launch
```

Config the channels in eas.json (matching the build profiles); `expo-updates` reads `runtimeVersion.policy: appVersion` to enforce that JS updates can't run against an incompatible native binary.

---

## Footguns we hit (chronologically)

1. **Hand-picked dep versions don't exist.** I wrote `expo-keep-awake@~14.0.4` because I guessed. SDK 54 wants `15.x`. Fix: `npx expo install <pkg>` reads Expo's bundled-native-modules manifest and picks the right version.

2. **Icons MUST exist on disk before prebuild.** `app.json` references `./assets/icon.png` etc. — if those files don't exist, `expo prebuild` blows up with `ENOENT: no such file or directory`. EAS's `RUN_EXPO_DOCTOR` phase warns about it but doesn't block; the actual `PREBUILD` phase does. Generate placeholder PNGs via ImageMagick if needed:
   ```bash
   magick -size 1024x1024 xc:'#16a34a' assets/icon.png
   magick -size 1242x2436 xc:'#16a34a' assets/splash-icon.png
   magick -size 1024x1024 xc:none assets/adaptive-icon.png
   ```

3. **`react-native-reanimated@4` requires `react-native-worklets` as a peer dep.** Not auto-installed. `npx expo install react-native-worklets` to add it.

4. **`eas init` rejects placeholder projectIds.** If `app.json` already has `extra.eas.projectId: "REPLACE_ME"`, EAS treats it as a real ID and tries to GraphQL-lookup. Remove the field entirely (`"extra": {}`), then `eas init --force`.

5. **`eas submit --latest` doesn't always match.** It looks for builds without an existing submission record matching your config. If you've already attempted and aborted submits, use the explicit `--id <build-uuid>`.

6. **Simulator install requires full Xcode + simulator runtime.** Command Line Tools alone is not enough. `eas build:run --platform ios --latest` will fail at the install step. Either install Xcode (~10GB from App Store) or skip the simulator profile and go straight to TestFlight.

7. **Apple 2FA on first interactive setup is unavoidable.** First time running `eas build --profile staging` AND first time running `eas submit` each prompt for Apple ID + 2FA. After that, EAS caches:
   - Distribution cert + provisioning profile on EAS servers
   - ASC API key (after first `eas submit`) on EAS servers

   Future builds and submits run fully non-interactive on CI.

8. **Bundle ID conflicts across multiple apps.** If you've shipped multiple apps in your Apple Developer account (rv-helper, your-second-app), reuse the existing distribution cert when EAS asks (it's per-team, not per-app). Each app gets its own provisioning profile though — those are bundle-ID-specific.

9. **TestFlight shows the build before Apple finishes processing.** "Processing" status in App Store Connect TestFlight tab can take 10-30 min. The build is uploaded but not installable until processing finishes. Don't panic; it's not stuck.

10. **iPad with cradle assumption changes everything.** If your app is for a fleet running iPads in dashboard cradles (delivery driver, field tech), the iOS background-location landmines mostly don't apply. Foreground GPS works fine on a screen-on always-foreground device. `expo-keep-awake` keeps the screen alive. Don't over-engineer for backgrounded states you'll never hit.

---

## Phase 0 spike pattern (highly recommended)

Before scoping a mobile build, spend 1-2 days verifying the external API surfaces your app needs. We learned this hard way: WorkWave's mutation API was assumed to exist; turns out it does, but with a specific event-typing convention (`podPicture` not `picture`) we'd have only learned during integration. Spending 30 minutes hitting the live API with `curl` would have saved 4 hours of debugging.

Pattern:
1. Write a short doc: "What endpoints does this app need that I don't already use?"
2. Make one real call to each endpoint with the production API key
3. Capture the response shape, the error responses, the throttle limits
4. Document in `docs/<external-api>.md`
5. Use that doc as the source of truth in code

Plan reviews catch a lot, but Phase 0 spikes catch the things plan reviews can't (because the spec is wrong or the spec doesn't exist).

---

## Files reference (trashtastic-helix driver app)

| File | Purpose |
|------|---------|
| `apps/driver-app/package.json` | Standalone deps (no workspace) |
| `apps/driver-app/app.json` | Expo + iOS/Android config + plugins |
| `apps/driver-app/eas.json` | 4 build profiles + 1 submit profile |
| `apps/driver-app/App.tsx` | Root component: QueryClient + Navigation + KeepAwake |
| `apps/driver-app/src/lib/api-base.ts` | API_BASE_URL with EXPO_PUBLIC_API_URL fallback |
| `apps/driver-app/src/lib/api-client.ts` | apiFetch with auto-bearer + 401 clearing |
| `apps/driver-app/src/lib/auth-client.ts` | sendOtp / signIn / getSession / signOut |
| `apps/driver-app/src/hooks/use-auth.ts` | Reactive session via react-query |
| `apps/driver-app/src/navigation/RootNavigator.tsx` | Auth-gated stack with multiple states |
| `apps/driver-app/src/screens/SignInScreen.tsx` | 2-stage email + OTP entry |
| `apps/driver-app/AGENTS.md` | Operational notes for next contributor |

---

## TL;DR — the "do this" list

1. Standalone repo at `apps/<name>/`. Own `node_modules`. NOT a workspace.
2. `expo install` for every dep. Never hand-pick versions.
3. MapLibre + CARTO basemaps. Free, no API key.
4. Plain `fetch` for auth. NOT `createAuthClient` from `better-auth/react`.
5. react-query for reactive session state on top of plain fetch.
6. EAS profiles: `development-simulator`, `development`, `staging`, `production`.
7. TestFlight Internal Testing for team dogfood. ASC API key after first interactive submit.
8. Generate placeholder icons before first build (PREBUILD phase fails without them).
9. `expo-doctor` before every push to EAS.
10. Phase 0 API spike before scoping the build.
