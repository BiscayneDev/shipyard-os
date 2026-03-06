import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface CronJob {
  id: string
  name: string
  schedule: string
  lastRun: string | null
  status: "active" | "disabled" | "unknown"
  enabled: boolean
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json([])
  }

  try {
    const { stdout } = await execFileAsync("/opt/homebrew/bin/openclaw", ["cron", "list", "--json"], {
      timeout: 8000,
    })

    interface RawCron {
      id?: string
      name?: string
      schedule?: string
      lastRun?: string | null
      last_run?: string | null
      status?: string
      enabled?: boolean
    }

    const raw = JSON.parse(stdout) as RawCron[]
    const crons: CronJob[] = Array.isArray(raw)
      ? raw.map((c) => ({
          id: c.id ?? String(Math.random()),
          name: c.name ?? "Unnamed",
          schedule: c.schedule ?? "—",
          lastRun: c.lastRun ?? c.last_run ?? null,
          status: (c.status === "active" || c.status === "disabled") ? c.status : "unknown",
          enabled: c.enabled ?? c.status === "active",
        }))
      : []

    return NextResponse.json(crons)
  } catch {
    return NextResponse.json([])
  }
}
