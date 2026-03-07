import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { runtime } from "@/lib/runtime"
import { MC_URL } from "@/lib/config"
import { isDue, calculateNextRun, type AgentSchedule } from "@/lib/schedules"

const DATA_PATH = join(process.cwd(), "data", "schedules.json")

async function readSchedules(): Promise<AgentSchedule[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw) as AgentSchedule[]
  } catch {
    return []
  }
}

async function writeSchedules(schedules: AgentSchedule[]): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(schedules, null, 2), "utf-8")
}

/**
 * POST /api/schedules/tick
 *
 * Check all schedules and execute any that are due.
 * Call this endpoint on a timer (e.g., every 5 minutes from the frontend,
 * or via an external cron job).
 */
export async function POST(request: Request) {
  const schedules = await readSchedules()
  const results: Array<{ id: string; name: string; status: "executed" | "skipped" | "error"; error?: string }> = []

  let changed = false

  for (const schedule of schedules) {
    if (!isDue(schedule)) {
      results.push({ id: schedule.id, name: schedule.name, status: "skipped" })
      continue
    }

    try {
      // Build the activation message
      const message = [
        `🕐 [SCHEDULED TASK]`,
        ``,
        `Schedule: ${schedule.name}`,
        `Agent: ${schedule.agent}`,
        `Frequency: ${schedule.frequency}`,
        ``,
        schedule.prompt,
        ``,
        `When done, log activity:`,
        `curl -s -X POST ${MC_URL}/api/activity -H "Content-Type: application/json" -d '{"taskId":"schedule-${schedule.id}","taskTitle":"${schedule.name}","agent":"${schedule.agent}","action":"completed","summary":"Scheduled run completed"}'`,
      ].join("\n")

      // Execute via runtime
      await runtime.activate({
        taskId: `schedule-${schedule.id}`,
        title: schedule.name,
        description: schedule.prompt,
        assignee: schedule.agent,
        priority: "medium",
        callbackUrl: MC_URL,
        message,
      } as Parameters<typeof runtime.activate>[0] & { message: string })

      // Log inter-agent message
      try {
        const origin = new URL(request.url).origin
        await fetch(`${origin}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "system",
            to: schedule.agent,
            content: `Scheduled task "${schedule.name}" triggered.\n\n${schedule.prompt}`,
            type: "delegation",
          }),
        }).catch(() => null)
      } catch { /* non-fatal */ }

      schedule.lastRunAt = new Date().toISOString()
      schedule.lastStatus = "success"
      schedule.lastError = null
      schedule.nextRunAt = calculateNextRun(schedule).toISOString()
      changed = true

      results.push({ id: schedule.id, name: schedule.name, status: "executed" })
    } catch (err) {
      schedule.lastStatus = "error"
      schedule.lastError = err instanceof Error ? err.message : "Unknown error"
      schedule.nextRunAt = calculateNextRun(schedule).toISOString()
      changed = true

      results.push({ id: schedule.id, name: schedule.name, status: "error", error: schedule.lastError ?? undefined })
    }
  }

  if (changed) {
    await writeSchedules(schedules)
  }

  const executed = results.filter((r) => r.status === "executed").length
  return NextResponse.json({ executed, total: schedules.length, results })
}
