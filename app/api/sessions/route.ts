import { NextResponse } from "next/server"
import { runtime } from "@/lib/runtime"

export async function GET() {
  const sessions = await runtime.listSessions()
  return NextResponse.json({ sessions })
}
