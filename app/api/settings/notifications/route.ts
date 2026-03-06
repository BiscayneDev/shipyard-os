import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"

const SETTINGS_PATH = join(process.cwd(), "data", "settings.json")

export interface NotificationSettings {
  taskActivationAlerts: boolean
  agentCompletionToasts: boolean
  scoutSignalAlerts: boolean
  dealFlowDigest: boolean
  baronDailyReport: boolean
}

const DEFAULTS: NotificationSettings = {
  taskActivationAlerts: true,
  agentCompletionToasts: true,
  scoutSignalAlerts: true,
  dealFlowDigest: false,
  baronDailyReport: false,
}

async function readSettings(): Promise<NotificationSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8")
    const parsed = JSON.parse(raw) as { notifications?: NotificationSettings }
    return { ...DEFAULTS, ...(parsed.notifications ?? {}) }
  } catch {
    return DEFAULTS
  }
}

async function writeSettings(notifications: NotificationSettings): Promise<void> {
  let existing: Record<string, unknown> = {}
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8")
    existing = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // First write
  }
  const updated = { ...existing, notifications }
  await mkdir(join(process.cwd(), "data"), { recursive: true })
  await writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 2), "utf-8")
}

export async function GET() {
  const settings = await readSettings()
  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<NotificationSettings>
    const current = await readSettings()
    const updated: NotificationSettings = { ...current, ...body }
    await writeSettings(updated)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 400 })
  }
}
