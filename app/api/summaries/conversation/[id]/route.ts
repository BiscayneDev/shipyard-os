import { NextResponse } from "next/server"
import { getConversation } from "@/lib/conversations"
import { summarizeConversation } from "@/lib/summaries"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params
  const conversation = await getConversation(id)

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  return NextResponse.json({
    summary: summarizeConversation({
      id: conversation.id,
      title: conversation.title,
      agent: conversation.agent,
      status: conversation.status,
      latestPreview: conversation.latestPreview,
      messages: conversation.messages,
      runs: conversation.runs,
      events: conversation.events,
    }),
  })
}
