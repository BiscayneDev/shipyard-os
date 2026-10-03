import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import type { Task } from "@/lib/tasks"
import { quoteBriefTools } from "@/lib/brief-quote"
import { createJob, getJob } from "@/lib/buoy"

const DATA_PATH = join(process.cwd(), "data", "tasks.json")

async function readTasks(): Promise<Task[]> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      return (await kv.get<Task[]>("tasks")) ?? []
    } catch {
      // fall through to file
    }
  }
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf-8")) as Task[]
  } catch {
    return []
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      await kv.set("tasks", tasks)
    } catch {
      await writeFile(DATA_PATH, JSON.stringify(tasks, null, 2), "utf-8")
    }
    return
  }
  await writeFile(DATA_PATH, JSON.stringify(tasks, null, 2), "utf-8")
}

/**
 * POST /api/tasks/:id/quote
 *   { action: "refresh" }                      — re-derive the quoted plan from toolNeeds
 *   { action: "approve", rail: "shipusd"|"usdc" } — create the Buoy job from the quote
 *
 * The quote IS the approval UX: approving this card approves the whole plan once.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as {
      action?: "refresh" | "approve"
      rail?: "shipusd" | "usdc"
    }
    const tasks = await readTasks()
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    const task = tasks[index]

    if (body.action === "approve") {
      if (!task.quote) {
        return NextResponse.json({ error: "Task has no quote to approve" }, { status: 400 })
      }
      if (task.jobId && task.jobStatus === "pending") {
        const existing = await getJob(task.jobId)
        if (existing && existing.status === "pending") {
          return NextResponse.json({ task, job: existing }) // idempotent re-approve
        }
      }
      const rail = body.rail ?? "shipusd"
      const job = await createJob(
        {
          quoteId: task.quote.quoteId,
          totalUsd: task.quote.totalUsd,
          steps: task.quote.steps,
          createdAt: task.updatedAt,
          expiresAt: task.quote.expiresAt,
        },
        rail,
        task.id
      )
      if (!job) {
        return NextResponse.json({ error: "Buoy unavailable — job not created" }, { status: 502 })
      }
      const updated = tasks.map((t) =>
        t.id === id
          ? { ...t, jobId: job.jobId, jobStatus: job.status, updatedAt: new Date().toISOString() }
          : t
      )
      await writeTasks(updated)
      return NextResponse.json({ task: updated[index], job }, { status: 201 })
    }

    // action: "refresh" (default)
    const toolNeeds = task.toolNeeds ?? []
    if (toolNeeds.length === 0) {
      return NextResponse.json({ task, quote: null })
    }
    const tq = await quoteBriefTools(toolNeeds)
    const updated = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            quote: tq
              ? {
                  quoteId: tq.quote.quoteId,
                  totalUsd: tq.quote.totalUsd,
                  steps: tq.detail,
                  expiresAt: tq.quote.expiresAt,
                }
              : undefined,
            updatedAt: new Date().toISOString(),
          }
        : t
    )
    await writeTasks(updated)
    return NextResponse.json({ task: updated[index], quote: tq?.quote ?? null })
  } catch {
    return NextResponse.json({ error: "Failed to process quote" }, { status: 500 })
  }
}
