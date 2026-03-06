import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)
const OPENCLAW = "/opt/homebrew/bin/openclaw"

export async function POST(request: Request) {
  try {
    const { taskId, title, description, assignee, priority } = await request.json()

    if (!taskId || !title) {
      return NextResponse.json({ error: "taskId and title required" }, { status: 400 })
    }

    const agentMap: Record<string, string> = {
      builder: "⚡ Builder",
      scout: "🔭 Scout",
      "deal-flow": "🤝 Deal Flow",
      baron: "🏦 Baron",
      vic: "🦞 Vic",
      unassigned: "whoever is best suited",
    }
    const agentName = agentMap[assignee] || "whoever is best suited"

    const message = [
      `🎯 New task activated from Mission Control:`,
      ``,
      `**Task:** ${title}`,
      description ? `**Description:** ${description}` : null,
      `**Priority:** ${priority || "medium"}`,
      `**Assigned to:** ${agentName}`,
      `**Task ID:** ${taskId}`,
      ``,
      `Please action this task now. Delegate to ${agentName} if appropriate, or handle it yourself. Update the task board when done.`,
    ].filter(Boolean).join("\n")

    // Fire-and-forget — sends to Vic's main session
    execFileAsync(OPENCLAW, [
      "agent",
      "--message", message,
      "--deliver",
    ], {
      timeout: 30000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
    }).catch(() => {
      execFileAsync(OPENCLAW, [
        "agent",
        "--message", message,
      ], {
        timeout: 30000,
        env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
      }).catch(() => null)
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to activate task" }, { status: 500 })
  }
}
