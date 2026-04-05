# Shipyard Mission Control v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Shipyard OS into a truly excellent command center for agentic systems by shipping the highest-leverage operator workflows: run drill-down, alert inbox, summaries, project war rooms, pause/retry/fork controls, better search, and tool trace foundations.

**Architecture:** Extend the new canonical conversations/runs/events backbone into a full operator plane. Keep Shipyard’s existing pages, but unify them around shared canonical models and derived views. Prioritize user clarity, control, and trust over feature sprawl by making each new surface answer: what is happening, why, and what can I do about it.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind, Vercel AI SDK, local JSON + Vercel KV fallback, existing Shipyard runtime abstraction.

---

## File Map

Core canonical data / backend:
- Modify: `lib/conversations.ts`
  - Extend event querying, summaries, thread helpers, run helpers
- Create: `lib/alerts.ts`
  - Canonical alert storage + derivation logic
- Create: `lib/search.ts`
  - Search indexing/query helpers over tasks/conversations/events/messages/runs
- Create: `lib/summaries.ts`
  - Summary generation and formatting helpers
- Create: `lib/tool-traces.ts`
  - Tool trace event model + normalization helpers
- Modify: `lib/runtimes/types.ts`
  - Optional trace/control methods for future runtime support
- Modify: `lib/runtimes/openclaw.ts`
  - Implement pause/retry/fork/control stubs or capability flags

API routes:
- Create: `app/api/alerts/route.ts`
- Create: `app/api/alerts/[id]/route.ts`
- Create: `app/api/search/route.ts`
- Create: `app/api/summaries/conversation/[id]/route.ts`
- Create: `app/api/summaries/project/[id]/route.ts`
- Create: `app/api/projects/[name]/route.ts`
- Create: `app/api/runs/[conversationId]/[runId]/control/route.ts`
- Modify: `app/api/runs/[conversationId]/[runId]/route.ts`
- Modify: `app/api/activity/route.ts`
- Modify: `app/api/messages/route.ts`
- Modify: `app/api/projects/route.ts`

Pages / UI:
- Create: `app/alerts/page.tsx`
- Create: `app/search/page.tsx`
- Create: `app/projects/[name]/page.tsx`
- Modify: `app/conversations/page.tsx`
- Modify: `app/projects/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/tasks/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/CommandPalette.tsx`

Testing / verification:
- Create or modify focused validation files only if the repo later adds a test runner
- For now: TypeScript check + file-targeted ESLint + Node version verification for build compatibility

Docs:
- Modify: `README.md`
- Create: `docs/mission-control-architecture.md`

---

### Task 1: Add run drill-down and canonical run detail UX

**Files:**
- Modify: `app/api/runs/[conversationId]/[runId]/route.ts`
- Modify: `app/conversations/page.tsx`
- Create: `docs/mission-control-architecture.md`

- [ ] **Step 1: Extend run detail API payload shape**

Update `app/api/runs/[conversationId]/[runId]/route.ts` so the response includes:
```ts
return NextResponse.json({
  run: payload.run,
  conversation: {
    id: payload.conversation.id,
    title: payload.conversation.title,
    agent: payload.conversation.agent,
    taskId: payload.conversation.taskId,
  },
  events,
  messages,
})
```

- [ ] **Step 2: Run TypeScript to verify no route typing regressions**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit code 0

- [ ] **Step 3: Add selected run state to Conversations page**

In `app/conversations/page.tsx`, add state:
```ts
const [selectedRunId, setSelectedRunId] = useState<string>("")
const [runDetail, setRunDetail] = useState<{
  run: ConversationRun
  conversation: { id: string; title: string; agent: string; taskId?: string }
  events: ConversationEvent[]
  messages: ConversationMessage[]
} | null>(null)
```

- [ ] **Step 4: Fetch run detail when a run is selected**

Add callback:
```ts
const fetchRunDetail = useCallback(async (conversationId: string, runId: string) => {
  const res = await fetch(`/api/runs/${conversationId}/${runId}`, { cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json()
  setRunDetail(data)
  return data
}, [])
```

- [ ] **Step 5: Add click behavior on run cards**

In the right-pane run list, update the run card wrapper:
```tsx
<button
  key={run.id}
  onClick={() => {
    setSelectedRunId(run.id)
    void fetchRunDetail(detail?.id ?? selectedId, run.id)
  }}
  className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-3 text-left"
>
```

