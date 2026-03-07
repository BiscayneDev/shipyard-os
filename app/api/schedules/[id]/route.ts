import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { calculateNextRun, type AgentSchedule } from "@/lib/schedules"

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

// PATCH — update a schedule (toggle enabled, change config)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json() as Partial<AgentSchedule>
    const schedules = await readSchedules()
    const idx = schedules.findIndex((s) => s.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const updated = { ...schedules[idx], ...body }
    // Recalculate next run if frequency/hour/day changed
    if (body.frequency !== undefined || body.hour !== undefined || body.dayOfWeek !== undefined || body.enabled !== undefined) {
      updated.nextRunAt = calculateNextRun(updated).toISOString()
    }
    schedules[idx] = updated
    await writeSchedules(schedules)

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

// DELETE — remove a schedule
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const schedules = await readSchedules()
    const filtered = schedules.filter((s) => s.id !== id)
    if (filtered.length === schedules.length) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    await writeSchedules(filtered)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
