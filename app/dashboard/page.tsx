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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 lg:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
      {/* Demo mode banner */}
      {demoMode && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ backgroundColor: "#1a1a2e", border: "1px solid #f59e0b30" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🧪</span>
            <div>
              <p className="text-sm font-medium text-amber-400">Running in demo mode</p>
              <p className="text-xs text-zinc-500">Connect OpenClaw to activate agents and run real tasks.</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}
          >
            Connect
          </Link>
        </div>
      )}

      {/* ── 1. Header — dynamic greeting ─────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1 font-medium">{getDynamicGreeting(userName)}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{getFormattedDate()}</p>
      </div>

      {/* ── Getting Started (for new users) ──────────────────────── */}
      {!loading && !setupCompleted && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111118", border: "1px solid #7c3aed30" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🧭</span>
            <div>
              <p className="text-sm font-semibold text-white">Welcome to Shipyard OS</p>
              <p className="text-xs text-zinc-500">Complete setup to get your agents running.</p>
            </div>
          </div>
          <Link
            href="/setup"
            className="text-xs font-medium px-4 py-2 rounded-lg transition-colors inline-block"
            style={{ backgroundColor: "#7c3aed", color: "#fff" }}
          >
            Run Setup Wizard →
          </Link>
        </div>
      )}

      {!loading && setupCompleted && recentActivity.length === 0 && tasks.length <= 5 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111118", border: "1px solid #7c3aed30" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">🧭</span>
            <p className="text-sm font-semibold text-white">Getting Started</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: "1", label: "Create a task", desc: "Add work to the Kanban board", href: "/tasks", color: "#3178c6" },
              { step: "2", label: "Set up your agents", desc: "Customize roles and skills", href: "/agents", color: "#10b981" },
              { step: "3", label: "Activate a task", desc: "Drag to In Progress to assign an agent", href: "/tasks", color: "#7c3aed" },
            ].map((item) => (
              <Link
                key={item.step}
                href={item.href}
                className="rounded-lg p-3 transition-all hover:bg-white/5"
                style={{ border: `1px solid ${item.color}28` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.step}
                  </span>
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                </div>
                <p className="text-[11px] text-zinc-500 ml-7">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Agent Status Row ───────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Agents</p>
        <div
          className="rounded-xl p-1"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <div className="grid grid-cols-5">
            {AGENT_DEFS.map((agent) => {
              const agentKey = agent.name.toLowerCase().replace(" ", "-")
              const activeTasks = tasks.filter(
                (t) => t.assignee === agentKey && t.column === "in-progress"
              )
              const busy = activeTasks.length > 0
              const currentTask = activeTasks[0]
              return (
                <Link
                  key={agent.name}
                  href={busy && currentTask ? `/tasks` : "/agents"}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all hover:bg-white/5"
                >
                  <div className="relative">
                    <span className="text-2xl">{agent.emoji}</span>
                    {busy && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ backgroundColor: agent.accent }}
                        />
                        <span
                          className="relative inline-flex rounded-full h-2 w-2"
                          style={{ backgroundColor: agent.accent }}
                        />
                      </span>
                    )}
                  </div>
                  <div className="text-center space-y-0.5 w-full px-1">
                    <p className="text-xs font-semibold text-white leading-none">{agent.name}</p>
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: busy ? agent.accent : "#52525b" }}
                    >
                      {busy ? "Busy" : "Idle"}
                    </p>
                    {busy && currentTask && (
                      <p className="text-[9px] text-zinc-500 truncate leading-tight mt-0.5 max-w-full">
                        {currentTask.title.length > 22
                          ? currentTask.title.slice(0, 22) + "…"
                          : currentTask.title}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Tasks + Projects row ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Summary */}
        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Tasks</p>
          <div
            className="rounded-xl p-5 space-y-3 h-full"
            style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
          >
            <div className="grid grid-cols-2 gap-3">
              {taskCounts.map(({ id, label, count }) => {
                const accentMap: Record<string, string> = {
                  backlog: "#52525b",
                  "in-progress": "#3178c6",
                  "in-review": "#f59e0b",
                  done: "#22c55e",
                }
                const accent = accentMap[id] ?? "#7c3aed"
                return (
                  <Link
                    key={id}
                    href="/tasks"
                    className="rounded-lg p-3 space-y-1 transition-all hover:bg-white/5"
                    style={{ border: `1px solid ${accent}28` }}
                  >
                    <p className="text-2xl font-bold" style={{ color: accent }}>
                      {loading ? "—" : count}
                    </p>
                    <p className="text-xs text-zinc-500">{label}</p>
                  </Link>
                )
              })}
            </div>
            <Link
              href="/tasks"
              className="block text-center text-xs font-medium py-2 rounded-lg transition-colors hover:text-white"
              style={{ color: "#7c3aed" }}
            >
              View board →
            </Link>
          </div>
        </section>

        {/* Projects Health */}
        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Projects Health</p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
          >
            {loading ? (
              <div className="p-5 text-center">
                <p className="text-xs text-zinc-600">Loading...</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {pinnedRepos.length === 0
                  ? PINNED.map((name) => (
                      <div key={name} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#71717a" }} />
                        <span className="text-xs text-zinc-500 flex-1">{name}</span>
                        <span className="text-xs text-zinc-700">—</span>
                      </div>
                    ))
                  : pinnedRepos.map((repo) => {
                      const color = ciColor(repo.latestRun)
                      const label = ciLabel(repo.latestRun)
                      const isRunning =
                        repo.latestRun?.status === "in_progress" ||
                        repo.latestRun?.status === "queued"
                      return (
                        <a
                          key={repo.name}
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                        >
                          {isRunning ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className="relative inline-flex rounded-full h-2 w-2"
                                style={{ backgroundColor: color }}
                              />
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          )}
                          <span className="text-xs text-white flex-1 font-medium">{repo.name}</span>
                          <div className="flex items-center gap-2">
                            {repo.openPRs.length > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
                              >
                                {repo.openPRs.length} PR
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color }}>{label}</span>
                            <span className="text-[10px] text-zinc-700">{relativeTime(repo.updatedAt)}</span>
                          </div>
                        </a>
                      )
                    })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 4. Inbox + Activity — side by side ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Inbox */}
        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Inbox</p>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{
              backgroundColor: "#111118",
              border: "1px solid rgba(245,158,11,0.2)",
              boxShadow: "0 0 24px rgba(245,158,11,0.04)",
              minHeight: "220px",
            }}
          >
            {inboxLoading ? (
              <p className="text-xs text-zinc-600 text-center py-4">Loading inbox...</p>
            ) : emails.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>Inbox clear ✓</p>
                <p className="text-xs text-zinc-600 mt-1">No unread messages in the last 2 days</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.slice(0, 5).map((email) => (
                  <div key={email.id} className="flex items-start gap-3 py-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: "#f59e0b" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-white truncate">{email.fromName}</p>
                        <span className="text-[10px] text-zinc-600 shrink-0">{relativeTime(email.date)}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{email.subject}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-1 border-t border-zinc-800/40">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium transition-colors hover:text-white"
                    style={{ color: "#f59e0b" }}
                  >
                    Open Gmail →
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Recent Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Recent Activity</p>
            <Link
              href="/agents"
              className="text-[10px] font-medium transition-colors hover:text-white"
              style={{ color: "#22c55e" }}
            >
              View all →
            </Link>
          </div>
          <div
            className="rounded-xl px-5 py-4 space-y-3"
            style={{
              backgroundColor: "#111118",
              border: "1px solid rgba(34,197,94,0.15)",
              minHeight: "220px",
            }}
          >
            {loading ? (
              <p className="text-xs text-zinc-600 text-center py-4">Loading...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No activity yet — start shipping!</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => {
                  const emoji = AGENT_EMOJI_MAP[entry.agent] ?? "🤖"
                  const color = ACTION_COLOR_MAP[entry.action] ?? "#22c55e"
                  const label = ACTION_LABEL_MAP[entry.action] ?? entry.action
                  const diff = Date.now() - new Date(entry.timestamp).getTime()
                  const mins = Math.floor(diff / 60000)
                  const hrs = Math.floor(diff / 3600000)
                  const days = Math.floor(diff / 86400000)
                  const rel = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${days}d ago`
                  return (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 leading-snug">
                          <span>{emoji}</span>{" "}
                          <span className="font-medium" style={{ color }}>{label}</span>{" "}
                          <Link href="/tasks" className="text-zinc-300 hover:text-white font-medium">
                            {entry.taskTitle.length > 32 ? entry.taskTitle.slice(0, 32) + "…" : entry.taskTitle}
                          </Link>
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-700 shrink-0">{rel}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 5. Bottom strip — Intel + Goals in ONE card ───────────── */}
      <section>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#111118",
            border: "1px solid #1a1a2e",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
            {/* Left: Scout Intel */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔭</span>
                <span className="text-xs font-semibold text-zinc-400">Last Report</span>
                {intel?.generatedAt && (
                  <span className="text-[10px] text-zinc-700 ml-auto">{relativeTime(intel.generatedAt)}</span>
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                {loading ? "Loading..." : intelSummary}
              </p>
              <Link
                href="/intel"
                className="text-xs font-medium transition-colors hover:text-white"
                style={{ color: "#06b6d4" }}
              >
                Full report →
              </Link>
            </div>

            {/* Right: Active Goals */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Active Goals</span>
                <Link
                  href="/company"
                  className="text-[10px] font-medium transition-colors hover:text-white"
                  style={{ color: "#7c3aed" }}
                >
                  View all →
                </Link>
              </div>
              {loading ? (
                <p className="text-xs text-zinc-600">Loading...</p>
              ) : activeGoals.length === 0 ? (
                <p className="text-xs text-zinc-600">
                  No active goals.{" "}
                  <Link href="/company" className="hover:text-zinc-400 transition-colors" style={{ color: "#7c3aed" }}>
                    Set one →
                  </Link>
                </p>
              ) : (
                <div className="space-y-3">
                  {activeGoals.map((goal) => {
                    const prog = goal.progress
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: PRIORITY_COLOR[goal.priority] ?? "#71717a" }}
                          />
                          <p className="text-xs text-zinc-300 flex-1 leading-snug truncate">{goal.title}</p>
                          {prog && prog.total > 0 && (
                            <span className="text-[10px] font-medium text-zinc-500 shrink-0">
                              {prog.done}/{prog.total}
                            </span>
                          )}
                          {goal.assignedTo && (
                            <span className="text-sm shrink-0">{AGENT_EMOJI_MAP[goal.assignedTo] ?? ""}</span>
                          )}
                        </div>
                        {prog && prog.total > 0 && (
                          <div
                            className="w-full h-1 rounded-full overflow-hidden ml-4"
                            style={{ backgroundColor: "#1a1a2e" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${prog.percent}%`,
                                backgroundColor: prog.percent === 100 ? "#22c55e" : "#7c3aed",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