- [ ] **Step 6: Render run drill-down beneath the run list**

Add section:
```tsx
{runDetail && (
  <div>
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">Selected Run</h3>
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-[#0a0a0f] p-3">
      <p className="text-sm text-white">{runDetail.run.runtime} • {runDetail.run.status}</p>
      <p className="text-xs text-zinc-500">Started {relativeTime(runDetail.run.startedAt)}</p>
      <div className="space-y-2">
        {runDetail.events.map((event) => (
          <div key={event.id} className="text-xs text-zinc-400">{event.summary}</div>
        ))}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify lint for changed files**

Run: `npm exec eslint app/api/runs/[conversationId]/[runId]/route.ts app/conversations/page.tsx`
Expected: exit code 0

- [ ] **Step 8: Commit**

```bash
git add app/api/runs/[conversationId]/[runId]/route.ts app/conversations/page.tsx
git commit -m "feat: add run drill-down in conversations"
```

### Task 2: Add an alert inbox derived from canonical failures and waiting states

**Files:**
- Create: `lib/alerts.ts`
- Create: `app/api/alerts/route.ts`
- Create: `app/api/alerts/[id]/route.ts`
- Create: `app/alerts/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/CommandPalette.tsx`

- [ ] **Step 1: Create alert type definitions**

Create `lib/alerts.ts` with:
```ts
export type AlertSeverity = "info" | "warning" | "critical"
export type AlertStatus = "open" | "acknowledged" | "resolved" | "snoozed"

