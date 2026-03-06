import { BIN } from "@/lib/config"
import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface CronJob {
  id: string
  name: string
  schedule: string
  tz: string
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: string | null
  lastError: string | null
  enabled: boolean
  consecutiveErrors: number
}

interface RawCronItem {
  id?: string
  name?: string
  enabled?: boolean
  schedule?: { kind?: string; expr?: string; tz?: string }
  state?: {
    lastRunAtMs?: number
    nextRunAtMs?: number
    lastStatus?: string
    lastError?: string
    consecutiveErrors?: number
  }
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json([])
  }

  try {
    const { stdout } = await execFileAsync(BIN.openclaw, ["cron", "list", "--json"], {
      timeout: 8000,
    })

    const raw = JSON.parse(stdout) as Record<string, unknown>
    // Flatten all values, keep only objects (skip numbers/strings/nulls)
    const items: RawCronItem[] = Object.values(raw)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v): v is RawCronItem => typeof v === "object" && v !== null && "id" in (v as object))

    const crons: CronJob[] = items.map((c) => ({
      id: c.id ?? String(Math.random()),
      name: c.name ?? "Unnamed",
      schedule: c.schedule?.expr ?? "—",
      tz: c.schedule?.tz ?? "UTC",
      lastRunAt: c.state?.lastRunAtMs ? new Date(c.state.lastRunAtMs).toISOString() : null,
      nextRunAt: c.state?.nextRunAtMs ? new Date(c.state.nextRunAtMs).toISOString() : null,
      lastStatus: c.state?.lastStatus ?? null,
      lastError: c.state?.lastError ?? null,
      enabled: c.enabled ?? true,
      consecutiveErrors: c.state?.consecutiveErrors ?? 0,
    }))

    return NextResponse.json(crons)
  } catch {
    return NextResponse.json([])
  }
}
