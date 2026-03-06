import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"

const SETUP_PATH = join(process.cwd(), "data", "setup.json")

interface SetupPayload {
  userName?: string
  assistantName?: string
  gatewayUrl?: string
  gatewayToken?: string
  deliveryTarget?: string
  deliveryChannel?: string
  workspace?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SetupPayload

    const data = {
      completed: true,
      userName: body.userName || "",
      assistantName: body.assistantName || "Vic",
      gatewayUrl: body.gatewayUrl || "",
      gatewayToken: body.gatewayToken || "",
      deliveryTarget: body.deliveryTarget || "",
      deliveryChannel: body.deliveryChannel || "telegram",
      workspace: body.workspace || "~/clawd",
      completedAt: new Date().toISOString(),
    }

    await mkdir(dirname(SETUP_PATH), { recursive: true })
    await writeFile(SETUP_PATH, JSON.stringify(data, null, 2), "utf-8")

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save config"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