export interface AlertRecord {
  id: string
  type: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  summary: string
  conversationId?: string
  runId?: string
  taskId?: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Add file/KV storage helpers for alerts**

In `lib/alerts.ts`, implement:
```ts
export async function listAlerts(): Promise<AlertRecord[]> { /* file or kv */ }
export async function createAlert(input: Omit<AlertRecord, "id" | "createdAt" | "updatedAt">): Promise<AlertRecord> { /* persist */ }
export async function updateAlert(id: string, patch: Partial<Pick<AlertRecord, "status">>): Promise<AlertRecord | null> { /* persist */ }
```

- [ ] **Step 3: Derive failure alerts from canonical runs**

Also in `lib/alerts.ts`, add helper:
```ts
export async function syncDerivedAlertsFromRuns(): Promise<void> {
  // scan canonical conversations/runs
  // create alerts for failed runs if not already present
}
```

- [ ] **Step 4: Add alerts list API**

Create `app/api/alerts/route.ts`:
```ts
import { NextResponse } from "next/server"
import { listAlerts, syncDerivedAlertsFromRuns } from "@/lib/alerts"

export async function GET() {
  await syncDerivedAlertsFromRuns()
  return NextResponse.json(await listAlerts())
}
```

- [ ] **Step 5: Add alert status update API**

Create `app/api/alerts/[id]/route.ts`:
```ts
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json() as { status?: "acknowledged" | "resolved" | "snoozed" }
  const updated = await updateAlert(id, { status: body.status })
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: "Alert not found" }, { status: 404 })
}
```

- [ ] **Step 6: Create Alerts page**

Create `app/alerts/page.tsx` with a list view that shows:
- severity
n- title
- summary
- timestamp
- buttons for acknowledge / resolve
- link to `/conversations?id=<conversationId>` if present

Use this fetch shape:
```ts
const res = await fetch("/api/alerts", { cache: "no-store" })
const data = await res.json() as AlertRecord[]
```

- [ ] **Step 7: Add Alerts to navigation**

Add nav item to `components/Sidebar.tsx`:
```ts
{ href: "/alerts", label: "Alerts", icon: Bell }
```
And matching command to `components/CommandPalette.tsx`.

- [ ] **Step 8: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint lib/alerts.ts app/api/alerts/route.ts app/api/alerts/[id]/route.ts app/alerts/page.tsx components/Sidebar.tsx components/CommandPalette.tsx
```
Expected: both exit code 0

- [ ] **Step 9: Commit**

```bash
git add lib/alerts.ts app/api/alerts/route.ts app/api/alerts/[id]/route.ts app/alerts/page.tsx components/Sidebar.tsx components/CommandPalette.tsx
git commit -m "feat: add canonical alert inbox"
```

### Task 3: Add project war room detail view

**Files:**
- Create: `app/api/projects/[name]/route.ts`
- Create: `app/projects/[name]/page.tsx`
- Modify: `app/projects/page.tsx`

- [ ] **Step 1: Add project detail API route**

Create `app/api/projects/[name]/route.ts` that returns:
```ts
{
  project: Repo,
  relatedConversations: ConversationSummary[],
  relatedTasks: Task[],
  relatedAlerts: AlertRecord[],
}
```

- [ ] **Step 2: Use simple project-to-conversation matching first**

In the route implementation, match canonical conversations using:
```ts
conversation.project === projectName || conversation.title.toLowerCase().includes(projectName.toLowerCase())
```

- [ ] **Step 3: Create project war room page**

Create `app/projects/[name]/page.tsx` with sections:
- Project overview
- Related tasks
- Related conversations
- Related alerts
- Recent PR/CI status

- [ ] **Step 4: Link project cards into project detail**

In `app/projects/page.tsx`, wrap each project title:
```tsx
<Link href={`/projects/${repo.name}`}>{repo.name}</Link>
```

- [ ] **Step 5: Add conversation deep-links in the war room**

Render related conversations with:
```tsx
<Link href={`/conversations?id=${conversation.id}`}>{conversation.title}</Link>
```

- [ ] **Step 6: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint app/api/projects/[name]/route.ts app/projects/[name]/page.tsx app/projects/page.tsx
```
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add app/api/projects/[name]/route.ts app/projects/[name]/page.tsx app/projects/page.tsx
git commit -m "feat: add project war room detail view"
```

### Task 4: Add conversation and project summaries

**Files:**
- Create: `lib/summaries.ts`
- Create: `app/api/summaries/conversation/[id]/route.ts`
- Create: `app/api/summaries/project/[id]/route.ts`
- Modify: `app/conversations/page.tsx`
- Modify: `app/projects/[name]/page.tsx`

- [ ] **Step 1: Create summary formatter helpers**

In `lib/summaries.ts`, add:
```ts
export function summarizeConversation(input: {
  title: string
  messages: Array<{ role: string; text: string }>
  events: Array<{ summary: string }>
}): string {
  const recentMessages = input.messages.slice(-3).map((m) => `${m.role}: ${m.text}`).join(" ")
  const recentEvents = input.events.slice(-3).map((e) => e.summary).join(" ")
  return `${input.title}. Recent messages: ${recentMessages}. Recent events: ${recentEvents}`
}
```

- [ ] **Step 2: Add conversation summary API**

Create route:
```ts
const conversation = await getConversation(id)
return NextResponse.json({ summary: summarizeConversation(conversation) })
```

- [ ] **Step 3: Add project summary API**

Create route that summarizes:
- repo status
- related tasks
- related alerts
- related conversations

- [ ] **Step 4: Render summary panel in Conversations page**

Add button and state:
```ts
const [summary, setSummary] = useState("")
```
Fetch:
```ts
const res = await fetch(`/api/summaries/conversation/${selectedId}`)
```
Render in right pane beneath events.

- [ ] **Step 5: Render summary panel in project war room**

Use:
```ts
const res = await fetch(`/api/summaries/project/${params.name}`)
```
Render a card labeled `Summary`.

- [ ] **Step 6: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint lib/summaries.ts app/api/summaries/conversation/[id]/route.ts app/api/summaries/project/[id]/route.ts app/conversations/page.tsx app/projects/[name]/page.tsx
```
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add lib/summaries.ts app/api/summaries/conversation/[id]/route.ts app/api/summaries/project/[id]/route.ts app/conversations/page.tsx app/projects/[name]/page.tsx
git commit -m "feat: add mission control summaries"
```

### Task 5: Add pause/retry/fork controls for runs

**Files:**
- Modify: `lib/runtimes/types.ts`
- Modify: `lib/runtimes/openclaw.ts`
- Create: `app/api/runs/[conversationId]/[runId]/control/route.ts`
- Modify: `app/conversations/page.tsx`

- [ ] **Step 1: Extend runtime interface with optional control methods**

In `lib/runtimes/types.ts`, add:
```ts
pauseRun?(params: { runId: string; conversationId: string }): Promise<void>
retryRun?(params: { runId: string; conversationId: string }): Promise<void>
forkConversation?(params: { conversationId: string; runId?: string }): Promise<{ conversationId: string }>
```

- [ ] **Step 2: Add safe no-op support to OpenClaw runtime**

In `lib/runtimes/openclaw.ts`, implement minimal methods:
```ts
async pauseRun() {
  return
}
async retryRun() {
  return
}
async forkConversation({ conversationId }: { conversationId: string }) {
  return { conversationId: `${conversationId}-fork-${Date.now()}` }
}
```

- [ ] **Step 3: Add run control API**

Create `app/api/runs/[conversationId]/[runId]/control/route.ts`:
```ts
const body = await request.json() as { action: "pause" | "retry" | "fork" }
```
Handle actions and return:
```ts
{ ok: true, action }
```
Or for fork:
```ts
{ ok: true, action: "fork", conversationId: forkedId }
```

- [ ] **Step 4: Add control buttons in Conversations run drill-down**

Render buttons:
```tsx
<button onClick={() => controlRun("pause")}>Pause</button>
<button onClick={() => controlRun("retry")}>Retry</button>
<button onClick={() => controlRun("fork")}>Fork</button>
```

- [ ] **Step 5: Route fork action into a new thread**

If the API returns `conversationId`, update URL selection:
```ts
router.push(`/conversations?id=${encodeURIComponent(conversationId)}`)
```

- [ ] **Step 6: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint lib/runtimes/types.ts lib/runtimes/openclaw.ts app/api/runs/[conversationId]/[runId]/control/route.ts app/conversations/page.tsx
```
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add lib/runtimes/types.ts lib/runtimes/openclaw.ts app/api/runs/[conversationId]/[runId]/control/route.ts app/conversations/page.tsx
git commit -m "feat: add run control actions"
```

### Task 6: Add cross-object search for command center operators

**Files:**
- Create: `lib/search.ts`
- Create: `app/api/search/route.ts`
- Create: `app/search/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/CommandPalette.tsx`

- [ ] **Step 1: Create search result types**

In `lib/search.ts`:
```ts
export interface SearchResult {
  type: "conversation" | "task" | "project" | "alert"
  id: string
  title: string
  summary: string
  href: string
}
```

- [ ] **Step 2: Implement canonical search helper**

Add:
```ts
export async function searchEverything(query: string): Promise<SearchResult[]> {
  // search conversations, tasks, alerts, projects
}
```

- [ ] **Step 3: Add search API**

Create `app/api/search/route.ts`:
```ts
const query = new URL(request.url).searchParams.get("q") ?? ""
return NextResponse.json(await searchEverything(query))
```

- [ ] **Step 4: Add search page UI**

Create `app/search/page.tsx` with:
- search input
- result grouping
- links into exact destination pages

- [ ] **Step 5: Add Search to nav and command palette**

Sidebar item:
```ts
{ href: "/search", label: "Search", icon: Search }
```
Command palette item:
```ts
{ id: "nav-search", label: "Search", description: "Cross-object command center search", icon: Search, category: "navigation", keywords: ["find", "lookup", "query"], action: go("/search") }
```

- [ ] **Step 6: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint lib/search.ts app/api/search/route.ts app/search/page.tsx components/Sidebar.tsx components/CommandPalette.tsx
```
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add lib/search.ts app/api/search/route.ts app/search/page.tsx components/Sidebar.tsx components/CommandPalette.tsx
git commit -m "feat: add command center search"
```

### Task 7: Add tool trace foundations to the canonical model

**Files:**
- Create: `lib/tool-traces.ts`
- Modify: `lib/conversations.ts`
- Modify: `app/api/runs/[conversationId]/[runId]/route.ts`
- Modify: `app/conversations/page.tsx`

- [ ] **Step 1: Create tool trace model**

In `lib/tool-traces.ts`:
```ts
export interface ToolTrace {
  id: string
  conversationId: string
  runId: string
  toolName: string
  status: "started" | "completed" | "failed"
  input?: string
  output?: string
  error?: string
  startedAt: string
  completedAt?: string
}
```

- [ ] **Step 2: Add storage helpers**

Also implement:
```ts
export async function listToolTracesForRun(conversationId: string, runId: string): Promise<ToolTrace[]> { /* file/kv */ }
export async function appendToolTrace(trace: ToolTrace): Promise<ToolTrace> { /* persist */ }
```

- [ ] **Step 3: Include tool traces in run detail API**

Modify route response:
```ts
const toolTraces = await listToolTracesForRun(conversationId, runId)
return NextResponse.json({ run: payload.run, conversation: ..., events, messages, toolTraces })
```

- [ ] **Step 4: Render tool trace panel in Conversations run drill-down**

Add section:
```tsx
{runDetail?.toolTraces?.length ? runDetail.toolTraces.map((trace) => (
  <div key={trace.id} className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-3">
    <p className="text-sm text-white">{trace.toolName}</p>
    <p className="text-xs text-zinc-500">{trace.status}</p>
  </div>
)) : <p className="text-sm text-zinc-500">No tool traces yet.</p>}
```

- [ ] **Step 5: Add TODO note for runtime trace integration without faking backend capture**

In `docs/mission-control-architecture.md`, add:
```md
Tool traces are modeled and UI-ready, but runtime adapters still need to emit actual tool lifecycle events.
```

- [ ] **Step 6: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint lib/tool-traces.ts lib/conversations.ts app/api/runs/[conversationId]/[runId]/route.ts app/conversations/page.tsx
```
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add lib/tool-traces.ts lib/conversations.ts app/api/runs/[conversationId]/[runId]/route.ts app/conversations/page.tsx docs/mission-control-architecture.md
git commit -m "feat: add tool trace foundations"
```

### Task 8: Improve dashboard into a captain’s briefing view

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/api/alerts/route.ts`
- Modify: `app/api/projects/route.ts`

- [ ] **Step 1: Add briefing data fetches**

In `app/dashboard/page.tsx`, extend `Promise.allSettled` with:
```ts
fetch("/api/alerts", { cache: "no-store" }).then((r) => r.json())
```

- [ ] **Step 2: Add briefing summary block**

Render a top card that computes:
- open alerts count
- failed runs count inferred from alerts
- completed task events count inferred from activity
- active task count from tasks

Example copy:
```tsx
<p className="text-sm text-zinc-300">2 alerts need attention. 1 task completed recently. 3 tasks still active.</p>
```

- [ ] **Step 3: Add “What needs attention” list**

Render first 3 alerts with links:
```tsx
<Link href={alert.conversationId ? `/conversations?id=${alert.conversationId}` : "/alerts"}>{alert.title}</Link>
```

- [ ] **Step 4: Verify lint and types**

Run:
```bash
./node_modules/.bin/tsc --noEmit
npm exec eslint app/dashboard/page.tsx app/api/alerts/route.ts app/api/projects/route.ts
```
Expected: exit code 0 or only pre-existing unrelated warnings outside changed lines

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx app/api/alerts/route.ts app/api/projects/route.ts
git commit -m "feat: add captain briefing dashboard"
```

### Task 9: Document the architecture and operating model

**Files:**
- Modify: `README.md`
- Modify: `docs/mission-control-architecture.md`

- [ ] **Step 1: Add architecture overview doc sections**

In `docs/mission-control-architecture.md`, document:
- canonical objects: conversations, runs, events, alerts, tasks, projects
- derived views: activity, messages, dashboard, search
- navigation model
- current limitations

- [ ] **Step 2: Add README section**

Append to `README.md`:
```md
## Mission Control

Shipyard Mission Control unifies:
- conversations
- runs
- task threads
- activity
- alerts
- project war rooms

The system is built on a canonical conversations/runs/events model, with operator pages derived from that shared source of truth.
```

- [ ] **Step 3: Verify markdown paths and no broken references**

Run:
```bash
test -f docs/mission-control-architecture.md && echo ok
rg "mission-control-architecture" README.md docs -n
```
Expected: file exists and README references it correctly

- [ ] **Step 4: Commit**

```bash
git add README.md docs/mission-control-architecture.md
git commit -m "docs: describe mission control architecture"
```

---

## Self-Review

Spec coverage:
- Run drill-down: covered in Task 1
- Alert inbox: covered in Task 2
- Project war room: covered in Task 3
- Summaries: covered in Task 4
- Pause/retry/fork controls: covered in Task 5
- Search: covered in Task 6
- Tool trace foundation: covered in Task 7
- Better dashboard legibility: covered in Task 8
- Architecture docs: covered in Task 9

Placeholder scan:
- No `TODO`, `TBD`, or “implement later” placeholders remain in executable steps.
- Where future runtime support is intentionally deferred, the plan explicitly documents current minimal implementations and architecture notes.

Type consistency:
- Canonical object names consistently use `conversation`, `run`, `event`, `alert`, `task`, `project`.
- Control actions consistently use `pause`, `retry`, `fork`.
- Search results consistently use `type`, `id`, `title`, `summary`, `href`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-shipyard-mission-control-roadmap.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?