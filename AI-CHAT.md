# AI Chat — Implementation Reference

Detailed implementation patterns for the AI assistant features documented at a stack level in `STACK.md`. Based on conquest-hub's Hub Assistant (OpenRouter + Cloudflare Workers + SSE).

---

## Chat Panel UI Patterns

### Drag-to-Resize Panel

The chat panel lives in a flex row alongside the main content. A thin resize handle div sits between them. Width is clamped and persisted to `localStorage`.

```typescript
const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 380;
const WIDTH_STORAGE_KEY = "conquest-hub-chat-width";

function getStoredWidth(): number {
  try {
    const stored = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDTH;
}

// In component:
const [width, setWidth] = useState(getStoredWidth);
const [isDragging, setIsDragging] = useState(false);

// Persist on change
useEffect(() => {
  localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
}, [width]);

// Global mouse listeners while dragging
useEffect(() => {
  if (!isDragging) return;
  function onMouseMove(e: MouseEvent) {
    e.preventDefault();
    const newWidth = window.innerWidth - e.clientX;
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
  }
  function onMouseUp() { setIsDragging(false); }
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  return () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
}, [isDragging]);
```

JSX layout (flex row: main content + resize handle + panel):
```tsx
{/* Resize handle — sits between main content and panel */}
<div
  className={`w-1 shrink-0 cursor-col-resize group relative hover:bg-primary/20 transition-colors ${
    isDragging ? "bg-primary/30" : ""
  }`}
  onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
>
  <div className="absolute inset-y-0 -left-1 -right-1" /> {/* wider hit area */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
    <GripVertical className="h-4 w-4 text-muted-foreground" />
  </div>
</div>

{/* Panel */}
<div className="shrink-0 h-full border-l bg-background flex flex-col" style={{ width }}>
  {/* ... */}
</div>
```

Key points:
- Use `window.innerWidth - e.clientX` (not delta) — gives absolute width from right edge
- Set `cursor` and `userSelect` on `document.body` during drag to prevent text selection and cursor flicker
- Wider invisible hit area (`-left-1 -right-1`) makes the 4px handle easy to grab

### Copy Conversation Button

Copies all messages as plain `You: / Assistant:` text. Shows a 2-second checkmark on success.

```typescript
const [copied, setCopied] = useState(false);

const handleCopyConversation = useCallback(() => {
  const text = messages
    .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
    .join("\n\n");
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}, [messages]);
```

```tsx
{messages.length > 0 && (
  <Button variant="ghost" size="sm" onClick={handleCopyConversation} className="h-7 w-7 p-0" title="Copy conversation">
    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
  </Button>
)}
```

Only render when there are messages — no point showing it on an empty chat.

### Model Picker

Dropdown above the input, grouped by tier. Model preference stored in `localStorage`. Closes on outside click.

```typescript
const MODELS = [
  { id: "minimax/minimax-m2.5",          label: "MiniMax M2.5",      tier: "Pro" },
  { id: "anthropic/claude-opus-4.6",     label: "Claude Opus 4.6",   tier: "Premium" },
  { id: "anthropic/claude-sonnet-4.6",   label: "Claude Sonnet 4.6", tier: "Pro" },
  { id: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro",    tier: "Pro" },
  { id: "openai/gpt-4.1",               label: "GPT-4.1",           tier: "Pro" },
  { id: "google/gemini-2.5-flash",       label: "Gemini 2.5 Flash",  tier: "Fast" },
  { id: "openai/gpt-4.1-mini",          label: "GPT-4.1 Mini",      tier: "Fast" },
  { id: "anthropic/claude-haiku-4.5",    label: "Claude Haiku 4.5",  tier: "Fast" },
  { id: "deepseek/deepseek-v3.2",        label: "DeepSeek V3.2",     tier: "Budget" },
  { id: "openai/gpt-4.1-nano",          label: "GPT-4.1 Nano",      tier: "Budget" },
];

const MODEL_STORAGE_KEY = "conquest-hub-chat-model";
const DEFAULT_MODEL = "minimax/minimax-m2.5";

// In hook:
const [model, setModel] = useState(
  () => localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL
);
useEffect(() => { localStorage.setItem(MODEL_STORAGE_KEY, model); }, [model]);
```

