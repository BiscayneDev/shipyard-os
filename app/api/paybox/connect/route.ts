import { NextResponse } from "next/server"
import { startConnect, CONNECT_STATE_COOKIE, CONNECT_VERIFIER_COOKIE, CONNECT_CLIENT_COOKIE } from "@/lib/paybox-connect"

/**
 * Start the in-app Connect Paybox flow: registers an OAuth client with this
 * deployment's callback URI, then redirects the browser to Paybox for passkey
 * approval. Verifier/state/client_id ride in short-lived httpOnly cookies.
 */
export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin
    const start = await startConnect(origin)
    const res = NextResponse.redirect(start.authorizeUrl)
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 600, // 10 minutes to complete approval
      path: "/",
    }
    res.cookies.set(CONNECT_STATE_COOKIE, start.state, cookieOptions)
    res.cookies.set(CONNECT_VERIFIER_COOKIE, start.verifier, cookieOptions)
    res.cookies.set(CONNECT_CLIENT_COOKIE, start.clientId, cookieOptions)
    return res
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Paybox connect"
    return NextResponse.redirect(
      `/treasury?paybox=error&reason=${encodeURIComponent(message.slice(0, 180))}`,
    )
  }
}
