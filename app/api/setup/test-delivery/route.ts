import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { channel, target } = body as {
      channel: string
      target: string
    }

    if (!channel || !target) {
      return NextResponse.json({ ok: false, error: "Channel and target are required" })
    }

    const openclaw = "/opt/homebrew/bin/openclaw"
    const testMessage = "👋 Shipyard OS setup — connection test successful!"

    try {
      await execFileAsync(
        openclaw,
        [
          "message",
          "send",
          "--channel",
          channel.toLowerCase(),
          "--target",
          target,
          "--message",
          testMessage,
        ],
        { timeout: 10000 }
      )
      return NextResponse.json({ ok: true })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to send message"
      return NextResponse.json({ ok: false, error: errMsg })
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }
}