Outside-click close pattern:
```typescript
const modelPickerRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
      setShowModelPicker(false);
    }
  }
  if (showModelPicker) {
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }
}, [showModelPicker]);
```

The picker opens upward (`bottom-full`) so it doesn't get clipped at the bottom of the viewport.

### Auto-Sizing Textarea

The input grows as the user types (up to 128px), then scrolls.

```tsx
<textarea
  rows={1}
  className="... max-h-32 overflow-y-auto"
  style={{ height: "auto", minHeight: "38px" }}
  onInput={(e) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";                            // reset first
    target.style.height = Math.min(target.scrollHeight, 128) + "px";
  }}
/>
```

Reset to `"auto"` before reading `scrollHeight` — otherwise the element won't shrink when text is deleted.

### Stop Streaming Button

Swap the Send button for a red Square (stop) button while streaming. Abort via `AbortController`.

```tsx
{isStreaming ? (
  <Button size="sm" variant="destructive" onClick={onStop} className="h-[38px] w-[38px] p-0 shrink-0">
    <Square className="h-4 w-4" />
  </Button>
) : (
  <Button size="sm" onClick={handleSubmit} disabled={!input.trim()} className="h-[38px] w-[38px] p-0 shrink-0">
    <Send className="h-4 w-4" />
  </Button>
)}
```

```typescript
// In hook:
const abortRef = useRef<AbortController | null>(null);

const stopStreaming = useCallback(() => {
  if (abortRef.current) {
    abortRef.current.abort();
    abortRef.current = null;
  }
  setIsStreaming(false);
  setMessages((prev) =>
    prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
  );
}, []);
```

Pass the `AbortController.signal` to `fetch()` — the stream reader will throw an `AbortError` which is caught and ignored (not shown as an error message to the user).

### Empty State with Suggested Prompts

Show example prompts as pill buttons when there are no messages:

```tsx
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
    <Bot className="h-10 w-10 text-muted-foreground/50" />
    <div>
      <p className="text-sm font-medium text-muted-foreground">Hub Assistant</p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
        Ask about sync status, search assets, query organizations, or trigger actions.
      </p>
    </div>
    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
      {["What happened in the last sync?", "How many assets do we have?", "Show me the staging summary"].map((q) => (
        <button
          key={q}
          onClick={() => onSend(q)}
          className="text-xs px-2.5 py-1.5 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  </div>
)}
```

Clicking a suggested prompt calls `onSend` directly — no need to populate the input first.

### Page Context in Header

The assistant shows which page the user is on — helps with contextual queries.

```typescript
// In hook (derives from react-router location):
const PAGE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/organizations": "Organizations",
  "/assets": "Assets",
  // ...
};
const currentPage = PAGE_NAMES[location.pathname] || location.pathname;
```

```tsx
<p className="text-xs text-muted-foreground mt-0.5">Viewing: {currentPage}</p>
```

`currentPage` is passed in the chat API request body — the backend bakes it into the system prompt so the AI knows context without the user having to say it.

### Keyboard Shortcut to Open/Close

