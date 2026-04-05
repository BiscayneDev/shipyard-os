import { NextResponse } from "next/server"
import { createConversation, listConversations } from "@/lib/conversations"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("q") ?? undefined
  const conversations = await listConversations(query)
  return NextResponse.json(conversations)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string
      agent?: string
      project?: string
      taskId?: string
    }
    const conversation = await createConversation(body)
    return NextResponse.json(conversation, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 400 })
  }
}
