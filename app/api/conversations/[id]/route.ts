import { NextResponse } from "next/server"
import { deleteConversation, getConversation, updateConversation } from "@/lib/conversations"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params
  const conversation = await getConversation(id)
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }
  return NextResponse.json(conversation)
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as {
      title?: string
      status?: "active" | "completed" | "failed" | "paused"
      agent?: string
      project?: string
      taskId?: string
    }
    const updated = await updateConversation(id, body)
    if (!updated) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 400 })
  }
}

export async function DELETE(_: Request, context: Context) {
  const { id } = await context.params
  const deleted = await deleteConversation(id)
  if (!deleted) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
