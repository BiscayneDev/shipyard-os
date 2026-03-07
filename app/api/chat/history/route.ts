import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"

const HISTORY_PATH = join(process.cwd(), "data", "chat-history.json")

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  agent: string
  timestamp: number
}

async function readHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await readFile(HISTORY_PATH, "utf-8")
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeHistory(messages: ChatMessage[]): Promise<void> {
  await mkdir(dirname(HISTORY_PATH), { recursive: true })
  // Keep only last 200 messages to prevent file bloat
  const trimmed = messages.slice(-200)
  await writeFile(HISTORY_PATH, JSON.stringify(trimmed, null, 2), "utf-8")
}

// GET — load chat history
export async function GET() {
  const messages = await readHistory()
  return NextResponse.json(messages)
}

// POST — append messages
export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages: ChatMessage[] }
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 })
    }

    const existing = await readHistory()
    const existingIds = new Set(existing.map((m) => m.id))
    const newMessages = body.messages.filter((m) => !existingIds.has(m.id))

    if (newMessages.length > 0) {
      await writeHistory([...existing, ...newMessages])
    }

    return NextResponse.json({ ok: true, count: existing.length + newMessages.length })
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

// DELETE — clear history
export async function DELETE() {
  try {
    await writeHistory([])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 })
  }
}