Register a global keydown listener to toggle the panel (e.g. `⌘J`):

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "j") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, []);
```

Show the shortcut hint in the close button's `title` attribute: `title="Close (⌘J)"`.

---

## Tool Definitions

All tools use OpenAI function-calling format. Pass `TOOL_DEFINITIONS` to every LLM call (except the final round when forcing a text response).

```typescript
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "run_readonly_query",
      description:
        "Run a read-only SQL query against the database. Returns up to 200 rows. " +
        "Use for chat answers only — NOT for generating reports or exports.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "SQL SELECT statement" },
          description: { type: "string", description: "One-line description of what this query retrieves" },
        },
        required: ["query", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_for_report",
      description:
        "Run a read-only SQL query returning up to 5,000 rows. Use ONLY when generating report data. " +
        "Never use this for conversational answers.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          title: { type: "string", description: "Report title shown in the PDF/email" },
        },
        required: ["query", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_csv_report",
      description:
        "Download a dataset as a CSV spreadsheet immediately. Use when the user says 'CSV', " +
        "'spreadsheet', or 'download the data'. Runs an unlimited query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "SQL SELECT statement (no row limit applied)" },
          title: { type: "string", description: "File name stem for the CSV download" },
        },
        required: ["query", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "queue_report",
      description:
        "Email a full report (PDF or CSV) asynchronously. Use when the user says 'email me', " +
        "'send a report'. Always confirm the email address before calling this.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          title: { type: "string" },
          email: { type: "string", description: "Recipient email address" },
          format: { type: "string", enum: ["pdf", "csv"], description: "Attachment format" },
        },
        required: ["query", "title", "email", "format"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "need_clarification",
      description:
        "Call after 2+ failed query attempts. NEVER keep querying — ask the user instead.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "Specific question for the user" },
          tried: { type: "string", description: "One-sentence summary of what failed" },
        },
        required: ["question", "tried"],
      },
    },
  },
];
```

---

## SSE Event Schema

The server emits named SSE events over a streaming response. The frontend parses them in the `while (true)` reader loop.

| Event | Data shape | Meaning |
|-------|-----------|---------|
| `delta` | `{ content: string }` | Token chunk to append to assistant message |
| `tool_call` | `{ id: string, name: string }` | Tool invocation (display name in UI) |
| `action_preview` | `ActionPreview` (without `status`) | User-confirmable side-effect card |
| `data_overflow` | `{ query: string, rowCount: number }` | Query was truncated — show export card |
| `clarification` | `{ question: string, tried: string }` | AI hit a dead end, asking user |
| `error` | `{ error: string }` | Fatal error |
| `done` | `{}` | Stream complete |

### Emitting events from Cloudflare Worker

```typescript
function send(event: string, data: unknown) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
}
```

### Parsing events on the frontend

```typescript
const lines = buffer.split("\n");
buffer = lines.pop() || "";

const events: { event: string; data: string }[] = [];
let currentEvent = "";
let currentData = "";

for (const line of lines) {
  if (line.startsWith("event: ")) {
    if (currentEvent && currentData) events.push({ event: currentEvent, data: currentData });
    currentEvent = line.slice(7);
    currentData = "";
  } else if (line.startsWith("data: ")) {
    currentData = line.slice(6);
  } else if (line === "" && currentEvent && currentData) {
    events.push({ event: currentEvent, data: currentData });
    currentEvent = "";
    currentData = "";
  }
}
// Flush pending event not yet terminated by empty line
if (currentEvent && currentData) events.push({ event: currentEvent, data: currentData });
```

---

## ActionPreview Schema

```typescript
export interface ActionPreview {
  type: "action_preview";
  preview_id: string;
  action:
    | "send_email"
    | "send_sms"
    | "create_pdf"
    | "update_pdf"
    | "csv_download"
    | "report_queued";
  payload: Record<string, unknown>;
  display: {
    title: string;
    summary: string;
    details: Record<string, string>;
  };
  status: "pending" | "executing" | "success" | "error";
  result?: { success: boolean; message: string; data?: Record<string, unknown> };
}
```

### Action types

- **`send_email` / `send_sms` / `create_pdf` / `update_pdf`** — standard confirmable actions. Frontend shows Execute + Dismiss buttons. `POST /execute-action` runs the side effect.
- **`csv_download`** — AI-generated CSV stored in R2. Frontend shows Download + Dismiss. No execute endpoint needed — download via `GET /csv/:csvId`.
- **`report_queued`** — Cloudflare Workflow already running. Frontend shows "You'll receive an email when ready" + Dismiss only. No execute button.

### Tool → ActionPreview for csv_download

```typescript
case "generate_csv_report": {
  const { query, title } = args as { query: string; title: string };
  const rows = await runQueryUnlimited(env, query);
  const { csvId } = await uploadCsvToR2(env, rows, title);
  return JSON.stringify({
    type: "action_preview",
    preview_id: crypto.randomUUID(),
    action: "csv_download",
    payload: { csvId, title, rowCount: rows.length },
    display: {
      title: "CSV Ready",
      summary: `${rows.length.toLocaleString()} rows`,
      details: { file: `${title}.csv` },
    },
  });
}
```

### Tool → ActionPreview for report_queued

```typescript
case "queue_report": {
  const { query, title, email, format } = args as ReportParams;
  const instance = await env.REPORT_WORKFLOW.create({ params: { query, title, email, format } });
  return JSON.stringify({
    type: "action_preview",
    preview_id: crypto.randomUUID(),
    action: "report_queued",
    payload: { instanceId: instance.id, email, format, title },
    display: {
      title: "Report Queued",
      summary: `Will email ${format.toUpperCase()} to ${email}`,
      details: { report: title },
    },
  });
}
```

---

## Report Utilities (`report-utils.ts`)

Shared utilities to avoid duplication across tools, routes, and workflows.

```typescript
import type { Env } from "../index";

