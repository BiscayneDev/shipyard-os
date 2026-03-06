import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

import { GATEWAY_URL, GATEWAY_TOKEN, BIN } from "@/lib/config"
const GATEWAY_TURN_URL = `${GATEWAY_URL}/api/agent/turn`

interface GatewayResponse {
  reply?: string
  response?: string
  text?: string
  content?: string
  message?: string
}

async function callGateway(message: string): Promise<string | null> {
  try {
    const res = await fetch(GATEWAY_TURN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ message, sessionKey: "agent:main:main" }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null

    const data = await res.json() as GatewayResponse
    return data.reply ?? data.response ?? data.text ?? data.content ?? data.message ?? null
  } catch {
    return null
  }
}

async function callCLI(message: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "/opt/homebrew/bin/openclaw",
      ["agent", "--message", message, "--session-id", "agent:main:main", "--json"],
      { timeout: 30000 }
    )

    interface CLIResponse { reply?: string; response?: string; text?: string; content?: string; output?: string }
    const parsed = JSON.parse(stdout) as CLIResponse
    return parsed.reply ?? parsed.response ?? parsed.text ?? parsed.content ?? parsed.output ?? stdout.trim()
  } catch {
    return "Unable to reach OpenClaw. Make sure the gateway is running locally."
  }
}

export async function POST(request: Request) {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ reply: "Chat requires a local OpenClaw instance." })
  }

  try {
    const body = await request.json() as { message: string; sessionId?: string }
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Try gateway first, fall back to CLI
    const gatewayReply = await callGateway(message)
    const reply = gatewayReply ?? (await callCLI(message))

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
