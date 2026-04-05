"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  projectName: string
  taskTitle: string
  taskDescription: string
  taskPriority?: "high" | "medium" | "low"
  taskAssignee?: string
}

export function ProjectActions({ projectName, taskTitle, taskDescription, taskPriority = "medium", taskAssignee = "unassigned" }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function createFixTask() {
    setBusy(true)
    setMessage("")
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          column: "backlog",
          priority: taskPriority,
          assignee: taskAssignee,
          tags: [projectName, "risk", "war-room"],
        }),
      })
      if (!res.ok) throw new Error("Failed to create task")
      setMessage("Created fix task in backlog")
      router.push("/tasks")
      router.refresh()
    } catch {
      setMessage("Could not create fix task")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => void createFixTask()}
        disabled={busy}
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
      >
        Create fix task
      </button>
      <p className="text-xs text-zinc-500">{message || "Turns the top risk into a backlog task with AI enrichment."}</p>
    </div>
  )
}
