"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  projectName: string
  taskTitle: string
  taskDescription: string
  taskPriority?: "high" | "medium" | "low"
  taskAssignee?: string
  activateNow?: boolean
}

export function ProjectActions({ projectName, taskTitle, taskDescription, taskPriority = "medium", taskAssignee = "unassigned", activateNow = false }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [reviewOpen, setReviewOpen] = useState(false)

  const enrichedBrief = {
    title: taskTitle,
    summary: taskDescription,
    acceptanceCriteria: [
      `No regression in the ${projectName} flow`,
      "User-facing behavior stays simple and clearly documented",
      "The agent can execute without needing clarification",
    ],
    plan: [
      "Inspect the project context and isolate the highest-risk change",
      "Create or update the task with a crisp owner and instructions",
      "Approve only after the brief is reviewed for critical risks",
    ],
    risk: taskPriority === "high" ? "Critical risk — review before activation." : "Standard risk — safe to activate directly.",
  }

  async function createFixTask(shouldActivate: boolean, bypassReview = false) {
    const requireReview = shouldActivate && taskPriority === "high" && !bypassReview
    setBusy(true)
    setMessage("")
    try {
      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          column: requireReview ? "backlog" : shouldActivate ? "in-progress" : "backlog",
          priority: taskPriority,
          assignee: taskAssignee,
          tags: [projectName, "risk", "war-room"],
        }),
      })
      if (!createRes.ok) throw new Error("Failed to create task")
      const task = await createRes.json() as { id: string; title: string; description?: string; assignee?: string; priority?: string }

      if (shouldActivate && !requireReview) {
        const activateRes = await fetch("/api/tasks/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            priority: task.priority,
          }),
        })
        if (!activateRes.ok) throw new Error("Failed to activate task")
        setMessage("Created and activated fix task")
      } else if (requireReview) {
        setMessage("Review required before activation")
        setReviewOpen(true)
      } else {
        setMessage("Created fix task in backlog")
      }
      router.push("/tasks")
      router.refresh()
    } catch {
      setMessage(shouldActivate ? "Could not create and activate task" : "Could not create fix task")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => void createFixTask(false)}
        disabled={busy}
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
      >
        Draft fix task
      </button>
      <button
        onClick={() => void createFixTask(true)}
        disabled={busy}
        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/15 disabled:opacity-50"
      >
        Draft + activate
      </button>
      <p className="text-xs text-zinc-500">{message || "Turns the top risk into an AI-enriched task."}</p>

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.72)" }} onClick={() => setReviewOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#111118] p-6 shadow-[0_0_30px_rgba(8,145,178,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Review</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{enrichedBrief.title}</h3>
              </div>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">
                High risk
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300 whitespace-pre-wrap">{enrichedBrief.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Acceptance criteria</p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-300 list-disc pl-4">
                  {enrichedBrief.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Plan</p>
                <ol className="mt-2 space-y-1 text-xs leading-5 text-zinc-300 list-decimal pl-4">
                  {enrichedBrief.plan.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">{enrichedBrief.risk}</div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button onClick={() => setReviewOpen(false)} className="rounded-lg border border-zinc-700 bg-black/20 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5">Close</button>
              <button
                onClick={() => { setReviewOpen(false); void createFixTask(true, true) }}
                disabled={busy}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50"
              >
                Approve and activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
