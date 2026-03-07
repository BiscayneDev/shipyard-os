import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { randomUUID } from "crypto"

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string
  from: string
  to: string
  content: string
  type: "delegation" | "report" | "question" | "alert" | "handoff"
  taskId?: string
  taskTitle?: string
  timestamp: string
  read: boolean
}

// ── Storage ──────────────────────────────────────────────────────────────────

const DATA_PATH = join(process.cwd(), "data", "messages.json")
const MAX_MESSAGES = 500

async function readMessages(): Promise<AgentMessage[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw) as AgentMessage[]
  } catch {
    return []
  }
}

async function writeMessages(msgs: AgentMessage[]): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true })
  const trimmed = msgs
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .slice(0, MAX_MESSAGES)
  await writeFile(DATA_PATH, JSON.stringify(trimmed, null, 2), "utf-8")
}

// ── GET — list messages with optional filters ─────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url)
  const agent = url.searchParams.get("agent")
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200) : 50

  let messages = await readMessages()

  // Filter by agent (either from or to)
  if (agent) {
    messages = messages.filter((m) => m.from === agent || m.to === agent)
  }

  const sorted = messages
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .slice(0, limit)

  return NextResponse.json(sorted)
}

// ── POST — send an inter-agent message ────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<AgentMessage>

    if (!body.from || !body.to || !body.content) {
      return NextResponse.json(
        { error: "from, to, and content are required" },
        { status: 400 }
      )
    }

    const msg: AgentMessage = {
      id: body.id ?? randomUUID(),
      from: body.from,
      to: body.to,
      content: body.content,
      type: body.type ?? "report",
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      timestamp: body.timestamp ?? new Date().toISOString(),
      read: false,
    }

    const existing = await readMessages()
    existing.push(msg)
    await writeMessages(existing)

    return NextResponse.json(msg, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