/** Strip characters that break filenames / Content-Disposition headers */
export function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_ ]/g, "");
}

/** Convert rows to CSV string with proper quoting */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/** Upload CSV to R2 and return the csvId (r2Key is deterministic: csvs/${csvId}.csv) */
export async function uploadCsvToR2(
  env: Env,
  rows: Record<string, unknown>[],
  title: string
): Promise<{ csvId: string; r2Key: string }> {
  const csv = rowsToCsv(rows);
  const csvId = crypto.randomUUID();
  const r2Key = `csvs/${csvId}.csv`;
  await env.PDF_BUCKET.put(r2Key, csv, {
    httpMetadata: {
      contentType: "text/csv",
      contentDisposition: `attachment; filename="${sanitizeFilename(title)}.csv"`,
    },
  });
  return { csvId, r2Key };
}

/** Build HTML for PDF reports */
export function buildReportHtml(title: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `<html><body><h1>${title}</h1><p>No data.</p></body></html>`;
  const headers = Object.keys(rows[0]!);
  const headerRow = headers.map((h) => `<th>${h}</th>`).join("");
  const dataRows = rows
    .map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
      h1 { font-size: 16px; margin-bottom: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 4px 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      tr:nth-child(even) { background: #f9fafb; }
    </style>
    </head><body>
    <h1>${title}</h1>
    <table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>
    </body></html>`;
}

/** Run a SQL query with no row cap. Enforces same safety checks as runReadonlyQuery. */
export async function runQueryUnlimited(
  env: Env,
  query: string
): Promise<Record<string, unknown>[]> {
  const normalized = query.trim().toUpperCase();
  const BLOCKED = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "EXEC"];
  if (BLOCKED.some((kw) => normalized.startsWith(kw) || normalized.includes(` ${kw} `))) {
    throw new Error("Only SELECT queries are allowed.");
  }
  if (normalized.includes("PASSWORD") || normalized.includes("HASH")) {
    throw new Error("Queries returning credential fields are not allowed.");
  }
  const result = await env.DB.prepare(query).all();
  return (result.results ?? []) as Record<string, unknown>[];
}
```

---

## API Routes

### `POST /export-csv` — Direct CSV streaming (no R2)

For the overflow card's immediate download. Return CSV bytes directly — no R2 upload, no second round-trip.

```typescript
app.post("/export-csv", authMiddleware, async (c) => {
  const { query, title } = await c.req.json<{ query: string; title?: string }>();
  const rows = await runQueryUnlimited(c.env, query);
  const csv = rowsToCsv(rows);
  const safeTitle = sanitizeFilename(title || "export");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${safeTitle}.csv"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
});
```

### `GET /csv/:csvId` — Authenticated R2 CSV download

For AI-generated `csv_download` action previews (file persists in R2 for deferred click).

```typescript
app.get("/csv/:csvId", authMiddleware, async (c) => {
  const csvId = c.req.param("csvId");
  const object = await c.env.PDF_BUCKET.get(`csvs/${csvId}.csv`);
  if (!object) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
});
```

### `GET /workflow-status/:instanceId`

```typescript
app.get("/workflow-status/:instanceId", authMiddleware, async (c) => {
  const instance = await c.env.REPORT_WORKFLOW.get(c.req.param("instanceId"));
  const status = await instance.status();
  return c.json(status);
});
```

---

## Cloudflare Workflow — Full Boilerplate

```typescript
// apps/api/src/workflows/ReportWorkflow.ts
import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../index";
import {
  sanitizeFilename,
  uploadCsvToR2,
  buildReportHtml,
  runQueryUnlimited,
} from "../lib/report-utils";

export interface ReportParams {
  query: string;
  title: string;
  email: string;
  format: "pdf" | "csv";
}

export class ReportWorkflow extends WorkflowEntrypoint<Env, ReportParams> {
  async run(event: WorkflowEvent<ReportParams>, step: WorkflowStep) {
    const { query, title, email, format } = event.payload;

    // Step 1: Run the unlimited query
    const rows = (await step.do(
      "run-query",
      { retries: { limit: 2, delay: "5 seconds" } },
      async () => runQueryUnlimited(this.env, query)
    )) as unknown as Record<string, unknown>[];

    // Step 2: Generate file and upload to R2
    const r2Key = (await step.do(
      "generate-file",
      { retries: { limit: 2, delay: "5 seconds" } },
      async () => {
        if (format === "csv") {
          const { r2Key } = await uploadCsvToR2(this.env, rows, title);
          return r2Key;
        } else {
          // PDF via Puppeteer (Cloudflare Browser Rendering)
          const fileId = crypto.randomUUID();
          const html = buildReportHtml(title, rows);
          const puppeteer = await import("@cloudflare/puppeteer");
          const browser = await puppeteer.default.launch(
            this.env.BROWSER as Parameters<typeof puppeteer.default.launch>[0]
          );
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "networkidle0" });
          const pdfBuffer = await page.pdf({
            format: "Letter",
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
            printBackground: true,
          });
          await browser.close();
          const key = `pdfs/${fileId}/report.pdf`;
          await this.env.PDF_BUCKET.put(key, pdfBuffer, {
            httpMetadata: {
              contentType: "application/pdf",
              contentDisposition: `attachment; filename="${sanitizeFilename(title)}.pdf"`,
            },
          });
          return key;
        }
      }
    )) as string;

    // Step 3: Email via Resend with base64-encoded attachment
    const rowCount = (rows as unknown[]).length;
    await step.do(
      "send-email",
      { retries: { limit: 3, delay: "10 seconds" } },
      async () => {
        const object = await this.env.PDF_BUCKET.get(r2Key);
        if (!object) throw new Error(`R2 object not found: ${r2Key}`);

        // Manual byte-loop for large-file-safe base64
        const arrayBuffer = await object.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
        const base64Content = btoa(binary);

        const ext = format === "csv" ? "csv" : "pdf";
        const mimeType = format === "csv" ? "text/csv" : "application/pdf";
        const filename = `${sanitizeFilename(title)}.${ext}`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Your App <noreply@yourdomain.com>",
            to: [email],
            subject: `Your report: ${title}`,
            html: `<p>Your report <strong>${title}</strong> is attached.</p>
                   <p style="color:#6b7280;font-size:12px;">${rowCount.toLocaleString()} rows — generated ${new Date().toISOString()}</p>`,
            attachments: [{ filename, content: base64Content, content_type: mimeType }],
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Resend error ${response.status}: ${errText}`);
        }
      }
    );
  }
}
```

**wrangler.toml** (no `[[migrations]]` — Workflows don't need them):
```toml
[[workflows]]
name = "report-generator"
binding = "REPORT_WORKFLOW"
class_name = "ReportWorkflow"
```

**index.ts** — top-level export so Wrangler discovers the class:
```typescript
export { ReportWorkflow } from "./workflows/ReportWorkflow";
```

**Env interface** — type as `unknown`, cast inline:
```typescript
export interface Env {
  // ...
  REPORT_WORKFLOW: unknown; // Workflow binding — cast inline with .create()/.get()
}
```

---

## DataOverflowCard (Frontend)

Renders when a `data_overflow` SSE event is received. Remembers last-used export preference in `localStorage`.

```tsx
const EXPORT_PREF_KEY = "conquest-hub-export-preference";

