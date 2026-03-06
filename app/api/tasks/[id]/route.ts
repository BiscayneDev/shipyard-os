import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import type { Task, Column } from "@/lib/tasks"

const DATA_PATH = join(process.cwd(), "data", "tasks.json")

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

// ── Route handlers ───────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tasks = await readTasks()

    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Support moving to any column via body.column
    const updatedTask: Task = {
      ...tasks[index],
      ...body,
      id: tasks[index].id,
      createdAt: tasks[index].createdAt,
      updatedAt: new Date().toISOString(),
    }

    // Type-guard column
    const validColumns: Column[] = ["backlog", "in-progress", "in-review", "done"]
    if (body.column && !validColumns.includes(body.column as Column)) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 })
    }

    const updated = tasks.map((t, i) => (i === index ? updatedTask : t))
    await writeTasks(updated)

    // Log to activity feed when column changes to a tracked state
    if (body.column && body.column !== tasks[index].column) {
      const action = COLUMN_TO_ACTION[body.column as Column]
      if (action) {
        await appendActivity(updatedTask, action)
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

    const updated = tasks.filter((t) => t.id !== id)
    await writeTasks(updated)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 400 })
  }
}
