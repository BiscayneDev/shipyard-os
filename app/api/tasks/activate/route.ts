import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { BIN, AGENT_DELIVERY_TARGET, AGENT_DELIVERY_CHANNEL, MC_URL } from "@/lib/config"

const execFileAsync = promisify(execFile)

interface BudgetCheckResult {
  allowed: boolean
  agentName?: string
  spentUsd: number
  budgetUsd: number
  percentUsed: number
  warning: string | null
}

export async function POST(request: Request) {
  try {
    const { taskId, title, description, assignee, priority } = await request.json()
    if (!taskId || !title) return NextResponse.json({ error: "taskId and title required" }, { status: 400 })

    // ── Budget enforcement ──────────────────────────────────────────
    if (assignee && assignee !== "unassigned") {
      try {
        const origin = new URL(request.url).origin
        const budgetRes = await fetch(`${origin}/api/company/budgets/check?agent=${encodeURIComponent(assignee)}`)
        const budget = (await budgetRes.json()) as BudgetCheckResult

        if (!budget.allowed) {
          return NextResponse.json(
            {
              error: "Budget exceeded",
              agent: budget.agentName ?? assignee,
              spentUsd: budget.spentUsd,
              budgetUsd: budget.budgetUsd,
              percentUsed: budget.percentUsed,
            },
            { status: 403 }
          )
        }

        // ── Proceed with activation (include warning if approaching limit) ──
        const agentMap: Record<string, string> = {
          builder: "⚡ Builder", scout: "🔭 Scout", "deal-flow": "🤝 Deal Flow",
          baron: "🏦 Baron", vic: "🦞 Vic", unassigned: "unassigned",
        }

        const message = [
          `🎯 [TASK ACTIVATED]`, ``,
          `Title: ${title}`,
          description ? `Notes: ${description}` : `Notes: (none)`,
          `Priority: ${priority || "medium"}`,
          `Suggested agent: ${agentMap[assignee] || "unassigned"}`,
          `Task ID: ${taskId}`, ``,
          `As Chief of Staff:`,
          `1. Enrich this into a proper brief`,
          `2. Delegate to the right agent (pass them the Task ID: ${taskId})`,
          `3. Agent must call these when done:`,
          `   curl -s -X PATCH ${MC_URL}/api/tasks/${taskId} -H "Content-Type: application/json" -d '{"column":"done","description":"✅ summary"}'`,
          `   curl -s -X POST ${MC_URL}/api/notify -H "Content-Type: application/json" -d '{"agent":"[name]","message":"✅ Done: ${title}","type":"finish"}'`,
          `   curl -s -X POST ${MC_URL}/api/activity -H "Content-Type: application/json" -d '{"taskId":"${taskId}","taskTitle":"${title}","agent":"[name]","action":"completed","summary":"..."}'`,
          ``, `Do not ask for clarification — act now.`,
        ].join("\n")

        execFileAsync(BIN.openclaw, ["agent", "--to", AGENT_DELIVERY_TARGET, "--message", message], {
          timeout: 30000,
          env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
        }).catch(() => null)

        return NextResponse.json({
          ok: true,
          ...(budget.warning ? { warning: budget.warning, percentUsed: budget.percentUsed } : {}),
        })
      } catch {
        // Budget check failed — fail open, still activate
      }
    }

    // Fallback: activate without budget check (unassigned or check failed)
    const agentMap: Record<string, string> = {
      builder: "⚡ Builder", scout: "🔭 Scout", "deal-flow": "🤝 Deal Flow",
      baron: "🏦 Baron", vic: "🦞 Vic", unassigned: "unassigned",
    }

    const message = [
      `🎯 [TASK ACTIVATED]`, ``,
      `Title: ${title}`,
      description ? `Notes: ${description}` : `Notes: (none)`,
      `Priority: ${priority || "medium"}`,
      `Suggested agent: ${agentMap[assignee] || "unassigned"}`,
      `Task ID: ${taskId}`, ``,
      `As Chief of Staff:`,
      `1. Enrich this into a proper brief`,
      `2. Delegate to the right agent (pass them the Task ID: ${taskId})`,
      `3. Agent must call these when done:`,
      `   curl -s -X PATCH ${MC_URL}/api/tasks/${taskId} -H "Content-Type: application/json" -d '{"column":"done","description":"✅ summary"}'`,
      `   curl -s -X POST ${MC_URL}/api/notify -H "Content-Type: application/json" -d '{"agent":"[name]","message":"✅ Done: ${title}","type":"finish"}'`,
      `   curl -s -X POST ${MC_URL}/api/activity -H "Content-Type: application/json" -d '{"taskId":"${taskId}","taskTitle":"${title}","agent":"[name]","action":"completed","summary":"..."}'`,
      ``, `Do not ask for clarification — act now.`,
    ].join("\n")

    execFileAsync(BIN.openclaw, ["agent", "--to", AGENT_DELIVERY_TARGET, "--message", message], {
      timeout: 30000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to activate task" }, { status: 500 })
  }
}
