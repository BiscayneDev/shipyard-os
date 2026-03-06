import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string
  taskId: string
  taskTitle: string
  agent: string
  action: "started" | "completed" | "reviewed"
  summary?: string
  timestamp: string
}

// ── Storage ──────────────────────────────────────────────────────────────────

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

// ── GET — last 50 entries, newest first ─────────────────────────────────────

export async function GET() {
  try {
    const entries = await readActivity()
    const sorted = entries
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, 50)
    return NextResponse.json(sorted)
  } catch {
    return NextResponse.json([])
  }
}

// ── POST — append a new entry ────────────────────────────────────────────────

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

    // Keep max 200 entries on disk
    const trimmed = existing
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, 200)

    await writeActivity(trimmed)
    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to append activity" }, { status: 400 })
  }
}
