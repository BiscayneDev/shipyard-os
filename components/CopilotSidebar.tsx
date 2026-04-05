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

        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {intelSummary}
        </p>

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
