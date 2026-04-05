import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { appendEvent, ensureTaskConversation, updateConversation, listAllEvents } from "@/lib/conversations"

export interface ActivityEntry {
  id: string
  taskId: string
  taskTitle: string
  agent: string
  action: "started" | "completed" | "reviewed"
  summary?: string
  timestamp: string
}

const MAX_ACTIVITY_ENTRIES = 10_000
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const DATA_PATH = join(process.cwd(), "data", "activity.json")

async function readActivity(): Promise<ActivityEntry[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw) as ActivityEntry[]
  } catch {
    return []
  }
}

async function writeActivity(entries: ActivityEntry[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(entries, null, 2), "utf-8")
}

function toActionType(action: ActivityEntry["action"]): "activity.started" | "activity.completed" | "activity.reviewed" {
  if (action === "completed") return "activity.completed"
  if (action === "reviewed") return "activity.reviewed"
  return "activity.started"
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const canonical = url.searchParams.get("canonical")
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
      : DEFAULT_LIMIT

    if (canonical === "1") {
      const events = await listAllEvents(limit * 4)
      const entries = events
        .filter((event) => event.type.startsWith("activity."))
        .slice(0, limit)
        .map((event) => {
          const action = event.type === "activity.completed"
            ? "completed"
            : event.type === "activity.reviewed"
              ? "reviewed"
              : "started"
          const data = event.data ?? {}
          return {
            id: event.id,
            taskId: typeof data.taskId === "string" ? data.taskId : "",
            taskTitle: typeof data.taskTitle === "string" ? data.taskTitle : event.summary,
            agent: event.agent ?? (typeof data.agent === "string" ? data.agent : "unknown"),
            action,
            summary: typeof data.summary === "string" ? data.summary : event.summary,
            timestamp: event.timestamp,
          } satisfies ActivityEntry
        })
      return NextResponse.json(entries)
    }

    const entries = await readActivity()
    const sorted = entries
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, limit)
    return NextResponse.json(sorted)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<ActivityEntry, "id" | "timestamp"> & {
      id?: string
      timestamp?: string
    }

    const entry: ActivityEntry = {
      id: body.id ?? randomUUID(),
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      agent: body.agent,
      action: body.action,
      summary: body.summary,
      timestamp: body.timestamp ?? new Date().toISOString(),
    }

    const existing = await readActivity()
    existing.push(entry)
    const trimmed = existing
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, MAX_ACTIVITY_ENTRIES)
    await writeActivity(trimmed)

    if (entry.taskId && entry.taskTitle) {
      const conversation = await ensureTaskConversation({
        taskId: entry.taskId,
        title: entry.taskTitle,
        agent: entry.agent,
      })
      await appendEvent(conversation.id, {
        type: toActionType(entry.action),
        agent: entry.agent,
        timestamp: entry.timestamp,
        summary: `${entry.agent} ${entry.action} ${entry.taskTitle}`,
        data: {
          taskId: entry.taskId,
          taskTitle: entry.taskTitle,
          summary: entry.summary,
          agent: entry.agent,
        },
      })
      if (entry.action === "completed") {
        await updateConversation(conversation.id, { status: "completed" })
      }
    }

    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to append activity" }, { status: 400 })
  }
}
