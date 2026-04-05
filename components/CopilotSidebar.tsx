"use client"

import Link from "next/link"

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

interface Goal {
  id: string
  title: string
  status: "active" | "completed" | "paused"
  priority: "high" | "medium" | "low"
  progress?: { total: number; done: number; percent: number }
}

interface ActivityEntry {
  id: string
  taskTitle: string
  agent: string
  action: string
  timestamp: string
}

interface InboxItem {
  id: string
  fromName: string
  subject: string
  date: string
}

interface ApprovalItem {
  id: string
  label: string
  detail: string
  severity: "high" | "medium" | "low"
}

interface CopilotSidebarProps {
  activeGoals: Goal[]
  urgentTasks: Task[]
  repos: Repo[]
  recentActivity: ActivityEntry[]
  inboxItems: InboxItem[]
  intelSummary: string
  demoMode: boolean
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function CopilotSidebar({ activeGoals, urgentTasks, repos, recentActivity, inboxItems, intelSummary, demoMode }: CopilotSidebarProps) {
  const topPriority = urgentTasks.slice(0, 3)
  const hotRepo = repos.find((r) => r.latestRun?.status === "in_progress" || r.latestRun?.conclusion !== "success") ?? repos[0]
  const lastAction = recentActivity[0]

  const approvalQueue: ApprovalItem[] = [
    hotRepo
      ? {
          id: `repo-${hotRepo.name}`,
          label: "Approve repo attention",
          detail: `${hotRepo.name} is the highest-risk project right now.`,
          severity: "high",
        }
      : null,
    topPriority[0]
      ? {
          id: `task-${topPriority[0].id}`,
          label: "Approve top task",
          detail: `${topPriority[0].title} is the most urgent task.`,
          severity: "medium",
        }
      : null,
    inboxItems[0]
      ? {
          id: `inbox-${inboxItems[0].id}`,
          label: "Review inbound message",
          detail: `${inboxItems[0].fromName}: ${inboxItems[0].subject}`,
          severity: "low",
        }
      : null,
  ].filter((item): item is ApprovalItem => item !== null)

  const briefLines = [
    `You have ${urgentTasks.length} open tasks, ${activeGoals.length} active goals, and ${inboxItems.length} inbox item${inboxItems.length === 1 ? "" : "s"}.`,
    hotRepo ? `${hotRepo.name} is the biggest risk signal.` : "No current project risk signal.",
    lastAction ? `${lastAction.agent} last ${lastAction.action} “${lastAction.taskTitle}”.` : "No recent agent activity.",
  ]

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 self-start">
      <div className="rounded-2xl border border-cyan-500/20 bg-[#101018] p-4 shadow-[0_0_30px_rgba(34,211,238,0.06)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Copilot</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Company brief</h2>
          </div>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
            {demoMode ? "Demo" : "Live"}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Morning brief</p>
          <div className="rounded-xl border border-zinc-800 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
            {briefLines.map((line) => (
              <p key={line} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>
          <p className="text-sm leading-6 text-zinc-300">{intelSummary}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/tasks" className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs font-medium text-white hover:border-cyan-500/30 hover:bg-cyan-500/10">
            Review tasks
          </Link>
          <Link href="/conversations" className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs font-medium text-white hover:border-cyan-500/30 hover:bg-cyan-500/10">
            Open chat
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111118] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Top priorities</h3>
          <Link href="/tasks" className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200">All tasks →</Link>
        </div>
        <div className="mt-3 space-y-2">
          {topPriority.length === 0 ? (
            <p className="text-sm text-zinc-500">No urgent work.</p>
          ) : topPriority.map((task) => (
            <div key={task.id} className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2">
              <p className="text-sm text-white line-clamp-2">{task.title}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{task.priority} • {task.column} • @{task.assignee}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111118] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Risks</h3>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-sm text-amber-200">{hotRepo ? `${hotRepo.name} needs attention` : "No repo risk detected"}</p>
            {hotRepo ? <p className="mt-1 text-[11px] text-zinc-500">Last updated {relativeTime(hotRepo.updatedAt)}</p> : null}
          </div>
          {lastAction ? (
            <div className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2">
              <p className="text-sm text-zinc-200">Latest action: {lastAction.agent} {lastAction.action} “{lastAction.taskTitle}”</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111118] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Approval queue</h3>
        <div className="mt-3 space-y-2">
          {approvalQueue.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing awaiting approval.</p>
          ) : (
            approvalQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{item.detail}</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">
                    {item.severity}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <button className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200 hover:bg-emerald-500/15">
                    Approve
                  </button>
                  <button className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-200 hover:bg-amber-500/15">
                    Hold
                  </button>
                  <button className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-200 hover:bg-cyan-500/15">
                    Delegate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111118] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Execute</h3>
        <div className="mt-3 grid gap-2">
          <Link href="/company" className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs font-medium text-white hover:border-purple-500/30 hover:bg-purple-500/10">Update goals</Link>
          <Link href="/alerts" className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs font-medium text-white hover:border-rose-500/30 hover:bg-rose-500/10">Review alerts</Link>
          <Link href="/projects" className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs font-medium text-white hover:border-emerald-500/30 hover:bg-emerald-500/10">Check projects</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111118] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Context</h3>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-zinc-300">{activeGoals.length} active goal{activeGoals.length === 1 ? "" : "s"}</p>
          <p className="text-zinc-300">{inboxItems.length} inbox item{inboxItems.length === 1 ? "" : "s"}</p>
          <p className="text-zinc-300">{repos.length} project{repos.length === 1 ? "" : "s"}</p>
        </div>
      </div>
    </aside>
  )
}
