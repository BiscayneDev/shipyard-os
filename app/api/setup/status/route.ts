import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

const SETUP_PATH = join(process.cwd(), "data", "setup.json")

interface SetupData {
  completed: boolean
  userName?: string
  assistantName?: string
  gatewayUrl?: string
  deliveryTarget?: string
  deliveryChannel?: string
  workspace?: string
  completedAt?: string
}

export async function GET() {
  try {
    const raw = await readFile(SETUP_PATH, "utf-8")
    const data = JSON.parse(raw) as SetupData
    return NextResponse.json({
      completed: data.completed ?? false,
      userName: data.userName,
      assistantName: data.assistantName,
    })
  } catch {
    return NextResponse.json({ completed: false })
  }
}
