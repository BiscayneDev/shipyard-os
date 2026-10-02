import { NextResponse } from "next/server"
import {
  completeConnect,
  CONNECT_STATE_COOKIE,
  CONNECT_VERIFIER_COOKIE,
  CONNECT_CLIENT_COOKIE,
} from "@/lib/paybox-connect"
import { saveConnectedOauth } from "@/lib/paybox"

/** NextResponse.redirect needs ABSOLUTE urls; build from the request origin. */
function back(request: Request, paybox: string, reason?: string): NextResponse {
  const origin = new URL(request.url).origin
  const q = reason
    ? `?paybox=${paybox}&reason=${encodeURIComponent(reason.slice(0, 180))}`
    : `?paybox=${paybox}`
  return NextResponse.redirect(`${origin}/treasury${q}`)
}

/**
 * Finish the Connect Paybox flow: validate state, exchange the authorization
 * code for tokens, persist them in the connection store, and land the user
 * back on Treasury connected.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return back(request, "error", error)
  }

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONNECT_STATE_COOKIE}=`))
    ?.slice(CONNECT_STATE_COOKIE.length + 1)
  const verifier = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONNECT_VERIFIER_COOKIE}=`))
    ?.slice(CONNECT_VERIFIER_COOKIE.length + 1)
  const clientId = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONNECT_CLIENT_COOKIE}=`))
    ?.slice(CONNECT_CLIENT_COOKIE.length + 1)

  if (!code || !state || !cookieState || state !== cookieState) {
    return back(request, "error", "connect session expired — try again")
  }
  if (!verifier || !clientId) {
    return back(request, "error", "missing connect cookies — try again")
  }

  try {
    const oauth = await completeConnect(url.origin, code, verifier, clientId)
    await saveConnectedOauth(oauth)
    const res = back(request, "connected")
    // Clear the flow cookies.
    for (const name of [CONNECT_STATE_COOKIE, CONNECT_VERIFIER_COOKIE, CONNECT_CLIENT_COOKIE]) {
      res.cookies.set(name, "", { httpOnly: true, maxAge: 0, path: "/" })
    }
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : "token exchange failed"
    return back(request, "error", message)
  }
}
