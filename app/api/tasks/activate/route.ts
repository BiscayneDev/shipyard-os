import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)
const OPENCLAW = "/opt/homebrew/bin/openclaw"
const MC_URL = "https://mission-control-two-ebon.vercel.app"

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
      unassigned: "unassigned",
    }
    const agentName = agentMap[assignee] || "unassigned"

    const message = [
      `🎯 [TASK ACTIVATED — ACTION REQUIRED]`,
      ``,
      `Title: ${title}`,
      description ? `Notes: ${description}` : `Notes: (none)`,
      `Priority: ${priority || "medium"}`,
      `Suggested agent: ${agentName}`,
      `Task ID: ${taskId}`,
      ``,
      `As Chief of Staff:`,
      `1. Enrich this into a proper brief`,
      `2. Delegate to the right agent (pass them the Task ID: ${taskId})`,
      `3. Agent must call these when done:`,
      `   curl -s -X PATCH ${MC_URL}/api/tasks/${taskId} -H "Content-Type: application/json" -d '{"column":"done","description":"✅ summary"}'`,
      `   curl -s -X POST ${MC_URL}/api/notify -H "Content-Type: application/json" -d '{"agent":"[name]","message":"✅ Done: ${title}","type":"finish"}'`,
      `   curl -s -X POST ${MC_URL}/api/activity -H "Content-Type: application/json" -d '{"taskId":"${taskId}","taskTitle":"${title}","agent":"[name]","action":"completed","summary":"..."}'`,
      ``,
      `Do not ask for clarification — act now.`,
    ].filter(Boolean).join("\n")

    execFileAsync(OPENCLAW, [
      "message", "send",
      "--channel", "telegram",
      "--target", "264452755",
      "--message", message,
    ], {
      timeout: 15000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to activate task" }, { status: 500 })
  }
}
