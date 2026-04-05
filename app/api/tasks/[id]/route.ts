import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { notificationEmitter, addRecentNotification } from "@/lib/notificationEmitter"
import type { NotificationPayload } from "@/lib/notificationEmitter"
import type { Task, Column } from "@/lib/tasks"

const DATA_PATH = join(process.cwd(), "data", "tasks.json")
const GOALS_PATH = join(process.cwd(), "data", "goals.json")

// ── Goal type (local) ────────────────────────────────────────────────────────

interface GoalData {
  id: string
  title: string
  description?: string
  status: "active" | "completed" | "paused"
  priority: "high" | "medium" | "low"
  assignedTo?: string
  createdAt?: string
  taskIds: string[]
}

// ── Storage helpers ──────────────────────────────────────────────────────────

async function readTasksFromFile(): Promise<Task[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeTasksToFile(tasks: Task[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(tasks, null, 2), "utf-8")
}

async function readTasks(): Promise<Task[]> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      const tasks = await kv.get<Task[]>("tasks")
      return tasks ?? []
    } catch {
      // Fall through to file
    }
  }
  return readTasksFromFile()
}

async function writeTasks(tasks: Task[]): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      await kv.set("tasks", tasks)
      return
    } catch {
      // Fall through to file
    }
  }
  await writeTasksToFile(tasks)
}

async function readGoals(): Promise<GoalData[]> {
  try {
    const raw = await readFile(GOALS_PATH, "utf-8")
    const goals = JSON.parse(raw) as GoalData[]
    // Ensure taskIds exists on all goals
    return goals.map((g) => ({ ...g, taskIds: g.taskIds ?? [] }))
  } catch {
    return []
  }
}

async function writeGoals(goals: GoalData[]): Promise<void> {
  await writeFile(GOALS_PATH, JSON.stringify(goals, null, 2), "utf-8")
}

// ── Goal linking helper ──────────────────────────────────────────────────────

async function updateGoalLinks(
  taskId: string,
  newGoalId: string | null | undefined,
  oldGoalId: string | null | undefined
): Promise<void> {
  // Only act if goalId actually changed
  if (newGoalId === oldGoalId) return
  if (newGoalId === undefined) return // not passed in request

  try {
    const goals = await readGoals()
    let changed = false

    for (const goal of goals) {
      // Remove from old goal
      if (oldGoalId && goal.id === oldGoalId) {
        const before = goal.taskIds.length
        goal.taskIds = goal.taskIds.filter((id) => id !== taskId)
        if (goal.taskIds.length !== before) changed = true
      }
      // Add to new goal
      if (newGoalId && goal.id === newGoalId) {
        if (!goal.taskIds.includes(taskId)) {
          goal.taskIds.push(taskId)
          changed = true
        }
      }
    }

    if (changed) {
      await writeGoals(goals)
    }
  } catch {
    // Non-fatal — don't fail the task update
  }
}

// ── Activity logging ─────────────────────────────────────────────────────────

type ActivityAction = "started" | "completed" | "reviewed"

const COLUMN_TO_ACTION: Partial<Record<Column, ActivityAction>> = {
  "in-progress": "started",
  "in-review": "reviewed",
  "done": "completed",
}

async function appendActivity(task: Task, action: ActivityAction): Promise<void> {
  try {
    const activityPath = join(process.cwd(), "data", "activity.json")
    let existing: Array<{
      id: string
      taskId: string
      taskTitle: string
      agent: string
      action: string
      summary?: string
      timestamp: string
    }> = []
    try {
      const raw = await readFile(activityPath, "utf-8")
      existing = JSON.parse(raw)
    } catch {
      // start fresh
    }

    existing.push({
      id: randomUUID(),
      taskId: task.id,
      taskTitle: task.title,
      agent: task.assignee ?? "unassigned",
      action,
      timestamp: new Date().toISOString(),
    })

    // Keep max 200
    const trimmed = existing
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, 200)

    await writeFile(activityPath, JSON.stringify(trimmed, null, 2), "utf-8")
  } catch {
    // Non-fatal — don't fail the task update
  }
}

async function emitTaskNotification(task: Task, action: ActivityAction): Promise<void> {
  const payload: NotificationPayload = {
    id: randomUUID(),
    agent: task.assignee || "unassigned",
    message:
      action === "completed"
        ? `${task.assignee || "An agent"} completed ${task.title}`
        : action === "reviewed"
        ? `${task.assignee || "An agent"} moved ${task.title} to review`
        : `${task.assignee || "An agent"} started working on ${task.title}`,
    type: action === "completed" ? "finish" : action === "reviewed" ? "info" : "start",
    timestamp: Date.now(),
  }

  addRecentNotification(payload)
  notificationEmitter.emit("notification", payload)
}

// ── Route handlers ───────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const tasks = await readTasks()

    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const oldTask = tasks[index]

    // Handle goalId: null means "clear", string means "set", undefined means "not passed"
    const hasGoalId = "goalId" in body
    const newGoalId = hasGoalId
      ? (body.goalId as string | null)
      : undefined

    // Build updated task — strip null goalId (remove field) or set it
    const updatedTask: Task = {
      ...oldTask,
      ...body,
      id: oldTask.id,
      createdAt: oldTask.createdAt,
      updatedAt: new Date().toISOString(),
    }

    // Normalize goalId
    if (hasGoalId) {
      if (newGoalId === null || newGoalId === "") {
        delete updatedTask.goalId
      } else {
        updatedTask.goalId = newGoalId ?? undefined
      }
    }

    // Type-guard column
    const validColumns: Column[] = ["backlog", "planning", "in-progress", "in-review", "done"]
    if (body.column && !validColumns.includes(body.column as Column)) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 })
    }

    const updated = tasks.map((t, i) => (i === index ? updatedTask : t))
    await writeTasks(updated)

    // Update goal links if goalId was passed
    if (hasGoalId) {
      await updateGoalLinks(id, newGoalId, oldTask.goalId ?? null)
    }

    // Log to activity feed when column changes to a tracked state
    if (body.column && body.column !== oldTask.column) {
      const action = COLUMN_TO_ACTION[body.column as Column]
      if (action) {
        await appendActivity(updatedTask, action)
        await emitTaskNotification(updatedTask, action)
      }
    }

    return NextResponse.json(updatedTask)
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasks()

    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Remove task from any goal's taskIds
    const taskToDelete = tasks[index]
    if (taskToDelete.goalId) {
      await updateGoalLinks(id, null, taskToDelete.goalId)
    }

    const updated = tasks.filter((t) => t.id !== id)
    await writeTasks(updated)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 400 })
  }
}
