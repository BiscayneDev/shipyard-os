import { NextResponse } from "next/server"
import { clearConnection } from "@/lib/paybox"

/** Disconnect the in-app-connected Paybox account (env config is untouched). */
export async function POST() {
  try {
    await clearConnection()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
