import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { type AlertRecord } from "@/lib/alerts"
import { summarizeProject } from "@/lib/summaries"
import { getProjectWarRoom } from "@/app/api/projects/[name]/route"
import { ProjectActions } from "./ProjectActions"

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function sectionCard(children: ReactNode) {
  return <div className="rounded-2xl border border-[#1a1a2e] bg-[#111118] p-5">{children}</div>
}

export default async function ProjectWarRoomPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const projectName = decodeURIComponent(name)

  const warRoom = await getProjectWarRoom(projectName)
  if (!warRoom) notFound()

  const { project, relatedConversations, relatedTasks, relatedAlerts } = warRoom
  const summary = summarizeProject({
    project,
    relatedTasks,
    relatedAlerts,
    relatedConversations,
  })
  const openAlerts = relatedAlerts.filter((alert) => alert.status !== "resolved")
  const topAlert = openAlerts[0]
  const activeTask = relatedTasks[0]
  const activeConversation = relatedConversations[0]

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="space-y-2">
        <Link href="/projects" className="text-sm text-violet-300 hover:underline underline-offset-2">
          ← Back to projects
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">Project war room for repo activity, tasks, conversations, and alerts.</p>
          </div>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-300 hover:text-violet-200"
          >
            Open GitHub →
          </a>
        </div>
      </div>

      {sectionCard(
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Project overview</h2>
          <p className="text-sm text-zinc-300">{project.description || "No project description available."}</p>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Updated {relativeTime(project.updatedAt)}</span>
            <span>{project.primaryLanguage?.name || "Unknown language"}</span>
            <span>{project.isPrivate ? "Private repo" : "Public repo"}</span>
            <span>{relatedTasks.length} related tasks</span>
            <span>{relatedConversations.length} related conversations</span>
            <span>{relatedAlerts.length} related alerts</span>
          </div>
        </div>
      )}
      {summary
        ? sectionCard(
            <div className="space-y-4">
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Summary</h2>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{summary}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">What to do now</p>
                  <p className="mt-2 text-sm text-white">{topAlert ? topAlert.title : activeTask ? activeTask.title : "No immediate action"}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {topAlert
                      ? topAlert.summary
                      : activeTask
                      ? `${activeTask.priority} priority • ${activeTask.column} • ${activeTask.assignee}`
                      : "Pick the next concrete task."}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Likely owner</p>
                  <p className="mt-2 text-sm text-white">{activeTask?.assignee ?? project.name}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{activeConversation ? activeConversation.title : "No active conversation"}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Unblockers</p>
                  <p className="mt-2 text-sm text-white">{openAlerts.length > 0 ? `${openAlerts.length} open alert${openAlerts.length === 1 ? "" : "s"}` : "No open alerts"}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{project.latestRun ? `Latest CI: ${project.latestRun.name} • ${project.latestRun.status}${project.latestRun.conclusion ? ` • ${project.latestRun.conclusion}` : ""}` : "No recent CI run"}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Action</p>
                  <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-white">Turn the top risk into a task</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Creates an AI-enriched backlog task with the project context attached.</p>
                    </div>
                    <ProjectActions
                      projectName={project.name}
                      taskTitle={topAlert ? `Fix ${topAlert.title}` : `Stabilize ${project.name}`}
                      taskDescription={topAlert ? topAlert.summary : summary}
                      taskPriority={topAlert?.severity === "critical" ? "high" : topAlert?.severity === "warning" ? "medium" : "low"}
                      taskAssignee="unassigned"
                    />
                  </div>
                </div>
              </div>
            </div>,
          )
        : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {sectionCard(
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Related tasks</h2>
            {relatedTasks.length === 0 ? (
              <p className="text-sm text-zinc-500">No related tasks found.</p>
            ) : (
              <div className="space-y-3">
                {relatedTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{task.column}</span>
                    </div>
                    {task.description ? <p className="mt-2 text-sm text-zinc-400">{task.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>{task.priority} priority</span>
                      <span>{task.assignee}</span>
                      {task.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-800 px-2 py-1 text-zinc-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sectionCard(
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Related conversations</h2>
            {relatedConversations.length === 0 ? (
              <p className="text-sm text-zinc-500">No related conversations found.</p>
            ) : (
              <div className="space-y-3">
                {relatedConversations.map((conversation) => (
                  <div key={conversation.id} className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
                    <Link href={`/conversations?id=${conversation.id}`} className="text-sm font-semibold text-violet-300 hover:underline underline-offset-2">
                      {conversation.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span>{conversation.agent}</span>
                      <span>{conversation.status}</span>
                      <span>{conversation.runCount} runs</span>
                      <span>Updated {relativeTime(conversation.updatedAt)}</span>
                    </div>
                    {conversation.latestPreview ? <p className="mt-2 text-sm text-zinc-400">{conversation.latestPreview}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sectionCard(
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Related alerts</h2>
            {relatedAlerts.length === 0 ? (
              <p className="text-sm text-zinc-500">No related alerts found.</p>
            ) : (
              <div className="space-y-3">
                {relatedAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        )}

        {sectionCard(
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Recent PR/CI status</h2>
            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
              <p className="text-sm text-zinc-300">
                {project.openPRs.length} open PR{project.openPRs.length === 1 ? "" : "s"}
              </p>
              <div className="mt-3 space-y-2">
                {project.openPRs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No open PRs.</p>
                ) : (
                  project.openPRs.map((pr) => (
                    <a
                      key={pr.number}
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-violet-300 hover:underline underline-offset-2"
                    >
                      #{pr.number} {pr.title}
                    </a>
                  ))
                )}
              </div>
              <div className="mt-4 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
                {project.latestRun ? (
                  <a href={project.latestRun.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {project.latestRun.name} • {project.latestRun.status}
                    {project.latestRun.conclusion ? ` • ${project.latestRun.conclusion}` : ""}
                  </a>
                ) : (
                  <p className="text-zinc-500">No recent CI runs found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertItem({ alert }: { alert: AlertRecord }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0f] p-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="rounded-full border border-zinc-800 px-2 py-1 uppercase tracking-wide text-zinc-400">{alert.severity}</span>
        <span className="rounded-full border border-zinc-800 px-2 py-1 uppercase tracking-wide text-zinc-400">{alert.status}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{alert.title}</p>
      <p className="mt-1 text-sm text-zinc-400">{alert.summary}</p>
      {alert.conversationId ? (
        <Link href={`/conversations?id=${alert.conversationId}`} className="mt-3 inline-block text-xs text-violet-300 hover:underline underline-offset-2">
          Open conversation
        </Link>
      ) : null}
    </div>
  )
}
