"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { CopilotSidebar } from "@/components/CopilotSidebar"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Session {
  key?: string
  id?: string
  label?: string
  model?: string
  status?: string
  startedAt?: string
  created_at?: string
}

interface Task {
  id: string
  title: string
  column: string
  assignee: string
  priority: string
  description?: string
}

interface Repo {
  name: string
  description: string | null
  url: string
  updatedAt: string
  latestRun: { status: string; conclusion: string | null; url: string } | null
  openPRs: { number: number; title: string; url: string }[]
}

interface IntelReport {
  generatedAt: string | null
  summary?: string
  headline?: string
}

interface Goal {
  id: string
  title: string
  description?: string
  status: "active" | "completed" | "paused"
  priority: "high" | "medium" | "low"
  assignedTo?: string
  taskIds?: string[]
  progress?: {
    total: number
    done: number
    percent: number
  }
}

interface ActivityEntry {
  id: string
  taskId: string
  taskTitle: string
  agent: string
  action: "started" | "completed" | "reviewed"
  summary?: string
  timestamp: string
}

interface EmailEntry {
  id: string
  from: string
  fromName: string
  subject: string
  snippet: string
  date: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PINNED = ["shipyard", "mission-control", "superteam-miami", "arken"]

const AGENT_DEFS = [
  { name: "Vic", emoji: "🦞", accent: "#7c3aed", keys: ["main"] },
  { name: "Scout", emoji: "🔭", accent: "#06b6d4", keys: ["scout"] },
  { name: "Deal Flow", emoji: "🤝", accent: "#f59e0b", keys: ["deal-flow", "dealflow"] },
  { name: "Builder", emoji: "⚡", accent: "#10b981", keys: ["builder", "subagent"] },
  { name: "Baron", emoji: "🏦", accent: "#ec4899", keys: ["wallet", "baron"] },
] as const

const TASK_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "in-review", label: "In Review" },
  { id: "done", label: "Done" },
] as const

const AGENT_EMOJI_MAP: Record<string, string> = {
  vic: "🦞",
  scout: "🔭",
  "deal-flow": "🤝",
  builder: "⚡",
  baron: "🏦",
  unassigned: "⚪",
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
}

const ACTION_COLOR_MAP: Record<string, string> = {
  started: "#3178c6",
  reviewed: "#f59e0b",
  completed: "#22c55e",
}

