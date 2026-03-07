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

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_ACTIVITY_ENTRIES = 10_000
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

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

// ── GET — newest first, with optional ?limit=N ──────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
      : DEFAULT_LIMIT

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

    // Keep max 10K entries on disk (up from 200)
    const trimmed = existing
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      .slice(0, MAX_ACTIVITY_ENTRIES)

    await writeActivity(trimmed)
    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to append activity" }, { status: 400 })
  }
}
