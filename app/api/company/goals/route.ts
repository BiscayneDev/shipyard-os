import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import type { Task } from "@/lib/tasks"

export interface Goal {
  id: string
  title: string
  description?: string
  status: "active" | "completed" | "paused"
  priority: "high" | "medium" | "low"
  assignedTo?: string
  createdAt?: string
  taskIds: string[]
}

export interface GoalWithProgress extends Goal {
  progress: {
    total: number
    done: number
    percent: number
  }
}

const DATA_PATH = path.join(process.cwd(), "data", "goals.json")
const TASKS_PATH = path.join(process.cwd(), "data", "tasks.json")

async function readGoals(): Promise<Goal[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    const goals = JSON.parse(raw) as Goal[]
    // Ensure taskIds exists on all goals
    return goals.map((g) => ({ ...g, taskIds: g.taskIds ?? [] }))
  } catch {
    return []
  }
}

async function readTasks(): Promise<Task[]> {
  // Try KV first
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      const tasks = await kv.get<Task[]>("tasks")
      return tasks ?? []
    } catch {
      // Fall through to file
    }
  }
  try {
    const raw = await readFile(TASKS_PATH, "utf-8")
    return JSON.parse(raw) as Task[]
  } catch {
    return []
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(goals, null, 2), "utf-8")
}

function computeProgress(goal: Goal, tasks: Task[]): GoalWithProgress["progress"] {
  const linkedTasks = tasks.filter((t) => goal.taskIds.includes(t.id))
  const total = linkedTasks.length
  const done = linkedTasks.filter((t) => t.column === "done").length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

export async function GET() {
  const [goals, tasks] = await Promise.all([readGoals(), readTasks()])

  const goalsWithProgress: GoalWithProgress[] = goals.map((goal) => ({
    ...goal,
    progress: computeProgress(goal, tasks),
  }))

  return NextResponse.json(goalsWithProgress)
}

export async function POST(request: Request) {
  const body = await request.json() as {
    title: string
    description?: string
    status?: "active" | "completed" | "paused"
    priority?: "high" | "medium" | "low"
    assignedTo?: string
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const goal: Goal = {
    id: `goal-${randomUUID().slice(0, 8)}`,
    title: body.title,
    description: body.description,
    status: body.status ?? "active",
    priority: body.priority ?? "medium",
    assignedTo: body.assignedTo,
    createdAt: new Date().toISOString(),
    taskIds: [],
  }

  const goals = await readGoals()
  goals.push(goal)
  await writeGoals(goals)

  const tasks = await readTasks()
  const goalWithProgress: GoalWithProgress = {
    ...goal,
    progress: computeProgress(goal, tasks),
  }

  return NextResponse.json(goalWithProgress, { status: 201 })
}