const ACTION_LABEL_MAP: Record<string, string> = {
  started: "started",
  reviewed: "reviewed",
  completed: "completed",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function isSessionActive(sessions: Session[], keys: readonly string[]): boolean {
  return sessions.some((s) => {
    const k = (s.key ?? s.id ?? s.label ?? "").toLowerCase()
    return keys.some((key) => k.includes(key))
  })
}

function ciColor(run: Repo["latestRun"]): string {
  if (!run) return "#71717a"
  if (run.status === "in_progress" || run.status === "queued") return "#f59e0b"
  if (run.conclusion === "success") return "#22c55e"
  return "#ef4444"
}

function ciLabel(run: Repo["latestRun"]): string {
  if (!run) return "No CI"
  if (run.status === "in_progress" || run.status === "queued") return "Running"
  if (run.conclusion === "success") return "Passing"
  return "Failing"
}

function getDynamicGreeting(name?: string): string {
  const hour = new Date().getHours()
  const suffix = name ? `, ${name}` : ""
  if (hour < 12) return `Good morning${suffix}`
  if (hour < 17) return `Good afternoon${suffix}`
  return `Good evening${suffix}`
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function hotRiskLabel(repos: Repo[]): string {
  const hot = repos.find((repo) => repo.latestRun?.status === "in_progress" || repo.latestRun?.conclusion !== "success")
  if (!hot) return "No live risk"
  return hot.latestRun?.conclusion === "failure" ? `${hot.name} failing` : `${hot.name} active`
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const [intel, setIntel] = useState<IntelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])
  const [emails, setEmails] = useState<EmailEntry[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [userName, setUserName] = useState("")
  const [setupCompleted, setSetupCompleted] = useState(true)

  // Check demo mode + userName
  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d: { demoMode?: boolean; userName?: string; completed?: boolean }) => {
        if (d.demoMode) setDemoMode(true)
        if (d.userName) setUserName(d.userName)
        if (d.completed === false) setSetupCompleted(false)
      })
      .catch(() => null)
  }, [])

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox", { cache: "no-store" })
      const d = await res.json() as { emails?: EmailEntry[] }
      setEmails(Array.isArray(d.emails) ? d.emails : [])
    } catch {
      setEmails([])
    }
    setInboxLoading(false)
  }, [])

  const fetchAll = useCallback(async () => {
    const [sessRes, taskRes, projRes, intelRes, goalsRes, activityRes] = await Promise.allSettled([
      fetch("/api/sessions", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/tasks", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/intel/report", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/company/goals", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/activity", { cache: "no-store" }).then((r) => r.json()),
    ])

    if (sessRes.status === "fulfilled") {
      const d = sessRes.value as { sessions?: Session[] } | Session[]
      setSessions(Array.isArray(d) ? d : (d.sessions ?? []))
    }
    if (taskRes.status === "fulfilled") {
      const d = taskRes.value as Task[]
      setTasks(Array.isArray(d) ? d : [])
    }
    if (projRes.status === "fulfilled") {
      const d = projRes.value as Repo[]
      setRepos(Array.isArray(d) ? d : [])
    }
    if (intelRes.status === "fulfilled") {
      setIntel(intelRes.value as IntelReport)
    }
    if (goalsRes.status === "fulfilled") {
      const g = goalsRes.value as Goal[]
      setGoals(Array.isArray(g) ? g : [])
    }
    if (activityRes.status === "fulfilled") {
      const a = activityRes.value as ActivityEntry[]
      setRecentActivity(Array.isArray(a) ? a.slice(0, 5) : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    fetchInbox()
    const interval = setInterval(fetchAll, 30_000)
    const inboxInterval = setInterval(fetchInbox, 60_000)
    return () => { clearInterval(interval); clearInterval(inboxInterval) }
  }, [fetchAll, fetchInbox])

  const pinnedRepos = PINNED.map((name) => repos.find((r) => r.name === name)).filter(
    (r): r is Repo => r !== undefined
  )

  const taskCounts = TASK_COLUMNS.map(({ id, label }) => ({
    id,
    label,
    count: tasks.filter((t) => t.column === id).length,
  }))

  const intelSummary = intel?.summary || intel?.headline || "No scout report yet."
  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 3)
  const urgentTasks = tasks
    .filter((task) => task.column !== "done")
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    })
    .slice(0, 6)
  const approvalQueue = urgentTasks.slice(0, 2).map((task, index) => ({
    id: task.id,
    label: index === 0 ? "Approve top task" : "Hold secondary task",
    detail: `${task.title} • ${task.priority} • ${task.column}`,
    severity: index === 0 ? "high" : "medium",
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 lg:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_288px]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Executive Brief</p>
            <h1 className="text-3xl font-bold text-white">Mission Control</h1>
            <p className="text-sm text-zinc-400 mt-1 font-medium">{getDynamicGreeting(userName)}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{getFormattedDate()}</p>
          </div>

          {!loading && !setupCompleted && (
            <div className="rounded-xl p-5" style={{ backgroundColor: "#111118", border: "1px solid #7c3aed30" }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">🧭</span>
                <div>
                  <p className="text-sm font-semibold text-white">Welcome to Shipyard OS</p>
                  <p className="text-xs text-zinc-500">Complete setup to get your agents running.</p>
                </div>
              </div>
              <Link href="/setup" className="text-xs font-medium px-4 py-2 rounded-lg transition-colors inline-block" style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
                Run Setup Wizard →
              </Link>
            </div>
          )}

          {demoMode && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "#1a1a2e", border: "1px solid #f59e0b30" }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">🧪</span>
                <div>
                  <p className="text-sm font-medium text-amber-400">Running in demo mode</p>
                  <p className="text-xs text-zinc-500">Connect OpenClaw to activate agents and run real tasks.</p>
                </div>
              </div>
              <Link href="/settings" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
                Connect
              </Link>
            </div>
          )}

          <section className="rounded-xl border border-zinc-800 bg-[#111118] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">What matters now</p>
                <p className="mt-2 text-sm text-zinc-300">{intelSummary}</p>
              </div>
              {intel?.generatedAt ? <span className="text-[10px] text-zinc-700">{relativeTime(intel.generatedAt)}</span> : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-white">{loading ? "—" : tasks.filter((t) => t.column !== "done").length}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Goals</p>
                <p className="mt-1 text-2xl font-semibold text-white">{loading ? "—" : activeGoals.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Inbox</p>
                <p className="mt-1 text-2xl font-semibold text-white">{inboxLoading ? "—" : emails.length}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-[#111118] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Now / Next / Risk</p>
              <Link href="/tasks" className="text-[10px] font-medium text-cyan-300">Open board →</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Now</p>
                <p className="mt-1 text-sm text-white">{urgentTasks[0]?.title ?? "Nothing urgent"}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Next</p>
                <p className="mt-1 text-sm text-white">{urgentTasks[1]?.title ?? "All caught up"}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Risk</p>
                <p className="mt-1 text-sm text-white">{hotRiskLabel(repos)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-[#111118] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Approvals</p>
              <span className="text-[10px] text-zinc-600">{loading ? "…" : "Live"}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {approvalQueue.slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{item.label}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{item.detail}</p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{item.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <CopilotSidebar
          activeGoals={activeGoals}
          urgentTasks={urgentTasks}
          repos={repos}
          recentActivity={recentActivity}
          inboxItems={emails}
          intelSummary={intelSummary}
          demoMode={demoMode}
        />
      </div>
    </div>
  )
}
