import { NextResponse } from "next/server"
import { runtime } from "@/lib/runtime"

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message: string; sessionId?: string }
    const { message, sessionId } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const reply = await runtime.chat({ message, sessionId })
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
