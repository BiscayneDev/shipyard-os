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

  async function createFixTask(shouldActivate: boolean) {
    const requireReview = shouldActivate && taskPriority === "high"
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
        setMessage("Created fix task in backlog for review")
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
        Create fix task
      </button>
      <button
        onClick={() => void createFixTask(true)}
        disabled={busy}
        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/15 disabled:opacity-50"
      >
        Create + activate
      </button>
      <p className="text-xs text-zinc-500">{message || "Turns the top risk into a backlog task with AI enrichment."}</p>
    </div>
  )
}
