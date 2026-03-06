import { NextResponse } from "next/server"
import { GATEWAY_URL, GATEWAY_TOKEN } from "@/lib/config"

interface Session { key: string; model?: string; [key: string]: unknown }

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) return NextResponse.json({ sessions: [] })
  if (!GATEWAY_TOKEN) return NextResponse.json({ sessions: [] })
  try {
    const res = await fetch(`${GATEWAY_URL}/api/sessions`, {
      headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ sessions: [] })
    const data: unknown = await res.json()
    if (Array.isArray(data)) return NextResponse.json({ sessions: data as Session[] })
    if (data && typeof data === "object" && "sessions" in data) return NextResponse.json(data)
    return NextResponse.json({ sessions: [] })
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}
