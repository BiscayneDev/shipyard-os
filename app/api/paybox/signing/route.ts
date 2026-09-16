import { NextResponse } from "next/server"
import { setSigningKey, getSigningKey } from "@/lib/paybox"

/** Save a `pbxk1.` signing key from the UI (enables in-process wallet signing). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signingKey?: string }
    const key = body.signingKey?.trim() ?? ""
    if (key && !key.startsWith("pbxk1.")) {
      return NextResponse.json({ error: "Signing keys start with 'pbxk1.'" }, { status: 400 })
    }
    await setSigningKey(key)
    return NextResponse.json({ ok: true, hasSigningKey: key.length > 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save signing key"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ hasSigningKey: Boolean(await getSigningKey()) })
}
