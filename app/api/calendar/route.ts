import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)
import { BIN, GOG_ACCOUNT } from "@/lib/config"
const GOG = BIN.gog

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string | null
  location: string | null
  allDay: boolean
}

interface RawEvent {
  id?: string
  summary?: string
  title?: string
  name?: string
  start?: string | { dateTime?: string; date?: string }
  end?: string | { dateTime?: string; date?: string }
  location?: string
}

function parseDateTime(val: string | { dateTime?: string; date?: string } | undefined): { iso: string; allDay: boolean } | null {
  if (!val) return null
  if (typeof val === "string") {
    return { iso: val, allDay: !val.includes("T") }
  }
  if (val.dateTime) return { iso: val.dateTime, allDay: false }
  if (val.date) return { iso: val.date, allDay: true }
  return null
}

function parseEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as Record<string, unknown>).items)) {
      raw = (raw as Record<string, unknown>).items
    } else if (raw && typeof raw === "object" && "events" in raw && Array.isArray((raw as Record<string, unknown>).events)) {
      raw = (raw as Record<string, unknown>).events
    } else {
      return []
    }
  }

  return (raw as RawEvent[])
    .map((item, idx): CalendarEvent | null => {
      const title = item.summary || item.title || item.name || "Untitled"
      const start = parseDateTime(item.start)
      if (!start) return null
      const end = parseDateTime(item.end)
      return {
        id: item.id ?? String(idx),
        title,
        start: start.iso,
        end: end?.iso ?? null,
        location: item.location ?? null,
        allDay: start.allDay,
      }
    })
    .filter((e): e is CalendarEvent => e !== null)
}

export async function GET() {
  // Gracefully degrade on Vercel (no local CLI)
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ events: [] })
  }

  // Try primary gog command
  const now = new Date().toISOString()
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const attempts = [
    [GOG, ["calendar", "events", "primary", "--from", now, "--to", in30days, "--json"]],
    [GOG, ["calendar", "events", GOG_ACCOUNT, "--from", now, "--to", in30days, "--json"]],
  ] as const

  for (const [cmd, args] of attempts) {
    try {
      const { stdout } = await execFileAsync(cmd, [...args], { timeout: 10000 })
      if (!stdout.trim()) continue
      const parsed = JSON.parse(stdout)
      const events = parseEvents(parsed)
      if (events.length > 0 || stdout.trim() === "[]") {
        return NextResponse.json({ events })
      }
    } catch {
      continue
    }
  }

  return NextResponse.json({ events: [] })
}
