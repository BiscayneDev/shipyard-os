import { BIN } from "@/lib/config"
import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 503 })
  }

  try {
    const { id } = await params
    const body = await request.json() as { enabled: boolean }

    const subcommand = body.enabled ? "enable" : "disable"
    await execFileAsync(BIN.openclaw, ["cron", subcommand, id], {
      timeout: 8000,
    })

    return NextResponse.json({ success: true, id, enabled: body.enabled })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
