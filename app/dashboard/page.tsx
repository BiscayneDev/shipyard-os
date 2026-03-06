"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

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

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const [intel, setIntel] = useState<IntelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])

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
      setRecentActivity(Array.isArray(a) ? a.slice(0, 3) : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const pinnedRepos = PINNED.map((name) => repos.find((r) => r.name === name)).filter(
    (r): r is Repo => r !== undefined
  )

  const taskCounts = TASK_COLUMNS.map(({ id, label }) => ({
    id,
    label,
    count: tasks.filter((t) => t.column === id).length,
  }))

  const intelSummary =
    intel?.summary ||
    intel?.headline ||
    "No scout report yet."

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Morning briefing — command center overview</p>
      </div>

      {/* ── Agent Status Row ─────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Agents</p>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <div className="grid grid-cols-5 gap-2">
            {AGENT_DEFS.map((agent) => {
              const active = !loading && isSessionActive(sessions, agent.keys)
              return (
                <Link
                  key={agent.name}
                  href="/agents"
                  className="flex flex-col items-center gap-2 py-3 px-2 rounded-lg transition-all hover:bg-white/5"
                >
                  <div className="relative">
                    <span className="text-2xl">{agent.emoji}</span>
                    {active && (
                      <span className="absolute -top-0.5 -right-0.5 relative flex h-2 w-2">
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
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-semibold text-white leading-none">{agent.name}</p>
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: active ? agent.accent : "#52525b" }}
                    >
                      {active ? "Active" : "Idle"}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Middle row: Tasks + Projects ─────────────────────────── */}
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
                    style={{
                      border: `1px solid ${accent}28`,
                    }}
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
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: "#71717a" }}
                        />
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
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          <span className="text-xs text-white flex-1 font-medium">{repo.name}</span>
                          <div className="flex items-center gap-2">
                            {repo.openPRs.length > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#f59e0b",
                                }}
                              >
                                {repo.openPRs.length} PR
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color }}>
                              {label}
                            </span>
                            <span className="text-[10px] text-zinc-700">
                              {relativeTime(repo.updatedAt)}
                            </span>
                          </div>
                        </a>
                      )
                    })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Intel + Quick Actions row ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Intel */}
        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Recent Intel</p>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{
              backgroundColor: "#111118",
              border: "1px solid rgba(6, 182, 212, 0.2)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔭</span>
              <span className="text-xs font-medium text-zinc-400">Scout Report</span>
              {intel?.generatedAt && (
                <span className="text-[10px] text-zinc-700 ml-auto">
                  {relativeTime(intel.generatedAt)}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {loading ? "Loading..." : intelSummary}
            </p>
            <Link
              href="/intel"
              className="block text-xs font-medium transition-colors hover:text-white"
              style={{ color: "#06b6d4" }}
            >
              Full report →
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Quick Actions</p>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  fetch("/api/intel/deploy", { method: "POST" }).catch(() => null)
                }
                className="rounded-lg px-3 py-2.5 text-xs font-medium transition-all hover:opacity-80 text-left"
                style={{
                  backgroundColor: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  color: "#06b6d4",
                }}
              >
                🔭 Deploy Scout
              </button>

              <Link
                href="/tasks"
                className="rounded-lg px-3 py-2.5 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  color: "#a78bfa",
                }}
              >
                ✅ New Task
              </Link>

              <a
                href="https://github.com/BiscayneDev"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-2.5 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid #1a1a2e",
                  color: "#a1a1aa",
                }}
              >
                🐙 GitHub
              </a>

              <a
                href="https://vercel.com/biscaynedev"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-2.5 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid #1a1a2e",
                  color: "#a1a1aa",
                }}
              >
                △ Vercel
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* ── Goals Widget ──────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Goals</p>
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid rgba(124,58,237,0.25)", boxShadow: "0 0 24px rgba(124,58,237,0.04)" }}
        >
          {(() => {
            const AGENT_EMOJI: Record<string, string> = {
              vic: "🦞", scout: "🔭", builder: "⚡", "deal-flow": "🤝", baron: "🏦",
            }
            const PRIORITY_COLOR: Record<string, string> = {
              high: "#ef4444", medium: "#f59e0b", low: "#22c55e",
            }
            const activeGoals = goals.filter((g) => g.status === "active").slice(0, 3)
            if (loading) return <p className="text-xs text-zinc-600 text-center py-2">Loading...</p>
            if (activeGoals.length === 0) return (
              <p className="text-xs text-zinc-600 text-center py-2">No active goals. <Link href="/company" className="hover:text-zinc-400" style={{ color: "#7c3aed" }}>Set one →</Link></p>
            )
            return (
              <div className="space-y-2">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: PRIORITY_COLOR[goal.priority] ?? "#71717a" }}
                    />
                    <p className="text-xs text-zinc-300 flex-1 leading-snug truncate">{goal.title}</p>
                    {goal.assignedTo && (
                      <span className="text-sm shrink-0">{AGENT_EMOJI[goal.assignedTo] ?? ""}</span>
                    )}
                  </div>
                ))}
                <div className="pt-1">
                  <Link href="/company" className="text-xs font-medium transition-colors hover:text-white" style={{ color: "#7c3aed" }}>
                    View all goals →
                  </Link>
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ── Recent Activity Widget ──────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">Recent Activity</p>
          <a href="/activity" className="text-[10px] font-medium transition-colors hover:text-white" style={{ color: "#22c55e" }}>View all →</a>
        </div>
        <div
          className="rounded-xl px-5 py-4 space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          {loading ? (
            <p className="text-xs text-zinc-600 text-center py-2">Loading...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-2">No activity yet — start shipping!</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((entry) => {
                const AGENT_EMOJI_MAP: Record<string, string> = { vic: "🦞", scout: "🔭", "deal-flow": "🤝", builder: "⚡", baron: "🏦", unassigned: "⚪" }
                const ACTION_COLOR_MAP: Record<string, string> = { started: "#3178c6", reviewed: "#f59e0b", completed: "#22c55e" }
                const ACTION_LABEL_MAP: Record<string, string> = { started: "started", reviewed: "reviewed", completed: "completed" }
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
                        <a href="/tasks" className="text-zinc-300 hover:text-white font-medium truncate">{entry.taskTitle}</a>
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

      {/* ── What the Team is Working On ──────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">What the Team is Working On</p>
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          {loading ? (
            <p className="text-xs text-zinc-600 text-center py-4">Loading...</p>
          ) : (() => {
            const active = tasks.filter((t) => t.column === "in-progress" || t.column === "in-review")
            if (active.length === 0) {
              return (
                <p className="text-xs text-zinc-600 text-center py-4">
                  All quiet — no active tasks right now.
                </p>
              )
            }
            const byAgent = AGENT_DEFS.map((agent) => ({
              agent,
              tasks: active.filter((t) => t.assignee === agent.name.toLowerCase().replace(" ", "-") || t.assignee === agent.keys[0]),
            })).filter((g) => g.tasks.length > 0)
            const unassigned = active.filter((t) => !AGENT_DEFS.some((a) => a.keys.includes(t.assignee as never) || a.name.toLowerCase().replace(" ", "-") === t.assignee))
            return (
              <div className="space-y-4">
                {byAgent.map(({ agent, tasks: agentTasks }) => (
                  <div key={agent.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agent.emoji}</span>
                      <span className="text-xs font-semibold" style={{ color: agent.accent }}>{agent.name}</span>
                      <span className="text-[10px] text-zinc-700">—</span>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {agentTasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2">
                          <span
                            className="mt-1 shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: task.column === "in-review" ? "rgba(245,158,11,0.15)" : "rgba(49,120,198,0.15)",
                              color: task.column === "in-review" ? "#f59e0b" : "#3178c6",
                            }}
                          >
                            {task.column === "in-review" ? "Review" : "WIP"}
                          </span>
                          <div>
                            <p className="text-xs text-zinc-300 font-medium leading-snug">{task.title}</p>
                            {task.description && (
                              <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">{task.description.replace("---", "").trim()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {unassigned.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚪</span>
                      <span className="text-xs font-semibold text-zinc-500">Unassigned</span>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {unassigned.map((task) => (
                        <div key={task.id} className="flex items-start gap-2">
                          <span className="mt-1 shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(113,113,122,0.15)", color: "#71717a" }}>
                            {task.column === "in-review" ? "Review" : "WIP"}
                          </span>
                          <p className="text-xs text-zinc-400 leading-snug">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-800/40">
                  <a href="/tasks" className="text-xs font-medium transition-colors hover:text-white" style={{ color: "#7c3aed" }}>
                    View full board →
                  </a>
                </div>
              </div>
            )
          })()}
        </div>
      </section>
    </div>
  )
}