function DataOverflowCard({
  query,
  rowCount,
  onExportCsv,
  onSendMessage,
}: {
  query: string;
  rowCount: number;
  onExportCsv: (query: string, title?: string) => Promise<void>;
  onSendMessage: (msg: string) => void;
}) {
  const [pref, setPref] = useState<"csv" | "pdf" | "email">(
    () => (localStorage.getItem(EXPORT_PREF_KEY) as "csv" | "pdf" | "email") || "csv"
  );
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const solidBtn =
    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors";
  const outlineBtn =
    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors";

  const choose = (p: "csv" | "pdf" | "email") => {
    setPref(p);
    localStorage.setItem(EXPORT_PREF_KEY, p);
  };

  const handleCsv = async () => {
    choose("csv");
    setCsvLoading(true);
    setCsvError(null);
    try {
      await onExportCsv(query, "export");
    } catch (e) {
      setCsvError((e as Error).message);
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <p className="font-medium text-amber-800 mb-1">
        Result truncated — {rowCount.toLocaleString()}+ rows available
      </p>
      <p className="text-amber-700 mb-2">How would you like the full dataset?</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCsv} disabled={csvLoading} className={pref === "csv" ? solidBtn : outlineBtn}>
          {csvLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Download CSV
        </button>
        <button
          onClick={() => { choose("pdf"); onSendMessage("Create a PDF report of this data"); }}
          className={pref === "pdf" ? solidBtn : outlineBtn}
        >
          Create PDF
        </button>
        <button
          onClick={() => { choose("email"); onSendMessage("Email me this data as a report"); }}
          className={pref === "email" ? solidBtn : outlineBtn}
        >
          Email me
        </button>
      </div>
      {csvError && <p className="mt-1 text-red-600">{csvError}</p>}
    </div>
  );
}
```

---

## Frontend CSV Export Hook

```typescript
// In useChatPanel (single-request — POST returns CSV bytes directly)
const exportCsv = useCallback(
  async (query: string, title?: string) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/chat/export-csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, title }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Export failed: ${response.status} ${errText}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
      `${title || "export"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  [getToken]
);
```

---

## Query Safety Guards

Applied in both `runReadonlyQuery` (200-row cap) and `runQueryUnlimited`:

```typescript
const normalized = query.trim().toUpperCase();
const BLOCKED = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "EXEC"];
if (BLOCKED.some((kw) => normalized.startsWith(kw) || normalized.includes(` ${kw} `))) {
  throw new Error("Only SELECT queries are allowed.");
}
if (normalized.includes("PASSWORD") || normalized.includes("HASH")) {
  throw new Error("Queries returning credential fields are not allowed.");
}
```

---

## data_overflow SSE Event

Emitted when `run_readonly_query` truncates results:

```typescript
// In executeTool, run_readonly_query case:
const MAX_CHAT_ROWS = 200;
const rows = (result.results ?? []) as Record<string, unknown>[];
const truncated = rows.length >= MAX_CHAT_ROWS;

if (truncated) {
  send("data_overflow", { query, rowCount: MAX_CHAT_ROWS });
}

return JSON.stringify({
  rows: rows.slice(0, MAX_CHAT_ROWS),
  rowCount: rows.length,
  truncated,
});
```

Frontend handles it:
```typescript
} else if (evt.event === "data_overflow") {
  const { query, rowCount } = JSON.parse(evt.data);
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last?.role === "assistant" && last.isStreaming) {
      updated[updated.length - 1] = { ...last, dataOverflow: { query, rowCount } };
    }
    return updated;
  });
}
```
